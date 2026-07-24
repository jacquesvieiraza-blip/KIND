'use client'

import { useCallback, useEffect, useState } from 'react'

// #511 NEXUS · Phase 1 — the per-client learning brain, surfaced for the operator. Pick a
// client → see what's actually converting for THEM (winning angle, best subjects, top persona,
// reply/meeting rates, objections) with honest confidence ("still learning" on thin data).
// Read-only: the numbers come from that client's own outcomes, never another client's.

type ClientRow = { id: string; company_name: string | null; industry: string | null; country: string | null }
type Nexus = {
  reply_rate: number; meeting_rate: number; best_subjects: string[]; winning_angle: string | null
  top_persona: { seniority?: string | null; industry?: string | null; job_title?: string | null }
  objections: { class: string; count: number }[]
  sample_worked: number; sample_replies: number; sample_meetings: number
  confidence: 'learning' | 'emerging' | 'confident'; computed_at: string
}

function initials(name: string | null): string {
  if (!name) return '—'
  const p = name.trim().split(/\s+/).filter(Boolean)
  return (p.length <= 1 ? (p[0] ?? '—').slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const pct = (n: number) => `${Math.round(n * 1000) / 10}%`
const CONF: Record<string, { label: string; c: string; bg: string }> = {
  learning:  { label: 'Still learning', c: '#b45309', bg: '#fef3c7' },
  emerging:  { label: 'Emerging',       c: '#7C3AED', bg: '#f3ecff' },
  confident: { label: 'Confident',      c: '#059669', bg: '#ecfdf5' },
}

export default function VidaNexusPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [nexus, setNexus] = useState<Nexus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/clients').then(r => r.json()).then(j => {
      if (!j?.success) return
      const rows: ClientRow[] = j.data ?? []
      setClients(rows)
      const url = new URLSearchParams(window.location.search).get('client')
      if (url && rows.some(r => r.id === url)) setSelected(url)
      else if (rows.length) setSelected(rows[0].id)
    }).catch(() => setError('Failed to load clients'))
  }, [])

  const load = useCallback(async (cid: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/proxy/operator/nexus?client_id=${encodeURIComponent(cid)}`)
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j?.success) throw new Error(j?.error || `Failed to load Nexus (${res.status})`)
      setNexus(j.data)
    } catch (e) { setNexus(null); setError(e instanceof Error ? e.message : 'Failed to load Nexus') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href); url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    load(selected)
  }, [selected, load])

  const sel = clients?.find(c => c.id === selected) ?? null
  const conf = nexus ? CONF[nexus.confidence] : null

  return (
    <div className="flex h-full min-h-0">
      {/* client picker */}
      <div className="w-[300px] shrink-0 border-r border-[#eee7f7] bg-white flex flex-col overflow-hidden">
        <div className="px-[18px] pt-[15px] pb-2.5">
          <b className="text-[14.5px]">🧠 Nexus</b>
          <span className="block text-[11.5px] text-[#9b8ec4]">Each client&apos;s private learning brain</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {!clients && !error && <p className="text-xs text-[#9b8ec4] px-2 py-3">Loading clients…</p>}
          {clients?.map(c => {
            const active = c.id === selected
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-1 transition-colors ${active ? 'bg-[#f3ecff] border border-[#e4d4fb]' : 'hover:bg-[#faf8ff] border border-transparent'}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? 'bg-[#7C3AED] text-white' : 'bg-[#efeafc] text-[#7C3AED]'}`}>{initials(c.company_name)}</span>
                <span className="min-w-0 flex-1">
                  <b className="text-[13px] block truncate">{c.company_name || 'Unnamed'}</b>
                  <span className="text-[11px] text-[#9b8ec4] block truncate">{[c.industry, c.country].filter(Boolean).join(' · ') || '—'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* brain */}
      <div className="flex-1 overflow-y-auto bg-[#fbfaff]">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-[#9b8ec4] text-sm">Pick a client to see their Nexus.</div>
        ) : (
          <div className="px-6 py-6 max-w-3xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#1f1235]">{sel?.company_name || 'Client'} · Nexus</h1>
                <p className="text-sm text-[#7c6f9b] mt-0.5">Learned from this client&apos;s own results only — never shared across clients.</p>
              </div>
              {conf && <span className="text-[11px] font-bold rounded-full px-3 py-1 shrink-0" style={{ color: conf.c, background: conf.bg }}>{conf.label}</span>}
            </div>

            {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
            {loading && !nexus && <p className="text-sm text-[#9b8ec4] mt-4">Computing…</p>}

            {nexus && (
              <>
                {nexus.sample_worked === 0 && (
                  <div className="mt-4 text-[13px] text-[#7c6f9b] bg-white border border-[#ece5fb] rounded-xl px-4 py-5 text-center">
                    No outreach worked yet for this client — Nexus starts learning the moment leads run.
                  </div>
                )}

                {/* rates */}
                <div className="grid grid-cols-3 gap-3 mt-5">
                  {[
                    ['Reply rate', pct(nexus.reply_rate), `${nexus.sample_replies} of ${nexus.sample_worked} worked`],
                    ['Meeting rate', pct(nexus.meeting_rate), `${nexus.sample_meetings} booked`],
                    ['Worked leads', String(nexus.sample_worked), 'the learning base'],
                  ].map(([l, v, s]) => (
                    <div key={l} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
                      <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{l}</div>
                      <div className="text-[20px] font-extrabold text-[#1f1235] mt-0.5">{v}</div>
                      <div className="text-[10.5px] text-[#9b8ec4] mt-0.5">{s}</div>
                    </div>
                  ))}
                </div>

                {/* what's converting */}
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <div className="bg-white border border-[#eee7f7] rounded-xl p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] mb-2">Top-converting persona</div>
                    {nexus.top_persona.seniority || nexus.top_persona.industry || nexus.top_persona.job_title ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[nexus.top_persona.job_title, nexus.top_persona.seniority, nexus.top_persona.industry].filter(Boolean).map((v, i) => (
                          <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{v}</span>
                        ))}
                      </div>
                    ) : <p className="text-[12px] text-[#9b8ec4]">Not enough booked meetings yet to call a pattern.</p>}
                  </div>
                  <div className="bg-white border border-[#eee7f7] rounded-xl p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] mb-2">Winning angle</div>
                    <p className="text-[12.5px] text-[#1f1235]">{nexus.winning_angle || <span className="text-[#9b8ec4]">Still learning what lands.</span>}</p>
                  </div>
                </div>

                {/* subjects */}
                <div className="mt-3 bg-white border border-[#eee7f7] rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] mb-2">Subjects that win replies</div>
                  {nexus.best_subjects.length ? (
                    <ul className="space-y-1">
                      {nexus.best_subjects.map((s, i) => <li key={i} className="text-[12.5px] text-[#1f1235]">“{s}”</li>)}
                    </ul>
                  ) : <p className="text-[12px] text-[#9b8ec4]">No standout subject yet.</p>}
                </div>

                {/* objections */}
                <div className="mt-3 bg-white border border-[#eee7f7] rounded-xl p-4">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] mb-2">What this market pushes back with</div>
                  {nexus.objections.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {nexus.objections.map((o, i) => (
                        <span key={i} className="text-[11.5px] font-semibold text-[#5c5279] bg-[#f7f4fd] border border-[#ece5fb] rounded-full px-2.5 py-1">{o.class.replace(/_/g, ' ')} · {o.count}</span>
                      ))}
                    </div>
                  ) : <p className="text-[12px] text-[#9b8ec4]">No negative-reply pattern yet.</p>}
                </div>

                <p className="text-[10.5px] text-[#b3a9cc] mt-4">Recomputed nightly from this client&apos;s own outcomes · last {new Date(nexus.computed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
