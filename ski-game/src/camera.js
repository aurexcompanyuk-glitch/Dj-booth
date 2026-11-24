// Camera modes: chase, far chase, helmet cam, cinematic tripod.
// Spring-damped yaw, a target that ignores small bumps, gentle banking into turns,
// a soft landing dip instead of a rattle, and terrain avoidance.
import * as THREE from 'three';
import { clamp, damp, dampAngle, wrapAngle } from './util.js';

export const CAM_MODES = ['Chase', 'Far chase', 'Helmet cam', 'Cinematic'];

export class CameraRig {
  constructor(camera, world) {
    this.cam = camera;
    this.world = world;
    this.mode = 0;
    this.yaw = 0; this.yawVel = 0;
    this.offset = new THREE.Vector3(0, 2, -5);
    this.target = new THREE.Vector3();
    this.ty = 0; this.vySm = 0;
    this.lookAt = new THREE.Vector3();
    this.shake = 0;
    this.punch = 0; this.punchVel = 0;
    this.roll = 0;
    this.lift = 0; this.los = 0;
    this.orbitYaw = 0; this.orbitPitch = 0; this.dragging = false;
    this.slowSide = 1; this.slowOrbit = 0;
    this.fov = 70;
    this.cine = new THREE.Vector3();
    this.cineValid = false;
    this.snapNext = true;
    this.vel = new THREE.Vector3();
    this._prev = new THREE.Vector3();
    this._v = new THREE.Vector3(); this._f = new THREE.Vector3(); this._u = new THREE.Vector3();
  }

  setMode(m) { this.mode = (m + CAM_MODES.length) % CAM_MODES.length; this.cineValid = false; this.snapNext = true; }

  snap() { this.snapNext = true; this.shake = 0; this.punch = 0; this.punchVel = 0; this.lift = 0; this.los = 0; this.slowOrbit = 0; }

  addShake(s) {
    this.punchVel -= Math.min(s, 1.2) * 2.4;
    if (s > 0.45) this.shake = Math.min(1, this.shake + (s - 0.45));
  }

  update(dt, sk, character, slowmo = 0) {
    const cam = this.cam, w = this.world;
    const vh = Math.hypot(sk.vel.x, sk.vel.z);
    const st = sk.state;
    const air = st === 'air', glide = st === 'glide', wing = st === 'wing';
    const snap = this.snapNext;
    this.snapNext = false;

    this.shake = Math.max(0, this.shake - dt * 2.6);
    this.punchVel += (-this.punch * 70 - this.punchVel * 13) * dt;
    this.punch = clamp(this.punch + this.punchVel * dt, -0.6, 0.3);

    // Which way to look: along the motion, or down the superpipe while riding it
    let desiredYaw;
    if (glide) desiredYaw = sk.glide.heading;
    else if (wing) desiredYaw = sk.wing.heading;
    else if (sk.inPipe && vh > 2) desiredYaw = sk.pipeYaw;
    else if (vh > 2.5) desiredYaw = Math.atan2(sk.vel.x, sk.vel.z);
    else desiredYaw = sk.heading;
    if (snap) { this.yaw = desiredYaw; this.yawVel = 0; }
    else {
      const K = air ? 9 : glide ? 10 : wing ? 16 : sk.inPipe ? 6 : 22;
      this.yawVel += (K * wrapAngle(desiredYaw - this.yaw) - 2 * Math.sqrt(K) * this.yawVel) * dt;
      this.yaw = wrapAngle(this.yaw + this.yawVel * dt);
    }
    if (!this.dragging) {
      this.orbitYaw = damp(this.orbitYaw, 0, 1.2, dt);
      this.orbitPitch = damp(this.orbitPitch, 0, 1.2, dt);
    }
    // slow motion drifts the camera round to the side so you can watch the trick
    if (slowmo < 0.02) this.slowSide = sk.air.spinVel > 0 ? -1 : 1;
    this.slowOrbit = damp(this.slowOrbit, slowmo * 0.55 * this.slowSide, 2.2, dt);

    // Target: follows the rider exactly sideways, but floats over small bumps vertically
    const speed = sk.speed;
    const ty = sk.feet.y + (glide ? 1.6 : air || wing ? 0.9 : 1.05);
    if (snap || st !== 'ground') { this.ty = snap ? ty : damp(this.ty, ty, 30, dt); this.vySm = sk.vel.y; }
    else {
      this.vySm = damp(this.vySm, sk.vel.y, 5, dt);
      this.ty += this.vySm * dt;
      this.ty += (ty - this.ty) * (1 - Math.exp(-9 * dt));
      this.ty = clamp(this.ty, ty - 0.35, ty + 0.35);
    }
    this.target.set(sk.feet.x, this.ty, sk.feet.z);
    if (st === 'crash') this.target.copy(sk.pos);

    const yaw = this.yaw + this.orbitYaw + this.slowOrbit;
    const fwd = this._f.set(Math.sin(yaw), 0, Math.cos(yaw));

    if (this.mode === 2) {
      // Helmet cam: rides on the head, looks where the body faces
      character.headPos(cam.position);
      const q = sk.quat;
      const look = this._v.set(0, wing ? 0.75 : -0.08, wing ? 0.65 : 1).normalize().applyQuaternion(q);
      cam.position.addScaledVector(look, 0.12);
      cam.up.set(0, 1, 0).applyQuaternion(q).lerp(this._u.set(0, 1, 0), wing ? 0.8 : 0.35).normalize();
      this.lookAt.copy(cam.position).addScaledVector(look, 10);
      cam.lookAt(this.lookAt);
      this.updateFov(dt, speed, 12);
      this.trackVel(dt, snap);
      return;
    }
    cam.up.set(0, 1, 0);

    if (this.mode === 3) {
      // Cinematic tripod: placed ahead of the rider; relocate when they pass by
      const dist = this.cineValid ? this.cine.distanceTo(this.target) : 1e9;
      const behind = this.cineValid ? this._v.copy(this.target).sub(this.cine).dot(sk.vel) > 0 : true;
      if (!this.cineValid || dist > 95 || (behind && dist > 28)) {
        const dir = this._v.copy(sk.vel);
        dir.y = 0;
        if (dir.lengthSq() < 1) dir.copy(fwd);
        dir.normalize();
        const side = Math.random() < 0.5 ? -1 : 1;
        const ahead = clamp(speed * 2.6, 18, 80);
        this.cine.copy(this.target).addScaledVector(dir, ahead);
        this.cine.x += -dir.z * side * (10 + Math.random() * 10);
        this.cine.z += dir.x * side * (10 + Math.random() * 10);
        this.cine.y = Math.max(w.height(this.cine.x, this.cine.z) + 1.6 + Math.random() * 4, glide || wing ? this.target.y - 8 : -1e9);
        this.cineValid = true;
        this.lookAt.copy(this.target);
      }
      cam.position.copy(this.cine);
      this.lookAt.lerp(this.target, snap ? 1 : 1 - Math.exp(-dt * 10));
      cam.lookAt(this.lookAt);
      const d = cam.position.distanceTo(this.target);
      this.fov = damp(this.fov, clamp(2 * Math.atan(5.5 / d) * 57.3, 12, 60), 3, dt);
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
      this.trackVel(dt, true);
      return;
    }

    const far = this.mode === 1;
    let dist = far ? 10.5 + Math.min(speed, 40) * 0.07 : 4.4 + Math.min(speed, 40) * 0.055;
    let height = far ? 3.6 : 1.55 + Math.min(speed, 40) * 0.012;
    if (glide) { dist = far ? 20 : 12; height = far ? 5 : 2.4; }
    else if (wing) { dist = far ? 12 : 6.2; height = far ? 3.2 : 1.7; }
    else if (air) { dist += 1.3 + slowmo * 1.5; height += 0.45; }
    if (sk.inPipe && !glide && !wing) { dist += 3.5; height += 2.2; }
    const desired = this._v.copy(fwd).multiplyScalar(-dist);
    desired.y = height + this.orbitPitch * dist;
    this.offset.lerp(desired, snap ? 1 : 1 - Math.exp(-dt * (air ? 3 : wing ? 4 : 6)));
    cam.position.copy(this.target).add(this.offset);

    // terrain clearance: rise at once if the ground gets in the way, settle back gently
    const need = w.height(cam.position.x, cam.position.z) + 1.05 - cam.position.y;
    this.lift = snap ? Math.max(0, need) : Math.max(need, this.lift - dt * 2.5, 0);
    // line of sight: a roll-over, spine or cliff edge between the camera and the rider lifts the
    // camera until it can see over it (quick up, slow back down)
    let los = 0;
    const cpx = cam.position.x, cpy = cam.position.y, cpz = cam.position.z, tg = this.target;
    for (let i = 1; i <= 5; i++) {
      const t = i * 0.16;
      const h = w.height(cpx + (tg.x - cpx) * t, cpz + (tg.z - cpz) * t) + 0.3 + 0.7 * (1 - t);
      const up = (h - tg.y * t) / (1 - t) - cpy;
      if (up > los) los = up;
    }
    los = Math.min(los, dist * 1.6);
    this.los = snap ? los : los > this.los ? damp(this.los, los, 14, dt) : Math.max(los, this.los - dt * 3);
    cam.position.y += Math.max(this.lift, this.los) + this.punch * 0.35;

    const ahead = glide ? 6 : wing ? 9 : 3.5 + Math.min(speed, 30) * 0.12;
    const lt = this._u.copy(this.target).addScaledVector(fwd, ahead);
    lt.y += (glide ? 1.8 : 0.15) + this.punch * 0.15;
    if (sk.inPipe && !glide) lt.y -= 1.2;
    this.lookAt.lerp(lt, snap ? 1 : 1 - Math.exp(-dt * 12));

    if (this.shake > 0.001) {
      const s = this.shake * this.shake * 0.16;
      const t = performance.now() * 0.001;
      cam.position.x += Math.sin(t * 61) * s;
      cam.position.y += Math.sin(t * 73 + 1) * s;
      cam.position.z += Math.sin(t * 67 + 2) * s;
    }
    cam.lookAt(this.lookAt);
    // bank gently with the rider
    const rollT = st === 'ground' ? -sk.lean * 0.11 : wing ? sk.wing.bank * 0.3 : glide ? sk.glide.bank * 0.22 : 0;
    this.roll = snap ? rollT : damp(this.roll, rollT, 4, dt);
    if (Math.abs(this.roll) > 0.0005) cam.rotateZ(this.roll);
    this.updateFov(dt, speed, wing ? 8 : -5 * slowmo);
    this.trackVel(dt, snap);
  }

  // Camera velocity (for speed streaks in the air around it)
  trackVel(dt, reset) {
    if (reset || dt <= 0) this.vel.set(0, 0, 0);
    else this.vel.copy(this.cam.position).sub(this._prev).multiplyScalar(1 / dt);
    this._prev.copy(this.cam.position);
  }

  // Vertical FOV that keeps at least ~62 degrees horizontally on portrait screens
  baseFov(v) {
    const aspect = this.cam.aspect || 1.6;
    const minH = 62 * Math.PI / 180;
    const needV = 2 * Math.atan(Math.tan(minH / 2) / aspect) * 180 / Math.PI;
    return Math.min(100, Math.max(v, needV));
  }

  updateFov(dt, speed, extra) {
    const target = this.baseFov(68) + clamp(speed - 8, 0, 40) * 0.42 + extra;
    this.fov = damp(this.fov, target, 2.5, dt);
    this.cam.fov = this.fov;
    this.cam.updateProjectionMatrix();
  }
}
