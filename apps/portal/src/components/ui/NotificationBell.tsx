'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, Zap, CreditCard, ShieldCheck, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'low_credits' | 'interested_reply' | 'new_consented_lead' | 'trial_expiring'
  title: string
  message: string
  created_at: string
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  low_credits:        { icon: <CreditCard className="w-4 h-4" />,  color: 'text-amber-500 bg-amber-50' },
  interested_reply:   { icon: <Zap className="w-4 h-4" />,         color: 'text-green-600 bg-green-50' },
  new_consented_lead: { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  trial_expiring:     { icon: <Clock className="w-4 h-4" />,       color: 'text-red-500 bg-red-50' },
}

export function NotificationBell() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await api.get<{ data: Notification[] }>('/clients/me/notifications', session.access_token)
        setNotifications(res.data ?? [])
      } catch {}
    }
    load()
    // Refresh every 2 minutes
    const iv = setInterval(load, 120000)
    return () => clearInterval(iv)
  }, [supabase])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-gray-900 text-sm">Notifications</p>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">All clear — nothing to action.</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {notifications.map(n => {
                const meta = TYPE_META[n.type] ?? { icon: <Bell className="w-4 h-4" />, color: 'text-gray-500 bg-gray-50' }
                return (
                  <div key={n.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        {n.type === 'low_credits' && (
                          <Link href="/dashboard/billing" className="text-xs text-blue-600 hover:underline mt-1 inline-block" onClick={() => setOpen(false)}>Top up →</Link>
                        )}
                        {n.type === 'interested_reply' && (
                          <Link href="/dashboard/figsy" className="text-xs text-blue-600 hover:underline mt-1 inline-block" onClick={() => setOpen(false)}>View in FIGSY →</Link>
                        )}
                        {n.type === 'new_consented_lead' && (
                          <Link href="/dashboard/leads" className="text-xs text-blue-600 hover:underline mt-1 inline-block" onClick={() => setOpen(false)}>View leads →</Link>
                        )}
                        {n.type === 'trial_expiring' && (
                          <Link href="/dashboard/billing" className="text-xs text-blue-600 hover:underline mt-1 inline-block" onClick={() => setOpen(false)}>Add billing →</Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
