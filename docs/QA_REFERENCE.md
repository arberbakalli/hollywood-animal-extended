# QA Reference — Hollywood Animal Calculator

**This file is a pointer to external QA lessons and consolidated rules.**

## External QA Lessons Repository

All lessons learned from QA work, regression patterns, and anti-patterns are maintained in:

```
C:\Users\testUser\IdeaProjects\LLM SKILLS md aggregator\QA_LESSONS_LEARNED_HOLLYWOOD_ANIMAL.md
```

This external file serves as the authoritative record of:
- Bugs caught and fixed (with root causes)
- Test infrastructure patterns that worked
- Common mistakes that regressed the app
- Historical decision context
- Performance and architectural insights

**Before fixing a bug or writing a test**: Read this file to check if the pattern was encountered before.

## Internal Rules & Frameworks

This project uses three documents for QA governance:

### 1. [docs/GAME_RULES.md](GAME_RULES.md)
**Product rules** — what the game and app do, not how.
- Starting Tags: exactly 250 elements, 57 whitelisted, 193 banned on first visit
- Distribution formula: Week 1 = commercial score × 2 × 1,000; subsequent weeks decay at 0.8 (or 0.85/0.90 with policies)
- Studio policies: Behemoth (commercial 9 and above) and Boutique (artistic 9 and above) gates
- Graves evaluation scoring and compatibility matrix rules

### 2. [docs/QA_FRAMEWORK.md](QA_FRAMEWORK.md)
**QA process & assertion patterns** — how to verify the rules work.
- Three test layers: BDD scenarios, unit tests, negative/edge tests
- [automated] vs [verified] vs [unverified] marker audit rules
- First-run state reproducibility (193 bans, fixture pre-seeding)
- Exact visuals policy (no color assertions unless owner-ruled)
- Autonomous actions without approval (test writing, audits, runs)
- Actions requiring approval (deletions, rule changes, main pushes)

### 3. [CLAUDE.md](../CLAUDE.md) — Agent Instructions
**How agents work in this repo** — enforces the above two documents.
- Tests are the specification; code changes to match tests, never reverse
- Feature deletion requires coverage-parity proof per behavior
- Running the suite: `npm test` (Jest) and `npm run test:e2e` (Playwright; the config runs 4
  workers, and only **one Playwright process** may run at a time)
- Domain rules: read `docs/GAME_RULES.md` before answering "should it be X or Y?"

### Auditor skills

Five user-level auditor skills enforce these rules: `test-assertions-auditor`,
`feature-deletion-auditor`, `rule-change-auditor`, `banned-element-detector` and
`test-quality-gate`. Each is one `SKILL.md` under `~/.claude/skills/<name>/`,
outside this repository. (Moved from the removed `docs/SKILLS_REGISTRY.md`.)

## When You're Stuck

1. **Test fails, cause unclear?** → Check [QA_FRAMEWORK.md](QA_FRAMEWORK.md), section on test markers and negative assertions. Then check [GAME_RULES.md](GAME_RULES.md) for what the rule actually is.

2. **Bug looks familiar?** → Search the external lessons file for similar root causes and fix patterns.

3. **Need to delete a feature?** → [CLAUDE.md §1](../CLAUDE.md) and [QA_FRAMEWORK.md §4](QA_FRAMEWORK.md) — enumerate what coverage will move or be dropped, then commit with full proof list.

4. **Should I change a test?** → You can only change it if the repository owner approved that *specific* change in the current session, naming the test. Otherwise: fix the code.

5. **About to restore something?** → Check [DECISIONS.md](DECISIONS.md) and `git log` for why it was removed first, and put that reason in front of the owner (`.arber/LESSONS_LEARNED.md` lesson 21).

## Current State

The measured suite baseline lives in one place, [TEST_QUALITY_GATE.md](TEST_QUALITY_GATE.md)
("Current Baseline"), so it is not copied here to go stale. Per-lesson history is in
`.arber/LESSONS_LEARNED.md`.
