# MathQuest game demonstration

Updated 13 October 2026. Lane B, B1 progress checkpoint.

## What works at this checkpoint

Start Adventure opens setup with an optional nickname and the three planned world choices. Answer the six starting questions using the mouse or keys 1–4. The question generator, grading, levels, and profile mapping come from `src/core/index.ts`.

One answer locks all choices. Correctness and the core's worked solution appear only after locking. Enter or Next continues; Escape pauses. Leaving an unfinished journey requires a deliberate choice. There is no timer, elimination, or sound.

After calibration the game shows Starting out, Building up, Comfortable, or Ready for a challenge. This is a coarse starting suggestion. It is not a validated assessment of ability.

The 20-question UI loop and results view are prepared, including points, an uncapped longest mistake streak, the difficulty timeline, review, and Play Again. They are gated behind the live core integration. **A real adaptive 20-question session is not yet available. B1 is not complete.**

Profile testing, training, and Research Lab links currently show clearly labeled pending screens. B2–B6 remain unfinished. The full three-world artwork, trail, and achievements belong to B3.

## Current dependency on Lane A

The current A1 barrel provides questions, calibration, initial state, state codecs, and action masks. It does not yet provide the observed-answer transition, saved-artifact validator, or frozen controller. `public/models/q-learning-default.json` is also absent.

`src/app/playRuntime.ts` checks the relative model URL. Missing files, Vite's HTML fallback, unreadable JSON, and network errors produce an honest empty state. A JSON file alone does not unlock Play: Lane A's validator and controller must be connected first. There is no stand-in difficulty policy or browser training in Play.

`src/app/types.ts` describes a Lane B UI port, not an existing Lane A API. Once the actual public API lands, adapt these three operations in `playRuntime.ts`:

- Initialize a session with the selected ability using the core's `initialState`.
- Validate and load the frozen Q-learning artifact, then choose a difficulty from the current state and a supplied policy seed. The core must handle valid-action masks, seeded ties, and its documented unvisited-state fallback.
- Apply the core's observed-correctness transition after each locked answer. The UI passes state, attempted level, and graded correctness. It does not pass the question, answer key, or response time to the controller.

The UI makes a new seeded question after each core decision. Question randomness and policy tie randomness use distinct seed salts. Next waits for the player's intent. The twentieth answer ends the round, with no twenty-first question. The UI never updates Q-values or writes `public/models`.

## Local launch and checks

From `mathquest/`:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. A static faculty URL comes in B6, after the actual playable modes and saved model are ready.

```sh
npm test
node --import tsx src/app/b1.smoke.ts
npm run build
npm run preview
```

At this checkpoint, the production build and all 15 existing core tests passed. The additional B1 smoke checks verify answer disclosure, locked feedback, results metrics with a synthetic fixture, local-storage boundaries and blocked storage, and missing/corrupt/unintegrated model states. These fixtures are test inputs, not experiment results.

Chrome verification on macOS covered landing, setup, correct and incorrect feedback, all six calibration questions, the resulting profile, pause/resume, keyboard controls, duplicate-click and duplicate-key protection, and the missing-model screen. Phone layout was inspected at 390px; the desktop check uses 1280×800. Safari and a real adaptive session still need verification when the integration is ready.

## Data and demonstration boundaries

Settings and completed summaries are saved only if the player opts in. At most ten completed summaries are retained. Unfinished answers and raw question records stay in memory. Reset Local Data removes only the two MathQuest storage keys. If storage is unavailable, the game can still run in the current tab.

Game points are `10 × difficulty` for a correct answer and zero otherwise. They are separate from the academic reward. Calibration does not train a model. The planned browser trainer will be a separate demonstration, and will not replace the submitted model.

During the viva, describe only the functionality and results actually available. The controller chooses challenge; it does not solve questions or generate tutoring text. The simulator and calibration are simplified assumptions, and this project does not establish improved human learning.
