import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTonos, findTono, meiPathOf, meiInfo, assignImages } from '../lib/tonos.mjs';

const tonos = loadTonos();
const infoOf = (tono) => meiInfo(readFileSync(meiPathOf(tono), 'utf8'));
const assign = (p) => {
  const tono = findTono(tonos, p);
  return assignImages(tono, infoOf(tono));
};
const byFile = (rows) => Object.fromEntries(rows.map((r) => [r.file, r]));
const info = (parts, staffDefs) => meiInfo(
  `<perfResList>${parts}</perfResList><scoreDef><staffGrp>${staffDefs}</staffGrp></scoreDef>`);

test('every image of the corpus has a part, and every labelled staff a perfRes', () => {
  for (const tono of tonos) {
    const i = infoOf(tono);
    assert.deepEqual(i.problems, [], tono.path);
    for (const r of assignImages(tono, i)) {
      assert.ok(r.part && !(r.note || '').startsWith('warn'), `${tono.path} ${r.file}: ${r.note}`);
    }
  }
});

test('staves are linked to parts by @decls only, not by label', () => {
  const i = info('<perfRes xml:id="perfRes-tenor">Tenor</perfRes><perfRes xml:id="perfRes-alto">Alto</perfRes>',
    '<staffDef n="1" decls="#perfRes-tenor"><label>Bajo</label></staffDef><staffDef n="2"><label>Alto</label></staffDef>');
  assert.equal(i.parts.find((p) => p.id === 'perfRes-tenor').staves, true);
  assert.equal(i.parts.find((p) => p.id === 'perfRes-alto').staves, false);
  assert.deepEqual(i.problems, ['staffDef n=2 has no @decls']);
});

test('the staffDefs of the original clefs need no @decls; a wrong @decls is reported', () => {
  const i = info('<perfRes xml:id="perfRes-tiple1">Tiple 1º</perfRes>',
    '<staffDef n="1" decls="#perfRes-tiple1"><label>Tiple 1º</label></staffDef>'
    + '<staffDef n="1"><clef shape="C" line="1"/></staffDef><staffDef n="2" decls="#nope"><label>X</label></staffDef>');
  assert.deepEqual(i.problems, ['staffDef n=2: @decls #nope is not a perfRes']);
});

test('images without a valid part are flagged', () => {
  const i = info('<perfRes xml:id="perfRes-tiple1">Tiple 1º</perfRes><perfRes xml:id="perfRes-alto" type="lost">Alto</perfRes>',
    '<staffDef n="1" decls="#perfRes-tiple1"><label>Tiple 1º</label></staffDef>');
  const rows = assignImages({ facsimileItems: [
    { name: 'a', file: 'S1/a.jpg' },
    { name: 'b', file: 'S1/b.jpg', part: 3 },
    { name: 'c', file: 'S1/c.jpg', part: 'perfRes-tenor' },
    { name: 'd', file: 'S1/d.jpg', part: 'perfRes-alto' },
    { name: 'e', file: 'S1/e.jpg', part: 'perfRes-tiple1' },
  ] }, i);
  assert.deepEqual(rows.map((r) => (r.note || 'ok').split(':')[0]), ['warn', 'warn', 'warn', 'lost part', 'ok']);
});

test('tono 46: the Tenor partbook holds the Alto; the CPMHL images are the Tenor', () => {
  const r = byFile(assign('46'));
  assert.equal(r['T/image-078.jpg'].part, 'perfRes-alto');
  assert.equal(r['others/CPMHL-13-99r.jpg'].part, 'perfRes-tenor');
  assert.equal(r['others/CPMHL-13-99r.jpg'].source, 'P-La_47-VI-13');
});

test('witness of an image whose part has several: folder, else siglum in the name', () => {
  const r = byFile(assign('26'));
  assert.equal(r['S1/image-036.jpg'].source, 'P-Ln_MM4802-1');
  assert.equal(r['others/CPMHL-12-30v.jpg'].part, 'perfRes-alto2');
  assert.equal(r['others/CPMHL-12-30v.jpg'].source, 'P-La_47-VI-12');
});

test('tono 55: the images of the lost Tiple 1º have nothing to link, without warning', () => {
  const r = byFile(assign('55'));
  assert.equal(r['S1/image-094.jpg'].part, 'perfRes-tiple1');
  assert.ok(!r['S1/image-094.jpg'].note.startsWith('warn'));
});

test('tono 70: the Tenor perfRes has the staff labelled Bajo', () => {
  const i = infoOf(findTono(tonos, '70'));
  assert.equal(i.parts.find((p) => p.id === 'perfRes-tenor').staves, true);
  assert.equal(byFile(assign('70'))['T/image-127.jpg'].part, 'perfRes-tenor');
});
