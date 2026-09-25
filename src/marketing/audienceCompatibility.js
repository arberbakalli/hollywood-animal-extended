(function(global) {
    "use strict";

    const DEMOGRAPHICS = ['TF', 'TM', 'YF', 'YM', 'AF', 'AM'];
    const DEMOGRAPHIC_LABELS = {
        'TF': 'Teen Female',
        'TM': 'Teen Male',
        'YF': 'Young Female',
        'YM': 'Young Male',
        'AF': 'Adult Female',
        'AM': 'Adult Male'
    };
    const CATEGORY_ORDER = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Finale'];

    // Single shared table for the 5 bands shown in the visible legend
    // (index.html #audience-compatibility-panel .compatibility-legend).
    // getScoreLabel and getScoreClass both read from this so they can never
    // disagree again — see docs/GAME_RULES.md "Audience compatibility score
    // scale" for why this is 5 bands rather than the full 11-point reference
    // scale.
    function getScoreBand(score) {
        if (score >= 4.0) return { label: 'Excellent', className: 'excellent' };
        if (score >= 1.0) return { label: 'Good', className: 'good' };
        if (score > -1.0) return { label: 'Neutral', className: 'neutral' };
        if (score >= -3.0) return { label: 'Bad', className: 'bad' };
        return { label: 'Disastrous', className: 'disastrous' };
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

    function getExcludedTagIds() {
        if (typeof HACExclusionStore === 'undefined' || typeof HACExclusionStore.loadExclusions !== 'function') {
            return new Set();
        }
        return new Set(HACExclusionStore.loadExclusions().map(exclusion => exclusion.id));
    }

    function renderTableHeader() {
        let html = '<table class="compatibility-table"><thead><tr><th scope="col">Element</th>';
        DEMOGRAPHICS.forEach(demo => {
            html += `<th scope="col" title="${DEMOGRAPHIC_LABELS[demo]}">${demo}</th>`;
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
                    const aIdx = CATEGORY_ORDER.indexOf(a.category);
                    const bIdx = CATEGORY_ORDER.indexOf(b.category);
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
        const categories = ['Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event', 'Genre', 'Setting', 'Finale'];

        categories.forEach(category => {
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

    global.HACOudienceCompatibility = {
        setupCompatibilityListeners,
        updateCompatibilityDisplay,
        getScoreLabel,
        getScoreClass
    };
})(globalThis);
