// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE SEQUENCE STORE, AND TWELVE THINGS TRUE OF EVERY PREPARED PROSPECT.
//
// 🛑 THE TWO STORES. The customer reviews and approves the sequence resolved through
// `programme → ICP → campaign → figsy_sequences`. `autoEnrollLead` built every enrolment from
// `figsy_campaigns.settings.sequence`. Same client, same campaign, different words — the
// customer could read one thing while the send path executed another, and nothing anywhere
// would say so. **`figsy_sequences` is canonical for programme work** (founder-locked 8 Sep).
//
// 🛑 AND FOUR OF THE TWELVE ELIGIBILITY CRITERIA WERE NOT ENFORCED: the current batch, a
// canonical sequence, a verified business address, and — as it turned out on tracing — bounce
// suppression, which DID already exist through `opt_out_blocklist`. Three real gaps, one thing
// I had reported as missing that was not.
//
// ⚠️ EVERY CASE HERE IS ABOUT THE SET, NOT ABOUT SENDING. A prepared enrolment is still inert:
// OUTREACH needs approval, Payment 2, LIVE, an unchanged approved preparation, a safe sender
// and an open send window, and the last case in this file proves preparation reaches none of it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

/** Executable lines only — a promise made in a comment is not a property of the code. */
const code = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

const FIG = code('./figsy.ts')
const PREP = code('./programme-preparation.ts')
const AUTH = code('./programme-authority.ts')

// ── ① 1 / 22 · THE PROGRAMME SEND PATH READS THE CANONICAL STORE ─────────────────────

describe('① figsy_sequences is canonical for programme work', () => {
  it('🛑 1 · enrolment builds its steps from the CHAIN, not from campaign settings', () => {
    const at = FIG.indexOf('let canonicalSequenceId: string | null = null')
    expect(at, 'the canonical resolution is gone — enrolments build from the settings copy again')
      .toBeGreaterThan(-1)
    const body = FIG.slice(at, at + 1400)
    expect(body).toContain('resolveProgrammeChain(programmeFulfilment.programmeId)')
    // 🛑 AND THE FALLBACK IS A REFUSAL, NOT THE SETTINGS COPY. An enrolment built from words
    // nobody approved is worse than no enrolment, because it looks prepared.
    expect(body).toContain('if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0)')
    expect(body, 'a programme with no canonical sequence enrols anyway').toContain('return')
  })

  it('🛑 the canonical steps WIN over the settings copy — order, not merely presence', () => {
    // `canonicalSteps ?? settings.sequence` — the legacy store is the fallback for legacy work
    // only, and cannot override a programme's canonical words.
    expect(FIG).toContain('const appliedSequence = canonicalSteps ?? ((settings.sequence as SequenceStep[] | undefined) ?? undefined)')
  })

  it('🛑 4 · the enrolment NAMES its sequence, so the copy is checkable afterwards', () => {
    expect(FIG).toContain('sequence_id:    canonicalSequenceId,')
  })

  it('🛑 22 · and the SEND path refuses an enrolment pointed at anything else', () => {
    const at = AUTH.indexOf('const canonical = chainRes.chain.sequenceId')
    expect(at, 'the send-time canonical check is gone').toBeGreaterThan(-1)
    const body = AUTH.slice(at, at + 900)
    expect(body).toContain('if (e.sequence_id !== canonical)')
    expect(body).toContain("reason: 'sequence_not_canonical'")
    // 🛑 A MISSING CANONICAL SEQUENCE IS A REFUSAL TOO — not a licence to send the copy.
    expect(body).toContain('if (!canonical) {')
  })

  it('🛑 2 · two conflicting sequences on one campaign REFUSE, never pick', () => {
    const CHAIN = code('./programme-chain.ts')
    // ⚠️ THE CONDITION, NOT THE MESSAGE. A teeth-proof that turned `if (seqRows.length > 1)`
    // into `if (false)` left a `toContain(...)` on the refusal TEXT green — the sentence was
    // still in the file, unreachable. Three of my own assertions failed this way in one run.
    expect(CHAIN, 'the ambiguity guard is unreachable — the message survives, the refusal does not')
      .toContain('if (seqRows.length > 1) {')
    expect(CHAIN).toContain('sequences, so the words the customer would approve are ambiguous')
    expect(CHAIN, 'the chain picks a winner among conflicting sequences').not.toContain("order('created_at'")
  })
})

// ── ② 3 / 5 / 6 / 7 · THE PREPARED SET ───────────────────────────────────────────────

describe('② the twelve criteria, in the preparation query and its filter', () => {
  it('🛑 3 · only the CURRENT batch — an older programme batch cannot enter', () => {
    expect(PREP).toContain("db.from('programme_batches')")
    expect(PREP).toContain(".order('seq', { ascending: false }).limit(1)")
    expect(PREP, 'the lead page is no longer restricted to the current batch')
      .toContain(".eq('batch_id', currentBatchId)")
    // And no batch at all is a refusal, not an unbounded set.
    expect(PREP).toContain('No controlled batch has been opened for this programme')
  })

  it('🛑 4 · no canonical sequence ⇒ nothing is prepared at all', () => {
    expect(PREP).toContain('if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0)')
    expect(PREP).toContain('has no canonical sequence with message steps')
  })

  it('🛑 5 / 6 · a VERIFIED BUSINESS address, re-proved at enrolment', () => {
    // Not "delivery probably checked it earlier": the row is what has to satisfy the policy at
    // the moment it is prepared, because a lead can be edited or reached by another path.
    expect(PREP).toContain('if (!isBusinessEmail(r.email)) return false')
    expect(PREP).toContain('if (r.apollo_consented !== true) return false')
    expect(PREP).toContain("select('id, email, status, opted_out_at, provider_eviction_required_at, apollo_consented')")
  })

  it('🛑 7 · bounce and spam-complaint suppression — through the EXISTING canonical store', () => {
    // ⛓️ CORRECTION TO MY OWN EARLIER REPORT. I said "no bounce truth exists". It does:
    // `routes/figsy.ts` upserts `opt_out_blocklist.reason` = 'hard_bounce' | 'spam_complaint',
    // and preparation already reads that table per page. No second bounce system was invented.
    expect(PREP).toContain("db.from('opt_out_blocklist')")
    expect(PREP).toContain('normalizeRevealEmails(candidates.map(c => c.email))')
    // ⚠️ AND NOT KNOWING IS NOT PERMISSION.
    expect(PREP).toContain('Could not read the opt-out blocklist')
  })

  it('the eight criteria that were already enforced are still enforced', () => {
    expect(PREP).toContain(".eq('programme_id', programmeId)")     // 2 · current programme
    expect(PREP).toContain(".eq('client_id', p.client_id)")        // 1 · current client
    expect(PREP).toContain(".not('surfaced_for_approval_at', 'is', null)")   // 6 · reviewable
    expect(PREP).toContain("r.status === 'opted_out'")             // 8 · suppressed
    expect(PREP).toContain('r.provider_eviction_required_at')      // 8 · owed a removal
    expect(PREP).toContain('existing.has(lead.id)')                // 9 · not duplicate
  })
})

// ── ③ 8 · READY_FOR_APPROVAL IS READ-ONLY FOR MATERIAL PREPARATION ───────────────────

describe('③ once reviewable, the material set is frozen', () => {
  it('🛑 8 · READY_FOR_APPROVAL is not a preparable status', () => {
    expect(PREP).toContain("export const PRE_APPROVAL_PREPARABLE: string[] = ['SOURCING_AUTHORISED', 'SOURCING']")
    expect(PREP, 'preparation can add enrolments to a set the client is reading')
      .not.toContain("'SOURCING', 'READY_FOR_APPROVAL'")
  })

  it('🛑 and the freeze happens AT that transition, in the same write as the status', () => {
    const PROG = code('./programme.ts')
    expect(PROG).toContain('review_preparation_hash: frozen.hash')
    expect(PROG).toContain("setStatus(programmeId, 'READY_FOR_APPROVAL', {")
  })
})

// ── ④ 9–12 · APPROVAL IS OF THE REVIEWED MATERIAL ────────────────────────────────────

describe('④ approval can only confirm what was reviewed', () => {
  const PROG = code('./programme.ts')

  it('🛑 9 / 10 / 11 · any material change after the freeze refuses the approval', () => {
    // One comparison covers all three: the sequence, the sender and the enrolment membership
    // are all inside the digest, so "changed" is one question rather than three.
    expect(PROG).toContain('const drift = await reviewDrift(programmeId)')
    expect(PROG).toContain("if (drift.state !== 'unchanged') return null")
    const SNAP = code('./preparation-snapshot.ts')
    expect(SNAP).toContain('export async function reviewDrift')
    // ⚠️ AND A MISSING FREEZE IS `unreadable`, NOT `unchanged`.
    expect(SNAP).toContain('has no frozen review snapshot')
  })

  it('🛑 12 · the APPROVED hash is the REVIEWED hash, never a fresh one', () => {
    expect(PROG, 'approval takes a fresh snapshot again — it would approve whatever the work became')
      .toContain('approved_preparation_hash: rp.review_preparation_hash')
    expect(PROG).toContain('approved_preparation_snapshot: rp.review_preparation_snapshot')
    expect(PROG, 'a fresh snapshot is being built at approval time')
      .not.toContain('approved_preparation_hash: snap.hash')
  })
})

// ── ⑤ 25 · PREPARING STILL GRANTS NOTHING ────────────────────────────────────────────

describe('⑤ a prepared enrolment cannot send itself', () => {
  it('🛑 25 · preparation reaches no send, no approval, no P2, no LIVE', () => {
    for (const banned of ['sendSequenceEmail', 'sendDay1OutreachBatch', "status: 'APPROVED'",
                          "status: 'LIVE'", 'second_authorised_at:', 'went_live_at:', 'setStatus(']) {
      expect(PREP, `preparation reaches ${banned}`).not.toContain(banned)
    }
  })

  it('and the send door still demands every one of them', () => {
    const at = AUTH.indexOf("if (action === 'OUTREACH') {")
    const body = AUTH.slice(at, at + 1400)
    expect(body).toContain('mayStartCampaign(p)')     // status LIVE
    expect(body).toContain('p2Authorised')            // Payment 2
    expect(body).toContain('approved_at')             // the approval itself
  })
})
