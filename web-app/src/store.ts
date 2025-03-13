import { create } from "zustand";
import { StoreApi, UseBoundStore } from "zustand";


export type ScoreProperties = {
    hasFicta: boolean,
    numVerses: number,
    numMeasures: number,
    editor: string,
    sections: {label: string, id: string}[],
    notes: string[],
    hasEditorial: boolean
}

export interface EditorialItem {
    id: string
    type: string
    reason?: string
    resp: string
    boundingBox:  { x: number, y: number, width: number, height: number } | null
    annotations: Set<Annotation>
    choice?: Choice
    correspIds?: string[]
}

export interface ShowingEditorial {
    id: string
    posX: number
    posY: number
}

export interface Option {
    type: string
    selector: string
}


export interface Choice {
    id: string
    options: Option[]
}


export interface Annotation {
    id: string
    text: string
    targetIds: string[]
}

export interface Highlight {
    id: string,
    selector: string,
    type: string,
    editorialId: string,
    x: number,
    y: number,
    width: number,
    height: number

}




interface AppState {
    score: string | null
    scoreProperties: ScoreProperties | null
    zoom: number
    pageCount: number
    currentPage: number
    anchorElementId: string | null
    scoreSvg: string | null
    timeMap: any[]
    timeMapIndex: number
    loadedMeiDoc: Document | null
    hoverMeasure: number | null
    selectedMeasure: number | null
    showNVerses: number
    showEditorial: boolean
    normalizeFicta: boolean
    midiHighlightElements: string[]
    midiHighlightStyles: string
    section: string | null
    isLoading: boolean
    editorialOverlays: EditorialItem[]
    showingEditorial: ShowingEditorial | null

    appOptions: string[]
    choiceOptions: string[]

    scoreAudioFile: string | null

    highlights: { [key: string]: Highlight },

    setScore: (score: string | null) => void
    setScoreProperties: (scoreProperties: ScoreProperties|null) => void

    setIsLoading: (isLoading: boolean) => void

    setScoreSvg: (svg: string| null) => void

    increaseZoom: () => void
    decreaseZoom: () => void
    setZoom: (zoom: number) => void

    setPageCount: (count: number) => void
    setCurrentPage: (page: number) => void

    setAnchorElementId: (id: string | null) => void

    setShowNVerses: (n: number) => void
    setShowEditorial: (showEditorial: boolean) => void
    setNormalizeFicta: (normalizeFicta: boolean) => void

    setScoreAudioFile: (audioFile: string | null) => void
    setTimeMap: (timeMap: any[], replace: boolean) => void
    setTimeMapIndex: (index: number) => void
    setMidHighlightElements: (elements: string[], replace: boolean) => void

    setEditorialOverlays: (overlays: EditorialItem[], replace: boolean) => void
    setShowingEditorial: (editorial: ShowingEditorial | null) => void

    setAppOptions: (options: string[], replace: boolean) => void
    setChoiceOptions: (options: string[], replace: boolean) => void

    setHighlights: (highlights: { [key: string]: Highlight }) => void
    setSection: (section: string | null) => void

}

const MIN_ZOOM = 1
const MAX_ZOOM = 5
const DEFAULT_ZOOM = 3
const STEP_ZOOM = 0.5


const useStoreBase = create<AppState>()((set) => ({
    score: null,
    scoreProperties: null,
    zoom: DEFAULT_ZOOM,
    pageCount: 0,
    currentPage: 1,
    scoreSvg: null,
    showNVerses: 0,
    showEditorial: false,
    normalizeFicta: false,
    timeMap: [],
    timeMapIndex: 0,
    loadedMeiDoc: null,
    anchorElementId: null,
    hoverMeasure: null,
    selectedMeasure: null,
    midiHighlightElements: [],
    midiHighlightStyles: '',
    section: null,
    isLoading: false,
    editorialOverlays: [],
    showingEditorial: null,
    appOptions: [],
    choiceOptions: [],

    scoreAudioFile: null,
    highlights:{} as { [key: string]: Highlight },

    setScore: (score: string|null) => set((_) => ({ score: score, currentPage: 1, anchorElementId: null })),
    setScoreProperties: (scoreProperties: ScoreProperties|null) => set((_) => ({
        scoreProperties: scoreProperties,
        showNVerses: scoreProperties?.numVerses || 0 })),

    setIsLoading: (isLoading: boolean) => set((_) => ({ isLoading: isLoading })),

    setScoreSvg: (svg: string | null) => set((_) => ({ scoreSvg: svg })),

    increaseZoom: () => set((state) => ({ zoom: state.zoom < MAX_ZOOM ? state.zoom + STEP_ZOOM : state.zoom })),
    decreaseZoom: () => set((state) => ({ zoom: state.zoom > MIN_ZOOM ? state.zoom - STEP_ZOOM : state.zoom })),
    setZoom: (zoom: number) => set((state) => ({ zoom: zoom <= MAX_ZOOM && zoom >= MIN_ZOOM ? zoom : state.zoom })),

    setPageCount: (count: number) => set((_) => ({ pageCount: count })),
    setCurrentPage: (page: number) => set((_) => ({ currentPage: page })),

    setAnchorElementId: (id: string | null) => set((_) => ({ anchorElementId: id })),

    setShowNVerses: (n: number) => set((state) => ({ showNVerses: Math.min(n, state.scoreProperties?.numVerses || 0) })),
    setShowEditorial: (showEditorial: boolean) => set((_) => ({ showEditorial: showEditorial })),
    setNormalizeFicta: (normalizeFicta: boolean) => set((_) => ({ normalizeFicta: normalizeFicta })),

    setScoreAudioFile: (audioFile: string | null) => set((_) => ({ scoreAudioFile: audioFile })),
    setTimeMap: (elements: any[], replace: boolean) => set((state) => ({
        timeMap: replace ? elements : [...state.timeMap, ...elements],
        timeMapIndex: 0 })),
    setTimeMapIndex: (index: number) => set((_) => ({ timeMapIndex: index })),
    setMidHighlightElements: (elements: string[], replace: boolean) => set((state) => ({
        midiHighlightElements: replace ? elements : [...state.midiHighlightElements, ...elements]
    })),

    setEditorialOverlays: (overlays: EditorialItem[], replace: boolean) => set((state) => ({
        editorialOverlays: replace ? overlays : [...state.editorialOverlays, ...overlays]})),
    setShowingEditorial: (editorial: ShowingEditorial | null) => set((_) => ({ showingEditorial: editorial })),

    setAppOptions: (options: string[], replace: boolean) => set((state) => ({
        appOptions: replace ? options :  [...state.appOptions, ...options] })),
    setChoiceOptions: (options: string[], replace: boolean) => set((state) => ({
        choiceOptions: replace ? options: [...state.choiceOptions, ...options] })),

    setHighlights: (highlights: { [key: string]: Highlight }) => set((_) => ({ highlights: highlights })),
    setSection: (section: string | null) => set((_) => ({ section: section }))

}));



type State = object;

type WithSelectors<S> = S extends { getState: () => infer T }
    ? S & { use: { [K in keyof T]: () => T[K] } }
    : never;

const createSelectors = <S extends UseBoundStore<StoreApi<State>>>(
    _store: S
) => {
    let store = _store as WithSelectors<typeof _store>;
    store.use = {};
    for (let k of Object.keys(store.getState())) {
        (store.use as any)[k] = () => store((s) => s[k as keyof typeof s]);
    }

    return store;
};


export default createSelectors(useStoreBase);
