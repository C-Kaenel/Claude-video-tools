# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Geräusche: jede Funktion (Zufall, Länge in s, Angaben) -> Mono- oder Stereo-Signal, Spitze etwa 1.
# Namen sind die Schlüssel in der Ton-Datei eines Videos ("klang": "pop").
import numpy as np
from core import SR, ns, noise, lp, hp, bp, adsr, decay, fade, modal, pan


def _norm(y):
    return y / (np.max(np.abs(y)) + 1e-9)


def whoosh(r, dur=0.6, lo=300, hi=4000, peak=0.5):
    """Luftzug (Kamera-Bewegung, schneller Gegenstand): gefiltertes Rauschen, Filter wandert mit."""
    n = ns(dur)
    x = noise(n, r, 1.0)
    pk = int(n * peak)
    env = np.concatenate([np.linspace(0, 1, max(pk, 1)) ** 2, np.linspace(1, 0, max(n - pk, 1)) ** 1.5])[:n]
    a = lp(x, hi) - lp(x, lo)
    b = lp(x, hi * 0.4)
    m = env
    y = a * m + b * (1 - m) * 0.3
    return fade(_norm(y * env), 0.005, 0.02)


def step(r, dur=0.25, surface="stein", weight=1.0):
    """Schritt: Stiefel auf Stein (kurzer Klack + Tiefe) oder Gras (weiches Rascheln)."""
    n = ns(dur)
    t = np.arange(n) / SR
    if surface == "gras":
        y = bp(noise(n, r), 800, 5000) * np.exp(-t / 0.05) + lp(noise(n, r), 300) * np.exp(-t / 0.03) * 0.5
    else:
        y = bp(noise(n, r), 1500, 7000) * np.exp(-t / 0.012) * 0.8 + np.sin(2 * np.pi * 85 * t) * np.exp(-t / 0.04) * weight
    return fade(_norm(y), 0.0005, 0.03)


def creak(r, dur=0.4, f0=110, f1=210):
    """Knarren (Holz, steife Gelenke): rauer, gleitender Ton."""
    n = ns(dur)
    f = np.linspace(f0, f1, n) * (1 + 0.04 * np.sin(np.arange(n) / SR * 2 * np.pi * 23))
    ph = np.cumsum(f) / SR
    pulses = (np.sin(2 * np.pi * ph) > 0.92).astype(float)
    y = bp(pulses, 300, 3000) + 0.2 * bp(noise(n, r), 500, 2000)
    return fade(_norm(y) * adsr(n, 0.03, 0.05, 0.8, 0.1), 0.002, 0.03)


def clink(r, dur=0.6, f0=2400):
    """Klirren (Glas, Metall)."""
    return _norm(modal(f0, [1, 2.32, 4.25, 6.63], [1, 0.6, 0.35, 0.2], [0.25, 0.15, 0.08, 0.05], dur, r, 0.01))


def pop(r, dur=0.12, f0=600):
    """Pop: kurzer, nach oben gleitender Blubb (Karte erscheint)."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = f0 * (1 + 1.2 * t / dur)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03)
    return fade(_norm(y + 0.1 * hp(noise(n, r), 3000) * np.exp(-t / 0.005)), 0.0003, 0.02)


def impact(r, dur=0.7):
    """Aufprall: tiefer Schlag mit kurzem Rauschanteil."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t / 0.08) + 45
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    hit = lp(noise(n, r), 2500) * np.exp(-t / 0.02)
    return fade(_norm(boom + 0.5 * hit), 0.0005, 0.05)


def sparkle(r, dur=0.8):
    """Funkeln: hohe Glöckchen in schneller Folge."""
    y = np.zeros(ns(dur))
    for k in range(6):
        g = modal(r.uniform(2500, 5200), [1, 2.76], [1, 0.3], [0.2, 0.08], 0.3, r)
        i = ns(k * dur / 9)
        y[i:i + len(g)] += g[: len(y) - i] * (1 - k / 8)
    return _norm(y)


def clack(r, dur=0.2, f0=900):
    """Holzklack (Blatt umklappen, Schild, Brett)."""
    y = modal(f0, [1, 2.57, 4.1], [1, 0.4, 0.2], [0.03, 0.02, 0.01], dur, r, 0.02)
    y[: ns(0.003)] += noise(ns(0.003), r) * 0.4
    return _norm(y)


def rustle(r, dur=0.5):
    """Rascheln (Papier, Stoff, Blätter)."""
    n = ns(dur)
    grains = (r.random(n) > 0.997).astype(float) * r.uniform(0.3, 1, n)
    y = bp(np.convolve(grains, np.hanning(ns(0.004)), "same") + noise(n, r) * 0.08, 1500, 9000)
    return fade(_norm(y) * adsr(n, 0.03, 0.1, 0.8, dur * 0.4), 0.003, 0.03)


def ring(r, dur=1.5, rate=18.0):
    """Klingeln (alte Telefonglocke): zwei Glocken, schnell angeschlagen, Pausen nach je 0,8 s."""
    n = ns(dur)
    t = np.arange(n) / SR
    bell = modal(1650, [1, 2.4, 3.9], [1, 0.4, 0.2], [0.4, 0.2, 0.1], dur, r) + modal(1980, [1, 2.4], [0.8, 0.3], [0.4, 0.2], dur, r)
    gate = (np.sin(2 * np.pi * rate * t) > 0).astype(float) * ((t % 1.2) < 0.8)
    return fade(_norm(bell * (0.4 + 0.6 * lp(gate, 200))), 0.002, 0.05)


def water(r, dur=3.0):
    """Wasser (Fluss, Ufer): breites Plätschern."""
    n = ns(dur)
    y = np.zeros((2, n))
    for c in range(2):
        base = lp(noise(n, r, 1.0), 900) * 0.6
        drops = (r.random(n) > 0.9993).astype(float)
        bubbles = np.zeros(n)
        for i in np.nonzero(drops)[0]:
            g = modal(r.uniform(500, 1600), [1], [1], [0.02], 0.06, r)
            bubbles[i:i + len(g)] += g[: n - i] * r.uniform(0.2, 0.6)
        y[c] = base + bubbles
    return fade(y / (np.abs(y).max() + 1e-9), min(0.4, dur / 4), min(0.6, dur / 4))


def crowd(r, dur=3.0, cheer=0.0):
    """Menge: Gemurmel vieler Stimmen (gefilterte, modulierte Formanten); cheer > 0 = Jubel."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros((2, n))
    for c in range(2):
        for _ in range(10):
            f = r.uniform(400, 1400)
            am = lp(noise(n, r), 4 + 3 * cheer) * 3
            y[c] += bp(noise(n, r), f * 0.8, f * 1.25) * np.clip(am + 0.3, 0, None)
        if cheer: y[c] += bp(noise(n, r), 1500, 5000) * cheer * 0.6
    y *= adsr(n, min(0.4, dur / 4), 0.2, 0.9, min(0.6, dur / 3))
    return y / (np.abs(y).max() + 1e-9)


def air(r, dur=10.0, bright=0.4):
    """Stadt-Atmo / Aussenluft: weiches, breites Rauschen (Grundbett)."""
    n = ns(dur)
    y = np.vstack([lp(noise(n, r, 1.2), 1500 + 2500 * bright) for _ in range(2)])
    return fade(y / (np.abs(y).max() + 1e-9), 0.5, 0.5)


def birds(r, dur=0.6, chirps=3):
    """Vogelzwitschern: kurze, gleitende hohe Töne."""
    y = np.zeros(ns(dur))
    for k in range(chirps):
        m = ns(r.uniform(0.05, 0.1))
        tt = np.arange(m) / SR
        f = r.uniform(2800, 4200) + r.uniform(800, 1600) * np.sin(np.linspace(0, np.pi, m))
        c = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.hanning(m)
        i = ns(k * r.uniform(0.11, 0.16))
        y[i:i + m] += c[: len(y) - i]
    return _norm(y)


def heartbeat(r, dur=0.6, rate=1.0):
    """Herzschlag: zwei dumpfe Schläge (lub-dub)."""
    n = ns(dur)
    t = np.arange(n) / SR
    beat = lambda t0, f, a: np.where(t >= t0, np.sin(2 * np.pi * f * (t - t0)) * np.exp(-(t - t0) / 0.05) * a, 0)
    gap = 0.18 / max(rate, 0.3)
    return fade(_norm(lp(beat(0, 55, 1.0) + beat(gap, 48, 0.7), 300)), 0.001, 0.05)


def buzz(r, dur=3.0):
    """Summen (Fliege): schnelle Flügelschläge, Tonhöhe und Lautstärke wandern."""
    n = ns(dur)
    t = np.arange(n) / SR
    f = 210 * (1 + 0.25 * np.clip(lp(noise(n, r), 3) * 10, -1, 1)) * (1 + 0.03 * np.sin(2 * np.pi * 7 * t))  # Tonhöhe wandert
    saw = (np.cumsum(f) / SR) % 1.0
    am = np.clip(0.45 + 0.55 * np.clip(lp(noise(n, r), 1.2) * 8, -1, 1), 0, 1) ** 1.5   # kommt und geht
    y = bp(saw - 0.5, 150, 3000) * am
    p = np.clip(lp(noise(n, r), 0.8) * 8, -0.8, 0.8)
    out = np.vstack([y * np.cos((p + 1) * np.pi / 4), y * np.sin((p + 1) * np.pi / 4)])
    return fade(out / (np.abs(out).max() + 1e-9), 0.2, 0.3)


def tick(r, dur=0.05):
    """Ticken (Uhr, Taste): sehr kurzer heller Klick."""
    return _norm(modal(3200, [1, 2.1], [1, 0.4], [0.008, 0.004], dur, r) + hp(noise(ns(dur), r), 5000) * decay(ns(dur), 0.002))


def stamp(r, dur=0.4):
    """Stempel: dumpfer Schlag auf Papier und Tisch."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = lp(noise(n, r), 900) * np.exp(-t / 0.03) + np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.06)
    return fade(_norm(y), 0.0005, 0.05)


def beep(r, dur=0.15, f0=1250):
    """Piepen (Gerät, Alarmton einzeln)."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.sign(np.sin(2 * np.pi * f0 * t)) * 0.5 + np.sin(2 * np.pi * f0 * t) * 0.5
    return fade(lp(y, 6000), 0.003, 0.01)


def gurgle(r, dur=4.0):
    """Blubbern (Viren, Flüssigkeit): viele kleine, tiefe Blasen."""
    n = ns(dur)
    y = lp(noise(n, r, 1.5), 300) * 0.3
    k = int(dur * 14)
    for _ in range(k):
        g = modal(r.uniform(140, 420), [1], [1], [0.04], 0.1, r) * np.linspace(1, 1.6, ns(0.1)) ** 0
        i = ns(r.uniform(0, dur - 0.1))
        y[i:i + len(g)] += g[: n - i] * r.uniform(0.3, 1)
    return fade(_norm(y), 0.3, 0.4)


def gasp(r, dur=0.7):
    """Keuchen / erschrockenes Einatmen der Menge: gefiltertes Rauschen mit Formant."""
    n = ns(dur)
    env = adsr(n, 0.08, 0.15, 0.6, 0.35)
    y = (bp(noise(n, r), 600, 1200) + 0.6 * bp(noise(n, r), 1800, 3200)) * env
    return fade(_norm(y), 0.005, 0.05)


def typewriter(r, dur=0.12):
    """Schreibmaschinen-Anschlag: Typenhebel-Klack + Metall."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = hp(noise(n, r), 2000) * np.exp(-t / 0.006) + modal(1900, [1, 2.7], [0.4, 0.2], [0.02, 0.01], dur, r)
    return fade(_norm(y), 0.0003, 0.02)


def alarm(r, dur=2.0, rate=2.4):
    """Alarm: abwechselnde Pieptöne in festem Takt."""
    y = np.zeros(ns(dur))
    k = 0
    while k / rate < dur:
        b = beep(r, 0.18, 1250 if k % 2 == 0 else 950)
        i = ns(k / rate)
        y[i:i + len(b)] += b[: len(y) - i]
        k += 1
    return y


SOUNDS = {
    "whoosh": whoosh, "step": step, "creak": creak, "clink": clink, "pop": pop, "impact": impact, "sparkle": sparkle,
    "clack": clack, "rustle": rustle, "ring": ring, "water": water, "crowd": crowd, "air": air, "birds": birds,
    "heartbeat": heartbeat, "buzz": buzz, "tick": tick, "stamp": stamp, "beep": beep, "gurgle": gurgle, "gasp": gasp,
    "typewriter": typewriter, "alarm": alarm,
}


def note(r, dur=1.2, instrument="glock", midi_note=72):
    """Einzelner Instrumententon als Geräusch-Ereignis (z. B. aufsteigende Glockentöne)."""
    import instrumente as I
    from core import midi
    fn = I.INSTRUMENTS[instrument]
    return _norm(fn(midi(midi_note), dur, r))


SOUNDS["note"] = note


def glocke(r, dur=4.0, f0=196.0):
    """Kirchenglocke (V0005): ein Schlag mit den typischen unharmonischen Teiltönen (Unterton, Prime, kleine Terz,
    Quinte, Oktave) und langem Nachklang; tiefer f0 = grössere Glocke."""
    hit = modal(f0, [0.5, 1.0, 1.19, 1.5, 2.0, 2.52, 3.0], [0.7, 1.0, 0.55, 0.3, 0.45, 0.2, 0.15],
                [3.2, 2.2, 1.6, 1.0, 1.2, 0.6, 0.4], dur, r, detune=0.002)
    n = ns(dur)
    t = np.arange(n) / SR
    strike = bp(noise(n, r), 800, 4000) * np.exp(-t / 0.012) * 0.4
    return fade(_norm(hit * (1 + 0.04 * np.sin(2 * np.pi * 1.3 * t)) + strike), 0.001, 0.3)


def moewe(r, dur=0.7):
    """Möwenschrei (V0005): zwei bis drei kurze, abfallende, raue Rufe."""
    y = np.zeros(ns(dur))
    pos = 0
    for k in range(r.integers(2, 4)):
        m = ns(r.uniform(0.12, 0.18))
        tt = np.arange(m) / SR
        f = np.linspace(r.uniform(1500, 1800), r.uniform(900, 1100), m)
        ph = np.cumsum(f) / SR
        v = np.sin(2 * np.pi * ph) + 0.35 * np.sin(4 * np.pi * ph) + 0.15 * np.sign(np.sin(2 * np.pi * ph))
        v *= np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 0.6
        if pos + m > len(y): break
        y[pos:pos + m] += v
        pos += m + ns(r.uniform(0.04, 0.08))
    return fade(_norm(bp(y, 600, 5000)), 0.002, 0.03)


SOUNDS["glocke"] = glocke
SOUNDS["moewe"] = moewe



# ---------- Wasser, Feuer, Tiere, Münzen, Seilwinde ----------
def _wabern(r, n, rate):
    """Weiche Zufallskurve −1 … +1 mit etwa `rate` Wechseln pro Sekunde (für Wogen, Flackern, Zug am Seil)."""
    k = max(2, int(n / SR * rate) + 2)
    v = r.uniform(-1, 1, k)
    x = np.linspace(0, k - 1, n, endpoint=False)
    i = x.astype(int)
    w = (1 - np.cos(np.pi * (x - i))) / 2
    return v[i] * (1 - w) + v[i + 1] * w


def _tropfen(r, f0=None):
    """Ein Wassertropfen: kurzer Klick und ein Ton, der schnell nach oben gleitet (Blase unter der Oberfläche)."""
    m = ns(0.09)
    t = np.arange(m) / SR
    f0 = f0 or r.uniform(700, 1100)
    f = f0 * (1 + 1.4 * (1 - np.exp(-t / 0.012)))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025)
    y[: ns(0.002)] += hp(noise(ns(0.002), r), 3000) * 0.5
    return y


def drip(r, dur=1.2, tropfen=1, echo=0.35):
    """Tropfen im Tunnel: `tropfen` einzelne Tropfen (der erste sofort, die weiteren zufällig verteilt) mit kurzem
    Tunnel-Echo (`echo` 0 = trocken). Mehr Raum gibt der Hall-Wert des Ereignisses."""
    n = ns(dur)
    y = np.zeros(n)
    for k in range(max(1, int(tropfen))):
        g = _tropfen(r)
        i = 0 if k == 0 else ns(r.uniform(0.15, 0.85) * dur)
        y[i:i + len(g)] += g[: n - i] * (1.0 if k == 0 else r.uniform(0.5, 0.9))
    if echo:
        trocken = y.copy()
        for d, a in ((0.083, 0.55), (0.171, 0.35), (0.262, 0.2)):
            j = ns(d)
            if j < n:
                y[j:] += lp(trocken[: n - j], 2500) * a * echo
    return fade(_norm(y), 0.0005, 0.05)


def rush(r, dur=6.0, staerke=0.6):
    """Wasser rauscht im Kanal: gleichmässig fliessend, breites Rauschen mit leisem Wogen und kleinen Blasen (Stereo);
    `staerke` 0 … 1 = wie viel Wasser (mehr = heller und dichter)."""
    n = ns(dur)
    y = np.zeros((2, n))
    for c in range(2):
        tief = bp(noise(n, r, 1.0), 120, 900 + 1500 * staerke)
        hell = hp(noise(n, r), 2500) * (0.06 + 0.1 * staerke)
        wogen = 1 + 0.15 * _wabern(r, n, 1.5)
        blasen = np.zeros(n)
        for _ in range(int(dur * (6 + 10 * staerke))):
            g = modal(r.uniform(300, 900), [1], [1], [0.02], 0.06, r)
            i = ns(r.uniform(0, max(dur - 0.06, 0.01)))
            blasen[i:i + len(g)] += g[: n - i] * r.uniform(0.03, 0.12)
        y[c] = (tief / (np.abs(tief).max() + 1e-9) + hell) * wogen + blasen
    return fade(y / (np.abs(y).max() + 1e-9), min(0.4, dur / 4), min(0.6, dur / 4))


def splash(r, dur=0.8, gross=1.0):
    """Plantschen / Spritzer: Aufschlag, tiefer Plopp, danach fallende Tropfen; `gross` 0,3 (Hand) … 1,5 (Sprung)."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(noise(n, r), 300, 6000) * np.exp(-t / (0.03 + 0.03 * gross))
    f = 220 / (0.6 + 0.4 * gross) * (1 + 0.8 * t)
    y += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.06) * 0.6 * gross
    for _ in range(int(8 + 14 * gross)):
        g = _tropfen(r, r.uniform(900, 2200)) * 0.35
        i = ns(min(r.exponential(0.12) + 0.04, max(dur - 0.1, 0.05)))
        y[i:i + len(g)] += g[: n - i] * r.uniform(0.3, 1)
    return fade(_norm(y), 0.0005, 0.08)


def fire(r, dur=4.0, knistern=1.0):
    """Knisterndes Feuer (Ofen, Fackel, Bleischmelze): dunkles flackerndes Rauschen und zufällige Knackser (Stereo);
    `knistern` 0 … 2."""
    n = ns(dur)
    y = np.zeros((2, n))
    for c in range(2):
        flackern = 0.65 + 0.35 * _wabern(r, n, 4)
        brand = bp(noise(n, r, 1.0), 120, 1500)
        y[c] = brand / (np.abs(brand).max() + 1e-9) * flackern * 0.6
        for _ in range(int(dur * 9 * knistern)):
            m = ns(r.uniform(0.001, 0.004))
            i = ns(r.uniform(0, max(dur - 0.01, 0.01)))
            k = hp(noise(m, r), 1800) * np.exp(-np.arange(m) / (m * 0.3 + 1))
            y[c, i:i + m] += k[: n - i] * r.uniform(0.2, 0.6)
        for _ in range(int(dur * 1.2 * knistern)):                       # grössere Knalle (Harz im Holz)
            m = ns(0.03)
            i = ns(r.uniform(0, max(dur - 0.04, 0.01)))
            k = bp(noise(m, r), 900, 4500) * np.exp(-np.arange(m) / ns(0.006))
            y[c, i:i + m] += k[: n - i] * r.uniform(0.5, 1.0)
    return fade(y / (np.abs(y).max() + 1e-9), min(0.3, dur / 4), min(0.5, dur / 4))


def sheep(r, dur=0.9, f0=300):
    """Schaf blökt „mäh“: Stimme mit starkem Zittern (etwa 7 Hz), Vokal „ä“, Ton fällt am Ende; tiefer `f0` = grösseres Tier."""
    n = ns(dur)
    t = np.arange(n) / SR
    fall = np.where(t > dur * 0.6, 1 - 0.12 * (t - dur * 0.6) / (dur * 0.4), 1)
    f = f0 * (1 + 0.05 * np.sin(2 * np.pi * 7.2 * t)) * fall
    ph = 2 * np.pi * np.cumsum(f) / SR
    quelle = sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 18)) + 0.15 * noise(n, r)   # Stimme + Rauheit
    y = bp(quelle, 600, 900) + 0.7 * bp(quelle, 1500, 2100) + 0.3 * bp(quelle, 2600, 3300)
    zittern = 0.65 + 0.35 * np.sin(2 * np.pi * 7.2 * t + 0.5)
    m = ns(0.05)
    y[:m] *= np.linspace(0.2, 1, m)                                          # weicher Anfang (wie „m“)
    return fade(_norm(y * zittern * adsr(n, 0.05, 0.1, 0.85, dur * 0.35)), 0.003, 0.05)


def coins(r, dur=1.0, anzahl=8):
    """Münzen klimpern: helle Metall-Klicks kurz nacheinander (ausgeschüttet, im Beutel), Stereo; `anzahl` = Münzen."""
    n = ns(dur)
    y = np.zeros((2, n))
    for k in range(max(1, int(anzahl))):
        g = modal(r.uniform(3200, 6500), [1, 1.47, 2.09, 2.56], [1, 0.6, 0.4, 0.25], [0.12, 0.08, 0.05, 0.03],
                  min(0.3, dur), r, 0.01)
        g[: ns(0.002)] += hp(noise(ns(0.002), r), 4000) * 0.6
        i = ns(min(r.exponential(dur * 0.18), max(dur - 0.05, 0.0))) if k else 0
        y[:, i:i + len(g)] += pan(g[: n - i] * r.uniform(0.4, 1.0), r.uniform(-0.6, 0.6))
    return fade(y / (np.abs(y).max() + 1e-9), 0.0005, 0.08)


def winch(r, dur=3.0, klicks=6.0):
    """Knarrende Seilwinde (Kran, Brunnen): Sperrklinke klickt im Takt (`klicks` pro Sekunde), Holz knarrt, Seil ächzt tief."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = bp(noise(n, r, 1.0), 70, 380) * (0.6 + 0.4 * _wabern(r, n, 1.2))
    y = y / (np.abs(y).max() + 1e-9) * 0.3                                  # Seil unter Zug
    k = 0.0
    while k < dur - 0.07:
        c = clack(r, 0.06, r.uniform(1100, 1400)) * 0.55
        i = ns(k)
        y[i:i + len(c)] += c[: n - i]
        k += 1 / klicks * r.uniform(0.9, 1.1)
    k = r.uniform(0.1, 0.4)
    while k < dur - 0.3:
        d = r.uniform(0.25, 0.45)
        c = creak(r, d, r.uniform(90, 130), r.uniform(160, 240)) * 0.8
        i = ns(k)
        y[i:i + len(c)] += c[: n - i]
        k += d + r.uniform(0.3, 0.7)
    return fade(_norm(y) * np.clip(t / 0.08, 0, 1), 0.005, 0.1)


SOUNDS.update({"drip": drip, "rush": rush, "splash": splash, "fire": fire, "sheep": sheep, "coins": coins, "winch": winch})
