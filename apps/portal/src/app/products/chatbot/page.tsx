import Link from 'next/link'
import { Zap } from 'lucide-react'
import { WaitlistForm } from '@/components/products/WaitlistForm'

const ACCENT = '#EA580C'

export default function ChatbotPage() {
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
          AI Chatbot Agent · Coming Soon
        </p>
        <h1 className="text-[clamp(3rem,9vw,7rem)] font-black leading-[0.9] tracking-tight mb-6 text-white">
          Chatbot<br />Agent
        </h1>
        <p className="text-2xl font-bold text-white/80 mb-4 max-w-2xl">
          Converts visitors. Closes deals. Never <span className="underline" style={{ textDecorationColor: ACCENT }}>sleeps</span>.
        </p>
        <p className="text-white/40 max-w-lg text-sm leading-relaxed mb-10">
          Intelligent conversational AI embedded on your website and WhatsApp — qualifying buyers, booking appointments, and closing deals without human intervention.
        </p>
        <div className="w-full max-w-md">
          <WaitlistForm product="chatbot" accent={ACCENT} count={183} />
        </div>
      </section>

      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 text-center mb-3">Architecture</p>
          <h2 className="text-4xl font-black text-center mb-16">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🔌', name: 'One-Line Embed', role: 'THE SETUP', desc: 'Add a single script tag. Live on your site in under 5 minutes.' },
              { icon: '🧠', name: 'AI Training', role: 'THE BRAIN', desc: 'Feed it your products, FAQs, and pricing. It learns your business.' },
              { icon: '🎯', name: 'Lead Qualification', role: 'THE FILTER', desc: 'Asks the right questions to identify serious buyers automatically.' },
              { icon: '📅', name: 'Booking Engine', role: 'THE CLOSER', desc: 'Books discovery calls directly into your calendar. No back-and-forth.' },
              { icon: '🤝', name: 'Human Handoff', role: 'THE BRIDGE', desc: 'Escalates to your team when complexity requires a human touch.' },
              { icon: '📊', name: 'Conversation Analytics', role: 'THE LENS', desc: 'See what visitors ask, where they drop, and what converts.' },
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
                { icon: '💬', title: 'Web + WhatsApp', desc: 'One AI agent across your website and WhatsApp simultaneously.' },
                { icon: '🎯', title: 'Smart Qualification', desc: 'Identifies decision-makers and filters out tyre-kickers.' },
                { icon: '📅', title: 'Appointment Booking', desc: 'Books directly into your calendar. Zero scheduling back-and-forth.' },
                { icon: '🔗', title: 'CRM Sync', desc: 'Every conversation and lead pushed to your CRM automatically.' },
                { icon: '⚡', title: 'Sub-second Response', desc: 'Instant replies. No loading screens, no hold times.' },
                { icon: '🌍', title: 'Multilingual', desc: 'Responds in English, Afrikaans, Zulu, French, Swahili and more.' },
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
                { n: '01', title: 'Close Deals at 3AM', desc: 'Your website becomes a sales rep that never clocks out.' },
                { n: '02', title: 'Qualify 1,000 Visitors a Day', desc: 'Every visitor engaged, scored, and routed instantly.' },
                { n: '03', title: 'Book Your Calendar Automatically', desc: 'Wake up to a full calendar of qualified discovery calls.' },
                { n: '04', title: 'Speak Every Customer\'s Language', desc: 'Switches languages mid-conversation without missing a beat.' },
                { n: '05', title: 'Learn From Every Conversation', desc: 'Gets smarter with every interaction. No retraining needed.' },
                { n: '06', title: 'Handle 500 Chats Simultaneously', desc: 'Infinite scale. Every visitor gets instant, personal attention.' },
                { n: '07', title: '3.4× Your Conversion Rate', desc: 'Based on average results across K.I.N.D early clients.' },
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
            "This isn't a chatbot. This is a sales agent.<br />
            It doesn't just chat — it <span className="underline" style={{ textDecorationColor: ACCENT }}>converts</span>."
          </p>
        </div>
      </section>

      <section id="waitlist" className="py-24 px-6 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-black mb-3">Ready to turn visitors into clients?</h2>
          <p className="text-white/40 text-sm mb-10">Join the waitlist for early access.</p>
          <WaitlistForm product="chatbot" accent={ACCENT} count={183} />
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
