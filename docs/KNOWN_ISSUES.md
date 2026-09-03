# Known Issues

Last verified: 2026-09-03

Confirmed, unresolved risks. Each entry has been observed directly — in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- `data.js` declares `DISTRIBUTION.defaults.AVAILABLE_SCREENINGS = 3200`, while the input the user
  actually sees (`#ownedScreeningsInput` in `index.html`) ships `3185`. Neither constant is consumed:
  `updateDistributionGrid` hardcodes its own locals. Resolving this means picking one value, which is
  a game-domain call. `tests/liveData.test.js` asserts the divergence so either side moving trips the
  suite.
- `data.js` declares `weeklyCalculation.REDUCTION_START_INDEX = 2`. Nothing reads it.

## Behaviour

- A single tag conflict produces two spoiler messages, one from each side — for example
  "American Civil War conflicts with Alien" and "Alien conflicts with American Civil War". This is
  current behaviour, captured in the golden-master snapshot. Deduplicating it is a deliberate change
  that will show as a snapshot diff.

## Architecture

- `script.js` is ~2,000 lines and is loaded as a classic script, so it cannot import anything and
  nothing can import it. Every constraint in `AGENTS.md` under "The classic-script constraint" follows
  from this. It is the single highest-leverage thing to change, and the single riskiest.
- A duplication audit of `script.js` has not been done since the `src/` deletion. The previous
  refactor plan identified at least one repeated if/else chain for the tag cap, appearing in both the
  generation and synergy-rendering paths. Re-confirm against the current file before acting on it.

## Tooling

- Test coverage cannot be measured. `script.js` and `data.js` run through a `node:vm` harness rather
  than being imported, so istanbul cannot instrument them. Coverage becomes available only after the
  module flip.
- Bare `npx jest` fails all suites. See `AGENTS.md` for the reason and the workaround.
- There is no linter or formatter configured.

## Testing Gaps

- The harness stubs `document` with null-returning selectors, so no test exercises DOM wiring. Every
  bug fixed in this repository so far was a DOM or lifecycle bug that the suite could not have caught.
  Browser verification is not optional for changes in that territory.
- The three tabs — generator, synergy, advertisers — have no integration coverage. Tab switching,
  search filtering, dropdown population, and exclusion propagation are all manual checks today.
