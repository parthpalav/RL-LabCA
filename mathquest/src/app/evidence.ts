import summaryText from '../../artifacts/metrics/summary.json?raw'
import comparisonCsv from '../../artifacts/metrics/comparison.csv?raw'
import manifestText from '../../artifacts/experiment-manifest.json?raw'

export type Metrics = {
  episodes: number
  meanReturn: number
  correctRate: number
  challengeWeightedCorrect: number
  meanAttemptedDifficulty: number
  meanSolvedDifficulty: number | null
  meanLongestWrongStreak: number
  meanRepeatedFailureSteps: number
  meanSwitches: number
  coverage: number | null
}
export type EvidenceModel = {
  algorithm: 'q-learning' | 'sarsa'
  seed: number
  alpha: number
  bundled: boolean
  validationMeanReturn: number
  test: Metrics
  stress: Metrics
  byProfile: { profile: number; metrics: Metrics }[]
  checkpoints: { episode: number; meanReturn: number }[]
}
export type Evidence = {
  smoke: boolean
  generatedAt: string
  scenarioVersion: string
  runtimeSeconds: number
  models: EvidenceModel[]
  trainingCurves: {
    algorithm: string
    seed: number
    movingAverage: { episode: number; value: number }[]
  }[]
  baselines: Record<
    'fixed' | 'rule' | 'random',
    {
      test: Metrics
      stress: Metrics
      byProfile: { profile: number; metrics: Metrics }[]
    }
  >
  seedSpread: Record<
    'q-learning' | 'sarsa',
    { seeds: number[]; mean: number; sampleStandardDeviation: number }
  >
  counts: {
    pilotScenarios: number
    validationScenarios: number
    checkpointScenarios: number
    testScenarios: number
  }
  protocol: {
    alphaChosenOn: string
    baselinesChosenOn: string
    reportedOn: string
    bundledSeedRule: string
    returnDefinition: string
  }
  machine: { cpu: string; node: string; platform: string; arch: string }
}
export const evidence = JSON.parse(summaryText) as Evidence
export const evidenceFiles = { summaryText, comparisonCsv, manifestText }

export function comparisonRows(profile?: number) {
  return [
    ...(['q-learning', 'sarsa'] as const).map((algorithm) => {
      const models = evidence.models.filter(
        (model) => model.algorithm === algorithm,
      )
      const metrics = models.map((model) =>
        profile === undefined
          ? model.test
          : model.byProfile.find((row) => row.profile === profile)!.metrics,
      )
      const average = (key: keyof Metrics) => {
        const values = metrics.flatMap((metric) =>
          metric[key] === null ? [] : [metric[key] as number],
        )
        return values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null
      }
      return {
        name: algorithm === 'q-learning' ? 'Q-learning' : 'SARSA',
        samples: `${models.length} seeds × ${metrics[0].episodes} episodes`,
        meanReturn: average('meanReturn')!,
        correctRate: average('correctRate')!,
        meanAttemptedDifficulty: average('meanAttemptedDifficulty')!,
        meanSolvedDifficulty: average('meanSolvedDifficulty'),
        meanLongestWrongStreak: average('meanLongestWrongStreak')!,
        meanSwitches: average('meanSwitches')!,
        sd:
          profile === undefined
            ? evidence.seedSpread[algorithm].sampleStandardDeviation
            : null,
      }
    }),
    ...(['rule', 'fixed', 'random'] as const).map((name) => {
      const baseline = evidence.baselines[name]
      const metrics =
        profile === undefined
          ? baseline.test
          : baseline.byProfile.find((row) => row.profile === profile)!.metrics
      return {
        name:
          name === 'rule'
            ? 'Tuned rule'
            : name === 'fixed'
              ? 'Tuned fixed'
              : 'Random',
        samples: `${metrics.episodes} episodes`,
        ...metrics,
        sd: null,
      }
    }),
  ]
}
