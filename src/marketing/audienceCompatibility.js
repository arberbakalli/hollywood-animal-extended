(function(global) {
    "use strict";

    const DEMOGRAPHICS = ['TF', 'TM', 'YF', 'YM', 'AF', 'AM'];

    // Single shared table for the 5 bands shown in the visible legend
    // (index.html #audience-compatibility-panel .compatibility-legend).
    // getScoreLabel and getScoreClass both read from this so they can never
    // disagree again — see docs/GAME_RULES.md "Audience compatibility score
    // scale" for why this is 5 bands rather than the full 11-point reference
    // scale.
    // Owner ruling 2026-10-08: these ranges are the rule; the legend text is
    // checked against `legend` by tests/audience-bands-rule.test.js.
    const AUDIENCE_BANDS = Object.freeze([
        { label: 'Excellent', className: 'excellent', inBand: s => s >= 4.0, legend: 'Excellent (+4.0 or more)' },
        { label: 'Good', className: 'good', inBand: s => s >= 1.0, legend: 'Good (+1.0 to +3.9)' },
        { label: 'Neutral', className: 'neutral', inBand: s => s > -1.0, legend: 'Neutral (above -1.0, below +1.0)' },
        { label: 'Bad', className: 'bad', inBand: s => s >= -3.0, legend: 'Bad (-1.0 to -3.0)' },
        { label: 'Disastrous', className: 'disastrous', inBand: () => true, legend: 'Disastrous (below -3.0)' }
    ]);

    function getScoreBand(score) {
        return AUDIENCE_BANDS.find(band => band.inBand(score));
    }

    function getScoreLabel(score) {
        return getScoreBand(score).label;
    }

    function getScoreClass(score) {
        return getScoreBand(score).className;
    }

    function getCategoryClass(category) {
        if (!category) return '';
        return `category-${category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')}`;
    }

    function getGenreClass(tagId) {
        return `genre-${tagId.toLowerCase().replace(/_/g, '-')}`;
    }

    function getElementClasses(element) {
        const categoryClass = getCategoryClass(element.category);
        const genreClass = element.category === 'Genre' ? getGenreClass(element.id) : '';
        return `element-name ${categoryClass} ${genreClass}`.trim();
    }

    // Banned if either the live ban list (the one every other context reads)
    // or the saved copy has it. The table used to read the saved copy only,
    // which lags the list by a tick and is empty when storage is unavailable,
    // so a banned element was still listed (audit 2026-10-01). TC11-000010
    // pins that a ban written to storage is honoured too.
    function getExcludedTagIds() {
        const ids = new Set();
        const banList = typeof document !== 'undefined' && document.getElementById
            ? document.getElementById('selectors-container-excluded')
            : null;
        if (banList && typeof getGeneratorExcludedIds === 'function') {
            getGeneratorExcludedIds().forEach(id => ids.add(id));
        }
        if (typeof HACExclusionStore !== 'undefined' && typeof HACExclusionStore.loadExclusions === 'function') {
            HACExclusionStore.loadExclusions().forEach(exclusion => ids.add(exclusion.id));
        }
        return ids;
    }

    function renderTableHeader() {
        let html = '<table class="compatibility-table"><thead><tr><th scope="col">Element</th>';
        DEMOGRAPHICS.forEach(demo => {
            html += `<th scope="col" title="${GAME_DATA.demographics[demo].name}">${demo}</th>`;
        });
        html += '</tr></thead><tbody>';
        return html;
    }

    function renderCategoryHeader(category) {
        const headerClass = getCategoryClass(category);
        return `<tr class="compatibility-category-header-row"><th scope="rowgroup" colspan="7" class="compatibility-category-header ${headerClass}">${category.toUpperCase()}</th></tr>`;
    }

    function renderElementRow(element, getScore) {
        let html = `<tr><td class="${getElementClasses(element)}">${element.name || element.id}</td>`;
        DEMOGRAPHICS.forEach(demo => {
            const score = getScore(element, demo);
            const label = getScoreLabel(score);
            const scoreClass = getScoreClass(score);
            html += `<td class="score-cell ${scoreClass}" title="${label}">${score.toFixed(1)}</td>`;
        });
        html += '</tr>';
        return html;
    }

    function renderCompatibilityTable(elements) {
        const container = document.getElementById('compatibilityTableContainer');
        if (!container) return;

        const excludedTagIds = getExcludedTagIds();

        if (!elements || elements.length === 0) {
            const allElements = Object.values(GAME_DATA.tags)
                .filter(tag => tag && tag.weights && tag.category && !excludedTagIds.has(tag.id))
                .sort((a, b) => {
                    const aIdx = GAME_DATA.categories.indexOf(a.category);
                    const bIdx = GAME_DATA.categories.indexOf(b.category);
                    if (aIdx !== bIdx) return aIdx - bIdx;
                    return (a.name || a.id).localeCompare(b.name || b.id);
                });

            if (allElements.length === 0) {
                container.innerHTML = '<div class="empty-state padded-empty">No elements available.</div>';
                return;
            }

            let html = renderTableHeader();
            let currentCategory = null;
            allElements.forEach(tag => {
                if (tag.category !== currentCategory) {
                    currentCategory = tag.category;
                    html += renderCategoryHeader(currentCategory);
                }
                html += renderElementRow(tag, (row, demo) => parseFloat(row.weights[demo] || 0));
            });
            html += '</tbody></table>';
            container.innerHTML = html;
            return;
        }

        let html = renderTableHeader();
        elements.forEach(element => {
            html += renderElementRow(element, (row, demo) => row.scores?.[demo] ?? 0);
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    function getCompatibilityElements() {
        const container = document.getElementById('selectors-container-targeted');
        if (!container) return [];

        const elements = [];

        GAME_DATA.categories.forEach(category => {
            const selectors = Array.from(container.querySelectorAll(`[data-category="${category}"]`));
            selectors.forEach(selector => {
                if (selector.value) {
                    const tagId = selector.value;
                    const tag = GAME_DATA.tags[tagId];
                    if (tag && tag.weights) {
                        const scores = {};
                        DEMOGRAPHICS.forEach(demo => {
                            scores[demo] = parseFloat(tag.weights[demo] || 0);
                        });
                        elements.push({
                            id: tagId,
                            name: tag.name || tag.id,
                            category: category,
                            scores: scores
                        });
                    }
                }
            });
        });

        return elements;
    }

    function updateCompatibilityDisplay() {
        const panel = document.getElementById('audience-compatibility-panel');
        if (!panel) return;

        const elements = getCompatibilityElements();
        renderCompatibilityTable(elements);
        panel.classList.remove('hidden');
    }

    function setupCompatibilityListeners() {
        const showButton = document.getElementById('showAudienceCompatibilityButton');

        if (showButton) {
            showButton.addEventListener('click', updateCompatibilityDisplay);
        }

        const container = document.getElementById('selectors-container-targeted');
        if (container) {
            container.addEventListener('change', updateCompatibilityDisplay);
        }
    }

    global.HACAudienceCompatibility = {
        setupCompatibilityListeners,
        updateCompatibilityDisplay,
        AUDIENCE_BANDS,
        getScoreLabel,
        getScoreClass
    };
})(globalThis);
