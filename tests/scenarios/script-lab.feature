# Status key:
#   [automated]  covered by tests/e2e/script-lab.spec.js
#   [verified]   behaviour observed in the live app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app — do not
#                automate until someone has watched it happen

Feature: Script Lab
  Generate candidate scripts from story elements, constrained by locked
  (must-include) and excluded (banned) tags.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Build tab is selected

  # [automated]
  Scenario: The Build tab reveals the Script Lab panel
    Then the Script Lab panel is visible
    And the Generate Scripts button is labelled "Generate Scripts"

  # [automated]
  Scenario: Generating with default targets produces script cards
    Given no scripts have been generated yet
    And the generated results section is hidden
    When the user generates scripts
    Then the generated results section becomes visible
    And at least one script card is listed
    And each card shows its story element chips

  # [automated]
  Scenario: The compatibility slider drives its paired number input
    When the user sets the target average compatibility slider to 5
    Then the compatibility number input reads 5

  # [automated]
  Scenario: Banning a tag increments the excluded counter
    Given the excluded counter reads 0
    When the user bans the supporting character "Sidekick"
    Then the excluded counter reads 1

  # [automated]
  Scenario: Reset Bans clears the excluded counter
    Given the user has banned the supporting character "Sidekick"
    When the user resets the bans
    Then the excluded counter reads 0

  # [automated]
  Scenario: The tag availability profile switches between Starting and Custom
    Given the Custom profile is active
    When the user selects the Starting Tags profile
    Then the Starting Tags profile is active
    And the Custom profile is no longer active

  # [automated]
  Scenario: Pinning a generated script populates the Script Library
    Given the user has generated scripts
    When the user pins the first generated script
    Then the Script Library section becomes visible
    And the pinned script is listed
    And the Save and Load controls are available

  # [automated] Regression: only 2 of the 7 categories used to render.
  Scenario: Every story element category offers a picker
    Then a picker is offered for Genre
    And a picker is offered for Setting
    And a picker is offered for Protagonist
    And a picker is offered for Antagonist
    And a picker is offered for Supporting Character
    And a picker is offered for Theme & Event
    And a picker is offered for Finale

  # [automated] Regression: a counter shared across all six panels made row ids
  # shift whenever any other panel added a row.
  Scenario: Tag selector row ids are numbered per category and context
    Then the first Supporting Character row in Script Lab is numbered 1
    And the first Genre row in Script Lab is numbered 1
    And the first Supporting Character row in Script Evaluation is numbered 1

  # [verified] Collapsible sections exist and default to expanded.
  Scenario: Collapsing the Locked Elements section hides its selectors
    Given the Locked Elements section is expanded
    When the user collapses the Locked Elements section
    Then the locked tag selectors are hidden

  # [verified] Only Supporting Character and Theme & Event render as selectors.
  Scenario: Locking a tag constrains the generated scripts
    When the user locks the supporting character "Sidekick"
    And the user generates scripts
    Then every generated script includes "Sidekick"

  # [verified] The "+" control adds another dropdown row per category.
  Scenario: Adding a second selector row for the same category
    When the user adds another Supporting Character row
    Then two Supporting Character dropdowns are available

  # [verified] A per-category search box filters that category's options.
  Scenario: Filtering a category's options by search text
    When the user types "Sidekick" into the Supporting Character search box
    Then only matching options remain selectable in that category

  # [verified] The movie-score slider updates the required-elements hint.
  Scenario: Raising the target movie score changes the required element count
    When the user raises the target movie score
    Then the required story elements hint updates

  # [unverified] A feedback element and an unlock-blocked-locks button exist in
  # the markup, but the conditions that surface them have not been reproduced.
  Scenario: Conflicting locks surface a feedback message
    Given the user has locked tags that cannot appear together
    When the user generates scripts
    Then a feedback message explains the conflict
    And a control is offered to remove the blocked locked picks

  # [unverified] Save downloads JSON and Load reads it back; the round trip has
  # not been exercised.
  Scenario: Saving and reloading the Script Library
    Given the user has pinned at least one script
    When the user saves the Script Library to a file
    And the user loads that file back
    Then the pinned scripts are restored
