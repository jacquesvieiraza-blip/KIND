'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { FileText, CheckCircle, Loader2, Shield, ExternalLink, Lock } from 'lucide-react'

interface Subscription {
  product: string
  tier: string
  status: string
  created_at: string
  amount_zar: number
}

const DOCS = [
  {
    title:       'Terms of Service',
    description: 'Governs your use of the K.I.N.D platform, service levels, and acceptable use.',
    url:         'https://get-kind.com/terms',
  },
  {
    title:       'Privacy Policy',
    description: 'How K.I.N.D collects, stores, and processes personal data under POPIA.',
    url:         'https://get-kind.com/privacy',
  },
  {
    title:       'Data Processing Agreement',
    description: 'POPIA-compliant DPA governing how K.I.N.D processes data on your behalf.',
    url:         'https://get-kind.com/dpa',
  },
]

function productLabel(product: string, tier: string) {
  const name = product.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const t    = tier.charAt(0).toUpperCase() + tier.slice(1)
  return `${name} — ${t}`
}

export default function DocumentsPage() {
  const supabase = createClient()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ data: { subscriptions: Subscription[] } }>('/clients/me', session.access_token)
        setSubscriptions((res.data as any).subscriptions ?? [])
      } catch { }
      setLoading(false)
    })
  }, [])

  const activeSub = subscriptions.find(s => s.status === 'active' || s.status === 'trialing')

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents & Agreements</h1>
        <p className="text-gray-500 text-sm mt-1">Your legal agreements with K.I.N.D.</p>
      </div>

      {/* Acceptance record */}
      {activeSub ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Agreement on record</p>
            <p className="text-green-700 text-sm mt-1 leading-relaxed">
              By completing your{' '}
              <strong>{productLabel(activeSub.product, activeSub.tier)}</strong>{' '}
              purchase on{' '}
              <strong>{new Date(activeSub.created_at).toLocaleDateString('en-ZA', { dateStyle: 'long' })}</strong>,
              you accepted K.I.N.D's Terms of Service, Privacy Policy, and Data Processing Agreement.
              This constitutes a legally binding electronic agreement under the Electronic Communications
              and Transactions Act (ECTA), No. 25 of 2002.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-blue-800">No purchase yet</p>
            <p className="text-blue-700 text-sm mt-1 leading-relaxed">
              Your acceptance of K.I.N.D's terms will be recorded automatically when you
              complete your first purchase on the Billing page. No manual signing required.
            </p>
          </div>
        </div>
      )}

      {/* Legal documents */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Legal documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">These documents govern your relationship with K.I.N.D.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {DOCS.map(doc => (
            <div key={doc.title} className="px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                </div>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#0066FF] hover:underline font-medium shrink-0">
                <ExternalLink className="w-3.5 h-3.5" />Read
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Legal note */}
      <div className="flex items-start gap-2 text-xs text-gray-400">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>
          Electronic acceptance via payment is legally equivalent to a handwritten signature under
          ECTA No. 25 of 2002. Your IP address and payment timestamp are recorded as proof of acceptance.
          Questions? Email{' '}
          <a href="mailto:hello@get-kind.com" className="text-[#0066FF] hover:underline">hello@get-kind.com</a>.
        </p>
      </div>
    </div>
  )
}
