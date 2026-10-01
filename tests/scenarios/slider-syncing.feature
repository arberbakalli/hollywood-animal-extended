Feature: Slider Syncing - Proportional Mapping between Element Pool and Movie Score
  As a script builder
  I want the Max Element Pool and Target Movie Score sliders to stay synchronized
  So that the relationship between element count and target score is always clear

  The Max Element Pool and the Target Movie Score are one to one, 5 to 10: a
  pool of N targets N, and a target of N sets a pool of N (owner ruling
  2026-10-01, docs/GAME_RULES.md section 1). The Rating Limit table is a
  ceiling, not a requirement.

  # [automated] TC10-000001.
  Scenario: The shipped defaults open already in sync
    Given the app has just loaded
    When I view the Script Lab tab
    Then the Max Element Pool should be 5
    And the Target Movie Score should be 5

  # [automated] TC10-000002.
  Scenario: Raising the Max Element Pool raises the Target Movie Score
    Given the Max Element Pool is at 5
    And the Target Movie Score is at 5
    When I move the Max Element Pool slider to 8
    Then the Target Movie Score should update to 8

  # [automated] TC10-000003.
  Scenario: Lowering the Max Element Pool lowers the score and its fill follows
    Given the Max Element Pool is at 10
    When I move the Max Element Pool slider to 6
    Then the Target Movie Score should update to 6
    And the Target Movie Score fill should be 20%

  # [automated] TC10-000004.
  Scenario: Raising the Target Movie Score raises the Max Element Pool
    Given the Target Movie Score is at 5
    And the Max Element Pool is at 5
    When I move the Target Movie Score slider to 9
    Then the Max Element Pool should update to 9

  # [automated] TC10-000005.
  Scenario: The maximum score asks for ten elements
    Given the Target Movie Score is at 5
    When I move the Target Movie Score slider to 10
    Then the Max Element Pool should update to 10
    And the Max Element Pool fill should be 100%

  # [automated] TC10-000006.
  Scenario: A pool of ten still targets score ten
    Given the Max Element Pool is set to 10
    When I view the Target Movie Score
    Then it should show 10
    And the Target Movie Score fill should be 100%

  # [automated] TC10-000007.
  Scenario: Returning to a pool size returns the same score
    Given I set the Max Element Pool to 7
    And the Target Movie Score updates to 7
    When I move the Max Element Pool away and back to 7
    Then the Target Movie Score should return to 7
