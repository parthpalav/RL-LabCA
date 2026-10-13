import type { Ability } from '../core/index'
import type { AnswerRecord, SessionSummary, WorldId } from './types'

export function summarize(
  records: AnswerRecord[],
  ability: Ability,
  world: WorldId,
  finalAbility: Ability = ability,
): SessionSummary {
  let streak = 0
  let longestWrongStreak = 0
  for (const record of records) {
    streak = record.correct ? 0 : streak + 1
    longestWrongStreak = Math.max(longestWrongStreak, streak)
  }
  return {
    date: new Date().toISOString(),
    ability,
    world,
    correct: records.filter((record) => record.correct).length,
    points: records.reduce(
      (sum, record) => sum + (record.correct ? 10 * record.question.level : 0),
      0,
    ),
    levels: records.map((record) => record.question.level),
    longestWrongStreak,
    finalAbility,
  }
}
