'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #512 — CLIENT ICP APPROVAL GATE. The client reviews their targeting (current ICP) and,
// if the operator has proposed a newer version, signs it off. FIGSY sources against the
// ACTIVE ICP only — approving here activates it (and kicks a first sourcing run). Reuses
// the live /icps endpoints.

type Icp = {
  id: string; name: string | null; is_active: boolean | null; created_at: string | null; last_run_at: string | null
  industries: string[] | null; job_titles: string[] | null; seniority_levels: string[] | null
  company_sizes: string[] | null; geographies: string[] | null
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function fmt(iso: string | null): string {
  if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function MillaIcpPage() {
  const router = useRouter()
  const [icps, setIcps] = useState<Icp[] | null>(null) // oldest-first (v1 … vN)
  const [acting, setActing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: Icp[] }>('/icps', await token())
      setIcps([...(r.data ?? [])].reverse()) // API returns newest-first; show oldest-first
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your ICP') }
  }, [])
  useEffect(() => { load() }, [load])

  async function approve(id: string) {
    setActing(true); setError(null); setNote(null)
    try {
      const r = await api.patch<{ sourcing?: boolean }>(`/icps/${id}/activate`, {}, await token())
      setNote(r.sourcing ? 'Approved — FIGSY is sourcing leads against this ICP now.' : 'Approved — this is now your active targeting.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not approve — please try again') }
    finally { setActing(false) }
  }

  const chipsOf = (i: Icp) => [
    ...(i.seniority_levels ?? []), ...(i.job_titles ?? []), ...(i.industries ?? []),
    ...(i.geographies ?? []), ...(i.company_sizes ?? []).map(s => `${s} staff`),
  ].filter(Boolean)

  const active = (icps ?? []).find(i => i.is_active)
  const newest = (icps ?? [])[(icps ?? []).length - 1]
  const pendingApproval = newest && !newest.is_active ? newest : null

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Your targeting (ICP)</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">This is exactly who FIGSY searches for. Nothing is sourced until an ICP is approved and active.</p>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {note && <div className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{note}</div>}
        {!icps && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading…</p>}
        {icps && icps.length === 0 && (
          <div className="mt-4 bg-white border border-[#ece5fb] rounded-2xl px-4 py-8 text-center">
            <p className="text-sm text-[#9b8ec4] mb-3">You haven&apos;t set up your targeting yet.</p>
            <button onClick={() => router.push('/milla/welcome')} className="text-[13px] font-bold text-white rounded-xl py-2.5 px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">Set up with Milla</button>
          </div>
        )}

        {/* pending approval (operator proposed a newer version) */}
        {pendingApproval && (
          <div className="mt-5 bg-white border-[1.5px] border-[#e4d4fb] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <b className="text-[15px]">New targeting proposed · {`v${icps!.length}`}</b>
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 uppercase">awaiting your 👍</span>
            </div>
            <p className="text-[13px] text-[#5c5279] mb-3">{pendingApproval.name}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {chipsOf(pendingApproval).map((c, i) => <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>)}
            </div>
            <div className="flex gap-2">
              <button disabled={acting} onClick={() => approve(pendingApproval.id)} className="text-[13px] font-bold text-white rounded-xl py-2.5 px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{acting ? 'Approving…' : '✓ Approve — start sourcing'}</button>
              <button disabled={acting} onClick={() => router.push('/milla/welcome')} className="text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 px-4 border border-[#ece5fb]">Request changes</button>
            </div>
          </div>
        )}

        {/* current active ICP */}
        {active && (
          <div className="mt-5">
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mb-2">Active targeting</div>
            <div className="bg-white border border-[#eee7f7] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <b className="text-[15px]">{active.name}</b>
                <span className="text-[9.5px] font-extrabold text-emerald-600">· current{active.last_run_at ? ' · sourcing' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {chipsOf(active).map((c, i) => <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* version history */}
        {icps && icps.length > 0 && (
          <div className="mt-5">
            <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mb-2">Version history</div>
            <div className="flex flex-wrap gap-2.5">
              {icps.map((i, idx) => (
                <div key={i.id} className={`border rounded-xl px-3 py-2.5 min-w-[140px] ${i.is_active ? 'border-emerald-300 bg-emerald-50/40' : 'border-[#ece5fb]'}`}>
                  <b className="text-[13px]">v{idx + 1}</b>{i.is_active && <span className="text-[9.5px] font-extrabold text-emerald-600"> · active</span>}
                  <span className="block text-[11px] text-[#9b8ec4] mt-0.5">{fmt(i.created_at)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/milla/welcome')} className="mt-4 text-[12.5px] font-semibold text-[#7C3AED]">↻ Refine targeting with Milla</button>
          </div>
        )}
      </div>
    </div>
  )
}
