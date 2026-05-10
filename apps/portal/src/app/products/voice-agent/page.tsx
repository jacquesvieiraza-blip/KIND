import Link from 'next/link'
import { Zap } from 'lucide-react'
import { WaitlistForm } from '@/components/products/WaitlistForm'

const ACCENT = '#6D28D9'

export default function VoiceAgentPage() {
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
          AI Voice Agent · Coming Soon
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] tracking-tight mb-6 text-white">
          Voice<br />Agent
        </h1>
        <p className="text-2xl font-bold text-white/80 mb-4 max-w-2xl">
          Answers every call. Books every <span className="underline" style={{ textDecorationColor: ACCENT }}>appointment</span>.
        </p>
        <p className="text-white/40 max-w-lg text-sm leading-relaxed mb-10">
          Human-sounding AI that handles inbound calls, qualifies buyers, and books appointments — at any scale, with zero hold times.
        </p>
        <div className="w-full max-w-md">
          <WaitlistForm product="voice-agent" accent={ACCENT} count={312} />
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 text-center mb-3">Architecture</p>
          <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '📞', name: 'Inbound Handler', role: 'THE RECEPTIONIST', desc: 'Picks up every call instantly. Zero missed calls, zero hold times.' },
              { icon: '🧠', name: 'NLP Engine', role: 'THE LISTENER', desc: 'Understands natural speech, accents, and intent in real time.' },
              { icon: '🎯', name: 'Intent Detection', role: 'THE QUALIFIER', desc: 'Identifies whether the caller is a buyer, support case, or spam.' },
              { icon: '📅', name: 'Booking Engine', role: 'THE CLOSER', desc: 'Books appointments directly into your calendar mid-call.' },
              { icon: '🔀', name: 'Smart Escalation', role: 'THE BRIDGE', desc: 'Routes complex calls to the right human at the right moment.' },
              { icon: '📊', name: 'Call Analytics', role: 'THE DEBRIEF', desc: 'Full transcripts, sentiment scores, and conversion data per call.' },
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
                { icon: '🎤', title: 'Natural Voice Conversations', desc: 'Indistinguishable from a human. No robotic speech patterns.' },
                { icon: '📞', title: 'Inbound Support', desc: 'Handles FAQs, account queries, and support calls automatically.' },
                { icon: '📣', title: 'Outbound Sales Calling', desc: 'Dials your lead list and qualifies prospects at scale.' },
                { icon: '📅', title: 'Appointment Booking', desc: 'Books meetings mid-call. No hold, no callback, no friction.' },
                { icon: '🌍', title: 'Multilingual', desc: 'English, Afrikaans, Zulu, French, Swahili — switches on demand.' },
                { icon: '📝', title: 'Full Call Transcripts', desc: 'Every call recorded, transcribed, and summarised automatically.' },
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
                { n: '01', title: 'Answer 1,000 Calls Simultaneously', desc: 'Infinite scale. No queues. Every caller gets instant attention.' },
                { n: '02', title: 'Never Miss a Lead Again', desc: 'After-hours calls handled perfectly. Every time.' },
                { n: '03', title: 'Qualify Buyers Before You Talk', desc: 'Only the right conversations reach your team.' },
                { n: '04', title: 'Dial Your Entire Lead List', desc: 'Outbound at scale — without a call centre.' },
                { n: '05', title: 'Book While You Sleep', desc: 'Morning calendar full of qualified appointments.' },
                { n: '06', title: 'Analyse Every Conversation', desc: 'Sentiment, objections, and wins — surfaced automatically.' },
                { n: '07', title: 'Cut Call Centre Costs by 80%', desc: 'AI handles volume. Your team handles relationships.' },
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
            "This isn't a phone system. This is a sales team.<br />
            It doesn't just answer — it <span className="underline" style={{ textDecorationColor: ACCENT }}>closes</span>."
          </p>
        </div>
      </section>

      <section id="waitlist" className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-3">Ready to never miss a call?</h2>
          <p className="text-white/40 text-sm mb-10">Join the waitlist for early access.</p>
          <WaitlistForm product="voice-agent" accent={ACCENT} count={312} />
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
