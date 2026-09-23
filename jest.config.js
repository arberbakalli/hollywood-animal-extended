/**
 * Jest configuration.
 *
 * The suite is native ESM (package.json sets "type": "module"), which Jest
 * still gates behind a Node flag. `npm test` supplies it via cross-env; running
 * bare `npx jest` will fail with "Cannot use import statement outside a module"
 * unless NODE_OPTIONS=--experimental-vm-modules is set in the environment.
 * Use `npm test`, and point IDE test runners at that script rather than at the
 * jest binary.
 */
export default {
    testEnvironment: 'node',

    // Source is plain ESM; nothing to compile.
    transform: {},

    testMatch: ['**/tests/**/*.test.js'],

    // Helpers and fixtures live under tests/ but are not themselves suites.
    testPathIgnorePatterns: ['/node_modules/', '/tests/helpers/'],

    // Coverage is measurable as of 2026-09-23. It reported 0% for a long time,
    // which read as "cannot be instrumented" but was really "never reached
    // Jest": the old harness read every file with readFile and evaluated it in
    // node:vm. Suites now load through loadInstrumentedApp, which imports the
    // src/ modules instead, and the first honest baseline is ~32% statements.
    //
    // Only src/ is collected. data.js, script.js and src/app/state.js are still
    // evaluated rather than imported, because they declare globals a module
    // scope would swallow, so they cannot be instrumented and would report a
    // misleading 0%.
    collectCoverageFrom: ['src/**/*.js'],
};
