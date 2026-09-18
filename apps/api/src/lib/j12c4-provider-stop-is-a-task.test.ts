// ══════════════════════════════════════════════════════════════════════════════════════════
// J12-C4 · A PROVIDER STOP IS A TASK — WITH THE NUMBER, HONEST COPY, AND VISIBLE BEFORE P1
//
// REQ: *"Apollo-credit stop = Needs-you with number; honest client copy; capacity visible
// before P1"* (PV 09 B). RED: *"Apollo credit stop leaves only a log line."*
//
// ── THREE CLAUSES, AND THEY FAIL IN THREE DIFFERENT PLACES ──────────────────────────────
//
// ① **WITH THE NUMBER.** XC-13 already turned the stop into a task; what it said was *"Apollo
//    is out of lead credits — sourcing cannot complete"* and nothing a person could size. 40
//    records short and 4,000 records short are the difference between topping up on the way
//    past and a purchase somebody has to approve — and the number was known at the call site
//    and went into `evidence`, which the queue does not read aloud.
//
// ② **HONEST CLIENT COPY.** The sentence was *"Sourcing capacity is temporarily out — the team
//    has been alerted and your credits are untouched. Try again shortly."* Two of its three
//    clauses stopped being true. **R124 (16 Sep, founder-locked):** *"299/4 is gone. out. we
//    are on the programme. all clients."* — so a client reassured about their CREDITS is being
//    reassured about a wallet the product no longer has, which **R94** had already named as one
//    of *"three false claims in one card… credits from a wallet the programme model does not
//    have."* And *"try again shortly"* points the client at a stop on OUR side.
//
// ③ **CAPACITY VISIBLE BEFORE P1.** A credit stop is ONE fact about the company — the task's
//    dedupe key is `provider:credits_exhausted`, one open row for the whole condition — so a
//    client-scoped read would show it to whichever client happened to trigger it and to nobody
//    else. The operator agreeing a target and taking a first payment from the NEXT client would
//    see a clean panel while nothing could be sourced for them either.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { classifyProviderFailure, providerStopSentence } from './provider-failure'
import { runOutcomeMessage } from './run-outcome'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const CREDITS = classifyProviderFailure(new Error('422: insufficient credits'))

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① NEEDS-YOU, WITH THE NUMBER
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C4 · the operator is told how big the stop was', () => {
  it('🛑 a credit stop names the number of records it refused', () => {
    const s = providerStopSentence(CREDITS, { requested: 250, served: 0 })
    expect(s, 'the sentence an operator reads carries no number').toMatch(/\b250\b/)
    expect(s).toContain('records')
  })

  it('🛑 AND THE TASK TITLE CARRIES IT — `evidence` is not read aloud by the queue', () => {
    const icps = code('../routes/icps.ts')
    const at = icps.indexOf('Apollo is out of lead credits')
    expect(at, 'the credit-stop title moved — this guard must be repointed').toBeGreaterThan(-1)
    const title = icps.slice(at, icps.indexOf('\n', at))
    expect(title, 'the title says a stop happened and not how big it was')
      .toContain('grantedSize.toLocaleString()')
    expect(icps, 'the detail dropped back to the generic action sentence')
      .toContain('detail: providerStopSentence(verdict, { requested: grantedSize, served: pool.served })')
  })

  it('what the pool already served is stated, and separated from the shortfall', () => {
    const with_ = providerStopSentence(CREDITS, { requested: 250, served: 12 })
    expect(with_).toMatch(/\b12\b/)
    expect(with_).toContain('unaffected')
    expect(providerStopSentence(CREDITS, { requested: 250, served: 0 }))
      .toContain('Nothing had been served')
  })

  it('🛑 IT NEVER STATES A REMAINING BALANCE — we do not hold one', () => {
    // A "credits left" figure would be invented: nothing in this system reads Apollo's
    // balance, and a number an operator acts on must come from somewhere.
    const s = providerStopSentence(CREDITS, { requested: 250, served: 12 })
    for (const invented of ['remaining', 'balance', 'credits left', 'left in the account']) {
      expect(s.toLowerCase(), `the sentence claims a ${invented} nobody read`).not.toContain(invented)
    }
  })

  it('the singular reads as English, and a negative never renders', () => {
    expect(providerStopSentence(CREDITS, { requested: 1, served: 0 })).toContain('1 record ')
    expect(providerStopSentence(CREDITS, { requested: -5, served: 0 })).toContain('0 records')
  })

  it('it still carries the action, so the task says what to DO', () => {
    expect(providerStopSentence(CREDITS, { requested: 250, served: 0 }))
      .toContain(CREDITS.operatorAction)
  })

  it('a NON-credit failure is sized too, and is not described as a credit stop', () => {
    const down = classifyProviderFailure(new Error('503 service unavailable'))
    const s = providerStopSentence(down, { requested: 250, served: 0 })
    expect(s).toMatch(/\b250\b/)
    expect(s, 'an outage is described as running short of credits').not.toContain('short')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② HONEST CLIENT COPY
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C4 · what the CLIENT is told when we stop', () => {
  const msg = runOutcomeMessage('quota_exhausted', 0, 0)

  it('🛑 THE RETIRED ECONOMICS ARE GONE — R124 retired credits for ALL clients', () => {
    for (const retired of ['credit', 'wallet', 'top up', 'top-up', 'balance']) {
      expect(msg.toLowerCase(), `the client is reassured about their ${retired}`)
        .not.toContain(retired)
    }
  })

  it('🛑 IT DOES NOT SEND THE CLIENT TO PRESS SOMETHING — the stop is ours', () => {
    for (const nudge of ['try again', 'retry', 'refresh']) {
      expect(msg.toLowerCase(), `the client is told to ${nudge} a stop on our side`)
        .not.toContain(nudge)
    }
  })

  it('🛑 IT DOES NOT BLAME THEIR TARGETING — this run proves nothing about their market', () => {
    expect(msg).toMatch(/not a problem with your targeting|not your targeting/i)
    for (const blame of ['widen', 'no leads matched', 'no companies match']) {
      expect(msg.toLowerCase(), `the client is told to ${blame} after a stop on our side`)
        .not.toContain(blame)
    }
  })

  it('🛑 AND NO PROVIDER IS NAMED — the diagnosis goes to the operator, not the client', () => {
    for (const leak of ['Apollo', 'apollo', '422', '402', 'API']) {
      expect(msg, `the client is shown ${leak}`).not.toContain(leak)
    }
  })

  it('it says somebody is on it, and that nothing of theirs was spent', () => {
    expect(msg).toContain('K.I.N.D has been alerted')
    // True by code, not by reassurance: this path releases the reservation in full.
    expect(msg).toMatch(/none of your programme volume has been used/)
    const icps = code('../routes/icps.ts')
    expect(icps, 'the reservation is no longer released on a provider failure')
      .toContain('await settleBatch(programmeBatch.id, 0)')
    expect(icps).toContain('release_proof_records')
  })

  it('🛑 and the status is unchanged — copy is not a new state', () => {
    // `quota_exhausted` is still what the run recorded. A sentence problem never becomes a
    // new status: that is how a failure would start being evidence about a market.
    expect(code('./provider-failure.ts')).toContain("'credits_exhausted', 'quota_exhausted'")
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ CAPACITY VISIBLE BEFORE P1
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J12-C4 · the panel says it before anybody takes a first payment', () => {
  const FACTS = code('./programme-lifecycle-facts.ts')
  const COPY = readFileSync(
    join(__dirname, '../../../admin/src/lib/vida-lifecycle-copy.ts'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

  it('🛑 THE READ IS GLOBAL, NOT CLIENT-SCOPED — one task covers the whole condition', () => {
    const at = FACTS.indexOf('async function providerCapacityNow')
    expect(at, 'the capacity read is gone').toBeGreaterThan(-1)
    const body = FACTS.slice(at, FACTS.indexOf('\n}', at))
    expect(body).toContain("t.kind === 'provider_credits_exhausted'")
    expect(body, 'the capacity read is scoped to one client, so every other client reads clean')
      .not.toMatch(/clientId/)
  })

  it('🛑 AND IT IS ON THE NO-PROGRAMME BRANCH — that branch IS before P1', () => {
    // A field supplied only where a programme exists is a capacity warning that arrives after
    // the money. This is the clause, and it lives in one `?? null`-free leg of the detail.
    const noProg = FACTS.slice(FACTS.indexOf('if (!p) {'), FACTS.indexOf('const campaignId'))
    expect(noProg, 'the pre-programme panel cannot state capacity').toContain('providerCapacityNow()')
    expect(noProg).toContain('providerCapacity,')
    // And on the programme branch too — a stop that began mid-programme applies to them as well.
    expect(FACTS.slice(FACTS.indexOf('const campaignId'))).toContain('await providerCapacityNow()')
  })

  it('🛑 UNKNOWN IS NOT FINE — a failed queue read never renders as capacity being good', () => {
    const at = FACTS.indexOf('async function providerCapacityNow')
    const body = FACTS.slice(at, FACTS.indexOf('\n}', at))
    expect(body).toContain('if (!res.ok) return { blocked: false, detail: null, unknown: true }')
    expect(COPY, 'the panel treats an unreadable queue as a clean answer')
      .toContain('!cap.blocked && !cap.unknown')
    expect(COPY).toContain('this is not a statement that capacity is fine')
  })

  it('🛑 THE COPY IS NOT GATED BY STAGE — it wraps every state', () => {
    // Inside a stage it would appear for whichever stage somebody remembered, and the stage
    // that matters most here is the earliest.
    expect(COPY).toContain('const base = withProviderCapacity(lifecycleCopyForState(i), i)')
    const at = COPY.indexOf('export function withProviderCapacity')
    const body = COPY.slice(at, COPY.indexOf('export function lifecycleCopy', at))
    expect(body, 'the capacity message is gated on a state').not.toMatch(/i\.state/)
    expect(body, 'the message is appended, where it gets skipped')
      .toContain('messages: [message, ...base.messages]')
  })

  it('🛑 and it says nothing at all when capacity is fine', () => {
    // A panel that always has a capacity sentence to print starts printing reassurance, and
    // "NORMAL IS SILENT" (R117) is the whole design of this surface.
    const at = COPY.indexOf('export function withProviderCapacity')
    const body = COPY.slice(at, COPY.indexOf('export function lifecycleCopy', at))
    expect(body).toContain('if (!cap || (!cap.blocked && !cap.unknown)) return base')
  })

  it('the panel carries the task\'s own sentence, so the number reaches the screen', () => {
    expect(COPY).toContain('cap.detail')
    const at = FACTS.indexOf('async function providerCapacityNow')
    expect(FACTS.slice(at, FACTS.indexOf('\n}', at)))
      .toContain("detail: (stop.detail ?? '').trim() || stop.title")
  })

  it('and Vida actually passes it — a leg nothing supplies renders nothing', () => {
    const page = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(page).toContain('providerCapacity: lc.providerCapacity ?? null')
  })
})
