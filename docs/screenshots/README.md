# Product Screenshots

Captured on 26 September 2026 from the local working version based on `a13feb4`.
These are product previews, not evidence that this version is deployed and not
pixel-test baselines. The Agency Compatibility Matrix capture was removed with
the feature on 28 September 2026 (`docs/DECISIONS.md` section 5).

Chromium viewport: 1366 x 1100. Real application controls and data were used;
no scores, options or results were inserted into the DOM. A fresh browser
started with the actual Starting Tags deck (193 exclusions).

| File | Content and framing |
| --- | --- |
| `script-lab.png` | Complete settings panel, Cowboy locked, exclusions collapsed, Age & Gender Appeal visible |
| `colman-graves-evaluation.png` | Verdict through compatibility/movie-score breakdown; pair analysis below is outside this crop |
| `colman-graves-best-matches.png` | Actual additions after raising the element pool to 10, with mode controls visible |
| `marketing-release.png` | Target audience and holiday recommendations; the distribution calculator is outside this crop |
| `build-for-target.png` | First three ranked combinations; further results are outside this crop |
| `script-library.png` | Expanded pinned script, with tags and transfer controls visible |

## Refresh Checklist

1. Start `npm run serve` and use a fresh browser context. Do not capture a stale
   preview server or an old browser tab.
2. Keep Starting Tags applied, lock Cowboy, and generate a script. Pin a result
   and expand its library card.
3. Transfer that script to Colman Graves and wait for the scores to render.
4. Raise Max Element Pool to 10 before generating Best Matches from the full
   script. Capture actual suggestions, not the full-budget empty state.
5. Transfer the evaluated script to Marketing & Release. Wait for the holiday
   recommendations, then capture the relevant panels.
6. Run Build for Target and capture real combinations. Wait for web fonts before
   taking any image; crop at panel or result boundaries, not mid-row.
7. Review every PNG. Confirm no blank result panel, loading message, clipped
   text, open dropdown or pointer overlay obscures the feature.

Generated combinations may vary. These images illustrate the workflow; their
numbers are not expected outputs for automated tests. The local capture report
is retained at `output/playwright/readme-current/capture-report.json` (ignored
by Git), including browser errors and the separate mobile overflow check.
