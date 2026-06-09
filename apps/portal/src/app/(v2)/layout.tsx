export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SidebarV2Preview } from '@/components/layout/SidebarV2Preview'
import { Coins, Bell } from 'lucide-react'

export default async function V2RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let credits = 0
  try {
    const { data: clientRow } = await supabase
      .from('clients').select('credit_balance').eq('user_id', user.id).maybeSingle()
    credits = clientRow?.credit_balance ?? 0
  } catch { }

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarV2Preview userEmail={user.email || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top-right header — account/credits/profile live here (slim layout) */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-end gap-3 px-6 shrink-0">
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full text-amber-700 bg-amber-50">
            <Coins className="w-3.5 h-3.5" /> {credits.toLocaleString()}
          </span>
          <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#a78bfa] shrink-0" title={user.email || ''} />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
