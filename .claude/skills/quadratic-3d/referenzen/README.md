# Referenzbilder T0004 quadratic-3d

Eigene Bilder aus der Bild-Schleife (K0003), vom Nutzer am 2026-11-14 als gut bestätigt („Alle 6 sind gut“). So soll der Stil
aussehen. Protokoll, wie der Look entstand, und alle festen Werte von Bild 1: `T0004_protokoll_bild-schleife.md`.
Neu erzeugen: `node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/pruefung/referenzen.tsx Ref-0N output/x_ 60 1`.

| Bild | Format | Szenario | Worauf achten |
|---|---|---|---|
| `T0004_ref_01.png` | 16:9 | Look-Bild (Stufe 1): Dorf mit Teich, Feld, Häusern | Raute mittig, Void oben = unten, Kartenkörper mit Schichten und hängenden Blöcken, Figur sehr klein |
| `T0004_ref_02.png` | 9:16 | Hotelzimmer | Schnitt-Modell: Wände nur an den hinteren Kanten, zur Kamera offen; Möbel aus Quadern, Lampen glimmen |
| `T0004_ref_03.png` | 16:9 | Strasse in Amsterdam | Gracht, Brücke, Hausboote; Häuserzeilen nur an den hinteren Kanten, Fronten im Licht, Giebel abgestuft |
| `T0004_ref_04.png` | 16:9 | Römisches Kolosseum | Ring aus gedrehten Quadern mit Arkaden und Gesimsen, vorne Ruine (Blick hinein), Arena halb offen |
| `T0004_ref_05.png` | 9:16 | Berghütte in den Bergen | Gelände steigt nach hinten an (Wiese → Fels → Schnee), Hütte vorne, Rauch und Fahne bewegen sich |
| `T0004_ref_06.png` | 16:9 | Verschneiter Wald | Schneekappen auf jeder Baumstufe, Eis mit Rissen, Spuren auf dem Pfad, fallender Schnee nur über der Karte |

Gemeinsam: grauer Void (oben hell, unten dunkel) mit hellgrauen Partikel-Würfeln, Sonne immer vorne rechts oben, dünne dunkle
Kanten, kalte Farbkorrektur, alles aus Quadern. Hohe Orte: Bildhöhe wächst mit (`rautenKamera`), im Hochformat wächst der
Nebel mit dem Kamera-Abstand (`quadStyle(look, abstand)`).
