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

All eight panels are usable at `testing-features.html`. They are experiments,
not approved changes to the main app's behavior.

| Panel | Demoable behavior | Evidence / limitation |
| --- | --- | --- |
| Release Strategy Lab | Compare eight weeks; toggle Behemoth, Boutique, opening ability and Factory; adjust Factory percentage | Calls `HACDistributionPlanner.weeklyDemandFor`. Factory is illustrative, week one only; 0-100 input range is a sandbox range, not a verified game limit. Observed 11-39% is not encoded as a formula. |
| Advertiser Strategy | Select real tags, lean, audiences and agencies; compare grades, covered/missing/additional audiences and shortlist | Calls `HACAdvertiserMatcher.getRecommendations`, with agencies from `data.js`. Coverage is a union of listed demographics, not measured reach. No profit estimate. |
| Distribution Calibration | Load the owner's 1-ad / 4-ad observations or enter another observation; compare occupied screening equivalents with a supplied demand estimate | Screenings multiplied by attendance is an equivalent, not viewers. Predicted demand is editable: 35,500 uses the existing calculator for 7.1 commercial, Behemoth and opening ability; 34,000 is the owner's reported game suggestion. Observations alone cannot identify causes. |
| Genre Synergy | Choose a primary genre; inspect all ten alternatives and change second share | Bonuses come from `GenrePairs.json`; activation calls the existing compatibility engine at the 35% boundary. Commercial/artistic bonuses are distinct from story-pair fit. At 50/50 the existing engine's data-order tie break applies. |
| Script Diversity | Inspect a Detective candidate batch or paste JSON IDs; collapse reshuffled copies, keep distinct sets and reject malformed/unknown IDs | Main already deduplicates generated results. Lab inspector compares element IDs only; production also includes genre percentages in its signature. The note describes the supplied batch, never claims the entire search space was exhausted. |
| Award Targets | Switch between Box Office Success, Critical Acclaim and Fan Favorites and see each metric and planning guidance | Based on `ACT2_POLISH_HANDOVER.md`; no simulated award cutoff or prediction. |
| Released-Film Tracker | Record films, dates and real elements; persist/reload journal, warn on repeats in 500 days, remove a chosen film | Separate `hac.testing-features.releases.v1` storage key. Warns only; no production freshness writes. Prototype includes day 500 and excludes future films. |
| Unlock Info | Search actual tags and distinguish verified starter availability from missing unlock conditions | Starter facts from `GAME_DATA.starterWhitelist`. Current `TagData.json` and the only available historical version (`07a6ae9`) lack `parameters.Condition`; later dates/recipes remain unknown. |

## Isolation and Files

- `testing-features.html`: isolated page and accessible eight-panel navigation.
- `testing-features.css`: scoped to `.testing-features-page`; shared CSS untouched.
- `lab/testingFeatures.js`: page wiring, real-data loading, safe text rendering.
- `lab/labModel.js`: small pure operations for the lab, imported by its unit tests.
- `tests/testing-features.test.js`: inputs, calibration, campaign coverage,
  uniqueness, journal boundaries and starter facts.
- `tests/e2e/testing-features.spec.js`: TC34-000001 through TC34-000011.

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
Native multiple selects and the JSON editor retain stable editing heights.

1. Extract the actual Factory boost and stacking formula, including building
   eligibility; choose the final slider range only from evidence.
2. Establish advertiser reach, costs, satisfaction and Kinomark effects before
   claiming an optimal profitable mix. Grade and audience fit alone cannot do it.
3. Recover the game's viewers/occupancy model; do not multiply production demand
   by either screenshot's ratio as a correction factor.
4. Decide whether award targets accompany or replace the existing appeal modes,
   and whether they should trigger generation or remain planning guidance.
5. Confirm the journal's 500-day boundary and whether to track calendar dates or
   a rolling film count. Its warning must not silently set freshness.
6. Re-extract original unlock conditions. Recipe and date displays need those
   records, not guessed years or conditions from element names.
7. Review the genre reference placement and percentages-aware diversity UI
   before promoting either into Script Lab.

## Verification Record (2026-10-05)

- `npm test -- --runInBand`: 50 suites, 677 tests and 10 snapshots passed.
- `npx playwright test tests/e2e/testing-features.spec.js tests/e2e/app-shell.spec.js --workers=1 --trace off`: 13 passed.
- After the final lab-only CSS polish,
  `npx playwright test tests/e2e/testing-features.spec.js --workers=1 --trace off`:
  11 passed, with screenshots of every panel at 390px and 1280px.
- Reviewed release, advertiser, genre and diversity screenshots; corrected
  mobile table word breaks, editor-height specificity and dark genre text.
- Both lab JS files passed `node --check`; `git diff --check` passed.
- Existing executable tests, `src/`, `data.js`, `script.js` and shared styling
  were unchanged by this implementation. The earlier branch scaffold adds the
  Main App header link to the lab; no promotion into main was performed.
- Full Playwright suite was not run; verification covers the lab and main shell.

The initial checks caught opening-week floating-point over-rounding, CSS
overriding the native hidden attribute and the main-page module guard. Code and
file placement were corrected; existing tests were preserved. A newly authored
lab unit assertion was changed during implementation from repeating arithmetic
to checking explicit expected values, before establishing the final suite.

## Review and Promotion

Before a feature leaves the lab branch:

- Owner likes the UI in browser.
- Behavior is documented in `docs/GAME_RULES.md`, a feature doc, or BDD.
- Focused Playwright/Jest tests pass.
- The change is small enough to review.
- Any shared-module risk is named in the merge summary.

