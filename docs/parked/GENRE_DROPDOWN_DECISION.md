# Genre Dropdown CSS Decision

Status: parked candidate, not final shipped behavior.

The owner likes the closed Genre select shape on main. The candidate below is
for improving selected Genre readability without changing the text.

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

Before applying it, verify contrast and dropdown behavior in browser at desktop
and narrow widths.
