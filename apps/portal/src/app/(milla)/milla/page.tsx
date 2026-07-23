'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #488 — MILLA LEAD DESK (the client money-gate). Masked leads (role @ company, no name/
// contact) that FIGSY qualified; the client taps 👍 Approve ($1 reveal + $3 held) or ✕ Not
// a fit. Approve calls the client-authed /leads/:id/approve (the #492 hold rails). Design
// ref: docs/mv-previews/milla2.html.

type MaskedLead = {
  id: string; role: string; company: string; industry: string | null; country: string | null
  score: number | null; why_fits: string | null; created_at: string | null
}
type LedgerEntry = { amount: number; type: string; note: string | null; created_at: string | null }
type Ledger = { reveal_credits: number; work_credits: number; entries: LedgerEntry[] }
type Revealed = { email: string; workHeld: boolean }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MillaLeadDeskPage() {
  const [leads, setLeads] = useState<MaskedLead[] | null>(null)
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [topUp, setTopUp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const tok = await token()
      const [l, g] = await Promise.all([
        api.get<{ data: MaskedLead[] }>('/leads/for-approval', tok),
        api.get<{ data: Ledger }>('/leads/ledger', tok),
      ])
      setLeads(l.data); setLedger(g.data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your leads') }
  }, [])

  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    setActing(id); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ email: string; workHeld: boolean }>(`/leads/${id}/approve`, {}, tok)
      setRevealed(r => ({ ...r, [id]: { email: res.email, workHeld: res.workHeld } }))
      // refresh the ledger so the $1 + $3-hold show immediately
      const g = await api.get<{ data: Ledger }>('/leads/ledger', tok); setLedger(g.data)
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 402) setTopUp('You need $4 free to approve — $1 to reveal plus $3 held for the work. Top up your credits to continue.')
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }

  async function pass(id: string) {
    setActing(id); setError(null)
    try {
      const tok = await token()
      await api.post(`/leads/${id}/pass`, {}, tok)
      setLeads(ls => (ls ?? []).filter(l => l.id !== id))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not pass — please try again') }
    finally { setActing(null) }
  }

  const pending = (leads ?? []).filter(l => !revealed[l.id])

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">New leads awaiting you</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">FIGSY qualified these against your target. Review each — approve the ones worth pursuing. <b>Nothing is charged until you approve.</b></p>

        {/* the money terms, printed plainly */}
        <div className="mt-3 text-[12.5px] text-[#5c5279] bg-[#f3ecff] border border-[#e4d4fb] rounded-xl px-4 py-3 leading-relaxed">
          <b className="text-[#7C3AED]">How approving works:</b> <b>$1 now</b> to reveal the full contact · <b>$3 held</b>, captured only if a meeting books · if a booked prospect no-shows we re-book up to <b>2×</b>, and the $3 is not refunded · pass a lead and it costs nothing.
        </div>

        {topUp && <div className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">{topUp}</div>}
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!leads && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading your leads…</p>}
        {leads && pending.length === 0 && Object.keys(revealed).length === 0 && (
          <div className="mt-4 text-sm text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No leads waiting right now. We'll notify you the moment FIGSY qualifies the next one. 🎯</div>
        )}

        {/* revealed (just-approved) leads */}
        {leads?.filter(l => revealed[l.id]).map(l => (
          <div key={l.id} className="mt-3 bg-white border-[1.5px] border-emerald-200 rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">✓</span>
              <b className="text-[14px]">Approved · {l.role} @ {l.company}</b>
            </div>
            <div className="text-[13px] text-[#4c4368] mt-1">Contact revealed: <b>{revealed[l.id].email}</b></div>
            <div className="text-[12px] text-[#7c6f9b] mt-1">
              $1 charged · $3 held — {revealed[l.id].workHeld ? "we're working it now; the $3 is captured only if a meeting books." : 'no active campaign yet — the $3 was released.'}
            </div>
          </div>
        ))}

        {/* masked, pending leads */}
        <div className="mt-3 space-y-2.5">
          {pending.map(l => {
            const busy = acting === l.id
            return (
              <div key={l.id} className="bg-white border border-[#ece5fb] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center text-lg shrink-0">🎭</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-[14.5px]">{l.role} <span className="text-[#9b8ec4] font-semibold">@ {l.company}</span></b>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded px-1.5 py-0.5">masked</span>
                      {l.score != null && <span className="ml-auto text-[12px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded px-1.5">{l.score}<span className="text-[10px] font-semibold text-[#b3a9cc]"> fit</span></span>}
                    </div>
                    <div className="text-[12px] text-[#9b8ec4] mt-0.5">{[l.industry, l.country].filter(Boolean).join(' · ') || '—'}</div>
                    {l.why_fits && <div className="text-[12.5px] text-[#5c5279] mt-1.5 leading-relaxed"><b className="text-[#7c6f9b]">Why this fits:</b> {l.why_fits}</div>}
                    <div className="flex gap-2 mt-3">
                      <button disabled={busy} onClick={() => approve(l.id)}
                        className="text-[12.5px] font-bold text-white rounded-lg py-2 px-4 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                        {busy ? '…' : '👍 Approve qualified lead · $1'}
                      </button>
                      <button disabled={busy} onClick={() => pass(l.id)}
                        className="text-[12.5px] font-semibold text-[#5c5279] rounded-lg py-2 px-4 border border-[#ece5fb] bg-white disabled:opacity-50">
                        ✕ Not a fit
                      </button>
                    </div>
                    <div className="text-[10.5px] text-[#b3a9cc] mt-1.5">$1 reveals the contact now · $3 is held, captured only on a booked meeting</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* credit ledger */}
        <h2 className="text-[15px] font-bold text-[#1f1235] mt-8 mb-2">Credit ledger</h2>
        <div className="bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
          <div className="flex gap-6 px-4 py-3 border-b border-[#f0ebfa]">
            <div><div className="text-xl font-bold text-[#7C3AED] tabular-nums">{ledger?.reveal_credits ?? '…'}</div><div className="text-[10px] uppercase tracking-wide text-[#b3a9cc] font-bold">Reveal credits · $1</div></div>
            <div><div className="text-xl font-bold text-[#EC4899] tabular-nums">{ledger?.work_credits ?? '…'}</div><div className="text-[10px] uppercase tracking-wide text-[#b3a9cc] font-bold">Work credits · $3</div></div>
          </div>
          {(ledger?.entries ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#9b8ec4]">No charges yet — approve a lead to begin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <thead><tr className="bg-[#faf8ff] text-[#b3a9cc] text-[10px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2 font-semibold">When</th>
                  <th className="text-left px-4 py-2 font-semibold">Activity</th>
                  <th className="text-right px-4 py-2 font-semibold">Credits</th>
                </tr></thead>
                <tbody>
                  {(ledger?.entries ?? []).map((e, i) => (
                    <tr key={i} className="border-t border-[#f4eefb]">
                      <td className="px-4 py-2 text-[#9b8ec4] whitespace-nowrap">{fmt(e.created_at)}</td>
                      <td className="px-4 py-2 text-[#4c4368]">{e.note || e.type}</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${e.amount < 0 ? 'text-[#5c5279]' : 'text-emerald-600'}`}>{e.amount > 0 ? `+${e.amount}` : e.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
