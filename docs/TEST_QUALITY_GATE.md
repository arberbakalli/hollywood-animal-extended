# Test Quality Gate

Last updated: 2026-09-22

## Ground Rules

- Tests are source of truth. Do not weaken, skip, delete, or rewrite a test just
  because the current implementation fails it.
- When a test and implementation disagree, stop and ask which behavior is
  correct.
- Prefer production functions/modules over toy simulations in Jest.
- Prefer Playwright for cross-panel workflows, real focus behavior, dropdown
  behavior, and anything that depends on rendered browser state.
- Scenario markers must stay honest:
  - `[automated]` means a Jest or Playwright assertion covers the behavior.
  - `[verified]` means observed or reviewed, but not automated.
  - `[unverified]` means plausible only; do not automate without product
    confirmation.

## Test Types

- Unit tests: pure production helpers with no browser globals.
- Integration-style Jest tests: legacy VM harness tests that load real classic
  scripts and game data.
- E2E tests: Playwright user workflows through the rendered app.

The legacy VM harness is valuable, but it is not a browser. If a behavior
depends on focus, aria state, dropdown option disabling, layout, or user clicks,
cover it with Playwright.

## Required Local Checks Before Push

Run the full Jest suite:

```bash
npm test -- --runInBand
```

Run focused Playwright specs for the changed product area:

```bash
npm run test:e2e -- tests/e2e/colman-graves.spec.js
npm run test:e2e -- tests/e2e/script-lab.spec.js
npm run test:e2e -- tests/e2e/marketing-release.spec.js
```

Run whitespace validation:

```bash
git diff --check
```

Graphify output is local-only and should not be committed.

## Quality Checklist For New Or Edited Tests

- Test name states behavior and expected outcome.
- Assertion would fail for the right reason.
- Test calls production code where possible.
- Test data setup uses small builders instead of duplicating production logic.
- Repeated cases use `test.each`.
- Shared VM tests reset browser-like globals after replacing `document` or app
  state.
- BDD scenario either names the covering test id/spec or remains `[verified]` or
  `[unverified]`.

## Current Baseline

- Jest local run on 2026-09-22: 21 suites, 262 tests passed.
- Static inventory on 2026-09-22: 21 Jest files, 14 Playwright specs, 149
  Playwright test declarations.
