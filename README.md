<div align="center">

# 偏旁大恐慌 · Radical Panic

**Chinese radicals are attacking a garden of eyeless emoji.
Every emoji you plant is a unique individual with a mutated genome —
and every time you pick one, you are breeding the game.**

[Play it](https://raushansakhibzadin.github.io/Radical-Panic/) ·
[How it works](#natural-selection-is-the-game) ·
[Contributing](CONTRIBUTING.md) ·
MIT licensed, donation funded

</div>

---

## The idea

Kangxi radicals — 火 水 刀 鬼 龍 齒 — come marching across the field toward your
rice bowls. You defend with fruit, vegetables, weather and small objects.

Two rules shape everything:

**No emoji in this game has eyes of its own.** Not one. Every face you see —
the eyes, the pupils, the eyebrows, the mouth, the blush, the panic sweat — is
drawn in code at runtime, from that individual's genome. So expression is a
heritable trait. Nobody had to draw a single sprite.

**Every card is an individual, not a type.** 🍓 is not a tower with fixed
stats. Each 🍓 you are offered is some *particular* strawberry, the child of a
strawberry you liked earlier, with a small random mutation in all 22 of its
genes.

## Natural selection is the game

A genome carries three kinds of gene, all mutating together:

| | genes |
|---|---|
| **combat** | hp, attack, defence, fire rate, range |
| **motion** | bounce height, bounce speed, sway, squash & stretch, lean, scale |
| **face** | eye spacing, eye size, eye height, pupil size, brow angle, brow height, brow weight, mouth width, mouth height, blink rate, head tilt, squint |

And you are the selection pressure:

- **Plant a card** → that lineage's fitness goes **up**. It gets drafted more
  often, and its mutations become the baseline that future children mutate
  *from*.
- **Compost a card** (🗑 or `X`) → fitness goes **down**. The lineage fades out
  of the pool.
- **Leave a card unplayed for a whole wave** → a smaller version of the same
  "no".
- **Every wave, all fitness decays a little.** Yesterday's favourite has to keep
  earning its place, so the pool never freezes.

There is one secondary pressure: an individual that actually killed things
earns a little fitness at the end of a wave, weighted at 35% of a player pick.
It is a single constant — `FIELD_CREDIT` in [`src/genetics.js`](src/genetics.js)
— set it to `0` if you want selection to be purely a matter of your taste.

The consequence is the point: if you keep planting the ones with enormous round
eyes that bounce, then in an hour your whole roster has enormous round eyes and
bounces, and it stays that way, because the gene pool is saved in your browser.
It is *your* game after that. You can export the pool as JSON and trade it.

The **Gene pool** panel on the right shows how far your roster has drifted from
a fresh random genome, which species you favour, and your strongest lineages.

## Playing

| | |
|---|---|
| pick a card | click it, or `1`–`4` |
| plant it | click a square on the field (costs 氣) |
| compost it | the 🗑 on the card, or `X` |
| start / skip the breather | `Space` |
| restart | `R` |

氣 regenerates on its own — there is no sun-clicking chore — and every radical
you fell pays a bounty. Lose three bowls 🥣 and the wave count stops.

A planted emoji's cost is **derived from its genome**, so a lineage you breed
into a monster also breeds itself expensive. That is the brake that stops
selection from running away.

Defenders have no element in the roster; the game derives one from whichever
gene dominates, so a lineage bred for raw attack literally starts throwing fire
at the 金 radicals.

## Running it

No build step, no dependencies, no bundler. It is ES modules and a canvas.

```sh
git clone https://github.com/RaushanSakhibzadin/Radical-Panic
cd Radical-Panic
python3 -m http.server 8000      # any static server; file:// won't work for modules
# open http://localhost:8000
```

```
index.html        page, styles, help sheet
src/data.js       the two rosters — read docs/ROSTER.md before touching
src/genetics.js   genome, mutation, gene pool, selection      ← the heart
src/faces.js      procedural eyes/brows/mouth from a genome   ← the art
src/game.js       simulation: waves, combat, planting
src/render.js     canvas drawing
src/ui.js         hand of cards, gene pool panel
src/storage.js    localStorage + export/import
src/rng.js        gaussian, weighted choice
```

`genetics.js` and `game.js` deliberately never touch the DOM, so you can run
thousands of simulated generations from node to check that a change to the
mutation table does what you think:

```sh
node --input-type=module -e "
import('./src/genetics.js').then(g => {
  const pool = g.emptyPool();
  for (let i = 0; i < 4000; i++) {
    const cards = [0,1,2,3].map(() => g.draft(pool));
    cards.sort((a,b) => b.genome.bob - a.genome.bob);   // a player who likes bouncy
    g.reward(pool, cards[0]);
    cards.slice(1).forEach(c => g.punish(pool, c, -0.2));
    if (i % 8 === 0) g.decay(pool);
  }
  console.log(g.topLineages(pool, 5).map(l => l.genome.bob.toFixed(2)));
});"
```

## Privacy

Everything is local. No server, no account, no analytics, no network requests
at all. Your gene pool lives in your own browser's `localStorage` and goes
nowhere unless you export it yourself.

## Contributing

New eyeless emoji, new radicals, better mutation tables and better faces are all
very welcome. Two hard rules, both explained in [docs/ROSTER.md](docs/ROSTER.md):

1. **Emoji must have no eyes of their own.** Anything with a vendor-drawn face
   ends up with four eyes and cannot inherit an expression.
2. **Nothing with a political reading.** No flags, no national or party symbols,
   no religious symbols, no military insignia, no gestures. Radicals stay on
   concrete things: nature, animals, tools, body parts.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Donations

This is free software and it always will be: MIT, no ads, no tracking, no
"premium radicals". If it made you laugh, you can fund it through the Sponsor
button on the repository — see [.github/FUNDING.yml](.github/FUNDING.yml).

## Licence

[MIT](LICENSE). Emoji are rendered with whatever font your system provides and
are not redistributed here.
