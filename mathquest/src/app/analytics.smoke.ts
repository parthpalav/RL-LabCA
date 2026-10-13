import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  actFrozen,
  applyTransition,
  createPolicy,
  encodeState,
  generateQuestion,
  gradeQuestion,
  mixSeed,
  mulberry32,
  nextDifficulty,
  parseModel,
  POLICY_STREAM,
  PROFILES,
  qValue,
  replayRound,
  validActions,
} from '../core/index'
import { modelInfo, runtimeFromPolicy, loadPlayRuntime } from './playRuntime'
import {
  auditCsv,
  decisionReason,
  sameModel,
  sessionMetrics,
  simulatorDiagnostic,
} from './analytics'
import { storedAnswer, exportJourneys, newJourney } from './history'
import { DecisionDetails } from '../components/DecisionDetails'
import { QuestionScreen } from '../screens/QuestionScreen'
import type { AnswerAudit } from './types'

const text = readFileSync(
  new URL('../../public/models/q-learning-default.json', import.meta.url),
  'utf8',
)
const { artifact, policy } = parseModel(JSON.parse(text))
const info = modelInfo(artifact)
assert.equal(info.trainingUpdates, artifact.episodes * 20)
assert.equal(info.episodes, 100000)
const runtime = runtimeFromPolicy(policy, info)
const qBefore = policy.q.slice()
const visitsBefore = policy.visits.slice()
let demonstrated: ReturnType<typeof storedAnswer>[] = []

for (const profile of PROFILES) {
  for (const outcomes of [
    Array(20).fill(true),
    Array(20).fill(false),
    Array.from({ length: 20 }, (_, i) => i !== 5 && i !== 6),
  ] as boolean[][]) {
    const seed = 20261013
    const replay = replayRound(policy, profile.id, outcomes, seed)
    let live = runtime.initialState(profile.id)
    const answers: ReturnType<typeof storedAnswer>[] = []
    for (let i = 0; i < 20; i++) {
      const policySeed = mixSeed(seed, POLICY_STREAM + i)
      const decision = runtime.decide(live, policySeed)
      const core = actFrozen(policy, live.state, mulberry32(policySeed))
      assert.equal(decision.action, core.action)
      assert.equal(decision.fallback, core.fallback)
      assert.equal(
        decision.difficulty,
        nextDifficulty(live.state.previousDifficulty, core.action),
      )
      assert.equal(decision.stateId, encodeState(live.state))
      assert.notEqual(decision.state, live.state)
      assert.notEqual(decision.belief.posterior, live.belief.posterior)
      for (const value of decision.values) {
        assert.equal(
          value.valid,
          validActions(live.state.previousDifficulty).includes(value.action),
        )
        assert.equal(
          value.value,
          value.valid ? qValue(policy, live.state, value.action) : null,
        )
        assert.equal(
          value.visits,
          policy.visits[decision.stateId * 3 + value.action],
        )
      }
      const question = generateQuestion(decision.difficulty, mixSeed(seed, i))
      const selected = outcomes[i]
        ? question.correctOptionId
        : question.options.find(
            (option) => option.id !== question.correctOptionId,
          )!.id
      const correct = gradeQuestion(question, selected)
      const observed = runtime.observe(live, decision, correct)
      assert.deepEqual(
        observed.reward,
        applyTransition(live.state, decision.action, correct).reward,
      )
      assert.deepEqual(observed.live.state, replay[i].next)
      assert.deepEqual(observed.live.belief, replay[i].beliefAfter)
      const audit: AnswerAudit = {
        decision,
        reward: observed.reward,
        next: observed.live,
        terminated: observed.terminated,
      }
      answers.push(
        storedAnswer(
          question,
          selected,
          correct,
          1500,
          observed.live.state.ability,
          audit,
        ),
      )
      if (i === 0)
        assert.throws(
          () => runtime.observe(observed.live, decision, correct),
          /does not match/,
        )
      live = observed.live
      assert.equal(audit.terminated, i === 19)
    }
    assert.throws(() => runtime.decide(live, seed), /termination/)
    const metrics = sessionMetrics(answers)
    assert.equal(metrics.audited, 20)
    assert.equal(metrics.raises + metrics.holds + metrics.eases, 20)
    assert.ok(
      Math.abs(
        metrics.totals.total -
          replay.reduce((sum, s) => sum + s.reward.total, 0),
      ) < 1e-9,
    )
    assert.equal(auditCsv(answers).split('\n').length, 21)
    demonstrated = answers
  }
}
assert.deepEqual(policy.q, qBefore)
assert.deepEqual(policy.visits, visitsBefore)

const comfortable = replayRound(policy, 2, Array(20).fill(true), 20261013)
assert.equal(comfortable[4].difficulty, 5)
assert.ok(comfortable.slice(4).every((step) => step.difficulty === 5))
const ready = replayRound(policy, 3, Array(20).fill(true), 20261013)
assert.equal(ready[2].difficulty, 5)
assert.equal(ready.filter((step) => step.fallback).length, 0)
const diagnostic = simulatorDiagnostic(3, 0)
assert.ok(diagnostic[4].expected > diagnostic[2].expected)

const empty = runtimeFromPolicy(createPolicy(), info)
const fallback = empty.decide(empty.initialState(2), 3)
assert.equal(fallback.fallback, true)
assert.match(decisionReason(fallback), /not a learned decision/)
const audit = demonstrated[0].audit!
const detail = renderToStaticMarkup(
  createElement(DecisionDetails, {
    decision: audit.decision,
    audit,
    model: info,
    runtime,
  }),
)
assert.ok(detail.includes('Training visits'))
assert.ok(detail.includes('Play does not apply this update'))
const q = generateQuestion(audit.decision.difficulty, 100)
const ungraded = renderToStaticMarkup(
  createElement(QuestionScreen, {
    question: {
      id: q.id,
      level: q.level,
      topic: q.topic,
      promptParts: q.promptParts,
      options: q.options,
    },
    feedback: null,
    index: 0,
    total: 20,
    mode: 'play',
    world: 'Moon Garden',
    points: 0,
    paused: false,
    audit,
    nextDecision: audit.decision,
    model: info,
    onAnswer() {},
    onNext() {},
    onPause() {},
  }),
)
assert.ok(!ungraded.includes('correct answer'))
assert.ok(!ungraded.includes(q.explanationSteps[0]))
assert.ok(!ungraded.includes('Why this level?'))
assert.equal(
  sameModel({ ...info, fingerprint: 'a' }, { ...info, fingerprint: 'b' }),
  false,
)
const journey = newJourney('Audit check', 'garden')
journey.answers = demonstrated
journey.model = info
assert.equal(
  JSON.parse(exportJourneys([journey])).journeys[0].answers[0].audit.decision
    .stateId,
  audit.decision.stateId,
)

const originalFetch = globalThis.fetch
globalThis.fetch = async () => new Response(text, { status: 200 })
const loaded = await loadPlayRuntime(new AbortController().signal)
assert.equal(loaded.status, 'ready')
if (loaded.status === 'ready')
  assert.equal(loaded.runtime.model.fingerprint?.length, 64)
const corrupt = JSON.parse(text)
corrupt.visitCounts[0] = -1
globalThis.fetch = async () =>
  new Response(JSON.stringify(corrupt), { status: 200 })
assert.equal(
  (await loadPlayRuntime(new AbortController().signal)).status,
  'unavailable',
)
globalThis.fetch = originalFetch
console.log(
  'Analytics checks passed: 240 real-model decisions, core/replay parity, immutable Q-values/visits, exact rewards, terminal guard, snapshots/exports, fallback, identity and answer-disclosure checks.',
)
