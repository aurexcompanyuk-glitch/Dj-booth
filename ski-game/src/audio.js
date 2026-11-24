// Procedural audio with the Web Audio API: wind, snow hiss, edge scrape, powder,
// paraglider flutter, vario beeps, landing thumps and trick chimes.
import { clamp } from './util.js';

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
    this.varioPhase = 0;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048;
      d[i] = (b0 + b1 + b2 + w * 0.1) * 0.5;
    }
    this.noiseBuf = buf;
    const chain = (type, freq, q) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      src.playbackRate.value = 0.8 + Math.random() * 0.4;
      const f = ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master);
      src.start(0, Math.random() * 1.5);
      return { src, f, g };
    };
    this.wind = chain('lowpass', 400, 0.6);
    this.hiss = chain('bandpass', 2200, 0.9);
    this.scrape = chain('bandpass', 900, 1.4);
    this.powder = chain('lowpass', 700, 0.5);
    this.flutter = chain('bandpass', 260, 2.5);
    this.vario = ctx.createOscillator();
    this.vario.type = 'triangle';
    this.varioGain = ctx.createGain(); this.varioGain.gain.value = 0;
    this.vario.connect(this.varioGain).connect(this.master);
    this.vario.start();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  update(dt, sk) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, tc = 0.06;
    const sp = sk.speed;
    const ground = sk.state === 'ground';
    const glide = sk.state === 'glide';
    const windAmt = clamp(sp / 38, 0, 1.3);
    this.wind.g.gain.setTargetAtTime(0.04 + windAmt * windAmt * 0.32 + (glide ? 0.05 : 0), t, tc);
    this.wind.f.frequency.setTargetAtTime(220 + sp * 26, t, tc);
    const hissAmt = ground ? clamp(sp / 25, 0, 1) * (0.12 + 0.3 * sk.carve) * (1 - sk.powder * 0.6) : 0;
    this.hiss.g.gain.setTargetAtTime(hissAmt * 0.55, t, tc);
    this.hiss.f.frequency.setTargetAtTime(1500 + sp * 40 + sk.carve * 800, t, tc);
    const scr = ground ? clamp(sk.skid * clamp(sp / 8, 0, 1), 0, 1) : 0;
    this.scrape.g.gain.setTargetAtTime(scr * 0.5, t, 0.04);
    this.scrape.f.frequency.setTargetAtTime(700 + sp * 25, t, tc);
    const pw = ground ? sk.powder * clamp(sp / 18, 0, 1) : 0;
    this.powder.g.gain.setTargetAtTime(pw * 0.45, t, tc);
    const fl = glide ? 0.08 + clamp(sp / 20, 0, 1) * 0.12 : 0;
    this.flutter.g.gain.setTargetAtTime(fl * (0.7 + 0.3 * Math.sin(t * 13)), t, 0.03);
    // vario: beeps faster and higher when climbing
    let vg = 0;
    if (glide && sk.glide.vario > 0.25) {
      const climb = sk.glide.vario;
      this.varioPhase += dt * (2 + climb * 1.6);
      const on = (this.varioPhase % 1) < 0.45;
      vg = on ? 0.06 : 0;
      this.vario.frequency.setTargetAtTime(560 + climb * 110, t, 0.01);
    }
    this.varioGain.gain.setTargetAtTime(vg, t, 0.012);
  }

  thump(strength) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const s = clamp(strength, 0.1, 1);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + s * 500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 * s + 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 + s * 0.2);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.7);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.25);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35 * s, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(og).connect(this.master);
    o.start(t); o.stop(t + 0.35);
  }

  whoosh(strength = 0.5) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25 * strength, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.5);
  }

  chime(level = 1, good = true) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const base = good ? 660 : 330;
    const notes = good ? [0, 4, 7, 12].slice(0, 2 + Math.min(2, level)) : [0, -3];
    notes.forEach((n, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * Math.pow(2, (n + Math.min(level, 6)) / 12);
      const g = ctx.createGain();
      const st = t + i * 0.07;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.12, st + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.5);
      o.connect(g).connect(this.master);
      o.start(st); o.stop(st + 0.55);
    });
  }

  click() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square'; o.frequency.value = 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + 0.06);
  }

  canopy() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 350; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random()); src.stop(t + 1);
  }
}
