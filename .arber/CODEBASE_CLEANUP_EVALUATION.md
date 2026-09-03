# Codebase Cleanup Evaluation

## Source Inputs

- `graphify-out/GRAPH_REPORT.md`
- `.arber/GRAVES_EVALUATION_ANALYSIS.md`
- Existing Jest and golden-master tests
- Current `index.html`, `script.js`, `styles.css`, and `src/` modules

## Current Architecture Read

Graphify shows the real center of gravity is still the classic browser app:

- `script.js` owns application boot, tab state, selector creation, script generation, advertiser analysis, distribution rendering, and synergy output.
- `data.js` plus `data/*.json` are the data source of truth.
- `src/core/` and `src/features/` contain the right future shape, but only part of that structure is wired into the browser page.
- The strongest current safety net is the Jest suite, especially `tests/scoringCore.test.js`, because it locks scoring behavior while structure changes.

## Colman Graves Evaluation Tab

Adding a dedicated `Colman Graves Script Evaluation` tab is a good product direction, but it should be a second pass after the cleanup baseline.

Recommended scope:

- Use existing compatibility and bonus logic rather than inventing new math.
- Present the same selected tag set through a game-feeling "Graves dossier" view.
- Show primary score, threshold label, rare/conflict pairs, target audience, and possible franchise/sequel notes when that data file is available.
- Keep the tab read-only at first: evaluate what is selected in `SE Compatibility` or `Best Advertisers`, then add richer controls later.

Do not add the tab until screenshots are available, because the requested "game vibe" should come from concrete UI reference rather than generic styling.

## Cleanup Priorities

1. Preserve logic.
   Keep scoring, generation, distribution, and advertiser math unchanged unless a golden-master test is added first.

2. Stabilize DOM hooks.
   Static panels and controls should have unique IDs. Dynamic rows/cards should expose safe IDs plus `data-role`, `data-category`, `data-context`, and `data-script-id` where relevant.

3. Keep HTML presentationally clean.
   No inline event handlers, no inline style attributes, no `javascript:` URLs. Bind behavior from JavaScript and move visuals to CSS classes.

4. Improve selector-safe naming.
   Category-derived DOM IDs should come from one helper so names like `Theme & Event` cannot produce brittle CSS selectors.

5. Keep CSS readable.
   CSS should own margins, paddings, colors, and state classes. JavaScript can set CSS custom properties only for genuinely dynamic values, such as slider fill percentage.

6. Add guard tests.
   Unit tests should enforce unique IDs and no inline attributes so future Claude/Codex passes do not regress the structure.

7. Clean generated artifacts.
   Ignore local test/browser output such as `.playwright-cli/`, while keeping intentional graphify reports under version control if they are part of the project workflow.

## Executed In This Pass

- Added unique static IDs to the main shell, header, tab buttons, feature panels, result areas, and primary action buttons.
- Added generated DOM IDs and `data-*` hooks for tag selector rows, search results, and generated/pinned script cards.
- Centralized category-to-DOM-id conversion through `categoryToElementSlug`.
- Added structure tests for no inline HTML behavior/styling, unique IDs, required panel hooks, and selector-safe category IDs.
- Added a root `.gitignore` for local generated artifacts.

## Next Refactor Pass

- Extract `calculateMatrixScore`, `calculateTotalBonuses`, and `calculateGenrePairScore` into `src/core/scoringCore.js` behind the existing golden-master tests.
- Extract DOM rendering into `src/ui/` modules only after the scoring core is isolated.
- Decide whether the exclusion UI should be the old dropdown interface or the new `ScriptGeneratorUI`; right now both patterns exist, which should be resolved before adding the Graves tab.
- Add screenshot-driven styling once game screenshots are available.
