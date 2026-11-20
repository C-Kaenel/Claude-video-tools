<!-- Gerüst aus K0003 (Herkunft: eigen). Wird zu styles/T####_<name>/README.md. Alle <…> ersetzen, Kommentar löschen. -->
# T#### <name> (eigener Stil)

Herkunft: eigen (V-Video), geschrieben <datum>, ohne Vorlage. Skill: K#### `.claude/skills/<name>/`.
Referenzbilder: `.claude/skills/<name>/referenzen/`. Fallen und Notizen: `technik.md`.

## Zweck
<Look in 2–3 Sätzen; wofür der Stil gedacht ist>

## Dateien
| Datei | Inhalt |
|---|---|
| `vorlage-video/` | Start-Vorlage: Compositions `<Name>-Kurz` (1080×1920) und `<Name>-Lang` (1920×1080), je ~10 s |
| `pruefung/` | Prüf-Storys (u. a. die Szenen der Bild-Schleife) |
| `technik.md` | Fallen, Koordinaten, Grenzen dieses Stils |
| <…> | <…> |

## Eingaben / Ausgaben
- Eingabe: <Story-Daten / Texte / Ton-Datei>
- Ausgabe: Remotion-Composition (MP4), Kurz- oder Langformat

## Abhängigkeiten
Eigen: <Motor engine/v01, audio/v01, Tokens shared/design-tokens.json (Schlüssel `<name>`)>.
Tools (nie mitgeben, Lizenz in `docs/lizenzpruefung.md`): <Remotion, … / spezielle Tools>.

## Beispielaufruf (aus dem Hauptordner)
```bash
<Testbilder Kurz>
<Testbilder Lang>
<ganzes Video>
```
