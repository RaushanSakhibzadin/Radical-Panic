# Contributing

Thanks for being here. This is a small, dependency-free, hackable project and
pull requests are genuinely welcome.

## Before you start

- **New emoji or radicals?** Read [docs/ROSTER.md](docs/ROSTER.md) first. The
  two rules there (no eyes, nothing political) are hard requirements.
- **Touching the genetics?** `src/genetics.js` and `src/game.js` never touch the
  DOM on purpose, so you can simulate thousands of generations from node. Please
  include a before/after from such a run in your PR description when you change
  the mutation table, the reward constants or the cost formula. "It feels better"
  is hard to review; "after 4000 picks by a player who always chooses the
  bounciest card, mean `bob` went from 4.5 to 8.9" is easy.
- **Touching the faces?** Screenshots, please. Ideally the same genome before
  and after, in a couple of moods.

## Running it

No build step and no dependencies. Serve the folder statically:

```sh
python3 -m http.server 8000
```

`file://` will not work — ES modules need a real origin.

## House style

- Plain modern JavaScript, ES modules, no framework, no bundler, no TypeScript.
  Keeping this project readable by someone who has never used a build tool is a
  feature.
- Two-space indent, semicolons, single quotes.
- Comment the *why*. The code says what it does; the interesting part is always
  why a constant is that number.
- Keep simulation out of rendering and rendering out of simulation.

## Good first issues

- More eyeless emoji, or more Kangxi radicals, following `docs/ROSTER.md`.
- Mobile layout — the board scales, but the hand of cards is cramped on a phone.
- Sound, off by default.
- Accessibility: keyboard-only placement (move a cursor with the arrow keys and
  plant with Enter), and a reduced-motion mode that damps the animation genes
  without changing the genome.
- A "family tree" view of a lineage in the gene pool panel.

## Code of conduct

Be decent to each other. Harassment of any kind gets you removed from the
project. Report problems by opening an issue or contacting the maintainer.
