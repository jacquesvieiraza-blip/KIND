'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #512 — the client reviews their targeting and, when a newer version exists, asks to SEE
// who it finds. FIGSY sources against the ACTIVE ICP only.
//
// ⚠️ THIS PAGE USED TO ACTIVATE (22 Aug, corrected round 4). The button called
// `PATCH /icps/:id/activate` and made the ICP live itself. When activation became
// K.I.N.D-only that call started returning 403 and this became a button that always
// failed — and free proof, the launch acquisition motion, had no client entry at all.
//
// It now calls `POST /icps/:id/proof`: up to 20 REAL masked leads, the ICP stays
// `is_active = false`, nothing is revealed, charged, enrolled or sent. Going live remains
// ours (Vida). The language follows: the client asks to see their matches, they do not
// "activate", "approve" or press GO.

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

// M4 — the client refines their targeting the same way they set it up: by talking. The
// draft comes back from /icps/chat-build; POST /icps/revise makes it live and tells us, so
// we can re-check who is in their campaign (those people were picked against the old
// profile). No approval gate on their own change — founder-locked in the flow walk.
type IcpDraft = {
  name?: string; industries?: string[]; job_titles?: string[]; seniority_levels?: string[]
  company_sizes?: string[]; geographies?: string[]; tech_stack?: string[]; keywords?: string[]
}
type Turn = { role: 'user' | 'assistant'; content: string }

export default function MillaIcpPage() {
  const router = useRouter()
  const [icps, setIcps] = useState<Icp[] | null>(null) // oldest-first (v1 … vN)
  const [acting, setActing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [reviseOpen, setReviseOpen] = useState(false)
  const [chat, setChat] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<IcpDraft | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: Icp[] }>('/icps', await token())
      setIcps([...(r.data ?? [])].reverse()) // API returns newest-first; show oldest-first
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your ICP') }
  }, [])
  useEffect(() => { load() }, [load])

  // FREE PROOF — the client asks to see who this targeting finds. Not activation: their
  // ICP stays exactly as it was, and K.I.N.D still decides when it goes live.
  async function showMatches(id: string) {
    setActing(true); setError(null); setNote(null)
    try {
      const r = await api.post<{ data?: { pass?: number } }>(`/icps/${id}/proof`, {}, await token())
      setNote(r.data?.pass === 2
        ? 'On it — this is your second look, so we are being thorough. Your matches appear on your desk in a few minutes.'
        : 'On it — we are finding real people who match this. They will appear on your desk in a few minutes.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start that — please try again') }
    finally { setActing(false) }
  }

  async function sendRevise(text: string) {
    if (!text.trim() || busy) return
    const history = chat.slice(-12)
    setChat(c => [...c, { role: 'user', content: text }]); setInput(''); setBusy(true); setError(null)
    try {
      const r = await api.post<{ data: IcpDraft & { message?: string } }>(
        '/icps/chat-build', { message: text, history }, await token())
      const d = r.data ?? {}
      setChat(c => [...c, { role: 'assistant', content: d.message || 'Got it — anything else to change?' }])
      // Only treat it as a draft once there is something real to target with.
      const hasTargets = (d.industries?.length ?? 0) > 0 || (d.job_titles?.length ?? 0) > 0
      if (hasTargets) setDraft(prev => ({ ...(prev ?? {}), ...d, name: d.name || prev?.name || active?.name || 'My targeting' }))
    } catch (e) {
      setChat(c => [...c, { role: 'assistant', content: e instanceof Error ? e.message : 'Sorry — say that again?' }])
    }
    setBusy(false)
  }

  async function saveRevision() {
    if (!draft) return
    setBusy(true); setError(null); setNote(null)
    try {
      await api.post('/icps/revise', {
        name: draft.name || 'My targeting',
        industries: draft.industries ?? [], job_titles: draft.job_titles ?? [],
        seniority_levels: draft.seniority_levels ?? [], company_sizes: draft.company_sizes ?? [],
        geographies: draft.geographies ?? [], tech_stack: draft.tech_stack ?? [],
        keywords: draft.keywords ?? [],
      }, await token())
      setNote('Updated — this is your live targeting now, and we’ve been told so we can re-check who’s in your campaign.')
      setReviseOpen(false); setChat([]); setDraft(null)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your targeting') }
    setBusy(false)
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
              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 uppercase">ready to try</span>
            </div>
            <p className="text-[13px] text-[#5c5279] mb-3">{pendingApproval.name}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {chipsOf(pendingApproval).map((c, i) => <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>)}
            </div>
            <div className="flex gap-2">
              <button disabled={acting} onClick={() => showMatches(pendingApproval.id)} className="text-[13px] font-bold text-white rounded-xl py-2.5 px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{acting ? 'Finding…' : 'Show me who this finds'}</button>
              <button disabled={acting} onClick={() => router.push('/milla/welcome')} className="text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 px-4 border border-[#ece5fb]">Change the targeting</button>
            </div>
            {/* Said plainly, because the previous copy implied the client flipped a switch. */}
            <p className="text-[11.5px] text-[#9b8ec4] mt-3">
              We&apos;ll show you real people who match — free, and nothing is contacted. K.I.N.D switches your campaign on once you&apos;re happy.
            </p>
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
          </div>
        )}

        {/* M4 — refine it by talking. Goes live immediately; we get told so we can re-check
            who is already in the campaign (they were picked against the old profile). */}
        {icps && icps.length > 0 && (
          <div className="mt-5">
            {!reviseOpen ? (
              <button onClick={() => { setReviseOpen(true); setNote(null) }} className="text-[12.5px] font-bold text-[#7C3AED]">
                ↻ Change who we target — talk to Milla
              </button>
            ) : (
              <div className="bg-white border-[1.5px] border-[#e4d4fb] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <b className="text-[15px]">Change who we target</b>
                  <button onClick={() => { setReviseOpen(false); setChat([]); setDraft(null) }}
                    className="ml-auto text-[12px] font-semibold text-[#9b8ec4]">Close</button>
                </div>
                <p className="text-[12.5px] text-[#7c6f9b] mb-3">
                  Tell Milla what should change — a new industry, different job titles, another country.
                  It goes live as soon as you save, and we&apos;ll re-check who&apos;s already in your campaign.
                </p>

                <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
                  {chat.length === 0 && (
                    <p className="text-[12.5px] text-[#9b8ec4]">
                      e.g. &ldquo;Add fintech, and drop anyone below Head-of level&rdquo;
                    </p>
                  )}
                  {chat.map((m, i) => (
                    <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
                      <span className={`inline-block text-[12.5px] leading-relaxed rounded-xl px-3 py-2 max-w-[88%] text-left ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-[#faf8ff] border border-[#eee7f7] text-[#1f1235]'}`}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                  {busy && <p className="text-[12px] text-[#9b8ec4]">Milla is thinking…</p>}
                </div>

                {draft && (
                  <div className="border border-[#e4dcf7] bg-[#faf8ff] rounded-xl p-3.5 mb-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Your new targeting</p>
                    <b className="text-[13.5px] block mt-0.5 mb-1.5">{draft.name}</b>
                    <div className="flex flex-wrap gap-1.5">
                      {[...(draft.seniority_levels ?? []), ...(draft.job_titles ?? []), ...(draft.industries ?? []),
                        ...(draft.geographies ?? []), ...(draft.company_sizes ?? []).map(s => `${s} staff`)]
                        .filter(Boolean).map((c, i) => (
                          <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button disabled={busy} onClick={saveRevision}
                        className="text-[13px] font-bold text-white rounded-xl py-2.5 px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                        {busy ? 'Saving…' : 'Save — make this live'}
                      </button>
                      <button disabled={busy} onClick={() => setDraft(null)}
                        className="text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 px-4 border border-[#ece5fb]">Keep talking</button>
                    </div>
                  </div>
                )}

                <form onSubmit={e => { e.preventDefault(); sendRevise(input) }} className="flex gap-2">
                  {/* 1000 matches the server's cap on /icps/chat-build — without it a long
                      paste comes back as a raw validation error instead of a reply. */}
                  <input value={input} onChange={e => setInput(e.target.value)} disabled={busy} maxLength={1000}
                    placeholder="What should change?"
                    className="flex-1 border border-[#ece5fb] rounded-xl px-3.5 py-2.5 text-[13px] outline-none focus:border-[#7C3AED] disabled:opacity-60" />
                  <button type="submit" disabled={busy || !input.trim()}
                    className="bg-[#7C3AED] text-white rounded-xl px-5 text-[13px] font-bold disabled:opacity-40">Send</button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
