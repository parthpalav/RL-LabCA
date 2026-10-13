import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseModel } from '../src/core/artifact'
import { runFrozenEpisode } from '../src/core/train'
import type { Ability } from '../src/core/types'

const args = readArgs(process.argv.slice(2))
const modelPath = resolve(args.model ?? 'artifacts/smoke/q-learning-seed11-smoke.json')
const episodes = numberArg(args.episodes, 5)
const { artifact, policy } = parseModel(JSON.parse(readFileSync(modelPath, 'utf8')))
const totals: number[] = []
for (const ability of [0, 1, 2, 3] as const) {
  for (let episode = 0; episode < episodes; episode += 1) {
    totals.push(runFrozenEpisode(policy, 1000 + ability * 100 + episode, ability as Ability))
  }
}
const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length
console.log(
  `${artifact.algorithm} seed ${artifact.seed}, smoke=${artifact.smoke}: frozen mean return ${mean.toFixed(3)} over ${totals.length} episodes`,
)

function readArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) continue
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) out[token.slice(2)] = 'true'
    else {
      out[token.slice(2)] = value
      index += 1
    }
  }
  return out
}

function numberArg(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`expected a number, received ${value}`)
  return parsed
}
