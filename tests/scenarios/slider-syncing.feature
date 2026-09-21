Feature: Slider Syncing - Proportional Mapping between Element Pool and Movie Score
  As a script builder
  I want the Max Element Pool and Target Movie Score sliders to stay synchronized
  So that the relationship between element count and target score is always clear

  # [automated]
  Scenario: Initialize with synchronized sliders
    Given the app loads
    When I view the Script Lab tab
    Then the Max Element Pool and Target Movie Score should be in sync
    And the visual track should match the slider position

  # [automated]
  Scenario: Move Max Element Pool slider right
    Given the Max Element Pool is at 5
    And the Target Movie Score is at 6
    When I move the Max Element Pool slider to 8
    Then the Target Movie Score should update to 8
    And the yellow fill track should move to match

  # [automated]
  Scenario: Move Max Element Pool slider left
    Given the Max Element Pool is at 10
    And the Target Movie Score is at 10
    When I move the Max Element Pool slider to 6
    Then the Target Movie Score should update to 7
    And the yellow fill track should move to position 50%

  # [automated]
  Scenario: Move Target Movie Score slider right
    Given the Target Movie Score is at 6
    And the Max Element Pool is at 5
    When I move the Target Movie Score slider to 9
    Then the Max Element Pool should update to 8

  # [automated]
  Scenario: Move Target Movie Score slider to maximum
    Given the Target Movie Score is at 6
    And the Max Element Pool is at 5
    When I move the Target Movie Score slider to 10
    Then the Max Element Pool should update to 9
    And the yellow fill track should be at 100%

  # [automated]
  Scenario: Max Element Pool at 10 can achieve Target Movie Score 10
    Given the Max Element Pool is set to 10
    When I view the Target Movie Score
    Then it should show 10 (better odds for achieving score 10)
    And the yellow fill track should be at maximum

  # [automated]
  Scenario: Proportional mapping maintains consistency
    Given I set Max Element Pool to 7
    When the Target Movie Score updates to 8
    And I change the Max Element Pool back to 7
    Then the Target Movie Score should return to 8
