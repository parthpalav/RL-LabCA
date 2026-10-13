import { EPISODE_LENGTH, REWARD } from './config'
import { nextDifficulty } from './actionMask'
import type { Action, Difficulty, GameState, Strain, WrongStreak } from './types'

export type RewardParts = {
  answerReward: number
  strainPenalty: number
  repeatedFailurePenalty: number
  switchPenalty: number
  total: number
}

export type Transition = {
  difficulty: Difficulty
  correct: boolean
  next: GameState
  reward: RewardParts
  terminated: boolean
}

export function applyTransition(state: GameState, action: Action, correct: boolean): Transition {
  if (state.answeredCount >= EPISODE_LENGTH) {
    throw new Error('episode already terminated')
  }
  const difficulty = nextDifficulty(state.previousDifficulty, action)
  const strainNext = (
    correct ? Math.max(0, state.strain - 1) : Math.min(3, state.strain + 1)
  ) as Strain
  const wrongStreakNext = (
    correct ? 0 : Math.min(3, state.wrongStreak + 1)
  ) as WrongStreak
  const answeredCountNext = state.answeredCount + 1
  const answerReward = correct ? 1 + REWARD.challengeStep * (difficulty - 1) : REWARD.wrongReward
  const strainPenalty = REWARD.strainWeight * strainNext
  const repeatedFailurePenalty =
    !correct && wrongStreakNext >= REWARD.repeatedFailureStreak ? REWARD.repeatedFailurePenalty : 0
  const switchPenalty = difficulty === state.previousDifficulty ? 0 : REWARD.switchPenalty
  const total = answerReward - strainPenalty - repeatedFailurePenalty - switchPenalty
  return {
    difficulty,
    correct,
    next: {
      ability: state.ability,
      previousDifficulty: difficulty,
      strain: strainNext,
      wrongStreak: wrongStreakNext,
      answeredCount: answeredCountNext,
    },
    reward: { answerReward, strainPenalty, repeatedFailurePenalty, switchPenalty, total },
    terminated: answeredCountNext === EPISODE_LENGTH,
  }
}
