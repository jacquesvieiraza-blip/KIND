import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// #644 — A CLIENT MUST BE ABLE TO REACH THEIR OWN REPLIES.
//
// Found 12 Aug by the founder pressing it during the first A11 walk: Milla's rail listed
// "someone replied · interested" and nothing opened it. Not a styling problem — the entries
// were `<div>`s with no Link, no href, no onClick and no route, and the rail carried no
// Replies entry either, so there was no other way in. The reply screen existed and worked the
// entire time. Nothing navigated to it.
//
// 2,157 tests missed this because every one of them asked whether something RENDERS. None
// asked whether what renders can be reached. That is the gap this file closes: the reply is
// the outcome the client pays for, and "visible but unreachable" is the same as absent.

const SHELL = join(__dirname, '../../../portal/src/components/milla/MillaShell.tsx')
const ROUTE = join(__dirname, '../../../portal/src/app/(milla)/milla/replies/page.tsx')

describe('#644 — replies are reachable from Milla', () => {
  const shell = readFileSync(SHELL, 'utf8')

  it('the /milla/replies route exists', () => {
    expect(existsSync(ROUTE), 'the rail cannot link to a route that does not exist').toBe(true)
  })

  it('the route renders the REAL inbox rather than a second copy of it', () => {
    // A duplicate reply UI is how two screens come to disagree about what a reply looks like.
    const route = readFileSync(ROUTE, 'utf8')
    expect(route).toContain('dashboard/inbox/page')
  })

  it('the rail has a Replies entry', () => {
    expect(shell).toContain("'/milla/replies', 'Replies'")
  })

  it('and each recent-reply entry is a Link, not an inert div', () => {
    // The exact regression: `<div key={i} …>` wrapping the reply name. If this file ever goes
    // back to rendering the list as a plain element, this fails.
    const list = shell.slice(shell.indexOf('recent_replies ?? []'), shell.indexOf('recent_replies ?? []') + 900)
    expect(list, 'recent replies must be wrapped in <Link>').toContain('<Link')
    expect(list).toContain('href="/milla/replies"')
  })

  it('the reply list is not rendered as a bare <div> row any more', () => {
    const list = shell.slice(shell.indexOf('recent_replies ?? []'), shell.indexOf('recent_replies ?? []') + 900)
    expect(
      /\.map\(\(r, i\) => \(\s*<div/.test(list),
      'the map must not emit a <div> as the clickable row — that is the #644 defect verbatim',
    ).toBe(false)
  })
})

describe('#644 — the client can find replies without already knowing where they are', () => {
  const shell = readFileSync(SHELL, 'utf8')

  it('Replies sits in the rail nav alongside the other workspace destinations', () => {
    const nav = shell.slice(shell.indexOf("link('/milla',"), shell.indexOf("section('Recent replies')"))
    // ⛓️ 30 Aug (BUILD-004A-1) — TWO LABELS RENAMED BY FOUNDER RULING, NOT BY ME.
    // 'New leads' → 'Home' (ruling 1: it was the per-lead approval desk, and the programme
    // model has no per-lead approval) and 'My campaign' → 'Programme' (approved nav rename).
    // #644's actual invariant is untouched and is what this still tests: a client can REACH
    // replies from the rail without already knowing where they are.
    for (const dest of ['Home', 'Pipeline', 'Meetings', 'Programme', 'Replies']) {
      expect(nav, `${dest} must be reachable from the rail`).toContain(dest)
    }
  })
})
