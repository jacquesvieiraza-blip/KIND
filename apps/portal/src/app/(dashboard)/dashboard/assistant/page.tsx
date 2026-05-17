'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MillaDocument {
  id: string
  name: string
  type: string
  status: 'processing' | 'ready' | 'error'
  created_at: string
}

interface MillaSession {
  id: string
  title: string | null
  created_at: string
}

interface MillaSource {
  document_name: string
  chunk_content: string
}

interface MillaMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: MillaSource[] | null
  created_at: string
}

// ── Status badge ──────────────────────────────────────────────────────────────

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

// ── Sources chip list ─────────────────────────────────────────────────────────

function SourceChips({ sources }: { sources: MillaSource[] }) {
  const [expanded, setExpanded] = useState(false)
  const names = [...new Set(sources.map(s => s.document_name))]

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(v => !v)}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        {expanded ? '▲' : '▼'} Based on: {names.join(', ')}
      </button>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {names.map(name => (
            <span key={name} className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'documents' | 'chat'>('documents')
  const [toastMsg, setToastMsg] = useState('')
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setHasAccess(false); return }
      api.get<{ data: { product: string; status: string }[] }>('/subscriptions', session.access_token)
        .then(res => setHasAccess((res.data ?? []).some(s => s.product === 'virtual_assistant' && (s.status === 'active' || s.status === 'trialing'))))
        .catch(() => setHasAccess(false))
    })
  }, [supabase])

  if (hasAccess === null) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-sm text-gray-400">Loading…</p></div>

  if (!hasAccess) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-lg w-full p-8 text-center">
        <div className="text-4xl mb-4">🧠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Unlock the Virtual Assistant</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">A Claude-powered assistant trained on your business — handles emails, answers queries, and manages follow-ups.</p>
        <ul className="text-left space-y-2.5 mb-8">
          {['Trained on your documents and SOPs', 'Drafts emails in your tone', 'Answers internal and client questions', 'Connects to your calendar (coming soon)'].map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>{f}
            </li>
          ))}
        </ul>
        <a href="/dashboard/billing" className="inline-block w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors">Upgrade to unlock →</a>
        <p className="text-xs text-gray-400 mt-3">This add-on is currently in early access — email hello@get-kind.com to be added.</p>
      </div>
    </div>
  )

  // ── Documents state ───────────────────────────────────────────────────────

  const [documents, setDocuments] = useState<MillaDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docName, setDocName] = useState('')
  const [docType, setDocType] = useState<'txt' | 'pdf' | 'url' | 'other'>('txt')
  const [docContent, setDocContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaDocument[] }>('/milla/documents', session?.access_token)
      setDocuments(res.data ?? [])
    } catch {
      // silently ignore on background refresh
    }
    setDocsLoading(false)
  }, [supabase])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  async function handleDocSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!docName.trim() || !docContent.trim()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.post('/milla/documents', {
        name:    docName.trim(),
        type:    docType,
        content: docContent.trim(),
      }, session?.access_token)
      setDocName('')
      setDocContent('')
      setDocType('txt')
      toast('Document uploaded — Milla is processing it now.')
      // Reload after short delay to show processing state
      setTimeout(() => loadDocuments(), 800)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to upload document')
    }
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
    } catch {
      toast('Failed to delete document')
    }
    setDeletingId(null)
  }

  // ── Chat state ────────────────────────────────────────────────────────────

  const [sessions, setSessions] = useState<MillaSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<MillaSession | null>(null)
  const [messages, setMessages] = useState<MillaMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [sending, setSending] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasReadyDoc = documents.some(d => d.status === 'ready')

  const loadSessions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaSession[] }>('/milla/sessions', session?.access_token)
      setSessions(res.data ?? [])
    } catch {
      // silently ignore
    }
    setSessionsLoading(false)
  }, [supabase])

  useEffect(() => {
    if (tab === 'chat') loadSessions()
  }, [tab, loadSessions])

  async function loadMessages(sessionId: string) {
    setMessagesLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: MillaMessage[] }>(`/milla/sessions/${sessionId}/messages`, session?.access_token)
      setMessages(res.data ?? [])
    } catch {
      toast('Failed to load messages')
    }
    setMessagesLoading(false)
  }

  function selectSession(s: MillaSession) {
    setActiveSession(s)
    loadMessages(s.id)
  }

  async function handleNewSession() {
    setCreatingSession(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; sessionId: string }>('/milla/sessions', {}, session?.access_token)
      const newSession: MillaSession = {
        id:         res.sessionId,
        title:      null,
        created_at: new Date().toISOString(),
      }
      setSessions(prev => [newSession, ...prev])
      setActiveSession(newSession)
      setMessages([])
    } catch {
      toast('Failed to create session')
    }
    setCreatingSession(false)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || !activeSession || sending) return
    const userText = chatInput.trim()
    setChatInput('')
    setSending(true)

    // Optimistically add user message
    const optimisticUser: MillaMessage = {
      id:         `opt-${Date.now()}`,
      role:       'user',
      content:    userText,
      sources:    null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUser])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; reply: string; sources: MillaSource[] }>(
        `/milla/sessions/${activeSession.id}/chat`,
        { message: userText },
        session?.access_token,
      )

      const assistantMsg: MillaMessage = {
        id:         `opt-a-${Date.now()}`,
        role:       'assistant',
        content:    res.reply,
        sources:    res.sources?.length > 0 ? res.sources : null,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send message')
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
    }
    setSending(false)
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Milla — Virtual Assistant</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Train Milla on your business documents, then ask questions and get grounded answers.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {(['documents', 'chat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'bg-white border border-b-white border-gray-100 text-gray-900 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'documents' ? 'Documents' : 'Chat'}
          </button>
        ))}
      </div>

      {/* ── Documents tab ─────────────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div className="space-y-6">
          {/* Document list */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Uploaded documents</h2>
            </div>

            {docsLoading ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : documents.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-500 font-medium">No documents yet</p>
                <p className="text-sm text-gray-400 mt-1">
                  Add your first document to train Milla on your business.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {documents.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between px-5 py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {doc.type.toUpperCase()} &middot; {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={doc.status} />
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={deletingId === doc.id}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === doc.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add document form */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">Add document</h2>
            <form onSubmit={handleDocSubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Document name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={e => setDocName(e.target.value)}
                    placeholder="e.g. Pricing Deck Q2 2026"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as typeof docType)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                  >
                    <option value="txt">Text</option>
                    <option value="pdf">PDF</option>
                    <option value="url">URL</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Content <span className="text-gray-400 font-normal">(paste extracted text)</span>
                </label>
                <textarea
                  value={docContent}
                  onChange={e => setDocContent(e.target.value)}
                  placeholder="Paste the full text content of your document here…"
                  rows={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !docName.trim() || !docContent.trim()}
                className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Uploading…' : 'Upload document'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Chat tab ──────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* No-docs warning */}
          {!docsLoading && !hasReadyDoc && (
            <div className="p-5 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
              <span className="text-amber-500 text-lg shrink-0">!</span>
              <p className="text-sm text-amber-800">
                Add documents on the <button onClick={() => setTab('documents')} className="underline font-medium">Documents tab</button> before chatting with Milla. She needs your business content to give accurate answers.
              </p>
            </div>
          )}

          <div className="flex h-[68vh]">
            {/* Session sidebar */}
            <div className="w-56 border-r border-gray-100 flex flex-col shrink-0">
              <div className="px-3 py-3 border-b border-gray-100">
                <button
                  onClick={handleNewSession}
                  disabled={creatingSession}
                  className="w-full px-3 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {creatingSession ? 'Creating…' : '+ New chat'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {sessionsLoading ? (
                  <p className="text-xs text-gray-400 p-4">Loading…</p>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4">No sessions yet.</p>
                ) : (
                  sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => selectSession(s)}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors border-b border-gray-50 ${
                        activeSession?.id === s.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <p className="truncate">{s.title ?? 'Untitled chat'}</p>
                      <p className="text-gray-400 mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message area */}
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
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {messagesLoading ? (
                      <p className="text-sm text-gray-400 text-center py-8">Loading messages…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-8">
                        No messages yet. Ask Milla anything about your documents.
                      </p>
                    ) : (
                      messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                msg.role === 'user'
                                  ? 'bg-[#0066FF] text-white rounded-br-sm'
                                  : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-bl-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                              <SourceChips sources={msg.sources} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {sending && (
                      <div className="flex justify-start">
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                          <span className="text-xs text-gray-400">Milla is thinking…</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <form
                    onSubmit={handleSend}
                    className="px-4 py-3 border-t border-gray-100 flex gap-3 items-end"
                  >
                    <textarea
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend(e as unknown as React.FormEvent)
                        }
                      }}
                      placeholder="Ask Milla a question… (Enter to send, Shift+Enter for new line)"
                      rows={2}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || !chatInput.trim()}
                      className="px-4 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                    >
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
