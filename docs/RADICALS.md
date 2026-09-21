# The radical roster

All 214 Kangxi radicals attack the garden. This note records where their names
and glyphs come from, because two details are easy to get wrong.

## Names are generated, not hand-written

`RADICAL_TABLE` in `game.js` holds one entry per radical, in Unicode order, so
radical 1 is index 0 and radical 214 is index 213. Each entry is the CJK glyph
followed by the English name.

The names come from the Unicode character database — the `KANGXI RADICAL …`
character names — so they are not somebody's guess. Regenerate the table with:

```sh
python3 - <<'PY'
import unicodedata
OVERRIDE = {9: "person", 171: "capture"}
for i in range(214):
    ch = chr(0x2F00 + i)
    name = OVERRIDE.get(i + 1, unicodedata.name(ch).replace("KANGXI RADICAL ", "").lower())
    cjk = chr(int(unicodedata.decomposition(ch).split()[1], 16))
    print(f"{cjk}{name}", end="|")
PY
```

Before this table existed, only fourteen radicals had names and the other two
hundred were labelled `RADICAL 087`, `RADICAL 112` and so on.

### The two overrides

| # | Unicode name | We use | Why |
|---|---|---|---|
| 9 | `MAN` | `person` | The name this project already used for 人, and it is what the radical means. |
| 171 | `SLAVE` | `capture` | 隶 means reach / capture / subservient. "Slave" is a loaded English word and the roster rule below says to avoid those. |

## Glyphs: draw CJK, store Kangxi

The game *stores* radicals as the U+2F00–U+2FD5 Kangxi Radicals block, because
those codepoints mean "the radical" specifically, and saved games depend on it.

It *draws* the ordinary CJK ideograph instead — 水 rather than ⽔. They are the
same radical (the Kangxi codepoints carry a compatibility mapping to them), but
the compatibility block is missing from a lot of default font stacks and renders
as tofu, while the CJK ideographs are in every CJK font. `radicalGlyph()` does
the conversion; `HAN_FONT` names the CJK families explicitly rather than relying
on `sans-serif` to resolve to something with Han coverage.

## Colours

Colour follows meaning. Every radical belongs to a family — water, fire, plant,
earth, tool, animal, body, cloth, voice, spirit, shelter, motion and so on — and
takes that family's hue, with a small per-radical shift in lightness so two in
the same family are still told apart. `RADICAL_FAMILIES` holds the hues and
`RADICAL_FAMILY` maps each radical to one, by index.

Five radicals mean a colour, and get it: 赤 red, 黃 yellow, 黑 black, 白 white,
靑 blue. 金 gold is a sixth — it heads the metal family but is drawn gold rather
than steel, because that is what it means.

This replaced a scheme where only fourteen radicals were coloured by hand and the
other two hundred got a hue from golden-angle rotation, with no reference to
meaning at all. It was not merely arbitrary: 赤 "red" came out purple, 黑 "black"
came out yellow, 白 "white" came out orange and 靑 "blue" came out orange too.

If you add or re-file a radical, keep the family honest rather than picking a
colour you like — the point is that a player can tell water from fire across the
field without reading the label.

## Roster rule

Radicals are concrete things: nature, animals, tools, body parts. Anything with
a political, national, military or religious reading stays out, and where a
radical's usual English gloss is loaded we pick a plainer accurate one (see
`171` above).

Some names in the generated set are worth a second look if you want to tighten
this further — 33 `scholar`, 131 `minister`, 155 `red`, 201 `yellow`,
203 `black`, 106 `white`, 44 `corpse`, 78 `death`, 143 `blood`. They are all
accurate glosses of concrete radicals, but they are the borderline cases.
