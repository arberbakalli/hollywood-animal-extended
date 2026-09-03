# AGENTS.md - Operating Manual

Model-agnostic contract for every coding agent working in this repository.

## Read Order

1. `AGENTS.md`
2. `docs/DECISIONS.md` — why the architecture looks the way it does
3. `docs/KNOWN_ISSUES.md` — confirmed unresolved risks

Source code, tests, and observed browser behaviour override stale prose.

## What This Is

An independent continuation of [CallOn84/Hollywood-Animal-Calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator):
a static web tool for the game Hollywood Animal that generates scripts, scores story-element
synergy, and picks advertisers.

Not a fork on GitHub — its own repository, with the original's commit history preserved.

## Project Layout

The entire application is four files. There is no build step, no framework, and no bundler.

| Path | Purpose |
| --- | --- |
| `index.html` | Markup and the only two `<script>` tags |
| `script.js` | All behaviour — scoring, generation, DOM wiring (~2,000 lines) |
| `data.js` | `GAME_DATA` constants consumed by `script.js` |
| `styles.css` | All styling |
| `data/*.json` | Tag, compatibility, genre-pair and audience-weight fixtures |
| `localization/*.json` | Display names, ten languages |
| `tests/` | Jest suite driving `script.js` through a VM harness |

`index.html` loads `data.js` then `script.js` as **classic scripts**. Neither is a module. This
single fact governs most of the constraints below.

## Current Priority

Improve maintainability of the code that actually runs, without changing behaviour. Tooling,
types, and structure are welcome; new dependencies and frameworks need a reason.

Explicitly rejected directions, with reasons, are recorded in `docs/DECISIONS.md`. Read it before
proposing a rewrite — the Vue migration and the class-extraction approach were both considered and
turned down.

## Approval Gate

Present a plan and wait for explicit approval before writing code or deleting files. The plan must
state the goal, affected files, approach, and verification tier.

Git writes also require explicit approval: `add`, `commit`, `push`, `branch`, `checkout`, merge,
rebase, and PR creation. Read-only Git inspection is allowed.

## Working-Tree Safety

- Expect a dirty tree.
- Never revert, overwrite, or reformat unrelated changes.
- Prefer surgical edits over adjacent cleanup.
- Never use destructive Git commands unless explicitly requested and approved.

## The Classic-Script Constraint

Because `script.js` is a classic script, not a module:

- It cannot `import`. Anything it needs must be a global or defined in-file.
- `data.js` works only because `const GAME_DATA` at top level becomes a global.
- Tests cannot `import` it either — hence the VM harness described below.
- Any file under a `src/` tree that is not referenced by `index.html` **does not run**. A previous
  refactor accumulated 598 lines of such files; they were deleted rather than left to look load-bearing.

Converting to `type="module"` is viable — `index.html` has zero inline `on*` handlers and `data.js`
has exactly one top-level declaration — but it breaks the VM harness and requires a jsdom test
environment. Treat it as a deliberate, approved project, not a side effect.

## Testing

`npm test` — Jest, native ESM, 18 tests across 2 suites.

**`tests/helpers/legacyHarness.js`** evaluates `data.js` and `script.js` inside a `node:vm` context
with a minimal browser stub. `script.js` only registers a `load` listener and declares functions at
top level, so nothing else executes. `GAME_DATA` is built by stubbing `fetch` to read the on-disk
JSON and calling the real `loadExternalData()` — the fixture is exactly what the browser builds, with
no reimplemented normalisation to drift.

**`tests/scoringCore.test.js`** is a golden master over the scoring core: 10 snapshots covering
`calculateMatrixScore`, `calculateTotalBonuses`, `calculateGenrePairScore`, the genre-pair bonus, a
real conflict pair, degenerate inputs, and lookup symmetry. These do not assert the numbers are
*correct* — no specification exists — they assert the numbers do not *change*. That is what makes
refactoring verifiable.

**`tests/liveData.test.js`** checks consistency between `data.js` and `index.html` by reading both,
never by restating their values.

Snapshot changes are never routine. A diff means either a real regression or a deliberate behaviour
change that must be argued for in the commit message.

## Verification Tiers

| Change | Minimum verification |
| --- | --- |
| Documentation only | Reference check and diff check |
| Scoring or generation logic | `npm test` with snapshots unchanged |
| DOM wiring or event handling | `npm test` plus a browser walkthrough of the affected tab |
| CSS | Browser check at desktop and mobile widths |
| Anything touching `index.html` script tags | Full browser walkthrough, all three tabs |

Passing tests does not mean the app works. The harness stubs the DOM; it cannot catch a broken
selector or a listener bound to a missing element. Escalate to a browser check whenever a change
crosses into DOM territory.

## Regression Guards

These bugs were found and fixed by reading the running app, not the tests. None may return.

1. **Excluded Elements silently inert.** 194 banned tags sat in the DOM while 0 reached the
   generator: a UI class aborted on a null container, so the exclusion set stayed empty, and the
   caller tested whether the manager object existed rather than whether it held anything.
2. **Two disagreeing score tables.** Help text promised 4/6/8/9/10 elements for target scores 6–10
   while the generator used 5/7/8/9/9. Now one function, `getRequiredElementCount`, feeds both.
3. **`requestIdleCallback` in a hidden tab.** Chrome suspends idle callbacks in background tabs and
   ignores the timeout guarantee, so tabbing away during the Starting Tags load left the list
   permanently empty. Replaced with `setTimeout(fn, 0)`, which keeps the paint opportunity without
   the visibility dependency.
4. **Lazy-load flag never cleared.** Switching profiles left the loaded flag set, so the list never
   rebuilt. Cleared on profile switch and on Reset Bans.
5. **Score help text uninitialised.** The page shipped a hardcoded placeholder until the first
   slider touch. `updateScoreDisplay()` now runs during setup.

## Dependency Policy

Current devDependencies: `jest`, `@jest/globals`, `cross-env`. Nothing at runtime.

The app ships as static files with no build step, and that is a feature. Adding a bundler, a
framework, or a runtime dependency changes how the app is served and deployed — propose it as its
own approved change with a stated problem it solves, never bundled into unrelated work.

## Known Constraint: `npx jest`

Bare `npx jest` fails all suites with "Cannot use import statement outside a module". The suite is
native ESM, which Jest gates behind `NODE_OPTIONS=--experimental-vm-modules`; no config file can
supply a Node flag. Use `npm test`, and point IDE test runners at that script rather than at the
jest binary. Verified on Node 24.

## Credits

Original tool by [CallOn84](https://github.com/CallOn84/Hollywood-Animal-Calculator).
Distribution maths adapted from aalbertinib's Hollywood Animal Master.
