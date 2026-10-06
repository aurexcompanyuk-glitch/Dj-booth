# J.A.R.V.I.S.

*Just A Rather Very Intelligent System*: a voice-controlled AI assistant with an Iron Man–style heads-up display, running on Claude.

Talk to it and it answers out loud in a dry British voice. It can search the web for live information, remember things about you between conversations, set timers, open websites and change the HUD's colour scheme.

## Features

- **Voice in and out.** Hold <kbd>Space</kbd> or tap the arc reactor to speak. Replies are spoken sentence by sentence while they stream, so it starts talking almost straight away.
- **Wake word.** Turn on hands-free mode in Configuration, then say *"Jarvis, …"*.
- **Barge-in.** Start speaking (or press <kbd>Esc</kbd>) while it's talking and it stops to listen.
- **Live web search.** It looks up news, weather, scores and prices instead of guessing.
- **Long-term memory.** Say *"Remember that my sister's birthday is 3 March"*. Facts persist across sessions in `data/memory.json`. You can review or wipe them from the HUD.
- **HUD actions.** Timers with spoken alerts, opening websites, and five colour schemes: arc blue, Mark red/gold, gold, stealth and emerald.
- **Diagnostics.** *"Status report"* reads out your battery, network and server health.
- **Animated arc-reactor visualiser** that reacts to listening, thinking, searching and speaking. Works on desktop and mobile.

## Quick start

You need [Node.js 20+](https://nodejs.org) and an Anthropic API key from <https://console.anthropic.com/>.

```bash
cd jarvis
cp .env.example .env        # then put your key in ANTHROPIC_API_KEY
npm install
npm start
```

Open <http://localhost:3000> and click **Initialize**. The click unlocks audio and the microphone. Allow microphone access when your browser asks.

**Things to try**

- "What's the weather in London tomorrow?"
- "Remember that I take my coffee black."
- "Set a timer for ten minutes for the pasta."
- "Switch to Mark colours." / "Go stealth."
- "Open YouTube."
- "Status report."

## Deploying (e.g. Railway)

1. Create a new service from this repository and set its **Root Directory** to `jarvis`. The included `Dockerfile` and `railway.toml` handle the build and health check.
2. Add these environment variables:
   - `ANTHROPIC_API_KEY`: your key.
   - `JARVIS_ACCESS_CODE`: **set this for any public deployment.** Without it, anyone who finds the URL can spend your API credit. Enter the same code in the HUD under Configuration.
3. Optional: to keep memories across redeploys, attach a volume mounted at `/app/data`.

Browsers only allow the microphone on **HTTPS** (or `localhost`). Railway URLs are HTTPS, so this works out of the box.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Required. Claude API key. |
| `JARVIS_ACCESS_CODE` | *(none)* | Code the HUD must send. Strongly recommended when deployed. |
| `JARVIS_MODEL` | `claude-opus-5-5` | Claude model to use. |
| `JARVIS_EFFORT` | `low` | Reasoning effort: `low`, `medium`, `high`, `xhigh` or `max`. Higher is smarter on hard questions but slower to answer. `low` keeps conversation snappy. |
| `JARVIS_DATA_DIR` | `data` | Where `memory.json` lives. |
| `PORT` | `3000` | HTTP port. |

Per-browser settings (form of address, voice, speech rate and pitch, wake word, sounds, colour scheme) are under the gear icon. The default form of address is "sir", as in the films; change it to "ma'am", "boss", your name, or anything else.

## How it works

```
Browser HUD (public/)                          Server (server.mjs, src/)
─────────────────────                          ─────────────────────────
Web Speech recognition ──"what's the weather"──▶ /api/chat
                                                  │  Claude agent loop (src/brain.mjs)
                                                  │   • web_search (runs on Anthropic's side)
                                                  │   • remember / forget / system_status
                                                  │   • set_timer / open_url / set_hud_theme
Speech synthesis ◀── streamed text (SSE) ─────────┤     → sent to the HUD as actions
Arc reactor + HUD ◀── status / action events ─────┘
```

- The server keeps each conversation's history in memory, so the browser only sends the new message. History is append-only: an interrupted or declined turn is rolled back as a whole.
- If Claude's safety classifiers decline a request, the server opts into Anthropic's server-side fallback (`fallbacks: "default"`), which retries on a fallback model. If that also declines, J.A.R.V.I.S. politely says so.
- The browser's own speech engines handle voice, so nothing extra needs installing. In Chrome, speech recognition audio is processed by Google's servers. Safari and Edge use their own services.

## Browser support

| | Voice input | Voice output |
| --- | --- | --- |
| Chrome / Edge (desktop and Android) | ✅ | ✅ |
| Safari (macOS / iOS) | ✅ | ✅ |
| Firefox | ❌ (type instead) | ✅ |

---

A fan project inspired by the Iron Man films. Not affiliated with Marvel or Disney.
