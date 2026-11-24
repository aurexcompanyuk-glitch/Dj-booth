// Instanced trees and rocks (tiled, two LODs), run marker poles, start and finish gates, lodges,
// chairlift, collectible rings, soaring birds over the thermals and the ski-flying distance boards.
import * as THREE from 'three';
import { mulberry32, Simplex2 } from './noise.js';
import { lerp, clamp } from './util.js';
import { HALF, LIFT_X, LODGE, HUT, DIFF, ridgeZ, VALLEY_F } from './world.js';

// ------------------------------------------------------------------ geometry helpers
function pushTri(out, a, b, c, ca, cb, cc) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l; ny /= l; nz /= l;
  out.p.push(...a, ...b, ...c);
  out.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  out.c.push(...ca, ...cb, ...cc);
}

function toGeometry(out) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out.p, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.n, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(out.c, 3));
  g.computeBoundingSphere();
  return g;
}

// Cone with smooth-ish normals (normals tilted outward), jittered rim
function cone(out, r, y0, h, seg, colRim, colTip, rng, jitter = 0, smooth = true) {
  const tip = [0, y0 + h, 0];
  const rim = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2 + (i === seg ? 0 : 0);
    const rr = r * (1 + (i < seg ? (rng() - 0.5) * jitter : 0));
    const yy = y0 + (i < seg ? (rng() - 0.5) * jitter * h * 0.6 : 0);
    rim.push([Math.cos(a) * rr, yy, Math.sin(a) * rr]);
  }
  rim[seg] = rim[0];
  for (let i = 0; i < seg; i++) {
    const a = rim[i], b = rim[i + 1];
    const start = out.p.length;
    pushTri(out, a, tip, b, colRim, colTip, colRim);
    if (smooth) {
      // outward-tilted normals for soft shading
      const slope = r / h;
      for (let k = 0; k < 3; k++) {
        const vx = out.p[start + k * 3], vz = out.p[start + k * 3 + 2];
        let ang = Math.atan2(vz, vx);
        if (k === 1) { const m = Math.atan2((a[2] + b[2]) / 2, (a[0] + b[0]) / 2); ang = m; }
        const nx = Math.cos(ang), nz = Math.sin(ang), ny = slope;
        const l = Math.hypot(nx, ny, nz);
        out.n[start + k * 3] = nx / l; out.n[start + k * 3 + 1] = ny / l; out.n[start + k * 3 + 2] = nz / l;
      }
    }
  }
}

function cylinder(out, r0, r1, y0, h, seg, col) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], p1 = [Math.cos(a1) * r0, y0, Math.sin(a1) * r0];
    const q0 = [Math.cos(a0) * r1, y0 + h, Math.sin(a0) * r1], q1 = [Math.cos(a1) * r1, y0 + h, Math.sin(a1) * r1];
    pushTri(out, p0, q0, p1, col, col, col);
    pushTri(out, p1, q0, q1, col, col, col);
  }
}

export function makeConiferGeometry(detail, seed = 3) {
  const rng = mulberry32(seed);
  const out = { p: [], n: [], c: [] };
  const trunk = [0.28, 0.2, 0.14];
  const green = [0.11, 0.22, 0.14], greenDark = [0.07, 0.15, 0.1];
  const snow = [0.9, 0.93, 0.98];
  const layers = detail ? 5 : 2, seg = detail ? 9 : 6;
  cylinder(out, 0.24, 0.14, 0, 2.4, detail ? 6 : 4, trunk);
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 0 : i / (layers - 1);
    const r = lerp(2.7, 1.0, t), y0 = lerp(1.4, 7.4, t), h = lerp(3.6, 2.7, t);
    cone(out, r, y0, h, seg, greenDark, green, rng, 0.18);
    // snow resting on the upper half of each layer
    const capY = y0 + h * 0.3;
    cone(out, r * 0.7 * 1.04, capY, h * 0.7 + 0.1, seg, snow, snow, rng, detail ? 0.3 : 0.15);
  }
  return toGeometry(out);
}

function makeRockGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const n = new Simplex2(seed);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = 1 + 0.28 * n.noise(x * 1.7 + seed, z * 1.7 + y) + 0.12 * n.noise(x * 4.1, y * 4.1 + z);
    p.setXYZ(i, x * d * 1.15, y * d * 0.72, z * d);
  }
  const ng = g.index ? g.toNonIndexed() : g;
  ng.computeVertexNormals();
  const col = [];
  const pp = ng.attributes.position, nn = ng.attributes.normal;
  for (let i = 0; i < pp.count; i += 3) {
    const ny = (nn.getY(i) + nn.getY(i + 1) + nn.getY(i + 2)) / 3;
    const snowy = ny > 0.62;
    const c = snowy ? [0.9, 0.92, 0.96] : [0.36, 0.34, 0.33];
    for (let k = 0; k < 3; k++) col.push(...c);
  }
  ng.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return ng;
}

// ------------------------------------------------------------------ tiled instances
class TiledInstances {
  constructor(parent, opts) {
    this.tiles = [];
    this.near = opts.nearDist;
    this.far = opts.farDist;
    const T = opts.tile;
    const n = Math.ceil((HALF * 2) / T);
    const buckets = new Array(n * n);
    for (let i = 0; i < opts.count; i++) {
      const x = opts.data[i * opts.stride], z = opts.data[i * opts.stride + 2];
      const ti = clamp(Math.floor((x + HALF) / T), 0, n - 1), tj = clamp(Math.floor((z + HALF) / T), 0, n - 1);
      (buckets[tj * n + ti] || (buckets[tj * n + ti] = [])).push(i);
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const color = new THREE.Color();
    buckets.forEach((list, k) => {
      if (!list) return;
      const tx = -HALF + ((k % n) + 0.5) * T, tz = -HALF + (Math.floor(k / n) + 0.5) * T;
      const meshes = [];
      for (const [geo, mat, cast] of [[opts.nearGeo, opts.material, opts.castShadow], [opts.farGeo, opts.material, false]]) {
        if (!geo) { meshes.push(null); continue; }
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((idx, j) => {
          opts.transform(idx, p, e, s);
          q.setFromEuler(e);
          m.compose(p, q, s);
          im.setMatrixAt(j, m);
          if (opts.color) { opts.color(idx, color); im.setColorAt(j, color); }
        });
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        im.computeBoundingSphere();
        im.castShadow = cast;
        im.receiveShadow = !!opts.receiveShadow;
        im.visible = false;
        parent.add(im);
        meshes.push(im);
      }
      this.tiles.push({ x: tx, z: tz, near: meshes[0], far: meshes[1], r: T * 0.71 });
    });
  }

  update(cam) {
    for (const t of this.tiles) {
      const d = Math.max(0, Math.hypot(cam.x - t.x, cam.z - t.z) - t.r);
      const useNear = d < this.near;
      if (t.near) t.near.visible = useNear;
      if (t.far) t.far.visible = !useNear && d < this.far;
      else if (t.near) t.near.visible = d < this.far;
    }
  }
}

export class Scenery {
  constructor(scene, world, quality) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.world = world;
    this.quality = quality;
    const treeMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const tr = world.trees;
    this.trees = new TiledInstances(this.group, {
      data: tr, stride: 6, count: world.treeCount, tile: 256,
      nearGeo: makeConiferGeometry(true, 7), farGeo: makeConiferGeometry(false, 9),
      material: treeMat, castShadow: quality.treeShadows, receiveShadow: false,
      nearDist: quality.treeNear, farDist: quality.treeFar,
      transform: (i, p, e, s) => {
        const o = i * 6;
        p.set(tr[o], tr[o + 1] - 0.4, tr[o + 2]);
        e.set(0, tr[o + 4], 0);
        const sc = tr[o + 3];
        s.set(sc * (0.9 + tr[o + 5] * 0.2), sc, sc * (0.9 + tr[o + 5] * 0.2));
      },
      color: (i, c) => { const v = tr[i * 6 + 5]; c.setRGB(0.85 + v * 0.3, 0.9 + v * 0.2, 0.85 + v * 0.25); },
    });

    const rk = world.rocks;
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    this.rocks = new TiledInstances(this.group, {
      data: rk, stride: 6, count: world.rockCount, tile: 256,
      nearGeo: makeRockGeometry(11), farGeo: null, material: rockMat, castShadow: true, receiveShadow: true,
      nearDist: quality.treeFar * 0.9, farDist: quality.treeFar * 0.9,
      transform: (i, p, e, s) => {
        const o = i * 6, sc = rk[o + 3];
        p.set(rk[o], rk[o + 1], rk[o + 2]);
        e.set(0.2 * Math.sin(i), rk[o + 4], 0.15 * Math.cos(i * 1.7));
        s.set(sc * (1 + 0.3 * Math.sin(i * 3.1)), sc, sc * (1 + 0.3 * Math.cos(i * 2.3)));
      },
      color: (i, c) => { const v = 0.85 + 0.3 * ((i * 0.618) % 1); c.setRGB(v, v * 0.98, v * 0.96); },
    });

    this.buildMarkers();
    this.buildParkMarkers();
    this.buildPipeFlags();
    this.buildStartGates();
    this.buildLodge();
    this.buildLift();
    this.buildRings();
    this.buildBirds();
    this.buildFlightBoards();
  }

  buildMarkers() {
    const w = this.world, mk = w.markers, count = mk.length / 4;
    const out = { p: [], n: [], c: [] };
    // pole: black bottom, white top band (tinted per run)
    cylinder(out, 0.035, 0.035, 0, 1.4, 5, [0.06, 0.06, 0.07]);
    cylinder(out, 0.04, 0.04, 1.4, 0.55, 5, [1, 1, 1]);
    const geo = toGeometry(out);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const im = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(mk[i * 4], mk[i * 4 + 1] - 0.2, mk[i * 4 + 2]);
      im.setMatrixAt(i, m);
      const run = w.runs[mk[i * 4 + 3]];
      c.set(run.diff === 'black' || run.diff === 'double' ? '#2a2a2e' : DIFF[run.diff].color);
      if (run.diff === 'black' || run.diff === 'double') c.setRGB(0.05, 0.05, 0.05);
      im.setColorAt(i, c);
    }
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
    this.group.add(im);
    // marker caps: bright orange so black-run poles stay visible
    const cap = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 4), new THREE.MeshLambertMaterial({ color: 0xff7a1a }), count);
    for (let i = 0; i < count; i++) {
      m.makeTranslation(mk[i * 4], mk[i * 4 + 1] + 1.78, mk[i * 4 + 2]);
      cap.setMatrixAt(i, m);
    }
    cap.instanceMatrix.needsUpdate = true;
    cap.computeBoundingSphere();
    this.group.add(cap);
  }

  // Painted lip lines and cones so kickers read clearly against white snow
  buildParkMarkers() {
    const w = this.world;
    const kickers = w.features.filter((f) => f.type === 0);
    const lineMat = new THREE.MeshLambertMaterial({ color: 0x1c64ff, emissive: 0x0a2a80 });
    const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 0.38), lineMat, kickers.length * 2);
    const coneMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const coneOut = { p: [], n: [], c: [] };
    const rng = mulberry32(5);
    cone(coneOut, 0.34, 0, 0.95, 10, [1, 0.42, 0.05], [1, 0.55, 0.15], rng, 0, true);
    cylinder(coneOut, 0.19, 0.11, 0.32, 0.16, 10, [0.95, 0.95, 0.95]);
    const cones = new THREE.InstancedMesh(toGeometry(coneOut), coneMat, kickers.length * 4);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    let li = 0, ci = 0;
    for (const f of kickers) {
      const yaw = Math.atan2(f.dx, f.dz);
      q.setFromAxisAngle(up, yaw);
      // lip line (blue paint) and a second line at the start of the ramp
      for (const [u, width] of [[-0.12, f.vHalf * 2], [-f.L + 0.4, f.vHalf * 2 + 0.5]]) {
        const x = f.cx + f.dx * u, z = f.cz + f.dz * u;
        p.set(x, w.height(x, z) + 0.02, z);
        s.set(width, 1, 1);
        m.compose(p, q, s);
        lines.setMatrixAt(li++, m);
      }
      for (const u of [-0.3, -f.L * 0.6]) {
        for (const side of [-1, 1]) {
          const v = side * (f.vHalf + 0.9);
          const x = f.cx + f.dx * u - f.dz * v, z = f.cz + f.dz * u + f.dx * v;
          p.set(x, w.height(x, z) - 0.02, z);
          s.set(1, 1, 1);
          m.compose(p, q, s);
          cones.setMatrixAt(ci++, m);
        }
      }
    }
    lines.count = li; cones.count = ci;
    lines.instanceMatrix.needsUpdate = true; cones.instanceMatrix.needsUpdate = true;
    lines.computeBoundingSphere(); cones.computeBoundingSphere();
    cones.castShadow = true;
    this.group.add(lines, cones);
  }

  banner(text, sub, color, badge) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, 768, 120);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(badge, 60, 68);
    ctx.textAlign = 'left';
    ctx.font = 'italic 900 56px sans-serif';
    ctx.fillText(text, 142, sub ? 76 : 82, 610);
    if (sub) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(sub, 144, 106, 600);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true });
  }

  gate(run, s, halfW, mat, postMat) {
    const w = this.world;
    const c = w.runPoint(run, s, 0);
    const left = w.runPoint(run, s, halfW), right = w.runPoint(run, s, -halfW);
    const hl = w.height(left.x, left.z), hr = w.height(right.x, right.z);
    const top = Math.max(hl, hr, w.height(c.x, c.z)) + 5.2;
    for (const [pt, h] of [[left, hl], [right, hr]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, top - h + 0.6, 8), postMat);
      post.position.set(pt.x, (top + h) / 2 - 0.3, pt.z);
      post.castShadow = true;
      this.group.add(post);
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, halfW * 2 * (120 / 768)), mat);
    banner.position.set(c.x, top - 0.6, c.z);
    banner.rotation.y = Math.atan2(c.dx, c.dz) + Math.PI;
    this.group.add(banner);
  }

  buildStartGates() {
    const w = this.world;
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 });
    const finishMat = this.banner('FINISH', '', '#0d1420', '◼◻◼');
    w.runs.forEach((run) => {
      const d = DIFF[run.diff];
      const mat = this.banner(run.name.toUpperCase(), `${run.stats.length} m  ·  ${run.stats.vertical} m vertical  ·  max ${run.stats.maxDeg}°`, d.color, d.short);
      this.gate(run, 16, 7, mat, postMat);
      this.gate(run, run.length - 95, 11, finishMat, postMat);
    });
  }

  // Flags along both decks of the superpipe
  buildPipeFlags() {
    const w = this.world;
    const pts = [];
    for (const f of w.pipes) {
      for (let u = 0; u <= f.len; u += 14) for (const side of [-1, 1]) {
        const v = side * (f.lipV + 2.2);
        pts.push([f.cx + f.dx * u - f.dz * v, f.cz + f.dz * u + f.dx * v]);
      }
    }
    if (!pts.length) return;
    // painted lip lines so the walls read clearly against white snow
    const segs = [];
    for (const f of w.pipes) {
      for (let u = 3; u < f.len - 3; u += 6) for (const side of [-1, 1]) segs.push([f, u, side * (f.lipV - 0.35)]);
    }
    const lip = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.07, 6.3), new THREE.MeshLambertMaterial({ color: 0x1c64ff, emissive: 0x0a2a80 }), segs.length);
    const lm = new THREE.Matrix4(), lq = new THREE.Quaternion(), le = new THREE.Euler(0, 0, 0, 'YXZ'), lp = new THREE.Vector3(), ls = new THREE.Vector3(1, 1, 1);
    segs.forEach(([f, u, v], i) => {
      const at = (uu) => { const x = f.cx + f.dx * uu - f.dz * v, z = f.cz + f.dz * uu + f.dx * v; return [x, w.height(x, z), z]; };
      const a = at(u - 3), b = at(u + 3), c = at(u);
      le.set(Math.atan2(a[1] - b[1], 6), Math.atan2(f.dx, f.dz), 0);
      lq.setFromEuler(le);
      lp.set(c[0], (a[1] + b[1]) / 2 + 0.04, c[2]);
      lm.compose(lp, lq, ls);
      lip.setMatrixAt(i, lm);
    });
    lip.instanceMatrix.needsUpdate = true;
    lip.computeBoundingSphere();
    this.group.add(lip);
    const out = { p: [], n: [], c: [] };
    cylinder(out, 0.03, 0.03, 0, 1.6, 5, [0.1, 0.1, 0.12]);
    pushTri(out, [0, 1.6, 0], [0.7, 1.4, 0], [0, 1.2, 0], [1, 0.45, 0.05], [1, 0.45, 0.05], [1, 0.45, 0.05]);
    pushTri(out, [0, 1.6, 0], [0, 1.2, 0], [0.7, 1.4, 0], [1, 0.45, 0.05], [1, 0.45, 0.05], [1, 0.45, 0.05]);
    const im = new THREE.InstancedMesh(toGeometry(out), new THREE.MeshLambertMaterial({ vertexColors: true }), pts.length);
    const m = new THREE.Matrix4();
    pts.forEach(([x, z], i) => { m.makeTranslation(x, w.height(x, z) - 0.1, z); im.setMatrixAt(i, m); });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    this.group.add(im);
  }

  buildLodge() {
    const g = new THREE.Group();
    const w = this.world;
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.85 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x77736e, roughness: 0.95 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.7 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1a1d22, emissive: 0xffb45a, emissiveIntensity: 0.55, roughness: 0.2 });
    const makeChalet = (x, z, wdt, dep, hgt, rot) => {
      const y = w.height(x, z);
      const c = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(wdt, 2, dep), stone);
      base.position.y = 0.6;
      const body = new THREE.Mesh(new THREE.BoxGeometry(wdt, hgt, dep), wood);
      body.position.y = 1.6 + hgt / 2;
      const roofH = wdt * 0.38;
      const roofShape = new THREE.Shape();
      roofShape.moveTo(-wdt / 2 - 1.2, 0); roofShape.lineTo(0, roofH); roofShape.lineTo(wdt / 2 + 1.2, 0); roofShape.lineTo(-wdt / 2 - 1.2, 0);
      const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: dep + 2.4, bevelEnabled: false }), snowMat);
      roof.position.set(0, 1.6 + hgt, -dep / 2 - 1.2);
      for (let k = 0; k < Math.floor(wdt / 3.2); k++) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 0.1), glass);
        win.position.set(-wdt / 2 + 2 + k * 3.2, 1.6 + hgt * 0.5, dep / 2 + 0.03);
        c.add(win);
      }
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1, 3, 1), stone);
      chimney.position.set(wdt * 0.25, 1.6 + hgt + roofH * 0.6, 0);
      c.add(base, body, roof, chimney);
      c.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      c.position.set(x, y - 0.5, z);
      c.rotation.y = rot;
      g.add(c);
    };
    makeChalet(LODGE.x, LODGE.z, 30, 16, 8, 0.05);
    makeChalet(LODGE.x - 48, LODGE.z + 30, 12, 9, 5, 0.4);
    makeChalet(LODGE.x + 52, LODGE.z + 24, 14, 10, 5, -0.3);
    makeChalet(LODGE.x - 20, LODGE.z + 70, 10, 8, 4, 0.9);
    makeChalet(LODGE.x + 18, LODGE.z + 82, 11, 8, 4, -0.7);
    makeChalet(HUT.x, HUT.z, 16, 10, 5, Math.PI);
    makeChalet(HUT.x + 34, HUT.z - 22, 9, 7, 4, Math.PI + 0.5);
    this.lodgeGlass = glass;
    this.group.add(g);
  }

  buildLift() {
    const w = this.world;
    const z0 = VALLEY_F + 120, z1 = ridgeZ(LIFT_X) + 140;
    const towers = [];
    const steps = Math.ceil((z0 - z1) / 140);
    for (let i = 0; i <= steps; i++) {
      const z = lerp(z0, z1, i / steps);
      const y = w.height(LIFT_X, z);
      towers.push(new THREE.Vector3(LIFT_X, y + (i === 0 || i === steps ? 7 : 13), z));
    }
    this.liftTowers = towers;
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: 0.45, metalness: 0.7 });
    const towerGeo = new THREE.CylinderGeometry(0.35, 0.5, 1, 8);
    const armGeo = new THREE.BoxGeometry(6, 0.35, 0.5);
    towers.forEach((t, i) => {
      const y0 = w.height(t.x, t.z);
      const h = t.y - y0;
      const tw = new THREE.Mesh(towerGeo, steel);
      tw.scale.y = h + 1;
      tw.position.set(t.x, y0 + h / 2 - 0.5, t.z);
      const arm = new THREE.Mesh(armGeo, steel);
      arm.position.set(t.x, t.y, t.z);
      tw.castShadow = arm.castShadow = true;
      this.group.add(tw, arm);
      if (i === 0 || i === towers.length - 1) {
        const station = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 14), new THREE.MeshStandardMaterial({ color: 0xd23b2b, roughness: 0.7 }));
        station.position.set(t.x, y0 + 3, t.z + (i === 0 ? 4 : -4));
        station.castShadow = true;
        this.group.add(station);
      }
    });
    // Cables: two lines (up and down), 2.6 m either side
    const pts = [];
    for (const side of [-2.6, 2.6]) {
      for (let i = 0; i < towers.length - 1; i++) {
        const a = towers[i], b = towers[i + 1];
        for (let k = 0; k < 8; k++) {
          const t0 = k / 8, t1 = (k + 1) / 8;
          const sag0 = Math.sin(t0 * Math.PI) * 1.6, sag1 = Math.sin(t1 * Math.PI) * 1.6;
          pts.push(a.x + side, lerp(a.y, b.y, t0) - sag0, lerp(a.z, b.z, t0));
          pts.push(a.x + side, lerp(a.y, b.y, t1) - sag1, lerp(a.z, b.z, t1));
        }
      }
    }
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.group.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0x23262b })));
    // Chairs
    const chairOut = { p: [], n: [], c: [] };
    const dark = [0.12, 0.13, 0.15], red = [0.75, 0.15, 0.12];
    cylinder(chairOut, 0.03, 0.03, -2.2, 2.2, 4, dark);
    const box = (x0, y0, z0, x1, y1, z1, col) => {
      const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
      const f = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 6, 2], [3, 7, 6], [1, 2, 6], [1, 6, 5], [0, 4, 7], [0, 7, 3]];
      for (const t of f) pushTri(chairOut, v[t[0]], v[t[1]], v[t[2]], col, col, col);
    };
    box(-1.1, -2.3, -0.35, 1.1, -2.15, 0.35, red);
    box(-1.1, -2.2, -0.42, 1.1, -1.4, -0.32, red);
    box(-1.15, -2.0, 0.6, 1.15, -1.95, 0.66, dark);
    const chairGeo = toGeometry(chairOut);
    this.liftPath = [];
    let total = 0;
    for (let i = 0; i < towers.length - 1; i++) {
      const len = towers[i].distanceTo(towers[i + 1]);
      this.liftPath.push({ a: towers[i], b: towers[i + 1], s0: total, len });
      total += len;
    }
    this.liftLen = total;
    this.chairSpacing = 32;
    this.chairCount = Math.floor((total * 2) / this.chairSpacing);
    this.chairs = new THREE.InstancedMesh(chairGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), this.chairCount);
    this.chairs.frustumCulled = false;
    this.chairs.castShadow = true;
    this.group.add(this.chairs);
    this.liftT = 0;
    this._m = new THREE.Matrix4(); this._p = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
    this._yAxis = new THREE.Vector3(0, 1, 0);
  }

  updateLift(dt) {
    this.liftT += dt * 4.5;
    const L = this.liftLen;
    for (let i = 0; i < this.chairCount; i++) {
      let d = (this.liftT + i * this.chairSpacing) % (L * 2);
      const up = d < L;
      if (!up) d = L * 2 - d;
      let seg = this.liftPath[this.liftPath.length - 1];
      for (const s of this.liftPath) if (d <= s.s0 + s.len) { seg = s; break; }
      const t = clamp((d - seg.s0) / seg.len, 0, 1);
      const side = up ? -2.6 : 2.6;
      this._p.set(seg.a.x + side, lerp(seg.a.y, seg.b.y, t) - Math.sin(t * Math.PI) * 1.6, lerp(seg.a.z, seg.b.z, t));
      this._q.setFromAxisAngle(this._yAxis, up ? Math.PI : 0);
      this._m.compose(this._p, this._q, this._s);
      this.chairs.setMatrixAt(i, this._m);
    }
    this.chairs.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- collectible rings
  buildRings() {
    const rings = this.world.rings;
    const geo = new THREE.TorusGeometry(1, 0.075, 8, 28);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
    this.ringMesh = new THREE.InstancedMesh(geo, mat, rings.length);
    const disc = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, fog: true });
    this.ringDisc = new THREE.InstancedMesh(new THREE.CircleGeometry(0.93, 24), disc, rings.length);
    this.ringDisc.renderOrder = 3;
    const gold = new THREE.Color(0xffc21a), cyan = new THREE.Color(0x35e0ff);
    rings.forEach((r, i) => {
      this.ringMesh.setColorAt(i, r.sky ? cyan : gold);
      this.ringDisc.setColorAt(i, r.sky ? cyan : gold);
    });
    this.ringMesh.instanceColor.needsUpdate = true;
    this.ringDisc.instanceColor.needsUpdate = true;
    this.ringMesh.frustumCulled = false;
    this.ringDisc.frustumCulled = false;
    this.group.add(this.ringMesh, this.ringDisc);
    this._rm = new THREE.Matrix4(); this._rq = new THREE.Quaternion(); this._rs = new THREE.Vector3(); this._rp = new THREE.Vector3();
    this.refreshRings();
  }

  // Re-writes every ring's transform from world.rings (collected rings shrink away)
  refreshRings() {
    const rings = this.world.rings;
    const up = this._yAxis || (this._yAxis = new THREE.Vector3(0, 1, 0));
    rings.forEach((r, i) => {
      this._rq.setFromAxisAngle(up, Math.atan2(r.dx, r.dz));
      const sc = r.got ? 0.0001 : r.r;
      this._rs.set(sc, sc, sc);
      this._rp.set(r.x, r.y, r.z);
      this._rm.compose(this._rp, this._rq, this._rs);
      this.ringMesh.setMatrixAt(i, this._rm);
      this.ringDisc.setMatrixAt(i, this._rm);
    });
    this.ringMesh.instanceMatrix.needsUpdate = true;
    this.ringDisc.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- birds circling in the thermals
  buildBirds() {
    const th = this.world.thermals;
    const per = 4;
    const out = { p: [], n: [], c: [] };
    const dark = [0.12, 0.1, 0.09], tipc = [0.2, 0.18, 0.16];
    for (const sx of [1, -1]) {
      pushTri(out, [0, 0, 0.35], [sx * 1.25, 0.28, -0.1], [0, 0, -0.3], dark, tipc, dark);
      pushTri(out, [0, 0, 0.35], [0, 0, -0.3], [sx * 1.25, 0.28, -0.1], dark, dark, tipc);
    }
    this.birds = new THREE.InstancedMesh(toGeometry(out), new THREE.MeshLambertMaterial({ vertexColors: true }), th.length * per);
    this.birds.frustumCulled = false;
    this.birdData = [];
    th.forEach((t, ti) => {
      const base = this.world.heightBase(t.x, t.z);
      for (let k = 0; k < per; k++) {
        this.birdData.push({ t, base, r: 22 + ((ti * 7 + k * 13) % 30), w: 0.22 + ((ti + k * 3) % 5) * 0.035, ph: k * 1.7 + ti, h: 70 + k * 45 + ((ti * 11) % 40) });
      }
    });
    this.group.add(this.birds);
    this.birdT = 0;
    this._be = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  updateBirds(dt) {
    this.birdT += dt;
    const m = this._rm, q = this._rq, p = this._rp, s = this._rs.set(1, 1, 1), e = this._be;
    this.birdData.forEach((b, i) => {
      const a = b.ph + this.birdT * b.w;
      const climb = (this.birdT * 1.6 + b.ph * 40) % 220;
      p.set(b.t.x + Math.cos(a) * b.r, b.base + b.h + climb, b.t.z + Math.sin(a) * b.r);
      // heading along the circle's tangent, banked into the turn
      e.set(0, Math.atan2(-Math.sin(a), Math.cos(a)), 0.45);
      q.setFromEuler(e);
      m.compose(p, q, s);
      this.birds.setMatrixAt(i, m);
    });
    this.birds.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- ski-flying distance boards
  buildFlightBoards() {
    const w = this.world, f = w.flightDeck;
    if (!f) return;
    const lip = new THREE.Vector3(f.cx, w.height(f.cx - f.dx * 0.5, f.cz - f.dz * 0.5), f.cz);
    this.flightLip = lip;
    const marks = [50, 100, 150, 200, 250, 300];
    const lineMat = new THREE.MeshLambertMaterial({ color: 0xd8262c });
    const lines = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 0.5), lineMat, marks.length);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.6 });
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    const yaw = Math.atan2(f.dx, f.dz);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    let li = 0;
    for (const dist of marks) {
      // march down the hill until the straight-line distance from the lip matches
      let u = dist * 0.7, x = 0, z = 0, y = 0;
      for (let it = 0; it < 60; it++) {
        x = f.cx + f.dx * u; z = f.cz + f.dz * u; y = w.height(x, z);
        const d = Math.hypot(u, y - lip.y);
        if (d >= dist) break;
        u += Math.max(0.5, (dist - d) * 0.7);
      }
      p.set(x, y + 0.03, z); sc.set(60, 1, 1);
      m.compose(p, q, sc);
      lines.setMatrixAt(li++, m);
      for (const side of [-1, 1]) {
        const v = side * 34;
        const bx = x - f.dz * v, bz = z + f.dx * v, by = w.height(bx, bz);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4, 6), postMat);
        post.position.set(bx, by + 2, bz);
        const canvas = document.createElement('canvas');
        canvas.width = 192; canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#d8262c'; ctx.fillRect(0, 0, 192, 96);
        ctx.fillStyle = '#fff'; ctx.font = 'italic 900 64px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${dist}`, 96, 70);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: true }));
        board.position.set(bx, by + 4.4, bz);
        board.rotation.y = yaw + Math.PI;
        this.group.add(post, board);
      }
    }
    lines.count = li;
    lines.instanceMatrix.needsUpdate = true;
    lines.computeBoundingSphere();
    this.group.add(lines);
  }

  update(dt, camPos) {
    this.trees.update(camPos);
    this.rocks.update(camPos);
    this.updateLift(dt);
    this.updateBirds(dt);
  }
}
