# Status key:
#   [automated]  covered by tests/e2e/script-lab-freshness.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched
#
# Rules: docs/GAME_RULES.md section 9 (owner rulings 2026-09-29).

Feature: Element freshness in Script Lab
  The game marks each story element Fresh, Stale or Rotten by how often the
  studio used it recently. The player copies that state in with one click,
  wherever the element is shown, and Generate prefers fresh stories.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Build tab is selected

  # [automated] TC28-000001. Genre and Setting have no freshness; excluded elements have none either.
  Scenario: Only locked story elements carry a freshness pill
    When the user locks Cowboy, Action and Wild West
    Then Cowboy shows a "Fresh" pill inside its dropdown
    And the Genre, Setting, empty and excluded rows show no pill

  # [automated] TC28-000002.
  Scenario: One click moves an element to the next state
    Given Cowboy is locked
    When the user clicks its pill three times
    Then it reads "Stale", then "Rotten", then "Fresh"
    And Cowboy is still the locked Protagonist

  # [automated] TC28-000003.
  Scenario: The state belongs to the element, not the row
    Given Cowboy is locked and marked Stale
    When the user switches the row to Sheriff
    Then the pill reads "Fresh"
    When the user switches back to Cowboy
    Then the pill reads "Stale"

  # [automated] TC28-000004.
  Scenario: A recorded state survives a reload
    Given Cowboy is marked Rotten
    When the user reloads and locks Cowboy again
    Then its pill reads "Rotten"

  # [automated] TC28-000005. The owner's example: Action, Wild West and Bandit are known, the rest is generated.
  Scenario: Marking a generated element changes it everywhere
    Given the user has locked Action, Wild West and Bandit and generated scripts
    When the user clicks a generated story element's pill twice
    Then every pill for that element reads "Rotten"
    And the card says "Rotten elements · viewer interest ×0"
    And the results say "Freshness changed. Generate again to update the suggestions."
    And the card stays open
    And Genre and Setting chips carry no pill

  # [automated] TC28-000006.
  Scenario: Generating again avoids an element marked Rotten
    Given the user has marked a generated element Rotten
    When the user generates again
    Then no result uses that element
    And the out-of-date message is gone

  # [automated] TC28-000007. Locks are the player's choice and are never replaced.
  Scenario: A locked Rotten element stays in every result
    Given Cowboy is locked and marked Rotten
    When the user generates scripts
    Then every result contains Cowboy
    And every card says "Rotten elements · viewer interest ×0"

  # [automated] TC28-000008.
  Scenario: Excluding an element resets its freshness
    Given Cowboy is marked Stale
    When the user excludes Cowboy and then makes it available again
    Then Cowboy's pill reads "Fresh"

  # [automated] TC28-000009, TC28-000014, TC28-000015. Freshness decides before score.
  Scenario: An all-Fresh script ranks above a higher-scoring Stale one
    Given a Stale script scores higher than an all-Fresh one
    When the scripts are ranked by Generate or by Highest Artistic Appeal
    Then the all-Fresh script comes first
    And the Stale card says "Stale elements · viewer interest ×0.5"

  # [automated] TC28-000010, TC28-000011. Owner, 2026-09-29: the pill sits before the arrow.
  Scenario: The pill sits inside the dropdown at its right end
    Given Cowboy and Damsel in Distress are locked
    Then each pill sits inside its dropdown box at the right end, vertically centred
    And the element name has room to stop before the pill
    And the pill never covers the row's remove button
    And the page does not scroll sideways on a phone

  # [automated] TC28-000012.
  Scenario: Clicking the dropdown away from the pill leaves the state alone
    Given Cowboy is locked
    When the user clicks the dropdown's left side
    Then Cowboy is still "Fresh"

  # [automated] TC28-000013.
  Scenario: Result chips keep the pill on the chip
    When the user generates scripts and opens them
    Then every pill sits within its element's chip
