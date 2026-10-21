import { RefObject } from "react"
import { ScoreViewerConfig, ScoreViewerConfigScore } from 'score-viewer';
import tonosConfig from "./assets/tonos-config.json"
import { tonoPath } from "./tonoPath.js"

const STATUS_FILE = "index.json"

// The viewer reads index.json, the MEI, the introductions and the audio from this site: the
// deploy publishes them under /tonos/ with the working placeholders of the introductions
// removed (see prerender.mjs), and the dev server serves them through public/tonos. The
// facsimile images stay on raw.githubusercontent.com (tonos.json), too big to deploy, unless
// VITE_TEST_URLS asks for the local copy behind public/facsimil-images.
const TONOS_PATH = "/tonos/"
const TESTING_IMAGES_PATH = "/facsimil-images/"

const VITE_TEST_URLS = import.meta.env.VITE_TEST_URLS

const TESTING = (VITE_TEST_URLS != undefined) ? true : false

export const config: ScoreViewerConfig = {
  ...tonosConfig,
  settings: {
    ...tonosConfig.settings,
    basePath: TONOS_PATH,
    ...(TESTING ? { facsimileImagesPath: TESTING_IMAGES_PATH } : {}),
  },
} as ScoreViewerConfig

// tonos.json carries, besides the configuration of the viewer, the slug of each tono page (see
// tonoPath.js), which the viewer ignores
export type TonoScore = ScoreViewerConfigScore & { slug: string }

// Path of a tono page by its number (1-based). A number with no tono goes to the list
export const pathOfTono = (number: number) => {
  const score = config.scores[number - 1] as TonoScore | undefined
  return score ? tonoPath(number, score.slug) : "/tonos/"
}

export const statusUrl = config.settings.basePath + STATUS_FILE

export const latestPdfsPath = "/pdfs-release-latest.json"


export interface TranscriptionEntry {
  file: string,
  type?: string,
  append_to?: string,
  name?: string,
  label?: string
}

/**
 * Edition phases of a tono, in working order. status.json records the state of
 * each one; scripts/build_index.py marks as "n/a" the ones that do not apply
 * to the tono according to its MEI, and writes the full map to index.json.
 */
export type PhaseState = "pending" | "in_progress" | "done" | "n/a"

export type PhaseKey = "text" | "text_review" | "music" | "music_review" |
  "voice" | "voice_review" | "guion" | "guion_review" | "full_review" |
  "facsimile" | "external_review" | "intro"

// short names the phase within its group, for column headers
export type PhaseGroup = { label: string, phases: { key: PhaseKey, label: string, short: string }[] }

export const PHASE_GROUPS: PhaseGroup[] = [
  {
    label: "Texto", phases: [
      { key: "text", label: "Transcripción del texto", short: "Transcripción" },
      { key: "text_review", label: "Revisión del texto", short: "Revisión" },
    ]
  },
  {
    label: "Música", phases: [
      { key: "music", label: "Transcripción musical", short: "Transcripción" },
      { key: "music_review", label: "Revisión de la transcripción musical", short: "Revisión" },
    ]
  },
  {
    label: "Reconstrucción", phases: [
      { key: "voice", label: "Reconstrucción de la voz perdida", short: "Voz" },
      { key: "voice_review", label: "Revisión de la voz reconstruida", short: "Rev. voz" },
      { key: "guion", label: "Reconstrucción del guion", short: "Guion" },
      { key: "guion_review", label: "Revisión del guion reconstruido", short: "Rev. guion" },
      { key: "full_review", label: "Revisión musical completa", short: "Rev. completa" },
    ]
  },
  {
    label: "Edición", phases: [
      { key: "facsimile", label: "Enlace con el facsímil", short: "Facsímil" },
      { key: "external_review", label: "Revisión musical externa", short: "Rev. externa" },
      { key: "intro", label: "Estudio introductorio", short: "Estudio" },
    ]
  },
]

export const PHASES = PHASE_GROUPS.flatMap(group => group.phases)

export const phaseLabel = (key: PhaseKey | null) =>
  PHASES.find(phase => phase.key == key)?.label ?? ""

export const PHASE_STATE_LABELS: Record<PhaseState, string> = {
  "done": "hecho",
  "in_progress": "en curso",
  "pending": "pendiente",
  "n/a": "no aplica",
}

export type AudioOverlay = {
  staff: string,
  appLabel: string,
  url: string,
}

export type Mp3Files = {
  [key: string]: { base: string, overlays: AudioOverlay[] }
}


export type Pdf = {
  name: string,
  url: string
}

export interface TonoStatus {
  index: number;
  number: number;
  path: string;
  phases: Record<PhaseKey, PhaseState>;
  progress: number;              // 0-1, a phase in progress counts half
  next_phase: PhaseKey | null;   // first phase not done, in working order
  complete: boolean;             // every phase that applies is done
  // Derived from each tono's MEI and cached in tonos/index.json (see
  // scripts/build_index.py). The MEI is the source of truth.
  music_author: string;
  text_author: string;
  organic: string;
  reconstructed: boolean;  // has editorially reconstructed voices
  incomplete: boolean;     // has voices that are part of the organic but lost
  mei_unit: number;
  pdfs: Pdf[];
}

export const getJson = async (url: string) => {
  const response = await fetch(url)
  return response.json()
};

export const getDocument = (e: RefObject<any>) =>
  //@ts-ignore
  e.current.ownerDocument

export const compareArrays = (a: any, b: any) =>
  a.length === b.length && a.every((element: any, index: number) => element === b[index]);

export const calcHighlightScaling = (nVerses: number) => {
  if (nVerses < 2) {
    return 1.3
  } else if (nVerses == 2) {
    return 1.2
  } else if (nVerses == 3) {
    return 1.1
  } else {
    return 1.0
  }
}

export type ScoreStats = {
  notes: string[]
  measures: number
  editor?: string
}


/**
 * Per phase count of tonos in each state, over the tonos it applies to
 */
export type PhaseStats = Record<PhaseKey, Record<PhaseState, number>>

export interface TonoStatusStats {
  phases: PhaseStats;
  progress: number;    // 0-1, over every phase that applies in every tono
  completed: number;   // tonos with every phase done
}

export function calculateTonoStats(
  scores: ScoreViewerConfigScore[],
  statuses: TonoStatus[]
): TonoStatusStats {
  const phases = Object.fromEntries(PHASES.map(({ key }) =>
    [key, { "done": 0, "in_progress": 0, "pending": 0, "n/a": 0 }])) as PhaseStats
  let weight = 0
  let applicable = 0
  let completed = 0

  scores.forEach((_, index) => {
    const tonoStatus = statuses[index]
    if (!tonoStatus) return
    if (tonoStatus.complete) completed++
    PHASES.forEach(({ key }) => {
      const state = tonoStatus.phases[key]
      phases[key][state]++
      if (state != "n/a") {
        applicable++
        weight += state == "done" ? 1 : state == "in_progress" ? 0.5 : 0
      }
    })
  })

  return { phases, progress: applicable > 0 ? weight / applicable : 0, completed }
}
