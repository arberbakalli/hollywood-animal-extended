# Extracted Game Source of Truth

**Created:** 2026-09-22  
**Purpose:** Single source of truth for all game mechanics extracted from Steam game files

This folder contains:
1. **Raw game config files** (copied directly from game)
2. **Analysis documents** (mapping and insights)
3. **Templates** for next extraction phase

---

## What's Here

### Game Config Files (Direct from Steam)
- `AudienceGroups.json` — 6 demographic segments with weights for base/art/commercial scoring
- `AgeGroups.json` — Age ranges for YOUNG, MID, OLD demographic groups
- `AdsAgents.json` — 8+ advertising agencies with properties and UI positioning
- `Buildings.json` — Building/facility effects (Boutique, Factory, etc.)

### Analysis Documents
- `SOURCE_OF_TRUTH_MAPPING.md` — Comprehensive comparison: What's implemented vs. what's available
- `BUILDINGS_ANALYSIS.md` — Template and extraction guide for building effects

---

## Key Findings

### ✅ Verified (Matches Implementation)
- **Demographics:** YM, YF, TM, TF, AM, AF with correct weights
- **Distribution formula:** Week 1 ×2, Week 2 ×1, Week 3+ ×0.8 decay
- **Agency targeting:** 8 agencies correctly mapped

### ❌ Not Yet Integrated
- **Age groups:** YOUNG (18-34F, 18-39M), MID (35-49F, 40-59M), OLD (50+F, 60+M)
  - *Where to use?* Demographic info panel, character filtering (future), age-based targeting hints
- **Buildings:** Boutique, Factory, others (effect formulas not extracted yet)
- **Agency fields:** budgetFactor (string type), enableDate, visibility, UI positioning

### 🔴 Critical Gaps (Block Phase B)
- **Boutique building decay modifier:** Unknown (assumed 5-10% improvement)
- **Factory building effect:** Unknown
- **Holiday bonuses:** Not found yet in game files
- **Weekly decay rate:** Currently 0.8 (ASSUMED - needs empirical testing)

---

## What You Asked: "Where to fit age groups?"

### Current Options:

**Option 1: Demographic Info Panel** (Minimal integration)
```
Display when analyzing script:
"Young audiences (18-39 M / 18-34 F) are 30% of base market"
```
Simple, informational, no calculation change.

**Option 2: Character Age Filtering** (Medium integration)
If your calculator ever includes character selection:
```
"Male protagonist age: 25 → Appeals to YOUNG (18-39) demographics"
```

**Option 3: Audience Targeting Hints** (Complex)
```
"Script has theme X + YOUNG audience targets → Strong appeal to ages 18-34"
```
Requires new calculation layer.

**Recommendation:** Start with **Option 1** (informational). Move to Option 2/3 only if needed for phase feature.

---

## Next Steps

### Immediate (This Session)
1. Review `SOURCE_OF_TRUTH_MAPPING.md` — see what's missing
2. Decide: Extract Buildings.json now, or defer to Phase B?
3. Plan: Where/how to integrate age groups (if at all)

### Short-term (Phase B)
1. Extract Boutique building effect from `Buildings.json`
2. Extract Factory building effect
3. Search for holiday bonus in `Buildings.json` or other files
4. Run empirical tests for decay rates and building effects

### Data Optimization (SQLite)
Once Phase B is stable:
- Normalize agencies (remove string budgetFactor duplication)
- Create `buildings` table (ID, name, effect_type, value)
- Create `demographic_weights` table (demographic, weight_type, value)
- Build SQLite → optimized JSON export pipeline

---

## How to Use This Folder

**As a Reference:**
- When you have a question about game mechanics, check `SOURCE_OF_TRUTH_MAPPING.md` first
- If it says ❌ or ⏳, research is needed; add findings here

**As a Collaboration Point:**
- Share this folder with team/other agents
- Everyone knows: "If it's not documented here, ask before coding it"
- Single source of truth prevents debates about "what does the game actually do?"

**As a Tracker:**
- Status column shows ✅ (verified), ⚠️ (needs review), ❌ (not found), 🔴 (critical)
- Update status as you extract and verify each mechanic

---

## File Glossary

| File | From Game | Role | Read This If... |
|------|-----------|------|-----------------|
| AudienceGroups.json | ✓ | Demographics (verified) | You need weight values for TM/TF/etc |
| AgeGroups.json | ✓ | Age ranges (new) | You want to add age context to UI |
| AdsAgents.json | ✓ | Agencies (partial) | You're auditing agency data completeness |
| Buildings.json | ✓ | Building effects (new) | You're implementing Boutique/Factory |
| SOURCE_OF_TRUTH_MAPPING.md | - | Analysis & comparison | You need overview of what's done vs. what's missing |
| BUILDINGS_ANALYSIS.md | - | Extraction template | You're about to analyze Buildings.json |
| README.md | - | This guide | You need orientation |

---

## Questions to Ask When Adding Features

**Before implementing anything new, ask:**

1. Is it documented in `SOURCE_OF_TRUTH_MAPPING.md`? 
   - If YES → status tells you if it's verified
   - If NO → research it first, add findings here

2. Does it need game file extraction?
   - If YES → check `BUILDINGS_ANALYSIS.md` for template

3. Does it depend on empirical testing?
   - If YES → add to Phase B testing plan

4. Can it be optimized with SQLite at build-time?
   - If YES → note for data structure planning

---

**Last Updated:** 2026-09-22  
**Status:** Ready for Phase B research and implementation
