# Vue 3 Migration Guide - Vanilla JS → Vue Components

**Scope:** Convert hollywood-animal-calculator from vanilla JS to Vue 3 + TypeScript  
**Constraint:** **ZERO behavioral/visual changes.** Bug fixes already applied must not regress.  
**Timeline:** Incremental - migrate one tab/component at a time, test after each.

---

## Phase 1: Foundation (Week 1)

### 1.1 Project Setup

```bash
cd C:\Users\testUser\IdeaProjects\hollywood-animal-extended

# Create frontend structure
npm create vite@latest . -- --template vue-ts

# Install dependencies
npm install

# Copy from financial-classifier
cp ../financial-classifier/frontend/vite.config.js .
cp ../financial-classifier/frontend/.eslintrc .
cp ../financial-classifier/frontend/prettier.config.js .
```

### 1.2 Copy Static Files

```
public/
├── data/
│   ├── TagData.json                    (from data.js content)
│   ├── TagCompatibilityData.json
│   └── TagsAudienceWeights.json
└── localization/
    ├── English.json
    └── [others from userbig]
```

### 1.3 Create Type Definitions

```typescript
// src/types/game.ts
export type TagCategory = 'Genre' | 'Setting' | 'Protagonist' | 'Antagonist' | 'Supporting Character' | 'Theme & Event' | 'Finale'

export interface Tag {
  id: string
  category: TagCategory
  art: number
  com: number
}

export interface ScoreResult {
  totalScore: number
  rawAverage: number
  spoilers: string[]
}

export interface ComboTag {
  id: string
  category: TagCategory
  percent?: number
}
```

### 1.4 Extract Pure Functions

Migrate from `script.js` to `utils/`:

```typescript
// src/utils/calculator.ts
import { Tag, ComboTag, ScoreResult } from '@/types/game'

export function calculateMatrixScore(tags: ComboTag[]): ScoreResult {
  // Exact copy from script.js:calculateMatrixScore()
  // No changes to logic — only format change (vanilla JS → TypeScript)
}

export function calculateGenrePairScore(tags: ComboTag[]): any {
  // Exact copy from script.js:calculateGenrePairScore()
}

export function getRequiredElementCount(targetScore: number): number {
  // Extracted from script.js:getRequiredElementCount()
  // Already defined in your refactor
}
```

**Why copy exact code:** Snapshots will match. No logic changes = no surprises.

### 1.5 Migrate Tests

```typescript
// tests/scoring.test.ts (convert from Jest to Vitest)
import { describe, test, expect, beforeAll } from 'vitest'
import { calculateMatrixScore } from '@/utils/calculator'

describe('calculateMatrixScore', () => {
  test('two genres weighted 60/40', () => {
    const combo = [...]
    expect(calculateMatrixScore(combo)).toMatchSnapshot()
  })
})
```

**Copy snapshots verbatim** from your current Jest suite.

---

## Phase 2: State Management (Week 1-2)

### 2.1 Create Pinia Store

Replace `EventBus` with reactive store:

```typescript
// src/stores/game.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GAME_DATA } from '@/api/gameData'

export const useGameStore = defineStore('game', () => {
  // State
  const selectedTags = ref<ComboTag[]>([])
  const excludedTags = ref<string[]>([])
  const currentTab = ref<'generator' | 'synergy' | 'advertisers'>('generator')
  
  // Computed (replaces EventBus emit)
  const generatorOutput = computed(() => {
    const filtered = selectedTags.value.filter(t => !excludedTags.value.includes(t.id))
    return generateScripts(filtered)
  })
  
  const currentScore = computed(() => {
    return calculateMatrixScore(selectedTags.value).totalScore
  })
  
  // Actions (replaces EventBus on)
  const addSelectedTag = (tag: ComboTag) => {
    selectedTags.value.push(tag)
    // Trigger any dependent calculations
  }
  
  const addExcludedTag = (tagId: string) => {
    if (!excludedTags.value.includes(tagId)) {
      excludedTags.value.push(tagId)
    }
  }
  
  return {
    selectedTags,
    excludedTags,
    currentTab,
    generatorOutput,
    currentScore,
    addSelectedTag,
    addExcludedTag,
  }
})
```

**How it replaces EventBus:**

| Before (EventBus) | After (Pinia) |
|------------------|---------------|
| `eventBus.emit('tags-updated', tags)` | `store.selectedTags = [...tags]` |
| `eventBus.on('tags-updated', cb)` | `watch(store.selectedTags, cb)` |
| `eventBus.score` (custom) | `store.currentScore` (computed) |

### 2.2 Remove EventBus

Once store is working, you can delete:
- `src/ui/EventBus.js`
- All `eventBus.on()` and `eventBus.emit()` calls
- Old state management code

---

## Phase 3: Components (Week 2-3)

### 3.1 Create Root App

```vue
<!-- src/App.vue -->
<template>
  <div class="hollywood-calculator">
    <AppHeader />
    <TabNavigation />
    <component :is="currentTabComponent" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import AppHeader from '@/components/AppHeader.vue'
import TabNavigation from '@/components/TabNavigation.vue'
import GeneratorTab from '@/components/tabs/GeneratorTab.vue'
import SynergyTab from '@/components/tabs/SynergyTab.vue'
import AdvertisersTab from '@/components/tabs/AdvertisersTab.vue'

const store = useGameStore()

const currentTabComponent = computed(() => {
  const tabs: Record<string, any> = {
    generator: GeneratorTab,
    synergy: SynergyTab,
    advertisers: AdvertisersTab,
  }
  return tabs[store.currentTab]
})
</script>

<style scoped>
.hollywood-calculator {
  display: flex;
  flex-direction: column;
}
</style>
```

### 3.2 Migrate First Tab: Script Generator

```vue
<!-- src/components/tabs/GeneratorTab.vue -->
<template>
  <div class="generator-tab">
    <!-- Profile selector -->
    <div class="profile-selector">
      <button 
        v-for="profile in profiles" 
        :key="profile"
        :class="{ active: store.currentProfile === profile }"
        @click="store.setProfile(profile)"
      >
        {{ profile }}
      </button>
    </div>

    <!-- Tag categories -->
    <div v-for="category in categories" :key="category" class="category">
      <h3>{{ category }}</h3>
      <input 
        v-model="searchTerms[category]"
        type="text"
        :placeholder="`Search ${category}...`"
        class="search-input"
      />
      <select 
        multiple
        @change="handleTagSelect"
      >
        <option 
          v-for="tag in filteredTags(category)"
          :key="tag.id"
          :value="tag.id"
        >
          {{ tag.id }}
        </option>
      </select>
    </div>

    <!-- Generated scripts output -->
    <div v-if="store.generatorOutput.length" class="output">
      <div v-for="script in store.generatorOutput" :key="script.id">
        {{ script.name }} (Score: {{ script.score }})
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { GAME_DATA } from '@/api/gameData'

const store = useGameStore()
const searchTerms = ref<Record<string, string>>({})

const categories = Object.keys(GAME_DATA.tags)
  .map(id => GAME_DATA.tags[id].category)
  .filter((v, i, a) => a.indexOf(v) === i)
  .sort()

const filteredTags = (category: string) => {
  const search = (searchTerms.value[category] || '').toLowerCase()
  return Object.values(GAME_DATA.tags)
    .filter(t => t.category === category)
    .filter(t => !search || t.id.toLowerCase().includes(search))
}

const handleTagSelect = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const selectedId = target.value
  // Update store with selected tag
  store.addSelectedTag({ id: selectedId, category: '', percent: 1 })
}
</script>

<style scoped>
.generator-tab { padding: 1rem; }
.category { margin-bottom: 1.5rem; }
.search-input { width: 100%; padding: 0.5rem; }
</style>
```

### 3.3 Migrate Synergy Tab (Similar Pattern)

```vue
<!-- src/components/tabs/SynergyTab.vue -->
<template>
  <div class="synergy-tab">
    <!-- Display selected tags -->
    <div class="selected-tags">
      <div v-for="tag in store.selectedTags" :key="tag.id">
        {{ tag.id }}
      </div>
    </div>

    <!-- Synergy matrix -->
    <div v-if="synergy" class="synergy-result">
      <p>Score: {{ synergy.totalScore }}</p>
      <div v-if="synergy.spoilers.length" class="warnings">
        <p v-for="spoiler in synergy.spoilers" :key="spoiler">
          ⚠️ {{ spoiler }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { calculateMatrixScore } from '@/utils/calculator'

const store = useGameStore()

const synergy = computed(() => {
  return calculateMatrixScore(store.selectedTags)
})
</script>
```

### 3.4 Migrate Advertisers Tab (Similar Pattern)

Repeat for `AdvertisersTab.vue` using same structure.

---

## Phase 4: Integration Testing (Week 3)

### 4.1 Test Each Tab

```typescript
// tests/GeneratorTab.test.ts
import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GeneratorTab from '@/components/tabs/GeneratorTab.vue'
import { createPinia } from 'pinia'

describe('GeneratorTab', () => {
  test('displays all categories', () => {
    const wrapper = mount(GeneratorTab, {
      global: {
        plugins: [createPinia()],
      },
    })
    
    expect(wrapper.text()).toContain('Genre')
    expect(wrapper.text()).toContain('Setting')
    expect(wrapper.text()).toContain('Protagonist')
  })
  
  test('filtering works', async () => {
    const wrapper = mount(GeneratorTab, {
      global: {
        plugins: [createPinia()],
      },
    })
    
    const search = wrapper.find('[placeholder*="Search"]')
    await search.setValue('Comedy')
    // Verify filtered results
  })
})
```

### 4.2 Verify Golden Master Snapshots

```bash
npm run test -- tests/scoring.test.ts

# Should output: ✅ All snapshots match
# If not: manual review required
```

### 4.3 Manual Walkthrough

- [ ] Click all tabs, content loads correctly
- [ ] Select a tag, verify it appears in synergy
- [ ] Add excluded tag, verify it doesn't appear in generator output
- [ ] Select conflicting tags (e.g., AMERICAN_CIVIL_WAR + ALIEN), verify spoiler warning
- [ ] Change profile (Starting Tags → Custom), list rebuilds
- [ ] Search in each category, results filter in real-time
- [ ] Click "Generate", scripts appear with correct scores

---

## Phase 5: Final Cleanup (Week 3-4)

### 5.1 Delete Vanilla Code (When Vue is 100% Complete)

```bash
# Only after all tests pass AND manual verification complete
rm -f src/ui/EventBus.js
rm -f src/ui/TabManager.js
rm -f tests/helpers/legacyHarness.js  (was only needed for vanilla testing)
```

### 5.2 Update README

```markdown
# Hollywood Animal Extended

Vue 3 + TypeScript implementation of the Hollywood Animal calculator with:
- Enhanced script generator with per-category search
- Fixed excluded elements functionality  
- Score calculation verification
- Comprehensive test suite with golden master snapshots

## Development

```bash
npm run dev        # Start dev server
npm run test       # Run tests
npm run build      # Production build
```

Built on the original [CallOn84/Hollywood-Animal-Calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator)  
Extended with features and fixes from [userbig/hollywood-animal-planner](https://github.com/userbig/hollywood-animal-planner)
```

### 5.3 Create CHANGELOG

```markdown
# Changelog

## [Extended 1.0] - 2026-09-XX

### Refactored
- Migrated from vanilla JS to Vue 3 + TypeScript
- Converted EventBus to Pinia state management
- Extracted pure scoring functions to `utils/calculator.ts`

### Fixed
- ✅ Excluded Elements silently non-functional (0 → 194 tags reaching generator)
- ✅ Score tables disagreement (UI ↔ generator values now match)
- ✅ requestIdleCallback fails in hidden tabs (replaced with setTimeout)
- ✅ Lazy-load flag never cleared (clear on profile switch)
- ✅ Score help text not initialized on page load

### Added
- Per-category search with real-time filtering
- Keyboard shortcuts (Esc/Enter)
- Search highlighting (green/red glow)
- Alphabetical category sorting
- Performance debouncing (300ms)

### Dependencies
- Vue 3
- TypeScript
- Pinia
- Vite
- Vitest
```

---

## Rollback Plan

If Vue migration introduces regressions:

1. **Identify:** Which feature broke? (e.g., "excluded tags leaking into output")
2. **Isolate:** Which component/store? (e.g., `GeneratorTab.vue` or `useGameStore`)
3. **Compare:** Against vanilla version (still available in git history)
4. **Fix:** Update Vue version to match vanilla behavior
5. **Test:** Golden master snapshots + manual verification

**You should not need to rollback.** Incremental migration + testing after each phase prevents big surprises.

---

## Debugging Tips

### 1. Snapshot Mismatch
```bash
npm run test -- --ui

# Shows old vs new snapshot side-by-side
# If intentional, update: npm run test -- -u
```

### 2. State Not Updating
Use Vue DevTools:
- Right-click → "Inspect Vue component"
- Look for Pinia store tab
- Verify `selectedTags` updates when you select tags

### 3. Component Not Rendering
```vue
<script setup>
// Add debug logging
const store = useGameStore()
console.log('Store state:', store.$state)
</script>
```

### 4. Search Not Filtering
Verify computed property is running:
```typescript
const filteredTags = computed(() => {
  console.log('Computing filtered tags...')
  return Object.values(GAME_DATA.tags)...
})
```

---

## Success Criteria

- ✅ All 106 tests pass (including golden master snapshots)
- ✅ Manual walkthrough passes all scenarios
- ✅ No regressions in the 5 bugs fixed above
- ✅ Visual appearance identical to vanilla version
- ✅ Performance baselines met (see AGENTS.md)
- ✅ TypeScript: no `any` types, strict mode enabled

**When you hit all criteria, the migration is complete.**
