# Known Issues

Last verified: 2026-09-22

Confirmed, unresolved risks. Each entry has been observed directly â€” in the running app, in test
output, or in the source. Completed work and handoff notes are intentionally excluded.

## Data Correctness

- **18 character tags have no Age & Gender Appeal rating data at all.**
  `data/age-role-compatibility.json` is missing an entry entirely (not a
  drifted one — see the gender-lock entry below for that) for:
  `PROTAGONIST_CHARISMATIC_CRIMINAL`, `PROTAGONIST_CYNIC`,
  `PROTAGONIST_DIS_IDEALIST`, `PROTAGONIST_LAST_SURVIVOR`,
  `PROTAGONIST_RETIRED_LEGEND`, `ANTAGONIST_ENEMY_FROM_THE_PAST`,
  `ANTAGONIST_OLD_FRIEND_ENEMY`, `ANTAGONIST_PATRIARCH`,
  `ANTAGONIST_ROBBER_WITH_A_HUNDRED_DICKS`, `ANTAGONIST_RULE_ENFORCER`,
  `ANTAGONIST_TYRANT`, `ANTAGONIST_UNDEAD`, `ANTAGONIST_VENGEFUL_SPIRIT`,
  `SUPPORTINGCHARACTER_CONCERNED_WIFE`, `SUPPORTINGCHARACTER_FIRST_VICTIM`,
  `SUPPORTINGCHARACTER_KEY_WITNESS`, `SUPPORTINGCHARACTER_MYSTERIOUS_GUIDE`,
  `SUPPORTINGCHARACTER_VILLAINS_RIGHT_HAND`. Selecting any of these in Script
  Lab shows `-` for all three age columns in the panel — expected given no
  data, not a rendering bug. Inventing ratings for these is explicitly out of
  scope without owner-supplied source data; do not fabricate them.
  Pinned by `tests/age-role-breakdown.test.js`'s two `KNOWN_MISSING_ENTRIES`
  tests, which fail if this list grows without being updated deliberately.

  > **2026-09-27 investigation, dead end — do not retry this exact approach.**
  > The Steam install's own
  > `StreamingAssets\Data\Configs\TagsToAgeCompatibilityData.json` does have
  > all 18 tags, each as an 8-value `"ageCompatibility"` array
  > (`"3.000"`-style strings, whole numbers only, no schema/legend file
  > anywhere in the game files). It looked promising because our repo's
  > `data/TagsToAgeCompatibilityData.json` shares that exact filename and
  > already has 6-value (`YOUNG_M`/`YOUNG_F`/`MID_M`/`MID_F`/`OLD_M`/`OLD_F`)
  > entries for other tags — a same-source, finer-granularity dataset was a
  > reasonable hypothesis. Tested it by pulling the raw 8-value array for 3
  > tags we already have correct 6-value data for
  > (`PROTAGONIST_COWBOY`, `PROTAGONIST_WHITE_COLLAR`, `PROTAGONIST_SHERIFF`)
  > and exhaustively checking every single-index copy and every 2-index
  > average against all 3 simultaneously: **zero exact matches**, and even
  > loosened to best-fit-with-error, the best-fit index pairs were
  > incoherent across fields (no consistent age/gender partition of the 8
  > slots emerged). Conclusion: this raw file and our repo's file of the
  > same name are very likely two independent datasets, not the same data
  > at different granularity. Nothing was written to either data file
  > based on this — fabricating a transform that doesn't hold would put
  > fake numbers in front of a `data_source` field that claims
  > `"verified"`/`"estimated"` provenance.
  >
  > **Re-tested 2026-09-27 with 19 tags instead of 3 — conclusively
  > unrelated, not just a weak fit.** `AgeSubGroups.json` defines 5 age
  > tiers by real age range (`YOUNG_1` 18-25, `YOUNG_2` 25-35, `MID_1`
  > 35-45, `MID_2` 45-55, `OLD` 55+) with marriage/divorce/birthrate
  > probabilities per tier — this is a **character life-simulation system**
  > (actor aging, marrying, having children), a different game mechanic
  > entirely from audience demographic appeal, and has no gender field at
  > all. The 19-tag re-test still found no exact match and no tight
  > best-fit (0.37-0.87 average error per field on a 1-5 scale — too loose
  > to be a real relationship). The decisive proof: `ANTAGONIST_EVIL_MONSTER`,
  > `ANTAGONIST_ALIEN`, `ANTAGONIST_ENEMY_ARMY`, and
  > `ANTAGONIST_BARBARIAN_TRIBE` all have the **identical** flat raw array
  > `[3,3,3,3,3,3,3,3]` in the game file, yet our repo's 6-value data for
  > all four is different from each of the others. Any consistent formula
  > (copy, average, weighted sum — anything) applied to identical input
  > must produce identical output; it doesn't here. These two datasets are
  > not the same data at different granularity — they are independently
  > authored. The raw file's flat array for these four looks like an
  > unused default in the game's own data.
  >
  > **Also tested: maybe the 8 values are audience-shaped (TF/TM/YF/YM/AF/AM,
  > like `data/TagsAudienceWeights.json`), not age-shaped.** Same result. Even
  > setting aside the scale mismatch (weights run -5 to +5, the raw array
  > runs 1 to 5), the same four flat-`[3,3,3,3,3,3,3,3]` tags have four
  > different sets of values in `TagsAudienceWeights.json` too — the
  > identical-input-must-give-identical-output proof holds regardless of
  > which of our two existing per-tag datasets you compare the raw array
  > against. Whatever those 8 numbers mean in the game's own terms, they are
  > not the source of either `age-role-compatibility.json` or
  > `TagsAudienceWeights.json`.
  >
  > **Do not attempt to derive these 18 tags' ratings from
  > `TagsToAgeCompatibilityData.json` in the game files again — this door
  > is closed, under every interpretation tried so far.** Filling this gap
  > needs real in-game observation (playing and testing appeal per
  > demographic), matching how the rest of
  > `age-role-compatibility.json`'s `"verified"`/`"estimated"` values were
  > evidently produced in the first place, not file extraction.
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
