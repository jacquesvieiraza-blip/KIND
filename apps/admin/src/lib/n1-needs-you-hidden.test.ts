// ══════════════════════════════════════════════════════════════════════════════════════════
// N1 · 6 Oct — THE "NEEDS YOU" BADGE COUNTS ONLY CLIENTS VIDA SHOWS
//
// Founder, 6 Oct, on the badge after the old House account was hidden (#2710): *"but what needs
// me still. why is there still needs you???"* → *"log as a fix."*
//
// #2710 took the old House account off `/operator/clients`, `/operator/lifecycle-board` and
// `/operator/worklist`. The badge ALSO adds two other reads — escalations (`/operator/tasks`)
// and proof reviews (`/operator/alerts`) — and neither knows the account is hidden. So the badge
// counted a client the Needs-you list could never show (R174 · 5b: the badge counts what the
// filter shows).
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { needsYouBadgeIds } from './vida-needs-you-state'

describe('N1 · the badge counts only clients on the list', () => {
  it('🛑 an escalation or proof review for a client NOT on the list is not counted', () => {
    const ids = needsYouBadgeIds({
      board: ['live-house'],
      escalated: ['old-house'],
      proofReview: ['old-house'],
      listed: ['live-house', 'northwind'],
      demo: new Set(['northwind']),
    })
    expect(ids, 'the hidden old House account was counted').toEqual(['live-house'])
  })

  it('a listed client from any of the three reads is counted once', () => {
    const ids = needsYouBadgeIds({
      board: ['a'], escalated: ['a', 'b'], proofReview: ['c'],
      listed: ['a', 'b', 'c', 'd'], demo: new Set(),
    })
    expect(ids.sort()).toEqual(['a', 'b', 'c'])
  })

  it('the demo is still never counted', () => {
    expect(needsYouBadgeIds({
      board: ['demo'], escalated: [], proofReview: [], listed: ['demo'], demo: new Set(['demo']),
    })).toEqual([])
  })
})

describe('N1 · the component uses it', () => {
  const CODE = readFileSync(join(__dirname, '../components/vida/VidaClients.tsx'), 'utf8')
    .split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')

  it('🛑 the badge is built by needsYouBadgeIds, from the rows on the list', () => {
    expect(CODE).toMatch(/needsYouBadgeIds\(/)
    expect(CODE, 'the badge still spreads the raw escalation and proof reads').not.toMatch(/\.\.\.escalated,\s*\.\.\.proofReview/)
  })
})
