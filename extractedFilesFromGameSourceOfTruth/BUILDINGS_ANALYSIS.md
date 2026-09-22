# Buildings Analysis

**Source:** Buildings.json (44 KB from game files)  
**Purpose:** Extract building effects for Phase B implementation (Boutique, Factory, etc.)

---

## Key Buildings for Calculator

### Boutique (Artistic Building)

**Game Rule:** When Boutique is built and Artistic rating ≥ 9.0, movie viewership decay slows.

**Status:** ❌ Effect not yet extracted from Buildings.json

**What We Need:**
- [ ] Exact decay rate modifier (e.g., 0.8 → 0.85 or 0.9?)
- [ ] Does it apply to week 1-8, or specific weeks?
- [ ] Can it stack with Striking Image?
- [ ] Cost to build (for context)
- [ ] Unlock condition

**Placeholder Formula (from feature spec):**
```
newDecay = baseDecay × 1.05  // 5-10% improvement
// OR
newDecay = baseDecay × 1.10  // Wait for empirical testing
```

**Action:** Extract from Buildings.json when analyzed

---

### Factory (Production Building)

**Game Rule:** Affects production timing (not directly decay, but related to availability/screenings)

**Status:** ❌ Effect not yet extracted

**What We Need:**
- [ ] Does it increase available screenings?
- [ ] Does it reduce pre-release time?
- [ ] Effect on distribution curve?

---

### Policy Buildings

**Game Concept:** Buildings that affect gameplay policies (not just individual movies)

**Status:** ❌ Not researched yet

**What We Need:**
- [ ] List of policy buildings
- [ ] Which ones affect our calculator?

---

## How to Extract from Buildings.json

### Step 1: Identify Building IDs
Search for: `"Boutique"`, `"Factory"`, `"Theatre"`, etc.

### Step 2: Extract Effect Fields
Look for:
- `effect` or `effects` (array/object)
- `multipliers` or `modifiers`
- `decayRate` or `decay`
- `coefficients` or `weights`

### Step 3: Document Each Effect
- Building ID
- Effect type (decay, multiplier, cost, etc.)
- Magnitude/value
- Application conditions (when active, what game states)

---

## Template for Each Building

```markdown
### Building Name

**ID:** BUILDING_ID  
**Type:** [Facility | Policy | Enhancement]  
**Cost:** [Cost in-game currency]  
**Unlock:** [Condition or level]

**Effects:**
| Effect | Type | Value | Applies To |
|--------|------|-------|-----------|
| Example | Multiplier | 1.1x | Weekly viewership |
| Example | Duration | +2 weeks | Extended run |

**Impact on Calculator:**
- [ ] Affects distribution grid?
- [ ] Affects agency scoring?
- [ ] Affects demographics?

**Formula:**
```
// Effect formula here
```

**Interaction with Other Features:**
- With Striking Image: [description]
- With other buildings: [description]

**Status:** [To Implement | Implemented | Not Applicable]
```

---

## Next Extraction Session

When you analyze Buildings.json:

1. Open in text editor (or use `jq` for JSON parsing)
2. Find "Boutique" entry
3. Copy entire effect block
4. Fill in the template above
5. Repeat for Factory and other relevant buildings

**Command to help:**
```bash
# List all building IDs in Buildings.json
jq 'keys' "$HOME/mnt/Hollywood Animal/Hollywood Animal_Data/StreamingAssets/Data/Configs/Buildings.json" | grep -i boutique
```

---

## Current Status

| Building | Found | Analyzed | Extracted | Ready to Implement |
|----------|-------|----------|-----------|-------------------|
| Boutique | ❌ | ❌ | ❌ | ❌ |
| Factory | ❌ | ❌ | ❌ | ❌ |
| Others | ❌ | ❌ | ❌ | ❌ |

**Priority:** Extract Boutique first (it's blocking Phase B implementation)

