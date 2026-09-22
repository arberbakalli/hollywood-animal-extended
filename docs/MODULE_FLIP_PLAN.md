# Module Flip — Migration Plan

Converting `src/` from classic scripts to ES modules. Written 2026-09-22 with
the blast radius measured rather than estimated, because the file count badly
understates the work.

**Not started.** This document is the plan, not a record of it.

---

## Why it is wanted

Test coverage cannot be measured today. `tests/helpers/legacyHarness.js` runs
the classic scripts inside `node:vm` and reaches their functions as bare
globals, so istanbul has nothing to instrument. Coverage is what would have
caught this repo's vacuous tests without hand-checking each one — the suite was
fully green while three tests named for the element budget asserted nothing.

## What it actually costs

| Surface | Count |
|---|---|
| `src/` modules assigning to `global.HAC*` | 27 |
| `src/` files not following the IIFE shape (`state.js`, bare `var`s) | 1 |
| Bare-global wrappers in `script.js` | 118 |
| `<script src="src/…">` tags in `index.html` | 28 |
| Jest suites running on the vm harness | 18 |
| `h.call` / `h.evaluate` sites inside them | 157 |

## The part that makes it atomic

`export` is a syntax error in a classic script, so a file cannot be both. The
moment one module gains `export`, `index.html` must load it as
`type="module"` — and module scripts defer and resolve by import graph rather
than by tag order, so the whole set moves together.

## The path that keeps the tests still

The 157 call sites are the expensive part, and they do not have to change.

Each module keeps its `globalThis.HAC* = { … }` assignment **and** gains a
matching `export`. Bare globals therefore still exist at runtime, `script.js`
keeps bridging them, and every existing test keeps resolving names the way it
does now. Only *loading* changes.

For the harness, `--experimental-vm-modules` is already set by the `test`
script, so `vm.SourceTextModule` is available: the harness can evaluate the
modules as ESM inside the same sandbox it builds today, with the same fake
`document` / `window` / `fetch`, and expose the same surface.

## Order

1. **Harness first, still on classic scripts.** Give `legacyHarness.js` a
   module-aware loader path, unused. Suite stays green; nothing else moves.
2. **Leaf modules.** `domIds.js`, `state.js`, `scoreFormatting.js` — no
   dependants inside `src/`. Add `export` alongside the global assignment.
3. **`index.html` to `type="module"`**, all 28 tags in one commit, with
   `script.js` last. This is the only step with no green half.
4. **Remaining 24 modules**, in dependency order from the graph
   (`graphify-out/GRAPH_REPORT.md` community hubs give the order).
5. **Harness switches** to the module loader. Suite must stay at the same test
   count — a drop means a suite silently stopped loading, which reports zero
   failures while covering nothing.
6. **Only then** drop the global assignments and rewrite the 118 wrappers and
   157 call sites, one suite at a time. Each of these *is* individually green.
7. **Turn on coverage** and read the first honest number.

## Rules for whoever does it

- Do not start unless step 3 can be finished in the same sitting. Between the
  first `export` and the last script tag there is no working suite.
- Check `Test Suites:` and the test **count**, not just `Tests: passed`. A suite
  that fails to load reports zero failures.
- `state.js` is the odd one: bare `var`s, no IIFE, relied on by everything.
  Convert it first and keep the `var` bindings, or every consumer breaks at once.
- Expect the coverage number to be unflattering. That is the point of the
  exercise; do not chase it in the same change.
