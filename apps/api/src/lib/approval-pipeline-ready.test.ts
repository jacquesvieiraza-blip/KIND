// ⚑ 29 Sep (R174 · PR 3b) — AT APPROVAL, THE PIPELINE SHOWS THE PREPARED PEOPLE AS "READY TO CONTACT".
// It said "Nothing in the pipeline yet" while the client's next screen showed the people in the
// package. The real route's rule, pinned by source; the boundary suite (current-outreach-boundary)
// proves the empty scopes still return nothing.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const LEADS = readFileSync(join(process.cwd(), 'apps/api/src/routes/leads.ts'), 'utf8')
const PAGE = readFileSync(join(process.cwd(), 'apps/portal/src/app/(milla)/milla/pipeline/page.tsx'), 'utf8')

describe('the server puts the prepared people in `ready`', () => {
  it('prepared = in the package (enrolled) and not yet emailed; the rest stay a count', () => {
    expect(LEADS).toContain('const preparedIds = new Set((enrolled.data ?? []).map((e: { lead_id: string }) => e.lead_id))')
    const loop = LEADS.slice(LEADS.indexOf('if (contactedIds.has(id)) { stages.contacted.push(card(l)); continue }'))
    const ready = loop.indexOf("if (scope.mode === 'ids' && preparedIds.has(id)) { stages.ready.push(card(l)); continue }")
    const count = loop.indexOf("if (scope.mode === 'ids') { sourcedNotContacted += 1; continue }")
    expect(ready).toBeGreaterThan(-1)
    expect(ready, 'the prepared must be taken before the count').toBeLessThan(count)
    expect(LEADS).toContain('ready: stages.ready.length')
  })
})

describe('the board draws them, and only while there are some', () => {
  it('"Ready to contact", never "Approved"', () => {
    expect(PAGE).toContain("{ key: 'ready', label: 'Ready to contact', sub: 'prepared — we email them once it goes live'")
    expect(PAGE).toContain('programme ? (ready > 0 ? [READY_STAGE, ...OUTREACH_STAGES] : OUTREACH_STAGES)')
    expect(PAGE).toContain('? (programme ? ready : p.counts.approved) + p.counts.contacted')
  })
})
