'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { FileText, Plus, Send, Eye, X, Loader2, CheckCircle } from 'lucide-react'

interface Proposal {
  id: string
  title: string
  status: 'draft' | 'sent' | 'viewed' | 'signed'
  recipient_email: string | null
  recipient_name: string | null
  sent_at: string | null
  signed_at: string | null
  created_at: string
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft:  { label: 'Draft',  className: 'bg-gray-100 text-gray-600' },
  sent:   { label: 'Sent',   className: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Viewed', className: 'bg-amber-100 text-amber-700' },
  signed: { label: 'Signed', className: 'bg-green-100 text-green-700' },
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProposalsPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // New proposal form state
  const [newTitle, setNewTitle] = useState('')
  const [newRecipientName, setNewRecipientName] = useState('')
  const [newRecipientEmail, setNewRecipientEmail] = useState('')
  const [newBody, setNewBody] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const res = await api.get<Proposal[]>('/proposals', session.access_token)
        setProposals(Array.isArray(res) ? res : [])
      } catch { setProposals([]) }
      setLoading(false)
    })
  }, [])

  async function handleCreate() {
    if (!token || creating || !newTitle.trim()) return
    setCreating(true)
    setError(null)
    try {
      const result = await api.post<Proposal>('/proposals', {
        title: newTitle.trim(),
        recipient_name: newRecipientName.trim() || undefined,
        recipient_email: newRecipientEmail.trim() || undefined,
        content: { body: newBody.trim() },
      }, token)
      setProposals(prev => [result, ...prev])
      setShowCreate(false)
      setNewTitle('')
      setNewRecipientName('')
      setNewRecipientEmail('')
      setNewBody('')
      showToast('Proposal created')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create proposal')
    }
    setCreating(false)
  }

  async function handleSend(id: string) {
    if (!token) return
    setSendingId(id)
    try {
      const result = await api.post<Proposal>(`/proposals/${id}/send`, {}, token)
      setProposals(prev => prev.map(p => p.id === id ? result : p))
      showToast('Proposal sent!')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send proposal')
    }
    setSendingId(null)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#7C3AED] text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E1152]">Proposals</h1>
          </div>
          <p className="text-sm text-[#7C3AED]/60">
            Send branded proposals and get e-signatures — no DocuSign needed
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Proposal
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1E1152]">New Proposal</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. FIGSY AI SDR — 3-month engagement"
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient name</label>
                  <input
                    type="text"
                    value={newRecipientName}
                    onChange={e => setNewRecipientName(e.target.value)}
                    placeholder="John Smith"
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient email</label>
                  <input
                    type="email"
                    value={newRecipientEmail}
                    onChange={e => setNewRecipientEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proposal body</label>
                <textarea
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  rows={6}
                  placeholder="Describe the scope of work, deliverables, timeline, and pricing…"
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : 'Create proposal'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 border border-purple-100 text-sm font-medium rounded-xl hover:border-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proposals table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">All Proposals</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">{proposals.length} total</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading proposals…</div>
        ) : proposals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="w-8 h-8 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No proposals yet — create your first one above</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Sent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Signed</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {proposals.map(p => (
                  <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900 max-w-xs truncate">{p.title}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      <div>{p.recipient_name ?? '—'}</div>
                      {p.recipient_email && <div className="text-[#9B8EC4]">{p.recipient_email}</div>}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(p.sent_at)}</td>
                    <td className="px-5 py-3.5 text-xs">
                      {p.signed_at ? (
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {formatDate(p.signed_at)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
                        {(p.status === 'draft' || p.status === 'viewed') && p.recipient_email && (
                          <button
                            onClick={() => handleSend(p.id)}
                            disabled={sendingId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                          >
                            {sendingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
