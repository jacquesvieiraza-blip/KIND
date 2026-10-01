'use client'

import { useState } from 'react'
import { api, AI_TURN_TIMEOUT_MS } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (R180 · R184 · #2505) — OBJECTION COACH, on the existing Coaching page, in the card
// style the sales-context card already uses (R167: no new screen, no new navigation). The client
// picks one of THEIR usual objections — or types one — and Milla answers: the real concern, a
// short answer in their own voice, one question to ask back. Full Coaching only (the page decides).

export type ObjectionOption = { text: string; source: 'yours' | 'reply' | 'meeting' }
type Answer = { concern: string; answer: string; question: string }

const SOURCE_LABEL: Record<ObjectionOption['source'], string> = {
  yours: 'From your sales context',
  reply: 'A prospect wrote',
  meeting: 'From a meeting',
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function ObjectionCoachCard({ options }: { options: ObjectionOption[] }) {
  const [picked, setPicked] = useState<string>('')
  const [typed, setTyped] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const objection = typed.trim() || picked

  const ask = async () => {
    if (!objection) return
    setBusy(true); setError(null); setAnswer(null)
    try {
      // ⚠️ A MODEL CALL — the 45s budget, never the 15s CRUD default (models.test).
      const r = await api.post<{ data: Answer }>('/my/programme/coaching/objection', { objection }, await token(), AI_TURN_TIMEOUT_MS)
      setAnswer(r.data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Milla couldn’t put that together just now. Please try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5 mb-3.5 max-w-3xl" data-testid="objection-coach">
      <div className="min-w-0">
        <b className="text-[15px] block leading-tight">Objection Coach</b>
        <span className="text-[12.5px] text-[#9b8ec4]">Pick an objection you hear, or type one. Milla shows what&apos;s behind it and how to answer, in your words.</span>
      </div>

      {options.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map(o => (
            <button key={o.text} type="button" title={SOURCE_LABEL[o.source]}
              onClick={() => { setPicked(o.text); setTyped(''); setAnswer(null) }}
              className={`text-left text-[12px] rounded-xl px-3 py-1.5 border max-w-full ${picked === o.text && !typed.trim()
                ? 'border-[#7C3AED] bg-[#f3ecff] text-[#1f1235]' : 'border-[#e4dcf7] bg-[#faf8ff] text-[#4c4368]'}`}>
              <span className="block text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">{SOURCE_LABEL[o.source]}</span>
              <span className="line-clamp-2">{o.text}</span>
            </button>
          ))}
        </div>
      )}

      <label className="block mt-3">
        <span className="block text-[12px] font-semibold text-[#1f1235] mb-1">Or type the objection</span>
        <input id="oc-typed" maxLength={300} value={typed} placeholder='e.g. "Now isn’t a good time."'
          onChange={e => { setTyped(e.target.value); setAnswer(null) }}
          className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[12.5px] bg-white" />
      </label>

      {error && <p className="text-[12.5px] text-red-700 mt-2">{error}</p>}
      <div className="mt-3">
        <button type="button" onClick={ask} disabled={busy || !objection}
          className="text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
          {busy ? 'Milla is working on it…' : '🎓 Coach me on this'}
        </button>
      </div>

      {answer && (
        <div className="mt-3 border border-[#e4dcf7] rounded-xl px-4 py-3.5 bg-gradient-to-br from-[#faf7ff] to-white space-y-2.5">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">What&apos;s likely behind it</span>
            <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{answer.concern}</p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">How you could answer</span>
            <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1 whitespace-pre-wrap">{answer.answer}</p>
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">A question to ask back</span>
            <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{answer.question}</p>
          </div>
        </div>
      )}
    </div>
  )
}
