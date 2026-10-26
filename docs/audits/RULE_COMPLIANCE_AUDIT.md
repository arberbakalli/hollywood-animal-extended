# Rule Compliance Audit

Date: 2026-10-08

Audited checkout: `C:/Users/testUser/IdeaProjects/hollywood-animal-extended`

Branch and baseline: `main`, commit `9fb1cac`. Local `origin/main` was aligned
at inspection time; this audit did not fetch or inspect the deployed site.
The older `hollywood-animal-extended-mandatory` worktree was not treated as
the current app.

## 1. Executive Summary

The mandatory-category regression is not present in this baseline. Script Lab,
Colman Graves and Build for Target read the same required-category lists:
Genre, Setting and Protagonist. Antagonist and Finale remain optional. The
canonical story-element filter excludes Genre and Setting from the budget.

The automated checks run here are green: 64 Jest suites / 782 tests / 10
snapshots, plus 190 Playwright tests across ten focused specs. However, two
additional production-module probes reproduced Pollux save inconsistencies
that those tests do not cover. Some BDD automation citations also overstate
what their referenced assertions prove.

No P0 defect was established. Fix the two P1 Pollux cases first. Resolve the
Marketing Analyze pool-limit question before changing its behavior. Correct
BDD provenance and coverage citations without changing the established
distribution numbers or weakening assertions.

This is a report-only audit. No production code, executable test, existing
document, branch or commit was modified. No push or merge was performed.

### Evidence Scope

Read the operating rules in `AGENTS.md`, `CLAUDE.md`, `docs/GAME_RULES.md`,
`docs/DECISIONS.md`, `docs/KNOWN_ISSUES.md`, `docs/QA_FRAMEWORK.md` and
`docs/TEST_QUALITY_GATE.md`. Applied Karpathy and QA test-truth guidance.
Inspected production paths, shared helpers, related Jest suites, feature
declarations and their cited Playwright assertions for the goal's eight areas.

The scenario inventory contains 233 Scenario/Scenario Outline declarations:
232 marked automated, one verified, none unverified. These are declaration
counts, not expanded Examples counts or a certification of all Then-steps.
The semantic classification table below covers the cited claims investigated
in detail. A complete assertion-by-assertion classification of every one of
the 233 declarations was not performed; unlisted scenarios are not certified
TRUE by a green marker guard or this report. The full Playwright suite,
live GitHub Pages deployment and loading modified saves inside the game
were not verified here.

## 2. Confirmed Rules The Code Follows

Paths below are relative to the audited checkout stated above. Line numbers
refer to commit `9fb1cac` unless identified as this new report.

| Area | Evidence | Conclusion |
|---|---|---|
| Required script shape | `src/rules/scriptCategories.js:6`, `src/generator/scriptGenerator.js:173`, `src/marketing/targetedAds.js:339`, `src/evaluation/gravesAudience.js:129` | The shared lists require Genre, Setting and Protagonist only. Antagonist/Finale are optional. |
| Story budget | `src/evaluation/gravesAnalysis.js:195`, `src/evaluation/gravesAudience.js:141`, `src/marketing/targetedAds.js:184`, `src/generator/scriptGenerator.js:270` | Genre and Setting are context, not story slots. Protagonist spends a slot. |
| Evaluate versus generation | `src/evaluation/gravesAudience.js:143`, `src/evaluation/gravesAudience.js:148`; TC20-000008 in `tests/e2e/product-hardening.spec.js` | Graves evaluates five through ten story elements independently of the generation pool. |
| Partial Best Matches | `src/evaluation/gravesBestMatches.js:630`, `src/evaluation/gravesBestMatches.js:638`; TC03-000011 | One seed is accepted; complete-script validation is not imposed on exploratory Best Matches. |
| Global exclusions | `src/selectors/selectorExclusions.js:4`, `src/selectors/storyElementSelector.js:203`, `src/selectors/storyElementSelector.js:211`, `src/selectors/storyElementSelector.js:762` | All four builder contexts share the ban source. Ban changes reach result watchers and category dropdowns. Focused persistence/refresh tests passed. |
| Starting deck | `docs/GAME_RULES.md:593`, `docs/KNOWN_ISSUES.md:99`; `tests/e2e/exclusion-starting-tags.spec.js` | Current rules and tested fresh state agree on 58 available / 192 excluded; Jousting Tournament is restored. |
| Result uniqueness | `src/generator/scriptGenerationEngine.js:300`, `src/generator/scriptGenerator.js:64`, `src/generator/scriptGenerator.js:338`, `src/generator/scriptGenerator.js:386`, `src/marketing/targetedAds.js:424` | Sorted element-ID signatures deduplicate reordered scripts and different shares of the same genre set. A genuinely different tag remains a different result. Build for Target's key covers fill tags; locks are constant within that search. |
| Pollux location | `testing-features.html:129`, `testing-features.html:175`; TC35-000012 | Pollux UI and editor scripts live in Testing Features, not `index.html`. |
| Pollux normal paths | `lab/polluxSaveEditor.js:131`, `lab/polluxSaveEditor.js:157`, `tests/pollux-save-editor.test.js:113`, `tests/pollux-save-editor.test.js:183` | BOM, player ownership, previous-year bucket, ceremony-year mapping, pre-ceremony history guard, recorded nominees and compact output have real production-module coverage. Exceptions are F01/F02 below. |
| Prototype uncertainty | `testing-features.html:36`, `testing-features.html:49`, `testing-features.html:120`, `lab/testingFeatures.js:106`, `lab/testingFeatures.js:122` | Factory boost, advertiser reach/profit and preservation ranking disclose estimates or judgment. No verified game-profit claim was found in these inspected paths. |
| Trash work remains parked | `docs/parked/LOW_PRIORITY_AND_TRASH_PLAN.md:55`, `docs/parked/LOW_PRIORITY_AND_TRASH_PLAN.md:121` | The new Trash indicator/list approval remains parked. Lab unlock-recipe information is distinct from implementing a new badge or movie-score modifier. |
| Shared capacity/rules | `src/marketing/targetedAds.js:330`, `src/generator/scriptGenerator.js:175`, `src/generator/scriptGenerator.js:177` | Inspected consumers delegate category capacity and required/optional category lists instead of independently requiring Antagonist or Finale. |

The private story filters in the independently loaded scoring/best-match
engines are documented exceptions to the filtering guard, not evidence of a
new mandatory-category rule. Classic-script bridge wrappers are intentional;
do not delete them as duplicates.

## 3. Rule Contradictions And Decisions

### F01 - P1: An Imported Save Can Keep An Unselected Forced Winner

- Code: `lab/polluxSaveEditor.js:151`.
- Contract: `docs/GAME_RULES.md:1011` says forcing several candidates lets
  the game choose; default behavior must force only the player's pick.
- Reproduction: load two player BEST_SCRIPT candidates where movie 1 already
  has `forceWinning: true`. Call production `applyWinners` selecting movie 2,
  with the default `forceAllOwned: false`.
- Actual: both candidates remain forced: movie 1 true, movie 2 true.
- Cause: the loop sets new true flags but never clears pre-existing flags on
  unselected candidates in the edited category.
- Impact: uploading a previously fixed save and changing the winner can fail
  to honor the new pick. The game's documented tie-selection mechanism matters.
- Why green tests miss it: `tests/pollux-save-editor.test.js:154` starts with
  all flags false. TC35-000003 at `tests/e2e/pollux-save-editor.spec.js:99`
  retries from the same pristine upload; the view reparses its original text
  at `lab/polluxSaveEditorView.js:197`. Neither reloads an already-fixed save.
- Suggested fix: normalize the edited category's force flags to the selected
  candidate in default mode, retaining the explicitly requested force-all-owned
  behavior. Do not touch unedited categories or the other ceremony bucket.
- Change needed: production code plus a new regression test and BDD edge case.
  Include switching from force-all to one winner after re-upload.
- Status: reproduced in a read-only Node VM probe; left for approved execution.

### F02 - P1: Moving An Award Between Films With The Same Talent Leaves A Stale Movie Credit

- Code: `lab/polluxSaveEditor.js:127`, `lab/polluxSaveEditor.js:172`,
  `lab/polluxSaveEditor.js:177`.
- Contract: `docs/GAME_RULES.md:1008` requires history, movie awards and talent
  awards to agree after a held ceremony is rewritten.
- Reproduction: two recorded BEST_SCRIPT nominees share talent 7. Movie 1 is
  the current winner; its talent award is `{ year: 1942, movId: 1, category: 0 }`.
  Select movie 2 in the same held ceremony using production `applyWinners`.
- Actual: history and movie awards move to movie 2, but talent 7's award still
  names movie 1.
- Cause: old talent removal excludes IDs also present in the new winner.
  `hasAward` then checks year/category only, so the stale `movId` prevents
  replacement of that talent award.
- Impact: downloaded save mirrors contradict one another even though the UI
  reports a successful rewrite. This was not tested inside the game.
- Why green tests miss it: `tests/pollux-save-editor.test.js:235` replaces a
  winner with a different talent. The consistency assertion at line 214 checks
  holder IDs, not the winning movie ID inside each talent's award.
- Suggested fix: upsert the winning talent's year/category award with the
  selected movie ID. Preserve unrelated awards and retain idempotence.
- Change needed: production code plus same-talent/different-film regression
  coverage asserting all three mirrors, including `movId`.
- Status: reproduced in a read-only Node VM probe; left for approved execution.

Read-only probe outputs, using the real `lab/polluxSaveEditor.js` in `node:vm`:

```json
{"preExistingFlags":[{"movieId":1,"forceWinning":true},{"movieId":2,"forceWinning":true}]}
{"historyWinner":2,"winningMovieAward":{"year":1942,"movId":2,"category":0},"talentAward":{"year":1942,"movId":1,"category":0}}
```

### F03 - P2 / Product Decision: Marketing Analyze Inherits The Generation Pool Cap

- Code: `src/marketing/marketingPlanner.js:91` through line 101.
- Rule: `docs/GAME_RULES.md:553` permits analysis from one element to a full
  script. Unlike Graves evaluation, it does not explicitly settle whether an
  already-built script must fit the current generation pool.
- Actual branch: with pool five and six selected story elements, Analyze
  refuses, even though this is not a generation request. The counting itself
  delegates correctly to the canonical helper; this is not a local-filter bug.
- Impact: lowering the generation pool can block analysis of an existing script
  or a transfer. Whether that restriction is intended needs an owner ruling.
- Suggested next step: explicitly decide whether Analyze uses the current pool
  or the fixed script limit. Then document it and cover both sides of the boundary
  and transfers. Do not infer a replacement rule from Graves alone.
- Change needed: product decision, then docs and tests; code only if behavior changes.
- Status: source-confirmed; not classified as a definite product bug or changed.

## 4. BDD And Test Findings

### F04 - P2: Distribution BDD Claims Game-File Evidence That The Rules Explicitly Reject

- `tests/scenarios/marketing-release.feature:53` calls the grid an extracted
  game-file formula; the scenario title at line 54 and test title at
  `tests/e2e/marketing-release.spec.js:55` repeat the claim.
- `docs/GAME_RULES.md:474` explicitly identifies the base curve as a community
  model, adopted as the app's working rule rather than recovered from game files.
- Why it matters: an agent can mistake accepted calculator behavior for verified
  game behavior and reject later calibration evidence.
- Suggested fix: change provenance wording only to the accepted calculator grid.
  Keep the numerical contract unchanged. Existing test/BDD edits need owner approval.
- Status: left for approval; no formula or assertion edits made.

### F05 - P2: Some Automated Markers Do Not Prove Their Claimed Then-Steps

TRUE means the cited assertions establish the listed behavior. PARTIAL means
some meaningful steps/examples are missing. FALSE means the citation checks
different behavior; it does not automatically mean no other test covers it.

| Scenario / exact location | Cited test evidence | Classification and gap |
|---|---|---|
| Grid Examples, `tests/scenarios/marketing-release.feature:54` | TC04-000004, `tests/e2e/marketing-release.spec.js:55` | PARTIAL: exact eight-week values are asserted at score 5 only, not the score-10 Examples row. `tests/e2e/distribution-max-score.spec.js:21` checks only part of that row. |
| Behemoth all-week boost and gate, `tests/scenarios/marketing-release.feature:83` | TC04-000028, `tests/e2e/marketing-release.spec.js:381` | FALSE citation: this test checks status text, not weekly demand. TC04-000013 and numeric Jest policy tests cover parts of the contract, but must be mapped accurately. |
| Behemoth all score levels, `tests/scenarios/marketing-release.feature:202` | Same TC04-000028 | FALSE citation: no score-5/all-eight-weeks demand assertions in the cited test. |
| Behemoth week 2, `tests/scenarios/marketing-release.feature:209` | Same TC04-000028 | FALSE citation: status text is not a week-two demand assertion. |
| Marketing profile, `tests/scenarios/marketing-release.feature:113` | TC04-000010, `tests/e2e/marketing-release.spec.js:354` | PARTIAL: checks visibility/content but not advertiser ordering. TC30-000001 at `tests/e2e/marketing-profile-ranking.spec.js:3` asserts all eight descending scores; add that traceability rather than claiming it is absent. |
| Audience interest levels, `tests/scenarios/marketing-release.feature:124` | TC04-000027, `tests/e2e/marketing-release.spec.js:369` | PARTIAL: checks legend words and a visible pill, not that actual audiences receive the correct interest classes. |
| First ten additions, `tests/scenarios/colman-graves.feature:183` | TC03-000031, `tests/e2e/colman-graves.spec.js:625` | TRUE for first-page size: exactly ten rows are asserted. The test uses a single seed rather than the feature's evaluated-script setup. |
| Band ordering, `tests/scenarios/colman-graves.feature:190` | Same TC03-000031 | FALSE citation: it asserts page size and preserved prefix, not Successful/Common/Unsuccessful ordering. |
| Preserve existing rows, `tests/scenarios/colman-graves.feature:198` | Same TC03-000031 | TRUE for append/prefix preservation: the original ten texts are compared after Show more. |
| Remaining suggestions control, `tests/scenarios/colman-graves.feature:207` | Same TC03-000031 | PARTIAL: remaining-count label is asserted, but disappearance after exhausting all pages is not. |
| All available candidates, `tests/scenarios/colman-graves.feature:328` | Same TC03-000031 | FALSE citation: neither absence of the old Starting Tags checkbox nor eligibility of the complete non-excluded candidate pool is asserted. |
| Build for Target ordering, `tests/scenarios/build-for-target.feature:114` | TC05-000014, `tests/e2e/marketing-release.spec.js:775` | TRUE for the written first-versus-second Then-step. It does not prove the entire list is sorted; do not expand the coverage claim without more assertions. |
| Before-ceremony latest picks, `tests/scenarios/pollux-save-editor.feature:31` | TC35-000003, `tests/e2e/pollux-save-editor.spec.js:99` | TRUE for repeated generation from one pristine upload. It does not cover re-uploading a previously modified save (F01). |
| Pollux location, `tests/scenarios/pollux-save-editor.feature:70` | TC35-000012, `tests/e2e/pollux-save-editor.spec.js:209` | TRUE: no main product Pollux tab, followed by lab upload visibility. |

Suggested fix: first remap genuine existing coverage, then add only the missing
assertions. If a declared scenario has no adequate protection, do not leave it
claiming automation. Any existing marker/test edit requires owner approval.
Status: audit classifications only; files unchanged.

### F06 - P2: The Marker Gate Checks ID Presence, Not Assertion Honesty

- `tests/featureScenarioMarkers.test.js:93` through line 104 uses substring
  presence in concatenated E2E source to validate cited IDs.
- An ID in a comment, a mismatched scenario/test pair, incomplete Examples
  coverage or an unexpanded shortened range can satisfy or escape that check.
- Why it matters: the gate passes for the false citations above. Its title
  "keeps cited E2E test ids honest" overstates its guarantee.
- Suggested fix: retain this useful structural guard, label its scope accurately
  and add structured mapping/semantic review. AST/title validation can rule out
  comment-only IDs, but cannot prove behavioral coverage by itself.
- Change needed: test infrastructure/doc changes, with approval for existing tests.
- Status: left for approval; no weakening recommended.

### F07 - P2: A Loose Decay Assertion Also Accepts The Non-Decay Week-Two Ratio

- `tests/e2e/distribution-max-score.spec.js:95` loops from index 1, comparing
  week 2 / week 1 to 0.8 with `toBeCloseTo(0.8, 0)` at line 98.
- Established rule: week 1 is twice the commercial baseline and week 2 is once
  it, so that first ratio is 0.5. Actual 0.8 decay starts at week 3.
- At precision zero the tolerance is 0.5; the wrong 0.5 ratio passes as close
  to 0.8. This can be confirmed without a browser from the literal grid.
- Suggested fix: assert week-two baseline separately; start decay comparisons
  at week 3 and use exact rounded values or a justified rounding tolerance.
- Change needed: existing test correction, requiring approval. This is not
  evidence that the production grid currently violates its accepted formula.
- Status: source-reviewed; this spec was not included in the focused browser run.

### F08 - P3: The Verified Backlog Contains A Behavior Already Automated

- `tests/scenarios/marketing-release.feature:128` says no test asserts movie
  lean. TC04-000010 explicitly asserts Commercial at
  `tests/e2e/marketing-release.spec.js:364`; TC23-000001 also covers lean variants.
- `tests/featureScenarioMarkers.test.js:78` pins this stale backlog entry.
- Suggested fix: approve a marker/backlog cleanup, cite the real coverage, and
  preserve all product assertions. This is under-reporting, not a missing feature.
- Status: left for approval.

## 5. Stale Docs And UI Text

### F09 - P3: Builder Headings Still Use Different Names

- `index.html:243`: Colman Graves heading is "Submit Script".
- `index.html:428`: Marketing Analyze heading is "Build Your Script".
- Script Lab uses "Locked Elements" at line 123 and Build for Target uses
  "Locked Elements (Optional)" at line 597. The two other subtitles already
  contain "Locked Elements" at lines 246 and 431.
- Why it matters: the requested common vocabulary is only partially applied;
  the same selection surface still has three primary names.
- Suggested fix: use Locked Elements as the consistent selection heading,
  retaining Optional for Build for Target and keeping action names Evaluate /
  Analyze / Generate distinct. This is app terminology, not a game-tag rename.
- Change needed: HTML/copy and any approved affected assertions.
- Status: left for approved implementation.

### F10 - P3: Initial HTML Contains A Wrong Story-Count Hint

- `index.html:111` says "Requires 8 Story Elements (excluding Genre)" while
  the inputs above default to target/pool five, and Setting is also excluded.
- Runtime `updateScoreDisplay` corrects the hint during setup, so the tested
  ready-state UI is correct. This finding concerns initial/loading markup,
  not a broken initialized slider.
- Suggested fix: make initial text match the defaults and both context exclusions,
  or render a neutral loading hint until canonical calculation is available.
- Change needed: HTML only; verify ready/loading states without changing rules.
- Status: left for approved implementation.

### F11 - P3: Genre Capacity Wording Is Internally Ambiguous

- `docs/GAME_RULES.md:128` says Genre is "unlimited (minimum one)".
- Lines 28 and 99 specify one through eleven distinct genres and an eleven-row
  selector cap. "Uncapped" elsewhere correctly rejects invented one/two-genre
  limits, but is easy to misread as permission to add duplicate/unbounded rows.
- Suggested fix: distinguish no artificial one/two-genre cap from the available
  eleven distinct genres and selector limit. Keep the owner-approved behavior.
- Change needed: clarifying documentation, no code or test behavior change.
- Status: left for approval; no runtime genre-cardinality regression established.

### F12 - P3: Coverage Docs Still Describe Old Integration And Test State

- `docs/BDD_TRACEABILITY.md:138` labels existing main-branch hardening coverage
  as "Pending Integration"; line 143 refers to `codex/hardening` and line 145
  refers to the old review packet. Verify links and mark landed work accordingly.
- `docs/KNOWN_ISSUES.md:333` says E2E tests assert no numerically correct scores.
  Exact distribution and budget assertions now exist, including TC04-000004 and
  the hardening boundary specs. Keep limitations about VM DOM stubs and unproven
  game formulas, but remove this blanket assertion.
- `docs/TEST_QUALITY_GATE.md:96` presents a September 28 "Current Baseline" with
  a failing marker guard. Today's full Jest run passed 64 suites / 782 tests.
  Keep the dated historic measurement, add the current result and label the
  Playwright result as focused, not a full-suite baseline.
- Change needed: documentation refresh and reference checks.
- Status: left for approval; no historical records deleted.

The October 5 research note already records the October 8 starter-deck resolution
at `docs/TESTING_FEATURES_RESEARCH_2026-10-05.md:34`; its old 57/193 finding is
historical evidence, not a live contradiction. Screenshot capture notes similarly
describe their capture state. Do not erase those lessons or counts blindly.

## 6. Verification Commands And Results

Commands ran against the audited main checkout, sequential browser batches,
one worker. Actual process exit codes were read; output was not piped through
an exit-code-masking filter. RTK prefixes are the required local command wrapper.

| Command | Result |
|---|---|
| `rtk npm test -- --runInBand tests/required-categories-rule.test.js tests/protagonist-only-required.test.js tests/story-element-rule.test.js` | Exit 0; 3 suites, 21 tests passed; no snapshots. |
| `rtk npm test -- --runInBand` | Exit 0; 64 suites, 782 tests passed; all 10 snapshots unchanged. |
| `rtk npx playwright test tests/e2e/protagonist-only-required.spec.js tests/e2e/marketing-release.spec.js tests/e2e/script-lab.spec.js --config C:/Users/testUser/AppData/Local/Temp/hac-rule-audit-playwright.config.mjs --workers=1 --trace off` | Exit 0; 84 passed, 0 failed. |
| `rtk npx playwright test tests/e2e/colman-graves.spec.js tests/e2e/exclusion-dropdown-refresh.spec.js tests/e2e/exclusion-starting-tags.spec.js tests/e2e/pollux-save-editor.spec.js tests/e2e/testing-features.spec.js tests/e2e/element-preservation.spec.js tests/e2e/product-hardening.spec.js --config C:/Users/testUser/AppData/Local/Temp/hac-rule-audit-playwright.config.mjs --workers=1 --trace off` | Exit 0; 106 passed, 0 failed; about 13m36s. |
| Read-only Node VM probes invoking production `HACPolluxSaveEditor.applyWinners` | Exit 0; reproduced F01 and F02, outputs recorded above. These are diagnostic probes, not added regression tests. |
| `rtk git diff --check` and report-reference/whitespace scan | Exit 0; no diff errors; 83 source line references resolve within existing files; new report is ASCII with no trailing whitespace. |

Browser batches used a temporary config outside the repo: base URL
`http://127.0.0.1:4186`, server `node tools/static-server.mjs 4186 .`,
`reuseExistingServer: false`, absolute test directory and output directory
`C:/Users/testUser/AppData/Local/Temp/hac-rule-audit-results`. This prevents
silently exercising another checkout on the normal port 4173. The temporary
config is removed after verification; it was not added to the project.

The lab browser spec includes desktop/mobile walks and screenshots; passing
layout assertions do not certify every color/spacing choice. No visual redesign
or app logic change was attempted during the audit.

## 7. Recommended Action Order

1. Approve a surgical Pollux fix plan for F01/F02. Add regression cases using the
   real pure module, then fix the flag normalization and talent-award upsert.
   Verify original/BOM/compact serialization, untouched fields and idempotence.
2. Settle F03 in GAME_RULES before changing Marketing Analyze's pool behavior.
   Protect the approved rule with boundary and transfer tests.
3. Correct F04 provenance and F05 traceability. Map existing strong assertions
   before adding coverage, and request approval for every existing test edit.
4. Correct F07's ratio boundary/tolerance and expand the remaining unasserted
   Examples, suggestion-order, pagination-exhaustion and interest-class checks.
5. Clean F08-F12 terminology/status text, preserving dated lessons and evidence.
6. Treat a full per-scenario semantic BDD classification and full browser suite
   as follow-up verification, not something a passing substring guard proves.

Do not reopen optional Antagonist/Finale rules, replace uncertainty with invented
game formulas, add Trash score effects, or remove intentional classic-script
bridges while implementing these recommendations.

## 8. Execution Status (2026-10-09)

Executed in the main checkout on base `9fb1cac`; the diff is uncommitted and
unpushed for review. Codex (Astra) implemented most fixes; Claude reviewed
that work against this audit, completed the remaining items and ran the full
verification below.

**Result: 11 of 11 findings resolved (F01, F02, F04-F12). F03, parked at first,
was then settled by the owner on 2026-10-09 and is also resolved.**

| Finding | Status | Change |
|---|---|---|
| F01 | Fixed | `lab/polluxSaveEditor.js`: in the edited category, candidates not picked (and not owned under force-all) lose `forceWinning`. Regressions: `tests/pollux-save-editor.test.js` "editing an already-fixed save" (re-upload single and force-all, BOM on/off, idempotence, untouched data, rival flag cleared); TC35-000013 (browser re-upload). |
| F02 | Fixed | `lab/polluxSaveEditor.js`: the winning talent's award for that year/category is upserted with the new `movId`. Regressions: same-talent unit test (all three mirrors, award metadata kept, idempotence); TC35-000014. |
| F03 | Fixed (owner ruling 2026-10-09) | Every builder follows the Max Element Pool. Analyze Script already did; Evaluate Script now does too. One check, `poolLimitRefusal` (`src/generator/scriptGenerator.js`), used by Evaluate, Analyze and Build for Target. GAME_RULES section 2 table and section 1 updated. New: TC20-000012/13 (`tests/e2e/pool-limit-builders.spec.js`). Owner-approved edits: TC20-000008 (ten refused at pool 5, evaluated at pool 10) and its scenario, TC03-000027 (pool 6), TC03-000035 (pool 9), `evaluate-story-bounds.test.js` reach-scoring cases (pool 10). |
| F04 | Fixed | Provenance reworded to "accepted community-model grid" in `marketing-release.feature`, TC04-000004's title and the `distributionPlanner.js` comment. No numbers changed. |
| F05 | Fixed | TC04-000004 now asserts the score-5 and score-10 Examples rows; TC04-000041 asserts Behemoth demand for all eight weeks at scores 5, 8, 8.9, 9, 10 and toggling off; TC04-000027 asserts Cowboy's actual audience classes; TC03-000031 exhausts all pages and checks Show more disappears; TC03-000061 checks band order across every page; TC03-000060 checks the full non-excluded candidate pool and the absent checkbox. Citations remapped (TC30-000001 for advertiser order). |
| F06 | Fixed | `tests/featureScenarioMarkers.test.js` resolves cited ids and ranges to real `test(...)` declarations via `@babel/parser` (new devDependency), rejecting comment-only, string-only, `test.skip` and `describe` ids; scanner unit tests added. Its title states the structural scope; it does not prove semantic coverage. |
| F07 | Fixed | `tests/e2e/distribution-max-score.spec.js`: week 2 asserted as exactly half of week 1; weeks 3-8 asserted exactly (8000, 6400, 5120, 4096, 3276, 2621). |
| F08 | Fixed | Lean scenario now `[automated]` citing TC23-000001; backlog expectation is empty. |
| F09 | Fixed | `index.html`: Graves and Analyze headings read "Locked Elements", Build for Target "Locked Elements (Optional)"; subtitles no longer repeat the heading. TC38-000001 checks all four at 1280 and 390 px. `GAME_RULES.md` "Evaluate results never outlive the script" renamed accordingly. |
| F10 | Fixed | Initial hint reads "Requires ~5 Story Elements (excluding Genre & Setting)"; TC38-000001 checks raw HTML and ready state. |
| F11 | Fixed | `GAME_RULES.md`: section title and capacity row state 1-11 distinct genres with no artificial one/two cap. |
| F12 | Fixed | `BDD_TRACEABILITY.md` marks hardening coverage as integrated; `KNOWN_ISSUES.md` no longer claims E2E asserts no numbers; `TEST_QUALITY_GATE.md` adds the 2026-10-09 baseline and keeps 2026-09-28 as history. Dated lessons kept. |

### Verification (actual exit codes read)

| Command | Result |
|---|---|
| `rtk npm test -- --runInBand tests/pollux-save-editor.test.js tests/featureScenarioMarkers.test.js tests/domStructure.test.js tests/audience-bands-rule.test.js` | Exit 0; 4 suites, 62 tests. |
| Same Pollux suite against `HEAD`'s `lab/polluxSaveEditor.js` | Exit 1; 7 of the new tests fail (proves they catch F01/F02). File restored. |
| `rtk npm test -- --runInBand` | Exit 0; 64 suites, 793 tests; 10 snapshots unchanged. |
| `rtk npx playwright test --config <temp, port 4198> pollux-save-editor marketing-release distribution-max-score colman-graves builder-headings marketing-profile-ranking advertiser-fit-parity` | Exit 0; 108 passed. |
| Same config, `marketing-score-contracts.spec.js` (TC23-000001) | Exit 0; 4 passed. |
| Same config, full suite | Exit 0; 416 passed, 0 failed. |
| `rtk git diff --check` | Exit 0. |
| `rtk npm test -- --runInBand`, rerun after adding the owner-verified Trash list (GAME_RULES section 11, `tests/trash-elements-rule.test.js`; outside this audit) | Exit 0; 65 suites, 794 tests. |

Temporary config `%TEMP%/hac-audit-finish-playwright.config.mjs`, results in
`%TEMP%/hac-audit-finish-results`; not added to the repo. Screenshots from
TC38-000001 at 1280 and 390 px were reviewed: headings fit, no repeated label.

### Names (owner ruling 2026-10-09, F09 follow-up)

One name per thing: the screen name in `index.html`. GAME_RULES "Names: one
name per thing" maps each screen name to its code name and lists retired
names; `tests/ui-names.test.js` fails if a glossary name is missing from the
page or a retired name returns. Renamed in prose: "Submit Script section"
(exclusion-dropdown-refresh.feature, 5 steps), "Market tab" (4), "Marketing
Analyze" (3), "ad agency", "Targeted Ads". UI text unchanged.

### Final verification

| Command | Result |
|---|---|
| `rtk npm test -- --runInBand` | Exit 0; 66 suites, 796 tests; 10 snapshots unchanged. |
| Full Playwright, temp config on port 4198 | Exit 0; 418 passed. |
| Name guards with "Submit Script" reintroduced and a glossary name changed | Exit 1; both guards fail as intended. Files restored. |

### Remaining decisions

1. Not certified: a full per-scenario semantic BDD review of all scenarios;
   loading modified Pollux saves inside the game.
