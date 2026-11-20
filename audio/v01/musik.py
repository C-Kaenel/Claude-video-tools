# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Musik aus Daten: Tempo, Takt und Abschnitte (ab Sekunde, Akkorde je Takt, Stimmung). Jede Stimmung ist ein Rezept,
# welches Instrument auf welchem Schlag was spielt. Melodie = Motiv über die Akkordtöne (fester Zufall).
#
# Stimmungen (siehe STIMMUNGEN): bouncy, old, light, phone, sparse, full (hello) · box, warm, drone, vibes, end (traurig,
# zombie) · calm, tense, pulse, dark (angespannt, outbreak).
import numpy as np
from core import SR, ns, place, pan, midi, rng, stereo
import instrumente as I

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8,
        "A": 9, "A#": 10, "Bb": 10, "B": 11}


def chord(name, base=48):
    """Akkordname -> MIDI-Töne (Grundton nahe `base`): C, Am, G7, F#dim, Bb …"""
    root = name[:2] if len(name) > 1 and name[1] in "#b" else name[:1]
    rest = name[len(root):]
    r = NOTE[root]
    r = base + ((r - base) % 12)
    if r > base + 7: r -= 12
    if rest.startswith("dim"): iv = [0, 3, 6]
    elif rest.startswith("m") and not rest.startswith("maj"): iv = [0, 3, 7]
    else: iv = [0, 4, 7]
    if rest.endswith("7"): iv = iv + [10]
    return [r + i for i in iv]


MOTIF = [0, 2, 1, 2, 0, 1, 2, 1]


def _melody(tones, bar, beat, lift):
    """Melodieton für Schlag `beat` im Takt `bar` (Motiv über die Akkordtöne)."""
    return tones[MOTIF[(bar * 4 + beat) % len(MOTIF)] % len(tones)] + lift


def _bar(buf, mood, t0, beat, tones, bar, r, last):
    root = tones[0]
    F = midi
    def at(b): return t0 + b * beat
    if mood == "bouncy":
        for b in range(4):
            place(buf, pan(I.brass(F(root - 12 if b % 2 == 0 else root - 5), beat * 0.8, r, "tuba"), -0.1), at(b), 0.5 if b % 2 == 0 else 0.0)
            if b % 2: place(buf, pan(I.pluck(F(tones[1] + 12), beat * 0.9, r, 0.35), 0.25), at(b), 0.35)
            place(buf, pan(I.pluck(F(_melody(tones, bar, b, 24)), beat * 1.2, r, 0.55), 0.15), at(b), 0.45)
        place(buf, pan(I.snare(0.2, r, 1.1, 0.3), -0.25), at(1), 0.2); place(buf, pan(I.snare(0.2, r, 1.1, 0.3), -0.25), at(3), 0.2)
        place(buf, pan(I.glock(F(tones[2] + 36), 1.2, r), 0.35), at(0), 0.25)
    elif mood == "old":
        place(buf, I.pad([F(root - 12), F(root - 5)], beat * 4.2, r, 0.3, 0.5, 600), t0, 0.35)
        for b in range(4):
            place(buf, pan(I.fife(F(_melody(tones, bar, b, 12 + 12)), beat * 0.95, r), 0.15), at(b), 0.32)
        place(buf, pan(I.snare(0.25, r, 0.7, 0.15), -0.3), at(0), 0.25)
    elif mood == "light":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.5, 0.7, 1100), t0, 0.22)
        for b in range(4):
            place(buf, pan(I.pluck(F(_melody(tones, bar, b, 24)), beat * 1.3, r, 0.5), 0.2), at(b), 0.42)
        place(buf, pan(I.glock(F(tones[2] + 36), 1.4, r), 0.35), at(0), 0.28)
    elif mood == "phone":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.4, 0.6, 900), t0, 0.25)
        for b in range(4):
            place(buf, pan(I.vibes(F(_melody(tones, bar, b, 24)), beat * 2, r), 0.25), at(b), 0.4)
            place(buf, pan(I.brass(F(root - 12), beat * 0.7, r, "tuba"), -0.1), at(b), 0.3 if b % 2 == 0 else 0.0)
        place(buf, pan(I.snare(0.25, r, 1.0, 0.1), -0.2), at(1), 0.12); place(buf, pan(I.snare(0.25, r, 1.0, 0.1), -0.2), at(3), 0.12)
    elif mood == "sparse":
        place(buf, I.pad([F(n) for n in tones], beat * 4.4, r, 0.8, 1.0, 800), t0, 0.3)
        if bar % 2 == 0: place(buf, pan(I.glock(F(tones[1] + 36), 2.0, r), 0.3), at(0), 0.2)
    elif mood == "full":
        if bar == 0: place(buf, pan(I.cymbal(2.0, r), 0.3), t0, 0.18)
        place(buf, I.pad([F(n + 12) for n in tones], beat * 4.2, r, 0.3, 0.5, 1400), t0, 0.2)
        for b in range(4):
            place(buf, pan(I.brass(F(root - 12 if b % 2 == 0 else root - 5), beat * 0.8, r, "tuba"), -0.1), at(b), 0.5 if b % 2 == 0 else 0.0)
            if b % 2: place(buf, pan(I.brass(F(tones[1] + 12), beat * 0.6, r, "horn"), 0.2), at(b), 0.25)
            place(buf, pan(I.pluck(F(_melody(tones, bar, b, 24)), beat * 1.2, r, 0.6), 0.15), at(b), 0.42)
            place(buf, pan(I.snare(0.2, r, 1.0, 0.6), -0.25), at(b), 0.18 if b % 2 else 0.08)
        place(buf, pan(I.glock(F(tones[2] + 36), 1.2, r), 0.35), at(0), 0.25)
    elif mood == "box":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.6, 0.8, 700), t0, 0.18)
        for k in range(8):
            n = tones[[0, 1, 2, 1, 2, 0, 1, 2][k] % len(tones)] + 24 + (12 if k in (4, 5) else 0)
            place(buf, pan(I.musicbox(F(n), 1.2, r), 0.2), t0 + k * beat / 2, 0.32)
    elif mood == "warm":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.5, 0.7, 1000), t0, 0.26)
        for k in range(8):
            place(buf, pan(I.pluck(F(tones[k % len(tones)] + 12 + (12 if k % 4 == 3 else 0)), beat, r, 0.4), 0.2), t0 + k * beat / 2, 0.28)
        place(buf, pan(I.vibes(F(_melody(tones, bar, 0, 24)), beat * 3, r), -0.2), at(0), 0.3)
    elif mood == "drone":
        place(buf, I.pad([F(root - 12), F(root - 5), F(root)], beat * 4.5, r, 1.0, 1.2, 450), t0, 0.4)
        if bar % 2 == 1: place(buf, pan(I.timpani(F(root - 24), 2.0, r), 0.0), at(0), 0.2)
    elif mood == "vibes":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.6, 0.8, 800), t0, 0.22)
        for b in (0, 1.5, 3):
            place(buf, pan(I.vibes(F(_melody(tones, bar, int(b), 24)), beat * 2.5, r), 0.25), at(b), 0.36)
        place(buf, pan(I.pluck(F(root - 12), beat * 2, r, 0.2), -0.15), at(0), 0.35)
    elif mood == "end":
        place(buf, I.pad([F(n) for n in tones], beat * 4.4, r, 0.5, 1.0, 1200), t0, 0.26)
        for k in range(4):
            place(buf, pan(I.musicbox(F(tones[k % len(tones)] + 24), 1.4, r), 0.15), at(k), 0.3)
        place(buf, pan(I.glock(F(tones[2] + 36), 2.0, r), 0.3), at(0), 0.2)
    elif mood == "calm":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.6, 0.8, 1000), t0, 0.24)
        for b in range(4):
            place(buf, pan(I.pluck(F(_melody(tones, bar, b, 24)), beat * 1.4, r, 0.4), 0.2), at(b), 0.34 if b != 3 else 0.2)
    elif mood == "tense":
        place(buf, I.pad([F(root - 12), F(root - 11), F(root - 5)], beat * 4.4, r, 0.4, 0.6, 500), t0, 0.32)
        for k in range(8):
            place(buf, pan(I.pluck(F(root - 12), beat * 0.45, r, 0.25), -0.1), t0 + k * beat / 2, 0.3)
        place(buf, pan(I.timpani(F(root - 24), 1.6, r), 0.0), at(0), 0.25)
    elif mood == "pulse":
        place(buf, I.pad([F(n) for n in tones], beat * 4.3, r, 0.4, 0.6, 700), t0, 0.22)
        for k in range(8):
            place(buf, pan(I.pluck(F(root - 12 + (7 if k % 4 == 2 else 0)), beat * 0.45, r, 0.35), -0.1), t0 + k * beat / 2, 0.34)
            place(buf, pan(I.snare(0.08, r, 1.4, 0.2), 0.3), t0 + k * beat / 2, 0.06)
        place(buf, pan(I.vibes(F(_melody(tones, bar, 0, 24)), beat * 2, r), 0.25), at(0), 0.25)
    elif mood == "dark":
        place(buf, I.pad([F(root - 12), F(root - 5), F(tones[1])], beat * 4.5, r, 0.8, 1.0, 420), t0, 0.38)
        place(buf, pan(I.timpani(F(root - 24), 2.2, r), 0.0), at(0), 0.28)
        if bar % 2: place(buf, pan(I.vibes(F(tones[1] + 24), beat * 3, r), 0.2), at(2), 0.22)
    else:
        raise ValueError(f"unbekannte Stimmung {mood}")
    if last:  # Schlussakkord klingt aus
        place(buf, I.pad([F(n) for n in tones] + [F(root + 12)], 3.0, r, 0.05, 2.0, 1200), t0 + 4 * beat, 0.3)
        place(buf, pan(I.glock(F(root + 36), 2.5, r), 0.2), t0 + 4 * beat, 0.25)


STIMMUNGEN = ["bouncy", "old", "light", "phone", "sparse", "full", "box", "warm", "drone", "vibes", "end", "calm", "tense", "pulse", "dark"]


# Lautheit je Stimmung relativ zum Musik-Normalpegel (LU): jeder Abschnitt wird auf -24 LUFS + diesen Wert eingestellt,
# damit keine Stimmung aus der Reihe fällt. In der Ton-Datei kann ein Abschnitt mit "db" zusätzlich lauter/leiser werden;
# "bildpause": true (Langform: Bildpause, nur Animation + Musik) stellt ihn um die Mitte von
# shared/design-tokens.json → formats.long-form.audio.bildpauseMusikDb ÜBER die Musik der Nachbar-Abschnitte, egal welche
# Stimmung er hat (ein eigenes "db" geht vor).
LEVEL = {"bouncy": 0, "old": -1, "light": -1, "phone": -1, "sparse": -3, "full": 1, "box": -2, "warm": -1, "drone": -4,
         "vibes": -2, "end": -1, "calm": -2, "tense": -2, "pulse": -1, "dark": -3}


def _bildpause_db():
    import json, os
    t = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "shared", "design-tokens.json")
    v = json.load(open(t, encoding="utf-8")).get("formats", {}).get("long-form", {}).get("audio", {}).get("bildpauseMusikDb", [2, 3])
    return (v[0] + v[1]) / 2


BILDPAUSE_DB = _bildpause_db()


def angehoben(s):
    """Ist der Abschnitt lauter gestellt (eigenes "db" > 0 oder Bildpause)?"""
    return s.get("db", 0) > 0 or ("db" not in s and bool(s.get("bildpause")))


def pegel(ab, i):
    """Pegel des Abschnitts i relativ zum Musik-Normalpegel (LU): Stimmung + "db"; Bildpause ohne "db" = Mittel der
    Nachbar-Abschnitte (ohne Bildpause) + BILDPAUSE_DB (ohne Nachbarn: eigene Stimmung + BILDPAUSE_DB)."""
    s = ab[i]
    if "db" in s or not s.get("bildpause"): return LEVEL[s["stimmung"]] + s.get("db", 0)
    nb = [pegel(ab, j) for j in (i - 1, i + 1) if 0 <= j < len(ab) and not ab[j].get("bildpause")]
    return (float(np.mean(nb)) if nb else LEVEL[s["stimmung"]]) + BILDPAUSE_DB


# Klangfarbe dunkler Stimmungen: Grenzfrequenz eines weichen Tiefpasses (Hz).
TONE = {"drone": 900, "tense": 1100, "pulse": 1300, "dark": 900}


def render_music(m, dur, seed=7):
    """m = {bpm, abschnitte: [{ab, akkorde, stimmung, db?, bildpause?}], schluss?: bool, stumm?: [[von, bis], …]} -> Stereo-Puffer."""
    from core import lufs
    r = rng(seed)
    buf = stereo(ns(dur))
    beat = 60.0 / m.get("bpm", 120)
    bar_len = beat * 4
    secs = m["abschnitte"]
    for si, s in enumerate(secs):
        end = secs[si + 1]["ab"] if si + 1 < len(secs) else dur
        part = stereo(ns(dur))
        for k, name in enumerate(s["akkorde"]):
            t0 = s["ab"] + k * bar_len
            if t0 >= end - 1e-6: break
            last = m.get("schluss", True) and si == len(secs) - 1 and k == len(s["akkorde"]) - 1
            _bar(part, s["stimmung"], t0, beat, chord(name), k, r, last)
        if s["stimmung"] in TONE:  # dunkle Stimmungen: weicher Tiefpass
            from core import lp
            part = lp(part, TONE[s["stimmung"]], 2)
        seg = part[:, ns(s["ab"]):ns(min(end, dur))]
        L = lufs(seg) if seg.shape[1] > ns(0.5) else -120
        if L > -100:
            buf += part * 10 ** ((-24.0 + pegel(secs, si) - L) / 20)
    for a, b in m.get("stumm", []):  # Musikpausen (z. B. für einen Schreck)
        i, j = ns(a), ns(b)
        ramp = min(ns(0.05), max(1, (j - i) // 4))
        g = np.ones(buf.shape[1]); g[i:j] = 0
        g[max(0, i - ramp):i] = np.linspace(1, 0, i - max(0, i - ramp)); g[j:j + ramp] = np.linspace(0, 1, len(g[j:j + ramp]))
        buf *= g
    return buf
