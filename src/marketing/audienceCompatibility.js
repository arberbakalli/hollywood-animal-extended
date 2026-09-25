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

    function getScoreLabel(score) {
        if (score >= 4.0) return 'Excellent';
        if (score >= 3.0) return 'Very Good';
        if (score >= 1.0) return 'Good';
        if (score > -1.0) return 'Neutral';
        if (score >= -3.0) return 'Bad';
        if (score >= -4.0) return 'Very Bad';
        return 'Disastrous';
    }

    function getScoreClass(score) {
        if (score >= 4.0) return 'excellent';
        if (score >= 1.0) return 'good';
        if (score > -1.0) return 'neutral';
        if (score >= -3.0) return 'bad';
        return 'disastrous';
    }

    function getCategoryClass(category) {
        if (!category) return '';
        return `category-${category.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-')}`;
    }

    function renderCompatibilityTable(elements) {
        const container = document.getElementById('compatibilityTableContainer');
        if (!container) return;

        if (!elements || elements.length === 0) {
            // Show all available elements grouped by category
            const allElements = Object.values(GAME_DATA.tags)
                .filter(tag => tag && tag.weights && tag.category)
                .sort((a, b) => {
                    if (a.category !== b.category) return a.category.localeCompare(b.category);
                    return (a.name || a.id).localeCompare(b.name || b.id);
                });

            if (allElements.length === 0) {
                container.innerHTML = '<div class="empty-state padded-empty">No elements available.</div>';
                return;
            }

            let html = '<table class="compatibility-table"><thead><tr><th scope="col">Element</th>';
            DEMOGRAPHICS.forEach(demo => {
                html += `<th scope="col" title="${DEMOGRAPHIC_LABELS[demo]}">${demo}</th>`;
            });
            html += '</tr></thead><tbody>';

            allElements.forEach(tag => {
                const catClass = getCategoryClass(tag.category);
                html += `<tr><td class="element-name ${catClass}">${tag.name || tag.id}</td>`;
                DEMOGRAPHICS.forEach(demo => {
                    const score = parseFloat(tag.weights[demo] || 0);
                    const label = getScoreLabel(score);
                    const scoreClass = getScoreClass(score);
                    html += `<td class="score-cell ${scoreClass}" title="${label}">${score.toFixed(1)}</td>`;
                });
                html += '</tr>';
            });

            html += '</tbody></table>';
            container.innerHTML = html;
            return;
        }

        // Show only selected elements
        let html = '<table class="compatibility-table"><thead><tr><th scope="col">Element</th>';
        DEMOGRAPHICS.forEach(demo => {
            html += `<th scope="col" title="${DEMOGRAPHIC_LABELS[demo]}">${demo}</th>`;
        });
        html += '</tr></thead><tbody>';

        elements.forEach(element => {
            const catClass = getCategoryClass(element.category);
            html += `<tr><td class="element-name ${catClass}">${element.name || element.id}</td>`;
            DEMOGRAPHICS.forEach(demo => {
                const score = element.scores?.[demo] ?? 0;
                const label = getScoreLabel(score);
                const scoreClass = getScoreClass(score);
                html += `<td class="score-cell ${scoreClass}" title="${label}">${score.toFixed(1)}</td>`;
            });
            html += '</tr>';
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

        // Listen for changes on all selectors in targeted context
        const container = document.getElementById('selectors-container-targeted');
        if (container) {
            container.addEventListener('change', updateCompatibilityDisplay);
        }
    }

    global.HACOudienceCompatibility = {
        setupCompatibilityListeners,
        updateCompatibilityDisplay
    };
})(globalThis);
