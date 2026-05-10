'use client'

import { useState } from 'react'
import { Bot, Mail, Calendar, Search, BookOpen, Bell, BarChart2, ArrowRight, Check } from 'lucide-react'

const FEATURES = [
  { icon: Mail, title: 'Email Drafting', desc: 'Auto-triage and draft replies to every email before you open it.' },
  { icon: Calendar, title: 'Calendar Management', desc: 'Smart scheduling that protects deep work and avoids conflicts.' },
  { icon: Search, title: 'Research on Demand', desc: 'Instant briefs on competitors, markets, and any topic.' },
  { icon: BookOpen, title: 'Knowledge Base', desc: 'Ask it anything about your business. Get instant answers.' },
  { icon: Bell, title: 'Auto Follow-Up', desc: 'Tracks commitments and nudges when things go quiet.' },
  { icon: BarChart2, title: 'Daily Briefings', desc: 'Morning summary of priorities, calendar, and key flags.' },
]

export default function AssistantPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: '', email, product: 'virtual-assistant' }),
    })
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold tracking-widest uppercase text-purple-200">Coming Soon</span>
          </div>
          <h1 className="text-3xl font-black mb-2">Virtual Assistant</h1>
          <p className="text-purple-200 text-sm max-w-lg">
            A fully autonomous AI trained on your business — handling email, scheduling, research, and knowledge queries so your team can focus on what matters.
          </p>
        </div>

        <div className="px-8 py-6 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-center gap-6">
            {['247 on waitlist', 'Launching Week 4', 'Early access priority'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                {item}
              </div>
            ))}
          </div>
          <a href="/products/virtual-assistant" target="_blank" className="text-sm text-purple-600 font-medium flex items-center gap-1 hover:text-purple-800">
            View full details <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Waitlist form */}
        <div className="px-8 py-6">
          {submitted ? (
            <div className="flex items-center gap-3 text-green-700 bg-green-50 rounded-xl px-5 py-4">
              <Check className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">You're on the waitlist. We'll notify you when Virtual Assistant launches.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3 max-w-md">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
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
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-purple-600" />
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
