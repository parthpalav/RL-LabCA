import { GENERATOR_VERSION } from './config'
import { formatRational, ratAdd, ratEq, ratFromInt, ratKey, rational, spokenRational } from './rational'
import { integer, mixSeed, mulberry32, type Rng } from './rng'
import type { Difficulty, PromptPart, Question, QuestionOption, QuestionSpec, Rational } from './types'

const OPTION_IDS: QuestionOption['id'][] = ['1', '2', '3', '4']

export function solveSpec(spec: QuestionSpec): Rational {
  switch (spec.kind) {
    case 'add':
      return ratFromInt(spec.a + spec.b)
    case 'sub':
      return ratFromInt(spec.a - spec.b)
    case 'mul':
      return ratFromInt(spec.a * spec.b)
    case 'div':
      if (spec.divisor === 0 || spec.dividend % spec.divisor !== 0) {
        throw new Error('division template is not exact')
      }
      return ratFromInt(spec.dividend / spec.divisor)
    case 'paren-mul':
      return ratFromInt((spec.a + spec.b) * spec.c)
    case 'paren-sub-mul':
      return ratFromInt((spec.a - spec.b) * spec.c)
    case 'add-mul':
      return ratFromInt(spec.a + spec.b * spec.c)
    case 'mul-add':
      return ratFromInt(spec.a * spec.b + spec.c)
    case 'frac-add':
      return rational(spec.a * spec.d + spec.c * spec.b, spec.b * spec.d)
    case 'percent':
      return rational(spec.percent * spec.whole, 100)
    case 'one-step':
      if (spec.a === 0 || spec.product % spec.a !== 0) throw new Error('one-step equation is not exact')
      return ratFromInt(spec.product / spec.a)
    case 'two-step':
      if (spec.a === 0 || (spec.c - spec.b) % spec.a !== 0) throw new Error('two-step equation is not exact')
      return ratFromInt((spec.c - spec.b) / spec.a)
    case 'mixed':
      return ratFromInt((spec.a + spec.b) * spec.c - spec.d)
  }
}

export function generateQuestion(level: Difficulty, seed: number): Question {
  const rng = mulberry32(mixSeed(seed, level))
  const shuffleRng = mulberry32(mixSeed(seed, 1000 + level))
  const built = buildSpec(level, rng)
  const correct = solveSpec(built.spec)
  const options = buildOptions(correct, built.distractors, shuffleRng)
  const correctOption = options.find((option) => ratEq(option.value, correct))
  if (!correctOption) throw new Error('correct option missing')
  return {
    id: `${GENERATOR_VERSION}-${level}-${seed}`,
    generatorVersion: GENERATOR_VERSION,
    level,
    topic: built.topic,
    promptParts: built.prompt,
    options,
    correctOptionId: correctOption.id,
    explanationSteps: built.explanation,
    spec: built.spec,
  }
}

export function gradeQuestion(question: Question, optionId: string): boolean {
  return question.correctOptionId === optionId
}

type Built = {
  topic: string
  spec: QuestionSpec
  prompt: PromptPart[]
  explanation: string[]
  distractors: Rational[]
}

function buildSpec(level: Difficulty, rng: Rng): Built {
  if (level === 1) return rng() < 0.5 ? addition(rng) : subtraction(rng)
  if (level === 2) return rng() < 0.5 ? multiplication(rng) : division(rng)
  if (level === 3) return rng() < 0.5 ? expression(rng) : fractionAdd(rng)
  if (level === 4) return rng() < 0.5 ? percentage(rng) : oneStep(rng)
  return rng() < 0.5 ? twoStep(rng) : mixed(rng)
}

function text(value: string): PromptPart {
  return { kind: 'text', text: value }
}

function addition(rng: Rng): Built {
  const a = integer(rng, 0, 20)
  const b = integer(rng, 0, 20)
  const spec: QuestionSpec = { kind: 'add', a, b }
  return {
    topic: 'addition',
    spec,
    prompt: [text(`What is ${a} + ${b}?`)],
    explanation: [`${a} + ${b} = ${a + b}.`],
    distractors: ints(a + b + 1, a + b - 1, a + b + 2, Math.abs(a - b), a + b + b),
  }
}

function subtraction(rng: Rng): Built {
  let a = integer(rng, 0, 20)
  let b = integer(rng, 0, 20)
  if (a < b) [a, b] = [b, a]
  const spec: QuestionSpec = { kind: 'sub', a, b }
  return {
    topic: 'subtraction',
    spec,
    prompt: [text(`What is ${a} − ${b}?`)],
    explanation: [`${a} − ${b} = ${a - b}.`],
    distractors: ints(a - b + 1, a - b + 2, a + b, b, Math.max(0, a - b - 1)),
  }
}

function multiplication(rng: Rng): Built {
  const a = integer(rng, 2, 12)
  const b = integer(rng, 2, 12)
  const spec: QuestionSpec = { kind: 'mul', a, b }
  return {
    topic: 'multiplication',
    spec,
    prompt: [text(`What is ${a} × ${b}?`)],
    explanation: [`${a} × ${b} = ${a * b}.`],
    distractors: ints((a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b, a * b + a),
  }
}

function division(rng: Rng): Built {
  const divisor = integer(rng, 2, 12)
  const quotient = integer(rng, 2, 12)
  const dividend = divisor * quotient
  const spec: QuestionSpec = { kind: 'div', dividend, divisor }
  return {
    topic: 'division',
    spec,
    prompt: [text(`What is ${dividend} ÷ ${divisor}?`)],
    explanation: [`${divisor} × ${quotient} = ${dividend}, so ${dividend} ÷ ${divisor} = ${quotient}.`],
    distractors: ints(quotient + 1, quotient - 1, divisor, quotient + 2, dividend),
  }
}

function expression(rng: Rng): Built {
  const form = integer(rng, 0, 3)
  const a = integer(rng, 1, 9)
  const b = integer(rng, 1, 9)
  const c = integer(rng, 2, 9)
  if (form === 0) {
    const spec: QuestionSpec = { kind: 'paren-mul', a, b, c }
    return {
      topic: 'order of operations',
      spec,
      prompt: [text(`What is (${a} + ${b}) × ${c}?`)],
      explanation: [`${a} + ${b} = ${a + b}.`, `${a + b} × ${c} = ${(a + b) * c}.`],
      distractors: ints(a + b * c, a * b + c, a + b + c, (a + b) * c + 1),
    }
  }
  if (form === 1) {
    const left = Math.max(a, b)
    const right = Math.min(a, b)
    const spec: QuestionSpec = { kind: 'paren-sub-mul', a: left, b: right, c }
    return {
      topic: 'order of operations',
      spec,
      prompt: [text(`What is (${left} − ${right}) × ${c}?`)],
      explanation: [`${left} − ${right} = ${left - right}.`, `${left - right} × ${c} = ${(left - right) * c}.`],
      distractors: ints(left - right * c, left * c - right, left - right + c, (left - right) * c + c),
    }
  }
  if (form === 2) {
    const spec: QuestionSpec = { kind: 'add-mul', a, b, c }
    return {
      topic: 'order of operations',
      spec,
      prompt: [text(`What is ${a} + (${b} × ${c})?`)],
      explanation: [`${b} × ${c} = ${b * c}.`, `${a} + ${b * c} = ${a + b * c}.`],
      distractors: ints((a + b) * c, a * b + c, a + b + c, a + b * c + 1),
    }
  }
  const spec: QuestionSpec = { kind: 'mul-add', a, b, c }
  return {
    topic: 'order of operations',
    spec,
    prompt: [text(`What is (${a} × ${b}) + ${c}?`)],
    explanation: [`${a} × ${b} = ${a * b}.`, `${a * b} + ${c} = ${a * b + c}.`],
    distractors: ints(a * (b + c), a + b + c, a * b * c, a * b + c + 1),
  }
}

function fractionAdd(rng: Rng): Built {
  const b = integer(rng, 2, 6)
  const d = integer(rng, 2, 6)
  const a = integer(rng, 1, b)
  const c = integer(rng, 1, d)
  const spec: QuestionSpec = { kind: 'frac-add', a, b, c, d }
  const answer = solveSpec(spec)
  return {
    topic: 'fractions',
    spec,
    prompt: [
      text('What is '),
      { kind: 'frac', numerator: a, denominator: b, spoken: spokenRational(rational(a, b)) },
      text(' + '),
      { kind: 'frac', numerator: c, denominator: d, spoken: spokenRational(rational(c, d)) },
      text('?'),
    ],
    explanation: [
      `The common denominator is ${b * d}.`,
      `${a}/${b} = ${a * d}/${b * d} and ${c}/${d} = ${c * b}/${b * d}.`,
      `The sum is ${formatRational(answer)}.`,
    ],
    distractors: [
      rational(a + c, b + d),
      rational(a + c, b * d),
      rational(a * c, b * d),
      rational(Math.abs(a * d - c * b), b * d),
    ],
  }
}

function percentage(rng: Rng): Built {
  const choices = [
    { percent: 10, step: 10 },
    { percent: 20, step: 5 },
    { percent: 25, step: 4 },
    { percent: 50, step: 2 },
  ]
  const choice = choices[integer(rng, 0, choices.length - 1)]
  const whole = choice.step * integer(rng, 1, 20)
  const spec: QuestionSpec = { kind: 'percent', percent: choice.percent, whole }
  const answer = solveSpec(spec)
  const answerInt = answer.numerator / answer.denominator
  return {
    topic: 'percentages',
    spec,
    prompt: [text(`What is ${choice.percent}% of ${whole}?`)],
    explanation: [`${choice.percent}% means ${choice.percent}/100.`, `${choice.percent}/100 × ${whole} = ${formatRational(answer)}.`,],
    distractors: ints(whole - answerInt, answerInt + choice.step, choice.percent, whole, answerInt * 2),
  }
}

function oneStep(rng: Rng): Built {
  const a = integer(rng, 2, 9)
  const x = integer(rng, 1, 12)
  const product = a * x
  const spec: QuestionSpec = { kind: 'one-step', a, product }
  return {
    topic: 'one-step equation',
    spec,
    prompt: [text(`Solve ${a}x = ${product}.`)],
    explanation: [`Divide both sides by ${a}.`, `x = ${product} ÷ ${a} = ${x}.`],
    distractors: ints(x + 1, x - 1, a, product, product - a),
  }
}

function twoStep(rng: Rng): Built {
  const a = integer(rng, 2, 9)
  const x = integer(rng, -5, 12)
  const nonzeroX = x === 0 ? 1 : x
  const b = integer(rng, -9, 9) || 1
  const c = a * nonzeroX + b
  const spec: QuestionSpec = { kind: 'two-step', a, b, c }
  const signedB = b < 0 ? `− ${Math.abs(b)}` : `+ ${b}`
  return {
    topic: 'two-step equation',
    spec,
    prompt: [text(`Solve ${a}x ${signedB} = ${c}.`)],
    explanation: [
      `Subtract ${b}: ${a}x = ${c - b}.`,
      `Divide by ${a}: x = ${nonzeroX}.`,
    ],
    distractors: ints(nonzeroX + 1, nonzeroX - 1, c - b, a, c),
  }
}

function mixed(rng: Rng): Built {
  const a = integer(rng, 1, 8)
  const b = integer(rng, 1, 8)
  const c = integer(rng, 1, 6)
  const d = integer(rng, 0, 10)
  const spec: QuestionSpec = { kind: 'mixed', a, b, c, d }
  return {
    topic: 'mixed arithmetic',
    spec,
    prompt: [text(`What is (${a} + ${b}) × ${c} − ${d}?`)],
    explanation: [
      `${a} + ${b} = ${a + b}.`,
      `${a + b} × ${c} = ${(a + b) * c}.`,
      `${(a + b) * c} − ${d} = ${(a + b) * c - d}.`,
    ],
    distractors: ints(a + b * c - d, (a + b) * (c - d), a + b + c - d, (a + b) * c - d + 1),
  }
}

function ints(...values: number[]): Rational[] {
  return values.filter((value) => Number.isInteger(value)).map((value) => ratFromInt(value))
}

function buildOptions(correct: Rational, candidates: Rational[], rng: Rng): QuestionOption[] {
  const chosen: Rational[] = [rational(correct.numerator, correct.denominator)]
  const seen = new Set([ratKey(correct)])
  const pool = [...candidates]
  let distance = 1
  while (chosen.length < 4 && (pool.length > 0 || distance <= 40)) {
    const next = pool.length > 0 ? pool.shift() : undefined
    const candidate = next ?? ratAdd(correct, ratFromInt(distance % 2 === 1 ? distance : -distance + 1))
    if (!next) distance += 1
    if (!candidate) break
    const normal = rational(candidate.numerator, candidate.denominator)
    const key = ratKey(normal)
    if (seen.has(key)) continue
    seen.add(key)
    chosen.push(normal)
  }
  if (chosen.length !== 4) throw new Error('could not build four distinct options')
  for (let index = chosen.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1))
    const current = chosen[index]
    chosen[index] = chosen[swap]
    chosen[swap] = current
  }
  return chosen.map((value, index) => ({
    id: OPTION_IDS[index],
    value,
    label: formatRational(value),
    spoken: spokenRational(value),
  }))
}
