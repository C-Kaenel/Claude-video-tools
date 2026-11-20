# Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
# Selbsttest der Prüfung (jederzeit wiederholbar): rendert die Testszene, baut Fehler ein und prüft, dass
# pruefung.py genau die erwarteten Fehler findet – und in sauberen Videos keinen Fehlalarm gibt (die graue Testszene
# muss die Farb-Prüfung als monoton melden) – dazu die Farb-Schwellen je Stil (ohne Render). Läuft zweimal: Hochformat (Kurzform 9:16: Testszene, TestszeneRand) und
# Querformat (Langform 16:9: TestszeneQuer, TestszeneRandQuer) – die Prüfung erkennt das Format selbst.
# Aufruf (aus dem Hauptordner, dauert ein paar Minuten): python engine/v01/qa/selbsttest.py [--ohne-render] [--nur hoch|quer]
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
O = os.path.join(ROOT, "output", "selbsttest")
E = "engine/v01/examples/testszene/index.tsx"
PY = sys.executable
NPX = "npx.cmd" if os.name == "nt" else "npx"
FORMATE = [  # Ordner, Composition, Rand-Composition, erwartetes Format, Grösse
    ("hoch", "Testszene", "TestszeneRand", "shortform", (1080, 1920)),
    ("quer", "TestszeneQuer", "TestszeneRandQuer", "longform", (1920, 1080)),
]


def sh(*cmd):
    subprocess.run(list(cmd), cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def check(out, video, *extra):
    subprocess.run([PY, "engine/v01/qa/pruefung.py", video, out, *extra], cwd=ROOT, check=True, stdout=subprocess.DEVNULL, env={**os.environ, "PYTHONIOENCODING": "utf-8"})
    return json.load(open(os.path.join(out, "bericht.json"), encoding="utf-8"))


def main():
    if hasattr(sys.stdout, "reconfigure"): sys.stdout.reconfigure(encoding="utf-8")
    nur = sys.argv[sys.argv.index("--nur") + 1] if "--nur" in sys.argv else None
    results = []
    def expect(label, ok, info=""): results.append((label, ok)); print(("  ok   " if ok else "  FEHLT ") + label + (f"  ({info})" if info else ""))
    for name, comp, rand, fmt, size in FORMATE:
        if nur and nur != name: continue
        o = os.path.join(O, name) if name != "hoch" else O   # Hochformat bleibt in output/selbsttest/ (für --schnell)
        os.makedirs(o, exist_ok=True)
        v, vk, z = os.path.join(o, "testszene.mp4"), os.path.join(o, "rand_karten.mp4"), os.path.join(o, "zeitplan.json")
        vr, zr = os.path.join(o, "rand.mp4"), os.path.join(o, "zeitplan_rand.json")
        print(f"{name} ({fmt}, {size[0]}×{size[1]}):")
        if "--ohne-render" not in sys.argv or not all(os.path.exists(p) for p in (v, vr, vk, z, zr)):
            print("  rendere Testszene und Rand-Szene …")
            sh(NPX, "remotion", "render", E, comp, v, "--codec", "h264", "--crf", "16", "--log=error")
            sh(NPX, "remotion", "render", E, rand, vr, "--codec", "h264", "--crf", "16", "--log=error")
            sh(NPX, "remotion", "render", E, rand, vk, "--props={\"qa\":\"karten\"}", "--codec", "h264", "--crf", "18", "--log=error")
            sh("node", "engine/v01/qa/zeitplan.mjs", E, comp, z)
            sh("node", "engine/v01/qa/zeitplan.mjs", E, rand, zr)
        k = os.path.join(o, "kaputt.mp4")
        sh(PY, "engine/v01/qa/fehler_einbauen.py", v, k, "--sprung", "35", "20", "--schwarz", "70", "74", "--weiss", "150", "--eingefroren", "230", "250")
        r = check(os.path.join(o, "sauber"), v, "--zeitplan", z, "--ohne-ton")
        expect(f"{name}: Format erkannt ({fmt}, {size[0]}×{size[1]})", r.get("format") == fmt and (r["breite"], r["hoehe"]) == size, f"{r.get('format')} {r['breite']}×{r['hoehe']}")
        # die Testszene ist absichtlich grau (Testfarben): die Farb-Prüfung muss sie als monoton melden, sonst nichts
        expect(f"{name}: sauberes Video ohne Fehler (ausser Farbe)", [f for f in r["fehler"] if not f.startswith("Monoton")] == [])
        if name == "hoch": expect(f"{name}: graue Testszene als monoton gemeldet", len(r["farbe"]["monoton"]) > 0)
        else: expect(f"{name}: Farb-Prüfung gelaufen (je 3 s ein Abschnitt)", len(r["farbe"]["abschnitte"]) >= 3, f"{len(r['farbe']['abschnitte'])} Abschnitte, monoton {len(r['farbe']['monoton'])}")
        r = check(os.path.join(o, "sauber_ohne_zeitplan"), v, "--ohne-ton")
        expect(f"{name}: Format ohne Zeitplan aus der Bildgrösse", r.get("format") == fmt)
        r = check(os.path.join(o, "kaputt"), k, "--zeitplan", z, "--ohne-ton")
        b = r["bild"]
        expect(f"{name}: schwarz 70–74 gefunden", [70, 74] in b["schwarz"])
        expect(f"{name}: weiss 150 gefunden", [150, 150] in b["weiss_ungeplant"])
        expect(f"{name}: eingefroren 231–250 gefunden", any(a <= 231 and e >= 250 for a, e in b["eingefroren"]))
        expect(f"{name}: Sprung 35 gefunden", 35 in b["spruenge"])
        r = check(os.path.join(o, "rand"), vr, "--zeitplan", zr, "--karten", vk, "--ohne-ton")
        sa = r.get("safe_area", {})
        expect(f"{name}: Safe Area des Formats benutzt", sa.get("format") == fmt and "rand_px" in sa, json.dumps(sa.get("rand_px")))
        expect(f"{name}: Safe Area (oben) gefunden", any("oben" in x["seiten"] for x in sa.get("verstoesse", [])))
        # Gegenprobe: Zeitplan des anderen Formats → Format-Widerspruch muss gemeldet werden
        anders = os.path.join(O if name != "hoch" else os.path.join(O, "quer"), "zeitplan.json")
        if os.path.exists(anders):
            r = check(os.path.join(o, "falsches_format"), v, "--zeitplan", anders, "--ohne-ton")
            expect(f"{name}: falsches Format im Zeitplan gemeldet", any("passt nicht zum Format" in f for f in r["fehler"]))
    # Farb-Schwellen je Stil (look.pruefung.stile.<stil>), ohne Render: erfundene Messwerte je Frame (Sättigung, Farbigkeit,
    # Helligkeit, Farbtöne); Stil-Werte nur im Test eingesetzt (die echten trägt die Stil-Sitzung in die Tokens ein)
    if not nur:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import pruefung as P
        print("Farb-Schwellen je Stil:")
        kalt = {i: (0.19, 5.4, 0.4, 2) for i in range(90)}        # grau-kalter Stil wie T0004
        grau = {i: (0.02, 0.5, 0.4, 0) for i in range(90)}        # ganz grau (z. B. nur Void)
        schwarz = {i: False for i in range(90)}
        mono = lambda looks, stil: P.check_look(looks, 30, schwarz, P.schwellen(stil)[0])
        alt = P.LOOK.get("stile")
        P.LOOK["stile"] = {"test-kalt": {"saettigungMin": 0.12, "farbigkeitMin": 3.5, "farbtoeneMin": 1.0}, "test-aus": {"monoton": False}}
        expect("ohne Stil-Werte: grau-kalt ist monoton", len(mono(kalt, "T0003_cartoon-3d2d")["monoton"]) == 1)
        expect("Stil-Werte: grau-kalt nicht monoton", not mono(kalt, "test-kalt-referenz")["monoton"] and P.schwellen("test-kalt-referenz")[1] == "test-kalt")
        expect("Stil-Werte: ganz grau bleibt monoton", len(mono(grau, "test-kalt-referenz")["monoton"]) == 1)
        f = mono(grau, "test-aus")
        expect("\"monoton\": false → nur Hinweis", not f["monoton"] and len(f["monoton_erlaubt"]) == 1)
        if alt is None: P.LOOK.pop("stile")
        else: P.LOOK["stile"] = alt
    bad = [l for l, ok in results if not ok]
    print("ERGEBNIS:", "alles gefunden, kein Fehlalarm" if not bad else f"{len(bad)} Prüfungen fehlgeschlagen")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
