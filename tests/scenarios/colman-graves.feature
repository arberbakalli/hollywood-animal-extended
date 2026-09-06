# Status key:
#   [automated]  covered by tests/e2e/colman-graves.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched
#
# Scope note: smoke-level happy path plus the input guards. These assert the
# flow completes and renders, NOT that any particular score is correct.
#
# Graves accepts a script only when Genre, Setting and Protagonist are all
# present AND the total is between 5 and 10 elements.

Feature: Script Evaluation — Colman Graves
  Submit a script draft for a single professional verdict, with ranked
  suggestions for improving it.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Evaluate tab is selected
    And the Colman Graves mode is active

  # [automated] Regression: before the category fix, Genre, Setting and
  # Protagonist had no picker at all, so Graves could never be satisfied.
  Scenario: All seven story element categories are offered
    Then a picker is offered for each of the seven categories

  # [automated]
  Scenario: Submitting a valid script produces a verdict and scores
    Given no results are shown
    When the user selects a Genre, Setting, Protagonist, Antagonist and Supporting Character
    And the user evaluates the script
    Then the results become visible
    And a verdict is shown
    And an average fit out of 5.0 is shown
    And a commercial score is shown
    And an artistic score is shown
    And the Graves analysis text is shown
    And the likely audience is described

  # [automated] Guard: name what is missing rather than fail silently.
  Scenario: A script missing required categories names what is missing
    Given only a Supporting Character is selected
    When the user evaluates the script
    Then a message names the missing Genre
    And no results are shown

  # [automated] Guard: the three required categories alone are only three elements.
  Scenario: Fewer than five elements is refused with the count
    Given only a Genre, Setting and Protagonist are selected
    When the user evaluates the script
    Then a message says Colman needs at least 5 story elements
    And the message states that 3 were selected
    And no results are shown

  # [automated] The minimum-fit filter defaults to 4.0+, which an arbitrary
  # script may have no candidate for, so the test widens it first.
  Scenario: Best matches open and the analysis modes switch
    Given the user has evaluated a script
    When the user widens the minimum fit to any
    And the user generates best matches
    Then the best matches panel becomes visible
    And suggestions are listed
    When the user selects the Swap Suggestions mode
    Then the panel is re-rendered for that mode
    When the user selects the Pairwise mode
    Then the panel is re-rendered for that mode

  # [automated]
  Scenario: Resetting clears the submission and hides the verdict
    Given the user has evaluated a script
    When the user resets
    Then the results are hidden
    And no story element remains selected

  # [verified] More than ten elements is refused with the count.
  Scenario: More than ten elements is refused
    Given eleven story elements are selected
    When the user evaluates the script
    Then a message says Colman evaluates up to 10 story elements at once

  # [verified] Category filter offers all seven categories.
  Scenario: Restricting best matches to one category
    Given the user has evaluated a script
    When the user restricts the match category to "Supporting Character"
    And the user generates best matches
    Then only supporting character suggestions are listed

  # [verified] Minimum-fit filter offers 3.0+ through 5.0 only.
  Scenario: Restricting best matches by minimum fit
    Given the user has evaluated a script
    When the user sets the minimum fit to "4.5+"
    And the user generates best matches
    Then every suggestion has a fit of at least 4.5

  # [verified] A "Starting tags only" checkbox exists.
  Scenario: Limiting suggestions to starting tags
    Given the user has evaluated a script
    When the user limits suggestions to starting tags only
    And the user generates best matches
    Then no suggestion falls outside the starting tag set

  # [automated] Each suggestion row carries an Add control.
  Scenario: Adding a suggested element to the script
    Given best matches are listed
    When the user adds the first suggestion
    Then that element joins the current script selection

  # [verified] An exclusion notice with a jump-back control exists, hidden by
  # default.
  Scenario: Warning when the script uses elements banned in Script Lab
    Given the user has banned an element in Script Lab
    And that element is part of the Graves script
    When the user evaluates the script
    Then an exclusion notice names the banned element
    And the user can jump back to Script Lab to change it

  # [verified] The verdict label and tone are banded off the average fit,
  # with "Success" at 4.0 and above.
  Scenario Outline: The verdict follows the average fit
    Given a script whose average fit is <fit>
    When the user evaluates the script
    Then the verdict reads "<verdict>"

    Examples:
      | fit | verdict |
      | 4.2 | Success |
