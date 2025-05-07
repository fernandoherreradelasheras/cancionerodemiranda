import { createContext } from 'react'


export const Context = createContext<{
    scoreViewerConfig: any,
    setScoreViewerConfig: any,
    definitions: any,
    setDefinitions: any,
}>({definitions: undefined, setDefinitions: undefined, scoreViewerConfig: undefined, setScoreViewerConfig: undefined  });