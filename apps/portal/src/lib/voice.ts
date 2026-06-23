// ── Voice transport guard (#178) ─────────────────────────────────────────────
// The "speak" affordance on the Vida help chat is a UI SHELL today. Real
// speech-in / speech-out runs through Vapi, which needs a public key the founder
// hasn't provided yet. This is the SINGLE, well-named gate for that key:
//
//   NEXT_PUBLIC_VAPI_PUBLIC_KEY=<key>   → VOICE_ENABLED true  → live transport wires up
//   (unset)                             → VOICE_ENABLED false → "voice coming soon"
//
// Nothing fakes a microphone. With no key the widget cleanly falls back to the
// existing /vida/help text chat and surfaces a friendly "coming soon" note.

export const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || ''

/** True only when a real Vapi key is present. Drives every voice code path. */
export const VOICE_ENABLED = VAPI_PUBLIC_KEY.length > 0
