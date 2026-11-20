// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Prüft, ob zwei Dateien (oder zwei Ordner mit gleichnamigen Dateien) bytegleich sind – für die Determinismus-Prüfung.
// node engine/v01/qa/same.mjs <a> <b>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const [a, b] = process.argv.slice(2);
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const list = fs.statSync(a).isDirectory() ? fs.readdirSync(a).map((n) => [path.join(a, n), path.join(b, n)]) : [[a, b]];
let bad = 0;
for (const [x, y] of list) {
  const same = fs.existsSync(y) && sha(x) === sha(y);
  if (!same) bad++;
  console.log(same ? "gleich  " : "ANDERS  ", path.basename(x));
}
console.log(bad ? `${bad} von ${list.length} verschieden` : `alle ${list.length} bytegleich`);
process.exit(bad ? 1 : 0);
