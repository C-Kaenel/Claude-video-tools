// Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage.
// Teil-Render: legt eine Kopie eines fertigen Videos als neue Version an und rendert darin nur die geänderten Stellen neu.
// So geht es: Das Video besteht aus geschlossenen Bildgruppen (jede beginnt mit einem Schlüsselbild). Alle Bildgruppen,
// die eine geänderte Stelle berühren, werden mit Remotion neu gerendert (gleiche Einstellungen wie der volle Render);
// alle anderen werden unverändert übernommen (ohne neue Kompression). Danach wird der Ton wieder dazugelegt.
// Am Ende prüft das Skript Bild für Bild (Prüfsumme je Bild), dass ausserhalb der neu gerenderten Bereiche nichts anders ist.
//
// Aufruf (aus dem Hauptordner):
//   node engine/v01/render/teilrender.mjs <einstieg.tsx> <Composition> <basis.mp4> <ziel.mp4> --shots <id,id> [Optionen]
//   node engine/v01/render/teilrender.mjs <einstieg.tsx> <Composition> <basis.mp4> <ziel.mp4> --frames <von-bis,von-bis> [Optionen]
// Optionen:
//   --ton <mix.wav>   neuen Ton dazulegen (sonst wird der Ton der Basis übernommen)
//   PROPS='{…}'       Eingabe-Werte für die neu gerenderten Teile (wie bei stills.mjs)
//   --motor-geaendert Motor-Stempel weicht ab, trotzdem versuchen (dann entscheiden Stichproben, ob es gleich zeichnet)
//   --trotzdem        ohne jede Sicherung (weder Stempel noch Stichproben)
// Die Composition muss den neuen Stand enthalten (Story geändert, Composition-ID gleich lassen oder neue angeben).
// Sicherung vor dem Render: Motor-Stempel der Basis (render/stempel.mjs) gleich wie heute → sicher, los; anders → Abbruch mit
// den geänderten Teilen (ganz rendern); Basis ohne Stempel (ältere Renders) → Stichproben aus unveränderten Stellen.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { browserExecutable, buendel, concurrency, gl } from "../qa/env.mjs";
import { liesStempel, motorStempel, stempelArgs, unterschiede } from "./stempel.mjs";
const { renderMedia, selectComposition } = await import("@remotion/renderer");

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const [entry, comp, basis, ziel] = args;
if (!ziel || (!opt("--shots") && !opt("--frames"))) {
  console.log("Aufruf: node engine/v01/render/teilrender.mjs <einstieg.tsx> <Composition> <basis.mp4> <ziel.mp4> --shots <id,id> | --frames <a-b,…> [--ton mix.wav]");
  process.exit(1);
}

const ffDir = () => {
  const cands = [process.env.FFMPEG_DIR, path.resolve("tools/ffmpeg/bin")].filter(Boolean);
  for (const d of cands) if (fs.existsSync(path.join(d, os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg"))) return d;
  return "";   // dann aus dem Systempfad
};
const FF = path.join(ffDir(), os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg");
const FP = path.join(ffDir(), os.platform() === "win32" ? "ffprobe.exe" : "ffprobe");
const run = (bin, a, big = false) => execFileSync(bin, a, { encoding: "utf8", maxBuffer: big ? 1 << 30 : 1 << 26, stdio: ["ignore", "pipe", "pipe"] });

// 0. Motor-Stempel: zeichnet der Motor heute noch gleich wie beim Render der Basis? (vor allem anderen – kostet nichts)
const stempel = motorStempel(), basisStempel = liesStempel(basis);
let stichproben = !args.includes("--trotzdem");
if (basisStempel && stichproben) {
  const d = unterschiede(basisStempel, stempel);
  if (!d.length) { console.log("Motor-Stempel gleich wie in der Basis – Motor unverändert, Teil-Render sicher."); stichproben = false; }
  else if (!args.includes("--motor-geaendert")) {
    console.log(`ABBRUCH: Seit dem Render der Basis geändert: ${d.join(", ")}. Ein Teil-Render ergäbe womöglich ein gemischtes Video –\n` +
      "bitte das ganze Video neu rendern (oder mit --motor-geaendert versuchen: dann entscheiden Stichproben).");
    process.exit(2);
  } else console.log(`Motor-Stempel anders (${d.join(", ")}) – Stichproben entscheiden.`);
} else if (!basisStempel && stichproben) console.log("Basis ohne Motor-Stempel (älterer Render) – Stichproben entscheiden.");

// 1. Kopie anlegen (die neue Version beginnt als exakte Kopie der Basis)
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
fs.copyFileSync(basis, ziel);
console.log(`Kopie angelegt: ${ziel}`);

// 2. Composition und Zeitplan
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const chromiumOptions = { gl };
const serveUrl = await buendel(entry);
const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions });
const fps = composition.fps, total = composition.durationInFrames;
const z = composition.defaultProps?.zeitplan;

// 3. Geänderte Bereiche (Frames, Ende exklusiv). Ein Shot wirkt bis in die Überblendung des nächsten hinein.
let ranges = [];
if (opt("--frames")) {
  for (const r of opt("--frames").split(",")) { const [a, b] = r.split("-").map(Number); ranges.push([a, (b ?? a) + 1]); }
} else {
  if (!z) { console.log("Composition hat keinen Zeitplan – bitte --frames angeben."); process.exit(1); }
  for (const id of opt("--shots").split(",")) {
    const i = z.shots.findIndex((s) => s.id === id);
    if (i < 0) { console.log(`Shot "${id}" nicht gefunden. Vorhanden: ${z.shots.map((s) => s.id).join(", ")}`); process.exit(1); }
    const s = z.shots[i], next = z.shots[i + 1];
    ranges.push([s.start, Math.min(total, s.end + (next?.fadeIn ?? 0))]);
  }
}

// 4. Basis prüfen: gleiche Länge und Bildrate, Schlüsselbilder
const nBasis = Number(run(FP, ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", basis]).replace(/[^0-9]/g, ""));
if (nBasis !== total) { console.log(`Basis hat ${nBasis} Bilder, die Composition ${total} – Teil-Render nur bei gleicher Länge möglich (sonst ganz rendern).`); process.exit(1); }
const keys = run(FP, ["-v", "error", "-select_streams", "v:0", "-skip_frame", "nokey", "-show_entries", "frame=pts_time", "-of", "csv=p=0", basis])
  .split(/\r?\n/).map((t) => t.replace(/[^0-9.]/g, "")).filter(Boolean).map((t) => Math.round(Number(t) * fps));
const bounds = [...new Set([...keys, total])].sort((a, b) => a - b);   // Grenzen der Bildgruppen
const groupOf = (f) => { let g = 0; while (g + 1 < bounds.length && bounds[g + 1] <= f) g++; return g; };

// betroffene Bildgruppen → zusammenhängende Neu-Render-Bereiche
const hit = new Set();
for (const [a, b] of ranges) for (let g = groupOf(a); g <= groupOf(b - 1); g++) hit.add(g);
const neu = [];
for (const g of [...hit].sort((a, b) => a - b)) {
  const [a, b] = [bounds[g], bounds[g + 1]];
  if (neu.length && neu[neu.length - 1][1] === a) neu[neu.length - 1][1] = b; else neu.push([a, b]);
}
const nNeu = neu.reduce((s, [a, b]) => s + b - a, 0);
console.log(`Geändert: ${ranges.map(([a, b]) => `${a}–${b - 1}`).join(", ")}  →  neu gerendert (ganze Bildgruppen): ${neu.map(([a, b]) => `${a}–${b - 1}`).join(", ")} = ${nNeu} von ${total} Bildern (${Math.round((100 * nNeu) / total)} %)`);

// 5. Arbeitsordner
const tmp = path.resolve("output", `teilrender_${path.basename(ziel, ".mp4")}`);
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

// 5b. Sicherung: Zeichnet der Motor heute noch gleich wie beim Render der Basis? Stichproben aus unveränderten Stellen
// neu rendern und mit der Basis vergleichen. Weicht etwas sichtbar ab (z. B. Motor oder Stil seither geändert), wäre das
// Video gemischt – dann abbrechen und ganz rendern. Entfällt bei gleichem Motor-Stempel; mit --trotzdem überspringen.
if (stichproben) {
  const frei = []; for (let f = 0; f < total; f++) if (!neu.some(([a, b]) => f >= a && f < b)) frei.push(f);
  const proben = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => frei[Math.floor(q * (frei.length - 1))]).filter((f) => f !== undefined);
  const klein = `scale=${Math.round(composition.width / 2)}:${Math.round(composition.height / 2)}`;   // Hoch- oder Querformat aus der Composition
  const grau = (args2) => Buffer.from(execFileSync(FF, ["-v", "error", ...args2, "-vf", klein, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 26 }));
  const { renderStill } = await import("@remotion/renderer");
  let schlimm = [];
  for (const f of proben) {
    const png = path.join(tmp, `probe_${f}.png`);
    await renderStill({ composition, serveUrl, inputProps, frame: f, output: png, imageFormat: "png", browserExecutable, chromiumOptions, logLevel: "error", timeoutInMilliseconds: 180000 });
    const A = Buffer.from(execFileSync(FF, ["-v", "error", "-i", basis, "-vf", `select=eq(n\\,${f}),${klein}`, "-fps_mode", "passthrough", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 26 }));
    const B = grau(["-i", png]);
    let stark = 0; for (let i = 0; i < Math.min(A.length, B.length); i++) if (Math.abs(A[i] - B[i]) > 60) stark++;
    if (stark > 200) schlimm.push(`Bild ${f}: ${stark} Pixel deutlich anders`);
  }
  if (schlimm.length) {
    console.log("ABBRUCH: Der Motor zeichnet unveränderte Stellen heute anders als im Basis-Video (Motor oder Stil wurden seit dem\n" +
      "Render geändert). Ein Teil-Render ergäbe ein gemischtes Video – bitte das ganze Video neu rendern.\n  " + schlimm.join("\n  ") +
      `\n${ziel} ist die unveränderte Kopie der Basis.`);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(2);
  }
  console.log(`Sicherung bestanden: ${proben.length} Stichproben aus unveränderten Stellen gleich wie in der Basis.`);
}

// 6. Basis an den Schlüsselbildern in Stücke teilen (ohne neue Kompression)
const cutFrames = bounds.slice(1, -1).join(",");
run(FF, ["-v", "error", "-y", "-i", basis, "-map", "0:v:0", "-c", "copy", "-f", "segment", "-segment_frames", cutFrames, "-reset_timestamps", "1", path.join(tmp, "basis_%04d.mp4")]);

// 7. Betroffene Bereiche neu rendern
const log = (l) => { if (l.type === "error") console.log("[browser]", l.text.slice(0, 200)); };
const teil = new Map();
for (const [a, b] of neu) {
  const out = path.join(tmp, `neu_${String(a).padStart(5, "0")}.mp4`), t0 = Date.now();
  await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf: 16, muted: true, concurrency, frameRange: [a, b - 1], outputLocation: out,
    browserExecutable, chromiumOptions, onBrowserLog: log, logLevel: "error", timeoutInMilliseconds: 180000 });
  teil.set(a, out);
  console.log(`  Bilder ${a}–${b - 1} neu gerendert (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// 8. Zusammensetzen: unveränderte Stücke + neue Stücke, dann Ton
const liste = [];
for (let g = 0; g < bounds.length - 1; g++) {
  const a = bounds[g];
  if (hit.has(g)) { if (teil.has(a)) liste.push(teil.get(a)); }
  else liste.push(path.join(tmp, `basis_${String(g).padStart(4, "0")}.mp4`));
}
fs.writeFileSync(path.join(tmp, "liste.txt"), liste.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n");
const bild = path.join(tmp, "bild.mp4");
run(FF, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(tmp, "liste.txt"), "-c", "copy", bild]);
const tonQuelle = opt("--ton");
const mux = tonQuelle
  ? ["-i", bild, "-i", tonQuelle, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest"]
  : ["-i", bild, "-i", basis, "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "copy", "-c:a", "copy"];
const fertig = path.join(tmp, "fertig.mp4");
// Stempel nur, wenn gesichert ist, dass Basis und heutiger Motor gleich zeichnen (sonst keiner – nächster Teil-Render prüft dann Stichproben)
run(FF, ["-v", "error", "-y", ...mux, ...(args.includes("--trotzdem") ? [] : stempelArgs(stempel)), fertig]);

// 9. Kontrolle Bild für Bild: gleiche Anzahl, ausserhalb der neuen Bereiche identisch
const md5 = (f) => run(FF, ["-v", "error", "-i", f, "-map", "0:v:0", "-f", "framemd5", "-"], true)
  .split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => l.split(",").pop().trim());
const A = md5(basis), B = md5(fertig);
const inNeu = (f) => neu.some(([a, b]) => f >= a && f < b);
let falsch = 0;
for (let f = 0; f < Math.max(A.length, B.length); f++) if (!inNeu(f) && A[f] !== B[f]) falsch++;
if (B.length !== total || falsch) {
  console.log(`FEHLER: ${B.length} statt ${total} Bilder, ${falsch} unveränderte Bilder weichen ab. ${ziel} bleibt die unveränderte Kopie; Arbeitsordner: ${tmp}`);
  process.exit(1);
}
fs.copyFileSync(fertig, ziel);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Fertig: ${ziel} – ${total} Bilder, ${total - nNeu} unverändert übernommen (bildgleich geprüft), ${nNeu} neu gerendert.`);
