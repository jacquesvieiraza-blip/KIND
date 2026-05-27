'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle } from 'lucide-react'

export function ReplyForm({ replyId, fromEmail }: {
  replyId: string
  fromEmail: string
}) {
  const [body, setBody]       = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId, body }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        setBody('')
      } else {
        setError(data.error ?? 'Failed to send')
      }
    } catch {
      setError('Network error — try again')
    }
    setSending(false)
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 mt-3 text-green-600 text-xs font-medium">
        <CheckCircle className="w-4 h-4" /> Reply sent to {fromEmail}
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
      <span className="text-xs font-semibold text-gray-600">Reply to {fromEmail}</span>
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        rows={4}
        placeholder="Type your reply…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none bg-white"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSend}
        disabled={!body.trim() || sending}
        className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        {sending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Send className="w-3.5 h-3.5" />}
        {sending ? 'Sending…' : 'Send reply'}
      </button>
    </div>
  )
}
