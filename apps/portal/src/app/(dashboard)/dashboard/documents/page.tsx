'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { FileText, ChevronDown, ChevronUp, CheckCircle, Loader2, Shield, ExternalLink, AlertCircle, Lock } from 'lucide-react'

interface Template { id: string; name: string; description: string | null; file_url: string; sort_order: number }
interface ProductLine { product: string; tier: string; price_usd: number; billing_interval: string }
interface OrderForm {
  id: string
  status: string
  products: ProductLine[]
  total_monthly_usd: number
  start_date: string | null
  scope_notes: string | null
  signed_at: string | null
  signed_by: string | null
  sent_at: string | null
}

function formatProduct(p: ProductLine) {
  return `${p.product.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — ${p.tier.charAt(0).toUpperCase() + p.tier.slice(1)} · $${p.price_usd}/${p.billing_interval}`
}

export default function DocumentsPage() {
  const supabase = createClient()
  const [token, setToken]         = useState<string | null>(null)
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading]     = useState(true)
  const [showTCs, setShowTCs]     = useState(false)
  const [activeDoc, setActiveDoc] = useState<Template | null>(null)
  const [signedBy, setSignedBy]   = useState('')
  const [agreed, setAgreed]       = useState(false)
  const [signing, setSigning]     = useState(false)
  const [signed, setSigned]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: { order_form: OrderForm | null; templates: Template[] } }>('/order-forms/me', session.access_token)
        setOrderForm(res.data.order_form)
        setTemplates(res.data.templates)
        if (res.data.order_form?.status === 'signed') setSigned(true)
      } catch { }
      setLoading(false)
    })
  }, [])

  async function handleSign() {
    if (!token || !orderForm) return
    if (!signedBy.trim() || signedBy.trim().split(' ').length < 2) {
      setError('Please enter your full name (first and last name).')
      return
    }
    if (!agreed) { setError('Please tick the checkbox to confirm your agreement.'); return }
    setError('')
    setSigning(true)
    try {
      await api.post(`/order-forms/${orderForm.id}/sign`, { signed_by: signedBy.trim() }, token)
      setOrderForm(prev => prev ? { ...prev, status: 'signed', signed_by: signedBy.trim(), signed_at: new Date().toISOString() } : prev)
      setSigned(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign. Please try again.')
    }
    setSigning(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  // No order form sent yet
  if (!orderForm) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 text-sm mt-1">Your agreements and service documents.</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="font-medium text-gray-700 mb-1">No documents yet</p>
        <p className="text-sm text-gray-400">Your Order Form will appear here once your account manager has sent it.</p>
      </div>
    </div>
  )

  const isSigned = signed || orderForm.status === 'signed'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 text-sm mt-1">Review and sign your Service Agreement.</p>
      </div>

      {/* Signed confirmation banner */}
      {isSigned && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Agreement signed</p>
            <p className="text-green-700 text-sm mt-0.5">
              Signed by <strong>{orderForm.signed_by}</strong> on {orderForm.signed_at ? new Date(orderForm.signed_at).toLocaleDateString('en-ZA', { dateStyle: 'long' }) : '—'}.
              This agreement is legally binding under the Electronic Communications and Transactions Act (ECTA).
            </p>
          </div>
        </div>
      )}

      {/* Order form card */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">KIND Service Order Form</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isSigned ? `Signed ${orderForm.signed_at ? new Date(orderForm.signed_at).toLocaleDateString('en-ZA') : ''}` : 'Awaiting your signature'}
              </p>
            </div>
          </div>
          {isSigned
            ? <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full"><CheckCircle className="w-3.5 h-3.5" />Signed</span>
            : <span className="flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 px-3 py-1.5 rounded-full"><AlertCircle className="w-3.5 h-3.5" />Signature required</span>
          }
        </div>

        {/* Order summary */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Services Ordered</p>
            <div className="space-y-2">
              {(orderForm.products || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{formatProduct(p)}</span>
                  <span className="font-medium text-gray-900">${p.price_usd}/mo</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t border-gray-100 mt-2">
                <span className="text-gray-900">Total Monthly</span>
                <span className="text-gray-900">${orderForm.total_monthly_usd}/mo</span>
              </div>
            </div>
          </div>

          {orderForm.start_date && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Start Date</p>
              <p className="text-sm text-gray-700">{new Date(orderForm.start_date).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</p>
            </div>
          )}

          {orderForm.scope_notes && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Scope Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{orderForm.scope_notes}</p>
            </div>
          )}

          {/* T&C viewer toggle */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button onClick={() => setShowTCs(!showTCs)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                View full Terms & Conditions ({templates.length} documents)
              </span>
              {showTCs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {showTCs && (
              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <p className="text-xs text-gray-500 mb-3">
                  By signing the Order Form above, you confirm you have read and agree to all of the following documents, incorporated by reference.
                </p>
                <div className="space-y-2">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.name}</p>
                        {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                      </div>
                      <a href={t.file_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium shrink-0 ml-4">
                        <ExternalLink className="w-3.5 h-3.5" />View PDF
                      </a>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Documents being prepared by your account manager.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature section */}
        {!isSigned && (
          <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 space-y-4">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-500">
                This is a legally binding electronic signature under the Electronic Communications and Transactions Act (ECTA), No. 25 of 2002.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your full name *</label>
              <input
                type="text"
                value={signedBy}
                onChange={e => setSignedBy(e.target.value)}
                placeholder="Type your full name to sign"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">
                I have read and agree to the KIND Service Order Form and all incorporated terms, including the Master Services Agreement, POPIA Compliant Process, and all applicable Exhibits. I confirm I am authorised to sign on behalf of my organisation.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}

            <button
              onClick={handleSign}
              disabled={signing || !signedBy.trim() || !agreed}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full justify-center">
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {signing ? 'Signing…' : 'Sign Order Form'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Your IP address and timestamp will be recorded. Questions? Email <a href="mailto:hello@kind.ai" className="text-brand-500 hover:underline">hello@kind.ai</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
