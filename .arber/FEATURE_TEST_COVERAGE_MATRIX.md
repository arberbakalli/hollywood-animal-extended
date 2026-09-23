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
| Script Lab | 28 | 1 | 0 | Yellow | Strong UI and exclusion coverage; one lock/exclude conflict message is only observed. |
| Colman Graves | 31 | 3 | 1 | Yellow/Red | Core scoring, best matches, pair analysis covered; one UX decision still parked. |
| Marketing and Release | 27 | 2 | 0 | Yellow | Distribution heavily covered; two Behemoth scenarios are still marked verified-only. |
| Build for Target | 15 | 0 | 0 | Green | Audience/advertiser, exclusions, empty state, ranking and budget covered. |
| Exclusion Dropdown Refresh | 7 | 0 | 0 | Green | Global exclusion propagation covered across contexts. |
| Slider Syncing | 7 | 0 | 0 | Green | Pool-score mapping and max score edge covered. |

Totals: **120 scenario markers** = **113 automated**, **6 verified-only**, **1 unverified**.

## Red-Flag Backlog

These are the only BDD behaviors that are not fully automated yet.

### P0 - Product Decision Needed

- `tests/scenarios/colman-graves.feature:143`
  - Scenario: Graves explains when excluded Settings are unavailable
  - Gap: behavior is still `[unverified]`.
  - Decision needed: show a small explanatory message, or rely on users learning that exclusions are global.
  - Suggested test once decided: Playwright flow where Script Lab excludes a Setting, Graves Setting picker hides it, and any explanatory notice either appears or is explicitly not expected.

### P1 - Automate Observed Behavior

- `tests/scenarios/colman-graves.feature:263`
  - Scenario: Banning an element removes it from the Graves script and says so
  - Suggested E2E: select an element in Graves, ban it from Script Lab, return to Graves, assert the selected row is gone and the feedback names the removed element.

- `tests/scenarios/script-lab.feature:239`
  - Scenario: Locking an element that becomes excluded drops it with a message
  - Suggested E2E: lock a tag, exclude that same tag, assert lock is removed and feedback names the dropped lock.

- `tests/scenarios/colman-graves.feature:275`
  - Scenario: The verdict follows a successful average fit
  - Suggested unit/E2E split: unit test pins score-to-verdict bands; E2E asserts at least one known valid script renders `Success`.

- `tests/scenarios/colman-graves.feature:331`
  - Scenario: All available tags are shown in Best Matches suggestions
  - Suggested E2E: seed one element, generate Best Matches, assert non-starting-deck element can appear when not excluded.

- `tests/scenarios/marketing-release.feature:201`
  - Scenario: Behemoth boost applies at all score levels
  - Suggested marker cleanup: this is probably already covered by `TC04-000013`, `TC-BEH-006`, and `tests/distribution-behemoth.test.js`; verify and mark `[automated]` only if those tests assert score below 9 and all-week boost.

- `tests/scenarios/marketing-release.feature:209`
  - Scenario: Behemoth boost applies to week 2
  - Suggested marker cleanup: likely covered by `TC04-000013` and `tests/distribution-behemoth.test.js`; verify exact week 2 assertion before marking `[automated]`.

## Missing Feature-Level Tests Worth Adding

These are not necessarily BDD gaps, but they would harden feature behavior.

1. **Traceability guard**
   - Add a Jest test that reports all `[verified]` and `[unverified]` scenarios with file/line output.
   - Do not fail on them yet; use it as a visible QA dashboard.
   - Later, once owner approves, fail only when a new `[verified]` or `[unverified]` scenario appears without being added to this matrix.

2. **BDD-to-test ID honesty**
   - For scenarios that name a `TCxx` id, assert that the id exists in an E2E spec.
   - This catches fake `[automated] TC...` markers.
   - Do not require every `[automated]` scenario to name a TC id yet, because many are covered by unit tests or broad E2E flows.

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
     - Script Library saved script -> reload/load -> still usable

## Next Best Move

1. Decide the Graves excluded-Setting message.
2. Automate the two lock/exclude message flows.
3. Confirm the two Behemoth `[verified]` markers really match existing tests, then mark them `[automated]` or add the missing assertion.
4. Add the non-failing traceability dashboard test.
