import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { partnerDocuments } from './partner-documents'

// ── THE PARTNER ONBOARDING FLOW (R42, founder-ruled 16 Aug) ─────────────────────────────
//
// "i create the partner seat. it should send them an email notifying them. they then sign up
//  and complete their information pack. this renders all docs. they sign. i recieve docs i
//  sign and they then go live on partner. once they have this they are notified."
//
// Two things in this build could cost real money if they broke, and they are what these
// tests exist for:
//
//   1. A SIGNED DOCUMENT THAT SILENTLY CHANGES. The pack is generated from the billing
//      constants. If a rate ever moves and the vault re-generates, the document under
//      somebody's signature changes and nobody can prove what was agreed.
//   2. A REFERRAL CODE THAT WORKS BEFORE THE PAPERWORK IS DONE — or, far worse in the other
//      direction, EXISTING codes switched off by this build. Demmy Oshodi and KIND-JACQUES
//      are live today with no signatures on file and must stay that way.

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

const routes = read('apps/api/src/routes/partners.ts')
const operator = read('apps/api/src/routes/operator.ts')
const migration = read('supabase/migrations/20260816_partner_onboarding_flow.sql')
const runner = read('apps/api/src/lib/pending-migrations.ts')
const vida = read('apps/admin/src/app/vida/partners/page.tsx')
const emails = read('apps/api/src/lib/partner-invite-email.ts')

describe('a signed document is FROZEN — the rate may move, the contract may not', () => {
  it('the signature stores the full body, not a reference to a generator', () => {
    // If this stored doc_id and re-rendered on read, every signed contract in the system
    // would change the day a rate changed.
    expect(migration).toMatch(/body_snapshot\s+text not null/)
    const signRoute = routes.slice(routes.indexOf("partnersRouter.post('/me/sign'"))
    expect(signRoute.slice(0, 3000)).toContain('body_snapshot: doc.body')
  })

  it('a snapshot survives a rate change that the LIVE pack follows', () => {
    // The live generator tracks the constants — proven here by generating two packs at
    // different rates and watching the body move. A stored snapshot is a plain string and
    // therefore cannot: that difference IS the guarantee.
    const at8 = partnerDocuments({ seatType: 'client_partner', retainRate: 0.08, name: 'A' })
      .find(d => d.id === 'commission-agreement')!.body
    const snapshotTakenAt8 = String(at8)          // what a signature would have frozen

    const at12 = partnerDocuments({ seatType: 'client_partner', retainRate: 0.12, name: 'A' })
      .find(d => d.id === 'commission-agreement')!.body

    expect(at12).not.toBe(at8)                    // the live pack MOVED
    expect(at12).toContain('12%')
    expect(snapshotTakenAt8).toContain('8%')      // the frozen copy did not
    expect(snapshotTakenAt8).not.toContain('12%')
  })

  it('and the vault serves the snapshot instead of re-generating, once one exists', () => {
    expect(routes).toContain('async function withSignedSnapshots')
    expect(routes).toMatch(/body:\s*source\.body_snapshot/)
    // Both surfaces — hers and the operator's — must go through it.
    expect((routes.match(/withSignedSnapshots\(/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })

  it('one signature per document per side — a second click cannot re-sign', () => {
    expect(migration).toMatch(/create unique index if not exists partner_signed_documents_once/)
    expect(migration).toMatch(/\(partner_id, doc_id, signed_role\)/)
  })
})

describe('the money gate — no live partner without both signatures', () => {
  it('the referral code refuses anything that is not a live seat', () => {
    const ref = routes.slice(routes.indexOf("partnersRouter.get('/ref/:code'"), routes.indexOf("partnersRouter.get('/ref/:code'") + 2500)
    expect(ref).toContain('onboarding_state')
    expect(ref).toMatch(/state !== 'active'/)
  })

  it('LEGACY seats are grandfathered — the column defaults to active, not invited', () => {
    // Demmy Oshodi and KIND-JACQUES have no signatures on file. Defaulting to 'invited' would
    // switch off two working referral codes as a side effect of running a migration.
    expect(migration).toMatch(/onboarding_state text not null default 'active'/)
    expect(migration).not.toMatch(/default 'invited'/)
  })

  it('and an unrun migration cannot switch off a working code either', () => {
    // Between deploy and "Run migrations" the column does not exist. Failing closed there
    // would kill every referral code on the strength of a missing column.
    const ref = routes.slice(routes.indexOf("partnersRouter.get('/ref/:code'"), routes.indexOf("partnersRouter.get('/ref/:code'") + 2500)
    expect(ref).toMatch(/if \(error\)[\s\S]{0,900}?select\('name, company, status'\)/)
    // and a seat whose state cannot be read is treated as the grandfathered 'active'
    expect(ref).toContain("?? 'active'")
  })

  it('a NEW seat is created invited, and only the counter-signature makes it active', () => {
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(seatRoute.slice(0, 4000)).toContain("onboarding_state: 'invited'")
    const counter = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"))
    expect(counter.slice(0, 4000)).toMatch(/update\(\{ onboarding_state: 'active' \}\)/)
  })

  it('he cannot counter-sign before she has signed everything', () => {
    const counter = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"), routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(counter).toMatch(/They have not signed everything yet/)
    expect(counter).toMatch(/status\(409\)/)
  })
})

describe('the invite actually lets her IN — Fable verification, 16 Aug', () => {
  // THE BLOCKER THIS PINS: the first version emailed a bare page link. The page's first step
  // calls updateUser({ password }), which needs an EXISTING session — and an invitee has none,
  // because her auth user was created with a random password nobody is told. She would have
  // been stuck on screen one with "Auth session missing", and the whole suite stayed green,
  // because every test in this file reads source rather than walking the flow.
  const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
  const page = read('apps/portal/src/app/partner-onboarding/page.tsx')

  it('the invite link is a Supabase action link, not a bare page URL', () => {
    // ⛓️ RE-POINTED 16 Aug (later the same day). This pinned `type: 'recovery'`, which was the
    // mechanism at the time and was WRONG: it emailed a password-recovery link to somebody who
    // had never had a password. The founder named it — "a partner should recieve the link. and
    // sign up. not have to set a new password. they would never know." The link is now
    // generated as an INVITE, with recovery kept only as the fallback for an address that
    // already has an account. What this test protects is unchanged: the email must carry a
    // link that establishes a session, not a bare page URL.
    // ⛓️ RE-POINTED AGAIN 16 Aug (third time in one evening, and the reason is recorded each
    // time). The link is no longer built inside this route: the invitation is sent by Supabase
    // from lib/partner-invite.ts, which also returns the link. What this test protects has not
    // changed — the email must carry a link that establishes a session, never a bare page URL.
    expect(seatRoute.slice(0, 9000)).toContain('invitePartner(')
    expect(seatRoute.slice(0, 9000)).toMatch(/const inviteUrl = invite\.inviteUrl/)
    // ⚠️ AND THE RESULT IS ACTUALLY USED. Asserting only that generateLink is CALLED is a
    // placebo — a red proof that disabled the assignment left every check above green while
    // the emailed link quietly went back to the dead page URL. What matters is that the
    // action link becomes the link she is actually sent.
    // and the session-carrying link is what is reported, not assumed
    expect(seatRoute.slice(0, 9000)).toMatch(/inviteUrl\.includes\('\/auth\/v1\/verify'\)/)
  })

  it('and it returns through the callback that exchanges the code — not straight to the page', () => {
    // /auth/callback is the handler that already turns Supabase's one-time code into cookies
    // and already honours ?next=. Pointing the email at the page directly is the exact bug
    // that made every password reset in this product 404 for its entire life.
    // ⛓️ RE-POINTED 16 Aug: the redirect is built inside invitePartner now. Asserted at its
    // new home — and partner-invite.test.ts proves it by READING the call Supabase receives,
    // which is a stronger check than matching this string ever was.
    const inviteLib = read('apps/api/src/lib/partner-invite.ts')
    expect(inviteLib).toMatch(/\/auth\/callback\?next=\$\{encodeURIComponent\(o\.packPath\)\}/)
  })

  it('a degraded link (no action link) is REPORTED, never passed off as a working invite', () => {
    // ⛓️ RE-POINTED 16 Aug. This asserted `inviteCarriesSession`, which conflated two facts:
    // whether the EMAIL sent (it is a Supabase password link and always signs her in) and
    // whether the COPYABLE link could be generated (best effort; degrades to the plain page
    // URL). Reporting the second as the first told the operator "her link does not sign her
    // in" about an email that works. What this test protects is unchanged — a degraded link
    // must be reported — only the field it is reported in, and the sentence, are now honest.
    expect(seatRoute.slice(0, 9000)).toContain('copyLinkSignsIn')
    expect(seatRoute.slice(0, 9000)).toMatch(/only the page address this time/)
  })

  it('with NO session the page offers a fresh link — it never shows a form that cannot work', () => {
    expect(page).toContain('async function resendLink')
    expect(page).toContain('resetPasswordForEmail')
    expect(page).toMatch(/step === 1 && !hasSession/)
    expect(page).toMatch(/step === 1 && hasSession/)
    // the password form must be behind the session check, not rendered regardless
    const noSessionBlock = page.slice(page.indexOf('step === 1 && !hasSession'), page.indexOf('step === 1 && hasSession'))
    expect(noSessionBlock).not.toContain('setPasswordStep')
  })
})

describe('the emailed link arrives as a FRAGMENT, and something has to read it', () => {
  // ── THE BUG THIS PR SHIPPED WITH, FOUND BY READING THE SDK (16 Aug, second pass) ────────
  //
  // The founder refused to merge without a code-level verification. This is what it found,
  // and every test above was green while it was true.
  //
  // Supabase's link shape is decided by WHICH CLIENT asked for the email, not by the kind of
  // email. `@supabase/ssr`'s browser client defaults to flowType "pkce" → `?code=`, which is
  // what /auth/callback exchanges, and which is the founder's one working walk. But the API
  // sends this invitation from `@kind/db`, which is plain `@supabase/supabase-js` — whose
  // DEFAULT_OPTIONS are flowType "implicit". `resetPasswordForEmail` then posts
  // `code_challenge: null`, and the link comes back as `#access_token=…`.
  //
  // A FRAGMENT IS NEVER SENT TO A SERVER. /auth/callback is a route handler; it reads
  // `?code=` and cannot see a hash. So the invitation would have arrived, been clicked, and
  // dumped her at "confirmation failed" — the identical failure `inviteUserByEmail` produced
  // two hours earlier, for the identical reason. The mechanism changed; the defect did not.
  const hashLib = read('apps/portal/src/lib/supabase/hash-session.ts')
  const callback = read('apps/portal/src/app/auth/callback/route.ts')
  const page = read('apps/portal/src/app/partner-onboarding/page.tsx')

  it('the landing page ADOPTS a fragment session — nothing else in the chain can', () => {
    // ⚠️ THE CALL, NOT THE IMPORT. A first version asserted `toContain('adoptSessionFromHash')`
    // and then compared indexOf against getSession — and stayed GREEN with the call deleted,
    // because the import line still carried the name and a missing call indexes at -1, which
    // is "before" everything. A red proof caught it. Assert the call exists, THEN the order.
    const called = page.indexOf('await adoptSessionFromHash()')
    const read = page.indexOf('auth.getSession()')
    expect(called).toBeGreaterThan(-1)
    // and it runs BEFORE the session is read, or it reads the absence it was meant to fix
    expect(called).toBeLessThan(read)
  })

  it('it adopts them EXPLICITLY with setSession — auto-detection refuses this link', () => {
    // `detectSessionInUrl` throws AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url")
    // on an implicit fragment when the client is PKCE, which ours is. Relying on it would be
    // relying on a code path that is written to reject exactly this input.
    expect(hashLib).toMatch(/auth\.setSession\(\{ access_token, refresh_token \}\)/)
  })

  it('and the tokens are stripped from the address bar afterwards', () => {
    // They are credentials. Left in the URL they survive a screenshot, a bookmark and history.
    expect(hashLib).toContain('window.history.replaceState')
  })

  it('a fragment link is FORWARDED by the callback, not dead-ended at a login she cannot pass', () => {
    expect(callback).toMatch(/if \(explicitNext\) \{[\s\S]{0,120}?redirect\(`\$\{origin\}\$\{explicitNext\}`\)/)
  })

  it('but `next` may only be a path on THIS site — a sign-in that forwards off-origin is phishing', () => {
    expect(callback).toMatch(/rawNext\.startsWith\('\/'\) && !rawNext\.startsWith\('\/\/'\)/)
  })
})

describe('both signatures land on the SAME words — Fable verification, 16 Aug', () => {
  it('the counter-signature copies HER frozen body, it does not re-render the pack', () => {
    // The first version generated the documents fresh at counter-signature time. Anything that
    // moved in between — a rate, a corrected address — would have frozen the two halves of one
    // agreement with different texts.
    const counter = routes.slice(
      routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"),
      routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(counter).toContain('body_snapshot: row.body_snapshot')
    expect(counter).toContain('doc_version: row.doc_version')
    expect(counter).not.toContain('body_snapshot: doc.body')
  })

  it('and it reads her stored bodies to do it', () => {
    const counter = routes.slice(
      routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"),
      routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(counter).toMatch(/select\('doc_id, doc_version, body_snapshot'\)/)
    expect(counter).toMatch(/eq\('signed_role', 'partner'\)/)
  })
})

describe('the person is actually told — three emails, none of them silent', () => {
  it('creating a seat sends the invitation', () => {
    expect(emails).toContain('export async function sendPartnerInvite')
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    // ⛓️ WINDOW WIDENED 16 Aug: removing the pre-created throwaway account and adding the
    // invite/recovery loop moved these further down the route. The assertions are unchanged —
    // only the slice that has to reach them.
    // ⛓️ RE-POINTED 16 Aug: sendPartnerInvite (Resend) is no longer on this path.
    expect(seatRoute.slice(0, 9000)).toContain('invitePartner(')
    expect(seatRoute.slice(0, 9000)).toContain('invite_token: inviteToken')
  })

  it('the invite link carries the token — without it the page cannot identify her', () => {
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(seatRoute.slice(0, 6000)).toMatch(/partner-onboarding\?token=\$\{inviteToken\}/)
  })

  it('a failed invite is REPORTED, never swallowed — she would be waiting for nothing', () => {
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"))
    expect(seatRoute.slice(0, 8000)).toContain('invite_sent: inviteSent')
    expect(vida).toContain('THE INVITE EMAIL DID NOT SEND')
  })

  it('she signs → he is told; he counter-signs → she is told', () => {
    expect(emails).toContain('export async function sendCountersignAlert')
    expect(emails).toContain('export async function sendPartnerLiveEmail')
    expect(routes).toContain('sendCountersignAlert(')
    expect(routes).toContain('sendPartnerLiveEmail(')
  })
})

describe('she fills in her own details — the operator stopped typing them for her', () => {
  it('seat creation asks for a name and an email, and nothing else about her', () => {
    const seatRoute = operator.slice(operator.indexOf("operatorRouter.post('/seats/client-partner'"), operator.indexOf("operatorRouter.post('/seats/client-partner'") + 3000)
    expect(seatRoute).not.toContain('cleanAddress')
    expect(seatRoute).not.toMatch(/An address, a country and a mobile number are required/)
  })

  it('and her own pack collects the details AND the payout rails', () => {
    // Without payout details the agreement promises payment by transfer against an invoice
    // and the first payout month is a hunt for bank details.
    const pack = routes.slice(routes.indexOf("partnersRouter.put('/me/pack'"), routes.indexOf("partnersRouter.post('/me/sign'"))
    expect(pack).toContain('payout_details')
    expect(pack).toMatch(/invoice_name/)
    expect(pack).toMatch(/We need to know how to pay you/)
  })

  it('a LIVE partner editing their address is not knocked back into onboarding', () => {
    const pack = routes.slice(routes.indexOf("partnersRouter.put('/me/pack'"), routes.indexOf("partnersRouter.post('/me/sign'"))
    expect(pack).toMatch(/seat\.onboarding_state === 'invited' \? \{ onboarding_state: 'pack_pending' \} : \{\}/)
  })

  it('the onboarding page exists and is declared public with a reason', () => {
    expect(existsSync(join(REPO, 'apps/portal/src/app/partner-onboarding/page.tsx'))).toBe(true)
    const mw = read('apps/portal/src/middleware.ts')
    expect(mw).toContain("path: '/partner-onboarding'")
    expect(mw).toMatch(/partner-onboarding'[\s\S]{0,120}?why: '[^']{40,}/)
  })

  it('an invalid invite gets a real message, never a dead end', () => {
    const invite = routes.slice(routes.indexOf("partnersRouter.get('/invite/:token'"), routes.indexOf("partnersRouter.put('/me/pack'"))
    expect(invite).toMatch(/not valid any more/)
  })
})

describe('archive is the exit, and it is never a delete', () => {
  it('archiving sets a state and a timestamp — no row is removed', () => {
    const arch = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(arch.slice(0, 2000)).toMatch(/onboarding_state: 'archived'/)
    expect(arch.slice(0, 2000)).toContain('archived_at')
    expect(arch.slice(0, 2000)).not.toMatch(/\.delete\(\)/)
  })

  it('commission history is not touched by it — the rows outlive the seat', () => {
    const arch = routes.slice(routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"), routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'") + 2000)
    expect(arch).not.toContain('partner_commissions')
  })

  it('an archived seat stops resolving, and Vida hides it behind a toggle', () => {
    // 'archived' is not 'active', so the money gate above already refuses it.
    expect(migration).toMatch(/check \(onboarding_state in \('invited', 'pack_pending', 'awaiting_countersign', 'active', 'archived'\)\)/)
    expect(vida).toContain('showArchived')
    expect(vida).toMatch(/filter\(p => p\.onboarding_state !== 'archived'\)/)
  })
})

describe('the migration is in both homes, and the runner is the one that executes', () => {
  it('canonical file and runner entry both exist and agree', () => {
    expect(migration).toContain('partner_signed_documents')
    expect(runner).toContain("key: '20260816_partner_onboarding_flow'")
    const entry = runner.slice(runner.indexOf("key: '20260816_partner_onboarding_flow'"))
    expect(entry.slice(0, 4000)).toContain('partner_signed_documents')
    expect(entry.slice(0, 4000)).toContain('onboarding_state')
  })
})
