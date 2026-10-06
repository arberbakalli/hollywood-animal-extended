# Parked Features

Feature ideas the owner wants kept visible and easy to find, not lost in chat
history. Not scoped, not scheduled — pick one up when ready.

---

## Find the missing age data — PRIORITY: HIGH (owner data task)

**Raised:** 2026-10-06, while building the lab's Element Preservation ranking.
Until this data exists, those characters rank as neutral on age and carry a
"No age data" flag.

**What is missing** (exact ids in `docs/KNOWN_ISSUES.md`):
- 18 characters with no age rating at all: the list under "18 character tags
  have no Age & Gender Appeal rating data" (5 Protagonists, 8 Antagonists,
  5 Supporting Characters).
- 38 unisex characters with no male/female split: the list under "Owner task
  (2026-10-01): complete the gender-specific ratings".

**Already ruled out — do not retry:** deriving them from the game's own
`StreamingAssets\Data\Configs\TagsToAgeCompatibilityData.json`. That file's
8-value arrays are a different, unrelated dataset (proof in KNOWN_ISSUES).

**Brief to paste to another agent:**

> Research only, do not edit data files. Repo: hollywood-animal-extended. Find
> the age-group appeal (Young / Mid / Old, and male vs female where the role is
> unisex) for the story characters listed in `docs/KNOWN_ISSUES.md` under "18
> character tags have no Age & Gender Appeal rating data" and "Owner task
> (2026-10-01): complete the gender-specific ratings". Our format is
> `data/AgeRoleCompatibility.json` (Good / Neutral / Bad per age group) and
> `data/TagsToAgeCompatibilityData.json` (YOUNG_M ... OLD_F, about 0.5-4.5).
> Do not use the game's `TagsToAgeCompatibilityData.json` arrays: they are
> proven unrelated (see KNOWN_ISSUES). Look in other game files, the Hollywood
> Animal wiki, Steam guides, community spreadsheets and Discord exports. For
> each value report the source (link or file and line) and whether it is
> observed in play or derived. Return one table: id, age group, gender, value,
> source. Mark every id you could not find.

When values come back, the owner approves them before they enter the data
files; the lab ranking then uses them with no code change.

---

## Freshness audit & reset — PRIORITY: MEDIUM

**Raised:** 2026-10-06, after the owner played for a week and returned.

**Problem:** In Script Lab, each story element can be set to Fresh, Stale or
Rotten with the pill on its Locked Elements dropdown and on result cards. There
is no way to see at a glance which elements are Stale or Rotten, and no way to
reset all to Fresh. After a 7-day break the player must check each element one
by one.

**Idea:**
- A freshness overview: every story element with its current state
- A "reset all to Fresh" button
- A count by state in Script Lab (for example "3 Stale, 1 Rotten")

**Data location:** `hac.freshnessStates.v1` in browser storage (one entry per element); rules in `docs/GAME_RULES.md` section 9.

**Why parked:** UX design choice needed — where does the audit panel live (new tab? side panel?), and how prominent should the reset action be?

---

## Near-duplicate results dedup rule — PRODUCT NOTE

**Decision:** 2026-10-06 — go with **Option 2: Exact duplicates only**. Keep current rule; one-element variants stay in results lists.

**Context:** Highest Commercial (pool 7) had 23 of 66 result pairs differing by only 1 element; Build for Target had one Supporting Character set repeat in 9 of 20 results. Question: how different must results be?

**Rule today:** `docs/GAME_RULES.md` "One result per element set": a different
Genre or Setting is a different film, so near-duplicates stay.

**Revisit:** If testers find near-duplicates noisy, the alternative is: drop a
result that differs from a better one by a single story element.

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
`data/TagData.json` is a trimmed copy without it. A lab prototype is in
Testing Features (`testing-features.html`, "Unlock Info").

---

## Award Targets

**Raised:** Act 2 polish, 2026-10-03 (moved from the removed
`docs/ACT2_POLISH_HANDOVER.md`).

Let the player aim a film at one of the game's year-end lists: Box Office
Success (highest box office receipts), Critical Acclaim (critics' ratings,
influenced by artistic rating) and Fan Favorites (Kinomark rating, influenced by
commercial rating). A lab prototype is in Testing Features (`testing-features.html`).

**Open decision:** replace the Highest Artistic / Highest Commercial buttons, or
sit beside them as a separate target selector?

---

## Released-Film Tracker

**Raised:** Act 2 polish, 2026-10-03 (moved from the removed
`docs/ACT2_POLISH_HANDOVER.md`).

Help the player see when repeated elements may become stale in the game. The
tracker warns only; the freshness pill stays the per-element state the app
uses. A lab prototype is in Testing Features (`testing-features.html`, "idea
still in baking").

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

Measured: 2-4 ms per render (24,255 pair lookups, real data). Not built (owner
ruling 2026-10-06): a precomputed edge list would save only those few ms. Build
it when the owner schedules it, or when a lab view gets slow.
Measurement: `docs/TESTING_FEATURES_RESEARCH_2026-10-05.md`.
