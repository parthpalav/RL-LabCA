import { N_ACTIONS, N_STATES, TRAIN } from './config'
import { isValidAction, validActions } from './actionMask'
import { encodeState } from './stateCodec'
import type { Action, GameState } from './types'
import type { Rng } from './rng'

export type TabularPolicy = {
  q: Float32Array
  visits: Uint32Array
}

export function createPolicy(): TabularPolicy {
  return {
    q: new Float32Array(N_STATES * N_ACTIONS),
    visits: new Uint32Array(N_STATES * N_ACTIONS),
  }
}

export function qIndex(state: GameState, action: Action): number {
  return encodeState(state) * N_ACTIONS + action
}

export function qValue(policy: TabularPolicy, state: GameState, action: Action): number {
  return policy.q[qIndex(state, action)]
}

export function tdTarget(reward: number, gamma: number, nextValue: number, terminated: boolean): number {
  return terminated ? reward : reward + gamma * nextValue
}

export function tdUpdate(oldQ: number, alpha: number, target: number): number {
  return oldQ + alpha * (target - oldQ)
}

export function qUpdate(
  policy: TabularPolicy,
  state: GameState,
  action: Action,
  target: number,
  alpha: number,
): void {
  if (!isValidAction(state.previousDifficulty, action)) {
    throw new Error(`refusing invalid action ${action}`)
  }
  const index = qIndex(state, action)
  policy.q[index] = tdUpdate(policy.q[index], alpha, target)
  policy.visits[index] += 1
}

export function maxValidQ(policy: TabularPolicy, state: GameState): number {
  let best = Number.NEGATIVE_INFINITY
  for (const action of validActions(state.previousDifficulty)) {
    best = Math.max(best, qValue(policy, state, action))
  }
  return best
}

export function greedyAction(policy: TabularPolicy, state: GameState, tieRng: Rng): Action {
  const actions = validActions(state.previousDifficulty)
  let best = Number.NEGATIVE_INFINITY
  const tied: Action[] = []
  for (const action of actions) {
    const value = qValue(policy, state, action)
    if (value > best + 1e-6) {
      best = value
      tied.length = 0
      tied.push(action)
    } else if (Math.abs(value - best) <= 1e-6) {
      tied.push(action)
    }
  }
  if (tied.length === 1) return tied[0]
  return tied[Math.floor(tieRng() * tied.length)]
}

export function epsilonGreedy(
  policy: TabularPolicy,
  state: GameState,
  epsilon: number,
  exploreRng: Rng,
  tieRng: Rng,
): Action {
  const actions = validActions(state.previousDifficulty)
  if (exploreRng() < epsilon) {
    return actions[Math.floor(exploreRng() * actions.length)]
  }
  return greedyAction(policy, state, tieRng)
}

export function epsilonFor(
  episodeIndex: number,
  episodes: number,
  initial = TRAIN.epsilonInitial,
  final = TRAIN.epsilonFinal,
  decayFraction = TRAIN.epsilonDecayFraction,
): number {
  const decayEpisodes = Math.floor(episodes * decayFraction)
  if (decayEpisodes <= 0 || episodeIndex >= decayEpisodes) return final
  const progress = episodeIndex / decayEpisodes
  return initial + progress * (final - initial)
}

export function conservativeFallback(state: GameState): Action {
  if (state.wrongStreak >= 1 && state.previousDifficulty > 1) return 0
  return 1
}

export function stateVisits(policy: TabularPolicy, state: GameState): number {
  const base = encodeState(state) * N_ACTIONS
  let total = 0
  for (let action = 0; action < N_ACTIONS; action += 1) total += policy.visits[base + action]
  return total
}

export function actFrozen(
  policy: TabularPolicy,
  state: GameState,
  tieRng: Rng,
): { action: Action; fallback: boolean } {
  const base = encodeState(state) * N_ACTIONS
  let seen = 0
  for (let action = 0; action < N_ACTIONS; action += 1) seen += policy.visits[base + action]
  if (seen === 0) return { action: conservativeFallback(state), fallback: true }
  return { action: greedyAction(policy, state, tieRng), fallback: false }
}
