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
