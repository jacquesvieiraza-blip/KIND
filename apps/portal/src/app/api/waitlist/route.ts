import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { first_name, email, product } = await req.json()

    if (!first_name || !email || !product) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
    )

    const { error } = await supabase.from('waitlist').insert({ first_name, email, product })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already on the waitlist' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
