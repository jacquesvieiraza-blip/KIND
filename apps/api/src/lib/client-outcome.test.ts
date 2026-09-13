// ═══════════════════════════════════════════════════════════════════════════════════════
// "OUTCOME — not set yet", TO A CLIENT WHO HAD JUST SET IT.
//
// During onboarding the founder told Milla: "Book qualified meetings with those founders
// and CEOs." Milla Home then showed OUTCOME — not set yet, and NEXT: *Tell Milla the
// outcome you want.*
//
// Two notions of outcome, neither the client's: the sentence went to
// `icps.campaign_intent` (copy input for the sequence writer, rendered on one summary
// screen and never again), and the OUTCOME card read `programmes.meeting_target` — a
// number that does not exist until a programme is created, several steps later. During
// Proof the card was therefore ALWAYS empty, and the NEXT line asked for the one thing he
// had already given.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  readStatedOutcome, shouldAskForOutcome, outcomeHeadline, proofNextLine,
  outcomeForOperator, seedCampaignIntent, OUTCOME_QUESTION, OUTCOME_UNSET_NEXT,
} from './client-outcome'
import { PENDING_MIGRATIONS } from './pending-migrations'

const API = join(__dirname, '..')
const PORTAL = join(__dirname, '..', '..', '..', 'portal', 'src')
const AUTH = readFileSync(join(API, 'routes', 'auth.ts'), 'utf8')
const CUSTOMER = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')
const HOME = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'page.tsx'), 'utf8')
const WELCOME = readFileSync(join(PORTAL, 'app', '(milla)', 'milla', 'welcome', 'page.tsx'), 'utf8')
const VIDA_COPY = readFileSync(join(__dirname, '..', '..', '..', 'admin', 'src', 'lib', 'vida-lifecycle-copy.ts'), 'utf8')

const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

/** His words, verbatim. */
const SAID = 'Book qualified meetings with those founders and CEOs.'

describe('🛑 ① the sentence he actually said', () => {
  it('is kept verbatim and classified as a meetings outcome', () => {
    const o = readStatedOutcome(SAID)
    expect(o).toEqual({ kind: 'meetings', stated: SAID })
  })

  it('🛑 the KIND is narrow — revenue and awareness are NOT meetings', () => {
    // Classifying these as `meetings` would put a meeting target against an outcome nobody
    // agreed to. `other` reaches a person instead.
    for (const said of ['More revenue', 'Grow brand awareness', 'Get us into enterprise accounts']) {
      expect(readStatedOutcome(said)!.kind, said).toBe('other')
    }
    for (const said of ['book meetings', 'I want demos', 'sales calls please']) {
      expect(readStatedOutcome(said)!.kind, said).toBe('meetings')
    }
  })

  it('a blank or two-character answer is NOT an outcome', () => {
    // An empty `outcome_stated` would satisfy every "do we have it" check while telling the
    // client's own screen nothing.
    for (const nothing of ['', '   ', 'ok', null, undefined, 42]) {
      expect(readStatedOutcome(nothing), String(nothing)).toBeNull()
    }
  })
})

describe('🛑 ② Milla asks once, and only when she genuinely has nothing', () => {
  it('she asks when it is absent', () => {
    expect(shouldAskForOutcome(null)).toBe(true)
    expect(shouldAskForOutcome({ kind: 'meetings', stated: '  ' })).toBe(true)
  })

  it('🛑 …and NEVER once he has said it', () => {
    expect(shouldAskForOutcome(readStatedOutcome(SAID))).toBe(false)
  })

  it('the Proof NEXT line stops asking and says what is happening', () => {
    expect(proofNextLine(null)).toBe(OUTCOME_UNSET_NEXT)
    expect(proofNextLine(readStatedOutcome(SAID))).toBe('Milla is finding your first examples')
  })

  it('the onboarding question is the founder\'s sentence', () => {
    expect(OUTCOME_QUESTION).toBe('What should this achieve for you?')
  })
})

describe('🛑 ③ every surface reads the SAME client-level truth', () => {
  it('the Home card shows his words during Proof, with no programme', () => {
    expect(outcomeHeadline(readStatedOutcome(SAID))).toBe(SAID)
    expect(outcomeHeadline(null)).toBe('not set yet')
  })

  it('🛑 …and the Home card no longer reads the programme number ALONE', () => {
    // THE DEFECT, in the spelling that shipped. `meeting_target` is null for every client in
    // Proof, so this card was structurally empty exactly when it mattered most.
    const c = code(HOME)
    expect(c).toContain("prog?.outcome.stated ?? 'not set yet'")
    expect(c.includes("s={prog?.outcome.target ? 'booked meetings' : 'not set yet'}"),
      'the Home outcome card reads the programme target alone again').toBe(false)
  })

  it('🛑 the portal\'s Proof NEXT line branches on the stated outcome', () => {
    // ⚠️ SOURCE-SHAPE, AND THE REASON IS MECHANICAL: `ProgrammeWorkspace` is a .tsx module
    // and importing it here breaks this suite's parse (JSX). The BEHAVIOUR of the same
    // decision is proved on `proofNextLine` above, byte-for-byte the same two sentences;
    // this asserts the screen actually branches rather than asking unconditionally.
    const w = code(readFileSync(join(PORTAL, 'components', 'milla', 'ProgrammeWorkspace.tsx'), 'utf8'))
    expect(w).toContain("case 'Proof':          return p.outcome.stated")
    expect(w).toContain("? 'Milla is finding your first examples'")
    expect(w).toContain(": 'Tell Milla the outcome you want'")
    // The unconditional ask, in the spelling that shipped, must not return.
    expect(w.includes("case 'Proof':          return 'Tell Milla the outcome you want'"),
      'the Proof NEXT line asks every client again').toBe(false)
  })

  it('the customer programme reads it from CLIENTS, not from the programme', () => {
    const c = code(CUSTOMER)
    expect(c).toContain("db.from('clients')")
    expect(c).toContain(".select('outcome_stated')")
    // 🛑 AND ON THE NO-PROGRAMME PATH TOO — which is every client in Proof.
    // ⛓️ RESHAPED 10 Sep (A), SAME DUTY. The no-programme path now reads TWO client-level
    // facts together — the stated outcome (C03) and whether Proof is finished — because a
    // client who accepted their set is at the calculator, not still at Proof. The property
    // under test is unchanged: this path reads the outcome from CLIENTS rather than from a
    // programme that does not exist.
    expect(c).toContain('readStatedOutcomeFor(clientId), proofCompleteFor(clientId),')
    expect(c).toContain('outcome: { ...NO_PROGRAMME.outcome, stated },')
    expect(c).toContain("stage: millaStage({ status: null, proofComplete }),")
  })

  it('…and a failed read is "not stated", never a thrown screen', () => {
    expect(code(CUSTOMER)).toContain('} catch { return null }')
  })

  it('Vida quotes his words to the operator who will set the number', () => {
    const c = code(VIDA_COPY)
    // ⚠️ ASSERTED PER CARD, NOT BY COUNT. A count is a number I guessed; these are the three
    // places an operator reads the outcome — Signup (before any programme), Proof, and the
    // calibration hand-off — and each must quote the client rather than paraphrase them.
    for (const fallback of ['Milla will ask', 'Milla is shaping it with the client', 'What the client said they want']) {
      const at = c.indexOf(fallback)
      expect(at, `a Vida outcome card is gone: ${fallback}`).toBeGreaterThan(-1)
      expect(c.slice(Math.max(0, at - 200), at),
        `the card above "${fallback}" stopped quoting the client`).toContain('i.outcomeStated ? `“${i.outcomeStated}”`')
    }
  })

  it('the operator line flags a non-meetings outcome rather than hiding it', () => {
    expect(outcomeForOperator(readStatedOutcome(SAID))).toBe(SAID)
    expect(outcomeForOperator(readStatedOutcome('More revenue')))
      .toBe('More revenue — not a meetings outcome; agree this with them')
    expect(outcomeForOperator(null)).toBe('Not stated yet')
  })
})

describe('🛑 ④ the number stays separate, and the client cannot dictate the kind', () => {
  it('onboarding accepts the SENTENCE and derives the kind server-side', () => {
    const c = code(AUTH)
    expect(c).toContain('outcome_stated: emptyToUndefined.optional()')
    // ⛓️ 12 Sep (S1-AUDIT-002) — RETARGETED, NOT WEAKENED. The FACT is unchanged and still
    // asserted: the request supplies a SENTENCE and the server derives the KIND from it. What
    // moved is WHICH sentence — the browser's copy in the body was replaced by the confirmed
    // draft's, because the browser was couriering facts the server already held.
    expect(c).toContain('const outcome = readStatedOutcome(outcomeStatedOwned)')
    expect(c).toContain('text2(draftFacts?.desired_outcome) ?? outcome_stated')
    // The body still cannot name the kind — the original point of this assertion.
    expect(c).not.toContain('outcome_kind: req.body')
    // 🛑 `outcome_kind` MUST NOT BE ACCEPTED FROM THE REQUEST. If it were, a screen could
    // declare a "meetings" outcome for an answer that never asked for one, and a meeting
    // target would later be agreed against it.
    expect(c.includes('outcome_kind:  z.'), 'the request can declare the outcome kind').toBe(false)
    expect(c.includes('outcome_kind: z.'), 'the request can declare the outcome kind').toBe(false)
  })

  it('the welcome screen sends the words it already captured', () => {
    expect(code(WELCOME)).toContain('...(intent.trim() ? { outcome_stated: intent.trim() } : {})')
  })

  it('`meeting_target` is untouched — it is a commercial number, agreed later', () => {
    const c = code(AUTH)
    expect(c.includes('meeting_target'), 'onboarding writes a meeting target').toBe(false)
  })

  it('campaign_intent is SEEDED, never overwritten', () => {
    // The client may refine the copy brief separately without changing what they told us
    // they want, so an edited value always wins.
    expect(seedCampaignIntent('a brief they edited', readStatedOutcome(SAID))).toBe('a brief they edited')
    expect(seedCampaignIntent('', readStatedOutcome(SAID))).toBe(SAID)
    expect(seedCampaignIntent(null, null)).toBeNull()
  })
})

describe('⑤ the migration is additive and in all three homes', () => {
  const entry = PENDING_MIGRATIONS.find(m => m.key === '20260910_client_stated_outcome')

  it('registered in the runner', () => { expect(entry).toBeTruthy() })

  it('two nullable columns, no default, no backfill, idempotent', () => {
    const sql = entry!.sql
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS outcome_kind   text')
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS outcome_stated text')
    expect(sql.includes('DEFAULT'), 'a column carries a default').toBe(false)
    for (const destructive of ['DROP COLUMN', 'DROP CONSTRAINT', 'DELETE FROM', 'UPDATE public.clients SET']) {
      expect(sql.includes(destructive), `destructive: ${destructive}`).toBe(false)
    }
  })

  it('declared in the schema of record', () => {
    const schema = readFileSync(join(__dirname, '..', '..', '..', '..', 'packages', 'db', 'src', 'schema.sql'), 'utf8')
    expect(schema).toContain('outcome_stated text')
  })
})
