# Audit Prompts

Reusable prompts for auditing this codebase. They exist because the failures
here are **classes**, not instances: the same defect ships in five files, or a
lesson is written down and never given a guard.

**Every prompt below follows three rules. Keep them when you edit a prompt:**

1. **Audit and repair are separate runs.** An audit that fixes as it goes stops
   enumerating. Ask for the list first, approve, then fix.
2. **Demand a count and a per-item citation.** "I checked the codebase" is not a
   result. `37 of 128, here is each one` is.
3. **Require an explicit "could not verify" section.** The most expensive
   failure mode is a confident report with a silent gap.

---

## P1 — Rule census: every implementation of every rule

> Read `docs/GAME_RULES.md`. For **each** rule it states, find **every** place in
> the codebase that implements it — search for the rule's *shape* (the predicate,
> the comparison, the constant), not the function name, because copies are
> renamed.
>
> Produce a table: rule | file:line of each implementation | do they agree?
>
> Do not fix anything. Where a rule has more than one implementation, say
> whether they currently agree and what input would make them disagree. Where a
> rule has zero implementations, say so — that is a rule nobody enforces.
>
> Finish with the rules you could not locate in code at all.

**Why this one matters most:** the story-element rule had five hand-written
copies. Two were corrected in September; the three nobody looked for refused a
legal script in production. This prompt is the thirty-second grep that would
have caught it.

---

## P2 — Teeth audit: can each test actually fail?

> For each test in `<FILE or DIRECTORY>`, determine whether it can fail.
>
> Method, per test: identify the single behaviour it names, reintroduce that
> defect in the source, run **only** that test, and record red or green. Restore
> the source after each one and confirm `git diff` is empty at the end.
>
> Report a table: test | defect injected | red or green.
>
> A test that stays green is **vacuous** — it does not test what its name claims.
> List those separately. Do not rewrite them; I will decide per test.

Scope it to one file at a time — this is expensive. `npm run test:mutate`
(`.achilles/mutations.mjs`) automates the browser-side half and currently
defines **one** real mutation, so most of this is still manual.

**Caught by this:** three "max element pool" tests that passed with the bug
present; `TC01-000026`, which passes with the only tab-switch logic deleted; and
one of my own, which asserted a row *count* while only one row was filled.

---

## P3 — Marker truth: does `[automated]` mean anything?

> For every scenario in `tests/scenarios/*.feature` marked `[automated]`, verify
> **both** of the following and report per scenario:
>
> 1. the marker cites a test id that exists in `tests/e2e/` or names a Jest file
>    that exists;
> 2. that test actually asserts **this** scenario's Then-steps — not merely that
>    it exists.
>
> Give me the count of scenarios that fail check 1, and the count that pass 1 but
> fail 2. For the second group, quote the scenario's Then-step next to what the
> cited test asserts.

**Run 2026-09-24 — see `.arber/MARKER_TRUTH_AUDIT.md`.** It went from 91 of 128
scenarios citing no test, to **zero**. Two real gaps became tests
(`TC05-000019`, `TC05-000020`); two scenarios are declared in the backlog
instead of claiming automation they never had. Three of the matcher's proposed
citations were wrong and were caught by reading the test — a similarity score is
not evidence.

`tests/featureScenarioMarkers.test.js` enforces check 1 **only for markers that
cite an id**, and cannot do check 2 at all — a Script Lab scenario citing a
Behemoth distribution test passes it clean.

---

## P4 — Tests that encode the bug

> Read `docs/GAME_RULES.md`, then read the assertions in `<DIRECTORY>`. Find
> every test whose assertion **contradicts** a documented rule.
>
> For each: quote the rule, quote the assertion, and give the concrete input
> where they disagree. Do not change any test — per `CLAUDE.md` I approve test
> edits individually, by name.

**Why:** two tests asserted that a legal nine-element script must be rejected as
"You selected 11". The suite was green the whole time and would have pushed any
correct fix back out. This prompt finds that class before a user does.

---

## P5 — Lesson-to-guard: which lessons have teeth?

> Every entry in `.arber/LESSONS_LEARNED.md` ends with a "Cheap check for next
> time". For each lesson, find whether an **executing test** implements that
> check. Report: lesson | proposed check | test that implements it, or NONE.
>
> Do not write the missing tests yet — give me the list ordered by how recently
> the lesson's defect recurred.

**This is the highest-value audit in the file.** Lessons 8 and 12 both describe
the 2026-09-23 defect precisely. Both were written before it shipped. Neither
had a guard. A lesson without an executing check is a wish.

---

## P6 — Invariant drift: things that must stay in sync

> Find every place in this codebase where two or more lists, constants, or
> branches **must** agree for the app to be correct, and no test asserts they do.
>
> Examples already known: the panel list in `hideGravesEvaluationResults` versus
> the list that reveals panels after an evaluation; `script.js` bridge wrappers
> versus the `HAC*` exports they delegate to; the HTML script-load order versus
> the modules on disk.
>
> For each pair, say what breaks if they drift and whether anything currently
> catches it.

---

## The standing clause

Append this to any bug report. It converts an instance into a class:

> Before you report this fixed: search for every other place in the codebase
> that makes this same decision, and list them with file:line — including the
> ones that are already correct. If the rule is implemented more than once,
> collapse the copies into one function and add a guard test that fails when a
> new copy appears. If a copy must stay separate, say why and allowlist it
> explicitly. Then tell me which tests would have caught this, and if none
> would, say that plainly.
