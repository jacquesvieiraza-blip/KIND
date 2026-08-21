> # ⚠️ DRAFT — the founder confirms the rows marked FOUNDER-CONFIRMS before this is shown to anyone
>
> Written 20 Aug 2026 by reading the code. **Three states, and no fourth:**
> ✅ **VERIFIED** — cited, and I opened the file · 🧍 **FOUNDER-CONFIRMS** — true or false depending
> on a setting only he can see · ❌ **NOT YET** — does not exist. **Nothing is upgraded on
> optimism**, and a row stays ❌ until someone can point at the thing.

# Technical and organisational measures

| # | Control | State | Evidence |
|---|---|---|---|
| 1 | **Tenant isolation** | ✅ VERIFIED | Row-level security on; **7** RLS migrations registered in `apps/api/src/lib/pending-migrations.ts`; audited by `apps/api/src/lib/rls-audit.test.ts`. Plus the application-layer fence: `nexus-guard.ts` → `assertSameClient` **throws** (`scoring.ts:76`) |
| 2 | **Access control** | ✅ VERIFIED | Supabase auth for clients. Operator surface gated on `ADMIN_ALLOWED_EMAILS` and reachable only via the proxy — pinned by `apps/api/src/lib/admin-proxy-only.test.ts` |
| 3 | **Operator audit log** | ✅ VERIFIED | `operator_audit_log`, written at `apps/api/src/lib/operator-audit.ts:171`. ⚠️ **41 typed actions**, not 18 — counted from the `OperatorAction` union (approve_lead … import_leads_failed). Best-effort by design so a lost line can never fail a client action; **Prompt 11 (20 Aug)** added a throttled alert on both the returned-error and thrown paths, so a persistent outage is visible instead of silent |
| 4 | **Secrets management** | ✅ VERIFIED | Environment variables held in Railway, never in the repo (**O4**). Inbox credentials encrypted **AES-256-GCM** — `apps/api/src/lib/inbox-secret.ts:28`. `UNSUBSCRIBE_SECRET` presence enforced at boot — `apps/api/src/lib/startup-check.ts` (Prompt 19) |
| 5 | **Encryption in transit** | ✅ VERIFIED | TLS on every endpoint; the site and API are HTTPS-only |
| 6 | **Encryption at rest** | 🧍 **VENDOR-CERTIFIED, NOT OURS** | Supabase (AWS) encrypts at rest — **their** certification, not ours, and we must never present it as ours. Cite **their** SOC 2 report, obtained from them. ⚠️ We do not hold it: `EVIDENCE-PACK.md` row 17 |
| 7 | **Send-safety** | ✅ VERIFIED | Kill-switch; atomic step claims so a step cannot double-send; **charge-once** enforced in the database — `supabase/migrations/20260710_charge_once.sql`; demo backstop preventing demo runs touching real money |
| 8 | **Backups + restore test** | ❌ **NOT YET** | Daily backups exist and were seen on the dashboard 20 Aug (**7 days** visible, 13–20 Aug, same region as the database). ⚠️ **The tier is unconfirmed and no restore has ever been tested.** A backup nobody has restored from is a hypothesis. Runbook: `docs/legal/restore-runbook.md`. **Stays ❌ until the founder confirms the tier and a restore is actually performed** |
| 9 | **MFA on founder accounts** | 🧍 FOUNDER-CONFIRMS | Cannot be read from the repo. Applies to: GitHub, Railway, Supabase, Stripe, Google, Resend. **Answer per account, not once** |
| 10 | **Patching practice** | 🧍 FOUNDER-CONFIRMS | Dependencies updated when a build requires it; **no scheduled patch cycle and no automated dependency alerts configured.** Stated plainly rather than dressed up |
| 11 | **Joiner / leaver** | ✅ VERIFIED — *by being small* | **One person has access today: the founder.** There is no joiner/leaver process because there is nobody to join or leave. Contractor/agent access is covered in `docs/legal/it-security-pack.md` §4.3. ⚠️ This answer expires the day a second person gets access |
| 12 | **Logging** | ❌ **NOT YET** | ⚠️ **Recounted live, 20 Aug: 105 console lines in `apps/api/src` reference an email, name or lead field** (method: `grep -rn "console\.(log\|warn\|error\|info)"` filtered to lines mentioning `email`/`lead.`/`prospect`/`first_name`/`last_name`/`@`, tests excluded). The earlier figure of 92 was **too low**. These go to Railway's log stream. **We have not confirmed Railway's log retention period** — required before we can answer "how long do logs holding personal data persist?" `error_events` is separately retained at **90 days** per `it-security-pack.md` §6 |
| 13 | **Incident response** | ✅ VERIFIED (draft) | `docs/compliance/BREACH-RESPONSE-DRAFT.md` — detection sources, first hour, who decides, the vendor-incident chain. Plus `docs/legal/it-security-pack.md` §7, five steps with clocks. ⚠️ Notification thresholds **unworded — counsel** |

## What a buyer should be told without being asked

Three rows are **❌ NOT YET** and each is a real answer, not a formality:

- **Backups (8)** — we take them; we have never restored from one. That is the honest state.
- **Logging (12)** — personal data reaches application logs in **105** places, and we cannot yet
  say for how long it is kept.
- **Patching (10)** — reactive, not scheduled.

**Volunteering these is what makes the ten ✅ rows credible.** A buyer who discovers one of them
themselves will re-audit everything else you told them.
