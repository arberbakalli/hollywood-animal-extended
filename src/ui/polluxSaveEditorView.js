(function(global) {
    "use strict";

    const NO_CHANGE = '';
    let source = null;
    let buckets = [];
    let downloadUrl = null;
    let wired = false;

    const byId = id => document.getElementById(id);
    const editor = () => global.HACPolluxSaveEditor;

    function setVisible(element, visible) {
        element.classList.toggle('hidden', !visible);
        element.hidden = !visible;
    }

    function setStatus(text, tone) {
        const status = byId('pollux-status');
        status.textContent = text;
        status.dataset.tone = tone || '';
    }

    function bucketLabel(bucket) {
        if (bucket.key === 'thisYearsPolluxPretenders') return `Next year's ceremony, 1 March ${bucket.ceremonyYear}`;
        return `Ceremony of 1 March ${bucket.ceremonyYear} (${bucket.held ? 'already held' : 'coming'})`;
    }

    function eligible(bucket, category) {
        return bucket.held ? category.playerCandidates.filter(c => c.recordedNominee) : category.playerCandidates;
    }

    function stateNote(bucket) {
        if (bucket.held) {
            return 'This ceremony has already been held. The fixed save rewrites its result: the winners, your films\' awards and the talents\' awards. Only the three nominees the ceremony recorded can win.';
        }
        if (bucket.categories.some(category => eligible(bucket, category).length)) {
            return 'This ceremony has not been held yet. The fixed save marks your picks to win, and the game awards them at the ceremony.';
        }
        return 'None of your films is on this list yet. The game adds them when it announces the nominations, before the ceremony on 1 March. Load a save made after the announcement.';
    }

    function roleName(roleTagId) {
        // data.js declares GAME_DATA at script top level, so it is not a property of globalThis.
        const tags = typeof GAME_DATA !== 'undefined' && GAME_DATA.tags;
        return roleTagId ? ((tags && tags[roleTagId] && tags[roleTagId].name) || roleTagId) : null;
    }

    function optionText(candidate) {
        const who = roleName(candidate.roleTagId) || `talent #${candidate.talentIds.join(', #')}`;
        const marks = [candidate.currentWinner ? 'current winner' : null, candidate.forceWinning ? 'already marked to win' : null].filter(Boolean);
        return `${candidate.title} (${who})${marks.length ? ` - ${marks.join(', ')}` : ''}`;
    }

    function currentBucket() {
        return buckets.find(bucket => bucket.key === byId('polluxBucketSelect').value) || buckets[0];
    }

    function renderCategories() {
        const bucket = currentBucket();
        const list = byId('pollux-category-list');
        list.replaceChildren();
        byId('pollux-state-note').textContent = stateNote(bucket);
        const picks = editor().defaultPicks({ ...bucket, categories: bucket.categories.map(c => ({ ...c, playerCandidates: eligible(bucket, c) })) });
        let any = false;

        bucket.categories.forEach(category => {
            const row = document.createElement('div');
            row.className = 'pollux-category';
            row.dataset.category = category.category;
            const label = document.createElement('label');
            label.textContent = category.label;
            const options = eligible(bucket, category);
            if (!options.length) {
                const empty = document.createElement('p');
                empty.className = 'empty-state pollux-empty';
                empty.textContent = 'No film of yours in this category.';
                row.append(label, empty);
                list.append(row);
                return;
            }
            any = true;
            const select = document.createElement('select');
            select.id = `polluxPick-${category.category}`;
            select.className = 'filter-select';
            label.htmlFor = select.id;
            const keep = document.createElement('option');
            keep.value = NO_CHANGE;
            keep.textContent = bucket.held ? 'Keep the recorded result' : 'Do not change';
            select.append(keep);
            options.forEach(candidate => {
                const option = document.createElement('option');
                option.value = String(candidate.index);
                option.textContent = optionText(candidate);
                select.append(option);
            });
            select.value = category.category in picks ? String(picks[category.category]) : NO_CHANGE;
            // A closed dropdown cuts a long pick; the full text sits below it.
            const pickText = document.createElement('p');
            pickText.id = `polluxPickText-${category.category}`;
            pickText.className = 'pollux-pick-text';
            const showPick = () => { pickText.textContent = select.selectedOptions[0]?.textContent || ''; };
            select.setAttribute('aria-describedby', pickText.id);
            select.addEventListener('change', showPick);
            showPick();
            row.append(label, select, pickText);
            list.append(row);
        });

        const forceAll = byId('polluxForceAllInput');
        forceAll.disabled = bucket.held || !any;
        if (forceAll.disabled) forceAll.checked = false;
        byId('polluxGenerateButton').disabled = !any;
        setVisible(byId('pollux-result'), false);
    }

    function renderBuckets() {
        const select = byId('polluxBucketSelect');
        select.replaceChildren();
        buckets.forEach(bucket => {
            const option = document.createElement('option');
            option.value = bucket.key;
            option.textContent = bucketLabel(bucket);
            select.append(option);
        });
        select.value = buckets[0].key;
        renderCategories();
    }

    function loadText(text, name) {
        try {
            const parsed = editor().parseSave(text);
            buckets = editor().describeBuckets(parsed.state);
            source = { text, name };
            setVisible(byId('pollux-picks-panel'), true);
            renderBuckets();
            const year = editor().gameYear(parsed.state);
            setStatus(`Loaded ${name}${year ? `, game year ${year}` : ''}.`, 'ok');
        } catch (error) {
            source = null;
            buckets = [];
            setVisible(byId('pollux-picks-panel'), false);
            setStatus(error instanceof editor().PolluxSaveError ? error.message : `Could not read this save: ${error.message}`, 'error');
        }
    }

    function readSelectedFile() {
        const file = byId('polluxFileInput').files[0];
        if (!file) return;
        setStatus(`Reading ${file.name}...`, '');
        // readAsText drops the BOM while decoding; keep it so the download matches the original.
        file.arrayBuffer()
            .then(buffer => loadText(new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer), file.name))
            .catch(() => setStatus('The browser could not read this file.', 'error'));
    }

    function selectedPicks(bucket) {
        const picks = {};
        bucket.categories.forEach(category => {
            const select = byId(`polluxPick-${category.category}`);
            if (select && select.value !== NO_CHANGE) picks[category.category] = Number(select.value);
        });
        return picks;
    }

    function generate() {
        if (!source) return;
        const bucket = currentBucket();
        const picks = selectedPicks(bucket);
        if (!Object.keys(picks).length) {
            setStatus('Nothing to change: every category is set to keep its result.', 'error');
            return;
        }
        try {
            // Start from the original text each time, so an earlier pick never stays marked.
            const parsed = editor().parseSave(source.text);
            const summary = editor().applyWinners(parsed.state, bucket.key, picks, { forceAllOwned: byId('polluxForceAllInput').checked });
            const output = editor().serializeSave(parsed.root, parsed.hadBom);
            const fileName = editor().fixedFileName(source.name);
            if (downloadUrl) URL.revokeObjectURL(downloadUrl);
            downloadUrl = URL.createObjectURL(new Blob([output], { type: 'application/json' }));
            const link = byId('polluxDownloadLink');
            link.href = downloadUrl;
            link.download = fileName;
            link.textContent = `Download ${fileName} again`;

            byId('pollux-result-summary').textContent = summary.held
                ? `The ${summary.ceremonyYear} result is rewritten: ${summary.winners.length} award${summary.winners.length === 1 ? '' : 's'}.`
                : `${summary.winners.length} pick${summary.winners.length === 1 ? '' : 's'} marked to win the ${summary.ceremonyYear} ceremony.`;
            const items = byId('pollux-result-list');
            items.replaceChildren(...summary.winners.map(winner => {
                const item = document.createElement('li');
                item.textContent = `${editor().CATEGORY_LABELS[winner.category]}: ${winner.title}`;
                return item;
            }));
            setVisible(byId('pollux-result'), true);
            link.click();
            setStatus(`Downloaded ${fileName}. Keep your backup, then put this file in your Saves folder and load it in the game.`, 'ok');
        } catch (error) {
            setStatus(error instanceof editor().PolluxSaveError ? error.message : `Could not make the fixed save: ${error.message}`, 'error');
        }
    }

    function setupPolluxSaveEditor() {
        if (wired || !byId('tab-pollux')) return;
        wired = true;
        byId('polluxFileInput').addEventListener('change', readSelectedFile);
        byId('polluxBucketSelect').addEventListener('change', renderCategories);
        byId('polluxGenerateButton').addEventListener('click', generate);
    }

    global.HACPolluxSaveEditorView = {
        setupPolluxSaveEditor,
        loadText
    };
})(globalThis);
