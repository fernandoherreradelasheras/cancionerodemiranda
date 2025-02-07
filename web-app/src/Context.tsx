import { createContext } from 'react'

export const Context = createContext<{ definitions: any, setDefinitions: any }>({definitions: undefined, setDefinitions: undefined });