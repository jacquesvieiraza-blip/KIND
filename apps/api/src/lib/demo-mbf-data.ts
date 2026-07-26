// MBF — THE DEMO CAST (founder-locked 26 Jul). "5 demos = 1 sale."
//
// The DATA half, deliberately free of any database import so it can be unit-tested — the
// seeding itself lives in demo-mbf.ts.
//
// One client, one fixed cast, one fixed story. The same forty people with the same names,
// companies, titles and scores in demo one and demo fifty — because the founder is learning
// a script, and a script only works if the stage doesn't move. There is NO randomness in
// this file for exactly that reason: `seed-company.ts` uses Math.random() and produces a
// different demo every run, which is fine for a screenshot and useless for a pitch.
//
// SAFETY, in layers — this account can never touch a real prospect:
//   • `is_demo = true` is a hard stop inside the send path itself (figsy.ts), not a setting
//     someone can forget: an is_demo client can never email anyone, ever.
//   • Every email address here is @mbf-demo.invalid — `.invalid` is reserved by RFC 2606 and
//     can never resolve, so even a bug that bypassed every check would bounce at DNS.
//   • Sourcing for an is_demo client is pool-only at $0 — no PDL, no spend.
//   • The nightly cold-check and the sourcing top-up both skip demos, so MBF can sit for
//     months and never get suspended or cost us a cent.
//
// The history is planted, not simulated: a demo account showing 0 meetings and 0 replies
// sells nothing, and waiting a fortnight for a real campaign to produce numbers is not an
// option in front of a prospect.

export const MBF_NAME = 'MBF Holdings'
/** Everything about MBF hangs off this — the reset finds it by name + is_demo. */
export const MBF_MARKER = 'mbf-demo.invalid'

/**
 * May this account be ADOPTED as the MBF demo — flagged `is_demo`, renamed, wiped and
 * re-seeded?
 *
 * WHY THIS EXISTS. The reset used to look for `company_name = 'MBF Holdings'` AND
 * `is_demo = true`. The live account is called **"MBF Demo"** and was never flagged, so it
 * matched neither half: the reset could not find it (it would have minted a SECOND account
 * and left the broken one behind) and the demo purge refuses to delete anything not flagged
 * `is_demo`. **The row was stuck — no control in Vida could fix it or remove it**, while the
 * System screen correctly reported the missing hard stop as BROKEN.
 *
 * WHY IT IS A PURE FUNCTION. Adoption is the single most destructive decision in this file —
 * it ends in `wipeMbf`. The original safety was a comment plus a `.eq('is_demo', true)`;
 * this makes the rule testable, and every refusal path provable, without a database.
 *
 * THE RULE, and it preserves exactly what the old `is_demo` match protected: a REAL client
 * who happens to be called "MBF something" must never be found and emptied. So all three
 * must hold:
 *
 *   1. the name contains MBF (the caller establishes this)
 *   2. they have **never paid us** — one real purchase and it is somebody's business
 *   3. they hold **no lead with a real email address** — every address must be `.invalid`,
 *      so there is no real person's data in there to destroy
 *
 * Fail any one and we refuse and say which, rather than guessing.
 */
export function canAdoptAsMbf(a: {
  nameMatchesMbf: boolean
  /** Rows in `credit_transactions` that represent real money from this client. */
  purchaseCount: number
  /** Leads whose email is NOT on a `.invalid` domain — i.e. a real person. */
  realEmailLeadCount: number
}): { ok: true } | { ok: false; reason: string } {
  if (!a.nameMatchesMbf) {
    return { ok: false, reason: 'its name does not contain "MBF"' }
  }
  if (a.purchaseCount > 0) {
    return { ok: false, reason: `it has ${a.purchaseCount} real payment(s) against it — this is somebody's account, not a demo` }
  }
  if (a.realEmailLeadCount > 0) {
    return { ok: false, reason: `it holds ${a.realEmailLeadCount} lead(s) with a REAL email address — wiping it would destroy real people's data` }
  }
  return { ok: true }
}

// ── THE CAST ─────────────────────────────────────────────────────────────────────────
// Forty people, fixed. Ordered by score descending so the top 20 are stable and the
// "we'd start here" marks land on the same faces every time.
//
// `state` drives the whole story:
//   approved  — client already picked them; revealed, enrolled, being worked (12)
//   waiting   — surfaced, masked, awaiting the client's pick — this is what you demo (22)
//   passed    — client said not a fit; proves passing costs nothing (6)
type Cast = {
  first: string; last: string; title: string; company: string
  industry: string; country: string; size: string; score: number
  state: 'approved' | 'waiting' | 'passed'
}

export const MBF_CAST: Cast[] = [
  { first: 'Thandi',  last: 'Mokoena',   title: 'Head of Operations',    company: 'Rivo Logistics',      industry: 'Logistics', country: 'South Africa', size: '120', score: 94, state: 'approved' },
  { first: 'Sipho',   last: 'Ndlovu',    title: 'Chief Operating Officer', company: 'Kalahari Freight',  industry: 'Logistics', country: 'South Africa', size: '340', score: 91, state: 'approved' },
  { first: 'Lerato',  last: 'Dube',      title: 'Operations Director',   company: 'Cape Haul',           industry: 'Logistics', country: 'South Africa', size: '85',  score: 89, state: 'approved' },
  { first: 'Johan',   last: 'Pretorius', title: 'Head of Logistics',     company: 'Vaal Distribution',   industry: 'Logistics', country: 'South Africa', size: '210', score: 88, state: 'approved' },
  { first: 'Nomsa',   last: 'Khumalo',   title: 'Operations Manager',    company: 'Umhlanga Courier',    industry: 'Logistics', country: 'South Africa', size: '64',  score: 86, state: 'approved' },
  { first: 'Riaan',   last: 'Botha',     title: 'General Manager',       company: 'Boland Transport',    industry: 'Logistics', country: 'South Africa', size: '150', score: 85, state: 'approved' },
  { first: 'Amara',   last: 'Nwosu',     title: 'Head of Supply Chain',  company: 'Lagos Freight Co',    industry: 'Logistics', country: 'Nigeria',      size: '280', score: 84, state: 'approved' },
  { first: 'Kagiso',  last: 'Molefe',    title: 'Fleet Director',        company: 'Highveld Haulage',    industry: 'Transport', country: 'South Africa', size: '95',  score: 83, state: 'approved' },
  { first: 'Tunde',   last: 'Adeyemi',   title: 'Operations Lead',       company: 'Naija Distribution',  industry: 'Logistics', country: 'Nigeria',      size: '190', score: 82, state: 'approved' },
  { first: 'Zanele',  last: 'Mahlangu',  title: 'Head of Fulfilment',    company: 'Gauteng Warehousing', industry: 'Warehousing', country: 'South Africa', size: '410', score: 81, state: 'approved' },
  { first: 'Pieter',  last: 'van Wyk',   title: 'Operations Director',   company: 'Karoo Cold Chain',    industry: 'Logistics', country: 'South Africa', size: '130', score: 80, state: 'approved' },
  { first: 'Chiamaka', last: 'Okafor',   title: 'Head of Ops',           company: 'Abuja Logistics',     industry: 'Logistics', country: 'Nigeria',      size: '75',  score: 79, state: 'approved' },

  { first: 'Sanele',  last: 'Zulu',      title: 'Operations Manager',    company: 'Durban Port Services', industry: 'Logistics', country: 'South Africa', size: '260', score: 78, state: 'waiting' },
  { first: 'Fatima',  last: 'Bello',     title: 'Supply Chain Director', company: 'Kano Freight',        industry: 'Logistics', country: 'Nigeria',      size: '145', score: 77, state: 'waiting' },
  { first: 'Marius',  last: 'du Toit',   title: 'Head of Transport',     company: 'Free State Carriers', industry: 'Transport', country: 'South Africa', size: '88',  score: 76, state: 'waiting' },
  { first: 'Naledi',  last: 'Sithole',   title: 'Operations Lead',       company: 'Soweto Same-Day',     industry: 'Courier',   country: 'South Africa', size: '52',  score: 75, state: 'waiting' },
  { first: 'Emeka',   last: 'Eze',       title: 'COO',                   company: 'Delta Cargo',         industry: 'Logistics', country: 'Nigeria',      size: '320', score: 74, state: 'waiting' },
  { first: 'Kwame',   last: 'Mensah',    title: 'Head of Distribution',  company: 'Accra Movers',        industry: 'Logistics', country: 'Ghana',        size: '110', score: 73, state: 'waiting' },
  { first: 'Anele',   last: 'Ngcobo',    title: 'Fleet Manager',         company: 'Midlands Transport',  industry: 'Transport', country: 'South Africa', size: '67',  score: 72, state: 'waiting' },
  { first: 'Hendrik', last: 'Steyn',     title: 'Operations Director',   company: 'Overberg Logistics',  industry: 'Logistics', country: 'South Africa', size: '175', score: 71, state: 'waiting' },
  { first: 'Grace',   last: 'Mwangi',    title: 'Head of Operations',    company: 'Nairobi Freight',     industry: 'Logistics', country: 'Kenya',        size: '230', score: 70, state: 'waiting' },
  { first: 'Bongani', last: 'Mabaso',    title: 'Warehouse Director',    company: 'Isando Storage',      industry: 'Warehousing', country: 'South Africa', size: '140', score: 69, state: 'waiting' },
  { first: 'Yusuf',   last: 'Patel',     title: 'Supply Chain Lead',     company: 'Lenasia Wholesale',   industry: 'Wholesale', country: 'South Africa', size: '58',  score: 68, state: 'waiting' },
  { first: 'Refilwe', last: 'Motaung',   title: 'Operations Manager',    company: 'Rustenburg Haulage',  industry: 'Transport', country: 'South Africa', size: '96',  score: 67, state: 'waiting' },
  { first: 'Ayodele', last: 'Balogun',   title: 'Head of Logistics',     company: 'Ibadan Cargo',        industry: 'Logistics', country: 'Nigeria',      size: '125', score: 66, state: 'waiting' },
  { first: 'Karin',   last: 'Meyer',     title: 'Distribution Manager',  company: 'Paarl Produce',       industry: 'Agriculture', country: 'South Africa', size: '205', score: 65, state: 'waiting' },
  { first: 'Sizwe',   last: 'Dlamini',   title: 'Operations Director',   company: 'Empangeni Bulk',      industry: 'Logistics', country: 'South Africa', size: '155', score: 64, state: 'waiting' },
  { first: 'Adaeze',  last: 'Obi',       title: 'Head of Fulfilment',    company: 'Port Harcourt Supply', industry: 'Logistics', country: 'Nigeria',     size: '78',  score: 63, state: 'waiting' },
  { first: 'Wian',    last: 'Nel',       title: 'Fleet Director',        company: 'Bloem Transport',     industry: 'Transport', country: 'South Africa', size: '112', score: 62, state: 'waiting' },
  { first: 'Palesa',  last: 'Tau',       title: 'Operations Lead',       company: 'Polokwane Freight',   industry: 'Logistics', country: 'South Africa', size: '49',  score: 61, state: 'waiting' },
  { first: 'Ibrahim', last: 'Sule',      title: 'Head of Supply Chain',  company: 'Kaduna Distribution', industry: 'Logistics', country: 'Nigeria',      size: '188', score: 60, state: 'waiting' },
  { first: 'Ruan',    last: 'Kruger',    title: 'Warehouse Manager',     company: 'Germiston Depot',     industry: 'Warehousing', country: 'South Africa', size: '72', score: 59, state: 'waiting' },
  { first: 'Thabo',   last: 'Radebe',    title: 'Operations Manager',    company: 'Vereeniging Cargo',   industry: 'Logistics', country: 'South Africa', size: '134', score: 58, state: 'waiting' },
  { first: 'Zainab',  last: 'Yusuf',     title: 'Head of Ops',           company: 'Abeokuta Logistics',  industry: 'Logistics', country: 'Nigeria',      size: '61',  score: 57, state: 'waiting' },

  { first: 'Dylan',   last: 'Fourie',    title: 'Sales Manager',         company: 'Tygerberg Motors',    industry: 'Automotive', country: 'South Africa', size: '38', score: 44, state: 'passed' },
  { first: 'Precious', last: 'Ncube',    title: 'Office Manager',        company: 'Sandton Consulting',  industry: 'Consulting', country: 'South Africa', size: '15', score: 41, state: 'passed' },
  { first: 'Obinna',  last: 'Chukwu',    title: 'Marketing Lead',        company: 'Enugu Media',         industry: 'Media',      country: 'Nigeria',      size: '22', score: 38, state: 'passed' },
  { first: 'Elmarie', last: 'Joubert',   title: 'HR Business Partner',   company: 'Centurion Group',     industry: 'Professional Services', country: 'South Africa', size: '44', score: 35, state: 'passed' },
  { first: 'Kabelo',  last: 'Maseko',    title: 'IT Manager',            company: 'Midrand Systems',     industry: 'Technology', country: 'South Africa', size: '29', score: 33, state: 'passed' },
  { first: 'Chidi',   last: 'Nwankwo',   title: 'Finance Analyst',       company: 'Onitsha Trading',     industry: 'Retail',     country: 'Nigeria',      size: '18', score: 30, state: 'passed' },
]

/** The email for a cast member. `.invalid` can never resolve — see the safety note above. */
export function castEmail(c: Cast): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${slug(c.first)}.${slug(c.last)}@${slug(c.company)}.${MBF_MARKER}`
}

/** The ICP MBF was built from — what Milla "heard" in the conversation. */
export const MBF_ICP = {
  name: 'Ops leaders at African logistics firms, 50–500 staff',
  industries: ['Logistics', 'Transport', 'Warehousing'],
  job_titles: ['Head of Operations', 'Operations Director', 'COO', 'Head of Logistics'],
  seniority_levels: ['Director', 'VP', 'C-Suite'],
  company_sizes: ['50', '500'],
  geographies: ['South Africa', 'Nigeria', 'Kenya', 'Ghana'],
  tech_stack: [],
  keywords: ['fleet', 'route planning', 'last mile'],
  apollo_only_consented: true,
}

/** The sequence you approve on stage. Three emails, written against Thandi. */
export const MBF_SEQUENCE = [
  {
    wait_days: 0,
    subject: "Rivo's new Durban route",
    body: "Hi {{first_name}} — saw {{company}} added the Durban corridor in March. That usually means three weeks of manual scheduling before anyone admits it's a problem. We help ops teams like yours cut that to a day. Worth 15 minutes?",
  },
  {
    wait_days: 4,
    subject: "Re: Rivo's new Durban route",
    body: "{{first_name}} — following up. The teams we help usually come to us when a new route doubles the planning load and headcount can't follow. If that's not where {{company}} is, tell me and I'll stop.",
  },
  {
    wait_days: 7,
    subject: 'Last one from me',
    body: "No reply so I'll leave it here. If scheduling ever becomes the bottleneck rather than the trucks, we're a short call away.",
  },
]

/**
 * The replies waiting in the inbox. Indexes point into MBF_CAST.
 *
 * One of each kind, deliberately: a hot one that became a meeting, a warm one that needs a
 * human answer, an objection worth handling, and an opt-out — so the demo can show the
 * suppression story without waiting for a real unsubscribe.
 */
export const MBF_REPLIES: Array<{ castIndex: number; classification: string; body: string; daysAgo: number; booked: boolean }> = [
  { castIndex: 0, classification: 'hot',         daysAgo: 2, booked: true,  body: "Yes — this is exactly the problem. Tuesday morning works, send an invite." },
  { castIndex: 2, classification: 'hot',         daysAgo: 3, booked: true,  body: "We're mid-tender on this. Happy to talk Thursday if you're around." },
  { castIndex: 1, classification: 'interested',  daysAgo: 1, booked: false, body: "Interesting timing. What does implementation actually look like — are we talking weeks or months?" },
  { castIndex: 4, classification: 'interested',  daysAgo: 1, booked: false, body: "Not me, but you want Sipho on our side. Copying him in." },
  { castIndex: 3, classification: 'objection',   daysAgo: 4, booked: false, body: "We looked at something similar last year and the integration killed it. What's different?" },
  { castIndex: 7, classification: 'opt_out',     daysAgo: 5, booked: false, body: "Please remove me from your list." },
]

