// ⚑ 29 Sep (R174 ⑧ · PR 8e) — THE DEMO SWEEP OPENS EVERY PAGE, AND A NEW PAGE CANNOT DODGE IT.
//
// The browser sweep (`scripts/fullstack/demo-shots.mjs`, run by `scripts/demo-walk.sh` inside the
// full check) lists the pages it opens. This test holds that list against the app itself: every
// Milla page on disk, every Vida menu entry, every Vida tab. Add a page or a tab and forget the
// demo, and this is red (R173). The retired words it fails on are the code guard's own list.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { COCKPIT_TABS } from '../../../admin/src/lib/vida-cockpit-tabs'
import { RETIRED_CLIENT_WORDS } from './retired-words-guard.test'

const root = process.cwd()
const SWEEP = readFileSync(join(root, 'scripts/fullstack/demo-shots.mjs'), 'utf8')
const listed = (name: string): string[] => {
  const m = SWEEP.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\]`))
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []
}

function millaPagesOnDisk(dir: string, base: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...millaPagesOnDisk(p, `${base}/${name}`))
    else if (name === 'page.tsx') out.push(base)
  }
  return out
}

describe('the sweep covers every page', () => {
  it('every Milla page on disk is opened (the welcome page at Brief)', () => {
    const onDisk = millaPagesOnDisk(join(root, 'apps/portal/src/app/(milla)/milla'), '/milla')
    expect(onDisk.length).toBeGreaterThan(15)
    const swept = new Set([...listed('MILLA_PAGES'), '/milla/welcome'])
    // /milla/teams redirects to Command Centre (4d) — its destination is swept.
    const missing = onDisk.filter(p => !swept.has(p) && p !== '/milla/teams')
    expect(missing).toEqual([])
  })
  it('every Vida menu entry is opened', () => {
    const nav = readFileSync(join(root, 'apps/admin/src/lib/vida-nav.ts'), 'utf8')
    const hrefs = [...nav.matchAll(/href: '([^']+)'/g)].map(m => m[1])
    expect(hrefs.length).toBeGreaterThan(15)
    const swept = new Set(listed('VIDA_PAGES').map(p => p.split('?')[0]))
    expect(hrefs.filter(h => !swept.has(h))).toEqual([])
  })
  it('every Vida tab is opened with the demo in it', () => {
    expect(listed('VIDA_TABS')).toEqual([...COCKPIT_TABS])
  })
  it('it fails on the same retired words as the code guard, read from one file', () => {
    expect(SWEEP).toContain("new URL('./retired-client-words.json', import.meta.url)")
    expect(RETIRED_CLIENT_WORDS.length).toBeGreaterThanOrEqual(7)
    expect(SWEEP).toContain('...retiredIn(text)')
    expect(SWEEP).toContain('redTextOn(page)')
  })
})

// ⚑ 29 Sep (R174 · fix) — THE SWEEP SEES THE REAL PAGES. The harness's `auth.uid()` read only the
// old one-setting form, so a signed-in client was nobody through the REST gateway and every Milla
// page past Brief bounced to the Brief — which the sweep then "passed". Both halves are held here.
describe('the sweep sees the page it asked for', () => {
  it('the harness reads a login the way Supabase does (the JSON claims too)', () => {
    const boot = readFileSync(join(root, 'scripts/realdb/bootstrap.sql'), 'utf8')
    const uid = boot.slice(boot.indexOf('create or replace function auth.uid()'), boot.indexOf('create or replace function auth.role()'))
    expect(uid).toContain("current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'")
  })
  it('a Milla page that lands on the Brief past the Brief fails the sweep', () => {
    expect(SWEEP).toContain("if (stage === 'Brief' ? landed !== '/milla/welcome' : landed !== want) bad.push(")
    expect(SWEEP).toContain("const MILLA_MOVED = { '/milla/campaign': '/milla/programme'")
  })
})
