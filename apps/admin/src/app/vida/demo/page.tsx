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
  const legacy = (demos ?? []).filter(d => d.company_name !== MBF_NAME)

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
            One environment, always the same 40 invented people, so the script never changes.
            Nothing here can send — the account is flagged demo and every address is on a{' '}
            <code className="px-1 bg-[#f8f6fd] rounded">.invalid</code> domain that cannot resolve.
          </p>
        </div>
        <button onClick={load} className="ml-auto shrink-0 p-2 rounded-lg border border-[#e9e2f6] text-[#8579a8] hover:bg-[#f8f6fd]" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>}
      {msg && <p className="mt-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">{msg}</p>}

      {/* ── MBF ─────────────────────────────────────────────────────────────── */}
      <div className="mt-6 border-[1.5px] border-[#7C3AED] rounded-2xl overflow-hidden">
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
          a ledger reading $99 in.
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
