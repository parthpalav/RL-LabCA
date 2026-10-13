# MathQuest task board

Updated 13 October 2026. Two coding lanes. Each person edits only their lane so the other can keep working.

GitHub: https://github.com/parthpalav/RL-LabCA

People with push access: `SaishKorgaonkar`, `parthpalav`, `Arnav250`.

| Lane | Owner | GitHub |
|---|---|---|
| A. Core, RL, experiments, science docs | Saish Korgaonkar | `SaishKorgaonkar` |
| B. Playable game, visuals, Research Lab screens, faculty URL | Parth Palav | `parthpalav` |

`Arnav250` has write access and no lane yet. Do not start a third copy of these files. If Arnav is taking a lane, reassign that lane here before editing.

## File ownership

Lane A owns:

- `mathquest/src/core/**`
- `mathquest/scripts/**`
- `mathquest/tests/**`
- `mathquest/public/models/**`
- `mathquest/artifacts/**`
- `mathquest/docs/simulator-assumptions.md`
- `mathquest/docs/report-draft.md`
- `mathquest/docs/rubric-evidence.md`
- `mathquest/docs/references.md`

Lane B owns:

- `mathquest/src/main.tsx`
- `mathquest/src/screens/**`
- `mathquest/src/components/**`
- `mathquest/src/styles/**`
- `mathquest/src/illustrations/**`
- `mathquest/src/app/**`
- `mathquest/src/workers/**`
- `mathquest/index.html`
- `mathquest/docs/viva-guide.md`

Shared, already scaffolded. Change these only in a small commit both of you know about:

- `mathquest/package.json`
- `mathquest/package-lock.json`
- `mathquest/tsconfig.json`
- `mathquest/vite.config.ts`
- `mathquest/src/core/types.ts`
- `mathquest/src/core/config.ts`
- `mathquest/src/core/index.ts`

Lane B imports the core. Lane B does not reimplement grading, the MDP, or Q-learning. Lane A does not restyle screens.

## Status

| ID | Lane | Work | Status |
|---|---|---|---|
| A1 | A | Question engine, rational grading, state codec, action masks, profiles | Done |
| A2 | A | MDP, reward, Q-learning, SARSA, baselines, CLI | Done |
| A3 | A | Pilot, three seeds, held-out tests, bundled JSON models | Done; rerun 13 Oct with simulator v2, reward v2, and a decaying step size |
| A4 | A | Report draft filled with measured results, rubric evidence | Todo |
| B1 | B | Landing, setup, calibration, 20-question play, results | Done: live play uses the saved Q-learning controller and re-estimates ability after every answer |
| B2 | B | Test a profile: play or watch a simulated player | Todo |
| B3 | B | Three SVG worlds, guide, trail, badges, phone and laptop layout | Todo |
| B4 | B | Train a profile screen. Must not overwrite `public/models` | Todo |
| B5 | B | Research Lab: charts, policy inspector, exports | In progress: model/scoring audit, recorded decisions, controller checks, policy inspector, measured charts and exports implemented; full browser QA pending |
| B6 | B | Static URL on Cloudflare Pages, GitHub Pages, or Netlify | Ready: Pages workflow and `netlify.toml` added; enable Pages (Source: GitHub Actions) in repo settings |

The game faculty open is Lane B. The tables that choose the difficulty are Lane A. Play mode stays on the saved Q-learning file. Train a profile is a browser demonstration only.

## Contract Lane B can call

From `mathquest/src/core/index.ts`:

- `generateQuestion(level, seed)` and `gradeQuestion(question, optionId)`
- `CALIBRATION_LEVELS` and `abilityFromCalibration(correctCount)`
- `PROFILES` for the four labels
- `encodeState`, `decodeState`, `validActions`, `nextDifficulty`
- `initialState(ability)`
- `applyTransition(state, action, correct)` and `successProbability(ability, difficulty, strain)`
- `trainAgent`, `greedyAction`, `actFrozen`, `fixedAct`, `ruleAct`, `randomAct`
- `priorBelief`, `updateBelief`, `withAbility` for the live ability estimate.
- `replayRound(policy, startAbility, answers, seed, { track })` to replay or what-if a saved journey.
- `parseModel` for a saved Q-table. The reported run is 100000 episodes and writes `public/models/q-learning-default.json` and `public/models/sarsa-reference.json`.

Do not render `question.spec` or `question.correctOptionId` before the answer is locked.

## How to work

```text
git pull
cd mathquest
npm install
npm test
```

Lane B, once screens exist:

```text
npm run dev
```

Update the status table in this file in the same commit as the work.
