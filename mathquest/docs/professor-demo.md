# Demonstrating MathQuest

The demonstration is one played round, plus a short explanation of the table that is choosing the levels. The learning already happened before the demo. During play the app only looks up the saved Q-learning table.

Train a profile and Research Lab are still placeholder pages. Do not open them in front of the professor. On the results screen, skip **How did the difficulty adapt?** That button opens the unfinished lab.

## Before the demo

From the project folder, on the latest `main`:

```text
git pull
cd mathquest
npm install
npm run dev
```

Open the localhost address Vite prints. You should see **Start Adventure** and no banner saying the model is missing. If that banner appears, the saved model did not load and the 20-question round will not start.

Do not retrain during the demo. The 100,000-episode run is already in `public/models/q-learning-default.json`.

## What the app is

MathQuest is an adaptive arithmetic game. A tabular Q-learning controller chooses whether the next question is one level easier, the same, or one level harder. It was trained on a simulated player for 100,000 episodes of 20 questions. The copy in the game is frozen: answering does not change the table.

## The round to play

1. Click **Start Adventure**.
2. A nickname is optional. Pick any world. The world only changes the scenery. Leave **Remember settings** off unless this browser should keep the summary.
3. Click **Find my starting path**.
4. Answer the six starting questions with the mouse, or keys **1–4**. **Enter** goes to the next question. **Esc** pauses. These six are a fixed ladder, levels 1, 2, 2, 3, 3, 4. They do not use the learned policy. They only estimate a starting ability:
   - 0–1 correct: Starting out
   - 2–3: Building up
   - 4–5: Comfortable
   - 6: Ready for a challenge
5. For a visible demo, aim for **Comfortable** (4 or 5 correct). Starting out stays near level 1, so the policy has less room to move.
6. The next screen names the path. Click **Begin my adventure**. That loads the frozen Q-table and starts the 20-question episode.
7. After each answer, read the line above the next question. That line is the action the table just chose:
   - **A little more challenge.** The action was raise.
   - **Stay on this path.** The action was hold.
   - **Let’s build confidence.** The action was ease.
8. Make the policy visible on purpose. Get two or three right in a row, then miss two in a row. The message should move up after success and down after repeated misses. Each step changes the level by at most 1, and the level stays between 1 and 5.
9. Finish all 20. The screen **Constellation complete** is the episode summary. Use **Your challenge trail**: each bar is one question’s level, a tick is correct, and a loop is a miss. That trail is the policy’s behaviour for this player. Points are `10 × level` for a correct answer. Those points are the game score, not the reward the algorithm was trained on.

## What the algorithm does during play

Each question, the app builds a state and asks the saved table for one action.

The state is five numbers:

- ability, from the six starting questions, fixed for the round
- the level of the previous question
- strain, which rises after a miss and falls after a correct answer
- the current run of misses
- how many of the 20 questions are already done

The action is ease, hold, or raise. Illegal moves are blocked, so level 1 cannot go down and level 5 cannot go up. The app then writes a new arithmetic question at the chosen level. Grading is ordinary exact arithmetic. The correct option stays hidden until an answer is locked.

Nothing in that loop updates a Q-value. The learning already happened, offline, against a simulated student. The demo is the learned policy acting.

## If asked to see the learning itself

Show the files, not the unfinished screens.

- `artifacts/figures/checkpoint-return.svg` is the frozen-policy score while training.
- `artifacts/figures/comparison.svg` is Q-learning against SARSA, a tuned rule, a fixed level, and random.
- The reported test scores, on 400 simulated episodes the training never saw, are Q-learning **15.42**, SARSA **15.36**, and the tuned rule **14.26**. The play model is Q-learning seed 29, chosen because it was the middle validation seed, not because it had the best test score.

The training loop in one sentence: the simulated player is correct with a probability that depends on ability, level, and strain. Q-learning stores a value for every state and action, and after each simulated answer it nudges that value toward `reward + 0.95 × the best next value`. SARSA is the same idea, except it learns the action that was actually tried next, not the best one. Both tables are in the repo. Only Q-learning drives the game.

`npm run experiments` repeats that whole study in a few seconds and rewrites the model files. Do not run it during the demo unless a live retrain is requested.
