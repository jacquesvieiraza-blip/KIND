'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (R180 · Coaching #2494) — WHAT'S CONVERTING, as one section on the existing Programme
// screen, in its existing style (R167). Growth and above (or Full Coaching). Every sentence is the
// server's (`lib/whats-converting.ts`), counted from the client's own replies and meetings — this
// component adds no number and no wording of its own, so the screen and Milla's "What's working?"
// answer are the same findings.
//
// ⚠️ A FOUNDERS CLIENT SEES NOTHING HERE. The API answers 403 for their plan, and this section is
// simply absent — no locked card and no sell, the same quiet the 25% moment keeps with Founders.
// An unreadable read is absent too: a finding is never shown on a number we could not read.

type Finding = { kind: string; text: string }
type Converting = { ready: boolean; findings: Finding[]; note: string | null; basis: { positiveReplies: number; meetings: number } }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function WhatsConverting() {
  const [v, setV] = useState<Converting | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const r = await api.get<{ data: Converting }>('/my/programme/whats-converting', await token())
        if (live) setV(r.data)
      } catch { if (live) setV(null) }
    })()
    return () => { live = false }
  }, [])

  if (!v) return null
  return (
    <div className="mv-section" data-testid="whats-converting">
      <div className="mv-section-head">
        <b>What&rsquo;s converting</b>
        <span>from your own replies and meetings</span>
      </div>
      <div className="mv-section-body">
        {v.findings.length === 0 ? (
          <p className="mv-muted-note">{v.note}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {v.findings.map(f => (
              <li key={f.kind + f.text} className="text-[12.5px] text-[#4c4368] leading-relaxed">{f.text}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
