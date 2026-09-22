# BDD Traceability Map

Last updated: 2026-09-22

This map connects product behavior to the tests that guard it. Scenario files in
`tests/scenarios/*.feature` remain the readable behavior source of truth; this
file is the fast lookup for agents before editing tests or product code.

## Script Lab

- Build tab, generation, locks, bans, transfers, selector row ids:
  `tests/e2e/script-lab.spec.js`
- Slider score/count mapping:
  `tests/e2e/slider-syncing.spec.js`,
  `tests/slider-syncing.test.js`,
  `tests/scoringCore.test.js`
- Exclusion persistence and source-of-truth behavior:
  `tests/e2e/exclusion-persistence.spec.js`,
  `tests/e2e/exclusion-dropdown-refresh.spec.js`,
  `tests/exclusion-store.test.js`,
  `tests/scoringCore.test.js`

## Colman Graves

- Evaluate Script validation and rendered result workflow:
  `tests/e2e/colman-graves.spec.js`,
  `tests/graves.test.js`
- Best Matches exploratory behavior, Additions, Swaps, Pairwise, pagination,
  budget gating, category capacity:
  `tests/e2e/colman-graves.spec.js`,
  `tests/graves-best-matches.test.js`
- Genre mix UI behavior:
  `tests/e2e/genre-mix.spec.js`,
  `tests/genre-mix-validation.test.js`,
  `tests/empty-state-persistence.test.js`
- Pair conflicts and pair bands:
  `tests/graves-conflicts.test.js`,
  `tests/graves.test.js`,
  `tests/scoringCore.test.js`

## Marketing And Release

- Distribution grid and score controls:
  `tests/e2e/marketing-release.spec.js`,
  `tests/distribution-edge-cases.test.js`
- Behemoth, Boutique, stacking, and policy status:
  `tests/e2e/marketing-release.spec.js`,
  `tests/e2e/distribution-behemoth.spec.js`,
  `tests/distribution-behemoth.test.js`,
  `tests/distribution-boutique.test.js`,
  `tests/distribution-studio-policy-status.test.js`
- Advertiser recommendations:
  `tests/e2e/marketing-release.spec.js`,
  `tests/advertisers.test.js`

## Build For Target

- Panel controls, no-filter search, audience/ad agency filters, optional tags,
  reset, rank order:
  `tests/e2e/marketing-release.spec.js`
- Generator category cardinality, genre uncap, budget width, duplicate tags:
  `tests/build-for-target.test.js`
- Exclusions as source of truth:
  `tests/e2e/marketing-release.spec.js`,
  `tests/e2e/exclusion-dropdown-refresh.spec.js`,
  `tests/scoringCore.test.js`

## Meta Guards

- E2E ids must be unique:
  `tests/e2eIds.test.js`
- BDD scenario markers must be honest at the marker level:
  `tests/featureScenarioMarkers.test.js`
- HTML structure and stable hooks:
  `tests/domStructure.test.js`

## Rule For Future Changes

When adding or editing a scenario, update this file if the behavior belongs to
one of these product areas. If no test protects it yet, keep the scenario
`[verified]` or `[unverified]` until a real assertion exists.
