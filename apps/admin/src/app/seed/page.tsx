'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react'

export default function SeedPage() {
  const [email, setEmail] = useState('founder@get-kind.com')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSeed() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/seed-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ success: false, message: 'Network error — is the API deployed?' })
    }
    setLoading(false)
  }

  return (
    <div className="px-8 py-10 max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Seed Demo Leads</h1>
        <p className="text-gray-500 text-sm mt-1">Insert 25 realistic SA SaaS leads into a client account for demo/testing.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Client email address</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <button
          onClick={handleSeed}
          disabled={loading || !email}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white font-medium rounded-xl text-sm transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Seeding leads…</>
            : <><Users className="w-4 h-4" />Seed 25 demo leads</>
          }
        </button>

        {result && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${result.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            {result.success
              ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            }
            <p className={`text-sm break-all ${result.success ? 'text-emerald-800' : 'text-red-700'}`}>
              {typeof result.message === 'string' ? result.message : JSON.stringify(result)}
            </p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        This seeds 25 leads (VP Sales, Founders, Sales Directors at SA SaaS/Fintech companies) and sets the client's credit balance to 50.
        Safe to run multiple times — it won't create duplicate leads for the same client.
      </p>
    </div>
  )
}
