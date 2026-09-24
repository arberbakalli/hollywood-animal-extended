# P5 — Lesson-to-Guard Audit

Run 2026-09-24 against `.arber/LESSONS_LEARNED.md` (17 entries) using prompt P5
in `docs/AUDIT_PROMPTS.md`.

**Question asked:** for each lesson's "Cheap check for next time", does an
*executing* test implement it?

**Headline:** 6 of 15 substantive lessons have a guard. 1 is partial. 4 have
none and are automatable. 4 are process habits that cannot be a test as written.
**One of the six was only guarded after its defect recurred in production.**

---

## Results

| # | Lesson | Guard | Status |
|---|---|---|---|
| 1 | Module split drops a declaration | `moduleGlobals.test.js` — `SHARED_BINDINGS` | ⚠️ **Guarded, hand-mirrored.** Lists 13 bindings; `state.js` declares exactly 13, so it is complete *today*. Nothing derives it, so a 14th binding is silently uncovered. Same class as the `[automated]` marker problem. |
| 2 | "It used to work" deserves a history search | — | Process habit. Not testable. |
| 3 | Ruling out one cause ≠ finding none | — | Process habit. Not testable. |
| 4 | Verify a scripted edit actually matched | — | ❌ **Automatable and worth it.** Every `python`/`sed` edit in this repo should assert its replacement count. I hit this again on 2026-09-23 when an anchor silently failed to match. |
| 5 | A brittle test is worse than no test | — | ❌ **None.** This is exactly what P2 exists to run. No mutation coverage outside one spec. |
| 6 | Check what actually deploys before maintaining a mirror | — | ❌ None. |
| 7 | Distribution formulas need game-file proof | Exact 8-week grid asserted in `distribution-behemoth`, `distribution-edge-cases`, `holiday-release` | ✅ Guarded, three places. |
| 8 | "Source of truth" means every consumer | `scoringCore.test.js` — all four contexts | ⚠️ **Guarded for exclusions only.** The lesson's *principle* is what broke on 2026-09-23: the story-element rule had five consumers and nothing enumerated them. The check was written narrowly around the exclusion incident that produced it. |
| 9 | Starter deck data from the running game | `scoringCore.test.js` — starter whitelist vs in-game deck | ✅ Guarded. |
| 10 | A hidden class is not proof the element is hidden | — | ❌ **None.** The only match was an unrelated `addStyleTag` in a spec. |
| 11 | Human-equivalent names are not code-equivalent | — | Manual browser inspection as written. Not testable without rewording. |
| 12 | Count by category, not by total count | `story-element-rule.test.js`, `TC03-000035`, `TC03-000036` | ⚠️ **Guarded on 2026-09-23 — the day the defect recurred.** The lesson was written 2026-09-XX with the check spelled out and never built. This is the entry that justifies lesson 16. |
| 13 | "No filter" must produce results, not errors | `marketing-release.spec.js:492` — one filter | ⚠️ **Partial.** The lesson asks for three states documented for *every* optional filter. One is covered. |
| 14 | Do not hide a panel while focus is inside it | `colman-graves.spec.js` — `activeElement` + aria warnings | ✅ Guarded, exactly as the lesson specified. |
| 15 | Negative controls assert state, not forced failures | — | ❌ **None.** No `try {` appears in `tests/*.test.js` today, so the repo is currently clean, but nothing prevents reintroduction. Automatable as a source-text guard. |
| 16 | A lesson without an executing guard is a wish | This audit | Meta. |
| 17 | The assumptions that keep costing us | Standing clause | Meta. |

---

## What to build, in order

1. **L15 + L10 — source-text guards.** Cheapest wins. Both are one `readFile` +
   regex test in the shape of `story-element-rule.test.js`'s guard. L15: no
   `try {` wrapping an `expect` in any spec. L10: every component that combines
   `.hidden` with its own `display` rule has a component-scoped hidden selector.

2. **L1 — derive the list instead of mirroring it.** Parse the top-level
   `var|let|const` declarations out of `src/app/state.js` and assert each
   resolves, rather than hand-listing 13. Turns a stale-prone mirror into a
   measurement. Same fix pattern applies to any paired list found by P6.

3. **L8 — widen the check to the principle.** The current test enumerates the
   four exclusion consumers. Generalise it: for each rule in `GAME_RULES.md`,
   assert there is exactly one implementation (with a documented allowlist).
   `story-element-rule.test.js` already does this for one rule — it is the
   template.

4. **L13 — finish the filter matrix.** Enumerate every optional filter and
   assert the unfiltered state returns results rather than an error.

5. **L4 — assert replacement counts in edit tooling.** A convention, not a test:
   any scripted edit asserts its anchor matched before writing.

6. **L5 — extend `.achilles/mutations.mjs`.** It defines one real mutation
   against one spec. Every guard listed ✅ above should have a mutation proving
   it can go red.

---

## Method note

Lessons were matched to guards by searching for the check's *subject*, not its
wording, then reading the matching test to confirm it asserts that behaviour
rather than merely mentioning it. Two apparent matches were rejected on
reading: L10 (an unrelated `addStyleTag`) and the assumption that L1's list was
derived rather than hand-written.
