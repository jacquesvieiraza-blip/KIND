// R164 · Northwind's rows are safe, fixed and priced from the one curve.
import { describe, it, expect } from 'vitest'
import { quoteProgramme } from '@kind/shared'
import {
  NORTHWIND_BAND, NORTHWIND_CAST, NORTHWIND_EMAIL, NORTHWIND_MEETINGS, NORTHWIND_REPLIES, NORTHWIND_STAGES,
  northwindRows, stageIndex, type NorthwindIds,
} from './demo-northwind-data'

const ids: NorthwindIds = {
  userId: 'u', clientId: 'c', icpId: 'i', programmeId: 'p', campaignId: 'k', sequenceId: 's',
  leadIds: NORTHWIND_CAST.map((_, n) => `l${n}`), replyIds: NORTHWIND_REPLIES.map((_, n) => `r${n}`),
}
const now = new Date('2026-09-28T09:00:00Z')

describe('R164 · Northwind demo data', () => {
  it('every address the demo holds can never receive mail', () => {
    for (const stage of NORTHWIND_STAGES) {
      const r = northwindRows(stage, ids, now)
      const addresses = [
        ...r.leads.map(l => String(l.email)), ...r.replies.map(x => String(x.from_email)),
        ...(r.client ? [String(r.client.contact_email)] : []),
      ]
      for (const a of addresses) expect(a).toMatch(/\.(invalid|internal)$/)
    }
    expect(NORTHWIND_EMAIL.endsWith('@kind-demo.internal')).toBe(true)
  })

  it('the programme is priced by quoteProgramme on the demo\'s own band — nothing typed', () => {
    const p = northwindRows('Approval', ids, now).programme!
    const q = quoteProgramme(NORTHWIND_MEETINGS, NORTHWIND_BAND)
    expect(p).toMatchObject({
      meeting_target: q.meetings, price_per_meeting_cents: q.pricePerMeetingCents, price_total_cents: q.totalCents,
      first_payment_cents: q.firstPaymentCents, second_payment_cents: q.secondPaymentCents, recommended_volume: q.recommendedVolume,
    })
  })

  it('no money is ever recorded: authorised, never paid, no payment reference', () => {
    for (const stage of NORTHWIND_STAGES) {
      const p = northwindRows(stage, ids, now).programme
      if (!p) continue
      for (const k of Object.keys(p)) expect(k).not.toMatch(/paid_at|payment_ref|intent_id/)
      expect(p.first_authorised_at).toBeTruthy()
    }
  })

  it('the demo is fixed: the same stage, ids and time give the same account', () => {
    for (const stage of NORTHWIND_STAGES) expect(northwindRows(stage, ids, now)).toEqual(northwindRows(stage, ids, now))
  })

  it('each stage holds at least what the one before it held', () => {
    let prev = northwindRows('Brief', ids, now)
    for (const stage of NORTHWIND_STAGES.slice(1)) {
      const r = northwindRows(stage, ids, now)
      expect(r.leads.length).toBeGreaterThanOrEqual(prev.leads.length)
      expect(r.meetings.length).toBeGreaterThanOrEqual(prev.meetings.length)
      prev = r
    }
    expect(stageIndex('Complete')).toBe(5)
  })

  it('every meeting is qualified on all seven R141 conditions and evidenced by the prospect\'s own reply', () => {
    const r = northwindRows('Complete', ids, now)
    expect(r.meetings).toHaveLength(NORTHWIND_MEETINGS)
    const replyIds = new Set(r.replies.map(x => x.id))
    for (const m of r.meetings) {
      expect(Object.values(m.qualification as Record<string, boolean>)).toEqual(Array(7).fill(true))
      expect(replyIds.has(m.evidence_reply_id)).toBe(true)
      const reply = r.replies.find(x => x.id === m.evidence_reply_id)!
      expect(reply.lead_id).toBe(m.lead_id)
      expect(reply.classification).toBe('hot')
    }
  })
})
