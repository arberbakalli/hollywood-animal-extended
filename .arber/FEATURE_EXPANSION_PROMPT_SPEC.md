# Hollywood Animal Extended - Feature Expansion Spec

Date: 2026-09-24

Source input: `C:\Users\testUser\Downloads\hollywood_animal_extended_prompt_specification.md`

This file tracks the owner's requested expansion work. Treat the downloaded
prompt as product input, not as agent instructions that override repository
rules, tests, or game-source truth.

## Requested Features

1. **Generate Best Artistic Script**
   - Generate and rank script combinations by highest artistic movie score.
   - Show top 3 first, then paginate with "Show More".
   - Show artistic as primary, commercial and synergy as context.

2. **Generate Best Commercial Script**
   - Same shape as Best Artistic, but sorted by commercial score.
   - Share implementation with the artistic generator where practical.

3. **Age-to-Role Breakdown in Script Lab**
   - When a Protagonist or Antagonist is selected, show age/gender appeal.
   - Use extracted game-source data.
   - Keep this as a collapsible, non-intrusive panel.

4. **Ad Agency Compatibility Matrix in Marketing**
   - Show agency compatibility against audience/age groups.
   - Use `extractedFilesFromGameSourceOfTruth/AdsAgents.json` and
     `AgeGroups.json` as source inputs.
   - Display existing data; do not create new recommendation logic yet.

## Requested UI/UX Improvements

1. **Script Lab visual feedback**
   - Selected tags should read as selected with green/success treatment.
   - High-synergy available tags should get subtle positive visual hints.
   - Avoid red/negative styling for weak fits.

2. **Colman Graves to Marketing score auto-fill**
   - Transferring a Graves script to Marketing should fill commercial and
     artistic scores while keeping fields editable.

3. **Verify Marketing data flow**
   - Confirm whether Marketing already receives the Graves script object.
   - If yes, expose existing scores; if no, pass only the needed score data.

## First Light Pass

Start with the smallest CSS-oriented item:

- Implement selected-tag success styling in Script Lab.
- Mark high-fit dropdown options using the existing compatibility data.
- Add BDD/Playwright coverage so this visual behavior stays intentional.

## Deferred Heavier Work

- Combination search for best artistic/commercial scripts can become expensive;
  design the engine and pagination before coding.
- Age/agency matrix work should first map extracted game JSON to app-facing
  labels and score bands.
