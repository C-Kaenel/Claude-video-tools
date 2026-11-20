// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Bühne eines Shots (innerhalb des 3D-Fensters): baut Welt, Himmel, Nebel und Sonne auf und zeichnet jedes Frame selbst:
// Kamera, Sichtlinien-Schutz, Tiefenschärfe, Effekt-Kette. Remotion wartet je Frame (Sperre), bis das Bild fertig ist.
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { continueRender, delayRender, getInputProps } from "remotion";
import { cameraAt } from "../camera/rig";
import { applyOcclusion, planOcclusion } from "../camera/occlusion";
import { makeSky } from "../light/sky";
import { setTwoTone } from "../light/twotone";
import { NOINK } from "../post/ink";
import { applyPunch } from "../post/finish";
import { makeChain, type PostToggles } from "../post/chain";
import { pxScaleFor } from "./format";
import { raumPruefung } from "../qa/raum";
import type { Shot } from "./timeline";
import type { Style, WorldBuilder } from "./style";

type Props = { shot: Shot; local: number; fps: number; style: Style; build: WorldBuilder };

const toggles = (): PostToggles => ({ ink: true, dof: true, bloom: true, finish: true, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Sonne relativ zur ersten Kamera des Shots (bleibt im Shot stehen, wandert nicht mit der Kamera). */
const sunDirection = (shot: Shot, az: number, el: number) => {
  const k = shot.camera[0];
  const fwd = new THREE.Vector3(k.look[0] - k.pos[0], 0, k.look[2] - k.pos[2]).normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  // az 0 = Sonne vor der Kamera (Gegenlicht), 90 = rechts, 180 = hinter der Kamera
  const h = fwd.clone().multiplyScalar(Math.cos(a)).add(right.multiplyScalar(Math.sin(a)));
  return h.multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
};

export const Stage: React.FC<Props> = ({ shot, local, fps, style, build }) => {
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const preset = style.lights[shot.light];
  if (!preset) throw new Error(`Lichtstimmung "${shot.light}" fehlt im Stil ${style.name}`);
  const on = useMemo(toggles, []);

  // Welt einmal pro Shot aufbauen
  const world = useMemo(() => {
    const root = new THREE.Group();
    root.name = `welt-${shot.id}`;
    const sky = makeSky(preset.sky);
    sky.layers.set(NOINK);
    root.add(sky);
    const fog = new THREE.Fog(new THREE.Color(preset.fog.color), preset.fog.near, preset.fog.far);
    const sun = new THREE.DirectionalLight(new THREE.Color(preset.sun.color), preset.sun.intensity);
    const az = shot.sun?.az ?? preset.sun.az, el = shot.sun?.el ?? preset.sun.el;
    sun.userData.dir = sunDirection(shot, az, el);
    sun.castShadow = preset.shadows;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0001;
    sun.shadow.normalBias = 0.008;   // klein, damit Schatten an ihren Kanten hängen (Simse, Gesimse)
    // Schattenbereich passend zur Einstellung (einmal pro Shot): nah = feiner Schatten, Totale = grosser Bereich
    const k0 = shot.camera[0];
    const half = Math.min(60, Math.max(14, Math.hypot(k0.look[0] - k0.pos[0], k0.look[1] - k0.pos[1], k0.look[2] - k0.pos[2]) * 1.6));
    const c = sun.shadow.camera as THREE.OrthographicCamera;
    c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 1; c.far = 300;
    root.add(sun, sun.target);
    const tick = build({ scene: root as unknown as THREE.Scene, shot, style, fps });
    setTwoTone(root, preset);
    // Sichtlinien-Schutz einmal für den ganzen Shot planen (Kamera ohne Stösse)
    const poses = Array.from({ length: shot.frames }, (_, f) => cameraAt(shot.camera, undefined, f, fps));
    const occlusion = planOcclusion(root, poses);
    if ((getInputProps() as { debug?: boolean }).debug) console.warn(`[Motor] Shot ${shot.id}: ausgeblendet ${[...occlusion.hidden].map((o) => o.name).join(", ")}`);
    if (occlusion.lookInside.length) console.warn(`[Motor] Shot ${shot.id}: Blickpunkt liegt in ${occlusion.lookInside.join(", ")} – Blickpunkt vor die Fassade legen`);
    if ((getInputProps() as { qa?: string }).qa === "raum") {
      // Raum-Prüfung (qa/raum.mjs): Positionsfehler suchen, als Konsolenzeile melden und im Bild markieren
      const { funde, details, detailNamen } = raumPruefung(root, shot.frames, fps, (f) => cameraAt(shot.camera, undefined, f, fps), size.width / size.height, tick ?? null, camera);
      console.warn(`[Raum] ${JSON.stringify({ shot: shot.id, start: shot.start, details, detailNamen, funde: funde.map((x) => ({ ...x, bild: x.bild === undefined ? undefined : shot.start + x.bild })) })}`);
    }
    return { root, sun, fog, occlusion, tick: tick ?? null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.index]);

  const chain = useMemo(() => {
    const ch = makeChain(gl, scene, cam, style.post, on);
    const grade = style.grades[shot.light] ?? Object.values(style.grades)[0];
    ch.finish.setGrade(applyPunch(grade, (getInputProps() as { punch?: typeof style.punch }).punch ?? style.punch));
    ch.ink?.setFog(preset.fog.color, preset.fog.near, preset.fog.far);
    return ch;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, cam, shot.index]);
  useEffect(() => () => { scene.remove(world.root); chain.composer.dispose(); }, [scene, world, chain]);

  // je Frame eine eigene Sperre: Remotion nimmt das Bild erst auf, wenn wir es gezeichnet haben
  const handle = useMemo(() => delayRender(`Bild ${shot.id} ${local}`), [shot.id, local]);
  useFrame(() => {}, 1); // schaltet das automatische Zeichnen von react-three-fiber ab – wir zeichnen selbst

  useLayoutEffect(() => {
    if (world.root.parent !== scene) scene.add(world.root);
    scene.fog = world.fog;                          // Nebel gilt nur an der obersten Szene
    scene.background = null;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    chain.composer.setSize(size.width, size.height);

    const pose = cameraAt(shot.camera, shot.kicks, local, fps);
    cam.position.set(...pose.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...pose.look);
    cam.rotateZ(THREE.MathUtils.degToRad(pose.roll));
    cam.fov = pose.fov;
    const tf = { ...style.tiefe, ...shot.tiefe };   // Kamera-Tiefe (Standard near 0,1 / far 1200)
    cam.near = tf.near ?? 0.1; cam.far = tf.far ?? 1200;
    if (tf.nearBoden) {
      const blick = new THREE.Vector3(pose.look[0] - pose.pos[0], pose.look[1] - pose.pos[1], pose.look[2] - pose.pos[2]).normalize();
      const boden = blick.y < -0.05 ? pose.pos[1] / -blick.y : Math.hypot(...pose.pos);
      cam.near = Math.min(tf.nearMax ?? 60, Math.max(0.1, boden * tf.nearBoden));
    }
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    cam.layers.enableAll();

    // Sonne: Richtung fest, Schattenbereich folgt dem Blickpunkt
    const dir = world.sun.userData.dir as THREE.Vector3;
    world.sun.target.position.set(...pose.look);
    world.sun.position.set(pose.look[0] + dir.x * 120, pose.look[1] + dir.y * 120, pose.look[2] + dir.z * 120);

    world.tick?.({ local, time: local / fps, camera: cam });
    scene.updateMatrixWorld(true);
    applyOcclusion(world.root, world.occlusion);
    // mit `tiefe` (Stil oder Shot): near/far – auch aus dem Welt-Tick – gelten in diesem Frame auch für Tusche und Tiefenschärfe.
    // Ohne `tiefe` behalten die Effekte near/far vom Aufbau (0,1 / 1200) – bestehende Looks bleiben bytegleich.
    if (style.tiefe || shot.tiefe) chain.kameraTiefe(cam);

    const buf = new THREE.Vector2();
    gl.getDrawingBufferSize(buf);
    const px = pxScaleFor(buf.x, buf.y);
    if (chain.ink) chain.ink.pxScale = px;
    const fp = shot.focus?.point ?? pose.look;
    const focus = new THREE.Vector3(...fp).sub(cam.position).dot(cam.getWorldDirection(new THREE.Vector3()));
    chain.dof.set(Math.max(0.2, focus), shot.focus?.strength ?? 0, px);
    if ((getInputProps() as { qa?: string }).qa === "karten") {
      // Prüf-Ebene: nur Effekt-Karten (ohne Figuren und Kulissen-Karten) auf Schwarz – für die Safe-Area-Prüfung
      const keepMask = cam.layers.mask;
      const hidden: THREE.Object3D[] = [];
      world.root.traverse((o) => { if ((o.name === "sky" || o.name === "wolke" || o.userData.figure || o.userData.kulisse || o.name === "kontaktschatten") && o.visible) { o.visible = false; hidden.push(o); } });
      cam.layers.set(NOINK);
      gl.setRenderTarget(null); gl.setClearColor(0x000000, 1); gl.clear(); gl.render(scene, cam);
      cam.layers.mask = keepMask; hidden.forEach((o) => { o.visible = true; });
    } else chain.composer.render();
    continueRender(handle);
  }, [local, handle, world, chain, size.width, size.height]);

  return null;
};
