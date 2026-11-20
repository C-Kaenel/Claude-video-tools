// Herkunft: eigen (V-Video), geschrieben 2026-11-11, ohne Vorlage.
// Ein Befehl für ein ganzes Motor-Video: Raum-Prüfung → Bild → Ton → Mischung → Prüfung (Zeitplan, Karten-Ebene, Bild, Farbe, Ton).
// Alle Ausgaben der Einzelschritte landen in Log-Dateien; die Konsole zeigt nur eine kurze Zusammenfassung
// (auch als zusammenfassung.md im Arbeitsordner). So muss niemand lange Logs lesen.
// Schnell: das Projekt wird nur EINMAL gebündelt (Raum-Prüfung, Zeitplan, Bild und Karten-Ebene nutzen dasselbe Bündel),
// gerendert mit den gemessenen Bestwerten (RENDER_CONCURRENCY, GL aus .env; siehe qa/env.mjs).
//
// Aufruf (aus dem Hauptordner):
//   node engine/v01/render/produziere.mjs <einstieg.tsx> <Composition> <ton.json> <ziel.mp4> [Optionen]
// Optionen:
//   --schritte raum,bild,ton,mix,pruefung   nur diese Schritte (Standard: alle, in dieser Reihenfolge)
//   --video <fertig.mp4>                    vorhandenes fertiges Video prüfen (wenn bild/mix nicht laufen)
//   --ohne-karten                           Prüfung ohne Karten-Ebene (Safe Area der Karten wird dann nicht geprüft)
//   --trotzdem                              nach Funden der Raum-Prüfung weitermachen
//   --ton-skript <py>                       eigener Ton eines Stils (z. B. styles/T0004_quadratic-3d/ton/ton.py; gleiche Eingaben wie
//                                           audio/v01/render.py: <ton.json> <ausgabe-ordner> → mix.wav)
//   --kapitel alle | 1,3,5                  Langform Kapitel für Kapitel: je Kapitel Raum-Prüfung (nur seine Shots) → Bild (nur
//                                           sein Bildbereich) → Ton-Ausschnitt → Prüfung → output/<Composition>/kapitel/NN_<art>.mp4;
//                                           andere Kapitel bleiben unberührt. Ton einmal fürs ganze Video gemischt (nur neu, wenn sich
//                                           Ton-Datei oder Ton-Skript ändern). Stand aller Kapitel: kapitel/stand.md. <ziel.mp4> wird
//                                           hier nicht geschrieben – das macht render/zusammenfuegen.mjs nach dem grünen Licht.
// Das fertige Video trägt den Motor-Stempel (render/stempel.mjs) – teilrender.mjs erkennt daran, ob der Motor seither geändert wurde.
// Arbeitsordner: output/<Composition>/ (bild.mp4, ton/, z.json, karten.mp4, raum/, pruefung/, logs/, zusammenfassung.md).
// Rückgabe 0 = alles OK, 1 = Funde oder Fehler (Zusammenfassung lesen).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { browserExecutable, buendel, concurrency, gl, python } from "../qa/env.mjs";
import { motorStempel, stempelArgs } from "./stempel.mjs";
// Motor-Stempel beim Start festhalten (Stand, mit dem gebündelt wird) – kommt in die fertige MP4 (für teilrender.mjs)
const stempel = motorStempel();

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const flag = (n) => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
const schritte = (opt("--schritte") ?? "raum,bild,ton,mix,pruefung").split(",");
let video = opt("--video");
const ohneKarten = flag("--ohne-karten"), trotzdem = flag("--trotzdem");
const tonSkript = opt("--ton-skript") ?? "audio/v01/render.py", kapitelWahl = opt("--kapitel");
if (!fs.existsSync(tonSkript)) { console.log(`Ton-Skript fehlt: ${tonSkript}`); process.exit(1); }
const [entry, comp, ton, ziel] = args;
if (!ziel && !kapitelWahl && !(video && !schritte.includes("mix"))) {
  console.log("Aufruf: node engine/v01/render/produziere.mjs <einstieg.tsx> <Composition> <ton.json> <ziel.mp4> [--schritte …] [--video …] [--ohne-karten] [--trotzdem] [--ton-skript <py>] [--kapitel alle|1,3]");
  process.exit(1);
}
const ffDir = [process.env.FFMPEG_DIR, path.resolve("tools/ffmpeg/bin")].filter(Boolean)
  .find((d) => fs.existsSync(path.join(d, os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg")));
const FF = ffDir ? path.join(ffDir, os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg") : "ffmpeg";

const work = path.join("output", comp), logs = path.join(work, "logs");
fs.mkdirSync(logs, { recursive: true });
const zeilen = [], t00 = Date.now();
const notiz = (s) => { zeilen.push(s); console.log(s); };

/** Führt einen Befehl aus, schreibt alles ins Log, gibt Exit-Code und die letzten Zeilen zurück. */
function lauf(name, cmd, cmdArgs) {
  const t0 = Date.now();
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", maxBuffer: 1 << 28 });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? String(r.error) : ""}`;
  fs.writeFileSync(path.join(logs, `${name}.log`), `$ ${cmd} ${cmdArgs.join(" ")}\n\n${text}`);
  const tail = text.trim().split(/\r?\n/).filter((l) => l.trim()).slice(-8);
  return { code: r.status ?? 1, tail, s: ((Date.now() - t0) / 1000).toFixed(0) };
}
function ende(code) {
  notiz(`Dauer gesamt: ${((Date.now() - t00) / 60000).toFixed(1)} min · Logs: ${logs}`);
  fs.writeFileSync(path.join(work, "zusammenfassung.md"), `# Produktion ${comp}\n\n${zeilen.map((z) => `- ${z}`).join("\n")}\n`);
  process.exit(code);
}
const stopp = (name, r) => { notiz(`${name}: FEHLER (Exit ${r.code}) – letzte Zeilen:`); r.tail.forEach((l) => notiz(`    ${l}`)); ende(1); };

/** Video der Composition direkt rendern (gleiches Bündel, kein neuer Start); Fortschritt ins Log. */
async function rendern(name, ausgabe, inputProps, crf) {
  const t0 = Date.now(), log = [];
  try {
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const chromiumOptions = { gl };
    const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions });
    let last = -10;
    await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf, muted: true, concurrency, outputLocation: ausgabe,
      browserExecutable, chromiumOptions, logLevel: "error", timeoutInMilliseconds: 300000,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 100); if (p >= last + 10) { last = p; log.push(`${p} %  ${((Date.now() - t0) / 1000).toFixed(0)} s`); } } });
    fs.writeFileSync(path.join(logs, `${name}.log`), log.join("\n") + "\n");
    return { code: 0, tail: [], s: ((Date.now() - t0) / 1000).toFixed(0) };
  } catch (e) {
    fs.writeFileSync(path.join(logs, `${name}.log`), log.join("\n") + "\n" + String(e?.stack ?? e));
    return { code: 1, tail: String(e?.message ?? e).split(/\r?\n/).slice(0, 6), s: ((Date.now() - t0) / 1000).toFixed(0) };
  }
}

// einmal bündeln, alle Werkzeuge nutzen dasselbe Bündel
let serveUrl = null;
if (kapitelWahl || schritte.some((s) => s === "raum" || s === "bild" || s === "pruefung")) {
  const t0 = Date.now();
  serveUrl = await buendel(entry); process.env.BUNDLE_URL = serveUrl;
  notiz(`Gebündelt (${((Date.now() - t0) / 1000).toFixed(0)} s, ${concurrency} Tabs, GL ${gl})`);
}

let probleme = 0;
if (kapitelWahl) await kapitelModus();
if (schritte.includes("raum")) {
  const r = lauf("raum", "node", ["engine/v01/qa/raum.mjs", entry, comp, path.join(work, "raum")]);
  const erg = r.tail.filter((l) => l.startsWith("ERGEBNIS") || l.startsWith("Bericht"));
  if (!erg.length) stopp("Raum-Prüfung", r);
  notiz(`Raum-Prüfung (${r.s} s): ${erg.join(" · ")}`);
  if (r.code !== 0) { probleme++; if (!trotzdem) { notiz("Abbruch vor dem Render: Funde beheben (raum.md, uebersicht.png) oder mit --trotzdem weiter."); ende(1); } }
}
if (schritte.includes("bild")) {
  const r = await rendern("bild", path.join(work, "bild.mp4"), {}, 16);
  if (r.code !== 0) stopp("Bild-Render", r);
  notiz(`Bild gerendert (${r.s} s): ${path.join(work, "bild.mp4")}`);
}
if (schritte.includes("ton")) {
  const r = lauf("ton", python, [tonSkript, ton, path.join(work, "ton")]);
  if (r.code !== 0) stopp("Ton", r);
  notiz(`Ton erzeugt (${r.s} s): ${path.join(work, "ton", "mix.wav")}`);
}
if (schritte.includes("mix")) {
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  if (fs.existsSync(ziel)) { notiz(`Mischung: ${ziel} gibt es schon – nie überschreiben, neue Version wählen.`); ende(1); }
  const r = lauf("mix", FF, ["-v", "error", "-i", path.join(work, "bild.mp4"), "-i", path.join(work, "ton", "mix.wav"), "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", ...stempelArgs(stempel), ziel]);
  if (r.code !== 0) stopp("Mischung", r);
  notiz(`Video fertig: ${ziel}`);
  video = ziel;
}
if (schritte.includes("pruefung")) {
  if (!video) { notiz("Prüfung: kein Video (--video angeben oder mix laufen lassen)."); ende(1); }
  const z = path.join(work, "z.json"), k = path.join(work, "karten.mp4");
  let r = lauf("zeitplan", "node", ["engine/v01/qa/zeitplan.mjs", entry, comp, z]);
  if (r.code !== 0) stopp("Zeitplan", r);
  if (!ohneKarten) {
    r = await rendern("karten", k, { qa: "karten" }, 18);
    if (r.code !== 0) stopp("Karten-Ebene", r);
  }
  const pa = ["engine/v01/qa/pruefung.py", video, path.join(work, "pruefung"), "--zeitplan", z, ...(ohneKarten ? [] : ["--karten", k])];
  r = lauf("pruefung", python, pa);
  const text = fs.readFileSync(path.join(logs, "pruefung.log"), "utf8").split(/\r?\n/);
  const start = text.findIndex((l) => l === "OK" || /^\d+ Fehler$/.test(l));
  if (start < 0) stopp("Prüfung", r);
  const fehler = text.slice(start + 1).filter((l) => l.startsWith(" -")), hinw = text.slice(start + 1).filter((l) => l.startsWith(" (Hinweis)"));
  notiz(`Prüfung (${r.s} s): ${text[start]}${hinw.length ? `, ${hinw.length} Hinweise` : ""} – Bericht ${path.join(work, "pruefung", "bericht.md")}, Kontaktbogen kontaktbogen.png`);
  fehler.slice(0, 12).forEach((l) => notiz(`   ${l.trim()}`));
  if (fehler.length > 12) notiz(`   … ${fehler.length - 12} weitere im Bericht`);
  if (text[start] !== "OK") probleme++;
}
ende(probleme ? 1 : 0);

// ---------- Langform Kapitel für Kapitel ----------
/** Ton fürs ganze Video, nur neu gemischt, wenn sich Ton-Datei oder Ton-Skript geändert haben (Merker ton/quelle.json). */
function tonFuersGanze() {
  const dir = path.join(work, "ton"), merker = path.join(dir, "quelle.json");
  const soll = { ton: crypto.createHash("sha256").update(fs.readFileSync(ton)).digest("hex").slice(0, 16), skript: tonSkript };
  const ist = fs.existsSync(merker) ? JSON.parse(fs.readFileSync(merker, "utf8")) : null;
  if (ist && ist.ton === soll.ton && ist.skript === soll.skript && fs.existsSync(path.join(dir, "mix.wav"))) return "unverändert";
  const r = lauf("ton", python, [tonSkript, ton, dir]);
  if (r.code !== 0) stopp("Ton", r);
  fs.writeFileSync(merker, JSON.stringify(soll));
  return `neu gemischt (${r.s} s)`;
}

/** Zeitplan nur eines Kapitels: Shots im Bereich [a, b), Frames ab 0 (für pruefung.py). */
function zeitplanTeil(z, k) {
  const a = k.start, b = k.end, v = (f) => f - a;
  return { ...z, frames: b - a, kapitel: [{ ...k, nr: z.kapitel.indexOf(k) + 1, start: 0, end: b - a }],
    shots: z.shots.filter((s) => s.start >= a && s.end <= b).map((s) => ({ ...s, start: v(s.start), end: v(s.end),
      cuts: s.cuts.map(v), kicks: s.kicks.map(([f, n]) => [v(f), n]) })) };
}

async function kapitelModus() {
  const z = path.join(work, "z.json");
  let r = lauf("zeitplan", "node", ["engine/v01/qa/zeitplan.mjs", entry, comp, z]);
  if (r.code !== 0) stopp("Zeitplan", r);
  const zp = JSON.parse(fs.readFileSync(z, "utf8")), fps = zp.fps;
  const alle = zp.kapitel ?? [];
  if (!alle.length) { notiz("Kapitel: Die Story hat keine Kapitel (Shots mit `kapitel`) – ohne --kapitel rendern."); ende(1); }
  const nr = kapitelWahl === "alle" ? alle.map((_, i) => i + 1) : kapitelWahl.split(",").map(Number);
  const falsch = nr.filter((n) => !(n >= 1 && n <= alle.length));
  if (falsch.length) { notiz(`Kapitel ${falsch.join(", ")} gibt es nicht (1–${alle.length}).`); ende(1); }
  const kdir = path.join(work, "kapitel"), bdir = path.join(kdir, "bild");
  fs.mkdirSync(bdir, { recursive: true });
  notiz(`Ton fürs ganze Video: ${tonFuersGanze()} (${tonSkript})`);
  const mix = path.join(work, "ton", "mix.wav");
  const standDatei = path.join(kdir, "stand.json");
  const stand = fs.existsSync(standDatei) ? JSON.parse(fs.readFileSync(standDatei, "utf8")) : {};
  for (const n of nr) {
    const k = alle[n - 1], name = `${String(n).padStart(2, "0")}_${k.art}`, t0 = Date.now();
    const kz = { nr: n, art: k.art, titel: k.titel ?? "", start: k.start, end: k.end, shots: k.shots };
    // Raum-Prüfung nur der Shots dieses Kapitels
    r = lauf(`raum_${name}`, "node", ["engine/v01/qa/raum.mjs", entry, comp, path.join(kdir, "raum", name), k.shots.join(",")]);
    const erg = r.tail.filter((l) => l.startsWith("ERGEBNIS"));
    if (!erg.length) stopp(`Kapitel ${name}: Raum-Prüfung`, r);
    if (r.code !== 0 && !trotzdem) {
      notiz(`Kapitel ${name}: Raum-Prüfung ${erg[0]} – nicht gerendert (raum.md ansehen oder --trotzdem).`);
      stand[name] = { ...kz, ergebnis: "Raum-Funde, nicht gerendert", zeit: new Date().toISOString() }; probleme++; continue;
    }
    // Bild: nur der Bildbereich des Kapitels aus der ganzen Composition (Überblendungen stimmen dadurch)
    const bild = path.join(bdir, `${name}.mp4`);
    r = await rendernBereich(`bild_${name}`, bild, {}, 16, [k.start, k.end - 1]);
    if (r.code !== 0) stopp(`Kapitel ${name}: Bild`, r);
    // Bild + Ton-Ausschnitt (zum Ansehen und Prüfen)
    const datei = path.join(kdir, `${name}.mp4`);
    r = lauf(`mix_${name}`, FF, ["-v", "error", "-y", "-i", bild, "-ss", (k.start / fps).toFixed(6), "-t", ((k.end - k.start) / fps).toFixed(6), "-i", mix,
      "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", ...stempelArgs(stempel), datei]);
    if (r.code !== 0) stopp(`Kapitel ${name}: Ton dazulegen`, r);
    // Prüfung des Kapitels (Zeitplan-Ausschnitt, Karten-Ebene des Bereichs, Ton ohne Lautheits-Ziel)
    const pdir = path.join(kdir, "pruefung", name), zk = path.join(pdir, "z.json");
    fs.mkdirSync(pdir, { recursive: true });
    fs.writeFileSync(zk, JSON.stringify(zeitplanTeil(zp, k)));
    const pa = ["engine/v01/qa/pruefung.py", datei, pdir, "--zeitplan", zk, "--teil"];
    if (!ohneKarten) {
      const kk = path.join(pdir, "karten.mp4");
      r = await rendernBereich(`karten_${name}`, kk, { qa: "karten" }, 18, [k.start, k.end - 1]);
      if (r.code !== 0) stopp(`Kapitel ${name}: Karten-Ebene`, r);
      pa.push("--karten", kk);
    }
    r = lauf(`pruefung_${name}`, python, pa);
    const text = fs.readFileSync(path.join(logs, `pruefung_${name}.log`), "utf8").split(/\r?\n/);
    const i0 = text.findIndex((l) => l === "OK" || /^\d+ Fehler$/.test(l));
    if (i0 < 0) stopp(`Kapitel ${name}: Prüfung`, r);
    const fehler = text.slice(i0 + 1).filter((l) => l.startsWith(" -")), hinw = text.slice(i0 + 1).filter((l) => l.startsWith(" (Hinweis)"));
    if (text[i0] !== "OK") probleme++;
    stand[name] = { ...kz, datei: path.relative(work, datei).replace(/\\/g, "/"), bild: path.relative(work, bild).replace(/\\/g, "/"),
      ergebnis: text[i0], hinweise: hinw.length, fehler: fehler.map((l) => l.trim().slice(2)), stempel: stempelArgs(stempel).at(-1), zeit: new Date().toISOString() };
    notiz(`Kapitel ${name} (${((Date.now() - t0) / 1000).toFixed(0)} s, ${((k.end - k.start) / fps).toFixed(1)} s Film): ${text[i0]}${hinw.length ? `, ${hinw.length} Hinweise` : ""} → ${datei}`);
    fehler.slice(0, 6).forEach((l) => notiz(`   ${l.trim()}`));
  }
  fs.writeFileSync(standDatei, JSON.stringify(stand, null, 1));
  // Übersicht aller Kapitel (auch der nicht neu gerenderten)
  const tab = alle.map((k, i) => {
    const name = `${String(i + 1).padStart(2, "0")}_${k.art}`, s = stand[name];
    const frisch = s && s.start === k.start && s.end === k.end;
    return `| ${i + 1} | ${k.art} | ${k.titel ?? ""} | ${k.start}–${k.end - 1} | ${s ? (frisch ? s.ergebnis : "Grenzen geändert – neu rendern") : "fehlt"} | ${s?.zeit?.slice(0, 16).replace("T", " ") ?? "–"} |`;
  });
  fs.writeFileSync(path.join(kdir, "stand.md"), `# Kapitel ${comp}\n\n| # | Art | Titel | Frames | Stand | gerendert (UTC) |\n|---|---|---|---|---|---|\n${tab.join("\n")}\n\n` +
    `Ansehen: kapitel/NN_<art>.mp4 (Bild + Ton-Ausschnitt). Zusammenfügen nach dem grünen Licht:\n` +
    `node engine/v01/render/zusammenfuegen.mjs ${entry} ${comp} ${ton} <ziel.mp4>${tonSkript !== "audio/v01/render.py" ? ` --ton-skript ${tonSkript}` : ""}\n`);
  notiz(`Stand aller Kapitel: ${path.join(kdir, "stand.md")}`);
  ende(probleme ? 1 : 0);
}

/** Wie rendern(), aber nur ein Bildbereich [von, bis] der Composition. */
async function rendernBereich(name, ausgabe, inputProps, crf, frameRange) {
  const t0 = Date.now();
  try {
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const chromiumOptions = { gl };
    const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions });
    await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf, muted: true, concurrency, outputLocation: ausgabe, frameRange,
      browserExecutable, chromiumOptions, logLevel: "error", timeoutInMilliseconds: 300000 });
    fs.writeFileSync(path.join(logs, `${name}.log`), `Bereich ${frameRange.join("–")} fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
    return { code: 0, tail: [], s: ((Date.now() - t0) / 1000).toFixed(0) };
  } catch (e) {
    fs.writeFileSync(path.join(logs, `${name}.log`), String(e?.stack ?? e));
    return { code: 1, tail: String(e?.message ?? e).split(/\r?\n/).slice(0, 6), s: ((Date.now() - t0) / 1000).toFixed(0) };
  }
}
