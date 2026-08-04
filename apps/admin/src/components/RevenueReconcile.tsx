'use client'

// #613 — WHAT THE BANK ACTUALLY RECEIVED.
//
// Every money figure on the surrounding page is the price we QUOTED. Nothing in this product
// has ever read Stripe's `balance_transaction`, so a discount, a partial refund or a currency
// conversion is invisible and no number reconciles to a bank statement. On a $299 sold in USD
// into a GBP account the gap is real: roughly £210–£213 arrives against a console saying $299.
//
// ⚠️ IT DOES NOT RUN ITSELF. #611's lesson, four weeks old: the house-audit panel self-ran and
// the founder's reply was *"i didnt run anything"*. This calls Stripe's live API — a page load
// must never do that on its own.
//
// ⚠️ AND A FAILED READ IS NEVER A GREEN TICK. If Stripe cannot be reached the panel says so in
// red. "Nothing to reconcile" and "we could not look" render differently, on purpose.

import { useCallback, useState } from 'react'

type Row = {
  session_id: string
  created_at: string | null
  paid_amount_usd: number | null
  paid_currency: string | null
  ledger_amount: number | null
  ledger_type: string | null
  in_ledger: boolean
  settlement_currency: string | null
  gross: number | null
  fee: number | null
  net: number | null
  verdict: 'match' | 'fee_only' | 'mismatch' | 'unknown'
  why: string
}
type Data = {
  rows: Row[]
  counts: Record<string, number>
  fee_total: number | null
  fee_currency: string | null
  fee_note: string | null
  checked_at: string
}

const TONE: Record<Row['verdict'], string> = {
  match:    'bg-emerald-50 border-emerald-200 text-emerald-900',
  fee_only: 'bg-[#f8f6fd] border-[#e4dcf7] text-[#3f3560]',
  mismatch: 'bg-red-50 border-red-300 text-red-900',
  unknown:  'bg-amber-50 border-amber-300 text-amber-900',
}
const LABEL: Record<Row['verdict'], string> = {
  match: 'matches', fee_only: 'fee only', mismatch: 'MISMATCH', unknown: 'could not read',
}

const money = (n: number | null, cur: string | null) => {
  if (n == null) return '—'
  const c = (cur ?? 'usd').toUpperCase()
  const sym = c === 'USD' ? '$' : c === 'GBP' ? '£' : c === 'EUR' ? '€' : ''
  return sym ? `${sym}${n.toFixed(2)}` : `${n.toFixed(2)} ${c}`
}

export default function RevenueReconcile() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/proxy/operator/revenue/reconcile?limit=25')
      const j = await r.json()
      if (!j?.success) { setError(j?.error || `Could not reconcile (${r.status}).`); setData(null) }
      else setData(j.data as Data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reconcile.')
    } finally { setBusy(false) }
  }, [])

  const mismatches = data?.counts?.mismatch ?? 0
  const unknowns = data?.counts?.unknown ?? 0

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <b className="text-[13px] text-[#1f1235] block">What the bank actually received (#613)</b>
          <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed max-w-[68ch]">
            Every other figure on this page is the price we <b>quoted</b>. This reads what Stripe actually
            <b> settled</b> — gross, their fee, and the net that reaches the account. We charge in USD and bank in GBP,
            so those are not even the same currency. <b>Reads only; changes nothing.</b>
          </p>
        </div>
        <button onClick={run} disabled={busy}
          className="ml-auto shrink-0 bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
          {busy ? 'Reading Stripe…' : data ? 'Read it again' : 'Reconcile against Stripe'}
        </button>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">Nothing was compared.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">{error}</p>
        </div>
      )}

      {data && data.rows.length === 0 && !error && (
        <p className="text-[12px] text-[#5c5279] mt-3">
          Stripe returned no checkout sessions. With no payments taken yet that is the expected answer — it is
          not a reconciliation.
        </p>
      )}

      {data && data.rows.length > 0 && (
        <div className="mt-3 border-t border-[#ece5fb] pt-3">
          <p className={`text-[12.5px] font-bold ${mismatches > 0 ? 'text-red-900' : unknowns > 0 ? 'text-amber-900' : 'text-emerald-800'}`}>
            {mismatches > 0
              ? `${mismatches} payment${mismatches === 1 ? '' : 's'} do not match what we recorded — read those rows.`
              : unknowns > 0
                ? `No mismatches, but ${unknowns} could not be read — that is not the same as reconciled.`
                : `All ${data.rows.length} payments agree with the ledger.`}
          </p>
          {data.fee_total != null && (
            <p className="text-[11.5px] text-[#5c5279] mt-1">
              Stripe took <b>{money(data.fee_total, data.fee_currency)}</b> across these {data.rows.length} payments —
              money that has never appeared in any revenue figure on this console.
            </p>
          )}
          {data.fee_note && <p className="text-[11.5px] text-[#8579a8] mt-1">{data.fee_note}</p>}

          <div className="mt-2.5 space-y-1.5">
            {data.rows.map(r => (
              <div key={r.session_id} className={`rounded-lg border px-3 py-2 ${TONE[r.verdict]}`}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[11.5px] font-mono">{r.session_id.slice(0, 20)}…</span>
                  <span className="text-[11.5px]">
                    we recorded <b>{r.ledger_amount != null ? `$${r.ledger_amount.toFixed(2)}` : '— nothing'}</b>
                    {r.gross != null && <> · bank got <b>{money(r.net, r.settlement_currency)}</b> (fee {money(r.fee, r.settlement_currency)})</>}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide ml-auto">{LABEL[r.verdict]}</span>
                </div>
                <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">{r.why}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-[#8579a8] mt-3 leading-relaxed">
            Read {new Date(data.checked_at).toLocaleString('en-GB')}. ⚠️ While the schema is frozen these figures are
            <b> appended to each ledger row&apos;s note text</b>, not stored as numbers — so they can be read and grepped,
            but no dashboard can total them. The columns land the day migrations run.
          </p>
        </div>
      )}
    </div>
  )
}
