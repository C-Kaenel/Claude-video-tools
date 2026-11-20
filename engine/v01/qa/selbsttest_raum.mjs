// Herkunft: eigen (V-Video), geschrieben 2026-11-13, ohne Vorlage.
// Selbsttest der Raum-Prüfung (jederzeit wiederholbar): lässt qa/raum.mjs über die Prüf-Story qa/raumtest/ laufen –
// einmal im Hochformat (RaumTest, Kurzform 9:16) und einmal im Querformat (RaumTestQuer, Langform 16:9).
// Dort hat jeder Shot genau einen eingebauten Fehler (flackern, Fenster in Tür, steckt in, läuft durch, durcheinander,
// Gesicht am Rand, Kopf verdeckt, falsche Epoche) – jeder muss gefunden werden; die Shots "sauber" und "baeume"
// (Kronen wachsen ineinander, erlaubt) und "wuerfelkopf" (Würfel-Kopf, nicht verdeckt) dürfen keinen Fund haben; "sauber" und
// "vogel" (zusammengefasste Welt mit userData.objekte, Kamera 120 m weg) müssen genug Details zählen. Weit vom Weltmittelpunkt
// (x = 5400): "fern-flackern" (gekippt, deckungsgleich) muss gefunden werden, "fern-schichten" (0,6 m übereinander) nicht.
// Prüfbilder und uebersicht.png liegen danach in <ausgabe-ordner>/hoch und /quer.
// Aufruf (aus dem Hauptordner, dauert ~1 Minute): node engine/v01/qa/selbsttest_raum.mjs [ausgabe-ordner]
// Rückgabe 0 = alles gefunden, kein Fehlalarm; 1 = etwas fehlt.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HIER, "..", "..", "..");
const basis = path.resolve(process.argv[2] ?? path.join(ROOT, "output", "selbsttest_raum"));
const TOKENS = JSON.parse(fs.readFileSync(path.join(ROOT, "shared", "design-tokens.json"), "utf8"));
const DETAILS_MIN = TOKENS.look?.ziel?.detailsMin ?? 6;
const ERWARTET = {
  sauber: null, flackern: "flackern", "fenster-tuer": "fenster-tuer", "steckt-in": "steckt-in",
  "laeuft-durch": "laeuft-durch", durcheinander: "durcheinander", anschnitt: "anschnitt", verdeckt: "verdeckt", zeit: "zeit",
  baeume: null, wuerfelkopf: null, vogel: null, "fern-flackern": "flackern", "fern-schichten": null,
};

const results = [];
const expect = (label, ok, info = "") => { results.push(ok); console.log(`${ok ? "  ok    " : "  FEHLT "}${label}${info ? `  (${info})` : ""}`); };
for (const [comp, ordner, label] of [["RaumTest", "hoch", "Hochformat 9:16"], ["RaumTestQuer", "quer", "Querformat 16:9"]]) {
  const out = path.join(basis, ordner);
  fs.rmSync(path.join(out, "raum.json"), { force: true });
  console.log(`Raum-Prüfung über ${comp} (${label}) …`);
  const r = spawnSync(process.execPath, [path.join(HIER, "raum.mjs"), path.join(HIER, "raumtest", "index.tsx"), comp, out],
    { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, RAUM_LANG: "" } });
  const datei = path.join(out, "raum.json");
  if (!fs.existsSync(datei)) { expect(`${comp}: Raum-Prüfung lief`, false, `Rückgabe ${r.status}`); continue; }
  const je = Object.fromEntries(JSON.parse(fs.readFileSync(datei, "utf8")).map((e) => [e.shot, e]));
  for (const [shot, art] of Object.entries(ERWARTET)) {
    const e = je[shot];
    if (!e || !e.geprueft) { expect(`${ordner} ${shot}: geprüft`, false, "keine Rückmeldung"); continue; }
    const arten = [...new Set(e.funde.map((f) => f.art))];
    if (art === null) expect(`${ordner} ${shot}: keine Funde`, e.funde.length === 0, arten.join(", "));
    else expect(`${ordner} ${shot}: „${art}“ gefunden`, arten.includes(art), arten.filter((a) => a !== art).length ? `dazu: ${arten.filter((a) => a !== art).join(", ")}` : "");
  }
  expect(`${ordner} sauber: mindestens ${DETAILS_MIN} Details`, (je.sauber?.details ?? 0) >= DETAILS_MIN, `${je.sauber?.details ?? 0} gezählt`);
  expect(`${ordner} vogel: zusammengefasste Welt (userData.objekte) aus 120 m – mindestens ${DETAILS_MIN} Details`, (je.vogel?.details ?? 0) >= DETAILS_MIN, `${je.vogel?.details ?? 0} gezählt`);
  expect(`${ordner} flackern: Hinweis „wenig Details“`, (je.flackern?.details ?? 99) < DETAILS_MIN, `${je.flackern?.details ?? "?"} gezählt`);
  expect(`${ordner} uebersicht.png erstellt`, fs.existsSync(path.join(out, "uebersicht.png")));
}

const bad = results.filter((ok) => !ok).length;
console.log(`ERGEBNIS: ${bad ? `${bad} Prüfungen fehlgeschlagen` : "alles gefunden, kein Fehlalarm (Hoch- und Querformat)"}`);
console.log(`Prüfbilder: ${basis} (hoch/ und quer/: uebersicht.png, shot_<id>.png, raum.md)`);
process.exit(bad ? 1 : 0);
