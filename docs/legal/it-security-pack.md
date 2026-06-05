# K.I.N.D Technologies Ltd — IT Security Pack
**Company:** K.I.N.D Technologies Ltd · Company No. 17260532 · Registered England & Wales
**Version:** 1.0 · June 2026
**Owner:** Founder / Data Controller
**Review cycle:** Every 6 months, or after any security incident

---

## 1. PURPOSE AND SCOPE

This pack defines the security controls, policies, and obligations that govern how K.I.N.D Technologies Ltd collects, stores, processes, and protects data. It applies to:

- All infrastructure operated by or on behalf of K.I.N.D
- All third-party services processing K.I.N.D or client data
- All contractors, employees, and agents with system access
- All client data processed through the K.I.N.D platform

This document is the internal security reference. It is the basis for future ISO 27001 certification (Year 2 target) and will be updated to align with that framework.

---

## 2. DATA CLASSIFICATION

All data handled by K.I.N.D is classified into one of four tiers. Classification determines how data must be stored, transmitted, accessed, and deleted.

| Tier | Label | Examples | Handling requirement |
|------|-------|----------|----------------------|
| T1 | **Restricted** | API keys, database credentials, Stripe live keys, Supabase service role key, JWT secrets | Never in code, never in chat, never in logs. Environment variables only. Rotate immediately on any suspected exposure. |
| T2 | **Confidential** | Client personal data (names, emails, phone numbers), lead data, campaign data, billing data, client ICP configurations | Encrypted at rest and in transit. Access restricted to need-to-know. Subject to GDPR/POPIA/NDPR deletion obligations. |
| T3 | **Internal** | System logs, error traces, internal metrics, MASTER.md, build configs | Not published externally. Access restricted to authorised personnel. |
| T4 | **Public** | Website content, pricing, published blog articles, public API responses | No restriction on distribution. |

**Rule:** When in doubt, classify one tier higher, not lower.

---

## 3. INFRASTRUCTURE SECURITY

### 3.1 Hosting — Railway
- **Platform:** Railway (railway.app) — all three services (Portal, API, Admin)
- **Credentials:** Railway account secured with strong password + 2FA enforced
- **Variables:** All T1 secrets stored as Railway environment variables only — never in code, never in git history
- **Deployments:** Triggered from GitHub via Railway's GitHub integration. No manual deploys to production without a corresponding git commit.
- **Network:** All services behind Railway's managed TLS. No services exposed on raw HTTP.

### 3.2 Database — Supabase
- **Provider:** Supabase (supabase.com)
- **Region:** `af-south-1` (Cape Town, South Africa) — chosen for POPIA compliance (SA data residency)
- **Plan:** Pro (daily automated backups, point-in-time recovery)
- **Access:**
  - Service role key: API only, never browser/frontend
  - Anon key: Portal/Admin only, always with Row Level Security (RLS) enforced
  - Direct Postgres access: disabled for all except founder, via Supabase dashboard only
- **RLS:** Row Level Security enabled on all tables containing client or lead data. No table has a policy of `public` read/write.
- **Backups:** Daily automated (Supabase Pro). Backup retention: 30 days.

### 3.3 Authentication
- **Client auth:** Supabase Auth (magic link + email/password). Sessions expire after 1 hour of inactivity.
- **Admin auth:** Separate admin secret (`ADMIN_SECRET_KEY`) required on all admin API routes, validated server-side.
- **No shared credentials:** Each integration (Stripe, Resend, Apollo, HubSpot) uses its own key scoped to minimum required permissions.

### 3.4 Encryption
- **In transit:** TLS 1.2+ enforced on all services (Railway managed). All database connections use SSL.
- **At rest:** Supabase encrypts data at rest by default (AES-256). Railway encrypts persistent volumes.
- **Secrets:** Never stored in plaintext. Never logged. Never sent in email or chat.

### 3.5 Code Repository — GitHub
- **Repo:** `jacquesvieiraza-blip/KIND` (private)
- **Branch protection:** `main` branch requires PR review before merge. No direct pushes to main.
- **Secret scanning:** GitHub secret scanning enabled. Any detected credential triggers immediate rotation.
- **`.gitignore`:** `.env`, `*.local`, `*.key`, `credentials.json` excluded from all commits.

---

## 4. ACCESS CONTROL

### 4.1 Principle of Least Privilege
Every system account, API key, and database role is granted only the minimum permissions required for its function. No account has god-mode access unless operationally required, and that access is audited.

### 4.2 Access Register

| System | Who has access | Level | MFA required |
|--------|---------------|-------|--------------|
| Railway | Founder | Admin | Yes |
| Supabase dashboard | Founder | Admin | Yes |
| GitHub repo | Founder + Claude Code agent | Admin / write | Yes (founder) |
| Stripe | Founder | Admin | Yes |
| Resend | Founder | Admin | Yes |
| Apollo | Founder | Admin | Yes |
| Admin portal (`/admin`) | Founder | Admin secret | N/A (API key) |

### 4.3 Contractor / Agent Access
- Claude Code (AI coding agent) has write access to the repository only. It cannot access Railway, Supabase dashboard, Stripe, or any production environment directly.
- Any contractor granted system access must be given a scoped account (not the founder's credentials), with access revoked immediately on engagement end.
- Credentials are never shared in chat, email, or any logged channel.

### 4.4 Password & Key Policy
- All passwords: minimum 16 characters, unique per service, stored in a password manager (not written down, not in chat)
- All API keys: rotated immediately on any suspected exposure or annually at minimum
- All 2FA: enabled on all T1 system accounts (Railway, Supabase, GitHub, Stripe, Resend)

---

## 5. THIRD-PARTY VENDOR SECURITY

K.I.N.D is a data processor for its clients and a data controller for its own operations. All third-party vendors processing personal data must meet minimum security standards.

| Vendor | Data processed | Basis for trust | DPA in place |
|--------|---------------|-----------------|--------------|
| Railway | Infrastructure, environment variables | SOC 2 Type II, GDPR compliant | Yes (Railway ToS) |
| Supabase | All client + lead data (af-south-1) | SOC 2 Type II, GDPR + POPIA compliant, Cape Town data residency | Yes (Supabase DPA) |
| Stripe | Payment card data, billing records | PCI DSS Level 1 certified | Yes (Stripe DPA) |
| Resend | Email content, recipient addresses | GDPR compliant | Yes (Resend DPA) |
| Apollo.io | Lead enrichment data | GDPR compliant, US-based | Yes (Apollo DPA) |
| Anthropic | Prompt/response data (no client PII sent) | Enterprise data agreements | Review annually |
| HubSpot (optional) | Client CRM data (client-owned) | SOC 2, GDPR | Client responsibility |

**Rule:** Before adding any new third-party integration that processes personal data, assess their DPA, data residency, and security certifications. Document in this register.

---

## 6. DATA RETENTION AND DELETION

| Data type | Retention period | Deletion method |
|-----------|-----------------|-----------------|
| Lead personal data | Active campaign duration + 12 months | Hard delete from `leads` table on client request or account close |
| Client account data | Duration of contract + 24 months (legal obligation) | Soft delete on close, hard delete at 24 months |
| Email content (sent campaigns) | 12 months | Auto-purge via scheduled cron |
| Billing records | 7 years (UK tax law) | Archive, not delete |
| System logs | 90 days | Auto-rotation |
| Auth tokens / sessions | 1 hour inactivity / 30 days absolute | Supabase automatic expiry |
| Stripe payment data | 7 years (Stripe holds; K.I.N.D holds reference IDs only) | Stripe manages |

**Subject Access Requests (SARs):** Any individual requesting their data must receive a full export within 30 days (UK GDPR requirement). All client lead data is structured to support export by email/ID.

**Right to Erasure:** Delete requests must be fulfilled within 30 days. K.I.N.D must be able to delete all personal data for a given email address across the `leads`, `clients`, and auth tables.

---

## 7. INCIDENT RESPONSE PLAN

### 7.1 Definition of a Security Incident
Any of the following constitute a reportable security incident:
- Unauthorised access to client data, lead data, or T1 credentials
- Data breach affecting personal data (names, emails, any PII)
- Credential exposure (API key in chat, git, logs, email)
- System compromise (malware, unauthorised code execution)
- Sustained service outage caused by attack (DDoS etc.)

### 7.2 Response Steps

**Step 1 — Contain (0-2 hours)**
- Rotate all potentially exposed credentials immediately
- Revoke active sessions in Supabase if account compromise suspected
- Take affected service offline if breach is ongoing
- Do not delete logs — preserve evidence

**Step 2 — Assess (2-24 hours)**
- Identify what data was accessed, by whom, for how long
- Classify affected data tier (T1/T2/T3/T4)
- Determine whether personal data (T2) was involved
- Document everything: timestamp, actions taken, data affected

**Step 3 — Notify (within 72 hours of discovery)**
- **ICO notification:** Required within 72 hours if personal data (T2) was breached and poses a risk to individuals. Report at: ico.org.uk/report-a-breach
- **Client notification:** Required if client-owned data was accessed. Notify the affected client(s) within 72 hours with: what happened, what data, what action taken, what they should do.
- **Data subject notification:** Required if the breach poses a high risk to individuals (identity theft, financial harm). Must be direct (not just on website).

**Step 4 — Recover**
- Restore from last clean backup if data was corrupted
- Re-issue credentials to all affected users
- Implement fix that prevents recurrence
- Document root cause and remediation

**Step 5 — Review**
- Post-incident review within 7 days
- Update security controls to prevent recurrence
- Update this pack if policies need changing
- Log the incident in the incident register (Section 7.3)

### 7.3 Incident Register

| Date | Type | Data affected | Severity | ICO notified | Resolved | Notes |
|------|------|---------------|----------|--------------|---------|-------|
| 4 Jun 2026 | Credential exposure | T1 — all API keys pasted in Claude chat session | High | No (no client PII exposed — internal credentials only) | Pending rotation | All keys to be rotated immediately. No evidence of external access. Claude chat logs are private and not accessible externally. |

---

## 8. BUSINESS CONTINUITY

### 8.1 Recovery Objectives
- **RTO (Recovery Time Objective):** 4 hours — maximum acceptable downtime before service must be restored
- **RPO (Recovery Point Objective):** 24 hours — maximum acceptable data loss (Supabase daily backups)

### 8.2 Backup Infrastructure
- **Database:** Supabase Pro daily automated backups, 30-day retention. Point-in-time recovery available.
- **Code:** GitHub (private repo) with full commit history. Can redeploy from any commit.
- **Configuration:** All Railway env vars documented in founder's password manager (not in code).

### 8.3 Failover
- **Current state:** Single Railway deployment per service, no active failover (acceptable at launch)
- **Phase 2 (Month 2):** CDN failover via Cloudflare, standby region — see `docs/render-cloudflare-failover.md`
- **Recovery procedure:** Redeploy from GitHub to Railway takes under 10 minutes. Database restore from Supabase backup takes under 30 minutes.

---

## 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT

### 9.1 Current State
- No formal penetration test conducted (pre-revenue, acceptable at launch)
- Automated dependency scanning via GitHub Dependabot (enabled)
- TypeScript strict mode enforced — catches a class of injection risks at compile time
- No SQL injection risk: all queries via Supabase client with parameterised queries

### 9.2 Roadmap
| When | Action |
|------|--------|
| Month 3 (50+ clients) | First external penetration test — budget ~£2,000-5,000 |
| Year 2 (ISO 27001 prep) | Annual pen test made mandatory, full vulnerability register |
| Ongoing | Monthly dependency audit (`npm audit`), immediate patch for critical CVEs |

### 9.3 Known Risk Areas
- **API rate limiting:** Implemented on critical routes. Review at 100+ clients.
- **Webhook signature verification:** Resend and Stripe webhooks validate `x-webhook-secret` header. Do not remove this check.
- **Admin routes:** Protected by `ADMIN_SECRET_KEY`. Ensure this key is rotated and never exposed.
- **CORS:** API configured to accept requests from known origins only. Review after any domain change.

---

## 10. SECURITY COMPLIANCE ROADMAP

| Milestone | Target | Estimated cost | Trigger |
|-----------|--------|---------------|---------|
| ICO registration | **Now** | £40/yr | Legal requirement — do immediately |
| First pen test | Month 3 | £2,000-5,000 | 50+ clients or first enterprise enquiry |
| SOC 2 Type II | Year 2 | £15,000-30,000 | US enterprise pipeline |
| ISO 27001 | Year 2 | £20,000 | African enterprise / Nigerian banks |
| ISO 42001 (AI Governance) | Year 2 | £15,000 | AI governance differentiator — no African company has it |

---

## 11. FOUNDER / DIRECTOR PERSONAL LIABILITY

Under UK GDPR and the Data Protection Act 2018, the **company** (K.I.N.D Technologies Ltd) is the data controller and bears primary liability for compliance failures.

**However, directors can be personally liable where:**
- A breach occurred with the director's **consent** (they approved a risky decision)
- A breach occurred with the director's **connivance** (they knew and turned a blind eye)
- A breach resulted from the director's **neglect** (they failed to implement reasonable controls)

**How this pack protects you personally:**
1. Documenting and following these controls is evidence of reasonable care — the primary defence against personal liability
2. The Ltd structure protects personal assets from company debts and ordinary civil claims
3. Directors & Officers (D&O) insurance provides additional personal protection — **recommended by Month 2** (cost: ~£500-1,000/yr for a startup)
4. ICO registration demonstrates compliance intent — unregistered controllers face £400-4,000 fines

**What you must do personally:**
- [ ] Register with ICO — ico.org.uk/register — £40/yr — do this week
- [ ] Get D&O insurance by Month 2
- [ ] Never personally access, process, or store client personal data outside the platform
- [ ] Never use personal email, WhatsApp, or personal devices for T2 data

---

*Document owner: Founder, K.I.N.D Technologies Ltd*
*Next review: December 2026 or after any security incident*
*ISO 27001 mapping: this document covers controls A.5 (Policies), A.6 (Organisation), A.8 (Assets), A.9 (Access), A.12 (Operations), A.16 (Incidents), A.17 (Continuity)*
