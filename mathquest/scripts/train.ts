import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TRAIN } from '../src/core/config'
import { serializeModel } from '../src/core/artifact'
import { trainAgent, type Algorithm } from '../src/core/train'

const args = readArgs(process.argv.slice(2))
const algorithm = (args.algorithm ?? 'q-learning') as Algorithm
const seed = numberArg(args.seed, 11)
const episodes = numberArg(args.episodes, 50)
const alpha = numberArg(args.alpha, TRAIN.alpha)
const gamma = numberArg(args.gamma, TRAIN.gamma)
const outputDir = resolve(args.out ?? 'artifacts/smoke')

if (algorithm !== 'q-learning' && algorithm !== 'sarsa') {
  throw new Error('algorithm must be q-learning or sarsa')
}
if (outputDir.includes(`${'public'}/models`) && episodes !== TRAIN.episodes) {
  throw new Error('a short run cannot overwrite the bundled model')
}

const started = Date.now()
const result = trainAgent({ algorithm, seed, episodes, alpha, gamma })
const mean = result.returns.reduce((sum, value) => sum + value, 0) / result.returns.length
const artifact = serializeModel(result.policy, {
  algorithm,
  seed,
  episodes,
  alpha,
  gamma,
  timestamp: new Date().toISOString(),
})
mkdirSync(outputDir, { recursive: true })
const fileName = `${algorithm}-seed${seed}${artifact.smoke ? '-smoke' : ''}.json`
const filePath = resolve(outputDir, fileName)
writeFileSync(filePath, JSON.stringify(artifact))

if (artifact.smoke) {
  console.log('SMOKE RUN. This does not replace the 100000-episode experiment.')
}
console.log(
  `${algorithm} seed ${seed}: ${episodes} episodes, mean training return ${mean.toFixed(3)}, ${Date.now() - started} ms`,
)
console.log(filePath)

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
