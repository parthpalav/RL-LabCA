import { maxValidQ, profileById, tdTarget, tdUpdate } from '../core/index'
import { ACTION_LABEL, decisionReason } from '../app/analytics'
import type {
  AnswerAudit,
  ModelInfo,
  PlayRuntime,
  PolicyDecision,
} from '../app/types'

export function DecisionDetails({
  decision,
  audit,
  model,
  runtime,
}: {
  decision: PolicyDecision
  audit?: AnswerAudit
  model?: ModelInfo | null
  runtime?: PlayRuntime | null
}) {
  const { state } = decision
  const selected = decision.values.find(
    (value) => value.action === decision.action,
  )!
  const nextMax =
    audit && runtime ? maxValidQ(runtime.policy, audit.next.state) : null
  const target =
    audit && nextMax !== null && model?.hyperparameters
      ? tdTarget(
          audit.reward.total,
          model.hyperparameters.gamma,
          nextMax,
          audit.terminated,
        )
      : null
  return (
    <div className="decision-details">
      <div className="decision-heading">
        <strong>
          {ACTION_LABEL[decision.action]} · Level {state.previousDifficulty} →{' '}
          {decision.difficulty}
        </strong>
        <span className={`source-pill ${decision.fallback ? 'fallback' : ''}`}>
          {decision.fallback ? 'Fallback rule' : 'Frozen Q-table'}
        </span>
      </div>
      <p>{decisionReason(decision)}</p>
      <dl className="state-grid">
        <div>
          <dt>State ID</dt>
          <dd>{decision.stateId}</dd>
        </div>
        <div>
          <dt>Ability</dt>
          <dd>
            {state.ability} · {profileById(state.ability).label}
          </dd>
        </div>
        <div>
          <dt>Previous level</dt>
          <dd>{state.previousDifficulty}</dd>
        </div>
        <div>
          <dt>Strain proxy</dt>
          <dd>{state.strain}</dd>
        </div>
        <div>
          <dt>Wrong streak</dt>
          <dd>
            {state.wrongStreak}
            {state.wrongStreak === 3 ? '+' : ''}
          </dd>
        </div>
        <div>
          <dt>Answered</dt>
          <dd>{state.answeredCount} / 20</dd>
        </div>
      </dl>
      <div className="table-scroll">
        <table className="analytics-table">
          <caption>Q-values for this decision</caption>
          <thead>
            <tr>
              <th>Action</th>
              <th>Q(s,a)</th>
              <th>Training visits</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {decision.values.map((value) => (
              <tr
                key={value.action}
                className={
                  value.action === decision.action ? 'selected-row' : ''
                }
              >
                <th scope="row">{ACTION_LABEL[value.action]}</th>
                <td>{value.value === null ? '—' : value.value.toFixed(4)}</td>
                <td>{value.visits.toLocaleString()}</td>
                <td>
                  {!value.valid
                    ? 'Masked at boundary'
                    : value.action === decision.action
                      ? '✓ Selected'
                      : value.visits === 0
                        ? 'Unvisited action'
                        : 'Valid'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {audit && (
        <>
          <div className="reward-equation">
            <strong>Observed reward: {audit.reward.total.toFixed(2)}</strong>
            <span>
              {audit.reward.answerReward.toFixed(2)} answer reward −{' '}
              {audit.reward.strainPenalty.toFixed(2)} strain −{' '}
              {audit.reward.repeatedFailurePenalty.toFixed(2)} repeated misses −{' '}
              {audit.reward.switchPenalty.toFixed(2)} switch
            </span>
          </div>
          <p className="microcopy">
            After this answer: estimated ability {audit.next.state.ability},
            level {audit.next.state.previousDifficulty}, strain{' '}
            {audit.next.state.strain}, wrong streak{' '}
            {audit.next.state.wrongStreak}, answered{' '}
            {audit.next.state.answeredCount}.{' '}
            {audit.terminated
              ? 'Terminal: no next action or bootstrap.'
              : 'The next decision reads this updated state.'}
          </p>
          <div
            className="posterior-grid"
            aria-label="Ability estimate after the answer"
          >
            {audit.next.belief.posterior.map((p, ability) => (
              <div key={ability}>
                <span>{profileById(ability as 0 | 1 | 2 | 3).label}</span>
                <strong>{(p * 100).toFixed(1)}%</strong>
              </div>
            ))}
          </div>
          <p className="microcopy">
            The ability tracker is a separate Bayesian heuristic using synthetic
            response likelihoods. Q-learning selects difficulty from its updated
            ability slot; this tracker does not update Q-values.
          </p>
        </>
      )}
      {target !== null &&
        audit &&
        model?.hyperparameters &&
        selected.value !== null && (
          <details className="training-example">
            <summary>If this were a training step</summary>
            <p>Read-only illustration. Play does not apply this update.</p>
            <code>
              target ={' '}
              {audit.terminated
                ? audit.reward.total.toFixed(4)
                : `${audit.reward.total.toFixed(4)} + ${model.hyperparameters.gamma} × ${nextMax!.toFixed(4)}`}{' '}
              = {target.toFixed(4)}
            </code>
            <code>
              Qnew = {selected.value.toFixed(4)} + {model.hyperparameters.alpha}{' '}
              × ({target.toFixed(4)} − {selected.value.toFixed(4)}) ={' '}
              {tdUpdate(
                selected.value,
                model.hyperparameters.alpha,
                target,
              ).toFixed(4)}
            </code>
            <p className="microcopy">
              This uses the live post-answer state, including tracking. Official
              training held ability fixed; this illustration is not a recorded
              historical training update.
            </p>
          </details>
        )}
      {model && (
        <p className="microcopy">
          {model.algorithm} · seed {model.seed} ·{' '}
          {model.episodes?.toLocaleString() ?? 'Unknown'} episodes ·{' '}
          {model.fingerprint
            ? `SHA-256 ${model.fingerprint.slice(0, 12)}…`
            : 'File fingerprint not recorded'}
          . Policy tie seed {decision.policySeed}. Play exploration ε = 0.
        </p>
      )}
    </div>
  )
}
