// Herkunft: eigen (V-Video), geschrieben 2026-11-15, ohne Vorlage.
// Langform: Kapitel zusammenfügen (nach dem grünen Licht des Nutzers zu allen Kapiteln). Die Kapitel kommen aus
// `produziere.mjs --kapitel …` (output/<Composition>/kapitel/). Ablauf:
//   1. Vorher prüfen: jedes Kapitel des heutigen Zeitplans ist gerendert, mit denselben Grenzen und genau so vielen Bildern;
//      jede Kapitel-Prüfung war OK; alle Kapitel tragen denselben Motor-Stempel (sonst Abbruch – betroffene Kapitel neu
//      rendern oder --trotzdem). Weicht nur der heutige Motor ab, ist das ein Hinweis: zusammengefügt wird, was abgenommen ist.
//   2. Bilder ohne neue Kompression aneinanderhängen (Bildgruppen bleiben, wie sie sind) → keine Naht im Bild; Bild für Bild
//      (Prüfsumme je Bild) vergleichen, dass das Ganze genau die Kapitel-Bilder enthält.
//   3. Ton: EINE Mischung über das ganze Video (dieselbe wie bei den Kapiteln; neu nur, wenn sich Ton-Datei oder Ton-Skript
//      geändert haben) → kein Ton-Sprung an den Kapitelgrenzen, −22,6 LUFS fürs Ganze.
//   4. Prüfung des ganzen Videos (pruefung.py mit Zeitplan und der zusammengefügten Karten-Ebene der Kapitel).
// Ergebnis: <ziel.mp4> (finale Fassung, nie überschrieben) mit Motor-Stempel; Bericht output/<Composition>/zusammenfuegen.md.
//
// Aufruf (aus dem Hauptordner):
//   node engine/v01/render/zusammenfuegen.mjs <einstieg.tsx> <Composition> <ton.json> <ziel.mp4> [--ton-skript <py>] [--trotzdem]
// Rückgabe 0 = fertig und Prüfung OK, 1 = Abbruch oder Prüf-Fehler (Bericht lesen).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { python } from "../qa/env.mjs";
import { liesStempel, motorStempel, stempelArgs, unterschiede } from "./stempel.mjs";

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const flag = (n) => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
const tonSkript = opt("--ton-skript", "audio/v01/render.py"), trotzdem = flag("--trotzdem");
const [entry, comp, ton, ziel] = args;
if (!ziel) { console.log("Aufruf: node engine/v01/render/zusammenfuegen.mjs <einstieg.tsx> <Composition> <ton.json> <ziel.mp4> [--ton-skript <py>] [--trotzdem]"); process.exit(1); }
if (fs.existsSync(ziel)) { console.log(`${ziel} gibt es schon – nie überschreiben, neue Version wählen.`); process.exit(1); }
const exe = (n) => { const d = [process.env.FFMPEG_DIR, path.resolve("tools/ffmpeg/bin")].filter(Boolean).find((x) => fs.existsSync(path.join(x, os.platform() === "win32" ? `${n}.exe` : n))); return d ? path.join(d, os.platform() === "win32" ? `${n}.exe` : n) : n; };
const FF = exe("ffmpeg"), FP = exe("ffprobe");

const work = path.join("output", comp), kdir = path.join(work, "kapitel"), logs = path.join(work, "logs");
fs.mkdirSync(logs, { recursive: true });
const zeilen = [], t00 = Date.now();
const notiz = (s) => { zeilen.push(s); console.log(s); };
const ende = (code) => {
  notiz(`Dauer: ${((Date.now() - t00) / 60000).toFixed(1)} min`);
  fs.writeFileSync(path.join(work, "zusammenfuegen.md"), `# Zusammenfügen ${comp}\n\n${zeilen.map((z) => `- ${z}`).join("\n")}\n`);
  process.exit(code);
};
function lauf(name, cmd, a) {
  const r = spawnSync(cmd, a, { encoding: "utf8", maxBuffer: 1 << 28 });
  const text = `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? String(r.error) : ""}`;
  fs.writeFileSync(path.join(logs, `${name}.log`), `$ ${cmd} ${a.join(" ")}\n\n${text}`);
  return { code: r.status ?? 1, text, tail: text.trim().split(/\r?\n/).filter((l) => l.trim()).slice(-6) };
}
const stopp = (was, r) => { notiz(`${was}: FEHLER`); (r?.tail ?? []).forEach((l) => notiz(`    ${l}`)); ende(1); };
const bilder = (v) => parseInt(lauf("zaehlen", FP, ["-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", v]).text.trim().split(/\r?\n/).pop());
const md5Bilder = (name, v) => lauf(name, FF, ["-v", "error", "-i", v, "-map", "0:v:0", "-f", "framemd5", "-"]).text.split(/\r?\n/).filter((l) => l && !l.startsWith("#")).map((l) => l.split(",").pop().trim());

// 1. Zeitplan und Kapitel-Stand
const z = path.join(work, "z.json");
let r = lauf("zeitplan", "node", ["engine/v01/qa/zeitplan.mjs", entry, comp, z]);
if (r.code !== 0) stopp("Zeitplan", r);
const zp = JSON.parse(fs.readFileSync(z, "utf8"));
const alle = zp.kapitel ?? [];
if (!alle.length) { notiz("Die Story hat keine Kapitel – Zusammenfügen gibt es nur für die Langform mit Kapiteln."); ende(1); }
const standDatei = path.join(kdir, "stand.json");
const stand = fs.existsSync(standDatei) ? JSON.parse(fs.readFileSync(standDatei, "utf8")) : {};
const heute = motorStempel(), probleme = [], stempel = new Map();
const kap = alle.map((k, i) => {
  const name = `${String(i + 1).padStart(2, "0")}_${k.art}`, s = stand[name];
  const bild = s?.bild ? path.join(work, s.bild) : null;
  if (!s || !bild || !fs.existsSync(bild)) { probleme.push(`${name}: nicht gerendert`); return null; }
  if (s.start !== k.start || s.end !== k.end) { probleme.push(`${name}: Grenzen geändert (${s.start}–${s.end - 1} → ${k.start}–${k.end - 1}) – neu rendern`); return null; }
  const n = bilder(bild);
  if (n !== k.end - k.start) probleme.push(`${name}: ${n} statt ${k.end - k.start} Bilder`);
  if (s.ergebnis !== "OK") probleme.push(`${name}: Kapitel-Prüfung „${s.ergebnis}“`);
  const st = liesStempel(path.join(work, s.datei));
  if (!st) probleme.push(`${name}: kein Motor-Stempel`); else stempel.set(name, st);
  return { ...k, name, bild };
});
notiz(`${alle.length} Kapitel, ${zp.frames} Bilder (${(zp.frames / zp.fps / 60).toFixed(1)} min)`);
// alle Kapitel mit demselben Motor-Stand? (Bezug: das erste Kapitel)
const [erster, ...rest] = [...stempel.entries()];
for (const [name, st] of rest) { const d = unterschiede(erster[1], st); if (d.length) probleme.push(`${name}: anderer Motor-Stand als ${erster[0]} (${d.join(", ")}) – neu rendern`); }
const kapStempel = erster?.[1] ?? heute;
const seither = erster ? unterschiede(kapStempel, heute) : [];
if (seither.length) notiz(`Hinweis: Motor seit den Kapiteln geändert (${seither.join(", ")}) – zusammengefügt werden die abgenommenen Kapitel, der Stempel des Videos ist der der Kapitel`);
if (probleme.length) {
  probleme.forEach((p) => notiz(`   ${p}`));
  if (!trotzdem || kap.includes(null)) { notiz("Abbruch: erst diese Kapitel beheben (produziere.mjs --kapitel …)" + (kap.includes(null) ? "." : " oder --trotzdem.")); ende(1); }
}

// 2. Bilder aneinanderhängen (ohne neue Kompression) und Bild für Bild vergleichen
const tmp = path.join(work, "zusammen"); fs.mkdirSync(tmp, { recursive: true });
const liste = (dateien, n) => { const f = path.join(tmp, n); fs.writeFileSync(f, dateien.map((d) => `file '${path.resolve(d).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n"); return f; };
const bild = path.join(tmp, "bild.mp4");
r = lauf("concat_bild", FF, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste(kap.map((k) => k.bild), "bild.txt"), "-c", "copy", bild]);
if (r.code !== 0) stopp("Bilder aneinanderhängen", r);
const ganz = md5Bilder("md5_ganz", bild), teile = kap.flatMap((k) => md5Bilder(`md5_${k.name}`, k.bild));
const anders = ganz.length !== teile.length ? -1 : ganz.findIndex((h, i) => h !== teile[i]);
if (ganz.length !== zp.frames || anders !== -1) { notiz(`Bildkontrolle: ${ganz.length} Bilder (Soll ${zp.frames})${anders >= 0 ? `, erstes abweichendes Bild ${anders}` : ""}`); ende(1); }
notiz(`Bilder aneinandergehängt ohne neue Kompression: ${ganz.length} Bilder, jedes gleich wie im Kapitel (Prüfsumme je Bild)`);

// 3. Ton fürs Ganze (gleicher Merker wie produziere.mjs --kapitel)
const tdir = path.join(work, "ton"), merker = path.join(tdir, "quelle.json");
const soll = { ton: crypto.createHash("sha256").update(fs.readFileSync(ton)).digest("hex").slice(0, 16), skript: tonSkript };
const ist = fs.existsSync(merker) ? JSON.parse(fs.readFileSync(merker, "utf8")) : null;
if (!(ist && ist.ton === soll.ton && ist.skript === soll.skript && fs.existsSync(path.join(tdir, "mix.wav")))) {
  r = lauf("ton", python, [tonSkript, ton, tdir]);
  if (r.code !== 0) stopp("Ton", r);
  fs.writeFileSync(merker, JSON.stringify(soll));
  notiz(`Ton fürs ganze Video neu gemischt (${tonSkript}) – Ton-Datei geändert seit den Kapiteln`);
} else notiz(`Ton fürs ganze Video: dieselbe Mischung wie bei den Kapiteln (${tonSkript})`);
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
r = lauf("mix", FF, ["-v", "error", "-i", bild, "-i", path.join(tdir, "mix.wav"), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k",
  "-shortest", ...stempelArgs(kapStempel), ziel]);
if (r.code !== 0) stopp("Ton dazulegen", r);
notiz(`Video fertig: ${ziel}`);

// 4. Prüfung des Ganzen (Karten-Ebene aus den Kapiteln, falls alle eine haben)
const karten = kap.map((k) => path.join(kdir, "pruefung", k.name, "karten.mp4"));
const pa = ["engine/v01/qa/pruefung.py", ziel, path.join(work, "pruefung"), "--zeitplan", z];
if (karten.every((f) => fs.existsSync(f))) {
  const kk = path.join(tmp, "karten.mp4");
  r = lauf("concat_karten", FF, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste(karten, "karten.txt"), "-c", "copy", kk]);
  if (r.code === 0) pa.push("--karten", kk);
}
r = lauf("pruefung", python, pa);
const text = r.text.split(/\r?\n/), i0 = text.findIndex((l) => l === "OK" || /^\d+ Fehler$/.test(l));
if (i0 < 0) stopp("Prüfung", r);
const fehler = text.slice(i0 + 1).filter((l) => l.startsWith(" -")), hinw = text.slice(i0 + 1).filter((l) => l.startsWith(" (Hinweis)"));
notiz(`Prüfung des Ganzen: ${text[i0]}${hinw.length ? `, ${hinw.length} Hinweise` : ""} – Bericht ${path.join(work, "pruefung", "bericht.md")}`);
fehler.slice(0, 12).forEach((l) => notiz(`   ${l.trim()}`));
ende(text[i0] === "OK" ? 0 : 1);
