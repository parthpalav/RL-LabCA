import { EPISODE_LENGTH, RESPONSE, STRESS_RESPONSE, TRAIN } from './config'
import { nextDifficulty } from './actionMask'
import { emptyRuleMemory, fixedAct, randomAct, ruleAct, ruleObserve, type RuleConfig } from './baselines'
import { greedyAction, qValue, stateVisits, type TabularPolicy } from './policy'
import { mixSeed, mulberry32 } from './rng'
import { successProbability, type ResponseModel } from './simulator'
import { initialState } from './stateCodec'
import { trainAgent, type Algorithm } from './train'
import { applyTransition } from './transitions'
import type { Ability, Action, Difficulty, GameState } from './types'

export const SCENARIO_VERSION = 'scenarios-v1'
export const FAMILY_SEEDS = { pilot: 101, validation: 202, checkpoint: 303, test: 404 } as const
export type ScenarioFamily = keyof typeof FAMILY_SEEDS

export type Scenario = {
  id: string
  family: ScenarioFamily
  profile: Ability
  index: number
  seed: number
  uniforms: number[]
}

export type StudyConfig = {
  smoke: boolean
  episodes: number
  pilotEpisodes: number
  pilotSeed: number
  seeds: readonly number[]
  alphas: readonly number[]
  validationPerProfile: number
  checkpointPerProfile: number
  testPerProfile: number
  pilotPerProfile: number
  checkpointInterval: number
}

export const FULL_STUDY: StudyConfig = {
  smoke: false,
  episodes: TRAIN.episodes,
  pilotEpisodes: TRAIN.pilotEpisodes,
  pilotSeed: TRAIN.pilotSeed,
  seeds: TRAIN.seeds,
  alphas: TRAIN.pilotAlphas,
  validationPerProfile: 50,
  checkpointPerProfile: TRAIN.checkpointEpisodesPerProfile,
  testPerProfile: TRAIN.testEpisodesPerProfile,
  pilotPerProfile: 20,
  checkpointInterval: TRAIN.checkpointInterval,
}

export const SMOKE_STUDY: StudyConfig = {
  smoke: true,
  episodes: 30,
  pilotEpisodes: 10,
  pilotSeed: TRAIN.pilotSeed,
  seeds: [11],
  alphas: TRAIN.pilotAlphas,
  validationPerProfile: 4,
  checkpointPerProfile: 2,
  testPerProfile: 4,
  pilotPerProfile: 2,
  checkpointInterval: 30,
}

export type EpisodeMetrics = {
  scenarioId: string
  profile: Ability
  episodeReturn: number
  correctRate: number
  challengeWeightedCorrect: number
  meanAttemptedDifficulty: number
  meanSolvedDifficulty: number | null
  longestWrongStreak: number
  repeatedFailureSteps: number
  switches: number
  coverage: number | null
  steps: StepTrace[]
}

export type StepTrace = {
  question: number
  difficulty: Difficulty
  correct: boolean
  reward: number
  actualWrongStreak: number
}

export type MetricSummary = {
  episodes: number
  meanReturn: number
  correctRate: number
  challengeWeightedCorrect: number
  meanAttemptedDifficulty: number
  meanSolvedDifficulty: number | null
  episodesWithNoCorrect: number
  meanLongestWrongStreak: number
  meanRepeatedFailureSteps: number
  meanSwitches: number
  coverage: number | null
}

type Act = (state: GameState) => Action

export function buildScenarios(family: ScenarioFamily, perProfile: number): Scenario[] {
  const seed = FAMILY_SEEDS[family]
  const rng = mulberry32(seed)
  const scenarios: Scenario[] = []
  for (let profile = 0; profile < 4; profile += 1) {
    for (let index = 0; index < perProfile; index += 1) {
      const uniforms: number[] = []
      for (let step = 0; step < EPISODE_LENGTH; step += 1) uniforms.push(rng())
      scenarios.push({
        id: `${family}-p${profile}-${index}`,
        family,
        profile: profile as Ability,
        index,
        seed: mixSeed(seed, profile * 1000 + index),
        uniforms,
      })
    }
  }
  return scenarios
}

export function runEpisode(
  scenario: Scenario,
  response: ResponseModel,
  act: Act,
  options?: { observe?: (correct: boolean) => void; visits?: (state: GameState) => number },
): EpisodeMetrics {
  let state = initialState(scenario.profile)
  let episodeReturn = 0
  let correctCount = 0
  let challengeSum = 0
  let attemptedSum = 0
  let solvedSum = 0
  let solvedCount = 0
  let actualStreak = 0
  let longest = 0
  let repeated = 0
  let switches = 0
  let covered = 0
  let decisions = 0
  const steps: StepTrace[] = []
  for (let question = 1; question <= EPISODE_LENGTH; question += 1) {
    const action = act(state)
    const difficulty = nextDifficulty(state.previousDifficulty, action)
    if (difficulty !== state.previousDifficulty) switches += 1
    if (options?.visits) {
      decisions += 1
      if (options.visits(state) > 0) covered += 1
    }
    const correct = scenario.uniforms[question - 1] < successProbability(state.ability, difficulty, state.strain, response)
    const transition = applyTransition(state, action, correct)
    if (correct) {
      actualStreak = 0
      correctCount += 1
      challengeSum += difficulty
      solvedSum += difficulty
      solvedCount += 1
    } else {
      actualStreak += 1
      if (actualStreak >= 2) repeated += 1
    }
    longest = Math.max(longest, actualStreak)
    attemptedSum += difficulty
    episodeReturn += transition.reward.total
    options?.observe?.(correct)
    steps.push({ question, difficulty, correct, reward: transition.reward.total, actualWrongStreak: actualStreak })
    state = transition.next
  }
  return {
    scenarioId: scenario.id,
    profile: scenario.profile,
    episodeReturn,
    correctRate: correctCount / EPISODE_LENGTH,
    challengeWeightedCorrect: challengeSum / EPISODE_LENGTH,
    meanAttemptedDifficulty: attemptedSum / EPISODE_LENGTH,
    meanSolvedDifficulty: solvedCount === 0 ? null : solvedSum / solvedCount,
    longestWrongStreak: longest,
    repeatedFailureSteps: repeated,
    switches,
    coverage: decisions === 0 ? null : covered / decisions,
    steps,
  }
}

export function summarize(rows: EpisodeMetrics[]): MetricSummary {
  const solved = rows.map((row) => row.meanSolvedDifficulty).filter((value): value is number => value !== null)
  const coverage = rows.map((row) => row.coverage).filter((value): value is number => value !== null)
  return {
    episodes: rows.length,
    meanReturn: mean(rows.map((row) => row.episodeReturn)),
    correctRate: mean(rows.map((row) => row.correctRate)),
    challengeWeightedCorrect: mean(rows.map((row) => row.challengeWeightedCorrect)),
    meanAttemptedDifficulty: mean(rows.map((row) => row.meanAttemptedDifficulty)),
    meanSolvedDifficulty: solved.length === 0 ? null : mean(solved),
    episodesWithNoCorrect: rows.length - solved.length,
    meanLongestWrongStreak: mean(rows.map((row) => row.longestWrongStreak)),
    meanRepeatedFailureSteps: mean(rows.map((row) => row.repeatedFailureSteps)),
    meanSwitches: mean(rows.map((row) => row.switches)),
    coverage: coverage.length === 0 ? null : mean(coverage),
  }
}

function runGreedy(policy: TabularPolicy, scenario: Scenario, response: ResponseModel): EpisodeMetrics {
  const ties = mulberry32(mixSeed(scenario.seed, 4))
  return runEpisode(scenario, response, (state) => greedyAction(policy, state, ties), {
    visits: (state) => stateVisits(policy, state),
  })
}

function runFixed(scenario: Scenario, level: Difficulty, response: ResponseModel): EpisodeMetrics {
  return runEpisode(scenario, response, (state) => fixedAct(state, level))
}

function runRule(scenario: Scenario, config: RuleConfig, response: ResponseModel): EpisodeMetrics {
  let memory = emptyRuleMemory()
  return runEpisode(
    scenario,
    response,
    (state) => {
      const decision = ruleAct(state, memory, config)
      memory = decision.memory
      return decision.action
    },
    { observe: (correct) => { memory = ruleObserve(memory, correct) } },
  )
}

function runRandom(scenario: Scenario, response: ResponseModel): EpisodeMetrics {
  const rng = mulberry32(scenario.seed)
  return runEpisode(scenario, response, (state) => randomAct(state, rng))
}

export function runStudy(config: StudyConfig, log: (message: string) => void = () => {}) {
  const started = Date.now()
  const validation = buildScenarios('validation', config.validationPerProfile)
  const checkpointScenarios = buildScenarios('checkpoint', config.checkpointPerProfile)
  const pilotScenarios = buildScenarios('pilot', config.pilotPerProfile)
  assertDisjoint([validation, checkpointScenarios, pilotScenarios])

  let probe: { steps: number; seconds: number; stepsPerSecond: number } | null = null
  if (!config.smoke) {
    const probeEpisodes = 500
    const probeStart = performance.now()
    trainAgent({ algorithm: 'q-learning', seed: 1, episodes: probeEpisodes })
    const seconds = (performance.now() - probeStart) / 1000
    const steps = probeEpisodes * EPISODE_LENGTH
    probe = { steps, seconds, stepsPerSecond: steps / seconds }
    log(`Probe ${steps} steps in ${seconds.toFixed(2)} s (${probe.stepsPerSecond.toFixed(0)} steps/s). Not a reported model.`)
  }

  const alphaSelection: AlphaRow[] = []
  const chosenAlpha = {} as Record<Algorithm, number>
  for (const algorithm of ['q-learning', 'sarsa'] as const) {
    let best = { alpha: config.alphas[0], meanReturn: Number.NEGATIVE_INFINITY }
    for (const alpha of config.alphas) {
      log(`Pilot ${algorithm} alpha ${alpha}`)
      const trained = trainAgent({ algorithm, seed: config.pilotSeed, episodes: config.pilotEpisodes, alpha })
      const summary = summarize(validation.map((scenario) => runGreedy(trained.policy, scenario, RESPONSE)))
      const row = { algorithm, alpha, ...summary }
      alphaSelection.push(row)
      const better = row.meanReturn > best.meanReturn + 1e-9
      const tiePreferDefault = Math.abs(row.meanReturn - best.meanReturn) <= 1e-9 && alpha === TRAIN.alpha
      if (better || tiePreferDefault) best = { alpha, meanReturn: row.meanReturn }
    }
    chosenAlpha[algorithm] = best.alpha
    log(`Selected ${algorithm} alpha ${best.alpha}`)
  }

  const fixedTuning = tuneFixed(validation)
  const ruleTuning = tuneRule(validation, log)
  log(`Fixed level ${fixedTuning.level}. Rule preferred ${ruleTuning.config.preferred.join(',')}`)

  const trainedModels: TrainedModel[] = []
  for (const algorithm of ['q-learning', 'sarsa'] as const) {
    for (const seed of config.seeds) {
      log(`Train ${algorithm} seed ${seed} for ${config.episodes} episodes`)
      const checkpoints: { episode: number; meanReturn: number }[] = []
      const trained = trainAgent({
        algorithm,
        seed,
        episodes: config.episodes,
        alpha: chosenAlpha[algorithm],
        checkpointInterval: config.checkpointInterval,
        onEpisode: (episode) => {
          if (episode % 1000 === 0) log(`  ${algorithm} seed ${seed}: episode ${episode}`)
        },
        onCheckpoint: (episode, policy) => {
          const summary = summarize(checkpointScenarios.map((scenario) => runGreedy(policy, scenario, RESPONSE)))
          checkpoints.push({ episode, meanReturn: summary.meanReturn })
        },
      })
      const validationSummary = summarize(validation.map((scenario) => runGreedy(trained.policy, scenario, RESPONSE)))
      trainedModels.push({
        algorithm,
        seed,
        alpha: chosenAlpha[algorithm],
        policy: trained.policy,
        returns: trained.returns,
        checkpoints,
        validation: validationSummary,
      })
    }
  }

  const bundled = {
    'q-learning': medianModel(trainedModels.filter((model) => model.algorithm === 'q-learning')),
    sarsa: medianModel(trainedModels.filter((model) => model.algorithm === 'sarsa')),
  }

  const test = buildScenarios('test', config.testPerProfile)
  assertDisjoint([validation, checkpointScenarios, pilotScenarios, test])
  log(`Test split: ${test.length} scenarios. Selection did not use this split.`)

  const testRows = {
    fixed: test.map((scenario) => runFixed(scenario, fixedTuning.level, RESPONSE)),
    rule: test.map((scenario) => runRule(scenario, ruleTuning.config, RESPONSE)),
    random: test.map((scenario) => runRandom(scenario, RESPONSE)),
  }
  const stressRows = {
    fixed: test.map((scenario) => runFixed(scenario, fixedTuning.level, STRESS_RESPONSE)),
    rule: test.map((scenario) => runRule(scenario, ruleTuning.config, STRESS_RESPONSE)),
    random: test.map((scenario) => runRandom(scenario, STRESS_RESPONSE)),
  }

  const modelReports = trainedModels.map((model) => {
    const rows = test.map((scenario) => runGreedy(model.policy, scenario, RESPONSE))
    const stress = test.map((scenario) => runGreedy(model.policy, scenario, STRESS_RESPONSE))
    return {
      algorithm: model.algorithm,
      seed: model.seed,
      alpha: model.alpha,
      validationMeanReturn: model.validation.meanReturn,
      bundled: bundled[model.algorithm].seed === model.seed,
      test: summarize(rows),
      byProfile: byProfile(test, rows),
      pairedVersusRule: mean(rows.map((row, index) => row.episodeReturn - testRows.rule[index].episodeReturn)),
      stress: summarize(stress),
      checkpoints: model.checkpoints,
      returns: model.returns,
    }
  })

  const exampleId = test[0].id
  const exampleScenario = test[0]
  const qBundle = bundled['q-learning']
  const sarsaBundle = bundled.sarsa
  const seconds = (Date.now() - started) / 1000
  log(`Study finished in ${seconds.toFixed(1)} s`)

  return {
    policies: {
      qLearning: qBundle.policy,
      sarsa: sarsaBundle.policy,
      all: trainedModels.map((model) => ({
        algorithm: model.algorithm,
        seed: model.seed,
        alpha: model.alpha,
        policy: model.policy,
      })),
    },
    summary: {
      smoke: config.smoke,
      scenarioVersion: SCENARIO_VERSION,
      familySeeds: FAMILY_SEEDS,
      protocol: {
        alphaChosenOn: 'validation',
        baselinesChosenOn: 'validation',
        reportedOn: 'test',
        bundledSeedRule: 'median validation return',
        returnDefinition: 'undiscounted sum of the 20 rewards',
      },
      probe,
      alphaSelection,
      chosenAlpha,
      fixed: { level: fixedTuning.level, validation: fixedTuning.results },
      rule: { config: ruleTuning.config, validation: ruleTuning.details },
      counts: {
        pilotScenarios: pilotScenarios.length,
        validationScenarios: validation.length,
        checkpointScenarios: checkpointScenarios.length,
        testScenarios: test.length,
      },
      models: modelReports.map(({ returns: _returns, ...report }) => report),
      trainingCurves: modelReports.map((model) => ({
        algorithm: model.algorithm,
        seed: model.seed,
        movingAverage: downsample(movingAverage(model.returns, Math.min(100, model.returns.length)), 1000),
      })),
      baselines: {
        fixed: { test: summarize(testRows.fixed), byProfile: byProfile(test, testRows.fixed), stress: summarize(stressRows.fixed) },
        rule: { test: summarize(testRows.rule), byProfile: byProfile(test, testRows.rule), stress: summarize(stressRows.rule) },
        random: { test: summarize(testRows.random), byProfile: byProfile(test, testRows.random), stress: summarize(stressRows.random) },
      },
      seedSpread: {
        'q-learning': spread(modelReports.filter((model) => model.algorithm === 'q-learning')),
        sarsa: spread(modelReports.filter((model) => model.algorithm === 'sarsa')),
      },
      heatmap: heatmap(qBundle.policy),
      example: {
        scenarioId: exampleId,
        profile: exampleScenario.profile,
        controllers: {
          'q-learning': traceOf(runGreedy(qBundle.policy, exampleScenario, RESPONSE)),
          sarsa: traceOf(runGreedy(sarsaBundle.policy, exampleScenario, RESPONSE)),
          fixed: traceOf(runFixed(exampleScenario, fixedTuning.level, RESPONSE)),
          rule: traceOf(runRule(exampleScenario, ruleTuning.config, RESPONSE)),
          random: traceOf(runRandom(exampleScenario, RESPONSE)),
        },
      },
      runtimeSeconds: seconds,
    },
  }
}

export type StudyOutput = ReturnType<typeof runStudy>

type AlphaRow = { algorithm: Algorithm; alpha: number } & MetricSummary

type TrainedModel = {
  algorithm: Algorithm
  seed: number
  alpha: number
  policy: TabularPolicy
  returns: number[]
  checkpoints: { episode: number; meanReturn: number }[]
  validation: MetricSummary
}

function tuneFixed(scenarios: Scenario[]): { level: Difficulty; results: { level: Difficulty; meanReturn: number }[] } {
  const results: { level: Difficulty; meanReturn: number }[] = []
  let bestLevel: Difficulty = 1
  let bestReturn = Number.NEGATIVE_INFINITY
  for (const level of [1, 2, 3, 4, 5] as const) {
    const meanReturn = mean(scenarios.map((scenario) => runFixed(scenario, level, RESPONSE).episodeReturn))
    results.push({ level, meanReturn })
    if (meanReturn > bestReturn) {
      bestReturn = meanReturn
      bestLevel = level
    }
  }
  return { level: bestLevel, results }
}

function tuneRule(scenarios: Scenario[], log: (message: string) => void): { config: RuleConfig; details: unknown[] } {
  const preferred: Difficulty[] = [2, 2, 2, 2]
  const up = [3, 3, 3, 3]
  const down = [2, 2, 2, 2]
  const details = []
  for (const ability of [0, 1, 2, 3] as const) {
    const subset = scenarios.filter((scenario) => scenario.profile === ability)
    let best = { meanReturn: Number.NEGATIVE_INFINITY, preferred: 2 as Difficulty, up: 3, down: 2 }
    for (const preferredLevel of [1, 2, 3, 4, 5] as const) {
      for (const upThreshold of [2, 3, 4]) {
        for (const downThreshold of [1, 2, 3]) {
          const config = ruleConfig(preferred, up, down, ability, preferredLevel, upThreshold, downThreshold)
          const meanReturn = mean(subset.map((scenario) => runRule(scenario, config, RESPONSE).episodeReturn))
          if (meanReturn > best.meanReturn) best = { meanReturn, preferred: preferredLevel, up: upThreshold, down: downThreshold }
        }
      }
    }
    preferred[ability] = best.preferred
    up[ability] = best.up
    down[ability] = best.down
    details.push({ ability, ...best })
    log(`Rule profile ${ability}: level ${best.preferred}, up ${best.up}, down ${best.down}`)
  }
  return {
    config: { preferred: asQuad(preferred), up: asQuad(up), down: asQuad(down) },
    details,
  }
}

function ruleConfig(
  preferred: Difficulty[],
  up: number[],
  down: number[],
  ability: Ability,
  preferredLevel: Difficulty,
  upThreshold: number,
  downThreshold: number,
): RuleConfig {
  const nextPreferred = [...preferred]
  const nextUp = [...up]
  const nextDown = [...down]
  nextPreferred[ability] = preferredLevel
  nextUp[ability] = upThreshold
  nextDown[ability] = downThreshold
  return { preferred: asQuad(nextPreferred), up: asQuad(nextUp), down: asQuad(nextDown) }
}

function asQuad<T>(values: T[]): readonly [T, T, T, T] {
  if (values.length !== 4) throw new Error('expected four profile values')
  return [values[0], values[1], values[2], values[3]]
}

function medianModel(models: TrainedModel[]): TrainedModel {
  const sorted = [...models].sort((a, b) => a.validation.meanReturn - b.validation.meanReturn || a.seed - b.seed)
  return sorted[Math.floor(sorted.length / 2)]
}

function byProfile(scenarios: Scenario[], rows: EpisodeMetrics[]): { profile: Ability; metrics: MetricSummary }[] {
  return [0, 1, 2, 3].map((profile) => ({
    profile: profile as Ability,
    metrics: summarize(rows.filter((_, index) => scenarios[index].profile === profile)),
  }))
}

function spread(models: { test: MetricSummary; seed: number }[]): { seeds: number[]; mean: number; sampleStandardDeviation: number } {
  const values = models.map((model) => model.test.meanReturn)
  return { seeds: models.map((model) => model.seed), mean: mean(values), sampleStandardDeviation: sampleSd(values) }
}

function heatmap(policy: TabularPolicy): unknown {
  const ties = mulberry32(99)
  return {
    slice: { ability: 1, strain: 1, wrongStreak: 0, answeredCount: 5 },
    rows: [1, 2, 3, 4, 5].map((difficulty) => {
      const state: GameState = {
        ability: 1,
        previousDifficulty: difficulty as Difficulty,
        strain: 1,
        wrongStreak: 0,
        answeredCount: 5,
      }
      const visits = stateVisits(policy, state)
      return {
        previousDifficulty: difficulty,
        visits,
        unvisited: visits === 0,
        q: [0, 1, 2].map((action) => qValue(policy, state, action as Action)),
        greedy: visits === 0 ? null : greedyAction(policy, state, ties),
      }
    }),
  }
}

function traceOf(row: EpisodeMetrics): { episodeReturn: number; steps: StepTrace[] } {
  return { episodeReturn: row.episodeReturn, steps: row.steps }
}

function assertDisjoint(groups: Scenario[][]): void {
  const seen = new Set<string>()
  for (const group of groups) {
    for (const scenario of group) {
      if (seen.has(scenario.id)) throw new Error(`scenario id repeated: ${scenario.id}`)
      seen.add(scenario.id)
    }
  }
}

function mean(values: number[]): number {
  if (values.length === 0) return Number.NaN
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function sampleSd(values: number[]): number {
  if (values.length < 2) return 0
  const center = mean(values)
  return Math.sqrt(values.reduce((sum, value) => sum + (value - center) ** 2, 0) / (values.length - 1))
}

export function movingAverage(values: number[], window: number): number[] {
  const output: number[] = []
  let sum = 0
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index]
    if (index >= window) sum -= values[index - window]
    output.push(sum / Math.min(index + 1, window))
  }
  return output
}

export function downsample(values: number[], maxPoints: number): { episode: number; value: number }[] {
  if (values.length <= maxPoints) return values.map((value, index) => ({ episode: index + 1, value }))
  const bucket = values.length / maxPoints
  const output: { episode: number; value: number }[] = []
  for (let index = 0; index < maxPoints; index += 1) {
    const start = Math.floor(index * bucket)
    const end = Math.max(start + 1, Math.floor((index + 1) * bucket))
    let sum = 0
    for (let cursor = start; cursor < end; cursor += 1) sum += values[cursor]
    output.push({ episode: end, value: sum / (end - start) })
  }
  return output
}
