# Status key:
#   [automated]  covered by tests/e2e/header-layout.spec.js
#   [verified]   behaviour or markup confirmed against the app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app

Feature: Header layout
  The header holds the title, the Max Element Pool control, the language
  picker and the link to the Testing Features lab.

  # [automated] TC36-000001. The link once pushed the page 234px sideways at 801px.
  Scenario: The header fits every screen width
    Given the screen is any width from 390 to 1366 pixels
    When the app opens
    Then the page does not scroll sideways
    And the pool control, the language picker and the Testing Features link are inside the screen
