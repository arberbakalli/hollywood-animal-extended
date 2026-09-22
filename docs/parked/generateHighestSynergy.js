// Parked prototype from the abandoned "generate highest synergy" path.
// Keep outside src/ until this becomes a real loaded module again.
(function(global) {
    "use strict";

    function generateHighestSynergy(goal = 'overall') {
        clearFeedbackMessage('gravesFeedbackMessage');

        // Collect exactly one of each required category, then optimize
        const requiredCategories = ['Genre', 'Setting', 'Protagonist'];
        const allCategories = Object.keys(GAME_DATA.tags).reduce((cats, tagId) => {
            const tag = GAME_DATA.tags[tagId];
            if (!cats[tag.category]) cats[tag.category] = [];
            cats[tag.category].push({ id: tagId, ...tag });
            return cats;
        }, {});

        // Start with required categories (pick best from each)
        let best = null;
        let bestScore = -Infinity;

        // For simplicity, we'll generate a script with one of each category
        // and score combinations to find the highest synergy
        const generateCombination = (genres, settings, protagonists, antagonists = [], supporting = []) => {
            const tags = [
                ...genres,
                ...settings,
                ...protagonists,
                ...antagonists,
                ...supporting
            ];

            if (tags.length < 5 || tags.length > 10) return null;

            const eval = calculateScriptEvaluation(tags);
            const score = goal === 'commercial'
                ? eval.movieScores.commercial
                : goal === 'artistic'
                ? eval.movieScores.artistic
                : eval.matrix.rawAverage;

            return { tags, score, eval };
        };

        // Try combinations with 1-3 supporting characters
        const genres = allCategories['Genre'] || [];
        const settings = allCategories['Setting'] || [];
        const protagonists = allCategories['Protagonist'] || [];
        const antagonists = allCategories['Antagonist'] || [];
        const supporting = allCategories['Supporting Character'] || [];
        const finales = allCategories['Finale'] || [];

        // Greedy search: pick best from each category
        for (let g of genres.slice(0, 3)) {
            for (let s of settings.slice(0, 3)) {
                for (let p of protagonists.slice(0, 3)) {
                    for (let a of [null, ...antagonists.slice(0, 2)]) {
                        for (let sup1 of supporting.slice(0, 2)) {
                            for (let sup2 of [null, ...supporting.slice(0, 2)]) {
                                for (let f of [null, ...finales.slice(0, 2)]) {
                                    const combo = generateCombination(
                                        [{ id: g.id, category: 'Genre', name: g.name, percent: 100 }],
                                        [{ id: s.id, category: 'Setting', name: s.name }],
                                        [{ id: p.id, category: 'Protagonist', name: p.name }],
                                        a ? [{ id: a.id, category: 'Antagonist', name: a.name }] : [],
                                        [{ id: sup1.id, category: 'Supporting Character', name: sup1.name },
                                         sup2 ? { id: sup2.id, category: 'Supporting Character', name: sup2.name } : null].filter(Boolean),
                                    );

                                    if (combo && combo.score > bestScore) {
                                        bestScore = combo.score;
                                        best = combo;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (!best) {
            showFeedbackMessage('gravesFeedbackMessage', 'Could not generate a valid script. Try adjusting settings.', 'accent');
            return;
        }

        // Apply the best combination to the graves context
        resetSelectors('graves');
        const container = document.getElementById('selectors-container-graves');
        if (container) container.classList.add('is-batching');

        best.tags.forEach(tag => {
            addTagToSelectorContext(tag, 'graves');
        });

        if (container) container.classList.remove('is-batching');

        // Evaluate immediately
        evaluateColmanGravesScript();

        showFeedbackMessage(
            'gravesFeedbackMessage',
            `Generated highest ${goal} synergy script (${bestScore.toFixed(2)})`,
            'success'
        );
    }

    global.HACGenerateSynergy = {
        generateHighestSynergy
    };
})(globalThis);
