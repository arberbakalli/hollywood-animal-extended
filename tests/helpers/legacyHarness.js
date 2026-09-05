import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLASSIC_MODULES = [
    'src/app/state.js',
    'src/app/domIds.js',
    'src/ui/feedback.js',
    'src/ui/scoreFormatting.js',
    'src/data/localization.js',
    'src/data/dataLoaders.js',
    'src/selectors/searchIndex.js',
    'src/selectors/storyElementSelector.js',
    'src/generator/availabilityFilter.js',
    'src/evaluation/compatibilityEngine.js',
    'src/evaluation/movieScoreEstimator.js',
    'src/generator/scriptGenerator.js',
    'src/library/scriptLibrary.js',
    'src/evaluation/scriptEvaluation.js',
    'src/evaluation/gravesAudience.js',
    'src/evaluation/gravesBestMatches.js',
    'src/marketing/advertiserMatcher.js',
    'src/marketing/distributionPlanner.js',
    'src/marketing/marketingPlanner.js',
    'src/marketing/targetedAds.js',
    'src/ui/collapsibleSections.js',
    'src/app/appShell.js',
];

const SCORING_MODULES = [
    'src/evaluation/compatibilityEngine.js',
    'src/evaluation/movieScoreEstimator.js',
];

/**
 * Loads data.js and script.js into a VM context so their functions can be
 * characterised by tests.
 *
 * script.js is a classic script (index.html loads it without type="module"),
 * so it cannot be imported. It can, however, be evaluated in a context that
 * provides the small browser surface it touches at load time: script.js only
 * registers a `load` listener and declares functions, so nothing else runs.
 *
 * GAME_DATA is populated by calling the real loadExternalData() against a
 * fetch stub that reads the on-disk JSON, rather than by reimplementing its
 * normalisation. The fixture is therefore exactly what the browser builds.
 *
 * When script.js becomes type="module", these tests should import it directly
 * and this harness can be deleted.
 */
export async function loadLegacyScript() {
    const sandbox = {
        console,
        window: { addEventListener() {}, dispatchEvent() {} },
        document: {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
        },
        CustomEvent: class CustomEvent {},
        setTimeout,
        clearTimeout,
        Map,
        Set,
        fetch: async (path) => {
            const body = JSON.parse(await readFile(join(ROOT, path), 'utf8'));
            return { ok: true, json: async () => body };
        },
    };
    sandbox.globalThis = sandbox;

    const ctx = createContext(sandbox);
    runInContext(await readFile(join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
    for (const file of CLASSIC_MODULES) {
        runInContext(await readFile(join(ROOT, file), 'utf8'), ctx, { filename: file });
    }
    runInContext(await readFile(join(ROOT, 'script.js'), 'utf8'), ctx, { filename: 'script.js' });

    // Real loader, real JSON, real normalisation.
    await runInContext('loadExternalData()', ctx);

    return {
        /** Evaluate an expression inside the context (reaches script-scope const/let). */
        evaluate: (expr) => runInContext(expr, ctx),
        /** Call a top-level function by name with structured-cloneable args. */
        call: (fnName, ...args) => {
            ctx.__args = args;
            return runInContext(`${fnName}(...__args)`, ctx);
        },
        /** Call an async function and await its result. */
        callAsync: async (fnName, ...args) => {
            ctx.__args = args;
            return await runInContext(`${fnName}(...__args)`, ctx);
        },
        /** Ensure deferred data is loaded. */
        ensureCompatibilityLoaded: () => runInContext('ensureCompatibilityLoaded()', ctx),
        ensureGenrePairsLoaded: () => runInContext('ensureGenrePairsLoaded()', ctx),
        get GAME_DATA() {
            return runInContext('GAME_DATA', ctx);
        },
    };
}

/**
 * Loads extracted classic namespace modules without the legacy app shell.
 * This lets refactor tests prove module behavior directly.
 */
export async function loadScoringModules() {
    const sandbox = { console };
    sandbox.globalThis = sandbox;
    const ctx = createContext(sandbox);

    for (const file of SCORING_MODULES) {
        runInContext(await readFile(join(ROOT, file), 'utf8'), ctx, { filename: file });
    }

    return {
        compatibility: runInContext('HACCompatibilityEngine', ctx),
        movieScores: runInContext('HACMovieScoreEstimator', ctx),
    };
}

/**
 * Loads data.js alone and returns its GAME_DATA. Cheaper than loadLegacyScript()
 * when a test only needs the declared constants, and it makes cross-file drift
 * checks against src/core/GameConstants.js real rather than tautological.
 */
export async function loadGameData() {
    const sandbox = { console };
    sandbox.globalThis = sandbox;
    const ctx = createContext(sandbox);
    runInContext(await readFile(join(ROOT, 'data.js'), 'utf8'), ctx, { filename: 'data.js' });
    return runInContext('GAME_DATA', ctx);
}

/**
 * Reads the `value` attribute of an input in index.html by id, as a number.
 * Lets drift tests compare constants against what the user actually sees
 * instead of against a literal retyped into the test.
 */
export async function readInputDefault(inputId) {
    const html = await readFile(join(ROOT, 'index.html'), 'utf8');
    const tag = html.match(new RegExp(`<input[^>]*id="${inputId}"[^>]*>`));
    if (!tag) throw new Error(`No <input id="${inputId}"> found in index.html`);
    const value = tag[0].match(/value="([^"]*)"/);
    if (!value) throw new Error(`<input id="${inputId}"> has no value attribute`);
    return Number(value[1]);
}

/** Round floats so snapshots don't churn on last-bit platform differences. */
export const round = (n, places = 6) =>
    typeof n === 'number' && Number.isFinite(n)
        ? Number(n.toFixed(places))
        : n;
