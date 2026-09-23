# Feature Test Coverage Matrix

Date: 2026-09-23

## QA Term

The red-flag term is **test coverage gap**. The stronger product/QA term is
**requirements traceability gap**: a product behavior exists, but its path from
BDD requirement to unit/integration/E2E protection is incomplete.

Use this file as the heat map for "we have ten features, six are heavily tested,
four are risky."

## Current Heat Map

Source: `tests/scenarios/*.feature` markers.

| Feature area | Automated | Verified only | Unverified | Heat | Notes |
| --- | ---: | ---: | ---: | --- | --- |
| App Shell | 5 | 0 | 0 | Green | Tabs, language, boot failure, retry, rapid tab switching covered. |
| Script Lab | 29 | 0 | 0 | Green | Strong UI, Script Library and exclusion coverage. |
| Colman Graves | 35 | 0 | 0 | Green | Core scoring, verdict bands, best matches, pair analysis and exclusion messaging covered. |
| Marketing and Release | 29 | 0 | 0 | Green | Distribution, studio policies, holiday boosts and marketing profile paths covered. |
| Build for Target | 15 | 0 | 0 | Green | Audience/advertiser, exclusions, empty state, ranking and budget covered. |
| Exclusion Dropdown Refresh | 7 | 0 | 0 | Green | Global exclusion propagation covered across contexts. |
| Slider Syncing | 7 | 0 | 0 | Green | Pool-score mapping and max score edge covered. |

Totals: **120 scenario markers** = **120 automated**, **0 verified-only**, **0 unverified**.

## Red-Flag Backlog

None at BDD marker level. Every scenario is now marked `[automated]`.

## Missing Feature-Level Tests Worth Adding

These are not necessarily BDD gaps, but they would harden feature behavior.

1. **Traceability guard**
   - Implemented in `tests/featureScenarioMarkers.test.js`.
   - The test pins the current `[verified]` and `[unverified]` backlog by scenario name.
   - If a new weak marker appears, or one is resolved without updating this matrix, the test fails and forces an explicit QA decision.

2. **BDD-to-test ID honesty**
   - Implemented in `tests/featureScenarioMarkers.test.js`.
   - Any full `TCxx` id cited by a BDD feature file must exist in an E2E spec.
   - This catches fake `[automated] TC...` markers without forcing every automated unit-backed scenario to cite an E2E id.

3. **Cross-feature E2E pack**
   - One small suite for workflows that often break between modules:
     - Script Lab exclusions -> Graves
     - Script Lab exclusions -> Build for Target
     - Graves transfer -> Marketing
     - Script Library saved script -> reload/load -> still usable is already pinned by `TC01-000029`.

## Unit Coverage Map

| Logic area | Primary unit coverage | What it protects |
| --- | --- | --- |
| Graves scoring and verdicts | `tests/graves.test.js`, `tests/graves-conflicts.test.js` | Required category validation, element budget, movie score breakdown, verdict thresholds, pair bands, conflict severity. |
| Graves Best Matches | `tests/graves-best-matches.test.js` | Paging, band order, mode switching, global exclusion use, non-starter suggestions, pool limits, Add vs Swap labels. |
| Global exclusions | `tests/exclusion-store.test.js`, `tests/lock-exclude-logic.test.js`, `tests/scoringCore.test.js` | Shared ban list, locked/excluded interactions, Starting Tags whitelist and dropdown availability rules. |
| Script generation rules | `tests/lock-exclude-logic.test.js`, `tests/genre-mix-validation.test.js`, `tests/slider-syncing.test.js`, `tests/scoringCore.test.js` | Required categories, genre mix/cardinality, score-to-pool text, scoring element counts. |
| Marketing and distribution formulas | `tests/distribution-behemoth.test.js`, `tests/distribution-boutique.test.js`, `tests/distribution-edge-cases.test.js`, `tests/holiday-release.test.js` | Commercial-only screening requirements, week-one boosts, boutique caps, holiday timing. |
| Build for Target and advertisers | `tests/advertisers.test.js`, `tests/build-for-target.test.js`, `tests/distribution-studio-policy-status.test.js` | Audience ranking, budget filters, exclusion propagation, studio policy state. |

## Next Best Move

1. Run a full Playwright smoke pass after Claude's pending `.achilles` work settles.
2. Decide whether the untracked `extractedFilesFromGameSourceOfTruth/README.md` should be committed, rewritten, or deleted.
