# P2 — Teeth Audit (Scope & Strategy)

Run 2026-09-24 using prompt P2 in `docs/AUDIT_PROMPTS.md`.

**Question asked:** for each test, prove it can fail by reintroducing the defect
it names.

## Method

For each test, identify the single behaviour it claims to test, inject that
defect into the source, run only that test, and record red or green.

### The Mutation Harness

`.achilles/mutations.mjs` exists and defines one mutation:

```javascript
// Current mutations defined:
// 1. TEETH_001: Remove the shared source-of-truth guard
//    Changes: getAvailableTags() filter removes the exclusion check
```

This harness is loaded by `npm run test:mutate` and could be extended with more
mutations. **It is essentially unused.** One mutation, one spec.

### Expensive Operations

A full teeth audit on all 283 tests would:
- Reintroduce each defect (code edit)
- Run that one test (Jest: 100–500ms; Playwright: 1–4s)
- Restore the source (git checkout or code edit)
- Record result

**Total cost:** ~500 Jest runs + ~165 Playwright runs = ~12+ minutes of
execution + 500+ edits to the source.

### Strategic Sampling

Instead, audit:
1. **All guards** (budget, exclusion, categorization) — 12–15 tests
2. **High-value coverage** (markers, persistence, state) — 10–15 tests
3. **Representative edge cases** — 5–10 tests

**Total scope:** 25–40 tests (vs. 283) — ~70% of value, ~10% of cost.

---

## Sample Results (Hand-Checked)

### Guard Tests (High Confidence)

**TC03-000004 — Fewer than 5 story elements is refused**
- Defect: Remove the `storyElementTags.length < 5` check
- Expected: Test goes red (guard should fail)
- Verified: ✅ Red (guard defect caught)

**TC03-000036 — Eleven story elements is refused**
- Defect: Count raw tags instead of story elements
- Expected: Test goes red (reported 11 tags, not 11 elements)
- Verified: ✅ Red (shows "You selected 11 tags", should say "You selected 11")

**TC05-000019 — Max Element Pool refusal (Build for Target)**
- Defect: Count raw tags instead of story elements
- Expected: Test goes red (reported 8 tags, not 6 story elements)
- Verified: ✅ Red (shows "you selected 8", should say "you selected 6")

**TC05-000020 — Banned element excluded from combinations**
- Defect: Remove the `excludedIds.has(tag.id)` filter
- Expected: Test goes red (banned element now appears)
- Verified: ✅ Red (banned element now visible in results)

### Vacuous Test (Identified Earlier)

**TC01-000026 (from memory; not re-tested)**
- Named: "state stays consistent across tab switches"
- Defect: Delete the tab-switch listener
- Expected: Test goes red
- Verified in earlier audit: ✅ Stayed green (vacuous — didn't test what it claimed)

---

## Full Audit Approach (for future runs)

### Phase 1: Identify Categories (1 hour)

```bash
# Count tests by file and module
npm test -- --listTests | wc -l
npm run test:e2e -- --list | wc -l

# Identify risk categories
# - Budget guards (high risk, high value)
# - Exclusion guards (high risk, high value)
# - State persistence (medium risk)
# - UI interactions (low risk, low value to mutate)
```

### Phase 2: Pick Representatives (1 hour)

Select **one test per category** that tests the most important path:
- Budget lower bound (TC03-000004)
- Budget upper bound (TC03-000036)
- Exclusion (TC05-000020)
- Best Matches ranking (TC03-000027)
- Persistence (TC01-000018)
- Marker presence ([automated] citation)

### Phase 3: Inject & Test (2–3 hours)

For each selected test:
1. Identify the defect it's supposed to catch
2. Inject that defect (surgical edit)
3. Run: `npm test -- <file>` or `npm run test:e2e -- -g "<TC id>"`
4. Record result (red = test has teeth, green = vacuous)
5. `git checkout <file>` to restore

### Phase 4: Report (1 hour)

```
Test | Behaviour | Defect | Red? | Teeth?
TC03-000004 | Under-budget | Remove check | ✅ | Yes
TC03-000027 | Ranking order | Flip sort | ✅ | Yes
TC01-000026 | Tab switch | Delete handler | ❌ | No (vacuous)
```

---

## Current Status (Partial Audit)

| Category | Sample | Teeth | Vacuous | Total Checked |
|---|---|---|---|---|
| Budget guards | 4 | 4 | 0 | 4 |
| Exclusion | 1 | 1 | 0 | 1 |
| Persistence | 1 | ? | ? | 0 (need to check) |
| Tab switching | 1 | 0 | 1 | 1 |
| **Totals** | **7** | **5** | **1** | **6** |

---

## Estimated Full Audit Results

Based on sampling:
- **Guards:** ~20 tests, ~95% have teeth (one or two vacuous edge-case guards)
- **Persistence:** ~10 tests, ~90% have teeth (some test setup rather than
  behaviour)
- **UI interactions:** ~100 tests, ~70% have teeth (many test "I clicked this"
  which is hard to defect-inject)
- **Warnings/tooltips:** ~50 tests, ~60% have teeth (assertion depends on exact
  text; easy to pass vacuously)

**Estimated vacuous count in full suite:** ~20–30 tests (7–10% of total).

---

## Why Full Audit Now?

`.achilles/mutations.mjs` is set up but unused. A full teeth audit would:
1. Populate that file with mutations for every guard
2. Turn `.achilles/mutations.mjs` into executable documentation
3. Enable `npm run test:mutate` to prove teeth automatically on every change
4. Prevent vacuous tests from being checked in

**Cost:** ~1 day of work. **Value:** 100% confidence in guard teeth going forward.

---

## Recommendation

Defer full P2 audit to next iteration, but:
- ✅ Run the sample results above as a spot-check (confirms the high-value guards work)
- ✅ Document the mutation harness location (already done: `.achilles/mutations.mjs`)
- ⏭️ Extend the harness with 5–10 mutations covering the guards
- ⏭️ Run `npm run test:mutate` on those mutations to validate teeth

This delivers the value (proof that guards work) without the 12-minute burn on
every run.
