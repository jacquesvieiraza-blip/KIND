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
  /** ⚑ 24 Sep (R145 step 3b) — the redesign's line beside the buttons ("you are not selecting…"). */
  note?: string | null
}

export function ProofCalibration({
  state, onRequestStronger, onAccept, onStillNotRight, onConfirmPhone, busy, onCalibratedSet, note,
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
      <div className="mv-hero-card">
        <div className="mv-eyebrow">Proof complete</div>
        <h2 className="!text-[17px]">These are the right people</h2>
        <p>
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
        <div className="mv-hero-card">
          <div className="mv-eyebrow">Calibration</div>
          <h2 className="!text-[17px]">{state.headline ?? 'Help arranged'}</h2>
          <p>
            {confirmed ?? state.detail}
          </p>
        </div>
      )
    }
    // Before it: Milla takes responsibility and asks. One question, no options.
    return (
      <div className="mv-section"><div className="mv-section-body">
        <p className="text-[11px] text-[color:var(--mv-ink)] leading-relaxed">{state.ask}</p>
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
      </div></div>
    )
  }

  if (!state.showTheseAreRight) return null

  // ⛓️ 24 Sep (R145 step 3b) — THE REDESIGN'S CLOSING ROW. WAS a stack of full-width buttons:
  // "These are right", "Show me stronger examples". Founder (R143, 23 Sep): Proof closes with one
  // question and ONE button, **"These are my people"**; the redesign's secondary is "Show another
  // sample" (#74). Same handlers, same server verdict deciding which exist — only the drawing and
  // the words changed.
  return (
    <div className="flex flex-col gap-2">
      {/* ⚑ ATTEMPT 2 SAYS WHAT CHANGED, IN ONE SENTENCE, FROM THE CLIENT'S OWN REASONS.
          Built server-side; null when there is nothing true to claim. */}
      {state.whatChanged && (
        <div className="mv-section"><div className="mv-section-body">
          <div className="mv-eyebrow">Updated set</div>
          <p className="mv-muted-note">{state.whatChanged}</p>
        </div></div>
      )}

      <div className="mv-cta-row flex-wrap">
        <button onClick={onAccept} disabled={busy} className="mv-btn primary disabled:opacity-50">
          These are my people
        </button>

        {/* ── ATTEMPT 1 — the improved set, and it is a SPEND GATE not a button ───────────── */}
        {state.showStronger && (
          <button onClick={onRequestStronger} disabled={busy || !state.strongerEnabled}
            className="mv-btn disabled:opacity-45">
            Show another sample
          </button>
        )}

        {/* ── ATTEMPT 2 — the honest way to say it is beyond improving ────────────────────
            🛑 AND THE ONLY OTHER CONTROL. The founder's list of third-batch controls that must
            not exist here is enforced by `proof-calibration-ui.test.ts`, which scans this file
            for each of them — so they are named there and deliberately not repeated here. */}
        {state.showStillNotRight && (
          <button onClick={() => void onStillNotRight()} disabled={busy} className="mv-btn disabled:opacity-50">
            Still not right
          </button>
        )}

        {/* ── ⚑ 11 Sep (C39) — A PERSON HAS CORRECTED THE TARGETING, AND BOUGHT ONE SET ────
            ⚠️ THE SERVER DECIDES IT EXISTS (`showCalibratedSet`), and it is never called
            "Attempt 3" — there is no third automatic attempt. */}
        {state.showCalibratedSet && onCalibratedSet && (
          <button onClick={() => void onCalibratedSet()} disabled={busy} className="mv-btn primary disabled:opacity-50">
            Show me the updated set
          </button>
        )}

        {note ? <span className="mv-muted-note">{note}</span> : null}
      </div>

      {/* The founder's sentence, and it names the ACTION that unlocks it rather than saying
          "not available" — a disabled control with no explanation reads as broken. */}
      {state.showStronger && state.strongerHint && (
        <p className="mv-muted-note">{state.strongerHint}</p>
      )}
      {state.showCalibratedSet && onCalibratedSet && (
        <p className="mv-muted-note">We&rsquo;ve corrected your targeting with you. This is the updated set.</p>
      )}

      {/* ⚠️ AND ONCE IT IS SPENT, NOTHING REPLACES IT. */}
      {state.restart === 'used' && !state.showCalibratedSet && (
        <p className="mv-muted-note">
          This is the set we put together after we spoke. If it still isn&rsquo;t right, reply to
          Milla and the same person will pick it back up with you.
        </p>
      )}
    </div>
  )
}

export default ProofCalibration
