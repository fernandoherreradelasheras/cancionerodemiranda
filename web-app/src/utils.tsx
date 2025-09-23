import { RefObject } from "react"
import { ScoreViewerConfigScore } from 'score-viewer';
import tonosConfig from "./assets/tonos-config.json"

const STATUS_FILE = "status.json"

const TESTING_PATH = "/tonos/"
const TESTING_IMAGES_PATH = "/facsimil-images/"

const VITE_TEST_URLS = import.meta.env.VITE_TEST_URLS

const TESTING = (VITE_TEST_URLS != undefined) ? true : false

export const config = TESTING ?
  { ...tonosConfig, settings: { ...tonosConfig.settings, basePath: TESTING_PATH, facsimileImagesPath: TESTING_IMAGES_PATH } }
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
  "reconstruction started" = "reconstruction started",
  "music completed" = "music completed",
  "reviewed" = "reviewed",
  "completed" = "completed"
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
 * Utility functions for checking tono (musical work) status
 * These functions are used across components to determine completion status
 */

export function tonoHasMusic(tonoConfig: ScoreViewerConfigScore | null): boolean {
  if (tonoConfig == null) {
    return false;
  } else {
    return (tonoConfig.meiFile != undefined && tonoConfig.meiFile != '');
  }
}

export function tonoHasIntro(tono: ScoreViewerConfigScore | null): boolean {
  if (tono == null) {
    return false;
  } else {
    return (tono.introductionFile != undefined && tono.introductionFile.length > 0);
  }
}

export function tonoHasText(tono: ScoreViewerConfigScore | null): boolean {
  if (tono == null) {
    return false;
  } else {
    return (tono.text != undefined && tono.text.length > 0);
  }
}

export function tonoHasTextCompleted(tono: TonoStatus | null): boolean {
  return (tono?.status_text == "transcription completed" || tono?.status_text == "reviewed"
    || tono?.status_text == "completed");
}

export function tonoHasTextValidated(tono: TonoStatus | null): boolean {
  return (tono?.status_text == "reviewed");
}

export function tonoHasMusicTranscriptionCompleted(tono: TonoStatus | null): boolean {
  return (tono?.status_music == "transcription completed" ||
    tono?.status_music == "reconstruction started" ||
    tono?.status_music == "music completed" ||
    tono?.status_music == "reviewed" ||
    tono?.status_music == "completed");
}

export function tonoHasMusicCompleted(tono: TonoStatus | null): boolean {
  return tonoNeedReconstruction(tono) && (tono?.status_music == "music completed" ||
    tono?.status_music == "reviewed" ||
    tono?.status_music == "completed");
}

export function tonoHasMusicVoiceReconstructed(tono: TonoStatus | null): boolean {
  return tonoNeedReconstruction(tono) && tonoHasMusicCompleted(tono);
}



export function tonoNeedReconstruction(tono: TonoStatus | null): boolean {
  return (tono?.organic?.includes("[") && tono?.organic?.includes("]") || false);
}

export function tonoHasAudio(tono: ScoreViewerConfigScore | null): boolean {
  return (tono?.audioBaseFile != undefined && tono?.audioBaseFile != null);
}

export function tonoHasMusicValidated(tono: TonoStatus | null): boolean {
  return (tono?.status_music == "reviewed");
}

/**
 * Utility type for aggregating status statistics
 */
export interface TonoStatusStats {
  hasIntro: number;
  hasText: number;
  textCompleted: number;
  textValidated: number;
  hasMusic: number;
  musicTranscriptionCompleted: number;
  voiceReconstructed: number;
  needsReconstruction: number;
  musicCompleted: number
  hasAudio: number;
  musicValidated: number;
  completed: number;
  incompleted: number;
}

/**
 * Calculate statistics for an array of tonos and their status
 * @param scores Array of score configurations
 * @param statuses Array of status objects
 * @returns Object with aggregated statistics
 */
export function calculateTonoStats(
  scores: ScoreViewerConfigScore[],
  statuses: TonoStatus[]
): TonoStatusStats {
  const stats: TonoStatusStats = {
    hasIntro: 0,
    hasText: 0,
    textCompleted: 0,
    textValidated: 0,
    hasMusic: 0,
    musicTranscriptionCompleted: 0,
    voiceReconstructed: 0,
    needsReconstruction: 0,
    musicCompleted: 0,
    hasAudio: 0,
    musicValidated: 0,
    completed: 0,
    incompleted: 0
  };

  scores.forEach((tonoConfig, index) => {
    const tonoStatus = statuses[index];

    if (tonoHasIntro(tonoConfig)) stats.hasIntro++;
    if (tonoHasText(tonoConfig)) stats.hasText++;
    if (tonoHasTextCompleted(tonoStatus)) stats.textCompleted++;
    if (tonoHasTextValidated(tonoStatus)) stats.textValidated++;
    if (tonoHasMusic(tonoConfig)) stats.hasMusic++;
    if (tonoHasMusicTranscriptionCompleted(tonoStatus)) stats.musicTranscriptionCompleted++;
    if (tonoHasMusicVoiceReconstructed(tonoStatus)) stats.voiceReconstructed++;
    if (tonoNeedReconstruction(tonoStatus)) stats.needsReconstruction++;
    if (tonoHasMusicCompleted(tonoStatus)) stats.musicCompleted++;
    if (tonoHasAudio(tonoConfig)) stats.hasAudio++;
    if (tonoHasMusicValidated(tonoStatus)) stats.musicValidated++;
    if (tonoHasMusicValidated(tonoStatus) && tonoHasTextValidated(tonoStatus)) {
      stats.completed++
    } else {
      stats.incompleted++;
    }


  });

  return stats;
}


