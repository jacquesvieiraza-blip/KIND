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
// ⚠️ RUN IS THE ONE CONTROL WITH A REQUIRED FIELD. A run must carry a maximum the operator
// typed. It is never pre-filled — a defaulted ceiling is a number nobody chose — and the
// button stays disabled until it is a whole number of 1 or more.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { OPERATOR_RAIL, type OperatorRailStep, type StageChip } from '@/lib/vida-stage-copy'
import type { PanelCard, PanelAction } from '@/lib/vida-lifecycle-copy'

export function LifecyclePanel({
  clientName, subtitle, chips, rail, cards, actions, busy, message, onAction,
}: {
  clientName: string
  subtitle: string
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
      <h1 className="text-[22px] font-extrabold text-[#1f1235] leading-tight">{clientName}</h1>
      <p className="text-[13px] text-[#9b8ec4] mb-3">{subtitle}</p>

      {chips && chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((c, i) => (
            <span key={i} className={`text-[10.5px] font-bold rounded-full px-2.5 py-1 border ${
              c.tone === 'ok'   ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : c.tone === 'warn' ? 'bg-amber-50 border-amber-300 text-amber-800'
              : c.tone === 'stop' ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-white border-[#ded8e8] text-[#4c4459]'}`}>{c.text}</span>
          ))}
        </div>
      )}

      {rail && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 text-[10.5px] text-[#9b8ec4]">
          {OPERATOR_RAIL.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-[#ded8e8]">›</span>}
              <span className={step === rail.at ? 'font-extrabold text-[#5b21b6]' : ''}>{step}</span>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {cards.map((card, i) => {
          const exception = 'tone' in card && card.tone === 'exception'
          const shell = `rounded-xl px-3.5 py-3 border ${
            exception ? 'border-amber-300 bg-amber-50/70' : 'border-[#eee7f7] bg-white'}`
          const label = (
            <div className={`text-[11px] uppercase tracking-wide font-extrabold mb-1 ${
              exception ? 'text-amber-800' : 'text-[#9b8ec4]'}`}>{card.label}</div>
          )
          if (card.kind === 'fact') {
            return (
              <div key={i} className={shell}>
                {label}
                <div className="text-[15px] font-extrabold text-[#1f1235] leading-snug">{card.value}</div>
                {card.caption && <div className="text-[12.5px] text-[#9b8ec4] mt-0.5 leading-snug">{card.caption}</div>}
              </div>
            )
          }
          if (card.kind === 'note') {
            return (
              <div key={i} className={shell}>
                {label}
                <p className={`text-[13px] leading-relaxed ${exception ? 'text-amber-900' : 'text-[#5c5279]'}`}>{card.body}</p>
              </div>
            )
          }
          if (card.kind === 'stats') {
            return (
              <div key={i} className={shell}>
                {label}
                <div className="flex flex-wrap gap-x-7 gap-y-2">
                  {card.stats.map((s, k) => (
                    <div key={k}>
                      {/* Tabular numerals so a column of counts lines up rather than dancing. */}
                      <div className="text-[15px] font-extrabold text-[#1f1235] tabular-nums leading-none">{s.value}</div>
                      <div className="text-[12px] text-[#9b8ec4] mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          return (
            <div key={i} className={shell}>
              {label}
              <ul className="space-y-1">
                {card.ticks.map((t, k) => (
                  <li key={k} className="flex items-center gap-2 text-[13px]">
                    <span className={`w-[17px] h-[17px] rounded-full text-[10px] font-bold flex items-center justify-center ${
                      t.done ? 'bg-emerald-100 text-emerald-700' : 'bg-[#f1eefa] text-[#b3a9cc]'}`}>{t.done ? '✓' : '·'}</span>
                    <span className={t.done ? 'text-[#1f1235] font-semibold' : 'text-[#9b8ec4] font-semibold'}>{t.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {message && (
        <p className={`text-[12.5px] font-semibold mt-3 ${
          message.tone === 'ok' ? 'text-emerald-800'
          : message.tone === 'warn' ? 'text-amber-800' : 'text-red-700'}`}>{message.text}</p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
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
                    className="text-[13px] font-extrabold text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-xl px-4 py-2 disabled:opacity-40">
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
                    className="text-[13px] font-extrabold text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-xl px-4 py-2 disabled:opacity-40">
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
                  ? 'text-[13px] font-extrabold text-white bg-gradient-to-r from-[#7C3AED] to-[#EC4899] rounded-xl px-4 py-2 disabled:opacity-40'
                  : 'text-[13px] font-bold text-[#5c5279] border border-[#e3daf7] bg-white rounded-xl px-4 py-2 disabled:opacity-40'}>
                {busy === a.key ? '…' : a.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
