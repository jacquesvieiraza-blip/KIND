'use client'

// V7 ENGINE (item 211) + V9 inbox SOP (#270/#271).
//
// RULEBOOK 12.2: you cannot share a sender across clients — one client's complaints poison
// the rest. So every client needs their OWN warmed inbox, and we need to see that it is
// healthy. This page is that: deliverability at a glance, every live inbox with its warm-up
// state, and the queue of clients who have NO sender yet (nothing can go out for them).
//
// The locked SOP: trial signup → assign a PRE-WARMED POOLED inbox (instant, sends day 1) →
// on conversion record their BRANDED inbox (warms ~14d while they keep sending on the pool,
// so there is NO gap) → ~day 29 switch branded live and release the pooled one.

import { useCallback, useEffect, useState } from 'react'

type Inbox = {
  id: string; client_id: string; company_name: string | null; email: string
  kind: 'pooled' | 'branded'; status: string; provider: string | null; daily_cap: number | null
  warmup_started_at: string | null; warmup_ready_at: string | null; warmup_day: number | null
  warmup_ready: boolean | null; assigned_at: string | null
}
type Engine = {
  totals: { sent_7d: number; sent_today: number; opened_7d: number; bounced_7d: number; opt_outs_total: number; bounce_rate: number; open_rate: number }
  inboxes: Inbox[]
  needs_inbox: { client_id: string; company_name: string | null }[]
  migration_pending?: boolean
}

export default function VidaEnginePage() {
  const [e, setE] = useState<Engine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState<{ clientId: string; email: string } | null>(null)
  const [brandFor, setBrandFor] = useState<{ clientId: string; email: string } | null>(null)
  const [migMsg, setMigMsg] = useState<string | null>(null)
  // Shown only after the database REJECTS a password: the escape hatch for "the stored
  // password is stale and the Supabase dashboard that could reset it is unreachable" (GitHub
  // removed the Supabase OAuth app entirely). Used for one run, never stored anywhere.
  const [dbPw, setDbPw] = useState('')
  const [needsPw, setNeedsPw] = useState(false)

  // The Supabase SQL editor is unreachable (GitHub OAuth + flagged account), so the
  // migration runs from here instead. Only reviewed, committed, idempotent statements —
  // the endpoint ignores any body, so this is not an arbitrary-SQL hole.
  async function runMigration(withPassword?: string) {
    setBusy('migration'); setMigMsg(null); setError(null)
    try {
      const j = await fetch('/api/proxy/operator/migrations/run', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(withPassword ? { db_password: withPassword } : {}),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Migration failed')
      const failed = (j.data.results ?? []).filter((r: { ok: boolean }) => !r.ok)
      const ran = (j.data.results ?? []).filter((r: { ok: boolean }) => r.ok).length
      // Say WHERE it connected. The first run died with ENETUNREACH because Supabase's direct
      // host is IPv6-only and Railway has no IPv6 route; the runner now falls back to the IPv4
      // pooler, and the founder should know that so DATABASE_URL can be fixed for good.
      const via = j.data.host ? ` (via ${j.data.host})` : ''
      if (failed.length) setMigMsg(`Failed${via}: ${failed.map((f: { key: string; error: string }) => `${f.key} — ${f.error}`).join('; ')}`)
      else {
        setMigMsg(`${ran} migration${ran === 1 ? '' : 's'} applied${via}. Inbox tracking is live.${j.data.hint ? ` — ${j.data.hint}` : ''}`)
        setNeedsPw(false); setDbPw('')
        await load()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Migration failed'
      setMigMsg(msg)
      // Only offer the password box when the server actually rejected credentials — offering
      // it on a network failure would send you chasing the wrong problem.
      if (/password|credential|authentication|Tenant or user not found/i.test(msg)) setNeedsPw(true)
    }
    setBusy(null)
  }

  const load = useCallback(async () => {
    try {
      const j = await fetch('/api/proxy/operator/engine').then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load the engine')
      setE(j.data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load the engine') }
  }, [])
  useEffect(() => { load() }, [load])

  async function post(path: string, body: object, tag: string) {
    setBusy(tag); setError(null)
    try {
      const j = await fetch(`/api/proxy/operator/${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'That did not work')
      setForm(null); setBrandFor(null); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'That did not work') }
    setBusy(null)
  }

  const kpi = (label: string, value: string, sub: string, tone = '#1f1235') => (
    <div className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{label}</div>
      <div className="text-[20px] font-extrabold leading-tight mt-0.5" style={{ color: tone }}>{value}</div>
      <div className="text-[10.5px] text-[#9b8ec4] mt-0.5">{sub}</div>
    </div>
  )

  // A bounce rate over ~3% is the classic "you are burning the domain" signal.
  const bounceTone = !e ? '#1f1235' : e.totals.bounce_rate >= 3 ? '#dc2626' : e.totals.bounce_rate >= 1.5 ? '#b45309' : '#059669'

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold">Engine</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          Warmed sending, per client. Each client sends from their own inbox — a shared sender would let one
          client&apos;s complaints poison everyone.
        </p>
      </div>

      {error && <div className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">{error}</div>}
      {!e && !error && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

      {e?.migration_pending && (
        <div className="border border-amber-300 bg-amber-50 rounded-xl px-4 py-3 mb-4">
          <b className="text-[13px] text-amber-900 block">Inbox tracking is waiting on one migration.</b>
          <p className="text-[11.5px] text-amber-800 mt-1">
            Deliverability below is live. The inbox list and the &ldquo;needs an inbox&rdquo; queue switch on once
            <code className="mx-1 px-1 bg-white rounded">20260725_client_inboxes.sql</code> has been applied.
          </p>
          <button onClick={() => runMigration()} disabled={busy === 'migration'}
            className="mt-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
            {busy === 'migration' ? 'Running…' : 'Run it now'}
          </button>
          {migMsg && <p className="text-[11.5px] font-semibold text-amber-900 mt-2 leading-relaxed">{migMsg}</p>}

          {/* Appears only when the database rejected the stored password. There is no way back
              into the Supabase dashboard to reset it (GitHub removed the Supabase OAuth app),
              so this is the only remaining route in. Used for one run, stored nowhere. */}
          {needsPw && (
            <form
              onSubmit={ev => { ev.preventDefault(); if (dbPw.trim()) runMigration(dbPw.trim()) }}
              className="mt-3 border-t border-amber-200 pt-3"
            >
              <label className="block text-[11.5px] font-bold text-amber-900 mb-1">
                Try a different Postgres password
              </label>
              <p className="text-[11px] text-amber-800 mb-1.5 leading-relaxed">
                The route is fine — the database answered and rejected the stored password.
                This is used for this one run and never saved. If it works, put the same
                password into <code className="px-1 bg-white rounded">DATABASE_URL</code> in
                Railway → @kind/api → Variables.
              </p>
              <div className="flex gap-2">
                <input type="password" value={dbPw} onChange={ev => setDbPw(ev.target.value)}
                  autoComplete="off" placeholder="Postgres password"
                  className="flex-1 border border-amber-300 rounded-lg px-3 py-2 text-[12.5px] bg-white outline-none focus:border-amber-500" />
                <button type="submit" disabled={busy === 'migration' || !dbPw.trim()}
                  className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-40">
                  {busy === 'migration' ? 'Trying…' : 'Try it'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {e && (<>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          {kpi('Sent today', String(e.totals.sent_today), 'across all clients')}
          {kpi('Sent · 7 days', String(e.totals.sent_7d), 'total volume')}
          {kpi('Open rate · 7d', `${e.totals.open_rate}%`, 'tracked opens')}
          {kpi('Bounce rate · 7d', `${e.totals.bounce_rate}%`, e.totals.bounce_rate >= 3 ? '⚠ over 3% — burning' : 'healthy under 1.5%', bounceTone)}
          {kpi('Opt-outs', String(e.totals.opt_outs_total), 'do-not-contact list')}
        </div>

        {/* V9 — clients with NO sender. Nothing can go out for them at all. */}
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">Needs an inbox · {e.needs_inbox.length}</h2>
        {e.needs_inbox.length === 0 ? (
          <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 mb-6 text-[12.5px] font-semibold text-emerald-800">
            Every active client has a sender. Nothing waiting on you.
          </div>
        ) : (
          <div className="mb-6 space-y-2">
            {e.needs_inbox.map(c => (
              <div key={c.client_id} className="border border-amber-200 bg-amber-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <b className="text-[13px] text-amber-900 block">{c.company_name || 'Unnamed client'}</b>
                    <span className="text-[11.5px] text-amber-700">No sender — nothing can go out for them. Assign a pre-warmed pooled inbox and they send today.</span>
                  </div>
                  <button onClick={() => setForm({ clientId: c.client_id, email: '' })}
                    className="ml-auto shrink-0 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold">
                    Assign pooled inbox
                  </button>
                </div>
                {form?.clientId === c.client_id && (
                  <div className="flex gap-2 mt-3">
                    <input autoFocus value={form.email} onChange={ev => setForm({ ...form, email: ev.target.value })}
                      placeholder="pooled inbox address from Smartlead"
                      className="flex-1 border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] bg-white outline-none focus:border-[#7C3AED]" />
                    <button onClick={() => post('inboxes/assign', { client_id: c.client_id, email: form.email }, c.client_id)}
                      disabled={busy === c.client_id || !form.email.includes('@')}
                      className="bg-[#7C3AED] text-white rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-40">
                      {busy === c.client_id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setForm(null)} className="border border-[#ece5fb] rounded-lg px-3 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc] mb-2">Live inboxes · {e.inboxes.length}</h2>
        {e.inboxes.length === 0 ? (
          <div className="border border-[#eee7f7] bg-white rounded-xl px-4 py-8 text-center text-[13px] text-[#9b8ec4]">
            No inboxes recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {e.inboxes.map(i => (
              <div key={i.id} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <b className="text-[13px] block truncate">{i.company_name || 'Unnamed client'}</b>
                    <span className="text-[11.5px] text-[#9b8ec4] truncate block">{i.email}</span>
                  </div>
                  <span className={`shrink-0 text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${i.kind === 'branded' ? 'text-[#7C3AED] bg-[#f3ecff] border-[#e4d4fb]' : 'text-[#0369a1] bg-[#e0f2fe] border-[#bae6fd]'}`}>
                    {i.kind}
                  </span>
                  <span className={`shrink-0 text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${i.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                    {i.status}
                  </span>
                  {i.kind === 'branded' && i.warmup_day != null && (
                    <span className="shrink-0 text-[11.5px] font-bold text-[#5c5279]">
                      warm-up {i.warmup_day}/14{i.warmup_ready ? ' · ready' : ''}
                    </span>
                  )}
                  <div className="ml-auto shrink-0 flex items-center gap-2">
                    {i.kind === 'pooled' && (
                      <button onClick={() => setBrandFor({ clientId: i.client_id, email: '' })}
                        className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd]">
                        They paid — add branded
                      </button>
                    )}
                    {i.kind === 'branded' && i.status === 'warming' && i.warmup_ready && (
                      <button onClick={() => post(`inboxes/${i.id}/status`, { client_id: i.client_id, status: 'active' }, i.id)} disabled={busy === i.id}
                        className="text-[11.5px] font-bold text-white bg-emerald-600 rounded-lg px-2.5 py-1 disabled:opacity-50">
                        Switch live
                      </button>
                    )}
                    {i.status !== 'released' && (
                      <button onClick={() => post(`inboxes/${i.id}/status`, { client_id: i.client_id, status: 'released' }, i.id)} disabled={busy === i.id}
                        className="text-[11.5px] font-bold text-[#9b8ec4] disabled:opacity-50">Release</button>
                    )}
                  </div>
                </div>

                {brandFor?.clientId === i.client_id && (
                  <div className="flex gap-2 mt-3">
                    <input autoFocus value={brandFor.email} onChange={ev => setBrandFor({ ...brandFor, email: ev.target.value })}
                      placeholder="their own branded address (warms ~14 days, no gap)"
                      className="flex-1 border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] outline-none focus:border-[#7C3AED]" />
                    <button onClick={() => post('inboxes/brand', { client_id: i.client_id, email: brandFor.email }, `b-${i.id}`)}
                      disabled={busy === `b-${i.id}` || !brandFor.email.includes('@')}
                      className="bg-[#7C3AED] text-white rounded-lg px-4 text-[12.5px] font-bold disabled:opacity-40">
                      {busy === `b-${i.id}` ? 'Saving…' : 'Start warming'}
                    </button>
                    <button onClick={() => setBrandFor(null)} className="border border-[#ece5fb] rounded-lg px-3 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>)}
    </div>
  )
}
