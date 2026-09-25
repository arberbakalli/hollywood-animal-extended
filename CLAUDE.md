# Hollywood Animal Calculator â€” Agent Instructions

## 1. The test suite is the specification
Read `docs/QA_FRAMEWORK.md` before editing tests, scenarios, selectors, feature
rules, or deleted-feature cleanup. The framework defines three test layers (BDD,
unit, negative/edge), autonomous actions (test writing, audits, runs), and
actions requiring approval (deletions, rule changes, main pushes).

The tests in `tests/` are the source of truth for how this app behaves. They are
owned by the repository owner, not by the agent working in it.

**The direction of repair is one-way: code is changed to satisfy the tests.
Tests are never changed to accommodate the code.**

This rule exists because the app has repeatedly regressed when an agent, faced
with a red suite, edited the assertion instead of the defect. Every such edit
destroyed the only record of what the feature was supposed to do.

### When a test fails

Pick exactly one of these. There is no third option.

1. **Fix the code** so the existing assertion passes, unmodified.
2. **Stop and report.** Say which test fails, what it asserts, what the code
   does instead, and why you believe the test may be wrong. Then wait for the
   repository owner. Do not proceed to change the test while waiting.

### Test edits require explicit, per-change approval

An agent may modify, delete, skip, or weaken a test **only** when the repository
owner has approved that specific change in the current session, naming the test.

"The suite is green now" is not evidence the work is correct if the suite was
altered to get there.

### Specifically forbidden without that approval

Applies to Jest specs, Playwright specs, and `.feature` scenarios alike:

- Changing an expected value to match observed output
- Adding `.skip`, `.only`, `test.fixme`, or commenting a test out
- Loosening an assertion (`toBe` â†’ `toBeCloseTo`, exact count â†’ `toBeGreaterThan`,
  removing a field from a shape assertion)
- Widening a numeric tolerance or raising a timeout to get past a failure
- Adding a conditional guard that lets the test pass vacuously
  (`if (!thing) return;` around the assertions)
- Deleting a scenario, an `Examples:` row, or a `test.each` case
- **Deleting a spec file, a feature file, or a `describe` block**
- Rewriting a test "for clarity" in the same change that makes it pass

Raising a timeout is allowed only when the failure is a proven infrastructure
timeout, never to mask a slow or broken code path.

### Deleting tests requires a coverage-parity check

A test file may be removed only when the behaviour it covered is genuinely gone
from the product â€” not merely because it fails, and not because the feature
moved. Removing a red file is the quietest way to turn a suite green, and it
leaves no trace in the summary line.

Before deleting any spec or feature file, list every behaviour it asserted and,
for each one, name where that behaviour is still covered â€” or state plainly that
coverage is being dropped and why. Put that list in the commit message. If a
behaviour has no new home and the feature still ships, the file does not get
deleted; the tests get rewritten against current behaviour instead.

Deleting a file with failing tests in it is the case this rule exists for.
"Those tests were for the old design" is a claim that must be demonstrated
per behaviour, not asserted for the file as a whole.

This has already happened once: `tests/e2e/find-top-combinations.spec.js` was
removed while Build for Target still shipped, taking the only coverage of the
story element budget, the Script Lab exclusion wiring, result ranking and the
empty state with it.

### Adding tests is always allowed

New tests for new behaviour, and a new failing test that captures a freshly
found bug, need no approval. The bug-fix order is: write the failing test
first, then fix the code, then confirm the new test passes and no existing
test changed.

## 2. Feature files

`tests/scenarios/*.feature` describe behaviour in the owner's language and carry
a status marker per scenario:

- `[automated]` â€” a spec in `tests/e2e/` asserts this
- `[verified]` â€” confirmed against the running app, not yet automated
- `[unverified]` â€” plausible but unconfirmed; **do not automate until watched**

Never promote a scenario to `[automated]` without the spec actually existing,
and never write a spec for an `[unverified]` scenario â€” confirm the behaviour in
the app with the owner first. A guessed scenario automated into a test becomes a
false record of intent.

## 3. Running the suite

```bash
npm test          # Jest â€” needs the ESM flag, which the script sets
npm run test:e2e  # Playwright
```

Run `npm test`, never a bare `npx jest` â€” without
`NODE_OPTIONS=--experimental-vm-modules` most suites fail to parse, which looks
like real breakage and is not.

Read the `Test Suites:` line, not only `Tests:`. A suite that fails to load
reports zero failing tests while covering nothing.

Run **one** Playwright process at a time. Two concurrent runs share
`test-results/` and delete each other's trace artifacts, which surfaces as
`browserContext.close: ENOENT ... recording.trace` on tests whose assertions
all passed. That is a measurement failure, not a product failure: `rm -rf
test-results` and re-run alone before believing it.

When piping the run (`npm run test:e2e | tail`), the exit code reported is the
pipe's last command, not Playwright's. Redirect to a file and check `$?`
instead, or a failing suite reads as green.

## 4. Domain rules live in one file

**`docs/GAME_RULES.md` is the source of truth for how the game and the app
behave** â€” script shape, Genre being uncapped, the element budget and which
features spend it, scoring thresholds, distribution and the studio policies,
exclusions. Read it before answering any "should it be X or Y?" question, and
add rules there rather than here, so there is one place to correct.

If a rule is not in that file, it is not settled. Ask the owner instead of
inferring one from the code: the code has been wrong about several of them.

### Implementation traps that are not rules

- The three engine builders do **not** share an argument order:
  `buildAdditions(tags, candidates, minimum, maxPoolSize, options)` but
  `buildSwaps(tags, candidates, minimum, options)` and
  `buildPairwise(tags, candidates, minimum, options)`. An argument added in the
  wrong slot replaces `options` with a number and drops `engineOptions()`
  silently. **Read the signature before adding an argument.** The visible
  symptom is every selected element rendering as its raw id
  (`FINALE_PROTAGONIST_FINDS_TREASURE`), because `options.displayName` is gone
  and the engine falls back to `tag.name || tag.id`. That is a lookup failure
  upstream, never a string that needs reformatting â€” reformatting it corrupts
  the names that were already correct ("Damsel in Distress" -> "Damsel in
  distress").
- `hideGravesEvaluationResults` and the list that reveals panels after an
  evaluation must name the **same five panels**. Generate Best Matches unhides
  the shared results container, so a panel missing from the hide list shows a
  placeholder or the previous run's numbers, and a panel missing from the reveal
  list disappears for good once Best Matches has run.
- Reproducing an exclusion-refresh bug requires the **Starting Tags profile
  active**. From a clean ban list the scenario passes with the defect present,
  which is how it survived several rounds of fixing.

## 5. Verifying a fix

A green suite is not evidence that a bug is fixed. This suite was fully green
for the entire life of the argument-order bug above, and three tests named for
the element budget passed with that bug present.

- **Prove a new test has teeth.** Reintroduce the defect and confirm the test
  goes red. If it still passes, it is vacuous â€” rewrite or drop it. Do not keep
  it as reassurance.
- **Re-render before reading the DOM.** After editing JS or CSS, reload with a
  cache-buster *and* re-trigger the render. A reload alone leaves the previous
  results markup in place, and inspecting it reports the old build.
- **Read the evidence before citing it.** State the expected value and compare
  against it explicitly, rather than glancing at output and calling it a pass.
- Report what was not reproduced. An unreproduced bug that is described as
  fixed costs more than one that is described as open.
