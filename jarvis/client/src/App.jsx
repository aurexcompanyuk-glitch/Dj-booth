import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HolographicOrb from './components/HolographicOrb'
import ChatWindow from './components/ChatWindow'
import InputBar from './components/InputBar'
import StatusBar from './components/StatusBar'
import RadarPanel from './components/RadarPanel'
import SystemStats from './components/SystemStats'
import GridOverlay from './components/GridOverlay'

const WS_URL = `ws://${window.location.hostname}:3001`

// ── TTS: Jarvis voice ─────────────────────────────────────────────────────────
function speakAsJarvis(text, onStart, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 0.88
  utter.pitch = 0.82
  utter.volume = 1
  const voices = window.speechSynthesis.getVoices()
  const voice  = voices.find((v) => v.lang === 'en-GB' && /male/i.test(v.name))
    || voices.find((v) => v.lang === 'en-GB')
    || voices.find((v) => v.lang.startsWith('en'))
  if (voice) utter.voice = voice
  utter.onstart = onStart
  utter.onend   = onEnd
  utter.onerror = onEnd
  window.speechSynthesis.speak(utter)
}

// ── Wake-word: continuous recognition ────────────────────────────────────────
const WAKE_WORDS = ['jarvis', 'hey jarvis', 'okay jarvis', 'j.a.r.v.i.s']

export default function App() {
  const [messages, setMessages]     = useState([])
  const [status, setStatus]         = useState('INITIALIZING')
  const [thinking, setThinking]     = useState(false)
  const [connected, setConnected]   = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [speaking, setSpeaking]     = useState(false)
  const [wakeListening, setWakeListening] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [manualListening, setManualListening] = useState(false)

  const wsRef         = useRef(null)
  const streamIdRef   = useRef(null)
  const streamBufRef  = useRef('')
  const wakeRecRef    = useRef(null)
  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const audioRafRef   = useRef(null)
  const ttsEnabledRef = useRef(ttsEnabled)
  useEffect(() => { ttsEnabledRef.current = ttsEnabled }, [ttsEnabled])

  // ── Load voices early (Chrome async) ─────────────────────────────────────
  useEffect(() => {
    window.speechSynthesis?.getVoices()
    window.speechSynthesis?.addEventListener('voiceschanged', () =>
      window.speechSynthesis.getVoices()
    )
  }, [])

  // ── Message helper ────────────────────────────────────────────────────────
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

  // ── WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      setStatus('CONNECTING')
      ws.onopen  = () => { setConnected(true); setStatus('ONLINE') }
      ws.onclose = () => { setConnected(false); setStatus('RECONNECTING'); setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
      ws.onmessage = ({ data }) => {
        const msg = JSON.parse(data)

        if (msg.type === 'status') {
          addMsg('jarvis', msg.text)
          if (ttsEnabledRef.current) speakAsJarvis(msg.text, () => setSpeaking(true), () => setSpeaking(false))
        }
        if (msg.type === 'thinking') {
          setThinking(true)
          streamIdRef.current = `s-${Date.now()}`
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
            if (ttsEnabledRef.current) speakAsJarvis(final, () => setSpeaking(true), () => setSpeaking(false))
          }
          streamIdRef.current = null
          streamBufRef.current = ''
        }
        if (msg.type === 'error') {
          setThinking(false)
          addMsg('system', `ERROR: ${msg.text}`)
        }
      }
    }
    connect()
    return () => wsRef.current?.close()
  }, [addMsg])

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    addMsg('user', text)
    wsRef.current.send(JSON.stringify({ type: 'chat', text }))
  }, [addMsg])

  // ── Microphone audio analysis (for orb reactivity) ───────────────────────
  const startAudioAnalysis = useCallback(async () => {
    if (audioCtxRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const ctx     = new (window.AudioContext || window.webkitAudioContext)()
      const source  = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      source.connect(analyser)
      audioCtxRef.current = ctx
      analyserRef.current = analyser

      const data = new Uint8Array(analyser.frequencyBinCount)
      function tick() {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((s, v) => s + v, 0) / data.length
        setAudioLevel(avg / 255)
        audioRafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      console.warn('Microphone access denied:', e.message)
    }
  }, [])

  // ── Always-on wake word detection ─────────────────────────────────────────
  const startWakeWord = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (wakeRecRef.current) return

    const rec = new SR()
    rec.continuous      = true
    rec.interimResults  = true
    rec.lang            = 'en-US'
    rec.maxAlternatives = 3

    let debounceId = null
    let lastSentAt = 0

    rec.onstart = () => setWakeListening(true)
    rec.onend   = () => {
      // Auto-restart — browsers kill recognition after silence
      setWakeListening(false)
      if (wakeRecRef.current) {
        setTimeout(() => {
          try { wakeRecRef.current?.start() } catch {}
        }, 400)
      }
    }
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') { wakeRecRef.current = null; setWakeListening(false) }
    }

    rec.onresult = (e) => {
      // Collect all results since last confirmed
      let fullTranscript = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        fullTranscript += e.results[i][0].transcript
      }
      const lower = fullTranscript.toLowerCase().trim()

      // Check for wake word
      const hasWake = WAKE_WORDS.some((w) => lower.includes(w))
      if (!hasWake) return

      // Extract command after the wake word
      let command = lower
      WAKE_WORDS.forEach((w) => {
        const idx = command.indexOf(w)
        if (idx !== -1) command = command.slice(idx + w.length).trim()
      })

      // Must be a final result and have a command and not be too rapid
      const isFinal = e.results[e.results.length - 1].isFinal
      const now = Date.now()
      if (isFinal && command.length > 2 && now - lastSentAt > 2500) {
        lastSentAt = now
        clearTimeout(debounceId)
        debounceId = setTimeout(() => {
          // Stop TTS if talking so we hear the new command
          window.speechSynthesis?.cancel()
          setSpeaking(false)
          sendMessage(command)
        }, 150)
      }
    }

    wakeRecRef.current = rec
    try { rec.start() } catch {}
  }, [sendMessage])

  // Start audio + wake word on first interaction
  const handleFirstInteraction = useCallback(() => {
    startAudioAnalysis()
    startWakeWord()
  }, [startAudioAnalysis, startWakeWord])

  useEffect(() => {
    window.addEventListener('click', handleFirstInteraction, { once: true })
    window.addEventListener('keydown', handleFirstInteraction, { once: true })
    return () => {
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [handleFirstInteraction])

  // Cleanup
  useEffect(() => () => {
    cancelAnimationFrame(audioRafRef.current)
    audioCtxRef.current?.close()
    if (wakeRecRef.current) { wakeRecRef.current.stop(); wakeRecRef.current = null }
  }, [])

  // ── Derived orb size ──────────────────────────────────────────────────────
  const ORB_SIZE = Math.min(window.innerWidth * 0.52, window.innerHeight * 0.72)

  return (
    <div style={styles.root}>
      <GridOverlay />
      <StatusBar status={status} connected={connected} wakeListening={wakeListening} />

      <div style={styles.body}>
        {/* ── Left side panel ──────────────────────────────────────────── */}
        <div style={styles.leftPanel}>
          <RadarPanel active={connected} />
          <SystemStats />
        </div>

        {/* ── Centre: orb + chat overlay ───────────────────────────────── */}
        <div style={styles.center}>
          {/* Orb background */}
          <div style={styles.orbWrap}>
            <HolographicOrb
              listening={wakeListening || manualListening}
              thinking={thinking}
              speaking={speaking}
              audioLevel={audioLevel}
              size={ORB_SIZE}
            />

            {/* Wake word badge */}
            <AnimatePresence>
              {wakeListening && (
                <motion.div
                  style={styles.wakeBadge}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ● LISTENING FOR "JARVIS"
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chat overlay — floats over the orb */}
          <div style={styles.chatOverlay}>
            <ChatWindow messages={messages} thinking={thinking} />
          </div>

          {/* Input bar */}
          <InputBar
            onSend={sendMessage}
            disabled={!connected || thinking}
            ttsEnabled={ttsEnabled}
            onTtsToggle={() => { const n = !ttsEnabled; setTtsEnabled(n); if (!n) window.speechSynthesis?.cancel() }}
            onListenStart={() => { setManualListening(true); startAudioAnalysis() }}
            onListenEnd={() => setManualListening(false)}
          />
        </div>

        {/* ── Right side panel (mirrored) ──────────────────────────────── */}
        <div style={{ ...styles.leftPanel, transform: 'scaleX(-1)' }}>
          <RadarPanel active={connected} reverse />
          <SystemStats mirror />
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    background: '#000a14',
    overflow: 'hidden', position: 'relative',
  },
  body: {
    flex: 1, display: 'flex',
    overflow: 'hidden',
    padding: '0 6px 6px',
    gap: '6px',
  },
  leftPanel: {
    width: '186px', flexShrink: 0,
    display: 'flex', flexDirection: 'column',
    gap: '6px',
  },
  center: {
    flex: 1, display: 'flex', flexDirection: 'column',
    position: 'relative', minWidth: 0, gap: '6px',
  },
  orbWrap: {
    flex: 1, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
  },
  chatOverlay: {
    position: 'absolute',
    bottom: '70px', left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(640px, 90%)',
    maxHeight: '42%',
    zIndex: 10,
  },
  wakeBadge: {
    position: 'absolute',
    bottom: '12px',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#ff6d00',
    textShadow: '0 0 10px #ff6d0060',
    zIndex: 20,
  },
}
