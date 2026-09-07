# Known Issues

Last verified: 2026-09-07

Confirmed, unresolved risks. Each entry has been observed directly — in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **The distribution demand curve has no verified provenance.** The maths is adapted from
  aalbertinib's Hollywood Animal Master (credited in `README.md`), imported wholesale in `65c7cf5`.
  The `x 1000` base, the week-one `x2` and the 0.8 decay are not derived anywhere in this repo and
  are not extracted game data — `data/` holds tag compatibility and per-tag demographic weights,
  which describe *who* the audience is, not how many screenings a film needs. Only the game itself
  can settle whether the curve is right. The capacity split built on top of it is independently
  correct; the curve it splits is inherited on trust.
- **Behemoth's week-two lift is an unverified inference.**
  `BASE_WEEK_TWO_RETENTION` is 0.5 because week two's demand is half of week one's. That now holds
  exactly, since both are seeded from the score before capacity is subtracted.
  `easedRetention(0.5) / 0.5` then lifts week two by 1.25 when the decay bonus is active. Whether
  1.25 matches the game is unverified — `.arber/ENGINEERING_SPECS.md` records it as an inference
  shipped behind a toggle. To check: with Behemoth active and a commercial rating above 9, read
  week 3 divided by week 2 in game.

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
