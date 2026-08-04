'use client'

// #611 — THE HOUSE-ACCOUNT AUDIT PANEL.
//
// Client Zero was adopted from the founder's existing account and inherited its history. On
// ~25 Aug real prospecting flows into it. There is no SQL access, so nobody could look — this
// panel IS the looking. It reads and judges; the founder rules.
//
// ⚠️ NOTHING HERE WRITES. There is deliberately no button that acts on a finding: the whole
// point of #611's Phase A is that the founder decides line by line first, and Phase B is a
// separate PR built against those rulings. A "clean it up" button on this panel would make the
// audit and the action one click apart, which is how the wrong row gets deleted at 11pm.

import { useCallback, useEffect, useState } from 'react'

type Verdict = 'REAL' | 'DEBRIS' | 'REVIEW'
type Row = { what: string; value: string; verdict: Verdict; action: string; why: string }
type Cold = {
  exempt: boolean; daysIdle: number | null; hasActiveCampaign: boolean
  wouldPauseToday: boolean; wouldPauseOnceCampaignActive: boolean
}
type Audit = { headline: string; rows: Row[]; cold: Cold; client_id: string }

const TONE: Record<Verdict, string> = {
  REAL:   'bg-emerald-50 border-emerald-200 text-emerald-900',
  DEBRIS: 'bg-red-50 border-red-200 text-red-900',
  REVIEW: 'bg-amber-50 border-amber-300 text-amber-900',
}

export default function HouseAudit() {
  const [data, setData] = useState<Audit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      // ⚠️ THROUGH THE PROXY, ALWAYS. This first shipped as a direct call to
      // `${NEXT_PUBLIC_API_URL}/operator/house-audit` and would have 401'd on every load: every
      // operator route requires an `x-admin-key`, and the ONLY thing that injects it is
      // `app/api/proxy/[...path]/route.ts` — which also stamps `x-operator-email` from the
      // verified session, so a direct call is both a guaranteed 401 AND a hole in the operator
      // audit trail. `admin-proxy-only.test.ts` now fails any component that bypasses it.
      const r = await fetch('/api/proxy/operator/house-audit')
      const j = await r.json()
      if (!j?.success) { setError(j?.error || `The audit could not run (${r.status}).`); setData(null) }
      else setData(j as Audit)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The audit could not run.')
    } finally { setBusy(false) }
  }, [])

  useEffect(() => { void run() }, [run])

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <b className="text-[13px] text-[#1f1235] block">House-account audit (#611)</b>
      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
        What is actually inside Client Zero, and which of it is left over from testing. Client Zero was
        <b> adopted</b> from an existing account, so it inherited that account&apos;s history. <b>This panel only reads</b> —
        there is no button here that changes anything, on purpose: you rule on the rows first, and any cleanup
        is a separate, deliberate piece of work.
      </p>

      <button onClick={run} disabled={busy}
        className="bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60 mt-3">
        {busy ? 'Reading…' : data ? 'Read it again' : 'Run the audit'}
      </button>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">The audit did not run.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">{error}</p>
        </div>
      )}

      {data && (
        <div className="mt-3 border-t border-[#ece5fb] pt-3">
          <p className="text-[12.5px] font-bold text-[#1f1235]">{data.headline}</p>

          {/* The cold-cron collision gets its own box because it is the one finding with a DATE
              on it — everything else is tidying, this one can pause a live campaign. */}
          {!data.cold.exempt && data.cold.wouldPauseOnceCampaignActive && (
            <div className={`rounded-lg border px-3 py-2 mt-2 ${data.cold.wouldPauseToday ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
              <b className={`text-[12.5px] block ${data.cold.wouldPauseToday ? 'text-red-900' : 'text-amber-900'}`}>
                {data.cold.wouldPauseToday
                  ? '🚨 The cold-client cron would pause a campaign on this account tonight.'
                  : '⚠️ The cold-client cron is armed against this account.'}
              </b>
              <p className={`text-[11.5px] mt-0.5 leading-relaxed ${data.cold.wouldPauseToday ? 'text-red-800' : 'text-amber-800'}`}>
                Last approval was <b>{data.cold.daysIdle ?? '—'} days</b> ago and we suspend at 30. The rule skips
                demo accounts only, and Client Zero is deliberately <i>not</i> marked demo so it counts in revenue
                figures. {data.cold.hasActiveCampaign
                  ? 'There is an active campaign, so the 08:40 UTC run would pause it.'
                  : 'Nothing happens while no campaign is active — but the moment one goes live with the clock still past 30 days, the next 08:40 run pauses it and emails you about churn risk on your own account. Approving anyone resets the clock.'}
              </p>
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            {data.rows.map((r, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2 ${TONE[r.verdict]}`}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <b className="text-[12.5px]">{r.what}</b>
                  <span className="text-[12px] font-mono">{r.value}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide ml-auto">{r.verdict}</span>
                  <span className="text-[10.5px] font-bold opacity-70">→ {r.action}</span>
                </div>
                <p className="text-[11.5px] mt-0.5 leading-relaxed opacity-90">{r.why}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#8579a8] mt-3 leading-relaxed">
            Client <code className="px-1 bg-[#f8f6fd] rounded border border-[#ece5fb]">{data.client_id}</code> ·
            nothing on this screen has been changed by reading it.
          </p>
        </div>
      )}
    </div>
  )
}
