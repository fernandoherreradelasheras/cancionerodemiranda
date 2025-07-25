import { RefObject } from "react"
import tonosConfig from "./assets/tonos-config.json"

const STATUS_FILE = "status.json"

const TESTING_PATH = "/tonos/"

const VITE_TEST_URLS = import.meta.env.VITE_TEST_URLS

const TESTING = (VITE_TEST_URLS != undefined) ? true : false

export const config = TESTING ?
         { ...tonosConfig, settings: { ...tonosConfig.settings, basePath: TESTING_PATH } }
        : tonosConfig

export const statusUrl = config.settings.basePath + STATUS_FILE

export const latestPdfsPath = "/pdfs-release-latest.json"


export interface TranscriptionEntry {
  file: string,
  type?: string,
  append_to?: string,
  name?: string,
  label?: string
}

export enum TextStatus {
  "not started" = "not started",
  "raw transcription" = "raw transcription",
  "transcription completed" = "transcription completed",
  "reviewed" = "reviewed",
  "completed" = "completed"
}

export enum MusicStatus {
  "not started" = "not started",
  "raw transcription" = "raw transcription",
  "transcription completed" = "transcription completed",
  "all voices completed" = "all voices completed",
  "reviewed" = "reviewed",
  "completed" = "completed"
}

export type AudioOverlay = {
  staff: string,
  appLabel: string,
  url: string,
}

export type Mp3Files = {
  [key:string] : { base: string, overlays: AudioOverlay[] }
}


export type Pdf = {
  name: string,
  url: string
}

export interface TonoStatus {
  index: number;
  number: number;
  status_text: TextStatus;
  status_music: MusicStatus;
  music_author: string; // TODO: this is here so we can cache authors for the list view
  text_author: string; // TODO: same
  mei_unit: number;
  organic: string;
  pdfs: Pdf[];
}

export const getJson = async (url: string) => {
  const response = await fetch(url)
  return response.json()
};

export const getDocument = (e:RefObject<any>) =>
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

