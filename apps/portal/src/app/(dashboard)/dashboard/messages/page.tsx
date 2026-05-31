'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Send, Loader2, MessageCircle } from 'lucide-react'

interface Message {
  id: string
  content: string
  sender_type: 'client' | 'admin'
  created_at: string
  read_at: string | null
}

export default function MessagesPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: Message[] }>('/clients/messages', session.access_token)
        setMessages(res.data ?? [])
      } catch { setMessages([]) }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || !token || sending) return
    setSending(true)
    setInput('')
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      content: text,
      sender_type: 'client',
      created_at: new Date().toISOString(),
      read_at: null,
    }
    setMessages(prev => [...prev, optimistic])
    try {
      const res = await api.post<{ data: Message }>('/clients/messages', { content: text }, token)
      setMessages(prev => prev.map(m => m.id === optimistic.id ? res.data : m))
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setInput(text)
    }
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBFF] to-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col h-screen max-h-screen">
        {/* Header */}
        <div className="mb-6 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-5 h-5 text-[#7C3AED]" />
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          </div>
          <p className="text-sm text-[#7B6FA0]">Direct line to the K.I.N.D team. We reply within 4 business hours.</p>
        </div>

        {/* Chat */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No messages yet — send us a message and we'll get back to you.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.sender_type === 'client'
                    ? 'bg-[#7C3AED] text-white rounded-br-sm'
                    : 'bg-white border border-purple-100/60 text-gray-900 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.sender_type === 'admin' && (
                    <p className="text-[10px] font-bold text-[#7C3AED] mb-1 uppercase tracking-wide">K.I.N.D Team</p>
                  )}
                  {msg.content}
                  <p className={`text-[10px] mt-1 ${msg.sender_type === 'client' ? 'text-purple-200' : 'text-[#9B8EC4]'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 flex gap-2 bg-white rounded-2xl border border-purple-100/60 p-2 shadow-sm">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none text-sm bg-transparent px-2 py-1.5 outline-none text-gray-900 placeholder:text-[#9B8EC4]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  )
}
