// Tests for strip-placeholders.mjs, and agreement with its Python twin used by the PDFs.
// Run from web-app/: node --test scripts/strip-placeholders.test.mjs

import { test } from "node:test"
import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { stripPlaceholders, hasPlaceholders, reconstructedVoices, withAltoNotice } from "./strip-placeholders.mjs"

const TONOS = "../tonos"
const PYTHON_FILTER = "../pdf-generation/scripts/strip_placeholders.py"

// The same files as prerender.mjs: those named in tonos.json
const tonos = () => JSON.parse(readFileSync(`${TONOS}/tonos.json`, "utf8")).scores
    .filter((score) => score.introductionFile)
    .map((score) => ({
        intro: `${TONOS}/${score.path}/${score.introductionFile}`,
        mei: score.meiFile ? `${TONOS}/${score.path}/${score.meiFile}` : null,
    }))
const intros = () => tonos().map((t) => t.intro)
const publish = ({ intro, mei }) => withAltoNotice(stripPlaceholders(readFileSync(intro, "utf8")),
    mei ? reconstructedVoices(readFileSync(mei, "utf8")) : [])

test("a section holding only a placeholder goes, heading included", () => {
    const md = "Apertura.\n\n## La música\n\n*[TODO: comentario musical.]*\n\n## La edición\n\nTexto.\n"
    assert.equal(stripPlaceholders(md), "Apertura.\n\n## La edición\n\nTexto.\n")
})

test("an opening placeholder goes", () => {
    assert.equal(stripPlaceholders("*[TODO: apertura.]*\n\n## El texto\n\nUno.\n"), "## El texto\n\nUno.\n")
})

test("a placeholder over several lines goes, the prose around it stays", () => {
    const md = "## Fuentes\n\nPrimero.\n\n*[TODO: una nota\nde varias\nlíneas.]*\n\n## La música\n\nSegundo.\n"
    assert.equal(stripPlaceholders(md), "## Fuentes\n\nPrimero.\n\n## La música\n\nSegundo.\n")
})

test("brackets inside a placeholder do not end it", () => {
    assert.equal(stripPlaceholders("Uno.\n\n*[TODO: alto (Tiple, [Alto], Tenor).]*\n"), "Uno.\n")
})

test("a plain TODO line goes, and so does a trailing TODO in a footnote", () => {
    const md = "La voz es reconstrucción.\nTODO: comments\n\n[^a]: Referencia. TODO: actualizar.\n"
    assert.equal(stripPlaceholders(md), "La voz es reconstrucción.\n\n[^a]: Referencia.\n")
})

test("a parent heading whose subsections all emptied goes", () => {
    const md = "## Fuentes\n\n### Testimonios\n\n*[TODO: x]*\n\n## La música\n\nSí.\n"
    assert.equal(stripPlaceholders(md), "## La música\n\nSí.\n")
})

test("a heading followed by a subsection with content stays", () => {
    const md = "## Fuentes\n\n### Testimonios\n\nTexto.\n"
    assert.equal(stripPlaceholders(md), md)
})

test("two trailing spaces (a line break) survive", () => {
    const md = "Verso uno  \nverso dos\n"
    assert.equal(stripPlaceholders(md), md)
})

test("no introduction keeps a placeholder, and a clean one is left untouched", () => {
    for (const file of intros()) {
        const md = readFileSync(file, "utf8")
        const out = stripPlaceholders(md)
        assert.ok(!hasPlaceholders(out), `${file} keeps a TODO`)
        if (!hasPlaceholders(md)) {
            assert.equal(out, md, `${file} has no TODO but was changed`)
        }
    }
})

test("the reconstructed alto is stated first in La edición, creating it if needed", () => {
    assert.equal(withAltoNotice("Uno.\n\n## La edición\n\nCriterios.\n", ["Alto"]),
        "Uno.\n\n## La edición\n\nLa voz del alto, cuyo librete está perdido, es reconstrucción editorial.\n\nCriterios.\n")
    assert.equal(withAltoNotice("Uno.\n", ["Alto 2º"]),
        "Uno.\n\n## La edición\n\nLa voz del alto 2º, cuyo librete está perdido, es reconstrucción editorial.\n")
    assert.match(withAltoNotice("Uno.\n", ["Alto", "Guion"]), /Tanto la voz del alto, cuyo librete está perdido, como el guion son reconstrucción editorial\./)
})

test("no notice when the text already says it, or nothing is reconstructed", () => {
    const said = "## La edición\n\nLa voz de alto es reconstrucción editorial.\n"
    assert.equal(withAltoNotice(said, ["Alto"]), said)
    assert.equal(withAltoNotice("Uno.\n", []), "Uno.\n")
})

test("every tono with a reconstructed alto states it in its published introduction", () => {
    for (const tono of tonos()) {
        const voices = tono.mei ? reconstructedVoices(readFileSync(tono.mei, "utf8")) : []
        if (voices.some((v) => /^alto/i.test(v))) {
            assert.ok(publish(tono).split(/\n\s*\n/).some((p) => /reconstru/i.test(p) && /\balto\b/i.test(p)), tono.intro)
        }
    }
})

test("the Python filter of the PDFs agrees on every introduction", () => {
    for (const tono of tonos()) {
        const args = [PYTHON_FILTER, tono.intro, ...(tono.mei ? ["--mei", tono.mei] : [])]
        assert.equal(execFileSync("python3", args, { encoding: "utf8" }), publish(tono), tono.intro)
    }
})
