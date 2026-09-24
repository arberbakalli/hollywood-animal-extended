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

  # [automated] — TC09-000001
  Scenario: TC09-000001 Script Lab dropdowns filter correctly after applying starting tags
    Given the Build tab is selected
    And no exclusions have been applied
    When the user clicks "Apply Starting Tags"
    Then the Finale dropdown shows only available items (non-excluded)
    And the Setting dropdown shows only available items (non-excluded)
    And the Antagonist dropdown shows only available items (non-excluded)
    And the Protagonist dropdown shows only available items (non-excluded)

  # [automated] — TC09-000002
  Scenario: TC09-000002 Colman Graves dropdowns filter correctly after applying starting tags
    Given the Script Evaluation tab is selected
    When the user clicks "Apply Starting Tags"
    Then the Submit Script section Finale dropdown shows only available items
    And the Submit Script section Setting dropdown shows only available items
    And the Submit Script section Antagonist dropdown shows only available items
    And the Submit Script section Protagonist dropdown shows only available items

  # [automated] — TC09-000003
  Scenario: TC09-000003 Marketing & Release dropdowns filter correctly after applying starting tags
    Given the Marketing & Release tab is selected
    When the user clicks "Apply Starting Tags"
    Then all targeted dropdowns show only available items (non-excluded)

  # [automated] — TC09-000004
  Scenario: TC09-000004 Excluded items remain disabled across tab switches
    Given the Build tab is selected
    And the user has clicked "Apply Starting Tags"
    When the user opens the Finale dropdown
    And notes which items are disabled
    And switches to the Script Evaluation tab
    And opens the Colman Graves Submit Script Finale dropdown
    Then the same items are disabled in the Graves context

  # A ban made by hand has to reach the builders the same instant the profile
  # button's bans do. It did not: the change handler refreshed only the
  # "excluded" context, so the ban list redrew itself and the builders kept
  # offering the tag. Single-select categories had no other path to a redraw,
  # which is why Setting, Protagonist, Antagonist and Finale felt broken while
  # Genre and Supporting Character appeared to work.

  # [automated] — TC09-000005
  Scenario: TC09-000005 Banning a Setting by hand disables it in Script Lab at once
    Given the Build tab is selected
    And the Wild West setting is selectable in Script Lab
    When the user bans Wild West in the Excluded Elements panel
    Then Wild West is disabled in the Script Lab Setting dropdown
    And no further interaction is needed to make that happen

  # [automated] — TC09-000006
  Scenario: TC09-000006 Lifting a Setting ban re-enables it in Script Lab at once
    Given the Build tab is selected
    And Wild West has been banned
    When the user clears that ban
    Then Wild West is selectable again in the Script Lab Setting dropdown

  # [automated] — TC09-000007 .. TC09-000012
  Scenario Outline: Banning a <category> disables it in Script Lab at once
    Given the Build tab is selected
    And a <category> option is selectable in Script Lab
    When the user bans that option in the Excluded Elements panel
    Then it is disabled in the Script Lab <category> dropdown

    Examples:
      | category            |
      | Genre               |
      | Protagonist         |
      | Antagonist          |
      | Supporting Character|
      | Theme & Event       |
      | Finale              |

  # [automated] TC09-000018. With the Starting Tags profile active, Reset Bans
  # must empty the list while all builders see the refreshed state. The profile
  # is the precondition that makes it visible — from a clean ban list the
  # scenario passes even with the defect present, which is how it survived
  # several rounds of fixing.
  Scenario: Removing a Setting from Script Lab exclusions restores it in Graves
    Given the Script Lab Starting Tags profile is active
    And a Setting is hidden from Colman Graves because it is excluded
    When the user removes that Setting from Excluded Elements in Script Lab
    And the user returns to Colman Graves
    Then that Setting is available in the Graves Setting picker
