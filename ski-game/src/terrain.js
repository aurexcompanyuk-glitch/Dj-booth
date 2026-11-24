// Quadtree level-of-detail terrain with crack-hiding skirts and a snow / rock / corduroy shader.
import * as THREE from 'three';
import { HALF, SIZE, DN, DRES } from './world.js';

const RES = 32;                       // quads per node side
const ROW = RES + 1;
const GRIDV = ROW * ROW;
const SKIRTV = ROW * 4;
const MAX_LEVEL = 7;                  // 4096 / 2^7 = 32 m leaf nodes (1 m vertex spacing)

function buildIndex() {
  const idx = [];
  for (let j = 0; j < RES; j++) {
    for (let i = 0; i < RES; i++) {
      const a = j * ROW + i, b = a + 1, c = a + ROW, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Skirts: four edges, each edge vertex duplicated and pushed down. Both windings.
  const edges = [
    (k) => k,                       // z = z0 edge (j = 0)
    (k) => RES * ROW + k,           // z = z1 edge
    (k) => k * ROW,                 // x = x0 edge
    (k) => k * ROW + RES,           // x = x1 edge
  ];
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

const NOISE_GLSL = /* glsl */ `
float tHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float tNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1.0, 0.0)), u.x), mix(tHash(i + vec2(0.0, 1.0)), tHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Triplanar value noise: blends three planar samples by the surface normal (no streaks on cliffs)
float tTri(vec3 p, vec3 w, float f, float o) {
  float r = tNoise(p.xz * f + o) * w.y;
  if (w.x > 0.01) r += tNoise(p.zy * f + o) * w.x;
  if (w.z > 0.01) r += tNoise(p.xy * f + o) * w.z;
  return r;
}
`;

export function createTerrainMaterial(maskTexture, sunDir, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
  const uniforms = {
    uMask: { value: maskTexture },
    uTreeFar: { value: opts.treeFar || 900 },
    uSunDir: { value: sunDir },
    uDetail: { value: opts.detail === undefined ? 1 : opts.detail },
  };
  mat.userData.uniforms = uniforms;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWN = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos;
varying vec3 vWN;
uniform sampler2D uMask;
uniform float uTreeFar;
uniform vec3 uSunDir;
uniform float uDetail;
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
// wind-blown sastrugi tint off-piste, cleaner groomed snow on-piste
tSnow *= 1.0 - 0.035 * (1.0 - tPiste) * smoothstep(0.45, 0.8, tNoise(vWPos.xz * vec2(0.18, 0.05)));
float tCord = 0.5 + 0.5 * sin(dot(vWPos.xz, vec2(-tDir.y, tDir.x)) * 12.0);
float tCordF = tPiste * (1.0 - smoothstep(10.0, 42.0, tCam)) * uDetail;
tSnow *= 1.0 - 0.06 * tCordF * tCord;
// grooming lanes visible from further away
tSnow *= 1.0 - 0.025 * tPiste * smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(dot(vWPos.xz, vec2(-tDir.y, tDir.x)) * 0.9 + tA * 3.0));
float tRock = smoothstep(0.40, 0.56, tSlope + (tA - 0.5) * 0.18);
float tStrata = tNoise(vec2(vWPos.y * 0.45 + tA * 3.0, 0.5));
vec3 tRockCol = mix(vec3(0.17, 0.16, 0.16), vec3(0.40, 0.38, 0.36), tStrata * 0.55 + tTri(vWPos, tW3, 0.21, 5.0) * 0.45);
tRockCol *= 0.72 + 0.4 * tB;
// snow caught on rock ledges
tRock *= 1.0 - 0.6 * smoothstep(0.62, 0.8, tTri(vWPos, tW3, 0.9, 3.1)) * smoothstep(0.75, 0.45, tSlope);
vec3 tCol = mix(tSnow, tRockCol, tRock);
float tFar = smoothstep(uTreeFar * 0.62, uTreeFar, tCam);
tCol *= 1.0 - tForest * 0.09 * (1.0 - tFar);
// distant forest canopy: dark conifers with snow-dusted crowns
float tCanopy = tNoise(vWPos.xz * 0.35) * 0.6 + tNoise(vWPos.xz * 1.3) * 0.4;
vec3 tForestCol = mix(vec3(0.035, 0.075, 0.055), vec3(0.55, 0.62, 0.66), smoothstep(0.55, 0.85, tCanopy) * 0.55);
float tPatch = smoothstep(0.4, 0.5, tForest + (tNoise(vWPos.xz * 0.018) - 0.5) * 0.3);
tCol = mix(tCol, tForestCol, tFar * tPatch);
diffuseColor.rgb *= tCol;
float tSnowAmt = (1.0 - tRock) * (1.0 - tFar * tPatch);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(0.96, 0.74, tSnowAmt);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float tFade = (1.0 - smoothstep(25.0, 140.0, tCam)) * uDetail * (1.0 - smoothstep(0.25, 0.5, tSlope));
  vec2 q = vWPos.xz;
  float e = 0.2;
  float n0 = tNoise(q * 0.9), nx = tNoise((q + vec2(e, 0.0)) * 0.9), nz = tNoise((q + vec2(0.0, e)) * 0.9);
  float m0 = tNoise(q * 0.16), mx = tNoise((q + vec2(e * 4.0, 0.0)) * 0.16), mz = tNoise((q + vec2(0.0, e * 4.0)) * 0.16);
  vec3 tBump = vec3(n0 - nx, 0.0, n0 - nz) * 1.1 * tFade + vec3(m0 - mx, 0.0, m0 - mz) * 0.8 * (1.0 - smoothstep(0.3, 0.55, tSlope));
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
  tSp *= (1.0 - smoothstep(5.0, 32.0, tCam)) * tSnowAmt * uDetail;
  totalEmissiveRadiance += vec3(tSp * 2.4);
}`);
  };
  mat.customProgramCacheKey = () => 'terrain-v1';
  return mat;
}

export class Terrain {
  constructor(world, material, opts = {}) {
    this.world = world;
    this.material = material;
    this.group = new THREE.Group();
    this.group.name = 'terrain';
    this.nodes = new Map();
    this.splitK = opts.splitK || 2.4;
    this.budget = opts.budget || 4;
    this.maxNodes = opts.maxNodes || 1100;
    this.index = buildIndex();
    this.frame = 0;
    this.visible = [];
    this.requests = [];
    this.box = new THREE.Box3();
    this.frustum = new THREE.Frustum();
    this.pm = new THREE.Matrix4();
    this.heights = new Float32Array((RES + 3) * (RES + 3));
    this.castShadow = !!opts.castShadow;
  }

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
    const pos = new Float32Array((GRIDV + SKIRTV) * 3);
    const nrm = new Float32Array((GRIDV + SKIRTV) * 3);
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
        nrm[k * 3] = nx / l; nrm[k * 3 + 1] = ny / l; nrm[k * 3 + 2] = nz / l;
        if (hc < minY) minY = hc;
        if (hc > maxY) maxY = hc;
      }
    }
    const depth = step * 1.6 + 2.5;
    const edgeVert = [
      (k) => k, (k) => RES * ROW + k, (k) => k * ROW, (k) => k * ROW + RES,
    ];
    for (let e = 0; e < 4; e++) {
      for (let k = 0; k <= RES; k++) {
        const src = edgeVert[e](k), dst = GRIDV + e * ROW + k;
        pos[dst * 3] = pos[src * 3];
        pos[dst * 3 + 1] = pos[src * 3 + 1] - depth;
        pos[dst * 3 + 2] = pos[src * 3 + 2];
        nrm[dst * 3] = nrm[src * 3]; nrm[dst * 3 + 1] = nrm[src * 3 + 1]; nrm[dst * 3 + 2] = nrm[src * 3 + 2];
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    geo.setIndex(this.index);
    geo.boundingBox = new THREE.Box3(new THREE.Vector3(-size / 2, minY - depth, -size / 2), new THREE.Vector3(size / 2, maxY, size / 2));
    geo.boundingSphere = new THREE.Sphere();
    geo.boundingBox.getBoundingSphere(geo.boundingSphere);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.position.set(cx, 0, cz);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.receiveShadow = true;
    mesh.castShadow = this.castShadow && level >= 5;
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
    if (n) { y0 = n.minY - 5; y1 = n.maxY + 5; } else { const r = this.world.nodeRange(x0, z0, size); y0 = r[0]; y1 = r[1]; }
    this.box.min.set(x0, y0, z0);
    this.box.max.set(x0 + size, y1, z0 + size);
    return size;
  }

  update(camera, budgetOverride) {
    this.frame++;
    camera.updateMatrixWorld();
    this.pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.pm);
    for (const m of this.visible) m.visible = false;
    this.visible.length = 0;
    this.requests.length = 0;
    this.cam = camera.position;
    this.visit(0, 0, 0);
    // Build missing nodes: coarse first, then nearest
    this.requests.sort((a, b) => a.level - b.level || a.d - b.d);
    const budget = budgetOverride || this.budget;
    const t0 = performance.now();
    let built = 0;
    for (const r of this.requests) {
      if (built >= budget || (built > 0 && performance.now() - t0 > (budgetOverride ? 200 : 7))) break;
      if (!this.nodes.has(r.key)) { this.createNode(r.level, r.ix, r.iz); built++; }
    }
    if (this.frame % 90 === 0 && this.nodes.size > this.maxNodes) this.evict();
    return this.requests.length - built;
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
        this.requests.push({ key: k, level: l, ix: cx, iz: cz, d });
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
    const arr = [...this.nodes.entries()].filter(([, n]) => n.level >= 3 && n.used < this.frame - 30);
    arr.sort((a, b) => a[1].used - b[1].used);
    const remove = this.nodes.size - Math.floor(this.maxNodes * 0.8);
    for (let i = 0; i < remove && i < arr.length; i++) {
      const [k, n] = arr[i];
      this.group.remove(n.mesh);
      n.mesh.geometry.setIndex(null);
      n.mesh.geometry.dispose();
      this.nodes.delete(k);
    }
  }
}
