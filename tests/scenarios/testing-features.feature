Feature: Experimental tools in Testing Features
  The player can explore parked ideas before they become main app behavior.

  # [automated] TC34-000001 TC34-000011
  Scenario: The seven prototypes are accessible on desktop and mobile
    Given I open Testing Features
    When I navigate between the seven tools with the keyboard or their buttons
    Then exactly one tool is visible
    And I can return to the main app

  # [automated] TC34-000002
  Scenario: An optional Factory estimate changes opening-week demand only
    Given I set a 7.1 commercial rating with Behemoth and an opening ability
    When I enable Factory and choose a 39% opening-week estimate
    Then week one changes from 35500 to 49345 screening demand
    And weeks two through eight retain their baseline demand
    And switching Factory off restores week one to 35500

  # [automated] TC34-000003
  Scenario: A campaign shows desired audiences that remain uncovered
    Given I want young men and men and have selected NBG
    When I add Vien Pascal to the campaign
    Then no desired audience remains uncovered
    And no sample-script fit table is presented
    And profit and Kinomark impact remain explicitly unconfirmed

  # [automated] TC34-000013
  Scenario: Campaign coverage does not depend on excluded story elements
    Given Detective is excluded in Script Lab
    When I compare the campaign with Artistic movie lean
    Then movie lean and audience coverage remain visible
    And no hidden sample script is scored

  # [automated] TC34-000021
  Scenario: Excluding every former sample tag does not erase campaign coverage
    Given Detective and Cop are excluded in Script Lab
    When I compare a campaign and add an advertiser serving young men
    Then the desired audience gap closes
    And no hidden sample selector or fit table appears

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

  # [automated] TC34-000019
  Scenario: An unreadable release journal is never replaced by a new film
    Given one stored release contains an unknown story element
    When I try to record a new film
    Then the original stored journal remains unchanged
    And I see why the new film could not be saved

  # [automated] TC34-000020
  Scenario: A storage failure leaves the release journal unchanged
    Given the browser cannot save the journal
    When I record a film
    Then I see a storage error
    And the journal remains unchanged

  # [automated] TC34-000022
  Scenario: An award memo requires a target year
    Given I attach a movie idea to Award Targets
    When I clear its target year
    Then I see a target-year error instead of an incomplete memo

  # [automated] TC34-000009
  Scenario: Recovered unlock conditions are shown without guessing
    Given I open Unlock Info
    When I search for Wild West, Horror, WW2 Africa and Toxic Vigilante
    Then Wild West is identified as a starter element
    And Horror and WW2 Africa show their recovered date gates
    And Toxic Vigilante shows its Trash King policy recipe ingredients

  # [automated] TC34-000023
  Scenario: Unlock choices are grouped by story category
    Given I open Unlock Info
    Then I can browse Genre, Setting and Protagonist choices in separate groups

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
