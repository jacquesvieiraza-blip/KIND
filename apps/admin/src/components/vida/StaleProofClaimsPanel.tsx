'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// STALE PROOF CLAIMS — the only thing that resolves a process death. (B4.)
//
// 🛑 THIS PANEL MUST NOT BECOME THE AUTOMATIC RELEASE WEARING A PERSON'S FACE. Nothing
// releases a Proof claim on a timer, deliberately: a release while the original run is still
// alive could produce a second batch for one attempt. So rendering issues ONE GET and settles
// nothing, every decision is chosen by a human for one named claim with a written reason, and
// the server still refuses a claim that is not yet stale.
//
// ⚠️ A ROW LEAVES THIS LIST ONLY WHEN THE SERVER SAYS SO. On success we re-read; on refusal
// the row stays exactly where it was with the server's sentence beside it. Removing it
// optimistically would tell the operator a blocked client was unblocked.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import {
  loadStaleClaims, submitReconcile, CLAIMS_EMPTY_COPY, STALE_CLAIMS_PATH,
  type ClaimsView, type ReconcileDecision,
} from '@/lib/vida-proof-claims'

const when = (iso: string | null | undefined) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}
const mins = (ms: number | undefined) => (ms == null ? '—' : `${Math.round(ms / 60000)} min`)

export default function StaleProofClaimsPanel() {
  const [view, setView] = useState<ClaimsView>({
    state: 'loading', claims: [], staleAfterMs: null, releaseWarning: null, completeWarning: null, error: null,
  })
  const [open, setOpen] = useState<string | null>(null)
  const [decision, setDecision] = useState<ReconcileDecision | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setView(v => ({ ...v, state: 'loading' }))
    setView(await loadStaleClaims(async path => {
      const r = await fetch(path)
      return r.json()
    }))
  }, [])

  useEffect(() => { void load() }, [load])

  const reconcile = useCallback(async (claimId: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const r = await submitReconcile(async (path, body) => {
      const res = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return res.json()
    }, claimId, decision, note)
    setBusy(false)
    if (!r.ok) {
      // ⚠️ THE ROW STAYS. Nothing was settled, so nothing is removed.
      setError(r.message)
      return
    }
    setOpen(null); setDecision(null); setNote(''); setError(null)
    // Canonical truth decides what remains.
    await load()
  }, [busy, decision, note, load])

  return (
    <section className="border border-[#e6e0f5] rounded-2xl bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13.5px] font-semibold text-[#2b2145]">Proof claims held open too long</h3>
          <p className="text-[12px] text-[#6b6188] mt-0.5">
            Nothing releases a Proof claim on a timer — that is on purpose. A claim left open by a
            crash blocks that client from Proof until a person decides what happened to the run.
            {view.staleAfterMs != null && <> Listed after {mins(view.staleAfterMs)}.</>}
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-[12px] font-semibold text-[#7C3AED] border border-[#e6e0f5] rounded-lg px-2.5 py-1"
        >
          Reload
        </button>
      </div>

      {view.state === 'loading' && <p className="mt-3 text-[12.5px] text-[#9b8ec4]">Reading…</p>}

      {view.state === 'failed' && (
        <div role="alert" className="mt-3 border border-red-200 bg-red-50/60 rounded-xl px-3 py-2">
          <p className="text-[12.5px] font-semibold text-red-800">{view.error}</p>
        </div>
      )}

      {view.state === 'empty' && <p className="mt-3 text-[12.5px] text-[#5b5175]">{CLAIMS_EMPTY_COPY}</p>}

      {view.state === 'ok' && (
        <ul className="mt-3 space-y-2">
          {view.claims.map(c => (
            <li key={c.claimId} className="border border-[#efeaf8] rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-[#2b2145]">
                  {c.companyName || '(no company name)'}
                </span>
                <span className="text-[11.5px] font-semibold rounded-full px-2 py-0.5 bg-[#f4f0ff] text-[#7C3AED]">
                  {c.authority}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#6b6188]">
                Claim <code>{c.claimId}</code> · client <code>{c.clientId}</code> · claimed {when(c.claimedAt)}
                {c.heldMs != null && <> · held {mins(c.heldMs)}</>}
              </p>
              {/* The process-death signature, as the API reports it. */}
              <p className="mt-1 text-[12.5px] text-[#5b5175]">
                {c.noTerminalEvidence
                  ? 'No run outcome was recorded after this claim — consistent with the process dying mid-run.'
                  : 'A run outcome EXISTS after this claim, so the run may have finished without settling. Read it before deciding.'}
              </p>

              {open !== c.claimId ? (
                <button
                  onClick={() => { setOpen(c.claimId); setDecision(null); setNote(''); setError(null) }}
                  className="mt-2 text-[12px] font-semibold text-[#7C3AED] border border-[#e6e0f5] rounded-lg px-2.5 py-1"
                >
                  Reconcile this claim
                </button>
              ) : (
                <div className="mt-2 border-t border-[#efeaf8] pt-2">
                  {/* 🛑 THE SERVER'S OWN WARNINGS, VERBATIM. Each decision spends or gives back a
                      client's Proof attempt, and the operator reads the consequence first. */}
                  <div className="flex gap-2 flex-wrap">
                    {(['completed', 'released'] as ReconcileDecision[]).map(d => (
                      <button
                        key={d}
                        onClick={() => setDecision(d)}
                        className={`text-[12px] font-semibold rounded-lg px-2.5 py-1 border ${
                          decision === d ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'border-[#e6e0f5] text-[#2b2145]'
                        }`}
                      >
                        {d === 'completed' ? 'Completed — the batch landed' : 'Released — give the attempt back'}
                      </button>
                    ))}
                  </div>
                  {decision === 'released' && view.releaseWarning && (
                    <p className="mt-2 text-[12px] text-red-700 leading-relaxed">{view.releaseWarning}</p>
                  )}
                  {decision === 'completed' && view.completeWarning && (
                    <p className="mt-2 text-[12px] text-red-700 leading-relaxed">{view.completeWarning}</p>
                  )}
                  {/* 🛑 REQUIRED, BECAUSE THE SERVER REQUIRES IT. */}
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    rows={2}
                    placeholder="What did you check, and why will the original run not finish?"
                    className="mt-2 w-full text-[12.5px] border border-[#e6e0f5] rounded-lg px-2 py-1.5"
                  />
                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => void reconcile(c.claimId)}
                      disabled={busy}
                      className="text-[12px] font-semibold rounded-lg px-3 py-1.5 bg-[#7C3AED] text-white disabled:opacity-50"
                    >
                      {busy ? 'Recording…' : 'Record this decision'}
                    </button>
                    <button
                      onClick={() => { setOpen(null); setDecision(null); setNote(''); setError(null) }}
                      className="text-[12px] text-[#6b6188]"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && <p role="alert" className="mt-2 text-[12.5px] text-red-700">{error}</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <span hidden data-stale-path={STALE_CLAIMS_PATH} />
    </section>
  )
}
