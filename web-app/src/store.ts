import { create } from "zustand";
import { StoreApi, UseBoundStore } from "zustand";



export interface CommentingElement {
    type: string
    id: string
    label: string
}


interface AppState {

    section: string | null
    isLoading: boolean


    showComments: boolean
    commentingElement: CommentingElement | null

    setIsLoading: (isLoading: boolean) => void

    setShowComments: (showComments: boolean) => void
    setCommentingElement: (element: CommentingElement | null) => void
}


const useStoreBase = create<AppState>()((set) => ({

    section: null,
    isLoading: false,


    showComments: false,
    commentingElement: null,

    setIsLoading: (isLoading: boolean) => set((_) => ({ isLoading: isLoading })),

    setSection: (section: string | null) => set((_) => ({ section: section })),

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
