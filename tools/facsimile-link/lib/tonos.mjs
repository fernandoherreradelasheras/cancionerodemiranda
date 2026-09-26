// The cancionero dataset: tonos from tonos/tonos.json, their MEI files and
// their facsimile images.
//
// Every image of a tono's `facsimileItems` names in `part` the xml:id of the
// <perfRes> whose part it shows, and every <staffDef> points at its perfRes
// with @decls (GUIDELINES §2.3, §9.1): that is the whole image ↔ staff link.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(TOOL_DIR, '..', '..');
export const TONOS_JSON = process.env.TONOS_JSON || path.join(REPO_ROOT, 'tonos', 'tonos.json');
export const TONOS_DIR = process.env.TONOS_DIR || path.dirname(TONOS_JSON);
export const IMAGES_DIR = process.env.IMAGES_DIR || path.join(REPO_ROOT, 'facsimil-images');
export const STATE_DIR = process.env.STATE_DIR || path.join(TOOL_DIR, '.state');

// Image folder → siglum of the partbook of the cancionero it was scanned from.
// Only used to tell which witness an image is when its part has several.
export const FOLDER_SOURCE = {
  S1: 'P-Ln_MM4802-1',
  S2: 'P-Ln_MM4802-2',
  T: 'P-Lant_PT-TT-MUS-L122',
  G: 'P-Ln_MM4803',
};

export function loadTonos() {
  const data = JSON.parse(readFileSync(TONOS_JSON, 'utf8'));
  return data.scores || [];
}

export function findTono(tonos, p) {
  return tonos.find((s) => s.path === p) || null;
}

export function meiPathOf(tono) {
  return path.join(TONOS_DIR, tono.path, tono.meiFile);
}

// Every image referenced by any tono (the whitelist of servable images).
export function allImageFiles(tonos) {
  const set = new Set();
  for (const t of tonos) for (const f of t.facsimileItems || []) set.add(f.file);
  return set;
}

const attr = (attrs, name) => {
  const m = new RegExp(`\\b${name.replace(':', '\\:')}\\s*=\\s*"([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
};
const text_ = (s) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// What the image → part link needs from the MEI: the parts (perfRes, in score
// order) and which of them have staves (staffDef/@decls).
//   parts: [{ id, label, type, sources:[siglum], staves:bool }]
//   problems: staffDefs with a label and no @decls, @decls to an unknown part
export function meiInfo(text) {
  const parts = [];
  for (const m of text.matchAll(/<perfRes\b([^>]*)>([\s\S]*?)<\/perfRes>/g)) {
    parts.push({
      id: attr(m[1], 'xml:id'),
      label: text_(m[2]),
      type: attr(m[1], 'type'),
      sources: (attr(m[1], 'source') || '').split(/\s+/).filter(Boolean).map((s) => s.replace(/^#/, '')),
      staves: false,
    });
  }
  const problems = [];
  for (const p of parts) if (!p.id) problems.push(`perfRes "${p.label}" has no xml:id`);
  for (const m of text.matchAll(/<staffDef\b([^>]*?)(\/>|>([\s\S]*?)<\/staffDef>)/g)) {
    const decls = attr(m[1], 'decls');
    const n = attr(m[1], 'n');
    if (!decls) {
      // The staffDefs of the original-clefs <app> carry no label and no @decls.
      if (m[3] && /<label\b/.test(m[3])) problems.push(`staffDef n=${n} has no @decls`);
      continue;
    }
    for (const ref of decls.split(/\s+/)) {
      const p = parts.find((x) => x.id && x.id === ref.replace(/^#/, ''));
      if (p) p.staves = true;
      else problems.push(`staffDef n=${n}: @decls ${ref} is not a perfRes`);
    }
  }
  return { parts, problems: [...new Set(problems)] };
}

// The facsimile images of a tono with their part. Returns, per image:
//   { file, name, part, source, note }
// `part` is the perfRes xml:id (or null), `source` the siglum of the witness
// when it can be told (only needed for the readings of an <app>), and `note`
// explains a problem ("warn: …") or a part without staves.
export function assignImages(tono, info) {
  return (tono.facsimileItems || []).map((item) => {
    const out = { file: item.file, name: item.name, part: null, source: null, note: null };
    if (item.part == null) return { ...out, note: 'warn: no "part" in tonos.json' };
    if (typeof item.part !== 'string') return { ...out, note: 'warn: "part" is not a string' };
    const p = info.parts.find((x) => x.id === item.part);
    if (!p) return { ...out, note: `warn: part "${item.part}" is not a perfRes xml:id of this tono` };
    out.part = p.id;
    out.source = witnessOf(item, p);
    if (!p.staves) {
      out.note = p.type === 'lost' ? 'lost part: nothing to link' : 'warn: no staffDef points at this part';
    }
    return out;
  });
}

// Letters and digits only, for matching sigla written in different ways
// ("P-La 47-VI-12" in an image name, "P-La_47-VI-12" as a source xml:id).
const alnum = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Which of the part's witnesses the image is: the only one, else the partbook
// of the image folder, else the one whose siglum is in the image name.
function witnessOf(item, part) {
  const s = part.sources;
  if (s.length <= 1) return s[0] || null;
  const folder = FOLDER_SOURCE[item.file.split('/')[0]];
  if (s.includes(folder)) return folder;
  const named = s.filter((x) => alnum(item.name).includes(alnum(x)) || alnum(item.file).includes(alnum(x)));
  return named.length === 1 ? named[0] : null;
}
