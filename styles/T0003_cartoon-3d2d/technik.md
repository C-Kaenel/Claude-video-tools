# T0003 cartoon-3d2d – Technik-Notizen und Fallen

Herkunft: eigen (V-Video). Gilt nur für diesen Stil (Skill K0002). Allgemeine Notizen (alle Stile) stehen in
`docs/projektstand.md`. Jede Notiz: was passiert · warum · was man tut. Nur der heutige Stand.
Gepflegt von der Sitzung Cartoon-3D2D.

## Kamera und Bild
- Stösse (`kicks.amp`) sind Meter am Blickpunkt: 0,003–0,007 (≈ 4–9 px). Schieben (`push`) nie bei sehr fernem Blickpunkt.
- Blickpunkt nicht in ein Haus legen (Stufe und Gesims zählen zum Haus) – sonst wird es ausgeblendet. `PROPS='{"debug":true}'`
  zeigt, was ausgeblendet wird. Schilder 0,3 m vor die Fassade (Gesimse schneiden sonst).
- Langformat (16:9): `langformat(story)` in `szene.ts`; gleiche Kameras, das Querbild zeigt seitlich mehr – neue Bauten immer auch
  im Querformat prüfen (`Rezepte-Lang`, `Weltbogen-Lang`). Totale `abstand` 0,8, Nahaufnahme 1,2; Karten neben die Figur.

## Kapitel-Module (Langformat)
- `kapitel.ts` liest alle Werte aus `formats.long-form` (kapitelArten, creepPctPerFrame, crossfadeFrames, chapterTitleSec,
  audio.bildpauseMusikDb); Zeiten in `cast`/`fx` eines Takts zählen ab Takt-Beginn. Titelkarte vor der **Halbnah**-Kamera (bei
  steilen Totalen, z. B. Kirche, stünde die Karte schräg). Prüf-Story `pruefung/kapitel.tsx`; die Ton-Datei dazu baut
  `kapitelTonDatei()` (mit esbuild bündeln, `--loader:.ttf=file`). Musik-Abschnitt des panorama mit `"bildpause": true` – audio/v01 stellt ihn 2,5 dB über die Nachbarn (gemessen in
  messung.json `lauter_abschnitte`); ein festes `db` wirkt nur relativ zur Stimmung (calm ist leiser) und reicht nicht.

- Kapitel aufruf: Standbild = Szene `standbild` (Sekunde im Shot, auch negativ; Welt, Requisiten, Figuren und Karten stehen, nur
  Karten mit `frei` laufen) – kein Eingriff in den Motor. Die Unschärfe ist die Tiefenschärfe (`focus`, Fokus auf der Karte nah vor der
  Linse); weil sie je Shot fest ist, steigt sie in 5 Shots à 2 Frames an (`AUFRUF_UNSCHAERFE`). Zeitmass vom Nutzer-Beispiel
  (gemessen 2026-11-15, nur Zahlen): eine Leiste mit drei Teilen, Aufploppen 0,25 s, Klicks im Abstand von etwa 1,5 s, ganz 6,5 s.
- Spannung, Mythos und Nacht-Themen bei Tageslicht bauen (`golden` nur für echte Abend-Szenen): im Querbild fällt Abendlicht unter
  die Helligkeits-Schwelle der Prüfung (gemessen 0,19–0,23 statt ≥ 0,30, Prüf-Video Kapitel v02) und wird als „dunkel“/„monoton“ gemeldet.

## Figuren und Karten
- Karten (Figuren) zeichnen auf einer Leinwand; neu gezeichnet wird nur bei geändertem Zustand. 2D-Bögen brauchen eine eigene
  `delayRender`-Sperre bis nach dem Zeichnen; `useGate` erwartet eine Liste (`() => [fontsReady()]`).
- Figuren sind Karten, die immer zur Kamera schauen (keine Rückenansicht).
- Figuren je Epoche: `FigureSpec.zeit` (stadt/hanse/korea), `crowdSpecs(…, zeit)`; `menge()` nimmt die Welt der Szene; die Raum-Prüfung
  meldet fremde Figuren (Art `zeit`), Ausnahme `zeitFrei: true`. Zweite, hohe Wolkenschicht in allen Welten.
- Hanse-Figuren B0089–B0094 (neuer Hut `eisenhut`); Mengen nehmen sie nicht auf (sonst sähen fertige Videos neu gerendert anders aus).
- Nord-Figuren B0100–B0107 (Wikinger um 900): Helme `spangenhelm` (Brillen-Visier folgt Blick und Ansicht), `nasalhelm`, `lederkappe` – nie
  Hörner; Haare `zoepfe`; `bart` (voll, zopf, zwei – der Kopfumriss endet über dem Kinn, sonst schneidet er den Bart), `borte`,
  `mantel`, `kette`, `schuerze` (mit `fibeln` = Trägerkleid), `schild` (links), `ding` (rechts: Speer und Ruder stehen senkrecht, Axt,
  Hammer, Schwert folgen dem Unterarm). `crowdSpecs(…, "nord")` macht eine passende Menge.

## Orte, Rezepte, Requisiten
- Szenen-Rezepte (`library/rezepte/`, B0073–B0078 und B0084–B0088, 11 Orte in allen drei Welten): Orte für neue Videos zuerst daraus
  (`rezept`, `rezeptPunkt`, `rezeptKamera` in `szene.ts`); nach Änderungen an Welten oder Rezepten neu prüfen (Prüf-Story
  `pruefung/rezepte.tsx` + `rezepte_eintragen.py`). Welt-Funde (kleine Flächen an Hanse-Giebelhaus-Fenstern, je < 0,01 m²) stehen
  im Rezept unter `welt_funde`.
- Requisiten je Epoche (`world/props.ts`, Szene `props`): karren, brunnen, koerbe, onggi (Korea), huehner, holzstapel; Farben in
  den Tokens `color.cartoon-3d2d.world.requisiten`.
- Bodenflächen nie in derselben Höhe überlappen lassen (auch 1 cm Abstand flackert in der Ferne) – Flächen aneinanderstossen
  oder 2–3 cm tiefer legen. Laufwege nie durch Requisiten (Ware, Kransockel) legen.
- Ferne = starker heller Nebel, nie dunkel: Nebel Tag 25–200 m, Abend 50–260 m (Tokens `fogNearM`/`fogFarM`), und die
  Welt-Tusche geht mit dem Nebel ganz in die Nebelfarbe über (`fogTint: 1` in `style.ts`) – sonst verdichten sich ferne
  Linien (Pflaster, Felder) zu schwarzen Flächen. Hügel und Berge hinter ~150 m verschwinden dabei im Dunst.

## Stadt um 1900 (`welt: "stadt"`)
- Stadt-Häuser: jedes zweite Haus hat Sockel, Gesimse und Dach 1,2 cm versetzt (`versatz`), sonst flackern die Überstände der Nachbarn.
  Folge: V0002/V0003 neu gerendert sehen an diesen Kanten minimal anders aus; Teil-Render bricht dort ab → ganz rendern.
- Stadt-Park rundum von Häusern umgeben (Zeile Nord z −25, Zeile Ost x 143, Querhaus West); Westende der Strasse mit einem Querhaus
  geschlossen (x −260,6). Überlappende Baumkronen sind erlaubt (die Raum-Prüfung meldet sie nicht mehr).

## Hanse um 1400 (`welt: "hanse"`)
- Giebelhäuser der Strassenzeilen abwechselnd mit 1,2 cm Versatz an Sockel und Gesimsen (`versatz`), sonst flackern die
  Überstände der Nachbarn.
- Marktplatz x 93–141, z −6,5…−29, rundum von Giebelhäusern geschlossen (Häuser am Markt x 60–175, Querhäuser an West-/Ostseite);
  Kirchturm-Front bei z −29 (`HANSE_KIRCHE_Z`) – Blickpunkte davor legen, sonst blendet der Sichtlinien-Schutz Turm oder Häuser aus;
  V0005/V0006 neu gerendert zeigen die Kirche dort.
- Häuser bei z −6,5, ihr Hüllquader reicht wegen Windenbalken, Schild, Markise und Bank bis z −5,2 – Blickpunkte und Figuren vor
  z −4,9 legen. Kai z 3,5–10, Koggen z 14,6, Wasser ab z 10. Kamera Richtung Wasser (Blick nach +z) spiegelt links/rechts (+x ist
  dann links im Bild). Koggen-Segel-Material nie klonen (Textur-Shader bricht). Karten in Nahaufnahmen klein halten: das Kriechen
  der Kamera schiebt sie an den Rand (Safe Area).
- Fachwerk: Ständer nie durch ein Fenster, Streben hinter Rahmen und Sprossen (Vorderseite 5 cm), Riegel 1 cm schmaler als das
  Haus; Leuchtscheiben der Fenster am Abend 1 cm vor der Wand – sonst flackern Flächen (im Querbild sichtbar). V0005/V0006 neu
  gerendert sehen an Fachwerkhäusern minimal anders aus.

## Nord um 900 (`welt: "nord"`)
- Gelände aus vier Schichten (Gras, Fels, Schnee, Kies) auf demselben 3-m-Raster: jede Schicht liegt dort, wo sie gilt, auf der
  Höhe, sonst 0,8 m tiefer – nie zwei Flächen in einer Ebene. Kleinräumige Muster über die Schichten (z. B. dunkle Felsflecken)
  werden treppig – Abwechslung gehört in die Textur (`felswand`: Bänder, Risse, Moos, Kachel 24 m).
- Dorfwiese flach (Höhe 0) bei |x| < 120, z −45…0; Strand fällt bis z 16 auf −2,4 m (Wasserlinie z ≈ 9). Bodenhöhe immer mit
  `nordGroundAt` (liest die gezeichneten Dreiecke).
- Bäume: Krone muss am Stamm hängen – bei schrägem Stamm die Achse in jeder Höhe rechnen (Drehung um die Stamm-Mitte), Stamm bis in
  die Krone führen, unterster Kronen-Ballen fest auf dem Stamm (sonst schwebt die Krone).
- Dorf: Wege sind eine eigene Geländeschicht (`aufWeg`), keine aufgelegte Fläche. Weg und Gras liegen im flachen Dorf nur 0,15 m versetzt (bei 0,8 m
  zeichnet die Tusche den Knick an der Weggrenze als schwarzen Strich). Grundrisse in `GRUNDRISSE`/`nordFrei` halten
  Gras, Steine und Bäume aus Bauten heraus. Langhäuser sind keine Sichtlinien-Teilnehmer (Kameras dürfen hinein); Aufnahmen innen
  mit `nord: { innen: true }` (grosses Haus ohne Schatten, sonst ist es innen dunkel). Innenpfosten enden unter dem Dach
  (`dachY`), sonst stechen sie oben heraus; Blickpunkte nie in den Grabhügel oder den Bootsschuppen legen.
- Schiffe (`nord-schiffe.ts`): Rumpf aus Plankengängen (Bänder), beidseitig sichtbar über `kit.mat(farbe).side = DoubleSide` –
  Materialien nie klonen (Zwei-Ton-Shader bricht). Der Boden liegt 10 cm über der Wasserlinie und folgt der Rumpfform, sonst sieht
  man innen das Wasser; Spanten enden unter der Bordwand. Auf dem Strand setzt die Welt den Kiel auf den Kies (kein Schaukeln).
- Winter (`nord: { winter: true }`): Schnee statt Wiese, Laub zum Schnee hin gemischt, Schneekappen (flacher weisser Ballen, ragt oben
  heraus), runde Flocken als Punkte um die Kamera, fest in der Welt (die Kamera fährt hindurch).
- Requisiten und Tiere (`nord-requisiten.ts`): mit `dorf` stellt die Welt sie selbst auf (Schmiede, Vorplatz des grossen Hauses,
  Dorfplatz, Hafen, Thingplatz); in einer Szene einzeln mit `props: [{ kind: "nordteil", art: "esse", … }]` (Liste
  `NORD_REQUISITEN`). Bewegte Teile (Glut, Feuer, Kessel, Fahnen, Tiere) sind `Lebendig` – nie `visible = false`, sondern klein
  skalieren. Neue Requisiten mit Grundriss in `GRUNDRISSE` eintragen, sonst wachsen Gras und Steine hinein. Die Zeichen auf dem
  Runenstein sind eigene Formen, keine echte Inschrift.

## Bayreuth 1876 (`welt: "bayreuth"`)
- Drei Orte in einer Welt: aussen um x 0, Saal mit Bühne um x 400 (`BAY_SAAL_X`), Garderobe um x 470 – innen sieht man nie den Himmel.
  Der Rasen aussen lässt x 340…520 frei (sonst läge er im Orchestergraben). Figuren sind Epoche „stadt“ (die Raum-Prüfung nimmt
  „stadt“ für diese Welt). Bodenhöhe immer mit `bayreuthGroundAt` (Bühne 1,2 m, Graben −2,5 m, Reihen steigen je 0,22 m);
  der Dirigent steht auf dem Podest (`groundY: -2.2`).
- Innen werfen Teile keinen Schatten (sonst liegt alles im Schatten der Decke). Vorhang: `bayreuth: { vorhang: 0 | 1 | { t0, t1 } }`.
- Blickpunkt aussen nie ins Festspielhaus legen (Sichtlinien-Schutz blendet es aus). Ferne kleine Teile (Blumenbeete, Hügel) werden
  durch die Tusche schwarz – in der Ferne grössere Formen (Büsche, Töpfe) oder ohne Tusche (Park-Wald, `NOINK`).
- Karten zum Wikinger-Mythos (B0112–B0119): `hoernerhelm` (strich), `helmvergleich` (haken), `fundstueck`, `veksoe`, `runen`
  (fortschritt; Buchstaben → jüngeres Futhark), `skizzenblock` (fortschritt), `notenblatt` und `rabe` laufen von selbst (`zeit`).
- Hörner- und Flügelhelm sind Opern-Erfindungen von 1876 (Hüte `hoernerhelm`, `fluegelhelm`; 3D `hoernerhelm3D`, `fluegelhelm3D`) –
  nie für Wikinger-Figuren der Nord-Welt.

## Rom, frühe Kaiserzeit (`welt: "roemer"`)
- Die Strasse liegt bei x 0 und läuft nach Norden (−z); die Kamera steht meist im Süden. Baustelle z 21…76 (Graben −1,2 m, Schichten
  treppenartig: Steine bis z 64, Kies bis 54, Mörtel bis 44, Pflaster bis 36), Groma-Wiese z 80…130, Lager links (x −14…−36),
  Fluss mit Steinbrücke z −134…−186 (Wasser −4,6 m), Forum als eigener Platz bei x 670…730 (Boden 0,12 m).
- Bodenhöhe immer mit `roemerGroundAt` (Graben, Böschungen, Flussufer). Die Erdschichten im Schnitt liegen je Schicht etwas tiefer
  (Versatz gegen Flackern); Zierstreifen und Fransen am Feldzeichen haben eigene Dicke (nie bündig).
- Requisiten einzeln: `props: [{ kind: "roemerteil", art, at, turn? }]` (`ROEMER_REQUISITEN`); bewegt (Lote der Groma, Feldzeichen,
  Ochsen, Feuer) nur aus der Shot-Zeit. Meilenstein-Zahl: `roemer: { meilenZahl: "XII" }`.
- Figuren: Epoche „roemer“ (Tunika mit Saum und Gürtel, Galea, Petasus, Toga mit Purpursaum, Lorica, Scutum, Pilum, Dolabra,
  Messlatte, Groma). Römer-Karten B0135–B0139: `groma` (sicht), `strassenschichten` (fortschritt 0…4), `meilenstein` (wert zählt
  hoch), `strassennetz` (fortschritt), `heute-alt-neu` (wisch).

## Wasser im alten Rom (`welt: "aqua"`)
- Zwölf Zonen nebeneinander in x (Zone k bei x = k · 600: quelle, bruecke, bogenreihe, tunnel, siphon, wasserwerk, strasse, thermen,
  cloaca, fruehrom, innen, heute). Gebaut wird nur, was nahe an einer Kamera liegt (Kamera-x ± 420 m); `aqua: { zonen: [...] }` baut
  weitere immer. Darum nie eine Kamera zwischen zwei Zonen stellen: die Orte `AQUA_PLACES` (Weltkoordinaten) sind geprüfte Startpunkte.
- Bodenhöhe immer mit `aquaGroundAt` (Tal unter der Brücke −40, Tunnel −12,45, Siphon-Tal −22, Flussufer der Cloaca −4). Eigene
  Kameras in Tälern (Brücke, Siphon) immer über `aquaGroundAt(x, z)` + 2 m stellen – unter dem Hang sieht man weisse Flächen und lange Striche.
- Gelände-Schichten (Gras, Erde, Kies, Acker, Fels) enthalten nur Dreiecke mit einem eigenen Punkt; ganz abgesenkte, verdeckte Flächen
  gibt es nicht (weniger Dreiecke, kein Übereinander von Schichten).
- Wasser fliesst nur aus der Shot-Zeit (Flächen mit Strömung, Strahlen, Spritzer); Wasserflächen liegen etwas über dem Beckenboden
  (nie bündig). `ueberlauf` lässt den Löwenbrunnen der Strasse überlaufen, `dickeDuese` (0…11) wählt die goldene, zu dicke Düse im
  Wasserschloss. Die Innenräume (Büro, Küche, Werkstatt, Atrium) stehen in der Zone innen nebeneinander; Licht dort meist `golden`.
- Requisiten einzeln: `props: [{ kind: "aquateil", art, at, turn? }]` (`AQUA_REQUISITEN`: Vermessung, Tretkran, Haspel, Bleirohre, Düsen,
  Brunnen, Krüge, Wäsche, Tiere, Forschungsboot, Bohrkern, Feuer, Dampf …).
- Figuren: Epoche „roemer“ (B0145–B0163); forscherin-heute (B0164) hat keine Epoche – im Zonen-Teil heute mit `zeitFrei`.
- Wasser-Karten B0165–B0174 (`engine/v01/cards/aqua-karten.ts`): `gefaelle` (neigung 0…2, beule, pfeil, fluss), `siphon` (fuellung),
  `bleirohr` (kalk, warnung), `verteiler` (pegel: zuerst stoppen die Häuser, dann die Bäder), `wasserkarte` (fortschritt, Zähler),
  `balkenvergleich`, `pool-uhr`, `amtsstempel` (druck), `bohrkern` (fortschritt), `becher-rangliste` (zeigen).

## Korea, Joseon und früher (`welt: "korea"`)
- Mauern sind keine Sichtlinien-Teilnehmer (ein langes Netz – sein Hüllquader würde ganze Täler ausblenden). Figuren auf einen
  Mauerpfad stellen (`KOREA_WALLS`), dann stehen sie auf der Krone. Der Mauerring der Bergfestung ist nur in x verformt
  (Vorderseite bei z −27). Die Brustwehr liegt aussen: Kamera für Figuren auf der Mauer auf die Innenseite stellen.
- Gelände ist ab z −6 nach Norden hügelig – Kamerahöhe mit `koreaHeight(x, z)` rechnen. Blickpunkt nie hinter ein Tor oder Haus
  und nie in einen Torsockel legen (Sichtlinien-Schutz blendet es sonst aus).
- Überlappende Teile nie mit Flächen in derselben Ebene bauen (flackert) – um wenige cm versetzen. Bauten für die Innenseite:
  `hall`, `granary`, `watchtower`, `hanok`.
- Kulissen-Karten (erdhuegel, reiter, kanone, steinblock) und Gras-Details zählen nicht für die Safe Area. Gehende Figuren nie mit
  fester Haltung (hold, point …) – die ersetzt die Schritte, sie gleiten dann.
- Erdhügel-Karte vor der Ringmauer: 13 m hoch bei [−302,6, −23,2] (mit `boden: true`); Figuren am Hang nur in der Lücke
  x −303…−295 (Strohhäuser).
