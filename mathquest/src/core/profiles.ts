import { CALIBRATION_LEVELS } from './config'
import type { Ability, Profile } from './types'

export const PROFILES: readonly Profile[] = [
  {
    id: 0,
    label: 'Starting out',
    blurb: "We'll start gently and build from there.",
  },
  {
    id: 1,
    label: 'Building up',
    blurb: 'You are building up. The trail will meet you there.',
  },
  {
    id: 2,
    label: 'Comfortable',
    blurb: "You're comfortable. We'll look for a good challenge.",
  },
  {
    id: 3,
    label: 'Ready for a challenge',
    blurb: "You're ready for a challenge. We'll stretch when you're solving them.",
  },
]

export function abilityFromCalibration(correctCount: number): Ability {
  if (!Number.isInteger(correctCount) || correctCount < 0 || correctCount > CALIBRATION_LEVELS.length) {
    throw new Error(`calibration score out of range: ${correctCount}`)
  }
  if (correctCount <= 1) return 0
  if (correctCount <= 3) return 1
  if (correctCount <= 5) return 2
  return 3
}

export function profileById(id: Ability): Profile {
  const profile = PROFILES.find((item) => item.id === id)
  if (!profile) throw new Error(`unknown profile ${id}`)
  return profile
}
