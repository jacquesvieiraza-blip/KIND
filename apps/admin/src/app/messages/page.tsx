export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { MessageCircle } from 'lucide-react'
import { ClientsTabs } from '@/components/ClientsTabs'

interface Message {
  id: string
  client_id: string
  content: string
  sender_type: 'client' | 'admin'
  created_at: string
  read_at: string | null
  clients: { company_name: string } | null
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

async function getMessages(): Promise<Message[]> {
  try {
    const res = await fetch(`${API}/admin/messages`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
    const json = await res.json()
    return json.data ?? []
  } catch { return [] }
}

export default async function MessagesPage() {
  const messages = await getMessages()

  const byClient: Record<string, Message[]> = {}
  for (const m of messages) {
    if (!byClient[m.client_id]) byClient[m.client_id] = []
    byClient[m.client_id].push(m)
  }

  const clientThreads = Object.entries(byClient).sort(([, a], [, b]) =>
    new Date(b[b.length-1].created_at).getTime() - new Date(a[a.length-1].created_at).getTime()
  )

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6"><ClientsTabs /></div>
      <div className="flex items-center gap-3 mb-8">
        <MessageCircle className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Client Messages</h1>
        <span className="ml-auto text-sm text-gray-500">{clientThreads.length} threads</span>
      </div>

      {clientThreads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No messages yet</div>
      ) : (
        <div className="space-y-4">
          {clientThreads.map(([clientId, msgs]) => {
            const company = msgs[0]?.clients?.company_name ?? clientId.slice(0, 8)
            const unread = msgs.filter(m => m.sender_type === 'client' && !m.read_at).length
            const last = msgs[msgs.length - 1]
            return (
              <div key={clientId} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{company}</span>
                    {unread > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-600 text-white">{unread} new</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(last.created_at).toLocaleDateString('en-ZA', { dateStyle: 'short' })}
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {msgs.slice(-5).map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                        msg.sender_type === 'admin'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-50 border border-gray-100 text-gray-900'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <form action={`/api/admin-reply`} method="POST" className="mt-3 flex gap-2">
                  <input type="hidden" name="clientId" value={clientId} />
                  <input
                    name="content"
                    placeholder="Reply to client…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg">
                    Send
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
