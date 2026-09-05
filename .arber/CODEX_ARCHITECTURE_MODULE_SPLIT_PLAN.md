# Codex Architecture Module Split Plan

Generated: 2026-09-05

Branch: `major-changes`

## Goal

Split the current monolithic `script.js` into feature-owned modules after the
`major-changes` product shape is accepted.

The split should make the code easier to review and change without altering
game logic, scoring outputs, UI labels, DOM ids, or saved-script file shape.

## Current State

The browser now loads feature-owned classic-script modules from `src/`.
`script.js` is a bootstrap and legacy shim file that preserves the old global
function names for tests, browser handlers, and gradual migration.

The implemented module split owns these layers:

- app boot and tab switching
- data loading and localization
- shared story element selectors
- generator availability and script generation
- pinned/saved scripts
- compatibility scoring
- Colman Graves evaluation
- advertiser analysis
- targeted ads
- distribution planning
- shared feedback and collapsible UI behavior

This removes the old monolithic ownership risk while keeping static GitHub
Pages deployment simple.

## Non-Goals

- Do not change scoring formulas.
- Do not rename user-visible game concepts.
- Do not change generated script ranking.
- Do not change advertiser grading.
- Do not change Colman Graves thresholds.
- Do not add a framework just to split files.
- Do not merge `docs/` deployment behavior into a new build system until the
  current static deployment is proven preserved.

## Success Criteria

Every migration slice must pass:

- `node --check script.js`
- `node --check docs/script.js`
- `npx --yes html-validate index.html docs/index.html`
- `npm test -- --runInBand`
- Browser smoke for:
  - Script Lab generation
  - Compatibility Numbers
  - Colman Graves
  - Marketing Analyze Script
  - Marketing Build for Target
  - Script Library save/load path

Before and after each extraction, golden-master tests must prove the changed
function returns the same values.

## Proposed Source Layout

Keep the static app simple. Modules live under `src/`, and `script.js` stays as
the bootstrap/orchestration shim until all tests and browser handlers can move
off legacy global function names.

```text
src/
  app/
    appShell.js
    state.js
    domIds.js
  data/
    dataLoaders.js
    localization.js
  selectors/
    storyElementSelector.js
    searchIndex.js
  generator/
    availabilityFilter.js
    scriptGenerator.js
  library/
    scriptLibrary.js
  evaluation/
    compatibilityEngine.js
    movieScoreEstimator.js
    scriptEvaluation.js
    gravesAudience.js
    gravesBestMatches.js
  marketing/
    advertiserMatcher.js
    marketingPlanner.js
    targetedAds.js
    distributionPlanner.js
  ui/
    feedback.js
    collapsibleSections.js
    scoreFormatting.js
```

## Module Ownership Map

### `src/app/appShell.js`

Owns:

- `initializeApp`
- `switchTab`
- `setupDomEventBindings`
- primary product area mode routing

Depends on:

- data loaders
- selector initialization
- feature setup functions

### `src/app/state.js`

Owns shared mutable state:

- `searchIndex`
- `currentTab`
- `generatedScriptsCache`
- `pinnedScripts`
- `localizationMap`
- `currentLanguage`
- `currentGenProfile`
- `startingProfileExcludedLoaded`
- `tagSelectRowCounter`
- `compatibilityLoaded`
- `genrePairsLoaded`

Rule:

- This module should export named state accessors or a single `appState`
  object. Avoid free-floating globals after extraction.

### `src/app/domIds.js`

Owns:

- `toDomId`
- `categoryToElementSlug`
- any stable DOM-id conventions used by selectors and tests

Reason:

- The app now has many unique ids. Keeping id construction in one place makes
  jQuery-style hooks safer.

### `src/data/dataLoaders.js`

Owns:

- `loadExternalData`
- `ensureCompatibilityLoaded`
- `ensureGenrePairsLoaded`
- data-file fetch and merge behavior

Risk:

- High. Data loading drives every feature, so extract only after tests prove
  `GAME_DATA` shape is unchanged.

### `src/data/localization.js`

Owns:

- `changeLanguage`
- `updateAllTagNames`
- `parseWeights`
- `beautifyTagName`

Depends on:

- `GAME_DATA`
- selector render refresh

### `src/selectors/storyElementSelector.js`

Owns:

- `initializeSelectors`
- `addDropdown`
- `restoreSelection`
- `collectTagInputs`
- `getSelectedTags`
- `getSelectedTagsInCategory`
- `refreshCategoryDropdowns`
- `updateGenreControls`
- `addTagToSelectorContext`
- `selectTagFromSearch`

Why first-class:

- This is the biggest shared UI primitive. Generator, Compatibility, Graves,
  Advertisers, and Targeted Ads all depend on it.

### `src/selectors/searchIndex.js`

Owns:

- `buildSearchIndex`
- `setupGlobalCategorySearch`
- `setupSearchListeners`
- `setupSingleSearch`
- `performSearchFilter`

Possible later merge:

- Could live in `storyElementSelector.js`, but split is cleaner because search
  has its own DOM lifecycle and failure cases.

### `src/generator/availabilityFilter.js`

Owns:

- `setGeneratorProfile`
- `populateExcludedForStartingProfile`
- `getProfileExcludedIds`
- `getStarterAvailableIds`
- `getAllAvailableTagIds`
- `getManuallyExcludedIds`
- `getGeneratorExcludedIds`
- `getGeneratorExcludedTags`
- `updateExcludedCount`

Reason:

- This is no longer only generator behavior. Graves Best Matches also reads the
  same exclusion model.

### `src/generator/scriptGenerator.js`

Owns:

- `generateScripts`
- `runGenerationAlgorithm`
- `getRequiredElementCount`
- `getCompatibleGenres`
- `getRandomTagByCategory`
- `renderGeneratedScripts`
- `createScriptCardHTML`
- `createScriptId`
- `buildScriptFromTags`
- `buildScriptStats`

Rule:

- Keep generation ranking unchanged. If ranking changes, it needs a separate
  feature request and snapshot tests.

### `src/library/scriptLibrary.js`

Owns:

- `saveScriptFromContext`
- `renderPinnedScripts`
- `savePinnedScripts`
- `triggerLoadScripts`
- `handleFileLoad`
- `togglePin`
- `toggleScriptCard`
- `updateScriptName`
- `transferScriptToAdvertisers`

Reason:

- Pinned scripts are now a cross-feature Script Library, not only generator
  state.

### `src/evaluation/compatibilityEngine.js`

Owns pure scoring:

- `calculateMatrixScore`
- `calculateTotalBonuses`
- `calculateGenrePairScore`
- `getRawCompatibilityScore`

Test gate:

- Existing scoring snapshots must remain byte-for-byte equivalent after
  extraction.

### `src/evaluation/movieScoreEstimator.js`

Owns:

- `getScoringElementCount`
- `getMovieScoreCap`
- `calculateMovieScores`

Reason:

- Compatibility, Graves, and Generator all need one cap ladder.

### `src/evaluation/scriptEvaluation.js`

Owns:

- `calculateScriptEvaluation`
- `calculateSynergy`
- `renderSynergyResults`
- `transferTagsToAdvertisers`

Depends on:

- compatibility engine
- movie score estimator
- selector collection
- feedback helpers

### `src/evaluation/gravesAudience.js`

Owns:

- `getGravesVerdict`
- `calculateGravesAudience`
- `findGravesConflicts`
- `renderColmanGravesResults`
- `evaluateColmanGravesScript`

Reason:

- Graves is product presentation on top of shared evaluation, not a separate
  scoring engine.

### `src/evaluation/gravesBestMatches.js`

Owns:

- `generateBestMatches`
- `renderBestMatches`
- `hideGravesBestMatches`
- `hideGravesEvaluationResults`

Keep in evaluation:

- Best Matches should stay near Graves until the product UX changes, because
  its "add suggestion" loop writes back to the Graves selector.

### `src/marketing/advertiserMatcher.js`

Owns:

- `ADVERTISER_GRADE_BANDS`
- `ADVERTISER_WEAK_THRESHOLD`
- `calculateAdvertiserMatch`
- `predictGradeFromScore`
- `generateReasoning`
- `getRecommendations`
- `renderAdvertiserCard`

Reason:

- This is already shared by forward advertiser analysis and reverse targeted
  combination search.

### `src/marketing/marketingPlanner.js`

Owns:

- `analyzeMovie`
- `displayAdvertiserRecommendations`

Depends on:

- advertiser matcher
- selectors
- distribution planner

### `src/marketing/targetedAds.js`

Owns:

- `initializeTargetedAdsTab`
- `resetTargetedTab`
- `findTargetedCombinations`
- `searchForTargetCombinations`
- `resolveTargetedTagInputs`
- `withCompatibilityWeights`
- `scoreTagForTargetAgencies`
- `generateTargetedCombinations`
- `generateTargetingReasoning`
- `compatibilityTone`
- `displayTargetedResults`

Rule:

- Keep ranking advertiser-first. Story fit is displayed as context, not used as
  the top-level sort unless explicitly changed later.

### `src/marketing/distributionPlanner.js`

Owns:

- `setupDistributionLogic`
- `recalculateDistribution`
- `updateDistributionGrid`
- `initializeDistributionToggles`
- `getDistributionMultiplier`

Reason:

- Release planning is separate from advertiser matching even though both live
  in Marketing & Release.

### `src/ui/feedback.js`

Owns:

- `showFeedbackMessage`
- `clearFeedbackMessage`

### `src/ui/collapsibleSections.js`

Owns:

- `setupCollapsibleSections`

### `src/ui/scoreFormatting.js`

Owns:

- `formatScore`
- `formatSimpleScore`
- `setToneClass`

## Migration Order

### Slice 1: Pure Scoring Modules

Status: done on `major-changes`.

Move only pure helpers:

- `calculateMatrixScore`
- `calculateTotalBonuses`
- `calculateGenrePairScore`
- `getRawCompatibilityScore`
- `getScoringElementCount`
- `getMovieScoreCap`
- `calculateMovieScores`

Why first:

- These functions are testable without DOM.
- Existing snapshots already guard behavior.

Implemented files:

- `src/evaluation/compatibilityEngine.js`
- `src/evaluation/movieScoreEstimator.js`
- `docs/src/evaluation/compatibilityEngine.js`
- `docs/src/evaluation/movieScoreEstimator.js`

Legacy wrapper functions remain in `script.js` so current UI code and tests can
move gradually.

### Slice 2: Script Evaluation Modules

Status: done on `major-changes`.

Move:

- `calculateScriptEvaluation`
- `calculateSynergy`
- `renderSynergyResults`
- Graves verdict/audience/conflict rendering

Why second:

- Product map already made Compatibility and Graves share one model.

### Slice 3: Selector Component

Status: done on `major-changes`.

Move selector/search functions.

Why third:

- More DOM-heavy and riskier than pure scoring.
- Needs browser smoke after every small step.

### Slice 4: Script Library

Status: done on `major-changes`.

Move saved-script functions.

Why fourth:

- Product behavior is now cross-feature, but data shape must stay compatible
  with existing JSON exports.

### Slice 5: Generator

Status: done on `major-changes`.

Move availability profile and generation logic.

Why fifth:

- Generator combines scoring, selectors, exclusions, random search, and saved
  scripts. It should move only after its dependencies are modules.

### Slice 6: Marketing & Release

Status: done on `major-changes`.

Move advertiser matcher, targeted ads, and distribution.

Why sixth:

- Advertiser matching is pure-ish, but rendering and distribution are tied to
  the current product area layout.

### Slice 7: Bootstrap Cleanup

Status: done on `major-changes`.

After all feature modules are extracted:

- shrink `script.js` into a bootstrap file
- keep only app initialization and compatibility shims while tests still need
  old global function names
- mirror `src/`, `index.html`, and `script.js` into `docs/` with
  `npm run sync:docs`

## Deployment Notes

The project is currently static and mirrors root files into `docs/` for GitHub
Pages. A module split must preserve that.

Two safe options:

1. No build tool:
   - keep `src/` copied into `docs/src/`
   - load `script.js` as a module
   - mirror import paths exactly in `docs/`

2. Small build step:
   - use a bundler later
   - emit one bundled `docs/script.js`
   - update `run.*` and README commands

Recommendation:

- Start with option 1. Add a bundler only if module copying becomes annoying.

## Test Changes Needed Later

Current tests load legacy globals from `script.js`. During the split, update
tests gradually:

- pure scoring tests import modules directly
- DOM structure tests keep reading `index.html`
- browser smoke remains the final product check
- legacy harness stays until the last bootstrap cleanup slice

## Stop Conditions

Pause the module split if any slice causes:

- snapshot changes without an explicit scoring decision
- broken GitHub Pages mirror
- changed saved-script JSON shape
- feature product names changing again
- unclear ownership between Generator, Graves Best Matches, and Targeted Ads

## Recommendation

Module split is complete enough for manual product verification on
`major-changes`.

Next safe implementation after manual approval:

1. Merge `major-changes` into the working branch you want to keep.
2. Remove legacy wrappers only after tests import modules directly.
3. Keep `npm run sync:docs` in the verification loop when root browser files
   change.
