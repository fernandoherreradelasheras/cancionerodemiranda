// Removes the working placeholders from an introduction before it is published. The
// sources in tonos/NN/*-intro.md keep them as notes for the editors; the website, its
// static pages and the PDFs show only finished text.
//
// Two forms of placeholder:
//   *[TODO: …]*   a paragraph of its own, possibly over several lines
//   TODO: …       up to the end of the line, alone or after other text (a footnote)
// Once they are gone, a heading left with nothing under it goes too, and so does a parent
// heading whose subsections all went. withAltoNotice() then puts back the one statement the
// published text cannot lack: that the alto is an editorial reconstruction.
//
// pdf-generation/scripts/strip_placeholders.py implements the same rules for the PDFs;
// scripts/strip-placeholders.test.mjs checks that both agree on every introduction.
//
// Usage as a script (never on the sources, which keep their placeholders):
//   node scripts/strip-placeholders.mjs IN.md [OUT.md] [--mei TONO.mei]

import { readFileSync, writeFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const BRACKETED = /\*\[TODO[\s\S]*?\]\*/g
const PLAIN = /[ \t]*\bTODO:[^\n]*/g
const HEADING = /^(#{1,6})\s/

const headingLevel = (line) => HEADING.exec(line)?.[1].length ?? 0

// Drop every heading that has no content before the next heading of the same or a higher
// level, repeating so that emptied parents go as well
const dropEmptyHeadings = (lines) => {
    for (;;) {
        const keep = lines.map(() => true)
        let changed = false
        lines.forEach((line, i) => {
            const level = headingLevel(line)
            if (!level) {
                return
            }
            let j = i + 1
            while (j < lines.length && lines[j].trim() === "") {
                j++
            }
            const next = j < lines.length ? headingLevel(lines[j]) : -1
            if (next === -1 || (next > 0 && next <= level)) {
                keep[i] = false
                changed = true
            }
        })
        lines = lines.filter((_, i) => keep[i])
        if (!changed) {
            return lines
        }
    }
}

export const stripPlaceholders = (md) => {
    const text = md.replace(BRACKETED, "").replace(PLAIN, "")
    // Lines left blank lose their spaces; the others keep them (two trailing spaces are a
    // line break in Markdown)
    const lines = dropEmptyHeadings(text.split("\n").map((line) => line.trim() === "" ? "" : line))
    return lines.join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\n+/, "")
        .replace(/\n*$/, "\n")
}

export const hasPlaceholders = (md) => /\bTODO\b/.test(md)

// The voices the MEI declares as editorial reconstructions of the lost alto book (the
// <perfRes> whose @source is #alto-part-recomposition), by their label: "Alto", "Alto 2º"…
const RECONSTRUCTED = /<perfRes\b[^>]*\bsource="#alto-part-recomposition"[^>]*>([^<]*)<\/perfRes>/g
export const reconstructedVoices = (mei) => [...mei.matchAll(RECONSTRUCTED)].map((m) => m[1].trim())

// Every tono whose alto is a reconstruction has to say so in its introduction (CLAUDE.md).
// While the paragraph that explains it is still a placeholder, the published text carries
// the standard sentence instead, first in "La edición" (created if the filtering removed it)
const mentionsReconstruction = (md) =>
    md.split(/\n\s*\n/).some((p) => /reconstru/i.test(p) && /\balto\b/i.test(p))

export const altoNotice = (voices) => {
    const alto = voices.find((v) => /^alto/i.test(v))
    if (!alto) {
        return null
    }
    const name = `del ${alto.toLowerCase()}`
    return voices.some((v) => /^guion/i.test(v))
        ? `Tanto la voz ${name}, cuyo librete está perdido, como el guion son reconstrucción editorial.`
        : `La voz ${name}, cuyo librete está perdido, es reconstrucción editorial.`
}

export const withAltoNotice = (md, voices) => {
    const notice = altoNotice(voices)
    if (!notice || mentionsReconstruction(md)) {
        return md
    }
    const heading = /^## La edición[ \t]*$/m
    return heading.test(md)
        ? md.replace(heading, (h) => `${h}\n\n${notice}`)
        : `${md.replace(/\n*$/, "")}\n\n## La edición\n\n${notice}\n`
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
    const args = process.argv.slice(2)
    const meiAt = args.indexOf("--mei")
    const mei = meiAt >= 0 ? args.splice(meiAt, 2)[1] : null
    if (args.length === 1 || args.length === 2) {
        let out = stripPlaceholders(readFileSync(args[0], "utf8"))
        if (mei) {
            out = withAltoNotice(out, reconstructedVoices(readFileSync(mei, "utf8")))
        }
        if (args[1]) {
            writeFileSync(args[1], out)
        } else {
            process.stdout.write(out)
        }
    } else {
        console.error("Usage: strip-placeholders.mjs IN.md [OUT.md] [--mei TONO.mei]")
        process.exit(2)
    }
}
