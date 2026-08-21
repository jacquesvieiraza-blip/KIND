# Archived docs

These documents are **superseded** and kept only for historical reference.
Do not follow them — they contain stale decisions and pre-launch plans.

**The single source of truth is the four core docs** (in `docs/`): **LAUNCH-PAD** (today) · **PRODUCT-INVENTORY** (status) · **KIND-MASTER** (strategy/why) · **V2-TRACKER** (future). See `docs/DOC-MAP.md` for the full index. *(Note: `MASTER.md` — once called the source of truth — is itself archived here now.)*

| File | Was | Superseded by |
|------|-----|---------------|
| `KIND_Roadmap.md` · `KIND_SOP.md` | 18 May pre-pivot roadmap/SOP | the 4 core docs + `docs/client-flow-sop.md` |
| `MASTER.md` · `MASTER_TODO.md` · `EVERYTHING.md` | old "everything" masters | the 4 core docs |
| `BUILD_STATUS.md` · `CHANGELOG.md` | 27-May sprint snapshots | PRODUCT-INVENTORY (status) + KIND-MASTER session log |
| `AUDIT.md` · `FULL_CHECK.md` | audit snapshot + protocol | RULEBOOK §13 (audit protocol) |
| `GETTING_STARTED.md` · `DEPLOY-CHECKLIST.md` · `COMPANY-ENGINE-TEST.md` · `ADMIN-BOOKKEEPER-AUDIT.md` | pre-launch onboarding/deploy/test | `DEPLOYMENT_GUIDE.md` · `LIVE-FEATURE-WALK.md` |
| `STAGING-REVIEW.md` · `SMOKE-BILLING-166-173.md` · `BOOKMARK-week-plan.md` · `LAUNCH-AUDIT-12JUN.md` · `MORNING-FIXLOG.md` · `SESSION-HANDOFF-7JUN.md` · `SESSION-SUMMARY-13JUN.md` · `KIND-MASTER-ARCHIVE.md` | dated pre-launch logs/reviews | KIND-MASTER session log |

Originally archived 3 June 2026 · bulk filing pass 23 June 2026 (PR 2).

---

## Surgery S2 — 21 Aug 2026

⚠️ **HISTORICAL — reference, never truth.** Eleven more files arrived here in surgery S2, each
verified dated or explicitly retired before it moved, and each with **zero** references from code,
scripts or tests:

`AFRICA-PLAYBOOK` · `APOLLO-ENGINE` (its own banner says Apollo is retired) · `AUDIT-8JUL-DEEP` ·
`AUDIT-PROMPT` · `CHURN-PREVENTION-PLAN` · `DELIVERABILITY-D9-CHECKLIST` ·
`RECORDING-SHOOTING-SCRIPT` (already self-marked HISTORICAL) · `SALARY-BREAKEVEN-PLAN` ·
`onboarding-tour-buildplan` (*"PLAN ONLY — nothing built"*) · `portal-admin-failover` ·
`portal-v2-layout`

Also here from surgery S1: the pre-cut copies of LAUNCH-PAD, PRODUCT-INVENTORY and the V2 narrative.

⚠️ **WHY THE REST OF `docs/` DID NOT MOVE — the finding that shrank this surgery.** Nineteen
documents are **wired into running software**, not merely linked: Vida's Engine page renders
`BACKUP-RESTORE-DRILL`, `RLS-AUDIT` and `SEED-WIPE-PLAN` to the operator; a `/docs` viewer serves
`legal`, `run-costs-and-cashflow`, `sales-playbook`, `client-flow-sop`, `art-of-possible` and
`DEPLOYMENT_GUIDE`; and tests read `ENVIRONMENT`, `SCHEMA-DRIFT`, `CORE-MAP`, `TECH-STACK`,
`render-cloudflare-failover` and others. Moving any of those is a **code change**, not a docs change
— it belongs post-live, on the founder's word, not inside a tidy-up.
