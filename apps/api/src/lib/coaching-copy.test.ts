import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// COACHING V2 — THE SCREEN MAY NOT CLAIM RESEARCH IT DID NOT DO.
//
// The design for this page shows "what they have publicly committed to", each line with a
// source and a date. That is the most valuable half of the brief and **we cannot do it
// today**: `@anthropic-ai/sdk` is 0.39.0 and nothing in the repo calls web search. The brief
// sees the lead record and the prospect's reply, and nothing else.
//
// Shipping the design's COPY without the design's CAPABILITY is the worst available outcome —
// a client reads "we researched their company", takes it into a meeting, and finds we did
// not. It is the same family as a panel showing `failed: 0` for something never counted
// (#576) and a green light over a query that died (#565), except this one is repeated out
// loud to a stranger.
//
// ⚠️ COMMENTS ARE STRIPPED BEFORE MATCHING, for the sixth time in this repo. The file's own
// comments explain at length what it does NOT do — an unstripped scan would match that
// explanation and fail on a page that is telling the truth.

const REPO = join(__dirname, '../../../..')
const PAGE = 'apps/portal/src/app/(milla)/milla/coaching/page.tsx'

const rendered = () => stripCommentsForEnvScan(readFileSync(join(REPO, PAGE), 'utf8'))
const raw = () => readFileSync(join(REPO, PAGE), 'utf8')

describe('the page does not promise research', () => {
  it('no rendered copy claims public sources, citations or web research', () => {
    // Each of these would be true of the DESIGN and false of the BUILD.
    const text = rendered().toLowerCase()
    for (const claim of [
      'publicly committed', 'public commitment', 'their annual report', 'we researched',
      'according to their', 'sourced from the web', 'with sources and dates',
    ]) {
      expect(text, claim).not.toContain(claim)
    }
  })

  it('and it says out loud what the brief actually used', () => {
    // Silence would be safer than a false claim and worse than the truth: a client who does
    // not know the brief is built only from the reply will assume it is built from more.
    const text = rendered()
    expect(text).toContain('Built from who they are and what they wrote to you')
    expect(text).toContain('have not researched their')
  })

  it('the comment stripping is real — the file DOES discuss research in its comments', () => {
    // Proves the assertion above is meaningful rather than passing because nothing anywhere
    // mentions research. Without this, deleting the comments would make the test vacuous.
    expect(raw()).toContain('publicly committed')
    expect(rendered()).not.toContain('publicly committed')
  })
})

describe('only the two tabs that work are rendered', () => {
  it('exactly two tabs', () => {
    // An empty tab is a promise. "Your pitch", "Practice" and "Custom" need a client profile
    // block and a post-call debrief that do not exist yet, so they are absent rather than
    // present and disappointing.
    const text = rendered()
    expect(text).toContain("'Strategic partner'")
    expect(text).toContain("'Your leads'")
    for (const notYet of ['Your pitch', 'Mock interview', 'Practice', 'Sharpen how you explain']) {
      expect(text, notYet).not.toContain(notYet)
    }
  })

  it('the reason the other three are missing is written down', () => {
    // In the comments, where the next person to wonder will look — not on the screen, where
    // it would be a client reading our backlog.
    expect(raw()).toContain('An empty tab is a promise')
  })
})

describe('a failed read never renders as "no pattern"', () => {
  it('the error state says we could not look', () => {
    // The single most important sentence in the Your-leads tab. "No pattern yet" and "the
    // query died" must never look the same, because one is patience and the other is a bug.
    const text = rendered()
    expect(text).toContain('Couldn&apos;t read your results')
    expect(text).toContain('it means we could')
  })

  it('error state and data state are separate variables', () => {
    // Reusing one variable is how a failure becomes an empty list becomes a calm screen.
    const text = rendered()
    expect(text).toContain('const [pErr, setPErr]')
    expect(text).toContain('const [pat, setPat]')
  })
})

describe('"find me more" asks, it does not spend', () => {
  it('the button copy says it sends a request', () => {
    const text = rendered()
    expect(text).toContain('Sends this shape to your team as a request')
    // Never phrased as if the client is triggering the sourcing themselves.
    expect(text.toLowerCase()).not.toContain('start sourcing')
    expect(text.toLowerCase()).not.toContain('source now')
  })

  it('the route writes a message and touches nothing that spends', () => {
    const routes = stripCommentsForEnvScan(readFileSync(join(REPO, 'apps/api/src/routes/leads.ts'), 'utf8'))
    const handler = routes.slice(routes.indexOf("leadRouter.post('/patterns/request-more'"))
      .slice(0, routes.indexOf("leadRouter.get('/meetings'") > 0 ? 3000 : 3000)
    expect(handler).toContain("from('client_messages')")
    for (const spend of ['runIcpJob', 'sourcing_ledger', 'credit_transactions', 'try_charge']) {
      expect(handler, spend).not.toContain(spend)
    }
  })
})
