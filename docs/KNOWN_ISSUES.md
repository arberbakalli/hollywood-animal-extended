# Known Issues

Last verified: 2026-09-07

Confirmed, unresolved risks. Each entry has been observed directly — in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **Distribution formula is game-file sourced, not inferred.** Week 1 = commercial score × 2 × 1,000;
  Week 2 = commercial score × 1 × 1,000; weeks 3-8 = previous week × 0.8 (20% decay). Extracted
  from the game files and documented in `.arber/ENGINEERING_SPECS.md`. The formula uses commercial
  score only; artistic score does not affect distribution. Capacity (owned theatres) is subtracted
  after demand is calculated, splitting it into owned/rented/spare, never changing the demand itself.
- **Behemoth and community-guide modifiers are not in the extracted formula.** The game-file grid is
  simpler than the implementations often inferred from policy text or community guides. If Behemoth or
  other bonuses apply, they must be extracted from game files and cited before shipping, not inferred
  from player reports or policy text. Currently shipping only the extracted base formula.

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
