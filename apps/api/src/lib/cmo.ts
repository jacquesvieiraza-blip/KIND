import { db } from '@kind/db'
import { searchPeopleWithFallback, ApolloContact } from './apollo'
import { isPlaceholderEmail } from './email-hygiene'
import { selectPoolCandidates, logPoolCounters, filterProviderContacts } from './pool-candidates'
import { splitPoolAndRemainder, splitPoolEligible, poolRefusalLine, canonicalPoolCountry } from './pool-sourcing'
import { normalizeRevealEmail } from './billing-rules'

// K.I.N.D brand voice + messaging config — update this file to change how the CMO agent writes
export const KIND_BRAND = {
  company:  'K.I.N.D',
  tagline:  'The B2B AI revenue platform for African businesses',
  website:  'https://get-kind.com',

  target_icp: {
    job_titles:    ['Founder', 'CEO', 'Managing Director', 'Sales Director', 'Head of Growth', 'Head of Sales'],
    company_size:  '5–50 employees',
    industries:    ['Professional services', 'Fintech', 'Logistics', 'Tech', 'Consulting', 'SaaS', 'Marketing agencies'],
    geographies:   ['South Africa', 'Nigeria', 'Kenya', 'Ghana', 'East Africa', 'West Africa'],
    pain_points: [
      'Founder is the entire sales team — no time to prospect',
      'Manual prospecting takes hours for a list that goes cold',
      'CRMs like Salesforce are too expensive and complex for their stage',
      'Follow-ups fall through the cracks — deals die in silence',
      'No visibility into who the best leads actually are',
    ],
  },

  messaging_pillars: [
    'Break the Human Ceiling — FIGSY removes the bottleneck of founder-led prospecting',
    'The AI Revenue Team — FIGSY (SDR), Milla (Intelligence), Vida (Website) — not tools, teammates',
    'Unlimited pipeline — when your AI team is running, pipeline growth has no ceiling',
    'African-first — POPIA/NDPR compliant by default, ZAR billing, built for how African businesses sell',
    'You close the deal. FIGSY finds the people, starts the conversation, and books the meeting.',
  ],

  tone: {
    voice:   'Direct, confident, no fluff. Like a senior colleague who gives you the number first. We found you with FIGSY — and that is exactly the point.',
    avoid:   ['Corporate jargon', 'Excessive exclamation marks', '"Revolutionary" or "game-changing"', 'Vague promises', 'Calling it "AI-powered" — just show the outcome'],
    use:     ['Specific numbers', 'Concrete outcomes', 'Short sentences', 'Active voice', 'Honest honesty about what the product does'],
    example_hooks: [
      'You are not buying software. You are hiring a team.',
      'FIGSY found your details. I thought it was only fair to tell you.',
      'Break the human ceiling — your pipeline should not be limited by how many hours you have.',
      'First leads in under 10 minutes. Or your money back.',
      'This email was written by FIGSY. The next one can be about your pipeline.',
    ],
  },

  products: {
    lead_gen: {
      name:        'Lead Gen',
      price:       '$1/lead, min $100/mo',
      value_prop:  'Scored, POPIA-compliant leads matched to your ICP — delivered in hours',
    },
    figsy: {
      name:        'FIGSY',
      price:       '$3/lead bundled, or $150/mo add-on',
      value_prop:  'AI SDR — writes personalised emails, follows up, classifies replies. You just book the meeting.',
    },
    va: {
      name:        'Virtual Assistant',
      price:       '$200–$500/mo',
      value_prop:  'Knows your business — answers questions, drafts proposals, handles client comms',
    },
    chatbot: {
      name:        'AI Chatbot',
      price:       '$200–$400/mo',
      value_prop:  'Handles inbound on your website and WhatsApp. Qualifies leads, captures contact info 24/7.',
    },
  },
}

// ⛓️ **AR5 BOUNDARY, 21 Aug — this is HOUSE work and now says so.**
// ~~#481: "Client-Zero sourcing runs on the LIVE PDL+Hunter stack, not dead Apollo…
// searchPeopleWithFallback() … with Apollo dead it fails over to PDL."~~ That was written
// when a 1-Aug audit had tagged Apollo retired — **the founder overruled that conclusion**
// (AR5, 30 Jul, re-affirmed 1 Aug, #606: *"Apollo is OURS. PDL + Hunter are the CLIENTS'"*).
// PDL is the CLIENTS' stack; K.I.N.D's own hunting must not spend it. Passing `'house'`
// routes this to Apollo and closes that half of the boundary.
//
// #481's real point survives: this must never THROW when a key is missing. It does not —
// the client/PDL branch and the house/Apollo branch both swallow provider errors and
// return []. Size stays capped at the 20/day self-outreach limit.
//
// ── 🛑 ⚑ 12 Sep — POOL FIRST NOW APPLIES HERE TOO (founder gate, 12 Sep) ─────────────────
//
// ⛓️ WHAT STOOD HERE, AND WHY IT WAS OVERRULED:
//     ~~"POOL-FIRST (founder, 21 Aug) IS NOT APPLIED HERE, DELIBERATELY. This function creates
//       no leads — it returns contacts for the founder's own prospect digest, and
//       `servePoolLeads` is a lead-INSERTING step that needs a client id."~~
//
// That answered clause 1 (check owned inventory first) by pointing at an implementation
// detail, and it answered clauses 6 and 7 not at all:
//
//   · CLAUSE 7 — *never pay externally for an eligible reusable identity we already have.*
//     Every House prospecting run bought twenty Apollo records without once asking whether we
//     already owned them. Whether the result becomes a lead is irrelevant to the invoice.
//   · CLAUSE 6 — *newly acquired reusable Apollo/PDL records are written back.* Twenty bought
//     records were formatted into an HTML table, emailed to the founder, and discarded. We
//     paid, and kept nothing — so the next run could buy the same people again.
//
// The objection was real but it was about `servePoolLeads`, not about Pool First.
// `selectPoolCandidates` is the READ half, needs no client id, and is the same code the ICP
// path uses. The one rule that genuinely cannot apply without a client is the per-client
// `owned` exclusion — House has no pipeline to duplicate — and every other rule still does.
//
// ⚠️ AR5 IS UNTOUCHED. `'house'` still routes the remainder to Apollo; PDL and Hunter remain
// the CLIENTS' stack and K.I.N.D's own hunting must not spend them (#606, 30 Jul / 1 Aug).
//
// ⚠️ IT STILL NEVER THROWS. A pool read that fails returns empty and the Apollo branch runs as
// before; both provider branches still swallow their errors and return []. Size stays capped
// at the 20/day self-outreach limit.
const HOUSE_PROSPECT_TARGET = 20

/** The targeting K.I.N.D hunts on — one definition, used for the pool read and the Apollo body. */
const HOUSE_ICP = {
  industries:       KIND_BRAND.target_icp.industries,
  job_titles:       KIND_BRAND.target_icp.job_titles,
  seniority_levels: ['c_suite', 'owner', 'founder', 'director'],
  company_sizes:    ['1,10', '11,50'],
  geographies:      KIND_BRAND.target_icp.geographies,
  tech_stack:       [] as string[],
  keywords:         [] as string[],
  apollo_only_consented: false,
}

export async function findKindProspects(): Promise<ApolloContact[]> {
  // ① OWNED INVENTORY FIRST. Same selection the ICP path runs: R73 source rights, geography,
  // the opt-out blocklist (which is also the hard-bounce fence), the do-not-contact floor,
  // placeholder addresses and the hard fit. No client id — House has no pipeline of its own.
  const pool = await selectPoolCandidates(HOUSE_ICP, { cap: HOUSE_PROSPECT_TARGET })
  logPoolCounters('house-prospecting', pool.counters, pool.eligible.length)
  const fromPool: ApolloContact[] = pool.eligible.map(c => ({
    id:                null,
    first_name:        c.first_name || '',
    last_name:         c.last_name  || '',
    email:             normalizeRevealEmail(c.email_norm),
    title:             c.title      || null,
    linkedin_url:      c.linkedin_url || null,
    country:           c.country    || null,
    organization_name: c.company    || null,
    organization:      c.company ? { name: c.company } : null,
  }) as unknown as ApolloContact)

  // ② ONLY THE REMAINDER IS BOUGHT. A full pool contacts Apollo zero times — not a smaller
  // request, NO request: clause 7 made structural rather than trusted to a smaller number.
  const { pdlRemainder: remainder } = splitPoolAndRemainder(HOUSE_PROSPECT_TARGET, fromPool.length)
  console.log(`[cmo] pool-first: ${fromPool.length} of ${HOUSE_PROSPECT_TARGET} House prospects served from owned inventory at $0; remainder to buy = ${remainder}.`)
  if (remainder <= 0) return fromPool.filter(p => !isPlaceholderEmail(p.email))

  const { contacts } = await searchPeopleWithFallback(HOUSE_ICP, 1, remainder, null, 'house')

  // ③ THE BOUGHT HALF GOES BEHIND THE SAME PROTECTIONS as every other provider result —
  // unmailable addresses, the do-not-contact floor and the opt-out blocklist.
  const { accepted, refused } = await filterProviderContacts(contacts)
  if (refused.unusable + refused.suppressed + refused.blocked > 0) {
    console.log(`[cmo] stage=provider_suppression — refused ${refused.unusable} unmailable · ${refused.suppressed} do-not-contact · ${refused.blocked} opted-out of ${contacts.length} Apollo contact(s).`)
  }

  // ④ RETAIN WHAT WE BOUGHT (clause 6). `splitPoolEligible` is the cross-client rights
  // tripwire (F13/F15), and the upsert is ON CONFLICT DO NOTHING exactly as the ICP path does
  // it — a record bought once is reused and its cost is never rewritten. A failure here is
  // non-fatal: the founder still gets the digest.
  const poolUpserts = accepted
    .map(p => ({
      email_norm:   normalizeRevealEmail(p.email),
      first_name:   p.first_name || null,
      last_name:    p.last_name  || null,
      title:        p.title      || null,
      company:      p.organization?.name ?? p.organization_name ?? null,
      country:      canonicalPoolCountry(p.country) || null,
      linkedin_url: p.linkedin_url || null,
      source:       'apollo',
    }))
    .filter(r => Boolean(r.email_norm))
  const { eligible: writable, refused: refusedRows } = splitPoolEligible(poolUpserts)
  if (refusedRows.length > 0) console.error(poolRefusalLine(refusedRows))
  if (writable.length > 0) {
    const { error } = await db.from('lead_pool')
      .upsert(writable, { onConflict: 'email_norm', ignoreDuplicates: true })
    if (error) console.error('[cmo] lead_pool upsert failed (non-fatal — the digest is unaffected):', error)
    else console.log(`[cmo] stage=pool_write — ${writable.length} Apollo record(s) retained as reusable inventory.`)
  }

  // #375 (AR-38) — drop placeholder addresses so no caller can insert/charge/cold-email a fake
  // mailbox (reputation risk to our sending domain).
  return [...fromPool, ...accepted].filter(p => !isPlaceholderEmail(p.email))
}
