# Decision Record

Why the architecture looks the way it does. Each entry records what was considered, what was chosen,
and what would change the answer. Read this before proposing a rewrite.

---

## 1. Deleted the `src/` class hierarchy instead of finishing it

**Date:** 2026-09-03

A staged refactor had extracted 598 lines into eight classes under `src/` — `GameConstants`,
`EventBus`, `TabManager`, `ActionManager`, `DistributionEngine`, `ExclusionManager`, `ScriptSearch`,
`ScriptGeneratorUI` — with 89 tests covering them.

None of it ran. `index.html` loads `data.js` and `script.js` as classic scripts and references
nothing under `src/`. A classic script cannot `import`, so `script.js` could never consume those
classes. They were parallel reimplementations of logic that still lived, unchanged, in `script.js`.

This was actively harmful, not merely wasteful:

- The suite reported 106 passing tests while covering almost none of the executing code. Three
  shipped bugs — including Excluded Elements silently dropping all 194 banned tags — survived four
  commits behind that green suite.
- `GameConstants.test.js` claimed to check `data.js` for drift but only re-asserted the same literals
  against `GameConstants` twice. When rewritten to actually read `data.js`, it failed immediately:
  `ROUND_UP_UNTIL_INDEX` sits under `rounding`, not `weeklyCalculation`.
- Every "extract a module" step added a copy rather than removing one, so duplication grew.

**Chosen:** delete `src/` and its six suites. Keep the 18 tests that exercise `script.js` and
`data.js` through the VM harness.

**Alternative considered:** flip `script.js` to `type="module"` and wire the classes in. Viable —
`index.html` has zero inline `on*` handlers and `data.js` has one top-level declaration — but it
breaks the VM harness and needs a jsdom environment. Deferred as its own project rather than done
implicitly.

**What would change this:** if the module flip happens, re-extracting classes becomes worthwhile.
Extract only when `script.js` can import the result, and delete the original in the same commit.

---

## 2. No Vue migration

**Date:** 2026-09-03

Evaluated [userbig/hollywood-animal-planner](https://github.com/userbig/hollywood-animal-planner),
a Vue 3 + TypeScript + Vite + WebAssembly + Pinia rebuild of the same tool, as a migration target.

Rejected on product grounds, not technical ones:

- Its generator makes you wait and did not reliably produce output on arbitrary input. The original's
  immediate batch of scripts is better for the actual task.
- Its Excluded Elements UI is more complex without being clearer.
- Its Board and Release Plan tabs add surface area that obscures what the tool is for.

The original's simplicity is the feature worth protecting.

**Kept from it:** the collapsible card-header pattern for Excluded Elements — a clickable title
showing a live count, with the body toggling — which is a genuine improvement and needs no framework.

**What would change this:** a requirement the four-file structure genuinely cannot serve — multi-view
routing, server-side rendering, or a team large enough that component boundaries pay for their
tooling.

---

## 3. Vanilla JavaScript with better tooling, not TypeScript-by-rename

**Date:** 2026-09-03

Considered renaming every `.js` to `.ts`, adding `tsconfig.json`, and introducing Vite.

Two problems. Most of the files proposed for renaming were the dead `src/` modules — typing code that
never runs buys nothing. And a bundler does not help an app whose `index.html` loads classic scripts;
introducing one means changing how the app is served, which is a much larger change than "add
tooling."

**Chosen:** improve the code that runs. Type-checking via JSDoc against `checkJs` is available
without renaming files or changing how anything loads. Linting and formatting apply directly.

**What would change this:** the module flip. Once `script.js` is a module, a bundler has something to
bundle and a `.ts` pipeline has somewhere to go.

---

## 4. Own repository, not a GitHub fork

**Date:** 2026-09-03

Kept the original's full commit history — the lineage is real and worth showing — but detached the
fork relationship so the project stands on its own.

Credit is given in `README.md` and `AGENTS.md`. The original author was notified via an issue on the
upstream repository.
