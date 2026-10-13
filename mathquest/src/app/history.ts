import type { Ability, Difficulty, Question } from '../core/index'
import { WORLDS, type WorldId } from './types'

// Every journey's answers, kept in this browser's IndexedDB so a round can be
// reviewed and replayed through the controller later. Nothing leaves the device.
const DB_NAME = 'mathquest'
const DB_VERSION = 1
const STORE = 'journeys'
export const HISTORY_FORMAT = 'mathquest-history-v1'

export type StoredAnswer = {
  level: Difficulty
  topic: string
  prompt: string
  chosen: string
  answer: string
  correct: boolean
  responseMs: number
  ability: Ability | null
}

export type StoredJourney = {
  id: string
  startedAt: string
  updatedAt: string
  complete: boolean
  nickname: string
  world: WorldId
  calibration: StoredAnswer[]
  startAbility: Ability | null
  seed: number | null
  model: { algorithm: string; seed: number; timestamp: string } | null
  answers: StoredAnswer[]
  finalAbility: Ability | null
}

export function newJourney(nickname: string, world: WorldId): StoredJourney {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    startedAt: now,
    updatedAt: now,
    complete: false,
    nickname,
    world,
    calibration: [],
    startAbility: null,
    seed: null,
    model: null,
    answers: [],
    finalAbility: null,
  }
}

export function storedAnswer(
  question: Question,
  optionId: string,
  correct: boolean,
  responseMs: number,
  ability: Ability | null,
): StoredAnswer {
  const label = (id: string) =>
    question.options.find((option) => option.id === id)?.label ?? ''
  return {
    level: question.level,
    topic: question.topic,
    prompt: question.promptParts
      .map((part) =>
        part.kind === 'text'
          ? part.text
          : `${part.numerator}/${part.denominator}`,
      )
      .join(''),
    chosen: label(optionId),
    answer: label(question.correctOptionId),
    correct,
    responseMs: Math.round(responseMs),
    ability,
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode)
      const request = work(tx.objectStore(STORE))
      tx.oncomplete = () => resolve(request ? request.result : undefined)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function saveJourney(journey: StoredJourney): Promise<boolean> {
  try {
    await run('readwrite', (store) =>
      store.put({ ...journey, updatedAt: new Date().toISOString() }),
    )
    return true
  } catch {
    return false
  }
}

export async function listJourneys(): Promise<StoredJourney[] | null> {
  try {
    const all = (await run('readonly', (store) => store.getAll())) ?? []
    return (all as unknown[])
      .filter(isJourney)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  } catch {
    return null
  }
}

export async function deleteJourney(id: string): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.delete(id))
    return true
  } catch {
    return false
  }
}

export async function clearJourneys(): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.clear())
    return true
  } catch {
    return false
  }
}

export function exportJourneys(journeys: StoredJourney[]): string {
  return JSON.stringify(
    {
      format: HISTORY_FORMAT,
      exportedAt: new Date().toISOString(),
      journeys,
    },
    null,
    2,
  )
}

// Returns how many journeys were imported, or null if the file is not a
// MathQuest history export.
export async function importJourneys(text: string): Promise<number | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { format?: unknown }).format !== HISTORY_FORMAT ||
    !Array.isArray((parsed as { journeys?: unknown }).journeys)
  )
    return null
  const journeys = (parsed as { journeys: unknown[] }).journeys.filter(
    isJourney,
  )
  try {
    await run('readwrite', (store) => {
      for (const journey of journeys) store.put(journey)
    })
    return journeys.length
  } catch {
    return null
  }
}

function isAbility(value: unknown): value is Ability {
  return value === 0 || value === 1 || value === 2 || value === 3
}

function isAnswer(value: unknown): value is StoredAnswer {
  if (!value || typeof value !== 'object') return false
  const a = value as Record<string, unknown>
  return (
    typeof a.level === 'number' &&
    Number.isInteger(a.level) &&
    a.level >= 1 &&
    a.level <= 5 &&
    typeof a.topic === 'string' &&
    typeof a.prompt === 'string' &&
    typeof a.chosen === 'string' &&
    typeof a.answer === 'string' &&
    typeof a.correct === 'boolean' &&
    typeof a.responseMs === 'number' &&
    (a.ability === null || isAbility(a.ability))
  )
}

function isJourney(value: unknown): value is StoredJourney {
  if (!value || typeof value !== 'object') return false
  const j = value as Record<string, unknown>
  return (
    typeof j.id === 'string' &&
    typeof j.startedAt === 'string' &&
    typeof j.updatedAt === 'string' &&
    typeof j.complete === 'boolean' &&
    typeof j.nickname === 'string' &&
    WORLDS.some((world) => world.id === j.world) &&
    Array.isArray(j.calibration) &&
    j.calibration.every(isAnswer) &&
    Array.isArray(j.answers) &&
    j.answers.every(isAnswer) &&
    (j.startAbility === null || isAbility(j.startAbility)) &&
    (j.finalAbility === null || isAbility(j.finalAbility)) &&
    (j.seed === null ||
      (typeof j.seed === 'number' && Number.isInteger(j.seed))) &&
    (j.model === null || typeof j.model === 'object')
  )
}
