import { N_STATES } from './config'
import type { Ability, Difficulty, GameState, Strain, WrongStreak } from './types'

export function encodeState(state: GameState): number {
  return (
    state.ability +
    (state.previousDifficulty - 1) * 4 +
    state.strain * 20 +
    state.wrongStreak * 80 +
    state.answeredCount * 320
  )
}

export function decodeState(id: number): GameState {
  if (!Number.isInteger(id) || id < 0 || id >= N_STATES) {
    throw new Error(`state id out of range: ${id}`)
  }
  const answeredCount = Math.floor(id / 320)
  let rest = id % 320
  const wrongStreak = Math.floor(rest / 80) as WrongStreak
  rest %= 80
  const strain = Math.floor(rest / 20) as Strain
  rest %= 20
  const difficultyIndex = Math.floor(rest / 4)
  const ability = (rest % 4) as Ability
  return {
    ability,
    previousDifficulty: (difficultyIndex + 1) as Difficulty,
    strain,
    wrongStreak,
    answeredCount,
  }
}

export function initialState(ability: Ability): GameState {
  return {
    ability,
    previousDifficulty: 2,
    strain: 0,
    wrongStreak: 0,
    answeredCount: 0,
  }
}
