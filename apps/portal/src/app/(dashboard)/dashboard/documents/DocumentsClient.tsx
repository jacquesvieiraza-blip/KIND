'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  FileText, Download, Loader2, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, PenLine, File, Lock,
} from 'lucide-react'

const PRODUCT_LABELS: Record<string, string> = {
  lead_gen: 'AI Lead Generation',
  virtual_assistant: 'Virtual Assistant',
  chatbot: 'AI Chatbot',
  consulting: 'Consulting',
}

const TERMS_TYPE_LABELS: Record<string, string> = {
  msa: 'Master Services Agreement',
  offer: 'Offer Document',
  sla: 'Chatbot SLA (Exhibit A)',
  service_order: 'Service Order (Exhibit B)',
  popia: 'POPIA Compliant Process',
  other: 'Terms Document',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  offer: 'Offer Document',
  msa: 'Master Service Agreement',
  sla: 'SLA',
  playbook: 'Agency Playbook',
  service_order: 'Service Order',
  other: 'Document',
}

interface OrderForm {
  id: string
  products: string[]
  pricing_zar: number
  billing_interval: string
  scope: string | null
  start_date: string | null
  notes: string | null
  status: 'sent' | 'signed'
  sent_at: string
  signed_at: string | null
  signed_by_name: string | null
}

interface TermsDoc {
  id: string
  name: string
  document_type: string
  version: string
  download_url: string | null
}

interface ClientDoc {
  id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  document_type: string
  uploaded_by: string
  created_at: string
  download_url: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(amount)
}

function OrderFormCard({ form, token, onSigned }: { form: OrderForm; token: string; onSigned: () => void }) {
  const [showTerms, setShowTerms] = useState(false)
  const [terms, setTerms] = useState<TermsDoc[]>([])
  const [loadingTerms, setLoadingTerms] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function loadTerms() {
    if (terms.length > 0) { setShowTerms((v) => !v); return }
    setShowTerms(true)
    setLoadingTerms(true)
    try {
      const res = await api.get<{ data: TermsDoc[] }>('/order-forms/terms', token)
      setTerms(res.data ?? [])
    } catch { /* ignore */ }
    setLoadingTerms(false)
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    if (!signerName.trim()) { setError('Please enter your full name to sign.'); return }
    if (!confirmed) { setError('Please confirm you have read and agree to the terms.'); return }
    setSigning(true)
    setError('')
    try {
      await api.post(`/order-forms/${form.id}/sign`, { signed_by_name: signerName.trim() }, token)
      onSigned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed. Please try again.')
    } finally {
      setSigning(false)
    }
  }

  const isSigned = form.status === 'signed'

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-3 ${isSigned ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
        {isSigned
          ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          : <PenLine className="w-5 h-5 text-amber-600 shrink-0" />
        }
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">KIND Order Form</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isSigned
              ? `Signed by ${form.signed_by_name} on ${new Date(form.signed_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : `Sent ${new Date(form.sent_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} · Awaiting your signature`
            }
          </p>
        </div>
        {isSigned
          ? <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">Signed</span>
          : <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">Signature required</span>
        }
      </div>

      {/* Order details */}
      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Products</p>
            <ul className="space-y-0.5">
              {form.products.map((p) => (
                <li key={p} className="text-sm text-gray-800 font-medium">{PRODUCT_LABELS[p] ?? p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Investment</p>
            <p className="text-sm text-gray-800 font-medium">
              {formatCurrency(form.pricing_zar)} / {form.billing_interval}
            </p>
          </div>
          {form.start_date && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Start date</p>
              <p className="text-sm text-gray-800">
                {new Date(form.start_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
          {form.scope && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Scope</p>
              <p className="text-sm text-gray-700 leading-relaxed">{form.scope}</p>
            </div>
          )}
        </div>

        {/* Legal notice */}
        <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500 leading-relaxed">
          By signing this Order Form, you confirm you have read and agree to KIND&apos;s Master Services Agreement, POPIA Compliant Process, and all applicable service exhibits — all incorporated herein by reference and available to view below.
        </div>

        {/* T&C viewer toggle */}
        <button
          type="button"
          onClick={loadTerms}
          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          {showTerms ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showTerms ? 'Hide' : 'View'} Terms &amp; Conditions
        </button>

        {showTerms && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {loadingTerms ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              </div>
            ) : terms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Terms documents not yet uploaded.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {terms.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <File className="w-4 h-4 text-brand-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400">{TERMS_TYPE_LABELS[t.document_type] ?? t.document_type} · v{t.version}</p>
                    </div>
                    {t.download_url && (
                      <a
                        href={t.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        View PDF
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Signing form */}
        {!isSigned && (
          <form onSubmit={handleSign} className="border-t border-gray-100 pt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Type your full legal name to sign"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-brand-500"
              />
              <span className="text-sm text-gray-600">
                I confirm I have read, understood, and agree to the Order Form and the incorporated Terms &amp; Conditions. I understand this constitutes a legally binding electronic signature under ECTA 25 of 2002.
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={signing}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-3 transition-colors"
            >
              {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
              {signing ? 'Signing…' : 'Sign Order Form'}
            </button>
          </form>
        )}

        {isSigned && (
          <div className="border-t border-gray-100 pt-4 flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Signed by <span className="font-medium ml-1">{form.signed_by_name}</span>&nbsp;on {new Date(form.signed_at!).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

export function DocumentsClient({ token }: { token: string }) {
  const [orderForm, setOrderForm] = useState<OrderForm | null | undefined>(undefined)
  const [docs, setDocs] = useState<ClientDoc[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    try {
      const [formRes, docsRes] = await Promise.allSettled([
        api.get<{ data: OrderForm | null }>('/order-forms/my', token),
        api.get<{ data: ClientDoc[] }>('/documents', token),
      ])
      if (formRes.status === 'fulfilled') setOrderForm(formRes.value.data)
      else setOrderForm(null)
      if (docsRes.status === 'fulfilled') setDocs(docsRes.value.data ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {orderForm ? (
        <OrderFormCard form={orderForm} token={token} onSigned={fetchAll} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No Order Form yet</p>
          <p className="text-xs text-gray-400 mt-1">Your K.I.N.D team will send your Order Form shortly.</p>
        </div>
      )}

      {docs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Other Documents</h2>
          </div>
          <ul className="divide-y divide-gray-50">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DOC_TYPE_LABELS[doc.document_type] ?? 'Document'}
                    {doc.file_size ? ` · ${formatBytes(doc.file_size)}` : ''}
                    {` · ${new Date(doc.created_at).toLocaleDateString('en-ZA')}`}
                    {doc.uploaded_by === 'admin' ? ' · From K.I.N.D' : ''}
                  </p>
                </div>
                {doc.download_url && (
                  <a
                    href={doc.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
