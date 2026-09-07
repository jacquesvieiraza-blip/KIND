// ═══════════════════════════════════════════════════════════════════════════════════════
// A FIELD THE SEARCH DID NOT RETURN IS UNKNOWN, NOT A FAILED ICP (founder-locked 7 Sep).
//
// 🛑 THE PRODUCTION ZERO. The first clean House run searched Apollo, got 250 candidates, and
// delivered NOTHING. Two record-level gates in `runIcpJob` rejected all 250 before a single
// lead was inserted:
//
//   icps.ts  geography   `poolCountryMatches(contact.country, ['United Kingdom','United States'])`
//   icps.ts  house email `contact.email_status !== 'verified'`
//
// Apollo's People Search returns NEITHER field. Its documented person object carries
// `id`, `first_name`, `last_name_obfuscated`, `title`, `has_email`, `has_city`, `has_state`,
// `has_country`, `has_direct_phone`, `organization` — booleans about availability, never the
// values, and *"this endpoint doesn't return email addresses or phone numbers"*
// (docs.apollo.io/reference/people-api-search). So `contact.country` and
// `contact.email_status` were `undefined` on every candidate, and `undefined` failed both
// tests. 250 → 0, deterministically, every time.
//
// ── THE PRINCIPLE THIS FILE ENCODES ─────────────────────────────────────────────────────
// A customer describes their ICP in normal language and M&V must honour ALL of it. A field
// the provider's SEARCH stage does not expose means **UNKNOWN — NEED MORE DATA**. It does
// not mean the candidate failed the ICP.
//
//   search      → reject only what is KNOWN-BAD; carry unknowns forward
//   enrichment  → obtain the missing facts (Apollo's paid reveal is ONE provider step here)
//   final gate  → now unknown IS failure: the full ICP is enforced, or the lead is not usable
//
// ⚠️ THE TWO GATES ARE NOT THE SAME GATE WITH A FLAG. They answer different questions.
// Pre-reveal asks *"do we already know this candidate is wrong?"*. Final asks *"have we
// proved this candidate is right?"*. Collapsing them is what produced either the zero (fail
// unknowns early) or an unverified lead (pass unknowns late).
//
// RED PROOF — before the fix `./icp-qualification` does not exist, so every test fails at
// import; and `bulkMatchEmails` returns only an email, so the final gate has nothing to
// judge geography or verification on.
//
// Mocks only — no network, no provider, no spend, NO SOURCING.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import {
  preRevealVerdict,
  finalVerdict,
  type CandidateFacts,
  type IcpCriteria,
} from './icp-qualification'

/** The House ICP, in the customer's own terms: founder-led B2B agencies, UK and US. */
const HOUSE_ICP: IcpCriteria = {
  geographies: ['United Kingdom', 'United States'],
  requireVerifiedBusinessEmail: true,
}

/** Exactly what Apollo People Search gives us: an id and a job title. Nothing to judge on. */
const FROM_SEARCH: CandidateFacts = { email: null, emailStatus: null, country: null }

// ── ① PRE-REVEAL — UNKNOWN IS CARRIED FORWARD, KNOWN-BAD IS REJECTED ──────────────────

describe('① at search time, unknown means "need more data"', () => {
  it('🛑 a candidate with NO country and NO email_status is NOT rejected — the production zero', () => {
    expect(preRevealVerdict(FROM_SEARCH, HOUSE_ICP).ok).toBe(true)
  })

  it('a KNOWN wrong country is still rejected at search time — we do not pay to reveal it', () => {
    const v = preRevealVerdict({ ...FROM_SEARCH, country: 'Brazil' }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('geography_mismatch')
  })

  it('a KNOWN right country passes', () => {
    expect(preRevealVerdict({ ...FROM_SEARCH, country: 'United Kingdom' }, HOUSE_ICP).ok).toBe(true)
  })

  it('a KNOWN bad email status is rejected at search time', () => {
    const v = preRevealVerdict({ ...FROM_SEARCH, emailStatus: 'guessed' }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('unverified_email')
  })

  it('an ICP with NO geography constrains nothing — the customer did not ask for one', () => {
    expect(preRevealVerdict({ ...FROM_SEARCH, country: 'Brazil' }, { geographies: [], requireVerifiedBusinessEmail: true }).ok).toBe(true)
  })

  it('a blank string is unknown, not a value — a provider sending "" has told us nothing', () => {
    expect(preRevealVerdict({ email: null, emailStatus: '  ', country: '  ' }, HOUSE_ICP).ok).toBe(true)
  })
})

// ── ② FINAL — NOW UNKNOWN *IS* FAILURE ────────────────────────────────────────────────

describe('② after enrichment, the full ICP is enforced and unknown fails', () => {
  const REVEALED = { email: 'ada@agency.co.uk', emailStatus: 'verified', country: 'United Kingdom' }

  it('🛑 a fully revealed, in-geography, verified business email SURVIVES', () => {
    expect(finalVerdict(REVEALED, HOUSE_ICP).ok).toBe(true)
  })

  it('🛑 the SAME candidate that passed pre-reveal now FAILS if nothing was revealed', () => {
    // This is the pair that makes the two gates different rather than one gate with a flag.
    expect(preRevealVerdict(FROM_SEARCH, HOUSE_ICP).ok).toBe(true)
    const v = finalVerdict(FROM_SEARCH, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('no_email')
  })

  it('wrong geography fails after reveal', () => {
    const v = finalVerdict({ ...REVEALED, country: 'Brazil' }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('geography_mismatch')
  })

  it('UNKNOWN geography fails after reveal — we asked, and still cannot prove it', () => {
    const v = finalVerdict({ ...REVEALED, country: null }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('geography_unknown')
  })

  it('an unverified email fails', () => {
    const v = finalVerdict({ ...REVEALED, emailStatus: 'guessed' }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('unverified_email')
  })

  it('an UNKNOWN email status fails — a status we never got is not a verification', () => {
    const v = finalVerdict({ ...REVEALED, emailStatus: null }, HOUSE_ICP)
    expect(v.ok).toBe(false)
    expect((v as { reason: string }).reason).toBe('unverified_email')
  })

  it('🛑 a PERSONAL email fails even when Apollo calls it verified', () => {
    // `reveal_personal_emails=false` means Apollo should never send one. This is the record
    // check behind that request — a filter is a request, the record is the fact.
    for (const personal of ['ada@gmail.com', 'ada@yahoo.com', 'ada@hotmail.com', 'ada@outlook.com', 'ada@icloud.com', 'ada@protonmail.com']) {
      const v = finalVerdict({ ...REVEALED, email: personal }, HOUSE_ICP)
      expect(v.ok, `${personal} was accepted as a business email`).toBe(false)
      expect((v as { reason: string }).reason).toBe('personal_email')
    }
  })

  it('a placeholder address fails — Apollo\'s locked-email sentinel is not an email', () => {
    const v = finalVerdict({ ...REVEALED, email: 'email_not_unlocked@domain.com' }, HOUSE_ICP)
    expect(v.ok).toBe(false)
  })

  it('geography matching is case- and spacing-insensitive, like the pool predicate', () => {
    expect(finalVerdict({ ...REVEALED, country: '  united kingdom ' }, HOUSE_ICP).ok).toBe(true)
  })

  it('a non-House client is not held to verified-only — that lock is House\'s', () => {
    const clientIcp: IcpCriteria = { geographies: ['United Kingdom'], requireVerifiedBusinessEmail: false }
    expect(finalVerdict({ ...REVEALED, emailStatus: 'likely_to_engage' }, clientIcp).ok).toBe(true)
  })

  it('but a personal email is refused for EVERY audience', () => {
    const clientIcp: IcpCriteria = { geographies: ['United Kingdom'], requireVerifiedBusinessEmail: false }
    expect(finalVerdict({ ...REVEALED, email: 'ada@gmail.com' }, clientIcp).ok).toBe(false)
  })

  it('every refusal carries a reason — a silent drop is how 250 became 0 unnoticed', () => {
    for (const facts of [
      FROM_SEARCH,
      { ...REVEALED, country: 'Brazil' },
      { ...REVEALED, emailStatus: 'guessed' },
      { ...REVEALED, email: 'ada@gmail.com' },
    ]) {
      const v = finalVerdict(facts, HOUSE_ICP)
      expect(v.ok).toBe(false)
      expect(typeof (v as { reason: string }).reason).toBe('string')
    }
  })
})
