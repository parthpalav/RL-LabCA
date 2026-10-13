import { WORLDS, type Settings, type SessionSummary } from './types'

const SETTINGS_KEY = 'mathquest.settings.v1'
const SUMMARIES_KEY = 'mathquest.summaries.v1'
export const DEFAULT_SETTINGS: Settings = {
  nickname: '',
  world: 'garden',
  reducedMotion: false,
  remember: false,
}

export function readSettings(): Settings {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) ?? 'null',
    )
    if (!value || typeof value !== 'object') return DEFAULT_SETTINGS
    const data = value as Record<string, unknown>
    if (data.remember !== true) return DEFAULT_SETTINGS
    return {
      nickname:
        typeof data.nickname === 'string' ? data.nickname.slice(0, 24) : '',
      world: WORLDS.find((world) => world.id === data.world)?.id ?? 'garden',
      reducedMotion: data.reducedMotion === true,
      remember: true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}
export function saveSettings(settings: Settings): boolean {
  try {
    if (settings.remember)
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    else {
      localStorage.removeItem(SETTINGS_KEY)
      localStorage.removeItem(SUMMARIES_KEY)
    }
    return true
  } catch {
    return false
  }
}
export function saveSummary(summary: SessionSummary): boolean {
  try {
    const previous: unknown = JSON.parse(
      localStorage.getItem(SUMMARIES_KEY) ?? '[]',
    )
    const entries = Array.isArray(previous)
      ? previous.filter((item) => item && typeof item === 'object').slice(-9)
      : []
    localStorage.setItem(SUMMARIES_KEY, JSON.stringify([...entries, summary]))
    return true
  } catch {
    return false
  }
}
export function resetLocalData(): boolean {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    localStorage.removeItem(SUMMARIES_KEY)
    return true
  } catch {
    return false
  }
}
