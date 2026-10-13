import { priorBelief, updateBelief, withAbility, type AbilityBelief } from './abilityTracker'
import { nextDifficulty, validActions } from './actionMask'
import { EPISODE_LENGTH } from './config'
import { actFrozen, qValue, type TabularPolicy } from './policy'
import { mixSeed, mulberry32 } from './rng'
import { initialState } from './stateCodec'
import { applyTransition, type RewardParts } from './transitions'
import type { Ability, Action, Difficulty, GameState } from './types'

// Tie-break stream used by live play for question i: mixSeed(roundSeed, POLICY_STREAM + i).
export const POLICY_STREAM = 20160

export type ReplayStep = {
  index: number
  state: GameState
  belief: AbilityBelief
  qValues: { action: Action; value: number }[]
  action: Action
  fallback: boolean
  difficulty: Difficulty
  correct: boolean
  reward: RewardParts
  next: GameState
  beliefAfter: AbilityBelief
}

export type ReplayOptions = {
  // false replays with the calibration ability held fixed, as in training.
  track?: boolean
}

// Re-runs the saved controller over a sequence of answers. With the round's
// seed and the answers the player gave, it reproduces the levels they saw;
// with some answers flipped it shows the path the controller would have taken.
export function replayRound(
  policy: TabularPolicy,
  startAbility: Ability,
  answers: readonly boolean[],
  seed: number,
  options: ReplayOptions = {},
): ReplayStep[] {
  const track = options.track ?? true
  const steps: ReplayStep[] = []
  let state = initialState(startAbility)
  let belief = priorBelief(startAbility)
  const count = Math.min(answers.length, EPISODE_LENGTH)
  for (let index = 0; index < count; index += 1) {
    const decision = actFrozen(policy, state, mulberry32(mixSeed(seed, POLICY_STREAM + index)))
    const difficulty = nextDifficulty(state.previousDifficulty, decision.action)
    const correct = answers[index]
    const transition = applyTransition(state, decision.action, correct)
    const beliefAfter = track ? updateBelief(belief, difficulty, state.strain, correct) : belief
    steps.push({
      index,
      state,
      belief,
      qValues: validActions(state.previousDifficulty).map((action) => ({
        action,
        value: qValue(policy, state, action),
      })),
      action: decision.action,
      fallback: decision.fallback,
      difficulty,
      correct,
      reward: transition.reward,
      next: track ? withAbility(transition.next, beliefAfter) : transition.next,
      beliefAfter,
    })
    state = steps[index].next
    belief = beliefAfter
  }
  return steps
}
