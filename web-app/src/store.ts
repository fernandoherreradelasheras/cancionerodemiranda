import { create } from "zustand";
import { StoreApi, UseBoundStore } from "zustand";


export type ScoreProperties = {
    tonoNumber: number,
    hasFicta: boolean,
    numVerses: number,
    numMeasures: number,
    editor: string,
    reconstructionBy: string | null,
    sections: {label: string, id: string}[],
    notes: string[],
    hasEditorial: boolean,
    encodedTransposition?: string
}

export interface EditorialItem {
    id: string
    type: string
    reason?: string
    resp: string
    annotations: Set<Annotation>
    choice?: Choice
    correspIds?: string[]
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



export interface CommentingElement {
    type: string
    id: string
    label: string
}


interface AppState {
    score: string | null
    scoreProperties: ScoreProperties | null
    zoom: number
    pageCount: number
    currentPage: number
    anchorElementId: string | null
    scoreSvg: string | null
    loadedMeiDoc: Document | null
    hoverMeasure: number | null
    selectedMeasure: number | null
    showNVerses: number
    showEditorial: boolean
    normalizeFicta: boolean
    section: string | null
    isLoading: boolean
    editorialItems: EditorialItem[]
    showingEditorial: string | null

    appOptions: string[]
    choiceOptions: string[]

    highlights: { [key: string]: Highlight }

    transposition: string | null

    playing: boolean
    playingPosition: number

    showComments: boolean
    commentingElement: CommentingElement | null

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

    setEditorialItems: (overlays: EditorialItem[], replace: boolean) => void
    setShowingEditorial: (editorial: string | null) => void

    setAppOptions: (options: string[], replace: boolean) => void
    setChoiceOptions: (options: string[], replace: boolean) => void

    setHighlights: (highlights: { [key: string]: Highlight }) => void
    setSection: (section: string | null) => void

    setTransposition: (transposition: string | null) => void

    setPlaying: (playing: boolean) => void
    setPlayingPosition (position: number): void

    setShowComments: (showComments: boolean) => void
    setCommentingElement: (element: CommentingElement | null) => void
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
    loadedMeiDoc: null,
    anchorElementId: null,
    hoverMeasure: null,
    selectedMeasure: null,
    section: null,
    isLoading: false,
    editorialItems: [],
    showingEditorial: null,
    appOptions: [],
    choiceOptions: [],

    highlights:{} as { [key: string]: Highlight },

    transposition: null,

    playing: false,
    playingPosition: 0,

    showComments: false,
    commentingElement: null,

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

    setEditorialItems: (items: EditorialItem[], replace: boolean) => set((state) => ({
        editorialItems: replace ? items : [...state.editorialItems, ...items]})),
    setShowingEditorial: (editorial: string | null) => set((_) => ({ showingEditorial: editorial })),

    setAppOptions: (options: string[], replace: boolean) => set((state) => ({
        appOptions: replace ? options :  [...state.appOptions, ...options] })),
    setChoiceOptions: (options: string[], replace: boolean) => set((state) => ({
        choiceOptions: replace ? options: [...state.choiceOptions, ...options] })),

    setHighlights: (highlights: { [key: string]: Highlight }) => set((_) => ({ highlights: highlights })),
    setSection: (section: string | null) => set((_) => ({ section: section })),

    setTransposition: (transposition: string | null) => set((_) => ({ transposition: transposition })),

    setPlaying: (isPlaying: boolean) => set((_) => ({ playing: isPlaying })),

    setPlayingPosition: (position: number) => set((_) => ({ playingPosition: position })),

    setShowComments: (showComments: boolean) => set((_) => ({ showComments: showComments })),

    setCommentingElement: (element: CommentingElement | null) => set((_) => ({ commentingElement: element })),

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
