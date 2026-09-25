# Hollywood Animal Calculator — Features 1-5 Implementation Prompt

## What's Been Updated

✅ **All 6 story element categories extracted & verified**
- Genres (10), Settings (22+), Protagonists (37), Antagonists (27)
- Supporting Characters (23) ⭐ NEW
- Finales (30) ⭐ NEW
- Themes & Events (83) ⭐ NEW
- **Total: 227 elements with complete demographic appeal data**

✅ **Interactive reference table rebuilt** with all 6 categories
✅ **Features 1-5 algorithms documented** with pseudocode
✅ **All edge cases identified** (Wayward Soul, demographic conflicts, polarizers)

## Reference Files

1. **audience-compatibility-table.html**
   - Interactive lookup: 6 categories, 227 elements
   - Search/filter by name
   - Color-coded scores (-5.0 to +5.0)
   - Use as primary data reference

2. **COMPLETE_AUDIENCE_COMPATIBILITY_DATASET.md**
   - Strategic insights by category
   - Implementation patterns for Features 1-5
   - Complete tag listings with demographic weights

## Implementation Task

### Feature 1: Best Artistic Scripts
**Algorithm:** Average AF + AM scores across selected elements
**Display:** Top 3 + Show More pagination
**Data:** Use all 6 categories; weight adult demographics

### Feature 2: Best Commercial Scripts
**Algorithm:** Average TF + TM + YF + YM scores across selected elements
**Display:** Top 3 + Show More pagination
**Data:** Use all 6 categories; weight youth demographics

### Feature 3a: Age-to-Role Breakdown (Show 3 + More)
**Data Source:** Supporting Characters category
**Logic:** Recommend characters that fill demographic gaps
**Display:** Same "show 3 + expand" pattern as rest of app

### Feature 3b: Ad Agency Compatibility Matrix
**Data Source:** Cross-reference themes to agency targeting
**Display:** List agencies by match strength %
**Logic:** Theme appeal → agency demographic targeting

### Feature 4 & 5: TBD
**Finales (Feature 4):** Resolution choices invert demographic appeal
**Themes (Feature 5):** Primary targeting lever (40-50% of appeal)

## Strict Scope Boundaries

### DO:
- Load all 6 categories from reference table
- Implement dual-scoring: Artistic (AF+AM) vs Commercial (TF+TM+YF+YM)
- Display top 3 + pagination for "Show More"
- Color-code: Green (+3.0+), Gray (0.0), Red (-2.0 or lower)

### DO NOT:
- Combine all demographics into single score
- Show more than 3 results by default
- Auto-generate scripts (user selects elements; you rank)
- Treat Wayward Soul as having weights (it has none)

## Edge Cases
- **Wayward Soul:** No demographic weights; treat as neutral
- **Demographic Conflicts:** Flag when score is +3.0 in one demo, -3.0 in another
- **Theme Polarizers:** Love Triangle (AF-focused) vs Treasure Hunt (YM-focused)

---

**Status:** ✅ Ready to build.
