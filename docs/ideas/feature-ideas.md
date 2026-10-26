# Feature Ideas & Enhancements

**Status:** Backlog for future sessions  
**Discovered:** 2026-09-22

## 1. Generate Highest Synergy Scripts

**Status:** Backlog (parked 2026-09-22)

**Concept:** Auto-generate scripts optimized for different goals

### Variants
- **Generate highest overall synergy** — best total score
- **Generate highest commercial synergy** — optimize for commercial audience
- **Generate highest artistic synergy** — optimize for artistic audience

**Why it's interesting:** Instead of manually tweaking a script, let the calculator find the optimal combination for a given goal.

**Complexity:** Medium (requires search/optimization logic)

**Related code:** `calculateMatrixScore()` in `src/evaluation/graves.js` already scores combinations; could be inverted into a generator.

**Note:** Deferred to backlog alongside commercial/artistic synergy variants. Focus shifted to Transfer button UX instead.

---

## 2. Smooth "Analyze Script" → "Build for Target" Transition

**Problem:** After analyzing a script, you must manually re-select everything in "Build for Target"

**Desired:** One-click transfer of current script selection to the Marketing tab

**Implementation options:**
- Add "Transfer to Marketing" button in Analyze results
- Auto-populate Marketing tab from Colman Graves selections
- Share selection state between tabs (localStorage or app state)

**Complexity:** Medium (state management across tabs)

---

## 3. Swap Suggestions UX Clarity

**Problem:** Message "Select at least 2 elements" unclear when Antagonist is empty

**Options:**
- Show category-specific error: "Select an Antagonist to enable Swap Suggestions"
- Remove Antagonist requirement if game doesn't actually require it
- Clarify in tooltip that all categories except Antagonist are optional

**Complexity:** Low (messaging fix + validation clarification)

**Status:** Flagged as potential bug — verify game rules first

---

## Priority

None of these block current work. Good candidates for "polish session" after Pairwise UI work.
