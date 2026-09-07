// ═══════════════════════════════════════════════════════════════════════════════════════
// AN EXISTING CLIENT CHANGING TARGETING IS NOT ONBOARDING AGAIN (founder-locked 7 Sep).
//
// THE LIVE DEFECT. From My ICP the founder pressed **"Build fresh targeting with Milla"** and
// was routed out of the portal to `/milla/welcome` — the new-client onboarding wizard, with
// its four steps (Welcome → Your target → Your plan → Go live) and the copy *"let's set up
// your campaign"*. He is an existing client with three ICPs and a live programme. Changing
// who you target is not signing up.
//
// ⚠️ THE CORRECT PATTERN WAS ALREADY ON THE SAME SCREEN. "↻ Change who we target — talk to
// Milla" calls `conversation.focus('icp')` and stays in the one portal, in the one persistent
// conversation. Three other controls called `router.push('/milla/welcome')` instead.
//
// FOUNDER DECISION, 7 Sep — the two existing-client routes stay in the portal; the ZERO-ICP
// "Set up with Milla" may keep `/milla/welcome`, because a client with no targeting at all
// genuinely IS onboarding. So this is not "remove the wizard" — it is "stop sending people
// who already have targeting back through it".
//
// RED PROOF: before the fix, `/milla/welcome` appears THREE times in this file and the two
// existing-client assertions below fail.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const ICP_PAGE = readFileSync(join(__dirname, '../app/(milla)/milla/icp/page.tsx'), 'utf8')
const CONVERSATION = readFileSync(join(__dirname, '../components/milla/MillaConversation.tsx'), 'utf8')

/** Executable lines only — a comment describing the removed route must not read as the route. */
const code = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

const ICP_CODE = code(ICP_PAGE)
const CONV_CODE = code(CONVERSATION)

/**
 * The `<button …>` element whose text is `label`, so an assertion is about THAT control.
 *
 * ⚠️ NOT `indexOf(label)`. The label text also appears inside this screen's own multi-line
 * JSX comments, whose continuation lines start with neither `//` nor `*` and therefore
 * survive `code()`. Matching the button ELEMENT is what makes the assertion about the
 * control rather than about prose that happens to quote it.
 */
function controlFor(label: string): string {
  const buttons = [...ICP_CODE.matchAll(/<button[\s\S]*?<\/button>/g)].map(m => m[0])
  const hit = buttons.filter(b => b.includes(`>${label}<`) || b.includes(label + '\n'))
  expect(hit.length, `no <button> on the My ICP screen renders "${label}"`).toBeGreaterThan(0)
  return hit.join('\n')
}

describe('an existing client never leaves the portal to change targeting', () => {
  it('the guard is reading the real screen (a guard that reads nothing passes everything)', () => {
    expect(ICP_CODE).toContain('Your targeting (ICP)')
    expect(ICP_CODE).toContain('Version history')
  })

  it('"Build fresh targeting with Milla" stays in the portal and enters FRESH ICP mode', () => {
    const block = controlFor('Build fresh targeting with Milla')
    expect(block).not.toContain('/milla/welcome')
    expect(block).toContain("focus('icp-fresh')")
  })

  it('"Change the targeting" stays in the portal too', () => {
    const block = controlFor('Change the targeting')
    expect(block).not.toContain('/milla/welcome')
    expect(block).toContain('focus(')
  })

  it('"Set up with Milla" — a genuine zero-ICP client — MAY still use the wizard', () => {
    // Founder decision: onboarding is untouched for someone with no targeting at all.
    const block = controlFor('Set up with Milla')
    expect(block).toContain('/milla/welcome')
  })

  it('exactly ONE /milla/welcome PUSH survives on this screen', () => {
    // The literal also appears in this screen's comments explaining what was removed, so the
    // count is of actual navigations, not of mentions.
    expect(ICP_CODE.split("router.push('/milla/welcome')").length - 1).toBe(1)
  })
})

describe('the ONE conversation knows fresh from refine', () => {
  it('`icp-fresh` is a real context, alongside `icp`', () => {
    expect(CONV_CODE).toMatch(/ConversationContext\s*=\s*'icp'\s*\|\s*'icp-fresh'\s*\|\s*null/)
  })

  it('a fresh save goes to /icps/fresh, and a refine still goes to /icps/revise', () => {
    expect(CONV_CODE).toContain("'/icps/fresh'")
    expect(CONV_CODE).toContain("'/icps/revise'")
  })

  it('the fresh button says it SAVES A NEW ONE, never "make this live"', () => {
    // The refine label is a promise about the live targeting. On the fresh path that promise
    // would be false — the new version is deliberately inactive.
    expect(CONV_CODE).toContain('Save as new targeting')
  })

  it('both ICP contexts still reach the SAME proposal endpoint — no second builder', () => {
    expect(CONV_CODE.split("'/icps/chat-build'").length - 1).toBe(1)
  })

  it('the refine path is unchanged — /icps/revise is still what an ordinary ICP context saves to', () => {
    expect(CONV_CODE).toMatch(/icps\/revise/)
    expect(CONV_CODE).toContain('Save — make this live')
  })
})
