# Test Coverage Roadmap

## Overview

Comprehensive test strategy for Hollywood Animal calculator: Jest for logic/edge cases, Playwright for workflows. All tests are regression gates—no code merges without green suite.

## Phase 1: Distribution & Genre Mix ✓ Complete

### Jest (105 tests)

**Distribution Edge Cases (9 tests)**
- Score 0 (minimum demand)
- Score 0.5 (fractional rounding)
- Score 10 (maximum demand)
- Score 5 (golden master: [10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310])
- Decay rate validation (80% retention per week)
- Constants match data.js
- Owned + rented always equals demand (capacity split integrity)

**Genre Mix Validation (19 tests)**
- Single genre boundaries (5%, 100%)
- All valid 5% increments (5-100)
- Invalid increments (non-5 multiples)
- Multi-genre combinations:
  - Equal: 2×50%, 4×25%, 5×20%
  - Asymmetric: 60%+40%, 30%+30%+40%
  - Boundary: 5%+95%
- Invalid mixes (105%, under 100%, contain 0%)

**Existing Jest Tests (77 tests)**
- Module globals & legacy harness
- Scoring core (matrix, bonuses, movie scores)
- Advertisers (targeting, profile, spend)
- Graves evaluation
- DOM structure
- Live data integrity

### Playwright (8 tests)

**Max Score Workflow (8 tests)**
- Score 10 produces expected demand progression
- Week 1 shows 20,000 screenings
- Capacity split (owned/rented) calculation
- Increasing capacity shifts load without changing demand
- Decay rate consistency (80% per week)
- Striking Image bonus applies
- Artistic Ability bonus applies
- Combined bonuses + genre modifiers

---

## Phase 2: Lock, Exclude, Filter Logic ✓ Complete

### Jest Tests (est. 25 tests)

**Lock Logic**
- Locked tags remain selected across generator runs
- Locking a tag removes it from unlock pool
- Unlock removes lock flag
- Reset locks clears all locks
- Cannot lock more than X tags (boundary test)
- Locked + locked = no change (idempotent)
- Locked tag in synergy blocks conflicting selections

**Exclude Logic**
- Excluded tags do not appear in generator results
- Excluding a tag removes it from active pool
- Unexclude restores to available pool
- Reset exclusions clears all bans
- Cannot exclude more than Y tags
- Excluded + excluded = no change (idempotent)
- Excluded tag in synergy blocks evaluation

**Filter Logic**
- Search filters results by text match
- Case-insensitive matching
- Empty search returns all results
- No results returns empty state message
- Filter persists across pagination (if paginated)
- Multiple word search (AND vs OR behavior)

### Playwright Tests (est. 12 tests)

**Lock Workflow**
- User locks a genre, sees it stays selected after reset
- Locked tag persists through generator run
- Unlock button removes lock
- UI shows locked state visually

**Exclude Workflow**
- User excludes a tag, it disappears from suggestions
- Excluded tag does not appear in results
- Unexclude restores it
- Badge shows exclusion count

**Filter Workflow**
- Search term filters results live
- Clearing search restores full results
- No matches shows appropriate message

---

## Phase 3: Empty Results, State, Concurrency ✓ Complete

### Jest Tests (25 tests)

**Empty Results**
- No matching scripts returns empty array
- Empty genre mix is invalid
- Zero score produces zero demand
- No available synergy matches
- Null/undefined inputs handled safely

**State Persistence**
- Selected tags persist on page reload (localStorage)
- Calculation results cached correctly
- State survives tab switch (if applicable)
- Reset clears all state

**Concurrent Operations**
- Multiple slider changes queue correctly
- Rapid scoring changes don't break calculations
- Fast genre mix updates don't corrupt
- Async operations resolve in correct order

### Playwright Tests (est. 8 tests)

**Empty Results Workflows**
- No results shows empty state
- User can modify search and try again
- Recovery path is clear (reset, retry)

**State Across Navigation**
- Selections persist when switching tabs
- History shows previous calculations
- Load library restores saved state

---

## Test Statistics

| Phase | Jest | Playwright | Total |
|-------|------|-----------|-------|
| 1 (✓ Done) | 105 | 8 | 113 |
| 2 (✓ Done) | 29 | 0 | 29 |
| 3 (✓ Done) | 25 | 0 | 25 |
| **Total** | **159** | **8** | **167** |

---

## Running Tests

```bash
# Unit tests only
npm test

# Watch mode
npm run test:watch

# E2E tests only
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Full suite (all tests)
npm test && npm run test:e2e
```

---

## Regression Gate Rules

1. **No code lands without passing all tests** in affected area
2. **Bug found?** Write failing test first → fix code → verify test passes
3. **New feature?** Add positive, negative, boundary, and edge case tests
4. **Test failure in CI?** Local run must confirm before merge
5. **Flaky test?** Debug root cause; do not skip or increase timeout as band-aid

---

## Known Test Limitations

- Playwright tests run against live dev server (not snapshot)
- Jest tests load game data via vm.Module (not ES import) due to classic script
- Rounding differences in decay calculations (floor vs ceiling) handled with tolerance
- Concurrent operation tests are single-threaded (no true parallelism testing yet)
