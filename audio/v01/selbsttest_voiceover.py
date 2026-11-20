# Herkunft: eigen (V-Video), geschrieben 2026-11-14 mit Claude, ohne fremde Vorlage.
# Selbsttest für audio/v01/voiceover.py (Voice-over anlegen): baut eine künstliche „Stimme“ (Silben-Stösse aus eigenem
# Code, bekannte Satz- und Kommapausen), ein Skript (.docx) und ein stummes Testvideo, ruft das Werkzeug auf und prüft:
#   - jede Zeile wird der richtigen Stelle der Aufnahme zugeordnet (auch mit Kommapause im Satz)
#   - jede Zeile startet auf ihrer Zeitmarke oder – nur wenn die Zeile davor zu lang war – so wenig später wie nötig, nie früher
#   - Mischung -14 LUFS (±0,2), Spitze <= -1 dBTP; Bild bytegleich (Videospur kopiert)
#   - Langform: Kapitel-Zeilen, panorama ohne Stimme, Silben aus dem Reintext (Zahlen ausgeschrieben, [pause 1s])
#   - zweiter Lauf → <ID>_sequence02.mp4 (nie überschreiben); zu wenige Sprechstellen → Abbruch mit Meldung
#   - Word-Sperrdatei „~$…docx“ (Skript in Word offen) und versteckte Dateien werden übersprungen
# Aufruf: python audio/v01/selbsttest_voiceover.py   (ca. 30 s; Teil „voice“ von npm test)
import json, os, shutil, subprocess, sys

import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from core import SR, write_wav, lufs, true_peak_db, read_wav  # noqa: E402
import voiceover as vo  # noqa: E402

ROOT = vo.ROOT
OUT = os.path.join(ROOT, "output", "test", "voiceover")
fehler = []


def check(ok, text):
    print(("  ok   " if ok else "  FEHLER ") + text)
    if not ok: fehler.append(text)


# ---------- künstliche Stimme ----------
def silbe(r, dur, f0):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + 0.04 * np.sin(2 * np.pi * 3 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 9))
    x += 0.15 * r.standard_normal(len(t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6
    return 0.25 * x * env


def sprich(r, text, rate):
    """Satz → Signal; Silben je Wort wie vo.silben_wort, Komma = 0,28 s Pause. Gibt Signal zurück."""
    teile = []
    for w in text.replace(",", " , ").split():
        if w == ",":
            teile.append(np.zeros(int(0.28 * SR))); continue
        for _ in range(vo.silben_wort(w.strip(".?!:;\"'"))):
            teile.append(silbe(r, (1 / rate) * r.uniform(0.85, 1.15) - 0.03, r.uniform(120, 170)))
            teile.append(np.zeros(int(0.03 * SR)))
        teile.append(np.zeros(int(0.05 * SR)))
    return np.concatenate(teile)


def aufnahme(r, saetze, pfad, raten):
    x, wahr, t = [np.zeros(int(0.8 * SR))], [], 0.8
    for s, rate in zip(saetze, raten):
        sig = sprich(r, s, rate)
        nz = np.nonzero(np.abs(sig) > 1e-3)[0]
        wahr.append((t + nz[0] / SR, t + nz[-1] / SR))
        x.append(sig); t += len(sig) / SR
        pause = r.uniform(0.55, 0.9)
        x.append(np.zeros(int(pause * SR))); t += pause
    x = np.concatenate(x + [np.zeros(int(0.5 * SR))])
    x = x + 10 ** (-62 / 20) * r.standard_normal(len(x))      # Raumrauschen
    write_wav(pfad, np.vstack([x, x]))
    return wahr


# ---------- Skript + Video ----------
def skript(pfad, zeilen, rein):
    """zeilen: [(timestamp, text)] oder "Kapitel N – art – Titel"; rein: Liste von Absätzen (Langform mit Kapitel-Köpfen)."""
    from docx import Document
    d = Document()
    d.add_heading("Test", 0)
    d.add_heading("Script", 1)
    t = d.add_table(rows=1, cols=3)
    for i, h in enumerate(["Timestamp", "Voice-over text", "Visual idea"]): t.rows[0].cells[i].text = h
    for z in zeilen:
        c = t.add_row().cells
        if isinstance(z, str):
            m = c[0].merge(c[-1]); m.text = z
        else:
            c[0].text, c[1].text, c[2].text = z[0], z[1], "test"
    d.add_heading("Clean Read Text (Reintext)", 1)
    d.add_paragraph("Everything written out as it is spoken in English (numbers, dates, foreign words).")
    for p in rein:
        if p.startswith("Chapter"): d.add_paragraph().add_run(p).bold = True
        else: d.add_paragraph(p)
    d.add_paragraph("Total word count: 1 words")
    d.add_heading("Fact Check", 1)
    d.save(pfad)


def video(pfad, dauer):
    subprocess.run([vo.ffbin("ffmpeg"), "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c=0x3080c0:s=160x90:r=30:d={dauer}",
                    "-f", "lavfi", "-i", f"sine=frequency=220:sample_rate=48000:duration={dauer}", "-filter:a", "volume=-24dB",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", pfad], check=True)


def bild_md5(pfad):
    return subprocess.run([vo.ffbin("ffmpeg"), "-v", "error", "-i", pfad, "-map", "0:v:0", "-c", "copy", "-f", "md5", "-"],
                          capture_output=True, text=True).stdout.strip()


def ts(a, b):
    return f"{vo.fmt(a)} - {vo.fmt(b)}"


def lauf(ordner, *extra):
    return subprocess.run([sys.executable, os.path.join(HIER, "voiceover.py"), ordner, "--arbeit", os.path.join(ordner, "_arbeit"), *extra],
                          capture_output=True, text=True, encoding="utf-8", env={**os.environ, "PYTHONIOENCODING": "utf-8"})


def pruefe_lauf(ordner, wahr, plan, name):
    r = lauf(ordner)
    check(r.returncode == 0, f"{name}: Werkzeug läuft durch" + ("" if r.returncode == 0 else ": " + r.stderr[-400:]))
    if r.returncode: return None
    rep = json.load(open(os.path.join(ordner, "_arbeit", "bericht.json"), encoding="utf-8"))
    z = rep["zeilen"]
    check(len(z) == len(wahr), f"{name}: {len(z)} Sprech-Zeilen (erwartet {len(wahr)})")
    falsch = [e["nr"] for e, (v, b) in zip(z, wahr) if abs(e["aufnahme_von"] - v) > 0.08 or abs(e["aufnahme_bis"] - b) > 0.15]
    check(not falsch, f"{name}: jede Zeile an der richtigen Stelle der Aufnahme" + (f" – falsch: {falsch}" if falsch else ""))
    ende, schlecht = -1e9, []
    for e, p in zip(z, plan):
        soll = max(p, ende + vo.STANDARD["abstand_s"])
        if abs(e["start"] - soll) > 0.002 or e["start"] < p - 1e-6: schlecht.append(e["nr"])
        ende = e["ende"]
    check(not schlecht, f"{name}: Start = Zeitmarke, nur bei zu langer Zeile davor so wenig später wie nötig, nie früher"
          + (f" – falsch: {schlecht}" if schlecht else ""))
    m = rep["messung"]
    check(abs(m["lufs"] + 14) <= 0.2 and m["spitze_dbtp"] <= -1.0, f"{name}: Mischung {m['lufs']} LUFS, Spitze {m['spitze_dbtp']} dBTP")
    ziel = os.path.join(ROOT, rep["ziel"])
    check(os.path.exists(ziel) and bild_md5(ziel) == bild_md5(rep_video(ordner)), f"{name}: {os.path.basename(ziel)} geschrieben, Bild bytegleich")
    return rep


def rep_video(ordner):
    return [os.path.join(ordner, f) for f in os.listdir(ordner) if "_video_" in f and not vo.sperr_datei(f)][0]


def main():
    for s in (sys.stdout, sys.stderr): s.reconfigure(encoding="utf-8")
    shutil.rmtree(OUT, ignore_errors=True)
    r = np.random.default_rng(7)

    # A) Kurzform: 8 Zeilen, zwei davon gesprochen länger als geplant (→ verschoben), eine mit Kommapause
    print("Kurzform")
    o = os.path.join(OUT, "V9901_2026-11-14_test_shortform"); os.makedirs(o)
    S = ["This man had one job: never fall asleep.", "Because if he did, his whole city could burn.",
         "So why does one city still pay a watchman today?", "Medieval towns were packed with wooden houses.",
         "One spark, and fire jumped from roof to roof.", "Afterwards, the council demanded brick houses.",
         "But a city still needed eyes.", "Telling the whole city: all is well."]
    raten = [4.2, 4.0, 4.4, 3.0, 4.1, 2.9, 4.3, 4.0]          # Zeile 4 und 6 langsam gesprochen
    plan = [0.0]
    for s in S[:-1]: plan.append(round(plan[-1] + vo.silben(s) / 4.2 + 0.45, 2))
    wahr = aufnahme(r, S, os.path.join(o, "meine aufnahme.wav"), raten)
    dauer = round(plan[-1] + 5, 1)
    skript(os.path.join(o, "V9901_2026-11-14_skript_test_v01.docx"), [(ts(p, p + 2), s) for p, s in zip(plan, S)], [" ".join(S)])
    video(os.path.join(o, "V9901_2026-11-14_video_test_v01.mp4"), dauer)
    # Skript in Word offen: Sperrdatei daneben (162 Byte, kein gültiges docx) – darf nicht als Skript genommen werden
    open(os.path.join(o, "~$901_2026-11-14_skript_test_v01.docx"), "wb").write(bytes([11]) + b"Nudle" + bytes(156))
    open(os.path.join(o, ".~lock.V9901_2026-11-14_video_test_v01.mp4#"), "wb").write(b"x")
    check(vo.finde(o, "*_skript_*.docx") == [os.path.join(o, "V9901_2026-11-14_skript_test_v01.docx")],
          "Word-Sperrdatei ~$…docx wird übersprungen")
    rep = pruefe_lauf(o, wahr, plan, "Kurzform")
    if rep:
        check(any(e["spaeter_s"] > 0.05 for e in rep["zeilen"]), "Kurzform: zu lange Zeilen schieben die nächste (im Bericht gemeldet)")
    r2 = lauf(o)
    check(r2.returncode == 0 and os.path.exists(os.path.join(o, "V9901_sequence02.mp4")), "zweiter Lauf → V9901_sequence02.mp4 (sequence01 bleibt)")

    # B) Langform: Kapitel, Zahlen im Sprechertext, Pausen-Marken im Reintext, panorama ohne Stimme
    print("Langform")
    o = os.path.join(OUT, "V9902_2026-11-14_test_longform"); os.makedirs(o)
    T = ["What if one spark could burn a whole city?", "In 1276, a great fire swept through Lübeck.",
         "—", "Afterwards, the council demanded brick houses.", "And that is why the city still has a watchman."]
    R = ["What if one spark could burn a whole city?", "In twelve seventy-six, a great fire swept through Loobeck.",
         None, "Afterwards, the council demanded brick houses.", "And that is why the city still has a watchman."]
    sp = [x for x in R if x]
    wahr = aufnahme(r, sp, os.path.join(o, "voice.mp3.wav"), [4.0, 4.1, 3.9, 4.0])
    os.replace(os.path.join(o, "voice.mp3.wav"), os.path.join(o, "voice.wav"))
    plan_alle = [0.0, 4.5, 10.0, 16.0, 20.5]
    zeilen = ["Kapitel 1 – hook – The Question", (ts(0.0, 4.5), T[0]),
              "Kapitel 2 – erklaerung – The Fire", (ts(4.5, 10.0), T[1]),
              "Kapitel 3 – panorama", (ts(10.0, 16.0), T[2]),
              "Kapitel 4 – aufloesung – Why", (ts(16.0, 20.5), T[3]), (ts(20.5, 25.0), T[4])]
    rein = ["Chapter 1 – hook – The Question", R[0] + " [pause 1s]", "Chapter 2 – erklaerung – The Fire", R[1] + " [pause 2s]",
            "Chapter 3 – panorama", "[pause 4s]", "Chapter 4 – aufloesung – Why", R[3] + " [pause 1s] " + R[4]]
    skript(os.path.join(o, "V9902_2026-11-14_skript_test_v01.docx"), zeilen, rein)
    video(os.path.join(o, "V9902_2026-11-14_video_test_v01.mp4"), 27)
    plan = [p for p, x in zip(plan_alle, R) if x]
    rep = pruefe_lauf(o, wahr, plan, "Langform")
    if rep:
        check(rep["silben_aus"] == "Reintext", f"Langform: Silben aus dem Reintext (Zahlen ausgeschrieben) – {rep['silben_aus']}")
        check(rep["zeilen_ohne_stimme"] == [3], f"Langform: panorama-Zeile ohne Stimme erkannt – {rep['zeilen_ohne_stimme']}")
        check([e["kapitel"].split(" – ")[1] for e in rep["zeilen"]] == ["hook", "erklaerung", "aufloesung", "aufloesung"],
              "Langform: Kapitel je Zeile im Bericht")
        # Stimme liegt nicht in der panorama-Zeit (10–16 s)
        x, _ = read_wav(os.path.join(o, "_arbeit", "mix.wav"))
        bett = x[:, int(11 * SR): int(15 * SR)]
        check(lufs(bett) < -25, f"Langform: panorama nur Musik/Geräusche ({lufs(bett):.1f} LUFS, keine Stimme)")

    # C) Aufnahme mit zu wenigen Sätzen → Abbruch mit Meldung
    print("Fehlerfall")
    o = os.path.join(OUT, "V9903_2026-11-14_test_shortform"); os.makedirs(o)
    aufnahme(r, S[:3], os.path.join(o, "a.wav"), [4.0] * 3)
    skript(os.path.join(o, "V9903_2026-11-14_skript_test_v01.docx"), [(ts(p, p + 2), s) for p, s in zip([0, 3, 6, 9, 12, 15, 18, 21], S)], [" ".join(S)])
    video(os.path.join(o, "V9903_2026-11-14_video_test_v01.mp4"), 25)
    r3 = lauf(o)
    check(r3.returncode != 0 and "Sprechstellen" in r3.stderr and not os.path.exists(os.path.join(o, "V9903_sequence01.mp4")),
          "zu wenige Sätze in der Aufnahme → Abbruch mit Meldung, kein Video")

    print(f"ERGEBNIS: {'alle Voice-over-Prüfungen ok' if not fehler else f'{len(fehler)} Fehler'}")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
