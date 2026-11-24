// Snow spray / powder particles and ski tracks carved into the snow.
import * as THREE from 'three';

const pVert = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
uniform float uFogDensity;
varying float vAlpha;
varying float vFog;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(0.1, -mv.z);
  gl_PointSize = min(aSize * uScale / d, 220.0);
  vAlpha = aAlpha * smoothstep(0.4, 3.2, d);
  vFog = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
}`;
const pFrag = /* glsl */ `
uniform vec3 uFogColor;
varying float vAlpha;
varying float vFog;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = dot(c, c);
  if (r > 0.25) discard;
  float a = smoothstep(0.25, 0.02, r) * vAlpha;
  vec3 col = mix(vec3(0.97, 0.98, 1.0) * (0.9 + 0.1 * (0.5 - c.y)), uFogColor, vFog);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class SnowParticles {
  constructor(scene, max = 3000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.grow = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.alpha0 = new Float32Array(max);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 }, uFogDensity: { value: 0.0001 }, uFogColor: { value: new THREE.Color(0xc4d6ea) } },
      vertexShader: pVert, fragmentShader: pFrag, transparent: true, depthWrite: false,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.next = 0;
    this.active = 0;
  }

  emit(x, y, z, vx, vy, vz, size, life, alpha = 0.8, grow = 1.5, drag = 2.2) {
    const i = this.next;
    this.next = (this.next + 1) % this.max;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.size0[i] = size; this.size[i] = size; this.grow[i] = grow;
    this.life[i] = life; this.maxLife[i] = life; this.alpha0[i] = alpha; this.alpha[i] = alpha;
    this.drag[i] = drag;
  }

  burst(x, y, z, n, speed, size, life, bias = null) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      let vx = Math.cos(a) * s, vz = Math.sin(a) * s, vy = Math.random() * speed * 0.8;
      if (bias) { vx += bias.x * 0.4; vy += bias.y * 0.2; vz += bias.z * 0.4; }
      this.emit(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.6, vx, vy, vz,
        size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), 0.85, 2.2);
    }
  }

  update(dt, camera, renderer, fog) {
    const p = this.pos, v = this.vel;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const k = Math.exp(-this.drag[i] * dt);
      v[i * 3] *= k; v[i * 3 + 1] = v[i * 3 + 1] * k - 5.5 * dt; v[i * 3 + 2] *= k;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i];
      this.size[i] = this.size0[i] * (1 + this.grow[i] * t);
      this.alpha[i] = this.alpha0[i] * (1 - t) * (1 - t) * Math.min(1, t * 12 + 0.2);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    const h = renderer.domElement.height;
    this.mat.uniforms.uScale.value = h / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (fog) { this.mat.uniforms.uFogDensity.value = fog.density; this.mat.uniforms.uFogColor.value.copy(fog.color); }
  }
}

export class SkiTracks {
  constructor(scene, segs = 3600) {
    this.max = segs;
    this.pos = new Float32Array(segs * 4 * 3);
    this.col = new Float32Array(segs * 4 * 4);
    const idx = new Uint32Array(segs * 6);
    for (let k = 0; k < segs; k++) {
      idx.set([4 * k, 4 * k + 2, 4 * k + 1, 4 * k + 1, 4 * k + 2, 4 * k + 3], k * 6);
    }
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
    this.last = [null, null];
  }

  clear() {
    this.col.fill(0);
    this.colAttr.needsUpdate = true;
    this.last = [null, null];
  }

  break(i) { this.last[i] = null; }

  // p: world point on the snow under the ski, n: surface normal, depth: 0 groomed .. 1 deep powder
  add(i, p, n, depth, carve) {
    const L = this.last[i];
    if (!L) { this.last[i] = { x: p.x, y: p.y, z: p.z, lx: 0, lz: 0, has: false }; return; }
    const dx = p.x - L.x, dz = p.z - L.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.45) return;
    if (d > 4) { this.last[i] = { x: p.x, y: p.y, z: p.z, lx: 0, lz: 0, has: false }; return; }
    const w = 0.055 + depth * 0.06 + carve * 0.02;
    // lateral = n x dir
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
    this.last[i] = { x: p.x, y: p.y, z: p.z, lx, lz, has: true };
  }
}
