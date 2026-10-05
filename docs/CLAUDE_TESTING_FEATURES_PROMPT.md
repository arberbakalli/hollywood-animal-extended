# Claude Prompt: Testing Features Lab

You are working in `hollywood-animal-extended` on the experimental branch:

`codex/testing-features-lab`

## Mission

Build planned features with low owner interaction, but keep production safe.
Use `testing-features.html` and the lab branch as the sandbox. Main is stable;
do not merge or push to main unless the owner explicitly asks.

## Context

Read these first:

- `AGENTS.md`
- `docs/GAME_RULES.md`
- `docs/TESTING_FEATURES_LAB.md`
- `docs/COLOR_PALETTE.md`
- `docs/PARKED_FEATURES.md`
- `docs/ACT2_POLISH_HANDOVER.md`
- `docs/MARKETING_RELEASE_INVESTIGATION.md`
- `tests/TEST_COVERAGE_ROADMAP.md`

## Working Rules

1. Use the branch as the isolation layer. A separate page cannot isolate shared
   JavaScript modules.
2. Prototype visibly in `testing-features.html` or feature-specific lab files.
3. If you edit shared modules, list the shared-module risk in your summary.
4. Preserve game-source truth and exact game text unless the owner gives a new
   observation.
5. Tests are source of truth. Do not change a test just to make code pass.
6. Keep changes small and reviewable.
7. Run focused tests after each meaningful slice.
8. Document what changed, why, and what still needs owner judgment.

## Feature Priorities

Update 2026-10-05: all eight prototypes now exist. Inspect the implementation
and `docs/TESTING_FEATURES_LAB.md` before adding more. Lab-only ESM modules live
in `lab/`, not `src/`, because the main-page module guard owns that tree.
`testing-features.css` is scoped to the lab page. No production module or
existing executable test was changed for these prototypes.

Available tools: Release Strategy Lab, Advertiser Strategy, Distribution
Calibration, Genre Synergy, Script Diversity, Award Targets, Released-Film
Tracker, Unlock Info. Their focused suite is
`tests/e2e/testing-features.spec.js`; pure lab tests are
`tests/testing-features.test.js`.

Research is the valuable next contribution: recover actual Factory and
attendance/advertiser reach formulas and original unlock conditions. Do not
turn the screenshot ratios or sandbox boost into game truth. Award Targets
currently supplies planning guidance; the exact awards model remains open.
Main already deduplicates generated scripts; the lab displays candidate-list
deduplication so the owner can inspect it.

Use your own worktree if Codex is still writing this tree. No parallel browser
runs on the same results directory or server port.

1. Distribution Calibration
   - Explore observed attendance being lower than current estimates.
   - Add a lab-only factory policy / first-week boost prototype.
   - Separate confirmed game-file formulas from owner observations.

2. Advertiser Strategy
   - Rework recommendations away from "single best advertiser only."
   - Explore multi-ad combinations for profit while avoiding bad audiences.
   - Compare against Build for Target logic before changing production behavior.

3. Script Diversity
   - Prevent generated results that are the same set of tags in shuffled order.
   - Show a clear message when no more unique combinations exist at the current
     constraints.

4. Act 2 Polish
   - Read parked notes and prototype only the smallest visible slice.

## Deliverable

Work in a loop:

Plan -> Build -> Test -> Review -> Document

At the end of each slice, report:

- Files changed
- Behavior changed
- Tests run and result
- Screenshots or local URL if useful
- Whether the feature is ready to port to main
- Product decisions still needed

