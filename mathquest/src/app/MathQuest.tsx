import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  abilityFromCalibration,
  CALIBRATION_LEVELS,
  EPISODE_LENGTH,
  generateQuestion,
  gradeQuestion,
  mixSeed,
  POLICY_STREAM,
  type Ability,
  profileById,
  type Question,
  type QuestionOption,
} from '../core/index'
import { Shell } from '../components/Shell'
import { Dialog } from '../components/Dialog'
import { Landing } from '../screens/Landing'
import { Setup } from '../screens/Setup'
import { QuestionScreen } from '../screens/QuestionScreen'
import { StartingPath } from '../screens/StartingPath'
import { Results } from '../screens/Results'
import { PendingMode } from '../screens/PendingMode'
import { History } from '../screens/History'
import {
  DEFAULT_SETTINGS,
  readSettings,
  resetLocalData,
  saveSettings,
  saveSummary,
} from './storage'
import { loadPlayRuntime, type PlayAvailability } from './playRuntime'
import {
  clearJourneys,
  newJourney,
  saveJourney,
  storedAnswer,
  type StoredJourney,
} from './history'
import { summarize } from './summary'
import {
  WORLDS,
  type AnswerFeedback,
  type AnswerRecord,
  type LiveState,
  type PlayRuntime,
  type SessionSummary,
} from './types'

// Charts load only when a replay is opened, keeping play's first load small.
const Replay = lazy(() =>
  import('../screens/Replay').then((module) => ({ default: module.Replay })),
)

type Screen =
  | 'landing'
  | 'setup'
  | 'round'
  | 'ready'
  | 'results'
  | 'profile'
  | 'train'
  | 'lab'
  | 'history'
  | 'replay'
type Round = {
  mode: 'calibration' | 'play'
  question: Question
  records: AnswerRecord[]
  feedback: AnswerFeedback | null
  state: LiveState | null
  runtime: PlayRuntime | null
  seed: number
  changeMessage: string
  abilityBefore: Ability | null
}
type Modal =
  | { kind: 'pause' }
  | { kind: 'leave'; destination: Screen }
  | { kind: 'reset' }
  | { kind: 'error'; message: string }

export function MathQuest() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [settings, setSettings] = useState(readSettings)
  const [availability, setAvailability] = useState<PlayAvailability>({
    status: 'loading',
  })
  const [retry, setRetry] = useState(0)
  const [round, setRound] = useState<Round | null>(null)
  const [ability, setAbility] = useState<Ability>(0)
  const [calibrationCorrect, setCalibrationCorrect] = useState(0)
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [modal, setModal] = useState<Modal | null>(null)
  const [notice, setNotice] = useState('')
  const [replayId, setReplayId] = useState<string | null>(null)
  const journey = useRef<StoredJourney | null>(null)
  const answerLocked = useRef(false)
  const advancing = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    setAvailability({ status: 'loading' })
    void loadPlayRuntime(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAvailability(result)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [retry])
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      settings.reducedMotion,
    )
  }, [settings.reducedMotion])
  useEffect(() => {
    document.getElementById('main')?.focus()
    window.scrollTo(0, 0)
  }, [screen])
  useEffect(() => {
    advancing.current = false
  }, [round?.question.id, screen])

  function persist(update: Partial<StoredJourney>) {
    if (!journey.current) return
    journey.current = { ...journey.current, ...update }
    void saveJourney(journey.current).then((saved) => {
      if (!saved)
        setNotice(
          'Your answers could not be saved on this device, so this journey will not appear in My Journeys.',
        )
    })
  }
  function navigate(destination: Screen) {
    if (screen === 'round' && round) setModal({ kind: 'leave', destination })
    else setScreen(destination)
  }
  function beginCalibration() {
    if (!saveSettings(settings))
      setNotice(
        'Device storage is unavailable. Your journey can still run in this tab.',
      )
    else setNotice('')
    answerLocked.current = false
    setSummary(null)
    journey.current = newJourney(settings.nickname.trim(), settings.world)
    setRound({
      mode: 'calibration',
      question: generateQuestion(CALIBRATION_LEVELS[0], 4100),
      records: [],
      feedback: null,
      state: null,
      runtime: null,
      seed: 4100,
      changeMessage: '',
      abilityBefore: null,
    })
    setScreen('round')
  }
  function beginPlay() {
    if (availability.status !== 'ready') return
    try {
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]
      const runtime = availability.runtime
      const state = runtime.initialState(ability)
      const level = runtime.chooseDifficulty(state, mixSeed(seed, POLICY_STREAM))
      answerLocked.current = false
      if (journey.current?.answers.length)
        journey.current = {
          ...journey.current,
          id: crypto.randomUUID(),
          startedAt: new Date().toISOString(),
          answers: [],
          complete: false,
          finalAbility: null,
        }
      persist({
        startAbility: ability,
        seed,
        model: runtime.model,
      })
      setRound({
        mode: 'play',
        question: generateQuestion(level, mixSeed(seed, 0)),
        records: [],
        feedback: null,
        state,
        runtime,
        seed,
        changeMessage: '',
        abilityBefore: null,
      })
      setScreen('round')
    } catch {
      setModal({
        kind: 'error',
        message:
          'The saved controller could not start this journey. Check the model again before playing.',
      })
    }
  }
  function answer(optionId: QuestionOption['id'], responseMs: number) {
    if (
      !round ||
      screen !== 'round' ||
      round.feedback ||
      modal ||
      answerLocked.current
    )
      return
    if (!round.question.options.some((option) => option.id === optionId)) return
    answerLocked.current = true
    const correct = gradeQuestion(round.question, optionId)
    let state = round.state
    try {
      if (round.mode === 'play' && round.runtime && state)
        state = round.runtime.observeAnswer(
          state,
          round.question.level,
          correct,
        )
    } catch {
      setModal({
        kind: 'error',
        message:
          'The saved controller could not update this journey. Please return home and check the model again.',
      })
      return
    }
    const saved = storedAnswer(
      round.question,
      optionId,
      correct,
      responseMs,
      state?.belief.ability ?? null,
    )
    if (journey.current)
      persist(
        round.mode === 'calibration'
          ? { calibration: [...journey.current.calibration, saved] }
          : { answers: [...journey.current.answers, saved] },
      )
    setRound({
      ...round,
      state,
      abilityBefore: round.state?.belief.ability ?? null,
      records: [
        ...round.records,
        { question: round.question, optionId, correct, responseMs },
      ],
      feedback: {
        correct,
        selectedId: optionId,
        correctId: round.question.correctOptionId,
        steps: round.question.explanationSteps,
      },
    })
  }
  function next() {
    if (!round?.feedback || screen !== 'round' || modal || advancing.current)
      return
    advancing.current = true
    const total =
      round.mode === 'calibration' ? CALIBRATION_LEVELS.length : EPISODE_LENGTH
    if (round.records.length === total) {
      if (round.mode === 'calibration') {
        const count = round.records.filter((record) => record.correct).length
        setCalibrationCorrect(count)
        setAbility(abilityFromCalibration(count))
        persist({ startAbility: abilityFromCalibration(count) })
        setScreen('ready')
      } else {
        const result = summarize(
          round.records,
          ability,
          settings.world,
          round.state?.belief.ability ?? ability,
        )
        setSummary(result)
        persist({ complete: true, finalAbility: result.finalAbility ?? null })
        if (settings.remember && !saveSummary(result))
          setNotice(
            'Your results are shown here, but could not be saved on this device.',
          )
        setScreen('results')
      }
      return
    }
    try {
      const index = round.records.length
      const level =
        round.mode === 'calibration'
          ? CALIBRATION_LEVELS[index]
          : round.runtime && round.state
            ? round.runtime.chooseDifficulty(
                round.state,
                mixSeed(round.seed, POLICY_STREAM + index),
              )
            : null
      if (level === null) throw new Error('No live controller')
      const question = generateQuestion(
        level,
        round.mode === 'calibration'
          ? 4100 + index
          : mixSeed(round.seed, index),
      )
      answerLocked.current = false
      setRound({
        ...round,
        question,
        feedback: null,
        changeMessage:
          round.mode === 'play' ? changeMessage(round, level) : '',
      })
    } catch {
      setModal({
        kind: 'error',
        message:
          'The next challenge could not be prepared. Please return home and check the model again.',
      })
    }
  }
  const world = WORLDS.find((item) => item.id === settings.world)!
  const index = round ? round.records.length - (round.feedback ? 1 : 0) : 0
  return (
    <Shell
      onHome={() => navigate('landing')}
      onLab={() => navigate('lab')}
      onHistory={() => navigate('history')}
    >
      {screen === 'landing' && (
        <Landing
          onStart={() => setScreen('setup')}
          onFutureMode={setScreen}
          availability={availability}
        />
      )}
      {screen === 'setup' && (
        <Setup
          settings={settings}
          onChange={setSettings}
          onStart={beginCalibration}
          onBack={() => setScreen('landing')}
          onReset={() => setModal({ kind: 'reset' })}
          notice={notice}
        />
      )}
      {screen === 'round' && round && (
        <>
          <p className="change-message" role="status">
            {round.changeMessage}
          </p>
          <QuestionScreen
            key={round.question.id}
            question={{
              id: round.question.id,
              level: round.question.level,
              topic: round.question.topic,
              promptParts: round.question.promptParts,
              options: round.question.options,
            }}
            feedback={round.feedback}
            index={index}
            total={
              round.mode === 'calibration'
                ? CALIBRATION_LEVELS.length
                : EPISODE_LENGTH
            }
            mode={round.mode}
            world={world.name}
            points={round.records.reduce(
              (sum, record) =>
                sum + (record.correct ? 10 * record.question.level : 0),
              0,
            )}
            paused={modal !== null}
            onAnswer={answer}
            onNext={next}
            onPause={() => setModal({ kind: 'pause' })}
          />
        </>
      )}
      {screen === 'ready' && (
        <StartingPath
          ability={ability}
          correct={calibrationCorrect}
          nickname={settings.nickname.trim()}
          availability={availability}
          onPlay={beginPlay}
          onRetry={() => setRetry((value) => value + 1)}
          onAgain={() => setScreen('setup')}
          onHome={() => setScreen('landing')}
        />
      )}
      {screen === 'results' && round && summary && (
        <Results
          records={round.records}
          summary={summary}
          ability={ability}
          nickname={settings.nickname.trim()}
          onAgain={() => setScreen('setup')}
          onLab={() => {
            setReplayId(journey.current?.id ?? null)
            setScreen('replay')
          }}
          notice={notice}
        />
      )}
      {screen === 'history' && (
        <History
          onReplay={(id) => {
            setReplayId(id)
            setScreen('replay')
          }}
          onBack={() => setScreen('landing')}
        />
      )}
      {screen === 'replay' && replayId && (
        <Suspense
          fallback={<p className="page-section microcopy">Loading replay…</p>}
        >
          <Replay
            id={replayId}
            runtime={
              availability.status === 'ready' ? availability.runtime : null
            }
            onBack={() => setScreen('history')}
          />
        </Suspense>
      )}
      {(screen === 'profile' || screen === 'train' || screen === 'lab') && (
        <PendingMode mode={screen} onBack={() => setScreen('landing')} />
      )}
      {modal && (
        <Dialog
          title={
            modal.kind === 'pause'
              ? 'A little pause.'
              : modal.kind === 'leave'
                ? 'Leave this journey?'
                : modal.kind === 'reset'
                  ? 'Reset Local Data?'
                  : 'This journey needs a check'
          }
          onClose={() => {
            if (modal.kind !== 'error') setModal(null)
          }}
        >
          {modal.kind === 'pause' && (
            <>
              <p>Your answers and place on the trail are safe in this tab.</p>
              <label className="modal-preference">
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(event) => {
                    const value = {
                      ...settings,
                      reducedMotion: event.target.checked,
                    }
                    setSettings(value)
                    if (!saveSettings(value))
                      setNotice(
                        'This setting could not be saved on this device.',
                      )
                  }}
                />{' '}
                Reduce motion
              </label>
              <div className="actions">
                <button
                  className="button primary"
                  autoFocus
                  onClick={() => setModal(null)}
                >
                  Resume
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setModal({ kind: 'leave', destination: 'landing' })
                  }
                >
                  Leave journey
                </button>
              </div>
            </>
          )}
          {modal.kind === 'leave' && (
            <>
              <p>
                This round will stop here. The answers you have already given
                stay in My Journeys on this device.
              </p>
              <div className="actions">
                <button
                  className="button primary"
                  autoFocus
                  onClick={() => setModal(null)}
                >
                  Keep exploring
                </button>
                <button
                  className="button subtle"
                  onClick={() => {
                    setRound(null)
                    setScreen(modal.destination)
                    setModal(null)
                  }}
                >
                  Leave journey
                </button>
              </div>
            </>
          )}
          {modal.kind === 'reset' && (
            <>
              <p>
                Remove MathQuest’s saved settings, summaries, and every saved
                journey from this device?
              </p>
              <div className="actions">
                <button
                  className="button primary"
                  autoFocus
                  onClick={() => setModal(null)}
                >
                  Keep my data
                </button>
                <button
                  className="button subtle"
                  onClick={() => {
                    void clearJourneys()
                    if (resetLocalData()) {
                      setSettings(DEFAULT_SETTINGS)
                      setNotice('MathQuest local data cleared.')
                    } else
                      setNotice(
                        'The browser could not clear local data. Please check your storage settings.',
                      )
                    setModal(null)
                  }}
                >
                  Reset Local Data
                </button>
              </div>
            </>
          )}
          {modal.kind === 'error' && (
            <>
              <p>{modal.message}</p>
              <button
                className="button primary"
                autoFocus
                onClick={() => {
                  setRound(null)
                  setModal(null)
                  setScreen('landing')
                  setRetry((value) => value + 1)
                }}
              >
                Return home
              </button>
            </>
          )}
        </Dialog>
      )}
    </Shell>
  )
}

function changeMessage(round: Round, level: number) {
  const now = round.state?.belief.ability
  if (
    now !== undefined &&
    round.abilityBefore !== null &&
    now !== round.abilityBefore
  )
    return now > round.abilityBefore
      ? `You’re climbing — your path is now ${profileById(now).label}.`
      : `Let’s steady the trail — your path is now ${profileById(now).label}.`
  return level > round.question.level
    ? 'A little more challenge.'
    : level < round.question.level
      ? 'Let’s build confidence.'
      : 'Stay on this path.'
}
