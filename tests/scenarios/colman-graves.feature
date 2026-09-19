# Status key:
#   [automated]  covered by Colman Graves specs, including tests/e2e/colman-graves.spec.js,
#                tests/e2e/genre-mix.spec.js, tests/e2e/search-field-persistence.spec.js
#                and tests/graves.test.js
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

  # [automated] Regression: before the category fix, Genre, Setting and
  # Protagonist had no picker at all, so Graves could never be satisfied.
  Scenario: All seven story element categories are offered
    Then a picker is offered for each of the seven categories

  # [automated] Only the categories the game allows to repeat should expose "+"
  # controls. A broad "all categories" rule once broke genre mixing.
  Scenario: Only repeatable categories accept multiple selections
    Then Genre accepts multiple selections
    And Supporting Character accepts multiple selections
    And Theme & Event accepts multiple selections
    And Setting does not accept multiple selections
    And Protagonist does not accept multiple selections
    And Antagonist does not accept multiple selections
    And Finale does not accept multiple selections

  # [automated] Genre mix is always a 100% allocation in five-point steps.
  Scenario: Adding genres keeps the mix visible, stepped and balanced
    Given only one Genre row is shown
    Then that Genre owns 100 percent of the mix
    When the user adds a second Genre row
    Then the genre percentage controls are visible
    And the two Genres split the mix evenly
    When the user adds a third Genre row
    Then the genre mix still totals 100 percent
    And every Genre share is at least 5 percent
    And every Genre share uses five-point steps

  # [automated] Moving one Genre should rebalance the rest without breaking the
  # 100% total or the 5% floor.
  Scenario: Genre mix sliders preserve the total and minimum share
    Given the user has two Genre rows
    When the user raises the first Genre to 70 percent
    Then the second Genre is lowered to 30 percent
    When the user raises the first Genre beyond the available share
    Then the first Genre is capped at 95 percent
    And the second Genre keeps 5 percent

  # [automated] Removed Genre rows must release their options for reuse.
  Scenario: Removing Genre rows re-enables their options
    Given several Genre rows are selected
    When the user removes those Genre rows
    Then the removed Genre options can be selected again

  # [automated]
  Scenario: Submitting a valid script produces a verdict and scores
    Given no results are shown
    When the user selects a Genre, Setting, Protagonist, Antagonist and Supporting Character
    And the user evaluates the script
    Then the results become visible
    And a verdict is shown
    And an average fit out of 5.0 is shown
    And the compatibility breakdown shows Script Synergy, Commercial Bonus and Artistic Bonus
    And a commercial movie score is shown
    And an artistic movie score is shown
    And the score cap names the number of scoring elements
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

  # [automated] Regression: Best Matches is exploratory, not a full script
  # evaluation. It must work from one seed and suggest ideal additions around it.
  Scenario: Best matches can start from one seed element
    Given only one Genre is selected
    When the user widens the minimum fit to any
    And the user generates best matches
    Then the best matches panel becomes visible
    And suggestions are listed
    And no full-script validation message is shown

  # [automated] Regression: the full-script rules belong to Evaluate Script, not
  # Generate Best Matches. Missing Genre, Setting or Protagonist must not block
  # exploratory matching.
  Scenario: Best matches do not require the full script structure
    Given only an Antagonist, Supporting Character and Finale are selected
    When the user widens the minimum fit to any
    And the user generates best matches
    Then the best matches panel becomes visible
    And suggestions are listed
    And no message says Genre, Setting or Protagonist is required

  # [unverified] Source-of-truth expectation for Script Lab exclusions. Starting
  # Tags may hide unavailable settings, but removing a setting from the exclusion
  # list should make it selectable in Graves without a reload.
  Scenario: Removing a Setting from Script Lab exclusions restores it in Graves
    Given the Script Lab Starting Tags profile is active
    And a Setting is hidden from Colman Graves because it is excluded
    When the user removes that Setting from Excluded Elements in Script Lab
    And the user returns to Colman Graves
    Then that Setting is available in the Graves Setting picker

  # [unverified] Guard against confusing source-of-truth behavior. If a setting
  # is unavailable because the shared exclusion list bans it, Graves should make
  # that reason visible rather than looking broken.
  Scenario: Graves explains when excluded Settings are unavailable
    Given the Script Lab exclusion list hides one or more Settings
    When the user opens the Colman Graves Setting picker
    Then excluded Settings are not selectable
    And the Graves exclusion notice explains that Script Lab exclusions are hiding suggestions or choices

  # [automated]
  Scenario: Resetting clears the submission and hides the verdict
    Given the user has evaluated a script
    When the user resets
    Then the results are hidden
    And no story element remains selected

  # [automated] More than ten elements is refused with the count.
  Scenario: More than ten elements is refused
    Given eleven story elements are selected
    When the user evaluates the script
    Then a message says Colman evaluates up to 10 story elements at once
    And the message states that 11 were selected

  # [automated] Category filter offers all seven categories and restricts rows.
  Scenario: Restricting best matches to one category
    Given the user has evaluated a script
    When the user restricts the match category to "Supporting Character"
    And the user generates best matches
    Then only supporting character suggestions are listed

  # [automated] Minimum-fit filter offers 3.0+ through 5.0 only.
  Scenario: Restricting best matches by minimum fit
    Given the user has evaluated a script
    When the user sets the minimum fit to "4.5+"
    And the user generates best matches
    Then every suggestion has a fit of at least 4.5

  # [automated] A "Starting tags only" checkbox exists and filters rows.
  Scenario: Limiting suggestions to starting tags
    Given the user has evaluated a script
    When the user limits suggestions to starting tags only
    And the user generates best matches
    Then no suggestion falls outside the starting tag set

  # [automated] The first page holds ten suggestions; tests/graves-best-matches.test.js
  # pins the page size and the cap against the shipped paginateRows().
  Scenario: Only the first ten suggestions are listed
    Given the user has evaluated a script
    When the user generates best matches
    Then the first ten suggestions are listed

  # [automated] The page fills in band order, so a conflicted candidate can never
  # push a clean one onto page two. Covered by tests/graves-best-matches.test.js.
  Scenario: Stronger suggestions fill the first page before weaker ones
    Given more than ten suggestions qualify
    When the user generates best matches
    Then successful suggestions are listed before common ones
    And common suggestions are listed before unsuccessful ones

  # [automated] A second page is a superset of the first, never a reshuffle, so
  # what the user has already read stays where it was.
  Scenario: Revealing more suggestions keeps the ones already read in place
    Given more than ten suggestions qualify
    When the next ten suggestions are revealed
    Then the first ten remain in their original order

  # [verified] Watched in the app on 2026-09-19 with Action seeded: the panel
  # opened with 10 rows and "Show more suggestions (122 more available)"; one
  # click took it to 20 rows, left the first ten untouched, and relabelled the
  # control to 112. No spec clicks the button yet, so this is not [automated].
  Scenario: The Show more control names how many suggestions remain
    Given more than ten suggestions qualify
    When the user generates best matches
    Then a Show more control states how many suggestions remain
    And the control disappears once every suggestion is listed

  # [automated] Each suggestion row carries an Add control.
  Scenario: Adding a suggested element to the script
    Given best matches are listed
    When the user adds the first suggestion
    Then that element joins the current script selection

  # [automated] Save to Script Library should write a reusable script card.
  Scenario: Saving an evaluated script to the library
    Given the user has evaluated a script
    When the user saves the script to the library
    Then the user is told the script was saved
    And the script appears in the Script Library

  # [automated] The Marketing & Release transfer is a workflow button, not a
  # decorative link. It should carry the current script into analysis.
  Scenario: Transferring an evaluated script to Marketing and Release
    Given the user has evaluated a script
    When the user transfers it to Marketing and Release
    Then the Marketing and Release panel is shown
    And the script's Genre is selected there
    And marketing analysis results are shown

  # [unverified] Markup includes this notice and it is hidden by default, but the
  # banned-element warning journey has not been reproduced yet.
  Scenario: Warning when the script uses elements banned in Script Lab
    Given the user has banned an element in Script Lab
    And that element is part of the Graves script
    When the user evaluates the script
    Then an exclusion notice names the banned element
    And the user can jump back to Script Lab to change it

  # [verified] The verdict label and tone are banded off the average fit,
  # with "Success" at 4.0 and above.
  Scenario: The verdict follows a successful average fit
    Given a script whose average fit is 4.2
    When the user evaluates the script
    Then the verdict reads "Success"

  # [automated] Search fields must not disappear while the user is typing or
  # after a search has no matches.
  Scenario: Category search fields stay visible while filtering
    Given the Colman Graves Finale search field is visible
    When the user searches for "protagonist dies heroically"
    Then the Finale search field remains visible
    When the user searches for text with no matching Finale
    Then the Finale search field remains visible
    And the Finale search wrapper remains visible
