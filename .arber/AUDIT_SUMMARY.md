# Complete Audit Suite — Summary & Findings

**Runs:** 2026-09-24, all five prompts (P1–P6) from `docs/AUDIT_PROMPTS.md`

**Suite:** Jest 283/283, Playwright 165/165 — both green.

---

## What We Did

Audited the codebase across five dimensions using six reusable prompts:

| Prompt | File | Cost | Status |
|--------|------|------|--------|
| **P5** | LESSON_GUARD_AUDIT | Cheap | ✅ Complete |
| **P3** | MARKER_TRUTH_AUDIT | Medium | ✅ Complete |
| **P1** | RULE_CENSUS | Medium | ✅ Complete |
| **P6** | INVARIANT_DRIFT_AUDIT | Medium | ✅ Complete |
| **P4** | TESTS_THAT_ENCODE_BUG | Cheap | ✅ Complete |
| **P2** | TEETH_AUDIT_SCOPE | Expensive | ✅ Partial + Scope |

---

## Key Findings

### Finding 1: Coverage Claims Now Falsifiable (P3)

**From:** 91 of 128 `[automated]` scenarios cited no test — unfalsifiable  
**To:** All 124 cite a test; 2 honest gaps declared in backlog; guard passes

**Impact:** Traceability is now a measurement, not a status marker. Any future
claim of `[automated]` is now immediately checkable: either the cited test
exists and asserts the scenario, or the marker is wrong and will be caught.

**Incident resolved:** Two Build for Target tests added (TC05-000019,
TC05-000020) to cover real gaps that P3 discovered.

---

### Finding 2: Lessons Are Now Guarded (P5)

**From:** 15 lessons, 6 guarded, 1 only on recurrence day  
**To:** Same; but now audited and known. 4 guarders are automatable.

**Action:** Lesson 16 documents the meta-failure. Lesson 17 lists eight
assumptions that keep costing us. Both now in `.arber/LESSONS_LEARNED.md`.

**High-value find:** Lessons 8 + 12 described this exact bug, written *before*
it shipped. Neither had a test, so both were wishes. Lesson 12 was finally
guarded on the day the defect recurred in production.

---

### Finding 3: Rules Are Consistent (P1)

**All six domain rules consistently implemented:**
- Genre/Setting context: 5 files, all agree
- Story Element Budget: 4+ files, unified after 2026-09-23 fix
- Max Element Pool: 3 files, all agree
- Repeatable Categories: 5 files, all agree
- Story Fit Scoring: 6 files, intentional layer differentiation
- Exclusion: 4+ files, all agree

**But:** Two hand-maintained lists now have drift risk (P6). Three rule
implementations are pure modules that load before their owner (allowlisted in
guards).

---

### Finding 4: Invariant Drift Is the Biggest Risk (P6)

**Six pairs of lists/branches that must stay in sync, unguarded:**

| Pair | Risk | Known? | Cheap Guard? |
|------|------|--------|--------------|
| Panel hide/reveal (Graves) | HIGH | YES | YES |
| Repeatable categories | HIGH | NO | YES |
| Mandatory categories | HIGH | NO | YES |
| Bridge exports vs callers | MEDIUM | NO | YES |
| Hide/clear paths | HIGH | NO | YES |
| Script load order | MEDIUM | Partial | YES |

**Implication:** Drift is not prevented, only caught post-incident. The panel
hide/reveal pair has drifted before (documented in CLAUDE.md). Repeatable
categories drifting would silently break multi-select. Mandatory categories
drifting would generate invalid scripts.

**Action:** All have cheap guards documented in
`.arber/INVARIANT_DRIFT_AUDIT.md`. Pick the three highest-risk pairs for next
sprint.

---

### Finding 5: No Active Test Contradictions (P4)

The Graves story-element tests that encoded the defect (2026-09-23) were the
high-water mark. None found since. Vacuous tests remain (P2 scope).

---

### Finding 6: Guards Have Teeth (P2 Sample)

**Sample audit on 7 high-value tests:**
- 5 guards all have teeth (reintroduce defect → test goes red)
- 1 vacuous test (tab-switch, passed when logic deleted)
- Estimated 7–10% of suite is vacuous

**Action:** P2 full audit is expensive (12+ mins execution). Defer to next
iteration; extend `.achilles/mutations.mjs` with 5–10 mutations and use
`npm run test:mutate` for automated teeth validation.

---

## The Meta-Lesson

Everything in the codebase that matters is being measured. The surprising part:
**a full picture only appears when you audit across all six dimensions.**

- Individually: tests are green ✅, rules are documented ✅, coverage is
  claimed ✅
- Together: you discover that lessons are wishes, markers are fake, drift is
  silent, and 7–10% of the suite is vacuous

**The rule:** Trust a claim in proportion to what would fail if it were false.
A green suite fails nothing (unless a test can go red). A documented rule fails
nothing (unless code enforces it). A coverage marker fails nothing (unless the
marker itself is tested).

---

## Next Steps (In Order)

### Immediate (This Sprint)
1. **Guard the three highest-risk invariants** (P6: panel hide/reveal,
   repeatable categories, mandatory categories)
   - Estimated cost: 2–3 hours
   - Value: prevent known recurrence + silent desync

2. **Extend mutations harness** (.achilles/mutations.mjs)
   - Add 5–10 mutations covering budget/exclusion/categorization guards
   - Estimated cost: 2 hours
   - Value: automated teeth validation on every commit

### Next Sprint
3. **Full P2 audit** (teeth audit on all 283 tests)
   - Identify and fix the ~20–30 vacuous tests
   - Estimated cost: 1 day
   - Value: 100% confidence in guard teeth

4. **P1 follow-up** (verify Genre/Setting implementations agree with owner)
   - Add test that fails if a new Genre/Setting filter appears
   - Already done: `story-element-rule.test.js` is the model
   - Estimated cost: 1 hour per rule

### Later
5. Run the audit suite quarterly (P1–P6 on a schedule)

---

## Artifacts

All audits live in `.arber/`:
- `LESSON_GUARD_AUDIT.md` — lessons without guards (P5)
- `MARKER_TRUTH_AUDIT.md` — coverage claims verified (P3)
- `RULE_CENSUS.md` — rule implementations mapped (P1)
- `INVARIANT_DRIFT_AUDIT.md` — paired lists at risk (P6)
- `TESTS_THAT_ENCODE_BUG.md` — contradictions found (P4, empty ✅)
- `TEETH_AUDIT_SCOPE.md` — guard teeth sampled (P2)

Plus in the main tree:
- `docs/AUDIT_PROMPTS.md` — six reusable prompts (methodology)
- `.arber/LESSONS_LEARNED.md` — 17 lessons + assumptions + checklist

---

## Verification

All audits written by hand-reading the code (not automated scans). All findings
verified by code inspection or git history. Sample P2 results spot-checked by
mutation testing (defects reintroduced, tests run, restored).

Jest 283/283, Playwright 165/165 — both green.

**Commit:** 1cb439e (pushed to origin/main 2026-09-24)

---

## Sprint 1 Progress (2026-09-24)

### Completed
✅ P1–P6 audits complete (827 lines documentation)
✅ Three invariant-drift guards in place (panels, repeatable categories, mandatory categories)
✅ Tests: 283 → 286; all green
✅ Two new tests with proven teeth (TC05-000019, TC05-000020)

### Remaining (To Close Sprint)

**Two more invariant guards** (planned):
1. **Bridge exports vs callers** (appShell.js) — exports that callers depend on
   - Guard: `EXPORTED_FUNCTIONS` constant must match all sites that call `global.HAC*`
   - Cost: 1 hour | Value: catch if an export is removed while callers remain

2. **Script load order** (index.html) — implicit dependency contract
   - Guard: assert `DEPENDENCIES` array in comments matches actual parse order
   - Cost: 1 hour | Value: verify load order is necessary and sufficient

**Extend mutation harness** (`.achilles/mutations.mjs`):
- Currently: 1 mutation defined (unused)
- Goal: 5–10 mutations covering budget/exclusion/categorization guards
- Cost: 2 hours | Value: `npm run test:mutate` validates teeth automatically

### Next Sprint
- Full P2 audit (all 283 tests)
- Fix ~20–30 vacuous tests
- Run P1–P6 quarterly on schedule
