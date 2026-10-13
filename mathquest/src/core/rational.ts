import type { Rational } from './types'

export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const next = x % y
    x = y
    y = next
  }
  return x || 1
}

export function rational(numerator: number, denominator = 1): Rational {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    throw new Error('rational expects integers')
  }
  if (denominator === 0) throw new Error('zero denominator')
  if (denominator < 0) {
    numerator = -numerator
    denominator = -denominator
  }
  if (numerator === 0) return { numerator: 0, denominator: 1 }
  const divisor = gcd(numerator, denominator)
  return { numerator: numerator / divisor, denominator: denominator / divisor }
}

export function ratEq(a: Rational, b: Rational): boolean {
  const left = rational(a.numerator, a.denominator)
  const right = rational(b.numerator, b.denominator)
  return left.numerator === right.numerator && left.denominator === right.denominator
}

export function ratKey(value: Rational): string {
  const normal = rational(value.numerator, value.denominator)
  return `${normal.numerator}/${normal.denominator}`
}

export function ratAdd(a: Rational, b: Rational): Rational {
  return rational(
    a.numerator * b.denominator + b.numerator * a.denominator,
    a.denominator * b.denominator,
  )
}

export function ratSub(a: Rational, b: Rational): Rational {
  return ratAdd(a, rational(-b.numerator, b.denominator))
}

export function ratMul(a: Rational, b: Rational): Rational {
  return rational(a.numerator * b.numerator, a.denominator * b.denominator)
}

export function ratFromInt(value: number): Rational {
  return rational(value, 1)
}

export function formatRational(value: Rational): string {
  const normal = rational(value.numerator, value.denominator)
  if (normal.denominator === 1) return String(normal.numerator)
  const sign = normal.numerator < 0 ? '-' : ''
  return `${sign}${Math.abs(normal.numerator)}/${normal.denominator}`
}

export function spokenRational(value: Rational): string {
  const normal = rational(value.numerator, value.denominator)
  if (normal.denominator === 1) return String(normal.numerator)
  const sign = normal.numerator < 0 ? 'negative ' : ''
  return `${sign}${Math.abs(normal.numerator)} over ${normal.denominator}`
}
