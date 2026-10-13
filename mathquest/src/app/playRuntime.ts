import type { PlayRuntime } from './types'

export type PlayAvailability =
  | { status: 'loading' }
  | { status: 'unavailable'; title: string; detail: string }
  | { status: 'ready'; runtime: PlayRuntime }

export async function loadPlayRuntime(
  signal: AbortSignal,
): Promise<PlayAvailability> {
  try {
    const response = await fetch(
      `${import.meta.env?.BASE_URL ?? '/'}models/q-learning-default.json`,
      { signal, cache: 'no-cache' },
    )
    if (response.status === 404) return missingModel()
    if (!response.ok)
      throw new Error(`Model request failed (${response.status}).`)
    // Vite returns its HTML entry for missing public assets.
    const body = await response.text()
    if (body.trimStart().startsWith('<')) return missingModel()
    try {
      JSON.parse(body)
    } catch {
      return {
        status: 'unavailable',
        title: 'The saved model could not be read',
        detail:
          'The model file is not valid JSON. Play will wait for a valid saved model. You can still try the six starting questions.',
      }
    }
    // A1 has no artifact validator, frozen controller or response transition.
    // Presence alone must never be treated as a usable policy.
    return {
      status: 'unavailable',
      title: 'The game controller is not connected yet',
      detail:
        'A model file is present, but its validation and live-play core API are still pending. Play will open once that integration is ready.',
    }
  } catch (error) {
    if (signal.aborted) throw error
    return {
      status: 'unavailable',
      title: 'The saved model could not be loaded',
      detail:
        'Check your connection and try again. The six starting questions work without the model.',
    }
  }
}
function missingModel(): PlayAvailability {
  return {
    status: 'unavailable',
    title: 'The adventure is waiting for its saved model',
    detail:
      'The trained Q-learning model has not been included yet. Try the six starting questions now; the 20-stop adventure will open when the saved model and controller are ready.',
  }
}
