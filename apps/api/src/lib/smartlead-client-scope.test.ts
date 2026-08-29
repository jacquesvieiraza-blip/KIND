// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ASSUMPTION THAT MAKES `client_id: null` CORRECT — pinned, because it is invisible.
//
// Smartlead's block list is CLIENT-SCOPED. A null-scoped entry applies only to campaigns
// with NO Smartlead client assigned; it does NOT reach campaigns inside client sub-accounts.
// Suppressing across sub-accounts requires one entry per client.
//
// `addToGlobalBlockList` sends `client_id: null`, and that is the RIGHT scope today for one
// reason only: EVERY K.I.N.D CAMPAIGN IS UNASSIGNED. That is a fact about our integration,
// not about the provider, and nothing enforces it.
//
// 🛑 THE FAILURE THIS GUARD EXISTS FOR IS SILENT. The day someone assigns campaigns to
// Smartlead client sub-accounts, the block-list call keeps returning 200, every test here
// keeps passing, no error is logged anywhere — and suppressed people start receiving mail
// again from the sub-account copies. There is no symptom until a person complains.
//
// So the assumption is asserted directly. If a campaign write ever gains a client scope,
// THIS fails, and the fan-out that scope now requires has to be written with it.
//
// ⚠️ CLAIM BOUNDARY. This proves what our INTEGRATION does — CODE VERIFIED. Whether the
// live Smartlead workspace actually has zero client sub-accounts, and whether a null-scoped
// entry behaves as documented, is RUNTIME UNVERIFIED until the walkthrough.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

const SL = stripCommentsForEnvScan(readFileSync(join(__dirname, 'smartlead.ts'), 'utf8'))
const SEND = stripCommentsForEnvScan(readFileSync(join(__dirname, 'smartlead-send.ts'), 'utf8'))

/** Every Smartlead write, and the body it posts. */
function writeBodies(src: string): string[] {
  const out: string[] = []
  for (const chunk of src.split(/return write/).slice(1)) {
    out.push(chunk.slice(0, chunk.indexOf('\n}') === -1 ? 400 : Math.min(chunk.indexOf('\n}'), 400)))
  }
  return out
}

describe('the sweep is not vacuous', () => {
  it('there are Smartlead writes to inspect', () => {
    expect(writeBodies(SL).length).toBeGreaterThan(0)
  })

  it('the checker detects a client scope when one is present', () => {
    // RED proof for the predicate itself: without this, a checker that never matched would
    // report "no client scope" forever, including on the day one is added.
    expect(hasClientScope("write('/campaigns/create', { name, client_id: clientId })")).toBe(true)
    expect(hasClientScope("write('/campaigns/create', { name })")).toBe(false)
  })
})

/**
 * A SMARTLEAD client scope — not K.I.N.D's own `clients.id`.
 *
 * The two are constantly confused because they share a name. K.I.N.D's is a Postgres uuid
 * used to filter our own tables and to NAME the campaign; Smartlead's is a whitelabel
 * sub-account id we have never once set. Only a client id appearing in a REQUEST BODY to
 * Smartlead is the one that matters here.
 */
function hasClientScope(writeBody: string): boolean {
  return /client_id\s*:/.test(writeBody) && !/client_id\s*:\s*null/.test(writeBody)
}

describe('EVERY K.I.N.D SMARTLEAD CAMPAIGN IS UNASSIGNED', () => {
  it('createCampaign posts a name and NOTHING ELSE', () => {
    const fn = SL.slice(SL.indexOf('export async function createCampaign'))
    const body = fn.slice(0, fn.indexOf('\n}'))
    expect(body).toContain("'/campaigns/create'")
    expect(hasClientScope(body), 'createCampaign now assigns a Smartlead client — the null-scoped block list no longer suppresses those campaigns').toBe(false)
  })

  it('addLeads carries no client scope either', () => {
    const fn = SL.slice(SL.indexOf('export async function addLeads'))
    const body = fn.slice(0, fn.indexOf('\n}'))
    expect(hasClientScope(body)).toBe(false)
  })

  it('NO SMARTLEAD WRITE ANYWHERE CARRIES A CLIENT SCOPE except the block list\'s explicit null', () => {
    for (const body of writeBodies(SL)) {
      expect(hasClientScope(body), `a Smartlead write gained a client scope: ${body.slice(0, 120)}`).toBe(false)
    }
  })

  it('the integration does not even MODEL a Smartlead client', () => {
    // The campaign type has no client field, so a client-scoped campaign could not be read
    // back and matched even if one existed.
    expect(SL).toMatch(/SmartleadCampaign = \{ id: number \| string; name: string; status\?: string \}/)
  })

  it('no client-create, client-list or client-assign call exists', () => {
    // If K.I.N.D ever needs the fan-out, it will need one of these first — their absence is
    // the clearest evidence that sub-accounts are not in use.
    expect(SL).not.toMatch(/['"`]\/client\//)
    expect(SL).not.toMatch(/['"`]\/clients['"`]/)
    expect(SL).not.toContain('client/create')
  })
})

describe('OUR TENANCY IS THE CAMPAIGN NAME, NOT A SMARTLEAD SUB-ACCOUNT', () => {
  it('a campaign is named from K.I.N.D\'s own client id', () => {
    const fn = SEND.slice(SEND.indexOf('export function campaignNameFor'))
    expect(fn.slice(0, 200)).toMatch(/K\.I\.N\.D — \$\{clientId\}/)
  })

  it('and the campaign is found by NAME, never by a client scope', () => {
    // `list.data.find(c => c.name === wanted)` — if tenancy ever moves into a Smartlead
    // client scope, this lookup breaks first and loudly, which is the good failure.
    expect(SEND).toMatch(/find\(c => c\.name === wanted\)/)
  })
})

describe('THE BLOCK LIST SCOPE, AND WHY null IS RIGHT HERE', () => {
  it('the call sends an explicit null scope', () => {
    expect(SL).toMatch(/client_id:\s*null/)
  })

  it('the REASON is recorded in the code, not left to be re-derived', () => {
    // ⛓️ My first comment said null means "the WHOLE workspace". That is the opposite of
    // Smartlead's documented behaviour, and a future reader trusting it would add
    // sub-accounts and never suspect the suppression had stopped working.
    const raw = readFileSync(join(__dirname, 'smartlead.ts'), 'utf8')
    expect(raw).toMatch(/EVERY K\.I\.N\.D CAMPAIGN IS UNASSIGNED/)
    expect(raw).toMatch(/does NOT reach campaigns inside client\s*\n?\s*\*?\s*sub-accounts/i)
  })

  it('NEVER a domain — one person opting out must not silence their colleagues', () => {
    const fn = SL.slice(SL.indexOf('export async function addToGlobalBlockList'))
    const body = fn.slice(0, fn.indexOf('\n}'))
    expect(body).not.toMatch(/split\(['"]@['"]\)/)
    expect(body).toContain('emails.map')
  })
})
