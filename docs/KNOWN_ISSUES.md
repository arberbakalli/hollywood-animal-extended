# Known Issues

Original audit: 2026-09-28. Later verification is dated beside each update.

Observed risks and their outcomes. Resolved regressions stay here when the lesson
helps prevent a repeat.

## Resolved Script Lab Control Regression

- **Pool changes left the required-story-element help text stale.** Reproduced
  2026-09-29 in `codex/hardening` on base `3125050`: enter 9 in Max Element Pool
  and leave the field. The target score reads 9, while
  `#genTagsRequiredDisplay` still says "Requires ~5 Story Elements".
  `src/app/appShell.js:173` updates the score fields directly;
  `src/generator/scriptGenerator.js:70` refreshes the help text only on score
  input events. New TC24-000001 cases in
  `tests/e2e/generation-score-transfers.spec.js` originally failed for all three
  modes. Resolved on main: TC24-000001 passed in all three modes during the full
  Playwright run on 2026-10-01. The pool and target now stay one to one.

## Owner bug hunt 2026-09-30

Found by the owner on the live site (main `375e90d`) with one script: Adventure
35% / Science-Fiction 65%, Fantasy Kingdom, Hardened Cynic, Evil Monster, Treasure
Hunt, Long Journey, Evil Transformation, Protagonist Finds Treasure, Max Element
Pool 8, 141 exclusions. None of these was captured before. Fixed on branch
the bug-hunt commits on `main` (replayed onto `02f95cc` on 2026-10-01).
Rulings: `docs/GAME_RULES.md` sections 1 and 2.

| # | Bug | Came in with | Fix |
|---|---|---|---|
| 1 | **Script Lab cannot generate 8 story elements.** Pool 8 sets target 8, and the generator took its count from the target (8 → 7). Counts went 7, then 9. | `60522dc` (2026-09-28, Rating Limit rule) | Generate the pool, never fewer than the target needs |
| 2 | **An Unsuccessful pair gets no Swap slot.** Long Journey × Evil Monster (1.0) was red in Evaluate, but Swap offered nothing for either. A slot appeared only when a swap raised the raw average, and Long Journey fits the rest well enough that none did. Swapping it for Ancient Puzzle clears the clash at the same average. | `d6b9974` (2026-09-06, rank against the whole script) | Every element in an Unsuccessful pair gets a slot that clears the clash |
| 3 | **Swap offers a removed, clashing element back.** After Long Journey was removed, Swap offered Evil Transformation → Long Journey as "+0.11", which restores the 1.0 clash (both rows become spoilers; matrix total −1.03 → −3.53). It looked like stale state; it was the average-only rule. | `d6b9974` | A swap never brings in an Unsuccessful pair |
| 4 | **Best Additions is short with no reason.** 6 story elements at pool 8 listed only Action (a Genre) at 4.0+. Fit widening runs only when the list is empty, so one Genre row stopped it; 11 story elements clear 3.5+. | `2bbb800` (2026-09-22, fit widening) | A note names the free slots and says to lower Minimum Fit |
| 5 | **Generate Scripts rotates instead of listing.** Each click made 5 new random scripts, so seeing more meant clicking again and losing the last five. | `73a7ee8` (2025-12-31, multi-attempt logic) | One click makes 15, shows 5, Show more pages the rest |
| 6 | **Evaluate results outlive the script.** After Evaluate, changing the builder left the old Pair Analysis and Conflicts on screen, still naming a removed Long Journey. Found in the owner's local test. | Evaluate has always drawn once | Hide the panels and ask for a new Evaluate |
| 7 | **Pool and target were not one to one.** The ceiling table was read as a requirement (target 6–8 needed N−1; pool 5–7 targeted pool + 1), so pool 7 showed target 8 and "Requires ~7". A sixth copy of the old minimum sat in the number box (`if (val < 6) val = 6`) and was found only by the 5→10 walk test. | `60522dc` (2026-09-28) and earlier | Pool N = target N = N story elements, 5 to 10 |
| 8 | **The 5–6 row of the Rating Limit table was wrong.** Recorded as Script 6 / Movie 7; the game shows Script 5 / Movie 6. A 5-element script was estimated up to 7.0. | `60522dc` (2026-09-28) | Owner re-read the tooltip 2026-09-30 |
| 9 | **The Genre + button had no cap.** 14 clicks gave 15 Genre rows in Script Lab, Graves and the ban list, although a script holds at most 11. | Never enforced | Stops at 11 rows, re-enabled when a row is removed |
| 10 | **Build for Target suggests clashing scripts.** Audit 2026-09-30: 10-17 of every 20 suggestions held a spoiler pair (1.0 or lower), #2-#4 of the top five included. Ranking reads advertiser fit only. | Build for Target has always ranked this way | Never suggest a pair below 2.0 |
| 11 | **Build for Target cards outlive the inputs.** After Find, changing the pool (5 to 9) or locking Horror left the old cards on screen. | Never handled | Hide the cards and ask for a new Find |
| 12 | **TC24-000001 failed about 1 run in 24.** A generated script stored the raw product (8.910000000000002) while Graves showed 8.9, so the transfer check compared two different scores. The 15-script batch made it show more often. A fix was in progress in another session but is not in the reset history. | Raw scores were always stored | Store each movie score at the tenth the screen shows; 36 of 36 runs pass |

Branch heads when this was logged. **The repository history was reset on
2026-09-30 at 23:02** to one commit, "Initial commit: Hollywood Animal Extended
Calculator" (`62e9c05`), and `main` on GitHub was replaced with it. The
"Came in with" commits above (`60522dc`, `d6b9974`, `2bbb800`, `73a7ee8`) are
from the old history. It survived only in `parked/act-2-polish`, which no longer
exists in any clone checked on 2026-10-06 (owner: delete it), so those hashes
cannot be looked up. The bugs were found on the old `main` at `375e90d`.

| Branch | Head | Note |
|---|---|---|
| `main` / `origin/main` | `bf3b796`+ | Rewritten to `02f95cc` on 2026-10-01, bug-hunt commits replayed on top |
| `claude/bug-hunt-2026-09-30` | same files | Old history; do not merge |
| `parked/act-2-polish` | `935fca3` | Old history, parked until Act 2 |
| `fix/a12-a3-tenths` | gone | Existed only in the old repository |
| `codex/hardening` | gone | Its worktree folder remains, detached from the repository |

## Audit 2026-09-30: open findings

Found by the invariant audit of Script Lab, Evaluate, Build for Target,
Marketing & Release and the Library. Everything fixed is on `main`, one commit
per fix. Still open:

**Owner task (2026-10-01): complete the gender-specific ratings.** The Age &
  Gender Appeal toggle does nothing for 38 of the 49 unisex characters (39 with
  `ANTAGONIST_REBELS`, a group with no gender field that also shows the
  toggle and has no age data), because
`data/TagsToAgeCompatibilityData.json` holds gender-specific ratings for 19
real characters only (its other 10 entries are not in the game, see Data
Correctness); the rest fall back to one rating for both genders. Missing:
- Protagonist (13): HOPELESS_ROMANTIC, OUTCAST, WARRIOR, ACCIDENTAL_HERO,
  LAST_SURVIVOR, WAR_VETERAN, SHERIFFS_CONJOINED_TWINS,
  PARENT_IN_INVISIBLE_CLOTHES, WAYWARD_SOUL, RETIRED_LEGEND,
  CHARISMATIC_CRIMINAL, DIS_IDEALIST, CYNIC
- Antagonist (11): SERIAL_KILLER, HEARTLESS_BUREAUCRAT, ANCIENT_EVIL, ROBOT,
  VENGEFUL_SPIRIT, UNDEAD, WAR_CRIMINAL, OLD_FRIEND_ENEMY, ENEMY_FROM_THE_PAST,
  RULE_ENFORCER, TYRANT
- Supporting Character (14): LOVE_INTEREST, SIDEKICK, ANGRY_BOSS, RIVAL,
  STRICT_PARENT, MENTOR, PARENT_FIGURE, FIRST_VICTIM, MYSTERIOUS_GUIDE,
  ANNOYING_SUITOR, STEPPARENT, STEPCHILD, KEY_WITNESS, VILLAINS_RIGHT_HAND

Once the data is in the file, the toggle works for them with no code change.

**Needs an owner ruling:** after a freshness pill click, the shown scripts keep
their order and a notice says it is out of date. Keep the notice only, or offer
a re-sort?

**Not yet audited:** the freshness order after Show more pages the rest of a
batch. (Moved from the removed `docs/BUG_HUNT_HANDOVER.md`, 2026-10-06.)

**Test note:** TC01-000020 (Reset Locks hides results) never generates first, so
it passes vacuously. TC01-000051 covers the real case; TC01-000020 is unchanged.

## Data Correctness

- **The starting pool may be one short** (found 2026-10-05, owner to check in a
  new game). The game extract gives 58 elements the starting date, written two
  ways: `DATE:>=1929` (50) and `DATE:>=01-01-1929` (8);
  `GAME_DATA.starterWhitelist` in `data.js` has 57. The one
  missing is `EVENTS_JOUSTING_TOURNAMENT` (Theme & Event). GAME_RULES "Starting
  Tags" says 57 and 193 bans, and the tests pin 193, so nothing changes until
  the owner confirms in the game. If Jousting Tournament is available from the
  start, the rule becomes 58 / 192 and each test pinning 193 needs the owner's
  approval by name.
- Not yet analysed: whether perks or buildings change the age-group audience
  effects. (From the removed `extractedFilesFromGameSourceOfTruth/PHASE_3_TODO.md`.)
- **All full data files use the game ids** (checked 2026-10-06):
  `TagCompatibilityData.json` (rows, columns, and every row complete),
  `TagsAudienceWeights.json` and the game extract each hold exactly the 250
  `TagData.json` ids; the English names contain all 250 (among 6,838 keys);
  `GenrePairs.json` holds exactly the 11 genres, every row complete. Guarded by
  `tests/data-ids.test.js`.
- **`data/TagsToAgeCompatibilityData.json` holds 10 characters that are not in the
  game** (found 2026-10-05): `PROTAGONIST_FEMINIST_ACTIVIST`, `_HOUSEWIFE`,
  `_SCHOOLGIRL`, `_WEALTHY_WIDOW`, `_STREET_URCHIN`, `_RIGHTEOUS_ZEALOT`,
  `ANTAGONIST_MYSTERIOUS_STRANGER`, `_SEDUCTRESS`, `_JILTED_LOVER`, `_STALKER`.
  None is in `data/TagData.json`, the full extract or `localization/English.json`,
  and the app never looks them up. Owner ruling: keep them (data that looks unused
  can encode facts) until their origin is known. The same file has no Supporting
  Characters at all; see the owner data task above. Guarded by
  `tests/age-data-ids.test.js`, whose list of unknown ids can only shrink.
- **Fixed 2026-10-05: one spelling for Supporting Character ids.**
  `AgeRoleCompatibility.json` spelled its 17 Supporting Characters
  `SUPPORTING_CHARACTER_*`; the game and every other file use
  `SUPPORTINGCHARACTER_*`. `src/analysis/ageRoleBreakdown.js` rewrote ids before
  every lookup, which hid the drift: a search for the real id found nothing. The
  file now uses the game ids and the rewrite is gone. Guarded by
  `tests/age-data-ids.test.js`.

- **18 character tags have no Age & Gender Appeal rating data at all.**
  `data/AgeRoleCompatibility.json` is missing an entry entirely (not a
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
  > not the source of either `AgeRoleCompatibility.json` or
  > `TagsAudienceWeights.json`.
  >
  > **Do not attempt to derive these 18 tags' ratings from
  > `TagsToAgeCompatibilityData.json` in the game files again — this door
  > is closed, under every interpretation tried so far.** Filling this gap
  > needs real in-game observation (playing and testing appeal per
  > demographic), matching how the rest of
  > `AgeRoleCompatibility.json`'s `"verified"`/`"estimated"` values were
  > evidently produced in the first place, not file extraction.
- **The base distribution curve is not in any game file in this repo.** Week 1 = commercial score
  × 2 × 1,000; week 2 = commercial score × 1 × 1,000; weeks 3-8 = previous week × 0.8 (20% decay).
  This file used to call it game-file sourced. No file under `extractedFilesFromGameSourceOfTruth/`
  or `localization/` contains these numbers. The maths is credited to aalbertinib's Hollywood Animal
  Master (`README.md`), and `SOURCE_OF_TRUTH_MAPPING.md` lists the 0.8 decay as needing in-game
  testing. It stays the app's rule (`GAME_RULES.md` section 4) until an in-game measurement says
  otherwise. Capacity (owned theatres) is subtracted after demand is calculated, splitting it into
  owned/rented/spare, never changing the demand itself.
- **Studio policies are game-file sourced.** Both decay policies are quoted verbatim in the game's
  own string table, which this repo ships: Behemoth at `localization/English.json:12479`
  ("commercial rating above 9") and Boutique at `:12490` ("artistic rating above 9"). Each slows the
  weekly fall by a quarter, 20% to 15%. They are separate policies and a studio can hold both, so
  artistic score DOES now affect distribution, via Boutique. How two active modifiers compose is the
  one part not stated anywhere: the app applies them additively on the fall (20% / 15% / 10%,
  i.e. decay 0.80 / 0.85 / 0.90) on the repository owner's reading, pinned by
  `tests/distribution-boutique.test.js`.
- **Behemoth's +25% boost is gated on budget, not score.** `localization/English.json:12476` ties it
  to a production budget that exceeds $1,000,000. The game string says "first week"; the owner
  ruled on 2026-09-22 that it applies to every week 1-8, since the game shows the Behemoth icon on
  each. The calculator has no budget input, so the toggle stands for "Behemoth, with a budget over
  $1,000,000". The slower-decay perk follows the same toggle, plus commercial 9 and above
  (owner correction, 2026-10-01). A Behemoth studio under the budget line, which in the game
  still gets the slower decay, is not modelled.
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

- **`src/marketing/scriptScoringEngine.js` is reached by no app path** (found
  2026-10-06). None of its eight exports is called by the app; only the
  `script.js` wrappers (lines 348-377) and `tests/scriptScoringEngine.test.js`
  use them (`audienceCompatibility.js` has its own private
  `getCompatibilityElements`). It scores artistic appeal as the mean of a
  script's AF+AM weights and commercial appeal as the mean of TF/TM/YF/YM. Its
  planned UI never landed: top-3 Best Artistic / Best Commercial panels, and
  supporting-character suggestions for audience gaps. Highest Artistic and Highest
  Commercial rank by the movie-score bonus instead (`art`/`com` in
  `src/generator/scriptGenerator.js`). Not a game rule: the owner decides later
  whether to wire the functions up or remove them. (Recorded from the removed
  `docs/FEATURES_1_5_IMPLEMENTATION.md`.)

- `script.js` is now a ~510-line bridge layer rather than the ~2,000-line monolith this file used to
  describe: behaviour lives in 31 files under `src/` (counted 2026-09-28), each an IIFE exposing a `HAC*` namespace, which
  `script.js` re-exports as bare globals. Everything is still a **classic script** â€” they contain no
  `import`/`export` and the load-order constraints in `AGENTS.md` still hold. The module flip itself
  has not happened.
  - They can nonetheless be *imported* by a test: a classic IIFE is valid ESM-importable JavaScript,
    and every one of them imports cleanly given a fake DOM. "Classic script" constrains how the browser loads
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
- The production browser check of 2026-09-28 is incomplete: deployed file
  hashes matched HEAD, but the three-run timing benchmark timed out, so there is
  no complete timing set. (From the removed `TODO.md`.)
- The Google Fonts stylesheet in `index.html` `<head>` delays app start until
  the CDN answers. The test fixture blocks it (251 s with random failures, then
  48 s green), but real players wait on it too. (From the removed
  `ACHILLES-LEARNING.md`.)
- `tools/grade-distribution.mjs` still fails with `HACAdvertiserMatcher is not
  defined`. It loads only `data.js` and `script.js` (lines 32-33), from before
  the code moved to `src/`. Repair it before using it for calibration.
- Bare `npx jest` fails all suites. See `AGENTS.md` for the reason and the workaround.
- There is still no committed formatter or npm `lint` script. A temporary Qodana setup was removed
  because the `qodana-js` linter needs a `QODANA_TOKEN` even for local native scans.
- Achilles was removed from this repo after its self-repair and mutation paths proved able to keep
  weak tests green. Do not reintroduce `achilles-self-repair`, mutation scripts, or test-only
  bypass flags without an explicit owner decision and a reviewed safety contract.

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
- The negative control in `tests/e2e/script-lab.spec.js` (`addStyleTag` on
  `#results-generator`) uses a raw CSS selector on purpose: it is a mutation
  target, not a locator. It must stay in step with the `resultsSection` entry
  in `tests/data/page-repository.json`.
- TC01-000029 (Library save and load round trip) checks that pinned scripts come
  back, not that their exact content does. A stronger assertion is still due.
  (From the removed `TODO.md`.)
- The `[unverified]` scenario "Compatibility: switching to Graves preserves the
  selection" is no longer in any `.feature` file. It was never observed. Re-add
  it as `[unverified]` only if the owner wants it (owner, 2026-10-06).
