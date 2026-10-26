# Status key:
#   [automated]  covered by tests/e2e/app-shell.spec.js or another e2e spec
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: App Shell
  Keep global navigation and language controls working while feature panels
  own their deeper behavior.

  Background:
    Given the Hollywood Animal Calculator is open

  # [automated] TC38-000001, tests/e2e/builder-headings.spec.js.
  Scenario Outline: Builders share their selection heading on desktop and mobile
    Given the screen is <width> pixels wide
    Then Script Lab starts with a five-story-element hint excluding Genre and Setting
    When the user visits Build, Evaluate, Analyze Script and Build for Target
    Then every selection heading says Locked Elements
    And Build for Target also says Optional
    And the headings fit the screen

    Examples:
      | width |
      | 1280  |
      | 390   |

  # [automated] TC00-000001. Primary tabs are the entry points for Build, Evaluate and Market.
  Scenario Outline: Primary product tabs switch visible panels
    When the user opens the <tab> tab
    Then the <panel> panel is visible

    Examples:
      | tab      | panel                 |
      | Build    | Script Lab            |
      | Evaluate | Colman Graves         |
      | Market   | Marketing and Release |

  # [automated] TC00-000002. Changing language re-renders tag names without changing tag ids.
  Scenario: Language selector updates story element names
    Given the Build tab is selected
    And the Supporting Character picker contains "Sidekick"
    When the user selects German in the language selector
    Then the Supporting Character picker contains "Kumpan"
    And the Supporting Character picker still stores the Sidekick tag id

  # [automated] TC07-000001. Data-loading failure should be visible and recoverable.
  Scenario: Start-up failure is reported instead of showing an empty app
    Given the story element data fails to load
    When the calculator starts
    Then a boot failure message is shown
    And the retry control is visible
    And the app does not claim to be ready

  # [automated] TC07-000002. Retrying should rebuild the app once data becomes available.
  Scenario: Retrying after a start-up failure recovers the app
    Given the story element data failed to load
    When data becomes available again
    And the user retries start-up
    Then the app becomes ready
    And the boot failure message is hidden
    And Colman Graves selectors are available

  # [automated] TC08-000011. Fast navigation should not leave tabs in a broken state.
  Scenario: Rapid tab switching remains responsive
    When the user switches between Build and Evaluate several times
    Then the Build tab can still be opened
    And the Script Lab panel is visible
