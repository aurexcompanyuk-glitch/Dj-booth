# J.A.R.V.I.S. — Hermes-Powered AI Assistant

> *"Just A Rather Very Intelligent System"*

A full Iron Man HUD interface connected to the [Hermes agent](https://github.com/NousResearch/hermes-agent) (or OpenAI/Anthropic as a fallback), with voice input, voice output, Spotify control, and full device access.

---

## Quick Start

### 1. Install dependencies
```bash
# From repo root
npm run jarvis:install
```

### 2. Configure your AI backend
```bash
cp jarvis/server/.env.example jarvis/server/.env
# Edit .env and set your preferred mode + API key
```

**Modes:**

| `AI_MODE` | What it uses | Setup required |
|-----------|--------------|----------------|
| `hermes`  | Hermes agent CLI (full tool suite) | Install Hermes first (see below) |
| `openai`  | OpenAI GPT-4o | `OPENAI_API_KEY=sk-...` |
| `anthropic` | Claude | `ANTHROPIC_API_KEY=sk-ant-...` |

### 3. Launch
```bash
# From repo root — starts both server (port 3001) and UI (port 5174)
npm run jarvis
```

Open **http://localhost:5174** in your browser.

---

## Installing Hermes Agent (optional but recommended)

Hermes gives Jarvis 40+ built-in tools (web search, code execution, file management, etc.).

```bash
# Linux / macOS / WSL
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.bashrc    # reload shell
hermes setup        # configure your model/API key
```

Then set `AI_MODE=hermes` in `jarvis/server/.env`.

---

## Features

- **Voice input** — click the microphone and speak; the browser's Speech Recognition API transcribes
- **Voice output** — Jarvis reads every response aloud (British accent when available); toggle with the speaker button
- **Spotify control** — say *"Play Thunderstruck by AC/DC"* and Jarvis launches it
- **Device commands** — *"List files in my home folder"*, *"Open YouTube"*, *"What's my CPU usage?"*
- **Full Hermes tool suite** — when running in `hermes` mode, Jarvis has web search, code execution, memory, scheduling, and 40+ tools
- **Animated Iron Man HUD** — arc reactor, radar scanner, system telemetry panels, Orbitron font

---

## Spotify Setup

Spotify control works best with `playerctl` installed:

```bash
sudo apt install playerctl   # Ubuntu/Debian
brew install playerctl       # macOS
```

Without playerctl, Jarvis falls back to opening the Spotify URI scheme (requires Spotify desktop app).

---

## Voice Output Tips

- Uses the browser's built-in Web Speech API — no API key required
- For the best Jarvis-like voice, use **Chrome** or **Edge** (they include high-quality voices)
- On macOS, the "Daniel" (en-GB) voice is excellent
- For a premium experience, set `ELEVENLABS_API_KEY` in `.env` (ElevenLabs TTS support coming soon)
