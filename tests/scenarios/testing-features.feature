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
    And I see a compact top-five view of the existing fit grades
    And profit and Kinomark impact remain explicitly unconfirmed

  # [automated] TC34-000013
  Scenario: Advertiser fit does not use an excluded sample element
    Given Detective is excluded in Script Lab
    When I compare the sample campaign with Artistic movie lean
    Then Detective is listed as hidden from the sample script
    And the live fit preview still shows five advertiser rows

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
    And the best commercial and artistic pair summaries are visible without checking every row manually

  # [automated] TC34-000018
  Scenario: Equal best genre bonuses keep all available winners
    Given Drama is the primary genre and no genres are excluded
    When I view the best commercial pairs
    Then Drama with Comedy and Drama with Romance both appear at +0.25
    And the best artistic pair remains Drama with Historical
    When Comedy becomes excluded in Script Lab
    Then only Drama with Romance remains in the commercial recommendation

  # [automated] TC34-000016
  Scenario: Excluded genres are reference data rather than recommendations
    Given Drama is the primary genre and Comedy is excluded in Script Lab
    When I view the best commercial pair
    Then Romance is recommended instead of Comedy
    And Comedy remains labeled as excluded in the reference table

  # [automated] TC34-000012
  Scenario: Genre insight shows strong pairings from available story elements
    Given Action is the selected genre and Cowboy is available
    When I search for Cowboy among Protagonists
    Then I see its direct pair score of 5 and a successful pairing count
    And its 49 strong pairs and 12 unsuccessful pairs use the available Action-compatible story pool
    And I can compare how many genres pair strongly with Cowboy
    When Cowboy is excluded from Script Lab
    Then it is absent from the genre insight

  # [automated] TC34-000017
  Scenario: The player compares genre-specific and broadly useful elements
    Given Comedy is selected and no elements are excluded
    When I rank strong pairs within the genre
    Then Alcohol - the Spirit of Freedom leads with 34 successful story-element pairs
    When I rank strong pairs across genres
    Then Damsel in Distress leads with successful matches in 9 genres
    And its direct Comedy score of 3 remains visible

  # [automated] TC34-000006
  Scenario: The unique-result guard rejects shuffled duplicates
    Given I supply two candidate scripts containing the same elements in a different order
    When I find unique scripts
    Then only one remains
    And an unknown element is rejected without leaving stale scripts visible

  # [automated] TC34-000007
  Scenario: Award planning shows all goals and records a movie idea
    Given I open Award Targets
    Then I see box office receipts, critics ratings and Kinomark rating together
    When I attach a movie idea to Critical Acclaim for 1935
    Then the plan memo keeps that movie, year and target visible
    And the guidance does not promise an award

  # [automated] TC34-000008
  Scenario: A release journal warns about repetition and survives reload
    Given I record two films using Detective within 500 days
    When I reload the page
    Then both films remain in the journal
    And Detective is marked as a possible repeat by two films
    When I remove the first film
    Then the second film remains and the rough repeat warning clears

  # [automated] TC34-000009
  Scenario: Recovered unlock conditions are shown without guessing
    Given I open Unlock Info
    When I search for Wild West, Horror, WW2 Africa and Toxic Vigilante
    Then Wild West is identified as a starter element
    And Horror and WW2 Africa show their recovered date gates
    And Toxic Vigilante shows its Trash King policy recipe ingredients

  # [automated] TC34-000010
  Scenario: Failed data loading can be retried
    Given genre pair data cannot be loaded
    Then the tools stay hidden and a retry is available
    When data becomes available and I retry
    Then the tools load successfully

  # [automated] TC34-000015
  Scenario: Pairing data failure leaves other lab tools usable
    Given pairing data cannot be loaded
    When I open Genre Synergy
    Then I see a retry action for pair data
    And Distribution Calibration remains usable
    When pairing data becomes available and I retry
    Then the story-element pairing table appears
