import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { notice, noticeClass, noticeText } from '@kind/shared'

// P3-1 — EVERY ERROR IN THE VIDA COCKPIT RENDERED AS A SUCCESS.
//
// One `saveMsg` string, ten render sites, all hardcoded `text-[#0e7c86]` — teal. Fifteen
// failure paths wrote into it: "Could not save the ICP", "Could not send the ask", "Failed to
// load people", and the Run/Pause refusal added in #590. An operator scanning a console reads
// colour before words, which is exactly how fifteen failures went unnoticed.

describe('a tone is impossible to omit', () => {
  it('notice.error carries the error tone', () => {
    expect(notice.error('Could not save')).toEqual({ text: 'Could not save', tone: 'error' })
  })
  it('notice.ok carries the ok tone', () => {
    expect(notice.ok('Saved')).toEqual({ text: 'Saved', tone: 'ok' })
  })
})

describe('noticeClass', () => {
  it('an error is NOT the success colour — the whole bug in one assertion', () => {
    expect(noticeClass('error')).not.toBe(noticeClass('ok'))
    expect(noticeClass('error')).not.toContain('0e7c86')
  })
  it('an error reads as an error at a glance', () => {
    expect(noticeClass('error')).toContain('red')
  })
})

describe('noticeText', () => {
  it('prefers the real message', () => {
    expect(noticeText(new Error('boom'), 'fallback')).toBe('boom')
  })
  it('never yields an empty string — a blank message renders as no message at all', () => {
    expect(noticeText(new Error('   '), 'fallback')).toBe('fallback')
    expect(noticeText(undefined, 'fallback')).toBe('fallback')
    expect(noticeText('', 'fallback')).toBe('fallback')
    expect(noticeText({}, 'fallback')).toBe('fallback')
  })
})

// ── THE REGRESSION GUARD ──────────────────────────────────────────────────────────────
//
// The unit tests above prove the helper is right. They cannot prove the ten render sites
// USE it — and that gap is the entire defect: the helper-equivalent was always available,
// the sites just hardcoded a colour instead.
//
// So this reads the page source. The admin app has no test runner of its own, and a rule
// nothing enforces is a wish (PRODUCT-RULES §0).
describe('the Vida cockpit never renders a message without its tone', () => {
  const src = readFileSync(
    join(__dirname, '../../../../apps/admin/src/app/vida/page.tsx'), 'utf8')

  it('no saveMsg render hardcodes the success colour', () => {
    const offenders = src.split('\n')
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => l.includes('saveMsg') && l.includes('0e7c86'))
    expect(offenders.map(([n, l]) => `${n}: ${l.trim().slice(0, 90)}`)).toEqual([])
  })

  it('no site renders the raw object — that would print [object Object] at an operator', () => {
    expect(src).not.toContain('>{saveMsg}<')
  })

  it('every failure path sets an ERROR notice, not a bare string', () => {
    // A `setSaveMsg('Could not …')` that slipped back to a bare string would type-error, but
    // this states the intent in words so the next reader knows why the type exists.
    const bare = src.split('\n')
      .map((l, i) => [i + 1, l] as const)
      .filter(([, l]) => /setSaveMsg\(\s*['"`]Could not/.test(l))
    expect(bare.map(([n]) => n)).toEqual([])
  })
})
