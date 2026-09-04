'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useMillaConversation } from '@/components/milla/MillaConversation'

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
//
// ── ⚑ 4 Sep — THAT CONVERSATION IS THE ONE CONVERSATION NOW ─────────────────────────────
//
// 🛑 THIS PAGE HELD A SECOND MILLA. A drawer with its own transcript, its own bubbles, its
// own composer and its own Send button sat below the version history, while the real Milla
// sat beside it in the shell. Two conversations on one screen, neither aware of the other,
// and a client who typed into the wrong one got no answer to the question they had asked.
//
// ⚠️ THE FLOW IS UNCHANGED, ONLY ITS HOME IS. `/icps/chat-build` still drafts, the draft is
// still shown before anything happens, and `/icps/revise` still runs ONLY on the client's
// explicit "Save — make this live". Nothing is auto-attached, nothing is sourced, no second
// proof pass is claimed and nothing is sent. All of it now happens inside the ONE
// conversation (`components/milla/MillaConversation.tsx`) in ICP context.
//
// ⚠️ AND FRESH IS STILL NOT REFINE. "Build fresh targeting with Milla" goes to
// `/milla/welcome` exactly as before — a fresh definition is not seeded from the current one.

export default function MillaIcpPage() {
  const router = useRouter()
  const [icps, setIcps] = useState<Icp[] | null>(null) // oldest-first (v1 … vN)
  const [acting, setActing] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const conversation = useMillaConversation()

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: Icp[] }>('/icps', await token())
      setIcps([...(r.data ?? [])].reverse()) // API returns newest-first; show oldest-first
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your ICP') }
  }, [])
  // ⚠️ RE-READS WHEN THE ONE CONVERSATION SAVES. The drawer used to call `load()` itself
  // after its own save; now the save happens in the conversation, and this counter is how the
  // screen learns a new version exists — so the version history cannot sit stale beside a
  // targeting change the client just made.
  useEffect(() => { load() }, [load, conversation.icpRevision])

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

  // ⛓️ 4 Sep — `sendRevise()` and `saveRevision()` MOVED, NOT DELETED. Both are in the ONE
  // conversation now, calling the same two endpoints with the same last-12-turn history, the
  // same 1,000-character cap and the same explicit save. Keeping copies here would have kept
  // the second Milla alive with a different button on it.

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

        {/* ── ⚑ 4 Sep — A FRESH START IS REACHABLE ONCE TARGETING ALREADY EXISTS ────────────
            🛑 THE ENTRY POINT ABOVE IS GATED ON `icps.length === 0`, so the conversational
            SET-UP path disappeared the moment a client had any targeting at all — leaving
            "Change the targeting", which refines what is there. That is the right default and
            it is not the only thing a client ever needs: a new programme, a new market or a
            new product is a NEW definition, not an edit of the old one.

            Same destination, same conversation, same explicit save. Nothing here replaces
            "Change the targeting" — it sits underneath it, quieter, as the second option. */}
        {icps && icps.length > 0 && (
          <p className="mt-4 text-[12.5px] text-[#9b8ec4] text-center">
            Starting something new?{' '}
            <button onClick={() => router.push('/milla/welcome')} className="font-bold text-[#7C3AED] hover:underline">
              Build fresh targeting with Milla
            </button>
            {' '}— your current targeting stays exactly as it is until you approve the new one.
          </p>
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

        {/* ── ⚑ 4 Sep — ONE COMPOSER. The drawer that stood here is gone; this focuses the
            conversation already on screen and tells it what it is talking about. ──────── */}
        {icps && icps.length > 0 && (
          <div className="mt-5">
            <button onClick={() => { setNote(null); conversation.focus('icp') }} className="text-[12.5px] font-bold text-[#7C3AED]">
              ↻ Change who we target — talk to Milla
            </button>
            <p className="text-[12px] text-[#9b8ec4] mt-1.5">
              Tell Milla what should change — a new industry, different job titles, another country.
              She&apos;ll show you the new targeting, and it only goes live when you save it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
