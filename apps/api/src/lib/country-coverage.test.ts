import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { countryCoverage } from './country-coverage'

// ── THE COUNT `pecr.ts` PROMISED AND NEVER DELIVERED ───────────────────────────────────────
//
// `unknown_country` carried the sentence *"Sends, but is NAMED so the volume is visible rather
// than assumed."* **It was never visible.** The class is an ALLOW, so `noteSkip` is never
// called for it, nothing reaches `enrol_skips`, and the only trace was a `console.warn`. The
// comment described an intention as though it were a mechanism, and stood for two months.
//
// ⚠️ AND THE ENROL-SKIP CHIP COULD NOT HAVE ANSWERED IT EITHER. That surface reads the LAST
// ENROL RUN for one client — and no enrol run has ever happened (`AUTO_OUTREACH_ENABLED` is
// off), so it renders nothing and would go on rendering nothing until send-day. It counts leads
// that reached the enrol gate; the question is about leads that EXIST.

describe('the three buckets — and why it is three, not two', () => {
  it('separates "no country" from "country we have not opened"', () => {
    // The distinction IS the actionable part. "No country" is a data problem — backfill it and
    // those leads may become sendable. "Country not opened" is a founder decision, and no
    // amount of enrichment changes it. One combined "can't send" number sends somebody to fix
    // the wrong thing.
    const c = countryCoverage(['United States', null, 'Nigeria', '  ', 'United Kingdom'])
    expect(c.total).toBe(5)
    expect(c.sendable, 'US + UK').toBe(2)
    expect(c.missing, 'null and whitespace both count as absent').toBe(2)
    expect(c.held, 'Nigeria is real, and closed').toBe(1)
  })

  it('the three buckets always account for every lead', () => {
    // A tally that loses a row is worse than no tally: it reads as authoritative.
    const rows = ['us', null, 'Nigeria', 'UK', '', 'Kenya', 'United States', undefined, 'Scotland']
    const c = countryCoverage(rows)
    expect(c.sendable + c.missing + c.held).toBe(c.total)
    expect(c.total).toBe(rows.length)
  })

  it('accepts the spellings enrichment actually produces', () => {
    // PDL writes lowercase, an Apollo CSV writes title case, a human writes anything.
    const c = countryCoverage(['us', 'USA', 'United States', 'uk', 'GB', 'Scotland'])
    expect(c.sendable).toBe(6)
    expect(c.missing).toBe(0)
  })
})

describe('the sentence names the consequence, never a bare count', () => {
  it('an all-blank book says the launch gate holds EVERYTHING', () => {
    // The 20 Aug state: 166 of 206 with no country. A bare "166 missing" reads as an
    // enrichment nag; the truth is that send-day produces zero emails.
    const c = countryCoverage(Array(166).fill(null))
    expect(c.line).toContain('every one')
    expect(c.line).toContain('holds the entire book')
    expect(c.line, 'and says what fixes it').toContain('fill the country in')
  })

  it('a mixed book names both causes and their different fixes', () => {
    const c = countryCoverage(['United States', null, null, 'Nigeria'])
    expect(c.line).toContain('1 of 4 can be sent to')
    expect(c.line).toContain('2 have no country')
    expect(c.line, 'and that enrichment will not fix the closed one').toContain('only opening the country will')
  })

  it('a clean book says so plainly rather than staying silent', () => {
    const c = countryCoverage(['United States', 'United Kingdom'])
    expect(c.line).toBe('All 2 leads can be sent to.')
  })

  it('an empty book is not reported as a failure', () => {
    const c = countryCoverage([])
    expect(c.line).toBe('No leads yet.')
    expect(c.total).toBe(0)
  })

  it('⚠️ A CAPPED READ SAYS SO — the numbers are a floor, never a silent truncation', () => {
    // "No silent caps" (RULEBOOK): a bounded read that does not say it was bounded reads as
    // "this is the whole book" when it is not.
    const c = countryCoverage([null, 'United States'], true)
    expect(c.capped).toBe(true)
    expect(c.line).toContain('first 2 leads')
  })
})

describe('RED PROOF — the screen renders it, and the route feeds it', () => {
  const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  const operator = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')

  it('the route exists and reads the BOOK, not the last run', () => {
    expect(operator).toContain("operatorRouter.get('/country-coverage'")
    expect(operator, "it counts leads, not audit rows").toContain("db.from('leads')")
    expect(operator, 'and the cap is reported rather than hidden').toContain('rows.length >= CAP')
  })

  it('an unreadable count renders as NOTHING, never as "all clear"', () => {
    // The C7 shape: a failed read that renders as the good state is worse than an error, because
    // it looks like a healthy board.
    const fn = operator.slice(operator.indexOf("operatorRouter.get('/country-coverage'"))
    const body = fn.slice(0, fn.indexOf('\n})'))
    expect(body).toContain('data: null')
  })

  it('⚠️ THE CHIP IS A VALUE, SO WHAT AN OPERATOR SEES IS ACTUALLY ASSERTABLE', async () => {
    // ⚠️ THE FIRST VERSION OF THIS BLOCK WAS BLIND, AND THE RED PROOF IS THE ONLY REASON
    // ANYBODY KNOWS. It read `vida/page.tsx` as text and asserted the strings were present.
    // Wrapping the render in `{false && …}` leaves every one of those strings in the file, so
    // it passed with the chip switched off — **reproducing #620's exact failure (the count
    // exists, no screen shows it) inside the guard written to prevent it.**
    //
    // So the decision and the words moved into `coverageChip`, where they are ordinary values.
    // This asserts the sentence itself.
    const { coverageChip } = await import('./country-coverage')
    const chip = coverageChip(countryCoverage([null, null, 'United States', 'Nigeria']))
    expect(chip.show).toBe(true)
    expect(chip.show && chip.text).toBe('🌍 1/4 sendable · 2 no country · 1 country not open')
    expect(chip.show && chip.title, 'the hover carries the consequence').toContain('fill the country in')
  })

  it('a book with NOTHING sendable is a STOP, not a warning', async () => {
    const { coverageChip } = await import('./country-coverage')
    const chip = coverageChip(countryCoverage(Array(166).fill(null)))
    expect(chip.show && chip.stop, '0 of 166 is send-day producing no emails at all').toBe(true)
    expect(chip.show && chip.text).toContain('🛑')
    expect(chip.show && chip.text).toContain('0/166 sendable')
  })

  it('stays silent on a clean book, and on no book at all', async () => {
    // A chip on every client becomes the line everyone learns to skip.
    const { coverageChip } = await import('./country-coverage')
    expect(coverageChip(countryCoverage(['United States', 'UK'])).show).toBe(false)
    expect(coverageChip(countryCoverage([])).show).toBe(false)
    expect(coverageChip(null).show).toBe(false)
  })

  it('the console WIRES it — and this is a wiring check, not a render proof', () => {
    // ⚠️ SAID PLAINLY RATHER THAN OVERSOLD. Nothing short of rendering the page proves a React
    // component appears; a source match cannot. What this CAN prove is that the console fetches
    // the reading and renders `chip` rather than deciding anything itself — so the only thing
    // left to get wrong here is the wiring, and everything with logic in it is tested above.
    expect(vida).toContain('/api/proxy/operator/country-coverage')
    expect(vida).toContain('coverage?.chip?.show')
    expect(vida, 'renders the API\'s words, never its own').toContain('{coverage.chip.text}')
    expect(vida, 'and re-implements no rule').not.toContain('coverage.missing > 0 ||')
  })

  it('the API returns the chip, so the console has nothing to decide', () => {
    expect(operator).toContain('coverageChip(coverage)')
  })
})

describe('the false claim in pecr.ts is corrected, not quietly dropped', () => {
  const pecr = readFileSync(join(__dirname, 'pecr.ts'), 'utf8')

  it('no longer claims the volume is visible — checked on the LIVE strings, not the file', async () => {
    // ⚠️ THE FIRST VERSION OF THIS ASSERTION WAS `expect(pecr).not.toContain(...)` AND IT WENT
    // RED ON THE FIX ITSELF. The chain rule requires the correction to QUOTE what it replaced,
    // so the old wording still appears in the file — inside the comment recording that it was
    // wrong. A whole-file match cannot tell a quotation from a claim.
    //
    // Third time today a source guard has confused the two (the 451 mapping guard twice, this
    // once). So this checks the value the code actually PRODUCES, which is what a lead ever
    // sees, and leaves the file free to remember its own history.
    const { pecrVerdict } = await import('./pecr')
    const reason = pecrVerdict({ country: null, companyName: 'Acme' }).reason
    expect(reason).not.toContain('counted so the volume is visible')
    expect(reason, 'and it now says what actually decides the send').toContain('launch allowlist')
  })

  it('records what it used to say, per the chain rule', () => {
    // Deleting a false sentence hides that it was ever believed. The correction has to carry
    // the original, or the next person cannot tell a fix from a rewrite.
    expect(pecr).toContain('CORRECTED 20 Aug')
    expect(pecr).toContain('It was not visible and never had been')
  })

  it('and PECR still ALLOWS a blank country — the behaviour is untouched', async () => {
    // The correction is to a COMMENT. If it had changed the verdict, every lead with no country
    // would start failing a legal test it was deliberately exempt from.
    const { pecrVerdict } = await import('./pecr')
    const v = pecrVerdict({ country: null, companyName: 'Acme' })
    expect(v.allow, 'unchanged — the launch allowlist is what holds these, not PECR').toBe(true)
    expect(v.class).toBe('unknown_country')
  })
})
