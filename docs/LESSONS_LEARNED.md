# Lessons Learned

## Neon Green Color Override Bug (REPEATED)

**Issue**: Bright neon green (#4cd964) color kept being introduced to overly-broad CSS selectors, overwhelming the UI with unintended highlighting.

**Root Cause**: Using `#4cd964` as a general "success" or "selection" indicator without sufficient specificity, causing it to apply to:
- Selected tag selectors (.tag-selector.has-selected-tag)
- Agency matrix "lean" cells (.agency-matrix-cell.matches-lean)
- Other broad selectors meant for narrow purposes

**Solution**: 
- Remove broad color overrides from general selector classes
- Reserve #4cd964 for intentional, scoped uses only:
  - `.app-feedback-success` (success messages - appropriate)
  - `.audience-pill.pill-best` (audience compatibility pills - appropriate)
  - `.distribution-toggle-label--boutique` (toggle labels - appropriate)
  - `.distribution-toggle--boutique` checkbox state (toggle state - appropriate)

**Prevention**:
1. Never apply #4cd964 to selection/interaction states without explicit context
2. Test CSS changes visually across all sections (excluded, locked, generator, graves, marketing)
3. Use subtle or no color for default states; reserve bright colors for intentional feedback only
4. If adding new #4cd964 usage, justify it in code comments explaining why this context is different

**Commits that fixed this**:
- d075ae9: Remove neon green color from selected tag selectors
- 40e52d5: Remove neon green background from agency matrix lean cells

**Files affected**:
- styles.css: Lines 614-615, 3166-3168
