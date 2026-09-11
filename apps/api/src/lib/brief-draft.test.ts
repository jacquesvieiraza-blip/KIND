import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PRE-CONFIRMATION BRIEF — PERSISTED, COUNTED ONCE, AND CLOSED AT PROMOTION.
//
// 🛑 THE STATE PREVIEW 07 SHOWS AND THE PRODUCT COULD NOT REACH. `/auth/signup` creates an
// auth user and nothing else; the `clients` row is created by the CONFIRM click. The Brief
// therefore lived in React state in one tab — a closed tab destroyed it, and Vida could not
// see a person who had not confirmed. "Signed up 14 minutes ago … 10 of 11 … confirmation
// pending" had no data behind it.
//
// ⚠️ THE POINT OF EVERY CASE BELOW IS THAT THIS IS NOT A SECOND BRIEF MODEL. Completeness is
// never decided in `brief-draft.ts`; it is decided by the same `briefFacts()` the builder gate
// calls, over the same eleven-fact list. If a draft could disagree with the builder about
// whether a brief is done, that is the second model Preview 07 was corrected to delete.
//
// ⚠️ AND ONE AUTHORITATIVE WRITABLE STATE AT A TIME. Before promotion the draft is writable
// truth; after promotion it is evidence and refuses writes. Without that refusal the draft's
// category wording and the ICP's could drift apart with nothing to say which was right.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  rows: [] as Row[],
  /** the next read throws — "the migration has not been applied" */
  unreadable: false,
  /** the next write fails */
  unwritable: false,
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  let limitN: number | undefined
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    order() { return q },
    limit(n: number) { limitN = n; return q },
    async maybeSingle() {
      if (state.unreadable) throw new Error(`${name} does not exist`)
      const hit = state.rows.filter(r => filters.every(f => f(r)))
      return { data: hit[0] ?? null, error: null }
    },
    upsert(row: Row) {
      return {
        select: () => ({
          async maybeSingle() {
            if (state.unwritable) return { data: null, error: { message: 'no such table' } }
            const i = state.rows.findIndex(r => r.user_id === row.user_id)
            const made = i >= 0
              ? { ...state.rows[i], ...row }
              : { id: `draft-${state.rows.length + 1}`, confirmed_at: null, promoted_client_id: null,
                  promoted_at: null, created_at: '2026-09-11T14:00:00Z', ...row }
            if (i >= 0) state.rows[i] = made; else state.rows.push(made)
            return { data: made, error: null }
          },
        }),
      }
    },
    update(patch: Row) {
      return {
        async eq(c: string, v: unknown) {
          if (state.unwritable) return { error: { message: 'no such table' } }
          for (const r of state.rows) if (r[c] === v) Object.assign(r, patch)
          return { error: null }
        },
      }
    },
    then(resolve: (v: unknown) => unknown) {
      if (state.unreadable) return resolve({ data: null, error: { message: 'does not exist' } })
      let hit = state.rows.filter(r => filters.every(f => f(r)))
      if (typeof limitN === 'number') hit = hit.slice(0, limitN)
      return resolve({ data: hit, error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))

import {
  briefDraftFor, saveBriefDraft, draftProgress, mayConfirmBrief,
  markBriefDraftPromoted, openBriefDrafts,
} from './brief-draft'
import { BRIEF_FACTS } from '@kind/shared'

const USER = 'user-1'

/** Ten of the eleven — everything except the target's organisational form. */
const TEN: Record<string, unknown> = {
  contact_name: 'Ellis Warner',
  company_name: 'Redmayne & Co.',
  website: 'https://redmayne.co.uk',
  what_they_do: 'White-label paid search and paid social for agencies.',
  target_category: 'Digital marketing',
  geographies: ['United Kingdom'],
  company_sizes: ['11–50'],
  job_titles: ['Founder', 'CEO', 'Managing Director'],
  exclusions: 'No recruitment agencies.',
  desired_outcome: 'Book qualified sales meetings with founders, CEOs and MDs.',
}

beforeEach(() => {
  state.rows = []
  state.unreadable = false
  state.unwritable = false
})

describe('① 1 · a draft exists without any clients row', () => {
  it('a signed-up user with nothing collected has no draft yet', async () => {
    expect(await briefDraftFor(USER)).toBeNull()
  })

  it('the first fact creates the draft — and no client is involved at all', async () => {
    const r = await saveBriefDraft(USER, { company_name: 'Redmayne & Co.' })
    expect(r.ok).toBe(true)
    const d = await briefDraftFor(USER)
    expect(d?.userId).toBe(USER)
    expect(d?.promotedClientId).toBeNull()
    expect(d?.confirmedAt).toBeNull()
  })
})

describe('② 2 · partial facts persist, and later answers do not erase earlier ones', () => {
  it('facts accumulate across separate saves', async () => {
    await saveBriefDraft(USER, { company_name: 'Redmayne & Co.' })
    await saveBriefDraft(USER, { contact_name: 'Ellis Warner' })
    await saveBriefDraft(USER, { geographies: ['United Kingdom'] })
    const d = await briefDraftFor(USER)
    expect(d?.facts.company_name).toBe('Redmayne & Co.')
    expect(d?.facts.contact_name).toBe('Ellis Warner')
    expect(d?.facts.geographies).toEqual(['United Kingdom'])
  })

  it('🛑 a save carrying one new answer does NOT wipe the ten before it', async () => {
    await saveBriefDraft(USER, TEN)
    await saveBriefDraft(USER, { target_company_type: 'agency' })
    expect(draftProgress(await briefDraftFor(USER)).count).toBe(11)
  })

  it('a page refresh reads back what the server already knows', async () => {
    await saveBriefDraft(USER, TEN)
    // A "new tab" is just another read of the same user's draft.
    expect(draftProgress(await briefDraftFor(USER)).count).toBe(10)
  })
})

describe('③ 3 & 4 · the count is the shared one, and company type is load-bearing', () => {
  it('ten facts with the company type missing is 10 of 11', async () => {
    await saveBriefDraft(USER, TEN)
    const p = draftProgress(await briefDraftFor(USER))
    expect(p.count).toBe(10)
    expect(p.total).toBe(11)
    expect(p.missing).toEqual(['company_type'])
  })

  it('adding the company type makes it 11 of 11', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    expect(draftProgress(await briefDraftFor(USER)).complete).toBe(true)
  })

  it('🛑 there is no second list — the draft counts through the canonical eleven', async () => {
    await saveBriefDraft(USER, {})
    const p = draftProgress(await briefDraftFor(USER))
    expect(p.missing).toEqual([...BRIEF_FACTS])
  })
})

describe('④ 5 & 6 · confirmation is a separate gate', () => {
  it('🛑 confirmation NEVER increments the eleven-fact count', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    const before = draftProgress(await briefDraftFor(USER)).count
    await markBriefDraftPromoted(USER, 'client-1')
    const after = draftProgress(await briefDraftFor(USER)).count
    expect(before).toBe(11)
    expect(after).toBe(11)
  })

  it('eleven facts with confirmation still pending is complete but unconfirmed', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    const d = await briefDraftFor(USER)
    expect(draftProgress(d).complete).toBe(true)
    expect(d?.confirmedAt, 'confirmation is not implied by completeness').toBeNull()
  })
})

describe('⑤ 7 & 8 · the confirm gate is the server\'s', () => {
  it('🛑 confirming with only ten facts is refused, and names what is missing', async () => {
    await saveBriefDraft(USER, TEN)
    const v = mayConfirmBrief(await briefDraftFor(USER))
    expect(v.ok).toBe(false)
    expect(v.missing).toEqual(['company_type'])
  })

  it('confirming with all eleven is allowed', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    expect(mayConfirmBrief(await briefDraftFor(USER)).ok).toBe(true)
  })

  it('a user with no draft at all cannot confirm', () => {
    expect(mayConfirmBrief(null).ok).toBe(false)
  })
})

describe('⑥ 15 · a promoted draft is evidence, not a competing truth', () => {
  it('🛑 it refuses further writes', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    await markBriefDraftPromoted(USER, 'client-1')
    const r = await saveBriefDraft(USER, { target_category: 'Something else entirely' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('promoted')
  })

  it('…so the stored wording cannot drift away from the confirmed ICP', async () => {
    await saveBriefDraft(USER, { ...TEN, target_category: 'Digital marketing agencies', target_company_type: 'agency' })
    await markBriefDraftPromoted(USER, 'client-1')
    await saveBriefDraft(USER, { target_category: 'Construction companies' })
    expect((await briefDraftFor(USER))?.facts.target_category).toBe('Digital marketing agencies')
  })

  it('promotion records which client it became', async () => {
    await saveBriefDraft(USER, TEN)
    await markBriefDraftPromoted(USER, 'client-1')
    const d = await briefDraftFor(USER)
    expect(d?.promotedClientId).toBe('client-1')
    expect(d?.promotedAt).toBeTruthy()
    expect(d?.confirmedAt).toBeTruthy()
  })
})

describe('⑦ 16 · the rail never shows one person twice', () => {
  it('an open draft is projected', async () => {
    await saveBriefDraft(USER, TEN)
    expect((await openBriefDrafts()).map(d => d.userId)).toEqual([USER])
  })

  it('🛑 a promoted draft leaves the rail the moment it becomes a client', async () => {
    await saveBriefDraft(USER, TEN)
    await markBriefDraftPromoted(USER, 'client-1')
    expect(await openBriefDrafts()).toEqual([])
  })

  it('other users\' open drafts are unaffected', async () => {
    await saveBriefDraft(USER, TEN)
    await saveBriefDraft('user-2', { company_name: 'Halloway Legal' })
    await markBriefDraftPromoted(USER, 'client-1')
    expect((await openBriefDrafts()).map(d => d.userId)).toEqual(['user-2'])
  })
})

describe('⑧ 18 · the un-migrated and legacy cases behave exactly as today', () => {
  it('🛑 an unreadable table answers null rather than throwing — signup is never at risk', async () => {
    state.unreadable = true
    await expect(briefDraftFor(USER)).resolves.toBeNull()
    await expect(openBriefDrafts()).resolves.toEqual([])
  })

  it('a write that cannot be stored says so — it never pretends to have saved', async () => {
    state.unwritable = true
    const r = await saveBriefDraft(USER, { company_name: 'X' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('unstorable')
  })

  it('a corrupt facts value counts as empty, never as a confident zero from junk', async () => {
    state.rows = [{
      id: 'd1', user_id: USER, facts: 'not an object', confirmed_at: null,
      promoted_client_id: null, promoted_at: null,
      created_at: '2026-09-11T14:00:00Z', updated_at: '2026-09-11T14:00:00Z',
    }]
    const d = await briefDraftFor(USER)
    expect(d?.facts).toEqual({})
    expect(draftProgress(d).count).toBe(0)
  })

  it('a legacy client with no draft is simply a client with no draft', async () => {
    expect(await briefDraftFor('legacy-user')).toBeNull()
    expect(draftProgress(null).count).toBe(0)
  })
})
