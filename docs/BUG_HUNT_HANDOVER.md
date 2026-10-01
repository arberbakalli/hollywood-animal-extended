# Bug hunt 2026-09-30 / 2026-10-01: what changed

**Status: on `main` and live.** The fixes were merged into `main` on 2026-10-01
(commit `4e6b12e`) and deployed to the live site. Jest 649 tests and Playwright
346 tests passed before the merge. Fixes made after the merge sit on the branch
`claude/bug-hunt-2026-09-30` until they are merged too.

Every fix has a test that failed before the fix. Every rule the owner set is in
`docs/GAME_RULES.md`. Every bug, with the old commit that caused it, is in
`docs/KNOWN_ISSUES.md` under "Owner bug hunt 2026-09-30".

## What was fixed

**Script Lab**
- Max Element Pool and Target Movie Score are one to one, 5 to 10. Pool 8 now
  makes 8 story elements (before: it went 7, then 9).
- One Generate click makes 15 scripts, shows 5, and Show more pages the rest.
- Pinning a script keeps the 5-at-a-time pages; a pasted script name is kept.
- A card names the clash its script holds ("Clash: Evil Monster × Long
  Journey (1.0)").
- Highest Artistic / Commercial respect the compatibility target; a card that
  falls short says so.
- Banning an element of a generated script hides the results and asks for a new
  Generate. A refused Generate clears the old results.
- The Genre + button stops at 11 rows (and a ban profile with all 11 genres
  keeps all 11).

**Colman Graves (Evaluate and Best Matches)**
- Swap Suggestions: every element in a red pair gets a slot that clears the
  clash; a swap never brings a clash back (Long Journey no longer returns).
- Best Additions: a note when fewer story elements fit than slots are free,
  with a "Lower to 3.5+" button; at the full budget it still lists Genres.
- Evaluate results hide when the script changes ("Script changed. Press
  Evaluate Script to update."); Best Matches redraws for the new script.
- The verdict and the Average Fit number agree (3.476 shows 3.5 and is Common).
- A 1.0 conflict reads Severe.
- Swap's "Show more" counts only rows that are really hidden.
- Likely Audience uses the same model as Marketing, so both tabs name the same
  audiences.

**Scoring**
- The Rating Limit table: 5-6 story elements top out at 6.0 (was 7.0).
- A stored movie score is the tenth the screen shows (fixed the TC24 flake).
- A genre pair scores the same in both directions (Hardened Cynic's 36 pairs).
- A 50/50 genre script scores the same whatever order the genres were added.

**Build for Target**
- No suggested combination holds a pair below 2.0; a clash between two of your
  own locks is named.
- Cards hide when the pool, a lock, an audience, an advertiser or a ban changes.
- The Audience Compatibility table hides a ban at once.

**Marketing & Release**
- Advertiser scores carry one decimal, rounded half up, graded on that number.
- A score typed above 10 or below 0 is read as 10 or 0.
- Both studio-policy decay gates open from 9 and above.
- The holiday boost is the percentage the row shows; holidays list best first.
- Analyze results hide when the elements or scores change; the distribution
  calculator stays on screen.
- A refused Analyze clears the old results, and its reason is never replaced.

**Script Library**
- Save counts story elements, not tags. Import skips entries with duplicate
  elements or two Settings, splits genre shares into 5% steps, and counts
  scripts already loaded. "Loaded 1 script." for one script.

## Still open

- **Needs the owner:** the Age & Gender Appeal gender toggle does nothing for 38 unisex characters
  that have no gender-specific data (hide it, explain it, or extract data); the
  vanished Evil Transformation row (never reproduced; send the clicks).
- **Parked, high priority:** Genre pairing (`docs/PARKED_FEATURES.md`).
- **Not yet audited:** a ban profile with duplicate ids makes two rows; pinned
  Library scripts keep a banned element; freshness order after Show more.

## For the next session

1. Merge the branch into `main` again if it has commits that `main` lacks
   (`git log main..claude/bug-hunt-2026-09-30`).
2. Run `npm test` and Playwright on an isolated port (one Playwright run at a
   time).
3. Codex has its own branch, `codex/hardening-verification`, built on an older
   commit of this work. Merge it with care.
