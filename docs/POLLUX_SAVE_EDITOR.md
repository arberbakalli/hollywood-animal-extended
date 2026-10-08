# Pollux Save Editor

Status 2026-10-06: built in the app as the "Pollux Fixer" tab inside
`testing-features.html`. The editor has been tested against uploaded save-file
fixtures in the browser; loading a fixed save back into the game remains a
manual verification step.

Two defects only a real browser showed, both fixed and pinned:
- `FileReader.readAsText` drops the BOM while decoding, so the download lost it.
  The file is now read as bytes and decoded with `ignoreBOM` (TC35-000002).
- Role names showed raw ids (`PROTAGONIST_KNIGHT`), because `GAME_DATA` is a
  top-level declaration, not a `globalThis` property (TC35-000007).

## What it does

The player uploads a Hollywood Animal save (`.json`), picks one of their own
films per Pollux category, and downloads a copy where those films win. All work
happens in the browser. The save never leaves the machine.

**Back up the original save first.** The tool writes a new file
(`<name>.pollux-fixed.json`) and never touches the original. The game only sees
the new file after the player puts it in the Saves folder.

## Save fields used

Measured on real saves (game version 0.8.72EA, 1939-1942):

| Field | Shape | Use |
|---|---|---|
| file start | UTF-8 BOM in every save seen | stripped to parse, written back only if it was there |
| `stateJson.movies` | player films, `id`, `name` or `Name` | "player-owned" means `movieId` is in this list |
| `stateJson.competitorMovies` | rival films, same shape | to remove a rival's award when the player takes it |
| `stateJson.prevYearsPolluxPretenders` | `{ CATEGORY: [candidate] }` | candidates of the ceremony in the current game year |
| `stateJson.thisYearsPolluxPretenders` | same | candidates for next year's ceremony; no player film seen in it in any save |
| candidate | `{ category, profession, talentIds, movieId, roleTagId, entityId, forceWinning }` | `category` is a number: Script 0, Directing 1, Male Role 2, Female Role 3, Cinematography 4, Movie 5 |
| `stateJson.polluxHistory[year]` | `{ nominees, winners, moodShifts, PolluxVisitStatus }` | keyed by **ceremony year**; `winners[CATEGORY]` is a candidate; `nominees[CATEGORY]` is three `{ Key, Value }` |
| movie `polluxes` | `[{ year, movId, category }]` | awards won, ceremony year, numeric category |
| movie `nominations` | same | lost nominations; a winner is never also listed here |
| `stateJson.characters[].polluxes` | same, on each talent in the winner's `talentIds` | talents carry the award too; no talent `nominations` were seen for 1942 |
| `stateJson.characters[]` name | `customName` (usually null), `firstNameId`, `lastNameId` | a pick names its people: `customName`, else both ids looked up in `data/CharacterNames.json` (the game's English list, 1,141 names, from `StreamingAssets/Data/Localization/ENG/CHARACTER_NAMES.json`); else "talent #id" |
| `stateJson.timePassed` | `"4762.00:00:00"` | days since 1 Jan 1929, gives the game year |

## Award-year handling

Game year Y = 1 Jan 1929 + `timePassed` days. Checked against six saves: every
computed date matched the autosave's name (for example 4762 days = 15 Jan 1942).

The prev bucket holds the candidates for the ceremony of 1 March, year Y. The
ceremony's history entry and the films' `polluxes` use Y (the 1940 ceremony
judged 1939 films and is stored as 1940).

The save is in one of three states:

1. **Nominations not announced** (seen on 15 Jan 1940 and 15 Jan 1942): the
   prev bucket held 130 and 105 rival candidates and no player film. There is
   nothing to pick. The tool says so and asks for a later save.
2. **Nominated, ceremony not held** (`polluxHistory[Y]` absent, player
   candidates present): the tool sets `forceWinning: true` and nothing else.
   The game picks the winner at the ceremony and writes history itself. Writing
   `polluxHistory[Y]` here would record a ceremony that has not run.
3. **Ceremony held** (`polluxHistory[Y]` has winners): the tool also rewrites
   the result, so the history and the films agree:
   - `polluxHistory[Y].winners[CATEGORY]` becomes the pick, with `forceWinning: true`
   - the pick's film gains `{ year: Y, movId, category }` in `polluxes` and loses
     that entry from `nominations`
   - the replaced winner's film loses it from `polluxes` and gains it in
     `nominations`, because it is now a losing nominee
   - the award moves from the old winner's talents to the pick's talents
     (`characters[].polluxes`)

   Only a recorded nominee (one of the three in `polluxHistory[Y].nominees`)
   can be picked here; anything else is refused. The default pick keeps an
   award a player film already holds, so loading a save where the player won
   five of six changes only the sixth.

   Applying the same picks twice changes nothing more.

`thisYearsPolluxPretenders` is shown with its own label (ceremony Y+1). It is
always in state 1 or 2.

## Force the pick, or every player nominee

The owner's brief asked to also force every player candidate in the bucket. The
15 Apr 1940 save shows what that does: all 17 player candidates were forced, and
the game chose among them by the nominee `Key` (lowest wins). Best Movie went to
film 443, not to the first player film listed. So forcing all of them
guarantees a player win but not the player's pick.

The default is **force only the pick**. "Force all my nominees" is an option
(`forceAllOwned`).

## Known limits

- Not tested in the game. The owner's 1940 run validates `forceWinning` in
  state 2 only. State 3, the history rewrite, has not been loaded in the game.
- State 2 has no real save to test against: none of the 55 saves was made
  between the nomination announcement and 1 March. It rests on the owner's 1940 run.
- The rules here (ceremony year, pick policy) are only a draft in
  `docs/GAME_RULES.md` section 10. Under CLAUDE.md section 4 they are not
  settled until the owner words them.
- `moodShifts` and `PolluxVisitStatus` are left as they are.
- Every pick label comes from one template, `{film} ({who}){marks}`
  (`OPTION_TEMPLATE`); the film and the people come from the loaded save, so
  each save shows its own names (TC35-000011). Role nominees show the role, not
  the actor (TC35-000007). The names are English only.
- A closed dropdown can cut a long pick, so the full pick is printed under each
  one (TC35-000009); the categories are one column.

## Files

- The Pollux Fixer is a tab in Testing Features (`testing-features.html`), not
  in the main app (owner, 2026-10-06; TC35-000012).
- `lab/polluxSaveEditor.js`: pure logic, `HACPolluxSaveEditor`
- `lab/polluxSaveEditorView.js`: the tab; `tests/e2e/pollux-save-editor.spec.js`
  (TC35-000001..12) and `tests/scenarios/pollux-save-editor.feature`
- `tests/pollux-save-editor.test.js`: 21 tests on synthetic saves with the real
  shapes. Eight planted defects (history written before the ceremony, BOM
  dropped, the old winner keeps its award, every nominee forced, the default
  ignores a held award, a non-nominee accepted, the new talent not credited,
  the old talent keeps the award) each fail at least one test.
- A senior review on 2026-10-05 found the default-pick and talent defects in
  the first version; both were fixed test-first.
- Checked on real saves, output written only to the temp folder. The game year
  matched the file name in all 55 saves. State 1 (15 Jan 1942): 0 picks,
  nothing changed. State 3 (15 Apr 1940, 15 Apr 1942, Dec 1942): 6 picks, the
  player's existing wins kept, history, films and talents consistent, and a
  second run changes nothing. The BOM is kept; the output is a few dozen
  characters shorter only because the game pretty-prints the outer wrapper.

## Plan (approved 2026-10-05, built; moved to Testing Features 2026-10-06)

Goal: put the editor in the app. The paths below are the original plan; the
files now live in `lab/` (see Files).

1. `testing-features.html`: the Pollux Fixer tab, file input, nominee bucket
   choice, one select per category and backup warning.
2. `lab/polluxSaveEditorView.js`: byte-preserving file read, bucket choice,
  one select per category (player films only), the
   force-pick/force-all option, and the download through a `Blob` and an object URL.
3. The Pollux Fixer markup lives in `testing-features.html`, under its own lab
   navigation entry. A backup warning sits above the upload, and the three save
   states are explained in plain words.
4. `styles.css`: panel styles using the existing tokens. Checked at desktop
   width and 375px.
5. `docs/GAME_RULES.md`: a short Pollux section with the ceremony-year rule and
   the pick policy, worded by the owner.
6. Verification: `npm test`, the full Playwright suite on an isolated port, a
   new Playwright spec that uploads a synthetic save, picks, downloads and
   checks the file, and a browser walkthrough with one real save.
