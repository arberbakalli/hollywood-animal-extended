# Known Issues

Last verified: 2026-09-22

Confirmed, unresolved risks. Each entry has been observed directly — in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **Distribution formula is game-file sourced, not inferred.** Week 1 = commercial score × 2 × 1,000;
  Week 2 = commercial score × 1 × 1,000; weeks 3-8 = previous week × 0.8 (20% decay). Extracted
  from the game files and documented in `.arber/ENGINEERING_SPECS.md`. Capacity (owned theatres) is
  subtracted after demand is calculated, splitting it into owned/rented/spare, never changing the
  demand itself.
- **Studio policies are game-file sourced.** Both decay policies are quoted verbatim in the game's
  own string table, which this repo ships: Behemoth at `localization/English.json:12479`
  ("commercial rating above 9") and Boutique at `:12490` ("artistic rating above 9"). Each slows the
  weekly fall by a quarter, 20% to 15%. They are separate policies and a studio can hold both, so
  artistic score DOES now affect distribution, via Boutique. How two active modifiers compose is the
  one part not stated anywhere: the app applies them additively on the fall (20% / 15% / 10%,
  i.e. decay 0.80 / 0.85 / 0.90) on the repository owner's reading, pinned by
  `tests/distribution-boutique.test.js`.
- **Behemoth's week-one boost is gated on budget, not score.** `localization/English.json:12476`
  ties the +25% opening bonus to a production budget over $1,000,000 — a different trigger from the
  decay perk above. The calculator has no budget input, so the toggle stands for "my budget
  qualifies".
- **Attendance is deliberately not modelled.** The calculator outputs demand in screenings and
  assumes it is met. The game reports an occupancy percentage instead, computed against
  `localization/English.json:11269` ("400 seats per show") and surfaced as the
  `RELEASE_RESULTS_OCCUPANCY` column. Deriving it needs a viewers model, which exists nowhere in
  `src/` and must not be guessed — see Lesson 7 in `.arber/LESSONS_LEARNED.md`.

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
- Qodana is configured for JetBrains inspections in `qodana.yaml`, but the `qodana-js` linter needs
  a `QODANA_TOKEN` even for local native scans. There is still no formatter or npm `lint` script.
- `@civitas-cerebrum/achilles` is wired in as `file:../achilles`. A clone without that sibling
  checkout installs *green* — npm symlinks a `file:` path without checking it exists — so the
  absence surfaces at runtime rather than at install. The Playwright reporter is optional and
  degrades cleanly; the achilles-only scripts (`test:e2e:show`, `test:repair`, `test:mutate`) do
  not, and fail without the checkout.

## Graves Evaluation & Best Matches (2026-09-22 work in progress)

- **Pair Analysis band categorization**: The `findGravesPairsByBand()` function groups all element pairs by compatibility band (successful ≥4.0, common 2.0-4.0, unsuccessful <2.0). The HTML structure renders these three bands in Pair Analysis panel plus a separate Conflicts panel (diagnostic subset of unsuccessful). Data structure verified but rendering needs CSS styling for green/yellow/red band backgrounds.
- **Swap Suggestions refactor**: `buildSwaps()` now iterates ALL 7 selected elements (not just weakest), finding viable swaps for each. Data structure is `rowsBySlot` organized by element index. Rendering logic updated in `renderSwaps()` to display multiple slots. Jest and the Colman Graves E2E path cover the current behaviour; remaining work is visual polish, not correctness.
- **Starting Tags profile**: When applied, populates manual exclusion list with ~139 items (all non-whitelisted). Graves evaluation uses manual exclusions only, not profile-based filtering, allowing any script evaluation regardless of Starting Tags membership.

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
