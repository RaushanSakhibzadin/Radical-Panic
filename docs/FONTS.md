# Fonts

DM Mono and Fredoka are served from this repository, not from Google.

The page used to link `fonts.googleapis.com`, which meant every player's IP
address and User-Agent reached Google on every load, the game did not work
offline, and — for a project whose selling point is that nothing leaves your
browser — the privacy claim was not actually true. In the EU, embedding Google
Fonts this way has been found to breach the GDPR.

`fonts.css` now declares the faces against local `.woff2` files. The game makes
no third-party requests at all.

## What is here

| File | |
|---|---|
| `fonts/dm-mono-{400,500}-{latin,latin-ext}.woff2` | DM Mono, the monospace labels |
| `fonts/fredoka-500-{latin,latin-ext}.woff2` | Fredoka; it is a variable font, so one file covers weights 500–700 |
| `fonts/OFL-DM-Mono.txt`, `fonts/OFL-Fredoka.txt` | the licences |

Both families are under the SIL Open Font License 1.1, which permits
redistribution like this. Total weight is about 116 KB.

Only the `latin` and `latin-ext` subsets are included. The game's interface is
English; the Chinese radicals are drawn with the system CJK stack (`HAN_FONT` in
`game.js`), not with a bundled font, because a CJK webfont would be megabytes.

## Updating

Fetch the stylesheet Google generates for the two families, then download each
`latin`/`latin-ext` `woff2` it references and rewrite the `src:` URLs to point
at `fonts/`. Drop any face whose file is byte-identical to one already saved —
Fredoka's three weights are the same variable file.
