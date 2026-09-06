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

## 7. Verified numbers beat inferred ones, but say which you have

Behemoth's "falls 25% more slowly" was implemented as a retention change
derived from a single factor, and shipped with the inference labelled in both
the code comment and the spec, behind an opt-in toggle. The rate lives in one
constant so a confirmed figure is a one-line change.

**The rule.** Shipping an inference is fine when the default is untouched, the
patch point is single, and the uncertainty is written down where the next
person will read it. Shipping it as though it were measured is not.
