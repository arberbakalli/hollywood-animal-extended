# P2 Teeth Audit — Manual Execution Guide

**Status:** Ready to run  
**Mutations defined:** 6 (1 control + 5 active)  
**Tests to verify:** 5 guards × 1+ tests each  
**Estimated time:** 20–30 minutes

---

## What This Is

A **teeth audit** proves each guard has teeth by:
1. Reintroducing the defect (inject mutation)
2. Running the guard's test
3. Confirming the test **fails** (went red)
4. Restoring normal code
5. Confirming the test **passes** again

---

## Setup

All mutations are wired into source code via window flags:
- **gravesAudience.js** (lines 57, 62): Lower/upper bounds
- **targetedAds.js** (lines 86, 139): Budget + exclusion filter

---

## P2 Audit: Mutation-by-Mutation

Each mutation below has a corresponding test case(s). To verify teeth:

### Mutation 1: graves-story-elements-lower-bound-broken

**What:** Bypass lower-bound check (< 5 elements) — allows undercount  
**Test Case:** TC03-000004  
**Guard Location:** `src/evaluation/gravesAudience.js:57`  
**Flag:** `window.__gravesLowerBoundBypassed`

**Manual Verification:**
```bash
# 1. Open browser console (F12)
# 2. Run: window.__gravesLowerBoundBypassed = true
# 3. Select 4 story elements in Graves tab
# 4. Click "Evaluate with Graves" (should proceed, no error)
# 5. Run test to verify it fails:
npm run test:e2e -- --grep "TC03-000004"
# Expected: ❌ FAIL (test catches the bypass)
```

---

### Mutation 2: graves-story-elements-upper-bound-broken

**What:** Bypass upper-bound check (> 10 elements) — allows overcount  
**Test Case:** TC03-000036  
**Guard Location:** `src/evaluation/gravesAudience.js:62`  
**Flag:** `window.__gravesUpperBoundBypassed`

**Manual Verification:**
```bash
# 1. Open browser console (F12)
# 2. Run: window.__gravesUpperBoundBypassed = true
# 3. Select 11 story elements in Graves tab
# 4. Click "Evaluate with Graves" (should proceed, no error)
# 5. Run test:
npm run test:e2e -- --grep "TC03-000036"
# Expected: ❌ FAIL (test catches the bypass)
```

---

### Mutation 3: targeted-ads-budget-broken

**What:** Bypass element budget check — allows exceeding max pool  
**Test Case:** TC05-000019  
**Guard Location:** `src/marketing/targetedAds.js:86`  
**Flag:** `window.__targetedBudgetBypassed`

**Manual Verification:**
```bash
# 1. Open browser console (F12)
# 2. Run: window.__targetedBudgetBypassed = true
# 3. Set Max Element Pool to (e.g.) 5
# 4. In Build for Target, select 8 story elements
# 5. Click "Find Combinations" (should proceed, no error)
# 6. Run test:
npm run test:e2e -- --grep "TC05-000019"
# Expected: ❌ FAIL (test catches the bypass)
```

---

### Mutation 4: exclusion-filter-broken

**What:** Bypass exclusion filter — includes banned tags in results  
**Test Case:** TC05-000020  
**Guard Location:** `src/marketing/targetedAds.js:139`  
**Flag:** `window.__exclusionFilterBypassed`

**Manual Verification:**
```bash
# 1. Open browser console (F12)
# 2. Run: window.__exclusionFilterBypassed = true
# 3. In Exclusion panel, ban a tag
# 4. In Build for Target, select that tag + others
# 5. Click "Find Combinations" (should proceed)
# 6. Results will include the banned tag (defect)
# 7. Run test:
npm run test:e2e -- --grep "TC05-000020"
# Expected: ❌ FAIL (test catches banned tag in results)
```

---

### Mutation 5: graves-exclusion-notice-visible

**What:** Show exclusion notice even when marked hidden (CSS override)  
**Test Case:** TC03-000007  
**Guard Location:** `.achilles/mutations.mjs:15–30` (CSS injection)  
**Flag:** CSS rule injected via style tag

**Manual Verification:**
```bash
# 1. Browser does NOT need flag set (CSS is injected via init)
# 2. This one is automatically handled by the mutation init
# 3. Just run the test:
npm run test:e2e -- --grep "TC03-000007"
# Expected: ❌ FAIL (test detects the visibility mutation)
```

---

## Running Full P2 Audit

### Option A: Run All Tests (Unmodified Code)

```bash
npm run test:e2e -- --grep "TC03-000004|TC03-000036|TC03-000007|TC05-000019|TC05-000020"
```

**Expected:** All 5 tests ✅ PASS (guards working normally)

### Option B: Automated Mutation Injection (Future)

Once a test harness is built, run:
```bash
node .achilles/mutations-runner.mjs --verbose
```

This will:
- Inject each mutation programmatically
- Run its expectedCatchers tests
- Report teeth/vacuous status
- Generate `.achilles/P2_AUDIT_RESULTS.md`

---

## Checklist: Guards Have Teeth

- [ ] TC03-000004: Lower bound check has teeth (test fails when bypassed)
- [ ] TC03-000036: Upper bound check has teeth (test fails when bypassed)
- [ ] TC05-000019: Budget check has teeth (test fails when bypassed)
- [ ] TC05-000020: Exclusion filter has teeth (test fails when bypassed)
- [ ] TC03-000007: Visibility override has teeth (test fails when CSS injected)

---

## What's Next

Once manual verification confirms all guards have teeth:

1. **Extend mutations-runner.mjs** to automate via test harness
2. **Run quarterly** — add to CI/CD pipeline
3. **Document** any vacuous tests found during P2 audit
4. **Fix** vacuous tests by strengthening assertions
5. **Wire Guards 4–6** for remaining invariant drift risks
