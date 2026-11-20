// Herkunft: eigen (V-Video), geschrieben 2026-11-12, ohne Vorlage.
// Prüf-Story der Szenen-Rezepte (library/rezepte/), im Kurz- und im Langformat: je Rezept und Kamera ein Shot von 2 s, Figuren auf allen Standpunkten,
// eine Figur geht den freien Weg `weg` des Rezepts entlang. Geprüft mit der Raum-Prüfung, eingetragen mit tools/bibliothek/rezepte_eintragen.py:
//   node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/rezepte.tsx Rezepte output/rezepte
//   python tools/bibliothek/rezepte_eintragen.py output/rezepte
import { registerRoot } from "remotion";
import { motorCompositions, type Story } from "../../../engine/v01";
import { REZEPTE } from "../../../library/eintraege";
import { cartoon3d2d } from "../style";
import { buildSzene, langformat, rezept, rezeptKamera, shot, type CastData } from "../szene";

const FPS = 30, LEN = 60;
// Figuren: Menge passend zur Welt des Rezepts (Epoche), damit die Prüfung keine fremden Figuren meldet
const shots = Object.entries(REZEPTE as Record<string, { punkte: Record<string, [number, number]>; weg?: [number, number][]; kameras: Record<string, unknown>; light?: "day" | "golden" }>)
  .flatMap(([name, r]) => Object.keys(r.kameras).map((kam) => ({ name, kam, r })))
  .map(({ name, kam, r }, i) => {
    const a = i * LEN, t = a / FPS, pk = Object.entries(r.punkte);
    const cast: CastData[] = pk.map(([, p], k) => ({ menge: { seed: 7, n: pk.length + 1, i: k }, seed: 10 + k, keys: [{ at: -10, pos: p, expr: "smile" as const }] }));
    if (r.weg) {
      const [l, rr] = [r.weg[0], r.weg[r.weg.length - 1]];
      cast.push({ menge: { seed: 7, n: pk.length + 1, i: pk.length }, seed: 99, keys: [{ at: -10, pos: [l[0], l[1]] as [number, number], expr: "smile" as const },
        { at: t + 0.2, pos: [l[0], l[1]] as [number, number], expr: "smile" as const }, { at: t + 1.8, pos: [rr[0], rr[1]] as [number, number], expr: "smile" as const }] });
    }
    return shot(FPS, { id: `${name}--${kam}`, a, b: a + LEN, light: r.light ?? "day", camera: rezeptKamera(name, kam, { push: 0.1 }), szene: { ...rezept(name), cast } });
  });

export const story: Story = { id: "Rezepte", format: "shortform", shots };
// "Rezepte" = Kurzformat 9:16, "Rezepte-Lang" = Langformat 16:9 (dieselben Kameras, breiteres Bild)
registerRoot(motorCompositions([{ story, style: cartoon3d2d, build: buildSzene }, { story: langformat(story), style: cartoon3d2d, build: buildSzene }]));
