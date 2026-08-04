'use client'

// #611 — THE HOUSE-ACCOUNT AUDIT PANEL.
//
// Client Zero was adopted from the founder's existing account and inherited its history. On
// ~25 Aug real prospecting flows into it. There is no SQL access, so nobody could look — this
// panel IS the looking. It reads and judges; the founder rules.
//
// ⚠️ IT DOES NOT RUN ITSELF. This shipped with `useEffect(() => { void run() }, [run])`, so
// opening Engine filled four screens with audit findings and the founder's reply was *"i didnt
// run anything"* — correctly, because he hadn't. An audit that runs on page load makes "what
// does it say" and "it has been run" the same event. The button is the only trigger.
//
// PHASE B — the two write actions below are the rulings the founder gave on 4 Aug, and they are
// deliberately behind their own typed confirmation rather than a click. Phase A's rule still
// holds for everything else: no button acts on a finding until it has been ruled on.

import { useCallback, useState } from 'react'

type Verdict = 'REAL' | 'DEBRIS' | 'REVIEW'
type Row = { what: string; value: string; verdict: Verdict; action: string; why: string }
type Cold = {
  exempt: boolean; daysIdle: number | null; hasActiveCampaign: boolean
  wouldPauseToday: boolean; wouldPauseOnceCampaignActive: boolean
}
type Audit = {
  headline: string; rows: Row[]; cold: Cold; client_id: string
  facts?: { walletBalanceUsd?: number }
}

const ZERO_PHRASE = 'ZERO THE HOUSE WALLET'
const money = (n: number) => '$' + Math.round(n).toLocaleString()

const TONE: Record<Verdict, string> = {
  REAL:   'bg-emerald-50 border-emerald-200 text-emerald-900',
  DEBRIS: 'bg-red-50 border-red-200 text-red-900',
  REVIEW: 'bg-amber-50 border-amber-300 text-amber-900',
}

export default function HouseAudit() {
  const [data, setData] = useState<Audit | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const [actMsg, setActMsg] = useState<string | null>(null)
  const [actErr, setActErr] = useState<string | null>(null)

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

  // Phase B. `act` is the ONE path both writes go through, so neither can quietly skip the
  // re-read afterwards — a panel that acts and then shows its pre-action state is how you press
  // a button twice.
  const act = useCallback(async (path: string, body: Record<string, unknown>) => {
    setBusy(true); setActErr(null); setActMsg(null)
    try {
      const r = await fetch(`/api/proxy/operator/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const j = await r.json()
      if (!j?.success) { setActErr(j?.error || `That did not go through (${r.status}).`); return false }
      return true
    } catch (e) {
      setActErr(e instanceof Error ? e.message : 'That did not go through.')
      return false
    } finally { setBusy(false) }
  }, [])

  const zero = useCallback(async () => {
    const ok = await act('house-audit/zero-wallet', { confirm: typed })
    if (ok) { setTyped(''); setActMsg(`Wallet set to $0. No ledger row was written — no money ever moved, so inventing a transaction would put a false event in the audit trail.`); await run() }
  }, [act, typed, run])

  const grant = useCallback(async () => {
    const ok = await act('house-audit/grant', {})
    if (ok) { setActMsg('Granted $4,000 as a manual_grant — the same comp mechanism the house account is already entitled through.'); await run() }
  }, [act, run])

  const wallet = data?.facts?.walletBalanceUsd

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <b className="text-[13px] text-[#1f1235] block">House-account audit (#611)</b>
      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
        What is actually inside Client Zero, and which of it is left over from testing. Client Zero was
        <b> adopted</b> from an existing account, so it inherited that account&apos;s history. <b>Reading is read-only</b>,
        and it does not run until you press the button. The only things on this panel that write are the two
        wallet controls at the bottom, each behind its own typed confirmation.
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

          {/* ── PHASE B: THE WALLET ──────────────────────────────────────────────────────
              Its own bordered box, below the findings and visually separate from them, because
              this is the only part of the panel that writes. */}
          <div className="mt-4 border-t border-[#ece5fb] pt-3">
            <b className="text-[12.5px] text-[#1f1235] block">Correct the wallet</b>
            <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
              The balance is inherited test grants. It is <b>not cosmetic</b>: once the onboarding pack is used,
              approvals spend the wallet, so real approvals here would draw on invented money and land in the
              revenue figures. Zeroing writes <b>no ledger row</b> — no money ever moved, and recording a
              movement would put a false event in the one table that is the audit trail.
            </p>

            {wallet != null && (
              <p className="text-[11.5px] text-[#5c5279] mt-1.5">
                Balance now: <b className="font-mono">{money(wallet)}</b>
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <input value={typed} onChange={e => setTyped(e.target.value)} placeholder={ZERO_PHRASE}
                className="text-[12px] font-mono border border-[#e4dcf7] rounded-lg px-2.5 py-1.5 w-[280px] max-w-full" />
              <button onClick={zero} disabled={busy || typed.trim() !== ZERO_PHRASE}
                className="bg-red-700 hover:bg-red-800 text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-40">
                Zero the wallet
              </button>
              <button onClick={grant} disabled={busy}
                className="text-[12.5px] font-bold text-[#1f1235] border border-[#e4dcf7] rounded-lg px-3 py-2 hover:bg-[#f7f4fd] disabled:opacity-50">
                Grant $4,000 (hunting budget)
              </button>
            </div>
            <p className="text-[11px] text-[#8579a8] mt-1.5 leading-relaxed">
              Type the phrase exactly to enable the button. The $4,000 is the working budget: approvals draw the
              onboarding pack first (100 included) and the wallet after it, so this is what stops the account
              stalling part-way through its own ~1,000 leads. It goes on as a <code className="px-1 bg-[#f8f6fd] rounded">manual_grant</code> —
              the same comp mechanism Client Zero is already entitled through.
            </p>

            {actErr && (
              <p className="text-[11.5px] font-semibold text-red-700 mt-2 leading-relaxed">{actErr}</p>
            )}
            {actMsg && !actErr && (
              <p className="text-[11.5px] font-semibold text-emerald-800 mt-2 leading-relaxed">{actMsg}</p>
            )}
          </div>

          <p className="text-[11px] text-[#8579a8] mt-3 leading-relaxed">
            Client <code className="px-1 bg-[#f8f6fd] rounded border border-[#ece5fb]">{data.client_id}</code> ·
            reading this panel changes nothing; only the two buttons above write.
          </p>
        </div>
      )}
    </div>
  )
}
