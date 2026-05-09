import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeadsContent } from '@/components/leads/LeadsContent'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Lead Generation</h1>
        <p className="text-gray-500 text-sm mt-1">
          Precision-targeted B2B leads, AI-scored and POPIA-compliant.
        </p>
      </div>
      <LeadsContent token={session.access_token} />
    </div>
  )
}
