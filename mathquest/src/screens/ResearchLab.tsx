import { useEffect, useMemo, useRef, useState } from 'react'
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
  GENERATOR_VERSION,
  PROFILES,
  REWARD,
  RESPONSE,
  initialState,
  priorBelief,
  replayRound,
  type Ability,
  type Difficulty,
  type GameState,
} from '../core/index'
import type { PlayAvailability } from '../app/playRuntime'
import type { StoredJourney } from '../app/history'
import { listJourneys } from '../app/history'
import {
  ACTION_LABEL,
  auditFromReplay,
  simulatorDiagnostic,
} from '../app/analytics'
import { comparisonRows, evidence, evidenceFiles } from '../app/evidence'
import { downloadSvg, downloadText } from '../app/download'
import { DecisionDetails } from '../components/DecisionDetails'
import type { PlayRuntime } from '../app/types'

const COLORS = ['#6ee7b7', '#b49bff', '#fbbf24']
const CHART_TOOLTIP = {
  background: '#10162f',
  border: '1px solid #596487',
  borderRadius: 8,
  color: '#fffaf0',
}
type Tab = 'overview' | 'check' | 'policy' | 'experiments'

export function ResearchLab({
  availability,
  onBack,
  onJourney,
  currentJourney,
}: {
  availability: PlayAvailability
  onBack: () => void
  onJourney: (id: string) => void
  currentJourney: StoredJourney | null
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [recent, setRecent] = useState<StoredJourney | null>(currentJourney)
  useEffect(() => {
    if (currentJourney) setRecent(currentJourney)
    else
      void listJourneys().then((items) =>
        setRecent(items?.find((item) => item.answers.length > 0) ?? null),
      )
  }, [currentJourney])
  const runtime = availability.status === 'ready' ? availability.runtime : null
  return (
    <section className="page-section research-lab">
      <button className="text-button back" onClick={onBack}>
        ← Back to MathQuest
      </button>
      <p className="eyebrow">THE DIFFICULTY CONTROLLER / FACULTY VIEW</p>
      <h1>See the decision, not just the score.</h1>
      <p className="intro">
        Inspect the frozen Q-learning table, the actual reward objective, and
        the measured experiment evidence. Every chart names its source.
      </p>
      <nav className="lab-tabs" aria-label="Research Lab sections">
        {(
          [
            ['overview', 'Model & scoring'],
            ['check', 'Controller check'],
            ['policy', 'Policy inspector'],
            ['experiments', 'Training & comparisons'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {!runtime && (
        <div className="empty-state" role="status">
          <h2>
            {availability.status === 'loading'
              ? 'Loading the saved model…'
              : availability.title}
          </h2>
          <p>
            Policy inspection and controller checks require the validated model.
            Bundled experiment evidence is available independently.
          </p>
        </div>
      )}
      {tab === 'overview' && (
        <>
          {runtime && <ModelOverview runtime={runtime} />}
          {recent && (
            <div className="lab-callout">
              <h2>Inspect your played round</h2>
              <p>
                {recent.answers.length} answers ·{' '}
                {recent.complete ? 'completed' : 'partial'}. New rounds preserve
                the exact decision and reward at answer lock, even if the model
                changes later.
              </p>
              <button
                className="button primary"
                onClick={() => onJourney(recent.id)}
              >
                Open recorded decisions →
              </button>
            </div>
          )}
          <ScoringExplanation />
          <div className="lab-callout">
            <h2>Why correct answers may stay at a moderate level</h2>
            <p>
              Play updates the state and the ability estimate; it does not
              retrain the table. A correct-answer streak is not a command to
              raise difficulty. The agent chooses the valid action with the
              largest learned Q-value, which includes future failure risk and
              the remaining question count.
            </p>
            <p>
              In the current simulator, the strongest profile has about{' '}
              {(simulatorDiagnostic(3, 0)[2].probability * 100).toFixed(0)}%
              success at level 3,{' '}
              {(simulatorDiagnostic(3, 0)[3].probability * 100).toFixed(0)}% at
              level 4, and{' '}
              {(simulatorDiagnostic(3, 0)[4].probability * 100).toFixed(0)}% at
              level 5. Reaching the highest profile therefore does not guarantee
              reaching level 5.
            </p>
            <button className="text-button" onClick={() => setTab('check')}>
              Run the all-correct controller check →
            </button>
          </div>
        </>
      )}
      {tab === 'check' && runtime && <ControllerCheck runtime={runtime} />}
      {tab === 'policy' && runtime && <PolicyInspector runtime={runtime} />}
      {tab === 'experiments' && <ExperimentEvidence />}
    </section>
  )
}

function ModelOverview({ runtime }: { runtime: PlayRuntime }) {
  const { model } = runtime
  const updatesMatch =
    model.episodes !== undefined &&
    model.trainingUpdates === model.episodes * 20
  return (
    <section className="lab-panel">
      <div className="panel-heading">
        <h2>Loaded Play model</h2>
        <span className="source-pill">
          Frozen · ε = 0 · no online Q updates
        </span>
      </div>
      <div className="analytics-stats">
        <div>
          <strong>{model.episodes?.toLocaleString() ?? '—'}</strong>
          <span>Training episodes per model</span>
        </div>
        <div>
          <strong>{model.trainingUpdates?.toLocaleString() ?? '—'}</strong>
          <span>Stored state-action updates</span>
        </div>
        <div>
          <strong>{model.seed}</strong>
          <span>Bundled training seed</span>
        </div>
        <div>
          <strong>{model.visitedStates?.toLocaleString() ?? '—'}</strong>
          <span>States with training visits</span>
        </div>
      </div>
      <p className="microcopy">
        {updatesMatch
          ? '✓ Visit counts sum to episodes × 20.'
          : 'Episode metadata and visit totals do not reconcile.'}{' '}
        The allocated state table includes unreachable and terminal
        combinations, so allocated-table coverage is not the live fallback rate.
      </p>
      <dl className="model-metadata">
        <div>
          <dt>Algorithm / selection</dt>
          <dd>{model.algorithm} / median validation seed</dd>
        </div>
        <div>
          <dt>α / γ</dt>
          <dd>
            {model.hyperparameters?.alpha} / {model.hyperparameters?.gamma}
          </dd>
        </div>
        <div>
          <dt>Trained at</dt>
          <dd>{model.timestamp}</dd>
        </div>
        <div>
          <dt>State schema</dt>
          <dd>{model.stateSchema}</dd>
        </div>
        <div>
          <dt>Reward / simulator</dt>
          <dd>
            {model.rewardVersion} / {model.simulatorVersion}
          </dd>
        </div>
        <div>
          <dt>Question generator</dt>
          <dd>
            Artifact: {model.generatorVersion}; game: {GENERATOR_VERSION}
          </dd>
        </div>
        <div className="full-width">
          <dt>Exact file SHA-256</dt>
          <dd>{model.fingerprint ?? 'Unavailable in this browser'}</dd>
        </div>
      </dl>
      {model.generatorVersion !== GENERATOR_VERSION && (
        <p className="notice">
          The question generator changed after training. Training sampled
          correctness from {model.simulatorVersion}; it did not grade generated
          questions. These probabilities are synthetic assumptions and are not
          validated difficulty estimates for the current questions.
        </p>
      )}
      <p>
        The ability tracker re-estimates the profile after every live answer. It
        is a separate Bayesian heuristic. The Q-table remains the difficulty
        controller; the official experiments below held profiles fixed.
      </p>
    </section>
  )
}

function ScoringExplanation() {
  return (
    <section className="lab-panel">
      <h2>Two scores, two purposes</h2>
      <div className="score-columns">
        <article>
          <h3>Game points</h3>
          <code>correct ? 10 × level : 0</code>
          <p>
            Visible challenge points reward solving harder questions. They are
            not passed to Q-learning.
          </p>
        </article>
        <article>
          <h3>RL reward</h3>
          <code>answer reward − strain − repeated misses − switching</code>
          <p>
            Correct: 1 + {REWARD.challengeStep} × (level − 1). Wrong:{' '}
            {REWARD.wrongReward}. Subtract {REWARD.strainWeight} × next strain,{' '}
            {REWARD.repeatedFailurePenalty} for a wrong streak ≥{' '}
            {REWARD.repeatedFailureStreak}, and {REWARD.switchPenalty} for
            changing level.
          </p>
        </article>
      </div>
      <div className="table-scroll">
        <table className="analytics-table">
          <caption>
            Correct answer with zero post-answer strain and no switch
          </caption>
          <thead>
            <tr>
              <th>Level</th>
              <th>Game points</th>
              <th>RL answer reward</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((level) => (
              <tr key={level}>
                <th>{level}</th>
                <td>{10 * level}</td>
                <td>{(1 + REWARD.challengeStep * (level - 1)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="microcopy">
        The failure-history strain proxy is not a psychological measurement.
        Response time is context only and does not enter reward or policy
        selection.
      </p>
      <div className="training-formula">
        <code>
          Q-learning: Q(s,a) ← Q(s,a) + α [r + γ max_valid Q(s′,a′) − Q(s,a)]
        </code>
        <code>
          SARSA: Q(s,a) ← Q(s,a) + α [r + γ Q(s′,a′ selected) − Q(s,a)]
        </code>
        <p>
          At question 20, the target is r alone. During Play neither update
          runs: the saved model acts greedily, and the state changes after
          grading.
        </p>
      </div>
    </section>
  )
}

function ControllerCheck({ runtime }: { runtime: PlayRuntime }) {
  const [ability, setAbility] = useState<Ability>(2)
  const [pattern, setPattern] = useState('correct')
  const [tracking, setTracking] = useState(true)
  const [seed, setSeed] = useState(20261013)
  const [index, setIndex] = useState(0)
  const chart = useRef<HTMLDivElement>(null)
  const answers = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) =>
        pattern === 'correct'
          ? true
          : pattern === 'wrong'
            ? false
            : pattern === 'recovery'
              ? !(i === 5 || i === 6)
              : i % 2 === 0,
      ),
    [pattern],
  )
  const steps = useMemo(
    () =>
      replayRound(runtime.policy, ability, answers, seed, { track: tracking }),
    [runtime, ability, answers, seed, tracking],
  )
  const fixed = useMemo(
    () => replayRound(runtime.policy, ability, answers, seed, { track: false }),
    [runtime, ability, answers, seed],
  )
  const rows = steps.map((step, i) => ({
    question: i + 1,
    level: step.difficulty,
    fixed: fixed[i].difficulty,
    ability: step.state.ability,
    action: ACTION_LABEL[step.action],
    correct: step.correct,
    reward: step.reward.total,
  }))
  const audit = auditFromReplay(steps[index], runtime.policy, seed)
  const diagnostics = simulatorDiagnostic(ability, 0)
  return (
    <>
      <section className="lab-panel">
        <h2>Scripted controller check</h2>
        <p>
          This feeds a prescribed sequence of correct and wrong outcomes through
          the actual saved controller. It does not generate answers, sample a
          simulated player, or count as held-out experiment evidence.
        </p>
        <div className="lab-controls">
          <label>
            Starting profile
            <select
              value={ability}
              onChange={(e) => setAbility(Number(e.target.value) as Ability)}
            >
              {PROFILES.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prescribed answers
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            >
              <option value="correct">All 20 correct</option>
              <option value="recovery">Two misses, then recovery</option>
              <option value="alternating">Alternating correct / wrong</option>
              <option value="wrong">All 20 wrong</option>
            </select>
          </label>
          <label>
            Tie-break seed
            <input
              type="number"
              min={0}
              max={4294967295}
              value={seed}
              onChange={(e) => {
                const value = Number(e.target.value)
                if (
                  Number.isInteger(value) &&
                  value >= 0 &&
                  value <= 4294967295
                )
                  setSeed(value)
              }}
            />
          </label>
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={tracking}
              onChange={(e) => setTracking(e.target.checked)}
            />{' '}
            Live ability tracking
          </label>
        </div>
        <div className="analytics-stats">
          <div>
            <strong>
              {Math.min(...steps.map((s) => s.difficulty))}–
              {Math.max(...steps.map((s) => s.difficulty))}
            </strong>
            <span>Actual level range</span>
          </div>
          <div>
            <strong>{steps.filter((s) => s.action === 2).length}</strong>
            <span>Raise decisions</span>
          </div>
          <div>
            <strong>{steps.filter((s) => s.fallback).length}</strong>
            <span>Fallbacks / 20</span>
          </div>
          <div>
            <strong>
              {steps.reduce((sum, s) => sum + s.reward.total, 0).toFixed(2)}
            </strong>
            <span>Prescribed-outcome return</span>
          </div>
        </div>
        <div ref={chart}>
          <TraceChart rows={rows} compare={tracking} />
        </div>
        <p className="microcopy">
          The fixed-profile line uses the same Q-table and prescribed outcomes
          with tracking disabled. Differences isolate the tracker’s effect, not
          a second learned algorithm. This is not a guarantee of monotonic
          difficulty.
        </p>
        <button
          className="text-button"
          onClick={() =>
            downloadSvg(chart.current, 'mathquest-controller-check.svg')
          }
        >
          Export chart SVG
        </button>
      </section>
      <section className="lab-panel">
        <div className="lab-controls">
          <label>
            Inspect question
            <select
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
            >
              {steps.map((s, i) => (
                <option key={i} value={i}>
                  Q{i + 1}: level {s.difficulty} · {ACTION_LABEL[s.action]} ·{' '}
                  {s.correct ? 'correct' : 'wrong'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <DecisionDetails
          decision={audit.decision}
          audit={audit}
          model={runtime.model}
          runtime={runtime}
        />
      </section>
      <section className="lab-panel">
        <h2>Inspect the simulator’s incentive</h2>
        <p>
          Starting profile {PROFILES[ability].label}, strain 0, hold each level,
          no previous wrong streak. Each row uses core transitions and the
          synthetic response formula. Expected immediate reward is a diagnostic;
          Q-values include future reward.
        </p>
        <div className="table-scroll">
          <table className="analytics-table">
            <caption>
              Synthetic assumptions — never supplied to the policy as hidden
              probabilities
            </caption>
            <thead>
              <tr>
                <th>Level</th>
                <th>p(correct)</th>
                <th>Correct reward</th>
                <th>Wrong reward</th>
                <th>Expected immediate reward</th>
              </tr>
            </thead>
            <tbody>
              {diagnostics.map((row) => (
                <tr key={row.difficulty}>
                  <th>{row.difficulty}</th>
                  <td>{(row.probability * 100).toFixed(1)}%</td>
                  <td>{row.correct.toFixed(2)}</td>
                  <td>{row.wrong.toFixed(2)}</td>
                  <td>{row.expected.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="microcopy">
          Response-v1: sigmoid({RESPONSE.slope} × (ability +{' '}
          {RESPONSE.abilityOffset} − level) − {RESPONSE.strainCoefficient} ×
          strain), clamped to {RESPONSE.minProbability}–
          {RESPONSE.maxProbability}. Changing these assumptions or the reward
          would require a separate Lane A experiment and new models.
        </p>
      </section>
    </>
  )
}

function TraceChart({
  rows,
  compare,
}: {
  rows: { question: number; level: number; fixed: number }[]
  compare: boolean
}) {
  return (
    <figure className="lab-chart">
      <figcaption>
        Question level · prescribed outcome check · 20 decisions
      </figcaption>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart
          data={rows}
          margin={{ top: 12, right: 16, bottom: 20, left: -8 }}
        >
          <CartesianGrid stroke="#3c4769" vertical={false} />
          <XAxis
            dataKey="question"
            stroke="#bac4df"
            label={{
              value: 'Question',
              position: 'insideBottom',
              offset: -12,
              fill: '#bac4df',
            }}
          />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#bac4df" />
          <Tooltip contentStyle={CHART_TOOLTIP} />
          <Legend verticalAlign="top" />
          <Line
            name="Current check"
            dataKey="level"
            stroke={COLORS[0]}
            type="stepAfter"
            strokeWidth={3}
            isAnimationActive={false}
          />
          {compare && (
            <Line
              name="Same model, profile fixed"
              dataKey="fixed"
              stroke={COLORS[1]}
              type="stepAfter"
              strokeDasharray="6 4"
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

function PolicyInspector({ runtime }: { runtime: PlayRuntime }) {
  const [state, setState] = useState<GameState>(initialState(2))
  const [seed, setSeed] = useState(29)
  const decision = runtime.decide(
    { state, belief: priorBelief(state.ability) },
    seed,
  )
  const fields = [
    ['previousDifficulty', 'Previous level', 1, 5],
    ['strain', 'Strain proxy', 0, 3],
    ['wrongStreak', 'Wrong streak (3 = 3+)', 0, 3],
    ['answeredCount', 'Questions already answered', 0, 19],
  ] as const
  return (
    <>
      <section className="lab-panel">
        <h2>Read a state from the saved table</h2>
        <p>
          The same core selector used by Play handles valid actions, seeded
          ties, and unvisited-state fallback. Terminal states have no next
          decision. Manually chosen combinations may be unreachable in a normal
          round.
        </p>
        <div className="lab-controls">
          <label>
            Ability
            <select
              value={state.ability}
              onChange={(e) =>
                setState({
                  ...state,
                  ability: Number(e.target.value) as Ability,
                })
              }
            >
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.label}
                </option>
              ))}
            </select>
          </label>
          {fields.map(([key, label, min, max]) => (
            <label key={key}>
              {label}
              <select
                value={state[key]}
                onChange={(e) =>
                  setState({ ...state, [key]: Number(e.target.value) })
                }
              >
                {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(
                  (v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ),
                )}
              </select>
            </label>
          ))}
          <label>
            Tie-break seed
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                if (Number.isSafeInteger(Number(e.target.value)))
                  setSeed(Number(e.target.value))
              }}
            />
          </label>
        </div>
        <DecisionDetails decision={decision} model={runtime.model} />
      </section>
      <section className="lab-panel">
        <h2>Policy slice</h2>
        <p>
          Same selected ability, strain and wrong streak; vary the previous
          level and session position. Arrows are actual core decisions, and F
          means fallback.
        </p>
        <div className="table-scroll">
          <table className="analytics-table policy-slice">
            <caption>Questions answered →</caption>
            <thead>
              <tr>
                <th>Previous level</th>
                {[0, 5, 10, 15, 19].map((count) => (
                  <th key={count}>{count}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {([1, 2, 3, 4, 5] as Difficulty[]).map((level) => (
                <tr key={level}>
                  <th>{level}</th>
                  {[0, 5, 10, 15, 19].map((count) => {
                    const slice = {
                      ...state,
                      previousDifficulty: level,
                      answeredCount: count,
                    }
                    const d = runtime.decide(
                      { state: slice, belief: priorBelief(state.ability) },
                      seed,
                    )
                    return (
                      <td key={count}>
                        <button
                          className={`policy-cell action-${d.action}`}
                          onClick={() => setState(slice)}
                          aria-label={`Inspect previous level ${level}, answered ${count}, ${ACTION_LABEL[d.action]}${d.fallback ? ', fallback' : ''}`}
                        >
                          {d.action === 0 ? '↓' : d.action === 1 ? '→' : '↑'}{' '}
                          {d.difficulty}
                          {d.fallback && ' F'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function ExperimentEvidence() {
  const [algorithm, setAlgorithm] = useState<'q-learning' | 'sarsa'>(
    'q-learning',
  )
  const [profile, setProfile] = useState<number | undefined>(undefined)
  const trainRef = useRef<HTMLDivElement>(null)
  const evalRef = useRef<HTMLDivElement>(null)
  const models = evidence.models.filter((m) => m.algorithm === algorithm)
  const curves = evidence.trainingCurves.filter(
    (c) => c.algorithm === algorithm,
  )
  const train = curves[0].movingAverage.map((point, i) => ({
    episode: point.episode,
    ...Object.fromEntries(
      curves.map((curve) => [
        `seed${curve.seed}`,
        curve.movingAverage[i]?.value,
      ]),
    ),
  }))
  const checkpoints = models[0].checkpoints.map((point, i) => ({
    episode: point.episode,
    ...Object.fromEntries(
      models.map((model) => [
        `seed${model.seed}`,
        model.checkpoints[i]?.meanReturn,
      ]),
    ),
  }))
  const comparison = comparisonRows(profile)
  const bundled = evidence.models.find(
    (m) => m.algorithm === 'q-learning' && m.bundled,
  )!
  return (
    <>
      <section className="lab-panel">
        <h2>Measured offline experiment evidence</h2>
        <p>
          Bundled from <code>artifacts/metrics/summary.json</code>, generated{' '}
          {evidence.generatedAt}. Scenario version {evidence.scenarioVersion}.{' '}
          {evidence.smoke
            ? 'This is a smoke run, not final evidence.'
            : 'Recorded full study: three training seeds per algorithm.'}
        </p>
        <p>
          Official tests hold ability fixed and disable model updates. They are
          simulator measurements, separate from live Bayesian tracking and the
          scripted check. The bundled Q-learning seed {bundled.seed} was
          selected by {evidence.protocol.bundledSeedRule}; its test return is{' '}
          {bundled.test.meanReturn.toFixed(3)}, while the three-seed mean is{' '}
          {evidence.seedSpread['q-learning'].mean.toFixed(3)}.
        </p>
        <div className="lab-controls">
          <label>
            Training algorithm
            <select
              value={algorithm}
              onChange={(e) =>
                setAlgorithm(e.target.value as 'q-learning' | 'sarsa')
              }
            >
              <option value="q-learning">Q-learning</option>
              <option value="sarsa">SARSA</option>
            </select>
          </label>
          <label>
            Test profile
            <select
              value={profile ?? 'all'}
              onChange={(e) =>
                setProfile(
                  e.target.value === 'all' ? undefined : Number(e.target.value),
                )
              }
            >
              <option value="all">All four profiles</option>
              {PROFILES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="evidence-charts">
          <div ref={trainRef}>
            <EvidenceChart
              rows={train}
              seeds={curves.map((c) => c.seed)}
              title="Training return · moving average, exploration enabled"
            />
            <p className="microcopy">
              100-episode moving average supplied by the artifact; downsampled
              to ≤1,000 points per seed. Raw unsmoothed training returns were
              not bundled.
            </p>
            <button
              className="text-button"
              onClick={() =>
                downloadSvg(trainRef.current, 'mathquest-training.svg')
              }
            >
              Export training SVG
            </button>
          </div>
          <div ref={evalRef}>
            <EvidenceChart
              rows={checkpoints}
              seeds={models.map((m) => m.seed)}
              title="Frozen checkpoint evaluation · ε = 0"
            />
            <p className="microcopy">
              {evidence.counts.checkpointScenarios} fresh checkpoint scenarios
              per evaluation; the table is frozen. This is distinct from the
              exploring training curve.
            </p>
            <button
              className="text-button"
              onClick={() =>
                downloadSvg(evalRef.current, 'mathquest-checkpoints.svg')
              }
            >
              Export evaluation SVG
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table className="analytics-table">
            <caption>
              Held-out tests:{' '}
              {profile === undefined ? 'all profiles' : PROFILES[profile].label}
              . Return is the undiscounted sum of 20 rewards.
            </caption>
            <thead>
              <tr>
                <th>Controller</th>
                <th>Samples</th>
                <th>Mean return</th>
                <th>Correct</th>
                <th>Attempted level</th>
                <th>Solved level</th>
                <th>Longest wrong streak</th>
                <th>Switches</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.name}>
                  <th>{row.name}</th>
                  <td>{row.samples}</td>
                  <td>
                    {row.meanReturn.toFixed(3)}
                    {row.sd !== null && ` ± ${row.sd.toFixed(3)}`}
                  </td>
                  <td>{(row.correctRate * 100).toFixed(1)}%</td>
                  <td>{row.meanAttemptedDifficulty.toFixed(2)}</td>
                  <td>{row.meanSolvedDifficulty?.toFixed(2) ?? 'N/A'}</td>
                  <td>{row.meanLongestWrongStreak.toFixed(2)}</td>
                  <td>{row.meanSwitches.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="microcopy">
          ± is sample SD across three independently trained seed means, not a
          confidence interval or uncertainty over thousands of independent
          agents. Each seed is tested on {evidence.counts.testScenarios}{' '}
          scenarios ({evidence.counts.testScenarios / 4} per profile). Baselines
          use the matched test scenario family. Reported switch counts include
          the first adjustment from the level-2 reset.
        </p>
        <details className="review">
          <summary>Accessible training and evaluation values</summary>
          <div className="table-scroll">
            <table className="analytics-table">
              <caption>
                Every frozen checkpoint from the original artifact
              </caption>
              <thead>
                <tr>
                  <th>Episode</th>
                  {models.map((model) => (
                    <th key={model.seed}>Seed {model.seed}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((row) => (
                  <tr key={row.episode}>
                    <th>{row.episode}</th>
                    {models.map((model) => (
                      <td key={model.seed}>
                        {Number(
                          row[`seed${model.seed}` as keyof typeof row],
                        ).toFixed(3)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="microcopy">
          Recorded machine: {evidence.machine.cpu}, {evidence.machine.platform}/
          {evidence.machine.arch}, Node {evidence.machine.node}. Artifact
          reports {evidence.runtimeSeconds.toFixed(3)} s for this study. This
          view reads that report; it has not rerun or retrained the models.
        </p>
      </section>
      <section className="lab-panel">
        <h2>Export the actual evidence</h2>
        <div className="actions">
          <button
            className="button subtle"
            onClick={() =>
              downloadText(
                'mathquest-experiment-summary.json',
                evidenceFiles.summaryText,
              )
            }
          >
            Full metrics JSON
          </button>
          <button
            className="button subtle"
            onClick={() =>
              downloadText(
                'mathquest-comparison.csv',
                evidenceFiles.comparisonCsv,
                'text/csv',
              )
            }
          >
            Original comparison CSV
          </button>
          <button
            className="button subtle"
            onClick={() =>
              downloadText(
                'mathquest-experiment-manifest.json',
                evidenceFiles.manifestText,
              )
            }
          >
            Experiment manifest
          </button>
        </div>
        <p className="microcopy">
          Exports preserve the bundled source values. The played-round audit has
          its own JSON and CSV export so human demonstration outcomes are not
          mixed with held-out simulator results.
        </p>
      </section>
    </>
  )
}

function EvidenceChart({
  rows,
  seeds,
  title,
}: {
  rows: Record<string, number | undefined>[]
  seeds: number[]
  title: string
}) {
  return (
    <figure className="lab-chart">
      <figcaption>{title}</figcaption>
      <ResponsiveContainer width="100%" height={270}>
        <LineChart
          data={rows}
          margin={{ top: 12, right: 12, bottom: 20, left: 0 }}
        >
          <CartesianGrid stroke="#3c4769" vertical={false} />
          <XAxis
            dataKey="episode"
            stroke="#bac4df"
            tickFormatter={(n) => `${Number(n) / 1000}k`}
            label={{
              value: 'Training episode',
              position: 'insideBottom',
              offset: -12,
              fill: '#bac4df',
            }}
          />
          <YAxis stroke="#bac4df" />
          <Tooltip contentStyle={CHART_TOOLTIP} />
          <Legend verticalAlign="top" />
          {seeds.map((seed, i) => (
            <Line
              key={seed}
              name={`Seed ${seed}`}
              dataKey={`seed${seed}`}
              stroke={COLORS[i]}
              dot={false}
              strokeWidth={1.7}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}
