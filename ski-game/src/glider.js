// Paraglider: arched cell canopy (airfoil section, puffy cells, brake-deflected trailing
// edge), suspension lines, risers and brake lines to the pilot's hands. Deploy/stow animation.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, easeOutBack, easeOutCubic } from './util.js';

const NU = 41, NV = 12, CELLS = 20;
const ARC_R = 7.2, ARC_A = 0.98;
const LINE_U = [-0.93, -0.7, -0.46, -0.22, 0.22, 0.46, 0.7, 0.93];
const LINE_V = [0.08, 0.4, 0.74];
const BRAKE_U = [0.38, 0.62, 0.86];
const FLY_POS = new THREE.Vector3(0, 8.3, 1.45);
const PACK_POS = new THREE.Vector3(0, 1.35, -0.25);

const chordAt = (u) => 2.9 * Math.sqrt(Math.max(0.1, 1 - 0.8 * u * u));
const thick = (v) => 0.8 * (0.2969 * Math.sqrt(v) - 0.126 * v - 0.3516 * v * v + 0.2843 * v * v * v - 0.1036 * v * v * v * v);

export class GliderModel {
  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;
    this.canopy = new THREE.Group();
    this.group.add(this.canopy);
    const vcount = NU * NV * 2;
    this.pos = new Float32Array(vcount * 3);
    const col = new Float32Array(vcount * 3);
    const idx = [];
    const cA = new THREE.Color(0xff6a00), cB = new THREE.Color(0xfff3e0), cC = new THREE.Color(0x1f4fd6), cLE = new THREE.Color(0x2a2a30);
    const tmp = new THREE.Color();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < NU; i++) {
        const u = -1 + (2 * i) / (NU - 1);
        const au = Math.abs(u);
        for (let j = 0; j < NV; j++) {
          const v = j / (NV - 1);
          const k = side * NU * NV + i * NV + j;
          if (au < 0.3) tmp.copy(cA); else if (au < 0.42) tmp.copy(cB); else if (au < 0.8) tmp.copy(cC); else tmp.copy(cA);
          if (side === 1) tmp.lerp(cB, 0.25).multiplyScalar(0.8);
          if (v < 0.07) tmp.lerp(cLE, 0.6);
          col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
        }
      }
      for (let i = 0; i < NU - 1; i++) {
        for (let j = 0; j < NV - 1; j++) {
          const a = side * NU * NV + i * NV + j, b = a + NV, c = a + 1, d = b + 1;
          if (side === 0) idx.push(a, b, c, c, b, d); else idx.push(a, c, b, c, d, b);
        }
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.55 }));
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.canopy.add(this.mesh);

    const lineCount = LINE_U.length * LINE_V.length + 2 + BRAKE_U.length * 2;
    this.linePos = new Float32Array(lineCount * 6);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x30343a, transparent: true, opacity: 0.85 }));
    this.lines.frustumCulled = false;
    this.group.add(this.lines);
    this.s = 0;
    this.t = 0;
    this._v = new THREE.Vector3();
    this._w = new THREE.Vector3();
    this.surf = { arc: ARC_A, brakeL: 0, brakeR: 0, flutter: 0 };
  }

  point(u, v, top, out) {
    const S = this.surf;
    const th = u * S.arc;
    const st = Math.sin(th), ct = Math.cos(th);
    const c = chordAt(u);
    const z = (0.3 - v) * c;
    const cell = ((u + 1) / 2) * CELLS;
    const ph = cell - Math.floor(cell);
    const puff = 1 + 0.22 * Math.sin(Math.PI * ph);
    let off = thick(v) * c * (top ? 0.78 * puff : -0.3);
    const br = u > 0 ? S.brakeL : S.brakeR;
    if (v > 0.62) off -= br * Math.pow((v - 0.62) / 0.38, 2) * 0.6 * c;
    off += S.flutter * Math.sin(u * 9 + this.t * 7) * 0.03 * v;
    out.set(ARC_R * st + st * off, ARC_R * ct - ARC_R + ct * off, z);
    return out;
  }

  rebuild() {
    const p = this.pos, v3 = this._v;
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < NU; i++) {
        const u = -1 + (2 * i) / (NU - 1);
        for (let j = 0; j < NV; j++) {
          const v = j / (NV - 1);
          this.point(u, v, side === 0, v3);
          const k = (side * NU * NV + i * NV + j) * 3;
          p[k] = v3.x; p[k + 1] = v3.y; p[k + 2] = v3.z;
        }
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  update(dt, sk, character) {
    const g = sk.glide;
    this.t += dt;
    if (g.on) this.s = smoothstep(0.0, 0.85, g.t);
    else this.s = Math.max(0, this.s - dt / 0.4);
    this.group.visible = this.s > 0.002;
    if (!this.group.visible) return;
    const s = this.s;
    const S = this.surf;
    S.arc = lerp(0.18, ARC_A, smoothstep(0.25, 1, s));
    S.brakeL = g.on ? g.brakeL : 0.6;
    S.brakeR = g.on ? g.brakeR : 0.6;
    S.flutter = g.on ? 0.4 + 0.6 * clamp(sk.speed / 20, 0, 1) : 1.5;
    this.rebuild();
    const e = easeOutCubic(clamp(s * 1.3, 0, 1));
    this.canopy.position.lerpVectors(PACK_POS, FLY_POS, e);
    if (!g.on) this.canopy.position.y -= (1 - s) * 3;
    const sc = Math.max(0.05, easeOutBack(s));
    this.canopy.scale.set(sc * lerp(0.3, 1, smoothstep(0.2, 1, s)), sc, sc);
    this.canopy.rotation.set(-0.08 + (g.on ? -0.1 * g.bar + 0.12 * Math.max(g.brakeL, g.brakeR) : 0.6 * (1 - s)), 0, 0);
    this.canopy.updateMatrix();
    this.canopy.updateMatrixWorld(true);

    // lines: canopy local -> group space
    const lp = this.linePos;
    let k = 0;
    const cm = this.canopy.matrix;
    const riser = (sgn, out) => out.set(sgn * 0.22, 1.72, 0.1);
    const carab = (sgn, out) => out.set(sgn * 0.2, 1.28, 0.02);
    const put = (a, b) => { lp[k++] = a.x; lp[k++] = a.y; lp[k++] = a.z; lp[k++] = b.x; lp[k++] = b.y; lp[k++] = b.z; };
    const A = this._v, B = this._w;
    for (const u of LINE_U) {
      for (const v of LINE_V) {
        this.point(u, v, false, B).applyMatrix4(cm);
        riser(u > 0 ? 1 : -1, A);
        put(A, B);
      }
    }
    for (const sgn of [1, -1]) { riser(sgn, A); carab(sgn, B); put(A, B); }
    const hands = [character.p.handL, character.p.handR];
    for (const sgn of [1, -1]) {
      const hand = hands[sgn > 0 ? 0 : 1];
      for (const u of BRAKE_U) {
        this.point(sgn * u, 1, false, B).applyMatrix4(cm);
        put(hand, B);
      }
    }
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.material.opacity = 0.85 * smoothstep(0.15, 0.6, s);
  }
}
