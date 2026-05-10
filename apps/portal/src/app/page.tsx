import Link from 'next/link'
import { ArrowRight, Check, X, Zap } from 'lucide-react'

export default function Home() {

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans antialiased">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0066FF]" />
            <span className="font-bold text-white tracking-tight">K.I.N.D</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#services" className="hover:text-white transition-colors">Services</a>
            <a href="#process" className="hover:text-white transition-colors">Process</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <Link href="/login" className="text-sm text-[#0066FF] hover:text-blue-400 transition-colors font-medium flex items-center gap-1">
            Dashboard <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#0066FF] uppercase mb-8">
          AI Consulting · South Africa
        </p>
        <h1 className="text-[clamp(3.5rem,10vw,8rem)] font-black leading-[0.9] tracking-tight mb-8">
          <span className="block" style={{ background: 'linear-gradient(180deg, #ffffff 40%, #555555 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Intelligence,
          </span>
          <span className="block" style={{ background: 'linear-gradient(180deg, #cccccc 0%, #333333 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Engineered.
          </span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto leading-relaxed mb-10">
          One platform. Every AI product your business needs. Log in once and access all your K.I.N.D modules — Lead Generation, Chatbot, Voice Agent, Virtual Assistant — in a single, unified workspace.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/login"
            className="bg-[#0066FF] hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors"
          >
            Book a Free Call
          </Link>
          <a
            href="#services"
            className="border border-white/20 hover:border-white/40 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors"
          >
            View Services
          </a>
        </div>

        {/* Stats strip */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { value: '5+', label: 'AI Products' },
            { value: '24/7', label: 'Always-on AI' },
            { value: '< 2wk', label: 'Time to pilot' },
            { value: '100%', label: 'In-house stack' },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="text-4xl font-bold text-white mb-1">{value}</p>
              <p className="text-sm text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ────────────────────────────────────────────────────── */}
      <section id="services" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[#0066FF] uppercase mb-3">Services</p>
              <h2 className="text-5xl font-black leading-tight">
                Five AI Products.<br />
                <span className="text-white/50">One Platform.</span>
              </h2>
            </div>
            <p className="text-white/40 max-w-sm text-sm leading-relaxed">
              Every K.I.N.D product is built to integrate, scale, and compound — each one amplifying the others. Start with one, grow into all.
            </p>
          </div>

          <div className="space-y-4">

            {/* 01 — Lead Generation */}
            <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-8 md:p-12 grid md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-6">01 — Lead Generation</p>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-[#0066FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
                </div>
                <h3 className="text-3xl font-bold mb-3">AI Lead<br />Generation</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  Precision-targeted B2B lead sourcing, AI scoring, and POPIA-compliant consent management — delivered CRM-ready with full funnel analytics.
                </p>
                <ul className="space-y-2 mb-8">
                  {['AI Sourcing & Scoring', 'POPIA/GDPR Consent', 'Human Verification', 'CRM-Ready Delivery', 'Funnel Analytics', 'ICP Recalibration'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/products/lead-gen" className="text-[#0066FF] text-sm font-medium hover:text-blue-400 transition-colors flex items-center gap-1">
                  Learn more <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Mock widget */}
              <div className="bg-[#0a0f15] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-xs tracking-widest text-white/30 uppercase">Lead Pipeline</p>
                  <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />LIVE</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[{ v: '390', l: 'Leads', c: 'text-white' }, { v: '81.9%', l: 'Qual Rate', c: 'text-green-400' }, { v: '20.0%', l: 'Conv Rate', c: 'text-[#0066FF]' }].map(({ v, l, c }) => (
                    <div key={l} className="bg-[#111827] rounded-xl p-3">
                      <p className={`text-xl font-bold ${c}`}>{v}</p>
                      <p className="text-xs text-white/30 mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs tracking-widest text-white/20 uppercase mb-3">Funnel</p>
                <div className="space-y-3">
                  {[
                    { label: 'Generated', count: 390, pct: 100, color: 'bg-purple-500' },
                    { label: 'Consent Sent', count: 281, pct: 72, color: 'bg-blue-400' },
                    { label: 'Opted In', count: 187, pct: 48, color: 'bg-green-400' },
                    { label: 'Won', count: 51, pct: 13, color: 'bg-blue-500' },
                  ].map(({ label, count, pct, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-xs text-white/40 w-24 shrink-0">{label}</p>
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-white/40 w-8 text-right">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 02 + 03 — VA and Chatbot */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* VA */}
              <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-8">
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-6">02 — Virtual Assistant</p>
                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-3xl font-bold mb-3">Virtual<br />Assistant</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  A trained AI assistant that handles scheduling, research, email drafting, and internal knowledge queries — freeing your team for high-value work.
                </p>
                <ul className="space-y-2 mb-6">
                  {['Email Drafting & Scheduling', 'Research on Demand', 'Knowledge Base Queries', 'Calendar Management'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/products/virtual-assistant" className="text-green-400 text-sm font-medium hover:text-green-300 transition-colors flex items-center gap-1">
                  Join waitlist <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Chatbot */}
              <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-8">
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-6">03 — Chatbot Agents</p>
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-3xl font-bold mb-3">AI Chatbot<br />Agents</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  Intelligent conversational agents embedded in your website — qualifying buyers, booking appointments, and closing deals without human intervention.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {[{ v: '3.4×', l: 'Avg. lead conversion lift' }, { v: '87%', l: 'Resolved without human' }, { v: '< 1s', l: 'Avg. response time' }, { v: '24/7', l: 'Always-on availability' }].map(({ v, l }) => (
                    <div key={l} className="bg-orange-500/10 rounded-xl p-3">
                      <p className="text-orange-400 font-bold text-lg">{v}</p>
                      <p className="text-white/40 text-xs mt-0.5 leading-snug">{l}</p>
                    </div>
                  ))}
                </div>
                <Link href="/products/chatbot" className="text-orange-400 text-sm font-medium hover:text-orange-300 transition-colors flex items-center gap-1">
                  Join waitlist <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* 04 + 05 — Voice Agent and Consulting */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Voice Agent */}
              <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-8">
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-6">04 — Voice Agent</p>
                <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </div>
                <h3 className="text-3xl font-bold mb-3">Voice Agent</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  Human-sounding voice AI that handles inbound calls, books appointments, and manages customer queries — at any scale, without hold times.
                </p>
                <ul className="space-y-2 mb-8">
                  {['Natural Voice Conversations', 'Inbound Support', 'Outbound Sales Calling', 'Appointment Booking'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/products/voice-agent" className="text-purple-400 text-sm font-medium hover:text-purple-300 transition-colors flex items-center gap-1">
                  Join waitlist <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Consulting */}
              <div className="rounded-2xl bg-[#0d1117] border border-white/5 p-8">
                <p className="text-xs tracking-[0.15em] text-white/30 uppercase mb-6">05 — Monthly Retainer</p>
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-3xl font-bold mb-3">Monthly Consulting<br />Retainer</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">
                  Ongoing senior-level AI strategy and implementation support. Your dedicated K.I.N.D consultant keeps your systems sharp, your roadmap current, and your team ahead of the curve.
                </p>
                <ul className="space-y-2 mb-6">
                  {['Dedicated Senior Consultant', 'Monthly Strategy Session', 'Continuous Optimisation', 'Direct Access', 'Quarterly AI Briefing'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  {[{ tier: 'Foundation', hours: '4 hrs / month', popular: false }, { tier: 'Growth', hours: '8 hrs / month', popular: true }, { tier: 'Partner', hours: '16 hrs / month', popular: false }].map(({ tier, hours, popular }) => (
                    <div key={tier} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${popular ? 'bg-white/5 border-white/10' : 'border-white/5'}`}>
                      <div>
                        <p className="text-sm font-medium text-white">{tier}</p>
                        <p className="text-xs text-white/30">{hours}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {popular && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">Most Chosen</span>}
                        <Link href="/products/consulting" className="text-xs border border-white/20 hover:border-white/40 text-white/60 hover:text-white px-3 py-1.5 rounded-lg transition-colors">
                          Learn more
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#0066FF] uppercase mb-3">Plans & Pricing</p>
            <h2 className="text-4xl font-black">Lead Generation Plans</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4 max-w-5xl">
            {[
              {
                tier: 'Starter',
                price: 'R513',
                usd: '~$27/month',
                leads: '20 leads / month',
                popular: false,
                min: '3-month minimum',
                cta: 'Get Started',
                features: [
                  { text: '1 buyer profile', included: true },
                  { text: '1 geographic region', included: true },
                  { text: 'AI sourcing & scoring', included: true },
                  { text: 'Human verification', included: true },
                  { text: 'CRM-ready delivery', included: true },
                  { text: 'Intelligence brief per lead', included: true },
                  { text: 'Monthly pipeline report', included: true },
                  { text: 'ICP recalibration', included: false },
                  { text: 'Account manager', included: false },
                ],
              },
              {
                tier: 'Advanced',
                price: 'R2,052',
                usd: '~$108/month',
                leads: '40 leads / month',
                popular: true,
                min: '3-month minimum',
                cta: 'Get Started',
                features: [
                  { text: '3 buyer profiles', included: true },
                  { text: 'Up to 3 regions', included: true },
                  { text: 'AI sourcing & scoring', included: true },
                  { text: 'Human verification', included: true },
                  { text: 'CRM-ready delivery', included: true },
                  { text: 'Intelligence brief per lead', included: true },
                  { text: 'Monthly pipeline report', included: true },
                  { text: 'Monthly ICP recalibration', included: true },
                  { text: 'Dedicated account manager', included: true },
                ],
              },
              {
                tier: 'Enterprise',
                price: 'R3,800',
                usd: '~$200/month',
                leads: '100 leads / month',
                popular: false,
                min: '6-month minimum',
                cta: 'Get Started',
                features: [
                  { text: 'Unlimited buyer profiles', included: true },
                  { text: 'Unlimited regions', included: true },
                  { text: 'AI sourcing & scoring', included: true },
                  { text: 'Human verification', included: true },
                  { text: 'CRM-ready delivery', included: true },
                  { text: 'Intelligence brief per lead', included: true },
                  { text: 'Monthly pipeline report', included: true },
                  { text: 'Monthly ICP recalibration', included: true },
                  { text: 'Dedicated account manager', included: true },
                ],
              },
            ].map((plan) => (
              <div
                key={plan.tier}
                className={`rounded-2xl p-7 flex flex-col border ${plan.popular ? 'bg-[#0d1a2d] border-[#0066FF]/40' : 'bg-[#0d1117] border-white/5'}`}
              >
                {plan.popular && (
                  <div className="mb-4">
                    <span className="text-xs font-semibold bg-[#0066FF] text-white px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{plan.tier}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-[#0066FF]">{plan.price}</span>
                  <span className="text-white/30 text-sm">/mo</span>
                </div>
                <p className="text-white/30 text-xs mb-1">{plan.usd}</p>
                <p className="text-white/50 text-sm font-medium mb-6">{plan.leads}</p>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(({ text, included }) => (
                    <li key={text} className={`flex items-center gap-2 text-sm ${included ? 'text-white/60' : 'text-white/20'}`}>
                      {included
                        ? <Check className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                        : <X className="w-3.5 h-3.5 shrink-0" />}
                      {text}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-white/20 mb-4">{plan.min}</p>
                <Link
                  href="/login"
                  className={`text-center text-sm font-semibold py-3.5 rounded-xl transition-colors ${plan.popular ? 'bg-[#0066FF] hover:bg-blue-500 text-white' : 'bg-white/5 hover:bg-white/10 text-white'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ─────────────────────────────────────────────────────── */}
      <section id="process" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#0066FF] uppercase mb-3">Process</p>
            <h2 className="text-4xl font-black">From setup to pipeline<br /><span className="text-white/40">in under two weeks.</span></h2>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { n: '01', title: 'ICP Definition', desc: 'We work with you to define your ideal customer profile — industries, titles, company sizes, and locations.' },
              { n: '02', title: 'AI Sourcing', desc: 'Our engine sources and scores matching contacts across African markets in real time.' },
              { n: '03', title: 'POPIA Consent', desc: 'Consent requests go out automatically. Every event is tracked and logged for full compliance.' },
              { n: '04', title: 'CRM Delivery', desc: 'Verified, consented leads arrive in your inbox or CRM — ready to work.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="border border-white/5 rounded-2xl p-6">
                <p className="text-4xl font-black text-white/10 mb-4">{n}</p>
                <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section id="contact" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#0066FF] uppercase mb-6">Get Started</p>
          <h2 className="text-5xl font-black mb-6">
            Ready to build your<br />
            <span className="text-white/40">African pipeline?</span>
          </h2>
          <p className="text-white/40 mb-10 text-lg">
            Join businesses across South Africa, Nigeria, Kenya, and beyond using K.I.N.D to grow faster with AI.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="bg-[#0066FF] hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-full text-sm transition-colors"
            >
              Start your free trial
            </Link>
            <p className="text-white/30 text-sm">14 days free · No credit card required</p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0066FF]" />
            <span className="font-bold text-white text-sm tracking-tight">K.I.N.D</span>
            <span className="text-white/20 text-xs ml-1">AI Intelligence Platform</span>
          </div>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} K.I.N.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
