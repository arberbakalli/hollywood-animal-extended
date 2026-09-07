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
