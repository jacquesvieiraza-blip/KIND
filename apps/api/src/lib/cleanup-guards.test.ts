// #611 Phase B — the guards, and the four red proofs the prompt asked for.
//
// Two of these tests are proofs about the OLD source rather than the new one (the chip and the
// denominator live in `engine-panel.test.ts`). The two here are behaviour: the confirm-phrase
// gate, and the house-refusal on the wipe — pointed at the house id, shown to fire.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  ZERO_WALLET_CONFIRMATION, HOUSE_HUNTING_BUDGET_USD, HOUSE_GRANT_NOTE_TAG,
  zeroWalletCheck, wipeClientCheck, houseGrantNote, priorHouseGrant,
} from './cleanup-guards'
import { classify, type SeedCandidate } from './seed-wipe'
import { stripCommentsForEnvScan } from './env-inventory'

const HOUSE = 'house-client-id'
const cand = (over: Partial<SeedCandidate> & { id: string }): SeedCandidate => ({
  company_name: 'ACME', is_demo: false, realPayments: 0, realLeads: 0, ...over,
})

describe('zeroWalletCheck — the confirm-phrase gate', () => {
  const base = { houseClientId: HOUSE, targetClientId: HOUSE, balanceUsd: 3_999_038 }

  it('allows the zero when the phrase is typed exactly, and reports what it replaced', () => {
    const r = zeroWalletCheck({ ...base, typed: ZERO_WALLET_CONFIRMATION })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.from).toBe(3_999_038)
  })

  // ── RED PROOF ① — THE CONFIRM-PHRASE GATE ───────────────────────────────────────────────
  // Without the typed check this endpoint is "POST and the money is gone". Every one of these
  // is a plausible thing to send, and every one must refuse.
  it.each([
    ['nothing typed', undefined],
    ['empty', ''],
    ['the wrong case', 'zero the house wallet'],
    ['nearly right', 'ZERO THE HOUSE WALLETS'],
    ['a yes', 'yes'],
    ['the word confirm', 'confirm'],
  ])('REFUSES with %s', (_label, typed) => {
    const r = zeroWalletCheck({ ...base, typed: typed as string | undefined })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain(ZERO_WALLET_CONFIRMATION)
  })

  it('tolerates surrounding whitespace — a pasted phrase is still a read phrase', () => {
    expect(zeroWalletCheck({ ...base, typed: `  ${ZERO_WALLET_CONFIRMATION}\n` }).ok).toBe(true)
  })

  it('refuses any client that is not the house account, phrase or no phrase', () => {
    const r = zeroWalletCheck({ ...base, targetClientId: 'some-real-client', typed: ZERO_WALLET_CONFIRMATION })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('only ever zeroes the HOUSE account')
  })

  it('refuses when the house account has not been resolved at all', () => {
    const r = zeroWalletCheck({ ...base, houseClientId: null, typed: ZERO_WALLET_CONFIRMATION })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('could not be resolved')
  })

  it('refuses an already-zero wallet rather than logging a write that changed nothing', () => {
    const r = zeroWalletCheck({ ...base, balanceUsd: 0, typed: ZERO_WALLET_CONFIRMATION })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('already zero')
  })

  it('an unreadable balance refuses — a write that does not know what it replaces is not made', () => {
    expect(zeroWalletCheck({ ...base, balanceUsd: NaN, typed: ZERO_WALLET_CONFIRMATION }).ok).toBe(false)
  })

  it('a negative balance is still zeroable — the ledger sums to −$305, so this is reachable', () => {
    expect(zeroWalletCheck({ ...base, balanceUsd: -305, typed: ZERO_WALLET_CONFIRMATION }).ok).toBe(true)
  })

  it('the hunting budget is a constant, not caller input', () => {
    expect(HOUSE_HUNTING_BUDGET_USD).toBe(4000)
  })
})

describe('priorHouseGrant — the budget goes on ONCE', () => {
  // Fable's verify found the gap: no "already granted" check meant every later press was
  // another $4,000, on the account we had just built an endpoint to remove invented money
  // from. The guard answers from the LEDGER, the record that survives sessions.

  it('recognises the note this codebase actually writes', () => {
    // The guard and the note are built from the same tag, so they cannot drift apart — but
    // this pins the round trip in case someone edits the note wording by hand.
    const rows = [{ note: houseGrantNote('2026-08-04T19:00:00.000Z'), created_at: '2026-08-04T19:00:00.000Z' }]
    const r = priorHouseGrant(rows)
    expect(r.granted).toBe(true)
    expect(r.when).toBe('2026-08-04T19:00:00.000Z')
  })

  it('a fresh account has no prior grant', () => {
    expect(priorHouseGrant([])).toEqual({ granted: false, when: null })
  })

  it('the $100 comp grant does NOT block the hunting budget — different decisions', () => {
    // This is the note `house-client.ts` writes when it entitles Client Zero to source. If
    // this matched, the budget could never be granted at all on any adopted account.
    const rows = [{ note: '[house client comp — Client Zero, opened from Vida 2026-08-01T10:00:00.000Z]', created_at: '2026-08-01T10:00:00.000Z' }]
    expect(priorHouseGrant(rows).granted).toBe(false)
  })

  it('finds the grant among other manual_grant rows, wherever it sits', () => {
    const rows = [
      { note: '[house client comp — Client Zero, opened from Vida x]', created_at: '2026-08-01' },
      { note: null, created_at: '2026-08-02' },
      { note: houseGrantNote('2026-08-04T19:00:00.000Z'), created_at: '2026-08-04' },
    ]
    expect(priorHouseGrant(rows).granted).toBe(true)
  })

  it('a null or missing note is not a match', () => {
    expect(priorHouseGrant([{ note: null }, {}]).granted).toBe(false)
  })

  it('the note carries the tag verbatim, so `includes` survives the timestamp suffix', () => {
    expect(houseGrantNote('anything')).toContain(HOUSE_GRANT_NOTE_TAG)
  })
})

describe('the grant route wires the guard — the two lines that make it real', () => {
  // Source assertions, same pattern as inbox-rotation's: the guard existing in a lib file and
  // the route calling it are different facts, and only the second one protects anybody.
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))

  it('asks priorHouseGrant before inserting', () => {
    const guard = src.indexOf('priorHouseGrant(')
    const insert = src.indexOf('houseGrantNote(')
    expect(guard).toBeGreaterThan(-1)
    expect(insert).toBeGreaterThan(guard)
  })

  it('moves the balance with the atomic increment_wallet RPC, not read-then-write', () => {
    expect(src).toContain("db.rpc('increment_wallet', { p_client_id: houseClientId")
  })
})

describe('wipeClientCheck — the house refusal, fired at the house id', () => {
  const eligible = classify(cand({ id: 'acme', company_name: 'ACME' }), new Set<string>())

  it('allows an eligible test client when its name is typed', () => {
    expect(wipeClientCheck({
      classification: eligible, houseClientId: HOUSE, demoClientIds: ['mbf'],
      typedCompanyName: 'ACME',
    }).ok).toBe(true)
  })

  // ── RED PROOF ② — THE HOUSE REFUSAL. Point the guard AT the house id and show it fires. ──
  //
  // The dangerous case is not "somebody tries to delete Client Zero on purpose". It is that
  // the house account, at a glance, looks exactly like test residue: no payments, a fake-looking
  // wallet, a name with brackets in it. `classify` protects it by EMAIL, which needs the house
  // email to have been resolved — so this second check, on the id, is what survives a resolver
  // returning an empty set.
  it('REFUSES the house account even when classify has been fooled into calling it eligible', () => {
    // Deliberately built the wrong way round: no house email supplied, so `classify` returns
    // `eligible` for Client Zero. This is the state the id check exists for.
    const fooled = classify(cand({ id: HOUSE, company_name: 'K.I.N.D (house — Client Zero)' }), new Set<string>())
    expect(fooled.disposition).toBe('eligible')   // the classifier alone would have allowed it

    const r = wipeClientCheck({
      classification: fooled, houseClientId: HOUSE, demoClientIds: [],
      typedCompanyName: 'K.I.N.D (house — Client Zero)',   // name typed correctly, and it STILL refuses
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('house account')
  })

  it('REFUSES the demo account by id, for the same reason', () => {
    const fooled = classify(cand({ id: 'mbf', company_name: 'MBF Demo' }), new Set<string>())
    const r = wipeClientCheck({
      classification: fooled, houseClientId: HOUSE, demoClientIds: ['mbf'], typedCompanyName: 'MBF Demo',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('demo account')
  })

  it('REFUSES a client with a real payment, whatever it is called', () => {
    const paid = classify(cand({ id: 'x', company_name: 'Stripe Test', realPayments: 1 }), new Set<string>())
    const r = wipeClientCheck({ classification: paid, houseClientId: HOUSE, demoClientIds: [], typedCompanyName: 'Stripe Test' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('real payment')
  })

  it('REFUSES a client holding real leads', () => {
    const worked = classify(cand({ id: 'x', company_name: 'ACME', realLeads: 12 }), new Set<string>())
    expect(wipeClientCheck({ classification: worked, houseClientId: HOUSE, demoClientIds: [], typedCompanyName: 'ACME' }).ok).toBe(false)
  })

  it('REFUSES when no name is typed', () => {
    const r = wipeClientCheck({ classification: eligible, houseClientId: HOUSE, demoClientIds: [], typedCompanyName: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('Type the company name')
  })

  it('REFUSES a near-miss name — the account NEXT to the one you meant', () => {
    const r = wipeClientCheck({ classification: eligible, houseClientId: HOUSE, demoClientIds: [], typedCompanyName: 'ACME Ltd' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.why).toContain('near-miss')
  })

  it('accepts case and whitespace differences — the gate is "you read it", not a spelling test', () => {
    expect(wipeClientCheck({ classification: eligible, houseClientId: HOUSE, demoClientIds: [], typedCompanyName: '  acme ' }).ok).toBe(true)
  })

  it('still refuses the house id when the house was never resolved is NOT claimed — it cannot', () => {
    // Honest limit, stated as a test so nobody assumes otherwise: with `houseClientId: null`
    // the id check cannot fire, and only `classify`'s email match protects Client Zero. The
    // ROUTE therefore refuses to run at all when the house cannot be resolved.
    const fooled = classify(cand({ id: HOUSE, company_name: 'K.I.N.D (house — Client Zero)' }), new Set<string>())
    expect(wipeClientCheck({ classification: fooled, houseClientId: null, demoClientIds: [], typedCompanyName: 'K.I.N.D (house — Client Zero)' }).ok).toBe(true)
  })
})
