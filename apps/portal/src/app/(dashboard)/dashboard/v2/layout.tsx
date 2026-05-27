export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

// V2 preview — all agents unlocked, no payment gates, no trial overlay
export default async function V2Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let creditBalance = 0
  try {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('credit_balance')
      .eq('user_id', user.id)
      .maybeSingle()
    creditBalance = clientRow?.credit_balance ?? 0
  } catch { }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userEmail={user.email || ''}
        creditBalance={creditBalance}
        hasFigsy={true}
        hasMilla={true}
        hasVida={true}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
