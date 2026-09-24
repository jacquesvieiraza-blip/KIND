'use client'

import { useState } from 'react'

/**
 * ── ⚑ 24 Sep (R145 step 2) — ONE TARGETING FILTER, DRAWN AS THE REDESIGN DRAWS IT ─────────
 *
 * Founder: *"match everything. colors everything."* The redesign's "Your targeting" is a list
 * of Apollo-style filter rows: the name, the chosen values as chips, and a caret that opens a
 * tick-list (searchable where the list is long, typed where Apollo takes free text).
 * ⛓️ WAS `PickField` — a chip box with a floating pop-over, in a three-column grid.
 *
 * ⚠️ NOT A `<select>`, for the reason the old field gave: every one of these is multi-value, and
 * a tick-list is the same gesture on a phone as on a desk.
 */
export function FilterRow({ label, options, free, chosen, placeholder, onChange, max, said, sentAs, note, open: startOpen, extra }: {
  label: string
  options: string[]
  free: boolean
  chosen: string[]
  placeholder: string
  onChange: (next: string[]) => void
  /** The most that may be chosen; a further tick is ignored rather than refused by the server. */
  max?: number
  /** The client's own words — kept visible under a changed field, so a mistaken pick shows. */
  said?: string
  /** The values Apollo actually receives, from the server's own request builder. */
  sentAs?: string[]
  note?: string
  open?: boolean
  /** A second, closed tick-list above the typed one (the "Never contact" kinds). */
  extra?: { options: string[]; chosen: string[]; onChange: (next: string[]) => void }
}) {
  const [draft, setDraft] = useState('')
  const searchable = !free && options.length > 20
  const full = max !== undefined && chosen.length >= max
  const toggle = (v: string) => {
    if (chosen.includes(v)) { onChange(chosen.filter(x => x !== v)); return }
    if (full) return
    onChange([...chosen, v])
  }
  const q = draft.trim().toLowerCase()
  // A long closed list shows what is chosen first, then the first matches — never all 150 at once.
  const shown = free ? chosen
    : searchable ? [...chosen, ...options.filter(o => !chosen.includes(o) && (q === '' || o.toLowerCase().includes(q))).slice(0, 40)]
    : options
  const add = () => {
    const v = draft.trim()
    // A duplicate is a no-op, not an error.
    if (v && !chosen.includes(v)) onChange([...chosen, v])
    setDraft('')
  }
  const all = [...(extra?.chosen ?? []), ...chosen]
  return (
    <details className="mv-filter-row" open={startOpen}>
      <summary>
        <span className="mv-filter-name">{label}</span>
        <span className="mv-filter-value">
          {all.length === 0
            ? <span className="mv-empty">{placeholder}</span>
            : all.map(v => <span key={v} className="mv-chipx">{v}</span>)}
          {said ? <span className="mv-v truncate max-w-[220px]" title={said}>you said: {said}</span> : null}
        </span>
        <span className="mv-chev">⌄</span>
      </summary>
      <div className="mv-filter-drop">
        {extra ? (
          <div className="mv-option-list">
            {extra.options.map(v => {
              const on = extra.chosen.includes(v)
              return (
                <button key={v} type="button" className={`mv-option text-left ${on ? 'on' : ''}`}
                  onClick={() => extra.onChange(on ? extra.chosen.filter(x => x !== v) : [...extra.chosen, v])}>
                  <span className="mv-check">{on ? '✓' : ''}</span>{v}
                </button>
              )
            })}
          </div>
        ) : null}
        {free || searchable ? (
          <div className="mv-filter-search">
            <span>⌕</span>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (free && e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder={free ? 'Type one and press enter' : 'Search the list'} />
            {free ? <button type="button" onClick={add} className="text-[9px] font-bold text-[color:var(--mv-accent-deep)] shrink-0">Add</button> : null}
          </div>
        ) : null}
        {full ? <div className="mv-muted-note mt-2">Up to {max}. Untick one to choose another.</div> : null}
        <div className={`mv-option-list ${searchable ? 'max-h-52 overflow-y-auto' : ''}`}>
          {/* A closed field lists its vocabulary; a free one lists what the client has given us,
              so removing is the same gesture as adding. */}
          {shown.map(v => {
            const on = chosen.includes(v)
            return (
              <button key={v} type="button" className={`mv-option text-left ${on ? 'on' : ''}`} onClick={() => toggle(v)}>
                <span className="mv-check">{on ? '✓' : ''}</span>{v}
              </button>
            )
          })}
          {free && chosen.length === 0
            ? <span className="mv-muted-note">Nothing yet. Type above, or just tell Milla.</span>
            : null}
        </div>
        {/* ⚠️ THE PROVIDER VALUES, PRINTED AS APOLLO RECEIVES THEM — the server runs the real
            request builder, so this line cannot drift from the search. */}
        {sentAs && sentAs.length > 0
          ? <div className="mv-muted-note mt-2 font-mono">stored &amp; sent as: {sentAs.join(' · ')}</div>
          : null}
        {note ? <div className="mv-muted-note mt-1">{note}</div> : null}
      </div>
    </details>
  )
}
