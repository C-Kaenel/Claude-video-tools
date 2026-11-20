# Abnahme-Checkliste neuer Stil (K0003)

Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage. In die Übergabe kopieren und abhaken (`[x]`).
Ein offener Punkt = nicht fertig (oder in der Übergabe begründen, warum der Nutzer ihn erlassen hat).

## IDs und Ort
- [ ] T#### und K#### waren beim Start `reserviert` (Organisation), Blöcke angelegt
- [ ] Skill-Ordner `.claude/skills/<name>/` = `name` im Frontmatter
- [ ] Alles Neue liegt in der Heimat (`styles/T####_<name>/`, Skill-Ordner, eigene Token-Schlüssel, Bibliothek mit `"stil"`)
- [ ] Kein fremder Stil/Skill, kein Motor-Kern, kein `audio/`/`tools/` geändert (Wünsche stehen in der Übergabe)

## Look
- [ ] Modus festgehalten (R mit Referenzen / O ohne)
- [ ] Modus R: nur Messwerte gespeichert, kein fremdes Bild/Code übernommen
- [ ] Bild-Schleife Stufe 1 abgeschlossen („nichts mehr zu verbessern“ des Nutzers)
- [ ] Stufe 2: alle 6 Bilder vom Nutzer als gut bestätigt, 2 davon im Langformat
- [ ] 6 Referenzbilder `T####_ref_01…06.png` + `referenzen/README.md` + Protokoll im Skill-Ordner
- [ ] Look-Werte in den Tokens (eigener Schlüssel, Messziele in `look.stile.<name>`), nicht hart im Code

## Bauen
- [ ] `styles/T####_<name>/README.md` (Zweck, Eingaben, Ausgaben, Abhängigkeiten, Beispielaufruf)
- [ ] `technik.md` mit den Fallen des Stils
- [ ] `vorlage-video/` mit `<Name>-Kurz` (1080×1920) und `<Name>-Lang` (1920×1080), beide laufen
- [ ] Alle 13 Kapitel-Module für die Langform umgesetzt (inkl. `aufruf`), jedes Kapitel einzeln renderbar (Werte aus `formats.long-form.kapitelArten`), Prüf-Story zeigt jedes
- [ ] Jede Code-Datei: „Herkunft: eigen“; `fremd_pruefung.py` meldet „100 % eigen“; `npm test` grün (bei Code)
- [ ] Spezielle Tools: nur freigegebene (gratis, lokal, ohne Konto, kommerziell erlaubt), eingebunden durch die Tools-Sitzung

## Skill
- [ ] `description`: K-ID, T-ID, Look, Auslöser, Abgrenzung zu allen anderen Stil-Skills
- [ ] Abschnitte: Herkunft, Referenzbilder, Formate, Ablauf, Story-Daten, Regeln, Fallen (Verweis), Prüfung, Abschluss
- [ ] Auslöse-Test in frischer Sitzung bestanden (3 Sätze)
- [ ] Wunsch an die anderen Stil-Sitzungen: Abgrenzung zum neuen Stil in ihrer `description`

## Prüfen
- [ ] Probe-Video kurz und lang in `output/`, vom Nutzer angesehen
- [ ] Prüfungen gelaufen (welche, Ergebnis in der Übergabe)

## Doku
- [ ] Eigene Blöcke `stil:T####` gefüllt: `CLAUDE.md` (Befehle), `docs/stil.md` Kap. 7, Handbuch 6.13.N, Kontext, Projektstand
- [ ] `docs/inventar.md`: eigene Zeilen angehängt
- [ ] „Bitte an die Organisation“ in der Übergabe: Register aktiv, Zeilen für `CLAUDE.md`-Tabelle, `skills/README.md`, Handbuch-Tabelle 6.13, Token-Version
- [ ] Datei-Listen im eigenen Änderungs-/Übergabe-Eintrag nur mit eigenen Pfaden
- [ ] `abschluss.py --pfade … --stil T####` gelaufen, keine Meldung ausserhalb des eigenen Blocks
- [ ] Grünes Licht des Nutzers → Commit nur eigener Pfade; Runden-Bilder nach `_archive/zum-loeschen/`
