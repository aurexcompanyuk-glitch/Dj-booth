// Sky dome with sun and clouds, sun/hemisphere lighting with a player-following shadow
// camera, an environment map for reflections, and a ring of distant mountains.
import * as THREE from 'three';
import { Simplex2 } from './noise.js';
import { clamp, lerp, smoothstep } from './util.js';
import { HALF } from './world.js';

export const SUN_DIR = new THREE.Vector3(-0.42, 0.74, 0.52).normalize();
export const FOG_COLOR = new THREE.Color(0xc4d6ea);

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const skyFrag = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform float uTime;
uniform float uClouds;
varying vec3 vDir;
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(col, uGround, smoothstep(0.0, -0.12, h));
  float sd = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.93, 0.8) * (pow(sd, 6.0) * 0.18 + pow(sd, 64.0) * 0.35);
  // clouds on a virtual plane
  if (h > 0.0 && uClouds > 0.0) {
    vec2 uv = d.xz / (h + 0.09) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
    float c = fbm(uv * 0.9);
    float cov = smoothstep(0.52, 0.78, c) * smoothstep(0.0, 0.18, h) * uClouds;
    float lit = 0.82 + 0.25 * smoothstep(0.4, 0.8, fbm(uv * 0.9 + uSun.xz * 0.15));
    vec3 cc = vec3(1.0, 0.99, 0.97) * lit + vec3(1.0, 0.9, 0.7) * pow(sd, 8.0) * 0.6;
    col = mix(col, cc, cov * 0.85);
  }
  col += vec3(1.0, 0.95, 0.85) * smoothstep(0.9993, 0.99975, sd) * 30.0;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: SUN_DIR.clone() },
      uZenith: { value: new THREE.Color(0x2f6fd6) },
      uHorizon: { value: FOG_COLOR.clone() },
      uGround: { value: new THREE.Color(0xb7c9dd) },
      uTime: { value: 0 },
      uClouds: { value: 1 },
    },
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

export class SkySystem {
  constructor(renderer, scene, quality) {
    this.scene = scene;
    this.skyMat = createSkyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(18000, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    scene.fog = new THREE.FogExp2(FOG_COLOR.clone(), 0.000105);
    scene.background = FOG_COLOR.clone();

    this.hemi = new THREE.HemisphereLight(0xbcd4ff, 0xf4f6ff, 0.55);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff0dc, 3.1);
    this.sun.castShadow = true;
    const sm = quality.shadowSize;
    this.sun.shadow.mapSize.set(sm, sm);
    const ext = quality.shadowExtent;
    const sc = this.sun.shadow.camera;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
    sc.near = 1; sc.far = 400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.shadowExt = ext;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Environment map from the sky for reflections (goggles, helmet, snow sheen)
    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial());
    envSky.material.uniforms.uClouds.value = 0.6;
    envScene.add(envSky);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0xdfe7f2 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -6;
    envScene.add(ground);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envMap = pmrem.fromScene(envScene, 0, 0.1, 200).texture;
    pmrem.dispose();
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.55;

    // Light-space basis for texel snapping (stops shadow shimmer)
    this._lz = SUN_DIR.clone().negate();
    this._lx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this._lz).normalize();
    this._ly = new THREE.Vector3().crossVectors(this._lz, this._lx).normalize();
    this._t = new THREE.Vector3();
  }

  update(dt, focus, camera) {
    this.sky.position.copy(camera.position);
    this.skyMat.uniforms.uTime.value += dt;
    // Snap the shadow focus to shadow-map texels
    const texel = (this.shadowExt * 2) / this.sun.shadow.mapSize.x;
    const a = Math.round(focus.dot(this._lx) / texel) * texel;
    const b = Math.round(focus.dot(this._ly) / texel) * texel;
    const c = focus.dot(this._lz);
    this._t.copy(this._lx).multiplyScalar(a).addScaledVector(this._ly, b).addScaledVector(this._lz, c);
    this.sun.target.position.copy(this._t);
    this.sun.position.copy(this._t).addScaledVector(SUN_DIR, 200);
    this.sun.target.updateMatrixWorld();
  }
}

// Big ring of distant peaks around the playable mountain.
export function createBackdrop(world) {
  const n = new Simplex2(4242), m = new Simplex2(777);
  const step = 128, ext = 14336;
  const N = (ext * 2) / step + 1;
  const pos = [], col = [];
  const heights = new Float32Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -ext + i * step, z = -ext + j * step;
      const ax = Math.abs(x), az = Math.abs(z);
      const dEdge = Math.max(ax, az) - HALF;
      let h;
      const cx = clamp(x, -HALF + 4, HALF - 4), cz = clamp(z, -HALF + 4, HALF - 4);
      if (dEdge <= 0) h = world.height(cx, cz) - 4;
      else {
        const hEdge = world.heightBase(cx, cz);
        const r = n.ridged(x * 0.00018, z * 0.00018, 6);
        const big = 700 + 2600 * r * r + 380 * m.noise(x * 0.0004, z * 0.0004) + 120 * n.noise(x * 0.002, z * 0.002);
        const t = smoothstep(0, 1500, dEdge);
        h = lerp(hEdge, big, t);
        const far = smoothstep(8500, 14000, Math.max(ax, az));
        h = lerp(h, 150, far * 0.85) - 6;
      }
      heights[j * N + i] = h;
    }
  }
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pos.push(-ext + i * step, heights[j * N + i], -ext + j * step);
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const x0 = -ext + i * step, z0 = -ext + j * step;
      if (x0 >= -HALF && x0 + step <= HALF && z0 >= -HALF && z0 + step <= HALF) continue;
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array;
  for (let k = 0; k < N * N; k++) {
    const y = pos[k * 3 + 1], ny = nrm[k * 3 + 1];
    const x = pos[k * 3], z = pos[k * 3 + 2];
    const treeLine = 520 + 120 * m.noise(x * 0.001, z * 0.001);
    const snow = smoothstep(0.5, 0.68, ny + 0.08 * n.noise(x * 0.004, z * 0.004));
    const forest = smoothstep(treeLine + 60, treeLine - 140, y) * smoothstep(0.62, 0.8, ny) * smoothstep(0.1, 0.45, m.noise(x * 0.0011 + 9.1, z * 0.0011));
    let r = 0.3, g = 0.29, b = 0.3;
    const s = clamp(snow, 0, 1);
    r = lerp(r, 0.92, s); g = lerp(g, 0.94, s); b = lerp(b, 0.98, s);
    if (forest > 0) { r = lerp(r, 0.07, forest * 0.85); g = lerp(g, 0.13, forest * 0.85); b = lerp(b, 0.1, forest * 0.85); }
    col.push(r, g, b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  return mesh;
}
