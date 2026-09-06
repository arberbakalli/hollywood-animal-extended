// Bootstrap and legacy global shims. Feature implementations live in src/.
window.addEventListener('load', initializeApp, { once: true });

var ADVERTISER_GRADE_BANDS = HACAdvertiserMatcher.ADVERTISER_GRADE_BANDS;
var ADVERTISER_WEAK_THRESHOLD = HACAdvertiserMatcher.ADVERTISER_WEAK_THRESHOLD;

async function initializeApp() {
    return HACAppShell.initializeApp();
}

function toDomId(value) {
    return HACDomIds.toDomId(value);
}

function categoryToElementSlug(category) {
    return HACDomIds.categoryToElementSlug(category);
}

async function loadExternalData() {
    return HACDataLoaders.loadExternalData();
}

async function ensureCompatibilityLoaded() {
    return HACDataLoaders.ensureCompatibilityLoaded();
}

async function ensureGenrePairsLoaded() {
    return HACDataLoaders.ensureGenrePairsLoaded();
}

async function changeLanguage(langName, shouldRender = true) {
    return HACLocalization.changeLanguage(langName, shouldRender);
}

function updateAllTagNames() {
    return HACLocalization.updateAllTagNames();
}

function parseWeights(weightObj) {
    return HACLocalization.parseWeights(weightObj);
}

function beautifyTagName(rawId) {
    return HACLocalization.beautifyTagName(rawId);
}

function setupGlobalCategorySearch() {
    return HACSearchIndex.setupGlobalCategorySearch();
}

function performSearchFilter(searchInput) {
    return HACSearchIndex.performSearchFilter(searchInput);
}

function buildSearchIndex() {
    return HACSearchIndex.buildSearchIndex();
}

function setupSearchListeners() {
    return HACSearchIndex.setupSearchListeners();
}

function setupSingleSearch(inputId, resultId, context) {
    return HACSearchIndex.setupSingleSearch(inputId, resultId, context);
}

function restoreSelection(context, savedInputs) {
    return HACStoryElementSelector.restoreSelection(context, savedInputs);
}

function initializeSelectors(context) {
    return HACStoryElementSelector.initializeSelectors(context);
}

function getSelectedTagsInCategory(category, context) {
    return HACStoryElementSelector.getSelectedTagsInCategory(category, context);
}

function refreshCategoryDropdowns(category, context) {
    return HACStoryElementSelector.refreshCategoryDropdowns(category, context);
}

function removeBlockedLockedPicks() {
    return HACScriptGenerator.removeBlockedLockedPicks();
}

function refreshLockedElementAvailability() {
    return HACStoryElementSelector.refreshLockedElementAvailability();
}

function addDropdown(category, selectedId = null, context = currentTab) {
    return HACStoryElementSelector.addDropdown(category, selectedId, context);
}

function updateGenreControls(context) {
    return HACStoryElementSelector.updateGenreControls(context);
}

function selectTagFromSearch(tagObj, context) {
    return HACStoryElementSelector.selectTagFromSearch(tagObj, context);
}

function addTagToSelectorContext(tagObj, context) {
    return HACStoryElementSelector.addTagToSelectorContext(tagObj, context);
}

function collectTagInputs(context) {
    return HACStoryElementSelector.collectTagInputs(context);
}

function resetSelectors(context) {
    return HACStoryElementSelector.resetSelectors(context);
}

function getSelectedTags(context) {
    return HACStoryElementSelector.getSelectedTags(context);
}

function setGeneratorProfile(profileName) {
    return HACAvailabilityFilter.setGeneratorProfile(profileName);
}

function populateExcludedForStartingProfile() {
    return HACAvailabilityFilter.populateExcludedForStartingProfile();
}

function getProfileExcludedIds() {
    return HACAvailabilityFilter.getProfileExcludedIds();
}

function getStarterAvailableIds() {
    return HACAvailabilityFilter.getStarterAvailableIds();
}

function getAllAvailableTagIds(profileName = currentGenProfile) {
    return HACAvailabilityFilter.getAllAvailableTagIds(profileName);
}

function getManuallyExcludedIds(context = 'excluded') {
    return HACAvailabilityFilter.getManuallyExcludedIds(context);
}

function getGeneratorExcludedIds(manualExcludedTags = null) {
    return HACAvailabilityFilter.getGeneratorExcludedIds(manualExcludedTags);
}

function getGeneratorExcludedTags(manualExcludedTags = null) {
    return HACAvailabilityFilter.getGeneratorExcludedTags(manualExcludedTags);
}

function updateExcludedCount() {
    return HACAvailabilityFilter.updateExcludedCount();
}

function setupScoreSync() {
    return HACScriptGenerator.setupScoreSync();
}

function getRequiredElementCount(targetScore) {
    return HACScriptGenerator.getRequiredElementCount(targetScore);
}

function setupGeneratorControls() {
    return HACScriptGenerator.setupGeneratorControls();
}

async function generateScripts() {
    return HACScriptGenerator.generateScripts();
}

function runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags) {
    return HACScriptGenerator.runGenerationAlgorithm(targetComp, targetCount, fixedTags, excludedTags);
}

function getCompatibleGenres(sourceId, excludedIds) {
    return HACScriptGenerator.getCompatibleGenres(sourceId, excludedIds);
}

function getScoringElementCount(tags) {
    return HACMovieScoreEstimator.getScoringElementCount(tags);
}

function getRandomTagByCategory(category, currentTags, excludedIds) {
    return HACScriptGenerator.getRandomTagByCategory(category, currentTags, excludedIds);
}

function renderGeneratedScripts(scripts) {
    return HACScriptGenerator.renderGeneratedScripts(scripts);
}

function createScriptId() {
    return HACScriptGenerator.createScriptId();
}

function buildScriptStats(matrix, movieScores) {
    return HACScriptGenerator.buildScriptStats(matrix, movieScores);
}

function buildScriptFromTags(tags, name) {
    return HACScriptGenerator.buildScriptFromTags(tags, name);
}

function createScriptCardHTML(scriptObj, isPinnedSection) {
    return HACScriptGenerator.createScriptCardHTML(scriptObj, isPinnedSection);
}

async function saveScriptFromContext(context) {
    return HACScriptLibrary.saveScriptFromContext(context);
}

function updateScriptName(uniqueId, newName) {
    return HACScriptLibrary.updateScriptName(uniqueId, newName);
}

function toggleScriptCard(headerEl) {
    return HACScriptLibrary.toggleScriptCard(headerEl);
}

function togglePin(uniqueId, event) {
    return HACScriptLibrary.togglePin(uniqueId, event);
}

function renderPinnedScripts() {
    return HACScriptLibrary.renderPinnedScripts();
}

function savePinnedScripts() {
    return HACScriptLibrary.savePinnedScripts();
}

function triggerLoadScripts() {
    return HACScriptLibrary.triggerLoadScripts();
}

function handleFileLoad(input) {
    return HACScriptLibrary.handleFileLoad(input);
}

function transferScriptToAdvertisers(uniqueId) {
    return HACScriptLibrary.transferScriptToAdvertisers(uniqueId);
}

function transferScriptToContext(uniqueId, targetContext) {
    return HACScriptLibrary.transferScriptToContext(uniqueId, targetContext);
}

async function calculateSynergy() {
    return HACScriptEvaluation.calculateSynergy();
}

function calculateMatrixScore(tags) {
    return HACCompatibilityEngine.calculateMatrixScore(tags, GAME_DATA);
}

function calculateTotalBonuses(tags) {
    return HACCompatibilityEngine.calculateTotalBonuses(tags, GAME_DATA);
}

function calculateGenrePairScore(tags) {
    return HACCompatibilityEngine.calculateGenrePairScore(tags, GAME_DATA);
}

function getMovieScoreCap(scoringCount) {
    return HACMovieScoreEstimator.getMovieScoreCap(scoringCount);
}

function calculateMovieScores(matrix, bonuses, tags) {
    return HACMovieScoreEstimator.calculateMovieScores(matrix, bonuses, tags);
}

function calculateScriptEvaluation(tags, matrix = null, bonuses = null) {
    return HACScriptEvaluation.calculateScriptEvaluation(tags, matrix, bonuses);
}

function renderSynergyResults(evaluation) {
    return HACScriptEvaluation.renderSynergyResults(evaluation);
}

function transferTagsToAdvertisers(sourceContext = 'synergy') {
    return HACScriptEvaluation.transferTagsToAdvertisers(sourceContext);
}

async function evaluateColmanGravesScript() {
    return HACGravesAudience.evaluateColmanGravesScript();
}

function getGravesVerdict(rawAverage) {
    return HACGravesAudience.getGravesVerdict(rawAverage);
}

function calculateGravesAudience(tags) {
    return HACGravesAudience.calculateGravesAudience(tags);
}

function getRawCompatibilityScore(tagA, tagB) {
    return HACCompatibilityEngine.getRawCompatibilityScore(tagA, tagB, GAME_DATA);
}

function findGravesConflicts(tags) {
    return HACGravesAudience.findGravesConflicts(tags);
}

function renderColmanGravesResults(evaluation) {
    return HACGravesAudience.renderColmanGravesResults(evaluation);
}

function hideGravesBestMatches() {
    return HACGravesBestMatches.hideGravesBestMatches();
}

async function generateBestMatches() {
    return HACGravesBestMatches.generateBestMatches();
}

function hideGravesEvaluationResults() {
    return HACGravesBestMatches.hideGravesEvaluationResults();
}

function renderBestMatches() {
    return HACGravesBestMatches.renderBestMatches();
}

function setBestMatchMode(mode) {
    return HACGravesBestMatches.setBestMatchMode(mode);
}

function updateGravesExclusionNotice() {
    return HACGravesBestMatches.updateGravesExclusionNotice();
}

function jumpToExclusionEditor() {
    return HACGravesBestMatches.jumpToExclusionEditor();
}

function calculateAdvertiserMatch(scriptTags, movieLean, agency) {
    return HACAdvertiserMatcher.calculateAdvertiserMatch(scriptTags, movieLean, agency);
}

function predictGradeFromScore(score) {
    return HACAdvertiserMatcher.predictGradeFromScore(score);
}

function generateReasoning(agency, score) {
    return HACAdvertiserMatcher.generateReasoning(agency, score);
}

function getRecommendations(scriptConfig) {
    return HACAdvertiserMatcher.getRecommendations(scriptConfig);
}

function renderAdvertiserCard(entry, extraClass) {
    return HACAdvertiserMatcher.renderAdvertiserCard(entry, extraClass);
}

async function analyzeMovie() {
    return HACMarketingPlanner.analyzeMovie();
}

function displayAdvertiserRecommendations(recommendations) {
    return HACMarketingPlanner.displayAdvertiserRecommendations(recommendations);
}

function setupDistributionLogic() {
    return HACDistributionPlanner.setupDistributionLogic();
}

function recalculateDistribution() {
    return HACDistributionPlanner.recalculateDistribution();
}

function updateDistributionGrid(commercialScore, availableScreenings) {
    return HACDistributionPlanner.updateDistributionGrid(commercialScore, availableScreenings);
}

function initializeDistributionToggles() {
    return HACDistributionPlanner.initializeDistributionToggles();
}

function getDistributionMultiplier() {
    return HACDistributionPlanner.getDistributionMultiplier();
}

async function initializeTargetedAdsTab() {
    return HACTargetedAds.initializeTargetedAdsTab();
}

function resetTargetedTab() {
    return HACTargetedAds.resetTargetedTab();
}

async function findTargetedCombinations() {
    return HACTargetedAds.findTargetedCombinations();
}

async function searchForTargetCombinations(targetAgencies, constraintTags = [], constraintAudiences = [], maxResults = 20) {
    return HACTargetedAds.searchForTargetCombinations(targetAgencies, constraintTags, constraintAudiences, maxResults);
}

function resolveTargetedTagInputs(tagInputs) {
    return HACTargetedAds.resolveTargetedTagInputs(tagInputs);
}

function withCompatibilityWeights(tags) {
    return HACTargetedAds.withCompatibilityWeights(tags);
}

function scoreTagForTargetAgencies(tag, targetAgencies) {
    return HACTargetedAds.scoreTagForTargetAgencies(tag, targetAgencies);
}

function generateTargetedCombinations(allTags, lockedTags, targetAgencies, size = 6, limit = 80) {
    return HACTargetedAds.generateTargetedCombinations(allTags, lockedTags, targetAgencies, size, limit);
}

function generateTargetingReasoning(tags, agencyScores, constraintAudiences) {
    return HACTargetedAds.generateTargetingReasoning(tags, agencyScores, constraintAudiences);
}

function compatibilityTone(rawAverage) {
    return HACTargetedAds.compatibilityTone(rawAverage);
}

function displayTargetedResults(combinations, targetAgencies, selectedAudiences) {
    return HACTargetedAds.displayTargetedResults(combinations, targetAgencies, selectedAudiences);
}

function showFeedbackMessage(elementId, message, tone = 'danger') {
    return HACFeedback.showFeedbackMessage(elementId, message, tone);
}

function clearFeedbackMessage(elementId) {
    return HACFeedback.clearFeedbackMessage(elementId);
}

function setupCollapsibleSections() {
    return HACCollapsibleSections.setupCollapsibleSections();
}

function updateSliderTrack(slider, colorOverride = null) {
    return HACScoreFormatting.updateSliderTrack(slider, colorOverride);
}

function updatePercentSliderTrack(slider) {
    return HACScoreFormatting.updatePercentSliderTrack(slider);
}

function formatScore(num) {
    return HACScoreFormatting.formatScore(num);
}

function formatSimpleScore(num) {
    return HACScoreFormatting.formatSimpleScore(num);
}

function setToneClass(element, tone) {
    return HACScoreFormatting.setToneClass(element, tone);
}

function switchTab(tabName) {
    return HACAppShell.switchTab(tabName);
}

function setupDomEventBindings() {
    return HACAppShell.setupDomEventBindings();
}
