# Phase 3: Age Groups Integration — TODO

**Status:** ⏸️ DEFERRED (Design decision needed)  
**Extracted Data:** Available in `AgeGroups.json`  
**Current Integration:** Not integrated into calculator

---

## What Are Age Groups?

Game defines 3 age brackets with gender-specific ranges:

| Age Group | Female Range | Male Range |
|-----------|-------------|-----------|
| **YOUNG** | 18-34 | 18-39 |
| **MID** | 35-49 | 40-59 |
| **OLD** | 50+ | 60+ |

Not currently used in calculator despite being in game data.

---

## Integration Options (Pick One)

### Option 1: Marketing Tab Info Panel ⭐ (Recommended)
- Add breakdown showing: "Your movie appeals to: 45% YOUNG, 35% MID, 20% OLD"
- Show age group compatibility with selected tags
- Minimal UI disruption, informational only
- **Effort:** Low | **Impact:** Low-Medium

### Option 2: Evaluator Tab Breakdown
- Add age group scores alongside current tag compatibility matrix
- Show which age brackets react best to tag combinations
- More detailed, takes evaluator space
- **Effort:** Medium | **Impact:** Medium

### Option 3: New Demographics Panel
- Standalone panel analyzing audience age composition
- Shows optimal release windows by age group
- Could integrate with holiday system (e.g., "Halloween best for YOUNG")
- **Effort:** Medium-High | **Impact:** Medium-High

### Option 4: Tooltip/Legend Only
- Explain age ranges when user hovers over demographic labels
- Educational, no calculation changes
- **Effort:** Low | **Impact:** Very Low

### Option 5: Skip For Now
- Keep on roadmap, defer until v2
- Simpler codebase, focus on Phase 1-2
- **Effort:** None | **Impact:** None

---

## Decision Needed

Before implementation: Which option fits your calculator's philosophy?
- **If focused on quick optimization:** Option 1 (minimal, informational)
- **If comprehensive analysis:** Option 3 (dedicated panel)
- **If data-heavy:** Option 2 (integrated into evaluator)
- **If documentation-first:** Option 4 (tooltips)
- **If time-constrained:** Option 5 (defer)

**DECISION:** [PENDING USER INPUT]

---

## Files Ready

- `AgeGroups.json` — Full age group definitions from game
- `AgeGroups.json` also in `Holidays_Normalized.json` — holiday bonuses work with age groups

## Notes

- Age groups are **orthogonal** to demographics (TM/TF/YM/YF/AM/AF)
  - A demographic can map to multiple age groups
  - Could add depth to compatibility analysis
- Perks/buildings may have age-group-specific effects (not yet analyzed)
- Holiday bonuses already exist — age group integration could explain WHY certain holidays target certain groups
