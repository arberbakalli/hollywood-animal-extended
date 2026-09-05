(function(global) {
    "use strict";

    const SAVED_SCRIPT_SOURCE = {
        synergy: 'Compatibility',
        graves: 'Graves',
        advertisers: 'Marketing'
    };

    async function saveScriptFromContext(context) {
        await ensureCompatibilityLoaded();

        const feedbackId = `${context}FeedbackMessage`;
        clearFeedbackMessage(feedbackId);

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

    function handleFileLoad(input) {
        const file = input.files[0];
        if (!file) return;
        clearFeedbackMessage('pinnedScriptsFeedbackMessage');

        const reader = new FileReader();
        reader.addEventListener('load', function(e) {
            try {
                const loaded = JSON.parse(e.target.result);
                if(Array.isArray(loaded)) {
                    let added = 0;
                    // Create a Set of existing IDs to prevent duplicates
                    const currentIds = new Set(pinnedScripts.map(s => String(s.uniqueId)));

                    loaded.forEach(script => {
                        // Basic validation
                        if(script.tags && script.uniqueId) {
                            const sId = String(script.uniqueId);
                            if(!currentIds.has(sId)) {
                                pinnedScripts.push(script);
                                currentIds.add(sId);
                                added++;
                            }
                        }
                    });

                    if(added > 0) {
                        renderPinnedScripts();
                        showFeedbackMessage('pinnedScriptsFeedbackMessage', `Loaded ${added} scripts.`, 'success');
                    } else {
                        showFeedbackMessage('pinnedScriptsFeedbackMessage', 'No new unique scripts found in file.', 'accent');
                    }
                } else {
                    showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Invalid file format: JSON is not an array.');
                }
            } catch(err) {
                console.error(err);
                showFeedbackMessage('pinnedScriptsFeedbackMessage', 'Error parsing JSON file.');
            }
        }, { once: true });
        reader.readAsText(file);
    }

    function transferScriptToAdvertisers(uniqueId) {
        let script = pinnedScripts.find(s => s.uniqueId === uniqueId);
        if(!script) script = generatedScriptsCache.find(s => s.uniqueId === uniqueId);

        if(!script) return;

        switchTab('advertisers');
        initializeSelectors('advertisers');

        script.tags.forEach(t => {
            const category = t.category;
            const containerId = `inputs-${categoryToElementSlug(category)}-advertisers`;
            const container = document.getElementById(containerId);
            if (!container) return;

            const existingSelects = container.querySelectorAll('select');
            let placed = false;
            for (let sel of existingSelects) {
                if (sel.value === "") {
                    sel.value = t.id;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                addDropdown(category, t.id, 'advertisers');
            }
        });

        const genres = script.tags.filter(t => t.category === "Genre");
        if(genres.length > 1) {
            updateGenreControls('advertisers');
        }

        analyzeMovie();
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
        handleFileLoad,
        transferScriptToAdvertisers
    };
})(globalThis);
