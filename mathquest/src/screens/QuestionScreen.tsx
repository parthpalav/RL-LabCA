import { useEffect, useRef } from 'react'
import type { QuestionOption } from '../core/index'
import type { AnswerFeedback, VisibleQuestion } from '../app/types'
import { MathPrompt } from '../components/MathPrompt'
import { Orbit } from '../illustrations/Expedition'

export function QuestionScreen({
  question,
  feedback,
  index,
  total,
  mode,
  world,
  points,
  paused,
  onAnswer,
  onNext,
  onPause,
}: {
  question: VisibleQuestion
  feedback: AnswerFeedback | null
  index: number
  total: number
  mode: 'calibration' | 'play'
  world: string
  points: number
  paused: boolean
  onAnswer: (id: QuestionOption['id'], responseMs: number) => void
  onNext: () => void
  onPause: () => void
}) {
  const locked = useRef(false)
  const started = useRef(performance.now())
  const pauseStarted = useRef<number | null>(null)
  const pausedTime = useRef(0)
  const feedbackRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (paused) pauseStarted.current = performance.now()
    else if (pauseStarted.current !== null) {
      pausedTime.current += performance.now() - pauseStarted.current
      pauseStarted.current = null
    }
  }, [paused])
  useEffect(() => {
    if (feedback) feedbackRef.current?.focus()
  }, [feedback])
  function answer(id: QuestionOption['id']) {
    if (locked.current || feedback || paused) return
    locked.current = true
    onAnswer(
      id,
      Math.max(0, performance.now() - started.current - pausedTime.current),
    )
  }
  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        paused
      )
        return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') || target.isContentEditable)
      )
        return
      if (event.key === 'Escape') {
        event.preventDefault()
        onPause()
      } else if (/^[1-4]$/.test(event.key) && !feedback) {
        event.preventDefault()
        answer(event.key as QuestionOption['id'])
      } else if (event.key === 'Enter' && feedback) {
        event.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return (
    <section className="question-page">
      <div className="session-header">
        <div>
          <p className="eyebrow">
            {mode === 'calibration'
              ? 'FINDING YOUR STARTING PATH'
              : world.toUpperCase()}
          </p>
          <h1>
            {mode === 'calibration'
              ? 'One small step at a time.'
              : 'Follow your curiosity.'}
          </h1>
        </div>
        <button className="button subtle" onClick={onPause}>
          Pause
        </button>
      </div>
      <div className="session-meta">
        <span>
          Question <strong>{index + 1}</strong> of {total}
        </span>
        <span className="level">◇ Level {question.level}</span>
        {mode === 'play' && (
          <span>
            <strong>{points}</strong> points
          </span>
        )}
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-label={
          mode === 'calibration'
            ? 'Starting questions answered'
            : 'Adventure questions answered'
        }
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={index + (feedback ? 1 : 0)}
      >
        <span
          style={{ width: `${((index + (feedback ? 1 : 0)) / total) * 100}%` }}
        />
      </div>
      <div className="question-layout">
        <div className="question-card">
          <p className="question-topic">{question.topic}</p>
          <h2 className="math-question">
            <MathPrompt question={question} />
          </h2>
          <div className="answer-grid" aria-label="Answer choices">
            {question.options.map((option) => {
              const correct =
                feedback !== null && option.id === feedback.correctId
              const wrong =
                feedback !== null &&
                !feedback.correct &&
                option.id === feedback.selectedId
              return (
                <button
                  key={option.id}
                  className={`answer ${correct ? 'answer-correct' : ''} ${wrong ? 'answer-wrong' : ''}`}
                  disabled={feedback !== null || paused}
                  onClick={() => answer(option.id)}
                  aria-label={`Choice ${option.id}: ${option.spoken}${correct ? ', correct answer' : wrong ? ', your answer, incorrect' : ''}`}
                >
                  <span className="answer-key">{option.id}</span>
                  <span>{option.label}</span>
                  {correct && (
                    <span className="answer-mark" aria-hidden="true">
                      ✓
                    </span>
                  )}
                  {wrong && (
                    <span className="answer-mark" aria-hidden="true">
                      ↺
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {feedback ? (
            <div
              ref={feedbackRef}
              tabIndex={-1}
              className={`feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`}
              role="status"
            >
              <h3>
                {feedback.correct
                  ? '✓ You found it!'
                  : '↺ A chance to explore the solution.'}
              </h3>
              <ol>
                {feedback.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              <button className="button primary" onClick={onNext}>
                {index + 1 === total
                  ? mode === 'calibration'
                    ? 'See my starting path'
                    : 'See my journey'
                  : 'Next question'}{' '}
                →
              </button>
            </div>
          ) : (
            <p className="question-hint">Choose one answer. There’s no rush.</p>
          )}
        </div>
        <aside className="guide-card">
          <Orbit encouraging={feedback !== null && !feedback.correct} />
          <p className="eyebrow">ORBIT / YOUR GUIDE</p>
          <p>
            {feedback
              ? feedback.correct
                ? 'A little discovery, one star at a time.'
                : 'Every answer is a step forward. Let’s look at this one together.'
              : mode === 'calibration'
                ? 'These six questions help choose where your adventure starts. They’re a guide, not a grade.'
                : 'The next challenge follows your answers. Take your time.'}
          </p>
          <span className="guide-dots" aria-hidden="true">
            ✧ · ✦ · ✧
          </span>
        </aside>
      </div>
      <p className="keyboard-help">
        1–4 to answer · Enter for Next · Esc to pause
      </p>
    </section>
  )
}
