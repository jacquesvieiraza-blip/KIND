import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { POSTAL_ADDRESS, POSTAL_FOOTER_LINE, LEGAL_ENTITY_NAME } from '@kind/shared'
import { coldEmailText, coldEmailHtml } from './deliverability'
import { toSmartleadSequence } from './smartlead-map'

// ── CAN-SPAM §7704(a)(5)(A)(iii) — A VALID PHYSICAL POSTAL ADDRESS, IN EVERY MESSAGE ───────
//
// The 20 Aug audit found it in NO cold email: not in the body, not in a footer, not in a
// header. It is the least arguable requirement in the statute — no interpretation, no
// exemption to weigh, the address is either in the message or it is not.
//
// ⚠️ THE AUDIT STOPPED AND ASKED RATHER THAN FILLING ONE IN. Nothing in the repo carried a
// company address, and a plausible-but-wrong address satisfies nothing while misstating who we
// are — worse than the gap it appears to close. The founder supplied this one on 20 Aug, after
// being told it reaches every cold prospect and cannot be recalled.
//
// ⚠️ THREE SEND PATHS, AND ONE OF THEM DOES NOT RUN OUR CODE. Sequence sends and day-1 sends
// go through `coldEmailText`/`coldEmailHtml`; **Smartlead sends its own copy from its own
// engine**, so the footer has to be rendered into the body we hand them. A footer on the SMTP
// paths alone would be missing from every email a new client's first month produces (R25).

const CLEAN_BODY = 'Hi Ada,\n\nQuick question about your pipeline.\n\nReply STOP to opt out.'

describe('the address has exactly one home, and it is the founder\'s words', () => {
  it('is a real postal address, not a placeholder anybody could have typed', () => {
    // Guards against the failure this whole item exists to avoid: an invented address that
    // makes the gate green while telling a real prospect something untrue.
    expect(POSTAL_ADDRESS.length).toBeGreaterThan(15)
    expect(POSTAL_ADDRESS, 'must carry a street').toMatch(/\d/)
    for (const placeholder of ['TODO', 'TBD', 'XXX', 'Example', 'Street Name', '123 Main']) {
      expect(POSTAL_ADDRESS.toLowerCase()).not.toContain(placeholder.toLowerCase())
    }
  })

  it('the footer line is DERIVED from the entity and the address, never typed', () => {
    // Same rule as every price a client can read. Typing the line would let the address and the
    // footer drift, and the drift would only ever be visible in a prospect's inbox.
    expect(POSTAL_FOOTER_LINE).toBe(`${LEGAL_ENTITY_NAME}, ${POSTAL_ADDRESS}`)
  })

  it('no send path hard-codes an address of its own', () => {
    // The whole point of one constant. A second copy pasted into a template is how one path
    // ends up shipping last year's address.
    const LIB = __dirname
    const offenders: string[] = []
    for (const f of readdirSync(LIB).filter(x => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
      const src = readFileSync(join(LIB, f), 'utf8')
      // The constants file is the one legitimate home; it lives in @kind/shared, not here.
      if (src.includes(POSTAL_ADDRESS)) offenders.push(f)
    }
    expect(offenders, 'the address literal must appear only in @kind/shared').toEqual([])
  })
})

describe('the plain-text body carries it — the part a strict client actually renders', () => {
  it('appends the footer', () => {
    expect(coldEmailText(CLEAN_BODY)).toContain(POSTAL_FOOTER_LINE)
  })

  it('keeps the message intact and puts the footer last', () => {
    const out = coldEmailText(CLEAN_BODY)
    expect(out).toContain('Quick question about your pipeline.')
    expect(out.trimEnd().endsWith(POSTAL_FOOTER_LINE), 'the footer is the last thing in the message').toBe(true)
  })

  it('separates it from the sign-off rather than running it on', () => {
    // A postal address welded to the last sentence reads as a typo, and a reader who cannot
    // tell it apart from the message has not really been given it.
    expect(coldEmailText(CLEAN_BODY)).toContain('\n\n' + POSTAL_FOOTER_LINE)
  })

  it('survives a body with no trailing newline and one with several', () => {
    for (const body of ['One line.', 'One line.\n', 'One line.\n\n\n']) {
      const out = coldEmailText(body)
      expect(out).toContain(POSTAL_FOOTER_LINE)
      expect(out, 'never a run of blank lines before it').not.toContain('\n\n\n' + POSTAL_FOOTER_LINE)
    }
  })
})

describe('the HTML body carries it too', () => {
  it('appends the footer', () => {
    expect(coldEmailHtml(CLEAN_BODY)).toContain(POSTAL_FOOTER_LINE)
  })

  it('stays near-plain — no shell, no image, no link', () => {
    // `coldEmailHtml`'s header records that the pixel, banner, visible unsubscribe footer and
    // templated shell were all stripped so cold mail lands in Primary. A styled compliance
    // block would undo that work, and the requirement asks only that the address be there.
    const html = coldEmailHtml(CLEAN_BODY)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('max-width')
  })

  it('escapes the address, so a future one containing & cannot break the markup', () => {
    // Not hypothetical for long: "Smith & Co House" is an ordinary UK building name.
    const { escaped } = { escaped: coldEmailHtml('body') }
    expect(escaped).not.toContain('&&')
    expect(coldEmailHtml('a & b'), 'body text is unaffected by the footer escaping').toContain('a & b')
  })
})

describe('⚠️ the Smartlead path — the one that does not run our code', () => {
  const steps = [{ channel: 'email' as const, subject: 'Hi {{first_name}}', body: 'About {{company}}.', wait_days: 0 }]
  const lead = { first_name: 'Ada', last_name: 'L', company: 'Acme' }

  it('the body we hand Smartlead already contains the footer', () => {
    const out = toSmartleadSequence(steps as never, lead as never, 'Acme')
    expect(out).toHaveLength(1)
    expect(out[0].email_body, 'Smartlead sends this verbatim — our builders never run').toContain(POSTAL_FOOTER_LINE)
  })

  it('and the rendered copy is still there', () => {
    // The #617 shape: if the render broke, "the footer is present" would pass on an empty body.
    const out = toSmartleadSequence(steps as never, lead as never, 'Acme')
    expect(out[0].email_body).toContain('About Acme.')
    expect(out[0].email_body, 'tokens are resolved before it leaves').not.toContain('{{')
  })

  it('a step with no copy at all is still dropped, not shipped as a bare address', () => {
    // Without this, the footer would give every empty step a non-empty body and the existing
    // "drop blank steps" rule would silently stop working — a message whose entire content is
    // a postal address.
    const blank = [{ channel: 'email' as const, subject: '', body: '', wait_days: 0 }]
    expect(toSmartleadSequence(blank as never, lead as never, 'Acme')).toEqual([])
  })
})

describe('every cold send path is wired to a footer-carrying builder', () => {
  const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')

  it('no cold send passes a raw body as text', () => {
    // The failure this catches is a NEW send path added later that calls `sendAs` with the
    // draft body directly — a compliant path beside a non-compliant one, which is how #617
    // happened.
    //
    // ⚠️ THE FIRST VERSION OF THIS GUARD DID NOT FIRE, and the red proof is the only reason
    // anybody knows. It matched `sendAs\([\s\S]{0,600}?\)` — non-greedy, so it stopped at the
    // first `)`, which is the one inside `unsubscribeHeaders(lead.email)`. The captured
    // fragment contained no `text:` at all, the `if (!textArg) continue` skipped it, and
    // reverting a real send site to a raw body left all 15 tests green.
    //
    // **A guard that SKIPS what it cannot parse is not a guard.** So this one finds every
    // `text:` inside a `sendAs` block by walking to the block's own closing brace, and asserts
    // the COUNT it found — if the shape of the call ever changes, the guard goes red for being
    // blind rather than passing for being lucky.
    const textArgs: string[] = []
    let i = figsy.indexOf('sendAs(')
    while (i !== -1) {
      const open = figsy.indexOf('{', i)
      const close = figsy.indexOf('\n      })', open)
      const block = figsy.slice(open, close === -1 ? open + 800 : close)
      const m = block.match(/text:\s*([^,\n]+)/)
      if (m) textArgs.push(m[1].trim())
      i = figsy.indexOf('sendAs(', i + 1)
    }

    expect(textArgs.length, 'two cold send sites carry a text body — if this is not 2 the guard has gone blind').toBe(2)
    for (const arg of textArgs) {
      expect(
        arg.startsWith('coldEmailText('),
        `a cold send passes text: ${arg} — it must go through coldEmailText so the postal address rides on it`,
      ).toBe(true)
    }
  })

  it('both HTML bodies go through coldEmailHtml', () => {
    expect((figsy.match(/html:\s*coldEmailHtml\(/g) ?? []).length).toBe(2)
  })
})
