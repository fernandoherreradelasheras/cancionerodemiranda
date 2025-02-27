import { createContext } from 'react'


export const Context = createContext<{
    scoreCache: any,
    setScoreCache: any,
    definitions: any,
    setDefinitions: any,
    useBreakpoint: any,
}>({definitions: undefined, setDefinitions: undefined, useBreakpoint: undefined, scoreCache: undefined, setScoreCache: undefined  });