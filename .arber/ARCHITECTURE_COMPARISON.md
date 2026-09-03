# Architecture Comparison & Best Practices Analysis
**Date:** 2026-09-03  
**Repos Analyzed:** 
- Your fork: Hollywood-Animal-Calculator (598 lines of modules, vanilla JS)
- userbig: hollywood-animal-planner (69 files, Vue + TypeScript)
- Your project: financial-classifier (Nuxt + TypeScript)

---

## Executive Summary

| Aspect | Your Fork | userbig | financial-classifier |
|--------|-----------|---------|----------------------|
| **Tech Stack** | Vanilla JS (modules) | Vue 3 + TypeScript | Nuxt 3 + TypeScript |
| **Module Pattern** | ES6 Classes | Vue SFC + Pinia stores | Composables + Pinia |
| **Type Safety** | None | Full TypeScript | Full TypeScript |
| **Performance** | Lazy loading, debouncing | WebAssembly (calc) | SSR-ready, optimized |
| **Testing** | Jest + golden master | TypeScript tests | (integrated) |
| **Build Tool** | None (raw HTML) | Vite | Vite |
| **State Mgmt** | EventBus (manual) | Pinia stores | Pinia stores |
| **Code Size** | ~3,100 LOC total | ~6,019 nodes | Larger (full app) |
| **Maturity** | In progress | Complete | Production |

---

## userbig's Key Strengths (What to Adopt)

### 1. **Component Architecture**
```
src/components/
├── tabs/                    ← Feature-grouped components
│   ├── GeneratorTab.vue
│   ├── SynergyTab.vue
│   └── BoardTab.vue
├── ui/                      ← Reusable UI primitives
│   ├── Button.vue
│   └── Card.vue
└── *Modal.vue              ← Feature-specific modals
```
**Why it works:** Clear separation between feature containers and UI atoms. Easy to find and modify.

**Your pattern now:** Classes grouped by concern (ui/, core/, features/). Similar idea, different syntax.

**Recommendation:** Keep your module pattern but organize Vue components the same way when you transition.

---

### 2. **State Management with Pinia**
```typescript
// userbig pattern (stores/calculator.ts)
export const useCalculatorStore = defineStore('calculator', () => {
  const selectedTags = ref([])
  const score = computed(() => calculateScore(selectedTags))
  
  return { selectedTags, score }
})
```

**vs. Your pattern (EventBus):**
```javascript
// Your pattern
class EventBus {
  on(event, callback) { /* ... */ }
  emit(event, data) { /* ... */ }
}
```

**Comparison:**
- **userbig**: Reactive by default, computed properties, easier debugging
- **Yours**: Manual event coordination, more explicit control

**Recommendation:** Consider Pinia for the refactored version (matches financial-classifier pattern you already use).

---

### 3. **TypeScript Everywhere**
userbig uses TypeScript for:
- Game types (`types/game.ts`)
- Store state (`stores/*.ts`)
- Utilities (`utils/calculator.ts`, `utils/scriptGenerator.ts`)
- Tests (`tests/*.test.ts`)

**Your current approach:** JavaScript + JSDoc (implicit typing)

**Why it matters:** Catches bugs at compile time, better IDE support, self-documenting code.

**Recommendation:** Migrate to TypeScript. Your financial-classifier already does this well.

---

### 4. **WebAssembly for Compute-Heavy Logic**
userbig uses:
```
assembly/  (TypeScript compiled to WebAssembly)
wasmCalculator.ts  (interface to WASM)
```

This gives them **10-100x performance** on complex calculations.

**Your current approach:** Pure JavaScript calculation

**Recommendation:** Not urgent, but if scoring/distribution calculations become slow, WASM is the path.

---

### 5. **Parity: Testing & Build Infrastructure**
| Aspect | userbig | Yours |
|--------|---------|-------|
| Test framework | TypeScript/Vitest | Jest |
| Tests exist | ✅ (`tests/*.test.ts`) | ✅ (106 tests) |
| Build tool | Vite | None (static) |
| CI/CD | ✅ GitHub Actions | ❌ |
| Dev server | Vite dev server | Python/Node HTTP |

---

## Your Current Strengths (What to Keep)

### 1. **Golden Master Testing**
```javascript
// Your approach - snapshot testing
test('calculateMatrixScore — golden master', () => {
  expect(h.call('calculateMatrixScore', combo)).toMatchSnapshot()
})
```

**Why this is good:** 
- Catches behavioral drift during refactoring
- No need to manually assert expected values
- Regression guard

**userbig doesn't have this.** Their tests are more traditional assertions.

**Keep:** This pattern is valuable. Carry it forward.

---

### 2. **Module Extraction From Monolith**
You've successfully pulled:
- Constants → `GameConstants.js`
- Events → `EventBus.js`
- State → Managers (`ActionManager`, `ExclusionManager`)

This is the hardest refactoring. You've done it cleanly.

**Keep:** This discipline. Do the same in Vue.

---

### 3. **Bug Fixes First**
You fixed three critical bugs before refactoring:
- Excluded Elements broken
- Score tables disagreement
- requestIdleCallback in hidden tabs

**userbig may not have these fixed.** Their version might have the same bugs.

**Keep:** Document these fixes prominently in migration.

---

## Migration Roadmap: What to Adopt from Each

### Phase 1: Keep Your Current Work ✅
- All module extractions (GameConstants, EventBus, etc.)
- Golden master tests
- Bug fixes
- Directory structure (`src/core/`, `src/features/`, `src/ui/`)

### Phase 2: Add TypeScript (from financial-classifier)
```
src/
├── core/GameConstants.ts      (was .js)
├── ui/EventBus.ts            (type-safe events)
└── features/...ts            (typed parameters)
```

**Benefit:** Catch bugs at compile time. Better IDE autocomplete.

### Phase 3: Evaluate Framework Choice
**Option A: Stay Vanilla + Type Hints**
- Keep HTML/CSS/JS
- Add TypeScript
- Use build tool (Vite) for bundling

**Option B: Adopt Vue (like userbig)**
- Migrate components to SFC format
- Use Pinia for state (like financial-classifier)
- Vite + TypeScript

**Recommendation:** Option B is better long-term, but Option A is less effort.

### Phase 4: Add Pinia (from both projects)
```typescript
// Replace EventBus with Pinia store
export const useGameStore = defineStore('game', () => {
  const excludedTags = ref([])
  const selectedTags = ref([])
  
  return { excludedTags, selectedTags }
})
```

**Benefit:** Reactive by default, easier debugging, matches financial-classifier.

---

## Specific Best Practices to Adopt

### 1. **Localization (from userbig)**
```
public/localization/
├── English.json
├── Spanish.json
├── Chinese.json
└── ...
```

Your fork doesn't have this. userbig's does (10 languages).

**Adoption:** Add JSON files for common strings. Use a simple i18n helper.

---

### 2. **Modular Utilities (from both)**
userbig pattern:
```
src/utils/
├── calculator.ts      (pure functions)
├── scriptGenerator.ts (side-effect logic)
└── wasmCalculator.ts  (performance-critical)
```

Your pattern:
```
src/core/GameConstants.js (single source of truth)
src/features/scriptGenerator/ (feature-grouped)
```

**Hybrid approach:** Keep your feature grouping, add utils/ for shared logic.

---

### 3. **ESLint + Prettier (from financial-classifier)**
```json
{
  "eslint.config.js": "Enforce code style",
  "prettier.config.js": "Auto-format on save"
}
```

Your fork doesn't have linting configured.

**Adoption:** Add eslint + prettier to package.json scripts.

---

### 4. **Types Directory (from userbig)**
```
src/types/game.ts
```

Define your game domain:
```typescript
type TagCategory = 'Genre' | 'Setting' | 'Protagonist' | ...
type ScoreResult = { totalScore: number; spoilers: string[] }
```

**Adoption:** Create `src/types/game.ts` during TypeScript migration.

---

## Files to Review in Your New Repo

**Create in hollywood-animal-extended:**

```
├── src/
│   ├── core/
│   │   ├── GameConstants.ts       (typed version of your .js)
│   │   ├── DistributionEngine.ts  (with types)
│   │   └── ActionManager.ts
│   ├── features/
│   │   └── scriptGenerator/
│   │       ├── ExclusionManager.ts
│   │       ├── ScriptGeneratorUI.ts
│   │       └── ScriptSearch.ts
│   ├── ui/
│   │   ├── EventBus.ts
│   │   └── TabManager.ts
│   ├── utils/                     ← NEW
│   │   ├── calculator.ts          (pure functions)
│   │   └── scoring.ts             (golden master stuff)
│   ├── types/                     ← NEW
│   │   └── game.ts
│   └── stores/                    ← NEW (if using Pinia)
│       ├── calculator.ts
│       └── game.ts
├── tests/
│   └── (your existing 106 tests, converted to TypeScript)
├── public/
│   ├── data/
│   │   ├── TagData.json
│   │   └── TagCompatibilityData.json
│   └── localization/              ← NEW (from userbig)
├── .eslintrc.json                 ← NEW
├── prettier.config.json           ← NEW
├── tsconfig.json                  ← NEW
└── vite.config.js                 ← NEW
```

---

## Decision Matrix: What to Implement First

| Priority | Feature | From | Effort | Value |
|----------|---------|------|--------|-------|
| 1️⃣ | TypeScript migration | financial-classifier | Medium | High |
| 2️⃣ | Keep your module structure | Yours | None | High |
| 3️⃣ | Pinia state management | Both | Medium | High |
| 4️⃣ | ESLint + Prettier | financial-classifier | Low | Medium |
| 5️⃣ | Localization (i18n) | userbig | Medium | Low |
| 6️⃣ | WebAssembly (future) | userbig | High | Low (future) |
| 7️⃣ | Vue SFC migration | userbig | High | Medium (future) |

---

## Checklist for hollywood-animal-extended

**Week 1: Foundation**
- [ ] Create `tsconfig.json` (from financial-classifier)
- [ ] Convert `.js` files to `.ts` (automated with tsc)
- [ ] Add `src/types/game.ts`
- [ ] Add ESLint + Prettier config

**Week 2: State Management**
- [ ] Add Pinia to package.json
- [ ] Convert EventBus to `stores/game.ts` (Pinia)
- [ ] Update all tests to TypeScript

**Week 3: Polish**
- [ ] Add localization JSON files (Spanish, German from userbig)
- [ ] Create `src/utils/` for shared logic
- [ ] Run linter, auto-format with prettier

**Week 4+: Optional**
- [ ] Evaluate Vue migration (if team agrees)
- [ ] Add GitHub Actions CI (from userbig's `.github/workflows/`)

---

## Summary: Your Competitive Advantage

Your fork has:
1. **Cleaner bug fixes** (3 critical issues fixed)
2. **Better testing** (golden master snapshots)
3. **Modular foundation** (598 lines of focused classes)

Combined with:
- **TypeScript** (from financial-classifier)
- **Pinia** (from both projects)
- **Localization** (from userbig)

You'll have the best of both worlds: the discipline of modular architecture + the developer experience of modern TypeScript.

---

**Next Step:** Should we convert to TypeScript first, or build the new repo incrementally with both approaches running in parallel?
