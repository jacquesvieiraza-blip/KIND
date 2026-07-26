'use client'

// M5 — "My campaign" is READ-ONLY for the client (founder-locked north star: "we do the
// work, you just approve leads"). This used to embed the full self-serve FIGSY console
// (Auto-Pilot/Co-Pilot toggle, New campaign, Templates, Suggest Campaigns, Resume/Clone/
// Delete, sequence builder, people sourcing) — all operator tools now live on Vida, scoped
// per-client, where they belong (docs/KIND-MASTER.md M&V console blueprint). This page shows
// STATUS ONLY: which campaigns are live, progress, sent, replies — nothing to operate.

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Campaign = {
  id: string; name: string
  status: 'draft' | 'active' | 'paused' | 'paused_low_performance' | 'completed' | 'archived'
  leads_enrolled: number; emails_sent: number; replies_total: number; replies_interested: number
  /** How many emails the sequence actually has. Progress used a hardcoded 3. */
  steps_count?: number | null
}
// M5 — the client SEES the sequence, and cannot edit it. Full transparency about what goes
// out in their name (they asked for this), with the authoring kept on Vida where we do the
// work. Read-only by construction: this page has no write path to figsy_sequences at all.
type Sequence = { id: string; name: string; steps: { subject?: string; body?: string; wait_days?: number }[] | null }

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', active: 'Live', paused: 'Paused', completed: 'Completed',
  archived: 'Archived', paused_low_performance: 'Auto-paused',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700', completed: 'bg-blue-100 text-[#6D28D9]',
  archived: 'bg-gray-100 text-[#9B8EC4]', paused_low_performance: 'bg-red-100 text-red-700',
}

function replyRate(c: Campaign): string { return c.emails_sent ? `${Math.round((c.replies_total / c.emails_sent) * 100)}%` : '—' }
function interestedRate(c: Campaign): string { return c.replies_total ? `${Math.round((c.replies_interested / c.replies_total) * 100)}%` : '—' }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaCampaignPage() {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [sequences, setSequences] = useState<Sequence[] | null>(null)
  const [openSeq, setOpenSeq] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const tok = await token()
        const r = await api.get<{ data: Campaign[] }>('/figsy/campaigns', tok)
        setCampaigns(r.data)
        // Best-effort: no sequence yet just means the section doesn't render.
        try {
          const sq = await api.get<{ data: Sequence[] }>('/figsy/sequences', tok)
          setSequences(sq.data)
        } catch { setSequences([]) }
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your campaign') }
    })()
  }, [])

  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold text-gray-900">My campaign</h1>
        <p className="text-[12.5px] text-[#9B8EC4] mt-0.5">Vida runs this for you — live status, nothing to operate.</p>
      </div>

      {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</div>}

      {!campaigns ? (
        <div className="text-[13px] text-[#9B8EC4] py-10 text-center">Loading…</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-10 text-center text-[13.5px] text-[#9B8EC4]">
          No campaign yet — Vida sets this up once your ICP is approved.
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-gray-900 text-[14.5px]">{c.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Enrolled', value: c.leads_enrolled },
                  { label: 'Sent', value: c.emails_sent },
                  { label: 'Replies', value: c.replies_total },
                  { label: 'Reply rate', value: replyRate(c) },
                  { label: 'Interested', value: interestedRate(c) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F5EEFF]/60 rounded-lg p-3">
                    <p className="text-[16px] font-extrabold text-gray-900 tabular-nums">{value}</p>
                    <p className="text-[11px] text-[#9B8EC4] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {(c.leads_enrolled > 0 || c.emails_sent > 0) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11.5px] font-semibold text-[#7B6FA0]">Campaign progress</p>
                    <p className="text-[11.5px] text-[#9B8EC4]">
                      {c.emails_sent > 0 && c.leads_enrolled > 0
                        ? `${Math.min(100, Math.round((c.emails_sent / Math.max(1, c.leads_enrolled * (c.steps_count || 3))) * 100))}% of sequence complete`
                        : 'Not started'}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex gap-0.5">
                    {c.leads_enrolled > 0 && <div className="h-full bg-blue-300 rounded-full" style={{ width: '60%' }} title={`${c.leads_enrolled} enrolled`} />}
                    {c.emails_sent > 0 && <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${Math.min(40, (c.emails_sent / Math.max(c.leads_enrolled * 3, 1)) * 40)}%` }} title={`${c.emails_sent} sent`} />}
                    {c.replies_interested > 0 && <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(20, (c.replies_interested / Math.max(c.emails_sent, 1)) * 200)}%` }} title={`${c.replies_interested} interested`} />}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]"><span className="w-2 h-2 rounded-full bg-blue-300" /> Enrolled</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]"><span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Sent</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]"><span className="w-2 h-2 rounded-full bg-green-500" /> Interested</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* M5 — what we actually send in your name. Visible, never editable here: tell us what
          to change and we change it, so nothing goes out that you haven't seen the shape of. */}
      {sequences && sequences.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-[15px] font-extrabold text-gray-900">The emails we send for you</h2>
            <span className="text-[11px] font-bold text-[#7C3AED] bg-[#F5EEFF] rounded-full px-2 py-0.5">read-only</span>
          </div>
          <p className="text-[12px] text-[#9B8EC4] mb-3">
            Each prospect gets their own version — their name, role and company are filled in, and the opening line
            is written from something real about them. Want it said differently? Tell Milla and we&rsquo;ll rewrite it.
          </p>
          {sequences.map(sq => {
            const steps = Array.isArray(sq.steps) ? sq.steps : []
            const open = openSeq === sq.id
            return (
              <div key={sq.id} className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-gray-900 text-[14px]">{sq.name}</span>
                  <span className="text-[11.5px] text-[#9B8EC4]">{steps.length} email{steps.length === 1 ? '' : 's'}</span>
                  <button onClick={() => setOpenSeq(open ? null : sq.id)}
                    className="ml-auto text-[12px] font-bold text-[#7C3AED] hover:underline">
                    {open ? 'Hide' : 'Read them'}
                  </button>
                </div>
                {open && (
                  <div className="mt-3 space-y-2.5">
                    {steps.map((st, i) => {
                      const day = steps.slice(0, i + 1).reduce((d, s, n) => d + (Number(s.wait_days ?? (n === 0 ? 0 : 3)) || 0), 0)
                      return (
                        <div key={i} className="bg-[#FAF8FF] border border-[#f2ecfb] rounded-xl p-3">
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Email {i + 1} · day {day}</p>
                          <p className="text-[12.5px] font-bold text-gray-900 mt-0.5">{st.subject || '(no subject)'}</p>
                          <p className="text-[12px] text-[#4c4368] leading-relaxed whitespace-pre-wrap mt-1">{st.body || ''}</p>
                        </div>
                      )
                    })}
                    {steps.length === 0 && <p className="text-[12.5px] text-[#9B8EC4]">Nothing written yet.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
