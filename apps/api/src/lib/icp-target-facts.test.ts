import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// MVP1 (C04) — THE CLIENT'S WORDS REACH A COLUMN, AND THE PROVIDER LIST STAYS WHERE IT IS.
//
// 🛑 WHAT WAS BROKEN. `icps.industries` was the ONLY home for a target market, and it is a
// CLOSED SIXTEEN-VALUE LIST. A client who said "digital marketing agencies" had nowhere for
// that phrase: `boundedEnum` dropped it, so the model either substituted whichever of the
// sixteen seemed nearest — filtering Proof against a vocabulary nobody agreed — or omitted
// the field, in which case the ICP stored `industries: []` and `industryVerdict` returned
// 'yes' for every row on earth. Both failure modes are silent.
//
// ⚠️ THE FIX IS TWO COLUMNS, NOT A REPLACEMENT. `industries` is untouched and keeps doing
// its job as the provider-edge hint that the PDL and Apollo bodies already read. What is new
// is where the CLIENT's answer lives. That separation is the whole reason provider
// normalisation can stay at the provider edge without overwriting what they said.
//
// ⚠️ AND THEY ARE TWO FACTS, NOT ONE (founder-locked). A client who said "digital marketing"
// holds the category and NOT the organisational form. One column could not represent that.
//
// These assertions are structural on purpose: the write path is `{ ...body }` into
// `db.from('icps').insert(...)`, so what the schema admits IS what reaches the column.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const icpsSrc = read('apps/api/src/routes/icps.ts')
const schemaSql = read('packages/db/src/schema.sql')
const migration = read('supabase/migrations/20260911_icp_target_category_and_type.sql')
const runner = read('apps/api/src/lib/pending-migrations.ts')

describe('① the two facts have columns', () => {
  it('schema.sql declares both, on icps', () => {
    const icpsTable = schemaSql.slice(
      schemaSql.indexOf('create table if not exists public.icps ('),
      schemaSql.indexOf('icps_client_id_idx'),
    )
    expect(icpsTable).toContain('target_category')
    expect(icpsTable).toContain('target_company_type')
  })

  it('the migration adds both, additively and idempotently', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS target_category')
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS target_company_type')
  })

  it('🛑 the migration drops, renames and rewrites NOTHING', () => {
    // A migration that can destroy is a migration that will, on the one run nobody watched.
    expect(migration).not.toMatch(/\bDROP\b/i)
    expect(migration).not.toMatch(/\bRENAME\b/i)
    expect(migration).not.toMatch(/\bUPDATE\s+public\./i)
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(migration).not.toMatch(/\bTRUNCATE\b/i)
  })

  it('there is no backfill — an existing row reads NULL, which is "never collected"', () => {
    expect(migration).not.toMatch(/\bDEFAULT\b/i)
    expect(migration).toContain('no backfill')
  })

  it('it lives in BOTH homes — the file and the runner that actually executes', () => {
    expect(runner).toContain("key: '20260911_icp_target_category_and_type'")
    expect(runner).toContain('ADD COLUMN IF NOT EXISTS target_category')
  })
})

describe('② the client save carries them', () => {
  it('icpSchema admits both, so the insert payload carries them', () => {
    expect(icpsSrc).toMatch(/target_category:\s*z\.string\(\)\.max\(200\)\.default\(''\)/)
    expect(icpsSrc).toMatch(/target_company_type:\s*z\.string\(\)\.max\(120\)\.default\(''\)/)
  })

  it('the write path is still one spread into one insert — no second ICP system', () => {
    expect(icpsSrc).toContain("db.from('icps').insert({ ...body, client_id: clientId })")
  })
})

describe('③ the builder collects them from the client, not from a list', () => {
  it('both are OPEN text in the tool schema, never an enum', () => {
    const tool = icpsSrc.slice(icpsSrc.indexOf('const millaReplyTool'), icpsSrc.indexOf('/** Bounded validation'))
    expect(tool).toMatch(/target_category:\s*\{ type: 'string'/)
    expect(tool).toMatch(/target_company_type:\s*\{ type: 'string'/)
    // the closed list is still closed, and still only for `industries`
    expect(tool).toContain("items: { type: 'string', enum: [...ICP_INDUSTRIES] }")
  })

  it("the category is described as the client's own words, unrewritten", () => {
    const flat = icpsSrc.replace(/\s+/g, ' ')
    expect(flat).toContain("IN THE CLIENT'S OWN WORDS, exactly as they said it")
    expect(flat).toContain('never a label from a fixed list')
  })

  it('🛑 the company type may never be inferred', () => {
    const flat = icpsSrc.replace(/\s+/g, ' ')
    expect(flat).toContain('NEVER infer it from their website, from their own business, from a provider category, or because it seems likely')
  })

  it('both survive to the draft the portal saves', () => {
    expect(icpsSrc).toMatch(/target_category:\s*icp\.target_category\?\.trim\(\)/)
    expect(icpsSrc).toMatch(/target_company_type:\s*icp\.target_company_type\?\.trim\(\)/)
  })

  it('⚠️ ALONGSIDE `industries`, never instead of it', () => {
    const draft = icpsSrc.slice(icpsSrc.indexOf('const draft = {'), icpsSrc.indexOf('// The business half'))
    expect(draft).toContain('target_category')
    expect(draft).toContain('target_company_type')
    expect(draft).toContain('industries:            icp.industries ?? []')
  })
})

describe('④ the deployment ordering is written down where it will be read', () => {
  // ⚠️ THESE COLUMNS SHIP IN THE INSERT PAYLOAD. On a database where the migration has not
  // run, `{ ...body }` fails with 42703 and the client's ICP save fails — so the ordering is
  // not a nicety. Same expand/contract rule as `clients.commercial_model`.
  it('the schema, the migration and the runner all say it', () => {
    expect(icpsSrc).toContain('MUST be applied before this code ships')
    expect(migration).toContain('DEPLOYMENT ORDERING MATTERS')
    expect(runner).toContain('DEPLOYMENT ORDERING: apply this BEFORE shipping the code that writes the columns')
  })
})
