// MILLA SPEAKS THE CURRENT PRODUCT — the truth pins for both chat doors.
//
// 12 Aug, found on the founder's own screenshot while prepping the demo recording: asked
// "How is my ROI looking?", Milla replied "I don't have access to your specific ROI data …
// share or upload your relevant data" — beside KPIs showing every number she disclaimed —
// then printed raw markdown the panel cannot render. Three defects, and each pin below
// exists because one of them was LIVE:
//
//   • no context   → the snapshot block must carry the client's real numbers
//   • stale truth  → the retired cast (Denise, "AI sales platform", Vida-as-chatbot,
//                    /dashboard pages) must never reappear; prices must be interpolated
//   • raw markdown → the plain-text/bold-only instruction must be present
//
// RED PROOF: every string these tests ban was genuinely present in the two prompts they
// replaced (routes/milla.ts MILLA_CHAT_SYSTEM and lib/milla.ts systemPrompt) — run them
// against 12 Aug morning's file and they fail.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildMillaChatSystem, describeSnapshot, type MillaSnapshot } from './milla-chat-system'
import { PACK_PRICE_USD, PACK_LEADS, LEAD_PRICE_USD } from './onboarding-pack'

const SNAP: MillaSnapshot = {
  wallet_balance_usd: 4000,
  leads_awaiting: 22,
  meetings_booked: 2,
  leads_approved_total: 12,
  replies_total: 6,
  meetings_total: 3,
  spend_usd: 299,
  campaign_name: 'Ops leaders · Q3',
  campaign_status: 'active',
  pack: { active: true, included: 100, used: 12, left: 88 },
}

describe('the prompt describes the CURRENT product, never the retired one', () => {
  const sys = buildMillaChatSystem(SNAP)

  it('the retired cast is gone — Denise, the platform framing, Vida-as-chatbot', () => {
    // Each of these was live in a prompt on 12 Aug morning.
    expect(sys).not.toMatch(/Denise/)
    expect(sys).not.toMatch(/AI sales platform/)
    expect(sys).not.toMatch(/website chatbot/)
    // Vida is the INTERNAL operator room — a client-facing prompt must never name it.
    expect(sys).not.toMatch(/Vida/)
  })

  it('points to pages that exist on the Milla rail, not the retired /dashboard set', () => {
    for (const page of ['New leads', 'Pipeline', 'Meetings', 'Replies', 'Reports', 'Coaching', 'Billing']) {
      expect(sys).toContain(page)
    }
    // "Knowledge" and "Inbox" were /dashboard-era names the old prompt sent clients to.
    expect(sys).not.toMatch(/\bKnowledge\b/)
  })

  it('money sentences are interpolated from the constants, never typed (method #7)', () => {
    expect(sys).toContain(`$${PACK_PRICE_USD} to start`)
    expect(sys).toContain(`${PACK_LEADS} approved leads included`)
    expect(sys).toContain(`$${LEAD_PRICE_USD} per approved lead`)
    // The source must not carry a hardcoded price digit-string for the offer.
    const src = readFileSync(join(__dirname, 'milla-chat-system.ts'), 'utf8')
    expect(src).not.toMatch(/\$299|\$4\b/)
  })

  it('the approval wedge is stated — nothing contacted without approval', () => {
    expect(sys).toMatch(/nothing is ever contacted without their approval/i)
  })

  it('the renderer contract: plain text, bold only, no markdown structures', () => {
    expect(sys).toMatch(/\*\*bold\*\* is the ONLY formatting that renders/)
    expect(sys).toMatch(/headings, tables, blockquotes/)
  })

  it('she cannot act — and says the team gets action requests', () => {
    expect(sys).toMatch(/cannot pause campaigns/i)
  })
})

describe('the snapshot block — the fix for "I don\'t have access to your data"', () => {
  it('carries the client\'s real numbers, stated as usable facts', () => {
    const block = describeSnapshot(SNAP)
    expect(block).toContain('Leads awaiting their decision: 22')
    expect(block).toContain('Meetings all-time: 3 (2 this month)')
    expect(block).toContain('Wallet: $4000')
    expect(block).toContain('Total spend: $299')
    expect(block).toContain('"Ops leaders · Q3" is active')
    expect(block).toContain('12 of 100 included approvals used, 88 left')
  })

  it('never asks the client to upload what the product already shows', () => {
    const sys = buildMillaChatSystem(SNAP)
    expect(sys).not.toMatch(/upload/i)
    expect(sys).not.toMatch(/share .* your relevant data/i)
  })

  it('unlisted numbers are refused, not estimated', () => {
    expect(describeSnapshot(SNAP)).toMatch(/never estimate/)
  })

  it('FAIL-SOFT: a dead lookup produces an honest refusal, never silence or invention', () => {
    const block = describeSnapshot(null)
    expect(block).toMatch(/unavailable/i)
    expect(block).toMatch(/Do NOT invent/i)
    expect(block).toContain('Reports')
    // And the full prompt still assembles around it.
    expect(buildMillaChatSystem(null)).toContain(block)
  })

  it('a client with no campaign and no pack is described honestly', () => {
    const block = describeSnapshot({ ...SNAP, campaign_name: null, campaign_status: null, pack: { active: false, included: 0, used: 0, left: 0 } })
    expect(block).toContain('No campaign exists yet.')
    expect(block).toContain(`not bought the $${PACK_PRICE_USD} starter pack yet`)
  })
})

describe('both doors actually use the shared prompt (wiring, not intent)', () => {
  it('routes/milla.ts builds the system from the shared builder and the snapshot', () => {
    const src = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
    expect(src).toContain('buildMillaChatSystem(snapshot)')
    expect(src).toContain('buildMillaSummaryData(access.clientId)')
    // The retired prompt constant is gone entirely — no second prompt to drift.
    // (The file may still MENTION old names in dated history comments; the ban on the
    //  retired cast is enforced on the PROMPT STRING itself in the tests above, which is
    //  the only text a client ever meets.)
    expect(src).not.toMatch(/MILLA_CHAT_SYSTEM/)
  })

  it('lib/milla.ts (the desk chat) builds from the same pair', () => {
    const src = readFileSync(join(__dirname, 'milla.ts'), 'utf8')
    expect(src).toContain('buildMillaChatSystem(snapshot)')
    expect(src).toContain('buildMillaSummaryData(clientId)')
    // The instruction that produced "upload your relevant data" is gone.
    expect(src).not.toMatch(/suggest they upload the relevant document/)
  })

  it('the desk chat stays inside the portal 15s window: parallel lookups, fast model', () => {
    // 12 Aug, second finding: the portal aborts at 15s (apps/portal/src/lib/api.ts) and
    // this route answers un-streamed. The snapshot fetch added SERIAL latency and first
    // questions started timing out as "I hit a snag reaching the engine". Pins: the two
    // lookups run in ONE Promise.all, and the model is the fast one on both doors.
    const src = readFileSync(join(__dirname, 'milla.ts'), 'utf8')
    const parallel = src.indexOf('Promise.all')
    expect(parallel).toBeGreaterThan(-1)
    expect(src.slice(parallel, parallel + 400)).toContain('searchChunks')
    expect(src.slice(parallel, parallel + 400)).toContain('buildMillaSummaryData')
    expect(src).not.toMatch(/claude-sonnet/)
    expect(src).toContain('claude-haiku-4-5')
  })

  it('the summary route delegates to the SAME builder the chats read', () => {
    const src = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    expect(src).toContain("await import('../lib/milla-summary')")
    expect(src).toContain('buildMillaSummaryData(clientId)')
  })
})
