export const SCHEMA_VERSION = 1
export const STATE_SCHEMA = 'ability4-diff5-strain4-streak4-count21'
export const ACTION_MASK_VERSION = 1
export const SIMULATOR_VERSION = 'response-v1'
export const REWARD_VERSION = 'reward-v1'
export const GENERATOR_VERSION = 'questions-v1'

export const N_ABILITIES = 4
export const N_DIFFICULTIES = 5
export const N_STRAINS = 4
export const N_STREAKS = 4
export const N_COUNTS = 21
export const N_STATES = N_ABILITIES * N_DIFFICULTIES * N_STRAINS * N_STREAKS * N_COUNTS
export const N_ACTIONS = 3
export const EPISODE_LENGTH = 20

export const REWARD = {
  challengeStep: 0.5,
  wrongReward: -1,
  strainWeight: 0.15,
  repeatedFailurePenalty: 0.4,
  repeatedFailureStreak: 2,
  switchPenalty: 0.05,
} as const

export const RESPONSE = {
  slope: 1.4,
  abilityOffset: 1.5,
  strainCoefficient: 0.35,
  minProbability: 0.25,
  maxProbability: 0.98,
} as const

export const STRESS_RESPONSE = {
  slope: 1.1,
  abilityOffset: 1.5,
  strainCoefficient: 0.5,
  minProbability: 0.25,
  maxProbability: 0.98,
} as const

export const TRAIN = {
  alpha: 0.1,
  gamma: 0.95,
  episodes: 100000,
  epsilonInitial: 1,
  epsilonFinal: 0.05,
  epsilonDecayFraction: 0.8,
  seeds: [11, 29, 47] as const,
  pilotSeed: 7,
  pilotEpisodes: 2000,
  pilotAlphas: [0.05, 0.1, 0.2] as const,
  checkpointInterval: 250,
  checkpointEpisodesPerProfile: 25,
  testEpisodesPerProfile: 100,
} as const

export const CALIBRATION_LEVELS = [1, 2, 2, 3, 3, 4] as const
