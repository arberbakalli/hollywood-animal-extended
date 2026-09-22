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

> Enforced in: `src/evaluation/gravesAnalysis.js`, `src/marketing/targetedAds.js`
> (`isStoryElement`, `TARGETED_MANDATORY_CATEGORIES`).

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

---

## 6. Not settled

Do not encode these as rules. They need evidence, not a decision.

- **Holiday bonus scope.** The app applies it to week 1 alone. This is an
  assumption traced to no game file. Confirm against a real release before
  trusting weeks 2–8.
- **Attendance / occupancy.** Deliberately not modelled. The calculator outputs
  demand in screenings and assumes it is met; the game reports occupancy against
  400 seats per show. Deriving it needs a viewers model that exists nowhere in
  `src/` and must not be guessed.
