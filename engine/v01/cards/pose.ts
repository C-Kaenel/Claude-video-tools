// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Haltungen der Karten-Figuren. Jedes Glied hat zwei Abschnitte; Winkel in Grad, 0 = senkrecht nach unten,
// positiv = im Bild nach rechts (180 = nach oben). Der zweite Winkel ist die Beugung relativ zum ersten.
// `phase` läuft 0…1 je Schrittzyklus (Gehen, Marschieren) bzw. ist der Fortschritt (Fallen); `time` in Sekunden.

export const POSES = ["stand", "walk", "march", "sit", "fall", "wave", "point", "raise", "hold", "shout", "tilt", "lean"] as const;
export type Pose = (typeof POSES)[number];

export type Limb = [number, number];
export type PoseFrame = {
  armL: Limb; armR: Limb; legL: Limb; legR: Limb;
  bob: number;        // Anheben des Oberkörpers (Anteil der Rumpfhöhe)
  lean: number;       // Körper neigen (Grad, um die Hüfte)
  headTilt: number;   // Kopf neigen (Grad, um den Hals)
  sit: number;        // 0 = steht, 1 = sitzt (Hüfte tiefer)
  fall: number;       // Drehung der ganzen Figur (Grad, um die Füsse)
};

const REST: PoseFrame = { armL: [-13, 6], armR: [13, -6], legL: [-3, 0], legR: [3, 0], bob: 0, lean: 0, headTilt: 0, sit: 0, fall: 0 };
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };

export const poseAt = (pose: Pose, phase: number, time: number): PoseFrame => {
  const s = Math.sin(phase * Math.PI * 2);
  switch (pose) {
    case "stand": return REST;
    case "walk": return {
      ...REST,
      legL: [24 * s, -32 * Math.max(0, -s)], legR: [-24 * s, -32 * Math.max(0, s)],
      armL: [-12 - 16 * s, 10], armR: [12 - 16 * s, -10],
      bob: 0.05 * Math.abs(Math.cos(phase * Math.PI * 2)),
    };
    case "march": return {
      ...REST,
      legL: [34 * s, -60 * Math.max(0, s)], legR: [-34 * s, -60 * Math.max(0, -s)],
      armL: [-10 - 32 * s, 0], armR: [10 - 32 * s, 0],
      bob: 0.06 * Math.abs(Math.cos(phase * Math.PI * 2)),
    };
    case "sit": return { ...REST, legL: [-38, 46], legR: [38, -46], armL: [-8, 30], armR: [8, -30], sit: 1 };
    case "fall": {
      const p = smooth(phase);
      return { ...REST, armL: [-13 - 140 * p, 20 * p], armR: [13 + 140 * p, -20 * p], legL: [-3 - 25 * p, 20 * p], legR: [3 + 25 * p, -20 * p], fall: 78 * p };
    }
    case "wave": return { ...REST, armR: [135, 30 * Math.sin(time * Math.PI * 4)] };
    case "point": return { ...REST, armR: [92, -4] };
    case "raise": return { ...REST, armR: [172, 0] };
    case "hold": return { ...REST, armL: [28, 62], armR: [-28, -62] };
    case "shout": return { ...REST, armR: [150, 42] };
    case "tilt": return { ...REST, headTilt: 14 };
    case "lean": return { ...REST, lean: 10, headTilt: 4 };
  }
};
