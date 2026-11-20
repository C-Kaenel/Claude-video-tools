// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Lichtstimmung = alle Werte, die Himmel, Nebel, Sonne und Schattierung brauchen.
// Die konkreten Werte liefert der Stil (z. B. styles/cartoon-3d2d) – meist aus shared/design-tokens.json.

export type SkyStops = { colors: string[]; elevations: number[] }; // Farbe je Höhe über dem Horizont (Grad)

export type LightPreset = {
  sky: SkyStops;
  fog: { color: string; near: number; far: number };
  sun: { az: number; el: number; color: string; intensity: number }; // az: Grad von der Kamera-Blickrichtung (0 = Gegenlicht, 90 = rechts)
  lit: string;      // Farbe-Multiplikator der Lichtseite (linear, darf > 1 als "#rrggbb" × litGain)
  litGain: number;  // Verstärkung der Lichtseite
  shade: string;    // Farbe-Multiplikator der Schattenseite
  lift: string;     // Aufhellung, die überall dazukommt (Farbe der Schatten-Tönung)
  edge: number;     // wo Licht in Schatten umschlägt (0..1 der Licht-Stärke)
  soft: number;     // wie weich der Übergang ist
  shadows: boolean; // echte Schatten (sonst nur Kontaktschatten des Stils)
};

/** Neutrale Grundstimmung des Motors (für Tests); Stile ersetzen sie. */
export const NEUTRAL_DAY: LightPreset = {
  sky: { colors: ["#c9d9ee", "#a9c5ea", "#7aa7e0", "#5a8fd6", "#3f78c8"], elevations: [0, 3, 8, 16, 40] },
  fog: { color: "#c9d9ee", near: 30, far: 320 },
  sun: { az: 70, el: 45, color: "#fff4e2", intensity: 1 },
  lit: "#fff6ea", litGain: 1.45, shade: "#4d4e62", lift: "#0c0f1c",
  edge: 0.28, soft: 0.08, shadows: true,
};
