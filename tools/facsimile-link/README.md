# Facsimile links

A tool to link every note and rest of the cancionero's MEI files to its position
on the facsimile images. The links are stored in the MEI itself (`<facsimile>` +
`@facs`), which is where score-viewer will read them to highlight the manuscript
during playback and to "view in the manuscript".

## Running it

```bash
cd tools/facsimile-link
npm start                 # → http://localhost:5178   (PORT=… to change it)
```

There is nothing to install from npm: the server only uses Node (≥ 18). It needs
Python with `lxml` (the same one the repository's scripts use,
`pip install -r requirements.txt`), because saving runs
`scripts/mei_attr_order.py` and `check_mei.py`.

Verovio is loaded from its CDN. When offline, the server serves a local copy if it
finds one in `$VEROVIO_DIR`, in `tools/facsimile-link/node_modules/verovio/dist`
(`npm install verovio` in this folder) or in `web-app/node_modules/verovio/dist`.
Without Verovio the tool still works; only the reference score is missing.

The tonos, their MEI files and their images come from `tonos/tonos.json` and
`facsimil-images/`. They can be changed with `TONOS_JSON`, `TONOS_DIR`,
`IMAGES_DIR` and `STATE_DIR` (useful to test on a copy).

## Screen

- **Top, the facsimile**: the image you work on. Zoom with the mouse wheel and
  click to place the current event.
- **Bottom, the score** (Verovio, on a single system; the mdivs of a tono one after
  another), drawn as in the source so it can be compared with the image: with the
  original clefs (the `<rdg>` of `<app type="app_clefs">`) and with the tono's
  `encodedTransposition` from `tonos.json` undone (`-P4` is rendered `P4` up). The
  pitches in the status line are given the same way. The current event is in pink, linked events in blue and events that
  cannot be linked in grey. How the strip follows the current event is chosen in
  the selector next to *fit* (or with `m`), and remembered:
  - *read ahead* (default): the event sits at a quarter of the width, so the music
    to come is visible;
  - *centred*: the event is always in the middle;
  - *page turns*: the strip only moves when the event reaches the edge, then jumps
    so the event is near the left;
  - *under the facsimile*: the event sits right under its point on the image (or
    under the last placed point).
- **Header**: tono selector (with the number of events already linked, and ✎ when
  there is a draft), current image and status line (part, event, measure,
  editorial markup, link, progress of the part and of the tono).

## Keys

| Key | Action |
|---|---|
| `←` / `→` | previous / next event of the part |
| `↑` / `↓` | previous / next part, on the event that sounds at the same time |
| `n` | next unlinked event |
| click | place the current event (and advance) |
| `t` | the current event is the same figure as the previous one (again: its own figure) |
| `r` | unlink the current event |
| `z` / `x` | previous / next image of the current part |
| `Z` / `X` | previous / next image among all the tono's images |
| wheel | zoom towards the cursor |
| space, ctrl or middle button + drag | pan the image |
| `0` | fit the image to the window |
| `m` | next strip mode |
| `a` | toggle auto-advance |
| `s` or ctrl+s | save to the MEI |

Clicking on an event that is already linked moves its point (and the point of
every event sharing that figure).

## What gets linked

Images and staves are tied to a part of the organic, the `<perfRes>` of the MEI
header, by its `xml:id` (GUIDELINES §1.3, §2.3, §9.1):

- each image of `facsimileItems` names its part in `part`;
- each `<staffDef>` of the score points at its part with `@decls`.

```json
{ "name": "Tenor página 77", "file": "T/image-077.jpg", "part": "perfRes-alto" }
```

```xml
<perfRes xml:id="perfRes-alto" source="#P-Lant_PT-TT-MUS-L122">Alto</perfRes>
…
<staffDef n="3" decls="#perfRes-alto" lines="5">
```

Nothing is guessed from labels, image names or the order of the staves: an
image without `part`, or a labelled staff without `@decls`, is reported and left
out. `npm run check-parts` (or `node check-parts.mjs [--all] [tono…]`) lists
what needs fixing; `scripts/mei_perfres_decls.py` adds the ids and the `@decls`
to a MEI that lacks them.

The witness an image comes from matters only for the readings of an `<app>`
(below). It is the `@source` of its perfRes; when the part has several
witnesses, the partbook of the image folder (`S1` 4802/1, `S2` 4802/2, `T` L122,
`G` 4803) or the siglum found in the image name.

Notes and rests (`<rest>`, `<mRest>`) of the parts that have images can be
linked, except:

- material added by the editor (`<supplied>`);
- the correction or regularisation in a `<choice>` that keeps the source reading
  (`<sic>`, `<orig>`): that reading is linked instead;
- readings of an `<app>` whose witness (`@source`) has no images in the tono.
  Readings whose witness does have images are only offered on those images.

Parts without images (the reconstructed Alto, for instance) are skipped when
changing part.

A note tied to the next one is a single figure in the manuscript, so when it is
placed the tie's continuation shares its point. Several measure rests that are a
single sign in the part are joined with `t`.

## What is written to the MEI

```xml
<music>
   <facsimile>
      <surface label="Tiple 1º página 8" lrx="1702" lry="2424">
         <graphic target="S1/image-008.jpg" width="1702px" height="2424px"/>
         <zone xml:id="zone-1" ulx="750" uly="1212" lrx="751" lry="1213"/>
      </surface>
   </facsimile>
   <body>
      …
      <note facs="#zone-1" dur="2" pname="c" oct="5"/>
      <note facs="#zone-1" dur="2" pname="c" oct="5"/>
```

- `graphic/@target` is the path relative to `facsimil-images/`, the same as
  `facsimileItems[].file`, and `surface/@label` is its `name`: score-viewer
  finds the surface of an image by either of them.
- Each zone is a point (1 px) in pixels of the original image, whose size is in
  `surface/@lrx`/`@lry`.
- Several events may point at the same zone.
- No `xml:id` is added: surfaces have none, zones are named `zone-<n>` (and keep
  their name from one save to the next), and an event without id is linked just
  with `@facs`. The tool finds such an event by its position among the notes and
  rests of the file, so `scripts/clean_mei_ids.py` can be run on a linked MEI.

The file is not rewritten as a whole: only the `<facsimile>` block, the `@facs`
attributes change. Before the MEI is replaced, a copy goes
through `scripts/mei_attr_order.py --update` (the pre-commit hook enforces that
order) and `check_mei.py`, which checks that the XML is well-formed and valid
against MEI 5.1. The schema is downloaded once to `.state/mei-all.rng` (or taken
from `$MEI_RNG`); if validation fails, nothing is written.

## Drafts and backups

`.state/` (ignored by git) holds:

- `<tono>.draft.json`: the unsaved work, every few seconds. Reopening the tono
  offers to restore it.
- `<tono>.prev.mei`: the version of the MEI before the last save.

If the MEI changes on disk while you work (after a `git pull`, for instance),
saving is refused and the work stays in the draft.

## Tests

```bash
npm test
```
