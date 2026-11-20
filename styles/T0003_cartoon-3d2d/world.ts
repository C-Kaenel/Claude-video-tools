// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Welt des Stils T0003: die Stadt aus dem Baukasten des Motors, in den Farben und Lichtstimmungen dieses Stils.
import * as THREE from "three";
import { Kit, town, type WorldBuilder } from "../../engine/v01";
import { LOOKS } from "./style";

export const buildTown: WorldBuilder = ({ scene, shot, style }) => {
  const kit = new Kit(style.lights[shot.light], 1);
  const t = town(kit, LOOKS[shot.light] ?? LOOKS.day, 1);
  scene.add(t.root);
  const sun = scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight);
  return ({ time, camera }) => t.tick(time, camera, sun?.userData.dir as THREE.Vector3 | undefined);
};
