import { N_ABILITIES, RESPONSE, TRACKER } from './config'
import { successProbability, type ResponseModel } from './simulator'
import type { Ability, Difficulty, GameState, Strain } from './types'

// Live play only. Training keeps ability fixed per episode; in play the
// ability slot of the state is re-estimated after every answer so the frozen
// Q-table is queried with the player's current level, not the calibration
// guess. Likelihoods come from the same response model the agent trained on.
export type AbilityBelief = {
  posterior: number[]
  ability: Ability
}

export function priorBelief(start: Ability): AbilityBelief {
  const weights = Array.from({ length: N_ABILITIES }, (_, a) =>
    Math.pow(TRACKER.priorSpread, Math.abs(a - start)),
  )
  return { posterior: normalize(weights), ability: start }
}

export function updateBelief(
  belief: AbilityBelief,
  difficulty: Difficulty,
  strain: Strain,
  correct: boolean,
  model: ResponseModel = RESPONSE,
): AbilityBelief {
  // Tempering the old posterior lets recent answers outweigh early ones, so
  // the estimate can follow a player who warms up or tires mid-round.
  const posterior = normalize(
    belief.posterior.map((p, a) => {
      const success = successProbability(a as Ability, difficulty, strain, model)
      const likelihood = correct ? success : 1 - success
      return Math.pow(p, TRACKER.memory) * likelihood
    }),
  )
  return { posterior, ability: chooseAbility(belief.ability, posterior) }
}

export function expectedAbility(belief: AbilityBelief): number {
  return belief.posterior.reduce((sum, p, a) => sum + p * a, 0)
}

export function withAbility(state: GameState, belief: AbilityBelief): GameState {
  return { ...state, ability: belief.ability }
}

// Hysteresis: move only when another level is clearly more likely, and by at
// most one level per answer, so a single lucky or careless answer cannot
// swing the path.
function chooseAbility(current: Ability, posterior: number[]): Ability {
  let best = current
  for (let a = 0; a < posterior.length; a += 1) {
    if (posterior[a] > posterior[best]) best = a as Ability
  }
  if (best === current || posterior[best] - posterior[current] < TRACKER.switchMargin) {
    return current
  }
  return (current + Math.sign(best - current)) as Ability
}

function normalize(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0)
  if (!(total > 0)) return values.map(() => 1 / values.length)
  return values.map((value) => value / total)
}
