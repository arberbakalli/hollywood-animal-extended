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
- `docs/MARKETING_RELEASE_INVESTIGATION.md`
- `docs/TEST_QUALITY_GATE.md`

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

Update 2026-10-06: seven prototypes now exist. Inspect the implementation
and `docs/TESTING_FEATURES_LAB.md` before adding more. Lab-only ESM modules live
in `lab/`, not `src/`, because the main-page module guard owns that tree.
`testing-features.css` is scoped to the lab page. No production module or
existing executable test was changed for these prototypes.

Available tools: Release Strategy Lab, Advertiser Strategy, Distribution
Calibration, Genre Synergy, Award Targets, Released-Film
Tracker, Unlock Info. Their focused suite is
`tests/e2e/testing-features.spec.js`; pure lab tests are
`tests/testing-features.test.js`.

Owner feedback applied on 2026-10-05:

- Distribution Calibration and Genre Synergy are the strongest prototypes.
- Release Strategy shows week/demand only, with an optional 0-100% Factory
  opening-week estimate. Owner restored this lab slider on 2026-10-06; do not
  present its range or stacking as confirmed game truth.
- Advertiser Strategy needs redesign; keep movie lean, but do not bring back a
  giant visible movie-element multi-select.
- Script Diversity is not a standalone product. Its dedupe rule belongs inside
  generated result lists. The rejected lab tab has been removed.
- Award Targets should show all three goals together and attach movie/year/
  element notes.
- Released-Film Tracker is still debated; do not present date windows as
  confirmed freshness truth.
- Unlock Info uses `extractedFilesFromGameSourceOfTruth/TagData.json` for
  recovered date, recipe, starting-recipe and Trash King policy conditions.
  Do not invent quest/NPC gates unless another source file proves them.
- Genre Synergy now includes direct story-element pair scores and cross-genre
  counts, plus pair counts against the available 4+ story pool for the selected
  genre. Use the production compatibility engine and its 4+ / <2 bands;
  these counts are not movie outcomes. Keep Script Lab exclusions out of its
  available-element list.
- Script Lab and Build for Target already deduplicate their generated sets.
  Inspect a real output path before proposing another Set/Map layer. Graves
  additions and swaps are individual suggestions, not duplicate scripts.
- The compatibility JSON is already an adjacency matrix. An extra graph cache
  needs a measured query or rendering problem before it is worth maintaining.
- Best genre summaries retain all ties, not just the first alphabetical match.
  Drama + Comedy and Drama + Romance both give +0.25 commercial. Recommendations
  honor exclusions; reference rows remain visible and labeled.
- Advertiser Strategy no longer scores a hidden sample script or shows a static
  fit table. It presents movie lean and selected-campaign demographic coverage;
  the main-app recommendation model is not replaced.
- Unlock Info groups choices by category and uses the recovered condition and
  recipe records. Odd date conditions are labeled unclear, not guessed.
- A corrupt release journal blocks new writes rather than overwriting saved
  data. This tracker remains experimental and does not set game freshness.

Research is the valuable next contribution: recover actual Factory and
attendance/advertiser reach formulas and any quest/NPC layer behind unlock
recipes. Do not turn the screenshot ratios or sandbox boost into game truth. Award Targets
currently supplies planning guidance; the exact awards model remains open.
Main already deduplicates generated scripts; do not recreate a standalone lab
deduplication tool without a new owner decision.

Use your own worktree if Codex is still writing this tree. No parallel browser
runs on the same results directory or server port.

1. Distribution Calibration
   - Explore observed attendance being lower than current estimates.
   - Research Factory policy effects from game files before promoting or
     constraining the existing lab-only first-week estimate.
   - Separate confirmed game-file formulas from owner observations.

2. Advertiser Strategy
   - Rework recommendations away from "single best advertiser only."
   - Explore multi-ad combinations for profit while avoiding bad audiences.
   - Compare against Build for Target logic before changing production behavior.

3. Script Diversity
   - Prevent generated results that are the same set of tags in shuffled order.
   - Say when all unique candidates in the supplied batch are shown. Do not
     claim the entire search space is exhausted unless an exhaustive search
     actually proves it.

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

