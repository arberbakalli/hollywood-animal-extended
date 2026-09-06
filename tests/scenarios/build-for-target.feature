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

  # [automated] Guard: the app must say what is missing, not fail silently.
  Scenario: Searching with neither an audience nor an advertiser is refused
    Given no audience is selected
    And no advertiser is selected
    When the user searches for top combinations
    Then a message asks for at least one audience or advertiser
    And no results are shown

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

  # [automated] findTargetedCombinations refuses more than six optional tags.
  Scenario: More than six optional tags is refused
    Given the user has selected a target audience
    When the user adds seven story elements to the tag builder
    And the user searches for top combinations
    Then a message says to pick six or fewer optional tags
    And the count the user selected is named in the message

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

  # [unverified] Whether a selected audience and a selected advertiser combine
  # or conflict has not been observed.
  Scenario: Selecting both an audience and an advertiser
    When the user selects both a target audience and an advertiser
    And the user searches for top combinations
    Then the results reflect both constraints
