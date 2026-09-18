# Roster rules

Two rules govern `src/data.js`. They are not style preferences; the game stops
working properly if either is broken.

## 1. Defender emoji must have no eyes of their own

Every face in Radical Panic is drawn by `src/faces.js` at runtime from the
individual's genome. The glyph is only a body.

An emoji that already ships with a vendor-drawn face — 🐶 🧸 🌝 🎃 🧿 😀 🐸 🦊 —
would get a second pair of eyes painted on top of the first, and worse, its
expression would be fixed by the font instead of inherited from its parents.
That breaks the central mechanic, not just the look.

**Safe categories:** fruit, vegetables, prepared food, drinks, flowers, trees,
leaves, rocks, weather, water, fire, sky, balls, and plain objects.

**Check before adding:** render the emoji large in Apple Color Emoji, Segoe UI
Emoji *and* Noto Color Emoji. Some glyphs have a face on one vendor only
(🌰 and 🍄 are fine everywhere; ⛄ and 🌞 are not). If any major vendor draws a
face, eyes, or a mouth on it, it does not go in.

Borderline cases that are **out**: anything with a visible animal head, any
plush or doll, the moon and sun faces, 🧿 (it is literally an eye), 🎃, ☃️/⛄,
🫀 and other organs with detail that reads as a face.

## 2. Nothing with a political reading

This is meant to be playable and shareable by anyone, anywhere.

**Out, no exceptions:** national and regional flags, maps of territories,
national and party emblems, political figures, military insignia and ranks,
religious symbols, protest symbols, and hand gestures (which carry very
different meanings in different places).

For **radicals**, stay inside the Kangxi set and keep to concrete things:
nature (火 水 木 山 雨 風), animals (馬 鳥 魚 虫 龍 龜), tools (刀 弓 矢 斤 網 舟),
body parts (手 足 耳 目 骨 齒), materials (金 石 竹 米 糸).

Radicals deliberately avoided: characters naming states, parties, peoples,
rulers or armies, and colour radicals whose everyday readings carry loaded
associations. When a radical is arguably fine but arguably not, leave it out —
there are 214 of them and we do not need the marginal one.

## 3. Practical notes

- Keep the glyph in the roster as a single code point where possible. Some
  emoji need the VS16 selector (`☁️`, `❄️`, `⚡`) to render in colour; those are
  fine, they are already in the list.
- `bias` in an emoji entry nudges only the **founder's** combat genes. It is a
  starting point, not a cap — selection can walk any lineage anywhere inside
  the limits in `TRAITS`.
- New radicals need `element`, `tier` (1 trash / 2 mid / 3 heavy) and `mass`
  (slows and fattens them). Optional flags: `swift`, `pierce`, `armour`,
  `chill`, `burn`, `terrify`.
- After adding to either roster, run a few thousand simulated generations (see
  the snippet in the README) to make sure you have not made one species
  dominate every draft.
