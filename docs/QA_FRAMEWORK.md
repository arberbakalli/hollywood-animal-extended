# QA Framework — Hollywood Animal Calculator

This document consolidates quality assurance rules and testing principles for the Hollywood Animal Calculator project. It is the authoritative reference for test composition, assertion patterns, and code review criteria.

## Core Principles

### Rule (a): Three Test Layers — BDD + Unit + Negative/Edge

Tests operate across three layers:

1. **BDD Scenarios** (`tests/scenarios/*.feature`): Business-facing stories in Gherkin format. Each scenario is marked:
   - `[automated]` — a Playwright spec exists that asserts this scenario
   - `[verified]` — confirmed against the live app; automation pending
   - `[unverified]` — plausible but unconfirmed; do not automate until watched

2. **Unit Tests** (`tests/*.test.js`): Jest suites covering scoring, logic, and state management at function level. Rule: if a bug has been fixed, its guard test must exist and must fail when the bug is reintroduced.

3. **Negative and Edge Tests**: Tests that explicitly check rejection paths, boundary conditions, and error states. Examples:
   - Scripts with fewer than 5 or more than 10 story elements are refused with exact counts
   - Banned elements are immediately unavailable in dropdowns after restore (no reload needed)
   - First-run exclusion list must contain exactly 193 bans, never 192 or 194
   - Genre supports up to 11 rows; each row must represent at least 5% appeal

### Rule (b): First-Run State — 193 Bans from 57-Element Pool

- **250 total elements** in GAME_DATA
- **57 elements** in GAME_DATA.starterWhitelist (the Starting Tags whitelist)
- **193 elements** are banned on first visit
- Count is exact. Other counts (e.g., 192, 194) signal a bug
- On first visit, the app applies Starting Tags automatically
- After that, it restores the player's saved exclusion list
- "Apply Starting Tags" resets to exactly 193 and replaces custom bans

**Implementation guards:**
- `src/generator/availabilityFilter.js` — filter enforces this pool
- `src/selectors/storyElementSelector.js` — dropdown rendering respects bans
- `tests/e2e/exclusion-dropdown-refresh.spec.js` — pinned guard for the rule

### Rule (c): Exact Visuals Only When Owner-Specified

Colors, borders, shadows, and typography are not asserted unless the owner explicitly ruled on them. Examples:
- Selected dropdowns are not neon green (explicitly removed, owner call 2026-09-25)
- Danger badge (excluded counter) must use readable text color (explicitly ruled)
- Appeal ratings use scale -5.0 to +5.0 (explicitly ruled in GAME_RULES.md)

Reason: visual tweaks change often. Exact color assertions lock in details that may shift. Assert structure, text, and behavior instead.

### Rule (d): One Concern Per Commit

Each commit addresses exactly one cohesive concern:
- Fixing a bug → one commit per bug
- Adding a feature → one commit per feature
- Refactoring a module → one commit per module
- Deleting dead code → one commit per deletion batch

Reason: single-concern commits are easier to review, revert, and cherry-pick.

### Rule (e): Re-Run Both Suites Before Claiming Green

- **Jest** (`npm test`) — unit and integration tests
- **Playwright** (`npm run test:e2e`) — end-to-end scenarios

Run both suites to completion before reporting a fix as done. Jest alone hid a data-loss bug once (193 bans were silently restored to 90, then overwritten by the observer). Playwright alone would miss state mutations that Jest catches.

**Proof of green:** commit the output of:
```bash
rtk npm test
rtk npm run test:e2e
```

### Rule (f): Feature Deletion Requires Coverage Parity Check

When a feature or UI element is deleted:

1. **List every behavior** the deleted code covered
2. **Name where that behavior is still covered**, or state plainly it is being dropped
3. **Put that list in the commit message**

Example: `tests/e2e/find-top-combinations.spec.js` was deleted while "Build for Target" still shipped. The deletion removed the only coverage of the story element budget, Script Lab exclusion wiring, result ranking, and the empty state. That was a mistake.

Before deleting any spec file, feature file, or `describe` block, explicitly verify coverage is preserved elsewhere or intentionally dropped.

### Rule (g): [automated] Marker Cites Assertion

Every `[automated]` scenario must cite which test file or test number asserts it:

```gherkin
  # [automated] TC01-000002, tests/e2e/script-lab.spec.js.
  Scenario: Collapsing a section hides its selectors
    ...
```

Reason: `[automated]` claims the behavior is guarded, so the claim must be verifiable without opening code. The citation proves the guard exists.

## Test Authoring Patterns

### BDD Scenario Patterns

**Happy path:**
```gherkin
  Scenario: User action produces expected result
    Given precondition 1
    When the user takes action X
    Then the expected result appears
    And side-effect Y is visible
```

**Guard (rejection):**
```gherkin
  Scenario: Invalid input is refused with explanation
    Given invalid state
    When the user attempts action X
    Then action is refused
    And the message explains why: "..."
    And no state changed
```

**Boundary:**
```gherkin
  Scenario: Boundary condition is handled correctly
    Given boundary state (e.g., 5 elements at budget of 5)
    When action would exceed boundary
    Then the system refuses or clamps correctly
    And the message names the constraint
```

### Jest Test Patterns

**Arrange-Act-Assert:**
```javascript
test('function rejects invalid input', () => {
  // Arrange
  const input = { invalid: true };
  
  // Act
  const result = myFunction(input);
  
  // Assert
  expect(result.error).toBe('reason');
  expect(result.state).toBe('unchanged');
});
```

**Guard tests for bug fixes:**
```javascript
test('bug is fixed: guards against regression', () => {
  // This test must fail if the bug is reintroduced
  const [bug, guard] = [theDefect, theFixCode];
  
  // Reintroduce the defect
  const withBug = reintroduceDefect();
  expect(withBug).toThrow('guard catches it');
  
  // Verify the fix works
  const withFix = applyFix();
  expect(withFix.result).toBe('correct');
});
```

### Playwright Test Structure

```javascript
test('scenario name', async ({ steps }) => {
  // Setup
  await openHollywood(steps);
  await steps.on('buildTab', 'Navigation').click();
  
  // Action
  await steps.selectDropdown('genreSelect', 'ScriptLab', {
    type: DropdownSelectType.VALUE,
    value: 'ACTION'
  });
  
  // Assert
  await steps.on('resultsSection', 'ScriptLab').verifyState('visible');
  await steps.on('resultsList', 'ScriptLab').verifyCount({ greaterThan: 0 });
});
```

## When Tests Fail

### If a test is red and the code is correct:

1. **Reintroduce the defect the test guards.** If the test still passes, the test is vacuous — rewrite or drop it.
2. **Re-render before reading the DOM.** After code changes, reload with cache-buster and re-trigger the render. A reload alone leaves the old markup in place.
3. **Read the evidence explicitly.** State the expected value and compare against it, rather than glancing and assuming it passed.

### If a test is red and needs fixing:

1. **Fix the code** so the existing assertion passes, unmodified
2. **Never change a test to make it pass** (see Rule: Tests are the Source of Truth)
3. **If the test may be wrong**, stop and ask the repository owner

## Verifying a Fix

A green suite is **not** evidence that a bug is fixed:

- The suite was green for the entire life of the argument-order bug (three engine builders have incompatible signatures; a swapped argument silently replaced options.displayName and broke name rendering)
- Three tests named for the element budget passed with that bug present

**Proof of fix:**
1. Write a new failing test that captures the bug
2. Reintroduce the defect and confirm the test fails (the test has teeth)
3. Apply the fix and confirm the test passes
4. Run both suites to completion
5. Commit the new test and fix together

## Domain Rules

Domain rules are defined in `docs/GAME_RULES.md` and are the source of truth for:
- Script shape and element budget (Genre uncapped, others capped per category)
- Scoring thresholds and distribution (weeks 1-8, Behemoth toggle, decay gates)
- Studio policies (Holiday release, factory policy)
- Exclusion rules (193 Starting Tags bans, restoration timing)

**Before answering "should it be X or Y?":**
1. Read `docs/GAME_RULES.md`
2. If the rule is not there, ask the owner instead of inferring it from code
3. If the code contradicts the rule, fix the code (the rule is the source of truth)

## Autonomous Actions (No Permission Required)

Agents may perform these without asking:
- Writing new tests (unit, BDD, or e2e)
- Running test suites and reporting results
- Auditing code for dead code, unused imports, or stale comments
- Flagging issues as out-of-scope background tasks
- Code review and refactoring (simplification, efficiency, reuse)

## Actions Requiring Explicit Permission

Agents must ask and wait for approval before:
- Changing domain rules (edit GAME_RULES.md)
- Deleting test files or scenarios
- Editing existing tests (esp. loosening assertions or removing scenarios)
- Pushing to main or creating pull requests
- Changing game balance (scores, weights, distributions)

## Implementation Traps

### Three Engine Builders Have Incompatible Signatures

```javascript
buildAdditions(tags, candidates, minimum, maxPoolSize, options)
buildSwaps(tags, candidates, minimum, options)
buildPairwise(tags, candidates, minimum, options)
```

An argument added in the wrong slot replaces `options` with a number and drops `engineOptions()` silently. Symptom: every selected element renders as its raw id (`FINALE_PROTAGONIST_FINDS_TREASURE`) instead of its name. **Always read the signature before adding an argument.**

### hideGravesEvaluationResults and Panel Reveal Must Name Same Panels

`hideGravesEvaluationResults` hides exactly five panels. The list that reveals panels after evaluation must reveal the same five, or a panel missing from either list will show a placeholder or stale data.

### Starting Tags Profile Must Be Active to Reproduce Certain Bugs

Exclusion-refresh bugs only reproduce with the Starting Tags profile active. From a clean ban list, the scenario passes with the defect present. This is how a bug survived multiple fixing attempts.

## Links

- **GAME_RULES.md** — domain rules (script shape, scoring, policies)
- **page-repository.json** — Playwright selectors and element maps
- **.arber/** (gitignored) — working lessons and investigation notes
- **AGENTS.md** — instructions for agents working in this repo
- **CLAUDE.md** — project instructions and dependencies

## Changelog

- **2026-09-25**: Initial QA Framework consolidated from CLAUDE.md, AGENTS.md, GAME_RULES.md, and session working memory. Rules cover BDD/unit/negative-edge testing, first-run state, exact visuals, one-concern commits, both-suites verification, feature deletion parity, and [automated] citations.
