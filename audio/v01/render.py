# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Ton eines Videos aus seiner Ton-Datei (JSON): Musik + Geräusche erzeugen, mischen, Lautheit einstellen, schreiben.
#
# Aufruf (aus dem Hauptordner):
#   python audio/v01/render.py <ton.json> <ausgabe-ordner>
# Ausgabe: mix.wav, music.wav, sfx.wav (48 kHz, 24 bit, exakt so lang wie das Video) + ereignisse.json (alle Ton-Ereignisse
# mit Zeit, Lautstärke und gemessener Spitzenlautheit, für die Prüfung) + messung.json (mit „lauter_abschnitte“: wie viel
# lauter angehobene Musik-Abschnitte, z. B. Bildpausen, gegen ihre Nachbarn wirklich sind).
#
# Ton-Datei:
#   { "dauer": {"frames": 1740, "fps": 30},
#     "musik": {"bpm": 120, "abschnitte": [{"ab": 0, "akkorde": ["C","Am"], "stimmung": "bouncy"}, …], "stumm": [[33, 43]]},
#              (Abschnitt mit "db": lauter/leiser; "bildpause": true = Langform-Bildpause, Mitte von bildpauseMusikDb
#               über der Musik der Nachbar-Abschnitte)
#     "betten": [{"klang": "air", "ab": 0, "bis": 58, "db": -6}],
#     "ereignisse": [{"t": 3.25, "klang": "whoosh", "db": -3, "pan": 0.2, "dauer": 1.4, "angaben": {…}}, …],
#     "reihen": [{"klang": "step", "zeiten": [24.05, 24.6], "db": -8, "angaben": {"surface": "stein"}}],
#     "ziel": {"lufs": -22.6, "spitze_dbtp": -2, "musik_zu_sfx_db": 2} }   (ohne "ziel": Werte aus den Tokens)
# Lautstärken in dB relativ zum Normalpegel: jedes Ereignis wird nach seiner GEHÖRTEN Lautheit eingestellt
# (höchste Momentan-Lautheit, 400 ms) – 0 dB = -20 LUFS; Betten nach integrierter Lautheit – 0 dB = -30 LUFS.
# So klingt ein langes Summen nicht lauter als ein kurzer Pop mit gleichem dB-Wert. Am Ende wird die Mischung auf das
# Ziel gebracht (Standard aus shared/design-tokens.json → audio: -22.6 LUFS, Spitze ≤ -2 dBTP, Musik 2 dB über Geräuschen).
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
# Standard-Ziel der Mischung aus den Stil-Tokens (eine Quelle für alle Werkzeuge)
_TOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "shared", "design-tokens.json")
ZIEL = {"targetLUFS": -22.6, "truePeakDbtp": -2.0, "musicOverSfxDb": 2.0, **json.load(open(_TOK, encoding="utf-8")).get("audio", {})}
from core import SR, ns, place, pan, rng, stereo, room, reverb, lufs, lufs_max_momentary, true_peak_db, limit, write_wav, fade
from klaenge import SOUNDS
from musik import render_music, angehoben, pegel

VERSION = "audio/v01"
EVENT_REF = -20.0   # LUFS (höchste Momentan-Lautheit) eines Ereignisses bei 0 dB
BED_REF = -30.0     # LUFS (integriert) eines Betts bei 0 dB


def _dur(spec):
    d = spec["dauer"]
    return d["frames"] / d["fps"] if "frames" in d else float(d["s"])


def _event_signal(name, r, e):
    fn = SOUNDS[name]
    kw = dict(e.get("angaben", {}))
    if "dauer" in e: kw["dur"] = e["dauer"]
    return fn(r, **kw)


def _bis(ab, j, dur):
    return ab[j + 1]["ab"] if j + 1 < len(ab) else dur


def _stueck(x, spans):
    """Teile von x (Sekunden [a, b), je 0,5 s Rand weg wegen Hall und Übergängen), aneinandergehängt."""
    return np.concatenate([x[:, ns(a + 0.5):ns(b - 0.5)] for a, b in spans if b - a > 1.5], axis=1)


def bildpausen_nachstellen(ab, dur, music):
    """Bildpausen ("bildpause" ohne "db"): Hall und Ausklang der Nachbarn verkleinern den geplanten Unterschied – nach dem
    Hall nachmessen und die Musik im Abschnitt angleichen (bis 3×, weiche Rampen 0,3 s), bis er auf 0,1 dB stimmt."""
    for i, s in enumerate(ab):
        if not s.get("bildpause") or "db" in s: continue
        a, b = s["ab"], _bis(ab, i, dur)
        nb = [j for j in (i - 1, i + 1) if 0 <= j < len(ab) and not ab[j].get("bildpause") and _bis(ab, j, dur) - ab[j]["ab"] > 1.5]
        if not nb or b - a <= 1.5: continue
        soll = pegel(ab, i) - float(np.mean([pegel(ab, j) for j in nb]))
        for _ in range(3):
            ist = lufs(_stueck(music, [(a, b)])) - lufs(_stueck(music, [(ab[j]["ab"], _bis(ab, j, dur)) for j in nb]))
            if abs(soll - ist) < 0.1: break
            env = np.ones(music.shape[1]); i0, i1, rp = ns(a), min(ns(b), music.shape[1]), ns(0.3)
            env[i0:i1] = 10 ** ((soll - ist) / 20)
            env[i0:i0 + rp] = np.linspace(1, env[i0], len(env[i0:i0 + rp]))
            env[max(i0, i1 - rp):i1] = np.linspace(env[i0], 1, i1 - max(i0, i1 - rp))
            music = music * env
    return music


def lauter_messen(ab, dur, music, mix):
    """Lauter gestellte Musik-Abschnitte ("db" > 0 / "bildpause"): Lautheit in music.wav und mix.wav gegen die Nachbar-
    Abschnitte ohne Anhebung (je 0,5 s Rand weg, wegen Hall und Übergängen). soll_db = geplanter Pegel-Unterschied."""
    bis = lambda j: _bis(ab, j, dur)
    stueck = _stueck
    out = []
    for i, s in enumerate(ab):
        if not angehoben(s): continue
        nb = [j for j in (i - 1, i + 1) if 0 <= j < len(ab) and not angehoben(ab[j])]
        eintrag = {"ab": round(s["ab"], 2), "bis": round(bis(i), 2), "stimmung": s["stimmung"], "db": s.get("db"),
                   "bildpause": bool(s.get("bildpause"))}
        if nb and bis(i) - s["ab"] > 1.5:
            hier = [(s["ab"], bis(i))]; dort = [(ab[j]["ab"], bis(j)) for j in nb]
            ml, mn = lufs(stueck(music, hier)), lufs(stueck(music, dort))
            xl, xn = lufs(stueck(mix, hier)), lufs(stueck(mix, dort))
            soll = pegel(ab, i) - float(np.mean([pegel(ab, j) for j in nb]))
            eintrag.update({"nachbarn": [ab[j]["stimmung"] for j in nb], "musik_lufs": round(ml, 2), "musik_nachbarn_lufs": round(mn, 2),
                            "musik_unterschied_db": round(ml - mn, 2), "soll_db": round(soll, 2),
                            "mix_lufs": round(xl, 2), "mix_nachbarn_lufs": round(xn, 2), "mix_unterschied_db": round(xl - xn, 2)})
        out.append(eintrag)
    return out


def render(spec, out_dir, seed=21):
    dur = _dur(spec)
    n = ns(dur)
    r = rng(seed)
    ir = room(1.4, rng(5), bright=0.45)
    # Musik
    music = render_music(spec["musik"], dur) if spec.get("musik") else stereo(n)
    music = reverb(music, ir, 0.18)
    music = bildpausen_nachstellen(spec.get("musik", {}).get("abschnitte", []), dur, music)
    # Geräusche
    sfx = stereo(n)
    log = []
    for b in spec.get("betten", []):
        a, z = b.get("ab", 0.0), b.get("bis", dur)
        sig = fade(pan(SOUNDS[b["klang"]](r, dur=z - a, **b.get("angaben", {}))), 0.5, 0.8)
        place(sfx, sig, a, 10 ** ((BED_REF + b.get("db", 0) - lufs(sig)) / 20))
        log.append({"t": a, "bis": z, "klang": b["klang"], "art": "bett", "db": b.get("db", 0)})
    events = list(spec.get("ereignisse", []))
    for row in spec.get("reihen", []):
        for t in row["zeiten"]:
            events.append({**{k: v for k, v in row.items() if k != "zeiten"}, "t": t})
    events.sort(key=lambda e: (e["t"], e["klang"]))
    dry, wet = stereo(n), stereo(n)
    for e in events:
        sig = pan(_event_signal(e["klang"], r, e), e.get("pan", 0.0))
        g = 10 ** ((EVENT_REF + e.get("db", 0) - lufs_max_momentary(sig)) / 20)
        place(dry, sig, e["t"], g)
        if e.get("hall", 0.15): place(wet, sig, e["t"], g * e.get("hall", 0.15))
        log.append({"t": round(e["t"], 3), "klang": e["klang"], "art": "ereignis", "db": e.get("db", 0), "pan": e.get("pan", 0.0)})
    sfx += dry + reverb(wet, ir, 1.0) - wet
    # Mischung
    ziel = spec.get("ziel", {})
    target, ceiling, m2s = ziel.get("lufs", ZIEL["targetLUFS"]), ziel.get("spitze_dbtp", ZIEL["truePeakDbtp"]), ziel.get("musik_zu_sfx_db", ZIEL["musicOverSfxDb"])
    lm, ls = lufs(music), lufs(sfx)
    gm = 10 ** ((-24.0 - lm) / 20) if lm > -100 else 0.0                       # Musik auf -24 LUFS
    gs = 10 ** ((-24.0 - m2s - ls) / 20) if ls > -100 else 0.0                 # Geräusche m2s dB leiser
    music, sfx = music * gm, sfx * gs
    mix = music + sfx
    for _ in range(4):  # auf Ziel bringen, Spitzen begrenzen, nachmessen
        g = 10 ** ((target - lufs(mix)) / 20)
        mix, music, sfx = mix * g, music * g, sfx * g
        mix = limit(mix, ceiling - 0.3)
        if abs(lufs(mix) - target) < 0.1 and true_peak_db(mix) <= ceiling: break
    os.makedirs(out_dir, exist_ok=True)
    for name, x in (("mix", mix), ("music", music), ("sfx", sfx)):
        write_wav(os.path.join(out_dir, f"{name}.wav"), x)
    meas = {"version": VERSION, "dauer_s": round(dur, 3), "samples": n, "lufs": round(lufs(mix), 2), "spitze_dbtp": round(true_peak_db(mix), 2),
            "musik_lufs": round(lufs(music), 2), "sfx_lufs": round(lufs(sfx), 2), "max_momentan_lufs": round(lufs_max_momentary(mix), 2),
            "ereignisse": len(events)}
    lauter = lauter_messen(spec.get("musik", {}).get("abschnitte", []), dur, music, mix)
    if lauter: meas["lauter_abschnitte"] = lauter
    with open(os.path.join(out_dir, "ereignisse.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(log, f, ensure_ascii=False, indent=1)
    with open(os.path.join(out_dir, "messung.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(meas, f, ensure_ascii=False, indent=2)
    return meas


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("Aufruf: python audio/v01/render.py <ton.json> <ausgabe-ordner>")
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    print(json.dumps(render(spec, sys.argv[2]), ensure_ascii=False))
