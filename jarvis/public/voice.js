// Speech in (Web Speech recognition) and speech out (speech synthesis).

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const WAKE = /\b(?:hey|ok|okay|yo)?\s*j(?:a|ar)rvis\b[\s,.!?]*/i;

// Listens either on demand (push-to-talk) or continuously for the wake word.
export class Ears {
  constructor({ onInterim, onCommand, onWake, onState, onError }) {
    this.supported = Boolean(Recognition);
    Object.assign(this, { onInterim, onCommand, onWake, onState, onError });
    this.mode = "off"; // off | ptt | wake
    this.wakeEnabled = false;
    this.suspended = false; // paused while J.A.R.V.I.S. is speaking
    this.awaitingCommand = false;
    this.rec = null;
    this.lang = navigator.language || "en-GB";
  }

  get listening() {
    return this.mode === "ptt" || this.awaitingCommand;
  }

  // Push-to-talk: one utterance, then deliver it as a command.
  startPtt() {
    if (!this.supported) return;
    this.stopRecognizer();
    this.mode = "ptt";
    this.transcript = "";
    this.startRecognizer({ continuous: false });
    this.onState?.("listening");
  }

  // Ends push-to-talk and lets the recogniser finalise what it heard.
  finishPtt() {
    if (this.mode === "ptt") this.rec?.stop();
  }

  cancel() {
    this.awaitingCommand = false;
    if (this.mode === "ptt") {
      this.mode = "off";
      this.transcript = "";
      this.stopRecognizer();
    }
    this.resumeWake();
  }

  setWake(enabled) {
    this.wakeEnabled = enabled && this.supported;
    if (this.wakeEnabled) this.resumeWake();
    else if (this.mode === "wake") {
      this.mode = "off";
      this.stopRecognizer();
    }
  }

  // Stop listening while the assistant talks, so it doesn't hear itself.
  suspend() {
    this.suspended = true;
    if (this.mode === "wake") {
      this.mode = "off";
      this.stopRecognizer();
    }
  }

  resume() {
    this.suspended = false;
    this.resumeWake();
  }

  resumeWake() {
    if (!this.wakeEnabled || this.suspended || this.mode !== "off") return;
    this.mode = "wake";
    this.startRecognizer({ continuous: true });
  }

  startRecognizer({ continuous }) {
    const rec = new Recognition();
    rec.lang = this.lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => this.handleResult(e);
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.wakeEnabled = false;
        this.onError?.("Microphone access was denied. Enable it in your browser's site settings to talk to me.");
      } else if (e.error === "network") {
        this.onError?.("Speech recognition needs an internet connection.");
      }
    };
    rec.onend = () => {
      if (this.rec !== rec) return;
      this.rec = null;
      if (this.mode === "ptt") {
        this.mode = "off";
        const text = this.transcript.trim();
        this.transcript = "";
        if (text) this.onCommand?.(text);
        else this.onState?.("idle");
        this.resumeWake();
      } else if (this.mode === "wake") {
        // Browsers end continuous sessions periodically; quietly restart.
        this.mode = "off";
        setTimeout(() => this.resumeWake(), 250);
      }
    };
    this.rec = rec;
    try {
      rec.start();
    } catch {
      this.rec = null;
      this.mode = "off";
    }
  }

  stopRecognizer() {
    const rec = this.rec;
    this.rec = null;
    try {
      rec?.abort();
    } catch {
      /* already stopped */
    }
  }

  handleResult(e) {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }

    if (this.mode === "ptt") {
      if (final) this.transcript += final;
      this.onInterim?.((this.transcript + interim).trim());
      return;
    }

    // Wake-word mode
    if (this.awaitingCommand) {
      this.onInterim?.(interim.trim());
      if (final.trim()) {
        this.awaitingCommand = false;
        clearTimeout(this.wakeTimer);
        this.onCommand?.(final.trim());
      }
      return;
    }
    const heard = final || interim;
    const match = heard.match(WAKE);
    if (!match) return;
    if (!final) {
      this.onWake?.(false);
      return;
    }
    const command = final.slice(match.index + match[0].length).trim();
    if (command.length > 1) {
      this.onCommand?.(command);
    } else {
      // "Jarvis?" on its own: wait for the actual request.
      this.awaitingCommand = true;
      this.onWake?.(true);
      clearTimeout(this.wakeTimer);
      this.wakeTimer = setTimeout(() => {
        if (this.awaitingCommand) {
          this.awaitingCommand = false;
          this.onState?.("idle");
        }
      }, 8000);
    }
  }
}

const PREFERRED_VOICES = [
  /Daniel/i,
  /Arthur/i,
  /Google UK English Male/i,
  /Microsoft (Ryan|George|Thomas).*(Online|Natural)?/i,
  /Oliver/i,
  /Male/i,
];

export class Mouth {
  constructor({ onStart, onBoundary, onIdle }) {
    this.supported = "speechSynthesis" in window;
    Object.assign(this, { onStart, onBoundary, onIdle });
    this.voices = [];
    this.voiceName = "";
    this.rate = 1;
    this.pitch = 0.9;
    this.pending = 0;
    this.generation = 0;
    if (this.supported) {
      this.loadVoices();
      speechSynthesis.addEventListener?.("voiceschanged", () => this.loadVoices());
    }
  }

  loadVoices() {
    this.voices = speechSynthesis
      .getVoices()
      .filter((v) => /^en/i.test(v.lang))
      .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
    this.onVoices?.(this.voices);
  }

  get voice() {
    if (this.voiceName) {
      const chosen = this.voices.find((v) => v.name === this.voiceName);
      if (chosen) return chosen;
    }
    const british = this.voices.filter((v) => /en[-_]GB/i.test(v.lang));
    for (const re of PREFERRED_VOICES) {
      const v = british.find((x) => re.test(x.name));
      if (v) return v;
    }
    return british[0] ?? this.voices[0] ?? null;
  }

  get speaking() {
    return this.pending > 0;
  }

  // Unlocks audio output on iOS/Safari; must run inside a user gesture.
  prime() {
    if (!this.supported) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  }

  say(text) {
    const clean = speakable(text);
    if (!this.supported || !clean) return;
    const generation = this.generation;
    const u = new SpeechSynthesisUtterance(clean);
    const voice = this.voice;
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-GB";
    }
    u.rate = this.rate;
    u.pitch = this.pitch;
    u.onstart = () => generation === this.generation && this.onStart?.(clean);
    u.onboundary = () => generation === this.generation && this.onBoundary?.();
    const finished = () => {
      if (generation !== this.generation) return;
      this.pending = Math.max(0, this.pending - 1);
      if (this.pending === 0) this.onIdle?.();
    };
    u.onend = finished;
    u.onerror = finished;
    this.pending++;
    speechSynthesis.speak(u);
    this.watch();
  }

  // Some speech engines drop utterances without firing onend. If the engine
  // has gone quiet while we still think we're talking, release the HUD.
  watch() {
    if (this.watchdog) return;
    let quiet = 0;
    this.watchdog = setInterval(() => {
      if (this.pending === 0) {
        clearInterval(this.watchdog);
        this.watchdog = null;
        return;
      }
      quiet = speechSynthesis.speaking || speechSynthesis.pending ? 0 : quiet + 1;
      if (quiet >= 3) {
        this.pending = 0;
        this.onIdle?.();
      }
    }, 1000);
  }

  stop() {
    this.generation++;
    this.pending = 0;
    if (this.supported) speechSynthesis.cancel();
  }
}

// Strip things that sound wrong when read aloud.
export function speakable(text) {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#`>|~]+/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/J\.A\.R\.V\.I\.S\.?/g, "Jarvis")
    .replace(/\s+/g, " ")
    .trim();
}

// Splits streamed text into sentences so speech can start before the reply
// has finished generating.
export class SentenceChunker {
  constructor(onSentence) {
    this.onSentence = onSentence;
    this.buffer = "";
  }

  push(delta) {
    this.buffer += delta;
    const re = /[.!?…]+["')\]]?(?=\s)|\n+/g;
    let cut = 0;
    let m;
    while ((m = re.exec(this.buffer))) {
      const end = m.index + m[0].length;
      const sentence = this.buffer.slice(cut, end);
      // Avoid splitting on abbreviations like "Mr." or very short fragments.
      if (sentence.trim().length < 12 || /\b(?:Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)\.$/i.test(sentence.trim())) continue;
      this.onSentence(sentence);
      cut = end;
    }
    this.buffer = this.buffer.slice(cut);
  }

  flush() {
    if (this.buffer.trim()) this.onSentence(this.buffer);
    this.buffer = "";
  }

  reset() {
    this.buffer = "";
  }
}
