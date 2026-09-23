// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 SECTION 4 #18 — THE CLIENT CAN SAY NO AT APPROVAL. Founder-approved 23 Sep 2026.
//
// ── WHAT WAS MISSING, AND IT WAS ONE SIDE OF THE CONVERSATION ───────────────────────────
//
// The Approval screen had exactly one control and it was Approve. If the people were wrong, or
// the emails were wrong, there was no reject, no "ask for changes" and no box to say why. The
// only sentence pointing anywhere read *"If anything changes, we will ask you again"* — which
// describes US changing something, not them objecting.
//
// Every stage upstream lets a client push back: the Brief is theirs to correct, Proof has a
// widen route and a calibration hand-off, targeting stays editable. The one screen where they
// approve real outreach to real people was the screen with no way to disagree.
//
// ── THE TWO PROPERTIES THIS MUST HAVE, AND BOTH FAIL QUIETLY ────────────────────────────
//
// ① **IT HOLDS, IT DOES NOT CANCEL.** Pause is orthogonal to status by design, so the freeze,
//    the approval state and the money stay exactly where they were. A client who objects must
//    not be able to lose their own programme by objecting to it — and a `status` write here
//    would do precisely that, while looking like a tidy state transition.
//
// ② **SOMEBODY IS ACTUALLY TOLD.** Recording words and pausing is not a feature until it
//    reaches a human. `founder_alerts` has no reader anywhere in the product (R132 records
//    this), so an alert email alone is a concern nobody sees — which is how the Northstar
//    client sat stranded with `icp_review_pending` written and read by no surface at all.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state: { programmes: Row[]; alerts: string[]; writeFails: boolean } = {
  programmes: [], alerts: [], writeFails: false,
}

function makeTable() {
  const q = {
    _filters: [] as Array<(r: Row) => boolean>,
    _payload: null as Row | null,
    _mode: '' as '' | 'update' | 'select',
    select() { if (this._mode === '') this._mode = 'select'; return this },
    eq(col: string, val: unknown) { this._filters.push(r => r[col] === val); return this },
    is(col: string, val: unknown) { this._filters.push(r => (r[col] ?? null) === val); return this },
    not(col: string, _op: string, val: unknown) { this._filters.push(r => (r[col] ?? null) !== val); return this },
    order() { return this }, limit() { return this },
    update(p: Row) { this._mode = 'update'; this._payload = p; return this },
    _matched() { return state.programmes.filter(r => this._filters.every(f => f(r))) },
    async maybeSingle() { return { data: this._matched()[0] ?? null, error: null } },
    _run(): { data: unknown; error: unknown } {
      if (this._mode === 'update' && state.writeFails) {
        return { data: null, error: { message: 'column does not exist' } }
      }
      const hit = this._matched()
      for (const r of hit) Object.assign(r, this._payload)
      return { data: hit, error: null }
    },
    then(res: (v: { data: unknown; error: unknown }) => unknown) {
      return Promise.resolve(this._run()).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: () => makeTable(), rpc: async () => ({ data: null, error: null }) } }))
vi.mock('./programme-preparation', () => ({
  prepareProgrammeOutreach: async () => ({ ok: true, complete: true, remaining: 0, total: 0, campaigns: [], enrolled: [], alreadyEnrolled: 0, skipped: 0, failed: [], problems: [] }),
  assertGoingLive: async () => ({ ok: true }),
  verifyProgrammeFulfilment: async () => ({ ok: true }),
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: (_k: string, subject: string) => { state.alerts.push(subject); return Promise.resolve() },
}))

import { raiseApprovalConcern } from './programme'
import { APPROVAL_CONCERN_LABEL, APPROVAL_CONCERN_PROMPT, APPROVAL_CONCERN_ACKNOWLEDGED } from '@kind/shared'

function seed(over: Row = {}): Row {
  const p: Row = {
    id: 'prog-1', client_id: 'client-1', status: 'READY_FOR_APPROVAL',
    meeting_target: 10, approved_at: null, paused_at: null, pause_reason: null,
    approval_concern: null, approval_concern_at: null,
    review_preparation_hash: 'v1',
    ...over,
  }
  state.programmes.push(p)
  return p
}
const prog = () => state.programmes[0]

beforeEach(() => { state.programmes = []; state.alerts = []; state.writeFails = false })

describe('🛑 the client can object, and the programme is HELD', () => {
  it('their words are recorded and the programme is paused', async () => {
    seed()
    const r = await raiseApprovalConcern({
      programmeId: 'prog-1', clientId: 'client-1',
      words: 'These are all agencies. We sell to manufacturers.',
    })
    expect(r.ok).toBe(true)
    expect(prog().approval_concern).toBe('These are all agencies. We sell to manufacturers.')
    expect(prog().approval_concern_at).toBeTruthy()
    expect(prog().paused_at).toBeTruthy()
    expect(prog().pause_reason).toBe('client')
  })

  it('🛑 IT HOLDS, IT DOES NOT CANCEL — the state it returns to is untouched', async () => {
    // The failure that would look like a tidy state transition: writing a status here would
    // let a client lose their own programme by objecting to it.
    seed()
    await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'wrong people' })
    expect(prog().status, 'objecting changed the programme status').toBe('READY_FOR_APPROVAL')
    expect(prog().review_preparation_hash, 'the freeze was discarded').toBe('v1')
    expect(prog().approved_at).toBeNull()
  })

  it('🛑 AND SOMEBODY IS TOLD, with their sentence in it', async () => {
    // Recording words and pausing is not a feature until it reaches a human.
    seed()
    await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'the timing is wrong' })
    const said = state.alerts.join(' ')
    expect(said).toMatch(/concern at Approval/i)
  })

  it('their words are stored verbatim, trimmed but never edited', async () => {
    // Founder-locked at the equivalent moment: "we cant guess peoples way of speaking ever."
    seed()
    const words = '  Too pushy. Also we don’t sell to gambling — I said that.  '
    await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words })
    expect(prog().approval_concern).toBe(words.trim())
  })
})

describe('🛑 it refuses rather than guessing', () => {
  it('an empty objection is refused — a hold with no reason is an alert nobody can act on', async () => {
    seed()
    for (const empty of ['', '   ', '\n']) {
      const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: empty })
      expect(r.ok, `"${empty}" was accepted`).toBe(false)
      expect(r.code).toBe('empty')
    }
    expect(prog().paused_at, 'an empty objection still paused the programme').toBeNull()
  })

  it('🛑 ONLY FROM READY_FOR_APPROVAL — you cannot object to what you have not been shown', async () => {
    for (const status of ['DRAFT', 'AWAITING_FIRST_PAYMENT', 'SOURCING', 'LIVE']) {
      state.programmes = []
      seed({ status })
      const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'no' })
      expect(r.ok, `${status} accepted an objection`).toBe(false)
      expect(r.code).toBe('wrong_state')
      expect(prog().paused_at).toBeNull()
    }
  })

  it('an ALREADY APPROVED programme is refused, and the answer says what to do instead', async () => {
    // They said yes. The way back from that is a person, not this button.
    seed({ status: 'APPROVED', approved_at: 'x' })
    const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'changed my mind' })
    expect(r.ok).toBe(false)
    expect(String(r.reason)).toMatch(/already approved/i)
  })

  it('🛑 ANOTHER CLIENT’S PROGRAMME IS NOT FOUND, never paused', async () => {
    seed()
    const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'someone-else', words: 'stop' })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('not_found')
    expect(prog().paused_at).toBeNull()
  })

  it('an unwritable column changes nothing and says so', async () => {
    // Before the migration runs, the columns do not exist. Pausing anyway would hold a
    // programme with no recorded reason — the exact shape this feature exists to avoid.
    seed()
    state.writeFails = true
    const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'wrong' })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('unwritable')
    expect(prog().paused_at, 'the programme was held with no reason recorded').toBeNull()
  })

  it('an essay is refused rather than silently truncated', async () => {
    // Truncating would edit a client's own words.
    seed()
    const r = await raiseApprovalConcern({ programmeId: 'prog-1', clientId: 'client-1', words: 'x'.repeat(4_001) })
    expect(r.ok).toBe(false)
    expect(r.code).toBe('too_long')
  })
})

describe('🛑 the copy promises only what the code does', () => {
  it('the acknowledgement claims a hold and a person — not a fix, a date, or agreement', () => {
    expect(APPROVAL_CONCERN_ACKNOWLEDGED).toMatch(/on hold/i)
    expect(APPROVAL_CONCERN_ACKNOWLEDGED).toMatch(/nothing will be sent/i)
    for (const overclaim of ['we will fix', 'we agree', 'within', 'hours', 'sorry']) {
      expect(APPROVAL_CONCERN_ACKNOWLEDGED.toLowerCase(),
        `the acknowledgement promises more than it does: ${overclaim}`).not.toContain(overclaim)
    }
  })

  it('it is not called a rejection — nothing is cancelled', () => {
    for (const s of [APPROVAL_CONCERN_LABEL, APPROVAL_CONCERN_PROMPT, APPROVAL_CONCERN_ACKNOWLEDGED]) {
      expect(s.toLowerCase()).not.toMatch(/reject|decline|cancel/)
    }
  })

  it('the prompt asks for their words and offers no categories of ours', () => {
    expect(APPROVAL_CONCERN_PROMPT).toMatch(/your own words/i)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════════════
// ⚑ AND IT IS ACTUALLY ON THE SCREEN, AND ACTUALLY ON THE OPERATOR RAIL
//
// 🛑 A PURE MODULE NOBODY CALLS IS A TEST SUITE PROVING NOTHING. Everything above runs the
// server act directly. Whether a client can reach it, and whether a human is told, are read.
// ══════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 the client can reach it and an operator sees it', () => {
  const REPO = join(__dirname, '../../../..')
  const strip = (f: string) => {
    const raw = readFileSync(join(REPO, f), 'utf8')
    let inBlock = false
    return raw.split('\n').map(l => {
      const x = l.trim()
      if (inBlock) { if (x.endsWith('*/') || x.endsWith('*/}')) inBlock = false; return '' }
      if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
      if (x.startsWith('{/*')) { if (!x.endsWith('*/}')) inBlock = true; return '' }
      const i = l.search(/(?<!:)\/\//)
      return i >= 0 ? l.slice(0, i) : l
    }).join('\n')
  }
  const SCREEN = strip('apps/portal/src/components/milla/ProgrammeApproval.tsx')
  const ROUTE  = strip('apps/api/src/routes/my-programme.ts')
  const OPER   = strip('apps/api/src/routes/operator.ts')

  it('the screen offers the control and posts it', () => {
    expect(SCREEN.length).toBeGreaterThan(3_000)
    expect(SCREEN, 'the control is not on the screen').toContain('APPROVAL_CONCERN_LABEL')
    expect(SCREEN).toContain("'/my/programme/concern'")
  })

  it('🛑 AND THE R136 DISCLAIMER IS HERE TOO — the second place they commit', () => {
    expect(SCREEN, 'the best-efforts disclaimer is not on the approval screen')
      .toContain('PROGRAMME_BEST_EFFORTS')
    expect(SCREEN, 'the disclaimer was hand-typed rather than interpolated')
      .not.toMatch(/do our best/i)
  })

  it('the route exists and is a client route, not an operator one', () => {
    expect(ROUTE).toContain("myProgrammeRouter.post('/concern'")
    expect(ROUTE).toContain('raiseApprovalConcern')
  })

  it('🛑 AN OPERATOR IS TOLD ON THE RAIL VIDA ALREADY READS — not a new alert platform', () => {
    // R132's lock: "Do NOT build another alert platform." And `founder_alerts` has no reader
    // anywhere in the product, so the email alone would be a concern nobody sees.
    expect(OPER).toContain("kind: 'approval_concern'")
    expect(OPER, 'the exception does not carry the client’s own words').toMatch(/approval_concern/)
  })

  it('🛑 AND AN UNREADABLE CONCERN LIST IS SAID OUT LOUD, never a silently shorter rail', () => {
    // Before the migration runs the column does not exist, and "no concerns" would be a lie
    // on the screen whose entire job is saying what needs a person.
    const at = OPER.indexOf("kind: 'approval_concern'")
    expect(at).toBeGreaterThan(-1)
    expect(OPER.slice(at, at + 1_200)).toContain('programmeDegraded.push')
  })
})
