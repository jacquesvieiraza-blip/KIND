'use client'

import { useState } from 'react'
import {
  FileText, CheckCircle2, PenLine, Send, Loader2, AlertCircle, X,
} from 'lucide-react'

const API_URL = '/api/admin'

const PRODUCT_OPTIONS = [
  { value: 'lead_gen', label: 'AI Lead Generation' },
  { value: 'virtual_assistant', label: 'Virtual Assistant' },
  { value: 'chatbot', label: 'AI Chatbot' },
  { value: 'consulting', label: 'Consulting' },
]

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'once', label: 'Once-off' },
]

interface OrderForm {
  id: string
  products: string[]
  pricing_zar: number
  billing_interval: string
  scope: string | null
  start_date: string | null
  notes: string | null
  status: 'draft' | 'sent' | 'signed'
  sent_at: string
  signed_at: string | null
  signed_by_name: string | null
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

const PRODUCT_LABELS: Record<string, string> = {
  lead_gen: 'AI Lead Generation',
  virtual_assistant: 'Virtual Assistant',
  chatbot: 'AI Chatbot',
  consulting: 'Consulting',
}

export function OrderFormManager({ clientId, initialForm }: { clientId: string; initialForm: OrderForm | null }) {
  const [form, setForm] = useState<OrderForm | null>(initialForm)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // New form state
  const [products, setProducts] = useState<string[]>(['lead_gen'])
  const [pricingZar, setPricingZar] = useState('')
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [scope, setScope] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')

  function toggleProduct(value: string) {
    setProducts((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]
    )
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (products.length === 0) { setError('Select at least one product.'); return }
    if (!pricingZar || isNaN(Number(pricingZar)) || Number(pricingZar) <= 0) {
      setError('Enter a valid price.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/clients/${clientId}/order-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          pricing_zar: Number(pricingZar),
          billing_interval: billingInterval,
          scope: scope || undefined,
          start_date: startDate || undefined,
          notes: notes || undefined,
        }),
      })
      const data = await res.json() as { success: boolean; data: OrderForm; error?: string }
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to send order form')
      setForm(data.data)
      setCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send order form')
    } finally {
      setSaving(false)
    }
  }

  // Signed — show read-only view
  if (form?.status === 'signed') {
    return (
      <div className="bg-white rounded-xl border border-green-100 overflow-hidden">
        <div className="bg-green-50 border-b border-green-100 px-6 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Order Form — Signed</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Signed by <span className="font-medium">{form.signed_by_name}</span> on {new Date(form.signed_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Signed</span>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Products</p>
            {form.products.map((p) => (
              <p key={p} className="text-sm font-medium text-gray-800">{PRODUCT_LABELS[p] ?? p}</p>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Investment</p>
            <p className="text-sm font-medium text-gray-800">{formatCurrency(form.pricing_zar)} / {form.billing_interval}</p>
          </div>
          {form.start_date && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Start date</p>
              <p className="text-sm text-gray-800">{new Date(form.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
          {form.scope && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Scope</p>
              <p className="text-sm text-gray-700">{form.scope}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Sent but not signed
  if (form?.status === 'sent' && !creating) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3">
          <PenLine className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Order Form — Awaiting Signature</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sent {new Date(form.sent_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Pending signature</span>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Products</p>
            {form.products.map((p) => (
              <p key={p} className="text-sm font-medium text-gray-800">{PRODUCT_LABELS[p] ?? p}</p>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Investment</p>
            <p className="text-sm font-medium text-gray-800">{formatCurrency(form.pricing_zar)} / {form.billing_interval}</p>
          </div>
          {form.start_date && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Start date</p>
              <p className="text-sm text-gray-800">{new Date(form.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}
          {form.scope && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Scope</p>
              <p className="text-sm text-gray-700">{form.scope}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={() => setCreating(true)}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Replace with a new order form
          </button>
        </div>
      </div>
    )
  }

  // No form or creating mode — show the builder
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-500" />
          <h2 className="font-semibold text-gray-900">
            {creating ? 'Replace Order Form' : 'Create & Send Order Form'}
          </h2>
        </div>
        {creating && (
          <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSend} className="px-6 py-5 space-y-5">
        {/* Products */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Products <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCT_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={products.includes(opt.value)}
                  onChange={() => toggleProduct(opt.value)}
                  className="accent-brand-500"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Price (ZAR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R</span>
              <input
                type="number"
                value={pricingZar}
                onChange={(e) => setPricingZar(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Billing</label>
            <select
              value={billingInterval}
              onChange={(e) => setBillingInterval(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
            >
              {BILLING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Start date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
          />
        </div>

        {/* Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Scope of work</label>
          <textarea
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={3}
            placeholder="Describe what's included in this engagement…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Internal notes <span className="text-gray-400 font-normal">(not shown to client)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any internal context…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {saving ? 'Sending…' : 'Send Order Form to Client'}
        </button>

        <p className="text-xs text-gray-400 text-center">
          This will immediately appear in the client&apos;s portal Documents tab for signing. The T&amp;C documents from your Terms Library are automatically included.
        </p>
      </form>
    </div>
  )
}
