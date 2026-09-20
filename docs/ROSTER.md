# Roster rules

Two rules govern the defender roster in `game.js`. They are not style
preferences; the game stops working properly if either is broken.

## 1. Defender emoji must have no eyes of their own

Every face in the game is drawn by `drawEmojiFace` at runtime from the
individual's genome. The glyph is only a body.

An emoji that already ships with a vendor-drawn face — 🐶 🧸 🌝 🎃 🧿 😀 🐸 —
would get a second pair of eyes painted on top of the first, and worse, its
expression would be fixed by the font instead of inherited from its parents.
That breaks the central mechanic, not just the look.

**Check before adding:** render the emoji large in Apple Color Emoji, Segoe UI
Emoji *and* Noto Color Emoji. Some glyphs differ sharply between vendors — 🎾
was removed because Noto draws it as a racket *and* ball, which leaves the face
stranded on the ball. If any major vendor draws a face on it, it does not go in.

The face scales itself to the glyph's body (see "Fitting" below), so a small
body is fine; a *face* is not.

## 2. Nothing with a second meaning

This is meant to be playable and shareable by anyone, anywhere. An emoji is out
if a general audience would recognise a second meaning — political, national,
religious, racial, sexual or drug-related. Not obscure subculture readings: the
test is whether an ordinary player would see it.

### Removed under this rule, and why

| | |
|---|---|
| 🌈 | LGBTQ pride flag |
| 🍉 | racist stereotype in the US; also a Palestinian solidarity symbol |
| 🌻 | Ukraine solidarity symbol |
| ☔ | Hong Kong Umbrella Movement |
| ❄️ | "snowflake" as a political insult |
| 🌙 | read as an Islamic symbol |
| 🧩 | autism symbol, and actively contested by autistic people |
| 🍁 | Canada's national emblem |
| 🕯️ | vigils, mourning, religious use |
| 🥥 | 2024 US political meme |
| 🍆 🍑 🍒 🥒 🍭 🍈 | widely understood as sexual |
| 🍌 | sexual slang, and a racist taunt thrown at Black footballers |
| 🍍 | an upside-down pineapple signals swinging |
| 🌽 | "corn" for porn |
| 🍄 | psilocybin, and phallic |
| 🌿 🍃 | cannabis |

### Deliberately kept

Some emoji have a reading that is real but narrow, and removing them would
strip the roster for no gain. 🍕 (Pizzagate), 🥦 (regional cannabis slang),
🍪 🍩 🥖 🥕 (mild innuendo), 🎲 (gambling), ⭐ (appears on many flags) and
☀️ (distinct from the rising-sun flag, which is its own emoji) all stay. If you
think one of these crosses the line, open an issue rather than a silent PR —
the line is a judgement call and worth discussing.

### Radicals

Attackers come from the Kangxi set and stay on concrete things: nature,
animals, tools, body parts. See [RADICALS.md](RADICALS.md), which also lists the
two glosses overridden for the same reason.

## Fitting

`faceFit()` measures each glyph once — rendering it offscreen and reading back
how wide the opaque body is along the eye line — and scales the whole face to
that. It is why a sun's eyes sit on the disc instead of spilling onto the rays.
Nothing needs hand-tuning when you add an emoji, but do look at it: a glyph with
no solid centre (an arc, a ring) falls back to a fixed small face.

## Practical notes

- Keep the glyph to a single code point where possible. Some emoji need the
  VS16 selector (`☁️`, `🌧️`, `🌶️`) to render in colour; those are fine.
- After adding, run the tests — one of them draws every emoji in the roster in
  every mood and checks each gets eyes and a mouth.
