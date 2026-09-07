# Known Issues

Last verified: 2026-09-07

Confirmed, unresolved risks. Each entry has been observed directly — in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **The whole `constants.DISTRIBUTION` block in `data.js` is inert.** Nothing anywhere in `src/` or
  `script.js` reads `constants.DISTRIBUTION`. `src/marketing/distributionPlanner.js` re-declares
  every value as its own local: `multipliers.BASE: 1000` against `const BASE = 1000`,
  `WEEKLY_REDUCTION_RATE: 0.8` against `const BASE_DECAY = 0.8`, `NUMBER_OF_WEEKS: 8` against a
  hardcoded loop bound, `ROUND_UP_UNTIL_INDEX: 4` against a hardcoded `index < 4`. Nothing reads
  `REDUCTION_START_INDEX: 2` at all.

  This is worse than dead code: the block reads as authoritative configuration. Editing
  `WEEKLY_REDUCTION_RATE` changes nothing, silently. Either the planner should read the constants —
  the values all match, so that is behaviour-preserving — or the block should go and
  `tests/liveData.test.js` be updated with it. Both are deliberate changes, not cleanup.
- `constants.DISTRIBUTION.defaults.AVAILABLE_SCREENINGS` is `3200`, while the input the user actually
  sees (`#ownedScreeningsInput`) ships `3185`. Picking one is a game-domain call, and it is the one
  value above that does *not* match its counterpart. `tests/liveData.test.js` asserts the divergence,
  so either side moving trips the suite.

## Behaviour

- A single tag conflict produces two spoiler messages, one from each side — for example
  "American Civil War conflicts with Alien" and "Alien conflicts with American Civil War". This is
  current behaviour, captured in the golden-master snapshot and relied on by an E2E assertion.
  Deduplicating it is a deliberate change that will show as a snapshot diff.

## Architecture

- `script.js` is now a ~490-line bridge layer rather than the ~2,000-line monolith this file used to
  describe: behaviour lives in 22 files under `src/`, each an IIFE exposing a `HAC*` namespace, which
  `script.js` re-exports as bare globals. Everything is still a **classic script**, so nothing can
  `import` and the constraints in `AGENTS.md` still hold. The module flip itself has not happened.
- The bare-global wrappers in `script.js` look like duplicate implementations and are not. They
  delegate to the `src/` namespace, and removing one breaks every caller of the bare name.
- A duplication audit of `script.js` against `src/` has not been done since the split.

## Tooling

- Test coverage cannot be measured. `script.js` and `data.js` run through a `node:vm` harness rather
  than being imported, so istanbul cannot instrument them. Coverage becomes available only after the
  module flip.
- Bare `npx jest` fails all suites. See `AGENTS.md` for the reason and the workaround.
- There is no linter or formatter configured.
- `@civitas-cerebrum/achilles` is wired in as `file:../achilles`. A clone without that sibling
  checkout installs *green* — npm symlinks a `file:` path without checking it exists — so the
  absence surfaces at runtime rather than at install. The Playwright reporter is optional and
  degrades cleanly; the achilles-only scripts (`test:e2e:show`, `test:repair`, `test:mutate`) do
  not, and fail without the checkout.

## Testing Gaps

- The Jest harness stubs `document` with null-returning selectors, so it exercises no DOM wiring.
  That gap is now covered by the Playwright suite rather than by manual checking, but it means a
  Jest-only run still proves nothing about the interface.
- Coverage is smoke-level by choice: the E2E suite asserts that flows complete and render, not that
  any score is numerically correct, so tuning the maths will not turn it red. The golden-master Jest
  snapshots are what pin the numbers.
- Scenarios in `tests/scenarios/*.feature` tagged `[verified]` or `[unverified]` are not automated.
  An `[unverified]` scenario describes behaviour nobody has watched — do not write a test from one
  without reproducing it first.
