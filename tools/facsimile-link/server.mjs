// Facsimile link tool for the Cancionero de Miranda.
//
// Zero-dependency HTTP server: serves the editor (public/), the tonos of
// tonos/tonos.json, their MEI files and facsimile images, and writes the
// note ↔ facsimile links back into each MEI (lib/mei-facsimile.mjs).
//
//   node server.mjs            → http://localhost:5178
//
// Every save runs scripts/mei_attr_order.py --update (the pre-commit hook
// enforces the attribute order) and check_mei.py (well-formed and valid MEI 5.1)
// on a temporary copy, and only then replaces the MEI. The previous version and
// the unsaved work (drafts) are kept in .state/, which git ignores.

import http from 'node:http';
import { readFile, writeFile, stat, mkdir, unlink, copyFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  REPO_ROOT, TONOS_JSON, IMAGES_DIR, STATE_DIR,
  loadTonos, findTono, meiPathOf, meiInfo, assignImages, allImageFiles,
} from './lib/tonos.mjs';
import { parseFacsimile, writeFacsimile, scanEvents, LinkError } from './lib/mei-facsimile.mjs';
import { imageSize } from './lib/image-size.mjs';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(TOOL_DIR, 'public');
const LIB_DIR = path.join(TOOL_DIR, 'lib');
const PORT = Number(process.env.PORT) || 5178;
const PYTHON = process.env.PYTHON || 'python3';

// Local Verovio builds, tried in order when the CDN is unreachable.
const VEROVIO_DIRS = [
  process.env.VEROVIO_DIR,
  path.join(TOOL_DIR, 'node_modules', 'verovio', 'dist'),
  path.join(REPO_ROOT, 'web-app', 'node_modules', 'verovio', 'dist'),
].filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mei': 'application/xml; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};

// tonos.json is re-read on every request that needs it, so edits (a new
// `part` field, a new tono) apply without restarting.
const tonos = () => loadTonos();
const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const statePath = (p, suffix) => path.join(STATE_DIR, `${p}.${suffix}`);

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}
const sendJson = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'Content-Type': MIME['.json'] });

async function sendFile(res, file) {
  try {
    const data = await readFile(file);
    send(res, 200, data, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  } catch {
    send(res, 404, 'Not found');
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd: REPO_ROOT, maxBuffer: 16 << 20 }, (err, stdout, stderr) => {
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout, stderr, err });
    });
  });
}

const sizeCache = new Map();
async function dimsOf(file) {
  if (!sizeCache.has(file)) sizeCache.set(file, await imageSize(path.join(IMAGES_DIR, file)).catch(() => null));
  return sizeCache.get(file);
}

async function tonoConfig(tono) {
  const text = await readFile(meiPathOf(tono), 'utf8');
  const info = meiInfo(text);
  const images = assignImages(tono, info);
  for (const im of images) Object.assign(im, await dimsOf(im.file) || {});
  return {
    tono: tono.path, title: tono.title, meiFile: tono.meiFile,
    encodedTransposition: tono.encodingProperties?.encodedTransposition || '',
    parts: info.parts, problems: info.problems, images,
  };
}

async function readDraft(p) {
  try { return JSON.parse(await readFile(statePath(p, 'draft.json'), 'utf8')); } catch { return null; }
}

// Links of the other tonos drawn on the images this tono shares with them
// (the Guion of tonos 1 and 2 is on the same page), to see where each one ends.
async function neighbourPoints(tono) {
  const files = new Set((tono.facsimileItems || []).map((f) => f.file));
  const out = {};
  for (const other of tonos()) {
    if (other.path === tono.path) continue;
    if (!(other.facsimileItems || []).some((f) => files.has(f.file))) continue;
    let text;
    try { text = await readFile(meiPathOf(other), 'utf8'); } catch { continue; }
    const { zones } = parseFacsimile(text);
    for (const z of Object.values(zones)) {
      if (!files.has(z.file)) continue;
      (out[z.file] ||= []).push({ x: z.x, y: z.y, tono: other.path });
    }
  }
  return out;
}

async function save(tono, body) {
  const meiPath = meiPathOf(tono);
  const text = await readFile(meiPath, 'utf8');
  if (body.baseHash && body.baseHash !== sha1(text)) {
    return [409, { error: 'The MEI changed on disk since it was loaded. Reload the tono (your work is kept as a draft).' }];
  }
  const config = await tonoConfig(tono);
  const dims = Object.fromEntries(config.images.filter((im) => im.w).map((im) => [im.file, { w: im.w, h: im.h }]));
  let result;
  try {
    result = writeFacsimile(text, body, { images: tono.facsimileItems, dims, eventCount: body.eventCount });
  } catch (e) {
    if (e instanceof LinkError) return [400, { error: e.message }];
    throw e;
  }

  await mkdir(STATE_DIR, { recursive: true });
  const tmp = statePath(tono.path, 'tmp.mei');
  await writeFile(tmp, result.text, 'utf8');
  try {
    const order = await run(PYTHON, [path.join(REPO_ROOT, 'scripts', 'mei_attr_order.py'), '--update', '--quiet', tmp]);
    if (order.code !== 0) {
      return [500, { error: `mei_attr_order.py failed: ${(order.stderr || order.stdout || order.err?.message || '').trim()}` }];
    }
    const check = await run(PYTHON, [path.join(TOOL_DIR, 'check_mei.py'), tmp, '--baseline', meiPath]);
    let report = {};
    try { report = JSON.parse(check.stdout.trim().split('\n').pop()); } catch { /* reported below */ }
    if (check.code !== 0) {
      const why = report.errors?.length ? report.errors.join('\n') : (check.stderr || check.err?.message || '').trim();
      return [500, { error: `The new MEI does not validate against MEI 5.1; nothing was written.\n${why}` }];
    }
    await copyFile(meiPath, statePath(tono.path, 'prev.mei'));
    const final = await readFile(tmp, 'utf8');
    await writeFile(meiPath, final, 'utf8');
    await rm(statePath(tono.path, 'draft.json'), { force: true });
    return [200, {
      ok: true, linked: result.linked, zones: result.zoneCount,
      missing: result.missing, meiHash: sha1(final),
      validated: !!report.validated, warnings: report.validated ? (report.valid ? [] : report.errors) : report.errors || [],
    }];
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    // List of tonos with their progress.
    if (pathname === '/api/tonos' && req.method === 'GET') {
      const list = [];
      for (const t of tonos()) {
        let linked = 0;
        try {
          const text = await readFile(meiPathOf(t), 'utf8');
          linked = scanEvents(text).filter((e) => e.facs).length;
        } catch { /* missing MEI */ }
        list.push({
          path: t.path, title: t.title, images: (t.facsimileItems || []).length,
          linked, draft: existsSync(statePath(t.path, 'draft.json')),
        });
      }
      return sendJson(res, 200, list);
    }

    const tm = /^\/api\/tono\/([^/]+)\/(config|mei|state|save|draft|neighbours)$/.exec(pathname);
    if (tm) {
      const tono = findTono(tonos(), tm[1]);
      if (!tono) return sendJson(res, 404, { error: `unknown tono: ${tm[1]}` });
      const what = tm[2];

      if (what === 'config' && req.method === 'GET') return sendJson(res, 200, await tonoConfig(tono));

      if (what === 'mei' && req.method === 'GET') return sendFile(res, meiPathOf(tono));

      if (what === 'state' && req.method === 'GET') {
        const text = await readFile(meiPathOf(tono), 'utf8');
        const meiHash = sha1(text);
        const draft = await readDraft(tono.path);
        return sendJson(res, 200, {
          ...parseFacsimile(text), meiHash, eventCount: scanEvents(text).length,
          draft: draft ? { ...draft, stale: draft.baseHash !== meiHash } : null,
        });
      }

      if (what === 'draft' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req) || '{}');
        await mkdir(STATE_DIR, { recursive: true });
        await writeFile(statePath(tono.path, 'draft.json'),
          JSON.stringify({ ...body, savedAt: new Date().toISOString() }), 'utf8');
        return sendJson(res, 200, { ok: true });
      }
      if (what === 'draft' && req.method === 'DELETE') {
        await rm(statePath(tono.path, 'draft.json'), { force: true });
        return sendJson(res, 200, { ok: true });
      }

      if (what === 'save' && req.method === 'POST') {
        const [status, body] = await save(tono, JSON.parse(await readBody(req) || '{}'));
        return sendJson(res, status, body);
      }

      if (what === 'neighbours' && req.method === 'GET') return sendJson(res, 200, await neighbourPoints(tono));
    }

    // Facsimile images: only those some tono references.
    const im = /^\/img\/(.+)$/.exec(pathname);
    if (im && req.method === 'GET') {
      const file = im[1];
      if (file.split('/').includes('..') || !allImageFiles(tonos()).has(file)) return send(res, 404, 'Not found');
      return sendFile(res, path.join(IMAGES_DIR, file));
    }

    // Local Verovio (fallback for the CDN).
    if (pathname.startsWith('/vendor/verovio/')) {
      const name = path.basename(pathname);
      const dir = VEROVIO_DIRS.find((d) => existsSync(path.join(d, name)));
      return dir ? sendFile(res, path.join(dir, name)) : send(res, 404, 'Not found');
    }

    // Modules shared with the server.
    if (pathname.startsWith('/lib/')) {
      const file = path.normalize(path.join(LIB_DIR, pathname.slice(5)));
      if (!file.startsWith(LIB_DIR + path.sep)) return send(res, 403, 'Forbidden');
      return sendFile(res, file);
    }

    // The editor.
    const rel = pathname === '/' ? '/index.html' : pathname;
    const file = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
    if (existsSync(file) && (await stat(file)).isFile()) return sendFile(res, file);

    send(res, 404, 'Not found');
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Facsimile link tool → http://localhost:${PORT}\n`);
  console.log(`  tonos:  ${TONOS_JSON} (${tonos().length})`);
  console.log(`  images: ${IMAGES_DIR}\n`);
});
