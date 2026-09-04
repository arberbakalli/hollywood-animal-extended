# Codex Feature Product Map

Generated: 2026-09-04

Scope: map the current app as product features, identify where they do the same or similar jobs, and suggest possible merge directions. This is an analysis document only. It does not recommend changing scoring logic without a separate test-backed refactor.

Primary sources:

- `index.html`
- `script.js`
- `data.js`
- `tests/*.test.js`
- `graphify-out/GRAPH_REPORT.md`

## Short Read

The app currently has three real product jobs:

1. Build a script.
2. Evaluate a script.
3. Market and release a script.

The five visible tabs are not all separate products. Some are different views of the same underlying job:

- `Script Compatibility` and `Colman Graves` both evaluate selected story elements with the same compatibility and bonus math.
- `Best Advertisers` and `Targeted Ads` are opposite directions of the same marketing planner.
- `Script Generator`, `Graves Best Matches`, and `Targeted Ads` all generate or recommend tags, but they optimize for different goals.
- `Distribution Calculator` belongs closer to release planning than advertiser matching, though it currently lives inside `Best Advertisers`.

Best future product shape, in my view:

1. `Script Lab`: generator, locked/excluded tags, best matches, pinned scripts.
2. `Script Evaluation`: compatibility calculator plus Colman Graves dossier view.
3. `Marketing & Release`: best advertisers, targeted ads, holidays, campaign duration, distribution.

Do not merge everything into one screen. Merge the underlying engines first, then expose clearer product modes.

## Feature Inventory

### 1. App Shell

Product job:

- Load the game data.
- Localize tag names.
- Switch between product tabs.
- Keep global UI controls wired.

Current UI:

- Header and language selector.
- Tab nav: `Script Generator`, `Script Compatibility`, `Colman Graves`, `Best Advertisers`, `Targeted Ads`.

Main code:

- `initializeApp`
- `changeLanguage`
- `loadExternalData`
- `switchTab`
- `setupDomEventBindings`

Inputs:

- Language selection.
- Data files from `data/` and `localization/`.

Outputs:

- Populated app state and visible tab.

Overlap:

- All features depend on the shell.
- Tab state and selector initialization are currently global, not feature-owned.

Merge/refactor thought:

- Keep as its own shell layer.
- Long term name: `AppShell` or `FeatureShell`.
- Do not mix product logic into this layer.

### 2. Shared Story Element Selector

Product job:

- Let the user select tags by category.
- Support multiple rows where the game allows multiple tags.
- Support genre percentages.
- Support category search and quick search.
- Provide stable selected tag input to every feature.

Current UI:

- `selectors-container-generator`
- `selectors-container-excluded`
- `selectors-container-synergy`
- `selectors-container-graves`
- `selectors-container-advertisers`
- `selectors-container-targeted`

Main code:

- `initializeSelectors`
- `addDropdown`
- `collectTagInputs`
- `restoreSelection`
- `updateGenreControls`
- `setupGlobalCategorySearch`
- `setupSearchListeners`
- `selectTagFromSearch`
- `addTagToSelectorContext`

Inputs:

- Tag category.
- Feature context.
- Search text.
- Selected values.
- Genre percentage sliders.

Outputs:

- Normalized tag input objects:

```js
{
    id,
    category,
    percent
}
```

Overlap:

- This is the largest shared product primitive in the app.
- Every major feature has a copy of the same selector experience, only with different validation rules.

Merge/refactor thought:

- This should become a named internal component before any big UI merge.
- Long term name: `StoryElementBuilder`.
- Give it a config object per feature:

```js
{
    context: "graves",
    allowSearch: true,
    requiredRange: [5, 10],
    maxOptionalTags: null,
    useAvailabilityProfile: false,
    allowExclusions: false
}
```

### 3. Generator Availability Profiles

Product job:

- Let the user choose whether generation may use all tags or only early-game starting tags.
- Convert non-starting tags into generator exclusions.
- Combine profile exclusions with manual exclusions.

Current UI:

- `Starting Tags`
- `Custom`
- `Excluded Elements` count.

Main code:

- `setGeneratorProfile`
- `populateExcludedForStartingProfile`
- `getProfileExcludedIds`
- `getStarterAvailableIds`
- `getAllAvailableTagIds`
- `getGeneratorExcludedIds`
- `getGeneratorExcludedTags`
- `updateExcludedCount`

Inputs:

- Selected profile.
- Starter whitelist.
- Manual excluded tags.

Outputs:

- Effective excluded ID set for generation and Graves best matches.

Overlap:

- Currently owned by Script Generator, but Graves Best Matches also reads the same exclusion set.
- This is more general than the generator. It is really "tag availability."

Merge/refactor thought:

- Treat this as a shared product filter.
- Long term name: `TagAvailabilityFilter`.
- Use it anywhere the app recommends new tags, not only in the generator.

### 4. Script Generator

Product job:

- Produce five script options for a target compatibility and target movie score.
- Respect locked tags.
- Respect manual exclusions and starting-profile exclusions.
- Let users pin, save, load, and transfer generated scripts to marketing analysis.

Current UI:

- Generator settings.
- Target average compatibility.
- Target movie score.
- Locked Elements.
- Excluded Elements.
- Generated Options.
- Pinned Scripts.

Main code:

- `generateScripts`
- `runGenerationAlgorithm`
- `getRequiredElementCount`
- `getRandomTagByCategory`
- `getCompatibleGenres`
- `renderGeneratedScripts`
- `createScriptCardHTML`
- `togglePin`
- `renderPinnedScripts`
- `savePinnedScripts`
- `handleFileLoad`
- `transferScriptToAdvertisers`

Inputs:

- Target compatibility score.
- Target movie score.
- Locked tags.
- Excluded tags.
- Tag availability profile.

Outputs:

- Five candidate scripts.
- Compatibility average.
- movie score estimate.
- script quality cap.
- Pinned script JSON export/import.

Overlap:

- Uses the same compatibility math as `Script Compatibility` and `Colman Graves`.
- Uses the same tag builder as the other tabs.
- Has recommendation overlap with `Graves Best Matches` and `Targeted Ads`, but its optimization goal is different.

Similar but not same:

- Generator asks: "What full script can I make from my available elements?"
- Graves Best Matches asks: "What one tag pairs well with what I already selected?"
- Targeted Ads asks: "What full script best serves this audience or advertiser?"

Merge/refactor thought:

- Do not merge the UI with Targeted Ads yet.
- Merge shared engine pieces first:
  - `CompatibilityEvaluator`
  - `TagAvailabilityFilter`
  - `CandidateScriptBuilder`
  - `SavedScriptRepository`

### 5. Pinned Script Library

Product job:

- Save generated scripts during planning.
- Name pinned scripts.
- Export/import pinned scripts as JSON.
- Reuse saved scripts in advertiser analysis.

Current UI:

- Pinned Scripts section.
- Save button.
- Load button.
- Script cards with pin/unpin and transfer buttons.

Main code:

- `pinnedScripts`
- `generatedScriptsCache`
- `renderPinnedScripts`
- `createScriptCardHTML`
- `togglePin`
- `updateScriptName`
- `savePinnedScripts`
- `triggerLoadScripts`
- `handleFileLoad`

Inputs:

- Generated scripts.
- Imported JSON.
- User script names.

Outputs:

- Pinned scripts in memory.
- Downloadable JSON.
- Scripts transferred to Best Advertisers.

Overlap:

- Currently tied to generated scripts only.
- Could serve manually built scripts from Compatibility, Graves, or Advertisers too.

Merge/refactor thought:

- This should become a cross-feature saved-work area.
- Long term name: `ScriptNotebook` or `SavedScriptLibrary`.
- Product merge idea: every evaluation result could offer "Save Script" and "Send to Marketing."

### 6. Script Compatibility

Product job:

- Let the user manually select story elements and see whether they fit.
- Show raw compatibility average.
- Show script synergy.
- Show commercial/artistic bonus contribution.
- Estimate final commercial/artistic movie score.
- Warn about severe conflicts.

Current UI:

- Quick Search.
- Check Compatibility.
- Average Compatibility.
- Script Synergy.
- Bonuses.
- Potential Movie Score.
- Conflicts.
- Find Best Advertisers transfer.

Main code:

- `calculateSynergy`
- `calculateMatrixScore`
- `calculateTotalBonuses`
- `calculateGenrePairScore`
- `renderSynergyResults`
- `transferTagsToAdvertisers`

Inputs:

- Manual tag selection.
- Genre percentages.

Outputs:

- Pair average.
- Weighted script synergy.
- Commercial and artistic bonuses.
- Capped commercial and artistic movie scores.
- Conflict rows.

Overlap:

- This is the same core math as Colman Graves.
- It computes movie score in a very similar way to Graves.
- It uses the same conflict source as Graves, but displays conflict text differently.

Merge/refactor thought:

- Strong merge candidate with Colman Graves.
- Keep a "Calculator View" for raw numbers.
- Make Graves the "Dossier View" for product presentation.
- One shared result object should feed both.

Possible shared output model:

```js
{
    selectedTags,
    pairAverage,
    scriptSynergy,
    bonuses,
    movieScores,
    conflicts,
    audienceAppeal
}
```

### 7. Colman Graves Evaluation

Product job:

- Give a more in-game-feeling script evaluation.
- Require a more complete script, currently 5 to 10 selected elements.
- Show verdict, average fit, commercial score, artistic score, narrative analysis, likely audience, and conflicts.

Current UI:

- Colman Graves intro card.
- Quick Search.
- Submit Script.
- Evaluate Script.
- Results as a Graves dossier.

Main code:

- `evaluateColmanGravesScript`
- `getGravesVerdict`
- `calculateGravesMovieScores`
- `calculateGravesAudience`
- `findGravesConflicts`
- `renderColmanGravesResults`

Inputs:

- Manual tag selection.

Outputs:

- Verdict: Success, Common, Risky, Failed.
- Average fit.
- Commercial/artistic score.
- Pair average and script synergy method rows.
- Likely audience pills.
- Conflict rows.

Overlap:

- Shares `calculateMatrixScore` and `calculateTotalBonuses` with Script Compatibility.
- Recalculates movie score cap logic in its own helper.
- Audience calculation overlaps conceptually with Best Advertisers, but Graves normalizes it differently and uses it as a script diagnosis rather than a marketing plan.

Same or similar:

- Same as Script Compatibility for scoring.
- Similar to Best Advertisers for audience discovery.
- Different from Best Advertisers because it does not rank agencies, holidays, or campaign duration.

Merge/refactor thought:

- Merge with Script Compatibility at the engine level first.
- Product UI could become:
  - `Evaluate Script`
  - subview: `Compatibility Numbers`
  - subview: `Colman Graves Notes`
- Do not merge Graves with Targeted Ads. Graves judges the current script. Targeted Ads invents scripts for a target.

### 8. Graves Best Matches

Product job:

- Given one or more selected story elements, suggest high-fit tags to add.
- Let the user filter by category.
- Let the user choose minimum fit.
- Optionally restrict to starting tags.
- Respect generator exclusions.
- Add a suggested tag back into the Graves selector.

Current UI:

- Match Category.
- Minimum Fit.
- Starting tags only.
- Generate Best Matches.
- Best Matches result panel.

Main code:

- `generateBestMatches`
- `getRawCompatibilityScore`
- `renderBestMatches`
- `hideGravesBestMatches`
- `hideGravesEvaluationResults`

Inputs:

- Selected Graves tags.
- Category filter.
- Minimum score.
- Starting-only filter.
- Exclusion set.

Outputs:

- Up to 30 strong pair suggestions.
- Add buttons that insert suggestions into the Graves builder.

Overlap:

- Similar to Script Generator because it recommends story elements.
- Similar to Targeted Ads because it searches tags for a goal.
- Uses the same raw compatibility matrix as Script Compatibility and Graves evaluation.

Similar but not same:

- Graves Best Matches is a pair recommender.
- Script Generator is a full-script generator.
- Targeted Ads is an audience/advertiser reverse lookup.

Merge/refactor thought:

- This should probably live inside `Script Lab`, not inside final evaluation results.
- It can become a side panel called `Suggestions`.
- Long term engine name: `CompatibilitySuggestionEngine`.

### 9. Best Advertisers

Product job:

- Given a script and commercial/artistic movie scores, recommend marketing choices.
- Identify target audience.
- Rank ad agencies.
- Show weak advertisers to avoid.
- Recommend holidays.
- Recommend campaign duration.
- Feed distribution calculator.

Current UI:

- Quick Search.
- Movie Scores.
- Build Your Script.
- Analyse.
- Target Audience.
- Holiday Release.
- Recommended Advertisers.
- Recommended Advertisement Duration.
- Distribution Calculator.

Main code:

- `analyzeMovie`
- `calculateAdvertiserMatch`
- `predictGradeFromScore`
- `generateReasoning`
- `getRecommendations`
- `renderAdvertiserCard`
- `displayAdvertiserRecommendations`

Inputs:

- Manual tag selection.
- Commercial score.
- Artistic score.

Outputs:

- Audience interest pills.
- Movie lean: balanced, artistic, commercial.
- Top advertiser, alternatives, and better-avoided advertisers.
- Holiday ranking.
- Campaign duration.

Overlap:

- Same advertiser scoring engine as Targeted Ads.
- Audience discovery overlaps with Graves audience, but uses different normalization and feeds a different product job.
- Distribution calculator is release planning, not advertiser matching.

Merge/refactor thought:

- Strong merge candidate with Targeted Ads.
- Product framing: `Marketing Planner`.
- Keep two modes:
  - `Analyze Current Script`
  - `Build For Target`

### 10. Distribution Calculator

Product job:

- Estimate weekly independent distribution screenings needed from commercial score and owned theatre screenings.
- Apply opening-week boost when Striking Image or Artistic Ability is active.

Current UI:

- Owned Theatres input.
- Commercial score display.
- Striking Image toggle.
- Artistic Ability toggle.
- Week 1 through Week 8 output grid.

Main code:

- `setupDistributionLogic`
- `recalculateDistribution`
- `updateDistributionGrid`
- `initializeDistributionToggles`
- `getDistributionMultiplier`

Inputs:

- Commercial score.
- Owned screenings.
- Striking Image toggle.
- Artistic Ability toggle.

Outputs:

- Weekly screenings needed for eight weeks.

Overlap:

- Depends on commercial score from Best Advertisers UI.
- Could use commercial score output from Script Compatibility or Colman Graves too.
- It is adjacent to advertising, but the product job is release planning.

Merge/refactor thought:

- This belongs in `Marketing & Release`.
- It should not be hidden inside advertiser results forever.
- Later product shape:
  - advertisers
  - holidays
  - campaign duration
  - distribution

### 11. Targeted Ads

Product job:

- Reverse the advertiser workflow.
- User selects target audiences or advertisers.
- User optionally locks tags.
- App returns script combinations that should perform best for those targets.

Current UI:

- Select Target Audiences.
- Or Select Advertiser.
- Add Tags.
- Find Top Combinations.
- Top Combinations result list.

Main code:

- `initializeTargetedAdsTab`
- `findTargetedCombinations`
- `searchForTargetCombinations`
- `resolveTargetedTagInputs`
- `scoreTagForTargetAgencies`
- `generateTargetedCombinations`
- `generateTargetingReasoning`
- `displayTargetedResults`
- `resetTargetedTab`

Inputs:

- Selected audiences.
- Selected advertisers.
- Optional locked tags.

Outputs:

- Ranked six-tag combinations.
- Average advertiser score.
- Letter grade.
- Reasoning string.

Overlap:

- Same advertiser scoring core as Best Advertisers.
- Same tag selector as Generator, Graves, Compatibility, and Advertisers.
- Similar recommendation shape to Script Generator, but optimizes for marketing fit, not compatibility.

Same or similar:

- Same domain as Best Advertisers.
- Similar UX pattern as Script Generator.
- Not same logic as Script Generator.

Merge/refactor thought:

- Merge product with Best Advertisers as `Marketing Planner`.
- Do not reuse Script Generator output blindly, because Targeted Ads currently does not optimize compatibility.
- A future combined engine could optimize both:
  - target audience fit
  - advertiser grade
  - compatibility average
  - exclusions and starting-only availability

## Similarity Matrix

Legend:

- `Same core`: same math or same underlying engine.
- `Similar`: same product pattern, different goal.
- `Adjacent`: related workflow, not the same product.
- `Separate`: should stay separate.

| Feature A | Feature B | Relationship | Why |
| --- | --- | --- | --- |
| Script Compatibility | Colman Graves Evaluation | Same core | Both use compatibility matrix and bonus math to judge selected tags. |
| Script Compatibility | Graves Best Matches | Same data, different action | Compatibility evaluates a selected set; Best Matches searches pair additions. |
| Colman Graves Evaluation | Graves Best Matches | Same workspace | Both live in Graves, but one judges current script and one suggests next tags. |
| Script Generator | Graves Best Matches | Similar | Both recommend tags, but generator makes full scripts and Best Matches suggests pairs. |
| Script Generator | Targeted Ads | Similar | Both output candidate scripts; generator optimizes script fit, Targeted Ads optimizes advertiser/audience fit. |
| Best Advertisers | Targeted Ads | Same product family | One is forward analysis, the other is reverse lookup. Both use advertiser/audience scoring. |
| Best Advertisers | Distribution Calculator | Adjacent | Both are marketing/release planning, but distribution uses commercial score and theatre capacity. |
| Colman Graves Evaluation | Best Advertisers | Adjacent | Graves finds likely audience; Best Advertisers turns audience into campaign choices. |
| Pinned Script Library | Generator Results | Same workspace | Pinned scripts are saved generated scripts today. Could become shared saved scripts. |
| Story Element Selector | Every feature | Same UI primitive | Every feature selects the same game tags with similar category controls. |

## Merge Candidates

### Candidate A: Merge Script Compatibility and Colman Graves

Recommendation: yes, but engine first.

Why:

- They answer the same user question: "Is this script good?"
- They use the same compatibility and bonus math.
- Graves is the better product framing.
- Compatibility is still valuable as a raw calculator view.

Suggested product shape:

- Top-level tab: `Script Evaluation`
- Main action: `Evaluate Script`
- Result sections:
  - `Graves Verdict`
  - `Scores`
  - `Conflicts`
  - `Likely Audience`
  - `Raw Compatibility`

Risk:

- Low to medium if the shared result model is extracted first.
- Medium to high if the two UIs are merged directly in the current monolith.

### Candidate B: Merge Best Advertisers and Targeted Ads

Recommendation: yes, strongest product merge.

Why:

- They are two directions of the same workflow.
- Best Advertisers asks: "I have a script. Who should I market it to?"
- Targeted Ads asks: "I have a target. What script should I make?"
- Both use agencies, demographics, tag audience weights, and grade bands.

Suggested product shape:

- Top-level tab: `Marketing Planner`
- Mode switch:
  - `Analyze Current Script`
  - `Build For Target`
- Shared output:
  - audience fit
  - advertiser grade
  - recommended campaign plan
  - weak matches

Risk:

- Medium.
- The UI can merge, but the generation logic should stay separate until Targeted Ads also understands compatibility/exclusions.

### Candidate C: Move Distribution into Marketing & Release

Recommendation: yes.

Why:

- Distribution is release planning, not advertiser selection.
- It already depends on commercial score from the advertiser tab.
- Compatibility and Graves also compute commercial score, so distribution could be useful from evaluation results too.

Suggested product shape:

- In `Marketing & Release`, keep Distribution as a permanent section.
- Let it receive commercial score from:
  - manual score input
  - Script Compatibility result
  - Colman Graves result
  - Generated script result

Risk:

- Low if it is only moved visually.
- Medium if score ownership changes.

### Candidate D: Merge Generator, Graves Best Matches, and Targeted Ads into one "recommendation engine"

Recommendation: not yet.

Why:

- They look similar because they output tags, but their goals are different.
- Combining them too early can blur what a "best" result means.

Better path:

- Extract common candidate-building utilities.
- Keep separate scoring goals:
  - compatibility goal
  - pair suggestion goal
  - advertiser/audience goal
- Later expose them as modes under `Script Lab`.

Risk:

- High if merged at UI level now.
- Low if merged only as shared helper utilities.

## Proposed Product Architecture

### Level 1: Product Areas

```text
App Shell
  Script Lab
    Story Element Builder
    Availability Filter
    Script Generator
    Best Match Suggestions
    Saved Script Library

  Script Evaluation
    Compatibility Engine
    Graves Dossier
    Conflict Inspector
    Audience Read

  Marketing & Release
    Advertiser Matcher
    Targeted Script Finder
    Holiday Planner
    Campaign Duration Planner
    Distribution Planner
```

### Level 2: Shared Engines

```text
CompatibilityEvaluator
  calculateMatrixScore
  calculateTotalBonuses
  calculateGenrePairScore
  getRawCompatibilityScore
  findConflicts

MovieScoreEstimator
  getRequiredElementCount
  getScoringElementCount
  calculateMovieScores

AdvertiserMatcher
  calculateAdvertiserMatch
  predictGradeFromScore
  getRecommendations

AudienceAnalyzer
  calculateAudienceAffinity
  normalizeAudienceInterest

TagAvailabilityFilter
  getStarterAvailableIds
  getProfileExcludedIds
  getGeneratorExcludedIds

StoryElementBuilder
  initializeSelectors
  addDropdown
  collectTagInputs
  restoreSelection
```

## Product Naming Suggestions

Current names are understandable, but the product hierarchy can be clearer.

Recommended tab names:

- `Script Lab` instead of `Script Generator`
- `Script Evaluation` instead of `Script Compatibility`
- `Colman Graves` as a subview or branded result inside `Script Evaluation`
- `Marketing Planner` instead of `Best Advertisers`
- `Targeted Ads` as a mode inside `Marketing Planner`
- `Distribution` as a section inside `Marketing & Release`

If keeping five tabs for now:

- Keep `Script Generator`.
- Rename `Script Compatibility` to `Script Evaluation`.
- Keep `Colman Graves` until it is merged.
- Rename `Best Advertisers` to `Marketing Planner`.
- Rename `Targeted Ads` to `Build For Target`.

## What Should Merge First

Order I would use:

1. Extract a shared evaluation result model for Script Compatibility and Graves.
2. Make Graves and Compatibility render from that same model.
3. Extract advertiser matching into a shared internal engine used by both Best Advertisers and Targeted Ads.
4. Merge Best Advertisers and Targeted Ads visually under a `Marketing Planner` tab.
5. Move Distribution into the same product area, but keep its calculation isolated.
6. Promote Pinned Scripts into a shared saved-script library.
7. Only then consider merging generator-style features under `Script Lab`.

## Things That Look Duplicate But Should Not Be Merged Blindly

### Movie score cap logic

`Script Compatibility`, `Colman Graves`, and `Script Generator` all talk about score caps and scoring element counts. This should become one helper, but only with tests, because tiny changes affect user-facing numbers.

### Audience logic

Graves audience and Best Advertisers audience both use tag demographic weights, but they normalize differently and answer different questions.

- Graves: "Who will probably like this script?"
- Best Advertisers: "Who is targetable enough to plan a campaign?"

These should share lower-level affinity helpers, not necessarily identical final thresholds.

### Generated scripts

Script Generator and Targeted Ads both output script combinations, but:

- Generator optimizes compatibility/movie-score target.
- Targeted Ads optimizes advertiser/audience fit.

A future combined finder should show its optimization goal clearly, otherwise "best" becomes confusing.

## Current Risk Map

High risk:

- `script.js` owns almost all feature behavior.
- Feature boundaries are product-visible but not code-visible.
- Several product features share math without a single named domain object.

Medium risk:

- Targeted Ads uses advertiser scoring but does not appear to include compatibility scoring in its generated combinations.
- Distribution default values are already listed as inconsistent in `docs/KNOWN_ISSUES.md`.
- Graves and Compatibility duplicate movie-score/cap presentation logic.

Low risk:

- DOM hook structure is improving.
- Tests cover scoring core, advertiser scoring, Graves helpers, data shape, and HTML structure.
- Graphify confirms the major hubs match the product map: calculator core, score concepts, tag categories, pinned scripts, game data, and application entry points.

## Decision Notes

My product opinion:

- Make Colman Graves the human-facing evaluation experience.
- Keep raw Compatibility as a compact "numbers" view, not a separate mental product forever.
- Merge Best Advertisers and Targeted Ads because they are clearly one planner from opposite directions.
- Keep Script Generator separate until the app can explain which goal it is optimizing.
- Treat Distribution as release planning and make it available wherever a commercial score exists.

Most useful next document:

- A route-by-route refactor plan that maps each future module to exact existing functions and test coverage.
