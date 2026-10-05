import { LAB_STORAGE_KEY, finiteNumber, releaseCurve, calibrateAttendance, campaignCoverage,
    uniqueScripts, AWARD_TARGETS, recentElementUse, validateRelease, unlockInfo } from './labModel.js';

const byId = id => document.getElementById(id);
const selectedIds = id => [...byId(id).selectedOptions].map(option => option.value);
const number = (id, label, min, max) => finiteNumber(byId(id).value, label, min, max);
const format = value => value.toLocaleString('en-US', { maximumFractionDigits: 2 });
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
let tags = [];
let rawTags = {};
let releases = [];
let wired = false;

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
    if (caption) node.append(element('caption', caption));
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

function fillTags(select, list, selected = []) {
    select.replaceChildren();
    list.forEach(tag => {
        const option = element('option', `${tag.name} (${tag.category})`);
        option.value = tag.id;
        option.selected = selected.includes(tag.id);
        select.append(option);
    });
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
        table(output, ['Week', 'Current demand', 'Factory scenario', 'Difference'], curve.map(row =>
            [row.week, format(row.baseline), format(row.scenario), format(row.scenario - row.baseline)]));
        paragraph(output, 'Factory stacking is illustrative. Attendance, revenue and capacity are not inferred from this curve.', 'lab-note');
    });
}

function renderAdvertisers() {
    render('advertisers', output => {
        const ids = selectedIds('lab-advertisers-tags');
        if (!ids.length) throw new Error('Choose at least one movie element.');
        const audiences = [...byId('lab-audiences').querySelectorAll('input:checked')].map(input => input.value);
        if (!audiences.length) throw new Error('Choose at least one desired audience.');
        const agencies = [...byId('lab-agencies').querySelectorAll('input:checked')].map(input => input.value);
        const coverage = campaignCoverage(GAME_DATA.adAgents, agencies, audiences);
        const ranked = HACAdvertiserMatcher.getRecommendations({ tags: ids.map(id => GAME_DATA.tags[id]),
            movieLean: Number(byId('lab-advertisers-lean').value) }).allScores;
        const names = values => values.map(value => GAME_DATA.demographics[value].name).join(', ') || 'None';
        paragraph(output, `${coverage.selected.length} advertisers selected. Covered audiences: ${names(coverage.covered)}.`);
        paragraph(output, `Uncovered desired audiences: ${names(coverage.missing)}.`, coverage.missing.length ? 'lab-negative' : 'lab-positive');
        paragraph(output, `Additional audiences reached: ${names(coverage.spillover)}.`);
        table(output, ['Advertiser', 'Fit / 5', 'Grade', 'Audiences', 'Campaign'], ranked.map(entry =>
            [entry.agency.name, entry.score.toFixed(1), entry.grade, names(entry.agency.targets), agencies.includes(entry.agency.id) ? 'Selected' : 'Not selected']), 'Current app fit model');
        const suggestions = ranked.filter(entry => entry.score >= HACAdvertiserMatcher.ADVERTISER_WEAK_THRESHOLD && entry.agency.targets.some(audience => audiences.includes(audience)));
        paragraph(output, `Campaign shortlist: ${suggestions.map(entry => entry.agency.name).join(', ') || 'No qualifying agencies'}.`);
        paragraph(output, 'Shortlist uses existing fit and desired audiences. Overlap does not prove extra reach; profit, campaign cost and Kinomark impact remain unconfirmed.', 'lab-note');
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
        const share = number('lab-genre-secondary-share', 'Second genre share', 5, 50);
        if (share % 5 !== 0) throw new Error('Genre shares use 5% steps.');
        const rows = tags.filter(tag => tag.category === 'Genre' && tag.id !== primary).map(tag => {
            const active = HACCompatibilityEngine.calculateGenrePairScore([
                { id: primary, category: 'Genre', percent: 1 - share / 100 },
                { id: tag.id, category: 'Genre', percent: share / 100 }
            ], GAME_DATA);
            const source = GAME_DATA.genrePairs[primary]?.[tag.id] || GAME_DATA.genrePairs[tag.id]?.[primary];
            const label = element('span', tag.name, `genre-${tag.id.toLowerCase().replaceAll('_', '-')}`);
            label.classList.add('lab-genre-name');
            return [label, source ? signed(source.primary) : 'No data', source ? signed(source.secondary) : 'No data',
                active ? `Active: ${signed(active.com)} commercial / ${signed(active.art)} artistic` : 'Inactive below 35%'];
        });
        table(output, ['Second genre', 'Commercial bonus', 'Artistic bonus', 'Current mix'], rows);
    });
}

function detectiveExample() {
    const base = ['DETECTIVE', 'THRILLER', 'MODERN_AMERICAN_CITY', 'PROTAGONIST_COP',
        'ANTAGONIST_CRIMINAL_MASTERMIND', 'SUPPORTINGCHARACTER_VILLAINS_RIGHT_HAND',
        'EVENTS_SHOOTOUT', 'THEME_SEARCH_KILLER', 'FINALE_ANTAGONIST_GETS_PUNISHED'];
    // Use only IDs in this extract; a missing optional sample element is omitted.
    const known = base.filter(id => GAME_DATA.tags[id]);
    const variation = known.map(id => id === 'EVENTS_SHOOTOUT' ? 'EVENTS_BANK_ROBBERY' : id);
    byId('lab-diversity-candidates').value = JSON.stringify([known, [...known].reverse(), variation], null, 2);
    renderDiversity();
}

function renderDiversity() {
    render('diversity', output => {
        const result = uniqueScripts(JSON.parse(byId('lab-diversity-candidates').value));
        result.scripts.forEach(script => {
            if (script.some(id => !GAME_DATA.tags[id])) throw new Error('A candidate contains an unknown element ID.');
        });
        paragraph(output, `${result.scripts.length} unique scripts. ${result.removed} shuffled duplicates removed.`);
        result.scripts.forEach((script, index) => {
            const article = element('article', undefined, 'lab-script');
            article.append(element('strong', `Script ${index + 1}`));
            const list = element('ul');
            script.forEach(id => list.append(element('li', GAME_DATA.tags[id].name)));
            article.append(list);
            output.append(article);
        });
        paragraph(output, 'All unique candidates in this batch are shown. To explore more combinations, lower your target or change locked/excluded elements. This does not prove the full search space is exhausted.', 'lab-note');
    });
}

function renderAwards() {
    render('awards', output => {
        const target = AWARD_TARGETS[byId('lab-award-target').value];
        output.append(element('h4', target.name));
        paragraph(output, `Target metric: ${target.metric}.`);
        paragraph(output, target.guidance);
    });
}

function saveReleases(next) {
    localStorage.setItem(LAB_STORAGE_KEY, JSON.stringify(next));
    releases = next;
}

function renderTracker() {
    render('tracker', output => {
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
        paragraph(output, repeated.length ? `Repeated within 500 days: ${repeated.map(([id, count]) => `${GAME_DATA.tags[id].name} (${count} films)`).join(', ')}.` : 'No repeated elements within 500 days.', repeated.length ? 'lab-negative' : 'lab-positive');
    });
}

function renderUnlocks() {
    render('unlocks', output => {
        const id = byId('lab-unlock-tag').value;
        if (!id) { paragraph(output, 'No elements match your search.'); return; }
        const info = unlockInfo(id, GAME_DATA.starterWhitelist, rawTags[id]?.parameters?.Condition);
        output.append(element('h4', GAME_DATA.tags[id].name));
        paragraph(output, info.kind === 'recipe' ? `Unlocks after using: ${info.requirements.map(value => GAME_DATA.tags[value]?.name || value).join(' + ')}.` : info.text);
        paragraph(output, `Source: ${info.kind === 'starter' ? 'data.js starting deck' : 'data/TagData.json; missing conditions stay unknown'}.`, 'lab-note');
    });
}

function setup() {
    const knownIds = new Set(tags.map(tag => tag.id));
    try {
        const saved = JSON.parse(localStorage.getItem(LAB_STORAGE_KEY) || '[]');
        if (!Array.isArray(saved)) throw new Error('Invalid release journal.');
        releases = saved.map(release => validateRelease(release, knownIds));
    } catch { byId('lab-load-status').textContent = 'Game data loaded. Saved release journal could not be read; original stored data was preserved.'; }
    fillTags(byId('lab-advertisers-tags'), tags, ['DETECTIVE', 'PROTAGONIST_COP']);
    fillTags(byId('lab-tracker-tags'), tags, ['DETECTIVE', 'PROTAGONIST_COP']);
    fillTags(byId('lab-unlock-tag'), tags);
    fillTags(byId('lab-genre-primary'), tags.filter(tag => tag.category === 'Genre'), ['DRAMA']);
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
    function activate(tab) {
        tab.focus();
        tabs.forEach(item => {
            const active = item === tab;
            item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
            byId(item.getAttribute('aria-controls')).hidden = !active;
        });
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
    [['release', renderRelease], ['advertisers', renderAdvertisers], ['calibration', renderCalibration], ['diversity', renderDiversity]].forEach(([key, action]) => {
        byId(`lab-${key}-form`).addEventListener('submit', event => { event.preventDefault(); action(); });
    });
    byId('lab-release-form').addEventListener('input', () => {
        byId('lab-release-boost').disabled = !byId('lab-release-factory').checked;
        byId('lab-release-boost-label').value = `${byId('lab-release-boost').value}%`;
        renderRelease();
    });
    byId('lab-advertisers-form').addEventListener('change', renderAdvertisers);
    byId('lab-calibration-form').addEventListener('input', renderCalibration);
    byId('lab-genre-primary').addEventListener('change', renderGenres);
    byId('lab-genre-secondary-share').addEventListener('input', renderGenres);
    byId('lab-diversity-sample').addEventListener('click', detectiveExample);
    byId('lab-diversity-candidates').addEventListener('input', () => byId('lab-diversity-result').replaceChildren());
    byId('lab-award-target').addEventListener('change', renderAwards);
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
    byId('lab-unlock-search').addEventListener('input', () => {
        const query = byId('lab-unlock-search').value.trim().toLowerCase();
        const previous = byId('lab-unlock-tag').value;
        fillTags(byId('lab-unlock-tag'), tags.filter(tag => tag.name.toLowerCase().includes(query)), [previous]);
        renderUnlocks();
    });
    byId('lab-unlock-tag').addEventListener('change', renderUnlocks);
    const observations = { 'four-ads': [49896, 53, 35500, 4], 'one-ad': [40396, 26, 34000, 1] };
    Object.entries(observations).forEach(([key, values]) => byId(`lab-calibration-${key}`).addEventListener('click', () => {
        ['screenings', 'attendance', 'prediction', 'ads'].forEach((name, index) => { byId(`lab-calibration-${name}`).value = values[index]; });
        renderCalibration();
    }));
    renderRelease(); renderAdvertisers(); renderCalibration(); renderGenres(); detectiveExample(); renderAwards(); renderTracker(); renderUnlocks();
}

async function load() {
    byId('lab-retry-load').hidden = true;
    byId('lab-load-status').textContent = 'Loading game data...';
    try {
        const files = ['data/TagData.json', 'data/GenrePairs.json', 'data/TagsAudienceWeights.json', 'localization/English.json'];
        const [data, pairs, weights, localization] = await Promise.all(files.map(async path => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Could not load ${path} (${response.status}).`);
            return response.json();
        }));
        rawTags = data;
        GAME_DATA.genrePairs = pairs;
        tags = Object.entries(data).map(([id, item]) => ({ id,
            name: localization.locStrings[localization.IdMap[id]] || id,
            category: item.type === 0 ? 'Genre' : item.type === 1 ? 'Setting' :
                ({ SupportingCharacter: 'Supporting Character', Theme: 'Theme & Event' }[item.CategoryID] || item.CategoryID),
            art: item.artValue, com: item.commercialValue, weights: weights[id] || {} }));
        GAME_DATA.tags = Object.fromEntries(tags.map(tag => [tag.id, tag]));
        byId('lab-load-status').textContent = 'Experimental features. Calibration tools do not predict profit.';
        if (!wired) { setup(); wired = true; }
        byId('lab-workspace').hidden = false;
    } catch (error) {
        byId('lab-load-status').textContent = `${error.message} Retry loading to continue.`;
        byId('lab-retry-load').hidden = false;
    }
}

byId('lab-retry-load').addEventListener('click', load);
load();
