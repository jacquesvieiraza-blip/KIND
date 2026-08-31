// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-004A-2B — THE MILLA-NATIVE BILLING AND USAGE PAGES.
//
// 🛑 WHAT THESE TWO SCREENS WERE. Thirteen-line wrappers that imported and rendered the OLD
// portal's pages, so a Milla customer read `/dashboard`'s billing and usage verbatim — wallet
// balance, "$299 to start", "$4 per approved lead", top-up buttons, auto top-up, credit
// history, manual grant. Every guard in the repo was green, because no guard had ever been
// pointed at a file that simply re-exported somebody else's screen.
//
// ⚠️ THE FORK IS THE GUARD. The single most important assertion in this file is that neither
// page imports from `(dashboard)` — because the moment one does, the retired truth returns in
// full and nothing else here can see it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const REPO   = join(__dirname, '../../../..')
const PORTAL = join(REPO, 'apps/portal/src')

/**
 * Strip comments — both files explain at length what they replaced, quoting it verbatim.
 *
 * ⛓️ THE LINE-PREFIX STRIPPER USED EVERYWHERE ELSE IN THIS REPO IS NOT ENOUGH HERE, and it
 * caught me: a JSX block comment whose continuation line begins with a warning glyph rather
 * than `*` survived it, so the guard below read the word "wallet" out of a comment that
 * exists to say the wallet is gone. That is the tenth comment-stripping defect in this
 * codebase and the first in a file I wrote to prevent one.
 *
 * BLOCKS FIRST, THEN LINES. `{​/* … *​/}` and `/* … *​/` are removed whole — including their
 * middle lines, whatever those begin with — before the `//` pass runs.
 */
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter(l => !l.trim().startsWith('//'))
  .join('\n')

const BILLING_PATH = join(PORTAL, 'app/(milla)/milla/billing/page.tsx')
const USAGE_PATH   = join(PORTAL, 'app/(milla)/milla/usage/page.tsx')
const BILLING = strip(readFileSync(BILLING_PATH, 'utf8'))
const USAGE   = strip(readFileSync(USAGE_PATH, 'utf8'))

/** Retired customer commercial truth. None of it may render on either page. */
const RETIRED: [RegExp, string][] = [
  [/\$299/,              'the $299 pack price'],
  [/\$4\b/,              'the per-lead price'],
  [/wallet/i,            'the wallet'],
  [/top[- ]?up/i,        'wallet top-ups'],
  [/\bcredits?\b/i,      'credits as customer currency'],
  [/approved lead/i,     'the per-lead approval'],
  [/first 100|included leads/i, 'the 100-lead pack'],
  [/per-lead spend/i,    'per-lead spend'],
  [/manual grant/i,      'the manual credit grant'],
  [/auto.?top/i,         'auto top-up'],
]

// ════════════════════════════════════════════════════════════════════════════════════════
describe('🛑 THE FORK — NEITHER PAGE RENDERS THE SHARED /dashboard SCREEN', () => {
  it('the sweep is not vacuous — both are real pages, not re-exports', () => {
    expect(BILLING).toContain('export default function MillaBillingPage')
    expect(USAGE).toContain('export default function MillaUsagePage')
    // A wrapper was 13 lines. A page that answers anything is not.
    expect(BILLING.split('\n').length).toBeGreaterThan(60)
    expect(USAGE.split('\n').length).toBeGreaterThan(50)
  })

  it('🛑 neither imports anything from (dashboard)', () => {
    // This is the assertion that matters most: one import restores every retired string
    // below in full, and no other guard in this file would notice.
    for (const [name, src] of [['billing', BILLING], ['usage', USAGE]] as const) {
      expect(src, `the Milla ${name} page renders the old portal's screen again`)
        .not.toMatch(/from '@\/app\/\(dashboard\)/)
      expect(src, `the Milla ${name} page reaches into (dashboard)`)
        .not.toContain('(dashboard)')
    }
  })

  it('and no "shared" component was created to keep the two portals coupled', () => {
    // Extracting the common parts would look tidy and re-couple them: the next retired-truth
    // edit would reach /dashboard, which is the thing the founder's ruling forbids.
    for (const src of [BILLING, USAGE]) {
      expect(src).not.toMatch(/components\/shared\/(billing|usage)/i)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('BILLING — PROGRAMME PAYMENTS, AND WHAT EACH AUTHORISES', () => {
  it('🛑 not one retired commercial concept survives', () => {
    for (const [rx, what] of RETIRED) {
      expect(BILLING, `${what} is still on the Milla billing page`).not.toMatch(rx)
    }
  })

  it('the money comes from the programme row, and the halves are derived', () => {
    expect(BILLING).toContain("api.get<{ data: CustomerProgramme }>('/my/programme', tok)")
    expect(BILLING).toContain('programmeMoney(p.money.totalCents)')
    // 🛑 DERIVED, NEVER TYPED. A hardcoded figure on a payment screen is the 3-Aug bug.
    expect(BILLING).toContain('function halves(totalCents: number)')
    expect(BILLING, 'the second half is a fresh division rather than the remainder')
      .toContain('return { first, second: totalCents - first }')
    expect(BILLING, 'a price figure is hardcoded on the billing page').not.toMatch(/\$\s?\d/)
  })

  it('a programme with no price shows no figure — never $0', () => {
    // "$0" reads as a decision somebody made about this client.
    expect(BILLING).toContain('No programme price has been set yet.')
    expect(BILLING).toContain('p.money.totalCents > 0 ? halves(p.money.totalCents) : null')
  })

  it('🛑 PAYMENT 1 AUTHORISES SOURCING AND PREPARATION ONLY', () => {
    expect(BILLING).toContain('The first payment authorises sourcing and preparation. Outreach has not started.')
    expect(BILLING).toContain('p.money.firstPaidAt ?')
  })

  it('🛑 PAYMENT 2 FOLLOWS THE APPROVAL, AND IS NEVER OFFERED BEFORE IT', () => {
    expect(BILLING).toContain('Due after the programme approval. It authorises outreach.')
    // Before the approval it authorises nothing — and the approval is READ, not assumed.
    expect(BILLING).toContain('Due after the programme approval. Until then, it authorises nothing.')
    expect(BILLING).toContain('p.approvedAt')
  })

  it('🛑 the page takes no payment and offers no retry', () => {
    // A pay CTA is a visible decision nobody approved; the old page's checkout calls went
    // with the wallet they topped up.
    for (const forbidden of ['/stripe/checkout', '/stripe/subscribe', 'api.post']) {
      expect(BILLING, `the billing page can spend or subscribe again: ${forbidden}`)
        .not.toContain(forbidden)
    }
    expect(BILLING).not.toMatch(/pay now|retry payment|update card/i)
  })

  it('no refund, fee or payment-stage wording was invented', () => {
    expect(BILLING).not.toMatch(/refund|cancellation fee|pro.?rata|instal?ment plan|payment 3/i)
  })

  it('invoices are Stripe\'s own record, and an unreadable list is not "no invoices"', () => {
    expect(BILLING).toContain("api.get<{ data: { invoices: Invoice[]; configured: boolean } }>('/stripe/invoices', tok)")
    // 🛑 A CLIENT WHO HAS PAID SEEING AN EMPTY LIST CONCLUDES THEIR PAYMENT WAS LOST.
    expect(BILLING).toContain('invoices === null ?')
    expect(BILLING).toContain('this is not the same as having none')
    // Documents stays the deeper record rather than being duplicated here.
    expect(BILLING).toContain('href="/milla/documents"')
  })

  it('a failed programme read renders the locked sentence, never an empty programme', () => {
    expect(BILLING).toContain('MILLA_FAILURE_COPY.pipelineFailed')
    expect(BILLING).toMatch(/pr\.status === 'fulfilled'[\s\S]{0,200}?setFailed/)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('USAGE — PROGRAMME DELIVERY, NOT A SECOND BILLING PAGE', () => {
  it('🛑 not one retired commercial concept survives', () => {
    for (const [rx, what] of RETIRED) {
      expect(USAGE, `${what} is still on the Milla usage page`).not.toMatch(rx)
    }
  })

  it('it is not a money page at all', () => {
    // Billing answers "what am I paying". This answers "what has been delivered". The old
    // screen mixed both and led with per-lead spend.
    // ⚠️ `$` ALONE IS NOT MONEY. Template-literal interpolation (`${x}`) is everywhere in
    // TSX, and matching a bare `$` flagged `${p.outcome.target}` as a price. A money figure
    // is a `$` followed by a digit, or one of the money helpers by name.
    expect(USAGE, 'the usage page renders money again').not.toMatch(/\$\s?\d|programmeMoney|totalCents/)
    expect(USAGE, 'programme value was converted into some other unit')
      .not.toMatch(/usage unit|credit equivalent/i)
  })

  it('every figure is a row that exists — programme progress and real counts', () => {
    expect(USAGE).toContain("api.get<{ data: CustomerProgramme }>('/my/programme', tok)")
    expect(USAGE).toContain("api.get<{ data: Outcomes }>('/leads/milla-summary', tok)")
    expect(USAGE).toContain('p.progress.delivered')
    expect(USAGE).toContain('p.progress.authorised')
    expect(USAGE).toContain('o.replies_total')
    expect(USAGE).toContain('o.meetings_total')
  })

  it('🛑 it does NOT read /leads/pipeline — that board is seeded by the retired paid approve', () => {
    // `/leads/pipeline` selects on `revealed_at IS NOT NULL`, which only the retired paid
    // per-lead approve ever set. A programme client's counts there are structurally empty,
    // so rendering them as delivery would report zero work on a running programme.
    expect(USAGE).not.toContain('/leads/pipeline')
    expect(USAGE).not.toContain('revealed_at')
  })

  it('🛑 outreach figures are gated on the stage, and never inferred from it', () => {
    expect(USAGE).toContain("const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']")
    expect(USAGE).toContain('const live = !!p && OUTREACH_STAGES.includes(p.stage)')
    // Before Live the absence is STATED rather than shown as zeros — empty cards read as
    // "the outreach is failing" when the truth is it has not been authorised.
    expect(USAGE).toContain('Outreach has not started, so there is no sending activity to show yet.')
    // …and being Live never manufactures a number: the counts still come from the read.
    expect(USAGE).toMatch(/o === null \? '—'/)
  })

  it('"0 of 0 authorised" is not shown as information', () => {
    expect(USAGE).toContain('p.progress.authorised > 0 &&')
  })

  it('an unreadable count is a dash, never a zero', () => {
    // Rendering a failed lookup as "0 replies" tells a client with six that they have none.
    expect(USAGE).toContain("p.progress.outcomesAchieved === null ? '—'")
    expect(USAGE).toContain('not available right now')
  })

  it('a failed programme read renders the locked sentence', () => {
    expect(USAGE).toContain('MILLA_FAILURE_COPY.pipelineFailed')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// FOUNDER DECISIONS, 31 Aug. Three were "keep exactly what is there" — which is only worth
// anything if something stops it drifting. These are that something.
describe('THE APPROVED CUSTOMER LABELS AND SUBTITLES', () => {
  const WORKSPACE = strip(readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8'))

  it('🛑 `sourced_used` is labelled "People sourced" everywhere it is rendered', () => {
    // 🛑 DECISION 2 — A FACTUAL CORRECTION. The field counts people SOURCED; sourcing is
    // authorised by Payment 1, four gates before anybody is contacted. "People reached"
    // claimed outreach that had not been authorised, on the screen a client reads to find out
    // whether it had.
    //
    // ⚠️ BOTH SURFACES, because one field with two labels is the drift this build keeps
    // paying for. The workspace and Usage render the same number and now say the same words.
    expect(WORKSPACE, 'the workspace no longer labels the sourced count').toContain('People sourced of ')
    expect(USAGE, 'Usage no longer labels the sourced count').toContain('People sourced of ')
    for (const [name, src] of [['workspace', WORKSPACE], ['usage', USAGE]] as const) {
      expect(src, `the retired "People reached" label is back on the ${name}`)
        .not.toContain('People reached')
    }
    // Vacuity: both must still be rendering the field this label describes.
    expect(WORKSPACE).toContain('p.progress.delivered')
    expect(USAGE).toContain('p.progress.delivered')
  })

  it('and a GENUINE contacted metric keeps its own name', () => {
    // The founder's ruling is narrow: correct the label for `sourced_used`, do not rename
    // metrics backed by actual outreach. Pipeline's column is `figsy_enrollments.current_step
    // > 0` — real sending — and must not be swept up in this.
    const pipeline = strip(readFileSync(join(PORTAL, 'app/(milla)/milla/pipeline/page.tsx'), 'utf8'))
    expect(pipeline, 'a real outreach metric was renamed along with the sourced label')
      .toContain("label: 'Contacted'")
  })

  it('🛑 DECISION 1 — Billing still offers no payment action of any kind', () => {
    // Approved for MVP: Billing is a truthful status surface and nothing else.
    //
    // ⛓️ TIGHTENED AFTER A RED PROOF DID NOT GO RED. The first cut forbade the checkout
    // calls and the words "pay now" — and a `const payNow = () => { /* Pay now */ }` walked
    // straight through it: the comment was stripped before the scan (correctly), and the
    // identifier is camelCase so no spaced phrase matched. A word list cannot guard a
    // capability.
    //
    // THE INVARIANT IS STRUCTURAL INSTEAD: a status surface has no button. Billing renders
    // exactly one interactive element type — links, to Stripe's hosted invoice and to
    // Documents — and a payment action of any name needs something to press.
    expect(BILLING, 'Billing rendered a button — it is a status surface').not.toContain('<button')
    for (const forbidden of ['/stripe/checkout', '/stripe/subscribe', 'api.post', 'onClick']) {
      expect(BILLING, `a payment action returned to Billing: ${forbidden}`).not.toContain(forbidden)
    }
    // Belt as well as braces: the vocabulary, spaced or camelCased.
    expect(BILLING).not.toMatch(/pay ?now|retry ?payment|update ?card|top ?up|checkout|subscribe/i)
  })

  it('DECISIONS 3 and 4 — both approved subtitles are exact', () => {
    // Approved verbatim. A guard is the only thing that makes "keep it as it is" mean
    // anything a week from now.
    expect(BILLING, 'the approved Billing subtitle changed')
      .toContain('Your programme payments, and what each one authorises.')
    expect(USAGE, 'the approved Usage subtitle changed')
      .toContain('What your programme has delivered so far.')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('ISOLATION — THIS SLICE CHANGED NOTHING OUTSIDE MILLA', () => {
  it('🛑 the shared /dashboard pages still carry their own truth, untouched', () => {
    // If this slice had "helpfully" cleaned them, the OLD portal — a separately-routed live
    // product — would have changed under its own users. Their retired strings are the proof
    // they were left exactly as they were.
    const dashBilling = readFileSync(join(PORTAL, 'app/(dashboard)/dashboard/billing/page.tsx'), 'utf8')
    const dashUsage   = readFileSync(join(PORTAL, 'app/(dashboard)/dashboard/usage/page.tsx'), 'utf8')
    expect(dashBilling, 'the shared billing page was edited by this slice').toMatch(/wallet/i)
    expect(dashUsage, 'the shared usage page was edited by this slice').toMatch(/wallet/i)
    // And neither has been made to import the Milla pages either.
    expect(dashBilling).not.toContain('(milla)')
    expect(dashUsage).not.toContain('(milla)')
  })

  it('the Milla FLOW, Proof calibration and chat truth are intact', () => {
    const shell = strip(readFileSync(join(PORTAL, 'components/milla/MillaShell.tsx'), 'utf8'))
    const home  = strip(readFileSync(join(PORTAL, 'app/(milla)/milla/page.tsx'), 'utf8'))
    expect(shell).toContain('{MILLA_STAGES.map((label, i, arr) => {')
    expect(shell).not.toMatch(/wallet/i)
    for (const control of ['👍 Looks right', 'Not a fit', 'Tell Milla why']) {
      expect(home, `the calibration control "${control}" is gone`).toContain(control)
    }
    expect(home).toContain("'Please pause my programme'")
  })

  it('no migration was added by this slice', () => {
    const pending = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(pending).not.toContain('20260831')
  })
})
