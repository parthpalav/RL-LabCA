# MathQuest presentation script

Slide-by-slide speaking content for the 16-slide deck. About 11 minutes with the live demo. To save time, shorten slide 8 to one sentence and skip slide 11.

Deck: https://claude.ai/artifact/K4YYZ1Z2qLJHhTyddLhBsQ (private until shared from its Share menu; the same text is in each slide's speaker notes).

Before presenting: replace `[Team names]` on the cover, and start the game with `npm run dev` in `mathquest/` or open the deployed site. Slides 3–4 are screenshots, kept as a backup for the live demo.

---

## Slide 1 · Cover (20 s)

"Good morning, ma'am. Our project is **MathQuest**, a maths practice game where a reinforcement learning agent decides how hard the next question should be. I'll show it working first, then explain how we framed it as an RL problem, which algorithm we used and why, and what our results show."

## Slide 2 · One worksheet does not fit every student (40 s)

"In normal practice every student gets the same worksheet. A strong student gets bored with easy questions. A weaker student gets several wrong in a row and gives up.

So after every answer, our system decides: should the next question be **easier, the same, or harder?** There are five levels, shown on the right. Level 1 is addition and subtraction. Level 5 is equations with x on both sides, brackets and word problems. A session is 20 questions. The goal is to keep each student at the hardest level they can still solve, without long runs of wrong answers."

## Slide 3 · Live demo: the agent picks all 20 questions (1 min 30 s)

*(Switch to the live site. Use this slide only as a backup.)*

"First the student answers **six starting questions**. Based on how many they get right, we place them on a starting profile: Starting out, Building up, Comfortable, or Ready for a challenge.

From here, **every question is chosen by our trained Q-learning agent.** *(Answer a few correctly.)* The level is going up: 3, 4, now 5. This is a level-5 question, and after each answer we show the full working.

*(Answer two or three wrongly.)* Now I'll get some wrong. The message says 'Let's steady the trail', and the level comes down, so it reacts in both directions.

*(Finish and show Results.)* The results screen shows one bar per question. This student started on Comfortable, and the game moved them up to Ready for a challenge."

## Slide 4 · Every decision can be replayed (1 min)

*(Click "How did the difficulty adapt?")*

"This is the replay screen. Every answer is saved on the device. We feed the saved answers back through the same trained model, and it **reproduces exactly the levels the student got**. That proves the game is really using the trained policy.

For each question you see what the agent saw, and its three Q-values for easier, same and harder; the highlighted one is the one it picked. You also see how its estimate of the student changed. *(Click "What if this was missed?")* And we can flip any answer to see the path the agent would have taken instead."

## Slide 5 · The MDP (1 min)

"Now, how we framed it as a Markov Decision Process.

- **State:** five values: the student's ability profile, the previous level, a strain value that rises with wrong answers and falls with correct ones, how many wrong in a row, and how many questions are done. That gives **6,720 states**.
- **Actions:** three: easier, same, harder. 'Easier' is blocked at level 1 and 'harder' at level 5.
- **Reward:** a correct answer earns 1 plus 1 per level above 1, so a correct level-5 answer is worth 5. A wrong answer is −1. Small penalties for strain, for two or more wrong in a row, and for changing level, so it doesn't jump around for no reason.
- **γ = 0.95**, and an episode ends after 20 questions.

6,720 states times 3 actions gives 20,160 Q-values, which is our whole model."

## Slide 6 · A simulated student to train against (40 s)

"To train, we can't use 100,000 real students, so we built a **simulated student**. The chance of a correct answer depends on the gap between the student's ability and the question's level, and it drops when strain is high.

On the right, each profile gets about **88% right two levels above itself**. The left panel is our first version. I'll come back to why we changed it."

## Slide 7 · Tabular Q-learning, and why we chose it (1 min)

"We used **Q-learning**. This is the update:

> Q(s,a) ← Q(s,a) + α [ r + γ · max Q(s′,a′) − Q(s,a) ]

In simple words: the value of what we just did moves toward the reward we got plus the value of the best move from where we ended up.

Why Q-learning? Four reasons:

1. **Small and discrete.** With 6,720 states and 3 actions, a table holds an exact value for every case. No neural network is needed.
2. **Model-free.** It learns from answers alone; it never needs the formula for how students behave.
3. **Off-policy.** It explores randomly during training with ε-greedy, but learns the best greedy policy, which is exactly what we deploy.
4. **Explainable.** The model is a 420 KB file in the browser, and any choice is explained by three numbers.

We compared it with **SARSA**, which is on-policy, and with three simple baselines: a fixed level, a hand-tuned rule, and random choice."

## Slide 8 · One loop for training and for live play (30 s)

"Training and live play share the same loop. In **training**, offline in Node.js, the environment is the simulated student and the agent updates its Q-table after every answer. In **live play**, in the browser, the environment is the real student. The Q-table is frozen. What updates is our estimate of the student's ability, which feeds into the state."

## Slide 9 · Training (40 s)

"We trained for **100,000 episodes**, with three seeds per algorithm. Exploration ε starts at 1, fully random, and drops to 0.05 by episode 80,000; you can see the curve flatten there.

We kept a strict protocol. The learning rate was chosen on a validation set: 0.2 for Q-learning, 0.05 for SARSA. The model to ship was chosen before touching the test set. Then everything ran once on **400 held-out simulated students**."

## Slide 10 · Q-learning beats every baseline (50 s)

"On those held-out students, Q-learning gets a return of **56.5**, with only ± 0.14 between seeds. That's about **10% better than the tuned rule** and 42% better than a fixed level.

It also serves the **hardest questions**, an average level of 3.36, with **88% of answers correct**. In the right-hand chart, it has a tenth of the fixed level's repeated failures. Under a harsher simulated student, our stress test, it still comes first."

## Slide 11 · Each student gets their own level (30 s)

"Broken down by student type: about level 2 for 'Starting out', rising to about **4.8 for 'Ready for a challenge'**, with 86 to 91% correct for everyone. A fixed level gives every student level 3, which is too hard for the weakest and too easy for the strongest."

## Slide 12 · It traded easy wins for harder questions (40 s)

"These are greedy-policy checkpoints during training. As Q-learning trained, its **success rate dipped a little while its level went up**. It learned to give up some easy correct answers for much harder questions, because our reward values challenge.

SARSA stayed more cautious. That's expected: as an on-policy method, it counts the cost of its own exploring mistakes, just like the cliff-walking example in Sutton and Barto."

## Slide 13 · What debugging taught us (1 min)

"Our first version had a real problem. When I answered **every question correctly**, it stayed between levels 1 and 3. That's the grey line. We found two causes:

1. **The simulated student was too weak.** Even the strongest profile got level 5 right only one time in three, so the agent correctly learned that level 5 never pays off. We recalibrated it.
2. **A fixed learning rate kept Q-values noisy.** The three values were nearly tied, so noise sometimes made it go down after a correct answer. We switched to a learning rate that shrinks as a situation is seen more often, the Robbins–Monro condition from the theory.

After the fix, it never dropped after a correct answer: zero drops, down from 3.7 per game. A perfect student now reaches level 5 by about question 7 instead of 14. That's the blue line."

## Slide 14 · The level follows the student's estimate (45 s)

"Six starting questions aren't enough to judge a student. So during the game we keep a **probability over the four profiles** and update it after every answer, using the same student model.

Here the student gets 10 right, then 5 wrong, then 5 right. The estimate climbs to Challenge, falls when they struggle, and the level follows. When the starting questions placed a student wrongly, this tracking raises the return from **34.8 to 49.5**."

## Slide 15 · Limits and next steps (30 s)

"Our main limitation is honest: **the students are simulated**. Our numbers hold for our student model, not yet for real students. A table also can't generalise to situations it never saw; those fall back to a safe rule.

Next: use the answers the game already saves to fit the model to real data and retrain, track skill per topic with knowledge tracing, and run a classroom study against the rule baseline."

## Slide 16 · Summary / Thank you (15 s)

"To sum up: we framed choosing question difficulty as an MDP, solved it with tabular Q-learning, beat every baseline on held-out students, and built a working game where every decision can be replayed and explained. **Thank you. We're happy to take questions.**"

---

## Likely viva questions

- **Why not DQN?** Only 6,720 states, so a table is exact, quick to train (under 3 seconds for the full experiment) and explainable. DQN would add approximation error and no benefit here.
- **Q-learning vs SARSA?** Q-learning learns from the best next action (off-policy); SARSA learns from the action it actually takes (on-policy). That makes SARSA safer here, but less ambitious.
- **Why γ = 0.95?** The session is 20 questions long, so rewards several questions ahead still matter. Strain and failure streaks carry over from one question to the next.
- **What is ε-greedy?** With probability ε pick a random allowed action, otherwise the best one. ε drops from 1 to 0.05 over 80% of training.
- **What if the agent meets a situation it never saw in training?** It falls back to a safe rule: if the last answer was wrong, go easier; otherwise stay.
- **Does it converge?** Yes. The three seeds end within ±0.14 of each other, the curves are flat for the last 20,000 episodes, and the shrinking learning rate meets the convergence conditions.
- **Is the agent still learning during play?** No. The Q-table is frozen in the game. Only the ability estimate updates, and it feeds into the state.
