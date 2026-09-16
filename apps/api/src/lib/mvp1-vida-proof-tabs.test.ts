// ⚑ 16 Sep (MVP1 · A2) — HEALTHY PROOF IS NOT VIDA'S WORKING SET.
//
// 🛑 THE DEFECT. `vida/page.tsx` declared eleven cockpit tabs with NO stage gate, and re-typed
// the same eleven inline at the render — two hand-typed copies of one list, both
// unconditional. So a prospect mid-Proof, with no campaign, no sequence, no approvals and
// nobody to send to, appeared in Vida with People, Approvals, Campaign and Sequence all
// offering work on a pipeline that does not exist. Proof is the CLIENT calibrating with
// Milla; presenting its batch as Vida's working set invites an operator into a conversation
// they are not part of.
//
// ⚠️ WITHHOLDING IS NOT DELETING. The founder's boundary, verbatim: *"Do NOT rewrite
// `/operator/people`. Do NOT delete rows. Do NOT break People after Proof."* Nothing here
// touches a route or a row — the tabs return the moment the client leaves Proof.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  COCKPIT_TABS, CLIENT_WORK_TABS, cockpitTabsFor, isHealthyProof,
  resolveCockpitTab, PROOF_FALLBACK_TAB, type CockpitTab,
} from '../../../admin/src/lib/vida-cockpit-tabs'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ THE RULE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · healthy Proof withholds the client-work tabs', () => {
  it('🛑 THE DEFECT, PINNED — a healthy Proof client gets no People/Approvals/Campaign/Sequence', () => {
    const tabs = cockpitTabsFor({ stage: 'proof', needsYou: false })
    for (const withheld of ['People', 'Approvals', 'Campaign', 'Sequence'] as CockpitTab[]) {
      expect(tabs, `${withheld} is still offered during healthy Proof`).not.toContain(withheld)
    }
  })

  it('ICP SURVIVES — it is the remedy, not client work', () => {
    // Removing targeting during Proof would take away the only thing an operator can usefully
    // do about a Proof problem, at the moment they need it.
    expect(cockpitTabsFor({ stage: 'proof', needsYou: false })).toContain('ICP')
  })

  it('and so do the reference tabs', () => {
    const tabs = cockpitTabsFor({ stage: 'proof', needsYou: false })
    for (const kept of ['Inbox', 'Asks', 'Bookings', 'Programme', 'Pool', 'Exceptions'] as CockpitTab[]) {
      expect(tabs, `${kept} was withheld and should not have been`).toContain(kept)
    }
  })

  it('🛑 AN EXCEPTION RE-OPENS THEM — the operator is in it now', () => {
    const tabs = cockpitTabsFor({ stage: 'proof', needsYou: true })
    expect(tabs).toEqual([...COCKPIT_TABS])
    // Including People, which is where the set-aside candidates are.
    expect(tabs).toContain('People')
  })

  it('🛑 POST-PROOF IS COMPLETELY UNCHANGED — every stage keeps all eleven', () => {
    for (const stage of ['signup', 'recommendation', 'sourcing', 'approval', 'live', 'review', 'completion']) {
      expect(cockpitTabsFor({ stage, needsYou: false }), stage).toEqual([...COCKPIT_TABS])
    }
  })

  it('🛑 AN UNREADABLE STAGE FAILS OPEN — never hide working controls on a guess', () => {
    for (const stage of [null, undefined, '']) {
      expect(cockpitTabsFor({ stage, needsYou: false }), String(stage)).toEqual([...COCKPIT_TABS])
      expect(isHealthyProof({ stage, needsYou: false })).toBe(false)
    }
  })

  it('the order never reshuffles — it filters the canonical list', () => {
    const tabs = cockpitTabsFor({ stage: 'proof', needsYou: false })
    const expected = COCKPIT_TABS.filter(t => !CLIENT_WORK_TABS.includes(t))
    expect(tabs).toEqual([...expected])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ A WITHHELD TAB MUST NOT LEAVE A BLANK PANE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · the selected tab is redirected, not blanked', () => {
  it('a withheld selection falls back to ICP', () => {
    for (const withheld of CLIENT_WORK_TABS) {
      expect(resolveCockpitTab(withheld, { stage: 'proof', needsYou: false })).toBe(PROOF_FALLBACK_TAB)
    }
  })

  it('a permitted selection is left exactly where it is', () => {
    expect(resolveCockpitTab('Inbox', { stage: 'proof', needsYou: false })).toBe('Inbox')
    expect(resolveCockpitTab('People', { stage: 'live', needsYou: false })).toBe('People')
    expect(resolveCockpitTab('People', { stage: 'proof', needsYou: true })).toBe('People')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ ONE LIST, AND THE PAGE USES IT
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · the hand-typed duplicate is gone', () => {
  const page = () => codeOnly(readFileSync(join(REPO, 'apps/admin/src/app/vida/page.tsx'), 'utf8'))

  it('🛑 the inline re-typed tab array is GONE from the render', () => {
    // Two copies of one list is the drift: the constant validated URLs, the inline copy drew
    // the strip, and a tab could legitimately exist in one and not the other.
    const src = page()
    const inline = src.match(/\['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence'/g) ?? []
    expect(inline.length, 'the tab list is still hand-typed inside the render').toBe(0)
  })

  it('the page imports the shared list and the shared rule', () => {
    const src = page()
    expect(src).toMatch(/from '@\/lib\/vida-cockpit-tabs'|from '\.\.\/\.\.\/lib\/vida-cockpit-tabs'/)
    expect(src).toMatch(/cockpitTabsFor\(/)
  })

  it('and the strip renders from the rule, gated on the SERVER stage', () => {
    const src = page()
    // The gate's inputs must come from the lifecycle verdict, never a local inference.
    expect(src).toMatch(/cockpitTabsFor\(\{[\s\S]{0,160}verdict\.stage/)
    expect(src).toMatch(/cockpitTabsFor\(\{[\s\S]{0,200}needs_you|cockpitTabsFor\(\{[\s\S]{0,200}needsYou/)
  })

  it('🛑 AND THE SERVER SIDE IS UNTOUCHED — no route and no row changed', () => {
    const ops = codeOnly(readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8'))
    // `/people` still exists exactly as it did, with no stage condition grafted into it.
    expect(ops).toMatch(/operatorRouter\.get\('\/people'/)
    const at = ops.indexOf("operatorRouter.get('/people'")
    const route = ops.slice(at, at + 2500)
    expect(route, 'a stage gate was pushed into /operator/people — A2 is a UI withholding')
      .not.toMatch(/proof_exception|isHealthyProof|lifecycle/)
  })
})
