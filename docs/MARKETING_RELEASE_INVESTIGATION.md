# Marketing & Release Investigation Backlog

Raised: 2026-10-03 from owner in-game screenshots and release notes.

These are product/rule investigations, not settled formulas. Do not turn the
screenshots alone into exact math. Use game files or repeatable in-game tests
before changing calculator source data.

## Impact Audit

| Rule area | Current app behavior | New evidence / suspected behavior | Implementation sites | Tests/scenarios affected | Status |
|---|---|---|---|---|---|
| Factory policy | `Factory Policy` only halves pre-release advertising duration from 6 weeks to 3 in `src/marketing/marketingPlanner.js`. | Game factory building/policy can give an opening-week release boost. Owner has seen roughly 11% to 39%. Need determine whether this is a slider value, random range, building tier, or policy-specific value. | `index.html` policy controls, `src/marketing/distributionPlanner.js`, `src/marketing/marketingPlanner.js`, `tests/e2e/marketing-release.spec.js`, `tests/distribution-*.test.js`. | Marketing Release BDD and distribution tests need new cases once formula is settled. | Needs game-file extraction / in-game confirmation. |
| Factory control placement | Factory toggle is inside `Recommended Advertisement Duration`. | Owner wants Factory with Behemoth/Boutique policy controls. It may still affect duration, but visually it belongs with studio/building policies. | `index.html`, CSS, page repository, TC04-000025 currently asserts it sits on the duration heading row. | TC04-000025 must change only after owner approves final UI placement. | Product-approved direction, implementation pending. |
| Advertiser recommendations | Analyze Script shows a single `Top Pick`, then alternatives ranked by advertiser fit/grade. | One high-fit advertiser can produce poor profit. In-game outcome suggests profitable campaigns often need 4+ advertisers, as many as possible without damaging Kinomark by targeting wrong audiences. Need distinguish profit strategy from Kinomark strategy. | `src/marketing/advertiserMatcher.js`, `src/marketing/marketingPlanner.js`, `src/marketing/targetedAds.js`, `tests/advertisers.test.js`, `tests/e2e/advertiser-fit-parity.spec.js`. | New BDD should describe campaign mix recommendations, avoid-audience guidance, and profit-vs-rating tradeoff after formula is known. | Needs design and game-file proof. |
| Attendance / screenings | Distribution grid estimates screening demand from commercial score, Behemoth/Boutique, opening boost and holiday bonus. It does not model gross, revenue, ad count, or occupancy. | Screenshots show real attendance at 53% for 49,896 screenings with 4 ads, and 26% for 40,396 screenings with 1 ad. Current calculator can imply much higher audience demand. Attendance/occupancy appears to be separate from screening demand. | `src/marketing/distributionPlanner.js`, docs/GAME_RULES.md section 4/6, distribution tests. | Tests should not assert revenue/attendance until source formula is extracted. | Needs source-file search and controlled game runs. |
| Build for Target duplicate result sets | Generator could return several cards with the same tag set in different display order. | Same set should count once; reordered tags give false variety. | `src/generator/scriptGenerator.js`, generation tests, Script Lab BDD. | `tests/generator-unique-results.test.js` covers this now. | Fixed 2026-10-03. |
| Recommended advertisement duration | Panel gives 6/4/4 week timing and Factory halves pre-release. | Owner rarely uses it; feature feels stale. It may need to become part of a richer campaign plan once advertiser count and attendance formulas are known. | `src/marketing/marketingPlanner.js`, `index.html`, CSS, marketing-release scenarios. | Existing duration tests should stay until replacement is designed. | Parked behind ad strategy investigation. |

## Product Shape Proposal

1. Split Marketing recommendations into two named strategies:
   - **Kinomark / rating strategy:** fewer, best-fit advertisers.
   - **Profit strategy:** broader advertiser mix that avoids hostile audiences.
2. Add a campaign mix row instead of one `Top Pick`:
   - "Use 4 advertisers: A, B, C, D"
   - "Avoid these because they over-target weak audiences: X, Y"
   - "Expected ad effect: unknown until formula is extracted"
3. Move Factory into the Distribution Calculator policy row with Behemoth and
   Boutique. Keep the duration effect visible in the duration panel.
4. Add a Factory opening-week boost control only after its source is known:
   - If game gives a concrete percentage, use one numeric input/slider.
   - If game gives a range, show min/max and let the player choose observed
     value for the run.

## Working Recommendation From 2026-10-03 Review

Do **not** replace the current distribution formula yet. Treat it as the app's
baseline **screening demand** estimate, not as a full attendance, revenue or
profit simulation.

The screenshots strongly suggest the calculator is missing a second layer:
attendance/occupancy/ad-reach conversion. The game can show 100% ad effect and
still produce 26%-53% attendance depending on advertiser mix, audience fit,
screenings and likely other hidden campaign math. That means the existing
commercial-score curve may still be a useful baseline, while the app is
currently overconfident because it assumes demand is fully met.

Recommended product shape:

1. Keep **Baseline Demand** as the current formula.
2. Add a separate **Adjusted Attendance / Calibration** layer only when we have
   enough evidence. Until then, make it user-entered or clearly labelled as
   experimental.
3. Add a **Factory Opening Week Boost** input/slider only after confirming the
   source. If still unconfirmed, make it an optional manual observed value
   rather than a game-rule constant.
4. Split advertiser guidance:
   - **Best Kinomark Pick:** one or two highest-fit advertisers.
   - **Best Profit Campaign:** four or more good-enough advertisers that cover
     likely viewers while avoiding hostile audiences.
   - **Avoid These:** advertisers that over-target audiences weak for the film.
5. Recommended Advertisers should stop implying "Top Pick = best profit." It is
   currently best fit/rating strategy, not a revenue strategy.
6. Show confidence labels:
   - **Game-file backed** for extracted formulas.
   - **Owner-observed** for repeated screenshots/runs.
   - **Experimental** for calibration sliders and profit estimates.

The safest next implementation is UI/product framing first: make the app honest
about baseline demand vs attendance/profit, then add math only when game files
or controlled runs prove it.

## Evidence To Gather Next

- Game file/string for Factory opening-week boost and its percentage source.
- Game file/string for ad campaign effect, advertiser count, and audience
  penalty/bonus.
- Whether "Ad effect 100%" caps revenue effect or only campaign awareness.
- Whether attendance percent is occupancy, audience turnout, or both.
- Controlled runs with same film, same screenings, one advertiser vs four
  advertisers, and same budget duration.
