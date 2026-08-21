import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── PROVING A BOOKING REACHES A REAL CALENDAR (P47 follow-on, 21 Aug) ──────────────────────
//
// R55/L2, the founder's ruling: *"we need to book in the clients calendar and see"* ·
// *"this is essential to pre 25th."*
//
// He connected Google on 20 Aug and reported it working — then hit a wall testing the half
// that matters. THE AUDIT FOUND WHY: `/calendar/book` exists in the API and **no screen calls
// it** — grepped the whole portal and admin for `calendar/book`, zero hits. The only path that
// reaches a real calendar is `/book/<signed-token>`, the page a COLD PROSPECT opens from a
// sequence email. Proving a booking meant sourcing → approving → enrolling → a live send →
// clicking as the recipient.
//
// ⚠️ AND A SECOND DEFECT SURFACED WHILE LOOKING. The prospect booking page hardcoded
// `|| 'https://kindapi-production-e64c.up.railway.app'` — the exact domain the P47 move exists
// to escape — as its API fallback. P47's guard reads the API's calendar path and does not reach
// the portal, which is why a pass looking for precisely this defect missed it.

const OPERATOR = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
const BOOKPAGE = readFileSync(
  join(__dirname, '../../../portal/src/app/book/[token]/page.tsx'), 'utf8')
const VIDA = readFileSync(
  join(__dirname, '../../../admin/src/app/vida/bookings/page.tsx'), 'utf8')
const codeOf = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the guard is reading real files', () => {
  it('all three are present and non-trivial', () => {
    expect(OPERATOR.length).toBeGreaterThan(20_000)
    expect(BOOKPAGE.length).toBeGreaterThan(2_000)
    expect(VIDA.length).toBeGreaterThan(5_000)
  })
})

describe('① the prospect booking page carries NO hardcoded host', () => {
  it('⚠️ THE railway.app FALLBACK IS GONE', () => {
    // The defect, asserted on comment-stripped source so the ⚠️ block recording it does not
    // satisfy its own guard.
    expect(codeOf(BOOKPAGE), 'the old domain is hardcoded again').not.toMatch(/railway\.app/)
    expect(codeOf(BOOKPAGE), 'nor the new one').not.toMatch(/get-kind\.com/)
  })

  it('the API host comes from env, and an unset value fails visibly rather than silently', () => {
    const code = codeOf(BOOKPAGE)
    expect(code).toMatch(/process\.env\.NEXT_PUBLIC_API_URL/)
    // Empty, not a throw: this is the page a REAL PROSPECT opens, and a module-scope throw
    // gives them a white screen. Empty makes the first fetch fail into the page's own honest
    // `error` phase — which it already has.
    expect(code).toMatch(/NEXT_PUBLIC_API_URL \?\? ''/)
    expect(BOOKPAGE, "and the page still has an honest error state").toMatch(/'error'/)
  })
})

describe('② the operator can mint the PRODUCT\'s own booking link', () => {
  const code = codeOf(OPERATOR)
  const handler = code.slice(
    code.indexOf("operatorRouter.get('/leads/:id/booking-link'"),
    code.indexOf("operatorRouter.post('/leads/:id/surface'"),
  )

  it('the route exists', () => {
    expect(handler.length, 'booking-link route not found').toBeGreaterThan(500)
  })

  it('⚠️ IT USES bookingUrlForLead — the same function FIGSY embeds in a real email', () => {
    // The whole value of this tool is that it is NOT a special path. A test link built any
    // other way would prove that the test link works.
    expect(handler).toMatch(/bookingUrlForLead\(/)
  })

  it('⚠️ THE LEAD MUST BELONG TO THAT CLIENT — the token is the authorization', () => {
    // The token binds lead→client and authorizes a PUBLIC page. Minting one across a tenant
    // boundary hands out a key to somebody else's calendar.
    expect(handler).toMatch(/\.eq\('client_id', client\.id\)/)
  })

  it('it books nothing — it hands back a URL and the founder walks the real page', () => {
    for (const forbidden of [/performBooking/, /events\.insert/, /calendar_bookings/]) {
      expect(handler, `the link route must not book: ${forbidden}`).not.toMatch(forbidden)
    }
  })

  it('a missing link says WHY — three different fixes must not read identically', () => {
    // PORTAL_URL unset, ADMIN_SECRET_KEY unset, calendar not connected, no refresh token: each
    // is a different action, and "no link" is the same sentence for all four.
    expect(handler).toMatch(/PORTAL_URL is not set/)
    expect(handler).toMatch(/ADMIN_SECRET_KEY is not set/)
    expect(handler).toMatch(/has not connected Google Calendar/)
    expect(handler).toMatch(/No refresh token stored/)
  })

  it('issuing a link is AUDITED', () => {
    // It hands out an authorization. `booking_link_issued` is a typed OperatorAction, so this
    // could not have been added without the union knowing about it.
    expect(handler).toMatch(/action: 'booking_link_issued'/)
    const audit = readFileSync(join(__dirname, 'operator-audit.ts'), 'utf8')
    expect(audit).toContain("'booking_link_issued'")
  })
})

describe('③ THE TOOL IS USABLE BY A HUMAN — no UUID a human cannot see', () => {
  it('⚠️ IT IS A PICKER, NOT A TEXT BOX', () => {
    // The first version asked the founder to paste a lead UUID. NO SCREEN IN VIDA RENDERS ONE
    // — `lead_id` is in the queue's data and never displayed — so "paste a lead ID" meant "go
    // and query the database". He asked "where is the lead ID", which is the whole finding.
    const code = codeOf(VIDA)
    expect(code, 'a pasted uuid is not an interface').not.toMatch(/placeholder="lead id \(uuid\)"/)
    expect(code, 'the leads are fetched to be picked').toMatch(/recent-leads/)
    expect(code, 'and offered as a list').toMatch(/<select value=\{linkLeadId\}/)
  })

  it('the endpoint that feeds the picker is client-scoped', () => {
    const code = codeOf(OPERATOR)
    const h = code.slice(code.indexOf("get('/clients/:id/recent-leads'"))
    expect(h.slice(0, 900)).toMatch(/\.eq\('client_id', client\.id\)/)
  })
})

describe('④ Vida can reach it — a route nothing calls is not a feature', () => {
  it('the bookings screen calls the operator endpoint', () => {
    // The lesson from the governed-documents build: something reachable from nowhere is not
    // built. This is the third time that has been the finding.
    expect(codeOf(VIDA)).toMatch(/booking-link\?client_id=/)
  })

  it('and the panel is rendered, with the honest caveat', () => {
    expect(VIDA).toContain('Test a real booking')
    expect(VIDA, 'says plainly that this is the real page').toMatch(/the same page a real prospect uses/)
  })
})
