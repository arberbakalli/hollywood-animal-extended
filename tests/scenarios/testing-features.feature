Feature: Experimental tools in Testing Features
  The player can explore parked ideas before they become main app behavior.

  # [automated] TC34-000001 TC34-000011
  Scenario: The eight prototypes are accessible on desktop and mobile
    Given I open Testing Features
    When I navigate between the eight tools with the keyboard or their buttons
    Then exactly one tool is visible
    And I can return to the main app

  # [automated] TC34-000002
  Scenario: Factory calibration boosts opening week only
    Given current opening-week demand is 35500 screenings
    When I enable Factory and choose a 39% boost
    Then the scenario shows 49345 screenings in week one
    And later weeks retain the current demand
    And disabling Factory restores the baseline

  # [automated] TC34-000003
  Scenario: A campaign shows desired audiences that remain uncovered
    Given I want young men and men and have selected NBG
    When I add Vien Pascal to the campaign
    Then no desired audience remains uncovered
    And I see the existing fit grades for all eight advertisers
    And profit and Kinomark impact remain explicitly unconfirmed

  # [automated] TC34-000004
  Scenario: Observed attendance is compared without inventing viewer counts
    Given I open Distribution Calibration
    When I compare the supplied one-ad and four-ad observations
    Then the occupied screening equivalents are 10502.96 and 26444.88 respectively
    And zero attendance shows no prediction ratio

  # [automated] TC34-000005
  Scenario: Genre bonuses activate at the second-genre threshold
    Given Drama is the primary genre
    When I compare Comedy at 30% and then 35%
    Then the pair changes from inactive to active
    And the game-data bonuses are +0.25 commercial and +0.10 artistic

  # [automated] TC34-000006
  Scenario: Reshuffling elements does not create another script
    Given I supply two candidate scripts containing the same elements in a different order
    When I find unique scripts
    Then only one remains
    And an unknown element is rejected without leaving stale scripts visible

  # [automated] TC34-000007
  Scenario: Award planning follows the selected objective
    Given I open Award Targets
    When I switch between the three targets
    Then the target metric changes between box office receipts, critics ratings and Kinomark rating
    And the guidance does not promise an award

  # [automated] TC34-000008
  Scenario: A release journal warns about repetition and survives reload
    Given I record two films using Detective within 500 days
    When I reload the page
    Then both films remain in the journal
    And Detective is marked as used by two films
    When I remove the first film
    Then the second film remains and the repeat warning clears

  # [automated] TC34-000009
  Scenario: Unknown unlock conditions are not presented as game facts
    Given I open Unlock Info
    When I search for Wild West and then Horror
    Then Wild West is identified as a starter element
    And Horror's unrecovered unlock condition is identified as unknown

  # [automated] TC34-000010
  Scenario: Failed data loading can be retried
    Given genre pair data cannot be loaded
    Then the tools stay hidden and a retry is available
    When data becomes available and I retry
    Then the tools load successfully
