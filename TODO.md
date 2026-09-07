# Open items

Written 2026-09-07, at the end of the session that added the Playwright suite.
Everything below is either an unacted finding or a decision waiting on a human.

Suite state at the time of writing: **62 Playwright, 80 Jest, green.**
Last commit: `02c197b`.

---

## 1. Move the test static server off Python

**Why it matters more than speed:** `playwright.config.js` runs
`python -m http.server`. Nothing in `package.json` declares that, so Python is an
undeclared system dependency of a JavaScript project. Anyone cloning this needs
it on PATH, and a standard Node CI image will not have it — the suite would fail
there for reasons unrelated to the app. The `--protocol HTTP/1.1` flag also needs
Python 3.11+, and nothing pins or checks that.

**Suggested:** add `serve` (or `http-server`) as a devDependency and point
`webServer.command` at it. A ~25-line zero-dep Node script also works but becomes
code to maintain, MIME types included.

**Honest caveat:** the portability argument is provable. The *stability* argument
is not — it is inferred from a single flake that could equally have been the
app's own boot. Measure before and after rather than assuming.

**Knock-on:** `workers: 1` in `playwright.config.js` exists only because the
Python server could not keep up. Retry raising it after the swap.

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
