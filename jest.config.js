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

    // No coverage target is configured. The app's only executable files are
    // script.js and data.js, both loaded through a VM harness rather than
    // imported, so istanbul cannot instrument them. Coverage becomes meaningful
    // once script.js is a module that tests import directly.
};
