Feature: Consistent scripts across generation, evaluation and marketing
  A player can rely on availability, locked choices and movie scores while
  moving a script between the three tools.

  # [automated] TC20-000001, tests/e2e/product-hardening.spec.js.
  # This real-data regression fixture legitimately scores zero; zero is not NaN.
  Scenario Outline: A conflicting locked script keeps its zero scores on transfer
    Given Action at 80 percent and Comedy at 20 percent are locked
    And Fantasy Kingdom, Outcast, Robber with a Thousand Penises, Couple Gets Married, Femme Fatale and Love Interest are locked
    When the player uses <mode>
    Then every generated script retains all locked elements and genre shares
    And both movie scores are zero
    And script synergy is finite
    When the player opens the first result in Colman Graves and Marketing
    Then both destinations preserve its elements and genre shares
    And both destinations retain zero commercial and artistic movie scores

    Examples:
      | mode                      |
      | Generate Scripts          |
      | Highest Artistic Appeal   |
      | Highest Commercial Appeal |

  # [automated] TC24-000002, tests/e2e/generation-score-transfers.spec.js.
  # Regression values for the current scoring model, not independent game-math verification.
  # Five story elements top out at 6.0 (Rating Limit table, owner 2026-09-30).
  Scenario Outline: A positive locked script keeps its movie scores on transfer
    Given Drama and Comedy are locked with equal shares
    And Modern European City, White Collar, Corrupt Official, Couple Gets Married, Love Interest and Femme Fatale are locked
    When the player uses <mode>
    Then every generated script has commercial and artistic movie scores of 6.0
    And the first result displays <metric> as <value>
    When the player opens the first result in Colman Graves and Marketing
    Then both destinations preserve its elements and genre shares
    And both destinations retain commercial and artistic movie scores of 6.0

    Examples:
      | mode                      | metric           | value |
      | Generate Scripts          | Movie Score      | 6.0   |
      | Highest Artistic Appeal   | Artistic Bonus   | 0.65  |
      | Highest Commercial Appeal | Commercial Bonus | 0.40  |

  # [automated] TC22-000007, tests/e2e/hardening-boundaries.spec.js.
  Scenario Outline: Partial locks constrain generation at both pool limits
    Given Starting Tags is applied and only Cowboy is locked
    And Max Element Pool is <pool>
    When the player uses <mode>
    Then every result retains Cowboy and has exactly <pool> story elements
    And every result contains Genre, Setting and Protagonist, and at most one Antagonist and one Finale
    And no result contains an excluded element
    And all movie scores are finite
    And results are ordered by <ranking>
    And Age and Gender Appeal continues to list only Cowboy

    Examples:
      | mode                      | pool | ranking          |
      | Generate Scripts          | 5    | movie score      |
      | Generate Scripts          | 10   | movie score      |
      | Highest Artistic Appeal   | 5    | artistic bonus   |
      | Highest Artistic Appeal   | 10   | artistic bonus   |
      | Highest Commercial Appeal | 5    | commercial bonus |
      | Highest Commercial Appeal | 10   | commercial bonus |

  # [automated] TC20-000003, tests/e2e/product-hardening.spec.js.
  Scenario Outline: Too few available elements cannot produce an incomplete script
    Given every Supporting Character and Theme and Event element is excluded
    And five story elements are required
    When the player uses <mode>
    Then feedback explains that not enough available story elements remain to fill five slots
    And no generated script cards appear

    Examples:
      | mode                      |
      | Generate Scripts          |
      | Highest Artistic Appeal   |
      | Highest Commercial Appeal |

  # [automated] TC20-000004, tests/e2e/product-hardening.spec.js.
  Scenario: Unavailable scoring data can be retried
    Given a valid five-story-element script is locked
    And compatibility data is temporarily unavailable
    When the player generates scripts
    Then a scoring-data error appears and no script cards appear
    When the data becomes available and the player generates again
    Then five script cards appear
    And their displayed results contain neither NaN nor Infinity

  # [automated] TC22-000010, tests/e2e/hardening-boundaries.spec.js.
  Scenario Outline: Best Matches can explore a single seed
    Given only <seed> is selected in Colman Graves
    When the player generates Best Matches with no minimum-fit restriction
    Then suggestions appear without a required-category warning
    And the displayed suggestions contain neither NaN nor Infinity

    Examples:
      | seed      |
      | Comedy    |
      | Wild West |
      | Cowboy    |

  # [automated] TC22-000008, tests/e2e/hardening-boundaries.spec.js.
  Scenario Outline: Exclusions cannot waive a required category in Build for Target
    Given every <category> is excluded
    When the player finds top combinations
    Then no combination cards appear
    And the results explain that no combinations were found

    Examples:
      | category    |
      | Genre       |
      | Setting     |
      | Protagonist |

  # [automated] TC22-000009, tests/e2e/hardening-boundaries.spec.js.
  Scenario: Fully locked story slots still leave room for context
    Given Max Element Pool is five
    And Cowboy, Bandit, Antagonist Gets Killed, Sidekick and Treasure Hunt are locked in Build for Target
    When the player finds top combinations
    Then every combination retains all five locked elements
    And one Genre and one Setting bring each combination to seven total elements

  # [automated] TC25-000001, tests/e2e/advertiser-fit-parity.spec.js.
  Scenario: Both Marketing views agree on per-agency fit under balanced assumptions
    Given Starting Tags is applied
    And Analyze Script contains Action, Wild West, Cowboy, Bandit, Sidekick, Treasure Hunt and Antagonist Gets Killed
    And commercial and artistic movie scores are both 5.0
    When the player analyzes the script
    Then the displayed movie lean is Balanced
    When the same elements are locked in Build for Target
    And the player finds combinations for each agency individually
    Then every combination retains exactly those elements
    And its advertiser fit and grade equal that agency's Analyze Script result

  # [automated] TC21-000001, tests/e2e/readability-hardening.spec.js.
  # Technical acceptance: >= 4.5:1 contrast on measured solid backgrounds.
  Scenario Outline: Dropdown text remains readable when focused
    Given the browser viewport is <width> pixels wide
    When the player selects each Genre in Script Lab and focuses its dropdown
    Then the selected Genre text has readable contrast
    And focusing the dropdown preserves its text color
    And the remove control remains beside the dropdown within the viewport

    Examples:
      | width |
      | 390   |
      | 1280  |

  # [automated] TC21-000002, tests/e2e/readability-hardening.spec.js.
  Scenario Outline: Genre suggestions remain readable in every Best Matches view
    Given the browser viewport is <width> pixels wide
    And Comedy and Wild West are selected in Colman Graves
    When the player requests Genre suggestions with no minimum-fit restriction
    And visits Best Additions, Swap Suggestions and Pairwise
    Then each view contains readable suggestions
    And the suggestion text stays within the viewport

    Examples:
      | width |
      | 390   |
      | 1280  |
