"""
check_mei.py

Comprobación que hace la herramienta de enlace con el facsímil antes de
sobrescribir un MEI: que el fichero nuevo esté bien formado y que valide contra
MEI 5.1 (mei-all), el esquema que declaran todos los MEI del cancionero.

El esquema se busca en $MEI_RNG o en tools/facsimile-link/.state/mei-all.rng; si
no está, se descarga una vez. Si no se puede conseguir, solo se comprueba que el
XML esté bien formado y así se indica en la salida.

Uso:
    python check_mei.py <nuevo.mei> [--baseline <original.mei>]

Con --baseline, un MEI nuevo que no valida solo se rechaza si el original sí
validaba (la herramienta no debe romper un fichero válido, pero tampoco
bloquearse por errores que ya estaban).

Salida: una línea JSON {"wellFormed", "validated", "valid", "errors"}.
Código de salida 0 si se puede guardar, 1 si no.
"""

import json
import os
import sys
import urllib.request
from pathlib import Path

from lxml import etree

STATE_DIR = Path(os.environ.get("STATE_DIR") or Path(__file__).resolve().parent / ".state")
RNG_URLS = [
    "https://music-encoding.org/schema/5.1/mei-all.rng",
    "https://raw.githubusercontent.com/music-encoding/schema/main/5.1/mei-all.rng",
]


def rng_path():
    env = os.environ.get("MEI_RNG")
    if env and Path(env).exists():
        return Path(env)
    cached = STATE_DIR / "mei-all.rng"
    if cached.exists():
        return cached
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    for url in RNG_URLS:
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                data = r.read()
            etree.fromstring(data)          # make sure it is XML, not an error page
            cached.write_bytes(data)
            return cached
        except Exception:
            continue
    return None


def validate(schema, path):
    doc = etree.parse(str(path))
    ok = schema.validate(doc)
    errors = [f"{e.line}: {e.message}" for e in schema.error_log][:10]
    return ok, errors


def main():
    args = sys.argv[1:]
    baseline = None
    if "--baseline" in args:
        i = args.index("--baseline")
        baseline = args[i + 1]
        del args[i:i + 2]
    if len(args) != 1:
        print(__doc__)
        sys.exit(2)
    target = args[0]

    result = {"wellFormed": False, "validated": False, "valid": None, "errors": []}
    try:
        etree.parse(target)
        result["wellFormed"] = True
    except etree.XMLSyntaxError as e:
        result["errors"] = [str(e)]
        print(json.dumps(result))
        sys.exit(1)

    rng = rng_path()
    if rng is None:
        result["errors"] = ["MEI schema not available: only well-formedness was checked"]
        print(json.dumps(result))
        sys.exit(0)

    schema = etree.RelaxNG(etree.parse(str(rng)))
    ok, errors = validate(schema, target)
    result.update(validated=True, valid=ok, errors=errors)
    if ok:
        print(json.dumps(result))
        sys.exit(0)
    if baseline:
        base_ok, _ = validate(schema, baseline)
        if not base_ok:
            result["errors"].insert(0, "the original MEI did not validate either")
            print(json.dumps(result))
            sys.exit(0)
    print(json.dumps(result))
    sys.exit(1)


if __name__ == "__main__":
    main()
