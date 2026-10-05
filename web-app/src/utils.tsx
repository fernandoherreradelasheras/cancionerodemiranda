import { RefObject } from "react"
import { ScoreViewerConfig, ScoreViewerConfigScore } from 'score-viewer';
import tonosConfig from "./assets/tonos-config.json"

const STATUS_FILE = "index.json"

const TESTING_PATH = "/tonos/"
const TESTING_IMAGES_PATH = "/facsimil-images/"

const VITE_TEST_URLS = import.meta.env.VITE_TEST_URLS

const TESTING = (VITE_TEST_URLS != undefined) ? true : false

export const config: ScoreViewerConfig = (TESTING ?
  { ...tonosConfig, settings: { ...tonosConfig.settings, basePath: TESTING_PATH, facsimileImagesPath: TESTING_IMAGES_PATH } }
  : tonosConfig) as ScoreViewerConfig

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
  "external_review" | "intro"

export type PhaseGroup = { label: string, phases: { key: PhaseKey, label: string }[] }

export const PHASE_GROUPS: PhaseGroup[] = [
  {
    label: "Texto", phases: [
      { key: "text", label: "Transcripción del texto" },
      { key: "text_review", label: "Revisión del texto" },
    ]
  },
  {
    label: "Música", phases: [
      { key: "music", label: "Transcripción musical" },
      { key: "music_review", label: "Revisión de la transcripción musical" },
    ]
  },
  {
    label: "Reconstrucción", phases: [
      { key: "voice", label: "Reconstrucción de la voz perdida" },
      { key: "voice_review", label: "Revisión de la voz reconstruida" },
      { key: "guion", label: "Reconstrucción del guion" },
      { key: "guion_review", label: "Revisión del guion reconstruido" },
      { key: "full_review", label: "Revisión musical completa" },
    ]
  },
  {
    label: "Edición", phases: [
      { key: "external_review", label: "Revisión musical externa" },
      { key: "intro", label: "Estudio introductorio" },
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
