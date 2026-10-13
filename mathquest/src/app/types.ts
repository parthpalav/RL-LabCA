import type {
  Ability,
  Difficulty,
  GameState,
  Question,
  QuestionOption,
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
}

// UI port only. Lane A owns artifact validation, seeded greedy selection,
// coverage fallback and observed-answer transitions. Bind to core/index when
// that public API exists; never substitute UI rules for the RL controller.
export type PlayRuntime = {
  initialState: (ability: Ability) => GameState
  chooseDifficulty: (state: GameState, policySeed: number) => Difficulty
  observeAnswer: (
    state: GameState,
    difficulty: Difficulty,
    correct: boolean,
  ) => GameState
}
