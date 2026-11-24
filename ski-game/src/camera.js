// Camera modes: chase, far chase, helmet cam, cinematic tripod. Smooth, terrain-aware.
import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp } from './util.js';

export const CAM_MODES = ['Chase', 'Far chase', 'Helmet cam', 'Cinematic'];

export class CameraRig {
  constructor(camera, world) {
    this.cam = camera;
    this.world = world;
    this.mode = 0;
    this.yaw = 0;
    this.pitch = 0.18;
    this.offset = new THREE.Vector3(0, 2, -5);
    this.target = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.shake = 0;
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.dragging = false;
    this.fov = 70;
    this.cine = new THREE.Vector3();
    this.cineValid = false;
    this._v = new THREE.Vector3();
    this._f = new THREE.Vector3();
    this._u = new THREE.Vector3();
  }

  setMode(m) { this.mode = (m + CAM_MODES.length) % CAM_MODES.length; this.cineValid = false; this.snapNext = true; }

  addShake(s) { this.shake = Math.min(1.2, this.shake + s); }

  update(dt, sk, character) {
    const cam = this.cam, w = this.world;
    const vh = Math.hypot(sk.vel.x, sk.vel.z);
    const air = sk.state === 'air', glide = sk.state === 'glide';
    let desiredYaw;
    if (glide) desiredYaw = sk.glide.heading;
    else if (vh > 2.5) desiredYaw = Math.atan2(sk.vel.x, sk.vel.z);
    else desiredYaw = sk.heading;
    if (!this.dragging) {
      this.orbitYaw = damp(this.orbitYaw, 0, 1.2, dt);
      this.orbitPitch = damp(this.orbitPitch, 0, 1.2, dt);
    }
    const snap = this.snapNext;
    this.snapNext = false;
    this.yaw = snap ? desiredYaw : dampAngle(this.yaw, desiredYaw, air ? 1.6 : glide ? 1.8 : 3.2, dt);

    const speed = sk.speed;
    this.target.copy(sk.feet);
    this.target.y += glide ? 1.6 : air ? 0.9 : 1.05;
    if (sk.state === 'crash') this.target.copy(sk.pos);

    const yaw = this.yaw + this.orbitYaw;
    const fwd = this._f.set(Math.sin(yaw), 0, Math.cos(yaw));

    if (this.mode === 2) {
      // Helmet cam: rides on the head, looks where the body faces
      character.headPos(cam.position);
      const q = sk.quat;
      const look = this._v.set(0, -0.08, 1).applyQuaternion(q);
      cam.position.addScaledVector(look, 0.12);
      cam.up.set(0, 1, 0).applyQuaternion(q).lerp(this._u.set(0, 1, 0), 0.35).normalize();
      this.lookAt.copy(cam.position).addScaledVector(look, 10);
      cam.lookAt(this.lookAt);
      this.updateFov(dt, speed, 12);
      return;
    }
    cam.up.set(0, 1, 0);

    if (this.mode === 3) {
      // Cinematic tripod: placed ahead of the rider; relocate when they pass by
      const dist = this.cineValid ? this.cine.distanceTo(this.target) : 1e9;
      const behind = this.cineValid ? this._v.copy(this.target).sub(this.cine).dot(sk.vel) > 0 : true;
      if (!this.cineValid || dist > 90 || (behind && dist > 28)) {
        const dir = this._v.copy(sk.vel);
        dir.y = 0;
        if (dir.lengthSq() < 1) dir.copy(fwd);
        dir.normalize();
        const side = Math.random() < 0.5 ? -1 : 1;
        const ahead = clamp(speed * 2.6, 18, 70);
        this.cine.copy(this.target).addScaledVector(dir, ahead);
        this.cine.x += -dir.z * side * (10 + Math.random() * 10);
        this.cine.z += dir.x * side * (10 + Math.random() * 10);
        this.cine.y = Math.max(w.height(this.cine.x, this.cine.z) + 1.6 + Math.random() * 4, glide ? this.target.y - 6 : -1e9);
        this.cineValid = true;
      }
      cam.position.copy(this.cine);
      this.lookAt.lerp(this.target, snap ? 1 : 1 - Math.exp(-dt * 10));
      cam.lookAt(this.lookAt);
      const d = cam.position.distanceTo(this.target);
      this.fov = damp(this.fov, clamp(2 * Math.atan(5.5 / d) * 57.3, 12, 60), 3, dt);
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
      return;
    }

    const far = this.mode === 1;
    let dist = far ? 10.5 + Math.min(speed, 40) * 0.07 : 4.3 + Math.min(speed, 40) * 0.05;
    let height = far ? 3.6 : 1.55 + Math.min(speed, 40) * 0.012;
    if (glide) { dist = far ? 20 : 12; height = far ? 5 : 2.4; }
    if (air && !glide) { dist += 1.2; height += 0.4; }
    const pitchOff = this.orbitPitch;
    const desired = this._v.copy(fwd).multiplyScalar(-dist);
    desired.y = height + pitchOff * dist;
    this.offset.lerp(desired, snap ? 1 : 1 - Math.exp(-dt * (air ? 3 : 6)));
    cam.position.copy(this.target).add(this.offset);
    // terrain clearance
    const hc = w.height(cam.position.x, cam.position.z) + 1.0;
    if (cam.position.y < hc) cam.position.y = hc;

    const ahead = glide ? 6 : 3.5 + Math.min(speed, 30) * 0.12;
    const lt = this._u.copy(this.target).addScaledVector(fwd, ahead);
    lt.y += glide ? 1.8 : 0.15;
    this.lookAt.lerp(lt, snap ? 1 : 1 - Math.exp(-dt * 12));

    // shake
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const rumble = sk.state === 'ground' ? clamp((speed - 18) / 30, 0, 1) * 0.025 : 0;
    const s = this.shake * this.shake * 0.25 + rumble;
    if (s > 0.0005) {
      const t = performance.now() * 0.001;
      cam.position.x += Math.sin(t * 61) * s;
      cam.position.y += Math.sin(t * 73 + 1) * s;
      cam.position.z += Math.sin(t * 67 + 2) * s;
    }
    cam.lookAt(this.lookAt);
    this.updateFov(dt, speed, 0);
  }

  // Vertical FOV that keeps at least ~62 degrees horizontally on portrait screens
  baseFov(v) {
    const aspect = this.cam.aspect || 1.6;
    const minH = 62 * Math.PI / 180;
    const needV = 2 * Math.atan(Math.tan(minH / 2) / aspect) * 180 / Math.PI;
    return Math.min(100, Math.max(v, needV));
  }

  updateFov(dt, speed, extra) {
    const target = this.baseFov(68) + clamp(speed - 8, 0, 36) * 0.42 + extra;
    this.fov = damp(this.fov, target, 2.5, dt);
    this.cam.fov = this.fov;
    this.cam.updateProjectionMatrix();
  }
}
