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
  Scenario: Primary product tabs switch visible panels
    When the user opens the Build tab
    Then the Script Lab panel is visible
    When the user opens the Evaluate tab
    Then the Colman Graves panel is visible
    When the user opens the Market tab
    Then the Marketing and Release panel is visible

  # [automated] Changing language re-renders tag names without changing tag ids.
  Scenario: Language selector updates story element names
    Given the Build tab is selected
    And the Supporting Character picker contains "Sidekick"
    When the user selects German in the language selector
    Then the Supporting Character picker contains "Kumpan"
    And the Supporting Character picker still stores the Sidekick tag id
