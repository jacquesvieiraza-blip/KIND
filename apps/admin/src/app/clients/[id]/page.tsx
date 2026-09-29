'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5d) — ONE CLIENT'S PROGRAMME RECORD.
//
// ⛓️ WAS subscriptions, a credit balance, an "Apply Credits" form, campaigns, ICPs and leads
// (three of those calls are refused, so they rendered empty) and a usage chart. Now: who they
// are, where they are (the lifecycle stage), and every programme they have bought — meetings
// bought and delivered, the price, each payment actually received, and any shortfall credit —
// from the one programme-money source (R174 · 4e).
//
// 🛑 "APPLY CREDITS" IS REMOVED, not moved (founder, R174 ⑧). Shortfall credit is granted by
// Settle, once, with its own record and window; a free-hand grant is a door for moving money.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2, ShieldCheck } from 'lucide-react'
import { paidState, type MoneyRow } from '@/lib/client-admin-rows'

interface Client {
  id: string; company_name: string; industry: string | null; country: string
  website: string | null; phone: string | null; created_at: string
  terms_accepted_at: string | null
  company_registration: string | null; vat_number: string | null
}

async function proxyGet(path: string) {
  const r = await fetch(`/api/proxy/admin/${path}`)
  return r.json()
}

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const STAGE_WORD: Record<string, string> = { in_full: 'Paid in full', first_half: 'First half', second_half: 'Second half' }

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null)
  const [stage, setStage] = useState<string | null>(null)
  const [programmes, setProgrammes] = useState<MoneyRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [clientRes, board, book] = await Promise.all([
          proxyGet(`clients/${params.id}`),
          fetch('/api/proxy/operator/lifecycle-board').then(r => r.json()),
          fetch('/api/proxy/operator/programme-money').then(r => r.json()),
        ])
        if (!alive) return
        if (clientRes?.success) setClient(clientRes.data)
        else setError(clientRes?.error || 'Could not read this client')
        if (board?.success) setStage(((board.data ?? []) as { client_id: string; stage_label: string }[]).find(r => r.client_id === params.id)?.stage_label ?? null)
        if (book?.success) setProgrammes(((book.data?.rows ?? []) as MoneyRow[]).filter(r => r.client_id === params.id))
        else setError(book?.error || 'Programme money could not be read')
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Could not load this client') }
    })()
    return () => { alive = false }
  }, [params.id])

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
      <Link href="/vida/clients-admin" className="text-xs text-[#7C3AED] font-semibold">← All clients</Link>
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{client?.company_name ?? 'Client'}</h1>
        {stage && <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-[#f3ecff] text-[#7C3AED]">{stage}</span>}
        <Link href={`/vida?client=${encodeURIComponent(params.id)}`} className="ml-auto text-sm font-semibold text-[#7C3AED]">Open in Vida →</Link>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

      <section className="bg-white border border-purple-100 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Programmes</h2>
        {programmes === null ? <p className="text-sm text-gray-400">Loading…</p>
          : programmes.length === 0 ? <p className="text-sm text-gray-400">No programme bought yet.</p>
          : programmes.map(p => (
            <div key={p.programme_id} className="border-t border-gray-100 first:border-t-0 py-3">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <b className="text-gray-900 capitalize">{p.status.toLowerCase().replace(/_/g, ' ')}</b>
                <span className="text-gray-400">·</span>
                <span className="text-gray-700 tabular-nums">{p.meetings_delivered ?? '?'} of {p.meetings_bought} meetings{p.settled ? ' · settled' : ''}</span>
                <span className="ml-auto text-xs font-medium rounded-full px-2.5 py-1 bg-gray-50 border border-gray-200 text-gray-600">{paidState(p)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 tabular-nums">
                Price {money(p.price_total_cents)} · received {money(p.cash_cents)}
                {p.shortfall_credit_cents > 0 ? ` · shortfall credit ${money(p.shortfall_credit_cents)}` : ''}
              </p>
              {(p.payments ?? []).map(pay => (
                <p key={`${pay.stage}-${pay.paid_at}`} className="text-xs text-gray-400 tabular-nums">
                  {STAGE_WORD[pay.stage] ?? pay.stage}: {money(pay.cents)} on {new Date(pay.paid_at).toLocaleDateString('en-GB')}{pay.ref ? ` · ${pay.ref}` : ''}
                </p>
              ))}
            </div>
          ))}
      </section>

      {client && (
        <section className="bg-gray-50 border border-gray-100 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-gray-400" />Client details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {([
              ['Company', client.company_name], ['Country', client.country], ['Industry', client.industry || '—'],
              ['Website', client.website || '—'], ['Phone', client.phone || '—'],
              ['Registration No.', client.company_registration || '—'], ['VAT Number', client.vat_number || '—'],
              ['Joined', new Date(client.created_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })],
            ] as [string, string][]).map(([label, val]) => (
              <div key={label}><span className="text-gray-400 text-xs">{label}</span><p className="text-gray-800 mt-0.5">{val}</p></div>
            ))}
          </div>
          <p className="text-xs mt-4 flex items-center gap-1.5 text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            {client.terms_accepted_at ? `Terms accepted ${new Date(client.terms_accepted_at).toLocaleDateString('en-ZA')}` : 'Terms not accepted'}
          </p>
        </section>
      )}
    </div>
  )
}
