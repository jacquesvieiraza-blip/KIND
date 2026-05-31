'use client'

import Link from 'next/link'
import {
  ArrowLeft, CheckCircle, Clock, Handshake, Mail, LogIn,
  ListChecks, Monitor, Briefcase, Users, DollarSign, Shield,
} from 'lucide-react'

const STEPS = [
  {
    step: 1,
    icon: Handshake,
    color: 'text-[#7C3AED]',
    bg: 'bg-[#7C3AED]/10',
    title: 'Submit Application',
    desc: 'Fill out the partner application form on get-kind.com/partners.html. Takes 5 minutes.',
    detail: 'You\'ll need: name, company, country, partner type (Referral / Agency / White-label), and how you plan to bring clients.',
  },
  {
    step: 2,
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    title: 'K.I.N.D Reviews (24–48 hrs)',
    desc: 'The K.I.N.D team reviews your application and sends an approval decision.',
    detail: 'We approve most applications within 1–2 business days. Your profile is reviewed to confirm the right fit.',
  },
  {
    step: 3,
    icon: Mail,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Approval Email Sent',
    desc: 'You receive an email with your partner agreement, tier, commission rate, and portal login link.',
    detail: 'Commission rates: Referral 20% · Agency 25% · White-label 30%. All recurring — every month your client stays active.',
  },
  {
    step: 4,
    icon: LogIn,
    color: 'text-[#7C3AED]',
    bg: 'bg-[#7C3AED]/10',
    title: 'Log into Partner Portal',
    desc: 'Log into app.get-kind.com with the email on your application. Click Partner Hub in the sidebar.',
    detail: 'Important: use the same email you submitted on the application form — not a separate client account email.',
  },
  {
    step: 5,
    icon: ListChecks,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Complete Getting Started Checklist',
    desc: 'Copy your referral link and register your first deal for 60-day protection.',
    detail: 'Your referral link is get-kind.com?ref=YOUR_CODE. Anyone who signs up via your link is permanently tracked as your referral.',
  },
  {
    step: 6,
    icon: Monitor,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Demo Sandbox Provisioned',
    desc: 'A live K.I.N.D demo environment is set up so you can walk prospects through the product.',
    detail: 'Use the demo sandbox to show real leads, live campaigns, and the full FIGSY workflow — not slides. It makes the difference.',
  },
  {
    step: 7,
    icon: Briefcase,
    color: 'text-[#7C3AED]',
    bg: 'bg-[#7C3AED]/10',
    title: 'Register Your First Deal',
    desc: 'Register a prospect for 60-day exclusivity before they sign. Locks in your commission even before they pay.',
    detail: '60-day protection: if the prospect signs up within 60 days of registration, the commission is yours — even if they came via another channel.',
  },
  {
    step: 8,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Client Signs Up',
    desc: 'Client uses your referral link or you introduce them directly. They pay their first invoice.',
    detail: 'Both paths attribute the client to you permanently. Referral link is tracked automatically; direct introductions are registered via deal.',
  },
  {
    step: 9,
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Commission Earned — Every Month',
    desc: 'Commission is calculated automatically when the client pays. You earn recurring income for as long as they stay.',
    detail: 'Paid via Wise on the 1st of each month for the previous month\'s active clients. Track all earnings in your Partner Dashboard.',
  },
]

export default function PartnerOnboardingPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/dashboard/partner"
        className="inline-flex items-center gap-1.5 text-sm text-[#7C3AED]/60 hover:text-[#7C3AED] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Hub
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[#1E1152]">Partner Onboarding Guide</h1>
        <p className="text-sm text-[#7C3AED]/60 mt-1">Your complete journey from application to first commission</p>
      </div>

      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          const isLast = i === STEPS.length - 1
          return (
            <div key={step.step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-2xl ${step.bg} flex items-center justify-center shrink-0 ring-1 ring-purple-100 shadow-sm`}>
                  <Icon className={`w-5 h-5 ${step.color}`} />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-purple-100 my-1 min-h-[1.5rem]" />}
              </div>
              <div className={`flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
                  <span className="text-[10px] font-bold text-[#7C3AED]/40 uppercase tracking-widest">Step {step.step}</span>
                  <h3 className="font-semibold text-[#1E1152] text-sm mt-0.5">{step.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                  <p className="text-xs text-gray-400 mt-2 border-l-2 border-purple-100 pl-3">{step.detail}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-[#7C3AED] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-white/70" />
          <h2 className="font-semibold">The Rules That Protect You</h2>
        </div>
        <ul className="space-y-2.5 text-sm text-white/80">
          {([
            ['60-day deal protection', 'Register a prospect before they sign. If they sign within 60 days, commission is yours.'],
            ['Lifetime commissions', 'You earn every month the client stays active. No caps, no clawbacks, no expiry.'],
            ['Referral link tracks forever', 'Anyone who signs up via your link is permanently attributed to you.'],
            ['Paid monthly via Wise', 'On the 1st of each month for all clients who paid the previous month.'],
          ] as [string, string][]).map(([title, body]) => (
            <li key={title} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
              <span><strong className="text-white">{title}</strong> — {body}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
