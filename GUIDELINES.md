# MEI encoding guidelines

How the *Cancionero de Miranda* is encoded.

One MEI file per tono holds almost everything the edition knows about it: the music,
the poem, the critical apparatus and the description of the sources. Other information
as audio rendition files, the encoded transposition or the facsimile images 
is part of the score-viewer configuration file: `tonos/tonos.json`.

Besides the score-viewer configuration file (tonos/tonos.json) there is a cache
file `tonos/index.json` which contains information extracted from each MEI file header
to be used in the web application list page. A pre-commit hook keeps it in sync with 
the MEI files.

Files declare MEI 5.1 (`mei-all`) and are validated against it:

```xml
<?xml-model href="https://music-encoding.org/schema/5.1/mei-all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="5.1">
```

---

## 1. The header

### 1.1 `titleStmt` and responsibilities

`<title type="main">` is the title of record. Cover, running heads, page head,
book index and `tonos/index.json` all read it; the `title` in `tonos.json` is only
used for selecting the work via the score-viewer selector (that is currently disabled).

```xml
<titleStmt>
   <title type="main">Deidad, que divina enseñas</title>
   <composer>
      <persName role="composer">Fray Felipe de la Madre de Dios</persName>
   </composer>
   <respStmt>
      <persName xml:id="OMA" role="transcriber">Omar Morales Abril</persName>
      <persName role="reconstruction">Omar Morales Abril</persName>
      <persName xml:id="FHH" role="encoder">Fernando Herrera de las Heras</persName>
   </respStmt>
</titleStmt>
```

An unattributed work simply omits `<composer>` / `<lyricist>`; the pipeline
prints *Anónimo*. The `xml:id`s in `respStmt` are what `@resp="#FHH"` points at
in the apparatus, so give one to anybody who will be credited there.

### 1.2 `sourceDesc` — the witnesses

Every witness is a `<source>` whose `xml:id` **is the siglum** used by `@source`
references throughout the file.

```xml
<source xml:id="P-Ln_MM4802-1" n="1" type="principal" label="manuscript">
   <bibl>
      <title>Miçelania de Tonos de Varios Autores, a 4º - (Superius primus a 4)</title>
      <identifier type="URI">https://purl.pt/41324</identifier>
      <physLoc>
         <repository>
            <identifier auth="RISM">P-Ln</identifier>
            <corpName role="holding institution">
               <name type="organization">Biblioteca Nacional de Portugal</name>
            </corpName>
         </repository>
         <identifier type="shelfmark">M.M. 4802/1</identifier>
      </physLoc>
   </bibl>
</source>
```

Conventions:

- `@n` is the reading order of the witnesses; `@type` is `principal` for the
  partbooks of the cancionero itself and `complementary` for concordances and
  for the edition's own reconstructions; `@label` says what kind of object it is
  (`manuscript`, `digital`).
- The RISM siglum goes in `<repository><identifier auth="RISM">`, the call
  number in `<identifier type="shelfmark">`. The apparatus resolves `@source` to
  `RISM (title)` using exactly these two, so both are worth filling in.
- A reconstructed part is a source of its own, e.g.
  `<source xml:id="alto-part-recomposition" type="complementary" label="digital">`.

The standing witnesses of the collection are `P-Ln_MM4802-1` (Superius primus),
`P-Ln_MM4802-2` (Superius secundus), `P-Ln_MM4803`, `P-Lant_PT-TT-MUS-L122`
(Tenor) and the reconstruction pseudo-source. Keep the same ids across tonos so
a reference means the same thing everywhere.

### 1.3 `workList` — the organic

The scoring is declared once, in the header, as a `perfResList` in score order:

```xml
<workList>
   <work>
      <title>Deidad, que divina enseñas</title>
      <perfMedium>
         <perfResList>
            <perfRes>Tiple 1º</perfRes>
            <perfRes>Tiple 2º</perfRes>
            <perfRes type="reconstructed">Alto</perfRes>
            <perfRes>Tenor</perfRes>
            <perfRes type="reconstructed">Guion</perfRes>
         </perfResList>
      </perfMedium>
   </work>
</workList>
```

`@type` records the editorial state of each part and drives how it is written in
the printed organic (`scripts/build_index.py`):

| `@type` | meaning | printed as |
|---|---|---|
| *(none)* | transmitted by the source | `Tenor` |
| `reconstructed` | absent from the source and supplied by the edition | `[Alto]` |
| `lost` | in the scoring, absent from the source and not supplied by the edition| `(Alto)` |
| `fragmentary` | survives only in part | `Tenor*` |

`@source` links each part to the witness that transmits it, by the siglum of
§1.2. It is what makes the organic and the `sourceDesc` agree when the title
of a partbook does not say which voice it carries: in tono 46 the Tenor book
of the cancionero (L122) holds the Alto part, and the Tenor comes from the
CPMHL. Several witnesses are listed separated by spaces, the principal one
first; a reconstructed part points to the reconstruction pseudo-source; a
`lost` part has no `@source`.

```xml
<perfResList>
   <perfRes source="#P-Ln_MM4802-1 #P-La_47-VI-11">Tiple 1º</perfRes>
   <perfRes source="#P-Ln_MM4802-2">Tiple 2º</perfRes>
   <perfRes source="#P-Lant_PT-TT-MUS-L122">Alto</perfRes>
   <perfRes source="#P-La_47-VI-13">Tenor</perfRes>
   <perfRes source="#P-La_47-VI-10">Guion</perfRes>
</perfResList>
```

For the tonos whose only witnesses are the partbooks of the cancionero the
mapping is fixed (Tiple 1º → 4802/1, Tiple 2º → 4802/2, Tenor or Bajo → L122,
Guion → 4803, reconstructed Alto → `alto-part-recomposition`) and
`scripts/mei_perfres_source.py` fills it in; a tono with concordances is done
by hand. Attribute order is `xml:id`, `type`, `source`, `label`
(`scripts/mei_attr_order.py`).

Every `<perfRes>` carries an `xml:id`: it is what the staves of the part point at
with `@decls` (§2.3) and what `facsimileItems[].part` names in `tonos.json` (§9).
The id is `perfRes-` followed by the part name lower-cased, without spaces, dots
or ordinal signs, so the same part has the same id in every tono:

```xml
<perfResList>
   <perfRes xml:id="perfRes-tiple1" source="#P-Ln_MM4802-1">Tiple 1º</perfRes>
   <perfRes xml:id="perfRes-tiple2" source="#P-Ln_MM4802-2">Tiple 2º</perfRes>
   <perfRes xml:id="perfRes-alto" type="reconstructed" source="#alto-part-recomposition">Alto</perfRes>
   <perfRes xml:id="perfRes-tenor" source="#P-Lant_PT-TT-MUS-L122">Tenor</perfRes>
   <perfRes xml:id="perfRes-guion" source="#P-Ln_MM4803">Guion</perfRes>
</perfResList>
```

A `lost` part gets its id too, although no staff points at it.


---



## 2. Score structure

### 2.1 One `<mdiv>` per organic

A `<mdiv>` runs for as long as the set of staves does not change. When it does —
typically *coplas a solo* after a four-voice *estribillo* — start a new `<mdiv>`
with its own `<score><scoreDef>` and its own `staffGrp`. Tono 58 is the model:

```
mdiv 1  Estribillo, Coplas a 4          Tiple 1º, Tiple 2º, [Alto], Tenor, Guion
mdiv 2  coplas a solo Tiple 1º          Tiple 1º, Guion
mdiv 3  Coplas a solo Alto              [Alto], Guion
mdiv 4  Coplas a solo Tiple 2º          Tiple 2º, Guion
mdiv 5  Coplas a solo Tenor             Tenor, Guion
```

Do not fake a change of scoring with empty staves; the engraver would keep
printing them.

### 2.2 `scoreDef` — metre and key signature

```xml
<scoreDef xml:id="sd.initial" meter.count="3" meter.unit="2" midi.bpm="180.0">
```

- The **key signature is declared on the `scoreDef`**, as `@keysig`, once for the
  whole score. Put it on a `staffDef` only where a staff genuinely differs.
  Values in the corpus: `1s`, `1f`, or absent (no signature).
- The metre is `@meter.count` / `@meter.unit` (plus `@meter.sym` where a
  mensural sign is wanted).
- The first `scoreDef` carries `xml:id="sd.initial"`: the original-clefs
  apparatus points at it (§3), and its `<rdg>` must repeat the `@keysig`.

### 2.3 `staffDef` — parts and clefs

```xml
<staffDef n="1" decls="#perfRes-tiple1" lines="5">
   <label>Tiple 1º</label>
   <labelAbbr>Ti.1</labelAbbr>
   <clef xml:id="cghe12" shape="G" line="2"/>
</staffDef>
```

- `@n` numbers the staves in score order; the apparatus names a voice by looking
  its `<label>` up from `@n`, so every staff needs one.
- **`@decls` links the staff to its part**: it points at the `xml:id` of the
  `<perfRes>` (§1.3). It is the only link between a staff and a part: labels are
  not compared, so a staff labelled *Bajo* can belong to the perfRes *Tenor*, and
  the numbering of the staves may change from one `<mdiv>` to the next. Every
  `staffDef` of the score carries it, those of later `scoreDef`s and of the solo
  `<mdiv>`s included; the `staffDef`s inside the original-clefs `<app>` (§3) do
  not. `scripts/mei_perfres_decls.py` adds the ids and the `@decls` to a tono
  that lacks them, pairing parts (the `lost` ones left out) and staves by
  position, and `scripts/mei_add_guion.py` writes them for a reconstructed
  Guion.
- The `<clef>` here is the **modern** clef of the transcription. The octave-down
  tenor clef is `shape="G" line="2" dis="8" dis.place="below"`.
- A clef that differs from the source carries an `xml:id`, because the
  original-clefs apparatus refers back to it.
- A reconstructed part gets its label in square brackets: `[Alto]`, `[G.]`.

### 2.4 Sections

`<section xml:id="coplas" label="coplas">`, `label="estribillo"`, and for solo
material `label="Coplas a solo Tenor"`. The label is what the reader sees as a
heading; the `xml:id` is what the poem's `@corresp` / `@decls` point at (§8), and
what tells the pipeline which stanzas to overlay onto which passage.

---

## 3. The original clefs

The clefs of the source are encoded as a variant of the initial `scoreDef`,
placed at the head of the first section:

```xml
<app xml:id="akofi93" type="app_clefs">
   <lem type="app_clefs" corresp="#sd.initial"/>
   <rdg type="app_clefs">
      <scoreDef keysig="1s">
         <staffGrp>
            <staffGrp>
               <staffDef n="1">
                  <clef corresp="#cghe12" shape="C" line="1"/>
               </staffDef>
               <staffDef n="2">
                  <clef corresp="#cghe13" shape="C" line="1"/>
               </staffDef>
               <staffDef n="4">
                  <clef corresp="#cghe14" shape="C" line="4"/>
               </staffDef>
            </staffGrp>
         </staffGrp>
      </scoreDef>
   </rdg>
</app>
<annot plist="#akofi93 #cghe12 #cghe13 #cghe14">Claves modernizadas.</annot>
```

Rules:

- `<lem>` is empty and `@corresp` points at `#sd.initial`: the reading in force
  is the score's own definition, so nothing is duplicated.
- `<rdg>` lists **only the staves whose clef differs**, each `<clef>` pointing
  back with `@corresp` at the modern clef it replaces.
- **The `<rdg>`'s `<scoreDef>` repeats the `@keysig` in force.** A `scoreDef`
  inside an `<app>` does not inherit the signature of the one it varies; when the
  score has a signature and an encoded transposition (`tonos.json`), a `<rdg>`
  `scoreDef` without `@keysig` renders the redefined staves wrongly as soon as
  the transposition is switched off to show the original clefs. If the score
  has no signature, the `<rdg>` `scoreDef` carries none either.
- A later `scoreDef` (`sd.coplas`, `sd.estribillo`…) gets its own
  `<app type="app_clefs">` whose `<lem>` points at it, with the same rules.
- The accompanying `<annot>` lists the `app` first and then the modern clefs of
  the staves that were in high clefs, in that order. The pipeline uses that
  order to decide which parts to report first.
- This apparatus never becomes a footnote. It feeds the *Datos musicales* block
  ("Claves altas: Tenor: Do en 3ª, Guion: Do en 4ª"), and `high_clefs` is
  inferred from the transposition of the signature.

`type="app_clefs"` and `type="dissonant_analysis"` are reserved values; an
`<app>` with no `@type` is a textual/musical variant between witnesses (§4.1).

---

## 4. Critical apparatus

### 4.1 Which element for what

| Situation | Encoding |
|---|---|
| The edition emends the source | `<corr>` around the corrected reading |
| Emendation, keeping the source reading machine-readable | `<choice><corr>…</corr><sic>…</sic></choice>` |
| The source reading is kept although it looks wrong | `<sic>` |
| Notation normalised (figures, note values, spelling of the same intent) | `<reg>`, or `<choice><orig/><reg/></choice>` |
| Material supplied by the editor (missing bar, ficta passage, lost text) | `<supplied>` |
| The source cannot be read with certainty | `<unclear reason="…">` |
| Witnesses transmit different readings | `<app><lem/><rdg/></app>` |
| Nothing is emended, the editor just comments | no wrapper — point the `<annot>` at the note itself |

Two facts about the engraver decide the order of the branches, and both were
verified against Verovio rather than assumed:

- **`<choice>`: the *first* child is what gets printed.** `<choice><corr/><sic/></choice>`
  prints the correction; `<choice><orig/><reg/></choice>` prints the original.
- **`<app>`: the `<lem>` is what gets printed** (the first `<rdg>` if there is no
  `lem`).

For a variant between witnesses, give each branch its source and a shared
`@label` so the branches of one variant can be recognised as a set:

```xml
<app xml:id="aoid982">
   <lem label="app2" source="#P-Ln_MM4802-2 #P-Lant_PT-TT-MUS-L122">
      <syl xml:id="sty785" wordpos="t">cias</syl>
   </lem>
   <rdg label="app2" source="#P-Ln_MM4802-1">
      <syl xml:id="sty786" con="d" wordpos="i">rias</syl>
   </rdg>
</app>
```

An empty `<lem/>` is a legitimate reading: it means the adopted text omits what
the other witness has.

**Where variants live.** Every divergence between witnesses is recorded here, anchored
to the note or the syllable it concerns. A tono's introduction may summarise what a
collation shows, and may single out a divergence that matters for understanding the
piece, but it never enumerates the variants bar by bar: that list is what this apparatus
is for. If a paragraph of an introduction could be rewritten as a table of bars and
voices, it belongs here instead.

### 4.2 The `<annot>`

An editorial element becomes a *note in the edition* when an `<annot>` points at
it:

```xml
<staff n="3">
   <layer n="1">
      <note xml:id="n1902394" dur="2" pname="c" accid="s" oct="5"/>
      …
   </layer>
   <annot plist="#co23989302">Semibreve en el manuscrito. Igualamos con el resto
      de voces que cierran con mínima y dos silencios</annot>
</staff>
```

- **The prose is the note.** It is printed verbatim in both editions and is never
  replaced by a machine-generated description. Write it as it should read.
- Put the `<annot>` inside the `<staff>` of the bar it concerns (or the
  `<measure>`, or the `<section>` for something that concerns the whole piece).
  The location that gets printed is computed from the *targets*, but the annot's
  own position is the fallback when a reference breaks, so a well-placed annot
  degrades gracefully.
- **One annot, one note.** When the same emendation affects several voices, list
  every target in the one `@plist`: the note then reads
  "Compases 75-76, Tiple 1º y Tenor" and the scholar edition puts the *same*
  footnote number on each affected note.
- `@plist` entries are `#`-prefixed and space-separated. Every reference must
  resolve; a dangling one is reported by `list_annotations.py --problems` and
  costs the note its marker in the score.
- **`xml:id` is mandatory** on every element named in a `@plist` *and* on the
  event the footnote marker will hang off. The marker is placed on the target
  itself if it is a note/rest/chord, otherwise on the first such event inside it,
  otherwise on the note that contains it (for `<note><corr><accid/></corr></note>`
  or a corrected `<verse>`), otherwise on the note a supplied `<tie>` starts on.
  `expand_annots.py` **aborts the build** when that event has no `xml:id`; run
  `python scripts/ensure_note_ids.py <file.mei>` to mint the missing ones, then
  `python scripts/mei_attr_order.py --update <file.mei>`.

An `<annot>` with no `@plist` inside the score is not an editorial note; inside
the poem it is a text note (§8).

### 4.3 Attributes that reach the page

The editorial elements carry the usual MEI metadata, and the editions print it
in brackets after the prose, translated, skipping anything the prose already
says:

| Attribute | Values seen | Printed as |
|---|---|---|
| `@reason` | `ink`, `lost`, `paper trimmed`, or free prose | *mancha de tinta*, *texto perdido*, *papel recortado*; free prose only when the annot has none of its own |
| `@cert` | `high`, `medium`, `low` | *certeza alta / media / baja* |
| `@evidence` | `internal`, `external`, `conjecture` | *por evidencia interna / externa*, *por conjetura* |
| `@source` | `#siglum` | *según P-Ln (…)*, resolved through `sourceDesc` |
| `@resp` | `#FHH`, `#JJM`, `#OMA` | not printed per note — responsibility is stated once for the edition |

Use a code where a code exists: codes are translated and always printed, free
prose is not, precisely because it tends to repeat the note.

### 4.4 What each edition does with it

- **Performer edition**: every note in one ordered list, *Notas a la edición
  musical*, keyed by bar and voice. No marks on the score.
- **Scholar edition**: a blue `[n]` above each affected note and the text at the
  foot of the page, numbered in musical order.

Check both without building anything:

```
python pdf-generation/scripts/list_annotations.py [tono…] [--problems] [--json]
```

---

## 5. Accidentals

```xml
<note dur="2" pname="c" accid="s" oct="5"/>                    <!-- written in the source -->
<note dur="2" pname="c" accid.ges="s" oct="5"/>                <!-- sounds sharp, nothing printed -->
<note dur="1" pname="f" oct="4">
   <accid accid="s" func="edit" enclose="paren"/>              <!-- editorial ficta -->
</note>
```

- `@accid` is an accidental **written in the source**, and it is engraved.
- **`@accid.ges` is written out on every altered note**, even when the alteration
  follows from the key signature or from an accidental earlier in the same bar.
  It changes nothing on the page and it is what makes the MIDI, the synthesised
  audio and any harmonic analysis correct. Do not rely on the reader — or the
  software — inferring it.
- Editorial *ficta* is a child `<accid accid="…" func="edit" enclose="paren"/>`,
  which Verovio prints in parentheses. It is reported as *(alteración editorial)*
  when an apparatus entry describes the note. The performer edition runs
  `scripts/normalize_ficta.py`, which drops `@func` and `@enclose` so the
  accidentals print plainly; the scholar edition keeps the parentheses.
- A **reconstructed voice has no *ficta***. Ficta marks the distance between what
  the source wrote and what the edition adds, and a voice the source does not
  transmit has no written text to measure it against: every note in it is already
  editorial. Its accidentals are plain `@accid`, never an `<accid func="edit">`.

## 6. Coloration

Blackened notation is marked on the span it covers, not on the note heads:

```xml
<bracketSpan staff="1" startid="#n1r0mwzo" endid="#id23" func="coloration" lwidth="0.5vu"/>
```

MEI Basic cannot express this, and `scripts/simplify_to_mei_basic.py` says so in
the derived file.

## 7. Lyrics under the notes

`<verse n="…">` per stanza, `<syl>` per syllable, with `@wordpos` (`i` initial,
`m` medial, `t` terminal) and `@con` for what joins it to the next one: `d` for
the hyphen of a divided word, `u` for an underscore extension, `b` for elision
(two syllables sung to one note).

```xml
<note dur="2" pname="g" oct="4">
   <verse n="1">
      <syl con="d" wordpos="i">Ven</syl>
   </verse>
   <verse n="3">
      <syl con="b">y</syl>
      <syl>al</syl>
   </verse>
</note>
```

Corrections to the sung text are wrapped exactly like corrections to the notes —
`<corr>` around the `<verse>`, or an `<app>` around the `<syl>` — and the marker
lands on the note that carries them.

---

## 8. The poem

The full poetic text lives in `<back>`, decoupled from the score: Verovio
ignores `<back>`, so nothing here affects the engraving, and both the printed
text edition and the coplas overlaid on the score are read from it as well as in
the web app.

```xml
<back>
   <div type="poem">
      <lg type="coplas" corresp="#coplas">
         <lg type="copla" n="1">
            <l>En pedazos va cayendo,</l>
            <l>un arroyo cuyos pasos,</l>
            <l>los mide su precipicio</l>
            <l>y los encuentra un peñasco.</l>
         </lg>
         <lg type="copla" n="2">
            …
         </lg>
      </lg>
      <lg type="estribillo" decls="#estribillo">
         <lg>
            <l>Ay, triste pajarillo,</l>
         </lg>
      </lg>
   </div>
</back>
```

- The outer `<lg>` is a block (`type="coplas"`, `"estribillo"`), the inner ones
  are stanzas (`type="copla" n="N"`).
- **`@corresp="#section"`** on a block: its stanzas are overlaid onto that score
  section (the coplas printed under the music). **`@decls="#section"`**: the
  block is printed with the text but not overlaid, and its heading titles that
  section. `@corresp` on an *inner* `<lg>` routes that single stanza to a
  section, for pieces whose coplas are distributed among sections.
- A `<label>` inside the block overrides the heading; otherwise the `@type` is
  capitalised.

### 8.1 Text notes

A note on the text is an `<annot type="text-note">` **inside the `<l>` it
annotates** — the containment is the link, no `@corresp` needed — and it is
numbered by that line's position in the poem:

```xml
<lg type="copla" n="4">
   <l>Si ayer naciste en el monte,</l>
   <l>quien te libró de villano,
      <annot type="text-note">villano: El vecino, o habitador del estado llano de
         alguna villa o aldea, a distincion del noble o hidalgo. (Diccionario de
         Autoridades).</annot>
   </l>
   <l>las presunciones de río,</l>
   <l>no son las que hacen hidalgos.</l>
</lg>
```

An `<annot type="text-note">` placed directly under the `<div>`, outside any
line, is a note about the source as a whole and is printed without a number.

### 8.2 Supplied text

Text restored by the edition is `<supplied>`, with its reason and the person
responsible, and it is printed **between square brackets**:

```xml
<l><supplied reason="lost" resp="#FHH">de seguirle en su viaje</supplied></l>
```

---

## 9. The facsimile

### 9.1 Images in `tonos.json`

The facsimile images of a tono are listed in its `facsimileItems`, with the path
relative to `facsimil-images/`. Each image says in `part` which part it shows, by
the `xml:id` of the `<perfRes>` (§1.3):

```json
"facsimileItems": [
  { "name": "Tiple 1º página 8", "file": "S1/image-008.jpg", "part": "perfRes-tiple1" },
  { "name": "Tenor página 11",   "file": "T/image-011.jpg",  "part": "perfRes-tenor" }
]
```

The folder of the image names the partbook it was scanned from: `S1` 4802/1,
`S2` 4802/2, `T` L122, `G` 4803, and `others` for the concordances. `part` is the
perfRes whose `@source` holds that partbook, which is not always the part the
folder suggests: in tono 46 the images in `T` are the Alto. The images in
`others` are assigned one by one. An image without `part` is taken for the full
score; any value other than a string is a configuration error in score-viewer.

While the player runs, the facsimile follows a part onto its next image, and when
the images cover more than one part the facsimile can show all of them side by
side, each with its own pages. The staves of a part are found through the
`staffDef/@decls` of §2.3.

### 9.2 Notes linked to the image

A note or rest whose `@facs` points at a `<zone>` of the `<facsimile>` is marked
on the image beside the score in split view, while it sounds and, with the
"Show note on the facsimile on click" setting, when it is clicked. The
`<facsimile>` is the first child of `<music>`, one `<surface>` per image:

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
```

- A config image is matched to its `<surface>` by `<graphic>@target` against the
  image `file` (either may be a trailing part of the other path), or else by the
  surface `@label` against the image `name`. Writing the same path as `file` in
  `@target` and the same text as `name` in `@label` keeps both ways working.
- Coordinates are pixels of the original image, whose size is in
  `surface/@lrx`/`@lry`. A zone is a point (1 px) on the figure.
- Several events may point at the same zone: a tied note is one figure in the
  source, and so are several measure rests written as a single sign.
- Only what the source writes is linked: nothing inside `<supplied>`, the source
  reading (`<sic>`, `<orig>`) rather than the correction of a `<choice>`, and the
  readings of an `<app>` only on the images of their own witness. The staves of
  a reconstructed part have no images and no links.

The links are made with `tools/facsimile-link/` (see its README), which writes
only the `<facsimile>` block and the `@facs` attributes.

---

## 10. Attribute order

Attribute order is meaningless to XML and very much not meaningless to a diff.
`scripts/mei_attr_order.py` defines one preferred order and enforces it.

The ordering is by role: what the thing **is** (`xml:id`, then `type`, `func`,
`label`, `n`), what it **refers to** (`corresp`, `source`, `resp`, `plist`),
where it **lives** (`staff`, `layer`, `tstamp`, `startid`), what it **sounds
like** (`dur`, `dots`, `pname`, `accid`, `oct`) and last what it **looks like**
(`place`, `halign`, `color`, `fontsize`). `xml:id` always comes first. Elements
not covered by a specific rule fall back to the global order; attributes in
neither keep their relative position at the end of the tag.

```
python scripts/mei_attr_order.py --spec              # print the preferred order
python scripts/mei_attr_order.py --check f.mei       # exit 1 if it diverges
python scripts/mei_attr_order.py --update f.mei      # rewrite it
```

The rewrite is textual — only the attributes inside start tags are permuted, and
the result is verified against the canonical XML of the original — so the diff
contains the reordering and nothing else. Indentation is three spaces.

The pre-commit hook runs `--check` on every staged MEI and refuses the commit
otherwise, so run `--update` after any tool has touched a file.

---

## 11. Before committing

| Command | What it checks |
|---|---|
| `python pdf-generation/scripts/list_annotations.py --problems` | dangling `@plist`, notes with no anchor, notes with no text |
| `python scripts/ensure_note_ids.py <f.mei>` | mints the `xml:id` the footnote markers need |
| `python scripts/mei_attr_order.py --check <f.mei>` | attribute order (enforced by the hook) |
| `python scripts/build_index.py` | regenerates `tonos/index.json` (enforced by the hook) |
| `python scripts/simplify_to_mei_basic.py --check <f.mei>` | the file still reduces to valid MEI Basic |
| `python pdf-generation/generate-pdfs.py <n>` | builds both editions of one tono |

Two failure modes are deliberately loud rather than silent, because both used to
lose editorial work without anyone noticing: a `@plist` target whose anchor event
has no `xml:id` **stops the build**, and a dangling `@plist` reference is
reported by name every time the apparatus is read.
