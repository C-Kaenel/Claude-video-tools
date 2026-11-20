# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Instrumente: jedes ist eine Funktion (Tonhöhe in Hz, Länge in s, Zufall, Angaben) -> Mono-Signal.
# Zupfen (Saite), Fläche, Glockenspiel, Vibraphon, Spieluhr, kleine Trommel, Pauke, Blech, Querflöte, Becken.
import numpy as np
from scipy import signal
from core import SR, ns, noise, lp, hp, bp, adsr, decay, fade, modal


def pluck(f, dur, r, bright=0.5, damp=0.996):
    """Gezupfte Saite (Karplus-Strong): Rauschimpuls in einer Verzögerungsschleife mit Dämpfung."""
    n = ns(dur)
    L = max(2, int(round(SR / f)))
    burst = np.zeros(n)
    k = min(L, n)
    burst[:k] = lp(noise(k, r), 1200 + 9000 * bright) if k > 8 else noise(k, r)
    a = np.zeros(L + 2); a[0] = 1; a[L] = -damp / 2; a[L + 1] = -damp / 2
    y = signal.lfilter([1.0], a, burst)
    y = hp(y, 60)
    return fade(y / (np.max(np.abs(y)) + 1e-9), 0.0005, min(0.08, dur * 0.3))


def pad(freqs, dur, r, attack=0.4, release=0.6, warm=900.0, detune=0.004):
    """Fläche: mehrere leicht verstimmte Sägezähne je Ton, weich gefiltert, langsam ein und aus."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0.0, detune):
            ph = r.uniform(0, 1)
            y += signal.sawtooth(2 * np.pi * f * (1 + d) * t + 2 * np.pi * ph) / 3
    y = lp(y, warm, 2)
    y *= adsr(n, attack, 0.2, 0.85, release)
    return y / (len(freqs) + 1e-9)


def glock(f, dur, r):
    """Glockenspiel: heller Metallstab (unharmonische Teiltöne, lang klingend)."""
    return modal(f, [1, 2.76, 5.4, 8.93], [1, 0.45, 0.25, 0.1], [1.2, 0.5, 0.25, 0.12], dur, r, 0.002)


def vibes(f, dur, r, tremolo=5.5):
    """Vibraphon: weicher Metallton mit Tremolo."""
    y = modal(f, [1, 3.99, 9.9], [1, 0.25, 0.05], [1.6, 0.4, 0.15], dur, r)
    t = np.arange(len(y)) / SR
    return y * (0.82 + 0.18 * np.sin(2 * np.pi * tremolo * t))


def musicbox(f, dur, r):
    """Spieluhr: kurzer Kamm-Zinken-Ton, hoch und zart, mit kleinem Klick."""
    y = modal(f, [1, 3.0, 5.8, 9.2], [1, 0.3, 0.12, 0.05], [0.8, 0.25, 0.1, 0.05], dur, r, 0.003)
    click = hp(noise(ns(0.004), r), 4000) * 0.15
    y[: len(click)] += click
    return y


def snare(dur, r, tune=1.0, snappy=0.6):
    """Kleine Trommel: Fell-Ton + Teppich-Rauschen."""
    n = ns(dur)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * tune * t) * np.exp(-t / 0.05)
    wires = bp(noise(n, r), 1800, 9000) * np.exp(-t / (0.06 + 0.1 * snappy))
    return fade(body * 0.6 + wires * (0.5 + 0.5 * snappy), 0.0005, 0.02)


def timpani(f, dur, r):
    """Pauke: tiefer, gestimmter Kessel mit dumpfem Anschlag."""
    y = modal(f, [1, 1.5, 1.98, 2.44], [1, 0.5, 0.3, 0.15], [1.4, 0.8, 0.5, 0.3], dur, r, 0.004)
    n = len(y)
    thump = lp(noise(n, r), 400) * decay(n, 0.04) * 0.6
    return y + thump


def brass(f, dur, r, kind="horn", vibrato=0.004):
    """Blech: Sägezahn mit sich öffnendem Filter; kind 'tuba' (tief, rund), 'horn' (warm), 'trumpet' (hell)."""
    n = ns(dur)
    t = np.arange(n) / SR
    vib = 1 + vibrato * np.sin(2 * np.pi * 5.0 * t) * np.clip(t / 0.3, 0, 1)
    ph = np.cumsum(f * vib) / SR
    y = signal.sawtooth(2 * np.pi * ph)
    base = {"tuba": 350, "horn": 900, "trumpet": 2200}[kind]
    env = adsr(n, 0.05 if kind != "trumpet" else 0.02, 0.15, 0.8, min(0.2, dur * 0.3))
    y = lp(y, base * 1.5) * 0.6 + lp(y * env, base * 3) * 0.4
    return y * env


def fife(f, dur, r, vibrato=0.006):
    """Querflöte (Pfeife): fast reiner Ton, Hauch-Rauschen, leichtes Vibrato."""
    n = ns(dur)
    t = np.arange(n) / SR
    vib = 1 + vibrato * np.sin(2 * np.pi * 5.5 * t)
    ph = np.cumsum(f * vib) / SR
    y = np.sin(2 * np.pi * ph) + 0.18 * np.sin(4 * np.pi * ph)
    breath = bp(noise(n, r), f * 1.5, min(f * 6, 16000)) * 0.08
    return (y + breath) * adsr(n, 0.04, 0.1, 0.85, min(0.12, dur * 0.3))


def cymbal(dur, r, bright=0.7):
    """Becken: helles, lang ausklingendes Metallrauschen."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = hp(noise(n, r), 3000 + 3000 * bright) * np.exp(-t / (0.5 + dur * 0.3))
    ring = modal(420, [1, 1.47, 2.09, 2.56, 3.8], [0.3, 0.25, 0.2, 0.15, 0.1], [0.8] * 5, dur, r, 0.01)
    return fade(y * 0.8 + ring * 0.2, 0.0005, 0.05)


INSTRUMENTS = {"pluck": pluck, "pad": pad, "glock": glock, "vibes": vibes, "musicbox": musicbox,
               "snare": snare, "timpani": timpani, "brass": brass, "fife": fife, "cymbal": cymbal}
