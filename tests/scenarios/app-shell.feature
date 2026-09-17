# Status key:
#   [automated]  covered by tests/e2e/app-shell.spec.js or another e2e spec
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: App Shell
  Keep global navigation and language controls working while feature panels
  own their deeper behavior.

  Background:
    Given the Hollywood Animal Calculator is open

  # [automated] Primary tabs are the entry points for Build, Evaluate and Market.
  Scenario Outline: Primary product tabs switch visible panels
    When the user opens the <tab> tab
    Then the <panel> panel is visible

    Examples:
      | tab      | panel                 |
      | Build    | Script Lab            |
      | Evaluate | Colman Graves         |
      | Market   | Marketing and Release |

  # [automated] Changing language re-renders tag names without changing tag ids.
  Scenario: Language selector updates story element names
    Given the Build tab is selected
    And the Supporting Character picker contains "Sidekick"
    When the user selects German in the language selector
    Then the Supporting Character picker contains "Kumpan"
    And the Supporting Character picker still stores the Sidekick tag id
