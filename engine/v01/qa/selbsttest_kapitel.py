# Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
# Selbsttest der Langform-Kapitel-Werkzeuge (jederzeit wiederholbar, ca. 1 min):
#   zeitplan  Prüf-Story TestszeneKapitel → Zeitplan mit 3 Kapiteln (hook, erklaerung, panorama), Kurzform-Testszene ohne Kapitel
#   skript    Skript-Generator (shared/skript-docx/make_docx.py) mit richtigen und absichtlich falschen Langform-Skripten:
#             richtige werden geschrieben, jeder eingebaute Fehler wird gemeldet (Kapitel-Art, Reihenfolge, Pausen-Marken …)
#   pruefung  Kapitel-Prüfung aus pruefung.py mit erfundenen Zeitplänen: richtig = kein Hinweis, falsch = je Fehler ein
#             Hinweis (Länge, Einstellungen, spannung-Phasen, unbekannte Art); „monoton“ nur im panorama erlaubt
#   ton       Musik-Abschnitt mit "bildpause": true liegt nach dem Hall genau bildpauseMusikDb (Mitte) über den Nachbarn
# Aufruf (aus dem Hauptordner): python engine/v01/qa/selbsttest_kapitel.py [--ohne-zeitplan]
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
O = os.path.join(ROOT, "output", "test", "kapitel")
PY = sys.executable
ENV = {**os.environ, "PYTHONIOENCODING": "utf-8"}
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "audio", "v01"))
TOK = json.load(open(os.path.join(ROOT, "shared", "design-tokens.json"), encoding="utf-8"))
F = 30
bad = []


def soll(name, ok, info=""):
    print(f"  {'ok    ' if ok else 'FEHLER'} {name}{('  – ' + info) if info and not ok else ''}")
    if not ok: bad.append(name)


# ---------- zeitplan ----------
def test_zeitplan():
    print("zeitplan")
    node = "node.exe" if os.name == "nt" else "node"
    for comp, n in (("TestszeneKapitel", 3), ("Testszene", 0)):
        z = os.path.join(O, f"z_{comp}.json")
        r = subprocess.run([node, "engine/v01/qa/zeitplan.mjs", "engine/v01/examples/testszene/index.tsx", comp, z], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
        if r.returncode: soll(f"Zeitplan {comp}", False, r.stderr[-300:]); continue
        k = json.load(open(z, encoding="utf-8")).get("kapitel", [])
        soll(f"{comp}: {n} Kapitel", len(k) == n, f"{len(k)} Kapitel")
        if n:
            soll("Kapitel-Arten hook, erklaerung, panorama", [x["art"] for x in k] == ["hook", "erklaerung", "panorama"], str([x["art"] for x in k]))
            soll("Kapitel lückenlos bis Videoende", k[0]["start"] == 0 and all(a["end"] == b["start"] for a, b in zip(k, k[1:]))
                 and k[-1]["end"] == json.load(open(z, encoding="utf-8"))["frames"])


# ---------- skript ----------
W = "the river carried old boats past the busy market every single morning".split()


def text(n, pausen=0):
    w = [W[i % len(W)] for i in range(n)]
    return " ".join(" ".join(w[i:i + 10]) + "." for i in range(0, n, 10)) + " [pause 1s]" * pausen


AUFRUF = json.load(open(os.path.join(ROOT, "shared", "design-tokens.json"), encoding="utf-8"))["formats"]["long-form"]["kapitelArten"]["aufruf"]["text"]
A = ("aufruf", 0, 0)   # Kapitel-Art aufruf: fester Text aus den Tokens


def rein(kap):
    """Reintexte je Kapitel (aufruf: fester Text)."""
    return [AUFRUF if art == "aufruf" else text(n, pz) for art, n, pz in kap]


def skript(name, fmt, kap, pure=None, vorne=None):
    src = open(os.path.join(ROOT, "shared", "skript-docx", "make_docx.py"), encoding="utf-8").read()
    kopf, rest = src.split("TITLE = ", 1)
    rest = rest[rest.index("\ndef shade"):]
    rows = list(vorne or [])
    for i, (art, n, pz) in enumerate(kap):
        rows += [f"Kapitel {i + 1} – {art}" + ("" if art == "aufruf" else f" – Title {i + 1}"), ("0:00 - 0:10", "Voice.", "Visual.")]
    data = (f"TITLE = 'Test {name}'\nVID, DATE, FORMAT, VERSION = 'V9999', '2026-11-14', {fmt!r}, 'v01'\nVIDEO_LEN = 600\n"
            f"ROWS = {rows!r}\nFACTS = []\nPURE = {(pure if pure is not None else rein(kap))!r}\nCHANGES = []\n")
    d = os.path.join(O, "skript"); os.makedirs(d, exist_ok=True)
    f = os.path.join(d, f"{name}.py"); open(f, "w", encoding="utf-8").write(kopf + data + rest)
    docx = os.path.join(d, f"{name}.docx")
    vorher = os.path.getmtime(docx) if os.path.exists(docx) else None  # „geschrieben“ = Datei neu oder neuer als vorher
    r = subprocess.run([PY, f, docx], capture_output=True, text=True, encoding="utf-8", env=ENV)
    return r.returncode, r.stdout + r.stderr, os.path.exists(docx) and os.path.getmtime(docx) != vorher


def test_skript():
    print("skript")
    L, K = "longform (16:9, 10 min)", "shortform (9:16, 61-80 s)"
    gut = [("hook", 60, 1), A, ("zeitreise", 170, 6), ("panorama", 0, 10), ("erklaerung", 255, 12), ("beispiel", 230, 8),
           ("mythos", 125, 4), ("panorama", 10, 6), ("spannung", 120, 4), ("aufloesung", 110, 5), ("abspann", 36, 2)]
    rc, out, da = skript("richtig", L, gut)
    soll("richtiges 10-min-Skript geschrieben, ohne Hinweis", rc == 0 and da and "Hinweis" not in out, out[-400:])
    rc, out, da = skript("beispiel_zweimal", L, gut[:5] + [("beispiel", 200, 6)] + gut[5:])
    soll("beispiel zweimal hintereinander erlaubt", rc == 0 and da, out[-400:])
    faelle = [
        ("art_unbekannt", gut[:3] + [("intro", 50, 0)] + gut[3:], None, None, "Art „intro“ unbekannt"),
        ("beginn_nicht_hook", [("erklaerung", 255, 12)] + gut[1:], None, None, "beginnt immer mit hook"),
        ("ende_falsch", gut[:-1], None, None, "endet immer mit aufloesung + abspann"),
        ("zweimal_gleich", gut[:2] + [("zeitreise", 150, 4)] + gut[2:], None, None, "„zeitreise“ zweimal hintereinander"),
        ("zeile_vor_kapitel", gut, None, [("0:00 - 0:05", "Intro.", "Logo.")], "Zeile vor dem ersten Kapitel"),
        ("reintext_anzahl", gut, [text(60)] * 9, None, "PURE hat 9 Reintext(e), ROWS hat 11 Kapitel"),
        ("ohne_kapitel", [], text(1200), None, "Langform ohne Kapitel"),
        ("pause_falsch", gut, [text(60) + " [pause 1 s]"] + rein(gut[1:]), None, "Falsche Pausen-Marke"),
        ("ziffern", gut, [text(60) + " In 1826, 50% & more."] + rein(gut[1:]), None, "Ziffern oder Symbole"),
        ("ohne_aufruf", [gut[0]] + gut[2:], None, None, "direkt nach dem hook kommt aufruf"),
        ("aufruf_zweimal", gut[:-2] + [A] + gut[-2:], None, None, "aufruf kommt 2-mal vor"),
        ("aufruf_text", gut, rein(gut[:1]) + ["Please like and subscribe."] + rein(gut[2:]), None, "(aufruf): Reintext muss genau"),
    ]
    for name, kap, pure, vorne, msg in faelle:
        rc, out, da = skript(name, L, kap, pure, vorne)
        soll(f"Fehler „{name}“ gemeldet, nichts geschrieben", rc == 1 and not da and msg in out, out[-300:])
    nummern = [("hook", 60, 1)] + gut[1:]
    rc, out, da = skript("nummern", L, nummern, vorne=None)
    # Nummern-Lücke: Kapitel-Zeile 3 als „Kapitel 4“ – direkt im erzeugten Skript ersetzt
    f = os.path.join(O, "skript", "nummern.py"); s = open(f, encoding="utf-8").read().replace("'Kapitel 3 –", "'Kapitel 4 –", 1)
    open(f, "w", encoding="utf-8").write(s)
    r = subprocess.run([PY, f, os.path.join(O, "skript", "nummern.docx")], capture_output=True, text=True, encoding="utf-8", env=ENV)
    soll("Fehler „Nummern-Lücke“ gemeldet", r.returncode == 1 and "ohne Lücke" in r.stdout, r.stdout[-300:])
    rc, out, da = skript("hinweise", L, [("hook", 140, 2)] + gut[1:3] + gut[4:7] + [("panorama", 40, 4)] + gut[9:])
    soll("Hinweise: hook zu lang, panorama zu lang und mit Sätzen, Lauf ohne panorama", rc == 0 and da and all(
        x in out for x in ("(hook): ca. 63 s – länger", "(panorama): ca. 24 s – länger", "Sätze – panorama", "4 Kapitel ohne panorama")), out[-600:])
    rc, out, da = skript("zu_kurz", L, [gut[0], gut[1], gut[4], gut[3], gut[9], gut[10]])
    soll("Hinweis: Gesamtlänge unter 8 min", rc == 0 and "Gesamt ca. 4.5 min" in out, out[-300:])
    rc, out, da = skript("aufruf_titel", L, gut)
    f = os.path.join(O, "skript", "aufruf_titel.py"); s = open(f, encoding="utf-8").read().replace("'Kapitel 2 – aufruf'", "'Kapitel 2 – aufruf – Like'", 1)
    open(f, "w", encoding="utf-8").write(s)
    r = subprocess.run([PY, f, os.path.join(O, "skript", "aufruf_titel.docx")], capture_output=True, text=True, encoding="utf-8", env=ENV)
    soll("Hinweis: aufruf ohne Titelkarte", r.returncode == 0 and "(aufruf): hat keine Titelkarte" in r.stdout, r.stdout[-300:])
    rc, out, da = skript("kurz_pause", K, [], text(150) + " [pause 1s]", [("0:00 - 0:06", "Hi.", "X.")])
    soll("Kurzform: Pausen-Marke ist ein Fehler", rc == 1 and "nur in der Langform" in out, out[-300:])
    rc, out, da = skript("kurz_kapitel", K, [("hook", 10, 0)], text(150))
    soll("Kurzform: Kapitel-Zeile ist ein Fehler", rc == 1 and "Kapitel-Zeilen gibt es nur" in out, out[-300:])
    rc, out, da = skript("kurz_richtig", K, [], text(150), [("0:00 - 0:06", "Hi.", "X.")])
    soll("Kurzform richtig: geschrieben, 150 Wörter", rc == 0 and da and "words 150" in out, out[-300:])


# ---------- pruefung ----------
def zp(kap):
    shots, kapitel, t = [], [], 0
    for i, (art, shots_s) in enumerate(kap):
        k = {"art": art, "titel": f"T{i + 1}", "start": t, "shots": []}
        for j, teile in enumerate(shots_s):
            sid, start, cuts = f"k{i}s{j}", t, []
            for x in teile[:-1]: t += round(x * F); cuts.append(t)
            t += round(teile[-1] * F)
            shots.append({"id": sid, "start": start, "end": t, "cuts": cuts}); k["shots"].append(sid)
        kapitel.append(k)
    for a, b in zip(kapitel, kapitel[1:]): a["end"] = b["start"]
    kapitel[-1]["end"] = t
    return {"frames": t, "shots": shots, "kapitel": kapitel}


def test_pruefung():
    print("pruefung")
    from pruefung import check_kapitel, ohne_aufruf, ohne_panorama
    gut = check_kapitel(zp([("hook", [[3, 3, 3]] * 3 + [[3]]), ("erklaerung", [[8]] * 15), ("panorama", [[10]]),
                            ("spannung", [[3]] * 6 + [[7]] * 6), ("aufloesung", [[5]] * 12), ("abspann", [[6]] * 3)]), F)
    soll("richtige Kapitel: kein Hinweis (Schnitte im Shot geteilt, spannung in 2 Phasen)", not gut["hinweise"], str(gut["hinweise"]))
    soll("Einstellungen im hook an Schnitten geteilt (10 × 3 s)", gut["kapitel"][0]["einstellungen_s"] == [3.0] * 10, str(gut["kapitel"][0]["einstellungen_s"]))
    h = check_kapitel(zp([("hook", [[9]] * 6), ("erklaerung", [[2]] * 10), ("panorama", [[20], [5]]),
                          ("spannung", [[7], [7], [3], [3]]), ("intro", [[5]])]), F)["hinweise"]
    for s in ("Kapitel 1 (hook): 54.0 s – länger", "Kapitel 1 (hook): 6 von 6 Einstellungen", "Kapitel 2 (erklaerung): 20.0 s – kürzer",
              "Kapitel 3 (panorama): 2 von 2", "Kapitel 4 (spannung): 2 von 4 Einstellungen ausserhalb 2–4 s, dann 6–8 s", "Kapitel 5 (intro): Art unbekannt"):
        soll(f"Hinweis „{s}“", any(x.startswith(s) for x in h), str(h))
    pan = gut["kapitel"][2]
    mon = [{"von": pan["von"] + 3, "bis": pan["von"] + 92}, {"von": 30, "bis": 119}, {"von": pan["bis"] - 10, "bis": pan["bis"] + 79}]
    f, e = ohne_panorama(mon, gut["kapitel"])
    soll("monoton mitten im panorama erlaubt, sonst Fehler", e == mon[:1] and f == mon[1:], f"Fehler {f}, erlaubt {e}")
    ka = check_kapitel(zp([("hook", [[3, 3, 3]] * 3 + [[3]]), ("aufruf", [[6]]), ("erklaerung", [[8]] * 15)]), F)
    soll("aufruf (6 s, 1 Einstellung) ohne Hinweis", not [x for x in ka["hinweise"] if "aufruf" in x], str(ka["hinweise"]))
    au = ka["kapitel"][1]
    eing = [[au["von"] + 5, au["bis"] - 5], [20, 50]]
    f, e = ohne_aufruf(eing, ka["kapitel"])
    soll("eingefroren im aufruf erlaubt, sonst Fehler", e == eing[:1] and f == eing[1:], f"Fehler {f}, erlaubt {e}")


# ---------- ton ----------
def test_ton():
    print("ton")
    from render import render
    mitte = sum(TOK["formats"]["long-form"]["audio"]["bildpauseMusikDb"]) / 2
    ak = ["C", "Am", "F", "G"] * 3
    spec = {"dauer": {"s": 36}, "musik": {"bpm": 112, "abschnitte": [
        {"ab": 0, "stimmung": "old", "akkorde": ak}, {"ab": 12, "stimmung": "calm", "bildpause": True, "akkorde": ak},
        {"ab": 24, "stimmung": "light", "akkorde": ak}], "schluss": True},
        "betten": [{"klang": "air", "ab": 0, "bis": 36, "db": -8}]}
    m = render(spec, os.path.join(O, "ton"))
    la = m.get("lauter_abschnitte", [])
    soll("Messung meldet die Bildpause", len(la) == 1 and la[0]["bildpause"], str(la))
    if la:
        soll(f"Musik in der Bildpause {mitte:g} dB über den Nachbarn (±0,15)", abs(la[0]["musik_unterschied_db"] - mitte) <= 0.15 and la[0]["soll_db"] == mitte, str(la[0]))
    ziel = TOK["audio"]
    soll("Mischung auf dem Ziel", abs(m["lufs"] - ziel["targetLUFS"]) <= 0.1 and m["spitze_dbtp"] <= ziel["truePeakDbtp"] + 0.05, f"{m['lufs']} LUFS, {m['spitze_dbtp']} dBTP")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(O, exist_ok=True)
    if "--ohne-zeitplan" not in sys.argv: test_zeitplan()
    test_skript(); test_pruefung(); test_ton()
    print("ERGEBNIS:", "alle Kapitel-Prüfungen ok" if not bad else f"{len(bad)} Prüfungen fehlgeschlagen: {', '.join(bad)}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
