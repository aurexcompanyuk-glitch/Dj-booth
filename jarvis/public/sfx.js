// Synthesised interface sounds (no audio files needed).

let ctx = null;
export const sfx = { enabled: true };

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Call from a user gesture so later sounds are allowed to play.
export function unlockAudio() {
  audio();
}

function tone({ freq, to = freq, start = 0, dur = 0.12, type = "sine", gain = 0.08 }) {
  const ac = audio();
  if (!ac || !sfx.enabled) return;
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export const play = {
  boot() {
    tone({ freq: 90, to: 420, dur: 1.4, type: "sawtooth", gain: 0.025 });
    tone({ freq: 180, to: 840, dur: 1.4, type: "sine", gain: 0.05 });
    tone({ freq: 1320, start: 1.35, dur: 0.5, gain: 0.05 });
    tone({ freq: 1760, start: 1.45, dur: 0.6, gain: 0.04 });
  },
  listen() {
    tone({ freq: 880, dur: 0.07, gain: 0.06 });
    tone({ freq: 1320, start: 0.07, dur: 0.09, gain: 0.06 });
  },
  stop() {
    tone({ freq: 1100, to: 660, dur: 0.12, gain: 0.05 });
  },
  send() {
    tone({ freq: 1500, to: 2200, dur: 0.08, type: "triangle", gain: 0.04 });
  },
  chime() {
    [1046.5, 1318.5, 1568].forEach((f, i) => tone({ freq: f, start: i * 0.16, dur: 0.6, type: "triangle", gain: 0.07 }));
  },
  error() {
    tone({ freq: 160, to: 110, dur: 0.35, type: "square", gain: 0.035 });
  },
};
