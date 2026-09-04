# Best Advertisers Calculator — Implementation Plan

## Overview
Build Phase A: Core recommendation engine that analyzes script tags and recommends optimal advertising agencies with audience compatibility scoring.

**Status:** Ready to build
**Dependencies:** Verified game data (AdsAgents.json, TagsToAgeCompatibilityData.json)
**Estimated Scope:** 2-3 days for MVP

---

## Phase A: Core Recommendation Engine

### 1. Data Layer

#### Load & Parse Game Data
```javascript
// Load from staged JSON files or embed as constants
const ADVERTISING_AGENCIES = {
  B1RADIO: {
    name: 'NBG',
    audiences: [5, 4], // AM, AF
    scoreType: 0, // commercial
    quality: 2,
    budgetFactor: 0.6
  },
  // ... 7 more agencies
}

const TAG_COMPATIBILITY = {
  PROTAGONIST_SOLDIER: {
    tagId: 'PROTAGONIST_SOLDIER',
    ageCompatibility: [3, 3, 2, 5, 5, 4] // TF, TM, YF, YM, AF, AM
  },
  // ... 254+ tags
}

const AUDIENCE_NAMES = {
  0: 'Teen Female (TF)',
  1: 'Teen Male (TM)',
  2: 'Young Female (YF)',
  3: 'Young Male (YM)',
  4: 'Adult Female (AF)',
  5: 'Adult Male (AM)'
}
```

#### Data Structure: Recommendation Result
```javascript
interface AdvertiserRecommendation {
  agencyId: string
  name: string
  audiences: number[]
  matchScore: number // 0-5 scale
  scoringBreakdown: {
    tagScores: number[] // per selected tag
    audienceAverages: number[] // per served audience
    scoreTypeBonus: number // -0.2 to +0.05
  }
  predictedGrade: string // 'A+', 'A', 'B+', 'B', 'C', etc.
  reasoning: string // Human-readable explanation
}
```

### 2. Core Algorithm: Match Score Calculation

#### Function: calculateAdvertiserMatch(scriptTags, scriptStrength, advertiser)

**Input:**
- `scriptTags`: string[] (list of selected protagonist, antagonist, setting, etc.)
- `scriptStrength`: 'commercial' | 'artistic' | 'balanced'
- `advertiser`: Agency config object

**Process:**
```
1. For each advertiser audience:
   a. For each script tag:
      - Look up tag's ageCompatibility array
      - Extract score for this audience
      - Collect scores
   b. Calculate audience average = MEAN(scores)
   c. Normalize to 0-5 scale if needed

2. Calculate base score:
   - If advertiser serves 2 audiences: AVG(audience1_avg, audience2_avg)
   - If advertiser serves 4 audiences: AVG(all 4 audience_avgs)

3. Apply scoreType bonus/penalty:
   - If advertiser.scoreType matches scriptStrength:
     bonus = +0.25 (e.g., 3.5 → 3.75)
   - If mismatch (e.g., artistic script, commercial advertiser):
     penalty = -0.2 (e.g., 3.5 → 3.3)
   - If balanced or neutral advertiser:
     no adjustment

4. Cap score to 5.0

5. Return {
   score: calculated_score,
   audiences_matched: audience_count,
   strength_alignment: boolean
}
```

#### Function: predictGradesFromScore(matchScore)
```
5.0   → 'A+'     (Exceptional)
4.7-5.0 → 'A'    (Excellent)
4.3-4.7 → 'B+'   (Very Good)
3.8-4.3 → 'B'    (Good)
3.3-3.8 → 'C+'   (Adequate)
3.0-3.3 → 'C'    (Neutral)
< 3.0  → 'D'     (Poor Match)
```

### 3. Recommendation Engine

#### Function: getRecommendations(scriptConfig)

**Input:**
```javascript
{
  selectedTags: ['PROTAGONIST_SOLDIER', 'ANTAGONIST_CRIMINAL_MASTERMIND', ...],
  scriptStrength: 'commercial', // or 'artistic' or 'balanced'
  targetAudience: 'auto' // could be user-specified later
}
```

**Output:**
```javascript
{
  topRecommendation: AdvertiserRecommendation,
  alternatives: AdvertiserRecommendation[], // ranked 2nd-8th
  weakMatches: AdvertiserRecommendation[], // scores < 3.0, why to avoid
  analysis: {
    scriptProfile: "Soldier protagonist appeals to YM (5.0) and AF (5.0)",
    recommendationReason: "SPARK targets YM+YF+AM+AF with commercial weighting, aligning with script strength",
    budgetConsideration: "SPARK has higher cost factor (0.675) vs. NBG (0.6), but score justifies it"
  }
}
```

**Algorithm:**
```
1. For each of 8 advertisers:
   - Calculate match score using calculateAdvertiserMatch()
   - Store (advertiser, score)

2. Sort by score descending

3. Segment into tiers:
   - Top 3 recommendations (scores 4.0+)
   - Alternatives (3.0-3.99)
   - Weak matches (< 3.0)

4. Generate reasoning for each:
   - Which audiences matched well?
   - Which tags contributed most?
   - Is scoreType aligned?

5. Return ranked array with explanations
```

### 4. UI/Integration Layer

#### Component: Best Advertisers Panel
```html
<div class="best-advertisers">
  <h2>Recommended Advertisers</h2>
  
  <!-- Top Recommendation -->
  <div class="recommendation top">
    <h3>🏆 {topAgency.name} ({topAgency.audiences.join(', ')})</h3>
    <div class="score">
      <span class="number">{matchScore}/5.0</span>
      <span class="grade">{predictedGrade}</span>
    </div>
    <p class="reasoning">{reasoning}</p>
    <div class="breakdown">
      <p>Why: {breakdown}</p>
      <p>Audiences: {audienceSummary}</p>
      <p>ScoreType: {scoreTypeAlignment}</p>
    </div>
  </div>

  <!-- Alternatives -->
  <div class="alternatives">
    <h3>Also Consider</h3>
    <div class="alt-list">
      {alternatives.map((alt, i) => (
        <div class="alt-item" key={i}>
          <span>{i+2}. {alt.name}</span>
          <span class="score">{alt.matchScore}/5.0</span>
        </div>
      ))}
    </div>
  </div>

  <!-- Weak Matches -->
  <div class="weak-matches">
    <h3>⚠️ Avoid</h3>
    <div class="weak-list">
      {weakMatches.map((weak) => (
        <div class="weak-item" key={weak.agencyId}>
          <span>{weak.name}</span>
          <span class="reason">Why: {weak.reasoning}</span>
        </div>
      ))}
    </div>
  </div>
</div>
```

#### Integration Point: Script Generator Page
```javascript
// When user finishes selecting tags in Script Generator:
const scriptConfig = {
  selectedTags: getCurrentScriptTags(),
  scriptStrength: analyzeScriptStrength(), // based on tags selected
};

const recommendations = getRecommendations(scriptConfig);
displayBestAdvertisersPanel(recommendations);
```

### 5. Testing Checklist

#### Unit Tests
- [ ] calculateAdvertiserMatch() returns 0-5 score
- [ ] scoreType bonus/penalty applies correctly
- [ ] predictGradesFromScore() assigns correct grades
- [ ] getRecommendations() ranks all 8 agencies

#### Integration Tests
- [ ] Soldier script scores SPARK highest
- [ ] Female-heavy script scores VELVET GLOSS high
- [ ] Teen script scores SPICE MICE high
- [ ] Weak matches appear in "Avoid" section

#### Edge Cases
- [ ] Empty tag selection → default recommendation
- [ ] Single tag → still scores all agencies
- [ ] Conflicting tags (high commercial + high artistic) → balanced approach
- [ ] Behemoth toggle → future integration ready

### 6. File Structure

```
src/
├── calculators/
│   ├── advertiserMatcher.js      // Core algorithm
│   ├── scoreCalculator.js        // Match score logic
│   └── gradePredictor.js         // Score → grade conversion
├── data/
│   ├── agencies.json             // 8 advertisers config
│   ├── tagCompatibility.json     // 254+ tags × 6 audiences
│   └── constants.js              // Audience names, scales
├── ui/
│   ├── BestAdvertisersPanel.html // Component markup
│   ├── bestAdvertisers.css       // Styling
│   └── bestAdvertisers.js        // Event handlers + display logic
└── integrations/
    └── scriptGeneratorHook.js    // Hook into existing Script Generator
```

### 7. Success Criteria

- ✅ Recommendation panel displays for any script tag combination
- ✅ Top recommendation matches user's gameplay strategy (single perfect match)
- ✅ Score calculations verify against manual testing (e.g., Soldier → SPARK should be ~4.9)
- ✅ Grade assignment meaningful (A = Graves would approve, D = would not)
- ✅ UI integrates cleanly into existing calculator without breaking anything
- ✅ Performance: Recommendation generated < 100ms for any tag combination

### 8. Future Enhancements (Phase B+)

#### To-Do: Striking Image Integration
- [ ] Add Behemoth toggle UI
- [ ] Calculate week 1-4 projection (2x viewers for verified duration)
- [ ] Show week 5+ normal projection
- [ ] Compare total impact: with vs. without
- [ ] **Blocker:** Verify actual Behemoth duration (200 days vs. 4 weeks)

#### To-Do: Extended Features
- [ ] Budget optimization ("best bang for buck")
- [ ] Pair-matching ("which 2 ads together beat single ad?")
- [ ] Audience overlap visualization
- [ ] Genre templates (pre-built tag recommendations)

---

## Build Order

1. **Create data layer** (load/parse agencies + tags) — 30 min
2. **Implement score calculation** (calculateAdvertiserMatch) — 1 hour
3. **Implement ranking** (getRecommendations) — 45 min
4. **Build UI component** (BestAdvertisersPanel) — 1.5 hours
5. **Integrate into Script Generator** — 45 min
6. **Test & refine** — 1.5 hours

**Total: ~6 hours**

---

## Known Unknowns (Deferred)

❓ **Striking Image Duration & Stacking**
- Is it 4 weeks, 200 days, or configurable?
- Can commercial + artistic both apply?
- Probability-based (50% chance) or deterministic?
→ TODO: Verify in game or extract from Assembly-CSharp.dll

---

## Git Workflow

```bash
# Branch for feature
git checkout -b feature/best-advertisers-calculator

# Commit structure
git commit -m "feat: add data layer for agencies and tag compatibility"
git commit -m "feat: implement advertiser match score calculation"
git commit -m "feat: add recommendation ranking algorithm"
git commit -m "ui: build best advertisers recommendation panel"
git commit -m "feat: integrate with script generator"
git commit -m "test: add unit and integration tests"

# Before merge, test manually:
# - Create script with various tag combinations
# - Verify top recommendation matches expectation
# - Check grade assignment

git checkout main
git merge feature/best-advertisers-calculator
```

---

## Success Metrics

Once complete:
- Users can generate a script and instantly see "best advertiser" recommendation
- Recommendation aligns with their gameplay experience (single perfect match wins)
- Feature validates their strategy: math proves why focused ads outperform scatter approach
- Ready for Phase B (Striking Image integration)
