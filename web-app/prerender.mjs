// Writes a static entry point for each route served by GitHub Pages. The app is a SPA and
// the introductions are fetched at runtime and shown in a tab that is not open by default,
// so crawlers (and link previews) got the same empty page with the same title for all 77
// tonos. Each tono page now carries its own metadata and, outside #root so that React does
// not wipe it on mount, the introduction and the poem rendered as plain HTML.
//
// Also writes sitemap.xml and robots.txt.
//
// Run after `vite build`, from web-app/ (see create_static_entry_points.sh).

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { micromark } from "micromark"
import { DOMParser } from "@xmldom/xmldom"
import { gfm, gfmHtml } from "micromark-extension-gfm"

const SITE = "https://cdm.humanoydivino.com"
const SITE_NAME = "Cancionero de Miranda"
const DIST = "dist"
const TONOS_DIR = "../tonos"

const DEFAULT_IMAGE = `${SITE}/humano-y-divino-logo1.jpg`

const SITE_DESCRIPTION = "Edición crítica del Cancionero de Miranda (P-Ln M.M. 4802/1-2 y M.M. 4803, "
    + "P-Lant PT/TT/MUS/L122): 77 tonos humanos del siglo XVII con partitura, texto poético, "
    + "facsímiles y estudio."

const config = JSON.parse(readFileSync("src/assets/tonos-config.json", "utf8"))
const index = JSON.parse(readFileSync(`${TONOS_DIR}/index.json`, "utf8"))
// dist/index.html is both the template and the home page, so what gets injected is marked
// and stripped on load: running the script twice on the same build gives the same result
const HEAD_START = "<!-- prerender:head -->", HEAD_END = "<!-- /prerender:head -->"
const BODY_START = "<!-- prerender:body -->", BODY_END = "<!-- /prerender:body -->"
const stripInjected = (html, start, end, replacement) => {
    const a = html.indexOf(start)
    return a < 0 ? html : html.slice(0, a) + replacement + html.slice(html.indexOf(end) + end.length)
}
const template = stripInjected(
    stripInjected(readFileSync(`${DIST}/index.html`, "utf8"), HEAD_START, HEAD_END, `<title>${SITE_NAME}</title>`),
    BODY_START, BODY_END, "")

// Date of the last commit touching the files a page is built from. A shallow clone would give
// the same date to every page, and a lastmod that does not track changes gets ignored by
// crawlers: better none at all (the workflow checks out the full history, without blobs)
const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { encoding: "utf8" }).trim() === "true"
if (shallow) {
    console.warn("Shallow git clone: the sitemap goes without lastmod")
}
const lastModified = (files) => shallow || files.length === 0 ? null
    : execFileSync("git", ["log", "-1", "--format=%cs", "--", ...files], { encoding: "utf8" }).trim() || null

const escapeHtml = (s) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const stripTags = (html) => html
    .replace(/<sup>.*?<\/sup>/g, "")   // footnote calls
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()

const truncate = (text, max) => {
    if (text.length <= max) {
        return text
    }
    const cut = text.slice(0, max)
    return cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.]+$/, "") + "…"
}

// Only plain names go into structured data: attributions in brackets or with question
// marks, and split authorships, stay in the visible text only
const personOrNull = (name) =>
    name && !/[[\]¿?/()]/.test(name) && name !== "Anónimo" ? { "@type": "Person", name } : null

const footnoteLabels = { label: "Notas", backLabel: (i) => `Volver a la llamada ${i + 1}` }

const renderMarkdown = (md) => micromark(md, { extensions: [gfm()], htmlExtensions: [gfmHtml(footnoteLabels)] })
    .replace(/(<img[^>]*src=")assets\//g, "$1/assets/")

// The poem lives in the MEI <back>. Same reading as the text tab of score-viewer: each top
// level <lg> is a section titled by @label or @type, its child <lg> are the strophes, and
// the verses drop their <annot> (the text notes belong to the apparatus)
const MEI_NS = "http://www.music-encoding.org/ns/mei"
const childrenNamed = (el, name) => Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.localName === name)
const capitalize = (s) => s.length ? s[0].toUpperCase() + s.slice(1) : s

const verseText = (l) => Array.from(l.childNodes)
    .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && n.localName !== "annot"))
    .map((n) => n.textContent ?? "").join("")
    .replace(/\s+/g, " ").trim()

const renderPoem = (meiPath) => {
    const doc = new DOMParser().parseFromString(readFileSync(meiPath, "utf8"), "text/xml")
    const poem = Array.from(doc.getElementsByTagNameNS(MEI_NS, "div"))
        .find((d) => d.getAttribute("type") === "poem" && d.parentNode?.localName === "back")
    if (!poem) {
        return ""
    }
    return childrenNamed(poem, "lg").map((section) => {
        const label = (section.getAttribute("label") ?? "").trim() || capitalize(section.getAttribute("type") ?? "")
        const strophes = childrenNamed(section, "lg")
        const stanzas = (strophes.length ? strophes : [section]).map((lg) =>
            `    <p>${childrenNamed(lg, "l").map((l) => escapeHtml(verseText(l))).join("<br />\n")}</p>`)
        return [label ? `    <h3>${escapeHtml(label)}</h3>` : null, ...stanzas].filter(Boolean).join("\n")
    }).join("\n")
}

const renderHead = ({ title, description, path, jsonLd, canonical = path, image }) => {
    const url = `${SITE}${canonical}`
    const tags = [
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<link rel="canonical" href="${url}" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:locale" content="es_ES" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:image" content="${image ?? DEFAULT_IMAGE}" />`,
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    ]
    if (jsonLd) {
        tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`)
    }
    return [HEAD_START, ...tags, HEAD_END].join("\n  ")
}

const writePage = (path, { head, body }) => {
    let html = template
        .replace(/<html lang="[^"]*">/, `<html lang="es">`)
        .replace(/<title>.*?<\/title>/s, head)
    if (body) {
        html = html.replace(`<div id="root"></div>`,
            `<div id="root"></div>${BODY_START}\n  <article id="static-content">\n${body}\n  </article>${BODY_END}`)
    }
    const dir = `${DIST}${path}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}index.html`, html)
}

const sitemap = []

// Home, about and progress: the content is React, only the metadata changes. The index
// route renders About, so /about/ is a duplicate of / and points its canonical there
for (const [path, title, canonical] of [
    ["/", SITE_NAME, "/"],
    ["/about/", `Acerca del ${SITE_NAME}`, "/"],
    ["/progreso/", `Progreso de la edición · ${SITE_NAME}`, "/progreso/"],
]) {
    writePage(path, { head: renderHead({ title, description: SITE_DESCRIPTION, path, canonical }) })
    if (path === canonical) {
        sitemap.push({ path })
    }
}

// Tono list: linking every tono gives crawlers a path to them besides the sitemap
const listItems = config.scores.map((score, i) =>
    `    <li><a href="/tono/${i + 1}/">${escapeHtml(score.title)}</a></li>`).join("\n")
writePage("/tonos/", {
    head: renderHead({ title: `Tonos · ${SITE_NAME}`, description: SITE_DESCRIPTION, path: "/tonos/" }),
    body: `    <h1>Tonos del ${SITE_NAME}</h1>\n    <ol>\n${listItems}\n    </ol>`
})
sitemap.push({ path: "/tonos/", lastmod: lastModified(["src/assets/tonos-config.json"]) })

let withIntro = 0
let withPoem = 0
config.scores.forEach((score, i) => {
    const number = i + 1
    const path = `/tono/${number}/`
    const data = index.find((t) => t.number === number) ?? {}

    const introPath = score.introductionFile ? `${TONOS_DIR}/${score.path}/${score.introductionFile}` : null
    const introHtml = introPath && existsSync(introPath) ? renderMarkdown(readFileSync(introPath, "utf8")) : ""
    if (introHtml) {
        withIntro++
    }

    const meiPath = score.meiFile ? `${TONOS_DIR}/${score.path}/${score.meiFile}` : null
    const poemHtml = meiPath && existsSync(meiPath) ? renderPoem(meiPath) : ""
    if (poemHtml) {
        withPoem++
    }

    const title = `${score.title} · Tono ${number} · ${SITE_NAME}`
    const firstParagraph = stripTags(introHtml.match(/<p>(.*?)<\/p>/s)?.[1] ?? "")
    const description = truncate(
        `«${score.title}», tono ${number} del ${SITE_NAME}. `
        + (firstParagraph || "Edición crítica con partitura, texto poético y facsímiles."), 160)

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "MusicComposition",
        name: score.title,
        url: `${SITE}${path}`,
        inLanguage: "es",
        position: number,
        isPartOf: { "@type": "CreativeWork", name: SITE_NAME, url: `${SITE}/` },
    }
    const composer = personOrNull(data.music_author)
    const lyricist = personOrNull(data.text_author)
    if (composer) jsonLd.composer = composer
    if (lyricist) jsonLd.lyricist = lyricist

    const facts = [
        data.music_author ? `Música: ${data.music_author}.` : null,
        data.text_author ? `Texto: ${data.text_author}.` : null,
        data.organic ? `Orgánico: ${data.organic}.` : null,
    ].filter(Boolean).join(" ")

    const nav = [
        number > 1 ? `<a href="/tono/${number - 1}/" rel="prev">« ${escapeHtml(config.scores[i - 1].title)}</a>` : null,
        `<a href="/tonos/">Todos los tonos</a>`,
        number < config.scores.length ? `<a href="/tono/${number + 1}/" rel="next">${escapeHtml(config.scores[i + 1].title)} »</a>` : null,
    ].filter(Boolean).join(" · ")

    const body = [
        `    <h1>${escapeHtml(score.title)}</h1>`,
        `    <p>Tono ${number} del ${SITE_NAME}. ${escapeHtml(facts)}</p>`,
        introHtml,
        poemHtml ? `    <section id="texto">\n    <h2>Texto</h2>\n${poemHtml}\n    </section>` : null,
        `    <nav>${nav}</nav>`,
    ].filter(Boolean).join("\n")

    // The first figure of the introduction, if any, is the link preview image
    const figure = introHtml.match(/<img[^>]*src="(\/assets\/[^"]+)"/)?.[1]
    const image = figure ? `${SITE}${figure}` : undefined

    writePage(path, { head: renderHead({ title, description, path, jsonLd, image }), body })
    sitemap.push({ path, lastmod: lastModified([introPath, meiPath].filter((f) => f && existsSync(f))) })
})

writeFileSync(`${DIST}/sitemap.xml`, [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...sitemap.map(({ path, lastmod }) =>
        `  <url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`),
    `</urlset>`,
    ``,
].join("\n"))

writeFileSync(`${DIST}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

console.log(`Prerendered ${config.scores.length} tonos (${withIntro} with introduction, ${withPoem} with poem), tono list and static pages`)
