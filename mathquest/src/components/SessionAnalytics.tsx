import { auditCsv, sessionMetrics, type AuditedAnswer } from '../app/analytics'
import { downloadText } from '../app/download'
import type { ModelInfo } from '../app/types'

export function SessionAnalytics({
  answers,
  model,
  exportName = 'mathquest-round',
}: {
  answers: readonly AuditedAnswer[]
  model?: ModelInfo | null
  exportName?: string
}) {
  const metrics = sessionMetrics(answers)
  return (
    <section className="session-analytics">
      <h2>Evidence from this round</h2>
      <p>
        Actual answers and controller snapshots captured during play.{' '}
        {metrics.audited} of {metrics.answered} decisions have a recorded audit.
      </p>
      <div className="analytics-stats">
        <div>
          <strong>{metrics.points}</strong>
          <span>Game points</span>
        </div>
        <div>
          <strong>
            {metrics.audited ? metrics.totals.total.toFixed(2) : '—'}
          </strong>
          <span>Recorded RL return</span>
        </div>
        <div>
          <strong>
            {metrics.raises} / {metrics.holds} / {metrics.eases}
          </strong>
          <span>Raise / hold / ease</span>
        </div>
        <div>
          <strong>
            {metrics.fallbacks} / {metrics.audited}
          </strong>
          <span>Fallback decisions</span>
        </div>
      </div>
      <p className="microcopy">
        Mean attempted level {metrics.attemptedMean?.toFixed(2) ?? '—'} · mean
        correctly solved level {metrics.solvedMean?.toFixed(2) ?? 'N/A'} ·
        correct rate{' '}
        {metrics.correctRate === null
          ? '—'
          : `${(metrics.correctRate * 100).toFixed(1)}%`}
        . Actions include the first move from the level-2 reset.{' '}
        {metrics.unvisitedSelections > 0 &&
          `${metrics.unvisitedSelections} Q-table selections used an unvisited action.`}
      </p>
      <div className="reward-equation">
        <strong>RL return decomposition</strong>
        <span>
          {metrics.totals.answerReward.toFixed(2)} answer reward −{' '}
          {metrics.totals.strainPenalty.toFixed(2)} strain −{' '}
          {metrics.totals.repeatedFailurePenalty.toFixed(2)} repeated misses −{' '}
          {metrics.totals.switchPenalty.toFixed(2)} switching ={' '}
          {metrics.totals.total.toFixed(2)}
        </span>
      </div>
      <p className="microcopy">
        Game points and RL reward measure different things. Each correct answer
        earns 10 × level; the controller learns discounted future reward with
        failure penalties. The reported round return is the undiscounted sum of
        observed rewards.{' '}
        {metrics.audited < metrics.answered &&
          'Missing historical snapshots are excluded from the recorded reward total.'}
      </p>
      <div className="actions">
        <button
          className="button subtle"
          onClick={() =>
            downloadText(`${exportName}.csv`, auditCsv(answers), 'text/csv')
          }
        >
          Export decision CSV
        </button>
        <button
          className="button subtle"
          onClick={() =>
            downloadText(
              `${exportName}.json`,
              JSON.stringify(
                {
                  format: 'mathquest-decision-audit-v1',
                  exportedAt: new Date().toISOString(),
                  source: 'recorded-live-play',
                  model,
                  metrics,
                  answers,
                },
                null,
                2,
              ),
            )
          }
        >
          Export audit JSON
        </button>
      </div>
    </section>
  )
}
