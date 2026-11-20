// Herkunft: eigen (V-Video), geschrieben 2026-11-11, ohne Vorlage.
// Raum-Prüfung eines Motor-Videos: baut jeden Shot einmal auf (Eingabe qa: "raum"), sucht Positionsfehler (qa/raum.ts) –
// flackernde deckungsgleiche Flächen, Fenster in Türen, Objekte ineinander, Figuren durch Objekte oder durcheinander,
// Gesichter am Bildrand oder verdeckt – und schreibt Bericht + ein Prüfbild je Shot mit roten Marken + uebersicht.png
// (alle Shots auf einem Bild). Konsole knapp: nur Shots mit Funden und das Ergebnis (ausführlich mit RAUM_LANG=1).
// Aufruf: node engine/v01/qa/raum.mjs <einstieg.tsx> <Composition> <ausgabe-ordner> [shot-id,shot-id]
// Rückgabe 0 = keine Funde, 1 = Funde (Bericht ansehen).
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { browserExecutable, buendel, concurrency, gl, python } from "./env.mjs";
import { fileURLToPath } from "node:url";
const TOKENS = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "shared", "design-tokens.json"), "utf8"));
const DETAILS_MIN = TOKENS.look?.ziel?.detailsMin ?? 6;
const { renderStill, selectComposition } = await import("@remotion/renderer");

const [entry, comp, out, nur] = process.argv.slice(2);
if (!out) { console.log("Aufruf: node engine/v01/qa/raum.mjs <einstieg.tsx> <Composition> <ausgabe-ordner> [shot-id,…]"); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const inputProps = { qa: "raum" };
const chromiumOptions = { gl };
const serveUrl = await buendel(entry);
const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions });
const z = composition.defaultProps?.zeitplan;
if (!z) { console.log("Composition hat keinen Zeitplan (kein Motor-Video?)"); process.exit(1); }
const shots = z.shots.filter((s) => !nur || nur.split(",").includes(s.id));

const ergebnis = [];
for (const s of shots) {
  let zeile = null;
  const onBrowserLog = (l) => { if (l.text.startsWith("[Raum] ")) zeile = JSON.parse(l.text.slice(7)); };
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, inputProps, frame: s.start + Math.floor((s.end - s.start) / 2), output: path.join(out, `shot_${s.id}.png`),
    imageFormat: "png", scale: 0.4, browserExecutable, chromiumOptions, timeoutInMilliseconds: 300000, onBrowserLog, logLevel: "error" });
  const funde = zeile?.funde ?? [];
  ergebnis.push({ shot: s.id, start: s.start, end: s.end, geprueft: !!zeile, details: zeile?.details ?? null, detailNamen: zeile?.detailNamen ?? [], funde });
  if (process.env.RAUM_LANG || !zeile || funde.length) console.log(`${s.id}: ${zeile ? `${funde.length} Funde, ${zeile.details} Objekte im Bild` : "NICHT GEPRÜFT (keine Rückmeldung)"} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const ARTEN = { flackern: "Flackern (deckungsgleiche Flächen)", "fenster-tuer": "Fenster in Tür", "steckt-in": "Objekt steckt in Objekt",
  "laeuft-durch": "Figur durch Objekt", durcheinander: "Figuren durcheinander",
  anschnitt: "Gesicht am Bildrand", verdeckt: "Kopf verdeckt",
  zeit: "Figur passt nicht in die Welt (Epoche)" };
const alle = ergebnis.flatMap((e) => e.funde.map((f) => ({ ...f, shot: e.shot })));
let md = `# Raum-Prüfung ${comp}\n\nShots geprüft: ${ergebnis.filter((e) => e.geprueft).length} von ${ergebnis.length} · Funde: ${alle.length}\n` +
  `Prüfbilder: \`shot_<id>.png\` (Mitte des Shots, rote Punkte = Fundstellen).\n\n`;
for (const [k, label] of Object.entries(ARTEN)) {
  const f = alle.filter((x) => x.art === k);
  md += `## ${label}: ${f.length}\n\n`;
  if (f.length) md += "| Shot | Bild | Was | Ort (x, y, z) |\n|---|---|---|---|\n" + f.map((x) => `| ${x.shot} | ${x.bild ?? "–"} | ${x.was} | ${x.wo.map((v) => v.toFixed(2)).join(", ")} |`).join("\n") + "\n\n";
}
const leer = ergebnis.filter((e) => e.geprueft && e.details < DETAILS_MIN);
md += `## Hinweis: wenig Details (weniger als ${DETAILS_MIN} 3D-Objekte im Bild): ${leer.length}\n\n` +
  (leer.length ? leer.map((e) => `- ${e.shot}: ${e.details} Objekte`).join("\n") + "\n\n" : "");
const nicht = ergebnis.filter((e) => !e.geprueft);
if (nicht.length) md += `## Nicht geprüft\n\n${nicht.map((e) => `- ${e.shot}`).join("\n")}\n`;
fs.writeFileSync(path.join(out, "raum.md"), md);
fs.writeFileSync(path.join(out, "raum.json"), JSON.stringify(ergebnis, null, 1) + "\n");
spawnSync(python, [path.join(path.dirname(fileURLToPath(import.meta.url)), "uebersicht.py"), out], { stdio: "ignore" });
const proArt = Object.keys(ARTEN).map((k) => [k, alle.filter((x) => x.art === k).length]).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(", ");
console.log(`ERGEBNIS: ${alle.length} Funde${proArt ? ` (${proArt})` : ""}${leer.length ? `, ${leer.length} Shots mit wenig Details` : ""}` +
  `${nicht.length ? `, ${nicht.length} Shots nicht geprüft` : ""}`);
console.log(`Bericht: ${path.join(out, "raum.md")} · Übersicht: ${path.join(out, "uebersicht.png")}`);
process.exit(alle.length || nicht.length ? 1 : 0);
