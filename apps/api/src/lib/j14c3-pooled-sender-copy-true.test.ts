// ══════════════════════════════════════════════════════════════════════════════════════════
// J14-C3 · THE CLIENT IS TOLD WHOSE MAILBOX IT IS (R129)
//
// REQ: *"Client copy states pooled truth."* RED: *"Client copy claims a dedicated sender."*
//
// ── ONE LINE, AND IT SAID HALF OF SOMETHING ─────────────────────────────────────────────
//
// The approval screen said **"Sent from ada@…"** and stopped. That is not a false sentence;
// it is an incomplete one, and the reading it leaves available is the wrong one. R129 (16 Sep,
// founder-locked): *"For MVP1 use the KISS approach: ENV-BACKED POOLED SENDER INVENTORY +
// `client_inboxes` as durable assignment/claim truth."* — so for most clients that address is
// one WE own and hold for them while their programme runs.
//
// 🛑 WHAT A CLIENT DOES WITH THE WRONG READING. They go looking for the replies in a mailbox
// they cannot open; they read a warm-up limit as their own domain being throttled; and if they
// ever leave, they expect to keep an address that was never theirs. None of that is repaired
// by us being technically accurate on a screen they only read once.
//
// ── AND IT IS NOT ALWAYS POOLED, WHICH IS WHY THE KIND IS READ RATHER THAN ASSUMED ──────
//
// `client_inboxes.kind` also admits `branded` — a client's own domain. Telling that client
// "this is ours" is the same defect pointing the other way, so the sentence is chosen by the
// kind, and an unread kind produces NO claim at all: a guess about whose mailbox a client is
// sending from is worse than the bare address they had before.
//
// ⚠️ READING THE KIND LIVE DOES NOT BREAK THE FREEZE, and the distinction is exact: the frozen
// package pins WHICH mailbox (`sender` is `id|email`), and this reads a property OF that exact
// mailbox by its frozen id. Nothing here can change which sender was approved.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const codeOf = (p: string): string =>
  readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

const ROUTE = codeOf(join(__dirname, '../routes/my-programme.ts'))
const SURFACE_PATH = join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx')
const SURFACE = codeOf(SURFACE_PATH)

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE ROUTE READS WHOSE IT IS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J14-C3 · the kind of the frozen sender is read, never assumed', () => {
  const block = (() => {
    const at = ROUTE.indexOf('let senderKind')
    expect(at, 'the sender-kind read is gone — the client sees a bare address again')
      .toBeGreaterThan(-1)
    return ROUTE.slice(at, ROUTE.indexOf('const { readFrozenReviewPage', at))
  })()

  it('🛑 IT READS `client_inboxes.kind` — it does not hardcode "pooled"', () => {
    expect(block).toContain(".select('kind')")
    expect(block, 'the screen would claim every sender is pooled, including a branded one')
      .not.toMatch(/senderKind = 'pooled'/)
  })

  it('🛑 BY THE FROZEN SENDER\'S OWN ID — so it describes the mailbox that was approved', () => {
    expect(block).toContain('rawSender.slice(0, rawSender.indexOf(\'|\'))')
    expect(block).toContain(".eq('id', inboxId)")
  })

  it('🛑 AND IT IS CLIENT-SCOPED — a guessed id must not read another tenant\'s mailbox', () => {
    expect(block).toContain(".eq('client_id', clientId)")
  })

  it('🛑 AN UNREADABLE KIND IS `null`, NOT A GUESS', () => {
    expect(block).toContain('console.error')
    expect(block, 'a failed read falls back to a claim about whose mailbox this is')
      .not.toMatch(/inboxErr[\s\S]{0,200}senderKind = '/)
  })

  it('it rides on the frozen block, beside the address it qualifies', () => {
    expect(ROUTE).toContain('frozen: frozen ? { ...frozen, sender_kind: senderKind } : null')
  })

  it('🛑 AND THE FREEZE IS UNTOUCHED — the package still pins which sender', () => {
    // The digest is not re-versioned and the snapshot is not rewritten: this reads a property
    // of the frozen mailbox, it does not add one to the frozen package.
    expect(block, 'the review route writes to the snapshot').not.toMatch(/\.update\(|snapshot =/)
    expect(ROUTE).toContain('sender_email: ((): string | null =>')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE SCREEN SAYS IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J14-C3 · the approval screen states the pooled truth', () => {
  it('🛑 A POOLED ADDRESS IS NAMED AS OURS, IN WORDS A CLIENT CAN ACT ON', () => {
    expect(SURFACE).toContain("frozen.sender_kind === 'pooled'")
    expect(SURFACE, 'the screen still lets a pooled address read as the client\'s own')
      .toMatch(/not your own mailbox/)
    // And it answers the question the wrong reading creates: where do the replies go?
    expect(SURFACE).toMatch(/Replies come back to us and appear in Milla/)
  })

  it('🛑 A BRANDED ADDRESS IS NOT DESCRIBED AS OURS', () => {
    expect(SURFACE).toContain("frozen.sender_kind === 'branded'")
    const at = SURFACE.indexOf("frozen.sender_kind === 'branded'")
    const branded = SURFACE.slice(at, at + 260)
    expect(branded).toContain('your own sending address')
    expect(branded, 'a client\'s own domain is described as one we provide')
      .not.toContain('we provide')
  })

  it('🛑 AND AN UNREAD KIND CLAIMS NOTHING — the address still shows', () => {
    // Both sentences are gated on an exact value, so `null` and any future kind render the
    // address alone rather than the wrong claim.
    expect(SURFACE, 'the pooled sentence renders whenever a kind is merely present')
      .not.toMatch(/sender_kind \?\?|sender_kind \|\||sender_kind !== 'branded'/)
    expect(SURFACE).toMatch(/\{frozen\.sender_email\}/)
  })

  it('the qualifier travels WITH the address, never as a separate line', () => {
    // A caveat in another block is a caveat a redesign drops. It is inside the same paragraph
    // as the address, exactly as the meeting target's "a target, not a guarantee" is.
    const at = SURFACE.indexOf('Sent from')
    const para = SURFACE.slice(at, SURFACE.indexOf('</p>', at))
    expect(para).toContain('sender_kind')
  })

  it('🛑 and no screen tells a client the mailbox is theirs anywhere else', () => {
    // 🛑 THE WHOLE `(milla)` GROUP, WALKED. One corrected sentence beside another screen still
    // promising a dedicated inbox would leave the client believing the wrong one.
    const { readdirSync, statSync } = require('node:fs') as typeof import('node:fs')
    const root = join(__dirname, '../../../portal/src/app/(milla)')
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (name.endsWith('.tsx')) out.push(p)
      }
      return out
    }
    const offenders = walk(root)
      .filter(p => /your own (?:dedicated )?(?:inbox|mailbox|sending address)|dedicated (?:inbox|mailbox|sender)/i.test(codeOf(p)))
      .map(p => p.slice(p.indexOf('(milla)')))
    expect(offenders, 'a Milla screen promises the client a mailbox of their own').toEqual([])
  })
})
