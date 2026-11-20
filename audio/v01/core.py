# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Grundlagen des Ton-Baukastens v01: Puffer, Zeit, Zufall, Rauschen, Filter, Hüllkurven, Panorama, Platzieren, Hall,
# Resonanz-Klänge, Lautheit (EBU R128 / ITU-R BS.1770-4), Spitzenwert (True Peak), Begrenzer, WAV schreiben.
# Alles deterministisch: gleicher Startwert = gleiche Samples.
import wave
import numpy as np
from scipy import signal

SR = 48000


def ns(sec):
    """Sekunden -> Anzahl Samples (gerundet)."""
    return int(round(sec * SR))


def t_axis(sec):
    return np.arange(ns(sec)) / SR


def rng(seed):
    return np.random.default_rng(seed)


def stereo(n):
    return np.zeros((2, n))


# ---------- Rauschen und Filter ----------
def noise(n, r, color=0.0):
    """Farbiges Rauschen: color 0 = weiss, 1 = rosa, 2 = braun (Leistung ~ 1/f^color). Normiert auf Spitze 1."""
    x = r.standard_normal(n)
    if color:
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(n, 1 / SR)
        f[0] = f[1] if n > 1 else 1
        X /= f ** (color / 2)
        x = np.fft.irfft(X, n)
    return x / (np.max(np.abs(x)) + 1e-12)


def _sos(kind, f, order=2):
    nyq = SR / 2
    if kind == "bp":
        lo, hi = f
        return signal.butter(order, [max(lo, 10) / nyq, min(hi, nyq * 0.98) / nyq], btype="band", output="sos")
    return signal.butter(order, min(f, nyq * 0.98) / nyq, btype="low" if kind == "lp" else "high", output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(_sos("lp", f, order), x, axis=-1)


def hp(x, f, order=2):
    return signal.sosfilt(_sos("hp", f, order), x, axis=-1)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("bp", (lo, hi), order), x, axis=-1)


# ---------- Hüllkurven ----------
def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    """Anschlag/Abfall/Halten/Ausklang in Sekunden (Haltepegel s). Länge n Samples."""
    env = np.full(n, s, float)
    na, nd, nr = ns(a), ns(d), ns(r)
    na = min(na, n); env[:na] = np.linspace(0, 1, na, endpoint=False) if na else env[:0]
    e = min(na + nd, n); env[na:e] = np.linspace(1, s, e - na, endpoint=False)
    nr = min(nr, n); env[n - nr:] *= np.linspace(1, 0, nr) if nr else 1
    return env


def decay(n, tau):
    """Exponentieller Abfall mit Zeitkonstante tau (s)."""
    return np.exp(-np.arange(n) / (tau * SR))


def fade(x, fin=0.005, fout=0.005):
    """Weiches Ein-/Ausblenden (gegen Knackser)."""
    x = np.array(x, float)
    n = x.shape[-1]
    a, b = min(ns(fin), n), min(ns(fout), n)
    if a: x[..., :a] *= np.linspace(0, 1, a)
    if b: x[..., n - b:] *= np.linspace(1, 0, b)
    return x


# ---------- Raum ----------
def pan(x, p=0.0):
    """Mono -> Stereo mit gleicher Leistung; p = -1 links … +1 rechts."""
    if x.ndim == 2:
        return x
    a = (p + 1) * np.pi / 4
    return np.vstack([x * np.cos(a), x * np.sin(a)])


def place(buf, x, t, gain=1.0):
    """Klang x (mono oder stereo) ab Sekunde t in den Stereo-Puffer addieren (über das Ende hinaus wird abgeschnitten)."""
    x = pan(np.asarray(x, float))
    i = ns(t)
    if i >= buf.shape[1] or i + x.shape[1] <= 0:
        return buf
    a, b = max(0, -i), min(x.shape[1], buf.shape[1] - i)
    buf[:, i + a:i + b] += x[:, a:b] * gain
    return buf


def room(seconds=1.6, r=None, bright=0.5, width=0.8):
    """Raumantwort: frühe Reflexionen + abklingendes Rauschen, das mit der Zeit dunkler wird. Stereo, Summe ≈ 1."""
    r = r or rng(99)
    n = ns(seconds)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for ch in range(2):
        tail = noise(n, r, 0.0) * np.exp(-t * 6.9 / seconds)
        dark = lp(tail, 1500 + 6000 * bright)
        mix = np.linspace(0, 1, n) ** 0.7
        out[ch] = tail * (1 - mix) * bright + dark * (mix + (1 - bright))
        for _ in range(8):  # frühe Reflexionen
            d = ns(r.uniform(0.008, 0.06))
            if d < n: out[ch, d] += r.uniform(0.2, 0.5) * (1 if r.random() > 0.5 else -1)
    mid = out.mean(0)
    out = mid + (out - mid) * width
    return out / (np.sqrt((out ** 2).sum() / 2) + 1e-12)


def reverb(x, ir, wet=0.2):
    """Hall: trockenes Signal + gefaltete Raumantwort (gleiche Länge wie x)."""
    x = pan(np.asarray(x, float))
    n = x.shape[1]
    w = np.vstack([signal.fftconvolve(x[c], ir[c])[:n] for c in range(2)])
    return x + w * wet


# ---------- Resonanz (Glocken, Holz, Metall) ----------
def modal(f0, ratios, amps, taus, dur, r=None, detune=0.0):
    """Summe gedämpfter Sinus-Teiltöne: f0 * ratio, Amplitude, Abklingzeit (s)."""
    n = ns(dur)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, (q, a, tau) in enumerate(zip(ratios, amps, taus)):
        f = f0 * q * (1 + (r.uniform(-detune, detune) if r is not None and detune else 0))
        if f >= SR / 2: continue
        ph = r.uniform(0, 2 * np.pi) if r is not None else 0
        y += a * np.sin(2 * np.pi * f * t + ph) * np.exp(-t / tau)
    return fade(y, 0.001, 0.01)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------- Lautheit ----------
_K1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
_K2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])


def _kweight(x):
    y = signal.lfilter(*_K1, x, axis=-1)
    return signal.lfilter(*_K2, y, axis=-1)


def _block_power(x, block=0.4, step=0.1):
    y = _kweight(pan(x))
    p = (y ** 2).sum(0)
    nb, nst = ns(block), ns(step)
    if len(p) < nb:
        return np.array([p.mean()])
    c = np.concatenate([[0], np.cumsum(p)])
    starts = np.arange(0, len(p) - nb + 1, nst)
    return (c[starts + nb] - c[starts]) / nb


def lufs(x):
    """Integrierte Lautheit (LUFS) nach BS.1770-4: K-Filter, 400-ms-Blöcke, absolutes (-70) und relatives (-10 LU) Tor."""
    z = _block_power(x)
    L = -0.691 + 10 * np.log10(z + 1e-20)
    z = z[L > -70]
    if not len(z): return -120.0
    rel = -0.691 + 10 * np.log10(z.mean()) - 10
    z = z[(-0.691 + 10 * np.log10(z)) > rel]
    return float(-0.691 + 10 * np.log10(z.mean()))


def lufs_max_momentary(x):
    z = _block_power(x)
    return float(-0.691 + 10 * np.log10(z.max() + 1e-20))


def true_peak_db(x):
    """Spitzenwert mit 4-facher Überabtastung (dBTP)."""
    up = signal.resample_poly(pan(x), 4, 1, axis=-1)
    return float(20 * np.log10(np.max(np.abs(up)) + 1e-12))


def limit(x, ceiling_db=-2.2, look=0.005, release=0.08):
    """Begrenzer mit Vorausschau: Spitzen (4-fach überabgetastet) bleiben unter `ceiling_db`."""
    from scipy.ndimage import minimum_filter1d
    x = pan(x)
    ceil = 10 ** (ceiling_db / 20)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    peak = up.reshape(-1, 4).max(1)[: x.shape[1]] if len(up) >= 4 * x.shape[1] else np.abs(x).max(0)
    need = np.minimum(1.0, ceil / np.maximum(peak, 1e-12))
    w = max(1, ns(look))
    g = minimum_filter1d(need, size=2 * w + 1, mode="nearest")
    a = np.exp(-1 / (release * SR))
    g = signal.lfilter([1 - a], [1, -a], g, zi=[g[0] * a])[0]   # weiches Lösen
    g = np.minimum(g, minimum_filter1d(need, size=2 * w + 1, mode="nearest"))
    return x * g


# ---------- Datei ----------
def write_wav(path, x, bits=24):
    x = pan(np.asarray(x, float))
    x = np.clip(x, -1, 1 - 1e-9)
    if bits == 24:
        v = (x.T * (2 ** 23 - 1)).round().astype("<i4")
        b = v.astype("<i4").tobytes()
        raw = np.frombuffer(b, np.uint8).reshape(-1, 4)[:, :3].tobytes()
        width = 3
    else:
        raw = (x.T * 32767).round().astype("<i2").tobytes(); width = 2
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(width); w.setframerate(SR); w.writeframes(raw)


def read_wav(path):
    with wave.open(path, "rb") as w:
        n, ch, width, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    if width == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        v = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        v = np.where(v >= 2 ** 23, v - 2 ** 24, v) / (2 ** 23)
    else:
        v = np.frombuffer(raw, "<i2") / 32768.0
    v = v.reshape(-1, ch).T
    return (v if ch == 2 else np.vstack([v[0], v[0]])), sr
