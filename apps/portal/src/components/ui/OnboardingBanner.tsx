'use client'

import { FileText, CreditCard, Clock, AlertTriangle } from 'lucide-react'

interface Props {
  hasSignedForm: boolean
  hasPendingForm: boolean
  isTrialing: boolean
  isActive: boolean
  trialDaysLeft: number
}

export function OnboardingBanner({
  hasSignedForm,
  hasPendingForm,
  isTrialing,
  isActive,
  trialDaysLeft,
}: Props) {
  // Gate 1: No order form sent yet
  if (!hasSignedForm && !hasPendingForm) {
    return (
      <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">Your agreement is being prepared</p>
          <p className="text-amber-700 text-sm mt-0.5">
            Your K.I.N.D team will send your Order Form shortly. You'll be able to sign and activate your products once it arrives.
          </p>
        </div>
      </div>
    )
  }

  // Gate 1: Order form sent but not signed
  if (!hasSignedForm && hasPendingForm) {
    return (
      <div className="flex items-start gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <FileText className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-900 text-sm">Action required: Sign your Order Form</p>
          <p className="text-red-700 text-sm mt-0.5">
            Your Order Form is ready. Please sign it to unlock your products and start your service.
          </p>
        </div>
        <a
          href="/dashboard/documents"
          className="shrink-0 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Sign now
        </a>
      </div>
    )
  }

  // Gate 2: Signed but no active/trial subscription
  if (hasSignedForm && !isTrialing && !isActive) {
    return (
      <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <CreditCard className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm">Complete payment to activate your products</p>
          <p className="text-amber-700 text-sm mt-0.5">
            Your agreement is signed. Add a payment method to activate your AI products.
          </p>
        </div>
        <a
          href="/dashboard/billing"
          className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Pay now
        </a>
      </div>
    )
  }

  // Gate 3: Trial active — soft nudge
  if (isTrialing) {
    const urgent = trialDaysLeft <= 3
    return (
      <div className={`flex items-start gap-4 rounded-xl px-5 py-4 border ${
        urgent
          ? 'bg-red-50 border-red-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${urgent ? 'text-red-500' : 'text-blue-500'}`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${urgent ? 'text-red-900' : 'text-blue-900'}`}>
            {trialDaysLeft > 0
              ? `Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`
              : 'Your trial has ended'}
          </p>
          <p className={`text-sm mt-0.5 ${urgent ? 'text-red-700' : 'text-blue-700'}`}>
            Upgrade to keep full access to your AI products and lead generation.
          </p>
        </div>
        <a
          href="/dashboard/billing"
          className={`shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-colors text-white ${
            urgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          Upgrade
        </a>
      </div>
    )
  }

  return null
}
