# P6 — Invariant Drift Audit

Run 2026-09-24 using prompt P6 in `docs/AUDIT_PROMPTS.md`.

**Question asked:** which pairs of lists, constants, or branches must agree
for the app to be correct, and nothing tests they do?

## Findings

### 1. The Hidden Panel List (Critical)

**The two lists that must agree:**
- `hideGravesEvaluationResults()` — clears five panels
- The reveal-panels code after evaluation — unhides the same five

**Location:** src/evaluation/gravesAudience.js, lines ~60–80

**What breaks if they drift:**
- A panel missing from the hide list: shows stale numbers or placeholder from previous run
- A panel missing from the reveal list: disappears permanently until reload

**Test coverage:** None. A manual test proved this; no automated guard.

**Current state:** Lists are identical today, but hand-maintained. If a panel is
added to the UI, both lists must be updated, or one breaks silently while the
other works.

**Why it matters:** This incident has already occurred (noted in CLAUDE.md
implementation traps). The fix was manual. Second recurrence is inevitable
without a guard.

---

### 2. The Repeatable Categories Mirror (High Value)

**The two lists that must agree:**
- `MULTI_SELECT_CATEGORIES` in `src/app/state.js` — what the UI allows to multi-select
- The actual game data schema — which categories the game defines

**Location:** src/app/state.js (declared), used by 8x in storyElementSelector.js

**What breaks if they drift:**
- New category added to game data but not to `MULTI_SELECT_CATEGORIES`:
  - The UI refuses to allow multiple selections
  - The category becomes effectively single-select, surprising the player
  - No error message; it just silently behaves wrong
- Category removed from game data but not from `MULTI_SELECT_CATEGORIES`:
  - The UI offers a multi-select control for a category that doesn't exist
  - Selecting it produces an error downstream

**Test coverage:** P5 audit found: 0 tests guard this.

**Current state:** List is complete and correct today. But `GAME_DATA.tags` is
loaded at runtime, and the list is hand-written. If the game-data JSON changes,
the constant does not auto-update.

**Cheap guard:** Derive the repeatable-category list from GAME_DATA at runtime,
or assert at load time that every category in GAME_DATA appears in either
MULTI_SELECT_CATEGORIES or the hardcoded single-select set. Currently neither
happens.

---

### 3. The Mandatory Categories List (Build for Target)

**The two lists that must agree:**
- `TARGETED_MANDATORY_CATEGORIES` in `src/marketing/targetedAds.js` — genres, setting, protagonist, antagonist, finale
- The actual rules about which categories appear in every script

**Location:** src/marketing/targetedAds.js, line ~210

**What breaks if they drift:**
- New category added to mandatory list but doesn't appear in scripts:
  - Build for Target tries to seed it, finds zero options, fails
- Mandatory category removed from list but scripts still carry it:
  - Combinations can be generated without that category
  - Generated scripts become invalid

**Test coverage:** No test. The list is hardcoded.

**Current state:** Matches the game rules. But it is hand-maintained, and the
only source of truth is `docs/GAME_RULES.md`.

**Cheap guard:** If a new script mode appears that seeds categories, it will
likely copy-paste this list. Without a single source of truth, the next copy
will drift independently. A guard that extracts this from a configuration object
(even just a comment in a config file) would prevent it.

---

### 4. The Bridge Wrapper Exports

**The two things that must agree:**
- The exports of `HACStoryElementSelector` and similar in `src/app/script.js`
- The places that call these exported functions

**Location:** src/app/script.js, lines ~70–150

**What breaks if they drift:**
- Export removed, caller still uses it: code is loaded and parsed, but only
  fails when that code path runs (lazy failure)
- Caller removed but export kept: code is loaded and parsed, the wrapper is
  never exercised, so any bug in the wrapper hides

**Test coverage:** No test exercises the bridge, so unused exports don't fail.

**Current state:** Complete today. But every export is hand-written, and every
caller is hand-written, and nothing automated checks they match.

**Why it matters:** P5 found a test that passed vacuously because the code path
it was supposed to test was deleted. The same risk applies here — an unused
export can hide a bug.

---

### 5. The Panel Hide/Reveal Shadow (Graves)

**The two code paths that must agree:**
- Graves evaluation clear-and-hide: which panels get hidden
- Graves reset: which panels get cleared

**Location:**
- Hide: src/evaluation/gravesAudience.js
- Clear: src/app/script.js (reset handlers)

**What breaks if they drift:**
- A panel is hidden but not cleared: shows stale markup from previous run
- A panel is cleared but not hidden: markup is gone, CSS doesn't hide it, but
  it's already empty so invisible anyway (brittle)

**Test coverage:** No test.

**Current state:** Assumed synchronized, never verified.

---

### 6. The HTML Script Load Order (Implicit Contract)

**The two things that must agree:**
- The order `<script>` tags appear in `index.html`
- The dependency order of modules (what calls what)

**Location:** index.html `<head>` section

**What breaks if they drift:**
- Module A loaded before module B, but A calls B:
  - B is undefined at load time
  - Runtime error when A is first exercised
- Unused module loaded first: doesn't break anything, just wastes time

**Test coverage:** `moduleGlobals.test.js` checks that 13 declared bindings
resolve after the bundle loads, but it does not verify the load order is
necessary and sufficient.

**Current state:** Correct today. But `index.html` is hand-maintained, and the
comment at the top of each module doesn't say what it depends on.

**Why it matters:** Moving a `<script>` tag for performance or readability could
break the app in ways that only surface when a particular code path runs. A
comment-based dependency list would make the order explicit and auditable.

---

## Summary Table

| Pair | Consequence of Drift | Guard Exists? | Impact |
|---|---|---|---|
| Panel hide/reveal lists | Silent display bugs | ❌ | High — happened before |
| Repeatable categories | Multi-select silently breaks | ❌ | High — affects UX |
| Mandatory categories | Generated scripts invalid | ❌ | High — affects correctness |
| Bridge wrapper exports | Unused exports hide bugs | ❌ | Medium — lazy failure |
| Graves hide/clear | Stale display data | ❌ | High — UX regression |
| Script load order | Undefined-reference errors | Partial | Medium — only 13 bindings checked |

---

## Cheap Wins (Under 30 Minutes Each)

1. **Panel hide/reveal:** Extract the list to a constant, assert they're equal
2. **Repeatable categories:** Assert every category in GAME_DATA is covered by
   (MULTI_SELECT_CATEGORIES ∪ single-select categories)
3. **Mandatory categories:** Same test as above, or extract from a config

---

## Method Note

Identified pairs by hand (code reading, architecture knowledge, and prior
incident reports). An automated check would require either:
1. Naming convention (all mirror lists named `*_A` and `*_A_MIRROR`)
2. Explicit metadata (a registry of "these must match")
3. Runtime derivation (calculate one from the other)

Option 3 is best. Option 1 prevents future drift but doesn't fix current issues.
