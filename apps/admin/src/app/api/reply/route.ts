import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM = 'K.I.N.D <hello@get-kind.com>'

export async function POST(req: NextRequest) {
  try {
    const { replyId, body } = (await req.json()) as { replyId: string; body: string }

    if (!replyId || !body?.trim()) {
      return NextResponse.json({ success: false, error: 'Missing replyId or body' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: reply } = await supabase
      .from('figsy_replies')
      .select('from_email, subject, lead_id, client_id')
      .eq('id', replyId)
      .single()

    if (!reply) {
      return NextResponse.json({ success: false, error: 'Reply not found' }, { status: 404 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY!)

    const reSubject = reply.subject?.startsWith('Re:')
      ? reply.subject
      : `Re: ${reply.subject ?? 'Your enquiry'}`

    const { data: sendResult, error: sendError } = await resend.emails.send({
      from:    FROM,
      to:      reply.from_email,
      subject: reSubject,
      text:    body,
    })

    if (sendError) throw sendError

    // Log the sent reply
    await supabase.from('figsy_replies').insert({
      client_id:      reply.client_id,
      from_email:     FROM,
      subject:        reSubject,
      body:           body,
      classification: 'sent_reply',
      processed_at:   new Date().toISOString(),
      lead_id:        reply.lead_id,
    })

    return NextResponse.json({ success: true, data: { sent: true, resend_id: (sendResult as any)?.id } })
  } catch (err) {
    console.error('[admin/api/reply]', err)
    return NextResponse.json({ success: false, error: 'Failed to send reply' }, { status: 500 })
  }
}
