// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — HOUSE'S VERSION 3: NO SIGN-OFF, AND EVERY EMAIL UNDER 50 WORDS.
//
// R156: House signs "K.I.N.D". Version 3 came back with no sign-off at all, so the sign-off is
// now guaranteed by code. And R157's four parts could not fit the old 50–70 word caps; the
// meeting emails now get the room the quality check itself calls right (50–125).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ensureSignOff } from './sequence-tokens'
import { templateFor } from './sequence-templates'

describe('the sign-off is guaranteed', () => {
  it('🛑 an email with no sign-off gets one, as its last line', () => {
    expect(ensureSignOff('Hi {{first_name}}, a thought.\n\nReply STOP to opt out.', 'K.I.N.D'))
      .toBe('Hi {{first_name}}, a thought.\n\nReply STOP to opt out.\nK.I.N.D')
  })

  it('an email already signed is left exactly as it is — never signed twice', () => {
    const signed = 'Hi {{first_name}}.\n\nReply STOP to opt out.\nK.I.N.D'
    expect(ensureSignOff(signed, 'K.I.N.D')).toBe(signed)
    expect(ensureSignOff('Hi.\nk.i.n.d\n', 'K.I.N.D')).toBe('Hi.\nk.i.n.d\n')
  })

  it('no name, or an empty body, changes nothing', () => {
    expect(ensureSignOff('Hi.', '')).toBe('Hi.')
    expect(ensureSignOff('', 'K.I.N.D')).toBe('')
  })

  it('🛑 the programme writer applies it to every body, with the signer or else the company', () => {
    const src = readFileSync(join(__dirname, 'programme-sequence-generation.ts'), 'utf8')
    expect(src).toContain("const signOff = (client.signer_name ?? '').trim() || (client.company_name ?? '').trim()")
    expect(src).toContain('body: ensureSignOff(detokenise(String(st?.body ?? \'\').trim(), sample), signOff),')
  })
})

describe('room for the four parts', () => {
  const caps = (g: string[]) => g.map(x => Number((x.match(/Max (\d+) words/) ?? [])[1] ?? NaN))

  it('🛑 every meeting email may run to at least 70 words and none past the 125 the quality check allows', () => {
    const c = caps(templateFor('meeting', 7).guidance)
    expect(c.every(n => n >= 70 && n <= 125), c.join(',')).toBe(true)
    expect(c[0]).toBe(110)
  })

  it('event and reactivation sequences are untouched', () => {
    expect(templateFor('event', 7).guidance[0]).toMatch(/Max 70 words/)
    expect(templateFor('reactivation', 7).guidance[0]).toMatch(/Max 60 words/)
  })
})
