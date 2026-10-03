// 5d · part 1 (#2543) — THE CLIENT GIVES THEIR REGISTERED OFFICE, AND IT IS SAVED.
//
// ⛓️ R189 ⑥ (2 Oct): a client's emails end with their own company name and registered office,
// given by the client and checked before go-live. The company name was held; the registered
// office was held nowhere. Part 2 refuses Make Live without it; part 3 prints it on the emails.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('5d·1 — the registered office has a home', () => {
  it('a nullable column, in the runner and the canonical file, declared in schema.sql', () => {
    expect(existsSync(join(REPO, 'supabase/migrations/20261002_client_registered_office.sql'))).toBe(true)
    expect(read('apps/api/src/lib/pending-migrations.ts')).toContain("key: '20261002_client_registered_office'")
    expect(read('packages/db/src/schema.sql')).toMatch(/add column if not exists registered_office\s+text,/)
  })
  it('the API saves it', () => {
    expect(read('apps/api/src/routes/clients.ts')).toMatch(/registered_office:\s+z\.string\(\)\.max\(300\)\.optional\(\)/)
  })
  it('Milla Settings asks for it, says why, and never blanks it with an empty save', () => {
    const page = read('apps/portal/src/app/(milla)/milla/settings/page.tsx')
    expect(page).toContain('Registered office address')
    expect(page).toContain('Your company name and this address go at the bottom of every email we send for you.')
    expect(page).toContain("...(registered_office.trim() ? { registered_office: registered_office.trim() } : {})")
  })
})
