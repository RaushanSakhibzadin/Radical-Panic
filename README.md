# Radical Rascals

[![Tests](https://github.com/RaushanSakhibzadin/Radical-Panic/actions/workflows/ci.yml/badge.svg)](https://github.com/RaushanSakhibzadin/Radical-Panic/actions/workflows/ci.yml)

A tiny, open-source evolutionary defence game. Mischievous Chinese radicals drift toward your garden; you defend it by choosing ordinary eyeless emoji and giving each one a pair of expressive, animated eyes.

Every choice matters. A selected mutation becomes more likely to parent future choices, while skipped lineages become less likely. The resulting evolutionary memory is stored only in the player's browser.

**[Play Radical Rascals](https://raushansakhibzadin.github.io/Radical-Panic/)**

GitHub Pages publishes the static game from the root of `main`. Pushing changes to that branch updates the live game; `.nojekyll` keeps publication free of Jekyll processing.

## Play locally

No build step or dependencies are required.

```sh
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

Run the gameplay checks with Node.js 20 or newer (CI runs them on 20 and 22 for
every push and pull request):

```sh
node --test tests/game.test.cjs
```

## How it works

- Pick one of three eyeless emoji mutations; placing a friend costs one spark.
- The first recruitment starts the run. Use **Pause** whenever you need time to choose; switching tabs also stops the battle.
- Each mutation changes attack, defence, attack speed, HP, range, bounce, wobble, eye size, and eye spacing. The animated preview in the tray is painted by the same routine that paints the arena, from the same genome, so the face you choose is exactly the face you get.
- Defeat incoming Kangxi radical characters before they reach the garden. All 214 of them attack, each labelled with its English name, and each drawn in a colour of its own — see [docs/RADICALS.md](docs/RADICALS.md).
- Meaning-based counters deal **2.5× damage**: water quenches fire, fire burns trees, plants absorb water, cold freezes water, and more. Each candidate shows its strong matchups; open **Meaning matters** for the complete rules. Neutral matchups deal normal damage.
- The garden has one horizontal row with sixteen friend slots on every screen size.
- New friends choose a random free slot, so planting grows the garden organically instead of filling from left to right.
- **Every friend has a job**, carried by a gene so it is inherited and can drift: **Sprout** shoots the nearest radical, **Grower** makes Nectar three times as fast but barely fights, **Bulwark** has triple the health and holds the line, **Frost** chills radicals so they crawl, and **Lobber** arcs over the front rank at the furthest radical and splashes. Keep planting one job and you will be offered more of it.
- **Tap a planted friend to grow it.** Tier 2 costs 2 sparks, tier 3 costs 3; growing makes it tougher and harder hitting, and mends it. Since sparks also buy new recruits, every level is a choice between a wider garden and a stronger one — and spending sparks on a lineage counts as a vote for it.
- Each planted friend grows a Nectar drop every few seconds. It hovers over the friend that made it, then sinks to the bottom centre of the field and banks itself — no chasing. Each Nectar gives one Spark, so the garden keeps growing on its own.
- Radical colours follow their meaning: water is blue, fire orange, trees green, mountains purple, earth brown, sun gold, and moon indigo.
- The campaign has 300 levels. Every enemy is one of the 214 official Kangxi Radicals; radicals without a named counter use neutral damage and receive a numbered readable label.
- Level 1 starts with one clearly marked planting line. Every defender has eyes, a mouth and expressions that react to danger, damage and attacks; preview faces reflect their mutation traits.
- Winning a level triggers a giant, happy emoji celebration for about three seconds before the next level starts. Recruitment and losses do not trigger it. Reduced-motion mode shows a still celebration instead.
- Friends shoot across roughly 300–490 pixels, depending on their inherited range gene, so they can engage radicals well before contact.
- Radicals attack friends on contact. Defence reduces incoming damage; friends with no HP leave a free slot for another recruit. The garden holds sixteen friends.
- Use **Shovel a friend** to enter removal mode, then click any planted emoji. Digging up a friend frees its slot and costs no Spark refund, so choose carefully.
- Survive a wave to earn two sparks. Every seventh defeated radical also drops one.
- Selected lineages gain fitness and are more likely to return with small mutations. The tray always offers three different emoji, so there is always a real choice to make.
- Only mutations offered alongside a deliberate pick or shuffle are counted as skipped. Skipped lineages lose a little fitness; only the candidate you actually plant is enrolled as a lineage of its own.
- Variety is protected three ways: a 23% chance of drafting an entirely new lineage, a cap of four lineages per emoji so no favourite can crowd the pool out, and a small fitness decay per cleared wave so a lineage you have stopped picking eventually yields its slot. Without those, a player with consistent taste used to end up with a single emoji forever.
- **GEN** is how many generations deep your deepest planted lineage is, not how many picks you have made.
- Evolutionary memory and the best wave are saved in `localStorage`. The **Forget** button resets both.
- If browser storage is unavailable, the game keeps working with memory for the current session.

## Design boundaries

- Attackers come from the Unicode Kangxi Radicals block, with a small English meaning underneath each glyph.
- Defenders come from a curated collection of nature, food, weather and object emoji with no built-in eyes and no second meaning — nothing political, national, religious, racial, sexual or drug-related that an ordinary player would recognise. [docs/ROSTER.md](docs/ROSTER.md) lists what was removed and why, and what was deliberately kept. Emoji appearance varies by device; additions should be checked across common platforms.
- Added eyes are drawn in code; the game contains no external image assets.
- The game makes **no third-party requests**. Fonts are served from this repository rather than from Google, so nothing about a player reaches any other host — see [docs/FONTS.md](docs/FONTS.md).
- Recruitment and controls work with mouse, touch, or keyboard; combat is automatic. Reduced-motion preferences disable decorative motion in previews and the arena.

This is preference selection, not a claim that an unchosen character is objectively worse: limited sparks and the other available choices also influence a player's decisions. Small penalties and continued exploration keep favourites from completely eliminating variety.

## Contributing

Ideas, balance changes, accessibility improvements, additional neutral eyeless emoji, and new animation genes are welcome. Open an issue before making a large change so contributors can agree on its direction.

## Support

The project is MIT licensed and free to play, study, remix, and share. If you enjoy it, you can support development through the maintainer's [GitHub Sponsors page](https://github.com/sponsors/RaushanSakhibzadin).

## License

[MIT](LICENSE) © 2026 RaushanSakhibzadin
