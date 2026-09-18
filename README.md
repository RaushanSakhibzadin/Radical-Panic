# Radical Rascals

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

Run the gameplay checks with Node.js 18 or newer:

```sh
node --test tests/game.test.cjs
```

## How it works

- Pick one of three eyeless emoji mutations; placing a friend costs one spark.
- The first recruitment starts the run. Use **Pause** whenever you need time to choose; switching tabs also stops the battle.
- Each mutation changes attack, defence, attack speed, HP, range, bounce, wobble, eye size, and eye spacing. Animated previews show the personality before recruitment.
- Defeat incoming Kangxi radical characters before they reach the garden.
- Meaning-based counters deal **2.5× damage**: water quenches fire, fire burns trees, plants absorb water, cold freezes water, and more. Each candidate shows its strong matchups; open **Meaning matters** for the complete rules. Neutral matchups deal normal damage.
- The garden has one horizontal row with four friend slots on every screen size.
- Level 1 starts with one clearly marked planting line. Every defender has eyes, a mouth and expressions that react to danger, damage and attacks; preview faces reflect their mutation traits.
- Winning a level triggers a giant, happy emoji celebration for about three seconds before the next level starts. Recruitment and losses do not trigger it. Reduced-motion mode shows a still celebration instead.
- Friends shoot across roughly 300–490 pixels, depending on their inherited range gene, so they can engage radicals well before contact.
- Radicals attack friends on contact. Defence reduces incoming damage; friends with no HP leave a free slot for another recruit. The garden holds four friends.
- Survive a wave to earn two sparks. Every seventh defeated radical also drops one.
- Selected lineages gain fitness and are more likely to return with small mutations.
- Only mutations offered alongside a deliberate pick or shuffle are counted as skipped. Skipped lineages lose a little fitness. A 23% chance of a completely new lineage keeps the population varied.
- Evolutionary memory and the best wave are saved in `localStorage`. The **Forget** button resets both.
- If browser storage is unavailable, the game keeps working with memory for the current session.

## Design boundaries

- Attackers come from the Unicode Kangxi Radicals block, with a small English meaning underneath each glyph.
- Defenders come from a curated collection of nature, food, weather, or object emoji with no built-in eyes and no intended political meaning. Emoji appearance varies by device; additions should be checked across common platforms.
- Added eyes are drawn in code; the game contains no external image assets.
- Recruitment and controls work with mouse, touch, or keyboard; combat is automatic. Reduced-motion preferences disable decorative motion in previews and the arena.

This is preference selection, not a claim that an unchosen character is objectively worse: limited sparks and the other available choices also influence a player's decisions. Small penalties and continued exploration keep favourites from completely eliminating variety.

## Contributing

Ideas, balance changes, accessibility improvements, additional neutral eyeless emoji, and new animation genes are welcome. Open an issue before making a large change so contributors can agree on its direction.

## Support

The project is MIT licensed and free to play, study, remix, and share. If you enjoy it, you can support development through the maintainer's [GitHub Sponsors page](https://github.com/sponsors/RaushanSakhibzadin).

## License

[MIT](LICENSE) © 2026 RaushanSakhibzadin
