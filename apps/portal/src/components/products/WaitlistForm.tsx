'use client'

import { useState } from 'react'

interface WaitlistFormProps {
  product: string
  accent: string
  count?: number
}

export function WaitlistForm({ product, accent, count = 0 }: WaitlistFormProps) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, email, product }),
    })

    if (res.ok) {
      setStatus('success')
    } else if (res.status === 409) {
      setStatus('duplicate')
    } else {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-6">
        <p className="text-white font-semibold text-lg">You're on the list.</p>
        <p className="text-white/40 text-sm mt-1">We'll reach out when it's your turn.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
          required
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
        />
        <input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {status === 'loading' ? 'Joining...' : 'Join the Waitlist'}
      </button>
      {status === 'duplicate' && (
        <p className="text-center text-white/40 text-xs mt-3">You're already on the list.</p>
      )}
      {status === 'error' && (
        <p className="text-center text-red-400 text-xs mt-3">Something went wrong. Try again.</p>
      )}
      {count > 0 && status === 'idle' && (
        <p className="text-center text-white/30 text-xs mt-3">{count.toLocaleString()}+ others already waiting</p>
      )}
    </form>
  )
}
