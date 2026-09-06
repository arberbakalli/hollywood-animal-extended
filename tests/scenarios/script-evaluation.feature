# Status key:
#   [automated]  covered by tests/e2e/script-evaluation.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched
#
# Scope note: these are smoke-level happy-path checks. They assert the flow
# completes and renders, NOT that any particular score is numerically correct.
# Their job is to catch a change that breaks the app, not to pin the maths.

Feature: Script Evaluation — Compatibility Numbers
  Score a hand-picked set of story elements for how well they fit together.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Evaluate tab is selected
    And the Compatibility Numbers mode is active

  # [automated]
  Scenario: Building a script and checking compatibility renders a full result
    Given no compatibility results are shown
    When the user selects a Genre, Setting, Protagonist, Antagonist and Supporting Character
    And the user checks compatibility
    Then the results panel becomes visible
    And an average compatibility out of 5.0 is shown
    And a script synergy total is shown
    And the breakdown shows the base score, commercial bonus and artistic bonus
    And a potential commercial and artistic movie score are shown
    And the conflicts panel reports its findings

  # [automated] Guard: the app must say what it needs, not fail silently.
  Scenario: Checking compatibility with nothing selected asks for a tag
    Given no story elements are selected
    When the user checks compatibility
    Then a message asks for at least one tag
    And no results are shown

  # [automated]
  Scenario: Quick search offers matching story elements
    When the user types "Sidekick" into quick search
    Then matching story elements are listed
    And the first result names "Sidekick"

  # [automated] Crosses a tab boundary and re-initialises selectors, so it is
  # the flow most likely to break quietly.
  Scenario: Transferring to Marketing and Release carries the script over
    Given the user has checked compatibility for a script
    When the user follows the Marketing and Release action
    Then the Marketing and Release area opens
    And the distribution calculator is shown
    And the transferred story elements are selected there

  # [automated]
  Scenario: Resetting clears the selection and hides the results
    Given the user has checked compatibility for a script
    When the user resets the evaluation
    Then the results panel is hidden
    And no story element remains selected

  # [verified] Conflicts panel shows "No severe conflicts found." when clean.
  Scenario: A clean combination reports no conflicts
    Given the user has selected elements that do not clash
    When the user checks compatibility
    Then the conflicts panel reports that no severe conflicts were found

  # [automated] Severe clashes are listed as spoiler rows.
  Scenario: Conflicts are reported for clashing elements
    Given the user has selected elements that clash
    When the user checks compatibility
    Then the conflicts panel lists the clashing pair

  # [automated] A results-time label reports the cap and the scoring count.
  Scenario: The score cap reflects how many scoring elements were used
    Given the user has checked compatibility
    Then a label states the maximum score and the number of scoring elements

  # [automated] Clicking a quick-search result adds it to the selection.
  Scenario: Adding a story element from quick search
    When the user types into quick search
    And the user chooses a result
    Then that element joins the current selection

  # [automated] A "Save to Script Library" control exists in this mode.
  Scenario: Saving an evaluated script to the library
    Given the user has checked compatibility
    When the user saves the script to the library
    Then the script appears in the Script Library

  # [unverified] Switching modes is expected to preserve the selection, but this
  # has not been observed.
  Scenario: Switching to Colman Graves keeps the current selection
    Given the user has selected story elements
    When the user switches to the Colman Graves mode
    Then the same story elements are still selected
