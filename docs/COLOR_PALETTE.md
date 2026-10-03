# Color Palette Rules

**Source of Truth**: All colors defined in `styles.css` `:root` CSS variables.

## Category Colors

### Story Elements
- **Protagonist**: `#508058` (muted green) — green text, green border
- **Antagonist**: `#584090` (purple) — purple text, purple border  
- **Supporting Character**: `#588098` (blue-gray) — blue text, blue border
- **Theme & Event**: `#905040` (rust/orange) — rust text, rust border
- **Finale**: `#904870` (pink/purple) — pink border when selected

### Location & Context
- **Setting**: `#8fa3d1` (lovely blue) — blue text, blue border, blue label
- **Genre**: Per-genre color (see Genre Palette below)

### Genre Palette (Selected Dropdown & Items)
| Genre | Color | CSS Variable | Usage |
|-------|-------|--------------|-------|
| Action | `#804830` | `--cat-genre-action` | Option text, dropdown text in exclusion |
| Adventure | `#486030` | `--cat-genre-adventure` | Option text, dropdown text in exclusion |
| Comedy | `#305860` | `--cat-genre-comedy` | Option text, dropdown text in exclusion |
| Detective | `#583050` | `--cat-genre-detective` | Option text, dropdown text in exclusion |
| Drama | `#303860` | `--cat-genre-drama` | Option text, dropdown text in exclusion |
| Historical | `#906038` | `--ha-genre-historical` | Option text, dropdown text in exclusion |
| Horror | `#604038` | `--ha-genre-horror` | Option text, dropdown text in exclusion |
| Romance | `#508058` | `--cat-genre-romance` | Option text, dropdown text in exclusion |
| Science-Fiction | `#404860` | `--ha-genre-science-fiction` | Option text, dropdown text in exclusion |
| Slapstick Comedy | `#485030` | `--cat-genre-slapstick-comedy` | Option text, dropdown text in exclusion |
| Thriller | `#784030` | `--cat-genre-thriller` | Option text, dropdown text in exclusion |

### Accent Colors
- **Gold** (`#d4af37`): `--accent` — Genre labels, buttons, UI highlights
- **Emerald Green** (`#10b981`): `--success` — High-synergy indicators, success states, the
  Boutique toggle, "good" audience cells. It is the app's only green for these: use the token (or
  `color-mix` on it for a tint), never the hex. Neon green (`#4cd964`) and the older mint
  (`#55EA83`) were removed 2026-09-28; `tests/no-neon-green.test.js` fails if either returns.

## Dropdown Styling Rules

### When a Dropdown Is Empty
- **Text Color**: Full category palette color (`--category-color`), so
  `-- Select Protagonist --`, `-- Select Setting --`, etc. match their section label.
- **Border Color**: Full category palette color (`--category-color`), not a faint transparent mix
- **Background**: Dark input background (`--input-bg`)

### When Item is Selected
1. **Text Color**: Use category color
2. **Border Color**: Use category color  
3. **Background**: Dark input background (`--input-bg`)
4. **Genre exception**: A selected Genre dropdown uses the selected genre's own
   documented color (`--cat-genre-action`, `--cat-genre-drama`, etc.) for text
   and border, not the gold Genre category color.

### When Displaying in Dropdown Options
- **Option text color**: Match category color (via `option.category` class)
- **Genre**: Use per-genre color
- **Setting**: Use blue (`#8fa3d1`)
- **Protagonist**: Use green (`#508058`)
- **Antagonist**: Use purple (`#584090`)
- **Supporting Character**: Use blue-gray (`#588098`)
- **Theme & Event**: Use rust (`#905040`)
- **Finale**: Use pink (`#904870`)

## CSS Rules Reference

### Dropdowns
```css
/* Empty state - all categories */
select.tag-selector:not(.has-selected-tag) {
    color: var(--category-color);
    border-color: var(--category-color);
}

/* Selected state - story element categories */
select.tag-selector.has-selected-tag {
    color: var(--category-color);
    border-color: var(--category-color);
}

/* Selected Genre uses the selected genre's own color */
select.tag-selector[data-genre]:not([data-genre=""]) {
    color: var(--tag-color);
    border-color: var(--tag-color);
}

/* Setting specifics */
select[data-category="Setting"].has-selected-tag {
    color: var(--cat-setting); /* blue */
    border-color: var(--cat-setting);
}

/* Finale specifics */
select[data-category="Finale"].has-selected-tag {
    border-color: var(--ha-category-finale);
}
```

### Category Labels
```css
.category-label {
    color: var(--text-muted); /* default gray */
}

/* Specific overrides */
.category-group[data-category="Protagonist"] .category-label {
    color: var(--ha-category-protagonist); /* green */
}

.category-group[data-category="Genre"] .category-label {
    color: var(--accent); /* gold */
}

.category-group[data-category="Setting"] .category-label {
    color: var(--cat-setting); /* blue */
}
```

### Exclusion List Items
```css
/* Setting items in exclusion dropdown */
#selectors-container-excluded select[data-category="Setting"] {
    color: var(--cat-setting) !important; /* blue */
}

/* Genre items in exclusion dropdown */
#selectors-container-excluded select[data-category="Genre"] {
    color: var(--category-color) !important; /* per-genre */
}
```

## Implementation Checklist

- [x] Protagonist: green (#508058) across all contexts
- [x] Antagonist: purple (#584090) across all contexts  
- [x] Supporting Character: blue-gray (#588098) across all contexts
- [x] Theme & Event: rust (#905040) across all contexts
- [x] Finale: pink (#904870) border on selection
- [x] Setting: blue (#8fa3d1) across all contexts
- [x] Genre: per-genre colors in dropdowns and exclusion list
- [x] Genre labels: gold (#d4af37)
- [x] Empty dropdown placeholder text: full category palette color
- [x] Empty dropdown borders: full category palette color, not faint transparent mix
- [x] Selected Genre dropdown text and border: selected genre palette color
- [x] High-synergy indicators: emerald green (#10b981), not neon green
- [x] Boutique toggle and every other success/"good" state: `--success`, no neon anywhere (2026-09-28)
- [x] All dropdowns: colored text + border when selected
- [x] All exclusion items: category color applied

## 2026-10-03 Dropdown Polish Notes

Removed:
- Faint placeholder borders using `color-mix(... 50%, transparent)`.
- Muted gray placeholder text for category selectors.
- Lifted/mixed dropdown option text such as
  `color-mix(in srgb, var(--cat-protagonist) 42%, var(--text-main))`.
- Selected Genre dropdowns using the generic gold Genre category color after a
  specific genre was chosen.
- The tried-and-rejected selected-state `font-weight: 600`.

Added:
- Empty dropdown placeholder text and border use the section's own
  `--category-color`.
- Non-Genre dropdown options use the same category palette color as their label.
- Selected non-Genre dropdown text and border use the category palette color.
- Genre options use each genre's documented color.
- Selected Genre dropdown text and border use the selected genre's documented
  color via `data-genre` and `--tag-color`.
- Playwright coverage in `tests/e2e/readability-hardening.spec.js` verifies the
  palette linkage without hardcoding individual hex values.
