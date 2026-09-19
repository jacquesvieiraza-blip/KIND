import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE SOURCING AUTHORITY GATE, PROVED AS SQL ───────────────────────────────────────────
//
// `try_spend_sourcing` is the ONLY place paid provider records are granted. Four callers
// reach sourcing — `icps.ts`, `lookalike.ts`, the operator run and `startWorkForClient` —
// and AR8's own history is one of them (`lookalike/generate`) spending PDL with no fence at
// all, ~$14 a click, until someone noticed. A gate that lives in the callers is a gate the
// fifth caller skips.
//
// ⚠️ WHY THESE ASSERTIONS READ SQL TEXT RATHER THAN CALLING A DATABASE. There is no Postgres
// in this suite; every other money test here mocks the RPC and therefore proves what the
// TypeScript *asked for*, never what the database would have *decided*. The decision is the
// thing that matters, so this file pins the decision's structure — each fail-closed branch,
// by its exact condition — and the caller tests below pin that the callers reach it correctly.
// That is a real limit and it is stated rather than papered over: this is CODE VERIFIED, not
// RUNTIME VERIFIED, and the migration has not been applied to production.

const SQL = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20260828_programme_money_engine.sql'), 'utf8')
const ICPS = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
const LOOKALIKE = readFileSync(join(__dirname, '../routes/lookalike.ts'), 'utf8')

/** SQL with `--` comments stripped: what the database would actually execute. */
const exec = SQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

describe('⓪ the gate file is real and is the one being read', () => {
  it('contains the function and both new tables', () => {
    // Without this, every assertion below could pass against an empty string.
    expect(exec).toContain('CREATE OR REPLACE FUNCTION public.try_spend_sourcing')
    expect(exec).toContain('CREATE TABLE IF NOT EXISTS public.programmes')
    expect(exec).toContain('CREATE TABLE IF NOT EXISTS public.programme_batches')
    expect(exec.length).toBeGreaterThan(4000)
  })
})

describe('① the gate decides the REGIME from the database, not from the caller', () => {
  it('reads the client’s open programme before deciding anything', () => {
    // This is the whole design. If the function trusted `p_programme_id` to tell it which
    // model applies, then omitting the parameter WOULD be a fallback to legacy — and a
    // programme client’s forgotten parameter would spend their legacy wallet silently.
    expect(exec).toMatch(/SELECT id, status INTO v_open_id, v_open_status[\s\S]{0,200}FROM public\.programmes/)
    expect(exec).toMatch(/WHERE client_id = p_client_id AND status NOT IN \('COMPLETED', 'CANCELLED'\)/)
  })

  it('⚠️ FAIL CLOSED ①: a LEGACY client passed a programme id gets 0', () => {
    expect(exec).toMatch(/IF v_open_id IS NULL AND p_programme_id IS NOT NULL THEN\s*\n\s*RETURN 0;/)
  })

  it('⚠️ FAIL CLOSED ②: a PROGRAMME client omitting the id gets 0 — NULL is not a fallback', () => {
    // The single most important branch in the file. `DEFAULT NULL` alone is not safe, and
    // this is the line that makes it safe.
    expect(exec).toMatch(/IF v_open_id IS NOT NULL AND p_programme_id IS NULL THEN\s*\n\s*RETURN 0;/)
  })

  it('⚠️ FAIL CLOSED ③: a MISMATCHED programme id gets 0 — never "close enough"', () => {
    expect(exec).toMatch(/IF v_open_id IS NOT NULL AND p_programme_id <> v_open_id THEN\s*\n\s*RETURN 0;/)
  })

  it('only "no programme + NULL id" reaches legacy behaviour', () => {
    // The three refusals above are the only ways out before the programme branch, so the
    // legacy body is reachable exactly when there is no open programme.
    const beforeLegacy = exec.slice(0, exec.indexOf('LEGACY BEHAVIOUR') > 0
      ? exec.indexOf('LEGACY BEHAVIOUR')
      : exec.indexOf('SELECT pdl_monthly_cap_usd'))
    expect((beforeLegacy.match(/RETURN 0;/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })
})

describe('② programme authority is bounded by the ceiling, in the database', () => {
  it('the ceiling invariant is a CHECK CONSTRAINT, not application logic', () => {
    // ⚠️ THIS IS WHAT MAKES CONCURRENCY SAFE. Two batches that each fit individually cannot
    // both commit: the second UPDATE violates the constraint and rolls back. A TypeScript
    // "is there room?" check would let both pass — they would each read the same room.
    expect(exec).toMatch(/CHECK \(sourced_used \+ sourced_reserved <= sourcing_ceiling\)/)
  })

  it('the grant is LEAST(requested, remaining room) and re-checks the ceiling in its WHERE', () => {
    // ⛓️ GPT CLOSURE, 28 Aug — the batch cap joined this LEAST. This assertion pinned the
    // two-argument form and correctly went red when controlled batching was added, which
    // is the test doing its job. Full reasoning: `programme-closure.test.ts` GAP 2.
    expect(exec).toMatch(/v_granted := LEAST\(p_requested, COALESCE\(v_room, 0\), v_batch_cap\)/)
    expect(exec).toMatch(/AND sourced_used \+ sourced_reserved \+ v_granted <= sourcing_ceiling/)
  })

  it('a lost race returns 0 rather than over-granting', () => {
    expect(exec).toMatch(/UPDATE public\.programmes[\s\S]{0,400}IF NOT FOUND THEN\s*\n\s*RETURN 0;/)
  })

  it('⚠️ sourcing RESERVES, it does not consume — a provider that returns nothing is releasable', () => {
    // Permanently consuming at grant time is how a client loses paid entitlement when a
    // provider returns zero. That is not hypothetical here: on 25 Aug a run reserved 20
    // records and PDL returned none.
    expect(exec).toMatch(/SET sourced_reserved = sourced_reserved \+ v_granted/)
    expect(exec).not.toMatch(/SET sourced_used = sourced_used \+ v_granted/)
  })

  it('a paused or wrong-status programme is granted nothing', () => {
    expect(exec).toMatch(/IF v_open_status NOT IN \('SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE'\)/)
    expect(exec).toMatch(/paused_at IS NOT NULL[\s\S]{0,80}RETURN 0;/)
  })
})

describe('③ settle converts reserved → used and releases the difference', () => {
  it('the settle function exists and is idempotent on batch status', () => {
    expect(exec).toContain('CREATE OR REPLACE FUNCTION public.settle_programme_batch')
    // A replay must not release the same reservation twice and hand back volume already used.
    expect(exec).toMatch(/IF v_status <> 'running' THEN\s*\n\s*RETURN 0;/)
  })

  it('it releases the FULL grant and adds back only what was delivered', () => {
    expect(exec).toMatch(/sourced_reserved = GREATEST\(0, sourced_reserved - v_granted\)/)
    expect(exec).toMatch(/sourced_used\s*= sourced_used \+ v_deliver/)
  })

  it('delivered is clamped to the grant — a provider cannot deliver more than was authorised', () => {
    expect(exec).toMatch(/v_deliver := LEAST\(GREATEST\(COALESCE\(p_delivered, 0\), 0\), v_granted\)/)
  })

  it('a zero-delivery batch is RELEASED, not served', () => {
    expect(exec).toMatch(/CASE WHEN v_deliver > 0 THEN 'served' ELSE 'released' END/)
  })

  it('⚠️ a stranded batch is a real, indexed state — not a swallowed error', () => {
    expect(exec).toMatch(/'running', 'served', 'released', 'stranded'/)
    expect(exec).toMatch(/programme_batches_stranded_idx/)
  })
})

describe('④ the legacy branch is unchanged — this is the promise the fence rests on', () => {
  it('every legacy fence line survives verbatim', () => {
    // If any of these moved, an existing client's sourcing behaviour changed because a
    // second commercial model arrived. That is not an acceptable side effect.
    for (const line of [
      "SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;",
      "v_month_room := GREATEST(0, floor((v_cap_usd - v_month_usd) / v_rate))::int;",
      "v_day_room := GREATEST(0, v_daily_cap - v_day_used);",
      "v_granted := LEAST(p_requested, COALESCE(v_allowance, 0), v_month_room, v_day_room);",
      "SET sourcing_allowance = sourcing_allowance - v_granted",
      "AND COALESCE(sourcing_allowance, 0) >= v_granted;",
    ]) {
      expect(exec, `legacy line lost: ${line}`).toContain(line)
    }
  })

  it('the legacy rate and daily cap are untouched', () => {
    expect(exec).toMatch(/v_rate\s+numeric := 0\.28;/)
    expect(exec).toMatch(/v_daily_cap\s+int\s+:= 100;/)
  })
})

describe('⑤ the callers reach the gate correctly — no bypass', () => {
  it('icps.ts passes the programme id FROM THE ICP ROW, never from the client', () => {
    // A programme may hold several ICPs, so deriving it from the client guesses the moment
    // there is more than one. `runIcpJob` already holds the ICP row (select('*')).
    expect(ICPS).toMatch(/const programmeId = \(icp as \{ programme_id\?: string \| null \}\)\.programme_id \?\? null/)
  // ⛓️ RE-AIMED 17 Sep (XC-13 / FD-6) — the sourcing gate in `icps.ts` is now
  // `try_reserve_programme_sourcing`, called DIRECTLY. `try_spend_sourcing` does two jobs in
  // one body — programme AUTHORITY, and a `sourcing_ledger` row at $0.28 a PDL record — and
  // under FD-6 the second is a fabricated cost: *"We are not paying for PDL."* HOUSE-009
  // already split the two; this points the client path at the same half House uses. The
  // INVARIANT asserted here is byte-identical; only the RPC's name changed.
    expect(ICPS).toMatch(/try_reserve_programme_sourcing'[\s\S]{0,160}p_programme_id: programmeId/)
  })

  it('⚠️ the LOOKALIKE route passes NULL — so a programme client is REFUSED there, not silently served', () => {
    // This route has no ICP, so it cannot name a programme. Because the gate decides from
    // the database, NULL from a programme client is a refusal — which is the correct
    // behaviour and the reason the design does not trust callers.
    expect(LOOKALIKE).toMatch(/try_spend_sourcing'[\s\S]{0,200}p_programme_id: null/)
  })

  it('⚠️ THE FREE-PROOF PATH IS UNTOUCHED — proof is not activation (R72)', () => {
    // Proof reserves against its own acquisition budget through a different RPC and must
    // never acquire programme authority as a side effect of this work.
    expect(ICPS).toContain('try_reserve_proof_records')
    expect(ICPS).toContain('release_proof_records')
    // The proof branch still comes first and still owns its own reservation id.
    expect(ICPS).toMatch(/if \(proofMode\)[\s\S]{0,1200}try_reserve_proof_records/)
  })

  it('a programme run settles its batch instead of refunding a legacy allowance', () => {
    // Calling `add_sourcing_allowance` for a programme would credit a wallet the programme
    // never debited — paying the client twice for the same shortfall.
    expect(ICPS).toMatch(/if \(unusedGrant > 0 && !programmeSettled\)/)
    // ⛓️ REWRITTEN 9 Sep — THE FLAG MOVED, THE RULE DID NOT. It used to be set by the early
    // settle block, which settled on `returnedCount` (the raw provider page). Entitlement is
    // now consumed by M&V's QUALIFICATION verdict, so the settle happens once, after judging —
    // and if `programmeSettled` had stayed `false` until then, this very refund would have
    // fired for a programme run in the window between. It is now true for ANY programme batch,
    // which is the same guarantee stated at the fact that decides it.
    expect(ICPS).toMatch(/let programmeSettled = !!programmeBatch/)
    expect(ICPS, 'the batch is settled on the raw provider page again')
      .not.toMatch(/settleBatch\(programmeBatch\.id, returnedCount\)/)
    expect(ICPS).toMatch(/settleBatch\(programmeBatch\.id, qualified \?\? 0\)/)
  })
})

describe('⑥ money and value constraints live in the database', () => {
  it('the 50/50 split must partition the total exactly', () => {
    expect(exec).toMatch(/CHECK \(first_payment_cents \+ second_payment_cents = price_total_cents\)/)
  })

  it('one open programme per client, enforced by a partial unique index', () => {
    expect(exec).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS programmes_one_open_per_client_uidx[\s\S]{0,160}WHERE status NOT IN \('COMPLETED', 'CANCELLED'\)/)
  })

  it('payment references are unique — the webhook idempotency key', () => {
    expect(exec).toMatch(/programmes_first_ref_uidx[\s\S]{0,120}WHERE first_payment_ref IS NOT NULL/)
    expect(exec).toMatch(/programmes_second_ref_uidx[\s\S]{0,120}WHERE second_payment_ref IS NOT NULL/)
  })

  it('batch sequence is unique per programme', () => {
    expect(exec).toMatch(/programme_batches_seq_uidx\s*\n?\s*ON public\.programme_batches \(programme_id, seq\)/)
  })

  it('foreign keys detach rather than destroy money history', () => {
    // SET NULL, never CASCADE: deleting a programme must never delete the record of money
    // we spent or a commission we owe.
    expect(exec).toMatch(/sourcing_ledger_programme_fk[\s\S]{0,200}ON DELETE SET NULL/)
    expect(exec).toMatch(/partner_commissions_programme_fk[\s\S]{0,200}ON DELETE SET NULL/)
    expect(exec).toMatch(/icps_programme_fk[\s\S]{0,200}ON DELETE SET NULL/)
  })

  it('partner commission basis is constrained to the two real bases', () => {
    expect(exec).toMatch(/CHECK \(basis IS NULL OR basis IN \('lead_sale', 'programme_contribution'\)\)/)
  })

  it('RLS is ON with no policies, matching the acquisition_memory precedent', () => {
    expect(exec).toMatch(/ALTER TABLE IF EXISTS public\.programmes ENABLE ROW LEVEL SECURITY/)
    expect(exec).toMatch(/ALTER TABLE IF EXISTS public\.programme_batches ENABLE ROW LEVEL SECURITY/)
    expect(exec).not.toMatch(/CREATE POLICY/)
  })

  it('⚠️ the migration is ADDITIVE — nothing is dropped, renamed or backfilled', () => {
    // The property the whole legacy fence rests on: with no programme rows, behaviour is
    // unchanged. A DROP COLUMN or an UPDATE here would break that silently.
    expect(exec).not.toMatch(/DROP TABLE/)
    expect(exec).not.toMatch(/DROP COLUMN/)
    expect(exec).not.toMatch(/ALTER COLUMN[\s\S]{0,40}TYPE/)
    // The only DROPs permitted are CONSTRAINT ... IF EXISTS, which is how idempotent
    // constraint re-creation works.
    // Two permitted DROPs, and only two. `DROP CONSTRAINT ... IF EXISTS` is how idempotent
    // constraint re-creation works. `DROP FUNCTION` appears exactly once, for the
    // two-argument `try_spend_sourcing` overload — dropped so a two-argument call is not
    // ambiguous between it and the new defaulted three-argument function, which is what
    // makes migration-first deployment safe. Neither drops data.
    const drops = exec.match(/DROP \w+/g) ?? []
    for (const m of drops) {
      expect(m, `unexpected ${m} in an additive migration`).toMatch(/^DROP (CONSTRAINT|FUNCTION)$/)
    }
    expect(drops.filter(d => d === 'DROP FUNCTION'), 'exactly one function signature is replaced').toHaveLength(1)
    expect(exec).toMatch(/DROP FUNCTION IF EXISTS public\.try_spend_sourcing\(uuid, int\);/)
    expect(exec, 'no table or column may be dropped').not.toMatch(/DROP (TABLE|COLUMN)/)
    // A BACKFILL is a TOP-LEVEL statement — column 0. The `UPDATE public.clients` inside
    // the function body is the legacy allowance decrement, indented, and is the behaviour
    // being preserved rather than a migration-time data change.
    expect(exec).not.toMatch(/^UPDATE public\./m)
    expect(exec).not.toMatch(/^INSERT INTO public\.(icps|clients|partner_commissions)/m)
  })
})
