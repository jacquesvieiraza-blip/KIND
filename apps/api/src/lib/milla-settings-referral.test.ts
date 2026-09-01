// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-004A-2D — MILLA SETTINGS + REFERRAL + LEAD DELIVERY.
//
// 🛑 THE TWO FINDINGS THIS SUITE EXISTS FOR, AND NEITHER WAS A BUG IN THE ORDINARY SENSE.
//
// ① THE NOTIFICATION PANEL UNDERSTATED US. Three rows were badged "Soon" with DISABLED
//    switches while their crons ran — `/digest/weekly` every Monday, `/figsy/check-performance`
//    every morning. #326 wrote "Soon" when those toggles genuinely did nothing; the emails were
//    built afterwards and nobody came back to the switch. A client received mail the product
//    told them did not exist, from a control they could see and could not press.
//
// ② REFERRAL AND BILLING SOLD TWO DIFFERENT PRODUCTS TO ONE PERSON. `/milla/referral` promised
//    "$45 to your wallet … 11 approved leads on us"; `/milla/billing`, two rail items away,
//    says there is no wallet, no pack and no per-lead price. **Both were true** — against
//    different halves of a product mid-migration (R74 keeps the legacy runtime live). Truth
//    per-page is not truth per-customer.
//
// ⚠️ THE RULES ARE RUN, NOT READ, WHEREVER THEY CAN BE. `mayNotify` is imported and executed
// below. A guard that greps `internal.ts` for the word `weekly_digest_enabled` proves the word
// is near a send; it cannot prove that `false` STOPS one. Source-reading guards are used only
// for the things that genuinely live in markup — a heading, a card, an input.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  mayNotify, notificationEnabled, isRetiredWalletNotification,
  onProgramme, RETIRED_WALLET_NOTIFICATIONS,
} from './programme-notifications'

const REPO   = join(__dirname, '../../../..')
const PORTAL = join(REPO, 'apps/portal/src')
const API    = join(__dirname, '..')

/** Blocks first, then lines — the stripper the 4A-2B slice had to correct (11th occurrence). */
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter(l => !l.trim().startsWith('//'))
  .join('\n')

const millaPage = (route: string) =>
  strip(readFileSync(join(PORTAL, `app/(milla)/milla/${route}/page.tsx`), 'utf8'))
const raw = (p: string) => readFileSync(p, 'utf8')

const SETTINGS = millaPage('settings')
const REFERRAL = millaPage('referral')
const INTERNAL = strip(raw(join(API, 'routes/internal.ts')))
const STRIPE   = strip(raw(join(API, 'routes/stripe.ts')))
const CLIENTS  = strip(raw(join(API, 'routes/clients.ts')))

// ═══════════════════════════════════════════════════════════════════════════════════════
// D1 · NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('D1 — a programme customer is never told to top up a wallet they do not have', () => {
  it('the retired wallet notifications are named, so the fence has something to hold', () => {
    // Vacuity: if this list were empty every refusal below would pass by saying nothing.
    expect(RETIRED_WALLET_NOTIFICATIONS.length).toBeGreaterThan(0)
    expect(RETIRED_WALLET_NOTIFICATIONS).toContain('low_credits')
    expect(RETIRED_WALLET_NOTIFICATIONS).toContain('zero_credits')
    expect(isRetiredWalletNotification('low_credits')).toBe(true)
    expect(isRetiredWalletNotification('weekly_digest')).toBe(false)
  })

  it('REFUSES the low-credit email to a client on a programme', () => {
    expect(mayNotify('low_credits',  { onProgramme: true })).toBe(false)
    expect(mayNotify('zero_credits', { onProgramme: true })).toBe(false)
  })

  it('and refuses it when the programme table was UNREADABLE, rather than guessing "no"', () => {
    // 🛑 THE ASYMMETRY IS THE POINT. Everywhere else `null` means "assert nothing". Here the
    // two mistakes are not equal: a retired top-up email in a programme customer's inbox
    // contradicts their own billing page and cannot be recalled; a missed nudge to a legacy
    // client is a delay. A failed read withholds.
    expect(mayNotify('low_credits', { onProgramme: null })).toBe(false)
  })

  it('but a LEGACY client still gets it — R74 keeps the $299/100/$4 runtime live', () => {
    // Vacuity guard on the rule above: a fence that refuses everyone is not a fence, it is an
    // outage. This asserts the legacy path is genuinely still open.
    expect(mayNotify('low_credits',  { onProgramme: false })).toBe(true)
    expect(mayNotify('zero_credits', { onProgramme: false })).toBe(true)
  })

  it('an unreadable programme SET yields a null verdict per client, never false', () => {
    expect(onProgramme(null, 'c1')).toBe(null)
    expect(onProgramme(new Set(['c1']), 'c1')).toBe(true)
    expect(onProgramme(new Set(['c2']), 'c1')).toBe(false)
  })

  it('both send sweeps in the credit-warning route are actually gated', () => {
    expect(INTERNAL).toMatch(/mayNotify\('zero_credits'/)
    expect(INTERNAL).toMatch(/mayNotify\('low_credits'/)
    // ...and the gate is read from a real programme lookup, not hard-coded.
    expect(INTERNAL).toMatch(/programmeClientIds\(/)
  })

  it('the Milla Settings panel no longer offers a Low credits control at all', () => {
    expect(SETTINGS).not.toMatch(/Low credits/i)
    expect(SETTINGS).not.toMatch(/low_credits/)
    // And the whole retired-credit vocabulary is gone from the customer's settings screen.
    expect(SETTINGS).not.toMatch(/credit balance/i)
    expect(SETTINGS).not.toMatch(/enough credits/i)
  })
})

describe('D1 — the two switches that lied are now real, switchable and persisted', () => {
  it('only an explicit false turns a notification off — null means "never chose"', () => {
    // The columns are nullable with no DEFAULT (#599). If `null` read as OFF, applying the
    // migration would silently unsubscribe every existing client in one statement.
    expect(notificationEnabled(null)).toBe(true)
    expect(notificationEnabled(undefined)).toBe(true)
    expect(notificationEnabled(true)).toBe(true)
    expect(notificationEnabled(false)).toBe(false)
  })

  it('the weekly digest is genuinely STOPPED by the preference, not merely aware of it', () => {
    expect(mayNotify('weekly_digest', { onProgramme: null, pref: false })).toBe(false)
    expect(mayNotify('weekly_digest', { onProgramme: null, pref: true  })).toBe(true)
    expect(mayNotify('weekly_digest', { onProgramme: null, pref: null  })).toBe(true)
  })

  it('and so is the campaign-paused email', () => {
    expect(mayNotify('campaign_paused', { onProgramme: null, pref: false })).toBe(false)
    expect(mayNotify('campaign_paused', { onProgramme: null, pref: true  })).toBe(true)
  })

  it('a programme customer is NOT fenced out of these two — they are not wallet notifications', () => {
    // The D1 removal was scoped to the retired credit emails. Silently dropping the digest for
    // programme customers would be exactly the over-removal the brand rule forbids.
    expect(mayNotify('weekly_digest',   { onProgramme: true })).toBe(true)
    expect(mayNotify('campaign_paused', { onProgramme: true })).toBe(true)
  })

  it('the send paths read the columns and gate BEFORE sending', () => {
    expect(INTERNAL).toMatch(/weekly_digest_enabled/)
    expect(INTERNAL).toMatch(/campaign_paused_emails_enabled/)
    expect(INTERNAL).toMatch(/mayNotify\('weekly_digest'/)
    expect(INTERNAL).toMatch(/mayNotify\('campaign_paused'/)
    // The digest gate must sit above its send, or it is not a gate.
    const gate = INTERNAL.indexOf("mayNotify('weekly_digest'")
    const send = INTERNAL.indexOf('sendWeeklyLeadsDigest(')
    expect(gate).toBeGreaterThan(-1)
    expect(send).toBeGreaterThan(gate)
  })

  it('the API accepts both preferences, or the toggle saves nothing', () => {
    expect(CLIENTS).toMatch(/campaign_paused_emails_enabled:\s*z\.boolean\(\)\.optional\(\)/)
    expect(CLIENTS).toMatch(/weekly_digest_enabled:\s*z\.boolean\(\)\.optional\(\)/)
  })

  it('the Settings page persists to the SERVER, not to localStorage', () => {
    // A cron cannot read a browser. This is why the four original toggles never worked.
    expect(SETTINGS).toMatch(/campaign_paused_emails_enabled/)
    expect(SETTINGS).toMatch(/weekly_digest_enabled/)
    expect(SETTINGS).toMatch(/api\.patch\('\/clients\/me'/)
    // Neither of the two may be written to the local store.
    const localStore = SETTINGS.match(/localStorage\.setItem\(NOTIF_STORAGE_KEY[\s\S]{0,200}/)?.[0] ?? ''
    expect(localStore).not.toMatch(/campaign_paused|weekly_digest|daily_brief/)
  })

  it('neither live switch is rendered disabled or badged Soon', () => {
    // RED-proof anchor: the badge is driven by `live`, and these three are live:true.
    expect(SETTINGS).toMatch(/label: 'Campaign paused',[\s\S]{0,160}live: true/)
    expect(SETTINGS).toMatch(/label: 'Weekly digest',[\s\S]{0,160}live: true/)
    expect(SETTINGS).toMatch(/label: 'Daily brief',[\s\S]{0,160}live: true/)
  })

  it('"Campaign paused" is NOT renamed to "Programme paused" — it is not a programme event', () => {
    // Founder-explicit. The event is one `figsy_campaigns` row crossing the reply-rate floor;
    // a programme pause is `programmes.paused_at`. Renaming would tell a client their whole
    // engagement stopped because one campaign underperformed.
    expect(SETTINGS).toMatch(/Campaign paused/)
    expect(SETTINGS).not.toMatch(/Programme paused/)
  })

  it('Reply received stays "Soon", because it genuinely is', () => {
    expect(SETTINGS).toMatch(/label: 'Reply received',[\s\S]{0,160}live: false/)
    // Vacuity: prove the Soon badge still exists to be shown.
    expect(SETTINGS).toMatch(/Soon</)
  })

  it('the Daily brief keeps its existing genuine behaviour', () => {
    expect(SETTINGS).toMatch(/daily_brief_enabled/)
    expect(INTERNAL).toMatch(/daily_brief_enabled/)
  })

  it('the panel itself survives — four rows, no empty gap where Low credits stood', () => {
    expect(SETTINGS).toMatch(/Notification Preferences/)
    const rows = SETTINGS.match(/label: '(Daily brief|Campaign paused|Weekly digest|Reply received)'/g) ?? []
    expect(rows).toHaveLength(4)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// D2 · REFERRAL
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('D2 — the referral page stops selling a retired product', () => {
  it('promises no $45, and no money at all', () => {
    expect(REFERRAL).not.toMatch(/\$45/)
    // Any bare dollar amount. `/\$\s?\d/` and not a bare `$`, which would match a template
    // interpolation — the 4A-2B correction.
    expect(REFERRAL).not.toMatch(/\$\s?\d/)
  })

  it('names no wallet, no credits, no approved leads and no $299 pack', () => {
    expect(REFERRAL).not.toMatch(/wallet/i)
    expect(REFERRAL).not.toMatch(/credit/i)
    expect(REFERRAL).not.toMatch(/approved leads/i)
    expect(REFERRAL).not.toMatch(/299/)
    expect(REFERRAL).not.toMatch(/PACK_PRICE_USD/)
    expect(REFERRAL).not.toMatch(/onboarding pack/i)
  })

  it('and does not quietly invent a replacement reward', () => {
    expect(REFERRAL).not.toMatch(/\bearn\b/i)
    expect(REFERRAL).not.toMatch(/\breward\b/i)
    expect(REFERRAL).not.toMatch(/\bbonus\b/i)
    expect(REFERRAL).not.toMatch(/\bcommission\b/i)
    expect(REFERRAL).not.toMatch(/\bdiscount\b/i)
    expect(REFERRAL).not.toMatch(/free month/i)
  })

  it('KEEPS the experience — link, copy action, history and structure all still there', () => {
    // The other half of the brand rule: this suite must not be passable by deleting the page.
    expect(REFERRAL).toMatch(/Your referral link/)
    expect(REFERRAL).toMatch(/\?ref=\$\{id\}/)          // the link actually carries the ref
    expect(REFERRAL).toMatch(/navigator\.clipboard\.writeText\(referralUrl\)/)
    expect(REFERRAL).toMatch(/\{copied \? 'Copied!' : 'Copy link'\}\s*<\/button>/)
    expect(REFERRAL).toMatch(/clients\/referrals/)      // history endpoint still read
    expect(REFERRAL).toMatch(/<table/)                  // history still rendered
    expect(REFERRAL).toMatch(/Your referrals/)
    expect(REFERRAL).toMatch(/No referrals yet/)        // empty state kept, not deleted
  })

  it('keeps all three numbered steps — the structure was preserved, not flattened', () => {
    const steps = REFERRAL.match(/step: '[123]'/g) ?? []
    expect(steps).toHaveLength(3)
  })

  it('renders historical statuses rather than deleting the evidence', () => {
    // #607 retired the trial, so no NEW referral can reach 'trial' — but a row that did is a
    // record of something that happened, and the founder ruled history is not deleted.
    expect(REFERRAL).toMatch(/r\.status === 'trial'/)
    expect(REFERRAL).toMatch(/r\.status === 'paying'/)
    expect(REFERRAL).toMatch(/r\.status === 'churned'/)
  })
})

describe('D2 — and the backend stops paying, which is the half that costs money', () => {
  it('the first-purchase path no longer credits a wallet', () => {
    expect(STRIPE).not.toMatch(/payReferrerOnFirstPurchase/)
    expect(STRIPE).toMatch(/handOffReferralToFounder\(/)
  })

  it('no referral_bonus ledger row and no wallet RPC is written on a referral any more', () => {
    expect(STRIPE).not.toMatch(/type:\s*'referral_bonus'/)
    // The ONLY remaining increment_wallet touching a referral is the historic claw-back, and
    // it is negative. A positive referral grant must not exist anywhere in this file.
    expect(STRIPE).not.toMatch(/increment_wallet[\s\S]{0,120}p_amount:\s*REFERRAL_BONUS_USD/)
  })

  it('the retired payout function is DELETED, not left uncalled', () => {
    // This file's own doctrine, quoted at the top of it: an intact function nobody calls reads
    // as live to the next person and to every grep — #383's exact shape.
    expect(STRIPE).not.toMatch(/_retiredPayReferrerOnFirstPurchase/)
  })

  it('the handoff claims a NEW marker, never the paid marker', () => {
    // 🛑 THE DEFECT THIS PREVENTS. The refund path claws $45 back whenever
    // `referral_bonus_paid_at` is set. If the handoff set that column without paying, the
    // first refund would reclaim money that was never granted, from a wallet the customer's
    // own billing page says does not exist.
    const handoff = STRIPE.match(/async function handOffReferralToFounder[\s\S]*?\n}/)?.[0] ?? ''
    expect(handoff).not.toBe('')                              // vacuity
    expect(handoff).toMatch(/referral_handoff_at/)
    expect(handoff).not.toMatch(/referral_bonus_paid_at/)
    expect(handoff).not.toMatch(/increment_wallet/)
    expect(handoff).not.toMatch(/credit_transactions/)
  })

  it('a human is actually told — "handled personally" needs a person to hear about it', () => {
    const handoff = STRIPE.match(/async function handOffReferralToFounder[\s\S]*?\n}/)?.[0] ?? ''
    expect(handoff).toMatch(/sendFounderAlert\(/)
  })

  it('the historic claw-back still works, so past paid referrals stay reversible', () => {
    expect(STRIPE).toMatch(/referral_claw_\$\{refundedClientId\}/)
    expect(STRIPE).toMatch(/refundedClient\.referral_bonus_paid_at/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// D3 · LEAD DELIVERY
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('D3 — Lead Delivery keeps its section and loses its levers', () => {
  it('the branded section is STILL THERE — this is not a removal', () => {
    expect(SETTINGS).toMatch(/Lead Delivery/)
  })

  it('and it still renders cards, not a sentence', () => {
    // 🛑 THE RICHNESS FLOOR, and it exists because every other guard in this describe says
    // what must NOT be present — the cheapest way to pass them all is to delete the section.
    // This is the one that fails if the answer to "make it truthful" is "make it a paragraph".
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).not.toBe('')                              // vacuity
    const cards = section.match(/<ValueCard/g) ?? []
    expect(cards.length).toBeGreaterThanOrEqual(2)
    expect(section).toMatch(/<ProgressBar/)
    expect(section).toMatch(/grid-cols-1 md:grid-cols-2/)     // the original two-column grid
  })

  it('the customer can no longer configure internal sourcing volume', () => {
    expect(SETTINGS).not.toMatch(/leads_per_run/)
    expect(SETTINGS).not.toMatch(/Leads per ICP run/i)
  })

  it('nor internal daily delivery mechanics', () => {
    expect(SETTINGS).not.toMatch(/daily_drip_rate/)
    expect(SETTINGS).not.toMatch(/Daily lead delivery rate/i)
    expect(SETTINGS).not.toMatch(/revealed in your dashboard each day/i)
  })

  it('and there is no number input left in the section to configure anything with', () => {
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).not.toMatch(/<input/)
    expect(section).not.toMatch(/type="number"/)
  })

  it('the figures come from the programme, not from the retired self-serve model', () => {
    expect(SETTINGS).toMatch(/'\/my\/programme'/)
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).toMatch(/p\.progress\.delivered/)
    expect(section).toMatch(/p\.progress\.authorised/)
    expect(section).toMatch(/p\.progress\.outcomesAchieved/)
  })

  it('uses the founder-approved labels verbatim rather than inventing new metrics', () => {
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).toMatch(/People sourced of \$\{p\.progress\.authorised\.toLocaleString\(\)\} authorised/)
    expect(section).toMatch(/Meetings booked/)
    expect(section).toMatch(/Meetings — not available right now/)
  })

  it('null is a dash, never a zero — an unreadable meeting count is not "none booked"', () => {
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).toMatch(/outcomesAchieved === null/)
    // A failed programme read renders the locked failure sentence, not an empty panel.
    expect(section).toMatch(/MILLA_FAILURE_COPY\.pipelineFailed/)
  })

  it('a pre-authorisation programme keeps a real component, not a grey line', () => {
    const section = SETTINGS.match(/function LeadDeliverySection[\s\S]*?\n}/)?.[0] ?? ''
    expect(section).toMatch(/<PreLiveState/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// FOUNDER AMENDMENTS — 31 Aug, on top of #1622
//
// ⚠️ THE EXACT SENTENCES ARE PINNED, NOT PARAPHRASED. Approved copy is a founder decision;
// a guard that checks for "roughly this wording" is a guard that lets the wording drift.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('amendment — the founder-approved copy is exact', () => {
  it('the Lead Delivery subtitle is his wording, not mine', () => {
    expect(SETTINGS).toContain(
      'How your programme is being delivered. We handle sourcing and delivery for you.',
    )
    // The draft it replaced must be gone, or both could sit in the file at once.
    expect(SETTINGS).not.toMatch(/K\.I\.N\.D runs sourcing and delivery/)
  })

  it('Referral step 3 is his wording, with the repo’s string-literal apostrophe', () => {
    expect(REFERRAL).toContain(
      'We handle every referral personally. If there’s a next step, we’ll agree it with you directly.',
    )
    // ⚠️ THE ENTITY FORM WOULD RENDER LITERALLY HERE. This is a JS string, not JSX text —
    // `&rsquo;` inside it reaches the customer as the six characters `&rsquo;`.
    const step3 = REFERRAL.match(/title: 'We take it from there'[\s\S]{0,400}/)?.[0] ?? ''
    expect(step3).not.toBe('')                                  // vacuity
    expect(step3).not.toMatch(/&rsquo;|&apos;|&#39;/)
    expect(REFERRAL).not.toMatch(/not automatically\. Anything that follows/)   // the draft
  })

  it('and the amended step still promises nothing — the D2 rules did not lapse', () => {
    expect(REFERRAL).not.toMatch(/\$\s?\d/)
    expect(REFERRAL).not.toMatch(/\bcredit/i)
    expect(REFERRAL).not.toMatch(/\breward\b|\bearn\b|\bbonus\b/i)
  })

  it('the retired CRM credits clause is absent, and the rest of the sentence survives', () => {
    expect(SETTINGS).not.toMatch(/spend credits on people you already know/)
    // ⚠️ THE OTHER HALF OF THE ASSERTION IS THE POINT. "Remove only the retired wording" —
    // so the surviving sentence has to still be here, or this passed by deleting the control.
    expect(SETTINGS).toContain('Never contact people already in my')
    expect(SETTINGS).toContain('so we never cold-email your customers')
  })
})

describe('amendment — no customer email prices a lead by its score', () => {
  const email = strip(raw(join(API, 'lib/email.ts')))

  it('the digest header cannot be handed a pipeline value at all', () => {
    // 🛑 REMOVED FROM THE SIGNATURE, not from one call site. `digestHeader` has TWO callers
    // and both mailed the same invented number; deleting the argument in one would have left
    // the other shipping it, and passed a narrower guard while doing so.
    expect(email).toMatch(/function digestHeader\(companyName: string, totalLeads: number, avgScore: number\): string/)
    expect(email).not.toMatch(/pipelineValue/)
    expect(email).not.toMatch(/Pipeline value/)
  })

  it('neither caller computes or passes one', () => {
    // ⚠️ CALL SITES ONLY — `digestHeader\(` also matches the DEFINITION, whose three typed
    // parameters happen to split into three the same way the arguments do. The first draft of
    // this guard counted the definition as a caller and asserted 3; anchoring on the `${`
    // interpolation is what makes it count renders rather than mentions.
    const calls = email.match(/\$\{digestHeader\([^)]*\)/g) ?? []
    expect(calls.length).toBe(2)                                // vacuity: both still render
    for (const c of calls) expect(c.split(',')).toHaveLength(3) // company, count, score
    // The inline fabrication in sendFirstLeadsReadyEmail.
    expect(email).not.toMatch(/\(l\.score \?\? 0\) \* 100/)
    expect(email).not.toMatch(/pipeline_value/)
  })

  it('the weekly digest route neither selects nor sends the fabricated column', () => {
    const digest = INTERNAL.match(/internalRouter\.post\('\/digest\/weekly'[\s\S]*?\n\}\)/)?.[0] ?? ''
    expect(digest).not.toBe('')                                 // vacuity
    expect(digest).not.toMatch(/estimated_deal_value_usd/)
    expect(digest).not.toMatch(/pipeline_value|pipelineValue/)
  })

  it('and NOTHING invented was put in its place', () => {
    // The founder's rule: no replacement metric, no deal value, no revenue, no ROI. The
    // header row is two real cells now — a count and a score — and must stay that way.
    const header = email.match(/function digestHeader[\s\S]*?\n\}/)?.[0] ?? ''
    expect(header).not.toBe('')                                 // vacuity
    expect(header).not.toMatch(/\$\$\{|revenue|ROI|deal value|value|worth/i)
    const cells = header.match(/<td align="center"/g) ?? []
    expect(cells).toHaveLength(2)
  })

  it('the digest itself still exists — this was a metric removal, not a feature removal', () => {
    expect(email).toMatch(/export async function sendWeeklyLeadsDigest/)
    expect(email).toMatch(/Total leads/)
    expect(email).toMatch(/Avg score/)
    expect(email).toMatch(/FIGSY Outreach This Week/)
    expect(INTERNAL).toMatch(/sendWeeklyLeadsDigest\(/)
  })

  it('the score×100 writer is STILL untouched — it stays parked', () => {
    const scoring = raw(join(API, 'lib/scoring.ts'))
    expect(scoring).toMatch(/estimated_deal_value_usd:\s*r\.score \* 100/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// D4 · FIGSY NAMING
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('D4 — FIGSY stays where it genuinely means the engine', () => {
  it('the engine is still named on the surfaces that describe engine work', () => {
    // Founder: "KEEP FIGSY customer-visible where it genuinely refers to the engine doing
    // research, sourcing, scoring, outreach." Milla = experience, FIGSY = engine behind it.
    expect(SETTINGS).toMatch(/FIGSY — Outreach Control/)
    expect(SETTINGS).toMatch(/FIGSY Writing Style/)
    expect(SETTINGS).toMatch(/supercharge FIGSY/)
    expect(SETTINGS).toMatch(/FIGSY sends/)
  })

  it('and there was no global FIGSY→Milla rename', () => {
    const mentions = SETTINGS.match(/FIGSY/g) ?? []
    expect(mentions.length).toBeGreaterThanOrEqual(6)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ISOLATION — what this slice was forbidden to touch
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('isolation — the shared dashboard and every neighbouring slice are untouched', () => {
  const dash = (route: string) =>
    raw(join(PORTAL, `app/(dashboard)/dashboard/${route}/page.tsx`))

  it('the shared /dashboard settings page still owns its own controls', () => {
    // It is a LIVE, separately-routed portal on the legacy runtime R74 keeps alive. Forking
    // Milla must not have edited it.
    const d = dash('settings')
    expect(d).toMatch(/leads_per_run/)
    expect(d).toMatch(/daily_drip_rate/)
    expect(d).toMatch(/Low credits warning/)
  })

  it('the shared /dashboard referral page keeps its legacy commercial copy', () => {
    const d = dash('referral')
    expect(d).toMatch(/\$45/)
    expect(d).toMatch(/wallet/i)
  })

  it('Milla Billing and Usage are untouched by this slice', () => {
    const billing = millaPage('billing')
    const usage   = millaPage('usage')
    expect(billing).toMatch(/programmeMoney/)
    expect(usage.length).toBeGreaterThan(0)
  })

  it('the 4A-2C reporting pages are untouched', () => {
    for (const route of ['reports', 'performance', 'analytics', 'roi']) {
      expect(millaPage(route).length).toBeGreaterThan(0)
    }
    expect(millaPage('roi')).toMatch(/ROI_MISSING_INPUTS|canComputeRoi/)
  })

  it('the score×100 writer is still untouched — it is a PARKED defect, not this slice', () => {
    const scoring = raw(join(API, 'lib/scoring.ts'))
    expect(scoring).toMatch(/estimated_deal_value_usd:\s*r\.score \* 100/)
  })
})

describe('the migration is registered, or the columns never exist', () => {
  it('every column this slice reads is declared in the runner Vida executes', () => {
    // #383: a .sql file on disk LOOKS applied. `PENDING_MIGRATIONS` is the only list that runs.
    const pending = raw(join(API, 'lib/pending-migrations.ts'))
    expect(pending).toMatch(/campaign_paused_emails_enabled/)
    expect(pending).toMatch(/weekly_digest_enabled/)
    expect(pending).toMatch(/referral_handoff_at/)
  })

  it('and they are nullable with no DEFAULT, so applying it unsubscribes nobody', () => {
    const pending = raw(join(API, 'lib/pending-migrations.ts'))
    const block = pending.match(/ALTER TABLE public\.clients[\s\S]*?referral_handoff_at[^\n]*/)?.[0] ?? ''
    expect(block).not.toBe('')                                // vacuity
    expect(block).toMatch(/ADD COLUMN IF NOT EXISTS/)
    expect(block).not.toMatch(/DEFAULT/i)
    expect(block).not.toMatch(/NOT NULL/i)
  })
})
