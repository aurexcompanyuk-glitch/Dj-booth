// Skier physics: carving on a heightfield, natural takeoffs, air tricks with landing
// assist, paraglider flight (wind, ridge lift, thermals), tree collisions, tumbles.
import { Vector3, Quaternion, Euler, Matrix4 } from 'three';
import { clamp, lerp, damp, smoothstep, wrapAngle, TAU } from './util.js';

const G = 9.81;
const MASS = 80;
const RHO = 1.1;
export const COM_H = 0.95;      // rotation pivot height above the feet (m)
const SPIN_RATE = 7.4;          // rad/s at full input (~1.2 rev/s)
const FLIP_RATE = 6.6;          // rad/s at full input (~1 rev/s)
const ABSORB = 0.3;             // bumps smaller than this are absorbed by the legs (m)

export function slopeEuler(yaw, n) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const pitch = Math.atan2(n.x * sy + n.z * cy, n.y);
  const nl = n.x * cy - n.z * sy;
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const nu = n.x * sy * sp + n.y * cp + n.z * cy * sp;
  return { pitch, roll: Math.atan2(-nl, nu) };
}

export class Skier {
  constructor(world) {
    this.world = world;
    this.pos = new Vector3();        // ground: feet contact point. air/glide/crash: body pivot (COM)
    this.vel = new Vector3();
    this.heading = 0;
    this.visYaw = 0;                 // visual pivot after switch landings
    this.state = 'ready';
    this.n = new Vector3(0, 1, 0);
    this.quat = new Quaternion();
    this.up = new Vector3(0, 1, 0);
    this.feet = new Vector3();
    this.assist = true;
    this.events = [];
    this.t = 0;
    this.speed = 0;
    // pose / ground state
    this.crouch = 0.2; this.charge = 0; this.tuck = 0; this.brake = 0; this.lean = 0;
    this.skid = 0; this.carve = 0; this.compress = 0; this.compressVel = 0; this.yawRate = 0;
    this.steer = 0; this.powder = 0; this.groundTime = 0; this.sideSlip = 0;
    this.air = {
      time: 0, yaw0: 0, pitch0: 0, roll0: 0, spin: 0, flip: 0, spinVel: 0, flipVel: 0,
      tHit: 9, landN: new Vector3(0, 1, 0), startY: 0, maxY: 0, grab: null, grabT: 0, grabs: [],
      count: 0, assisted: 0, jumped: false, fromGlider: false,
    };
    this.glide = {
      on: false, open: 0, t: 0, bank: 0, heading: 0, pitch: 0, cooldown: 0, time: 0, vario: 0,
      brakeL: 0, brakeR: 0, bar: 0, wind: { x: 0, y: 0, z: 0, thermal: 0 }, fromQuat: new Quaternion(),
    };
    this.crashS = { t: 0, ax: 0, ay: 0, az: 0 };
    this._f = new Vector3(); this._l = new Vector3(); this._v = new Vector3(); this._n2 = new Vector3();
    this._prev = new Vector3(); this._e = new Euler(0, 0, 0, 'YXZ'); this._m = new Matrix4();
    this._q = new Quaternion(); this._q2 = new Quaternion();
  }

  emit(type, data = {}) { this.events.push({ type, ...data }); }

  reset(x, z, heading) {
    const h = this.world.height(x, z);
    this.pos.set(x, h, z);
    this.vel.set(0, 0, 0);
    this.speed = 0;
    this.heading = heading;
    this.visYaw = 0;
    this.state = 'ready';
    this.events.length = 0;
    this.glide.on = false; this.glide.open = 0; this.glide.cooldown = 0;
    this.charge = 0; this.compress = 0; this.compressVel = 0; this.lean = 0; this.tuck = 0; this.brake = 0;
    this.skid = 0; this.carve = 0; this.groundTime = 0;
    this.world.normal(x, z, this.n);
    this.updateGroundQuat();
    this.feet.copy(this.pos);
  }

  // One fixed physics step. `inp` = { steer, fwd, back, jump, grab, glidePressed, startPressed }
  step(dt, inp) {
    this.t += dt;
    const g = this.glide;
    g.cooldown = Math.max(0, g.cooldown - dt);
    if (inp.glidePressed) this.toggleGlider();
    this.steer = inp.steer;
    switch (this.state) {
      case 'ready': this.readyStep(dt, inp); break;
      case 'ground': this.groundStep(dt, inp); break;
      case 'air': this.airStep(dt, inp); break;
      case 'glide': this.glideStep(dt, inp); break;
      case 'crash': this.crashStep(dt); break;
    }
    if (this.state !== 'ready') this.collide();
    this.clampBounds();
    // leg compression spring (visual + feel)
    this.compressVel += (-this.compress * 85 - this.compressVel * 13) * dt;
    this.compress = clamp(this.compress + this.compressVel * dt, -0.2, 1);
    this.visYaw = damp(this.visYaw, 0, 7, dt);
    this.speed = this.vel.length();
    // feet position for rendering
    if (this.state === 'ground' || this.state === 'ready') this.feet.copy(this.pos);
    else {
      this.up.set(0, 1, 0).applyQuaternion(this.quat);
      this.feet.copy(this.pos).addScaledVector(this.up, -COM_H);
    }
  }

  // ------------------------------------------------------------------ states
  readyStep(dt, inp) {
    const w = this.world;
    this.vel.set(0, 0, 0);
    this.pos.y = w.height(this.pos.x, this.pos.z);
    w.normal(this.pos.x, this.pos.z, this.n);
    this.heading = wrapAngle(this.heading - inp.steer * 1.4 * dt);
    this.lean = damp(this.lean, 0, 6, dt);
    this.updateGroundQuat();
    if (inp.startPressed) {
      this.state = 'ground';
      this.groundTime = 0;
      const f = this.forwardOnSlope(this._f);
      this.vel.copy(f).multiplyScalar(3.5);
      this.emit('start');
    }
  }

  // Ski direction on the surface: the heading's horizontal direction lifted vertically
  // onto the tangent plane (projecting along the normal would twist it on side-slopes).
  forwardOnSlope(out, yaw = this.heading) {
    const n = this.n;
    const sx = Math.sin(yaw), cz = Math.cos(yaw);
    out.set(sx, -(n.x * sx + n.z * cz) / Math.max(n.y, 0.05), cz).normalize();
    return out;
  }

  groundStep(dt, inp) {
    const w = this.world, p = this.pos, v = this.vel, n = this.n;
    this.groundTime += dt;
    w.normal(p.x, p.z, n);
    if (n.y < 0.4) { this.takeoff(false); return; }

    const pm = w.pisteMask(p.x, p.z);
    this.powder = 1 - pm;
    const gN = G * n.y;
    v.x += n.x * gN * dt;
    v.y += (-G + n.y * gN) * dt;
    v.z += n.z * gN * dt;
    let vn = v.dot(n);
    v.addScaledVector(n, -vn);
    let speed = v.length();

    const tuckIn = inp.fwd > 0.25 && speed > 5 && this.charge === 0 ? 1 : 0;
    const brakeIn = inp.back > 0.25 && speed > 0.8 ? 1 : 0;
    this.tuck = damp(this.tuck, tuckIn, 6, dt);
    this.brake = damp(this.brake, brakeIn, 9, dt);

    // Air drag + snow friction (deep powder is slower)
    const CdA = 0.74 - 0.33 * this.tuck + 0.25 * this.brake;
    const kd = (0.5 * RHO * CdA) / MASS + this.powder * 0.0013;
    const mu = 0.03 + 0.03 * this.powder;
    const decel = kd * speed * speed + mu * gN;
    if (speed > 1e-4) {
      const ns = Math.max(0, speed - decel * dt);
      v.multiplyScalar(ns / speed);
      speed = ns;
    }

    // Skating / pole push when slow
    const f = this.forwardOnSlope(this._f);
    if (inp.fwd > 0.25 && speed < 8) v.addScaledVector(f, 3.4 * (1 - speed / 8) * dt);

    // ---- steering: rotate the skis; edges make the velocity follow (carving)
    const velHead = speed > 0.6 ? Math.atan2(v.x, v.z) : this.heading;
    const rel = wrapAngle(this.heading - velHead);
    const grip = 1.15 - 0.3 * this.powder;
    const aCarve = grip * gN * 2.3 * (1 - 0.35 * this.tuck);
    const wMax = Math.min(2.7, (1.3 * aCarve) / Math.max(speed, 0.5));
    let yawRate = -inp.steer * wMax;
    if (this.brake > 0.05 && speed > 1.2) {
      const side = Math.abs(rel) > 0.08 ? Math.sign(rel) : (inp.steer > 0 ? -1 : 1);
      const target = velHead + side * Math.PI * 0.47;
      yawRate += wrapAngle(target - this.heading) * 8 * this.brake;
    } else if (Math.abs(inp.steer) < 0.08 && speed > 1.2) {
      yawRate += wrapAngle(velHead - this.heading) * (Math.abs(rel) > 1.6 ? 1.2 : 2.4);
    }
    this.heading = wrapAngle(this.heading + yawRate * dt);
    this.yawRate = yawRate;

    // ---- edge grip: remove sideways velocity up to the available friction
    this.forwardOnSlope(f);
    const l = this._l.crossVectors(n, f);
    const vf = v.dot(f);
    let vl = v.dot(l);
    const gripAcc = this.brake > 0.3 ? (0.75 + 0.4 * this.brake) * gN : grip * gN * 2.3;
    const maxDv = gripAcc * dt;
    let slide = 0;
    if (Math.abs(vl) <= maxDv) vl = 0;
    else { slide = Math.abs(vl); vl -= Math.sign(vl) * maxDv; }
    v.copy(f).multiplyScalar(vf).addScaledVector(l, vl);
    this.sideSlip = vl;
    this.skid = damp(this.skid, clamp(slide / 3 + this.brake * Math.min(1, speed / 6), 0, 1), 10, dt);
    this.carve = damp(this.carve, clamp(Math.abs(yawRate * speed) / 14, 0, 1), 8, dt);

    // Body inclination into the turn, or uphill when braking
    let leanT = Math.atan2(yawRate * vf * 0.9, gN);
    leanT = clamp(leanT, -1.05, 1.05) * (1 - 0.6 * this.brake);
    if (this.brake > 0.05) leanT -= Math.sign(vl || rel) * 0.38 * this.brake * Math.min(1, speed / 5);
    this.lean = damp(this.lean, leanT, 9, dt);

    // ---- jump: hold to load, release to pop
    if (inp.jump) this.charge = Math.min(1, this.charge + dt / 0.42);
    else if (this.charge > 0) {
      const pop = 2.6 + 3.4 * this.charge;
      this.charge = 0;
      v.addScaledVector(n, pop);
      v.y += 0.5;
      this.updateGroundQuat();
      this.takeoff(true);
      this.emit('jump', { pop });
      return;
    }

    // ---- integrate and follow the ground
    this._prev.copy(p);
    p.addScaledVector(v, dt);
    const h = w.height(p.x, p.z);
    const gap = p.y - h;
    if (gap < 0) {
      const n2 = w.normal(p.x, p.z, this._n2);
      if (n2.y < 0.4 && -gap > 0.2) {
        // Ran into a wall / cliff face from below: stop against it
        p.copy(this._prev);
        const nh = Math.hypot(n2.x, n2.z) || 1;
        const ux = n2.x / nh, uz = n2.z / nh;
        const into = v.x * ux + v.z * uz;
        if (into < 0) { v.x -= ux * into * 1.3; v.z -= uz * into * 1.3; this.emit('bump', { impact: -into }); }
        p.y = w.height(p.x, p.z);
      } else p.y = h;
    } else if (gap > 0.002 && this.shouldTakeoff()) {
      this.updateGroundQuat();
      // keep feet position consistent: we were on the surface at the start of the step
      this.takeoff(false);
      return;
    } else p.y = h;

    // Re-align velocity to the new surface (keep speed through smooth transitions)
    w.normal(p.x, p.z, n);
    const sp = v.length();
    vn = v.dot(n);
    if (vn < -0.05) this.compressVel += -vn * 0.12;
    v.addScaledVector(n, -vn);
    if (sp > 1e-4 && Math.abs(vn) < 0.35 * sp) {
      const l2 = v.length();
      if (l2 > 1e-6) v.multiplyScalar(sp / l2);
    }

    this.crouch = damp(this.crouch, 0.22 + 0.55 * this.charge + 0.5 * this.tuck + 0.1 * this.carve, 10, dt);
    this.updateGroundQuat();
  }

  // Ballistic look-ahead: only leave the ground if the bump is bigger than the legs can absorb.
  shouldTakeoff() {
    const w = this.world, p = this.pos, v = this.vel;
    let px = p.x, py = p.y, pz = p.z, vy = v.y;
    let maxGap = py - w.height(px, pz);
    const dt = 0.025;
    for (let k = 0; k < 24; k++) {
      px += v.x * dt; pz += v.z * dt; vy -= G * dt; py += vy * dt;
      const g = py - w.height(px, pz);
      if (g > maxGap) maxGap = g;
      if (g <= 0) return maxGap > ABSORB;
    }
    return true;
  }

  updateGroundQuat() {
    const n = this.n;
    const f = this.forwardOnSlope(this._f, this.heading + this.visYaw);
    const l = this._l.crossVectors(n, f).normalize();
    const c = Math.cos(this.lean), s = Math.sin(this.lean);
    const up = this._v.copy(n).multiplyScalar(c).addScaledVector(l, s);
    const left = this._n2.copy(l).multiplyScalar(c).addScaledVector(n, -s);
    this._m.makeBasis(left, up, f);
    this.quat.setFromRotationMatrix(this._m);
  }

  takeoff(jumped) {
    const a = this.air;
    this.state = 'air';
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    this.pos.addScaledVector(this.up, COM_H);
    this._e.setFromQuaternion(this.quat, 'YXZ');
    a.yaw0 = this._e.y; a.pitch0 = this._e.x; a.roll0 = this._e.z;
    a.spin = 0; a.flip = 0; a.spinVel = 0; a.flipVel = 0;
    a.time = 0; a.startY = this.pos.y; a.maxY = this.pos.y;
    a.grab = null; a.grabT = 0; a.grabs = []; a.count = 0; a.assisted = 0;
    a.jumped = jumped; a.fromGlider = false;
    this.charge = 0;
    this.visYaw = 0;
    a.tHit = this.predictImpact();
    this.emit('takeoff', { jumped });
  }

  predictImpact() {
    const w = this.world, p = this.pos, v = this.vel;
    let x = p.x, y = p.y - COM_H, z = p.z, vy = v.y;
    const dt = 0.04;
    let prevGap = y - w.height(x, z);
    for (let t = dt; t < 7; t += dt) {
      x += v.x * dt; z += v.z * dt; vy -= G * dt; y += vy * dt;
      const gap = y - w.height(x, z);
      if (gap <= 0) {
        w.normal(x, z, this.air.landN);
        const frac = prevGap / Math.max(1e-6, prevGap - gap);
        return Math.max(0, t - dt + frac * dt);
      }
      prevGap = gap;
    }
    this.air.landN.set(0, 1, 0);
    return 7;
  }

  airStep(dt, inp) {
    const a = this.air, p = this.pos, v = this.vel, w = this.world;
    a.time += dt;
    v.y -= G * dt;
    const sp = v.length();
    v.multiplyScalar(1 - ((0.5 * RHO * 0.6) / MASS) * sp * dt);
    p.addScaledVector(v, dt);
    if (p.y > a.maxY) a.maxY = p.y;

    a.count++;
    if (a.count % 3 === 0) a.tHit = this.predictImpact(); else a.tHit = Math.max(0, a.tHit - dt);

    // Rotation input: steer = spin, fwd/back = front/back flip
    const spinIn = -inp.steer, flipIn = inp.fwd - inp.back;
    a.spinVel = damp(a.spinVel, spinIn * SPIN_RATE, Math.abs(spinIn) > 0.1 ? 7 : 1.6, dt);
    a.flipVel = damp(a.flipVel, flipIn * FLIP_RATE, Math.abs(flipIn) > 0.1 ? 6 : 1.4, dt);

    // Grabs
    if (inp.grab && a.time > 0.1 && a.tHit > 0.25) {
      if (!a.grab) {
        if (flipIn > 0.3) a.grab = 'Nose';
        else if (flipIn < -0.3) a.grab = 'Tail';
        else if (inp.steer < -0.3) a.grab = 'Mute';
        else if (inp.steer > 0.3) a.grab = 'Safety';
        else a.grab = 'Japan';
        a.grabT = 0;
        this.emit('grab', { grab: a.grab });
      }
      a.grabT += dt;
    } else if (a.grab) {
      a.grabs.push({ type: a.grab, t: a.grabT });
      a.grab = null;
    }

    // Landing assist: steer rotation so you always land on your skis, matched to the slope
    const T = Math.max(a.tHit, 0.04);
    const wA = this.assist ? smoothstep(0.9, 0.12, a.tHit) : 0;
    if (!this.assist) {
      // Pro mode: you stop your own rotation; the body only settles its pitch/roll to the slope
      const wP = smoothstep(0.6, 0.1, a.tHit);
      const sl = slopeEuler(a.yaw0 + a.spin, a.landN);
      a.pitch0 = damp(a.pitch0, sl.pitch, 1 + 5 * wP, dt);
      a.roll0 = damp(a.roll0, sl.roll, 1 + 5 * wP, dt);
    } else if (wA > 0) {
      const look = Math.min(T, 0.45) * 0.5;
      const spinT = Math.round((a.spin + a.spinVel * look) / Math.PI) * Math.PI;
      const flipT = Math.round((a.flip + a.flipVel * look) / TAU) * TAU;
      a.spinVel = lerp(a.spinVel, (spinT - a.spin) / T, wA);
      a.flipVel = lerp(a.flipVel, (flipT - a.flip) / T, wA);
      const sl = slopeEuler(a.yaw0 + spinT, a.landN);
      a.pitch0 = damp(a.pitch0, sl.pitch, 1 + 11 * wA, dt);
      a.roll0 = damp(a.roll0, sl.roll, 1 + 11 * wA, dt);
      a.assisted = Math.max(a.assisted, wA);
    } else {
      a.roll0 = damp(a.roll0, 0, 1.0, dt);
      a.pitch0 = damp(a.pitch0, clamp(a.pitch0, -0.35, 0.5), 1.0, dt);
    }
    a.spin += a.spinVel * dt;
    a.flip += a.flipVel * dt;
    this._e.set(a.pitch0 + a.flip, a.yaw0 + a.spin, a.roll0, 'YXZ');
    this.quat.setFromEuler(this._e);
    this.crouch = damp(this.crouch, a.grab ? 0.9 : 0.35 + 0.25 * Math.min(1, Math.abs(a.flipVel) / 4), 8, dt);
    this.lean = 0; this.tuck = damp(this.tuck, 0, 5, dt); this.brake = 0; this.skid = 0;

    // Touchdown
    if (a.time > 0.04) {
      this.up.set(0, 1, 0).applyQuaternion(this.quat);
      const fx = p.x - this.up.x * COM_H, fy = p.y - this.up.y * COM_H, fz = p.z - this.up.z * COM_H;
      const hf = w.height(fx, fz);
      if (fy <= hf) { this.land(fx, hf, fz, false); return; }
      if (p.y - 0.35 <= w.height(p.x, p.z)) { this.land(fx, w.height(fx, fz), fz, true); return; }
    }
  }

  land(fx, fy, fz, bodyHit) {
    const a = this.air, w = this.world, v = this.vel;
    if (a.grab) { a.grabs.push({ type: a.grab, t: a.grabT }); a.grab = null; }
    const n = w.normal(fx, fz, this.n);
    this.up.set(0, 1, 0).applyQuaternion(this.quat);
    const err = Math.acos(clamp(this.up.dot(n), -1, 1));
    const vn = v.dot(n);
    const impact = Math.max(0, -vn);
    v.addScaledVector(n, -vn);

    // Heading from the body's forward axis; detect switch (backwards) landings
    const fwd = this._f.set(0, 0, 1).applyQuaternion(this.quat);
    if (Math.hypot(fwd.x, fwd.z) < 0.25) fwd.set(v.x, 0, v.z);
    let heading = Math.atan2(fwd.x, fwd.z);
    const vh = Math.hypot(v.x, v.z);
    let switchLanding = false;
    if (vh > 1.5) {
      const rel = wrapAngle(heading - Math.atan2(v.x, v.z));
      if (Math.abs(rel) > Math.PI / 2) {
        switchLanding = true;
        const dir = Math.sign(a.spinVel || a.spin || 1);
        heading = wrapAngle(heading + Math.PI);
        this.visYaw = -dir * Math.PI;
      }
    }
    this.heading = heading;

    let quality;
    if (bodyHit || err > 1.4) quality = this.assist ? 'sketchy' : 'crash';
    else if (err > 0.9) quality = 'sketchy';
    else if (err > 0.33) quality = 'clean';
    else quality = 'perfect';

    // Hard flat landings and sketchy landings scrub speed
    let keep = 1 - clamp((impact - 7) / 30, 0, 0.3);
    if (quality === 'sketchy') keep *= bodyHit ? 0.6 : 0.8;
    v.multiplyScalar(keep);

    const landing = {
      quality, err, impact, airTime: a.time, spin: a.spin, flip: a.flip, grabs: a.grabs.slice(),
      drop: a.startY - (fy + COM_H), height: a.maxY - a.startY, switchLanding, jumped: a.jumped,
      fromGlider: a.fromGlider, x: fx, y: fy, z: fz,
    };

    if (quality === 'crash') {
      this.pos.set(fx, fy, fz).addScaledVector(n, 0.4);
      this.startCrash();
      this.emit('land', landing);
      return;
    }
    this.pos.set(fx, fy, fz);
    this.state = 'ground';
    this.groundTime = 0;
    this.lean = 0;
    this.compressVel += 1.2 + impact * 0.32;
    this.updateGroundQuat();
    this.emit('land', landing);
  }

  // ------------------------------------------------------------------ paraglider
  toggleGlider() {
    const g = this.glide;
    if (this.state === 'glide') { this.stowGlider(); return; }
    if (g.cooldown > 0 || this.state === 'crash' || this.state === 'ready') return;
    if (this.state === 'ground') {
      if (this.speed < 6) { this.emit('hint', { text: 'Pick up some speed to launch the paraglider' }); return; }
      this.takeoff(false);
      this.vel.y += 2.2;
    }
    const a = this.air;
    this.state = 'glide';
    g.on = true; g.t = 0; g.open = 0; g.time = 0; g.bank = 0; g.pitch = 0;
    const vh = Math.hypot(this.vel.x, this.vel.z);
    g.heading = vh > 2 ? Math.atan2(this.vel.x, this.vel.z) : a.yaw0 + a.spin;
    g.fromQuat.copy(this.quat);
    this.emit('glideOpen', { freefall: a.time, height: a.startY - this.pos.y });
  }

  stowGlider() {
    const g = this.glide, a = this.air;
    g.on = false; g.cooldown = 0.45;
    this.state = 'air';
    this._e.setFromQuaternion(this.quat, 'YXZ');
    a.yaw0 = this._e.y; a.pitch0 = this._e.x; a.roll0 = this._e.z;
    a.spin = 0; a.flip = 0; a.spinVel = 0; a.flipVel = 0;
    a.time = 0; a.startY = this.pos.y; a.maxY = this.pos.y; a.grab = null; a.grabs = []; a.count = 0;
    a.jumped = false; a.fromGlider = true;
    a.tHit = this.predictImpact();
    this.emit('glideClose');
  }

  glideStep(dt, inp) {
    const g = this.glide, p = this.pos, v = this.vel, w = this.world;
    g.t += dt; g.time += dt;
    g.open = smoothstep(0.05, 0.85, g.t);
    const wind = w.windAt(p.x, p.y, p.z, g.wind);
    // The pilot couples to the moving air mass as the canopy inflates
    const wx = wind.x * g.open, wy = wind.y * g.open, wz = wind.z * g.open;
    const vax = v.x - wx, vay = v.y - wy, vaz = v.z - wz;
    const vh = Math.hypot(vax, vaz);

    g.bar = damp(g.bar, inp.fwd, 4, dt);
    const brk = inp.back;
    g.brakeL = damp(g.brakeL, clamp(brk + Math.max(0, -inp.steer) * 0.8, 0, 1), 6, dt);
    g.brakeR = damp(g.brakeR, clamp(brk + Math.max(0, inp.steer) * 0.8, 0, 1), 6, dt);
    g.bank = damp(g.bank, inp.steer * 0.72, 2.2, dt);
    g.heading = wrapAngle(g.heading - (G * Math.tan(g.bank) / Math.max(vh, 7)) * dt * g.open);

    const Vt = 12 + 5.5 * g.bar - 4 * brk;
    let sink = 1.15 + 1.4 * g.bar * g.bar - 0.2 * brk + 3.5 * Math.max(0, brk - 0.85);
    sink /= Math.pow(Math.cos(g.bank), 1.5);
    const hx = Math.sin(g.heading) * Vt, hz = Math.cos(g.heading) * Vt;
    const kh = 1 - Math.exp(-dt * 0.95 * g.open);
    const nvx = vax + (hx - vax) * kh, nvz = vaz + (hz - vaz) * kh;
    const zoom = 0.3 * Math.max(0, vh - Vt);
    const kv = 1 - Math.exp(-dt * 1.8 * g.open);
    const nvy = vay + (-sink + zoom - vay) * kv - G * dt * (1 - g.open);
    v.set(nvx + wx, nvy + wy, nvz + wz);
    p.addScaledVector(v, dt);
    g.vario = v.y;

    // Pilot hangs under the wing: yaw = wing heading, swings into turns
    g.pitch = damp(g.pitch, -0.12 * g.bar + 0.16 * brk, 3, dt);
    this._e.set(g.pitch, g.heading, -g.bank * 0.85, 'YXZ');
    this._q.setFromEuler(this._e);
    this.quat.copy(g.fromQuat).slerp(this._q, smoothstep(0, 0.65, g.t));
    this.crouch = damp(this.crouch, 0.3, 4, dt);
    this.lean = 0;

    const hf = w.height(p.x, p.z);
    if (p.y - COM_H <= hf + 0.02) this.glideTouchdown(hf);
  }

  glideTouchdown(hf) {
    const g = this.glide, p = this.pos, v = this.vel;
    g.on = false; g.cooldown = 0.5;
    p.y = hf;
    this.world.normal(p.x, p.z, this.n);
    const vn = v.dot(this.n);
    v.addScaledVector(this.n, -vn);
    this.heading = g.heading;
    this.state = 'ground';
    this.groundTime = 0;
    this.lean = 0;
    this.compressVel += 1.5 + Math.max(0, -vn) * 0.3;
    this.updateGroundQuat();
    this.emit('glideLand', { flight: g.time });
  }

  // ------------------------------------------------------------------ tumbles & collisions
  startCrash() {
    const c = this.crashS;
    if (this.glide.on) { this.glide.on = false; this.glide.cooldown = 1; }
    this.state = 'crash';
    c.t = 0;
    const s = Math.min(this.vel.length(), 25);
    c.ax = (Math.random() - 0.5) * 3 + s * 0.35;
    c.ay = (Math.random() - 0.5) * 4;
    c.az = (Math.random() - 0.5) * 6;
    if (this.pos.y - this.world.height(this.pos.x, this.pos.z) < COM_H * 0.5) this.pos.y += 0.5;
    this.emit('crash');
  }

  crashStep(dt) {
    const c = this.crashS, p = this.pos, v = this.vel, w = this.world;
    c.t += dt;
    v.y -= G * dt;
    p.addScaledVector(v, dt);
    const h = w.height(p.x, p.z);
    if (p.y - 0.35 < h) {
      p.y = h + 0.35;
      const n = w.normal(p.x, p.z, this.n);
      const vn = v.dot(n);
      if (vn < 0) v.addScaledVector(n, -vn * 1.35);
      v.multiplyScalar(1 - Math.min(1, 2.4 * dt));
      c.ax *= 1 - 2 * dt; c.ay *= 1 - 2 * dt; c.az *= 1 - 2 * dt;
    }
    this._e.set(c.ax * dt, c.ay * dt, c.az * dt, 'XYZ');
    this._q.setFromEuler(this._e);
    this.quat.multiply(this._q);
    if ((c.t > 1.5 && v.length() < 7) || c.t > 3.2) {
      this.state = 'ground';
      this.groundTime = 0;
      p.y = w.height(p.x, p.z);
      w.normal(p.x, p.z, this.n);
      const vh = Math.hypot(v.x, v.z);
      if (vh > 0.5) this.heading = Math.atan2(v.x, v.z);
      v.multiplyScalar(0.5);
      this.lean = 0;
      this.updateGroundQuat();
      this.emit('recover');
    }
  }

  collide() {
    const p = this.pos, w = this.world;
    const feetY = this.state === 'ground' ? p.y : p.y - COM_H;
    const R = 0.38;
    w.forColliders(p.x, p.z, (cx, cz, r, by, hgt) => {
      const dx = p.x - cx, dz = p.z - cz, rr = r + R, d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) return false;
      if (feetY > by + hgt || feetY + 1.8 < by - 1) return false;
      const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d;
      p.x = cx + nx * rr; p.z = cz + nz * rr;
      const vin = this.vel.x * nx + this.vel.z * nz;
      if (vin < 0) {
        const impact = -vin;
        this.vel.x -= nx * vin * 1.3; this.vel.z -= nz * vin * 1.3;
        this.vel.multiplyScalar(impact > 6 ? 0.72 : 0.92);
        this.emit('bump', { impact, x: cx, y: by + hgt * 0.6, z: cz });
        if (this.state === 'glide') this.stowGlider();
        else if (impact > 14 && !this.assist && this.state !== 'crash') this.startCrash();
      }
      return true;
    });
  }

  clampBounds() {
    const L = 2020, p = this.pos, v = this.vel;
    if (p.x < -L) { p.x = -L; if (v.x < 0) v.x = 0; }
    if (p.x > L) { p.x = L; if (v.x > 0) v.x = 0; }
    if (p.z < -L) { p.z = -L; if (v.z < 0) v.z = 0; }
    if (p.z > L) { p.z = L; if (v.z > 0) v.z = 0; }
    if (p.y > 3200) { p.y = 3200; if (v.y > 0) v.y = 0; }
  }

  // Height of the feet above the terrain (0 on the ground)
  agl() {
    return this.feet.y - this.world.height(this.feet.x, this.feet.z);
  }
}
