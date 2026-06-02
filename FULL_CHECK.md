# FULL CHECK — Mandatory Audit Protocol

**Purpose:** Stop partial audits. Every time the founder asks for an "audit",
"teardown", "full check", or "make sure we're done", Claude MUST work through
every section below and report on each — including the ones that come back clean.

**Rule:** You may not report an audit as complete until every box below has been
explicitly answered in your response. "I didn't find anything" is only valid
*after* you ran the check — never as a reason to skip it.

**How this protocol came to exist:** On 2 June 2026 Claude delivered a "full
teardown" that completely missed that the platform has no Railway backup — all
4 services (portal, admin, API, website) go down together with zero redundancy,
and a previously-discussed static-CDN failover was never built. The miss
happened because the audit was scoped to "what I built this session" instead of
"the complete state of the system." This checklist exists so that scope failure
cannot repeat.

---

## Run this first

```bash
bash scripts/full-check.sh
```

It gathers the raw facts for sections 1–5 below. You still must reason about
sections 6–8 manually — the script surfaces facts, it does not make judgements.

---

## 1. SINGLE POINTS OF FAILURE / REDUNDANCY  ⚠️ (the category I missed)

- [ ] **What happens if Railway is down?** List every service that dies. Is there ANY failover?
- [ ] Is the marketing website (`get-kind.com`) on the same host as the app? (It is — Railway Express.)
- [ ] Is there a static CDN backup for the marketing site? (Cloudflare Pages / Netlify)
- [ ] Is there a status page clients see during downtime?
- [ ] Is uptime monitoring (UptimeRobot) actually live, or just on a to-do list?
- [ ] Is the database backed up? Where? Tested restore?
- [ ] Any other "if X dies everything dies" dependency? (Supabase, Resend, Anthropic API)

## 2. STANDING COMMITMENTS NOT YET BUILT

- [ ] Search conversation history + MASTER for things *discussed* but never built ("backup plan", "we should", "Phase 2", "TODO", "later").
- [ ] These are gaps even if no code references them. Grep can't find absence — you must reason.

## 3. DEAD / DUPLICATE / REDUNDANT CODE & CONFIG

- [ ] Dead config files (e.g. `vercel.json` when not on Vercel)
- [ ] Duplicate files (e.g. `milla.png..png`, `SidebarV2` + `SidebarV2Preview`)
- [ ] Mounted-but-dead API routes (e.g. paystack/flutterwave)
- [ ] Orphan pages with no nav link
- [ ] Routes that crash startup if an env var is unset

## 4. STUBS / TODOs / FAKE DATA

- [ ] Inventory every `TODO`, `FIXME`, `STUB`, `mock`, `placeholder` in code.
- [ ] Which are intentional (feature-flagged) vs. accidental gaps?

## 5. MASTER.md TO-DO RECONCILIATION

- [ ] **Founder to-do (Section 2):** does it include EVERY pending founder action from this session? (SQL migrations, env vars, etc.)
- [ ] **Claude build queue (Section 3):** are any items marked "pending" actually DONE? Remove them.
- [ ] **Are any things I built this session missing from BOTH lists?**
- [ ] Cross-check Section 0 daily brief against actual disk state.

## 6. BUILD HEALTH

- [ ] `npx tsc --noEmit` clean on portal, api, admin?
- [ ] Any uncommitted changes? Anything not pushed to main?
- [ ] Does the website have broken internal links / visible placeholders?

## 7. BRAND / CONSISTENCY (KIND-specific locks)

- [ ] Zero non-purple blues across all HTML? (`#7c3aed` only)
- [ ] Agent images Pixar 3D, not photorealistic, not cropped?
- [ ] Calendly link consistent site-wide?
- [ ] No Vercel references presented as current fact?

## 8. REPORT FORMAT

Every audit report MUST have three explicit lists:
- ✅ **LIVE & VERIFIED** — checked on disk, pushed
- 🛑 **STOPPED / NOT BUILT** — with the reason
- ⏳ **PENDING** — split into *founder action* vs *Claude build queue*

Never present "what I built" as a complete audit. An audit covers the whole
system, not one session's diff.
