// ═══════════════════════════════════════════════════════════════════════════════════════
// HISTORICAL HOUSE ACTIVITY MUST NOT MASQUERADE AS CURRENT PROGRAMME WORK
//
// 🛑 FOUND AT RUNTIME, NOT BY A TEST. A founder screenshot of Milla House — a client with NO
// programme — showed three prospect cards under a heading reading **"Your programme"**, and a
// Recent Replies entry in the left rail. Every one of those records is from a retired desk.
//
// ── THE TWO ROOT CAUSES ─────────────────────────────────────────────────────────────────
//
// ① **`stage` IS NOT "HAS A PROGRAMME".** `millaStage` maps a DRAFT programme AND no programme
//    at all to the same stage, 'Proof'. Milla Home branched on `stage !== 'Proof'` to choose
//    between the programme workspace and the legacy client-scoped desk — so House fell into
//    the legacy desk, and `/leads/for-approval` (client_id only, and deliberately with NO time
//    bound) answered with its history. **A DRAFT programme would have done the same**, which is
//    why this does not fix itself the moment a programme is created.
//
// ② **REPLIES AND PROGRESS WERE CLIENT-SCOPED.** `figsy_replies` carries no `programme_id`, and
//    the rail read it by `client_id` alone. `progress.outcomesAchieved` counted every meeting
//    the client had ever booked. Both would have kept reporting House's history as the new
//    programme's activity and result.
//
// ── WHAT IS PROVED HERE ─────────────────────────────────────────────────────────────────
//
// 🛑 NOTHING IS DELETED AND NOTHING IS BACKFILLED. Every historical row stays exactly where it
// is and remains readable everywhere it legitimately belongs. These tests are about what is
// presented as CURRENT, which is a different question from what is kept.
//
// ⚠️ AND LEGACY IS UNTOUCHED. A client with no open programme takes the identical reads it
// always took — the $299 pack clients keep every reply they have.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>

const state: {
  programmes: Row[]; leads: Row[]; clients: Row[]; replies: Row[]; meetings: Row[]
  campaigns: Row[]; icps: Row[]
  programmesUnreadable: boolean
  /** Make the clients read THROW, so the house check's catch path is reachable. */
  clientsThrow: boolean
} = {
  programmes: [], leads: [], clients: [], replies: [], meetings: [],
  campaigns: [], icps: [], programmesUnreadable: false, clientsThrow: false,
}

function table(name: string) {
  if (name === 'clients' && state.clientsThrow) throw new Error('clients read exploded')
  const rows = (): Row[] =>
    name === 'programmes' ? state.programmes : name === 'leads' ? state.leads
    : name === 'figsy_replies' ? state.replies : name === 'meetings' ? state.meetings
    : name === 'figsy_campaigns' ? state.campaigns : name === 'icps' ? state.icps
    : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    gte() { return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      const set = String(v).replace(/[()]/g, '').split(',')
      q._f.push((r: Row) => !set.includes(String(r[c]))); return q
    },
    order() { return q },
    limit(n: number) { q._limit = n; return q },
    _hit() { const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r))); return q._limit > 0 ? all.slice(0, q._limit) : all },
    async maybeSingle() {
      if (name === 'programmes' && state.programmesUnreadable) return { data: null, error: { message: 'programmes unreadable' } }
      return { data: q._hit()[0] ?? null, error: null }
    },
    then(res: (v: unknown) => unknown) {
      if (name === 'programmes' && state.programmesUnreadable) return Promise.resolve({ data: null, error: { message: 'programmes unreadable' } }).then(res)
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

/** The house identity this repo already settled (#593): the auth user, never the name. */
let HOUSE_USER_EMAIL = 'someone-else@example.com'
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: HOUSE_USER_EMAIL } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import { readCustomerProgramme, NO_PROGRAMME } from './customer-programme'

/**
 * Executable JSX only.
 *
 * ⚠️ A LINE FILTER CANNOT DO THIS, and mine proved it: the "no Stripe vocabulary" assertion
 * failed on the workspace's own COMMENT explaining that House makes no Stripe payment. Prose
 * about a rule is not a violation of it, and `{/* … *\/}` continuation lines start with
 * neither `//` nor `*`. Block-aware, line-anchored.
 */
function jsxCode(src: string): string {
  let inBlock = false
  return src.split('\n').map(l => {
    const t = l.trim()
    if (inBlock) { if (t.endsWith('*/') || t.endsWith('*/}')) inBlock = false; return '' }
    if (t.startsWith('{/*')) { if (!t.endsWith('*/}')) inBlock = true; return '' }
    if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
    if (t.startsWith('//') || t.startsWith('*')) return ''
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

const HOUSE = 'house'
const MBF = 'mbf'
const P_NEW = 'P_NEW'
const P_OTHER = 'P_MBF'

function houseProgramme(over: Row = {}) {
  state.programmes.push({
    id: P_NEW, client_id: HOUSE, status: 'SOURCING', meeting_target: 10,
    price_total_cents: 100000, sourcing_ceiling: 2500, sourced_used: 40,
    first_paid_at: 'p1', second_paid_at: null, approved_at: null, went_live_at: null,
    paused_at: null, review_required_at: null, review_resolved_at: null, ...over,
  })
}
/** A historical House record: the retired desk. Positively unattributed. */
const historicalLead = (id: string) =>
  state.leads.push({ id, client_id: HOUSE, programme_id: null, delivered_at: 'd', surfaced_for_approval_at: 's', revealed_at: null, status: 'scored' })
const programmeLead = (id: string, programmeId = P_NEW, clientId = HOUSE) =>
  state.leads.push({ id, client_id: clientId, programme_id: programmeId, delivered_at: 'd', surfaced_for_approval_at: 's', revealed_at: null, status: 'scored' })
const reply = (id: string, leadId: string, clientId = HOUSE) =>
  state.replies.push({ id, lead_id: leadId, client_id: clientId, from_name: id, from_email: `${id}@x.com`, classification: 'interested', received_at: '2026-01-01' })
const meeting = (id: string, programmeId: string | null, clientId = HOUSE) =>
  state.meetings.push({ id, client_id: clientId, programme_id: programmeId, state: 'booked', excluded_reason: null, superseded_by: null, scheduled_at: '2026-01-01' })

beforeEach(() => {
  state.programmes = []; state.leads = []; state.clients = []; state.replies = []; state.meetings = []
  state.campaigns = []; state.icps = []
  state.programmesUnreadable = false
  HOUSE_USER_EMAIL = 'someone-else@example.com'
  state.clientsThrow = false
  state.clients.push({ id: HOUSE, user_id: 'u-house' })
  state.clients.push({ id: MBF, user_id: 'u-mbf' })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① `stage` COULD NEVER ANSWER "DOES A PROGRAMME EXIST"
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① the fact Milla Home was missing', () => {
  it('🛑 NO PROGRAMME and a DRAFT PROGRAMME ARE THE SAME STAGE — which is why the old branch failed', async () => {
    houseProgramme({ status: 'DRAFT' })
    const draft = await readCustomerProgramme(HOUSE)
    expect(draft!.stage, 'a DRAFT programme is stage Proof').toBe('Proof')
    expect(NO_PROGRAMME.stage, 'and so is no programme at all').toBe('Proof')
    // The stage cannot tell them apart. `hasProgramme` can, and that is the whole addition.
    expect(draft!.hasProgramme).toBe(true)
    expect(NO_PROGRAMME.hasProgramme).toBe(false)
  })

  it('🛑 HOUSE WITH NO PROGRAMME reports hasProgramme false, whatever history it carries', async () => {
    historicalLead('L_OLD_1'); historicalLead('L_OLD_2'); historicalLead('L_OLD_3')
    reply('R_OLD', 'L_OLD_1'); meeting('M_OLD', null)

    const p = await readCustomerProgramme(HOUSE)
    expect(p).toEqual(NO_PROGRAMME)
    expect(p!.hasProgramme).toBe(false)
    expect(p!.programmeId).toBeNull()
    // The historical rows are untouched — this decides presentation, never storage.
    expect(state.leads).toHaveLength(3)
    expect(state.replies).toHaveLength(1)
    expect(state.meetings).toHaveLength(1)
  })

  it('a programme carries its id, so a surface can positively attribute to it', async () => {
    houseProgramme()
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.hasProgramme).toBe(true)
    expect(p!.programmeId).toBe(P_NEW)
  })

  it('an unreadable programme is still null — never "no programme"', async () => {
    state.programmesUnreadable = true
    expect(await readCustomerProgramme(HOUSE)).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② PROGRESS IS THE PROGRAMME'S RESULT, NOT THE CLIENT'S LIFETIME HISTORY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② outcomesAchieved counts THIS programme\'s meetings', () => {
  it('🛑 HISTORICAL House meetings are NOT reported as the new programme\'s result', async () => {
    houseProgramme()
    meeting('M_OLD_1', null); meeting('M_OLD_2', null)   // the retired desk's meetings
    meeting('M_NEW', P_NEW)                              // this programme's

    const p = await readCustomerProgramme(HOUSE)
    expect(p!.progress.outcomesAchieved, 'one, not three').toBe(1)
    expect(state.meetings, 'and all three rows still exist').toHaveLength(3)
  })

  it('🛑 ANOTHER PROGRAMME\'S meetings are excluded', async () => {
    houseProgramme()
    meeting('M_OTHER', 'P_SOMETHING_ELSE')
    meeting('M_NEW', P_NEW)
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.progress.outcomesAchieved).toBe(1)
  })

  it('🛑 MBF\'s meetings are excluded even when attributed to their own programme', async () => {
    houseProgramme()
    meeting('M_MBF', P_OTHER, MBF)
    meeting('M_NEW', P_NEW)
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.progress.outcomesAchieved).toBe(1)
  })

  it('a programme with no meetings yet reports zero, not history', async () => {
    houseProgramme()
    meeting('M_OLD', null)
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.progress.outcomesAchieved).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ RECENT REPLIES — CURRENT MEANS THIS PROGRAMME'S
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ the rail shows the open programme\'s replies, and legacy keeps its own', () => {
  async function railReplies(clientId: string) {
    const { buildMillaSummaryData } = await import('./milla-summary')
    const s = await buildMillaSummaryData(clientId)
    return s.recent_replies.map(r => r.name)
  }

  it('🛑 A HISTORICAL REPLY IS NOT PRESENTED AS CURRENT P_NEW ACTIVITY', async () => {
    houseProgramme()
    historicalLead('L_OLD'); reply('R_OLD', 'L_OLD')      // the retired desk's reply
    programmeLead('L_NEW');  reply('R_NEW', 'L_NEW')      // this programme's

    expect(await railReplies(HOUSE)).toEqual(['R_NEW'])
    expect(state.replies, 'the historical reply is preserved, not deleted').toHaveLength(2)
  })

  it('🛑 a WRONG-PROGRAMME reply is excluded', async () => {
    houseProgramme()
    programmeLead('L_WRONG', 'P_SOMETHING_ELSE'); reply('R_WRONG', 'L_WRONG')
    programmeLead('L_NEW'); reply('R_NEW', 'L_NEW')
    expect(await railReplies(HOUSE)).toEqual(['R_NEW'])
  })

  it('🛑 MBF\'s replies are excluded', async () => {
    houseProgramme()
    programmeLead('L_MBF', P_OTHER, MBF); reply('R_MBF', 'L_MBF', MBF)
    programmeLead('L_NEW'); reply('R_NEW', 'L_NEW')
    expect(await railReplies(HOUSE)).toEqual(['R_NEW'])
  })

  it('🛑 TENANCY IS RE-APPLIED ON THE REPLY ROW ITSELF, not inherited from the lead list', async () => {
    // ⚠️ THIS IS DEFENCE IN DEPTH, AND A RED PROOF IS WHAT REVEALED IT WAS UNTESTED. The lead
    // ids are already client-scoped, so dropping the reply query's own `client_id` filter
    // changed nothing in an honest fixture and the mutation stayed green. A corrupt row is
    // what tells the two apart: a reply naming a House programme lead while carrying MBF's
    // client_id is not a permissions question to answer later — it is a broken link, and it
    // must not reach a rail either tenant can read.
    houseProgramme()
    programmeLead('L_NEW'); reply('R_NEW', 'L_NEW')
    state.replies.push({
      id: 'R_CORRUPT', lead_id: 'L_NEW', client_id: MBF,
      from_name: 'R_CORRUPT', from_email: 'x@x.com', classification: 'interested', received_at: '2026-01-02',
    })
    expect(await railReplies(HOUSE)).toEqual(['R_NEW'])
  })

  it('a programme with no leads yet shows NO current replies — a real answer, not a gap', async () => {
    houseProgramme()
    historicalLead('L_OLD'); reply('R_OLD', 'L_OLD')
    expect(await railReplies(HOUSE)).toEqual([])
  })

  it('🛑 A LEGACY CLIENT WITH NO PROGRAMME KEEPS EVERY REPLY — nothing was taken away', async () => {
    // The $299 pack clients are what is actually selling. They have no programme, and their
    // replies are their current activity.
    historicalLead('L1'); reply('R1', 'L1')
    historicalLead('L2'); reply('R2', 'L2')
    expect((await railReplies(HOUSE)).sort()).toEqual(['R1', 'R2'])
  })

  it('an unreadable programme state falls back to the legacy list rather than blanking the rail', async () => {
    // ⚠️ FAIL-SOFT ON A DISPLAY RAIL, DELIBERATELY. Everywhere this repo gates money or
    // sending, unreadable refuses. Blanking a client's replies over a transient read error is
    // a worse lie than showing them.
    historicalLead('L1'); reply('R1', 'L1')
    state.programmesUnreadable = true
    expect(await railReplies(HOUSE)).toEqual(['R1'])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ THE SURFACE ITSELF
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ Milla Home no longer claims a programme that does not exist', () => {
  const page = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
  const visible = page.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('🛑 the panel branches on hasProgramme, NOT on the stage', () => {
    expect(visible).toContain("prog.hasProgramme !== false ?")
    expect(visible, 'the stage can no longer decide this').not.toContain("prog.stage !== 'Proof' ?")
  })

  it('🛑 the heading does not say "Your programme" to a client with no programme', () => {
    expect(visible).toContain("prog?.hasProgramme === false ? 'Your workspace' : 'Your programme'")
  })

  it('🛑 the pre-programme set is LABELLED as earlier activity, and nothing is hidden', () => {
    // Founder-locked wording, 3 Sep — pinned verbatim so it cannot drift back into a claim.
    expect(visible).toContain('Earlier activity')
    expect(visible).toContain('You don’t have an active programme yet. These are examples you’ve previously reviewed to help Milla learn what fits.')
    // The cards themselves still render — the founder ruled that data is preserved, and the
    // free-proof calibration set legitimately lives on this screen.
    expect(visible).toContain('/leads/for-approval')
  })

  it('the programme review still renders at the Approval stage, unchanged', () => {
    expect(visible).toContain("prog.stage === 'Approval' && (")
    expect(visible).toContain('<ProgrammeReview token={token} />')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ WHAT WAS DELIBERATELY NOT CHANGED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ history is preserved, and the all-time surfaces still read it', () => {
  it('🛑 no backfill and no delete — `programme_id` is never written to a historical lead', () => {
    const api = join(__dirname, '..')
    for (const f of ['lib/customer-programme.ts', 'lib/milla-summary.ts']) {
      const src = readFileSync(join(api, f), 'utf8')
      expect(src, `${f} must not write leads`).not.toMatch(/from\('leads'\)[\s\S]{0,80}\.(update|insert|delete)\(/)
      expect(src, `${f} must not write replies`).not.toMatch(/from\('figsy_replies'\)[\s\S]{0,80}\.(update|insert|delete)\(/)
    }
  })

  it('the ALL-TIME report totals stay client-scoped — history still counts where it belongs', () => {
    // `replies_total`, `approved_total` and the all-time meeting count answer "everything this
    // client has ever done", which is a different and legitimate question from "what is this
    // programme doing". Narrowing those would be deleting history from the reports.
    const src = readFileSync(join(__dirname, 'milla-summary.ts'), 'utf8')
    expect(src).toContain("db.from('figsy_replies').select('id', { count: 'exact', head: true }).eq('client_id', clientId)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ CAMPAIGN STATUS — THE LAST SURFACE OF THE SAME CLASS
//
// 🛑 WHY THIS ONE IS THE SHARPEST. Milla renders `campaign_status` as a SENTENCE, not a number:
// **"Programme live"**, **"Paused — we'll tell you why"**, **"Programme finished"**. The read was
// `client_id` + newest row + ANY state, and `figsy_campaigns` has no `programme_id` column — so
// a client whose only campaign is a retired legacy row would have been told their programme was
// live, on the strength of a campaign the programme never created.
//
// ⚠️ ATTRIBUTION IS DERIVED, NOT ADDED. A campaign belongs to a programme when its ICP does.
// `attachIcpToProgramme` is the only writer of `icps.programme_id` and REFUSES an ICP that
// already carries a campaign — so an attached ICP's campaign was provably created for that
// programme. No column, no migration, no backfill.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ a historical campaign is never presented as current programme truth', () => {
  async function campaignStatus(clientId: string) {
    const { buildMillaSummaryData } = await import('./milla-summary')
    return (await buildMillaSummaryData(clientId)).campaign_status
  }
  const legacyCampaign = (id: string, status: string, clientId = HOUSE) =>
    state.campaigns.push({ id, client_id: clientId, icp_id: `ICP_OLD_${id}`, name: id, status, created_at: '2025-01-01' })
  const programmeCampaign = (id: string, status: string, icpId = 'ICP_NEW') =>
    state.campaigns.push({ id, client_id: HOUSE, icp_id: icpId, name: id, status, created_at: '2026-09-01' })
  const attachedIcp = (id = 'ICP_NEW', programmeId = P_NEW, clientId = HOUSE) =>
    state.icps.push({ id, client_id: clientId, programme_id: programmeId })

  it('🛑 NO PROGRAMME + a historical campaign → legacy truth is returned, and the WIDGET refuses to read it', async () => {
    // The summary still answers honestly for a legacy client — their campaign is their
    // campaign, and the $299 pack clients must keep it. What changed is that Milla will not
    // render it as programme status: the widget is gated on the outreach stages AND on
    // `hasProgramme`, both proved below against the real source.
    legacyCampaign('C_OLD', 'paused')
    expect(await campaignStatus(HOUSE), 'legacy is untouched').toBe('paused')

    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    const visible = page.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(visible, 'no programme ⇒ no programme status').toContain('if (prog.hasProgramme === false) return idle')
  })

  it('🛑 DRAFT P_NEW + a historical campaign → the historical campaign is EXCLUDED', async () => {
    houseProgramme({ status: 'DRAFT' })
    legacyCampaign('C_OLD', 'active')          // the retired desk's campaign
    // No ICP is attached to the DRAFT programme yet, so no programme campaign can exist.
    expect(await campaignStatus(HOUSE), 'show none rather than infer one').toBeNull()
    expect(state.campaigns, 'and the historical row is preserved').toHaveLength(1)
  })

  it('🛑 an OPEN programme with an attached ICP but no campaign yet → still null, never the legacy row', async () => {
    houseProgramme()
    attachedIcp()
    legacyCampaign('C_OLD', 'active')
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('the programme\'s OWN campaign is reported, once it exists', async () => {
    houseProgramme()
    attachedIcp()
    legacyCampaign('C_OLD', 'paused')
    programmeCampaign('C_NEW', 'active')
    expect(await campaignStatus(HOUSE)).toBe('active')
  })

  it('🛑 a campaign on an ICP attached to ANOTHER programme is excluded', async () => {
    houseProgramme()
    attachedIcp('ICP_NEW', P_NEW)
    attachedIcp('ICP_WRONG', 'P_SOMETHING_ELSE')
    programmeCampaign('C_WRONG', 'active', 'ICP_WRONG')
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('🛑 MBF\'s campaign is excluded, even on an ICP naming this programme', async () => {
    houseProgramme()
    state.icps.push({ id: 'ICP_MBF', client_id: MBF, programme_id: P_NEW })
    state.campaigns.push({ id: 'C_MBF', client_id: MBF, icp_id: 'ICP_MBF', name: 'C_MBF', status: 'active', created_at: '2026-09-01' })
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('🛑 TENANCY IS RE-APPLIED ON THE CAMPAIGN ROW, not inherited from the ICP list', async () => {
    // ⚠️ DEFENCE IN DEPTH, AND A RED PROOF IS WHAT REVEALED IT WAS UNTESTED. The ICP ids are
    // already client-scoped, so dropping the campaign query's own `client_id` filter changed
    // nothing in an honest fixture and the mutation stayed green. A corrupt row tells them
    // apart: a campaign on House's attached ICP that carries MBF's client_id is a broken link,
    // and it must not become either tenant's "Programme live".
    houseProgramme()
    attachedIcp()
    state.campaigns.push({ id: 'C_CORRUPT', client_id: MBF, icp_id: 'ICP_NEW', name: 'C_CORRUPT', status: 'active', created_at: '2026-09-02' })
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('🛑 TENANCY IS APPLIED ON THE ICP LOOKUP TOO — a foreign ICP cannot widen the campaign set', async () => {
    // The mirror of the above: House's own campaign hanging off ANOTHER tenant's ICP. If the
    // ICP lookup dropped `client_id`, that foreign ICP would enter the id list and carry this
    // campaign in with it.
    houseProgramme()
    state.icps.push({ id: 'ICP_FOREIGN', client_id: MBF, programme_id: P_NEW })
    state.campaigns.push({ id: 'C_VIA_FOREIGN', client_id: HOUSE, icp_id: 'ICP_FOREIGN', name: 'C_VIA_FOREIGN', status: 'active', created_at: '2026-09-02' })
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('🛑 an unreadable programme state returns NULL — it never guesses "Programme live"', async () => {
    // ⚠️ FAIL-CLOSED HERE, UNLIKE THE REPLIES RAIL. A missing reply is a quiet rail; a wrong
    // campaign status is a sentence asserting that outreach is running.
    legacyCampaign('C_OLD', 'active')
    state.programmesUnreadable = true
    expect(await campaignStatus(HOUSE)).toBeNull()
  })

  it('🛑 the widget cannot assert a campaign-derived label while the programme is UNKNOWN', () => {
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    const visible = page.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    // The old guard was `prog && !OUTREACH_STAGES...`, which SKIPPED itself when `prog` was
    // null — asserting most at the moment it knew least.
    expect(visible).toContain('if (!prog || !OUTREACH_STAGES.includes(prog.stage)) return idle')
    expect(visible).not.toContain('if (prog && !OUTREACH_STAGES.includes(prog.stage)) return idle')
  })

  it('history is preserved across all of it — leads, replies, meetings, campaigns', async () => {
    houseProgramme()
    historicalLead('L_OLD'); reply('R_OLD', 'L_OLD'); meeting('M_OLD', null); legacyCampaign('C_OLD', 'active')
    await campaignStatus(HOUSE)
    expect(state.leads).toHaveLength(1)
    expect(state.replies).toHaveLength(1)
    expect(state.meetings).toHaveLength(1)
    expect(state.campaigns).toHaveLength(1)
    expect(state.leads[0].programme_id, 'no backfill').toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ HOUSE IS AUTHORISED, NOT PAID — AND THE WORKSPACE NOW SAYS SO
//
// 🛑 THE FOUNDER'S STANDING RULE: House must NEVER create a fake Stripe payment, invoice,
// customer revenue or paid label. It runs on internal P1/P2 authority.
//
// ⚠️ WHAT THE WORKSPACE ACTUALLY DID — and it was neither of the two things a reviewer might
// assume. It did NOT show House as paid: `first_paid_at` is null, so it rendered "First 50%
// NOT YET PAID". That is not a fake payment, and it is not the truth either — it states that
// money is outstanding when nothing is owed, for the life of the programme. The `money` object
// simply had no way to express "authorised without payment".
//
// The two columns already existed (A2) and the authority helpers already read them; the
// customer read never selected them.
//
// 🛑 A PAYING CLIENT IS BYTE-FOR-BYTE UNCHANGED. `firstPaidAt` wins wherever it is set, and no
// paying client's row ever carries an internal authorisation.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ internal authority is reported as authority, never as payment', () => {
  it('🛑 HOUSE AFTER INTERNAL P1 — no payment language, and no false "not yet paid" either', async () => {
    houseProgramme({ status: 'SOURCING', first_paid_at: null, first_authorised_at: 'a1' })
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.firstPaidAt, 'House never has a payment').toBeNull()
    expect(p!.money.firstAuthorisedAt, 'it has internal authority instead').toBe('a1')
    expect(p!.money.secondAuthorisedAt).toBeNull()
  })

  it('🛑 HOUSE AFTER INTERNAL P2 — both halves authorised, neither paid', async () => {
    houseProgramme({ status: 'APPROVED', first_paid_at: null, first_authorised_at: 'a1', second_authorised_at: 'a2' })
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.firstPaidAt).toBeNull()
    expect(p!.money.secondPaidAt).toBeNull()
    expect(p!.money.firstAuthorisedAt).toBe('a1')
    expect(p!.money.secondAuthorisedAt).toBe('a2')
  })

  it('a PAYING client carries payments and no internal authority — the fields cannot collide', async () => {
    houseProgramme({ first_paid_at: 'p1', first_authorised_at: null })
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.firstPaidAt).toBe('p1')
    expect(p!.money.firstAuthorisedAt).toBeNull()
  })

  it('🛑 the workspace renders AUTHORITY for House and PAYMENT for a paying client', () => {
    const ws = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeWorkspace.tsx'), 'utf8')
    const visible = jsxCode(ws)
    // Paid wins first, always — so a paying client's copy is untouched.
    expect(visible).toContain("{p.money.firstPaidAt ? 'First 50% paid'")
    expect(visible).toContain("p.money.firstAuthorisedAt ? 'First 50% authorised internally'")
    expect(visible).toContain("p.money.secondAuthorisedAt ? 'Second 50% authorised internally'")
    // An internally-authorised programme owes no money, so its outstanding half awaits
    // AUTHORISATION, not payment.
    expect(visible).toContain(": internallyAuthorised ? 'Second 50% not yet authorised'")
    // ⛓️ AND THE PRE-P1 BRANCH, which is the half the previous round missed.
    expect(visible).toContain(": internallyAuthorised ? 'First 50% not yet authorised'")
    // 🛑 THE DERIVATION, PINNED — this is what stops the `render()` helper in ⑧ from drifting
    // away from the component and proving nothing. Every branch that helper models is asserted
    // to exist in the real source, in the same order.
    expect(visible).toContain("p.money.internalBilling === true || (!p.money.firstPaidAt && !!p.money.firstAuthorisedAt)")
    // And the footnote's noun follows what actually happened.
    expect(visible).toContain("'The first authorisation covers sourcing and preparation. Outreach has not started.'")
    expect(visible).toContain("'The first payment authorises sourcing and preparation. Outreach has not started.'")
  })

  it('🛑 THE FOUNDER-LOCKED SENDING COPY, PINNED — customer-facing only', () => {
    // Locked 3 Sep: "Nothing sending yet" → "Outreach hasn't started". A RED proof found this
    // unguarded: reverting the string changed nothing, because nothing asserted it.
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')
    const visible = jsxCode(page)
    expect(visible).toContain("label: 'Outreach hasn\u2019t started'")
    expect(visible, 'the old customer-facing wording is back').not.toContain("label: 'Nothing sending yet'")
    // ⚠️ VIDA IS UNTOUCHED, and that is asserted rather than assumed — the founder scoped this
    // change to the customer surface alone.
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(vida, 'operator terminology must not have been rewritten').not.toContain('Outreach hasn\u2019t started')
  })

  it('🛑 NO FAKE PAYMENT VOCABULARY ANYWHERE IN THE CUSTOMER WORKSPACE', () => {
    const ws = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeWorkspace.tsx'), 'utf8')
    const visible = jsxCode(ws)
    for (const banned of ['Payment received', 'payment received', 'Invoice paid', 'invoice paid', 'Stripe', 'Charged', 'Receipt']) {
      expect(visible, `"${banned}" must not appear`).not.toContain(banned)
    }
  })

  it('the customer read actually SELECTS the authority columns — the fields are not always null', () => {
    // ⚠️ A COLUMN THAT IS NEVER SELECTED READS AS NULL FOREVER, and every assertion above would
    // pass vacuously against a fixture that supplies it directly. Pinned to the query.
    const src = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')
    expect(src).toContain("'first_paid_at, second_paid_at, first_authorised_at, second_authorised_at, '")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ HOUSE OWES NOTHING AT ANY POINT — INCLUDING BEFORE INTERNAL P1
//
// ⛓️ THE ROUND THAT PRECEDED THIS ONE FIXED HALF OF IT. Deriving "internal" from
// `firstAuthorisedAt` covered House AFTER internal P1 and left it saying **"First 50% not yet
// paid"** before — a debt to itself that does not exist. The programme row cannot answer the
// question: paid-or-authorised is an operator act taken LATER, so a paying client's DRAFT row
// is byte-identical to House's.
//
// 🛑 THE IDENTITY IS REUSED, NOT INVENTED. `HOUSE_ACCOUNT_EMAIL` already IS the house
// discriminator here — `computeExcludedClientIds` uses it to keep Client Zero out of every
// revenue figure. "House is never revenue" and "House owes no payment" are one fact. And it is
// the identity the founder settled after #584/#582: **the auth user, never the name.**
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ the four money states', () => {
  const houseUser = () => { HOUSE_USER_EMAIL = 'hello@get-kind.com' }
  /** What the workspace would render, evaluated from the SAME expressions the component uses. */
  function render(m: {
    firstPaidAt: string | null; secondPaidAt: string | null
    firstAuthorisedAt: string | null; secondAuthorisedAt: string | null; internalBilling: boolean
  }) {
    const internal = m.internalBilling === true || (!m.firstPaidAt && !!m.firstAuthorisedAt)
    const first = m.firstPaidAt ? 'First 50% paid'
      : m.firstAuthorisedAt ? 'First 50% authorised internally'
      : internal ? 'First 50% not yet authorised'
      : 'First 50% not yet paid'
    const second = m.secondPaidAt ? 'Second 50% paid'
      : m.secondAuthorisedAt ? 'Second 50% authorised internally'
      : internal ? 'Second 50% not yet authorised'
      : 'Second 50% not yet paid'
    return `${first} · ${second}`
  }

  it('🛑 ① HOUSE DRAFT, BEFORE P1 — neither half mentions payment', async () => {
    houseUser()
    houseProgramme({ status: 'DRAFT', first_paid_at: null, first_authorised_at: null })
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.internalBilling, 'the house account is recognised').toBe(true)
    expect(render(p!.money)).toBe('First 50% not yet authorised · Second 50% not yet authorised')
  })

  it('🛑 ② HOUSE AFTER INTERNAL P1', async () => {
    houseUser()
    houseProgramme({ status: 'SOURCING', first_paid_at: null, first_authorised_at: 'a1' })
    const p = await readCustomerProgramme(HOUSE)
    expect(render(p!.money)).toBe('First 50% authorised internally · Second 50% not yet authorised')
  })

  it('🛑 ③ HOUSE AFTER INTERNAL P2 — both authorised, neither paid', async () => {
    houseUser()
    houseProgramme({ status: 'APPROVED', first_paid_at: null, first_authorised_at: 'a1', second_authorised_at: 'a2' })
    const p = await readCustomerProgramme(HOUSE)
    expect(render(p!.money)).toBe('First 50% authorised internally · Second 50% authorised internally')
  })

  it('🛑 ④ A PAYING CLIENT IS UNCHANGED — before and after each payment', async () => {
    // Not the house auth user, so `internalBilling` is false and every branch falls through to
    // the wording this client has always seen.
    houseProgramme({ status: 'DRAFT', first_paid_at: null, first_authorised_at: null })
    let p = await readCustomerProgramme(HOUSE)
    expect(p!.money.internalBilling).toBe(false)
    expect(render(p!.money)).toBe('First 50% not yet paid · Second 50% not yet paid')

    state.programmes = []
    houseProgramme({ status: 'SOURCING', first_paid_at: 'p1' })
    p = await readCustomerProgramme(HOUSE)
    expect(render(p!.money)).toBe('First 50% paid · Second 50% not yet paid')

    state.programmes = []
    houseProgramme({ status: 'LIVE', first_paid_at: 'p1', second_paid_at: 'p2' })
    p = await readCustomerProgramme(HOUSE)
    expect(render(p!.money)).toBe('First 50% paid · Second 50% paid')
  })

  it('🛑 HOUSE NEVER SHOWS PAYMENT VOCABULARY IN ANY OF ITS FOUR STATES', async () => {
    houseUser()
    for (const over of [
      { first_paid_at: null, first_authorised_at: null },
      { first_paid_at: null, first_authorised_at: 'a1' },
      { first_paid_at: null, first_authorised_at: 'a1', second_authorised_at: 'a2' },
    ]) {
      state.programmes = []
      houseProgramme(over)
      const p = await readCustomerProgramme(HOUSE)
      const line = render(p!.money)
      for (const banned of ['paid', 'payment']) {
        expect(line.toLowerCase(), `House must never read "${banned}": ${line}`).not.toContain(banned)
      }
    }
  })

  it('🛑 NO FAKE PAYMENT FIELD IS EVER WRITTEN — the reader writes nothing at all', async () => {
    houseUser()
    houseProgramme({ first_paid_at: null, first_authorised_at: 'a1' })
    await readCustomerProgramme(HOUSE)
    const row = state.programmes[0]
    expect(row.first_paid_at, 'no payment invented').toBeNull()
    expect(row.second_paid_at).toBeNull()
    expect(row.first_payment_ref ?? null).toBeNull()
    expect(row.second_payment_ref ?? null).toBeNull()
    const src = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')
    expect(src, 'the customer read model must perform no writes').not.toMatch(/\.(update|insert|upsert|delete)\(/)
  })

  it('🛑 THE IDENTITY IS THE AUTH USER — never the company name, never HOUSE_CLIENT_ID', () => {
    const src = readFileSync(join(__dirname, 'house-client.ts'), 'utf8')
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    const fn = code.slice(code.indexOf('export async function isHouseClient'))
    expect(fn).toContain('getUserById')
    expect(fn).toContain('HOUSE_ACCOUNT_EMAIL')
    // #593: identity is the auth user. #584/#582 were both caused by matching on a name.
    expect(fn, 'must not match on a company name').not.toContain('company_name')
    expect(fn, 'must not match on the display label').not.toContain('HOUSE_CLIENT_NAME')
    // HOUSE_CLIENT_ID stays unset and gates the parked Instantly push — nothing here reads it.
    expect(fn, 'must not read HOUSE_CLIENT_ID').not.toContain('HOUSE_CLIENT_ID')
    expect(fn, 'must not introduce an env flag').not.toContain('process.env')
  })

  it('🛑 the house check\'s CATCH path also fails to false — a thrown read is not "this is House"', async () => {
    // ⚠️ A RED PROOF FOUND THIS UNTESTED. The other fail-open case returns early on a missing
    // row and never reaches the catch, so flipping the catch\'s return changed nothing. This
    // makes the read THROW, which is the only way in.
    houseProgramme({ first_paid_at: null, first_authorised_at: null })
    state.clientsThrow = true
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.internalBilling, 'a thrown lookup must never assert House').toBe(false)
    expect(render(p!.money)).toBe('First 50% not yet paid · Second 50% not yet paid')
  })

  it('the house check FAILS OPEN to false — a wrong true would misstate a paying client\'s money', async () => {
    houseProgramme({ first_paid_at: null, first_authorised_at: null })
    state.clients.length = 0            // no client row ⇒ the lookup cannot resolve
    const p = await readCustomerProgramme(HOUSE)
    expect(p!.money.internalBilling).toBe(false)
    expect(render(p!.money)).toBe('First 50% not yet paid · Second 50% not yet paid')
  })
})
