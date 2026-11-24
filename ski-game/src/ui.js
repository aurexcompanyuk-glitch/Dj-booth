// DOM side of the game: loading, the mountain-map hub (slope picker + teleport), HUD,
// trick popups, minimap and settings.
import { DIFF, HALF, SIZE, GN, DN, LIFT_X, LODGE, HUT, ridgeZ, VALLEY_F } from './world.js';
import { OUTFITS } from './character.js';
import { WEATHER, WEATHER_ORDER } from './sky.js';
import { clamp } from './util.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const WX_ICON = {
  bluebird: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  golden: '<svg viewBox="0 0 24 24"><path d="M5 16a7 7 0 0 1 14 0Z" fill="currentColor"/><path d="M2 19.5h20M12 4v3M4.5 8.5l2 2M19.5 8.5l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  night: '<svg viewBox="0 0 24 24"><path d="M19 14.5A8 8 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z" fill="currentColor"/></svg>',
  storm: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

export class UI {
  constructor() {
    this.h = {};
    this.el = {};
    for (const id of ['loading', 'load-fill', 'load-text', 'hub', 'hub-meta', 'hub-close', 'hub-controls', 'hub-settings', 'weather-row',
      'map-canvas', 'slope-card', 'slope-list', 'hud', 'hud-badge', 'hud-run-name', 'hud-progress-fill', 'hud-rings', 'hud-rings-n',
      'hud-score', 'hud-combo', 'hud-speed', 'hud-alt', 'hud-slope', 'hud-air', 'hud-tricks', 'hud-fly', 'hud-fly-mode', 'hud-vario',
      'hud-vario-unit', 'hud-agl', 'hud-flytag', 'hud-aval', 'hud-aval-d', 'hud-aval-fill', 'hud-hint', 'hud-start', 'start-name',
      'start-cta', 'minimap', 'key-help', 'touch', 'tb-jump-label', 'pause', 'pause-title', 'finish', 'finish-name', 'finish-time',
      'finish-score', 'finish-top', 'finish-air', 'finish-rings', 'finish-dist', 'finish-best', 'set-quality', 'set-weather',
      'set-assist', 'set-slowmo', 'set-sound', 'set-camera', 'set-outfit', 'hb-map', 'hb-cam', 'hb-pause', 'fx-vignette', 'fx-white', 'fx-frost']) {
      this.el[id] = $(id);
    }
    this.hintTimer = 0;
    this.cache = {};
    this.mapBase = null;
    this.miniCtx = this.el.minimap.getContext('2d');
    this.mapCtx = this.el['map-canvas'].getContext('2d');
    this.keyHelpTimer = 0;
    this.sel = { run: 0, spot: null };
    this.pins = [];
  }

  on(name, fn) { this.h[name] = fn; }
  fire(name, ...a) { if (this.h[name]) this.h[name](...a); }

  setText(id, text) {
    if (this.cache[id] === text) return;
    this.cache[id] = text;
    this.el[id].textContent = text;
  }
  setStyle(id, prop, value) {
    const k = id + ':' + prop;
    if (this.cache[k] === value) return;
    this.cache[k] = value;
    this.el[id].style[prop] = value;
  }
  setHidden(id, hidden) {
    const k = id + ':h';
    if (this.cache[k] === hidden) return;
    this.cache[k] = hidden;
    this.el[id].hidden = hidden;
  }

  setLoading(p, text) {
    this.el['load-fill'].style.width = `${Math.round(p * 100)}%`;
    if (text) this.el['load-text'].textContent = text;
  }

  show(id, on) { this.el[id].hidden = !on; this.cache[id + ':h'] = !on; }

  // ------------------------------------------------------------ hub: map + slope list
  buildHub(world, state) {
    this.world = world;
    this.state = state; // { best, rings, flight, extras, weather }
    const maxV = Math.max(...world.runs.map((r) => r.stats.vertical));
    const km = world.runs.reduce((s, r) => s + r.stats.length, 0) / 1000;
    this.el['hub-meta'].textContent = `${world.runs.length} slopes · ${km.toFixed(0)} km of runs · up to ${fmt(maxV)} m vertical`;
    // pins sit a little way down each run so front and back starts don't overlap on the ridge
    this.pins = world.runs.map((run) => world.runPoint(run, 150, 0));
    const list = this.el['slope-list'];
    list.innerHTML = '';
    const section = (title) => { const h = document.createElement('div'); h.className = 'list-head'; h.textContent = title; list.appendChild(h); };
    const row = (i) => {
      const run = world.runs[i];
      const b = document.createElement('div');
      b.className = 'map-item';
      b.dataset.run = String(i);
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      b.innerHTML = `<span class="mi-num">${i + 1}</span><span class="mi-name">${run.name}<small>${run.tags[0]} · max ${run.stats.maxDeg}°</small></span><span class="badge ${run.diff}">${DIFF[run.diff].short}</span><button class="mi-go" type="button" aria-label="Drop in on ${run.name}">GO</button>`;
      b.addEventListener('click', (e) => {
        if (e.target.closest('.mi-go')) this.fire('pickRun', i);
        else this.select(i, null, true);
      });
      b.addEventListener('keydown', (e) => { if (e.code === 'Enter') this.fire('pickRun', i); });
      list.appendChild(b);
    };
    section('Front side · sunny south face');
    world.runs.forEach((r, i) => { if (r.side > 0) row(i); });
    section('Back side · steep north face');
    world.runs.forEach((r, i) => { if (r.side < 0) row(i); });
    section('Other spots');
    state.extras.forEach((e) => {
      const b = document.createElement('div');
      b.className = 'map-item';
      b.setAttribute('role', 'button');
      b.tabIndex = 0;
      b.innerHTML = `<span class="mi-num">★</span><span class="mi-name">${e.name}<small>${e.sub}</small></span><button class="mi-go" type="button" aria-label="Go to ${e.name}">GO</button>`;
      b.addEventListener('click', (ev) => {
        if (ev.target.closest('.mi-go')) this.fire('teleportSpot', e);
        else this.select(-1, e, true);
      });
      list.appendChild(b);
    });
    // weather chips
    const wx = this.el['weather-row'];
    wx.innerHTML = '';
    for (const name of WEATHER_ORDER) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wx-btn';
      b.dataset.wx = name;
      b.title = WEATHER[name].label;
      b.setAttribute('aria-label', WEATHER[name].label);
      b.innerHTML = `${WX_ICON[name]}<span>${WEATHER[name].label}</span>`;
      b.onclick = () => this.fire('setting', 'weather', name);
      wx.appendChild(b);
    }
    this.syncWeather(state.weather);
    this.el['hub-controls'].onclick = () => this.fire('openPause', 'controls');
    this.el['hub-settings'].onclick = () => this.fire('openPause', 'settings');
    this.el['hub-close'].onclick = () => this.fire('closeHub');
    this.el['map-canvas'].addEventListener('click', (ev) => this.onMapClick(ev));
    this.select(this.sel.run >= 0 ? this.sel.run : 0, null, false);
  }

  syncWeather(name) {
    this.el['weather-row'].querySelectorAll('.wx-btn').forEach((b) => b.classList.toggle('on', b.dataset.wx === name));
    this.el['set-weather'].value = name;
  }

  onMapClick(ev) {
    const r = this.el['map-canvas'].getBoundingClientRect();
    const u = (ev.clientX - r.left) / r.width, v = (ev.clientY - r.top) / r.height;
    const x = -HALF + u * SIZE, z = -HALF + v * SIZE;
    let best = -1, bd = 1e9;
    this.pins.forEach((p, i) => { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } });
    const pinR = (30 / r.width) * SIZE * (1024 / Math.max(320, r.width)) * 0.5 + 95;
    if (bd < pinR) {
      if (this.sel.run === best && !this.sel.spot) this.fire('pickRun', best);
      else this.select(best, null, false);
      return;
    }
    const L = HALF - 160;
    this.select(-1, { name: 'Freeride drop', sub: '', x: clamp(x, -L, L), z: clamp(z, -L, L), free: true }, false);
  }

  select(run, spot, scroll) {
    this.sel.run = run;
    this.sel.spot = spot;
    const world = this.world, st = this.state;
    const card = this.el['slope-card'];
    if (run >= 0) {
      const r = world.runs[run], d = DIFF[r.diff];
      const best = st.best[r.id] ? `Best: ${fmt(st.best[r.id])} pts` : 'No score yet';
      const rings = st.ringTotals[run] ? ` · Rings: ${st.rings[r.id] || 0}/${st.ringTotals[run]}` : '';
      const fl = r.id === 'flight' && st.flight ? ` · Longest flight: ${Math.round(st.flight)} m` : '';
      card.innerHTML = `
        <div class="rc-top"><span class="badge ${r.diff}">${d.short}</span><span class="rc-num">SLOPE ${run + 1} · ${r.side > 0 ? 'FRONT SIDE' : 'BACK SIDE'} · ${d.label.toUpperCase()}</span></div>
        <h3>${r.name}</h3>
        <p>${r.desc}</p>
        <div class="rc-tags">${r.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="rc-stats">
          <div><b>${(r.stats.length / 1000).toFixed(1)} km</b><small>length</small></div>
          <div><b>${fmt(r.stats.vertical)} m</b><small>vertical</small></div>
          <div><b>${r.stats.maxDeg}°</b><small>steepest</small></div>
        </div>
        <div class="rc-best">${best}${rings}${fl}</div>
        <button class="go-btn" type="button" id="card-go">Drop in</button>`;
      $('card-go').onclick = () => this.fire('pickRun', run);
    } else if (spot) {
      const alt = Math.round(world.height(spot.x, spot.z));
      const ra = world.runAt(spot.x, spot.z);
      const near = ra.run >= 0 && ra.edge < 60 ? `On ${world.runs[ra.run].name}` : 'Off-piste';
      card.innerHTML = `
        <div class="rc-top"><span class="badge black">FREERIDE</span><span class="rc-num">${near.toUpperCase()}</span></div>
        <h3>${spot.name}</h3>
        <p>${spot.free ? `Start right here at ${fmt(alt)} m and ski wherever you like.` : spot.sub}</p>
        <button class="go-btn" type="button" id="card-go">Drop in here</button>`;
      $('card-go').onclick = () => this.fire('teleportSpot', spot);
    }
    this.el['slope-list'].querySelectorAll('.map-item').forEach((b) => b.classList.toggle('on', b.dataset.run === String(run)));
    if (scroll && window.matchMedia('(max-width: 900px)').matches) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    this.mapDirty = true;
  }

  // ------------------------------------------------------------ settings
  bindSettings(settings) {
    const q = this.el['set-quality'], a = this.el['set-assist'], s = this.el['set-sound'], c = this.el['set-camera'];
    const w = this.el['set-weather'], sm = this.el['set-slowmo'];
    q.value = settings.quality; a.checked = settings.assist; s.checked = settings.sound; c.value = String(settings.camera);
    w.value = settings.weather; sm.checked = settings.slowmo;
    q.onchange = () => this.fire('setting', 'quality', q.value);
    a.onchange = () => this.fire('setting', 'assist', a.checked);
    s.onchange = () => this.fire('setting', 'sound', s.checked);
    c.onchange = () => this.fire('setting', 'camera', +c.value);
    w.onchange = () => this.fire('setting', 'weather', w.value);
    sm.onchange = () => this.fire('setting', 'slowmo', sm.checked);
    const box = this.el['set-outfit'];
    box.innerHTML = '';
    OUTFITS.forEach((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'outfit-swatch' + (i === settings.outfit ? ' on' : '');
      b.title = o.name;
      b.setAttribute('aria-label', `${o.name} outfit`);
      const hex = (v) => `#${v.toString(16).padStart(6, '0')}`;
      b.style.background = `linear-gradient(135deg, ${hex(o.jacket)} 0 55%, ${hex(o.accent)} 55% 70%, ${hex(o.pants)} 70%)`;
      b.onclick = () => {
        box.querySelectorAll('.outfit-swatch').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        this.fire('setting', 'outfit', i);
      };
      box.appendChild(b);
    });
    document.querySelectorAll('[data-act]').forEach((b) => { b.onclick = () => this.fire('pauseAct', b.dataset.act); });
    document.querySelectorAll('[data-fin]').forEach((b) => { b.onclick = () => this.fire('finishAct', b.dataset.fin); });
    // blur after clicking so Space (jump) never re-triggers a focused HUD button
    this.el['hb-map'].onclick = (e) => { e.currentTarget.blur(); this.fire('openHub'); };
    this.el['hb-cam'].onclick = (e) => { e.currentTarget.blur(); this.fire('cycleCam'); };
    this.el['hb-pause'].onclick = (e) => { e.currentTarget.blur(); this.fire('openPause'); };
  }

  syncCamera(mode) { this.el['set-camera'].value = String(mode); }

  // ------------------------------------------------------------ HUD
  updateHud(g) {
    const sk = g.skier;
    this.setText('hud-speed', String(Math.round(sk.speed * 3.6)));
    this.setText('hud-alt', `${fmt(sk.feet.y)} m`);
    this.setText('hud-slope', g.slopeDeg != null ? `${Math.round(g.slopeDeg)}° slope` : '');
    this.setText('hud-score', fmt(g.score));
    const combo = g.combo > 1 ? `COMBO ×${g.combo}` : '';
    this.setHidden('hud-combo', !combo);
    if (combo) this.setText('hud-combo', combo);
    const run = g.hudRun;
    this.setText('hud-run-name', run ? run.name : 'Off-piste');
    const badgeCls = run ? `badge ${run.diff}` : 'badge black';
    if (this.cache.badgeCls !== badgeCls) { this.cache.badgeCls = badgeCls; this.el['hud-badge'].className = badgeCls; }
    this.setText('hud-badge', run ? DIFF[run.diff].short : 'FREERIDE');
    this.setStyle('hud-progress-fill', 'width', `${Math.round(clamp(g.progress, 0, 1) * 100)}%`);
    this.setHidden('hud-rings', !(g.ringTotal > 0));
    if (g.ringTotal > 0) this.setText('hud-rings-n', `${g.ringGot}/${g.ringTotal}`);

    // air trick counter
    const air = sk.state === 'air' && sk.air.time > 0.35;
    this.setHidden('hud-air', !air);
    if (air) {
      const a = sk.air;
      const spinAbs = Math.abs(a.spin + a.rel0);
      const spin = Math.floor(spinAbs / Math.PI + 0.15) * 180;
      const flips = Math.floor(Math.abs(a.flip) / (Math.PI * 2) + 0.2);
      const bits = [];
      if (flips > 0) bits.push(`${flips > 1 ? flips + '× ' : ''}${a.flip < 0 ? 'BACKFLIP' : 'FRONTFLIP'}`);
      if (spin >= 180) bits.push(String(spin));
      if (a.grab) bits.push(a.grab.toUpperCase());
      const html = `${bits.join(' · ') || 'AIR'}<span class="air-time">${a.time.toFixed(1)} s · ${Math.max(0, sk.agl()).toFixed(0)} m up</span>`;
      if (this.cache.air !== html) { this.cache.air = html; this.el['hud-air'].innerHTML = html; }
    }
    // flying: paraglider (vario) or wingsuit (height above ground)
    const glide = sk.state === 'glide', wing = sk.state === 'wing';
    this.setHidden('hud-fly', !(glide || wing));
    if (glide) {
      const v = sk.glide.vario;
      this.setText('hud-fly-mode', 'PARAGLIDER');
      this.setText('hud-vario', `${v >= 0 ? '+' : ''}${v.toFixed(1)}`);
      this.setText('hud-vario-unit', 'm/s');
      const cls = v > 0.2 ? 'vario up' : v < -1.5 ? 'vario down' : 'vario';
      if (this.cache.varioCls !== cls) { this.cache.varioCls = cls; this.el['hud-vario'].parentElement.className = cls; }
      this.setText('hud-agl', `${fmt(Math.max(0, sk.agl()))} m`);
      const th = sk.glide.wind.thermal > 0.8;
      this.setHidden('hud-flytag', !th);
      if (th) { this.setText('hud-flytag', 'THERMAL'); if (this.cache.tagCls !== 'flytag') { this.cache.tagCls = 'flytag'; this.el['hud-flytag'].className = 'flytag'; } }
    } else if (wing) {
      const agl = Math.max(0, sk.agl());
      const ratio = Math.hypot(sk.vel.x, sk.vel.z) / Math.max(1, -sk.vel.y);
      this.setText('hud-fly-mode', 'WINGSUIT');
      this.setText('hud-vario', `${Math.round(agl)}`);
      this.setText('hud-vario-unit', 'm up');
      if (this.cache.varioCls !== 'vario') { this.cache.varioCls = 'vario'; this.el['hud-vario'].parentElement.className = 'vario'; }
      this.setText('hud-agl', `glide ${ratio.toFixed(1)} : 1 ·`);
      const prox = agl < 14;
      this.setHidden('hud-flytag', !prox);
      if (prox) { this.setText('hud-flytag', 'PROXIMITY'); if (this.cache.tagCls !== 'flytag hot') { this.cache.tagCls = 'flytag hot'; this.el['hud-flytag'].className = 'flytag hot'; } }
    }
    // avalanche chase
    const av = g.aval;
    this.setHidden('hud-aval', !(av && av.active));
    if (av && av.active) {
      this.setText('hud-aval-d', `${Math.max(0, Math.round(av.gap))} m behind`);
      this.setStyle('hud-aval-fill', 'width', `${Math.round(clamp(1 - av.gap / 260, 0.04, 1) * 100)}%`);
    }
    this.setStyle('fx-vignette', 'opacity', (g.slowmo || 0).toFixed(2));
    this.setStyle('fx-white', 'opacity', (g.whiteout || 0).toFixed(2));
    this.setStyle('fx-frost', 'opacity', (g.frost || 0).toFixed(2));
    this.setText('tb-jump-label', sk.state === 'air' || sk.state === 'wing' ? 'WING' : 'JUMP');
  }

  tickHint(dt) {
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.el['hud-hint'].hidden = true;
    }
    this.keyHelpTimer += dt;
    if (this.keyHelpTimer > 30) this.el['key-help'].classList.add('faded');
  }

  hint(text, time = 3.5) {
    this.el['hud-hint'].textContent = text;
    this.el['hud-hint'].hidden = false;
    this.hintTimer = time;
  }

  clearHint() { this.hintTimer = 0; this.el['hud-hint'].hidden = true; }

  showStart(run, touch) {
    this.el['hud-start'].hidden = false;
    this.el['start-name'].textContent = run ? run.name : 'Freeride';
    this.el['start-cta'].innerHTML = touch ? 'Push the stick up or tap JUMP to drop in' : 'Press <kbd>W</kbd> or <kbd>↑</kbd> to drop in';
  }
  hideStart() { this.el['hud-start'].hidden = true; }

  trickPopup(name, pts, quality, extra = '') {
    const box = this.el['hud-tricks'];
    while (box.children.length > 2) box.removeChild(box.firstChild);
    const d = document.createElement('div');
    d.className = 'trick-pop' + (pts === null ? ' small' : '');
    const q = quality ? `<span class="tp-q ${quality}">${quality.toUpperCase()}</span>` : '';
    d.innerHTML = `<div class="tp-name">${name}${q}</div>${pts !== null ? `<div class="tp-pts">+${fmt(pts)}${extra}</div>` : ''}`;
    box.appendChild(d);
    setTimeout(() => d.remove(), 2500);
  }

  // ------------------------------------------------------------ maps
  buildMapBase(world) {
    const W = 1024;
    const c = document.createElement('canvas');
    c.width = W; c.height = W;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, W);
    const g = world.grid, mask = world.maskData;
    const lx = -0.55, ly = 0.62, lz = 0.55;
    const ms = (GN - 1) / (DN - 1) / ((GN - 1) / W); // map px -> mask px
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        const gi = Math.min(GN - 2, Math.max(1, i)), gj = Math.min(GN - 2, Math.max(1, j));
        const h = g[gj * GN + gi];
        const dx = (g[gj * GN + gi + 1] - g[gj * GN + gi - 1]) / 12;
        const dz = (g[(gj + 1) * GN + gi] - g[(gj - 1) * GN + gi]) / 12;
        const inv = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
        const nx = -dx * inv, ny = inv, nz = -dz * inv;
        const shade = Math.max(0, nx * lx + ny * ly + nz * lz) * 1.15;
        const mi = (Math.min(DN - 1, Math.round(i / ms)) + Math.min(DN - 1, Math.round(j / ms)) * DN) * 4;
        const forest = mask[mi + 1] / 255, piste = mask[mi] / 255;
        let r = 226, gg = 234, b = 244;
        const steep = Math.min(1, Math.max(0, (Math.sqrt(dx * dx + dz * dz) - 0.95) * 2));
        r += (120 - r) * steep; gg += (122 - gg) * steep; b += (128 - b) * steep;
        r += (34 - r) * forest * 0.85; gg += (78 - gg) * forest * 0.85; b += (58 - b) * forest * 0.85;
        r += (250 - r) * piste * 0.35; gg += (252 - gg) * piste * 0.35; b += (255 - b) * piste * 0.35;
        const k = 0.5 + 0.55 * shade;
        const cl = (h % 100 + 100) % 100;
        const contour = cl < 4 || cl > 96 ? 0.87 : 1;
        const o = (j * W + i) * 4;
        img.data[o] = Math.min(255, r * k * contour);
        img.data[o + 1] = Math.min(255, gg * k * contour);
        img.data[o + 2] = Math.min(255, b * k * contour * 1.03);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const P = (x) => ((x + HALF) / SIZE) * W;
    // chairlift
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(20,24,30,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(P(LIFT_X), P(VALLEY_F + 120)); ctx.lineTo(P(LIFT_X), P(ridgeZ(LIFT_X) + 140));
    ctx.stroke();
    ctx.setLineDash([]);
    // runs
    world.runs.forEach((run) => {
      const col = DIFF[run.diff].color;
      for (const [w, cc] of [[8, 'rgba(255,255,255,0.95)'], [4.5, col]]) {
        ctx.strokeStyle = cc; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        run.path.forEach((p, k) => { if (k === 0) ctx.moveTo(P(p.x), P(p.z)); else ctx.lineTo(P(p.x), P(p.z)); });
        ctx.stroke();
      }
    });
    // lodge + hut
    for (const b of [LODGE, HUT]) {
      ctx.fillStyle = '#5a3a24';
      ctx.fillRect(P(b.x) - 8, P(b.z) - 5, 16, 10);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(P(b.x) - 11, P(b.z) - 5); ctx.lineTo(P(b.x), P(b.z) - 14); ctx.lineTo(P(b.x) + 11, P(b.z) - 5); ctx.fill();
    }
    // thermals
    for (const t of world.thermals) {
      ctx.strokeStyle = 'rgba(255,160,40,0.9)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.2) {
        const rr = 1.5 + a * 1.2;
        const x = P(t.x) + Math.cos(a) * rr, y = P(t.z) + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    this.mapBase = c;
    this.mapW = W;
    this.world = world;
  }

  drawMap(sk, playing) {
    const ctx = this.mapCtx, W = this.mapW, world = this.world;
    const P = (x) => ((x + HALF) / SIZE) * W;
    ctx.drawImage(this.mapBase, 0, 0);
    ctx.textBaseline = 'middle';
    const sel = this.sel.spot ? -1 : this.sel.run;
    if (sel >= 0) {
      const run = world.runs[sel];
      ctx.strokeStyle = 'rgba(255,90,31,0.95)'; ctx.lineWidth = 11; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      run.path.forEach((p, k) => { if (k === 0) ctx.moveTo(P(p.x), P(p.z)); else ctx.lineTo(P(p.x), P(p.z)); });
      ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.stroke();
    }
    world.runs.forEach((run, i) => {
      // name along the run
      const lp = world.runPoint(run, Math.min(run.length * 0.5, 1150), 0);
      ctx.save();
      ctx.translate(P(lp.x) + (run.side > 0 ? 11 : -11), P(lp.z));
      ctx.rotate(run.side > 0 ? Math.PI / 2 : -Math.PI / 2);
      ctx.font = 'italic 800 17px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(11,22,38,0.85)';
      ctx.strokeText(run.name.toUpperCase(), 0, 0);
      ctx.fillStyle = i === sel ? '#ffd9c7' : '#fff';
      ctx.fillText(run.name.toUpperCase(), 0, 0);
      ctx.restore();
    });
    this.pins.forEach((p, i) => {
      const x = P(p.x), y = P(p.z), on = i === sel;
      ctx.fillStyle = on ? '#ff5a1f' : '#0b1626';
      ctx.beginPath(); ctx.arc(x, y, on ? 19 : 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = on ? 3.5 : 2.5; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${on ? 20 : 17}px "Barlow Condensed", "Arial Narrow", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x, y + 1);
    });
    ctx.textAlign = 'center';
    ctx.font = '700 14px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillStyle = 'rgba(11,22,38,0.85)';
    ctx.fillText('BASE LODGE', P(LODGE.x), P(LODGE.z) + 20);
    ctx.fillText('NORTH HUT', P(HUT.x), P(HUT.z) + 20);
    if (this.sel.spot) {
      const s = this.sel.spot, x = P(s.x), y = P(s.z);
      ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 20, y); ctx.lineTo(x - 6, y); ctx.moveTo(x + 6, y); ctx.lineTo(x + 20, y);
      ctx.moveTo(x, y - 20); ctx.lineTo(x, y - 6); ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 20); ctx.stroke();
    }
    if (playing) this.drawPlayerArrow(ctx, P(sk.feet.x), P(sk.feet.z), sk.state === 'glide' ? sk.glide.heading : (Math.hypot(sk.vel.x, sk.vel.z) > 1 ? Math.atan2(sk.vel.x, sk.vel.z) : sk.heading), 14);
    this.mapDirty = false;
  }

  drawPlayerArrow(ctx, x, y, heading, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-heading + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.8); ctx.lineTo(0, s * 0.4); ctx.lineTo(-s * 0.7, s * 0.8); ctx.closePath();
    ctx.fillStyle = '#18c3d6'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }

  drawMinimap(sk, camYaw) {
    const ctx = this.miniCtx, c = this.el.minimap;
    const W = c.width;
    const span = 760; // metres across
    const scale = this.mapW / SIZE; // map px per metre
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(Math.PI + camYaw);
    const k = W / (span * scale);
    ctx.scale(k, k);
    ctx.drawImage(this.mapBase, -((sk.feet.x + HALF) * scale), -((sk.feet.z + HALF) * scale));
    // rings still to grab nearby
    const rings = this.world.rings;
    ctx.fillStyle = '#ffc21a';
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i];
      if (r.got) continue;
      const dx = r.x - sk.feet.x, dz = r.z - sk.feet.z;
      if (dx * dx + dz * dz > 400 * 400) continue;
      ctx.beginPath(); ctx.arc(dx * scale, dz * scale, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    const hd = sk.state === 'glide' ? sk.glide.heading : sk.state === 'wing' ? sk.wing.heading : (Math.hypot(sk.vel.x, sk.vel.z) > 1 ? Math.atan2(sk.vel.x, sk.vel.z) : sk.heading);
    // the map is rotated so the camera's forward points up; arrow angle relative to that
    this.drawPlayerArrow(ctx, W / 2, W / 2, hd - camYaw + Math.PI, 11);
  }

  showFinish(d) {
    this.el['finish-name'].textContent = d.name;
    const tenths = Math.round(d.time * 10);
    const m = Math.floor(tenths / 600), s = (tenths - m * 600) / 10;
    this.el['finish-time'].textContent = `${m}:${s.toFixed(1).padStart(4, '0')}`;
    this.el['finish-score'].textContent = fmt(d.score);
    this.el['finish-top'].textContent = String(Math.round(d.top));
    this.el['finish-air'].textContent = d.air.toFixed(1);
    this.el['finish-rings'].textContent = `${d.rings}/${d.ringTotal}`;
    this.el['finish-dist'].textContent = String(Math.round(d.dist));
    this.el['finish-best'].textContent = d.note || (d.newBest ? 'New best score on this slope!' : d.best ? `Best: ${fmt(d.best)} pts` : '');
    this.show('finish', true);
  }
}
