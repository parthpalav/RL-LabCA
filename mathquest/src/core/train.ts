import { EPISODE_LENGTH, RESPONSE, TRAIN } from './config'
import { correctFromUniform, successProbability, type ResponseModel } from './simulator'
import { applyTransition } from './transitions'
import { initialState } from './stateCodec'
import { nextDifficulty } from './actionMask'
import {
  createPolicy,
  epsilonFor,
  epsilonGreedy,
  greedyAction,
  maxValidQ,
  qUpdate,
  qIndex,
  qValue,
  tdTarget,
  type TabularPolicy,
} from './policy'
import { mixSeed, mulberry32, type Rng } from './rng'
import type { Ability, Action, GameState } from './types'

export type Algorithm = 'q-learning' | 'sarsa'

export type TrainStreams = {
  explore: Rng
  profile: Rng
  response: Rng
  ties: Rng
}

export type TrainOptions = {
  algorithm: Algorithm
  seed: number
  episodes: number
  alpha?: number
  // Visit-count step size exponent; null keeps alpha constant.
  alphaDecay?: number | null
  gamma?: number
  abilityFixed?: Ability
  response?: ResponseModel
  streams?: TrainStreams
  checkpointInterval?: number
  onEpisode?: (episode: number) => void
  onCheckpoint?: (episode: number, policy: TabularPolicy) => void
}

export type TrainResult = {
  policy: TabularPolicy
  returns: number[]
  algorithm: Algorithm
  seed: number
  episodes: number
  alpha: number
  gamma: number
}

export function streamsFor(seed: number): TrainStreams {
  return {
    explore: mulberry32(mixSeed(seed, 1)),
    profile: mulberry32(mixSeed(seed, 2)),
    response: mulberry32(mixSeed(seed, 3)),
    ties: mulberry32(mixSeed(seed, 4)),
  }
}

export function trainAgent(options: TrainOptions): TrainResult {
  const alpha = options.alpha ?? TRAIN.alpha
  const gamma = options.gamma ?? TRAIN.gamma
  const alphaDecay = options.alphaDecay === undefined ? TRAIN.alphaDecay : options.alphaDecay
  const response = options.response ?? RESPONSE
  const streams = options.streams ?? streamsFor(options.seed)
  const policy = createPolicy()
  const returns: number[] = []
  for (let episode = 0; episode < options.episodes; episode += 1) {
    returns.push(
      runTrainingEpisode(policy, options.algorithm, streams, {
        epsilon: epsilonFor(episode, options.episodes),
        alpha,
        alphaDecay,
        gamma,
        abilityFixed: options.abilityFixed,
        response,
      }),
    )
    const completed = episode + 1
    options.onEpisode?.(completed)
    if (options.checkpointInterval && completed % options.checkpointInterval === 0) {
      options.onCheckpoint?.(completed, policy)
    }
  }
  return {
    policy,
    returns,
    algorithm: options.algorithm,
    seed: options.seed,
    episodes: options.episodes,
    alpha,
    gamma,
  }
}

type EpisodeOptions = {
  epsilon: number
  alpha: number
  alphaDecay?: number | null
  gamma: number
  abilityFixed?: Ability
  response: ResponseModel
}

export function runTrainingEpisode(
  policy: TabularPolicy,
  algorithm: Algorithm,
  streams: TrainStreams,
  options: EpisodeOptions,
): number {
  const ability = options.abilityFixed ?? (Math.floor(streams.profile() * 4) as Ability)
  let state = initialState(ability)
  let action = epsilonGreedy(policy, state, options.epsilon, streams.explore, streams.ties)
  let total = 0
  for (let step = 0; step < EPISODE_LENGTH; step += 1) {
    const difficulty = nextDifficulty(state.previousDifficulty, action)
    const correct = correctFromUniform(
      state.ability,
      difficulty,
      state.strain,
      streams.response(),
      options.response,
    )
    const transition = applyTransition(state, action, correct)
    const nextAction = transition.terminated
      ? null
      : epsilonGreedy(policy, transition.next, options.epsilon, streams.explore, streams.ties)
    const nextValue =
      algorithm === 'sarsa'
        ? nextAction === null
          ? 0
          : qValue(policy, transition.next, nextAction)
        : transition.terminated
          ? 0
          : maxValidQ(policy, transition.next)
    qUpdate(
      policy,
      state,
      action,
      tdTarget(transition.reward.total, options.gamma, nextValue, transition.terminated),
      stepSize(policy, state, action, options.alpha, options.alphaDecay),
    )
    total += transition.reward.total
    state = transition.next
    if (nextAction !== null) action = nextAction
  }
  return total
}

// Robbins-Monro step size: alpha_n = min(alpha, 1 / (1 + n)^omega) for the
// n-th visit to (s, a). With a constant alpha the Q-values keep tracking
// reward noise and near-tied actions flip; a decaying step lets them settle.
export function stepSize(
  policy: TabularPolicy,
  state: GameState,
  action: Action,
  alpha: number,
  decay: number | null | undefined,
): number {
  if (decay === null || decay === undefined) return alpha
  const visits = policy.visits[qIndex(state, action)]
  return Math.min(alpha, 1 / Math.pow(1 + visits, decay))
}

export function runFrozenEpisode(
  policy: TabularPolicy,
  seed: number,
  ability: Ability,
  response: ResponseModel = RESPONSE,
): number {
  const responseRng = mulberry32(mixSeed(seed, 3))
  const tieRng = mulberry32(mixSeed(seed, 4))
  let state = initialState(ability)
  let total = 0
  for (let step = 0; step < EPISODE_LENGTH; step += 1) {
    const action: Action = greedyAction(policy, state, tieRng)
    const difficulty = nextDifficulty(state.previousDifficulty, action)
    const correct = responseRng() < successProbability(state.ability, difficulty, state.strain, response)
    const transition = applyTransition(state, action, correct)
    total += transition.reward.total
    state = transition.next
  }
  return total
}
