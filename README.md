# Radical Rascals

[![Tests](https://github.com/RaushanSakhibzadin/Radical-Panic/actions/workflows/ci.yml/badge.svg)](https://github.com/RaushanSakhibzadin/Radical-Panic/actions/workflows/ci.yml)

Chinese radicals drift down toward your garden. Plant emoji to stop them.

Every emoji you plant is an individual, not a type. How it fights, how it moves
and how it looks are inherited from the ones you picked before, with a small
mutation each time. Keep picking a lineage and it comes back stronger and more
often; ignore it and it fades. Your pool is saved in your browser, so the game
drifts toward whatever you like.

**[Play](https://raushansakhibzadin.github.io/Radical-Panic/)**

## Playing

- Recruit from the tray for one spark. A level waits until you plant something.
- Tap a planted friend to grow it — tier 2 costs 2 sparks, tier 3 costs 3.
- Five jobs, each carried by a gene so it is inherited: **Sprout** shoots,
  **Grower** makes Nectar, **Bulwark** soaks damage, **Frost** chills radicals,
  **Lobber** splashes at range.
- Matching meanings deal 2.5× damage — water quenches fire, fire burns trees.
  Open **Meaning matters** in the tray for the rest.
- Nectar banks itself. Sparks buy both recruits and upgrades, so every level is a
  choice between a wider garden and a stronger one.
- The garden is wiped between levels, so you draft a new one each time.
- 300 levels, all 214 Kangxi radicals, four scenes.

## Running it

No build step, no dependencies.

```sh
python3 -m http.server 8080     # then open localhost:8080
node --test tests/game.test.cjs # Node 20+
```

GitHub Pages publishes from the root of `main`, so a merge is a deploy.

## Notes

- The game makes no third-party requests — fonts are served from this repository.
  See [docs/FONTS.md](docs/FONTS.md).
- What may go in the rosters, and what was removed and why:
  [docs/ROSTER.md](docs/ROSTER.md) and [docs/RADICALS.md](docs/RADICALS.md).
- Mouse, touch and keyboard all work; combat is automatic. Reduced-motion
  preferences are respected.

## Contributing

Ideas, balance and accessibility work are welcome. Open an issue before a large
change.

## Licence

[MIT](LICENSE) © 2026 RaushanSakhibzadin. If you enjoy it, you can
[sponsor the project](https://github.com/sponsors/RaushanSakhibzadin).
