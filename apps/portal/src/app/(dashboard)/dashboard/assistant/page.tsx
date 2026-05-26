'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Bot } from 'lucide-react'

interface MillaDocument {
  id: string; name: string; type: string
  status: 'processing' | 'ready' | 'error'; created_at: string
}
interface MillaSession { id: string; title: string | null; created_at: string }
interface MillaSource { document_name: string; chunk_content: string }
interface MillaMessage {
  id: string; role: 'user' | 'assistant'; content: string
  sources: MillaSource[] | null; created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  processing: 'bg-amber-100 text-amber-700',
  ready:      'bg-green-100 text-green-700',
  error:      'bg-red-100 text-red-600',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function SourceChips({ sources }: { sources: MillaSource[] }) {
  const [expanded, setExpanded] = useState(false)
  const names = [...new Set(sources.map(s => s.document_name))]
  return (
    <div className="mt-2">
      <button onClick={() => setExpanded(v => !v)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
        {expanded ? '▲' : '▼'} Based on: {names.join(', ')}
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {names.map(name => (
            <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">{name}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function DemoRequestButton({ product }: { product: 'milla' | 'vida' }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  async function handleRequest() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'}/api/demo-request`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ product, client_id: session?.user?.id, message: '' }),
      })
      setSent(true)
    } catch { setSent(true) } finally { setLoading(false) }
  }
  if (sent) return (
    <div className="flex items-center justify-center gap-2 w-full border border-gray-200 rounded-xl px-6 py-3 text-sm text-gray-500 bg-gray-50">
      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      Demo request sent — we'll be in touch
    </div>
  )
  return (
    <button onClick={handleRequest} disabled={loading}
      className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:border-gray-300 rounded-xl px-6 py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50">
      {loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
      Request a Demo instead
    </button>
  )
}

// ── Main page — ALL hooks declared before any conditional return ───────────────

export default function AssistantPage() {
  const supabase = createClient()

  // Access gate
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  // UI state
  const [tab, setTab] = useState<'documents' | 'chat'>('chat')
  const [toastMsg, setToastMsg] = useState('')

  // Documents state
  const [documents, setDocuments] = useState<MillaDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState<'txt' | 'pdf' | 'url' | 'other'>('txt')
  const [docContent, setDocContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Chat state
  const [sessions, setSessions] = useState<MillaSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<MillaSession | null>(null)
  const [messages, setMessages] = useState<MillaMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3500) }

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setHasAccess(false); return }
      api.get<{ data: { product: string; status: string }[] }>('/subscriptions', session.access_token)
        .then(res => setHasAccess((res.data ?? []).some(s => s.product === 'virtual_assistant' && s.status === 'active')))
        .catch(() => setHasAccess(false))
    })
  }, [supabase])

  const loadDocuments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaDocument[] }>('/milla/documents', session?.access_token)
      setDocuments(res.data ?? [])
    } catch { /* silently ignore */ }
    setDocsLoading(false)
  }, [supabase])

  useEffect(() => { if (hasAccess === true) loadDocuments() }, [hasAccess, loadDocuments])

  const loadSessions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaSession[] }>('/milla/sessions', session?.access_token)
      setSessions(res.data ?? [])
    } catch { /* silently ignore */ }
    setSessionsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (hasAccess !== true || tab !== 'chat') return
    loadSessions().then(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await api.get<{ data: { id: string }[] }>('/milla/sessions', session.access_token).catch(() => null)
      if (res && (res.data ?? []).length === 0) {
        const created = await api.post<{ success: boolean; sessionId: string }>('/milla/sessions', {}, session.access_token).catch(() => null)
        if (created?.sessionId) {
          const s = { id: created.sessionId, title: null, created_at: new Date().toISOString() }
          setSessions([s]); setActiveSession(s); setMessages([])
        }
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, hasAccess])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const hasReadyDoc = documents.some(d => d.status === 'ready')

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!docName.trim() || !docContent.trim()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.post('/milla/documents', { name: docName.trim(), type: docType, content: docContent.trim() }, session?.access_token)
      setDocName(''); setDocContent(''); setDocType('txt')
      toast('Document uploaded — Milla is processing it now.')
      setTimeout(() => loadDocuments(), 800)
    } catch (err) { toast(err instanceof Error ? err.message : 'Failed to upload document') }
    setSubmitting(false)
  }

  async function handleDeleteDoc(id: string) {
    if (!confirm('Delete this document and all its chunks? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.delete_(`/milla/documents/${id}`, session?.access_token)
      setDocuments(prev => prev.filter(d => d.id !== id))
      toast('Document deleted')
    } catch { toast('Failed to delete document') }
    setDeletingId(null)
  }

  async function loadMessages(sessionId: string) {
    setMessagesLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaMessage[] }>(`/milla/sessions/${sessionId}/messages`, session?.access_token)
      setMessages(res.data ?? [])
    } catch { toast('Failed to load messages') }
    setMessagesLoading(false)
  }

  function selectSession(s: MillaSession) { setActiveSession(s); loadMessages(s.id) }

  async function handleNewSession() {
    setCreatingSession(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; sessionId: string }>('/milla/sessions', {}, session?.access_token)
      const s: MillaSession = { id: res.sessionId, title: null, created_at: new Date().toISOString() }
      setSessions(prev => [s, ...prev]); setActiveSession(s); setMessages([])
    } catch { toast('Failed to create session') }
    setCreatingSession(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !activeSession || sending) return
    const userText = chatInput.trim()
    setChatInput(''); setSending(true)
    const optimistic: MillaMessage = { id: `opt-${Date.now()}`, role: 'user', content: userText, sources: null, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; reply: string; sources: MillaSource[] }>(
        `/milla/sessions/${activeSession.id}/chat`, { message: userText }, session?.access_token)
      const reply: MillaMessage = { id: `opt-a-${Date.now()}`, role: 'assistant', content: res.reply, sources: res.sources?.length > 0 ? res.sources : null, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, reply])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send message')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    }
    setSending(false)
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (hasAccess === null) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  // ── Upgrade / locked screen ───────────────────────────────────────────────
  if (!hasAccess) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Bot className="w-7 h-7 text-blue-600" />
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Now available
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Meet Milla</h1>
          <p className="text-gray-500 text-sm">Your AI Virtual Assistant — trained on your business documents. Ask her anything.</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
          {['Trained on your own documents and SOPs','Answers questions about your business instantly','Drafts emails and messages in your tone','Available 24/7 — never misses a question'].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
        <div className="text-center mb-5">
          <span className="text-3xl font-bold text-gray-900">$49</span>
          <span className="text-gray-400 text-sm ml-1">/month</span>
        </div>
        <div className="space-y-3">
          <a href="/dashboard/billing" className="flex items-center justify-center gap-2 w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors">
            Unlock Milla — $49/month →
          </a>
          <DemoRequestButton product="milla" />
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Cancel anytime · Billed monthly via Stripe · Activates instantly</p>
      </div>
    </div>
  )

  // ── Authenticated content ─────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl">
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">{toastMsg}</div>
      )}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Milla — Virtual Assistant</h1>
        <p className="text-sm text-gray-500 mt-0.5">Train Milla on your business documents, then ask questions and get grounded answers.</p>
      </div>

      <div className="flex gap-1 border-b border-gray-100">
        {(['documents', 'chat'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? 'bg-white border border-b-white border-gray-100 text-gray-900 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'documents' ? 'Documents' : 'Chat'}
          </button>
        ))}
      </div>

      {tab === 'documents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Uploaded documents</h2>
            </div>
            {docsLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
              : documents.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-gray-500 font-medium">No documents yet</p>
                  <p className="text-sm text-gray-400 mt-1">Add your first document to train Milla on your business.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {documents.map(doc => (
                    <li key={doc.id} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{doc.type.toUpperCase()} · {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={doc.status} />
                        <button onClick={() => handleDeleteDoc(doc.id)} disabled={deletingId === doc.id}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                          {deletingId === doc.id ? '…' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Add document</h2>
            <form onSubmit={handleDocSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Document name</label>
                  <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Pricing Deck Q2 2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={docType} onChange={e => setDocType(e.target.value as typeof docType)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    <option value="txt">Text</option><option value="pdf">PDF</option>
                    <option value="url">URL</option><option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Content <span className="text-gray-400 font-normal">(paste extracted text)</span></label>
                <textarea value={docContent} onChange={e => setDocContent(e.target.value)} placeholder="Paste the full text content of your document here…"
                  rows={8} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y" />
              </div>
              <button type="submit" disabled={submitting || !docName.trim() || !docContent.trim()}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {submitting ? 'Uploading…' : 'Upload document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'chat' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {!docsLoading && !hasReadyDoc && (
            <div className="p-4 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-700">
                💡 Milla can answer general questions now. <button onClick={() => setTab('documents')} className="underline font-medium">Add your business documents</button> to get answers grounded in your own data.
              </p>
            </div>
          )}
          <div className="flex h-[68vh]">
            <div className="w-56 border-r border-gray-100 flex flex-col shrink-0">
              <div className="px-3 py-3 border-b border-gray-100">
                <button onClick={handleNewSession} disabled={creatingSession}
                  className="w-full px-3 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                  {creatingSession ? 'Creating…' : '+ New chat'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sessionsLoading ? <p className="text-xs text-gray-400 p-4">Loading…</p>
                  : sessions.length === 0 ? <p className="text-xs text-gray-400 p-4">No sessions yet.</p>
                  : sessions.map(s => (
                    <button key={s.id} onClick={() => selectSession(s)}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors border-b border-gray-50 ${activeSession?.id === s.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                      <p className="truncate">{s.title ?? 'Untitled chat'}</p>
                      <p className="text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                    </button>
                  ))
                }
              </div>
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              {!activeSession ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <p className="text-gray-500 font-medium">Select a chat or start a new one</p>
                    <p className="text-sm text-gray-400 mt-1">Milla will answer questions using your uploaded documents.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {messagesLoading ? <p className="text-sm text-gray-400 text-center py-8">Loading messages…</p>
                      : messages.length === 0 ? (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-gray-50 text-gray-800 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed">
                            Hi! I'm Milla, your K.I.N.D business assistant. Ask me anything — about your leads, how to set up FIGSY, what your ICP should look like, or any other business question. How can I help?
                          </div>
                        </div>
                      ) : messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                            <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#0066FF] text-white rounded-br-sm' : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'}`}>
                              {msg.content}
                            </div>
                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && <SourceChips sources={msg.sources} />}
                          </div>
                        </div>
                      ))
                    }
                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                          <span className="text-xs text-gray-400">Milla is thinking…</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-100 flex gap-3 items-end">
                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                      placeholder="Ask Milla anything…" rows={2}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                    <button type="submit" disabled={sending || !chatInput.trim()}
                      className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors shrink-0">
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
