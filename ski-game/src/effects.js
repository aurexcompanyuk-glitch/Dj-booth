// Visual effects: snow spray / powder / coloured smoke particles, ski tracks carved into the
// snow, glowing trick trails swept by the skis, and air motes / snowfall that streak with speed.
import * as THREE from 'three';

const pVert = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
uniform float uMaxSize;
uniform float uFogDensity;
varying float vAlpha;
varying float vFog;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(0.1, -mv.z);
  gl_PointSize = min(aSize * uScale / d, uMaxSize);
  vAlpha = aAlpha * smoothstep(0.4, 3.2, d);
  vFog = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  vColor = aColor;
}`;
const pFrag = /* glsl */ `
uniform vec3 uFogColor;
uniform vec3 uLight;
varying float vAlpha;
varying float vFog;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.02, r) * vAlpha;
  vec3 col = mix(vColor * uLight * (0.9 + 0.1 * (0.5 - c.y)), uFogColor, vFog);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class SnowParticles {
  constructor(scene, max = 4500, maxSize = 260) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3).fill(1);
    this.size = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.alpha0 = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.grav = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3));
    for (const k of ['position', 'aSize', 'aAlpha', 'aColor']) g.attributes[k].setUsage(THREE.DynamicDrawUsage);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 500 }, uMaxSize: { value: maxSize }, uFogDensity: { value: 0.0001 },
        uFogColor: { value: new THREE.Color(0xc4d6ea) }, uLight: { value: new THREE.Color(1, 1, 1) },
      },
      vertexShader: pVert, fragmentShader: pFrag, transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.next = 0;
    this.live = 0;
  }

  // r,g,b default to snow white
  emit(x, y, z, vx, vy, vz, size, life, alpha = 0.8, grow = 1.5, drag = 2.2, grav = 5.5, r = 0.97, g = 0.98, b = 1.0) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b;
    this.size0[i] = size; this.size[i] = size; this.grow[i] = grow;
    this.life[i] = life; this.maxLife[i] = life; this.alpha0[i] = alpha; this.alpha[i] = alpha;
    this.drag[i] = drag; this.grav[i] = grav;
    this.colDirty = true;
  }

  burst(x, y, z, n, speed, size, life, bias = null) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      let vx = Math.cos(a) * s, vz = Math.sin(a) * s, vy = Math.random() * speed * 0.8;
      if (bias) { vx += bias.x * 0.4; vy += bias.y * 0.2; vz += bias.z * 0.4; }
      this.emit(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6, vx, vy, vz,
        size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), 0.8, 2.2);
    }
  }

  // Coloured confetti-like sparkle burst (ring pickups, perfect landings)
  sparkle(x, y, z, n, speed, r, g, b) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * Math.PI;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.emit(x, y, z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s + 1.5, Math.sin(a) * Math.cos(e) * s,
        0.16 + Math.random() * 0.16, 0.7 + Math.random() * 0.6, 1, 0.2, 1.6, 4,
        Math.min(1, r + Math.random() * 0.2), Math.min(1, g + Math.random() * 0.2), Math.min(1, b + Math.random() * 0.2));
    }
  }

  clear() { this.life.fill(0); this.alpha.fill(0); this.points.geometry.attributes.aAlpha.needsUpdate = true; }

  update(dt, camera, renderer, fog, light) {
    const p = this.pos, v = this.vel;
    let live = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) this.alpha[i] = 0; continue; }
      live++;
      this.life[i] -= dt;
      const i3 = i * 3;
      const k = Math.exp(-this.drag[i] * dt);
      v[i3] *= k; v[i3 + 1] = v[i3 + 1] * k - this.grav[i] * dt; v[i3 + 2] *= k;
      p[i3] += v[i3] * dt; p[i3 + 1] += v[i3 + 1] * dt; p[i3 + 2] += v[i3 + 2] * dt;
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i];
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
      this.alpha[i] = this.alpha0[i] * (1 - t) * (1 - t) * Math.min(1, t * 12 + 0.2);
    }
    const g = this.points.geometry;
    if (live > 0 || this.live > 0) {
      g.attributes.position.needsUpdate = true;
      g.attributes.aSize.needsUpdate = true;
      g.attributes.aAlpha.needsUpdate = true;
    }
    if (this.colDirty) { g.attributes.aColor.needsUpdate = true; this.colDirty = false; }
    this.live = live;
    this.points.visible = live > 0;
    const h = renderer.domElement.height;
    this.mat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (fog) { this.mat.uniforms.uFogDensity.value = fog.density; this.mat.uniforms.uFogColor.value.copy(fog.color); }
    if (light) this.mat.uniforms.uLight.value.copy(light);
  }
}

export class SkiTracks {
  constructor(scene, segs = 4000) {
    this.max = segs;
    this.pos = new Float32Array(segs * 4 * 3);
    this.col = new Float32Array(segs * 4 * 4);
    const idx = new Uint32Array(segs * 6);
    for (let k = 0; k < segs; k++) idx.set([4 * k, 4 * k + 2, 4 * k + 1, 4 * k + 1, 4 * k + 2, 4 * k + 3], k * 6);
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3);
    this.colAttr = new THREE.BufferAttribute(this.col, 4);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.colAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('color', this.colAttr);
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.cursor = 0;
    this.last = [{ x: 0, y: 0, z: 0, lx: 0, lz: 0, has: false, on: false }, { x: 0, y: 0, z: 0, lx: 0, lz: 0, has: false, on: false }];
  }

  clear() {
    this.col.fill(0);
    this.colAttr.needsUpdate = true;
    this.last[0].on = false; this.last[1].on = false;
  }

  break(i) { this.last[i].on = false; }

  // p: world point on the snow under the ski, n: surface normal, depth: 0 groomed .. 1 deep powder
  add(i, p, n, depth, carve) {
    const L = this.last[i];
    if (!L.on) { L.x = p.x; L.y = p.y; L.z = p.z; L.has = false; L.on = true; return; }
    const dx = p.x - L.x, dz = p.z - L.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.45) return;
    if (d > 4) { L.x = p.x; L.y = p.y; L.z = p.z; L.has = false; return; }
    const w = 0.055 + depth * 0.06 + carve * 0.02;
    const fx = dx / d, fz = dz / d;
    let lx = n.y * fz, lz = -n.y * fx;
    const ll = Math.hypot(lx, lz) || 1;
    lx = (lx / ll) * w; lz = (lz / ll) * w;
    const k = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    const P = this.pos, o = k * 12;
    const plx = L.has ? L.lx : lx, plz = L.has ? L.lz : lz;
    const yo = 0.03;
    P[o] = L.x + plx; P[o + 1] = L.y + yo; P[o + 2] = L.z + plz;
    P[o + 3] = L.x - plx; P[o + 4] = L.y + yo; P[o + 5] = L.z - plz;
    P[o + 6] = p.x + lx; P[o + 7] = p.y + yo; P[o + 8] = p.z + lz;
    P[o + 9] = p.x - lx; P[o + 10] = p.y + yo; P[o + 11] = p.z - lz;
    const a = 0.28 + depth * 0.32 + carve * 0.12;
    const r = 0.6 - depth * 0.12, gg = 0.68 - depth * 0.1, b = 0.8 - depth * 0.05;
    const C = this.col, c = k * 16;
    for (let q = 0; q < 4; q++) { C[c + q * 4] = r; C[c + q * 4 + 1] = gg; C[c + q * 4 + 2] = b; C[c + q * 4 + 3] = a; }
    this.posAttr.addUpdateRange(o, 12);
    this.colAttr.addUpdateRange(c, 16);
    this.posAttr.needsUpdate = true;
    this.colAttr.needsUpdate = true;
    L.x = p.x; L.y = p.y; L.z = p.z; L.lx = lx; L.lz = lz; L.has = true;
  }
}

// A ribbon swept through the air by a ski (tip to tail). Shows the shape of every flip and spin.
export class TrickTrail {
  constructor(scene, color = 0x35d6ff, samples = 44) {
    this.n = samples;
    this.pos = new Float32Array(samples * 2 * 3);
    this.birth = new Float32Array(samples * 2).fill(-100);
    const idx = [];
    for (let k = 0; k < samples - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3); this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.birthAttr = new THREE.BufferAttribute(this.birth, 1); this.birthAttr.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr);
    g.setAttribute('aBirth', this.birthAttr);
    g.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uLife: { value: 0.55 }, uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.3 } },
      vertexShader: /* glsl */ `
attribute float aBirth; uniform float uTime; uniform float uLife; varying float vA; varying float vD;
void main() {
  vA = clamp(1.0 - (uTime - aBirth) / uLife, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vD = -mv.z;
  gl_Position = projectionMatrix * mv;
}`,
      fragmentShader: /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; varying float vA; varying float vD;
void main() {
  // fades out next to the lens so a ribbon passing the camera never fills the screen
  gl_FragColor = vec4(uColor, vA * vA * uOpacity * smoothstep(2.2, 6.5, vD));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.time = 0;
    this.lastEmit = -10;
    this.gap = true;
  }

  setColor(c) { this.mat.uniforms.uColor.value.set(c); }

  // Call every frame; pass tip/tail (world) while the trail should grow, or null to let it fade.
  update(dt, tip, tail) {
    this.time += dt;
    this.mat.uniforms.uTime.value = this.time;
    if (tip) {
      const P = this.pos, B = this.birth, n = this.n;
      P.copyWithin(0, 6); B.copyWithin(0, 2);
      const o = (n - 1) * 6;
      P[o] = tip.x; P[o + 1] = tip.y; P[o + 2] = tip.z; P[o + 3] = tail.x; P[o + 4] = tail.y; P[o + 5] = tail.z;
      B[(n - 1) * 2] = this.time; B[(n - 1) * 2 + 1] = this.time;
      if (this.gap) {
        // first sample after a gap: collapse every older sample onto it so no sheet spans the jump
        for (let k = 0; k < n - 1; k++) { P.copyWithin(k * 6, o, o + 6); B[k * 2] = -100; B[k * 2 + 1] = -100; }
        this.gap = false;
      }
      this.posAttr.needsUpdate = true; this.birthAttr.needsUpdate = true;
      this.lastEmit = this.time;
    } else this.gap = true;
    this.mesh.visible = this.time - this.lastEmit < this.mat.uniforms.uLife.value + 0.05;
  }
}

// Motes of ice in the air (or heavy snowfall) in a box that follows the camera. Each one is a
// short line that stretches with your speed, so going fast actually looks fast.
export class AirParticles {
  constructor(scene, max = 3600) {
    this.max = max;
    const seed = new Float32Array(max * 2 * 3), end = new Float32Array(max * 2);
    for (let i = 0; i < max; i++) {
      const x = Math.random(), y = Math.random(), z = Math.random();
      seed.set([x, y, z, x, y, z], i * 6);
      end[i * 2] = 0; end[i * 2 + 1] = 1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uCam: { value: new THREE.Vector3() }, uOffset: { value: new THREE.Vector3() }, uStreak: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(56, 34, 56) }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0.5 },
      },
      vertexShader: /* glsl */ `
attribute float aEnd; uniform vec3 uCam; uniform vec3 uOffset; uniform vec3 uStreak; uniform vec3 uBox; varying float vA;
void main() {
  vec3 p = mod(position * uBox + uOffset - uCam, uBox) - uBox * 0.5;
  vec3 wp = uCam + p + uStreak * aEnd;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  float d = length(p);
  vA = (1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, d)) * smoothstep(0.6, 3.0, d) * (1.0 - aEnd * 0.75);
}`,
      fragmentShader: /* glsl */ `
uniform vec3 uColor; uniform float uOpacity; varying float vA;
void main() {
  gl_FragColor = vec4(uColor, vA * uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      transparent: true, depthWrite: false,
    });
    this.lines = new THREE.LineSegments(g, this.mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 6;
    scene.add(this.lines);
    this.fall = new THREE.Vector3(0.5, -0.5, 0.2);
    this.count = max;
    this._v = new THREE.Vector3();
    this.setDensity(0.2, false);
  }

  // amount 0..1; snow = heavy falling flakes, otherwise drifting ice motes
  setDensity(amount, snow) {
    this.count = Math.max(0, Math.min(this.max, Math.round(this.max * amount)));
    this.lines.geometry.setDrawRange(0, this.count * 2);
    this.lines.visible = this.count > 0;
    this.fall.set(snow ? 2.2 : 0.4, snow ? -3.2 : -0.35, snow ? 0.8 : 0.15);
    this.mat.uniforms.uOpacity.value = snow ? 0.85 : 0.55;
  }

  update(dt, camera, camVel) {
    const u = this.mat.uniforms;
    u.uCam.value.copy(camera.position);
    u.uOffset.value.addScaledVector(this.fall, dt);
    // streak = where the flake was a moment ago, relative to the moving camera
    this._v.copy(camVel).sub(this.fall).multiplyScalar(0.028);
    const len = this._v.length();
    if (len > 2.2) this._v.multiplyScalar(2.2 / len);
    u.uStreak.value.copy(this._v);
  }
}
