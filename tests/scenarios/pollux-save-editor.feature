# Status key:
#   [automated]  covered by tests/e2e/pollux-save-editor.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: Pollux Fixer
  The player loads a Hollywood Animal save, picks which of their own films win
  the Pollux awards, and downloads a fixed copy. The save is read and rewritten
  in the browser only. Save fields and year handling: docs/POLLUX_SAVE_EDITOR.md.

  Background:
    Given the Hollywood Animal Calculator is open
    And the user opens the Pollux Fixer tab

  # [automated] TC35-000001. The backup warning comes before the upload.
  Scenario: The tab warns to back up the save first
    Then the backup warning is shown
    And it says the original file is not changed and nothing is uploaded
    And no picks are shown before a file is chosen

  # [automated] TC35-000002. After the ceremony the fix rewrites the recorded result.
  Scenario: A held ceremony offers only the player's nominees
    When the user loads a save whose 1942 ceremony has been held
    Then each category lists only the player's films that were nominees
    And a rival film is never offered
    When the user picks a winner and makes the fixed save
    Then the download keeps the BOM and stays on one line
    And the history winners, the films' awards and the summary agree

  # [automated] TC35-000003. Before the ceremony only forceWinning changes.
  Scenario: Before the ceremony only the latest picks are marked
    When the user loads a save made after the nominations and before 1 March
    And makes the fixed save twice, changing one pick in between
    Then only the second pick is marked to win in that category
    And no history is written for the ceremony

  # [automated] TC35-000004. Player films join the list when nominations are announced.
  Scenario: A save from before the nominations has nothing to pick
    When the user loads a save in which none of their films is a nominee yet
    Then the note explains that the game adds them when it announces the nominations
    And every category says no film of theirs is in it
    And the fix button is disabled

  # [automated] TC35-000005. A wrong file never reaches the picks.
  Scenario: A file that is not a save shows a friendly error
    When the user chooses a file that is not valid JSON
    Then a friendly error names the problem
    And no picks are shown

  # [automated] TC35-000007. Role nominees are named like everywhere else in the app.
  Scenario: A role nominee shows the story element name
    When the user loads a save with a Female Role nominee played as Detective
    Then the option names the film and the Detective role by its display name
    And no raw element id is shown

  # [automated] TC35-000006. Phone width.
  Scenario: The Pollux tab fits a phone screen
    Given the screen is 375 pixels wide
    When the user loads a held-ceremony save
    Then the page does not scroll sideways

  # [automated] TC35-000008. The fourth tab once wrapped onto its own row.
  Scenario: The four product tabs share one row on desktop
    Given the screen is 1280 or 1024 pixels wide
    When the app opens
    Then Script Lab, Script Evaluation, Marketing & Release and Pollux Fixer sit on one row
    And no tab cuts its own text

  # [automated] TC35-000009. A closed dropdown cuts a long film name.
  Scenario: The full pick is shown under each category
    Given a nominee with a long film name
    When the user picks that nominee
    Then the full pick is shown in full under the dropdown
    And it changes when the pick changes

