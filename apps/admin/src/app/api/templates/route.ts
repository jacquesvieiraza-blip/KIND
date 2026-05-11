import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET() {
  const db = adminDb()
  const { data, error } = await db
    .from('agreement_templates')
    .select('*')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const db = adminDb()
  const body = await req.json()
  const { name, description, file_path, file_url, sort_order } = body
  if (!name || !file_path || !file_url) {
    return NextResponse.json({ error: 'name, file_path, file_url required' }, { status: 400 })
  }
  const { data, error } = await db
    .from('agreement_templates')
    .insert({ name, description, file_path, file_url, sort_order: sort_order ?? 0 })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
