# Bug hunt handover (2026-09-30 to 2026-10-01)

Pick-up point for the next session. Branch `claude/bug-hunt-2026-09-30`, based on
`main` at `62e9c05` (the history reset of 2026-09-30 23:02). Not merged to `main`.

## State at handover

- 37 commits on the branch. Every owner ruling and every approved test edit is
  in its commit message.
- Last full measure: Jest 47 suites / 649 tests green. Playwright 340 / 0 on the
  last full run; every area touched after it was re-run and is green, but the
  full suite was not run once more at the very end. **Run it first.**
- Bug log: `docs/KNOWN_ISSUES.md`, "Owner bug hunt 2026-09-30" (12 bugs, each
  with the commit that introduced it). Rules: `docs/GAME_RULES.md`.
- New tests: `tests/bug-hunt-2026-09-30.test.js` (Jest) and
  `tests/e2e/bug-hunt-2026-09-30.spec.js` (Playwright). Run E2E on an isolated
  port (see "How to run").

## First steps next session

1. `git fetch`, check out this branch, and run both suites in full.
2. The owner verifies on localhost (serve this worktree, not `main`).
3. With the owner's go-ahead, merge to `main`. Codex has a branch
   `codex/hardening-verification` based on commit `6e49548` of this branch, in
   `../hollywood-animal-extended-codex-qa`; it touches `AGENTS.md`,
   `tests/scenarios/product-hardening.feature` and adds tests. Merge with care.

## Still open

**Waiting on the owner:**
- Genre share weighting: should pair scores be weighted by genre share? The
  owner will check in the game (`docs/KNOWN_ISSUES.md`, open findings).
- Genre pairing feature: parked as PRIORITY HIGH in `docs/PARKED_FEATURES.md`
  (genre-by-genre match view from `GenrePairs.json`).
- The Evil Transformation row that disappeared on 2026-09-30 was never
  reproduced (145-action explorer found nothing). Needs the owner's clicks.

**Audit not yet done** (the invariant audit covered Script Lab, Evaluate, Build
for Target, Marketing & Release and the Library; these were not audited):
- Age & Gender Appeal panel: the Supporting Character lookup uses the
  `SUPPORTING_CHARACTER_` id form and `TagsToAgeCompatibilityData.json` has no
  supporting keys, so the gender toggle never changes those ratings. Verify.
- Audience Compatibility table (Build for Target tab): reads exclusions from
  `HACExclusionStore`, not the list Graves reads. Check both agree.
- A ban list profile with duplicate ids makes two rows; the count badge counts
  both (`appShell.js` Load Profile). Low.
- Pinned Library scripts keep a banned element (by design for now); decide
  whether the card should flag it.
- Freshness: Show more and a pin re-render keep the old order; the notice covers
  it. Confirm with the owner.

**Method for the rest of the audit** (what worked): for each feature, list the
invariants that link it to other features; probe each against real data over the
whole value range in the running app; write a class test (every pool 5-10, every
agency, every genre pair) that fails first; fix; re-run both suites.

## How to run

- Jest: `npm test` (never bare `npx jest`).
- Playwright on its own port: the config is
  `output/playwright.isolated.config.mjs` (gitignored; it extends
  `playwright.config.js` with port 4182 and `output/test-results-bughunt`).
  One Playwright process at a time.
