import { createContext } from 'react'


export const Context = createContext<{
    scoreCache: any,
    setScoreCache: any,
    definitions: any,
    setDefinitions: any,
    verovio: any,
}>({definitions: undefined, setDefinitions: undefined, scoreCache: undefined, setScoreCache: undefined, verovio: undefined  });