// ═══════════════════════════════════════════════════════════════════════════════════════
// THE EXACT WORK APPROVED IS THE EXACT WORK ALLOWED TO RUN (founder-locked 7 Sep).
//
// 🛑 WHAT APPROVAL RECORDED BEFORE THIS: a timestamp. So a sequence rewritten, a cadence
// retimed, a sender swapped or an enrolment set replaced after approval carried the old
// consent forward in silence, and every gate downstream read it as permission to send THIS.
//
// ⚠️ THE DANGEROUS FAILURES ARE THE OMISSIONS, NOT THE MECHANISM. A digest over `sequence_id`
// and `batch_id` alone would be perfectly deterministic, perfectly stable, and would notice
// NEITHER the words being rewritten under the same id NOR two hundred different people inside
// the same batch. So the tests below are mostly one shape repeated: change ONE component of
// the prepared work, and the hash must move.
//
// ⚠️ AND THE OPPOSITE FAILURE IS AS BAD. A hash that moves when nothing moved trains everybody
// to re-approve reflexively, which is how a REAL change gets waved through. Determinism under
// re-serialisation and row order is therefore asserted first.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import {
  canonicalJson, preparationHash, type PreparationSnapshot,
} from './preparation-snapshot'

const BASE: PreparationSnapshot = {
  v: 1,
  programme_id: 'prog-1',
  batch_id: 'batch-1',
  batch_lead_ids: ['lead-1', 'lead-2', 'lead-3'],
  campaign_id: 'camp-1',
  sequence_id: 'seq-1',
  steps: [
    { subject: 'A quick question about your pipeline', body: 'Hi {{first_name}} — …', wait_days: 0 },
    { subject: 'Re: your pipeline', body: 'Following up …', wait_days: 3 },
  ],
  cadence: [0, 3],
  send_schedule: { days: [2, 3, 4], start: '08:30', end: '17:00', default_tz: 'Europe/London' },
  sender: 'inbox-1|hello@meetandvibe.com',
  enrolled_lead_ids: ['lead-1', 'lead-2'],
}

const h = (s: PreparationSnapshot) => preparationHash(s)
const change = (patch: Partial<PreparationSnapshot>): PreparationSnapshot => ({ ...BASE, ...patch })

// ── ① DETERMINISM — a hash that drifts on its own is worse than none ─────────────────

describe('① the same work always hashes the same', () => {
  it('re-hashing an identical snapshot gives an identical digest', () => {
    expect(h(BASE)).toBe(h({ ...BASE }))
  })

  it('🛑 key ORDER cannot change the digest — `JSON.stringify` alone is not canonical', () => {
    // Two structurally identical snapshots assembled in different orders. Plain stringify
    // follows insertion order, so without canonicalisation these would hash differently and
    // an untouched programme would read as "changed" the first time another code path built it.
    const reordered = {
      enrolled_lead_ids: BASE.enrolled_lead_ids, sender: BASE.sender, cadence: BASE.cadence,
      steps: BASE.steps, sequence_id: BASE.sequence_id, campaign_id: BASE.campaign_id,
      batch_lead_ids: BASE.batch_lead_ids, batch_id: BASE.batch_id,
      send_schedule: BASE.send_schedule,
      programme_id: BASE.programme_id, v: BASE.v,
    } as PreparationSnapshot
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(BASE))   // the hazard is real
    expect(h(reordered)).toBe(h(BASE))                                  // and it is handled
  })

  it('canonical JSON sorts keys recursively and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}')
    // Arrays are NOT sorted: step order is meaning — step 2 reads as a follow-up to step 1.
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]')
  })

  it('🛑 it carries no timestamp — a re-read must not look like a change', () => {
    const json = canonicalJson(BASE)
    for (const noisy of ['updated_at', 'created_at', 'delivered_at', 'approved_at', 'settled_at']) {
      expect(json, `the digest includes ${noisy}, so it will invalidate itself`).not.toContain(noisy)
    }
  })
})

// ── ② EVERY REQUIRED COMPONENT IS ACTUALLY IN THE DIGEST ─────────────────────────────
//
// The founder's list, one case each. Each mutates ONE thing a customer would recognise as the
// work and requires the hash to move.

describe('② a material change to ANY approved component moves the hash', () => {
  it('🛑 18 · batch MEMBERSHIP — the same batch id with different people is a different batch', () => {
    expect(h(change({ batch_lead_ids: ['lead-1', 'lead-2', 'lead-9'] })))
      .not.toBe(h(BASE))
  })

  it('the batch itself', () => {
    expect(h(change({ batch_id: 'batch-2' }))).not.toBe(h(BASE))
  })

  it('🛑 19 · MESSAGE CONTENT — the words rewritten under the same sequence id', () => {
    const rewritten = BASE.steps.map((s, i) => i === 0 ? { ...s, body: 'Completely different pitch' } : s)
    expect(h(change({ steps: rewritten })), 'the wording can be replaced after approval')
      .not.toBe(h(BASE))
  })

  it('a changed SUBJECT LINE alone is a change', () => {
    const resubjected = BASE.steps.map((s, i) => i === 1 ? { ...s, subject: 'One more thought' } : s)
    expect(h(change({ steps: resubjected }))).not.toBe(h(BASE))
  })

  it('🛑 step ORDER is a change — the same words in the other order tell another story', () => {
    expect(h(change({ steps: [BASE.steps[1], BASE.steps[0]] }))).not.toBe(h(BASE))
  })

  it('🛑 20 · CADENCE — a retiming with no word changed', () => {
    const retimed = BASE.steps.map((s, i) => i === 1 ? { ...s, wait_days: 1 } : s)
    expect(h(change({ steps: retimed, cadence: [0, 1] }))).not.toBe(h(BASE))
  })

  it('🛑 21 · SENDER — a different mailbox would send', () => {
    expect(h(change({ sender: 'inbox-2|other@meetandvibe.com' }))).not.toBe(h(BASE))
    expect(h(change({ sender: null })), 'losing the sender entirely is not a change?').not.toBe(h(BASE))
  })

  it('🛑 22 · ENROLMENT MEMBERSHIP — a different audience receives it', () => {
    expect(h(change({ enrolled_lead_ids: ['lead-1', 'lead-2', 'lead-3'] }))).not.toBe(h(BASE))
    expect(h(change({ enrolled_lead_ids: ['lead-1'] }))).not.toBe(h(BASE))
  })

  it('the campaign and the sequence themselves', () => {
    expect(h(change({ campaign_id: 'camp-2' }))).not.toBe(h(BASE))
    expect(h(change({ sequence_id: 'seq-2' }))).not.toBe(h(BASE))
  })

  it('🛑 every field the founder named is present in the digest, by name', () => {
    const json = canonicalJson(BASE)
    for (const field of ['programme_id', 'batch_id', 'batch_lead_ids', 'campaign_id',
                         'sequence_id', 'steps', 'cadence', 'send_schedule',
                         'sender', 'enrolled_lead_ids']) {
      expect(json, `the approved snapshot omits ${field}`).toContain(`"${field}"`)
    }
  })

  it('and the content itself is in there, not just the ids', () => {
    const json = canonicalJson(BASE)
    // An id-only digest would be deterministic, stable — and blind to the two changes that
    // matter most: the words, and who receives them.
    expect(json).toContain('A quick question about your pipeline')
    expect(json).toContain('lead-2')
  })
})

// ── ③ THE MODULE GRANTS NOTHING ──────────────────────────────────────────────────────

describe('③ building a snapshot is not approving one', () => {
  it('🛑 nothing here writes a status, an authority or a send', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const SRC = readFileSync(join(__dirname, './preparation-snapshot.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    // ⚠️ `.update({` NOT `.update(` — the module legitimately calls `createHash(…).update(…)`
    // to build the digest, and banning the bare method name would flag the one thing this file
    // exists to do. A database patch is always an object literal; a hash update never is.
    for (const banned of ['.update({', '.insert(', '.upsert(', '.delete(', '.rpc(',
                          "'APPROVED'", "'LIVE'", 'approveProgramme', 'goLiveProgramme',
                          'second_authorised_at', 'autoEnrollLead', 'sendSequenceEmail']) {
      expect(SRC, `the snapshot module reaches ${banned}`).not.toContain(banned)
    }
  })

  it('🛑 the SENDER is stored as identity, never as credentials', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const SRC = readFileSync(join(__dirname, './preparation-snapshot.ts'), 'utf8')
    // The snapshot is written to the database and read back on a console; a password inside a
    // hashed blob is still a password in the database.
    for (const secret of ['smtp_pass', 'smtp_user', 'smtp_host', 'password']) {
      expect(SRC.replace(/^\s*\/\/.*$/gm, ''), `the snapshot carries ${secret}`).not.toContain(secret)
    }
  })
})

// ── ④ 23 / 24 · A CHANGE AFTER APPROVAL BLOCKS EXECUTION ─────────────────────────────

describe('④ outreach authority is where the comparison bites', () => {
  const src = async (f: string) => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    return readFileSync(join(__dirname, f), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
  }

  it('🛑 24 · OUTREACH consults the approved-preparation comparison', async () => {
    const AUTH = await src('./programme-authority.ts')
    expect(AUTH, 'a changed preparation can Run and send without re-approval')
      .toContain('outreachStillMatchesApproval(programme, verdict, ctx)')
    expect(AUTH).toContain("preparationDrift")
    // 🛑 AND ONLY ON OUTREACH. Applying it to SOURCING would stop every programme sourcing,
    // because sourcing happens before there is an approval to have drifted from.
    expect(AUTH).toContain("action !== 'OUTREACH'")
  })

  it('🛑 23 · a refusal is its OWN reason, so an operator is sent to re-approval', async () => {
    const AUTH = await src('./programme-authority.ts')
    expect(AUTH).toContain("'preparation_changed'")
    const START = await src('./start-work.ts')
    // Mapped through the campaign door too — otherwise it would surface as "not live", which
    // sends the operator to the billing screen for a consent problem.
    expect(START).toContain("verdict.reason === 'preparation_changed' ? 'preparation_changed' as const")
  })

  it('🛑 an approval with NO recorded snapshot fails CLOSED', async () => {
    const SNAP = await src('./preparation-snapshot.ts')
    // "We have no record of what was approved" must never resolve to "yes, it matches".
    const at = SNAP.indexOf('if (!p.approved_preparation_hash)')
    expect(at, 'the missing-hash case is gone').toBeGreaterThan(-1)
    expect(SNAP.slice(at, at + 300)).toContain("state: 'unreadable'")
  })

  it('🛑 approval writes the snapshot in the SAME update as the status', async () => {
    const PROG = await src('./programme.ts')
    // Two writes could leave an approval with no record of what it covered, or a snapshot
    // against an approval that never landed — the very inconsistency this exists to detect.
    // ⛓️ 8 Sep — APPROVAL COPIES THE *REVIEWED* SNAPSHOT. Taking a fresh one here recorded
    // whatever the work had BECOME, so a change made while the client was reading would have
    // been faithfully approved on their behalf.
    expect(PROG).toContain("approved_preparation_hash: rp.review_preparation_hash")
    expect(PROG).toContain("const drift = await reviewDrift(programmeId)")
    expect(PROG).toContain("if (drift.state !== 'unchanged') return null")
    // ⛓️ 11 Sep (DAY 3) — SCANNED AS A CALL, NOT AS A LINE. These were pinned to two exact
    // source strings, so adding `approved_by_kind` to the same update broke a guard whose
    // subject — *one write carries both the status and what it covered* — had not changed at
    // all. A guard that fails on formatting trains people to edit the guard. Both calls are now
    // bounded and their CONTENTS asserted, which is the invariant that actually matters.
    // ⚠️ BOUNDED AT THE CALL'S OWN CLOSING `})`, never a fixed character window. A window that
    // overshoots reads the NEXT function's code and can pass on somebody else's write.
    const call = (from: string) => {
      const i = PROG.indexOf(from)
      expect(i, `${from} is no longer in programme.ts`).toBeGreaterThan(-1)
      const end = PROG.indexOf('})', i)
      return PROG.slice(i, end === -1 ? i : end)
    }
    const setStatusApproved = call("setStatus(programmeId, 'APPROVED'")
    expect(setStatusApproved).toContain('approved_at: at')
    expect(setStatusApproved).toContain('...prepared')
    const claimApproved = call(".update({\n      status: 'APPROVED'")
    expect(claimApproved).toContain('approved_at: at')
    expect(claimApproved).toContain('updated_at: at')
    expect(claimApproved).toContain('...prepared')
    // And a programme that cannot be described cannot be approved.
    expect(PROG).toContain('the prepared work is not the work that was frozen for review')
  })
})

// ── ⑤ THE BUILDER ACTUALLY PUTS THE WORK IN THE DIGEST ───────────────────────────────
//
// 🛑 THIS SECTION EXISTS BECAUSE §② PROVED THE WRONG THING FIRST. Every case above hashes a
// hand-built snapshot, so they prove the DIGEST covers each field — and stay green when
// `buildPreparationSnapshot` stops POPULATING it. The teeth-proof caught exactly that: setting
// `batch_lead_ids: []`, `steps: []`, `cadence: []`, `sender: null` and `enrolled_lead_ids: []`
// in the builder produced five zero-red results.
//
// Presence of a field in a type is not proof a value reaches it. These cases drive the real
// builder against a fake database and require each component to arrive from the right table.

describe('⑤ buildPreparationSnapshot reads the real work, not an empty shape', () => {
  async function build() {
    vi.resetModules()
    vi.doMock('@kind/db', () => {
      const rowsFor = (table: string): unknown[] => {
        if (table === 'programmes') return [{
          id: 'prog-1', client_id: 'c1',
          send_schedule: { days: [2, 3, 4], start: '08:30', end: '17:00', default_tz: 'Europe/London' },
        }]
        if (table === 'icps') return [{ id: 'icp-1', client_id: 'c1' }]
        if (table === 'figsy_campaigns') return [{ id: 'camp-1', client_id: 'c1', settings: {} }]
        if (table === 'figsy_sequences') return [{
          id: 'seq-1', client_id: 'c1', campaign_id: 'camp-1',
          steps: [
            { subject: 'A quick question about your pipeline', body: 'Hi there', wait_days: 0 },
            { subject: 'Re: your pipeline', body: 'Following up', wait_days: 3 },
          ],
        }]
        if (table === 'programme_batches') return [{ id: 'batch-1', seq: 1 }]
        if (table === 'leads') return [{ id: 'lead-b' }, { id: 'lead-a' }]
        if (table === 'figsy_enrollments') return [{ lead_id: 'lead-z' }, { lead_id: 'lead-a' }]
        return []
      }
      const q = (table: string) => {
        const o: Record<string, unknown> = {}
        for (const m of ['select', 'eq', 'order', 'not', 'is', 'in', 'neq', 'limit']) o[m] = () => o
        o.maybeSingle = async () => ({ data: (rowsFor(table)[0] ?? null), error: null })
        o.then = (r: (v: unknown) => void) => r({ data: rowsFor(table), error: null })
        return o
      }
      return { db: { from: (t: string) => q(t) } }
    })
    vi.doMock('./sending-inbox', () => ({
      resolveSendingInbox: async () => ({ ok: true, inbox: { id: 'inbox-1', email: 'hello@meetandvibe.com' }, from: 'x' }),
    }))
    const mod = await import('./preparation-snapshot')
    const r = await mod.buildPreparationSnapshot('prog-1')
    vi.doUnmock('@kind/db'); vi.doUnmock('./sending-inbox')
    return r
  }

  it('🛑 18 · the batch AND its membership arrive', async () => {
    const r = await build()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.snapshot.batch_id).toBe('batch-1')
    // Sorted, so a page boundary or a different row order is not mistaken for a change.
    expect(r.snapshot.batch_lead_ids, 'the batch membership is empty — 200 different people would hash the same')
      .toEqual(['lead-a', 'lead-b'])
  })

  it('🛑 19 · the message CONTENT arrives, in authored order', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    expect(r.snapshot.steps, 'the words are not in the digest').toHaveLength(2)
    expect(r.snapshot.steps[0].subject).toBe('A quick question about your pipeline')
    expect(r.snapshot.steps[1].body).toBe('Following up')
    expect(r.snapshot.sequence_id).toBe('seq-1')
    expect(r.snapshot.campaign_id).toBe('camp-1')
  })

  it('🛑 20 · the cadence arrives', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    expect(r.snapshot.cadence, 'a retiming would not move the hash').toEqual([0, 3])
  })

  it('🛑 21 · the sender arrives, as identity', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    expect(r.snapshot.sender, 'a swapped mailbox would not move the hash')
      .toBe('inbox-1|hello@meetandvibe.com')
  })

  it('🛑 22 · the enrolment membership arrives, sorted', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    expect(r.snapshot.enrolled_lead_ids, 'a different audience would not move the hash')
      .toEqual(['lead-a', 'lead-z'])
  })


  it('🛑 the SEND SCHEDULE arrives — a retiming of the WINDOW is a change too', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    expect(r.snapshot.send_schedule, 'the schedule is not frozen, so it could change after approval')
      .toEqual({ days: [2, 3, 4], start: '08:30', end: '17:00', default_tz: 'Europe/London' })
  })

  it('🛑 and the built snapshot HASHES differently from one missing any of them', async () => {
    const r = await build()
    if (!r.ok) throw new Error(r.degraded)
    const gutted = {
      ...r.snapshot, batch_lead_ids: [], steps: [], cadence: [],
      send_schedule: null, sender: null, enrolled_lead_ids: [],
    }
    expect(preparationHash(gutted), 'an empty snapshot hashes the same as a full one')
      .not.toBe(r.hash)
  })
})
