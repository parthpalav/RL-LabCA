import {
  applyTransition,
  encodeState,
  initialState,
  mixSeed,
  POLICY_STREAM,
  successProbability,
  type Ability,
  type ReplayStep,
  type TabularPolicy,
} from '../core/index'
import type { AnswerAudit, ModelInfo, PolicyDecision } from './types'

export const ACTION_LABEL = ['Ease', 'Hold', 'Raise'] as const
export type AuditedAnswer = {
  level: number
  correct: boolean
  audit?: AnswerAudit
}

export function decisionReason(decision: PolicyDecision): string {
  if (decision.fallback)
    return 'This state has no training visits. The core used its conservative fallback; this is not a learned decision.'
  const selected = decision.values.find(
    (value) => value.action === decision.action,
  )!
  const candidates = decision.values.filter(
    (value) => value.valid && value.value !== null,
  )
  const best = Math.max(...candidates.map((value) => value.value!))
  const tied = candidates.filter(
    (value) => Math.abs(value.value! - best) <= 1e-6,
  )
  return `${ACTION_LABEL[decision.action]} ${tied.length > 1 ? 'was selected by the seeded tie-break among equal best Q-values' : 'has the highest valid Q-value'}. ${selected.visits === 0 ? 'The selected action has zero visits; its value is still initialized, not learned.' : 'Q estimates discounted future reward, not just whether the last answer was correct.'}`
}

export function auditFromReplay(
  step: ReplayStep,
  policy: TabularPolicy,
  seed: number,
): AnswerAudit {
  const stateId = encodeState(step.state)
  return {
    decision: {
      state: { ...step.state },
      stateId,
      belief: step.belief,
      policySeed: mixSeed(seed, POLICY_STREAM + step.index),
      action: step.action,
      difficulty: step.difficulty,
      fallback: step.fallback,
      values: ([0, 1, 2] as const).map((action) => {
        const q = step.qValues.find((value) => value.action === action)
        return {
          action,
          valid: Boolean(q),
          value: q?.value ?? null,
          visits: policy.visits[stateId * 3 + action],
        }
      }),
    },
    reward: step.reward,
    next: { state: step.next, belief: step.beliefAfter },
    terminated: step.next.answeredCount === 20,
  }
}

export function sessionMetrics(answers: readonly AuditedAnswer[]) {
  const audits = answers.flatMap((answer) =>
    answer.audit ? [answer.audit] : [],
  )
  const n = answers.length
  const correct = answers.filter((answer) => answer.correct)
  const totals = audits.reduce(
    (sum, audit) => ({
      answerReward: sum.answerReward + audit.reward.answerReward,
      strainPenalty: sum.strainPenalty + audit.reward.strainPenalty,
      repeatedFailurePenalty:
        sum.repeatedFailurePenalty + audit.reward.repeatedFailurePenalty,
      switchPenalty: sum.switchPenalty + audit.reward.switchPenalty,
      total: sum.total + audit.reward.total,
    }),
    {
      answerReward: 0,
      strainPenalty: 0,
      repeatedFailurePenalty: 0,
      switchPenalty: 0,
      total: 0,
    },
  )
  return {
    answered: n,
    audited: audits.length,
    points: correct.reduce((sum, answer) => sum + answer.level * 10, 0),
    correctRate: n ? correct.length / n : null,
    attemptedMean: n
      ? answers.reduce((sum, answer) => sum + answer.level, 0) / n
      : null,
    solvedMean: correct.length
      ? correct.reduce((sum, answer) => sum + answer.level, 0) / correct.length
      : null,
    raises: audits.filter((audit) => audit.decision.action === 2).length,
    holds: audits.filter((audit) => audit.decision.action === 1).length,
    eases: audits.filter((audit) => audit.decision.action === 0).length,
    fallbacks: audits.filter((audit) => audit.decision.fallback).length,
    unvisitedSelections: audits.filter(
      (audit) =>
        !audit.decision.fallback &&
        audit.decision.values.find(
          (value) => value.action === audit.decision.action,
        )?.visits === 0,
    ).length,
    totals,
  }
}

export function simulatorDiagnostic(ability: Ability, strain: 0 | 1 | 2 | 3) {
  return ([1, 2, 3, 4, 5] as const).map((difficulty) => {
    const state = {
      ...initialState(ability),
      previousDifficulty: difficulty,
      strain,
    }
    const probability = successProbability(ability, difficulty, strain)
    const correct = applyTransition(state, 1, true).reward.total
    const wrong = applyTransition(state, 1, false).reward.total
    return {
      difficulty,
      probability,
      correct,
      wrong,
      expected: probability * correct + (1 - probability) * wrong,
    }
  })
}

export function sameModel(
  a: ModelInfo | null | undefined,
  b: ModelInfo | null | undefined,
): boolean {
  if (!a || !b) return false
  if (a.fingerprint && b.fingerprint) return a.fingerprint === b.fingerprint
  return (
    a.algorithm === b.algorithm &&
    a.seed === b.seed &&
    a.timestamp === b.timestamp
  )
}

export function auditCsv(answers: readonly AuditedAnswer[]) {
  const headers = [
    'question',
    'correct',
    'level',
    'game_points',
    'source',
    'state_id',
    'ability',
    'previous_level',
    'strain',
    'wrong_streak',
    'answered_count',
    'action',
    'q_ease',
    'q_hold',
    'q_raise',
    'visits_ease',
    'visits_hold',
    'visits_raise',
    'answer_reward',
    'strain_penalty',
    'repeat_penalty',
    'switch_penalty',
    'reward',
    'next_ability',
    'next_strain',
    'next_wrong_streak',
    'terminated',
  ]
  return [
    headers,
    ...answers.map((answer, index) => {
      const a = answer.audit
      const d = a?.decision
      return [
        index + 1,
        answer.correct,
        answer.level,
        answer.correct ? answer.level * 10 : 0,
        d ? (d.fallback ? 'fallback' : 'q-table') : 'not-recorded',
        d?.stateId,
        d?.state.ability,
        d?.state.previousDifficulty,
        d?.state.strain,
        d?.state.wrongStreak,
        d?.state.answeredCount,
        d ? ACTION_LABEL[d.action] : null,
        ...([0, 1, 2] as const).map(
          (action) => d?.values.find((value) => value.action === action)?.value,
        ),
        ...([0, 1, 2] as const).map(
          (action) =>
            d?.values.find((value) => value.action === action)?.visits,
        ),
        a?.reward.answerReward,
        a?.reward.strainPenalty,
        a?.reward.repeatedFailurePenalty,
        a?.reward.switchPenalty,
        a?.reward.total,
        a?.next.state.ability,
        a?.next.state.strain,
        a?.next.state.wrongStreak,
        a?.terminated,
      ]
    }),
  ]
    .map((row) =>
      row
        .map((value) =>
          value === null || value === undefined ? '' : JSON.stringify(value),
        )
        .join(','),
    )
    .join('\n')
}
