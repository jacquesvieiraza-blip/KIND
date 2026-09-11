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
  /** ⚑ 10 Sep (A) — the client accepted; Proof is finished and nothing here is pressable. */
  completed: boolean
  showStronger: boolean
  strongerEnabled: boolean
  strongerHint: string | null
  showStillNotRight: boolean
  showTheseAreRight: boolean
  whatChanged: string | null
  /**
   * ⚑ 11 Sep (C39) — where the ONE human-authorised calibrated restart stands.
   *
   * 🛑 IT IS NOT AN ATTEMPT COUNT AND IS NEVER RENDERED AS "Attempt 3". `attempt` above stays
   * at 2 for ever once both automatic passes are spent; this says whether a person has bought
   * this client exactly one more set, and whether it has been taken.
   */
  restart?: 'none' | 'available' | 'used'
  /** The control that spends it. Decided by the SERVER, never by this file. */
  showCalibratedSet?: boolean
  /** The ICP the calibrated set runs against — sent only when the control exists. */
  core_icp_id?: string | null
  ask: string | null
  headline: string | null
  detail: string | null
  reasons: { code: string; label: string }[]
}

type Props = {
  state: ProofCalibrationState
  /** Opens the page's existing refine panel — the only path to attempt 2. */
  onRequestStronger: () => void
  /**
   * Spend the one calibrated restart. The page posts to the SAME proof route every other
   * set goes through, which re-checks the authority itself.
   *
   * ⚠️ OPTIONAL SO AN OLDER CALLER STILL COMPILES, and the control is not drawn without it —
   * a button with no handler is the "no-op action" C40 exists to forbid.
   */
  onCalibratedSet?: () => void | Promise<void>
  /** Records that the set is right; Proof is finished. */
  onAccept: () => void
  /** POST /leads/proof/still-not-right. */
  onStillNotRight: () => Promise<void>
  /** POST /leads/proof/phone — empty means "the stored one is right". */
  onConfirmPhone: (phone: string) => Promise<string | null>
  busy?: boolean
}

export function ProofCalibration({
  state, onRequestStronger, onAccept, onStillNotRight, onConfirmPhone, busy, onCalibratedSet,
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

  // ── 🛑 10 Sep (A) — ACCEPTED: PROOF IS FINISHED, AND THE CALCULATOR IS NEXT ──────────
  //
  // ⛓️ THE STATE THAT COULD NOT EXIST BEFORE. The accept control recorded nothing, so this
  // component had no way to know the client had already answered — the identical controls
  // re-rendered and the button invited a second press.
  //
  // ⚠️ RETURNED FIRST AND WITH NO CONTROLS AT ALL, including the accept button. A screen that
  // still offered to look again would contradict the client's own decision to stop.
  if (state.completed) {
    return (
      <div className="mt-2 rounded-2xl border border-[#d9c4fb] bg-[#fcfaff] p-3.5">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Proof complete</div>
        <div className="text-[14px] font-bold text-[#1f1235] mt-0.5">These are the right people</div>
        <p className="text-[12.5px] text-[#5c5279] mt-1 leading-relaxed">
          Nothing more is needed here. Next, choose how many meetings you want your programme to book.
        </p>
      </div>
    )
  }

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

      {/* ── ⚑ 11 Sep (C39) — A PERSON HAS CORRECTED THE TARGETING, AND BOUGHT ONE SET ────
          🛑 THIS IS THE ONLY WAY A THIRD BATCH CAN EXIST, and it required somebody to call
          this client, fix their targeting and write down what was agreed. It replaces "Still
          not right" rather than sitting beside it: they have already said that, and somebody
          acted on it.

          ⚠️ THE SERVER DECIDES IT EXISTS. `showCalibratedSet` comes from `proofUiState`; this
          file computes nothing, and the route the handler posts to re-checks the authority
          for itself. Hiding the control is a courtesy — the refusal is the control.

          ⚠️ AND IT IS NEVER CALLED "Attempt 3". There is no third automatic attempt; this is
          a different thing with a different name. */}
      {state.showCalibratedSet && onCalibratedSet && (
        <>
          <button onClick={() => void onCalibratedSet()} disabled={busy}
            className="w-full text-[13px] font-bold text-white rounded-xl py-2.5 mt-1.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
            Show me the updated set
          </button>
          <p className="text-[12px] text-[#9b8ec4] mt-1.5 text-center leading-relaxed">
            We&rsquo;ve corrected your targeting with you. This is the updated set.
          </p>
        </>
      )}

      {/* ⚠️ AND ONCE IT IS SPENT, NOTHING REPLACES IT. No second restart, no third automatic
          attempt, no retry — the client is told plainly rather than left looking for a
          control that is not coming. */}
      {state.restart === 'used' && !state.showCalibratedSet && (
        <p className="text-[12px] text-[#9b8ec4] mt-2 text-center leading-relaxed">
          This is the set we put together after we spoke. If it still isn&rsquo;t right, reply to
          Milla and the same person will pick it back up with you.
        </p>
      )}
    </div>
  )
}

export default ProofCalibration
