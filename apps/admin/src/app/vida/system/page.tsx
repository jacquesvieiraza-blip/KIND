'use client'

// THE SYSTEM SCREEN — everything live, both halves, one button.
//
// Founder's spec, 26 Jul: *"I want to know everything live reported back through one check.
// reports back errors of state."* And both sides, because *"the system needs vida console to
// be right to operate milla."*
//
// THE RULE THIS PAGE EXISTS TO ENFORCE:
//
//     Every row is CHECKED-OK, CHECKED-BROKEN, or NOT-MEASURED — with the reason.
//     Nothing shows green unless it was actually probed.
//
// A screen that shows green for something nobody looked at is how a tracker claimed "the
// ONLY items not built: #515 + CI" while the entire sending spine was dead. NOT-MEASURED is
// a first-class state here, rendered in its own colour, and it always says WHY.
//
// It runs on a BUTTON, never on page load: it makes real network calls to Stripe, Resend,
// Anthropic and the rest, so it is slow on purpose and must be asked for.

import { useState } from 'react'

type RowState = 'CHECKED-OK' | 'CHECKED-BROKEN' | 'NOT-MEASURED'
type Row = { label: string; state: RowState; detail: string; action?: string }
type Section = { title: string; side: 'milla' | 'vida' | 'both'; rows: Row[] }
type IntegrityCheck = {
  key: string; question: string; defect: string
  severity: 'critical' | 'high' | 'medium' | 'clean' | 'unknown'
  count: number; affected: string[]; verdict: string
}
type Report = {
  generated_at: string
  totals: { ok: number; broken: number; unmeasured: number }
  headline: string
  sections: Section[]
  integrity: {
    headline: string
    summary: { critical: number; high: number; medium: number; clean: number; unknown: number }
    checks: IntegrityCheck[]
  }
}

const STATE_STYLE: Record<RowState, { chip: string; dot: string; label: string }> = {
  'CHECKED-OK':     { chip: 'text-emerald-800 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'CHECKED · OK' },
  'CHECKED-BROKEN': { chip: 'text-red-800 bg-red-50 border-red-200',             dot: 'bg-red-500',     label: 'CHECKED · BROKEN' },
  // Deliberately NOT green and NOT red — "we did not establish this" is its own answer.
  'NOT-MEASURED':   { chip: 'text-slate-700 bg-slate-100 border-slate-300',      dot: 'bg-slate-400',   label: 'NOT MEASURED' },
}

const SEV_STYLE: Record<IntegrityCheck['severity'], string> = {
  critical: 'text-red-800 bg-red-50 border-red-200',
  high:     'text-orange-800 bg-orange-50 border-orange-200',
  medium:   'text-amber-800 bg-amber-50 border-amber-200',
  clean:    'text-emerald-800 bg-emerald-50 border-emerald-200',
  unknown:  'text-slate-700 bg-slate-100 border-slate-300',
}

const SIDE_LABEL: Record<Section['side'], string> = {
  milla: '💜 MILLA — the client side',
  vida:  '🖥 VIDA — the operator side',
  both:  '⚙️ BOTH — the shared engine',
}

export default function VidaSystemPage() {
  const [report, setReport] = useState<Report | null>(null)
  // #631 — the stranded-lead rescue, driven from the row that reports it.
  const [enrolBusy, setEnrolBusy] = useState<string | null>(null)
  const [enrolMsg, setEnrolMsg] = useState<Record<string, string>>({})

  async function enrolStranded(clientId: string) {
    setEnrolBusy(clientId)
    try {
      const r = await fetch(`/api/proxy/operator/clients/${clientId}/enrol-stranded`, { method: 'POST' }).then(x => x.json())
      // The API's own sentence is rendered verbatim — it is the one that knows whether a row
      // actually appeared. Inventing a cheerful summary here is how a screen starts lying.
      setEnrolMsg(m => ({ ...m, [clientId]: r?.success ? (r.data?.headline ?? 'Done.') : `FAILED: ${r?.error ?? 'unknown error'}` }))
    } catch (e) {
      setEnrolMsg(m => ({ ...m, [clientId]: `FAILED: ${e instanceof Error ? e.message : 'request failed'}` }))
    } finally { setEnrolBusy(null) }
  }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true); setError(null)
    try {
      const j = await fetch('/api/proxy/operator/system').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The system check did not complete')
      setReport(j.data)
    } catch (e) {
      // A failed run is a FINDING, not a blank screen. Saying nothing would be the exact
      // bug this page exists to catch.
      setError(e instanceof Error ? e.message : 'The system check could not run — treat that as a red result, not an absence of one.')
    }
    setBusy(false)
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="flex items-start gap-4 flex-wrap mb-4">
        <div className="min-w-0">
          <h1 className="text-[19px] font-extrabold">System</h1>
          <p className="text-[12.5px] text-[#9b8ec4] mt-0.5 max-w-3xl">
            Everything live, both halves, one check. Every row is <b>checked and OK</b>, <b>checked and broken</b>, or{' '}
            <b>not measured</b> — with the reason. <b>Nothing shows green unless it was actually probed.</b>
          </p>
        </div>
        <button onClick={run} disabled={busy}
          className="ml-auto shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-4 py-2.5 text-[13px] font-bold disabled:opacity-60">
          {busy ? 'Checking…' : report ? 'Run full check again' : 'Run full check'}
        </button>
      </div>

      {busy && (
        <p className="text-[12.5px] text-[#9b8ec4] py-6 text-center">
          Calling Stripe, Resend, Anthropic, Hunter, Instantly, Smartlead and the database, then probing the schema and every client. Takes a few seconds.
        </p>
      )}

      {error && (
        <div className="border-2 border-red-300 bg-red-50 rounded-xl px-4 py-3 mb-4">
          <b className="text-[13px] text-red-900 block">The check itself failed — this is a RED result</b>
          <p className="text-[11.5px] text-red-800 mt-1">{error}</p>
        </div>
      )}

      {!report && !busy && !error && (
        <div className="border border-[#eee7f7] bg-white rounded-xl px-5 py-10 text-center">
          <p className="text-[13px] text-[#5c5279] font-semibold">Nothing has been checked yet.</p>
          <p className="text-[12px] text-[#9b8ec4] mt-1 max-w-xl mx-auto">
            This page never reports from memory or from the last run — press the button and it asks the live system, every time.
          </p>
        </div>
      )}

      {report && (<>
        {/* THE HEADLINE — and it names what it could not see, in the same breath. */}
        <div className={`rounded-xl border-2 px-5 py-4 mb-5 ${
          report.totals.broken > 0 ? 'border-red-300 bg-red-50'
          : report.totals.unmeasured > 0 ? 'border-slate-300 bg-slate-50'
          : 'border-emerald-300 bg-emerald-50'}`}>
          <b className="text-[15px] block">{report.headline}</b>
          <p className="text-[12px] text-[#5c5279] mt-1">
            {report.totals.ok} checked-OK · {report.totals.broken} broken · {report.totals.unmeasured} not measured
            <span className="text-[#9b8ec4]"> · run {new Date(report.generated_at).toLocaleString()}</span>
          </p>
        </div>

        {/* INTEGRITY — what the bugs we already shipped actually did, and to whom. */}
        <div className="mb-6">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">
            🔎 Integrity — what has ALREADY gone wrong in live data
          </h2>
          <div className={`rounded-xl border-2 px-4 py-3 mb-2 ${
            report.integrity.summary.critical > 0 ? 'border-red-300 bg-red-50'
            : report.integrity.summary.unknown > 0 ? 'border-slate-300 bg-slate-50'
            : 'border-emerald-300 bg-emerald-50'}`}>
            <b className="text-[13px]">{report.integrity.headline}</b>
          </div>
          <div className="space-y-2">
            {report.integrity.checks.map(c => (
              <div key={c.key} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`shrink-0 text-[10px] font-extrabold uppercase rounded-full border px-2 py-0.5 ${SEV_STYLE[c.severity]}`}>
                    {c.severity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <b className="text-[12.5px] block">{c.question}</b>
                    <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">{c.verdict}</p>
                    {c.affected.length > 0 && (
                      <p className="text-[10.5px] text-[#9b8ec4] mt-1 font-mono break-all">
                        {c.affected.join(' · ')}{c.count > c.affected.length ? ` … and ${c.count - c.affected.length} more` : ''}
                      </p>
                    )}
                    <p className="text-[10.5px] text-[#b3a9cc] mt-1">from {c.defect}</p>
                    {/* #631 — THE ROW THAT NAMES THE PROBLEM NOW CARRIES THE FIX. Both alerts in
                        approve-lead.ts end "enrol it from Vida" and no operator control existed
                        — a screen naming a fix nobody can perform (#626's defect). Only on this
                        check, and only when it is actually dirty. No charge: these leads were
                        paid for at approve (M2/#424). */}
                    {c.key === 'paid_never_enrolled' && c.count > 0 && c.affected.map(cid => (
                      <div key={cid} className="mt-2 flex items-center gap-2 flex-wrap">
                        <button onClick={() => enrolStranded(cid)} disabled={enrolBusy === cid}
                          className="text-[11.5px] font-bold text-white bg-[#1f1235] hover:bg-[#312150] rounded-lg px-3 py-1.5 disabled:opacity-60">
                          {enrolBusy === cid ? 'Enrolling…' : 'Enrol this client\u2019s stranded leads'}
                        </button>
                        {enrolMsg[cid] && (
                          <span className="text-[11px] font-semibold text-[#5c5279] leading-relaxed">{enrolMsg[cid]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* THE SECTIONS — dependencies, schema, clients, Vida, activity. */}
        {report.sections.map(sec => (
          <div key={sec.title} className="mb-6">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-1">
              {SIDE_LABEL[sec.side]}
            </h2>
            <p className="text-[12.5px] font-bold text-[#1f1235] mb-2">{sec.title}</p>
            <div className="space-y-1.5">
              {sec.rows.map((r, i) => (
                <div key={`${r.label}-${i}`} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-2.5">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${STATE_STYLE[r.state].dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-[12.5px]">{r.label}</b>
                        <span className={`text-[9.5px] font-extrabold uppercase tracking-wide rounded-full border px-1.5 py-0.5 ${STATE_STYLE[r.state].chip}`}>
                          {STATE_STYLE[r.state].label}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">{r.detail}</p>
                      {r.action && <p className="text-[11.5px] font-semibold text-[#7C3AED] mt-1">→ {r.action}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-[11px] text-[#9b8ec4] border-t border-[#eee7f7] pt-3">
          This describes the environment this API is running in. Grey rows are <b>not failures</b> — they are things
          this check could not establish, each with its reason. Treating grey as green is the mistake this page exists to prevent.
        </p>
      </>)}
    </div>
  )
}
