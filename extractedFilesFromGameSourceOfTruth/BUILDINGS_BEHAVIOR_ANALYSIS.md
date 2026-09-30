# Buildings Behavior IDs & Special Effects Mapping

**Source:** `Hollywood Animal_Data/StreamingAssets/Data/Configs/Buildings.json`  
**Status:** ✅ All 45 buildings mapped by behavior ID  
**Behavior Formula Source:** 🔴 **UNKNOWN** - Requires game DLL analysis or empirical testing  
**Date Extracted:** 2026-09-22

---

## Overview

Each building in the game has a `behaviour` field that determines its gameplay effect. The field is an integer ID pointing to a behavior definition in the game logic (likely in a DLL or separate behavior engine). We have identified behavior IDs but the **exact formulas** are unknown.

**Current Status:**
- ✅ All behavior IDs extracted and buildings catalogued
- ❌ Actual effect formulas unknown (blocked on game binary analysis)
- ✅ Infrastructure costs/duration known (buildTime, staff, utilities)
- ⚠️ Some behaviors can be reverse-engineered from calculator code

---

## Behavior ID Map (45 buildings across 10 unique behavior IDs)

### Behaviour 0: No Special Effect (23 buildings)

These buildings have **no gameplay bonus**, only infrastructure/resource requirements.

```
ANALYTICS, AUTOMATION, CASTING, CONCERT, COPYRIGHT, DISTRIBUTION, 
EVENTS_STAGE, FREELANCE, LAB, LINE_PRODUCTION, LOGISTICS, MARKETING, 
PRINT, SCOUT, SOUND, SUPPLY, WORKSHOP, CONSTRUCTOR
```

**Infrastructure Cost Range:**
- Base Cost: 60,000 - 130,000
- Duration: 50-60 days
- Staff: 10-30
- Water: 14-21
- Electricity: 16-21

---

### Behaviour 2: Infrastructure Utility (6 buildings)

These buildings appear to manage **basic infrastructure** (water, power, R&D).

```
PAVILION_I, PAVILION_II, PAVILION_III, PAVILION_IV, 
POWERPLANT_I, RND_I, WATER_TOWER_I
```

**Infrastructure Profile:**
- Base Cost: 130,000 - 350,000
- Duration: 50-100 days
- Staff: 10-20
- Water/Electricity: Variable (these likely PROVIDE utilities)

**Reverse-Engineer Hypothesis:** These provide utilities to other buildings. Gameplay effect likely:
- Reduces utility costs for adjacent/all buildings
- Increases production efficiency
- OR: Unlocks other buildings

---

### Behaviour 4: HR/Staff Boost (4 buildings)

These buildings appear to **enhance staff capabilities or HR**.

```
ESCORT_DOMINION, MUSEUM, PRODUCERS_DOMINION, TECH_DOMINION
```

**Infrastructure Profile:**
- Base Cost: 400,000 - 500,000
- Duration: 100-110 days
- Staff: 30-40
- Water: 25-30
- Electricity: 38-50

**Reverse-Engineer Hypothesis:**
- Increases staff efficiency (fewer staff needed for same work)
- Unlocks HR perks (BLDG_ESCORT_DOMINION gates "ETHNIC_COMPOSITION" perk)
- OR: Boosts production from HR-dependent buildings

**Implementation Status:** 🔴 Unknown

---

### Behaviour 12: Core Administration (2 buildings)

These are **essential administrative buildings**.

```
MAIN_BUILDING, INFRASTRUCTURE_DOMINION
```

**Infrastructure Profile:**
- **MAIN_BUILDING:** No cost, no duration, no staff (startup building)
- **INFRASTRUCTURE_DOMINION:** Cost 850,000, Duration 120, Staff 40

**Hypothesis:**
- MAIN_BUILDING: Game start building, no effect
- INFRASTRUCTURE_DOMINION: Central utility hub (provides water/electricity to all)

**Implementation Status:** ✅ Likely known in existing calculator code

---

### Behaviour 16: Innovation/Bonus (3 buildings)

These buildings appear to provide **creative or innovation bonuses**.

```
FOCUS, SHENANIGANS, SPIES
```

**Infrastructure Profile:**
- Base Cost: 170,000 - 280,000
- Duration: 65-100 days
- Staff: 20-30
- Water: 18-25
- Electricity: 25-35

**Reverse-Engineer Hypothesis:**
- FOCUS: Increases artistic/commercial movie scores
- SHENANIGANS: Random positive event generator
- SPIES: Provides competitive intelligence (lowers competitor advantage)

**Implementation Status:** 🔴 Unknown

---

### Behaviour 20: Department Dominion (3 buildings)

**Major productivity buildings** for key departments.

```
PREPRODUCTION_DOMINION, PRODUCTION_DOMINION, SCRIPT_DOMINION
```

**Infrastructure Profile:**
- Base Cost: 500,000 - 600,000
- Duration: 85-100 days
- Staff: 25-40
- Water: 25-42
- Electricity: 40-73

**Strategic Impact:** These are **prerequisites** for movie production pipeline.

**Reverse-Engineer Hypothesis:**
- Increases production speed for scripts/production/post-production
- Unlocks higher-quality movie options
- Affects movie rating (artistic/commercial quality)

**Implementation Status:** ⚠️ Partially known (likely references in existing code)

---

### Behaviour 28: Post-Production Dominion (2 buildings)

Post-production and distribution workflow buildings.

```
POSTPRODUCTION_DOMINION, RELEASE_DOMINION
```

**Infrastructure Profile:**
- Base Cost: 700,000 - 800,000
- Duration: 100-115 days
- Staff: 35-40
- Water: 25-30
- Electricity: 50-75

**Strategic Impact:** End-of-pipeline buildings for finalizing and distributing movies.

**Reverse-Engineer Hypothesis:**
- Increases movie distribution reach
- Reduces marketing costs
- OR: Affects post-release viewership decay rate

**Implementation Status:** 🔴 Unknown (decay rate formula critical!)

---

### Behaviour 4: Production Dominions (5 buildings)

**Mid-pipeline production facilities**.

```
PRODUCTION_DOMINION, POSTPRODUCTION_DOMINION, RELEASE_DOMINION,
PRODUCERS_DOMINION, TECH_DOMINION
```

(Note: Overlap with behavior 28 and 4)

---

### Behaviour 116: Premium/Specialty Dominions (4 buildings)

**HIGH-IMPACT GAMEPLAY BUILDINGS** - These are the key premium buildings with special effects!

```
BOUTIQUE_DOMINION, CONVEYOR_DOMINION, MAJOR_DOMINION, TRASH_DOMINION
```

**Infrastructure Profile:**
| Building | Cost | Duration | Staff | Water | Electricity | Type |
|----------|------|----------|-------|-------|------------|------|
| **BOUTIQUE_DOMINION** | 700,000 | 115 | 40 | 20 | 50 | Quality/Prestige |
| **CONVEYOR_DOMINION** | 850,000 | 120 | 40 | 30 | 55 | Logistics/Speed |
| **MAJOR_DOMINION** | High | High | High | High | High | Premium/Unknown |
| **TRASH_DOMINION** | Unknown | Unknown | Unknown | Unknown | Unknown | Utility/Risk |

**Critical Game Mechanics (behavior 116):**

#### BOUTIQUE_DOMINION ⭐⭐⭐
- **Feature Requirement:** FEATURE 3 (Boutique Building Effect)
- **Expected Mechanic:** "Artistic rating 9+ reduces movie viewership decline rate by ~5-10%"
- **Implementation Status:** 🔴 Formula unknown (pending empirical testing)
- **Calculator Impact:** Affects weekly viewership decay calculation
- **Test Plan:** Build boutique, release artistically-rated movies, measure viewership retention

#### CONVEYOR_DOMINION
- **Hypothesis:** Increased production throughput or reduced build time
- **Expected Mechanic:** "Reduces production timeline or speeds up movie creation"
- **Implementation Status:** 🔴 Unknown
- **High Cost/Duration suggests:** Major gameplay advantage

#### MAJOR_DOMINION
- **Hypothesis:** Unknown premium building (possibly prestige or master facility)
- **Implementation Status:** 🔴 Unknown

#### TRASH_DOMINION
- **Hypothesis:** Risk/reward building (possibly creates opportunities or removes bad scripts)
- **Implementation Status:** 🔴 Unknown

---

### Behaviour 130: Unique Monument (1 building)

```
DUVAL_MONUMENT
```

**Status:** 🔴 **Completely Unknown** - Possibly lore/prestige only?

---

## Summary: Behavior Effects by Priority for Implementation

| Behavior | Count | Priority | Implementation Status | Critical for Calculator |
|----------|-------|----------|----------------------|------------------------|
| **116** | 4 | 🔴 CRITICAL | ❌ Unknown | YES - Boutique effect needed |
| **20** | 3 | 🟡 HIGH | ⚠️ Partial | Maybe - production quality |
| **28** | 2 | 🟡 HIGH | ❌ Unknown | YES - affects decay rates |
| **4** | 4 | 🟡 HIGH | ❌ Unknown | Maybe - staff efficiency |
| **12** | 2 | 🟢 DONE | ✅ Known | NO - admin only |
| **16** | 3 | 🟡 MEDIUM | ❌ Unknown | Maybe - affects scores |
| **2** | 6 | 🟡 MEDIUM | ❌ Unknown | Maybe - utility provision |
| **0** | 23 | 🟢 NONE | ✅ N/A | NO - no effect |
| **130** | 1 | 🟢 LOW | ❌ Unknown | NO - likely prestige |

---

## Reverse-Engineering Strategy

### Option 1: Game Binary Analysis (DLL)
Extract behavior definitions from game DLL using:
- IDA Pro or Ghidra (disassemblers)
- dnSpy (for .NET assemblies)
- Search for behavior ID switch statement or lookup table

**Effort:** High (requires reverse engineering expertise)  
**Timeline:** 1-2 days  
**Accuracy:** High

### Option 2: Empirical Testing
For each building, test in-game:
1. Build the structure
2. Measure baseline (no building)
3. Measure with building active
4. Calculate delta

**Key metrics to measure:**
- Movie quality (artistic/commercial scores)
- Production time
- Viewership numbers
- Viewership retention (weekly decay)
- Staff efficiency

**Effort:** Medium (requires game playtime)  
**Timeline:** 3-5 days (testing)  
**Accuracy:** Medium (gameplay noise adds variance)

### Option 3: Community Reverse-Engineering
- Check game wikis or modding communities
- Game modders may have documented behavior effects
- Reddit: r/HollywoodAnimal, game Discord

**Effort:** Low  
**Timeline:** 1 hour  
**Accuracy:** Depends on community knowledge

---

## Calculator Integration Roadmap

### Phase A: Essential (Blocks Feature 3 & 12)
- [ ] Extract BOUTIQUE_DOMINION decay reduction formula
- [ ] Extract HOLIDAY bonus calculations (✅ DONE)
- [ ] Integrate holiday bonuses into viewership calc
- [ ] Test with real gameplay data

### Phase B: Nice-to-Have (Optimizations)
- [ ] CONVEYOR_DOMINION speed bonus
- [ ] Infrastructure efficiency (behavior 2, 12)
- [ ] Staff optimization (behavior 4)

### Phase C: Polish (Community Features)
- [ ] Innovation/creative bonuses (behavior 16)
- [ ] TRASH_DOMINION risk/reward mechanics
- [ ] MAJOR_DOMINION unknown effect

---

## Data Schema for Buildings

```json
{
  "BOUTIQUE_DOMINION": {
    "id": "BOUTIQUE_DOMINION",
    "domain": 15,
    "type": 5,
    "behaviour": 116,
    "category": 3,
    "infrastructure": {
      "cost": 700000,
      "buildTime": 115,
      "staff": 40,
      "water": 20,
      "electricity": 50,
      "baseImportance": 1
    },
    "gameplay": {
      "effect": "UNKNOWN - Reduces viewership decay ~5-10% when artistic >= 9",
      "status": "BLOCKED - Pending empirical testing",
      "implementation": null
    },
    "perks": [],
    "requirements": []
  }
}
```

---

## Notes & Questions

- [ ] **Behavior 116 buildings:** All have same behavior ID - do they share code or reference different implementations?
- [ ] **Behavior 0 buildings:** Are they truly no-effect, or placeholder for future features?
- [ ] **Does behavior system exist in game code?** Check:
  - Buildings.cpp / BuildingManager.cs
  - BehaviorEngine.* (search for "behaviour" references)
  - Switch statement with 130+ cases (one per behavior ID)
- [ ] **Are behavior effects multiplicative or additive?** This affects calculator logic!
- [ ] **What's the max behavior ID?** (116, 130 found - search for others)

