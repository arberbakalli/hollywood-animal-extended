# Features 1-5: Script Scoring & Recommendation Engine

**Implementation Status:** Core scoring engine complete (Phase 1 of 2)

## Overview

Features 1-5 provide recommendation capabilities for the Hollywood Animal Calculator's Marketing tab, enabling script ranking, demographic targeting, and advertiser compatibility analysis.

## Completed: Core Scoring Engine (`src/marketing/scriptScoringEngine.js`)

### Functions Implemented

#### 1. **Artistic Appeal Scoring**
- `score_artistic_appeal(scriptElements)` 
- Calculates appeal to Adult demographics (AF + AM weights)
- Returns score between -5.0 and +5.0
- Used for Feature 1: Best Artistic Scripts

#### 2. **Commercial Appeal Scoring**
- `score_commercial_appeal(scriptElements)`
- Calculates appeal to Youth demographics (TF + TM + YF + YM weights)
- Returns score between -5.0 and +5.0
- Used for Feature 2: Best Commercial Scripts

#### 3. **Demographic Compatibility Extraction**
- `getCompatibilityElements(tagIds)`
- Builds demographic affinity profile for a script
- Returns object mapping all demographics to cumulative weights

#### 4. **Score Formatting for Display**
- `formatScoreForDisplay(score)`
- Color-codes scores for UI presentation
  - **Green** (score-positive): +3.0 or higher → "Strong"
  - **Gray** (score-neutral): -2.0 to +3.0 → "Neutral"
  - **Red** (score-negative): Below -2.0 → "Weak"
- Returns `{value: string, cssClass: string, label: string}`

#### 5. **Script Ranking & Selection**
- `rankScripts(scripts, appealType)` - Sort scripts by appeal descending
- `getTopScripts(scripts, appealType, limit=3)` - Get top N scripts with formatted scores
- Returns scripts with score data for pagination (Feature 1-2)

#### 6. **Demographic Gap Analysis (Feature 3a)**
- `identifyDemographicGaps(tagIds)` - Find demographics with low affinity
- `recommendSupportingCharacters(tagIds, limit=3)` - Recommend characters to fill gaps
- Returns array of supporting characters ranked by demographic fit

#### 7. **Agency Compatibility Matrix (Feature 3b)**
- `calculateAgencyCompatibility(tagIds)` 
- Cross-references script themes to agency targets
- Returns agencies with match percentages (0-100 scale)
- Sorted by compatibility descending

## Test Coverage

**33 comprehensive tests** in `tests/scriptScoringEngine.test.js` covering:

- Artistic and commercial appeal calculation
- Empty/null input handling
- Score formatting and color-coding (6 boundary tests)
- Script ranking and top-N selection
- Demographic gap identification
- Supporting character recommendations
- Agency compatibility scoring

All tests passing ✓

## Integration Points

### Loaded In:
- ✓ `index.html` (line 674)
- ✓ `script.js` (exports 9 functions)
- ✓ Test harness `tests/helpers/legacyHarness.js`

### Exports Available As:
- Global namespace: `window.HACScriptScoringEngine.*`
- Script.js bridges: `score_artistic_appeal()`, `score_commercial_appeal()`, etc.
- Test calls: `h.call('score_artistic_appeal', elements)`

## Data Sources

Scoring uses:
- `GAME_DATA.tags[tagId].weights` - demographic weights per tag (-5.0 to +5.0)
- `GAME_DATA.demographics` - demographic names and metadata
- `GAME_DATA.adAgents` - agency definitions and target demographics

## Next Steps: UI Implementation (Phase 2)

### Feature 1: Best Artistic Scripts Panel
**Location:** Analyze Script tab (below Build Your Script)
- Display top 3 artistic scripts with scores
- "Show More" button for pagination
- Color-coded scores (green/gray/red by threshold)
- Click to populate tags for analysis

### Feature 2: Best Commercial Scripts Panel  
**Location:** Analyze Script tab (below Best Artistic)
- Display top 3 commercial scripts
- Same pagination and color-coding as Feature 1
- Youth demographic appeal focus

### Feature 3a: Age-to-Role Breakdown
**Location:** Results panel (after analysis runs)
- Shows demographic gaps in current script
- Recommends supporting characters per gap
- 3 + "Show More" expansion pattern
- Gender-locked vs flexible character indicators

### Feature 3b: Ad Agency Compatibility Matrix
**Location:** Results panel (existing structure in index.html)
- Currently uses basic agency data
- Enhance with demographic breakdown
- Show match percentages per audience lean
- Cross-reference with extracted source agencies

## Architecture Decisions

1. **Pure Functions:** All scoring functions are deterministic, no side effects
2. **Score Normalization:** Clamped to -5.0 to +5.0 range to handle edge cases
3. **Demographic Keys:** 6 demographics (TF, TM, YF, YM, AF, AM) - directly from GAME_DATA
4. **Color Thresholds:**
   - Artistic/Commercial threshold: ±0 (midpoint)
   - Strong threshold: +3.0
   - Weak threshold: -2.0
5. **Pagination Pattern:** Top 3 + expandable (consistent with existing UI)

## Known Limitations

1. **Script Generation:** Engine does not generate scripts, only ranks user-selected combinations
2. **Agency Data:** `calculateAgencyCompatibility()` uses the canonical `GAME_DATA.adAgents` structure
3. **Wayward Soul:** Tags with no weights (e.g., "Wayward Soul") return 0 for their contribution

## Testing Guidance

Run tests for this module:
```bash
npm test -- scriptScoringEngine.test.js
```

Or all tests:
```bash
npm test
```

Current baseline:
- Jest: 365 tests in 30 suites (all passing)
- Playwright: 163 e2e tests
- New: +33 scriptScoringEngine unit tests

## References

- **Domain rules:** `docs/GAME_RULES.md` (demographics, scoring thresholds)
- **Existing UI patterns:** `src/marketing/marketingPlanner.js`, `src/marketing/audienceCompatibility.js`
- **Data structure:** `data/TagsAudienceWeights.json`, `data/age-role-compatibility.json`

## Related Features

- Feature 3a builds on `src/analysis/ageRoleBreakdown.js`
- Feature 3b extends existing agency matrix in `src/marketing/audienceCompatibility.js`
- Both use demographic data from `src/evaluation/gravesAnalysis.js`
