'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import { Send, Loader2, MessageSquare } from 'lucide-react'

interface Message {
  id: string
  sender_type: 'client' | 'admin'
  content: string
  read_at: string | null
  created_at: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  if (isToday) return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

export function MessagesClient({ token }: { token: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<{ data: Message[] }>('/platform-messages', token)
      setMessages(res.data ?? [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res = await api.post<{ data: Message }>('/platform-messages', { content: content.trim() }, token)
      setMessages((prev) => [...prev, res.data])
      setContent('')
    } catch { /* ignore */ }
    setSending(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">K.I.N.D Team</p>
          <p className="text-xs text-gray-400">Your dedicated AI Intelligence team</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sender_type === 'client'
            return (
              <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isClient ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isClient
                        ? 'bg-brand-500 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <p className="text-xs text-gray-400 px-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) }
            }}
            placeholder="Type a message… (Enter to send)"
            rows={1}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="flex items-center justify-center w-10 h-10 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
