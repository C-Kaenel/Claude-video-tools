# Motor v01

Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage. Planungsgrundlage für eine spätere Version: `_archive/engine_spezifikation_v01.md`.
Teile: Kern, Welt, Figuren, Effekt-Karten, Prüf-Werkzeuge; Ton: `audio/v01/`; Skill: K0002 `.claude/skills/cartoon-3d2d/`.
Bibliothek wiederverwendbarer Einträge: `library/` (B-IDs).
Erster Stil auf diesem Motor: `styles/T0003_cartoon-3d2d/`.
Tools darunter: Remotion, React, three.js, @react-three/fiber, `postprocessing` (nur als Gerüst der Effekt-Kette).

## Aufbau

| Ordner / Datei | Aufgabe |
|---|---|
| `index.ts` | öffentliche Schnittstelle – Videos und Stile importieren nur von hier |
| `core/format.ts` | Formate (Kurzform 1080×1920, Langform 1920×1080, 30 fps), Pixel-Massstab |
| `core/timeline.ts` | Story als Daten (Shots), Zeitleiste, Überblendung, Blitz |
| `core/random.ts` | Zufall mit festem Startwert (nie `Math.random`) |
| `core/fonts.ts`, `core/gate.ts` | freie Schriften aus `assets/fonts/` (`FONT.display` Archivo Black, `serif` Lora, `script` Caveat, `sans` Inter 100–900), Lade-Sperre |
| `core/style.ts` | was ein Stil liefern muss (Licht, Farbkorrektur, PUNCH, Effekt-Werte) |
| `core/Video.tsx` | ein Video: Shots, Überblendung, Blitz, Text-Ebene, Safe-Area-Linien; `motorCompositions()` |
| `core/Stage.tsx` | Bühne eines Shots: baut die Welt, zeichnet jedes Frame selbst (Kamera, Sonne, Sichtlinien, Effekte) |
| `camera/rig.ts` | Kamera aus Schlüsseln: Gleitfahrt, Schnitt, Schieben im Halt, Stoss, Rollen |
| `camera/ease.ts` | weiche Kurven |
| `camera/occlusion.ts` | Sichtlinien-Schutz, einmal pro Shot geplant |
| `light/presets.ts`, `sky.ts`, `twotone.ts` | Lichtstimmung, Himmel nach Höhe, Zwei-Ton-Material der Welt |
| `post/ink.ts` | Welt-Tusche (Umrisse + Knicke, Breite nach Entfernung, ohne Karten/Figuren) |
| `post/dof.ts` | Tiefenschärfe |
| `post/bloom.ts` | Leuchten heller Stellen |
| `post/finish.ts` | Tonemapping (neutral) + Farbkorrektur + PUNCH |
| `post/chain.ts` | Reihenfolge der Effekte; `kameraTiefe(cam)` übernimmt near/far in die Effekte (nur mit `tiefe`) |
| `qa/stills.mjs`, `qa/same.mjs`, `qa/env.mjs` | Testbilder, Bytegleich-Prüfung, Einstellungen |
| `world/paint.ts` | gemalte Texturen im Code: Pflaster, Platten, Backstein, Putz, Quader, Bretter, Ziegel, Gras, Glas, Läden, Wellen, Streifen; Korea: Bruchstein, Stampflehm, Giwa-Dachziegel, Stroh, Fels |
| `world/kit.ts` | Werkbank: Materialien je Farbe, `Batch` (viele Teile → ein Netz je Material; `teil()` meldet Fenster/Türen für die Raum-Prüfung), Texturen in Metern, Rundbogen |
| `world/house.ts` | Haus aus Bausteinen (Breite, 2–4 Stockwerke, Putz/Backstein, Fenster, Läden, Tür, Dach, Kamin, Schildhalter) |
| `world/ground.ts` | Böden, Strasse mit Gehweg und Randstein, Kaimauer |
| `world/water.ts`, `bridge.ts` | Fluss (Verlauf nah→fern, Wellen, Glanz), Hängebrücke |
| `world/nature.ts`, `props.ts` | Bäume, Büsche, Blumen, Wolken; Bank, Laterne, Kisten, Boot, Marktstand, Blumentopf; je Epoche: Handkarren, Ziehbrunnen, Obstkörbe, Onggi, Hühner, Holzstapel (Farben `world.requisiten`) |
| `world/palette.ts`, `town.ts` | Farbschema (vom Stil); die Stadt mit benannten Orten `PLACES` |
| `world/festung.ts` | Korea-Welt: Gelände (`koreaHeight`), Mauern entlang Pfaden (`fortWall`: rubble/earth-rubble/stone/blocks/hwaseong, Ruine), geschwungenes Dach (`roofGeo`), Tor mit Holzhalle, Hanok, Palasthalle (`hall`), Speicher (`granary`), Holz-Wachturm (`watchtower`), Kanonenturm, Kran (Mittelrolle `CRANE_PULLEY_Y`), Kiefer; `korea()` mit Orten `KOREA_PLACES`, Mauerpfaden `KOREA_WALLS`, Varianten hanyang alt/neu und hwaseong bau/ganz/ruine; `groundAt` liefert auf Mauern die Kronenhöhe |
| `world/leben.ts` | Bewegte Teile (`{ obj, tick }`, Bewegung nur aus der Shot-Zeit): `fahne` (weht), `fackel` (flackert), `rauchsaeule` (Feuer + Rauch, optional Signalfeuer-Ofen), `laternenkette` (Lauflicht), `voegel` (Schwarm, `farbe` z. B. weiss für Möwen) |
| `world/hanse.ts` | Hanse-Welt (Hafen um 1400): buntes Giebelhaus (`giebelhaus`, Zufall `giebelZufall`: Backstein/Putz/Fachwerk, Treppen-/Spitzgiebel, Läden, Blumenkästen, Schilder, Markisen, Bänke, Kamine, helle Blendnischen, Ladeluken zu/offen mit Ware, Windenbalken, leuchtende Fenster am Abend), Kirche mit zwei Türmen und Glocke im Glockenstuhl, Hafenturm, Bäume, Kogge (`kogge`: Rumpf, Kastelle, Rahsegel voll/gerefft, Piratenschiff schwarz, Wimpel), Tretradkran (Rad dreht, Last am Seil), Ware (`ware`: Fässer, Säcke, Tuchballen), Holzkai, Marktplatz; `hanse()` mit Orten `HANSE_PLACES`, Optionen `HanseOptions` (Luken, Aufzug, Glocke, Kranlast, fahrende Koggen; Zeiten in Film-Sekunden); Boden `hanseGroundAt` |
| `cards/draw.ts` | Zeichen-Werkzeug `Pen`: Ellipse, Vieleck (weich), Strich, Punkt, Rechteck, Text (passt in Breite), Ausschneiden, Schattenseite, Drehen |
| `cards/card.ts` | `Card`: gezeichnete Fläche in der Welt (zur Kamera, flach oder fest), Licht-Tönung, Nebel, ohne Welt-Tusche; Kontaktschatten |
| `cards/face.ts` | 17 Ausdrücke (zuletzt angry: wütend, Zornesader) aus Augen-, Brauen- und Mundformen; Blick, Seitenansicht, Blinzeln |
| `cards/pose.ts` | 12 Haltungen: stand, walk, march, sit, fall, wave, point, raise, hold, shout, tilt, lean |
| `cards/figure.ts` | Karten-Figur (Bauweise Erwachsen/Kind/kräftig, Kleidung, Haare inkl. Haarknoten, 12 Hüte inkl. Eisenhelm/Gat/Stirnband, Mittelalter: Gugel, Schleier mit Kinntuch, Eisenhut der Stadtwache, Pestarzt: Krempe; Schnabelmaske `maske` statt Gesicht, Stock `stab`, Uniform-Teile `umhang`, `handschuhe`, `saum`, `schnalle`; Bart, Schal, Gürtel, Schärpe) |
| `cards/effects.ts` | 34 Effekt-Karten (Erdhügel, Reiter, Kanone, Miasma, Schnabelmaske im Schnitt, Ratte mit Flöhen, Funkeln, Heringsfass, Kontobuch, Steinblock, Lohnbeutel, Baubuch, Sprechblase, Ladenschild, Zeitung, Brief, Telefon, Glühbirne, Schallbögen, Boot, Anker, Abreisskalender, Herz, Fliege, Parkbank, Hand, Skelett, Blume, Laborschild, Warnlicht, Mikroskop (Viren oder Bakterien), Thermometer, Schweisstropfen, Pop-Stern) |
| `cards/effect-actor.ts` | Effekt-Karte mit Spur: Aufploppen mit Überschwingen, Verschwinden, schwanken/pulsieren/wippen, Angaben gleiten |
| `camera/patterns.ts` | Kamera-Muster → Kamera-Schlüssel (`cameraFromPattern`); Werte in `library/kameras/` |
| `cards/actor.ts` | Darsteller mit Spur (Daten): Lage, Haltung, Ausdruck, Hautwechsel; Gehen ohne Rutschen; Blinzeln; Menge |
| `qa/pruefung.py` | Bild-für-Bild-Prüfung: schwarz, weiss (ungeplant), eingefroren, Sprung im Shot, Safe Area, Farbe (monoton/dunkel, Schwellen je Stil); Ton: Lautheit, Spitze, Länge, Stille; Bericht + Kontaktbogen |
| `qa/raum.mjs` + `qa/raum.ts` | Raum-Prüfung je Shot (Eingabe `qa: "raum"`): flackernde deckungsgleiche Flächen, Fenster in Türen (Teile aus `Batch.teil()`), Objekte ineinander, Gesichter am Bildrand/verdeckt, Figuren durch Objekte/durcheinander – nur Sichtbares; zählt 3D-Details (auch `userData.objekte` zusammengefasster Welten); Bericht + Prüfbild mit roten Punkten |
| `qa/zeitplan.mjs` | schreibt den Zeitplan eines Motor-Videos (Schnitte, Überblendungen, Blitze, Stösse; Langform: Kapitel mit Art) als JSON |
| `qa/fehler_einbauen.py`, `qa/selbsttest.py` | baut absichtlich Fehler ein; Selbsttest der Bild-Prüfung |
| `qa/selbsttest_kapitel.py` | Selbsttest der Langform-Kapitel: Zeitplan (Prüf-Story `TestszeneKapitel`), Skript-Generator, Kapitel-Prüfung, Musik-Bildpause |
| `qa/selbsttest_raum.mjs` + `qa/raumtest/` | Selbsttest der Raum-Prüfung: Prüf-Story RaumTest, je Shot genau ein eingebauter Fehler, ein sauberer Shot |
| `qa/bogen.py` | Vergleichsbogen eigene Bilder ↔ Referenz-Frames mit Messwerten |
| `render/produziere.mjs` | Ein Befehl für ein ganzes Video: Raum-Prüfung → Bild → Ton → Mischung → Prüfung, einmal gebündelt (BUNDLE_URL für die Werkzeuge), 4 Tabs; Logs in `output/<ID>/logs/`, Konsole nur Zusammenfassung; `--ton-skript <py>` (eigener Ton eines Stils); Langform `--kapitel alle|1,3`: je Kapitel Raum-Prüfung → Bild (nur sein Bildbereich) → Ton-Ausschnitt → Prüfung (`--teil`) → `output/<ID>/kapitel/NN_<art>.mp4`, Stand in `kapitel/stand.md`, Ton einmal fürs Ganze |
| `render/zusammenfuegen.mjs` | Langform nach dem grünen Licht: Kapitel prüfen (alle da, Grenzen, Bildzahl, Prüfung OK, gleicher Motor-Stand), Bilder ohne neue Kompression aneinanderhängen (Bild-für-Bild-Kontrolle), ein Ton fürs Ganze (−22,6 LUFS), Prüfung des Ganzen → finale Fassung |
| `qa/uebersicht.py` | Übersichtsbogen: alle Prüfbilder der Raum-Prüfung auf einem Bild (Shots mit Funden rot) |
| `qa/runde.py` | Runden-Bild der Bild-Schleife (Skill K0003): 2–8 Testbilder nebeneinander, nummeriert 1, 2, 3 …, Hoch-/Querformat gemischt; nächste freie `runde_NN.png` |
| `render/teilrender.mjs` | Teil-Render: Kopie eines fertigen Videos als neue Version, darin nur geänderte Shots neu (ganze Bildgruppen, Rest ohne neue Kompression übernommen); Sicherung (Motor-Stempel, sonst Stichproben) und Bild-für-Bild-Kontrolle |
| `render/stempel.mjs` | Motor-Stempel: Prüfsumme je Teil (Kern, Kamera, Licht, Effekte, Welt, Karten, Stile, Bibliothek, Tokens, Pakete) im Kommentar-Feld der MP4; `node render/stempel.mjs <video.mp4>` sagt, ob ein Teil-Render sicher ist |
| `examples/testszene/` | 10-s-Testszene (9:16 und 16:9) zum Prüfen des Kerns |

## Ein Video beschreiben (Daten)

```ts
const story: Story = { id: "V0004", format: "shortform", shots: [
  { id: "hook", seconds: 3, light: "day",
    camera: [{ at: 0, pos: [-9, 3, 14], look: [0, 1.7, 0] }, { at: 1, pos: [-4, 2.4, 9], look: [0, 1.8, 0], move: 30 }] },
  { id: "abend", seconds: 3.5, light: "golden", flash: 4, kicks: [{ at: 1 }], focus: { strength: 13 } },
]};
registerRoot(motorCompositions([{ story, style, build }]));
```
Kamera-Schlüssel: `at` (s), `pos`, `look`, `fov`, `roll`, `move` (Frames), `cut`, `push` (% pro Frame).
Shot: `seconds`, `light`, `camera`, `kicks`, `focus`, `fadeIn` (Frames), `flash` (Frames), `sun`, `data`, `kapitel`, `tiefe`.
Kamera-Tiefe `tiefe: { near, far, nearBoden, nearMax }` am Stil (`Style.tiefe`) oder Shot (überschreibt feldweise); ohne Angabe
near 0,1 / far 1200 (bytegleich wie immer). `nearBoden: 0.3` = near 30 % der Strecke Kamera → Boden (höchstens `nearMax`, Standard
60 m) – für Vogelperspektiven aus 80–250 m. Mit `tiefe` übernehmen Tusche und Tiefenschärfe near/far jedes Frame (auch ein near
aus dem Welt-Tick); das ändert die Tusche-Linien, Tusche-Werte des Stils danach prüfen.
Langform: `kapitel: { art: "hook", titel: "The Question" }` am ersten Shot eines Kapitels (Art aus
`shared/design-tokens.json` → `formats.long-form.kapitelArten`); gilt bis zum nächsten Shot mit `kapitel`. Ändert nichts am
Bild – der Zeitplan bekommt daraus `kapitel: [{art, titel, start, end, shots}]` für die Prüfung.
Die Welt baut eine Funktion `build({ scene, shot, style, fps })`, die optional eine Bewegungs-Funktion pro Frame zurückgibt.
Objekte, die Kameras im Weg stehen dürfen, bekommen `userData.occluder = true`; Story-Requisiten `userData.protect = true`;
zusammengefasste Welten (ein Netz je Material) melden ihre Objekte für die Details-Zählung als `userData.objekte = [{art, min, max}]`
(Gruppen-Koordinaten, wie `teile`);
Karten und Figuren liegen auf der Ebene `NOINK`.

## Befehle (aus dem Hauptordner)

```bash
# Testbilder (Massstab 0.5); Hilfslinien: PROPS='{"guides":true}'; Effekt aus: PROPS='{"post":{"ink":false}}'
node engine/v01/qa/stills.mjs engine/v01/examples/testszene/index.tsx Testszene output/x_ 0,90,200 0.5
# ganzes Video
npx remotion render engine/v01/examples/testszene/index.tsx Testszene output/test.mp4 --codec h264 --crf 16
# bytegleich?
node engine/v01/qa/same.mjs output/a.mp4 output/b.mp4
# nur geänderte Shots neu, in einer Kopie (neue Version)
node engine/v01/render/teilrender.mjs <einstieg.tsx> <ID> <basis_v01.mp4> output/<…>_v02.mp4 --shots <shot-id,shot-id>
# ausgeblendete Hindernisse je Shot anzeigen: PROPS='{"debug":true}'
# Vergleichsbogen (Anleitung im Kopf von qa/bogen.py)
python engine/v01/qa/bogen.py output/bogen.png output/messung.json --gruppe Tag --ref <video.mp4> 180,360 --unsere output/a_15.png,output/a_45.png
```

## Welt-Baukasten
Die Bausteine kennen nur Formen; die Farben kommen als `WorldPalette` vom Stil.
```ts
const kit = new Kit(style.lights[shot.light], 1);        // Materialien + Zufall mit festem Startwert
const t = town(kit, LOOKS[shot.light], 1);               // ganze Stadt mit Orten
scene.add(t.root);
house(kit, palette, { width: 8, floors: 3, wall: "brick", color: "#a0604f", shutters: "#2f6d78", door: { column: 1, color: "#8a4a24" } });
```
Orte (`PLACES`): laborstrasse, gasse, platz, kai, brueckenkopf, park, flussufer – je mit Mittelpunkt und zwei
Kamera-Vorschlägen (`wide`, `medium`). Viele kleine Teile werden je Material zusammengefügt (schnell). Häuser und Bäume
sind Sichtlinien-Hindernisse; Bank, Boot, Stand sind geschützte Requisiten.

## Figuren
```ts
const a = new Actor(spec, [
  { at: 0, pos: [-46, 0.6], side: 1 },            // steht links, schaut nach rechts
  { at: 3.5, pos: [-36, 0.6], expr: "smile" },    // geht hin (Gehen automatisch), lächelt
  { at: 4, pose: "wave", skin: "#a9cf86", skinFade: 2 },  // winkt, wird in 2 s grün
], colors, { tint, seed: 3, groundY: 0 });
scene.add(a.root);   // pro Frame: a.update(time, fps, camera)
```
Haltung spiegeln: `spiegeln: true` in der Spur (linker statt rechter Arm).
Figuren sind Karten auf der Ebene NOINK (eigene Kontur, keine Welt-Tusche) und geschützt vor dem Sichtlinien-Schutz.
Die Leinwand wird nur neu gezeichnet, wenn sich der Zustand ändert.

## Effekt-Karten
```ts
const blase = new EffectActor("sprechblase", 0.95, [
  { at: 0.6, show: true, pos: [-41.3, 2.3, -1.4], params: { text: "HELLO!", art: "ruf", schwanz: "rechts" }, motion: "sway" },
  { at: 2.4, show: false },
], colors, { unlit: true });
scene.add(blase.root);   // pro Frame: blase.update(time, camera)
```
Zahlen-Angaben gleiten zwischen zwei Schlüsseln (z. B. `{ stand: 0.2 }` → `{ stand: 0.95 }`), Texte wechseln hart.

## Regeln für bytegleiche Bilder
- Leinwände immer mit `getContext("2d", { willReadFrequently: true })` – sonst zeichnet Chrome manche auf der Grafikkarte,
  und Kanten weichen je Render-Tab um 1/255 ab.
- Objekte nie per `visible = false` ein- und ausblenden, die erst später erscheinen – stattdessen Grösse fast null.
- Leinwand nur neu zeichnen, wenn sich ihr Inhalt ändert (Zeit nur an Karten, die sich selbst bewegen).

## Formate
Alle Prüf- und Render-Werkzeuge erkennen Kurzform (Hochformat 9:16) und Langform (Querformat 16:9) selbst: `pruefung.py`
(Safe Area je Format aus den Tokens, andere Grössen im Verhältnis zu 1080), `raum.mjs`/`uebersicht.py`, `teilrender.mjs`,
`bogen.py`, `tools/measure/measure_video.py`, Hilfslinien `PROPS='{"guides":true}'` und der Skript-Generator (Sprechtempo).

## Prüfung eines fertigen Videos
```bash
node engine/v01/qa/zeitplan.mjs <einstieg.tsx> <Composition> output/z.json                    # was geplant ist
npx remotion render <einstieg.tsx> <Composition> output/karten.mp4 --props='{"qa":"karten"}' --codec h264 --crf 18   # nur Karten + Text
python engine/v01/qa/pruefung.py video.mp4 output/pruefung --zeitplan output/z.json --karten output/karten.mp4
```
Ergebnis: `bericht.md` (für Menschen), `bericht.json`, `kontaktbogen.png` (1 Bild je Sekunde, Fehler rot).
Ohne Zeitplan werden Schnitte nur erkannt, kurze Blitze nur als Hinweis gemeldet.
Langform mit Kapiteln im Zeitplan: Abschnitt „Kapitel“ im Bericht – Länge je Kapitel gegen `laengeSec`, Einstellungen
(Shots, an Schnitten geteilt) gegen `shotSec` der Kapitel-Art (spannung: erst `aufbau`, dann `hoehepunkt`), alles als
Hinweise; „monoton“ ist im panorama erlaubt (Hinweis statt Fehler).
Farb-Schwellen je Stil: `shared/design-tokens.json` → `look.pruefung.stile.<stil>` (eigene `saettigungMin`, `farbigkeitMin`,
`farbtoeneMin`, `helligkeitMin` oder `"monoton": false` = nur Hinweis). Der Stil kommt aus dem Zeitplan (`stil` = Style-Name; der
längste Schlüssel, der darin vorkommt) oder aus `--stil`; ohne Eintrag gelten die gemeinsamen Schwellen.
Prüf-Ebene `qa: "karten"`: zeigt nur Effekt-Karten und Text auf Schwarz – Figuren, Himmel, Wolken und Kontaktschatten
fehlen absichtlich (Beine dürfen in den unteren Rand). Safe Area aus den Tokens: oben/unten 320 px, links 80, rechts 180.

## Prüfung der Prüfung
Alle Selbsttests zusammen: `npm test` (`tools/test.mjs`; „100 % eigen“, Raum, Bild, Kapitel, Ton bytegleich).

`python engine/v01/qa/selbsttest_kapitel.py` (ca. 20 s) prüft die Langform-Kapitel: Zeitplan von `TestszeneKapitel`
(hook, erklaerung, panorama), Skript-Generator mit einem richtigen und absichtlich falschen Skripten (jeder Fehler wird
gemeldet, nichts geschrieben), Kapitel-Prüfung mit erfundenen Zeitplänen und eine Musik-Bildpause (+2,5 dB über den Nachbarn).

`node engine/v01/qa/selbsttest_raum.mjs` lässt die Raum-Prüfung über die Prüf-Story `qa/raumtest/` laufen, im Hochformat
(`RaumTest`) und im Querformat (`RaumTestQuer`): jeder eingebaute Fehler (flackern, Fenster in Tür, steckt in, läuft durch,
durcheinander, Gesicht am Rand, Kopf verdeckt, Epoche) muss gefunden werden; „sauber“, „baeume“ (zwei Laubbäume, deren Kronen
ineinander wachsen – erlaubt) und „wuerfelkopf“ (Klotz-Figur, Würfel-Kopf nicht verdeckt) bleiben ohne Fund; „vogel“ (zusammengefasste
Welt mit `userData.objekte`, Kamera 120 m weg) muss genug Details zählen. Prüfbilder: `output/selbsttest_raum/hoch|quer/uebersicht.png`.

`python engine/v01/qa/selbsttest.py` läuft im Hoch- und Querformat (Testszene/TestszeneRand bzw. TestszeneQuer/TestszeneRandQuer),
prüft die Format-Erkennung (mit und ohne Zeitplan, Widerspruch Zeitplan ↔ Bildgrösse) und rendert die Testszene, baut Fehler ein (schwarz, weiss, eingefroren, Sprung, Safe Area,
Ton zu laut/still/zu kurz) und kontrolliert, dass `pruefung.py` alle findet und im sauberen Video keinen Fehlalarm gibt.
Die Testszene ist absichtlich grau: die Farb-Prüfung muss sie als monoton melden. Dazu prüft er die Farb-Schwellen je Stil (ohne Render). Bekannte Regeln: geplante Blitze sind Hinweise,
schwarze Titelbilder mit Schrift sind kein Fehler.
