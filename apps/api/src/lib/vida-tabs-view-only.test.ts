// ⚑ 29 Sep (R174 ① · PR 4i) — VIDA'S PEOPLE AND CAMPAIGN TABS ARE VIEW-ONLY.
//   · People: no per-person send or pass — the client's 👍 in Milla is what moves a person;
//   · Campaign: no write, suggest, run or pause — the campaign is made at go-live and paused
//     on the Programme tab; who is in it and step 1 stay visible;
//   · the Approvals tab stays; the Lead queue leaves the menu (its page still opens).
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const PAGE = read('apps/admin/src/app/vida/page.tsx')
const code = PAGE.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const tab = (name: string, next: string) =>
  code.slice(code.indexOf(`{shownTab === '${name}' &&`), code.indexOf(`{shownTab === '${next}' &&`))

describe('People — to look at, not to change', () => {
  const people = tab('People', 'Campaign')
  it('has no per-person send or pass', () => {
    expect(people.length).toBeGreaterThan(500)
    expect(people).not.toContain('<button')
    expect(code).not.toMatch(/act\(p\.id, '(surface|pass)'\)/)
  })
  it('says the client’s 👍 moves a person, and never mentions a charge', () => {
    expect(people).toContain('Their 👍 starts the work — this list is to look at, not to change.')
    expect(people).not.toContain('$4')
  })
})

describe('Campaign — who is in it and step 1, nothing else', () => {
  const campaign = tab('Campaign', 'ICP')
  it('keeps the two views', () => {
    expect(campaign).toContain('openEnrollments(c)')
    expect(campaign).toContain('testCampaign(c.id, false)')
  })
  it('cannot write, suggest, run, pause or mail a test', () => {
    for (const gone of ['openCampEditor(', 'suggestCampaign', 'startCampaign', 'setCampaignStatus(', 'testCampaign(c.id, true)', 'saveCampaign(']) {
      expect(campaign, gone).not.toContain(gone)
    }
  })
  it('says where the campaign comes from', () => {
    expect(campaign).toContain('{CAMPAIGN_VIEW_NOTE}')
    expect(code).toContain("const CAMPAIGN_VIEW_NOTE = 'View only. The campaign is made from the approved ICP when the programme goes live; pause and resume are on the Programme tab.'")
    expect(code).toContain("buildCampaign: () => { setTab('Campaign') },")
  })
})

describe('the menu', () => {
  it('Approvals stays a tab; the Lead queue is off the menu, and its page still opens', () => {
    expect(read('apps/admin/src/lib/vida-cockpit-tabs.ts')).toMatch(/'Inbox', 'Approvals', 'People', 'Campaign'/)
    expect(read('apps/admin/src/lib/vida-nav.ts')).not.toContain("href: '/vida/queue'")
    expect(existsSync(join(process.cwd(), 'apps/admin/src/app/vida/queue/page.tsx'))).toBe(true)
  })
})
