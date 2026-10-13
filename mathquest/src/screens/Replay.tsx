import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  expectedAbility,
  PROFILES,
  profileById,
  replayRound,
  type Action,
  type ReplayStep,
} from '../core/index'
import { listJourneys, type StoredJourney } from '../app/history'
import type { PlayRuntime } from '../app/types'

// Validated with the dataviz palette checker against the #1c2549 surface.
const SERIES = {
  played: '#14a37f',
  whatIf: '#d97706',
  fixed: '#8b5cf6',
} as const
const ACTION_LABEL: Record<Action, string> = {
  0: 'Easier',
  1: 'Same',
  2: 'Harder',
}
const SHORT_PATH = ['Starting', 'Building', 'Comfortable', 'Challenge']

export function Replay({
  id,
  runtime,
  onBack,
}: {
  id: string
  runtime: PlayRuntime | null
  onBack: () => void
}) {
  const [journey, setJourney] = useState<StoredJourney | null | 'loading'>(
    'loading',
  )
  const [flips, setFlips] = useState<ReadonlySet<number>>(new Set())
  const [showFixed, setShowFixed] = useState(false)

  useEffect(() => {
    void listJourneys().then((all) =>
      setJourney(all?.find((item) => item.id === id) ?? null),
    )
  }, [id])

  const replay = useMemo(() => {
    if (
      !runtime ||
      journey === 'loading' ||
      !journey ||
      journey.seed === null ||
      journey.startAbility === null ||
      journey.answers.length === 0
    )
      return null
    const answers = journey.answers.map((answer) => answer.correct)
    const run = (values: boolean[], track = true) =>
      replayRound(
        runtime.policy,
        journey.startAbility!,
        values,
        journey.seed!,
        { track },
      )
    const played = run(answers)
    return {
      played,
      matches: played.every(
        (step, i) => step.difficulty === journey.answers[i].level,
      ),
      whatIf: flips.size
        ? run(answers.map((correct, i) => (flips.has(i) ? !correct : correct)))
        : null,
      fixed: showFixed ? run(answers, false) : null,
    }
  }, [runtime, journey, flips, showFixed])

  if (journey === 'loading')
    return (
      <section className="page-section">
        <p className="microcopy">Loading journey…</p>
      </section>
    )
  if (!journey)
    return (
      <section className="page-section">
        <button className="text-button back" onClick={onBack}>
          ← My Journeys
        </button>
        <h1>Journey not found</h1>
        <p className="intro">
          It may have been deleted, or this browser is not storing data.
        </p>
      </section>
    )

  const chartData = journey.answers.map((answer, i) => ({
    question: i + 1,
    played: answer.level,
    whatIf: replay?.whatIf?.[i].difficulty,
    fixed: replay?.fixed?.[i].difficulty,
    playedAbility: replay
      ? round2(expectedAbility(replay.played[i].beliefAfter))
      : undefined,
    whatIfAbility: replay?.whatIf
      ? round2(expectedAbility(replay.whatIf[i].beliefAfter))
      : undefined,
  }))
  const total = (steps: ReplayStep[] | null | undefined) =>
    steps ? steps.reduce((sum, step) => sum + step.reward.total, 0) : 0
  const sameModel =
    runtime && journey.model
      ? runtime.model.timestamp === journey.model.timestamp
      : false

  return (
    <section className="page-section replay">
      <button className="text-button back" onClick={onBack}>
        ← My Journeys
      </button>
      <p className="eyebrow">REPLAY</p>
      <h1>How the trail adapted</h1>
      <p className="intro">
        {journey.nickname || 'Explorer'} ·{' '}
        {new Date(journey.startedAt).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
        {journey.startAbility !== null &&
          ` · Started on ${profileById(journey.startAbility).label}`}
        {journey.finalAbility !== null &&
          ` · Ended on ${profileById(journey.finalAbility).label}`}
      </p>

      <details className="review">
        <summary>
          Starting questions: {journey.calibration.filter((a) => a.correct).length}{' '}
          / {journey.calibration.length} correct
        </summary>
        <ol className="calibration-list">
          {journey.calibration.map((answer, i) => (
            <li key={i}>
              <span>{answer.correct ? '✓' : '✗'}</span> Level {answer.level} ·{' '}
              {answer.prompt} — you chose {answer.chosen}
              {!answer.correct && ` (answer ${answer.answer})`}
            </li>
          ))}
        </ol>
        <p className="microcopy">
          The number correct sets the starting path. From then on, every
          answer updates it.
        </p>
      </details>

      {journey.answers.length === 0 ? (
        <p className="microcopy">
          This journey stopped before the 20-stop trail began.
        </p>
      ) : (
        <>
          {!runtime && (
            <p className="notice">
              The saved model is not loaded, so the controller’s reasoning
              and what-if replays are unavailable. Your answers are shown
              below.
            </p>
          )}
          {replay && (
            <p className={`notice ${replay.matches ? 'verified' : ''}`}>
              {replay.matches
                ? '✓ Replaying your answers through the saved controller reproduces exactly the levels you were given.'
                : sameModel
                  ? 'The replay differs from what you played. This journey was saved by an older version of the game.'
                  : 'This journey was played with a different saved model, so the replay below shows what the current model would do.'}
            </p>
          )}

          <div className="replay-controls">
            <label>
              <input
                type="checkbox"
                checked={showFixed}
                disabled={!replay}
                onChange={(event) => setShowFixed(event.target.checked)}
              />{' '}
              Compare with no live tracking (path fixed after the starting
              questions)
            </label>
            {flips.size > 0 && (
              <button
                className="text-button"
                onClick={() => setFlips(new Set())}
              >
                Clear {flips.size} what-if{' '}
                {flips.size === 1 ? 'change' : 'changes'}
              </button>
            )}
          </div>
          {replay && (
            <p className="microcopy">
              Flip any answer below to see the path the controller would have
              taken. Later answers are kept as they were. Controller reward:
              played {total(replay.played).toFixed(1)}
              {replay.whatIf && ` · what-if ${total(replay.whatIf).toFixed(1)}`}
              {replay.fixed &&
                ` · no tracking ${total(replay.fixed).toFixed(1)}`}
              .
            </p>
          )}

          <div className="replay-charts">
            <figure>
              <figcaption>Level of each question</figcaption>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, bottom: 4, left: -18 }}
                >
                  <CartesianGrid stroke="#2d3553" vertical={false} />
                  <XAxis
                    dataKey="question"
                    stroke="#bac4df"
                    tickLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    stroke="#bac4df"
                    tickLine={false}
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelFormatter={(q) => `Question ${q}`}
                  />
                  {(replay?.whatIf || replay?.fixed) && (
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  )}
                  <Line
                    name="Played"
                    dataKey="played"
                    stroke={SERIES.played}
                    strokeWidth={2}
                    dot={(props) => (
                      <AnswerDot
                        key={props.index}
                        {...props}
                        correct={journey.answers[props.index]?.correct}
                      />
                    )}
                    isAnimationActive={false}
                  />
                  {replay?.whatIf && (
                    <Line
                      name="What-if"
                      dataKey="whatIf"
                      stroke={SERIES.whatIf}
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {replay?.fixed && (
                    <Line
                      name="No tracking"
                      dataKey="fixed"
                      stroke={SERIES.fixed}
                      strokeWidth={2}
                      strokeDasharray="2 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <p className="microcopy">
                Filled dots were answered correctly; hollow dots were missed.
              </p>
            </figure>
            {replay && (
              <figure>
                <figcaption>Estimated path after each answer</figcaption>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 12, bottom: 4, left: 18 }}
                  >
                    <CartesianGrid stroke="#2d3553" vertical={false} />
                    <XAxis
                      dataKey="question"
                      stroke="#bac4df"
                      tickLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      domain={[0, 3]}
                      ticks={[0, 1, 2, 3]}
                      tickFormatter={(v: number) => SHORT_PATH[v] ?? ''}
                      stroke="#bac4df"
                      tickLine={false}
                      fontSize={11}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(q) => `After question ${q}`}
                    />
                    {replay.whatIf && (
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    )}
                    <Line
                      name="Played"
                      dataKey="playedAbility"
                      stroke={SERIES.played}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                    {replay.whatIf && (
                      <Line
                        name="What-if"
                        dataKey="whatIfAbility"
                        stroke={SERIES.whatIf}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        isAnimationActive={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <p className="microcopy">
                  The expected path from the controller’s belief, between
                  Starting out (0) and Ready for a challenge (3).
                </p>
              </figure>
            )}
          </div>

          <ol className="step-list">
            {journey.answers.map((answer, i) => {
              const step = replay?.played[i]
              const alt = replay?.whatIf?.[i]
              const flipped = flips.has(i)
              return (
                <li
                  key={i}
                  className={`step-card ${answer.correct ? 'solved' : 'unsolved'}`}
                >
                  <header>
                    <strong>
                      {i + 1}. Level {answer.level}
                    </strong>
                    <span>{answer.topic}</span>
                    <span>{(answer.responseMs / 1000).toFixed(1)} s</span>
                  </header>
                  <p className="step-prompt">{answer.prompt}</p>
                  <p>
                    {answer.correct ? '✓' : '✗'} You chose {answer.chosen}
                    {!answer.correct && ` · answer ${answer.answer}`}
                  </p>
                  {step && (
                    <>
                      <p className="microcopy">
                        Controller saw: path{' '}
                        {profileById(step.state.ability).label}, last level{' '}
                        {step.state.previousDifficulty}, strain{' '}
                        {step.state.strain}, {step.state.wrongStreak} missed
                        in a row.
                        {step.fallback &&
                          ' This exact situation never came up in training, so it used the safe rule.'}
                      </p>
                      <div className="q-values" aria-label="Controller values">
                        {step.qValues.map(({ action, value }) => (
                          <span
                            key={action}
                            className={action === step.action ? 'chosen' : ''}
                          >
                            {ACTION_LABEL[action]} {value.toFixed(2)}
                          </span>
                        ))}
                      </div>
                      <Belief
                        before={step.belief.ability}
                        posterior={step.beliefAfter.posterior}
                        after={step.beliefAfter.ability}
                      />
                      {alt && alt.difficulty !== step.difficulty && (
                        <p className="what-if-note">
                          What-if: this question would have been level{' '}
                          {alt.difficulty}.
                        </p>
                      )}
                      <button
                        className={`text-button flip ${flipped ? 'active' : ''}`}
                        aria-pressed={flipped}
                        onClick={() => {
                          const next = new Set(flips)
                          if (flipped) next.delete(i)
                          else next.add(i)
                          setFlips(next)
                        }}
                      >
                        {flipped
                          ? `Undo what-if (${answer.correct ? 'missed' : 'correct'})`
                          : `What if this was ${answer.correct ? 'missed' : 'correct'}?`}
                      </button>
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}

const TOOLTIP_STYLE = {
  background: '#10162f',
  border: '1px solid #3c4769',
  borderRadius: 8,
  color: '#fffaf0',
  fontSize: 13,
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function AnswerDot({
  cx,
  cy,
  correct,
}: {
  cx?: number
  cy?: number
  correct?: boolean
}) {
  if (cx === undefined || cy === undefined) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      stroke={SERIES.played}
      strokeWidth={2}
      fill={correct ? SERIES.played : '#1c2549'}
    />
  )
}

function Belief({
  before,
  after,
  posterior,
}: {
  before: number
  after: number
  posterior: number[]
}) {
  return (
    <div className="belief">
      <p className="microcopy">
        {after === before
          ? `Path stays ${PROFILES[after].label}.`
          : `Path moves ${after > before ? 'up' : 'down'} to ${PROFILES[after].label}.`}
      </p>
      <div className="belief-bars">
        {posterior.map((p, a) => (
          <span key={a} title={`${PROFILES[a].label}: ${Math.round(p * 100)}%`}>
            <i style={{ height: `${Math.max(2, p * 100)}%` }} />
            <small>
              {SHORT_PATH[a]} {Math.round(p * 100)}%
            </small>
          </span>
        ))}
      </div>
    </div>
  )
}
