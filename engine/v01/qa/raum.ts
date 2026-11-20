// Herkunft: eigen (V-Video), geschrieben 2026-11-11, ohne Vorlage.
// Raum-Prüfung eines Shots (läuft im Browser, wenn die Eingabe `qa: "raum"` gesetzt ist; Aufruf über qa/raum.mjs).
// Findet Positionsfehler in der 3D-Welt, die man im Bild als Fehler sieht:
//   flackern      zwei sichtbare Flächen liegen in derselben Ebene, schauen in dieselbe Richtung und überdecken sich
//                 (z. B. zwei Bodentexturen an derselben Stelle) – der Grafikchip kann keine bevorzugen, es flimmert
//   fenster-tuer  ein Fenster überschneidet eine Tür (Teile, die die Bausteine mit Batch.teil() melden)
//   steckt-in     ein Objekt (Haus, Requisit, Baum …) steckt in einem anderen (Pflanze in Pflanze zählt nicht: Kronen dürfen ineinander)
//   laeuft-durch  eine Figur steht oder läuft durch ein Objekt
//   durcheinander zwei Figuren stehen/laufen durcheinander hindurch
//   anschnitt     das Gesicht einer Figur im Bild liegt am oder über dem Bildrand (in mindestens 40 % des Shots)
//   verdeckt      der Kopf einer Figur im Bild ist von etwas anderem verdeckt (in mindestens 40 % des Shots)
//   zeit          eine Figur passt nicht in die Welt (z. B. Zylinder der Industriezeit in der Hanse um 1400)
// Dazu zählt sie die 3D-Objekte im Bild (Details) – zu wenige wirken leer und monoton.
// Jeder Fund kommt als Konsolenzeile "[Raum] {json}" heraus und wird im Bild mit einem roten Punkt markiert.
import * as THREE from "three";
import { NOINK } from "../post/ink";

export type RaumFund = { art: "flackern" | "fenster-tuer" | "steckt-in" | "laeuft-durch" | "durcheinander" | "anschnitt" | "verdeckt" | "zeit"; was: string; wo: [number, number, number]; bild?: number };
type Tick = ((a: { local: number; time: number; camera: THREE.Camera }) => void) | null;

const name = (o: THREE.Object3D) => o.name || o.type;
const isObstacle = (o: THREE.Object3D) => o.userData.occluder === true || o.userData.protect === true || !!o.userData.house;

/** Oberste Objekte (Haus, Requisit, Baum, Figur …) – ohne verschachtelte doppelt zu zählen. */
function objects(root: THREE.Object3D) {
  const out: THREE.Object3D[] = [], figs: THREE.Object3D[] = [];
  const walk = (o: THREE.Object3D) => {
    if (o.userData.figure) { figs.push(o); return; }
    if (o !== root && isObstacle(o)) { out.push(o); return; }
    o.children.forEach(walk);
  };
  walk(root);
  return { obstacles: out, figures: figs };
}

const meshesOf = (o: THREE.Object3D) => { const m: THREE.Mesh[] = []; o.traverse((c) => { if ((c as THREE.Mesh).isMesh && c.visible) m.push(c as THREE.Mesh); }); return m; };

/** Liegt der Punkt in einem geschlossenen Körper des Objekts? Strahl-Zählung in zwei Richtungen (beide ungerade = innen). */
const ray = new THREE.Raycaster();
function inside(p: THREE.Vector3, meshes: THREE.Mesh[]) {
  // Von innen trifft ein Strahl nur Rückseiten – die zählen nur, wenn beide Seiten getroffen werden (danach zurückstellen)
  const mats = new Map<THREE.Material, THREE.Side>();
  for (const m of meshes) for (const mt of Array.isArray(m.material) ? m.material : [m.material]) if (!mats.has(mt)) { mats.set(mt, mt.side); mt.side = THREE.DoubleSide; }
  try { return insideBeide(p, meshes); } finally { mats.forEach((s, mt) => { mt.side = s; }); }
}
function insideBeide(p: THREE.Vector3, meshes: THREE.Mesh[]) {
  let votes = 0;
  for (const dir of [new THREE.Vector3(1, 0.013, 0.007), new THREE.Vector3(-0.009, 0.011, 1)]) {
    ray.set(p, dir.normalize()); ray.near = 0; ray.far = 500;
    const hits = ray.intersectObjects(meshes, false);
    // gleiche Abstände (Kanten zweier Dreiecke) nur einmal zählen
    let n = 0, last = -1;
    for (const h of hits) { if (h.distance - last > 1e-4) n++; last = h.distance; }
    if (n % 2 === 1) votes++;
  }
  return votes === 2;
}

/** Ist der Punkt im Bild der Kamera und nicht verdeckt? `own`: Netze, die den Punkt selbst tragen (dürfen getroffen werden);
 * `ownGanz`: eigene Netze zählen überall als sichtbar (Figur: der Strahl zur Kopfmitte trifft bei Würfel-Köpfen die eigene Fläche). */
function visible(p: THREE.Vector3, cams: THREE.PerspectiveCamera[], all: THREE.Mesh[], own?: Set<THREE.Object3D>, ownGanz = false) {
  for (const c of cams) {
    const ndc = p.clone().project(c);
    if (ndc.z > 1 || Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) continue;
    const dir = p.clone().sub(c.position), dist = dir.length();
    ray.set(c.position, dir.normalize()); ray.near = 0.1; ray.far = dist + 0.05;
    const hit = ray.intersectObjects(all, false)[0];
    // eigenes Netz zählt nur direkt an der Stelle (zusammengefasste Netze: die Hausfront davor verdeckt trotzdem)
    if (!hit || hit.distance > dist - 0.04 || (own && own.has(hit.object) && (ownGanz || hit.point.distanceTo(p) < 0.15))) return true;
  }
  return false;
}

// ---------- flackern: deckungsgleiche Flächen ----------
type Tri = { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; src: string; owner: string; mesh: THREE.Mesh };
function clip(poly: [number, number][], a: [number, number], b: [number, number]) {
  const out: [number, number][] = [];
  const side = (p: [number, number]) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
  }
  return out;
}
const area = (p: [number, number][]) => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i][0] * q[1] - q[0] * p[i][1]; } return s / 2; };
/** Überlappung zweier Dreiecke in der Ebene: Fläche und Schwerpunkt der Schnittfläche. */
function overlap2D(t1: [number, number][], t2: [number, number][]) {
  const ccw = (t: [number, number][]) => (area(t) < 0 ? [t[0], t[2], t[1]] as [number, number][] : t);
  let poly = ccw(t1); const c = ccw(t2);
  for (let i = 0; i < 3 && poly.length; i++) poly = clip(poly, c[i], c[(i + 1) % 3]);
  if (poly.length < 3) return { a: 0, mitte: [0, 0] as [number, number] };
  const A = area(poly);
  if (Math.abs(A) < 1e-12) return { a: 0, mitte: poly[0] };
  let sx = 0, sy = 0;
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length], k = p[0] * q[1] - q[0] * p[1]; sx += (p[0] + q[0]) * k; sy += (p[1] + q[1]) * k; }
  return { a: Math.abs(A), mitte: [sx / (6 * A), sy / (6 * A)] as [number, number] };
}

function flicker(root: THREE.Object3D, cameras: THREE.PerspectiveCamera[], owners: Map<THREE.Object3D, string>, all: THREE.Mesh[]): RaumFund[] {
  const cams = cameras.map((c) => c.position);
  const R = 45, tris: Tri[] = [];
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.visible || m.layers.isEnabled(NOINK) || o.name === "sky") return;
    let owner = ""; for (let p: THREE.Object3D | null = o; p; p = p.parent) { const n = owners.get(p); if (n) { owner = n; break; } }
    const pos = m.geometry.getAttribute("position"), idx = m.geometry.index;
    if (!pos) return;
    const count = idx ? idx.count : pos.count;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (let i = 0; i + 2 < count; i += 3) {
      for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
      const cx = (v[0].x + v[1].x + v[2].x) / 3, cy = (v[0].y + v[1].y + v[2].y) / 3, cz = (v[0].z + v[1].z + v[2].z) / 3;
      if (!cams.some((c) => Math.hypot(c.x - cx, c.y - cy, c.z - cz) < R)) continue;
      const grp = m.geometry.groups.find((g) => i >= g.start && i < g.start + g.count);
      tris.push({ a: v[0].clone(), b: v[1].clone(), c: v[2].clone(), src: `${m.uuid}|${mats[grp?.materialIndex ?? 0]?.uuid}`, owner, mesh: m });
    }
  });
  // Vorsortierung in Fächer: gerundete Richtung + Ebenen-Abstand vom Weltmittelpunkt, gemessen mit der GERUNDETEN Richtung
  // (sonst landen fast parallele, deckungsgleiche Flächen weit draussen – x · Richtungsunterschied – in verschiedenen Fächern)
  const buckets = new Map<string, number[]>();
  const nKey = (n: THREE.Vector3) => `${Math.round(n.x * 50)},${Math.round(n.y * 50)},${Math.round(n.z * 50)}`;
  const nRund = (n: THREE.Vector3) => new THREE.Vector3(Math.round(n.x * 50), Math.round(n.y * 50), Math.round(n.z * 50)).normalize();
  const info = tris.map((t, i) => {
    const n = new THREE.Vector3().subVectors(t.b, t.a).cross(new THREE.Vector3().subVectors(t.c, t.a));
    const len = n.length();
    if (len < 1e-8) return null;
    n.divideScalar(len);
    const d = n.dot(t.a), fach = Math.round(nRund(n).dot(t.a) / 0.003);
    const k = `${nKey(n)},${fach}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(i);
    return { n, d, fach, area: len / 2 };
  });
  // Abstand von Punkt p zur Ebene des Dreiecks i, vor Ort gemessen (von seiner Ecke a aus, nicht vom Weltmittelpunkt)
  const abstand = (fi: { n: THREE.Vector3 }, a: THREE.Vector3, p: THREE.Vector3) => Math.abs(fi.n.x * (p.x - a.x) + fi.n.y * (p.y - a.y) + fi.n.z * (p.z - a.z));
  const funde: RaumFund[] = [], seen = new Set<string>();
  for (let i = 0; i < tris.length; i++) {
    const fi = info[i]; if (!fi || fi.area < 1e-4) continue;
    const n = fi.n, base = fi.fach;
    for (const dd of [-1, 0, 1]) {
      const list = buckets.get(`${nKey(n)},${base + dd}`);
      if (!list) continue;
      for (const j of list) {
        if (j <= i || tris[j].src === tris[i].src) continue;
        // gleiche Richtung und alle drei Ecken von j höchstens 4 mm von der Ebene von i (vor Ort – weit vom Weltmittelpunkt genauso genau)
        const fj = info[j]!, ti = tris[i], tj = tris[j];
        if (fj.n.dot(n) < 0.999 || Math.max(abstand(fi, ti.a, tj.a), abstand(fi, ti.a, tj.b), abstand(fi, ti.a, tj.c)) > 0.004) continue;
        // in die Ebene projizieren
        const u = new THREE.Vector3().subVectors(tris[i].b, tris[i].a).normalize(), w = new THREE.Vector3().crossVectors(n, u);
        const pr = (p: THREE.Vector3): [number, number] => [p.dot(u), p.dot(w)];
        const { a: A, mitte } = overlap2D([pr(tris[i].a), pr(tris[i].b), pr(tris[i].c)], [pr(tris[j].a), pr(tris[j].b), pr(tris[j].c)]);
        if (A < 0.002) continue;
        // Mitte der Schnittfläche (nicht des Dreiecks – grosse Bodendreiecke reichen weit aus dem Bild)
        const c = new THREE.Vector3().addScaledVector(u, mitte[0]).addScaledVector(w, mitte[1]).addScaledVector(n, fi.d);
        const key = `${tris[i].owner}|${tris[j].owner}|${Math.round(c.x)},${Math.round(c.y)},${Math.round(c.z)}`;
        if (seen.has(key)) continue; seen.add(key);
        // Rückseiten (Fläche zeigt von allen Kameras weg, z. B. Gesims-Rückseite an der Wand) sieht niemand
        if (!cameras.some((cm) => n.dot(cm.position.clone().sub(c)) > 0)) continue;
        // nur, was die Kamera wirklich sieht (Punkt etwas vor die Fläche, damit die Fläche selbst nicht verdeckt)
        if (!visible(c.clone().addScaledVector(n, 0.01), cameras, all, new Set([tris[i].mesh, tris[j].mesh]))) continue;
        funde.push({ art: "flackern", was: `${tris[i].owner || "?"} ↔ ${tris[j].owner || "?"}: zwei Flächen deckungsgleich (${(A * 1e4).toFixed(0)} cm²)`, wo: [c.x, c.y, c.z] });
      }
    }
  }
  return funde;
}

// ---------- Teile: Fenster in Tür ----------
function windowInDoor(obstacles: THREE.Object3D[]): RaumFund[] {
  const funde: RaumFund[] = [];
  for (const o of obstacles) o.traverse((g) => {
    const teile = g.userData.teile as { art: string; min: number[]; max: number[] }[] | undefined;
    if (!teile) return;
    const tuer = teile.filter((t) => t.art === "tuer"), fenster = teile.filter((t) => t.art === "fenster");
    for (const d of tuer) for (const f of fenster) {
      const ov = [0, 1, 2].map((k) => Math.min(d.max[k], f.max[k]) - Math.max(d.min[k], f.min[k]));
      if (ov[0] > 0.02 && ov[1] > 0.02) {
        const c = new THREE.Vector3(...[0, 1, 2].map((k) => (Math.max(d.min[k], f.min[k]) + Math.min(d.max[k], f.max[k])) / 2) as [number, number, number]).applyMatrix4(g.matrixWorld);
        funde.push({ art: "fenster-tuer", was: `${name(o)}: Fenster überschneidet die Tür`, wo: [c.x, c.y, c.z] });
      }
    }
  });
  return funde;
}

// ---------- Objekte ineinander ----------
const PFLANZE = /^(baum|kiefer|busch)/i;
function stuckInside(obstacles: THREE.Object3D[], cameras: THREE.PerspectiveCamera[], all: THREE.Mesh[]): RaumFund[] {
  const cams = cameras.map((c) => c.position);
  const near = obstacles.filter((o) => { const b = new THREE.Box3().setFromObject(o); return cams.some((c) => b.distanceToPoint(c) < 50); });
  const boxes = near.map((o) => new THREE.Box3().setFromObject(o)), meshes = near.map(meshesOf);
  const funde: RaumFund[] = [], v = new THREE.Vector3();
  for (let i = 0; i < near.length; i++) for (let j = 0; j < near.length; j++) {
    if (i === j || !boxes[i].intersectsBox(boxes[j])) continue;
    // Pflanzen (Baum, Kiefer, Busch) dürfen sich überlappen – Kronen wachsen ineinander (so gewünscht, z. B. stadt-park)
    if (PFLANZE.test(name(near[i])) && PFLANZE.test(name(near[j]))) continue;
    const ov = boxes[i].clone().intersect(boxes[j]), s = ov.getSize(new THREE.Vector3());
    const houses = !!near[i].userData.house && !!near[j].userData.house;
    if (Math.min(s.x, s.y, s.z) < (houses ? 0.3 : 0.08)) continue;
    // Eckpunkte von i, die im Überlappungsraum liegen, in j testen
    let tested = 0, inn = 0; const at = new THREE.Vector3();
    outer: for (const m of meshes[i]) {
      const pos = m.geometry.getAttribute("position");
      const step = Math.max(1, Math.floor(pos.count / 400));
      for (let k = 0; k < pos.count; k += step) {
        v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld);
        if (!ov.containsPoint(v)) continue;
        // Punkt leicht ins Innere von i ziehen, damit Berührungsflächen nicht zählen
        tested++;
        if (inside(v, meshes[j])) { inn++; at.copy(v); }
        if (tested >= 120) break outer;
      }
    }
    const ownIJ = new Set<THREE.Object3D>([...meshes[i], ...meshes[j]]);
    const center = ov.getCenter(new THREE.Vector3());
    if (inn >= 4 && inn / Math.max(1, tested) > 0.15 && visible(center, cameras, all, ownIJ)) funde.push({ art: "steckt-in", was: `${name(near[i])} steckt in ${name(near[j])} (${inn} Punkte)`, wo: [at.x, at.y, at.z] });
  }
  return funde;
}

/** Ganze Prüfung eines Shots. `simulate` bewegt die Welt auf Bild f (wie beim Rendern). */
export function raumPruefung(root: THREE.Object3D, frames: number, fps: number, pose: (f: number) => { pos: [number, number, number]; look: [number, number, number]; fov: number }, aspect: number, tick: Tick, camera: THREE.Camera): { funde: RaumFund[]; details: number; detailNamen: string[] } {
  const cameras = [0, Math.floor(frames / 2), frames - 1].map((f) => {
    const p = pose(f), c = new THREE.PerspectiveCamera(p.fov, aspect, 0.1, 1200);
    c.position.set(...p.pos); c.lookAt(...p.look); c.updateMatrixWorld(); c.updateProjectionMatrix();
    c.userData.blickM = Math.hypot(p.pos[0] - p.look[0], p.pos[1] - p.look[1], p.pos[2] - p.look[2]); return c;
  });
  tick?.({ local: 0, time: 0, camera }); root.updateMatrixWorld(true);
  const { obstacles, figures } = objects(root);
  const owners = new Map<THREE.Object3D, string>(obstacles.map((o) => [o, name(o)]));
  const all: THREE.Mesh[] = []; root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible && !m.layers.isEnabled(NOINK) && o.name !== "sky") all.push(m); });
  const funde: RaumFund[] = [...flicker(root, cameras, owners, all), ...windowInDoor(obstacles), ...stuckInside(obstacles, cameras, all)];

  // Figuren über den ganzen Shot: in Objekten? durcheinander?
  const obsBoxes = obstacles.map((o) => new THREE.Box3().setFromObject(o)), obsMeshes = obstacles.map(meshesOf);
  const reported = new Set<string>(), p = new THREE.Vector3();
  const prev = new Map<THREE.Object3D, THREE.Vector3>();
  // Bildausschnitt: je Figur zählen, wie oft sie im Bild ist und wie oft ihr Kopf angeschnitten oder verdeckt ist
  const figMeshes = figures.map((g) => new Set<THREE.Object3D>(meshesOf(g)));
  const aus = figures.map(() => ({ im: 0, cut: 0, hid: 0, cutAt: -1, hidAt: -1, wo: [0, 0, 0] as [number, number, number] }));
  for (let f = 0; f < frames; f += 2) {
    tick?.({ local: f, time: f / fps, camera }); root.updateMatrixWorld(true);
    const pos = figures.map((g) => g.getWorldPosition(new THREE.Vector3()));
    const pf = pose(f), cam = new THREE.PerspectiveCamera(pf.fov, aspect, 0.1, 1200);
    cam.position.set(...pf.pos); cam.lookAt(...pf.look); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    figures.forEach((g, a) => {
      const b = new THREE.Box3().setFromObject(g); if (b.isEmpty()) return;
      const h = b.max.y - b.min.y, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      const body = new THREE.Vector3(cx, b.min.y + h * 0.45, cz), nb = body.clone().project(cam);
      if (nb.z > 1 || Math.abs(nb.x) > 0.95 || Math.abs(nb.y) > 0.95 || body.distanceTo(cam.position) > 25) return;
      const s = aus[a]; s.im++;
      const head = new THREE.Vector3(cx, b.max.y - h * 0.25, cz);   // Gesichtsmitte (Hut/Kapuze darf in Nahaufnahmen angeschnitten sein)
      const nh = head.clone().project(cam);
      if (Math.abs(nh.y) > 0.9 || Math.abs(nh.x) > 0.9) { s.cut++; if (s.cutAt < 0) { s.cutAt = f; s.wo = [head.x, head.y, head.z]; } }
      else if (!visible(head, [cam], all, figMeshes[a], true)) { s.hid++; if (s.hidAt < 0) { s.hidAt = f; s.wo = [head.x, head.y, head.z]; } }
    });
    figures.forEach((g, a) => {
      for (const h of [0.35, 1.0]) {
        p.copy(pos[a]).add(new THREE.Vector3(0, h, 0));
        obstacles.forEach((o, k) => {
          const key = `${name(g)}|${name(o)}`;
          if (reported.has(key) || !obsBoxes[k].containsPoint(p)) return;
          if (inside(p, obsMeshes[k])) { reported.add(key); funde.push({ art: "laeuft-durch", was: `Figur ${name(g)} steckt/läuft in ${name(o)}`, wo: [p.x, p.y, p.z], bild: f }); }
        });
      }
      for (let b = a + 1; b < figures.length; b++) {
        const dist = Math.hypot(pos[a].x - pos[b].x, pos[a].z - pos[b].z);
        const moved = [a, b].some((q) => { const pv = prev.get(figures[q]); return pv && pv.distanceTo(pos[q]) > 0.01; });
        const key = `${name(figures[a])}#${a}|${name(figures[b])}#${b}`;
        if (dist < 0.3 && moved && !reported.has(key)) { reported.add(key); funde.push({ art: "durcheinander", was: `Figuren ${name(figures[a])} und ${name(figures[b])} laufen durcheinander`, wo: [pos[a].x, pos[a].y + 1, pos[a].z], bild: f }); }
      }
    });
    figures.forEach((g, a) => prev.set(g, pos[a].clone()));
  }
  tick?.({ local: 0, time: 0, camera });
  figures.forEach((g) => { const z = g.userData.fremdeZeit as string | undefined; if (z) { const p0 = g.getWorldPosition(new THREE.Vector3()); funde.push({ art: "zeit", was: `Figur ${name(g)} passt nicht: ${z}`, wo: [p0.x, p0.y + 1, p0.z] }); } });
  figures.forEach((g, a) => {
    const s = aus[a]; if (s.im < 3) return;
    if (s.cut / s.im >= 0.4) funde.push({ art: "anschnitt", was: `Gesicht von ${name(g)} liegt am Bildrand (${Math.round(100 * s.cut / s.im)} % der Zeit im Bild)`, wo: s.wo, bild: s.cutAt });
    if (s.hid / s.im >= 0.4) funde.push({ art: "verdeckt", was: `Kopf von ${name(g)} ist verdeckt (${Math.round(100 * s.hid / s.im)} % der Zeit im Bild)`, wo: s.wo, bild: s.hidAt });
  });

  // rote Marken in die Welt (nur für die Prüfbilder)
  const mat = new THREE.MeshBasicMaterial({ color: 0xff0033, depthTest: false, transparent: true, opacity: 0.85 });
  for (const fu of funde) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mat);
    s.position.set(...fu.wo); s.renderOrder = 999; s.layers.set(NOINK); s.name = "raum-marke";
    root.add(s);
  }
  // Details: sichtbare 3D-Objekte (Häuser, Bäume, Requisiten …) in der Mitte des Shots
  const mid = cameras[1], fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(mid.projectionMatrix, mid.matrixWorldInverse));
  // gezählt: jede Bauteil-Gruppe mit eigenen Netzen (Haus, Baum, Fass, Schiff, Fahne …), ohne Boden, Wasser, Himmel;
  // zusammengefasste Welten (ein Netz je Material) melden ihre Objekte als `userData.objekte = [{art, min, max}]`
  // (Gruppen-Koordinaten) – dann zählt jedes Objekt einzeln. Bis 60 m oder 1,5 × Abstand Kamera–Blickpunkt (Vogelperspektive).
  const weit = Math.max(60, 1.5 * (mid.userData.blickM ?? 0));
  const flach = /^(welt-|sky|himmel|boden|ground|strasse|street|wasser|water|platz|pflaster|gelaende|terrain|kai|randstein|bollwerk|hanse$|stadt$|town$|korea$)/i;
  const gruppen = new Set<THREE.Object3D>();
  all.forEach((m) => { const g = m.parent; if (g && g !== root && !flach.test(g.name) && !flach.test(m.name)) gruppen.add(g); });
  const namen: string[] = [];
  gruppen.forEach((g) => {
    const obj = g.userData.objekte as { art: string; min: number[]; max: number[] }[] | undefined;
    if (obj?.length) {
      for (const o of obj) {
        const b = new THREE.Box3(new THREE.Vector3(...o.min), new THREE.Vector3(...o.max)).applyMatrix4(g.matrixWorld);
        if (fr.intersectsBox(b) && b.distanceToPoint(mid.position) < weit) namen.push(o.art);
      }
      return;
    }
    const b = new THREE.Box3().setFromObject(g); if (!b.isEmpty() && fr.intersectsBox(b) && b.distanceToPoint(mid.position) < weit) namen.push(g.name || "?");
  });
  return { funde, details: namen.length, detailNamen: namen };
}
