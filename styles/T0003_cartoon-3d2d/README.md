# T0003 cartoon-3d2d (eigener Stil)

Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage. Hauptstil des Projekts, läuft auf dem eigenen Motor
`engine/v01/`. Referenzbilder aus unseren fertigen Videos: `.claude/skills/cartoon-3d2d/referenzen/`.

## Zweck
Flache Cartoon-Figuren in einer bunten, gemalten 3D-Stadt mit schwarzer Tusche. Dieser Ordner enthält nur die
**Look-Werte** (Licht, Farbkorrektur, Effekte). Die Formen kommen aus dem Welt-Baukasten des Motors, die Farben aus
`shared/design-tokens.json` (`color.cartoon-3d2d`, darin `world` = Farben der Stadt).

## Dateien
| Datei | Inhalt |
|---|---|
| `style.ts` | `KOREA_LOOKS`/`KOREA_PALETTE` (Farben der Korea-Welt); `HANSE_LOOKS`/`HANSE_PALETTE` (Hanse-Welt); `cartoon3d2d` (Stil für den Motor): Lichtstimmungen `day` und `golden`, Farbkorrektur je Stimmung, PUNCH, Tusche/Tiefenschärfe/Leuchten; `LOOKS` (Wasser, Wolken, Laternen je Stimmung); `PALETTE` |
| `figures.ts` | Karten- und Effekt-Farben, Licht-Tönung der Karten je Stimmung, Paletten der Menge, Besetzung `CAST` (aus der Bibliothek B0001–B0010) |
| `szene.ts` | `buildSzene` + Helfer `shot`, `kamera`, `ort`, `koreaOrt`, `hanseOrt` (`welt: "korea"` baut statt der Stadt die Korea-Welt, `welt: "hanse"` den Hanse-Hafen mit Optionen `hanse`): Szene für neue Videos aus Daten (Figuren, Karten, Requisiten auf dem Boden – auch Ware `fass`, `saecke`, `tuch`) |
| `kapitel.ts` | Kapitel-Module fürs Langformat: `kapitel(art, { nr, start, titel, frage, takte })` baut die Shots einer der 12 Kapitel-Arten (Werte aus den Tokens `formats.long-form`), `pruefeFolge`, `kapitelTon` |
| `vorlage-video/` | Start-Vorlage eines Videos (Skill K0002): `story.ts`, `index.tsx`, `ton.json` – 10 s, lauffähig; Langformat 16:9: `story-lang.ts` + `ton-lang.json` (Composition `Vorlage-Video-Lang`, 15 s) |
| `world.ts` | `buildTown` – baut für jeden Shot die Stadt in den Farben dieses Stils |
| `pruefung/` | Prüf-Story „Weltbogen“ (`index.tsx`): jeder Ort als Totale und Halbnah, Tag und Abend; `figuren.tsx`: Figurenbogen + Figurenszene; `bibliothek.tsx`: Bibliotheksbogen, Effektszene, Kamerabogen; `rezepte.tsx`: Szenen-Rezepte – jede 3D-Prüf-Story auch im Langformat (`<id>-Lang`); `kapitel.tsx` + `kapitel-story.ts`: Prüf-Video „Kapitel“ (jede Kapitel-Art einmal, 16:9) |

## Eingaben / Ausgaben
- Eingabe: eine Story (Daten, siehe `engine/v01/README.md`) mit `light: "day" | "golden"` und Kameras, gern an den
  benannten Orten (`PLACES`: laborstrasse, gasse, platz, kai, brueckenkopf, park, flussufer).
- Ausgabe: Remotion-Composition (MP4 über `npx remotion render`).

## Abhängigkeiten
Motor `engine/v01/`, Tokens `shared/design-tokens.json`; Tools: Remotion, three.js, postprocessing (Gerüst).

## Beispielaufruf (aus dem Hauptordner)
```bash
# Bild 15 jedes zweiten Shots des Weltbogens (halbe Grösse)
node engine/v01/qa/stills.mjs styles/T0003_cartoon-3d2d/pruefung/index.tsx Weltbogen output/w_ 15,45,195,435 0.5
# Figurenbogen (ein Bild) und Figurenszene (Video)
node engine/v01/qa/stills.mjs styles/T0003_cartoon-3d2d/pruefung/figuren.tsx Figurenbogen output/f_ 0 0.5
npx remotion render styles/T0003_cartoon-3d2d/pruefung/figuren.tsx Figurenszene output/figurenszene.mp4 --codec h264 --crf 16
```

## Messwerte
Die Messwerte der fertigen Videos (Helligkeit, Kontrast, Sättigung, Schnitt, Ton) stehen in `docs/stil.md` (Kapitel 5) und
`shared/measurements/`. Neue Bilder mit gleichem Ausschnitt vergleichen (Fassaden gegen Fassaden) – Werkzeug
`engine/v01/qa/bogen.py`.

## Bekannte offene Punkte
- Park: Gras wirkt am Tag sehr kräftig; Horizont hinter dem Park ist leer.
- Brückenkopf-Totale: ein Turm steht nah im Bild (Kamera-Vorschlag anpassen, wenn der Ort gebraucht wird).
- Wolken sind einfache Ballen.
- Effektszene (`pruefung/bibliothek.tsx`): Sprechblase, Thermometer und Warnlicht ragen aus der Safe Area (von der
  Prüfung gefunden) – nur Prüfszene, für echte Videos Karten innerhalb der Safe Area platzieren.
