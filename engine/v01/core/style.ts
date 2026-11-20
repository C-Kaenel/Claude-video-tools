// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Ein Stil bündelt alle Look-Werte, die der Motor braucht. Stile liegen in styles/<T-ID>_<name>/ und lesen ihre
// Werte aus shared/design-tokens.json.
import type * as THREE from "three";
import type { LightPreset } from "../light/presets";
import type { Grade, Punch } from "../post/finish";
import type { PostParams } from "../post/chain";
import type { Shot, Tiefe } from "./timeline";

export type Style = {
  name: string;
  lights: Record<string, LightPreset>;
  grades: Record<string, Grade>;       // je Lichtstimmung
  punch: Punch;
  post: PostParams;
  fovDefault?: number;
  /** Kamera-Tiefe für alle Shots des Stils (Standard aus: near 0,1 / far 1200); ein Shot kann sie mit `tiefe` überschreiben. */
  tiefe?: Tiefe;
};

/** Baut die Welt eines Shots auf. Gibt eine Funktion zurück, die pro Frame Bewegungen anwendet (optional). */
export type WorldBuilder = (ctx: { scene: THREE.Scene; shot: Shot; style: Style; fps: number }) =>
  ((ctx: { local: number; time: number; camera: THREE.PerspectiveCamera }) => void) | void;
