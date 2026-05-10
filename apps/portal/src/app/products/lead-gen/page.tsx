import Link from 'next/link'
import { ArrowRight, Zap } from 'lucide-react'

const ACCENT = '#0066FF'

export default function LeadGenPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-sans antialiased">

      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0d0f14]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0066FF]" />
            <span className="font-bold text-sm tracking-tight">K.I.N.D</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold px-5 py-2 rounded-full text-white"
            style={{ backgroundColor: ACCENT }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
          AI Lead Generation · Africa
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] tracking-tight mb-6" style={{ color: '#ffffff' }}>
          Lead Gen
        </h1>
        <p className="text-2xl font-bold text-white/80 mb-4 max-w-2xl">
          Your pipeline, on autopilot. It doesn't just find leads — it <span className="underline decoration-[#0066FF]">delivers</span>.
        </p>
        <p className="text-white/40 max-w-lg text-sm leading-relaxed mb-10">
          AI-sourced, human-verified, POPIA-compliant B2B leads delivered directly to your CRM — scored, enriched, and ready to close.
        </p>
        <Link
          href="/login"
          className="flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-full text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          Start Your Pipeline <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-white/20 text-xs mt-4">From $27/mo · 14-day free trial · No credit card required</p>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 text-center mb-3">Architecture</p>
          <h2 className="text-4xl font-black text-center mb-16">How Lead Gen Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🎯', name: 'ICP Engine', role: 'THE BRIEF', desc: 'Define your ideal buyer. Industries, titles, company sizes, locations.' },
              { icon: '🤖', name: 'AI Sourcing', role: 'THE HUNTER', desc: 'Our engine scans African B2B data in real time to find matching contacts.' },
              { icon: '✅', name: 'Human Review', role: 'THE FILTER', desc: 'Every lead is human-verified before it reaches your pipeline.' },
              { icon: '🔒', name: 'POPIA Consent', role: 'THE SHIELD', desc: 'Automated consent requests. Every opt-in tracked and logged.' },
              { icon: '⚡', name: 'AI Scoring', role: 'THE RANKER', desc: 'Each lead scored 0–100 on fit, intent, and engagement signals.' },
              { icon: '📦', name: 'CRM Delivery', role: 'THE HANDOFF', desc: 'Leads land in your inbox or CRM — enriched and ready to work.' },
            ].map(({ icon, name, role, desc }) => (
              <div key={name} className="bg-[#161820] border border-white/5 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">{icon}</div>
                <p className="font-bold text-white text-sm mb-1">{name}</p>
                <p className="text-xs font-semibold mb-2" style={{ color: ACCENT }}>{role}</p>
                <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features + Scenarios */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 mb-3">What it does</p>
            <h2 className="text-3xl font-black mb-8">Key Features</h2>
            <div className="bg-[#161820] rounded-2xl border border-white/5 overflow-hidden">
              {[
                { icon: '🎯', title: 'Precision ICP Targeting', desc: 'Granular buyer profile definition across 50+ data points.' },
                { icon: '🌍', title: 'African Market Coverage', desc: 'SA, Nigeria, Kenya, Ghana, Egypt and growing.' },
                { icon: '🔒', title: 'POPIA/GDPR Compliance', desc: 'Built-in consent management. Fully audit-ready.' },
                { icon: '📊', title: 'AI Lead Scoring', desc: 'Every lead ranked by fit, intent, and buying signals.' },
                { icon: '🔗', title: 'CRM-Ready Delivery', desc: 'HubSpot, Salesforce, Pipedrive — or direct CSV.' },
                { icon: '📈', title: 'Funnel Analytics', desc: 'Conversion rates, quality trends, ROI reporting.' },
              ].map(({ icon, title, desc }, i, arr) => (
                <div key={title} className={`flex items-start gap-4 p-5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="text-xl shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 mb-3">Only possible with AI</p>
            <h2 className="text-3xl font-black mb-8">What If It Could...</h2>
            <div className="bg-[#161820] rounded-2xl border border-white/5 overflow-hidden">
              {[
                { n: '01', title: 'Fill Your CRM While You Sleep', desc: 'Wake up to 50 new verified, scored leads every morning.' },
                { n: '02', title: 'Know Who\'s Ready to Buy', desc: 'AI detects intent signals — hiring, funding, expansion.' },
                { n: '03', title: 'Never Worry About Compliance', desc: 'Every consent event logged automatically. POPIA-proof.' },
                { n: '04', title: 'Recalibrate Your ICP Monthly', desc: 'AI learns from your wins and refines targeting over time.' },
                { n: '05', title: 'Expand Across Africa Instantly', desc: 'Add a new market. Leads start flowing within 48 hours.' },
                { n: '06', title: 'Cut Sales Research to Zero', desc: 'Every lead arrives with full intelligence brief attached.' },
                { n: '07', title: 'Predict Revenue 90 Days Out', desc: 'Pipeline AI forecasts conversion rates and MRR impact.' },
              ].map(({ n, title, desc }, i, arr) => (
                <div key={n} className={`flex items-start gap-4 p-5 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ backgroundColor: `${ACCENT}33` }}>
                    {n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-3xl md:text-4xl font-black text-white leading-snug">
            "This isn't a lead list. This is a pipeline.<br />
            It doesn't just source — it <span className="underline decoration-[#0066FF]">converts</span>."
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-3">Ready to build your pipeline?</h2>
          <p className="text-white/40 text-sm mb-10">Start your 14-day free trial. No credit card required.</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold px-8 py-4 rounded-full text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: ACCENT }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: ACCENT }} />
            <span className="font-bold text-sm">K.I.N.D</span>
          </Link>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} K.I.N.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
