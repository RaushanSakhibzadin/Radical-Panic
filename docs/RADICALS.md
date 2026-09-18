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

The radicals whose meaning drives the 2.5× counter rules keep their meaning
colour (water blue, fire orange, tree green, and so on) in `RADICAL_COLORS`.
The rest get a stable hue spaced by the golden angle, so any two radicals on
screen are visually distinct and the same radical is always the same colour.

## Roster rule

Radicals are concrete things: nature, animals, tools, body parts. Anything with
a political, national, military or religious reading stays out, and where a
radical's usual English gloss is loaded we pick a plainer accurate one (see
`171` above).

Some names in the generated set are worth a second look if you want to tighten
this further — 33 `scholar`, 131 `minister`, 155 `red`, 201 `yellow`,
203 `black`, 106 `white`, 44 `corpse`, 78 `death`, 143 `blood`. They are all
accurate glosses of concrete radicals, but they are the borderline cases.
