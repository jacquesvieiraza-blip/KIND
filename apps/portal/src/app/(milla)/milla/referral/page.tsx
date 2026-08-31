'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// REFERRAL — MILLA-NATIVE FORK.
//
// ⚑ 31 Aug (BUILD-004A-2D, FOUNDER DECISION D2). This was a 13-line wrapper around the shared
// `(dashboard)` referral page. It is now a fork: the commercial truth had to change for a
// programme customer, and `/dashboard` is a LIVE, separately-routed portal that keeps its own.
//
// 🛑 THE FINDING, AND IT IS NOT THAT THE PAGE WAS LYING. Every reward sentence here was TRUE
// against the backend: `stripe.ts` really did credit $45 to the referrer's wallet on a referred
// client's first purchase, and $45 ÷ $4 really is "11 approved leads". The audit verified all
// of it. The defect was that `/milla/billing` — two rail items away — tells the same customer
// there is **no wallet, no pack and no per-lead price**. Both pages were truthful about
// different halves of a product mid-migration. **A customer cannot hold both**, and the one
// they were being sold on this page was the retired half.
//
// ⛓️ FOUNDER RULING: *"KEEP the Referral experience … MVP REFERRAL MODEL: HUMAN-HANDLED …
// no $45 promise, no wallet, no 11 approved leads, no $299 onboarding, no credits, no automatic
// monetary reward … Do not delete historical referral evidence. Do not invent a new reward
// scheme."*
//
// ⚠️ SO THE PAGE KEEPS ITS SHAPE AND LOSES ITS PRICE LIST. Header, the three numbered steps,
// the dark gradient link card, the copy button, the referrals table and the empty state are all
// still here, in the same markup. What is gone is every retired commercial figure — and
// nothing has replaced them with a new promise, because none was approved and none was needed.
//
// ⚠️ THE BACKEND MATCHES, WHICH IS THE HALF THAT ACTUALLY COSTS MONEY. `stripe.ts` no longer
// pays the automatic bonus at all: it raises the referral with the founder instead, on a NEW
// marker, so the refund claw-back cannot reclaim $45 that was never granted. A page that stops
// promising while the wallet keeps paying would have been the same defect wearing new copy.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gift, Copy, Check, Users, ArrowRight, Loader2 } from 'lucide-react'

interface Referral {
  id: string
  company_name: string
  status: string
  created_at: string
}

export default function MillaReferralPage() {
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
            // #479 — the ?ref code is only captured at /login and /onboard. Pointing the
            // share link at the bare origin dropped the ref → referrers were never credited.
            // Match ReferralBanner (/login?ref=) so the capture actually fires.
            setReferralUrl(`${window.location.origin}/login?ref=${id}`)
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
    <div className="h-full overflow-y-auto p-5 sm:p-6">
    <div className="space-y-8 max-w-2xl">
      {/* Header
          ⛓️ WAS: "Refer a business, earn $45" / "…we add $45 to your wallet."
          The amount and the wallet are both retired from this journey. What is left is what
          the page is actually for — introducing someone — with no figure attached. */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Refer a business</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">
          Share your unique link with a business that would get value from K.I.N.D. We handle every referral personally.
        </p>
      </div>

      {/* How it works — the three steps keep their structure, their numbering and their
          arrows. Only the commercial content of steps 2 and 3 changed. */}
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
              // ⛓️ WAS: "They sign up and buy … the $299 onboarding pack." The $299 pack is the
              // retired self-serve product; a programme customer's referral does not buy one.
              title: 'They start with Milla',
              description: 'Your referred business signs up using your link and starts their own programme.',
            },
            {
              step: '3',
              // ⛓️ WAS: "You get $45 in your wallet … that is 11 approved leads on us."
              // ⚠️ THIS SENTENCE DELIBERATELY PROMISES NOTHING. The founder's ruling was
              // "human-handled" and "do not invent a new reward scheme" — so it states what is
              // true (nothing lands on your account automatically, a person picks this up) and
              // stops. Writing "we'll reward you" here would have invented the scheme the
              // ruling forbids; writing nothing at all would have left the step blank.
              title: 'We take it from there',
              // ⚠️ "credited" WAS THE FIRST DRAFT AND ITS OWN GUARD CAUGHT IT. The sentence
              // was denying an automatic reward, but it still put the retired currency's word
              // in front of the customer — and "no credits" was the ruling, not "no credits
              // except when we are explaining that there aren't any".
              description: 'Referrals are handled personally, not automatically. Anything that follows a referral is agreed with you directly.',
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

      {/* Referral link — the card, the gradient, the gift tile and the copy button are
          untouched. Only its subtitle carried the $45. */}
      <div className="bg-gradient-to-r from-[#1A0F47] to-[#0F0929] rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Your referral link</p>
            <p className="text-white/60 text-xs">Share this link so we know the introduction came from you</p>
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

      {/* Referrals table — HISTORY, UNTOUCHED.
          ⚠️ THE STATUS PILL RENDERS THE SERVER'S OWN WORD AND IS NOT RE-LABELLED HERE. The
          founder's rule is that historical referral evidence is not deleted, and `trial` is
          part of that history: #607 retired the trial on 1 Aug, so no NEW referral can ever
          earn that status, but a row that did earn it is a record of something that happened.
          Renaming it in the client would make this page disagree with `/clients/referrals`,
          which the old portal still reads — two readings of one row. */}
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
          // ⛓️ WAS: "Share your link above to start earning credits." — which contradicted the
          // page's own headline two hundred pixels above it even before this slice, and named
          // a currency that has been retired since the wallet replaced it.
          <div className="bg-white rounded-xl border border-dashed border-purple-100/80 p-10 text-center">
            <Gift className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-[#7B6FA0]">No referrals yet</p>
            <p className="text-xs text-[#9B8EC4] mt-1">Share your link above to introduce a business to K.I.N.D.</p>
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
