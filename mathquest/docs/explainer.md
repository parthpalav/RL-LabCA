# How MathQuest works

MathQuest is an adaptive arithmetic game. A Q-learning controller decides whether the next question is one level easier, the same, or one level harder. The learning happened offline, on a simulated student, for 100,000 episodes. The game does not keep training while someone plays. It loads the saved table and looks up one action after every answer.

A later change re-estimates the player's ability after every answer, then asks that same saved table what to do for the updated ability. Calibration is only the starting guess.

## The decision

The state has five parts.

| Part | Range | Meaning |
|---|---|---|
| Ability | 0–3 | Starting out, Building up, Comfortable, Ready for a challenge |
| Previous difficulty | 1–5 | Level of the last question |
| Strain | 0–3 | Rises after a miss, falls after a correct answer |
| Wrong streak | 0–3 | Current run of misses, capped at 3 |
| Answered count | 0–20 | How far the round has gone |

That is 4 × 5 × 4 × 4 × 21 = **6,720 states**. Each state has 3 actions: ease, hold, or raise, and only by one level. Level 1 cannot go down. Level 5 cannot go up. The table holds **20,160** numbers.

The reward the agent was trained on is not the score on screen.

- A correct answer scores `1 + 1 × (level − 1)`.
- A miss scores `−1`.
- Strain subtracts `0.15` times the next strain.
- A second miss in a row subtracts an extra `0.4`.
- Changing level subtracts `0.05`.

Screen points are `10 × level` for a correct answer. They never enter the Q-update.

## How it learned

Training is in `src/core/train.ts`. The table is in `src/core/policy.ts`.

For each simulated episode the ability is fixed. The agent picks an action with epsilon-greedy: mostly random at the start, mostly greedy by the end. The simulated student is correct with a probability that depends on ability, difficulty, and strain (`src/core/simulator.ts`). `src/core/transitions.ts` applies the reward and builds the next state.

Q-learning moves the value of the state and action just taken toward

```text
reward + 0.95 × the best legal value of the next state
```

The step size starts at 0.1 and shrinks with each visit to that state-action pair: `min(0.1, 1 / (1 + visits)^0.7)`. A fixed step size kept near-tied actions flipping, so the level could drop after a correct answer. On the last question of the 20, there is no next value, only the reward.

SARSA uses the same loop, except the next value is the action that was actually sampled, not the best one. Both algorithms were trained. Only Q-learning controls the game.

On a held-out test of 400 simulated rounds:

| Controller | Mean return |
|---|---:|
| Q-learning | 56.49 |
| SARSA | 53.00 |
| Tuned rule | 51.43 |

These returns use reward v2, so they are not comparable with the earlier v1 scores around 15. The response model (`response-v2`) expects each profile to succeed about 88% of the time two levels above itself, which is what lets the top profile reach level 5. Under v1 the top profile managed level 5 only about a third of the time, and the learned policy stayed near level 3.

The file the game loads is Q-learning seed 29. It was chosen as the middle seed on validation, not the seed with the best test score. The file is `public/models/q-learning-default.json`. It is a table of numbers, not a neural network.

## What one answer does

`src/app/playRuntime.ts` runs the live round.

The six starting questions are a fixed ladder: levels 1, 2, 2, 3, 3, 4. They do not use the learned policy. They set the starting ability:

| Correct | Path |
|---|---|
| 0–1 | Starting out |
| 2–3 | Building up |
| 4–5 | Comfortable |
| 6 | Ready for a challenge |

Each of the next 20 questions does three things.

1. `actFrozen` reads the Q-values for the current state and takes the best legal action. If that state was never visited in training, it eases after a miss and otherwise holds.
2. `src/core/questions.ts` writes a new arithmetic question at the chosen level. The controller never sees the numbers in the question. Levels 4 and 5 (`questions-v2`) are percentages, fractions, negatives, powers, two-step equations, and word problems. The table still only chooses the level.
3. After the answer is locked, `applyTransition` updates strain, the miss streak, and the question count. The Q-values themselves do not change.

## Ability is re-estimated after every answer

`src/core/abilityTracker.ts` is the recent change.

`priorBelief` starts a probability over the four abilities, centered on the calibration result. After every answer, `updateBelief` multiplies each ability's probability by how likely that ability was to get this question right or wrong, using the same response model the agent trained on. A run of correct answers on harder questions shifts probability upward. A run of misses shifts it downward. Older evidence is slightly forgotten (`memory` 0.9), so a change in the middle of the round can still move the estimate.

The displayed ability moves by at most one level per answer, and only if the new level is clearly more likely (`switchMargin` 0.02). One lucky or careless answer cannot jump from Starting out to Ready for a challenge.

`withAbility` writes that estimate into the state before the next lookup. Later questions are chosen from the matching rows of the same frozen table.

Training still used a fixed ability for the whole episode. Live play queries that table with an ability that can move. In simulation with the v2 model, players whose first six questions placed them too low improved from about **34.8** to about **49.5** mean return. Players who were already placed correctly went from about **57.0** to about **53.7**. With the bundled model, a player who answers everything correctly from Comfortable reaches level 5 by question 5 and stays there. A player who answers everything wrong settles on level 1.

## Replay

`src/core/replay.ts` runs the saved table back over a finished round. For each step it shows the state, the Q-values for ease, hold, and raise, the action taken, and the ability belief before and after. Flipping an answer shows the path the controller would have taken instead. Journeys stay in this browser. Nothing is uploaded.

## Where the code is

| File | Role |
|---|---|
| `src/core/policy.ts` | Q-table, greedy choice, frozen lookup |
| `src/core/train.ts` | Q-learning and SARSA training loop |
| `src/core/transitions.ts` | Reward and next state |
| `src/core/simulator.ts` | Chance a simulated student is correct |
| `src/core/questions.ts` | The arithmetic at the chosen level |
| `src/app/playRuntime.ts` | Load the JSON and step one live question |
| `src/core/abilityTracker.ts` | Update ability after each answer |
| `src/core/replay.ts` | Show the Q-values behind a finished round |
| `public/models/q-learning-default.json` | The table the game plays |
