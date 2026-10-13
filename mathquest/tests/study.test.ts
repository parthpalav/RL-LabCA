import { describe, expect, it } from 'vitest'
import { RESPONSE } from '../src/core/config'
import { buildScenarios, runEpisode, runStudy, summarize } from '../src/core/study'
import { initialState } from '../src/core/stateCodec'

describe('scenario families', () => {
  it('keeps pilot, validation, checkpoint, and test ids apart', () => {
    const groups = (['pilot', 'validation', 'checkpoint', 'test'] as const).map((family) => buildScenarios(family, 3))
    const ids = groups.flat().map((scenario) => scenario.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const scenario of groups.flat()) expect(scenario.uniforms).toHaveLength(20)
  })
})

describe('episode metrics', () => {
  it('scores a maintained correct session and leaves an all-wrong solved difficulty empty', () => {
    const [scenario] = buildScenarios('pilot', 1)
    const correct = { ...scenario, uniforms: Array.from({ length: 20 }, () => 0) }
    const wrong = { ...scenario, id: 'wrong', uniforms: Array.from({ length: 20 }, () => 1) }
    const good = runEpisode(correct, RESPONSE, () => 1)
    const bad = runEpisode(wrong, RESPONSE, () => 1)
    expect(good.episodeReturn).toBeCloseTo(40)
    expect(good.switches).toBe(0)
    expect(good.meanSolvedDifficulty).toBe(2)
    expect(bad.correctRate).toBe(0)
    expect(bad.meanSolvedDifficulty).toBeNull()
    expect(bad.longestWrongStreak).toBe(20)
    expect(bad.repeatedFailureSteps).toBe(19)
    expect(summarize([bad]).episodesWithNoCorrect).toBe(1)
  })
})

describe('study pipeline', () => {
  it('selects alpha on validation and still reports a separate test split', () => {
    const result = runStudy({
      smoke: true,
      episodes: 12,
      pilotEpisodes: 4,
      pilotSeed: 7,
      seeds: [11],
      alphas: [0.1],
      validationPerProfile: 1,
      checkpointPerProfile: 1,
      testPerProfile: 1,
      pilotPerProfile: 1,
      checkpointInterval: 1000,
    })
    const summary = result.summary as {
      smoke: boolean
      chosenAlpha: { 'q-learning': number }
      counts: { validationScenarios: number; testScenarios: number }
      models: { seed: number }[]
    }
    expect(summary.smoke).toBe(true)
    expect(summary.chosenAlpha['q-learning']).toBe(0.1)
    expect(summary.counts.validationScenarios).toBe(4)
    expect(summary.counts.testScenarios).toBe(4)
    expect(summary.models[0].seed).toBe(11)
    expect(initialState(0).answeredCount).toBe(0)
  })
})
