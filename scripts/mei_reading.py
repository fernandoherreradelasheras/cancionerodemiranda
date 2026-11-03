"""Lectura adoptada de un MEI del Cancionero de Miranda y posiciones en el tiempo.

Resolución del aparato crítico (la comparten mei_dump y los scripts que
necesitan recorrer la lectura adoptada):
  - <app>: se toma el <lem> (o el primer <rdg> si no hay lem). Los <app> de
    tipo app_clefs y dissonant_analysis no son eventos y se ignoran.
  - <choice>: se toma el primer hijo (corr antes que sic, orig antes que reg).
  - <subst>: se toma <add>, se descarta <del>.
  - <corr>, <sic>, <reg>, <orig>, <supplied>, <unclear>, <add>, <damage>,
    <restore>, <lem>, <rdg>, <beam>, <tuplet>: transparentes, se baja al hijo.

Sobre esa lectura se calculan los tiempos de ataque de cada evento y se
resuelven los corchetes de coloración anclados con @tstamp/@tstamp2.
"""

import re
from fractions import Fraction as F

from lxml import etree

MEI_NS = "http://www.music-encoding.org/ns/mei"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"m": MEI_NS}
XMLID = f"{{{XML_NS}}}id"

SKIP_APP_TYPES = {"app_clefs", "dissonant_analysis"}
TRANSPARENT = {
    "corr", "sic", "reg", "orig", "supplied", "unclear", "add", "damage",
    "restore", "lem", "rdg", "beam", "tuplet", "expan", "abbr", "bTrem",
    "fTrem",
}


def tag(el):
    return etree.QName(el).localname if isinstance(el.tag, str) else ""


def resolve(el):
    """Genera los hijos efectivos de `el`, descendiendo por los envoltorios
    editoriales según las reglas del módulo."""
    for child in el:
        t = tag(child)
        if not t:
            continue
        if t == "app":
            typ = child.get("type")
            lem = child.find("m:lem", NS)
            if typ is None and lem is not None:
                typ = lem.get("type")
            if typ in SKIP_APP_TYPES:
                continue
            branch = lem if lem is not None else child.find("m:rdg", NS)
            if branch is not None:
                yield from resolve(branch)
        elif t == "choice":
            first = next((c for c in child if tag(c)), None)
            if first is not None:
                yield from resolve(first)
        elif t == "subst":
            for add in child.findall("m:add", NS):
                yield from resolve(add)
        elif t in TRANSPARENT:
            yield from resolve(child)
        else:
            yield child


def resolve_deep(el, wanted):
    """Todos los descendientes efectivos de `el` cuya etiqueta esté en
    `wanted`, respetando las reglas de resolución."""
    for child in resolve(el):
        if tag(child) in wanted:
            yield child
        yield from resolve_deep(child, wanted)


def dur_frac(el):
    """Duración de un evento en redondas, con puntillos."""
    d = el.get("dur")
    if d is None:
        return None
    if d in ("long", "breve", "maxima"):
        base = {"breve": F(2), "long": F(4), "maxima": F(8)}[d]
    else:
        base = F(1, int(d))
    dots = int(el.get("dots") or 0)
    total, add = base, base
    for _ in range(dots):
        add /= 2
        total += add
    return total


# ---------------------------------------------- coloración anclada por tiempos


def measures_with_beat(root):
    """Compases de la lectura adoptada en orden, cada uno con la figura que vale
    un tiempo en su compás vigente: [(measure, tiempo en redondas)]."""
    out, beat = [], F(1, 2)
    music = root.find(".//m:music", NS)

    def walk(container):
        nonlocal beat
        for el in resolve(container):
            t = tag(el)
            if t == "scoreDef":
                if el.get("meter.unit"):
                    beat = F(1, int(el.get("meter.unit")))
                elif el.get("meter.sym") in ("common", "cut"):
                    beat = F(1, 4) if el.get("meter.sym") == "common" else F(1, 2)
            elif t == "measure":
                out.append((el, beat))
            elif t in ("body", "mdiv", "score", "section", "ending"):
                walk(el)

    if music is not None:
        walk(music)
    return out


def layer_attacks(measure, staff, beat):
    """Eventos de un pentagrama en un compás, por capas: [[(tiempo de ataque,
    duración en tiempos, evento)]]. Los tiempos cuentan desde 1, como @tstamp."""
    layers = []
    for st in resolve_deep(measure, {"staff"}):
        if st.get("n") != str(staff):
            continue
        for layer in resolve_deep(st, {"layer"}):
            t, evs = F(0), []
            for ev in resolve(layer):
                if tag(ev) in ("note", "rest", "space", "chord"):
                    d = dur_frac(ev)
                    if d is None:
                        continue
                elif tag(ev) in ("mRest", "mSpace"):
                    d = F(0)
                else:
                    continue
                evs.append((t / beat + 1, d / beat, ev))
                t += d
            layers.append(evs)
    return layers


def parse_tstamp2(value):
    """@tstamp2 («1m+2.5») -> (compases que avanza, tiempo de llegada)."""
    m = re.fullmatch(r"\s*(\d+)m\+([\d.]+)\s*", value or "")
    return (int(m.group(1)), F(m.group(2))) if m else None


def tstamp_coloration(root):
    """Corchetes de coloración anclados con @tstamp/@tstamp2, que es como se
    escribe un corchete de una sola nota: con el mismo @startid y @endid Verovio
    no lo pinta. Cubren los eventos que atacan dentro del intervalo; el silencio
    que suena al empezar el intervalo no entra. Lista de (bracketSpan, pentagrama,
    eventos), con las notas de un acorde tras su <chord>."""
    measures = measures_with_beat(root)
    out = []
    for i, (measure, _) in enumerate(measures):
        for b in resolve_deep(measure, {"bracketSpan"}):
            if b.get("func") != "coloration" or not b.get("tstamp") or b.get("startid"):
                continue
            dest = parse_tstamp2(b.get("tstamp2"))
            evs = []
            if dest and b.get("staff") and i + dest[0] < len(measures):
                t0, last = F(b.get("tstamp")), i + dest[0]
                for j in range(i, last + 1):
                    m, beat = measures[j]
                    for layer in layer_attacks(m, b.get("staff"), beat):
                        for t, _, ev in layer:
                            if (j > i or t >= t0) and (j < last or t <= dest[1]):
                                evs.append(ev)
                                if tag(ev) == "chord":
                                    evs.extend(resolve_deep(ev, {"note"}))
            out.append((b, b.get("staff"), evs))
    return out


def fmt_beat(x):
    """Tiempo en decimal para @tstamp: 7/4 -> 1.75, 2 -> 2."""
    return f"{float(x):g}"


def single_event_tstamps(root, target):
    """@tstamp y @tstamp2 del corchete que cubre solo el evento `target`: desde un
    cuarto de tiempo antes de su ataque (sin llegar al evento anterior) hasta medio
    tiempo después (sin pasar de la mitad de la nota)."""
    for measure, beat in measures_with_beat(root):
        for st in resolve_deep(measure, {"staff"}):
            for evs in layer_attacks(measure, st.get("n"), beat):
                for k, (t, d, ev) in enumerate(evs):
                    if ev is target:
                        prev = evs[k - 1][0] if k else None
                        start = max(F(1), t - F(1, 4))
                        if prev is not None and start <= prev:
                            start = t
                        return fmt_beat(start), f"0m+{fmt_beat(t + min(F(1, 2), d / 2))}"
    raise ValueError("el evento no está en la lectura adoptada")
