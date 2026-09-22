# Status key:
#   [automated]  covered by Marketing specs, including tests/e2e/marketing-release.spec.js,
#                tests/e2e/distribution-max-score.spec.js and tests/e2e/distribution-behemoth.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched
#
# NOTE: this area has two modes — "Analyze Script" (default) and
# "Build for Target". Analyze Script scenarios live here; Build for Target has
# its own feature file and is covered by tests/e2e/marketing-release.spec.js.

Feature: Marketing and Release
  Turn a finished script into an audience, an advertiser shortlist, and a
  distribution plan.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Market tab is selected
    And the Analyze Script mode is active

  # [automated]
  Scenario: The distribution calculator is available before any analysis
    Then no analysis results are shown
    And the distribution calculator is shown

  # [automated] Commercial and Art inputs are 0-10, both defaulting to 5.0.
  Scenario: Setting the movie scores
    When the user sets the commercial score to 8.0
    And the user sets the artistic score to 3.0
    Then the commercial score input reads 8.0
    And the artistic score input reads 3.0

  # [automated] Typing in the number fields is a separate interaction path from
  # dragging the sliders and must drive the same state.
  Scenario: Typing movie scores updates sliders and distribution
    When the user types 7.5 into the commercial score field
    And the user types 2.5 into the artistic score field
    Then the commercial score slider reads 7.5
    And the artistic score slider reads 2.5
    And the distribution calculator reports a target commercial score of 7.5

  # [automated]
  Scenario: The distribution calculator follows the commercial score
    When the user sets the commercial score to 8.0
    Then the distribution calculator reports a target commercial score of 8.0
    And the weekly screening projections update

  # [automated]
  Scenario: Weekly screening projections decline across the run
    Then screening projections are listed for weeks 1 through 8
    And each week card is addressable by its week number
    And the week 8 figure is lower than the week 1 figure

  # [automated] Extracted game-file formula: commercial only.
  Scenario Outline: Screening projections follow the extracted distribution grid
    When the user sets the commercial score to <score>
    Then the screening projections are <week_1>, <week_2>, <week_3>, <week_4>, <week_5>, <week_6>, <week_7>, and <week_8>

    Examples:
      | score | week_1 | week_2 | week_3 | week_4 | week_5 | week_6 | week_7 | week_8 |
      | 5.0   | 10000  | 5000   | 4000   | 3200   | 2560   | 2048   | 1638   | 1310   |
      | 10.0  | 20000  | 10000  | 8000   | 6400   | 5120   | 4096   | 3277   | 2621   |

  # [automated] Owned Theatres input defaults to 3185.
  Scenario: Changing the number of owned theatres
    When the user changes the owned theatres to 5000
    Then the owned and rented split changes
    And audience demand does not change

  # [automated] Two opening-viewer switches sit in the distribution header.
  Scenario Outline: Distribution bonuses can be toggled independently
    When the user enables the "<bonus>" bonus
    Then the screening projections are recalculated
    And the "<bonus>" switch is on

    Examples:
      | bonus            |
      | Striking Image   |
      | Artistic Ability |

  # [automated] Behemoth has two separate effects: a +25% boost to all weeks 1-8
  # whenever it is active, plus slower decay only above commercial score 9.
  Scenario: Behemoth applies 25% boost to all weeks
    When the user enables the Behemoth studio policy
    Then all weeks 1-8 demand increases by 25 percent
    When the user raises the commercial score above 9
    Then week 3 keeps more attendance than the normal grid

  # [automated] The control should explain that the Behemoth boost represents
  # the Behemoth budget policy rather than a score-only rule.
  Scenario: Behemoth control explains its budget requirement
    Then the Behemoth policy toggle is visible
    And its label mentions the budget over $1M requirement
    And its tooltip explains the 25 percent boost to all weeks

  # [automated] Boutique is the artistic counterpart: it never changes week 1,
  # and its slower decay is gated by artistic score above 9.
  Scenario: Boutique slows later weeks only for highly artistic films
    When the user sets the artistic score to 10
    And the user enables the Boutique studio policy
    Then week 1 demand is unchanged
    And week 3 keeps more attendance than the normal grid

  # [automated] Both studio policies can apply to the same film; they stack on
  # the decay rate while all weeks receive their respective boosts.
  Scenario: Behemoth and Boutique policies stack
    When the user sets both movie scores to 10
    And the user enables the Behemoth and Boutique studio policies
    Then all weeks 1-8 receive the Behemoth 25% boost
    And week 3 uses the stacked studio decay rate

  # [automated] Analyze control and results markup exist.
  Scenario: Analysing a script produces a marketing profile
    When the user selects story elements for the script
    And the user analyses the script
    Then the results become visible
    And a target audience is described
    And a holiday release recommendation is given
    And recommended advertisers are ranked from highest to lowest
    And a recommended advertisement duration is given

  # [verified] The audience panel has a High / Moderate Interest legend.
  Scenario: The target audience distinguishes interest levels
    Given the user has analysed a script
    Then audiences are marked as high or moderate interest

  # [automated] A "Movie Lean Towards" field precedes the advertiser list.
  Scenario: The advertiser shortlist states which way the movie leans
    Given the user has analysed a script
    Then the movie's lean is stated
    And advertisers are listed beneath it

  # [automated] Reset and Save to Script Library controls exist.
  Scenario: Resetting clears the marketing selection
    Given the user has selected story elements
    When the user resets
    Then the selection is cleared

  # [automated] Save control exists in this mode.
  Scenario: Saving an analysed script to the library
    Given the user has analysed a script
    When the user saves the script to the library
    Then the script appears in the Script Library

  # [automated] Reset returns Analyze Script to a clean selection state.
  Scenario: Resetting after analysis clears the marketing selection
    Given the user has selected story elements
    When the user resets
    Then no Genre remains selected
    And analysis results are hidden

  # ---------------------------------------------------------------------
  # Holiday release window
  # ---------------------------------------------------------------------

  # [automated] Each holiday carries a per-demographic bonus (data.js:80). The
  # figure shown is the mean across the film's primary audience, not the sum the
  # ranking uses — a sum grows with how many demographics a film reaches, which
  # is an ordering score rather than a turnout multiplier. TC04-000019 reads the
  # rendered percentage; the mean-not-sum rule itself is pinned by
  # tests/holiday-release.test.js:35.
  Scenario: Holiday rows show the turnout bonus for this film's audience
    Given the user has analysed a script
    Then each suggested holiday shows a week 1 bonus percentage

  # [automated] TC04-000019 selects the top holiday row and asserts week 1 rises
  # by the percentage the row advertises while week 2 holds. Until that spec
  # existed this was marked automated on the strength of a unit test that fed the
  # bonus straight into the planner, so an unwired row would not have failed.
  Scenario: Choosing a holiday lifts opening demand
    Given the user has analysed a script
    When the user selects a holiday release window
    Then week 1 demand rises by that holiday's bonus
    And week 2 is unchanged

  # [automated] TC04-000020. Selecting the active window again is the only route
  # back, and nothing asserted that path before that spec.
  Scenario: Deselecting a holiday restores the base curve
    Given the user has selected a holiday release window
    When the user selects that same holiday again
    Then the distribution grid returns to its unboosted figures

  # [unverified] ASSUMPTION, not traced to any extracted file: the holiday bonus
  # is applied to week 1 alone. Release timing plausibly moves the opening rather
  # than the whole run, but nothing in the game data states this. Confirm against
  # a real release before trusting the later weeks.
  Scenario: The holiday bonus affects only the opening week
    Given the user has selected a holiday release window
    Then weeks 3 through 8 match their unboosted figures

  # [automated] Behemoth boost applies regardless of commercial score. The slower
  # decay rule is independent and only applies when score > 9.
  Scenario: Behemoth boost applies at all score levels
    When the user sets the commercial score to 5.0
    And the user enables the Behemoth studio policy
    Then all weeks 1-8 show 25% higher demand than without Behemoth

  # [automated] Week 2 receives the full Behemoth boost since it is based on the
  # commercial score and not derived from decay.
  Scenario: Behemoth boost applies to week 2
    When the user sets the commercial score to 8.0
    And the user enables the Behemoth studio policy
    Then week 2 demand increases by 25 percent

  # [automated] The slower decay rule has a separate gate: commercial score > 9.
  # Below that threshold, Behemoth applies only the boost, not the decay modifier.
  Scenario: Behemoth slower decay requires commercial score above 9
    When the user sets the commercial score to 9.0
    And the user enables the Behemoth studio policy
    Then week 3 shows the boost but uses the normal decay rate
    When the user raises the commercial score to 9.1
    Then week 3 shows the boost and uses the slower decay rate
