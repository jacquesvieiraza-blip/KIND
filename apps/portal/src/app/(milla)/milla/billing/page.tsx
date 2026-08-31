'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BILLING — MILLA-NATIVE. PROGRAMME PAYMENTS AND WHAT EACH ONE AUTHORISES.
//
// ⚑ 31 Aug (BUILD-004A-2B). This file WAS a 13-line wrapper that imported and rendered
// `(dashboard)/dashboard/billing/page.tsx` — the OLD portal's billing screen, which is a
// separately-routed live product. So a Milla customer was reading, verbatim:
//
//   "Billing & Wallet" · "One wallet. $299 to start, then top up any time. $4 per approved
//   lead." · a wallet balance · "YOUR $299 PACK" · "88 of your 100 included leads left" ·
//   "You approve a lead — $4 per approved lead" · Top up wallet $40/$100/$200 · Auto top-up ·
//   Wallet balance over time
//
// Every one of those is retired. None of it can be edited in place, because that file still
// serves `/dashboard` — hence the founder's locked ruling: FORK, do not edit shared pages.
//
// 🛑 THE FORK IS THE POINT, SO NOTHING IS SHARED BACK. This page imports nothing from
// `(dashboard)`. Extracting the two screens' "common" parts into one component would have
// looked tidy and left the two portals coupled — the next retired-truth edit would reach
// `/dashboard` again, which is the exact thing the ruling forbids.
//
// ⚠️ THE DESIGN IS THE BRAND AND IS NOT TOUCHED. Same shell, same header shape, same card
// treatment, same type scale and palette as every other Milla-native page (compare
// `milla/meetings/page.tsx`). What changed is the truth inside the cards.
//
// ⚠️ EVERY FIGURE IS DERIVED FROM THE PROGRAMME ROW. `money.totalCents` is the price; the two
// halves are computed from it and never typed. A client whose programme has no price set is
// shown no figure at all rather than a zero, because "$0" reads as a decision we made.
//
// ⚠️ THIS PAGE TAKES NO PAYMENT. There is no checkout, no CTA and no retry — a "Pay now"
// button is a visible decision nobody has approved, and it is returned for sign-off rather
// than invented. The old page's `/stripe/checkout` and `/stripe/subscribe` calls are gone
// with the wallet they topped up.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
// ⛓️ 31 Aug — ONE MONEY MODULE. `halves` used to be defined in this file and
// `programmeMoney` imported from the workspace; the split and the way it is written down
// are one rule and now live together, where the suite can execute both.
import { halves, programmeMoney } from '@/lib/programme-money'

/** Stripe's own record, read-only. We issue nothing here and store no card. */
type Invoice = {
  id: string
  number: string | null
  date: number
  amount_usd: number
  currency: string
  status: string | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaBillingPage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const tok = await token()
      // ⚠️ SETTLED SEPARATELY. The programme is the page; the invoices are evidence beside
      // it. Stripe being unreachable must not blank a client's payment status, and a
      // programme that will not load must not be reported as "no invoices".
      const [pr, ir] = await Promise.allSettled([
        api.get<{ data: CustomerProgramme }>('/my/programme', tok),
        api.get<{ data: { invoices: Invoice[]; configured: boolean } }>('/stripe/invoices', tok),
      ])
      if (pr.status === 'fulfilled') setP(pr.value.data)
      else {
        // 🛑 A FAILED READ IS NOT "YOU HAVE NO PROGRAMME". The server sends the locked
        // sentence; this only falls back to the same constant when nothing came back at all.
        const msg = pr.reason instanceof Error ? pr.reason.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      setInvoices(ir.status === 'fulfilled' ? (ir.value.data.invoices ?? []) : null)
      setLoading(false)
    })()
  }, [])

  const money = p && p.money.totalCents > 0 ? halves(p.money.totalCents) : null

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Billing</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Your programme payments, and what each one authorises.</p>

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}

        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── THE PROGRAMME AND ITS PRICE ────────────────────────────────────────
                ⚠️ NO WALLET, NO PACK, NO PER-LEAD PRICE. One programme, one price. */}
            <div className="mt-4 bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
              <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Programme</div>
              {money ? (
                <div className="text-[22px] font-extrabold text-[#1f1235]">{programmeMoney(p.money.totalCents)}</div>
              ) : (
                // A price that has not been set is stated as not set. "$0" would read as a
                // decision somebody made about this client.
                <div className="text-[15px] font-bold text-[#5c5279]">No programme price has been set yet.</div>
              )}
              <div className="text-[12.5px] text-[#6b5f8c] mt-1">
                {p.outcome.target
                  ? `${p.outcome.target} booked meetings · ${p.stage}`
                  : p.stage}
              </div>
              {p.paused && p.pausedCopy && (
                // Server-sent locked copy. Pause is orthogonal to the stage and says nothing
                // about what has been paid.
                <p className="text-[12.5px] text-[#b45309] mt-2">{p.pausedCopy}</p>
              )}
            </div>

            {/* ── THE TWO PAYMENTS, IN ORDER, WITH THEIR AUTHORITY ───────────────────
                🛑 THE AUTHORITY WORDING IS THE FOUNDER'S AND IS THE WHOLE POINT OF THE CARD.
                Payment 1 buys sourcing and preparation and NOTHING ELSE; a client who has
                paid it must not think outreach has begun. Payment 2 follows the ONE programme
                approval and is what authorises outreach. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold">Payment 1</span>
                  <span className="text-[11px] font-bold text-[#9b8ec4]">50%</span>
                </div>
                <div className="text-[18px] font-extrabold text-[#1f1235] mt-1">
                  {money ? programmeMoney(money.first) : '—'}
                </div>
                <div className={`text-[12.5px] font-semibold mt-0.5 ${p.money.firstPaidAt ? 'text-[#059669]' : 'text-[#7c6f9b]'}`}>
                  {p.money.firstPaidAt ? 'Paid' : 'Not yet paid'}
                </div>
                {/* Founder's framing, verbatim — the same sentence the programme workspace
                    already carries, so the two screens cannot drift apart. */}
                <p className="text-[12.5px] text-[#9b8ec4] mt-2 leading-relaxed">
                  The first payment authorises sourcing and preparation. Outreach has not started.
                </p>
              </div>

              <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold">Payment 2</span>
                  <span className="text-[11px] font-bold text-[#9b8ec4]">the remaining 50%</span>
                </div>
                <div className="text-[18px] font-extrabold text-[#1f1235] mt-1">
                  {money ? programmeMoney(money.second) : '—'}
                </div>
                <div className={`text-[12.5px] font-semibold mt-0.5 ${p.money.secondPaidAt ? 'text-[#059669]' : 'text-[#7c6f9b]'}`}>
                  {p.money.secondPaidAt ? 'Paid' : 'Not yet paid'}
                </div>
                {/* ⚠️ NEVER "YOU CAN PAY THIS NOW". Payment 2 follows the programme approval;
                    saying otherwise would invite a client to pay for outreach we are not yet
                    authorised to run. The approval state is read, not assumed. */}
                <p className="text-[12.5px] text-[#9b8ec4] mt-2 leading-relaxed">
                  {p.approvedAt
                    ? 'Due after the programme approval. It authorises outreach.'
                    : 'Due after the programme approval. Until then, it authorises nothing.'}
                </p>
              </div>
            </div>

            {/* ── PAYMENT EVIDENCE — STRIPE'S OWN RECORD, NOT OURS ───────────────────
                ⚠️ WE ISSUE NOTHING HERE. Stripe issues the invoice and hosts it; this lists
                what it returned and links to it. `null` means the lookup failed and is NOT
                rendered as "no invoices" — a client who has paid seeing an empty list would
                reasonably conclude their payment was lost.
                ⚠️ AND IT DOES NOT DUPLICATE DOCUMENTS. Documents & Agreements stays the
                deeper legal and invoice record; this is the payment view of the same thing. */}
            <div className="mt-3 bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
              <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-2">Invoices</div>
              {invoices === null ? (
                <p className="text-[12.5px] text-[#9b8ec4]">
                  We couldn&rsquo;t load your invoices just now — this is not the same as having none.
                </p>
              ) : invoices.length === 0 ? (
                <p className="text-[12.5px] text-[#9b8ec4]">No invoices yet.</p>
              ) : (
                <div className="divide-y divide-[#f2edfb]">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-bold text-[#1f1235]">
                          {inv.number ?? inv.id}
                        </div>
                        <div className="text-[12px] text-[#9b8ec4]">
                          {new Date(inv.date * 1000).toLocaleDateString()} · {inv.status ?? 'unknown'}
                        </div>
                      </div>
                      <div className="ml-auto text-[13.5px] font-extrabold tabular-nums text-[#1f1235]">
                        ${inv.amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {inv.hosted_invoice_url && (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer"
                          className="text-[12.5px] font-bold text-[#7C3AED] hover:underline shrink-0">View</a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <a href="/milla/documents" className="inline-block text-[12.5px] font-bold text-[#7C3AED] hover:underline mt-2.5">
                Documents &amp; Agreements
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
