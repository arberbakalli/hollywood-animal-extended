# P1 — Rule Census Audit

Run 2026-09-24 using prompt P1 in `docs/AUDIT_PROMPTS.md`.

**Question asked:** for each rule in GAME_RULES.md, find every implementation by
searching its *shape* (predicate/constant), not its name. Do they agree?

## Findings

### Rule 1: Genre and Setting are context, not budget

**Rule statement (GAME_RULES.md):**
> Genre and Setting are structural choices every script carries. They do not
> spend the Max Element Pool budget.

**Implementations found:** 5 files
- src/evaluation/compatibilityEngine.js (Genre filter)
- src/evaluation/gravesAnalysis.js (Genre + Setting filters)
- src/evaluation/gravesBestMatchesEngine.js (Genre + Setting filters)
- src/evaluation/movieScoreEstimator.js (Genre + Setting filters)
- src/generator/scriptGenerationEngine.js (Genre filter)

**Consistency check:** ALL use `category !== 'Genre'` AND `category !== 'Setting'`
as the predicate. **Consistent.**

**Validation status:** ✅ Unified after 2026-09-23 fix (was five hand-rolled
copies, two were corrected, three were never found until audit).

---

### Rule 2: Story Element Budget (5–10 elements)

**Rule statement (GAME_RULES.md):**
> A script must have at least 5 and at most 10 story elements.
> Genre and Setting do not count.

**Implementations found:** Multiple `.length` comparisons

**Problem:** `.length` is too generic — it appears 14 times across the codebase
in different contexts (library counts, library sizes, search results, etc.).
Real budget enforcement is done by:
- `gravesAnalysis.js:storyElementsOf()` — the owner function
- `gravesAudience.js:evaluateColmanGravesScript()` — checks the bound: 5 ≤ count ≤ 10
- `gravesBestMatches.js:atElementBudget()` — checks if full
- `targetedAds.js:findTargetedCombinations()` — checks max

**Consistency check:** All budget guards delegate to
`HACGravesAnalysis.storyElementsOf()` or
`HACGravesAnalysis.isStoryElement()`. **Consistent after 2026-09-23 fix.**

**Validation status:** ✅ Unified (five implementations, two corrected and guarded
2026-09-23, three never found until audit).

---

### Rule 3: Max Element Pool applies to certain modes only

**Rule statement (GAME_RULES.md):**
> The global Max Element Pool limits elements in Build for Target and Graves
> Best Matches. It does NOT apply to Script Lab generation or Swap Suggestions.

**Implementations found:** 3 functions
- `src/evaluation/gravesBestMatches.js:getMaxElementPoolSize()` — reads global
- `src/generator/scriptGenerator.js:getMaxElementPoolSize()` — reads global
- `src/marketing/targetedAds.js:getTargetedElementBudget()` — reads global,
  falls back to 10 if undefined

**Consistency check:** All three call
`HACScriptGenerator.getMaxElementPoolSize()` or have identical fallbacks.
**Consistent.**

**Edge case found:** `targetedAds.js` has a fallback to 10 if the function is
undefined. This is defensive but never should trigger — if the function is not
defined, the tab should never load. No guard tests this fallback.

**Validation status:** ✅ Consistent implementation.

---

### Rule 4: Repeatable Categories (Genre, Supporting Character, Theme & Event)

**Rule statement (GAME_RULES.md):**
> Only Genre, Supporting Character, and Theme & Event accept multiple
> selections. All others (Protagonist, Antagonist, Setting, Finale) hold one.

**Implementations found:** Constant list `MULTI_SELECT_CATEGORIES` in:
- `src/app/state.js` — declared
- `src/selectors/storyElementSelector.js` — used (8x)
- `src/evaluation/gravesBestMatchesEngine.js:isCategoryFull()` — used
- `src/marketing/targetedAds.js:categoryIsFull()` — delegated

**Consistency check:** All use the same list. **Consistent.**

**No test guards this list.** If a new category is added to the game but not
to `MULTI_SELECT_CATEGORIES`, the UI will refuse it. No test catches that
desync. (This is an **invariant drift** issue — P6 will flag it.)

**Validation status:** ✅ Consistent, but **unguarded desync risk.**

---

### Rule 5: Story Fit Scoring (Compatibility Matrix)

**Rule statement (GAME_RULES.md):**
> Story Fit is calculated from the compatibility matrix. It averages tag
> compatibility scores and maps them to a 0–5.0 scale.

**Implementations found:** 6 files

**Problem:** "Story Fit" is calculated multiple ways:
- `compatibilityEngine.js` — raw compatibility score
- `scriptEvaluation.js` — maps to 0–5 scale
- `gravesBestMatchesEngine.js` — uses compatibility weights (9x references)

**Consistency check:** Different layers have different responsibilities.
- Engine calculates raw compatibility
- Evaluation maps it to a scale
- Best Matches uses weighted scores

This is **intentionally differentiated**, not a defect. The functions agree on
the input (compatibility matrix) and disagree on the output (raw score vs.
scaled vs. weighted) by design.

**Validation status:** ✅ Intentional differentiation by layer.

---

### Rule 6: Exclusion (Banned Elements)

**Rule statement (GAME_RULES.md):**
> Excluded elements do not appear in suggestions. They are stored in
> localStorage and read by every generator.

**Implementations found:**
- `getGeneratorExcludedIds()` — owner function, reads localStorage
- Used by: gravesBestMatches, scriptGenerator, targetedAds, gravesBestMatchesEngine

**Consistency check:** All call `getGeneratorExcludedIds()` and filter against
the returned set. **Consistent.**

**Validation status:** ✅ Consistent, centralized, guarded (P5 + earlier audits).

---

## Summary Table

| Rule | Files | Consistency | Status |
|---|---|---|---|
| Genre/Setting context | 5 | ✅ All delegate to isStoryElement() | Unified 2026-09-23 |
| Story Element Budget | 4+ | ✅ All delegate to storyElementsOf() | Unified 2026-09-23 |
| Max Element Pool | 3 | ✅ All call getMaxElementPoolSize() | Consistent |
| Repeatable Categories | 5 | ✅ All use MULTI_SELECT_CATEGORIES | Consistent, unguarded |
| Story Fit Scoring | 6 | ✅ Intentional differentiation by layer | Consistent |
| Exclusion | 4+ | ✅ All delegate to getGeneratorExcludedIds() | Consistent, guarded |

---

## Gaps Found by P1

### No tests for the Targeting tab fallback
`targetedAds.js:getTargetedElementBudget()` falls back to 10 if
`HACScriptGenerator.getMaxElementPoolSize` is undefined. This should never
happen (the script loads before targeting is initialized), but there's no test
asserting it.

### Paired-list drift risk: MULTI_SELECT_CATEGORIES
The list of repeatable categories is hand-maintained in `state.js`. If a new
category is added to the game data but not to this list, selections of it will
be refused. No test watches for this desync. **(This is a P6 invariant-drift
case.)**

### Hard-coded list: Mandatory categories in Build for Target
`targetedAds.js` lists the mandatory categories it seeds:
```
const TARGETED_MANDATORY_CATEGORIES = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Finale'];
```

This is hand-written. If a new category becomes mandatory, it won't be seeded
here. No test compares it against the actual schema. **(Another P6 case.)**

---

## Method Note

Searched for rule shapes (predicates, constants, function names) rather than
rule titles. Hand-rolled implementations were identified by pattern, not by
filename or context. The audit found the five Genre/Setting copies because it
searched for `category !== 'Genre'` and similar, not because it knew to look in
those files.
