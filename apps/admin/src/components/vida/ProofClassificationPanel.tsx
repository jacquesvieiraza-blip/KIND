'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// HISTORICAL PROOF CLASSIFICATION — the two decisions only a person can make. (B2.)
//
// 🛑 WHY THIS EXISTS. `claim_proof_authority` refuses a client whose pre-ledger Proof history
// cannot be read — `unclassified` for the automatic passes, `restart_unclassified` for a
// calibrated restart that was spent before the ledger existed. Both remedies are protected
// operator routes that already exist, and Vida had no control for either, so a correctly
// blocked client stayed blocked with the cure sitting behind no button.
//
// 🛑 IT RENDERS ONLY FOR CLIENTS THE SERVER SAYS NEED IT. `legacy_passes_classification_required`
// and `legacy_restart_classification_required` are computed by the evidence GET from the RPC's
// own predicates. This panel reads those two booleans and re-derives nothing: an authority rule
// reconstructed in a browser is a second definition, and the two drift.
//
// ⚠️ NOTHING IS DEFAULTED AND NOTHING IS RECOMMENDED. No pre-selected pass count, no
// pre-selected restart outcome. The operator reads the evidence above this panel, chooses, and
// writes down what they read — the route requires the note and so does this.
//
// ⚠️ AND A CONTROL DISAPPEARS ONLY BECAUSE THE SERVER SAYS SO. After a successful
// classification the evidence is re-read; there is no local "done" flag, which is what keeps
// settling the passes from appearing to settle the restart.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import {
  loadClassificationEvidence, controlsFor,
  submitPassClassification, submitRestartClassification,
  PASS_CHOICES, RESTART_CHOICES, RESTART_EVIDENCE_WARNING,
  type ClassificationView, type PassChoice, type RestartChoice,
} from '@/lib/vida-proof-classification'

export default function ProofClassificationPanel({ clientId }: { clientId: string | null }) {
  const [view, setView] = useState<ClassificationView>({ state: 'loading', evidence: null, error: null })
  const [passes, setPasses] = useState<PassChoice | null>(null)
  const [passNote, setPassNote] = useState('')
  const [restart, setRestart] = useState<RestartChoice | null>(null)
  const [restartNote, setRestartNote] = useState('')
  const [busy, setBusy] = useState<'passes' | 'restart' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!clientId) { setView({ state: 'ok', evidence: null, error: null }); return }
    setView(v => ({ ...v, state: 'loading' }))
    setView(await loadClassificationEvidence(async path => {
      const r = await fetch(path)
      return r.json()
    }, clientId))
  }, [clientId])

  useEffect(() => { void load() }, [load])

  const classifyPasses = useCallback(async () => {
    if (!clientId || busy) return
    setBusy('passes'); setError(null)
    const r = await submitPassClassification(async (path, body) => {
      const res = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return res.json()
    }, clientId, passes, passNote)
    setBusy(null)
    if (!r.ok) {
      // ⚠️ THE CONTROL STAYS. Nothing was recorded, so nothing is cleared.
      setError(r.message)
      return
    }
    setPasses(null); setPassNote(''); setError(null)
    // 🛑 THE SERVER DECIDES WHETHER THIS CONTROL IS STILL NEEDED.
    await load()
  }, [clientId, busy, passes, passNote, load])

  const classifyRestart = useCallback(async () => {
    if (!clientId || busy) return
    setBusy('restart'); setError(null)
    const r = await submitRestartClassification(async (path, body) => {
      const res = await fetch(path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      return res.json()
    }, clientId, restart, restartNote)
    setBusy(null)
    if (!r.ok) { setError(r.message); return }
    setRestart(null); setRestartNote(''); setError(null)
    await load()
  }, [clientId, busy, restart, restartNote, load])

  const controls = controlsFor(view.evidence)

  // Nothing to ask, nothing to say. The overwhelming majority of clients land here.
  if (!clientId) return null
  if (view.state === 'loading') return null
  if (view.state === 'ok' && !controls.passes && !controls.restart) return null

  return (
    <section className="mt-3 border border-amber-200 bg-amber-50/50 rounded-2xl px-4 py-4">
      <h3 className="text-[13.5px] font-semibold text-[#2b2145]">Historical Proof authority — needs a decision</h3>
      <p className="text-[12px] text-[#6b6188] mt-0.5">
        This client&apos;s Proof history predates the authority ledger and cannot be reconstructed
        from the data, so the system refuses to guess and refuses to start Proof. It stays blocked
        until a person records what actually happened.
      </p>

      {/* 🛑 A FAILED READ SHOWS NO CONTROL AND SAYS SO — never "nothing to do". */}
      {view.state === 'failed' && (
        <div role="alert" className="mt-3 border border-red-200 bg-red-50/60 rounded-xl px-3 py-2">
          <p className="text-[12.5px] font-semibold text-red-800">{view.error}</p>
        </div>
      )}

      {controls.passes && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <p className="text-[13px] font-semibold text-[#2b2145]">
            How many of the two automatic Proof passes did this client legitimately consume?
          </p>
          <p className="text-[12px] text-[#6b6188] mt-0.5">
            Read the attempt history above and the run outcomes. This is not derived from the
            counter — the counter is what we cannot trust, which is why you are being asked.
          </p>
          <div className="mt-2 flex gap-2">
            {PASS_CHOICES.map(n => (
              <button
                key={n}
                onClick={() => setPasses(n)}
                className={`text-[12px] font-semibold rounded-lg px-3 py-1 border ${
                  passes === n ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'border-[#e6e0f5] bg-white text-[#2b2145]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <textarea
            value={passNote}
            onChange={e => setPassNote(e.target.value)}
            rows={2}
            placeholder="What evidence did you read?"
            className="mt-2 w-full text-[12.5px] border border-[#e6e0f5] rounded-lg px-2 py-1.5 bg-white"
          />
          <button
            onClick={() => void classifyPasses()}
            disabled={busy !== null}
            className="mt-2 text-[12px] font-semibold rounded-lg px-3 py-1.5 bg-[#7C3AED] text-white disabled:opacity-50"
          >
            {busy === 'passes' ? 'Recording…' : 'Record this classification'}
          </button>
        </div>
      )}

      {controls.restart && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <p className="text-[13px] font-semibold text-[#2b2145]">
            What happened to this client&apos;s calibrated restart?
          </p>
          {/* The sentence that stops the obvious wrong inference. */}
          <p className="text-[12px] text-red-700 mt-0.5 leading-relaxed">{RESTART_EVIDENCE_WARNING}</p>
          <div className="mt-2 flex gap-2 flex-wrap">
            {RESTART_CHOICES.map(s => (
              <button
                key={s}
                onClick={() => setRestart(s)}
                className={`text-[12px] font-semibold rounded-lg px-3 py-1 border ${
                  restart === s ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'border-[#e6e0f5] bg-white text-[#2b2145]'
                }`}
              >
                {s === 'completed' ? 'Completed — they received their set' : 'Released — it was burned before they saw anything'}
              </button>
            ))}
          </div>
          <textarea
            value={restartNote}
            onChange={e => setRestartNote(e.target.value)}
            rows={2}
            placeholder="What evidence did you read?"
            className="mt-2 w-full text-[12.5px] border border-[#e6e0f5] rounded-lg px-2 py-1.5 bg-white"
          />
          <button
            onClick={() => void classifyRestart()}
            disabled={busy !== null}
            className="mt-2 text-[12px] font-semibold rounded-lg px-3 py-1.5 bg-[#7C3AED] text-white disabled:opacity-50"
          >
            {busy === 'restart' ? 'Recording…' : 'Record this classification'}
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-2 text-[12.5px] text-red-700">{error}</p>}
    </section>
  )
}
