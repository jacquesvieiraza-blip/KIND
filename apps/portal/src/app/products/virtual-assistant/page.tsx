import Link from 'next/link'
import { Zap } from 'lucide-react'
import { WaitlistForm } from '@/components/products/WaitlistForm'

const ACCENT = '#7C3AED'

export default function VirtualAssistantPage() {
  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-sans antialiased">

      {/* Nav */}
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

      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase mb-6" style={{ color: ACCENT }}>
          AI Virtual Assistant · Coming Soon
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] tracking-tight mb-6 text-white">
          Virtual<br />Assistant
        </h1>
        <p className="text-2xl font-bold text-white/80 mb-4 max-w-2xl">
          It doesn't just assist — it <span className="underline" style={{ textDecorationColor: ACCENT }}>executes</span>.
        </p>
        <p className="text-white/40 max-w-lg text-sm leading-relaxed mb-10">
          A fully autonomous AI trained on your business — handling email, scheduling, research, and knowledge queries so your team can focus on what matters.
        </p>
        <div className="w-full max-w-md" id="waitlist-hero">
          <WaitlistForm product="virtual-assistant" accent={ACCENT} count={247} />
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 text-center mb-3">Architecture</p>
          <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '📬', name: 'Email Triage', role: 'THE INBOX', desc: 'Reads, prioritizes, and drafts responses to every email — before you even open it.' },
              { icon: '📅', name: 'Calendar AI', role: 'THE SCHEDULER', desc: 'Manages your calendar. Books meetings. Blocks deep work time automatically.' },
              { icon: '🔍', name: 'Research Engine', role: 'THE ANALYST', desc: 'Delivers concise research briefs on any topic in under 60 seconds.' },
              { icon: '🧠', name: 'Knowledge Base', role: 'THE MEMORY', desc: 'Trained on your docs, SOPs, and past decisions. Always context-aware.' },
              { icon: '✍️', name: 'Content Drafting', role: 'THE WRITER', desc: 'Drafts proposals, reports, and internal comms in your voice.' },
              { icon: '📊', name: 'Daily Briefings', role: 'THE PULSE', desc: 'Morning summary of priorities, calendar, and key flags — every day.' },
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
                { icon: '📬', title: 'Eliminate Inbox Drag', desc: 'Auto-triage, prioritize, and draft replies to every email.' },
                { icon: '📅', title: 'Calendar Management', desc: 'Smart scheduling that protects deep work and avoids conflicts.' },
                { icon: '🔍', title: 'Research on Demand', desc: 'Instant briefs on competitors, markets, and topics.' },
                { icon: '🧠', title: 'Knowledge Base Queries', desc: 'Ask it anything about your business. Get instant answers.' },
                { icon: '🔔', title: 'Auto Follow-Up', desc: 'Tracks commitments and nudges when things go quiet.' },
                { icon: '📊', title: '80% Less Prep', desc: 'Executive briefings with full context, generated automatically.' },
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
                { n: '01', title: 'Run Your Inbox Overnight', desc: 'Wake up with emails triaged, drafted, and flagged.' },
                { n: '02', title: 'Never Miss a Follow-Up', desc: 'It tracks every commitment and chases without being asked.' },
                { n: '03', title: 'Brief You in 2 Minutes', desc: 'Full daily context — priorities, risks, opportunities.' },
                { n: '04', title: 'Write in Your Voice', desc: 'Trained on your past emails and docs. Sounds exactly like you.' },
                { n: '05', title: 'Handle Scheduling Entirely', desc: 'No back-and-forth. It coordinates and confirms for you.' },
                { n: '06', title: 'Answer Team Questions', desc: 'Your SOPs, policies, and history — always accessible.' },
                { n: '07', title: 'Free 10 Hours a Week', desc: 'Your team focuses on decisions. The assistant handles the rest.' },
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
            "This isn't automation. This is an agent.<br />
            It doesn't just suggest — it <span className="underline" style={{ textDecorationColor: ACCENT }}>does</span>."
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section id="waitlist" className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-3">Ready to meet your AI assistant?</h2>
          <p className="text-white/40 text-sm mb-10">Join the waitlist for early access.</p>
          <WaitlistForm product="virtual-assistant" accent={ACCENT} count={247} />
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
