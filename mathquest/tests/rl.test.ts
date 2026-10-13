import { describe, expect, it } from 'vitest'
import { RESPONSE, TRAIN } from '../src/core/config'
import { parseModel, serializeModel } from '../src/core/artifact'
import { fixedAct, randomAct, ruleAct, ruleObserve, emptyRuleMemory } from '../src/core/baselines'
import {
  createPolicy,
  epsilonFor,
  epsilonGreedy,
  greedyAction,
  qIndex,
  qUpdate,
  qValue,
  tdTarget,
  tdUpdate,
} from '../src/core/policy'
import { mulberry32 } from '../src/core/rng'
import { initialState } from '../src/core/stateCodec'
import { runFrozenEpisode, runTrainingEpisode, trainAgent } from '../src/core/train'
import type { GameState } from '../src/core/types'

describe('tabular updates', () => {
  it('matches the hand-calculated Q-learning and SARSA targets', () => {
    expect(tdUpdate(0.5, 0.1, tdTarget(1, 0.95, 2, false))).toBeCloseTo(0.74, 6)
    expect(tdUpdate(0.5, 0.1, tdTarget(1, 0.95, 0.8, false))).toBeCloseTo(0.626, 6)
    expect(tdTarget(1, 0.95, 100, true)).toBe(1)
  })

  it('stores the Q-learning update and a visit', () => {
    const policy = createPolicy()
    const state = initialState(0)
    policy.q[qIndex(state, 1)] = 0.5
    qUpdate(policy, state, 1, tdTarget(1, 0.95, 2, false), 0.1)
    expect(qValue(policy, state, 1)).toBeCloseTo(0.74, 5)
    expect(visitTotal(policy)).toBe(1)
  })

  it('rejects an action the mask forbids', () => {
    const state: GameState = { ...initialState(0), previousDifficulty: 1 }
    expect(() => qUpdate(createPolicy(), state, 0, 1, 0.1)).toThrow(/invalid/)
  })

  it('does not always break an all-zero tie toward the first action', () => {
    const state: GameState = { ...initialState(1), previousDifficulty: 3 }
    const chosen = new Set<number>()
    for (let seed = 1; seed <= 40; seed += 1) {
      chosen.add(greedyAction(createPolicy(), state, mulberry32(seed)))
    }
    expect(chosen.size).toBeGreaterThan(1)
    const again = greedyAction(createPolicy(), state, mulberry32(5))
    expect(greedyAction(createPolicy(), state, mulberry32(5))).toBe(again)
  })

  it('samples exploration only from valid actions', () => {
    const low: GameState = { ...initialState(0), previousDifficulty: 1 }
    const high: GameState = { ...initialState(0), previousDifficulty: 5 }
    for (let index = 0; index < 40; index += 1) {
      const rng = mulberry32(index + 3)
      expect(epsilonGreedy(createPolicy(), low, 1, rng, rng)).not.toBe(0)
      expect(epsilonGreedy(createPolicy(), high, 1, mulberry32(index + 9), mulberry32(1))).not.toBe(2)
    }
  })
})

describe('training loop', () => {
  it('samples the SARSA next action once', () => {
    let exploreCalls = 0
    const streams = {
      explore: () => {
        exploreCalls += 1
        return 0
      },
      profile: () => 0,
      response: () => 0,
      ties: () => 0,
    }
    runTrainingEpisode(createPolicy(), 'sarsa', streams, {
      epsilon: 1,
      alpha: 0.1,
      gamma: 0.95,
      abilityFixed: 1,
      response: RESPONSE,
    })
    expect(exploreCalls).toBe(40)
  })

  it('repeats a Q-table from the same seed and leaves it unchanged during frozen play', () => {
    const first = trainAgent({ algorithm: 'q-learning', seed: 11, episodes: 20 })
    const second = trainAgent({ algorithm: 'q-learning', seed: 11, episodes: 20 })
    expect(Array.from(first.policy.q)).toEqual(Array.from(second.policy.q))
    const visitsBefore = visitTotal(first.policy)
    runFrozenEpisode(first.policy, 4, 2)
    expect(visitTotal(first.policy)).toBe(visitsBefore)
  })

  it('decays epsilon linearly and then holds', () => {
    expect(epsilonFor(0, 10)).toBe(1)
    expect(epsilonFor(8, 10)).toBe(TRAIN.epsilonFinal)
    expect(epsilonFor(9, 10)).toBe(TRAIN.epsilonFinal)
  })
})

describe('baselines and model files', () => {
  it('moves the fixed and rule controllers one level at a time', () => {
    expect(fixedAct(initialState(0), 5)).toBe(2)
    expect(fixedAct({ ...initialState(0), previousDifficulty: 5 }, 5)).toBe(1)
    const first = ruleAct(initialState(0), emptyRuleMemory(), {
      preferred: [1, 2, 3, 4],
      up: [2, 2, 2, 2],
      down: [1, 1, 1, 1],
    })
    expect(first.action).toBe(0)
    let memory = ruleObserve(first.memory, true)
    memory = ruleObserve(memory, true)
    const later = ruleAct({ ...initialState(0), previousDifficulty: 1 }, memory, {
      preferred: [1, 2, 3, 4],
      up: [2, 2, 2, 2],
      down: [1, 1, 1, 1],
    })
    expect(later.action).toBe(2)
    expect(later.memory.correctStreak).toBe(0)
  })

  it('keeps random actions inside the mask', () => {
    const state: GameState = { ...initialState(3), previousDifficulty: 5 }
    for (let seed = 0; seed < 30; seed += 1) {
      expect(randomAct(state, mulberry32(seed))).not.toBe(2)
    }
  })

  it('rejects a model whose table length does not match the schema', () => {
    const trained = trainAgent({ algorithm: 'sarsa', seed: 3, episodes: 2 })
    const artifact = serializeModel(trained.policy, {
      algorithm: 'sarsa',
      seed: 3,
      episodes: 2,
      alpha: 0.1,
      gamma: 0.95,
      timestamp: '2026-10-13T00:00:00.000Z',
    })
    expect(artifact.smoke).toBe(true)
    expect(parseModel(artifact).policy.q.length).toBe(trained.policy.q.length)
    expect(() => parseModel({ ...artifact, qValues: [1, 2, 3] })).toThrow(/length/)
    expect(() => parseModel({ ...artifact, schemaVersion: 99 })).toThrow(/schema/)
  })
})

function visitTotal(policy: { visits: Uint32Array }): number {
  let total = 0
  for (const count of policy.visits) total += count
  return total
}
