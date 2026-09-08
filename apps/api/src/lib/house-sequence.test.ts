// ═══════════════════════════════════════════════════════════════════════════════════════
// THE APPROVED HOUSE SEQUENCE — verbatim, five steps, and it survives the send path.
//
// 🛑 THE DEFECT THIS SUITE EXISTS BECAUSE OF, FOUND BEFORE DEPLOY. `sequence-apply.ts` filters
// every stored sequence through `emailSteps`, which keeps only `channel === 'email'`. The
// canonical steps `programme-chain.ts` resolved carried no `channel`, so they were filtered to
// NOTHING — `buildDraftFromSequence` returned null, `usingSequence` went false, and
// `autoEnrollLead` fell through to the **AI draft path**. The enrolment would have carried
// `sequence_id` pointing at the approved words while containing words a model invented, and
// every guard downstream would have been satisfied by it.
//
// ⚠️ SO THE CENTRAL CASE HERE IS NOT "are the words right" — it is "do the approved words
// actually reach an enrolment". Content that is correct and unreachable is the more dangerous
// of the two failures, because it looks finished.
//
// ⚠️ AND THE COPY IS ASSERTED VERBATIM. These are the founder's own sentences; a paraphrase
// that reads the same is a different message going to a real person.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

import {
  HOUSE_SEQUENCE_STEPS, HOUSE_CADENCE, HOUSE_SEND_SCHEDULE,
} from './house-sequence'
import { emailSteps, buildDraftStepsFromSequence, applyTokens, MAX_SEQUENCE_STEPS } from './sequence-apply'
import { cadenceIsConfigured } from './preparation-readiness'
import { maySendNow, isSendSchedule } from './send-schedule'

// ── ① THE WORDS, VERBATIM ────────────────────────────────────────────────────────────

describe('① five steps, each with a distinct job, exactly as approved', () => {
  it('there are exactly five, and the platform can carry them', () => {
    expect(HOUSE_SEQUENCE_STEPS).toHaveLength(5)
    expect(MAX_SEQUENCE_STEPS, 'the shared cap is below the approved length').toBeGreaterThanOrEqual(5)
  })

  it('🛑 the subjects are the approved subjects', () => {
    expect(HOUSE_SEQUENCE_STEPS.map(s => s.subject)).toEqual([
      "{{first_name}}, who's building your pipeline this quarter?",
      'How this actually works',
      'Why outbound usually stops',
      // ⛓️ CORRECTED BY THE FOUNDER: "before it exists" was logically wrong — the work exists,
      // and what is being approved is that it goes OUT.
      'You approve it before it goes out',
      'Closing the loop, {{first_name}}',
    ])
  })

  it('🛑 each body carries its approved opening sentence', () => {
    const opens = HOUSE_SEQUENCE_STEPS.map(s => s.body.split('\n')[0])
    expect(opens[0]).toBe("Hi {{first_name}} — if your senior people are still spending time finding prospects, they're doing work M&V can take off their plate.")
    expect(opens[1]).toBe('Two halves.')
    expect(opens[2]).toBe('Outbound usually becomes difficult when the list drifts, follow-up stops after one email, or whoever owns it gets pulled onto something more urgent.')
    expect(opens[3]).toBe("Nothing goes out that you haven't seen.")
    expect(opens[4]).toBe("I'll leave it here.")
  })

  it('🛑 no fabricated proof, ROI, meeting counts or customer names', () => {
    const all = HOUSE_SEQUENCE_STEPS.map(s => `${s.subject} ${s.body}`).join(' ').toLowerCase()
    for (const banned of ['case study', 'roi', '% more', 'x more', 'guarantee', 'guaranteed',
                          'meetings booked', 'our clients see', 'average client', 'ai-powered']) {
      expect(all, `the approved copy claims "${banned}", which we cannot substantiate`).not.toContain(banned)
    }
  })

  it('the tokens used are ones the substituter actually resolves', () => {
    const used = new Set<string>()
    for (const s of HOUSE_SEQUENCE_STEPS) {
      for (const m of `${s.subject} ${s.body}`.matchAll(/\{\{\s*([\w]+)\s*\}\}/g)) used.add(m[1])
    }
    expect([...used].sort()).toEqual(['company', 'first_name'])
    // Proved by substituting, not by reading the map: a token that renders as an empty string
    // leaves "Hi ," in somebody's inbox.
    const lead = { first_name: 'Ada', last_name: 'Lovelace', company: 'Northwind' }
    for (const s of HOUSE_SEQUENCE_STEPS) {
      const out = `${applyTokens(s.subject, lead)} ${applyTokens(s.body, lead)}`
      expect(out, 'a literal token reached the rendered message').not.toContain('{{')
    }
    expect(applyTokens(HOUSE_SEQUENCE_STEPS[0].subject, lead)).toBe("Ada, who's building your pipeline this quarter?")
    expect(applyTokens(HOUSE_SEQUENCE_STEPS[1].body, lead)).toContain('for Northwind?')
  })
})

// ── ② THEY SURVIVE THE SEND PATH ─────────────────────────────────────────────────────

describe('② the approved words actually reach an enrolment', () => {
  it('🛑 every step is an EMAIL step — without it the whole sequence is filtered away', () => {
    // `emailSteps` keeps only `channel === 'email'`. A sequence filtered to nothing does not
    // fail: it silently becomes an AI draft, with the approved sequence id still on the row.
    expect(HOUSE_SEQUENCE_STEPS.every(s => s.channel === 'email')).toBe(true)
    expect(emailSteps(HOUSE_SEQUENCE_STEPS as never), 'the approved sequence is dropped by the send path')
      .toHaveLength(5)
  })

  it('🛑 and the enrolment step array built from them is all five, in order, tokenised', () => {
    const built = buildDraftStepsFromSequence(
      HOUSE_SEQUENCE_STEPS as never,
      { first_name: 'Ada', last_name: 'Lovelace', company: 'Northwind' },
    )
    expect(built, 'the approved sequence produces fewer steps than were approved').toHaveLength(5)
    expect(built[0].subject).toBe("Ada, who's building your pipeline this quarter?")
    expect(built[3].subject).toBe('You approve it before it goes out')
    expect(built.map(s => s.wait_days)).toEqual([3, 4, 5, 6, 0])
  })

  it('🛑 the CHAIN preserves the channel too — that is where it was being dropped', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const CHAIN = readFileSync(join(__dirname, './programme-chain.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
    expect(CHAIN, 'the resolved steps lose their channel again, and the send path drops them all')
      .toContain('out.push({ channel, subject, body, wait_days: wait })')
    // An absent channel defaults to email: a stored step with a subject and a body IS an email
    // step, and refusing one for a missing discriminator empties a real sequence.
    expect(CHAIN).toContain("(ch === 'linkedin' || ch === 'call' || ch === 'whatsapp') ? ch : 'email' as const")
  })
})

// ── ③ CADENCE AND SCHEDULE ───────────────────────────────────────────────────────────

describe('③ Day 0 · 3 · 7 · 12 · 18, Mon–Fri, 08:30–17:00 recipient-local', () => {
  // 🛑 THE ASSERTION IS ON THE DAYS, BECAUSE THE DAYS ARE THE PRODUCT DECISION.
  //
  // The founder locked the cadence twice — as `[0,3,4,5,6]` and as "Day 0 · 3 · 7 · 12 · 18" —
  // and the two disagree under this product's own semantics. `send-due.ts` passes the CURRENT
  // step's `wait_days` as `waitDaysNext`, so the value is the wait AFTER that step; persisting
  // `[0,3,4,5,6]` literally would wait ZERO days after step 1 and put two emails in the same
  // prospect's inbox on day one. The days are unambiguous, so the days are what is honoured.
  it('🛑 the persisted waits produce the approved DAYS: 0 · 3 · 7 · 12 · 18', () => {
    const days: number[] = []
    let acc = 0
    for (const w of HOUSE_CADENCE) { days.push(acc); acc += w }
    expect(days, 'the persisted cadence no longer produces the approved send days').toEqual([0, 3, 7, 12, 18])
    // And the encoding that produces them, stated so a change to either is visible in the diff.
    expect(HOUSE_CADENCE).toEqual([3, 4, 5, 6, 0])
  })

  it('🛑 NO TWO STEPS LAND ON THE SAME DAY — the failure the literal array would have caused', () => {
    const days: number[] = []
    let acc = 0
    for (const w of HOUSE_CADENCE) { days.push(acc); acc += w }
    expect(new Set(days).size, 'two messages reach the same prospect on the same day').toBe(days.length)
    // Every gap is a real gap: a zero wait between real steps is a burst, not a cadence.
    expect(HOUSE_CADENCE.slice(0, -1).every(w => w > 0)).toBe(true)
  })

  it('and readiness accepts it as a real configured cadence', () => {
    expect(cadenceIsConfigured(HOUSE_CADENCE)).toBe(true)
  })

  it('🛑 the schedule is Mon–Fri 08:30–17:00 and is well-formed', () => {
    expect(HOUSE_SEND_SCHEDULE).toEqual({ days: [1, 2, 3, 4, 5], start: '08:30', end: '17:00', default_tz: 'Europe/London' })
    expect(isSendSchedule(HOUSE_SEND_SCHEDULE)).toBe(true)
  })

  it('🛑 and under it, no unplaced American is reached at 05:30 Pacific', () => {
    // 12:30 UTC = 08:30 New York = 05:30 Los Angeles. The intersection refuses it.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T12:30:00Z'), { country: 'United States' }).allowed).toBe(false)
    // A UK morning is fine, and the US intersection opens later in the day.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T08:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(true)
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-09T18:30:00Z'), { country: 'United States' }).allowed).toBe(true)
    // Weekends refuse under the approved schedule.
    expect(maySendNow(HOUSE_SEND_SCHEDULE, new Date('2026-09-12T10:00:00Z'), { country: 'United Kingdom' }).allowed).toBe(false)
  })
})

// ── ④ THE APPLY GRANTS NOTHING AND RUNS BY ITSELF NOWHERE ────────────────────────────

describe('④ persisting the words is not approving, sending or scheduling anything', () => {
  const src = (async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    return readFileSync(join(__dirname, './house-sequence.ts'), 'utf8')
      .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')
  })()

  it('🛑 it writes two rows and nothing else', async () => {
    const SRC = await src
    for (const banned of ["status: 'APPROVED'", "status: 'LIVE'", 'approved_at', 'second_authorised_at',
                          'went_live_at', 'markReadyForApproval', 'autoEnrollLead', 'sendSequenceEmail',
                          'ensureCampaignForIcp', 'review_preparation_hash']) {
      expect(SRC, `the apply reaches ${banned}`).not.toContain(banned)
    }
    // Exactly two update targets: the canonical sequence, and the programme's schedule.
    expect(SRC).toContain("db.from('figsy_sequences')")
    expect(SRC).toContain('send_schedule: HOUSE_SEND_SCHEDULE')
    // 🛑 AND NOT THE LEGACY STORE. Writing the words into campaign settings too would recreate
    // the dual truth this package spent a whole pass removing.
    expect(SRC, 'the words are being written into the campaign settings copy as well')
      .not.toContain("db.from('figsy_campaigns')")
  })

  it('🛑 nothing calls it — it is operator-invoked, after the migrations', async () => {
    const { readdirSync, readFileSync } = await import('fs')
    const { join } = await import('path')
    const roots = [__dirname, join(__dirname, '../routes')]
    const callers: string[] = []
    for (const dir of roots) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.ts') || f.endsWith('.test.ts') || f === 'house-sequence.ts') continue
        if (readFileSync(join(dir, f), 'utf8').includes('applyHouseProgrammeSequence')) callers.push(f)
      }
    }
    expect(callers, `applyHouseProgrammeSequence is invoked by: ${callers.join(', ')}`).toEqual([])
  })

  it('🛑 it refuses rather than creating a campaign', async () => {
    const SRC = await src
    expect(SRC).toContain('if (!campaignId) {')
    expect(SRC).toContain('Run preparation first')
  })

  it('🛑 it is idempotent — a second run updates, it does not add a rival sequence', async () => {
    const SRC = await src
    expect(SRC).toContain('if (sequenceId) {')
    expect(SRC).toContain(".update({ steps, campaign_id: campaignId")
    // A rival sequence on one campaign is exactly what `resolveProgrammeChain` refuses to
    // choose between, so creating one would BREAK the programme rather than duplicate it.
  })
})
