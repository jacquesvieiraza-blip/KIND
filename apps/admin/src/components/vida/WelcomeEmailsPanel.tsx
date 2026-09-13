'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// UNRESOLVED WELCOME EMAILS — the panel that makes R120's fail-closed state visible. (B3.)
//
// 🛑 VISIBILITY ONLY. R120 keeps the claim, refuses to resend past the 24-hour provider
// window, and surfaces the row for a person. There is no remediation route on the server and
// this panel does not invent one: the operator reads the Resend log and sends by hand. So the
// ONLY request this file makes is the GET, and `vida-welcome-unresolved.test.ts` asserts that
// the module behind it exposes no mutation at all.
//
// ⚠️ A FAILED READ IS RENDERED AS A FAILURE, LOUDLY. "No unresolved welcome emails" and "we
// could not find out" are different facts, and collapsing them would retire the only control
// the fail-closed design has.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import {
  loadUnresolvedWelcomes, welcomeOutcomeLabel, needsAPerson,
  WELCOME_EMPTY_COPY, WELCOME_UNRESOLVED_PATH,
  type WelcomeView,
} from '@/lib/vida-welcome-unresolved'

const when = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return iso }
}

export default function WelcomeEmailsPanel() {
  const [view, setView] = useState<WelcomeView>({ state: 'loading', rows: [], windowMs: null, error: null })

  const load = useCallback(async () => {
    setView(v => ({ ...v, state: 'loading' }))
    setView(await loadUnresolvedWelcomes(async path => {
      const r = await fetch(path)
      return r.json()
    }))
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <section className="border border-[#e6e0f5] rounded-2xl bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13.5px] font-semibold text-[#2b2145]">Welcome emails waiting on a person</h3>
          <p className="text-[12px] text-[#6b6188] mt-0.5">
            Past the 24-hour provider window we never resend automatically — a duplicate welcome is
            worse than a late one. These are the clients where a human has to check the Resend log.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="text-[12px] font-semibold text-[#7C3AED] border border-[#e6e0f5] rounded-lg px-2.5 py-1"
        >
          Reload
        </button>
      </div>

      {view.state === 'loading' && <p className="mt-3 text-[12.5px] text-[#9b8ec4]">Reading…</p>}

      {/* 🛑 NEVER "ALL CLEAR". */}
      {view.state === 'failed' && (
        <div role="alert" className="mt-3 border border-red-200 bg-red-50/60 rounded-xl px-3 py-2">
          <p className="text-[12.5px] font-semibold text-red-800">{view.error}</p>
        </div>
      )}

      {view.state === 'empty' && (
        <p className="mt-3 text-[12.5px] text-[#5b5175]">{WELCOME_EMPTY_COPY}</p>
      )}

      {view.state === 'ok' && (
        <ul className="mt-3 space-y-2">
          {view.rows.map(r => (
            <li key={r.client_id} className="border border-[#efeaf8] rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[13px] font-semibold text-[#2b2145]">
                  {r.company_name || '(no company name yet)'}
                </span>
                <span className={`text-[11.5px] font-semibold rounded-full px-2 py-0.5 ${
                  needsAPerson(r) ? 'bg-red-50 text-red-700' : 'bg-[#f4f0ff] text-[#7C3AED]'
                }`}>
                  {welcomeOutcomeLabel(r.outcome)}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-[#6b6188]">
                Client <code>{r.client_id}</code> · claimed {when(r.claimed_at)} ·{' '}
                {/* ⚠️ ALWAYS SHOWN. "No provider id" is the fact that makes this unresolved. */}
                provider id {r.provider_message_id ? <code>{r.provider_message_id}</code> : <strong>none</strong>}
              </p>
              {/* The server's own instruction, verbatim. */}
              <p className="mt-1 text-[12.5px] text-[#5b5175] leading-relaxed">{r.action}</p>
            </li>
          ))}
        </ul>
      )}

      <span hidden data-welcome-path={WELCOME_UNRESOLVED_PATH} />
    </section>
  )
}
