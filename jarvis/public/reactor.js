// The arc-reactor visualiser at the centre of the HUD. It reacts to the
// assistant's state and to voice activity (pulse()).

const SPEED = { offline: 0.4, idle: 1, listening: 1.5, thinking: 3.6, searching: 4.6, working: 3, speaking: 1.7, error: 0.5 };
const BASE = { offline: 0.02, idle: 0.06, listening: 0.16, thinking: 0.22, searching: 0.26, working: 0.22, speaking: 0.3, error: 0.12 };
const BARS = 90;
const TAU = Math.PI * 2;

export class Reactor {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = "offline";
    this.level = 0;
    this.target = 0;
    this.spin = 0;
    this.time = 0;
    this.last = performance.now();
    this.bars = new Float32Array(BARS);
    this.ripples = [];
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.refreshColors();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  }

  setState(state) {
    if (state === this.state) return;
    if (state === "listening") this.ripple();
    this.state = state;
  }

  // Voice activity: amount 0..1
  pulse(amount = 0.6) {
    this.target = Math.min(1, Math.max(this.target, amount));
  }

  ripple() {
    this.ripples.push({ age: 0 });
  }

  refreshColors() {
    const css = getComputedStyle(document.documentElement);
    this.hud = css.getPropertyValue("--hud-rgb").trim() || "79, 210, 255";
    this.accent = css.getPropertyValue("--accent-rgb").trim() || "255, 181, 71";
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.size = Math.min(width, height);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const motion = this.reducedMotion ? 0.25 : 1;
    this.time += dt * motion;
    this.spin += dt * (SPEED[this.state] ?? 1) * 0.35 * motion;

    if (this.state === "speaking" && Math.random() < dt * 9) this.pulse(0.35 + Math.random() * 0.55);
    this.target = Math.max(BASE[this.state] ?? 0.05, this.target * Math.pow(0.12, dt));
    this.level += (this.target - this.level) * Math.min(1, dt * 12);

    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }

  rgba(rgb, a) {
    return `rgba(${rgb}, ${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  }

  arc(r, start, end, width, color) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(0, 0, r, start, end);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  draw() {
    const { ctx, size, level, spin, time } = this;
    const R = size / 2;
    if (!R) return;
    const err = this.state === "error";
    const hud = err ? "255, 77, 94" : this.hud;
    const accent = this.accent;
    const busy = this.state === "thinking" || this.state === "searching" || this.state === "working";

    ctx.save();
    ctx.clearRect(0, 0, size * 2, size * 2);
    ctx.translate(this.canvas.clientWidth / 2, this.canvas.clientHeight / 2);
    ctx.lineCap = "butt";

    // Ambient glow
    const glow = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
    glow.addColorStop(0, this.rgba(hud, 0.18 + level * 0.25));
    glow.addColorStop(0.55, this.rgba(hud, 0.04 + level * 0.05));
    glow.addColorStop(1, this.rgba(hud, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(-R, -R, R * 2, R * 2);

    // 1. Outer tick ring
    ctx.save();
    ctx.rotate(spin * 0.15);
    this.arc(R * 0.97, 0, TAU, 1, this.rgba(hud, 0.22));
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU;
      const long = i % 10 === 0;
      const r1 = R * (long ? 0.905 : 0.93);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * R * 0.955, Math.sin(a) * R * 0.955);
      ctx.lineWidth = long ? 2 : 1;
      ctx.strokeStyle = this.rgba(hud, long ? 0.7 : 0.3);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Segmented ring with accent bits
    ctx.save();
    ctx.rotate(spin);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      this.arc(R * 0.85, a, a + TAU / 3 - 0.32, R * 0.018, this.rgba(hud, 0.75));
      this.arc(R * 0.85, a + TAU / 3 - 0.24, a + TAU / 3 - 0.1, R * 0.018, this.rgba(accent, 0.9));
    }
    ctx.restore();

    // 3. Counter-rotating dashed ring
    ctx.save();
    ctx.rotate(-spin * 0.6);
    ctx.setLineDash([R * 0.012, R * 0.03]);
    this.arc(R * 0.8, 0, TAU, R * 0.03, this.rgba(hud, 0.28));
    ctx.setLineDash([]);
    this.arc(R * 0.765, 0.4, 1.9, 1.5, this.rgba(hud, 0.6));
    this.arc(R * 0.765, 3.5, 5.6, 1.5, this.rgba(hud, 0.6));
    ctx.restore();

    // 4. Scanning sweep while thinking
    if (busy) {
      ctx.save();
      ctx.rotate(spin * 2.2);
      const sweep = ctx.createConicGradient ? ctx.createConicGradient(0, 0, 0) : null;
      if (sweep) {
        sweep.addColorStop(0, this.rgba(hud, 0.28));
        sweep.addColorStop(0.12, this.rgba(hud, 0));
        sweep.addColorStop(1, this.rgba(hud, 0));
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.74, 0, TAU);
        ctx.arc(0, 0, R * 0.42, TAU, 0, true);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Voice bars
    const base = R * 0.6;
    ctx.save();
    ctx.rotate(-Math.PI / 2 + spin * 0.1);
    for (let i = 0; i < BARS; i++) {
      const n =
        0.5 + 0.5 * Math.sin(i * 0.71 + time * 3.3) * Math.sin(i * 0.23 - time * 1.9) +
        0.25 * Math.sin(i * 1.37 + time * 7.1);
      const want = level * Math.max(0.08, n);
      this.bars[i] += (want - this.bars[i]) * 0.25;
      const len = R * (0.012 + this.bars[i] * 0.15);
      const a = (i / BARS) * TAU;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(c * base, s * base);
      ctx.lineTo(c * (base + len), s * (base + len));
      ctx.lineWidth = Math.max(1.5, R * 0.011);
      ctx.strokeStyle = this.rgba(hud, 0.35 + this.bars[i] * 1.2);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Ripples (start of listening)
    this.ripples = this.ripples.filter((rp) => (rp.age += 0.016) < 1);
    for (const rp of this.ripples) {
      this.arc(R * (0.45 + rp.age * 0.55), 0, TAU, 2, this.rgba(hud, 0.6 * (1 - rp.age)));
    }

    // 7. Reactor coil: ten segments around the core
    ctx.save();
    ctx.rotate(spin * 0.25);
    const coil = R * 0.47;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      this.arc(coil, a + 0.06, a + TAU / 10 - 0.06, R * 0.075, this.rgba(hud, 0.16 + level * 0.5));
      this.arc(coil + R * 0.05, a + 0.08, a + TAU / 10 - 0.08, 1.5, this.rgba(hud, 0.65));
    }
    this.arc(coil - R * 0.052, 0, TAU, 1.5, this.rgba(hud, 0.55));
    ctx.restore();

    // 8. Core
    const coreR = R * (0.3 + level * 0.07);
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    core.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    core.addColorStop(0.28, this.rgba(hud, 0.85));
    core.addColorStop(0.62, this.rgba(hud, 0.22 + level * 0.3));
    core.addColorStop(1, this.rgba(hud, 0));
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, TAU);
    ctx.fill();

    // Inner triangle, a nod to the Mark VI reactor
    ctx.save();
    ctx.rotate(-Math.PI / 2 - spin * 0.15);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU;
      ctx.lineTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
    }
    ctx.closePath();
    ctx.lineWidth = R * 0.016;
    ctx.strokeStyle = this.rgba(hud, 0.55 + level * 0.4);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }
}
