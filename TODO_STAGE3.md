# Stage 3 - TODO

## ✅ Completed
- [x] Per-category deduplication for Locked Elements (Setting, Genre, Supporting Character, etc.)
  - Selected tags are disabled in other dropdowns within same category
  - Options refresh when selection changes
- [x] Search filtering for Locked Elements categories
  - One search box per category header
  - Filters options as you type (substring matching)
  - Search now uses event delegation for better handling
- [x] Starting Tags profile auto-population (excluded elements initialization)

## 🔄 Tomorrow: Excluded Elements Search/Filter

### Decision Needed
Choose approach for Excluded Elements:

**Option A: Convert to Category-Based Structure** (Recommended)
- Render Excluded Elements as category groups (like Locked Elements)
- Add one search per category header
- Apply per-category deduplication (same tag can't be excluded twice in same category)
- Replace ScriptGeneratorUI approach with category dropdowns
- Pros: Consistent UX with Locked Elements, easier to manage large lists
- Cons: Refactor ScriptGeneratorUI.js significantly

**Option B: Keep Current UI, Improve Search**
- Keep existing: single search to ban + flat list + sort controls
- Add per-category filtering (search results grouped by category)
- Improve current search/filter performance
- Pros: Minimal changes, less refactoring
- Cons: Different UX from Locked Elements, harder to navigate large lists

### If Choosing Option A: Tasks
1. Modify `initializeSelectors('excluded')` to use category groups with search (like generator)
2. Remove or repurpose ScriptGeneratorUI.js
3. Update `addDropdown()` to work for excluded context with per-category logic
4. Test deduplication: same tag shouldn't appear twice in same category
5. Test search: typing in category search filters all dropdowns in that category
6. Verify sorting (A→Z, Z→A, Recently added) still works

### If Choosing Option B: Tasks
1. Enhance search results in ScriptGeneratorUI to group by category
2. Improve filter input to allow category-specific filtering (e.g., "Setting:Wild West")
3. Ensure large excluded lists don't cause performance issues
4. Test current search with various queries

## Testing Checklist
- [ ] Search "Annoy" in Locked Elements → only "Annoying Suitor" shows
- [ ] Select "Wild West" in Setting → disabled in other Setting dropdowns
- [ ] Deselect "Wild West" → re-enabled in other dropdowns
- [ ] Test excluded elements search with chosen approach
- [ ] Verify sorting works on excluded list
- [ ] Test with large exclusion lists (50+ items)

## Files to Modify
- `script.js` - if choosing Option A (category structure)
- `src/features/scriptGenerator/ScriptGeneratorUI.js` - if choosing Option B (enhance current)
- `index.html` - possibly hide/show appropriate containers
- `styles.css` - any new styles needed for excluded elements structure

## Notes
- ExclusionManager is already initialized early (before script.js runs)
- Starting Tags profile populates exclusions correctly now
- Search filtering uses event delegation (should handle dynamic dropdowns)
- Deduplication uses `option.disabled` (prevents selection, not just hiding)
