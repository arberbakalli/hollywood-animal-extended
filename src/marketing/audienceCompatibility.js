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

    function renderCompatibilityTable(elements) {
        if (!elements || elements.length === 0) return '';

        const container = document.getElementById('compatibilityTableContainer');
        if (!container) return;

        let html = '<table class="compatibility-table"><thead><tr><th scope="col">Element</th>';

        DEMOGRAPHICS.forEach(demo => {
            html += `<th scope="col" title="${DEMOGRAPHIC_LABELS[demo]}">${demo}</th>`;
        });
        html += '</tr></thead><tbody>';

        elements.forEach(element => {
            html += `<tr><td class="element-name">${element.name || element.id}</td>`;

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
        // Select only from the targeted context (Build for Target)
        const container = document.getElementById('selectors-container-targeted');
        if (!container) return [];

        // Select elements store value as a property, not an attribute
        const selectedProtagTag = Array.from(container.querySelectorAll('[data-category="Protagonist"]'))
            .find(el => el.value);
        const selectedAntagonistTag = Array.from(container.querySelectorAll('[data-category="Antagonist"]'))
            .find(el => el.value);

        const elements = [];

        if (selectedProtagTag?.value) {
            const tagId = selectedProtagTag.value;
            const tag = GAME_DATA.tags[tagId];
            if (tag && tag.weights) {
                const scores = {};
                DEMOGRAPHICS.forEach(demo => {
                    scores[demo] = parseFloat(tag.weights[demo] || 0);
                });
                elements.push({
                    id: tagId,
                    name: tag.name || tag.id,
                    category: 'Protagonist',
                    scores: scores
                });
            }
        }

        if (selectedAntagonistTag?.value) {
            const tagId = selectedAntagonistTag.value;
            const tag = GAME_DATA.tags[tagId];
            if (tag && tag.weights) {
                const scores = {};
                DEMOGRAPHICS.forEach(demo => {
                    scores[demo] = parseFloat(tag.weights[demo] || 0);
                });
                elements.push({
                    id: tagId,
                    name: tag.name || tag.id,
                    category: 'Antagonist',
                    scores: scores
                });
            }
        }

        return elements;
    }

    function showCompatibilityPanel() {
        const panel = document.getElementById('audience-compatibility-panel');
        const elements = getCompatibilityElements();

        if (elements.length === 0) {
            const container = document.getElementById('compatibilityTableContainer');
            container.innerHTML = '<div class="empty-state padded-empty">Select a Protagonist or Antagonist to see audience compatibility.</div>';
            panel.classList.remove('hidden');
            return;
        }

        renderCompatibilityTable(elements);
        panel.classList.remove('hidden');
    }

    function hideCompatibilityPanel() {
        const panel = document.getElementById('audience-compatibility-panel');
        panel.classList.add('hidden');
    }

    function setupCompatibilityListeners() {
        const showButton = document.getElementById('showAudienceCompatibilityButton');
        const closeButton = document.getElementById('closeCompatibilityButton');

        if (showButton) {
            showButton.addEventListener('click', showCompatibilityPanel);
        }

        if (closeButton) {
            closeButton.addEventListener('click', hideCompatibilityPanel);
        }
    }

    global.HACOudienceCompatibility = {
        setupCompatibilityListeners,
        showCompatibilityPanel,
        hideCompatibilityPanel
    };
})(globalThis);
