import {
  actFrozen,
  applyTransition,
  encodeState,
  initialState,
  mulberry32,
  nextDifficulty,
  parseModel,
  priorBelief,
  qValue,
  updateBelief,
  validActions,
  withAbility,
  N_ACTIONS,
  type Action,
  type ModelArtifact,
  type TabularPolicy,
} from '../core/index'
import type { Difficulty, GameState } from '../core/index'
import type { LiveState, ModelInfo, PlayRuntime } from './types'

export type PlayAvailability =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; detail: string }
  | { status: 'ready'; runtime: PlayRuntime }

export function runtimeFromPolicy(
  policy: TabularPolicy,
  model: ModelInfo,
): PlayRuntime {
  function observeCorrectness(
    live: LiveState,
    action: Action,
    correct: boolean,
  ) {
    const transition = applyTransition(live.state, action, correct)
    const updated = updateBelief(
      live.belief,
      transition.difficulty,
      live.state.strain,
      correct,
    )
    return {
      live: { state: withAbility(transition.next, updated), belief: updated },
      reward: transition.reward,
      terminated: transition.terminated,
    }
  }
  const runtime: PlayRuntime = {
    policy,
    model,
    initialState(ability) {
      return { state: initialState(ability), belief: priorBelief(ability) }
    },
    decide({ state, belief }, policySeed) {
      const decision = actFrozen(policy, state, mulberry32(policySeed))
      const stateId = encodeState(state)
      const valid = validActions(state.previousDifficulty)
      return {
        state: { ...state },
        stateId,
        belief: { ...belief, posterior: [...belief.posterior] },
        policySeed,
        action: decision.action,
        fallback: decision.fallback,
        difficulty: nextDifficulty(state.previousDifficulty, decision.action),
        values: ([0, 1, 2] as const).map((action) => ({
          action,
          valid: valid.includes(action),
          value: valid.includes(action) ? qValue(policy, state, action) : null,
          visits: policy.visits[stateId * N_ACTIONS + action],
        })),
      }
    },
    observe(live, decision, correct) {
      if (
        encodeState(live.state) !== decision.stateId ||
        nextDifficulty(live.state.previousDifficulty, decision.action) !==
          decision.difficulty
      ) {
        throw new Error('Decision does not match the live state')
      }
      return observeCorrectness(live, decision.action, correct)
    },
    chooseDifficulty(live, policySeed) {
      return runtime.decide(live, policySeed).difficulty
    },
    observeAnswer(live, difficulty, correct) {
      return observeCorrectness(
        live,
        actionFor(live.state, difficulty),
        correct,
      ).live
    },
  }
  return runtime
}

export function modelInfo(
  artifact: ModelArtifact,
  fingerprint?: string,
): ModelInfo {
  // Core parses the table. These checks protect UI provenance and typed visit
  // conversion; none change policy selection, reward, or transition rules.
  if (
    !Number.isInteger(artifact.episodes) ||
    artifact.episodes < 1 ||
    !Number.isInteger(artifact.seed) ||
    !Number.isFinite(Date.parse(artifact.timestamp)) ||
    artifact.visitCounts.some(
      (v) => !Number.isInteger(v) || v < 0 || v > 0xffffffff,
    ) ||
    !artifact.hyperparameters ||
    !Number.isFinite(artifact.hyperparameters.alpha) ||
    !Number.isFinite(artifact.hyperparameters.gamma)
  )
    throw new Error('Invalid model metadata or visits')
  let visitedStates = 0
  for (let base = 0; base < artifact.visitCounts.length; base += N_ACTIONS) {
    if (artifact.visitCounts.slice(base, base + N_ACTIONS).some((v) => v > 0))
      visitedStates += 1
  }
  return {
    algorithm: artifact.algorithm,
    seed: artifact.seed,
    timestamp: artifact.timestamp,
    episodes: artifact.episodes,
    fingerprint,
    stateSchema: artifact.stateSchema,
    rewardVersion: artifact.rewardVersion,
    simulatorVersion: artifact.simulatorVersion,
    generatorVersion: artifact.generatorVersion,
    hyperparameters: { ...artifact.hyperparameters },
    trainingUpdates: artifact.visitCounts.reduce(
      (sum, visits) => sum + visits,
      0,
    ),
    visitedStates,
    visitedActions: artifact.visitCounts.filter((v) => v > 0).length,
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
      if (policy.q.some((value) => !Number.isFinite(value)))
        throw new Error('Q-values overflow Float32 storage')
      if (artifact.algorithm !== 'q-learning' || artifact.smoke) {
        return {
          status: 'unavailable',
          title: 'The saved model is not the play controller',
          detail:
            'Live play uses the full Q-learning table. This file is a different or unfinished run.',
        }
      }
      let fingerprint: string | undefined
      if (globalThis.crypto?.subtle) {
        const digest = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(body),
        )
        fingerprint = Array.from(new Uint8Array(digest), (b) =>
          b.toString(16).padStart(2, '0'),
        ).join('')
      }
      return {
        status: 'ready',
        runtime: runtimeFromPolicy(policy, modelInfo(artifact, fingerprint)),
      }
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

function actionFor(state: GameState, difficulty: Difficulty): Action {
  const delta = difficulty - state.previousDifficulty
  if (delta === -1) return 0
  if (delta === 0) return 1
  if (delta === 1) return 2
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
