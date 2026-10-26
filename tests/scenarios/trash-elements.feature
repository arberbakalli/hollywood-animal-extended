# Status key:
#   [automated]  covered by tests/e2e/trash-badge.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: Trash element label
  The game marks fifteen story elements as trash (GAME_RULES section 11, owner
  verified 2026-10-09). The app labels them "Trash element" wherever it shows
  the freshness pill. The label only informs: it has no click action and no
  score effect yet.

  # [automated] TC39-000001.
  Scenario Outline: A builder row labels a trash element and only a trash element
    Given the <builder> Theme & Event row is open
    When the player selects Wizard War
    Then the row shows "Trash element" beside the freshness pill
    And the dropdown still reads "Wizard War"
    When the player selects Treasure Hunt instead
    Then the row shows no trash label

    Examples:
      | builder           |
      | Script Lab        |
      | Colman Graves     |
      | Analyze Script    |
      | Build for Target  |

  # [automated] TC39-000002.
  Scenario: Generated script cards label trash elements
    Given Wizard War is locked in Script Lab
    When the player generates scripts
    Then every card labels Wizard War "Trash element"
    And no card labels an element that is not trash

  # [automated] TC39-000003.
  Scenario: The label only informs and fits a phone
    Given the screen is 390 pixels wide and Wizard War is selected
    When the player clicks the trash label
    Then nothing changes: no freshness change and the selection stays
    And the page does not scroll sideways
