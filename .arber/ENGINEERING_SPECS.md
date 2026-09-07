# Engineering Specs

Date: 2026-09-05. Branch: `major-changes`.

Three changes, in build order. Spec 1 is the priority: it fixes advice that is
currently wrong. Specs 2 and 3 are additive and independent of each other.

Measured baseline on the real dataset (250 tags, inside a `node:vm` sandbox, so a
browser will be faster):

- Add scan, 250 candidates against a 9-tag set: 11 ms
- Swap scan, 9 slots x 250 candidates: 62 ms

No precomputation layer is needed. `GAME_DATA.compatibility` is already a nested
hashmap with O(1) pair lookup, and set-level results cannot be cached because the
key space is roughly 250-choose-9.

---

## Spec 1 - Set-aware Best Matches

### Problem

`src/evaluation/gravesBestMatches.js:31-51` loops every selected tag against every
candidate and pushes one row per pair, scored only by
`getRawCompatibilityScore(selectedTag, candidateTag)`.

The list is therefore ranked by the single best pair, not by fit with the script.
Any candidate that scores well against one selected element rises to the top even
when it conflicts badly with another. The user adds it and their overall fit
drops. The panel is confidently wrong in exactly the situation it exists to help
with.

For a real instance, select Drama and Ancient Egypt: `War Is Hell` scores 5.0
against Drama and 1.0 against Ancient Egypt, and the old ranking put it first.
The dataset holds 47 such candidates for that selection alone.

### Scoring model

For a candidate `C` against selected set `S`:

- `newPairs` = `getRawCompatibilityScore(C, s)` for every `s` in `S`
- `fitAverage` = mean of `newPairs`
- `worstPair` = min of `newPairs`, keeping which `s` produced it
- `resultingAverage` = `calculateMatrixScore([...S, C]).rawAverage`
- `delta` = `resultingAverage` minus `currentAverage`

Rank by `fitAverage` descending.

Ranking by `fitAverage` gives the same order as ranking by `resultingAverage`,
because `resultingAverage` equals `(existingPairSum + newPairSum) / (existingPairCount + n)`
and both `existingPairSum` and `existingPairCount` are constant across candidates.
So compute only the `n` new pairs for ranking - O(n) per candidate rather than
O(n^2). Compute `resultingAverage` only for the rows actually rendered, since it
is needed for display, not for ordering.

`worstPair` is required, not optional. An average can hide a single severe
conflict, which is the failure mode this spec exists to remove. The in-game
dossier surfaces bad pairs explicitly and so must this panel.

### UI

Three modes in the Best Matches panel. Default is Best Additions.

**Best Additions** (new, default)

Group rows by `worstPair` using thresholds already used elsewhere in the app. Do
not invent new bands - reuse whatever `getGravesVerdict` and the conflict
detection in `findGravesConflicts` already use, so a score means the same thing on
every screen.

- Successful: no new pair below the conflict threshold
- Common: mid-range
- Unsuccessful: at least one new pair below the conflict threshold

Each row shows:

- candidate name and category
- `currentAverage` -> `resultingAverage` with signed `delta`, e.g. `3.8 -> 4.1 (+0.3)`
- when `worstPair` is below the conflict threshold, a warning chip naming the
  clashing selected element, e.g. `clashes with Drama (1.0)`
- existing Add button, unchanged behaviour

Show unsuccessful rows rather than filtering them out. Seeing that the highest raw
match is also a conflict is the insight the current panel destroys.

**Swap suggestions** (new)

For each selected tag `s`, compute the script average with `s` removed. The tag
whose removal raises the average the most is the biggest drag. For that slot, rank
replacements with the same model as Best Additions.

Row format: `Replace Drama with Thriller: 3.8 -> 4.3 (+0.5)`.

Budget 62 ms measured for a full 9-slot scan. Acceptable for a button-triggered
action. If it ever needs trimming, restrict to the single worst slot.

**Pairwise matches** (existing behaviour, moved)

Keep the current one-row-per-pair list exactly as it is today, as a secondary
mode. It is useful for exploring a single element, it just must not be the
default.

### Notes

- The category filter, minimum fit and starter-only filters apply unchanged in all
  three modes.
- Minimum fit filters on `fitAverage` in the new modes, not on a single pair score.
- Keep `getRawCompatibilityScore` as the single source for pair values.

### Acceptance

- General rule: given any selected set, a candidate that scores highly against
  one element but conflicts with another must not rank above a candidate that
  scores moderately against all of them, and must carry a visible conflict
  warning naming the element it clashes with.
- Concrete regression case, verified in the shipped data: with Drama and Ancient
  Egypt selected, `War Is Hell` scores 5.0 against Drama and 1.0 against Ancient
  Egypt. It topped the old list. It must now rank below balanced candidates such
  as `Outcast` (5.0 / 4.0) and carry a clash warning. Nothing about this pair is
  special - it is one reproducible instance of the rule above.
- Every rendered row's `resultingAverage` matches
  `calculateMatrixScore([...selected, candidate]).rawAverage`.
- Switching to Pairwise mode reproduces today's list unchanged.
- Add scan stays under 50 ms for a 10-tag selection.

---

## Spec 2 - Evaluate with Colman Graves hand-off

### Problem

A generated script can be sent to Marketing but not to Graves, so the natural path
- generate, judge, then market - has a missing middle step. This is also what
makes the three product areas read as containers rather than a pipeline.

### Change

Generalise `transferScriptToAdvertisers(uniqueId)` in
`src/library/scriptLibrary.js:171`. It is already almost context-agnostic: the
only advertiser-specific parts are the literal `'advertisers'` context string and
the closing `analyzeMovie()` call.

    transferScriptToContext(uniqueId, targetContext)

- `targetContext` is `'advertisers'` or `'graves'`
- after populating selectors, run the target's own action: `analyzeMovie()` for
  advertisers, `evaluateColmanGravesScript()` for graves
- keep `transferScriptToAdvertisers` as a thin wrapper so existing call sites and
  tests do not change

Add an "Evaluate with Graves" button beside the existing "Find Best Advertisers"
on both card types - generated cards (`src/generator/scriptGenerator.js`, near the
existing `.transfer-link-btn` binding at :410) and Script Library cards. Order the
buttons Graves first, then Advertisers, matching the pipeline.

### Acceptance

- Both buttons appear on generated and saved script cards.
- Graves receives all tags including multi-genre percentages, and auto-evaluates.
- Graves rejects scripts outside its 5 to 10 element range with the existing
  feedback message rather than failing silently.
- Existing "Find Best Advertisers" behaviour is unchanged.

---

## Spec 3 - Distribution calculator source of truth

### Source

Extracted game-file distribution grid:

    const BASE = 1000;
    const W1_MULT = 2;
    const W2_MULT = 1;
    const DECAY = 0.8;

    W1 = commercialScore * W1_MULT * BASE
    W2 = commercialScore * W2_MULT * BASE
    W3+ = previousWeek * DECAY

### Change

Do not include artistic score in screening requirements. Do not include
community-estimated Behemoth decay or budget modifiers in this calculator unless
the exact formula is extracted from the game files.

Owned screenings are capacity only. They split demand into owned/rented/spare
after the weekly demand has been calculated; they do not change audience demand
or retention.

### Acceptance

- Commercial score 5.0 produces demand `[10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]`.
- Changing artistic score does not change the distribution grid.
- Changing owned screenings changes the owned/rented split, not the demand.
- Any future modifier must cite an extracted game-file formula before shipping.
