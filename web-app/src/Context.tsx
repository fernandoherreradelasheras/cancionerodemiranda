import { createContext, useContext } from 'react'
import { ScoreViewerConfig } from 'score-viewer';
import { TonoStatus } from './utils';


export type GlobalContext = {
    scoreViewerConfig: ScoreViewerConfig | undefined,
    setScoreViewerConfig: ((config: ScoreViewerConfig) => void) | undefined,
    status: TonoStatus[] | undefined,
    setStatus: ((statuses : TonoStatus[]) => void) | undefined,
    currentTonoNumber: number | undefined | null,
    setCurrentTonoNumber: ((tonoNumber: number|null) => void) | undefined
}

export const Context = createContext<GlobalContext>({
    status: undefined,
    setStatus: undefined,
    scoreViewerConfig: undefined,
    setScoreViewerConfig: undefined,
    currentTonoNumber: undefined,
    setCurrentTonoNumber: undefined
});

export const useGlobalContext = () => useContext(Context)