# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Vergleichsbogen: unsere Testbilder neben Referenz-Frames aus einem fertigen Video, mit Messwerten je Gruppe.
# Messung wie tools/measure/measure_video.py: Helligkeit (Luma Rec.709) Median, Kontrast = Luma-Standardabweichung,
# Sättigung = Mittel von (max-min)/max ohne Tusche-Pixel (max < 0,08).
#
# Aufruf (aus dem Hauptordner):
#   python engine/v01/qa/bogen.py <bogen.png> <messung.json> \
#     --gruppe Tag  --ref <video.mp4> 90,270,1260 --unsere output/a_15.png,output/a_45.png \
#     --gruppe Abend --ref <video.mp4> 1620,1710 --unsere ...
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

FFMPEG = os.path.abspath(os.path.join("tools", "ffmpeg", "bin", "ffmpeg.exe"))
if not os.path.exists(FFMPEG):
    FFMPEG = "ffmpeg"
TILE_H = 480


def ref_frame(video, n):
    out = subprocess.run([FFMPEG, "-loglevel", "error", "-i", video, "-vf", f"select=eq(n\\,{n})", "-frames:v", "1",
                          "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True, check=True).stdout
    from io import BytesIO
    return Image.open(BytesIO(out)).convert("RGB")


def stats(imgs):
    ys, sats = [], []
    for im in imgs:
        f = np.asarray(im, np.float32) / 255.0
        y = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        mx, mn = f.max(2), f.min(2)
        non = mx >= 0.08
        ys.append(y.ravel()); sats.append(((mx - mn) / np.maximum(mx, 1e-3))[non].ravel())
    y = np.concatenate(ys); s = np.concatenate(sats)
    return {"helligkeit_median": round(float(np.median(y)), 3), "kontrast_std": round(float(y.std()), 3), "saettigung": round(float(s.mean()), 3)}


def scaled(im):
    return im.resize((round(im.width * TILE_H / im.height), TILE_H), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bogen"); ap.add_argument("messung")
    ap.add_argument("--gruppe", action="append", default=[])
    ap.add_argument("--ref", action="append", nargs=2, default=[])
    ap.add_argument("--unsere", action="append", default=[])
    a = ap.parse_args()
    if not (len(a.gruppe) == len(a.ref) == len(a.unsere)):
        sys.exit("je --gruppe braucht genau ein --ref und ein --unsere")
    rows, result = [], {}
    for name, (video, frames), ours in zip(a.gruppe, a.ref, a.unsere):
        refs = [ref_frame(video, int(n)) for n in frames.split(",")]
        mine = [Image.open(p).convert("RGB") for p in ours.split(",")]
        mass = lambda x: x.resize((540, 960) if x.height > x.width else (960, 540))   # Hoch- oder Querformat automatisch
        r, m = stats([mass(x) for x in refs]), stats([mass(x) for x in mine])
        diff = {k: round((m[k] - r[k]) / r[k] * 100, 1) for k in r}
        result[name] = {"referenz": r, "unsere": m, "abweichung_prozent": diff, "ref_frames": frames, "unsere_bilder": ours.split(",")}
        rows.append((f"{name} – Referenz ({os.path.basename(video)})", [scaled(x) for x in refs], r))
        rows.append((f"{name} – eigener Motor", [scaled(x) for x in mine], m, diff))
    W = max(sum(t.width for t in row[1]) + 10 * len(row[1]) for row in rows) + 20
    H = sum(TILE_H + 60 for _ in rows) + 20
    sheet = Image.new("RGB", (W, H), (24, 22, 30))
    d = ImageDraw.Draw(sheet)
    y = 10
    for row in rows:
        label, tiles, st = row[0], row[1], row[2]
        txt = f"{label}   Helligkeit {st['helligkeit_median']}  Kontrast {st['kontrast_std']}  Sättigung {st['saettigung']}"
        if len(row) > 3:
            txt += "   Abweichung " + "  ".join(f"{v:+.1f} %" for v in row[3].values())
        d.text((12, y + 14), txt, fill=(240, 236, 228))
        x = 10
        for t in tiles:
            sheet.paste(t, (x, y + 50)); x += t.width + 10
        y += TILE_H + 60
    sheet.save(a.bogen)
    with open(a.messung, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: v["abweichung_prozent"] for k, v in result.items()}, ensure_ascii=False))
    for k, v in result.items():
        print(k, "ref", v["referenz"], "unsere", v["unsere"])


if __name__ == "__main__":
    main()
