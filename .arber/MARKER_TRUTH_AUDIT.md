# P3 — Marker Truth Audit

Run 2026-09-24 using prompt P3 in `docs/AUDIT_PROMPTS.md`.

**Question asked:** does every `[automated]` scenario cite a test that (1) exists
and (2) asserts that scenario?

## Result

| | Before | After |
|---|---|---|
| `[automated]` citing a test | 37 | **124** |
| `[automated]` citing nothing | **91** | **0** |
| `[verified]` / `[unverified]` backlog | 0 | 2, declared in the guard |
| Tests added to close real gaps | — | 2 |

Every citation was verified by reading the test, not by title similarity.

## Why the automated matcher was not trusted

A token-overlap matcher proposed a candidate for 75 of the 91. Spot-checking it
against the specs caught three wrong answers that would have become permanent
false records — the exact disease this audit exists to cure:

| Scenario | Matcher said | Actually |
|---|---|---|
| Raising the Target Movie Score raises the Max Element Pool | `TC10-000002` | `TC10-000004` — the matcher picked the **reverse direction** |
| Restricting best matches to one category | `TC03-000011` | `TC03-000012` — `…011` is the **seed element** test |
| Selecting more story elements than the budget is refused | `TC03-000004` | a **Colman Graves** test cited for a **Build for Target** scenario |

**A similarity score is not evidence.** Reading the test is.

## Findings

**1. A second id convention was invisible to the guard.**
`search-field-persistence.spec.js` names its tests `BUG-001/002/003`, which the
traceability regex did not match — three tests sat outside the system entirely.
The guard now recognises both conventions.

**2. The Build for Target over-budget refusal had no test in either suite.**
`"Max Element Pool is set to N, but you selected M"` was asserted by nothing. It
is the sibling of the Colman Graves defect fixed on 2026-09-23 — the same rule,
the same panel family, untested. Now `TC05-000019`, which asserts the message
names **six** story elements and not the **eight** tags selected.

**3. A scenario described a control that no longer ships.**
*Limiting suggestions to starting tags* still claimed a "Starting tags only"
checkbox that was removed from the Graves panel. Marked `[unverified]` and
declared in the backlog rather than deleted — deletion is the owner's call under
the coverage-parity rule.

**4. Two near-duplicate scenarios share one test.**
*Resetting clears the marketing selection* and *Resetting after analysis clears
the marketing selection* both cite `TC04-000018`; the second is strictly
stronger. Merging them is a scenario deletion and needs owner approval.

**5. One genuine gap remains, declared not hidden.**
*The advertiser shortlist states which way the movie leans* has no test. It is
`[verified]` in the backlog.

## The vacuous test this audit produced, and how it was caught

The first version of `TC05-000020` banned `SUPPORTINGCHARACTER_SIDEKICK` and
asserted it was absent from the combinations. It passed — **and it still passed
after exclusion filtering was deleted from `targetedAds.js` entirely**, because
Sidekick never appeared in the top combinations either way.

The test now calibrates itself: it runs once, reads a story element out of the
first combination it actually produced, bans *that*, and re-runs. Confirmed red
with the defect reintroduced.

A hardcoded fixture made the assertion true for the wrong reason. **Where a test
depends on data it did not choose, have it choose the data.**

## Suites

Jest 283 in 22 suites, Playwright 165. Both green, run separately, single
Playwright process.
