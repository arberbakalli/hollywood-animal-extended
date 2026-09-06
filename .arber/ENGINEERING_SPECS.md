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

## Spec 3 - Behemoth studio policy toggle

### Source

In-game Behemoth policy, two distribution-relevant bonuses:

- "When a film's production budget exceeds $1,000,000, the number of viewers in
  the first week of release will increase by 25%."
- "Attendance of films with a commercial rating above 9 will fall 25% more slowly."

### Change

Add a third toggle, `behemothToggle`, beside Striking Image and Artistic Ability,
using the same markup and CSS pattern. Label it so the budget condition is
explicit, for example "Behemoth (budget over $1M)". The toggle asserts the
condition; do not add a currency input.

In `src/marketing/distributionPlanner.js`:

**Week 1 boost.** Behemoth multiplies week 1 only by 1.25. This is a different
shape from the existing boost, which covers weeks 1 to 4, so it needs its own
multiplier rather than folding into `getDistributionMultiplier()`.

    week 1     = base * openingViewerMultiplier * (behemoth ? 1.25 : 1)
    weeks 2-4  = base * openingViewerMultiplier
    weeks 5-8  = base

This budget boost stays week 1 only. The separate decay bonus below also lifts
week 2 - see "As shipped" for the amended behaviour.

**Decay.** `DECAY` is currently the constant `0.8`, a 20% weekly drop. "Falls 25%
more slowly" reduces that drop by a quarter, 20% to 15%, so retention becomes
`0.85`. Apply only when Behemoth is on AND the commercial score exceeds 9. The
commercial score is already an input (`comScoreInput`), so this condition is
checked automatically - no new UI.

    getDecayRate() => (behemoth && commercialScore > 9) ? 0.85 : 0.8

Register `behemothToggle` in `initializeDistributionToggles()` so it triggers
`recalculateDistribution` on change.

### As shipped, and the open item

Amended after review: the slower fall applies to week 2 as well. Week 2 keeps
half of week 1, which is a retention step like every later week, so an in-game
screenshot showing the Behemoth icon on weeks 2 and 3 reads as the bonus
covering that step too. Week 2 was previously written as an independent
multiplier, which no decay modifier could reach.

Both retentions now derive from one factor rather than separate literals:

    BEHEMOTH_SLOWER_FALL = 0.75      // "falls 25% more slowly"
    easedRetention(0.8) -> 0.85      // weeks 3-8
    easedRetention(0.5) -> 0.625     // week 1 -> week 2

Later weeks compound from the lifted week 2 rather than stepping back down.
The rate is rounded, because `1 - (1 - 0.8) * 0.75` evaluates to
0.8500000000000001 and the grid rounds up, surfacing as a whole extra
screening in week 3.

Decision: shipped on this inference rather than held. It is opt-in behind a
toggle, so the default is untouched, and `BEHEMOTH_SLOWER_FALL` is read in
exactly one place - changing that single constant repoints every week.

To verify: in game with Behemoth active and a commercial rating above 9, take
week 3 divided by week 2. 0.85 confirms the model. Anything else is the real
rate and goes straight into that constant.

### Explicitly out of scope

Striking Image and Artistic Ability currently do not stack: either one checked
gives x2, both checked still gives x2. This differs from an earlier build where
they compounded to x3. Left as-is by decision, pending in-game confirmation. Do
not change it as part of this spec.

### Acceptance

- Behemoth off reproduces today's numbers exactly for every week.
- Behemoth on with commercial score 9.5 raises week 1 by 25% and slows decay from
  week 3 onward.
- Behemoth on with commercial score 7 raises week 1 by 25% and leaves decay at 0.8.
- The toggle matches the existing two visually and in interaction.
