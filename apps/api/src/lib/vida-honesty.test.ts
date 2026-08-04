import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `operator-audit` imports the Supabase client at module load, which needs env vars this
// suite deliberately does not have. The function under test is pure and touches none of it.
vi.mock('@kind/db', () => ({ db: { from: () => ({ insert: async () => ({ error: null }) }) } }))

import { campaignAuditAction } from './operator-audit'
import { panelView, loadError } from '@kind/shared'

// PROMPT 3 — THE VIDA HONESTY FIXES.
//
// Both defects are the same shape and it is the shape behind most of this week: a screen or a
// log that states something confidently, and is wrong. A blank console and a broken console
// looked identical; pressing Run recorded a pause.

// ── #564 ──────────────────────────────────────────────────────────────────────────────
// The audit log is the only record of who did what to a client's account, and it was writing
// `pause_campaign` for EVERYTHING on the campaign routes. Pressing "Run it" therefore logged
// the OPPOSITE of what happened — worse than no log, because a wrong log stops you looking.
describe('#564 — the audit log records the real action', () => {
  it('pressing RUN records a resume, NOT a pause', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'active' })).toBe('resume_campaign')
  })

  it('pressing PAUSE records a pause', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'paused' })).toBe('pause_campaign')
  })

  it('renaming or re-capping records an EDIT — not a start, not a stop', () => {
    // This was the quieter half: every settings save logged `pause_campaign`, so the log
    // claimed the operator had stopped a campaign they only renamed.
    expect(campaignAuditAction({ isNew: false })).toBe('edit_campaign')
    expect(campaignAuditAction({ isNew: false, nextStatus: null })).toBe('edit_campaign')
  })

  it('creating a campaign still records a start', () => {
    expect(campaignAuditAction({ isNew: true })).toBe('start_campaign')
    expect(campaignAuditAction({ isNew: true, nextStatus: 'active' })).toBe('start_campaign')
  })

  it('run and pause are never the same value — the whole bug in one assertion', () => {
    expect(campaignAuditAction({ isNew: false, nextStatus: 'active' }))
      .not.toBe(campaignAuditAction({ isNew: false, nextStatus: 'paused' }))
  })
})

// ── #564, THE RESIDUAL ────────────────────────────────────────────────────────────────
//
// #564 fixed `setCampaignStatus` and left `startCampaign` carrying the exact pattern it had
// just condemned: parse the response, throw it away, empty catch, commented "surfaced by the
// reload". It never was — the reload re-rendered the same blocked state, so a refusal and a
// success looked identical.
//
// It is the "Just unblock them" button, which appears only when a client has NO campaign and
// therefore cannot be worked at all. That is the worst possible place for "nothing happened"
// to be unreadable: approvals are blocked and the $4 is deliberately not charged while it
// persists, so an operator who believes they fixed it leaves the client stuck.
//
// A React closure inside a 2,000-line page cannot be imported, so this reads the source — the
// same approach `reply-routing.test.ts` uses for the figsy webhook wiring. It asserts the
// SHAPE, not exact copy, so rewording a message does not fail the build.
describe('#564 residual — the start button surfaces its answer', () => {
  const page = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  // Bounded at the function's OWN closing brace — `\n  }` at the component's indentation,
  // which inner blocks (indented deeper) cannot produce.
  //
  // Two sloppier bounds were tried and both were wrong, which is worth recording because the
  // failure mode is a guard that silently measures the wrong text: a fixed character count
  // runs past the end, and slicing to the next `async function` still swallows THAT
  // function's leading comment — and `setCampaignStatus`'s comment quotes "surfaced by the
  // reload" while explaining the original defect. Either way the assertion below would have
  // been reading a comment about the bug instead of the code. This test failed on its own
  // first run and caught it.
  const fnBody = (name: string) => {
    const i = page.indexOf(`async function ${name}`)
    expect(i, `${name} must still exist`).toBeGreaterThan(-1)
    const end = page.indexOf('\n  }', i)
    return page.slice(i, end > i ? end + 4 : i + 1400)
  }
  const startFn = fnBody('startCampaign')

  it('THE COMMENT THAT NAMED THE BUG IS GONE', () => {
    // "surfaced by the reload" was the claim, and it was false. If it ever returns, so has
    // the defect.
    expect(startFn).not.toContain('surfaced by the reload')
  })

  it('no empty catch — a network failure must not vanish', () => {
    expect(startFn).not.toMatch(/catch\s*\{\s*\/\*/)
    expect(startFn).not.toMatch(/catch\s*\{\s*\}/)
  })

  it('the response is READ, not discarded', () => {
    // The old code awaited `.then(r => r.json())` and bound the result to nothing at all.
    expect(startFn).toMatch(/const\s+j\s*=\s*await\s+fetch/)
    expect(startFn).toContain('j?.success')
  })

  it('a refusal renders as an ERROR, not silence and not a success tone', () => {
    // `notice.error` is what makes it red. Fifteen failures once rendered in success teal.
    expect(startFn).toContain('notice.error')
  })

  it('a network failure carries the reason, not a shrug', () => {
    expect(startFn).toMatch(/e instanceof Error \? e\.message/)
  })

  it('it does NOT claim to have started something that already existed', () => {
    // The route returns `created: false` when the client already had an active campaign.
    // Reporting that as "started" is a smaller version of the same lie.
    expect(startFn).toContain('created')
  })

  it('it matches the sibling that was already fixed — one shape, not two', () => {
    const statusFn = fnBody('setCampaignStatus')
    for (const marker of ['setSaveMsg(null)', 'notice.error', 'notice.ok', 'setCockpitBusy(false); return']) {
      expect(startFn, `startCampaign should use ${marker} like setCampaignStatus does`).toContain(marker)
      expect(statusFn, marker).toContain(marker)
    }
  })
})

// ── #564 ② — THE LAST ONE OPEN ON THIS ITEM ──────────────────────────────────────────────
//
// `doNextAction('run')` fired `setCampaignStatus(activeCampaign.id, 'active')` with NO
// confirmation. One click began emailing real prospects — and because the worklist puts "Run"
// under the operator's cursor as the SUGGESTED next action, the dangerous click was also the
// obvious one.
//
// The other half was worse for being quiet: with no active campaign it switched tab and did
// nothing at all, having just told the operator the next action was "Run". A button that does
// nothing is indistinguishable from a broken one.
describe('#564 ② — Run asks first, and says so when there is nothing to run', () => {
  const page = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  // Bounded at the function's OWN closing brace — `\n  }` at the component's indentation.
  // A fixed character count overruns; slicing to the next declaration swallows THAT
  // function's leading comment. Both were tried on this file and both measured the wrong text.
  const fnBody = (name: string) => {
    const i = page.indexOf(`function ${name}`)
    expect(i, `${name} must still exist`).toBeGreaterThan(-1)
    const end = page.indexOf('\n  }', i)
    return page.slice(i, end > i ? end + 4 : i + 2000)
  }
  const doNext = fnBody('doNextAction')
  // ORDERING IS ASSERTED ON CODE ONLY. The comment above this branch QUOTES the old line
  // (`setCampaignStatus(activeCampaign.id, 'active')`) while explaining the defect, so a raw
  // indexOf finds the comment first and "proves" the status call precedes its own fix. Same
  // trap as the `express.static` bound in #560 and the "surfaced by the reload" bound in the
  // #564 residual — third time, hence the shared strip. (`reply-routing.test.ts` does this.)
  const codeOnly = (s: string) => s.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
  const doNextCode = codeOnly(doNext)

  it('THE CONFIRM EXISTS, and comes BEFORE the status call', () => {
    const c = doNextCode.indexOf('confirm(')
    const s = doNextCode.indexOf('setCampaignStatus(activeCampaign.id')
    expect(c, 'no confirm() in doNextAction').toBeGreaterThan(-1)
    expect(s, 'the status call vanished').toBeGreaterThan(-1)
    expect(c).toBeLessThan(s)
  })

  it('a declined confirm RETURNS — it does not fall through and start anyway', () => {
    expect(doNext).toMatch(/if \(!confirm\([\s\S]{0,400}?\)\) return/)
  })

  it('the prompt NAMES THE CLIENT — "are you sure?" on the wrong account is the accident', () => {
    expect(doNext).toContain('selectedClient?.company_name')
    expect(doNext).toContain('${who}')
  })

  it('it says plainly that REAL prospects get emailed', () => {
    expect(doNext).toContain('REAL prospects')
  })

  it('no campaign SAYS SO instead of silently no-opping', () => {
    // It used to switch tab and return. The tab switch is kept (it is where you write one),
    // but the operator is now told why nothing happened.
    expect(doNext).toContain('There is no campaign to run')
    expect(doNext).toContain('notice.error')
  })

  it('the no-campaign branch returns BEFORE anything is started', () => {
    const guard = doNextCode.indexOf('if (!activeCampaign)')
    const call = doNextCode.indexOf('setCampaignStatus(activeCampaign.id')
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(call)
  })

  it('the other next-actions are untouched — this is not a rewrite', () => {
    for (const kind of ['replies', 'approvals', 'qualify', 'sequence', 'inbox', 'chase']) {
      expect(doNext, kind).toContain(`kind === '${kind}'`)
    }
  })
})

// Folded in from the same file: the #565 shape in a place #565 never reached.
describe('#565 shape — a failed asks load is no longer "Nothing asked yet."', () => {
  const page = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
  const loadAsks = page.slice(page.indexOf('const loadAsks'), page.indexOf('\n  }', page.indexOf('const loadAsks')) + 4)

  it('the bare swallow is GONE', () => {
    expect(loadAsks).not.toMatch(/catch\s*\{\s*setAsks\(\[\]\);\s*setFromClient\(\[\]\)\s*\}/)
  })

  it('BOTH halves are covered — the !success branch swallowed too, not just the catch', () => {
    // `setAsks(j?.success ? j.data : [])` rendered an API refusal as an empty list, which is
    // the same lie by a different route.
    expect(loadAsks).not.toMatch(/setAsks\(j\?\.success \? j\.data : \[\]\)/)
    expect(loadAsks).toMatch(/if \(!j\?\.success\) throw/)
  })

  it('the reason is captured into loadFail, the way #565 already does', () => {
    expect(loadAsks).toContain('setLoadFail')
    expect(loadAsks).toContain('loadError(e)')
  })

  it('a successful reload CLEARS a previous failure', () => {
    // Otherwise one blip leaves a red banner over healthy data until the page is reloaded.
    expect(loadAsks).toMatch(/asks: undefined/)
  })

  it('the screen renders the failure, and distinguishes it from empty', () => {
    expect(page).toContain('Couldn&apos;t load this client&apos;s asks')
    expect(page).toContain('This is NOT')
    // The failure branch must be checked BEFORE the empty branch, or empty wins. Compared on
    // CODE only: the loadAsks comment quotes "Nothing asked yet." while explaining the defect,
    // so a raw indexOf finds the comment hundreds of lines earlier and inverts the result.
    const code = page.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(code.indexOf('loadFail.asks')).toBeLessThan(code.indexOf('Nothing asked yet.'))
  })
})

describe('#564 residual — the audit row says START', () => {
  const route = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')

  // ⚠️ SLICED TO THE END OF THE ROUTE, NOT TO A FIXED CHARACTER COUNT.
  //
  // This read `+ 1400` and went red on 4 Aug when #612 inserted the copy-quality gate near the
  // top of this handler — pushing `writeOperatorAudit` past the window. The audit call was
  // still there and still correct; the WINDOW had moved off it. A fixed-width slice asserts
  // "this appears within N characters", which is not the property anybody meant, and it fails
  // on unrelated edits until somebody widens the magic number — or, worse, deletes the test.
  // Bounded by the next route registration instead, so it covers exactly this handler however
  // long it grows.
  const start = route.indexOf("post('/campaign/start'")
  const nextRoute = route.indexOf('operatorRouter.', start + 10)
  const startRoute = route.slice(start, nextRoute > start ? nextRoute : undefined)

  it('the create path records start_campaign', () => {
    expect(startRoute).toContain("action: 'start_campaign'")
  })

  it('and NEVER pause_campaign — the original #564 defect', () => {
    // Pressing Run once wrote "paused the campaign": a log that says the opposite of what
    // happened is worse than no log, because a wrong log stops you looking.
    expect(startRoute).not.toContain("action: 'pause_campaign'")
  })

  it('the pure mapping agrees — a new campaign is a start whatever status it carries', () => {
    expect(campaignAuditAction({ isNew: true })).toBe('start_campaign')
    expect(campaignAuditAction({ isNew: true, nextStatus: 'active' })).toBe('start_campaign')
  })
})

// ── #565 ──────────────────────────────────────────────────────────────────────────────
// Three `.catch(() => {})` calls meant a failed load left the state empty, and the console
// rendered a calm "nothing to do" over an endpoint that was down — on the one screen whose
// job is telling the operator what to work on next.
describe('#565 — a failed load is never "nothing to do"', () => {
  it('a FAILED load says so, and says the absence proves nothing', () => {
    const v = panelView({ loading: false, error: 'API returned 500', count: 0, label: 'the worklist' })
    expect(v.state).toBe('failed')
    expect(v.message).toContain('Couldn\'t load')
    expect(v.message).toContain('NOT "nothing to do"')
    expect(v.message).toContain('API returned 500')   // the reason, not just a shrug
  })

  it('a failed load is NEVER trustworthy, even though its count is also zero', () => {
    // This is the assertion that matters. Both cases have count 0. Only one of them means
    // there is nothing to do.
    const failed = panelView({ loading: false, error: 'boom', count: 0, label: 'alerts' })
    const empty = panelView({ loading: false, error: null, count: 0, label: 'alerts' })
    expect(failed.trustworthy).toBe(false)
    expect(empty.trustworthy).toBe(true)
    expect(failed.state).not.toBe(empty.state)
  })

  it('a genuinely empty panel says so plainly', () => {
    const v = panelView({ loading: false, error: null, count: 0, label: 'the worklist' })
    expect(v.state).toBe('empty')
    expect(v.message).toContain('Nothing in the worklist')
  })

  it('a loaded panel with rows renders normally and says nothing', () => {
    const v = panelView({ loading: false, error: null, count: 7, label: 'the worklist' })
    expect(v.state).toBe('ready')
    expect(v.message).toBeNull()
    expect(v.trustworthy).toBe(true)
  })

  it('loading is not empty and not failed — it stays untrustworthy until it resolves', () => {
    const v = panelView({ loading: true, error: null, count: 0, label: 'alerts' })
    expect(v.state).toBe('loading')
    expect(v.trustworthy).toBe(false)
  })

  it('an error WINS over a count — a failed load has no count to believe', () => {
    // A partial response could carry rows AND an error. The rows are not evidence.
    const v = panelView({ loading: false, error: 'partial failure', count: 3, label: 'alerts' })
    expect(v.state).toBe('failed')
  })
})

describe('loadError', () => {
  it('uses the real message when there is one', () => {
    expect(loadError(new Error('fetch failed'))).toBe('fetch failed')
  })
  it('never returns an empty string — a blank reason renders as no reason at all', () => {
    expect(loadError(undefined)).toContain('gave no reason')
    expect(loadError('')).toContain('gave no reason')
    expect(loadError({})).toContain('gave no reason')
  })
})
