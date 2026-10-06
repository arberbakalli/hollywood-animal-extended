# Parked Features

Feature ideas the owner wants kept visible and easy to find, not lost in chat
history. Not scoped, not scheduled — pick one up when ready.

---

## Freshness audit & reset — PRIORITY: MEDIUM

**Raised:** 2026-10-06, after the owner played for a week and returned.

**Problem:** Elements can be set to Fresh/Stale/Rotten via pills in Build for Target, but there is no way to see at a glance which elements are in which state, and no way to reset all to Fresh. After a 7-day break, the player must cycle through each element manually to remember the state.

**Needed:**
- A freshness audit panel (all story elements + current state: Fresh / Stale / Rotten)
- A "reset all to Fresh" button
- Quick reference badge on the Build for Target panel showing count by state (e.g., "3 Stale, 1 Rotten")

**Data location:** `hac.freshnessStates.v1` in browser storage (one entry per element); rules in `docs/GAME_RULES.md` section 9.

**Why parked:** UX design choice needed — where does the audit panel live (new tab? side panel?), and how prominent should the reset action be?

---

## Near-duplicate results dedup rule — PRODUCT NOTE

**Decision:** 2026-10-06 — go with **Option 2: Exact duplicates only**. Keep current rule; one-element variants stay in results lists.

**Context:** Highest Commercial (pool 7) had 23 of 66 result pairs differing by only 1 element; Build for Target had one Supporting Character set repeat in 9 of 20 results. Question: how different must results be?

**Why this choice:** Player may want to see multiple near-variants as proof of viability; shorter lists can feel restrictive.

**Revisit:** If player feedback indicates near-duplicates feel like noise rather than options, revisit to Option 1 (at least 2 story elements differ, drop the lower-ranked).

---

## Marketing & Release realism pass — PRIORITY: HIGH

**Raised:** 2026-10-03, after in-game release screenshots showed large gaps
between the calculator's screening demand and the game's attendance/profit.

See `docs/MARKETING_RELEASE_INVESTIGATION.md`.

Core questions:

- Factory Policy/building appears to add an opening-week release boost somewhere
  around 11% to 39%, but the source formula is not yet extracted.
- One high-fit advertiser can be financially worse than four decent advertisers;
  the app's "Top Pick" framing is probably rating-focused, not profit-focused.
- Attendance/occupancy is not modelled by the current distribution grid, so the
  app may overstate how many screenings are useful.
- Recommended Advertisement Duration may need to become part of a broader
  campaign strategy panel instead of a small timing widget.

Do not guess formulas from screenshots. Extract game files or run controlled
in-game tests before changing source data.

---

## Genre Synergy — PRIORITY: HIGH

**Raised:** 2026-09-26, during the JSON data cleanup. **Raised again and set
to high priority by the owner:** 2026-09-30 ("pair the genres"), after an
earlier session did not carry it forward. Pick this up first.

**Owner clarification 2026-09-30:** the core is a genre-pair view: pair
Genre 1 with each other genre and show whether it is a good match, straight
from the game file's `GenrePairs.json` scores. That is direction 1 (and the
table in direction 3); direction 2 stays optional.

The three candidate directions, for reference:

1. **Surface existing `GenrePairs.json` data in the UI.** The data already
   exists — `data/GenrePairs.json` has a `primary`/`secondary` bonus score
   for genre pairs (renamed from `Item1`/`Item2` during the cleanup), used
   internally by `calculateGenrePairScore()` in
   `src/evaluation/compatibilityEngine.js` and `getCompatibleGenres()` in
   `src/generator/scriptGenerationEngine.js` — but never shown to the
   player. A script currently gets a genre-pair bonus without the player
   knowing why, or what pairs synergize well before picking a second genre.
2. **Generation-time synergy hints.** Have the generator actively favor or
   suggest high-synergy genre pairs, beyond just scoring what's already
   picked — a more active nudge than a passive score.
3. **A standalone genre-pair reference table/visualization.** A dedicated
   panel showing all genre-pair synergy scores at a glance, independent of
   an in-progress script — similar in spirit to the force-directed
   compatibility graph built as a one-off visualization during this
   session (not shipped in the app).

**Why parked:** not one clean feature — likely some combination of the
three above, and which combination (and how synergy surfaces without
overwhelming the existing Script Lab UI) needs a design decision the owner
hasn't made yet. Ask which combination before building.

**Data location:** `data/GenrePairs.json` (11 genres, `primary`/`secondary`
numeric scores per pair — already cleaned up, no re-extraction needed
unlike the unlock-info item below). The genre-pair bonus applies only when
the second genre holds at least 35% (`docs/GAME_RULES.md` section 6).

---

## Story element unlock info (date / recipe)

**Raised:** 2026-09-26, during the JSON data cleanup.

Every character-slot tag in the extracted game file carries a `Condition` in
`parameters.Condition` (present in `data/TagData.json`'s git history — not
currently in the cleaned-up shipped file) describing when it becomes
available:

- **Date-gated**, e.g. `DATE:>=01-01-1929` — a real calendar year.
- **Recipe-gated**, e.g. `RECIPE:SUPPORTINGCHARACTER_PARENT_FIGURE:EVENTS_CITY_SIEGE:THEME_LONG_JOURNEY`
  — unlocked by having used specific other tags first, no date involved.
- **Recipe-start / recipe-trash variants** — same idea, different unlock
  category (starter recipe vs. joke/trash content).

**Idea:** surface this in the UI — "unlocks in 1935" for date-gated tags,
"unlocks after using X + Y + Z" for recipe-gated ones — so the player
understands why a tag is greyed out or unavailable.

**Why parked:** this is bigger than "show a year." A meaningful minority of
tags are recipe-gated rather than date-gated, so the feature needs a design
decision on how to present a non-date unlock condition, not just a data pull.
Not scoped yet — no data model, no UI mockup, no owner ruling on presentation.

**Data location:** re-extract `parameters.Condition` per tag from
`git show <pre-cleanup commit>:data/TagData.json` when picking this up, the
same way `gender` was recovered — see `docs/GAME_RULES.md` §8 for the
precedent.

