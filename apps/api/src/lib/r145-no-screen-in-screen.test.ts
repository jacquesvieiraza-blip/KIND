// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep — NO SCREEN INSIDE A SCREEN. Founder, on the live Vida: *"you have done a screen in a
// screen. thats not right. check milla for same issue"* · *"same for Milla."*
//
// Three nestings are pinned out: ① the app drawn as a card on a grey page (the design files'
// picture frame — pinned in `r145-one-chat-one-design.test.ts`); ② Vida's old "next action"
// card drawn above the lifecycle panel, a second header and scroll area over the panel's own;
// ③ the client's context stacked above Vida's chat as a second screen in the right column.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const code = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PAGE = code('../../../admin/src/app/vida/page.tsx')
const PANEL = code('../../../admin/src/components/vida/LifecyclePanel.tsx')
const CONV = code('../../../admin/src/components/vida/VidaConversation.tsx')

describe('no screen in a screen — Vida', () => {
  it('🛑 the old next-action card is only a fallback when the panel cannot render', () => {
    expect(PAGE).toContain('{selectedWork && !lcCopy && (')
  })

  it('🛑 the right column is Vida\'s conversation alone', () => {
    const at = PAGE.indexOf('<section className="mv-vida-chat w-[430px]')
    const chat = PAGE.slice(at, PAGE.indexOf('</section>', at))
    expect(chat).toContain('ref={conversation.setSlot}')
    for (const gone of ['scoped to this client only', '>Pipeline<', 'They still owe us:', 'historical wallet']) {
      expect(chat, gone).not.toContain(gone)
    }
  })

  it('🛑 …and the client\'s context is a section of the operator panel instead', () => {
    expect(PAGE).toContain('context={clientContext}')
    expect(PANEL).toContain('<b>This client</b>')
  })

  it('🛑 Vida\'s header opens her column; the blocker strip sits under it', () => {
    const head = CONV.indexOf('operational &amp; watching')
    const blockers = CONV.indexOf('>Blockers</span>')
    expect(head).toBeGreaterThan(-1)
    expect(blockers).toBeGreaterThan(head)
  })
})

describe('no screen in a screen — Milla', () => {
  it('🛑 the portal does not re-add the frame\'s height — the shell is the whole window', () => {
    const G = readFileSync(join(__dirname, '../../../portal/src/app/globals.css'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
    expect(G).not.toMatch(/100dvh - \d+px/)
    expect(G).toContain('.mv-root .mv-app-shell { height: 100dvh; }')
  })
})
