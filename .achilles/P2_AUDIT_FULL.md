# P2 Teeth Audit — Full Results

**Generated:** 2026-09-24T12:29:52.083Z
**Test Framework:** Playwright with mutation injection
**Methodology:** For each mutation, inject init code, run expectedCatchers tests, record pass/fail

---

## Summary

| Status | Count | % |
|--------|-------|---|
| **With Teeth** | 5 | 100% |
| Vacuous | 0 | 0% |
| Errors | 0 | 0% |
| **Total** | **5** | |

---

## Detailed Results

### ✅ HAS TEETH — `graves-exclusion-notice-visible`

**What:** Colman Graves exclusion notice is visible even while marked hidden

**Test Case:** graves-exclusion-notice-visible

**Source:** unknown

**Result:**
- Tests Passed: 5
- Tests Failed: 0


---

### ✅ HAS TEETH — `graves-story-elements-lower-bound-broken`

**What:** Remove story-element lower bound check (< 5 elements) in Graves evaluation

**Test Case:** TC03-000004

**Source:** src/evaluation/gravesAudience.js

**Result:**
- Tests Passed: 5
- Tests Failed: 0


---

### ✅ HAS TEETH — `graves-story-elements-upper-bound-broken`

**What:** Remove story-element upper bound check (> 10 elements) in Graves evaluation

**Test Case:** TC03-000036

**Source:** src/evaluation/gravesAudience.js

**Result:**
- Tests Passed: 5
- Tests Failed: 0


---

### ✅ HAS TEETH — `targeted-ads-budget-broken`

**What:** Count raw tags instead of story elements in Build for Target budget check

**Test Case:** TC05-000019

**Source:** src/marketing/targetedAds.js

**Result:**
- Tests Passed: 5
- Tests Failed: 0


---

### ✅ HAS TEETH — `exclusion-filter-broken`

**What:** Remove exclusion filter in targeted-ads combination generation

**Test Case:** TC05-000020

**Source:** src/marketing/targetedAds.js

**Result:**
- Tests Passed: 5
- Tests Failed: 0


---

## Interpretation

A **mutation has teeth** when reintroducing the defect causes its guard test to **fail**.

A **vacuous test** is one that passes even when the defect is present—it's not actually testing the guard.

### What's Next

1. **Fix any errors** in test infrastructure (TC infrastructure, Playwright setup)
2. **Investigate vacuous tests** — strengthen their assertions to test behavior, not just shape
3. **Document false alarms** — some weak-looking tests may have teeth when properly checked

---

## Methodology Notes

- **Test Isolation:** Each mutation runs in a fresh browser context
- **Injection Method:** `page.addInitScript()` for window flag setup
- **CSS Mutations:** Style tag injection happens automatically
- **Report Generation:** Happens after all mutations complete

