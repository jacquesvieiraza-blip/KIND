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
  /** ⚑ the AUTHORITATIVE promotion reality: confirmed clients, by user */
  clients: [] as Row[],
  /** the clients read fails — authority state cannot be established */
  clientsUnreadable: false,
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
      if (name === 'clients') {
        if (state.clientsUnreadable) return { data: null, error: { message: 'unreadable' } }
        const hit = state.clients.filter(r => filters.every(f => f(r)))
        return { data: hit[0] ?? null, error: null }
      }
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
  state.clients = []
  state.clientsUnreadable = false
})

/** Promotion as it REALLY happens: the onboarding insert creates the clients row. */
const clientCreated = (userId = USER, id = 'client-1') => { state.clients.push({ id, user_id: userId }) }

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
    clientCreated()
    await markBriefDraftPromoted(USER, 'client-1')
    const r = await saveBriefDraft(USER, { target_category: 'Something else entirely' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('promoted')
  })

  it('…so the stored wording cannot drift away from the confirmed ICP', async () => {
    await saveBriefDraft(USER, { ...TEN, target_category: 'Digital marketing agencies', target_company_type: 'agency' })
    clientCreated()
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑨ THE AUTHORITY TRANSITION — reliable, and NOT the same thing as the bookkeeping seal.
//
// 🛑 THE BUG THIS BLOCK EXISTS FOR. Write eligibility used to be decided ONLY by
// `promoted_client_id`, which `markBriefDraftPromoted` writes BEST-EFFORT. So a run where the
// client and the ICP were created and that one bookkeeping write failed left the draft
// writable — two mutable sources of truth for the same Brief, with nothing to say which was
// right. "Do not fail onboarding over audit evidence" is correct; "leave the old authority
// writable" is not the same sentence.
//
// ⚠️ THE FIX IS TO ASK REALITY. A `clients` row for this user IS promotion having happened:
// the onboarding insert creates it, `clients.user_id` is UNIQUE, and no bookkeeping step
// stands between that insert and the guard's read. The seal is now what it should always have
// been — evidence of something already true elsewhere.
//
// ⚠️ SEPARATE THE TWO CONCERNS, which is what the teeth case below actually proves:
//   A · the AUTHORITY transition — must be reliable
//   B · the audit/evidence decoration — may be best-effort
// A test that only broke the flag would pass against a guard reading the flag. The teeth case
// therefore breaks the AUTHORITY guard while leaving the seal perfectly intact.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑨ authority, not bookkeeping', () => {
  it('1 · an incomplete draft cannot promote', async () => {
    await saveBriefDraft(USER, TEN)
    expect(mayConfirmBrief(await briefDraftFor(USER)).ok).toBe(false)
  })

  it('2 · a complete draft can promote', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    expect(mayConfirmBrief(await briefDraftFor(USER)).ok).toBe(true)
  })

  it('3 · after a successful promotion, ordinary draft writes are rejected', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    clientCreated()
    await markBriefDraftPromoted(USER, 'client-1')
    const r = await saveBriefDraft(USER, { target_category: 'Anything' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('promoted')
  })

  it('🛑 4 · a FAILED seal does NOT restore draft write authority', async () => {
    // The exact run the correction is about: client + ICP created, bookkeeping write lost.
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    clientCreated()
    state.unwritable = true
    const sealed = await markBriefDraftPromoted(USER, 'client-1')
    state.unwritable = false
    expect(sealed.ok, 'the seal is expected to have failed in this scenario').toBe(false)
    // …and the flag really is absent, so nothing here is passing by accident.
    expect((await briefDraftFor(USER))?.promotedClientId).toBeNull()
    // The draft must STILL be closed, because the client exists.
    const r = await saveBriefDraft(USER, { target_category: 'Anything' })
    expect(r.ok, 'a failed audit write must never reopen the old authority').toBe(false)
    expect(r.ok === false && r.reason).toBe('promoted')
  })

  it('5 · a confirmed client can never have a writable onboarding draft', async () => {
    // No seal was ever attempted here — the client simply exists.
    await saveBriefDraft(USER, { company_name: 'Redmayne & Co.' })
    clientCreated()
    expect((await saveBriefDraft(USER, { contact_name: 'Ellis' })).ok).toBe(false)
  })

  it('6 · retrying the write after promotion fails safely, and changes nothing', async () => {
    await saveBriefDraft(USER, { ...TEN, target_category: 'Digital marketing', target_company_type: 'agency' })
    clientCreated()
    for (let i = 0; i < 3; i++) await saveBriefDraft(USER, { target_category: `attempt ${i}` })
    expect((await briefDraftFor(USER))?.facts.target_category).toBe('Digital marketing')
  })

  it('9 · a failure BEFORE promotion leaves the draft writable — the user continues', async () => {
    await saveBriefDraft(USER, TEN)
    // No client row: nothing authoritative has happened, whatever else failed.
    const r = await saveBriefDraft(USER, { target_company_type: 'agency' })
    expect(r.ok).toBe(true)
    expect(draftProgress(await briefDraftFor(USER)).complete).toBe(true)
  })

  it('10 · a failure AFTER promotion leaves client/ICP authoritative and the draft closed', async () => {
    await saveBriefDraft(USER, { ...TEN, target_company_type: 'agency' })
    clientCreated()
    state.unwritable = true
    await markBriefDraftPromoted(USER, 'client-1')
    state.unwritable = false
    expect((await saveBriefDraft(USER, { company_name: 'Renamed Ltd' })).ok).toBe(false)
    // and the confirmed client is untouched by any of it
    expect(state.clients).toHaveLength(1)
  })

  // ⚠️ FAIL CLOSED WHEN AUTHORITY CANNOT BE ESTABLISHED. Allowing a write on an unknown state
  // is the same gamble the correction forbids; refusing costs one retry and the portal still
  // holds the client's answers.
  it('🛑 an unreadable authority state refuses the write rather than guessing', async () => {
    await saveBriefDraft(USER, TEN)
    state.clientsUnreadable = true
    const r = await saveBriefDraft(USER, { target_company_type: 'agency' })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toBe('unverifiable')
  })

  // ⚠️ AND THE SAME REASONING ON THE DRAFT READ. Writing when the draft could not be read
  // would upsert a facts object assembled from nothing — erasing every answer collected.
  it('🛑 an unreadable draft refuses the write rather than erasing ten facts', async () => {
    await saveBriefDraft(USER, TEN)
    state.unreadable = true
    const r = await saveBriefDraft(USER, { target_company_type: 'agency' })
    state.unreadable = false
    expect(r.ok).toBe(false)
    expect(draftProgress(await briefDraftFor(USER)).count, 'the ten facts survived').toBe(10)
  })
})
