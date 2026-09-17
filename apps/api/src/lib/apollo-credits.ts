// ═══════════════════════════════════════════════════════════════════════════════
// XC-8 / J14-C1 · HOW MANY APOLLO LEAD CREDITS ARE LEFT?
//
// With FD-6, Apollo is the only lead source, so this is the single number that decides
// whether a Proof set or a programme batch can be DELIVERED. People Search costs nothing;
// the email reveal (`people/bulk_match`) costs one credit per person. Nothing in the
// product had ever read it, so "Apollo credits ran out" was discoverable only by a run
// failing — and a run that fails for that reason looks, to a client, exactly like a market
// with nobody in it.
//
// ── 🛑 WHY THIS IS A PARSER AND NOT A FIELD READ ──────────────────────────────
//
// Apollo's usage response is not a documented contract we control, and the one thing this
// must never do is report a number it did not read. A wrong balance on the System page is
// worse than no balance, because the release checklist reads that page before a
// certification run and a fabricated "1,976 left" would authorise a run that cannot finish.
//
// So: search the response for a recognisable {limit, used} pair for LEAD credits, and return
// `null` when nothing recognisable is there. `null` renders as NOT-MEASURED with the endpoint
// named — the honest answer, and the one that sends somebody to look.
//
// ⚠️ LEAD CREDITS SPECIFICALLY. The same response carries `direct_dial`, `export` and AI
// credit pools, and those are different currencies. Reporting a dial-credit balance as the
// lead balance would be the "$138 · verified" defect: a number that was never checked
// against the thing it claims to measure.
// ═══════════════════════════════════════════════════════════════════════════════

export interface LeadCredits {
  limit: number
  used: number
  /** Where in the response the pair was found, so an operator can check the claim. */
  path: string
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Keys Apollo has used for the two halves of a credit pool. */
const LIMIT_KEYS = ['limit', 'credit_limit', 'total', 'quota']
const USED_KEYS = ['consumed', 'used', 'credits_used', 'usage']

/** Does this key name the LEAD-credit pool rather than dials, exports or AI? */
function namesLeadPool(key: string): boolean {
  const k = key.toLowerCase()
  if (/direct_dial|phone|export|ai_credit|ai-credit/.test(k)) return false
  return /lead|email|credit/.test(k)
}

function pairFrom(obj: Record<string, unknown>, path: string): LeadCredits | null {
  let limit: number | null = null
  let used: number | null = null
  for (const k of LIMIT_KEYS) if (isNum(obj[k])) { limit = obj[k] as number; break }
  for (const k of USED_KEYS) if (isNum(obj[k])) { used = obj[k] as number; break }
  if (limit === null || used === null) return null
  // A negative or absurd pair is not a reading. Better NOT-MEASURED than nonsense.
  if (limit < 0 || used < 0 || used > limit * 10) return null
  return { limit, used, path }
}

/**
 * Find the lead-credit pool anywhere in the response.
 *
 * Bounded depth, because the input is untrusted JSON from an endpoint whose shape may
 * change: an unbounded walk over a hostile or cyclic structure is a hang, and a hang on a
 * System-page probe takes the page down.
 */
export function findLeadCredits(body: unknown, path = '$', depth = 0): LeadCredits | null {
  if (depth > 6 || body === null || typeof body !== 'object') return null

  if (Array.isArray(body)) {
    for (let i = 0; i < Math.min(body.length, 50); i++) {
      const found = findLeadCredits(body[i], `${path}[${i}]`, depth + 1)
      if (found) return found
    }
    return null
  }

  const obj = body as Record<string, unknown>

  // ① A child whose KEY names the lead pool — the strongest signal, so it is tried first.
  for (const [k, v] of Object.entries(obj)) {
    if (!namesLeadPool(k) || v === null || typeof v !== 'object' || Array.isArray(v)) continue
    const pair = pairFrom(v as Record<string, unknown>, `${path}.${k}`)
    if (pair) return pair
  }

  // ② This object itself, but ONLY if something about it names the lead pool. Without that
  //    guard the first {limit, used} pair in the document wins, which could easily be the
  //    dial-credit pool — the exact mis-measurement this module exists to avoid.
  if (Object.keys(obj).some(namesLeadPool) || namesLeadPool(path)) {
    const pair = pairFrom(obj, path)
    if (pair) return pair
  }

  // ③ Recurse into the rest.
  for (const [k, v] of Object.entries(obj)) {
    const found = findLeadCredits(v, `${path}.${k}`, depth + 1)
    if (found) return found
  }
  return null
}
