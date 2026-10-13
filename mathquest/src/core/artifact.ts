import {
  ACTION_MASK_VERSION,
  GENERATOR_VERSION,
  N_ACTIONS,
  N_STATES,
  REWARD_VERSION,
  SCHEMA_VERSION,
  SIMULATOR_VERSION,
  STATE_SCHEMA,
  TRAIN,
} from './config'
import { createPolicy, type TabularPolicy } from './policy'
import type { Algorithm } from './train'

export type ModelArtifact = {
  schemaVersion: number
  algorithm: Algorithm
  seed: number
  stateSchema: string
  actionMaskVersion: number
  rewardVersion: string
  simulatorVersion: string
  generatorVersion: string
  episodes: number
  smoke: boolean
  timestamp: string
  hyperparameters: {
    alpha: number
    gamma: number
    epsilonInitial: number
    epsilonFinal: number
    epsilonDecayFraction: number
  }
  qValues: number[]
  visitCounts: number[]
}

export function serializeModel(
  policy: TabularPolicy,
  details: {
    algorithm: Algorithm
    seed: number
    episodes: number
    alpha: number
    gamma: number
    timestamp: string
  },
): ModelArtifact {
  return {
    schemaVersion: SCHEMA_VERSION,
    algorithm: details.algorithm,
    seed: details.seed,
    stateSchema: STATE_SCHEMA,
    actionMaskVersion: ACTION_MASK_VERSION,
    rewardVersion: REWARD_VERSION,
    simulatorVersion: SIMULATOR_VERSION,
    generatorVersion: GENERATOR_VERSION,
    episodes: details.episodes,
    smoke: details.episodes !== TRAIN.episodes,
    timestamp: details.timestamp,
    hyperparameters: {
      alpha: details.alpha,
      gamma: details.gamma,
      epsilonInitial: TRAIN.epsilonInitial,
      epsilonFinal: TRAIN.epsilonFinal,
      epsilonDecayFraction: TRAIN.epsilonDecayFraction,
    },
    qValues: Array.from(policy.q),
    visitCounts: Array.from(policy.visits),
  }
}

export function parseModel(input: unknown): { artifact: ModelArtifact; policy: TabularPolicy } {
  if (!input || typeof input !== 'object') throw new Error('model is not an object')
  const artifact = input as ModelArtifact
  if (artifact.schemaVersion !== SCHEMA_VERSION) throw new Error('schema version mismatch')
  if (artifact.stateSchema !== STATE_SCHEMA) throw new Error('state schema mismatch')
  if (artifact.actionMaskVersion !== ACTION_MASK_VERSION) throw new Error('action mask mismatch')
  if (artifact.rewardVersion !== REWARD_VERSION) throw new Error('reward version mismatch')
  if (artifact.simulatorVersion !== SIMULATOR_VERSION) throw new Error('simulator version mismatch')
  if (!Array.isArray(artifact.qValues) || artifact.qValues.length !== N_STATES * N_ACTIONS) {
    throw new Error('q table length mismatch')
  }
  if (!Array.isArray(artifact.visitCounts) || artifact.visitCounts.length !== N_STATES * N_ACTIONS) {
    throw new Error('visit count length mismatch')
  }
  if (artifact.qValues.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error('q table contains a non-finite value')
  }
  const policy = createPolicy()
  policy.q.set(artifact.qValues)
  policy.visits.set(artifact.visitCounts)
  return { artifact, policy }
}
