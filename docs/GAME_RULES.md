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

**What the calculator is for.** The game keeps some of its maths hidden on purpose,
so playing it is not a connect-the-dots exercise. The calculator shows what the game
data contains, so a player who wants to play optimally can. That includes choices
that are legal but weak, such as a female Detective whose appeal is poor. It never
forbids a legal choice because it is a bad one; it shows why it is bad.
(Owner, 2026-09-28.)

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

### Category order

Everywhere the app lists a script's elements by category, the order is the
game's (owner ruling 2026-09-29):

**Genre > Setting > Protagonist > Antagonist > Supporting Character > Theme & Event > Finale**

> The one list is `GAME_DATA.categories` in `data.js`. The selectors, the Script
> Lab cards and the Audience Compatibility table all read it. Two private copies
> had drifted: the cards put Antagonist before Protagonist, and the table's
> selected mode put Genre and Setting after the story roles. Guarded by
> `tests/invariant-lists.test.js`, TC01-000038 and
> `tests/audience-compatibility-render.test.js`.

### Genre is uncapped

**Minimum one, maximum eleven.** A script can carry every genre, split by
percentage, with one taking whatever remains up to 100%. Two is a common mix, not
a limit.

**Each genre holds at least 5%, in steps of 5.** Eleven genres is therefore ten
at 5% plus one at 50%. The Genre + button stops at 11 rows in every context
(there are exactly 11 genres), and works again when a row is removed.

> Owner ruling 2026-09-30 (audit item Q12). The extracted game file sets
> `min_genre_fraction: 0.1`, which would cap a script at 10 genres; the owner
> ruled 5% and eleven. If the game ever refuses a 5% share, that value is why.
> Floor: `GENRE_PERCENT_MIN` in `src/selectors/genreMix.js`. Row cap:
> `MAX_GENRE_ROWS` in `src/selectors/storyElementSelector.js`, pinned by
> TC06-000009. Before this ruling the + button added rows without limit.

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

**Script Lab reserves a slot for each of them.** Locked elements can never push
one out. When the locks leave fewer free slots than the mandatory categories
still missing, Generate refuses and says which are missing and how many locks
to remove (or to raise the score target, when that adds a slot). A category the
exclusions empty completely is refused the same way, before generating.

> Owner ruling 2026-09-28. The generator added them only while the count was
> below target, so 3 locked Supporting Characters at a target of 5 produced
> scripts with no Finale every time. Enforced in `prepareGenerationInputs`
> (`src/generator/scriptGenerator.js`) and `runGenerationAlgorithm`
> (`src/generator/scriptGenerationEngine.js`). Pinned by
> `tests/generator-mandatory-categories.test.js` and TC01-000034.

This is **one rule in one place**: `isCategoryFull` in
`src/evaluation/gravesBestMatchesEngine.js`, driven by `MULTI_SELECT_CATEGORIES`
(`src/app/state.js`). The Add/Swap button label derives from it. Do not
re-implement the arithmetic in a panel — three copies of it have now been removed.

### Setting is singular

The category is **`Setting`**. Filtering on `Settings` matches nothing and
silently miscounts every script.

### Story elements and the movie score ceiling

A movie score runs from **0.0 to 10.0 in steps of 0.1**. A script carries **5 to
10 story elements**. How many it carries sets the highest score it can reach.
This is the game's own Rating Limit table:

| Story elements | Script limit | Movie limit |
|---|---|---|
| Under 5 | 5 | 6 |
| 5–6 | 5 | 6 |
| 7–8 | 7 | 8 |
| 9 | 8 | 9 |
| 10 | 10 | 10 |

**A movie score of 10 needs all ten story elements.** Nine top out at 9.

> Owner reading of the game's Rating Limit tooltip, 2026-09-30. It corrects the
> 5–6 row, recorded 2026-09-28 as Script 6 / Movie 7.

**Max Element Pool and Target Movie Score are one to one, 5 to 10.** The pool is
the story-element count; the target follows it (pool 7 = target 7), and moving
either control moves the other. The "Requires ~N" help shows the same N, and
Script Lab generates exactly N. The table above is a ceiling, not a requirement:
the earlier mapping (target 6–8 asks for N−1, pool 5–7 targets pool + 1) read
it as a requirement, which made 8 story elements unreachable.

> Owner rulings 2026-09-30 ("you should always be able to select 5 to 10
> elements"; "target movie with 5 elements is 5"). Enforced in
> `HACAppShell.poolSizeToTargetScore` / `targetScoreToPoolSize`
> (`src/app/appShell.js`), `getRequiredElementCount` and
> `getGenerationElementCount` (`src/generator/scriptGenerator.js`). Pinned by
> `tests/bug-hunt-2026-09-30.test.js`, TC26-000003 and TC01-000041..43.

**One Generate Scripts click makes 15 scripts and shows 5**; Show more reveals
the rest 5 at a time. Clicking again makes a new list. (Owner ruling
2026-09-30: page through one list rather than re-click to rotate. Pinned by
TC01-000042.)

> Owner rulings 2026-09-28, from a screenshot of the game's Rating Limit tooltip
> (pool 8 → target 8 ruled the same day).
> It replaces the same day's earlier ruling that 9 elements could reach 10.
> The movie ceiling is enforced in `getMovieScoreCap`
> (`src/evaluation/movieScoreEstimator.js`), pinned by `tests/movie-score-cap.test.js`.
> The target mapping is enforced in `getRequiredElementCount`
> (`src/generator/scriptGenerator.js`) and `HACAppShell.targetScoreToPoolSize` /
> `poolSizeToTargetScore` (`src/app/appShell.js`), which must agree. Pinned by
> `tests/slider-syncing.test.js`, `tests/scoringCore.test.js`,
> `tests/lock-exclude-logic.test.js`, TC01-000006/16 and TC10-000004/5.
> The Script column is modelled in `getScriptQualityCap` (same file) and shown
> as the Script Lab card's "Script Qual" badge. It used to be derived as the
> movie limit minus one, which showed 9 for a 10-element script. Pinned by
> `tests/movie-score-cap.test.js` ("script quality limit").

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

**The Genre category is gold** (`--accent`, owner ruling 2026-09-29) wherever the
category itself is coloured: its selector label and Best Matches' Genre items
(`--cat-genre`). Each genre keeps its own colour on its rows and chips.
Slapstick Comedy's colour is a placeholder until the owner sees it in the game.

---

## 2. The element budget

**Max Element Pool** (header control, 5–10, default 5) caps story elements only.

| Feature | Budget applies? | Behaviour |
|---|---|---|
| Script Lab | Yes | Generates the pool (section 1) |
| Best Additions | Yes | At the budget, lists Genres only (they spend no budget) |
| Pairwise | Yes, on the **Add button only** | Rows still list; Add is disabled |
| Swap Suggestions | **No** | A swap trades within a category, so the count cannot change |
| Build for Target | Yes | Combination = budget in story elements, plus context; never a pair below 2.0 |

A complete 5-element script sits at its budget, so Best Additions lists no
story element: raise the pool, or swap. It still lists Genres, which spend no
budget, under a note that says so (owner ruling 2026-10-01; it used to be empty).
A test wanting story-element additions from a complete script must raise the
pool first.

**Best Additions says when the list is short.** When fewer story elements clear
Minimum Fit than the budget has free slots, a note names the free slots and the
fit, with a button that lowers Minimum Fit one step (4.0 → 3.5) and redraws the
list. A Genre row does not count, because it spends no slot. (Owner ruling 2026-09-30: a 6-element script at pool 8 listed
only Action at 4.0+, with no reason given. `additionsShortfallNote` in
`src/evaluation/gravesBestMatches.js`; TC03-000043.)

### Build for Target never suggests a clash

No suggested combination holds a pair below 2.0 (Graves' danger line). The
search walks every starting point and drops the ones that clash; if fewer than
20 clean ones remain, a note says how many were left out and why. A pair between
two **locked** elements is the player's choice: it is named in a note ("Your
locked Evil Monster and Long Journey clash (1.0)"), in game category order, and
the results stay. When the pool, a lock, an audience or an advertiser changes
after Find, the cards are hidden and a notice asks for a new Find.

> Owner rulings 2026-09-30, after the Build for Target audit found 10-17 of every
> 20 suggestions carrying a spoiler pair (ranking reads advertiser fit only).
> `searchForTargetCombinations` and `watchTargetedInputs` in
> `src/marketing/targetedAds.js`. Pinned by `tests/bug-hunt-2026-09-30.test.js`
> (every pool 5-10 against every agency) and TC05-000021..23.

### Evaluate results never outlive the script

When the Submit Script builder changes after Evaluate Script (a dropdown, a
remove button, Reset, a Genre share, a search pick, a Library load, or a Best
Matches Add or Swap), the five Evaluate panels are hidden and a notice says
"Script changed. Press Evaluate Script to update." A change that leaves the
script the same, such as adding an empty row, keeps the results. (Owner ruling
2026-09-30: the old Pair Analysis and Conflicts named elements the script no
longer held. `watchGravesBuilder` in `src/evaluation/gravesAudience.js`;
TC03-000046..50.)

### Results never outlive their inputs

The same rule runs through every panel that computes from a script (audit
2026-09-30):

- **Evaluate** hides its five panels and asks for a new Evaluate (above).
- **Best Matches** redraws from the current script and ban list instead of
  hiding, because its mode tabs live in the panel and TC03-000038 pins that
  switching mode after a change works.
- **Build for Target** hides its cards and asks for a new Find when the pool, a
  lock, an audience, an advertiser or the ban list changes.
- **Analyze** (Marketing & Release) hides its results and asks for a new
  Analyze when an element or either score changes (owner ruling 2026-10-01).
  The distribution calculator, which Analyze moves into its results, goes back
  to its own place and stays on screen.
- **Script Lab** hides generated scripts when a ban hits one of them, and asks
  for a new Generate. Saved Library scripts are left as they are.
- **A refusal** (Evaluate, Generate, the Highest Appeal modes, Analyze) never
  leaves the previous results beside its message.
- A ban reaches every watcher directly: it clears a pick without firing change.

### Script Lab cards name their clashes

Script Lab shows every result it generates, in all three modes. A card whose
script holds an Unsuccessful pair (< 2.0) names the worst one, in game category
order, and counts the rest ("Clash: Evil Monster × Long Journey (1.0) and 1
more"), so the player sees what a high score costs in coherence. (Owner ruling
2026-10-01. `clashWarningText` in `src/generator/scriptGenerator.js`;
TC01-000049/50.)

### Highest Appeal respects the compatibility target

Highest Artistic and Highest Commercial keep Target Average Compatibility: per
slot, freshness first, then a script at or above the target (on the tenth
shown), then the higher bonus. Results rank the same way. A card that never
reached the target says so ("Avg Fit 3.2 is below your 4.0 target."). (Owner
ruling 2026-10-01; before it, 24 of 48 scripts at pool 10 fell below 4.0.
TC01-000052/53.)

### One audience model

Colman Graves' Likely Audience and Marketing & Release's target audiences use
the same model: affinity from the audience weights by share, lifted so the
lowest is at least 1, each audience's share of the total times 3, clamped to
0..1; a target above 0.33, high interest from 0.67. (Owner ruling 2026-10-01:
Graves used its own scaling, so the same script named different audiences.
`audienceShares` in `src/evaluation/gravesAnalysis.js`; TC03-000058.)

### Score inputs

A movie score typed into Marketing & Release is read as 0 to 10, and the box
settles on the limit when it is left (`HACScoreFormatting.readMovieScoreInput`;
TC04-000036). A stored movie score is the tenth the screen shows (TC24-000001).

### Script Library files

Import skips an entry with an unknown element, the same element twice, or two
picks in a one-pick category; it splits Genre shares into 5% steps that sum to
100, as every builder does; and the load message counts scripts already in the
library (`src/library/scriptLibrary.js`; `tests/bug-hunt-2026-09-30.test.js`).

### Swap Suggestions and Unsuccessful pairs

Owner rulings 2026-09-30, enforced in `buildSwaps`
(`src/evaluation/gravesBestMatchesEngine.js`), pinned by
`tests/bug-hunt-2026-09-30.test.js`, TC03-000041 and TC03-000042:

- **A swap never brings in an Unsuccessful pair** (< 2.0) with the rest of the
  script. Such a candidate stays visible in Best Additions and Pairwise, with
  its clash warning; Swap Suggestions does not offer it as an improvement.
- **Every element in an Unsuccessful pair gets a slot**, which lists the
  replacements that clear the clash, ranked by the resulting average, even when
  the average stays level or falls. Outside a clash, a slot still lists only
  swaps that raise the average.
- **A clash that no available replacement clears is named**, not dropped, with
  the exclusion count when Script Lab exclusions are hiding candidates.

Why: the raw average cannot see a clash. Long Journey scored 1.0 against Evil
Monster but fitted the rest of the owner's script well, so no swap raised the
average and Evaluate's red pair had no Swap slot. After the owner removed it,
Swap offered it back as "+0.11".

Within Pairwise, Add is disabled only when it would actually grow the pool — a
Swap, or a Genre/Setting candidate, stays live at the budget.

> Handing `buildSwaps` a budget is a bug, not a fix. See `KNOWN_ISSUES.md` for
> the argument-order hazard that caused exactly that.

---

## 3. Scoring thresholds

Pair compatibility is a raw score out of 5.

**A pair has one score, whichever element comes first.** The data holds every
pair in both directions. Where the two disagree and one is 3.0 (the extract's
"no data" value), the other is the real entry and is used. 36 pairs disagree,
all with Hardened Cynic's own row at 3.0 and the reverse at 4 or 5. (Owner
ruling 2026-10-01: use the real entry. `pairScore` in
`src/evaluation/compatibilityEngine.js`; every pair is checked in
`tests/bug-hunt-2026-09-30.test.js`.)

| Band | Range | Where shown |
|---|---|---|
| Successful | ≥ 4.0 | Pair Analysis, Best Matches |
| Common | 2.0 – 4.0 | Pair Analysis, Best Matches |
| Unsuccessful | < 2.0 | Pair Analysis, Best Matches |

Best Matches bands a **candidate**, not a pair (owner ruling 2026-09-29: Graves
tells the player about synergy in general, so all three bands belong there).
A candidate is Unsuccessful when any pair it forms with the script is below
2.0, Successful when its average fit with the script is at least 4.0, and
Common otherwise (`bandFor` in `src/evaluation/gravesBestMatchesEngine.js`).

**The Unsuccessful band and the Conflicts panel are the same pairs** — both
`< 2.0`. They are not "bad" and "terrible" tiers. Conflicts sub-grades that one
set:

| Severity | Range |
|---|---|
| Mild | 1.5 – 2.0 |
| Serious | above 1.0 – 1.5 |
| Severe | 1.0 or below |

> Owner ruling 2026-10-01: Severe starts at 1.0, the scoring engine's spoiler
> line. The data holds whole numbers, so with "< 1.0" every real conflict read
> Serious. Mild and Serious stay for any fractional data.

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

Demand in screenings:

- Week 1 = commercial score × 2 × 1,000
- Week 2 = commercial score × 1 × 1,000
- Weeks 3–8 = previous week × 0.8

> Where these come from: the studio-policy effects below are quoted from the
> game's own strings. The base curve (×2, ×1, ×0.8, 1,000 per point) is not in
> any file under `extractedFilesFromGameSourceOfTruth/` or `localization/`. It
> is credited to aalbertinib's Hollywood Animal Master (`README.md`), and
> `SOURCE_OF_TRUTH_MAPPING.md` still lists the 0.8 decay as needing in-game
> testing. These values are the app's working rule until an in-game
> measurement says otherwise.

Capacity (owned theatres) is subtracted **after** demand is calculated. It splits
demand into owned/rented/spare and never changes the demand itself.

### Behemoth — two effects, one toggle

The toggle stands for "this studio holds Behemoth and the film's production
budget is over $1,000,000". Both effects follow it:

1. **+25% boost on every week 1–8**. It rides on the budget, not on any score.
2. **Slower decay**, weeks 3+, when the **commercial** score is also **9 or above**.

> Owner ruling 2026-09-28: the $1,000,000 budget is the condition, and it is
> strictly *over* $1,000,000 (the game string says "exceeds"). The slower decay
> needs the toggle too, not just the score. The game string for the decay perk
> does not mention budget, so a Behemoth studio under the budget line that still
> gets the slower decay is not modelled: the app has one toggle.

> Changed 2026-09-22. This previously read "+25% to week 1 only" and "week 2 must
> never move". The owner corrected it against the game, where the Behemoth icon
> shows on every week. **Do not restore the week-1-only rule.**

### Boutique

Slower decay only, weeks 3+, from **artistic** score **9 and above**.

> Owner ruling 2026-10-01: both decay gates open from 9 and above. The game's
> strings say "above 9" for both (`localization/English.json:12479`, `:12490`);
> the owner ruled against that reading. Before this the gates were strictly
> above 9. `resolveDecayRate` and `describeStudioPolicies` in
> `src/marketing/distributionPlanner.js`; the status line reads "from … 9 and
> above" below the gate.

### Both together

A studio can hold both. The decay modifiers compose additively on the fall:
20% → 15% → 10%, i.e. factors 0.80 / 0.85 / 0.90. This composition is the one
part not stated in the game data; it is the owner's reading, pinned by
`tests/distribution-boutique.test.js`.

Each policy's score line in the UI follows its own toggle: commercial with
Behemoth, artistic with Boutique. Commercial score still drives demand while
Behemoth is off — that line describes the policy's decay gate, not the baseline.

> Enforced in: `src/marketing/distributionPlanner.js`.

### Marketing Analyze needs one element, of any kind

Analyze runs on whatever the player selects, from a single element to a full
script (owner ruling 2026-09-29). It does not require a Genre: one element is
enough to rank the Recommended Advertisers for it. With nothing selected it asks
for at least one tag (`analyzeMovie`, `src/marketing/marketingPlanner.js`).

---

## 5. Exclusions

One exclusion list, owned by Script Lab, feeds **every** context: Script Lab,
Colman Graves, Marketing & Release and Build for Target.

- A ban takes effect everywhere the moment it is made.
- Banning an element **removes it** from any script or lock already holding it,
  and names it in a message. The app resolves the clash rather than warning about
  it, so no context ever holds a banned element.
- A lifted ban restores the element everywhere immediately, with no reload.

- An element can be banned **once**. The ban list grays out an element banned
  in another row, as the builders do, and Load Profile or a search pick never
  adds a second row for it (owner ruling 2026-10-01; TC09-000026..28).

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

The holiday **data** is kept in **calendar order** (owner ruling 2026-09-29),
sorted on the game file's own `month` and `day`: Valentine's Day, Memorial Day,
Independence Day, Halloween, Thanksgiving, Christmas. The **holiday panel**
lists them best first, by the script's bonus (owner ruling 2026-10-01). Every
averaged bonus in the current game file is a whole percent.

A holiday's boost for a script is the mean of its bonuses over the script's
target audiences, taken at the tenth the row shows: three audiences averaging
18.333...% show "+18.3%", and week 1 is boosted by 18.3% (owner ruling
2026-10-01; `holidayBonusFor`).

---

## 6. Not settled

Do not encode these as rules. They need evidence, not a decision.
- **Attendance / occupancy.** Deliberately not modelled. The calculator outputs
  demand in screenings and assumes it is met; the game reports occupancy against
  400 seats per show. Deriving it needs a viewers model that exists nowhere in
  `src/` and must not be guessed.

### Implemented, not yet confirmed

The code does all of the following today. None of it is stated by a game file or
confirmed by the owner, so none of it is a rule yet. Confirm one, and it moves up
into its section; contradict one, and the code is the bug. Listed 2026-09-28 from
a review of the source.

- **Matrix scoring** (`calculateMatrixScore`, `src/evaluation/compatibilityEngine.js`):
  a pair missing from the data counts as 3.0, and each pair scores `(raw - 3) / 2`.
  Each row takes its worst pair, and a pair at or below 1.0 raises a spoiler. The
  total is multiplied by 0.9 when positive and by 1.25 when negative.
  **Owner assumption 2026-10-01:** a genre's share does not weight its pair
  scores; a 5% genre counts as much as a 95% one in Average Fit, the verdict and
  Conflicts. It cannot be checked in the game, so it is assumed, as the code
  already does. The code also weights a row's pairs by category (Genre 20 x share, Setting 5,
  others 3 on negative pairs), but the weights cannot change any result: the row
  then keeps the lower of that weighted average and its worst pair, and a
  weighted average is never below its own minimum. So every row scores its worst
  pair. Found by the 2026-09-29 audit; open question whether the game intends the
  weights to matter. The 3.0 default is pinned in `tests/scoring-rule-edges.test.js`.
- **Genre tie-break** (same file, `genresByShare`): when two genres hold the
  same share, the one earlier in the game's genre list (the data file order)
  counts as the larger. Before 2026-09-30 the input order decided, so the same
  script scored differently by row order (54 of 55 pairs at 50/50). The order
  makes scores stable; whether the game breaks ties this way is not confirmed.
- **Genre-pair bonus** (same file): it applies only when the second genre holds
  at least 35%. The code also checks that the top two make up 70%, but that is
  implied: genres are sorted by share, so a second genre at 35% puts the top two
  at 70% or more. Pinned at 35/35/30 in `tests/scoring-rule-edges.test.js`.
- **Genre mix steps** (`src/selectors/genreMix.js`): shares move in 5% steps,
  with 5% as the smallest share.
- **Striking Image / Artistic Ability** (`src/marketing/distributionPlanner.js`):
  ×2 on weeks 1–4 whenever either toggle is on. The game strings tie each to
  which rating is higher.
- **Rounding** (same file): weeks 1–4 round up and weeks 5–8 round down, after
  every multiplier (`rounding.ROUND_UP_UNTIL_INDEX` in `data.js`).
- **Campaign timing** (`src/marketing/marketingPlanner.js`): 6 weeks
  pre-release, halved by Factory Policy; 4 weeks of release; 4 weeks
  post-release only at commercial ≥ 9.0. The studio policies gate from 9 and
  above too (owner ruling 2026-10-01, section 4).
- **Target audiences** (same file): high interest from 0.67, moderate above
  0.33, normalised with a factor of 3.0 (`RELEASE_MAGIC_NUMBER`).
- **Advertiser grades** (`src/marketing/advertiserMatcher.js`): A+ from 3.33,
  A 2.83, B+ 2.58, B 2.33, C+ 2.13, C 1.94, D 1.50, F below that, plus an
  adjustment for the movie's lean. Pinned in `tests/advertisers.test.js`.
  Scores carry one decimal (owner, 2026-09-29), so a cut between two tenths
  acts as the next tenth up: 3.3 is an A and 3.4 an A+. The sentence under each
  card follows the grade (owner ruling 2026-09-29): A+/A "Strong appeal", B+/B
  "Good compatibility", C+ to D "Adequate reach… not a standout", F "scores
  poorly". It used to have its own cuts (4.5, 4.0) that no real script reaches.
- **Three more colour bands** besides §3: Build for Target cards (≥ 3.5 success,
  < 2.5 danger, `targetedAds.js`), and Age & Gender Appeal labels (≥ 3.5 Good,
  ≥ 2.5 Neutral, `ageRoleBreakdown.js`).
- **Generator** (`src/generator/scriptGenerationEngine.js`): a 30% chance of
  pairing the first genre with a second.

---

## 7. Audience compatibility score scale

### Audience names

The six audiences carry the game's own names (owner ruling 2026-09-29, from the
"Audience analytics" strings in `localization/English.json`):

| Code | Name |
|---|---|
| TF | Girls |
| TM | Boys |
| YF | Young women |
| YM | Young men |
| AF | Women |
| AM | Men |

Teen is Girls/Boys; "young" is the middle band. The one list is
`GAME_DATA.demographics[code].name` in `data.js`, and every label reads it.
Pinned by `tests/audience-names.test.js`.

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

> Confirmed by the owner 2026-09-26. Previously backed by a standalone
> reference page, `docs/audience-compatibility-reference.html` (score legend
> and per-tag tables, one label per integer, light theme, never wired into
> the live app) — deleted 2026-09-26 once its content was captured in the
> table above; it had zero references from the app or any code.

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
the 11-point scale that has no matching band here: +3 "Very Good" shows as
Good, and -3 "Very Bad" shows as Bad.

For whole-number scores the code matches the table exactly. Between integers it
cuts at -3.0, not -4.0: `getScoreBand` sends anything below -3.0 to Disastrous.
Every weight is a whole number today, so the difference never shows.

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

---

## 8. Character gender lock

A character tag (Protagonist / Antagonist / Supporting Character) is either
**locked** to one gender or **unisex** (playable as either). This is a game
fact, not a design choice: it comes from the game's own slot allocation.

`data/TagData.json` carries a `gender` field per character tag, one of:
- `"M"` — locked male (source: `parameters.SlotsMale` in the extracted game file)
- `"F"` — locked female (source: `parameters.SlotsFemale`)
- `"U"` — unisex, playable as either (source: `parameters.SlotsUnisex`)

Non-character tags (Genre, Setting, Theme & Event, Finale) carry no `gender`
field at all — the concept does not apply to them.

**`TagData.json`'s `gender` field is the sole runtime source for which
gender button(s) render in the Age & Gender Appeal panel.**
`getValidGenders()` in `src/analysis/ageRoleBreakdown.js` reads
`GAME_DATA.tags[rawId].gender` directly (surfaced there by
`src/data/dataLoaders.js`) and nowhere else — it does not read
`data/age-role-compatibility.json`'s `locked_gender` at all. That field
still exists as a second, independently-displayed copy (used for nothing but
its own presence in that file) and is kept in sync only as a courtesy: a
regression test cross-checks it against `TagData.json` and fails if the two
disagree, but the UI's actual button logic no longer depends on it. This
was a deliberate change 2026-09-26, made *because* `locked_gender` had
already drifted silently once (37 entries, see below) — reading the
original rather than a copy that requires manual upkeep removes the
possibility of that recurring.

Swept all 99 Protagonist/Antagonist/SupportingCharacter tags after this
change: every `gender` value is exactly `"M"`, `"F"`, `"U"`, or absent
(4 collective-antagonist tags with no individual slot, e.g.
`ANTAGONIST_CRIMINAL_GANG`) — no malformed values, no case that falls
through `getValidGenders()`'s three-way branch unhandled.

`data/age-role-compatibility.json`'s `locked_gender` field (`"M"`, `"F"`, or
`null` for unisex) previously disagreed with `TagData.json`'s `gender` field
on 37 entries — all `locked_gender: null` while `TagData.json` said they
were locked, silently under-reporting the lock back when the panel still
read from that file. Fixed 2026-09-26 — see commit for the full list.

**A unisex character stays selectable as either gender, even when one gender is
a poor choice.** Detective, Cop and Sheriff are unisex in `TagData.json`, so the
app offers both. The Age & Gender Appeal panel shows each gender's appeal, and a
weak one (a female Sheriff, say) is the player's call to make. That follows the
calculator's purpose stated at the top of this file. The game's own
`parameters.Rules` (e.g. `NON_WOMAN`), kept in
`extractedFilesFromGameSourceOfTruth/TagData.json`, is not applied as a lock.
(Owner, 2026-09-28.)

> Two tags disagree between their old numeric gender and their `Slots*`
> parameter: `ANTAGONIST_HEADLESS_MIDGETS_HYPNOTISTS` and
> `ANTAGONIST_WOMENS_BOOK_CLUB_OF_CANNIBALS`. Both are `RECIPE`-gated,
> marked `"Rules": "TRASH, UNETHICAL"` in the extracted game file. They ship
> as `M`, following their `Slots*`, which is unconfirmed in-game. Parked per
> owner request 2026-09-26 until someone plays that content; see
> `docs/KNOWN_ISSUES.md`. Do not change them without in-game evidence.

> Enforced in: `data/TagData.json` (`gender`), consumed by
> `src/data/dataLoaders.js` → `GAME_DATA.tags[id].gender` →
> `src/analysis/ageRoleBreakdown.js`'s `getValidGenders()`. Pinned by
> `tests/age-role-breakdown.test.js` — the drift-detection test ("gender
> lock matches TagData.json's Slots-derived source of truth") and the
> `getValidGenders` describe block (male-locked/female-locked/unisex/missing
> entry/collective-antagonist cases, teeth-verified).

---

## 9. Element freshness

The game tracks how often a studio has used each story element recently. An
element used too often turns **Stale** and then **Rotten**, and viewers lose
interest in films that carry it. The game's own words (`localization/English.json`):

- "Over the past two years, you've released {0} films with this story element."
  (`FRESHNESS_TOOLTIP_FILMS_COUNT`); the scale reads "Movies in the last 500 days".
- Stale elements "reduce the viewers' interest in the film"; Rotten elements
  "greatly reduce" it (`FRESHNESS_INDICATOR_CAPTION_TAG_*`). The game's middle
  tier is named Stale in English; its internal key is `CLICHE`.
- An element becomes fresh again once the studio stops releasing films with it
  for long enough (`FRESHNESS_RELEASE_WARNING_*`).

### Rules (owner, 2026-09-29, confirmed from play)

- **Only the five story categories have freshness**: Protagonist, Antagonist,
  Supporting Character, Theme & Event, Finale. **Genre and Setting never do**;
  they can be used as often as the player likes.
- **Every element starts Fresh.** A new game has nothing Stale or Rotten.
- Each element is in exactly one of three states:

  | State  | Viewer-interest multiplier |
  |--------|----------------------------|
  | Fresh  | 1.0                        |
  | Stale  | 0.5                        |
  | Rotten | 0                          |

- **A script's freshness is its worst element's.** One or more Stale elements
  make the script Stale (x0.5); any Rotten element makes it Rotten (x0).
  Two Stale elements are still x0.5.

### How the calculator models it (owner rulings, 2026-09-29)

- **The player records the state the game shows**, one click per change: a pill
  on the element cycles Fresh -> Stale -> Rotten -> Fresh. There are no film
  counts. States persist per browser; an element with no recorded state is Fresh.
- **One state per element, everywhere.** Changing it in one place changes every
  place that shows that element.
- **Scope: Script Lab.** Pills appear on the locked story elements and on every
  story element of a generated or pinned script card. Build for Target, the
  Evaluate tab and Marketing do not show or read freshness.
- **Excluded elements have no freshness.** Excluding an element clears its
  state, so it comes back Fresh when the player makes it available again.
- **Generation deprioritizes worn-out elements.** When Generate fills a slot the
  player did not lock, it takes a Fresh element if one is available for that
  category, a Stale one only when no Fresh one is, and a Rotten one only when
  nothing else is. Locked elements are the player's choice and are never
  replaced.
- **Results rank by freshness first, score second.** An all-Fresh script beats a
  Stale script even with a lower score, and a Stale script beats a Rotten one.
  Within the same freshness the existing score order applies.
- **Changing a state does not regenerate.** The results panel says the
  suggestions are out of date; the player clicks Generate again when ready.
  (Generation is random, so an automatic refresh would reshuffle the list under
  the player's cursor.)

> Enforced in: `src/generator/scriptGenerationEngine.js` (`HACFreshness` block:
> states, store, script freshness, freshest-first picks), `src/generator/scriptGenerator.js`
> (ranking, card pills, the out-of-date notice), `src/selectors/storyElementSelector.js`
> (locked-row pills) and `src/library/exclusionStore.js` (excluding clears the state).
> Pinned by `tests/freshness.test.js` and `tests/e2e/script-lab-freshness.spec.js`.
