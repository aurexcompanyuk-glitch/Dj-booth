import { useEffect, useRef, useState, useCallback } from 'react'
import HUD from './components/HUD'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import StatusBar from './components/StatusBar'
import ArcReactor from './components/ArcReactor'
import RadarPanel from './components/RadarPanel'
import SystemStats from './components/SystemStats'
import GridOverlay from './components/GridOverlay'

const WS_URL = `ws://${window.location.hostname}:3001`

// ── Text-to-Speech (Jarvis voice) ────────────────────────────────────────────
function speakAsJarvis(text) {
  if (!window.speechSynthesis) return
  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.92
  utterance.pitch = 0.85
  utterance.volume = 1

  // Prefer a British-accented voice for Jarvis
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (v) => v.lang === 'en-GB' && v.name.toLowerCase().includes('male')
  ) || voices.find((v) => v.lang === 'en-GB')
    || voices.find((v) => v.lang.startsWith('en'))

  if (preferred) utterance.voice = preferred
  window.speechSynthesis.speak(utterance)
}

export default function App() {
  const [messages, setMessages]   = useState([])
  const [status, setStatus]       = useState('INITIALIZING')
  const [thinking, setThinking]   = useState(false)
  const [connected, setConnected] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const wsRef = useRef(null)
  const streamIdRef = useRef(null)
  const streamBufRef = useRef('')

  // Voices load async in Chrome
  useEffect(() => {
    window.speechSynthesis?.getVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', () =>
      window.speechSynthesis.getVoices()
    )
  }, [])

  const addMsg = useCallback((role, text, id) => {
    setMessages((prev) => {
      if (id) {
        const exists = prev.find((m) => m.id === id)
        if (exists) return prev.map((m) => m.id === id ? { ...m, text } : m)
        return [...prev, { role, text, id, ts: Date.now() }]
      }
      return [...prev, { role, text, id: Date.now() + Math.random(), ts: Date.now() }]
    })
  }, [])

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      setStatus('CONNECTING')

      ws.onopen = () => {
        setConnected(true)
        setStatus('ONLINE')
      }

      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)

        if (msg.type === 'status') {
          addMsg('jarvis', msg.text)
          if (ttsEnabled) speakAsJarvis(msg.text)
          setStatus('ONLINE')
        }

        if (msg.type === 'thinking') {
          setThinking(true)
          streamIdRef.current = `stream-${Date.now()}`
          streamBufRef.current = ''
        }

        if (msg.type === 'stream') {
          streamBufRef.current += msg.text
          addMsg('jarvis', streamBufRef.current, streamIdRef.current)
        }

        if (msg.type === 'done') {
          setThinking(false)
          const final = msg.text || streamBufRef.current
          if (final) {
            addMsg('jarvis', final, streamIdRef.current)
            if (ttsEnabled) speakAsJarvis(final)
          }
          streamIdRef.current = null
          streamBufRef.current = ''
        }

        if (msg.type === 'error') {
          setThinking(false)
          addMsg('system', `ERROR: ${msg.text}`)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        setStatus('RECONNECTING')
        setTimeout(connect, 3000)
      }

      ws.onerror = () => ws.close()
    }

    connect()
    return () => wsRef.current?.close()
  }, [addMsg]) // ttsEnabled intentionally excluded — closure over ref below

  // Keep ttsEnabled accessible inside WS callbacks via a ref
  const ttsEnabledRef = useRef(ttsEnabled)
  useEffect(() => { ttsEnabledRef.current = ttsEnabled }, [ttsEnabled])

  const sendMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    addMsg('user', text)
    wsRef.current.send(JSON.stringify({ type: 'chat', text }))
  }, [addMsg])

  return (
    <div style={styles.root}>
      <GridOverlay />
      <StatusBar status={status} connected={connected} />

      <div style={styles.body}>
        {/* Left panel */}
        <div style={styles.sidePanel}>
          <ArcReactor active={connected} thinking={thinking} />
          <RadarPanel active={connected} />
          <SystemStats />
        </div>

        {/* Centre */}
        <div style={styles.center}>
          <HUD thinking={thinking} connected={connected} />
          <ChatWindow messages={messages} thinking={thinking} />
          <InputBar
            onSend={sendMessage}
            disabled={!connected || thinking}
            ttsEnabled={ttsEnabled}
            onTtsToggle={() => {
              const next = !ttsEnabled
              setTtsEnabled(next)
              if (!next) window.speechSynthesis?.cancel()
            }}
          />
        </div>

        {/* Right panel — mirrored */}
        <div style={{ ...styles.sidePanel, transform: 'scaleX(-1)' }}>
          <ArcReactor active={connected} thinking={thinking} size={120} />
          <RadarPanel active={connected} reverse />
          <SystemStats mirror />
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(ellipse at center, #001528 0%, #000d1a 100%)',
    overflow: 'hidden',
    position: 'relative',
  },
  body: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    padding: '0 8px 8px',
    gap: '8px',
  },
  sidePanel: {
    width: '200px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  center: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
  },
}
