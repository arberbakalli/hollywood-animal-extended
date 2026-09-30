# BDD Traceability Map

Last updated: 2026-09-29

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
- Exclusions in the first-run state (Starting Tags applied, exactly 193 bans):
  `tests/e2e/exclusion-starting-tags.spec.js`
- Mandatory Protagonist/Antagonist/Finale slots reserved against locks:
  `tests/generator-mandatory-categories.test.js`,
  `tests/e2e/script-lab.spec.js` (TC01-000034)
- Max Element Pool clamped to 5-10:
  `tests/element-pool-clamp.test.js`,
  `tests/e2e/slider-syncing.spec.js` (TC10-000008, TC10-000009)
- Age & Gender Appeal panel, gender locks and role data:
  `tests/e2e/age-gender-appeal.spec.js`,
  `tests/e2e/age-gender-appeal-exclusions.spec.js`,
  `tests/e2e/age-role-breakdown.spec.js`,
  `tests/age-role-breakdown.test.js`
- Script Library pin, save, load, and untrusted-file import:
  `tests/e2e/script-lab.spec.js` (TC01-000010, 023, 024, 029, 035),
  `tests/script-library-import.test.js`

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
- Movie score ceiling (nine story elements cap at 9; ten cap at 10):
  `tests/movie-score-cap.test.js`
- Swap replaces only the suggested element; Best Matches reads the current script:
  `tests/e2e/colman-graves.spec.js` (TC03-000037, TC03-000038)
- Swap slots for Unsuccessful pairs, no clash-creating swaps, the Best Additions
  shortfall note, pool-sized generation and paged Generate Scripts:
  `tests/bug-hunt-2026-09-30.test.js`,
  `tests/e2e/bug-hunt-2026-09-30.spec.js` (TC03-000041..43, TC01-000041..42)

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
- Advertiser data matches the game's `AdsAgents.json`:
  `tests/ad-agents-source.test.js`
- Holiday release: bonus, week-one scope, re-pricing on re-analysis:
  `tests/holiday-release.test.js`,
  `tests/e2e/marketing-release.spec.js` (TC04-000019, 020, 032, 034, 035)
- Audience Compatibility table and score bands:
  `tests/e2e/audience-compatibility.spec.js`,
  `tests/audience-compatibility.test.js`,
  `tests/audience-compatibility-score-bands.test.js`

## Element Freshness

- Three states, Genre/Setting excluded, saved list, worst-element script
  freshness, freshest-first generation, freshness-first ranking
  (GAME_RULES section 9):
  `tests/freshness.test.js`
- Script Lab pills (locked rows and result chips), one state everywhere,
  exclusion reset, out-of-date notice, Generate and Highest Artistic
  ranking, pill layout on desktop and phone:
  `tests/e2e/script-lab-freshness.spec.js`,
  `tests/scenarios/script-lab-freshness.feature`

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
- Every Jest suite touches the product (known offenders listed, list only shrinks):
  `tests/suite-honesty.test.js`
- No neon green anywhere; success green only through `--success`:
  `tests/no-neon-green.test.js`
- Removed features stay removed (each cites its `docs/DECISIONS.md` entry):
  `tests/removed-features.test.js`

## Rule For Future Changes

When adding or editing a scenario, update this file if the behavior belongs to
one of these product areas. If no test protects it yet, keep the scenario
`[verified]` or `[unverified]` until a real assertion exists.

## Local Hardening Coverage Pending Integration

The owner approved the fifteen Script Lab scenario corrections and the Graves /
Build for Target setup corrections on 2026-09-29, retaining separate scenarios
for starting availability and combination width. Those edits are applied in
`codex/hardening`; the executable backlog guard is unchanged. New confirmed
cross-feature contracts live in `tests/scenarios/product-hardening.feature`.
`.arber/HARDENING_BDD_REVIEW_PACKET.md` records the review and assertion evidence.

- Scoring-data readiness and retry, positive and legitimate-zero scores:
  `tests/scoring-readiness.test.js`, `tests/generation-score-integrity.test.js`,
  `tests/e2e/product-hardening.spec.js` (TC20-000001, 004, 005).
- Generation with starting bans, partial/full locks and pools 5/9/10, plus
  transfers preserving selected elements, genre shares and both movie scores:
  `tests/e2e/hardening-boundaries.spec.js` (TC22-000007),
  `tests/e2e/generation-score-transfers.spec.js` (TC24-000001, 002),
  `tests/e2e/product-hardening.spec.js` (TC20-000001, 002).
- Insufficient available elements and mandatory-category slots:
  `tests/generation-pool-hardening.test.js`, `tests/marketing-hardening.test.js`,
  TC20-000003 and TC22-000008/009.
- Complete evaluation versus partial Best Matches seeds, swaps at a full pool,
  and global bans across suggestions: TC20-000008/009/010 and TC22-000010.
- Per-agency fit parity under balanced assumptions:
  `tests/marketing-hardening.test.js` checks raw values and combined-agency means;
  `tests/e2e/advertiser-fit-parity.spec.js` (TC25-000001) compares displayed fit and
  grades for all eight agencies using the same fully locked script in both views.
  Rendered movie-lean label and specialist fit: TC23-000001 in
  `tests/e2e/marketing-score-contracts.spec.js`.
- Rendered text contrast, focus color stability and suggestion bounds at 390px
  and 1280px: `tests/e2e/readability-hardening.spec.js`. This does not certify
  native operating-system dropdown popups or every responsive width.

TC24-000001 currently fails before generation: changing the pool to nine leaves
the required-story-element help text at five. Its downstream transfer assertions
are not yet verified at this boundary; see `docs/KNOWN_ISSUES.md`. Do not count
that case as passing coverage or promote a corresponding scenario until fixed.
