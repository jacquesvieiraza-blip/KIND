import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { esc, fieldsOf, detailsOf, emailHtml } from '../routes/website-enquiry'

// ── THE FORMS HAVE TO ACTUALLY SEND ──────────────────────────────────────────────────────
//
// Both website forms shipped with `<button type="button">` and no handler. Nothing errored,
// no test failed, and nothing in the suite could have noticed: a form that silently drops
// every submission looks exactly like a form that works, from the outside and from the
// repository. The only signal was a human filling it in and getting nothing back.
//
// So this file checks the wiring itself — the button, the script, the endpoint it calls, and
// the fact that it is the SAME endpoint the API actually mounts. A dead form is a silent
// failure, and a silent failure needs a loud guard.

const WEB = join(__dirname, '../../../website')
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')
const FORMS = ['contact.html', 'get-started.html'] as const
const script = readFileSync(join(WEB, 'mv-forms.js'), 'utf8')
const route = readFileSync(join(__dirname, '../routes/website-enquiry.ts'), 'utf8')
const index = readFileSync(join(__dirname, '../index.ts'), 'utf8')

describe('the two forms are wired to something that exists', () => {
  for (const page of FORMS) {
    it(`${page} submits rather than doing nothing`, () => {
      const html = read(page)
      // The exact defect: a button that is not a submit button, inside a form with no handler.
      expect(html, 'the button is type="button" again — it will do nothing').not.toContain('<button class="pill" type="button"')
      expect(html).toContain('type="submit"')
      expect(html).toContain('<form')
    })

    it(`${page} loads the handler and declares which form it is`, () => {
      const html = read(page)
      expect(html).toContain('mv-forms.js')
      expect(html, 'without data-form the script cannot tell the two forms apart').toMatch(/<body data-form="(contact|get-started)"/)
    })

    it(`${page} no longer tells the visitor the form is dead`, () => {
      expect(read(page)).not.toContain('not connected yet')
    })

    it(`${page} has somewhere to show the result`, () => {
      // Without this the visitor gets no feedback at all, which is the old behaviour wearing
      // a working button.
      expect(read(page)).toContain('form-status')
      expect(read(page)).toContain('.form-status--error')
      expect(read(page)).toContain('.form-status--ok')
    })
  }

  it('the page the script posts to is the route the API actually mounts', () => {
    // Two files, one URL. Get them out of step and the form 404s while every test that reads
    // only one of them stays green.
    const posted = script.match(/fetch\(API \+ '([^']+)'/)?.[1]
    expect(posted, 'mv-forms.js does not POST anywhere').toBeTruthy()
    expect(posted).toBe('/api/public/enquiry')

    const declared = route.match(/router\.post\(\s*'([^']+)'/)?.[1]
    expect(declared).toBe('/public/enquiry')
    expect(index).toContain("app.use('/api', websiteEnquiryRouter)")
    expect(`/api${declared}`).toBe(posted)
  })

  it('the endpoint is rate-limited, like every other public route', () => {
    expect(route).toMatch(/rateLimit\(\{\s*limit:\s*\d+/)
  })

  it('both form types the pages declare are accepted by the endpoint', () => {
    for (const page of FORMS) {
      const type = read(page).match(/<body data-form="([^"]+)"/)?.[1]
      expect(route, `the endpoint rejects type="${type}"`).toContain(`z.literal('${type}')`)
    }
  })
})

describe('a stranger cannot inject markup into the founder\'s inbox', () => {
  // The existing public routes (subscribe, demo-request) interpolate form input straight into
  // the notification email. Anyone can type anything into a public form and the founder's
  // mail client is what renders it.
  it('escapes the characters that make markup', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;')
    expect(esc('Tom & "Jerry"')).toBe('Tom &amp; &quot;Jerry&quot;')
    expect(esc("it's")).toBe('it&#39;s')
    expect(esc(undefined)).toBe('')
  })

  it('the assembled email contains no live tag from user input', () => {
    const html = emailHtml({
      type: 'contact',
      name: '<script>alert(1)</script>',
      email: 'a@b.com',
      subject: '"><img src=x onerror=alert(1)>',
      message: 'hello',
    })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('onerror=alert(1)>')
    expect(html).toContain('&lt;script&gt;')
    // …and the real content still survives the escaping.
    expect(html).toContain('a@b.com')
    expect(html).toContain('hello')
  })

  it('a newline in a message becomes a line break, not a lost paragraph', () => {
    const html = emailHtml({ type: 'contact', name: 'A', email: 'a@b.com', message: 'one\ntwo' })
    expect(html).toContain('one<br/>two')
  })
})

describe('nothing the visitor typed is dropped on the way to the founder', () => {
  const getStarted = {
    type: 'get-started' as const,
    name: 'Jo', email: 'jo@co.com', company: 'Co', website: 'co.com',
    outcome: 'Meetings with MDs', target: 'UK agencies', volume: '6 – 15', when: 'This quarter',
  }

  it('every answered field reaches the email', () => {
    const labels = fieldsOf(getStarted).map(([l]) => l)
    expect(labels).toEqual(['Name', 'Email', 'Company', 'Website', 'Outcome they want', 'Who to target', 'Volume', 'Timing'])
    const html = emailHtml(getStarted)
    for (const v of Object.values(getStarted)) {
      if (v === 'get-started') continue
      expect(html, `"${v}" never reached the email`).toContain(v.replace(/&/g, '&amp;'))
    }
  })

  it('an unanswered optional field is left out rather than shown blank', () => {
    const labels = fieldsOf({ type: 'contact', name: 'A', email: 'a@b.com' }).map(([l]) => l)
    expect(labels).toEqual(['Name', 'Email'])
  })

  it('the answers with no column of their own are kept as details, not thrown away', () => {
    // `contact_requests` has name/email/company/message/type and nothing else. Five of the
    // Get Started answers have nowhere to go without this.
    const d = detailsOf(getStarted)
    expect(d).toEqual({
      'Website': 'co.com',
      'Outcome they want': 'Meetings with MDs',
      'Who to target': 'UK agencies',
      'Volume': '6 – 15',
      'Timing': 'This quarter',
    })
    expect(d.Name, 'name has its own column; duplicating it into details is noise').toBeUndefined()
  })

  it('every field name on each page is one the payload builder knows about', () => {
    // The page is the source of truth for which fields exist. If someone adds a field to the
    // form and not to the script, the answer is collected from the visitor and then dropped
    // between the page and the request — invisibly.
    for (const page of FORMS) {
      const html = read(page)
      const formBlock = html.slice(html.indexOf('<form'), html.indexOf('</form>'))
      const names = [...formBlock.matchAll(/name="([^"]+)"/g)].map(m => m[1])
      expect(names.length).toBeGreaterThan(2)
      for (const n of names) {
        expect(script, `${page} has a field "${n}" that mv-forms.js never sends`).toContain(`'${n}'`)
      }
    }
  })
})

describe('a failure is reported, never swallowed', () => {
  it('the handler tells the caller when the enquiry reached neither the inbox nor the table', () => {
    // The worst outcome is a success message over a lost enquiry. Both paths that can lose it
    // return 503 when the row did not store either.
    const failures = route.match(/if \(!stored\) return res\.status\(503\)/g) ?? []
    expect(failures.length, 'a delivery failure path does not report failure').toBe(2)
  })

  it('a failed database write does not stop the email', () => {
    // The point: losing the row must still leave the founder's inbox copy. So the insert's
    // catch has to LOG and carry on — no rethrow, no early return — and the send has to sit
    // outside that block.
    //
    // The first version of this test asserted `not.toMatch(/throw err[\s\S]*?resend/)`, which
    // failed against code that is correct: there is no `throw err`, but there IS `throw error`
    // inside the try, and "throw err" is a prefix of it. A regex that matches a substring of
    // an identifier proves nothing about control flow. This reads the actual block instead.
    const start = route.indexOf('let stored = false')
    const catchAt = route.indexOf("console.error('[website-enquiry] could not store", start)
    const sendAt = route.indexOf('resend.emails.send', start)
    expect(start, 'the insert block has been renamed or removed').toBeGreaterThan(-1)
    expect(catchAt, 'a failed insert is no longer logged').toBeGreaterThan(start)
    expect(sendAt, 'the email is no longer sent after the insert').toBeGreaterThan(catchAt)

    // The catch body itself: everything between the log line and the end of the block.
    const catchBody = route.slice(catchAt, route.indexOf('\n    }', catchAt))
    expect(catchBody, 'the insert failure rethrows — the email will never be sent').not.toContain('throw')
    expect(catchBody, 'the insert failure returns early — the email will never be sent').not.toContain('return')
  })

  it('the reply-to is the person who filled the form in', () => {
    expect(route).toContain('replyTo: e.email')
  })
})
