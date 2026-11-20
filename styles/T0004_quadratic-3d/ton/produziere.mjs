// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Kurzbefehl für Videos im Stil T0004: ruft engine/v01/render/produziere.mjs mit dem eigenen kalten Ton auf
// (`--ton-skript styles/T0004_quadratic-3d/ton/ton.py`); alle anderen Angaben gehen unverändert durch – auch `--kapitel`.
//   node styles/T0004_quadratic-3d/ton/produziere.mjs <einstieg.tsx> <ID> <ton.json> <ziel.mp4> [--trotzdem]
//   node styles/T0004_quadratic-3d/ton/produziere.mjs <einstieg.tsx> <ID> <ton.json> --kapitel alle      (Langform: je Kapitel eine Datei)
// Zusammenfügen nach dem grünen Licht: node engine/v01/render/zusammenfuegen.mjs <einstieg.tsx> <ID> <ton.json> <ziel.mp4> --ton-skript styles/T0004_quadratic-3d/ton/ton.py
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length < 3) { console.log("Aufruf: node styles/T0004_quadratic-3d/ton/produziere.mjs <einstieg.tsx> <ID> <ton.json> [<ziel.mp4>] [--kapitel alle|1,3] [--trotzdem]"); process.exit(1); }
const r = spawnSync("node", ["engine/v01/render/produziere.mjs", ...args, "--ton-skript", "styles/T0004_quadratic-3d/ton/ton.py"], { stdio: "inherit" });
process.exit(r.status ?? 1);
