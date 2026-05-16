export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const db = adminDb()
  const formData = await req.formData()
  const file = formData.get('file') as File
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const sort_order = parseInt(formData.get('sort_order') as string || '0')

  if (!file || !name) {
    return NextResponse.json({ error: 'file and name required' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })
  }

  const fileName = `${Date.now()}-${file.name.replace(/[^a-z0-9.-]/gi, '_')}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data: uploadData, error: uploadError } = await db.storage
    .from('agreement-templates')
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = db.storage.from('agreement-templates').getPublicUrl(uploadData.path)

  const { data: existing } = await db
    .from('agreement_templates')
    .select('id')
    .eq('name', name)
    .single()

  let data, error
  if (existing) {
    ({ data, error } = await db
      .from('agreement_templates')
      .update({ description, file_path: uploadData.path, file_url: urlData.publicUrl, sort_order, is_active: true })
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ({ data, error } = await db
      .from('agreement_templates')
      .insert({ name, description, file_path: uploadData.path, file_url: urlData.publicUrl, sort_order, is_active: true })
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
