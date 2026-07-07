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
        const base = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
        const res = await fetch(`${base}/clients/me`, {
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
          const refRes = await fetch(`${base}/clients/referrals`, {
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
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refer a business, earn FIGSY credits</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">
          Share your unique link. When a business you refer makes their first purchase, you get 15 FIGSY credits.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-6">
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
              title: 'They sign up and buy',
              description: 'Your referred business signs up using your link, starts their free trial, and makes their first purchase.',
            },
            {
              step: '3',
              title: 'You get 15 FIGSY credits',
              description: 'The moment your referral makes their first purchase, 15 FIGSY credits are added to your account automatically.',
            },
          ].map((item, i) => (
            <div key={item.step} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#F5F0FF] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-bold text-[#6D28D9]">{item.step}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                <p className="text-sm text-[#7B6FA0] mt-0.5">{item.description}</p>
              </div>
              {i < 2 && (
                <ArrowRight className="w-4 h-4 text-gray-300 mt-1 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Referral link */}
      <div className="bg-gradient-to-r from-[#1A0F47] to-[#0F0929] rounded-xl p-6 text-white">
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
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white text-[#0F0929] text-xs font-semibold hover:bg-white/90 transition-colors shrink-0"
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
          <Users className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold text-gray-900">Your referrals</h2>
          {referrals.length > 0 && (
            <span className="ml-auto text-xs text-[#9B8EC4]">{referrals.length} total</span>
          )}
        </div>

        {referrals.length > 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#9B8EC4] uppercase tracking-wide">Business</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#9B8EC4] uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[#9B8EC4] uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r, i) => (
                  <tr key={r.id} className={i < referrals.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{r.company_name}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                        ${r.status === 'paying'  ? 'bg-green-50 text-green-700' : ''}
                        ${r.status === 'trial'   ? 'bg-[#F5F0FF] text-[#6D28D9]'  : ''}
                        ${r.status === 'churned' ? 'bg-gray-100 text-[#7B6FA0]' : ''}
                      `}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#9B8EC4] text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-purple-100/80 p-10 text-center">
            <Gift className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#7B6FA0]">No referrals yet</p>
            <p className="text-xs text-[#9B8EC4] mt-1">Share your link above to start earning credits.</p>
          </div>
        )}
      </div>
    </div>
  )
}
