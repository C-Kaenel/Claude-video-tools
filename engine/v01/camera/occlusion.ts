// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Sichtlinien-Schutz: Was zwischen Kamera und Blickpunkt steht, wird ausgeblendet – ausser es ist als Story-Requisit
// geschützt (userData.protect = true). Teilnehmer: Objekte mit userData.occluder = true (Häuser, Bäume, grosse Requisiten).
// Entschieden wird EINMAL PRO SHOT über alle Frames (ohne Stösse): Was irgendwann im Weg steht, bleibt den ganzen Shot
// ausgeblendet. So flackert nichts, und jedes Frame ist unabhängig davon, in welcher Reihenfolge gerendert wird.
import * as THREE from "three";
import type { V3 } from "./rig";

const box = new THREE.Box3();
const ray = new THREE.Ray();
const hit = new THREE.Vector3();
const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();

export type OcclusionPlan = { hidden: Set<THREE.Object3D>; lookInside: string[] };

/** Prüft alle Kamera-Posen eines Shots; gibt die auszublendenden Objekte zurück (+ Warnung, wenn der Blickpunkt in einem Objekt liegt). */
export const planOcclusion = (root: THREE.Object3D, poses: { pos: V3; look: V3 }[], margin = 0.3): OcclusionPlan => {
  root.updateMatrixWorld(true);
  const parts: { o: THREE.Object3D; bb: THREE.Box3 }[] = [];
  root.traverse((o) => {
    if (o.userData.occluder && !o.userData.protect) parts.push({ o, bb: box.setFromObject(o).clone().expandByScalar(-0.02) });
  });
  const plan: OcclusionPlan = { hidden: new Set(), lookInside: [] };
  for (const p of poses) {
    a.set(...p.pos); b.set(...p.look);
    const len = a.distanceTo(b);
    ray.set(a, dir.copy(b).sub(a).normalize());
    for (const { o, bb } of parts) {
      if (bb.containsPoint(b) && !plan.lookInside.includes(o.name)) plan.lookInside.push(o.name || o.uuid);
      if (bb.containsPoint(a) || (ray.intersectBox(bb, hit) && hit.distanceTo(a) < len - margin)) plan.hidden.add(o);
    }
  }
  return plan;
};

/** Setzt die Sichtbarkeit nach dem Plan (alle anderen Teilnehmer sichtbar). */
export const applyOcclusion = (root: THREE.Object3D, plan: OcclusionPlan) => {
  root.traverse((o) => { if (o.userData.occluder) o.visible = !plan.hidden.has(o); });
};
