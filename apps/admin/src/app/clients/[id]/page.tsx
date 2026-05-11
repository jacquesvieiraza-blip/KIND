'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Send, CheckCircle, Loader2, Plus, Trash2, FileText, CreditCard } from 'lucide-react'
import { PRODUCTS } from '@kind/shared'

interface Client {
  id: string; company_name: string; industry: string | null; country: string
  website: string | null; phone: string | null; created_at: string
}
interface OrderForm {
  id: string; status: string; products: ProductLine[]; total_monthly_usd: number
  start_date: string | null; scope_notes: string | null; signed_at: string | null; signed_by: string | null; sent_at: string | null
}
interface ProductLine { product: string; tier: string; price_usd: number; billing_interval: string }
interface Subscription { id: string; product: string; tier: string; status: string; amount_usd: number }

async function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const PRODUCT_OPTIONS = [
  { key: 'lead_gen_starter',        label: 'Lead Gen — Starter',  price: 500  },
  { key: 'lead_gen_advanced',       label: 'Lead Gen — Advanced', price: 1200 },
  { key: 'lead_gen_figsy_starter',  label: 'Lead Gen + FIGSY — Starter',  price: 700  },
  { key: 'lead_gen_figsy_advanced', label: 'Lead Gen + FIGSY — Advanced', price: 1500 },
  { key: 'virtual_assistant_starter', label: 'Virtual Assistant — Starter', price: 199 },
  { key: 'virtual_assistant_pro',   label: 'Virtual Assistant — Pro',     price: 399  },
  { key: 'chatbot_starter',         label: 'Chatbot — Starter',   price: 199  },
  { key: 'chatbot_pro',             label: 'Chatbot — Pro',       price: 399  },
]

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient]       = useState<Client | null>(null)
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null)
  const [subs, setSubs]           = useState<Subscription[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  // Order form builder state
  const [lines, setLines]         = useState<ProductLine[]>([])
  const [startDate, setStartDate] = useState('')
  const [scopeNotes, setScopeNotes] = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`/api/clients/${params.id}/order-form`).then(r => r.json()),
    ]).then(([ofRes]) => {
      setOrderForm(ofRes.data)
      if (ofRes.data) {
        setLines(ofRes.data.products || [])
        setStartDate(ofRes.data.start_date || '')
        setScopeNotes(ofRes.data.scope_notes || '')
      }
    })

    // Fetch client + subs via Supabase directly
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    Promise.all([
      db.from('clients').select('*').eq('id', params.id).single(),
      db.from('subscriptions').select('*').eq('client_id', params.id),
    ]).then(([clientRes, subsRes]) => {
      setClient(clientRes.data)
      setSubs(subsRes.data || [])
      setLoading(false)
    })
  }, [params.id])

  function addLine() {
    const opt = PRODUCT_OPTIONS[0]
    const [product, tier] = opt.key.split('_').join('_').split('_', 2) as [string, string]
    setLines(prev => [...prev, { product: 'lead_gen', tier: 'starter', price_usd: 500, billing_interval: 'monthly' }])
  }

  function updateLine(idx: number, field: keyof ProductLine, value: string | number) {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const total = lines.reduce((s, l) => s + Number(l.price_usd), 0)

  async function sendOrderForm() {
    if (lines.length === 0) { alert('Add at least one product line.'); return }
    setSaving(true)
    const res = await fetch(`/api/clients/${params.id}/order-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: lines,
        total_monthly_usd: total,
        start_date: startDate || null,
        scope_notes: scopeNotes || null,
        created_by_email: 'admin@kind.ai',
      }),
    })
    const json = await res.json()
    setOrderForm(json.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0066FF]" /></div>
  if (!client) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Client not found</p></div>

  const isSigned = orderForm?.status === 'signed'
  const isSent   = orderForm?.status === 'sent'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#001f4d] text-white px-8 py-4 flex items-center gap-4">
        <a href="/clients" className="text-white/60 hover:text-white transition-colors"><ArrowLeft className="w-4 h-4" /></a>
        <div>
          <h1 className="font-bold text-lg">{client.company_name}</h1>
          <p className="text-white/50 text-xs">{client.country}{client.industry ? ` · ${client.industry}` : ''}</p>
        </div>
      </header>

      <main className="px-8 py-8 max-w-4xl mx-auto space-y-6">

        {/* Current subscriptions */}
        {subs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" />Active Subscriptions</h3>
            <div className="space-y-2">
              {subs.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 capitalize">{s.product.replace(/_/g, ' ')} — {s.tier}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">${s.amount_usd}/mo</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'trialing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order form status */}
        {isSigned && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-green-800 text-sm">Order Form signed</p>
              <p className="text-green-700 text-xs mt-0.5">
                Signed by <strong>{orderForm.signed_by}</strong> on {orderForm.signed_at ? new Date(orderForm.signed_at).toLocaleDateString('en-ZA', { dateStyle: 'long' }) : '—'}
              </p>
            </div>
          </div>
        )}

        {isSent && !isSigned && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center gap-3">
            <FileText className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-amber-800 text-sm">Order Form sent — <strong>awaiting client signature.</strong> Sent {orderForm?.sent_at ? new Date(orderForm.sent_at).toLocaleDateString('en-ZA') : ''}.</p>
          </div>
        )}

        {/* Order form builder */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />{isSigned ? 'Order Form (signed)' : isSent ? 'Order Form (sent — edit to resend)' : 'Create Order Form'}</h3>
          </div>

          {/* Product lines */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Products & Pricing</label>
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <select
                  value={`${line.product}_${line.tier}`}
                  onChange={e => {
                    const opt = PRODUCT_OPTIONS.find(o => o.key === e.target.value)
                    if (!opt) return
                    const parts = opt.key.split('_')
                    const tier = parts[parts.length - 1]
                    const product = parts.slice(0, -1).join('_')
                    updateLine(idx, 'product', product)
                    updateLine(idx, 'tier', tier)
                    updateLine(idx, 'price_usd', opt.price)
                  }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]">
                  {PRODUCT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                </select>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <span className="px-2 py-2 bg-gray-50 text-sm text-gray-500">$</span>
                  <input type="number" value={line.price_usd} onChange={e => updateLine(idx, 'price_usd', Number(e.target.value))}
                    className="w-24 px-2 py-2 text-sm focus:outline-none" />
                  <span className="px-2 py-2 bg-gray-50 text-sm text-gray-500">/mo</span>
                </div>
                <select value={line.billing_interval} onChange={e => updateLine(idx, 'billing_interval', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
                <button onClick={() => removeLine(idx)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={addLine}
              className="flex items-center gap-2 text-sm text-[#0066FF] hover:text-[#0055dd] font-medium transition-colors">
              <Plus className="w-4 h-4" />Add product line
            </button>
          </div>

          {/* Total */}
          {lines.length > 0 && (
            <div className="flex justify-between items-center py-3 border-t border-gray-100">
              <span className="text-sm font-medium text-gray-700">Total Monthly</span>
              <span className="text-xl font-bold text-gray-900">${total.toLocaleString()}/mo</span>
            </div>
          )}

          {/* Start date + scope */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope Notes</label>
            <textarea value={scopeNotes} onChange={e => setScopeNotes(e.target.value)} rows={3}
              placeholder="Any specific deliverables, customisations, or notes for this client…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF] resize-none" />
          </div>

          <button onClick={sendOrderForm} disabled={saving || lines.length === 0}
            className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055dd] text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {saved ? 'Sent to client!' : saving ? 'Sending…' : isSent || isSigned ? 'Update & resend' : 'Send Order Form to client'}
          </button>
          <p className="text-xs text-gray-400">Order Form appears immediately in the client's portal under Documents.</p>
        </div>

        {/* Client details */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold mb-3 text-sm text-gray-700">Client Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Company',  client.company_name],
              ['Country',  client.country],
              ['Industry', client.industry || '—'],
              ['Website',  client.website || '—'],
              ['Phone',    client.phone || '—'],
              ['Joined',   new Date(client.created_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })],
            ].map(([label, val]) => (
              <div key={label}>
                <span className="text-gray-400 text-xs">{label}</span>
                <p className="text-gray-700 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
