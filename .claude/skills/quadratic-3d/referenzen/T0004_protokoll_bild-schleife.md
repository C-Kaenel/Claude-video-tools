# T0004 quadratic-3d – Protokoll der Bild-Schleife

Modus: O ohne Referenzen (Beschreibung des Nutzers) · Szenarien Stufe 2 (vom Nutzer): Hotelzimmer (9:16) · Strasse in Amsterdam (16:9) · Römisches Kolosseum (16:9) · Berghütte in den Bergen (9:16) · verschneiter Wald (16:9); 2 im Kurzformat 9:16, weil Stufe 1 schon im Langformat 16:9 läuft

Look in Worten (Nutzer, 2026-11-14): Vogelperspektive von oben, alles quadratisch/rechteckig in 3D, Figuren sehr
herausgezoomt; grauer Void (dunkel- bis hellgrau) mit schwebenden helleren Partikeln; immer eine rautenförmige Karte mit
Figur(en) darin, auch mehrere; selten Zoom in eine Figur; sehr kalter Stil, auch der Ton kalt. Hauptformat: Langform.
Stufe 1 deshalb im Querformat 16:9 (Wunsch des Nutzers geht vor). Die 5 Szenarien für Stufe 2 gibt der Nutzer vor.

| Runde | Stufe | Datum | Gezeigt | Wahl des Nutzers | Wunsch des Nutzers | Geändert (Werte) |
|---|---|---|---|---|---|---|
| 01 | 1 | 2026-11-14 | 5 Varianten: 1 isometrisch · 2 steil mit Raster, 3 Figuren · 3 dünne Kanten, Void oben hell · 4 Archipel, dunkler Void · 5 Frost, Figur Cyan | 3 | mehr Details, etwas näher | – |
| 02 | 1 | 2026-11-14 | 5 Varianten von 3: 1 Wunsch (Detail 1, näher) · 2 noch näher · 3 viele Details (Brunnen, Karren, Bank, Nadelbäume) · 4 kräftigere Kanten · 5 flacher (30°) + viele Details + nah | 2 und 5 | mischen, mittiger (Void oben = unten) | Detail-Stufen (Laternen, Feld, Kamine, Kisten, Büschel, Steine in den Seiten), Zoom `rand` −0,2 … −0,5 |
| 03 | 1 | 2026-11-14 | 5 Mischungen aus 2 + 5 (viele Details), alle mittig: 1 Wunsch (32°, nah) · 2 flacher 30° · 3 steiler 34° · 4 etwas mehr Void · 5 ganz nah | 2 | ca. 5 % näher | Kamera `mittig` (Void über/unter der Karte gleich, gemessen ±4 px), Detail 2 |
| 04 | 1 | 2026-11-14 | 5 Varianten von 2: 1 Wunsch 5 % näher · 2 3 % · 3 7 % · 4 5 % + 29° · 5 5 % + 31° | 5 = **Bild 1** | nichts mehr zu verbessern („alle gut, 5 am besten“) | `rand` −0,62 (Bildbreite × 0,95) |
| 05 | 2 | 2026-11-14 | 5 Orte mit Bild-1-Look (`pruefung/referenzen.tsx` Ref-02 … Ref-06): Hotel · Amsterdam · Kolosseum · Berghütte · Schneewald | alle | Sonne immer von vorne rechts oben | Orte in `orte/`; Nebel wächst mit dem Kamera-Abstand (Hochformat), Bildhöhe passt sich hohen Orten an |
| 06 | 2 | 2026-11-14 | alle 6 (auch Bild 1) mit neuer Sonne | **alle 6 gut** | – | Look-Wert auf Wunsch geändert: Sonne az 165°, 50° hoch; neues Stufen-Licht `material.ts` (stufe 0,4: Deckel hell, rechts mittel, links dunkler, alle im Licht); Schatten fallen nach hinten |

## Bild 1 – feste Werte (Runde 4 Bild 5, abgenommen 2026-11-14)
Quelle der Wahrheit: `shared/design-tokens.json` → `color|line|motion|lens|grade` → `quadratic-3d`; im Code `REFERENZ` in
`styles/T0004_quadratic-3d/look.ts`, Bild `T0004_ref_01.png` (1920×1080, Frame 60, Composition `Ref-01` in `pruefung/referenzen.tsx`).

| Bereich | Wert |
|---|---|
| Format | Langform 16:9, 1920×1080, 30 fps |
| Kamera | Blick 45° zu den Kartenachsen (Raute), Höhe 31°, fov 18°, `rand` −0,6208 (Bildbreite = Kartendiagonale × 1,3775 ≈ 46,7 m), mittig: Kartenkörper −6,4 … 2,6 m (Void oben = unten), Schieben 0,05 %/Frame |
| Karte | 24 × 24 m, Kacheln 1 m ohne Fuge (Höhe 0,16–0,32 m, Wasser 0,06, Weg 0,17), Detail-Stufe 2, Erd-Seiten 3 Schichten (0,9 / 1,4 / 1,6 m, eingerückt 0 / 0,3 / 1 m) + hängende Blöcke |
| Inhalt | 2 Häuser mit Flachdach-Stufen, Kamin, Kisten; Teich mit Zaun, Steg, Trittsteinen, Seerosen; Feld 4 Reihen; 3 Laternen; Brunnen; Karren; Bank; Wegweiser; bis 28 Bäume (35 % gestufte Nadelbäume); Felsen; Büschel/Blumen (22 % Blumen); 1 Figur |
| Void | Verlauf vertikal: oben `#8e9399` → unten `#2a2d31`; Nebel in Void-Mischfarbe (55 %), 125–260 m |
| Partikel | 260 Würfel `#c4c8cd`, 0,25–0,55 m, Raum x/z ±75 m, y −45 … 22 m (nicht im Kartenquader), pendeln 0,8–1,1 m, steigen 0,12 m/s, Startwert 41 |
| Farben Karte | Gras `#7d948f` `#738a86` `#86a09a` · Boden `#aeb8bf` `#a3aeb6` `#b8c1c7` · Weg `#c9cfd3` · Wasser `#557c97` · Seiten `#6a6662` `#58544f` `#46423f` · Fels `#8a9097` · Stamm `#55504b` · Laub `#5c7a76` `#668581` `#4f6c69` · Wand `#d3d9de` · Dach `#4c5a68` · Blumen `#e3eaf0` `#a7bdd4` `#b7b1cf` · Lampe `#eef6ff` · Erde `#4d4843` · Holz `#7a6f66` |
| Figur | Klotz-Figur 2,1 m: Körper `#3d6c99`, Kopf `#d6c5b8`, Beine `#2e333b`, Haar `#3a3633`; geht 1,3 m/s |
| Licht | Stufen-Licht (`material.ts`): Licht `#eef4ff` × 1,35 × (0,6 + 0,4 × Einfall), Schatten `#5b6576`, Aufhellung `#0b0f16`, Kante 0,3 ± 0,06; Sonne `#e8f0ff` immer **vorne rechts oben** (az 165°, 50° hoch; seit Runde 06, vorher 125°/52°), echte Schatten fallen nach hinten |
| Kanten | an, `#1b1e23`, 2,2 px nah / 1,6 px fern (60–160 m), Sprung 0,02, Knick 0,004 |
| Farbkorrektur | Kontrast × 1,1, Sättigung × 0,9, kalt 0,012 (Blau in Schatten/Mitten/Lichtern), Kurve 0 / 0,08 / 0,24 / 0,5 / 0,77 / 0,92 / 1, Vignette 0,18 / 0,5 |
| Effekte | Leuchten ab 0,92 (Stärke 0,25, Radius 0,8), keine Tiefenschärfe im Bild 1, MSAA 4 |
