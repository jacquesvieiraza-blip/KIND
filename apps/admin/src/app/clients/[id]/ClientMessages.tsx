'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

const ADMIN_API = '/api/admin'

interface Message {
  id: string
  sender_type: 'client' | 'admin'
  content: string
  read_at: string | null
  created_at: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA') + ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

export function ClientMessages({ clientId, initialMessages }: { clientId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState(initialMessages)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`${ADMIN_API}/clients/${clientId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      const data = await res.json() as { success: boolean; data: Message }
      if (data.success) {
        setMessages((prev) => [...prev, data.data])
        setContent('')
      }
    } catch { /* ignore */ }
    setSending(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 flex flex-col" style={{ height: '500px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 mt-10">No messages yet</p>
        ) : messages.map((msg) => {
          const isAdmin = msg.sender_type === 'admin'
          return (
            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] flex flex-col gap-1 ${isAdmin ? 'items-end' : 'items-start'}`}>
                <p className="text-xs text-gray-400 px-1">{isAdmin ? 'K.I.N.D' : 'Client'}</p>
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isAdmin ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <p className="text-xs text-gray-400 px-1">{formatTime(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-end gap-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent) }
            }}
            placeholder="Send a message to the client… (Enter to send)"
            rows={1}
            className="flex-1 resize-none text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button type="submit" disabled={!content.trim() || sending}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}
