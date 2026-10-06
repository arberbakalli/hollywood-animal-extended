# Testing Features Lab

Date: 2026-10-05

## Objective

Use `codex/testing-features-lab` as the experimental branch where Codex and
Claude can build planned features with minimal owner interaction. Main remains
the stable production branch.

## Chosen Approach

Use both:

- A branch sandbox: agents can change code, data wiring, UI, tests and docs
  without destabilizing `main`.
- A visible lab page: `testing-features.html`, reachable from the header
  `Testing Features` button, collects prototypes and feature experiments before
  they are promoted.

This avoids pretending a separate page can isolate shared JavaScript behavior.
If a prototype changes shared modules, it is still isolated by the branch.

## Agent Rules

1. Work only on the lab branch unless the owner explicitly says to merge.
2. Build experimental UI in `testing-features.html` or feature-specific files
   first.
3. Shared production modules may be edited on the lab branch, but every such
   edit must be documented as a future merge risk.
4. Once the owner likes a feature, port the smallest approved slice to `main`
   with tests and docs.
5. Do not change tests to make code pass unless the owner approves a behavior
   change.
6. Run focused tests after each feature slice.
7. Keep exact game text and source-of-truth rules intact unless the owner gives
   a new game observation.

## Implemented Prototypes (2026-10-05)

Seven panels are usable at `testing-features.html`. They are experiments,
not approved changes to the main app's behavior.

| Panel | Demoable behavior | Evidence / limitation |
| --- | --- | --- |
| Release Strategy Lab | Show eight weeks of demand; toggle Behemoth, Boutique, opening ability and optional Factory estimate | Calls `HACDistributionPlanner.weeklyDemandFor` for the baseline. A user-set 0-100% Factory estimate adjusts week one only; this range is a lab control, not a verified game limit. Owner feedback says real Behemoth/Boutique + good audience targeting may decay much slower than the current calculator. |
| Advertiser Strategy | Keep movie lean, desired audiences and campaign advertiser selection; show audience gaps | Coverage is a union of listed agency demographics, not measured reach. No hidden sample script, fit table or profit estimate. Main-app recommendations remain separate. |
| Distribution Calibration | Load the owner's 1-ad / 4-ad observations or enter another observation; compare occupied screening equivalents with a supplied demand estimate | Screenings multiplied by attendance is an equivalent, not viewers. Predicted demand is editable: 35,500 uses the existing calculator for 7.1 commercial, Behemoth and opening ability; 34,000 is the owner's reported game suggestion. Observations alone cannot identify causes. |
| Genre Synergy | Choose a primary genre; inspect all ten alternatives, change second share, see best commercial/artistic pair summaries, and explore story-element pairings | Bonuses come from `GenrePairs.json`; direct story-element scores come from `TagCompatibilityData.json` through the production pair-score function. The 2.5 MB compatibility file loads only when this panel opens. At 50/50 the existing engine's data-order tie break applies. |
| Award Targets | Show Box Office Success, Critical Acclaim and Fan Favorites together; attach a movie idea, year, target and elements to a planning memo | Based on `ACT2_POLISH_HANDOVER.md`; no simulated award cutoff or prediction. |
| Released-Film Tracker | Record films, dates and real elements; persist/reload journal, warn softly on repeats in 500 days, remove a chosen film | Idea still in debate. Separate `hac.testing-features.releases.v1` storage key. Unreadable saved data blocks writes rather than being overwritten. Calendar days may not map to game freshness pips. |
| Unlock Info | Filter by category, search actual tags and distinguish starter, date, recipe, starting-recipe and Trash King policy unlock conditions | Starter facts from `GAME_DATA.starterWhitelist`; recovered conditions come from `extractedFilesFromGameSourceOfTruth/TagData.json`. Main `data/TagData.json` still does not carry those conditions. |

## Owner Feedback Applied (2026-10-05)

- **Keep / polish:** Distribution Calibration. The observed attendance gap is useful
  because it helps players reason about screening capacity.
- **Keep / polish:** Genre Synergy. The table taught the 35% second-genre
  threshold; add best commercial/artistic summaries so the owner does not need
  to check each row manually.
- **Change shape:** Release Strategy should show only week and demand. Factory
  scenario/difference columns were noise. Current later-week decay may be wrong
  when Behemoth, Boutique and strong audience targeting all line up.
- **Change shape:** Award Targets should show all three goals together and let
  the owner attach a movie idea/year/elements to the target.
- **Change shape:** Unlock Info now uses recovered game-source conditions for
  starter, date, recipe, starting-recipe and Trash King policy unlocks. Keep
  quest/NPC claims out until a source file proves those exact gates.
- **Rejected as standalone:** Script Diversity. The useful behavior is the
  result-list guard: generated scripts that are the same set in a different
  order should collapse wherever generation happens.
- **Needs redesign:** Advertiser Strategy. Movie lean is promising, but the
  visible all-elements selector was bad UI. Fit grade alone is not enough for
  profit; future work needs advertiser count/reach/cost evidence.
- **Still baking:** Released-Film Tracker. It may become a yearly slate planner
  with pinned elements and repeat cycles, but calendar-day warnings should not
  pretend to be confirmed freshness truth.

## Pairing Insight and Reuse Review

Genre Synergy now has a searchable, category-filtered element table. It shows
the selected genre's direct 0-5 pair score, successful and unsuccessful pairs
against the available story elements that fit that genre at 4+, and each
element's successful/unsuccessful matches across all eleven genres. The default
ranking prioritizes elements with successful genre fit and the most strong
story-element pairs. The alternate cross-genre view ranks broader usefulness.
The caption names the pool behind each count, and category/search filters do
not silently redefine that comparison pool. The summary
counts successful (4+) and unsuccessful (<2) direct pairs for the current
filter. These are game-data edges, not whole-script scores or observed film
success. Stored Script Lab exclusions are removed from the available pool.

The current compatibility JSON is already an adjacency matrix. A second
cached graph would duplicate 2.5 MB of source data and add invalidation work;
the lab queries the existing matrix through `HACCompatibilityEngine`. A small
edge-list view could be useful later for graph visualization, but is not a
prerequisite for this table. No historical frequency or outcome data exists to
claim an element is popular or profitable.

Script Lab already deduplicates generated scripts with a sorted signature that
includes genre percentages (`src/generator/scriptGenerator.js`). Build for
Target already deduplicates combinations by sorted IDs
(`src/marketing/targetedAds.js`). Graves ranks individual additions and swaps,
not whole scripts, so applying script-set dedup there would solve a different
problem. The lab guard remains a demonstration of the rule, not a second
production implementation. The lab's `table` and `lab-mini-card` renderers
already cover repeated presentations; no broader rendering abstraction is
justified yet.

Tag names and categories come from `TagData.json` and localization. Exclusions
come from the persisted Script Lab store. The release journal deliberately uses
its own key because the game's freshness timing is not confirmed; it must not
write to production freshness state.

Lessons applied during this pass:

- A `Set` compares object identity. Sorted ID signatures are required to collapse
  reordered scripts; production signatures must retain genre percentages.
- Reference tables can show unavailable elements, but best-pair recommendations
  must honor exclusions and identify unavailable reference rows.
- Cross-genre counts and within-genre story-pair counts answer different player
  questions. Show the comparison pool instead of implying a movie prediction.
- Lazy data readiness needs an explicit loaded flag: the initial empty
  compatibility object is truthy. Cache the pending request, and allow a failed
  request to retry without blocking unrelated panels.
- An automated BDD marker must assert every meaningful result. This pass added
  explicit best-pair, award-memo and exclusion assertions.
- Screenshots must wait for asynchronous results. A visible panel alone can
  still be loading, so the full-page capture can miss the table below it.

| Feature | Current decision | Promotion condition |
| --- | --- | --- |
| Distribution Calibration | Production candidate | Preserve the distinction between screening equivalents and viewers. |
| Genre Synergy and pairing insight | Production candidate | Owner reviews placement and the exploratory 15-row limit. |
| Release Strategy | Lab calibration tool | Recover Factory range/stacking and later-week demand behavior before promotion. |
| Advertiser Strategy | Change shape | Recover reach, costs and Kinomark effects before claiming a profitable mix. |
| Award Targets | Lab planning tool | Decide whether goals remain notes or affect generation. |
| Released-Film Tracker | Parked | Confirm the in-game freshness clock and whether a yearly slate is useful. |
| Unlock Info | Lab reference | Confirm ambiguous date conditions and any quest/NPC gates before promotion. |

## Isolation and Files

- `testing-features.html`: isolated page and accessible seven-panel navigation.
- `testing-features.css`: scoped to `.testing-features-page`; shared CSS untouched.
- `lab/testingFeatures.js`: page wiring, real-data loading, safe text rendering.
- `lab/labModel.js`: small pure operations for the lab, imported by its unit tests.
- `tests/testing-features.test.js`: inputs, calibration, campaign coverage,
  journal boundaries and unlock facts.
- `tests/e2e/testing-features.spec.js`: TC34 lab behavior tests.

The lab uses ESM on its own page. Its modules intentionally live outside `src/`:
the existing `domStructure` guard reserves that tree for modules loaded by
`index.html`. No existing test or production module was changed to bypass it.
The page loads four existing classic scripts; their game data belongs to that
page's window and cannot mutate the main page's in-memory state. The lab journal
uses a separate storage key. Loading failure shows a retry button before tools
become available. Rendering user film titles uses text nodes, never HTML.

## Open Product Decisions Before Promotion

Lab CSS keeps the app's dark surfaces, commercial gold and artistic lavender.
Genre reference labels use a lighter text tint for contrast and an exact-palette
left marker. Shared palette tokens are unchanged. Tables scroll within their
own wrapper on narrow screens; labels are not broken mid-word to force a fit.
Native multiple selects retain stable editing heights.

1. Extract the actual Factory boost and stacking formula separately before
   considering a future distribution feature; do not infer it from this lab.
2. Establish advertiser reach, costs, satisfaction and Kinomark effects before
   claiming an optimal profitable mix. Grade and audience fit alone cannot do it.
3. Recover the game's viewers/occupancy model; do not multiply production demand
   by either screenshot's ratio as a correction factor.
4. Decide whether award targets accompany or replace the existing appeal modes,
   and whether they should trigger generation or remain planning guidance.
5. Confirm the journal's 500-day boundary and whether to track calendar dates or
   a rolling film count. Its warning must not silently set freshness.
6. Confirm whether any recipe gates are also quest/NPC-gated in another source
   file. The current lab shows only recovered `TagData.json` conditions.
7. Review the genre reference placement before promoting it into Script Lab.

## Phase 1 Corrections (2026-10-06)

- Release Strategy now displays production week/demand values without a Factory
  scenario. The Behemoth/Boutique decay warning remains because that behavior
  still needs game evidence.
- Advertiser Strategy compares campaign demographics and movie lean without
  scoring invisible sample elements or showing a static fit table. Exclusions
  elsewhere cannot erase campaign coverage here.
- The rejected Unique Result Guard tab and its lab-only helper were removed.
  Script Lab and Build for Target already deduplicate generated sets in their
  production result paths. `tests/generator-unique-results.test.js` protects
  Script Lab set-level uniqueness. Build for Target still needs an equally
  direct set-level regression; its current tests only check distinct tags
  within a combination. TC34-000006 and its lab scenario were retired; no
  production dedup code was changed.
- An unreadable release journal now blocks new writes and preserves the
  original localStorage value. Storage-write failure reports an error.
- Cross-genre counts omit excluded genres. Award memos reject invalid years.
  Unlock choices are grouped by category; recovered date and recipe conditions
  are shown without raw source strings. Odd date forms remain explicitly unclear.
- The full 145 KB recovered tag extract stays loaded once with the other lab
  data so Unlock Info can show all 250 known conditions without a second fetch.
  The 58 starting conditions in that extract differ from the main app's
  57-element starting whitelist; the lab does not change the main-app rule.

## Factory Estimate Restored (2026-10-06)

Owner chose to keep Factory as a lab experiment despite its unknown game range.
The switch enables a 0-100% slider; the selected percentage changes week-one
screening demand only. Turning it off restores the production baseline. The
table still has only Week and Demand columns, and no factory estimate changes
the main app's distribution calculation. TC34-000002 and the lab model tests
cover the toggle, range examples and unchanged later weeks.

The verification record below documents the earlier eight-panel build; it is
historical, not the current lab state.

## Verification Record (2026-10-05)

- Final `npm test -- --runInBand`: 50 suites, 679 tests and 10 snapshots passed.
- Final `npx playwright test tests/e2e/testing-features.spec.js tests/e2e/app-shell.spec.js --workers=1 --trace off`:
  20 passed (18 lab tests and two main-shell tests), including the tied-pair follow-up.
- Screenshots of all eight panels at 390px and 1280px were reviewed. Corrected
  mobile table word breaks, editor-height specificity, dark genre text,
  clipped table captions and oversized calibration buttons. Tables deliberately
  scroll horizontally on mobile; the page itself must not overflow.
- All 16 automated lab BDD scenarios were traced to meaningful executable
  assertions. Coverage includes real pairing scores/counts, recommendation
  exclusions, award memo content, persistence, failed loading and retry.
- TC34-000014 also verifies that the compatibility matrix is loaded lazily
  once and reused, rather than fetched again on every filter change.
- Both lab JS files passed `node --check`; `git diff --check` passed.
- Existing production executable tests, `src/`, `data.js`, `script.js` and shared styling
  were unchanged by this implementation. The earlier branch scaffold adds the
  Main App header link to the lab; no promotion into main was performed.
- Full Playwright suite was not run; verification covers the lab and main shell.

The initial checks caught opening-week floating-point over-rounding, CSS
overriding the native hidden attribute and the main-page module guard. Code and
file placement were corrected; existing tests were preserved. A newly authored
lab unit assertion was changed during implementation from repeating arithmetic
to checking explicit expected values, before establishing the final suite.

Owner-approved lab behavior changed the lab scenarios and their corresponding
assertions. The final QA pass strengthened the later-week, best-genre and award
memo assertions; no production test expectation was changed.

The implementation is ready for owner review, not automatic production
promotion. The seven-feature decision table above and open product decisions
remain the handoff checklist. Claude can investigate missing game data in a
separate worktree; production formulas must not be inferred from these lab
observations.

## Tied Genre Recommendations

Best commercial and artistic summaries show every available pair tied for the
highest respective bonus, in alphabetical order. For Drama, Comedy and Romance
both give +0.25 commercial and both appear. Exclusions remove a pair from these
recommendations, not from the reference table. TC34-000018 protects this behavior.

After this addition, the lab Playwright suite passed all 18 tests, including
desktop/mobile screenshots. Focused Jest checks (lab helpers, BDD markers and
E2E IDs) passed all 30 tests across three suites. Existing assertions were kept.

## Goal Completion Evidence

| Goal requirement | Evidence |
| --- | --- |
| Inspect before rebuilding | Existing lab panels and owner feedback are retained; changes are documented above. |
| Consistent desktop/mobile UI | Scoped lab CSS; all eight panels captured at 390px and 1280px in TC34-000011 and visually reviewed. |
| Classify all prototypes | Eight-feature decision table with promotion conditions. |
| Useful helpers, dedup and exclusions | Canonical signatures in `uniqueScripts`; existing production dedup inspected; TC34-000006, 000012, 000013 and 000016 cover lab behavior. |
| Reuse and optimization review | Pairing Insight and Reuse Review; production scorer reused; lazy matrix loading asserted by TC34-000014. |
| Strong/unsuccessful and cross-genre insight | `rankGenreElements`, real-data Jest assertions, TC34-000012 and 000017. |
| Best commercial/artistic recommendations | Real genre bonuses and threshold checks in TC34-000005; ties and exclusions in TC34-000018. |
| Honest calibration claims | Release/calibration panels, TC34-000002/000003/000004, and open product decisions; production formulas unchanged. |
| Documentation and behavior scenarios | This document, Claude handoff prompt and 16 automated lab scenarios. |
| Verification | 679 full Jest tests before the tie follow-up; 30 focused Jest tests after it; latest 20 lab/main-shell Playwright tests. |
| Clean, reviewable branch | Diff and syntax checks pass; local commit awaits explicit owner approval. No push or merge. |

The goal remains active only for the final clean-branch step. Product promotion
and missing game-data research are explicitly separate follow-up decisions,
not claims that the prototypes model those unknowns already.

## Review and Promotion

Before a feature leaves the lab branch:

- Owner likes the UI in browser.
- Behavior is documented in `docs/GAME_RULES.md`, a feature doc, or BDD.
- Focused Playwright/Jest tests pass.
- The change is small enough to review.
- Any shared-module risk is named in the merge summary.

