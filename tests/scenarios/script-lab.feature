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

  # [automated] TC20-000006, tests/e2e/product-hardening.spec.js.
  Scenario: A first visit excludes exactly the unavailable starting elements
    Given a fresh browser with no saved exclusions
    When the player opens Script Lab
    Then the exclusion counter reads 193
    And the excluded elements are exactly those outside the 57-element starting deck

  # [automated] TC22-000006, tests/e2e/hardening-boundaries.spec.js.
  Scenario: Starting exclusions alone leave Age and Gender Appeal empty
    Given no role is locked
    When the player applies Starting Tags
    Then the exclusion counter reads 193
    And Age and Gender Appeal shows its empty state with no role rows

  # [automated] TC20-000007, tests/e2e/product-hardening.spec.js.
  Scenario: Banning a locked protagonist clears its selection and appeal row
    Given Cowboy is locked and appears in Age and Gender Appeal
    When the player excludes Cowboy
    Then the locked Protagonist selection is empty
    And Age and Gender Appeal has no role rows
    And feedback names Cowboy

  # [automated] TC20-000008 (count 4), tests/e2e/product-hardening.spec.js.
  Scenario: Evaluation refuses four story elements with the correct count
    Given Colman Graves is open with Genre, Setting and Protagonist selected
    And the script contains four story elements
    When the player evaluates the script
    Then feedback includes "You selected 4"
    And evaluation results stay hidden

  # [automated] TC20-000008 (count 10), tests/e2e/product-hardening.spec.js.
  Scenario: Ten story elements can be evaluated while the generation pool is five
    Given Max Element Pool is five
    And Colman Graves is open with Genre, Setting and ten story elements including Protagonist selected
    When the player evaluates the script
    Then evaluation results appear
    And the score-cap description counts ten story elements
    And the results contain neither NaN nor Infinity

  # [automated] TC20-000009, tests/e2e/product-hardening.spec.js.
  Scenario: A full story pool still permits a replacement
    Given a Colman Graves script fills the five-element story pool
    When the player opens Swap Suggestions without a minimum-fit restriction
    Then a replacement can be selected
    When the player applies that replacement
    Then exactly one selected element changes
    And the total number of selected elements stays unchanged

  # [automated] TC20-000009, tests/e2e/product-hardening.spec.js.
  Scenario: Pairwise remains informative when no new story element fits
    Given a Colman Graves script fills the five-element story pool
    When the player opens Pairwise and filters to Theme and Event
    Then suggestions remain visible
    And their Add controls are disabled

  # [automated] TC20-000011, tests/e2e/product-hardening.spec.js.
  Scenario: Starting availability constrains audience-targeted combinations
    Given Starting Tags is applied and no Build for Target elements are locked
    And an audience is selected
    When the player finds top combinations
    Then combinations are shown
    And every element in every displayed combination belongs to the starting deck

  # [automated] TC20-000011 (pool 5), tests/e2e/product-hardening.spec.js.
  Scenario: Build for Target fills five story slots plus context
    Given Starting Tags is applied and no Build for Target elements are locked
    And Max Element Pool is five
    And an audience is selected
    When the player finds top combinations
    Then each combination has exactly five story elements
    And each contains one Genre and one Setting outside the story budget

  # [automated] TC22-000001, tests/e2e/hardening-boundaries.spec.js.
  # Owner ruling 2026-10-01: the decay gate opens from 9 and above.
  Scenario: Commercial nine gets the Behemoth boost and the slower decay
    Given commercial score is 9.0 in Marketing and Release
    When the player enables Behemoth
    Then week two demand is 11250 screenings
    And week three demand is 9563 screenings

  # [automated] TC22-000002, tests/e2e/hardening-boundaries.spec.js.
  Scenario: Behemoth increases week-eight demand only while enabled
    Given commercial score is 5.0 and Behemoth is off in Marketing and Release
    When the player inspects week-eight demand
    Then week-eight demand is 1310 screenings
    When the player enables Behemoth
    Then week-eight demand is 1638 screenings
    When the player disables Behemoth
    Then week-eight demand returns to 1310 screenings

  # [automated] TC22-000003, tests/e2e/hardening-boundaries.spec.js.
  # The 5% step is the existing app contract; GAME_RULES section 6 records its provenance.
  Scenario: Eleven genres remain a balanced allocation
    Given all eleven Genres are selected in Colman Graves
    When the player requests a 100 percent share for the first Genre
    Then its share is limited to 50 percent
    And every other Genre retains at least 5 percent
    And all shares are multiples of 5 and total 100 percent
    And all eleven Genres remain selected

  # [automated] TC22-000004, tests/e2e/hardening-boundaries.spec.js.
  Scenario: An out-of-range pool value clamps and remains synchronized
    When the player enters 11 in Max Element Pool and leaves the field
    Then its number input and slider both read 10
    When the player enters 7 and leaves the field
    Then its number input and slider both read 7

  # [automated] TC22-000005, tests/e2e/hardening-boundaries.spec.js.
  Scenario: A restored Setting ban is already effective when Graves opens
    Given Wild West is saved as the only exclusion
    When the player reloads the app and opens Colman Graves
    Then Wild West is disabled in the Setting dropdown
    And the visible exclusion notice reports one excluded element

  # [automated] TC20-000010, tests/e2e/product-hardening.spec.js.
  Scenario: Banning a submitted element removes it from future suggestions
    Given an evaluated Colman Graves script contains Femme Fatale
    When the player excludes Femme Fatale in Script Lab
    Then Femme Fatale is no longer selected in Colman Graves
    When the player generates Best Matches with no minimum-fit restriction
    Then Best Additions, Swap Suggestions and Pairwise each show suggestions
    And none of their displayed candidates is Femme Fatale

  # [automated] TC01-000036. Best Artistic uses the shared generation engine but
  # ranks by raw artistic bonus and shows commercial bonus as context.
  Scenario: Generating best artistic scripts ranks artistic bonus first
    When the user generates best artistic scripts
    Then three generated script cards are shown
    And the first card shows Artistic Bonus as the primary badge
    And the card also shows Commercial Bonus and Synergy context
    And Show More reveals additional generated scripts

  # [automated] TC01-000037. Best Commercial mirrors Best Artistic with the
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

  # [automated] TC09-000023. A player who saved bans before the seeded marker
  # existed has a stored list and no marker. That visit is not a first run.
  Scenario: A saved ban list without the seeded marker is kept
    Given the browser holds a saved list of 2 bans and no Starting Tags marker
    When the user opens the calculator
    Then the excluded counter reads 2
    And Starting Tags are not applied on this visit or the next

  # [automated] TC09-000024. A profile file is checked before it changes the list.
  Scenario: An invalid exclusion profile leaves the current bans intact
    Given the user has applied the Starting Tags profile
    When the user loads a profile with an empty entry, an unknown element or a wrong category
    Then a message says the profile is invalid
    And the 193 bans are unchanged in storage and on screen

  # [automated] TC09-000025.
  Scenario: A saved exclusion profile loads back after the bans are reset
    Given the user has applied the Starting Tags profile and saved it as a profile
    When the user resets the bans and loads the saved profile
    Then every ban is restored

  # [automated] TC09-000017. The Excluded Elements list has no category
  # cardinality cap. Single-select script categories may still have many banned
  # items and all of them must survive a reload.
  Scenario: Single-select category bans survive reload
    Given the Starting Tags profile has banned several Settings, Protagonists, Antagonists and Finales
    When the user reloads the calculator
    Then every ban in those categories is still present

  # [automated] TC01-000026. The ban count and the banned pick survive a round
  # trip through another tab.
  Scenario: Exclusion state stays consistent when switching tabs
    Given the user has banned Sidekick in Excluded Elements
    And the ban count reads 1
    When the user switches to the Evaluate tab
    And back to the Build tab
    Then the ban count still reads 1
    And Sidekick is still selected in Excluded Elements

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

  # [automated] TC01-000016. The hint shows the story element count the target
  # asks for, one to one from 5 to 10 (owner ruling 2026-10-01,
  # docs/GAME_RULES.md section 1).
  Scenario Outline: Target movie score shows the correct story element count
    When the user sets the target movie score to <movie_score>
    Then the required story elements hint says "~<story_elements> Story Elements"

    Examples:
      | movie_score | story_elements |
      | 5           | 5              |
      | 6           | 6              |
      | 7           | 7              |
      | 8           | 8              |
      | 9           | 9              |
      | 10          | 10             |

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

  # [automated] TC01-000040. The short id on a card comes from the file's
  # uniqueId, so it shows as text and never as markup.
  Scenario: A hostile uniqueId in a library file shows as text
    Given a library file whose script has the uniqueId "zzzzz<!--"
    When the user loads the file into the Script Library
    Then the pinned card shows "ID: zz<!--"
    And the card keeps its Evaluate with Graves and Analyze Script buttons

  # [automated] tests/e2e/script-lab.spec.js TC01-000029. Watched in the app
  # 2026-09-22 before automating: pin 1, reload, library empties to 0, load the
  # saved file, back to 1 with "Loaded 1 script."
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

  # [automated] TC01-000041, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: Max Element Pool 8 generates 8 story elements
    Given the Max Element Pool is 8
    When the user generates scripts
    Then every generated script has 8 story elements

  # [automated] TC01-000042, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: One Generate Scripts click makes a list to page through
    When the user generates scripts
    Then 5 scripts are shown
    When the user clicks Show more twice
    Then 15 scripts are shown, and the first 5 did not change

  # [automated] TC01-000043 and TC26-000003, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: Max Element Pool and Target Movie Score move together, one to one
    When the user walks either control from 5 to 10, one step at a time
    Then at every step the pool, the target and the "Requires ~N" help show the same N
    And Generate builds exactly N story elements

  # [automated] TC06-000009, tests/e2e/bug-hunt-2026-09-30.spec.js. Owner ruling 2026-09-30.
  Scenario: The Genre + button stops at 11 rows
    When the user clicks the Genre + button well past eleven rows
    Then there are 11 Genre rows and the button is disabled
    When the user removes one Genre row
    Then the button works again
