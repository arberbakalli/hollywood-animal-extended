# Parked Features

Feature ideas the owner wants kept visible and easy to find, not lost in chat
history. Not scoped, not scheduled — pick one up when ready.

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

**Data location:** `extractedFilesFromGameSourceOfTruth/TagData.json` has
`parameters.Condition` for all 250 tags (checked 2026-10-05); the app's
`data/TagData.json` is a trimmed copy without it. A lab prototype is on
`codex/testing-features-lab` ("Unlock Info").

---

## Award Targets

**Raised:** Act 2 polish, 2026-10-03 (moved from the removed
`docs/ACT2_POLISH_HANDOVER.md`).

Let the player aim a film at one of the game's year-end lists: Box Office
Success (highest box office receipts), Critical Acclaim (critics' ratings,
influenced by artistic rating) and Fan Favorites (Kinomark rating, influenced by
commercial rating). A lab prototype exists on `codex/testing-features-lab`.

**Open decision:** replace the Highest Artistic / Highest Commercial buttons, or
sit beside them as a separate target selector?

---

## Released-Film Tracker

**Raised:** Act 2 polish, 2026-10-03 (moved from the removed
`docs/ACT2_POLISH_HANDOVER.md`).

Help the player see when repeated elements may become stale in the game. The
tracker warns only; the freshness pill stays the per-element state the app
uses. A lab prototype exists on `codex/testing-features-lab` ("idea still in
baking").

**Open decision:** count the last N released films, or ask for an in-game
release date so the tracker can follow the game's 500-day window?

---

## Offline fallback dataset

**Raised:** 2026-09-07 (moved from the removed `TODO.md`).

`data.js` ships `tags: {}`. A failed data load fails visibly: a banner, a retry
button, and `hollywood:failed` instead of `hollywood:ready`. That is the right
default.

**Open decision:** should the app bundle a fallback dataset so it degrades
instead of stopping? A product call, not a bug.

---

## Element Affinity Graph Precomputation — PRIORITY: LOW

Measurement baseline: 2-4ms per render (24K pair lookups, real data).
Current performance is solid. Planned optimization for after codex lands.
Data: measurement in `docs/TESTING_FEATURES_RESEARCH_2026-10-05.md` (section 4).
Code: src/ module with tests.
