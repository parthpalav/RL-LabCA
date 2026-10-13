# MathQuest

Adaptive-difficulty mathematics game for the Reinforcement Learning lab.

The task split and current status live in `../TASKS.md`.

```text
npm install
npm test
npm run dev
```

```text
npm test
npm run experiments
```

`npm run experiments` is the reported run: alpha pilot, 100000 episodes, seeds 11, 29, and 47, then the held-out test. It writes `public/models` and `artifacts/`. `npm run experiments -- --smoke` is a short labeled check and does not replace that run.

## Live adaptation

Live play re-estimates the player's ability after every answer (`src/core/abilityTracker.ts`). It keeps a posterior over the four ability levels, using the same response model the agent trained on as the likelihood, with mild forgetting (`TRACKER.memory`) so recent answers count more. The estimate moves one level at a time and only when clearly more likely (`TRACKER.switchMargin`). The current estimate is written into the ability slot of the state before the saved Q-table picks the next difficulty. Training is unchanged; ability stays fixed per training episode.

In simulation with the v2 model, for players whose calibration put them on the wrong level, mean 20-question return rose from 34.8 to 49.5. For correctly calibrated players it went from 57.0 to 53.7, the cost of a looser switch margin that lets a strong player climb quickly.

## Simulator v2 and step size

v1 (`response-v1`, `reward-v1`) never served levels 4 or 5: its top profile answered level 5 correctly a third of the time, so the learned policy capped out near level 3, and a player answering everything correctly bounced between levels 1 and 3. v2 sets the response model so each profile succeeds about 88% of the time two levels above itself (slope 2, offset 3, strain 0.5) and pays 1 point per level of challenge. Training uses a visit-count step size, alpha_n = min(alpha, 1 / (1 + n)^0.7), instead of a constant alpha. The constant step kept the Q-values tracking reward noise, and near-tied actions flipped, which made the level drop after correct answers.

With the bundled model, a player who answers everything correctly from Comfortable reaches level 5 at question 5 and stays there. One who answers everything wrong settles on level 1. Run `npm run experiments` to regenerate `public/models` and `artifacts/`.

## Harder levels

Levels 4 and 5 use the `questions-v2` generator. Level 4 draws from harder percentages, percentage change, fraction multiplication and division, negative numbers, and powers and roots. Level 5 draws from two-step equations, x on both sides, brackets, fraction equations, multi-step arithmetic, and discount word problems. The Q-table is unaffected; it chooses levels, not content.

## My Journeys and replay

Every answer, from the six starting questions and the 20-stop trail, is saved in the browser's IndexedDB (`src/app/history.ts`) as it is given. Nothing leaves the device; Reset Local Data deletes it, and journeys can be exported to and imported from JSON.

Replay (`src/core/replay.ts`) re-runs the saved Q-table over a journey's answers with the round's seed. It reproduces the levels that were served, and the screen shows what the controller saw at each step: the state, its Q-values for easier, same, and harder, and the ability belief. Any answer can be flipped to see the path the controller would have taken instead, and the round can be compared with live tracking switched off.

## Deploy

`npm run build` writes a static site to `dist/` with relative paths, so it works at a domain root or a subpath.

- GitHub Pages: `.github/workflows/deploy.yml` tests, builds, and publishes on every push to `main`. Enable it once in the repository's Settings → Pages → Source: GitHub Actions.
- Netlify: `netlify.toml` at the repository root is ready; connect the repository.
- Any static host: upload `dist/`.
