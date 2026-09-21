# Status key:
#   [automated]  covered by E2E specs in tests/e2e/exclusion-dropdown-refresh.spec.js
#   [verified]   behaviour observed in the live app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app — do not
#                automate until someone has watched it happen

Feature: Exclusion Dropdown Refresh
  When "Apply Starting Tags" is clicked, all script builder dropdowns
  across all tabs should immediately reflect the new exclusion state.
  Excluded items must be disabled/hidden, not shown as available.

  Background:
    Given the Hollywood Animal Calculator is open

  # [unverified] — waiting for E2E implementation
  Scenario: Script Lab dropdowns filter correctly after applying starting tags
    Given the Build tab is selected
    And no exclusions have been applied
    When the user clicks "Apply Starting Tags"
    Then the Finale dropdown shows only available items (non-excluded)
    And the Setting dropdown shows only available items (non-excluded)
    And the Antagonist dropdown shows only available items (non-excluded)
    And the Protagonist dropdown shows only available items (non-excluded)

  # [unverified] — waiting for E2E implementation
  Scenario: Colman Graves dropdowns filter correctly after applying starting tags
    Given the Script Evaluation tab is selected
    When the user clicks "Apply Starting Tags"
    Then the Submit Script section Finale dropdown shows only available items
    And the Submit Script section Setting dropdown shows only available items
    And the Submit Script section Antagonist dropdown shows only available items
    And the Submit Script section Protagonist dropdown shows only available items

  # [unverified] — waiting for E2E implementation
  Scenario: Marketing & Release dropdowns filter correctly after applying starting tags
    Given the Marketing & Release tab is selected
    When the user clicks "Apply Starting Tags"
    Then all targeted dropdowns show only available items (non-excluded)

  # [unverified] — waiting for E2E implementation
  Scenario: Excluded items remain disabled across tab switches
    Given the Build tab is selected
    And the user has clicked "Apply Starting Tags"
    When the user opens the Finale dropdown
    And notes which items are disabled
    And switches to the Script Evaluation tab
    And opens the Colman Graves Submit Script Finale dropdown
    Then the same items are disabled in the Graves context
