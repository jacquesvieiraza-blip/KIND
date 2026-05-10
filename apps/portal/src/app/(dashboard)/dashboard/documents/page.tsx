export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DocumentsClient } from './DocumentsClient'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-500 mt-1">Your agreements, proposals and documents from K.I.N.D</p>
      </div>
      <DocumentsClient token={session.access_token} />
    </div>
  )
}
