'use client'

// ── Voice ("speak") affordance for the Vida chat — SHELL (#178) ───────────────
// Tap-to-talk mic + speaker toggle + animated waveform, sitting alongside the
// existing /vida/help TEXT chat (which stays the fallback). Real speech-in /
// speech-out goes through Vapi and needs a key the founder hasn't provided yet,
// so the actual transport is held behind VOICE_ENABLED (see lib/voice.ts).
//
// When the key is ABSENT: tapping the mic does NOT fake a recording — it raises
// onUnavailable() so the chat can post a friendly "voice coming soon, keep
// typing" note. When the key LANDS: VOICE_ENABLED flips true and the start/stop
// handlers below are the single place to drop the Vapi client in.

import { useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { VOICE_ENABLED } from '@/lib/voice'

type VoiceState = 'idle' | 'listening' | 'speaking'

interface VoiceControlsProps {
  /** Called when the mic is tapped but no Vapi key is configured yet. */
  onUnavailable: () => void
}

/** Five-bar animated waveform — purely visual feedback for an active session. */
function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-4" aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-[#7C3AED] transition-all ${active ? 'voice-wave-bar' : 'h-1 opacity-40'}`}
          style={active ? { animationDelay: `${i * 110}ms` } : undefined}
        />
      ))}
    </div>
  )
}

export function VoiceControls({ onUnavailable }: VoiceControlsProps) {
  const [state, setState]   = useState<VoiceState>('idle')
  const [speaker, setSpeaker] = useState(true)

  const active = state !== 'idle'

  function handleMicTap() {
    // No key yet → never fake a mic. Hand back to the text chat.
    if (!VOICE_ENABLED) {
      onUnavailable()
      return
    }

    // Key present → real Vapi transport wires in here (start / stop the call).
    // Intentionally the SINGLE integration point for #178's live follow-up.
    if (active) {
      setState('idle')
      // TODO(#178 live): vapi.stop()
    } else {
      setState('listening')
      // TODO(#178 live): vapi.start(VAPI_PUBLIC_KEY, { … }), drive setState via
      // 'speech-start' / 'speech-end' events, mute output when !speaker.
    }
  }

  const micLabel = !VOICE_ENABLED
    ? 'Voice chat — coming soon'
    : active
      ? 'Stop voice chat'
      : 'Start voice chat — tap to talk'

  // Not built yet (no Vapi key) → show an honest, VISIBLE "coming soon" teaser, not a
  // live-looking mic. Tapping still posts the friendly note. (Audit 26 Jun, item 178.)
  if (!VOICE_ENABLED) {
    return (
      <button
        type="button"
        onClick={onUnavailable}
        aria-label={micLabel}
        title={micLabel}
        className="flex items-center gap-1.5 shrink-0 h-8 px-2.5 rounded-xl bg-purple-50 border border-purple-100 text-[#7C3AED]/70"
      >
        <Mic className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium whitespace-nowrap">Voice · coming soon</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Tap-to-talk mic */}
      <button
        type="button"
        onClick={handleMicTap}
        aria-label={micLabel}
        title={micLabel}
        aria-pressed={active}
        className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          active
            ? 'bg-[#7C3AED] text-white animate-pulse'
            : 'bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-100'
        } ${!VOICE_ENABLED ? 'opacity-70' : ''}`}
      >
        {active ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* Waveform indicator + state label (only while a session is live) */}
      {active && (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Waveform active />
          <span className="text-[11px] font-medium text-[#7C3AED] truncate">
            {state === 'listening' ? 'Listening…' : 'Vida is speaking…'}
          </span>
        </div>
      )}

      {/* Speaker toggle — mutes Vida's spoken replies (visual until key lands) */}
      <button
        type="button"
        onClick={() => setSpeaker(s => !s)}
        aria-label={speaker ? 'Mute Vida voice' : 'Unmute Vida voice'}
        title={speaker ? 'Mute Vida voice' : 'Unmute Vida voice'}
        aria-pressed={!speaker}
        className={`shrink-0 ml-auto w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
          speaker
            ? 'bg-purple-50 hover:bg-purple-100 text-[#7C3AED] border border-purple-100'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
        }`}
      >
        {speaker ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    </div>
  )
}
