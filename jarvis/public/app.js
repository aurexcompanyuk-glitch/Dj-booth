import { Reactor } from "./reactor.js";
import { play, sfx, unlockAudio } from "./sfx.js";
import { Ears, Mouth, SentenceChunker } from "./voice.js";

const $ = (id) => document.getElementById(id);

/* ───────────── Settings (per browser) ───────────── */

const DEFAULTS = { honorific: "sir", voice: "", rate: 1, pitch: 0.9, speak: true, wake: false, sfx: true, theme: "arc", code: "" };
const THEMES = ["arc", "mark", "gold", "stealth", "emerald"];

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("jarvis.settings") || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}
function saveSettings() {
  try {
    localStorage.setItem("jarvis.settings", JSON.stringify(settings));
  } catch {
    /* private mode: settings last for this visit only */
  }
}
const settings = loadSettings();
const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, "");

/* ───────────── State ───────────── */

const app = {
  mode: "offline",
  sessionId: newId(),
  controller: null, // in-flight request
  lastStatus: null,
  reply: null,
  chunker: null,
  health: null,
  telemetry: {},
  bootedAt: 0,
  timers: new Map(),
};

const reactor = new Reactor($("reactor"));

const mouth = new Mouth({
  onStart(text) {
    setMode("speaking");
    setCaption(text);
  },
  onBoundary: () => reactor.pulse(0.55 + Math.random() * 0.45),
  onIdle: () => settle(),
});
mouth.onVoices = () => fillVoices();

const ears = new Ears({
  onInterim(text) {
    setCaption(text, true);
    reactor.pulse(0.45 + Math.random() * 0.45);
  },
  onCommand: (text) => command(text),
  onWake(awaiting) {
    reactor.pulse(0.9);
    if (awaiting) {
      play.listen();
      setMode("listening");
      setCaption(`Yes, ${settings.honorific}?`);
    }
  },
  onState(s) {
    if (s === "listening") {
      play.listen();
      setMode("listening");
      setCaption("");
    } else if (!app.controller && !mouth.speaking) {
      setMode("idle");
      setCaption("");
    }
  },
  onError(message) {
    addLog("error", message);
    settings.wake = false;
    saveSettings();
    setMode("error");
    setTimeout(() => settle(), 2500);
  },
});

/* ───────────── HUD rendering ───────────── */

const MODE_LABELS = {
  offline: "Offline",
  idle: "Standby",
  listening: "Listening",
  thinking: "Processing",
  searching: "Searching",
  working: "Working",
  speaking: "Speaking",
  error: "Fault",
};

function setMode(mode, label) {
  app.mode = mode;
  const text = label || MODE_LABELS[mode] || mode;
  $("status-chip").dataset.state = mode;
  $("status-text").textContent = mode === "idle" && settings.wake && ears.supported ? "Awaiting “Jarvis”" : text;
  $("state-label").textContent = text;
  $("talk-btn").classList.toggle("live", mode === "listening");
  reactor.setState(mode);
}

function setCaption(text, heard = false) {
  const el = $("caption");
  el.textContent = text;
  el.classList.toggle("heard", heard);
}

// Back to rest once speech and the request have both finished.
function settle() {
  if (mouth.speaking || ears.listening) return;
  if (app.controller) {
    setMode(app.lastStatus?.state ?? "thinking", app.lastStatus?.label);
    return;
  }
  setMode(app.health?.keyConfigured ? "idle" : "offline");
  ears.resume();
}

// Says a line outside of a streamed reply (greetings, timers, faults).
function speak(line) {
  if (settings.speak && mouth.supported) {
    ears.suspend();
    mouth.say(line);
  } else {
    settle();
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function richText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n/g, "<br>");
}

const WHO = { user: "You", jarvis: "J.A.R.V.I.S.", system: "System", error: "Alert" };

function addLog(kind, text, { streaming = false, html = false } = {}) {
  const log = $("log");
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const li = document.createElement("li");
  li.className = kind + (streaming ? " streaming" : "");
  li.innerHTML = `<span class="who">${WHO[kind]} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><div class="msg"></div>`;
  const msg = li.querySelector(".msg");
  if (html) msg.innerHTML = text;
  else msg.innerHTML = richText(text);
  log.append(li);
  while (log.children.length > 200) log.firstElementChild.remove();
  if (nearBottom) log.scrollTop = log.scrollHeight;
  return li;
}

function updateLog(li, text) {
  const log = $("log");
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  li.querySelector(".msg").innerHTML = richText(text);
  if (nearBottom) log.scrollTop = log.scrollHeight;
}

/* ───────────── Talking to the server ───────────── */

function headers() {
  const h = { "Content-Type": "application/json" };
  if (settings.code) h["x-jarvis-code"] = settings.code;
  return h;
}

function hudContext() {
  const now = new Date();
  return {
    localTime: now.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  };
}

async function* readSse(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value;
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      let data = "";
      for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) yield { event, data: JSON.parse(data) };
    }
  }
}

// Stop talking and drop whatever request is in flight (barge-in).
function interrupt() {
  app.controller?.abort();
  app.controller = null;
  mouth.stop();
  app.chunker?.reset();
  if (app.reply?.li) app.reply.li.classList.remove("streaming");
  app.reply = null;
}

async function command(raw) {
  const text = raw.trim();
  if (!text) return;
  interrupt();
  ears.suspend();
  addLog("user", text);
  setCaption("");
  play.send();
  setMode("thinking");

  const controller = new AbortController();
  const reply = { li: null, text: "" };
  const chunker = new SentenceChunker((sentence) => settings.speak && mouth.say(sentence));
  Object.assign(app, { controller, reply, chunker, lastStatus: null });
  const current = () => app.controller === controller;

  try {
    const res = await fetch("api/chat", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        sessionId: app.sessionId,
        message: text,
        honorific: settings.honorific,
        context: hudContext(),
        telemetry: app.telemetry,
      }),
      signal: controller.signal,
    });
    if (res.status === 401) {
      fault("I'll need the access code before I can do that. You'll find it under configuration.");
      openSettings();
      return;
    }
    if (!res.ok || !res.body) throw new Error(`Server returned ${res.status}`);

    for await (const { event, data } of readSse(res.body)) {
      if (!current()) return;
      if (event === "status") {
        app.lastStatus = data;
        if (!mouth.speaking) setMode(data.state, data.label);
      } else if (event === "text") {
        if (!reply.li) reply.li = addLog("jarvis", "", { streaming: true });
        reply.text += data.delta;
        updateLog(reply.li, reply.text.trim());
        chunker.push(data.delta);
        if (!settings.speak) setCaption(reply.text.trim().split(/(?<=[.!?])\s+/).pop());
      } else if (event === "retract") {
        mouth.stop();
        chunker.reset();
        reply.text = "";
        if (reply.li) updateLog(reply.li, "");
      } else if (event === "action") {
        runAction(data);
      } else if (event === "error") {
        fault(data.message);
      }
    }
    chunker.flush();
  } catch (err) {
    if (err.name === "AbortError" || !current()) return;
    fault(`I seem to have lost contact with the server, ${settings.honorific}.`);
    console.error(err);
  } finally {
    reply.li?.classList.remove("streaming");
    if (current()) {
      app.controller = null;
      settle();
      refreshMemoryCount();
    }
  }
}

function fault(message) {
  addLog("error", message);
  play.error();
  setMode("error");
  speak(message);
  setTimeout(() => app.mode === "error" && settle(), 2500);
}

/* ───────────── HUD actions requested by J.A.R.V.I.S. ───────────── */

function runAction(action) {
  if (action.type === "set_timer") addTimer(action.seconds, action.label);
  else if (action.type === "set_theme") applyTheme(action.theme, true);
  else if (action.type === "open_url") openUrl(action.url, action.title);
}

function openUrl(url, title) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!/^https?:$/.test(parsed.protocol)) return;
  const win = window.open(parsed.href, "_blank");
  if (win) win.opener = null;
  const label = escapeHtml(title || parsed.hostname);
  addLog("system", `${win ? "Opened" : "Pop-up blocked —"} <a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${label}</a>`, { html: true });
}

function applyTheme(theme, save) {
  if (!THEMES.includes(theme)) return;
  document.documentElement.dataset.theme = theme;
  settings.theme = theme;
  if (save) saveSettings();
  requestAnimationFrame(() => reactor.refreshColors());
  document.querySelectorAll("#s-themes button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === theme)));
}

/* ───────────── Timers ───────────── */

function fmtDuration(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function addTimer(seconds, label) {
  const id = newId();
  const name = label || `${fmtDuration(seconds * 1000)} timer`;
  const li = document.createElement("li");
  li.className = "timer";
  li.innerHTML = `<div class="timer-head"><span></span><b></b></div><div class="meter"><span></span></div>`;
  li.querySelector(".timer-head span").textContent = name;
  const chip = document.createElement("li");
  $("timers").querySelector(".empty")?.remove();
  $("timers").append(li);
  $("timer-chips").append(chip);
  app.timers.set(id, { id, name, label, end: Date.now() + seconds * 1000, total: seconds * 1000, li, chip, done: false });
  tickTimers();
}

function tickTimers() {
  const now = Date.now();
  for (const t of app.timers.values()) {
    if (t.done) continue;
    const left = t.end - now;
    t.li.querySelector("b").textContent = fmtDuration(left);
    t.li.querySelector(".meter span").style.width = `${Math.max(0, (left / t.total) * 100)}%`;
    t.chip.textContent = `${t.name} · ${fmtDuration(left)}`;
    if (left <= 0) finishTimer(t);
  }
}

function finishTimer(t) {
  t.done = true;
  t.li.classList.add("done");
  t.li.querySelector("b").textContent = "DONE";
  play.chime();
  const what = t.label ? `your ${t.label} timer` : "your timer";
  const line = `Pardon the interruption, ${settings.honorific}. ${what[0].toUpperCase()}${what.slice(1)} is complete.`;
  addLog("jarvis", line);
  speak(line);
  setTimeout(() => {
    t.li.remove();
    t.chip.remove();
    app.timers.delete(t.id);
    if (!app.timers.size) $("timers").innerHTML = '<li class="empty">No active timers</li>';
  }, 8000);
}

/* ───────────── Telemetry & clock ───────────── */

async function collectTelemetry() {
  const t = {
    online: navigator.onLine,
    platform: navigator.userAgentData?.platform || navigator.platform || "unknown",
    cores: navigator.hardwareConcurrency ?? null,
    device_memory_gb: navigator.deviceMemory ?? null,
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
  };
  const conn = navigator.connection;
  if (conn) t.network = { type: conn.effectiveType, downlink_mbps: conn.downlink, rtt_ms: conn.rtt };
  try {
    const battery = await navigator.getBattery?.();
    if (battery) t.battery = { percent: Math.round(battery.level * 100), charging: battery.charging };
  } catch {
    /* not available */
  }
  app.telemetry = t;
  renderTelemetry();
}

function renderTelemetry() {
  const t = app.telemetry;
  const h = app.health;
  $("t-link").textContent = !h ? "Unreachable" : !h.keyConfigured ? "No API key" : h.authorised === false ? "Locked" : "Established";
  if (t.battery) {
    $("t-power").textContent = `${t.battery.percent}%${t.battery.charging ? " · charging" : ""}`;
    $("t-power-bar").style.width = `${t.battery.percent}%`;
    $("t-power-bar").parentElement.classList.toggle("low", t.battery.percent <= 20 && !t.battery.charging);
  } else {
    $("t-power").textContent = "Mains";
    $("t-power-bar").style.width = "100%";
  }
  $("t-net").textContent = `${t.online ? "Online" : "Offline"}${t.network?.type ? ` · ${t.network.type}` : ""}`;
  $("t-platform").textContent = `${t.platform}${t.cores ? ` · ${t.cores} cores` : ""}`;
}

function tickClock() {
  const now = new Date();
  $("clock-time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  $("clock-date").textContent = now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
  if (app.bootedAt) $("t-uptime").textContent = fmtDuration(now - app.bootedAt);
}

/* ───────────── Memory core ───────────── */

async function fetchMemory() {
  const res = await fetch("api/memory", { headers: headers() });
  if (!res.ok) throw new Error(String(res.status));
  return (await res.json()).facts;
}

async function refreshMemoryCount() {
  try {
    $("memory-count").textContent = (await fetchMemory()).length;
  } catch {
    /* locked or offline */
  }
}

async function openMemory() {
  const list = $("memory-list");
  list.innerHTML = '<li class="empty">Accessing memory core…</li>';
  $("memory").showModal();
  try {
    const facts = await fetchMemory();
    list.innerHTML = facts.length ? "" : '<li class="empty">Nothing stored yet. Ask me to remember something.</li>';
    for (const f of facts.slice().reverse()) {
      const li = document.createElement("li");
      li.textContent = f.text;
      const time = document.createElement("time");
      time.textContent = new Date(f.savedAt).toLocaleString();
      li.prepend(time);
      list.append(li);
    }
  } catch {
    list.innerHTML = '<li class="empty">Memory core unavailable.</li>';
  }
}

$("memory-btn").addEventListener("click", openMemory);
$("memory-wipe").addEventListener("click", async () => {
  if (!confirm("Permanently erase everything J.A.R.V.I.S. has been asked to remember?")) return;
  await fetch("api/memory", { method: "DELETE", headers: headers() });
  $("memory").close();
  refreshMemoryCount();
  addLog("system", "Memory core wiped.");
});

/* ───────────── Settings dialog ───────────── */

function fillVoices() {
  const select = $("s-voice");
  select.innerHTML = "";
  select.append(new Option("Automatic (British voice if available)", ""));
  for (const v of mouth.voices) select.append(new Option(`${v.name} (${v.lang})`, v.name));
  select.value = settings.voice;
}

function openSettings() {
  $("s-honorific").value = settings.honorific;
  $("s-rate").value = settings.rate;
  $("s-pitch").value = settings.pitch;
  $("s-rate-out").textContent = Number(settings.rate).toFixed(2);
  $("s-pitch-out").textContent = Number(settings.pitch).toFixed(2);
  $("s-speak").checked = settings.speak;
  $("s-wake").checked = settings.wake;
  $("s-sfx").checked = settings.sfx;
  $("s-code").value = settings.code;
  $("s-wake-row").hidden = !ears.supported;
  $("s-code-row").hidden = !app.health?.accessCodeRequired;
  fillVoices();
  applyTheme(settings.theme, false);
  if (!$("settings").open) $("settings").showModal();
}

function applySettings() {
  mouth.voiceName = settings.voice;
  mouth.rate = Number(settings.rate);
  mouth.pitch = Number(settings.pitch);
  sfx.enabled = settings.sfx;
  ears.setWake(settings.wake);
  applyTheme(settings.theme, false);
}

$("settings-btn").addEventListener("click", openSettings);
for (const id of ["s-rate", "s-pitch"]) {
  $(id).addEventListener("input", (e) => ($(`${id}-out`).textContent = Number(e.target.value).toFixed(2)));
}
$("s-voice").addEventListener("change", (e) => {
  mouth.stop();
  mouth.voiceName = e.target.value;
  mouth.rate = Number($("s-rate").value);
  mouth.pitch = Number($("s-pitch").value);
  mouth.say("Voice calibrated. At your service.");
});
$("s-themes").addEventListener("click", (e) => {
  const theme = e.target.closest("button")?.dataset.theme;
  if (theme) applyTheme(theme, false);
});
$("s-new").addEventListener("click", async () => {
  interrupt();
  fetch("api/reset", { method: "POST", headers: headers(), body: JSON.stringify({ sessionId: app.sessionId }) }).catch(() => {});
  app.sessionId = newId();
  $("log").innerHTML = "";
  addLog("system", "New conversation started. Long-term memory is retained.");
  $("settings").close();
});
$("settings").addEventListener("close", async () => {
  const codeChanged = $("s-code").value !== settings.code;
  Object.assign(settings, {
    honorific: $("s-honorific").value.trim() || "sir",
    voice: $("s-voice").value,
    rate: Number($("s-rate").value),
    pitch: Number($("s-pitch").value),
    speak: $("s-speak").checked,
    wake: $("s-wake").checked,
    sfx: $("s-sfx").checked,
    code: $("s-code").value,
  });
  saveSettings();
  applySettings();
  if (!settings.speak) mouth.stop();
  if (codeChanged) {
    await checkHealth();
    renderTelemetry();
    refreshMemoryCount();
  }
  settle();
});

/* ───────────── Input: keyboard, mic, text ───────────── */

function talk() {
  if (!ears.supported) return;
  if (ears.mode === "ptt") {
    ears.finishPtt();
    return;
  }
  interrupt();
  ears.startPtt();
}

$("talk-btn").addEventListener("click", talk);
$("mic-btn").addEventListener("click", talk);

$("command-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("command-input");
  const text = input.value;
  input.value = "";
  command(text);
});

const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName));
let spaceHeld = false;
window.addEventListener("keydown", (e) => {
  if (!document.body.classList.contains("online") || document.querySelector("dialog[open]")) return;
  if (e.code === "Space" && !e.repeat && !typing(e.target) && ears.supported) {
    e.preventDefault();
    spaceHeld = true;
    interrupt();
    ears.startPtt();
  } else if (e.key === "Escape") {
    interrupt();
    ears.cancel();
    setCaption("");
    settle();
  } else if (e.key === "/" && !typing(e.target)) {
    e.preventDefault();
    $("command-input").focus();
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" && spaceHeld) {
    spaceHeld = false;
    ears.finishPtt();
  }
});

/* ───────────── Boot sequence ───────────── */

async function checkHealth() {
  try {
    const res = await fetch("api/health", { headers: headers(), cache: "no-store" });
    app.health = res.ok ? await res.json() : null;
  } catch {
    app.health = null;
  }
  return app.health;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function bootLog(lines) {
  const pre = $("boot-log");
  for (const [text, status, cls] of lines) {
    const row = document.createElement("div");
    row.textContent = `> ${text} `;
    pre.append(row);
    await sleep(170);
    if (status) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = status;
      row.append(s);
    }
    await sleep(110);
  }
}

function greeting() {
  const h = new Date().getHours();
  const part = h < 5 ? "You're up late" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${settings.honorific}.`;
}

async function boot() {
  $("boot-btn").disabled = true;
  unlockAudio();
  mouth.prime();
  play.boot();
  const healthPromise = health;

  await bootLog([["J.A.R.V.I.S. HUD firmware 1.0", "", ""]]);
  const h = await healthPromise;
  await collectTelemetry();
  let facts = null;
  if (h?.authorised) facts = await fetchMemory().catch(() => null);

  await bootLog([
    ["Server uplink ..........", h ? "ONLINE" : "UNREACHABLE", h ? "ok" : "bad"],
    [
      `Neural link (${h?.model ?? "claude"}) ...`,
      !h ? "OFFLINE" : !h.keyConfigured ? "NO API KEY" : h.authorised ? "ESTABLISHED" : "LOCKED",
      h?.keyConfigured && h?.authorised ? "ok" : "warn",
    ],
    ["Speech synthesis .......", mouth.supported ? "READY" : "UNAVAILABLE", mouth.supported ? "ok" : "warn"],
    ["Voice recognition ......", ears.supported ? "READY" : "TYPE ONLY", ears.supported ? "ok" : "warn"],
    ["Memory core ............", facts ? `${facts.length} FACTS` : "STANDBY", facts ? "ok" : "warn"],
    ["All systems nominal.", "", ""],
  ]);
  await sleep(350);

  $("boot").classList.add("done");
  $("hud").classList.add("online");
  $("hud").removeAttribute("aria-hidden");
  document.body.classList.add("online");
  app.bootedAt = Date.now();
  if (facts) $("memory-count").textContent = facts.length;
  renderTelemetry();
  applySettings();
  $("talk-btn").disabled = !ears.supported;
  if (matchMedia("(pointer: coarse)").matches) {
    $("command-input").placeholder = ears.supported ? "Type a command, or tap the reactor to speak…" : "Type a command…";
  }
  $("hint").innerHTML = ears.supported
    ? "Hold <kbd>Space</kbd> or tap the reactor to speak · <kbd>Esc</kbd> to interrupt · <kbd>/</kbd> to type"
    : "Voice input isn't available in this browser, so type your commands. Chrome, Edge and Safari support it.";

  let line;
  if (!h) {
    line = `${greeting()} I can't reach my server. If you opened this file directly, start me with npm start and visit the address it prints.`;
  } else if (!h.keyConfigured) {
    line = `${greeting()} My neural link is offline. Add your Anthropic API key to the server's environment and restart me.`;
  } else if (!h.authorised) {
    line = `${greeting()} This installation is locked. Enter the access code under configuration.`;
  } else {
    line = `${greeting()} All systems are online. How may I help?`;
  }
  document.activeElement?.blur();
  addLog("jarvis", line);
  setMode(h?.keyConfigured ? "idle" : "offline");
  speak(line);
  if (h && h.keyConfigured && !h.authorised) openSettings();
}

/* ───────────── Start ───────────── */

applyTheme(settings.theme, false);
sfx.enabled = settings.sfx;
setMode("offline");
const health = checkHealth();
$("boot-btn").addEventListener("click", boot, { once: true });
setInterval(tickClock, 1000);
setInterval(tickTimers, 250);
setInterval(collectTelemetry, 30000);
window.addEventListener("online", collectTelemetry);
window.addEventListener("offline", collectTelemetry);
tickClock();
