'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// YOUR ROI — MILLA-NATIVE. WHAT WE DID, WHAT IT COST, AND WHY WE DO NOT CLAIM A RETURN.
//
// ⚑ 31 Aug (BUILD-004A-2C). This file WAS a 13-line wrapper around
// `(dashboard)/dashboard/roi/page.tsx`, the old portal's "What K.I.N.D did for you" screen.
//
// 🛑 THE FINDING OF THIS SLICE, AND IT WAS THE HERO CARD. That page led with
// "Pipeline value touched", a dollar figure from `/leads/stats.pipeline_value_usd`, which is
//
//     SUM(leads.estimated_deal_value_usd)
//
// and that column is written in exactly one place — `apps/api/src/lib/scoring.ts:221`:
//
//     estimated_deal_value_usd: r.score * 100
//
// The lead's FIT SCORE multiplied by one hundred. A prospect scored 85 became "$8,500 of
// pipeline value". Summed across a client's leads and printed as the headline of the page
// that exists to tell them what they got for their money. It measures nothing. It is the
// scoring model wearing a currency symbol.
//
// ⚠️ SO THIS PAGE COMPUTES NO RETURN, AND SAYS WHY. A return needs what the work is worth to
// THEM — deal value, close rate, revenue attributed to a meeting we booked — and the product
// holds none of it. Nobody has ever asked a client what a meeting is worth, and no column
// stores the answer.
//
// ⚠️ AND IT AGREES WITH MILLA. Asked about ROI on the House walk she correctly said she needs
// a target outcome to measure against. A page claiming a return while she says she cannot
// compute one is the product contradicting itself in front of the customer.
//
// WHAT IS SHOWN INSTEAD IS ALL TRUE: what the programme cost, and what it produced.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { programmeMoney } from '@/lib/programme-money'
import { ProgrammeStat, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { canComputeRoi, ROI_MISSING_INPUTS, outreachHasRun } from '@/lib/programme-report'

type Outcomes = { replies_total: number; meetings_total: number; meetings_booked: number }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaRoiPage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [o, setO] = useState<Outcomes | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const tok = await token()
      const [pr, sr] = await Promise.allSettled([
        api.get<{ data: CustomerProgramme }>('/my/programme', tok),
        api.get<{ data: Outcomes }>('/leads/milla-summary', tok),
      ])
      if (pr.status === 'fulfilled') setP(pr.value.data)
      else {
        const msg = pr.reason instanceof Error ? pr.reason.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      setO(sr.status === 'fulfilled' ? sr.value.data : null)
      setLoading(false)
    })()
  }, [])

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <ProgrammeHeader title="Your ROI" sub="What your programme cost, and what it has produced." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── WHAT IT COST — the programme price, straight off the row. */}
            {p.money.totalCents > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat v={programmeMoney(p.money.totalCents)} k="Programme value" />
                <ProgrammeStat
                  v={p.outcome.target ? `${p.outcome.target}` : null}
                  k={p.outcome.target ? 'Booked meetings targeted' : 'No target is set yet'}
                />
              </div>
            )}

            {/* ── WHAT IT PRODUCED — counts, never converted into money. */}
            {outreachHasRun(p.stage) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat v={p.progress.outcomesAchieved} k="Meetings booked on this programme" />
                <ProgrammeStat v={o === null ? null : o.replies_total} k="Replies, all time" />
              </div>
            )}

            {/* ── 🛑 WHY THERE IS NO RETURN FIGURE HERE ────────────────────────────────
                Stated plainly rather than implied by an absence, because a page called
                "Your ROI" with no ROI on it needs to say why. It names what is missing
                rather than apologising, and promises nothing about when it might exist. */}
            {!canComputeRoi() && (
              <div className="mt-3 bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
                <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">
                  Return
                </div>
                <p className="text-[13px] text-[#5c5279] leading-relaxed">
                  We can show you what your programme cost and what it produced. We can&rsquo;t
                  work out a return, because that depends on numbers only you have:
                </p>
                <ul className="mt-2 space-y-1">
                  {ROI_MISSING_INPUTS.map(x => (
                    <li key={x} className="text-[12.5px] text-[#9b8ec4]">· {x}</li>
                  ))}
                </ul>
                <a
                  href={`/milla?ask=${encodeURIComponent('How is my ROI looking?')}`}
                  className="inline-block border border-[#ece5fb] rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#5c5279] hover:bg-[#f6f1ff] transition-colors mt-3"
                >
                  How is my ROI looking?
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
