// Procedural mountain: macro shape, ski runs, natural features, trees, rocks, wind.
// Pure data + math (no three.js) so it can also run under Node for tests.
import { Simplex2, mulberry32 } from './noise.js';
import { clamp, smooth01, smoothstep } from './util.js';

export const HALF = 2048;
export const SIZE = 4096;
export const GRES = 4;                 // coarse height grid spacing (m)
export const GN = SIZE / GRES + 1;     // 1025 samples per side
export const DRES = 8;                 // run-distance field spacing (m)
export const DN = SIZE / DRES + 1;     // 513
const FCELL = 32, FN = SIZE / FCELL;   // feature spatial hash
const CCELL = 16, CN = SIZE / CCELL;   // collider spatial hash
export const VALLEY_Z = 1380;
export const LIFT_X = 40;
export const LODGE = { x: -40, z: 1575 };

export const DIFF = {
  blue: { label: 'Intermediate', short: 'BLUE', color: '#2f80ff' },
  red: { label: 'Advanced', short: 'RED', color: '#ff3d3d' },
  black: { label: 'Expert', short: 'BLACK', color: '#22232a' },
  double: { label: 'Double Black', short: '◆◆', color: '#000000' },
  park: { label: 'Terrain Park', short: 'PARK', color: '#ff9a00' },
  extreme: { label: 'Extreme', short: 'XTREME', color: '#9b3cff' },
};

// The slopes you can teleport to. x0 = where the run leaves the summit ridge.
export const RUNS = [
  { id: 'glacier', name: 'Glacier Highway', diff: 'red', x0: -1420, width: 215, startOff: 30,
    wig: [[50, 0.0019, 0.6], [18, 0.0051, 1.9]],
    desc: 'Long, fast and wide. Endless rolling natural jumps all the way down.',
    tags: ['Rollers', 'Speed', 'Wide'] },
  { id: 'eagle', name: 'Eagle Cliffs', diff: 'black', x0: -1000, width: 185, startOff: 28,
    wig: [[50, 0.0019, 0.9], [20, 0.0047, 0.3]],
    desc: 'Stacked cliff bands from 6 m to 32 m. Pick your line and send it.',
    tags: ['Cliffs', 'Big drops', 'Steep'] },
  { id: 'pillow', name: 'Pillow Fields', diff: 'black', x0: -590, width: 205, startOff: 28,
    wig: [[48, 0.0019, 1.2], [16, 0.0057, 2.4]],
    desc: 'Cascading pillow lines and step-downs. Natural jumps everywhere.',
    tags: ['Pillows', 'Step-downs', 'Natural jumps'] },
  { id: 'summit', name: 'Summit Express', diff: 'blue', x0: -190, width: 240, startOff: 26,
    wig: [[34, 0.0019, 1.5], [10, 0.006, 0.8]],
    desc: 'The widest groomer from the highest peak. Rollers and side hits.',
    tags: ['Wide', 'Groomed', 'Side hits'] },
  { id: 'park', name: 'Kicker Alley', diff: 'park', x0: 240, width: 175, startOff: 26,
    wig: [[30, 0.0019, 1.8], [10, 0.0055, 2.2]],
    desc: 'Three lanes of kickers from small to XL, plus the Monster at the bottom.',
    tags: ['Kickers', 'Big air', 'Tricks'] },
  { id: 'wall', name: 'The Wall', diff: 'double', x0: 650, width: 225, startOff: 26,
    wig: [[42, 0.0019, 2.1], [14, 0.005, 0.4]],
    desc: 'Three 45°+ faces. Pure speed and steepness.',
    tags: ['45° steeps', 'Speed', 'Rollers'] },
  { id: 'bowl', name: 'Windlip Bowl', diff: 'black', x0: 1040, width: 265, startOff: 6,
    wig: [[40, 0.0019, 2.4], [16, 0.0052, 1.4]],
    desc: 'Drop the cornice into a huge bowl full of wind lips.',
    tags: ['Cornice', 'Bowl', 'Wind lips'] },
  { id: 'sky', name: 'Sky Launch', diff: 'extreme', x0: 1430, width: 205, startOff: 10,
    wig: [[40, 0.0019, 2.7], [14, 0.0049, 0.2]],
    desc: 'A 75 m summit cliff. Deploy the paraglider and ride the thermals.',
    tags: ['75 m cliff', 'Paraglide', 'Thermals'] },
];

export function ridgeZ(x) {
  return -1350 + 90 * Math.sin(x * 0.0021 + 1.3) + 55 * Math.sin(x * 0.0053 + 0.4);
}
function gauss(x, c, w) { const d = (x - c) / w; return Math.exp(-d * d); }
export function peakH(x) {
  return 1150 + 360 * gauss(x, 150, 520) + 190 * gauss(x, -1050, 420) + 230 * gauss(x, 1300, 360)
    - 80 * gauss(x, -480, 260) + 70 * gauss(x, 650, 220);
}

export const FT = { KICKER: 0, ROLLER: 1, STEP: 2, KNOLL: 3 };

function makeFeature(type, x, z, dx, dz, p) {
  const l = Math.hypot(dx, dz) || 1;
  const f = Object.assign({ type, cx: x, cz: z, dx: dx / l, dz: dz / l, vHalf: 10, vFall: 4 }, p);
  switch (type) {
    case FT.KICKER: f.uMin = -f.L; f.uMax = f.B; break;
    case FT.ROLLER: f.uMin = -f.Lu; f.uMax = f.Ld + (f.drop > 0 ? f.Rb : 0); break;
    case FT.STEP: {
      if (f.up === undefined) f.up = f.cliff ? 0.35 : 0.5;
      const w = (f.wig || 0) * 1.6;
      f.uMin = -f.F - f.Ra - w; f.uMax = f.F + f.Rb + w; break;
    }
    case FT.KNOLL: f.uMin = -f.Ru; f.uMax = f.Ru * 0.65; f.vHalf = f.Rv; f.vFall = 0; break;
  }
  f.vLim = f.vHalf + f.vFall;
  return f;
}

function evalFeature(f, x, z) {
  const rx = x - f.cx, rz = z - f.cz;
  const u = rx * f.dx + rz * f.dz;
  if (u < f.uMin || u > f.uMax) return 0;
  const v = rz * f.dx - rx * f.dz;
  const av = v < 0 ? -v : v;
  if (av > f.vLim) return 0;
  let wv = 1;
  if (av > f.vHalf) wv = 1 - smooth01((av - f.vHalf) / f.vFall);
  switch (f.type) {
    case 0: { // KICKER: parabolic ramp, sharp lip, short back face
      let y;
      if (u < 0) { const q = (u + f.L) / f.L; y = f.H * q * q; }
      else { const q = 1 - u / f.B; y = f.H * q * q; }
      return y * wv;
    }
    case 1: { // ROLLER: smooth crest, optional drop after it (wind lips, pillows, step-downs)
      let y;
      if (u < 0) y = f.A * (0.5 + 0.5 * Math.cos(Math.PI * u / f.Lu));
      else if (u < f.Ld) y = (f.A + f.drop) * (0.5 + 0.5 * Math.cos(Math.PI * u / f.Ld)) - f.drop;
      else y = -f.drop * (1 - smooth01((u - f.Ld) / f.Rb));
      return y * wv;
    }
    case 2: { // STEP: cliff band / steep wall with a flattened approach and recovering landing
      let ue = u;
      if (f.wig) ue += f.wig * (Math.sin(v * f.wf + f.wp) + 0.5 * Math.sin(v * f.wf * 2.71 + 1.3));
      const D = f.D * wv;
      const up = f.up;
      if (ue < -f.F) return up * D * smooth01((ue + f.F + f.Ra) / f.Ra);
      if (ue < f.F) {
        const q = (ue + f.F) / (2 * f.F);
        // Rounded lip, near-vertical face, small apron
        const s = f.cliff ? (q < 0.12 ? 0.5 * (q / 0.12) * (q / 0.12) * 0.12 : q < 0.88 ? q : 1 - 0.5 * ((1 - q) / 0.12) * ((1 - q) / 0.12) * 0.12) : smooth01(q);
        return D * (up - s);
      }
      return -(1 - up) * D * (1 - smooth01((ue - f.F) / f.Rb));
    }
    case 3: { // KNOLL: rounded mound, steeper on the downhill side
      const qu = u < 0 ? u / f.Ru : u / (f.Ru * 0.65);
      const qv = v / f.Rv;
      const r2 = qu * qu + qv * qv;
      if (r2 >= 1) return 0;
      return f.A * (0.5 + 0.5 * Math.cos(Math.PI * Math.sqrt(r2)));
    }
  }
  return 0;
}

export class World {
  constructor(seed = 20261124) {
    this.seed = seed;
    this.nz = {};
    'abcdefgh'.split('').forEach((k, i) => { this.nz[k] = new Simplex2(seed * 7 + i * 101); });
    this.runs = RUNS.map((r) => ({ ...r }));
    this.bowls = [];
    this.features = [];
    this.thermals = [];
    this.ready = false;
  }

  // ---------------------------------------------------------------- generation
  async generate(onProgress = () => {}) {
    const yieldUI = () => new Promise((r) => setTimeout(r, 0));
    const report = async (p, label) => { onProgress(p, label); await yieldUI(); };

    await report(0.02, 'Surveying the mountain');
    for (const run of this.runs) this.buildPath(run);
    const bowlRun = this.runs.find((r) => r.id === 'bowl');
    this.bowls.push({ x: bowlRun.x0, z: ridgeZ(bowlRun.x0) + 230, r: 330, depth: 62 });

    await report(0.05, 'Laying out the slopes');
    this.buildDistanceField();

    this.grid = new Float32Array(GN * GN);
    for (let j = 0; j < GN; j++) {
      const z = -HALF + j * GRES;
      for (let i = 0; i < GN; i++) this.grid[j * GN + i] = this.genHeight(-HALF + i * GRES, z);
      if ((j & 31) === 31) await report(0.06 + 0.6 * (j / GN), 'Shaping the terrain');
    }

    await report(0.67, 'Building cliffs, kickers and rollers');
    this.buildFeatures();
    this.buildPyramid();

    await report(0.75, 'Planting forests');
    this.buildMaskAndTrees();
    await report(0.9, 'Placing rocks and markers');
    this.buildRocks();
    this.buildColliders();
    this.buildMarkers();
    this.buildThermals();
    this.computeRunStats();
    this.ready = true;
    await report(1, 'Ready');
  }

  buildPath(run) {
    const zs = ridgeZ(run.x0) + run.startOff;
    const ze = VALLEY_Z + 70;
    const pts = [];
    let s = 0, px = 0, pz = 0;
    for (let z = zs; z <= ze + 0.01; z += 10) {
      const k = smoothstep(zs, zs + 380, z);
      let x = run.x0;
      for (const w of run.wig) x += k * w[0] * Math.sin((z - zs) * w[1] + w[2]);
      if (pts.length) s += Math.hypot(x - px, z - pz);
      pts.push({ x, z, s, dx: 0, dz: 1 });
      px = x; pz = z;
    }
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
      pts[i].dx = dx / l; pts[i].dz = dz / l;
    }
    run.path = pts;
    run.length = s;
  }

  // Point on a run centerline at arc length s with lateral offset v (+v = run's left, i.e. +x when heading +z).
  runPoint(run, s, v = 0) {
    const pts = run.path;
    s = clamp(s, 0, run.length);
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].s <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi];
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    const dx = a.dx + (b.dx - a.dx) * t, dz = a.dz + (b.dz - a.dz) * t;
    const l = Math.hypot(dx, dz);
    const ndx = dx / l, ndz = dz / l;
    // lateral unit vector (left of travel): (dz, -dx) rotated... left of +z travel is +x
    const lx = ndz, lz = -ndx;
    return { x: a.x + (b.x - a.x) * t + lx * v, z: a.z + (b.z - a.z) * t + lz * v, dx: ndx, dz: ndz };
  }

  buildDistanceField() {
    const n = DN * DN;
    this.dfEdge = new Float32Array(n).fill(9999);
    this.dfRun = new Int8Array(n).fill(-1);
    this.dfS = new Float32Array(n);
    this.dfDx = new Float32Array(n);
    this.dfDz = new Float32Array(n).fill(1);
    const R = 240;
    this.runs.forEach((run, ri) => {
      const pts = run.path, hw = run.width / 2;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const minx = Math.min(a.x, b.x) - hw - R, maxx = Math.max(a.x, b.x) + hw + R;
        const minz = Math.min(a.z, b.z) - hw - R, maxz = Math.max(a.z, b.z) + hw + R;
        const i0 = clamp(Math.floor((minx + HALF) / DRES), 0, DN - 1), i1 = clamp(Math.ceil((maxx + HALF) / DRES), 0, DN - 1);
        const j0 = clamp(Math.floor((minz + HALF) / DRES), 0, DN - 1), j1 = clamp(Math.ceil((maxz + HALF) / DRES), 0, DN - 1);
        const ex = b.x - a.x, ez = b.z - a.z, el2 = ex * ex + ez * ez, el = Math.sqrt(el2);
        for (let j = j0; j <= j1; j++) {
          const z = -HALF + j * DRES;
          for (let ii = i0; ii <= i1; ii++) {
            const x = -HALF + ii * DRES;
            let t = ((x - a.x) * ex + (z - a.z) * ez) / el2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = a.x + ex * t - x, qz = a.z + ez * t - z;
            const d = Math.sqrt(qx * qx + qz * qz) - hw;
            const idx = j * DN + ii;
            if (d < this.dfEdge[idx]) {
              this.dfEdge[idx] = d; this.dfRun[idx] = ri; this.dfS[idx] = a.s + t * el;
              this.dfDx[idx] = ex / el; this.dfDz[idx] = ez / el;
            }
          }
        }
      }
    });
  }

  sampleDF(arr, x, z) {
    let gx = (x + HALF) / DRES, gz = (z + HALF) / DRES;
    gx = clamp(gx, 0, DN - 1.001); gz = clamp(gz, 0, DN - 1.001);
    const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz;
    const i = iz * DN + ix;
    const a = arr[i], b = arr[i + 1], c = arr[i + DN], d = arr[i + DN + 1];
    return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
  }

  dfIndex(x, z) {
    const ix = clamp(Math.round((x + HALF) / DRES), 0, DN - 1);
    const iz = clamp(Math.round((z + HALF) / DRES), 0, DN - 1);
    return iz * DN + ix;
  }

  genHeight(x, z) {
    const N = this.nz;
    const rz = ridgeZ(x);
    const P = peakH(x);
    let h, tDown;
    if (z >= rz) {
      const t = (z - rz) / (VALLEY_Z - rz);
      tDown = t;
      h = t < 1 ? P * Math.pow(1 - t, 1.45) : 0;
    } else {
      tDown = 0;
      h = P * (1 - 0.62 * smooth01((rz - z) / 520));
    }
    // Enclosing mountains on all sides
    const ax = Math.abs(x);
    const wx = smoothstep(1660, 2048, ax);
    const ws = smoothstep(1740, 2048, z);
    const wn = smoothstep(-1840, -2048, z);
    if (wx > 0 || ws > 0 || wn > 0) {
      // irregular ridged peaks rather than a uniform rim
      const rr = N.d.ridged(x * 0.0019 + 3.3, z * 0.0023 - 1.7, 4);
      const amp = 130 + 340 * rr * (0.75 + 0.35 * N.a.noise(x * 0.0011, z * 0.0011));
      h += Math.max(wx, ws, wn) * amp;
    }

    const ed = this.sampleDF(this.dfEdge, x, z);
    const m = 1 - smoothstep(-6, 18, ed);
    const qx = x + 60 * N.b.noise(x * 0.0011, z * 0.0011);
    const qz = z + 60 * N.b.noise(x * 0.0011 + 37.2, z * 0.0011 - 12.9);
    h += 40 * clamp(1.15 - tDown, 0.22, 1) * N.c.fbm(qx * 0.0011, qz * 0.0011, 3);
    const alpine = smoothstep(0.45, 0.03, tDown) * (z >= rz - 40 ? 1 : 0.6);
    if (alpine > 0.001) h += alpine * (1 - 0.82 * m) * 58 * (N.d.ridged(qx * 0.0032, qz * 0.0032, 4) - 0.3);
    h += (1 - 0.82 * m) * 7.5 * N.e.fbm(qx * 0.012, qz * 0.012, 3);
    h += (1 - 0.75 * m) * 1.7 * N.f.fbm(x * 0.05, z * 0.05, 2);
    // Forested spurs between the runs, so every slope sits in a wide natural gully
    if (tDown > 0 && tDown < 1.05) {
      const spurW = Math.pow(Math.sin(Math.PI * clamp(tDown * 1.02, 0, 1)), 0.6);
      const sv = 0.55 + 0.45 * N.c.noise(x * 0.0026 + 5.3, z * 0.0019) + 0.2 * N.d.noise(x * 0.009, z * 0.009);
      h += 46 * smoothstep(12, 190, ed) * spurW * sv;
    }
    for (const b of this.bowls) {
      const dx = x - b.x, dz = z - b.z;
      const q2 = (dx * dx + dz * dz) / (b.r * b.r);
      if (q2 < 1) { const q = 1 - q2; h -= b.depth * q * q; }
    }
    return h;
  }

  // ---------------------------------------------------------------- features
  buildFeatures() {
    const rng = mulberry32(this.seed ^ 0x5eed);
    const R = (a, b) => a + (b - a) * rng();
    const feats = this.features;
    const add = (type, run, s, v, p, rot = 0) => {
      const pt = this.runPoint(run, s, v);
      const c = Math.cos(rot), sn = Math.sin(rot);
      const dx = pt.dx * c - pt.dz * sn, dz = pt.dx * sn + pt.dz * c;
      const f = makeFeature(type, pt.x, pt.z, dx, dz, p);
      f.run = run.id;
      feats.push(f);
      return f;
    };
    const roller = (run, s, v, A, Lu, Ld, drop, Rb, vHalf, vFall, rot = 0) =>
      add(FT.ROLLER, run, s, v, { A, Lu, Ld, drop, Rb, vHalf, vFall }, rot);
    const knoll = (run, s, v, A, Ru, Rv, rot = 0) => add(FT.KNOLL, run, s, v, { A, Ru, Rv }, rot);
    const cliff = (run, s, v, D, vHalf, opts = {}) => add(FT.STEP, run, s, v, Object.assign({
      D, F: 0.9 + D * 0.035, Ra: 26 + D * 1.3, Rb: 40 + D * 3.6, vHalf, vFall: 18,
      wig: 2.4, wf: 0.075 + rng() * 0.04, wp: rng() * 6, cliff: true,
    }, opts));
    const kicker = (run, s, v, size) => {
      const K = [
        { H: 1.4, L: 6.5, W: 3.5 }, { H: 2.3, L: 9.5, W: 4.5 }, { H: 3.3, L: 12.5, W: 5.5 },
        { H: 4.6, L: 16.5, W: 6.5 }, { H: 7.0, L: 24, W: 9 },
      ][size];
      return add(FT.KICKER, run, s, v, { H: K.H, L: K.L, B: K.L * 0.38, vHalf: K.W, vFall: 1.8, size });
    };

    for (const run of this.runs) {
      const W = run.width, L = run.length, hw = W / 2;
      switch (run.id) {
        case 'glacier': {
          let side = 1;
          for (let s = 150; s < L - 180; s += R(55, 95)) {
            const big = rng() < 0.33;
            roller(run, s, R(-15, 15), big ? R(3.0, 4.6) : R(1.5, 2.6), R(14, 22), big ? R(6, 8) : R(8, 12),
              big ? R(1.2, 3.0) : 0, 22, hw - 12, 22, R(-0.22, 0.22));
            if (rng() < 0.5) { knoll(run, s + R(20, 40), side * (hw - 24), R(2.2, 3.4), R(9, 12), R(6, 8)); side = -side; }
          }
          break;
        }
        case 'eagle': {
          const C = [[230, 7, -32, 40], [430, 10, 34, 44], [650, 14, -22, 48], [890, 19, 28, 52], [1130, 26, -34, 48],
            [1390, 12, 12, 64], [1640, 32, -26, 54], [1910, 17, 30, 48], [2160, 9, -6, 72], [2370, 6, 20, 70]];
          for (const [s, D, v, vh] of C) {
            if (s > L - 120) continue;
            cliff(run, s, v, D, vh);
            knoll(run, s + R(60, 110), -Math.sign(v) * R(30, 60), R(2, 3.2), R(9, 13), R(6, 9));
            if (rng() < 0.6) roller(run, s - R(70, 100), R(-20, 20), R(1.4, 2.4), 14, 8, 0, 0, hw - 20, 18);
          }
          break;
        }
        case 'pillow': {
          for (let s0 = 170; s0 < L - 220; s0 += R(190, 240)) {
            for (const lane of [-62, 0, 62]) {
              const n = 4 + Math.floor(rng() * 3);
              let s = s0 + R(-20, 25), v = lane + R(-10, 10);
              for (let k = 0; k < n; k++) {
                roller(run, s, v, R(1.0, 1.7), R(4.5, 6.5), R(2.4, 3.2), R(2.0, 3.5), R(8, 11), R(4, 7), 3, R(-0.25, 0.25));
                s += R(13, 18); v += R(-6, 6);
              }
            }
            // a full-width step-down between pillow groups
            roller(run, s0 + 150, 0, R(0.8, 1.4), 8, 3, R(3.5, 5.5), 22, hw - 25, 20, R(-0.15, 0.15));
          }
          break;
        }
        case 'summit': {
          let side = 1;
          for (let s = 160; s < L - 200; s += R(100, 150)) {
            roller(run, s, R(-20, 20), R(1.0, 2.1), R(16, 24), R(9, 13), 0, 0, hw - 14, 24, R(-0.15, 0.15));
            knoll(run, s + R(40, 70), side * (hw - 22), R(2.2, 3.3), R(9, 12), R(6, 8));
            side = -side;
          }
          for (const s of [640, 1260, 1880]) if (s < L - 200) roller(run, s, R(-25, 25), 2.3, 9, 3.6, 1.2, 10, 10, 4);
          break;
        }
        case 'park': {
          const sizes = { left: [0, 1, 0, 1], mid: [2, 3, 2, 3], right: [1, 2, 1, 2] };
          let k = 0;
          for (let s = 260; s < L - 480; s += 150, k++) {
            kicker(run, s, 52, sizes.left[k % 4]);
            kicker(run, s + 20, 0, sizes.mid[k % 4]);
            kicker(run, s + 10, -52, sizes.right[k % 4]);
            if (k % 2 === 1) roller(run, s + 85, 0, 1.4, 14, 9, 0, 0, hw - 15, 18);
          }
          kicker(run, L - 360, 0, 4);
          kicker(run, L - 340, 55, 2);
          kicker(run, L - 340, -55, 2);
          break;
        }
        case 'wall': {
          const S = [[300, 80], [1080, 92], [1780, 62]];
          for (const [s, D] of S) {
            if (s > L - 300) continue;
            add(FT.STEP, run, s, 0, { D, F: D * 1.6, Ra: 180, Rb: 260, vHalf: hw + 40, vFall: 70, wig: 5, wf: 0.02, wp: rng() * 6, cliff: false });
          }
          for (const s of [640, 760, 1460, 1580, 2160, 2300]) if (s < L - 200) roller(run, s, R(-20, 20), R(2.4, 3.8), R(15, 20), R(6.5, 8), R(0.5, 2), 18, hw - 10, 25, R(-0.2, 0.2));
          break;
        }
        case 'bowl': {
          roller(run, 22, 0, 1.2, 5, 2.2, 6, 30, hw + 30, 40);
          for (let i = 0; i < 16; i++) {
            const s = R(110, L - 300);
            const rot = (rng() < 0.5 ? -1 : 1) * R(0.5, 0.95);
            roller(run, s, R(-hw + 30, hw - 30), R(1.2, 2.2), R(10, 14), R(2, 3), R(1.5, 3.5), 12, R(18, 34), 8, rot);
          }
          for (let i = 0; i < 9; i++) knoll(run, R(200, L - 250), R(-hw + 25, hw - 25), R(2, 3.4), R(9, 13), R(6, 9), R(-0.4, 0.4));
          break;
        }
        case 'sky': {
          add(FT.STEP, run, 125, 0, { D: 75, F: 7, Ra: 95, Rb: 420, up: 0.16, vHalf: hw + 25, vFall: 45, wig: 4, wf: 0.05, wp: 1.2, cliff: true });
          cliff(run, 820, -35, 32, 55, { F: 2.2, Ra: 60, Rb: 180 });
          cliff(run, 1500, 30, 21, 50, { F: 1.5, Ra: 46, Rb: 120 });
          for (const s of [620, 1120, 1300, 1750, 1950, 2150]) if (s < L - 200) roller(run, s, R(-25, 25), R(1.5, 2.6), R(8, 12), R(3, 4.5), R(3, 5.5), 22, hw - 20, 22, R(-0.25, 0.25));
          break;
        }
      }
    }

    // Off-piste: random cliff bands on the spurs and alpine zone
    for (let i = 0, tries = 0; i < 34 && tries < 600; tries++) {
      const x = R(-1600, 1600);
      const rz = ridgeZ(x);
      const z = rz + R(120, 1500);
      const ed = this.sampleDF(this.dfEdge, x, z);
      if (ed < 45) continue;
      const gx = this.heightBase(x + 8, z) - this.heightBase(x - 8, z);
      const gz = this.heightBase(x, z + 8) - this.heightBase(x, z - 8);
      if (Math.hypot(gx, gz) < 4) continue;
      const D = R(10, 34);
      const f = makeFeature(FT.STEP, x, z, -gx, -gz, {
        D, F: 0.9 + D * 0.035, Ra: 26 + D * 1.2, Rb: 40 + D * 3, vHalf: R(18, 40), vFall: 16,
        wig: 2.5, wf: 0.08, wp: R(0, 6), cliff: true,
      });
      f.run = null;
      feats.push(f);
      i++;
    }

    // Spatial hash
    this.fHash = new Array(FN * FN);
    feats.forEach((f, idx) => {
      let minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
      for (const u of [f.uMin, f.uMax]) for (const v of [-f.vLim, f.vLim]) {
        const x = f.cx + u * f.dx - v * f.dz, z = f.cz + u * f.dz + v * f.dx;
        minx = Math.min(minx, x); maxx = Math.max(maxx, x); minz = Math.min(minz, z); maxz = Math.max(maxz, z);
      }
      f.bbox = [minx, minz, maxx, maxz];
      const i0 = clamp(Math.floor((minx + HALF) / FCELL), 0, FN - 1), i1 = clamp(Math.floor((maxx + HALF) / FCELL), 0, FN - 1);
      const j0 = clamp(Math.floor((minz + HALF) / FCELL), 0, FN - 1), j1 = clamp(Math.floor((maxz + HALF) / FCELL), 0, FN - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const k = j * FN + i;
        (this.fHash[k] || (this.fHash[k] = [])).push(f);
      }
      f.index = idx;
    });
  }

  // ---------------------------------------------------------------- queries
  heightBase(x, z) {
    // Catmull-Rom bicubic sample of the coarse grid (C1 smooth -> stable physics)
    let gx = (x + HALF) / GRES, gz = (z + HALF) / GRES;
    if (gx < 1) gx = 1; else if (gx > GN - 2.001) gx = GN - 2.001;
    if (gz < 1) gz = 1; else if (gz > GN - 2.001) gz = GN - 2.001;
    const ix = gx | 0, iz = gz | 0;
    const tx = gx - ix, tz = gz - iz;
    const tx2 = tx * tx, tx3 = tx2 * tx, tz2 = tz * tz, tz3 = tz2 * tz;
    const ax0 = 0.5 * (-tx + 2 * tx2 - tx3), ax1 = 0.5 * (2 - 5 * tx2 + 3 * tx3);
    const ax2 = 0.5 * (tx + 4 * tx2 - 3 * tx3), ax3 = 0.5 * (-tx2 + tx3);
    const az0 = 0.5 * (-tz + 2 * tz2 - tz3), az1 = 0.5 * (2 - 5 * tz2 + 3 * tz3);
    const az2 = 0.5 * (tz + 4 * tz2 - 3 * tz3), az3 = 0.5 * (-tz2 + tz3);
    const g = this.grid;
    let base = (iz - 1) * GN + ix - 1;
    let r = 0;
    for (let k = 0; k < 4; k++) {
      const w = k === 0 ? az0 : k === 1 ? az1 : k === 2 ? az2 : az3;
      r += w * (ax0 * g[base] + ax1 * g[base + 1] + ax2 * g[base + 2] + ax3 * g[base + 3]);
      base += GN;
    }
    return r;
  }

  featureHeight(x, z) {
    const fi = ((x + HALF) / FCELL) | 0, fj = ((z + HALF) / FCELL) | 0;
    if (fi < 0 || fi >= FN || fj < 0 || fj >= FN) return 0;
    const list = this.fHash[fj * FN + fi];
    if (!list) return 0;
    let h = 0;
    for (let i = 0; i < list.length; i++) h += evalFeature(list[i], x, z);
    return h;
  }

  micro(x, z) {
    return 0.12 * this.nz.g.noise(x * 0.11, z * 0.11) + 0.045 * this.nz.h.noise(x * 0.37, z * 0.37);
  }

  height(x, z) {
    return this.heightBase(x, z) + this.featureHeight(x, z) + this.micro(x, z);
  }

  normal(x, z, out) {
    const e = 0.3;
    const nx = (this.height(x - e, z) - this.height(x + e, z)) / (2 * e);
    const nz = (this.height(x, z - e) - this.height(x, z + e)) / (2 * e);
    const l = Math.sqrt(nx * nx + 1 + nz * nz);
    out.x = nx / l; out.y = 1 / l; out.z = nz / l;
    return out;
  }

  edgeDist(x, z) { return this.sampleDF(this.dfEdge, x, z); }
  pisteMask(x, z) { return 1 - smoothstep(-6, 18, this.sampleDF(this.dfEdge, x, z)); }
  runAt(x, z) {
    const i = this.dfIndex(x, z);
    return { run: this.dfRun[i], s: this.dfS[i], edge: this.dfEdge[i] };
  }

  startPose(runIndex, s = 6) {
    const run = this.runs[runIndex];
    const p = this.runPoint(run, s, 0);
    return { x: p.x, y: this.height(p.x, p.z), z: p.z, heading: Math.atan2(p.dx, p.dz) };
  }

  // ---------------------------------------------------------------- LOD bounds
  buildPyramid() {
    // min/max of the base grid per 32 m cell, then reduced upward. Index by (level from leaf).
    const n0 = SIZE / 32;
    const levels = [];
    let mn = new Float32Array(n0 * n0), mx = new Float32Array(n0 * n0);
    for (let j = 0; j < n0; j++) for (let i = 0; i < n0; i++) {
      let lo = Infinity, hi = -Infinity;
      for (let b = 0; b <= 8; b++) for (let a = 0; a <= 8; a++) {
        const v = this.grid[(j * 8 + b) * GN + i * 8 + a];
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      mn[j * n0 + i] = lo; mx[j * n0 + i] = hi;
    }
    levels.push({ n: n0, mn, mx });
    let n = n0;
    while (n > 1) {
      const m = n >> 1;
      const mn2 = new Float32Array(m * m), mx2 = new Float32Array(m * m);
      for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) {
        const a = (2 * j) * n + 2 * i, b = a + n;
        mn2[j * m + i] = Math.min(mn[a], mn[a + 1], mn[b], mn[b + 1]);
        mx2[j * m + i] = Math.max(mx[a], mx[a + 1], mx[b], mx[b + 1]);
      }
      levels.push({ n: m, mn: mn2, mx: mx2 });
      mn = mn2; mx = mx2; n = m;
    }
    this.pyramid = levels; // levels[0] = 32 m cells ... last = whole world
  }

  nodeRange(x0, z0, size) {
    let lvl = Math.round(Math.log2(size / 32));
    lvl = clamp(lvl, 0, this.pyramid.length - 1);
    const L = this.pyramid[lvl];
    const cs = SIZE / L.n;
    const i = clamp(Math.floor((x0 + HALF) / cs), 0, L.n - 1), j = clamp(Math.floor((z0 + HALF) / cs), 0, L.n - 1);
    return [L.mn[j * L.n + i] - 40, L.mx[j * L.n + i] + 40];
  }

  // ---------------------------------------------------------------- vegetation
  treeLine(x, z) { return 720 + 70 * this.nz.a.noise(x * 0.0031, z * 0.0031); }

  treeProb(x, z, h, ny, ed) {
    const tl = this.treeLine(x, z);
    const alt = smoothstep(tl + 50, tl - 70, h);
    if (alt <= 0) return 0;
    const slopeF = smoothstep(0.72, 0.86, ny);
    const patch = smoothstep(-0.4, 0.35, this.nz.g.fbm(x * 0.0045, z * 0.0045, 2));
    const runF = smoothstep(6, 34, ed);
    const lx = x - LODGE.x, lz = z - LODGE.z;
    const lodge = smoothstep(110, 170, Math.sqrt(lx * lx + lz * lz));
    const lift = (z > -1250 && z < 1520) ? smoothstep(9, 16, Math.abs(x - LIFT_X)) : 1;
    return alt * slopeF * runF * lodge * lift * (0.18 + 0.82 * patch);
  }

  buildMaskAndTrees() {
    // Shader mask texture: R = groomed piste, G = forest density, B/A = run direction
    const mask = new Uint8Array(DN * DN * 4);
    for (let j = 0; j < DN; j++) {
      const z = -HALF + j * DRES;
      for (let i = 0; i < DN; i++) {
        const x = -HALF + i * DRES;
        const k = j * DN + i;
        const ed = this.dfEdge[k];
        const h = this.heightBase(x, z);
        const gx = (this.heightBase(x + 4, z) - this.heightBase(x - 4, z)) / 8;
        const gz = (this.heightBase(x, z + 4) - this.heightBase(x, z - 4)) / 8;
        const ny = 1 / Math.sqrt(1 + gx * gx + gz * gz);
        mask[k * 4] = Math.round(255 * (1 - smoothstep(-4, 10, ed)));
        mask[k * 4 + 1] = Math.round(255 * clamp(this.treeProb(x, z, h, ny, ed) * 1.9, 0, 1));
        mask[k * 4 + 2] = Math.round(127.5 + 127.5 * this.dfDx[k]);
        mask[k * 4 + 3] = Math.round(127.5 + 127.5 * this.dfDz[k]);
      }
    }
    this.maskData = mask;

    const rng = mulberry32(this.seed ^ 0x7ee5);
    const cell = 9;
    const n = Math.floor(SIZE / cell);
    const out = [];
    const nrm = { x: 0, y: 1, z: 0 };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -HALF + (i + 0.15 + 0.7 * rng()) * cell;
        const z = -HALF + (j + 0.15 + 0.7 * rng()) * cell;
        const r = rng();
        if (Math.abs(x) > 2030 || Math.abs(z) > 2030) continue;
        const ed = this.sampleDF(this.dfEdge, x, z);
        if (ed < 5) continue;
        const hb = this.heightBase(x, z);
        if (hb > 950) continue;
        const gx = (this.heightBase(x + 3, z) - this.heightBase(x - 3, z)) / 6;
        const gz = (this.heightBase(x, z + 3) - this.heightBase(x, z - 3)) / 6;
        const ny = 1 / Math.sqrt(1 + gx * gx + gz * gz);
        const p = this.treeProb(x, z, hb, ny, ed);
        if (r > p * 0.8) continue;
        const y = this.height(x, z);
        this.normal(x, z, nrm);
        if (nrm.y < 0.7) continue;
        const scale = 0.65 + rng() * 0.75 + (ed > 60 ? 0.15 : 0);
        out.push(x, y, z, scale, rng() * Math.PI * 2, rng());
      }
    }
    this.trees = new Float32Array(out);
    this.treeCount = out.length / 6;
  }

  buildRocks() {
    const rng = mulberry32(this.seed ^ 0x40c5);
    const out = [];
    const nrm = { x: 0, y: 1, z: 0 };
    const cell = 15, n = Math.floor(SIZE / cell);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + (i + rng()) * cell, z = -HALF + (j + rng()) * cell;
      const r = rng();
      if (Math.abs(x) > 2030 || Math.abs(z) > 2030) continue;
      const ed = this.sampleDF(this.dfEdge, x, z);
      if (ed < 10) continue;
      this.normal(x, z, nrm);
      const steep = smoothstep(0.88, 0.7, nrm.y) * smoothstep(0.25, 0.4, nrm.y);
      const h = this.heightBase(x, z);
      const alpine = smoothstep(this.treeLine(x, z) - 80, this.treeLine(x, z) + 80, h);
      const p = steep * (0.25 + 0.6 * alpine) * smoothstep(-0.2, 0.5, this.nz.e.noise(x * 0.01, z * 0.01));
      if (r > p * 0.55) continue;
      const s = 0.5 + rng() * rng() * 3.2;
      out.push(x, this.height(x, z) - s * 0.35, z, s, rng() * 6.28, Math.floor(rng() * 3));
    }
    // Talus blocks at the foot of the cliffs
    for (const f of this.features) {
      if (f.type !== FT.STEP || !f.cliff || f.D < 8) continue;
      const cnt = Math.round(f.D / 4 + f.vHalf / 12);
      for (let k = 0; k < cnt; k++) {
        const u = f.F + 1.5 + rng() * 6, v = (rng() * 2 - 1) * f.vHalf * 0.9;
        const x = f.cx + u * f.dx - v * f.dz, z = f.cz + u * f.dz + v * f.dx;
        const ed = this.sampleDF(this.dfEdge, x, z);
        if (f.run && ed < -10 && Math.abs(v) < f.vHalf * 0.75 && rng() < 0.75) continue; // keep landings mostly clean
        const s = 0.6 + rng() * 1.6;
        out.push(x, this.height(x, z) - s * 0.3, z, s, rng() * 6.28, Math.floor(rng() * 3));
      }
    }
    this.rocks = new Float32Array(out);
    this.rockCount = out.length / 6;
  }

  buildColliders() {
    // Vertical cylinders: trees (trunk + inner branches) and big boulders
    const items = [];
    for (let i = 0; i < this.treeCount; i++) {
      const o = i * 6, s = this.trees[o + 3];
      items.push(this.trees[o], this.trees[o + 2], 0.35 + 0.3 * s, this.trees[o + 1], 11 * s);
    }
    for (let i = 0; i < this.rockCount; i++) {
      const o = i * 6, s = this.rocks[o + 3];
      if (s < 1.1) continue;
      items.push(this.rocks[o], this.rocks[o + 2], s * 0.85, this.rocks[o + 1], s * 1.2);
    }
    const count = items.length / 5;
    const cellCount = new Uint32Array(CN * CN + 1);
    const cellOf = (x, z) => clamp(Math.floor((z + HALF) / CCELL), 0, CN - 1) * CN + clamp(Math.floor((x + HALF) / CCELL), 0, CN - 1);
    for (let i = 0; i < count; i++) cellCount[cellOf(items[i * 5], items[i * 5 + 1]) + 1]++;
    for (let i = 1; i <= CN * CN; i++) cellCount[i] += cellCount[i - 1];
    const fill = cellCount.slice();
    const data = new Float32Array(count * 5);
    for (let i = 0; i < count; i++) {
      const c = cellOf(items[i * 5], items[i * 5 + 1]);
      const at = fill[c]++;
      for (let k = 0; k < 5; k++) data[at * 5 + k] = items[i * 5 + k];
    }
    this.colStart = cellCount;
    this.colData = data;
  }

  // Calls fn(x, z, radius, baseY, height) for colliders near (x, z).
  forColliders(x, z, fn) {
    const ci = Math.floor((x + HALF) / CCELL), cj = Math.floor((z + HALF) / CCELL);
    for (let j = cj - 1; j <= cj + 1; j++) {
      if (j < 0 || j >= CN) continue;
      for (let i = ci - 1; i <= ci + 1; i++) {
        if (i < 0 || i >= CN) continue;
        const c = j * CN + i;
        for (let k = this.colStart[c]; k < this.colStart[c + 1]; k++) {
          const o = k * 5;
          if (fn(this.colData[o], this.colData[o + 1], this.colData[o + 2], this.colData[o + 3], this.colData[o + 4])) return;
        }
      }
    }
  }

  buildMarkers() {
    const out = [];
    this.runs.forEach((run, ri) => {
      for (let s = 20; s < run.length - 40; s += 38) {
        for (const side of [-1, 1]) {
          const p = this.runPoint(run, s, side * (run.width / 2 + 5));
          out.push(p.x, this.height(p.x, p.z), p.z, ri);
        }
      }
    });
    this.markers = new Float32Array(out);
  }

  buildThermals() {
    const find = (id) => this.runs.find((r) => r.id === id);
    const at = (id, s, v) => this.runPoint(find(id), s, v);
    const spots = [
      [at('sky', 700, 120), 85, 4.6], [at('glacier', 900, -150), 90, 3.8], [at('wall', 600, 160), 75, 4.2],
      [at('summit', 1500, 140), 95, 3.4], [at('eagle', 400, -130), 80, 4.0], [{ x: LODGE.x + 300, z: LODGE.z - 260 }, 110, 3.2],
      [at('bowl', 1300, 160), 85, 4.0], [at('pillow', 1900, 150), 90, 3.5],
    ];
    this.thermals = spots.map(([p, r, w]) => ({ x: p.x, z: p.z, r, w, top: 2350 }));
  }

  // Air motion for the paraglider: base wind blowing up the main face, ridge lift and thermals.
  windAt(x, y, z, out) {
    const wx = 0.6, wz = -3.0;
    const hb = this.heightBase(x, z);
    const agl = Math.max(0, y - hb);
    const gx = (this.heightBase(x + 8, z) - this.heightBase(x - 8, z)) / 16;
    const gz = (this.heightBase(x, z + 8) - this.heightBase(x, z - 8)) / 16;
    let w = clamp((wx * gx + wz * gz) * 1.15, -2.0, 4.5) * Math.exp(-agl / 150);
    let th = 0;
    for (const t of this.thermals) {
      const dx = x - t.x, dz = z - t.z;
      const r2 = (dx * dx + dz * dz) / (t.r * t.r);
      if (r2 < 6) th += t.w * Math.exp(-r2) * smoothstep(t.top, t.top - 300, y) * smoothstep(-2, 25, agl);
    }
    out.x = wx; out.y = w + th; out.z = wz;
    out.thermal = th;
    return out;
  }

  computeRunStats() {
    const nrm = { x: 0, y: 1, z: 0 };
    for (const run of this.runs) {
      const top = this.height(run.path[0].x, run.path[0].z);
      const last = run.path[run.path.length - 1];
      const bottom = this.height(last.x, last.z);
      let maxDeg = 0;
      for (let s = 20; s < run.length - 100; s += 10) {
        const p = this.runPoint(run, s, 0);
        const a = this.heightBase(p.x - p.dx * 8, p.z - p.dz * 8), b = this.heightBase(p.x + p.dx * 8, p.z + p.dz * 8);
        maxDeg = Math.max(maxDeg, Math.atan((a - b) / 16) * 180 / Math.PI);
      }
      run.stats = {
        length: Math.round(run.length),
        vertical: Math.round(top - bottom),
        avgDeg: Math.round(Math.atan((top - bottom) / run.length) * 180 / Math.PI),
        maxDeg: Math.round(maxDeg),
        top: Math.round(top),
      };
      void nrm;
    }
  }
}
