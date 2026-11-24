// Articulated skier: IK legs and arms, poles with pole plants, procedural poses for
// carving, tucking, hockey stops, air tricks and grabs, paragliding and tumbles.
import * as THREE from 'three';
import { clamp, damp, lerp, smoothstep, wrapAngle } from './util.js';

export const OUTFITS = [
  { name: 'Volcano', jacket: 0xe8452c, accent: 0x18c3d6, pants: 0x1b2232, helmet: 0xf3f3f3, lens: 0xff9d2e, ski: 0x15161a, skiAccent: 0xffd200, pack: 0x2a2f38 },
  { name: 'Glacier', jacket: 0x2f7bff, accent: 0xffffff, pants: 0x0e1a2a, helmet: 0x15171b, lens: 0x52e3ff, ski: 0xf4f6fa, skiAccent: 0x2f7bff, pack: 0x1d2633 },
  { name: 'Neon', jacket: 0xb8f000, accent: 0x7a2cff, pants: 0x2b2b30, helmet: 0x7a2cff, lens: 0xff3df2, ski: 0x1e1f24, skiAccent: 0xb8f000, pack: 0x3b2a55 },
  { name: 'Stealth', jacket: 0x2d3238, accent: 0xff7a00, pants: 0x191b1f, helmet: 0x2d3238, lens: 0xffc400, ski: 0x0c0c0e, skiAccent: 0xff7a00, pack: 0x22252a },
  { name: 'Retro', jacket: 0xff4fa3, accent: 0x40e0d0, pants: 0x3a2a7a, helmet: 0xfff1c4, lens: 0x9cff57, ski: 0xfff1c4, skiAccent: 0xff4fa3, pack: 0x40e0d0 },
];

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _d = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _pp = new THREE.Vector3();

function placeBetween(mesh, a, b) {
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  _d.copy(b).sub(a);
  const len = _d.length();
  if (len > 1e-6) mesh.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
}

// Analytic two-bone IK. Returns mid joint in outMid and the reachable end in outEnd.
function solveIK(a, target, L1, L2, pole, outMid, outEnd) {
  _ab.copy(target).sub(a);
  const dist = _ab.length();
  const d = clamp(dist, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  if (dist < 1e-6) _ab.set(0, -1, 0); else _ab.multiplyScalar(1 / dist);
  outEnd.copy(a).addScaledVector(_ab, d);
  const x = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  _pp.copy(pole).addScaledVector(_ab, -pole.dot(_ab));
  if (_pp.lengthSq() < 1e-8) _pp.set(0, 0, 1);
  _pp.normalize();
  outMid.copy(a).addScaledVector(_ab, x).addScaledVector(_pp, h);
}

function makeSkiGeometry() {
  // 1.76 m ski with sidecut, rockered tip and twin-ish tail
  const segs = 28, L = 1.76;
  const pos = [], idx = [];
  const rows = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = -L / 2 + t * L;
    let w = 0.086 + 0.03 * Math.pow(Math.abs(t - 0.52) * 2, 2);
    if (t > 0.93) w *= Math.sqrt(Math.max(0.05, 1 - Math.pow((t - 0.93) / 0.07, 2)));
    if (t < 0.04) w *= Math.sqrt(Math.max(0.2, 1 - Math.pow((0.04 - t) / 0.04, 2)));
    let y = 0;
    if (t > 0.8) y += Math.pow((t - 0.8) / 0.2, 2) * 0.075;
    if (t < 0.12) y += Math.pow((0.12 - t) / 0.12, 2) * 0.035;
    const th = 0.022 * (1 - 0.5 * Math.abs(t - 0.5));
    rows.push([w / 2, y, z, th]);
  }
  rows.forEach(([hw, y, z, th]) => {
    pos.push(hw, y + th, z, -hw, y + th, z, hw, y, z, -hw, y, z);
  });
  for (let i = 0; i < segs; i++) {
    const a = i * 4, b = (i + 1) * 4;
    idx.push(a, a + 1, b, b, a + 1, b + 1);             // top (normal +y)
    idx.push(a + 2, b + 2, a + 3, b + 2, b + 3, a + 3); // base
    idx.push(a, b, a + 2, b, b + 2, a + 2);             // left edge (+x)
    idx.push(a + 1, a + 3, b + 1, b + 1, a + 3, b + 3); // right edge
  }
  const e = segs * 4;
  idx.push(e, e + 2, e + 1, e + 1, e + 2, e + 3, 0, 1, 2, 1, 3, 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class Character {
  constructor(outfit = 0) {
    this.root = new THREE.Group();
    this.root.name = 'skier';
    const std = (c, r = 0.75, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    this.mats = {
      jacket: std(0xffffff, 0.72), accent: std(0xffffff, 0.6), pants: std(0xffffff, 0.8), helmet: std(0xffffff, 0.32, 0.05),
      lens: std(0xffffff, 0.08, 1.0), ski: std(0xffffff, 0.35, 0.1), skiAccent: std(0xffffff, 0.4), pack: std(0xffffff, 0.8),
      skin: std(0xd9a07c, 0.6), glove: std(0x15161a, 0.7), boot: std(0xf0f0f0, 0.35, 0.05), dark: std(0x111216, 0.5, 0.3),
      metal: std(0xb9c0c8, 0.3, 0.9),
    };
    this.setOutfit(outfit);
    const M = this.mats;
    const add = (parent, mesh) => { mesh.castShadow = true; parent.add(mesh); return mesh; };

    // ---- skis + boots (shell) at the feet
    const skiGeo = makeSkiGeometry();
    this.skis = [];
    for (const side of [1, -1]) {
      const g = new THREE.Group();
      const ski = add(g, new THREE.Mesh(skiGeo, M.ski));
      ski.position.z = 0.06;
      const stripe = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 1.1), M.skiAccent));
      stripe.position.set(0, 0.024, 0.12);
      const binding = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.42), M.dark));
      binding.position.set(0, 0.035, -0.03);
      const shell = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.12, 0.31), M.boot));
      shell.position.set(0, 0.105, -0.02);
      const toe = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), M.dark));
      toe.position.set(0, 0.065, 0.15);
      this.root.add(g);
      this.skis.push({ g, side });
    }

    // ---- legs (pants + boot cuffs)
    const legPart = (r, len, mat) => add(this.root, new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat));
    this.thighs = [legPart(0.074, 0.3, M.pants), legPart(0.074, 0.3, M.pants)];
    this.shins = [legPart(0.06, 0.3, M.pants), legPart(0.06, 0.3, M.pants)];
    this.cuffs = [0, 1].map(() => {
      const c = add(this.root, new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.19, 0.15), M.boot));
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.02, 0.05), M.dark);
      buckle.position.set(0, 0.02, 0.06);
      c.add(buckle);
      return c;
    });
    this.knees = [legPart(0.07, 0.01, M.pants), legPart(0.07, 0.01, M.pants)];

    // ---- torso group (origin at hip centre, +y along the spine)
    this.torso = new THREE.Group();
    this.root.add(this.torso);
    const pelvis = add(this.torso, new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.13, 4, 10), M.pants));
    pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1, 0.85); pelvis.position.y = 0.03;
    const chest = add(this.torso, new THREE.Mesh(new THREE.CapsuleGeometry(0.155, 0.24, 6, 14), M.jacket));
    chest.position.y = 0.29; chest.scale.set(1.12, 1, 0.78);
    const hem = add(this.torso, new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.165, 0.09, 14), M.jacket));
    hem.position.y = 0.1; hem.scale.set(1.08, 1, 0.82);
    const stripe = add(this.torso, new THREE.Mesh(new THREE.TorusGeometry(0.163, 0.02, 6, 20), M.accent));
    stripe.rotation.x = Math.PI / 2; stripe.position.y = 0.36; stripe.scale.set(1.13, 0.8, 1);
    const zip = add(this.torso, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.34, 0.012), M.dark));
    zip.position.set(0, 0.31, 0.123);
    const collar = add(this.torso, new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 8, 14), M.jacket));
    collar.rotation.x = Math.PI / 2; collar.position.y = 0.52;
    const pack = add(this.torso, new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.36, 0.13), M.pack));
    pack.position.set(0, 0.32, -0.17);
    const packTop = add(this.torso, new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.16, 4, 8), M.pack));
    packTop.rotation.z = Math.PI / 2; packTop.position.set(0, 0.5, -0.17);
    const packBand = add(this.torso, new THREE.Mesh(new THREE.BoxGeometry(0.275, 0.04, 0.135), M.accent));
    packBand.position.set(0, 0.4, -0.17);
    for (const s of [1, -1]) {
      const strap = add(this.torso, new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.28, 0.02), M.dark));
      strap.position.set(s * 0.085, 0.36, 0.118); strap.rotation.x = -0.05;
    }
    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 0.665, 0.015);
    this.torso.add(this.head);
    const neck = add(this.torso, new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.1, 10), M.accent));
    neck.position.y = 0.575;
    const face = add(this.head, new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 12), M.skin));
    face.scale.set(0.92, 1.05, 0.98);
    const buff = add(this.head, new THREE.Mesh(new THREE.CylinderGeometry(0.093, 0.085, 0.085, 14), M.accent));
    buff.position.set(0, -0.055, 0.006);
    const helmet = add(this.head, new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), M.helmet));
    helmet.position.y = 0.012; helmet.scale.set(1, 1, 1.1);
    const vent = add(this.head, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.16), M.dark));
    vent.position.set(0, 0.138, -0.01);
    const strap = add(this.head, new THREE.Mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.042, 22, 1, true), M.dark));
    strap.material = M.dark; strap.position.y = 0.0;
    const frame = add(this.head, new THREE.Mesh(new THREE.CylinderGeometry(0.129, 0.129, 0.068, 22, 1, true, -1.05, 2.1), M.dark));
    frame.position.set(0, 0.002, 0.012);
    const lens = add(this.head, new THREE.Mesh(new THREE.CylinderGeometry(0.133, 0.133, 0.058, 22, 1, true, -0.98, 1.96), M.lens));
    lens.position.set(0, 0.002, 0.014);
    [helmet, strap, frame, lens].forEach((m) => { m.material.side = THREE.DoubleSide; });

    // ---- arms, gloves, poles
    this.upperArms = [0, 1].map(() => add(this.root, new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.2, 4, 8), M.jacket)));
    this.foreArms = [0, 1].map(() => add(this.root, new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.19, 4, 8), M.jacket)));
    this.cuffsArm = [0, 1].map(() => add(this.root, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), M.accent)));
    this.gloves = [0, 1].map(() => add(this.root, new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.06), M.glove)));
    this.shoulders = [0, 1].map(() => add(this.root, new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), M.jacket)));
    this.poles = [0, 1].map(() => {
      const g = new THREE.Group();
      const shaft = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.006, 1.16, 6), M.metal));
      shaft.position.y = -0.58;
      const grip = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.015, 0.14, 8), M.dark));
      grip.position.y = -0.02;
      const basket = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.008, 10), M.dark));
      basket.position.y = -1.06;
      this.root.add(g);
      return g;
    });

    // ---- pose state
    this.p = {
      crouch: 0.2, hipZ: -0.06, pitch: 0.3, roll: 0, yaw: 0, lift: 0, liftZ: 0, spread: 0,
      seat: 0, tuck: 0, armsOut: 0, grabW: 0, crash: 0, skiPitch: 0, brake: 0, headYaw: 0, headPitch: 0.15,
      handL: new THREE.Vector3(0.3, 0.95, 0.3), handR: new THREE.Vector3(-0.3, 0.95, 0.3),
      tipL: new THREE.Vector3(0, -1, -0.5), tipR: new THREE.Vector3(0, -1, -0.5),
    };
    this.plant = [{ t: 0, active: false, world: new THREE.Vector3() }, { t: 0, active: false, world: new THREE.Vector3() }];
    this.lastSteer = 0;
    this.plantCooldown = 0;
    this.onPolePlant = null;
    this.time = 0;
    this._v = [...Array(12)].map(() => new THREE.Vector3());
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._qi = new THREE.Quaternion();
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  setOutfit(i) {
    const o = OUTFITS[i % OUTFITS.length];
    const M = this.mats;
    M.jacket.color.set(o.jacket); M.accent.color.set(o.accent); M.pants.color.set(o.pants);
    M.helmet.color.set(o.helmet); M.lens.color.set(o.lens); M.ski.color.set(o.ski);
    M.skiAccent.color.set(o.skiAccent); M.pack.color.set(o.pack);
    this.outfit = i;
  }

  update(dt, sk) {
    this.time += dt;
    const p = this.p, st = sk.state, t = this.time;
    const air = st === 'air', glide = st === 'glide', crash = st === 'crash';
    const ground = st === 'ground' || st === 'ready';

    // ---- root transform
    this.root.position.copy(sk.feet);
    if (ground) this.root.position.y -= 0.07 * sk.powder;
    this.root.quaternion.copy(sk.quat);
    this.root.updateMatrix();
    this.root.updateMatrixWorld();

    // ---- targets for the pose parameters
    const a = sk.air;
    const flipAmt = air ? clamp(Math.abs(a.flipVel) / 5, 0, 1) : 0;
    const grabbing = air && !!a.grab;
    let crouchT = clamp(sk.crouch + Math.max(0, sk.compress) * 0.9, 0, 1);
    let pitchT = 0.22 + 0.5 * crouchT + 0.55 * sk.tuck;
    let liftT = 0, liftZT = 0, seatT = 0, armsOutT = 0, spreadT = 0, skiPitchT = 0;
    if (air) {
      liftT = 0.1 + 0.26 * flipAmt + (grabbing ? 0.3 : 0);
      liftZT = 0.05 + (grabbing ? 0.08 : 0);
      armsOutT = grabbing ? 0.4 : 1;
      pitchT = 0.3 + 0.35 * flipAmt + (grabbing ? 0.35 : 0);
      crouchT = 0.35 + 0.3 * flipAmt + (grabbing ? 0.25 : 0);
      if (a.grab === 'Nose') skiPitchT = -0.45;
      if (a.grab === 'Tail') skiPitchT = 0.4;
    } else if (glide) {
      seatT = 1; pitchT = -0.12; crouchT = 0.3;
    } else if (crash) {
      spreadT = 1; pitchT = 0.4 + 0.4 * Math.sin(t * 7);
    }
    p.crouch = damp(p.crouch, crouchT, 14, dt);
    p.pitch = damp(p.pitch, pitchT, 9, dt);
    p.lift = damp(p.lift, liftT, 10, dt);
    p.liftZ = damp(p.liftZ, liftZT, 10, dt);
    p.seat = damp(p.seat, seatT, 5, dt);
    p.armsOut = damp(p.armsOut, armsOutT, 6, dt);
    p.spread = damp(p.spread, spreadT, 8, dt);
    p.tuck = damp(p.tuck, ground ? sk.tuck : 0, 8, dt);
    p.brake = damp(p.brake, ground ? sk.brake : 0, 8, dt);
    p.skiPitch = damp(p.skiPitch, skiPitchT, 8, dt);
    p.grabW = damp(p.grabW, grabbing ? 1 : 0, 12, dt);

    // Upper body: angulation against the lean, counter-rotation toward travel
    const velLocal = this._v[0].copy(sk.vel);
    this._qi.copy(sk.quat).invert();
    velLocal.applyQuaternion(this._qi);
    const travelYaw = Math.hypot(velLocal.x, velLocal.z) > 1 ? Math.atan2(velLocal.x, velLocal.z) : 0;
    let rollT = 0, yawT = 0;
    if (ground) {
      rollT = sk.lean * 0.42 + p.brake * -Math.sign(sk.sideSlip || 0) * 0.1;
      yawT = clamp(-sk.yawRate * 0.1, -0.3, 0.3) + clamp(travelYaw, -1.2, 1.2) * 0.55 * Math.min(1, sk.speed / 5);
    } else if (air) {
      yawT = clamp(-a.spinVel * 0.05, -0.3, 0.3);
    } else if (crash) {
      rollT = Math.sin(t * 9) * 0.4; yawT = Math.sin(t * 6) * 0.4;
    }
    p.roll = damp(p.roll, rollT, 8, dt);
    p.yaw = damp(p.yaw, yawT, 7, dt);
    p.headYaw = damp(p.headYaw, clamp((ground ? travelYaw : air ? -a.spinVel * 0.12 : 0) - p.yaw, -1, 1), 6, dt);
    p.headPitch = damp(p.headPitch, air ? 0.25 + 0.25 * smoothstep(1.2, 0.2, a.tHit) : glide ? 0.35 : 0.1 - p.pitch * 0.5, 6, dt);

    // ---- feet / skis
    const V = this._v;
    const ankleL = V[1], ankleR = V[2];
    const stance = 0.115 + 0.18 * p.spread;
    const seat = p.seat;
    for (const [i, ank] of [[0, ankleL], [1, ankleR]]) {
      const s = i === 0 ? 1 : -1;
      ank.set(s * stance, 0.15 + p.lift, -0.03 + p.liftZ);
      if (seat > 0.001) {
        ank.x = lerp(ank.x, s * 0.13, seat);
        ank.y = lerp(ank.y, 0.5 + Math.sin(t * 1.3 + i) * 0.015, seat);
        ank.z = lerp(ank.z, 0.55 + Math.sin(t * 0.9 + i * 2) * 0.03, seat);
      }
      if (p.spread > 0.01) { ank.y += p.spread * 0.2 * Math.sin(t * 8 + i * 2); ank.z += p.spread * 0.25 * Math.sin(t * 6 + i); }
      const ski = this.skis[i].g;
      ski.position.set(ank.x, ank.y - 0.15, ank.z + 0.03);
      ski.rotation.set(p.skiPitch + seat * -0.15, s * 0.04 * p.spread, 0);
    }
    // Hockey stop: skis share the root rotation so nothing extra here.

    // ---- hips and torso
    const hip = V[3].set(0, lerp(0.97, 0.56, p.crouch), lerp(-0.04, -0.2, p.crouch) - 0.05 * p.tuck);
    if (air) hip.y = 0.95 - 0.06 * p.crouch, hip.z = -0.03;
    hip.y = lerp(hip.y, 0.96, seat);
    hip.z = lerp(hip.z, 0.02, seat);
    this.torso.position.copy(hip);
    this._e.set(p.pitch + p.tuck * 0.15, p.yaw, p.roll, 'YXZ');
    this.torso.quaternion.setFromEuler(this._e);
    this.torso.updateMatrix();
    this.head.rotation.set(p.headPitch, p.headYaw, 0, 'YXZ');

    // hip joints in root space
    const hipJ = [V[4], V[5]];
    for (let i = 0; i < 2; i++) hipJ[i].set(i === 0 ? 0.095 : -0.095, -0.01, 0).applyMatrix4(this.torso.matrix);

    // ---- legs IK (thigh 0.45, shin 0.45)
    const knee = V[6], end = V[7], pole = V[8];
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      const ank = i === 0 ? ankleL : ankleR;
      pole.set(s * 0.12, seat * 0.6, 1);
      solveIK(hipJ[i], ank, 0.45, 0.45, pole, knee, end);
      placeBetween(this.thighs[i], hipJ[i], knee);
      placeBetween(this.shins[i], knee, end);
      this.knees[i].position.copy(knee);
      // boot cuff along the lower shin
      const cuff = this.cuffs[i];
      _d.copy(knee).sub(end).normalize();
      cuff.position.copy(end).addScaledVector(_d, 0.08);
      cuff.quaternion.setFromUnitVectors(UP, _d);
    }

    // ---- arms
    const shoulder = [V[9], V[10]];
    for (let i = 0; i < 2; i++) shoulder[i].set(i === 0 ? 0.2 : -0.2, 0.47, -0.005).applyMatrix4(this.torso.matrix);
    this.updatePolePlants(dt, sk, ground);
    const hands = [p.handL, p.handR];
    const tips = [p.tipL, p.tipR];
    const tgt = V[11];
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      // default: skiing stance, hands forward and wide, poles angled back
      tgt.set(s * 0.29, 0.25, 0.3).applyMatrix4(this.torso.matrix);
      tgt.y = Math.max(tgt.y, hip.y - 0.02);
      let tipDir = _pp.set(s * 0.1, -0.85, -0.52);
      // turn rhythm: outside hand a bit higher/forward
      if (ground) tgt.y += clamp(-sk.lean * s * 0.12, -0.08, 0.08);
      if (p.tuck > 0.01) {
        const tk = this._v[0].set(s * 0.13, 0.27, 0.36).applyMatrix4(this.torso.matrix);
        tgt.lerp(tk, p.tuck);
        tipDir.lerp(this._v[0].set(s * 0.05, 0.12, -1), p.tuck);
      }
      if (p.brake > 0.01) {
        const bk = this._v[0].set(s * 0.33, 0.33, 0.28).applyMatrix4(this.torso.matrix);
        tgt.lerp(bk, p.brake * 0.6);
      }
      if (this.plant[i].active) {
        const pl = this.plant[i];
        const k = Math.sin(clamp(pl.t / pl.dur, 0, 1) * Math.PI);
        tgt.z += 0.16 * k; tgt.y -= 0.1 * k;
        const tipL = this.root.worldToLocal(this._v[0].copy(pl.world));
        tipDir.copy(tipL).sub(hands[i]).normalize();
      }
      if (p.armsOut > 0.01) {
        const sway = Math.sin(t * 5 + i * 1.7) * 0.08;
        const ao = this._v[0].set(s * 0.62, 0.4 + sway, 0.12).applyMatrix4(this.torso.matrix);
        tgt.lerp(ao, p.armsOut);
        tipDir.lerp(this._v[0].set(s * 0.35, -0.7, -0.6), p.armsOut);
      }
      if (seat > 0.01) {
        const g = sk.glide;
        const br = i === 0 ? g.brakeL : g.brakeR;
        const sv = this._v[0].set(s * 0.26, lerp(0.74, 0.26, br), lerp(0.02, 0.16, br)).applyMatrix4(this.torso.matrix);
        tgt.lerp(sv, seat);
        tipDir.lerp(this._v[0].set(s * 0.15, -0.9, -0.35), seat);
      }
      if (p.spread > 0.01) {
        const cr = this._v[0].set(s * (0.5 + 0.2 * Math.sin(t * 9 + i)), 0.5 + 0.3 * Math.sin(t * 11 + i * 3), 0.2 * Math.sin(t * 7)).applyMatrix4(this.torso.matrix);
        tgt.lerp(cr, p.spread);
      }
      if (p.grabW > 0.01) this.applyGrab(i, tgt, tipDir, sk.air.grab, ankleL, ankleR);
      hands[i].lerp(tgt, 1 - Math.exp(-dt * 22));
      tips[i].lerp(tipDir, 1 - Math.exp(-dt * 14)).normalize();
    }
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? 1 : -1;
      pole.set(s * 0.8, -0.5, -0.4);
      solveIK(shoulder[i], hands[i], 0.3, 0.29, pole, knee, end);
      placeBetween(this.upperArms[i], shoulder[i], knee);
      placeBetween(this.foreArms[i], knee, end);
      this.shoulders[i].position.copy(shoulder[i]);
      _d.copy(end).sub(knee).normalize();
      this.cuffsArm[i].position.copy(end).addScaledVector(_d, -0.03);
      this.cuffsArm[i].quaternion.setFromUnitVectors(UP, _d);
      this.gloves[i].position.copy(end).addScaledVector(_d, 0.04);
      this.gloves[i].quaternion.setFromUnitVectors(UP, _d);
      const pg = this.poles[i];
      pg.position.copy(end).addScaledVector(_d, 0.04);
      pg.quaternion.setFromUnitVectors(DOWN, tips[i]);
    }
  }

  applyGrab(i, tgt, tipDir, grab, ankleL, ankleR) {
    const w = this.p.grabW;
    const s = i === 0 ? 1 : -1;
    // which hand grabs where (root space); other hand stays out for style
    let hand = -1, point = null;
    const pt = this._v[0];
    switch (grab) {
      case 'Japan': hand = 0; pt.copy(ankleR).add(_ab.set(0.0, -0.02, 0.28)); break;
      case 'Mute': hand = 0; pt.copy(ankleR).add(_ab.set(0.06, -0.06, 0.2)); break;
      case 'Safety': hand = 1; pt.copy(ankleR).add(_ab.set(-0.07, -0.05, 0.0)); break;
      case 'Nose': hand = 1; pt.copy(ankleR).add(_ab.set(0, 0.02, 0.62)); break;
      case 'Tail': hand = 0; pt.copy(ankleL).add(_ab.set(0.05, -0.02, -0.55)); break;
      default: return;
    }
    point = pt;
    if (i === hand) {
      tgt.lerp(point, w);
      tipDir.lerp(_ab.set(s * 0.3, 0.2, -1).normalize(), w);
    } else {
      tgt.lerp(this._v[0].set(s * 0.55, 1.45, -0.1), w * 0.7);
    }
  }

  updatePolePlants(dt, sk, ground) {
    this.plantCooldown = Math.max(0, this.plantCooldown - dt);
    const steer = sk.steer;
    if (ground && sk.state === 'ground' && sk.speed > 5 && sk.tuck < 0.3 && sk.brake < 0.3 && this.plantCooldown <= 0) {
      const crossed = (Math.abs(steer) > 0.45 && Math.abs(this.lastSteer) <= 0.45) || (steer * this.lastSteer < 0 && Math.abs(steer) > 0.3);
      if (crossed) {
        const i = steer > 0 ? 1 : 0; // turning right -> right pole (inside)
        const pl = this.plant[i];
        pl.active = true; pl.t = 0; pl.dur = clamp(2.2 / sk.speed, 0.09, 0.28);
        const s = i === 0 ? 1 : -1;
        pl.world.set(s * 0.5, 0.0, 0.95).applyMatrix4(this.root.matrixWorld);
        pl.world.y = sk.world.height(pl.world.x, pl.world.z);
        this.plantCooldown = 0.55;
        if (this.onPolePlant) this.onPolePlant(pl.world);
      }
    }
    this.lastSteer = steer;
    for (const pl of this.plant) {
      if (!pl.active) continue;
      pl.t += dt;
      if (pl.t > pl.dur || !ground) pl.active = false;
    }
  }

  // World-space positions useful for effects
  skiTail(i, out) {
    const g = this.skis[i].g;
    return out.set(0, 0.02, -0.62).applyMatrix4(g.matrixWorld);
  }
  skiTip(i, out) {
    const g = this.skis[i].g;
    return out.set(0, 0.02, 0.7).applyMatrix4(g.matrixWorld);
  }
  headPos(out) { return this.head.getWorldPosition(out); }
}
