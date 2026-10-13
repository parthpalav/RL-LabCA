import { RESPONSE } from './config'
import type { Ability, Difficulty, Strain } from './types'

export type ResponseModel = {
  slope: number
  abilityOffset: number
  strainCoefficient: number
  minProbability: number
  maxProbability: number
}

export function successProbability(
  ability: Ability,
  difficulty: Difficulty,
  strain: Strain,
  model: ResponseModel = RESPONSE,
): number {
  const z = model.slope * (ability + model.abilityOffset - difficulty) - model.strainCoefficient * strain
  const raw = 1 / (1 + Math.exp(-z))
  return Math.min(model.maxProbability, Math.max(model.minProbability, raw))
}

export function correctFromUniform(
  ability: Ability,
  difficulty: Difficulty,
  strain: Strain,
  uniform: number,
  model: ResponseModel = RESPONSE,
): boolean {
  return uniform < successProbability(ability, difficulty, strain, model)
}
