# Status key:
#   [automated]  covered by tests/e2e/pollux-save-editor.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: Pollux Fixer
  The player loads a Hollywood Animal save, picks which of their own films win
  the Pollux awards, and downloads a fixed copy. The save is read and rewritten
  in the browser only. Save fields and year handling: docs/POLLUX_SAVE_EDITOR.md.

  Background:
    Given the Testing Features page is open
    And the user opens the Pollux Fixer tab there

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

  # [automated] TC35-000013. Re-upload the downloaded file, not the pristine original.
  Scenario Outline: A new single pick replaces forced winners from an earlier edit
    Given the user previously downloaded a save with <previous_picks> marked to win
    When the user uploads that downloaded save before its ceremony
    And chooses a different script nominee with force-all switched off
    Then only the newly chosen nominee is marked to win Best Script
    And ceremony history and movie awards remain unchanged
    And the download preserves the BOM and stays on one line
    And generating again gives the same save

    Examples:
      | previous_picks            |
      | one player nominee        |
      | all player-owned nominees |

  # [automated] TC35-000014. Both nominees share the same writer.
  Scenario: Moving Best Script to another film updates the shared writer's credit
    Given a held ceremony whose Best Script winner shares a writer with another player nominee
    When the user uploads that save and selects the other film for Best Script
    Then ceremony history, the winning film and the writer credit the new winning film
    And the old winning film no longer holds that award
    And the new winning film no longer holds a nomination for that award
    And recorded nominees and previous-year history are unchanged
    And the download preserves the BOM and stays on one line

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

  # [automated] TC35-000008. A fourth tab once wrapped onto its own row.
  Scenario: The three product tabs share one row on desktop
    Given the screen is 1280 or 1024 pixels wide
    When the main app opens
    Then Script Lab, Script Evaluation and Marketing & Release sit on one row
    And no tab cuts its own text

  # [automated] TC35-000012. Owner, 2026-10-06: a save-file tool is a testing feature.
  Scenario: Pollux Fixer lives in Testing Features, not the main app
    When the main app opens
    Then no product tab mentions Pollux
    When the user opens Testing Features and its Pollux Fixer tab
    Then the save file input is shown

  # [automated] TC35-000009. A closed dropdown cuts a long film name.
  Scenario: The full pick is shown under each category
    Given a nominee with a long film name
    When the user picks that nominee
    Then the full pick is shown in full under the dropdown
    And it changes when the pick changes

  # [automated] TC35-000010. Sharing the row equally wrapped one label.
  Scenario: Each product tab label stays on one line on desktop
    Given the screen is 1280 or 1024 pixels wide
    When the app opens
    Then every product tab label is on one line

  # [automated] TC35-000011. One label template; the values come from each save.
  Scenario: Picks name the people of the loaded save
    When the user loads a save whose script nominee has name ids for Dennis Lawson
    Then the pick reads "SHOOTING FOR THE STARS (Dennis Lawson)"
    When the user loads another save where the same talent id is John Smith
    Then the pick reads "SHOOTING FOR THE STARS (John Smith)" and Dennis Lawson is gone
    And a person the save does not name is still shown as "talent #id"
