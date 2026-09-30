# Parked Features

Feature ideas the owner wants kept visible and easy to find, not lost in chat
history. Not scoped, not scheduled — pick one up when ready.

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

---

## Genre Synergy

**Raised:** 2026-09-26, during the JSON data cleanup.

**Idea, not yet scoped** — owner picked a blend of three candidate
directions and said it needs more filtering/thinking through before
building, so this is intentionally left open rather than pre-decided:

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
hasn't made yet.

**Data location:** `data/GenrePairs.json` (11 genres, `primary`/`secondary`
numeric scores per pair — already cleaned up, no re-extraction needed
unlike the unlock-info item above).
