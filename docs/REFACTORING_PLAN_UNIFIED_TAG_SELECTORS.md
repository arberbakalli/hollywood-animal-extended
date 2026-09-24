# Refactoring Plan: Unified Tag Selector Component (Option 1)

**Goal**: Unify backend logic/component while keeping distinct frontend names for UX clarity.

**Status**: PLAN (pending approval)

---

## Current State

### Four Separate Implementations
1. **Locked Elements** (`#selectors-container-generator`, Script Lab/Build tab)
   - File: `src/generator/scriptGenerator.js`
   - Purpose: Lock required story elements before generation

2. **Submit Script** (`#selectors-container-graves`, Graves/Evaluate tab)
   - File: `src/evaluation/scriptEvaluation.js`
   - Purpose: Select elements for Colman Graves evaluation

3. **Build Your Script** (`#selectors-container-advertisers`, Marketing tab)
   - File: `src/evaluation/scriptEvaluation.js`
   - Purpose: Select elements for marketing analysis

4. **Excluded Elements** (`#selectors-container-excluded`, Script Lab/Build tab)
   - File: `src/generator/scriptGenerator.js`
   - Purpose: Ban story elements globally

### Shared Behavior
- All use same category structure (Genre, Setting, Protagonist, Antagonist, Supporting Character, Theme & Event, Finale)
- All apply category colors to selected items (CSS unified ✓)
- All use `.tag-selector` dropdown class
- All use `.category-group` layout
- All support search, add row (+), remove row (×)
- All store/restore selections on tab switch

### Duplication
- Listener setup: `setupTagSelectorListeners()` repeated 4 times
- Row creation: `createTagSelectorRow()` similar logic in each context
- Value collection: `collectTagInputs()` similar across contexts
- Reset logic: `resetTagSelectors()` similar pattern

---

## Target State

### Unified Backend Component
- Single `TagSelectorManager` class in new file: `src/components/TagSelectorManager.js`
- Handles all tag selection logic regardless of context
- Receives context name as parameter (generator, graves, advertisers, excluded)
- Returns normalized data structure

### Frontend Remains Distinct
```
Locked Elements (Script Lab)
    ↓ (TagSelectorManager: generator)
Submit Script (Evaluate)
    ↓ (TagSelectorManager: graves)
Build Your Script (Marketing)
    ↓ (TagSelectorManager: advertisers)
Excluded Elements (Script Lab)
    ↓ (TagSelectorManager: excluded)
```

### Benefits
- **DRY**: Listeners, row creation, collection logic in one place
- **Maintainability**: Bug fixes apply to all contexts automatically
- **Consistency**: All contexts share same behavior
- **UX Clear**: Frontend names describe purpose (users see Locked Elements, not "tag selector 1")
- **Testable**: Unit tests for manager work for all contexts

---

## Implementation Plan

### Phase 1: Extract Core Logic (No Breaking Changes)

**File**: Create `src/components/TagSelectorManager.js`

```javascript
class TagSelectorManager {
  constructor(context) {
    this.context = context; // 'generator', 'graves', 'advertisers', 'excluded'
    this.setupListeners();
  }

  // Unified listener setup
  setupListeners() {
    // Handle add row, remove row, search, selection change
    // Works for any context
  }

  // Unified row creation
  createRow(category, index) {
    // Create .select-row with proper IDs based on context
  }

  // Unified value collection
  collectInputs() {
    return {
      tags: [...],
      context: this.context
    };
  }

  // Unified reset
  reset() {
    // Clear all selections in this context
  }

  // Context-aware selectors
  getContainer() {
    return document.getElementById(`selectors-container-${this.context}`);
  }

  getGroupId(category) {
    return `group-${category.toLowerCase()}-${this.context}`;
  }
}
```

**Files to Update** (Phase 1):
1. `src/generator/scriptGenerator.js` - Import and use manager
2. `src/evaluation/scriptEvaluation.js` - Import and use manager
3. `src/components/TagSelectorManager.js` - NEW

### Phase 2: Migrate Each Context (One at a Time)

**Step 1: Generator (Locked Elements)**
- Replace `setupTagSelectorListeners('generator')` with `new TagSelectorManager('generator')`
- Replace `collectTagInputs('generator')` with `manager.collectInputs()`
- Test: Script Lab locked/excluded should work exactly as before

**Step 2: Graves (Submit Script)**
- Replace listeners with manager
- Replace collection with manager
- Test: Graves evaluation should work exactly as before

**Step 3: Advertisers (Build Your Script)**
- Replace listeners with manager
- Replace collection with manager
- Test: Marketing should work exactly as before

**Step 4: Excluded**
- Final migration
- Full test suite pass

### Phase 3: Cleanup

- Remove old listener functions from scriptGenerator.js
- Remove old listener functions from scriptEvaluation.js
- Consolidate any shared utilities into manager
- Update inline comments

---

## Testing Strategy

### Unit Tests
Create `tests/TagSelectorManager.test.js`:
- Test listener setup for each context
- Test row creation and removal
- Test value collection
- Test reset behavior
- Test context-aware selectors (getGroupId, etc.)

### Integration Tests (Existing)
- Run full Jest suite (should pass 321 tests)
- Run full Playwright suite (should pass 177 tests)
- No changes to test files needed; behavior unchanged

### Manual Smoke Tests
- [ ] Script Lab: Add/remove locked elements, search, exclude items
- [ ] Graves: Submit Script selection, transfer to Marketing
- [ ] Marketing: Build Your Script selection, analysis
- [ ] All tabs: Tab switching preserves state

---

## Files to Change

| File | Change | Reason |
|------|--------|--------|
| `src/components/TagSelectorManager.js` | **CREATE** | Core unified logic |
| `src/generator/scriptGenerator.js` | **REFACTOR** | Use manager instead of inline listeners |
| `src/evaluation/scriptEvaluation.js` | **REFACTOR** | Use manager instead of inline listeners |
| `tests/TagSelectorManager.test.js` | **CREATE** | Unit tests for manager |
| `docs/REFACTORING_PLAN_*.md` | **UPDATE** | Document completion |

---

## Risk Assessment

### Low Risk
- No HTML structure changes
- No CSS changes
- No public API changes
- Behavior identical before/after
- Can roll back by reverting commits

### Verification Points
1. All 321 Jest tests pass
2. All 177 Playwright tests pass
3. Manual smoke tests pass
4. Git history clean (logical commits per phase)

---

## Estimated Effort

| Phase | Effort | Time |
|-------|--------|------|
| Phase 1: Extract logic | Medium | 1-2 hours |
| Phase 2a: Migrate generator | Low | 30 min |
| Phase 2b: Migrate graves | Low | 30 min |
| Phase 2c: Migrate advertisers | Low | 30 min |
| Phase 2d: Migrate excluded | Low | 30 min |
| Phase 3: Cleanup & docs | Low | 30 min |
| **TOTAL** | | **4-5 hours** |

---

## Approval Checklist

- [ ] Plan reviewed
- [ ] Scope confirmed
- [ ] Risk acceptable
- [ ] Ready to proceed with Phase 1

---

## Next Steps (After Approval)

1. Confirm plan above
2. Create `TagSelectorManager.js` with core logic
3. Run tests to confirm Phase 1 extracted correctly
4. Migrate contexts one by one (Phase 2)
5. Run full test suite after each migration
6. Cleanup (Phase 3)
7. Update this doc with completion date

