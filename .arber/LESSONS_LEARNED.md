# Lessons Learned: Vue Best Practices from financial-classifier

This document captures lessons from 2+ years of Vue 3 + TypeScript development in financial-classifier. Apply these patterns directly to hollywood-animal-extended.

---

## 1. State Management: Pinia > EventBus

**Lesson:** Pinia stores are more maintainable than custom EventBus pattern.

### Why EventBus Failed in financial-classifier Early Attempts
```typescript
// ❌ Old pattern (manual events)
eventBus.on('transaction-added', (tx) => {
  this.transactions.push(tx)
  this.total += tx.amount
  eventBus.emit('total-updated', this.total)
  // Now you have two sources of truth: listener state + emitted value
  // Debugging: "Why is total out of sync with transactions?"
})
```

### Why Pinia Works
```typescript
// ✅ Pinia pattern (reactive by default)
export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  
  // Computed automatically updates when transactions change
  const total = computed(() => 
    transactions.value.reduce((sum, tx) => sum + tx.amount, 0)
  )
  
  const addTransaction = (tx: Transaction) => {
    transactions.value.push(tx)
    // total updates automatically, no manual emit needed
  }
  
  return { transactions, total, addTransaction }
})
```

**Application to hollywood-animal-extended:**
- Replace `EventBus` with Pinia store (`src/stores/game.ts`)
- Make score/excludedTags reactive properties
- Use `computed()` for derived values (e.g., `generatorOutput`)
- No manual `emit` calls needed

---

## 2. Component Organization: Tabs + UI Primitives

**Lesson:** Organize components by their purpose, not by type.

### Pattern (from financial-classifier)
```
src/components/
├── tabs/
│   ├── TransactionsTab.vue    ← Full-page feature
│   ├── BudgetTab.vue
│   └── ReportsTab.vue
├── ui/
│   ├── Button.vue             ← Reusable primitives
│   ├── Card.vue
│   └── Modal.vue
└── modals/
    ├── ImportModal.vue        ← Feature-specific dialogs
    ├── CategoryEditor.vue
    └── TransactionDetail.vue
```

**Why this works:**
- Easy to find tab components (under `tabs/`)
- UI primitives are clearly reusable (under `ui/`)
- Feature-specific dialogs live near their parents
- No need to search 20 component files to find what renders a button

**Application to hollywood-animal-extended:**
```
src/components/
├── tabs/
│   ├── GeneratorTab.vue       ← Script generator full UI
│   ├── SynergyTab.vue         ← Synergy checker full UI
│   └── AdvertisersTab.vue     ← Advertisers full UI
├── ui/
│   ├── Button.vue             ← Reusable dropdown/button
│   ├── Card.vue
│   └── Modal.vue
└── modals/
    ├── SaveScriptModal.vue
    └── SettingsModal.vue
```

---

## 3. Typed Props & Emits: No `any`

**Lesson:** TypeScript + `<script setup>` catches bugs at compile time, not runtime.

### ❌ Bad (financial-classifier v0)
```vue
<script>
export default {
  props: ['transaction'],  // What type? No one knows
  methods: {
    updateAmount(amount) {  // Is this a string or number?
      this.$emit('update', { ...this.transaction, amount })
    }
  }
}
</script>
```

**Problems:**
- Typo in prop name? Runtime error, user sees blank page.
- Called with wrong type? Maybe it works, maybe it silently fails later.
- Refactoring? You don't know which components use this prop.

### ✅ Good (financial-classifier current)
```vue
<script setup lang="ts">
import { Transaction } from '@/types/transaction'

interface Props {
  transaction: Transaction
}

interface Emits {
  (e: 'update', payload: { transaction: Transaction; amount: number }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateAmount = (amount: number) => {
  emit('update', {
    transaction: props.transaction,
    amount: amount,
  })
}
</script>
```

**Benefits:**
- TypeScript error at compile time if you pass wrong type
- IDE autocomplete knows all props and their types
- Refactoring? IDE shows all usages
- Prop renaming? Compiler catches all callers

**Application to hollywood-animal-extended:**
```typescript
// src/types/game.ts
export interface Tag {
  id: string
  category: TagCategory
  art: number
  com: number
}

// src/components/tabs/GeneratorTab.vue
interface Props {
  tags: Tag[]
}

interface Emits {
  (e: 'tag-selected', tag: Tag): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
```

---

## 4. Composition Functions (Composables) for Logic Reuse

**Lesson:** Extract complex logic to composables, not just utility functions.

### Composables vs Utils

| Use Composables | Use Utils |
|---|---|
| Logic that uses Vue reactivity (`ref`, `computed`) | Pure functions (no side effects) |
| Logic that needs lifecycle hooks | Number crunching, formatting |
| Logic shared between multiple components | Business logic that doesn't need Vue |

### Example from financial-classifier

```typescript
// src/composables/useTransactionFilters.ts
import { ref, computed } from 'vue'
import type { Transaction, FilterCriteria } from '@/types'

export const useTransactionFilters = (transactions: Ref<Transaction[]>) => {
  const filters = ref<FilterCriteria>({
    category: '',
    minAmount: 0,
    maxAmount: 999999,
    startDate: null,
    endDate: null,
  })

  const filtered = computed(() => {
    return transactions.value.filter(tx => {
      if (filters.value.category && tx.category !== filters.value.category) return false
      if (tx.amount < filters.value.minAmount) return false
      if (tx.amount > filters.value.maxAmount) return false
      // ... date checks
      return true
    })
  })

  const setCategory = (cat: string) => {
    filters.value.category = cat
  }

  return { filters, filtered, setCategory }
}
```

### Used in a component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useTransactionFilters } from '@/composables/useTransactionFilters'

const transactions = ref([...])
const { filters, filtered, setCategory } = useTransactionFilters(transactions)
</script>

<template>
  <div>
    <input v-model="filters.category" />
    <div v-for="tx in filtered">{{ tx.name }} {{ tx.amount }}</div>
  </div>
</template>
```

### Application to hollywood-animal-extended

```typescript
// src/composables/useScriptGenerator.ts
import { ref, computed } from 'vue'
import type { ComboTag } from '@/types/game'
import { calculateMatrixScore, generateScripts } from '@/utils/calculator'

export const useScriptGenerator = () => {
  const selectedTags = ref<ComboTag[]>([])
  const excludedTags = ref<string[]>([])
  
  const score = computed(() => {
    return calculateMatrixScore(selectedTags.value).totalScore
  })
  
  const generatedScripts = computed(() => {
    const filtered = selectedTags.value.filter(t => 
      !excludedTags.value.includes(t.id)
    )
    return generateScripts(filtered)
  })
  
  return { selectedTags, excludedTags, score, generatedScripts }
}
```

---

## 5. Test Structure: Co-locate Tests with Components

**Lesson:** Put `.test.ts` files next to source files, not in separate `tests/` folder.

### From financial-classifier
```
src/
├── components/
│   ├── TransactionTable.vue
│   ├── TransactionTable.test.ts     ← Co-located
│   └── ...
├── composables/
│   ├── useTransactionFilters.ts
│   ├── useTransactionFilters.test.ts ← Co-located
└── utils/
    ├── calculator.ts
    ├── calculator.test.ts           ← Co-located
```

**Benefits:**
- Easy to find tests (right next to the code)
- Encouraged to test (it's obvious what needs testing)
- Easier to delete dead code (test file deletion is obvious)

### Vite Configuration
```javascript
// vite.config.js
test: {
  include: ['src/**/*.{test,spec}.js'],  // Find co-located tests
  exclude: ['node_modules', 'dist'],
}
```

**Application:**
```
src/
├── components/
│   ├── GeneratorTab.vue
│   ├── GeneratorTab.test.ts      ← Add these
│   └── ...
├── utils/
│   ├── calculator.ts
│   └── calculator.test.ts        ← Move from tests/
```

---

## 6. Handling Side Effects: watchEffect + watch

**Lesson:** Use `watchEffect` for "do this when X changes" and `watch` when you need old vs new values.

### ❌ Old Pattern (Lifecycle Hooks)
```vue
<script>
export default {
  data() {
    return { selectedCategory: null }
  },
  methods: {
    fetchTransactions() { /* ... */ }
  },
  mounted() {
    this.fetchTransactions()
    // Now if selectedCategory changes, nothing happens
  }
}
</script>
```

### ✅ New Pattern (Composition API)
```vue
<script setup lang="ts">
import { ref, watch, watchEffect } from 'vue'

const selectedCategory = ref('')
const transactions = ref([])

// Fetch when component mounts
watchEffect(async () => {
  transactions.value = await api.fetchTransactions(selectedCategory.value)
})

// Or with watch if you need old/new values:
watch(selectedCategory, (newCategory, oldCategory) => {
  console.log(`Changed from ${oldCategory} to ${newCategory}`)
  // Fetch only for the new category
})
</script>
```

**Key difference:**
- `watchEffect()`: Tracks all reactive dependencies automatically
- `watch()`: Explicit dependencies, get old + new values

**Application:**
```typescript
// src/stores/game.ts
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useGameStore = defineStore('game', () => {
  const currentProfile = ref('Starting Tags')
  const excludedTags = ref<string[]>([])
  
  // When profile changes, clear excluded tags (bug fix #4)
  watch(currentProfile, () => {
    excludedTags.value = []
  })
  
  return { currentProfile, excludedTags }
})
```

---

## 7. Error Handling: Always Handle API Errors

**Lesson:** Network requests fail. Plan for it.

### ❌ Bad
```typescript
const loadData = async () => {
  const data = await fetch('/api/data')
  this.data = await data.json()  // What if fetch fails?
}
```

### ✅ Good
```typescript
const loadData = async () => {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    this.data = await response.json()
  } catch (error) {
    this.error = error.message
    this.showErrorNotification('Failed to load data')
  } finally {
    this.isLoading = false
  }
}
```

**Application:**
- Wrap all `GAME_DATA` loads in try-catch
- Show user-friendly error messages
- Don't leave UI in loading state forever

---

## 8. Performance: Lazy Load Data, Debounce Filters

**Lesson:** Fetch data on-demand, debounce expensive computations.

### From hollywood-animal-calculator (already applied, keep it!)
```typescript
// Debounce search filtering (300ms wait)
const debouncedSearch = debounce((term: string) => {
  filteredTags.value = tags.filter(t => 
    t.id.toLowerCase().includes(term.toLowerCase())
  )
}, 300)

// Lazy load Starting Tags only when clicked
watch(currentProfile, () => {
  if (currentProfile.value === 'Starting Tags' && !startingTagsLoaded.value) {
    loadStartingTags()
    startingTagsLoaded.value = true
  }
})
```

**Metrics to track:**
- Search response: <300ms (user sees results while typing)
- Tab switch: <200ms (new tab renders instantly)
- Page load: <2s (all data available)

---

## 9. Pinia Persistence (Future Enhancement)

**Lesson:** Save Pinia state to localStorage for "remember last selection".

### If you want to save user selections:
```typescript
// src/stores/game.ts
import { useStorage } from '@vueuse/core'

export const useGameStore = defineStore('game', () => {
  const selectedTags = useStorage('hollywood_selectedTags', [], localStorage, {
    serializer: StorageSerializers.json,
  })
  
  // Now selectedTags persists across page reloads
})
```

**For now:** Don't implement this. Focus on parity first, then add if users ask.

---

## 10. DevTools & Debugging

**Lesson:** Vue DevTools + Pinia DevTools make debugging trivial.

### Must-Have Extensions
- [Vue.js DevTools](https://devtools.vuejs.org/) (Chrome/Firefox)
- Shows component hierarchy, props, lifecycle
- Pinia DevTools built-in (shows all store state changes)

### Debugging Script
```vue
<script setup lang="ts">
import { useGameStore } from '@/stores/game'

const store = useGameStore()

// In browser console:
// store.selectedTags → all selected tags
// store.currentScore → current score
// store.$patch({ ... }) → manually update state
</script>
```

---

## 11. Documentation Patterns from financial-classifier

**Use for hollywood-animal-extended:**

### JSDoc for Functions
```typescript
/**
 * Calculate score from tag combinations.
 * 
 * @param tags - Array of selected tags with weights
 * @returns Score result including total, average, and any spoiler warnings
 * @throws Error if tags array is malformed
 * 
 * @example
 * const result = calculateMatrixScore([
 *   { id: 'ACTION', category: 'Genre', percent: 0.6 },
 *   { id: 'DRAMA', category: 'Genre', percent: 0.4 },
 * ])
 * console.log(result.totalScore) // e.g., 6.5
 */
export function calculateMatrixScore(tags: ComboTag[]): ScoreResult {
  // ...
}
```

### Type Documentation
```typescript
/**
 * Represents a single story element (tag) in the game.
 * 
 * @property id - Unique identifier (e.g., "ACTION", "ANTAGONIST_ALIEN")
 * @property category - Story category this tag belongs to
 * @property art - Art score contribution (0-10)
 * @property com - Comedy score contribution (0-10)
 */
export interface Tag {
  id: string
  category: TagCategory
  art: number
  com: number
}
```

---

## Summary Checklist for hollywood-animal-extended

- [ ] **State:** Use Pinia, no EventBus
- [ ] **Components:** Organize as `tabs/`, `ui/`, `modals/`
- [ ] **Props/Emits:** All typed, no `any`
- [ ] **Logic:** Composables for reactive, utils for pure
- [ ] **Tests:** Co-located `.test.ts` files
- [ ] **Effects:** Use `watch`/`watchEffect`, not lifecycle hooks
- [ ] **Errors:** Always handle fetch failures
- [ ] **Performance:** Debounce + lazy load (already done in JS version, maintain it)
- [ ] **Debugging:** Use Vue DevTools
- [ ] **Docs:** JSDoc on public functions + types

**When all are done, you have a production-ready Vue app.**
