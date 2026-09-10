'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PROOF BATCH CONTROLS — two attempts, then a person.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────────────────────────
//
// One button: **"These aren't right"**, which opened a free-text panel and spent the second
// pass. It worked, and it was the whole cost exposure: nothing on the screen said how many
// attempts existed, nothing distinguished "improve this" from "this is beyond improving",
// and after both passes the client was still holding controls that spend real money — Milla
// declined a third set rather than taking responsibility for two failed ones.
//
// ── 🛑 THIS COMPONENT DECIDES NOTHING ───────────────────────────────────────────────────
//
// Every control below is drawn from `GET /leads/proof/calibration`, which returns a verdict
// (`proofUiState`) rather than the inputs to one. There is no `passesDone > 1` in this file,
// no feedback counting, no "should I show this" — because a spend rule this browser can
// compute is a spend rule anybody with devtools can satisfy, and the routes refuse
// independently anyway. The founder locked the boundary: *"UI is not the safety boundary."*
//
// ⚠️ AND IT NEVER SOURCES. Nothing here calls a provider — the improved-set control hands
// back to the page's existing refine flow (revise the targeting, then claim the pass); every
// other control records something or asks a question.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from 'react'

/** The server's verdict. Mirrors `ProofUiState` — no field is derived here. */
export type ProofCalibrationState = {
  attempt: number
  escalated: boolean
  showStronger: boolean
  strongerEnabled: boolean
  strongerHint: string | null
  showStillNotRight: boolean
  showTheseAreRight: boolean
  whatChanged: string | null
  ask: string | null
  headline: string | null
  detail: string | null
  reasons: { code: string; label: string }[]
}

type Props = {
  state: ProofCalibrationState
  /** Opens the page's existing refine panel — the only path to attempt 2. */
  onRequestStronger: () => void
  /** Records that the set is right; Proof is finished. */
  onAccept: () => void
  /** POST /leads/proof/still-not-right. */
  onStillNotRight: () => Promise<void>
  /** POST /leads/proof/phone — empty means "the stored one is right". */
  onConfirmPhone: (phone: string) => Promise<string | null>
  busy?: boolean
}

export function ProofCalibration({
  state, onRequestStronger, onAccept, onStillNotRight, onConfirmPhone, busy,
}: Props) {
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmed, setConfirmed] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const confirm = useCallback(async () => {
    setSending(true); setErr(null)
    try {
      const msg = await onConfirmPhone(phone.trim())
      // The confirmation sentence comes from the SERVER, so the screen cannot invent a
      // promise — and cannot quietly add an SLA to one.
      setConfirmed(msg)
    } catch {
      setErr('That did not save — could you try once more?')
    } finally { setSending(false) }
  }, [onConfirmPhone, phone])

  // ── 🛑 ESCALATED: MILLA HAS IT, AND THERE IS NOTHING TO PRESS ────────────────────────
  //
  // Checked first and returned early. Every other branch draws a control that can spend or
  // a promise this state supersedes — and the client has been told "I've paused finding
  // people until we've spoken", which a screen still offering to look again would make a lie.
  if (state.escalated) {
    // After the number is confirmed: the calm state. Proof is still the stage.
    if (state.headline || confirmed) {
      return (
        <div className="mt-2 rounded-2xl border border-[#e4d4fb] bg-[#faf8ff] p-3.5">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Calibration</div>
          <div className="text-[14px] font-bold text-[#1f1235] mt-0.5">{state.headline ?? 'Help arranged'}</div>
          <p className="text-[12.5px] text-[#5c5279] mt-1 leading-relaxed">
            {confirmed ?? state.detail}
          </p>
        </div>
      )
    }
    // Before it: Milla takes responsibility and asks. One question, no options.
    return (
      <div className="mt-2 rounded-2xl border border-[#e4d4fb] bg-[#faf8ff] p-3.5">
        <p className="text-[13px] text-[#1f1235] leading-relaxed">{state.ask}</p>
        <div className="flex gap-2 mt-2.5">
          <input value={phone} onChange={e => setPhone(e.target.value)} disabled={sending}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void confirm() } }}
            placeholder="Best number to reach you on"
            className="flex-1 min-w-0 text-[13px] rounded-xl border border-[#e4dcf7] px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 disabled:opacity-60" />
          <button onClick={() => void confirm()} disabled={sending}
            className="text-[13px] font-bold text-white rounded-xl px-4 bg-[#7C3AED] disabled:opacity-50">
            {sending ? '…' : 'That’s right'}
          </button>
        </div>
        {/* ⚠️ AN EMPTY BOX IS A VALID ANSWER when we already hold a number — the server reads
            it as "yes, that one". The client should not have to retype what they gave us. */}
        {err && <p className="text-[12px] text-red-700 mt-1.5">{err}</p>}
      </div>
    )
  }

  if (!state.showTheseAreRight) return null

  return (
    <div className="mt-1">
      {/* ⚑ ATTEMPT 2 SAYS WHAT CHANGED, IN ONE SENTENCE, FROM THE CLIENT'S OWN REASONS.
          Built server-side; null when there is nothing true to claim. */}
      {state.whatChanged && (
        <div className="rounded-2xl border border-[#e4d4fb] bg-[#faf8ff] px-3.5 py-2.5 mb-2">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Updated set</div>
          <p className="text-[12.5px] text-[#5c5279] mt-0.5 leading-relaxed">{state.whatChanged}</p>
        </div>
      )}

      <button onClick={onAccept} disabled={busy}
        className="w-full text-[13px] font-bold text-white rounded-xl py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
        These are right
      </button>

      {/* ── ATTEMPT 1 — the improved set, and it is a SPEND GATE not a button ───────────── */}
      {state.showStronger && (
        <>
          <button onClick={onRequestStronger} disabled={busy || !state.strongerEnabled}
            className="w-full text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 mt-1.5 border border-[#ece5fb] bg-white hover:bg-[#faf8ff] disabled:opacity-45 disabled:hover:bg-white">
            Show me stronger examples
          </button>
          {/* The founder's sentence, and it names the ACTION that unlocks it rather than
              saying "not available" — a disabled control with no explanation reads as broken. */}
          {state.strongerHint && (
            <p className="text-[12px] text-[#9b8ec4] mt-1.5 text-center leading-relaxed">{state.strongerHint}</p>
          )}
        </>
      )}

      {/* ── ATTEMPT 2 — the honest way to say it is beyond improving ────────────────────
          🛑 AND THE ONLY OTHER CONTROL. The founder's list of third-batch controls that must
          not exist here is enforced by `proof-calibration-ui.test.ts`, which scans this file
          for each of them — so they are named there and deliberately not repeated here.
          Pressing this hands the client to a person, which is the truthful option once two
          attempts have not worked. */}
      {state.showStillNotRight && (
        <button onClick={() => void onStillNotRight()} disabled={busy}
          className="w-full text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 mt-1.5 border border-[#ece5fb] bg-white hover:bg-[#faf8ff] disabled:opacity-50">
          Still not right
        </button>
      )}
    </div>
  )
}

export default ProofCalibration
