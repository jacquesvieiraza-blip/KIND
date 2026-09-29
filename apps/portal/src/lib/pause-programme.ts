// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 2d) — THE CLIENT'S PAUSE, AS ONE PRESS.
//
// ⛓️ "Pause sending" (Results) and the "Please pause my programme" chip used to type a sentence
// into the chat. Milla can act on nothing, so it became a throttled "said something in Milla"
// alert and sending carried on. Founder, locking the plan: the client's pause works "Immediately".
// Both now make the same press: `POST /my/programme/pause`, which pauses at once (reason: the
// client asked), pages the founder urgently, and raises a Needs-you. Only the team resumes it.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

export const PAUSE_CONFIRM =
  'Pause sending now?\n\nNothing more will be sent and nobody new will be found. Everything so far is kept, and our team is told at once. Tell Milla when you would like to start again.'

export const PAUSED_NOTE =
  "Done — your programme is paused. Nothing more will be sent and nobody new will be found. Our team has been told. Tell me when you'd like to start again."

export async function pauseMyProgramme(): Promise<{ ok: boolean; message: string }> {
  try {
    const { data: { session } } = await createClient().auth.getSession()
    await api.post('/my/programme/pause', {}, session?.access_token)
    return { ok: true, message: PAUSED_NOTE }
  } catch (e) {
    const m = e instanceof Error && e.message && e.message.length < 300 ? e.message : ''
    return { ok: false, message: m || 'We could not pause just now. Nothing was changed — please try again.' }
  }
}
