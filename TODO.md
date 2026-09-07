# Open items

Written 2026-09-07, at the end of the session that added the Playwright suite.
Everything below is either an unacted finding or a decision waiting on a human.

Suite state at the time of writing: **62 Playwright, 80 Jest, green.**
Last commit: `02c197b`.

---

## 1. ~~Move the test static server off Python~~ — DONE

Replaced by `tools/static-server.mjs`, a zero-dependency Node server. Python is
no longer required to run the suite.

Measured, two runs each:

| server | workers | run 1 | run 2 | result |
|---|---|---|---|---|
| `python -m http.server` | 1 | 114s | 108s | one flake |
| Node | 1 | 103s | 103s | green |
| Node | 4 | 58s | 58s | green |
| Node | 8 | 55s | 55s | green |

Parallelism was the real gain, not raw throughput — Python forced `workers: 1`.
Settled on 4, since 8 buys almost nothing and the suite is CPU-bound from there.

The server also sends `cache-control: no-store` and refuses dotfile paths, so it
will not serve `.git/` or a stray `.env` the way `python -m http.server` did.

---

## 1b. ~~`@civitas-cerebrum/achilles` makes the repo uninstallable~~ — MOSTLY FIXED

The original diagnosis was wrong, and the correction matters more than the
finding did.

**Claimed:** a missing `../achilles` makes `npm install` fail outright.
**Actually:** npm symlinks a `file:` path without checking that it exists. The
install reports success and leaves a dangling symlink behind; the failure
surfaces later, when something resolves through it. Verified both ways — a
missing `file:` target installs green as a `devDependency` *and* as an
`optionalDependency`, exit 0 in both cases.

That is worse than an install failure, not better. A fresh clone would go green
on install and then crash on `npx playwright test` with a module-not-found
raised from the config file, which reads as a broken test suite rather than as a
missing checkout.

**Fixed** by treating the reporter as optional. `playwright.config.js` resolves
`@civitas-cerebrum/achilles/reporter` inside a try/catch and drops it from the
reporter list when it is absent, so the suite runs anywhere. The dependency moved
to `optionalDependencies` to state the same intent in `package.json`. Both
branches were exercised before committing.

**Still true, and accepted:** the achilles-only scripts (`test:e2e:show`,
`test:repair`, `test:mutate`) need the sibling checkout and fail without it.
That is the right trade for optional tooling — they fail on their own with a
clear error instead of taking the whole suite down.

**Upstream note, unchanged:** npm has `0.1.7`; the local copy is an unreleased
`0.1.8`, and `reporter/` landed after the `0.1.7` tag, so pinning `^0.1.7` would
still break the reporter. When upstream tags `0.1.8` the fix is one line. There
is no longer any urgency, because nothing breaks while we wait.

---

## 2. Decide whether a missing data load should degrade or fail

`data.js` ships `tags: {}`. There is no offline fallback, despite a comment in
`dataLoaders.js` that used to claim "relying on data.js default".

As of `02c197b` a failed load fails **visibly** — banner, retry, `hollywood:failed`
instead of `hollywood:ready`. That is the right default. Still open: do you want a
real bundled fallback dataset so the app degrades instead of stopping? That is a
product call, not a bug.

---

## 3. ~~`src/app/domIds.js` is dead~~ — WRONG, it is load-bearing

Retracted. `script.js:11` is not a second copy of `toDomId`, it is a delegation
wrapper:

```js
function toDomId(value) {
    return HACDomIds.toDomId(value);
}
```

That is the module-split pattern throughout this codebase: `src/**` holds the
implementation in an IIFE exposing a namespaced global, and `script.js`
re-exports it as a bare global for the other classic scripts. Deleting
`domIds.js` leaves `HACDomIds` undefined and breaks every caller. It is also
loaded by `tests/helpers/legacyHarness.js` and asserted by `domStructure.test.js`.

The original claim came from grepping for `function toDomId`, seeing two hits and
not reading the two lines underneath. Nothing to remove.

---

## 4. ~~Is a commercial movie score of 0.0 expected?~~ — ANSWERED

Yes. A zero movie score is a real outcome, it just takes a genuinely bad
combination to reach — the five-element script the tests build scores `-3.13`
synergy. So the test is right not to assert a non-zero score.

Display only: an exact zero now renders as `0` rather than `0.0`, matching what
`formatScore`/`formatSimpleScore` already did for the other figures. One decimal
is kept everywhere else, since `0.1` is reachable.

---

## 5. Scenarios written but not automated

`tests/scenarios/*.feature` tags every scenario `[automated]`, `[verified]` or
`[unverified]`. The rule that matters: **do not automate from an `[unverified]`
scenario** — it describes behaviour nobody has watched, and writing a test from an
assumption produces a suite that documents fiction.

Notable gaps, highest value first:

- **Script Lab — conflicting locks** `[unverified]`. `#generatorFeedbackMessage`
  and `#unlockBlockedLocksButton` exist in the markup, but nobody has reproduced
  the conditions that surface them. Find the repro before writing the test.
- **Script Library save/load round trip** `[unverified]`. Save downloads JSON,
  Load reads it back. Never exercised end to end; needs Playwright download
  handling.
- **Graves: more than ten elements refused** `[verified]`. The guard exists in
  `gravesAudience.js`; the under-five guard is automated and this one is not.
- **Graves best-match filters** `[verified]` — category filter, minimum fit,
  starting-tags-only. Currently only the "widen to any" path is covered.
- **Graves exclusion notice** `[verified]`. Ban an element in Script Lab, use it
  in a Graves script, expect the notice and the jump-back control.
- **Compatibility: switching to Graves preserves the selection** `[unverified]`.
  Expected, never observed.

---

## 6. Housekeeping

- `.claude/skills/` is untracked and was deliberately left alone. Decide whether
  it belongs in the repo or in `.gitignore`.
- Uncommitted at time of writing (another session's work, not touched):
  `package.json`, `package-lock.json`, `playwright.config.js`, `.gitignore`,
  `.arber/LESSONS_LEARNED.md`, `tests/scenarios/colman-graves.feature`.
- One raw CSS selector remains in a spec, in the `script-lab.spec.js` negative
  control's `addStyleTag`. It is a mutation target rather than a locator, and it
  is commented as such — but it must stay in step with the `resultsSection`
  repository entry.

---

## Two habits worth keeping

**Assert a delta, not a presence.** The single worst defect found this session was
a happy-path test where eight of nine assertions were satisfied by the static
HTML — the scoring engine could have been deleted entirely and the test stayed
green. `index.html` ships `0.0 / 5.0`, `0.00` and `No conflicts found.`. Before
asserting a value is present, check whether the untouched page already provides
it.

**Gate on the app's own signal.** `appShell.js` builds every selector context and
only then binds listeners, so "the selector exists" never meant "the control is
wired". Wait for `hollywood:ready`, not for a DOM side effect that happens to
appear early.
