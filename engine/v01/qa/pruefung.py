# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Bild-für-Bild-Prüfung eines fertigen Videos – findet Fehler, bevor der Nutzer sie sieht:
#   Bild: schwarze Bilder, weisse Bilder (ausser geplanten Blitzen), eingefrorene Stellen, Sprünge mitten im Shot
#         (ausser geplanten Schnitten/Überblendungen), Karten/Text ausserhalb der Safe Area (aus der Prüf-Ebene "karten").
#   Farbe: je 3-s-Abschnitt Sättigung, Farbigkeit, Farbtöne, Helligkeit – „monoton“ (Fehler) oder „dunkel“ (Hinweis);
#         Schwellen in shared/design-tokens.json → look.pruefung; je Stil eigene Werte unter look.pruefung.stile.<stil>
#         (Stil aus dem Zeitplan `stil` = Style-Name oder --stil; "monoton": false = monoton nur als Hinweis).
#   Ton:  Lautheit (Ziel ±1 LU), Spitze (≤ Ziel + 0,5 dB), Länge = Bildlänge (±1 Frame), lange Stille.
#   Kapitel (Langform, aus dem Zeitplan): Länge je Kapitel gegen laengeSec, Einstellungen (Shots, an Schnitten geteilt)
#         gegen shotSec der Kapitel-Art (formats.long-form.kapitelArten) – nur Hinweise; im panorama ist „monoton“ erlaubt,
#         im aufruf „eingefroren“ (das letzte hook-Bild steht still).
# Format: erkennt Kurzform (Hochformat 9:16) und Langform (Querformat 16:9) selbst aus der Bildgrösse (oder dem Zeitplan);
#         Safe Area je Format aus den Tokens (safeArea.short-form / long-form), andere Grössen im Verhältnis zu 1080.
# Ausgabe: bericht.json, bericht.md (für Menschen), kontaktbogen.png (1 Bild je Sekunde, Fehler rot umrandet).
#
# Aufruf (aus dem Hauptordner):
#   python engine/v01/qa/pruefung.py <video.mp4> <ausgabe-ordner> [--zeitplan z.json] [--karten karten.mp4]
#                                    [--lufs -22.6] [--spitze -2] [--ohne-ton] [--stil quadratic-3d] [--teil]
# --teil: ein Kapitel (Teil des Videos) – Ton ohne Lautheits-Ziel (das gilt fürs ganze Video), Spitze/Länge/Stille wie sonst.
# Zeitplan:  node engine/v01/qa/zeitplan.mjs <einstieg.tsx> <Composition> z.json
# Karten:    npx remotion render <einstieg.tsx> <Composition> karten.mp4 --props='{"qa":"karten"}' --codec h264 --crf 18
import argparse, json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
FF = os.path.join(ROOT, "tools", "ffmpeg", "bin")
FFMPEG = os.path.join(FF, "ffmpeg.exe") if os.path.exists(os.path.join(FF, "ffmpeg.exe")) else "ffmpeg"
FFPROBE = os.path.join(FF, "ffprobe.exe") if os.path.exists(os.path.join(FF, "ffprobe.exe")) else "ffprobe"
TOKENS = json.load(open(os.path.join(ROOT, "shared", "design-tokens.json"), encoding="utf-8"))

# Schwellen (Werte 0…255 auf verkleinertem Graubild)
BLACK_MEAN, BLACK_MAX = 8, 24          # schwarz = fast nichts sichtbar (auch kein kleiner Text)
WHITE_MEAN, WHITE_P1 = 242, 215
FREEZE_DIFF, FREEZE_MIN = 0.03, 12          # mittlere Differenz < 0,03 über ≥ 12 Frames = eingefroren (langsame Fahrt ≈ 0,1)
JUMP_MIN, JUMP_FACTOR = 14.0, 5.0           # Sprung: Differenz ≥ 14 und ≥ 5 × örtlicher Median
SAFE_MIN_PX = 150                           # so viele Karten-Pixel (volle Auflösung) ausserhalb = Verstoss
LOOK = TOKENS.get("look", {}).get("pruefung", {"saettigungMin": 0.45, "farbigkeitMin": 20, "farbtoeneMin": 3, "helligkeitMin": 0.3, "abschnittSec": 3})
AUDIO = TOKENS.get("audio", {})


def schwellen(stil):
    """Farb-Schwellen für einen Stil: look.pruefung, darüber look.pruefung.stile.<schlüssel> (längster Schlüssel, der im
    Stil-Namen vorkommt, z. B. „quadratic-3d“ in „quadratic-3d-referenz“) → (schwellen, schlüssel oder None)."""
    basis = {k: v for k, v in LOOK.items() if k != "stile"}
    treffer = sorted((k for k in LOOK.get("stile", {}) if stil and k in stil), key=len)
    if not treffer: return basis, None
    return {**basis, **{k: v for k, v in LOOK["stile"][treffer[-1]].items() if k != "note"}}, treffer[-1]


def look_values(fr):
    """Sättigung (ohne Tusche), Farbigkeit (Hasler/Süsstrunk ×100), Helligkeit (Median), Anzahl kräftiger Farbtöne (12 Fächer)."""
    f = fr.astype(np.float32) / 255
    mx, mn = f.max(2), f.min(2); non = mx >= 0.08
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    rg = r - g; yb = 0.5 * (r + g) - b
    col = (np.sqrt(rg.var() + yb.var()) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)) * 100
    strong = (sat > 0.35) & (mx > 0.25)
    hue = (np.degrees(np.arctan2(np.sqrt(3) * (g - b), 2 * r - g - b)) + 360) % 360
    hist = np.histogram(hue[strong], 12, (0, 360))[0]
    tones = int((hist > 0.04 * strong.sum()).sum()) if strong.sum() > 50 else 0
    Y = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    return float(sat[non].mean()) if non.any() else 0.0, float(col), float(np.median(Y)), tones


def probe(path):
    out = subprocess.run([FFPROBE, "-v", "error", "-show_streams", "-show_format", "-of", "json", path], capture_output=True, text=True).stdout
    return json.loads(out)


def frames(path, w, h):
    p = subprocess.Popen([FFMPEG, "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    n = w * h * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(h, w, 3)
    p.wait()


def runs(mask, min_len=1):
    out, i = [], 0
    while i < len(mask):
        if mask[i]:
            j = i
            while j + 1 < len(mask) and mask[j + 1]: j += 1
            if j - i + 1 >= min_len: out.append([int(i), int(j)])
            i = j + 1
        else: i += 1
    return out


def allowed_frames(z):
    """Frames, an denen ein Wechsel geplant ist (Schnitt, Überblendung, Blitz ±1)."""
    trans, flash = set(), set()
    if not z: return trans, flash
    for k, s in enumerate(z["shots"]):
        if k > 0:
            for f in range(s["start"] - 1, s["start"] + max(1, s["fadeIn"]) + 2): trans.add(f)
        for c in s.get("cuts", []):
            for f in (c - 1, c, c + 1): trans.add(f)
        for k0, kn in s.get("kicks", []):   # geplanter Stoss: Kamera zuckt absichtlich
            for f in range(k0 - 1, k0 + kn + 2): trans.add(f)
        if s["flash"]:
            for f in range(s["start"], s["start"] + s["flash"] + 2): flash.add(f); trans.add(f)
    return trans, flash


def check_picture(path, z, W, H, schw=None):
    w, h = (135, 240) if H > W else (240, 135)
    means, p1s, maxs, diffs, thumbs, looks = [], [], [], [], {}, {}
    prev = None
    fps = z["fps"] if z else 30
    for i, fr in enumerate(frames(path, w, h)):
        g = fr.astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        means.append(float(g.mean())); p1s.append(float(np.percentile(g, 1))); maxs.append(float(fr.max()))
        diffs.append(float(np.abs(g - prev).mean()) if prev is not None else 0.0)
        prev = g
        if i % fps == 0: thumbs[i] = fr
        if i % 5 == 0: looks[i] = look_values(fr)
    means, p1s, maxs, diffs = map(np.array, (means, p1s, maxs, diffs))
    trans, flash = allowed_frames(z)
    n = len(means)
    black = (means < BLACK_MEAN) & (maxs < BLACK_MAX)
    white = (means > WHITE_MEAN) & (p1s > WHITE_P1)
    white_bad = np.array([white[i] and i not in flash for i in range(n)])
    hints = []
    if not z:  # ohne Zeitplan: kurze weisse Stellen (≤ 6 Frames) sind vermutlich geplante Blitze → nur Hinweis
        for a_, b_ in runs(white):
            if b_ - a_ < 6:
                white_bad[a_:b_ + 1] = False; hints.append(f"weisser Blitz Frame {a_}–{b_} (vermutlich geplant)")
    frozen = np.zeros(n, bool); frozen[1:] = diffs[1:] < FREEZE_DIFF
    frozen &= ~black
    jumps, cuts_seen = [], []
    for i in range(1, n):
        lo, hi = max(1, i - 7), min(n, i + 8)
        nb = np.r_[diffs[lo:i], diffs[i + 1:hi]]
        med = float(np.median(nb)) if len(nb) else 0.0
        if diffs[i] >= JUMP_MIN and diffs[i] >= JUMP_FACTOR * med + 2:
            (cuts_seen if (i in trans or not z) else jumps).append(int(i))
    # Folgemeldungen weglassen: Sprünge direkt an schwarzen/weissen Bildern oder am Ende einer eingefrorenen Stelle
    near = set()
    for a_, b_ in runs(black) + runs(white):
        near.update(range(a_ - 1, b_ + 3))
    for a_, b_ in runs(frozen, FREEZE_MIN):
        near.update(range(b_, b_ + 3))
    jumps = [f for f in jumps if f not in near]
    return {
        "frames": n, "thumbs": thumbs,
        "schwarz": runs(black), "weiss_ungeplant": runs(white_bad), "eingefroren": runs(frozen, FREEZE_MIN),
        "spruenge": jumps, "schnitte_erkannt": cuts_seen, "hinweise": hints,
        "kurven": {"helligkeit": means.round(1).tolist(), "differenz": diffs.round(2).tolist()},
        "farbe": check_look(looks, fps, black, schw or schwellen(None)[0]),
    }


def check_look(looks, fps, black, LOOK=LOOK):
    """Je Abschnitt (Standard 3 s): monoton = mindestens 2 von 3 Werten zu tief (Sättigung, Farbigkeit, Farbtöne); dunkel = Hinweis."""
    L = int(LOOK.get("abschnittSec", 3) * fps)
    out, monoton, dunkel, erlaubt = [], [], [], []
    n = max(looks) + 1 if looks else 0
    for a in range(0, n, L):
        v = [looks[i] for i in looks if a <= i < a + L and not black[i]]
        if not v: continue
        s, c, y, t = (float(np.mean([x[k] for x in v])) for k in range(4))
        low = [lbl for lbl, bad in (("Sättigung", s < LOOK["saettigungMin"]), ("Farbigkeit", c < LOOK["farbigkeitMin"]), ("Farbtöne", t < LOOK["farbtoeneMin"])) if bad]
        b = min(n, a + L) - 1
        out.append({"von": a, "bis": b, "saettigung": round(s, 3), "farbigkeit": round(c, 1), "helligkeit": round(y, 3), "farbtoene": round(t, 1)})
        if len(low) >= 2: (monoton if LOOK.get("monoton", True) is not False else erlaubt).append({"von": a, "bis": b, "zu_tief": low})
        if y < LOOK["helligkeitMin"]: dunkel.append({"von": a, "bis": b, "helligkeit": round(y, 3)})
    allv = list(looks.values())
    mittel = {k: round(float(np.mean([x[i] for x in allv])), 3) for i, k in enumerate(("saettigung", "farbigkeit", "helligkeit", "farbtoene"))} if allv else {}
    return {"schwellen": {k: v for k, v in LOOK.items() if k != "stile"}, "mittel": mittel, "abschnitte": out, "monoton": monoton, "monoton_erlaubt": erlaubt, "dunkel": dunkel}


def einstellungen(z, ids):
    """Einstellungen (Frames [a, b)) der Shots `ids`: jeder Shot, an seinen Schnitten im Shot geteilt."""
    out = []
    for s in z["shots"]:
        if s["id"] not in ids: continue
        grenzen = [s["start"]] + sorted(c for c in s.get("cuts", []) if s["start"] < c < s["end"]) + [s["end"]]
        out += list(zip(grenzen, grenzen[1:]))
    return out


def ausserhalb(laengen, bereich):
    return [x for x in laengen if not bereich[0] - 0.05 <= x <= bereich[1] + 0.05]


def check_kapitel(z, fps):
    """Langform: je Kapitel (aus dem Zeitplan) Länge gegen laengeSec und Einstellungslängen gegen shotSec der Kapitel-Art
    (spannung: erst Phase aufbau, dann hoehepunkt – Wechsel dort, wo am wenigsten abweicht). Alles nur Hinweise."""
    arten = TOKENS["formats"]["long-form"].get("kapitelArten", {})
    out, hinweise = [], []
    for i, k in enumerate(z.get("kapitel") or []):
        name = f"Kapitel {k.get('nr', i + 1)} ({k['art']})"   # nr: Kapitel-Render (Ausschnitt eines Kapitels)
        a = arten.get(k["art"])
        if not a:
            hinweise.append(f"{name}: Art unbekannt – erlaubt: {', '.join(arten)}"); continue
        sec = (k["end"] - k["start"]) / fps
        e = [(y - x) / fps for x, y in einstellungen(z, set(k["shots"]))]
        ph = a.get("shotSecPhasen")
        if ph:  # spannung: die ersten j Einstellungen gegen aufbau, der Rest gegen hoehepunkt
            j = min(range(len(e) + 1), key=lambda j: len(ausserhalb(e[:j], ph["aufbau"])) + len(ausserhalb(e[j:], ph["hoehepunkt"])))
            falsch = ausserhalb(e[:j], ph["aufbau"]) + ausserhalb(e[j:], ph["hoehepunkt"])
            ziel = f"{ph['aufbau'][0]:g}–{ph['aufbau'][1]:g} s, dann {ph['hoehepunkt'][0]:g}–{ph['hoehepunkt'][1]:g} s"
        else:
            falsch = ausserhalb(e, a["shotSec"])
            ziel = f"{a['shotSec'][0]:g}–{a['shotSec'][1]:g} s"
        lo, hi = a["laengeSec"]
        out.append({"nr": k.get("nr", i + 1), "art": k["art"], "titel": k.get("titel", ""), "von": k["start"], "bis": k["end"] - 1, "sekunden": round(sec, 2),
                    "ziel_s": [lo, hi], "einstellungen_s": [round(x, 2) for x in e], "ziel_einstellung": ziel, "ausserhalb": len(falsch)})
        if sec < lo - 0.05: hinweise.append(f"{name}: {sec:.1f} s – kürzer als {lo}–{hi} s")
        elif sec > hi + 0.05: hinweise.append(f"{name}: {sec:.1f} s – länger als {lo}–{hi} s")
        if falsch:
            hinweise.append(f"{name}: {len(falsch)} von {len(e)} Einstellungen ausserhalb {ziel} ("
                            + ", ".join(f"{x:.1f} s" for x in falsch[:6]) + (" …" if len(falsch) > 6 else "") + ")")
    return {"kapitel": out, "hinweise": hinweise}


def ohne_aufruf(eingefroren, kapitel):
    """Eingefrorene Stellen, deren Mitte in einem aufruf-Kapitel liegt, sind erlaubt (letztes hook-Bild steht still, nur die
    Knöpfe bewegen sich) → (fehler, erlaubt). eingefroren: Liste [von, bis]."""
    auf = [(k["von"], k["bis"]) for k in kapitel if k["art"] == "aufruf"]
    drin = lambda x: any(a <= (x[0] + x[1]) / 2 <= b for a, b in auf)
    return [x for x in eingefroren if not drin(x)], [x for x in eingefroren if drin(x)]


def ohne_panorama(monoton, kapitel):
    """Monotone Abschnitte, deren Mitte in einem panorama-Kapitel liegt, sind erlaubt (ruhige Totale) → (fehler, erlaubt)."""
    pano = [(k["von"], k["bis"]) for k in kapitel if k["art"] == "panorama"]
    drin = lambda x: any(a <= (x["von"] + x["bis"]) / 2 <= b for a, b in pano)
    return [x for x in monoton if not drin(x)], [x for x in monoton if drin(x)]


def format_von(W, H, z=None):
    """Format eines Videos: aus dem Zeitplan, sonst aus der Bildgrösse (Hochformat = shortform, Querformat = longform)."""
    if z and z.get("format") in ("shortform", "longform"): return z["format"]
    return "shortform" if H > W else "longform"


def safe_rand(W, H, fmt):
    """Ränder der Safe Area in Pixeln dieses Videos (Tokens gelten für die kürzere Seite 1080) oder None."""
    sa = TOKENS["safeArea"].get("short-form" if fmt == "shortform" else "long-form", {})
    if "topPx" not in sa: return None
    m = min(W, H) / 1080
    return {k: round(sa[k + "Px"] * m) for k in ("top", "bottom", "left", "right")}


def check_safe(path, W, H, fmt):
    sa = safe_rand(W, H, fmt)
    if not sa: return {"hinweis": "keine Safe Area für dieses Format festgelegt", "verstoesse": []}
    k = 4  # Auswertung auf 1/4 Auflösung
    w, h = W // k, H // k
    x0, x1, y0, y1 = sa["left"] // k, (W - sa["right"]) // k, sa["top"] // k, (H - sa["bottom"]) // k
    bad = []
    for i, fr in enumerate(frames(path, w, h)):
        m = fr.max(2) > 40
        out = m.copy(); out[y0:y1, x0:x1] = False
        cnt = int(out.sum()) * k * k
        if cnt >= SAFE_MIN_PX:
            ys, xs = np.nonzero(out)
            side = [s for s, c in (("oben", ys.min() < y0), ("unten", ys.max() >= y1), ("links", xs.min() < x0), ("rechts", xs.max() >= x1)) if c]
            bad.append({"frame": i, "pixel": cnt, "seiten": side})
    segs = runs(np.isin(np.arange(max([b["frame"] for b in bad], default=-1) + 1), [b["frame"] for b in bad]))
    return {"format": fmt, "rand_px": {"oben": sa["top"], "unten": sa["bottom"], "links": sa["left"], "rechts": sa["right"]},
            "verstoesse": [{"von": a, "bis": b, "seiten": sorted({s for x in bad if a <= x["frame"] <= b for s in x["seiten"]})} for a, b in segs]}


def check_sound(path, video_s, fps, target, peak, teil=False):
    out = subprocess.run([FFMPEG, "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true,silencedetect=n=-60dB:d=2", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = re.findall(r"I:\s+(-?[\d.]+) LUFS", out); P = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", out)
    sil = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", out)]
    info = probe(path)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if not a: return {"fehler": ["keine Tonspur"]}
    dur = float(a.get("duration", info["format"]["duration"]))
    res = {"lufs": float(I[-1]) if I else None, "spitze_dbtp": float(P[-1]) if P else None, "dauer_s": round(dur, 3), "stille_ab_s": sil}
    errs = []
    if not teil and (res["lufs"] is None or abs(res["lufs"] - target) > 1.0): errs.append(f"Lautheit {res['lufs']} LUFS statt {target} ±1")
    if res["spitze_dbtp"] is not None and res["spitze_dbtp"] > peak + 0.5: errs.append(f"Spitze {res['spitze_dbtp']} dBTP über {peak}")
    if abs(dur - video_s) > 1.0 / fps + 0.03: errs.append(f"Tonlänge {dur:.3f} s ≠ Bildlänge {video_s:.3f} s")
    for s in sil:
        if 0.5 < s < video_s - 3: errs.append(f"Stille ab {s:.2f} s (≥ 2 s)")
    res["fehler"] = errs
    return res


def contact_sheet(thumbs, marks, out, fps):
    keys = sorted(thumbs)
    if not keys: return
    th, tw = thumbs[keys[0]].shape[:2]
    cols = 10
    rows = (len(keys) + cols - 1) // cols
    img = Image.new("RGB", (cols * (tw + 6) + 6, rows * (th + 22) + 6), (24, 22, 30))
    d = ImageDraw.Draw(img)
    for k, f in enumerate(keys):
        x, y = 6 + (k % cols) * (tw + 6), 6 + (k // cols) * (th + 22)
        img.paste(Image.fromarray(thumbs[f]), (x, y))
        bad = any(a - fps < f <= b + fps for a, b in marks)
        if bad: d.rectangle([x - 3, y - 3, x + tw + 2, y + th + 2], outline=(255, 40, 60), width=3)
        d.text((x, y + th + 4), f"{f // fps:>3} s  f{f}", fill=(255, 120, 120) if bad else (220, 220, 230))
    img.save(out)


def main():
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")   # Windows-Konsole: Gedankenstrich richtig
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--zeitplan"); ap.add_argument("--karten")
    ap.add_argument("--lufs", type=float, default=float(AUDIO.get("targetLUFS", -22.6))); ap.add_argument("--spitze", type=float, default=float(AUDIO.get("truePeakDbtp", -2.0)))
    ap.add_argument("--ohne-ton", action="store_true")
    ap.add_argument("--teil", action="store_true", help="Teil eines Videos (Kapitel): Lautheit des Ganzen nicht prüfen")
    ap.add_argument("--stil", help="Stil für die Farb-Schwellen (sonst aus dem Zeitplan)")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    info = probe(a.video)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    W, H = int(v["width"]), int(v["height"])
    num, den = (int(x) for x in v["r_frame_rate"].split("/")); fps = round(num / den)
    z = json.load(open(a.zeitplan, encoding="utf-8")) if a.zeitplan else None
    fmt = format_von(W, H, z)
    stil = a.stil or (z or {}).get("stil")
    schw, stil_key = schwellen(stil)
    pic = check_picture(a.video, z, W, H, schw)
    rep = {"video": os.path.basename(a.video), "stil": stil, "stil_schwellen": stil_key, "format": fmt, "breite": W, "hoehe": H, "fps": fps, "frames": pic["frames"],
           "zeitplan": bool(z), "bild": {k: pic[k] for k in ("schwarz", "weiss_ungeplant", "eingefroren", "spruenge", "schnitte_erkannt", "hinweise")},
           "farbe": pic["farbe"]}
    if z and z["frames"] != pic["frames"]: rep["bild"]["frames_abweichung"] = f"Video {pic['frames']} statt {z['frames']} Frames"
    if z and z.get("format") and z["format"] != ("shortform" if H > W else "longform"):
        rep["bild"]["format_abweichung"] = f"Bild {W}×{H} passt nicht zum Format {z['format']} im Zeitplan"
    if a.karten: rep["safe_area"] = check_safe(a.karten, W, H, fmt)
    if not a.ohne_ton: rep["ton"] = check_sound(a.video, pic["frames"] / fps, fps, a.lufs, a.spitze, a.teil)
    rep["teil"] = a.teil
    if z and z.get("kapitel"):  # Langform mit Kapiteln: Längen je Kapitel als Hinweise, panorama darf monoton sein
        kp = check_kapitel(z, fps)
        rep["kapitel"] = kp["kapitel"]
        rep["bild"]["hinweise"] += kp["hinweise"]
        rep["farbe"]["monoton"], erlaubt = ohne_panorama(rep["farbe"]["monoton"], kp["kapitel"])
        rep["bild"]["hinweise"] += [f"ruhig/monoton im panorama (erlaubt): Frame {x['von']}–{x['bis']}" for x in erlaubt]
        rep["bild"]["eingefroren"], steht = ohne_aufruf(rep["bild"]["eingefroren"], kp["kapitel"])
        rep["bild"]["hinweise"] += [f"Standbild im aufruf (erlaubt): Frame {a}–{b}" for a, b in steht]
    errors = []
    for k, label in (("schwarz", "schwarze Bilder"), ("weiss_ungeplant", "weisse Bilder (nicht geplant)"), ("eingefroren", "eingefroren")):
        for s, e in rep["bild"][k]: errors.append(f"{label}: Frame {s}–{e}")
    for f in rep["bild"]["spruenge"]: errors.append(f"Sprung mitten im Shot: Frame {f}")
    if "frames_abweichung" in rep["bild"]: errors.append(rep["bild"]["frames_abweichung"])
    if "format_abweichung" in rep["bild"]: errors.append(rep["bild"]["format_abweichung"])
    for x in rep.get("safe_area", {}).get("verstoesse", []): errors.append(f"Safe Area verletzt ({', '.join(x['seiten'])}): Frame {x['von']}–{x['bis']}")
    for x in rep["farbe"]["monoton"]: errors.append(f"Monoton (zu tief: {', '.join(x['zu_tief'])}): Frame {x['von']}–{x['bis']}")
    for x in rep["farbe"]["monoton_erlaubt"]: rep["bild"]["hinweise"].append(f"monoton (beim Stil {stil_key} erlaubt): Frame {x['von']}–{x['bis']}")
    for x in rep["farbe"]["dunkel"]: rep["bild"]["hinweise"].append(f"dunkel (Helligkeit {x['helligkeit']}): Frame {x['von']}–{x['bis']}")
    errors += [f"Ton: {e}" for e in rep.get("ton", {}).get("fehler", [])]
    rep["fehler"] = errors
    rep["ergebnis"] = "OK" if not errors else f"{len(errors)} Fehler"
    with open(os.path.join(a.out, "bericht.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(rep, f, ensure_ascii=False, indent=1)
    with open(os.path.join(a.out, "kurven.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(pic["kurven"], f)
    marks = rep["bild"]["schwarz"] + rep["bild"]["weiss_ungeplant"] + rep["bild"]["eingefroren"] + [[f, f] for f in rep["bild"]["spruenge"]] + \
        [[x["von"], x["bis"]] for x in rep.get("safe_area", {}).get("verstoesse", [])] + [[x["von"], x["bis"]] for x in rep["farbe"]["monoton"]]
    contact_sheet(pic["thumbs"], marks, os.path.join(a.out, "kontaktbogen.png"), fps)
    md = [f"# Prüfbericht {rep['video']}", "", f"**Ergebnis: {rep['ergebnis']}**  ·  {'Kurzform' if fmt == 'shortform' else 'Langform'} {W}×{H}, {fps} fps, {pic['frames']} Frames"
          + ("  ·  mit Zeitplan" if z else "  ·  ohne Zeitplan (Schnitte nur erkannt, nicht geprüft)"), ""]
    md += ["## Fehler", ""] + ([f"- {e}" for e in errors] or ["- keine"]) + [""]
    md += [f"Erkannte Schnitte: {len(rep['bild']['schnitte_erkannt'])}"] + [f"Hinweis: {h}" for h in rep["bild"]["hinweise"]]
    if rep.get("kapitel"):
        md += ["", "## Kapitel", "", "| # | Art | Titel | Frames | Länge (Ziel) | Einstellungen (Ziel) | ausserhalb |", "|---|---|---|---|---|---|---|"]
        for i, k in enumerate(rep["kapitel"]):
            e = k["einstellungen_s"]
            md.append(f"| {k.get('nr', i + 1)} | {k['art']} | {k['titel']} | {k['von']}–{k['bis']} | {k['sekunden']:g} s ({k['ziel_s'][0]}–{k['ziel_s'][1]} s) | "
                      f"{len(e)}: {min(e):g}–{max(e):g} s ({k['ziel_einstellung']}) | {k['ausserhalb']} |")
        md.append("")
    m = rep["farbe"]["mittel"]
    if m: md += [f"Farbe (Mittel): Sättigung {m['saettigung']}, Farbigkeit {m['farbigkeit']}, Helligkeit {m['helligkeit']}, Farbtöne {m['farbtoene']}"
                 f" – Schwellen je Abschnitt{f' (Stil {stil_key})' if stil_key else ''}: "
                 + ("monoton nicht geprüft, " if schw.get("monoton", True) is False else
                    f"Sättigung ≥ {schw['saettigungMin']}, Farbigkeit ≥ {schw['farbigkeitMin']}, Farbtöne ≥ {schw['farbtoeneMin']}, ")
                 + f"Helligkeit ≥ {schw['helligkeitMin']}"]
    if "ton" in rep and rep["ton"].get("lufs") is not None:
        md += [f"Ton: {rep['ton']['lufs']} LUFS, Spitze {rep['ton']['spitze_dbtp']} dBTP, {rep['ton']['dauer_s']} s"]
    md += ["", "Kontaktbogen: `kontaktbogen.png` (1 Bild je Sekunde, Fehlerstellen rot)."]
    open(os.path.join(a.out, "bericht.md"), "w", encoding="utf-8", newline="\n").write("\n".join(md) + "\n")
    print(rep["ergebnis"]); [print(" -", e) for e in errors]; [print(" (Hinweis)", h) for h in rep["bild"]["hinweise"]]


if __name__ == "__main__":
    main()
