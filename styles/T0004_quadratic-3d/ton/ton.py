# Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
# Kalter Ton des Stils T0004 (Wunsch des Nutzers: „kalt, lang, gestrichen wie Violinen“): eigene Streicher-Musik und eigene
# kalte Klänge, im Code erzeugt (kein fremdes Tonmaterial). Benutzt die Grundbausteine von audio/v01 (Filter, Hall, Lautheit,
# Begrenzer – nur gelesen, nicht geändert); Betten und übrige Geräusche (impact, whoosh, air …) erzeugt audio/v01/render.py.
#
# Aufruf (aus dem Hauptordner):
#   python styles/T0004_quadratic-3d/ton/ton.py <ton.json> <ausgabe-ordner>
# Ausgabe wie audio/v01/render.py: mix.wav, music.wav, sfx.wav, messung.json (48 kHz, 24 bit, genau so lang wie das Video).
#
# Ton-Datei: wie audio/v01, aber `musik.abschnitte[].stimmung` ist eine Streicher-Stimmung (STIMMUNGEN unten) und Ereignisse mit
# `"klang": "t4:<name>"` sind eigene Klänge dieses Stils (KLAENGE unten: glas, eisschlag, frostwind, klick, funkeln). Alles andere geht unverändert an audio/v01.
import json, os, subprocess, sys, tempfile
import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
WURZEL = os.path.abspath(os.path.join(HIER, "..", "..", ".."))
sys.path.insert(0, os.path.join(WURZEL, "audio", "v01"))
from core import SR, ns, place, pan, rng, stereo, noise, lp, hp, bp, room, reverb, lufs, lufs_max_momentary, true_peak_db, limit, write_wav, read_wav, midi  # noqa: E402
from musik import chord  # noqa: E402

TOK = json.load(open(os.path.join(WURZEL, "shared", "design-tokens.json"), encoding="utf-8"))
ZIEL = TOK["audio"]
BILDPAUSE_DB = float(np.mean(TOK["formats"]["long-form"]["audio"]["bildpauseMusikDb"]))

# ---------- Streicher ----------
def _bogen(n, a, r, tremolo=0.0, t0=0.0):
    """Hüllkurve eines gestrichenen Tons: langsamer Bogenansatz, leichtes Anschwellen, langes Ausklingen; optional Tremolo."""
    t = np.arange(n) / SR
    env = np.minimum(1, t / a) ** 1.6 * (0.9 + 0.1 * np.sin(np.pi * np.clip(t / (n / SR), 0, 1)))
    rel = ns(r)
    if rel < n: env[-rel:] *= np.linspace(1, 0, rel) ** 1.5
    if tremolo: env *= 0.6 + 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * tremolo * (t + t0)))
    return env


def streicher(f, dur, r, hell=0.6, tremolo=0.0, a=1.2, rel=1.6, vib=0.0025):
    """Ein gestrichener Ton (eine Stimme): Sägezahn-artige Obertöne, verzögertes Vibrato, Bogenrauschen, kalter Korpus."""
    n = ns(dur)
    t = np.arange(n) / SR
    rate = r.uniform(4.6, 5.6)
    vib_env = np.clip((t - 0.5) / 1.2, 0, 1)
    fi = f * (1 + vib * vib_env * np.sin(2 * np.pi * rate * t + r.uniform(0, 6.28)))
    ph = 2 * np.pi * np.cumsum(fi) / SR
    x = np.zeros(n)
    for k in range(1, 22):
        if f * k > 15000: break
        amp = (1 / k) * np.exp(-k * (0.22 - 0.16 * hell))
        x += amp * np.sin(k * ph + r.uniform(0, 6.28))
    x += lp(hp(noise(n, r, 0.0), 2200), 7000) * 0.05 * (0.4 + hell)       # Bogenrauschen
    x = hp(x, f * 0.7)
    x = x + 0.6 * bp(x, 2600, 4200)                                        # kalte, glasige Höhen
    return x * _bogen(n, a, rel, tremolo, r.uniform(0, 1))


def chor(f, dur, r, stimmen=3, cent=7, breite=0.7, **kw):
    """Mehrere leicht verstimmte Stimmen, über das Stereobild verteilt (Streichergruppe)."""
    out = stereo(ns(dur))
    for i in range(stimmen):
        d = (i - (stimmen - 1) / 2) * cent
        p = (i / max(1, stimmen - 1) - 0.5) * 2 * breite
        out += pan(streicher(f * 2 ** (d / 1200), dur, r, **kw), p) / stimmen
    return out


def flageolett(f, dur, r):
    """Gläserner Flageolett-Ton (fast reiner Sinus mit leiser Oktave), sehr weich."""
    n = ns(dur); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t + 1)
    return x * _bogen(n, 1.0, 1.5)


# Stimmungen: welche Gruppen spielen, wie laut, wie hell, Tremolo, Flageolett
STIMMUNGEN = {
    "eis":   {"cello": 0.8, "bratsche": 0.6, "violine": 0.55, "hell": 0.55, "tremolo": 0.0, "flag": 0.0},
    "frost": {"cello": 1.0, "bratsche": 0.7, "violine": 0.5, "hell": 0.75, "tremolo": 9.0, "flag": 0.0},
    "nebel": {"cello": 0.0, "bratsche": 0.25, "violine": 0.6, "hell": 0.45, "tremolo": 0.0, "flag": 0.35},
    "glanz": {"cello": 0.8, "bratsche": 0.7, "violine": 0.8, "hell": 0.7, "tremolo": 0.0, "flag": 0.25},
    "ende":  {"cello": 0.7, "bratsche": 0.4, "violine": 0.45, "hell": 0.5, "tremolo": 0.0, "flag": 0.2},
}


def _naechster(ton, ziele):
    return min(ziele, key=lambda z: abs(z - ton))


def musik(m, dur, seed=17):
    """Streicher-Musik: jeder Akkord hält zwei Takte (lange, sich überlappende Töne), Stimmführung in kleinen Schritten."""
    r = rng(seed)
    bar = 4 * 60 / m.get("bpm", 84)
    lang = 2 * bar
    out = stereo(ns(dur))
    ab = m["abschnitte"]
    hoch = 76
    for j, a in enumerate(ab):
        t0, t1 = a["ab"], (ab[j + 1]["ab"] if j + 1 < len(ab) else dur)
        S = STIMMUNGEN.get(a.get("stimmung", "eis"), STIMMUNGEN["eis"])
        teil = stereo(ns(t1 - t0) + ns(3))
        akk = a.get("akkorde", ["Am", "Em", "F", "Dm"])
        k, t = 0, 0.0
        while t < t1 - t0 - 0.3:
            name = akk[k % len(akk)]
            d = min(lang, t1 - t0 - t) + 1.4                                # überlappen: Ausklang in den nächsten Akkord
            tief = chord(name, 40)[0]
            mitte = chord(name, 57)
            hoch = _naechster(hoch, [x + 12 for x in chord(name, 64)] + chord(name, 64) + [x + 12 for x in chord(name, 72)])
            if S["cello"]: place(teil, chor(midi(tief), d, r, 3, 6, 0.3, hell=S["hell"] * 0.6, tremolo=0) * S["cello"], t)
            if S["bratsche"]: place(teil, chor(midi(mitte[1]), d, r, 3, 8, 0.6, hell=S["hell"], tremolo=S["tremolo"]) * S["bratsche"] * 0.7, t)
            if S["bratsche"]: place(teil, chor(midi(mitte[2]), d, r, 3, 8, 0.6, hell=S["hell"], tremolo=S["tremolo"]) * S["bratsche"] * 0.6, t)
            if S["violine"]: place(teil, chor(midi(hoch), d, r, 4, 9, 0.9, hell=S["hell"], tremolo=S["tremolo"] * 0.5, vib=0.003) * S["violine"], t)
            if S["flag"]: place(teil, pan(flageolett(midi(hoch + 12), d * 0.8, r), r.uniform(-0.5, 0.5)) * S["flag"] * 0.5, t + bar * 0.5)
            t += lang; k += 1
        teil = reverb(teil, room(4.5, rng(31 + j), bright=0.75, width=1.0), wet=0.55)   # kalter, langer Saal
        gain = 10 ** (a.get("db", BILDPAUSE_DB if a.get("bildpause") else 0) / 20)
        place(out, teil * gain, t0)
    return hp(out, 45)


# ---------- eigene kalte Klänge ----------
def k_glas(r, dur=1.6):
    """Heller Glas-Ton (Wort taucht auf): zwei unharmonische Teiltöne, schnelles Abklingen, kalter Hall."""
    n = ns(dur); t = np.arange(n) / SR
    f = r.uniform(2300, 2700)
    x = sum(a * np.sin(2 * np.pi * f * q * t) * np.exp(-t * d) for q, a, d in [(1, 1, 7), (2.76, 0.45, 11), (5.4, 0.2, 16)])
    x *= np.minimum(1, t / 0.002)
    return reverb(pan(x, r.uniform(-0.2, 0.2)), room(2.5, rng(5), bright=0.9), wet=0.35)


def k_eisschlag(r, dur=2.5):
    """Eis-Schlag (rotes Wort): tiefer, dumpfer Stoss + kurzes Knacken + gläserner Nachklang."""
    n = ns(dur); t = np.arange(n) / SR
    tief = np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 18)) * t) * np.exp(-t * 4)
    knack = hp(noise(n, r, 0.0), 2500) * np.exp(-t * 45) * 0.5
    ring = np.sin(2 * np.pi * 1870 * t) * np.exp(-t * 3) * 0.12 + np.sin(2 * np.pi * 3110 * t) * np.exp(-t * 5) * 0.08
    x = (tief + knack + ring) * np.minimum(1, t / 0.003)
    return reverb(pan(x), room(3.5, rng(6), bright=0.7), wet=0.4)


def k_frostwind(r, dur=3.0):
    """Kalter Windstoss (Übergang): gefiltertes Rauschen, dessen Band nach oben wandert."""
    n = ns(dur); t = np.arange(n) / SR
    x = noise(n, r, 0.0)
    a = bp(x, 400, 1600) * (1 - t / dur) + bp(x, 1800, 6000) * (t / dur)
    return pan(a * np.sin(np.pi * t / dur) ** 2, r.uniform(-0.4, 0.4))


def k_klick(r, dur=0.6):
    """Knopf-Druck: kurzer, trockener Klick (zwei Rauschimpulse) mit leisem hohem Glanz."""
    n = ns(dur); t = np.arange(n) / SR
    x = bp(noise(n, r, 0.0), 1500, 6000) * (np.exp(-t * 120) + 0.6 * np.exp(-np.clip(t - 0.035, 0, None) * 140) * (t > 0.035))
    x += np.sin(2 * np.pi * 3400 * t) * np.exp(-t * 18) * 0.12
    return reverb(pan(x, r.uniform(-0.1, 0.1)), room(1.2, rng(7), bright=0.8), wet=0.2)


def k_funkeln(r, dur=1.2):
    """Funkeln (Puls der Funken vor einer neuen Platte): kurze gläserne Glitzer-Töne, hoch und kühl."""
    n = ns(dur); t = np.arange(n) / SR
    x = np.zeros(n)
    for _ in range(7):
        f, t0 = r.uniform(3200, 7000), r.uniform(0, 0.35)
        x += np.sin(2 * np.pi * f * t) * np.exp(-np.clip(t - t0, 0, None) * 14) * (t >= t0) * r.uniform(0.3, 0.7)
    return reverb(pan(x * np.minimum(1, t / 0.004), r.uniform(-0.4, 0.4)), room(2.5, rng(8), bright=0.95), wet=0.45)


KLAENGE = {"glas": k_glas, "eisschlag": k_eisschlag, "frostwind": k_frostwind, "klick": k_klick, "funkeln": k_funkeln}


def _ereignisse(spec, dur, seed=23):
    r = rng(seed)
    out = stereo(ns(dur))
    for e in spec.get("ereignisse", []):
        if not e["klang"].startswith("t4:"): continue
        x = KLAENGE[e["klang"][3:]](r)
        x *= 10 ** ((-20.0 + e.get("db", 0) - lufs_max_momentary(x)) / 20)   # 0 dB = −20 LUFS gehört (wie audio/v01)
        if "pan" in e: x = pan(x.mean(0), e["pan"])
        place(out, x, e["t"])
    return out


def _db(x):
    return lufs(x) if np.abs(x).max() > 1e-6 else -120.0


def main(pfad, ordner):
    spec = json.load(open(pfad, encoding="utf-8"))
    d = spec["dauer"]; dur = d["frames"] / d["fps"]
    os.makedirs(ordner, exist_ok=True)
    # 1. Betten + Geräusche aus audio/v01 (ohne Musik, ohne eigene Klänge)
    rest = {k: v for k, v in spec.items() if k != "musik"}
    rest["ereignisse"] = [e for e in spec.get("ereignisse", []) if not e["klang"].startswith("t4:")]
    with tempfile.TemporaryDirectory() as tmp:
        tj = os.path.join(tmp, "rest.json"); json.dump(rest, open(tj, "w", encoding="utf-8"))
        subprocess.run([sys.executable, os.path.join(WURZEL, "audio", "v01", "render.py"), tj, os.path.join(tmp, "v01")], check=True, stdout=subprocess.DEVNULL)
        sfx_v01 = read_wav(os.path.join(tmp, "v01", "mix.wav"))[0]
    n = ns(dur)
    sfx = stereo(n); sfx[:, :min(n, sfx_v01.shape[1])] += sfx_v01[:, :n]
    sfx += _ereignisse(spec, dur)
    mus = musik(spec["musik"], dur) if spec.get("musik") else stereo(n)
    mus = mus[:, :n]
    # 2. Mischung: Musik 2 dB über den Geräuschen, dann Ziel-Lautheit und Spitze
    ziel = spec.get("ziel", {})
    lufs_ziel = ziel.get("lufs", ZIEL["targetLUFS"]); spitze = ziel.get("spitze_dbtp", ZIEL["truePeakDbtp"]); abst = ziel.get("musik_zu_sfx_db", ZIEL["musicOverSfxDb"])
    ls, lm = _db(sfx), _db(mus)
    if lm > -100 and ls > -100: mus *= 10 ** ((ls + abst - lm) / 20)
    mix = sfx + mus
    g = 10 ** ((lufs_ziel - _db(mix)) / 20)
    mix, mus, sfx = mix * g, mus * g, sfx * g
    mix = limit(mix, spitze - 0.2)
    write_wav(os.path.join(ordner, "mix.wav"), mix); write_wav(os.path.join(ordner, "music.wav"), mus); write_wav(os.path.join(ordner, "sfx.wav"), sfx)
    mess = {"lufs": round(_db(mix), 2), "spitze_dbtp": round(true_peak_db(mix), 2), "musik_lufs": round(_db(mus), 2), "sfx_lufs": round(_db(sfx), 2),
            "dauer_s": round(dur, 3), "herkunft": "styles/T0004_quadratic-3d/ton/ton.py (Streicher eigen) + audio/v01/render.py (Betten, Geräusche)"}
    json.dump(mess, open(os.path.join(ordner, "messung.json"), "w", encoding="utf-8"), indent=1)
    print(f"Ton T0004: {mess['lufs']} LUFS, Spitze {mess['spitze_dbtp']} dBTP, Musik {mess['musik_lufs']}, Geräusche {mess['sfx_lufs']} -> {ordner}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Aufruf: python styles/T0004_quadratic-3d/ton/ton.py <ton.json> <ausgabe-ordner>"); sys.exit(1)
    main(sys.argv[1], sys.argv[2])
