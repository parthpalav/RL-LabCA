import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { expectedAbility, priorBelief, updateBelief, withAbility } from '../src/core/abilityTracker'
import { parseModel } from '../src/core/artifact'
import { nextDifficulty } from '../src/core/actionMask'
import { actFrozen } from '../src/core/policy'
import { mulberry32 } from '../src/core/rng'
import { successProbability } from '../src/core/simulator'
import { initialState } from '../src/core/stateCodec'
import { applyTransition } from '../src/core/transitions'
import type { Ability } from '../src/core/types'

describe('live ability tracker', () => {
  it('starts on the calibration level with a normalized prior', () => {
    const belief = priorBelief(2)
    expect(belief.ability).toBe(2)
    expect(belief.posterior.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(Math.max(...belief.posterior)).toBe(belief.posterior[2])
  })

  it('does not move on a single surprising answer and moves one level at a time', () => {
    const once = updateBelief(priorBelief(0), 3, 0, true)
    expect(once.ability).toBe(0)
    let belief = priorBelief(0)
    for (let i = 0; i < 8; i += 1) {
      const next = updateBelief(belief, 4, 0, true)
      expect(Math.abs(next.ability - belief.ability)).toBeLessThanOrEqual(1)
      belief = next
    }
    expect(belief.ability).toBeGreaterThanOrEqual(2)
    expect(expectedAbility(belief)).toBeGreaterThan(1.5)
  })

  it('lowers the estimate after repeated mistakes', () => {
    let belief = priorBelief(3)
    for (let i = 0; i < 6; i += 1) belief = updateBelief(belief, 2, 0, false)
    expect(belief.ability).toBeLessThanOrEqual(1)
  })

  it('writes the estimate into the RL state', () => {
    const belief = { posterior: [0, 0, 1, 0], ability: 2 as Ability }
    expect(withAbility(initialState(0), belief).ability).toBe(2)
  })

  it('recovers a mislabeled weak player with the saved Q-table', () => {
    const { policy } = parseModel(JSON.parse(readFileSync('public/models/q-learning-default.json', 'utf8')))
    let frozen = 0
    let tracked = 0
    for (let seed = 1; seed <= 300; seed += 1) {
      for (const track of [false, true]) {
        const rng = mulberry32(seed)
        const tie = mulberry32(seed ^ 99)
        let state = initialState(3)
        let belief = priorBelief(3)
        let total = 0
        for (let i = 0; i < 20; i += 1) {
          const action = actFrozen(policy, state, tie).action
          const difficulty = nextDifficulty(state.previousDifficulty, action)
          const correct = rng() < successProbability(0, difficulty, state.strain)
          const strain = state.strain
          const step = applyTransition(state, action, correct)
          total += step.reward.total
          state = step.next
          if (track) {
            belief = updateBelief(belief, difficulty, strain, correct)
            state = withAbility(state, belief)
          }
        }
        if (track) tracked += total
        else frozen += total
      }
    }
    expect(tracked).toBeGreaterThan(frozen)
  })
})
