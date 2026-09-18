// ══════════════════════════════════════════════════════════════════════════════════════════
// J16-C1 · ONE APPROVAL SURFACE — ALL SIX FROZEN ELEMENTS, PLUS THE COUNT WE CAN REACH
//
// REQ: *"All six frozen elements + sendable count; approve nowhere else"* (LR 13; FD-4).
//
// ── THERE WERE TWO PLACES TO SAY YES, AND THEY SHOWED DIFFERENT THINGS ──────────────────
//
// `ProgrammeReview` — the Milla home at the Approval stage — posted `/my/programme/approve`
// having shown the client prospect cards, a total and a meeting target. `ProgrammeApproval` —
// `/milla/programme` — posted the same approval having shown them the people, the words, the
// cadence, the sending window, the from-address, the target and which version it was.
//
// 🛑 SO ONE CLIENT'S CONSENT MEANT TWO DIFFERENT THINGS DEPENDING ON WHICH SCREEN THEY WERE
// STANDING ON. The desk's own header admitted it: *"Only `version` is read here; the full
// package is rendered by `ProgrammeApproval`."* Everybody downstream reads `approved_at` as
// consent to email real strangers on this client's behalf, and half the time it was consent
// given against a quarter of the package.
//
// The two labels were different too — the desk carried the founder's locked *"Approve this
// programme"*, the other screen its own *"Approve programme"*. When the duplicate control was
// withdrawn the founder's words went with the surviving one, unchanged.
//
// ── AND THE SEVENTH FACT, WHICH WAS ON NEITHER ──────────────────────────────────────────
//
// FD-5: *"Verified business email required before send; QUALIFIED ≠ SENDABLE."* J13-C1 put
// `sendable_count` inside the frozen package; this item puts it in front of the person pressing
// the button, because "40 prospects" meaning eighteen emails is exactly the kind of number a
// client should read before agreeing rather than after.
//
// ⚠️ READ FROM THE FREEZE AND NEVER RE-COUNTED, and `null` — not 0 — when the package does not
// state it. A v2 freeze predates the field; a count that failed was never taken. Both are "not
// stated", and neither is "nobody is reachable".
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PORTAL = join(__dirname, '../../../portal/src')
const SURFACE_PATH = join(PORTAL, 'components/milla/ProgrammeApproval.tsx')
const DESK_PATH = join(PORTAL, 'components/milla/ProgrammeReview.tsx')
const ROUTE_PATH = join(__dirname, '../routes/my-programme.ts')

/** Source with comments stripped — this repo QUOTES what it struck, so a naive scan lies. */
const codeOf = (p: string): string =>
  readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const SURFACE = codeOf(SURFACE_PATH)
const DESK = codeOf(DESK_PATH)
const ROUTE = codeOf(ROUTE_PATH)

/** Every `.tsx`/`.ts` under the portal's source — walked, never listed. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) sources(p, out)
    else if ((name.endsWith('.tsx') || name.endsWith('.ts')) && !name.includes('.test.')) out.push(p)
  }
  return out
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① APPROVE NOWHERE ELSE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J16-C1 · there is exactly one place a client can approve', () => {
  it('🛑 EXACTLY ONE PORTAL FILE POSTS THE APPROVAL — walked, not listed', () => {
    // 🛑 THE GUARD WALKS THE TREE. A list of known files is how a second button arrives: the
    // one that existed was in a component nobody thought of as the approval screen.
    const posters = sources(join(PORTAL))
      .filter(p => /['"`]\/my\/programme\/approve['"`]/.test(codeOf(p)))
      .map(p => p.slice(p.indexOf('src/')))
    expect(posters, 'a client can approve from more than one place')
      .toEqual(['src/components/milla/ProgrammeApproval.tsx'])
  })

  it('🛑 and the desk that used to approve now MOUNTS that surface rather than copying it', () => {
    // Nothing is taken from the client: the button is still on the Milla home, in the same
    // position — above the whole package instead of a quarter of it.
    expect(DESK).toContain('<ProgrammeApproval')
    expect(DESK, 'the desk grew its own approve control again').not.toContain('approve-programme')
  })

  it('🛑 the API has ONE customer approval, and the operator path refuses', () => {
    // R39 (15 Aug): *"We run it in Vida; the client approves in Milla."* An operator approving
    // on a client's behalf is indistinguishable downstream from the client agreeing.
    const routes = readdirSync(join(__dirname, '../routes'))
      .filter(n => n.endsWith('.ts') && !n.includes('.test.'))
      .filter(n => /approveProgrammeAsCustomer/.test(codeOf(join(__dirname, '../routes', n))))
    expect(routes, 'more than one route performs the customer approval').toEqual(['my-programme.ts'])

    const prog = codeOf(join(__dirname, './programme.ts'))
    const at = prog.indexOf('export async function approveProgramme(')
    expect(at, 'the operator approval moved — this guard must be repointed').toBeGreaterThan(-1)
    const body = prog.slice(at, prog.indexOf('\n}', at))
    expect(body, 'the operator approval writes again').not.toMatch(/\.update\(|status: 'APPROVED'/)
    expect(body).toMatch(/ok: false/)
  })

  it('🛑 the founder\'s locked words are on the one surface, verbatim', () => {
    const raw = readFileSync(SURFACE_PATH, 'utf8')
    expect(raw).toContain("export const APPROVE_LABEL = 'Approve this programme'")
    expect(raw).toContain(
      "export const APPROVED_COPY = 'Approved — nothing is sent until the programme goes Live.'")
    // And the surface SAYS them — a constant nothing renders is not a label.
    expect(SURFACE).toContain('{busy ? \'Approving…\' : APPROVE_LABEL}')
    expect(SURFACE).toContain('{APPROVED_COPY}')
    // The phrasing the founder rejected reaches no screen.
    for (const rejected of ["we'll confirm before anything is sent", 'we’ll confirm before anything is sent']) {
      for (const [name, src] of [['surface', SURFACE], ['desk', DESK]] as const) {
        expect(src, `${name} uses the rejected phrasing`).not.toContain(rejected)
      }
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② ALL SIX FROZEN ELEMENTS ARE ON IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J16-C1 · the one surface states the whole frozen package', () => {
  /** The six things the package fixes, and the render each one is read by. */
  const SIX: [string, RegExp][] = [
    ['the people',        /frozen\?\.prospects \?\? data\.total/],
    ['the words',         /frozen\.messages\.map\(/],
    ['the cadence',       /whenLabel\(frozen\.messages, i\)/],
    ['the sending window', /scheduleInWords\(frozen\?\.send_schedule\)/],
    ['the from-address',  /frozen\.sender_email/],
    ['the meeting target', /frozen\.meeting_target/],
  ]

  for (const [what, render] of SIX) {
    it(`🛑 ${what} is rendered, from the freeze`, () => {
      expect(SURFACE, `${what} is not on the screen the client approves from`).toMatch(render)
    })
  }

  it('🛑 AND THE VERSION, so "which package did I approve" is answerable', () => {
    expect(SURFACE).toMatch(/version \$\{frozen\.version_number\}/)
    expect(SURFACE).toContain('If anything changes, we will ask you again.')
    // The press sends the version back, so a re-freeze between render and click is REFUSED
    // rather than approved in silence.
    expect(SURFACE).toMatch(/version: data\.frozen\?\.version \?\? null/)
  })

  it('🛑 every one of them comes from `frozen`, never from the live programme row', () => {
    // A screen that re-read the live row would collect consent against whatever is true now,
    // which is the drift the freeze exists to stop.
    expect(SURFACE, 'the target is read live beside a frozen package')
      .not.toMatch(/p\.meeting_target/)
    expect(DESK, 'the desk states a live target beside the frozen one')
      .toMatch(/d\.frozen\?\.meeting_target \?\? d\.programme\.meeting_target/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ PLUS THE SENDABLE COUNT (FD-5)
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J16-C1 · and how many of them we may actually email', () => {
  it('🛑 the route hands it over, READ FROM THE FREEZE', () => {
    expect(ROUTE).toMatch(
      /sendable: typeof snapObj\.sendable_count === 'number' \? snapObj\.sendable_count : null/)
  })

  it('🛑 AND THE ROUTE NEVER RE-COUNTS IT — a number that moved since the freeze is not the package', () => {
    const at = ROUTE.indexOf('const frozen = snapObj ?')
    expect(at, 'the frozen payload moved — this guard must be repointed').toBeGreaterThan(-1)
    const block = ROUTE.slice(at, ROUTE.indexOf('} : null', at))
    for (const recount of ['isSendable', 'email_status', 'sendableBreakdown']) {
      expect(block, `the review route recounts sendability via ${recount}`).not.toContain(recount)
    }
  })

  it('🛑 the surface states it', () => {
    expect(SURFACE).toContain('frozen.sendable.toLocaleString()')
    expect(SURFACE).toContain('verified work email address today')
  })

  it('🛑 OMITTED, NOT ZEROED, when the package does not state it', () => {
    // A v2 freeze predates the field and a failed count was never taken. "0 have a verified
    // address" is a claim about a number nobody took, made to the person being asked to agree.
    expect(SURFACE).toContain("typeof frozen?.sendable === 'number'")
    for (const coerced of [/frozen\.sendable \?\? 0/, /frozen\?\.sendable \?\? 0/, /Number\(frozen\??\.sendable\)/]) {
      expect(SURFACE, 'a missing count is coerced to a number').not.toMatch(coerced)
    }
  })

  it('🛑 it is stated as a fact, and NO reason is invented for the difference', () => {
    // 🛑 FOUNDER-LOCKED (H14): do not invent reasons for prospects outside a set. We do not
    // know why any particular person has no verified address yet, and "22 were unreachable"
    // about real people is a fabrication wearing a number.
    for (const invented of ['were unsuitable', 'excluded because', 'were dropped', 'are unreachable',
                            'bounced', 'bad emails', 'invalid']) {
      expect(SURFACE, `the surface invents "${invented}" for the difference`).not.toContain(invented)
    }
    // And no arithmetic between the two numbers is rendered.
    expect(SURFACE, 'the screen subtracts one programme number from another')
      .not.toMatch(/(?:population|prospects)\s*-\s*(?:frozen\.sendable|sendable)/)
  })
})
