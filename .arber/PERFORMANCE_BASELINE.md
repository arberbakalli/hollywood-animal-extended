# Hollywood Animal Calculator - Cold Start Baseline

Date: 2026-09-25T19:09:50.129Z
Measurement Session: 2026-09-25
Runs: 5 (5 successful)
URL: http://localhost:4173

## Summary Metrics

| Metric | Value |
|--------|-------|
| **Median hollywood:ready** | 751 ms |
| Min | 491 ms |
| Max | 2184 ms |
| Average | 974 ms |
| Std Dev | 616 ms |
| Variation (Max - Min) | 1692 ms |

## Individual Run Results

| Run | hollywood:ready (ms) | Total Time (ms) | Status |
|-----|--------|------|--------|
| 1 | 751 | 21257 | ✅ Complete |
| 2 | 2184 | 22562 | ✅ Complete |
| 3 | 830 | 20761 | ✅ Complete |
| 4 | 614 | 19629 | ✅ Complete |
| 5 | 491 | 18545 | ✅ Complete |

## Detailed Results

### Run 1
- Timestamp: 2026-09-25T19:07:34.223Z
- hollywood:ready: 751ms
- Total elapsed: 21257ms
- DOMContentLoaded: 303ms
- domInteractive: 302ms

### Run 2
- Timestamp: 2026-09-25T19:08:16.938Z
- hollywood:ready: 2184ms
- Total elapsed: 22562ms
- DOMContentLoaded: 1428ms
- domInteractive: 1427ms

### Run 3
- Timestamp: 2026-09-25T19:08:43.605Z
- hollywood:ready: 830ms
- Total elapsed: 20761ms
- DOMContentLoaded: 465ms
- domInteractive: 459ms

### Run 4
- Timestamp: 2026-09-25T19:09:08.432Z
- hollywood:ready: 614ms
- Total elapsed: 19629ms
- DOMContentLoaded: 267ms
- domInteractive: 266ms

### Run 5
- Timestamp: 2026-09-25T19:09:31.528Z
- hollywood:ready: 491ms
- Total elapsed: 18545ms
- DOMContentLoaded: 222ms
- domInteractive: 222ms

## Baseline Analysis

**Median hollywood:ready time: 751ms**

This baseline measures cold-start app initialization with:
- Fresh browser context for each run (no cache, storage, or cookies)
- `networkidle` wait strategy before polling for hollywood:ready
- hollywood:ready event fires at end of initializeApp()

### Instrumentation
Three performance marks were added to src/app/appShell.js:
1. `data:loaded` - After loadExternalData() completes
2. `selectors:initialized` - After all selector panels initialized
3. `app:ready` - At end of initializeApp() before hollywood:ready event

### Key Findings
- Cold-start app initialization takes median **751ms**
- Variation between runs: ±616ms (standard deviation)
- Best run: 491ms | Worst run: 2184ms
- Measurement consistency: 5/5 runs successful

### Interpretation
The baseline establishes a quantified starting point for performance work.
After implementing Phase 2.1 optimizations (lazy-load selectors, deferred setup),
we will re-measure and compare to quantify the improvement.

### Recommended Next Steps
1. **Profile the initialization**: Use Chrome DevTools Performance tab on a hot run to identify the slowest function
2. **Phase 2.1 implementation**: Lazy-load selector panels, defer non-critical setup
3. **Re-measure**: Run baseline again after optimizations to quantify improvement
4. **Target**: Reduce median hollywood:ready time by 20-30% (target: ~563ms)

## Follow-up Measurement - 2026-09-26

The recommendations above reflect the state when the original baseline was
captured; this section supersedes their pending-work status.

After selector batching, shared exclusion handling, and deferred tab setup, I
repeated the measurement in headless Chromium against the local static server.
Five fresh browser contexts were used. Each context marked Starting Tags as
already seeded before navigation so the `hollywood:ready` metric was separate
from the explicit Apply Starting Tags interaction. The script waited on the
same `hollywood:ready` event used by the Playwright fixture, then timed the
button action until the app's excluded-count badge reached 193.

| Metric | Samples (ms) | Median |
| --- | --- | ---: |
| `hollywood:ready` | 328, 223, 235, 367, 237 | **237** |
| Apply Starting Tags to count 193 | 655, 673, 677, 633, 621 | **655** |

All five runs produced 193 selected exclusions and 200 selector rows (the 193
bans plus the existing empty category rows). The ready median is **68.4% lower**
than the earlier 751 ms baseline. Treat that comparison as indicative: browser
state setup and measurement harness differ, and the machine was not CPU-throttled.
The action timing is a more direct check of the original user complaint; the
batch guard reduced a repeated per-row refresh to one final refresh, and the
current five-run median is under 0.7 seconds. An earlier local session recorded
266 ms for this action, so this run does **not** establish improvement over that
best local sample. The harness/machine conditions were not held constant across
sessions; repeat both with the same script before claiming an action-time delta.

The measured changes were followed by all **201 Playwright tests passing** in
53.6 seconds. Jest currently has one unrelated guard failure: the BDD marker
allowlist expects one backlog entry, while 15 additional scenarios are now
marked `[unverified]`. The other 31 Jest suites pass; the test was not edited.

## Repeatable Benchmark - 2026-09-26

The earlier follow-up above predates the final per-row option deferral and used a
less instrumented run. This section is the current local reference. The reusable
benchmark is `tools/measure-app-performance.mjs`; see
`.arber/APP_LOAD_PERFORMANCE_PLAN.md` for the two-terminal PowerShell commands.

Five genuine first-visit local Chromium contexts, each followed by one same-context
reload. A separate seeded browser context per run timed a manual Apply Starting
Tags click so this interaction is not confused with automatic first-run seeding:

| Metric | Samples (ms) | Median |
| --- | --- | ---: |
| Cold first-run app ready | 271, 215, 216, 213, 220 | **216** |
| Warm app ready | 88, 95, 87, 94, 117 | **94** |
| First-run construction of 193 exclusions | 19, 16, 17, 17, 17 | **17** |
| Manual Apply Starting Tags | 156, 148, 133, 150, 119 | **148** |

Median startup measures: localization **22 ms**, essential JSON **5 ms**,
Script Lab selector setup **8 ms**, Excluded selector setup **2 ms**, Graves
selector setup **1 ms**. All five actual first visits reached ready with exactly
193 bans selected: **2,389 DOM nodes, 214 selectors, 1,157 options**. The
separate manual apply interaction grew from **1,403-1,424 nodes / 771 options**
to **2,389 nodes / 1,157 options**. All runs had no page errors; one manual
sample recorded a 50 ms browser long task. Results are local, headless,
unthrottled, and machine specific; compare production only with the same script
and conditions.

The exclusion UI still renders 193 selected rows when applied. The improvement
is that each row no longer receives a full category's option list; its selectable
menu is populated only when focused. This reduces the post-Starting-Tags option
count to 1,157 while preserving the full 193-ban state. A larger reduction in
DOM rows would require separating the exclusion data model from the rendered
editor; that is intentionally not attempted here because current consumers read
the UI state and such a change needs dedicated behavior coverage.

### Current Hosted Comparison - 2026-09-26

The latest local run used the revised repeatable harness and five runs:

| Metric | Samples (ms) | Median |
| --- | --- | ---: |
| Cold first-run ready | 254, 267, 215, 210, 243 | **243** |
| Warm ready | 92, 83, 92, 90, 100 | **92** |
| First-run exclusion construction | 16, 18, 17, 19, 16 | **17** |
| Manual Apply Starting Tags | 134, 142, 132, 151, 128 | **134** |

The same harness against the current hosted site (first-run-only mode) measured
cold ready at 1,286 / 1,583 / 1,071 / 314 / 368 ms (median **1,071 ms**) and
warm ready at 460 / 478 / 579 / 245 / 303 ms (median **460 ms**). Hosted
exclusion availability after ready was 127 / 66 / 43 / 20 / 16 ms (median
**43 ms**). Its DOM/options footprint was 11,875 / 10,643, versus local
2,389 / 1,157, indicating optimized assets are not deployed.

The latest complete hosted manual-apply sample set is older: 11,249 / 18,358 /
18,051 / 11,611 / 11,006 ms (median **11,611 ms**). A repeat with the revised
harness was interrupted after 3/5 samples and must be rerun; do not compare a
partial median. See `.arber/APP_LOAD_PERFORMANCE_PLAN.md` for resume steps and
deployment caution. These measurements are unthrottled headless Chromium and
local-vs-hosted differences are directional, not controlled.

### Verification Rerun - 2026-09-26

Five-run rerun of the same harness after the performance implementation and
current worktree data edits:

| Metric | Local samples (ms) | Local median | Hosted samples (ms) | Hosted median |
| --- | --- | ---: | --- | ---: |
| Cold ready | 272, 255, 270, 286, 254 | **270** | 952, 797, 336, 456, 320 | **456** |
| Warm ready | 92, 92, 91, 140, 103 | **92** | 248, 235, 243, 225, 238 | **238** |
| Manual Apply Starting Tags | 123, 153, 159, 168, 148 | **153** | 10,030, 9,665, 9,501, 9,624, 11,213 | **9,665** |

Local first-run exclusion construction was 17 / 16 / 17 / 29 / 25 ms (17 ms
median). Local footprint: 2,389 DOM nodes and 1,157 options. Hosted footprint:
11,875 DOM nodes and 10,643 options. Both retained 193 selected exclusions and
200 rows; neither reported browser errors. Hosted manual application took about
63x as long as local, but these are different deployed/local assets, so this is
directional evidence, not a controlled performance claim. The current production
HTML HEAD response has Last-Modified `Fri, 25 Sep 2026 23:00:29 GMT` and ETag
`"6ab6fd0d-afcd"`; its DOM/options footprint still shows the old selector code.

Current verification: full Playwright **201/201 passed**; focused startup,
selector, and exclusion E2E **35/35 passed**. Jest excluding hidden worktrees:
**429/430 tests passed**; the sole failure is the unchanged stale BDD marker
allowlist expecting one unverified scenario instead of the 16 currently found.
See `.arber/APP_LOAD_PERFORMANCE_PLAN.md` for details and the release boundary.

### Post-Deployment - 2026-09-26

Commit `548d7ae` was pushed to `main`; GitHub Pages served the new selector code
with HTML Last-Modified `Sat, 26 Sep 2026 18:29:52 GMT`. Production now has the
same measured footprint as optimized local: 2,389 DOM nodes, 1,157 options,
200 exclusion rows, and 193 selected bans.

| Metric | Hosted samples (ms) | Median |
| --- | --- | ---: |
| Cold ready | 857, 366, 309, 298, 349 | **349** |
| Warm ready | 85, 95, 83, 91, 114 | **91** |
| Manual Apply Starting Tags | 126, 135, 130, 129, 205 | **130** |
| First-run exclusions build | 19, 20, 16, 18, 17 | **18** |
| Exclusions available after ready | 3, 14, 3, 3, 2 | **3** |

No browser page or console errors. Maximum long tasks were 0 / 0 / 0 / 57 / 77
ms. Against the immediately pre-deployment hosted median of 9,665 ms, this is
about 74x faster (98.7% less elapsed time). The production before/after uses the
same harness but remains subject to machine/run variation. Full Playwright:
201/201 passed. Jest: 430/431 passed; the existing BDD marker allowlist is the
sole failure, left unchanged.
