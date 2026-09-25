# Lessons Learned

Concrete failures on this repo and what they cost. Written to stop the same
class recurring, not to catalogue every bug. Each entry names the real cause,
because the plausible one was usually wrong.

---

## 1. A module split can drop a declaration and nothing fails at load

**What broke.** Typing in any category search box did nothing. Typing "bank"
into the excluded Theme & Event list left every row visible.

**The real cause.** The monolith declared `const searchDebounceTimers = new Map()`
at line 642. The split moved its four uses into `src/selectors/searchIndex.js`
and left the declaration behind. Every keystroke threw
`ReferenceError: searchDebounceTimers is not defined` inside a delegated
`input` handler. `performSearchFilter` was untouched and worked perfectly when
called directly - which is why reading the filtering code found nothing.

**Why it hid for so long.** The error only fires inside an event handler. The
app boots clean, all 22 modules load, every other feature works, and the
console stays empty until someone types. No test covered it because the tests
assert scoring maths and DOM structure, not event wiring.

**The rule.** When moving code between files, the bindings it *reads* have to
move too, and reading the moved function is not enough to prove it. Assert at
load that shared state resolves. `tests/moduleGlobals.test.js` now evaluates
the real files in order and checks each shared binding, which would have caught
this the moment it was introduced.

**Cheap check for next time.** Extract the old file's top-level declarations
and confirm each is still declared somewhere in the new tree. Running that
found exactly one loss, which turned a vague "something feels broken" into a
one-line fix.

---

## 2. "It used to work" deserves a history search, not an argument

**What happened.** Excluded tags appeared as selectable Locked Elements. This
felt like a regression from the module split, and was reported as one three
times.

**What was actually true.** `git log -S` showed `refreshCategoryDropdowns` was
introduced by *"Add per-category deduplication and search filters"* - it was
built to grey out duplicate picks and never handled exclusions.
`getGeneratorExcludedIds` arrived later, purely for Best Matches. No version of
the app ever filtered exclusions out of those dropdowns.

**Why it felt new.** Before the Starting Tags profile existed you excluded a
handful of tags by hand, so locking an excluded one was rare. Starting Tags
excludes ~194 tags at once and turned a rare accident into the default path.

**The rule.** `git log -S "<symbol>"` over the whole history settles "was this
ever different" in seconds. Do that before defending the current code. A
feature that never existed and a feature that broke produce identical
complaints from the user's side.

---

## 3. Ruling out one cause is not the same as finding none

**The mistake.** Having verified - correctly, with evidence - that the module
split did not cause the Locked Elements behaviour, that verification was
carried into the next two reports as if it settled them. It did not. The search
failure was a genuine regression from the same split, sitting one file away.

**The rule.** Each symptom gets its own investigation. "I proved the split
didn't cause X" says nothing about Y. When someone insists something regressed,
the useful reflex is to keep looking for a mechanism, not to re-present the
earlier proof.

---

## 4. Verify that a scripted edit actually matched

**What broke.** A `node -e` script appended an export to
`HACScriptGenerator`. The replacement target did not match the file's real
whitespace, `String.replace` returned the input unchanged, the script printed
its success message, and the new button silently did nothing until a browser
call threw `removeBlockedLockedPicks is not a function`.

**The rule.** A no-op replace is indistinguishable from a successful one unless
checked. Either compare before and after and fail loudly, or use an editor that
errors when the target is absent. Never let a script report success it did not
verify.

---

## 5. A brittle test is worse than no test

**What happened.** To guard lesson 1, a regex-based static analyser was written
to find undeclared identifiers across `src/`. It flagged function parameters
(`min`, `tagRes`, `z0`) as undeclared globals and would have needed a
permanently growing allowlist.

**What replaced it.** A test that loads the real files through the existing vm
harness and asserts each shared binding resolves. Fewer lines, no heuristics,
no false positives, and it fails for exactly the reason it exists.

**The rule.** If a guard needs an allowlist to stay quiet, it will be silenced
rather than maintained. Prefer executing the real thing over parsing it.

---

## 6. Check what actually deploys before maintaining a mirror

**What happened.** `docs/` held a full copy of the app - 41 files including all
22 modules and the 2.5MB compatibility dataset - kept in step by
`tools/sync-docs.mjs` and a byte-comparison test, synced on every change for a
whole session.

**What was true.** The Pages API reported `source: { branch: "main", path: "/" }`.
Pages served the repo root. The mirror deployed nothing.

**The rule.** One API call answers where a site is served from. Make it before
building process around an assumption. Removing the mirror deleted 217,000
lines and cost nothing.

---

## 7. Distribution formulas need game-file proof, not community estimates

**What broke.** The distribution calculator shipped a Behemoth/retention model
from policy text and community-style interpretation, even though the extracted
game-file grid was simpler: commercial score only, week 1 `score * 2 * 1000`,
week 2 `score * 1 * 1000`, then `0.8` weekly decay.

**The real cause.** We treated labelled uncertainty as enough protection. It was
not. Once the modifier was in the UI and tests, the app looked authoritative
while disagreeing with the game files.

**The rule.** For formulas, game files beat community guides, screenshots, and
agent inference. If the exact game-file formula is not extracted, keep the
feature out of the source data and out of the calculator.

**Cheap check for next time.** Add a regression test with exact week values from
the extracted formula. For commercial score `5.0`, distribution demand must be
`[10000, 5000, 4000, 3200, 2560, 2048, 1638, 1310]`.

---

## 8. "Source of truth" means every consumer, not the one in front of you

**What happened.** Excluded Elements were fixed for Script Lab generation, and
later for Graves Best Matches, but Marketing & Release still ignored the same
ban list. Analyze Script could evaluate excluded tags, Build for Target could
offer excluded tags, and Targeted Ads could generate combinations containing
tags the user had already said were unavailable.

**The real cause.** The exclusion code lived in `src/generator/`, so patches kept
treating it like generator behavior even after the product had grown. The user
asked for the Excluded Elements table to be the source of truth, but the code
only wired the consumer being debugged at the time.

**The rule.** When the requirement says "source of truth," list every reader
before coding. For this app, the Excluded Elements table owns tag availability
for Script Lab, Compatibility Numbers, Colman Graves, Analyze Script, and Build
for Target. A fix that touches only one of those is incomplete even if that one
screen passes.

**Cheap check for next time.** Search for every `collectTagInputs(...)`,
`initializeSelectors(...)`, and candidate-generation path. If a context builds,
evaluates, markets, or recommends script tags, it must read the shared
availability filter or have a written reason why not.

---

## 9. Starter deck data must come from the running game

**What broke.** The Starting Tags profile omitted real starting settings:
`MODERN_AMERICAN_TOWN` and `WILD_WEST`. Wild West was especially bad because it
had appeared in prior rule notes, yet the app still treated it as unavailable.

**The real cause.** The starter deck was inferred from secondary notes and agent
memory instead of being verified in the running game. That made the exclusion
table look authoritative while silently banning cards the player actually has.

**The rule.** Starter deck changes need direct game verification or an explicit
"unverified" label. If the user boots the game and gives the deck, preserve that
list exactly and add a regression test for it. Guides can suggest strategy, but
they do not define availability.

**Current verified baseline.** Early script creation requires at least one
Genre, one Setting, and one Protagonist before choosing the remaining elements.

---

## 10. A hidden class is not proof the element is hidden

**What broke.** The Colman Graves exclusion notice carried the `hidden` class,
but the notice was still visible on the page.

**The real cause.** `.hidden { display: none; }` appeared earlier in the CSS,
while `.graves-exclusion-notice { display: flex; }` appeared later with the
same specificity. Source order won, so the more specific feature styling
overrode the generic hidden state.

**The rule.** For UI state, assert the browser result, not just the markup
intent. A class assertion would have passed here. A computed visibility check
caught the bug.

**Cheap check for next time.** When an element combines a global utility class
with component-level display rules, add a component-specific hidden selector:
`.component.hidden { display: none; }`.

---

## 11. Human-equivalent names are not code-equivalent names

**What broke.** Science-Fiction did not receive the `#404860` in-game color
because the app data uses `SCIENCE_FICTION` while the CSS and UI expectation
used a hyphenated class like `science-fiction`.

**The real cause.** The code treated display names, ids, and DOM classes as if
spaces, hyphens, and underscores were interchangeable. They are interchangeable
to a human reading "Science Fiction," but not to a selector, slug, or lookup key.

**The rule.** Every tag color or rule needs a verified mapping across actual
tag id, display name, generated DOM class, and CSS selector. Normalize through
one shared slug helper where possible, and deliberately add aliases only when
older markup or external data may still emit them.

**Cheap check for next time.** In the browser, inspect the exact option class
and computed color for the tag before calling the mapping done.

---

## 12. Tag validation must count by category, not by total count

**What broke.** Build for Target rejected scripts with "Pick 6 or fewer optional tags" even though the user selected only one tag from each category. The validation counted Genre tags alongside story element tags, enforcing a flat 6-tag ceiling instead of the correct rule: 5-10 story elements (Genre and Settings excluded).

**The real cause.** Tag input collection returns all selected tags mixed together. The validation applied a generic limit without understanding which categories don't consume the story element budget. One of each category easily exceeded 6 tags in a complete script.

**The rule.** When a product rule partitions tags by category (e.g., "Genre is always 1, Settings is always 1, story elements are 5-10"), validation must count each partition independently. A flat count hides the real constraint.

**Cheap check for next time.** Add a unit test that selects one tag from each category (if categories like Genre, Settings, Protagonist, etc. exist) and verifies the error message is about story elements, not total tags.

---

## 13. "No filter" state must produce results, not errors

**What broke.** Build for Target's "Find Top Combinations" button required the user to select at least one audience or advertiser before running. With neither selected, it threw "Please select at least one audience or advertiser." Yet the app had enough data to recommend combinations ranked by overall appeal.

**The real cause.** The validation checked for an audience/advertiser presence but did not handle the case where neither was selected. The downstream logic could work with "all agencies" (when no specific audience/advertiser narrows the list), but the gate prevented that path.

**The rule.** When a filter is optional, define what "no filter" means: show all results, rank by default metric, or disable the feature. Do not treat missing input as an error if the feature has a sensible unfiltered behavior.

**Cheap check for next time.** For each optional filter in the UI, document its three states: (1) filter applied, (2) no filter selected (unfiltered behavior), (3) no valid results after filter. Only state 3 should error.

---

## 14. Do not hide a panel while focus is still inside it

**What broke.** Switching between Compatibility Numbers, Colman Graves, Analyze
Script, and Build for Target could leave keyboard focus on a button inside the
panel being hidden. The browser then blocked `aria-hidden` because a focused
element cannot be hidden from assistive technology while it still owns focus.

**The real cause.** `switchTab(...)` updated `hidden` and `aria-hidden` before
moving focus. The visual UI changed correctly, but the accessibility tree still
had a focused descendant in the panel that was being removed.

**The rule.** Before hiding any interactive subtree, move focus to a visible
stable control outside that subtree, or blur as a fallback. Hidden tab panels
should also be marked `inert` so their controls cannot be reached while the
panel is unavailable.

**Cheap check for next time.** Add a Playwright test that clicks a control
inside the outgoing panel, switches tabs, then asserts `document.activeElement`
is not inside `.tab-content[aria-hidden="true"]` and no "Blocked aria-hidden"
console warning fired.

---

## 15. Negative-control browser tests should assert state, not force framework failures

**What broke.** A Script Lab E2E test intentionally made the results panel
invisible, expected a Playwright visibility assertion to fail, caught the
failure, and passed. The test proved the locator was real, but the caught
assertion still left Playwright trace/report cleanup in a bad state during the
full suite.

**The real cause.** A framework assertion failure is not just a boolean value.
Even when caught, it can create artifacts, pending metadata, or cleanup paths
that the rest of the run has to unwind.

**The rule.** Negative-control tests should assert the broken state directly.
If the panel is hidden, assert `hidden`. Do not deliberately trigger and catch
framework assertion failures as proof that the assertion would have failed.

**Cheap check for next time.** When a test has `try/catch` around an `expect`
or around a page-object assertion, review it as suspicious. Prefer an explicit
observable state check, or move the guard to a unit test where failure handling
is not tied to browser artifacts.

---

## 16. A lesson without an executing guard is a wish

**What broke.** On 2026-09-23 Colman Graves refused a legal nine-element script
with "Colman evaluates up to 10 story elements at once. You selected 11." Both
Graves guards counted raw tags, so Genre and Setting — context that spends no
budget — were charged against the 5-10 story-element bounds.

**Why this entry is different.** Two lessons in this very file already described
that defect, written *before* it shipped:

- **Lesson 8** — "'Source of truth' means every consumer, not the one in front
  of you. A fix that touches only one of those is incomplete even if that one
  screen passes." The rule had **five** implementations; two were corrected in
  September and three were never looked for.
- **Lesson 12** — "Tag validation must count by category, not by total count. A
  flat count hides the real constraint." This is the defect, named exactly.

Both lessons were correct. Both were ignored, because neither had anything that
could fail. Every entry here ends with "Cheap check for next time" and almost
none of those checks was ever turned into a test that runs.

**The rule.** A lesson is not learned when it is written down. It is learned
when something red-flags the next violation. When you add a lesson, add the
guard in the same change — or mark the lesson as unguarded so its status is
honest.

**Cheap check for next time.** Run prompt **P5** in `docs/AUDIT_PROMPTS.md`:
for every lesson, name the executing test that implements its check, or NONE.

---

## 17. The assumptions that keep costing us

Written after the 2026-09-23 story-element regression. Each of these felt
reasonable and each has now been paid for at least twice.

| Assumption | What is actually true |
|---|---|
| "The rule is documented, so it is enforced." | Prose does not execute. `GAME_RULES.md` was right while five implementations drifted. Only a function plus a guard test enforces anything. |
| "`[automated]` means a test asserts it." | Measured 2026-09-23: **91 of 128** `[automated]` scenarios cite no test at all. A hand-maintained marker is a claim, not a measurement. |
| "The suite is green, so the behaviour is right." | The suite was green for the entire life of this bug *and was the reason it survived* — two tests asserted the wrong answer. |
| "The agent fixed it, so the class is closed." | An LLM fixes the instance it is pointed at and reports success. It will not volunteer the other four copies unless asked to enumerate them. |
| "A test named X tests X." | Vacuous tests pass without exercising anything. Three "max element pool" tests passed with the defect present. Prove teeth by reintroducing the defect. |
| "More tests means more coverage." | Test counts moved 272 → 277 → 283 in one session because a second agent was committing into the same working tree. Counts measure activity, not coverage. |
| "The doc says where the rule is enforced." | That pointer is hand-written and goes stale silently. `GAME_RULES.md` named two modules; neither was the one with the bug, so the audit walked past it. |
| "If it were broken, someone would have noticed." | This shipped to a real user who could not generate a script, and was reported by a third party before any test, marker, or doc flagged it. |

**The rule.** Trust a claim in proportion to what would fail if it were false.
A document fails nothing. A marker fails nothing. A green suite fails nothing
unless a test in it can go red for the right reason.

**Cheap check for next time.** The standing clause at the end of
`docs/AUDIT_PROMPTS.md` — append it to every bug report so the enumeration
happens before the fix is called done.

---

## 18. A test written from an agent's guess becomes the spec

**What broke.** Neon green (`#4cd964`) on every selected dropdown kept coming
back after the owner removed it.

**The real cause.** Not a stray CSS rule. A chain:

1. `.arber/FEATURE_EXPANSION_PROMPT_SPEC.md` asked for "green/success
   treatment" on selected tags. It named no colour.
2. `d94da15` (2026-09-24) chose `--success: #4cd964` and wrote TC01-000031 to
   assert exactly `rgb(76, 217, 100)`. The spec also said "add Playwright
   coverage so this visual behaviour stays intentional", so the guess was locked.
3. From then on, section 1 of `CLAUDE.md` treated that guess as the owner's
   intent: code changes to satisfy tests, never the reverse. When the colour
   drifted, `35b1a47` set it back to exactly the pinned value, in a commit
   titled "Fix exclusion persistence". The same commit also resized the Graves
   portrait and rewrote the strong-fit hints, none of it in the message.
4. `d075ae9` removed the CSS but not the test, so main went red. Nobody ran the
   full suite after that commit.

**The rule.** An exact visual value (a colour, a size) is pinned only when the
owner specified it. An agent's own choice of shade is asserted as behaviour
(the selected class is present), not as a value. One concern per commit, and
the message names every file's change.

**Guard.** TC01-000031 now asserts the selected dropdown is *not*
`rgb(76, 217, 100)`, colour and border. Proven: it goes red when the neon is
injected with `E2E_MUTATION_CSS`. The spec file carries the ruling.

---

## 19. The suite ran in a state no player is in

**What broke.** On 2026-09-25 Age & Gender Appeal listed 16 characters in
production with nothing locked. They were Starting Tags *bans*:
`getSelectedRoles` read the excluded list as if it were the script.

**Why the suite missed it.** `tests/fixtures/base.js` marks Starting Tags as
already seeded, so every spec starts with **zero** bans. A real first visit has
**193**. TC-AGEAPL-RG-003 went further and asserted that a banned protagonist
*appears* in the panel: the bug, pinned as a feature.

**The rule.** Bans are not script content. Any feature that reads "selected"
elements reads Locked Elements (the `generator` context) only. Any feature that
reads a selector list needs one spec that clicks Apply Starting Tags first.

**Guard.** `tests/e2e/age-gender-appeal-exclusions.spec.js` (EX-001, EX-002),
plus rewritten RG-003/RG-004. All four go red with the defect restored. The
general rule (a first-run spec for every such panel) is **unguarded**.

---

## 20. Deleting a feature without its test leaves main red

**What broke.** `4d4d08d`/`637fb0a` deleted the Agency Compatibility Matrix and
left TC04-000031 asserting it. The session reported "205/205 E2E", a number
measured *before* those commits.

**The rule.** A pass count describes the commit it was measured on. Re-run
both suites after the last commit, and quote that run. Deleting a feature
includes its specs, its `.feature` scenario and its page-repository entries,
with the coverage-parity list in the commit message (`CLAUDE.md` section 1).

**Guard.** None executes. This one depends on the agent running the suites.
