// Sky dome (sun or moon, clouds, stars, aurora), weather presets that relight the whole
// scene, a player-following shadow camera, sky reflections, and the ring of distant peaks.
import * as THREE from 'three';
import { Simplex2 } from './noise.js';
import { clamp, lerp, smoothstep } from './util.js';
import { HALF } from './world.js';

// Shared, mutated in place when the weather changes (the terrain shader holds a reference).
export const SUN_DIR = new THREE.Vector3(-0.42, 0.74, 0.52).normalize();

export const WEATHER = {
  bluebird: {
    label: 'Bluebird', sun: [-0.42, 0.74, 0.52], sunColor: 0xfff0dc, sunInt: 3.1, glow: 1, disc: 30,
    zenith: 0x2f6fd6, horizon: 0xc4d6ea, ground: 0xb7c9dd, fog: 0xc4d6ea, fogDensity: 0.000105,
    hemiSky: 0xbcd4ff, hemiGround: 0xf4f6ff, hemiInt: 0.55, envInt: 0.55, exposure: 0.92,
    clouds: 1, cloudColor: 0xfffdf8, stars: 0, aurora: 0, overcast: 0, snow: 0, sparkle: 1, motes: 0.5,
  },
  golden: {
    label: 'Golden hour', sun: [-0.76, 0.2, 0.62], sunColor: 0xffa860, sunInt: 3.6, glow: 3.2, disc: 22,
    zenith: 0x35539c, horizon: 0xf0b48c, ground: 0xc7a596, fog: 0xe6b79c, fogDensity: 0.00013,
    hemiSky: 0x8ea2dc, hemiGround: 0xffd6bc, hemiInt: 0.55, envInt: 0.5, exposure: 0.98,
    clouds: 1, cloudColor: 0xffc9a8, stars: 0, aurora: 0, overcast: 0, snow: 0, sparkle: 1.4, motes: 0.7,
  },
  night: {
    label: 'Aurora night', sun: [0.38, 0.6, 0.7], sunColor: 0x9fbaff, sunInt: 1.05, glow: 0.35, disc: 9,
    zenith: 0x040818, horizon: 0x15213f, ground: 0x0d1524, fog: 0x121c34, fogDensity: 0.00011,
    hemiSky: 0x3e62c0, hemiGround: 0x1b2748, hemiInt: 0.62, envInt: 0.4, exposure: 1.2,
    clouds: 0.22, cloudColor: 0x5a6a94, stars: 1, aurora: 1, overcast: 0, snow: 0, sparkle: 1.2, motes: 0.35,
  },
  storm: {
    label: 'Snowstorm', sun: [-0.3, 0.8, 0.5], sunColor: 0xe4e9f2, sunInt: 1.25, glow: 0.25, disc: 0,
    zenith: 0x8b97a8, horizon: 0xc6cdd8, ground: 0xb9c1cc, fog: 0xc6cdd8, fogDensity: 0.00062,
    hemiSky: 0xd6dde8, hemiGround: 0xf2f4f8, hemiInt: 1.15, envInt: 0.75, exposure: 0.9,
    clouds: 0, cloudColor: 0xdfe4ec, stars: 0, aurora: 0, overcast: 1, snow: 1, sparkle: 0.2, motes: 1,
  },
};
export const WEATHER_ORDER = ['bluebird', 'golden', 'night', 'storm'];

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const skyFrag = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uCloudCol;
uniform float uTime;
uniform float uClouds;
uniform float uGlow;
uniform float uDisc;
uniform float uStars;
uniform float uAurora;
uniform float uOvercast;
varying vec3 vDir;
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h3(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n2(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, pow(clamp(h, 0.0, 1.0), 0.42));
  col = mix(col, uGround, smoothstep(0.0, -0.12, h));
  float sd = max(dot(d, uSun), 0.0);
  col += uSunCol * (pow(sd, 6.0) * 0.18 + pow(sd, 64.0) * 0.35) * uGlow;
  if (uStars > 0.0 && h > -0.02) {
    vec3 sp = d * 190.0;
    vec3 cell = floor(sp);
    float r = h3(cell);
    float star = step(0.9955, r) * smoothstep(0.42, 0.0, length(fract(sp) - 0.5));
    star *= 0.55 + 0.45 * sin(uTime * (1.5 + r * 4.0) + r * 90.0);
    col += vec3(0.9, 0.95, 1.0) * star * uStars * smoothstep(-0.02, 0.25, h) * (0.5 + 2.5 * fract(r * 91.7));
  }
  if (uAurora > 0.0 && h > 0.03) {
    vec2 p = d.xz / (h + 0.22);
    float band = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float centre = -1.6 + fi * 1.45;
      float wave = sin(p.x * (0.9 + fi * 0.5) + uTime * 0.11 + fi * 2.1) * 0.38 + sin(p.x * 2.9 - uTime * 0.07 + fi) * 0.14;
      float dist = p.y - centre - wave;
      float core = exp(-dist * dist * 7.0);
      float rays = 0.45 + 0.55 * n2(vec2(p.x * 11.0 + fi * 7.0, uTime * 0.22 + fi * 3.0));
      band += core * rays * (0.7 + 0.3 * sin(uTime * 0.3 + fi * 1.7));
    }
    vec3 aur = mix(vec3(0.08, 1.0, 0.42), vec3(0.55, 0.22, 1.0), smoothstep(0.12, 0.75, h));
    col += aur * band * uAurora * smoothstep(0.03, 0.22, h) * 0.6;
  }
  if (h > 0.0 && uClouds > 0.0) {
    vec2 uv = d.xz / (h + 0.09) * 1.6 + vec2(uTime * 0.004, uTime * 0.0015);
    float c = fbm(uv * 0.9);
    float cov = smoothstep(0.52, 0.78, c) * smoothstep(0.0, 0.18, h) * uClouds;
    float lit = 0.82 + 0.25 * smoothstep(0.4, 0.8, fbm(uv * 0.9 + uSun.xz * 0.15));
    vec3 cc = uCloudCol * lit + uSunCol * pow(sd, 8.0) * 0.6 * uGlow;
    col = mix(col, cc, cov * 0.85);
  }
  if (uOvercast > 0.0) {
    float o = fbm(d.xz / (abs(h) + 0.3) * 1.2 + uTime * 0.01);
    col = mix(col, uCloudCol * (0.78 + 0.22 * o), uOvercast * smoothstep(-0.05, 0.1, h) * 0.9);
  }
  col += uSunCol * smoothstep(0.9993, 0.99975, sd) * uDisc;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSun: { value: SUN_DIR.clone() }, uSunCol: { value: new THREE.Color(0xfff0dc) },
      uZenith: { value: new THREE.Color(0x2f6fd6) }, uHorizon: { value: new THREE.Color(0xc4d6ea) },
      uGround: { value: new THREE.Color(0xb7c9dd) }, uCloudCol: { value: new THREE.Color(0xfffdf8) },
      uTime: { value: 0 }, uClouds: { value: 1 }, uGlow: { value: 1 }, uDisc: { value: 30 },
      uStars: { value: 0 }, uAurora: { value: 0 }, uOvercast: { value: 0 },
    },
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

function setSkyUniforms(mat, W, envScale = 1) {
  const u = mat.uniforms;
  u.uSun.value.set(W.sun[0], W.sun[1], W.sun[2]).normalize();
  u.uSunCol.value.set(W.sunColor);
  u.uZenith.value.set(W.zenith); u.uHorizon.value.set(W.horizon); u.uGround.value.set(W.ground);
  u.uCloudCol.value.set(W.cloudColor);
  u.uClouds.value = W.clouds * envScale; u.uGlow.value = W.glow; u.uDisc.value = W.disc;
  u.uStars.value = W.stars; u.uAurora.value = W.aurora; u.uOvercast.value = W.overcast;
}

export class SkySystem {
  constructor(renderer, scene, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.skyMat = createSkyMaterial();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(18000, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    scene.add(this.sky);

    scene.fog = new THREE.FogExp2(0xc4d6ea, 0.000105);
    scene.background = new THREE.Color(0xc4d6ea);

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
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), createSkyMaterial());
    this.envScene.add(this.envSky);
    this.envGround = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({ color: 0xdfe7f2 }));
    this.envGround.rotation.x = -Math.PI / 2;
    this.envGround.position.y = -6;
    this.envScene.add(this.envGround);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envTarget = null;

    this._lz = new THREE.Vector3(); this._lx = new THREE.Vector3(); this._ly = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this.weather = null;
    this.setWeather('bluebird');
  }

  setWeather(name) {
    const W = WEATHER[name] || WEATHER.bluebird;
    this.weather = name;
    this.W = W;
    SUN_DIR.set(W.sun[0], W.sun[1], W.sun[2]).normalize();
    setSkyUniforms(this.skyMat, W);
    this.scene.fog.color.set(W.fog);
    this.scene.fog.density = W.fogDensity;
    this.scene.background.set(W.fog);
    this.hemi.color.set(W.hemiSky); this.hemi.groundColor.set(W.hemiGround); this.hemi.intensity = W.hemiInt;
    this.sun.color.set(W.sunColor); this.sun.intensity = W.sunInt;
    this.renderer.toneMappingExposure = W.exposure;
    // reflections
    setSkyUniforms(this.envSky.material, W, 0.6);
    this.envGround.material.color.set(W.hemiGround).multiplyScalar(name === 'night' ? 0.25 : 0.9);
    const old = this.envTarget;
    this.envTarget = this.pmrem.fromScene(this.envScene, 0, 0.1, 200);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = W.envInt;
    if (old) old.dispose();
    // light-space basis for shadow texel snapping
    this._lz.copy(SUN_DIR).negate();
    this._lx.crossVectors(new THREE.Vector3(0, 1, 0), this._lz).normalize();
    this._ly.crossVectors(this._lz, this._lx).normalize();
    return W;
  }

  update(dt, focus, camera) {
    this.sky.position.copy(camera.position);
    this.skyMat.uniforms.uTime.value += dt;
    // Snap the shadow focus to shadow-map texels (stops shadow shimmer)
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
  const step = 192, ext = 15360;
  const N = (ext * 2) / step + 1;
  const pos = new Float32Array(N * N * 3);
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
        const r = n.ridged(x * 0.00018, z * 0.00018, 4);
        const big = 720 + 2350 * r * r + 380 * m.noise(x * 0.0004, z * 0.0004) + 90 * n.noise(x * 0.0012, z * 0.0012);
        const t = smoothstep(0, 1500, dEdge);
        h = lerp(hEdge, big, t);
        const far = smoothstep(9500, 15000, Math.max(ax, az));
        h = lerp(h, 150, far * 0.85) - 6;
      }
      const k = (j * N + i) * 3;
      pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
    }
  }
  const idx = [];
  for (let j = 0; j < N - 1; j++) {
    for (let i = 0; i < N - 1; i++) {
      const x0 = -ext + i * step, z0 = -ext + j * step;
      if (x0 >= -HALF && x0 + step <= HALF && z0 >= -HALF && z0 + step <= HALF) continue;
      const a = j * N + i, b = a + 1, c = a + N, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array;
  const col = new Float32Array(N * N * 3);
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
    col[k * 3] = r; col[k * 3 + 1] = g; col[k * 3 + 2] = b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = false;
  return mesh;
}
