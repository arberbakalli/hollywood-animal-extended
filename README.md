# Hollywood Animal Extended

<img width="500" height="500" alt="Hollywood Animal Calculator" src="https://github.com/user-attachments/assets/b37c7be5-765b-414a-be0e-97bdeffecf09" />

A web tool for [Hollywood Animal](https://store.steampowered.com/) players: generate scripts, check
story-element synergy, and find the best advertisers for a movie.

An extended continuation of [CallOn84's original calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator),
kept deliberately simple — four files, no build step, no framework.

## What's different here

**Fixes**

- Excluded Elements now actually work. 194 banned tags were sitting in the dropdowns while zero
  reached the generator, so bans were silently ignored.
- The score help text and the generator agreed to disagree — one promised 4/6/8/9/10 story elements
  for target scores 6–10, the other used 5/7/8/9/9. Both now read from one function.
- Switching to another tab mid-load no longer leaves the Starting Tags exclusion list permanently
  empty. Chrome suspends idle callbacks in background tabs; the load no longer depends on one.
- Switching profiles rebuilds the exclusion list instead of reusing a stale one.
- The score requirement shows the real number on page load rather than a placeholder.

**Additions**

- Per-category search across every element dropdown, with matching rows filtered as you type
- Search feedback: the box glows green on a match, red on none
- Keyboard shortcuts — `Esc` clears a search, `Enter` jumps to the first match
- Alphabetically sorted categories, with new rows added at the top
- Debounced filtering so long lists stay responsive

**Under the hood**

- A golden-master test suite over the scoring core, so changes to score maths show up as a failing
  snapshot instead of a silent drift
- 598 lines of unreachable class scaffolding removed — see [docs/DECISIONS.md](docs/DECISIONS.md)

## Running it

It is a static site. Open `index.html` through any local web server — the JSON fixtures are fetched
at runtime, so `file://` will not work.

```bash
npx http-server -c-1
```

## Development

```bash
npm install
npm test        # Jest, 18 tests across 2 suites
```

`npm test` is the entry point, not `npx jest` — the suite is native ESM and needs a Node flag that no
config file can supply. See [AGENTS.md](AGENTS.md).

Before changing anything, read [AGENTS.md](AGENTS.md) for the architectural constraints and
[docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for what is already known to be broken.

## Credits

This project stands on other people's work.

- **[CallOn84/Hollywood-Animal-Calculator](https://github.com/CallOn84/Hollywood-Animal-Calculator)** —
  the original tool, and the entire foundation this builds on. The generator, synergy matrix, and
  advertiser logic are theirs. Their commit history is preserved in this repository.
- **[userbig/hollywood-animal-planner](https://github.com/userbig/hollywood-animal-planner)** — an
  independent Vue rebuild of the same tool. The collapsible card-header pattern for Excluded
  Elements, showing a live count in a clickable title, is borrowed from their interface.
- **aalbertinib's Hollywood Animal Master** — the maths behind the Distribution Calculator.

Game data and localisation files originate from Hollywood Animal itself and belong to its developers.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

Inherited from the original project and unchanged. GPL-3.0 is copyleft: anything derived from this
stays GPL-3.0, and source must travel with any distribution. That is the original author's choice,
carried forward deliberately.
