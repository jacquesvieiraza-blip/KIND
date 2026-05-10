'use client'

import { useState } from 'react'
import { MessageSquare, Globe, PhoneCall, Calendar, BarChart2, Users, ArrowRight, Check } from 'lucide-react'

const FEATURES = [
  { icon: Globe, title: 'Web + WhatsApp', desc: 'One AI agent across your website and WhatsApp simultaneously.' },
  { icon: Users, title: 'Smart Qualification', desc: 'Identifies decision-makers and filters out tyre-kickers automatically.' },
  { icon: Calendar, title: 'Appointment Booking', desc: 'Books directly into your calendar. Zero back-and-forth.' },
  { icon: PhoneCall, title: 'Human Handoff', desc: 'Escalates to your team when complexity requires a human touch.' },
  { icon: MessageSquare, title: 'Sub-second Response', desc: 'Instant replies. No loading screens, no hold times, 24/7.' },
  { icon: BarChart2, title: 'Conversation Analytics', desc: 'See what visitors ask, where they drop, and what converts.' },
]

export default function ChatbotPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: '', email, product: 'chatbot' }),
    })
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-10 text-white" style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-orange-200">Coming Soon</span>
          </div>
          <h1 className="text-3xl font-black mb-2">Chatbot Agent</h1>
          <p className="text-orange-100 text-sm max-w-lg">
            Intelligent conversational AI embedded on your website and WhatsApp — qualifying buyers, booking appointments, and closing deals without human intervention.
          </p>
        </div>

        <div className="px-8 py-6 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-6">
            {['183 on waitlist', 'Launching Week 3', 'Early access priority'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {item}
              </div>
            ))}
          </div>
          <a href="/products/chatbot" target="_blank" className="text-sm text-orange-600 font-medium flex items-center gap-1 hover:text-orange-800">
            View full details <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Waitlist form */}
        <div className="px-8 py-6">
          {submitted ? (
            <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl px-5 py-4">
              <Check className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">You're on the waitlist. We'll notify you when Chatbot Agent launches.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-md">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#ea580c' }}
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Features grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">What's coming</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: '#fff7ed' }}>
                <Icon className="w-4 h-4" style={{ color: '#ea580c' }} />
              </div>
              <p className="font-semibold text-sm text-gray-900 mb-1">{title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
