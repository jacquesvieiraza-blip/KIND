// #617 — PECR: WE MUST NOT COLD-EMAIL A UK SOLE TRADER.
//
// ⚠️ NOT LEGAL ADVICE. This is a conservative engineering default the founder can loosen once
// counsel has looked at it. It is written to fail toward NOT sending, because that is the only
// direction where a mistake is recoverable.
//
// THE RULE WE ARE ENCODING. UK PECR reg. 22 bans unsolicited marketing email to **individual
// subscribers** without consent. **Corporate subscribers** — limited companies, PLCs, LLPs —
// are outside that ban, and that exemption is the entire legal basis on which B2B cold email
// operates in the UK. But a **sole trader** or an **ordinary partnership** in England, Wales or
// Northern Ireland is an INDIVIDUAL subscriber: they get the same protection as a consumer at
// their home address, and cold-emailing them is a breach the ICO can fine.
//
// ⚠️ WHY THIS WAS INVISIBLE. Nothing in the pipeline ever asked whether a "company" is one
// person trading under a name. A lead reads `company: "Sarah Jones Consulting"` and every gate
// we had — score, ICP, copy quality, opt-out, do-not-contact — passed it happily, because none
// of them is about WHO THE SUBSCRIBER IS. The prospect lists are scored people at companies,
// and a sole trader looks exactly like a small company right up until the fine arrives.
//
// ⚠️ THIS FAILS **SAFE**, AND THAT IS THE OPPOSITE OF #618 ON PURPOSE. `coldCheckExempt` fails
// OPEN — when it cannot resolve the house account, nobody is exempt and the cron behaves as
// before — because the cost of that failure is a pausable campaign. Here the cost of failing
// the wrong way is a **legal breach on day one**, so a UK lead we cannot PROVE is corporate is
// refused. Over-suppressing costs us a prospect; under-suppressing costs us the business.
//
// Pure, for the same reason `coldState` and `coldCheckExempt` are: the judgement is provable
// without a database, a network call or a clock.

/** What kind of subscriber is behind this lead, as far as PECR is concerned. */
export type PecrClass =
  /** Evidenced corporate subscriber — a Ltd/PLC/LLP-style marker in the name. Send. */
  | 'corporate'
  /** UK, and NOTHING evidences a company. Could be a sole trader. Do not send. */
  | 'individual_risk'
  /** Not a UK lead. PECR is UK law; this lead is governed elsewhere. Send. */
  | 'out_of_scope'
  /**
   * No usable country. Sends, as far as PECR is concerned.
   *
   * ⛓️ CORRECTED 20 Aug — this read *"Sends, but is NAMED so the volume is visible rather than
   * assumed."* **It was not visible and never had been.** This class is an ALLOW, so `noteSkip`
   * is never called for it, nothing reaches `enrol_skips`, and the only trace it ever left was
   * a `console.warn` nobody reads. The sentence described an intention as though it were a
   * mechanism — and it stood for two months.
   *
   * It is visible NOW, and not through this class: `/operator/country-coverage` counts the
   * BOOK — how many of a client's leads have no country — which is the question actually being
   * asked, and one the enrol-skip trail cannot answer (it reads the LAST RUN, and with outreach
   * off no run has ever happened).
   *
   * ⚠️ AND THE PRACTICAL EFFECT OF THIS CLASS CHANGED THE SAME MORNING. PECR still allows a
   * blank country — deliberately; see `pecrVerdict` — but the launch allowlist (R50) sits
   * directly behind this gate and HOLDS one. So a lead reaching this branch is allowed here and
   * stopped one line later. Both are correct: this is a legal test, that is a commercial one.
   */
  | 'unknown_country'

export type PecrVerdict = {
  allow: boolean
  class: PecrClass
  /** Founder-plain, and it goes in the skip reason an operator reads. */
  reason: string
}

/**
 * Countries whose leads fall under PECR.
 *
 * Matched against the lead's free-text `country`, which is scraped/enriched and therefore
 * inconsistent — "UK", "United Kingdom", "GB", "England" all occur. Anything not on this list
 * is treated as out of scope, which is the honest reading: PECR is UK law.
 */
const UK_COUNTRIES = [
  'uk', 'u.k.', 'gb', 'gbr', 'united kingdom', 'great britain', 'britain',
  'england', 'scotland', 'wales', 'northern ireland',
]

/**
 * Name fragments that evidence a CORPORATE subscriber.
 *
 * ⚠️ MATCHED ON WORD BOUNDARIES, AND THAT IS THE WHOLE CARE IN THIS FUNCTION. A naive
 * `includes('ltd')` passes **"Salted Foods"**, and `includes('inc')` passes **"Reinc Media"**,
 * **"Vincent & Co"** and **"Principal Partners"** — every one of them a name that evidences
 * nothing at all. A substring match here does not merely misclassify: it hands a sole trader a
 * corporate exemption they do not have, which is precisely the breach this file exists to stop.
 *
 * Non-UK forms (gmbh, bv, oy…) are included deliberately: a UK-based lead may still trade under
 * a foreign incorporated entity, and that entity is a corporate subscriber.
 */
const CORPORATE_MARKERS = [
  'ltd', 'limited', 'plc', 'llp', 'llc', 'inc', 'incorporated', 'corp', 'corporation',
  'gmbh', 'bv', 'nv', 'sa', 'srl', 'spa', 'pty', 'oy', 'ab', 'as', 'aps', 'sarl', 'ag',
]

/** True when `name` contains any marker as a WHOLE WORD — never as a substring. */
export function hasCorporateMarker(name: string | null | undefined): boolean {
  const s = String(name ?? '').toLowerCase()
  if (!s.trim()) return false
  // Split on anything that is not a letter or digit, so "Acme Ltd." / "Acme (Ltd)" / "Acme,Ltd"
  // all yield the bare token `ltd`, while "Salted" stays one token and matches nothing.
  const words = s.split(/[^a-z0-9]+/).filter(Boolean)
  return words.some(w => CORPORATE_MARKERS.includes(w))
}

/** True when this lead's country falls under PECR. */
export function isUkCountry(country: string | null | undefined): boolean {
  const c = String(country ?? '').trim().toLowerCase()
  if (!c) return false
  return UK_COUNTRIES.includes(c)
}

/**
 * May we cold-email this lead?
 *
 * Order matters: demo first (a demo never reaches a prospect at all), then country, then the
 * corporate evidence. A demo client's leads are drafted-only by design (#453), so classifying
 * them would refuse rows that were never going to send and make demo output confusing.
 */
export function pecrVerdict(a: {
  country: string | null | undefined
  companyName: string | null | undefined
  isDemo?: boolean | null
}): PecrVerdict {
  if (a.isDemo === true) {
    return { allow: true, class: 'out_of_scope', reason: 'demo account — drafted only, never sent to a prospect' }
  }

  const country = String(a.country ?? '').trim()
  if (!country) {
    // NOT refused. Refusing every unknown country would silently delete most of the book on a
    // field that is frequently just missing from enrichment — a suppression that large must be
    // a founder decision, not a side effect. So it flows, and it is COUNTED where he can see it.
    return {
      allow: true,
      class: 'unknown_country',
      // ⛓️ 20 Aug — was "…sending, and counted so the volume is visible". Nothing counted it.
      // This says what actually happens: PECR allows it, and the launch allowlist behind this
      // gate is what decides whether it sends.
      reason: 'no country on the lead — cannot tell whether PECR applies, so PECR allows it; whether it SENDS is decided by the launch allowlist behind this gate',
    }
  }

  if (!isUkCountry(country)) {
    return { allow: true, class: 'out_of_scope', reason: `${country} — outside the UK, so PECR does not govern this send` }
  }

  if (hasCorporateMarker(a.companyName)) {
    return {
      allow: true,
      class: 'corporate',
      reason: `${String(a.companyName).trim()} is an evidenced corporate subscriber — the B2B exemption applies`,
    }
  }

  const who = String(a.companyName ?? '').trim() || 'no company name'
  return {
    allow: false,
    class: 'individual_risk',
    reason: `${who} (${country}) — no corporate marker; a UK sole trader is an individual subscriber and needs consent`,
  }
}

/**
 * The skip reason the operator reads, in the format the enrol routes name their skips.
 *
 * Kept here rather than typed at the two call sites so both routes cannot drift into naming the
 * same refusal two different ways — which is exactly how one gate's counts stop reconciling
 * with another's.
 */
export function pecrSkipReason(v: PecrVerdict): string {
  return `pecr_individual_risk: ${v.reason}`
}
