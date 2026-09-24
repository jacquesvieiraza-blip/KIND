'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE RIGHT COLUMN — this client's exact truth, and the ONE action if there is one.
//
// ── WHAT IT REPLACES ────────────────────────────────────────────────────────────────────
//
// ⛓️ Eleven permanent tabs, every one of them available at every stage, none of them saying
// where the client was. An operator opening a fresh signup was offered Sequence, Bookings,
// Pool and Exceptions — eleven doors and no answer to "what is happening and do I need to do
// anything". That question is now the whole column.
//
// ── ONE ACTION, AND ONLY WHEN IT IS GENUINELY REQUIRED ──────────────────────────────────
//
// 🛑 THE PANEL RENDERS ACTIONS; IT NEVER DECIDES THEM. Which control exists at which state is
// `lifecycleCopy`, from a verdict the SERVER derived — so a button cannot appear here because
// a browser thought it should. Most states have none at all, and that is the design: normal is
// silent, and a control offered at a moment it cannot succeed teaches an operator to distrust
// every control beside it.
//
// ── ⚑ 24 Sep (R145 step 7 · #42 #63 #64) — THE REDESIGN'S OPERATOR PATTERN ────────────────
//
// Founder: *"match everything. colors everything."* Every stage now reads the same way the
// redesign draws it: a STATUS BANNER (green "Vida status", or red "Needs you"), the facts as
// TILES in a three-column grid, each checklist as a TIMELINE section, then the one action.
// ⚠️ PRESENTATION ONLY. The banner, tiles and checklist are the SAME cards `lifecycleCopy` and
// `vida-stage-copy` already emit — nothing here computes a number or decides a state. The red
// banner is the server's `needsYou`, or a card the copy itself marked as an exception.
//
// ⚠️ RUN IS THE ONE CONTROL WITH A REQUIRED FIELD. A run must carry a maximum the operator
// typed. It is never pre-filled — a defaulted ceiling is a number nobody chose — and the
// button stays disabled until it is a whole number of 1 or more.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { OPERATOR_RAIL, type OperatorRailStep, type StageChip } from '@/lib/vida-stage-copy'
import type { PanelCard, PanelAction } from '@/lib/vida-lifecycle-copy'

export function LifecyclePanel({
  clientName, subtitle, chips, rail, cards, actions, busy, message, onAction, needsYou,
}: {
  clientName: string
  subtitle: string
  /**
   * ⚑ 24 Sep (R145 step 7 · #63) — the SERVER's verdict, which turns the banner red. Omitted
   * (a draft, which never needs an operator) leaves it to the cards' own exception tone.
   */
  needsYou?: boolean
  /**
   * ⚑ 22 Sep — the header chips: where the brief is, whether anything is owed, what has been
   * spent. Built by `stageChips`, never here — they are claims about a client and belong
   * somewhere a test can run them.
   */
  chips?: StageChip[]
  /**
   * ⚑ 22 Sep — the operator's work rail, and which step we are on.
   *
   * 🛑 IT IS NOT THE CLIENT'S JOURNEY. The six-stage FLOW ribbon above this panel answers
   * *where is the client*; this answers *what do we still owe them*, and it deliberately
   * starts at Inbox+people so the two never count the same ground twice — the defect that
   * cost us Section 0. `null` renders nothing, which is right for a client who has not
   * reached operator work yet.
   */
  rail?: { at: OperatorRailStep | null } | null
  cards: PanelCard[]
  actions: PanelAction[]
  busy: string | null
  message: { text: string; tone: 'ok' | 'warn' | 'err' } | null
  onAction: (key: PanelAction['key'], ceiling?: number, note?: string) => void
}) {
  const [ceiling, setCeiling] = useState('')
  // ⚑ 11 Sep (C40) — what the operator agreed on the calibration call. The server REFUSES a
  // calibrated restart without one, so this is a required field rather than a comment box.
  const [note, setNote] = useState('')
  const n = Number(ceiling.trim())
  const ceilingValid = Number.isInteger(n) && n >= 1

  // ── THE BANNER. The "NEXT ACTION" note is the redesign's banner text where the copy has one
  // (Signed up · Brief · Proof); otherwise the subtitle, with the Vida card's own words.
  const nextNote = cards.find((c): c is Extract<PanelCard, { kind: 'note' }> =>
    c.kind === 'note' && c.label.startsWith('NEXT ACTION'))
  const vidaFact = cards.find((c): c is Extract<PanelCard, { kind: 'fact' }> =>
    c.kind === 'fact' && c.label === 'Vida')
  const attn = needsYou === true || cards.some(c => 'tone' in c && c.tone === 'exception')
  const [bannerTitle, ...bannerRest] = (nextNote?.body ?? '').split('\n\n')
  const banner = {
    kicker: attn ? 'Needs you' : 'Vida status',
    title: nextNote ? bannerTitle : vidaFact ? `${subtitle} — ${vidaFact.value.toLowerCase()}` : subtitle,
    body: nextNote ? bannerRest.join(' ') : vidaFact?.caption ?? '',
  }
  // The banner already says them; drawing them again as cards would be the same fact twice.
  const rest = cards.filter(c => c !== nextNote && c !== vidaFact)
  const tiles = rest.filter((c): c is Extract<PanelCard, { kind: 'fact' }> => c.kind === 'fact')
  const sections = rest.filter(c => c.kind !== 'fact')

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="mv-ops-head">
        <div className="mv-ops-title min-w-0">
          <b className="truncate">{clientName}</b>
          <span>{subtitle} · operator truth</span>
        </div>
        {!attn && <div className="mv-automation">AI running · no action needed</div>}
      </div>
      <div className="flex flex-col gap-3.5 px-[22px] py-5">
      {/* ⚑ #64 — the operator rail, in the redesign's own style. Founder-ruled 22 Sep (option A):
          the steps the six-stage FLOW bar above already shows are trimmed, so it starts at
          Inbox + people. `at: null` lights nothing — a client not yet at operator work. */}
      {rail && (
        <div className="mv-rail-flow">
          {OPERATOR_RAIL.map((step, i) => (
            <span key={step}>
              {i > 0 && ' › '}
              {step === rail.at ? <b>{i + 1} {step}</b> : `${i + 1} ${step}`}
            </span>
          ))}
        </div>
      )}

      <div className={`mv-attention ${attn ? 'attn' : ''}`}>
        <div className="mv-kicker">{banner.kicker}</div>
        <h2>{banner.title}</h2>
        {banner.body && <p>{banner.body}</p>}
      </div>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <span key={i} className={`mv-pill ${c.tone === 'ok' ? 'good' : c.tone === 'warn' ? 'warn' : c.tone === 'stop' ? 'red' : ''}`}>{c.text}</span>
          ))}
        </div>
      )}

      {tiles.length > 0 && (
        <div className="mv-ops-grid">
          {tiles.map((card, i) => (
            <div key={i} className={`mv-ops-card ${card.tone === 'exception' ? '!border-[#f1d2d6] !bg-[#fff7f8]' : ''}`}>
              <label>{card.label}</label>
              <strong>{card.value}</strong>
              {card.caption && <small>{card.caption}</small>}
            </div>
          ))}
        </div>
      )}

      {sections.map((card, i) => {
        const exception = 'tone' in card && card.tone === 'exception'
        return (
          <div key={i} className={`mv-section ${exception ? '!border-[#f1d2d6]' : ''}`}>
            <div className="mv-section-head">
              <b>{card.label}</b>
              {card.kind === 'ticks' && <span>one canonical source</span>}
            </div>
            <div className="mv-section-body">
              {card.kind === 'note' && (
                <p className={`text-[11px] leading-relaxed whitespace-pre-line ${exception ? 'text-[var(--mv-red)]' : 'text-[var(--mv-muted)]'}`}>{card.body}</p>
              )}
              {card.kind === 'stats' && (
                <div className="mv-ops-grid">
                  {card.stats.map((s, k) => (
                    <div key={k} className="mv-ops-card">
                      {/* Tabular numerals so a column of counts lines up rather than dancing. */}
                      <strong className="tabular-nums !mt-0">{s.value}</strong>
                      <small>{s.label}</small>
                    </div>
                  ))}
                </div>
              )}
              {card.kind === 'ticks' && (
                <div className="mv-timeline">
                  {card.ticks.map((t, k) => (
                    <div key={k} className="mv-timeline-row">
                      <div className={`mv-state-dot ${t.done ? '' : 'wait'}`}>{t.done ? '✓' : k + 1}</div>
                      <div><b>{t.label}</b></div>
                      <span>{t.done ? 'done' : 'not yet'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {message && (
        <p className={`text-[12.5px] font-semibold ${
          message.tone === 'ok' ? 'text-emerald-800'
          : message.tone === 'warn' ? 'text-amber-800' : 'text-red-700'}`}>{message.text}</p>
      )}

      {actions.length > 0 && (
        <div className="mv-cta-row flex-wrap">
          {actions.map(a => {
            if (a.needsCeiling) {
              return (
                <span key={a.key} className="flex items-center gap-2">
                  {/* 🛑 NEVER PRE-FILLED. An unscoped run and an unbounded run are the two
                      mistakes this control exists to make impossible, and a default is how
                      the second one arrives by accident. */}
                  <input
                    value={ceiling}
                    onChange={e => setCeiling(e.target.value)}
                    inputMode="numeric"
                    placeholder="Max emails"
                    aria-label="Maximum emails this run may send"
                    className="w-28 text-[12.5px] border border-[#e3daf7] rounded-lg px-2.5 py-2"
                  />
                  <button
                    onClick={() => onAction(a.key, n)}
                    disabled={!!busy || !ceilingValid}
                    className="mv-btn primary disabled:opacity-40">
                    {busy === a.key ? '…' : a.label}
                  </button>
                </span>
              )
            }
            if (a.needsNote) {
              return (
                <span key={a.key} className="flex items-center gap-2 flex-wrap w-full">
                  {/* 🛑 REQUIRED, BECAUSE THE SERVER REQUIRES IT. A restart granted on an
                      unexamined client would spend a set on the targeting that already failed
                      twice — so `mayRestartCalibrated` refuses without a note, and a control
                      that could submit an empty one would only produce a refusal. */}
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="What did you agree on the call?"
                    aria-label="What was agreed on the calibration call"
                    className="flex-1 min-w-[220px] text-[12.5px] border border-[#e3daf7] rounded-lg px-2.5 py-2"
                  />
                  <button
                    onClick={() => onAction(a.key, undefined, note.trim())}
                    disabled={!!busy || note.trim().length === 0}
                    className="mv-btn primary disabled:opacity-40">
                    {busy === a.key ? '…' : a.label}
                  </button>
                </span>
              )
            }
            return (
              <button
                key={a.key}
                onClick={() => onAction(a.key)}
                disabled={!!busy}
                className={a.kind === 'primary'
                  ? 'mv-btn primary disabled:opacity-40'
                  : 'mv-btn disabled:opacity-40'}>
                {busy === a.key ? '…' : a.label}
              </button>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
