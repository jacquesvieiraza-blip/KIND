// ═══════════════════════════════════════════════════════════════════════════════════════
// A CLIENT PARKED FOR TRANSLATION IS NOW SOMETHING A PERSON CAN ACT ON (19 Sep · R135)
//
// 🛑 THE SAME DEADLOCK HAD THREE SURFACES AND EACH HELD HALF THE TRUTH. 18 Sep built two of
// them: `proof_awaiting_translation` so Vida reads a parked client as a Needs-you instead of
// a calm Proof card, and a card carrying a `Resolve targeting` control. The third was never
// finished — that control fell through `default: return` in the Vida dispatch and did
// NOTHING. So the console finally said somebody was blocked and still gave the operator no
// way to act.
//
// ⚠️ THAT IS C40 EXACTLY, AND THIS REPOSITORY HAS PAID FOR IT BEFORE: *"buttons with no
// server authority behind it"*. A dead control is worse than no control, because it reads as
// done — the operator presses it, nothing happens, and the client stays parked.
//
// ⚠️ IT NAVIGATES, IT DOES NOT POST, AND THAT IS THE HONEST WIRING. Resolving a review is not
// a one-click act: `POST /operator/icp-review/:icpId/resolve` needs the operator's MAPPING of
// the client's unmapped words onto provider vocabulary, and re-canonicalises everything they
// send (an operator is not more trusted than a model). That editor already exists and is
// already mounted — `IcpReviewPanel` on `/cockpit`. The button hands off to it, exactly as
// `reconnect_mailbox` hands off to the engine screen.
//
// ── AND THE CLIENT FINALLY SEES THE TRANSLATION ────────────────────────────────────────
//
// 🛑 THEY APPROVED A PLAN THAT NEVER SHOWED THEM WHAT WE WOULD SEARCH. The chips on the plan
// card are the client's OWN WORDS by founder decision (J5-C4, 18 Sep) and stay that way. But
// the values we actually send to the provider are a closed vocabulary, and the client never
// saw them — so the one moment they could catch a wrong reading, before their money is spent,
// passed in silence. The plan now carries both: their words, then ours, labelled as ours.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')
const vida = readFileSync(join(REPO, 'apps/admin/src/app/vida/page.tsx'), 'utf8')
const copy = readFileSync(join(REPO, 'apps/admin/src/lib/vida-lifecycle-copy.ts'), 'utf8')
const plan = readFileSync(join(REPO, 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')

describe('the Resolve targeting button reaches a real surface', () => {
  it('🛑 THE CARD STILL OFFERS THE CONTROL — the 18 Sep half of this must not regress', () => {
    // The anti-vacuity check for everything below: if the card stopped drawing the button,
    // wiring the dispatch would prove nothing.
    expect(copy).toContain("case 'proof_awaiting_translation':")
    expect(copy).toContain("key: 'resolve_icp_review'")
  })

  it('🛑 AND THE DISPATCH NO LONGER SWALLOWS IT — the dead-button defect, closed', () => {
    expect(vida, 'the control still falls through to `default: return` and does nothing')
      .toContain("case 'resolve_icp_review':")
  })

  it('🛑 IT GOES WHERE THE REVIEW EDITOR ACTUALLY IS', () => {
    // `/cockpit` is where `IcpReviewPanel` is mounted. Sending the operator anywhere else
    // would be a button that works and still does not help.
    const branch = vida.slice(vida.indexOf("case 'resolve_icp_review':"))
      .slice(0, 120)
    expect(branch).toContain("'/cockpit'")
  })

  it('the panel it hands off to is still mounted there', () => {
    // If this ever moves, the line above becomes a link to nothing — and nothing else in the
    // product would notice.
    const cockpit = readFileSync(join(REPO, 'apps/admin/src/app/cockpit/page.tsx'), 'utf8')
    expect(cockpit).toContain('<IcpReviewPanel />')
  })

  it('🛑 AND THE SERVER AUTHORITY IT LEADS TO IS REAL', () => {
    const operator = readFileSync(join(REPO, 'apps/api/src/routes/operator.ts'), 'utf8')
    expect(operator).toContain("operatorRouter.post('/icp-review/:icpId/resolve'")
  })
})

// ⛓️ 24 Sep (R145 step 2) — THE PLAN CARD IS GONE, AND EVERY DUTY BELOW MOVED INTO THE FILTER ROWS.
// WAS: chips of their words on a "Proposed ICP" card (`briefCompanySizes.length ? briefCompanySizes
// : proposed.company_sizes`, …) and one line under them, "We'll search for …", built from
// `proposed.*`. Founder: *"i cant add more informaiton when the purple part comes up"* — the card
// replaced the fields. Each field is now one row that shows, in order: their words ("you said"),
// the values chosen, and — labelled as ours — what Apollo is actually sent. The server builds all
// three from the durable Brief with the real request builder, so the line cannot drift.
describe('the plan tells the client what we will search for', () => {
  // ⛓️ 24 Sep (R149) — the row MOVED, unchanged, into `components/milla/FilterRow.tsx` (the Proof
  // drop-downs are the same control). The row's own lines are read there; the Brief's wiring of
  // it (`said=`, `sentAs=`) is still read from the Brief page.
  const row = readFileSync(join(REPO, 'apps/portal/src/components/milla/FilterRow.tsx'), 'utf8')
  it('🛑 THEIR OWN WORDS STILL LEAD — J5-C4 is preserved, not reversed', () => {
    // 🛑 THE FOUNDER DECIDED THIS ON 18 Sep and nothing in R135 overrules it.
    expect(plan).toContain('said={t.said || undefined}')
    expect(row).toContain('you said: {said}')
  })

  it('🛑 AND OURS FOLLOW, LABELLED AS OURS', () => {
    expect(row, 'the client still cannot see what we will actually search for')
      .toContain('stored &amp; sent as: {sentAs.join(\' · \')}')
    expect(plan).toContain('sentAs={t.provider}')
  })

  it('it is built from the canonical values the search sends, never from their raw phrasing', () => {
    // `provider` is `buildSearchBody`'s own output, sent by the server per row.
    const block = row.slice(row.indexOf('stored &amp; sent as'))
      .slice(0, 200)
    expect(block).toContain('sentAs')
    expect(block, 'the line repeats their words instead of showing the translation').not.toContain('said')
  })

  it('🛑 AND AN EMPTY PLAN GAINS NO EMPTY ROW', () => {
    // A field with nothing mapped must not render "stored & sent as:" at somebody.
    expect(row).toContain('{sentAs && sentAs.length > 0')
  })
})
