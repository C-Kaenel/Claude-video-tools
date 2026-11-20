// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Testwelt: Boden, einfache Häuser (als Sichtlinien-Hindernisse), ein drehender Würfel, eine leuchtende Kugel
// (Leuchten), eine Text-Karte ohne Welt-Tusche (Schriften + Ausnahme). Alles im Code erzeugt.
import * as THREE from "three";
import { FONT, NOINK, Rng, twoTone, type WorldBuilder } from "../../index";

const card = (text: string) => {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fffaf0"; g.strokeStyle = "#241726"; g.lineWidth = 22;
  g.beginPath(); g.roundRect(20, 20, 984, 472, 60); g.fill(); g.stroke();
  g.fillStyle = "#241726"; g.font = `150px ${FONT.display}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, 512, 260);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.layers.set(NOINK);
  m.name = "karte";
  return m;
};

export const buildTestWorld: WorldBuilder = ({ scene, shot, style }) => {
  const p = style.lights[shot.light];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), twoTone(p, "#a39a8c"));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const rng = new Rng(7);
  const colors = ["#a8553f", "#e6d5b0", "#c89a4a", "#b86b4b"];
  for (let i = 0; i < 9; i++) {
    const h = rng.pick([7, 8.4, 9.8]), w = rng.range(5, 8);
    const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, 6), twoTone(p, colors[i % colors.length]));
    house.position.set(-24 + i * 7.2, h / 2, -14);
    house.castShadow = house.receiveShadow = true;
    house.userData.occluder = true;
    house.name = `haus${i}`;
    scene.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.75, 2.6, 4), twoTone(p, "#7a4a3a"));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(house.position.x, h + 1.3, -14);
    roof.castShadow = true;
    scene.add(roof);
  }
  // Hindernis genau im Kamerapfad von Shot 3 (muss ausgeblendet werden)
  const block = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), twoTone(p, "#5d7a3a"));
  block.position.set(0, 3, 5);
  block.userData.occluder = true;
  block.name = "hindernis";
  block.castShadow = true;
  scene.add(block);

  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), twoTone(p, "#3f6fb5"));
  cube.position.set(-3, 1.2, 0);
  cube.castShadow = true;
  scene.add(cube);

  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd27a").multiplyScalar(4) }));
  glow.position.set(3.2, 2.6, -1);
  scene.add(glow);

  const sign = card("TEST");
  sign.position.set(0.6, 2.2, 1.2);
  scene.add(sign);

  return ({ time, camera }) => {
    cube.rotation.set(time * 0.6, time * 0.9, 0);
    sign.lookAt(camera.position.x, sign.position.y, camera.position.z); // Karte schaut zur Kamera (aufrecht)
  };
};
