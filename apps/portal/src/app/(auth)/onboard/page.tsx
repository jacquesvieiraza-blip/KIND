'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { SUPPORTED_COUNTRIES } from '@kind/shared'
import { Loader2, X } from 'lucide-react'

interface ICPSuggestions {
  industries?: string[]
  job_titles?: string[]
  seniority_levels?: string[]
  geographies?: string[]
  keywords?: string[]
}

function OnboardForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referredBy = searchParams.get('ref') || (typeof window !== 'undefined' ? localStorage.getItem('kind_referral') || undefined : undefined)
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ company_name: '', industry: '', country: 'South Africa', website: '', phone: '' })

  const [prefilling, setPrefilling] = useState(false)
  const [prefillError, setPrefillError] = useState('')
  const [icpSuggestions, setIcpSuggestions] = useState<ICPSuggestions | null>(null)

  async function handlePrefill() {
    if (!form.website) return
    setPrefilling(true)
    setPrefillError('')
    setIcpSuggestions(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await api.post<{ data: ICPSuggestions }>('/icps/prefill', { website_url: form.website }, token)
      const suggestions = res.data
      setIcpSuggestions(suggestions)
      localStorage.setItem('kind_icp_prefill', JSON.stringify(suggestions))
    } catch {
      setPrefillError("Couldn't read website — you can set up your ICP manually")
    }
    setPrefilling(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    try {
      await api.post('/auth/onboard', { ...form, ...(referredBy ? { referred_by: referredBy } : {}) }, session.access_token)
      localStorage.removeItem('kind_referral')
      router.push('/dashboard')
    } catch (err) { setError(err instanceof Error ? err.message : 'Onboarding failed') }
    setLoading(false)
  }

  const suggestionTags = icpSuggestions
    ? Object.entries(icpSuggestions).flatMap(([, vals]) => Array.isArray(vals) ? vals : [])
    : []

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-900">K.I.N.D</h1>
          <p className="text-gray-500 mt-1">Let's set up your business profile</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold mb-6">Tell us about your business</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input type="text" required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Financial Services, Real Estate..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="+27 ..." />
              </div>
            </div>

            {form.website && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handlePrefill}
                  disabled={prefilling}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60"
                >
                  {prefilling ? <Loader2 className="w-3 h-3 animate-spin" /> : '✨'}
                  {prefilling ? 'Analysing website…' : 'Pre-fill ICP from website'}
                </button>

                {prefillError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-1">
                    <p className="text-xs font-medium text-amber-800">We couldn't read your website automatically — this is common for sites with security protection.</p>
                    <p className="text-xs text-amber-700">No problem — skip to your free trial below and set up your ICP manually from the dashboard. It only takes 2 minutes.</p>
                  </div>
                )}

                {icpSuggestions && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-3 space-y-2">
                    <p className="text-xs font-medium text-green-800">
                      ICP suggestions ready — we'll apply them when you set up your first ICP
                    </p>
                    {suggestionTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestionTags.map((tag) => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex flex-col gap-2">
              <button type="submit" disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-60">
                {loading ? 'Setting up...' : 'Start free trial →'}
              </button>
              <button type="button" disabled={loading}
                onClick={async (e) => {
                  e.preventDefault()
                  setLoading(true)
                  setError('')
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) { router.push('/login'); return }
                  try {
                    await api.post('/auth/onboard', { ...form, ...(referredBy ? { referred_by: referredBy } : {}) }, session.access_token)
                    localStorage.removeItem('kind_referral')
                    router.push('/dashboard/billing?source=direct_pay')
                  } catch (err) { setError(err instanceof Error ? err.message : 'Onboarding failed') }
                  setLoading(false)
                }}
                className="w-full bg-white hover:bg-gray-50 text-brand-600 font-medium rounded-lg px-4 py-2.5 text-sm transition-colors border border-brand-200 disabled:opacity-60">
                {loading ? 'Setting up...' : 'Pay now — skip trial →'}
              </button>
              <p className="text-xs text-gray-400 text-center">Free trial: full access, no credit card needed</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50" />}>
      <OnboardForm />
    </Suspense>
  )
}
