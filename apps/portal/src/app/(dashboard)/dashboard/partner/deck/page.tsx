'use client'

import Link from 'next/link'
import {
  ArrowLeft, Zap, Target, TrendingUp, DollarSign, Users,
  CheckCircle, X, ArrowRight, Bot, MessageSquare, Brain,
} from 'lucide-react'

function Slide({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-[#7C3AED]/5 border-b border-purple-100 flex items-center gap-3">
        <span className="text-xs font-bold text-[#7C3AED]/40 uppercase tracking-widest">Slide {number}</span>
        <h2 className="font-semibold text-[#1E1152] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function PartnerDeckPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <Link
        href="/dashboard/partner"
        className="inline-flex items-center gap-1.5 text-sm text-[#7C3AED]/60 hover:text-[#7C3AED] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Partner Hub
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1152]">Partner Value Deck</h1>
          <p className="text-sm text-[#7C3AED]/60 mt-1">Use these slides when pitching K.I.N.D to prospects</p>
        </div>
        <span className="text-xs bg-purple-100 text-[#7C3AED] font-semibold px-3 py-1.5 rounded-full">
          Walk prospects through slide by slide
        </span>
      </div>

      {/* Slide 1: Hook */}
      <Slide number={1} title="The Hook — Open With This">
        <div className="text-center py-4 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto">
            <Zap className="w-7 h-7 text-[#7C3AED]" />
          </div>
          <h3 className="text-2xl font-bold text-[#1E1152]">
            "Your sales team is spending 60% of their time on prospecting.<br />
            <span className="text-[#7C3AED]">K.I.N.D automates that entirely.</span>"
          </h3>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Every minute your team spends finding and cold-emailing prospects is a minute not spent on closing.
            K.I.N.D gives you back that time.
          </p>
        </div>
      </Slide>

      {/* Slide 2: The Problem */}
      <Slide number={2} title="The Problem — What They're Living With">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Users,
              color: 'text-red-500',
              bg: 'bg-red-50',
              title: 'Hiring is expensive',
              desc: 'A junior SDR costs R35,000–R55,000/month in salary alone. Add tools, management, and ramp time and you\'re at R80,000+ before a single deal.',
            },
            {
              icon: Target,
              color: 'text-amber-500',
              bg: 'bg-amber-50',
              title: 'Tools don\'t do the work',
              desc: 'Apollo, Outreach, Salesloft — they\'re databases and inboxes. Someone still needs to write every email, build every list, and follow up every reply.',
            },
            {
              icon: TrendingUp,
              color: 'text-orange-500',
              bg: 'bg-orange-50',
              title: 'Manual outreach doesn\'t scale',
              desc: 'One salesperson can cold-call 50 prospects a day at 3% connect rate. K.I.N.D runs 500 personalised email sequences simultaneously.',
            },
          ].map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className={`${bg} rounded-xl p-4 space-y-2`}>
              <Icon className={`w-5 h-5 ${color}`} />
              <p className="font-semibold text-gray-800 text-sm">{title}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </Slide>

      {/* Slide 3: The Solution */}
      <Slide number={3} title="The Solution — What K.I.N.D Is">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">K.I.N.D is an AI sales platform with three purpose-built agents:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: Bot,
                name: 'FIGSY',
                subtitle: 'AI SDR · Outbound Sales',
                color: 'text-[#7C3AED]',
                bg: 'bg-[#7C3AED]/10',
                points: [
                  'Builds your prospect list automatically',
                  'Writes personalised multi-step sequences',
                  'Sends and follows up on autopilot',
                  'Flags hot replies for your team',
                ],
              },
              {
                icon: Brain,
                name: 'Milla',
                subtitle: 'Virtual Assistant · Operations',
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                points: [
                  'Answers questions from your knowledge base',
                  'Drafts documents and proposals',
                  'Manages internal workflows',
                  'Trained on your business, instantly',
                ],
              },
              {
                icon: MessageSquare,
                name: 'Vida',
                subtitle: 'Chatbot · Inbound Conversion',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                points: [
                  'Answers website visitors 24/7',
                  'Qualifies and routes inbound leads',
                  'Real answers — not scripts',
                  'Fully branded to your business',
                ],
              },
            ].map(({ icon: Icon, name, subtitle, color, bg, points }) => (
              <div key={name} className="border border-purple-100 rounded-xl p-4 space-y-2">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="font-bold text-[#1E1152] text-sm">{name}</p>
                  <p className="text-[11px] text-gray-400">{subtitle}</p>
                </div>
                <ul className="space-y-1">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* Slide 4: Pricing */}
      <Slide number={4} title="Pricing — What Clients Pay">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Credit-based pricing — clients only pay for what they use. No wasted spend.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: 'Starter', price: 'R 4,900', usd: '~$270', credits: '500 credits/mo', note: 'Great for solo founders' },
              { name: 'Growth', price: 'R 9,900', usd: '~$545', credits: '1,200 credits/mo', note: 'Most popular — small teams', highlight: true },
              { name: 'Scale', price: 'R 19,900', usd: '~$1,095', credits: '3,000 credits/mo', note: 'Agencies & larger teams' },
            ].map(({ name, price, usd, credits, note, highlight }) => (
              <div key={name} className={`rounded-xl p-4 border ${highlight ? 'border-[#7C3AED] bg-[#7C3AED]/5' : 'border-purple-100 bg-white'}`}>
                {highlight && <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider">Most popular</span>}
                <p className="font-bold text-[#1E1152] text-sm mt-1">{name}</p>
                <p className="text-2xl font-bold text-[#1E1152] mt-1">{price}<span className="text-xs font-normal text-gray-400 ml-1">/mo</span></p>
                <p className="text-xs text-gray-400">{usd}/mo USD</p>
                <p className="text-xs text-[#7C3AED] font-semibold mt-2">{credits}</p>
                <p className="text-xs text-gray-400 mt-0.5">{note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-2">
            1 credit = 1 personalised email sent. A full 3-email sequence costs 3 credits per lead.
            At Growth tier, that's 400 complete sequences per month.
          </p>
        </div>
      </Slide>

      {/* Slide 5: Compare */}
      <Slide number={5} title="Compare — K.I.N.D vs Alternatives">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Option</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Monthly cost</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Does the work?</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Scales?</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Setup time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {[
                { option: 'K.I.N.D (FIGSY)', cost: 'R 4,900–19,900', does: true, scales: true, setup: 'Under 1 day', highlight: true },
                { option: 'Hire an SDR', cost: 'R 35,000–55,000', does: true, scales: false, setup: '2–3 months' },
                { option: 'Apollo.io', cost: 'R 2,000–9,000', does: false, scales: true, setup: 'Database only' },
                { option: 'Outreach / Salesloft', cost: 'R 5,000–15,000', does: false, scales: true, setup: 'Weeks of setup' },
                { option: 'Manual prospecting', cost: '20+ hrs/week', does: true, scales: false, setup: 'Never ends' },
              ].map(({ option, cost, does, scales, setup, highlight }) => (
                <tr key={option} className={highlight ? 'bg-[#7C3AED]/5' : 'hover:bg-gray-50'}>
                  <td className={`py-2.5 px-3 font-semibold ${highlight ? 'text-[#7C3AED]' : 'text-gray-800'}`}>{option}</td>
                  <td className="py-2.5 px-3 text-gray-600 text-xs">{cost}</td>
                  <td className="py-2.5 px-3">
                    {does
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <X className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="py-2.5 px-3">
                    {scales
                      ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                      : <X className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500 text-xs">{setup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Slide>

      {/* Slide 6: Results */}
      <Slide number={6} title="Results — What Clients See">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { stat: '10×', label: 'More outreach per month vs manual', color: 'text-[#7C3AED]' },
            { stat: '3×', label: 'Higher reply rates than cold calling', color: 'text-emerald-600' },
            { stat: '72hrs', label: 'Time to first qualified responses', color: 'text-blue-600' },
            { stat: '24/7', label: 'FIGSY works nights and weekends', color: 'text-amber-600' },
          ].map(({ stat, label, color }) => (
            <div key={stat} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${color}`}>{stat}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Slide>

      {/* Slide 7: Next Step */}
      <Slide number={7} title="Next Step — How to Close This">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Three ways to move prospects forward:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                step: '1',
                title: 'Book a Live Demo',
                desc: 'Show them FIGSY finding real leads for their business, live. Nothing closes faster than seeing it work.',
                cta: 'Use your demo sandbox',
                color: 'border-[#7C3AED]',
                ctaColor: 'text-[#7C3AED]',
              },
              {
                step: '2',
                title: 'Start a Free Trial',
                desc: 'Send them your referral link and they get 14 days to try FIGSY on their own prospects. No commitment.',
                cta: 'Copy your referral link',
                color: 'border-blue-200',
                ctaColor: 'text-blue-600',
              },
              {
                step: '3',
                title: 'Register the Deal',
                desc: 'Even if they\'re not ready today — register them now for 60-day protection so you don\'t lose the commission.',
                cta: 'Register a deal now',
                color: 'border-emerald-200',
                ctaColor: 'text-emerald-600',
              },
            ].map(({ step, title, desc, cta, color, ctaColor }) => (
              <div key={step} className={`border-2 ${color} rounded-xl p-4 space-y-2`}>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Option {step}</span>
                <p className="font-semibold text-[#1E1152] text-sm">{title}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{desc}</p>
                <p className={`text-xs font-semibold ${ctaColor} flex items-center gap-1 mt-2`}>
                  <ArrowRight className="w-3 h-3" />
                  {cta}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-[#7C3AED] text-white rounded-xl px-5 py-4 flex items-center gap-4">
            <DollarSign className="w-8 h-8 text-white/50 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Your commission reminder</p>
              <p className="text-xs text-white/70 mt-0.5">
                Every client you close earns you 20–30% of their subscription recurring every month for as long as they stay.
                A single Growth client = R 1,980–R 2,970/month to you, forever.
              </p>
            </div>
          </div>
        </div>
      </Slide>
    </div>
  )
}
