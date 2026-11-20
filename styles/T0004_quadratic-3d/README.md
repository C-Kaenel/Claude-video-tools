# T0004 quadratic-3d (eigener Stil)

Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage. Skill: K0004 `.claude/skills/quadratic-3d/`.
Referenzbilder: `.claude/skills/quadratic-3d/referenzen/`. Fallen und Notizen: `technik.md`.

## Zweck
Kalter, ruhiger 3D-Look: eine quadratische Karte schwebt – von schräg oben als Raute gesehen – mittig in einem grauen Void
mit hellgrauen Partikel-Würfeln. Alles ist aus Quadern gebaut, die Figuren sind sehr klein (selten fährt die Kamera nah heran).
Sonne immer vorne rechts oben, dünne dunkle Kanten, kalte Farbkorrektur, Ton aus langen gestrichenen Streichern. Text als
Wortfolge (Wort für Wort von unten, dramatische Wörter rot). Gedacht vor allem für Langform (Kapitel), Kurzform geht auch.

## Dateien
| Datei | Inhalt |
|---|---|
| `look.ts` | Look-Werte (`REFERENZ` = Bild 1, aus den Tokens), `quadStyle()` Motor-Stil, `rautenKamera()` |
| `welt.ts` | Void, Partikel, Kartenkörper, Dorf-Karte (Bild 1, als Ort `DORF`), Klotz-Figuren, `baueOrt()`/`ortWelt()` für Orte, `schaerfeTiefe()` |
| `material.ts` | Stufen-Licht (ersetzt das Zwei-Ton-Material des Motors) |
| `orte/` | Orte (je eine Karte): `hotel`, `amsterdam`, `kolosseum`, `berg`, `schneewald`; Verzeichnis `orte/index.ts` |
| `kamera.ts` | Kamera-Arten `raute`, `nah`, `folgen`, `weit`, `ran` (immer Raute-Richtung) |
| `worte.tsx` | Wortfolge (2D-Ebene über dem Bild) |
| `kapitel.ts` | 13 Kapitel-Module `kapitel(art, …)` + `aufruf(…)`, Takte mit Platten und Bürger-Sicht, Kurzform `kurz(takte)`, `pruefeFolge`, Ton-Datei `kapitelTon`/`tonDatei` |
| `platten.ts` | Platten-Prinzip: `plattenWelt` (Platten anfügen mit Funken), `plattenKamera` (Raute bei ungerader, gerade bei gerader Plattenzahl), `buergerKamera` |
| `aufruf.tsx` | Kapitel-Art aufruf: Unschärfe über dem eingefrorenen hook-Bild, Like- und Abo-Knopf im Quadratic-Look |
| `szene.ts` | `quadratic(story)` → Eintrag für `motorCompositions` (Stil, Welt je Shot, Wortfolge) |
| `ton/ton.py` | eigener kalter Ton: Streicher-Musik (Stimmungen eis, frost, nebel, glanz, ende) + Klänge `t4:glas`, `t4:eisschlag`, `t4:frostwind` |
| `ton/produziere.mjs` | ein Befehl: Raum-Prüfung + Bild → eigener Ton → Mischung + Prüfung |
| `vorlage-video/` | Start-Vorlage: `Quadratic-3D-Kurz` (1080×1920, 10 s) und `Quadratic-3D-Lang` (1920×1080, 4 Kapitel inkl. aufruf und angefügter Platte); `ton.mjs` schreibt `ton.json`/`ton-lang.json` aus den Storys |
| `pruefung/runde.tsx` | Bild-Schleife Stufe 1 (Runden 1–4) |
| `pruefung/referenzen.tsx` | die 6 Referenzbilder (`Ref-01` … `Ref-06`) |
| `pruefung/kapitel.tsx` | alle 13 Kapitel-Arten (`Quadratic-3D-Kapitel`, 16:9, ~2 min) |
| `pruefung/neu.tsx` + `neu-story.ts` | Einzeltests: `Quadratic-3D-Aufruf`, `Quadratic-3D-Platten`, `Quadratic-3D-Buerger` |
| `technik.md` | Fallen dieses Stils |

## Eingaben / Ausgaben
- Eingabe: Story aus Takten `{ ort, sek?, kamera?, figur?, worte?, stoss?, blitz? }` – Langform über `kapitel(art, { nr, start, titel, takte })`,
  Kurzform über `kurz(takte)`; Ton-Datei aus der Story (`ton.mjs`).
- Ausgabe: Remotion-Composition (MP4), Kurz- oder Langformat; Ton −22,6 LUFS.

## Abhängigkeiten
Eigen: Motor `engine/v01/` (Bühne, Kamera, Effekte, Prüfungen), `audio/v01/` (Grundbausteine, Betten, Geräusche),
Tokens `shared/design-tokens.json` (Schlüssel `quadratic-3d` unter color, line, motion, lens, grade).
Tools (nie mitgeben, Lizenz in `docs/lizenzpruefung.md`): Remotion, React, three.js, postprocessing, esbuild (nur `ton.mjs`),
Python + numpy/scipy, ffmpeg, Schrift Inter (`FONT.sans`). Keine speziellen Tools.

## Beispielaufruf (aus dem Hauptordner)
```bash
node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/vorlage-video/index.tsx Quadratic-3D-Kurz output/q_ 30,100,170,260 0.35
node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/vorlage-video/index.tsx Quadratic-3D-Lang output/q_ 30,200,470 0.35
node styles/T0004_quadratic-3d/vorlage-video/ton.mjs
node styles/T0004_quadratic-3d/ton/produziere.mjs styles/T0004_quadratic-3d/vorlage-video/index.tsx Quadratic-3D-Lang styles/T0004_quadratic-3d/vorlage-video/ton-lang.json output/Quadratic-3D-Lang/video_v01.mp4
```
