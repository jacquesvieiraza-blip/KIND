// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE RETIRED $299/$4 MODEL — WHAT THIS PR TOUCHED, AND WHAT IT DELIBERATELY DID NOT
//                                                    23 Sep 2026 · MVP1 stage-flow rows 3 and 4
//
// ── WHAT WAS WRONG ──────────────────────────────────────────────────────────────────────
//
// `POST /company/seats` inserted a rep seat with no `commercial_model`. NULL is UNCLASSIFIED,
// and `clientCommercialModel` resolves NULL with no open programme to `compat_legacy` — which
// OPENS the retired per-lead path. So every seat invited into a programme company could be
// charged $4 per approved lead, re-granted a model the founder retired outright (R124, 16 Sep:
// *"299/4 is gone. out. we are on the programme. all clients."*), by an omitted column.
//
// ── WHAT THIS DELIBERATELY DOES NOT DO ──────────────────────────────────────────────────
//
// ⚠️ THE NULL → LEGACY MAPPING IS UNTOUCHED. It was built on purpose so the column could ship
// against a live book nobody had reviewed, and `commercial-model.test.ts` locks it as "TODAY'S
// BEHAVIOUR FOR THE WHOLE LIVE BOOK". Reclassifying existing accounts is a founder decision with
// money in it — any in-flight per-lead work, any wallet balance — and R124 retired the model
// "by decision rather than by migration". This file closes the door for NEW seats only.
//
// ⚠️ AND NO NEW SEAT IS CLASSIFIED HERE EITHER. `POST /company/seats` still inserts a rep with
// no model, so it resolves to `compat_legacy` and the per-lead path is open to it. The obvious fix
// — inherit the inviter's model — is a THIRD WRITER of `commercial_model`, and
// `client-commercial-model-schema.test.ts` says in so many words that "a third writer of the
// commercial model needs founder review". It was built, the guard fired, and it was taken back
// out and put to the founder rather than waved through by editing the allow-list.
//
// ⛓️ SUPERSEDED THE SAME DAY BY R137 — both "does not do" paragraphs above are history now. The
// founder ordered the whole book onto the programme, so the resolver no longer maps NULL to
// legacy, and `20260923_all_clients_programme` makes 'programme' the column DEFAULT — which is
// what now classifies a new seat, with no third writer. The block below is re-aimed to match.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')
function strip(file: string): string {
  const raw = readFileSync(join(REPO, file), 'utf8')
  let inBlock = false
  return raw.split('\n').map(l => {
    const x = l.trim()
    if (inBlock) { if (x.endsWith('*/') || x.endsWith('*/}')) inBlock = false; return '' }
    if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
    if (x.startsWith('{/*')) { if (!x.endsWith('*/}')) inBlock = true; return '' }
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

// ⛓️ RE-AIMED 23 Sep (R137), same session. This block was written for the capacity-pin change
// BEFORE the founder ordered R137, and pinned that NULL still resolved to `compat_legacy` — so the
// capacity work could not quietly reclassify accounts. The founder then DID take that decision,
// explicitly: *"the 299/4 is retired/ this must go. everything must be updated to new programme
// pricing model."* The property worth keeping is the inverse: nothing re-introduces the mapping.
describe('🛑 and no account resolves to the retired model again (R137)', () => {
  it('the resolver never produces compat_legacy or legacy', () => {
    const MODEL = strip('apps/api/src/lib/commercial-model.ts')
    const fn = MODEL.slice(MODEL.indexOf('export async function clientCommercialModel'), MODEL.indexOf('export function storedModelFor'))
    expect(fn).not.toMatch(/model:\s*'compat_legacy'/)
    expect(fn).not.toMatch(/model:\s*'legacy'/)
    expect(fn).toMatch(/return \{ model: 'compat_programme', declared: false, openProgramme: open \}/)
  })
})

describe('🛑 the portal no longer claims a $299 ask that does not exist', () => {
  it('no live code in the portal links to the retired pack checkout', () => {
    const WELCOME = strip('apps/portal/src/app/(milla)/milla/welcome/page.tsx')
    expect(WELCOME).not.toContain('billing?start=1')
  })

  it('the welcome commentary is chained to R124 rather than asserting the pack still exists', () => {
    const raw = readFileSync(join(REPO, 'apps/portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')
    expect(raw).toContain('FALSE SINCE R124')
    expect(raw).toContain('Milla billing page')
  })
})
