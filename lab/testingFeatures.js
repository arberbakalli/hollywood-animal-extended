import { LAB_STORAGE_KEY, finiteNumber, releaseCurve, calibrateAttendance, campaignCoverage,
    rankGenreElements, AWARD_TARGETS, recentElementUse, validateRelease, unlockInfo } from './labModel.js';

const byId = id => document.getElementById(id);
const selectedIds = id => [...byId(id).selectedOptions].map(option => option.value);
const number = (id, label, min, max) => finiteNumber(byId(id).value, label, min, max);
const format = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
let tags = [];
let rawTags = {};
let unlockTags = {};
let releases = [];
let journalWritable = true;
let wired = false;
let compatibilityRequest;
let compatibilityLoaded = false;

function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
}

function paragraph(parent, text, className) { parent.append(element('p', text, className)); }

function table(parent, headers, rows, caption) {
    const wrapper = element('div', undefined, 'lab-table-wrap');
    const node = element('table', undefined, 'lab-table');
    if (caption) {
        node.setAttribute('aria-label', caption);
        paragraph(parent, caption, 'lab-note');
    }
    const head = element('thead');
    const header = element('tr');
    headers.forEach(text => { const th = element('th', text); th.scope = 'col'; header.append(th); });
    head.append(header);
    const body = element('tbody');
    rows.forEach(row => {
        const tr = element('tr');
        row.forEach(value => {
            const cell = element('td');
            if (value instanceof Node) cell.append(value); else cell.textContent = value;
            tr.append(cell);
        });
        body.append(tr);
    });
    node.append(head, body);
    wrapper.append(node);
    parent.append(wrapper);
}

function render(key, callback) {
    const output = byId(`lab-${key}-result`);
    output.replaceChildren();
    try { callback(output); } catch (error) { paragraph(output, error.message, 'lab-error'); }
}

function fillTags(select, list, selected = [], grouped = false) {
    select.replaceChildren();
    const appendOption = (parent, tag) => {
        const option = element('option', select.multiple ? tag.name : `${tag.name} (${tag.category})`);
        option.value = tag.id;
        option.selected = selected.includes(tag.id);
        parent.append(option);
    };
    if (select.multiple || grouped) {
        GAME_DATA.categories.forEach(category => {
            const members = list.filter(tag => tag.category === category);
            if (!members.length) return;
            const group = element('optgroup');
            group.label = category;
            members.forEach(tag => appendOption(group, tag));
            select.append(group);
        });
    } else list.forEach(tag => appendOption(select, tag));
}

function readStoredExcludedIds() {
    try {
        const stored = JSON.parse(localStorage.getItem('hac.excludedTags.v1') || '[]');
        return new Set(Array.isArray(stored) ? stored.map(entry => entry?.id).filter(Boolean) : []);
    } catch {
        return new Set();
    }
}

function namesFromIds(ids) {
    return ids.map(id => GAME_DATA.tags[id]?.name || id).join(', ') || 'None';
}

function renderRelease() {
    render('release', output => {
        const curve = releaseCurve(HACDistributionPlanner.weeklyDemandFor,
            number('lab-release-commercial', 'Commercial rating', 0, 10), {
                artisticScore: number('lab-release-artistic', 'Artistic rating', 0, 10),
                behemoth: byId('lab-release-behemoth').checked,
                boutique: byId('lab-release-boutique').checked,
                openingMultiplier: byId('lab-release-opening').checked ? 2 : 1
            }, byId('lab-release-factory').checked ? byId('lab-release-boost').value : 0);
        table(output, ['Week', 'Demand'], curve.map(row => [row.week, format(row.scenario)]));
        paragraph(output, 'This is demand only. The current calculator may still under-model slow later-week falloff when Behemoth, Boutique and strong audience targeting all line up.', 'lab-note');
        paragraph(output, 'Factory boost is an adjustable lab estimate for week one, not a confirmed game formula.', 'lab-note');
    });
}

function renderAdvertisers() {
    render('advertisers', output => {
        const audiences = [...byId('lab-audiences').querySelectorAll('input:checked')].map(input => input.value);
        if (!audiences.length) throw new Error('Choose at least one desired audience.');
        const agencies = [...byId('lab-agencies').querySelectorAll('input:checked')].map(input => input.value);
        const coverage = campaignCoverage(GAME_DATA.adAgents, agencies, audiences);
        const names = values => values.map(value => GAME_DATA.demographics[value].name).join(', ') || 'None';
        const lean = byId('lab-advertisers-lean').selectedOptions[0].textContent;
        paragraph(output, `Movie lean: ${lean}. This planning choice does not change campaign coverage.`);
        paragraph(output, `${coverage.selected.length} ${coverage.selected.length === 1 ? 'advertiser' : 'advertisers'} selected. Covered audiences: ${names(coverage.covered)}.`);
        paragraph(output, `Uncovered desired audiences: ${names(coverage.missing)}.`, coverage.missing.length ? 'lab-negative' : 'lab-positive');
        paragraph(output, `Additional audiences reached: ${names(coverage.spillover)}.`);
        paragraph(output, 'Audience overlap does not prove extra reach; profit, campaign cost and Kinomark impact remain unconfirmed.', 'lab-note');
    });
}

function renderCalibration() {
    render('calibration', output => {
        const observation = calibrateAttendance(number('lab-calibration-screenings', 'Screenings', 1),
            number('lab-calibration-attendance', 'Attendance', 0, 100), number('lab-calibration-prediction', 'Predicted demand', 0));
        const count = number('lab-calibration-ads', 'Advertiser count', 1, 8);
        paragraph(output, `Occupied screening equivalents: ${format(observation.occupiedEquivalent)}.`);
        paragraph(output, `Prediction minus observation: ${format(observation.gap)} screening equivalents.`);
        paragraph(output, observation.ratio === null ? 'Prediction ratio: unavailable at 0% attendance.' : `Prediction / observation: ${observation.ratio.toFixed(2)}x.`);
        paragraph(output, `Advertisers used: ${count}. A single observation cannot isolate the advertiser effect.`, 'lab-note');
    });
}

function renderGenres() {
    render('genres', output => {
        const primary = byId('lab-genre-primary').value;
        const excludedIds = readStoredExcludedIds();
        const share = number('lab-genre-secondary-share', 'Second genre share', 5, 50);
        if (share % 5 !== 0) throw new Error('Genre shares use 5% steps.');
        const pairs = tags.filter(tag => tag.category === 'Genre' && tag.id !== primary).map(tag => {
            const active = HACCompatibilityEngine.calculateGenrePairScore([
                { id: primary, category: 'Genre', percent: 1 - share / 100 },
                { id: tag.id, category: 'Genre', percent: share / 100 }
            ], GAME_DATA);
            const source = GAME_DATA.genrePairs[primary]?.[tag.id] || GAME_DATA.genrePairs[tag.id]?.[primary];
            return { tag, active, source };
        });
        const best = key => {
            const available = pairs.filter(pair => pair.source && !excludedIds.has(pair.tag.id))
                .sort((a, b) => b.source[key] - a.source[key] || a.tag.name.localeCompare(b.tag.name));
            return available.filter(pair => pair.source[key] === available[0].source[key]);
        };
        const summary = element('div', undefined, 'lab-card-grid');
        [['Best commercial pair', best('primary'), 'primary', 'lab-commercial'],
            ['Best artistic pair', best('secondary'), 'secondary', 'lab-artistic']].forEach(([title, winners, key, className]) => {
            const card = element('article', undefined, 'lab-mini-card');
            card.append(element('h4', title));
            winners.forEach(pair => paragraph(card, `${GAME_DATA.tags[primary].name} + ${pair.tag.name}`, 'lab-best-pair'));
            const pair = winners[0];
            if (!pair) card.append(element('strong', 'No available pair'));
            paragraph(card, pair ? `${signed(pair.source[key])} ${key === 'primary' ? 'commercial' : 'artistic'} bonus at 35%+ second genre share.` : 'Check your exclusions or choose another genre.', className);
            summary.append(card);
        });
        output.append(summary);
        const rows = pairs.map(({ tag, active, source }) => {
            const label = element('span', `${tag.name}${excludedIds.has(tag.id) ? ' (excluded)' : ''}`, `genre-${tag.id.toLowerCase().replaceAll('_', '-')}`);
            label.classList.add('lab-genre-name');
            return [label, source ? signed(source.primary) : 'No data', source ? signed(source.secondary) : 'No data',
                active ? `Active: ${signed(active.com)} commercial / ${signed(active.art)} artistic` : 'Inactive below 35%'];
        });
        table(output, ['Second genre', 'Commercial bonus', 'Artistic bonus', 'Current mix'], rows);
        if (excludedIds.has(primary)) paragraph(output, 'This primary genre is excluded in Script Lab. The table is a reference for its pair data.', 'lab-note');
    });
}

async function ensureCompatibility() {
    if (compatibilityLoaded) return;
    if (!compatibilityRequest) {
        compatibilityRequest = fetch('data/TagCompatibilityData.json').then(response => {
            if (!response.ok) throw new Error(`Could not load pair data (${response.status}).`);
            return response.json();
        }).then(data => { GAME_DATA.compatibility = data; compatibilityLoaded = true; })
            .finally(() => { compatibilityRequest = null; });
    }
    await compatibilityRequest;
}

async function renderGenreElements() {
    const output = byId('lab-genre-elements-result');
    output.textContent = 'Loading pair data...';
    try {
        await ensureCompatibility();
        render('genre-elements', node => {
            const result = rankGenreElements(tags, byId('lab-genre-primary').value,
                (genre, tag) => HACCompatibilityEngine.getRawCompatibilityScore(genre, tag, GAME_DATA),
                readStoredExcludedIds(), byId('lab-genre-element-category').value,
                byId('lab-genre-element-rank').value, byId('lab-genre-element-search').value);
            const summary = element('div', undefined, 'lab-pair-summary');
            [['Successful', result.successful, 'lab-positive'],
                ['Unsuccessful', result.unsuccessful, 'lab-negative'],
                ['Available elements', result.rows.length, '']].forEach(([label, count, tone]) => {
                const item = element('div', undefined, 'lab-pair-stat');
                item.append(element('span', label), element('strong', String(count), tone));
                summary.append(item);
            });
            node.append(summary);
            if (!result.rows.length) {
                paragraph(node, 'No available elements in this category. Check your exclusions or choose another category.', 'lab-note');
                return;
            }
            const crossGenre = byId('lab-genre-element-rank').value === 'cross';
            table(node, ['Element', 'Category', 'Fit / 5', crossGenre ? 'Strong genres' : 'Strong pairs', 'Unsuccessful'],
                result.rows.slice(0, 15).map(row => [row.tag.name, row.tag.category,
                    element('span', row.score.toFixed(1), row.score >= 4 ? 'lab-positive' : row.score < 2 ? 'lab-negative' : ''),
                    crossGenre ? row.strongAcrossGenres : row.strongPairs,
                    crossGenre ? row.unsuccessfulAcrossGenres : row.unsuccessfulPairs]),
                crossGenre ? `Direct matches across ${result.genreCount} genres`
                    : `Pair counts against ${result.genrePoolSize} available story elements that fit ${GAME_DATA.tags[byId('lab-genre-primary').value].name} successfully`);
            paragraph(node, 'Successful pairs score 4 or 5; unsuccessful pairs score below 2. These are direct pair scores from the game data, not whole-script results.', 'lab-note');
            if (result.rows.length > 15) paragraph(node, `Showing 15 of ${result.rows.length} available elements. Narrow by category to see others.`, 'lab-note');
        });
    } catch (error) {
        render('genre-elements', node => {
            paragraph(node, error.message, 'lab-error');
            const retry = element('button', 'Retry Pair Data', 'analyze-btn secondary-btn');
            retry.id = 'lab-genre-pair-retry';
            retry.type = 'button';
            retry.addEventListener('click', renderGenreElements);
            node.append(retry);
        });
    }
}

function renderAwards() {
    render('awards', output => {
        const cards = element('div', undefined, 'lab-card-grid');
        Object.values(AWARD_TARGETS).forEach(target => {
            const card = element('article', undefined, 'lab-mini-card');
            card.append(element('h4', target.name));
            paragraph(card, `Metric: ${target.metric}.`);
            paragraph(card, target.guidance, 'lab-note');
            cards.append(card);
        });
        output.append(cards);
        const title = byId('lab-award-film').value.trim();
        const year = byId('lab-award-year').value;
        const remembered = selectedIds('lab-award-elements');
        const tracked = [...byId('lab-award-targets').querySelectorAll('input:checked')].map(input => AWARD_TARGETS[input.value].name);
        if (title || remembered.length || tracked.length) finiteNumber(year, 'Target year', 1900, 2100);
        if (year && !/^\d{4}$/.test(year)) throw new Error('Target year needs four digits.');
        paragraph(output, title || remembered.length || tracked.length
            ? `Plan memo: ${title || 'Untitled movie'} for ${year}; targets: ${tracked.join(', ') || 'undecided'}; elements: ${namesFromIds(remembered)}.`
            : 'Add a movie idea if you want this panel to act like a planning note.');
    });
}

function saveReleases(next) {
    if (!journalWritable) throw new Error('Saved release journal cannot be read; cannot save until it is repaired. Original stored data was preserved.');
    try { localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(next)); }
    catch { throw new Error('Could not save the release journal. Existing data was left unchanged.'); }
    releases = next;
}

function renderTracker() {
    render('tracker', output => {
        if (!journalWritable) {
            paragraph(output, 'Saved release journal could not be read. New releases cannot be saved; original stored data was preserved.', 'lab-error');
            return;
        }
        const use = recentElementUse(releases, byId('lab-tracker-reference').value);
        if (!releases.length) { paragraph(output, 'No releases recorded.'); return; }
        table(output, ['Film', 'Release date', 'Elements', 'Action'], releases.map((release, index) => {
            const button = element('button', 'Remove', 'analyze-btn secondary-btn');
            button.type = 'button';
            button.setAttribute('aria-label', `Remove ${release.title}`);
            button.addEventListener('click', () => {
                render('tracker', () => { saveReleases(releases.filter((_, i) => i !== index)); renderTracker(); });
            });
            return [release.title, release.date, release.tags.map(id => GAME_DATA.tags[id].name).join(', '), button];
        }));
        const repeated = [...use].filter(([, count]) => count > 1);
        paragraph(output, repeated.length ? `Possible repeat within 500 days: ${repeated.map(([id, count]) => `${GAME_DATA.tags[id].name} (${count} films)`).join(', ')}.` : 'No repeats detected in this rough window.', repeated.length ? 'lab-note' : 'lab-positive');
        paragraph(output, 'Freshness pip timing still needs game evidence; this tracker should not decide Fresh/Stale/Rotten colors yet.', 'lab-note');
    });
}

function refreshUnlockOptions() {
    const category = byId('lab-unlock-category').value;
    const query = byId('lab-unlock-search').value.trim().toLowerCase();
    const previous = byId('lab-unlock-tag').value;
    fillTags(byId('lab-unlock-tag'), tags.filter(tag =>
        (!category || tag.category === category) && tag.name.toLowerCase().includes(query)), [previous], true);
}

function renderUnlocks() {
    render('unlocks', output => {
        const id = byId('lab-unlock-tag').value;
        if (!id) { paragraph(output, 'No elements match your search.'); return; }
        const condition = unlockTags[id]?.parameters?.Condition || rawTags[id]?.parameters?.Condition;
        const info = unlockInfo(id, GAME_DATA.starterWhitelist, condition, unlockTags[id]?.recipe);
        output.append(element('h4', GAME_DATA.tags[id].name));
        paragraph(output, info.text);
        if (info.requirements) {
            paragraph(output, `Uses: ${info.requirements.map(value => GAME_DATA.tags[value]?.name || value).join(' + ')}.`);
        }
    });
}

function setup() {
    const knownIds = new Set(tags.map(tag => tag.id));
    try {
        const saved = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || '[]');
        if (!Array.isArray(saved)) throw new Error('Invalid release journal.');
        releases = saved.map(release => validateRelease(release, knownIds));
    } catch {
        journalWritable = false;
        byId('lab-load-status').textContent = 'Game data loaded. Saved release journal could not be read; original stored data was preserved. New releases cannot be saved.';
    }
    fillTags(byId('lab-award-elements'), tags, ['DETECTIVE', 'PROTAGONIST_COP']);
    fillTags(byId('lab-tracker-tags'), tags, ['DETECTIVE', 'PROTAGONIST_COP']);
    fillTags(byId('lab-unlock-tag'), tags, [], true);
    fillTags(byId('lab-genre-primary'), tags.filter(tag => tag.category === 'Genre'), ['DRAMA']);
    const pairCategory = byId('lab-genre-element-category');
    const allStoryCategories = element('option', 'All story categories');
    allStoryCategories.value = '';
    pairCategory.append(allStoryCategories);
    for (const category of GAME_DATA.categories.filter(category => category !== 'Genre' && category !== 'Setting')) {
        const option = element('option', category);
        option.value = category;
        pairCategory.append(option);
    }
    const unlockCategory = byId('lab-unlock-category');
    const allCategories = element('option', 'All categories');
    allCategories.value = '';
    unlockCategory.append(allCategories);
    GAME_DATA.categories.forEach(category => {
        const option = element('option', category);
        option.value = category;
        unlockCategory.append(option);
    });
    Object.entries(AWARD_TARGETS).forEach(([id, target]) => {
        const label = element('label');
        const input = element('input');
        input.type = 'checkbox'; input.value = id; input.id = `lab-award-target-${id}`;
        label.append(input, document.createTextNode(target.name));
        byId('lab-award-targets').append(label);
    });
    Object.entries(GAME_DATA.demographics).forEach(([id, audience]) => {
        const label = element('label');
        const input = element('input');
        input.type = 'checkbox'; input.value = id; input.id = `lab-audience-${id}`;
        input.checked = ['YM', 'AM'].includes(id);
        label.append(input, document.createTextNode(audience.name));
        byId('lab-audiences').append(label);
    });
    GAME_DATA.adAgents.forEach((agency, index) => {
        const label = element('label');
        const input = element('input');
        input.type = 'checkbox'; input.value = agency.id; input.id = `lab-agency-${agency.id}`; input.checked = index === 0;
        label.append(input, document.createTextNode(agency.name));
        byId('lab-agencies').append(label);
    });
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const mobileLayout = window.matchMedia('(max-width: 760px)');
    const updateOrientation = () => document.querySelector('.lab-nav')
        .setAttribute('aria-orientation', mobileLayout.matches ? 'horizontal' : 'vertical');
    mobileLayout.addEventListener('change', updateOrientation);
    updateOrientation();
    function activate(tab) {
        tab.focus();
        tabs.forEach(item => {
            const active = item === tab;
            item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
            byId(item.getAttribute('aria-controls')).hidden = !active;
        });
        if (tab.id === 'lab-tab-genres') renderGenreElements();
    }
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activate(tab));
        tab.addEventListener('keydown', event => {
            const movement = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
            if (movement || ['Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + movement + tabs.length) % tabs.length;
                activate(tabs[next]);
            }
        });
    });
    [['release', renderRelease], ['advertisers', renderAdvertisers], ['calibration', renderCalibration]].forEach(([key, action]) => {
        byId(`lab-${key}-form`).addEventListener('submit', event => { event.preventDefault(); action(); });
    });
    byId('lab-release-form').addEventListener('input', () => {
        byId('lab-release-boost').disabled = !byId('lab-release-factory').checked;
        byId('lab-release-boost-label').value = `${byId('lab-release-boost').value}%`;
        renderRelease();
    });
    byId('lab-advertisers-form').addEventListener('change', renderAdvertisers);
    byId('lab-calibration-form').addEventListener('input', renderCalibration);
    byId('lab-genre-primary').addEventListener('change', () => { renderGenres(); renderGenreElements(); });
    byId('lab-genre-secondary-share').addEventListener('input', renderGenres);
    byId('lab-genre-element-category').addEventListener('change', renderGenreElements);
    byId('lab-genre-element-rank').addEventListener('change', renderGenreElements);
    byId('lab-genre-element-search').addEventListener('input', renderGenreElements);
    window.addEventListener('storage', event => {
        if (event.key === 'hac.excludedTags.v1') { renderGenres(); renderGenreElements(); }
    });
    byId('lab-awards-form').addEventListener('input', renderAwards);
    byId('lab-awards-form').addEventListener('change', renderAwards);
    byId('lab-award-targets').addEventListener('change', renderAwards);
    byId('lab-tracker-reference').addEventListener('input', renderTracker);
    byId('lab-tracker-form').addEventListener('submit', event => {
        event.preventDefault();
        render('tracker', () => {
            const release = validateRelease({ title: byId('lab-tracker-title').value, date: byId('lab-tracker-date').value,
                tags: selectedIds('lab-tracker-tags') }, knownIds);
            saveReleases([...releases, release]);
            byId('lab-tracker-title').value = '';
            renderTracker();
        });
    });
    const updateUnlocks = () => {
        refreshUnlockOptions();
        renderUnlocks();
    };
    byId('lab-unlock-category').addEventListener('change', updateUnlocks);
    byId('lab-unlock-search').addEventListener('input', updateUnlocks);
    byId('lab-unlock-tag').addEventListener('change', renderUnlocks);
    const observations = { 'four-ads': [49896, 53, 35500, 4], 'one-ad': [40396, 26, 34000, 1] };
    Object.entries(observations).forEach(([key, values]) => byId(`lab-calibration-${key}`).addEventListener('click', () => {
        ['screenings', 'attendance', 'prediction', 'ads'].forEach((name, index) => { byId(`lab-calibration-${name}`).value = values[index]; });
        renderCalibration();
    }));
    renderRelease(); renderAdvertisers(); renderCalibration(); renderGenres(); renderAwards(); renderTracker(); renderUnlocks();
}

async function load() {
    byId('lab-retry-load').hidden = true;
    byId('lab-load-status').textContent = 'Loading game data...';
    try {
        const files = ['data/TagData.json', 'data/GenrePairs.json', 'data/TagsAudienceWeights.json',
            'localization/English.json', 'extractedFilesFromGameSourceOfTruth/TagData.json'];
        const [data, pairs, weights, localization, recoveredTags] = await Promise.all(files.map(async path => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
            return response.json();
        }));
        rawTags = data;
        unlockTags = recoveredTags;
        GAME_DATA.genrePairs = pairs;
        tags = Object.entries(data).map(([id, item]) => ({ id,
            name: localization.locStrings[localization.IdMap[id]] || id,
            category: item.type === 0 ? 'Genre' : item.type === 1 ? 'Setting' :
                ({ SupportingCharacter: 'Supporting Character', Theme: 'Theme & Event' }[item.CategoryID] || item.CategoryID),
            art: item.artValue, com: item.commercialValue, weights: weights[id] || {} }));
        GAME_DATA.tags = Object.fromEntries(tags.map(tag => [tag.id, tag]));
        byId('lab-load-status').textContent = 'Experimental features. Calibration tools do not predict profit.';
        if (!wired) { wired = true; setup(); }
        byId('lab-workspace').hidden = false;
    } catch (error) {
        byId('lab-load-status').textContent = `${error.message} Retry loading to continue.`;
        byId('lab-retry-load').hidden = false;
    }
}

byId('lab-retry-load').addEventListener('click', load);
load();
