import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  nextRailValue, shouldSurfaceError, shouldPollNow, RAIL_REFRESH_MS,
  visibleDrafts, reconcileDrafts,
// ⚠️ RELATIVE, NOT THE `@` ALIAS. That alias is declared in `apps/api/vitest.config.ts` and
// NOT in the root config — and `scripts/check.sh` runs vitest from the repository ROOT. An
// aliased import here passes `cd apps/api && vitest` and dies in the one run that gates a
// deploy, which is the exact split the root config's own header warns about.
} from '../../../admin/src/lib/vida-rail-refresh'

// ═══════════════════════════════════════════════════════════════════════════════════════
// C20 — A NEW CLIENT APPEARS IN AN ALREADY-OPEN VIDA, AND A BLIP NEVER EMPTIES THE RAIL.
//
// 🛑 THE DEFECT. Every read behind the client rail ran in `useEffect(…, [])` — once, on
// mount, never again. A client who signed up while an operator had Vida open did not exist
// on that screen until somebody reloaded. Preview 07 is exactly that moment.
//
// ⚠️ THE FIX INTRODUCES ITS OWN RISK, AND THAT IS WHAT MOST OF THIS FILE IS ABOUT. A poll
// that assigns whatever the last response said will, on the first transient 500, replace a
// working rail with an empty one under the operator's cursor. Stale is survivable; flickering
// to empty is not, because the operator cannot tell it from "this client is gone".
//
// ⚠️ THE DECISIONS ARE PURE SO THEY CAN BE PROVED. This repo has no DOM harness for admin
// components, so the alternative was a source guard that cannot execute anything. The
// policy lives in a module instead; the thin effect wiring is guarded separately below, and
// that guard is honest about being structural.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① a good read replaces', () => {
  it('the first successful load becomes the value', () => {
    expect(nextRailValue(null, { ok: true, value: ['a'] })).toEqual(['a'])
  })

  it('a later successful read replaces the previous one — new signups appear', () => {
    expect(nextRailValue(['a'], { ok: true, value: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('⚠️ INCLUDING WHEN IT IS EMPTY — a client genuinely removed must be able to leave', () => {
    // Deliberate: "keep the last non-empty answer" would pin a departed client to the rail
    // forever, which is a different and worse lie than a stale one.
    expect(nextRailValue(['a'], { ok: true, value: [] })).toEqual([])
  })
})

describe('② a failed read changes nothing', () => {
  it('🛑 a blip does NOT blank a loaded rail', () => {
    expect(nextRailValue(['a', 'b'], { ok: false })).toEqual(['a', 'b'])
  })

  it('a failure before anything loaded leaves it unloaded, not empty', () => {
    // ⚠️ `null` IS "NEVER LOADED", WHICH IS NOT "LOADED AND EMPTY". Collapsing the two would
    // render "no clients" for a read that never succeeded — the #565 shape exactly.
    expect(nextRailValue(null, { ok: false })).toBeNull()
  })

  it('repeated failures still change nothing', () => {
    let v: string[] | null = ['a']
    for (let i = 0; i < 5; i++) v = nextRailValue(v, { ok: false })
    expect(v).toEqual(['a'])
  })
})

describe('③ errors are surfaced only when there is nothing to show', () => {
  it('a first-load failure is named to the operator', () => {
    expect(shouldSurfaceError(null)).toBe(true)
  })

  it('🛑 a failure over good data is silent — a banner per blip trains people to ignore banners', () => {
    expect(shouldSurfaceError(['a'])).toBe(false)
    expect(shouldSurfaceError([])).toBe(false)
  })
})

describe('④ a hidden tab reads nothing', () => {
  it('polls while visible', () => {
    expect(shouldPollNow(false)).toBe(true)
  })

  it('🛑 does not poll while hidden', () => {
    // A console parked in a background tab for a day would otherwise put 1,440 rounds of
    // four endpoints through the proxy for a screen nobody is looking at.
    expect(shouldPollNow(true)).toBe(false)
  })

  it('the interval is a minute — current enough for a signup, quiet enough for a proxy', () => {
    expect(RAIL_REFRESH_MS).toBe(60_000)
  })
})

describe('⑤ the effect actually uses it — structural, and says so', () => {
  // ⚠️ THIS IS A SOURCE GUARD AND IT PROVES ONLY WIRING. It cannot prove the interval fires;
  // there is no DOM harness in this repo for admin components. What it CAN stop is the
  // regression that caused C20 in the first place — the loader existing and nothing calling
  // it twice — and the two leaks a hand-rolled poll always ships with.
  const src = readFileSync(
    join(__dirname, '../../../..', 'apps/admin/src/components/vida/VidaClients.tsx'), 'utf8',
  )

  it('the rail imports the policy rather than re-deciding it', () => {
    expect(src).toContain("from '@/lib/vida-rail-refresh'")
    expect(src).toContain('nextRailValue')
    expect(src).toContain('shouldSurfaceError')
  })

  // ⛓️ TIGHTENED AFTER A TEETH RUN THAT DID NOT BITE. The first version of this guard only
  // asserted `nextRailValue` appeared SOMEWHERE in the file — so replacing ONE call site
  // with a raw `setClients(rows)` left it green while the rail blanked on every blip, which
  // is the precise defect the module exists to stop. "The helper is imported" is not the
  // same claim as "every writer goes through it", and only the second one is worth making.
  it('🛑 EVERY rail setter goes through the policy — no raw assignment survives', () => {
    for (const setter of ['setClients', 'setWork', 'setDrafts']) {
      const calls = src.match(new RegExp(`${setter}\\([^)]*`, 'g')) ?? []
      expect(calls.length, `${setter} is never called`).toBeGreaterThan(0)
      for (const call of calls) {
        expect(call, `${setter} assigns a raw value instead of using nextRailValue: ${call}`)
          .toContain('prev =>')
      }
    }
  })

  // ── ⚑ MVP1 — AND THE TWO SOURCES ARE RECONCILED WHERE THEY ARE RENDERED ────────────
  it('🛑 16 · the draft section renders the DEDUPLICATED list, never the raw read', () => {
    // A rail that maps `drafts` directly shows a person twice for a round — once as a draft
    // and once as the client they just became. `visibleDrafts` is what prevents it, and a
    // component that imports it and then renders the raw array has not used it.
    expect(src).toContain('visibleDrafts(drafts, clients)')
    const renders = src.match(/\{\(?drafts[^}]*\)?\.map\(/g) ?? []
    expect(renders, 'the draft section maps the raw read instead of the reconciled list').toEqual([])
    expect(src).toContain('shownDrafts.map(')
  })

  it('🛑 17 · the drafts read is told how the CLIENTS read went, in the same round', () => {
    // Without this the "promoted while the clients read failed" round drops the person from
    // the rail entirely. `reconcileDrafts` cannot decide it without that fact.
    expect(src).toContain('reconcileDrafts')
    expect(src).toContain('clientsOk')
    // ⚠️ AND IT IS AWAITED, NOT READ OFF A MUTABLE FLAG. Two concurrent `.then`s racing over
    // a `let` would record a perfectly good clients read as a failure whenever the drafts
    // response happened to land first.
    expect(src).toContain('await clientsRead')
    // ⚠️ COMMENTS STRIPPED FIRST, and not as a loophole: the file EXPLAINS the mutable-flag
    // bug in prose right above the fix, and a guard that punished the explanation would be
    // deleted rather than obeyed. What must not exist is the flag in the CODE.
    const code = src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')
    expect(code, 'clientsOk is a mutable flag two concurrent reads race over')
      .not.toMatch(/let\s+clientsOk/)
  })

  it('it refreshes on an interval AND when the operator comes back to the tab', () => {
    expect(src).toContain('setInterval')
    expect(src).toContain('RAIL_REFRESH_MS')
    expect(src).toContain('visibilitychange')
  })

  it('🛑 both are torn down — an interval that outlives its component is a leak', () => {
    expect(src).toContain('clearInterval')
    expect(src).toContain('removeEventListener')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 — ONE PERSON, ONE ROW, ACROSS TWO SOURCES THAT FAIL INDEPENDENTLY.
//
// 🛑 THE RAIL NOW MERGES TWO READS: confirmed clients and open onboarding drafts. They are
// separate endpoints in one round, so between rounds the SAME PERSON can appear in both —
// the clients read has picked up their brand-new row while the drafts read still holds the
// pre-promotion one, or the drafts read failed and kept it. A person rendered twice on an
// operator's rail reads as two prospects and double-counts the pipeline by eye.
//
// ⚠️ AND THE OPPOSITE PARTIAL ROUND IS THE ONE THAT IS EASY TO MISS: the drafts read succeeds
// (they are gone — promoted) while the clients read FAILS (their client row has not arrived).
// Both answers are individually correct and the person is on NEITHER.
// ═══════════════════════════════════════════════════════════════════════════════════════

type D = { id: string; user_id?: string | null }
type C = { id: string; user_id?: string | null }

const DRAFT: D = { id: 'draft-1', user_id: 'user-1' }
const OTHER: D = { id: 'draft-2', user_id: 'user-2' }
const CLIENT: C = { id: 'client-1', user_id: 'user-1' }

describe('16 · Vida never shows a draft and its confirmed client at the same time', () => {
  it('🛑 a draft whose person is now a client is dropped', () => {
    expect(visibleDrafts([DRAFT], [CLIENT])).toEqual([])
  })

  it('everyone else stays — dedup removes one person, not the section', () => {
    expect(visibleDrafts([DRAFT, OTHER], [CLIENT])).toEqual([OTHER])
  })

  it('🛑 it holds when the DRAFTS read is the stale one (it failed and kept the row)', () => {
    // `nextRailValue` correctly keeps the old draft list on a failed read; the dedup is what
    // stops that kept row appearing beside the client the other read just picked up.
    const kept = nextRailValue<D[]>([DRAFT], { ok: false })
    expect(visibleDrafts(kept, [CLIENT])).toEqual([])
  })

  it('🛑 DEDUPLICATED ON DURABLE IDENTITY, NEVER ON A DISPLAY NAME', () => {
    // Same person, different wording on each side of promotion — must still be ONE row.
    const d = { id: 'draft-1', user_id: 'user-1', company_name: 'Redmayne' }
    const c = { id: 'client-1', user_id: 'user-1', company_name: 'Redmayne & Co.' }
    expect(visibleDrafts([d], [c])).toEqual([])
    // Two genuinely different companies that share a name must NOT be merged.
    const rival = { id: 'draft-9', user_id: 'user-9', company_name: 'Redmayne & Co.' }
    expect(visibleDrafts([rival], [c])).toEqual([rival])
  })

  it('a draft with no user id is never silently swallowed by somebody else’s client', () => {
    const anon = { id: 'draft-x' }
    expect(visibleDrafts([anon], [CLIENT])).toEqual([anon])
  })

  it('no clients loaded yet means nothing to reconcile against — drafts show', () => {
    expect(visibleDrafts([DRAFT], null)).toEqual([DRAFT])
  })

  it('no drafts is an empty section, never a crash', () => {
    expect(visibleDrafts(null, [CLIENT])).toEqual([])
  })
})

describe('17 · a failed refresh preserves the combined rail', () => {
  it('🛑 G · a failed drafts read changes nothing — the section does not clear', () => {
    expect(reconcileDrafts([DRAFT, OTHER], { ok: false }, true)).toEqual([DRAFT, OTHER])
  })

  it('🛑 G · and a failed CLIENTS read does not clear the clients either', () => {
    expect(nextRailValue([CLIENT], { ok: false })).toEqual([CLIENT])
  })

  it('a good round takes the new truth — a departed draft genuinely leaves', () => {
    expect(reconcileDrafts([DRAFT, OTHER], { ok: true, value: [OTHER] }, true)).toEqual([OTHER])
  })

  it('🛑 a draft that vanished while the CLIENTS read failed is KEPT, not dropped', () => {
    // They were promoted, so they left the drafts answer — but the client list could not be
    // read, so nothing can have replaced them. Dropping the row here is the zero-row window.
    expect(reconcileDrafts([DRAFT, OTHER], { ok: true, value: [OTHER] }, false))
      .toEqual([OTHER, DRAFT])
  })

  it('…and it is let go the moment a good clients read can replace it', () => {
    const kept = reconcileDrafts([DRAFT, OTHER], { ok: true, value: [OTHER] }, false)
    expect(visibleDrafts(kept, [CLIENT]), 'the kept row outlived its purpose').toEqual([OTHER])
  })

  it('nothing is INVENTED — only rows that were already on screen can survive', () => {
    expect(reconcileDrafts(null, { ok: true, value: [] }, false)).toEqual([])
    expect(reconcileDrafts([], { ok: true, value: [] }, false)).toEqual([])
  })

  it('and the kept row cannot accumulate — a good round clears it', () => {
    const kept = reconcileDrafts([DRAFT], { ok: true, value: [] }, false)
    expect(kept).toEqual([DRAFT])
    expect(reconcileDrafts(kept, { ok: true, value: [] }, true)).toEqual([])
  })

  it('🛑 F · the rail never reverts to a single source — clients and drafts are both kept', () => {
    // One source failing must not take the other with it, in either direction.
    expect(nextRailValue([CLIENT], { ok: false })).toEqual([CLIENT])
    expect(reconcileDrafts([OTHER], { ok: false }, false)).toEqual([OTHER])
  })
})

describe('18 · a confirmed client who never had a draft is unaffected', () => {
  it('a rail of clients with no drafts at all renders the clients', () => {
    expect(visibleDrafts([], [CLIENT])).toEqual([])
    expect(nextRailValue([CLIENT], { ok: true, value: [CLIENT] })).toEqual([CLIENT])
  })

  it('a legacy client row with no user_id never removes an unrelated draft', () => {
    const legacy = { id: 'client-legacy' }
    expect(visibleDrafts([DRAFT], [legacy])).toEqual([DRAFT])
  })
})
