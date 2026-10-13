import { validActions } from './actionMask'
import type { Ability, Action, Difficulty, GameState } from './types'
import type { Rng } from './rng'

export type RuleConfig = {
  preferred: readonly [Difficulty, Difficulty, Difficulty, Difficulty]
  up: readonly [number, number, number, number]
  down: readonly [number, number, number, number]
}

export type RuleMemory = {
  decidedOnce: boolean
  correctStreak: number
  wrongStreak: number
}

export const DEFAULT_RULE: RuleConfig = {
  preferred: [2, 3, 3, 4],
  up: [3, 3, 3, 3],
  down: [2, 2, 2, 2],
}

export function emptyRuleMemory(): RuleMemory {
  return { decidedOnce: false, correctStreak: 0, wrongStreak: 0 }
}

export function stepToward(current: Difficulty, target: Difficulty): Action {
  if (current < target && current < 5) return 2
  if (current > target && current > 1) return 0
  return 1
}

export function fixedAct(state: GameState, target: Difficulty): Action {
  return stepToward(state.previousDifficulty, target)
}

export function randomAct(state: GameState, rng: Rng): Action {
  const actions = validActions(state.previousDifficulty)
  return actions[Math.floor(rng() * actions.length)]
}

export function ruleAct(
  state: GameState,
  memory: RuleMemory,
  config: RuleConfig = DEFAULT_RULE,
): { action: Action; memory: RuleMemory } {
  const ability = state.ability as Ability
  let action: Action
  if (!memory.decidedOnce) {
    action = stepToward(state.previousDifficulty, config.preferred[ability])
  } else if (memory.correctStreak >= config.up[ability] && state.previousDifficulty < 5) {
    action = 2
  } else if (memory.wrongStreak >= config.down[ability] && state.previousDifficulty > 1) {
    action = 0
  } else {
    action = 1
  }
  const changed = action !== 1
  return {
    action,
    memory: {
      decidedOnce: true,
      correctStreak: changed ? 0 : memory.correctStreak,
      wrongStreak: changed ? 0 : memory.wrongStreak,
    },
  }
}

export function ruleObserve(memory: RuleMemory, correct: boolean): RuleMemory {
  if (correct) return { ...memory, correctStreak: memory.correctStreak + 1, wrongStreak: 0 }
  return { ...memory, correctStreak: 0, wrongStreak: memory.wrongStreak + 1 }
}
