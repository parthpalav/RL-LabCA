import {
  actFrozen,
  applyTransition,
  initialState,
  mulberry32,
  nextDifficulty,
  parseModel,
} from '../core/index'
import type { Difficulty, GameState, TabularPolicy } from '../core/index'
import type { PlayRuntime } from './types'

export type PlayAvailability =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; detail: string }
  | { status: 'ready'; runtime: PlayRuntime }

export function runtimeFromPolicy(policy: TabularPolicy): PlayRuntime {
  return {
    initialState,
    chooseDifficulty(state, policySeed) {
      const decision = actFrozen(policy, state, mulberry32(policySeed))
      return nextDifficulty(state.previousDifficulty, decision.action)
    },
    observeAnswer(state, difficulty, correct) {
      return applyTransition(state, actionFor(state, difficulty), correct).next
    },
  }
}

export async function loadPlayRuntime(
  signal: AbortSignal,
): Promise<PlayAvailability> {
  try {
    const response = await fetch(
      `${import.meta.env?.BASE_URL ?? '/'}models/q-learning-default.json`,
      { signal, cache: 'no-cache' },
    )
    if (response.status === 404) return missingModel()
    if (!response.ok)
      throw new Error(`Model request failed (${response.status}).`)
    // Vite returns its HTML entry for missing public assets.
    const body = await response.text()
    if (body.trimStart().startsWith('<')) return missingModel()
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return {
        status: 'unavailable',
        title: 'The saved model could not be read',
        detail:
          'The model file is not valid JSON. Play will wait for a valid saved model. You can still try the six starting questions.',
      }
    }
    try {
      const { artifact, policy } = parseModel(parsed)
      if (artifact.algorithm !== 'q-learning' || artifact.smoke) {
        return {
          status: 'unavailable',
          title: 'The saved model is not the play controller',
          detail:
            'Live play uses the full Q-learning table. This file is a different or unfinished run.',
        }
      }
      return { status: 'ready', runtime: runtimeFromPolicy(policy) }
    } catch {
      return {
        status: 'unavailable',
        title: 'The saved model does not match this game',
        detail:
          'The file is JSON, but it is not a Q-table this version can play. You can still try the six starting questions.',
      }
    }
  } catch (error) {
    if (signal.aborted) throw error
    return {
      status: 'unavailable',
      title: 'The saved model could not be loaded',
      detail:
        'Check your connection and try again. The six starting questions work without the model.',
    }
  }
}

function actionFor(state: GameState, difficulty: Difficulty) {
  const delta = difficulty - state.previousDifficulty
  if (delta === -1) return 0 as const
  if (delta === 0) return 1 as const
  if (delta === 1) return 2 as const
  throw new Error(
    `difficulty ${state.previousDifficulty} to ${difficulty} is not one legal step`,
  )
}

function missingModel(): PlayAvailability {
  return {
    status: 'unavailable',
    title: 'The adventure is waiting for its saved model',
    detail:
      'The trained Q-learning model has not been included yet. Try the six starting questions now; the 20-stop adventure will open when the saved model and controller are ready.',
  }
}
