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
