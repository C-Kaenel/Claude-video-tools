---
name: <name>
description: K#### – eigener V-Video-Skill (100 % eigen) für Videos im Stil T#### „<name>“ – <Look in einem Satz>. Kurz- (9:16) und Langformat (16:9). Gerendert mit <Technik>, Ton mit audio/v01, KEINE Stimme (der Nutzer spricht das Voice-over selbst). Immer zusammen mit prompts/production-guide.md. Verwenden, wenn der Nutzer den Stil „<name>“ wählt, <Auslöse-Wörter>, oder diesen Skill nennt. NICHT für <anderer Stil> (→ K0002 cartoon-3d2d) und nicht, um einen neuen Stil zu bauen (→ K0003).
---
<!-- Gerüst aus K0003 (Herkunft: eigen). Alle <…> ersetzen, diesen Kommentar löschen. Kurz halten, Details per Verweis. -->

# K#### <name> – Videos im Stil T####

## Herkunft und Zweck
Herkunft: eigen (V-Video), geschrieben <datum>, ohne Vorlage. Heimat des Stils: `styles/T####_<name>/`
(README = Befehle und Bausteine, `technik.md` = Fallen). Für Menschen: Handbuch 6.13.N „<Name>“.

## Referenzbilder
`referenzen/T####_ref_01.png` (Look) … `_06.png` (andere Szenarien), Beschreibung in `referenzen/README.md`.
Vor jedem Video ansehen und Testbilder damit vergleichen.

## Eingaben, Ausgaben, Abhängigkeiten
- Eingaben: Skript mit Reintext (Guide), Story-Daten, Ton-Datei
- Ausgaben: Video MP4 (Kurz 1080×1920 oder Lang 1920×1080) im Produktionsordner
- Abhängigkeiten: `styles/T####_<name>/`, <Motor/Remotion>, `audio/v01/`, Tokens (`<name>`); Tools laut `docs/lizenzpruefung.md`

## Beispielaufruf
```bash
<Testbilder, Video rendern>
```

## Formate
| | Kurz (9:16, 1080×1920) | Lang (16:9, 1920×1080) |
|---|---|---|
| Composition der Vorlage | `<Name>-Kurz` | `<Name>-Lang` |
| Takt | Schnitt alle 2–3 s, Hook-Frage bei 7–9 s | Schnitt alle 4–8 s, Kapitel |
| Bildausschnitt | <…> | <…> |
| Safe Area | Tokens `safeArea.short-form` | Tokens `safeArea.long-form` |
| Aufbau | ein Bogen | Kapitel-Module (`kapitel("<art>", …)`), Werte aus `formats.long-form.kapitelArten` |

## Ablauf (immer `prompts/production-guide.md` – dieser Skill füllt Schritt 4–6)
1. Phase 1 + Schritt 1–3 des Guides (Rückfragen inkl. Format, ID, Ordner, Skript mit Reintext, Faktencheck).
2. Bibliothek ansehen (`library/index.json`, Einträge mit `"stil": "T####"`); wiederverwenden vor neu bauen.
3. Quelle anlegen: `styles/T####_<name>/vorlage-video/` nach `productions/V####_…/src-<…>/` kopieren, Importe umschreiben.
4. Story als Daten (unten).
5. Testbilder sparsam; jeder Stand wird direkt gerendert (Änderungen per Teil-Render); v01 in den Produktionsordner erst nach dem grünen Licht.
6. Prüfen (<Befehle>), Fehler ins Review, höchstens 2 Versuche pro Fehler.
7. Abschluss laut Guide Schritt 7–8, dann Voice-over anlegen (Schritt 9 → `V####_sequence01.mp4`).

## Story-Daten
<Format der Story mit kurzem Beispiel>

## Regeln des Stils
- <…>

## Fallen
Siehe `styles/T####_<name>/technik.md` (nicht hierher kopieren).

## Prüfung
<welche Prüfungen, mit Befehl>

## Abschluss
Laut Guide Schritt 7–9: Nutzer fragen „Was soll noch geändert werden?“, nach dem grünen Licht bereinigen, nach dem Voice-over des Nutzers `V####_sequence01.mp4` anlegen; Register
(„nutzt: T####, K####, B-IDs“) nachführen.
