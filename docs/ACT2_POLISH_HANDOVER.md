# Act 2 Polish Handover

Status: parked product work. Main is the source branch for the shipped app.

This note preserves the useful planning from `parked/act-2-polish` without
bringing old branch code or stale test expectations forward.

## Already Settled on Main

- Script freshness is shipped and documented in `docs/GAME_RULES.md`.
- Age and gender appeal is shipped in Script Lab.
- Best Artistic and Best Commercial generation are shipped.
- The Agency Compatibility Matrix was removed for good. Build for Target covers
  that need. See `docs/DECISIONS.md`.
- Movie score ceilings and Target Movie Score / Max Element Pool mapping follow
  the current `docs/GAME_RULES.md` section 1. Do not reuse older branch notes
  that describe the previous mapping.

## Parked Product Ideas

### Award Targets

Goal: let the player aim a film at one of the game's year-end lists.

- Box Office Success: highest box office receipts.
- Critical Acclaim: critics' ratings, influenced by artistic rating.
- Fan Favorites: Kinomark rating, influenced by commercial rating.

Open decision: should these replace the current Highest Artistic / Highest
Commercial buttons, or sit beside them as a separate target selector?

### Released-Film Tracker

Goal: help the player see when repeated elements may become stale in-game.

The tracker should warn only. The freshness pill remains the actual per-element
state the app uses.

Open decision: count the last N released films, or ask for an in-game release
date so the tracker can follow the game's 500-day window?

### Genre Dropdown Polish

The owner likes the closed Genre select shape on main. The parked selected-Genre
readability polish shipped on 2026-10-03.

Known candidate from the parked CSS branch:

```css
select[data-category="Genre"].has-selected-tag {
    color: var(--category-color);
    border-color: var(--category-color);
    font-weight: 600;
}

.category-group[data-category="Genre"] .category-label {
    color: var(--accent);
}
```

Pinned by `tests/e2e/readability-hardening.spec.js`. Native `<option>` styling
is browser-limited, so future changes still need real-browser verification.

## Start Here Later

1. Re-read `docs/GAME_RULES.md` and `docs/DECISIONS.md`.
2. Pick one parked idea and write the rule first.
3. Add a failing focused test for that rule.
4. Implement the smallest UI/code change.
5. Run focused tests, then the relevant full suite.

## Branch Cleanup Note

The old `parked/act-2-polish` branch contains historical experiments and stale
snapshots. Preserve docs/notes first, then delete the branch instead of merging
it.
