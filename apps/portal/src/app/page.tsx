export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    // Milla IS the client portal now — a signed-in client lands on the desk.
    // The old dashboard stays reachable at /dashboard for operators/partners.
    if (user) redirect('/milla')
  } catch {
    // Supabase unavailable — fall through to login
  }
  redirect('/login')
}
