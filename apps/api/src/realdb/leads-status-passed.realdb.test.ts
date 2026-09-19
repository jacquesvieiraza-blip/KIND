// ═══════════════════════════════════════════════════════════════════════════════════════
// D-62 · 'passed' IS A STATUS THE DATABASE ACCEPTS — FOUNDER-APPROVED 18 Sep 2026
//
// THIS ONE CANNOT BE A UNIT TEST. The question is what a CHECK constraint does, and a
// mocked `supabase-js` has no constraints: it returns whatever the test author typed. The
// defect being closed is precisely a gap between what the product WRITES and what the
// schema PERMITS, so only a real PostgreSQL running this repo's own migrations can answer.
//
// ── WHAT WAS WRONG ────────────────────────────────────────────────────────────────────
//
// `passLead` writes `status = 'passed'` when a client says "not a fit". The repository's
// only CHECK record — `20260525_fix_leads_status_and_figsy_memory` — allows eight values,
// and 'passed' is not one of them. Production is believed to carry an ENUM instead, with
// 'passed' added to the TYPE by hand in `20260723_operator_audit_log`; that is evidence
// about one database, not about this repository, and it is why the pass action was not
// visibly broken while the schema of record forbade it.
//
// ── THE DECISION, AND ITS TWO BOUNDARIES ──────────────────────────────────────────────
//
// FOUNDER, 18 Sep 2026, verbatim: *"APPROVE PASSED. Add `passed` to the allowed
// lead-status CHECK."* Bounded by *"preserve every existing allowed status"* and
// *"preserve the existing `set_aside` rule/lock unchanged"*.
//
// 🛑 BOTH BOUNDARIES ARE ASSERTED HERE AGAINST THE LIVE CONSTRAINT, not against the text
// of the migration. A widening that silently dropped one of the eight would be a
// constraint violation on the next write of whichever value went missing — and a file
// scan cannot tell the difference between a list that is correct and one that was applied.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Client } from 'pg'
import { realdbClient, migrationOutcome, createTestClient, dropTestClient } from './harness'

/** The eight that 20260525 allowed. Every one must still be accepted. */
const PRESERVED = [
  'pending', 'scored', 'contacted', 'consent_sent',
  'consent_given', 'exported', 'rejected', 'opted_out',
] as const

describe("D-62 · leads_status_check accepts 'passed'", () => {
  let c: Client
  let clientId: string
  const userIds: string[] = []

  /** Insert one lead at `status` and report whether the database accepted it. */
  const writeStatus = async (status: string): Promise<{ ok: boolean; error?: string }> => {
    // ⚠️ NO TRANSACTION, AND THAT IS THE HARNESS'S DESIGN. These tests isolate by identity
    // rather than by rollback, because what they prove — a constraint refusing a COMMITTED
    // write — is exactly what a rollback-everything wrapper would hide. Each statement
    // autocommits, so one refusal cannot poison the writes that follow it.
    try {
      await c.query(
        `insert into public.leads(client_id, first_name, last_name, email, status)
         values ($1, 'A', 'B', $2, $3)`,
        [clientId, `d62-${status}@example.invalid`, status],
      )
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  beforeAll(async () => {
    c = await realdbClient()
    const made = await createTestClient(c)
    clientId = made.clientId
    userIds.push(made.userId)
  })

  afterAll(async () => {
    for (const u of userIds) await dropTestClient(c, u)
    await c.end().catch(() => {})
  })

  it('🛑 THE MIGRATION APPLIED — a migration that failed proves nothing below it', async () => {
    // If the widening did not run, every assertion here would be describing the OLD
    // constraint, and the one that matters would fail for the right reason by accident.
    const outcome = await migrationOutcome(c, '20260525_fix_leads_status_and_figsy_memory.sql')
    expect(outcome, 'the constraint owner did not apply against this database').toBe('applied')
  })

  it("🛑 A LEAD CAN BE WRITTEN AS 'passed' — the defect, closed at the database", async () => {
    // This is the exact write `passLead` performs. Before the widening it was refused by
    // `leads_status_check`, and the client saw "Lead not found or already actioned".
    const r = await writeStatus('passed')
    expect(r.ok, `the database still refuses the approved status: ${r.error}`).toBe(true)
  })

  it('🛑 AND EVERY PREVIOUSLY-ALLOWED STATUS IS STILL ACCEPTED — his first boundary', async () => {
    for (const status of PRESERVED) {
      const r = await writeStatus(status)
      expect(r.ok, `the widening dropped '${status}': ${r.error}`).toBe(true)
    }
  })

  it("🛑 AND 'set_aside' IS STILL REFUSED — his second boundary, and the 10 Sep lock", async () => {
    // ⚠️ THE ANTI-VACUITY CASE, and it is doing two jobs. It proves the constraint is still
    // ENFORCING rather than merely present — a widening that dropped the constraint
    // altogether would pass every case above — and it proves the `set_aside` lock survived
    // an approval that was about a different value.
    const r = await writeStatus('set_aside')
    expect(r.ok, 'the status constraint no longer refuses anything, so the cases above prove nothing').toBe(false)
    expect(r.error, 'something other than the status constraint refused this write')
      .toMatch(/leads_status_check/)
  })

  it('🛑 AND THE LIVE CONSTRAINT IS EXACTLY THE NINE — nothing rode in beside the approval', async () => {
    const { rows } = await c.query<{ def: string }>(
      `select pg_get_constraintdef(oid) as def from pg_constraint
        where conrelid = 'public.leads'::regclass and conname = 'leads_status_check'`,
    )
    expect(rows.length, 'leads_status_check is gone from the live database').toBe(1)
    const values = (rows[0].def.match(/'([a-z_]+)'::text/g) ?? []).map(v => v.slice(1, v.indexOf("'", 1)))
    expect([...values].sort(), 'the live constraint is not the nine the founder approved')
      .toEqual([...PRESERVED, 'passed'].sort())
  })
})
