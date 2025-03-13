import { useState, useEffect } from 'react';
import { VerovioToolkit } from 'verovio/esm';
import createVerovioModule from 'verovio/wasm';

function useVerovio() {
    const [toolkit, setToolkit] = useState<VerovioToolkit>()

    useEffect(() => {
        const initVerovio = async () => {
            const VerovioModule = await createVerovioModule()
            const toolkit = new VerovioToolkit(VerovioModule)
            console.log("Verovio version:", toolkit.getVersion())
            setToolkit(toolkit)
        }
        initVerovio()
    }, [])

    return toolkit
}

export default useVerovio
