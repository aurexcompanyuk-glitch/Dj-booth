// DOM side of the game: loading, slope picker, HUD, trick popups, trail map + minimap, settings.
import { DIFF, HALF, SIZE, GN, DN, LIFT_X, LODGE, ridgeZ } from './world.js';
import { OUTFITS } from './character.js';
import { clamp } from './util.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('en-US');

export class UI {
  constructor() {
    this.h = {};
    this.el = {};
    for (const id of ['loading', 'load-fill', 'load-text', 'menu', 'run-grid', 'hud', 'hud-badge', 'hud-run-name', 'hud-progress-fill',
      'hud-score', 'hud-combo', 'hud-speed', 'hud-alt', 'hud-slope', 'hud-air', 'hud-tricks', 'hud-glide', 'hud-vario', 'hud-agl',
      'hud-thermal', 'hud-hint', 'hud-start', 'start-name', 'start-cta', 'minimap', 'key-help', 'touch', 'map', 'map-canvas', 'map-list',
      'map-close', 'pause', 'finish', 'finish-name', 'finish-time', 'finish-score', 'finish-top', 'finish-air', 'finish-best',
      'set-quality', 'set-assist', 'set-sound', 'set-camera', 'set-outfit', 'menu-controls', 'menu-settings', 'hb-map', 'hb-cam', 'hb-pause']) {
      this.el[id] = $(id);
    }
    this.hintTimer = 0;
    this.cache = {};
    this.mapBase = null;
    this.miniCtx = this.el.minimap.getContext('2d');
    this.mapCtx = this.el['map-canvas'].getContext('2d');
    this.keyHelpTimer = 0;
  }

  on(name, fn) { this.h[name] = fn; }
  fire(name, ...a) { if (this.h[name]) this.h[name](...a); }

  setText(id, text) {
    if (this.cache[id] === text) return;
    this.cache[id] = text;
    this.el[id].textContent = text;
  }

  setLoading(p, text) {
    this.el['load-fill'].style.width = `${Math.round(p * 100)}%`;
    if (text) this.el['load-text'].textContent = text;
  }

  show(id, on) { this.el[id].hidden = !on; }

  // ------------------------------------------------------------ slope picker
  buildMenu(world, best) {
    const grid = this.el['run-grid'];
    grid.innerHTML = '';
    const maxV = Math.max(...world.runs.map((r) => r.stats.vertical));
    const km = world.runs.reduce((s, r) => s + r.stats.length, 0) / 1000;
    document.getElementById('menu-meta').textContent = `${world.runs.length} slopes · ${km.toFixed(0)} km of runs · up to ${fmt(maxV)} m vertical`;
    world.runs.forEach((run, i) => {
      const d = DIFF[run.diff];
      const b = document.createElement('button');
      b.className = 'run-card';
      b.type = 'button';
      b.innerHTML = `
        <div class="rc-top"><span class="badge ${run.diff}">${d.short}</span><span class="rc-num">SLOPE ${i + 1} · ${d.label.toUpperCase()}</span></div>
        <h3>${run.name}</h3>
        <p>${run.desc}</p>
        <div class="rc-tags">${run.tags.map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="rc-stats">
          <div><b>${(run.stats.length / 1000).toFixed(1)} km</b><small>length</small></div>
          <div><b>${fmt(run.stats.vertical)} m</b><small>vertical</small></div>
          <div><b>${run.stats.maxDeg}°</b><small>steepest</small></div>
        </div>
        <div class="rc-best">${best[run.id] ? `Best: ${fmt(best[run.id])} pts` : ''}</div>`;
      b.addEventListener('click', () => this.fire('pickRun', i));
      grid.appendChild(b);
    });
    this.el['menu-controls'].onclick = () => this.fire('openPause', 'controls');
    this.el['menu-settings'].onclick = () => this.fire('openPause', 'settings');
  }

  // ------------------------------------------------------------ settings
  bindSettings(settings) {
    const q = this.el['set-quality'], a = this.el['set-assist'], s = this.el['set-sound'], c = this.el['set-camera'];
    q.value = settings.quality; a.checked = settings.assist; s.checked = settings.sound; c.value = String(settings.camera);
    q.onchange = () => this.fire('setting', 'quality', q.value);
    a.onchange = () => this.fire('setting', 'assist', a.checked);
    s.onchange = () => this.fire('setting', 'sound', s.checked);
    c.onchange = () => this.fire('setting', 'camera', +c.value);
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
    this.el['hb-map'].onclick = (e) => { e.currentTarget.blur(); this.fire('openMap'); };
    this.el['hb-cam'].onclick = (e) => { e.currentTarget.blur(); this.fire('cycleCam'); };
    this.el['hb-pause'].onclick = (e) => { e.currentTarget.blur(); this.fire('openPause'); };
    this.el['map-close'].onclick = () => this.fire('closeMap');
  }

  syncCamera(mode) { this.el['set-camera'].value = String(mode); }

  // ------------------------------------------------------------ HUD
  updateHud(g) {
    const sk = g.skier;
    const kmh = sk.speed * 3.6;
    this.setText('hud-speed', String(Math.round(kmh)));
    this.setText('hud-alt', `${fmt(sk.feet.y)} m`);
    this.setText('hud-slope', g.slopeDeg != null ? `${Math.round(g.slopeDeg)}° slope` : '');
    this.setText('hud-score', fmt(g.score));
    const combo = g.combo > 1 ? `COMBO ×${g.combo}` : '';
    this.el['hud-combo'].hidden = !combo;
    if (combo) this.setText('hud-combo', combo);
    // run label
    const run = g.hudRun;
    const label = run ? run.name : 'Off-piste';
    this.setText('hud-run-name', label);
    const badgeCls = run ? `badge ${run.diff}` : 'badge black';
    if (this.cache.badgeCls !== badgeCls) { this.cache.badgeCls = badgeCls; this.el['hud-badge'].className = badgeCls; }
    this.setText('hud-badge', run ? DIFF[run.diff].short : 'FREERIDE');
    this.el['hud-progress-fill'].style.width = `${Math.round(clamp(g.progress, 0, 1) * 100)}%`;

    // air trick counter
    const air = sk.state === 'air' && sk.air.time > 0.35;
    this.el['hud-air'].hidden = !air;
    if (air) {
      const a = sk.air;
      const spin = Math.floor(Math.abs(a.spin) / Math.PI + 0.15) * 180;
      const flips = Math.floor(Math.abs(a.flip) / (Math.PI * 2) + 0.2);
      const bits = [];
      if (flips > 0) bits.push(`${flips > 1 ? flips + '× ' : ''}${a.flip < 0 ? 'BACKFLIP' : 'FRONTFLIP'}`);
      if (spin >= 180) bits.push(String(spin));
      if (a.grab) bits.push(a.grab.toUpperCase());
      const html = `${bits.join(' · ') || 'AIR'}<span class="air-time">${a.time.toFixed(1)} s · ${Math.max(0, sk.agl()).toFixed(0)} m up</span>`;
      if (this.cache.air !== html) { this.cache.air = html; this.el['hud-air'].innerHTML = html; }
    }
    // glide
    const glide = sk.state === 'glide';
    this.el['hud-glide'].hidden = !glide;
    if (glide) {
      const v = sk.glide.vario;
      this.setText('hud-vario', `${v >= 0 ? '+' : ''}${v.toFixed(1)}`);
      const cls = v > 0.2 ? 'vario up' : v < -1.5 ? 'vario down' : 'vario';
      if (this.cache.varioCls !== cls) { this.cache.varioCls = cls; this.el['hud-vario'].parentElement.className = cls; }
      this.setText('hud-agl', `${fmt(Math.max(0, sk.agl()))} m`);
      this.el['hud-thermal'].hidden = !(sk.glide.wind.thermal > 0.8);
    }
  }

  tickHint(dt) {
    if (this.hintTimer > 0) {
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) this.el['hud-hint'].hidden = true;
    }
    this.keyHelpTimer += dt;
    if (this.keyHelpTimer > 25) this.el['key-help'].classList.add('faded');
  }

  hint(text, time = 3.5) {
    this.el['hud-hint'].textContent = text;
    this.el['hud-hint'].hidden = false;
    this.hintTimer = time;
  }

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
    const lx = -0.55, ly = 0.62, lz = -0.55;
    for (let j = 0; j < W; j++) {
      for (let i = 0; i < W; i++) {
        const gi = Math.min(GN - 2, Math.max(1, i)), gj = Math.min(GN - 2, Math.max(1, j));
        const h = g[gj * GN + gi];
        const dx = (g[gj * GN + gi + 1] - g[gj * GN + gi - 1]) / 8;
        const dz = (g[(gj + 1) * GN + gi] - g[(gj - 1) * GN + gi]) / 8;
        const inv = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
        const nx = -dx * inv, ny = inv, nz = -dz * inv;
        let shade = Math.max(0, nx * lx + ny * ly + nz * lz) * 1.15;
        const mi = (Math.min(DN - 1, i >> 1) + Math.min(DN - 1, j >> 1) * DN) * 4;
        const forest = mask[mi + 1] / 255, piste = mask[mi] / 255;
        let r = 226, gg = 234, b = 244;
        const steep = Math.min(1, Math.max(0, (Math.sqrt(dx * dx + dz * dz) - 0.95) * 2));
        r += (120 - r) * steep; gg += (122 - gg) * steep; b += (128 - b) * steep;
        r += (34 - r) * forest * 0.85; gg += (78 - gg) * forest * 0.85; b += (58 - b) * forest * 0.85;
        r += (250 - r) * piste * 0.35; gg += (252 - gg) * piste * 0.35; b += (255 - b) * piste * 0.35;
        const k = 0.5 + 0.55 * shade;
        // contour lines every 100 m
        const cl = (h % 100 + 100) % 100;
        const contour = cl < 3.5 || cl > 96.5 ? 0.86 : 1;
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
    ctx.moveTo(P(LIFT_X), P(1500)); ctx.lineTo(P(LIFT_X), P(ridgeZ(LIFT_X) + 140));
    ctx.stroke();
    ctx.setLineDash([]);
    // runs
    world.runs.forEach((run) => {
      const col = DIFF[run.diff].color;
      for (const [w, c] of [[9, 'rgba(255,255,255,0.95)'], [5, col]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.beginPath();
        run.path.forEach((p, k) => { if (k === 0) ctx.moveTo(P(p.x), P(p.z)); else ctx.lineTo(P(p.x), P(p.z)); });
        ctx.stroke();
      }
    });
    // lodge
    ctx.fillStyle = '#5a3a24';
    ctx.fillRect(P(LODGE.x) - 9, P(LODGE.z) - 6, 18, 12);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(P(LODGE.x) - 12, P(LODGE.z) - 6); ctx.lineTo(P(LODGE.x), P(LODGE.z) - 16); ctx.lineTo(P(LODGE.x) + 12, P(LODGE.z) - 6); ctx.fill();
    // thermals
    for (const t of world.thermals) {
      ctx.strokeStyle = 'rgba(255,160,40,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.2) {
        const rr = 2 + a * 1.6;
        const x = P(t.x) + Math.cos(a) * rr, y = P(t.z) + Math.sin(a) * rr;
        if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    this.mapBase = c;
    this.mapW = W;
    this.world = world;
  }

  drawMap(sk, currentRun) {
    const ctx = this.mapCtx, W = this.mapW, world = this.world;
    const P = (x) => ((x + HALF) / SIZE) * W;
    ctx.drawImage(this.mapBase, 0, 0);
    ctx.textBaseline = 'middle';
    world.runs.forEach((run, i) => {
      const p = run.path[0];
      const x = P(p.x), y = P(p.z);
      ctx.fillStyle = i === currentRun ? '#ff5a1f' : '#0b1626';
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = '800 17px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), x, y + 1);
      // label along the run
      const lp = world.runPoint(run, Math.min(run.length * 0.42, 1200), 0);
      ctx.save();
      ctx.translate(P(lp.x) + 12, P(lp.z));
      ctx.rotate(Math.PI / 2);
      ctx.font = 'italic 800 19px "Barlow Condensed", "Arial Narrow", sans-serif';
      ctx.textAlign = 'left';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(11,22,38,0.85)';
      ctx.strokeText(run.name.toUpperCase(), 0, 0);
      ctx.fillStyle = '#fff';
      ctx.fillText(run.name.toUpperCase(), 0, 0);
      ctx.restore();
    });
    ctx.textAlign = 'center';
    ctx.font = '700 15px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.fillStyle = 'rgba(11,22,38,0.8)';
    ctx.fillText('BASE LODGE', P(LODGE.x), P(LODGE.z) + 22);
    // player
    this.drawPlayerArrow(ctx, P(sk.feet.x), P(sk.feet.z), sk.state === 'glide' ? sk.glide.heading : Math.atan2(sk.vel.x, sk.vel.z) || sk.heading, 14);
  }

  drawPlayerArrow(ctx, x, y, heading, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-heading + Math.PI);
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s * 0.7, s * 0.8); ctx.lineTo(0, s * 0.4); ctx.lineTo(-s * 0.7, s * 0.8); ctx.closePath();
    ctx.fillStyle = '#ff5a1f'; ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ctx.restore();
  }

  drawMinimap(sk, camYaw) {
    const ctx = this.miniCtx, c = this.el.minimap;
    const W = c.width;
    const span = 700; // metres across
    const scale = this.mapW / SIZE; // map px per metre
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); ctx.clip();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(Math.PI + camYaw);
    const k = W / (span * scale);
    ctx.scale(k, k);
    ctx.drawImage(this.mapBase, -((sk.feet.x + HALF) * scale), -((sk.feet.z + HALF) * scale));
    ctx.restore();
    const hd = sk.state === 'glide' ? sk.glide.heading : (Math.hypot(sk.vel.x, sk.vel.z) > 1 ? Math.atan2(sk.vel.x, sk.vel.z) : sk.heading);
    // the map is rotated so the camera's forward points up; arrow angle relative to that
    this.drawPlayerArrow(ctx, W / 2, W / 2, hd - camYaw + Math.PI, 11);
  }

  // map click -> world coordinates
  mapToWorld(ev) {
    const r = this.el['map-canvas'].getBoundingClientRect();
    const u = (ev.clientX - r.left) / r.width, v = (ev.clientY - r.top) / r.height;
    return { x: -HALF + u * SIZE, z: -HALF + v * SIZE, u, v };
  }

  buildMapList(world, extras) {
    const list = this.el['map-list'];
    list.innerHTML = '';
    world.runs.forEach((run, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'map-item';
      b.innerHTML = `<span class="mi-num">${i + 1}</span><span class="mi-name">${run.name}<br><small>${run.stats.maxDeg}° max · ${(run.stats.length / 1000).toFixed(1)} km</small></span><span class="badge ${run.diff}">${DIFF[run.diff].short}</span>`;
      b.onclick = () => this.fire('teleportRun', i);
      list.appendChild(b);
    });
    extras.forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'map-item';
      b.innerHTML = `<span class="mi-num">★</span><span class="mi-name">${e.name}<br><small>${e.sub}</small></span>`;
      b.onclick = () => this.fire('teleportSpot', e);
      list.appendChild(b);
    });
  }

  showFinish(d) {
    this.el['finish-name'].textContent = d.name;
    const m = Math.floor(d.time / 60), s = d.time - m * 60;
    this.el['finish-time'].textContent = `${m}:${s.toFixed(1).padStart(4, '0')}`;
    this.el['finish-score'].textContent = fmt(d.score);
    this.el['finish-top'].textContent = String(Math.round(d.top));
    this.el['finish-air'].textContent = d.air.toFixed(1);
    this.el['finish-best'].textContent = d.newBest ? 'New best score on this slope!' : d.best ? `Best: ${fmt(d.best)} pts` : '';
    this.el.finish.hidden = false;
  }
}
