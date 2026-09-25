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

  # [automated] age-gender-appeal.spec.js. When user selects a protagonist or antagonist,
  # display age × gender compatibility breakdown with appeal ratings and insight.
  # Behavior implemented and covered by E2E.
  Scenario: Age-to-role breakdown shows appeal by age and gender
    When the user selects a Protagonist
    Then the age-to-role breakdown panel becomes visible
    And the panel shows appeal ratings for YOUNG, MID, and OLD age groups
    And each age group shows appeal for Male and Female
    And appeal ratings are displayed on the -5.0 to +5.0 scale
    And a peak appeal insight is shown

  # [automated] TC-AGEAPL-EX-001, TC-AGEAPL-EX-002, TC-AGEAPL-RG-003.
  # Bans are not in the script, so they are never listed as roles. Confirmed by
  # the owner 2026-09-25 after Starting Tags bans filled the panel in production.
  Scenario: Age & Gender Appeal lists only locked roles, never banned ones
    Given the Starting Tags bans are applied
    And no role is locked
    Then the Age & Gender Appeal panel lists no roles
    When the user locks a Protagonist
    Then the panel lists exactly that Protagonist

  # [unverified] Starting Tags exclusion list baseline. 57 elements in
  # GAME_DATA.starterWhitelist, so exactly 193 of 250 are banned on first run.
  Scenario: First-run exclusion list contains exactly 193 bans
    Given a fresh browser with no saved exclusions
    When the user opens the Script Lab Excluded Elements panel
    Then the exclusion counter reads 193
    And all bans are from outside the Starting Tags whitelist

  # [unverified] The Age & Gender Appeal panel depends on locked roles to show
  # appeal ratings. If 193 bans are applied and no roles are locked, the panel
  # is empty because there are no roles to analyze.
  Scenario: Locked nothing + 193 bans renders Age panel empty
    Given the Starting Tags bans are applied
    And no role is locked
    Then the Age & Gender Appeal panel appears but lists no roles

  # [unverified] Banning a locked element should remove it from the script
  # immediately, reflecting the exclusion.
  Scenario: Banning a locked role clears it from the script
    Given the user has locked a Protagonist
    When the user bans that same Protagonist
    Then the locked Protagonist is removed
    And the selection field is empty

  # [unverified] The Graves evaluator refuses scripts with fewer than 5 or more
  # than 10 story elements. Genre and Setting do not count (they are context).
  # A script with 4 elements + Genre + Setting is refused for 4, not 6.
  Scenario: Script with 4 story elements is refused with element count
    Given the user is on the Evaluate tab
    When the user selects Genre, Setting, and 4 story elements
    And submits for evaluation
    Then the evaluator refuses it
    And the message names the exact count: "You selected 4"

  # [unverified] The Max Element Pool is set to 5 by default, and a script with
  # exactly 5 story elements is valid for evaluation (plus any Genre and Setting).
  Scenario: 10 story elements within 5-element pool is valid
    Given the Max Element Pool is set to 10
    And the user is on the Evaluate tab
    When the user selects 10 story elements (Genre and Setting not counted)
    And submits for evaluation
    Then the evaluation succeeds

  # [unverified] Swap Suggestions show one row per selected element, narrowed to
  # elements that fit within the Max Element Pool budget, with non-selected
  # elements of the same category offered as swaps.
  Scenario: Swap suggestions respect the Max Element Pool budget
    Given the Max Element Pool is set to 5
    And the user has evaluated a valid script
    When the user generates Swap Suggestions
    Then each suggestion respects the element budget
    And the list is limited to category-matching candidates

  # [unverified] Pairwise analysis shows element pairs at budget, and Add buttons
  # for free additions are disabled when the script would exceed the budget.
  Scenario: Pairwise analysis disables Add when budget is full
    Given a script at the Max Element Pool limit
    When the user opens Pairwise Analysis
    Then suggested pairs stay within budget
    And Add buttons for story-element candidates are disabled

  # [unverified] Targeted Ads search should exclude banned elements from results,
  # respecting the Starting Tags profile when active.
  Scenario: Starting Tags + audience search excludes bans from results
    Given the Starting Tags profile is active
    When the user searches Targeted Ads by audience
    Then no banned elements appear in the results

  # [unverified] Build for Target uses the Max Element Pool to constrain
  # suggestions. At pool 5, generated scripts should carry no more than 5 story
  # elements (Genre and Setting outside the budget).
  Scenario: Build for Target at pool 5 respects element width
    Given the Max Element Pool is set to 5
    When the user generates results in Build for Target
    Then each result uses at most 5 story elements
    And Genre and Setting count separately

  # [unverified] Commercial score affects distribution. Week 3 shows a particular
  # decay curve when Behemoth toggle is on; exact threshold confirmed in GAME_RULES.
  Scenario: Week 3 decay applies correctly at commercial 9.0 with Behemoth
    Given Behemoth toggle is on
    And commercial score is set to 9.0
    When the user generates distribution
    Then Week 3 shows the expected decay from Week 1

  # [unverified] Week 8 shows a +25% boost when Behemoth is off and commercial
  # score is within range (e.g., 5.0).
  Scenario: Week 8 shows +25% boost without Behemoth at commercial 5.0
    Given Behemoth toggle is off
    And commercial score is set to 5.0
    When the user generates distribution
    Then Week 8 value is +25% above Week 1

  # [unverified] Genre is uncapped in row count but each row must represent at
  # least 5% of appeal. With 11 rows, percentages must sum to 100% and each
  # row shows >= 5%.
  Scenario: Genre supports 11 rows totaling 100%, each at least 5%
    When the user adds 11 Genre rows
    And distributes appeal across all rows
    Then the sum is exactly 100%
    And no row shows less than 5%

  # [unverified] The Max Element Pool slider and input field stay in sync. At
  # slider value 11, the input should read 11, and vice versa.
  Scenario: Pool slider and input field match at value 11
    When the user sets the Max Element Pool slider to 11
    Then the input field reads 11
    When the user sets the input field to 7
    Then the slider moves to 7

  # [unverified] After restoring a saved exclusion list that contains a Setting,
  # that Setting should be immediately unavailable in Graves (disabled), without
  # requiring a page reload.
  Scenario: Banned Setting is disabled in Graves immediately after restore
    Given the user has saved an exclusion with a banned Setting
    When the user opens Graves
    Then that Setting is disabled in the dropdown
    And the exclusion notice explains why

  # [unverified] Best Matches should exclude banned elements from suggestions,
  # even if they were previously used in a script. After evaluation, the Best
  # Matches list filters out any element in the exclusion list.
  Scenario: Evaluated script Best Matches exclude banned elements
    Given the user has evaluated a script with locked elements
    And one locked element is then banned
    When the user regenerates Best Matches
    Then that banned element is not offered as a suggestion

  # [automated] TC01-000032. Best Artistic uses the shared generation engine but
  # ranks by raw artistic bonus and shows commercial bonus as context.
  Scenario: Generating best artistic scripts ranks artistic bonus first
    When the user generates best artistic scripts
    Then three generated script cards are shown
    And the first card shows Artistic Bonus as the primary badge
    And the card also shows Commercial Bonus and Synergy context
    And Show More reveals additional generated scripts

  # [automated] TC01-000033. Best Commercial mirrors Best Artistic with the
  # primary sort flipped to raw commercial bonus.
  Scenario: Generating best commercial scripts ranks commercial bonus first
    When the user generates best commercial scripts
    Then three generated script cards are shown
    And the first card shows Commercial Bonus as the primary badge
    And the card also shows Artistic Bonus and Synergy context

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
  # using red/negative styling for weak fits. Owner ruling 2026-09-25: the
  # selected dropdown is never neon green (#4cd964); that styling was removed.
  Scenario: Selected tags and strong-fit options get positive visual feedback
    When the user locks a Protagonist
    Then the selected dropdown is marked as selected
    And the selected dropdown is not neon green
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
