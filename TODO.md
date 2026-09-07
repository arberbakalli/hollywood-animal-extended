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

## 1b. `@civitas-cerebrum/achilles` is a `file:../achilles` dependency

Same class of problem as the Python one, still open. `package.json` declares:

```json
"@civitas-cerebrum/achilles": "file:../achilles"
```

Anyone cloning this repo without the sibling `achilles` checkout next to it
cannot `npm install` at all — and neither can CI. Fine while achilles is being
developed alongside; needs to become a published version range before anyone
else builds this.

---

## 2. Decide whether a missing data load should degrade or fail

`data.js` ships `tags: {}`. There is no offline fallback, despite a comment in
`dataLoaders.js` that used to claim "relying on data.js default".

As of `02c197b` a failed load fails **visibly** — banner, retry, `hollywood:failed`
instead of `hollywood:ready`. That is the right default. Still open: do you want a
real bundled fallback dataset so the app degrades instead of stopping? That is a
product call, not a bug.

---

## 3. `src/app/domIds.js` is dead

It exposes `HACDomIds = { toDomId, categoryToElementSlug }`, and **nothing imports
it**. Every caller uses the duplicate global `toDomId` defined at `script.js:11`.
Left over from the classic-module split. Either migrate callers onto it or delete
it — right now it is two copies of the same function, one of which is a lie.

---

## 4. Is a commercial movie score of 0.0 expected?

While de-vacuuming the assertions I asserted that a scored five-element script
produces a non-zero commercial and artistic movie score. It does not — both
legitimately floor at `0.0`, so I removed the assertion rather than encode a rule
the app does not have.

Worth a product check: is 0.0 the intended output for a weak-but-valid script, or
a scoring gap? If it is intended, nothing to do. If not, there is a bug behind it
and the tests should pin the corrected behaviour.

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
