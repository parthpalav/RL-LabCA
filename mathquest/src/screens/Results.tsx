import { profileById, type Ability } from '../core/index'
import type { AnswerRecord, SessionSummary } from '../app/types'
import type { ModelInfo } from '../app/types'
import { SessionAnalytics } from '../components/SessionAnalytics'
import { MathPrompt } from '../components/MathPrompt'
import { Orbit } from '../illustrations/Expedition'

export function Results({
  records,
  summary,
  ability,
  nickname,
  onAgain,
  onLab,
  notice,
  model,
}: {
  records: AnswerRecord[]
  summary: SessionSummary
  ability: Ability
  nickname: string
  onAgain: () => void
  onLab: () => void
  notice: string
  model?: ModelInfo
}) {
  const wrong = records.filter((record) => !record.correct)
  return (
    <section className="page-section results">
      <div className="result-title">
        <Orbit />
        <div>
          <p className="eyebrow">20 STOPS / ONE JOURNEY</p>
          <h1>Constellation complete{nickname ? `, ${nickname}` : ''}.</h1>
          <p>You kept exploring. Every stop belongs to your journey.</p>
        </div>
      </div>
      <div className="stat-grid">
        <div>
          <strong>
            {summary.correct}
            <small> / 20</small>
          </strong>
          <span>Correct answers</span>
        </div>
        <div>
          <strong>{summary.points}</strong>
          <span>Challenge points</span>
        </div>
        <div>
          <strong>{summary.longestWrongStreak}</strong>
          <span>Longest mistake streak</span>
        </div>
      </div>
      <p className="microcopy">
        Correct answers earn 10 × their level. Points are separate from the
        controller’s training reward.
      </p>
      <section className="timeline-section">
        <h2>Your challenge trail</h2>
        <p>
          Starting path: {profileById(ability).label}.
          {summary.finalAbility !== undefined &&
            summary.finalAbility !== ability &&
            ` As you played, the trail re-read your answers and moved you to ${profileById(summary.finalAbility).label}.`}{' '}
          Each column shows one question’s level.
        </p>
        <ol className="difficulty-timeline">
          {records.map((record, index) => (
            <li
              key={record.question.id}
              aria-label={`Question ${index + 1}, level ${record.question.level}, ${record.correct ? 'correct' : 'incorrect'}`}
            >
              <span
                className={`timeline-bar ${record.correct ? 'solved' : 'unsolved'}`}
                style={{ height: `${record.question.level * 22}px` }}
              >
                {record.question.level}
              </span>
              <span className="timeline-status" aria-hidden="true">
                {record.correct ? '✓' : '↺'}
              </span>
              <small>{index + 1}</small>
            </li>
          ))}
        </ol>
      </section>
      <SessionAnalytics
        answers={records.map((record) => ({
          level: record.question.level,
          correct: record.correct,
          audit: record.audit,
        }))}
        model={model}
      />
      <details className="review">
        <summary>Review {wrong.length} questions to explore again</summary>
        {wrong.length === 0 ? (
          <p>You found every answer on this trail.</p>
        ) : (
          wrong.map((record, index) => (
            <article key={record.question.id}>
              <h3>
                {index + 1}. <MathPrompt question={record.question} />
              </h3>
              <p>
                Your answer:{' '}
                {
                  record.question.options.find(
                    (option) => option.id === record.optionId,
                  )?.label
                }
              </p>
              <ol>
                {record.question.explanationSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </article>
          ))
        )}
      </details>
      <div className="actions">
        <button className="button primary" onClick={onAgain}>
          Play Again →
        </button>
        <button className="text-button" onClick={onLab}>
          How did the difficulty adapt?
        </button>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </section>
  )
}
