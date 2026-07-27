import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { outcomeBanner, outcomeBannerClass } from '@kind/shared'

// THE ALLOWLIST THAT ATE THE MESSAGE (#366).
//
// The leads page showed the last-run explanation only when the status was one of two literal
// strings written into the JSX. #366 added a fifth outcome — `audience_exhausted`, the whole
// point of which is that a client is TOLD their audience has ended — and the run wrote that
// sentence to the database and then rendered nothing whatsoever. The silent zero, one layer
// above the fix for the silent zero.

describe('a served run needs no explanation', () => {
  it('the leads on the screen are the explanation', () => {
    expect(outcomeBanner('served').show).toBe(false)
  })
  it('a missing status shows nothing rather than an empty box', () => {
    expect(outcomeBanner(null).show).toBe(false)
    expect(outcomeBanner(undefined).show).toBe(false)
  })
})

describe('every run that produced no leads explains itself', () => {
  it('a quota outage is shown, in warning tone — it is OUR failure and temporary', () => {
    expect(outcomeBanner('quota_exhausted')).toEqual({ show: true, tone: 'warning' })
  })

  it('a narrow ICP is shown, neutral — it is a fact, not an alarm', () => {
    expect(outcomeBanner('no_match')).toEqual({ show: true, tone: 'neutral' })
  })

  it('#366 — a FINISHED audience is shown, neutral', () => {
    expect(outcomeBanner('audience_exhausted')).toEqual({ show: true, tone: 'neutral' })
  })

  it('a demo run is shown too', () => {
    expect(outcomeBanner('demo').show).toBe(true)
  })
})

describe('THE INVERSION — an unknown status is shown, not swallowed', () => {
  it('a status nobody has written yet still reaches the client', () => {
    // This is the assertion that makes the next #366 impossible. Under the old allowlist
    // this returned nothing; the client saw a blank screen and drew their own conclusion.
    expect(outcomeBanner('some_outcome_invented_next_month').show).toBe(true)
  })

  it('and it is toned neutral rather than alarming', () => {
    expect(outcomeBanner('some_outcome_invented_next_month').tone).toBe('neutral')
  })
})

describe('the two tones are visually distinct', () => {
  it('warning and neutral cannot render identically', () => {
    expect(outcomeBannerClass('warning')).not.toBe(outcomeBannerClass('neutral'))
  })
  it('warning is amber', () => {
    expect(outcomeBannerClass('warning')).toContain('amber')
  })
})

describe('the portal actually USES the rule', () => {
  it('the leads page calls outcomeBanner instead of listing statuses inline', () => {
    const src = readFileSync(
      join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/leads/page.tsx'), 'utf8',
    )
    expect(src).toContain('outcomeBanner(runResult.status)')
    // Comment lines are stripped — they quote the old condition to explain the bug.
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(code).not.toContain("runResult.status === 'quota_exhausted' || runResult.status === 'no_match'")
  })
})
