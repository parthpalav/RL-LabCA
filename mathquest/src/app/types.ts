import type {
  Ability,
  AbilityBelief,
  Difficulty,
  GameState,
  Question,
  QuestionOption,
  TabularPolicy,
} from '../core/index'

export const WORLDS = [
  {
    id: 'garden',
    name: 'Moon Garden',
    detail: 'A quiet trail among lunar blooms.',
    symbol: '☾',
  },
  {
    id: 'canyon',
    name: 'Comet Canyon',
    detail: 'Follow a comet through the canyons.',
    symbol: '◇',
  },
  {
    id: 'library',
    name: 'Orbital Library',
    detail: 'Find your path among the stars.',
    symbol: '⊕',
  },
] as const
export type WorldId = (typeof WORLDS)[number]['id']
export type Settings = {
  nickname: string
  world: WorldId
  reducedMotion: boolean
  remember: boolean
}
export type AnswerRecord = {
  question: Question
  optionId: QuestionOption['id']
  correct: boolean
  responseMs: number
}
export type AnswerFeedback = {
  correct: boolean
  selectedId: QuestionOption['id']
  correctId: QuestionOption['id']
  steps: string[]
}
export type VisibleQuestion = Pick<
  Question,
  'id' | 'level' | 'topic' | 'promptParts' | 'options'
>
export type SessionSummary = {
  date: string
  ability: Ability
  world: WorldId
  correct: number
  points: number
  levels: Difficulty[]
  longestWrongStreak: number
  finalAbility?: Ability
}

// UI port only. Lane A owns artifact validation, seeded greedy selection,
// coverage fallback and observed-answer transitions. Bind to core/index when
// that public API exists; never substitute UI rules for the RL controller.
// The belief re-estimates the ability slot of the state after each answer.
export type LiveState = { state: GameState; belief: AbilityBelief }
export type ModelInfo = { algorithm: string; seed: number; timestamp: string }
export type PlayRuntime = {
  policy: TabularPolicy
  model: ModelInfo
  initialState: (ability: Ability) => LiveState
  chooseDifficulty: (live: LiveState, policySeed: number) => Difficulty
  observeAnswer: (
    live: LiveState,
    difficulty: Difficulty,
    correct: boolean,
  ) => LiveState
}
