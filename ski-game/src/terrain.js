// Quadtree level-of-detail terrain. Vertices geomorph between detail levels (no popping),
// skirts hide any remaining cracks, and a mip-mapped noise texture drives the
// snow / rock / corduroy shader so distant slopes stay calm instead of shimmering.
import * as THREE from 'three';
import { HALF, SIZE, DN, DRES, LEAF } from './world.js';
import { mulberry32 } from './noise.js';

const RES = 32;                       // quads per node side
const ROW = RES + 1;
const GRIDV = ROW * ROW;
const SKIRTV = ROW * 4;
const MAX_LEVEL = Math.round(Math.log2(SIZE / LEAF)); // leaf nodes are LEAF metres wide

function buildIndex() {
  const idx = [];
  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const a = j * ROW + i, b = a + 1, c = a + ROW, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const edges = [(k) => k, (k) => RES * ROW + k, (k) => k * ROW, (k) => k * ROW + RES];
  edges.forEach((ev, e) => {
    for (let k = 0; k < RES; k++) {
      const a = ev(k), b = ev(k + 1);
      const sa = GRIDV + e * ROW + k, sb = sa + 1;
      idx.push(a, sa, b, b, sa, sb);
      idx.push(a, b, sa, b, sb, sa);
    }
  });
  return new THREE.BufferAttribute(new Uint16Array(idx), 1);
}

// Tileable value-noise texture: R and G = independent smooth noise (16 cells per tile),
// B = 3-octave fbm, A = fine grain.
export function makeNoiseTexture(maxAniso = 4) {
  const N = 256;
  const rng = mulberry32(991);
  const lat = (cells) => { const a = new Float32Array(cells * cells); for (let i = 0; i < a.length; i++) a[i] = rng(); return { a, cells }; };
  const val = (L, u, v) => {
    const c = L.cells;
    const x = u * c, y = v * c;
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const i0 = ((ix % c) + c) % c, i1 = (i0 + 1) % c, j0 = ((iy % c) + c) % c, j1 = (j0 + 1) % c;
    const a = L.a[j0 * c + i0], b = L.a[j0 * c + i1], d = L.a[j1 * c + i0], e = L.a[j1 * c + i1];
    return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
  };
  const L1 = lat(16), L2 = lat(16), L3 = lat(32), L4 = lat(64), L5 = lat(128);
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, k = (y * N + x) * 4;
    data[k] = Math.round(255 * val(L1, u, v));
    data[k + 1] = Math.round(255 * val(L2, u, v));
    data[k + 2] = Math.round(255 * (0.55 * val(L2, u, v) + 0.3 * val(L3, u, v) + 0.15 * val(L4, u, v)));
    data[k + 3] = Math.round(255 * (0.5 * val(L4, u, v) + 0.5 * val(L5, u, v)));
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

const NOISE_GLSL = /* glsl */ `
float tHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float tNoise(vec2 p) { return texture2D(uNoise, p * 0.0625).r; }
float tNoiseB(vec2 p) { return texture2D(uNoise, p * 0.0625).g; }
float tFbm(vec2 p) { return texture2D(uNoise, p * 0.0625).b; }
// Triplanar: blends three planar samples by the surface normal (no streaks on cliffs)
float tTri(vec3 p, vec3 w, float f, float o) {
  float r = tNoise(p.xz * f + o) * w.y;
  if (w.x > 0.01) r += tNoise(p.zy * f + o) * w.x;
  if (w.z > 0.01) r += tNoise(p.xy * f + o) * w.z;
  return r;
}
`;

export function createTerrainMaterial(maskTexture, noiseTexture, sunDir, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
  const uniforms = {
    uMask: { value: maskTexture },
    uNoise: { value: noiseTexture },
    uTreeFar: { value: opts.treeFar || 900 },
    uSunDir: { value: sunDir },
    uDetail: { value: opts.detail === undefined ? 1 : opts.detail },
    uSparkle: { value: 1 },
    uMorphK: { value: opts.splitK || 2.4 },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aMorph;
attribute vec3 aMorphN;
uniform float uMorphK;
varying vec3 vWPos;
varying vec3 vWN;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
float tRange = aMorph.y * uMorphK;
float tMorph = clamp((distance((modelMatrix * vec4(position, 1.0)).xyz, cameraPosition) - tRange * 1.3) / (tRange * 0.55), 0.0, 1.0);
objectNormal = normalize(mix(objectNormal, aMorphN, tMorph));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed.y = mix(transformed.y, aMorph.x, tMorph);
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWN = normalize(mat3(modelMatrix) * objectNormal);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying vec3 vWN;
uniform sampler2D uMask;
uniform sampler2D uNoise;
uniform float uTreeFar;
uniform vec3 uSunDir;
uniform float uDetail;
uniform float uSparkle;
${NOISE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 tN = normalize(vWN);
vec2 tUV = ((vWPos.xz + ${HALF.toFixed(1)}) / ${DRES.toFixed(1)} + 0.5) / ${DN.toFixed(1)};
vec4 tMask = texture2D(uMask, tUV);
float tPiste = tMask.r;
float tForest = tMask.g;
vec2 tDir = normalize(tMask.ba * 2.0 - 1.0 + vec2(1e-4));
float tCam = length(vWPos - cameraPosition);
float tSlope = 1.0 - tN.y;
vec3 tW3 = pow(abs(tN), vec3(4.0));
tW3 /= (tW3.x + tW3.y + tW3.z);
float tA = tTri(vWPos, tW3, 0.06, 0.0);
float tB = tTri(vWPos, tW3, 0.55, 17.0);
vec3 tSnow = vec3(0.93, 0.95, 0.985) * (0.975 + 0.04 * tB);
// wind-blown sastrugi off-piste, cleaner groomed snow on-piste
tSnow *= 1.0 - 0.04 * (1.0 - tPiste) * smoothstep(0.45, 0.8, tNoiseB(vWPos.xz * vec2(0.18, 0.05)));
float tCord = 0.5 + 0.5 * sin(dot(vWPos.xz, vec2(-tDir.y, tDir.x)) * 12.0);
float tCordF = tPiste * (1.0 - smoothstep(10.0, 42.0, tCam)) * uDetail;
tSnow *= 1.0 - 0.06 * tCordF * tCord;
// grooming lanes visible from further away
tSnow *= 1.0 - 0.025 * tPiste * smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(dot(vWPos.xz, vec2(-tDir.y, tDir.x)) * 0.9 + tA * 3.0)) * (1.0 - smoothstep(150.0, 500.0, tCam));
float tRock = smoothstep(0.40, 0.56, tSlope + (tA - 0.5) * 0.18);
float tStrata = tNoiseB(vec2(vWPos.y * 0.45 + tA * 3.0, 0.5));
vec3 tRockCol = mix(vec3(0.17, 0.16, 0.16), vec3(0.40, 0.38, 0.36), tStrata * 0.55 + tTri(vWPos, tW3, 0.21, 5.0) * 0.45);
tRockCol *= 0.72 + 0.4 * tB;
// snow caught on rock ledges
tRock *= 1.0 - 0.6 * smoothstep(0.62, 0.8, tTri(vWPos, tW3, 0.9, 3.1)) * smoothstep(0.75, 0.45, tSlope);
vec3 tCol = mix(tSnow, tRockCol, tRock);
float tFar = smoothstep(uTreeFar * 0.62, uTreeFar, tCam);
tCol *= 1.0 - tForest * 0.09 * (1.0 - tFar);
// distant forest canopy: dark conifers with snow-dusted crowns
float tCanopy = texture2D(uNoise, vWPos.xz * 0.02).a;
vec3 tForestCol = mix(vec3(0.035, 0.075, 0.055), vec3(0.5, 0.57, 0.61), smoothstep(0.5, 0.8, tCanopy) * 0.55);
float tPatch = smoothstep(0.34, 0.56, tForest + (tNoise(vWPos.xz * 0.018) - 0.5) * 0.3 + (tCanopy - 0.5) * 0.3);
tCol = mix(tCol, tForestCol, tFar * tPatch);
diffuseColor.rgb *= tCol;
float tSnowAmt = (1.0 - tRock) * (1.0 - tFar * tPatch);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(0.96, 0.74, tSnowAmt);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float tFlat = 1.0 - smoothstep(0.25, 0.5, tSlope);
  float tFade = (1.0 - smoothstep(25.0, 140.0, tCam)) * uDetail * tFlat;
  vec2 q = vWPos.xz;
  float e = 0.2;
  float n0 = tNoise(q * 0.9), nx = tNoise((q + vec2(e, 0.0)) * 0.9), nz = tNoise((q + vec2(0.0, e)) * 0.9);
  float m0 = tNoise(q * 0.16), mx = tNoise((q + vec2(e * 4.0, 0.0)) * 0.16), mz = tNoise((q + vec2(0.0, e * 4.0)) * 0.16);
  vec3 tBump = vec3(n0 - nx, 0.0, n0 - nz) * 1.1 * tFade + vec3(m0 - mx, 0.0, m0 - mz) * 0.8 * tFlat * (1.0 - smoothstep(300.0, 900.0, tCam));
  vec3 tWN = normalize(vWN + tBump * (1.0 - tRock * 0.5));
  normal = normalize((viewMatrix * vec4(tWN, 0.0)).xyz);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  vec3 tV = normalize(cameraPosition - vWPos);
  vec3 tH = normalize(tV + uSunDir);
  vec2 tCell = vWPos.xz * 9.0;
  vec2 tCi = mod(floor(tCell), 997.0);
  float tR = tHash(tCi + mod(floor(vWPos.y * 9.0), 61.0) * 13.7);
  float tDot = 1.0 - smoothstep(0.08, 0.22, length(fract(tCell) - 0.5));
  float tSp = step(0.985, tR) * tDot * pow(max(dot(tN, tH), 0.0), 18.0);
  tSp *= (1.0 - smoothstep(5.0, 32.0, tCam)) * tSnowAmt * uDetail * uSparkle;
  totalEmissiveRadiance += vec3(tSp * 2.4);
}`);
  };
  mat.customProgramCacheKey = () => 'terrain-v3';
  return mat;
}

const _range = [0, 0];

export class Terrain {
  constructor(world, material, opts = {}) {
    this.world = world;
    this.material = material;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    this.nodes = new Map();
    this.splitK = opts.splitK || 2.4;
    this.budgetMs = opts.budgetMs || 3;
    this.maxNodes = opts.maxNodes || 900;
    this.index = buildIndex();
    this.frame = 0;
    this.visible = [];
    this.requests = [];
    this.reqPool = [];
    this.box = new THREE.Box3();
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.heights = new Float32Array((RES + 3) * (RES + 3));
    this.nrmTmp = new Float32Array(GRIDV * 3);
  }

  setSplitK(k) { this.splitK = k; this.material.userData.uniforms.uMorphK.value = k; }

  key(level, ix, iz) { return level * 100000000 + iz * 10000 + ix; }

  createNode(level, ix, iz) {
    const size = SIZE / (1 << level);
    const x0 = -HALF + ix * size, z0 = -HALF + iz * size;
    const step = size / RES;
    const W = RES + 3, H = this.heights, w = this.world;
    for (let j = 0; j < W; j++) {
      const z = z0 + (j - 1) * step;
      for (let i = 0; i < W; i++) H[j * W + i] = w.height(x0 + (i - 1) * step, z);
    }
    const total = GRIDV + SKIRTV;
    const pos = new Float32Array(total * 3);
    const nrm = new Int16Array(total * 3);
    const morph = new Float32Array(total * 2);
    const mnrm = new Int16Array(total * 3);
    const NT = this.nrmTmp;
    const cx = x0 + size / 2, cz = z0 + size / 2;
    let minY = Infinity, maxY = -Infinity;
    for (let j = 0; j <= RES; j++) {
      for (let i = 0; i <= RES; i++) {
        const k = j * ROW + i;
        const hc = H[(j + 1) * W + i + 1];
        pos[k * 3] = x0 + i * step - cx;
        pos[k * 3 + 1] = hc;
        pos[k * 3 + 2] = z0 + j * step - cz;
        const nx = H[(j + 1) * W + i] - H[(j + 1) * W + i + 2];
        const nz = H[j * W + i + 1] - H[(j + 2) * W + i + 1];
        const ny = 2 * step;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz);
        NT[k * 3] = nx / l; NT[k * 3 + 1] = ny / l; NT[k * 3 + 2] = nz / l;
        if (hc < minY) minY = hc;
        if (hc > maxY) maxY = hc;
      }
    }
    // Morph targets: where each vertex sits on the next-coarser grid
    for (let j = 0; j <= RES; j++) {
      for (let i = 0; i <= RES; i++) {
        const k = j * ROW + i;
        const oi = i & 1, oj = j & 1;
        let a = k, b = k;
        if (oi && !oj) { a = k - 1; b = k + 1; }
        else if (!oi && oj) { a = k - ROW; b = k + ROW; }
        else if (oi && oj) { a = k - ROW + 1; b = k + ROW - 1; }
        morph[k * 2] = (pos[a * 3 + 1] + pos[b * 3 + 1]) * 0.5;
        morph[k * 2 + 1] = size;
        let mx = NT[a * 3] + NT[b * 3], my = NT[a * 3 + 1] + NT[b * 3 + 1], mz = NT[a * 3 + 2] + NT[b * 3 + 2];
        const ml = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        mnrm[k * 3] = Math.round((mx / ml) * 32767); mnrm[k * 3 + 1] = Math.round((my / ml) * 32767); mnrm[k * 3 + 2] = Math.round((mz / ml) * 32767);
        nrm[k * 3] = Math.round(NT[k * 3] * 32767); nrm[k * 3 + 1] = Math.round(NT[k * 3 + 1] * 32767); nrm[k * 3 + 2] = Math.round(NT[k * 3 + 2] * 32767);
      }
    }
    const depth = step * 1.6 + 2.5;
    for (let e = 0; e < 4; e++) {
      for (let k = 0; k <= RES; k++) {
        const src = e === 0 ? k : e === 1 ? RES * ROW + k : e === 2 ? k * ROW : k * ROW + RES;
        const dst = GRIDV + e * ROW + k;
        pos[dst * 3] = pos[src * 3];
        pos[dst * 3 + 1] = pos[src * 3 + 1] - depth;
        pos[dst * 3 + 2] = pos[src * 3 + 2];
        morph[dst * 2] = morph[src * 2] - depth;
        morph[dst * 2 + 1] = size;
        for (let c = 0; c < 3; c++) { nrm[dst * 3 + c] = nrm[src * 3 + c]; mnrm[dst * 3 + c] = mnrm[src * 3 + c]; }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true));
    geo.setAttribute('aMorph', new THREE.BufferAttribute(morph, 2));
    geo.setAttribute('aMorphN', new THREE.BufferAttribute(mnrm, 3, true));
    geo.setIndex(this.index);
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-size / 2, minY - depth, -size / 2), new THREE.Vector3(size / 2, maxY, size / 2));
    geo.boundingSphere = new THREE.Sphere();
    geo.boundingBox.getBoundingSphere(geo.boundingSphere);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(cx, 0, cz);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.receiveShadow = true;
    mesh.visible = false;
    mesh.frustumCulled = false; // we cull per node ourselves
    this.group.add(mesh);
    const node = { mesh, used: this.frame, level, minY, maxY, x0, z0, size };
    this.nodes.set(this.key(level, ix, iz), node);
    return node;
  }

  // Build the coarse levels up front so there is always something to draw.
  init(levels = 3) {
    for (let l = 0; l < levels; l++) {
      const n = 1 << l;
      for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) this.createNode(l, ix, iz);
    }
  }

  nodeBounds(level, ix, iz) {
    const size = SIZE / (1 << level);
    const x0 = -HALF + ix * size, z0 = -HALF + iz * size;
    const n = this.nodes.get(this.key(level, ix, iz));
    let y0, y1;
    if (n) { y0 = n.minY - 4; y1 = n.maxY + 4; } else { this.world.nodeRange(x0, z0, size, _range); y0 = _range[0]; y1 = _range[1]; }
    this.box.min.set(x0, y0, z0);
    this.box.max.set(x0 + size, y1, z0 + size);
    return size;
  }

  // Returns how many nodes are still waiting to be built.
  update(camera, budgetMs) {
    this.frame++;
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const m of this.visible) m.visible = false;
    this.visible.length = 0;
    for (const r of this.requests) this.reqPool.push(r);
    this.requests.length = 0;
    this.cam = camera.position;
    this.visit(0, 0, 0);
    // Build missing nodes: coarse first, then nearest, within a time budget
    const reqs = this.requests;
    if (reqs.length > 1) reqs.sort((a, b) => a.level - b.level || a.d - b.d);
    const limit = budgetMs || this.budgetMs;
    const t0 = performance.now();
    let built = 0;
    for (const r of reqs) {
      if (built > 0 && performance.now() - t0 > limit) break;
      if (!this.nodes.has(r.key)) { this.createNode(r.level, r.ix, r.iz); built++; }
    }
    if (this.frame % 120 === 0 && this.nodes.size > this.maxNodes) this.evict();
    return reqs.length - built;
  }

  visit(level, ix, iz) {
    const size = this.nodeBounds(level, ix, iz);
    if (!this.frustum.intersectsBox(this.box)) return;
    const d = this.box.distanceToPoint(this.cam);
    if (level < MAX_LEVEL && d < size * this.splitK) {
      const l = level + 1;
      let ready = true;
      for (let c = 0; c < 4; c++) {
        const cx = ix * 2 + (c & 1), cz = iz * 2 + (c >> 1);
        const k = this.key(l, cx, cz);
        if (this.nodes.has(k)) continue;
        this.nodeBounds(l, cx, cz);
        if (!this.frustum.intersectsBox(this.box)) continue;
        ready = false;
        const r = this.reqPool.pop() || {};
        r.key = k; r.level = l; r.ix = cx; r.iz = cz; r.d = d;
        this.requests.push(r);
      }
      if (ready) {
        for (let c = 0; c < 4; c++) this.visit(l, ix * 2 + (c & 1), iz * 2 + (c >> 1));
        return;
      }
    }
    let node = this.nodes.get(this.key(level, ix, iz));
    if (!node) node = this.createNode(level, ix, iz);
    node.mesh.visible = true;
    node.used = this.frame;
    this.visible.push(node.mesh);
  }

  evict() {
    const arr = [];
    for (const [k, n] of this.nodes) if (n.level >= 3 && n.used < this.frame - 60) arr.push([k, n]);
    arr.sort((a, b) => a[1].used - b[1].used);
    const remove = this.nodes.size - Math.floor(this.maxNodes * 0.75);
    for (let i = 0; i < remove && i < arr.length; i++) {
      const [k, n] = arr[i];
      this.group.remove(n.mesh);
      n.mesh.geometry.setIndex(null);
      n.mesh.geometry.dispose();
      this.nodes.delete(k);
    }
  }
}
