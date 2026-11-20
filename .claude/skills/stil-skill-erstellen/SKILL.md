---
name: stil-skill-erstellen
description: K0003 – eigener V-Video-Meta-Skill (100 % eigen) – Anleitung, wie ein Claude-Agent einen NEUEN Video-Stil samt Stil-Skill baut (Stil T####, Skill K####) – Rückfragen, Modus mit oder ohne Referenzen, Bild-Schleife (5 Testbilder je Runde bis zum Look, dann 5 andere Szenarien bis 6 Referenzbilder stehen), Kurz- und Langformat, spezielle Tools nur gratis/lokal/ohne Konto/kommerziell erlaubt, eigene Heimat und eigene Doku-Blöcke, damit sich Stile nicht überschreiben. Verwenden, wenn der Nutzer einen neuen Stil, einen neuen Look oder einen neuen Stil-Skill will, „Skill erstellen“ sagt oder die Organisation eine Untersitzung für einen neuen Stil startet. NICHT verwenden, um ein Video in einem bestehenden Stil zu machen (dafür der Skill des Stils, z. B. K0002 cartoon-3d2d) oder um einen bestehenden Stil zu verbessern (dafür die Sitzung dieses Stils).
---

# K0003 stil-skill-erstellen – einen neuen Stil mit eigenem Skill bauen

Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage. Zuständig: Sitzung **Organisation** (pflegt diesen Skill);
benutzt wird er von der **Untersitzung des neuen Stils**. Für Menschen: Handbuch 6.13 „Stile und Stil-Skills“.
Gespräch mit dem Nutzer auf Deutsch, Inhalte der Videos auf Englisch.

Dateien hier: `vorlagen/` (Gerüste für SKILL.md, README, technik.md, referenzen/README.md, Protokoll),
`checkliste.md` (Abnahme – am Ende jeder Punkt abgehakt in der Übergabe).

**Grundsatz:** Ein Stil hat **eine Heimat** und schreibt in gemeinsame Dokus **nur in seinen eigenen Block**. So überschreiben
sich verschiedene Stile und Sitzungen nie. Die Schritt-für-Schritt-Anweisungen des Nutzers haben immer Vorrang vor diesem Skill.

---

## 0. Start (macht die Organisation, bevor die Untersitzung beginnt)
1. Register `00_index.md` neu lesen, dann **sofort** zwei Zeilen mit Status `reserviert` eintragen: `T####` (Stil) und `K####`
   (Skill). Name: Kleinbuchstaben, Bindestrich (`docs/benennung.md`). Der Skill-Ordner heisst wie der Stil ohne ID.
2. Untersitzung „V-Video Stil <name> (T####/K####)“ starten; Brief: diesen Skill laden, IDs, Bereich (unten), Modus falls bekannt.
3. Leere Blöcke `stil:T####` anlegen (in `CLAUDE.md` Rendern, `docs/stil.md` Kap. 7, Handbuch 6.13, Kontext, Projektstand)
   und die Verzeichnis-Zeilen mit Status „in Arbeit“ eintragen (Tabelle „Stile und Skills“ in `CLAUDE.md`, `skills/README.md`,
   Tabelle in Handbuch 6.13).
**Prüfung durch die Untersitzung beim Start:** Stehen T#### und K#### im Register als `reserviert` und gibt es die leeren Blöcke?
Wenn nicht: anhalten und die Organisation (bzw. den Nutzer) fragen – nie selbst IDs nehmen.

## 1. Bereich der Stil-Sitzung (nur hier wird geschrieben)
| Ort | Inhalt |
|---|---|
| `.claude/skills/<name>/` | `SKILL.md`, `referenzen/` (6 Referenzbilder + `README.md` + Protokoll der Bild-Schleife) |
| `styles/T####_<name>/` | **jeder neue Stil**, mit oder ohne eigenen Motor: `README.md`, `technik.md` (Fallen DIESES Stils), Look-Werte, eigener Code, `vorlage-video/` (Kurz + Lang), `pruefung/` |
| `shared/design-tokens.json` | nur eigener Schlüssel `<name>` unter `color`, `line`, `motion`, `lens`, `grade` und `look.stile.<name>` (Messziele). Die `version` erhöht **nur die Organisation**; `look.pruefung`/`look.ziel` (global) gehören der Tools-Sitzung. Datei direkt vor dem Schreiben neu lesen, nur per Edit einfügen |
| `library/` | eigene Einträge mit `"stil": "T####"` (bis die Bibliothek das Feld kennt: Stil zusätzlich in der Bemerkung der Register-Zeile); B-Zeilen im Register selbst sofort `reserviert` eintragen (Register davor neu lesen) |
| gemeinsame Dokus | **nur** im eigenen Block `<!-- stil:T#### -->` … `<!-- /stil:T#### -->` in `CLAUDE.md` (Abschnitt Rendern), `docs/stil.md` (Kap. 7), `docs/handbuch/handbuch.md` (Kap. 6.13), `docs/kontext_claude-app.md`, `docs/projektstand.md` |
| `docs/inventar.md` | eigene Zeilen anhängen (nur per Edit, nie ganze Datei schreiben) |
| `output/T####_runden/` | Bilder der Bild-Schleife (nicht in Git) |

**Verzeichnis-Zeilen pflegt nur die Organisation:** T-/K-Zeilen im Register, Tabelle „Stile und Skills“ in `CLAUDE.md`,
`skills/README.md`, Tabelle in Handbuch 6.13, Token-`version`. Die Stil-Sitzung schreibt den gewünschten Inhalt dieser Zeilen
in ihre Übergabe („Bitte an die Organisation: …“).

Nie: andere Stile/Skills ändern, ausserhalb des eigenen Blocks schreiben, gemeinsame Dateien mit Write ganz neu schreiben,
`engine/v01/core|camera|light|post|qa|render/`, `audio/v01/` oder `tools/` ändern (→ Wunsch an die Tools-Sitzung in
`docs/uebergabe.md`), `git add -A`.
Braucht der Stil etwas im gemeinsamen Motor: als **neue Option, standardmässig aus** – fertige Videos müssen gleich rendern.

## 2. Rückfragen an den Nutzer (immer zuerst, eine Nachricht)
1. Name des Stils und Look in Worten (3 Eigenschaften, Beispiel-Szene).
2. **Modus:** mit Referenzen (Videos/Bilder in `_quarantaene/`) oder ohne (Beschreibung, eigene Skizzen)?
3. 2D oder 3D? Figuren ja/nein? Welche Welten/Epochen?
4. Technik: eigener Motor `engine/v01/`, reines Remotion (wie T0002) oder etwas Neues? Braucht es ein spezielles Tool (Abschnitt 7)?
5. Ton: `audio/v01/` übernehmen (Standard) oder eigene Stimmungen/Klänge?
6. Die 5 Szenarien für Stufe 2 der Bild-Schleife: Vorschlag übernehmen oder eigene?
Selbstkritisch prüfen: Passt der Stil zu Kurz- **und** Langformat? Gibt es ihn schon fast (dann bestehenden Stil erweitern)?

## 3. Modus
| | Modus R – mit Referenzen | Modus O – ohne Referenzen |
|---|---|---|
| Eingang | Material in `_quarantaene/` (nie Git, nie verwenden) | Beschreibung des Nutzers |
| Vorbereitung | nur **Messwerte** speichern: je Video `python tools/measure/measure_video.py <video> shared/measurements/T####_<datum>_messung_referenz-NN_v01.json --label "Referenz NN"` (Einzelbilder: `python tools/measure/measure_bild.py shared/measurements/T####_<datum>_messung_referenz-bilder_v01.json <ordner> --label "Referenzbilder"`); daraus Ziele in den Tokens (`look.stile.<name>`). Keine Bilder, kein Code, keine Bildausschnitte übernehmen | Look in Worten → erste Werte in den Tokens |
| Erste Runde | 5 Varianten rund um die Messziele | 5 deutlich verschiedene Deutungen der Beschreibung |
Danach laufen beide Modi gleich. Quarantäne-Material löscht der Nutzer nach der Messung selbst.

## 4. Bild-Schleife (Pflicht, bevor Vorlage, Skill oder Video entstehen)
**Stufe 1 – Look finden (immer dieselbe Szene, Kurzformat 9:16):**
1. 5 Testbilder = 5 Varianten des Looks, gleiche Szene, gleicher Ausschnitt. Als **ein** Übersichtsbild, nummeriert 1–5 von
   links nach rechts (`output/T####_runden/runde_NN.png`). Dem Nutzer schreiben, worin sich 1–5 unterscheiden (je 1 Zeile).
2. Nutzer nennt das beste Bild + was noch angepasst werden muss.
3. 5 neue Varianten **des besten Bilds** mit den Änderungen (Unterschiede klein, aber sichtbar; eine Variante = genau der
   Wunsch, vier = Spielarten davon).
4. Wiederholen, bis der Nutzer sagt „nichts mehr zu verbessern“ → **Bild 1**. Seine Werte werden fest (Tokens + Look-Datei).

**Stufe 2 – Look in anderen Szenarien:**
5. Mit genau diesem Look 5 Bilder in **komplett anderen Szenarien**. Vorschlag: Innenraum · Abend/Nacht · weite Landschaft ·
   Menschenmenge · Nahaufnahme (Gesicht oder Objekt); davon **2 im Langformat 16:9**.
6. Nutzer nennt Bilder mit Problemen (Nummer + was stört) → nur diese verbessern. Look-Werte nur ändern, wenn der Nutzer es sagt
   (sonst wandert Bild 1 mit).
7. Wiederholen, bis **alle 6 Bilder** gut sind.
8. Die 6 Bilder → `.claude/skills/<name>/referenzen/T####_ref_01.png` … `_06.png` (01 = Look-Bild), dazu
   `referenzen/README.md` (Vorlage `vorlagen/referenzen-README-vorlage.md`).

**Protokoll:** jede Runde eine Zeile in `referenzen/T####_protokoll_bild-schleife.md` (Runde, Stufe, Wahl, Wunsch des Nutzers,
was geändert wurde) – Vorlage `vorlagen/protokoll-vorlage.md`. Sparsam mit Bildern: je Runde nur das Übersichtsbild ansehen.
Übersichtsbild (nummeriert, alle PNG/JPG des Ordners nach Name): `python engine/v01/qa/runde.py output/T####_runden/<ordner> --titel "Runde N"` (2–8 Bilder, schreibt die nächste
freie `runde_NN.png`, überschreibt nie).
Testbilder (jeder Remotion-Einstieg, mit oder ohne Motor): `node engine/v01/qa/stills.mjs <einstieg.tsx> <Composition> <prefix> <frame> 0.35`
– Varianten als je eine Composition in der Prüf-Story `styles/T####_<name>/pruefung/` (z. B. `Runde-1` … `Runde-5`) oder über `PROPS`.

## 5. Bauen (in der Heimat)
1. `styles/T####_<name>/` nach `vorlagen/README-vorlage.md`; jede Code-Datei mit Kopf „Herkunft: eigen (V-Video), geschrieben
   <datum>, ohne Vorlage.“ Neuer Code wird selbst geschrieben, nie aus fremdem Code kopiert.
2. **Wiederverwenden zuerst:** `library/index.json`, `templates/README.md`, `templates/ressourcen.md`, Ton `audio/v01/`,
   Prüfungen `engine/v01/qa/`, Skript-Generator `shared/skript-docx/`.
3. **Kurz- und Langformat (Pflicht):** `vorlage-video/` mit zwei Compositions `<Name>-Kurz` (1080×1920) und `<Name>-Lang`
   (`<Name>` = Stilname mit grossem Anfangsbuchstaben, z. B. `Scherenschnitt-Kurz`; Remotion verlangt Buchstaben, Ziffern, `-`)
   – 1920×1080, je ~10 s, lauffähig. Format, Takt und Safe Area nur aus den Tokens (`formats`, `safeArea`), nie hart im Code.
   Kamera-Ausschnitt, Karten-/Textgrössen und Takt je Format (kurz: Schnitt alle 2–3 s, Hook-Frage 7–9 s; lang: 4–8 s, Kapitel).
   **Langform = Kapitel-Module:** alle 13 Kapitel-Arten (inkl. `aufruf`) (`formats.long-form.kapitelArten` in den Tokens, Tabelle im Guide)
   als Bausteine umsetzen, die man in der Story zusammensetzt wie Requisiten oder Rezepte – z. B. `...kapitel("erklaerung", {…})`
   erzeugt die Shots mit Länge, Takt, Kamera, Karten und Musik-Stimmung dieser Art. Werte nur aus den Tokens lesen.
4. Stil-Regeln aus `CLAUDE.md` gelten für jeden Stil: hell, viele Farben, Blickfang in jeder Einstellung, nichts flackert, nichts
   steckt ineinander, am Himmel Wolken, Figuren passen zur Epoche – ausser der Nutzer legt für diesen Stil anderes fest
   (dann im Stil-Block von `docs/stil.md` und im Skill festhalten; die allgemeinen Regeln in `CLAUDE.md` bleiben).
5. `technik.md` nach `vorlagen/technik-vorlage.md`: jede Falle, die beim Bauen auffällt (Koordinaten, Flackern, Grenzen).

## 6. Skill schreiben
`.claude/skills/<name>/SKILL.md` nach `vorlagen/SKILL-vorlage.md`. Pflicht:
- **Frontmatter:** `name` = Ordnername; `description` beginnt mit der K-ID, nennt T-ID, Look in einem Satz, Auslöse-Wörter
  **und** die Abgrenzung zu allen anderen Stil-Skills („NICHT für … → K####“). Andere Stil-Skills bekommen dieselbe Abgrenzung
  zum neuen Stil – das trägt deren Sitzung ein (Wunsch in der Übergabe), nicht du.
- Abschnitte: Herkunft · Referenzbilder · Formate (kurz/lang) · Ablauf (füllt Guide-Schritt 4–6) · Story-Daten · Regeln des Stils
  · Fallen (Verweis auf `technik.md`, nicht kopieren) · Prüfung · Abschluss.
- Kurz halten (< ~300 Zeilen); Details stehen per Verweis in README/technik.md (Verweise statt Kopien).

## 7. Spezielle Tools
Nur erlaubt, wenn **alles** zutrifft: gratis (auch kommerziell), läuft lokal ohne Cloud/Online-Zwang, **kein Konto**, Lizenz
erlaubt kommerzielle Nutzung und das Ergebnis gehört uns; nie ins Git, nie mitgeben. Unklare Lizenz = nicht benutzen.
Ablauf: dem Nutzer vorschlagen (Name, Version, Lizenz mit Quelle, Bedingungen, wofür, Alternative ohne Tool) → **Freigabe** →
Wunsch an die **Tools-Sitzung** (einbinden über `TOOL_<NAME>_PATH`: `docs/lizenzpruefung.md`, README „Voraussetzungen“,
`.env.example`) → im Code nur über `spezialTool("<name>")` aus `engine/v01/qa/env.mjs` (liest `TOOL_<NAME>_PATH`) benutzen; `fremd_pruefung.py` meldet jedes Tool ohne Eintrag. Keine KI-Bild- oder Video-Dienste.

## 8. Testen
1. Beide Compositions der Vorlage rendern (Testbilder), dann ein kurzes Video direkt rendern (keine Live-Vorschau).
2. Prüfungen: `python engine/v01/qa/pruefung.py <video.mp4> <ordner>` (Bild, Safe Area, Ton) für jeden Stil; `raum.mjs` und
   `zeitplan.mjs` (`--zeitplan`) nur für Stile auf dem eigenen Motor. Fehlt eine Prüfung für den Stil → Wunsch an Tools.
3. `python tools/lizenz/fremd_pruefung.py` → „100 % eigen“; bei Code `npm test`.
4. **Auslöse-Test:** der Nutzer (oder die Organisation per neuer Sitzung) stellt in einer frischen Sitzung drei Sätze („Mach ein Video im Stil <name>“, „… im Stil <anderer>“, „neuen Stil
   bauen“) – jedes Mal muss der richtige Skill laden. Ergebnis in die Übergabe.
5. Kurzes Probe-Video (je ~15 s kurz und lang) in `output/` → Nutzer schaut an. Höchstens 2 Versuche pro Fehler, dann fragen.

## 9. Eintragen und Abschluss
1. Eigene Blöcke füllen (von der Organisation angelegt): `CLAUDE.md` (Befehle), `docs/stil.md` Kap. 7 (Look-Werte),
   Handbuch 6.13 (Unterkapitel `### 6.13.N <Name>`: Bauteile und Look in Worten), Kontext (Absatz für die Claude-App),
   Projektstand (höchstens 3 Zeilen + Verweis auf `technik.md`). `docs/inventar.md`: eigene Zeilen anhängen.
2. In die Übergabe „Bitte an die Organisation“: Register T/K auf `aktiv` + „nutzt“, Zeilen für `CLAUDE.md`-Tabelle,
   `skills/README.md`, Handbuch-Tabelle 6.13, Token-Version.
3. `checkliste.md` durchgehen; Notiz schreiben, dann
   `python tools/doku/abschluss.py --notiz output/notiz.txt --pfade styles/T####_<name>,.claude/skills/<name>,<eigene B-Dateien> --stil T####`
   (`--pfade`: nur eigene Dateien in die Listen; `--stil`: meldet Änderungen ausserhalb des eigenen Blocks).
4. Nutzer fragen „Was soll noch geändert werden?“; nach dem grünen Licht nur die eigenen Pfade committen (`git add <pfade>`).
   Gemeinsame Datei mit fremden, nicht committeten Änderungen: nur die eigenen Abschnitte aufnehmen – `git diff <datei>` als
   Patch speichern, fremde Abschnitte daraus löschen, `git apply --cached <patch>` – oder warten, bis die andere Sitzung
   committet hat. Nach dem Commit `git push`.
5. Runden-Bilder `output/T####_runden/` und Quarantäne-Reste: `_archive/zum-loeschen/` (Nutzer löscht).
