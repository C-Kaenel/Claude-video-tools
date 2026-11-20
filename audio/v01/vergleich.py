# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Vergleich zweier Ton-Mischungen (A ↔ B, z. B. vorher ↔ nachher): Lautheitsverlauf (3-s-Fenster), Klangfarbe (spektraler Schwerpunkt) und
# Spektrogramm als Bild, dazu Kennzahlen als JSON. Hilft beim Hörvergleich – ersetzt ihn nicht.
# Aufruf: python audio/v01/vergleich.py <alt.wav> <neu.wav> <bild.png> [titel]
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import SR, read_wav, lufs, true_peak_db, _kweight


def short_term(x, win=3.0, step=0.5):
    y = (_kweight(x) ** 2).sum(0)
    c = np.concatenate([[0], np.cumsum(y)])
    w, s = int(win * SR), int(step * SR)
    idx = np.arange(0, max(1, len(y) - w), s)
    return np.array([-0.691 + 10 * np.log10((c[i + w] - c[i]) / w + 1e-20) for i in idx])


def centroid(x, step=0.5):
    m = x.mean(0); s = int(step * SR); out = []
    for i in range(0, len(m) - s, s):
        X = np.abs(np.fft.rfft(m[i:i + s] * np.hanning(s))); f = np.fft.rfftfreq(s, 1 / SR)
        out.append(float((X * f).sum() / (X.sum() + 1e-12)))
    return np.array(out)


def spectro(x, w=900, h=160):
    m = x.mean(0); hop = max(1, len(m) // w); n = 2048
    cols = []
    for i in range(w):
        seg = m[i * hop:i * hop + n]
        if len(seg) < n: seg = np.pad(seg, (0, n - len(seg)))
        X = 20 * np.log10(np.abs(np.fft.rfft(seg * np.hanning(n)))[:n // 2] + 1e-9)
        cols.append(X)
    S = np.array(cols).T                                   # Frequenz × Zeit
    f = np.fft.rfftfreq(n, 1 / SR)[:n // 2]
    rows = np.geomspace(40, 16000, h)
    S = np.array([S[np.searchsorted(f, q)] for q in rows])[::-1]
    S = np.clip((S - S.max() + 80) / 80, 0, 1)
    return Image.fromarray((S * 255).astype(np.uint8)).convert("L").resize((w, h))


def main():
    a, b, out = sys.argv[1:4]
    title = sys.argv[4] if len(sys.argv) > 4 else ""
    A, _ = read_wav(a); B, _ = read_wav(b)
    la, lb = short_term(A), short_term(B)
    W, H = 960, 640
    img = Image.new("RGB", (W, H), (24, 22, 30)); d = ImageDraw.Draw(img)
    d.text((20, 10), f"{title}  alt {lufs(A):.1f} LUFS / {true_peak_db(A):.1f} dBTP   neu {lufs(B):.1f} LUFS / {true_peak_db(B):.1f} dBTP", fill=(240, 236, 228))
    # Lautheitsverlauf
    x0, y0, pw, ph = 30, 40, 900, 180
    d.rectangle([x0, y0, x0 + pw, y0 + ph], outline=(90, 90, 100))
    for L, col in ((la, (120, 170, 255)), (lb, (255, 170, 90))):
        pts = [(x0 + i * pw / max(1, len(L) - 1), y0 + ph * (1 - (np.clip(v, -45, -10) + 45) / 35)) for i, v in enumerate(L)]
        d.line(pts, fill=col, width=2)
    d.text((x0 + 4, y0 + 4), "Lautheit 3 s (-45 … -10 LUFS)   blau = alt, orange = neu", fill=(200, 200, 210))
    for k, (X, lab) in enumerate(((A, "alt"), (B, "neu"))):
        img.paste(spectro(X).convert("RGB"), (x0, 240 + k * 190))
        d.text((x0 + 4, 240 + k * 190 + 2), f"Spektrogramm {lab} (40 Hz – 16 kHz)", fill=(255, 220, 120))
    img.save(out)
    ca, cb = centroid(A), centroid(B)
    n = min(len(la), len(lb))
    res = {"alt": {"lufs": round(lufs(A), 2), "spitze_dbtp": round(true_peak_db(A), 2), "schwerpunkt_hz": round(float(np.median(ca)))},
           "neu": {"lufs": round(lufs(B), 2), "spitze_dbtp": round(true_peak_db(B), 2), "schwerpunkt_hz": round(float(np.median(cb)))},
           "verlauf_korrelation": round(float(np.corrcoef(la[:n], lb[:n])[0, 1]), 2), "verlauf_mittlere_abweichung_lu": round(float(np.mean(np.abs(la[:n] - lb[:n]))), 2)}
    print(json.dumps(res, ensure_ascii=False))
    json.dump(res, open(os.path.splitext(out)[0] + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
