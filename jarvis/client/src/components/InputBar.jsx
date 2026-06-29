import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function InputBar({ onSend, disabled, ttsEnabled, onTtsToggle }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  // ── Speech Recognition setup ───────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const rec = new SpeechRecognition()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('')
      setText(transcript)
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false)
      }
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recognitionRef.current = rec
  }, [])

  const toggleListen = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
      setListening(false)
    } else {
      rec.start()
      setListening(true)
    }
  }, [listening])

  const submit = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }, [text, disabled, onSend])

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div style={styles.wrap}>
      {/* Voice button */}
      <motion.button
        style={{
          ...styles.iconBtn,
          borderColor: listening ? '#ff6d00' : '#00e5ff30',
          boxShadow: listening ? '0 0 12px #ff6d0060' : 'none',
        }}
        onClick={toggleListen}
        whileTap={{ scale: 0.92 }}
        title="Voice input"
      >
        <MicIcon active={listening} />
      </motion.button>

      {/* Text input */}
      <div style={styles.inputWrap}>
        <AnimatePresence>
          {listening && (
            <motion.div
              style={styles.listeningBadge}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >● LISTENING</motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          disabled={disabled}
          placeholder={disabled ? 'Establishing connection...' : 'Address J.A.R.V.I.S. — or press the microphone to speak...'}
          style={styles.textarea}
          rows={2}
        />
      </div>

      {/* TTS toggle */}
      <motion.button
        style={{
          ...styles.iconBtn,
          borderColor: ttsEnabled ? '#00e5ff60' : '#00e5ff20',
          opacity: ttsEnabled ? 1 : 0.5,
        }}
        onClick={onTtsToggle}
        whileTap={{ scale: 0.92 }}
        title="Toggle voice output"
      >
        <SpeakerIcon active={ttsEnabled} />
      </motion.button>

      {/* Send */}
      <motion.button
        style={{
          ...styles.sendBtn,
          opacity: disabled || !text.trim() ? 0.4 : 1,
          cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
        }}
        onClick={submit}
        disabled={disabled || !text.trim()}
        whileTap={{ scale: 0.93 }}
      >
        SEND
      </motion.button>

    </div>
  )
}

function MicIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#ff6d00' : '#00e5ff'} strokeWidth="2">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="8" y1="22" x2="16" y2="22"/>
    </svg>
  )
}

function SpeakerIcon({ active }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00e5ff' : '#4dd0e1'} strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      {active && <>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </>}
    </svg>
  )
}

const styles = {
  wrap: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: '8px',
    padding: '10px',
    zIndex: 1,
    flexShrink: 0,
  },
  iconBtn: {
    width: '40px',
    height: '40px',
    flexShrink: 0,
    background: 'transparent',
    border: '1px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputWrap: {
    flex: 1,
    position: 'relative',
  },
  listeningBadge: {
    position: 'absolute',
    top: '-22px',
    left: 0,
    fontSize: '10px',
    fontFamily: 'Orbitron, sans-serif',
    color: '#ff6d00',
    letterSpacing: '0.15em',
  },
  textarea: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #00e5ff20',
    borderRadius: '4px',
    color: '#e0f7fa',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: '13px',
    padding: '8px 10px',
    resize: 'none',
    outline: 'none',
    lineHeight: '1.5',
    transition: 'border-color 0.2s',
  },
  sendBtn: {
    height: '40px',
    padding: '0 18px',
    background: 'linear-gradient(135deg, #003344, #001f3f)',
    border: '1px solid #00e5ff60',
    borderRadius: '6px',
    color: '#00e5ff',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: '11px',
    letterSpacing: '0.15em',
    cursor: 'pointer',
    flexShrink: 0,
    boxShadow: '0 0 10px #00e5ff20',
    transition: 'opacity 0.2s',
  },
}
