import { describe, it, expect } from 'vitest'
import { resolveOwnedWebsite, draftWebsiteAddress } from './brief-promotion'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BRIEF FACT #3 — "website/domain OR explicit none" — RESOLVED BEHAVIOURALLY.
//
// 🛑 THE DEFECT THESE TESTS EXIST FOR. The first cut of the server-owned promotion knew that
// `website_none` existed and did nothing with it:
//
//     ~~if (site && /^https?:\/\//i.test(site)) profileFields.website = site~~
//
// A confirmed brief saying "we have no website" therefore set NOTHING, and a stale or
// contradictory `website` in the request body survived into the promoted client. A confirmed
// brief holding a bare domain lost the same way, because a domain does not match `^https?://`.
//
// ⚠️ WHY BEHAVIOURAL AND NOT A SOURCE SCAN. A source scan can prove which identifier a line
// mentions. It cannot prove that "confirmed none + contradictory body" ends with no website on
// the row — and that outcome, not the spelling of the line, is the locked product rule. The
// four-way decision is pure, so every combination is driven for real here, and the route-level
// test drives the same cases through the actual handler.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('draftWebsiteAddress — what counts as an address the client gave', () => {
  it('an http(s) address is taken exactly as it stands', () => {
    expect(draftWebsiteAddress('https://redmayne.co.uk')).toBe('https://redmayne.co.uk')
    expect(draftWebsiteAddress('http://redmayne.co.uk/about')).toBe('http://redmayne.co.uk/about')
    expect(draftWebsiteAddress('  https://redmayne.co.uk  ')).toBe('https://redmayne.co.uk')
  })

  it('🛑 a BARE DOMAIN is an answer — the locked fact says "website/DOMAIN or explicit none"', () => {
    expect(draftWebsiteAddress('redmayne.co.uk')).toBe('https://redmayne.co.uk')
    expect(draftWebsiteAddress('www.redmayne.co.uk')).toBe('https://www.redmayne.co.uk')
    expect(draftWebsiteAddress('redmayne.co.uk/about')).toBe('https://redmayne.co.uk/about')
  })

  it('nothing is an answer when there is nothing there', () => {
    expect(draftWebsiteAddress(null)).toBeNull()
    expect(draftWebsiteAddress(undefined)).toBeNull()
    expect(draftWebsiteAddress('')).toBeNull()
    expect(draftWebsiteAddress('   ')).toBeNull()
  })

  it('🛑 PROSE IS NEVER REPAIRED INTO A URL — we do not fabricate a website', () => {
    for (const junk of [
      'not sure yet', 'ask Ellis', 'we have none', 'n/a', 'coming soon',
      'ellis@redmayne.co.uk', 'ftp://redmayne.co.uk', 'redmayne co uk',
      'https://red mayne.co.uk',
    ]) {
      expect(draftWebsiteAddress(junk), `"${junk}" was turned into an address`).toBeNull()
    }
  })
})

describe('🛑 resolveOwnedWebsite — the confirmed brief is the authority', () => {
  // ── A · CONFIRMED EXPLICIT NONE + A CONTRADICTORY BODY ────────────────────────────────
  it('A · confirmed website_none=true beats a website in the request body', () => {
    const r = resolveOwnedWebsite(
      { website: null, website_none: true },
      'https://stale-from-the-browser.example',
    )
    expect(r.source).toBe('draft_none')
    // Positively null, NOT undefined: undefined is dropped by JSON serialisation and would
    // leave a stale value in place on the UPDATE branch of a re-onboarding.
    expect(r.website).toBeNull()
    expect(r.website).not.toBeUndefined()
  })

  it('A · an explicit none with a blank draft website still persists none', () => {
    for (const blank of [null, undefined, '', '   ']) {
      const r = resolveOwnedWebsite({ website: blank, website_none: true }, 'https://stale.example')
      expect(r.source).toBe('draft_none')
      expect(r.website).toBeNull()
    }
  })

  it('A · an explicit none with NO body website is still written, not merely omitted', () => {
    const r = resolveOwnedWebsite({ website_none: true }, undefined)
    expect(r.source).toBe('draft_none')
    expect(r.website).toBeNull()
  })

  // ── B · CONFIRMED VALUE A + BODY VALUE B ──────────────────────────────────────────────
  it('B · confirmed website A beats request-body website B', () => {
    const r = resolveOwnedWebsite(
      { website: 'https://redmayne.co.uk' },
      'https://someone-elses-site.example',
    )
    expect(r.source).toBe('draft_value')
    expect(r.website).toBe('https://redmayne.co.uk')
  })

  it('B · and a confirmed BARE DOMAIN beats the body too — the hole the ^https?:// test left', () => {
    const r = resolveOwnedWebsite({ website: 'redmayne.co.uk' }, 'https://someone-elses-site.example')
    expect(r.source).toBe('draft_value')
    expect(r.website).toBe('https://redmayne.co.uk')
  })

  it('B · an address WINS over a contradictory explicit none — same precedence as briefFactValues', () => {
    // A draft holding both is contradictory; the counter resolves it value-first
    // (`trimmed(website) || websiteNone`), so the write must resolve it the same way or the
    // gate and the write disagree about the same brief.
    const r = resolveOwnedWebsite(
      { website: 'https://redmayne.co.uk', website_none: true },
      'https://body.example',
    )
    expect(r.source).toBe('draft_value')
    expect(r.website).toBe('https://redmayne.co.uk')
  })

  it('B · omission from the browser cannot lose a confirmed website', () => {
    const r = resolveOwnedWebsite({ website: 'https://redmayne.co.uk' }, undefined)
    expect(r.source).toBe('draft_value')
    expect(r.website).toBe('https://redmayne.co.uk')
  })

  // ── C · NO DRAFT / LEGACY PATH ────────────────────────────────────────────────────────
  it('C · no confirmed draft — the body stands, exactly as today', () => {
    const r = resolveOwnedWebsite(null, 'https://legacy-client.example')
    expect(r.source).toBe('body')
    expect(r.website).toBe('https://legacy-client.example')
  })

  it('C · no confirmed draft and no body website — still nothing invented', () => {
    const r = resolveOwnedWebsite(undefined, undefined)
    expect(r.source).toBe('body')
    expect(r.website).toBeUndefined()
  })

  // ── THE SILENT DRAFT — the direction R72 ⑦ forbids reading into an absence ────────────
  it('🛑 a draft SILENT on the website does not blank what the caller had', () => {
    // `website_none` absent, false and null are NOT an answer — the same rule the canonical
    // counter applies. Blanking here would erase a real website because the brief never
    // mentioned it.
    for (const none of [undefined, false, null]) {
      const r = resolveOwnedWebsite({ website: null, website_none: none }, 'https://real.example')
      expect(r.source, `website_none=${String(none)} was treated as an explicit none`).toBe('body')
      expect(r.website).toBe('https://real.example')
    }
  })

  it('🛑 an UNUSABLE draft website falls back rather than being repaired or blanked', () => {
    const r = resolveOwnedWebsite({ website: 'not sure yet' }, 'https://real.example')
    expect(r.source).toBe('body')
    expect(r.website).toBe('https://real.example')
  })

  it('an unusable draft website with an explicit none still persists none', () => {
    const r = resolveOwnedWebsite({ website: 'n/a', website_none: true }, 'https://real.example')
    expect(r.source).toBe('draft_none')
    expect(r.website).toBeNull()
  })
})
