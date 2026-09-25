# Open items

Written 2026-09-07, at the end of the session that added the Playwright suite.
Everything below is either an unacted finding or a decision waiting on a human.

Suite state at the time of writing: **62 Playwright, 80 Jest, green.**
Last commit: `02c197b`.

**Reviewed 2026-09-22.** Suite is now **149 Playwright, 263 Jest across 21
suites, green**. Items resolved since are struck through or annotated in place;
the rest still stand. Domain rules have moved to `docs/GAME_RULES.md`, which is
the source of truth for behaviour questions.

---

## 1. ~~Move the test static server off Python~~ â€” DONE

Replaced by `tools/static-server.mjs`, a zero-dependency Node server. Python is
no longer required to run the suite.

Measured, two runs each:

| server | workers | run 1 | run 2 | result |
|---|---|---|---|---|
| `python -m http.server` | 1 | 114s | 108s | one flake |
| Node | 1 | 103s | 103s | green |
| Node | 4 | 58s | 58s | green |
| Node | 8 | 55s | 55s | green |

Parallelism was the real gain, not raw throughput â€” Python forced `workers: 1`.
Settled on 4, since 8 buys almost nothing and the suite is CPU-bound from there.

The server also sends `cache-control: no-store` and refuses dotfile paths, so it
will not serve `.git/` or a stray `.env` the way `python -m http.server` did.

---

## 1b. Achilles tooling removed

Achilles was removed after its self-repair and mutation paths proved able to keep
weak tests green. Do not add `achilles-self-repair`, mutation scripts, or
test-only bypass flags back to the repo without an explicit owner decision and a
reviewed safety contract.

---

## 2. Decide whether a missing data load should degrade or fail

`data.js` ships `tags: {}`. There is no offline fallback, despite a comment in
`dataLoaders.js` that used to claim "relying on data.js default".

As of `02c197b` a failed load fails **visibly** â€” banner, retry, `hollywood:failed`
instead of `hollywood:ready`. That is the right default. Still open: do you want a
real bundled fallback dataset so the app degrades instead of stopping? That is a
product call, not a bug.

---

## 3. ~~`src/app/domIds.js` is dead~~ â€” WRONG, it is load-bearing

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

## 4. ~~Is a commercial movie score of 0.0 expected?~~ â€” ANSWERED

Yes. A zero movie score is a real outcome, it just takes a genuinely bad
combination to reach â€” the five-element script the tests build scores `-3.13`
synergy. So the test is right not to assert a non-zero score.

Display only: an exact zero now renders as `0` rather than `0.0`, matching what
`formatScore`/`formatSimpleScore` already did for the other figures. One decimal
is kept everywhere else, since `0.1` is reachable.

---

## 5. Scenarios written but not automated

`tests/scenarios/*.feature` tags every scenario `[automated]`, `[verified]` or
`[unverified]`. The rule that matters: **do not automate from an `[unverified]`
scenario** â€” it describes behaviour nobody has watched, and writing a test from an
assumption produces a suite that documents fiction.

Notable gaps, highest value first:

- ~~**Script Lab â€” conflicting locks** `[unverified]`~~ â€” **RESOLVED 2026-09-22.**
  The repro was looked for and does not exist. The trigger was never "locks that
  conflict with each other": that branch fires only when a locked element is
  excluded, and such a lock is cleared, with a message naming it, before
  generation is ever reached. `showBlockedLockAction`, `removeBlockedLockedPicks`
  and `#unlockBlockedLocksButton` had no reachable path and were deleted; the
  guard that refuses generation stays. The scenario now describes what the app
  actually does.
- **Script Library save/load round trip** `[unverified]`. Save downloads JSON,
  Load reads it back. Never exercised end to end; needs Playwright download
  handling.
- **Graves: more than ten elements refused** `[verified]`. The guard exists in
  `gravesAudience.js`; the under-five guard is automated and this one is not.
- **Graves best-match filters** `[verified]` â€” category filter, minimum fit,
  starting-tags-only. Currently only the "widen to any" path is covered.
- **Graves exclusion notice** `[verified]`. Confirmed in the app 2026-09-22 â€”
  with the Starting Tags profile on, 24 Settings are correctly unselectable and
  the notice reads "Script Lab is hiding suggestions: 193 excluded elements."
  Still not automated. Note the second half of the old wording is impossible:
  a Graves script cannot *hold* a banned element, because banning one removes it
  from the script immediately.
- **Compatibility: switching to Graves preserves the selection** `[unverified]`.
  Expected, never observed.

---

## 6. Housekeeping

- `.claude/skills/` is untracked and was deliberately left alone. Decide whether
  it belongs in the repo or in `.gitignore`.
- ~~Uncommitted at time of writing (another session's work, not touched)~~ â€”
  stale; that list described a working tree from 2026-09-07 and all of it has
  long since landed. The tree is clean as of 2026-09-22.
- `.achilles/run-summary.json` is now ignored. It is regenerated per run, its
  diff is only `timestamp` and `git_sha`, and it records no results.
- One raw CSS selector remains in a spec, in the `script-lab.spec.js` negative
  control's `addStyleTag`. It is a mutation target rather than a locator, and it
  is commented as such â€” but it must stay in step with the `resultsSection`
  repository entry.

---

## Two habits worth keeping

**Assert a delta, not a presence.** The single worst defect found this session was
a happy-path test where eight of nine assertions were satisfied by the static
HTML â€” the scoring engine could have been deleted entirely and the test stayed
green. `index.html` ships `0.0 / 5.0`, `0.00` and `No conflicts found.`. Before
asserting a value is present, check whether the untouched page already provides
it.

**Gate on the app's own signal.** `appShell.js` builds every selector context and
only then binds listeners, so "the selector exists" never meant "the control is
wired". Wait for `hollywood:ready`, not for a DOM side effect that happens to
appear early.
