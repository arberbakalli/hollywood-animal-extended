# Genre Dropdown CSS Decision

Status: parked again after 2026-10-03 review.

The owner likes the closed Genre select shape on main. The candidate below is
for improving selected Genre readability without changing the game text. The
extra selected-state weight was tried and rejected, so keep any future pass
lighter unless the owner approves a specific visual.

```css
select[data-category="Genre"].has-selected-tag {
    color: var(--category-color);
    border-color: var(--category-color);
}

.category-group[data-category="Genre"] .category-label {
    color: var(--accent);
}
```

`tests/e2e/readability-hardening.spec.js` verifies contrast and focus stability
at desktop and narrow widths, but it does not approve a specific font weight or
visual treatment.
