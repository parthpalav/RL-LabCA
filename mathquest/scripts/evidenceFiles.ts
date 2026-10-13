import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { barChart, lineChart } from '../src/core/charts'
import type { StudyOutput } from '../src/core/study'

const COLORS = ['#8b5cf6', '#6d28d9', '#c4b5fd', '#0f766e', '#14b8a6', '#99f6e4']

export function writeJson(file: string, value: unknown): void {
  mkdirSync(resolve(file, '..'), { recursive: true })
  writeFileSync(file, JSON.stringify(value, null, 2))
}

export function writeEvidence(projectRoot: string, value: StudyOutput['summary']): void {
  const figureDir = resolve(projectRoot, 'artifacts/figures')
  mkdirSync(figureDir, { recursive: true })
  writeFileSync(
    resolve(figureDir, 'training-return.svg'),
    lineChart(
      'Training return vs episode (moving average, includes exploration)',
      'Episode',
      'Return',
      value.trainingCurves.map((curve, index) => ({
        name: `${curve.algorithm} ${curve.seed}`,
        color: COLORS[index % COLORS.length],
        points: curve.movingAverage.map((point) => ({ x: point.episode, y: point.value })),
      })),
    ),
  )
  const checkpointSeries = value.models
    .filter((model) => model.checkpoints.length > 0)
    .map((model, index) => ({
      name: `${model.algorithm} ${model.seed}`,
      color: COLORS[index % COLORS.length],
      points: model.checkpoints.map((point) => ({ x: point.episode, y: point.meanReturn })),
    }))
  if (checkpointSeries.length > 0) {
    writeFileSync(
      resolve(figureDir, 'checkpoint-return.svg'),
      lineChart('Frozen checkpoint return vs episode', 'Episode', 'Mean return', checkpointSeries),
    )
  }
  writeFileSync(
    resolve(figureDir, 'comparison.svg'),
    barChart('Test mean return. Q-learning and SARSA are means of training-seed means.', 'Return', [
      { name: 'Q-learning', value: value.seedSpread['q-learning'].mean, color: '#8b5cf6' },
      { name: 'SARSA', value: value.seedSpread.sarsa.mean, color: '#0f766e' },
      { name: 'Fixed', value: value.baselines.fixed.test.meanReturn, color: '#fbbf24' },
      { name: 'Rule', value: value.baselines.rule.test.meanReturn, color: '#fb7185' },
      { name: 'Random', value: value.baselines.random.test.meanReturn, color: '#94a3b8' },
    ]),
  )
  writeFileSync(resolve(projectRoot, 'artifacts/metrics/comparison.csv'), comparisonCsv(value))
  writeJson(resolve(projectRoot, 'artifacts/traces/example.json'), value.example)
}

function comparisonCsv(value: StudyOutput['summary']): string {
  const lines = ['controller,seed,meanReturn,correctRate,challengeWeightedCorrect,meanAttemptedDifficulty,meanSolvedDifficulty,meanLongestWrongStreak,meanRepeatedFailureSteps,meanSwitches,coverage']
  for (const model of value.models) lines.push(metricRow(model.algorithm, model.seed, model.test))
  for (const name of ['fixed', 'rule', 'random'] as const) lines.push(metricRow(name, '', value.baselines[name].test))
  return `${lines.join('\n')}\n`
}

function metricRow(name: string, seed: number | '', metrics: StudyOutput['summary']['models'][number]['test']): string {
  return [
    name,
    seed,
    metrics.meanReturn,
    metrics.correctRate,
    metrics.challengeWeightedCorrect,
    metrics.meanAttemptedDifficulty,
    metrics.meanSolvedDifficulty ?? 'N/A',
    metrics.meanLongestWrongStreak,
    metrics.meanRepeatedFailureSteps,
    metrics.meanSwitches,
    metrics.coverage ?? 'N/A',
  ].join(',')
}
