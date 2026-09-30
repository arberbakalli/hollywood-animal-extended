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

  # [automated] TC05-000001.
  Scenario: The panel offers audiences, advertisers and optional tag pickers
    Then target audiences can be selected
    And advertisers can be selected
    And a picker is offered for each of the seven story element categories
    And no results are shown yet

  # [automated] TC05-000002. Both filters are optional. With neither set, every agency is in
  # scope and the ranking answers "what plays best overall".
  Scenario: Searching with neither an audience nor an advertiser ranks against every agency
    Given no audience is selected
    And no advertiser is selected
    When the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated] TC05-000003.
  Scenario: Choosing an audience produces top combinations
    When the user selects a target audience
    And the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated] TC05-000008.
  Scenario: Resetting clears the selection and hides results
    Given the user has searched for top combinations
    When the user resets
    Then the results panel is hidden
    And the audience selections are cleared

  # [automated] TC05-000004. These are locks: anything picked here appears in every
  # combination. The label read "Add Tags (Optional - Leave Empty for All)",
  # which never said all what; it now names the effect.
  Scenario: Narrowing the search with optional tags
    Given the user has selected a target audience
    When the user adds a story element to the tag builder
    And the user searches for top combinations
    Then the combinations returned all include that story element

  # [automated] TC05-000005. Regression: one pick per category used to be refused, because
  # Genre and Setting were counted against the story element budget. They are
  # structural picks every script carries, so seven selections is five elements.
  Scenario: One pick per category is accepted
    Given the user has selected a target audience
    When the user adds one story element of each category to the tag builder
    And the user searches for top combinations
    Then the top combinations panel becomes visible
    And combinations are listed

  # [automated] TC20-000011. The Max Element Pool sets the budget; Genre and Setting
  # sit outside it, so a budget of N yields combinations N + 2 tags wide.
  Scenario Outline: The story element budget sets the combination width
    Given the user sets the maximum story elements to <budget>
    And Starting Tags is applied with no elements locked in Build for Target
    And an audience is selected
    When the user searches for top combinations
    Then each combination contains <budget> story elements
    And one Genre and one Setting bring its total tag count to <width>

    Examples:
      | budget | width |
      | 5      | 7     |
      | 10     | 12    |

  # [automated] TC05-000019. Six story elements against a pool of five must
  # name six, not the eight tags selected: Genre and Setting spend no budget. Selecting more story elements than the budget names both numbers.
  # The slider floor is 5, so exceeding it needs a multi-select category's "+".
  Scenario: Selecting more story elements than the budget is refused
    Given the user sets the maximum story elements to 5
    When the user adds six story elements to the tag builder
    And the user searches for top combinations
    Then a message names the budget and the number selected

  # [automated] TC05-000006. An advertiser selection takes precedence over audiences when
  # choosing which agencies to target.
  Scenario: Selecting an advertiser targets that agency directly
    When the user selects an advertiser
    And the user searches for top combinations
    Then the combinations are ranked for that agency

  # [automated] TC05-000007. Both mode buttons are present in this panel.
  Scenario: Switching back to Analyze Script
    When the user selects the Analyze Script mode
    Then the Analyze Script panel is shown
    And the Build for Target panel is hidden

  # ---------------------------------------------------------------------
  # Restored: these lost their only coverage when find-top-combinations.spec.js
  # was deleted, while the behaviour stayed in the product.
  # ---------------------------------------------------------------------

  # [automated] TC05-000020. Bans a story element it has just watched appear,
  # so its absence afterwards is evidence rather than coincidence. The exclusion list is owned by Script Lab and filters this search.
  Scenario: An element banned in Script Lab never appears in a combination
    Given the user has banned a Supporting Character in Script Lab
    When the user searches for top combinations
    Then no combination contains that element

  # [automated] TC05-000014. Ranking is the whole point of "top" combinations.
  Scenario: Combinations are ranked by descending advertiser fit
    Given the user has selected a target audience
    When the user searches for top combinations
    Then the first combination scores at least as high as the second

  # [automated] TC10-000001. The slider and its number field are two views of one budget.
  Scenario: The budget slider and number input stay in step
    When the user moves the budget slider to 7
    Then the budget number field reads 7
    When the user types 5 into the budget number field
    Then the budget slider reads 5

  # [automated] TC05-000017. The reachable path the previous note was missing: the
  # generator returns nothing when the surviving pool cannot fill the budget,
  # because each candidate combination is discarded unless it spends the budget
  # in full. Measured directly — three story elements against a budget of ten
  # yields zero combinations, where the full pool yields twenty. A user reaches
  # it by excluding most story elements in Script Lab, since that list feeds
  # Build for Target, or by raising Max Element Pool past the remaining supply.
  Scenario: An empty state is shown when nothing matches
    Given the surviving element pool cannot fill the Max Element Pool budget
    When the user searches for top combinations
    Then an empty state explains that nothing matched

  # [automated] TC05-000016, by reading findTargetedCombinations and confirming in
  # the app through Playwright. This was briefly marked automated against
  # "an advertiser selection wins over an audience selection" in
  # tests/build-for-target.test.js, but that test asserted a resolveAgencies
  # copy declared inside the test file rather than the product, and was removed
  # for exactly that reason. The real coverage now drives the UI.
  #
  # Corrected 2026-09-22. This asked for results reflecting BOTH constraints,
  # which the app has never done: findTargetedCombinations reads
  # `if (selectedAdvertisers.length) ... else if (selectedAudiences.length)`,
  # so an advertiser overrides the audience rather than narrowing with it. The
  # scenario described an intention, and a passing test already described the
  # opposite; recording the behaviour that ships.
  Scenario: An advertiser selection overrides a selected audience
    When the user selects both a target audience and an advertiser
    And the user searches for top combinations
    Then only the advertiser constrains the results

  # [automated] TC05-000021, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: Build for Target never suggests a combination with an Unsuccessful pair
    When the user finds top combinations at a pool of 5, then of 10
    Then no suggested combination holds a pair below 2.0

  # [automated] TC05-000022, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: A clash between two locked elements is named, and the results stay
    Given the user locked Evil Monster and Long Journey, which score 1.0 together
    When the user finds top combinations
    Then combinations are suggested
    And a note says "Your locked Evil Monster and Long Journey clash (1.0). Suggestions add no clash of their own."

  # [automated] TC05-000023, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario Outline: Changing an input after Find hides the old cards
    Given top combinations are showing
    When the user changes <input>
    Then the cards are hidden
    And a notice says "Inputs changed. Press Find Top Combinations to update."

    Examples:
      | input         |
      | the pool      |
      | a lock        |
      | an audience   |
      | an advertiser |
