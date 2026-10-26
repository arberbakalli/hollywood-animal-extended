# Status key:
#   [automated]  covered by tests/e2e/element-preservation.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: Element Preservation suggestions
  The game's Factory policy lets the player keep five story elements Fresh
  forever, and the choice is permanent (docs/GAME_RULES.md section 9). This
  Testing Features tab ranks every story element and marks the top five. It is
  advice: the weights are the calculator's judgement and are shown on the page.

  Background:
    Given the Testing Features page is open
    And the user opens the Element Preservation tab

  # [automated] TC37-000001.
  Scenario: Every story element is ranked and the top five explain themselves
    Then all 210 story elements are ranked with the Balanced strategy
    And only Protagonist, Antagonist, Supporting Character, Theme & Event and Finale appear
    And the first five rows are marked Top 5
    And each top card shows why it was picked, its strong links and conflicts, its age durability, its best genres and its caveats
    And the weights of the strategy are listed

  # [automated] TC37-000002. Owner, 2026-10-06: exclusions respected by default.
  Scenario: Excluded elements are left out until the box is unticked
    Given the user has excluded the element that ranks first
    Then "Leave out my excluded elements" is ticked and that element is not ranked
    When the user unticks the box
    Then every story element is ranked again and the excluded element is first

  # [automated] TC37-000003.
  Scenario: One or two genres narrow the pair links
    Then the second genre cannot be chosen before the first
    When the user chooses Drama
    Then links count only the elements that fit Drama with 4 or more
    And a Genre fit column appears
    When the user also chooses Comedy
    Then links count only the elements that fit Drama and Comedy
    When the user chooses Drama twice
    Then the tab asks for two different genres

  # [automated] TC37-000004.
  Scenario: A strategy changes the weights and the ranking
    When the user switches from Balanced to Power scorer
    Then age durability weighs 0 and the order changes
    When the user switches to Career stable
    Then age durability weighs 4

  # [automated] TC37-000005. Owner, 2026-10-06: neutral and flagged.
  Scenario: A character without age data is flagged, not guessed
    Then the tab says 18 characters have no age data and count as the average rated character
    And Key Witness shows "No age data"

  # [automated] TC37-000007. Owner, 2026-10-06: the top 5 can be all Theme & Event.
  Scenario: Each category's best pick is shown
    Then "Best per category" shows one card for each of the five story categories
    And each card is the highest-ranked element of its category in the full ranking

  # [automated] TC37-000006.
  Scenario: The tab fits a phone and a desktop
    Given the screen is 375 or 1280 pixels wide
    Then the page does not scroll sideways and no script error occurs
