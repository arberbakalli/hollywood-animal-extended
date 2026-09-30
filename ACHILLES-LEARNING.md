# Achilles Testing Guide — Hollywood Animal Extended

How the E2E suite is put together, and why it's shaped this way.

---

## The three layers

Achilles separates a test into three layers so that a UI change touches exactly one of them.

| Layer | Lives in | Owns | Changes when |
|---|---|---|---|
| **Business intent** | `tests/e2e/*.spec.js` | What the user does and what should happen | A requirement changes |
| **Steps API** | `@civitas-cerebrum/element-interactions` | How to click, wait, retry, log | The framework is upgraded |
| **Page repository** | `tests/data/page-repository.json` | Where each element lives in the DOM | The UI is redesigned |

A test names an element; the repository resolves it to a selector at runtime.

```js
await steps.on('generateButton', 'ScriptLab').click();
```

`generateButton` is a **name**, not a selector. Passing a selector here defeats the whole design:

```js
// wrong — reintroduces the coupling the repository exists to remove
await steps.on('#generateScriptsButton', 'ScriptLab').click();
```

---

## Files

```
playwright.config.js              serves the repo locally, one worker
tests/
├── data/page-repository.json     every selector, grouped by page
├── fixtures/base.js              baseFixture wiring
├── e2e/                          the executable tests
│   ├── script-lab.spec.js
│   └── marketing-release.spec.js
└── scenarios/                    Gherkin specs, one Feature per file
    ├── script-lab.feature
    ├── script-evaluation.feature
    ├── colman-graves.feature
    ├── marketing-release.feature
    └── build-for-target.feature
```

The `.feature` files are **documentation, not executable** — Achilles doesn't use Cucumber. They record what we intend to cover and how confident we are, and each scenario carries a status tag:

- `[automated]` — a spec asserts it
- `[verified]` — observed in the app, not yet automated
- `[unverified]` — plausible but never watched; **do not automate from it**

That last tag exists because writing tests from assumed behaviour produces a suite that documents fiction.

---

## Repository format

```json
{
  "pages": [
    {
      "name": "ScriptLab",
      "elements": [
        { "elementName": "generateButton", "selector": { "css": "#generateScriptsButton" } }
      ]
    }
  ]
}
```

PascalCase pages, camelCase elements. `css`, `xpath`, `id`, `text`, or `role` + `name` are all supported.

**Prefer stable anchors over generated ids.** Rows and cards get ids built at runtime; anchor on the container instead:

```json
{ "elementName": "lockedGenreSelect",
  "selector": { "css": "#inputs-genre-generator select.tag-selector" } }
```

---

## Running

```bash
npm run test:e2e
```

```bash
npm run test:e2e:report
```

`npm test` is the separate Jest unit suite. Jest matches `*.test.js`, Playwright matches `*.spec.js`, so they don't collide.

Playwright starts its own static server against the repo, so the suite tests **this working tree**, not the deployed GitHub Pages copy.

---

## Two things that will bite you

### 1. Wait for the app, not the page

`domcontentloaded` fires before the app has built its selectors, so a click can land before any listener is bound. Gate on something the app creates at runtime:

```js
await steps.on('supportingCharacterSelect', 'MarketingRelease').waitForState('attached');
```

Gate on the panel *your test uses*. Each context initialises separately, and `targeted` finishes last — gating on it made unrelated tests fail.

Never substitute a fixed sleep. `steps.pace()` exists for deliberate pacing, not for waiting on a condition.

### 2. External resources gate app boot

`index.html` pulls Google Fonts in `<head>`, and Chrome blocks script execution on a pending stylesheet — so app startup waits on an external CDN. The fixture blocks it:

```js
blockedOrigins: /fonts\.(googleapis|gstatic)\.com/
```

This took the suite from 251s with 2 random failures to **48s, fully green**. Worth remembering that it affects real users too, not just tests.

---

## Negative control

A green test proves nothing until you have watched it go red for the right reason. `script-lab.spec.js` carries one:

```js
await page.addStyleTag({ content: '#results-generator { display: none !important; }' });
// ...the generation assertion must now fail
```

If you add a test for something that matters, add the control that proves it bites.

---

## Useful Steps API calls

```js
await steps.navigateTo('/', { waitUntil: 'domcontentloaded' });
await steps.on('name', 'Page').click();
await steps.on('name', 'Page').first().check();
await steps.setSliderValue('slider', 'Page', 8);
await steps.selectDropdown('select', 'Page', { type: DropdownSelectType.VALUE, value: 'X' });

await steps.on('name', 'Page').verifyState('visible');   // also hidden, disabled, attached
await steps.on('name', 'Page').verifyText('exact');
await steps.on('name', 'Page').verifyTextContains('part');
await steps.on('name', 'Page').verifyCount({ greaterThan: 0 });
await steps.expect('name', 'Page').attributes.get('id').toBe('...');
await steps.expect('name', 'Page').value.toMatch(/^5(\.0)?$/);
```

There is no `.expectVisible()` or `.expectText()`. The full surface is in the package's `api-reference.md`.

---

## Checklist before adding a test

- [ ] It reflects a user goal, not an implementation detail
- [ ] Every element is named in the page repository — no selectors in the spec
- [ ] The behaviour has actually been observed, not assumed
- [ ] It fails if the feature breaks
- [ ] The scenario's status tag in `tests/scenarios/` is updated to `[automated]`
