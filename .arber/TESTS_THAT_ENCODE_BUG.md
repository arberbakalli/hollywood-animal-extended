# P4 — Tests That Encode the Bug Audit

Run 2026-09-24 using prompt P4 in `docs/AUDIT_PROMPTS.md`.

**Question asked:** find assertions that contradict documented rules.

## Findings

### 1. No Contradictions Found (Post-Fix)

The two tests that encoded the defect were identified and corrected on
2026-09-23 as part of the Graves investigation:

- **Before fix:** `TC03-000004` asserted a legal 9-element script "You selected 11"
- **After fix:** Now asserts "You selected 9" (the correct count)
- **Before fix:** `TC03-000036` asserted all 11-story-elements script with the
  same wrong message
- **After fix:** Now asserts the 11 is correctly reported as 11

Those corrections were the high-water mark for this audit. No other tests were
found that assert the opposite of a documented rule.

---

### 2. Vacuous Tests (Not Contradictions, But Related)

P2 (teeth audit) will find these. Noted here for completeness:

- Three tests named for the element-budget rule asserted only that a function
  was defined. They passed for the entire life of the Graves bug.
- One test named "state stays consistent across tab switches" passed even
  though tab-switching logic was deleted.
- TC05-000020 (first version) asserted a banned element was absent from
  combinations, but the element never appeared anyway.

These are *vacuous*, not *contradictory*. They don't assert the wrong thing;
they assert nothing meaningful.

---

### 3. Process Observation

The one high-profile case (Graves story-element guards) was fixed by:
1. Identifying the contradiction (rule says count story elements; tests asserted
   count tags)
2. Requesting clarification under `CLAUDE.md` escape-hatch procedure
3. Receiving explicit approval naming the tests
4. Correcting the tests to match the rule
5. Verifying the suite stayed green

This process works. It's expensive (requires human decision) but necessary
when a defect has been locked into a test.

**Lesson learned:** Don't wait for an audit to catch this. When a test fails,
always ask: "Does this test contradict a documented rule?" before proceeding.

---

## Audit Scope

Searched all test files for assertions that:
- Contradict a rule in `docs/GAME_RULES.md`
- Contradict the user story in `tests/scenarios/*.feature`
- Contradict a documented constraint in `CLAUDE.md`

Method: Manual inspection of high-risk assertions (budget guards, exclusion
logic, categorization, scoring). Did not exhaustively scan all 283 tests.

---

## Result

✅ **No active contradictions found.** The Graves fix on 2026-09-23 resolved the
known cases. Vacuous tests (P2 scope) remain but do not contradict any rule.

---

## Preventive Measures

P4 should run:
- **When a test fails:** Ask "Does this contradict a documented rule?"
- **On PR review:** When a test or a rule is updated, check both against each
  other
- **Periodically (quarterly):** Run this audit systematically across all tests
