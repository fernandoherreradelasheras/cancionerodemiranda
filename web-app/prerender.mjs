// Writes a static entry point for each route served by GitHub Pages. The app is a SPA, so
// crawlers that do not run JavaScript (and link previews) would get the same empty page with
// the same title for all 77 tonos. Each tono page carries its own metadata and, outside #root
// so that React does not wipe it on mount, the introduction and the poem rendered as plain
// HTML: the same text the app shows in its introduction and text tabs.
//
// It also publishes the files the score viewer reads from its basePath (/tonos/: index.json
// and, per tono, the MEI, the introduction and the audio), so that the app loads them from
// this site instead of raw.githubusercontent.com. The introductions go out without their
// working placeholders (*[TODO: …]*, see scripts/strip-placeholders.mjs), both here and in
// the static pages.
//
// Also writes sitemap.xml and robots.txt.
//
// Run after `vite build`, from web-app/ (see create_static_entry_points.sh).

import { execFileSync } from "node:child_process"
import { copyFileSync, lstatSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { micromark } from "micromark"
import { DOMParser } from "@xmldom/xmldom"
import { gfm, gfmHtml } from "micromark-extension-gfm"
import { reconstructedVoices, stripPlaceholders, withAltoNotice } from "./scripts/strip-placeholders.mjs"
import { legacyTonoPath, tonoPath } from "./src/tonoPath.js"

const SITE = "https://cdm.humanoydivino.com"
const SITE_NAME = "Cancionero de Miranda"
const DIST = "dist"
const TONOS_DIR = "../tonos"

const DEFAULT_IMAGE = `${SITE}/humano-y-divino-logo1.jpg`
const EDITOR = { "@type": "Person", name: "Fernando Herrera de las Heras" }

// The poems are in Spanish except this one
const POEM_LANGUAGE = { 44: "pt" }

const SITE_DESCRIPTION = "Edición crítica en curso del Cancionero de Miranda: 77 tonos humanos "
    + "del siglo XVII con partitura, texto poético, facsímiles y audio."

const LIST_DESCRIPTION = "Los 77 tonos del Cancionero de Miranda, con el estado de edición de cada "
    + "uno y acceso a su partitura, su texto poético y los facsímiles del manuscrito."

const PROGRESS_DESCRIPTION = "Estado de la edición del Cancionero de Miranda tono a tono: "
    + "transcripción del texto, transcripción de la música y reconstrucción de la voz de alto."

const config = JSON.parse(readFileSync("src/assets/tonos-config.json", "utf8"))
const index = JSON.parse(readFileSync(`${TONOS_DIR}/index.json`, "utf8"))
const status = JSON.parse(readFileSync(`${TONOS_DIR}/status.json`, "utf8"))
const introDone = new Set(status.filter((t) => t.phases?.intro === "done").map((t) => t.number))

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

// build_index.py writes "[Anónimo]" when the MEI names no author: like the tono list, the
// pages only name known authors
const isKnownAuthor = (name) => !!name && !["Anónimo", "[Anónimo]"].includes(name)

// Only plain names go into structured data: attributions in brackets or with question
// marks, and split authorships, stay in the visible text only
const personOrNull = (name) =>
    isKnownAuthor(name) && !/[[\]¿?/()]/.test(name) ? { "@type": "Person", name } : null

const footnoteLabels = { label: "Notas", backLabel: (i) => `Volver a la llamada ${i + 1}` }

const renderMarkdown = (md) => micromark(md, { extensions: [gfm()], htmlExtensions: [gfmHtml(footnoteLabels)] })
    .replace(/(<img[^>]*src=")assets\//g, "$1/assets/")

// The poem lives in the MEI <back>. Same reading as the text tab of score-viewer: each top
// level <lg> is a section titled by @label or @type, its child <lg> are the strophes, and
// the verses drop their <annot> (the text notes belong to the apparatus). Also returns the
// first strophe, for the structured data and the description
const MEI_NS = "http://www.music-encoding.org/ns/mei"
const childrenNamed = (el, name) => Array.from(el.childNodes).filter((n) => n.nodeType === 1 && n.localName === name)
const capitalize = (s) => s.length ? s[0].toUpperCase() + s.slice(1) : s

const verseText = (l) => Array.from(l.childNodes)
    .filter((n) => n.nodeType === 3 || (n.nodeType === 1 && n.localName !== "annot"))
    .map((n) => n.textContent ?? "").join("")
    .replace(/\s+/g, " ").trim()

const readPoem = (meiPath) => {
    const doc = new DOMParser().parseFromString(readFileSync(meiPath, "utf8"), "text/xml")
    const poem = Array.from(doc.getElementsByTagNameNS(MEI_NS, "div"))
        .find((d) => d.getAttribute("type") === "poem" && d.parentNode?.localName === "back")
    if (!poem) {
        return { html: "", firstStrophe: [] }
    }
    let firstStrophe = []
    const html = childrenNamed(poem, "lg").map((section) => {
        const label = (section.getAttribute("label") ?? "").trim() || capitalize(section.getAttribute("type") ?? "")
        const strophes = childrenNamed(section, "lg")
        const stanzas = (strophes.length ? strophes : [section]).map((lg) => {
            const verses = childrenNamed(lg, "l").map(verseText)
            if (!firstStrophe.length) {
                firstStrophe = verses
            }
            return `    <p>${verses.map(escapeHtml).join("<br />\n")}</p>`
        })
        return [label ? `    <h3>${escapeHtml(label)}</h3>` : null, ...stanzas].filter(Boolean).join("\n")
    }).join("\n")
    return { html, firstStrophe }
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

// Pages whose React view has its own <h1> (the home page and the progress report) mark their
// static block as transient: main.tsx removes it once the app is up, so that the rendered
// page has exactly one <h1>, as does the HTML as served. The tono pages and the list keep
// theirs: the app shows the same title and text in its own view
const writePage = (path, { head, body, transient }) => {
    let html = template
        .replace(/<html lang="[^"]*">/, `<html lang="es">`)
        .replace(/<title>.*?<\/title>/s, head)
    if (body) {
        html = html.replace(`<div id="root"></div>`,
            `<div id="root"></div>${BODY_START}\n  <article id="static-content"${transient ? " data-transient" : ""}>\n${body}\n  </article>${BODY_END}`)
    }
    const dir = `${DIST}${path}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}index.html`, html)
}

// Every tono needs its own slug in tonos.json, plain ASCII (scripts/tono-slugs.mjs adds the
// missing ones): without it the page would have no address
const slugs = new Set()
for (const score of config.scores) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(score.slug ?? "") || slugs.has(score.slug)) {
        throw new Error(`Tono ${score.path}: missing, invalid or repeated slug "${score.slug ?? ""}"`
            + " in tonos.json (see scripts/tono-slugs.mjs)")
    }
    slugs.add(score.slug)
}

const pathOf = (number) => tonoPath(number, config.scores[number - 1].slug)

const tonoLink = (number) =>
    `<a href="${pathOf(number)}">${escapeHtml(config.scores[number - 1].title)}</a>`

const sitemap = []

// The old address of a page (see src/tonoPath.js): an immediate meta refresh, which Google
// treats as a permanent redirect (GitHub Pages cannot send a 301), with the canonical and a
// plain link for anything that ignores both. It does not load the app, and stays out of the
// sitemap
const writeRedirect = (from, to, title) => {
    const url = `${SITE}${to}`
    const dir = `${DIST}${from}`
    mkdirSync(dir, { recursive: true })
    writeFileSync(`${dir}index.html`, [
        `<!doctype html>`,
        `<html lang="es">`,
        `<head>`,
        `  <meta charset="UTF-8" />`,
        `  <title>${escapeHtml(title)}</title>`,
        `  <link rel="canonical" href="${url}" />`,
        `  <meta http-equiv="refresh" content="0; url=${url}" />`,
        `  <script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script>`,
        `</head>`,
        `<body>`,
        `  <p>Esta página se ha trasladado a <a href="${url}">${url}</a>.</p>`,
        `</body>`,
        `</html>`,
        ``,
    ].join("\n"))
}

// Home, about and progress: the content is React, and a summary of it goes into the static
// block, which is also where these pages get their h1 (crawlers that do not run JavaScript
// see no heading otherwise). The index route renders About, so /about/ is a duplicate of /
// and points its canonical there
const studied = [...introDone].sort((a, b) => a - b)
const HOME_BODY = `    <h1>${SITE_NAME}</h1>
    <p>Edición crítica en curso del Cancionero de Miranda, una colección de 77 tonos humanos
    (76 en castellano y uno en portugués) reunida en la Capilla Real de Lisboa a finales del
    siglo XVII por Domingos de Miranda da Costa. Se conserva en cuatro libretes de partes, en
    la Biblioteca Nacional de Portugal (M.M. 4802/1-2 y M.M. 4803) y en el Arquivo Nacional
    Torre do Tombo (PT/TT/MUS/L122); el del alto se ha perdido.</p>
    <p>Cada tono se publica con su partitura, su texto poético, los facsímiles del manuscrito,
    una introducción de estudio, audio y dos versiones imprimibles, una para musicólogos y otra
    para intérpretes. Las voces perdidas se reconstruyen en el estilo del propio cancionero.</p>
    <p>Tonos con estudio introductorio completo: ${studied.map(tonoLink).join(", ")}.</p>
    <nav><a href="/tonos/">Listado de los 77 tonos</a> · <a href="/progreso/">Progreso de la edición</a></nav>`

const PROGRESS_BODY = `    <h1>Progreso de la edición</h1>
    <p>${PROGRESS_DESCRIPTION}</p>
    <nav><a href="/tonos/">Listado de tonos</a> · <a href="/">Acerca del proyecto</a></nav>`

const HOME_JSON_LD = {
    "@context": "https://schema.org",
    "@graph": [
        { "@type": "WebSite", name: SITE_NAME, url: `${SITE}/`, inLanguage: "es" },
        {
            "@type": "CreativeWork",
            name: SITE_NAME,
            url: `${SITE}/`,
            description: SITE_DESCRIPTION,
            inLanguage: "es",
            editor: EDITOR,
            hasPart: { "@type": "CollectionPage", name: `Tonos del ${SITE_NAME}`, url: `${SITE}/tonos/` },
        },
    ],
}

for (const [path, title, canonical, description, body, jsonLd, lastmodFiles] of [
    ["/", SITE_NAME, "/", SITE_DESCRIPTION, HOME_BODY, HOME_JSON_LD, ["src/About.tsx"]],
    ["/about/", `Acerca del ${SITE_NAME}`, "/", SITE_DESCRIPTION, HOME_BODY, HOME_JSON_LD, []],
    ["/progreso/", `Progreso de la edición · ${SITE_NAME}`, "/progreso/", PROGRESS_DESCRIPTION, PROGRESS_BODY, null,
        [`${TONOS_DIR}/status.json`]],
]) {
    writePage(path, { head: renderHead({ title, description, path, canonical, jsonLd }), body, transient: true })
    if (path === canonical) {
        sitemap.push({ path, lastmod: lastModified(lastmodFiles) })
    }
}

// Tono list: linking every tono gives crawlers a path to them besides the sitemap
const listItems = config.scores.map((score, i) => `    <li>${tonoLink(i + 1)}</li>`).join("\n")
writePage("/tonos/", {
    head: renderHead({ title: `Tonos · ${SITE_NAME}`, description: LIST_DESCRIPTION, path: "/tonos/" }),
    body: `    <h1>Tonos del ${SITE_NAME}</h1>\n    <ol>\n${listItems}\n    </ol>`
})
// The configuration is read through a symlink (src/assets/tonos-config.json), which git
// dates by the link itself: the real file is the one that changes
sitemap.push({ path: "/tonos/", lastmod: lastModified([`${TONOS_DIR}/tonos.json`]) })

// The files the score viewer reads from its basePath (see src/utils.tsx). dist/tonos is a
// copy only when building locally with the public/tonos symlink; never write through a link
const publishDir = `${DIST}/tonos`
if (existsSync(publishDir) && lstatSync(publishDir).isSymbolicLink()) {
    throw new Error(`${publishDir} is a symbolic link: refusing to write the published introductions through it`)
}
const publish = (relative, content) => {
    const target = `${publishDir}/${relative}`
    mkdirSync(target.slice(0, target.lastIndexOf("/")), { recursive: true })
    if (content === undefined) {
        copyFileSync(`${TONOS_DIR}/${relative}`, target)
    } else {
        writeFileSync(target, content)
    }
}
publish("index.json")

let withIntro = 0
let withPoem = 0
config.scores.forEach((score, i) => {
    const number = i + 1
    const path = pathOf(number)
    const data = index.find((t) => t.number === number) ?? {}

    const introPath = score.introductionFile ? `${TONOS_DIR}/${score.path}/${score.introductionFile}` : null
    const meiPath = score.meiFile ? `${TONOS_DIR}/${score.path}/${score.meiFile}` : null
    const meiText = meiPath && existsSync(meiPath) ? readFileSync(meiPath, "utf8") : ""
    const introMd = introPath && existsSync(introPath)
        ? withAltoNotice(stripPlaceholders(readFileSync(introPath, "utf8")), reconstructedVoices(meiText))
        : ""
    const introHtml = introMd.trim() ? renderMarkdown(introMd) : ""
    if (introPath && existsSync(introPath)) {
        publish(`${score.path}/${score.introductionFile}`, introMd)
    }
    if (introHtml) {
        withIntro++
    }

    const poem = meiPath && existsSync(meiPath) ? readPoem(meiPath) : { html: "", firstStrophe: [] }
    if (poem.html) {
        withPoem++
    }
    if (meiPath && existsSync(meiPath)) {
        publish(`${score.path}/${score.meiFile}`)
    }
    for (const audio of score.audioFiles ?? []) {
        if (audio.file && existsSync(`${TONOS_DIR}/${score.path}/${audio.file}`)) {
            publish(`${score.path}/${audio.file}`)
        }
    }

    const language = POEM_LANGUAGE[number] ?? "es"
    const authors = [
        isKnownAuthor(data.music_author) ? `Música: ${data.music_author}.` : null,
        isKnownAuthor(data.text_author) ? `Texto: ${data.text_author}.` : null,
    ].filter(Boolean)
    const facts = [...authors, data.organic ? `Orgánico: ${data.organic}.` : null].filter(Boolean).join(" ")

    // The description comes from the opening paragraph, which is the tono's own summary. An
    // introduction whose opening is still to be written starts with a section heading, and its
    // first paragraphs may be shared with the other tonos of its block: then the description is
    // built from the data and the incipit instead
    const opening = introMd.split(/^#{1,6}\s/m)[0].trim()
    const openingText = opening ? stripTags(renderMarkdown(opening).match(/<p>(.*?)<\/p>/s)?.[1] ?? "") : ""
    const incipit = poem.firstStrophe[0]?.replace(/[\s,;:.]+$/, "")
    const title = `${score.title} · Tono ${number} · ${SITE_NAME}`
    const description = truncate(
        `«${score.title}», tono ${number} del ${SITE_NAME}. `
        + (openingText || [
            data.organic ? `Para ${data.organic.replace(/[[\]]/g, "")}.` : null,
            ...authors,
            incipit ? `Comienza «${incipit}».` : null,
            "Partitura, texto poético y facsímiles.",
        ].filter(Boolean).join(" ")), 160)

    const composition = {
        "@type": "MusicComposition",
        "@id": `${SITE}${path}#tono`,
        name: score.title,
        url: `${SITE}${path}`,
        description,
        inLanguage: language,
        position: number,
        isPartOf: { "@type": "CreativeWork", name: SITE_NAME, url: `${SITE}/` },
    }
    const composer = personOrNull(data.music_author)
    const lyricist = personOrNull(data.text_author)
    if (composer) composition.composer = composer
    if (lyricist) composition.lyricist = lyricist
    if (poem.firstStrophe.length) {
        composition.lyrics = { "@type": "CreativeWork", inLanguage: language, text: poem.firstStrophe.join("\n") }
    }
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            composition,
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE}/` },
                    { "@type": "ListItem", position: 2, name: "Tonos", item: `${SITE}/tonos/` },
                    { "@type": "ListItem", position: 3, name: score.title, item: `${SITE}${path}` },
                ],
            },
        ],
    }

    const nav = [
        number > 1 ? `<a href="${pathOf(number - 1)}" rel="prev">« ${escapeHtml(config.scores[i - 1].title)}</a>` : null,
        `<a href="/tonos/">Todos los tonos</a>`,
        number < config.scores.length ? `<a href="${pathOf(number + 1)}" rel="next">${escapeHtml(config.scores[i + 1].title)} »</a>` : null,
    ].filter(Boolean).join(" · ")

    const langAttribute = language === "es" ? "" : ` lang="${language}"`
    const body = [
        `    <h1>${escapeHtml(score.title)}</h1>`,
        `    <p>Tono ${number} del ${SITE_NAME}. ${escapeHtml(facts)}</p>`,
        introHtml,
        poem.html ? `    <section id="texto"${langAttribute}>\n    <h2>Texto</h2>\n${poem.html}\n    </section>` : null,
        `    <nav>${nav}</nav>`,
    ].filter(Boolean).join("\n")

    // The first figure of the introduction, if any, is the link preview image
    const figure = introHtml.match(/<img[^>]*src="(\/assets\/[^"]+)"/)?.[1]
    const image = figure ? `${SITE}${figure}` : undefined

    writePage(path, { head: renderHead({ title, description, path, jsonLd, image }), body })
    writeRedirect(legacyTonoPath(number), path, title)
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

console.log(`Prerendered ${config.scores.length} tonos (${withIntro} with introduction, ${withPoem} with poem), tono list and static pages; published the viewer files under /tonos/`)
