export type Ability = 0 | 1 | 2 | 3
export type Difficulty = 1 | 2 | 3 | 4 | 5
export type Strain = 0 | 1 | 2 | 3
export type WrongStreak = 0 | 1 | 2 | 3
export type Action = 0 | 1 | 2

export type GameState = {
  ability: Ability
  previousDifficulty: Difficulty
  strain: Strain
  wrongStreak: WrongStreak
  answeredCount: number
}

export type Rational = {
  numerator: number
  denominator: number
}

export type PromptPart =
  | { kind: 'text'; text: string }
  | { kind: 'frac'; numerator: number; denominator: number; spoken: string }

export type QuestionSpec =
  | { kind: 'add'; a: number; b: number }
  | { kind: 'sub'; a: number; b: number }
  | { kind: 'mul'; a: number; b: number }
  | { kind: 'div'; dividend: number; divisor: number }
  | { kind: 'paren-mul'; a: number; b: number; c: number }
  | { kind: 'paren-sub-mul'; a: number; b: number; c: number }
  | { kind: 'add-mul'; a: number; b: number; c: number }
  | { kind: 'mul-add'; a: number; b: number; c: number }
  | { kind: 'frac-add'; a: number; b: number; c: number; d: number }
  | { kind: 'percent'; percent: number; whole: number }
  | { kind: 'one-step'; a: number; product: number }
  | { kind: 'two-step'; a: number; b: number; c: number }
  | { kind: 'mixed'; a: number; b: number; c: number; d: number }

export type QuestionOption = {
  id: '1' | '2' | '3' | '4'
  value: Rational
  label: string
  spoken: string
}

export type Question = {
  id: string
  generatorVersion: string
  level: Difficulty
  topic: string
  promptParts: PromptPart[]
  options: QuestionOption[]
  correctOptionId: QuestionOption['id']
  explanationSteps: string[]
  spec: QuestionSpec
}

export type ProfileId = Ability

export type Profile = {
  id: ProfileId
  label: string
  blurb: string
}
