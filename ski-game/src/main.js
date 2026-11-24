// Summit Freeride: game orchestration, loop, scoring, teleporting and settings.
import * as THREE from 'three';
import { World, ridgeZ, peakH, LODGE, HUT, DN } from './world.js';
import { Skier } from './skier.js';
import { placeRings } from './rings.js';
import { Terrain, createTerrainMaterial, makeNoiseTexture } from './terrain.js';
import { SkySystem, createBackdrop, SUN_DIR, WEATHER } from './sky.js';
import { Scenery } from './scenery.js';
import { Character, OUTFITS } from './character.js';
import { GliderModel } from './glider.js';
import { SnowParticles, SkiTracks, TrickTrail, AirParticles } from './effects.js';
import { CameraRig, CAM_MODES } from './camera.js';
import { Input } from './input.js';
import { GameAudio } from './audio.js';
import { UI } from './ui.js';
import { clamp, damp, TAU } from './util.js';

const STEP = 1 / 120;
const STORE_KEY = 'summit-freeride-v2';
const QUALITY = {
  low: { pixelRatio: 1.5, shadowSize: 1024, shadowExtent: 30, splitK: 1.8, treeNear: 150, treeFar: 560, treeShadows: false, budgetMs: 2.5, detail: 0.6, spray: 0.6, particles: 2600, air: 0.5 },
  medium: { pixelRatio: 1.5, shadowSize: 2048, shadowExtent: 40, splitK: 2.4, treeNear: 230, treeFar: 900, treeShadows: true, budgetMs: 3, detail: 1, spray: 1, particles: 4500, air: 0.8 },
  high: { pixelRatio: 2, shadowSize: 4096, shadowExtent: 48, splitK: 3.1, treeNear: 330, treeFar: 1350, treeShadows: true, budgetMs: 4, detail: 1, spray: 1.3, particles: 6000, air: 1 },
};
// How bright airborne snow looks under each sky
const PARTICLE_LIGHT = { bluebird: [1, 1, 1], golden: [1, 0.86, 0.74], night: [0.34, 0.42, 0.62], storm: [0.84, 0.86, 0.9] };

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
      slowmo: st.slowmo !== undefined ? st.slowmo : true,
      camera: st.camera || 0,
      outfit: st.outfit || 0,
      weather: WEATHER[st.weather] ? st.weather : 'bluebird',
    };
    this.best = this.store.best || {};
    this.bestRings = this.store.rings || {};
    this.bestFlight = this.store.flight || 0;
    this.mode = 'loading';
    this.overlay = null;
    this.score = 0; this.runScore = 0; this.combo = 0; this.comboTimer = 0;
    this.runIndex = -1; this.timing = false; this.runTime = 0; this.progress = 0;
    this.topSpeed = 0; this.bestAir = 0; this.bestDist = 0;
    this.ringGot = 0; this.ringTotal = 0; this.ringStreak = 0; this.ringTimer = 0;
    this.timeScale = 1; this.slowmo = 0; this.whiteout = 0; this.frost = 0;
    this.aval = { armed: false, active: false, s: 0, v: 0, gap: 999, t: 0, emit: 0, lastS: 0 };
    this.fx = { timeScale: 1, avalanche: 0 };
    this.silent = { speed: 0, state: 'ready', glide: null, carve: 0, skid: 0, powder: 0 };
    this.inp = { steer: 0, fwd: 0, back: 0, jump: false, grab: false, glidePressed: false, startPressed: false };
    this.glideQ = false;
    this.hints = {};
    this.sprayAcc = 0; this.powderAcc = 0; this.smokeAcc = 0;
    this.menuT = 0; this.playTime = 0;
    this.lastFrame = performance.now();
    this.dtAvg = 1 / 60;
    this.drs = { on: true, scale: 1, acc: 0, n: 0, good: 0, bad: 0 };
    this.hudTimer = 0; this.miniTimer = 0; this.mapTimer = 0;
    this._v = new THREE.Vector3(); this._w = new THREE.Vector3(); this._c = new THREE.Vector3();
    this._light = new THREE.Color(1, 1, 1);
    this.lastTeleport = null;
    this.flightJump = false;
    this._frame = (t) => this.frame(t);
  }

  async init(hot) {
    const q = QUALITY[this.settings.quality];
    this.quality = q;
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.coarse, powerPreference: 'high-performance' });
    this.basePR = Math.min(window.devicePixelRatio || 1, q.pixelRatio);
    this.renderer.setPixelRatio(this.basePR);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.25, 34000);
    this.camera.position.set(0, 1700, 4600);

    this.world = new World();
    await this.world.generate((p, label) => this.ui.setLoading(p * 0.82, label));
    const tick = () => new Promise((r) => setTimeout(r, 0));
    this.ui.setLoading(0.84, 'Hanging rings on the jump lines');
    await tick();
    placeRings(this.world);
    this.ui.setLoading(0.86, 'Lighting the sky');
    await tick();

    this.sky = new SkySystem(this.renderer, this.scene, q);
    const maskTex = new THREE.DataTexture(this.world.maskData, DN, DN, THREE.RGBAFormat, THREE.UnsignedByteType);
    maskTex.magFilter = THREE.LinearFilter; maskTex.minFilter = THREE.LinearFilter;
    maskTex.needsUpdate = true;
    const aniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.terrainMat = createTerrainMaterial(maskTex, makeNoiseTexture(aniso), SUN_DIR, { treeFar: q.treeFar, detail: q.detail, splitK: q.splitK });
    this.terrain = new Terrain(this.world, this.terrainMat, { splitK: q.splitK, budgetMs: q.budgetMs });
    this.terrain.init(3);
    this.scene.add(this.terrain.group);
    this.ui.setLoading(0.89, 'Raising distant peaks');
    await tick();
    this.scene.add(createBackdrop(this.world));
    this.ui.setLoading(0.92, 'Planting trees');
    await tick();
    this.scenery = new Scenery(this.scene, this.world, q);

    this.skier = new Skier(this.world);
    this.skier.assist = this.settings.assist;
    this.silent.glide = this.skier.glide;
    this.character = new Character(this.settings.outfit);
    this.scene.add(this.character.root);
    this.scene.add(this.character.scarf);
    this.glider = new GliderModel();
    this.character.root.add(this.glider.group);
    this.particles = new SnowParticles(this.scene, q.particles, this.coarse ? 200 : 320);
    this.tracks = new SkiTracks(this.scene, 4000);
    this.trails = [new TrickTrail(this.scene), new TrickTrail(this.scene)];
    this.air = new AirParticles(this.scene, 3600);
    this.character.onPolePlant = (p) => {
      for (let k = 0; k < 5; k++) this.particles.emit(p.x, p.y + 0.05, p.z, (Math.random() - 0.5) * 1.2, 0.8 + Math.random(), (Math.random() - 0.5) * 1.2, 0.18, 0.5, 0.7, 1.5);
    };
    this.camRig = new CameraRig(this.camera, this.world);
    this.camRig.setMode(this.settings.camera);
    this.input = new Input();
    this.audio = new GameAudio();
    this.audio.muted = !this.settings.sound;
    this.applyOutfit(this.settings.outfit);
    this.applyWeather(this.settings.weather, true);

    this.ui.setLoading(0.95, 'Drawing the trail map');
    await tick();
    this.ringTotals = this.world.runs.map((r, i) => this.world.rings.filter((g) => g.run === i).length);
    this.ui.buildMapBase(this.world);
    this.hubState = { best: this.best, rings: this.bestRings, ringTotals: this.ringTotals, flight: this.bestFlight, extras: this.extraSpots(), weather: this.settings.weather };
    this.ui.buildHub(this.world, this.hubState);
    this.ui.bindSettings(this.settings);
    this.bindUI();
    this.bindInputDevices();

    // Park the skier at the first slope so the scene has a subject behind the menu
    const p0 = this.world.startPose(0);
    this.skier.reset(p0.x, p0.z, p0.heading);
    this.character.update(0.016, this.skier);
    this.updateMenuCamera(0);
    for (let i = 0; i < 4; i++) this.terrain.update(this.camera, 150);
    this.ui.setLoading(0.98, 'Waxing skis');
    await tick();
    this.warmUp();
    this.ui.setLoading(1, 'Ready');

    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => {
      this.audio.setHidden(document.hidden);
      if (document.hidden && this.mode === 'play' && !this.overlay) this.openPause();
      this.lastFrame = performance.now();
    });
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
      window.claude.hot.snapshot(() => ({ run: this.runIndex, score: this.score, mode: this.mode }));
    }
    this.ui.show('loading', false);
    if (hot && hot.mode === 'play' && hot.run >= 0 && hot.run < this.world.runs.length) {
      this.score = hot.score || 0;
      this.startRun(hot.run);
    } else this.showMenu();
    requestAnimationFrame(this._frame);
  }

  // Compile every shader up front (including things that are normally hidden) so the first
  // jump, glider pull or ring pickup never hitches.
  warmUp() {
    const hidden = [this.glider.group, this.character.wingMesh, this.trails[0].mesh, this.trails[1].mesh, this.particles.points];
    const prev = hidden.map((o) => o.visible);
    hidden.forEach((o) => { o.visible = true; });
    try { this.renderer.compile(this.scene, this.camera); } catch (e) { /* compile is only an optimisation */ }
    hidden.forEach((o, i) => { o.visible = prev[i]; });
  }

  extraSpots() {
    let bx = 0, by = -1e9;
    for (let x = -1400; x <= 1400; x += 20) { const h = peakH(x); if (h > by) { by = h; bx = x; } }
    return [
      { name: 'Summit Peak', sub: `${Math.round(by)} m · the highest point, front side`, x: bx, z: ridgeZ(bx) + 22 },
      { name: 'Summit Peak North', sub: 'Drop the steep back side from the very top', x: bx, z: ridgeZ(bx) - 24 },
      { name: 'Base Lodge', sub: 'Front valley floor', x: LODGE.x + 60, z: LODGE.z - 90 },
      { name: 'North Hut', sub: 'Back valley floor', x: HUT.x + 40, z: HUT.z + 80 },
    ];
  }

  bindUI() {
    const ui = this.ui;
    ui.on('pickRun', (i) => { this.audio.init(); this.audio.click(); this.startRun(i); });
    ui.on('openPause', (section) => this.openPause(section));
    ui.on('pauseAct', (act) => {
      this.audio.click();
      if (act === 'resume') this.closeOverlay();
      else if (act === 'map') this.openHub();
      else if (act === 'restart') this.restart();
      else if (act === 'lift') this.startRun(this.runIndex >= 0 ? this.runIndex : Math.max(0, this.nearestRun()));
    });
    ui.on('finishAct', (act) => {
      this.audio.click();
      const n = this.world.runs.length;
      if (act === 'next') this.startRun(((this.runIndex >= 0 ? this.runIndex : -1) + 1) % n);
      else if (act === 'again') this.startRun(Math.max(0, this.runIndex));
      else if (act === 'map') this.openHub();
    });
    ui.on('openHub', () => this.openHub());
    ui.on('closeHub', () => this.closeOverlay());
    ui.on('cycleCam', () => this.cycleCam());
    ui.on('teleportSpot', (s) => { this.audio.init(); this.audio.click(); this.teleportTo(s.x, s.z, -1); });
    ui.on('setting', (k, v) => this.applySetting(k, v));
  }

  bindInputDevices() {
    const unlock = () => this.audio.init();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', () => { unlock(); this.enableTouchUI(); }, { passive: true });
    if (this.coarse) this.enableTouchUI();
    const el = this.renderer.domElement;
    let drag = false, lx = 0, ly = 0;
    const endDrag = () => { drag = false; this.camRig.dragging = false; };
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = true; lx = e.clientX; ly = e.clientY; this.camRig.dragging = true;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!(e.buttons & 1)) { endDrag(); return; }
      this.camRig.orbitYaw -= (e.clientX - lx) * 0.006;
      this.camRig.orbitPitch = clamp(this.camRig.orbitPitch + (e.clientY - ly) * 0.003, -0.25, 0.8);
      lx = e.clientX; ly = e.clientY;
    });
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', endDrag);
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

  blurFocus() {
    const a = document.activeElement;
    if (a && a !== document.body && a.blur) a.blur();
  }

  // ------------------------------------------------------------ flow
  showMenu() {
    this.mode = 'menu';
    this.overlay = 'hub';
    ['hud', 'touch', 'pause', 'finish'].forEach((id) => this.ui.show(id, false));
    this.ui.show('hub-close', false);
    this.ui.show('hub', true);
    this.ui.drawMap(this.skier, false);
    this.input.enabled = false;
  }

  nearestRun() {
    const ra = this.world.runAt(this.skier.feet.x, this.skier.feet.z);
    return ra.run;
  }

  startRun(i) {
    const p = this.world.startPose(i);
    this.teleportTo(p.x, p.z, i, p.heading);
  }

  teleportTo(x, z, runIndex, heading) {
    const w = this.world;
    const ra0 = w.runAt(x, z);
    const partial = ra0.run >= 0 && ra0.edge < 20 ? ra0.run : -1; // inside a run but not at its start
    if (heading === undefined) {
      const gx = w.heightBase(x + 4, z) - w.heightBase(x - 4, z);
      const gz = w.heightBase(x, z + 4) - w.heightBase(x, z - 4);
      heading = Math.hypot(gx, gz) > 0.05 ? Math.atan2(-gx, -gz) : 0;
    }
    this.lastTeleport = { x, z, runIndex, heading };
    this.skier.reset(x, z, heading);
    this.tracks.break(0); this.tracks.break(1);
    this.runIndex = runIndex >= 0 ? runIndex : partial;
    this.fromTop = runIndex >= 0;
    this.timing = false;
    this.runTime = 0; this.runScore = 0; this.progress = 0; this.topSpeed = 0; this.bestAir = 0; this.bestDist = 0;
    this.combo = 0; this.comboTimer = 0; this.ringStreak = 0;
    this.hudRun = this.runIndex >= 0 ? w.runs[this.runIndex] : null;
    this.slopeDeg = null;
    this.timeScale = 1; this.slowmo = 0; this.whiteout = 0; this.frost = 0;
    this.glideQ = false; this.flightJump = false; this.playTime = 0;
    // fresh rings on a run you start from the top
    if (runIndex >= 0) {
      for (const r of w.rings) if (r.run === runIndex) r.got = false;
      this.scenery.refreshRings();
    }
    this.countRings();
    const av = this.aval;
    av.active = false; av.gap = 999; av.t = 0;
    av.armed = runIndex >= 0 && !!w.runs[runIndex].avalanche;
    // drop anything left over from before the jump
    this.glider.s = 0; this.glider.group.visible = false;
    this.character.snap();
    this.particles.clear();
    this.camRig.snap();
    this.mode = 'play';
    this.overlay = null;
    ['hub', 'pause', 'finish'].forEach((id) => this.ui.show(id, false));
    this.ui.show('hud', true);
    this.ui.show('touch', !!this.touchUI);
    this.ui.clearHint();
    this.ui.showStart(runIndex >= 0 ? w.runs[runIndex] : null, !!this.touchUI);
    this.input.enabled = true;
    this.input.clearEdges();
    this.blurFocus();
    this.character.update(0.016, this.skier);
    this.camRig.update(0.016, this.skier, this.character, 0);
    for (let k = 0; k < 6; k++) if (this.terrain.update(this.camera, 180) <= 0) break;
    this.lastFrame = performance.now();
  }

  countRings() {
    let got = 0, total = 0;
    if (this.runIndex >= 0) for (const r of this.world.rings) if (r.run === this.runIndex) { total++; if (r.got) got++; }
    this.ringGot = got; this.ringTotal = total;
  }

  restart() {
    if (this.runIndex >= 0 && this.fromTop) this.startRun(this.runIndex);
    else if (this.lastTeleport) this.teleportTo(this.lastTeleport.x, this.lastTeleport.z, this.lastTeleport.runIndex, this.lastTeleport.heading);
    else this.startRun(0);
  }

  openPause(section) {
    if (this.mode === 'loading') return;
    const inMenu = this.mode === 'menu';
    this.pauseFrom = this.overlay;
    this.overlay = 'pause';
    this.ui.el['pause-title'].textContent = inMenu ? 'Settings' : 'Paused';
    document.querySelectorAll('[data-act="restart"], [data-act="lift"], [data-act="map"]').forEach((b) => { b.hidden = inMenu; });
    this.ui.show('pause', true);
    this.ui.show('hub', false);
    this.ui.show('touch', false);
    this.input.enabled = false;
    if (section === 'controls') document.getElementById('controls-help').scrollIntoView({ block: 'start' });
  }

  openHub() {
    if (this.mode === 'loading') return;
    this.overlay = 'hub';
    this.hubState.flight = this.bestFlight;
    if (this.mode === 'play') {
      if (this.runIndex >= 0) this.ui.select(this.runIndex, null, false);
      this.ui.show('hub-close', true);
    }
    this.ui.show('hub', true);
    this.ui.show('pause', false);
    this.ui.show('finish', false);
    this.ui.show('touch', false);
    this.ui.show('hud', false);
    this.ui.drawMap(this.skier, this.mode === 'play');
    this.input.enabled = false;
  }

  closeOverlay() {
    this.blurFocus();
    this.ui.show('pause', false);
    if (this.mode === 'menu') { this.overlay = 'hub'; this.ui.show('hub', true); return; }
    this.ui.show('hub', false);
    this.overlay = null;
    this.ui.show('hud', true);
    this.ui.show('touch', !!this.touchUI);
    this.input.enabled = true;
    this.input.clearEdges();
    this.glideQ = false;
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
    if (k === 'outfit') this.applyOutfit(v);
    if (k === 'quality') this.applyQuality(v);
    if (k === 'weather') this.applyWeather(v);
    this.persist();
  }

  applyOutfit(i) {
    this.character.setOutfit(i);
    const c = OUTFITS[i % OUTFITS.length].accent;
    this.accent = [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
    for (const t of this.trails) t.setColor(c);
  }

  applyWeather(name, quiet) {
    const W = this.sky.setWeather(name);
    this.terrainMat.userData.uniforms.uSparkle.value = W.sparkle;
    this.air.setDensity((W.snow ? 1 : 0.2 * W.motes) * this.quality.air, !!W.snow);
    this.air.mat.uniforms.uColor.value.setRGB(...(name === 'night' ? [0.6, 0.72, 1] : [1, 1, 1]));
    const pl = PARTICLE_LIGHT[name] || PARTICLE_LIGHT.bluebird;
    this._light.setRGB(pl[0], pl[1], pl[2]);
    if (this.scenery.lodgeGlass) this.scenery.lodgeGlass.emissiveIntensity = name === 'night' ? 2.2 : name === 'golden' ? 1.1 : 0.55;
    if (this.hubState) this.hubState.weather = name;
    this.ui.syncWeather(name);
    if (!quiet && this.mode === 'play' && !this.overlay) this.ui.hint(W.label, 1.6);
  }

  applyQuality(name) {
    const q = QUALITY[name];
    this.quality = q;
    this.basePR = Math.min(window.devicePixelRatio || 1, q.pixelRatio);
    this.drs.scale = 1;
    this.renderer.setPixelRatio(this.basePR);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const sh = this.sky.sun.shadow;
    sh.mapSize.set(q.shadowSize, q.shadowSize);
    if (sh.map) { sh.map.dispose(); sh.map = null; }
    const c = sh.camera;
    c.left = -q.shadowExtent; c.right = q.shadowExtent; c.top = q.shadowExtent; c.bottom = -q.shadowExtent;
    c.updateProjectionMatrix();
    this.sky.shadowExt = q.shadowExtent;
    this.terrain.setSplitK(q.splitK);
    this.terrain.budgetMs = q.budgetMs;
    this.terrainMat.userData.uniforms.uTreeFar.value = q.treeFar;
    this.terrainMat.userData.uniforms.uDetail.value = q.detail;
    const t = this.scenery.trees;
    t.near = q.treeNear; t.far = q.treeFar;
    for (const tile of t.tiles) if (tile.near) tile.near.castShadow = q.treeShadows;
    this.scenery.rocks.near = this.scenery.rocks.far = q.treeFar * 0.9;
    this.applyWeather(this.settings.weather, true);
  }

  persist() {
    this.store.settings = this.settings;
    this.store.best = this.best;
    this.store.rings = this.bestRings;
    this.store.flight = this.bestFlight;
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
    const mult = (n) => (N[n] !== undefined ? N[n] : `${n}× `);
    let name = '';
    if (flips > 0 && spinDeg >= 360) name = `${mult(flips)}${e.flip < 0 ? 'Cork' : 'Misty'} ${spinDeg}`;
    else if (flips > 0) name = `${mult(flips)}${e.flip < 0 ? 'Backflip' : 'Frontflip'}${spinDeg === 180 ? ' 180' : ''}`;
    else if (spinDeg >= 180) name = String(spinDeg);
    if (grabs.length) {
      const top = grabs.reduce((a, b) => (a.t > b.t ? a : b));
      name += (name ? ' ' : '') + (top.t > 0.9 ? 'Tweaked ' : '') + top.type;
    }
    const drop = e.drop > 8 && !e.pipe;
    if (!name) {
      if (e.pipe) { if (e.height < 1.2) return null; name = e.height > 4.5 ? 'Huge Pipe Air' : 'Pipe Air'; }
      else if (e.airTime < 0.7 && !drop) return null;
      else name = e.drop > 30 ? 'Huge Drop' : drop ? 'Cliff Drop' : e.airTime > 2 ? 'Big Air' : 'Air';
    } else if (e.pipe) name = `Pipe ${name}`;
    if (e.switchLanding) name += ' to Switch';
    const base = e.airTime * 110 + spinDeg * 1.6 + flips * 700 + grabT * 320 + (grabs.length ? 120 : 0)
      + (drop ? e.drop * 16 : 0) + Math.max(0, e.height - 2) * (e.pipe ? 70 : 20) + Math.max(0, e.dist - 25) * 4;
    const sub = [];
    if (e.pipe) sub.push(`${e.height.toFixed(1)} m above the lip`);
    else if (drop) sub.push(`${Math.round(e.drop)} m drop`);
    if (!e.pipe && e.dist > 25) sub.push(`${Math.round(e.dist)} m`);
    if (e.airTime > 1) sub.push(`${e.airTime.toFixed(1)} s`);
    const trick = flips > 0 || spinDeg >= 180 || grabs.length > 0 || !!e.pipe;
    return { name, base, sub: sub.join(' · '), big: flips > 0 || spinDeg >= 360, trick };
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
      case 'takeoff': {
        if (e.jumped) this.audio.whoosh(0.4);
        const fd = this.world.flightDeck, lip = this.scenery.flightLip;
        this.flightJump = !!(fd && lip && Math.hypot(sk.pos.x - lip.x, sk.pos.z - lip.z) < 14 && sk.speed > 12);
        if (!this.hints.flip && sk.air.tHit > 1.1) {
          this.hints.flip = true;
          ui.hint(this.touchUI ? 'Stick up/down = flips, left/right = spins. Landing is automatic!' : 'Hold W / S to flip, A / D to spin, Shift to grab. You will land it!', 4);
        }
        break;
      }
      case 'jump': {
        const f = sk.feet;
        for (let k = 0; k < 10; k++) this.particles.emit(f.x, f.y + 0.1, f.z, (Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3, 0.35, 0.8, 0.6, 2);
        break;
      }
      case 'land': this.onLand(e); break;
      case 'wingOpen':
        this.audio.whoosh(0.9);
        this.flightJump = false;
        if (!this.hints.wing) {
          this.hints.wing = true;
          ui.hint(this.touchUI ? 'Wingsuit! Keep holding. Stick up = dive, down = flare. Tap GLIDE to pull the paraglider.' : 'Wingsuit! Keep holding Space. W dives, S flares, A / D bank. Press G for the paraglider.', 6);
        }
        break;
      case 'wingClose':
        if (e.time > 0.8) {
          this.bumpCombo(true);
          const sub = e.prox > 0.4 ? `${e.prox.toFixed(1)} s proximity flying` : '';
          this.award(`Wingsuit ${e.time.toFixed(1)} s`, (e.time * 90 + e.prox * 450) * this.combo, e.touchdown ? 'sketchy' : 'clean', sub);
        }
        if (e.touchdown) {
          this.particles.burst(e.x, e.y + 0.2, e.z, Math.round(70 * this.quality.spray), 7, 0.8, 1.6, sk.vel);
          this.audio.thump(0.9);
          this.camRig.addShake(0.9);
        }
        break;
      case 'glideOpen':
        this.audio.canopy();
        this.camRig.addShake(0.3);
        this.flightJump = false;
        if (!this.hints.glide) {
          this.hints.glide = true;
          ui.hint(this.touchUI ? 'Paragliding! Steer with the stick. Up = faster, down = brakes. Circle under the birds to climb.' : 'Paragliding! A / D turn, W speed bar, S brakes. Circle under the birds to climb. G to let go.', 6);
        }
        if (e.freefall > 1.4 && e.height > 15) {
          this.bumpCombo(true);
          this.award('BASE Jump', (400 + e.height * 12) * this.combo, 'clean', `${Math.round(e.height)} m freefall`);
        }
        break;
      case 'glideLand':
        if (e.flight > 2.5) this.award(`Paraglide ${Math.round(e.flight)} s`, 80 + e.flight * 18, null, 'touchdown');
        this.audio.thump(0.3);
        break;
      case 'crash':
        this.combo = 0; this.comboTimer = 0;
        ui.trickPopup(this.whiteout > 0.5 ? 'Buried!' : 'Wipeout!', null, 'crash');
        this.audio.thump(1);
        this.camRig.addShake(1);
        break;
      case 'bump':
        this.audio.thump(clamp(e.impact / 14, 0.1, 0.8));
        this.camRig.addShake(clamp(e.impact / 15, 0.1, 0.8));
        if (e.x !== undefined) this.particles.burst(e.x, e.y, e.z, Math.round(10 + e.impact * 3), 1.4, 0.55, 1.6);
        if (e.impact > 9 && e.tree) { ui.trickPopup('Tree!', null, 'sketchy'); this.combo = 0; this.comboTimer = 0; }
        break;
      case 'hint': ui.hint(e.text, 2.5); break;
      default: break;
    }
  }

  bumpCombo(ok) {
    if (ok && this.comboTimer > 0) this.combo = Math.min(8, this.combo + 1);
    else this.combo = 1;
    this.comboTimer = 4.5;
  }

  onLand(e) {
    const sk = this.skier;
    // scraping down a cliff face produces tiny hops: no fanfare for those
    const tiny = e.airTime < 0.12 && e.impact < 3;
    if (!tiny) {
      this.camRig.addShake(clamp(e.impact / 13, 0.08, 1));
      this.audio.thump(clamp(e.impact / 15, 0.15, 1));
      const n = Math.round(clamp(8 + e.impact * 4, 8, 90) * this.quality.spray);
      this.particles.burst(e.x, e.y + 0.1, e.z, n, 2 + e.impact * 0.25, 0.55, 1.3, sk.vel);
    }
    this.bestAir = Math.max(this.bestAir, e.airTime);
    if (e.wingTime < 0.3 && !e.fromGlider) this.bestDist = Math.max(this.bestDist, e.dist);
    if (e.quality === 'crash') { this.flightJump = false; return; }
    const qm = { perfect: 1.5, clean: 1, sketchy: 0.35 }[e.quality];
    // Flight Deck: measured ski flight
    if (this.flightJump && e.wingTime < 0.3 && !e.fromGlider) {
      this.flightJump = false;
      const lip = this.scenery.flightLip;
      const d = Math.hypot(e.x - lip.x, e.y - lip.y, e.z - lip.z);
      if (d > 30) {
        const record = d > this.bestFlight + 0.5;
        if (record) { this.bestFlight = d; this.persist(); }
        this.bumpCombo(e.quality !== 'sketchy');
        this.award(`${Math.round(d)} m Ski Flight`, d * 26 * qm * this.combo, e.quality, record ? 'new hill record!' : `hill record ${Math.round(this.bestFlight)} m`);
        this.audio.chime(this.combo + (record ? 3 : 0), true);
        if (record) this.particles.sparkle(e.x, e.y + 1.2, e.z, 60, 7, 1, 0.8, 0.2);
        return;
      }
    }
    this.flightJump = false;
    const t = this.describeTrick(e);
    if (!t) return;
    if (!t.trick) {
      // plain airs and drops score on their own and keep a running combo alive
      if (this.combo > 0) this.comboTimer = 4.5;
      const keep = this.combo;
      this.combo = 0;
      this.award(t.name, t.base * qm, e.quality, t.sub);
      this.combo = keep;
      this.audio.chime(0, e.quality !== 'sketchy');
      return;
    }
    this.bumpCombo(e.quality !== 'sketchy');
    if (e.quality === 'sketchy') this.combo = 1;
    this.award(t.name, t.base * qm * this.combo, e.quality, t.sub);
    this.audio.chime(this.combo, e.quality !== 'sketchy');
    if (t.big && e.quality === 'perfect') this.particles.sparkle(e.x, e.y + 1, e.z, 36, 5, this.accent[0], this.accent[1], this.accent[2]);
  }

  finishRun() {
    this.timing = false;
    const run = this.world.runs[this.runIndex];
    const prev = this.best[run.id] || 0;
    const newBest = this.runScore > prev;
    if (newBest) this.best[run.id] = this.runScore;
    if (this.ringGot > (this.bestRings[run.id] || 0)) this.bestRings[run.id] = this.ringGot;
    this.persist();
    let note = '';
    if (run.avalanche && this.aval.outran) note = 'You outran the avalanche!';
    else if (this.ringTotal > 0 && this.ringGot === this.ringTotal) note = 'Every ring collected!';
    this.overlay = 'finish';
    this.ui.show('touch', false);
    this.input.enabled = false;
    this.ui.showFinish({
      name: run.name, time: this.runTime, score: this.runScore, top: this.topSpeed * 3.6, air: this.bestAir,
      rings: this.ringGot, ringTotal: this.ringTotal, dist: this.bestDist, newBest: newBest && this.runScore > 0, best: prev, note,
    });
    this.audio.chime(4, true);
  }

  // ------------------------------------------------------------ per-frame
  frame(now) {
    requestAnimationFrame(this._frame);
    const raw = clamp((now - this.lastFrame) / 1000, 0.0001, 0.1);
    this.lastFrame = now;
    // Smooth the frame time: the display ticks evenly even when timer readings jitter
    let dt;
    if (Math.abs(raw - this.dtAvg) < 0.004) { this.dtAvg += (raw - this.dtAvg) * 0.1; dt = this.dtAvg; }
    else { this.dtAvg += (raw - this.dtAvg) * 0.5; dt = raw; }
    dt = Math.min(dt, 0.05);
    const input = this.input;
    input.update(dt);

    if (input.consume('pause')) {
      if (this.overlay === 'pause') this.closeOverlay();
      else if (this.overlay === 'hub' && this.mode === 'play') this.closeOverlay();
      else if (this.mode === 'play' && !this.overlay) this.openPause();
    }
    if (input.consume('map') && this.mode !== 'loading') {
      if (this.overlay === 'hub' && this.mode === 'play') this.closeOverlay();
      else if (this.overlay !== 'hub') this.openHub();
    }
    const playing = this.mode === 'play' && !this.overlay;
    if (playing) {
      if (input.consume('cam')) this.cycleCam();
      if (input.consume('reset')) this.restart();
      if (input.consume('glide')) this.glideQ = true;
    } else { input.consume('glide'); input.consume('cam'); input.consume('reset'); }

    const sk = this.skier;
    let adt = this.mode === 'menu' ? dt : 0;   // animation time step
    if (playing && !this.debugHold) {
      this.updateSlowmo(dt);
      const sdt = dt * this.timeScale;
      adt = sdt;
      const inp = this.inp;
      inp.steer = input.steer; inp.fwd = input.fwd; inp.back = input.back; inp.jump = input.jump; inp.grab = input.grab;
      inp.glidePressed = this.glideQ; inp.startPressed = input.fwd > 0.3 || input.jump;
      this.glideQ = false;
      // the skier advances by exactly this frame's time, in steps of at most 1/120 s
      const steps = Math.max(1, Math.ceil(sdt / STEP - 1e-6));
      const h = sdt / steps;
      for (let i = 0; i < steps; i++) { sk.step(h, inp); inp.glidePressed = false; }
      for (let i = 0; i < sk.events.length; i++) this.onEvent(sk.events[i]);
      sk.events.length = 0;
      this.updateGame(sdt, dt);
    } else if (playing) adt = 0;

    this.character.update(adt, sk);
    this.glider.update(adt, sk, this.character);
    this.character.root.updateMatrixWorld(true);

    if (this.mode === 'menu') this.updateMenuCamera(dt);
    else if (adt > 0) this.camRig.update(adt, sk, this.character, this.slowmo);

    this.terrain.update(this.camera);
    this.scenery.update(dt, this.camera.position);
    this.sky.update(dt, this.mode === 'menu' ? this.camera.position : sk.feet, this.camera);
    if (this.mode === 'play' && adt > 0) this.updateEffects(adt);
    this.particles.update(adt, this.camera, this.renderer, this.scene.fog, this._light);
    this._v.copy(this.camRig.vel).multiplyScalar(this.mode === 'play' ? this.timeScale : 0);
    this.air.update(dt, this.camera, this._v);
    this.fx.timeScale = this.timeScale;
    this.audio.update(dt, playing ? sk : this.silent, playing ? this.fx : null);

    if (this.mode === 'play') {
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) { this.hudTimer = 0.066; this.ui.updateHud(this); }
      this.miniTimer -= dt;
      if (this.miniTimer <= 0 && !this.overlay) { this.miniTimer = 0.1; this.ui.drawMinimap(sk, this.camRig.yaw + this.camRig.orbitYaw); }
      this.ui.tickHint(dt);
    }
    if (this.overlay === 'hub' && this.ui.mapDirty) this.ui.drawMap(sk, this.mode === 'play');
    this.renderer.render(this.scene, this.camera);
    this.updateDRS(raw, playing);
  }

  // Slow motion while you are actually throwing a trick in a big air
  updateSlowmo(dt) {
    const sk = this.skier, a = sk.air;
    const want = this.settings.slowmo && sk.state === 'air' && !a.sliding && !a.pipe && a.time > 0.3 && a.tHit > 0.5
      && a.time + a.tHit > 2.1 && (Math.abs(a.flipVel) > 1.5 || Math.abs(a.spinVel) > 1.5 || !!a.grab);
    this.timeScale = damp(this.timeScale, want ? 0.5 : 1, want ? 4 : 6, dt);
    if (this.timeScale > 0.995) this.timeScale = 1;
    this.slowmo = clamp((1 - this.timeScale) / 0.5, 0, 1);
  }

  // Keep the frame rate up by trading resolution; fall back to Low graphics if that is not enough
  updateDRS(raw, playing) {
    const d = this.drs;
    if (!d.on || !playing) { d.acc = 0; d.n = 0; return; }
    this.playTime += raw;
    d.acc += raw; d.n++;
    if (d.acc < 1) return;
    const avg = d.acc / d.n;
    d.acc = 0; d.n = 0;
    if (this.playTime < 4) return;
    if (avg > 0.0215) {
      d.good = 0;
      if (d.scale > 0.56) {
        d.scale = Math.max(0.55, d.scale * (avg > 0.03 ? 0.8 : 0.9));
        this.renderer.setPixelRatio(this.basePR * d.scale);
      } else if (++d.bad >= 3 && this.settings.quality !== 'low') {
        d.bad = 0;
        this.applySetting('quality', 'low');
        this.ui.el['set-quality'].value = 'low';
        this.ui.hint('Graphics set to Low for a smoother ride', 3);
      }
    } else if (avg < 0.0176) {
      d.bad = 0;
      if (d.scale < 1 && ++d.good >= 5) {
        d.good = 0;
        d.scale = Math.min(1, d.scale * 1.07);
        this.renderer.setPixelRatio(this.basePR * d.scale);
      }
    }
  }

  updateGame(sdt, dt) {
    const sk = this.skier, w = this.world;
    if (sk.state !== 'ready') {
      if (this.timing) this.runTime += sdt;
      this.topSpeed = Math.max(this.topSpeed, sk.speed);
    }
    if (sk.state === 'ground') {
      this.comboTimer -= sdt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboTimer = 0; }
    }
    const ra = w.runAt(sk.feet.x, sk.feet.z);
    this.hudRun = ra.run >= 0 && ra.edge < 30 ? w.runs[ra.run] : null;
    let sOnRun = -1;
    if (this.runIndex >= 0) {
      const run = w.runs[this.runIndex];
      if (ra.run === this.runIndex && ra.edge < 90) { this.progress = ra.s / run.length; sOnRun = ra.s; }
      if (this.timing && ra.run === this.runIndex && ra.s > run.length - 95 && ra.edge < 70 && sk.state === 'ground') this.finishRun();
    } else this.progress = 0;
    this.slopeDeg = sk.state === 'ground' ? Math.acos(clamp(sk.n.y, -1, 1)) * 57.2958 : null;

    // ---- rings
    const c = this._c.copy(sk.pos);
    if (sk.state === 'ground' || sk.state === 'ready') c.y += 0.95;
    this.ringTimer -= sdt;
    if (this.ringTimer <= 0) this.ringStreak = 0;
    const rings = w.rings;
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (r.got) continue;
      const dx = r.x - c.x, dy = r.y - c.y, dz = r.z - c.z;
      const rr = r.r + 0.85;
      if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
      r.got = true;
      this.ringStreak++; this.ringTimer = 9;
      this.scenery.refreshRings();
      this.countRings();
      const pts = (r.sky ? 400 : 250) * (1 + 0.25 * (this.ringStreak - 1));
      this.score += pts; this.runScore += pts;
      this.ui.trickPopup(this.ringStreak > 1 ? `Ring ×${this.ringStreak}` : 'Ring', pts, null);
      this.audio.ring(this.ringStreak);
      if (r.sky) this.particles.sparkle(r.x, r.y, r.z, 40, 7, 0.2, 0.85, 1);
      else this.particles.sparkle(r.x, r.y, r.z, 30, 5, 1, 0.75, 0.1);
    }

    this.updateAvalanche(sdt, sOnRun);
    this.whiteout = damp(this.whiteout, 0, 0.9, dt);
    // powder closing in around the edges of the screen as the avalanche catches up
    const near = this.aval.active ? clamp(1 - this.aval.gap / 62, 0, 1) : 0;
    this.frost = damp(this.frost, Math.pow(near, 1.5) * 0.95, 4, dt);

    // Prompt for the wingsuit / paraglider when you are falling a long way
    if (sk.state === 'air' && sk.agl() > 22 && sk.air.tHit > 1.6 && (this.hints.chute || 0) < 4 && !this.hintShownThisAir) {
      this.hintShownThisAir = true;
      this.hints.chute = (this.hints.chute || 0) + 1;
      this.ui.hint(this.touchUI ? 'Big drop! Hold JUMP for the wingsuit, or tap GLIDE for the paraglider' : 'Big drop! Hold SPACE for the wingsuit, or press G for the paraglider', 3);
    }
    if (sk.state !== 'air') this.hintShownThisAir = false;
  }

  // Avalanche chase on the couloir: a roaring front that follows you down the run
  updateAvalanche(dt, sOnRun) {
    const av = this.aval, sk = this.skier;
    this.fx.avalanche = 0;
    if (this.runIndex < 0) return;
    const run = this.world.runs[this.runIndex];
    if (sOnRun >= 0) av.lastS = sOnRun;
    if (av.armed && this.timing && av.lastS > 75) {
      av.armed = false; av.active = true; av.outran = false;
      av.s = av.lastS - 175; av.v = 10; av.t = 0;
      this.ui.hint('AVALANCHE! Tuck and outrun it!', 3.5);
      this.camRig.addShake(0.7);
    }
    if (!av.active) return;
    av.t += dt;
    av.gap = av.lastS - av.s;
    // speeds are along the run's map distance (the snow is moving ~1.3x faster down the slope)
    let target = clamp(13 + av.t * 1.1, 13, 23.5);
    if (av.gap > 230) target += 7; else if (av.gap < 70) target -= 4.5;
    av.v = damp(av.v, target, 1.4, dt);
    av.s = Math.min(av.s + av.v * dt, run.length - 260);
    this.fx.avalanche = clamp(1 - av.gap / 280, 0, 1);
    if (av.gap < 90) this.camRig.shake = Math.max(this.camRig.shake, 0.55 * (1 - av.gap / 90));
    // billowing powder front across the whole width of the slope
    const w = this.world, P = this.particles;
    av.emit += dt * 190 * this.quality.spray;
    const hw = w.widthAt(run, av.s) / 2 + 25;
    while (av.emit > 1) {
      av.emit -= 1;
      const back = Math.random();
      const p = w.runPoint(run, av.s - back * 40, (Math.random() * 2 - 1) * hw);
      const up = Math.random();
      const y = w.height(p.x, p.z) + up * up * 13;
      const sp = av.v * (0.45 + Math.random() * 0.4);
      // shaded billows: dark blue-grey at the base of the front, bright where the sun catches the top
      const sh = 0.56 + 0.34 * up + Math.random() * 0.1;
      P.emit(p.x, y, p.z, p.dx * sp + (Math.random() - 0.5) * 6, 2 + Math.random() * 8, p.dz * sp + (Math.random() - 0.5) * 6,
        4.5 + Math.random() * 6, 1.6 + Math.random() * 1.4, 0.62, 1.2, 0.5, 1.4, sh * 0.92, sh * 0.96, sh);
    }
    // when it is right behind you, powder starts overtaking on both sides
    if (av.gap < 58 && sk.speed > 3) {
      av.lead = (av.lead || 0) + dt * 46 * (1 - av.gap / 58) * this.quality.spray;
      const f = sk.feet, inv = 1 / Math.max(1, Math.hypot(sk.vel.x, sk.vel.z));
      const dx = sk.vel.x * inv, dz = sk.vel.z * inv;
      while (av.lead > 1) {
        av.lead -= 1;
        const backD = 3 + Math.random() * 12, side = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 12);
        const x = f.x - dx * backD - dz * side, z = f.z - dz * backD + dx * side;
        const rel = 8 + Math.random() * 11, sh = 0.8 + Math.random() * 0.2;
        P.emit(x, w.height(x, z) + Math.random() * 3.5, z, sk.vel.x + dx * rel, 1 + Math.random() * 4, sk.vel.z + dz * rel,
          2 + Math.random() * 2.5, 0.9 + Math.random() * 0.5, 0.42, 1.3, 0.4, 2, sh * 0.94, sh * 0.97, sh);
      }
    }
    if (av.gap < 6 && sk.state !== 'crash') {
      av.active = false;
      this.whiteout = 1;
      this.combo = 0; this.comboTimer = 0;
      sk.startCrash();
      this.ui.hint('The avalanche caught you. Dig out and keep going!', 3);
    } else if (av.lastS > run.length - 330) {
      av.active = false; av.outran = true;
      this.bumpCombo(true);
      this.award('Outran the Avalanche', 5000, 'perfect', `${Math.round(this.topSpeed * 3.6)} km/h top speed`);
      this.audio.chime(6, true);
    }
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
        ch.skiTail(Math.random() < 0.5 ? 0 : 1, v);
        const s = 1.5 + Math.random() * 2.5 + sk.skid * 2.5;
        P.emit(v.x, v.y + 0.04, v.z,
          sk.vel.x * 0.25 + lx * side * s + (Math.random() - 0.5), 1 + Math.random() * 2.2 + sk.skid * 1.5, sk.vel.z * 0.25 + lz * side * s + (Math.random() - 0.5),
          0.22 + Math.random() * 0.3 + sk.skid * 0.2, 0.5 + Math.random() * 0.6, 0.45 + 0.3 * sk.skid, 1.8, 2.6);
      }
      // rooster tail of powder off-piste
      if (sk.powder > 0.3 && speed > 5) {
        this.powderAcc += sk.powder * clamp(speed / 15, 0, 1.6) * dt * 40 * q;
        guard = 0;
        while (this.powderAcc > 1 && guard++ < 20) {
          this.powderAcc -= 1;
          ch.skiTail(Math.random() < 0.5 ? 0 : 1, v);
          // a low plume that streams off the tails and stays below the rider's knees
          P.emit(v.x, v.y + 0.05, v.z, sk.vel.x * 0.5 + (Math.random() - 0.5) * 2.8, 0.5 + Math.random() * 1.6, sk.vel.z * 0.5 + (Math.random() - 0.5) * 2.8,
            0.4 + Math.random() * 0.45, 0.8 + Math.random() * 0.6, 0.3, 1.6, 1.8, 4.5);
        }
      }
      for (let i = 0; i < 2; i++) {
        ch.skis[i].g.getWorldPosition(w);
        w.y = this.world.height(w.x, w.z);
        this.tracks.add(i, w, sk.n, sk.powder, sk.carve);
      }
    } else {
      this.tracks.break(0); this.tracks.break(1);
    }
    // glowing ribbons swept by the skis while you are in the air
    // (only while you are actually spinning, flipping or grabbing: a straight air stays clean)
    const trail = sk.state === 'air' && sk.air.time > 0.22 && !sk.air.sliding &&
      (Math.abs(sk.air.spinVel) + Math.abs(sk.air.flipVel) > 1.3 || !!sk.air.grab);
    for (let i = 0; i < 2; i++) {
      if (trail) this.trails[i].update(dt, ch.skiTip(i, v), ch.skiTail(i, w));
      else this.trails[i].update(dt, null, null);
    }
    if (sk.state === 'glide') {
      // coloured smoke from the harness, like an acro pilot
      this.smokeAcc += dt * 26 * this.quality.spray;
      const a = this.accent;
      while (this.smokeAcc > 1) {
        this.smokeAcc -= 1;
        const f = sk.feet;
        P.emit(f.x + (Math.random() - 0.5) * 0.3, f.y + 0.3, f.z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6,
          0.5, 3.2, 0.42, 3.2, 0.3, 0.15, a[0], a[1], a[2]);
      }
    } else if (sk.state === 'wing' && Math.random() < 0.6) {
      // vapour off the wingtips
      const hand = Math.random() < 0.5 ? ch.p.handL : ch.p.handR;
      v.copy(hand).applyMatrix4(ch.root.matrixWorld);
      P.emit(v.x, v.y, v.z, sk.vel.x * 0.2, sk.vel.y * 0.2, sk.vel.z * 0.2, 0.25, 0.7, 0.35, 2.5, 1, 0.4);
    }
  }

  // Test hook: advance the simulation deterministically (60 fps frames) without rendering.
  debugRun(seconds, inp = {}) {
    this.debugHold = true;
    const base = { steer: 0, fwd: 0, back: 0, jump: false, grab: false, glidePressed: false, startPressed: false };
    const input = Object.assign(base, inp);
    const n = Math.max(1, Math.round(seconds * 60));
    const fd = 1 / 60;
    for (let f = 0; f < n; f++) {
      this.updateSlowmo(fd);
      const sdt = fd * this.timeScale;
      for (let k = 0; k < 2; k++) { this.skier.step(sdt / 2, input); input.glidePressed = false; input.startPressed = false; }
      for (const e of this.skier.events) this.onEvent(e);
      this.skier.events.length = 0;
      this.updateGame(sdt, fd);
      this.character.update(sdt, this.skier);
      this.glider.update(sdt, this.skier, this.character);
      this.character.root.updateMatrixWorld(true);
      this.camRig.update(sdt, this.skier, this.character, this.slowmo);
      this.updateEffects(sdt);
      this.particles.update(sdt, this.camera, this.renderer, this.scene.fog, this._light);
      if (this.overlay) break;
    }
    const sk = this.skier;
    return { state: sk.state, speed: +(sk.speed * 3.6).toFixed(1), x: +sk.pos.x.toFixed(1), y: +sk.pos.y.toFixed(1), z: +sk.pos.z.toFixed(1), agl: +sk.agl().toFixed(1), score: Math.round(this.score) };
  }

  updateMenuCamera(dt) {
    this.menuT += dt;
    const a = this.menuT * 0.035;
    const cx = 100, cz = -350;
    this.camera.position.set(cx + Math.sin(a) * 5200, 1900, cz + Math.cos(a) * 5200);
    this.camera.up.set(0, 1, 0);
    this.camera.fov = this.camRig.baseFov(50);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(cx, 560, cz);
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
