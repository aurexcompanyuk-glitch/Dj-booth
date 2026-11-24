// Procedural mountain: a long summit ridge with two faces (sunny front side, steep back side),
// 16 ski runs, natural features, trees, rocks, wind, thermals and collectible rings.
// Pure data + math (no three.js) so it can also run under Node for tests.
import { Simplex2, mulberry32 } from './noise.js';
import { clamp, smooth01, smoothstep } from './util.js';

export const HALF = 3072;
export const SIZE = 6144;
export const GRES = 6;                 // coarse height grid spacing (m)
export const GN = SIZE / GRES + 1;     // 1025 samples per side
export const DRES = 8;                 // run-distance field spacing (m)
export const DN = SIZE / DRES + 1;     // 769
export const LEAF = 24;                // finest terrain node size (m)
const FCELL = 32, FN = SIZE / FCELL;   // feature spatial hash
const CCELL = 16, CN = SIZE / CCELL;   // collider spatial hash
export const RIDGE_Z0 = -350;
export const VALLEY_F = 2450;          // front (south) valley floor
export const VALLEY_B = -2450;         // back (north) valley floor
export const LIFT_X = 270;
export const LODGE = { x: 170, z: 2650 };
export const HUT = { x: -90, z: -2640 };

export const DIFF = {
  blue: { label: 'Intermediate', short: 'BLUE', color: '#2f80ff' },
  red: { label: 'Advanced', short: 'RED', color: '#ff3d3d' },
  black: { label: 'Expert', short: 'BLACK', color: '#22232a' },
  double: { label: 'Double Black', short: '◆◆', color: '#000000' },
  park: { label: 'Terrain Park', short: 'PARK', color: '#ff9a00' },
  extreme: { label: 'Extreme', short: 'XTREME', color: '#9b3cff' },
};

// The slopes you can teleport to. side: 1 = front (south face), -1 = back (north face).
export const RUNS = [
  { id: 'glacier', name: 'Glacier Highway', diff: 'red', side: 1, x0: -2180, width: 215, startOff: 30, groom: 1,
    wig: [[50, 0.0019, 0.6], [18, 0.0051, 1.9]],
    desc: 'Long, fast and wide. Endless rolling natural jumps all the way down.',
    tags: ['Rollers', 'Speed', 'Wide'] },
  { id: 'eagle', name: 'Eagle Cliffs', diff: 'black', side: 1, x0: -1640, width: 185, startOff: 28, groom: 0.7,
    wig: [[50, 0.0019, 0.9], [20, 0.0047, 0.3]],
    desc: 'Stacked cliff bands from 6 m to 32 m. Pick your line and send it.',
    tags: ['Cliffs', 'Big drops', 'Steep'] },
  { id: 'pillow', name: 'Pillow Fields', diff: 'black', side: 1, x0: -1100, width: 205, startOff: 28, groom: 0.35,
    wig: [[48, 0.0019, 1.2], [16, 0.0057, 2.4]],
    desc: 'Cascading pillow lines and step-downs. Natural jumps everywhere.',
    tags: ['Pillows', 'Step-downs', 'Powder'] },
  { id: 'sidewinder', name: 'Sidewinder', diff: 'red', side: 1, x0: -560, width: 92, startOff: 28, groom: 1,
    wig: [[42, 0.0163, 0]], level: 0.88, channel: { floor: 11, bankW: 32, bankH: 13, out: 84 },
    desc: 'A snaking natural bobsled gully. Rail the giant banked turns.',
    tags: ['Banked turns', 'Flow', 'Gully'] },
  { id: 'summit', name: 'Summit Express', diff: 'blue', side: 1, x0: -20, width: 240, startOff: 26, groom: 1,
    wig: [[34, 0.0019, 1.5], [10, 0.006, 0.8]],
    desc: 'The widest groomer from the highest peak. Rollers and side hits.',
    tags: ['Wide', 'Groomed', 'Side hits'] },
  { id: 'park', name: 'Kicker Alley', diff: 'park', side: 1, x0: 520, width: 175, startOff: 26, groom: 1,
    wig: [[30, 0.0019, 1.8], [10, 0.0055, 2.2]],
    desc: 'Three lanes of kickers from small to XL, plus the Monster at the bottom.',
    tags: ['Kickers', 'Big air', 'Tricks'] },
  { id: 'wall', name: 'The Wall', diff: 'double', side: 1, x0: 1060, width: 225, startOff: 26, groom: 0.8,
    wig: [[42, 0.0019, 2.1], [14, 0.005, 0.4]],
    desc: 'Three 45°+ faces. Pure speed and steepness.',
    tags: ['45° steeps', 'Speed', 'Rollers'] },
  { id: 'bowl', name: 'Windlip Bowl', diff: 'black', side: 1, x0: 1600, width: 265, startOff: 6, groom: 0.3, level: 0.3,
    wig: [[40, 0.0019, 2.4], [16, 0.0052, 1.4]],
    desc: 'Drop the cornice into a huge bowl full of wind lips.',
    tags: ['Cornice', 'Bowl', 'Wind lips'] },
  { id: 'sky', name: 'Sky Launch', diff: 'extreme', side: 1, x0: 2150, width: 205, startOff: 10, groom: 0.5,
    wig: [[40, 0.0019, 2.7], [14, 0.0049, 0.2]],
    desc: 'A 75 m summit cliff with a ring course in the sky. Wingsuit, then paraglide.',
    tags: ['75 m cliff', 'Wingsuit', 'Sky rings'] },
  // ---- back side
  { id: 'glades', name: 'Enchanted Glades', diff: 'red', side: -1, x0: -1950, width: 230, startOff: 30, groom: 0.1, glade: 0.24,
    wig: [[44, 0.0021, 0.4], [16, 0.0055, 1.1]],
    desc: 'Deep powder through open forest. Dodge the trees, pop the knolls.',
    tags: ['Tree skiing', 'Powder', 'Natural hits'] },
  { id: 'stairs', name: "Giant's Staircase", diff: 'black', side: -1, x0: -1300, width: 200, startOff: 30, groom: 0.5,
    wig: [[30, 0.0021, 1.4], [10, 0.005, 0.2]],
    desc: 'Dozens of giant steps. Drop after drop after drop, or skip two at a time.',
    tags: ['Giant steps', 'Rhythm', 'Steep'] },
  { id: 'ravine', name: 'Ravine Gaps', diff: 'black', side: -1, x0: -650, width: 200, startOff: 30, groom: 0.7,
    wig: [[34, 0.0021, 2.2], [12, 0.0052, 0.9]],
    desc: 'Natural gap jumps over hollows and creek beds. Clear them or drop in.',
    tags: ['Gap jumps', 'Canyon', 'Big air'] },
  { id: 'flight', name: 'Flight Deck', diff: 'extreme', side: -1, x0: 0, width: 150, startOff: 24, groom: 1,
    wig: [[6, 0.002, 0.5]],
    desc: 'A ski-flying hill. One giant ramp, measured flights past 200 m.',
    tags: ['Ski flying', 'Distance record', 'Giant ramp'] },
  { id: 'pipe', name: 'Superpipe Canyon', diff: 'park', side: -1, x0: 650, width: 170, startOff: 28, groom: 1,
    wig: [[26, 0.0021, 0.8], [8, 0.0052, 2.0]],
    desc: 'A big jump line that funnels into a 370 m superpipe.',
    tags: ['Superpipe', 'Kickers', 'Tricks'] },
  { id: 'spines', name: 'Alaska Spines', diff: 'double', side: -1, x0: 1300, width: 240, startOff: 30, groom: 0.1,
    wig: [[36, 0.0021, 1.9], [12, 0.005, 1.3]],
    desc: 'A 50° fluted face. Ride the chutes or hop spine to spine.',
    tags: ['50° face', 'Spines', 'Powder'] },
  { id: 'couloir', name: 'Avalanche Couloir', diff: 'extreme', side: -1, x0: 1950, width: 220, width0: 86, startOff: 36, groom: 0.15,
    wig: [[22, 0.0021, 2.6], [8, 0.0055, 0.4]], couloir: { len: 640, wallH: 85 }, avalanche: true,
    desc: 'A steep chute between rock towers. Drop in and outrun the avalanche.',
    tags: ['Avalanche chase', 'Couloir', 'Icefall'] },
];

export function ridgeZ(x) {
  return RIDGE_Z0 + 90 * Math.sin(x * 0.0021 + 1.3) + 55 * Math.sin(x * 0.0053 + 0.4);
}
function gauss(x, c, w) { const d = (x - c) / w; return Math.exp(-d * d); }
export function peakH(x) {
  return 1150 + 360 * gauss(x, 150, 600) + 210 * gauss(x, -1700, 560) + 260 * gauss(x, 1950, 520)
    - 90 * gauss(x, -800, 320) + 80 * gauss(x, 950, 280);
}

export const FT = { KICKER: 0, ROLLER: 1, STEP: 2, KNOLL: 3, CHANNEL: 4, FLUTES: 5 };
const FLUTE_C1 = Math.pow(1.03, 0.35);
const FLUTE_C0 = 1 - Math.pow(0.03, 0.35) / FLUTE_C1;

function makeFeature(type, x, z, dx, dz, p) {
  const l = Math.hypot(dx, dz) || 1;
  const f = Object.assign({ type, cx: x, cz: z, dx: dx / l, dz: dz / l, vHalf: 10, vFall: 4 }, p);
  switch (type) {
    case FT.KICKER: f.uMin = -f.L; f.uMax = f.B; f.hi = f.H; f.lo = 0; break;
    case FT.ROLLER: f.uMin = -f.Lu; f.uMax = f.Ld + (f.drop > 0 ? f.Rb : 0); f.hi = f.A; f.lo = -f.drop; break;
    case FT.STEP: {
      if (f.up === undefined) f.up = f.cliff ? 0.35 : 0.5;
      const w = (f.wig || 0) * 1.6;
      f.uMin = -f.F - f.Ra - w; f.uMax = f.F + f.Rb + w;
      f.hi = f.up * f.D; f.lo = -(1 - f.up) * f.D;
      break;
    }
    case FT.KNOLL: f.uMin = -f.Ru; f.uMax = f.Ru * 0.65; f.vHalf = f.Rv; f.vFall = 0; f.hi = f.A; f.lo = 0; break;
    case FT.CHANNEL: {
      f.xr = f.R * Math.sin(f.th);
      f.yr = f.R * (1 - Math.cos(f.th));
      f.tan = Math.tan(f.th);
      f.lipV = f.floor + f.xr + f.ext;
      f.lipH = f.yr + f.ext * f.tan - f.dep;
      f.uMin = -f.ent; f.uMax = f.len + f.ent;
      f.vHalf = f.deck; f.vFall = f.blend;
      f.hi = f.lipH + 8; f.lo = -f.dep - 8;
      break;
    }
    case FT.FLUTES: f.hi = f.A; f.lo = 0; break;
  }
  f.vLim = f.vHalf + f.vFall;
  return f;
}

function evalFeature(f, x, z, baseH) {
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
    case 4: { // CHANNEL: superpipe. Flat floor, circular transitions, steep upper walls, flat decks.
      let prof;
      const a = f.floor;
      if (av <= a) prof = -f.dep;
      else if (av <= a + f.xr) { const q = av - a; prof = -f.dep + f.R - Math.sqrt(f.R * f.R - q * q); }
      else if (av <= f.lipV) prof = -f.dep + f.yr + (av - a - f.xr) * f.tan;
      else prof = f.lipH;
      const line = f.lineAt(u);
      const e = f.ent + 8;
      const wu = smooth01((u + f.ent) / e) * (1 - smooth01((u - f.len + 8) / e));
      return (line + prof - baseH) * wu * wv;
    }
    case 5: { // FLUTES: sharp spines with rounded chutes between them
      const vm = v + f.mA * Math.sin(u * f.mF + f.mP);
      const s = Math.sin(Math.PI * vm / f.lam);
      const ridge = (1 - Math.pow(s * s + 0.03, 0.35) / FLUTE_C1) / FLUTE_C0;
      const wu = smooth01((u - f.uMin) / 60) * (1 - smooth01((u - (f.uMax - 80)) / 80));
      return f.A * ridge * wu * wv * (0.78 + 0.22 * Math.sin(v * 0.05 + u * 0.013));
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
    this.pipes = [];
    this.thermals = [];
    this.rings = [];
    this.ready = false;
    this._ra = { run: -1, s: 0, edge: 0 };
    this._pipe = { f: null, u: 0, v: 0, yaw: 0, lipV: 0, lx: 0, lz: 0 };
  }

  // ---------------------------------------------------------------- generation
  async generate(onProgress = () => {}) {
    const yieldUI = () => new Promise((r) => setTimeout(r, 0));
    const report = async (p, label) => { onProgress(p, label); await yieldUI(); };

    await report(0.02, 'Surveying the mountain');
    for (const run of this.runs) this.buildPath(run);
    const bowlRun = this.runs.find((r) => r.id === 'bowl');
    this.bowls.push({ x: bowlRun.x0, z: ridgeZ(bowlRun.x0) + 230, r: 330, depth: 62 });

    await report(0.05, 'Laying out 16 slopes');
    this.buildDistanceField();
    this.buildProfiles();

    this.grid = new Float32Array(GN * GN);
    for (let j = 0; j < GN; j++) {
      const z = -HALF + j * GRES;
      for (let i = 0; i < GN; i++) this.grid[j * GN + i] = this.genHeight(-HALF + i * GRES, z);
      if ((j & 31) === 31) await report(0.07 + 0.58 * (j / GN), 'Shaping the terrain');
    }

    await report(0.66, 'Building cliffs, kickers and the superpipe');
    this.buildFeatures();
    this.buildPyramid();

    await report(0.74, 'Planting forests');
    this.buildMaskAndTrees();
    await report(0.9, 'Placing rocks, markers and rings');
    this.buildRocks();
    this.buildColliders();
    this.buildMarkers();
    this.buildThermals();
    this.buildRings();
    this.computeRunStats();
    this.ready = true;
    await report(1, 'Ready');
  }

  widthAt(run, s) {
    if (run.width0 === undefined) return run.width;
    const len = run.couloir ? run.couloir.len : 600;
    return run.width0 + (run.width - run.width0) * smoothstep(len - 60, len + 260, s);
  }

  buildPath(run) {
    const dir = run.side;
    const zs = ridgeZ(run.x0) + dir * run.startOff;
    const ze = dir > 0 ? VALLEY_F + 70 : VALLEY_B - 70;
    const total = Math.abs(ze - zs);
    const pts = [];
    let s = 0, px = 0, pz = 0;
    for (let q = 0; q <= total + 0.01; q += 10) {
      const z = zs + dir * q;
      let k = smoothstep(0, 380, q);
      if (run.channel) k *= 1 - smoothstep(total - 380, total - 80, q);
      let x = run.x0;
      for (const w of run.wig) x += k * w[0] * Math.sin(q * w[1] + w[2]);
      if (pts.length) s += Math.hypot(x - px, z - pz);
      pts.push({ x, z, s, dx: 0, dz: dir });
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

  // Point on a run centerline at arc length s with lateral offset v (+v = the rider's left).
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
    return { x: a.x + (b.x - a.x) * t + ndz * v, z: a.z + (b.z - a.z) * t - ndx * v, dx: ndx, dz: ndz };
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
      const pts = run.path;
      const hwMax = run.width / 2;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const minx = Math.min(a.x, b.x) - hwMax - R, maxx = Math.max(a.x, b.x) + hwMax + R;
        const minz = Math.min(a.z, b.z) - hwMax - R, maxz = Math.max(a.z, b.z) + hwMax + R;
        const i0 = clamp(Math.floor((minx + HALF) / DRES), 0, DN - 1), i1 = clamp(Math.ceil((maxx + HALF) / DRES), 0, DN - 1);
        const j0 = clamp(Math.floor((minz + HALF) / DRES), 0, DN - 1), j1 = clamp(Math.ceil((maxz + HALF) / DRES), 0, DN - 1);
        const ex = b.x - a.x, ez = b.z - a.z, el2 = ex * ex + ez * ez, el = Math.sqrt(el2);
        const hwA = this.widthAt(run, a.s) / 2, hwB = this.widthAt(run, b.s) / 2;
        for (let j = j0; j <= j1; j++) {
          const z = -HALF + j * DRES;
          for (let ii = i0; ii <= i1; ii++) {
            const x = -HALF + ii * DRES;
            let t = ((x - a.x) * ex + (z - a.z) * ez) / el2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            const qx = a.x + ex * t - x, qz = a.z + ez * t - z;
            const d = Math.sqrt(qx * qx + qz * qz) - (hwA + (hwB - hwA) * t);
            const idx = j * DN + ii;
            if (d < this.dfEdge[idx]) {
              this.dfEdge[idx] = d; this.dfRun[idx] = ri; this.dfS[idx] = a.s + t * el;
              this.dfDx[idx] = ex / el; this.dfDz[idx] = ez / el;
            }
          }
        }
      }
    });
    // Groomed-snow mask (visual corduroy + faster snow); freeride runs stay mostly powder
    this.dfGroom = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const ri = this.dfRun[k];
      if (ri >= 0) this.dfGroom[k] = (1 - smoothstep(-6, 18, this.dfEdge[k])) * this.runs[ri].groom;
    }
  }

  // Smoothed centreline height profile for runs that are carved as channels
  buildProfiles() {
    for (const run of this.runs) {
      const pts = run.path, n = pts.length;
      const raw = new Float32Array(n);
      for (let i = 0; i < n; i++) raw[i] = this.natural(pts[i].x, pts[i].z, -run.width / 2, 1);
      const prof = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        let sum = 0, c = 0;
        for (let k = -5; k <= 5; k++) { const q = clamp(i + k, 0, n - 1); sum += raw[q]; c++; }
        prof[i] = sum / c;
      }
      run.hProf = prof;
    }
  }

  profileAt(run, s) {
    const pts = run.path;
    s = clamp(s, 0, run.length);
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].s <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi];
    const t = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return run.hProf[lo] + (run.hProf[hi] - run.hProf[lo]) * t;
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

  // Mountain shape before any run-specific carving. ed = distance outside the nearest run edge.
  natural(x, z, ed, m) {
    const N = this.nz;
    const rz = ridgeZ(x);
    const P = peakH(x);
    let h, tDown;
    if (z >= rz) {
      tDown = (z - rz) / (VALLEY_F - rz);
      h = tDown < 1 ? P * Math.pow(1 - tDown, 1.45) : 0;
    } else {
      tDown = (rz - z) / (rz - VALLEY_B);
      h = tDown < 1 ? P * Math.pow(1 - tDown, 1.3) : 0;
    }
    // Enclosing mountains on all sides: irregular ridged peaks
    const ax = Math.abs(x), az = Math.abs(z);
    const wx = smoothstep(2640, 3072, ax);
    const wz = smoothstep(2770, 3072, az);
    if (wx > 0 || wz > 0) {
      const rr = N.d.ridged(x * 0.0019 + 3.3, z * 0.0023 - 1.7, 4);
      h += Math.max(wx, wz) * (130 + 340 * rr * (0.75 + 0.35 * N.a.noise(x * 0.0011, z * 0.0011)));
    }
    const qx = x + 60 * N.b.noise(x * 0.0011, z * 0.0011);
    const qz = z + 60 * N.b.noise(x * 0.0011 + 37.2, z * 0.0011 - 12.9);
    h += 40 * clamp(1.15 - tDown, 0.22, 1) * N.c.fbm(qx * 0.0011, qz * 0.0011, 3);
    const alpine = smoothstep(0.45, 0.03, tDown);
    if (alpine > 0.001) h += alpine * (1 - 0.82 * m) * 58 * (N.d.ridged(qx * 0.0032, qz * 0.0032, 4) - 0.3);
    h += (1 - 0.82 * m) * 7.5 * N.e.fbm(qx * 0.012, qz * 0.012, 3);
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

  genHeight(x, z) {
    const ed = this.sampleDF(this.dfEdge, x, z);
    const m = 1 - smoothstep(-6, 18, ed);
    let h = this.natural(x, z, ed, m);
    const ri = this.dfRun[this.dfIndex(x, z)];
    if (ri < 0) return h;
    const run = this.runs[ri];
    const s = ed < 100 ? this.sampleDF(this.dfS, x, z) : 0;
    // Level each piste across its width (cut and fill), so the fall line follows the run
    const lvl = run.level === undefined ? 0.75 : run.level;
    if (lvl > 0 && ed < 95) h += (this.profileAt(run, s) - h) * lvl * (1 - smoothstep(0, 95, ed));
    if (run.channel) {
      // Banked gully that follows the winding centreline
      const ch = run.channel;
      const d = ed + run.width / 2;
      if (d < ch.out) {
        const taper = smoothstep(40, 240, s) * (1 - smoothstep(run.length - 420, run.length - 170, s));
        const tb = clamp((d - ch.floor) / ch.bankW, 0, 1);
        h += ch.bankH * tb * tb * (1 - smoothstep(ch.floor + ch.bankW, ch.out, d)) * taper;
      }
    }
    if (run.couloir && z < ridgeZ(x) + 30) {
      // Rock towers either side of a notch cut through the ridge
      const c = run.couloir;
      const tap = 1 - smoothstep(c.len - 180, c.len + 140, s);
      if (tap > 0) {
        h += c.wallH * smoothstep(2, 30, ed) * (1 - 0.75 * smoothstep(34, 150, ed)) * tap;
        h -= 22 * (1 - smoothstep(-30, 6, ed)) * (1 - smoothstep(0, 260, s));
      }
    }
    return h;
  }

  // ---------------------------------------------------------------- features
  slopeAlong(x, z, dx, dz, e = 10) {
    return (this.heightBase(x - dx * e, z - dz * e) - this.heightBase(x + dx * e, z + dz * e)) / (2 * e);
  }

  buildFeatures() {
    const rng = mulberry32(this.seed ^ 0x5eed);
    const R = (a, b) => a + (b - a) * rng();
    const feats = this.features;
    const add = (type, run, s, v, p, rot = 0) => {
      const pt = this.runPoint(run, s, v);
      const c = Math.cos(rot), sn = Math.sin(rot);
      const dx = pt.dx * c - pt.dz * sn, dz = pt.dx * sn + pt.dz * c;
      const f = makeFeature(type, pt.x, pt.z, dx, dz, p);
      f.run = run.id; f.s = s;
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
    const KS = [
      { H: 1.4, L: 6.5, W: 3.5 }, { H: 2.3, L: 9.5, W: 4.5 }, { H: 3.3, L: 12.5, W: 5.5 },
      { H: 4.6, L: 16.5, W: 6.5 }, { H: 7.0, L: 24, W: 9 },
    ];
    const kicker = (run, s, v, size, wide = 0) => {
      const K = KS[size];
      return add(FT.KICKER, run, s, v, { H: K.H, L: K.L, B: K.L * 0.38, vHalf: K.W + wide, vFall: 1.8, size });
    };
    // Gap jump: a lip, then a hollow that drops away and rejoins the slope further down
    const gap = (run, s, v, size, vHalf) => {
      const k = kicker(run, s, v, size, vHalf - KS[size].W);
      const pt = this.runPoint(run, s, v);
      const slope = Math.max(0.3, this.slopeAlong(pt.x, pt.z, pt.dx, pt.dz));
      const Rb = 20 + size * 5;
      const D = Math.min(4.5 + size * 2.4, 0.6 * slope * Rb);
      add(FT.STEP, run, s + 1.6, v, { D, F: 1.2, Ra: 1, Rb, up: 0, vHalf: vHalf + 2, vFall: 7, wig: 0.7, wf: 0.11, wp: rng() * 6, cliff: true, gap: true });
      k.gap = true;
      return k;
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
            roller(run, s0 + 150, 0, R(0.8, 1.4), 8, 3, R(3.5, 5.5), 22, hw - 25, 20, R(-0.15, 0.15));
          }
          break;
        }
        case 'sidewinder': {
          for (let s = 330; s < L - 480; s += 193) roller(run, s, 0, R(0.9, 1.3), 10, 6, 0, 0, 9, 6);
          for (const s of [L - 330, L - 230, L - 130]) roller(run, s, R(-10, 10), R(1.6, 2.4), 13, 7, R(0, 1.2), 12, 30, 12);
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
          for (const [s, D] of [[300, 80], [1080, 92], [1780, 62]]) {
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
          add(FT.STEP, run, 125, 0, { D: 75, F: 7, Ra: 95, Rb: 420, up: 0.16, vHalf: hw + 25, vFall: 45, wig: 4, wf: 0.05, wp: 1.2, cliff: true, mega: true });
          cliff(run, 820, -35, 32, 55, { F: 2.2, Ra: 60, Rb: 180 });
          cliff(run, 1500, 30, 21, 50, { F: 1.5, Ra: 46, Rb: 120 });
          for (const s of [620, 1120, 1300, 1750, 1950, 2150]) if (s < L - 200) roller(run, s, R(-25, 25), R(1.5, 2.6), R(8, 12), R(3, 4.5), R(3, 5.5), 22, hw - 20, 22, R(-0.25, 0.25));
          break;
        }
        case 'glades': {
          for (let s = 170; s < L - 220; s += R(60, 105)) {
            const pick = rng();
            const v = R(-hw + 35, hw - 35);
            if (pick < 0.4) knoll(run, s, v, R(2.2, 3.6), R(9, 13), R(6, 9), R(-0.3, 0.3));
            else if (pick < 0.78) roller(run, s, v, R(1.0, 1.8), R(7, 10), R(2.6, 3.6), R(2.2, 4.2), R(12, 18), R(22, 45), 12, R(-0.3, 0.3));
            else cliff(run, s, v, R(5, 9), R(20, 34));
          }
          break;
        }
        case 'stairs': {
          const spacing = 46;
          for (let s = 170; s < L - 330; s += spacing) {
            const pt = this.runPoint(run, s, 0);
            const slope = Math.max(0.28, this.slopeAlong(pt.x, pt.z, pt.dx, pt.dz, 20));
            const D = Math.min(0.62 * slope * spacing, 16);
            const F = 0.9 + D * 0.035;
            add(FT.STEP, run, s, 0, { D, F, Ra: spacing / 2 - F, Rb: spacing / 2 - F, up: 0.5, vHalf: hw + 10, vFall: 30,
              wig: 1.8, wf: 0.06 + rng() * 0.03, wp: rng() * 6, cliff: true, stair: true });
          }
          break;
        }
        case 'ravine': {
          let k = 0;
          for (let s = 220; s < L - 330; s += R(150, 185), k++) {
            const sizes = [[1, 2, 1], [2, 3, 2], [1, 3, 2], [2, 2, 3]][k % 4];
            gap(run, s, 58, sizes[0], 15);
            gap(run, s + 26, 0, sizes[1], 20);
            gap(run, s + 12, -58, sizes[2], 15);
            if (k % 2 === 0) roller(run, s + 95, R(-20, 20), R(1.4, 2.2), 13, 8, 0, 0, hw - 20, 18);
          }
          gap(run, L - 300, 0, 4, 30);
          break;
        }
        case 'flight': {
          const f = add(FT.KICKER, run, 250, 0, { H: 13, L: 40, B: 15, vHalf: 9, vFall: 5, size: 5 });
          f.flight = true;
          this.flightDeck = f;
          for (const s of [1300, 1520]) if (s < L - 300) roller(run, s, 0, R(2.6, 3.4), 18, 8, 1.5, 18, hw - 15, 20);
          break;
        }
        case 'pipe': {
          let k = 0;
          for (let s = 240; s < L - 740; s += 165, k++) {
            kicker(run, s, 46, [1, 2, 3][k % 3]);
            kicker(run, s + 14, -46, [2, 3, 1][k % 3]);
            if (k % 2 === 1) kicker(run, s + 80, 0, 3);
          }
          const s0 = L - 560, len = 370;
          const a = this.runPoint(run, s0, 0), b = this.runPoint(run, s0 + len, 0);
          const dl = Math.hypot(b.x - a.x, b.z - a.z);
          const f = makeFeature(FT.CHANNEL, a.x, a.z, (b.x - a.x) / dl, (b.z - a.z) / dl, {
            len: dl, floor: 8, R: 8.8, th: 1.03, ext: 1.0, dep: 3.0, deck: 25, blend: 22, ent: 34,
          });
          // floor line = natural centreline profile, sampled every 10 m
          const prof = [];
          for (let u = -40; u <= dl + 40; u += 10) prof.push(this.heightBase(f.cx + f.dx * u, f.cz + f.dz * u));
          f.lineAt = (u) => { const q = clamp((u + 40) / 10, 0, prof.length - 1.001); const i = q | 0; return prof[i] + (prof[i + 1] - prof[i]) * (q - i); };
          f.h0 = f.lineAt(0); f.h1 = f.lineAt(dl);
          f.run = run.id; f.s = s0;
          feats.push(f);
          this.pipes.push(f);
          break;
        }
        case 'spines': {
          add(FT.STEP, run, 430, 0, { D: 100, F: 150, Ra: 200, Rb: 300, vHalf: hw + 40, vFall: 70, wig: 5, wf: 0.02, wp: 2.2, cliff: false });
          const pt = this.runPoint(run, 430, 0);
          const fl = makeFeature(FT.FLUTES, pt.x, pt.z, pt.dx, pt.dz, { A: 3.3, lam: 15, mA: 2.4, mF: 0.045, mP: 1.1, vHalf: hw - 6, vFall: 18 });
          fl.uMin = -200; fl.uMax = 190; fl.run = run.id; fl.s = 430;
          feats.push(fl);
          for (let s0 = 760; s0 < L - 320; s0 += R(200, 250)) {
            for (const lane of [-70, 0, 70]) {
              let s = s0 + R(-20, 25), v = lane + R(-12, 12);
              for (let q = 0; q < 4; q++) {
                roller(run, s, v, R(1.0, 1.7), R(4.5, 6.5), R(2.4, 3.2), R(2.2, 3.8), R(9, 12), R(5, 8), 3, R(-0.25, 0.25));
                s += R(13, 18); v += R(-6, 6);
              }
            }
            knoll(run, s0 + 130, R(-50, 50), R(2.4, 3.6), R(10, 13), R(7, 9));
          }
          break;
        }
        case 'couloir': {
          for (const s of [170, 320, 470]) roller(run, s, 0, 0.8, 6, 2.6, R(3, 4.6), 16, 30, 8);
          cliff(run, 1010, 0, 42, 78, { F: 3, Ra: 70, Rb: 230, up: 0.25, icefall: true });
          for (let s = 1330; s < L - 250; s += R(110, 150)) roller(run, s, R(-30, 30), R(1.8, 3.0), R(12, 16), R(5, 7), R(1, 3), 18, hw - 30, 22, R(-0.2, 0.2));
          break;
        }
      }
    }

    // Off-piste: random cliff bands on the spurs and alpine zones of both faces
    for (let i = 0, tries = 0; i < 64 && tries < 1400; tries++) {
      const x = R(-2500, 2500);
      const rz = ridgeZ(x);
      const z = rng() < 0.55 ? rz + R(120, 1900) : rz - R(120, 1500);
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

  featureHeight(x, z, baseH) {
    const fi = ((x + HALF) / FCELL) | 0, fj = ((z + HALF) / FCELL) | 0;
    if (fi < 0 || fi >= FN || fj < 0 || fj >= FN) return 0;
    const list = this.fHash[fj * FN + fi];
    if (!list) return 0;
    let h = 0;
    for (let i = 0; i < list.length; i++) h += evalFeature(list[i], x, z, baseH);
    return h;
  }

  // Small-scale surface: powder bumps off-piste, nearly smooth corduroy on groomed runs
  micro(x, z) {
    const pm = this.sampleDF(this.dfGroom, x, z);
    return (0.07 + 0.8 * (1 - pm)) * this.nz.f.fbm(x * 0.05, z * 0.05, 2) + (0.03 + 0.07 * (1 - pm)) * this.nz.g.noise(x * 0.11, z * 0.11);
  }

  height(x, z) {
    const b = this.heightBase(x, z);
    return b + this.featureHeight(x, z, b) + this.micro(x, z);
  }

  // Height ignoring cliffs, kickers and small features: used for honest "steepest pitch" stats
  heightSustained(x, z) {
    let h = this.heightBase(x, z);
    const fi = ((x + HALF) / FCELL) | 0, fj = ((z + HALF) / FCELL) | 0;
    const list = (fi >= 0 && fi < FN && fj >= 0 && fj < FN) ? this.fHash[fj * FN + fi] : null;
    if (list) for (const f of list) if (f.type === FT.STEP && !f.cliff) h += evalFeature(f, x, z, h);
    return h;
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
  pisteMask(x, z) { return this.sampleDF(this.dfGroom, x, z); }
  runAt(x, z) {
    const i = this.dfIndex(x, z), r = this._ra;
    r.run = this.dfRun[i]; r.s = this.dfS[i]; r.edge = this.dfEdge[i];
    return r;
  }

  // Superpipe lookup: returns a shared info object while (x, z) is inside a pipe, else null
  pipeAt(x, z) {
    for (const f of this.pipes) {
      const rx = x - f.cx, rz = z - f.cz;
      const u = rx * f.dx + rz * f.dz;
      if (u < -f.ent * 0.7 || u > f.len + f.ent * 0.7) continue;
      const v = rz * f.dx - rx * f.dz;
      if (Math.abs(v) > f.deck + 4) continue;
      const o = this._pipe;
      o.f = f; o.u = u; o.v = v; o.yaw = Math.atan2(f.dx, f.dz); o.lipV = f.lipV;
      o.lx = -f.dz; o.lz = f.dx; // unit vector of +v
      return o;
    }
    return null;
  }

  startPose(runIndex, s = 6) {
    const run = this.runs[runIndex];
    const p = this.runPoint(run, s, 0);
    return { x: p.x, y: this.height(p.x, p.z), z: p.z, heading: Math.atan2(p.dx, p.dz) };
  }

  // ---------------------------------------------------------------- LOD bounds
  buildPyramid() {
    // min/max per 24 m leaf cell from the base grid, widened by every feature that touches it
    const n0 = SIZE / LEAF, per = LEAF / GRES;
    let mn = new Float32Array(n0 * n0), mx = new Float32Array(n0 * n0);
    for (let j = 0; j < n0; j++) for (let i = 0; i < n0; i++) {
      let lo = Infinity, hi = -Infinity;
      for (let b = 0; b <= per; b++) for (let a = 0; a <= per; a++) {
        const v = this.grid[(j * per + b) * GN + i * per + a];
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
      mn[j * n0 + i] = lo - 3; mx[j * n0 + i] = hi + 3;
    }
    const add = new Float32Array(n0 * n0), sub = new Float32Array(n0 * n0);
    for (const f of this.features) {
      const [minx, minz, maxx, maxz] = f.bbox;
      const i0 = clamp(Math.floor((minx + HALF) / LEAF), 0, n0 - 1), i1 = clamp(Math.floor((maxx + HALF) / LEAF), 0, n0 - 1);
      const j0 = clamp(Math.floor((minz + HALF) / LEAF), 0, n0 - 1), j1 = clamp(Math.floor((maxz + HALF) / LEAF), 0, n0 - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { add[j * n0 + i] += f.hi; sub[j * n0 + i] += f.lo; }
    }
    for (let k = 0; k < n0 * n0; k++) { mx[k] += add[k]; mn[k] += sub[k]; }
    const levels = [{ n: n0, mn, mx }];
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
    this.pyramid = levels; // levels[0] = leaf cells ... last = whole world
  }

  nodeRange(x0, z0, size, out) {
    const lvl = clamp(Math.round(Math.log2(size / LEAF)), 0, this.pyramid.length - 1);
    const L = this.pyramid[lvl];
    const cs = SIZE / L.n;
    const i = clamp(Math.floor((x0 + HALF) / cs + 0.5), 0, L.n - 1), j = clamp(Math.floor((z0 + HALF) / cs + 0.5), 0, L.n - 1);
    out[0] = L.mn[j * L.n + i]; out[1] = L.mx[j * L.n + i];
    return out;
  }

  // ---------------------------------------------------------------- vegetation
  treeLine(x, z) { return 720 + 70 * this.nz.a.noise(x * 0.0031, z * 0.0031); }

  clearings(x, z) {
    const lx = x - LODGE.x, lz = z - LODGE.z;
    const hx = x - HUT.x, hz = z - HUT.z;
    const lodge = smoothstep(110, 170, Math.sqrt(lx * lx + lz * lz)) * smoothstep(60, 110, Math.sqrt(hx * hx + hz * hz));
    const lift = (z > ridgeZ(LIFT_X) + 100 && z < VALLEY_F + 150) ? smoothstep(9, 16, Math.abs(x - LIFT_X)) : 1;
    return lodge * lift;
  }

  treeProb(x, z, h, ny, ed) {
    const tl = this.treeLine(x, z);
    const alt = smoothstep(tl + 50, tl - 70, h);
    if (alt <= 0) return 0;
    const slopeF = smoothstep(0.72, 0.86, ny);
    const patch = smoothstep(-0.4, 0.35, this.nz.g.fbm(x * 0.0045, z * 0.0045, 2));
    const runF = smoothstep(6, 34, ed);
    return alt * slopeF * runF * this.clearings(x, z) * (0.18 + 0.82 * patch);
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
        const ri = this.dfRun[k];
        const groom = ri >= 0 ? (1 - smoothstep(-4, 10, ed)) * this.runs[ri].groom : 0;
        mask[k * 4] = Math.round(255 * groom);
        mask[k * 4 + 1] = Math.round(255 * clamp(this.treeProb(x, z, h, ny, ed) * 1.9, 0, 1));
        mask[k * 4 + 2] = Math.round(127.5 + 127.5 * this.dfDx[k]);
        mask[k * 4 + 3] = Math.round(127.5 + 127.5 * this.dfDz[k]);
      }
    }
    // Soften the forest channel so distant tree lines read as smooth edges, not 8 m texel steps
    {
      const tmp = new Float32Array(DN * DN), k5 = [1, 4, 6, 4, 1];
      for (let j = 0; j < DN; j++) for (let i = 0; i < DN; i++) {
        let a = 0;
        for (let t = -2; t <= 2; t++) a += k5[t + 2] * mask[(j * DN + clamp(i + t, 0, DN - 1)) * 4 + 1];
        tmp[j * DN + i] = a / 16;
      }
      for (let j = 0; j < DN; j++) for (let i = 0; i < DN; i++) {
        let a = 0;
        for (let t = -2; t <= 2; t++) a += k5[t + 2] * tmp[clamp(j + t, 0, DN - 1) * DN + i];
        mask[(j * DN + i) * 4 + 1] = Math.round(a / 16);
      }
    }
    this.maskData = mask;

    const rng = mulberry32(this.seed ^ 0x7ee5);
    const cell = 9;
    const n = Math.floor(SIZE / cell);
    const out = [];
    const nrm = { x: 0, y: 1, z: 0 };
    const LIM = HALF - 18;
    const gladeLanes = {};
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -HALF + (i + 0.15 + 0.7 * rng()) * cell;
        const z = -HALF + (j + 0.15 + 0.7 * rng()) * cell;
        const r = rng();
        if (Math.abs(x) > LIM || Math.abs(z) > LIM) continue;
        const ed = this.sampleDF(this.dfEdge, x, z);
        let glade = 0;
        if (ed < 5) {
          const k = this.dfIndex(x, z);
          const ri = this.dfRun[k];
          if (ri < 0 || !this.runs[ri].glade || this.dfS[k] < 130 || ed > -4) continue;
          glade = this.runs[ri].glade;
          // keep a clear lane through the trees into (and out of) every jump
          const lanes = gladeLanes[ri] || (gladeLanes[ri] = this.features.filter((f) => f.run === this.runs[ri].id &&
            (f.type === FT.KNOLL || f.type === FT.ROLLER || f.type === FT.KICKER)));
          let blocked = false;
          for (let q = 0; q < lanes.length && !blocked; q++) {
            const f = lanes[q], rx = x - f.cx, rz = z - f.cz;
            const u = rx * f.dx + rz * f.dz;
            if (u > -62 && u < 38 && Math.abs(rz * f.dx - rx * f.dz) < 5) blocked = true;
          }
          if (blocked) continue;
        }
        const hb = this.heightBase(x, z);
        if (hb > 950) continue;
        const gx = (this.heightBase(x + 3, z) - this.heightBase(x - 3, z)) / 6;
        const gz = (this.heightBase(x, z + 3) - this.heightBase(x, z - 3)) / 6;
        const ny = 1 / Math.sqrt(1 + gx * gx + gz * gz);
        let p;
        if (glade) {
          const tl = this.treeLine(x, z);
          p = glade * smoothstep(tl + 270, tl + 70, hb) * smoothstep(0.6, 0.8, ny) * 1.25;
        } else p = this.treeProb(x, z, hb, ny, ed);
        if (r > p * 0.6) continue;
        const y = this.height(x, z);
        this.normal(x, z, nrm);
        if (nrm.y < 0.66) continue;
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
    const LIM = HALF - 18;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + (i + rng()) * cell, z = -HALF + (j + rng()) * cell;
      const r = rng();
      if (Math.abs(x) > LIM || Math.abs(z) > LIM) continue;
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
      if (f.type !== FT.STEP || !f.cliff || f.D < 8 || f.stair || f.gap) continue;
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
        const hw = this.widthAt(run, s) / 2;
        for (const side of [-1, 1]) {
          const p = this.runPoint(run, s, side * (hw + 5));
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
      [at('summit', 1500, 140), 95, 3.4], [at('eagle', 400, -130), 80, 4.0], [{ x: LODGE.x + 300, z: LODGE.z - 300 }, 110, 3.2],
      [at('bowl', 1300, 160), 85, 4.0], [at('pillow', 1900, 150), 90, 3.5], [at('sidewinder', 1100, 150), 85, 3.8],
      [at('flight', 900, 150), 90, 4.6], [at('glades', 700, -140), 85, 4.2], [at('spines', 600, 160), 85, 4.8],
      [at('couloir', 1250, -150), 90, 4.4], [at('stairs', 1000, 140), 85, 4.2],
    ];
    this.thermals = spots.map(([p, r, w]) => ({ x: p.x, z: p.z, r, w, top: 2400 }));
  }

  // Collectible rings: placed along the natural flight path off jumps and cliffs, plus a sky course
  buildRings() {
    const rings = [];
    this.runs.forEach((run, ri) => {
      const pick = (aMin, dMin) => this.features.filter((f) => f.run === run.id && f.s > 120 && (
        (f.type === FT.KICKER && f.size >= 1 && !f.flight) ||
        (f.type === FT.ROLLER && (f.A >= aMin || f.drop >= dMin) && f.vHalf >= 9) ||
        (f.type === FT.KNOLL && f.A >= aMin) ||
        (f.type === FT.STEP && f.cliff && !f.gap && !f.mega && f.D >= 9)));
      let cand = pick(2.9, 3.4);
      if (cand.length < 8) cand = pick(2.0, 2.2);
      if (cand.length < 8) cand = pick(1.2, 1.5);
      cand.sort((a, b) => a.s - b.s);
      if (run.channel) {
        // rings high on the outside bank of each bend: ride the berm to grab them
        const k = run.wig[0][1];
        for (let n = 1; ; n++) {
          const q = (n - 0.5) * Math.PI / k;            // distance down the fall line of bend n
          const s = q * (run.length / (run.path.length * 10));
          if (s > run.length - 520) break;
          if (s < 300) continue;
          const side = Math.sin(q * k) > 0 ? 1 : -1;     // +x side when the path is at its +x extreme
          const pc = this.runPoint(run, s, 0);
          const left = (pc.dz * 1 - pc.dx * 0) > 0 ? side : -side; // +x is the rider's left when heading +z
          const p = this.runPoint(run, s, left * (run.channel.floor + run.channel.bankW * 0.72));
          rings.push({ x: p.x, y: this.height(p.x, p.z) + 1.7, z: p.z, dx: p.dx, dz: p.dz, r: 2.3, run: ri, sky: false, got: false });
        }
      }
      const want = 12;
      const stepN = Math.max(1, cand.length / want);
      for (let q = 0; q < cand.length; q += stepN) {
        const f = cand[Math.floor(q)];
        // nominal flight from the lip: speed along the surface tangent, with a small pop
        const lx = f.cx - f.dx * 0.6, lz = f.cz - f.dz * 0.6;
        const h0 = this.height(lx, lz), h1 = this.height(lx - f.dx * 2, lz - f.dz * 2);
        const tan = (h0 - h1) / 2;
        const tl = Math.hypot(1, tan);
        const isCliff = f.type === FT.STEP;
        const v0 = isCliff ? 17 : 19, pop = isCliff ? 0 : 2.4, t = isCliff ? 0.95 : 0.72;
        const vx = v0 / tl, vy = v0 * tan / tl + pop;
        const d = vx * t;
        const x = f.cx + f.dx * d, z = f.cz + f.dz * d;
        let y = h0 + vy * t - 4.905 * t * t;
        y = Math.max(y, this.height(x, z) + 2.6);
        rings.push({ x, y, z, dx: f.dx, dz: f.dz, r: 2.6, run: ri, sky: false, got: false, feat: f });
      }
    });
    // Sky course below the Sky Launch cliff: a wingsuit line that hugs the slope
    const sky = this.runs.find((r) => r.id === 'sky');
    const si = this.runs.indexOf(sky);
    for (let k = 0; k < 13; k++) {
      const s = 215 + k * 100;
      const p = this.runPoint(sky, s, Math.sin(k * 0.8) * 42);
      const agl = k === 0 ? 46 : k === 1 ? 36 : 27;
      rings.push({ x: p.x, y: this.height(p.x, p.z) + agl, z: p.z, dx: p.dx, dz: p.dz, r: 5, run: si, sky: true, got: false });
    }
    this.rings = rings;
  }

  // Air motion for the paraglider: gentle wind up the front face, ridge lift and thermals.
  windAt(x, y, z, out) {
    const wx = 0.5, wz = -2.2;
    const hb = this.heightBase(x, z);
    const agl = Math.max(0, y - hb);
    const gx = (this.heightBase(x + 8, z) - this.heightBase(x - 8, z)) / 16;
    const gz = (this.heightBase(x, z + 8) - this.heightBase(x, z - 8)) / 16;
    const w = clamp((wx * gx + wz * gz) * 1.25, -1.2, 4.2) * Math.exp(-agl / 150);
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
    for (const run of this.runs) {
      const top = this.height(run.path[0].x, run.path[0].z);
      const last = run.path[run.path.length - 1];
      const bottom = this.height(last.x, last.z);
      let maxDeg = 0;
      for (let s = 20; s < run.length - 100; s += 10) {
        const p = this.runPoint(run, s, 0);
        const a = this.heightSustained(p.x - p.dx * 12, p.z - p.dz * 12), b = this.heightSustained(p.x + p.dx * 12, p.z + p.dz * 12);
        maxDeg = Math.max(maxDeg, Math.atan((a - b) / 24) * 180 / Math.PI);
      }
      run.stats = {
        length: Math.round(run.length),
        vertical: Math.round(top - bottom),
        avgDeg: Math.round(Math.atan((top - bottom) / run.length) * 180 / Math.PI),
        maxDeg: Math.min(60, Math.round(maxDeg)),
        top: Math.round(top),
      };
    }
  }
}
