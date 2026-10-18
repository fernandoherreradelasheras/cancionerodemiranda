// Path of a tono page: /tono/<number>/<slug>/. Shared by the app and by prerender.mjs (plain
// JS so that node can import it without a build step).
//
// The number identifies the page; the slug only makes the address readable. It is stored in
// tonos/tonos.json (scripts/tono-slugs.mjs proposes it from the title) and does not follow
// later changes of the title, so the address of a tono stays put.
//
// Until October 2026 the pages lived at /tono/<number>/. For a year and a half every one of
// them was the same empty SPA shell, and Google kept them out of its index after the content
// was prerendered. The pages moved to these paths, and the old ones redirect here.

export const tonoPath = (number, slug) => `/tono/${number}/${slug}/`

export const legacyTonoPath = (number) => `/tono/${number}/`
