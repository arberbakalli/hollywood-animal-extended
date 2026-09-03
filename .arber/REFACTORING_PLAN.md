# Hollywood Animal Calculator - Refactoring & Implementation Plan

## Project Context
- **Repo**: Hollywood-Animal-Calculator
- **Nickname**: hollywood
- **Goal**: Refactor monolithic 69KB script.js → class-based architecture + feature: deduplication + search filter for excluded elements

## Issues Identified
1. **Duplicate Constants** (script.js:1434-1437): BASE, W1_MULT, W2_MULT, DECAY already in data.js
2. **Duplicate tagCap Logic** (lines 785 & 1656): Identical if/else chains in two functions
3. **Brittle Tab Navigation**: Positional button indexing instead of enum-based

## PHASE 1: Proposed Architecture

### Directory Structure
```
src/
├── core/
│   ├── GameConstants.js           // Single source of truth
│   ├── DistributionEngine.js      // Consolidated distribution logic
│   └── ActionManager.js           // Action pool management
├── features/
│   ├── scriptGenerator/
│   │   ├── ScriptGenerator.js
│   │   ├── ExclusionManager.js    // NEW: Deduplication
│   │   ├── ScriptGeneratorUI.js
│   │   └── ScriptSearch.js        // NEW: Filter functionality
│   ├── seCompatibility/
│   └── bestAdvertisers/
├── ui/
│   ├── TabManager.js              // Enum-based tab navigation
│   ├── UIRenderer.js
│   └── EventBus.js                // Component communication
└── utils/
```

## PHASE 2: Key Classes

### GameConstants.js
```javascript
export class GameConstants {
  static DISTRIBUTION = Object.freeze({
    BASE: 1000,
    WAVE_1_MULTIPLIER: 2,
    WAVE_2_MULTIPLIER: 1,
    DECAY_FACTOR: 0.8,
    WAVE_THRESHOLD: 8
  });
  // Single source of truth for all constants
}
```

### ExclusionManager.js (First Feature)
```javascript
export class ExclusionManager {
  excludeCategory(categoryName) {
    // Single operation: exclude entire category
    this.excludedCategories.add(categoryName);
  }
  
  canAddAction(actionId, categoryName) {
    // Prevents duplicates
    return !this.isActionExcluded(actionId) && 
           !this.isCategoryExcluded(categoryName);
  }
  
  getExclusionSummary() {
    // Returns flat list (no duplicates)
  }
}
```

### ScriptSearch.js (First Feature)
```javascript
export class ScriptSearch {
  setFilterTerm(term) {
    // As-you-type filtering
    this.filterTerm = term.toLowerCase();
  }
  
  getFilteredExclusions() {
    // Returns only matching categories
  }
}
```

## PHASE 3: Refactoring Order (Safety-First)

**Stage 1: Foundation** (No feature changes)
- Create GameConstants.js
- Create EventBus.js
- Create TabManager.js
- Create tests to verify behavior matches original

**Stage 2: Core** (Still no feature changes)
- Create ActionManager.js
- Create DistributionEngine.js (consolidate duplicate logic)
- Verify outputs match original script.js

**Stage 3: First Feature** (Deduplication + Search)
- Create ExclusionManager.js
- Create ScriptSearch.js
- Create ScriptGeneratorUI.js
- Implement new UX: one-click exclusions, searchable list

**Stage 4+: UI Modules** (Other tabs)
- SECompatibilityUI.js
- BestAdvertisersUI.js

## PHASE 4: Git Workflow Strategy

### Branch Structure
```
main (original)
  └── refactor/architecture-v1
        ├── refactor/stage-1-foundation
        │   └── PR: Extract GameConstants & TabManager
        ├── refactor/stage-2-core
        │   └── PR: Extract ActionManager & DistributionEngine
        └── refactor/stage-3-script-generator
            └── PR: Script deduplication + search filter
```

### Commit Strategy
- Small PRs (~300-500 lines each)
- Each PR includes tests
- No feature changes in refactoring PRs
- Keep main branch stable

### Decision Point
- **If original maintainer accepts approach**: Keep synced with upstream fork
- **If maintaining locally**: Set upstream to your fork, origin to local clone
- **PR to original only after**: Features are solid + original owner signals openness to refactoring

## PHASE 5: First Feature Details

**User Story**: "Exclude action categories with one click + search through exclusions"

### Implementation Checklist
- [ ] ExclusionManager prevents duplicate exclusions
- [ ] ScriptSearch filters as-you-type
- [ ] ScriptGeneratorUI displays searchable list with "Remove" buttons
- [ ] Summary shows: "3 categories excluded, 15 actions blocked"
- [ ] Tests verify deduplication + search + filtering

### Expected UX
1. User clicks "Exclude: Action"
2. Action category added to exclusion list (single entry, not 15)
3. Search field filters exclusion list in real-time
4. User can remove exclusion with button

## PHASE 6: Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing behavior | Keep old script.js. Run side-by-side tests. |
| Missed duplicate logic | Grep for patterns before starting. |
| Brittle implementation | Use EventBus to decouple. Test each class. |
| Performance regression | Profile both versions. DistributionEngine should match original. |

## Next Steps

1. **Before Starting**: Review this plan + identify any missing duplicate patterns
2. **Stage 1**: Create foundation classes with tests
3. **Stage 2**: Extract core logic + verify behavior
4. **Stage 3**: Implement deduplication + search feature
5. **Review & Iterate**: Test on original tabs before moving forward

## Files to Track

- **Original**: script.js (69KB), data.js, index.html, styles.css
- **New**: All files in src/ directory
- **Tests**: tests/ directory for unit + integration tests

## Important Notes

- Use EventBus for component communication (decouples classes)
- GameConstants is single source of truth (no more hardcoded values)
- TabManager uses enum-based navigation (not positional indexing)
- ExclusionManager + ScriptSearch work together for first feature
- Keep old script.js until full migration + testing complete
