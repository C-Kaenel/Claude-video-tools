---
name: cartoon-3d2d
description: K0002 – eigener V-Video-Skill (100 % eigen) für Videos im Kurzformat (9:16, Shorts) und Langformat (16:9, YouTube) im Stil T0003 „cartoon-3d2d“ – flache Cartoon-Figuren (Bohnen-Körper, runder Kopf, Tusche-Kontur) in einer bunten, gemalten 3D-Stadt mit schwarzen Tusche-Linien, Effekt-Karten (Sprechblasen, Schilder, Zeitung …), gleitender Kamera, eigener Musik und Geräuschen, KEINE Stimme (der Nutzer spricht das Voice-over selbst). Gerendert mit dem eigenen Motor engine/v01 (Remotion + three.js), Ton mit audio/v01. Immer zusammen mit prompts/production-guide.md. Verwenden, wenn der Nutzer den Stil „Cartoon-3D2D“ oder „Cartoon-3D“ wählt, ein Video „wie hello / zombie“ will, eine Geschichts- oder Wissens-Story mit Cartoon-Figuren in 3D, oder diesen Skill nennt. NICHT für den kalten Quader-Stil Quadratic-3D (→ K0004 quadratic-3d) und NICHT, um einen neuen Stil zu bauen (dafür K0003 stil-skill-erstellen).
---

# K0002 cartoon-3d2d – Kurzvideo im Stil T0003 auf dem eigenen Motor

Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage. Alles, was hier benutzt wird,
gehört uns: Motor `engine/v01/`, Stil `styles/T0003_cartoon-3d2d/`, Bibliothek `library/`, Ton `audio/v01/`.
Für Menschen ausführlicher: `docs/handbuch.docx` (Abschnitte 6.6b–6.6d, 6.10). Für Maschinen: `engine/v01/README.md`,
`audio/v01/README.md`, `library/README.md`, `styles/T0003_cartoon-3d2d/README.md`.

## Referenzbilder
`referenzen/bilder/` – Einzelbilder aus unseren fertigen Videos (alle 4 s, `V####_<frame>.jpg`), `referenzen/boegen/` –
Kontaktbögen (12 Bilder, eines pro Sekunde). So soll der Stil aussehen: Bildausschnitte, Figurengrösse, Licht, Karten,
Tusche. Vor einem neuen Video ansehen und Testbilder damit vergleichen.

## Ablauf (immer `prompts/production-guide.md` befolgen – dieser Skill füllt Schritt 4–6)

1. **Phase 1 + Schritt 1–3 des Guides** (Rückfragen, ID aus `00_index.md`, Ordner, Skript mit Reintext, Faktencheck).
2. **Bibliothek ansehen:** `library/index.json` – Figuren B0001–B0010 + B0045–B0052, Effekt-Karten B0011–B0032 + B0053–B0055 + B0061–B0063 + B0070–B0072 + B0081–B0083,
   Orte B0033–B0039 + B0056–B0060 (Korea) + B0064–B0067 (Hanse), Figuren auch B0068–B0069 (Hanse), B0079–B0080 (Pestarzt, Arzt 1350), B0089–B0094 (Hanse: zimmermann, moench, stadtwache mit Eisenhut und Spiess, magd, hanse-kind, schiffer), B0100–B0107 (Wikinger um 900: wikinger-krieger, -jarl, -schmied, -fischer, -frau, -kind, -skalde, -haendler), B0108–B0111 (Bayreuth 1876: saenger mit Hörnerhelm, doepler, dirigent, publikum-1876), Karten zum Wikinger-Mythos B0112–B0119, B0126–B0134 (Rom, frühe Kaiserzeit: roemer-bauarbeiter, -legionaer, -vermesser mit Groma, -centurio, -haendler, -frau, -reisender, -kind, -beamter in Toga), Römer-Karten B0135–B0139 (groma, strassenschichten, meilenstein, strassennetz, heute-alt-neu), B0145–B0164 (Römer-Wasser: frontinus, roemer-ingenieur, -aquarius, -tunnelgraeber, -eimertraeger, -bleigiesser, -wasserdieb, -baecker, -bauer, -hirte, -waescherin, -wassertraegerin, -badegast, -badediener, -koechin, -schiffer, -villenherr, fruehrom-mann, fruehrom-frau, forscherin-heute), Wasser-Karten B0165–B0174 (gefaelle, siphon, bleirohr, verteiler, wasserkarte, balkenvergleich, pool-uhr, amtsstempel, bohrkern, becher-rangliste), Kamera-Muster B0040–B0044 (Vorschaubilder neben jedem Eintrag). Wiederverwenden vor neu bauen.
   **Szenen-Rezepte zuerst** (B0073–B0078, B0084–B0088, B0120–B0124, B0140–B0143, B0175–B0192, `library/rezepte/`): fertig ausgestattete, geprüfte Orte – Welt, Requisiten und
   Details (Bäume, Blumentöpfe, Blumen, Fahnen, Fässer …), freie Standpunkte und Gehweg für Figuren, zwei Kameras (halbnah,
   totale) ohne Raum-Funde und mit ≥ 6 Details: hanse-markt, hanse-gasse, hanse-kai, hanse-kran, stadt-platz, stadt-park, stadt-kai,
   stadt-strasse, korea-dorf, korea-tor, korea-hwaseong, nord-hafen, nord-dorf, nord-strand, nord-schmiede, bayreuth-buehne, roemer-strassenbau, roemer-landstrasse, roemer-forum, roemer-bruecke, aqua-quelle, aqua-bruecke, aqua-bogenreihe, aqua-baustelle, aqua-vermessung, aqua-tunnel, aqua-siphon, aqua-wasserschloss, aqua-strasse, aqua-zierbrunnen, aqua-thermen, aqua-caldarium, aqua-cloaca, aqua-fruehrom, aqua-buero, aqua-kueche, aqua-atrium, aqua-see-boot. Bei hanse-kai und stadt-kai schaut die Kamera aufs Wasser (Bild gespiegelt:
   „links“/„rechts“ der Punkte gelten im Bild).
   ```ts
   szene: { ...rezept("hanse-markt"), cast: [steh("rufer", rezeptPunkt("hanse-markt", "mitte"), …)] },
   camera: rezeptKamera("hanse-markt", "halbnah"),
   ```
   Eigene Requisiten dazu: `props: [...rezept("hanse-markt").props, …]`. Neues Rezept: JSON in `library/rezepte/` (B-ID),
   dann `node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/rezepte.tsx Rezepte output/rezepte` und
   `python tools/bibliothek/rezepte_eintragen.py output/rezepte` (trägt Prüfung + Vorschaubild ein, Rückgabe 1 = nicht frei).
   Zweite Welt: `szene: { welt: "korea", korea: { hanyang: "alt"|"neu", hwaseong: "bau"|"ganz"|"ruine" }, … }` – Orte mit
   `koreaOrt("dorf" | "bergfestung" | "grenzmauer" | "hanyang" | "hwaseong")`, Gelände-Höhe `koreaHeight(x, z)`, Mauerpfade
   `KOREA_WALLS` (Figuren darauf stehen auf der Krone; Kamera auf die Innenseite, die Brustwehr liegt aussen). Beispiel: V0004.
   Dritte Welt: `szene: { welt: "hanse", hanse: { luken: "zu"|"offen", aufzug: [{ t0, t1, art }], glocke: [t0, t1], kranLast: { t0, t1 },
   koggen: [{ at: [x, z], segel: "voll", schwarz?, turn, weg: { nach, t0, t1 } }], hafen: false } }` – Hafen einer Hansestadt um 1400
   (Zeiten in Film-Sekunden). Orte mit `hanseOrt("strasse" | "kaufmannshaus" | "kai" | "kran" | "markt" | "kirche" | "fluss")`;
   Häuser bei z −6,5 (Blickpunkt nie hinter z −5,1 legen – Windenbalken und Stufe gehören zum Haus), Kai z 3,5–10, Koggen z 14,6,
   Marktplatz x 93–141, z −6,5…−29, rundum von Häusern geschlossen; Kirchturm-Front bei z −29 (`HANSE_KIRCHE_Z`, Blickpunkt davor),
   Wasser ab z 10. Hüte `gugel` und `schleier` für das Mittelalter. Beispiel: V0005 (Quelle `_archive/V0005_quelle/`).
   Vierte Welt: `szene: { welt: "nord", nord: { winter?, schneefall?, innen?, dorf?, hafen?, schiffe: [{ art: "langschiff"|"knorr", at, turn,
   modus: "segeln"|"rudern"|"liegen"|"strand", weg? }] } }` – Wikinger um 900: Fjord, Felswand, Berge mit Schnee, Kiesstrand, Dorf mit
   Langhäusern, Hafen, Schmiede, Grabhügel, Thingplatz, Tiere und Requisiten (einzeln: `props: [{ kind: "nordteil", art: "esse", at }]`,
   Liste `NORD_REQUISITEN`). Orte `NORD_PLACES`, Boden `nordGroundAt`. Figuren B0100–B0107 – Helme nie mit Hörnern.
   Fünfte Welt: `szene: { welt: "bayreuth", bayreuth: { vorhang: 0 | 1 | { t0, t1 } } }` – Festspielhaus 1876: aussen (x 0, Vorplatz mit
   Springbrunnen), Saal mit Bühne, Vorhang, Rampenlicht und verdecktem Orchestergraben (x 400), Garderobe mit Helmständern (x 470).
   Orte `BAYREUTH_PLACES`, Boden `bayreuthGroundAt` (Dirigent auf dem Podest: `groundY: -2.2`); Figuren der Epoche „stadt“ + B0108–B0111.
   Sechste Welt: `szene: { welt: "roemer", roemer: { voegel?, meilenZahl? } }` – Rom, frühe Kaiserzeit: schnurgerade Römerstrasse
   (x 0) mit Pinienallee, Meilenstein, Grabmälern und Wegstation; Baustelle mit den Schichten im Schnitt, Groma-Wiese und Legionslager
   (z 21…130); Fluss mit Steinbrücke (z −134…−186); Forum mit Tempel, Säulenhallen, Triumphbogen und Goldenem Meilenstein (x 700).
   Orte `ROEMER_PLACES` (strassenbau, vermessung, lager, landstrasse, meilenstein, graeber, mansio, bruecke, forum, goldener-meilenstein),
   Boden `roemerGroundAt`, Requisiten einzeln `props: [{ kind: "roemerteil", art: "ochsenkarren", at }]` (Liste `ROEMER_REQUISITEN`).
   Siebte Welt: `szene: { welt: "aqua", aqua: { voegel?, zonen?, ueberlauf?, dickeDuese? } }` – Wasser im alten Rom (für Langform): zwölf
   Zonen nebeneinander, je 600 m in x (quelle, bruecke, bogenreihe, tunnel, siphon, wasserwerk, strasse, thermen, cloaca, fruehrom, innen,
   heute); gebaut werden nur die Zonen nahe an den Kameras. Orte `AQUA_PLACES` (rund 38, z. B. quelle, bruecke, bruecke-oben, baustelle,
   vermessung, tunnel, siphon, wasserschloss, strasse, zierbrunnen, thermen, caldarium, latrine, cloaca, fruehrom, buero, kueche, atrium,
   ruinen, see-boot – Weltkoordinaten, `.note` beschreibt den Ort), Boden `aquaGroundAt`, Requisiten `props: [{ kind: "aquateil", art, at }]`
   (Liste `AQUA_REQUISITEN`). Figuren der Epoche „roemer“; neue Dinge in der Hand: krug, eimer, schaufel, spitzhacke, rolle, schwammstab,
   oellampe, brot, muenzen.
3. **Quelle anlegen:** `styles/T0003_cartoon-3d2d/vorlage-video/` nach `productions/V####_…/src-motor/` kopieren
   (`story.ts`, `index.tsx`) und `ton.json` als `V####_datum_ton_<titel>_v01.json` in den Produktionsordner.
   **Langformat:** statt `story.ts` die `story-lang.ts` (als `story.ts`) und `ton-lang.json` nehmen; `index.tsx` registriert im
   Video nur die eine Story. Regeln im Abschnitt „Langformat“ unten.
   **Alle Importe umschreiben** (die Vorlage liegt in `styles/`, die Kopie drei Ebenen tiefer in `productions/`):
   `../../../engine/v01`, `../../../styles/T0003_cartoon-3d2d/style` (für `cartoon3d2d`), `../../../styles/T0003_cartoon-3d2d/szene`.
4. **Story als Daten schreiben** (Regeln unten). Composition-ID = `story.id`, z. B. `V0004-v01`.
5. **Testbilder (sparsam – jedes Bild kostet viel):** zuerst `node engine/v01/qa/raum.mjs … output/raum` – das liefert
   `uebersicht.png` (alle Shots auf einem Bild) und meldet Gesichter am Bildrand oder verdeckt als Text. Einzelbilder nur für
   Shots mit Funden oder Zweifeln: `node engine/v01/qa/stills.mjs productions/V####_…/src-motor/index.tsx <ID> output/x_ 15,90,200 0.35`
   – jede Einstellung ansehen (Figuren auf dem Boden? Blasen im Bild? Ausdruck zur richtigen Zeit?).
   Mit Safe-Area-Linien: `PROPS='{"guides":true}' node engine/v01/qa/stills.mjs …`. Immer auch das **letzte Frame** eines
   Shots ansehen – beim Schieben wandern Karten nach oben/aussen.
6. **Jeder Stand wird direkt gerendert** (keine Live-Vorschau, Guide 3.6): Video + Ton in einem Befehl nach
   `output/<ID>/video_vNN.mp4` (Raum-Prüfung, Bild, Ton, Mischung, Prüfung; Konsole nur Zusammenfassung, Logs in
   `output/<ID>/logs/`, hält bei Raum-Funden vor dem Render an); der Nutzer sieht sich die Datei an:
   ```bash
   node engine/v01/render/produziere.mjs productions/V####_…/src-motor/index.tsx <ID> productions/V####_…/V####_datum_ton_<titel>_v01.json output/<ID>/video_v01.mp4
   ```
   Vor dem ganzen Render reichen für die eigene Prüfung Raum-Prüfung, `uebersicht.png` und einzelne Testbilder (Schritt 5).
   Änderungen danach nur an den betroffenen Shots per Teil-Render (Schritt 7) → `output/<ID>/video_v02.mp4`, v03 …;
   ganz neu nur, wenn vieles, die Länge oder Motor/Stil geändert wurde. Beim grünen Licht kommt die zuletzt geprüfte
   Fassung als v01 in den Produktionsordner.
   Einzeln (nur bei Bedarf):
   ```bash
   npx remotion render productions/V####_…/src-motor/index.tsx <ID> output/bild.mp4 --codec h264 --crf 16
   python audio/v01/render.py productions/V####_…/V####_datum_ton_<titel>_v01.json output/ton
   tools/ffmpeg/bin/ffmpeg.exe -i output/bild.mp4 -i output/ton/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest output/video.mp4
   ```
   **Langformat: Kapitel für Kapitel** (statt des einen Befehls oben): jedes Kapitel einzeln rendern und prüfen, der Nutzer
   schaut sie an; zusammengefügt wird erst nach seinem grünen Licht zu allen Kapiteln:
   ```bash
   node engine/v01/render/produziere.mjs productions/V####_…/src-motor/index.tsx <ID> productions/V####_…/V####_datum_ton_<titel>_v01.json --kapitel alle   # oder --kapitel 3,5
   node engine/v01/render/zusammenfuegen.mjs productions/V####_…/src-motor/index.tsx <ID> productions/V####_…/V####_datum_ton_<titel>_v01.json output/<ID>/video_v01.mp4
   ```
   Ergebnis je Kapitel: `output/<ID>/kapitel/NN_<art>.mp4` + `stand.md`. Korrekturen: nur die betroffenen Kapitel neu
   (`--kapitel 3,5`). Achtung: `zusammenfuegen.mjs` bricht ab, wenn Kapitel mit verschiedenem Motor-Stand gerendert wurden –
   auch nach Änderungen an `styles/T0003_cartoon-3d2d/` oder den Tokens; dann diese Kapitel neu rendern.
   Das Video bleibt in `output/`, bis es die Prüfung bestanden hat.
7. **Prüfen (Pflicht, macht `produziere.mjs` mit; nach einem Teil-Render: `produziere.mjs … --schritte pruefung --video <v02.mp4>`):**
   zuerst die Welt (vor dem ganzen Render, Sekunden je Shot), dann das fertige Video.
   ```bash
   node engine/v01/qa/raum.mjs productions/V####_…/src-motor/index.tsx <ID> output/raum
   node engine/v01/qa/zeitplan.mjs productions/V####_…/src-motor/index.tsx <ID> output/z.json
   npx remotion render productions/V####_…/src-motor/index.tsx <ID> output/karten.mp4 --props='{"qa":"karten"}' --codec h264 --crf 18
   python engine/v01/qa/pruefung.py output/video.mp4 output/pruefung --zeitplan output/z.json --karten output/karten.mp4
   ```
   Jeden Fehler ins Review (`…_review_…_v01.md`: Zeit | Problem | Schweregrad | Lösung | Status).
   **Fehler-Ablauf (Guide Schritt 6):** alle Funde einer Runde sammeln → beheben → betroffene Shots als Testbilder bzw.
   Abschnitt prüfen (`npx remotion render … --frames=<von>-<bis> output/abschnitt.mp4`) → dann das neue Video erzeugen:
   nur einzelne Shots geändert → **Teil-Render** auf einer Kopie der letzten Version:
   `node engine/v01/render/teilrender.mjs <einstieg.tsx> <ID> <basis_v01.mp4> output/<…>_v02.mp4 --shots <shot-id,shot-id>`
   (prüft vorher Stichproben, nachher jedes unveränderte Bild; bricht ab, wenn der Motor inzwischen anders zeichnet →
   dann ganz rendern). Sonst ganz neu rendern. Danach vollständig prüfen (`pruefung.py`). **Höchstens 2 Versuche pro Fehler**, danach anhalten und den Nutzer mit Bild und
   Vorschlägen fragen. Inhaltliche Fehler (Fakten, Text, Länge) sofort melden. Bricht das Rendern ab: Handbuch Kapitel 9,
   eine Abhilfe, ein neuer Versuch – sonst Fehlermeldung an den Nutzer, Motor/Stil nicht eigenmächtig ändern.
   Erst nach dem grünen Licht des Nutzers: die zuletzt geprüfte Fassung `output/<ID>/video_vNN.mp4` als `productions/V####_…/V####_datum_video_<titel>_v01.mp4` ablegen.
8. **Abschluss** laut Guide (Schritt 7–9): fragen, was noch geändert werden soll; nach dem grünen Licht bleiben im
   Produktionsordner nur finales Video + Skript, Quellen nach `_archive/<ID>_quelle/`, der Rest nach `_archive/zum-loeschen/`.
   Register `00_index.md` nachführen („nutzt: T0003, K0002, B-IDs …“). **Titelbild (Schritt 8, nur Langform 16:9 – Kurzform bekommt keins):** Kontaktbogen
   `python tools/titelbild/titelbild.py <video.mp4> --bogen`, Shot wählen, dann `--zeit <s> --zeile1 "…" --zeile2 "…"` →
   `V####_<datum>_thumbnail_<name>_vNN.png` im Produktionsordner (Werte: Tokens `titelbild`). **Voice-over (Schritt 9):** Der Nutzer legt seine
   Aufnahme in den Produktionsordner; daraus wird `<ID>_sequence01.mp4` (Sätze auf die Zeitmarken des Reintexts, Musik und
   Geräusche unter der Stimme geduckt, −14 LUFS, Bild unverändert) – Befehl laut Guide Schritt 9. Erst dann endet die Video-Sitzung.

## Story-Daten (`story.ts`)

```ts
shot(FPS, { id: "01-ruf", a: 0, b: 150,                       // Frames im Film (a bis b)
  camera: kamera("halbnah", [24, -2.8]),                     // Muster aus der Bibliothek auf einen Bodenpunkt
  focus: { strength: 11, point: [24, 1.6, -2.8] },           // Tiefenschärfe (Nah 12–14, Halbnah 10–12, Totale 0)
  kicks: [{ at: 1.0, amp: 0.006 }],                          // Stoss bei Aufprall/Ruf (Film-Sekunden)
  szene: {
    cast: [{ lib: "rufer", seed: 1, keys: [{ at: -10, pos: [24, -2.8], expr: "smile" }, { at: 0.93, expr: "shout", pose: "shout" }] }],
    fx: [{ kind: "sprechblase", h: 0.6, unlit: true, keys: [{ at: 1.0, show: true, pos: [24.2, 2.05, -2.75], params: { text: "HELLO!", art: "ruf" } }] }],
    props: [{ kind: "bench", at: [13.8, -2.25] }],   // auch: baum, busch, blumen (w×d), blumentopf, fahne (farbe), fackel,
                                                     // karren (n: 0 = leer), brunnen (farbe = Dach), koerbe (n), onggi (n, Korea), huehner (n), holzstapel
  } })
```
- **Darsteller:** `{ lib: "rufer", seed, keys }` (Figur aus der Bibliothek) oder `{ spec: {...FigureSpec}, seed, keys }`
  (eigene Figur: skin, coat, garment "coat"/"dress", hair {style cap/side/bob/long/bald/topknot/bun, color}, hat {kind top/cap/flatcap/
  bonnet/shako/helmet/gat/headband/gugel/schleier/krempe/eisenhut/spangenhelm/nasalhelm/lederkappe/hoernerhelm/fluegelhelm/galea/petasus, color, band}, moustache, scarf, build adult/child/stout, maske {color, haube?, glas?} =
  Schnabelmaske statt Gesicht, stab = Stock in der rechten Hand (Farbe), umhang / handschuhe / saum / schnalle = Uniform-Teile (Farben);
  Rom: lorica (Schienenpanzer, Metallfarbe), toga {color, streifen}, schild art "scutum", ding pilum/messlatte/groma/dolabra;
  Nord: hair "zoepfe", bart {color, art voll/zopf/zwei}, borte, mantel {color, fibel}, kette (Kettenhemd), schuerze {color, fibeln?, perlen?},
  schild {color, muster, art kreuz/halb/wirbel/ring} links, ding {art speer/axt/ruder/hammer/schwert/leier/waage/taktstock/skizze} rechts;
  1876: frack {hemd, schleife}). `skin` am Darsteller färbt nur die Haut um. Pestarzt: Bibliothek B0079.
- **Spur-Schlüssel:** `pos` [x, z] (gehen = zwei Schlüssel mit Lage; Schritte automatisch), `expr` (17 Ausdrücke: neutral,
  stern, grin, laugh, whistle, nervous, shock, relief, relief_open, dazed, pained, smile, smile_closed, lick, shout, sad, angry = wütend mit Zornesader),
  `pose`, `look` −1…1 (Augen), `side` −1/0/1 (Gesicht seitlich, nicht die Arme), `spiegeln: true` (Haltung spiegeln: linker
  statt rechter Arm), `tilt`, `lean`, `skin` + `skinFade` (Hautwechsel in s).
- **Posen:** stand (steht) · walk/march (gehen, automatisch bei Bewegung) · sit (sitzt, siehe Fallen) · fall (fällt um) ·
  wave (rechter Arm winkt) · point (rechter Arm waagrecht zur Seite – mit `spiegeln` nach links, z. B. Anstossen) ·
  raise (rechter Arm senkrecht hoch) · hold (beide Hände vor der Brust, z. B. Zeitung halten) · shout (Faust neben dem Kopf) ·
  tilt (Kopf neigen) · lean (Körper neigen).
- **Menge:** `...menge(seed, n, [x, z], { breite, tiefe, t0, t1, weg: [dx, dz], expr })` in `cast` – Zufallsfiguren mit festem
  Startwert, optional gehen sie los.
- **Effekt-Karten:** `{ kind, h, keys, unlit?, boden? }` – `h` = Höhe in Metern; `pos` ist der Anker (meist **unten Mitte**,
  bei mikroskop/popstern **Mitte**, bei schallboegen **linke Mitte**). `show: true/false` (ploppt auf/verschwindet), `pos` gleitet
  zum nächsten Schlüssel mit Lage, Zahlen-`params` gleiten, Texte wechseln hart, `motion`: sway/pulse/bob. `boden: true` = y über
  dem Boden. `unlit: true` für Texte/Blasen (nicht vom Licht getönt).

| Karte | Angaben (`params`) |
|---|---|
| sprechblase | text, art "ruf"/"rede", schwanz "links"/"rechts" |
| ladenschild | von, zu, fortschritt 0…1 (Buchstaben tauschen) |
| zeitung | kopf, datum, schlagzeile, kreis true/false |
| brief | datum, text (Handschrift) |
| gluehbirne | an 0…1 |
| schallboegen | fortschritt 0…1, richtung "links"/"rechts" |
| abreisskalender | monat, tag, abriss 0…1 |
| herz | schlag (Schläge/s, 0 = steht) |
| hand | haut (Farbe), greift 0…1 |
| blume | farbe |
| laborschild | text |
| warnlicht | an 0…1, blinken (Hz) |
| funkeln | tempo (Hz), farbe – blinkender Stern, läuft von selbst; nicht nahe an den Bildrand (Safe Area) |
| heringsfass | offen 0…1 (Deckel hebt sich, Heringe schauen heraus), marke true/false (Kaufmannszeichen) |
| kontobuch | fortschritt 0…1 (schreibt Zeile um Zeile, römische Summen) |
| erdhuegel | hoehe 0…1 (wächst), einsturz 0…1 (sackt zusammen, Brocken fliegen) – gross (10–13 m), steht mit `boden: true` am Hang |
| reiter | tempo (Sprünge/s, läuft von selbst), farbe (Pferd), mantel, helm, richtung "links"/"rechts" – Lage gleitet = Galopp |
| kanone | schuss 0…1 (Mündungsblitz und Rückstoss bis 0,35, dann wächst der Rauch), richtung |
| miasma | staerke 0…1 (Gestankwolke, wabert von selbst; 0 = weg) |
| schnabelmaske | fuellung 0…1 (Kräuter, Nelken, Rosenblätter füllen den Schnabel), leer 0…1 (fallen heraus), hintergrund (Farbe der Tafel) |
| ratte | floehe 0…1 (hüpfende Flöhe, laufen von selbst), richtung "rechts"/"links" |
| mikroskop | menge 0…1 (Viren), abwehr 0…1 (weisse Zellen), seed, art "virus"/"bakterie" (Stäbchen) |
| thermometer | stand 0…1 |
| popstern | text ("" = nur Stern), farbe |
| steinblock | farbe, seil (Seillänge als Anteil der Kartenhöhe; Karte 6 m hoch: seil = (CRANE_PULLEY_Y − 0,7 − y) / 6, dann endet das Seil an der Kranrolle) |
| lohnbeutel, buch | keine |
| telefon, boot, anker, fliege, parkbank, skelett, schweisstropfen | keine |
| hoernerhelm | strich 0…1 (Verbotsstrich über dem Opern-Hörnerhelm) |
| helmvergleich | links, rechts, jahrLinks, jahrRechts, haken 0…1 (Haken bei REAL, Kreuz bei OPERA) |
| fundstueck, veksoe | titel, ort / text (Schilder) |
| runen | text (Wort → jüngeres Futhark), fortschritt 0…1 (ritzt ein), lesbar |
| skizzenblock | fortschritt 0…1 (Skizze entsteht), notiz |
| notenblatt | titel, seed – Notenzeichen steigen von selbst auf |
| rabe | richtung "rechts"/"links", tempo, farbe – fliegt mit schlagenden Flügeln (von selbst) |
| groma | sicht 0…1 (Sichtlinie zur Fluchtstange, Haken bei 1), zeit (Lote schwingen), farbe |
| strassenschichten | fortschritt 0…4 (Schichten fallen nacheinander ein), namen "A\|B\|C\|D" |
| meilenstein | wert (zählt hoch, römische Zahl), via, arabisch (Zahl darunter) |
| strassennetz | fortschritt 0…1 (Strassen wachsen von Rom aus), zeit, namen, titel |
| heute-alt-neu | wisch 0…1 (Trennlinie wischt), links, rechts |

Fehlt eine Karte (z. B. Glas zum Anstossen): neu zeichnen in `engine/v01/cards/effects.ts`, Bibliotheks-Eintrag (B-ID) anlegen.
- **Kamera:** `kamera(muster, [x, z], { abstand, blick, push })` – Muster totale/halbnah/nahaufnahme/schulterblick/fahrt-entlang;
  die Kamera steht südlich und schaut nach Norden auf die Häuser; `abstand` 1.6 für zwei Figuren; `push` Standard 0.18.
  Eigene Schlüssel: `{ at, pos, look, fov, roll, move, push, cut }` – `at` in Shot-Sekunden, `move` = Gleitfahrt in Frames.
- **Orte:** `ortPunkt("kai")` → [x, z] für Spuren; `ortKamera("kai", "wide" | "medium")` → Kamera-Schlüssel;
  `ort(name)` liefert `{ at: [x, y, z], wide: {pos, look}, medium: {pos, look}, note }`.

| Ort / Bereich | Koordinaten | Boden |
|---|---|---|
| Strasse (Laborstrasse x −260…−10, „Strasse am Kai“ x −10…90) | z −3.5…3.5 | 0 |
| Gehsteig Nord vor den Häusern | z −6.5…−3.5 (Häuserfront z −6.5) | 0.15 |
| Platz + Kai-Promenade (direkt am Wasser) | x −10…90, z 3.5…12 | 0.15 |
| Fluss / Ufer gegenüber / Brücke (x 45) | z 12…60 / z 60…66 / z 10…62 | −1.2 / 0.15 / 0.45 |
| Park | x 90…140, z −22…11 | 0 |

„Am Kai“ heisst in unseren Videos meist die **Strasse am Kai** (z ≈ −2.8, Häuser im Bild); `ort("kai")` ist dagegen die
Promenade direkt am Wasser (z ≈ 9). Laborhaus: `labX` in `szene` setzen (Standard x −40).
- **Licht:** `light: "day"` oder `"golden"` (Abend, violett-blaue Schatten). Überblendung `fadeIn` (Frames), weisser Blitz `flash`.
- **Text-Ebene** (Datum, Stempel): eigene React-Komponente als `overlay` in `index.tsx` (Beispiel `productions/V0003_…/src-motor/text.tsx`).

## Skript-Formel Kurzformat (aus unseren Videos V0002–V0007)
- 61–80 s, **Schnitte alle 2–3 s**; jeder Rahmenwechsel grösser als eine halbe Bildbreite ist ein **Schnitt = eigener Shot**.
- **Tempo nach dem Reintext:** 2,36 Wörter/s (144–189 Wörter). Shot-Grenzen aus den Zeitmarken des Skripts rechnen, die
  ihrerseits aus der Wortzahl jeder Zeile kommen – das Bild zeigt immer, was gerade gesprochen wird.
- **Langzeit-Hook bei 7–9 s:** eine Frage als eigener Shot (z. B. Figur mit „?“-Blase oder Blick auf das spätere Thema);
  die Auflösung im letzten Drittel sichtbar wieder aufgreifen (gleiche Figur/Karte).
- **Hell, knallig, detailreich (vom ersten Entwurf an):** Licht `day` als Standard (`golden` nur für Abend-Szenen);
  jede Einstellung mit mehreren kräftigen Farben – Figuren in verschiedenen Farben (Bibliothek), bunte Häuser, Markisen,
  Fahnen, Blumenkästen – und mindestens 6 sichtbaren 3D-Objekten, die zum Ort passen (Bäume, Blumentöpfe, Fässer, Säcke,
  Kisten, Karren, Laternen, Stände, Schilder). Leere Wände und einfarbige Flächen über grosse Bildteile vermeiden.
  Messlatte: V0005 v02 (Sättigung ≈ 0,56), aber heller. `pruefung.py` meldet monotone und dunkle Abschnitte,
  `raum.mjs` Shots mit zu wenig Details.
- **Immer ein Blickfang:** jede Einstellung hat etwas Bewegtes, Helles oder Blinkendes – Karte `funkeln` (blinkt von
  selbst), `warnlicht`, `gluehbirne`, `popstern`, Laternen/Fahnen (`world/leben.ts`), gehende Figuren, Schallbögen.
- Erste Sekunde fesselt: Figur ruft mit Blase, Stoss, oder Datum tippt auf Schwarz.
- Muster je Abschnitt: Halbnah → Nahaufnahme (Schnitt) auf die Pointe; Totale nur für Ort/Zeitsprung.
- Zeitsprünge mit Stempel (HOUR 1, DAY 1 …) oder Überblendung; Abend = `golden`.
- Reaktionen 2 Frames vor dem Wort (`LEAD = 2 / FPS`); Blasen höchstens 3 Wörter; Effekt-Karten erklären statt Text.
- Ton: Ereignisse auf Rufe/Aufpralle/Pops, Musik-Stimmung je Abschnitt (`audio/v01/README.md`), −22,6 LUFS, keine Stimme.
  Klänge (für `ereignisse`, `reihen` und `betten` gleichermassen): whoosh, step, creak, clink, pop, impact, sparkle, clack,
  rustle, ring, water, crowd, air, birds, heartbeat, buzz, tick, stamp, beep, gurgle, gasp, typewriter, alarm, glocke, moewe, note,
  drip (tropfen, echo; als Ereignis mit "hall" 0,4–0,6), rush (Bett, staerke), splash (gross 0,3 Hand … 1,5 Sprung),
  fire (Bett, knistern 0–2), sheep (f0: tiefer = grösser), coins (anzahl), winch (klicks pro Sekunde, "dauer").
  Stimmen im Bad: crowd als Ereignis mit "dauer" (Szenenlänge) und "hall" 0,6–0,8 (Betten haben keinen Hall).
  Stimmungen: bouncy, old, light, phone, sparse, full, box, warm, drone, vibes, end, calm, tense, pulse, dark.
  Das Feld `"video"` in der Ton-Datei ist nur eine Beschreibung.

## Langformat (16:9, 1920×1080, YouTube)
Gleicher Stil, gleiche Welten, Figuren, Karten, Rezepte und Werkzeuge – nur das Bild ist quer. Getestet 2026-11-14: alle 11 Rezepte
(Halbnah + Totale), alle Orte aller drei Welten bei Tag und Abend, alle Kamera-Muster, Effekt-Karten, Figurenszene und die
Vorlage komplett (Raum-Prüfung → Bild → Ton → Prüfung) – 0 Funde.
- **Story:** `format: "longform"` oder `langformat(story)` aus `szene.ts` (setzt das Format; ID ohne Angabe `<id>-Lang`).
  Vorlage: `vorlage-video/story-lang.ts` (Composition `Vorlage-Video-Lang`, 15 s: Totale → Halbnah mit Blase → Nahaufnahme) +
  `ton-lang.json`. Alle Befehle (`produziere.mjs`, `raum.mjs`, `pruefung.py`) erkennen das Format selbst.
- **Kameras:** dieselben (`kamera`, `rezeptKamera`, `ortKamera`); der Bildwinkel `fov` ist senkrecht, das Querbild zeigt links
  und rechts mehr Umgebung – darum hat jede Einstellung viel mehr Details (Rezepte 10–49). Totale: `abstand` ≈ 0,8, sonst viel leerer
  Boden unten. Nahaufnahme: das Gesicht füllt die Bildhöhe, hohe Hüte (Zylinder) werden oben knapp – `abstand` 1,2 nehmen.
- **Karten und Blasen NEBEN die Figur**, nicht darüber (das Bild ist niedrig): Glühbirne, Popstern, Blase seitlich auf Kopfhöhe.
  Safe Area Langform: oben 54, unten 108, links/rechts 96 px (Tokens `safeArea.long-form`).
- **Skript und Schnitt:** Länge nach Angabe des Nutzers; Einstellungen 4–8 s (Totale zum Ankommen in jedem Kapitel, dann
  Halbnah/Nah), Sprechtempo und Wortzahl laut Guide, Zeitmarken aus dem Reintext. Erste 15–30 s: Hook + Versprechen, was kommt;
  Kapitel mit Zeitsprung-Stempel oder Überblendung; in jeder Einstellung ein Blickfang (bei langen Einstellungen: gehende Figuren,
  Fahnen, Rauch, Möwen, `funkeln`). Figuren eher zu zweit oder in Gruppen – im Querbild ist Platz.
- **Prüfen:** `node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/rezepte.tsx Rezepte-Lang output/rezepte_lang`;
  Prüf-Storys im Langformat: `Weltbogen-Lang`, `Effektszene-Lang`, `Kamerabogen-Lang`, `Figurenszene-Lang`.
- **Rendern:** 0,13 s pro Bild gemessen (Vorlage 15 s: 59 s) – ein 10-Minuten-Video dauert gut 40 Minuten; darum jedes
  Kapitel einzeln rendern (`produziere.mjs … --kapitel alle`, Schritt 6), Korrekturen nur an betroffenen Kapiteln, zusammenfügen erst nach dem grünen Licht.

## Kapitel-Module (Langformat)
Ein Langform-Video wird aus Kapiteln zusammengesetzt wie eine Szene aus Rezepten. `styles/T0003_cartoon-3d2d/kapitel.ts`:
```ts
import { kapitel, kapitelTon, pruefeFolge } from "../../../styles/T0003_cartoon-3d2d/kapitel";
const k1 = kapitel("hook", { nr: 1, start: 0, titel: "WHY?", takte: [{ ort: "hanse-markt", cast: [...], fx: [...] }, { ort: "hanse-markt", punkt: "rechts", hoehepunkt: true }] });
const ka = kapitel("aufruf", { nr: 1, start: k1.ende, vorher: k1 });   // direkt nach dem hook, ohne Titelkarte, zählt nicht mit
const k2 = kapitel("zeitreise", { nr: 2, start: ka.ende, titel: "500 YEARS", frage: "How did we get here?", takte: [{ ort: "hanse-gasse" }, { ort: "korea-tor" }, { ort: "stadt-strasse" }] });
export const story: Story = { id: "V0009-v01", format: "longform", shots: [k1, ka, k2].flatMap((k) => k.shots) };
pruefeFolge([k1, ka, k2]);        // Hinweise: Beginn hook, danach aufruf, Ende aufloesung + abspann, keine Art doppelt, panorama alle ~2 Kapitel, Längen
kapitelTon([k1, ka, k2]);             // { abschnitte, ereignisse } für die Ton-Datei (Musik-Stimmung je Art, Whoosh, Stoss)
```
- **13 Arten** (Werte aus den Tokens `formats.long-form.kapitelArten`, Tabelle im Guide): hook, aufruf, montage, erklaerung, beispiel,
  zeitreise, vergleich, mythos, zahlen, spannung, panorama, aufloesung, abspann.
- **aufruf** (immer direkt nach dem hook, genau einmal, ohne Titelkarte, Text fest in den Tokens: „Please consider liking and
  subscribing, and sharing your thoughts in the comments. Now, let's begin.“): `kapitel("aufruf", { nr, start, vorher: hook })` –
  braucht keine Takte. Das letzte Bild des hook friert ein (Szene `standbild`: Welt, Figuren, Karten stehen still) und wird in
  10 Frames unscharf; dann ploppt die Aufruf-Leiste auf (Karte `aufruf`, B0099: Daumen-Umriss, SUBSCRIBE!, Glocke), ein Maus-Zeiger
  klickt bei 1,15 / 2,0 / 2,85 s Daumen (blau), SUBSCRIBE (→ SUBSCRIBED) und Glocke (gold, schwingt); bei „comments“ (3,7 s) die
  Sprechblase COMMENT! (`kommentar: false` lässt sie weg). Länge aus dem Text (≈ 6,4 s). Ton: pop, clack, sparkle, ring.
- **Takt** = eine Einstellung: `ort` (Szenen-Rezept), optional `kamera` ("totale" | "halbnah" | "nahaufnahme" | eigene
  Schlüssel), `punkt` (für die Nahaufnahme), `dauer`, `cast`, `fx`, `props`, `light`, `hoehepunkt` (Stoss + Blitz). **Zeiten in
  `cast`/`fx` ab Takt-Beginn** (Start-Schlüssel `at: -10` bleiben).
- **Karten im Bild platzieren:** in `fx` statt Weltlage `bild: [x, y]` (x −1 links … 1 rechts, y −1 unten … 1 oben; Abstand =
  Figur am Rezept-Punkt) und `hoehe` (Anteil der Bildhöhe, z. B. Sprechblase 0,13, Stempel 0,24, Zahl 0,4) – dann bleibt die Karte
  bei jeder Kamera in der Safe Area (gerechnet mit der Kamera am Takt-Ende, also nach dem Kriechen). Gut: |x| ≤ 0,45 bei breiten
  Karten, y −0,5…0,5. `bildPunkt(kamera, x, y, d)` für eigene Fälle.
- **Hell bleiben:** auch spannung, mythos und Nacht-Themen bei Tageslicht (`golden` nur für echte Abend-Szenen) – im Abendlicht fällt
  das Querbild unter die Helligkeits-Schwelle der Prüfung (gemessen 0,19–0,23).
- Das Modul setzt: Titelkarte (Kapitel ≥ 2, Karte `titelkarte` 2–3 s vor der Halbnah-Kamera; sie bleibt bis zum Schnitt stehen,
  der erste Takt blendet über – ein Wegploppen kurz vor dem Schnitt wäre ein Sprung), Überblendungen 12 Frames,
  Einstellungslängen im Bereich der Art (spannung: Aufbau 2–4 s, Höhepunkt 6–8 s), Kamera-Folge der Art, Kriechen 0,08–0,2 %/Frame
  (ruhige Arten langsam), zeitreise mit Überblendung 20 Frames, panorama als weite Fahrt (Musik-Abschnitt mit `"bildpause": true` → audio/v01 stellt ihn 2,5 dB über die Nachbarn), abspann mit Rückfahrt (Gleitfahrt, Abstand × 1,4 – negatives
  `push` kennt der Motor nicht).
- **Ton:** `kapitelTon(kapitel, { bpm })` wiederholt die Akkord-Folge, bis jeder Abschnitt bis zum Kapitelende klingt.
- **Länge eines Kapitels** = Summe der Takte: so viele Takte schreiben, dass die Länge der Art passt (`pruefeFolge` meldet es),
  je Takt die Zeitmarken aus dem Reintext.
- **Karten für Kapitel** (Bibliothek B0095–B0099, `aufruf` setzt das Modul selbst): `titelkarte` (nummer, titel, frage, farbe), `stempel` (text MYTH/FACT),
  `zahl` (wert gleitet bis ziel, titel, einheit, Balken), `geteilt` (links, rechts, mitte "VS"). Karten gross genug machen
  (mit `hoehe`: Zahl 0,4, geteilt 0,3, Erklär-Karte 0,34) und seitlich der Figur stellen.
- **Prüf-Story** `pruefung/kapitel.tsx` (Composition `Kapitel`, 2:50 min, jede Art einmal, alle drei Welten): Vorbild für neue
  Kapitel. Getestet 2026-11-14: Raum-Prüfung 0 Funde, ganzes Video mit Ton produziert.

## Fallen (unbedingt beachten)
Technik-Notizen je Welt (Koordinaten, Sichtlinien-Schutz, Versatz gegen Flackern, Kamera, Stösse, Blickpunkt …) stehen in
`styles/T0003_cartoon-3d2d/technik.md` – vor jedem Video lesen. Hier nur die wichtigsten Fallen beim Schreiben der Story:
- **Passende Figuren, immer Wolken:** Figuren passen zur Epoche der Welt: Stadt = um 1900 (Zylinder, Mützen, Hauben), Hanse = um 1400 (Gugel, Stirnband, Schleier), Korea = Joseon (Gat, Stirnband, Haarknoten, Hanbok), Nord = Wikinger um 900 (Spangenhelm, Nasalhelm, Lederkappe, Zöpfe, Trägerkleid – nie Hörner), Bayreuth = 1876 (Epoche „stadt“, Opernsänger mit Hörner-/Flügelhelm), Rom = frühe Kaiserzeit (Tunika, Galea, Toga, Petasus) – nie Figuren einer anderen Zeit (Ausnahme mit `zeitFrei: true`, z. B. Zeitreise); Mengen (`menge`) wählen das Aussehen selbst nach der Welt; Bibliotheks-Figuren tragen `spec.zeit`. Am Himmel stehen immer Wolken.
- **Nichts ineinander, nichts flackert:** neue Teile nie bündig auf eine andere Fläche setzen (≥ 1 cm Abstand), Sockel und
  Wände von Nachbarhäusern nicht in dieselbe Ebene legen, Fenster nie über eine Tür, Requisiten nicht in Wände oder Stände,
  Figuren-Wege um Hindernisse herum führen und nicht durch andere Figuren. Neue Bausteine melden Fenster und Türen mit
  `b.teil("fenster" | "tuer", grösse, mitte)` – dann findet die Raum-Prüfung Überschneidungen.
- **Schlüssel-Reihenfolge:** Der Start-Schlüssel muss VOR allen Reaktionen liegen (`at: -10` oder `Math.min(t0, …)`), sonst
  überschreibt er sie (Figur lächelt statt zu erschrecken, springt zurück).
- **Boden:** Figuren nicht mit fester Höhe setzen – die Szene stellt sie auf Strasse (0), Gehsteig (0,15) oder Brücke (0,45).
  Bereiche siehe Tabelle „Orte“.
- **Schieben (`push`)** nicht bei fernem Blickpunkt (> 15 m; dort lieber Zoom: zweiter Schlüssel mit kleinerem `fov`) und wenig
  (≤ 0.1) bei Nahaufnahmen – sonst fährt die Kamera durch bzw. das Gesicht füllt das Bild.
- **Sitzen:** Bank als Requisit (Massstab 0.85, automatisch), Figur an der Sitzkante (z = Bank-z + 0.2) mit `groundY: 0.18`.
- **Safe Area:** Kurzformat oben/unten 320 px, links 80, rechts 180; Langformat oben 54, unten 108, links/rechts 96 – Blasen und
  Karten hinein; die Prüfung meldet Verstösse.
- **Bytegleich:** nie `visible = false` für später erscheinende Dinge, Leinwände nur über den Motor (`Card`).
- Ich (Claude) kann nicht hören: Ton nur über `audio/v01/vergleich.py` und den Nutzer beurteilen.

## Was dieser Skill NICHT tut
Keine fremden Bilder/Videos/Musik und kein fremder Code (Prüfung: `python tools/lizenz/fremd_pruefung.py`). Neue wiederverwendbare Figuren/Karten → Bibliothek (B-ID im Register, `python tools/bibliothek/build_bibliothek.py`).
