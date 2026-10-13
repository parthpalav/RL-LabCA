import { describe, expect, it } from 'vitest'
import { applyTransition } from '../src/core/transitions'
import { successProbability } from '../src/core/simulator'
import { initialState } from '../src/core/stateCodec'
import type { GameState } from '../src/core/types'

describe('transitions', () => {
  it('pays challenge only for a correct harder question and subtracts a switch', () => {
    const step = applyTransition(initialState(1), 2, true)
    expect(step.difficulty).toBe(3)
    expect(step.reward.answerReward).toBeCloseTo(3)
    expect(step.reward.switchPenalty).toBeCloseTo(0.05)
    expect(step.reward.strainPenalty).toBe(0)
    expect(step.reward.total).toBeCloseTo(2.95)
    expect(rewardSums(step.reward)).toBe(true)
  })

  it('penalises repeated failure from the updated streak and strain', () => {
    const state: GameState = { ...initialState(0), strain: 1, wrongStreak: 1 }
    const step = applyTransition(state, 2, false)
    expect(step.next.strain).toBe(2)
    expect(step.next.wrongStreak).toBe(2)
    expect(step.reward.answerReward).toBe(-1)
    expect(step.reward.strainPenalty).toBeCloseTo(0.3)
    expect(step.reward.repeatedFailurePenalty).toBeCloseTo(0.4)
    expect(step.reward.total).toBeCloseTo(-1.75)
  })

  it('caps strain and the wrong streak, and clears both after a correct answer', () => {
    let state = initialState(2)
    for (let count = 0; count < 4; count += 1) state = applyTransition(state, 1, false).next
    expect(state.strain).toBe(3)
    expect(state.wrongStreak).toBe(3)
    state = applyTransition(state, 1, true).next
    expect(state.strain).toBe(2)
    expect(state.wrongStreak).toBe(0)
  })

  it('terminates on question 20 and refuses another step', () => {
    let state = initialState(0)
    let steps = 0
    let lastTerminated = false
    while (state.answeredCount < 20) {
      const step = applyTransition(state, 1, true)
      state = step.next
      lastTerminated = step.terminated
      steps += 1
    }
    expect(steps).toBe(20)
    expect(lastTerminated).toBe(true)
    expect(() => applyTransition(state, 1, true)).toThrow(/terminated/)
  })
})

describe('response model', () => {
  it('stays inside the guessing floor and the ceiling', () => {
    expect(successProbability(0, 5, 3)).toBe(0.25)
    expect(successProbability(3, 1, 0)).toBe(0.98)
  })

  it('rises with ability and falls with difficulty and strain', () => {
    const byAbility = [0, 1, 2, 3].map((ability) => successProbability(ability as 0 | 1 | 2 | 3, 3, 0))
    const byDifficulty = [1, 2, 3, 4, 5].map((difficulty) => successProbability(1, difficulty as 1 | 2 | 3 | 4 | 5, 0))
    const byStrain = [0, 1, 2, 3].map((strain) => successProbability(2, 3, strain as 0 | 1 | 2 | 3))
    expect(nonDecreasing(byAbility)).toBe(true)
    expect(nonIncreasing(byDifficulty)).toBe(true)
    expect(nonIncreasing(byStrain)).toBe(true)
  })
})

function rewardSums(reward: { answerReward: number; strainPenalty: number; repeatedFailurePenalty: number; switchPenalty: number; total: number }): boolean {
  const rebuilt = reward.answerReward - reward.strainPenalty - reward.repeatedFailurePenalty - reward.switchPenalty
  return Math.abs(rebuilt - reward.total) < 1e-12
}

function nonDecreasing(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value >= values[index - 1] - 1e-12)
}

function nonIncreasing(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value <= values[index - 1] + 1e-12)
}
