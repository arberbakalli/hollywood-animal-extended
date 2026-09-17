# Status key:
#   [automated]  covered by tests/e2e/marketing-release.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched

Feature: Build for Target
  Work backwards from an audience or an advertiser to the script combinations
  that reach them, instead of forwards from a finished script.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Market tab is selected
    And the Build for Target mode is active

  # [automated]
  Scenario: The panel offers audiences, advertisers and optional tag pickers
    Then target audiences can be selected
    And advertisers can be selected
    And a picker is offered for each of the seven story element categories
    And no results are shown yet

  # [automated] Both filters are optional. With neither set, every agency is in
  # scope and the ranking answers "what plays best overall".
  Scenario: Searching with neither an audience nor an advertiser ranks against every agency
    Given no audience is selected
    And no advertiser is selected
    When the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated]
  Scenario: Choosing an audience produces top combinations
    When the user selects a target audience
    And the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated]
  Scenario: Resetting clears the selection and hides results
    Given the user has searched for top combinations
    When the user resets
    Then the results panel is hidden
    And the audience selections are cleared

  # [automated] Tags are optional; the label says "Leave Empty for All".
  Scenario: Narrowing the search with optional tags
    Given the user has selected a target audience
    When the user adds a story element to the tag builder
    And the user searches for top combinations
    Then the combinations returned all include that story element

  # [automated] Regression: one pick per category used to be refused, because
  # Genre and Setting were counted against the story element budget. They are
  # structural picks every script carries, so seven selections is five elements.
  Scenario: One pick per category is accepted
    Given the user has selected a target audience
    When the user adds one story element of each category to the tag builder
    And the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated] The Max Story Elements slider sets the budget; Genre and Setting
  # sit outside it, so a budget of N yields combinations N + 2 tags wide.
  Scenario Outline: The story element budget sets the combination width
    Given the user sets the maximum story elements to <budget>
    When the user searches for top combinations
    Then each combination contains <width> story elements

    Examples:
      | budget | width |
      | 5      | 7     |
      | 10     | 12    |

  # [automated] Selecting more story elements than the budget names both numbers.
  # The slider floor is 5, so exceeding it needs a multi-select category's "+".
  Scenario: Selecting more story elements than the budget is refused
    Given the user sets the maximum story elements to 5
    When the user adds six story elements to the tag builder
    And the user searches for top combinations
    Then a message names the budget and the number selected

  # [automated] An advertiser selection takes precedence over audiences when
  # choosing which agencies to target.
  Scenario: Selecting an advertiser targets that agency directly
    When the user selects an advertiser
    And the user searches for top combinations
    Then the combinations are ranked for that agency

  # [automated] Both mode buttons are present in this panel.
  Scenario: Switching back to Analyze Script
    When the user selects the Analyze Script mode
    Then the Analyze Script panel is shown
    And the Build for Target panel is hidden

  # ---------------------------------------------------------------------
  # Restored: these lost their only coverage when find-top-combinations.spec.js
  # was deleted, while the behaviour stayed in the product.
  # ---------------------------------------------------------------------

  # [automated] The exclusion list is owned by Script Lab and filters this search.
  Scenario: An element banned in Script Lab never appears in a combination
    Given the user has banned a Supporting Character in Script Lab
    When the user searches for top combinations
    Then no combination contains that element

  # [automated] Ranking is the whole point of "top" combinations.
  Scenario: Combinations are ranked by descending advertiser fit
    Given the user has selected a target audience
    When the user searches for top combinations
    Then the first combination scores at least as high as the second

  # [automated] The slider and its number field are two views of one budget.
  Scenario: The budget slider and number input stay in step
    When the user moves the budget slider to 7
    Then the budget number field reads 7
    When the user types 5 into the budget number field
    Then the budget slider reads 5

  # [unverified] displayTargetedResults renders an empty state when the search
  # returns nothing, but no reachable input has been found that produces zero
  # combinations. Do not automate until a real path to it is confirmed.
  Scenario: An empty state is shown when nothing matches
    Given constraints that no combination can satisfy
    When the user searches for top combinations
    Then an empty state explains that nothing matched

  # [unverified] Whether a selected audience and a selected advertiser combine
  # or conflict has not been observed.
  Scenario: Selecting both an audience and an advertiser
    When the user selects both a target audience and an advertiser
    And the user searches for top combinations
    Then the results reflect both constraints
