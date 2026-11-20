# T0004 quadratic-3d – Technik-Notizen und Fallen

Herkunft: eigen (V-Video). Nur dieser Stil. Allgemeine Notizen (gelten für alle Stile) stehen in `docs/projektstand.md`.
Jede Notiz: was passiert · warum · was man tut.

## Formate
- Raute nur mit 45° zu den Kartenachsen und dem Blickwinkel von Bild 1 (31°, fov 18°): `rautenKamera()` / `raute()` in
  `kamera.ts`. Andere Winkel machen aus der Raute ein schiefes Viereck.
- Hochformat 9:16: Die Karte füllt die Bildbreite, die Kamera steht ~250 m weit weg (Querformat ~83 m). Darum wächst der
  Nebel mit dem Abstand (`quadStyle(look, abstand)` – `quadratic()` macht das selbst), sonst versinkt die Karte im Grau.
- Hohe Orte (Häuser, Kolosseum, Berg): `Ort.oben` richtig setzen – `rautenKamera` macht die Bildhöhe dann gross genug und
  hält den Void über und unter der Karte gleich (mittig).
- Wortfolge (`worte.tsx`): Lage in der Safe Area der Tokens; im Hochformat unter der Karte, im Querformat im unteren Drittel,
  Kapiteltitel oben. Text bleibt Englisch.

## Look
- Licht: eigenes Stufen-Material (`material.ts`) ersetzt das Zwei-Ton-Material des Motors in jeder Welt (`stufen()`).
  Sonne immer vorne rechts oben (az 165°, 50°): beide Seiten zur Kamera im Licht, abgestuft nach Einfallswinkel. Ein Shot-Wechsel
  mit anderer Lichtstimmung würde das Stufen-Material nicht umstellen – der Stil hat nur die Stimmung `kalt`.
- Grau und kalt ist gewollt: `pruefung.py` nimmt für diesen Stil eigene Farb-Schwellen (`look.pruefung.stile.quadratic-3d`,
  erkennt den Stil am Style-Namen im Zeitplan). Ein Bild nur aus grauem Void wird weiter als „monoton“ gemeldet.
- Keine Text-Tafeln im Bild (Nutzer: „hässlich“); Betonung nur mit roten Wörtern in der Wortfolge.

## Welt / Orte
- **Flackern bei grossem Abstand:** Die Bühne setzt die vordere Schnittebene auf 0,1 m; bei 80–250 m Abstand reicht die
  Tiefen-Genauigkeit dann nur auf Zentimeter (Schneekappe ↔ Baumstufe flackerten im Hochformat). `schaerfeTiefe()` in
  `welt.ts` setzt sie im Welt-Tick auf 30 % des Abstands zum Boden. Die Effekte (Tusche, Tiefenschärfe) übernehmen die neue
  Ebene nicht (postprocessing liest sie nur beim Aufbau) – die Kanten sind dadurch etwas gleichmässiger dick; so ist der
  abgenommene Look. Der Motor kann es inzwischen sauber (`Style.tiefe = { nearBoden: 0.3 }`, Effekte übernehmen near/far je
  Bild) – das ändert aber die Tusche (mehr Linien an kleinen Steinen, schwächere Baum-Konturen): nur zusammen mit einer neuen
  Tusche-Abstimmung und nach Freigabe des Nutzers umstellen. Nichts näher als 30 % des Abstands vor die Kamera stellen.
- Flächen nie deckungsgleich bauen: Nachbar-Teile mit Millimeter-Versatz (Kolosseum-Stücke 6 mm, Steine/Wurzeln in den
  Kartenseiten je 3–4 mm), Gesims 1 cm über dem Sturz, Bootsenden nicht auf Kachelgrenzen.
- Belegung (`Belegung` in `welt.ts`): jede 1-m-Zelle trägt höchstens ein Objekt; `wegeFrei()` VOR allen zufälligen Objekten
  aufrufen, sonst stehen Bäume auf den Figuren-Wegen. Möbel/Häuser mit `bel.nimm` belegen – sie prüfen nicht selbst.
- Zwei Figuren nie auf demselben Weg gegenläufig (laufen durcheinander) – zweiten Weg parallel daneben legen.
- Dorf-Karte (Bild 1): Bäume können eine Figur in nahen Einstellungen verdecken (nicht nach der Belegung gebaut, damit Bild 1
  gleich bleibt). Für `nah`/`folgen` andere Orte nehmen (Amsterdam, Berg, Hotel, Kolosseum).
- Kartenkörper (Seiten-Schichten, hängende Blöcke) ist für alle Grössen gleich tief – bei kleinen Karten (Hotel 14 m) wirkt
  er schwerer.
- Neue Orte: `orte/<name>.ts` (Typ `Ort`), in `orte/index.ts` eintragen; Farben nur aus `color.quadratic-3d.orte` (Tokens).

## Platten, Bürger-Sicht, Aufruf
- Platten: Kante 24 m → nebeneinander bei `pos` ±12,5 m (1 m Spalt, Void dazwischen). Eine einzelne Platte ohne `pos`/`ab`
  baut wie bisher (Bild 1 bleibt gleich); sonst `plattenWelt`. Kamera je Plattenzahl (ungerade Raute 45°, gerade 0°): die
  Fahrt beginnt mit den Funken und dauert `platten.kameraSec`; beim Drehen geht die Kamera kurz etwas näher (Sehne, ~8 %).
- Eine angefügte Platte steht bis zu ihren Funken mit Grösse fast null (nicht unsichtbar) – Regel „bytegleich“.
- Bürger-Sicht (Erfahrung V0009): ein Kamera-Schlüssel je Bild (`move: 1`), Lage der Figur geglättet (0,12 je Bild), Drehung
  höchstens 45°/s; 9 m hinter, 14 m über der Figur, Blick 3 m vor ihr – näher stockte es und Baumkronen verdeckten die Figur.
  Kehrt die Figur im Fenster um (Weg hin und zurück), würde die Kamera um 180° drehen: der Bau bricht mit Meldung ab.
- Zoom (Erfahrung V0009): `ziel` = eine Fahrt über den ganzen Takt, Ziel am Ende in der Bildmitte, 25–40 % näher. Ohne `ziel`
  wird das Schieben je Halt auf 8 % gedeckelt (`deckeln`) – vorher fuhren lange Einstellungen bis zur halben Entfernung zur
  Kartenmitte.
- Fensterlicht: nutzt die mit `Batch.teil("fenster", …)` gemeldeten Fenster – eigene Orte müssen ihre Fenster so melden.
- Figuren verschwinden (`welle`) über Grösse fast null, nie `visible = false` (bytegleich).
- Aufruf: friert über `shot.data.zeitFest` die ganze Welt ein (Figuren, Partikel, Funken) und nimmt die letzte Kamera-Pose des
  hook (`cameraAt`, inkl. Stoss). Die Unschärfe ist CSS (`backdrop-filter`) auf der 2D-Ebene.

## Ton
- Eigener Ton (`ton/ton.py`): Streicher-Musik + eigene Klänge (`t4:…`), Betten und übrige Geräusche über audio/v01. Der Motor
  nimmt ihn mit `--ton-skript styles/T0004_quadratic-3d/ton/ton.py` (`ton/produziere.mjs` setzt das selbst). Langform:
  `--kapitel alle` rendert je Kapitel eine Datei; der Ton wird einmal fürs ganze Video gemischt und je Kapitel ausgeschnitten.
  `zusammenfuegen.mjs` bricht ab, wenn Kapitel mit verschiedenem Motor-Stand gerendert wurden – das gilt auch, wenn sich
  dazwischen `styles/` oder die Tokens geändert haben: dann die genannten Kapitel neu rendern. Am Stil also nichts ändern,
  solange ein Video kapitelweise entsteht. Im aufruf meldet `pruefung.py` das Standbild nur als Hinweis.
- Rechenzeit: ~1,2 s Rechnen je Sekunde Ton (lange Streicher-Töne mit Hall) – bei 10 min Langform ~12 min.
- Teil-Render (`teilrender.mjs`) übernimmt den Ton der Basis: ändern sich Wörter oder Klänge, den neuen Ton mit `--ton <mix.wav>`
  dazulegen, sonst laufen Bild und Klang auseinander.
- Ton-Datei immer aus der Story erzeugen (`vorlage-video/ton.mjs`), nie von Hand – sonst laufen Wörter und Klänge auseinander.

## Rendern und Prüfen
- Raum-Prüfung: Würfel-Köpfe zählen als sichtbar, wenn der Strahl die eigene Figur trifft. Details zählt sie bis 60 m bzw.
  1,5 × Kamera-Abstand; genauer würde es mit `group.userData.objekte = [{art, min, max}]` aus der Belegung (noch nicht gebaut).
- Flackern prüfen: drei Folgebilder rendern und Pixel zählen, die hin und her springen (Vergleich: Dorf ~1 400, Rest sind
  Partikel und Figuren).
