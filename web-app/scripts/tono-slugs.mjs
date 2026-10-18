// Gives a slug to every tono in tonos/tonos.json that lacks one, made from its title: plain
// ASCII, accents and tildes dropped (ñ → n), anything else turned into hyphens. The slug is
// the last part of the page address, /tono/<number>/<slug>/ (see src/tonoPath.js), and once
// written it is not regenerated: correcting a title later keeps the published address.
//
// Usage, from web-app/:
//   node scripts/tono-slugs.mjs           lists the tonos without a slug and the one proposed
//   node scripts/tono-slugs.mjs --write   adds them to tonos.json, after each title

import { readFileSync, writeFileSync } from "node:fs"

const TONOS_JSON = "../tonos/tonos.json"

export const slugify = (title) => title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const write = process.argv.includes("--write")
const source = readFileSync(TONOS_JSON, "utf8")
const { scores } = JSON.parse(source)
const missing = scores.filter((score) => !score.slug)

if (missing.length === 0) {
    console.log("Every tono has a slug")
    process.exit(0)
}

for (const score of missing) {
    console.log(`${score.path}  ${slugify(score.title)}`)
}

if (write) {
    // A text edit and not JSON.stringify, which would lose the layout of the file. Each slug
    // goes on the line after its title, with the same indentation
    let output = source
    for (const score of missing) {
        const titleLine = new RegExp(`^( *)"title": ${JSON.stringify(score.title).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\n`, "m")
        const match = output.match(titleLine)
        if (!match) {
            throw new Error(`No "title" line for tono ${score.path} in ${TONOS_JSON}`)
        }
        output = output.replace(titleLine, `${match[0]}${match[1]}"slug": "${slugify(score.title)}",\n`)
    }
    JSON.parse(output)
    writeFileSync(TONOS_JSON, output)
    console.log(`Written ${missing.length} slugs to ${TONOS_JSON}`)
}
