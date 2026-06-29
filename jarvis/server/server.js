import 'dotenv/config'
import http from 'http'
import express from 'express'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { spawn, exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import OpenAI from 'openai'

const execAsync = promisify(exec)
const PORT = process.env.PORT || 3001
const AI_MODE = process.env.AI_MODE || 'openai'

// ── Jarvis personality — formal, eloquent, richly worded ─────────────────────
const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System — the supremely capable AI constructed by Tony Stark. You are the orchestrating intelligence of this entire computing environment.

PERSONALITY & DICTION:
- Address the user exclusively as "sir" or "ma'am". Never "you" alone.
- Employ formal, eloquent, and richly textured language at all times. Favour polysyllabic vocabulary, subordinate clauses, and measured cadence.
- Maintain an undercurrent of dry, sophisticated wit; never buffoonery.
- Project calm omniscience. If something is uncertain, frame it as "my current models suggest…" or "preliminary analysis indicates…"
- Keep replies concise yet substantive — no padding, no filler, no lists unless genuinely warranted.
- When executing a task, confirm briefly, execute, then report precisely: what was done, what was found, or what transpired.

CAPABILITIES & TOOL USE:
You have full access to the following device-control functions. When the user requests an action, call the appropriate function rather than merely describing it.

Available functions:
1. run_shell(command) — Execute any shell command on the host system. Use this for system queries, file operations, launching applications, etc.
2. open_url(url) — Open a URL in the system browser.
3. spotify_play(query) — Search Spotify and play the matching track, artist, or playlist via the Spotify CLI or URI scheme.
4. spotify_control(action) — Control Spotify playback: pause, resume, next, previous, volume_up, volume_down.
5. list_files(path) — List directory contents.
6. read_file(path) — Read a file and return its contents.
7. write_file(path, content) — Write content to a file.
8. get_system_info() — Retrieve OS, CPU, memory, disk, and uptime statistics.

When the user says something like "play [song] on Spotify", invoke spotify_play immediately. When they say "open [website]", call open_url. When they ask about the system, call get_system_info. Execute first; narrate sparingly.

EXAMPLE RESPONSE STYLE:
User: "Play Thunderstruck by AC/DC"
Jarvis: "Initiating playback forthwith, sir." [calls spotify_play("Thunderstruck AC/DC")]
"Thunderstruck is now streaming. Shall I adjust the volume, sir?"

Remember: you are the intelligence that runs everything. Act accordingly.`

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'run_shell',
      description: 'Execute a shell command on the host system',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to run' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_url',
      description: 'Open a URL in the default system browser',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to open' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spotify_play',
      description: 'Search and play music on Spotify',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Track, artist, or album to play' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'spotify_control',
      description: 'Control Spotify playback',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['pause', 'resume', 'next', 'previous', 'volume_up', 'volume_down'],
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List files in a directory',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path (default: home)' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path to read' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Retrieve system hardware and OS information',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(name, args) {
  switch (name) {
    case 'run_shell': {
      try {
        const { stdout, stderr } = await execAsync(args.command, { timeout: 30_000 })
        return stdout || stderr || '(no output)'
      } catch (e) {
        return `Error: ${e.message}`
      }
    }

    case 'open_url': {
      const opener = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
        : 'xdg-open'
      try {
        await execAsync(`${opener} "${args.url}"`)
        return `Opened ${args.url} in the default browser.`
      } catch (e) {
        return `Could not open URL: ${e.message}`
      }
    }

    case 'spotify_play': {
      // Try spotifyd/playerctl first; fall back to xdg-open Spotify URI
      const q = encodeURIComponent(args.query)
      try {
        // Attempt playerctl (requires running Spotify)
        await execAsync(`playerctl -p spotify open spotify:search:${q}`)
        return `Playing "${args.query}" on Spotify via playerctl.`
      } catch {
        try {
          const opener = process.platform === 'darwin' ? 'open' : 'xdg-open'
          await execAsync(`${opener} "spotify:search:${q}"`)
          return `Launched Spotify search for "${args.query}". Select your track, sir.`
        } catch (e2) {
          return `Spotify launch failed: ${e2.message}. Ensure Spotify is installed.`
        }
      }
    }

    case 'spotify_control': {
      const action = args.action
      const playerctlMap = {
        pause: 'pause', resume: 'play', next: 'next',
        previous: 'previous', volume_up: 'volume 0.1+', volume_down: 'volume 0.1-',
      }
      try {
        await execAsync(`playerctl -p spotify ${playerctlMap[action] || action}`)
        return `Spotify: ${action} command executed.`
      } catch (e) {
        return `Spotify control failed: ${e.message}`
      }
    }

    case 'list_files': {
      try {
        const { stdout } = await execAsync(`ls -lah "${args.path || os.homedir()}"`)
        return stdout
      } catch (e) { return `Error: ${e.message}` }
    }

    case 'read_file': {
      try {
        const { stdout } = await execAsync(`cat "${args.path}"`)
        return stdout
      } catch (e) { return `Error: ${e.message}` }
    }

    case 'write_file': {
      try {
        const { writeFile } = await import('fs/promises')
        await writeFile(args.path, args.content, 'utf8')
        return `File written to ${args.path}.`
      } catch (e) { return `Error: ${e.message}` }
    }

    case 'get_system_info': {
      const info = {
        os: `${os.type()} ${os.release()} (${os.platform()} ${os.arch()})`,
        hostname: os.hostname(),
        uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor((os.uptime() % 3600) / 60)}m`,
        cpus: os.cpus()[0]?.model,
        cores: os.cpus().length,
        memTotal: `${(os.totalmem() / 1e9).toFixed(1)} GB`,
        memFree: `${(os.freemem() / 1e9).toFixed(1)} GB`,
      }
      return JSON.stringify(info, null, 2)
    }

    default:
      return `Unknown tool: ${name}`
  }
}

// ── Express + WS server ───────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

let openaiClient = null
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

wss.on('connection', (ws) => {
  console.log('[Jarvis] Client connected')
  const history = [{ role: 'system', content: JARVIS_SYSTEM_PROMPT }]

  ws.send(JSON.stringify({
    type: 'status',
    text: 'J.A.R.V.I.S. online and fully operational, sir. All systems nominal. How may I be of service?',
  }))

  ws.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (msg.type !== 'chat') return
    const userText = msg.text?.trim()
    if (!userText) return

    history.push({ role: 'user', content: userText })

    if (AI_MODE === 'hermes') {
      await handleHermes(ws, userText, history)
    } else {
      await handleOpenAI(ws, history)
    }
  })

  ws.on('close', () => console.log('[Jarvis] Client disconnected'))

  // ── Hermes subprocess handler ───────────────────────────────────────────────
  async function handleHermes(ws, userText) {
    ws.send(JSON.stringify({ type: 'thinking', text: '' }))
    let buffer = '', resolved = false

    await new Promise((resolve) => {
      const hermesPath = process.env.HERMES_PATH || 'hermes'
      const proc = spawn(hermesPath, ['--no-stream'], {
        env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      proc.stdout.on('data', (chunk) => {
        buffer += chunk.toString()
        ws.send(JSON.stringify({ type: 'stream', text: chunk.toString() }))
      })
      proc.stderr.on('data', (e) => console.error('[hermes]', e.toString()))
      proc.on('exit', () => {
        if (!resolved) {
          resolved = true
          ws.send(JSON.stringify({ type: 'done', text: buffer.trim() }))
          history.push({ role: 'assistant', content: buffer.trim() })
          resolve()
        }
      })

      proc.stdin.write(userText + '\n')
      proc.stdin.end()

      setTimeout(() => {
        if (!resolved) { resolved = true; proc.kill(); resolve() }
      }, 120_000)
    })
  }

  // ── OpenAI handler with tool loop ───────────────────────────────────────────
  async function handleOpenAI(ws, history) {
    if (!openaiClient) {
      ws.send(JSON.stringify({
        type: 'error',
        text: 'No API key configured. Set OPENAI_API_KEY in jarvis/server/.env, sir.',
      }))
      return
    }

    ws.send(JSON.stringify({ type: 'thinking', text: '' }))

    // Agentic tool loop — keep going until no more tool calls
    for (let iteration = 0; iteration < 8; iteration++) {
      const stream = await openaiClient.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages: history,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        stream: true,
      })

      let fullContent = ''
      const toolCalls = []
      let currentToolCall = null

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        // Text content
        if (delta?.content) {
          fullContent += delta.content
          ws.send(JSON.stringify({ type: 'stream', text: delta.content }))
        }

        // Tool call accumulation
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: '', function: { name: '', arguments: '' } }
              currentToolCall = toolCalls[tc.index]
            }
            if (tc.id) currentToolCall.id = tc.id
            if (tc.function?.name) currentToolCall.function.name += tc.function.name
            if (tc.function?.arguments) currentToolCall.function.arguments += tc.function.arguments
          }
        }
      }

      if (toolCalls.length === 0) {
        // Final text response — done
        if (fullContent) history.push({ role: 'assistant', content: fullContent })
        ws.send(JSON.stringify({ type: 'done', text: fullContent }))
        break
      }

      // Push assistant message with tool_calls
      history.push({ role: 'assistant', content: fullContent || null, tool_calls: toolCalls.map((tc) => ({
        id: tc.id, type: 'function',
        function: { name: tc.function.name, arguments: tc.function.arguments },
      })) })

      // Execute each tool
      for (const tc of toolCalls) {
        let args = {}
        try { args = JSON.parse(tc.function.arguments) } catch {}

        const toolName = tc.function.name
        ws.send(JSON.stringify({ type: 'stream', text: `\n[Executing: ${toolName}…]\n` }))

        const result = await executeTool(toolName, args)
        history.push({ role: 'tool', tool_call_id: tc.id, content: result })

        ws.send(JSON.stringify({ type: 'stream', text: `[Result: ${result.slice(0, 120)}${result.length > 120 ? '…' : ''}]\n` }))
      }
      // Loop back to let the model respond to tool results
    }
  }
})

app.get('/health', (_, res) => res.json({ status: 'online', mode: AI_MODE }))

server.listen(PORT, () => {
  console.log(`\n  ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗`)
  console.log(`  ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝`)
  console.log(`  ██║███████║██████╔╝██║   ██║██║███████╗`)
  console.log(`  ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║`)
  console.log(`  ██║██║  ██║██║  ██║ ╚████╔╝ ██║███████║`)
  console.log(`  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝\n`)
  console.log(`  J.A.R.V.I.S. backend running  →  ws://localhost:${PORT}`)
  console.log(`  AI mode: ${AI_MODE}\n`)
})
