# Herkunft: eigen (V-Video), geschrieben 2026-11-14 mit Claude, ohne fremde Vorlage.
# Voice-over anlegen (Guide Schritt 9): Aufnahme des Nutzers in die Zeilen des Skripts schneiden (Pausen-Erkennung +
# Silbenzahl), jede Zeile auf ihre Zeitmarke setzen (nie schneller, höchstens so spät wie nötig), Musik + Geräusche unter
# der Stimme ducken, auf -14 LUFS / Spitze <= -1 dBTP mischen und mit unverändertem Bild <ID>_sequenceNN.mp4 schreiben.
# Bericht: <arbeit>/bericht.md + bericht.json (welche Zeile wo liegt, was verschoben wurde, wie sicher die Zuordnung ist).
#
# Aufruf (aus dem Hauptordner):
#   python audio/v01/voiceover.py productions/V000X_.../ [--aufnahme a.mp3] [--skript s.docx] [--video v.mp4]
#          [--ton ton.json | --bett-aus-video] [--zuordnung z.json] [--ziel out.mp4] [--arbeit output/<ID>_voiceover]
import argparse, glob, json, math, os, re, subprocess, sys

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core import SR, hp, lufs, true_peak_db, limit, read_wav, write_wav  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

# Zielwerte (Guide Schritt 9); Tokens `audio.voiceover` gehen vor, falls die Organisation sie einträgt.
STANDARD = {"lufs": -14.0, "spitze_dbtp": -1.0, "stimme_lufs": -15.0, "bett_db": -1.0, "duck_db": 8.0,
            "abstand_s": 0.15, "max_spaeter_s": 1.0, "warnung_spaeter_s": 1.5}
for _p in [os.path.join(ROOT, "shared", "design-tokens.json")]:
    try:
        STANDARD.update(json.load(open(_p, encoding="utf-8")).get("audio", {}).get("voiceover", {}) or {})
    except (OSError, ValueError):
        pass


# ---------- ffmpeg ----------
def ffbin(name):
    d = os.environ.get("FFMPEG_DIR") or os.path.join(ROOT, "tools", "ffmpeg", "bin")
    p = os.path.join(d, name + (".exe" if os.name == "nt" else ""))
    return p if os.path.exists(p) else name


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        sys.exit("ffmpeg-Fehler:\n" + r.stderr[-1500:])
    return r.stdout


def als_wav(src, dst, mono=False):
    run([ffbin("ffmpeg"), "-y", "-v", "error", "-i", src, "-vn", "-ac", "1" if mono else "2", "-ar", str(SR),
         "-c:a", "pcm_s24le", dst])
    x, _ = read_wav(dst)
    return x[0] if mono else x


def video_dauer(path):
    out = run([ffbin("ffprobe"), "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames,r_frame_rate,duration",
               "-of", "json", path])
    s = json.loads(out)["streams"][0]
    if s.get("nb_frames") and s.get("r_frame_rate"):
        a, b = s["r_frame_rate"].split("/")
        return int(s["nb_frames"]) * float(b) / float(a)
    return float(s["duration"])


# ---------- Skript lesen ----------
PAUSE = re.compile(r"\[pause [^\]]*\]")
ZEIT = re.compile(r"(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)")
SATZ_ENDE = re.compile(r"[.!?]+[\"')\]]*(?=\s|$)")


def zeit(s):
    m = ZEIT.search(s)
    if not m: return None
    h, mi, se = m.groups()
    return (int(h) if h else 0) * 3600 + int(mi) * 60 + float(se)


def silben_wort(w):
    w = w.lower().strip("'")
    if not w: return 0
    if re.fullmatch(r"\d+", w):  # Ziffern im Sprechertext (Reintext fehlt): grob 1,5 Silben je Ziffer
        return max(1, round(1.5 * len(w)))
    g = re.findall(r"[aeiouy]+", w)
    n = len(g)
    if w.endswith("e") and not w.endswith(("le", "ee", "ye")) and n > 1: n -= 1
    if w.endswith("es") and n > 1 and not re.search(r"[cgsxz]es$", w): n -= 1
    if w.endswith("ed") and n > 1 and not re.search(r"[td]ed$", w): n -= 1
    return max(1, n)


def silben(text):
    return sum(silben_wort(w) for w in re.findall(r"[A-Za-zÀ-ÿ']+|\d+", PAUSE.sub(" ", text)))


def saetze(text):
    t = re.sub(r"\s+", " ", PAUSE.sub(" ", text)).strip()
    if not t: return []
    teile, a = [], 0
    for m in SATZ_ENDE.finditer(t):
        teile.append(t[a:m.end()].strip()); a = m.end()
    if t[a:].strip(): teile.append(t[a:].strip())
    return [s for s in teile if re.search(r"[A-Za-z]", s)]


def skript_lesen(path):
    """Zeilen mit Zeitmarke + Sprechertext aus der Script-Tabelle; Silben aus dem Reintext (Sätze der Reihe nach
    den Zeilen zugeteilt), sonst aus dem Sprechertext. Kapitel-Zeilen (Langform) werden mitgezählt."""
    from docx import Document
    d = Document(path)
    tab = None
    for t in d.tables:
        h = [c.text.strip().lower() for c in t.rows[0].cells]
        if h and h[0].startswith("timestamp"): tab = t; break
    if tab is None: sys.exit(f"Keine Script-Tabelle (Timestamp | Voice-over text | …) in {path}")
    zeilen, kapitel = [], None
    for r in tab.rows[1:]:
        cells = [c.text.strip() for c in r.cells]
        if len(set(cells)) == 1 and re.match(r"(Kapitel|Chapter)\s+\d+", cells[0]):
            kapitel = cells[0]; continue
        t0 = zeit(cells[0])
        if t0 is None: continue
        z = ZEIT.findall(cells[0])
        t1 = zeit(":".join(x for x in z[1] if x)) if len(z) > 1 else None
        text = cells[1] if len(cells) > 1 else ""
        zeilen.append({"nr": len(zeilen) + 1, "plan": round(t0, 3), "plan_ende": t1, "text": text, "kapitel": kapitel})
    # Reintext: Absätze nach der Überschrift „Clean Read Text“ bis zur Wortzahl
    rein, an = [], False
    for p in d.paragraphs:
        tx = p.text.strip()
        if p.style.name.startswith("Heading"):
            an = "clean read text" in tx.lower(); continue
        if not an or not tx: continue
        if tx.startswith(("Total word count", "Estimated speaking", "Everything written out", "Pronunciation")): continue
        if re.match(r"(Chapter|Kapitel)\s+\d+\s*[–-]", tx) and len(tx) < 80: continue
        rein.append(tx)
    rs = [s for t in rein for s in saetze(t)]
    sprech = [z for z in zeilen if silben(z["text"]) > 0 and z["text"].strip() not in ("-", "—", "–")]
    anz = [max(1, len(saetze(z["text"]))) for z in sprech]
    quelle = "Sprechertext"
    if rs and sum(anz) == len(rs):
        i = 0
        for z, n in zip(sprech, anz):
            z["rein"] = " ".join(rs[i:i + n]); i += n
        quelle = "Reintext"
    for z in zeilen:
        z["silben"] = silben(z.get("rein") or z["text"]) if z in sprech else 0
    return zeilen, quelle


# ---------- Aufnahme: Sprechstellen ----------
def sprechstellen(x, hop=0.01, win=0.03, min_luecke=0.12, min_stueck=0.08):
    y = hp(x[None, :] if x.ndim == 1 else x, 80)[0]
    h, w = int(hop * SR), int(win * SR)
    n = max(1, (len(y) - w) // h + 1)
    c = np.concatenate([[0.0], np.cumsum(y.astype(float) ** 2)])
    idx = np.arange(n) * h
    e = 10 * np.log10((c[idx + w] - c[idx]) / w + 1e-12)
    boden, laut = np.percentile(e, 10), np.percentile(e, 95)
    schwelle = boden + max(9.0, 0.3 * (laut - boden))
    an = e > schwelle
    seg, i = [], 0
    while i < n:
        if an[i]:
            j = i
            while j < n and an[j]: j += 1
            seg.append([i * hop, j * hop + win]); i = j
        else:
            i += 1
    zus = []
    for s in seg:  # kurze Lücken (Verschlusslaute) schliessen
        if zus and s[0] - zus[-1][1] < min_luecke: zus[-1][1] = s[1]
        else: zus.append(s)
    return [s for s in zus if s[1] - s[0] >= min_stueck], round(float(schwelle), 1)


# ---------- Zuordnung: Zeilen ↔ Sprechstellen (dynamische Optimierung) ----------
SIGMA = 0.3  # erlaubte Abweichung der Dauer (ln) je Zeile


def zuordnen(seg, sil):
    """Teilt die Sprechstellen der Reihe nach in len(sil) Gruppen. Kosten: Dauer passt zur Silbenzahl, Grenzen liegen
    in langen Pausen. Gibt Gruppen [(p, q)] (Sprechstellen p..q-1) zurück."""
    M, N = len(seg), len(sil)
    if M < N: return None
    a = np.array([s[0] for s in seg]); b = np.array([s[1] for s in seg])
    gap = np.maximum(np.r_[a[1:] - b[:-1], 0.0], 0.01)
    gref = float(np.median(gap[:-1])) if M > 1 else 0.3
    gesamt = b[-1] - a[0] - np.sort(gap[:-1])[::-1][:N - 1].sum()
    rate = gesamt / sum(sil)
    best = None
    for _ in range(3):
        INF = 1e18
        C = np.full((N + 1, M + 1), INF); B = np.zeros((N + 1, M + 1), int)
        C[0, 0] = 0.0
        for i in range(1, N + 1):
            e = sil[i - 1] * rate
            jmin, jmax = i, M - (N - i)
            for q in range(jmin, jmax + 1):
                bonus = 0.0 if q == M else -math.log(gap[q - 1] / gref)   # Grenze nach Sprechstelle q-1
                for p in range(q - 1, i - 2, -1):
                    if C[i - 1, p] >= INF: continue
                    dur = b[q - 1] - a[p]
                    if dur > 3 * e + 2.5: break
                    k = C[i - 1, p] + (math.log(dur / e) / SIGMA) ** 2 + bonus
                    if k < C[i, q]: C[i, q], B[i, q] = k, p
        if C[N, M] >= INF: return None
        grp, q = [], M
        for i in range(N, 0, -1):
            p = B[i, q]; grp.append((p, q)); q = p
        grp.reverse()
        best = grp
        neu = sum(b[q - 1] - a[p] for p, q in grp) / sum(sil)
        if abs(neu - rate) / rate < 0.01: break
        rate = neu
    return best, rate


# ---------- Stimme bearbeiten ----------
def kompressor(x, schwelle_db, ratio=3.0, attack=0.008, release=0.12):
    env = np.abs(x)
    aa, ar = math.exp(-1 / (attack * SR)), math.exp(-1 / (release * SR))
    # Hüllkurve: schnell hoch, langsam runter (einfacher Spitzenfolger, blockweise für Tempo)
    blk = 64
    m = env[: len(env) // blk * blk].reshape(-1, blk).max(1)
    m = np.r_[m, env[len(env) // blk * blk:].max() if len(env) % blk else []]
    f = np.empty_like(m); v = 0.0
    ka, kr = aa ** blk, ar ** blk
    for i, s in enumerate(m):
        v = (ka * v + (1 - ka) * s) if s > v else (kr * v + (1 - kr) * s); f[i] = v
    db = 20 * np.log10(f + 1e-9)
    gr = np.minimum(0.0, (schwelle_db - db) * (1 - 1 / ratio))
    g = np.repeat(10 ** (gr / 20), blk)[: len(x)]
    return x * g


def ducken(stimme, n, duck_db, attack=0.06, release=0.4, vorlauf=0.05):
    """Gain-Verlauf für das Bett: unter der Stimme duck_db leiser, weich (Vorlauf, Anstieg, Lösen)."""
    hop = int(0.01 * SR)
    m = len(stimme) // hop
    e = np.sqrt((stimme[: m * hop].reshape(m, hop) ** 2).mean(1))
    edb = 20 * np.log10(e + 1e-9)
    an = (edb > edb.max() - 35).astype(float)
    v = int(vorlauf / 0.01)
    an = np.maximum(an, np.r_[an[v:], np.zeros(v)])
    ka, kr = math.exp(-0.01 / attack), math.exp(-0.01 / release)
    f = np.empty_like(an); s = 0.0
    for i, x in enumerate(an):
        k = ka if x > s else kr
        s = k * s + (1 - k) * x; f[i] = s
    g = 10 ** (-duck_db * f / 20)
    t = np.arange(n) / hop
    return np.interp(t, np.arange(len(g)), g), f


# ---------- Hilfen ----------
def sperr_datei(f):
    """Sperr-/Hilfsdateien, die nie gemeint sind: Office-Sperrdatei „~$…“ (Datei gerade in Word offen), „~…“, versteckte „.…“."""
    n = os.path.basename(f)
    return n.startswith(("~", "."))


def finde(ordner, muster, ausser=()):
    fs = [f for f in glob.glob(os.path.join(ordner, muster))
          if not sperr_datei(f) and not any(x in os.path.basename(f) for x in ausser)]
    return sorted(fs, key=lambda f: (re.findall(r"_v(\d+)", f) or ["0"])[-1].zfill(3) + f)


def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser(description="Voice-over anlegen (Guide Schritt 9)")
    ap.add_argument("ordner")
    ap.add_argument("--aufnahme"); ap.add_argument("--skript"); ap.add_argument("--video"); ap.add_argument("--ton")
    ap.add_argument("--bett-aus-video", action="store_true", help="Musik + Geräusche aus der Tonspur des Videos statt aus der Ton-Datei")
    ap.add_argument("--zuordnung", help="JSON-Liste [[von, bis], …] je Sprech-Zeile (Sekunden in der Aufnahme) – überschreibt die Erkennung")
    ap.add_argument("--ziel"); ap.add_argument("--arbeit")
    A = ap.parse_args()
    for s in (sys.stdout, sys.stderr): s.reconfigure(encoding="utf-8")

    ordner = A.ordner.rstrip("/\\")
    vid = (re.match(r"(V\d{4})", os.path.basename(ordner)) or sys.exit("Ordnername beginnt nicht mit V####")).group(1)
    auf = A.aufnahme or (lambda fs: fs[0] if len(fs) == 1 else sys.exit(
        f"{len(fs)} Aufnahmen gefunden – bitte --aufnahme angeben: {fs}"))(
        [f for e in ("mp3", "wav", "m4a", "flac") for f in finde(ordner, "*." + e)])
    skript = A.skript or (finde(ordner, "*_skript_*.docx") or sys.exit("Kein Skript (*_skript_*.docx) im Ordner"))[-1]
    video = A.video or (finde(ordner, "*_video_*.mp4") or sys.exit("Kein finales Video (*_video_*.mp4) im Ordner"))[-1]
    arbeit = A.arbeit or os.path.join(ROOT, "output", f"{vid}_voiceover")
    os.makedirs(arbeit, exist_ok=True)
    if A.ziel: ziel = A.ziel
    else:
        k = 1
        while os.path.exists(os.path.join(ordner, f"{vid}_sequence{k:02d}.mp4")): k += 1
        ziel = os.path.join(ordner, f"{vid}_sequence{k:02d}.mp4")
    if os.path.exists(ziel): sys.exit(f"Ziel existiert schon (nie überschreiben): {ziel}")

    # 1) Skript
    zeilen, quelle = skript_lesen(skript)
    sprech = [z for z in zeilen if z["silben"] > 0]
    dauer = video_dauer(video)
    n = int(round(dauer * SR))

    # 2) Aufnahme schneiden
    x = als_wav(auf, os.path.join(arbeit, "aufnahme.wav"), mono=True)
    seg, schwelle = sprechstellen(x)
    hinweise, warnungen = [], []
    if A.zuordnung:
        vb = json.load(open(A.zuordnung, encoding="utf-8"))
        if len(vb) != len(sprech): sys.exit(f"--zuordnung hat {len(vb)} Einträge, das Skript {len(sprech)} Sprech-Zeilen")
        stuecke = [(float(v), float(b)) for v, b in vb]; rate = None; art = "von Hand"
    else:
        r = zuordnen(seg, [z["silben"] for z in sprech])
        if not r:
            sys.exit(f"Zu wenige Sprechstellen ({len(seg)}) für {len(sprech)} Sprech-Zeilen – Aufnahme prüfen oder --zuordnung")
        grp, rate = r
        stuecke = [(seg[p][0], seg[q - 1][1]) for p, q in grp]; art = "erkannt"
    # 3) Schneiden (Ränder bis höchstens zur Mitte der Pause) und setzen
    stimme = np.zeros(n)
    ergebnis, ende_vorher = [], -1e9
    for i, (z, (v, b)) in enumerate(zip(sprech, stuecke)):
        vor = 0.06 if i == 0 else min(0.06, (v - stuecke[i - 1][1]) / 2)
        nach = 0.12 if i == len(stuecke) - 1 else min(0.12, (stuecke[i + 1][0] - b) / 2)
        c0, c1 = max(0.0, v - vor), min(len(x) / SR, b + nach)
        stueck = x[int(c0 * SR): int(c1 * SR)].copy()
        fi, fo = int(0.015 * SR), int(0.04 * SR)
        stueck[:fi] *= np.linspace(0, 1, fi)[: len(stueck)]
        stueck[-fo:] *= np.linspace(1, 0, min(fo, len(stueck)))
        start = max(z["plan"], ende_vorher + STANDARD["abstand_s"])       # Einsatz der Stimme
        spaeter = start - z["plan"]
        pos = int(round((start - (v - c0)) * SR))
        a0 = max(0, pos); seg_ = stueck[a0 - pos:]
        if a0 + len(seg_) > n:
            warnungen.append(f"Zeile {z['nr']}: endet nach dem Video ({fmt(start + b - v)} > {fmt(dauer)}) – abgeschnitten")
            seg_ = seg_[: max(0, n - a0)]
        stimme[a0: a0 + len(seg_)] += seg_
        ende_vorher = start + (b - v)
        e = z["silben"] * rate if rate else None
        verh = (b - v) / e if e else None
        unsicher = bool(verh and abs(math.log(verh)) > math.log(1.45))
        if spaeter > STANDARD["warnung_spaeter_s"] + 1e-6:
            warnungen.append(f"Zeile {z['nr']}: {spaeter:.2f} s später als geplant (Satz davor zu lang)")
        if unsicher:
            warnungen.append(f"Zeile {z['nr']}: Dauer passt schlecht zur Silbenzahl ({verh:.2f}×) – Zuordnung prüfen")
        ergebnis.append({"nr": z["nr"], "kapitel": z["kapitel"], "text": z["text"], "silben": z["silben"],
                         "aufnahme_von": round(v, 3), "aufnahme_bis": round(b, 3), "plan": z["plan"],
                         "start": round(start, 3), "ende": round(start + b - v, 3), "spaeter_s": round(spaeter, 3),
                         "dauer_verhaeltnis": round(verh, 2) if verh else None, "unsicher": unsicher})
    ohne = [z["nr"] for z in zeilen if z["silben"] == 0]

    # 4) Stimme bearbeiten: Tiefen weg, leicht verdichten, auf Stimm-Pegel
    st = hp(stimme[None, :], 80)[0]
    if np.abs(st).max() > 0:
        pk = 20 * np.log10(np.percentile(np.abs(st[np.abs(st) > 1e-4]), 99) + 1e-9)
        st = kompressor(st, pk - 10, 3.0)
        st *= 10 ** ((STANDARD["stimme_lufs"] - lufs(np.vstack([st, st]))) / 20)
    # 5) Bett: Musik + Geräusche (Ton-Datei neu erzeugt = bytegleich zum Video, sonst Tonspur des Videos)
    bett_v = als_wav(video, os.path.join(arbeit, "bett_video.wav"))
    bett_v = np.pad(bett_v, ((0, 0), (0, max(0, n - bett_v.shape[1]))))[:, :n]
    bett, bett_quelle = bett_v, "Tonspur des Videos"
    ton = A.ton
    if not ton and not A.bett_aus_video:
        fs = finde(ordner, f"{vid}_*_ton_*.json") or finde(os.path.join(ROOT, "_archive", f"{vid}_quelle"), f"{vid}_*_ton_*.json")
        ton = fs[-1] if fs else None
    if ton and not A.bett_aus_video:
        from render import render
        render(json.load(open(ton, encoding="utf-8")), os.path.join(arbeit, "ton"))
        b2, _ = read_wav(os.path.join(arbeit, "ton", "mix.wav"))
        b2 = np.pad(b2, ((0, 0), (0, max(0, n - b2.shape[1]))))[:, :n]
        d = abs(lufs(b2) - lufs(bett_v))
        if d < 1.0:
            bett, bett_quelle = b2, os.path.relpath(ton, ROOT).replace("\\", "/")
        else:
            hinweise.append(f"Ton-Datei weicht {d:.1f} dB von der Tonspur des Videos ab – Bett aus dem Video genommen")
    g, maske = ducken(st, n, STANDARD["duck_db"])
    bett = bett * 10 ** (STANDARD["bett_db"] / 20) * g
    mix = bett + np.vstack([st, st])
    for _ in range(4):
        mix = mix * 10 ** ((STANDARD["lufs"] - lufs(mix)) / 20)
        mix = limit(mix, STANDARD["spitze_dbtp"] - 0.3)
        if abs(lufs(mix) - STANDARD["lufs"]) < 0.1 and true_peak_db(mix) <= STANDARD["spitze_dbtp"]: break
    write_wav(os.path.join(arbeit, "mix.wav"), mix)
    # Abstand Stimme ↔ Bett dort, wo gesprochen wird
    an = np.repeat(maske > 0.5, int(0.01 * SR))[:n]
    an = np.pad(an, (0, n - len(an)))
    abst = None
    if an.sum() > SR:
        abst = round(lufs(np.vstack([st[an], st[an]])) - lufs(bett[:, an]), 1)

    # 6) Video: Bild unverändert, neuer Ton
    run([ffbin("ffmpeg"), "-y", "-v", "error", "-i", video, "-i", os.path.join(arbeit, "mix.wav"), "-map", "0:v:0", "-map", "1:a:0",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", ziel])

    # 7) Bericht
    mess = {"lufs": round(lufs(mix), 2), "spitze_dbtp": round(true_peak_db(mix), 2), "stimme_ueber_bett_db": abst}
    rep = {"video": vid, "ziel": os.path.relpath(ziel, ROOT).replace("\\", "/"), "aufnahme": os.path.basename(auf),
           "skript": os.path.basename(skript), "bild": os.path.basename(video), "bett": bett_quelle,
           "silben_aus": quelle, "zuordnung": art, "sprechstellen": len(seg), "schwelle_db": schwelle,
           "silben_pro_s": round(1 / rate, 2) if rate else None, "messung": mess, "zeilen": ergebnis,
           "zeilen_ohne_stimme": ohne, "warnungen": warnungen, "hinweise": hinweise}
    json.dump(rep, open(os.path.join(arbeit, "bericht.json"), "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    L = [f"# Voice-over {vid} – {os.path.basename(ziel)}", "",
         f"Aufnahme `{rep['aufnahme']}`, Skript `{rep['skript']}`, Bild `{rep['bild']}` (unverändert), Bett: {bett_quelle}.",
         f"Zuordnung {art} ({len(seg)} Sprechstellen, Silben aus {quelle}" + (f", {rep['silben_pro_s']} Silben/s" if rate else "") + ").",
         f"Mischung {mess['lufs']} LUFS, Spitze {mess['spitze_dbtp']} dBTP, Stimme {abst} dB über Musik + Geräuschen.", ""]
    if warnungen: L += ["## Warnungen", *[f"- {w}" for w in warnungen], ""]
    if hinweise: L += ["## Hinweise", *[f"- {w}" for w in hinweise], ""]
    L += ["## Zeilen", "", "| Nr | Kapitel | Aufnahme | geplant | liegt bei | später | Dauer/Soll | Text |", "|---|---|---|---|---|---|---|---|"]
    for e in ergebnis:
        L.append(f"| {e['nr']} | {(e['kapitel'] or '').split('–')[0].strip()} | {fmt(e['aufnahme_von'])}–{fmt(e['aufnahme_bis'])} | "
                 f"{fmt(e['plan'])} | {fmt(e['start'])}–{fmt(e['ende'])} | {e['spaeter_s']:+.2f} s{' ⚠' if e['spaeter_s'] > STANDARD['max_spaeter_s'] else ''} | "
                 f"{e['dauer_verhaeltnis'] if e['dauer_verhaeltnis'] else '–'}{' unsicher' if e['unsicher'] else ''} | {e['text'][:60]} |")
    if ohne: L += ["", f"Zeilen ohne Stimme (z. B. panorama): {', '.join(map(str, ohne))}"]
    open(os.path.join(arbeit, "bericht.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
    versch = [e for e in ergebnis if e["spaeter_s"] > 0.05]
    print(f"{vid}: {len(ergebnis)} Zeilen gesetzt ({art}), {len(versch)} verschoben (max {max([e['spaeter_s'] for e in ergebnis] + [0]):.2f} s), "
          f"{sum(e['unsicher'] for e in ergebnis)} unsicher; {mess['lufs']} LUFS, Spitze {mess['spitze_dbtp']} dBTP")
    for w in warnungen + hinweise: print("  ⚠ " + w)
    print(f"  → {rep['ziel']}\n  Bericht: {os.path.relpath(os.path.join(arbeit, 'bericht.md'), ROOT)}")


if __name__ == "__main__":
    main()
