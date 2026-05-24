'use client'
import { useState, useRef, useEffect } from 'react'

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void
  className?: string
}

export function VoiceMicButton({ onTranscript, className }: VoiceMicButtonProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setIsSupported(!!SpeechRecognition)
  }, [])

  function toggle() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognition.start()
    setIsListening(true)
  }

  if (!isSupported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? 'Stop recording' : 'Speak your input'}
      className={className}
      style={{
        background: isListening ? '#ef4444' : 'rgba(0,0,0,0.06)',
        border: 'none',
        borderRadius: '8px',
        padding: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      {isListening ? (
        // Stop icon with pulse
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
          Stop
        </span>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      )}
    </button>
  )
}
