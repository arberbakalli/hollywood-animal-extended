(function(global) {
    "use strict";

    const SAVED_SCRIPT_SOURCE = {
        graves: 'Graves',
        advertisers: 'Marketing'
    };

    async function saveScriptFromContext(context) {
        const feedbackId = `${context}FeedbackMessage`;
        clearFeedbackMessage(feedbackId);
        try {
            await HACDataLoaders.ensureScoringDataLoaded();
        } catch (error) {
            showFeedbackMessage(feedbackId, `Could not load scoring data. ${error.message}`);
            return;
        }

        const tags = collectTagInputs(context);
        if (tags.length < 2) {
            showFeedbackMessage(feedbackId, 'Select at least 2 story elements before saving.', 'accent');
            return;
        }

        pinnedScripts.push(buildScriptFromTags(tags, `${SAVED_SCRIPT_SOURCE[context]} script`));
        renderPinnedScripts();
        showFeedbackMessage(feedbackId, 'Saved to your script library in Script Lab.', 'success');
    }

    function updateScriptName(uniqueId, newName) {
        const script = pinnedScripts.find(s => s.uniqueId === uniqueId);
        if (script) {
            script.name = newName;
        }
    }

    function toggleScriptCard(headerEl) {
        const details = headerEl.nextElementSibling;
        details.classList.toggle('hidden');
    }

    function togglePin(uniqueId, event) {
        event.stopPropagation();

        // Using string comparison to ensure type safety
        const existingIndex = pinnedScripts.findIndex(s => String(s.uniqueId) === String(uniqueId));

        if(existingIndex > -1) {
            // UNPIN: Remove from list
            pinnedScripts.splice(existingIndex, 1);
        } else {
            // PIN: Add to list
            const script = generatedScriptsCache.find(s => String(s.uniqueId) === String(uniqueId));
            if(script) {
                // DEEP COPY to ensure no reference issues with the generator cache
                const newPinned = JSON.parse(JSON.stringify(script));

                // Set default name if missing
                if(!newPinned.name) newPinned.name = "Untitled Script";

                pinnedScripts.push(newPinned);
            }
        }

        // Refresh both views
        renderPinnedScripts();
        renderGeneratedScripts(generatedScriptsCache);
    }

    function renderPinnedScripts() {
        const container = document.getElementById('pinnedResultsList');
        const wrapper = document.getElementById('pinned-scripts-container');

        // Always show the container so Save/Load buttons are accessible
        if(wrapper) wrapper.classList.remove('hidden');
        if(!container) return;

        container.innerHTML = '';

        // Show placeholder instead of hiding
        if(pinnedScripts.length === 0) {
            container.innerHTML = '<div class="empty-state pinned-empty">No saved scripts yet. Pin a generated script, or use Save to Script Library from any evaluation.</div>';
            return;
        }

        pinnedScripts.forEach(script => {
            const card = createScriptCardHTML(script, true);
            container.appendChild(card);
        });
    }

    function savePinnedScripts() {
        clearFeedbackMessage('pinnedScriptsFeedbackMessage');

        if (pinnedScripts.length === 0) {
            showFeedbackMessage('pinnedScriptsFeedbackMessage', 'No pinned scripts to save.', 'accent');
            return;
        }

        try {
            const dataToSave = JSON.parse(JSON.stringify(pinnedScripts));
            const dataStr = JSON.stringify(dataToSave, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const exportName = `hollywood_animal_scripts_${new Date().toISOString().slice(0,10)}.json`;
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", url);
            downloadAnchorNode.setAttribute("download", exportName);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            URL.revokeObjectURL(url);
            showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Pinned scripts export started.', 'success');
        } catch(e) {
            console.error("Save failed:", e);
            showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Failed to save scripts. See console for details.');
        }
    }

    function triggerLoadScripts() {
        const input = document.getElementById('loadScriptsInput');
        if(input) {
            input.value = ''; // Reset to allow re-loading same file
            input.click();
        } else {
            console.error("File input #loadScriptsInput not found in DOM.");
        }
    }

    // A library file is shared between players, so nothing in it is trusted:
    // every tag must be a real game element, its category comes from the game
    // data, and stats are recomputed from the tags rather than read from the file.
    function normalizeImportedScript(entry) {
        if (!entry || typeof entry !== 'object' || !Array.isArray(entry.tags) || entry.tags.length === 0) return null;
        if (entry.uniqueId === undefined || entry.uniqueId === null || entry.uniqueId === '') return null;

        const tags = [];
        for (const imported of entry.tags) {
            const gameTag = imported && GAME_DATA.tags[imported.id];
            if (!gameTag) return null;
            const percent = Number(imported.percent);
            tags.push({
                id: gameTag.id,
                category: gameTag.category,
                percent: gameTag.category === 'Genre' && percent > 0 && percent <= 1 ? percent : 1.0
            });
        }

        const name = typeof entry.name === 'string' ? entry.name : 'Untitled Script';
        const script = buildScriptFromTags(tags, name);
        script.uniqueId = String(entry.uniqueId);
        if (entry.optimizedFor === 'artistic' || entry.optimizedFor === 'commercial') {
            script.optimizedFor = entry.optimizedFor;
        }
        return script;
    }

    function importScripts(entries) {
        const currentIds = new Set(pinnedScripts.map(s => String(s.uniqueId)));
        let added = 0;
        let skipped = 0;

        entries.forEach(entry => {
            const script = normalizeImportedScript(entry);
            if (!script) {
                skipped++;
                return;
            }
            if (currentIds.has(script.uniqueId)) return;
            pinnedScripts.push(script);
            currentIds.add(script.uniqueId);
            added++;
        });

        return { added, skipped };
    }

    function handleFileLoad(input) {
        const file = input.files[0];
        if (!file) return;
        clearFeedbackMessage('pinnedScriptsFeedbackMessage');

        const reader = new FileReader();
        reader.addEventListener('load', async function(e) {
            let loaded;
            try {
                loaded = JSON.parse(e.target.result);
            } catch(err) {
                console.error(err);
                showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Error parsing JSON file.');
                return;
            }

            if (!Array.isArray(loaded)) {
                showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Invalid file format: JSON is not an array.');
                return;
            }

            try {
                await HACDataLoaders.ensureScoringDataLoaded();
            } catch (error) {
                showFeedbackMessage('pinnedScriptsFeedbackMessage', `Could not load scoring data. ${error.message}`);
                return;
            }
            const { added, skipped } = importScripts(loaded);
            const skippedNote = skipped > 0
                ? ` Skipped ${skipped} invalid ${skipped === 1 ? 'entry' : 'entries'}.`
                : '';

            if (added > 0) {
                renderPinnedScripts();
                showFeedbackMessage('pinnedScriptsFeedbackMessage', `Loaded ${added} scripts.${skippedNote}`, 'success');
            } else if (skipped > 0) {
                showFeedbackMessage('pinnedScriptsFeedbackMessage', `No valid scripts found in file.${skippedNote}`, 'accent');
            } else {
                showFeedbackMessage('pinnedScriptsFeedbackMessage', 'No new unique scripts found in file.', 'accent');
            }
        }, { once: true });
        reader.readAsText(file);
    }

    // Resolved at call time, not load time: these live in script.js, which loads
    // after this module.
    function runTransferTarget(targetContext) {
        if (targetContext === 'graves') return evaluateColmanGravesScript();
        return analyzeMovie();
    }

    async function transferScriptToContext(uniqueId, targetContext) {
        let script = pinnedScripts.find(s => s.uniqueId === uniqueId);
        if(!script) script = generatedScriptsCache.find(s => s.uniqueId === uniqueId);

        if(!script) return;

        switchTab(targetContext);
        initializeSelectors(targetContext);

        const skippedTags = [];
        const addedGenreInputs = [];

        script.tags.forEach(t => {
            const tag = GAME_DATA.tags[t.id] || t;
            if (!tag || !tag.id) return;

            if (!HACStoryElementSelector.canUseTagInContext(tag.id, targetContext)) {
                skippedTags.push(tag);
                return;
            }

            const added = addTagToSelectorContext(tag, targetContext);
            if (added && t.category === "Genre") {
                addedGenreInputs.push(t);
            }
        });

        if(addedGenreInputs.length > 1) {
            updateGenreControls(targetContext);
        }
        HACGenreMix.restoreGenrePercents(targetContext, addedGenreInputs);

        if (targetContext === 'advertisers') {
            try {
                await HACDataLoaders.ensureScoringDataLoaded();
            } catch (error) {
                showFeedbackMessage('advertisersFeedbackMessage', `Could not load scoring data. ${error.message}`);
                return;
            }
            HACScriptEvaluation.autofillMarketingScoresFromTags(collectTagInputs(targetContext));
        }

        await runTransferTarget(targetContext);

        if (skippedTags.length > 0) {
            const names = skippedTags
                .map(tag => GAME_DATA.tags[tag.id] ? GAME_DATA.tags[tag.id].name : tag.id)
                .join(', ');
            showFeedbackMessage(`${targetContext}FeedbackMessage`, `Skipped excluded elements: ${names}.`, 'accent');
        }
    }

    function transferScriptToAdvertisers(uniqueId) {
        return transferScriptToContext(uniqueId, 'advertisers');
    }

    global.HACScriptLibrary = {
        SAVED_SCRIPT_SOURCE,
        saveScriptFromContext,
        updateScriptName,
        toggleScriptCard,
        togglePin,
        renderPinnedScripts,
        savePinnedScripts,
        triggerLoadScripts,
        importScripts,
        handleFileLoad,
        transferScriptToAdvertisers,
        transferScriptToContext
    };
})(globalThis);
