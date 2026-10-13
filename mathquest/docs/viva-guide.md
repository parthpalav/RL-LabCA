# MathQuest: presentation guide and verified model audit

Updated 13 October 2026. Includes the teammate's reward-v2/response-v2 models.

## Present this now

From `mathquest/`, run `npm run dev` and open the localhost URL printed by Vite.

1. Open **Research Lab → Model & scoring**. Show the exact loaded model: Q-learning seed 29, 100,000 episodes, 2,000,000 state-action updates, reward-v2 and response-v2. Play is frozen: epsilon is zero and no Q-value updates run.
2. Open **Controller check**. Select **Comfortable**, **All 20 correct**, and enable **Live ability tracking**. With seed `20261013`, the actual saved controller chooses levels `3, 4, 4, 4, 5` and then holds level 5. Ready for a challenge reaches level 5 on question 3. These are prescribed-outcome checks, not held-out experiment results.
3. Inspect question 2 or 5. Show the five-part state, state ID, valid/masked actions, all Q-values, training visits, selected action, reward components, and updated ability belief. Explain that the maximum valid Q-value selects difficulty. The separate Bayesian tracker changes the ability slot; it does not train the Q-table.
4. Switch to **Two misses, then recovery** and show the changed trajectory. A correct answer does not force a raise; the state, remaining question count, and learned future values determine the action.
5. Open **Training & comparisons**. Show the real exploring-training moving averages and the separate frozen checkpoint curves. The comparison table and exports come from the newly merged v2 study; do not quote the old v1 returns around 15 as current results.
6. For human play, use **Start Adventure**, complete six calibration questions, then play the 20-question round. After an answer locks, the Next button shows the next level and **Why this level?** shows the recorded current and next decisions. The message always states the actual level change, even when the ability estimate changes.
7. At results, show game points versus recorded RL return, raise/hold/ease counts, fallback frequency, and the reward decomposition. Open **How did the difficulty adapt?** for the round's original snapshots and counterfactual reconstruction. Export CSV or JSON for the professor.

## Why difficulty used to stay low

The earlier reward-v1 model was genuinely queried, but response-v1 assumed the strongest profile succeeded at level 5 only about one-third of the time. Holding level 3 had higher expected immediate reward than holding level 4 or 5. Twenty correct answers therefore did not force that frozen policy upward.

The teammate subsequently changed the simulator, challenge reward, tracker settings, and visit-dependent training step size, and retrained all models. Those commits were merged without conflicts. The updated response-v2 assumes much higher success at advanced levels and reward-v2 gives a larger challenge bonus. The new all-correct trajectories above were verified against the saved table after the merge. The two experiment versions are not directly comparable.

## Explain the two scores

Game points are `10 × difficulty` for a correct answer and zero for a wrong answer.

The current RL reward comes directly from the core transition:

```text
correct answer reward = 1 + 1 × (difficulty − 1)
wrong answer reward = −1
reward = answer reward − 0.15 × next strain
         − 0.4 when a wrong streak reaches at least 2
         − 0.05 when difficulty changes
```

Q-learning learns discounted future reward with gamma 0.95. The loaded model's base alpha is 0.2, selected by validation. Its actual visit-dependent step size is `min(0.2, 1 / (1 + visits)^0.7)`. Terminal question 20 uses reward alone, with no bootstrap. The Lab's training-step illustration is read-only and identifies this decay; Play does not execute the update.

Round RL return is the undiscounted sum of observed rewards. Response time is context only, and never affects reward or policy selection. Strain is a failure-history proxy, not a psychological measurement.

## Evidence and limits

The app calls the core's `actFrozen`, `applyTransition`, grading, and ability tracker. It captures each selected action once, preserves the original state/Q-values/visits/reward at answer lock, and uses the cached next decision when Next is pressed. It never renders the question specification or answer key before locking.

Original snapshots remain available if a model is later replaced. SHA-256 identifies the loaded file. Older journeys without snapshots are labeled as current-model reconstructions. Counterfactuals prescribe later correctness outcomes even if levels change; they are not predictions of how a human would answer different questions.

Official experiment metrics hold ability fixed. Live tracking and scripted classroom checks are separate deployment demonstrations. Simulator success probabilities are synthetic assumptions. The project does not prove improved human learning or test scores. Raw unsmoothed training series were not bundled; the supplied training curves are labeled 100-episode moving averages.

Verification commands:

```sh
npm test
node --import tsx src/app/b1.smoke.ts
node --import tsx src/app/analytics.smoke.ts
npm run build
```

The analytics check covers 240 real-model decisions, exact core/replay parity, immutable Q-values and visits, reward totals, terminal handling, captured snapshots/exports, fallback labeling, model identity, and answer disclosure. Native browser automation was unreliable during this session, so complete Lab interaction and visual QA remain a verification limit. The implementation and production build are ready for your presentation.
