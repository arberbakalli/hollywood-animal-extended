# Status key:
#   [automated]  covered by an e2e spec
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed — do not automate until watched
#
# NOTE: this area has two modes — "Analyze Script" (default) and
# "Build for Target". The Build for Target panel was not exercised; its
# scenarios are deliberately absent rather than guessed.

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

  # [verified] Commercial and Art inputs are 0-10, both defaulting to 5.0.
  Scenario: Setting the movie scores
    When the user sets the commercial score to 8.0
    And the user sets the artistic score to 3.0
    Then the commercial score input reads 8.0
    And the artistic score input reads 3.0

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

  # [verified] Owned Theatres input defaults to 3185.
  Scenario: Changing the number of owned theatres
    When the user changes the owned theatres to 5000
    Then the screening projections are recalculated

  # [verified] Three independent switches sit in the distribution header.
  Scenario Outline: Distribution bonuses can be toggled independently
    When the user enables the "<bonus>" bonus
    Then the screening projections are recalculated
    And the "<bonus>" switch is on

    Examples:
      | bonus            |
      | Striking Image   |
      | Artistic Ability |
      | Behemoth         |

  # [automated] Behemoth's documented rule, per its own tooltip.
  Scenario: Behemoth raises first-week viewers
    Given the Behemoth bonus is off
    When the user enables the Behemoth bonus
    Then the week 1 projection increases

  # [verified] Analyze control and results markup exist.
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

  # [verified] A "Movie Lean Towards" field precedes the advertiser list.
  Scenario: The advertiser shortlist states which way the movie leans
    Given the user has analysed a script
    Then the movie's lean is stated
    And advertisers are listed beneath it

  # [verified] Reset and Save to Script Library controls exist.
  Scenario: Resetting clears the marketing selection
    Given the user has selected story elements
    When the user resets
    Then the selection is cleared

  # [verified] Save control exists in this mode.
  Scenario: Saving an analysed script to the library
    Given the user has analysed a script
    When the user saves the script to the library
    Then the script appears in the Script Library
