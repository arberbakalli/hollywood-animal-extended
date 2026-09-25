# Hollywood Animal Extended

Unofficial companion tool for **Hollywood Animal** players. It helps plan scripts,
evaluate story-element fit, estimate movie scores, pick advertisers, and forecast
release demand using extracted game data where available.

This project continues
[CallOn84's original calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator)
as a plain static web app: no framework, no bundler, no build step. The app is
organized into classic scripts under `src/`.

## Screenshot Plan

The old single screenshot is outdated. Replace it with fresh captures for the
current product areas:

| Area | Placeholder |
| --- | --- |
| Script Lab generator, locks, exclusions and Age & Gender Appeal | `docs/screenshots/script-lab.png` |
| Colman Graves evaluation with verdict, score breakdown and pair analysis | `docs/screenshots/colman-graves-evaluation.png` |
| Colman Graves Best Matches with additions, swaps and pairwise modes | `docs/screenshots/colman-graves-best-matches.png` |
| Marketing & Release distribution calculator and holiday recommendations | `docs/screenshots/marketing-release.png` |
| Agency Compatibility Matrix | `docs/screenshots/agency-compatibility-matrix.png` |
| Build for Target combinations | `docs/screenshots/build-for-target.png` |
| Script Library save/load workflow | `docs/screenshots/script-library.png` |

## Features

### Script Lab

- Generate candidate scripts from selected genres, setting and story elements.
- Lock must-have elements so every generated script keeps them.
- Maintain a global Excluded Elements list used by Script Lab, Colman Graves,
  Marketing & Release and Build for Target.
- Switch between Starting Tags and Custom availability profiles.
- Generate specialized high-artistic or high-commercial script options.
- View Age & Gender Appeal for selected roles.
- Pin scripts into the Script Library, then export/import the library as JSON.

### Colman Graves

- Evaluate a script with required Genre, Setting and Protagonist rules.
- Show average fit, script synergy, commercial/artistic bonuses and potential
  movie score.
- Explain conflicts and pair analysis by success band.
- Generate Best Matches from one or more seed elements without requiring a full
  script.
- Explore Best Additions, Swap Suggestions and Pairwise views.
- Filter suggestions by category, minimum fit and Starting Tags.
- Transfer evaluated scripts into Marketing & Release.

### Marketing & Release

- Analyze a script for target audiences and movie lean.
- Estimate weekly distribution demand from the commercial score.
- Apply studio policy toggles:
  - Behemoth: 25% demand boost, with slower decay gated by commercial score.
  - Boutique: slower decay gated by artistic score.
  - Factory Policy: shorter pre-release advertising run.
- Recommend advertisers based on source agency targeting data.
- Show the Agency Compatibility Matrix from extracted game agency data.
- Recommend holiday release windows using `data/Holidays.json`, including
  demographic-specific tier messaging and opening-week demand impact.
- Save analyzed scripts to the Script Library.

### Build for Target

- Search for strong scripts by audience or advertiser target.
- Let advertiser selection override audience selection when needed.
- Lock optional elements into the search.
- Respect global exclusions and the same story-element budget rules as the rest
  of the app.
- Rank combinations by advertiser fit.

## Game Data Notes

- `docs/GAME_RULES.md` records the current product rules and source-of-truth
  decisions.
- Extracted game files live under `extractedFilesFromGameSourceOfTruth/`.
- Holiday release bonuses are loaded from `data/Holidays.json`.
- Scenario files in `tests/scenarios/` are the behaviour map. Tests should guard
  behaviour, not be rewritten only to make failing code pass.

## Running Locally

The app is static, but it fetches JSON files at runtime. Open it through the
local server, not `file://`.

```bash
npm install
npm run serve
```

Then open:

```text
http://127.0.0.1:4173
```

## Testing

```bash
npm test
npm run test:e2e
```

Useful focused checks:

```bash
npm test -- holiday-release --runInBand
npm test -- age-role-breakdown --runInBand
npx playwright test tests/e2e/marketing-release.spec.js
```

## Repo-Wide Review Passes

The review skills/checks we wanted to run before calling the feature set done:

- `karpathy-guidelines`: keep changes surgical, simple and verifiable.
- `frontend-design`: full HTML/CSS/UI consistency pass.
- `playwright`: browser verification for important workflows and screenshots.
- BDD best-practices review: make sure `tests/scenarios/*.feature` describe real
  user behaviour and that automated tests honestly cover them.
- Jest/unit-test quality review: make sure tests call production code, avoid toy
  simulations and protect high-risk rules.

## Credits

- **[CallOn84/Hollywood-Animal-Calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator)**:
  original calculator and foundation.
- **[userbig/hollywood-animal-planner](https://github.com/userbig/hollywood-animal-planner)**:
  UI inspiration for collapsible exclusion sections and live counts.
- **aalbertinib's Hollywood Animal Master**:
  distribution-calculator maths reference.

Game data and localisation files originate from Hollywood Animal itself and
belong to its developers.

## License

GNU General Public License v3.0. See [LICENSE](LICENSE).
