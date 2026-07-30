'use client'

// CLIENT ZERO — the house account, opened from Vida (#549 / #593).
//
// Our own outreach runs through the product like any client's, which means we need a client
// row of our own. `clients.user_id` is NOT NULL and unique, so one cannot be conjured — it
// needs an auth user, and the founder already has one (`hello@get-kind.com`).
//
// ── WHY THIS IS A BUTTON AND NOT A RUNBOOK LINE ──────────────────────────────────────────
//
// The Supabase dashboard is unreachable on this account (the same flag that keeps GitHub
// Actions off), so "run this INSERT" is not a step anybody can take. Every part of getting
// Client Zero live has to be a control in Vida or it does not happen.
//
// ── ADOPT BEATS CREATE ───────────────────────────────────────────────────────────────────
//
// Signing into the portal already creates a client row, so the founder's login probably owns
// one. Minting a second would leave two accounts for one person with nothing deciding which
// is real — which is #584, exactly. So this adopts what exists, creates only when there is
// genuinely nothing, and **refuses** rather than guessing when there are two.
//
// ⚠️ It shows the client id, and the id is precisely what makes somebody want to set
// `HOUSE_CLIENT_ID` "to finish setup". The warning is rendered right beside it, every time,
// because that variable gates the PARKED Instantly push and not our sending at all.

import { useState } from 'react'

type Readiness = { headline: string; label: string; detail: string; reason: string }
type House = {
  client_id: string
  name: string
  house_email: string
  action: 'adopt' | 'create'
  why: string
  granted: boolean
  can_send: boolean
  readiness: Readiness | null
  house_client_id_notice: string
}

export default function HouseClient({ onDone }: { onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [house, setHouse] = useState<House | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<{ id: string; name: string | null }[]>([])
  const [copied, setCopied] = useState(false)

  async function run() {
    setBusy(true); setError(null); setCandidates([])
    try {
      const r = await fetch('/api/proxy/operator/house-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      })
      const j = await r.json()
      if (!j?.success) {
        setError(j?.error || `Could not set up the house client (${r.status}).`)
        setCandidates((j?.data?.candidates ?? []) as { id: string; name: string | null }[])
        return
      }
      setHouse(j.data as House)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed and gave no reason.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <b className="text-[13px] text-[#1f1235] block">Client Zero — our own account</b>
      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
        Our outreach runs through the product like any client&apos;s, so it needs a client account of its own. This{' '}
        <b>adopts</b> the account your login already owns rather than creating a second one, marks it as a real
        (not demo) account, and comps it so sourcing is not refused for lack of payment. <b>Safe to press twice</b> —
        it changes nothing the second time.
      </p>

      <button onClick={run} disabled={busy}
        className="bg-[#1f1235] hover:bg-[#312150] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60 mt-3">
        {busy ? 'Setting up…' : house ? 'Check it again' : 'Set up the house client'}
      </button>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">Nothing was created.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">{error}</p>
          {candidates.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {candidates.map(c => (
                <li key={c.id} className="text-[11px] text-red-800">
                  <code className="px-1 bg-white rounded border border-red-200">{c.id}</code> — {c.name || 'unnamed'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {house && (
        <div className="mt-3 border-t border-[#ece5fb] pt-3">
          <p className="text-[12.5px] font-bold text-[#1f1235]">
            {house.action === 'adopt' ? 'Adopted the account your login already owns.' : 'Created the house account.'}
            {house.granted && ' Comped so sourcing is unlocked.'}
          </p>
          <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">{house.why}</p>

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <code className="text-[12px] bg-[#f8f6fd] border border-[#ece5fb] rounded-lg px-2 py-1 break-all">{house.client_id}</code>
            <button
              onClick={() => { navigator.clipboard?.writeText(house.client_id); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="text-[11.5px] font-bold text-[#5c5279] border border-[#ece5fb] rounded-lg px-2.5 py-1 hover:bg-[#f8f6fd]">
              {copied ? 'Copied' : 'Copy id'}
            </button>
            <span className="text-[11.5px] text-[#5c5279]">{house.name} · {house.house_email}</span>
          </div>

          {/* The warning lives NEXT TO the id, not in a footnote. The id is what makes the
              variable look like the missing step. */}
          <p className="text-[11.5px] font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 mt-2 leading-relaxed">
            ⚠️ {house.house_client_id_notice}
          </p>

          {/* Readiness, said out loud either way. "Can send" appearing nowhere is how a page
              makes absence read as health (#565). */}
          <div className={`rounded-lg border px-3 py-2 mt-2 ${house.can_send ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
            <b className={`text-[12.5px] block ${house.can_send ? 'text-emerald-900' : 'text-amber-900'}`}>
              {house.can_send ? 'This account can send.' : house.readiness?.label ?? 'This account cannot send yet.'}
            </b>
            <p className={`text-[11.5px] mt-0.5 leading-relaxed ${house.can_send ? 'text-emerald-800' : 'text-amber-800'}`}>
              {house.can_send
                ? 'A mailbox is assigned, live, and its SMTP details are readable.'
                : house.readiness?.detail ?? 'Add a mailbox below.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
