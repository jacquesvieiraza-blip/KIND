import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── NO COMPLIANCE CLAIM MAY BE DERIVED FROM `apollo_consented` (#677, 20 Aug) ──────────────
//
// The portal rendered a green **"✓ GDPR"** chip on every lead whose `apollo_consented` was
// true, under a comment reading *"Apollo consented = already opted in"*.
//
// **Nobody opted in.** `apollo_consented` means a provider marked the email VERIFIED — and via
// `routes/icps.ts` it is also set for Apollo's `likely_to_engage`, which is a PREDICTION that
// an address will engage, not a check that it exists. On that basis the product told a paying
// client, per lead, that a third party was GDPR-cleared. They could reasonably have repeated
// that to their own customers.
//
// The founder ruled on 20 Aug: **delete it, do not reword it.** A lead's data-protection
// position is not something a two-word chip can carry.
//
// ⚠️ WHY THIS GUARD READS STRIPPED SOURCE. The fix leaves a tombstone comment that quotes the
// badge it removed — including the words "GDPR" and "apollo_consented" — because the chain rule
// requires a correction to carry what it replaced. A whole-file `not.toContain('GDPR')` would
// therefore **go red on the fix itself**. That exact confusion (a guard that cannot tell a
// quotation from a claim) has now cost four separate red-proof rounds on this repo, so this one
// blanks comments and string bodies before it looks at anything.

const PORTAL_LEADS = join(__dirname, '../../../portal/src/app/(dashboard)/dashboard/leads/page.tsx')
const raw = readFileSync(PORTAL_LEADS, 'utf8')

/** Blank comments and string CONTENTS, preserving length so indices stay meaningful. */
function codeOnly(src: string): string {
  const out = src.split('')
  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '
  }
  let i = 0
  while (i < src.length) {
    const two = src.slice(i, i + 2)
    if (two === '//') { const e = src.indexOf('\n', i); const stop = e === -1 ? src.length : e; blank(i, stop); i = stop; continue }
    if (two === '/*') { const e = src.indexOf('*/', i + 2); const stop = e === -1 ? src.length : e + 2; blank(i, stop); i = stop; continue }
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++ }
      blank(i + 1, j); i = j + 1; continue
    }
    i++
  }
  return out.join('')
}

const code = codeOnly(raw)

describe('the stripper works — or every assertion below is vacuous', () => {
  it('blanks the tombstone comment but keeps the code around it', () => {
    // Without this, a broken stripper returns the raw file, the tombstone's quoted "GDPR"
    // trips the guard, and somebody "fixes" it by deleting the record of what happened.
    expect(code.length, 'length preserved').toBe(raw.length)
    expect(raw, 'the tombstone really does quote the deleted badge').toContain('THE "✓ GDPR" BADGE WAS DELETED')
    expect(code, 'and it is gone from the stripped copy').not.toContain('BADGE WAS DELETED')
    expect(code, 'while real code survives').toContain('function BuyingSignals')
  })
})

describe('#677 — no per-lead compliance claim is derived from apollo_consented', () => {
  it('BuyingSignals does not read apollo_consented at all', () => {
    // The badge lived here. Reading the flag in this function is how the claim gets rebuilt,
    // whatever it ends up being labelled — so the guard is on the DATA, not on the word.
    const start = code.indexOf('function BuyingSignals')
    expect(start, 'the function must exist — if it was renamed, re-point this guard').toBeGreaterThan(-1)
    // ⚠️ THE BODY BRACE, NOT THE FIRST BRACE — `({ lead }: { lead: Lead })` is a destructured
    // parameter, so matching from the first `{` returns the 9-character string `{ lead }`.
    // This test PASSED that way (nothing named apollo_consented in `{ lead }`), which is
    // vacuous, and the sibling guard below only caught it because it asserts a chip COUNT.
    const bodyBrace = code.indexOf('{', code.indexOf(') {', start))
    let depth = 0, end = -1
    for (let i = bodyBrace; i < code.length; i++) {
      if (code[i] === '{') depth++
      else if (code[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    expect(end, 'the function body must close, or this guard has gone blind').toBeGreaterThan(bodyBrace)
    expect(end - bodyBrace, 'and it must be a real body, not a destructured parameter').toBeGreaterThan(200)

    expect(
      code.slice(bodyBrace, end),
      'BuyingSignals reads apollo_consented again — a verified email is not a legal position, ' +
      'and #677 is the badge that told a client it was',
    ).not.toContain('apollo_consented')
  })

  it('and no PER-LEAD signal chip claims a compliance status, whatever it is labelled', () => {
    // Belt to the brace above: the test before it guards the DATA (BuyingSignals must not read
    // the flag); this guards the WORDS in the same function, so a claim cannot be rebuilt from
    // some other field — `status`, a score, anything.
    //
    // ⚠️ SCOPED TO BuyingSignals ON PURPOSE, AND THE FIRST VERSION WAS NOT. It scanned every
    // label on the page and went red on **"POPIA Consented"** — the stat card that counts
    // `status = 'consent_given'`, a REAL consent record, and which the last describe block in
    // this file insists must survive. Two of my own guards contradicted each other, and the
    // broad one was wrong: the rule is not "the page may never say POPIA", it is "no PER-LEAD
    // compliance claim may be made from a flag that cannot support one".
    //
    // ⚠️ THE FIRST VERSION OF THIS ASSERTION WENT RED ON THE FIX ITSELF, for the fourth time
    // on this repo. It matched `label: '…'` in the RAW file, and the tombstone comment quotes
    // the deleted badge as `signals.push({ label: 'GDPR' })` — so the guard read the record of
    // the removal as evidence the badge was still there.
    //
    // The stripped copy cannot be searched for label TEXT either, because it blanks string
    // bodies. So this uses both: find each `label:` in the CODE (comments already gone), then
    // read that same offset out of the RAW file — which works because `codeOnly` preserves
    // length. Code decides WHERE to look; the original supplies WHAT is written there.
    // ⚠️ START AT THE BODY BRACE, NOT THE FIRST BRACE. `function BuyingSignals({ lead }: …)`
    // opens with a DESTRUCTURED PARAMETER, so matching from the first `{` closes on `{ lead }`
    // and yields an empty body — which this guard's own "if 0, it is blind" assertion caught
    // rather than passing vacuously. That check is the only reason the bug surfaced.
    const fnStart = code.indexOf('function BuyingSignals')
    const bodyBrace = code.indexOf('{', code.indexOf(') {', fnStart))
    let depth = 0, fnEnd = -1
    for (let i = bodyBrace; i < code.length; i++) {
      if (code[i] === '{') depth++
      else if (code[i] === '}') { depth--; if (depth === 0) { fnEnd = i; break } }
    }
    expect(fnEnd, 'BuyingSignals must be locatable, or this guard is blind').toBeGreaterThan(fnStart)

    const positions: number[] = []
    const re = /label:\s*'/g
    let m: RegExpExecArray | null
    while ((m = re.exec(code)) !== null) {
      if (m.index > fnStart && m.index < fnEnd) positions.push(m.index + m[0].length)
    }

    expect(positions.length, 'BuyingSignals really does define chips — if 0, this guard is blind').toBeGreaterThan(1)
    for (const start of positions) {
      const end = raw.indexOf("'", start)
      const label = raw.slice(start, end)
      expect(label, `a chip still claims a compliance status: "${label}"`).not.toMatch(/GDPR|POPIA/i)
    }
  })
})

describe('⚠️ THE HONEST COMPLIANCE SURFACES SURVIVE — this removed one false claim, not the language', () => {
  // The #617 lesson. Without these, somebody could "pass" #677 by stripping every mention of
  // data protection from the product, and the guard above would applaud.
  it('the POPIA Consented stat is still shown — it counts a REAL consent record', () => {
    // `routes/leads.ts` computes it as `status = 'consent_given'`, which is the evidence a
    // regulator would be shown. That number was never the problem.
    expect(raw).toContain('POPIA Consented')
    expect(raw).toContain('stats?.consented')
    //
    // ⚠️ ASSERTED ON THE STATS BLOCK, AND THE LIMIT IS STATED. The count is bound to its query
    // by DESTRUCTURING ORDER (`const [total, scored, consented, …]` over an array of queries),
    // which no string match can follow. My first attempt used a proximity regex between the
    // word and the query and went red because they sit further apart than I had assumed —
    // guessing at a layout I had not read. So this asserts the honest, checkable thing: the
    // stats block still counts `consent_given`, and does not count the flag on its own.
    const api = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const statsBlock = api.slice(api.indexOf('const [total, scored, consented'), api.indexOf('const { data: avgData }'))
    expect(statsBlock.length, 'the stats block must be found, or this guard is blind').toBeGreaterThan(200)
    expect(statsBlock, 'a real consent record is still what "Consented" counts')
      .toContain("eq('status', 'consent_given')")
  })

  it('the page still states the real legal basis, in plain words', () => {
    expect(raw).toContain('legitimate interest')
  })

  it('the "✓ Apollo" badge stays — it is true and claims nothing about permission', () => {
    // Deleting this too would be over-correction: it says where the lead came from, which is
    // a fact, and makes no assertion about consent.
    expect(raw).toContain('function ApolloBadge')
    expect(raw).toContain('✓ Apollo')
  })
})
