# .arber - Refactoring & Development Guidance

This directory contains refactoring plans, prompts, and guidance for working on the hollywood repo (Hollywood-Animal-Calculator).

## Files

### 📋 REFACTORING_PLAN.md
Complete refactoring strategy covering:
- **Architecture**: Proposed class structure & directory layout
- **Phases**: 6-phase roadmap from analysis → implementation
- **Stages**: 4-stage incremental refactoring (Foundation → Core → Feature → Other Tabs)
- **Git Workflow**: Branch strategy, commit patterns, PR guidelines
- **First Feature**: Deduplication + search filter specification
- **Risk Mitigation**: How to handle edge cases & testing

**Read this first** to understand the full vision.

### 💬 CLAUDE_PROMPT_FILTER.md
Reusable prompt template for Claude sessions working on this repo.

**Use this when asking Claude to:**
- Implement Stage 1, 2, or 3 of the refactoring
- Build specific classes or features
- Debug or test code

Simply copy the template, fill in the stage-specific instructions, and paste to Claude.

---

## Quick Start

### 1. Understand the Plan
```bash
# Read the full refactoring strategy
cat REFACTORING_PLAN.md
```

### 2. Start Implementation (with Claude)
```
I want to start Stage 1 of the refactoring.

[Paste template from CLAUDE_PROMPT_FILTER.md]

STAGE 1 FOCUS:
1. Create src/core/GameConstants.js
2. Create src/ui/EventBus.js
3. Create src/ui/TabManager.js
4. Create tests/ directory with GameConstants.test.js

Please implement these three classes + tests...
```

### 3. Continue Through Stages
- **Stage 1**: Foundation (GameConstants, EventBus, TabManager)
- **Stage 2**: Core Logic (ActionManager, DistributionEngine)
- **Stage 3**: First Feature (ExclusionManager, ScriptSearch, ScriptGeneratorUI)
- **Stage 4+**: Other Tabs (SECompatibilityUI, BestAdvertisersUI)

---

## Key Principles

✅ **Incremental**: Refactor in phases, not all at once  
✅ **Safe**: Keep old script.js, validate side-by-side  
✅ **Tested**: Tests accompany each new class  
✅ **Decoupled**: Use EventBus to separate concerns  
✅ **Documented**: Each stage is clear & reversible

---

## Issues Being Addressed

1. **Duplicate Constants** (script.js:1434-1437)
   - BASE, W1_MULT, W2_MULT, DECAY hardcoded in multiple places
   - Solution: GameConstants as single source of truth

2. **Duplicate tagCap Logic** (script.js lines 785 & 1656)
   - Same if/else chain appears in two functions
   - Solution: Extract to utility method, use in both places

3. **Brittle Tab Navigation** (positional indexing)
   - Tab switching uses array positions
   - Solution: TabManager with enum-based navigation

---

## First Feature: Deduplication + Search

**Problem**: When excluding actions, user can add "Action" 15 times (once per instance)

**Solution**:
- ExclusionManager: One category = one exclusion (set-based)
- ScriptSearch: Filter exclusion list as-you-type
- ScriptGeneratorUI: Searchable, removable exclusion list

**UX**: Click "Exclude: Action" → appears once in list → searchable → removable

---

## File Structure After Refactoring

```
hollywood/
├── .arber/                    # This directory (guidance & plans)
│   ├── README.md
│   ├── REFACTORING_PLAN.md
│   └── CLAUDE_PROMPT_FILTER.md
├── src/                       # New code (class-based architecture)
│   ├── core/
│   │   ├── GameConstants.js
│   │   ├── DistributionEngine.js
│   │   └── ActionManager.js
│   ├── features/
│   │   └── scriptGenerator/
│   │       ├── ScriptGenerator.js
│   │       ├── ExclusionManager.js
│   │       ├── ScriptGeneratorUI.js
│   │       └── ScriptSearch.js
│   ├── ui/
│   │   ├── TabManager.js
│   │   ├── UIRenderer.js
│   │   └── EventBus.js
│   └── utils/
├── tests/                     # Tests for new code
│   ├── core/
│   └── features/
├── index.html                 # Updated to use new architecture
├── styles.css                 # (unchanged or modularized)
├── data.js                    # (original, or integrated into GameConstants)
├── script.js                  # (original, kept until full migration)
└── README.md                  # Original readme
```

---

## Decision Points

### After Stage 3 (First Feature Complete)
- **Decide**: Should this go back to the original maintainer as a PR?
- **If YES**: Create PR with clear commit history, reference original issues
- **If NO**: Maintain locally, keep synced with your fork

### During Implementation
- **Found more duplicates?** Document in issues, add to plan
- **Code not working?** Use old script.js as fallback, debug with tests
- **Need to adjust architecture?** Update the plan doc, communicate changes

---

## Testing Strategy

### Unit Tests (per class)
- GameConstants: Verify all constants are frozen, accessible
- ExclusionManager: Prevent duplicates, test all methods
- ScriptSearch: Filter accuracy, case-insensitivity
- DistributionEngine: Output matches original calculations (bit-for-bit if possible)

### Integration Tests
- ScriptGenerator end-to-end: Exclude → Search → Remove
- Tab switching: TabManager correctly shows/hides content
- Existing functionality: Script Generator, SE Compatibility, Best Advertisers all work

### Validation
- Run original + refactored versions side-by-side
- Compare outputs numerically (DistributionEngine)
- Test all three tabs in browser

---

## Questions?

If you're unsure about:
- **Architecture decisions**: See REFACTORING_PLAN.md Phase 2 (Key Classes)
- **Implementation details**: See the stage-specific sections in CLAUDE_PROMPT_FILTER.md
- **Git workflow**: See REFACTORING_PLAN.md Phase 4 (Git Workflow Strategy)

---

**Last Updated**: 2026-09-02  
**Status**: Ready for implementation  
**Next Step**: Read REFACTORING_PLAN.md, then use CLAUDE_PROMPT_FILTER.md to start Stage 1
