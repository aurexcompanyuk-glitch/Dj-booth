// Keyboard, gamepad and touch controls merged into one analog state.
import { clamp } from './util.js';

const KEYMAP = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space'], grab: ['ShiftLeft', 'ShiftRight', 'KeyE', 'KeyK'],
};
const EDGE_KEYS = {
  glide: ['KeyG', 'KeyF', 'KeyQ'], map: ['KeyM'], cam: ['KeyC', 'KeyV'], pause: ['Escape', 'KeyP'], reset: ['KeyR'],
};
const MENU_KEYS = ['Escape', 'KeyP', 'KeyM'];

export class Input {
  constructor() {
    this.keys = new Set();
    this.edges = {};
    this.steer = 0; this.fwd = 0; this.back = 0; this.jump = false; this.grab = false;
    this.ksteer = 0;
    this.touch = { steer: 0, fwd: 0, back: 0, jump: false, grab: false };
    this.gpPrev = [];
    this.gpOk = true;
    this.usedTouch = false;
    this.usedGamepad = false;
    this.anyPress = false;
    this.enabled = true;
    window.addEventListener('keydown', (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
      // menu keys always work, even with a settings control focused
      if (typing && !MENU_KEYS.includes(e.code)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && this.enabled) e.preventDefault();
      if (!this.keys.has(e.code)) {
        for (const name in EDGE_KEYS) if (EDGE_KEYS[name].includes(e.code)) this.edges[name] = true;
        this.anyPress = true;
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      // macOS never sends keyup for keys released while Cmd is held: drop everything
      if (e.key === 'Meta') this.keys.clear();
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  has(list) { for (let i = 0; i < list.length; i++) if (this.keys.has(list[i])) return true; return false; }

  press(name) { this.edges[name] = true; }
  consume(name) { const v = !!this.edges[name]; this.edges[name] = false; return v; }
  clearEdges() { for (const k in this.edges) this.edges[k] = false; this.anyPress = false; }

  update(dt) {
    const l = this.has(KEYMAP.left), r = this.has(KEYMAP.right);
    const target = (r ? 1 : 0) - (l ? 1 : 0);
    const rate = target === 0 ? 9 : Math.sign(target) !== Math.sign(this.ksteer) && this.ksteer !== 0 ? 12 : 6;
    const d = target - this.ksteer;
    this.ksteer += clamp(d, -rate * dt, rate * dt);
    let steer = this.ksteer, fwd = this.has(KEYMAP.up) ? 1 : 0, back = this.has(KEYMAP.down) ? 1 : 0;
    let jump = this.has(KEYMAP.jump), grab = this.has(KEYMAP.grab);

    // Gamepad (standard mapping). Some embedding pages forbid the API: never let that stop the game.
    let pads = null;
    if (this.gpOk && navigator.getGamepads) {
      try { pads = navigator.getGamepads(); } catch (e) { this.gpOk = false; }
    }
    if (pads) {
      for (let pi = 0; pi < pads.length; pi++) {
        const gp = pads[pi];
        if (!gp || !gp.connected) continue;
        const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
        const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
        const btn = (i) => (gp.buttons[i] ? gp.buttons[i].value > 0.4 || gp.buttons[i].pressed : false);
        if (Math.abs(ax) > 0 || Math.abs(ay) > 0) this.usedGamepad = true;
        steer += Math.sign(ax) * Math.pow(Math.abs(ax), 1.4);
        fwd = Math.max(fwd, -ay, gp.buttons[7] ? gp.buttons[7].value : 0, btn(12) ? 1 : 0);
        back = Math.max(back, ay, gp.buttons[6] ? gp.buttons[6].value : 0, btn(13) ? 1 : 0);
        if (btn(14)) steer -= 1;
        if (btn(15)) steer += 1;
        jump = jump || btn(0);
        grab = grab || btn(2) || btn(5);
        const edge = (i, name) => { const now = btn(i); if (now && !this.gpPrev[i]) { this.edges[name] = true; this.anyPress = true; this.usedGamepad = true; } this.gpPrev[i] = now; };
        edge(3, 'glide'); edge(4, 'cam'); edge(8, 'map'); edge(9, 'pause'); edge(10, 'reset');
        if (btn(0) && !this.gpPrev[100]) this.anyPress = true;
        this.gpPrev[100] = btn(0);
        break;
      }
    }
    const t = this.touch;
    steer += t.steer;
    fwd = Math.max(fwd, t.fwd);
    back = Math.max(back, t.back);
    jump = jump || t.jump;
    grab = grab || t.grab;
    if (!this.enabled) { steer = 0; fwd = 0; back = 0; jump = false; grab = false; }
    this.steer = clamp(steer, -1, 1);
    this.fwd = clamp(fwd, 0, 1);
    this.back = clamp(back, 0, 1);
    this.jump = jump;
    this.grab = grab;
  }

  // Wire up the on-screen joystick and buttons
  bindTouch(stickZone, stickBase, stickKnob, buttons) {
    const t = this.touch;
    let stickId = null, cx = 0, cy = 0;
    const R = 58;
    const setStick = (dx, dy) => {
      const len = Math.hypot(dx, dy);
      const k = len > R ? R / len : 1;
      dx *= k; dy *= k;
      stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
      const nx = dx / R, ny = dy / R;
      // soft centre: small thumb movements give fine control
      const ax = Math.max(0, Math.abs(nx) - 0.1) / 0.9;
      t.steer = Math.sign(nx) * Math.pow(ax, 1.35);
      t.fwd = ny < -0.34 ? Math.min(1, (-ny - 0.34) / 0.46) : 0;
      t.back = ny > 0.34 ? Math.min(1, (ny - 0.34) / 0.46) : 0;
    };
    stickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.usedTouch = true;
      const touch = e.changedTouches[0];
      stickId = touch.identifier;
      const rect = stickZone.getBoundingClientRect();
      cx = touch.clientX; cy = touch.clientY;
      stickBase.style.left = `${cx - rect.left}px`;
      stickBase.style.top = `${cy - rect.top}px`;
      stickBase.classList.add('active');
      setStick(0, 0);
      this.anyPress = true;
    }, { passive: false });
    const move = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== stickId) continue;
        e.preventDefault();
        setStick(touch.clientX - cx, touch.clientY - cy);
      }
    };
    const end = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier !== stickId) continue;
        stickId = null;
        setStick(0, 0);
        t.steer = 0; t.fwd = 0; t.back = 0;
        stickBase.classList.remove('active');
      }
    };
    stickZone.addEventListener('touchmove', move, { passive: false });
    stickZone.addEventListener('touchend', end);
    stickZone.addEventListener('touchcancel', end);
    for (const [el, name, mode] of buttons) {
      const down = (e) => {
        e.preventDefault();
        this.usedTouch = true;
        el.classList.add('down');
        if (mode === 'hold') t[name] = true; else { this.edges[name] = true; }
        this.anyPress = true;
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('down');
        if (mode === 'hold') t[name] = false;
      };
      el.addEventListener('touchstart', down, { passive: false });
      el.addEventListener('touchend', up, { passive: false });
      el.addEventListener('touchcancel', up, { passive: false });
      el.addEventListener('mousedown', down);
      el.addEventListener('mouseup', up);
      el.addEventListener('mouseleave', (e) => { if (el.classList.contains('down')) up(e); });
    }
  }
}
