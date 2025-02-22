import { createContext } from 'react'


export const Context = createContext<{
    definitions: any,
    setDefinitions: any,
    useBreakpoint: any,
}>({definitions: undefined, setDefinitions: undefined, useBreakpoint: undefined  });