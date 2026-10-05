# Testing Features Lab

Date: 2026-10-05

## Objective

Use `codex/testing-features-lab` as the experimental branch where Codex and
Claude can build planned features with minimal owner interaction. Main remains
the stable production branch.

## Chosen Approach

Use both:

- A branch sandbox: agents can change code, data wiring, UI, tests and docs
  without destabilizing `main`.
- A visible lab page: `testing-features.html`, reachable from the header
  `Testing Features` button, collects prototypes and feature experiments before
  they are promoted.

This avoids pretending a separate page can isolate shared JavaScript behavior.
If a prototype changes shared modules, it is still isolated by the branch.

## Agent Rules

1. Work only on the lab branch unless the owner explicitly says to merge.
2. Build experimental UI in `testing-features.html` or feature-specific files
   first.
3. Shared production modules may be edited on the lab branch, but every such
   edit must be documented as a future merge risk.
4. Once the owner likes a feature, port the smallest approved slice to `main`
   with tests and docs.
5. Do not change tests to make code pass unless the owner approves a behavior
   change.
6. Run focused tests after each feature slice.
7. Keep exact game text and source-of-truth rules intact unless the owner gives
   a new game observation.

## Prototype Slots

- Distribution Calibration: observed attendance, factory policy boosts and
  advertiser count effects.
- Advertiser Strategy: profitable multi-ad recommendations versus one high
  grade advertiser.
- Script Diversity: remove duplicate shuffled script sets and explain exhausted
  unique combinations.
- Act 2 Polish: parked feature notes and larger UI/product exploration.

## Promotion Checklist

Before a feature leaves the lab branch:

- Owner likes the UI in browser.
- Behavior is documented in `docs/GAME_RULES.md`, a feature doc, or BDD.
- Focused Playwright/Jest tests pass.
- The change is small enough to review.
- Any shared-module risk is named in the merge summary.

