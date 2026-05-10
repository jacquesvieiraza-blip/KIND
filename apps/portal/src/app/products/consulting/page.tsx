import Link from 'next/link'
import { Zap } from 'lucide-react'
import { WaitlistForm } from '@/components/products/WaitlistForm'

const ACCENT = '#059669'

export default function ConsultingPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-sans antialiased">

      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-[#0d0f14]/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0066FF]" />
            <span className="font-bold text-sm tracking-tight">K.I.N.D</span>
          </Link>
          <a href="#waitlist" className="text-sm font-semibold px-5 py-2 rounded-full text-white" style={{ backgroundColor: ACCENT }}>
            Join Waitlist
          </a>
        </div>
      </nav>

      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
          AI Strategy Consulting · Coming Soon
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] tracking-tight mb-6 text-white">
          Consulting<br />Retainer
        </h1>
        <p className="text-2xl font-bold text-white/80 mb-4 max-w-2xl">
          Your AI strategy, always <span className="underline" style={{ textDecorationColor: ACCENT }}>current</span>.
        </p>
        <p className="text-white/40 max-w-lg text-sm leading-relaxed mb-10">
          A dedicated senior AI consultant working alongside your team — keeping your systems sharp, your roadmap current, and your business ahead of the curve.
        </p>
        <div className="w-full max-w-md">
          <WaitlistForm product="consulting" accent={ACCENT} count={94} />
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 text-center mb-3">Architecture</p>
          <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🧭', name: 'AI Audit', role: 'THE BASELINE', desc: 'We assess your current AI maturity, gaps, and highest-leverage opportunities.' },
              { icon: '🗺️', name: 'Roadmap Design', role: 'THE PLAN', desc: 'A 12-month AI roadmap tailored to your business, market, and budget.' },
              { icon: '⚙️', name: 'Implementation', role: 'THE BUILD', desc: 'We execute alongside your team — not just advice, but delivery.' },
              { icon: '📊', name: 'Monthly Sessions', role: 'THE PULSE', desc: 'Regular strategy sessions to review progress and adapt the roadmap.' },
              { icon: '🔍', name: 'Continuous Optimisation', role: 'THE EDGE', desc: 'Your AI systems monitored, tuned, and improved month over month.' },
              { icon: '📋', name: 'Quarterly Briefings', role: 'THE INTEL', desc: 'Emerging AI developments relevant to your industry — curated and actioned.' },
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

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 mb-3">What it does</p>
            <h2 className="text-3xl font-black mb-8">Key Features</h2>
            <div className="bg-[#161820] rounded-2xl border border-white/5 overflow-hidden">
              {[
                { icon: '🧭', title: 'Dedicated Senior Consultant', desc: 'One senior AI strategist assigned to your business. Direct access.' },
                { icon: '📅', title: 'Monthly Strategy Sessions', desc: 'Structured review of your AI performance, wins, and next moves.' },
                { icon: '🗺️', title: 'Living AI Roadmap', desc: 'A dynamic roadmap that evolves with your business and market.' },
                { icon: '⚙️', title: 'Hands-On Implementation', desc: 'We don\'t just consult — we build alongside your team.' },
                { icon: '🔍', title: 'System Monitoring', desc: 'Your AI stack watched, optimised, and maintained continuously.' },
                { icon: '📋', title: 'Quarterly AI Briefing', desc: 'Industry-specific AI intelligence delivered every quarter.' },
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
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 mb-3">Only possible with a retainer</p>
            <h2 className="text-3xl font-black mb-8">What If It Could...</h2>
            <div className="bg-[#161820] rounded-2xl border border-white/5 overflow-hidden">
              {[
                { n: '01', title: 'Give You a Chief AI Officer', desc: 'Senior AI leadership without the executive salary.' },
                { n: '02', title: 'Keep You Ahead of Competitors', desc: 'Know about AI breakthroughs before your market does.' },
                { n: '03', title: 'Compound Your AI Investment', desc: 'Each tool optimised to amplify the others over time.' },
                { n: '04', title: 'Build a 3-Year AI Advantage', desc: 'Strategic depth that one-off projects can\'t achieve.' },
                { n: '05', title: 'Upskill Your Entire Team', desc: 'AI literacy built into your culture, not just your stack.' },
                { n: '06', title: 'Reduce AI Costs by 40%', desc: 'Continuous optimisation cuts waste and improves ROI.' },
                { n: '07', title: 'Turn AI Into a Revenue Centre', desc: 'Not a cost — a measurable growth driver.' },
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

      <section className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-3xl md:text-4xl font-black text-white leading-snug">
            "This isn't advice. This is execution.<br />
            It doesn't just consult — it <span className="underline" style={{ textDecorationColor: ACCENT }}>delivers</span>."
          </p>
        </div>
      </section>

      <section id="waitlist" className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-3">Ready for your AI officer?</h2>
          <p className="text-white/40 text-sm mb-10">Join the waitlist. Limited spots per cohort.</p>
          <WaitlistForm product="consulting" accent={ACCENT} count={94} />
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#0066FF]" />
            <span className="font-bold text-sm">K.I.N.D</span>
          </Link>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} K.I.N.D. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
