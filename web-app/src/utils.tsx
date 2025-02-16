export const repoRoot = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/"
export const tonoDefinitionsPath = "tonos/definitions.json"
export const latestPdfsUrl = "https://cdm.humanoydivino.com/pdfs-release-latest.json"


export interface TranscriptionEntry {
  file: string,
  type: string | undefined,
  append_to: string | undefined 
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
  status_text_transcription: string;
  status_text_proof_reading: string;
  status_text_validation: string;
  status_music_transcription: string;
  status_music_proof_reading: string;
  status_music_validation: string;
  status_poetic_study: string;
  status_musical_study: string;
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
