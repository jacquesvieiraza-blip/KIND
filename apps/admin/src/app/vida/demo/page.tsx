'use client'

// ONE DEMO ENVIRONMENT, ALWAYS: MBF (founder-locked 26 Jul).
//
// Lives under /vida on purpose. It used to sit at the admin root, which meant it rendered in
// the old Admin-OS shell — dark sidebar, "Back to Vida console", Nora — so opening it from
// Vida's own menu threw the operator out of Vida. Every other menu entry is /vida/*; this is
// now one of them.
//
// This page used to be "Demo Environments" — a factory that minted a NEW demo client per
// prospect, each pulling REAL people out of Apollo, each with its own expiry. Two problems,
// both founder-called:
//   • You cannot rehearse a script on a stage that changes. "5 demos = 1 sale" only works if
//     demo fifty shows the same people as demo one.
//   • Real leads in a demo means real strangers' names and companies on a sales call.
//
// So there is exactly one demo account now — MBF, a fixed cast of 40 invented people on
// `.invalid` addresses that cannot resolve. This page builds it, resets it, and opens it.
// The create form is gone: making a second environment is the thing we're stopping.
//
// Anything else flagged `is_demo` is legacy and shown as such. Deleting it is left to a human
// click on purpose — this page never removes an account by itself.

import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, Trash2, Loader2, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'
import { PACK_PRICE_USD } from '@kind/shared'

interface Demo {
  id: string
  company_name: string
  industry: string
  country: string
  created_at: string
  prospect_name: string
  created_by: string
  expires_at: string
  leads_count: number
  expired: boolean
}

const MBF_NAME = 'MBF Holdings'
// ⚑ 28 Sep (R164 · demo B) — the one client demo of the CURRENT product. MBF (above) seeds the
// retired per-lead model and cannot show today's six stages; Northwind can, at any of them.
const NORTHWIND_NAME = 'Northwind Field Software'
const STAGES = ['Brief', 'Proof', 'Programme', 'Approval', 'Results', 'Complete'] as const
const STAGE_NOTE: Record<(typeof STAGES)[number], string> = {
  Brief:     'Signed in, no account yet — walk the real Brief chat. Confirming it builds the demo at Proof with the made-up cast (never real people).',
  Proof:     '24 made-up people on the Proof desk, ready to approve or pass.',
  Programme: 'Proof done — the programme calculator, priced on Northwind\u2019s size. Payment is refused for a demo; use Approval to move on.',
  Approval:  'A programme ready to approve: 20 people and the three-email sequence. Nothing was paid.',
  Results:   'Live: emails sent, replies in the Inbox, 3 of 8 qualified meetings (one still to come).',
  Complete:  'Finished: 8 of 8 qualified meetings delivered.',
}

function NorthwindCard() {
  const [state, setState] = useState<{ stage: string; clientId: string | null; email: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const read = useCallback(async () => {
    try {
      const j = await fetch('/api/proxy/operator/demo/northwind').then(r => r.json())
      if (j?.success) setState(j.data); else setErr(j?.error || 'Could not read the demo')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not read the demo') }
  }, [])
  useEffect(() => { read() }, [read])

  async function setStage(stage: string) {
    if (!confirm(`Set ${NORTHWIND_NAME} to ${stage}?\n\nThe demo account is cleared and rebuilt at that stage. Real clients are untouched.`)) return
    setBusy(stage); setErr(null); setNote(null)
    try {
      const j = await fetch('/api/proxy/operator/demo/northwind/stage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }),
      }).then(r => r.json())
      if (!j?.success) setErr(j?.error || 'Could not set the stage'); else setNote(j.message)
      await read()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not set the stage') }
    setBusy(null)
  }

  async function openIt() {
    setBusy('open'); setErr(null)
    try {
      const j = await fetch('/api/proxy/operator/demo/northwind/login', { method: 'POST' }).then(r => r.json())
      if (j?.data?.open_url) window.open(j.data.open_url, '_blank'); else setErr(j?.error || 'Could not open the demo')
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not open the demo') }
    setBusy(null)
  }

  const current = state?.stage ?? null
  return (
    <div className="mt-6 border-[1.5px] border-[#7C3AED] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-br from-[#f3ecff] to-[#fdf2f8] border-b border-[#e9e2f6]">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <b className="text-[17px] text-[#1f1235] block">{NORTHWIND_NAME}</b>
            <span className="text-[13px] text-[#8579a8]">
              The current product, end to end · {current ? <>now at <b className="text-[#1f1235]">{current}</b></> : 'reading…'}
            </span>
          </div>
          <button onClick={openIt} disabled={busy !== null}
            className="ml-auto inline-flex items-center gap-1.5 text-[13.5px] font-bold text-white rounded-xl px-3.5 py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
            {busy === 'open' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Open as the client
          </button>
        </div>
      </div>
      <div className="px-5 py-4">
        <div className="text-[12px] font-bold uppercase tracking-wide text-[#8579a8] mb-2">Set the demo to a stage</div>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <button key={s} onClick={() => setStage(s)} disabled={busy !== null}
              className={`inline-flex items-center gap-1.5 text-[13px] font-bold rounded-xl px-3 py-1.5 border disabled:opacity-50 ${
                current === s ? 'bg-[#7C3AED] text-white border-[#7C3AED]' : 'bg-white text-[#453a5e] border-[#e4d4fb] hover:bg-[#f8f6fd]'}`}>
              {busy === s ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="text-[11px] opacity-70">{i + 1}</span>}
              {s}
            </button>
          ))}
        </div>
        {current && STAGE_NOTE[current as (typeof STAGES)[number]] && (
          <p className="mt-3 text-[13px] text-[#453a5e]">{STAGE_NOTE[current as (typeof STAGES)[number]]}</p>
        )}
        {err && <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{err}</p>}
        {note && <p className="mt-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">{note}</p>}
        <p className="mt-3 text-[12.5px] text-[#8579a8]">
          Made-up firm, made-up people on <code className="px-1 bg-[#f8f6fd] rounded">.invalid</code> addresses.
          It can never be charged, take a real mailbox or send. Login: <code className="px-1 bg-[#f8f6fd] rounded">{state?.email ?? '…'}</code> — opened from here, never by password.
        </p>
      </div>
    </div>
  )
}

export default function DemoPage() {
  const [demos, setDemos] = useState<Demo[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const j = await fetch('/api/proxy/admin/demos').then(r => r.json())
      setDemos(j?.success ? (j.data ?? []) : [])
      if (!j?.success) setError(j?.error || 'Could not load the demo accounts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the demo accounts')
      setDemos([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  const mbf = (demos ?? []).find(d => d.company_name === MBF_NAME) ?? null
  const legacy = (demos ?? []).filter(d => d.company_name !== MBF_NAME && d.company_name !== NORTHWIND_NAME)

  // Build MBF the first time, or reset it to identical state between demos.
  async function buildOrReset() {
    if (mbf && !confirm(`Rebuild ${MBF_NAME} to its starting state?\n\nEverything currently in the demo account is wiped and replaced with the fixed cast. Real clients are untouched.`)) return
    setBusy('mbf'); setMsg(null); setError(null)
    try {
      const j = await fetch('/api/proxy/operator/demo/mbf/reset', { method: 'POST' }).then(r => r.json())
      if (!j?.success) { setError(j?.error || 'Could not build the demo'); return }
      setMsg(j.message)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the demo')
    }
    setBusy(null)
  }

  // Sign in AS the demo client, in a new tab. Lands on Milla — the client console — not the
  // retired /dashboard the old page sent you to.
  async function open(id: string) {
    setBusy(id); setError(null)
    try {
      const j = await fetch(`/api/proxy/admin/demos/${id}/login`, { method: 'POST' }).then(r => r.json())
      const url = j?.data?.open_url || j?.data?.magic_link
      if (!url) { setError(j?.error || 'Could not generate the sign-in link'); return }
      window.open(url, '_blank')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the sign-in link')
    }
    setBusy(null)
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete ${name}?\n\nThis removes the demo client and everything in it. It cannot be undone.`)) return
    setBusy(id); setError(null)
    try {
      const j = await fetch(`/api/proxy/admin/demos/${id}`, { method: 'DELETE' }).then(r => r.json())
      if (!j?.success) { setError(j?.error || 'Could not delete it'); return }
      setMsg(`${name} deleted.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete it')
    }
    setBusy(null)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1f1235]">The demo account</h1>
          <p className="text-sm text-[#8579a8] mt-1 max-w-2xl">
            One client demo of the current product — Northwind — set to any stage before a call, always the
            same made-up people, so the script never changes. Nothing here can send, be charged or take a real mailbox.
          </p>
        </div>
        <button onClick={load} className="ml-auto shrink-0 p-2 rounded-lg border border-[#e9e2f6] text-[#8579a8] hover:bg-[#f8f6fd]" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
      {msg && <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">{msg}</p>}

      <NorthwindCard />

      {/* ── MBF ─────────────────────────────────────────────────────────────── */}
      <div className="mt-8 text-[12px] font-bold uppercase tracking-wide text-[#8579a8]">Old product (per-lead model, retired) — kept for reference</div>
      <div className="mt-2 border border-[#e9e2f6] rounded-2xl overflow-hidden opacity-90">
        <div className="px-5 py-4 bg-gradient-to-br from-[#f3ecff] to-[#fdf2f8] border-b border-[#e9e2f6]">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <b className="text-[17px] text-[#1f1235] block">{MBF_NAME}</b>
              <span className="text-[13px] text-[#8579a8]">
                {mbf ? `${mbf.leads_count} people · ready` : 'Not built yet'}
              </span>
            </div>
            <div className="ml-auto flex gap-2">
              {mbf && (
                <button onClick={() => open(mbf.id)} disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#7C3AED] bg-white border border-[#e4d4fb] rounded-xl px-3.5 py-2 disabled:opacity-50">
                  {busy === mbf.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Open as the client
                </button>
              )}
              <button onClick={buildOrReset} disabled={busy !== null}
                className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-white rounded-xl px-3.5 py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                {busy === 'mbf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {mbf ? 'Reset it' : 'Build it'}
              </button>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 text-[13.5px] text-[#453a5e] leading-relaxed">
          <b className="text-[#1f1235]">What&apos;s in it:</b> 12 people already being worked · <b>22 waiting to be picked</b> (two
          more than the minimum-20 gate, so you can show the rule rather than watch it adapt down) · 6 passed, all visibly
          worse fits · 6 replies including a hot one, an objection and an opt-out · 2 meetings booked and still ahead ·
          a ledger reading ${PACK_PRICE_USD} in.
          <div className="mt-2.5 text-[13px] text-[#8579a8]">
            Reset it before a demo, or the moment you break it mid-pitch. It rebuilds to exactly the same state every time.
          </div>
        </div>
      </div>

      {/* ── legacy accounts ─────────────────────────────────────────────────── */}
      {legacy.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#92400e]" />
            <b className="text-[15px] text-[#1f1235]">{legacy.length} demo account{legacy.length === 1 ? '' : 's'} that shouldn&apos;t exist</b>
          </div>
          <p className="text-[13px] text-[#8579a8] mt-1 mb-3 max-w-2xl">
            Left over from the old &ldquo;one demo per prospect&rdquo; page, which pulled <b>real people out of Apollo</b> — real
            strangers&apos; names on a sales call. They also clutter the Vida client list. Deleting is a human decision, so
            nothing here removes them for you.
          </p>
          <div className="border border-[#e9e2f6] rounded-xl overflow-hidden">
            {legacy.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f1ecfa] last:border-b-0">
                <div className="min-w-0">
                  <b className="text-[13.5px] text-[#1f1235] block truncate">{d.company_name || 'Unnamed'}</b>
                  <span className="text-[12px] text-[#8579a8]">
                    {[d.industry, d.country].filter(Boolean).join(' · ') || '—'} · {d.leads_count} leads
                    {d.expired ? ' · expired' : ''}
                  </span>
                </div>
                <button onClick={() => remove(d.id, d.company_name || 'this demo')} disabled={busy !== null}
                  className="ml-auto shrink-0 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-red-700 border border-red-200 bg-red-50 rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                  {busy === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {demos === null && <p className="mt-6 text-sm text-[#8579a8] inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
      {demos !== null && legacy.length === 0 && mbf && (
        <p className="mt-6 text-sm text-emerald-800 inline-flex items-center gap-2"><CheckCircle className="w-4 h-4" /> One demo environment, as it should be.</p>
      )}
    </div>
  )
}
