'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (R195 ① ② · sequencing piece 3 — the founder's blueprint views 3 and 4, option A).
//
// THE DIRECTION FOR THIS PROGRAMME, right before the price and the pay button. Every programme
// starts from "What are you trying to achieve this time?" (answered in the one Milla
// conversation); Milla drafts who · one problem · impact · answer · proof · ask; the client changes
// any part with Milla and presses "Approve direction". The price and the pay button appear only
// then (`onApproved`), and the server refuses the first payment without it.
//
// 🛑 NO CHAT ON THE RIGHT (R196). Nothing here is typed into: every button opens or speaks in the
// ONE Milla conversation in the middle column, which fills this panel in. The only press that is
// not a conversation is "Approve direction" — an approval, like "Approve these emails".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useMillaConversation, DIRECTION_FIELDS, type DirectionKey } from '@/components/milla/MillaConversation'

type Direction = Record<DirectionKey, string> & {
  version: number; status: 'draft' | 'approved'; approved_at: string | null
}
type View = { direction: Direction | null; suggestedGoal: string | null; lastGoal: string | null }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export function ProgrammeDirection({ onApproved }: { onApproved: (approved: boolean) => void }) {
  const conversation = useMillaConversation()
  const [v, setV] = useState<View | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const r = await api.get<{ data: View }>('/my/programme/direction', await token())
        if (!live) return
        setV(r.data); setErr(null)
        onApproved(r.data?.direction?.status === 'approved')
      } catch {
        // 🛑 A FAILED READ KEEPS THE PAY BUTTON LOCKED and says so — never "no direction needed".
        if (live) { setErr('The direction for your programme could not be loaded just now. Please refresh in a moment.'); onApproved(false) }
      }
    })()
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.directionRevision, nonce])

  const d = v?.direction ?? null
  const askGoal = () => conversation.focus('direction:goal', { current: v?.lastGoal ?? d?.goal ?? '', version: d?.version ?? 0 })

  // ⚑ 3 Oct (R196) — the founder: *"there should be no chat sections on the right. you chat in the
  // middle column with Milla. that fills out the right panels."* So "Use this goal" does not draft
  // from here: it says the goal in the chat, as the client's message, and Milla drafts there.
  const useSuggested = () => { if (v?.suggestedGoal) conversation.draftDirectionFrom(v.suggestedGoal) }
  async function approve() {
    if (!d || busy) return
    setBusy('approve'); setErr(null)
    try { await api.post('/my/programme/direction/approve', { base_version: d.version }, await token()); setNonce(n => n + 1) }
    catch { setErr('Your approval could not be saved — the direction may have changed. Please check it and press Approve again.'); setNonce(n => n + 1) }
    finally { setBusy(null) }
  }

  return (
    <div data-testid="programme-direction" className="mv-hero-card">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="mv-eyebrow">{d ? `Direction · version ${d.version}` : 'This programme'}</div>
          <h2 className="!text-[17px]">{d ? 'Direction before emails' : 'What are you trying to achieve this time?'}</h2>
          <p>{d
            ? d.status === 'approved'
              ? 'Approved — this is what your emails will be written to. Your price and the pay button are below. Any change you make becomes a new version for you to approve.'
              : 'This is what your emails will be written to. Change any part with Milla, then approve it. Your price and the pay button appear once it’s approved.'
            : 'Every programme starts here. Tell Milla in a sentence, and she’ll draft the direction for you to check.'}</p>
        </div>
        {d && (d.status === 'approved'
          ? <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 uppercase">Approved</span>
          : <span className="text-[10px] font-extrabold text-[#6f3df4] bg-[#f3edff] rounded-full px-2.5 py-1 uppercase">Ready for you to check</span>)}
      </div>

      {err && <div className="mt-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{err}</div>}
      {!v && !err && <p className="text-[13px] text-[#9b8ec4] mt-3">Loading…</p>}

      {v && !d && (
        <div className="mt-3">
          {v.suggestedGoal && (
            <div className="rounded-xl border border-[#ece5fb] bg-white px-3 py-2.5 mb-3">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">What you told Milla when you started</div>
              <div className="text-[13.5px] mt-0.5">{v.suggestedGoal}</div>
            </div>
          )}
          {v.lastGoal && (
            <div className="rounded-xl border border-[#ece5fb] bg-white px-3 py-2.5 mb-3">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Your last programme’s goal</div>
              <div className="text-[13.5px] mt-0.5">{v.lastGoal}</div>
            </div>
          )}
          <div className="mv-cta-row">
            {v.suggestedGoal && (
              <button disabled={!!busy} onClick={useSuggested} className="mv-btn primary disabled:opacity-50">
                Use this goal
              </button>
            )}
            <button disabled={!!busy} onClick={askGoal} className={`mv-btn ${v.suggestedGoal ? '' : 'primary'} disabled:opacity-50`}>
              {v.suggestedGoal ? 'Tell Milla something different' : 'Tell Milla'}
            </button>
          </div>
        </div>
      )}

      {d && (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {DIRECTION_FIELDS.map(([k, label]) => (
              <div key={k} className={`rounded-xl border border-[#ece5fb] bg-white px-3 py-2.5 ${k === 'goal' || k === 'ask' ? 'sm:col-span-2' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc] flex-1">{label}</div>
                  <button onClick={() => k === 'goal' ? askGoal() : conversation.focus(`direction:${k}`, { current: d[k], version: d.version })}
                    className="text-[11.5px] font-bold text-[#7C3AED] hover:underline">{k === 'goal' ? 'Change goal' : 'Change'}</button>
                </div>
                <div className="text-[13.5px] mt-0.5 break-words">{d[k]}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-[12px] text-emerald-900">
              <b>When you approve:</b> your emails for this programme are written to this direction. Any change after that becomes a new version for you to approve.
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-900">
              <b>Never invented:</b> no result, number or customer is used unless you gave it and said we may quote it.
            </div>
          </div>
          {d.status !== 'approved' && (
            <div className="mv-cta-row mt-3">
              <button disabled={!!busy} onClick={approve} className="mv-btn primary disabled:opacity-50">
                {busy === 'approve' ? 'Saving…' : 'Approve direction'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Shown where the price and pay button will be, until the direction is approved. */
export function DirectionFirstNote() {
  return (
    <div data-testid="direction-first" className="rounded-2xl border border-dashed border-[#e4d9fb] bg-[#fbf9fd] px-4 py-3 text-[13px] text-[#766f7e]">
      Your price and the pay button appear here once you’ve approved the direction above.
    </div>
  )
}
