# Test Quality Gate

Last updated: 2026-09-28

## Ground Rules

- Tests are source of truth. Do not weaken, skip, delete, or rewrite a test just
  because the current implementation fails it.
- When a test and implementation disagree, stop and ask which behavior is
  correct.
- Prefer production functions/modules over toy simulations in Jest.
- Prefer Playwright for cross-panel workflows, real focus behavior, dropdown
  behavior, and anything that depends on rendered browser state.
- Scenario markers must stay honest:
  - `[automated]` means a Jest or Playwright assertion covers the behavior.
  - `[verified]` means observed or reviewed, but not automated.
  - `[unverified]` means plausible only; do not automate without product
    confirmation.

## Test Types

- Unit tests: pure production helpers with no browser globals.
- Integration-style Jest tests: legacy VM harness tests that load real classic
  scripts and game data.
- E2E tests: Playwright user workflows through the rendered app.

The legacy VM harness is valuable, but it is not a browser. If a behavior
depends on focus, aria state, dropdown option disabling, layout, or user clicks,
cover it with Playwright.

## Required Local Checks Before Push

Run the full Jest suite:

```bash
npm test -- --runInBand
```

Run focused Playwright specs for the changed product area:

```bash
npm run test:e2e -- tests/e2e/colman-graves.spec.js
npm run test:e2e -- tests/e2e/script-lab.spec.js
npm run test:e2e -- tests/e2e/marketing-release.spec.js
```

Run whitespace validation:

```bash
git diff --check
```

Graphify output is local-only and should not be committed.

## Patterns That Let A Broken Feature Pass

Found in this suite on 2026-09-28. Each one kept a test green while the thing it
names could be broken or missing. New tests must not use them. The existing
instances are listed for the owner's decision, because editing or deleting a
test needs approval (`CLAUDE.md` section 1).

| Pattern | Example here | Do instead |
|---|---|---|
| Comparing two lists typed into the test | `tests/graves-panel-sync.test.js` compared two literal panel lists. Replaced by `tests/invariant-lists.test.js`, which reads the source | Read the real lists from the source file or the running app |
| Re-implementing the logic under test, then asserting on the copy | The first 20 tests of `tests/best-score-scripts.test.js`, `boundary-cases.test.js`, `tests/unit/`, 10 tests in `audience-compatibility.test.js` (all removed or replaced) | Call the production function through the harness or an import |
| Setup that already satisfies the assertion | TC03-000008 checked Theme & Event was not empty after Add, but the setup had already filled it. Replaced by TC03-000039 | Assert the change: a new row, the confirmation message, a count that moved |
| Assertions skipped by an early `return` | `tests/graves.test.js:197` had `if (!actionId) return;` (fixed) | Assert the precondition first, so a missing case fails loudly |
| Ids that do not exist in the game data | `GENRE_COMEDY`, `FINALE_PROTAGONIST_DIES`, `GENRE_ACTION`, `SETTING_WESTERN_TOWN` (fixed; the real ids are `COMEDY`, `FINALE_PROTAGONIST_DIES_HEROICALLY`, `ACTION`, `WILD_WEST`) | Take ids from `GAME_DATA` or a file that exists |
| Checks that cannot tell two features apart | TC01-000032/33 found the same three words on both modes. Replaced by TC01-000036/37 | Assert what differs: the primary label, the sort order |
| `> 0` or a loose bound where the exact value is known | `tests/build-for-target.test.js:54` accepted `<= 10` where the answer is 5 (fixed) | Assert the exact value |
| A guard that only checks one form of the bug | The neon-green guard checked one dropdown for the opaque colour; four translucent uses slipped past | Scan every form (hex and `rgba` at any alpha) and every file (`tests/no-neon-green.test.js`) |

**The test that settles it:** reintroduce the defect the test names. If it stays
green, it guards nothing. Rewrite or drop it, and do not keep it as reassurance.

Executing guards added for these:

- `tests/suite-honesty.test.js`: every Jest suite must touch the product (harness,
  `src/` import, or a repository read). Its known-offender list is empty since
  2026-09-28 and only shrinks, so a new vacuous suite fails it.
- `tests/no-neon-green.test.js` and `tests/removed-features.test.js`: scan every
  file the page loads, not one element.

## Quality Checklist For New Or Edited Tests

- Test name states behavior and expected outcome.
- Assertion would fail for the right reason.
- Test calls production code where possible.
- Test data setup uses small builders instead of duplicating production logic.
- Repeated cases use `test.each`.
- Shared VM tests reset browser-like globals after replacing `document` or app
  state.
- BDD scenario either names the covering test id/spec or remains `[verified]` or
  `[unverified]`.

## Current Baseline

Measured 2026-09-28 on branch `claude/review-followups`:

- Jest (`npm test`): **40 suites, 471 tests; 470 pass, 1 fails.** The failure is
  `tests/featureScenarioMarkers.test.js`. Commit 5fb5f98 added 15 `[unverified]`
  scenarios without updating that test's backlog, and fixing it needs the owner's
  approval (several of those scenarios contradict `GAME_RULES.md`).
- Playwright (`npm run test:e2e`): **213 tests in 20 specs, all passing.**
- Coverage (`npm run test:coverage`): 37.1% statements, 44.3% functions,
  35.2% branches.

Earlier baselines, kept for history: 2026-09-22 Jest 21 suites / 262 tests;
Playwright 14 specs / 149 tests.
