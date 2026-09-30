# Source of Truth Mapping

**Date:** 2026-09-22  
**Purpose:** Compare what's implemented in the calculator vs. what's available in game source files

---

## 1. Demographics & Audience Weights

### ✅ IMPLEMENTED (in data.js)
```
- YM, YF, TM, TF, AM, AF
- baseW, artW, comW (weights per demographic)
- baseD, artD, comD (default audiences)
```

### 📋 SOURCE (AudienceGroups.json - Game Files)
```json
{
  "TM": { baseWeight: 0.150, artWeight: 0.050, commercialWeight: 0.200, ... },
  "TF": { baseWeight: 0.150, artWeight: 0.050, commercialWeight: 0.200, ... },
  "YM": { baseWeight: 0.300, artWeight: 0.400, commercialWeight: 0.250, ... },
  "YF": { baseWeight: 0.300, artWeight: 0.300, commercialWeight: 0.250, ... },
  "AM": { baseWeight: 0.050, artWeight: 0.100, commercialWeight: 0.100, ... },
  "AF": { baseWeight: 0.050, artWeight: 0.100, commercialWeight: 0.100, ... }
}
```

**Status:** ✅ Matches perfectly with implementation

---

## 2. Age Groups (NEW - NOT IN CALCULATOR)

### ❌ NOT IMPLEMENTED
Age groups are defined in the game but not used in calculator.

### 📋 SOURCE (AgeGroups.json - Game Files)
```json
{
  "YOUNG": {
    "intId": 0,
    "maleRange": { "x": 18, "y": 39 },
    "femaleRange": { "x": 18, "y": 34 }
  },
  "MID": {
    "intId": 1,
    "maleRange": { "x": 40, "y": 59 },
    "femaleRange": { "x": 35, "y": 49 }
  },
  "OLD": {
    "intId": 2,
    "maleRange": { "x": 60, "y": 2147483647 },
    "femaleRange": { "x": 50, "y": 2147483647 }
  }
}
```

**Recommendation:** Where to add?
- Demographic info panel (as informational context)
- Character age filtering (if character selection becomes a feature)
- Future: age-based audience targeting hints

---

## 3. Advertising Agencies

### ✅ PARTIALLY IMPLEMENTED
Calculator has 8 agencies (B1RADIO, ALLB1, ARTMAG, COMMAG, B3PRINT, FC2, MCA1, TYC1).

### 📋 SOURCE (AdsAgents.json - Game Files)
AdsAgents.json contains **more than 8 agencies**:
- ALLB0 (NEW - not documented)
- ALLB1, ARTMAG, COMMAG, B3PRINT, FC2, MCA1, TYC1
- Possibly others (need full audit)

**Key new fields discovered:**
```json
{
  "ALLB0": {
    "id": "ALLB0",
    "audiences": [array of audience IDs with scoreType],
    "quality": 0,
    "isVisibleFromStart": false,
    "budgetFactor": "1.000",  // STRING, not number
    "enableDate": "0001-01-01T00:00:00",
    "hasEnableDate": false,
    "influencePrice": 0,
    "reputationPrice": 0,
    "releasePatternInfo": {  // UI coordinates
      "id": "BILLBOARD1",
      "position": { "x": "50.000", "y": "0.000" },
      "size": { "x": "300.000", "y": "140.000" },
      "sortingOrder": 0
    }
  }
}
```

**Issues to resolve:**
- [ ] Are there more than 8 agencies? How many total?
- [ ] Does budgetFactor need to be string or can be parsed to float?
- [ ] Should visibility/enableDate affect calculator recommendations?
- [ ] What do influencePrice/reputationPrice do?
- [ ] Can we use releasePatternInfo for UI improvements?

---

## 4. Buildings & Facilities (NEW - NOT IN CALCULATOR)

### ❌ NOT IMPLEMENTED
Buildings.json (44 KB) is not used in calculator at all.

### 📋 SOURCE (Buildings.json - Game Files)
Contains building/facility definitions with:
- Building IDs (e.g., Boutique, Factory, etc.)
- Effects (decay modifiers, multipliers, etc.)
- Costs and unlock conditions
- Policy effects on gameplay

**Importance:** CRITICAL for Phase B (Boutique building, Factory, other modifiers)

**Action Required:**
- [ ] Extract Boutique building effect definition
- [ ] Extract Factory building effect definition
- [ ] Map building effects to calculator formulas
- [ ] Document building unlock conditions

---

## 5. Distribution & Weekly Decay

### ✅ IMPLEMENTED (in data.js DISTRIBUTION)
```javascript
DISTRIBUTION: {
  multipliers: {
    WEEK_ONE: 2,      // ✓ Confirmed
    WEEK_TWO: 1,      // ✓ Confirmed
    BASE: 1000        // ✓ Confirmed
  },
  weeklyCalculation: {
    NUMBER_OF_WEEKS: 8,           // ✓ Confirmed
    WEEKLY_REDUCTION_RATE: 0.8,   // Assumed - needs verification
    REDUCTION_START_INDEX: 2      // ✓ Confirmed (starts week 3)
  }
}
```

**Status:** ⚠️ Needs empirical validation
- Weekly decay rate (0.8) is assumed, not from game files
- Empirical testing planned to confirm actual rates

---

## 6. Scoring & Compatibility

### ✅ IMPLEMENTED
- Tag compatibility matrix (254+ tags)
- Score calculation (average of audience scores)
- Grade conversion (5.0=A+, 4.7+=A, etc.)

### 📋 NEEDS VERIFICATION
- Exact formula for combining multiple tags
- Bonus/penalty for scoreType match
- Capping logic at 5.0

**Action:** Cross-reference calculator.js scoring logic with game DLL analysis findings

---

## 7. What's Missing from Calculator

### High Priority (Blocks Phase B)

| Feature | Source | Status | Impact |
|---------|--------|--------|--------|
| Buildings/Boutique effect | Buildings.json | ❌ Not extracted | Decay modifier formula unknown |
| Factory effect | Buildings.json | ❌ Not extracted | Production timing unknown |
| Striking Image effect | Empirical testing | ⏳ Pending | Week 1-4 multiplier 2.0x |
| Holiday bonuses | Game variables (TBD) | ❌ Not found yet | Demographic shifts unknown |
| Age groups context | AgeGroups.json | ❌ Not used | Informational only |

### Medium Priority (Nice-to-Have)

| Feature | Source | Status | Impact |
|---------|--------|--------|--------|
| Budget Factor string handling | AdsAgents.json | ⚠️ Needs review | Type safety |
| Visibility/enableDate logic | AdsAgents.json | ❌ Not used | May affect agency availability |
| UI positioning (releasePatternInfo) | AdsAgents.json | ❌ Not used | UI enhancement |

---

## 8. Empirical Testing Gap

### Currently Assumed (NOT from game files)

| Mechanic | Current Value | Source | Status |
|----------|---------------|--------|--------|
| Weekly decay rate | 0.8 | Assumption | 🔴 NEEDS TESTING |
| Striking Image duration | 4 weeks | Empirical obs. | 🟡 CONFIRMED FROM DLL |
| Striking Image multiplier | 2.0x | DLL analysis | 🟢 CONFIRMED |
| Week 5+ behavior | Unknown | N/A | 🔴 NEEDS TESTING |
| Boutique decay reduction | Unknown | N/A | 🔴 NEEDS TESTING |

---

## Next Steps

### 1. Immediate (This Session)

- [ ] Audit AdsAgents.json for all agencies (count, properties)
- [ ] Extract Boutique building effect from Buildings.json
- [ ] Extract Factory building effect from Buildings.json
- [ ] Document where age groups should integrate

### 2. Short-term (Phase B)

- [ ] Run empirical tests for weekly decay rates (weeks 1-8)
- [ ] Run empirical tests for Striking Image interaction
- [ ] Run empirical tests for Boutique building decay effect
- [ ] Search for holiday bonus mechanics in game files

### 3. Data Structure (SQLite Optimization)

Once we have all mechanics documented:
- Normalize agencies (remove budgetFactor/enableDate duplication)
- Create building effects table
- Map demographic weights
- Set up for build-time export → normalized JSON

---

## Files in This Folder

- `AudienceGroups.json` — Audience weight definitions (VERIFIED ✓)
- `AgeGroups.json` — Age range definitions (NEW, not used yet)
- `AdsAgents.json` — Agency definitions (PARTIAL, needs full audit)
- `Buildings.json` — Building effects (NEW, not explored yet)
- `SOURCE_OF_TRUTH_MAPPING.md` — This file

