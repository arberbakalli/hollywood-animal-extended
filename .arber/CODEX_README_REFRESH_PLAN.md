# README Refresh Plan

Last prepared: 2026-09-06

## Why the README needs a refresh

The current README still describes the project as a deliberately simple four-file continuation of the original calculator. That was true earlier, but the app has grown into a fuller player toolkit:

- Script Lab for generating script options with locked and excluded elements.
- Script Evaluation with compatibility numbers and Colman Graves judgement.
- Marketing & Release with audience, advertiser, holiday, and distribution guidance.
- Build for Target for finding story-element combinations for specific audiences or advertisers.
- Script Library for saving, loading, pinning, and reusing generated/evaluated scripts.
- A modular `src/` architecture plus a mirrored `docs/` GitHub Pages build.

The README should now feel like Arber's extended Hollywood Animal companion tool, not only a small bugfix fork.

## Suggested README Shape

1. Hero

   Use a wide screenshot or banner showing the actual current UI, not the old square image.

   Suggested text:

   > A fan-made Hollywood Animal planning toolkit for building stronger scripts, checking story-element fit, finding audiences, planning advertisers, and estimating distribution needs.

2. What It Does

   Keep this section product-focused, not code-focused.

   Suggested bullets:

   - Generate script combinations from available story elements.
   - Lock must-have elements and exclude unavailable or unwanted ones.
   - Evaluate script compatibility and movie score potential.
   - Ask Colman Graves for a more game-like script judgement.
   - Match scripts to audiences, advertisers, release windows, and distribution needs.
   - Save and reload script ideas while planning.

3. Product Areas

   Use one subsection per major tab:

   - Script Lab
   - Script Evaluation
   - Colman Graves
   - Marketing & Release
   - Build for Target
   - Script Library

   Each subsection should include one short paragraph and one screenshot.

4. Why This Exists

   Make this personal. Explain that Hollywood Animal has deep systems, but comparing story elements, audiences, advertisers, and distribution by hand is slow. This tool is your own helper layer for experimenting faster.

5. Running Locally

   Replace the old `npx http-server` only instructions with the project scripts:

   ```bash
   ./run.sh
   .\run.ps1
   run.bat
   ```

   Also mention that any static server works, but `file://` will not because JSON data is fetched at runtime.

6. Development

   Update stale test count:

   ```bash
   npm install
   npm test
   npm run sync:docs
   ```

   Mention current test shape:

   - Jest golden-master and data tests.
   - DOM structure checks.
   - GitHub Pages mirror checks.

7. Architecture

   Keep this short:

   - `index.html` is the static app shell.
   - `styles.css` owns UI styling.
   - `src/` contains feature modules loaded as classic browser scripts.
   - `script.js` is a small bootstrap/legacy compatibility shim.
   - `docs/` mirrors the browser app for GitHub Pages.

8. Credits and License

   Keep the current credits, but update wording so it is clear this project has become an extended fan toolkit while preserving original credit and GPL-3.0.

## Images To Add

Use real screenshots from the current app. Avoid one old generic square image as the only visual.

Recommended files:

- `docs/images/readme/hero-dashboard.png`
  - Wide desktop screenshot showing the top navigation and one polished product area.
  - Best candidate: Colman Graves or Script Lab.

- `docs/images/readme/script-lab.png`
  - Shows Script Lab with locked elements, excluded elements, and generated script options.
  - Important because this is the main "build scripts" feature.

- `docs/images/readme/colman-graves.png`
  - Shows Colman Graves selected, with verdict cards and Graves Analysis visible.
  - Important because this is the most distinctive new feature.

- `docs/images/readme/marketing-release.png`
  - Shows Marketing & Release results: audience, advertisers, holiday release, and distribution calculator if possible.
  - Important because this explains the tool is not only about script generation.

- `docs/images/readme/targeted-ads.png`
  - Shows Build for Target with selected audiences/advertisers and top combinations.
  - Important because this is one of the newer Claude-built features and needs proof in the README.

- `docs/images/readme/script-library.png`
  - Shows saved/pinned scripts and transfer actions.
  - Optional, but useful if you want to show the workflow loop.

- `docs/images/readme/mobile.png`
  - One mobile screenshot showing that the app works on narrow screens.
  - Optional, but good for polish.

## Screenshot Rules

- Use current `main`, not old screenshots.
- Use the same browser zoom for all desktop shots.
- Prefer 1366px or 1440px wide desktop screenshots.
- Crop only if it improves readability; do not crop away the active tab labels.
- Keep images under roughly 1 MB each if possible.
- Use PNG for crisp UI. JPG is okay only for large/cropped visuals.
- Put README images in `docs/images/readme/` so GitHub can display them and the Pages site can reuse them later.

## README Personalization Ideas

Add a short "Why I built this" section in your own voice:

> I wanted a faster way to experiment with Hollywood Animal's script and marketing systems without manually checking every pairing. This started as a calculator extension, then grew into a planning bench for script ideas, audience fit, advertiser targeting, and distribution choices.

Add a small note that this is still a fan tool:

> This is unofficial and built for players who like to test combinations, learn the game's systems, and plan better movies.

## Current README Facts To Fix

- "four files, no build step, no framework" is now misleading. The app still has no bundler/framework, but it has a modular `src/` architecture.
- "18 tests across 2 suites" is stale. Current verification is 61 tests across 5 suites.
- The feature list is missing Colman Graves, Build for Target, Script Library, Distribution Calculator, and opening-viewer boost toggles.
- The screenshot is too generic/old for the current product shape.
- The running section should mention `run.ps1`, `run.bat`, and `run.sh`.
- The docs mirror workflow should mention `npm run sync:docs`.

## Proposed Tone

Friendly, personal, and practical:

- "Fan-made planning toolkit" rather than "calculator".
- "Build", "Evaluate", and "Market" as the main verbs.
- Keep credits respectful and explicit.
- Avoid over-selling accuracy. This helps planning; it is not official game documentation.

