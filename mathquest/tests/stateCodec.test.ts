import { describe, expect, it } from 'vitest'
import { nextDifficulty, validActions } from '../src/core/actionMask'
import { N_STATES } from '../src/core/config'
import { abilityFromCalibration } from '../src/core/profiles'
import { decodeState, encodeState, initialState } from '../src/core/stateCodec'

describe('state codec', () => {
  it('round-trips every allocated state', () => {
    for (let id = 0; id < N_STATES; id += 1) {
      expect(encodeState(decodeState(id))).toBe(id)
    }
  })

  it('starts a session at difficulty 2 with empty history', () => {
    expect(initialState(2)).toEqual({
      ability: 2,
      previousDifficulty: 2,
      strain: 0,
      wrongStreak: 0,
      answeredCount: 0,
    })
  })
})

describe('action mask', () => {
  it('blocks decrease at level 1 and increase at level 5', () => {
    expect(validActions(1)).toEqual([1, 2])
    expect(validActions(3)).toEqual([0, 1, 2])
    expect(validActions(5)).toEqual([0, 1])
  })

  it('moves one level and rejects an invalid action', () => {
    expect(nextDifficulty(2, 2)).toBe(3)
    expect(nextDifficulty(2, 1)).toBe(2)
    expect(nextDifficulty(2, 0)).toBe(1)
    expect(() => nextDifficulty(1, 0)).toThrow(/invalid/)
    expect(() => nextDifficulty(5, 2)).toThrow(/invalid/)
  })
})

describe('calibration profiles', () => {
  it('maps the six-question score onto four paths', () => {
    expect(abilityFromCalibration(0)).toBe(0)
    expect(abilityFromCalibration(1)).toBe(0)
    expect(abilityFromCalibration(2)).toBe(1)
    expect(abilityFromCalibration(3)).toBe(1)
    expect(abilityFromCalibration(4)).toBe(2)
    expect(abilityFromCalibration(5)).toBe(2)
    expect(abilityFromCalibration(6)).toBe(3)
  })
})
