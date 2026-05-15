'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Copy, Check, Users, ArrowRight, Loader2 } from 'lucide-react'

interface Referral {
  id: string
  company_name: string
  status: string
  created_at: string
}

export default function ReferralPage() {
  const supabase = createClient()

  const [loading, setLoading]       = useState(true)
  const [clientId, setClientId]     = useState<string | null>(null)
  const [referrals, setReferrals]   = useState<Referral[]>([])
  const [copied, setCopied]         = useState(false)
  const [referralUrl, setReferralUrl] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

      try {
        // Fetch client id
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const json = await res.json()
          const id: string = json.data?.id
          if (id) {
            setClientId(id)
            setReferralUrl(`${window.location.origin}?ref=${id}`)
          }
        }

        // Try to fetch referrals — endpoint may not exist yet
        try {
          const refRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clients/referrals`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })
          if (refRes.ok) {
            const refJson = await refRes.json()
            setReferrals(refJson.data ?? [])
          }
        } catch {
          // endpoint not yet implemented — show placeholder
        }
      } catch { }

      setLoading(false)
    }
    load()
  }, [])

  async function handleCopy() {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refer a business, earn free credits</h1>
        <p className="text-gray-500 text-sm mt-1">
          Share your unique link. When a business signs up and pays their first invoice, you both get 100 free credits.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-5">How it works</h2>
        <div className="space-y-4">
          {[
            {
              step: '1',
              title: 'Share your link',
              description: 'Copy your unique referral link below and share it with businesses that could benefit from K.I.N.D.',
            },
            {
              step: '2',
              title: 'They sign up',
              description: 'Your referred business signs up using your link and starts their free trial.',
            },
            {
              step: '3',
              title: 'Both get 100 free credits',
              description: 'Once they make their first payment, you each automatically receive 100 credits — worth $100 in leads.',
            },
          ].map((item, i) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-brand-600">{item.step}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
              </div>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Your referral link</p>
            <p className="text-white/60 text-xs">Share this link to earn credits for every successful referral</p>
          </div>
        </div>

        {clientId ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/10 rounded-lg px-3 py-2.5 text-xs text-white/80 font-mono truncate">
              {referralUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#001f4d] text-xs font-semibold hover:bg-white/90 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        ) : (
          <p className="text-white/60 text-sm">Loading your referral link...</p>
        )}
      </div>

      {/* Referrals table */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Your referrals</h2>
          {referrals.length > 0 && (
            <span className="ml-auto text-xs text-gray-400">{referrals.length} total</span>
          )}
        </div>

        {referrals.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r.id} className={i < referrals.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{r.company_name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                        ${r.status === 'paying'  ? 'bg-green-50 text-green-700' : ''}
                        ${r.status === 'trial'   ? 'bg-blue-50 text-blue-700'  : ''}
                        ${r.status === 'churned' ? 'bg-gray-100 text-gray-500' : ''}
                      `}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <Gift className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No referrals yet</p>
            <p className="text-xs text-gray-400 mt-1">Share your link above to start earning credits.</p>
          </div>
        )}
      </div>
    </div>
  )
}
