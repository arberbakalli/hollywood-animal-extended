# Game Rules

The single source of truth for how Hollywood Animal works and how this calculator
must model it. Domain rules only — architecture lives in `DECISIONS.md`, risks in
`KNOWN_ISSUES.md`, and agent workflow in `AGENTS.md`.

**Read this before answering any "should it be X or Y?" question about
behaviour.** If a rule is not here, it is not settled: ask the repository owner
rather than inferring one from the code, because the code has been wrong about
several of these.

Every rule names where it is enforced. When a rule and the code disagree, that is
a bug in one of them — say which, do not quietly pick a side.

---

## 1. What a script is

A script is:

- **one to eleven Genres**
- **exactly one Setting**
- **5 to 10 story elements** — the Max Element Pool

**Story elements are everything except Genre and Setting.** Genre and Setting are
context: they occupy no budget. A script's total width is therefore the budget
plus its context, never a fixed number.

Colman Graves accepts a script only when Genre, Setting and Protagonist are all
present *and* the story-element count is between 5 and 10.

> **The rule is one function:** `isStoryElement` / `storyElementsOf` in
> `src/evaluation/gravesAnalysis.js`. Every caller delegates to it.
>
> Enforced at the user-facing boundaries in:
> - `src/evaluation/gravesAudience.js` — the Evaluate 5..10 bounds
> - `src/evaluation/gravesBestMatches.js` — the Best Matches bound and Add button
> - `src/marketing/targetedAds.js` — the Build for Target budget
> - `src/generator/scriptGenerator.js` — the locked-tag validation
>
> Two modules keep a deliberate private copy because they load earlier or take
> no globals: `gravesBestMatchesEngine.js` and `movieScoreEstimator.js`. Both are
> allowlisted in `tests/story-element-rule.test.js`, which fails if any *other*
> module starts filtering Genre and Setting by hand.
>
> **Counting raw tags instead of story elements is the recurring bug here.** It
> shipped in `gravesAudience.js` and refused a legal nine-element script as
> "You selected 11" (2026-09-23), and it survived because two tests asserted
> that rejection. The count in any user-facing message is a story-element
> count, never a tag count.

### Genre is uncapped

**Minimum one, maximum eleven.** A script can carry every genre, split by
percentage, with one taking whatever remains up to 100%. Two is a common mix, not
a limit.

Uncapped does not mean generated: Build for Target seeds the single Genre a script
requires and spends the rest of the budget on story elements. Additional genres
come from what the player chose.

> Corrected 2026-09-22 by the owner against the game. The engine special-cased
> Genre to 2 and Build for Target capped it at 1, which silently withheld every
> Genre suggestion once a script had two. **Do not reintroduce a Genre cap.** A
> comment or test still describing one is stale, not a spec.

### Category capacity

| Category | Holds |
|---|---|
| Genre | unlimited (minimum one) |
| Supporting Character | unlimited |
| Theme & Event | unlimited |
| Setting, Protagonist, Antagonist, Finale | one each |

Protagonist, Antagonist and Finale are mandatory and **do** spend the budget.

This is **one rule in one place**: `isCategoryFull` in
`src/evaluation/gravesBestMatchesEngine.js`, driven by `MULTI_SELECT_CATEGORIES`
(`src/app/state.js`). The Add/Swap button label derives from it. Do not
re-implement the arithmetic in a panel — three copies of it have now been removed.

### Setting is singular

The category is **`Setting`**. Filtering on `Settings` matches nothing and
silently miscounts every script.

### Genre color complexity

**Genre is the only category with per-element colors.** Other categories have one
fixed color per category (Protagonist = green, Antagonist = purple, etc.). Genre
has a distinct color for each genre tag (Historical = one color, Comedy = another,
Action = another, etc.).

This affects:
- UI rendering (e.g., compatibility table, tag chips, category styling)
- CSS class generation (`getCategoryClass` in `audienceCompatibility.js` handles
  most categories uniformly, but Genre requires individual `genre-${genreId}` classes)
- Updates to the audience compatibility table (adding a Genre may not update
  immediately if event listeners don't fire; Genre changes fire all change events
  before rendering completes, so changes appear only on the next interaction)

> When Genre is selected and the table doesn't update immediately, select another
> element (any category) to trigger a re-render. This is a timing/event-queue issue,
> not a bug in the Genre data.

---

## 2. The element budget

**Max Element Pool** (header control, 5–10, default 5) caps story elements only.

| Feature | Budget applies? | Behaviour |
|---|---|---|
| Script Lab | Yes | Generates within the pool |
| Best Additions | Yes | Engine returns no rows at the budget |
| Pairwise | Yes, on the **Add button only** | Rows still list; Add is disabled |
| Swap Suggestions | **No** | A swap trades within a category, so the count cannot change |
| Build for Target | Yes | Combination = budget in story elements, plus context |

A complete 5-element script sits at its budget, so Best Additions is correctly
empty. That is intended: raise the pool, or swap. A test wanting additions from a
complete script must raise the pool first.

Within Pairwise, Add is disabled only when it would actually grow the pool — a
Swap, or a Genre/Setting candidate, stays live at the budget.

> Handing `buildSwaps` a budget is a bug, not a fix. See `KNOWN_ISSUES.md` for
> the argument-order hazard that caused exactly that.

---

## 3. Scoring thresholds

Pair compatibility is a raw score out of 5.

| Band | Range | Where shown |
|---|---|---|
| Successful | ≥ 4.0 | Pair Analysis, Best Matches |
| Common | 2.0 – 4.0 | Pair Analysis |
| Unsuccessful | < 2.0 | Pair Analysis |

**The Unsuccessful band and the Conflicts panel are the same pairs** — both
`< 2.0`. They are not "bad" and "terrible" tiers. Conflicts sub-grades that one
set:

| Severity | Range |
|---|---|
| Mild | 1.5 – 2.0 |
| Serious | 1.0 – 1.5 |
| Severe | < 1.0 |

### Verdict bands

Banded off the script's average fit:

| Verdict | Average | Tone |
|---|---|---|
| Success | ≥ 4.0 | success |
| Common | ≥ 3.5 | accent |
| Risky | 3.0 – 3.5 | danger |
| Failed | < 3.0 | danger |

> Enforced in: `getGravesVerdict`, `findGravesPairsByBand`,
> `gravesConflictSeverity` (`src/evaluation/gravesAnalysis.js`).

---

## 4. Distribution and studio policies

Demand in screenings, sourced from the game files:

- Week 1 = commercial score × 2 × 1,000
- Week 2 = commercial score × 1 × 1,000
- Weeks 3–8 = previous week × 0.8

Capacity (owned theatres) is subtracted **after** demand is calculated. It splits
demand into owned/rented/spare and never changes the demand itself.

### Behemoth — two effects, two independent gates

1. **+25% boost on every week 1–8**, whenever the policy is on. It rides on the
   production budget the toggle stands for (over $1,000,000), not on any score.
2. **Slower decay**, weeks 3+, only above **commercial** score 9.

> Changed 2026-09-22. This previously read "+25% to week 1 only" and "week 2 must
> never move". The owner corrected it against the game, where the Behemoth icon
> shows on every week. **Do not restore the week-1-only rule.**

### Boutique

Slower decay only, weeks 3+, above **artistic** score 9.

### Both together

A studio can hold both. The decay modifiers compose additively on the fall:
20% → 15% → 10%, i.e. factors 0.80 / 0.85 / 0.90. This composition is the one
part not stated in the game data; it is the owner's reading, pinned by
`tests/distribution-boutique.test.js`.

Each policy's score line in the UI follows its own toggle: commercial with
Behemoth, artistic with Boutique. Commercial score still drives demand while
Behemoth is off — that line describes the policy's decay gate, not the baseline.

> Enforced in: `src/marketing/distributionPlanner.js`.

---

## 5. Exclusions

One exclusion list, owned by Script Lab, feeds **every** context: Script Lab,
Colman Graves, Marketing & Release and Build for Target.

- A ban takes effect everywhere the moment it is made.
- Banning an element **removes it** from any script or lock already holding it,
  and names it in a message. The app resolves the clash rather than warning about
  it, so no context ever holds a banned element.
- A lifted ban restores the element everywhere immediately, with no reload.

Exclusion refreshes must cover **every category**, derived from the data.
Iterating `MULTI_SELECT_CATEGORIES` skips Setting, Protagonist, Antagonist and
Finale, which leaves a lifted ban on screen until an unrelated click redraws that
one category. That regression recurred repeatedly; reproducing it requires the
**Starting Tags profile active**, because that is what puts single-select bans in
place to go stale.

> Enforced in: `src/selectors/storyElementSelector.js`,
> `src/selectors/selectorExclusions.js`. Pinned by
> `tests/e2e/exclusion-dropdown-refresh.spec.js`.

### Starting Tags: a new game starts with a limited pool

A new game in Hollywood Animal does not give you every story element. You start
with a small pool and unlock the rest as you play. The app models that as bans.

- **250** elements in total, **57** in the starting pool
  (`GAME_DATA.starterWhitelist`, `data.js`), so **193 bans**. Not 192, not 194.
- On a player's first visit the app applies Starting Tags itself, so a fresh
  exclusion list reads **193**. After that it restores the player's saved list
  and never re-seeds it.
- A count other than 193 on a fresh browser is a bug. On a browser that has
  used the app before, it is that player's saved list; Apply Starting Tags
  resets it to 193 and replaces any custom bans.

Per category, starting / total: Genre 8/11, Setting 5/29, Protagonist 8/43,
Antagonist 7/34, Supporting Character 8/22, Theme & Event 12/81, Finale 9/30.

**Bans are not script content.** A feature that reads "the selected roles" reads
the script (Locked Elements, the `generator` context), never the excluded list.
Age & Gender Appeal read both and listed 16 banned characters as script roles in
production (2026-09-25).

**Test against the first-run state.** The Playwright fixture
(`tests/fixtures/base.js`) marks Starting Tags as already seeded, so most specs
run with zero bans, a state no real player starts in. A feature that reads any
selector list needs at least one spec that clicks Apply Starting Tags first.

> Stated by the owner 2026-09-25. Enforced in `applyStartingTagsExclusions`
> (`src/app/appShell.js`) and the first-run gate in `src/library/exclusionStore.js`.
> Pinned by `tests/e2e/age-gender-appeal-exclusions.spec.js`.

---

### Holiday bonuses

A week is simply the game's unit of time — roughly four to a month. A holiday
lifts **only the week it falls in**, by its own percentage. Release into that
week and that week is boosted; the weeks after it decay normally, from the
unboosted base, so nothing downstream moves.

The per-demographic percentages are game-file sourced, extracted from
`Configs/Holidays.json` and pinned against it by `tests/holiday-release.test.js`.
`audienceBonuses` is keyed `AUDIENCE|type` (0 base, 1 artistic, 2 commercial),
and the app consolidates those tiers into a single average percentage for each
demographic when ranking and displaying holiday opportunities. Current extracted
values happen to match across the three tiers, but the average keeps the app
correct if the source data diverges. A demographic the game omits scores zero.

> Scope confirmed by the owner against the game on 2026-09-23, after the
> extraction settled the amounts but not the duration — `Holidays.json` has no
> week dimension at all. Weeks 1, 2 and 3+ are each asserted separately.

---

## 6. Not settled

Do not encode these as rules. They need evidence, not a decision.
- **Attendance / occupancy.** Deliberately not modelled. The calculator outputs
  demand in screenings and assumes it is met; the game reports occupancy against
  400 seats per show. Deriving it needs a viewers model that exists nowhere in
  `src/` and must not be guessed.

---

## 7. Audience compatibility score scale

Demographic appeal (`GAME_DATA.tags[*].weights.{TF,TM,YF,YM,AF,AM}`) is a raw
score from **-5.0 to +5.0**. Every weight in `data/TagsAudienceWeights.json` is
a whole integer in that range (~1500 weights).

The owner has confirmed the canonical, per-integer label scale below as the
source of truth for what each score means:

| Score | Label |
|---|---|
| +5.0 | Excellent |
| +4.0 | Extremely Good |
| +3.0 | Very Good |
| +2.0 | Good |
| +1.0 | Slightly Good |
| 0.0 | Neutral |
| -1.0 | Slightly Bad |
| -2.0 | Bad |
| -3.0 | Very Bad |
| -4.0 | Extremely Bad |
| -5.0 | Disastrous |

> Confirmed by the owner 2026-09-26. Reference implementation:
> `docs/audience-compatibility-reference.html` (score legend and per-tag
> tables, one label per integer). That page is a standalone reference in a
> light theme; it is not wired into the live app.

### The live app currently shows 5 bands, not 11

The Audience Compatibility panel (`index.html`, `#audience-compatibility-panel`)
groups scores into **5** visible bands, matching its legend exactly:

| Band | Range | CSS class |
|---|---|---|
| Excellent | +4.0 to +5.0 | `excellent` |
| Good | +1.0 to +3.9 | `good` |
| Neutral | 0.0 | `neutral` |
| Bad | -1.0 to -3.9 | `bad` |
| Disastrous | -4.0 to -5.0 | `disastrous` |

`getScoreLabel` and `getScoreClass` (`src/marketing/audienceCompatibility.js`)
both derive from one shared `getScoreBand` function using these exact 5
bands, so the hover title and the cell color can never disagree with each
other or with the legend again. Neither function ever returns a label from
the 11-point scale that has no matching band here (e.g. "Very Good", "Very
Bad") — those collapse into their nearest visible band ("Good", "Disastrous").

**This 5-band grouping is a coarser view of the 11-point scale above, not a
contradiction of it.** The legend and CSS only define 5 colors today.

> Expanding the live UI to a full 11-color treatment (one distinct color per
> integer) is a separate, undecided visual design question. Per Rule (c) in
> `docs/QA_FRAMEWORK.md` ("Exact Visuals Only When Owner-Specified"), colors
> are never invented or expanded by an agent without an explicit owner
> ruling — see `.arber/LESSONS_LEARNED.md` lesson 18 for what happened last
> time a color was guessed and then locked in by a test. Do not add the
> other 6 colors without asking first.

> Enforced in: `src/marketing/audienceCompatibility.js` (`getScoreBand`,
> `getScoreLabel`, `getScoreClass`). Legend: `index.html` lines ~611-615.
> Pinned by `tests/audience-compatibility-score-bands.test.js`.
