// Print the part of every facsimile image of every tono (or of the tonos
// given as arguments) and flag what the tool cannot use: an image without
// `part` in tonos.json, a `part` that is not a perfRes xml:id of the MEI, a
// part no staffDef points at with @decls, a labelled staffDef without @decls.
//
//   node check-parts.mjs [--all] [tono…]
//
// Without --all only the tonos with something to report are printed.
// Exit status 1 when something needs attention.

import { readFileSync } from 'node:fs';
import { loadTonos, meiPathOf, meiInfo, assignImages } from './lib/tonos.mjs';

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const wanted = args.filter((a) => !a.startsWith('--'));

let problems = 0;
let images = 0;
for (const tono of loadTonos()) {
  if (wanted.length && !wanted.includes(tono.path)) continue;
  const info = meiInfo(readFileSync(meiPathOf(tono), 'utf8'));
  const rows = assignImages(tono, info);
  images += rows.length;
  const warn = (note) => note && note.startsWith('warn');
  const bad = info.problems.length + rows.filter((r) => warn(r.note)).length;
  problems += bad;
  if (!showAll && !bad && !rows.some((r) => r.note)) continue;
  console.log(`${tono.path}  ${tono.meiFile}`);
  for (const p of info.problems) console.log(`  ! ${p}`);
  for (const r of rows) {
    if (!showAll && !r.note) continue;
    const what = r.part ? `→ ${r.part}${r.source ? ` (${r.source})` : ''}` : '→ –';
    console.log(`  ${warn(r.note) ? '!' : ' '} ${r.file}  "${r.name}"  ${what}${r.note ? `  ${r.note}` : ''}`);
  }
}
console.log(`\n${images} image(s), ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
