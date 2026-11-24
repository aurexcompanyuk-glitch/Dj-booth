// Summit Freeride: game orchestration, loop, scoring, teleporting and settings.
import * as THREE from 'three';
import { World, ridgeZ, peakH, LODGE } from './world.js';
import { Skier } from './skier.js';
import { Terrain, createTerrainMaterial } from './terrain.js';
import { SkySystem, createBackdrop, SUN_DIR } from './sky.js';
import { Scenery } from './scenery.js';
import { Character, OUTFITS } from './character.js';
import { GliderModel } from './glider.js';
import { SnowParticles, SkiTracks } from './effects.js';
import { CameraRig, CAM_MODES } from './camera.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { UI } from './ui.js';
import { clamp, lerp, TAU } from './util.js';

const STEP = 1 / 120;
const STORE_KEY = 'summit-freeride-v1';
const QUALITY = {
  low: { pixelRatio: 1.25, shadowSize: 1024, shadowExtent: 30, splitK: 1.8, treeNear: 150, treeFar: 560, treeShadows: false, budget: 3, detail: 0.6, spray: 0.6 },
  medium: { pixelRatio: 1.5, shadowSize: 2048, shadowExtent: 40, splitK: 2.4, treeNear: 230, treeFar: 900, treeShadows: true, budget: 5, detail: 1, spray: 1 },
  high: { pixelRatio: 2, shadowSize: 4096, shadowExtent: 48, splitK: 3.1, treeNear: 330, treeFar: 1350, treeShadows: true, budget: 7, detail: 1, spray: 1.3 },
};

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function saveStore(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch (e) { /* storage unavailable */ }
}

class Game {
  constructor() {
    this.ui = new UI();
    this.store = loadStore();
    this.coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const st = this.store.settings || {};
    this.settings = {
      quality: st.quality || (this.coarse ? 'low' : 'medium'),
      assist: st.assist !== undefined ? st.assist : true,
      sound: st.sound !== undefined ? st.sound : true,
      camera: st.camera || 0,
      outfit: st.outfit || 0,
    };
    this.best = this.store.best || {};
    this.mode = 'loading';
    this.overlay = null;
    this.score = 0; this.runScore = 0; this.combo = 0; this.comboTimer = 0;
    this.runIndex = -1; this.timing = false; this.runTime = 0; this.progress = 0;
    this.topSpeed = 0; this.bestAir = 0;
    this.acc = 0;
    this.hints = {};
    this.sprayAcc = 0; this.powderAcc = 0;
    this.menuT = 0;
    this.lastFrame = performance.now();
    this.hudTimer = 0; this.miniTimer = 0;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3();
    this.lastTeleport = null;
  }

  async init(hot) {
    const q = QUALITY[this.settings.quality];
    this.quality = q;
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.coarse, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.25, 32000);
    this.camera.position.set(0, 1500, 3000);

    this.world = new World();
    await this.world.generate((p, label) => this.ui.setLoading(p * 0.85, label));
    this.ui.setLoading(0.88, 'Lighting the sky');
    await new Promise((r) => setTimeout(r, 0));

    this.sky = new SkySystem(this.renderer, this.scene, q);
    const maskTex = new THREE.DataTexture(this.world.maskData, 513, 513, THREE.RGBAFormat, THREE.UnsignedByteType);
    maskTex.magFilter = THREE.LinearFilter; maskTex.minFilter = THREE.LinearFilter;
    maskTex.needsUpdate = true;
    this.terrainMat = createTerrainMaterial(maskTex, SUN_DIR, { treeFar: q.treeFar, detail: q.detail });
    this.terrain = new Terrain(this.world, this.terrainMat, { splitK: q.splitK, budget: q.budget });
    this.terrain.init(3);
    this.scene.add(this.terrain.group);
    this.scene.add(createBackdrop(this.world));
    this.ui.setLoading(0.92, 'Planting trees');
    await new Promise((r) => setTimeout(r, 0));
    this.scenery = new Scenery(this.scene, this.world, q);

    this.skier = new Skier(this.world);
    this.skier.assist = this.settings.assist;
    this.character = new Character(this.settings.outfit);
    this.scene.add(this.character.root);
    this.glider = new GliderModel();
    this.character.root.add(this.glider.group);
    this.particles = new SnowParticles(this.scene, 3200);
    this.tracks = new SkiTracks(this.scene, 4000);
    this.character.onPolePlant = (p) => {
      for (let k = 0; k < 5; k++) this.particles.emit(p.x, p.y + 0.05, p.z, (Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2, 0.18, 0.5, 0.7, 1.5);
    };
    this.camRig = new CameraRig(this.camera, this.world);
    this.camRig.setMode(this.settings.camera);
    this.input = new Input();
    this.audio = new GameAudio();
    this.audio.muted = !this.settings.sound;

    this.ui.setLoading(0.96, 'Drawing the trail map');
    await new Promise((r) => setTimeout(r, 0));
    this.ui.buildMapBase(this.world);
    this.ui.buildMenu(this.world, this.best);
    this.ui.buildMapList(this.world, this.extraSpots());
    this.ui.bindSettings(this.settings);
    this.bindUI();
    this.bindInputDevices();

    // Park the skier at the first slope so the scene has a subject behind the menu
    const p0 = this.world.startPose(0);
    this.skier.reset(p0.x, p0.z, p0.heading);
    this.character.update(0.016, this.skier);
    this.updateMenuCamera(0);
    for (let i = 0; i < 4; i++) this.terrain.update(this.camera, 120);
    this.renderer.compile(this.scene, this.camera);
    this.ui.setLoading(1, 'Ready');

    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.mode === 'play' && !this.overlay) this.openPause(); });
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
      window.claude.hot.snapshot(() => ({ run: this.runIndex, score: this.score, mode: this.mode }));
    }
    this.ui.show('loading', false);
    if (hot && hot.mode === 'play' && hot.run >= 0) {
      this.score = hot.score || 0;
      this.startRun(hot.run);
    } else this.showMenu();
    requestAnimationFrame((t) => this.frame(t));
  }

  extraSpots() {
    let bx = 0, by = -1e9;
    for (let x = -1400; x <= 1400; x += 20) { const h = peakH(x); if (h > by) { by = h; bx = x; } }
    return [
      { name: 'Summit Peak', sub: `${Math.round(by)} m · highest point`, x: bx, z: ridgeZ(bx) + 22 },
      { name: 'Base Lodge', sub: 'Valley floor', x: LODGE.x + 60, z: LODGE.z - 90 },
    ];
  }

  bindUI() {
    const ui = this.ui;
    ui.on('pickRun', (i) => { this.audio.init(); this.audio.click(); this.startRun(i); });
    ui.on('openPause', (section) => this.openPause(section));
    ui.on('pauseAct', (act) => {
      this.audio.click();
      if (act === 'resume') this.closeOverlay();
      else if (act === 'map') this.openMap();
      else if (act === 'restart') this.restart();
      else if (act === 'menu') this.showMenu();
    });
    ui.on('finishAct', (act) => {
      this.audio.click();
      const n = this.world.runs.length;
      if (act === 'next') this.startRun(((this.runIndex >= 0 ? this.runIndex : -1) + 1) % n);
      else if (act === 'again') this.startRun(Math.max(0, this.runIndex));
      else if (act === 'map') this.openMap();
    });
    ui.on('openMap', () => this.openMap());
    ui.on('closeMap', () => this.closeOverlay());
    ui.on('cycleCam', () => this.cycleCam());
    ui.on('teleportRun', (i) => { this.audio.click(); this.startRun(i); });
    ui.on('teleportSpot', (s) => { this.audio.click(); this.teleportTo(s.x, s.z, -1); });
    ui.on('setting', (k, v) => this.applySetting(k, v));
    const mc = document.getElementById('map-canvas');
    mc.addEventListener('click', (ev) => {
      const p = this.ui.mapToWorld(ev);
      // snap to a slope start if close
      let best = -1, bd = 1e9;
      this.world.runs.forEach((run, i) => {
        const s = run.path[0];
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        if (d < bd) { bd = d; best = i; }
      });
      this.audio.init(); this.audio.click();
      if (bd < 90) this.startRun(best);
      else this.teleportTo(clamp(p.x, -1900, 1900), clamp(p.z, -1900, 1900), -1);
    });
  }

  bindInputDevices() {
    const unlock = () => this.audio.init();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', () => { unlock(); this.enableTouchUI(); }, { passive: true });
    if (this.coarse) this.enableTouchUI();
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { drag = { x: e.clientX, y: e.clientY }; this.camRig.dragging = true; } });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      this.camRig.orbitYaw -= (e.clientX - drag.x) * 0.006;
      this.camRig.orbitPitch = clamp(this.camRig.orbitPitch + (e.clientY - drag.y) * 0.003, -0.25, 0.8);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    window.addEventListener('pointerup', () => { drag = null; this.camRig.dragging = false; });
    el.addEventListener('dblclick', () => {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      } catch (e) { /* fullscreen not allowed */ }
    });
    this.input.bindTouch(
      document.getElementById('stick-zone'), document.getElementById('stick-base'), document.getElementById('stick-knob'),
      [[document.getElementById('tb-jump'), 'jump', 'hold'], [document.getElementById('tb-grab'), 'grab', 'hold'], [document.getElementById('tb-glide'), 'glide', 'press']],
    );
  }

  enableTouchUI() {
    if (this.touchUI) return;
    this.touchUI = true;
    document.body.classList.add('touch');
    if (this.mode === 'play') this.ui.show('touch', !this.overlay);
  }

  // ------------------------------------------------------------ flow
  showMenu() {
    this.mode = 'menu';
    this.overlay = null;
    ['hud', 'touch', 'map', 'pause', 'finish'].forEach((id) => this.ui.show(id, false));
    this.ui.buildMenu(this.world, this.best);
    this.ui.show('menu', true);
    this.input.enabled = false;
  }

  startRun(i) {
    const p = this.world.startPose(i);
    this.teleportTo(p.x, p.z, i, p.heading);
  }

  teleportTo(x, z, runIndex, heading) {
    const w = this.world;
    if (heading === undefined) {
      const gx = w.heightBase(x + 4, z) - w.heightBase(x - 4, z);
      const gz = w.heightBase(x, z + 4) - w.heightBase(x, z - 4);
      heading = Math.hypot(gx, gz) > 0.05 ? Math.atan2(-gx, -gz) : 0;
      const ra = w.runAt(x, z);
      if (runIndex < 0 && ra.run >= 0 && ra.edge < 20) runIndex = -2 - ra.run; // inside a run but not at its start
    }
    this.lastTeleport = { x, z, runIndex, heading };
    this.skier.reset(x, z, heading);
    this.tracks.break(0); this.tracks.break(1);
    this.runIndex = runIndex >= 0 ? runIndex : runIndex <= -2 ? -2 - runIndex : -1;
    this.timing = false;
    this.fromTop = runIndex >= 0;
    this.runTime = 0; this.runScore = 0; this.progress = 0; this.topSpeed = 0; this.bestAir = 0;
    this.combo = 0; this.comboTimer = 0;
    this.hudRun = this.runIndex >= 0 ? w.runs[this.runIndex] : null;
    this.slopeDeg = null;
    this.mode = 'play';
    this.overlay = null;
    ['menu', 'map', 'pause', 'finish'].forEach((id) => this.ui.show(id, false));
    this.ui.show('hud', true);
    this.ui.show('touch', !!this.touchUI);
    this.ui.showStart(runIndex >= 0 ? this.world.runs[runIndex] : null, !!this.touchUI);
    this.input.enabled = true;
    this.input.clearEdges();
    this.camRig.snapNext = true;
    this.character.update(0.016, this.skier);
    this.camRig.update(0.016, this.skier, this.character);
    for (let k = 0; k < 6; k++) if (this.terrain.update(this.camera, 160) <= 0) break;
    this.acc = 0;
  }

  restart() {
    if (this.runIndex >= 0 && this.fromTop) this.startRun(this.runIndex);
    else if (this.lastTeleport) this.teleportTo(this.lastTeleport.x, this.lastTeleport.z, this.lastTeleport.runIndex, this.lastTeleport.heading);
    else this.startRun(0);
  }

  openPause(section) {
    if (this.mode === 'loading') return;
    if (this.mode === 'menu') {
      this.overlay = 'pause';
      this.ui.show('pause', true);
      if (section === 'controls') document.getElementById('controls-help').scrollIntoView({ block: 'start' });
      return;
    }
    this.overlay = 'pause';
    this.ui.show('pause', true);
    this.ui.show('map', false);
    this.ui.show('touch', false);
    this.input.enabled = false;
  }

  openMap() {
    if (this.mode === 'loading') return;
    this.overlay = 'map';
    this.ui.show('map', true);
    this.ui.show('pause', false);
    this.ui.show('finish', false);
    this.ui.show('touch', false);
    this.ui.drawMap(this.skier, this.runIndex);
    this.input.enabled = false;
  }

  closeOverlay() {
    this.ui.show('pause', false);
    this.ui.show('map', false);
    this.overlay = null;
    if (this.mode === 'menu') { this.ui.show('menu', true); return; }
    this.ui.show('touch', !!this.touchUI);
    this.input.enabled = true;
    this.input.clearEdges();
    this.lastFrame = performance.now();
  }

  cycleCam() {
    this.camRig.setMode(this.camRig.mode + 1);
    this.settings.camera = this.camRig.mode;
    this.ui.syncCamera(this.camRig.mode);
    this.persist();
    this.ui.hint(`Camera: ${CAM_MODES[this.camRig.mode]}`, 1.6);
  }

  applySetting(k, v) {
    this.settings[k] = v;
    if (k === 'assist') this.skier.assist = v;
    if (k === 'sound') this.audio.setMuted(!v);
    if (k === 'camera') this.camRig.setMode(v);
    if (k === 'outfit') this.character.setOutfit(v);
    if (k === 'quality') this.applyQuality(v);
    this.persist();
  }

  applyQuality(name) {
    const q = QUALITY[name];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const sh = this.sky.sun.shadow;
    sh.mapSize.set(q.shadowSize, q.shadowSize);
    if (sh.map) { sh.map.dispose(); sh.map = null; }
    const c = sh.camera;
    c.left = -q.shadowExtent; c.right = q.shadowExtent; c.top = q.shadowExtent; c.bottom = -q.shadowExtent;
    c.updateProjectionMatrix();
    this.sky.shadowExt = q.shadowExtent;
    this.terrain.splitK = q.splitK;
    this.terrain.budget = q.budget;
    this.terrainMat.userData.uniforms.uTreeFar.value = q.treeFar;
    this.terrainMat.userData.uniforms.uDetail.value = q.detail;
    const t = this.scenery.trees;
    t.near = q.treeNear; t.far = q.treeFar;
    for (const tile of t.tiles) if (tile.near) tile.near.castShadow = q.treeShadows;
    this.scenery.rocks.near = this.scenery.rocks.far = q.treeFar * 0.9;
    this.quality = q;
  }

  persist() {
    this.store.settings = this.settings;
    this.store.best = this.best;
    saveStore(this.store);
  }

  onResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ scoring
  describeTrick(e) {
    const spinDeg = Math.round(Math.abs(e.spin) / Math.PI) * 180;
    const flips = Math.round(Math.abs(e.flip) / TAU);
    const grabs = e.grabs.filter((g) => g.t > 0.12);
    const grabT = grabs.reduce((s, g) => s + Math.min(g.t, 3), 0);
    const N = ['', '', 'Double ', 'Triple ', 'Quad ', 'Quint '];
    const mult = (n) => N[n] !== undefined ? N[n] : `${n}× `;
    let name = '';
    if (flips > 0 && spinDeg >= 360) name = `${mult(flips)}${e.flip < 0 ? 'Cork' : 'Misty'} ${spinDeg}`;
    else if (flips > 0) name = `${mult(flips)}${e.flip < 0 ? 'Backflip' : 'Frontflip'}${spinDeg === 180 ? ' 180' : ''}`;
    else if (spinDeg >= 180) name = String(spinDeg);
    if (grabs.length) {
      const top = grabs.reduce((a, b) => (a.t > b.t ? a : b));
      name += (name ? ' ' : '') + (top.t > 0.9 ? 'Tweaked ' : '') + top.type;
    }
    const drop = e.drop > 8;
    if (!name) {
      if (e.airTime < 0.6 && !drop) return null;
      name = e.drop > 30 ? 'Huge Drop' : drop ? 'Cliff Drop' : e.airTime > 1.8 ? 'Big Air' : 'Air';
    }
    if (e.switchLanding) name += ' to Switch';
    const base = e.airTime * 110 + spinDeg * 1.6 + flips * 700 + grabT * 320 + (grabs.length ? 120 : 0)
      + (drop ? e.drop * 16 : 0) + Math.max(0, e.height - 2) * 20;
    const sub = [];
    if (drop) sub.push(`${Math.round(e.drop)} m drop`);
    if (e.airTime > 1) sub.push(`${e.airTime.toFixed(1)} s air`);
    return { name, base, sub: sub.join(' · ') };
  }

  award(name, pts, quality, sub) {
    const p = Math.round(pts);
    this.score += p;
    this.runScore += p;
    const extra = (this.combo > 1 ? `  ×${this.combo}` : '') + (sub ? `  ·  ${sub}` : '');
    this.ui.trickPopup(name, p, quality, extra);
  }

  onEvent(e) {
    const sk = this.skier, ui = this.ui;
    switch (e.type) {
      case 'start':
        this.timing = this.fromTop;
        this.runTime = 0;
        ui.hideStart();
        break;
      case 'takeoff':
        if (e.jumped) this.audio.whoosh(0.4);
        if (!this.hints.flip && sk.air.tHit > 1.1) {
          this.hints.flip = true;
          ui.hint(this.touchUI ? 'Stick up/down = flips, left/right = spins. Landing is automatic!' : 'Hold W / S to flip, A / D to spin, Shift to grab. You will land it!', 4);
        }
        break;
      case 'jump': {
        const f = sk.feet;
        for (let k = 0; k < 10; k++) this.particles.emit(f.x, f.y + 0.1, f.z, (Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3, 0.35, 0.8, 0.6, 2);
        break;
      }
      case 'land': this.onLand(e); break;
      case 'glideOpen':
        this.audio.canopy();
        this.camRig.addShake(0.3);
        if (!this.hints.glide) {
          this.hints.glide = true;
          ui.hint(this.touchUI ? 'Paragliding! Steer with the stick. Up = faster, down = brakes. Climb in thermals (orange swirls on the map).' : 'Paragliding! A / D turn, W speed bar, S brakes. Thermals (orange swirls on the map) lift you up. G to let go.', 6);
        }
        if (e.freefall > 1.4 && e.height > 15) {
          this.bumpCombo(true);
          this.award('BASE Jump', 400 + e.height * 12, 'clean', `${Math.round(e.height)} m freefall`);
        }
        break;
      case 'glideLand': {
        const pts = 80 + e.flight * 18;
        this.award(`Paraglide ${Math.round(e.flight)} s`, pts, null, 'touchdown');
        this.audio.thump(0.3);
        break;
      }
      case 'crash':
        this.combo = 0; this.comboTimer = 0;
        ui.trickPopup('Wipeout!', null, 'crash');
        this.audio.thump(1);
        this.camRig.addShake(1);
        break;
      case 'bump':
        this.audio.thump(clamp(e.impact / 14, 0.1, 0.8));
        this.camRig.addShake(clamp(e.impact / 15, 0.1, 0.8));
        if (e.x !== undefined) this.particles.burst(e.x, e.y, e.z, Math.round(10 + e.impact * 3), 1.4, 0.55, 1.6);
        if (e.impact > 9) { ui.trickPopup('Tree!', null, 'sketchy'); this.combo = 0; this.comboTimer = 0; }
        break;
      case 'hint': ui.hint(e.text, 2.5); break;
      default: break;
    }
  }

  bumpCombo(ok) {
    if (ok && this.comboTimer > 0) this.combo = Math.min(10, this.combo + 1);
    else this.combo = 1;
    this.comboTimer = 4.5;
  }

  onLand(e) {
    const sk = this.skier;
    this.camRig.addShake(clamp(e.impact / 13, 0.08, 1));
    this.audio.thump(clamp(e.impact / 15, 0.15, 1));
    const n = Math.round(clamp(8 + e.impact * 4, 8, 90) * this.quality.spray);
    this.particles.burst(e.x, e.y + 0.1, e.z, n, 2 + e.impact * 0.25, 0.55, 1.3, sk.vel);
    this.bestAir = Math.max(this.bestAir, e.airTime);
    const t = this.describeTrick(e);
    if (!t) return;
    const qm = { perfect: 1.5, clean: 1, sketchy: 0.35, crash: 0 }[e.quality];
    if (e.quality === 'crash') return;
    this.bumpCombo(e.quality !== 'sketchy');
    if (e.quality === 'sketchy') this.combo = 1;
    this.award(t.name, t.base * qm * this.combo, e.quality, t.sub);
    this.audio.chime(this.combo, e.quality !== 'sketchy');
  }

  finishRun() {
    this.timing = false;
    const run = this.world.runs[this.runIndex];
    const prev = this.best[run.id] || 0;
    const newBest = this.runScore > prev;
    if (newBest) { this.best[run.id] = this.runScore; this.persist(); }
    this.overlay = 'finish';
    this.ui.show('touch', false);
    this.input.enabled = false;
    this.ui.showFinish({ name: run.name, time: this.runTime, score: this.runScore, top: this.topSpeed * 3.6, air: this.bestAir, newBest: newBest && this.runScore > 0, best: prev });
    this.audio.chime(4, true);
  }

  // ------------------------------------------------------------ per-frame
  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    const dt = Math.min(0.05, Math.max(0.0001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const input = this.input;
    input.update(dt);

    if (input.consume('pause')) {
      if (this.overlay === 'pause' || this.overlay === 'map') this.closeOverlay();
      else if (this.mode === 'play' && !this.overlay) this.openPause();
    }
    if (input.consume('map') && this.mode !== 'loading') {
      if (this.overlay === 'map') this.closeOverlay(); else this.openMap();
    }
    if (this.mode === 'play' && !this.overlay) {
      if (input.consume('cam')) this.cycleCam();
      if (input.consume('reset')) this.restart();
    }

    const sk = this.skier;
    if (this.mode === 'play' && !this.overlay && !this.debugHold) {
      this.acc += dt;
      const inp = {
        steer: input.steer, fwd: input.fwd, back: input.back, jump: input.jump, grab: input.grab,
        glidePressed: input.consume('glide'), startPressed: input.fwd > 0.3 || input.jump,
      };
      let steps = 0;
      while (this.acc >= STEP && steps < 10) {
        sk.step(STEP, inp);
        inp.glidePressed = false;
        this.acc -= STEP;
        steps++;
      }
      if (steps === 10) this.acc = 0;
      for (const e of sk.events) this.onEvent(e);
      sk.events.length = 0;
      this.updateGame(dt);
    } else {
      input.consume('glide'); input.consume('cam'); input.consume('reset');
    }

    this.character.update(dt, sk);
    this.glider.update(dt, sk, this.character);
    this.character.root.updateMatrixWorld(true);

    if (this.mode === 'menu') this.updateMenuCamera(dt);
    else this.camRig.update(dt, sk, this.character);

    this.terrain.update(this.camera);
    this.scenery.update(dt, this.camera.position);
    this.sky.update(dt, this.mode === 'menu' ? this.camera.position : sk.feet, this.camera);
    if (this.mode === 'play') this.updateEffects(dt);
    this.particles.update(dt, this.camera, this.renderer, this.scene.fog);
    this.audio.update(dt, this.mode === 'play' && !this.overlay ? sk : { speed: 0, state: 'ready', glide: sk.glide, carve: 0, skid: 0, powder: 0 });

    if (this.mode === 'play') {
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.hudTimer = 0.066; this.ui.updateHud(this); }
      this.miniTimer -= dt;
      if (this.miniTimer <= 0) { this.miniTimer = 0.1; this.ui.drawMinimap(sk, this.camRig.yaw + this.camRig.orbitYaw); }
      this.ui.tickHint(dt);
      if (this.overlay === 'map') { this.mapTimer = (this.mapTimer || 0) - dt; if (this.mapTimer <= 0) { this.mapTimer = 0.5; this.ui.drawMap(sk, this.runIndex); } }
    }
    this.renderer.render(this.scene, this.camera);
  }

  updateGame(dt) {
    const sk = this.skier, w = this.world;
    if (sk.state !== 'ready') {
      if (this.timing) this.runTime += dt;
      this.topSpeed = Math.max(this.topSpeed, sk.speed);
    }
    if (sk.state === 'ground') {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTimer = 0; }
    }
    const ra = w.runAt(sk.feet.x, sk.feet.z);
    this.hudRun = ra.run >= 0 && ra.edge < 30 ? w.runs[ra.run] : null;
    if (this.runIndex >= 0) {
      const run = w.runs[this.runIndex];
      if (ra.run === this.runIndex && ra.edge < 80) this.progress = ra.s / run.length;
      if (this.timing && ra.run === this.runIndex && ra.s > run.length - 95 && ra.edge < 60 && sk.state === 'ground') this.finishRun();
    } else this.progress = 0;
    this.slopeDeg = sk.state === 'ground' ? Math.acos(clamp(sk.n.y, -1, 1)) * 57.2958 : null;

    // Paraglider prompt when you are falling a long way
    if (sk.state === 'air' && sk.agl() > 22 && sk.air.tHit > 1.6 && (this.hints.chute || 0) < 3 && !this.hintShownThisAir) {
      this.hintShownThisAir = true;
      this.hints.chute = (this.hints.chute || 0) + 1;
      this.ui.hint(this.touchUI ? 'Big drop! Tap GLIDE to pull the paraglider' : 'Big drop! Press G to pull the paraglider', 2.5);
    }
    if (sk.state !== 'air') this.hintShownThisAir = false;
  }

  updateEffects(dt) {
    const sk = this.skier, P = this.particles, ch = this.character;
    const v = this._v, w = this._w;
    if (sk.state === 'ground') {
      const speed = sk.speed;
      const q = this.quality.spray;
      const amt = (sk.skid * 1.1 + sk.carve * 0.14 + sk.powder * 0.2) * clamp(speed / 10, 0, 1.6);
      this.sprayAcc += amt * dt * 110 * q;
      const lx = Math.cos(sk.heading), lz = -Math.sin(sk.heading);
      const side = Math.sign(sk.sideSlip || -sk.lean || 1);
      let guard = 0;
      while (this.sprayAcc > 1 && guard++ < 40) {
        this.sprayAcc -= 1;
        const i = Math.random() < 0.5 ? 0 : 1;
        ch.skiTail(i, v);
        const s = 1.5 + Math.random() * 2.5 + sk.skid * 2.5;
        P.emit(v.x, v.y + 0.04, v.z,
          sk.vel.x * 0.25 + lx * side * s + (Math.random() - 0.5), 1 + Math.random() * 2.2 + sk.skid * 1.5, sk.vel.z * 0.25 + lz * side * s + (Math.random() - 0.5),
          0.22 + Math.random() * 0.3 + sk.skid * 0.2, 0.5 + Math.random() * 0.6, 0.45 + 0.3 * sk.skid, 1.8, 2.6);
      }
      if (sk.powder > 0.3 && speed > 4) {
        this.powderAcc += sk.powder * clamp(speed / 15, 0, 1.5) * dt * 40 * q;
        while (this.powderAcc > 1) {
          this.powderAcc -= 1;
          ch.skiTip(Math.random() < 0.5 ? 0 : 1, v);
          P.emit(v.x, v.y + 0.1, v.z, sk.vel.x * 0.5 + (Math.random() - 0.5) * 1.5, 0.8 + Math.random() * 1.6, sk.vel.z * 0.5 + (Math.random() - 0.5) * 1.5,
            0.5 + Math.random() * 0.5, 1.2 + Math.random() * 0.9, 0.45, 2.6, 1.6);
        }
      }
      // ski tracks
      for (let i = 0; i < 2; i++) {
        ch.skis[i].g.getWorldPosition(w);
        w.y = this.world.height(w.x, w.z);
        this.tracks.add(i, w, sk.n, sk.powder, sk.carve);
      }
    } else {
      this.tracks.break(0); this.tracks.break(1);
    }
    if (sk.state === 'glide' && sk.glide.t < 0.6) {
      // canopy opening puff
      if (Math.random() < 0.5) { const f = sk.pos; P.emit(f.x, f.y + 3, f.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 0.6, 0.6, 0.25, 2); }
    }
  }

  // Test hook: advance the simulation deterministically (60 fps frames) without rendering.
  debugRun(seconds, inp = {}) {
    this.debugHold = true;
    const base = { steer: 0, fwd: 0, back: 0, jump: false, grab: false, glidePressed: false, startPressed: false };
    const input = Object.assign(base, inp);
    const n = Math.max(1, Math.round(seconds * 60));
    for (let f = 0; f < n; f++) {
      for (let k = 0; k < 2; k++) { this.skier.step(STEP, input); input.glidePressed = false; input.startPressed = false; }
      for (const e of this.skier.events) this.onEvent(e);
      this.skier.events.length = 0;
      this.updateGame(1 / 60);
      this.character.update(1 / 60, this.skier);
      this.glider.update(1 / 60, this.skier, this.character);
      this.character.root.updateMatrixWorld(true);
      this.camRig.update(1 / 60, this.skier, this.character);
      this.updateEffects(1 / 60);
      this.particles.update(1 / 60, this.camera, this.renderer, this.scene.fog);
    }
    const sk = this.skier;
    return { state: sk.state, speed: +(sk.speed * 3.6).toFixed(1), x: +sk.pos.x.toFixed(1), y: +sk.pos.y.toFixed(1), z: +sk.pos.z.toFixed(1), agl: +sk.agl().toFixed(1), score: this.score };
  }

  updateMenuCamera(dt) {
    this.menuT += dt;
    const a = Math.sin(this.menuT * 0.045) * 0.55;
    const cx = 120, cz = -350;
    this.camera.position.set(cx + Math.sin(a) * 3300, 1250, cz + Math.cos(a) * 3300);
    this.camera.up.set(0, 1, 0);
    this.camera.fov = this.camRig.baseFov(52);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(cx, 620, cz - 300);
  }
}

function start(hot) {
  const game = new Game();
  window.__game = game;
  game.init(hot || {}).catch((err) => {
    console.error(err);
    const t = document.getElementById('load-text');
    if (t) t.textContent = `Could not start the game: ${err && err.message ? err.message : err}. WebGL may be disabled in this browser.`;
  });
}

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start(hot && hot.data ? hot.data : {});
