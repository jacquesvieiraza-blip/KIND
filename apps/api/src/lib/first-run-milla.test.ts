import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// ── THE FIRST RUN BELONGS TO MILLA, AND SHE HAS TO LOOK LIKE HERSELF (24 Aug) ────────────
//
// The founder walked a brand-new signup on the live site and found three faults stacked on
// one screen:
//
//   1. A new client was interviewed BEFORE entering K.I.N.D. `/onboard` asked six scripted
//      questions, two of them pure business discovery — including "what does your company
//      do? tell me who you help and how", which Milla then asked AGAIN inside the product.
//      The client was interviewed twice by two eras of the same flow.
//   2. The face was wrong. Step 0 read "Hi — I'm Milla." while the header photo, the identity
//      bar and every chat bubble showed /agents/figsy.png and "FIGSY · The Opener". An earlier
//      fix had changed the WORDS and left the CHROME — and nothing failed, because no test in
//      this repo asserted which agent's face appears on which surface. That is why this file
//      exists at all.
//   3. The first run was split in half: account creation on one screen, business understanding
//      on another.
//
// Founder ruling: authentication is all that happens before K.I.N.D. Milla collects the
// account facts conversationally, learns the business, reflects back, and the clients row is
// written at the confirmation through the UNCHANGED /auth/onboard handler.
//
// Three sequencing rules came with it, and each one is a test below because each one is a way
// the fix could quietly rot:
//   • WEBSITE EVIDENCE IS NOT TRUTH. The basic read moves inside Milla, its output is labelled
//     provisional, and a hint may never silently become canonical targeting.
//   • PAID PREVIEW WAITS FOR THE ACCOUNT. /icps/preview-count runs real PDL/Apollo calls and
//     needs no client row; it must not become the way an anonymous-ish new visitor reaches a
//     provider.
//   • NOTHING IS FILLED IN ON THE CLIENT'S BEHALF. `clients.country` defaults to 'South
//     Africa' in the schema, so a missing country does not fail loudly — it invents one.

const API     = join(__dirname, '..')
const PORTAL  = join(__dirname, '../../../portal/src')
const REPO    = join(__dirname, '../../../..')

const read = (p: string) => readFileSync(p, 'utf8')

/** Comments are where this repo explains itself, and they legitimately name FIGSY, /onboard
 *  and the old questions while describing what was removed. An assertion that a token is
 *  ABSENT has to look at code only, or the explanation of the fix reads as the bug. */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')   // JSX comments
    .replace(/\/\*[\s\S]*?\*\//g, ' ')       // block comments
    .replace(/^\s*\/\/.*$/gm, ' ')           // line comments
}

const loginSrc    = read(join(PORTAL, 'app/(auth)/login/page.tsx'))
const onboardSrc  = read(join(PORTAL, 'app/(auth)/onboard/page.tsx'))
const welcomeSrc  = read(join(PORTAL, 'app/(milla)/milla/welcome/page.tsx'))
const mwSrc       = read(join(PORTAL, 'middleware.ts'))
const authSrc     = read(join(API, 'routes/auth.ts'))
const icpsSrc     = read(join(API, 'routes/icps.ts'))

/** Prompt text is hard-wrapped in the source, so a sentence a human reads as one line is
 *  split across two. Assert against the flattened form or the guard fails on formatting. */
const flat = (s: string) => s.replace(/\s+/g, ' ')

const loginCode   = stripComments(loginSrc)
const onboardCode = stripComments(onboardSrc)
const welcomeCode = stripComments(welcomeSrc)

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('a fresh signup lands in Milla, not in an interview', () => {
  it('the files this guard depends on all exist (a guard that reads nothing passes everything)', () => {
    for (const p of [
      join(PORTAL, 'app/(auth)/login/page.tsx'),
      join(PORTAL, 'app/(auth)/onboard/page.tsx'),
      join(PORTAL, 'app/(milla)/milla/welcome/page.tsx'),
      join(API, 'routes/auth.ts'),
    ]) expect(existsSync(p), p).toBe(true)
  })

  it('signing up pushes straight to /milla/welcome', () => {
    expect(loginCode).toContain("router.push('/milla/welcome')")
  })

  it('NO route in the login page still sends anyone to the old interview', () => {
    expect(loginCode).not.toContain("router.push('/onboard')")
    expect(loginCode).not.toContain('next=/onboard')
  })

  it('the OAuth round-trip lands there too — the ?next= hop is where a redirect gets lost', () => {
    expect(loginCode).toContain('next=/milla/welcome')
  })

  it('the API tells the same story as the portal — one redirect string disagreeing is the whole bug class', () => {
    expect(authSrc).toContain('${PORTAL}/milla/welcome')
    expect(stripComments(authSrc)).not.toContain('${PORTAL}/onboard')
  })

  it('a signed-in person with no client row resumes with Milla rather than restarting a form', () => {
    // Both no-client-row branches (no seat, and a profile with no company_name).
    const pushes = [...loginCode.matchAll(/router\.push\('([^']+)'\)/g)].map(m => m[1])
    expect(pushes).toContain('/milla/welcome')
    expect(pushes).not.toContain('/onboard')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('/onboard is a redirect stub and must stay empty', () => {
  it('it redirects to /milla/welcome', () => {
    expect(onboardCode).toContain("router.replace('/milla/welcome')")
  })

  it('NO steps, NO form, NO inputs — the founder ruled out a replacement form under any URL', () => {
    expect(onboardCode).not.toMatch(/\bSTEPS\b/)
    expect(onboardCode).not.toMatch(/<form/i)
    expect(onboardCode).not.toMatch(/<input/i)
    expect(onboardCode).not.toMatch(/<textarea/i)
    expect(onboardCode).not.toMatch(/placeholder=/i)
  })

  it('NO business questions survive anywhere in it', () => {
    for (const gone of [
      "What's your company called",
      'What does',
      'Which country are you based in',
      'who am I speaking to',
      'mobile number',
      "What's your website",
      'pre-fill your targeting',
    ]) expect(onboardCode, gone).not.toContain(gone)
  })

  it('it no longer creates the client row — that moved to the confirmation inside Milla', () => {
    expect(onboardCode).not.toContain('/auth/onboard')
  })

  it('it no longer calls the website read — that moved inside Milla', () => {
    expect(onboardCode).not.toContain('/icps/prefill')
  })

  it('the route still EXISTS, so an emailed link or an old bookmark cannot 404', () => {
    expect(existsSync(join(PORTAL, 'app/(auth)/onboard/page.tsx'))).toBe(true)
    expect(mwSrc).toContain("path: '/onboard'")
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('Milla collects the account facts herself', () => {
  it('the builder conversation is told to collect them, and told they are hers now', () => {
    expect(icpsSrc).toContain('You are learning THREE things at once')
    expect(icpsSrc).toContain('THE FEW FACTS WE NEED TO OPEN THEIR ACCOUNT')
  })

  it('every field the old form collected is in the reply contract', () => {
    for (const f of ['company_name', 'country', 'contact_name', 'phone', 'website', 'industry']) {
      expect(icpsSrc, f).toMatch(new RegExp(`${f}:\\s*short\\(p\\.${f}\\)`))
    }
  })

  it('the portal sends all six to the UNCHANGED /auth/onboard handler', () => {
    for (const f of ['company_name:', 'country:', 'industry:', 'website:', 'phone:', 'contact_name:']) {
      expect(welcomeCode, f).toContain(f)
    }
    expect(welcomeCode).toContain("api.post('/auth/onboard'")
  })

  it('business discovery still happens in the SAME conversation — not a second interview', () => {
    // One builder call carries profile AND business AND proof AND intent.
    expect(icpsSrc).toContain('profile, business, proof, website_hints: websiteHints')
    expect(welcomeCode).toContain("api.post<{ data: BuilderReply }>(\n        '/icps/builder/chat',")
  })

  it('`industry` still reaches the column FIGSY and Vida read — the field did not just vanish', () => {
    expect(welcomeCode).toMatch(/industry:\s*p!\.industry/)
    // and the API still accepts it
    expect(authSrc).toMatch(/industry:\s*emptyToUndefined\.optional\(\)/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('required client data is never fabricated or defaulted', () => {
  it('the model is forbidden from inventing any of it', () => {
    expect(icpsSrc).toContain('NEVER invent a company name, a country')
  })

  it('country may not be lifted from the targeting geographies — they are different facts', () => {
    expect(icpsSrc).toContain('THE COUNTRY IS WHERE THEIR OWN BUSINESS IS BASED')
    expect(flat(icpsSrc)).toContain('NEVER copy it from the geographies in the targeting')
    expect(flat(icpsSrc)).toContain('It is NOT where their customers are')
  })

  it('the model may not declare itself complete without the two required facts', () => {
    expect(icpsSrc).toContain('DO NOT ANSWER "complete" UNTIL YOU HOLD BOTH THEIR COMPANY NAME AND THEIR OWN COUNTRY')
  })

  it('a missing company name or country ASKS — it never submits', () => {
    expect(welcomeCode).toContain("!p?.company_name?.trim() ? 'your company name' : ''")
    expect(welcomeCode).toContain("!p?.country?.trim() ? 'which country your business is based in' : ''")
    expect(welcomeCode).toMatch(/if \(missing\.length\)[\s\S]{0,320}?setSaving\(false\)\s*\n\s*return/)
  })

  it('no placeholder value is hard-coded anywhere in the new first-run path', () => {
    for (const src of [welcomeCode, onboardCode]) {
      expect(src).not.toContain('South Africa')
      expect(src).not.toMatch(/company_name:\s*'[^']+'/)
      expect(src).not.toMatch(/country:\s*'[^']+'/)
    }
  })

  it("the server's required-field validation is UNCHANGED — it is the backstop, not a formality", () => {
    expect(authSrc).toContain('company_name: z.string().min(2)')
    expect(authSrc).toContain('country:      z.string().min(2)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('the client row is created exactly once, and only when it is missing', () => {
  it('creation is gated on a CONFIRMED "no account" — never on an unknown lookup', () => {
    expect(welcomeCode).toContain('if (hasClient === false) {')
    // `null` means the lookup did not answer; it must not be treated as "new".
    expect(welcomeCode).toContain('const [hasClient, setHasClient] = useState<boolean | null>(null)')
  })

  it('/auth/onboard is posted BEFORE /icps — the ICP save 404s without the row', () => {
    const onboardAt = welcomeCode.indexOf("api.post('/auth/onboard'")
    const icpAt     = welcomeCode.indexOf("api.post('/icps',")
    expect(onboardAt).toBeGreaterThan(-1)
    expect(icpAt).toBeGreaterThan(-1)
    expect(onboardAt).toBeLessThan(icpAt)
  })

  it('exactly ONE /auth/onboard call site exists in the whole first-run path', () => {
    expect(welcomeCode.match(/api\.post\('\/auth\/onboard'/g) ?? []).toHaveLength(1)
    expect(onboardCode).not.toContain('/auth/onboard')
  })

  it('the handler itself still refuses to duplicate — update when present, insert when not', () => {
    expect(authSrc).toContain("const { data: existing } = await db.from('clients')")
    expect(authSrc).toMatch(/if \(existing\) \{[\s\S]{0,400}?\.update\(payload\)/)
  })

  it('and the database makes a second row impossible regardless', () => {
    const schema = read(join(REPO, 'packages/db/src/schema.sql'))
    expect(schema).toContain('unique(user_id)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('partner referral and the T&C tick survive the move', () => {
  it('the referral is carried to the new creation point — a lost one is never paid, ever', () => {
    expect(loginCode).toContain("localStorage.setItem('kind_referral', ref)")
    expect(welcomeCode).toContain("localStorage.getItem('kind_referral')")
    expect(welcomeCode).toContain('referred_by: ref')
  })

  it('a ?ref= landing straight on Milla is honoured too, not only the stored one', () => {
    expect(welcomeCode).toContain("new URLSearchParams(window.location.search).get('ref')")
  })

  it('the Item-186 T&C evidence is carried, under the SAME key the login page writes', () => {
    expect(loginCode).toContain("localStorage.setItem('kind_terms_accepted', '1')")
    expect(welcomeCode).toContain("localStorage.getItem('kind_terms_accepted') === '1'")
    expect(welcomeCode).toContain('terms_accepted: true')
  })

  it('both are cleared only AFTER the account is opened', () => {
    const post  = welcomeCode.indexOf("api.post('/auth/onboard'")
    const clear = welcomeCode.indexOf("localStorage.removeItem('kind_referral')")
    expect(clear).toBeGreaterThan(post)
  })

  it('and the handler still refuses to rewrite either on an existing client (P4 / Item 186)', () => {
    expect(authSrc).toContain('an existing client re-onboarding must NEVER change/overwrite who')
    expect(authSrc).toContain('!existing?.signup_terms_accepted_at')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('Milla wears her own face, and FIGSY is nowhere in her first run', () => {
  it('the canonical Milla asset exists on disk — a path to a missing file is the /auth/reset bug', () => {
    expect(existsSync(join(PORTAL, '../public/agents/milla.png'))).toBe(true)
  })

  it('the first-run surface uses it', () => {
    expect(welcomeCode).toContain('/agents/milla.png')
  })

  it("FIGSY's face and name appear NOWHERE in the first-run code", () => {
    for (const src of [welcomeCode, onboardCode]) {
      expect(src).not.toContain('/agents/figsy.png')
      expect(src).not.toContain('FIGSY')
      expect(src).not.toContain('The Opener')
    }
  })

  it("but FIGSY's OWN surfaces are untouched — this fix corrects one identity, it does not erase another", () => {
    const figsyChat = read(join(PORTAL, 'app/(dashboard)/dashboard/figsy-chat/page.tsx'))
    const askFigsy  = read(join(PORTAL, 'components/ui/AskFigsyButton.tsx'))
    expect(figsyChat).toContain('/agents/figsy.png')
    expect(askFigsy).toContain('/agents/figsy.png')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('the website read moved inside Milla, and its output is evidence — not truth', () => {
  it('the basic read is REUSED, not reimplemented — there is still one scraper', () => {
    expect(welcomeCode).toContain("api.post<{ data: Omit<WebsiteEvidence, 'url'> }>('/icps/prefill'")
    const scrape = read(join(API, 'lib/scrape.ts'))
    expect(scrape).toContain('export async function suggestIcpFromWebsite')
    // No second implementation anywhere in the first-run path.
    for (const src of [welcomeCode, onboardCode]) {
      expect(src).not.toMatch(/fetch\(\s*(?:url|website)/i)
      expect(src).not.toContain('anthropic')
    }
  })

  it('it runs only once a website is actually supplied', () => {
    expect(welcomeCode).toContain('const url = firstUrl(msg)')
    expect(welcomeCode).toContain('url ? await readWebsite(url) : null')
  })

  it('it runs at most once per supplied website', () => {
    expect(welcomeCode).toContain('if (readSites.current.has(url)) return null')
    expect(welcomeCode).toContain('readSites.current.add(url)')
  })

  it('an EXISTING client opening Milla never triggers a read', () => {
    expect(welcomeCode).toMatch(/const readWebsite = useCallback\([\s\S]{0,240}?if \(hasClient !== false\) return null/)
  })

  it('the evidence reaches Milla as a labelled field, never as a message in the transcript', () => {
    expect(welcomeCode).toContain('website_evidence: evidence')
    expect(icpsSrc).toContain('PROVISIONAL WEBSITE EVIDENCE')
    expect(icpsSrc).toContain("A MACHINE'S GUESS, NOT THE CLIENT'S WORDS")
  })

  it('the model must get it confirmed before a value can enter the ICP', () => {
    expect(icpsSrc).toContain('A value only enters "icp" AFTER they confirm it')
    expect(icpsSrc).toContain('NEVER say or imply the client told you any of it')
  })

  it('unconfirmed hints come back separately so the panel can keep them apart', () => {
    expect(icpsSrc).toContain('website_hints')
    expect(icpsSrc).toContain('const websiteHints =')
  })

  it('and the reflect-back visibly distinguishes them from what the client actually said', () => {
    expect(welcomeCode).toContain('From a quick read of your website · not yet confirmed')
    expect(welcomeCode).toContain('not part of your targeting')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('paid preview cannot run before the account exists', () => {
  it('preview-count is gated on a confirmed client row', () => {
    expect(welcomeCode).toMatch(/if \(hasClient !== true\) \{ setMatchCount\(null\); return \}/)
  })

  it('the gate sits BEFORE the call, not after it', () => {
    const gate = welcomeCode.indexOf('if (hasClient !== true) { setMatchCount(null); return }')
    const call = welcomeCode.indexOf("'/icps/preview-count'")
    expect(gate).toBeGreaterThan(-1)
    expect(call).toBeGreaterThan(gate)
  })

  it('there is exactly ONE preview-count call site, so the gate cannot be bypassed', () => {
    expect(welcomeCode.match(/'\/icps\/preview-count'/g) ?? []).toHaveLength(1)
  })

  it('the provider path itself is UNCHANGED — this is when, not how', () => {
    expect(icpsSrc).toContain("rateLimit({ limit: 10, windowMs: 60_000, key: 'icp-preview', byUser: true })")
    expect(icpsSrc).toContain('const cached = previewCacheGet(cacheKey)')
    expect(icpsSrc).toContain('const previewAudience = await audienceForUser(req.userId)')
  })

  it('and a missing count still renders as "—" rather than an invented number', () => {
    expect(welcomeCode).toContain("matchCount == null ? '—'")
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('existing clients are not dragged through any of it', () => {
  it('the account panel is first-run only', () => {
    expect(welcomeCode).toContain('const showProfile = hasClient === false && profile')
  })

  it('an existing client never posts /auth/onboard', () => {
    expect(welcomeCode).toMatch(/if \(hasClient === false\) \{[\s\S]*?api\.post\('\/auth\/onboard'/)
  })

  it('the refinement path is untouched — same ICP sharpened, not a second experiment', () => {
    expect(welcomeCode).toContain('REFINING_GREETING')
    expect(welcomeCode).toContain("Let's sharpen the same targeting rather than start over")
  })

  it('and nothing about who may reach Milla changed', () => {
    expect(mwSrc).toContain("if (!user && pathname.startsWith('/milla')) {")
    expect(mwSrc).toContain("return NextResponse.redirect(new URL('/login', base))")
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('everything downstream of the confirmation is byte-for-byte the same journey', () => {
  it('the reflect-back and its recorded confirmation are unchanged', () => {
    expect(welcomeSrc).toContain('Here&rsquo;s what I understand about your business')
    expect(icpsSrc).toContain('milla_understanding_confirmed_at')
  })

  it('the ICP save still carries business, proof and campaign intent in one call', () => {
    expect(welcomeCode).toContain("api.post('/icps', { ...proposed, business, proof, campaign_intent: intent }, tk)")
  })

  it('one core ICP, refined — not a new row per save', () => {
    expect(icpsSrc).toContain('const saved = await saveClientTargeting(clientId, body, revisedIntent)')
  })

  it('the money ask still ends the conversation, and the price is still interpolated', () => {
    expect(welcomeCode).toContain("router.push('/milla/billing?start=1&from=icp')")
    expect(welcomeCode).toContain('${PACK_PRICE_USD}')
    // Hand-typed money on a screen a client reads is the 3-Aug bug: the button said $99
    // while the line beneath it said $299, and the founder caught it mid-signup. The pack
    // price is interpolated from the shared constant and must stay that way. Code only —
    // the comment above the button legitimately quotes the prices it warns about.
    expect(welcomeCode).not.toMatch(/\$299|\$99\b/)

    // ⚠️ REPORTED, DELIBERATELY NOT FIXED (24 Aug). The per-lead price on this same panel
    // IS hand-typed — "$4 per approved lead" — while `LEAD_PRICE_USD` sits in @kind/shared
    // beside `PACK_PRICE_USD`. It predates this build and arrived with the panel; the $4
    // model is on this build's no-touch list, so it is recorded here rather than corrected
    // inside a first-run change. Asserted as-is so the day someone fixes it, they are told
    // this line exists and is a known debt, not an accident.
    expect(welcomeCode).toContain('$4 per approved lead')
  })

  it('no charge and no send were introduced anywhere in the first-run path', () => {
    for (const src of [welcomeCode, onboardCode, loginCode]) {
      expect(src).not.toMatch(/stripe/i)
      expect(src).not.toMatch(/\bmailer\b/i)
      expect(src).not.toMatch(/AUTO_OUTREACH_ENABLED/)
      expect(src).not.toMatch(/\/leads\/[a-z-]*reveal/i)
    }
  })

  it('K.I.N.D still owns GO — activation is admin-gated and this build did not touch it', () => {
    expect(icpsSrc).toContain('apply_pending_revision')
    expect(icpsSrc).toContain('PROOF_PASS_LEADS = 20')
    expect(icpsSrc).toContain('PROOF_CLIENT_RECORD_CAP = 40')
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('the CRM gap the founder accepted for launch is written down, not remembered', () => {
  const v2 = read(join(REPO, 'docs/V2-TRACKER.md'))

  it('it is logged in the existing V2 tracker — no new truth document was created', () => {
    expect(v2).toContain('ABANDONED SIGNUP HAS NO VIDA RECORD')
  })

  it('it records the accepted launch behaviour plainly', () => {
    expect(v2).toContain('auth user with no `clients` row')
    expect(v2).toContain('does not appear in Vida')
  })

  it('it forbids the wrong fix by name', () => {
    expect(v2).toContain('Do NOT solve this by inserting a partial or placeholder `clients` row')
  })

  it('it says what it is not — a launch blocker', () => {
    expect(v2).toContain('NOT a launch blocker')
  })

  it('and it sits in the Vida mapping material rather than in a new section of its own', () => {
    expect(v2).toContain('PASS 4 — MAP VIDA PROPERLY')
    expect(v2.indexOf('PASS 4 — MAP VIDA PROPERLY')).toBeLessThan(v2.indexOf('ABANDONED SIGNUP HAS NO VIDA RECORD'))
    // and BEFORE Pass 5 — it belongs to the Vida audit, not loose at the end of the ladder
    expect(v2.indexOf('ABANDONED SIGNUP HAS NO VIDA RECORD')).toBeLessThan(v2.indexOf('PASS 5 — AUTOMATE ONLY PROVEN MOVEMENTS'))
  })
})

// ─────────────────────────────────────────────────────────────────────────────────────────
describe('the boundaries this build was told not to cross', () => {
  it('#700 is still 🟡 — no dot was flipped', () => {
    const inv = read(join(REPO, 'docs/PRODUCT-INVENTORY.md'))
    expect(inv).toMatch(/^\| 700 \| 🟡 \|/m)
  })

  it('no migration was written or edited by this build', () => {
    const pending = read(join(API, 'lib/pending-migrations.ts'))
    expect(pending).not.toContain('first_run')
    expect(pending).not.toContain('milla_welcome')
  })

  it('the clients table is unchanged — the account facts already had columns', () => {
    const schema = read(join(REPO, 'packages/db/src/schema.sql'))
    for (const col of ['company_name', 'industry', 'country', 'website', 'phone']) {
      expect(schema, col).toContain(col)
    }
  })
})
