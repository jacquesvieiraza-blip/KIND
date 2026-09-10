// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 KILL-SWITCH ON = ZERO EXTERNAL DELIVERY. PROVED BY ENUMERATION, NOT BY SAMPLING.
//
// ── WHY A TEST THAT COUNTS ──────────────────────────────────────────────────────────────
//
// The founder's requirement is not "show that callers usually check the env". It is
// STRUCTURAL: no current outbound path may bypass the switch, and no FUTURE one may appear
// without somebody deciding which it is.
//
// A test that asserts "these five seams are gated" proves nothing about the sixth. So this
// file ENUMERATES every provider-egress call site in the API — every place a message can
// actually leave the process — and requires each one to be either:
//
//   ① GATED   — the kill-switch is asked at or above that call, or
//   ② EXEMPT  — on the allowlist below, with a reason, because it is transactional mail that
//               the founder's rule does not govern (invoices, resets, receipts, our own
//               digests and alerts, inbound replies).
//
// A new `resend.emails.send`, a new SMTP transport, a new provider push: all three fail this
// file until classified. That is the property "a caller cannot route around it by not knowing
// about it", asserted rather than asserted-about.
//
// ── THE TWO KINDS OF MAIL, AND WHY THE SEAM CANNOT SIMPLY BE "ALL RESEND" ───────────────
//
// `sendTx` in `email.ts` is shared: an invoice, a password reset and a COLD CONSENT REQUEST
// all leave through it. Gating it unconditionally would stop mail R114 does not govern —
// which the founder explicitly forbade. So the cold IDENTITY is what triggers the gate there,
// and the identity is checked at the seam rather than trusted from a flag.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: {} }))

import { outreachDeliveryPermitted, killSwitchOn, killSwitchBlocks, KILL_SWITCH_REFUSAL } from './outreach-kill-switch'

const SRC = join(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) { walk(p, out); continue }
    if (!p.endsWith('.ts') || p.endsWith('.test.ts')) continue
    out.push(p)
  }
  return out
}

const FILES = walk(SRC)
const rel = (p: string) => p.slice(SRC.length + 1)

/** Executable lines only — a comment naming a provider is not a call to one. */
const code = (s: string) => s.split('\n')
  .map(l => (l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/*') ? '' : l))
  .join('\n')

/**
 * What "a message can leave the process here" looks like.
 *
 * ⚠️ THE PATTERNS ARE THE EGRESS CALLS THEMSELVES, not imports or type references. An import
 * of `resend` proves nothing; `resend.emails.send(` is the moment mail leaves.
 */
const EGRESS = [
  { kind: 'resend', re: /\.emails\.send\(/g },
  { kind: 'smtp', re: /\.sendMail\(/g },
  { kind: 'linkedin', re: /api\.phantombuster\.com/g },
  { kind: 'smartlead', re: /api\.smartlead\.ai/g },
  { kind: 'instantly', re: /api\.instantly\.ai/g },
] as const

/**
 * 🛑 THE EXEMPTIONS, EACH WITH ITS REASON.
 *
 * ⚠️ EVERY ENTRY IS TRANSACTIONAL OR INBOUND — mail the founder's rule does not govern.
 * Adding a file here is a decision somebody has to defend in review; that is the point of the
 * list being explicit rather than a pattern.
 */
const TRANSACTIONAL: Record<string, string> = {
  'lib/alerts.ts': 'Founder alerts to us. Never to a prospect.',
  'lib/email.ts': 'Shared transactional seam (invoices, resets, receipts) — the COLD identity inside it IS gated; see the sendTx cold branch.',
  'lib/partner-invite-email.ts': 'Partner invitations. A partner is not an outreach prospect.',
  'lib/vida.ts': 'Operator-facing notifications to our own team.',
  'lib/resend-checked.ts': 'Interprets a Resend result. Sends nothing itself.',
  'lib/sending-inbox.ts': 'Mailbox verification — proves a mailbox works; delivers no outreach.',
  'routes/internal.ts': 'Digests, briefs, at-risk alerts and lapse notices, all from the transactional identity, to us or to existing clients.',
  'routes/founder.ts': 'The founder support agent replying to inbound mail (R110 gates it by suppression, not by the outreach switch).',
  'routes/partners.ts': 'Partner lifecycle mail to people who signed up as partners.',
  'routes/team.ts': 'Team member invitations to our own product. Not a prospect.',
  'routes/subscribe.ts': 'Someone asking US to contact them — inbound, by definition.',
  'routes/demo-request.ts': 'A demo request that came to us.',
  'routes/proposals.ts': 'A proposal to an existing client relationship.',
  'lib/smartlead-inbound.ts': 'Inbound reply ingestion. Reads; does not send.',
  'lib/reply-ingest.ts': 'Inbound reply ingestion.',
  'lib/reply-pipeline.ts': 'Inbound reply handling.',
  'lib/smartlead-backfill.ts': 'Backfills historical rows. Its one send path reads the switch directly.',
  'lib/provider-eviction.ts': 'Removes prospects FROM a provider. Eviction is the opposite of delivery.',
  'lib/startup-check.ts': 'Configuration probe at boot. Reports what is set; sends nothing.',
  'lib/system-probes.ts': 'Configuration probes for the health screen. Sends nothing.',
  'lib/cron-health.ts': 'Cron liveness reporting to us.',
  'lib/db-connection.ts': 'Database connection helper. Sends nothing at all.',
  'lib/pending-migrations.ts': 'Migration SQL held as strings. Sends nothing; the match is prose inside a comment.',
  'lib/sequence-templates.ts': 'Outreach COPY templates. Produces words; delivers none of them.',
  'lib/house-client.ts': 'House identifiers and helpers. Sends nothing.',
  'lib/approve-lead.ts': 'Approval bookkeeping — its provider push goes through the gated smartlead seam.',
  'lib/send-gate.ts': 'The suppression gate itself. Decides; never sends.',
  'routes/engine.ts': 'Engine diagnostics for our own operators. Sends no prospect mail.',
  'routes/figsy.ts': 'Client-facing campaign routes — every send goes through sendSequenceEmailCore, which asks first.',
  'routes/operator.ts': 'Operator surface — its two real send paths go through the gated cold seam and sendAs.',
}

/**
 * The files that MUST ask the switch, and the exact function the question lives in.
 *
 * ⚠️ THE FUNCTION IS NAMED, NOT JUST THE FILE. A provider client also holds READ calls —
 * `verifySmartlead`, `listCampaigns` — which legitimately run before any gate, so a
 * whole-file "gate before first fetch" check would be measuring the wrong call.
 */
const GATED: Record<string, { why: string; fn: string }> = {
  'lib/mailer.ts': { why: 'SMTP seam — every authenticated client mailbox send.', fn: 'sendAs' },
  'lib/linkedin.ts': { why: 'PhantomBuster push.', fn: 'dispatchLinkedInStep' },
  'lib/smartlead.ts': { why: 'A prospect entering a live sending engine IS delivery.', fn: 'addLeads' },
  'lib/instantly.ts': { why: 'Same seam, same reason.', fn: 'addLead' },
  'lib/figsy.ts': { why: 'Cron, operator run, preview and every sequence step.', fn: 'sendSequenceEmailCore' },
}

/**
 * ⚠️ UPSTREAM CHECKS THAT ARE DEFENCE IN DEPTH, NOT THE SEAM.
 *
 * These files ask the switch and hold no egress of their own: the Smartlead and Instantly
 * gates USED to live only here, which is the "callers usually check" shape the founder's rule
 * rejects — the provider clients now ask at the moment of delivery. They are kept and asserted
 * because two independent gates is the pattern the send path already uses everywhere else.
 */
const UPSTREAM_DEPTH = [
  'lib/smartlead-map.ts', 'lib/smartlead-send.ts', 'lib/instantly-map.ts', 'lib/instantly-push.ts',
]

describe('🛑 ① the switch itself is one definition, and both spellings agree', () => {
  beforeEach(() => { process.env.AUTO_OUTREACH_ENABLED = '' })

  it('permitted and killSwitchOn are exact inverses, always', () => {
    for (const v of ['true', 'TRUE', '1', '', 'false', 'yes']) {
      process.env.AUTO_OUTREACH_ENABLED = v
      expect(killSwitchOn()).toBe(!outreachDeliveryPermitted())
    }
  })

  it('🛑 ONLY the exact lowercase "true" permits delivery — everything else is OFF', () => {
    for (const notTrue of ['TRUE', 'True', '1', 'yes', 'on', ' true', 'true ', '']) {
      process.env.AUTO_OUTREACH_ENABLED = notTrue
      expect(outreachDeliveryPermitted(), `"${notTrue}" permitted delivery`).toBe(false)
    }
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    expect(outreachDeliveryPermitted()).toBe(true)
  })

  it('the seam helper BLOCKS when the switch is on, and passes when it is off', () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    expect(killSwitchBlocks('smtp', 'x')).toBe(true)
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    expect(killSwitchBlocks('smtp', 'x')).toBe(false)
  })

  it('the refusal names the variable, so an operator is not left guessing', () => {
    expect(KILL_SWITCH_REFUSAL).toContain('AUTO_OUTREACH_ENABLED')
    expect(KILL_SWITCH_REFUSAL).toContain('Nothing was sent')
  })
})

describe('🛑 ② EVERY egress point in the API is classified — enumerated, not sampled', () => {
  /** Every file that can actually put a message on the wire. */
  const egressFiles = FILES.filter(f => {
    const c = code(readFileSync(f, 'utf8'))
    return EGRESS.some(e => new RegExp(e.re.source).test(c))
  }).map(rel).sort()

  it('the enumeration finds the seams we know about — otherwise it proves nothing', () => {
    // ⚠️ NON-VACUOUS. If the patterns stopped matching, every assertion below would pass on an
    // empty list. These four are the seams the 10 Sep audit walked by hand.
    expect(egressFiles).toContain('lib/mailer.ts')
    expect(egressFiles).toContain('lib/email.ts')
    expect(egressFiles).toContain('lib/linkedin.ts')
    expect(egressFiles.length).toBeGreaterThan(10)
  })

  it('🛑 every egress file is either GATED or explicitly EXEMPT — no third category', () => {
    const unclassified = egressFiles.filter(f => !(f in GATED) && !(f in TRANSACTIONAL))
    expect(unclassified,
      'a new outbound path exists that nobody has classified as outreach or transactional. ' +
      'Add it to GATED (and ask the kill-switch at its seam) or to TRANSACTIONAL (with a reason).',
    ).toEqual([])
  })

  it('🛑 every GATED file actually asks the switch', () => {
    for (const [file, { why }] of Object.entries(GATED)) {
      const c = code(readFileSync(join(SRC, file), 'utf8'))
      const asks = /killSwitchBlocks\(|outreachDeliveryPermitted\(|outreachEnabled\(/.test(c)
      expect(asks, `${file} (${why}) does not ask the kill-switch`).toBe(true)
    }
  })

  it('🛑 …and asks it BEFORE the provider call, not after', () => {
    for (const [file, { fn }] of Object.entries(GATED)) {
      const whole = code(readFileSync(join(SRC, file), 'utf8'))
      // Scoped to the delivery function itself — see the note on GATED.
      const at = whole.indexOf(`function ${fn}(`)
      expect(at, `${file}: ${fn} not found`).toBeGreaterThan(-1)
      const c = whole.slice(at, at + 4000)
      const gate = Math.min(...[/killSwitchBlocks\(/, /outreachDeliveryPermitted\(/, /outreachEnabled\(/]
        .map(re => { const m = re.exec(c); return m ? m.index : Number.MAX_SAFE_INTEGER }))
      // ⚠️ MEASURED AGAINST THE CALL, NOT A CONSTANT. `instantly.ts` declares its base URL at
      // the top of the file, and matching that would compare the gate to a string literal
      // rather than to the moment anything leaves.
      const send = Math.min(...[/\.emails\.send\(/, /\.sendMail\(/, /await fetch\(/]
        .map(re => { const m = re.exec(c); return m ? m.index : Number.MAX_SAFE_INTEGER }))
      expect(gate, `${file}: ${fn} does not ask the kill-switch`).toBeLessThan(Number.MAX_SAFE_INTEGER)
      expect(gate, `${file}: ${fn} reaches the provider before asking the switch`).toBeLessThan(send)
    }
  })

  it('the exemption list carries a REASON for every entry — never a bare filename', () => {
    for (const [file, reason] of Object.entries(TRANSACTIONAL)) {
      expect(reason.length, `${file} is exempt with no reason`).toBeGreaterThan(20)
    }
  })

  it('the upstream checks are STILL there — two gates, not one moved', () => {
    for (const file of UPSTREAM_DEPTH) {
      const c = code(readFileSync(join(SRC, file), 'utf8'))
      // ⚠️ THESE ARE PURE DECISION MODULES: they receive `outreachDeliveryPermitted` as a
      // FIELD rather than calling it, which is why the shape differs from a seam.
      expect(/killSwitchBlocks\(|outreachDeliveryPermitted|outreachEnabled/.test(c),
        `${file} lost its upstream kill-switch check`).toBe(true)
    }
  })

  it('🛑 no exemption is also gated, and no file is on both lists', () => {
    const both = Object.keys(GATED).filter(f => f in TRANSACTIONAL)
    expect(both, 'a file is claimed as both gated and exempt').toEqual([])
  })
})

describe('🛑 ③ the cold identity cannot leave through the transactional seam', () => {
  it('sendTx gates on the IDENTITY, not only on a caller-supplied flag', () => {
    // A caller that forgets `cold: true` but reaches COLD_FROM is still refused — "a switch
    // each caller must remember is a convention, not a kill-switch".
    const c = code(readFileSync(join(SRC, 'lib', 'email.ts'), 'utf8'))
    expect(c).toContain('const isColdIdentity = from === COLD_FROM')
    expect(c).toContain('if (opts.cold || isColdIdentity) {')
    expect(c).toContain("killSwitchBlocks('resend_cold'")
  })

  it('…and the gate sits before the provider call in that function', () => {
    const c = code(readFileSync(join(SRC, 'lib', 'email.ts'), 'utf8'))
    const fn = c.slice(c.indexOf('async function sendTx'), c.indexOf('export async function sendColdEmail'))
    expect(fn.indexOf('killSwitchBlocks')).toBeGreaterThan(-1)
    expect(fn.indexOf('killSwitchBlocks'), 'sendTx sends before it asks')
      .toBeLessThan(fn.indexOf('.emails.send('))
  })

  it('🛑 the operator campaign test no longer builds its own Resend client', () => {
    // It did, with COLD_FROM, checking the switch twenty lines earlier at the top of the route
    // — the exact "convention, not a kill-switch" shape.
    const c = code(readFileSync(join(SRC, 'routes', 'operator.ts'), 'utf8'))
    expect(c.includes("new ResendCls("), 'a hand-rolled cold client is back').toBe(false)
    expect(c).toContain('const { sendColdEmail } = await import(\'../lib/email\')')
  })

  it('the consent request asks the switch itself, ahead of any database read', () => {
    const c = code(readFileSync(join(SRC, 'lib', 'email.ts'), 'utf8'))
    const fn = c.slice(c.indexOf('export async function sendConsentEmail'))
    expect(fn.indexOf('killSwitchBlocks')).toBeGreaterThan(-1)
    expect(fn.indexOf('killSwitchBlocks'), 'the blocklist is read before the switch is asked')
      .toBeLessThan(fn.indexOf('opt_out_blocklist'))
  })
})

describe('🛑 ④ no bypass exists — for anyone', () => {
  const figsy = code(readFileSync(join(SRC, 'lib', 'figsy.ts'), 'utf8'))

  it('the send core asks the switch FIRST, before any authority or preview branch', () => {
    const gate = figsy.indexOf('outreachEnabled()')
    expect(gate).toBeGreaterThan(-1)
    const core = figsy.slice(figsy.indexOf('async function sendSequenceEmailCore'))
    expect(core.indexOf('outreachEnabled()')).toBeGreaterThan(-1)
  })

  it('🛑 there is no founder, canary, House or test exemption in any gated seam', () => {
    for (const file of Object.keys(GATED)) {
      const c = code(readFileSync(join(SRC, file), 'utf8'))
      // A gated file may MENTION these; what it may not do is make the switch conditional on
      // one. The scan looks for the switch being skipped for an actor.
      for (const bypass of [
        /if\s*\(\s*!?\s*isHouse[^)]*\)\s*\{?\s*(?:return\s+)?(?:await\s+)?[^\n]*emails\.send/,
        /isPreview\s*&&[^\n]*outreachEnabled/,
        /canary[^\n]*outreachEnabled/i,
        /founder[^\n]*outreachEnabled/i,
      ]) {
        expect(bypass.test(c), `${file} makes the kill-switch conditional on an actor`).toBe(false)
      }
    }
  })

  it('operator Run carries its own second key AND the switch — additive, never instead', () => {
    const c = code(readFileSync(join(SRC, 'routes', 'operator.ts'), 'utf8'))
    const run = c.slice(c.indexOf("operatorRouter.post('/send-due/run-once'"))
    expect(run).toContain('outreachDeliveryPermitted()')
    expect(run).toContain('operatorSendEnabled()')
    expect(run.indexOf('outreachDeliveryPermitted()'), 'the operator key is asked before the switch')
      .toBeLessThan(run.indexOf('operatorSendEnabled()'))
  })
})

describe('🛑 ⑤ the four delivery invariants #1678 established still hold', () => {
  const programme = code(readFileSync(join(SRC, 'lib', 'programme.ts'), 'utf8'))
  const authority = code(readFileSync(join(SRC, 'lib', 'programme-authority.ts'), 'utf8'))

  it('P2 does not Make Live', () => {
    const p2 = programme.slice(programme.indexOf('export async function recordSecondPayment'),
                               programme.indexOf('export function programmeStageOf'))
    expect(/went_live_at\s*:/.test(p2), 'P2 stamps a go-live').toBe(false)
    expect(p2.includes("status: 'LIVE'"), 'P2 writes LIVE').toBe(false)
  })

  it('Make Live sends zero, and grants no run authority', () => {
    const live = programme.slice(programme.indexOf('export async function goLiveProgramme'),
                                 programme.indexOf('export async function runProgramme'))
    expect(live.includes('run_at'), 'Make Live grants delivery authority').toBe(false)
    for (const send of ['emails.send', 'sendAs(', 'sendSequenceEmail']) {
      expect(live.includes(send), `Make Live sends: ${send}`).toBe(false)
    }
  })

  it('an armed-but-un-Run programme is unsendable', () => {
    expect(authority).toContain("return refuse('programme_not_run',")
    expect(code(readFileSync(join(SRC, 'lib', 'send-due.ts'), 'utf8')))
      .toContain("if (openId === '__not_run__') return false")
  })

  it('Run is explicit, persisted and idempotent — and sends nothing itself', () => {
    const run = programme.slice(programme.indexOf('export async function runProgramme'))
    expect(run).toContain(".is('run_at', null)")
    for (const send of ['emails.send', 'sendAs(', 'sendSequenceEmail', 'next_send_at']) {
      expect(run.includes(send), `Run reaches into delivery: ${send}`).toBe(false)
    }
  })
})
