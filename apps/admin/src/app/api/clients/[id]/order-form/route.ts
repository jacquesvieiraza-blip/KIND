import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = adminDb()
  const { data, error } = await db
    .from('order_forms')
    .select('*')
    .eq('client_id', params.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = adminDb()
  const body = await req.json()
  const { products, total_monthly_usd, start_date, scope_notes, created_by_email } = body

  if (!products || !total_monthly_usd) {
    return NextResponse.json({ error: 'products and total_monthly_usd required' }, { status: 400 })
  }

  // Upsert — one order form per client
  const { data, error } = await db
    .from('order_forms')
    .upsert({
      client_id:          params.id,
      products,
      total_monthly_usd,
      start_date:         start_date || null,
      scope_notes:        scope_notes || null,
      status:             'sent',
      sent_at:            new Date().toISOString(),
      created_by_email:   created_by_email || 'admin',
    }, { onConflict: 'client_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
