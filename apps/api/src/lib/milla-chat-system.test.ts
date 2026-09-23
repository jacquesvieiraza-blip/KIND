// MILLA SPEAKS THE CURRENT PRODUCT — the truth pins for both chat doors.
//
// 12 Aug, found on the founder's own screenshot while prepping the demo recording: asked
// "How is my ROI looking?", Milla replied "I don't have access to your specific ROI data …
// share or upload your relevant data" — beside KPIs showing every number she disclaimed —
// then printed raw markdown the panel cannot render.
//
// ══ ⛓️ 30 Aug (BUILD-004A-2) — HALF THESE PINS WERE PINNING THE RETIRED PRODUCT ═════════
//
// 🛑 THIS SUITE WAS GREEN ON THE FOUNDER'S LIVE WALK, while Milla told him he had "22 leads
// awaiting your decision", sent him to the "New leads page", and described approving and
// passing individual prospects. It was green BECAUSE it asserted those things: it required
// "$299 to start", "100 approved leads included", "$4 per approved lead", "New leads", a
// wallet balance in the snapshot block, and "nothing is ever contacted without their
// approval" — the per-lead approval wedge.
//
// The pins were not wrong when written. They were written against a product that has since
// been replaced, and a truth test that is never re-aimed becomes the thing holding the old
// truth in place. Each one below is INVERTED where it named the retired model and KEPT where
// it named a defect that is still a defect — the missing context, the raw markdown, the
// upload request, the 15s window.
//
// RED PROOF for the new pins: restore any retired concept to the prompt and they fail.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildMillaChatSystem, describeProgramme, describeOutcomes, type MillaSnapshot,
} from './milla-chat-system'
import type { CustomerProgramme } from './customer-programme'

const SNAP: MillaSnapshot = {
  meetings_booked: 2,
  meetings_total: 3,
  replies_total: 6,
}

const PROG: CustomerProgramme = {
  stage: 'Live',
  quickAction: "What's working?",
  paused: false, pausedCopy: null, reviewOpen: false,
  outcome: { kind: 'meetings', target: 10 },
  progress: { delivered: 240, sourcingAuthorised: true, outcomesAchieved: 3 },
  money: { totalCents: 480_000, firstPaidAt: '2026-08-01T00:00:00Z', secondPaidAt: null },
  approvedAt: null, wentLiveAt: '2026-08-10T00:00:00Z',
}

/** Every concept the customer product no longer has. None may reach the model. */
const RETIRED = [
  'wallet', 'top up', 'credits', 'credit plan', '$299', '$4 ',
  'approved lead', 'per-lead price', 'starter pack', '100-lead',
  'New leads page', 'cost per lead',
]

describe('the prompt describes the CURRENT product, never the retired one', () => {
  const sys = buildMillaChatSystem(SNAP, PROG)

  it('the retired cast is gone — Denise, the platform framing, Vida-as-chatbot', () => {
    // Each of these was live in a prompt on 12 Aug morning.
    expect(sys).not.toMatch(/Denise/)
    expect(sys).not.toMatch(/AI sales platform/)
    expect(sys).not.toMatch(/website chatbot/)
    // Vida is the INTERNAL operator room — a client-facing prompt must never name it.
    expect(sys).not.toMatch(/Vida/)
  })

  it('🛑 NOT ONE RETIRED COMMERCIAL CONCEPT REACHES THE MODEL', () => {
    // ⛓️ THIS REPLACES THE THREE PINS THAT REQUIRED THEM. The prompt used to be asserted to
    // CONTAIN "$299 to start", "100 approved leads included" and "$4 per approved lead"; the
    // founder then heard all three back from Milla in her own voice.
    //
    // ⚠️ THE ONE PLACE THEY MAY APPEAR is the sentence that forbids them — she is told what
    // does not exist so she cannot reach for it when a client asks. So the scan is on the
    // prompt with that clause removed, which is what makes this guard mean anything.
    const forbidClause = sys.split('\n\n').find(p => p.startsWith('RETIRED —')) ?? ''
    expect(forbidClause, 'the retired-concepts clause is gone from the prompt').not.toBe('')
    const rest = sys.replace(forbidClause, '')
    for (const concept of RETIRED) {
      expect(rest.toLowerCase(), `Milla is still taught the retired concept: ${concept}`)
        .not.toContain(concept.toLowerCase())
    }
  })

  it('the programme model is what she is taught instead', () => {
    expect(sys).toContain("programme partner")
    expect(sys).toMatch(/the client tells you the OUTCOME they want/)
    // ⛓️ 31 Aug — RE-AIMED. This asserted the bare stage list and the bare money rule as two
    // SEPARATE sentences, which is exactly the shape that left the gap she interpolated
    // across. The ordered lifecycle replaces both, and is asserted by step in the block below.
    expect(sys).toMatch(/ONE approval of the whole programme, not a decision per person/)
    expect(sys).toContain('THE PROGRAMME LIFECYCLE, IN ORDER')
    // The money is still the RULE with no figure typed into it, now anchored to the steps.
    expect(sys).toMatch(/a programme has ONE price, paid in two halves — Payment 1 at step 3 and Payment 2 at step 7/)
  })

  it('meetings are one outcome, and a non-meeting outcome is never priced', () => {
    expect(sys).toMatch(/Meetings are ONE kind of outcome, not the whole product/)
    expect(sys).toMatch(/Do NOT price a non-meeting outcome/)
  })

  it('points to pages that exist on the Milla rail, and says the approval queue does not', () => {
    for (const page of ['Programme', 'Pipeline', 'Meetings', 'Replies', 'Reports', 'Coaching', 'Billing']) {
      expect(sys).toContain(page)
    }
    // "Knowledge" and "Inbox" were /dashboard-era names the old prompt sent clients to.
    expect(sys).not.toMatch(/\bKnowledge\b/)
    // 🛑 SHE MUST NOT SEND THEM TO THE RETIRED DESK. This is the exact sentence the founder
    // got — "the New leads page" — and it is now stated as not existing.
    expect(sys).toMatch(/There is no "New leads" page and no approval queue/)
  })

  it('no price is typed into the source — the figures come from the programme row', () => {
    const src = readFileSync(join(__dirname, 'milla-chat-system.ts'), 'utf8')
    const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(code, 'a price digit-string is hardcoded in the prompt builder').not.toMatch(/\$299|\$4\b/)
    // The retired constants are not imported at all any more.
    expect(code).not.toMatch(/PACK_PRICE_USD|PACK_LEADS|LEAD_PRICE_USD/)
  })

  it('the renderer contract: plain text, bold only, no markdown structures', () => {
    expect(sys).toMatch(/\*\*bold\*\* is the ONLY formatting that renders/)
    expect(sys).toMatch(/headings, tables, blockquotes/)
  })

  it('she cannot act — and says the team gets action requests', () => {
    expect(sys).toMatch(/cannot pause a programme/i)
    expect(sys).toMatch(/their message has reached the team/i)
  })
})

describe('the live context block — the fix for "I don\'t have access to your data"', () => {
  it('carries the client\'s real PROGRAMME, stated as usable facts', () => {
    // ⛓️ THIS PIN USED TO REQUIRE "Leads awaiting their decision: 22" and "Wallet: $4000" —
    // and got them, out of Milla's mouth, on the founder's walk.
    const block = describeProgramme(PROG)
    expect(block).toContain('Stage: Live')
    expect(block).toContain('Outcome they asked for: 10 booked meetings')
    // ⛓️ 23 Sep (R136 ③) — WAS `'240 of 600 people authorised'`. The 600 was the sourcing
    // ceiling — meetings × 400 since R136, the limit the founder locked as never disclosed —
    // and this block is read by Milla, who speaks to the client. She gets the count, not the limit.
    expect(block).toContain('240 people found so far')
    expect(block).not.toMatch(/of \d+ people authorised/)
    expect(block, 'she is told the limit exists and never to state it').toContain('NEVER state, estimate or hint at that limit')
    expect(block, 'and that the target is not a guarantee (R136 ②)').toContain('not a guarantee')
    expect(block).toContain('Meetings booked so far: 3')
    // Money derived from the row in cents, never typed.
    expect(block).toContain('Programme value: $4,800 total, paid in two halves of $2,400')
    // ⛓️ 31 Aug — the per-client block now names the SAME step numbers as the lifecycle, so
    // the two cannot describe one gate in two different ways.
    expect(block).toContain('Payment 1 (step 3 — authorises sourcing and preparation only): PAID')
    expect(block).toContain('Payment 2 (step 7 — after the programme approval at step 6; authorises outreach): not paid yet')
  })

  it('and the outcomes it has produced', () => {
    const block = describeOutcomes(SNAP)
    expect(block).toContain('Replies all-time: 6')
    expect(block).toContain('Meetings all-time: 3 (2 this month)')
  })

  it('never asks the client to upload what the product already shows', () => {
    const sys = buildMillaChatSystem(SNAP, PROG)
    expect(sys).not.toMatch(/upload/i)
    expect(sys).not.toMatch(/share .* your relevant data/i)
  })

  it('unlisted numbers are refused, not estimated', () => {
    expect(describeProgramme(PROG)).toMatch(/never estimate/)
    expect(describeOutcomes(null)).toMatch(/never estimate|Do NOT invent/i)
  })

  it('🛑 FAIL-SOFT: an unreadable programme is NOT "you have no programme"', () => {
    // The single most damaging thing she could say to a client who has paid.
    const block = describeProgramme(null)
    expect(block).toMatch(/could not be read/i)
    expect(block).toMatch(/Do NOT invent/i)
    expect(block).toMatch(/do NOT say they have no programme/)
    expect(block).toMatch(/nothing has changed/)
    // And the full prompt still assembles around it.
    expect(buildMillaChatSystem(null, null)).toContain(block)
  })

  it('unreadable MEETINGS are refused too — never rendered as zero', () => {
    // `outcomesAchieved: null` means the meetings read failed. Telling a client with three
    // meetings that they have none is the worst available false statement on this subject.
    const block = describeProgramme({ ...PROG, progress: { ...PROG.progress, outcomesAchieved: null } })
    expect(block).toMatch(/UNREADABLE right now — do not state a number/)
    expect(block).not.toContain('Meetings booked so far: 0')
  })

  it('a client with no programme yet is described honestly, and quoted no price', () => {
    const block = describeProgramme({
      ...PROG, stage: 'Proof', outcome: { kind: 'meetings', target: null },
      progress: { delivered: 0, sourcingAuthorised: false, outcomesAchieved: 0 },
      money: { totalCents: 0, firstPaidAt: null, secondPaidAt: null },
    })
    expect(block).toContain('Stage: Proof')
    expect(block).toContain('no target is set on their programme yet')
    expect(block).toContain('No programme price has been set yet')
    expect(block, 'a price was quoted to a client who has none').not.toMatch(/\$\d/)
  })

  it('pause and review are stated as the distinct things they are', () => {
    expect(describeProgramme({ ...PROG, paused: true })).toContain('Stage: Live (PAUSED)')
    expect(describeProgramme({ ...PROG, reviewOpen: true }))
      .toContain('a review decision is waiting on us')
  })
})

describe('the one door uses the shared prompt (wiring, not intent)', () => {
  it('🛑 routes/milla.ts BUILDS NO SYSTEM AT ALL — the second door is unmounted (D-63)', () => {
    // 🛑 COMMENTS STRIPPED BEFORE THE SCAN, and the first cut of this guard proved why: the
    // tombstone left where the door stood NAMES `buildMillaChatSystem` while explaining that
    // nothing was lost with the route, so an absence assertion on the raw file failed against
    // its own explanation. A guard that reads prose is not reading the product.
    const src = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n')
      .map(l => { const i = l.search(/(?<![:\\])\/\//); return i === -1 ? l : l.slice(0, i) })
      .join('\n')
    // ⛓️ 18 Sep (D-63) — THIS ASSERTED THE OPPOSITE, and it was right until the door went:
    // ~~`expect(src).toContain('buildMillaChatSystem(snapshot, programme, proof)')`~~ plus the
    // proof, snapshot and programme reads, under the heading "both doors".
    //
    // 🛑 THE DUTY IS NOT WEAKENED, IT IS SATISFIED A STRONGER WAY. That guard existed so a fix
    // could not land on one door and miss the other. With `POST /milla/chat` unmounted there
    // is exactly ONE door — the persisted desk chat in `lib/milla.ts`, asserted immediately
    // below — so the divergence this protected against no longer has two places to occur in.
    //
    // ⚠️ AND THE ABSENCE IS ASSERTED, NOT ASSUMED. If a second door is ever rebuilt here it
    // will name the builder, and this goes red — which is the same protection pointed at the
    // thing that can actually go wrong now.
    expect(src, 'a second Milla door is building its own system prompt again')
      .not.toContain('buildMillaChatSystem')
    expect(src, 'a second Milla door is reading the chat context again')
      .not.toContain('readProofChatContext')
    // The retired prompt constant is gone entirely — no second prompt to drift.
    // (The file may still MENTION old names in dated history comments; the ban on the
    //  retired cast is enforced on the PROMPT STRING itself in the tests above, which is
    //  the only text a client ever meets.)
    expect(src).not.toMatch(/MILLA_CHAT_SYSTEM/)
  })

  it('lib/milla.ts (the desk chat) builds from the same pair', () => {
    const src = readFileSync(join(__dirname, 'milla.ts'), 'utf8')
    // ⛓️ RETARGETED 10 Sep (C06) — see the door above; the Proof desk is the third argument
    // on both doors, and the point of the pair of assertions is that neither door is left
    // behind.
    // ⛓️ 14 Sep (R121, Build 2) — a FOURTH argument on THIS door: what the client told her at
    // setup. The desk chat is the one a client actually converses with, and it is where the
    // Brief memory earns its cost; the side-panel door above is a short stateless Q&A that
    // holds no session, so it is deliberately NOT given a fifth lookup per question. The pair
    // this test protects — both doors build from the ONE shared builder — is unchanged.
    expect(src).toContain('buildMillaChatSystem(snapshot, programme, proof, briefMemory)')
    expect(src, 'the desk chat cannot see what they told her at setup').toContain('briefDraftFor')
    expect(src).toContain('readProofChatContext(clientId)')
    expect(src).toContain('buildMillaSummaryData(clientId)')
    expect(src).toContain('readCustomerProgramme(clientId)')
    // The instruction that produced "upload your relevant data" is gone.
    expect(src).not.toMatch(/suggest they upload the relevant document/)
    // ⛓️ 30 Aug — AND SO IS THE GENERIC LEAD-GEN FALLBACK. "Still be genuinely helpful with
    // general lead-gen, ICP and outreach guidance" was the one line inviting her to answer as
    // a generic lead-gen chatbot — where cost-per-lead and campaign metrics came from.
    const code = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(code, 'the generic lead-gen fallback is back in the desk chat')
      .not.toMatch(/general lead-gen, ICP and outreach guidance/)
  })

  it('the desk chat stays inside the portal 15s window: parallel lookups, fast model', () => {
    // 12 Aug, second finding: the portal aborts at 15s (apps/portal/src/lib/api.ts) and
    // this route answers un-streamed. The snapshot fetch added SERIAL latency and first
    // questions started timing out as "I hit a snag reaching the engine". Pins: the two
    // lookups run in ONE Promise.all, and the model is the fast one on both doors.
    const src = readFileSync(join(__dirname, 'milla.ts'), 'utf8')
    const parallel = src.indexOf('Promise.all')
    expect(parallel).toBeGreaterThan(-1)
    // ⚑ 30 Aug — the programme joined the SAME batch, so the window is unchanged. Widened
    // from 400 to cover all three legs rather than dropping the assertion.
    expect(src.slice(parallel, parallel + 1_400)).toContain('searchChunks')
    expect(src.slice(parallel, parallel + 1_400)).toContain('buildMillaSummaryData')
    expect(src.slice(parallel, parallel + 1_400)).toContain('readCustomerProgramme')
    expect((src.match(/Promise\.all/g) ?? []), 'the lookups were split into serial batches')
      .toHaveLength(1)
    // ⛓️ 14 Sep — ~~`not.toMatch(/claude-sonnet/)` + `toContain('claude-haiku-4-5')`~~.
    // The founder ruled the conversational surfaces onto Sonnet, so a pin that forbade it
    // by name was pinning the wrong thing: what matters is that this door reads the SHARED
    // constant rather than typing a model id of its own, which is what let 46 hand-written
    // ids drift in the first place.
    expect(src, 'the desk chat must not hand-type a model id').not.toMatch(/model:\s*'claude-/)
    expect(src).toContain('CONVERSATION_MODEL')
  })

  it('the summary route delegates to the SAME builder the chats read', () => {
    const src = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    expect(src).toContain("await import('../lib/milla-summary')")
    expect(src).toContain('buildMillaSummaryData(clientId)')
  })
})
