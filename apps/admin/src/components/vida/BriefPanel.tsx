'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 (Preview 07) — OPENING SOMEBODY WHOSE BRIEF MILLA IS STILL COLLECTING.
//
// 🛑 WHAT THIS MAKES REACHABLE. Until the client confirms there is no `clients` row, so this
// person had no screen at all: an operator could see nothing between "signed up" and "a client
// appeared". Preview 07 — ten of eleven facts held, confirmation still pending — was not a
// state the product could show.
//
// ⚠️ IT IS THE SAME PANEL SHELL AS A CLIENT'S, ON PURPOSE. `LifecyclePanel` already renders
// fact, ticks and note cards; a second panel component would be a second set of paddings,
// weights and card shapes to keep in step with it. What differs is only what is inside, and
// that comes from `briefPanelCopy`.
//
// ⚠️ AND IT OFFERS NOTHING TO PRESS. `actions={[]}` is the whole interaction design: the brief
// is Milla's to collect and the confirmation is the client's to give. There is no operator
// action that can move either, so there is no control here that could imply otherwise.
//
// ⚠️ ONE REFRESH POLICY IN THIS CONSOLE, NOT TWO. The interval, the hidden-tab rule and the
// "a failed read changes nothing" rule are `@/lib/vida-rail-refresh` — the same module the
// rail beside this panel uses. A panel with its own polling rules would drift from the row
// that opened it, and the operator would see two different answers about one person.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { LifecyclePanel } from '@/components/vida/LifecyclePanel'
import { briefPanelCopy } from '@/lib/vida-brief-copy'
import { stageChips, nextActionCard, signUpRecordCard } from '@/lib/vida-stage-copy'
import { nextRailValue, shouldPollNow, RAIL_REFRESH_MS } from '@/lib/vida-rail-refresh'

/** The projection `/operator/brief-drafts` returns. Never a client — see `VidaClients.tsx`. */
type DraftRow = {
  id: string
  company_name: string | null
  contact_name: string | null
  created_at: string
  brief: { collected: number; total: number; missing: string[]; complete: boolean }
  confirmed_at: string | null
}

/**
 * ⚠️ THREE OUTCOMES, NOT TWO. "Read it and they are there", "read it and they are GONE"
 * (promoted — they are a client now, which is the good ending) and "could not read it at all"
 * are different answers, and collapsing the last two would tell an operator that somebody
 * confirmed when in truth the proxy blinked.
 */
type Reading =
  | { kind: 'draft'; row: DraftRow }
  | { kind: 'gone' }
  | null

/**
 * ⚑ 22 Sep — WHAT WILL BE SENT, AND WHAT THE POOL WOULD CARRY.
 *
 * 🛑 THE OPERATOR SEES THE PROVIDER'S OWN FIELD NAMES AND VALUES — `person_seniorities:
 * c_suite · vp · director`, not "C-Suite". An operator asked *why did this search return
 * those people* needs the REQUEST, not a friendly restatement of it. The server runs the real
 * request builder, so this cannot drift from the search.
 *
 * 🛑 AND THE OPERATOR SEES BOTH CAPACITY NUMBERS (founder-ruled 22 Sep). The client is told
 * what we can commit to at the limit; Vida also gets the benchmark and the gap between them,
 * because the distance between the rate we expect and the point we stop is only useful to the
 * people who can act on it.
 *
 * ⛓️ 23 Sep — THE GAP IS NOT A BUFFER ANY MORE. It used to be work we would absorb past the
 * plan; the founder removed that promise, so it now only tells an operator how much further a
 * programme may still have to run before it stops.
 */
type DraftFacts = {
  provider: { field: string; values: string[] }[]
  matched: number
  committed: number
  benchmark: number
  headroom: number
  known: boolean
  spend: { batches: number; records: number; usd: number }
}

export function BriefPanel({ draftId }: { draftId: string }) {
  const [reading, setReading] = useState<Reading>(null)
  const [error, setError] = useState<string | null>(null)
  const [facts, setFacts] = useState<DraftFacts | null>(null)

  const load = useCallback(async (alive: () => boolean) => {
    try {
      const j = await fetch('/api/proxy/operator/brief-drafts').then(r => r.json())
      if (!alive()) return
      if (!j?.success) throw new Error(j?.error || 'the API returned no data')
      const row = ((j.data ?? []) as DraftRow[]).find(d => d.id === draftId) ?? null
      // ⚠️ A SUCCESSFUL READ REPLACES, INCLUDING WITH "GONE". The route returns only
      // UNPROMOTED drafts, so an absent row on a good read means this person confirmed and
      // became a client. That must reach the screen; it is the outcome the panel is waiting for.
      setReading(prev => nextRailValue<Reading>(prev, { ok: true, value: row ? { kind: 'draft', row } : { kind: 'gone' } }))
      setError(null)
      // ⚠️ SECOND READ, AND ONLY WHILE THE DRAFT IS STILL A DRAFT. It runs a free provider
      // count; there is nothing to count for somebody who has already become a client, and
      // their own client-scoped panels answer from then on.
      if (row) {
        try {
          const f = await fetch(`/api/proxy/operator/brief-drafts/${draftId}/facts`).then(r => r.json())
          if (!alive()) return
          // ⚠️ A FAILED FACTS READ LEAVES THE PANEL AS IT WAS. The brief counts above are the
          // panel's job; these are additional evidence, and blanking them on a transient 500
          // would read as "nothing is being sent", which is a different and alarming claim.
          if (f?.success) setFacts(f.data ?? null)
        } catch { /* silent — the panel keeps whatever it last showed */ }
      }
    } catch (e) {
      if (!alive()) return
      // ⚠️ A FAILED READ CHANGES NOTHING. Blanking the panel on a transient 500 would read as
      // "they are gone", which is precisely the sentence this panel must not say by accident.
      setReading(prev => {
        if (prev === null) setError(e instanceof Error ? e.message : 'Their brief could not be read')
        return nextRailValue<Reading>(prev, { ok: false })
      })
    }
  }, [draftId])

  useEffect(() => {
    let alive = true
    const isAlive = () => alive
    setReading(null); setError(null)
    void load(isAlive)
    const timer = setInterval(() => { if (shouldPollNow(document.hidden)) void load(isAlive) }, RAIL_REFRESH_MS)
    const onVisible = () => { if (!document.hidden) void load(isAlive) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  if (reading === null) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
        <p className="text-[13px] text-[#9b8ec4] max-w-sm">
          {error
            ? `Their brief could not be read (${error}). Nothing has changed, and nothing is sending.`
            : 'Reading their brief…'}
        </p>
      </div>
    )
  }

  if (reading.kind === 'gone') {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
        <p className="text-[13px] text-[#9b8ec4] max-w-sm">
          They confirmed their brief. They are a client now — pick them out of the list above.
        </p>
      </div>
    )
  }

  const d = reading.row
  const copy = briefPanelCopy({
    collected: d.brief.collected,
    total: d.brief.total,
    missing: d.brief.missing,
    confirmedAt: d.confirmed_at,
  })

  // ── 🛑 ⚑ 22 Sep — THE OPERATOR'S THREE EXTRA CARDS, APPENDED NEVER SUBSTITUTED ────────
  //
  // ⚠️ `copy.cards` COMES FIRST AND IS UNTOUCHED. The brief count and its subtitle are what
  // this panel has always been for; these are evidence added beneath, and a future change to
  // `briefPanelCopy` must not have to know they exist.
  //
  // ⚠️ AND THEY ONLY APPEAR WHEN THERE IS SOMETHING TO SAY. A draft with no targeting yet
  // renders the brief count alone, rather than three cards of zeros that read as a broken
  // panel rather than an early one.
  // ── 🛑 ⚑ 22 Sep — THE LOCKED OPERATOR HEADER ────────────────────────────────────────
  //
  // 🛑 NORMAL IS SILENT. A signed-up client and a healthy Brief are both states where an
  // operator has nothing to do, and the preview says so at both — "NEXT ACTION · NONE". A
  // Needs-You list with everybody on it is read exactly as often as one with nobody on it.
  //
  // ⚠️ A DRAFT NEVER NEEDS AN OPERATOR, and that is a fact rather than an optimistic default:
  // there is no control on this panel, because the brief is Milla's to collect and the
  // confirmation is the client's to give. `needsYou: false` is therefore correct by
  // construction here — the escalation paths live on CLIENT rows, which a draft is not.
  const stage = d.brief.collected > 0 ? 'brief' : 'signup'
  const chips = stageChips({
    brief: { collected: d.brief.collected, total: d.brief.total },
    spendUsd: facts ? facts.spend.usd : null,
    records: facts ? facts.spend.records : null,
    batches: facts ? facts.spend.batches : null,
    needsYou: false,
  })

  const extra: typeof copy.cards = [
    nextActionCard(stage, { needsYou: false }),
    // ⚠️ PROOF IS ZERO HERE BY DEFINITION. A draft has no client row, so no pass can have
    // been claimed against it — the step reads "not yet" as a fact, not as a missing read.
    signUpRecordCard(
      {
        brief: { collected: d.brief.collected, total: d.brief.total },
        spendUsd: facts ? facts.spend.usd : null,
        records: null, batches: null, needsYou: false,
      },
      typeof d.confirmed_at === 'string' && d.confirmed_at.trim() !== '',
      0,
    ),
  ]
  if (facts) {
    // 🛑 BOTH CAPACITY NUMBERS, WHICH IS THE WHOLE POINT OF SHOWING THEM HERE. The client is
    // told what we can commit to at the worst case; the operator also gets the benchmark and
    // the gap between them, because the buffer is only useful to the people who can act on it.
    if (facts.known) {
      extra.push({
        kind: 'stats',
        label: 'Provisional cap',
        stats: [
          { value: `~${facts.committed}`, label: 'sellable · at the limit' },
          { value: String(facts.benchmark), label: 'at the benchmark' },
          // ⛓️ 23 Sep — LABEL WAS 'headroom'. It named work we would absorb past the plan, and
          // the founder removed that promise. The number is unchanged; it is now simply the
          // distance between the rate we expect and the point we stop.
          { value: String(facts.headroom), label: 'gap · plan vs limit' },
          { value: facts.matched.toLocaleString(), label: 'returned by People Search · free' },
        ],
      })
    }
    // ⚠️ PROVIDER FIELD NAMES, DELIBERATELY. `c_suite`, not "C-Suite" — this is the request,
    // and the client's own panel carries the same values in plain English.
    const sent = facts.provider.filter(f => f.values.length > 0)
    if (sent.length > 0) {
      extra.push({
        kind: 'note',
        label: 'What will be sent to the provider',
        body: sent.map(f => `${f.field}: ${f.values.join(' · ')}`).join('\n'),
      })
    }
    extra.push({
      kind: 'stats',
      label: 'Spend',
      stats: [
        { value: `$${facts.spend.usd.toFixed(2)}`, label: 'sourcing spend' },
        { value: String(facts.spend.records), label: 'records bought' },
        // ⚠️ "BATCHES", NOT "PROVIDER CALLS". `sourcing_ledger` records granted batches, not
        // HTTP requests, and nothing in the codebase counts the latter. Naming it for what it
        // is beats a number that looks precise and is not.
        { value: String(facts.spend.batches), label: 'ledgered batches' },
      ],
    })
  }

  return (
    <LifecyclePanel
      clientName={d.company_name || d.contact_name || 'Signed up'}
      subtitle={copy.subtitle}
      chips={chips}
      cards={[...copy.cards, ...extra]}
      actions={[]}
      busy={null}
      message={null}
      onAction={() => { /* there is no action on this panel — see the header */ }}
    />
  )
}
