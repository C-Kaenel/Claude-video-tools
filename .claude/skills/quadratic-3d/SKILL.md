---
name: quadratic-3d
description: K0004 – eigener V-Video-Skill (100 % eigen) für Videos im Stil T0004 „quadratic-3d“ – kalter 3D-Look aus Quadern, eine quadratische Karte schwebt als Raute (Vogelperspektive) im grauen Void mit Partikeln, sehr kleine Klotz-Figuren, Sonne vorne rechts oben, Wortfolge mit roten Wörtern, Ton aus langen gestrichenen Streichern. Kurz- (9:16) und Langformat (16:9, Kapitel-Module). Gerendert mit dem eigenen Motor engine/v01 (Remotion + three.js), Ton mit eigenem Streicher-Ton + audio/v01, KEINE Stimme (der Nutzer spricht das Voice-over selbst). Immer zusammen mit prompts/production-guide.md. Verwenden, wenn der Nutzer den Stil „Quadratic-3D“, „Quadratic“, „Raute“, „Voxel-Karte“, „Diorama im Void“ oder „kalter Würfel-Stil“ wählt oder diesen Skill nennt. NICHT für bunte Cartoon-Figuren in einer gemalten Stadt (→ K0002 cartoon-3d2d), nicht für reine Text-Animation (→ T0002, templates/README.md) und nicht, um einen neuen Stil zu bauen (→ K0003 stil-skill-erstellen).
---

# K0004 quadratic-3d – Videos im Stil T0004

## Herkunft und Zweck
Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage (Bild-Schleife mit dem Nutzer, Modus ohne Referenzen).
Heimat des Stils: `styles/T0004_quadratic-3d/` (README = Befehle und Bausteine, `technik.md` = Fallen).
Für Menschen: Handbuch 6.13.1 „Quadratic-3D“.

## Referenzbilder
`referenzen/T0004_ref_01.png` (Look: Dorf) … `_06.png` (Hotelzimmer, Amsterdam, Kolosseum, Berghütte, Schneewald), Beschreibung
in `referenzen/README.md`, feste Werte von Bild 1 im Protokoll `referenzen/T0004_protokoll_bild-schleife.md`.
Vor jedem Video ansehen und Testbilder damit vergleichen.

## Eingaben, Ausgaben, Abhängigkeiten
- Eingaben: Skript mit Reintext (Guide), Story-Daten (Takte), Ton-Datei (aus der Story erzeugt)
- Ausgaben: Video MP4 (Kurz 1080×1920 oder Lang 1920×1080) im Produktionsordner
- Abhängigkeiten: `styles/T0004_quadratic-3d/`, Motor `engine/v01/`, `audio/v01/` (Grundbausteine), Tokens (`quadratic-3d`);
  Tools laut `docs/lizenzpruefung.md` (keine speziellen Tools)

## Beispielaufruf
```bash
node engine/v01/qa/stills.mjs productions/V000X_.../src-motor/index.tsx <ID> output/x_ 30,200 0.35
node styles/T0004_quadratic-3d/vorlage-video/ton.mjs productions/V000X_.../src-motor/story.ts ton productions/V000X_.../V000X_datum_ton_<titel>_v01.json
node styles/T0004_quadratic-3d/ton/produziere.mjs productions/V000X_.../src-motor/index.tsx <ID> productions/V000X_.../V000X_datum_ton_<titel>_v01.json output/<ID>/video_v01.mp4
node styles/T0004_quadratic-3d/ton/produziere.mjs productions/V000X_.../src-motor/index.tsx <ID> productions/V000X_.../V000X_datum_ton_<titel>_v01.json --kapitel alle
node engine/v01/render/teilrender.mjs productions/V000X_.../src-motor/index.tsx <ID> output/<ID>/video_v01.mp4 output/<ID>/video_v02.mp4 --shots <shot-id,shot-id>
node engine/v01/render/zusammenfuegen.mjs productions/V000X_.../src-motor/index.tsx <ID> productions/V000X_.../V000X_datum_ton_<titel>_v01.json productions/V000X_.../V000X_..._video_..._v01.mp4 --ton-skript styles/T0004_quadratic-3d/ton/ton.py
```
Jeder Stand wird direkt gerendert (keine Live-Vorschau): `ton/produziere.mjs` → `output/<ID>/video_vNN.mp4` mit dem Stil-Ton.
Änderungen danach nur an den betroffenen Shots per Teil-Render auf einer Kopie der letzten Fassung (übernimmt den Ton der
Basis; ändern sich Wörter oder Klänge, neuen Ton mit `--ton <mix.wav>` dazulegen). Langform: jedes Kapitel einzeln rendern
(`--kapitel alle` → `output/<ID>/kapitel/NN_<art>.mp4`), bei Änderungen nur die betroffenen Kapitel (`--kapitel 3,5`);
zusammenfügen erst nach dem grünen Licht. Beim grünen Licht kommt die zuletzt geprüfte Fassung als v01 in den Produktionsordner.
Der Nutzer will von allen Tests Bilder/Clips sehen, bevor etwas ins Video geht.

## Formate
| | Kurz (9:16, 1080×1920) | Lang (16:9, 1920×1080) |
|---|---|---|
| Composition der Vorlage | `Quadratic-3D-Kurz` | `Quadratic-3D-Lang` |
| Takt | `kurz(takte)`: Schnitt alle 2,5 s, Hook-Frage bei 7–9 s | Kapitel, Einstellungen 4–8 s |
| Bildausschnitt | Raute füllt die Bildbreite, viel Void oben/unten | Raute mittig, Void rundum |
| Wortfolge | unter der Karte | unteres Drittel, Kapiteltitel oben |
| Safe Area | Tokens `safeArea.short-form` | Tokens `safeArea.long-form` |
| Aufbau | ein Bogen | Kapitel-Module `kapitel("<art>", …)`, Werte aus `formats.long-form.kapitelArten` |

## Ablauf (immer `prompts/production-guide.md` – dieser Skill füllt Schritt 4–6)
1. Phase 1 + Schritt 1–3 des Guides (Rückfragen inkl. Format, ID, Ordner, Skript mit Reintext, Faktencheck).
2. Bibliothek ansehen (`library/index.json`, Einträge mit `"stil": "T0004"`) und die Orte in `styles/T0004_quadratic-3d/orte/`;
   wiederverwenden vor neu bauen. Ein neuer Ort = neue Datei `orte/<name>.ts` im Video-Ordner (später in den Stil übernehmen).
3. Quelle anlegen: `styles/T0004_quadratic-3d/vorlage-video/` nach `productions/V####_…/src-motor/` kopieren, Importe umschreiben
   (`../szene` → `../../../styles/T0004_quadratic-3d/szene` usw.), Composition-ID = Video-ID.
4. Story als Daten (unten), Ton-Datei mit `ton.mjs` aus der Story schreiben.
5. Testbilder sparsam; dann direkt rendern (`output/<ID>/video_vNN.mp4`), Änderungen per Teil-Render bzw. betroffene Kapitel.
6. Prüfen (unten), Fehler ins Review, höchstens 2 Versuche pro Fehler.
7. Abschluss laut Guide Schritt 7–8 (Langform mit Titelbild), dann Voice-over anlegen (Schritt 9 → `V####_sequence01.mp4`).

## Story-Daten
```ts
import { aufruf, kapitel, kapitelTon, storyLang } from "../../../styles/T0004_quadratic-3d/kapitel";
const k1 = kapitel("hook", { nr: 1, start: 0, takte: [
  { ort: "dorf", sek: 3, worte: [{ text: "Where did the town go?", ab: 0.4, rot: ["go"] }] },
  { ort: "berg", stoss: 0.2 },
] });
const k2 = aufruf({ nr: 2, hook: k1 });                               // immer direkt nach dem hook
const k3 = kapitel("erklaerung", { nr: 3, start: k2.ende, titel: "How It Works", takte: [
  { sek: 12, platten: [{ ort: "amsterdam", pos: [-12.5, 0] }, { ort: meinOrt, pos: [12.5, 0], ab: 3 }], buerger: { platte: 0, figur: 0, ab: 7, bis: 11 } },
] });
export const story = storyLang("V0009", [k1, k2, k3]);   // registerRoot(motorCompositions([quadratic(story)]))
export const ton = kapitelTon("V0009", [k1, k2, k3]);
```
Takt: `ort` (`dorf`, `hotel`, `amsterdam`, `kolosseum`, `berg`, `schneewald` oder ein eigener `Ort` des Videos) **oder**
`platten` (`[{ ort, pos: [x, z], ab }]` – ohne `ab` von Anfang an da, mit `ab` angefügt: Funken pulsieren 3×, dann erscheint die
Platte; Kamera: ungerade Zahl Raute 45°, gerade Zahl gedreht, sodass die Platten gerade nebeneinander liegen – Platten mit 24 m
Kante bei `pos` ±12,5 m nebeneinander), `sek`, `kamera` (`raute` Standard, `nah`, `folgen`, `weit`, `ran` – nur bei einer
Platte), `figur`, `buerger` (`{ platte, figur, ab, bis }`: Kamera fährt weich hinter die Figur, schräg von oben, und folgt ihr
Bild für Bild, glatt; mit `bis` vor dem Takt-Ende weich zurück in die Totale; kehrt die Figur im Fenster um, bricht der Bau mit
einer Meldung ab – Fenster verschieben), `ziel` (`{ punkt: [x, y, z] oder { platte, figur }, nah }`: eine weiche Fahrt über den
ganzen Takt, am Ende liegt das Ziel in der Bildmitte; `nah` 0,6–0,75 = 25–40 % näher, 1 = nur schwenken, z. B. einer hohen
Säule nach). Platten-Optionen: `leer` (niemand läuft), `fensterLicht` (Licht in allen Fenstern – Menschen drinnen), `welle`
(`{ richtung, start, tempo }`: wo die Front ankommt, verschwinden die Figuren), `boden` (Höhe des Bodens, z. B. Asche – Figuren
gehen darauf), `worte` (`text`, `ab`, `bis`, `rot`, `wert` mit `{n}`, `ueber`, `lage`), `stoss`,
`blitz`, `phase` (spannung: `aufbau`/`hoehepunkt`). `aufruf({ nr, hook })` baut die Kapitel-Art aufruf (letztes hook-Bild friert
ein, unscharf, Like- und Abo-Knopf; Text kommt vom Voice-over). Kapitel-Titel kommen von selbst (oben, „CHAPTER N“).
`pruefeFolge(kap)` meldet Regelverstösse (auch: aufruf fehlt, Wortfolge zu oft).

## Regeln des Stils
- Immer Raute: Kamera nur über `kamera.ts` (45°, 31°, fov 18°); Karte mittig, Void sichtbar. Nah an eine Figur nur selten
  (höchstens 1 von ~8 Einstellungen).
- Alles aus Quadern; keine runden Formen, keine Text-Tafeln im Bild. Betonung nur mit roten Wörtern in der Wortfolge.
- Wortfolge nicht in jedem Bild, nur an extremen Stellen (z. B. „why didn't they flee?“, der Vulkan bricht aus) – höchstens
  ~1 Zeile je 45 s ohne Kapiteltitel.
- Entwickeln statt springen: harte Wechsel in eine neue Szene selten. Eine Geschichte wächst auf ihren Platten (Figuren kommen
  an, bauen, Neues erscheint); Neues Thema = neue Platte an die bestehende Karte anfügen (Funken, dann erscheint sie) statt
  Schnitt. Neue Platten sparsam.
- Bürger-Sicht (`buerger`) für Momente, in denen man eine Person begleitet – selten; Zeitfenster so legen, dass die Person
  darin nicht umkehrt.
- Zoom nie einfach zur Kartenmitte: lange Einstellungen fahren mit `ziel` weich zu dem, worum es geht (Krater, Tempel, Strasse,
  Schiffe) und kommen nur 25–40 % näher; ohne `ziel` schiebt die Kamera je Einstellung höchstens 8 %.
- Leute passen zur Geschichte: auf einer verschütteten oder verlassenen Platte läuft niemand (`leer`); „sie versteckten sich
  in ihren Häusern“ = `fensterLicht` ohne Läufer; erreicht eine Gefahr die Leute, verschwinden sie dort (`welle`).
- Kalt: Farben nur aus den Tokens `quadratic-3d` (Abweichung vom allgemeinen „hell, knallig, viele Farben“ und „Wolken am
  Himmel“ – vom Nutzer für diesen Stil so festgelegt; der Void ersetzt den Himmel). Sonne immer vorne rechts oben.
- In jeder Einstellung bewegt sich etwas (Figur, Partikel, Schnee, Rauch, Boote); nichts flackert, nichts steckt ineinander.
- Ton: Streicher-Stimmungen je Kapitel aus den Tokens, Wörter klingen gläsern, rote Wörter mit Eis-Schlag.

## Fallen
Siehe `styles/T0004_quadratic-3d/technik.md` (nicht hierher kopieren).

## Prüfung
```bash
node engine/v01/qa/raum.mjs <einstieg.tsx> <ID> output/raum                     # 0 Funde
node engine/v01/qa/zeitplan.mjs <einstieg.tsx> <ID> output/z.json
python engine/v01/qa/pruefung.py <video.mp4> output/pruefung --zeitplan output/z.json   # Farb-Schwellen des Stils: look.pruefung.stile.quadratic-3d
```

## Abschluss
Laut Guide Schritt 7–9: Nutzer fragen „Was soll noch geändert werden?“, nach dem grünen Licht bereinigen, nach dem Voice-over
des Nutzers `V####_sequence01.mp4` anlegen; Register („nutzt: T0004, K0004, B-IDs“) nachführen.
Titelbild (Guide Schritt 8, nur Langform 16:9 – Kurzform bekommt keins): `python tools/titelbild/titelbild.py <video.mp4> --bogen` (Kontaktbogen), dann mit
`--zeit <s> --zeile1 "…" --zeile2 "…"` → `V####_<datum>_thumbnail_<name>_vNN.png` im Produktionsordner (Werte: Tokens `titelbild`).
