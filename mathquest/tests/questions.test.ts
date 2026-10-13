import { describe, expect, it } from 'vitest'
import { generateQuestion, gradeQuestion, solveSpec } from '../src/core/questions'
import { ratEq, ratKey } from '../src/core/rational'
import type { Difficulty } from '../src/core/types'

const levels: Difficulty[] = [1, 2, 3, 4, 5]

describe('question engine', () => {
  it.each(levels)('generates 1000 valid level %s questions', (level) => {
    const positions = [0, 0, 0, 0]
    for (let seed = 0; seed < 1000; seed += 1) {
      const question = generateQuestion(level, seed)
      const again = generateQuestion(level, seed)
      expect(JSON.stringify(question)).toBe(JSON.stringify(again))
      expect(question.options).toHaveLength(4)
      const keys = new Set(question.options.map((option) => ratKey(option.value)))
      expect(keys.size).toBe(4)
      const correct = question.options.filter((option) => option.id === question.correctOptionId)
      expect(correct).toHaveLength(1)
      expect(ratEq(correct[0].value, solveSpec(question.spec))).toBe(true)
      expect(question.explanationSteps.length).toBeGreaterThan(0)
      expect(question.promptParts.length).toBeGreaterThan(0)
      positions[Number(question.correctOptionId) - 1] += 1
      expect(gradeQuestion(question, question.correctOptionId)).toBe(true)
      expect(gradeQuestion(question, question.correctOptionId === '1' ? '2' : '1')).toBe(false)
      if (question.spec.kind === 'sub') expect(question.spec.a).toBeGreaterThanOrEqual(question.spec.b)
      if (question.spec.kind === 'div') expect(question.spec.dividend % question.spec.divisor).toBe(0)
    }
    for (const count of positions) {
      expect(count).toBeGreaterThan(150)
      expect(count).toBeLessThan(350)
    }
  })
})

describe('hard levels', () => {
  it.each([4, 5] as Difficulty[])('level %s mixes at least five harder topics', (level) => {
    const topics = new Set<string>()
    for (let seed = 0; seed < 500; seed += 1) topics.add(generateQuestion(level, seed).topic)
    expect(topics.size).toBeGreaterThanOrEqual(5)
  })

  it('level 5 equations are satisfied by their answer', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const { spec } = generateQuestion(5, seed)
      const x = solveSpec(spec)
      if (spec.kind === 'both-sides') {
        expect(x.denominator).toBe(1)
        expect(spec.a * x.numerator + spec.b).toBe(spec.c * x.numerator + spec.d)
      }
      if (spec.kind === 'bracket-eq') expect(spec.a * (x.numerator + spec.b)).toBe(spec.c)
      if (spec.kind === 'frac-eq') expect(x.numerator / spec.a + spec.b).toBe(spec.c)
    }
  })
})
