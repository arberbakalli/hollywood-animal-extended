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
| Colman Graves | 33 | 2 | 0 | Yellow | Core scoring, best matches, pair analysis and exclusion messaging covered. |
| Marketing and Release | 29 | 0 | 0 | Green | Distribution, studio policies, holiday boosts and marketing profile paths covered. |
| Build for Target | 15 | 0 | 0 | Green | Audience/advertiser, exclusions, empty state, ranking and budget covered. |
| Exclusion Dropdown Refresh | 7 | 0 | 0 | Green | Global exclusion propagation covered across contexts. |
| Slider Syncing | 7 | 0 | 0 | Green | Pool-score mapping and max score edge covered. |

Totals: **120 scenario markers** = **118 automated**, **2 verified-only**, **0 unverified**.

## Red-Flag Backlog

These are the only BDD behaviors that are not fully automated yet.

### P1 - Automate Observed Behavior

- `tests/scenarios/colman-graves.feature:275`
  - Scenario: The verdict follows a successful average fit
  - Suggested unit/E2E split: unit test pins score-to-verdict bands; E2E asserts at least one known valid script renders `Success`.

- `tests/scenarios/colman-graves.feature:331`
  - Scenario: All available tags are shown in Best Matches suggestions
  - Suggested E2E: seed one element, generate Best Matches, assert non-starting-deck element can appear when not excluded.

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

3. **Unit coverage map**
   - Tag high-risk pure logic tests by feature:
     - Graves scoring and best matches
     - global exclusions
     - distribution formulas
     - holiday bonuses
     - Build for Target ranking
   - This helps distinguish "covered by unit" from "covered by Playwright."

4. **Cross-feature E2E pack**
   - One small suite for workflows that often break between modules:
     - Script Lab exclusions -> Graves
     - Script Lab exclusions -> Build for Target
     - Graves transfer -> Marketing
     - Script Library saved script -> reload/load -> still usable is already pinned by `TC01-000029`.

## Next Best Move

1. Automate the Graves verdict-band and all-available-tags verified scenarios.
2. Build the unit coverage map for high-risk pure logic.
