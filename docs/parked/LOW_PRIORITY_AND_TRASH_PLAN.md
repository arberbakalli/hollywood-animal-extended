# Parked Work Plan: Low-Priority Cleanup and Trash Elements

Status: planning only. No production behavior is changed by this document.

## Scope

This plan covers the intentionally deferred work that is outside the current
Testing Features prototypes, plus a possible Trash Element indicator.

## 1. Low-Priority Items

### Element affinity graph precomputation

Keep parked. The measured cost is only 2-4 ms per render, so an edge-list
cache is not justified yet.

Revisit only if profiling shows the affinity view becoming slow. If resumed,
precompute immutable edges from the existing compatibility data and verify
that the rendered scores are identical before and after the cache.

### Offline fallback dataset

Keep the current visible failure and retry behavior until there is a product
decision to ship a fallback dataset. A fallback would add a second data source
that could become stale, so it must not be inferred from the current JSON.

### Unused script-scoring engine

Make one explicit decision before changing it:

- wire its Best Artistic / Best Commercial ranking into a real product view; or
- remove the unused engine and its tests after confirming no runtime consumer.

Do not keep expanding its planned UI while it has no live app path.

### Module flip

Keep the classic-script architecture for now. A future ES-module migration
must be a separate project with a harness migration, script-load verification,
and a full browser pass. Do not mix it with product feature work.

### Calibration and production timing

Repair `tools/grade-distribution.mjs` before using it for any marketing or
distribution calibration. Complete the production timing benchmark only after
the measurement command and environment are stable. Record raw runs, not just
the summary.

### Script Library assertion strength

Strengthen the existing save/load test so it compares the restored script's
actual element IDs and metadata with the saved value. This is test hardening,
not a product behavior change.

## 2. Trash Element Indicator

### Product idea

Add a small, non-blocking UI indicator for trash elements. The game marks 15
of them, across Protagonist, Antagonist and Theme & Event (see Evidence below),
not only Theme & Event. Candidate wording:

**Trash element**

The indicator should use the same compact visual language as Fresh/Stale/Rotten
status, but must not imply a freshness state. It should appear consistently in
Script Lab, Colman Graves, Marketing, and generated results once the data is
confirmed and shared by the existing tag metadata.

### Evidence gate

Do not add tags to `docs/GAME_RULES.md` or hardcode a list from memory. The
list below comes from the game file; the owner approves it before it becomes
rule data. Record for every tag:

- tag ID and display name;
- whether Trash King is required;
- the observed gameplay effect;
- source: game file, controlled run, or owner observation;
- confidence and unresolved contradictions.

The owner approves the final list before it becomes rule data.

### Implementation plan after approval

1. Add a canonical `trashElement` field to the data layer, derived from the
   game file's `parameters.Rules` containing `TRASH` (one source; never a typed list).
2. Expose one helper for all surfaces, rather than separate category checks.
3. Render a compact `Trash element` badge beside the tag name.
4. Keep the badge informative only; it must not block selection or generation.
5. Add unit tests for metadata lookup and missing metadata.
6. Add Playwright coverage for Script Lab and one cross-surface result view.
7. Add a BDD scenario covering visibility, policy context, and non-blocking
   behavior.

## Evidence (game files, gathered 2026-10-08)

**The list.** `extractedFilesFromGameSourceOfTruth/TagData.json` marks exactly 15
elements `parameters.Rules: "TRASH, UNETHICAL"`. All 15 are in the app. Each is a
recipe (Trash Pit: "Create trash elements"):

| Category | Elements |
|---|---|
| Protagonist (7) | Toxic Revenger, Siamese Twin Sheriffs, Romantic with Popcorn Limbs, Parent in Invisible Clothes, Shit-Sucking Vampire, Girl with a Talking Vagina with Tourette Syndrome, Womanizer with Poisoned Balls |
| Antagonist (6) | Killer Toaster, Rapist Robot, Robber with a Thousand Penises, Demon Possessed by a Schoolgirl, Headless Dwarven Hypnotists, Cannibal Women's Book Club |
| Theme & Event (2) | Wizard War, Survival Tournament |

**Rules the game text states** (`localization/English.json`):
- `POLICY_TRASH_BONUS_1_1`: Trash King bonus "Use two trash elements per film in
  the story editor". This implies one trash element per film without it.
  Unconfirmed in play.
- `MARKS_CAP_TOOLTIP_TABLE_ROW_TRASHTAGS`: the Rating Limit tooltip has a row
  "One or more trash elements". Its Script / Movie numbers are not in the text
  files. **Parked (owner, 2026-10-08)**; the badge stays informative only.
- Two of the 15 disagree on gender (`KNOWN_ISSUES.md`, parked until played).

**Approved:** the owner verified the 15-element list in play on 2026-10-09; it is now `docs/GAME_RULES.md` section 11.

## 3. Priority Order

1. ~~Approve the Trash Element list~~ Done 2026-10-09 (GAME_RULES section 11). Next: build the label from the game file's `TRASH` rule.
2. Strengthen the Script Library round-trip assertion.
3. Repair the grade-distribution measurement tool.
4. Decide the unused script-scoring engine's fate.
5. Revisit marketing realism and other Testing Features items separately.
6. Consider graph precomputation, offline fallback, and the module flip only
   when their stated triggers occur.

## Sources

- `docs/PARKED_FEATURES.md`
- `docs/MARKETING_RELEASE_INVESTIGATION.md`
- `docs/GAME_RULES.md`
- `docs/KNOWN_ISSUES.md`
