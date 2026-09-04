# Claude CLI Prompt: Best Advertisers Calculator Feature

Copy and paste this into Claude Code/Claude CLI to build the feature.

---

## THE PROMPT

```
You are building a feature for the Hollywood Animal Calculator, a web-based tool that 
helps players optimize their movie production strategy in the game "Hollywood Animal."

# CONTEXT: What You're Building

Build the "Best Advertisers Recommendation Engine" — a feature that analyzes a player's 
script configuration (protagonist, antagonist, setting, themes selected) and recommends 
the optimal advertising agency to hire based on audience compatibility scoring.

This feature has been fully spec'd and data-verified against actual game files. Your job 
is pure implementation.

# DATA & MECHANICS (VERIFIED)

## 8 Advertising Agencies
| Game ID  | Player Name        | Audiences      | Weighting   | Strategy               |
|----------|-------------------|----------------|-------------|------------------------|
| B1RADIO  | NBG               | AM+AF          | Neutral     | Safe adult play        |
| B1BLBRD  | ROSS & ROSS       | AM+AF          | Neutral     | Budget-friendly adult  |
| ARTMAG   | VIEN PASCAL       | YM+YF+AM+AF    | Artistic    | Script appeals to art  |
| COMMAG   | SPARK             | YM+YF+AM+AF    | Commercial  | Script appeals broadly |
| B3PRINT  | NATE SPARROW PRESS| YM+YF+AM+AF    | Neutral     | Most versatile         |
| FC2      | VELVET GLOSS      | TF+YF+AF       | Commercial  | Female-centric         |
| MCA1     | PIERRE ZOLA       | TM+YM+AM       | Mixed       | Male-centric           |
| TYC1     | SPICE MICE        | TM+TF+YM+YF    | Commercial  | Teen focus             |

## Audience Demographics (Mapped to IDs)
- 0 = TF (Teen Female)
- 1 = TM (Teen Male)
- 2 = YF (Young Female)
- 3 = YM (Young Male)
- 4 = AF (Adult Female)
- 5 = AM (Adult Male)

## Tag Compatibility System
Each of 254+ script tags (protagonist types, antagonist types, etc.) has a compatibility 
score (1.0-5.0) for each audience demographic.

Example: PROTAGONIST_SOLDIER
- TF: 3.0 (Neutral)
- TM: 3.0 (Neutral)
- YF: 2.0 (Bad)
- YM: 5.0 (Excellent)  ← Young males = target
- AF: 5.0 (Excellent)  ← Adult females = also target
- AM: 4.0 (Very Good)

Score Scale:
- 1.0-2.0 = Bad/Very Bad (audience rejects this)
- 3.0 = Neutral (adequate appeal)
- 4.0 = Very Good (strong appeal)
- 5.0 = Excellent (perfect match)

## Core Algorithm: Match Score Calculation

For each advertiser:
1. Extract audiences served (e.g., AM+AF for NBG)
2. For each selected script tag, look up tag's ageCompatibility array
3. Extract scores for advertiser's audiences
4. Calculate base score = AVERAGE of those scores
5. Apply scoreType bonus/penalty:
   - If advertiser.scoreType matches script's commercial/artistic strength: +0.25
   - If mismatch: -0.2
   - If neutral: no adjustment
6. Cap result to 5.0
7. Convert to grade: 5.0=A+, 4.7+=A, 4.3+=B+, etc.

Why this works: Concentrated appeal (one advertiser perfectly matching) scores higher 
than scattered appeal (multiple mediocre matches). Players discovered this gameplay 
strategy; your feature validates it mathematically.

# YOUR IMPLEMENTATION CHECKLIST

Read BEST_ADVERTISERS_IMPLEMENTATION_PLAN.md for full details. Quick version:

## Phase A: Core Recommendation Engine (What You're Building)

### 1. Data Layer
- [ ] Load 8 advertisers config (agencies.js or constant in code)
- [ ] Load 254+ tag compatibility data (from TagsToAgeCompatibilityData.json)
- [ ] Define audience name constants (TF, TM, YF, YM, AF, AM)

### 2. Core Algorithm (Functions to Implement)
- [ ] calculateAdvertiserMatch(scriptTags, scriptStrength, advertiser)
  → Returns match score (0-5) with scoring breakdown
- [ ] predictGradesFromScore(score)
  → Converts 0-5 score to letter grade (A+, A, B+, B, C, D)
- [ ] getRecommendations(scriptConfig)
  → Returns top recommendation + alternatives + weak matches (all ranked, all explained)

### 3. UI Component
- [ ] Create BestAdvertisersPanel (HTML/CSS/JS)
  → Display top recommendation with reasoning
  → Display 2-7 alternatives ranked by score
  → Display weak matches with "why to avoid" explanation
  → Responsive, matches existing calculator style

### 4. Integration
- [ ] Hook into Script Generator page
  → When user finishes selecting tags, automatically calculate recommendations
  → Display panel below or beside tag selection

### 5. Testing
- [ ] Test script: PROTAGONIST_SOLDIER should score SPARK highest (~4.9)
- [ ] Test script: Female protagonist should score VELVET GLOSS high
- [ ] Test script: Teen tags should score SPICE MICE high
- [ ] Verify grade conversion (scores 4.5+ should show A/B+ grade)

# WHERE THINGS GO IN YOUR REPO

Your calculator repo is at: C:\Users\testUser\IdeaProjects\Hollywood-Animal-Calculator

Current structure:
```
hollywood/
├── index.html (main page)
├── style.css (styling)
├── calculator.js (monolithic script)
└── data/
    └── (game data files)
```

Add feature here:
```
hollywood/
├── src/
│   ├── calculators/
│   │   ├── advertiserMatcher.js      (NEW: Core algorithm)
│   │   ├── scoreCalculator.js        (NEW: Match score logic)
│   │   └── gradePredictor.js         (NEW: Score→grade conversion)
│   ├── ui/
│   │   ├── BestAdvertisersPanel.html (NEW: Component)
│   │   ├── bestAdvertisers.css       (NEW: Styling)
│   │   └── bestAdvertisers.js        (NEW: Event handlers)
│   └── integrations/
│       └── scriptGeneratorHook.js    (NEW: Hook into existing code)
├── data/
│   ├── agencies.json                 (NEW: 8 advertisers)
│   └── tagCompatibility.json         (STAGE: from Steam/game files)
├── index.html (UPDATE: reference new CSS/JS)
└── calculator.js (OPTIONAL: leave as-is, or refactor later)
```

# DATA FILES YOU'LL NEED

**agencies.json** — Create this with 8 agencies:
```json
{
  "B1RADIO": {
    "gameId": "B1RADIO",
    "name": "NBG",
    "audiences": [5, 4],
    "scoreType": "commercial",
    "quality": 2,
    "budgetFactor": 0.6
  },
  // ... etc for ALLB1, ARTMAG, COMMAG, B3PRINT, FC2, MCA1, TYC1
}
```

**tagCompatibility.json** — Already in game files at:
`C:\Program Files (x86)\Steam\steamapps\common\Hollywood Animal\Hollywood Animal_Data\StreamingAssets\Data\Configs\TagsToAgeCompatibilityData.json`

Copy this into your repo's `data/` folder.

# DELIVERABLE SUCCESS CRITERIA

When done:
✅ Player selects script tags (e.g., PROTAGONIST_SOLDIER + ANTAGONIST_CRIMINAL_MASTERMIND)
✅ Panel appears showing "SPARK recommended, score 4.9/5.0, predicted Grade: A"
✅ Reasoning explains which audiences matched well and why
✅ Alternatives ranked 2-8 listed with scores
✅ Weak matches shown with "avoid because…" reasoning
✅ All calculations match manual verification (SOLDIER → SPARK should be 4.9)
✅ No console errors, responsive UI
✅ Integrates seamlessly into existing calculator without breaking other features

# TESTING VERIFICATION

Before considering done, manually test these scenarios:
1. Script with PROTAGONIST_SOLDIER (YM=5.0, AF=5.0, AM=4.0)
   → SPARK should rank #1 (~4.9 score)
   
2. Script with female protagonists (e.g., PROTAGONIST_FARM_GIRL, SUPPORTINGCHARACTER_FEMME_FATALE)
   → VELVET GLOSS should rank high
   
3. Script with all teen tags (TM, TF, YM, YF focus)
   → SPICE MICE should rank high
   
4. Balanced script (mixed ages/genders)
   → NATE SPARROW PRESS should rank high (it targets all 4 young+adult audiences)

# NOTES & CONTEXT

- This is Phase A of a multi-phase feature. Phase B will add "Striking Image" (Behemoth 
  building) with week-by-week projection and 2x multiplier. Phase A stands alone.
  
- The algorithm prioritizes ACCURACY over optimization. If you need to refactor for 
  performance later, that's fine—just keep logic clear.
  
- Player discovery: Single perfectly-matched advertiser beats multiple mediocre ads. 
  Your feature validates this mathematically. This is the "why" behind the feature.

- Do NOT try to extract Behemoth/Striking Image duration from game files yet. We have 
  unresolved questions (200 days vs. 4 weeks vs. 50% chance for 600 days). Mark as TODO 
  for later investigation.

# START HERE

1. Create src/data/agencies.json with 8 advertisers
2. Copy tagCompatibility.json into src/data/
3. Implement scoreCalculator.js (calculateAdvertiserMatch function)
4. Implement gradePredictor.js (predictGradesFromScore function)
5. Implement advertiserMatcher.js (getRecommendations function)
6. Build BestAdvertisersPanel.html + bestAdvertisers.js + bestAdvertisers.css
7. Create scriptGeneratorHook.js to integrate with existing Script Generator
8. Test against verification scenarios above
9. Commit with messages following git workflow in BEST_ADVERTISERS_IMPLEMENTATION_PLAN.md

Good luck! Build modular, test early, commit often.
```

---

## HOW TO RUN THIS

1. Copy the prompt above (the part in ``` marks)
2. Open Claude Code (CLI) or chat.claude.ai with code interface
3. Point to your hollywood repo: `C:\Users\testUser\IdeaProjects\Hollywood-Animal-Calculator`
4. Paste prompt
5. Claude will implement the feature following the plan

---

## WHAT TO EXPECT

Claude will:
- Create the directory structure
- Implement all functions with clear logic
- Build the UI component
- Write integration hooks
- Add test scenarios
- Commit each step

You'll get a fully working "Best Advertisers" feature ready to integrate into your 
calculator's Script Generator page.

---

## IF SOMETHING GOES WRONG

Refer back to BEST_ADVERTISERS_IMPLEMENTATION_PLAN.md for exact requirements, file 
structure, and algorithm specs. The plan is the source of truth.
