import { createContext } from 'react'


export const Context = createContext<{
    scoreViewerConfig: any,
    setScoreViewerConfig: any,
    definitions: any,
    setDefinitions: any,
    currentTonoNumber: any
    setCurrentTonoNumber: any
}>({ definitions: undefined,
     setDefinitions: undefined,
     scoreViewerConfig: undefined,
     setScoreViewerConfig: undefined,
     currentTonoNumber: undefined,
    setCurrentTonoNumber: undefined
});