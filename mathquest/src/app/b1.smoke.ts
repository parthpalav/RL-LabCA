import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CALIBRATION_LEVELS, generateQuestion } from '../core/index'
import { QuestionScreen } from '../screens/QuestionScreen'
import { Results } from '../screens/Results'
import { summarize } from './summary'
import { loadPlayRuntime } from './playRuntime'
import {
  readSettings,
  resetLocalData,
  saveSettings,
  saveSummary,
} from './storage'

// Kept in Lane B's app directory so no Lane A test/config files change.
// These assertions require only the already-installed browser/TypeScript stack.
const assert = {
  ok(value: unknown) {
    if (!value) throw new Error('Expected a truthy value')
  },
  equal(actual: unknown, expected: unknown) {
    if (!Object.is(actual, expected)) {
      throw new Error(`Expected ${String(expected)}, received ${String(actual)}`)
    }
  },
}

const question = generateQuestion(CALIBRATION_LEVELS[0], 4100)
const visible = {
  id: question.id,
  topic: question.topic,
  level: question.level,
  promptParts: question.promptParts,
  options: question.options,
}
const props = {
  question: visible,
  feedback: null,
  index: 0,
  total: 6,
  mode: 'calibration' as const,
  world: 'Moon Garden',
  points: 0,
  paused: false,
  onAnswer() {},
  onNext() {},
  onPause() {},
}
const html = renderToStaticMarkup(createElement(QuestionScreen, props))
assert.ok(!html.includes('correct answer'))
assert.ok(!html.includes(question.explanationSteps[0]))
assert.ok(!html.includes('correctOptionId'))
assert.ok(!html.includes('question.spec'))
const locked = renderToStaticMarkup(
  createElement(QuestionScreen, {
    ...props,
    feedback: {
      correct: true,
      selectedId: question.correctOptionId,
      correctId: question.correctOptionId,
      steps: question.explanationSteps,
    },
  }),
)
assert.ok(locked.includes('correct answer'))
assert.ok(locked.includes(question.explanationSteps[0]))
assert.equal((locked.match(/disabled=""/g) ?? []).length, 4)

const outcomes = [
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  true,
  true,
  true,
  true,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
]
const records = outcomes.map((correct, index) => {
  const q = generateQuestion(5, 6000 + index)
  const optionId = correct
    ? q.correctOptionId
    : q.options.find((option) => option.id !== q.correctOptionId)!.id
  return { question: q, optionId, correct, responseMs: 500 }
})
const summary = summarize(records, 3, 'garden')
assert.equal(summary.correct, 4)
assert.equal(summary.points, 200)
assert.equal(summary.longestWrongStreak, 8)
assert.equal(summary.levels.length, 20)
const results = renderToStaticMarkup(
  createElement(Results, {
    records,
    summary,
    ability: 3,
    nickname: 'Explorer',
    onAgain() {},
    onLab() {},
    notice: '',
  }),
)
assert.ok(results.includes('Review 16 questions'))
assert.equal((results.match(/class="timeline-bar/g) ?? []).length, 20)

const storage = new Map<string, string>([['unrelated.app', 'keep']])
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
    removeItem(key: string) {
      storage.delete(key)
    },
  },
})
assert.equal(readSettings().remember, false)
assert.ok(
  saveSettings({
    nickname: 'Explorer',
    world: 'library',
    reducedMotion: true,
    remember: true,
  }),
)
assert.equal(readSettings().world, 'library')
assert.ok(saveSummary(summary))
assert.ok(resetLocalData())
assert.equal(storage.size, 1)
assert.equal(storage.get('unrelated.app'), 'keep')
storage.set('mathquest.settings.v1', '{corrupt')
assert.equal(readSettings().remember, false)
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  get() {
    throw new Error('Storage blocked')
  },
})
assert.equal(readSettings().remember, false)
assert.equal(saveSummary(summary), false)

const originalFetch = globalThis.fetch
for (const [body, status, expected] of [
  ['', 404, 'The adventure is waiting for its saved model'],
  [
    '<!doctype html><html></html>',
    200,
    'The adventure is waiting for its saved model',
  ],
  ['{corrupt', 200, 'The saved model could not be read'],
  ['{}', 200, 'The game controller is not connected yet'],
] as const) {
  globalThis.fetch = async () => new Response(body, { status })
  const availability = await loadPlayRuntime(new AbortController().signal)
  assert.equal(availability.status, 'unavailable')
  if (availability.status === 'unavailable')
    assert.equal(availability.title, expected)
}
globalThis.fetch = originalFetch
console.log(
  'B1 checks passed: answer disclosure, locked feedback, results metrics, storage scope/failure, and policy empty states.',
)
