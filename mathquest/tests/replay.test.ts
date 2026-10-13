import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseModel } from '../src/core/artifact'
import { priorBelief, updateBelief, withAbility } from '../src/core/abilityTracker'
import { nextDifficulty } from '../src/core/actionMask'
import { actFrozen } from '../src/core/policy'
import { POLICY_STREAM, replayRound } from '../src/core/replay'
import { mixSeed, mulberry32 } from '../src/core/rng'
import { initialState } from '../src/core/stateCodec'
import { applyTransition } from '../src/core/transitions'
import type { Difficulty } from '../src/core/types'

const { policy } = parseModel(JSON.parse(readFileSync('public/models/q-learning-default.json', 'utf8')))

function livePath(seed: number, answers: boolean[]): Difficulty[] {
  let state = initialState(1)
  let belief = priorBelief(1)
  const levels: Difficulty[] = []
  answers.forEach((correct, index) => {
    const { action } = actFrozen(policy, state, mulberry32(mixSeed(seed, POLICY_STREAM + index)))
    const level = nextDifficulty(state.previousDifficulty, action)
    levels.push(level)
    belief = updateBelief(belief, level, state.strain, correct)
    state = withAbility(applyTransition(state, action, correct).next, belief)
  })
  return levels
}

describe('round replay', () => {
  const answers = Array.from({ length: 20 }, (_, i) => i % 3 !== 1)

  it('reproduces the levels the live controller served', () => {
    for (const seed of [1, 99, 123456]) {
      expect(replayRound(policy, 1, answers, seed).map((step) => step.difficulty)).toEqual(livePath(seed, answers))
    }
  })

  it('changes the path from a flipped answer onward and never before it', () => {
    const actual = replayRound(policy, 1, answers, 7)
    const flipped = [...answers]
    flipped[5] = !flipped[5]
    const whatIf = replayRound(policy, 1, flipped, 7)
    expect(whatIf.slice(0, 6).map((s) => s.difficulty)).toEqual(actual.slice(0, 6).map((s) => s.difficulty))
    expect(whatIf[5].beliefAfter.posterior).not.toEqual(actual[5].beliefAfter.posterior)
  })

  it('holds ability fixed when tracking is off', () => {
    const steps = replayRound(policy, 2, Array(20).fill(false), 3, { track: false })
    expect(steps.every((step) => step.state.ability === 2)).toBe(true)
    expect(steps).toHaveLength(20)
  })
})
