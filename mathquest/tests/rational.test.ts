import { describe, expect, it } from 'vitest'
import { formatRational, gcd, ratAdd, ratEq, rational, spokenRational } from '../src/core/rational'

describe('rationals', () => {
  it('reduces fractions and keeps the denominator positive', () => {
    expect(rational(2, 4)).toEqual({ numerator: 1, denominator: 2 })
    expect(rational(-2, -4)).toEqual({ numerator: 1, denominator: 2 })
    expect(rational(2, -4)).toEqual({ numerator: -1, denominator: 2 })
    expect(rational(0, -5)).toEqual({ numerator: 0, denominator: 1 })
  })

  it('rejects a zero denominator', () => {
    expect(() => rational(1, 0)).toThrow(/zero denominator/)
  })

  it('treats equivalent forms as the same value', () => {
    expect(ratEq(rational(1, 2), rational(2, 4))).toBe(true)
    expect(ratEq(rational(1, 2), rational(1, 3))).toBe(false)
  })

  it('adds exact rationals', () => {
    expect(ratAdd(rational(1, 2), rational(1, 3))).toEqual({ numerator: 5, denominator: 6 })
  })

  it('formats spoken labels without a leading negative denominator', () => {
    expect(formatRational(rational(-2, 4))).toBe('-1/2')
    expect(spokenRational(rational(-1, 2))).toBe('negative 1 over 2')
    expect(gcd(8, 12)).toBe(4)
  })
})
