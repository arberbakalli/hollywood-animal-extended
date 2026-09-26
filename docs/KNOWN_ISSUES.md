# Known Issues

Last verified: 2026-09-22

Confirmed, unresolved risks. Each entry has been observed directly â€” in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **Distribution formula is game-file sourced, not inferred.** Week 1 = commercial score Ã— 2 Ã— 1,000;
  Week 2 = commercial score Ã— 1 Ã— 1,000; weeks 3-8 = previous week Ã— 0.8 (20% decay). Extracted
  from the game files and documented in `GAME_RULES.md`. Capacity (owned theatres) is
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
  ties the +25% opening bonus to a production budget over $1,000,000 â€” a different trigger from the
  decay perk above. The calculator has no budget input, so the toggle stands for "my budget
  qualifies".
- **Attendance is deliberately not modelled.** The calculator outputs demand in screenings and
  assumes it is met. The game reports an occupancy percentage instead, computed against
  `localization/English.json:11269` ("400 seats per show") and surfaced as the
  `RELEASE_RESULTS_OCCUPANCY` column. Deriving it needs a viewers model, which exists nowhere in
  `src/` and must not be guessed â€” see Lesson 7 in `.arber/LESSONS_LEARNED.md`.

- **Two TRASH/UNETHICAL tags disagree on gender between `gender` and their own
  `Slots*` parameter.** `ANTAGONIST_HEADLESS_MIDGETS_HYPNOTISTS` and
  `ANTAGONIST_WOMENS_BOOK_CLUB_OF_CANNIBALS` are both `RECIPE`-gated joke
  content. `data/TagData.json`'s `gender` field currently carries the
  `Slots*`-derived value (`M` for both) as the more mechanically authoritative
  source, but this is unconfirmed against the running game. Parked per owner
  request 2026-09-26 — owner has not played/encountered this trash content
  in-game yet. Do not resolve by guessing; see `docs/GAME_RULES.md` §8.

## Behaviour

- A single tag conflict produces two spoiler messages, one from each side â€” for example
  "American Civil War conflicts with Alien" and "Alien conflicts with American Civil War". This is
  current behaviour, captured in the golden-master snapshot and relied on by an E2E assertion.
  Deduplicating it is a deliberate change that will show as a snapshot diff.

## Architecture

- `script.js` is now a ~478-line bridge layer rather than the ~2,000-line monolith this file used to
  describe: behaviour lives in 28 files under `src/`, each an IIFE exposing a `HAC*` namespace, which
  `script.js` re-exports as bare globals. Everything is still a **classic script** â€” they contain no
  `import`/`export` and the load-order constraints in `AGENTS.md` still hold. The module flip itself
  has not happened.
  - They can nonetheless be *imported* by a test: a classic IIFE is valid ESM-importable JavaScript,
    and all 28 import cleanly given a fake DOM. "Classic script" constrains how the browser loads
    them, not whether Node can import them â€” a distinction this file previously blurred, which is
    what made coverage look blocked on the flip.
- The bare-global wrappers in `script.js` look like duplicate implementations and are not. They
  delegate to the `src/` namespace, and removing one breaks every caller of the bare name.
- **The duplication audit was done on 2026-09-22 and came back clean.** All 118 bare globals are
  one-line delegations to a `HAC*` namespace, with no reimplementation anywhere.
  - It did find one dangling wrapper: `removeBlockedLockedPicks` survived in `script.js` after its
    export was deleted, so that bare global called `undefined`. Both suites stayed green because
    nothing calls it â€” a wrapper whose target is gone still parses and still loads, and only fails
    when a user reaches it. `tests/domStructure.test.js` now asserts every `HAC*` call in
    `script.js` resolves to a real export, so this cannot recur silently.
- The flip is larger than the file count suggests: `tests/helpers/legacyHarness.js` runs the classic
  scripts in `node:vm` and reaches bare globals by name, which is exactly what modules remove. It is
  27 conversions **plus** a harness rewrite **plus** 157 `h.call`/`h.evaluate` sites across 18 Jest
  suites, and no partial state is green â€” until all of it lands, Jest has no harness at all.
- The abandoned `generateHighestSynergy` prototype is intentionally parked at
  `docs/parked/generateHighestSynergy.js`. It should stay outside `src/` until it becomes a real
  loaded module again.

## Tooling

- **Coverage is measurable as of 2026-09-23, and the first honest baseline is 31.63% statements,
  41.93% functions** (`npm run test:coverage`). It had read 0% for a long time, which looked like
  "cannot be instrumented" but was really "never reached Jest": the harness read every file with
  `readFile` and evaluated it in `node:vm`. All 17 vm-loaded suites now use `loadInstrumentedApp`,
  which imports the `src/` modules instead. Per-suite test counts were identical before and after.
  - It was **not** blocked by the module flip, as this file previously claimed. That framing made a
    one-file fix look like a 28-file atomic refactor. A classic IIFE is valid ESM-importable
    JavaScript; all 28 `src/` modules import cleanly given a fake DOM.
  - By area: `data` 57.7%, `evaluation` 57.3%, `ui` 35.8%, `marketing` 31.7%, `selectors` 19.7%,
    `library` 16.8%, `generator` 15.4%, `app` 6.5%. The low numbers are honest rather than alarming:
    the Jest suites stub the DOM, so UI wiring is covered by Playwright, which istanbul does not see.
  - `data.js`, `script.js` and `src/app/state.js` are still evaluated rather than imported, because
    they declare globals a module scope would swallow â€” `data.js` uses a top-level `const GAME_DATA`,
    a global *lexical* binding that `globalThis` never exposes and that does not escape an `eval`.
    They are excluded from collection rather than reported as a misleading 0%.
- Bare `npx jest` fails all suites. See `AGENTS.md` for the reason and the workaround.
- There is still no committed formatter or npm `lint` script. A temporary Qodana setup was removed
  because the `qodana-js` linter needs a `QODANA_TOKEN` even for local native scans.
- Achilles was removed from this repo after its self-repair and mutation paths proved able to keep
  weak tests green. Do not reintroduce `achilles-self-repair`, mutation scripts, or test-only
  bypass flags without an explicit owner decision and a reviewed safety contract.

## Graves Evaluation & Best Matches (2026-09-22 work in progress)

- **Pair Analysis band categorization**: The `findGravesPairsByBand()` function groups all element pairs by compatibility band (successful â‰¥4.0, common 2.0-4.0, unsuccessful <2.0). The HTML structure renders these three bands in Pair Analysis panel plus a separate Conflicts panel (diagnostic subset of unsuccessful). Data structure verified but rendering needs CSS styling for green/yellow/red band backgrounds.
- **Swap Suggestions refactor**: `buildSwaps()` now iterates ALL 7 selected elements (not just weakest), finding viable swaps for each. Data structure is `rowsBySlot` organized by element index. Rendering logic updated in `renderSwaps()` to display multiple slots. Jest and the Colman Graves E2E path cover the current behaviour; remaining work is visual polish, not correctness.
- **Starting Tags profile**: When applied, populates manual exclusion list with 193 items (all non-whitelisted; see `GAME_RULES.md` section 5). Graves evaluation uses manual exclusions only, not profile-based filtering, allowing any script evaluation regardless of Starting Tags membership.

## Testing Gaps

- The Jest harness stubs `document` with null-returning selectors, so it exercises no DOM wiring.
  That gap is now covered by the Playwright suite rather than by manual checking, but it means a
  Jest-only run still proves nothing about the interface.
- Coverage is smoke-level by choice: the E2E suite asserts that flows complete and render, not that
  any score is numerically correct, so tuning the maths will not turn it red. The golden-master Jest
  snapshots are what pin the numbers.
- Scenarios in `tests/scenarios/*.feature` tagged `[verified]` or `[unverified]` are not automated.
  An `[unverified]` scenario describes behaviour nobody has watched â€” do not write a test from one
  without reproducing it first.
