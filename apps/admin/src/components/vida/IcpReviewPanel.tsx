'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// NEEDS ICP REVIEW — where a Brief we could not translate reaches a person. (S1-RT-005.)
//
// 🛑 THE CLIENT IS NOT WAITING ON THEMSELVES. They finished their Brief, in their own words,
// and our CLOSED provider vocabularies could not take some of it. Until this panel is used,
// the server REFUSES their Proof and every provider spend — so an unattended row here is a
// client sitting still, not a tidy-up task.
//
// ⚠️ EVERY DECISION IS IN `lib/vida-icp-review.ts`. This file renders and posts; it grants
// nothing, validates nothing the server does not re-validate, and holds no vocabulary of its
// own — the values offered come from the server's own lists so the two cannot drift.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import {
  readReviews, readResolve, fieldsUnderReview, maySubmit,
  fieldDecision, PROVIDER_MAX_ITEMS,
  FIELD_LABEL, ICP_REVIEW_PATH, ICP_REVIEW_EMPTY_COPY, resolvePath,
  type ReviewView, type ReviewRow, type ProviderField,
} from '@/lib/vida-icp-review'

const when = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function IcpReviewPanel() {
  const [view, setView] = useState<ReviewView>({ state: 'loading', rows: [], vocabularies: { industries: [], seniority_levels: [], company_sizes: [] }, error: null })
  const [picked, setPicked] = useState<Record<string, Partial<Record<ProviderField, string[]>>>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    setView(v => ({ ...v, state: 'loading' }))
    try {
      const r = await fetch(ICP_REVIEW_PATH)
      setView(readReviews(await r.json()))
    } catch {
      setView(v => ({ ...v, state: 'error', error: 'The review rail could not be read.' }))
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggle = (icpId: string, field: ProviderField, value: string) => {
    setPicked(p => {
      const row = { ...(p[icpId] ?? {}) }
      const cur = row[field] ?? []
      row[field] = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      return { ...p, [icpId]: row }
    })
  }

  const submit = async (row: ReviewRow) => {
    const values = picked[row.icp_id] ?? {}
    const gate = maySubmit(row, values)
    if (!gate.ok) { setMsg({ id: row.icp_id, ok: false, text: gate.reason }); return }
    // ⚠️ THE CONFIRMATION NAMES THE CLIENT AND SAYS WHAT IT UNBLOCKS. This lifts a block the
    // server is actively holding; an operator must know that is what they are doing.
    if (!confirm(
      `Save this targeting translation for ${row.company_name ?? 'this client'}?\n\n`
      + 'Their Brief is already confirmed. This records the provider values for the words we '
      + 'could not translate, and UNBLOCKS their Proof.\n\n'
      + 'Nothing is sent and nothing is charged by this.',
    )) return
    setBusy(row.icp_id); setMsg(null)
    try {
      const r = await fetch(resolvePath(row.icp_id), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: row.client_id, values }),
      })
      const out = readResolve(await r.json())
      setMsg({ id: row.icp_id, ok: out.ok, text: out.message })
      if (out.ok) await load()
    } catch {
      setMsg({ id: row.icp_id, ok: false, text: 'The resolution was not saved, so nothing changed and this client is still waiting.' })
    } finally { setBusy(null) }
  }

  return (
    <div className="border border-[#eee7f7] rounded-2xl bg-white p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <b className="text-[14px]">Needs ICP review</b>
          <p className="text-[12px] text-[#6b5f8c] mt-0.5">
            These clients finished their Brief in their own words, and some of it could not be
            translated into provider values. <b>Their Proof and all sourcing are refused until
            this is done.</b>
          </p>
        </div>
        <button onClick={() => void load()} disabled={view.state === 'loading'}
          className="text-[12px] font-semibold text-[#7C3AED] disabled:opacity-50">
          {view.state === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {/* ⚠️ A FAILED READ IS RENDERED AS A FAILURE, LOUDLY. An operator shown an empty rail
          because the read failed will not go looking for the client we are refusing to
          source for — so "nobody is waiting" and "we could not find out" never share copy. */}
      {view.state === 'error' && (
        <div className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {view.error ?? 'The review rail could not be read.'}
        </div>
      )}

      {view.state === 'ready' && view.rows.length === 0 && (
        <p className="text-[12.5px] text-[#6b5f8c]">{ICP_REVIEW_EMPTY_COPY}</p>
      )}

      {view.state === 'ready' && view.rows.map(row => (
        <div key={row.icp_id} className="border border-[#eee7f7] rounded-xl p-3 mt-3">
          <div className="flex items-baseline justify-between gap-3">
            <b className="text-[13.5px]">{row.company_name ?? '(company not yet given)'}</b>
            <span className="text-[11.5px] text-[#9b8ec4]">waiting since {when(row.review_at)}</span>
          </div>

          {/* THE CONFIRMED CUSTOMER TRUTH — what they actually said, so the operator
              translates FROM their words rather than guessing at an empty field. */}
          <div className="text-[12px] text-[#6b5f8c] mt-1.5">
            <div>Their market, in their words: <b className="text-[#1f1235]">{row.customer_truth?.target_category || '—'}</b></div>
            <div>Type of company: <b className="text-[#1f1235]">{row.customer_truth?.target_company_type || '—'}</b></div>
          </div>

          {fieldsUnderReview(row).map(field => {
            // 🛑 ⚑ 14 Sep (S1-PD-07) — THE WHOLE DECISION, ON SCREEN. The operator used to see
            // only the unresolved words, pick a translation, and unknowingly replace the half
            // that had already mapped. The server now merges; this is so nobody has to INFER
            // that an invisible value survives. Four lines: what already mapped, what needs
            // translating, what they chose, and what the ICP will actually hold.
            const d = fieldDecision(row, field, picked[row.icp_id]?.[field] ?? [])
            return (
            <div key={field} className="mt-3">
              <div className="text-[12.5px] font-semibold">{FIELD_LABEL[field]}</div>
              {d.alreadyMapped.length > 0 && (
                <div className="text-[12px] text-[#6b5f8c]">
                  Already mapped: <b className="text-[#1f1235]">{d.alreadyMapped.join(', ')}</b>
                  <span className="text-[#9b8ec4]"> — kept, not replaced</span>
                </div>
              )}
              <div className="text-[12px] text-[#6b5f8c] mb-1.5">
                Needs translation: {d.needsTranslation.map(s => `“${s}”`).join(' · ') || '—'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {view.vocabularies[field].map(v => {
                  const on = (picked[row.icp_id]?.[field] ?? []).includes(v)
                  return (
                    <button key={v} onClick={() => toggle(row.icp_id, field, v)}
                      className={`text-[12px] rounded-lg px-2 py-1 border ${on
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED] font-semibold'
                        : 'bg-white text-[#1f1235] border-[#e7ddf7]'}`}>
                      {v}
                    </button>
                  )
                })}
              </div>
              <div className={`text-[12px] mt-1.5 ${d.overMax ? 'text-red-700' : 'text-[#6b5f8c]'}`}>
                Final after Save: <b className="text-[#1f1235]">{d.final.join(' + ') || '—'}</b>
                {d.overMax && (
                  <span> — that is {d.final.length}, and the provider takes at most {PROVIDER_MAX_ITEMS}.
                    Nothing will be saved until you choose the final list yourself.</span>
                )}
              </div>
            </div>
          )})}

          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => void submit(row)} disabled={busy === row.icp_id}
              className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-1.5 disabled:opacity-50">
              {busy === row.icp_id ? 'Saving…' : 'Save translation & unblock Proof'}
            </button>
            {msg?.id === row.icp_id && (
              <span className={`text-[12px] ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
