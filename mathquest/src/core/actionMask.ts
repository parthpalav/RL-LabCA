import type { Action, Difficulty } from './types'

export function validActions(difficulty: Difficulty): Action[] {
  const actions: Action[] = []
  if (difficulty > 1) actions.push(0)
  actions.push(1)
  if (difficulty < 5) actions.push(2)
  return actions
}

export function isValidAction(difficulty: Difficulty, action: Action): boolean {
  return validActions(difficulty).includes(action)
}

export function nextDifficulty(difficulty: Difficulty, action: Action): Difficulty {
  if (!isValidAction(difficulty, action)) {
    throw new Error(`action ${action} is invalid at difficulty ${difficulty}`)
  }
  if (action === 0) return (difficulty - 1) as Difficulty
  if (action === 2) return (difficulty + 1) as Difficulty
  return difficulty
}
