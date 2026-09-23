# Codex QA Test Coverage Audit

Date: 2026-09-18

## Standard Used

- `CLAUDE.md` is the local BDD/testing authority: tests are the source of truth.
- Existing tests may not be weakened, skipped, deleted, or rewritten just to
  make the suite pass without owner approval.
- Feature scenarios must keep their status honest:
  - `[automated]` means a Jest or Playwright spec really covers it.
  - `[verified]` means behavior was observed but not automated yet.
  - `[unverified]` must not be automated until the owner confirms the intended behavior.
- Each interactive control should have a behavior assertion, not just a
  presence check. Buttons, dropdowns, sliders, text fields, tabs, and toggles
  should prove their user-visible effect.

## Verification Result

- Unit/Jest: `263 passed`, `21 passed` suites on 2026-09-22.
- E2E/Playwright: `149 declared` tests across 14 specs.

## Coverage Added Or Confirmed

### App Shell

- Primary Build, Evaluate, and Market tabs switch visible panels.
- Language dropdown changes display names while preserving tag ids.
- Boot error and retry behavior remain covered by existing shell specs.

### Script Lab

- Generate button shows real results.
- Compatibility and movie-score sliders stay in sync with number fields.
- Target score text now has coverage through the score slider behavior.
- Starting Tags and Custom profile buttons switch active availability.
- Locked Elements collapsible hides/shows selectors.
- Excluded Elements collapsible hides/shows selectors.
- Lock dropdowns constrain generated scripts.
- Reset Locks clears locked selections and hides stale results.
- Add-row controls create extra selector rows.
- Per-category search filters selectable options.
- Excluded Elements counter updates, reset clears it, and exclusions persist
  after reload.
- Excluded category search filters excluded options.
- Save Library refuses an empty library with feedback.
- Load Library rejects invalid JSON shape with feedback.
- Generated result action buttons open Colman Graves or Marketing and carry
  the selected script forward.
- Generated row ids and stable hooks are covered by DOM/unit tests.

### Colman Graves

- All seven category dropdowns render.
- Evaluate Script validates too few elements, too many elements, missing
  required pieces, and invalid genre mixes.
- Evaluation displays verdict, average fit, compatibility breakdown, commercial
  and artistic bonuses, movie score, score cap, audience notes, and conflicts.
- Generate Best Matches works from one selected seed and is not blocked by the
  full evaluate-script minimum.
- Best Matches category filter, minimum-fit filter, starting-tags-only toggle,
  suggestion add button, and mode tabs are covered.
- Reset clears the submission and hides the verdict.
- Save to Script Library adds an evaluated script to the library.
- Transfer to Marketing opens Marketing and shows analysis.
- Accessibility focus regression for hiding tab panels is covered.

### Marketing And Release

- Analyze Script button produces audience, holiday, movie-lean, advertiser, and
  campaign-duration results.
- Reset clears Marketing selection.
- Save to Script Library persists an analyzed script.
- Commercial and artistic score sliders and direct number inputs stay in sync.
- Distribution grid follows the extracted commercial-only formula.
- Owned-theatres input changes capacity split without changing demand.
- Striking Image and Artistic Ability toggles recalculate opening demand.
- Behemoth and Boutique toggles cover their gated week/decay policies,
  including stacked behavior.

### Build For Target

- Analyze Script and Build for Target mode buttons switch panels.
- Audience and advertiser checkboxes are selectable.
- Find Top Combinations works with no filter, audience filter, advertiser
  filter, and optional tag constraints.
- Reset clears checked filters and hides results.
- One pick per category is accepted.
- ~~Story-element budget slider and input stay in sync~~ - stale. That slider
  (`#targetedElementsSlider`) is not in the markup; the lookup fell through to a
  NaN branch returning 10, so the control did nothing here. Build for Target now
  reads the global Max Element Pool, pinned by TC05-000015.
- Over-budget validation names both selected count and budget.
- Script Lab exclusions are used as shared source of truth.
- Ranking is checked for descending advertiser fit.

## BDD Quality Findings

- Strong: most scenarios are phrased as user behavior, not implementation
  trivia. They describe intent in owner language and point to real specs.
- Strong: unverified assumptions are explicitly marked and were not automated.
  That prevents guessed behavior from becoming false source of truth.
- Improved: E2E test IDs now have a unit guard. Duplicate leading IDs fail the
  Jest suite before they can make traceability ambiguous again.
- Improved: BDD status markers now have a unit guard. Every scenario must keep
  exactly one `[automated]`, `[verified]`, or `[unverified]` marker in the
  scenario comment block.
- Improved: E2E behavior from boot failure, genre mix, search persistence,
  maximum-score distribution, Behemoth UI, and empty-state navigation now has a
  named home in the feature files instead of living only in spec titles.
- Improved: missing scenarios were added for empty-library save, invalid
  library load, Script Lab generated-script transfers, Excluded Elements
  collapse/search/add-row behavior, Graves save/transfer behavior, Graves
  filter behavior, and score text-input behavior.
- Improved: a brittle negative-control Playwright test was changed to assert the
  rendered hidden state directly instead of catching an intentional framework
  assertion failure.

## Remaining Gaps Requiring Product Decision

- Script Library download/upload round trip: invalid load and empty save are
  covered, but a full valid save-download-load workflow is still unverified.
- ~~`unlockBlockedLocksButton`~~ — **closed 2026-09-22, no product decision
  needed.** The conflict path does not exist: the branch fires only when a
  locked element is excluded, and such a lock is cleared with a message before
  generation runs. The control and its handlers were deleted; the guard that
  refuses generation stays.
- ~~Graves exclusion warning journey~~ - **closed 2026-09-22.** It cannot
  happen: banning an element removes it from the Graves script immediately and
  names it ("Removed from this script because they are now excluded: Wild
  West."), so a script never holds a banned element to be warned about. The
  generic notice covers the other half, and was watched: 24 Settings hidden,
  "Script Lab is hiding suggestions: 193 excluded elements."
- ~~Graves selected excluded Setting behavior~~ - **closed 2026-09-22.** The
  rule is settled and recorded in docs/GAME_RULES.md section 5: one exclusion
  list feeds every context, a ban removes the element everywhere at once, and a
  lifted ban restores it with no reload. Pinned by TC09-000018.
- Graves unavailable-Setting message: **parked for owner decision.** The global
  exclusion rule is settled, but the UI copy that explains "Script Lab
  exclusions are hiding this choice" is still undecided.
- ~~Marketing audience interest legend~~ - **closed 2026-09-23.** Pinned by
  TC04-000027.
- ~~Holiday bonus later-week behavior~~ - **closed 2026-09-23.** Owner confirmed
  the bonus affects opening week only; TC04-000019 now asserts weeks 2-8 remain
  unchanged.
- ~~Build for Target no-match empty state~~ - **closed 2026-09-22.** The path
  exists: the generator discards any combination that does not spend the budget
  in full, so a pool too thin to fill it returns nothing. Measured - three story
  elements against a budget of ten yields zero combinations where the full pool
  yields twenty. Reached by excluding most story elements, or raising Max
  Element Pool past the remaining supply.
- ~~Build for Target with both audience and advertiser selected~~ - **closed
  2026-09-23.** Semantics are settled:
  `findTargetedCombinations` reads `if (advertisers) ... else if (audiences)`,
  so an advertiser overrides the audience rather than narrowing with it. Pinned
  through the UI by TC05-000016.

## QA Recommendation

Do not delete the hidden Compatibility Numbers tests until every behavior they
protected has a named home in Colman Graves, Marketing, or a unit test. The
current Colman Graves score-breakdown unit/DOM coverage preserves the pieces
the owner explicitly liked: average fit, script synergy, commercial/artistic
bonuses, potential movie score, score cap, conflicts, and transfer action.
