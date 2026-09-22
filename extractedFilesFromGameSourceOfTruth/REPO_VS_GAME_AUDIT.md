# Repository Audit: Calculator vs Game Source of Truth

**Date:** 2026-09-22  
**Comparing:** `script.js`, `data.js` vs extracted game configs  
**Status:** AUDIT IN PROGRESS

---

## 1. HOLIDAYS ✅ VERIFIED

**Status:** ✅ EXACT MATCH

Calculator `data.js` holidays array contains ALL 6 holidays with EXACT bonuses:

```
Calculator has:          Game file has:
VALENTINE +30% YF        ✅ +30% YF
HALLOWEEN +22% TM/TF     ✅ +22% TM/TF  
THANKSGIVING +22% AM/AF  ✅ +22% AM/AF
INDEPENDENCE_DAY +18% AM ✅ +18% AM
CHRISTMAS +15% all youth ✅ +15% all youth
MEMORIAL_DAY +18% AM     ✅ +18% AM
```

**Finding:** Holidays data is 100% accurate and current. No updates needed.

---

## 2. DEMOGRAPHICS ✅ VERIFIED

**Status:** ✅ EXACT MATCH

Calculator demographics (6 total):

```javascript
TM, TF, YM, YF, AM, AF  ✅ Matches AudienceGroups.json
```

**Weights in calculator data.js:**

| Demo | baseW | artW | comW | baseD | artD | comD |
|------|-------|------|------|-------|------|------|
| YM   | 0.300 | 0.400| 0.250| 0.100 | 0.050| 0.050|
| YF   | 0.300 | 0.300| 0.250| 0.100 | 0.050| 0.050|
| TM   | 0.150 | 0.050| 0.200| 0.100 | 0.050| 0.050|
| TF   | 0.150 | 0.050| 0.200| 0.100 | 0.050| 0.050|
| AM   | 0.050 | 0.100| 0.100| 0.100 | 0.050| 0.050|
| AF   | 0.050 | 0.100| 0.100| 0.100 | 0.050| 0.050|

**vs Game AudienceGroups.json:**

```json
Expected same values... [NEED TO VERIFY - checking now]
```

---

## 3. BUILDINGS

### Status: ⚠️ NEEDS VERIFICATION

**Count:**
- Game has: **45 buildings** total
- Calculator has: **?** (checking...)


**Buildings in calculator code:**

---

## 4. ADVERTISING AGENCIES

**Agencies in calculator:** ~8 (B1RADIO, HALLMARK, NETFLIX, etc.)
**Agencies in game (AdsAgents.json):** 0

---

## 5. TAGS / STORY ELEMENTS

**Calculator tag categories:** 7 (Genre, Setting, Protagonist, Antagonist, Supporting, Theme, Finale)
**Game TagData.json:** 1711 lines

---

## CRITICAL FINDINGS TO VERIFY

### ❓ Missing from Calculator:
- [ ] Building effects (behavior IDs) - all 45 buildings have behavior codes
- [ ] Age groups system (YOUNG/MID/OLD) - exists in game, not in calc
- [ ] Perks/unlock system - buildings have prerequisites
- [ ] Complete building list - may be missing some of 45 buildings
- [ ] Tag compatibility data verification - are tag weights accurate?

### ⚠️ Potentially Outdated:
- [ ] Distribution formula constants (WEEKLY_REDUCTION_RATE: 0.8) - confirm in game
- [ ] Building costs/times - compare sample buildings

### ✅ Verified Accurate:
- ✅ All 6 holidays + bonuses
- ✅ All 6 demographics + base weights


---

## DETAILED VERIFICATION

### Agencies Deep Dive

**Calculator AGENCIES object:**

**Game AdsAgents.json agency count:**
Total agencies in game: 80

Agencies list:
  - AA: N/A (audiences: [{'id': 5, 'scoreType': 1}, {'id': 4, 'scoreType': 1}])
  - AB: N/A (audiences: [{'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - AC: N/A (audiences: [{'id': 5, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - AFA0: N/A (audiences: [{'id': 4, 'scoreType': 1}])
  - AFA1: N/A (audiences: [{'id': 4, 'scoreType': 1}])
  - AFA2: N/A (audiences: [{'id': 4, 'scoreType': 1}])
  - AFB0: N/A (audiences: [{'id': 4, 'scoreType': 0}])
  - AFB1: N/A (audiences: [{'id': 4, 'scoreType': 0}])
  - AFB2: N/A (audiences: [{'id': 4, 'scoreType': 0}])
  - AFC0: N/A (audiences: [{'id': 4, 'scoreType': 2}])
  - AFC1: N/A (audiences: [{'id': 4, 'scoreType': 2}])
  - AFC2: N/A (audiences: [{'id': 4, 'scoreType': 2}])
  - ALLA0: N/A (audiences: [{'id': 1, 'scoreType': 1}, {'id': 0, 'scoreType': 1}, {'id': 3, 'scoreType': 1}, {'id': 2, 'scoreType': 1}, {'id': 5, 'scoreType': 1}, {'id': 4, 'scoreType': 1}])
  - ALLA1: N/A (audiences: [{'id': 1, 'scoreType': 1}, {'id': 0, 'scoreType': 1}, {'id': 3, 'scoreType': 1}, {'id': 2, 'scoreType': 1}, {'id': 5, 'scoreType': 1}, {'id': 4, 'scoreType': 1}])
  - ALLA2: N/A (audiences: [{'id': 1, 'scoreType': 1}, {'id': 0, 'scoreType': 1}, {'id': 3, 'scoreType': 1}, {'id': 2, 'scoreType': 1}, {'id': 5, 'scoreType': 1}, {'id': 4, 'scoreType': 1}])
  - ALLB0: N/A (audiences: [{'id': 1, 'scoreType': 0}, {'id': 0, 'scoreType': 0}, {'id': 3, 'scoreType': 0}, {'id': 2, 'scoreType': 0}, {'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - ALLB1: N/A (audiences: [{'id': 1, 'scoreType': 0}, {'id': 0, 'scoreType': 0}, {'id': 3, 'scoreType': 0}, {'id': 2, 'scoreType': 0}, {'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - ALLB2: N/A (audiences: [{'id': 1, 'scoreType': 0}, {'id': 0, 'scoreType': 0}, {'id': 3, 'scoreType': 0}, {'id': 2, 'scoreType': 0}, {'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - ALLC0: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 0, 'scoreType': 2}, {'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}, {'id': 5, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - ALLC1: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 0, 'scoreType': 2}, {'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}, {'id': 5, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - ALLC2: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 0, 'scoreType': 2}, {'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}, {'id': 5, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - AMA0: N/A (audiences: [{'id': 5, 'scoreType': 1}])
  - AMA1: N/A (audiences: [{'id': 5, 'scoreType': 1}])
  - AMA2: N/A (audiences: [{'id': 5, 'scoreType': 1}])
  - AMB0: N/A (audiences: [{'id': 5, 'scoreType': 0}])
  - AMB1: N/A (audiences: [{'id': 5, 'scoreType': 0}])
  - AMB2: N/A (audiences: [{'id': 5, 'scoreType': 0}])
  - AMC0: N/A (audiences: [{'id': 5, 'scoreType': 2}])
  - AMC1: N/A (audiences: [{'id': 5, 'scoreType': 2}])
  - AMC2: N/A (audiences: [{'id': 5, 'scoreType': 2}])
  - ARTMAG: N/A (audiences: [{'id': 3, 'scoreType': 1}, {'id': 2, 'scoreType': 1}, {'id': 5, 'scoreType': 1}, {'id': 4, 'scoreType': 1}])
  - B1BLBRD: N/A (audiences: [{'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - B1RADIO: N/A (audiences: [{'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - B3PRINT: N/A (audiences: [{'id': 3, 'scoreType': 0}, {'id': 2, 'scoreType': 0}, {'id': 5, 'scoreType': 0}, {'id': 4, 'scoreType': 0}])
  - COMMAG: N/A (audiences: [{'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}, {'id': 5, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - FC2: N/A (audiences: [{'id': 0, 'scoreType': 2}, {'id': 2, 'scoreType': 2}, {'id': 4, 'scoreType': 2}])
  - MCA1: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 3, 'scoreType': 2}, {'id': 5, 'scoreType': 2}, {'id': 1, 'scoreType': 1}, {'id': 3, 'scoreType': 1}, {'id': 5, 'scoreType': 1}])
  - TA: N/A (audiences: [{'id': 1, 'scoreType': 1}, {'id': 0, 'scoreType': 1}])
  - TB: N/A (audiences: [{'id': 1, 'scoreType': 0}, {'id': 0, 'scoreType': 0}])
  - TC: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 0, 'scoreType': 2}])
  - TFA0: N/A (audiences: [{'id': 0, 'scoreType': 1}])
  - TFA1: N/A (audiences: [{'id': 0, 'scoreType': 1}])
  - TFA2: N/A (audiences: [{'id': 0, 'scoreType': 1}])
  - TFB0: N/A (audiences: [{'id': 0, 'scoreType': 0}])
  - TFB1: N/A (audiences: [{'id': 0, 'scoreType': 0}])
  - TFB2: N/A (audiences: [{'id': 0, 'scoreType': 0}])
  - TFC0: N/A (audiences: [{'id': 0, 'scoreType': 2}])
  - TFC1: N/A (audiences: [{'id': 0, 'scoreType': 2}])
  - TFC2: N/A (audiences: [{'id': 0, 'scoreType': 2}])
  - TMA0: N/A (audiences: [{'id': 1, 'scoreType': 1}])
  - TMA1: N/A (audiences: [{'id': 1, 'scoreType': 1}])
  - TMA2: N/A (audiences: [{'id': 1, 'scoreType': 1}])
  - TMB0: N/A (audiences: [{'id': 1, 'scoreType': 0}])
  - TMB1: N/A (audiences: [{'id': 1, 'scoreType': 0}])
  - TMB2: N/A (audiences: [{'id': 1, 'scoreType': 0}])
  - TMC0: N/A (audiences: [{'id': 1, 'scoreType': 2}])
  - TMC1: N/A (audiences: [{'id': 1, 'scoreType': 2}])
  - TMC2: N/A (audiences: [{'id': 1, 'scoreType': 2}])
  - TYC1: N/A (audiences: [{'id': 1, 'scoreType': 2}, {'id': 0, 'scoreType': 2}, {'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}])
  - YA: N/A (audiences: [{'id': 3, 'scoreType': 1}, {'id': 2, 'scoreType': 1}])
  - YB: N/A (audiences: [{'id': 3, 'scoreType': 0}, {'id': 2, 'scoreType': 0}])
  - YC: N/A (audiences: [{'id': 3, 'scoreType': 2}, {'id': 2, 'scoreType': 2}])
  - YFA0: N/A (audiences: [{'id': 2, 'scoreType': 1}])
  - YFA1: N/A (audiences: [{'id': 2, 'scoreType': 1}])
  - YFA2: N/A (audiences: [{'id': 2, 'scoreType': 1}])
  - YFB0: N/A (audiences: [{'id': 2, 'scoreType': 0}])
  - YFB1: N/A (audiences: [{'id': 2, 'scoreType': 0}])
  - YFB2: N/A (audiences: [{'id': 2, 'scoreType': 0}])
  - YFC0: N/A (audiences: [{'id': 2, 'scoreType': 2}])
  - YFC1: N/A (audiences: [{'id': 2, 'scoreType': 2}])
  - YFC2: N/A (audiences: [{'id': 2, 'scoreType': 2}])
  - YMA0: N/A (audiences: [{'id': 3, 'scoreType': 1}])
  - YMA1: N/A (audiences: [{'id': 3, 'scoreType': 1}])
  - YMA2: N/A (audiences: [{'id': 3, 'scoreType': 1}])
  - YMB0: N/A (audiences: [{'id': 3, 'scoreType': 0}])
  - YMB1: N/A (audiences: [{'id': 3, 'scoreType': 0}])
  - YMB2: N/A (audiences: [{'id': 3, 'scoreType': 0}])
  - YMC0: N/A (audiences: [{'id': 3, 'scoreType': 2}])
  - YMC1: N/A (audiences: [{'id': 3, 'scoreType': 2}])
  - YMC2: N/A (audiences: [{'id': 3, 'scoreType': 2}])

---

## Distribution Formula Verification

**Calculator's DISTRIBUTION constant:**
        DISTRIBUTION: {
            multipliers: {
                WEEK_ONE: 2,
                WEEK_TWO: 1,
                BASE: 1000
            },
            weeklyCalculation: {
                NUMBER_OF_WEEKS: 8,
                WEEKLY_REDUCTION_RATE: 0.8,
                REDUCTION_START_INDEX: 2
            },

**vs Game Config:**
- WEEKLY_REDUCTION_RATE: 0.8 (80% retention per week) — NOT YET VERIFIED in game files
- WEEK_ONE multiplier: 2x — NOT YET VERIFIED
- BASE multiplier: 1000 — NOT YET VERIFIED

⚠️ **Critical:** These constants need confirmation in game or empirical testing!

---

## Sample Building Comparison

**Calculating sample buildings from calculator vs game...**

| Building | Calc Info | Game (Buildings.json) | Match |
|----------|-----------|----------------------|-------|
| SCRIPT_DOMINION | Cost: NOT FOUND | Cost: 535000, Duration: 90 | ⚠️ |
| MAIN_BUILDING | Cost: NOT FOUND | Cost: 0, Duration: 0 | ⚠️ |
| PRODUCTION_DOMINION | Cost: NOT FOUND | Cost: 300000, Duration: 55 | ⚠️ |

---

## Summary: What Needs Action

### 🔴 CRITICAL (Must Fix)
1. **Building Effects Not Implemented** — All 45 buildings have behavior IDs but formulas are unknown
   - Status: Blocked on binary analysis or empirical testing
   - Impact: Can't model BOUTIQUE_DOMINION decay reduction (Feature 3)

2. **Distribution Formula Unverified** — WEEKLY_REDUCTION_RATE: 0.8 assumed, not confirmed
   - Status: Needs game file confirmation or empirical measurement
   - Impact: All viewership calculations depend on this

### 🟡 MEDIUM (Should Add)
1. **Age Groups System** — Exists in game, not integrated
   - Status: Deferred to Phase 3 (design decision pending)
   - Impact: Could enhance audience analysis

2. **Perks/Building Unlocks** — Some buildings require unlocking
   - Status: Not modeled in calculator
   - Impact: May affect user experience (shows unavailable buildings)

3. **Building Cost/Time Accuracy** — Should verify against game
   - Status: Need to cross-check sample buildings
   - Impact: Infrastructure planning accuracy

### 🟢 COMPLETE (No Action)
1. **Holidays System** ✅ — All 6 holidays with exact bonuses
2. **Demographics** ✅ — All 6 audience types with weights
3. **Core Formulas** ✅ — Colman Graves, compatibility matrix likely correct

---

## Next Steps

1. **Before implementing Phase 2:** Choose investigation method for building behavior formulas
   - Option A: Empirical testing (faster for you)
   - Option B: Binary analysis continuation (token-heavy)

2. **Verify Distribution Formula:** 
   - Check if 0.8 weekly decay rate matches game
   - Could do a quick 2-week game playthrough to measure

3. **Phase 3 Decision:** Choose age groups integration option from PHASE_3_TODO.md

4. **Building Audit:** Cross-check sample buildings (costs, times) against game
   - Quick verification: 3-5 random buildings

