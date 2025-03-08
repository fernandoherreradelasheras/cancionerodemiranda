import { RefObject } from "react"

const VITE_TEST_URLS = import.meta.env.VITE_TEST_URLS

const TESTING = (VITE_TEST_URLS != undefined) ? true : false

export const repoRoot = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/"
const tonoDefinitionsPath = "tonos/definitions.json"

export const tonoDefinitionsUrl = TESTING ? "/definitions.json"  : repoRoot + tonoDefinitionsPath

export const latestPdfsPath = "/pdfs-release-latest.json"

export const getTonoUrl = (path: string, file: string) => TESTING ? "/" + file : repoRoot + path + "/" + file


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


export interface TonoDef {
  index: number;
  title: string;
  text_author: string;
  music_author: string;
  s1_pages: number[];
  s2_pages: number[];
  t_pages: number[];
  g_pages: number[];
  status_text: TextStatus;
  status_music: MusicStatus;
  introduction: string;
  mei_file: string;
  mei_unit: number;
  text_transcription: TranscriptionEntry[],
  text_comments_file: string;
  music_comments_file: string;
  path: string;
  pdf_url: string;
  number: number;
  mp3_file: string;
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


// TODO: modo this to a proper themeing place
export const PCOLOR = "#f56a6a";
