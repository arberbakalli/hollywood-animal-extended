# Hollywood Animal Calculator — Agent Instructions

## 1. The test suite is the specification

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
- Loosening an assertion (`toBe` → `toBeCloseTo`, exact count → `toBeGreaterThan`,
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
from the product — not merely because it fails, and not because the feature
moved. Removing a red file is the quietest way to turn a suite green, and it
leaves no trace in the summary line.

Before deleting any spec or feature file, list every behaviour it asserted and,
for each one, name where that behaviour is still covered — or state plainly that
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

- `[automated]` — a spec in `tests/e2e/` asserts this
- `[verified]` — confirmed against the running app, not yet automated
- `[unverified]` — plausible but unconfirmed; **do not automate until watched**

Never promote a scenario to `[automated]` without the spec actually existing,
and never write a spec for an `[unverified]` scenario — confirm the behaviour in
the app with the owner first. A guessed scenario automated into a test becomes a
false record of intent.

## 3. Running the suite

```bash
npm test          # Jest — needs the ESM flag, which the script sets
npm run test:e2e  # Playwright
```

Run `npm test`, never a bare `npx jest` — without
`NODE_OPTIONS=--experimental-vm-modules` most suites fail to parse, which looks
like real breakage and is not.

Read the `Test Suites:` line, not only `Tests:`. A suite that fails to load
reports zero failing tests while covering nothing.

## 4. Domain facts that have caused repeat regressions

- The story element category is **`Setting`**, singular. Filtering on `Settings`
  matches nothing and silently miscounts every script.
- Genre and Setting do not count toward the 5–10 story element budget.
- Behemoth carries two effects on two independent gates. The **+25% applies to
  every week 1–8**, including week 2, whenever the policy is on — it rides on the
  budget the toggle stands for. The **slower decay** is separate and applies to
  weeks 3+ only above commercial score 9.
  - Changed 2026-09-22. This previously read "+25% to week 1 only" and "week 2
    must never move". The owner corrected it against the game, where the Behemoth
    icon shows on every week, and the code, Jest specs, Playwright specs and
    `tests/scenarios` were all realigned. **Do not restore the week-1-only rule**
    — an older comment or test elsewhere still describing it is stale, not a spec.
- Max Element Pool defaults to **5**, and a complete script carries exactly 5
  story elements, so a finished script sits at its budget and Best Additions is
  correctly empty. That is intended: raise the pool, or swap instead. A test that
  wants additions from a complete script must raise the pool first.
- Swap Suggestions covers **every selected element**, not just the weakest. A
  slot may only be replaced by a candidate of its own category.
