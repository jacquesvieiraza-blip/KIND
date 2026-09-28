// ═══════════════════════════════════════════════════════════════════════════════════════
// NORTHWIND — THE ONE CLIENT DEMO OF THE CURRENT PRODUCT (R164, founder-ruled 25 Sep; GO 28 Sep).
//
// The founder's request, verbatim (#2319): "we need an end to end demo version. just one. to
// demo to a client. vida has a demo build but its not this". He chose a demo login on the live
// site, made-up people, all the way to results, and a made-up B2B software firm. MBF (26 Jul)
// is the demo he meant by "not this": it seeds the retired per-lead model (credits, packs,
// calendar bookings) and has no programme and no meetings row, so it cannot show today's flow.
//
// THE DATA HALF — no database import, so every row the demo writes is provable in a unit test
// and against the real schema (`realdb/demo-northwind.realdb.test.ts`). The writer is
// `demo-northwind.ts`.
//
// ⚠️ ONE STAGE → ONE COMPLETE SET OF ROWS. The demo is not walked by the engine; Vida sets it to
// a stage and this file says what the account looks like there. Brief → Proof → Programme →
// Approval → Results → Complete, the same six the client's ribbon prints (`mvp1-stage.ts`).
// Each stage is a superset of the one before, so jumping straight to Results is the same
// account a client would have after walking every step.
//
// ⚠️ NO RANDOMNESS (the MBF lesson): the same people, companies, replies and meetings every
// reset, because a demo script only works if the stage doesn't move. Ids and timestamps are
// the writer's inputs, so the rows are a pure function of (stage, ids, now).
//
// SAFETY, IN LAYERS — this account can never touch a real person or real money:
//   · `clients.is_demo = true` is a hard stop in every send path, refused at Stripe, and never
//     takes a real mailbox (R164 PR A, `demo-safety-locks.test.ts`).
//   · Every address ends in `.invalid` (RFC 2606: can never resolve), and the login is on
//     `kind-demo.internal` — both refused by the SMTP seam.
//   · No payment is recorded. The programme is authorised internally (`*_authorised_at`, the
//     "no fake money" columns, 2 Sep) — never `*_paid_at`, never a payment reference.
//   · Every company and person below is invented. None is a real firm.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { MVP1_MILLA_STAGES, type Mvp1MillaStage, quoteProgramme, bandForEmployees, type SizeBand } from '@kind/shared'

export type NorthwindStage = Mvp1MillaStage
export const NORTHWIND_STAGES: readonly NorthwindStage[] = MVP1_MILLA_STAGES

/** The fixed login. `kind-demo.internal` never delivers (R164 A refuses it at the SMTP seam). */
export const NORTHWIND_EMAIL = 'northwind@kind-demo.internal'
export const NORTHWIND_NAME = 'Northwind Field Software'
/** Every prospect address ends here. `.invalid` can never resolve. */
export const NORTHWIND_MARKER = 'northwind-demo.invalid'
/**
 * ⚑ 28 Sep (R173) — the mailbox the demo's Approval screen names as the sender. DISPLAY ONLY: a
 * demo holds no mailbox (R164 A) and `.invalid` can never deliver; nothing sends from it.
 */
export const NORTHWIND_SENDER = `hannah@${NORTHWIND_MARKER}`
export const NORTHWIND_EMPLOYEES = 64
export const NORTHWIND_BAND: SizeBand = bandForEmployees(NORTHWIND_EMPLOYEES) as SizeBand
/** The meetings the demo programme buys. Priced by `quoteProgramme`, never typed. */
export const NORTHWIND_MEETINGS = 8
/** Qualified meetings at Results. Complete delivers the full target. */
export const NORTHWIND_RESULTS_MEETINGS = 3

/** Is this login the Northwind demo? Case-insensitive; null-safe. */
export function isNorthwindLogin(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase() === NORTHWIND_EMAIL
}

/** The eleven Brief facts, as Northwind would have told Milla (`brief-facts.ts` keys). */
export const NORTHWIND_FACTS = {
  contact_name: 'Hannah Reid',
  company_name: NORTHWIND_NAME,
  website: 'https://northwind-demo.invalid',
  what_they_do: 'Scheduling and job-tracking software for field-service teams — engineers, fitters and inspectors on the road.',
  target_category: 'Facilities management and field-service companies',
  geographies: ['United Kingdom'],
  target_company_type: 'Firms running 20+ engineers or technicians in the field',
  company_sizes: ['51–200', '201–500'],
  job_titles: ['Operations Director', 'Head of Operations', 'Service Delivery Manager'],
  seniority_levels: ['director', 'head', 'vp'],
  exclusions: 'No existing customers, no councils or public-sector bodies.',
  desired_outcome: 'Qualified meetings with operations leaders who are outgrowing spreadsheets and whiteboards.',
  desired_outcome_kind: 'meetings',
  country: 'United Kingdom',
  company_employees: NORTHWIND_EMPLOYEES,
} as const

export const NORTHWIND_ICP = {
  name: 'Ops leaders at UK field-service firms, 51–500 staff',
  industries: ['Facilities Services', 'Construction', 'Building Maintenance'],
  geographies: ['United Kingdom'],
  job_titles: ['Operations Director', 'Head of Operations', 'Service Delivery Manager'],
  seniority_levels: ['director', 'head', 'vp'],
  company_sizes: ['51–200', '201–500'],
  tech_stack: [] as string[],
  keywords: ['field service', 'engineers', 'job scheduling'],
  target_category: 'Facilities management and field-service companies',
  target_company_type: 'Firms running 20+ engineers or technicians in the field',
  exclusions: 'No existing customers, no councils or public-sector bodies.',
  apollo_only_consented: true,
}

type Cast = { first: string; last: string; title: string; seniority: string; company: string; industry: string; size: string; score: number }

/** 24 invented people at invented companies. The first twenty are what the Proof desk shows. */
export const NORTHWIND_CAST: readonly Cast[] = [
  { first: 'Imogen',  last: 'Hartley',   title: 'Operations Director',        seniority: 'director', company: 'Brightwell Facilities',  industry: 'Facilities Services',  size: '140', score: 95 },
  { first: 'Callum',  last: 'Fraser',    title: 'Head of Operations',         seniority: 'head',     company: 'Tidewater Maintenance',  industry: 'Building Maintenance', size: '220', score: 93 },
  { first: 'Priya',   last: 'Chandran',  title: 'Service Delivery Manager',   seniority: 'manager',  company: 'Oakmere Building Services', industry: 'Facilities Services', size: '95', score: 91 },
  { first: 'Owen',    last: 'Pritchard', title: 'Operations Director',        seniority: 'director', company: 'Kestrel Fire & Security', industry: 'Facilities Services', size: '310', score: 90 },
  { first: 'Ruth',    last: 'Okonkwo',   title: 'Head of Field Operations',   seniority: 'head',     company: 'Linden Lift Engineering', industry: 'Building Maintenance', size: '120', score: 89 },
  { first: 'Declan',  last: 'Murray',    title: 'VP Operations',              seniority: 'vp',       company: 'Harbourline FM',         industry: 'Facilities Services',  size: '460', score: 88 },
  { first: 'Sophie',  last: 'Whitlock',  title: 'Operations Director',        seniority: 'director', company: 'Greystone Heating',      industry: 'Construction',         size: '75',  score: 87 },
  { first: 'Marcus',  last: 'Bell',      title: 'Head of Service',            seniority: 'head',     company: 'Northgate Electrical',   industry: 'Construction',         size: '180', score: 86 },
  { first: 'Aisha',   last: 'Rahman',    title: 'Service Delivery Director',  seniority: 'director', company: 'Clearview Cleaning Group', industry: 'Facilities Services', size: '390', score: 85 },
  { first: 'Tom',     last: 'Ashworth',  title: 'Operations Manager',         seniority: 'manager',  company: 'Pennine Pest Control',   industry: 'Facilities Services',  size: '68',  score: 84 },
  { first: 'Grace',   last: 'Lindqvist', title: 'Head of Operations',         seniority: 'head',     company: 'Riverside Plumbing Co',  industry: 'Construction',         size: '110', score: 83 },
  { first: 'Ben',     last: 'Harrow',    title: 'Director of Operations',     seniority: 'director', company: 'Copperfield Solar Services', industry: 'Construction',     size: '150', score: 82 },
  { first: 'Niamh',   last: 'Doyle',     title: 'Field Service Manager',      seniority: 'manager',  company: 'Ashgrove Access Control', industry: 'Facilities Services', size: '90',  score: 81 },
  { first: 'Ravi',    last: 'Mistry',    title: 'Head of Operations',         seniority: 'head',     company: 'Beacon Compliance Testing', industry: 'Building Maintenance', size: '130', score: 80 },
  { first: 'Laura',   last: 'Pike',      title: 'Operations Director',        seniority: 'director', company: 'Summit Roofing Services', industry: 'Construction',        size: '240', score: 79 },
  { first: 'James',   last: 'Oduya',     title: 'Service Operations Lead',    seniority: 'manager',  company: 'Meridian Water Hygiene', industry: 'Building Maintenance', size: '72',  score: 78 },
  { first: 'Chloe',   last: 'Barnett',   title: 'Head of Customer Operations', seniority: 'head',    company: 'Fairway Grounds Care',   industry: 'Facilities Services',  size: '160', score: 77 },
  { first: 'Harry',   last: 'Quinn',     title: 'Operations Director',        seniority: 'director', company: 'Stonebridge HVAC',       industry: 'Construction',         size: '205', score: 76 },
  { first: 'Freya',   last: 'Maddox',    title: 'Operations Manager',         seniority: 'manager',  company: 'Willowbank Glazing',     industry: 'Construction',         size: '58',  score: 75 },
  { first: 'Samuel',  last: 'Ekwueme',   title: 'Head of Operations',         seniority: 'head',     company: 'Lakeside Door Systems',  industry: 'Building Maintenance', size: '115', score: 74 },
  { first: 'Ella',    last: 'Brennan',   title: 'Operations Director',        seniority: 'director', company: 'Ironbridge Scaffolding', industry: 'Construction',         size: '280', score: 73 },
  { first: 'Patrick', last: 'Hale',      title: 'Service Manager',            seniority: 'manager',  company: 'Cobalt Catering Equipment', industry: 'Facilities Services', size: '66', score: 72 },
  { first: 'Zara',    last: 'Kaur',      title: 'Head of Field Service',      seniority: 'head',     company: 'Marlow Washroom Services', industry: 'Facilities Services', size: '175', score: 71 },
  { first: 'Leo',     last: 'Grant',     title: 'Operations Director',        seniority: 'director', company: 'Thornbury Drainage',     industry: 'Building Maintenance', size: '98',  score: 70 },
]

/**
 * ⚑ 28 Sep (R173) — THE DEMO'S MARKET SIZE, FIXED. A real client's slider stops at the capacity
 * of their targeting, from a live provider count. The demo must be the same every time and must
 * never depend on real data, so Northwind's count is this number — chosen so the workable pool
 * (this, less the 24 already on its desk) is 3,536 and the ceiling is exactly 8 meetings, the
 * same the live site showed the founder on 28 Sep. Never shown to the client (R136 ③).
 */
export const NORTHWIND_MATCHED = 3560

/** The first N of the cast are the ones the programme contacts from Approval on. */
export const NORTHWIND_PROGRAMME_PEOPLE = 20

export function northwindCompanySlug(company: string): string {
  return company.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function northwindEmail(c: Cast): string {
  return `${c.first}.${c.last}`.toLowerCase().replace(/[^a-z.]/g, '') + `@${northwindCompanySlug(c.company)}.${NORTHWIND_MARKER}`
}

/** The sequence the client approves. Three emails, written against the cast's world. */
export const NORTHWIND_SEQUENCE = [
  { wait_days: 0, subject: 'Engineers on the road, jobs on a whiteboard?',
    body: "Hi {{first_name}} — most field-service firms {{company}}'s size are still booking engineers from a spreadsheet and chasing job sheets by phone. Northwind puts the schedule, the job and the sign-off in one place. Worth 15 minutes to see if it fits?" },
  { wait_days: 4, subject: 'Re: Engineers on the road, jobs on a whiteboard?',
    body: "{{first_name}} — one number from teams like yours: an hour a day per coordinator, back. If that isn't where {{company}} is, tell me and I'll leave it there." },
  { wait_days: 7, subject: 'Last one from me',
    body: "No reply, so I'll stop here. If scheduling ever becomes the bottleneck rather than the engineers, we're a short call away." },
]


// ── ⚑ 28 Sep (founder: "an empty chat seems shit. this is across all of them") — THE HISTORY ──
//
// A demo that opens on an empty chat looks like nobody has ever used it. So every stage opens on
// the conversation Northwind would have had with Milla to get there. Milla's chat shows two
// histories (`MillaConversation.tsx`): the Brief transcript (`onboarding_brief_drafts.conversation`)
// and the latest thread (`milla_sessions` + `milla_messages`, last 20). Both are seeded here.
// Every number said below matches the rows this file writes at that stage.

type Turn = { role: 'user' | 'assistant'; content: string }

/** Milla's own opening line — the same sentence a new client is greeted with. */
const GREETING = 'Hi, I’m Milla. Tell me what you’re trying to achieve, and I’ll help shape the right programme from there.'

/** The whole Brief conversation, as Northwind had it. Brief stage shows the first BRIEF_SO_FAR turns. */
export const NORTHWIND_BRIEF_CHAT: readonly Turn[] = [
  { role: 'assistant', content: GREETING },
  { role: 'user', content: 'Hi — I’m Hannah, I run growth at Northwind Field Software. We make scheduling and job-tracking software for field-service teams.' },
  { role: 'assistant', content: 'Thanks, Hannah. Who are you trying to get in front of?' },
  { role: 'user', content: 'Operations leaders at UK facilities management and maintenance firms — the ones running 20 or more engineers on the road.' },
  { role: 'assistant', content: 'Got it. Roughly how big are those companies?' },
  { role: 'user', content: 'Somewhere between 50 and 500 staff.' },
  { role: 'assistant', content: 'And which roles should I look for at those companies?' },
  { role: 'user', content: 'Operations Director, Head of Operations and Service Delivery Manager.' },
  { role: 'assistant', content: 'Is there anyone I should leave out?' },
  { role: 'user', content: 'Our existing customers, and councils or other public-sector bodies.' },
  { role: 'assistant', content: 'Last one: what does a good result look like for you?' },
  { role: 'user', content: 'Qualified meetings with ops leaders who are outgrowing spreadsheets and whiteboards.' },
  { role: 'assistant', content: 'Here’s your brief: operations leaders at UK field-service and facilities firms with 51–500 staff, leaving out your customers and the public sector. Confirm it and I’ll find real examples for you to check before anything is spent.' },
  { role: 'user', content: 'That’s right — confirmed.' },
]
/** At Brief the conversation stops at Milla's question about roles — the presenter answers live. */
export const NORTHWIND_BRIEF_SO_FAR = 7

/** The facts Milla has at that point (the rest come from the live answers). */
const FACTS_SO_FAR = {
  contact_name: NORTHWIND_FACTS.contact_name, company_name: NORTHWIND_FACTS.company_name,
  website: NORTHWIND_FACTS.website, what_they_do: NORTHWIND_FACTS.what_they_do,
  target_category: NORTHWIND_FACTS.target_category, target_company_type: NORTHWIND_FACTS.target_company_type,
  geographies: NORTHWIND_FACTS.geographies, company_sizes: NORTHWIND_FACTS.company_sizes,
  country: NORTHWIND_FACTS.country,
}

/** The thread after the Brief. Each turn belongs to the first stage at which it has happened. */
type ThreadTurn = Turn & { from: NorthwindStage; daysAgo: number }

const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']

/**
 * ⚑ 28 Sep (R173) — every number Milla says is the number the demo holds, for the target chosen.
 * Worked out from the same replies and meetings the rows are built from, never typed.
 */
export function northwindThread(target: number = NORTHWIND_MEETINGS): ThreadTurn[] {
  const d = meetingsAt('Results', target)
  const inbox = NORTHWIND_REPLIES.filter(r => r.meeting === null || r.meeting <= d)
  const n = (k: string) => inbox.filter(r => r.classification === k).length
  const parts = [
    n('hot') ? `${n('hot')} keen` : null,
    n('warm') ? `${n('warm')} asking to reconnect in the new year` : null,
    n('out_of_office') ? `${n('out_of_office')} out of office` : null,
    n('not_interested') ? `${n('not_interested')} not interested` : null,
  ].filter(Boolean) as string[]
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0] ?? ''
  const progress = `You have ${d} qualified meeting${d === 1 ? '' : 's'} of your ${target} so far${d > 0 ? ', with the next one in two days' : ''}. There are ${inbox.length} replies in your Inbox: ${list}.`
  const turns: Array<ThreadTurn | null> = [
    { from: 'Proof', daysAgo: 28, role: 'assistant', content: `I’ve found your first examples: ${NORTHWIND_CAST.length} people who match your brief, each with the reason I picked them. Have a look on the right and tell me which look right and which don’t.` },
    { from: 'Programme', daysAgo: 22, role: 'user', content: 'These look strong. Imogen at Brightwell is exactly who we want to be talking to.' },
    { from: 'Programme', daysAgo: 22, role: 'assistant', content: 'Good — I’ll keep leaning that way. Your targeting is set. Next, choose how many qualified meetings you want. You pay once, per meeting.' },
    { from: 'Programme', daysAgo: 21, role: 'user', content: 'What counts as a qualified meeting?' },
    { from: 'Programme', daysAgo: 21, role: 'assistant', content: 'The right person, at a company that fits your brief, who has agreed to meet you with a date set. If a meeting doesn’t meet that bar, it doesn’t count.' },
    { from: 'Approval', daysAgo: 20, role: 'user', content: `Let’s go with ${target}.` },
    { from: 'Approval', daysAgo: 18, role: 'assistant', content: `Your programme is ready: ${NORTHWIND_PROGRAMME_PEOPLE} people to start with and a three-email sequence. It’s on the right for you to check. Nothing is sent until you approve it.` },
    { from: 'Results', daysAgo: 16, role: 'user', content: 'Approved — let’s go.' },
    { from: 'Results', daysAgo: 15, role: 'assistant', content: 'Thanks, Hannah. Your programme is live. I’ll tell you as replies and meetings come in.' },
    d >= 1 ? { from: 'Results', daysAgo: 11, role: 'assistant', content: 'Imogen Hartley at Brightwell Facilities replied — they’ve just taken on two new contracts and want to talk. That meeting is booked.' } : null,
    { from: 'Results', daysAgo: 1, role: 'user', content: 'How are we doing overall?' },
    { from: 'Results', daysAgo: 1, role: 'assistant', content: progress },
    { from: 'Complete', daysAgo: 1, role: 'assistant', content: `Your ${ORDINAL[target - 1]} qualified meeting is booked. You’ve reached your target of ${target}, so your programme is complete.` },
    { from: 'Complete', daysAgo: 0, role: 'user', content: 'Brilliant. What happens next?' },
    { from: 'Complete', daysAgo: 0, role: 'assistant', content: 'Whenever you’re ready, we can start your next programme. I keep everything I’ve learned about who says yes to you, so you won’t need to brief me again.' },
  ]
  return turns.filter((t): t is ThreadTurn => t !== null)
}

/** Replies. `meeting` marks the ones that became a qualified meeting (in this order). */
export const NORTHWIND_REPLIES: ReadonlyArray<{ cast: number; classification: 'hot' | 'warm' | 'not_interested' | 'out_of_office'; body: string; daysAgo: number; meeting: number | null }> = [
  { cast: 0,  classification: 'hot', daysAgo: 12, meeting: 1, body: "Timely — we've just taken on two new contracts and the whiteboard is not coping. Can you do Tuesday afternoon?" },
  { cast: 1,  classification: 'hot', daysAgo: 10, meeting: 2, body: 'Yes, happy to look. Send me a couple of times next week.' },
  { cast: 3,  classification: 'hot', daysAgo: 8,  meeting: 3, body: "This is on my list for Q4. Let's talk — Thursday works." },
  { cast: 5,  classification: 'hot', daysAgo: 6,  meeting: 4, body: "We're reviewing our job-management setup now. Happy to take a call." },
  { cast: 4,  classification: 'hot', daysAgo: 5,  meeting: 5, body: 'Interesting. Book something in with me and our service manager.' },
  { cast: 7,  classification: 'hot', daysAgo: 4,  meeting: 6, body: 'Go on then — 20 minutes next week?' },
  { cast: 8,  classification: 'hot', daysAgo: 3,  meeting: 7, body: "Good timing. We're hiring six engineers and scheduling is already stretched." },
  { cast: 11, classification: 'hot', daysAgo: 2,  meeting: 8, body: 'Yes — can you show me how the sign-off works on site?' },
  { cast: 2,  classification: 'warm', daysAgo: 9, meeting: null, body: 'Maybe in the new year. Send me something I can read first.' },
  { cast: 6,  classification: 'out_of_office', daysAgo: 7, meeting: null, body: "I'm out of the office until Monday with limited access to email." },
  { cast: 9,  classification: 'not_interested', daysAgo: 6, meeting: null, body: "We've just signed with another provider, thanks." },
]

export type NorthwindIds = {
  userId: string
  clientId: string
  icpId: string
  programmeId: string
  campaignId: string
  sequenceId: string
  sessionId: string
  /** One per cast member, in cast order. */
  leadIds: readonly string[]
  /** One per NORTHWIND_REPLIES entry, in order. */
  replyIds: readonly string[]
}

/** Every row the demo holds at one stage, in insert order. `null`/empty = not at this stage. */
export type NorthwindRows = {
  client: Record<string, unknown> | null
  draft: Record<string, unknown> | null
  programme: Record<string, unknown> | null
  icp: Record<string, unknown> | null
  campaign: Record<string, unknown> | null
  sequence: Record<string, unknown> | null
  leads: Record<string, unknown>[]
  enrollments: Record<string, unknown>[]
  sentEmails: Record<string, unknown>[]
  replies: Record<string, unknown>[]
  meetings: Record<string, unknown>[]
  session: Record<string, unknown> | null
  messages: Record<string, unknown>[]
  offer: Record<string, unknown> | null
  proofClaim: Record<string, unknown> | null
}

export function stageIndex(stage: NorthwindStage): number {
  const i = NORTHWIND_STAGES.indexOf(stage)
  if (i < 0) throw new Error(`Unknown demo stage "${String(stage)}"`)
  return i
}

export function isNorthwindStage(v: unknown): v is NorthwindStage {
  return typeof v === 'string' && (NORTHWIND_STAGES as readonly string[]).includes(v)
}

/**
 * ⚑ 28 Sep (R173) — THE DEMO BUYS WHAT THE PRESENTER CHOSE. The Programme screen lets them pick
 * a number; clicking through (Accept → Approval) builds the programme at that number. Between 1
 * and 8: the cast has eight replies that become meetings, and 8 is also where the live pool caps
 * Northwind's targeting. Anything else (or nothing) is the default 8.
 */
export function northwindTarget(meetings?: number | null): number {
  const n = Math.floor(Number(meetings))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, NORTHWIND_MEETINGS) : NORTHWIND_MEETINGS
}

/** Meetings delivered at a stage — Results shows progress, Complete shows the target met. */
export function meetingsAt(stage: NorthwindStage, target: number = NORTHWIND_MEETINGS): number {
  if (stage === 'Complete') return target
  if (stage === 'Results') return Math.min(NORTHWIND_RESULTS_MEETINGS, Math.max(0, target - 1))
  return 0
}

/**
 * The whole account at one stage. Pure: same (stage, ids, now) → same rows.
 *
 * ⚠️ BRIEF HAS NO CLIENT ROW, BY DESIGN. In the product, Brief is "signed in, no account yet"
 * (`/milla/welcome`) — the account is created when the client confirms. The demo login then
 * walks the real Brief chat; `promoteConfirmedBrief` hands the demo login to this file instead
 * of the real promotion, so confirming never sources real people (see `demo-northwind.ts`).
 */
export function northwindRows(stage: NorthwindStage, ids: NorthwindIds, now: Date, opts: { meetings?: number | null } = {}): NorthwindRows {
  const at = stageIndex(stage)
  const target = northwindTarget(opts.meetings)
  const S = { proof: 1, programme: 2, approval: 3, results: 4, complete: 5 }
  const iso = (daysAgo: number, hours = 0) => new Date(now.getTime() - daysAgo * 86_400_000 + hours * 3_600_000).toISOString()
  const empty: NorthwindRows = { client: null, draft: null, programme: null, icp: null, campaign: null, sequence: null, leads: [], enrollments: [], sentEmails: [], replies: [], meetings: [], session: null, messages: [], offer: null, proofClaim: null }
  // Brief: signed in, no account — and half-way through the conversation, so the presenter
  // picks it up live at Milla's question about roles.
  if (at < S.proof) {
    return { ...empty, draft: { user_id: ids.userId, facts: FACTS_SO_FAR, conversation: NORTHWIND_BRIEF_CHAT.slice(0, NORTHWIND_BRIEF_SO_FAR) } }
  }

  const quote = quoteProgramme(target, NORTHWIND_BAND)
  const hasProgramme = at >= S.approval
  const delivering = at >= S.results
  const delivered = meetingsAt(stage, target)

  const client: Record<string, unknown> = {
    id: ids.clientId, user_id: ids.userId, company_name: NORTHWIND_NAME, is_demo: true,
    country: 'United Kingdom', website: NORTHWIND_FACTS.website, industry: 'Software',
    // `commercial_model` is not named: its default is 'programme', the only value allowed.
    plan: 'figsy', contact_email: NORTHWIND_EMAIL,
    onboarded_at: iso(30),
    // The terms, accepted at signup like every client (Documents reads it). No IP: nobody signed up.
    signup_terms_accepted_at: iso(30),
    // The client's own size, set once and locked — so the price is ready (R166 ②), never
    // "price pending", and no Needs-you task is raised for a person to set it.
    size_band: NORTHWIND_BAND, size_employees: NORTHWIND_EMPLOYEES,
    size_source: 'person', size_set_by: 'client', size_locked_at: iso(30), size_checked_at: iso(30),
    // One automatic Proof pass, recorded on the ledger (the claim below) and classified: no
    // pre-ledger passes. Without both, Vida asks a person to classify "historical Proof authority".
    proof_started_at: iso(28), proof_passes_done: 1, proof_passes_legacy: 0,
    proof_completed_at: at >= S.programme ? iso(21) : null,
  }

  // The first automatic Proof pass, as a new client's first Proof leaves it: claimed and completed.
  const proofClaim: Record<string, unknown> = {
    client_id: ids.clientId, icp_id: ids.icpId, authority: 'automatic_1', status: 'completed',
    claimed_at: iso(28), settled_at: iso(27),
  }

  const draft: Record<string, unknown> = {
    user_id: ids.userId, facts: NORTHWIND_FACTS, conversation: NORTHWIND_BRIEF_CHAT,
    confirmed_at: iso(29), promoted_client_id: ids.clientId, promoted_at: iso(29),
  }

  const status = stage === 'Approval' ? 'READY_FOR_APPROVAL' : stage === 'Results' ? 'LIVE' : 'COMPLETED'
  const programme: Record<string, unknown> | null = hasProgramme ? {
    id: ids.programmeId, client_id: ids.clientId, status,
    meeting_target: quote.meetings, recommended_volume: quote.recommendedVolume,
    price_per_meeting_cents: quote.pricePerMeetingCents, price_total_cents: quote.totalCents,
    first_payment_cents: quote.firstPaymentCents, second_payment_cents: quote.secondPaymentCents,
    size_band: NORTHWIND_BAND,
    sourcing_ceiling: quote.recommendedVolume, sourced_used: NORTHWIND_CAST.length,
    recommendation_accepted_at: iso(20),
    // ⚠️ AUTHORISED, NEVER PAID. No payment reference, no Stripe id, no `*_paid_at`: nothing in
    // the money path can mistake the demo for revenue (`programmes_p1/p2_authority_xor`).
    first_authorised_at: iso(20), second_authorised_at: iso(20),
    approved_at: delivering ? iso(16) : null,
    went_live_at: delivering ? iso(15) : null,
    run_at: delivering ? iso(15) : null,
    delivered_meetings: stage === 'Complete' ? delivered : null,
  } : null

  const icp: Record<string, unknown> = {
    id: ids.icpId, client_id: ids.clientId, ...NORTHWIND_ICP, is_active: true,
    ...(hasProgramme ? { programme_id: ids.programmeId } : {}),
  }

  const campaignStatus = stage === 'Approval' ? 'draft' : stage === 'Results' ? 'active' : 'completed'
  const campaign = hasProgramme ? {
    id: ids.campaignId, client_id: ids.clientId, icp_id: ids.icpId, name: 'Field-service ops leaders · UK',
    status: campaignStatus, steps_count: NORTHWIND_SEQUENCE.length,
  } : null
  const sequence = hasProgramme ? {
    id: ids.sequenceId, client_id: ids.clientId, campaign_id: ids.campaignId,
    name: 'Field-service ops leaders · 3 emails', steps: NORTHWIND_SEQUENCE,
  } : null

  const leads = NORTHWIND_CAST.map((c, i) => {
    const inProgramme = hasProgramme && i < NORTHWIND_PROGRAMME_PEOPLE
    return {
      id: ids.leadIds[i], client_id: ids.clientId, icp_id: ids.icpId,
      first_name: c.first, last_name: c.last, email: northwindEmail(c),
      job_title: c.title, seniority: c.seniority, company: c.company, industry: c.industry,
      country: 'United Kingdom', company_size: c.size, score: c.score,
      score_reasoning: `Runs operations at a ${c.size}-person ${c.industry.toLowerCase()} firm in the UK — the exact profile in your brief, and senior enough to decide.`,
      category_fit: 'yes', status: 'scored', proof_pass: 1,
      delivered_at: iso(28), surfaced_for_approval_at: iso(28),
      ...(inProgramme ? { programme_id: ids.programmeId, qualified_at: iso(18), email_status: 'verified' } : {}),
    }
  })

  // The thread so far: every turn whose stage has been reached, oldest first, one minute apart
  // within a day so the order is fixed.
  const turns = northwindThread(target).filter(t => stageIndex(t.from) <= at)
  // ⛓️ 28 Sep — ~~`updated_at`~~: live `milla_sessions` has no such column (built by 008_milla.sql);
  // the harness did, so only the live press found it. `demo-live-columns.test.ts` now guards this.
  const session = { id: ids.sessionId, client_id: ids.clientId, title: 'Northwind programme', created_at: iso(28) }
  const messages = turns.map((t, n) => ({
    session_id: ids.sessionId, client_id: ids.clientId, role: t.role, content: t.content,
    created_at: new Date(now.getTime() - t.daysAgo * 86_400_000 - 3_600_000 + n * 60_000).toISOString(),
  }))

  // The client's offer, in their words (`figsy_knowledge` kind 'pitch', read by `client-offer.ts`).
  // Answered once the programme exists, so Milla never asks "four quick questions" mid-demo.
  const offer = hasProgramme ? {
    client_id: ids.clientId, kind: 'pitch',
    data: { offer: {
      problems: 'Field-service teams booking engineers from spreadsheets and whiteboards, and chasing job sheets by phone.',
      impact: 'Coordinators lose hours a day; visits get missed or double-booked, and customers notice.',
      roi: '', roi_may_quote: false,
      solution: 'Scheduling, job tracking and on-site sign-off in one app.',
      answered_at: iso(20), source: 'milla_offer_card',
    } },
  } : null

  // At Approval the 20 people are enrolled but nothing is scheduled (`next_send_at` stays null,
  // so no send sweep can pick them up — and `is_demo` refuses every send anyway). This is what
  // the frozen package lists as "20 people we will write to".
  if (!delivering) {
    const enrollments = hasProgramme ? NORTHWIND_CAST.slice(0, NORTHWIND_PROGRAMME_PEOPLE).map((_, i) => ({
      client_id: ids.clientId, campaign_id: ids.campaignId, programme_id: ids.programmeId, sequence_id: ids.sequenceId,
      lead_id: ids.leadIds[i], status: 'enrolled', current_step: 0, enrolled_at: iso(18),
    })) : []
    return { ...empty, client, draft, programme, icp, campaign, sequence, leads, session, messages, offer, enrollments, proofClaim }
  }

  // ── Delivery: every programme person was emailed; replies and meetings follow. ──
  const replying = new Set(NORTHWIND_REPLIES.map(r => r.cast))
  const enrollments = NORTHWIND_CAST.slice(0, NORTHWIND_PROGRAMME_PEOPLE).map((_, i) => ({
    client_id: ids.clientId, campaign_id: ids.campaignId, programme_id: ids.programmeId, sequence_id: ids.sequenceId,
    lead_id: ids.leadIds[i],
    status: replying.has(i) ? 'replied' : stage === 'Complete' ? 'completed' : 'in_progress',
    current_step: replying.has(i) ? 1 : stage === 'Complete' ? 3 : 2,
    enrolled_at: iso(15),
  }))
  const fill = (t: string, c: Cast) => t.replace(/\{\{first_name\}\}/g, c.first).replace(/\{\{company\}\}/g, c.company)
  const sentEmails: Record<string, unknown>[] = []
  NORTHWIND_CAST.slice(0, NORTHWIND_PROGRAMME_PEOPLE).forEach((c, i) => {
    const steps = replying.has(i) ? 1 : stage === 'Complete' ? 3 : 2
    for (let s = 1; s <= steps; s++) {
      const step = NORTHWIND_SEQUENCE[s - 1]
      sentEmails.push({
        campaign_id: ids.campaignId, lead_id: ids.leadIds[i], step: s,
        subject: step.subject, body: fill(step.body, c), status: 'sent',
        sent_at: iso(15 - (s - 1) * 4),
      })
    }
  })

  // Results shows the replies that had arrived by then; Complete shows them all.
  const repliesNow = NORTHWIND_REPLIES
    .map((r, n) => ({ r, n }))
    .filter(({ r }) => stage === 'Complete' || r.meeting === null || r.meeting <= delivered)
  const replies = repliesNow.map(({ r, n }) => {
    const c = NORTHWIND_CAST[r.cast]
    return {
      id: ids.replyIds[n], client_id: ids.clientId, campaign_id: ids.campaignId, lead_id: ids.leadIds[r.cast],
      from_email: northwindEmail(c), from_name: `${c.first} ${c.last}`,
      subject: `Re: ${NORTHWIND_SEQUENCE[0].subject}`, body: r.body, body_text: r.body,
      classification: r.classification, received_at: iso(r.daysAgo),
      // The Inbox counts "meetings booked" from this stamp (`lib/inbox.ts`) — the same moment
      // as the meeting's own `booked_at`.
      meeting_booked_at: r.meeting !== null && r.meeting <= delivered ? iso(r.daysAgo - 1) : null,
    }
  })

  // Qualified meetings (R141): all seven conditions true, evidenced by the prospect's own reply.
  const meetings = NORTHWIND_REPLIES
    .map((r, n) => ({ r, n }))
    .filter(({ r }) => r.meeting !== null && r.meeting <= delivered)
    .map(({ r, n }) => {
      const bookedDaysAgo = r.daysAgo - 1
      // Results: the earliest meetings have happened, the latest is still to come.
      // Complete: every meeting has happened.
      const upcoming = stage === 'Results' && r.meeting === delivered
      // Held the day after booking (or half a day ago for the latest), so every meeting has its
      // own date — never several stacked on one day.
      const scheduled = upcoming ? iso(-2, 2) : iso(Math.max(0.5, bookedDaysAgo - 1), 2)
      return {
        client_id: ids.clientId, programme_id: ids.programmeId, campaign_id: ids.campaignId,
        lead_id: ids.leadIds[r.cast],
        state: upcoming ? 'BOOKED' : 'HELD',
        booked_at: iso(bookedDaysAgo), scheduled_at: scheduled,
        verified_at: iso(bookedDaysAgo),
        held_confirmed_at: upcoming ? null : scheduled,
        qualification: {
          icp_fit: true, role_fit: true, agreed_to_meet: true, date_time_set: true,
          genuine_relevance: true, not_existing_customer: true, acceptance_evidenced: true,
        },
        qualified_at: iso(bookedDaysAgo), qualified_by: 'demo',
        evidence_reply_id: ids.replyIds[n],
        evidence_note: 'Prospect agreed to meet in their own reply.',
      }
    })

  return { client, draft, programme, icp, campaign, sequence, leads, enrollments, sentEmails, replies, meetings, session, messages, offer, proofClaim }
}
