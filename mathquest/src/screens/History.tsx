import { useEffect, useRef, useState } from 'react'
import { profileById } from '../core/index'
import {
  clearJourneys,
  deleteJourney,
  exportJourneys,
  importJourneys,
  listJourneys,
  type StoredJourney,
} from '../app/history'
import { WORLDS } from '../app/types'

export function History({
  onReplay,
  onBack,
}: {
  onReplay: (id: string) => void
  onBack: () => void
}) {
  const [journeys, setJourneys] = useState<StoredJourney[] | null | 'loading'>(
    'loading',
  )
  const [message, setMessage] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  async function refresh() {
    setJourneys(await listJourneys())
  }
  useEffect(() => {
    void refresh()
  }, [])

  function download() {
    if (!Array.isArray(journeys)) return
    const url = URL.createObjectURL(
      new Blob([exportJourneys(journeys)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `mathquest-journeys-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  async function upload(selected: File | undefined) {
    if (!selected) return
    const count = await importJourneys(await selected.text())
    setMessage(
      count === null
        ? 'That file is not a MathQuest journeys export.'
        : `Imported ${count} ${count === 1 ? 'journey' : 'journeys'}.`,
    )
    if (file.current) file.current.value = ''
    await refresh()
  }

  return (
    <section className="page-section history">
      <button className="text-button back" onClick={onBack}>
        ← Back to the stars
      </button>
      <p className="eyebrow">SAVED ON THIS DEVICE</p>
      <h1>My Journeys</h1>
      <p className="intro">
        Every answer is kept here, so you can replay a journey and see how
        each one moved the trail.
      </p>
      <div className="history-tools">
        <button
          className="button subtle"
          onClick={download}
          disabled={!Array.isArray(journeys) || journeys.length === 0}
        >
          Export JSON
        </button>
        <label className="button subtle file-button">
          Import JSON
          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        {Array.isArray(journeys) &&
          journeys.length > 0 &&
          (confirmClear ? (
            <span className="confirm-inline">
              Delete every journey?{' '}
              <button
                className="text-button danger"
                onClick={async () => {
                  setConfirmClear(false)
                  setMessage(
                    (await clearJourneys())
                      ? 'All journeys deleted.'
                      : 'The browser could not delete the journeys.',
                  )
                  await refresh()
                }}
              >
                Delete all
              </button>{' '}
              <button
                className="text-button"
                onClick={() => setConfirmClear(false)}
              >
                Keep them
              </button>
            </span>
          ) : (
            <button
              className="text-button"
              onClick={() => setConfirmClear(true)}
            >
              Delete all…
            </button>
          ))}
      </div>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {journeys === 'loading' && <p className="microcopy">Loading…</p>}
      {journeys === null && (
        <p className="notice">
          This browser is not letting MathQuest store data, so there are no
          saved journeys. Private windows often block storage.
        </p>
      )}
      {Array.isArray(journeys) && journeys.length === 0 && (
        <p className="microcopy">
          No journeys yet. Finish the six starting questions and they will
          appear here.
        </p>
      )}
      {Array.isArray(journeys) && journeys.length > 0 && (
        <ul className="journey-list">
          {journeys.map((journey) => {
            const correct = journey.answers.filter((a) => a.correct).length
            const world = WORLDS.find((item) => item.id === journey.world)
            return (
              <li key={journey.id} className="journey-card">
                <div>
                  <strong>
                    {new Date(journey.startedAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                  <span className={`badge ${journey.complete ? 'done' : ''}`}>
                    {journey.complete
                      ? 'Complete'
                      : journey.answers.length
                        ? `Stopped at ${journey.answers.length} / 20`
                        : 'Starting questions only'}
                  </span>
                </div>
                <p>
                  {journey.nickname || 'Explorer'} · {world?.name}
                  {journey.answers.length > 0 &&
                    ` · ${correct} / ${journey.answers.length} correct`}
                </p>
                <p className="microcopy">
                  {journey.startAbility === null
                    ? 'No starting path yet.'
                    : `Started on ${profileById(journey.startAbility).label}`}
                  {journey.finalAbility !== null &&
                    journey.finalAbility !== journey.startAbility &&
                    ` → ended on ${profileById(journey.finalAbility).label}`}
                </p>
                <div className="actions">
                  <button
                    className="button primary"
                    onClick={() => onReplay(journey.id)}
                  >
                    Replay
                  </button>
                  <button
                    className="text-button"
                    onClick={async () => {
                      await deleteJourney(journey.id)
                      await refresh()
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
