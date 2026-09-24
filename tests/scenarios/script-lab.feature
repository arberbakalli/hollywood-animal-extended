# Status key:
#   [automated]  covered by Script Lab specs, including tests/e2e/script-lab.spec.js,
#                tests/e2e/empty-state-navigation.spec.js and tests/e2e/search-field-persistence.spec.js
#   [verified]   behaviour observed in the live app, not yet automated
#   [unverified] plausible but NOT yet confirmed against the app — do not
#                automate until someone has watched it happen

Feature: Script Lab
  Generate candidate scripts from story elements, constrained by locked
  (must-include) and excluded (banned) tags.

  Background:
    Given the Hollywood Animal Calculator is open
    And the Build tab is selected

  # [automated] TC01-000001.
  Scenario: The Build tab reveals the Script Lab panel
    Then the Script Lab panel is visible
    And the Generate Scripts button is labelled "Generate Scripts"

  # [automated] TC01-000003.
  Scenario: Generating with default targets produces script cards
    Given no scripts have been generated yet
    And the generated results section is hidden
    When the user generates scripts
    Then the generated results section becomes visible
    And at least one script card is listed
    And each card shows its story element chips

  # [unverified] When user selects a protagonist or antagonist,
  # display age × gender compatibility breakdown with appeal ratings and insight.
  # Behavior implemented and unit-tested; e2e coverage pending.
  Scenario: Age-to-role breakdown shows appeal by age and gender
    When the user selects a Protagonist
    Then the age-to-role breakdown panel becomes visible
    And the panel shows appeal ratings for YOUNG, MID, and OLD age groups
    And each age group shows appeal for Male and Female
    And appeal ratings are displayed on the -5.0 to +5.0 scale
    And a peak appeal insight is shown

  # [automated] TC01-000032. Best Artistic uses the shared generation engine but
  # ranks by artistic movie score and shows commercial score as context.
  Scenario: Generating best artistic scripts ranks artistic score first
    When the user generates best artistic scripts
    Then three generated script cards are shown
    And the first card shows Artistic as the primary score
    And the card also shows Commercial and Synergy context
    And Show More reveals additional generated scripts

  # [automated] TC01-000033. Best Commercial mirrors Best Artistic with the
  # primary sort flipped to commercial movie score.
  Scenario: Generating best commercial scripts ranks commercial score first
    When the user generates best commercial scripts
    Then three generated script cards are shown
    And the first card shows Commercial as the primary score
    And the card also shows Artistic and Synergy context

  # [automated] TC08-000003. Empty state should be explicit before the first generation run.
  Scenario: Generated results start empty
    Given the user has not generated scripts yet
    Then no generated script cards are listed
    And the generated results section is hidden

  # [automated] TC01-000005.
  Scenario: The compatibility slider drives its paired number input
    When the user sets the target average compatibility slider to 5
    Then the compatibility number input reads 5

  # [automated] TC01-000007.
  Scenario: Banning a tag increments the excluded counter
    Given the excluded counter reads 0
    When the user bans the supporting character "Sidekick"
    Then the excluded counter reads 1

  # [automated] TC01-000008.
  Scenario: Reset Bans clears the excluded counter
    Given the user has banned the supporting character "Sidekick"
    When the user resets the bans
    Then the excluded counter reads 0

  # [automated] TC01-000018. The Excluded Elements list is the source of truth across the
  # app, so it must survive a browser reload.
  Scenario: Excluded Elements persist after reload
    Given the user has banned the supporting character "Sidekick"
    When the user reloads the calculator
    Then the excluded counter reads 1
    And "Sidekick" remains selected in Excluded Elements

  # [automated] TC09-000015. The Starting Tags profile stores a large exclusion
  # list. Reload must restore every stored row, or the next DOM mutation writes a
  # shortened list back to storage and loses bans.
  Scenario: Every stored exclusion is restored after reload
    Given the user has applied the Starting Tags profile
    When the user reloads the calculator
    Then every stored exclusion is rendered again
    And no saved ban is lost from storage

  # [automated] TC09-000017. The Excluded Elements list has no category
  # cardinality cap. Single-select script categories may still have many banned
  # items and all of them must survive a reload.
  Scenario: Single-select category bans survive reload
    Given the Starting Tags profile has banned several Settings, Protagonists, Antagonists and Finales
    When the user reloads the calculator
    Then every ban in those categories is still present

  # [automated] TC01-000026: exclusion state is restored from localStorage when
  # returning to the Build tab, ensuring the badge count and dropdown selections
  # stay in sync across tab switches.
  Scenario: Exclusion state stays consistent when switching tabs
    Given the user has switched to Custom profile
    And removed a Supporting Character from Excluded Elements
    When the user switches to the Evaluate tab
    And back to the Build tab
    Then the removed Supporting Character is available in the picker
    And the Excluded Elements list reflects the change

  # [automated] TC01-000026. Tag availability profile switches between Starting and Custom.
  Scenario: The tag availability profile switches between Starting and Custom
    Given the Custom profile is active
    When the user selects the Starting Tags profile
    Then the Starting Tags profile is active
    And the Custom profile is no longer active

  # [automated] TC01-000010.
  Scenario: Pinning a generated script populates the Script Library
    Given the user has generated scripts
    When the user pins the first generated script
    Then the Script Library section becomes visible
    And the pinned script is listed
    And the Save and Load controls are available

  # [automated] TC01-000023. Saving an empty library should explain the problem instead of
  # starting a useless download.
  Scenario: Save Library refuses an empty script library
    Given no scripts are pinned
    When the user saves the Script Library
    Then a message says there are no pinned scripts to save

  # [automated] TC01-000024. Invalid imports must fail loudly and keep the library intact.
  Scenario: Load Library explains invalid JSON shape
    When the user loads a JSON file that is not a script array
    Then a message says the file format is invalid

  # [automated] TC01-000025. Generated result action buttons should carry the generated
  # script into the richer analysis surfaces.
  Scenario Outline: Transferring a generated script to another product surface
    Given the user has generated scripts
    When the user opens a generated script in <destination>
    Then the <panel> panel is visible
    And <results> are shown

    Examples:
      | destination           | panel                 | results                    |
      | Graves                | Colman Graves         | evaluation results         |
      | Marketing and Release | Marketing and Release | marketing analysis results |

  # [automated] TC01-000011. Regression: only 2 of the 7 categories used to render.
  Scenario Outline: Every story element category offers a picker
    Then a picker is offered for <category>

    Examples:
      | category             |
      | Genre                |
      | Setting              |
      | Protagonist          |
      | Antagonist           |
      | Supporting Character |
      | Theme & Event        |
      | Finale               |

  # [automated] TC01-000014. Regression: a counter shared across all six panels made row ids
  # shift whenever any other panel added a row.
  Scenario Outline: Tag selector row ids are numbered per category and context
    Then the first <category> row in <context> is numbered 1

    Examples:
      | category             | context           |
      | Supporting Character | Script Lab        |
      | Genre                | Script Lab        |
      | Supporting Character | Script Evaluation |

  # [automated] TC01-000002. Collapsible sections exist and default to expanded.
  Scenario Outline: Collapsing a Script Lab section hides its selectors
    Given the <section> section is expanded
    When the user collapses the <section> section
    Then the <selector_group> tag selectors are hidden

    Examples:
      | section           | selector_group |
      | Locked Elements   | locked         |
      | Excluded Elements | excluded       |

  # [automated] TC01-000004. Only Supporting Character and Theme & Event render as selectors.
  Scenario: Locking a tag constrains the generated scripts
    When the user locks the supporting character "Sidekick"
    And the user generates scripts
    Then every generated script includes "Sidekick"

  # [automated] TC01-000031. Improvement A: selected tags should get positive
  # visual feedback, and available strong-fit options should be hinted without
  # using red/negative styling for weak fits.
  Scenario: Selected tags and strong-fit options get positive visual feedback
    When the user locks a Protagonist
    Then the selected dropdown uses success styling
    And high-synergy available options are marked as strong fits

  # [automated] TC01-000020. Reset Locks clears user picks rather than only repainting the panel.
  Scenario: Reset Locks clears locked selections
    Given the user has locked the supporting character "Sidekick"
    When the user resets the locks
    Then no locked Supporting Character remains selected
    And generated results are hidden

  # [automated] TC08-000006. A collapsed section should stay recoverable after tab navigation.
  Scenario: Locked Elements remains expandable after tab switching
    Given the user has collapsed the Locked Elements section
    When the user opens Script Evaluation
    And the user returns to Script Lab
    Then the Locked Elements toggle is still visible

  # [automated] TC01-000012. The "+" control adds another dropdown row per category and context.
  Scenario Outline: Adding a second selector row for the same category
    When the user adds another <row> row
    Then two <dropdowns> dropdowns are available

    Examples:
      | row                           | dropdowns                     |
      | Supporting Character          | Supporting Character          |
      | excluded Supporting Character | excluded Supporting Character |

  # [automated] TC01-000013. A per-category search box filters that category's options.
  Scenario Outline: Filtering a category's options by search text
    When the user types "Sidekick" into the <search_box> search box
    Then only matching <option_type> remain selectable in that category

    Examples:
      | search_box                    | option_type |
      | Supporting Character          | options     |
      | excluded Supporting Character | ban options |

  # [automated] TC01-000027. Search inputs should not disappear while filtering or when no
  # option matches the search text.
  Scenario: Excluded search stays visible while filtering
    Given the Excluded Elements section is expanded
    When the user searches excluded Genre options for "action"
    Then the excluded Genre search field remains visible

  # [automated] TC01-000006. The movie-score slider updates the required-elements hint.
  Scenario: Raising the target movie score changes the required element count
    When the user raises the target movie score
    Then the required story elements hint updates

  # [automated] TC01-000016. Regression: the hint used the movie score itself as the story
  # element count at higher scores, so score 7 showed 7, score 9 showed 9, etc.
  Scenario Outline: Target movie score shows the correct story element count
    When the user sets the target movie score to <movie_score>
    Then the required story elements hint says "~<story_elements> Story Elements"

    Examples:
      | movie_score | story_elements |
      | 6           | 5              |
      | 7           | 6              |
      | 8           | 7              |
      | 9           | 8              |
      | 10          | 9              |

  # [automated] TC01-000017. Regression: white text on the red circular counter was hard to
  # read and visually harsh. The counter should remain visible without eye strain.
  Scenario: Excluded counter text is readable on the danger badge
    Given the excluded counter is visible
    When the excluded counter appears on its red badge
    Then the counter text is black
    And the counter remains legible against the badge background

  # [automated] TC01-000030. Rewritten: the journey it described could not be
  # reproduced, and the reason is that the app resolves the situation before
  # generation is ever reached. A lock that becomes excluded is dropped from the
  # selection on the spot, named in a message, so generation never sees a
  # blocked lock. The trigger was never "locks that conflict with each other"
  # either — the branch behind unlockBlockedLocksButton fires only when a locked
  # element is excluded.
  #
  # showBlockedLockAction, hideBlockedLockAction, removeBlockedLockedPicks and
  # the unlockBlockedLocksButton markup were deleted on the owner's call, having
  # no reachable path. The guard itself stays: generation still refuses, and
  # still names the offending element, if a locked pick is somehow excluded when
  # it runs. Only the button offering to clear them is gone, because the lock is
  # already cleared by the time anyone could press it.
  Scenario: Locking an element that becomes excluded drops it with a message
    Given the user has locked an element in Script Lab
    When that element becomes excluded
    Then the locked pick is removed
    And a message names the element that was removed

  # [automated] tests/e2e/script-lab.spec.js TC01-000029. Watched in the app
  # 2026-09-22 before automating: pin 1, reload, library empties to 0, load the
  # saved file, back to 1 with "Loaded 1 scripts."
  #
  # The reload is the scenario, not staging for it. `pinnedScripts` is an
  # in-memory array with no persistence, unlike the exclusion list, so a refresh
  # does not re-render the library — it loses it, and the saved file is the only
  # way a pinned script survives. The previous wording said "loads that file
  # back" with nothing lost in between, which cannot pass: handleFileLoad merges
  # and dedupes on uniqueId, so loading into a library that still holds those
  # scripts reports "No new unique scripts found" and changes no count. A test
  # written from that wording would have asserted nothing.
  Scenario: The saved file is the only way a pinned script survives a reload
    Given the user has pinned a script
    And the user has saved the Script Library to a file
    When the user reloads the calculator
    Then the Script Library is empty
    When the user loads that file back
    Then the pinned script is restored
    And a message says how many scripts were loaded
