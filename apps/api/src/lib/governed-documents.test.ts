import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'
import { documentReadFailure } from './document-read-failure'

// ── R46 — GOVERNED DOCUMENTS: THE CHAIN IS THE HISTORY, AND NOTHING DELETES ────────────────
//
// Founder-ruled 17 Aug: *"any documents we need to create hold of be governed get held in Vida
// operator. on sole truth of source."* The register's enforcement column read "nothing yet"
// until this build.
//
// Two things have to be true or the table is worse than a folder of files:
//
//   1. A SECOND VERSION CHAINS, IT DOES NOT OVERWRITE. If amending edited the row in place, the
//      superseded text would be gone and with it the evidence that it was ever in force. That
//      is the failure #549 produced in the rules register on 6 Aug — an amendment forgotten
//      while the original was remembered — and it is the reason the register chains.
//
//   2. NOTHING CAN DELETE. Not from the screen, not from the API. An absence nobody guards is
//      an absence somebody adds a handler to next month, for a perfectly reasonable-sounding
//      reason, and the first anyone knows is when a document that mattered is not there.
//
// ⚠️ SOURCE IS READ, NOT IMPORTED, for `routes/operator.ts` — importing it pulls in `@kind/db`,
// whose client throws at module load without SUPABASE_URL and would fail the suite before a
// single assertion ran. Same technique as `seat-cap.test.ts`, and it reuses that file's
// `stripCommentsForEnvScan` rather than hand-rolling a third comment stripper (I wrote two by
// hand earlier today before noticing this one already existed).

const ROUTES_RAW = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
const ROUTES = stripCommentsForEnvScan(ROUTES_RAW)
const PAGE = readFileSync(join(__dirname, '../../../admin/src/app/vida/governed-documents/page.tsx'), 'utf8')
const MIGRATION = readFileSync(join(__dirname, '../../../../supabase/migrations/20260820_governed_documents.sql'), 'utf8')
const RUNNER = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')

describe('the guard is reading real files, not empty strings', () => {
  it('every source it asserts on is present and non-trivial', () => {
    // Without this, a rename or a moved file leaves every assertion below matching nothing and
    // passing. Four vacuous guards were caught this week; this is the cheap inoculation.
    expect(ROUTES.length).toBeGreaterThan(10_000)
    expect(ROUTES, 'the comment stripper must not have eaten the code').toContain('operatorRouter.get(')
    expect(PAGE.length).toBeGreaterThan(2_000)
    expect(MIGRATION).toContain('governed_documents')
  })
})

describe('AR6 — the migration exists in BOTH homes and they agree', () => {
  it('the canonical file and the runner entry are the same SQL', () => {
    // The runner is the only thing that EXECUTES; the file is the record. When they disagree,
    // the repo stops describing production — the exact state the 20260603 constraint left us in.
    expect(RUNNER).toContain("key: '20260820_governed_documents'")
    const entry = RUNNER.slice(RUNNER.indexOf("key: '20260820_governed_documents'"))
    const body = entry.slice(0, entry.indexOf('`.trim(),'))
    expect(body, 'the table').toContain('create table if not exists public.governed_documents')
    expect(body, 'the no-fork index').toContain('governed_documents_one_successor')
    expect(body, 'and RLS').toContain('enable row level security')
  })

  it('is idempotent — a second run changes nothing', () => {
    // Vida → Engine can be pressed twice, and has been.
    expect(MIGRATION).toContain('create table if not exists')
    expect(MIGRATION).toContain('create unique index if not exists')
    expect(MIGRATION, 'nothing destructive belongs in a migration this table depends on').not.toMatch(/drop\s+table/i)
  })

  it('has no template-literal syntax, so the runner copy cannot be mangled', () => {
    // The runner stores SQL inside a template literal. A backtick or a `${` in the canonical
    // file silently breaks the executed copy — found while writing this migration.
    expect(MIGRATION).not.toContain('`')
    expect(MIGRATION).not.toContain('${')
  })
})

describe('① a second version CHAINS rather than overwrites', () => {
  it('the schema records what a version supersedes', () => {
    expect(MIGRATION).toMatch(/supersedes_id uuid references public\.governed_documents\(id\)/)
    expect(MIGRATION).toMatch(/version\s+integer not null default 1/)
  })

  it('the write route INSERTS — it never updates a row in place', () => {
    const post = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/governed-documents'"))
    const body = post.slice(0, post.length)
    expect(body).toContain("db.from('governed_documents').insert(")
    expect(body, 'an amendment that UPDATEs is an amendment that erases').not.toContain(".update(")
  })

  it('⚠️ THE VERSION NUMBER IS DERIVED, never taken from the caller', () => {
    // A caller-supplied version is a caller-supplied lie waiting to happen: two rows claiming
    // v2, or a v7 with no v6. It is read from the superseded row and incremented server-side.
    const post = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/governed-documents'"))
    expect(post).toContain('version = Number(prev.version ?? 0) + 1')
    const destructure = post.slice(post.indexOf('const {'), post.indexOf('} = req.body'))
    expect(destructure, 'version must not be read off the request body').not.toContain('version')
  })

  it('the chain may not FORK — one successor per version, enforced by the database', () => {
    // Two operators each adding "version 2" leaves no answer to "what is the current text?",
    // which is the only question this table exists to answer. Modelled on
    // partner_signed_documents_once.
    expect(MIGRATION).toContain('create unique index if not exists governed_documents_one_successor')
    expect(MIGRATION).toMatch(/on public\.governed_documents \(supersedes_id\)/)
    expect(MIGRATION).toContain('where supersedes_id is not null')
  })

  it('and a fork attempt is explained, not reported as "insert failed"', () => {
    // 23505 here means somebody superseded this version while you were typing. The fix is to
    // re-read and amend the new head — so the message has to say that.
    const post = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/governed-documents'"))
    expect(post).toContain("'23505'")
    expect(ROUTES_RAW).toContain('already been superseded')
  })

  it('reading a document returns its whole chain, oldest first', () => {
    const get = ROUTES.slice(ROUTES.indexOf("operatorRouter.get('/governed-documents/:id'"))
    expect(get).toContain('chain.unshift(prev)')
    expect(get, 'and the walk is BOUNDED — a cycle must fail, never hang').toContain('hops < 100')
  })
})

describe('② NOTHING DELETES — asserted as an absence, deliberately', () => {
  it('no delete or update route exists for governed documents', () => {
    // The seat-cap pattern: read the router source and prove the handler is not there. If one
    // is ever added this goes red with a message saying why it must not be.
    expect(
      ROUTES,
      'a delete route was added for governed documents — R46 documents are superseded, never removed',
    ).not.toContain("operatorRouter.delete('/governed-documents")
    expect(ROUTES).not.toContain("operatorRouter.put('/governed-documents")
    expect(ROUTES).not.toContain("operatorRouter.patch('/governed-documents")
  })

  it('the three routes that DO exist are the three that should', () => {
    // Paired with the absence above so the guard cannot pass by the routes having been renamed
    // or removed wholesale — which would satisfy "no delete route" perfectly.
    const verbs = (ROUTES.match(/operatorRouter\.(get|post|put|patch|delete)\('\/governed-documents/g) ?? []).sort()
    expect(verbs).toEqual([
      "operatorRouter.get('/governed-documents",
      "operatorRouter.get('/governed-documents",
      "operatorRouter.post('/governed-documents",
    ].sort())
  })

  it('the operator screen offers no delete CONTROL', () => {
    // ⚠️ ASSERTED ON AFFORDANCES, NOT ON THE WORD. The first version matched /delete/i against
    // the whole file and went red on the screen's own visible copy — *"Documents are never
    // edited or deleted"* — and on the header comment explaining why there is no delete button.
    // A page that EXPLAINS it cannot delete is the opposite of a page that can.
    //
    // So this looks for the three things a delete would actually need: a bin icon, a DELETE
    // request, or a handler named for it.
    const code = stripCommentsForEnvScan(PAGE)
    expect(code, 'no bin icon is imported').not.toMatch(/\bTrash\w*\b/)
    expect(code, 'no DELETE request is made').not.toMatch(/method:\s*['"]DELETE['"]/i)
    expect(code, 'no delete handler exists').not.toMatch(/function\s+\w*[Dd]elete|const\s+\w*[Dd]elete\s*=/)
  })

  it('and there is no delete AUDIT ACTION to record one with', () => {
    // Belt to the brace: a delete, if built, would want an audit action. There isn't one.
    //
    // ⚠️ COMMENT-STRIPPED, for the same reason — the union's own comment says *"There is
    // deliberately no 'governed_document_deleted'"*, and the first version of this assertion
    // read that sentence as the thing it was forbidding. Fifth time today a guard has confused
    // a quotation with a claim; the fix is always to look at code rather than at prose.
    const audit = stripCommentsForEnvScan(readFileSync(join(__dirname, 'operator-audit.ts'), 'utf8'))
    expect(audit).toContain("'governed_document_created'")
    expect(audit).toContain("'governed_document_version_added'")
    expect(audit, 'a delete action must not exist in the union').not.toContain("'governed_document_deleted'")
  })
})

describe('④ a failed read NAMES THE FIX — the message that cost four round-trips', () => {
  // ⚠️ WRITTEN FROM A REAL WALK. The founder merged #678, deployed, saw the migration count read
  // 28, and opened the screen. It said *"Could not read the governed documents"* — the same
  // sentence for a missing table, a dead API and a network blip. The fact that mattered was that
  // the migration was QUEUED and not applied, and nothing said so. He opened the raw endpoint,
  // then Engine, then pressed Run migrations. Four exchanges for a one-button fix.
  //
  // The mapper is exercised with the error SHAPES Postgres and PostgREST actually produce,
  // rather than asserted about in source — a source match would pass on a mapper that never ran.

  // ⚠️ THE REAL FUNCTION, IMPORTED — not a copy rebuilt out of the route's source. A
  // reconstructed mapper proves the reconstruction; this proves the code that runs. It lives in
  // its own pure module precisely so this import is possible without pulling in @kind/db.
  const mapper = documentReadFailure

  it('the mapper is the real exported function, and the route uses it', () => {
    expect(typeof mapper).toBe('function')
    expect(ROUTES, 'the route must call it rather than carrying its own copy').toContain('documentReadFailure(err)')
    expect(mapper(new Error('boom')).error.length).toBeGreaterThan(10)
  })

  for (const [name, err] of [
    ['Postgres 42P01 (relation does not exist)', Object.assign(new Error('relation "public.governed_documents" does not exist'), { code: '42P01' })],
    ['PostgREST PGRST205 (not in the schema cache)', Object.assign(new Error("Could not find the table 'public.governed_documents' in the schema cache"), { code: 'PGRST205' })],
    ['a bare message with no code at all', new Error('relation "public.governed_documents" does not exist')],
  ] as const) {
    it(`${name} → tells the operator to run the migrations`, () => {
      const out = mapper(err)
      expect(out.error, 'it must name the SCREEN and the BUTTON, not just the fault').toContain('Run migrations')
      expect(out.error).toContain('Engine')
      expect(out.detail, 'and keeps the raw message for the person who can act on it').toBeTruthy()
    })
  }

  it('⚠️ AN ORDINARY FAILURE IS NOT MISREPORTED AS A MISSING TABLE', () => {
    // Without this the mapper could tell everyone to run migrations forever, which is the same
    // disease in the other direction: a confident wrong instruction stops you looking.
    const out = mapper(Object.assign(new Error('connection terminated unexpectedly'), { code: '08006' }))
    expect(out.error).not.toContain('Run migrations')
    expect(out.error).toContain('Could not read the governed documents')
    expect(out.detail).toContain('connection terminated')
  })

  it('the screen no longer wears the server\'s words as its own fallback', () => {
    // The two were the SAME sentence, so the page looked identical whether the API answered
    // with a reason or never answered at all. That ambiguity is what made the walk slow.
    const page = stripCommentsForEnvScan(PAGE)
    expect(page, 'the API-answered path uses the server reason').toContain('j.error ||')
    expect(page, 'and the catch says something only a dead API could mean').toContain('did not answer')
    expect(page, 'the raw detail is shown to the operator').toContain('loadDetail')
  })
})

describe('③ every write is audited', () => {
  it('the POST writes an operator-audit row, and names which of the two it was', () => {
    const post = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/governed-documents'"))
    expect(post).toContain('writeOperatorAudit(')
    expect(post, 'a new document and an amendment are different events').toContain(
      "supersedes_id ? 'governed_document_version_added' : 'governed_document_created'")
    expect(post, 'and the audit carries enough to reconstruct what happened').toContain('version: data.version')
  })

  it('the operator identity comes from the verified header, never the request body', () => {
    // #486. The admin proxy stamps x-operator-email from the session; trusting a body field
    // would let the caller sign somebody else's name to a governed document.
    const post = ROUTES.slice(ROUTES.indexOf("operatorRouter.post('/governed-documents'"))
    expect(post).toContain('created_by: operatorEmail(req)')
  })
})

describe('⚠️ THE SCREEN IS REACHABLE — the guard this build shipped without', () => {
  // ⚠️ WRITTEN AFTER THE FOUNDER COULD NOT FIND IT. The page shipped, the migration ran, and
  // nothing linked to it: he opened the Vida menu and said *"cant find documents."* A page
  // reachable only by typing its URL is #620's failure exactly — it exists, and no screen shows
  // it — and this file was full of guards about deletes while missing the one that mattered.
  //
  // It is also the THIRD time this shipped in this console: `/vida/demo` and `/partners` both
  // did it before, and `vida/layout.tsx` carries a comment about each. Three occurrences is a
  // pattern, so it gets a test rather than a fourth comment.
  const layout = readFileSync(join(__dirname, '../../../admin/src/app/vida/layout.tsx'), 'utf8')
  const sidebar = readFileSync(join(__dirname, '../../../admin/src/components/AdminSidebar.tsx'), 'utf8')

  it('the Vida menu links to it — the menu the founder actually opens', () => {
    expect(stripCommentsForEnvScan(layout), 'a control you cannot find is not a control')
      .toContain("href: '/vida/governed-documents'")
  })

  it('and it is VIDA-NATIVE, so the link does not eject the operator into the old console', () => {
    // The half-fix `/partners` shipped with, and the founder caught within a minute: *"i click
    // partners in the vida and it takes me to the old version this needs to stay on the new
    // version."* The page lives under the /vida shell for that reason.
    const { existsSync } = require('fs') as typeof import('fs')
    expect(existsSync(join(__dirname, '../../../admin/src/app/vida/governed-documents/page.tsx'))).toBe(true)
    expect(existsSync(join(__dirname, '../../../admin/src/app/governed-documents/page.tsx')),
      'the pre-shell copy must be gone, not left behind as a second door').toBe(false)
  })

  it('the old console lists it too — half-discoverable is not discoverable', () => {
    expect(stripCommentsForEnvScan(sidebar)).toContain("href: '/vida/governed-documents'")
  })

  it('every link that points at it uses the shell path', () => {
    // A stale `/governed-documents` link would 404 now that the page moved.
    const terms = readFileSync(join(__dirname, '../../../admin/src/app/terms-library/page.tsx'), 'utf8')
    for (const [name, src] of [['terms-library', terms], ['vida layout', layout], ['sidebar', sidebar]] as const) {
      const stale = stripCommentsForEnvScan(src).match(/['"]\/governed-documents/g) ?? []
      expect(stale, `${name} still points at the pre-move path`).toEqual([])
    }
  })
})

describe('R36 / R46 — operator-only, and the two document shelves say which is which', () => {
  it('the page lives in the admin app, which is behind the founder allowlist', () => {
    const mw = readFileSync(join(__dirname, '../../../admin/src/middleware.ts'), 'utf8')
    expect(mw).toContain('ADMIN_ALLOWED_EMAILS')
  })

  it('nothing client-facing was added — the portal and website are untouched', () => {
    // NO-TOUCH, asserted rather than asserted-about. If a later change reaches into the portal
    // for this feature, this goes red.
    expect(PAGE).toContain('/api/proxy/operator/governed-documents')
    expect(ROUTES_RAW).not.toContain('leadRouter.get(\'/governed-documents')
  })

  it('each shelf tells the reader what it holds, so "single source of truth" is an answer', () => {
    // Two screens both hold things called documents. Without a sentence on each, R46 reads as
    // ambiguous the first time somebody looks for a document and finds the other one.
    const terms = readFileSync(join(__dirname, '../../../admin/src/app/terms-library/page.tsx'), 'utf8')
    expect(terms, 'terms-library points at the governed home').toContain('/governed-documents')
    expect(terms, 'and says what it holds itself').toContain('blank templates')
    expect(PAGE, 'and the governed screen points back').toContain('Terms Library')
  })
})
