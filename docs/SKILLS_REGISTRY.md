# Skills Registry — QA Auditors for Hollywood Animal

This document lists proposed and planned QA auditor skills to enforce rules from [CLAUDE.md](../CLAUDE.md) and [QA_FRAMEWORK.md](QA_FRAMEWORK.md).

**Status: Design phase. Skills have not yet been implemented.**

Each skill is described below with its scope, trigger, and audit rules. These replace manual code review with systematic verification.

---

## 1. test-assertions-auditor

**Purpose**: Enforce that every `[automated]` scenario step has a corresponding assertion in the test code.

**Audit Rule**: For every scenario marked `[automated]`, check that each Then-step is asserted in the Playwright or Jest spec.

**Output**: Mark each scenario as:
- `TRUE` — all meaningful Then-steps have assertions
- `PARTIAL` — some steps are unasserted or loosely asserted (e.g., locator.isVisible() without value checks)
- `FALSE` — test does not exist or tests a different behavior

**Blocker**: PARTIAL and FALSE markers must not be presented as "test coverage." If found, the marker must be downgraded and the gap documented.

**Integration**: 
- Load on: Test file changes, scenario file changes
- Trigger: `/skill test-assertions-auditor` or automatic scan
- Report format: Scenario name, test id, step-by-step assertion check, verdict

---

## 2. feature-deletion-auditor

**Purpose**: Enforce coverage-parity before feature deletion.

**Audit Rule**: When a feature is removed (UI, backend logic, or both), the agent must list:
1. Every behavior the feature performed
2. Where that behavior is now covered (if moved or renamed)
3. Behaviors where coverage is being dropped (and why)

Before deleting: `.feature` file, spec file, or CSS class, the agent runs this auditor.

**Blocker**: Deleting a test file with failing tests is the risk case. Audit prevents silent deletion of the last guard of a feature.

**Integration**:
- Trigger: `git diff` detects `- *.feature` or `- *.spec.js` deletions
- Prompt: "Feature files marked for deletion. Run coverage-parity audit first?"
- Output: Behavior checklist + coverage map + approval requirement

---

## 3. rule-change-auditor

**Purpose**: Detect when a code change conflicts with or overrides a rule in [GAME_RULES.md](GAME_RULES.md) or [QA_FRAMEWORK.md](QA_FRAMEWORK.md).

**Audit Rule**: When code or tests change, grep for touched files against rule keywords:
- "193" (Starting Tags ban count)
- "Distribution formula" (week decay rates)
- "Compatibility score" (matrix logic)
- "Behemoth", "Boutique" (studio policies)
- "essay element budget" (max pool logic)

**Blocker**: If a rule-related file is modified without updating the rule doc, flag for owner review.

**Integration**:
- Trigger: Pre-commit hook or `git diff` analysis
- Report: "Rules referenced in code: [list]. Update [GAME_RULES.md](GAME_RULES.md) if rules changed?"
- Approval: Owner confirms rule change or code reverts

---

## 4. banned-element-detector

**Purpose**: Catch tests that use element IDs excluded by Starting Tags (the 193 bans).

**Audit Rule**: When writing a test that locks, selects, or asserts on a story element, verify it's in `GAME_DATA.starterWhitelist`.

Test fixtures that pre-seed the Starting Tags profile must use only whitelisted elements, or the test won't reproduce real first-run behavior.

**Blocker**: Test passes with banned element despite Starting Tags being active = false test, not a guard.

**Integration**:
- Trigger: Spec file changes, test setup changes
- Scan: All `VALID_*_SCRIPT` constants and fixture elements
- Report: "Element XYZ is banned in Starting Tags profile. Use [whitelist alternatives](../src/data/whitelist-map.json)."
- Approval: Element changes must be validated against real first-run state

---

## 5. test-quality-gate

**Purpose**: Reject low-quality test patterns that hide bugs instead of catching them.

**Audit Rule**: Flag and disallow:
- `expect(true).toBe(true)` — always passes, proves nothing
- `test.skip()`, `.only()`, `test.fixme()` without owner approval
- Early returns in assertions (`if (!thing) return;`)
- Broad regex or number ranges (`toBeCloseTo`, `toBeGreaterThan` without bounds)
- Mocked values that diverge from production (mock returns zero when prod returns 100)

**Blocker**: If a test passes but the bug is present, the test failed the gate. Rewrite or skip.

**Integration**:
- Trigger: Jest/Playwright run, pre-commit hook
- Scan: Test source code for anti-patterns
- Report: "Test pattern detected: [flag]. This test may not catch the bug."
- Approval: Agent must fix the test or skip it with owner justification

---

## Implementation Roadmap

1. **Priority 1**: test-assertions-auditor (catch false [automated] markers)
2. **Priority 2**: banned-element-detector (prevent Starting Tags bugs)
3. **Priority 3**: feature-deletion-auditor (prevent silent coverage loss)
4. **Priority 4**: test-quality-gate (improve test assertion quality)
5. **Priority 5**: rule-change-auditor (detect rule conflicts early)

Each skill is a separate `.claude/skills/*/SKILL.md` file with its own auditor agent prompt and output format.

---

## How to Use These Skills

Once implemented:

```bash
# Audit all test markers for assertions
/skill test-assertions-auditor

# Check if feature can be safely deleted
/skill feature-deletion-auditor

# Detect rule conflicts in this branch
/skill rule-change-auditor

# Find tests using banned elements
/skill banned-element-detector

# Screen test quality before merge
/skill test-quality-gate
```

Each skill runs independently and can be chained in CI or run before a PR.

---

**Last Updated**: 2026-09-25

**Status**: Planned (not yet implemented)

**Next Step**: Build test-assertions-auditor as proof of concept
