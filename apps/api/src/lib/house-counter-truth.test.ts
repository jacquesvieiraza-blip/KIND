// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE SCREEN, SEVEN COUNTERS, THREE DIFFERENT POPULATIONS — and only one of them is the
// programme's.
//
// 🛑 WHAT THE FOUNDER SAW ON THE HOUSE PROGRAMME SCREEN, all at once:
//
//     PIPELINE        250 Sourced · 263 Qualified · 0 Booked
//     CLIENT STRIP    411 sourced · 249 with the client · 161 approved · 246/412 sendable
//     PROGRAMME       246 used · 0 reserved · 2254 left of 2500
//     BATCH #1        requested 250 · granted 246 · delivered 246
//
// Every one of those numbers is correct about something. Only the last two rows are about the
// PROGRAMME. The rest are client-wide legacy-desk counters that happen to render on the same
// screen, and reading them as programme truth is what made the screen look broken.
//
//   · `250 Sourced`      — `leads` for the CLIENT in status scored/pending, not revealed.
//   · `263 Qualified`    — `figsy_enrollments` for the CLIENT. "Qualified" here means ENROLLED
//                          IN A CAMPAIGN, the retired desk's vocabulary. House carries ~263 of
//                          them from a legacy desk, every one `programme_id = NULL`.
//   · `411 sourced`      — every non-passed lead the CLIENT has ever had. 250 + 161 = 411.
//   · `161 approved`     — `revealed_at IS NOT NULL`: the retired per-lead $4 approval.
//   · `246/412 sendable` — country coverage over ALL 412 client leads. Its 246 is "has a
//                          country" and is numerically equal to the programme's 246 BY
//                          COINCIDENCE. Two unrelated facts wearing the same number.
//
// ⚠️ AND THE ONE GENUINE REPORTING DEFECT, WHICH THIS FILE FIXES. `QualifyOutcome.qualified`
// counts the verdicts THIS CALL wrote; a candidate an earlier partial run already judged lands
// in `already_judged` and in neither `qualified` nor `disqualified`. So the operator was shown
// "176 qualified" beside "246 used" — both true, of different populations, under one word. The
// settled batch's own `granted` / `delivered` are the attempt's totals and are now reported.
//
// ⚠️ NOTHING HERE EXECUTES A HOUSE SIDE EFFECT. Every case is pure, source-read, or driven
// against a recording mock. No provider, no sourcing, no entitlement mutation, no send.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

const HOUSE_PROGRAMME = '8a8d0fd7-bf6b-4d87-9188-9b3f17864bca'
const HOUSE_CLIENT    = '6bd2046b-5da7-4d48-a249-b9412b7dd554'
const HOUSE_ICP       = 'af145f35-0d3a-4149-a5e3-5565acd7b812'

const MIGRATION = readFileSync(join(__dirname, '../../../../supabase/migrations/20260909_programme_qualification.sql'), 'utf8')
const SETTLE_MIGRATION = readFileSync(join(__dirname, '../../../../supabase/migrations/20260828_programme_money_engine.sql'), 'utf8')
/** Executable SQL only — a promise made in a comment is not a property of the function. */
const sql = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

function fnBody(src: string, name: string): string {
  const body = sql(src)
  const at = body.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  expect(at, `${name} is not defined in that migration`).toBeGreaterThan(-1)
  const rest = body.slice(at)
  const end = rest.indexOf('\n$$;')
  return rest.slice(0, end > -1 ? end : rest.length)
}

const RECOVERY = readFileSync(join(__dirname, 'programme-batch-recovery.ts'), 'utf8')
const VIDA = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
const VIDA_CODE = VIDA.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')
const AVAILABILITY = readFileSync(join(__dirname, 'programme-reconcile-availability.ts'), 'utf8')

// ── ① THE PROGRAMME'S OWN UNIVERSE — three predicates, and no fourth ─────────────────

describe('① 1 · 2 · the programme counts ONLY its own candidates', () => {
  const body = () => fnBody(MIGRATION, 'reconcile_programme_sourcing')

  it('🛑 1 · every count is narrowed by programme AND client AND batch-less', () => {
    const b = body()
    // The candidate universe, the unjudged check and the qualified count are the SAME three
    // predicates. A count narrower or wider than the others would settle a different set than
    // it stamped.
    for (const marker of ['SELECT COUNT(*) INTO v_candidates', 'SELECT COUNT(*) INTO v_unjudged', 'SELECT COUNT(*) INTO v_qualified']) {
      const at = b.indexOf(marker)
      expect(at, `${marker} is gone`).toBeGreaterThan(-1)
      const stmt = b.slice(at, b.indexOf(';', at))
      expect(stmt, `${marker} does not narrow by programme`).toContain('programme_id = p_programme_id')
      expect(stmt, `${marker} does not narrow by client`).toContain('client_id = v_client')
      expect(stmt, `${marker} does not narrow to the unaccounted attempt`).toContain('batch_id IS NULL')
    }
  })

  it('🛑 1 · a lead attributed here but owned by another client REFUSES the whole call', () => {
    const b = body()
    expect(b).toContain('client_id IS DISTINCT FROM v_client')
    const at = b.indexOf('IF v_foreign > 0 THEN')
    expect(at, 'the foreign-client count is computed and never acted on').toBeGreaterThan(-1)
    expect(b.slice(at, at + 400)).toContain('RAISE EXCEPTION')
    // And it happens BEFORE anything is counted.
    expect(at).toBeLessThan(b.indexOf('SELECT COUNT(*) INTO v_candidates'))
  })

  it('🛑 2 · historical client work cannot enter the count — `programme_id IS NULL` is not a match', () => {
    // House carries ~263 legacy enrolments and ~166 legacy leads, every one `programme_id NULL`.
    // An equality test against a uuid never matches NULL, so they are structurally excluded —
    // and the count is never written as "this client's leads".
    const b = body()
    expect(b, 'the count was widened to the client alone').not.toMatch(/COUNT\(\*\)[^;]*FROM public\.leads\s+WHERE\s+client_id = v_client\s*;/)
    expect(b, 'a NULL-programme fallback was introduced').not.toContain('programme_id IS NULL')
    // The stamp writes the batch onto the same three predicates it counted.
    const stampAt = b.indexOf('UPDATE public.leads SET batch_id = v_batch')
    const stamp = b.slice(stampAt, b.indexOf(';', stampAt))
    expect(stamp).toContain('programme_id = p_programme_id')
    expect(stamp).toContain('client_id = v_client')
    expect(stamp).toContain('batch_id IS NULL')
  })

  it('🛑 3 · qualified can never exceed the candidate universe — it is a subset of it', () => {
    const b = body()
    const at = b.indexOf('SELECT COUNT(*) INTO v_qualified')
    const stmt = b.slice(at, b.indexOf(';', at))
    // The qualified count is the candidate predicate PLUS one more condition, so it is a strict
    // subset by construction. Any query that dropped a predicate could exceed the universe.
    expect(stmt).toContain('qualified_at IS NOT NULL')
    expect(stmt).toContain('batch_id IS NULL')
    expect(stmt).toContain('programme_id = p_programme_id')
    // The batch records the universe as `granted` and the subset as `delivered`.
    expect(b).toContain('(p_programme_id, v_seq, v_requested, v_candidates, v_candidates, v_qualified, \'served\', now())')
  })
})

// ── ② ENTITLEMENT CANNOT BE CONSUMED TWICE ──────────────────────────────────────────

describe('② 4 · 5 · settlement is idempotent and the ceiling is guarded', () => {
  it('🛑 4 · a second reconcile finds nothing — the stamp is what makes it so', () => {
    const b = fnBody(MIGRATION, 'reconcile_programme_sourcing')
    // Candidates are counted BEFORE the stamp and the stamp clears the predicate, so the second
    // call counts zero and returns before touching `sourced_used`.
    expect(b.indexOf('SELECT COUNT(*) INTO v_candidates')).toBeLessThan(b.indexOf('UPDATE public.leads SET batch_id'))
    expect(b).toContain('IF v_candidates <= 0 THEN')
    const at = b.indexOf('IF v_candidates <= 0 THEN')
    expect(b.slice(at, at + 120), 'an empty attempt no longer returns early').toContain('RETURN 0')
    expect(at, 'the early return happens after the entitlement write').toBeLessThan(b.indexOf('SET sourced_used = sourced_used + v_qualified'))
  })

  it('🛑 4 · the ceiling is checked AND the write is guarded — two independent stops', () => {
    const b = fnBody(MIGRATION, 'reconcile_programme_sourcing')
    expect(b, 'the room check is gone').toContain('IF COALESCE(v_room, 0) < v_qualified THEN')
    expect(b, 'the guarded write is gone')
      .toContain('sourced_used + sourced_reserved + v_qualified <= sourcing_ceiling')
    expect(b, 'a refused guard no longer raises').toContain('IF NOT FOUND THEN')
  })

  it('🛑 5 · `settle_programme_batch` refuses a batch that is not running', () => {
    const b = fnBody(SETTLE_MIGRATION, 'settle_programme_batch')
    expect(b, 'the running check is gone').toContain("IF v_status <> 'running' THEN")
    const at = b.indexOf("IF v_status <> 'running' THEN")
    expect(b.slice(at, at + 120)).toContain('RETURN 0')
    // A settled batch therefore cannot be settled again, so its granted volume cannot be
    // released twice nor its delivered count added to `sourced_used` twice.
    expect(at).toBeLessThan(b.indexOf('sourced_used'))
  })
})

// ── ③ 6 · THE REPORT SAYS WHICH POPULATION EACH NUMBER IS ABOUT ─────────────────────

describe('③ 6 · delivered · qualified · rejected · already-judged reconcile', () => {
  it('🛑 the report carries the SETTLED batch totals, read back from the row', () => {
    for (const field of ['batch_candidates: number | null', 'batch_qualified: number | null', 'batch_rejected: number | null']) {
      expect(RECOVERY, `the report lost ${field}`).toContain(field)
    }
    // Read back, never derived from this call's tally.
    expect(RECOVERY, 'the batch row is read without its numbers again')
      .toContain(".select('id, seq, granted, delivered')")
    expect(RECOVERY).toContain('const batchCandidates = batchRow && typeof batchRow.granted === \'number\' ? batchRow.granted : null')
    expect(RECOVERY).toContain('const batchQualified = batchRow && typeof batchRow.delivered === \'number\' ? batchRow.delivered : null')
  })

  it('🛑 rejected is the attempt\'s arithmetic, and never negative', () => {
    expect(RECOVERY).toContain('Math.max(0, batchCandidates - batchQualified)')
    // Both halves must be readable or the answer is null — never a half-derived number.
    expect(RECOVERY).toContain('batchCandidates !== null && batchQualified !== null')
  })

  it('🛑 the headline states BOTH populations and names the difference', () => {
    // ⚠️ `lastIndexOf`. The FIRST `headline:` is the interface's field declaration — anchoring
    // there slices the type, not the sentence, and every assertion below would fail on correct
    // code. The rendered headline is the last one.
    const at = RECOVERY.lastIndexOf('headline:')
    const headline = RECOVERY.slice(at, at + 1400)
    expect(headline, 'the headline reports this run as though it were the attempt')
      .toContain('candidate(s) in this attempt')
    expect(headline).toContain('${batchQualified ?? q.qualified} qualified')
    expect(headline).toContain('${batchRejected ?? q.disqualified} rejected')
    // The run's own tally is still stated — as the run's, explicitly.
    expect(headline).toContain('this run judged')
    expect(headline).toContain('already had a verdict')
  })

  it('🛑 the four states are exhaustive: judged = qualified + rejected, and unjudged blocks the settle', () => {
    const b = fnBody(MIGRATION, 'reconcile_programme_sourcing')
    // Nothing settles while a candidate has neither verdict.
    const at = b.indexOf('SELECT COUNT(*) INTO v_unjudged')
    const stmt = b.slice(at, b.indexOf(';', at))
    expect(stmt).toContain('qualified_at IS NULL')
    expect(stmt).toContain('disqualified_at IS NULL')
    expect(b).toContain('IF v_unjudged > 0 THEN')
    expect(b.slice(b.indexOf('IF v_unjudged > 0 THEN'), b.indexOf('IF v_unjudged > 0 THEN') + 400)).toContain('RAISE EXCEPTION')
    // So delivered (qualified) + rejected (candidates − qualified) = candidates, always.
    expect(b.indexOf('IF v_unjudged > 0 THEN')).toBeLessThan(b.indexOf('SELECT COUNT(*) INTO v_qualified'))
  })
})

// ── ④ 7 · THE SCREEN USES PROGRAMME-SCOPED TRUTH ────────────────────────────────────

describe('④ 7 · Vida renders the settled attempt, not this run\'s tally', () => {
  it('🛑 the success line reads `batch_qualified` / `batch_rejected`', () => {
    expect(VIDA_CODE).toContain('const settledQualified = d.batch_qualified ?? d.qualified ?? 0')
    expect(VIDA_CODE).toContain('const settledRejected = d.batch_rejected ?? d.disqualified ?? 0')
    expect(VIDA_CODE).toContain('`${settledQualified} qualified · ${settledRejected} rejected · ${d.used ?? 0} used · batch ready for review`')
    // 🛑 AND THE OLD FORM IS GONE. Rendering the run's tally as the batch's is the defect.
    expect(VIDA_CODE, 'the run tally is rendered as the batch total again')
      .not.toContain('`${d.qualified ?? 0} qualified · ${d.disqualified ?? 0} rejected')
  })

  it('🛑 7 · the entitlement panel reads the PROGRAMME row, never a client-wide total', () => {
    // `used · reserved · left of ceiling` come from `prog.programme`, which the API builds from
    // the programme row alone. A client-wide count could never appear there.
    expect(VIDA_CODE).toContain('{prog.programme.sourced_used} used · {prog.programme.sourced_reserved} reserved · {prog.programme.room_remaining} left of {prog.programme.sourcing_ceiling}')
  })
})

// ── ⑤ 8 · THE CONTROL APPEARS ONLY IN THE STATE THAT NEEDS IT ──────────────────────

describe('⑤ 8 · the qualification control is offered on unfinished work only', () => {
  it('🛑 all five conditions survive — and each one alone hides it', () => {
    // The House programme is now SOURCING, 246 used, one batch, zero batch-less candidates.
    // Any ONE of those makes the control absent, which is why the founder cannot see it: the
    // work it exists for is done. It was not removed, hidden by a flag, or lost in a deploy.
    for (const condition of [
      "isHouseLaunchProgramme(pid, cid)",            // ① + ② exact programme, proved House
      "String(p.status) !== RECONCILE_FROM_STATUS",  // ③ SOURCING_AUTHORISED only
      "Number(p.sourced_used ?? 0) !== 0",           // ⑤ nothing accounted yet
      "(batchCount ?? 0) > 0",                       // ⑤ no batch yet
      ".is('batch_id', null)",                       // ④ batch-less candidates exist
    ]) {
      expect(AVAILABILITY, `the availability rule lost: ${condition}`).toContain(condition)
    }
    expect(AVAILABILITY).toContain("export const RECONCILE_FROM_STATUS = 'SOURCING_AUTHORISED'")
  })

  it('🛑 8 · the browser never re-derives it — Vida renders the server boolean', () => {
    expect(VIDA_CODE).toContain('{prog.reconcile?.available && (')
    const block = VIDA_CODE.slice(VIDA_CODE.indexOf('{prog.reconcile?.available && ('), VIDA_CODE.indexOf('{qualMsg && ('))
    for (const derived of ['SOURCING_AUTHORISED', 'HOUSE_LAUNCH_PROGRAMME_ID', 'sourced_used', 'batch_id']) {
      expect(block, `the browser re-derives availability from ${derived}`).not.toContain(derived)
    }
  })
})

// ── ⑥ 9 · NO HOUSE SIDE EFFECT ──────────────────────────────────────────────────────

describe('⑥ 9 · this change executes nothing against House', () => {
  it('🛑 the fix adds reads only — no new write, no provider call, no status change', () => {
    // The whole change is one wider SELECT and three reported fields. If it ever grows a write
    // this fails, and a "reporting fix" that mutates a programme is not a reporting fix.
    // ⚠️ THE WHOLE TAIL, NOT JUST THE LINE I ADDED. A teeth-proof that inserted a status
    // write one line ABOVE the read-back produced ZERO red, because the slice started below
    // it. The window now runs from the settle RPC to the returned report — everything the
    // reporting change could possibly have grown.
    const rpcAt = RECOVERY.indexOf("await db.rpc('reconcile_programme_sourcing'")
    expect(rpcAt, 'the settle call is gone').toBeGreaterThan(-1)
    const tail = RECOVERY.slice(RECOVERY.indexOf('\n', rpcAt), RECOVERY.indexOf('    return {\n      ok: true,'))
    for (const write of ['.update(', '.insert(', '.delete(', 'db.rpc(']) {
      expect(tail, `the settle-to-report tail now performs ${write}`).not.toContain(write)
    }
  })

  it('🛑 the House identifiers appear in no executable line of the changed modules', () => {
    // They are the founder's runtime facts, not constants this code may resolve from.
    for (const [name, src] of [['programme-batch-recovery.ts', RECOVERY], ['vida/page.tsx', VIDA_CODE]] as const) {
      const executable = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      for (const id of [HOUSE_PROGRAMME, HOUSE_CLIENT, HOUSE_ICP]) {
        expect(executable, `${name} hard-codes a House identifier`).not.toContain(id)
      }
    }
  })
})

// ── ⑦ THE CLIENT-WIDE COUNTERS ARE CLIENT-WIDE — recorded, not silently accepted ────

describe('⑦ 9 · 10 · what the other counters actually count', () => {
  const OPERATOR = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')

  it('🛑 the board\'s "Qualified" column counts ENROLMENTS, client-wide', () => {
    // Recorded so the next reader is not misled the way this screen misled the founder: the
    // board's third column is `figsy_enrollments` for the CLIENT — the retired desk's meaning
    // of "qualified" — and it carries no programme predicate at all.
    const at = OPERATOR.indexOf('const enrollAll = await db.from(\'figsy_enrollments\')')
    expect(at, 'the board no longer builds its qualified column this way').toBeGreaterThan(-1)
    const stmt = OPERATOR.slice(at, at + 400)
    expect(stmt).toContain(".eq('client_id', cid)")
    expect(stmt, 'the board silently became programme-scoped — update this note and the UI together')
      .not.toContain('programme_id')
    expect(OPERATOR).toContain('const qualified = { count: enrollAll.count ?? 0')
  })

  it('🛑 the worklist\'s "approved" counts the RETIRED per-lead reveal, client-wide', () => {
    expect(OPERATOR).toContain("const approvedN  = countBy(leads, r => !!r.revealed_at)")
    expect(OPERATOR).toContain("const sourcedN   = countBy(leads, r => r.status !== 'passed')")
    // Neither is programme-scoped, and neither claims to be.
    const at = OPERATOR.indexOf('const approvedN  = countBy(leads')
    expect(OPERATOR.slice(at - 600, at + 200), 'a programme predicate appeared without the UI changing')
      .not.toContain('programme_id')
  })

  it('🛑 country coverage reads EVERY client lead — its total is not the programme\'s', () => {
    const at = OPERATOR.indexOf("operatorRouter.get('/country-coverage'")
    const route = OPERATOR.slice(at, at + 1200)
    expect(route).toContain(".select('country').eq('client_id', clientId)")
    expect(route, 'country coverage became programme-scoped without the UI saying so')
      .not.toContain('programme_id')
  })
})
