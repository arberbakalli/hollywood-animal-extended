# Testing Features Lab — Implementation Roadmap

**Branch:** `testing-features-lab`  
**Status:** Feature implementation phase (external testing Q4)  
**Release gate:** Codex phase 1 + Claude phases 2-4 complete

All features listed below are actionable, with data locations, dependencies, and test requirements defined. No speculative items; everything ships in the test wave.

---

## 1. Freshness Audit & Reset Panel

**Priority:** High (UX polish)  
**Owner:** Claude  
**Effort:** ~2-3 days

**Goal:** Player can see all story elements' freshness state (Fresh/Stale/Rotten) at a glance and reset all to Fresh.

**What it does:**
- New panel showing: element name + current state + ability to cycle state per element
- "Reset all to Fresh" button
- Quick badge on Build for Target showing count by state (e.g., "3 Stale, 1 Rotten")

**Data location:** `hac.freshnessStates.v1` (browser storage)  
**Rules:** `docs/GAME_RULES.md` §9

**Tests needed:**
- Panel renders all 5 story elements with current state
- Reset all button clears all to Fresh
- Badge updates count correctly
- State persists across refreshes
- Related: `tests/freshness.test.js`, `tests/e2e/script-lab-freshness.spec.js`

**UI/UX decision:** Where does the panel live (new Build for Target tab? side panel?)

---

## 2. Element Affinity Graph Precomputation

**Priority:** Low (performance, not blocking)  
**Owner:** Claude  
**Effort:** ~1-2 days

**Goal:** Precompute genre-element pair rankings to skip live lookups. Baseline: 2-4ms per render already fast; optimization for scale/future.

**Measurement baseline:**
- Current: 2-4ms per render
- Scope: 24,255 pair lookups, 105 successful pairs
- Status: No blocker; precompute only if needed

**What it does:**
- Build `src/precomputation/genreElementAffinities.js` with precomputed edge list
- Replace live lookups in lab views with precomputed results
- Tests validate outputs match current code

**Data location:** `data/GenrePairs.json`, element compatibility logic in `src/evaluation/compatibilityEngine.js`

**Tests needed:**
- Precomputed edge list matches live calculation output
- Lab views render identically with/without precomputation
- Performance improvement measured (should be <1ms gain, but confirm)

**Related code:**
- `calculateGenrePairScore()` in `src/evaluation/compatibilityEngine.js`
- `getCompatibleGenres()` in `src/generator/scriptGenerationEngine.js`
- Lab rendering in codex's views

---

## 3. Marketing & Release Realism Pass

**Priority:** High (gameplay accuracy)  
**Owner:** Codex (phase 1 research) + Claude (phase 2-4 implementation)  
**Effort:** ~3-4 days (depends on research findings)

**Goal:** Close the gap between calculator's screening demand and in-game attendance/profit.

**Known gaps:**
- Factory Policy adds ~11-39% opening-week release boost (formula unknown)
- High-fit advertiser can be financially worse than 4 decent advertisers (Top Pick framing issue?)
- Attendance/occupancy not modelled by distribution grid
- Advertisement Duration timing needs broader campaign strategy

**What needs to happen:**
1. Extract Factory Policy formula from game files or controlled in-game tests
2. Verify advertiser ROI model (is Top Pick profit-focused or rating-focused?)
3. Model occupancy/attendance separately from screening demand
4. Redesign Advertisement Duration widget as part of campaign strategy panel

**Data location:** `data/` (extracted game data), `src/marketing/` (calculations)

**Tests needed:**
- Factory Policy bonus applied correctly per in-game rules
- Advertiser ROI ranked by profit, not fit score alone
- Attendance modelled independently
- Campaign strategy reflects in-game mechanics

**Gate:** Do NOT guess formulas. Extract game files or run controlled in-game tests before changing source data.

---

## 4. Genre Synergy Surface

**Priority:** High (gameplay clarity)  
**Owner:** Claude (design decision) + implementation  
**Effort:** ~2-3 days (depends on direction choice)

**Goal:** Surface `GenrePairs.json` data in the UI so player understands genre-pair synergy before picking a second genre.

**Three directions** (pick one with owner):
1. **Show existing GenrePairs data** — passive, no new generation logic (RECOMMENDED)
2. **Generation-time synergy hints** — active nudge favoring high-synergy pairs
3. **Standalone genre-pair reference table** — dedicated panel showing all pairs at a glance

**What it does:** (direction 1) Display which genres synergize well with the chosen genre, showing bonus scores from `GenrePairs.json`.

**Data location:** `data/GenrePairs.json` (11 genres, `primary`/`secondary` scores per pair)  
**Rules:** Genre-pair bonus applies only when second genre ≥ 35% (`docs/GAME_RULES.md` §6)

**Tests needed:**
- Synergy scores match `GenrePairs.json` exactly
- Synergy display shows for both primary/secondary directions
- Scripts generated with high-synergy pairs score correctly
- UI doesn't overwhelm Script Lab (responsiveness check)

**Related code:**
- `calculateGenrePairScore()` in `src/evaluation/compatibilityEngine.js`
- `getCompatibleGenres()` in `src/generator/scriptGenerationEngine.js`

---

## 5. Story Element Unlock Info

**Priority:** Medium (quality of life)  
**Owner:** Claude  
**Effort:** ~2-3 days (includes re-extraction)

**Goal:** Show player when/how elements become available (date-gated or recipe-gated).

**What it does:**
- Greyed-out elements show tooltip: "Unlocks 1935" or "Unlocks after using X + Y + Z"
- Helps player understand why certain tags are unavailable

**Data to extract:**
- `parameters.Condition` from pre-cleanup `TagData.json` (git history)
- Includes: `DATE:>=01-01-YYYY`, `RECIPE:TAG1:TAG2:TAG3`, variants

**Tests needed:**
- Date-gated elements show correct year
- Recipe-gated elements list correct prerequisites
- Unlock status updates after using required elements
- No broken tooltips on unavailable elements

**Related precedent:** Gender data recovery (`docs/GAME_RULES.md` §8)

**UX decision:** How to display recipe-gated unlocks (expandable list? condensed format?)

---

## 6. Near-Duplicate Results Dedup Rule

**Priority:** Low (already decided)  
**Owner:** Owner decision only  
**Effort:** 0 (decided, logged)

**Decision:** Option 2 — **Exact duplicates only**. Keep current rule; one-element variants stay.

**Context:** Highest Commercial (pool 7) had 23/66 pairs differing by 1 element; Build for Target had one Supporting Character set repeat 9/20 times.

**Rationale:** Player may want multiple near-variants as proof of viability; shorter lists can feel restrictive.

**Revisit clause:** Only change if player feedback (external testing) shows near-duplicates feel like noise rather than options. If so, move to "At least 2 story elements."

**Tests:** Already covered by existing suite; no changes needed.

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Freshness Audit & Reset (Claude) — UX + tests
- [ ] Element Affinity Graph Precomputation (Claude) — measurement + optional build

### Phase 2: Gameplay Accuracy (Week 2-3)
- [ ] Marketing & Release Realism (Codex phase 1 + Claude phases 2-4) — research + implementation + tests

### Phase 3: Clarity & Polish (Week 3-4)
- [ ] Genre Synergy (Claude) — decision + UI + tests
- [ ] Story Element Unlock Info (Claude) — extraction + UI + tests

### Phase 4: Testing & Refinement
- [ ] External test wave with 3-5 players
- [ ] Bug fixes + feedback incorporation
- [ ] Merge to main

---

## Testing Gate

External testing requires:
1. ✅ All features implemented and passing internal suite
2. ✅ No regressions in existing features (Jest + Playwright)
3. ✅ New tests written and passing
4. ✅ Player feedback on UX decisions (unlock presentation, genre synergy direction)

**Release to main:** After testing confirms no blockers.

---

## Notes

- **Do not guess formulas** for Marketing & Release Realism. Extract game files or run controlled in-game tests.
- **One-writer rule:** All development on `testing-features-lab` branch; main remains stable.
- **Test suite:** `npm test && npm run test:e2e` before submitting test wave.
- **Measurement baseline:** Element Affinity Graph at 2-4ms; only optimize if production data shows slowness.
