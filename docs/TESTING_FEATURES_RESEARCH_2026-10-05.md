# Testing Features: Research for the Owner Feedback Pass

2026-10-05. This file holds facts measured from the game data, real saves and the
running app, for whoever polishes the lab (codex on `codex/testing-features-lab`).
It changes no code. Items marked **Owner decides** are open questions, not rules.

## 1. Unlock Info: the conditions exist

The previous pass said "the current JSON files do not expose unlock conditions".
That is true of `data/TagData.json`, the trimmed copy the app loads. The full
extract `extractedFilesFromGameSourceOfTruth/TagData.json` has
`parameters.Condition` on all 250 tags:

| Condition form | Tags | Meaning |
|---|---|---|
| `DATE:>=1929` / `DATE:>=01-01-1929` | 58 | starting deck |
| `DATE:>=DD-MM-YYYY` (later), plus `DATE:>=1950` (`SLAPSTICK_COMEDY`, year only) | 127 | unlocks on that date, e.g. `WW2_EUROPE` 02-09-1939, `WW2_AFRICA` 20-06-1940, `WW2_PACIFIC` 08-12-1941 |
| `RECIPE:`, `RECIPE_START:`, `RECIPE_TRASH:` | 15 | made from other elements; `recipe.sourceTagIds` lists them |
| `DATE:1950` (30), `DATE:>1950`..`>1958` (9), `DATE:<1929` (10), `DATE:>=01-01-3000` (1) | 50 | do not fit the calendar; look like placeholders or "never". **Owner decides** how to show them |

These match the owner's three states: starting deck, a specific date, and
research or purchase. No tag has a per-tag Factory flag. Buying elements is a
policy effect (`POLICY_CONVEYOR_BONUS_1`, "You can purchase new story elements
to meet demands."), so any element past its date can be bought with that policy.

The conditions are plain text (`"DATE:>=02-09-1939"`); the dates are DD-MM-YYYY.

**Data drift found:** `GAME_DATA.starterWhitelist` in `data.js` is hand-typed
(57 ids), while the extract has 58 starting tags. Missing: `EVENTS_JOUSTING_TOURNAMENT`.
The main app therefore treats one starting element as locked: Apply Starting
Tags bans it (`src/app/appShell.js:357-366`). **Owner decides:** this conflicts
with `docs/GAME_RULES.md:538-541`, which fixes the starting pool at 57 and the
fresh ban list at 193. Following the game data makes them 58 and 192. Not fixed
here: it changes a written rule and the main app. (Resolved 2026-10-08: the
owner confirmed Jousting Tournament in a new game; the main app now has 58 / 192.)

## 2. Release Strategy: the decay is under-modelled

The owner reports that with Behemoth, Boutique and the right target audience,
later weeks barely fall in the game. The game text agrees that more than the
policies slows the fall (`localization/English.json`):

- `TUTORIAL_ADS_AGENTS_DESCRIPTION`: "The more accurate your choice, the slower
  attendance will decline from week to week."
- `TOOLTIP_AUDITORY_GOOD/NORMAL/BAD_INFO`: each audience group gives a slow,
  moderate or rapid decline.
- `AUDIENCE_INFO_FIRST_MESSAGE`: a better audience fit gives a higher Kinomark,
  so occupancy falls more slowly.
- Boutique says "25% more slowly" in one string and "twice as slowly"
  (`POLICY_BOUTIQUE_START_BONUS_3_DESC`) in another.

The app's weekly demand (`src/marketing/distributionPlanner.js:146-159`) starts
from the commercial score, and the decay rate (`resolveDecayRate`, `:278-284`)
depends only on the two policy gates (commercial and artistic score). No audience, advertiser or Kinomark
input reaches it. No JSON file holds a decay number. The 0.80, 0.85 and 0.90
values are readings, not data (`SOURCE_OF_TRUTH_MAPPING.md` marks 0.8 "Assumed").

**Owner decides / supplies:** weekly attendance for weeks 1-8 from a few
releases, each with the commercial and artistic score, the policies held, the
audience fit per group, the Kinomark and the advertisers used. Two pairs
separate the factors: same targeting with no policy, one, then both; and the
same policies with good against bad targeting. Until then the lab should say
"later weeks may fall slower than shown when targeting is good", not show a
number as truth.

## 3. Script Diversity: exact reshuffles are already gone

Measured in the running app (pools 5, 7 and 9; Generate, Highest Artistic,
Highest Commercial, Build for Target with two advertisers):

| Duplicate kind | Worst seen | Where |
|---|---|---|
| same element ids, reordered | 0 | nowhere: Script Lab (`scriptGenerator.js:60`) and Build for Target (`targetedAds.js:424`) both use a sorted-set signature |
| same story elements, only Genre/Setting/genre % differ | 3 pairs in 12 results | Highest Commercial, pool 9 |
| differ by one story element | 23 of 66 pairs | Highest Commercial, pool 7 |
| same supporting-character set repeated | 9 of 20 results | Build for Target, pool 7 |

So the owner's "3 support characters reshuffled in 4 results" is real, but it
is **near-duplicates**, not exact ones. Fixing it means a similarity rule.
**Owner decides:**

1. Does a script that differs only in genre percentage count as a duplicate?
   Script Lab's signature includes the percent, so today it does not.
2. How much must two results differ: at least two story elements? No repeated
   supporting-character set within one result list?

**Owner ruling 2026-10-06:** a genre-percentage difference alone is a
duplicate; otherwise only exact duplicates are removed. One shared key now
serves Script Lab and Build for Target (`docs/GAME_RULES.md`, "One result per
element set"). One-element variants and repeated supporting-character sets stay.

**Correction (review 2026-10-06):** the table row above ("same story elements,
only Genre/Setting/genre % differ") was not a percentage case. The generator
gives a genre set one fixed split, so the 3 pairs differ in a Genre or Setting
id and are still shown. Owner ruling 2026-10-06: they stay; a different Genre
or Setting is a different film.

## 4. Patterns worth acting on

1. **One signature, three definitions.** Duplicate checks exist in
   `scriptGenerator.js:60` (ids plus genre %), `targetedAds.js:424` (ids only)
   and `lab/labModel.js uniqueScripts` (JSON of sorted ids). They disagree on
   genre %. That disagreement causes the "same story, different genre %"
   results. One shared function, with the owner's rule, is the fix. Using a
   `Set` of string keys is already the pattern; the gap is the key, not the
   container.
2. **Edge list for element affinity.** `getRawCompatibilityScore` computes one
   pair at a time (`compatibilityEngine.js:165`). A genre-by-element view needs
   11 x ~240 pairs, and an element-by-element view about 28,000. Both are cheap
   once. Build one edge list `{ a, b, score }` per data load, and every view
   (best partners, clashes, cross-genre count) becomes a filter and sort over
   it, instead of re-scoring on every render.

   **Measured 2026-10-06, not built (owner):** the lab's genre-element ranking
   takes 2-4 ms per render with real data (24,255 pair lookups in the
   cross-genre mode; 105 successful Drama pairs, as on screen). A precomputed
   edge list would save at most those milliseconds. Parked as low priority in
   `docs/PARKED_FEATURES.md`. Note for a re-measure: open the Genre tab first,
   because the lab loads the pair data lazily; a run before that scores against
   empty data and reads 0 ms.
3. **Derive, don't hand-type, game facts.** `starterWhitelist` drifted from the
   game data (section 1). Build it from `parameters.Condition`.
4. **Count by data, not by sample.** The 0 vs 16 player candidates in the
   Pollux buckets (`docs/POLLUX_SAVE_EDITOR.md`) and the 0 vs 23 near-duplicate
   pairs above only showed up because many inputs were measured.

## 5. New feature request: elements by genre

The owner wants, per genre: which elements form the most successful pairs,
which clash most, and which are strong across many genres. Codex has started
`rankGenreElements` in `lab/labModel.js`, with "strong" at score >= 4 and
"unsuccessful" at < 2. These match the Successful and Unsuccessful pair bands in
`docs/GAME_RULES.md:369-373`. Pattern 2 above is the data
structure it needs.
