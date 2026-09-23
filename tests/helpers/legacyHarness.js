import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
    'src/selectors/genreMix.js',
    'src/selectors/selectorExclusions.js',
    'src/selectors/storyElementSelector.js',
    'src/generator/availabilityFilter.js',
    'src/evaluation/compatibilityEngine.js',
    'src/evaluation/movieScoreEstimator.js',
    'src/generator/scriptGenerationEngine.js',
    'src/generator/scriptGenerator.js',
    'src/library/scriptLibrary.js',
    'src/library/exclusionStore.js',
    'src/evaluation/scriptEvaluation.js',
    'src/evaluation/gravesAnalysis.js',
    'src/evaluation/gravesAudience.js',
    'src/evaluation/gravesBestMatchesEngine.js',
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

function createDocumentStub() {
    return {
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}

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
        document: createDocumentStub(),
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
        /** Restore browser-like globals after tests that replace document or app state. */
        resetBrowserState: () => {
            sandbox.document = createDocumentStub();
            sandbox.window = { addEventListener() {}, dispatchEvent() {} };
            runInContext(`if (typeof currentGenProfile !== 'undefined') currentGenProfile = 'custom';`, ctx);
        },
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

/* --------------------------------------------------------------------------
   Instrumented loader
   --------------------------------------------------------------------------
   loadLegacyScript() above reads every file with readFile and evaluates it in
   node:vm. Nothing therefore passes through Jest, so istanbul has nothing to
   instrument and `jest --coverage` reports 0% while hundreds of tests run
   through the code.

   This loader imports the src/ modules instead, which is what puts them in
   front of Jest. Three files still have to be evaluated rather than imported,
   because they rely on sloppy-mode globals that a module scope would swallow:

     - data.js           declares GAME_DATA with a top-level `const`, which is a
                         global *lexical* binding: other classic scripts see it,
                         `globalThis` never exposes it, and inside eval it does
                         not escape at all, so it is bridged out by name
     - src/app/state.js  declares 13 shared bindings with bare `var`
     - script.js         declares 118 bare globals as top-level functions

   Indirect eval runs those in global scope, so their declarations land on
   globalThis exactly as a <script> tag would put them on window. Everything
   else — the 27 IIFE modules, which assign `global.HAC*` explicitly — is
   imported and therefore counted.

   Isolation: Jest gives each test file its own module registry and global, so
   the stubs and globals here do not leak between suites.
   -------------------------------------------------------------------------- */

// Evaluated rather than imported, with any top-level const/let named so it can
// be bridged onto globalThis.
const EVALUATED_FILES = [
    { path: 'data.js', lexicalNames: ['GAME_DATA'] },
    { path: 'src/app/state.js', lexicalNames: [] },
];

function installBrowserStubs() {
    const noopElement = () => ({
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
        appendChild() {}, remove() {}, addEventListener() {},
        querySelector: () => null, querySelectorAll: () => [],
    });

    globalThis.document = {
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: noopElement,
        body: { appendChild() {}, querySelectorAll: () => [] },
        addEventListener() {},
    };
    globalThis.window = { addEventListener() {}, dispatchEvent() {} };
    globalThis.CustomEvent = class CustomEvent {};
    globalThis.localStorage = {
        getItem: () => null, setItem() {}, removeItem() {}, clear() {},
    };
    globalThis.fetch = async (path) => ({
        ok: true,
        json: async () => JSON.parse(await readFile(join(ROOT, path), 'utf8')),
    });
}

/**
 * Runs a classic script in global scope, so its declarations become globals.
 *
 * `var` and top-level `function` land on globalThis by themselves, but
 * top-level `const` and `let` do not: in a browser they create a global
 * *lexical* binding that other scripts can read yet `window` never exposes,
 * and inside indirect eval they stay in the eval's own scope and vanish.
 * data.js declares `const GAME_DATA`, so it has to be handed out by name.
 */
async function evaluateInGlobalScope(relativePath, lexicalNames = []) {
    const source = await readFile(join(ROOT, relativePath), 'utf8');
    const bridge = lexicalNames
        .map(name => `globalThis.${name} = ${name};`)
        .join('\n');

    (0, eval)(`${source}\n;${bridge}`);
}

/**
 * Same surface as loadLegacyScript(), but the src/ modules arrive by import so
 * they can be measured. Reach for this when a suite should count toward
 * coverage; the vm loader stays for suites that need a disposable global.
 */
export async function loadInstrumentedApp() {
    installBrowserStubs();

    for (const { path, lexicalNames } of EVALUATED_FILES) {
        await evaluateInGlobalScope(path, lexicalNames);
    }

    const evaluatedPaths = EVALUATED_FILES.map(file => file.path);
    const imported = CLASSIC_MODULES.filter(file => !evaluatedPaths.includes(file));
    for (const file of imported) {
        await import(pathToFileURL(join(ROOT, file)).href);
    }

    await evaluateInGlobalScope('script.js');
    await globalThis.loadExternalData();

    const resolveName = (name) =>
        name.split('.').reduce((target, part) => target?.[part], globalThis);

    return {
        evaluate: (expression) => (0, eval)(expression),
        call: (name, ...args) => resolveName(name)(...args),
        callAsync: async (name, ...args) => await resolveName(name)(...args),
        ensureCompatibilityLoaded: () => globalThis.ensureCompatibilityLoaded(),
        ensureGenrePairsLoaded: () => globalThis.ensureGenrePairsLoaded(),
        get GAME_DATA() { return globalThis.GAME_DATA; },
    };
}
