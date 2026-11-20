# Ton-Baukasten v01 (`audio/v01/`)

Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage. Tools darunter: Python, numpy, scipy, Pillow (nur für das Vergleichsbild).

## Zweck
Erzeugt den ganzen Ton eines Videos – Musik und Geräusche, ohne Stimme – aus einer **Ton-Datei** (Daten, JSON).
Kein fremdes Tonmaterial: jeder Klang wird im Code erzeugt. Gleiche Ton-Datei = bytegleiche WAV-Dateien.

## Dateien
| Datei | Inhalt |
|---|---|
| `core.py` | Grundlagen: Rauschen (farbig), Filter, Hüllkurven, Ein-/Ausblenden, Panorama, Platzieren, Hall (Raumantwort), Resonanz-Klänge, Lautheit nach EBU R128 / BS.1770-4, True Peak, Begrenzer, WAV lesen/schreiben |
| `instrumente.py` | pluck (Zupfen), pad (Fläche), glock, vibes, musicbox (Spieluhr), snare, timpani (Pauke), brass (tuba/horn/trumpet), fife (Querflöte), cymbal (Becken) |
| `klaenge.py` | Geräusche: whoosh, step (Stein/Gras), creak, clink, pop, impact, sparkle, clack, rustle, ring, water, crowd, air, birds, heartbeat, buzz, tick, stamp, beep, gurgle, gasp, typewriter, alarm, glocke (Kirchenglocke, `f0` = Grösse), moewe (Möwenschrei), drip (Tropfen im Tunnel, `tropfen`, `echo`), rush (Wasser rauscht im Kanal, Bett, `staerke` 0–1), splash (Plantschen, `gross` 0,3–1,5), fire (knisterndes Feuer, Bett, `knistern` 0–2), sheep (Schaf „mäh“, `f0`), coins (Münzen klimpern, `anzahl`), winch (knarrende Seilwinde, `klicks`/s), note (Instrumententon als Ereignis) |
| `musik.py` | Musik aus Abschnitten (Akkorde je Takt + Stimmung); 15 Stimmungen; jeder Abschnitt auf gleiche Lautheit eingestellt |
| `render.py` | Ton-Datei → `mix.wav`, `music.wav`, `sfx.wav`, `ereignisse.json`, `messung.json` |
| `voiceover.py` | Voice-over anlegen (Guide Schritt 9): Aufnahme + Skript (.docx) + finales Video → `<ID>_sequenceNN.mp4` (Abschnitt unten) |
| `selbsttest_voiceover.py` | Selbsttest von `voiceover.py` mit künstlicher Stimme (Kurz- und Langform), Teil von `npm test` |
| `vergleich.py` | Mischung A ↔ B (z. B. vorher ↔ nachher): Lautheitsverlauf, Spektrogramm, Klangfarbe (Bild + JSON) – Hilfe für den Hörvergleich |

## Stimmungen
| Gruppe | Stimmungen |
|---|---|
| hello (fröhlich) | bouncy, old (1520er: Pfeife + Bordun), light, phone, sparse, full |
| zombie (traurig) | box (Spieluhr), warm, drone, vibes, end |
| outbreak (angespannt) | calm, tense, pulse, dark |

## Ton-Datei (Eingabe)
```json
{ "dauer": {"frames": 1740, "fps": 30},
  "musik": {"bpm": 120, "abschnitte": [{"ab": 0, "akkorde": ["C", "Am", "F"], "stimmung": "bouncy"}], "stumm": [[69.5, 74]], "schluss": true},
  "betten": [{"klang": "air", "ab": 0, "bis": 58, "db": -11}],
  "ereignisse": [{"t": 3.25, "klang": "whoosh", "db": -4, "pan": 0.0, "dauer": 1.4}],
  "reihen": [{"klang": "step", "zeiten": [24.05, 24.6], "db": -9, "angaben": {"surface": "stein"}}],
  "ziel": {"lufs": -22.6, "spitze_dbtp": -2, "musik_zu_sfx_db": 2} }
```
- `db` ist **gehörte** Lautstärke: 0 dB = Ereignis mit höchster Momentan-Lautheit −20 LUFS, Bett mit −30 LUFS integriert.
- **Hall:** `"hall"` (0 … 1, Standard 0,15) am Ereignis = Anteil im Raumhall; Betten haben keinen Hall. Stimmen im Bad oder
  Gewölbe: `crowd` als Ereignis mit `"dauer"` (Länge der Szene) und `"hall": 0.6–0.8`; Tropfen im Tunnel: `drip` mit `"hall": 0.4–0.6`.
- Musik-Abschnitte: jede Stimmung wird auf ihren Normalpegel gebracht; `"db": 3` hebt einen Abschnitt danach um 3 dB an
  (negativ = leiser). **Langform-Bildpause** (nur Animation + Musik, z. B. Kapitel panorama): `"bildpause": true` stellt
  den Abschnitt um die Mitte von `formats.long-form.audio.bildpauseMusikDb` in `shared/design-tokens.json` (heute 2,5 dB)
  **über die Musik der Abschnitte davor und danach**, egal welche Stimmung er hat; ein eigenes `db` geht vor.
  `messung.json` meldet unter `lauter_abschnitte`, wie viel lauter solche Abschnitte in Musik und Mischung wirklich sind
  als die Nachbar-Abschnitte (`musik_unterschied_db`, `mix_unterschied_db`; `soll_db` = geplanter Unterschied).
- Die Mischung wird am Ende auf das Ziel gebracht (Standard aus `shared/design-tokens.json` → `audio`: −22,6 LUFS, Spitze ≤ −2 dBTP); Musik liegt 2 dB über den Geräuschen. Ohne `ziel` gelten die Token-Werte.
- Heimat der Ton-Datei: der Produktionsordner, Name `V####_datum_ton_<titel>_vNN.json`; nach dem Abschluss `_archive/<ID>_quelle/`.
- `betten` dürfen jeden Klang nutzen (meist air, water, crowd, buzz); `video` und `herkunft` sind nur Beschreibungen.

## Voice-over anlegen (`voiceover.py`)
| | |
|---|---|
| **Zweck** | Aus der Sprachaufnahme des Nutzers das fertige Video machen (Guide Schritt 9) |
| **Eingaben** | Produktionsordner mit genau einer Aufnahme (.mp3/.wav/.m4a/.flac, Name beliebig), dem Skript `*_skript_*.docx` und dem finalen Video `*_video_*.mp4` (je die höchste Version; Word-Sperrdateien `~$…` – Skript gerade in Word offen – und versteckte Dateien werden übersprungen); Musik + Geräusche aus der Ton-Datei des Videos (Ordner oder `_archive/<ID>_quelle/`, neu erzeugt), sonst aus der Tonspur des Videos. Andere Dateien mit `--aufnahme`, `--skript`, `--video`, `--ton`, `--bett-aus-video` |
| **Ausgaben** | `<ID>_sequence01.mp4` im Produktionsordner (gibt es das schon: sequence02 …; nie überschrieben; `--ziel` für einen anderen Ort); Arbeitsordner `output/<ID>_voiceover/` mit `bericht.md`, `bericht.json`, `mix.wav` |
| **Abhängigkeiten** | numpy, scipy, python-docx, ffmpeg/ffprobe (`tools/ffmpeg/bin/` oder `FFMPEG_DIR`) |

Ablauf: Sprechstellen in der Aufnahme finden (Lautstärke über dem Rauschboden, Lücken < 0,12 s zählen als Wort-Inneres) →
der Reihe nach den Zeilen der Script-Tabelle zuordnen (dynamische Optimierung: Dauer passt zur Silbenzahl, Grenzen in langen
Pausen; Silben aus dem Reintext, Sätze der Reihe nach den Zeilen zugeteilt) → jede Zeile startet auf ihrer Zeitmarke, frühestens
0,15 s nach dem Ende der vorigen (nie früher, nie schneller abgespielt) → Stimme: Tiefen unter 80 Hz weg, leicht verdichtet,
−15 LUFS → Musik + Geräusche −1 dB und unter der Stimme 8 dB geduckt (weich) → Mischung −14 LUFS, Spitze ≤ −1 dBTP → Bild
kopiert. Langform: Kapitel-Zeilen werden mitgelesen, Zeilen ohne Text (panorama) bleiben ohne Stimme, `[pause …]` zählt nicht.
Bericht: je Zeile Stelle in der Aufnahme, geplante und tatsächliche Zeit, Verschiebung, Dauer/Soll; Warnungen bei mehr als
1,5 s Verschiebung, „unsicher“ (Dauer mehr als 1,45× neben der Silbenzahl – Versprecher, doppelter Take) und bei Stimme nach
Videoende. Unsichere Zuordnung von Hand: `--zuordnung z.json` mit `[[von, bis], …]` (Sekunden in der Aufnahme) je Sprech-Zeile.
Zielwerte stehen oben im Code (`STANDARD`); Tokens `audio.voiceover` in `shared/design-tokens.json` gehen vor, wenn vorhanden.

## Befehle (aus dem Hauptordner)
```bash
python audio/v01/render.py _archive/V0002_quelle/V0002_2026-11-09_ton_why-do-we-use-the-word-hello_v02.json output/ton
python audio/v01/voiceover.py productions/V000X_.../
python audio/v01/vergleich.py <vorher/mix.wav> output/ton/mix.wav output/ton/vergleich.png hello
tools/ffmpeg/bin/ffmpeg.exe -i video.mp4 -i output/ton/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -shortest video_mit_ton.mp4
```
