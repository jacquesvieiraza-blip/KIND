'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Handshake, Loader2, Copy, Check, FileText, Mail } from 'lucide-react'

interface Draft {
  id: string
  kind: 'follow_up' | 'proposal'
  input: Record<string, unknown>
  output: string
  created_at: string
}

type Tab = 'follow_up' | 'proposal'

export default function DenisePage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('follow_up')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>([])

  // Follow-up inputs
  const [firstName, setFirstName] = useState('')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [conversation, setConversation] = useState('')
  const [interest, setInterest] = useState('')

  // Proposal inputs
  const [propCompany, setPropCompany] = useState('')
  const [callSummary, setCallSummary] = useState('')
  const [pains, setPains] = useState('')
  const [productFit, setProductFit] = useState('')

  const loadDrafts = useCallback(async (tok: string) => {
    try {
      const res = await api.get<{ drafts: Draft[] }>('/denise/drafts', tok)
      setDrafts(res.drafts ?? [])
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) { setToken(session.access_token); loadDrafts(session.access_token) }
    })
  }, [supabase, loadDrafts])

  async function generate() {
    if (!token) return
    setLoading(true); setError(null); setResult(null); setCopied(false)
    try {
      let res: { success?: boolean; draft?: string; error?: string }
      if (tab === 'follow_up') {
        res = await api.post('/denise/draft-followup', {
          first_name: firstName, company, job_title: jobTitle,
          conversation_summary: conversation, interest_signal: interest,
        }, token)
      } else {
        res = await api.post('/denise/draft-proposal', {
          company: propCompany, call_summary: callSummary,
          pains: pains.split('\n').map(s => s.trim()).filter(Boolean),
          product_fit: productFit,
        }, token)
      }
      if (res.draft) { setResult(res.draft); loadDrafts(token) }
      else setError(res.error || 'Denise could not draft that. Please try again.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  function copy() {
    if (!result) return
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const canSubmit = tab === 'follow_up'
    ? company.trim().length > 0 || firstName.trim().length > 0
    : propCompany.trim().length > 0 && callSummary.trim().length > 0

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-amber-200 shadow-sm shrink-0">
          <img src="/agents/denise.png" alt="Denise" className="w-full h-full object-cover object-top" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1E1152]">Denise</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">The Closer</span>
          </div>
          <p className="text-sm text-[#9B8EC4]">AI Account Executive · Closes what FIGSY opens</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setTab('follow_up'); setResult(null); setError(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'follow_up' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-purple-100 hover:bg-purple-50'}`}
        >
          <Mail className="w-4 h-4" /> Warm follow-up
        </button>
        <button
          onClick={() => { setTab('proposal'); setResult(null); setError(null) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'proposal' ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-purple-100 hover:bg-purple-50'}`}
        >
          <FileText className="w-4 h-4" /> Proposal from a call
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-purple-100 p-5 space-y-4">
        {tab === 'follow_up' ? (
          <>
            <p className="text-sm text-gray-500">Give Denise the context and she&rsquo;ll write a warm, no-pressure follow-up to a prospect who&rsquo;s gone quiet.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input className="border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
              <input className="border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="Job title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <textarea className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="What was said so far (the conversation)" value={conversation} onChange={e => setConversation(e.target.value)} />
            <input className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="What they were interested in" value={interest} onChange={e => setInterest(e.target.value)} />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">Paste your discovery-call notes and Denise will draft a proposal outline you can refine and send.</p>
            <input className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="Company" value={propCompany} onChange={e => setPropCompany(e.target.value)} />
            <textarea className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" rows={4} placeholder="Call summary — what you discussed" value={callSummary} onChange={e => setCallSummary(e.target.value)} />
            <textarea className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Pains they raised (one per line)" value={pains} onChange={e => setPains(e.target.value)} />
            <input className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm" placeholder="Recommended fit (optional)" value={productFit} onChange={e => setProductFit(e.target.value)} />
          </>
        )}

        <button
          onClick={generate}
          disabled={loading || !canSubmit}
          className="flex items-center justify-center gap-2 w-full bg-amber-600 text-white font-semibold rounded-lg px-6 py-3 text-sm disabled:opacity-50 hover:bg-amber-700 transition-colors"
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Denise is writing…</> : <><Handshake className="w-4 h-4" /> Draft it</>}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-5 bg-[#1E1152] rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">Denise&rsquo;s draft</span>
            <button onClick={copy} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">{result}</pre>
        </div>
      )}

      {/* History */}
      {drafts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent drafts</h2>
          <div className="space-y-2">
            {drafts.map(d => (
              <div key={d.id} className="bg-white rounded-lg border border-purple-100 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${d.kind === 'proposal' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-[#7C3AED]'}`}>
                    {d.kind === 'proposal' ? 'Proposal' : 'Follow-up'}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(d.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{d.output.slice(0, 220)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
