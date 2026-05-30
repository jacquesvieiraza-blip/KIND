'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { VoiceMicButton } from '@/components/VoiceMicButton'
import { ArrowLeft, Loader2, Sparkles, CheckCircle } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface IcpDraft {
  name: string
  industries: string[]
  job_titles: string[]
  seniority_levels: string[]
  company_sizes: string[]
  geographies: string[]
  tech_stack: string[]
  keywords: string[]
  apollo_only_consented: boolean
}

interface ChatResponse {
  type: 'question' | 'complete'
  content?: string
  icp?: IcpDraft
  summary?: string
}

const MILLA_FIRST_MESSAGE = "Hi! I'm Milla. Let's build your ideal customer profile together. Who is your ideal client? Tell me about the kind of company you want to reach."

export default function IcpBuilderPage() {
  const router = useRouter()
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: MILLA_FIRST_MESSAGE },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [icpDraft, setIcpDraft] = useState<IcpDraft | null>(null)
  const [icpSummary, setIcpSummary] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flagChecked, setFlagChecked] = useState(false)
  const [flagEnabled, setFlagEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      // Check feature flag
      try {
        const features = await api.get<{ campaign_intent: boolean; icp_builder: boolean }>('/features')
        setFlagEnabled(features.icp_builder ?? false)
      } catch {
        setFlagEnabled(false)
      }
      setFlagChecked(true)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, icpDraft])

  async function sendMessage(text?: string) {
    const messageText = (text ?? input).trim()
    if (!messageText || sending || !token) return

    const newMessages: Message[] = [...messages, { role: 'user', content: messageText }]
    setMessages(newMessages)
    setInput('')
    setSending(true)
    setError(null)

    try {
      const res = await api.post<{ success: boolean; data: ChatResponse }>(
        '/icps/builder/chat',
        { messages: newMessages },
        token,
      )
      const response = res.data

      if (response.type === 'complete' && response.icp) {
        setIcpDraft(response.icp)
        setIcpSummary(response.summary ?? null)
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `I've built your ICP based on our conversation. Here's what I put together — take a look below and save it when you're ready.`,
          },
        ])
      } else if (response.type === 'question' && response.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.content! }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    }

    setSending(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  async function handleSave() {
    if (!icpDraft || !token) return
    setSaving(true)
    setError(null)
    try {
      await api.post<{ data: unknown }>('/icps', icpDraft, token)
      setSaved(true)
      setTimeout(() => router.push('/dashboard/leads/icp'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ICP — please try again.')
    }
    setSaving(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!flagChecked) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!flagEnabled) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-700 font-medium mb-2">AI ICP Builder is not available yet.</p>
          <a href="/dashboard/leads/icp" className="text-brand-600 text-sm hover:underline">
            Back to ICP Builder
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <a href="/dashboard/leads/icp" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">Build with Milla</h1>
            <p className="text-xs text-gray-400">AI-assisted ICP builder</p>
          </div>
        </div>
      </div>

      {/* Chat window */}
      <div
        className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 overflow-y-auto"
        style={{ minHeight: '420px', maxHeight: '520px' }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-gray-50 text-gray-800 rounded-tl-sm'
                  : 'bg-[#0066FF] text-white rounded-tr-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Milla is thinking…</span>
            </div>
          </div>
        )}

        {/* ICP preview card */}
        {icpDraft && (
          <div className="mt-2 bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Your ICP Draft</p>
            {icpSummary && <p className="text-sm font-medium text-purple-900 mb-3">{icpSummary}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {[
                ['Name', icpDraft.name],
                ['Industries', icpDraft.industries.join(', ')],
                ['Job Titles', icpDraft.job_titles.join(', ')],
                ['Seniority', icpDraft.seniority_levels.join(', ')],
                ['Company Size', icpDraft.company_sizes.join(', ')],
                ['Geographies', icpDraft.geographies.join(', ')],
              ].map(([label, value]) => value ? (
                <div key={label}>
                  <span className="text-purple-400 text-xs">{label}: </span>
                  <span className="text-purple-800">{value}</span>
                </div>
              ) : null)}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                ) : saved ? (
                  <><CheckCircle className="w-4 h-4" />Saved!</>
                ) : (
                  'Save this ICP →'
                )}
              </button>
              <button
                onClick={() => { setIcpDraft(null); setIcpSummary(null) }}
                className="px-4 py-2 border border-purple-200 text-purple-600 text-sm font-medium rounded-lg hover:border-purple-400 transition-colors"
              >
                Keep talking
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input area */}
      {!icpDraft && (
        <div className="bg-white rounded-xl border border-gray-100 p-3">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer… (Enter to send)"
              rows={2}
              disabled={sending}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none disabled:opacity-50"
            />
            <VoiceMicButton
              onTranscript={text => {
                setInput(prev => prev ? `${prev} ${text}` : text)
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
