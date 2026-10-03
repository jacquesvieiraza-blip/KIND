'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (sequencing piece 7 — the founder's blueprint view 9: History).
// "New goal = new sequence. Not new onboarding." The client's programmes side by side, and a
// timeline of what changed. READ-ONLY (R196: nothing on the right is typed into). Shown once there
// is anything to show. R145: prospect details are kept 90 days; the client's own direction and
// business facts are kept — said in those words.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type PastProgramme = {
  programmeId: string; status: string | null; startedAt: string | null; meetingTarget: number | null
  goal: string; problem: string; ask: string; audience: string | null; businessVersion: number | null
}
type HistoryEvent = { at: string; title: string; detail: string }
type History = { programmes: PastProgramme[]; events: HistoryEvent[] }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
const when = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function PastProgrammes() {
  const [h, setH] = useState<History | null>(null)
  const [err, setErr] = useState(false)
  useEffect(() => {
    let live = true
    ;(async () => {
      try { const r = await api.get<{ data: History }>('/my/programme/history', await token()); if (live) setH(r.data) }
      catch { if (live) setErr(true) }
    })()
    return () => { live = false }
  }, [])
  if (err) return <div className="mv-hero-card"><p className="text-[13px] text-red-700">Your programme history could not be loaded just now.</p></div>
  if (!h || (h.programmes.length === 0 && h.events.length === 0)) return null

  const ps = h.programmes
  const rows: [string, (p: PastProgramme) => string][] = [
    ['Goal', p => p.goal], ['Leads with', p => p.problem], ['Ask', p => p.ask],
    ['Who it was for', p => p.audience ?? '—'],
    ['Your business', p => (p.businessVersion ? `Version ${p.businessVersion}` : '—')],
  ]
  return (
    <div data-testid="past-programmes" className="mv-hero-card">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="mv-eyebrow">Your programmes</div>
          <h2 className="!text-[17px]">New goal = new sequence. Not new onboarding.</h2>
          <p>What’s still true about your business is kept; each programme gets its own goal, direction and emails.</p>
        </div>
        <span className="text-[10px] font-extrabold text-[#6f3df4] bg-[#f3edff] rounded-full px-2.5 py-1 uppercase">Prospect details kept 90 days · your business is kept</span>
      </div>

      {ps.length > 0 && (
        <div className="mt-3 rounded-2xl border border-[#ece5fb] bg-white p-3">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Programme comparison</div>
          <b className="text-[14px] block">What changed</b>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-wide text-[#9b8ec4]">
                  <th className="py-1 pr-3">Dimension</th>
                  {ps.map((p, i) => (
                    <th key={p.programmeId} className="py-1 pr-3">Programme {i + 1}{i === ps.length - 1 ? ' · latest' : ''}<span className="block normal-case font-normal tracking-normal">{when(p.startedAt)}{p.meetingTarget ? ` · target ${p.meetingTarget}` : ''}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, get]) => (
                  <tr key={label} className="border-t border-[#f3eefb] align-top">
                    <td className="py-1.5 pr-3 font-bold text-[#7c6f9b]">{label}</td>
                    {ps.map(p => <td key={p.programmeId} className="py-1.5 pr-3">{get(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {h.events.length > 0 && (
        <div className="mt-3 rounded-2xl border border-[#ece5fb] bg-white p-3">
          <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Version history</div>
          <b className="text-[14px] block">Direction and your business</b>
          <ol className="mt-2 flex flex-col gap-2">
            {h.events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="grid grid-cols-[110px_1fr] gap-3 text-[12.5px]">
                <span className="text-[#9b8ec4]">{when(e.at)}</span>
                <span><b>{e.title}</b><span className="block text-[#7c6f9b] break-words">{e.detail}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
