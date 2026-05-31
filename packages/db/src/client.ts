import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
}

export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  realtime: { transport: ws as any },
})
