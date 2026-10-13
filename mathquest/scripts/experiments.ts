import { resolve } from 'node:path'
import os from 'node:os'
import { TRAIN } from '../src/core/config'
import { serializeModel } from '../src/core/artifact'
import { FULL_STUDY, SMOKE_STUDY, runStudy, type StudyOutput } from '../src/core/study'
import { writeEvidence, writeJson } from './evidenceFiles'

const smoke = process.argv.includes('--smoke')
const config = smoke ? SMOKE_STUDY : FULL_STUDY
const root = resolve(import.meta.dirname, '..')
const started = new Date()

if (smoke) console.log('SMOKE STUDY. This does not replace the 100000-episode experiment and does not write public/models.')
else console.log('Full study: 100000 episodes, three seeds, two algorithms. The test split stays unused until selection is finished.')

const result = runStudy(config, (message) => console.log(message))
const summary = {
  ...result.summary,
  generatedAt: new Date().toISOString(),
  machine: {
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model ?? 'unknown',
    totalMemoryBytes: os.totalmem(),
    node: process.version,
  },
}
writeJson(resolve(root, 'artifacts/metrics/summary.json'), summary)
writeJson(resolve(root, 'public/results/summary.json'), summary)
writeModels(root, result, smoke)
writeEvidence(root, result.summary)
writeJson(resolve(root, 'artifacts/experiment-manifest.json'), {
  smoke,
  startedAt: started.toISOString(),
  finishedAt: new Date().toISOString(),
  runtimeSeconds: result.summary.runtimeSeconds,
  config,
})
console.log(`Wrote evidence under ${root}/artifacts`)
if (!smoke) console.log('Bundled median validation models in public/models.')

function writeModels(projectRoot: string, study: StudyOutput, isSmoke: boolean): void {
  const modelDir = resolve(projectRoot, 'artifacts/models')
  for (const model of study.policies.all) {
    writeJson(
      resolve(modelDir, `${model.algorithm}-seed${model.seed}.json`),
      serializeModel(model.policy, {
        algorithm: model.algorithm,
        seed: model.seed,
        episodes: config.episodes,
        alpha: model.alpha,
        gamma: TRAIN.gamma,
        timestamp: new Date().toISOString(),
      }),
    )
  }
  if (isSmoke) return
  writeJson(resolve(projectRoot, 'public/models/q-learning-default.json'), bundledArtifact(study, 'q-learning'))
  writeJson(resolve(projectRoot, 'public/models/sarsa-reference.json'), bundledArtifact(study, 'sarsa'))
}

function bundledArtifact(study: StudyOutput, algorithm: 'q-learning' | 'sarsa') {
  const policy = algorithm === 'q-learning' ? study.policies.qLearning : study.policies.sarsa
  const chosen = study.policies.all.find((model) => model.algorithm === algorithm && model.policy === policy)
  if (!chosen) throw new Error(`missing bundled ${algorithm} model`)
  return serializeModel(policy, {
    algorithm,
    seed: chosen.seed,
    episodes: config.episodes,
    alpha: chosen.alpha,
    gamma: TRAIN.gamma,
    timestamp: new Date().toISOString(),
  })
}
