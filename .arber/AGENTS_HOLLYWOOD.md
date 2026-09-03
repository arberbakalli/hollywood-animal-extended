# AGENTS.md - Hollywood Animal Extended Operating Manual

This file is the model-agnostic contract for every coding agent working in the hollywood-animal-extended repository.

**Status:** Transitioning from vanilla JS to Vue 3 + TypeScript while retaining visual/behavioral parity with original.

## Read Order

1. `AGENTS.md` (this file)
2. `docs/MIGRATION_GUIDE.md` (vanilla JS → Vue)
3. `docs/LESSONS_LEARNED.md` (Vue best practices from financial-classifier)
4. `docs/KNOWN_ISSUES.md` (current bugs fixed in this fork)
5. `ARCHITECTURE_COMPARISON.md` (why this approach)

Source code, tests, configuration, and running app behavior override stale prose.

---

## Project Layout

### Current State (vanilla JS + modules)
```
├── data.js                         Single source for game data
├── script.js                       Monolithic logic (2000+ LOC)
├── index.html                      Entry point
├── styles.css                      Global styles
├── src/
│   ├── core/
│   │   ├── GameConstants.js        Single source of truth for constants
│   │   ├── ActionManager.js        Action pool + distribution logic
│   │   └── DistributionEngine.js   Movie score calculations
│   ├── features/
│   │   └── scriptGenerator/
│   │       ├── ExclusionManager.js Deduplication + banned tags
│   │       ├── ScriptSearch.js     Filter + search functionality
│   │       └── ScriptGeneratorUI.js UI state management
│   └── ui/
│       ├── EventBus.js            Component communication
│       └── TabManager.js          Tab navigation (enum-based)
└── tests/
    ├── scoringCore.test.js        Golden master tests
    └── helpers/legacyHarness.js   VM harness for script.js testing
```

### Target State (Vue 3 + TypeScript)
```
frontend/
├── src/
│   ├── components/
│   │   ├── tabs/                  Feature-grouped components
│   │   │   ├── GeneratorTab.vue
│   │   │   ├── SynergyTab.vue
│   │   │   └── AdvertisersTab.vue
│   │   ├── ui/                    Reusable primitives
│   │   │   ├── Button.vue
│   │   │   └── Card.vue
│   │   └── *Modal.vue             Feature-specific dialogs
│   ├── composables/               Composition API (replace EventBus)
│   │   ├── useGame.ts
│   │   └── useGenerator.ts
│   ├── stores/                    Pinia state (replace EventBus)
│   │   ├── game.ts
│   │   └── calculator.ts
│   ├── utils/                     Pure functions (migrate from script.js)
│   │   ├── calculator.ts
│   │   ├── scriptGenerator.ts
│   │   └── scoring.ts
│   ├── types/                     Game domain types
│   │   └── game.ts
│   ├── assets/                    Styles, images
│   └── App.vue                    Root component
├── tests/                         Vitest + vue-test-utils
├── vite.config.js                 Bundler + dev server
└── package.json                   Dependencies
```

---

## Current Priority

**Phase 1 (Weeks 1-2):** Migrate vanilla JS to Vue while retaining exact visual/behavioral parity.
- No feature changes
- No UX modifications
- Tests must pass before and after migration
- Golden master snapshots guard against scoring drift

**Phase 2 (Weeks 3+):** Polish and optimizations once parity is proven.

---

## Approval Gate

Present a plan and wait for explicit approval before:
- Writing code that changes behavior (feature additions, refactoring)
- Deleting files
- Git writes (`git add`, `commit`, `push`, `branch`, `checkout`, etc.)

Read-only inspection (git log, git show, graphify queries) is allowed.

---

## Working-Tree Safety

- Expect a dirty tree during migration
- Never revert or overwrite unrelated changes
- Stop and ask only when an unexpected change **directly conflicts** with the approved task
- Prefer surgical edits over adjacent cleanup
- Never use `git reset --hard`, `git clean -f`, or `git checkout -- .` unless explicitly requested

**Golden Rule:** If you didn't create it this session and it's not in your current task, don't delete it.

---

## Bug Fixes Already Applied

These bugs were fixed in the vanilla JS version and **must not regress during Vue migration:**

### 1. Excluded Elements Silently Non-Functional ✅
- **Problem:** 194 banned tags in DOM, but 0 reaching generator
- **Root cause:** ScriptGeneratorUI constructor aborted on null container; ExclusionManager never populated
- **Fix:** Removed dead module blocks from index.html, restored direct `collectTagInputs('excluded')`
- **Verification:** Before: 0 tags → After: 194 tags, 0 leaks into output

### 2. Score Tables Disagreement ✅
- **Problem:** Help text said scores need 4/6/8/9/10 elements; generator used 5/7/8/9/9
- **Root cause:** Two separate, unlinked tables in script.js:311-316 and script.js:899-903
- **Fix:** Extracted `getRequiredElementCount()` as single source of truth
- **Verification:** All 5 score rows now agree: 6→5, 7→7, 8→8, 9→9, 10→9

### 3. requestIdleCallback Fails in Hidden Tabs ✅
- **Problem:** User tabs away after clicking "Starting Tags"; returns to find list empty
- **Root cause:** Chrome suspends idle callbacks in hidden tabs
- **Fix:** Replaced `requestIdleCallback()` with `setTimeout(fn, 0)` (keeps paint opportunity, no visibility dependency)
- **Verification:** Round-trip test (Starting → Custom → Starting) works even with tab hidden

### 4. Lazy-Load Flag Never Cleared ✅
- **Problem:** After switching profiles, exclusion list wouldn't rebuild on subsequent clicks
- **Root cause:** `startingProfileExcludedLoaded` remained true
- **Fix:** Clear flag on profile switch and Reset Bans
- **Verification:** Profile round-trip rebuilds list each time

### 5. Score Help Text Not Initialized on Page Load ✅
- **Problem:** Page showed "Requires 8 Story Elements" (hardcoded) instead of calculated value
- **Root cause:** `updateScoreDisplay()` not called during setup
- **Fix:** Call it in `setupGeneratorControls()` after listeners attach
- **Verification:** Correct text on initial page load

**None of these regressions are acceptable.** Golden master tests guard against scores. Manual verification for UX.

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// tests/scoring.test.ts
import { describe, test, expect } from 'vitest'
import { calculateMatrixScore } from '@/utils/calculator'

describe('calculateMatrixScore', () => {
  test('two genres weighted 60/40', () => {
    const result = calculateMatrixScore([...])
    expect(result.totalScore).toMatchSnapshot()
  })
})
```

### Golden Master Tests
- Snapshot-based regression guards
- **Purpose:** Catch behavioral drift during refactoring
- **Not just unit tests:** They verify real game data and scoring core don't change

### Component Tests (vue-test-utils)
- Mount components, verify DOM
- Test tab switching, search filtering, dropdowns
- Verify excluded tags don't appear in output

### Manual Verification
| Change | Minimum verification |
|--------|----------------------|
| Scoring logic | Run golden master tests + manual score check |
| Tab UI | Click all tabs, verify content loads |
| Search/filter | Type in search boxes, verify rows hide/show |
| Excluded elements | Select tags, verify they don't appear in generator output |
| Synergy display | Select conflicting tags, verify spoiler warning shows |

---

## Build And Test Commands

```powershell
# Development
npm run dev              # Vite dev server on :5174

# Testing
npm run test            # Run Vitest
npm run test:watch     # Watch mode
npm run coverage       # Coverage report

# Linting & Formatting
npm run lint           # ESLint check
npm run format         # Prettier format
npm run check          # All checks (lint + test + type)

# Building
npm run build          # Production build
npm run preview        # Preview built app
```

---

## Verification Tiers

| Change | Minimum Verification |
|--------|----------------------|
| Documentation only | Read-through + diff check |
| TypeScript types only | `npm run check` (type checking) |
| Scoring logic | Golden master snapshots + manual score validation |
| Component UI | Component tests + browser visual check |
| Tab or search feature | Integration test + manual workflow |
| Cross-feature (e.g., synergy affects generator) | All above + full app walkthrough |
| Bug fix regression guard | Original failing case now passes + existing tests still pass |

**Passing tests does not mean the app works.** Component tests can mock the API. Escalate to browser verification when crossing component boundaries.

---

## Git Workflow

### Branch Strategy
```
main (from CallOn84 original)
  └── refactor/vue-migration (your feature branch)
```

### Commit Style
```
feat: Add Vue component for script generator
fix: Restore Excluded Elements functionality
refactor: Extract scoring to utils
test: Add golden master for calculateMatrixScore
chore: Update dependencies
```

### Before Pushing
1. `npm run check` passes (lint + type + test)
2. Golden master tests unchanged (or intentionally updated with reasoning)
3. Manual verification completed for affected features
4. Commit message explains *why*, not just *what*

---

## Formatting

- Use ESLint + Prettier on **files changed by the approved task only**
- Do not commit repository-wide formatting noise
- Format before committing: `npm run format`

---

## Frozen Areas

**Do not modify without explicit approval:**
- `data.js` (game data source) — preserve exact format
- Golden master snapshots — only update with reasoned justification
- Bug fix code paths (Excluded Elements, score tables, requestIdleCallback) — only if improving without losing the fix

---

## Performance Baselines

Measure before/after migration to ensure no regressions:

- **Starting Tags lazy load:** Should complete in <500ms with list visible
- **Search filtering:** Real-time with <300ms debounce
- **Tab switch:** <200ms to display new tab content
- **Score calculation:** <100ms even with 9 tags selected
- **Page load:** <2s with all data loaded

---

## State Management Strategy (Pinia)

Instead of EventBus, use Pinia stores:

```typescript
// stores/game.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGameStore = defineStore('game', () => {
  const excludedTags = ref<string[]>([])
  const selectedTags = ref<string[]>([])
  
  const score = computed(() => calculateScore(selectedTags.value))
  
  const addExclusion = (tagId: string) => {
    if (!excludedTags.value.includes(tagId)) {
      excludedTags.value.push(tagId)
    }
  }
  
  return { excludedTags, selectedTags, score, addExclusion }
})
```

**Why Pinia over EventBus:**
- Reactive by default (computed updates automatically)
- Devtools integration for debugging
- Type-safe with TypeScript
- Matches your financial-classifier pattern

---

## Key Files to Know

| File | Purpose | Touch When |
|------|---------|-----------|
| `src/utils/calculator.ts` | Game scoring logic | Fixing scoring bugs |
| `stores/game.ts` | UI state (Pinia) | Adding features, new state |
| `components/tabs/GeneratorTab.vue` | Script generator UI | Fixing generator features |
| `tests/scoring.test.ts` | Golden master snapshots | Validating scoring refactors |
| `vite.config.js` | Build + dev + test config | Never change without approval |

---

## Questions Before Starting

1. **Vue version:** Vue 3 with Composition API (matches financial-classifier)
2. **State:** Pinia (not useContext/provide-inject)
3. **Styles:** Scoped Vue styles + Tailwind (matches financial-classifier)
4. **Tests:** Vitest + vue-test-utils (matches financial-classifier)
5. **TypeScript:** Full typing, no `any` (matches financial-classifier)

This is your framework. Any deviation requires explicit approval.
