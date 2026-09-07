# Achilles Power Notes

Achilles does not replace Playwright. It sits on top of the Playwright suite and
adds QA process, evidence, history, and agent workflow discipline.

## Mental model

Playwright is the browser engine and test runner.

`@civitas-cerebrum/element-interactions` is the readable test-writing layer:
tests say `steps.on('exclusionNotice', 'ColmanGraves')` instead of hardcoding
CSS selectors everywhere.

`@civitas-cerebrum/achilles` is the QA harness around the suite: reporter,
run history, evidence helpers, mutation checks, show-me recordings, and repair
workflow tools.

## Flaky-run memory

Normal Playwright tells you what happened in the current run.

Achilles also remembers previous local runs in `.achilles/history/tests.ndjson`.
When a test fails later, the reporter can say whether this is a first-time red,
a repeated weak point, or a flaky test that has failed before and passed after a
retry.

This matters because "failed once today" and "failed 6 of the last 10 runs" are
different QA signals.

## Commands in this repo

Run the normal E2E suite with Achilles reporter and history:

```bash
npm run test:e2e
```

Open the normal HTML report:

```bash
npm run test:e2e:report
```

Run a visible, slowed-down Playwright test and record it:

```bash
npm run test:e2e:show -- --grep "TC03-000007"
```

Run Achilles self-repair against failing Playwright specs:

```bash
npm run test:repair -- tests/e2e/colman-graves.spec.js
```

Calibrate mutation checks before trusting them:

```bash
npm run test:mutate:calibrate
```

Run mutation testing:

```bash
npm run test:mutate
```

Run only the first Graves hidden-notice mutation with repeat flake control:

```bash
npm run test:mutate -- --only graves-exclusion-notice-visible --repeat 3
```

## First mutation

The first configured mutation recreates the CSS bug where
`#graves-exclusion-notice.hidden` becomes visible again.

Expected result:

```text
noop: green
graves-exclusion-notice-visible: caught by TC03-000007
```

That proves `TC03-000007` is not decoration. It fails when the hidden-notice
contract is broken.

## Current install note

This repo uses:

```json
"@civitas-cerebrum/achilles": "file:../achilles"
```

Reason: local Achilles is `0.1.8` and includes the Playwright reporter. The
latest published npm version checked here was `0.1.7`, which installed the bins
but did not include the reporter folder needed for flaky-run memory.

When `0.1.8` is published, this can switch back to the registry package.
