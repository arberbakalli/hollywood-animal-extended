/**
 * Measures the distribution of Best Advertisers match scores over randomly
 * generated scripts, and prints the percentile bands that spread grades evenly
 * across it.
 *
 * The grade thresholds in script.js (ADVERTISER_GRADE_BANDS) come from this
 * script. Re-run it and update them if data/TagsAudienceWeights.json changes:
 *
 *     node tools/grade-distribution.mjs
 *
 * The sample is seeded, so the numbers are reproducible run to run.
 */
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_SIZE = 3000;
const SHAPE = ['Genre', 'Setting', 'Protagonist', 'Antagonist', 'Supporting Character', 'Theme & Event'];

async function loadApp() {
    const sandbox = {
        console,
        window: { addEventListener() {}, dispatchEvent() {} },
        document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
        CustomEvent: class CustomEvent {}, setTimeout, clearTimeout, Map, Set,
        fetch: async (p) => ({ ok: true, json: async () => JSON.parse(await readFile(join(ROOT, p), 'utf8')) }),
    };
    sandbox.globalThis = sandbox;
    const ctx = createContext(sandbox);
    runInContext(await readFile(join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
    runInContext(await readFile(join(ROOT, 'script.js'), 'utf8'), ctx, { filename: 'script.js' });
    await runInContext('loadExternalData()', ctx);
    return ctx;
}

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

function summarise(label, values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    console.log(`\n${label}  (n=${values.length})`);
    console.log(`  min ${sorted[0].toFixed(2)}   max ${sorted[sorted.length - 1].toFixed(2)}   mean ${mean.toFixed(2)}`);
    console.log('  ' + [1, 10, 25, 50, 75, 90, 95, 99].map(p => `p${p}=${percentile(sorted, p).toFixed(2)}`).join('  '));
    return sorted;
}

const ctx = await loadApp();

const byCategory = {};
for (const tag of Object.values(runInContext('GAME_DATA.tags', ctx))) {
    (byCategory[tag.category] ||= []).push(tag.id);
}

let seed = 42;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = (arr) => arr[Math.floor(random() * arr.length)];

const everyScore = [];
const topScores = [];
const gradeCounts = {};

for (let i = 0; i < SAMPLE_SIZE; i++) {
    ctx.__ids = SHAPE.map(category => pick(byCategory[category]));
    ctx.__lean = Math.floor(random() * 3);
    const result = runInContext(
        'getRecommendations({ tags: __ids.map(id => GAME_DATA.tags[id]), movieLean: __lean })', ctx);

    for (const entry of result.allScores) everyScore.push(entry.score);
    topScores.push(result.topRecommendation.score);
    const { grade } = result.topRecommendation;
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
}

summarise('Every agency score', everyScore);
const sortedTop = summarise('Top-pick score (what the player actually sees)', topScores);

console.log('\nGrade shown on the best option, with the bands currently in script.js:');
for (const [, grade] of runInContext('ADVERTISER_GRADE_BANDS', ctx)) {
    const count = gradeCounts[grade] || 0;
    const share = 100 * count / topScores.length;
    console.log(`  ${grade.padEnd(2)} ${String(count).padStart(5)}  ${share.toFixed(1).padStart(5)}%  ${'#'.repeat(Math.round(share * 0.6))}`);
}

console.log('\nPercentile bands for the current data (paste into ADVERTISER_GRADE_BANDS):');
const targets = [['A+', 99], ['A', 90], ['B+', 75], ['B', 55], ['C+', 35], ['C', 20], ['D', 5]];
for (const [grade, p] of targets) {
    console.log(`  ${grade.padEnd(2)} >= ${percentile(sortedTop, p).toFixed(2)}`);
}
console.log('  F  below');
