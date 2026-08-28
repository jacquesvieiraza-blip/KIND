# 📥 FOUNDER TRUTH INVENTORY — STEP 2B, PART 03 of 10

> # 🛑 STEP 2 INVENTORY ONLY.
> ## PRESENCE HERE DOES NOT MEAN AN ITEM IS CURRENT, CORRECT, LIVE, APPROVED OR LAUNCH-CRITICAL.
> ## CLASSIFICATION OCCURS IN LATER STEPS.
>
> Rows **INV-06406 … INV-08805**. This is a continuation file of
> [`../FOUNDER-TRUTH-INVENTORY-2026-08-28.md`](../FOUNDER-TRUTH-INVENTORY-2026-08-28.md) — the register,
> the sweep record, the coverage proof and the validation results all live there.
> The split is **mechanical only**: the full inventory is ~5 MB of table and GitHub stops rendering a
> markdown file above 1 MB, so a single file would have been unreadable in the pull request.
>
> No deduplication · no comparison · no classification · no priority · no verdict.
> No source document was edited to produce this file.

---

## `docs/legal/it-security-pack.md` *(continued)*

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** IT security pack · **Lines:** 271 · **Material items in this source:** 172 · **Rows in this part:** 121 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06406 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Supabase dashboard | RULE | (none) | (none) | Supabase dashboard · Founder · Admin · Yes |
| INV-06407 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | GitHub repo · Founder + Claude Code agent · Admin / write · Yes (founder) | RULE | (none) | (none) |  |
| INV-06408 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Stripe · Founder · Admin · Yes | RULE | (none) | (none) |  |
| INV-06409 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Resend · Founder · Admin · Yes | RULE | (none) | (none) |  |
| INV-06410 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | PDL (People Data Labs) | RULE | (none) | (none) | PDL (People Data Labs) · Founder · Admin · Yes |
| INV-06411 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Hunter · Founder · Admin · Yes | RULE | (none) | (none) |  |
| INV-06412 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Flutterwave · Founder · Admin · Yes | RULE | (none) | (none) |  |
| INV-06413 | 4. ACCESS CONTROL › 4.2 Access Register | (none) | Admin portal (/admin) | ARCHITECTURE | (none) | (none) | Admin portal (/admin) · Founder · Admin secret · N/A (API key) |
| INV-06414 | 4. ACCESS CONTROL › 4.3 Contractor / Agent Access | (none) | 4.3 Contractor / Agent Access | RULE | (none) | (none) | Heading |
| INV-06415 | 4. ACCESS CONTROL › 4.3 Contractor / Agent Access | (none) | Claude Code (AI coding agent) has write access to the repository only. It cannot access Railway, Supabase dashboard… | RULE | (none) | (none) |  |
| INV-06416 | 4. ACCESS CONTROL › 4.3 Contractor / Agent Access | (none) | Any contractor granted system access must be given a scoped account (not the founder's credentials), with access re… | RULE | (none) | (none) |  |
| INV-06417 | 4. ACCESS CONTROL › 4.3 Contractor / Agent Access | (none) | Credentials are never shared in chat, email, or any logged channel. | RULE | (none) | (none) |  |
| INV-06418 | 4. ACCESS CONTROL › 4.4 Password & Key Policy | (none) | 4.4 Password & Key Policy | RULE | (none) | (none) | Heading |
| INV-06419 | 4. ACCESS CONTROL › 4.4 Password & Key Policy | (none) | All passwords: minimum 16 characters, unique per service, stored in a password manager (not written down, not in ch… | RULE | (none) | (none) |  |
| INV-06420 | 4. ACCESS CONTROL › 4.4 Password & Key Policy | (none) | All API keys: rotated immediately on any suspected exposure or annually at minimum | ARCHITECTURE | (none) | (none) |  |
| INV-06421 | 4. ACCESS CONTROL › 4.4 Password & Key Policy | (none) | All 2FA: enabled on all T1 system accounts (Railway, Supabase, GitHub, Stripe, Resend) | RULE | (none) | (none) |  |
| INV-06422 | 5. THIRD-PARTY VENDOR SECURITY | (none) | 5. THIRD-PARTY VENDOR SECURITY | RULE | (none) | (none) | Heading |
| INV-06423 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Vendor · Data processed · Basis for trust · DPA in place | RULE | (none) | (none) |  |
| INV-06424 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Railway · Infrastructure, environment variables · SOC 2 Type II, GDPR compliant · Yes (Railway ToS) | ARCHITECTURE | (none) | (none) |  |
| INV-06425 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Supabase · All client + lead data (af-south-1) · SOC 2 Type II, GDPR + POPIA compliant, Cape Town data residency · … | RULE | (none) | (none) | Supabase · All client + lead data (af-south-1) · SOC 2 Type II, GDPR + POPIA compliant, Cape Town data residency · Yes (Supabase D… |
| INV-06426 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Stripe · Payment card data, billing records · PCI DSS Level 1 certified · Yes (Stripe DPA) | MONEY | (none) | (none) |  |
| INV-06427 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Resend · Email content, recipient addresses · GDPR compliant · Yes (Resend DPA) | RULE | (none) | (none) |  |
| INV-06428 | 5. THIRD-PARTY VENDOR SECURITY | (none) | PDL (People Data Labs) | RULE | (none) | (none) | PDL (People Data Labs) · Lead sourcing data (people/company) · GDPR compliant, US-based · Yes (PDL DPA) |
| INV-06429 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Hunter · Email finding/verification · GDPR compliant · Yes (Hunter DPA) | RULE | (none) | (none) |  |
| INV-06430 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Flutterwave · Payment data (Africa) · PCI DSS, regulated processor · Yes (Flutterwave DPA) | MONEY | (none) | (none) |  |
| INV-06431 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Anthropic · Prompt/response data (no client PII sent) · Enterprise data agreements · Review annually | COMMERCIAL | (none) | (none) |  |
| INV-06432 | 5. THIRD-PARTY VENDOR SECURITY | (none) | HubSpot (optional) | RULE | (none) | (none) | HubSpot (optional) · Client CRM data (client-owned) · SOC 2, GDPR · Client responsibility |
| INV-06433 | 5. THIRD-PARTY VENDOR SECURITY | (none) | Rule: Before adding any new third-party integration that processes personal data, assess their DPA, data residency,… | RULE | (none) | (none) |  |
| INV-06434 | 6. DATA RETENTION AND DELETION | (none) | 6. DATA RETENTION AND DELETION | RULE | (none) | (none) | Heading |
| INV-06435 | 6. DATA RETENTION AND DELETION | (none) | Data type · Retention period · Deletion method | RULE | (none) | (none) |  |
| INV-06436 | 6. DATA RETENTION AND DELETION | (none) | Lead personal data | ARCHITECTURE | (none) | (none) | Lead personal data · Active campaign duration + 12 months · Hard delete from leads table on client request or account close |
| INV-06437 | 6. DATA RETENTION AND DELETION | (none) | Client account data | RULE | (none) | (none) | Client account data · Duration of contract + 24 months (legal obligation) · Soft delete on close, hard delete at 24 months |
| INV-06438 | 6. DATA RETENTION AND DELETION | (none) | Email content (sent campaigns) | COMMERCIAL | (none) | (none) | Email content (sent campaigns) · 12 months · Auto-purge via scheduled cron |
| INV-06439 | 6. DATA RETENTION AND DELETION | (none) | Billing records | MONEY | (none) | (none) | Billing records · 7 years (UK tax law) · Archive, not delete |
| INV-06440 | 6. DATA RETENTION AND DELETION | (none) | System logs · 90 days · Auto-rotation | RULE | (none) | (none) |  |
| INV-06441 | 6. DATA RETENTION AND DELETION | (none) | Auth tokens / sessions | RULE | (none) | (none) | Auth tokens / sessions · 1 hour inactivity / 30 days absolute · Supabase automatic expiry |
| INV-06442 | 6. DATA RETENTION AND DELETION | (none) | Stripe payment data | MONEY | (none) | (none) | Stripe payment data · 7 years (Stripe holds; K.I.N.D holds reference IDs only) · Stripe manages |
| INV-06443 | 6. DATA RETENTION AND DELETION | (none) | Subject Access Requests (SARs): Any individual requesting their data must receive a full export within 30 days (UK … | RULE | (none) | (none) |  |
| INV-06444 | 6. DATA RETENTION AND DELETION | (none) | Right to Erasure: Delete requests must be fulfilled within 30 days. K.I.N.D must be able to delete all personal dat… | ARCHITECTURE | (none) | (none) |  |
| INV-06445 | 7. INCIDENT RESPONSE PLAN | (none) | 7. INCIDENT RESPONSE PLAN | IDEA | (none) | (none) | Heading |
| INV-06446 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | 7.1 Definition of a Security Incident | RULE | (none) | (none) | Heading |
| INV-06447 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | Unauthorised access to client data, lead data, or T1 credentials | COMMERCIAL | (none) | (none) |  |
| INV-06448 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | Data breach affecting personal data (names, emails, any PII) | RISK | (none) | (none) |  |
| INV-06449 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | Credential exposure (API key in chat, git, logs, email) | ARCHITECTURE | (none) | (none) |  |
| INV-06450 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | System compromise (malware, unauthorised code execution) | RULE | (none) | (none) |  |
| INV-06451 | 7. INCIDENT RESPONSE PLAN › 7.1 Definition of a Security Incident | (none) | Sustained service outage caused by attack (DDoS etc.) | RISK | (none) | (none) |  |
| INV-06452 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | 7.2 Response Steps | RULE | (none) | (none) | Heading |
| INV-06453 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Step 1 — Contain (0-2 hours) | OPERATING | (none) | (none) |  |
| INV-06454 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Rotate all potentially exposed credentials immediately | RULE | (none) | (none) |  |
| INV-06455 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Revoke active sessions in Supabase if account compromise suspected | RULE | (none) | (none) |  |
| INV-06456 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Take affected service offline if breach is ongoing | RISK | (none) | (none) |  |
| INV-06457 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Do not delete logs — preserve evidence | RULE | (none) | (none) |  |
| INV-06458 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Step 2 — Assess (2-24 hours) | OPERATING | (none) | (none) |  |
| INV-06459 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Identify what data was accessed, by whom, for how long | RULE | (none) | (none) |  |
| INV-06460 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Classify affected data tier (T1/T2/T3/T4) | RULE | (none) | (none) |  |
| INV-06461 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Determine whether personal data (T2) was involved | RULE | (none) | (none) |  |
| INV-06462 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Document everything: timestamp, actions taken, data affected | RULE | (none) | (none) |  |
| INV-06463 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Step 3 — Notify (within 72 hours of discovery) | OPERATING | (none) | (none) |  |
| INV-06464 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | ICO notification: Required within 72 hours if personal data (T2) was breached and poses a risk to individuals. Repo… | RISK | (none) | (none) |  |
| INV-06465 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Client notification: Required if client-owned data was accessed. Notify the affected client(s) within 72 hours with… | COMMERCIAL | (none) | (none) |  |
| INV-06466 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Data subject notification: Required if the breach poses a high risk to individuals (identity theft, financial harm)… | RISK | (none) | (none) |  |
| INV-06467 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Restore from last clean backup if data was corrupted | RULE | (none) | (none) |  |
| INV-06468 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Re-issue credentials to all affected users | RULE | (none) | (none) |  |
| INV-06469 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Implement fix that prevents recurrence | RULE | (none) | (none) |  |
| INV-06470 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Document root cause and remediation | RULE | (none) | (none) |  |
| INV-06471 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Post-incident review within 7 days | RULE | (none) | (none) |  |
| INV-06472 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Update security controls to prevent recurrence | RULE | (none) | (none) |  |
| INV-06473 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Update this pack if policies need changing | RULE | (none) | (none) |  |
| INV-06474 | 7. INCIDENT RESPONSE PLAN › 7.2 Response Steps | (none) | Log the incident in the incident register (Section 7.3) | RULE | (none) | (none) |  |
| INV-06475 | 7. INCIDENT RESPONSE PLAN › 7.3 Incident Register | (none) | 7.3 Incident Register | RULE | (none) | (none) | Heading |
| INV-06476 | 7. INCIDENT RESPONSE PLAN › 7.3 Incident Register | (none) | Date · Type · Data affected · Severity · ICO notified · Resolved · Notes | RULE | (none) | (none) |  |
| INV-06477 | 7. INCIDENT RESPONSE PLAN › 7.3 Incident Register | (none) | 4 Jun 2026 · Credential exposure · T1 — all API keys pasted in Claude chat session · High · No (no client PII expos… | MONEY | (none) | 4 Jun 2026 | 4 Jun 2026 · Credential exposure · T1 — all API keys pasted in Claude chat session · High · No (no client PII exposed — internal c… |
| INV-06478 | 8. BUSINESS CONTINUITY | (none) | 8. BUSINESS CONTINUITY | RULE | (none) | (none) | Heading |
| INV-06479 | 8. BUSINESS CONTINUITY › 8.1 Recovery Objectives | (none) | 8.1 Recovery Objectives | RULE | (none) | (none) | Heading |
| INV-06480 | 8. BUSINESS CONTINUITY › 8.1 Recovery Objectives | (none) | RTO (Recovery Time Objective): 4 hours — maximum acceptable downtime before service must be restored | ARCHITECTURE | (none) | (none) |  |
| INV-06481 | 8. BUSINESS CONTINUITY › 8.1 Recovery Objectives | (none) | RPO (Recovery Point Objective): 24 hours — maximum acceptable data loss (Supabase daily backups) | ARCHITECTURE | (none) | (none) |  |
| INV-06482 | 8. BUSINESS CONTINUITY › 8.2 Backup Infrastructure | (none) | 8.2 Backup Infrastructure | ARCHITECTURE | (none) | (none) | Heading |
| INV-06483 | 8. BUSINESS CONTINUITY › 8.2 Backup Infrastructure | (none) | Database: Supabase daily automated backups, 30-day retention. No PITR yet (needs Pro/Team — post-launch decision; s… | OPERATING | (none) | (none) |  |
| INV-06484 | 8. BUSINESS CONTINUITY › 8.2 Backup Infrastructure | (none) | Code: GitHub (private repo) with full commit history. Can redeploy from any commit. | MONEY | (none) | (none) |  |
| INV-06485 | 8. BUSINESS CONTINUITY › 8.2 Backup Infrastructure | (none) | Configuration: All Railway env vars documented in founder's password manager (not in code). | RULE | (none) | (none) |  |
| INV-06486 | 8. BUSINESS CONTINUITY › 8.3 Failover | (none) | 8.3 Failover | RULE | (none) | (none) | Heading |
| INV-06487 | 8. BUSINESS CONTINUITY › 8.3 Failover | (none) | Current state: Single Railway deployment per service, no active failover (acceptable at launch) | ARCHITECTURE | (none) | (none) |  |
| INV-06488 | 8. BUSINESS CONTINUITY › 8.3 Failover | (none) | Phase 2 (Month 2): CDN failover via Cloudflare, standby region — see docs/render-cloudflare-failover.md | RULE | (none) | (none) |  |
| INV-06489 | 8. BUSINESS CONTINUITY › 8.3 Failover | (none) | Recovery procedure: Redeploy from GitHub to Railway takes under 10 minutes. Database restore from Supabase backup t… | OPERATING | (none) | (none) |  |
| INV-06490 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT | (none) | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT | OPERATING | (none) | (none) | Heading |
| INV-06491 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.1 Current State | (none) | 9.1 Current State | RULE | (none) | (none) | Heading |
| INV-06492 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.1 Current State | (none) | No formal penetration test conducted (pre-revenue, acceptable at launch) | MONEY | (none) | (none) |  |
| INV-06493 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.1 Current State | (none) | Automated dependency scanning via GitHub Dependabot (enabled) | RULE | (none) | (none) |  |
| INV-06494 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.1 Current State | (none) | TypeScript strict mode enforced — catches a class of injection risks at compile time | RISK | (none) | (none) |  |
| INV-06495 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.1 Current State | (none) | No SQL injection risk: all queries via Supabase client with parameterised queries | RISK | (none) | (none) |  |
| INV-06496 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.2 Roadmap | (none) | 9.2 Roadmap | IDEA | (none) | (none) | Heading |
| INV-06497 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.2 Roadmap | (none) | Month 3 (50+ clients) | OPERATING | (none) | (none) | Month 3 (50+ clients) · First external penetration test — budget ~£2,000-5,000 |
| INV-06498 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.2 Roadmap | (none) | Year 2 (ISO 27001 prep) | OPERATING | (none) | (none) | Year 2 (ISO 27001 prep) · Annual pen test made mandatory, full vulnerability register |
| INV-06499 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.2 Roadmap | (none) | Ongoing · Monthly dependency audit (npm audit), immediate patch for critical CVEs | RULE | (none) | (none) |  |
| INV-06500 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.3 Known Risk Areas | (none) | 9.3 Known Risk Areas | RISK | (none) | (none) | Heading |
| INV-06501 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.3 Known Risk Areas | (none) | API rate limiting: Implemented on critical routes. Review at 100+ clients. | ARCHITECTURE | (none) | (none) |  |
| INV-06502 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.3 Known Risk Areas | (none) | Webhook signature verification: Resend and Stripe webhooks validate x-webhook-secret header. Do not remove this che… | RULE | (none) | (none) |  |
| INV-06503 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.3 Known Risk Areas | (none) | Admin routes: Protected by ADMIN_SECRET_KEY. Ensure this key is rotated and never exposed. | RULE | (none) | (none) |  |
| INV-06504 | 9. PENETRATION TESTING AND VULNERABILITY MANAGEMENT › 9.3 Known Risk Areas | (none) | CORS: API configured to accept requests from known origins only. Review after any domain change. | ARCHITECTURE | (none) | (none) |  |
| INV-06505 | 10. SECURITY COMPLIANCE ROADMAP | (none) | 10. SECURITY COMPLIANCE ROADMAP | RULE | (none) | (none) | Heading |
| INV-06506 | 10. SECURITY COMPLIANCE ROADMAP | (none) | Milestone · Target · Estimated cost · Trigger | MONEY | (none) | (none) |  |
| INV-06507 | 10. SECURITY COMPLIANCE ROADMAP | (none) | ICO registration | RULE | ✅ | 15 Jun 2026 | ICO registration · ✅ DONE — registered 15 Jun 2026 (ref C1959926) · £40/yr · Legal requirement — completed |
| INV-06508 | 10. SECURITY COMPLIANCE ROADMAP | (none) | First pen test | OPERATING | (none) | (none) | First pen test · Month 3 · £2,000-5,000 · 50+ clients or first enterprise enquiry |
| INV-06509 | 10. SECURITY COMPLIANCE ROADMAP | (none) | SOC 2 Type II | RULE | (none) | (none) | SOC 2 Type II · Year 2 · £15,000-30,000 · US enterprise pipeline |
| INV-06510 | 10. SECURITY COMPLIANCE ROADMAP | (none) | ISO 27001 · Year 2 · £20,000 · African enterprise / Nigerian banks | RULE | (none) | (none) |  |
| INV-06511 | 10. SECURITY COMPLIANCE ROADMAP | (none) | ISO 42001 (AI Governance) | RULE | (none) | (none) | ISO 42001 (AI Governance) · Year 2 · £15,000 · AI governance differentiator — no African company has it |
| INV-06512 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | RULE | (none) | (none) | Heading |
| INV-06513 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | However, directors can be personally liable where | RULE | (none) | (none) |  |
| INV-06514 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | A breach occurred with the director's consent (they approved a risky decision) | RISK | (none) | (none) |  |
| INV-06515 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | A breach occurred with the director's connivance (they knew and turned a blind eye) | RISK | (none) | (none) |  |
| INV-06516 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | A breach resulted from the director's neglect (they failed to implement reasonable controls) | RISK | (none) | (none) |  |
| INV-06517 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | How this pack protects you personally | RULE | (none) | (none) |  |
| INV-06518 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | Documenting and following these controls is evidence of reasonable care — the primary defence against personal liab… | RULE | (none) | (none) |  |
| INV-06519 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | The Ltd structure protects personal assets from company debts and ordinary civil claims | RULE | (none) | (none) |  |
| INV-06520 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | Directors & Officers (D&O) insurance provides additional personal protection — recommended by Month 2 (cost: ~£500-… | MONEY | (none) | (none) |  |
| INV-06521 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | ICO registration demonstrates compliance intent — unregistered controllers face £400-4,000 fines | RULE | (none) | (none) |  |
| INV-06522 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | What you must do personally | RULE | (none) | (none) |  |
| INV-06523 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | [x] Register with ICO — ✅ DONE — ICO registered 15 Jun 2026 (ref C1959926) | RULE | ✅ | 15 Jun 2026 |  |
| INV-06524 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | [ ] Get D&O insurance by Month 2 | RULE | (none) | (none) |  |
| INV-06525 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | [ ] Never personally access, process, or store client personal data outside the platform | RULE | (none) | (none) |  |
| INV-06526 | 11. FOUNDER / DIRECTOR PERSONAL LIABILITY | (none) | [ ] Never use personal email, WhatsApp, or personal devices for T2 data | RULE | (none) | (none) |  |

## `docs/legal/partner-agreement.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Partner agreement · **Lines:** 65 · **Material items in this source:** 40 · **Rows in this part:** 40 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06527 | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | (none) | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | COMMERCIAL | (none) | (none) | Heading |
| INV-06528 | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | (none) | Source of truth for the commercial terms: item 197 (PRODUCT-INVENTORY) + docs/hiring/KIND-PARTNER-COMP-PLAN.md + co… | IDEA | (none) | (none) | Blockquote |
| INV-06529 | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | (none) | Partner Agreement (this doc — commercial + commission + white-label/territory) | MONEY | (none) | (none) |  |
| INV-06530 | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | (none) | Referral & Payout Terms | RULE | (none) | (none) |  |
| INV-06531 | K.I.N.D — Partner Agreement (DRAFT TEMPLATE) | (none) | Data-Processing Addendum (DPA) — POPIA / UK-GDPR | RULE | (none) | (none) |  |
| INV-06532 | 1. Parties & purpose | (none) | 1. Parties & purpose | RULE | (none) | (none) | Heading |
| INV-06533 | 1. Parties & purpose | (none) | K.I.N.D Technologies (UK Ltd) ("K.I.N.D") and the Partner. | COMMERCIAL | (none) | (none) |  |
| INV-06534 | 1. Parties & purpose | (none) | Purpose: the Partner refers and manages small-business clients onto the K.I.N.D platform and earns commission on th… | MONEY | (none) | (none) |  |
| INV-06535 | 2. Partner tiers (matches the portal: referral / agency / white-label) | (none) | 2. Partner tiers (matches the portal: referral / agency / white-label) | COMMERCIAL | (none) | (none) | Heading |
| INV-06536 | 2. Partner tiers (matches the portal: referral / agency / white-label) | (none) | Tier · Who · What they get | RULE | (none) | (none) |  |
| INV-06537 | 2. Partner tiers (matches the portal: referral / agency / white-label) | (none) | Referral · individual referrer · referral link + dashboard + demo account | RULE | (none) | (none) |  |
| INV-06538 | 2. Partner tiers (matches the portal: referral / agency / white-label) | (none) | Agency · agency managing a book of SMB clients · the above + deal registration + managed-book retention earnings | COMMERCIAL | (none) | (none) |  |
| INV-06539 | 2. Partner tiers (matches the portal: referral / agency / white-label) | (none) | White-label · reseller presenting K.I.N.D under their own brand · the above + white-label surface + (optional) terr… | RULE | (none) | (none) | White-label · reseller presenting K.I.N.D under their own brand · the above + white-label surface + (optional) territory |
| INV-06540 | 3. Commission — the LOCKED model (USD) | (none) | 3. Commission — the LOCKED model (USD) | MONEY | (none) | (none) | Heading |
| INV-06541 | 3. Commission — the LOCKED model (USD) | (none) | Base updated 8 Jul (⚖️ needs legal sign-off before signing partners): K.I.N.D bills per qualified lead — no MRR/sub… | MONEY | ⚠️ | 8 Jul | Blockquote |
| INV-06542 | 3. Commission — the LOCKED model (USD) | (none) | Component · Rate · Base · Cadence | RULE | (none) | (none) |  |
| INV-06543 | 3. Commission — the LOCKED model (USD) | (none) | Acquisition · 20% · a new client's first-period collected revenue (per-lead spend) · one-time, on the client's firs… | MONEY | (none) | (none) | Acquisition · 20% · a new client's first-period collected revenue (per-lead spend) · one-time, on the client's first purchase |
| INV-06544 | 3. Commission — the LOCKED model (USD) | (none) | Retention · 5% · the Partner's active book (collected per-lead revenue of clients they manage) · recurring, while t… | MONEY | (none) | (none) | Retention · 5% · the Partner's active book (collected per-lead revenue of clients they manage) · recurring, while the client keeps… |
| INV-06545 | 3. Commission — the LOCKED model (USD) | (none) | No base. No expansion. No cap on referrals or earnings. | RULE | (none) | (none) |  |
| INV-06546 | 3. Commission — the LOCKED model (USD) | (none) | Earned-when-collected: commission is earned only when K.I.N.D collects the underlying revenue and reconciles it. A … | MONEY | (none) | (none) |  |
| INV-06547 | 3. Commission — the LOCKED model (USD) | (none) | Deliberately rewards keeping clients alive, not one-off sign-ups. | COMMERCIAL | (none) | (none) |  |
| INV-06548 | 4. Attribution & deal registration | (none) | 4. Attribution & deal registration | RULE | (none) | (none) | Heading |
| INV-06549 | 4. Attribution & deal registration | (none) | Each Partner gets a unique referral link (get-kind.com?ref= ); signups through it are attributed automatically. | COMMERCIAL | (none) | (none) |  |
| INV-06550 | 4. Attribution & deal registration | (none) | Deal registration with 60-day protection (already in the portal): a registered deal is the Partner's for 60 days. | COMMERCIAL | (none) | (none) |  |
| INV-06551 | 4. Attribution & deal registration | (none) | Attribution is captured once at sign-up and is the basis for all commission. | MONEY | (none) | (none) |  |
| INV-06552 | 5. The Partner's seat & toolkit | (none) | 5. The Partner's seat & toolkit | COMMERCIAL | (none) | (none) | Heading |
| INV-06553 | 5. The Partner's seat & toolkit | (none) | The Partner pays for their own K.I.N.D seat (unlike an AE). | COMMERCIAL | (none) | (none) |  |
| INV-06554 | 5. The Partner's seat & toolkit | (none) | They receive: their portal (book · earnings · payout statements · documents), an auto-provisioned demo/sandbox acco… | IDEA | (none) | (none) |  |
| INV-06555 | 6. Payout & reconciliation | (none) | 6. Payout & reconciliation | RULE | (none) | (none) | Heading |
| INV-06556 | 6. Payout & reconciliation | (none) | Commission is calculated by the comp engine, reconciled to collected MRR (the sales ledger, item 196), and paid on … | MONEY | (none) | (none) |  |
| INV-06557 | 6. Payout & reconciliation | (none) | The Partner sees pending vs paid in their portal. | COMMERCIAL | (none) | (none) |  |
| INV-06558 | 7. White-label / territory (white-label tier only) | (none) | 7. White-label / territory (white-label tier only) | RULE | (none) | (none) | Heading |
| INV-06559 | 7. White-label / territory (white-label tier only) | (none) | [founder to set: brand-use limits · any territory exclusivity · term · what happens to the book on termination] | RULE | (none) | (none) |  |
| INV-06560 | 8. Term, termination & what happens to the book | (none) | 8. Term, termination & what happens to the book | RULE | (none) | (none) | Heading |
| INV-06561 | 8. Term, termination & what happens to the book | (none) | [legal review: notice period · termination for cause · on termination, does retention commission continue on the ex… | MONEY | (none) | (none) |  |
| INV-06562 | 9. Compliance & data (→ the DPA) | (none) | 9. Compliance & data (→ the DPA) | RULE | (none) | (none) | Heading |
| INV-06563 | 9. Compliance & data (→ the DPA) | (none) | The Partner must use the platform within POPIA / UK-GDPR; client data is processed under the DPA. Outreach must hon… | RULE | (none) | (none) |  |
| INV-06564 | 10. Standard legal (skeleton — for the solicitor) | (none) | 10. Standard legal (skeleton — for the solicitor) | RULE | (none) | (none) | Heading |
| INV-06565 | 10. Standard legal (skeleton — for the solicitor) | (none) | Confidentiality (→ NDA) · IP (K.I.N.D owns the platform) · no employment/agency relationship · limitation of liabil… | RULE | (none) | (none) |  |
| INV-06566 | 10. Standard legal (skeleton — for the solicitor) | §6 | Founder decisions to fill before this goes to a solicitor: payout cycle + threshold + method (§6) · white-label/ter… | RULE | (none) | (none) |  |

## `docs/legal/key-rotation-runbook.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Key rotation runbook · **Lines:** 68 · **Material items in this source:** 32 · **Rows in this part:** 32 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06567 | 🔐 Key-Rotation Runbook | (none) | 🔐 Key-Rotation Runbook | OPERATING | (none) | (none) | Heading |
| INV-06568 | 🔐 Key-Rotation Runbook | (none) | Why: the 4-Jun credential-exposure incident (keys pasted into chat). This is the | OPERATING | (none) | (none) |  |
| INV-06569 | 🔐 Key-Rotation Runbook | (none) | Golden rule: rotate one key at a time, update every service that uses it | RULE | (none) | (none) |  |
| INV-06570 | 🔐 Key-Rotation Runbook | (none) | before revoking the old value, then verify. A secret used by two services and | OPERATING | (none) | (none) |  |
| INV-06571 | 🔐 Key-Rotation Runbook | (none) | Priority: do the 2 crown-jewels first (Stripe secret + Supabase service-role). | OPERATING | (none) | (none) |  |
| INV-06572 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | 1) STRIPE_SECRET_KEY (used by: API service only) | ARCHITECTURE | (none) | (none) | Heading |
| INV-06573 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Stripe Dashboard → Developers → API keys → Roll the Secret key (sk_live_…). | ARCHITECTURE | (none) | (none) |  |
| INV-06574 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Stripe gives you the new value once. Copy it. | OPERATING | (none) | (none) |  |
| INV-06575 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Stripe lets the old key keep working for a short grace window — good, no downtime. | OPERATING | (none) | (none) |  |
| INV-06576 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Railway → api service → Variables → set STRIPE_SECRET_KEY = new value → redeploy. | ARCHITECTURE | (none) | (none) |  |
| INV-06577 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Verify: run a test checkout / open the billing page in the portal; confirm a | MONEY | (none) | (none) |  |
| INV-06578 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | Back in Stripe, revoke the old key once the new one is confirmed working. | OPERATING | (none) | (none) |  |
| INV-06579 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | The Stripe webhook signing secret (STRIPE_WEBHOOK_SECRET) is separate. Only | OPERATING | (none) | (none) | Blockquote |
| INV-06580 | 1) STRIPE_SECRET_KEY (used by: API service only) | (none) | rotate it if you recreate the webhook endpoint — if you do, copy the new whsec_… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-06581 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | ARCHITECTURE | (none) | (none) | Heading |
| INV-06582 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | API reads it via packages/db/src/client.ts (the db client — every API route). | ARCHITECTURE | (none) | (none) |  |
| INV-06583 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Admin reads it directly in its server components + /api/ route handlers. | OPERATING | (none) | (none) |  |
| INV-06584 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Portal does NOT use it (anon key only) — nothing to change there. | OPERATING | (none) | (none) |  |
| INV-06585 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Supabase → Project Settings → API → Project API keys → rotate the | ARCHITECTURE | (none) | (none) |  |
| INV-06586 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Railway → api service → Variables → set SUPABASE_SERVICE_ROLE_KEY = new value. | ARCHITECTURE | (none) | (none) |  |
| INV-06587 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Railway → admin service → Variables → set SUPABASE_SERVICE_ROLE_KEY = new value. | OPERATING | (none) | (none) |  |
| INV-06588 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Do both 2 and 3 before redeploying either, so they come back up together. | OPERATING | (none) | (none) |  |
| INV-06589 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Redeploy api and admin. | ARCHITECTURE | (none) | (none) |  |
| INV-06590 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | GET https://api.get-kind.com/health → 200, and the api logs show no | ARCHITECTURE | (none) | (none) |  |
| INV-06591 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Open an admin page that loads data (e.g. Clients) → it renders, no auth error. | COMMERCIAL | (none) | (none) |  |
| INV-06592 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | The old service-role key is invalidated by the rotation itself — once both services | OPERATING | (none) | (none) |  |
| INV-06593 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | If you update only one of the two services, the other will throw | OPERATING | ⚠️ | (none) | Blockquote |
| INV-06594 | 2) Supabase service-role key (used by: API _and_ Admin — TWO services) | (none) | Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY on boot and stay down. | DEFECT | (none) | (none) | Blockquote |
| INV-06595 | After rotation | (none) | After rotation | OPERATING | (none) | (none) | Heading |
| INV-06596 | After rotation | (none) | Tick the incident register in it-security-pack.md from "pending" → "rotated (date)". | OPERATING | (none) | (none) |  |
| INV-06597 | After rotation | (none) | Confirm nothing else broke: signup, a FIGSY send, an admin demo login. | OPERATING | (none) | (none) |  |
| INV-06598 | After rotation | (none) | The exposed values are now dead — even though they appeared in chat history, they | OPERATING | (none) | (none) |  |

## `docs/legal/restore-runbook.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Restore runbook · **Lines:** 51 · **Material items in this source:** 22 · **Rows in this part:** 22 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06599 | 🛟 Restore & Failover Runbook (1-page) | (none) | 🛟 Restore & Failover Runbook (1-page) | OPERATING | (none) | (none) | Heading |
| INV-06600 | 🛟 Restore & Failover Runbook (1-page) | (none) | Scope: what to do if the database is lost/corrupted, or a service goes down. | ARCHITECTURE | (none) | (none) |  |
| INV-06601 | 🛟 Restore & Failover Runbook (1-page) | (none) | Posture (decided 4 Jun): single-region Supabase project kind (af-south-1, Cape | OPERATING | (none) | 4 Jun |  |
| INV-06602 | A) Database lost or corrupted → restore from backup | (none) | A) Database lost or corrupted → restore from backup | ARCHITECTURE | (none) | (none) | Heading |
| INV-06603 | A) Database lost or corrupted → restore from backup | (none) | Supabase → project kind → Database → Backups. Pick the most recent daily | ARCHITECTURE | (none) | (none) |  |
| INV-06604 | A) Database lost or corrupted → restore from backup | (none) | Restore it (Supabase restores in place, or to a new project if the project | OPERATING | (none) | (none) |  |
| INV-06605 | A) Database lost or corrupted → restore from backup | (none) | If you restored to a new project, also rotate/copy SUPABASE_SERVICE_ROLE_KEY | OPERATING | (none) | (none) |  |
| INV-06606 | A) Database lost or corrupted → restore from backup | (none) | Verify: GET https://api.get-kind.com/health → 200; signup + a FIGSY send work. | OPERATING | (none) | (none) |  |
| INV-06607 | A) Database lost or corrupted → restore from backup | (none) | Upgrade path: moving to Supabase Pro gives PITR (point-in-time recovery, RPO | OPERATING | (none) | (none) | Blockquote |
| INV-06608 | A) Database lost or corrupted → restore from backup | (none) | ~minutes instead of 24h) + longer retention. Worth doing once there's live client | COMMERCIAL | (none) | (none) | Blockquote |
| INV-06609 | B) A service is down (api / portal / admin) | (none) | B) A service is down (api / portal / admin) | ARCHITECTURE | (none) | (none) | Heading |
| INV-06610 | B) A service is down (api / portal / admin) | (none) | Check Railway → the service → Deployments/Logs. Most outages are a bad deploy | RISK | (none) | (none) |  |
| INV-06611 | B) A service is down (api / portal / admin) | (none) | Roll back to the last green deploy in Railway, or fix the env var and redeploy. | OPERATING | (none) | (none) |  |
| INV-06612 | C) Full Railway outage → fail over to the Render standby | (none) | C) Full Railway outage → fail over to the Render standby | RISK | (none) | (none) | Heading |
| INV-06613 | C) Full Railway outage → fail over to the Render standby | (none) | Standby env vars must mirror live. Never set NEXT_PUBLIC_ADMIN_KEY (security). | RULE | (none) | (none) |  |
| INV-06614 | C) Full Railway outage → fail over to the Render standby | (none) | NEXT_PUBLIC_ vars are baked at build time — set them before the standby builds. | OPERATING | (none) | (none) |  |
| INV-06615 | Standby-parity check (founder, periodic — Y12) | (none) | Standby-parity check (founder, periodic — Y12) | OPERATING | (none) | (none) | Heading |
| INV-06616 | Standby-parity check (founder, periodic — Y12) | (none) | Failure · Action · Doc | RISK | (none) | (none) |  |
| INV-06617 | Standby-parity check (founder, periodic — Y12) | (none) | DB lost/corrupt | OPERATING | (none) | (none) | DB lost/corrupt · Restore latest daily backup (≤24h loss) · §A |
| INV-06618 | Standby-parity check (founder, periodic — Y12) | (none) | Bad deploy · Roll back in Railway · §B | OPERATING | (none) | (none) |  |
| INV-06619 | Standby-parity check (founder, periodic — Y12) | (none) | Railway down · Cut over to Render standby + Cloudflare · §C + portal-admin-failover.md | OPERATING | (none) | (none) |  |
| INV-06620 | Standby-parity check (founder, periodic — Y12) | (none) | Key compromised | OPERATING | (none) | (none) | Key compromised · Rotate (api + admin together) · key-rotation-runbook.md |

## `docs/compliance/EVIDENCE-PACK.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Compliance evidence pack · **Lines:** 61 · **Material items in this source:** 35 · **Rows in this part:** 35 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06621 | EVIDENCE PACK — the accountability register | (none) | EVIDENCE PACK — the accountability register | RULE | (none) | (none) | Heading |
| INV-06622 | EVIDENCE PACK — the accountability register | (none) | What this is. The register of every document K.I.N.D must be able to hand over if a | RULE | (none) | (none) | Blockquote |
| INV-06623 | EVIDENCE PACK — the accountability register | (none) | regulator, a client, or a DPA audit asks for evidence — per the Global Compliance | RULE | (none) | (none) | Blockquote |
| INV-06624 | EVIDENCE PACK — the accountability register | §19 | Baseline V2 §19 and §6 (founder-held; not in this repo). | RULE | (none) | (none) | Blockquote |
| INV-06625 | EVIDENCE PACK — the accountability register | (none) | Populated by reading the repo, not from memory. Every row citing a file, line or table was | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-06626 | EVIDENCE PACK — the accountability register | (none) | verified by opening it. Where a thing does not exist, the row says no — never "partially", | RULE | (none) | (none) | Blockquote |
| INV-06627 | EVIDENCE PACK — the accountability register | (none) | never softened. Three rows below are better than expected and two are worse; both | RULE | (none) | (none) | Blockquote |
| INV-06628 | EVIDENCE PACK — the accountability register | (none) | directions are marked ⚠️ so the difference is visible rather than buried. | RULE | ⚠️ | (none) | Blockquote |
| INV-06629 | EVIDENCE PACK — the accountability register | (none) | Owner column: 🤖 = in the repo, maintained with the code · 🧍 = the founder holds it, and | RULE | (none) | (none) | Blockquote |
| INV-06630 | EVIDENCE PACK — the accountability register | (none) | no amount of reading this codebase can verify it. | RULE | (none) | (none) | Blockquote |
| INV-06631 | EVIDENCE PACK — the accountability register | (none) | Related, and deliberately not duplicated here: docs/legal/ holds the documents themselves | RULE | (none) | (none) |  |
| INV-06632 | EVIDENCE PACK — the accountability register | (none) | WHAT IT IS · EXISTS? · WHERE HELD · OWNER | RULE | (none) | (none) |  |
| INV-06633 | EVIDENCE PACK — the accountability register | (none) | 1 · RoPA — record of processing activities (UK GDPR Art. 30) · no — mentioned in KIND-MASTER.md and PRODUCT-RULES.m… | RULE | (none) | (none) | 1 · RoPA — record of processing activities (UK GDPR Art. 30) · no — mentioned in KIND-MASTER.md and PRODUCT-RULES.md as a thing we… |
| INV-06634 | EVIDENCE PACK — the accountability register | (none) | 2 · LIA — legitimate interests assessment · no — in motion with counsel. Load-bearing: privacy.html:252 and the sit… | RULE | (none) | (none) | 2 · LIA — legitimate interests assessment · no — in motion with counsel. Load-bearing: privacy.html:252 and the site now state a l… |
| INV-06635 | EVIDENCE PACK — the accountability register | (none) | 3 · Privacy notice + Art. 14 first-contact text · Privacy notice: YES — apps/website/privacy.html, live, 29-page si… | RULE | (none) | (none) | 3 · Privacy notice + Art. 14 first-contact text · Privacy notice: YES — apps/website/privacy.html, live, 29-page site. Art. 14 tex… |
| INV-06636 | EVIDENCE PACK — the accountability register | (none) | 4 · Per-jurisdiction channel-permission evidence · YES, two parts. UK PECR logic: apps/api/src/lib/pecr.ts. ⚠️ And … | RULE | ⚠️ | (none) | 4 · Per-jurisdiction channel-permission evidence · YES, two parts. UK PECR logic: apps/api/src/lib/pecr.ts. ⚠️ And the launch allo… |
| INV-06637 | EVIDENCE PACK — the accountability register | (none) | 5 · Suppression / opt-out records · YES — opt_out_blocklist, upserted on every opt-out with a named reason. Write p… | RISK | (none) | (none) | 5 · Suppression / opt-out records · YES — opt_out_blocklist, upserted on every opt-out with a named reason. Write path read end to… |
| INV-06638 | EVIDENCE PACK — the accountability register | (none) | 6 · Source provenance per lead · PARTIAL — and the gap is named. sourcing_ledger records a run; leads.source is a f… | COMMERCIAL | (none) | (none) | 6 · Source provenance per lead · PARTIAL — and the gap is named. sourcing_ledger records a run; leads.source is a flat string writ… |
| INV-06639 | EVIDENCE PACK — the accountability register | (none) | 7 · Operator action audit · YES — operator_audit_log, written at apps/api/src/lib/operator-audit.ts:171. ⚠️ Best-ef… | RULE | ⚠️ | 20 Aug | 7 · Operator action audit · YES — operator_audit_log, written at apps/api/src/lib/operator-audit.ts:171. ⚠️ Best-effort caveat, de… |
| INV-06640 | EVIDENCE PACK — the accountability register | (none) | 8 · ⚠️ Refusal evidence · YES — but NOT where this row expected. There is no enrol_skips table; lib/enrol-skips.ts … | RISK | ⚠️ | (none) | 8 · ⚠️ Refusal evidence · YES — but NOT where this row expected. There is no enrol_skips table; lib/enrol-skips.ts is a pure forma… |
| INV-06641 | EVIDENCE PACK — the accountability register | (none) | 9 · DPAs / processor contracts + sub-processor register · Register: YES — apps/website/dpa.html lists the vendors. … | RULE | (none) | (none) | 9 · DPAs / processor contracts + sub-processor register · Register: YES — apps/website/dpa.html lists the vendors. Contracts: NOT … |
| INV-06642 | EVIDENCE PACK — the accountability register | (none) | 10 · International transfer terms (SCCs / IDTA) · Claimed on site, contracts to collect. dpa.html:296 commits us to… | OPERATING | (none) | (none) | 10 · International transfer terms (SCCs / IDTA) · Claimed on site, contracts to collect. dpa.html:296 commits us to "appropriate s… |
| INV-06643 | EVIDENCE PACK — the accountability register | §7 | 11 · ⚠️ Breach / incident response plan · YES — better than this row expected. docs/legal/it-security-pack.md §7, r… | RISK | ⚠️ | (none) | 11 · ⚠️ Breach / incident response plan · YES — better than this row expected. docs/legal/it-security-pack.md §7, read end to end:… |
| INV-06644 | EVIDENCE PACK — the accountability register | §6 | 12 · ⚠️ Retention policy · YES — better than this row expected. it-security-pack.md §6, read end to end: a per-data… | MONEY | ⚠️ | (none) | 12 · ⚠️ Retention policy · YES — better than this row expected. it-security-pack.md §6, read end to end: a per-data-type table (le… |
| INV-06645 | EVIDENCE PACK — the accountability register | §6 | 13 · DSAR workflow + log · Workflow: PARTIAL. it-security-pack.md §6 states the 30-day SAR and erasure obligations.… | OPERATING | (none) | (none) | 13 · DSAR workflow + log · Workflow: PARTIAL. it-security-pack.md §6 states the 30-day SAR and erasure obligations. No standalone … |
| INV-06646 | EVIDENCE PACK — the accountability register | (none) | 14 · ICO registration · DONE 5 Aug (founder holds confirmation) · 🧍 founder's records · 🧍 | RULE | (none) | 5 Aug |  |
| INV-06647 | EVIDENCE PACK — the accountability register | (none) | 15 · Consent records (token flow) · YES — per-lead token minted and stored on leads.consent_token (lib/consent.ts:2… | RULE | ⚠️ | (none) | 15 · Consent records (token flow) · YES — per-lead token minted and stored on leads.consent_token (lib/consent.ts:23), redeemed by… |
| INV-06648 | EVIDENCE PACK — the accountability register | (none) | 16 · Per-send legal decision snapshot (campaign_compliance_snapshot) · no — no such table in supabase/migrations/, … | ARCHITECTURE | (none) | (none) | 16 · Per-send legal decision snapshot (campaign_compliance_snapshot) · no — no such table in supabase/migrations/, no code path. P… |
| INV-06649 | EVIDENCE PACK — the accountability register | §4 | 17 · Vendor DPAs / processor terms — to collect · no — none executed and held. The eight that matter: Supabase (all… | RULE | ⚠️ | (none) | 17 · Vendor DPAs / processor terms — to collect · no — none executed and held. The eight that matter: Supabase (all personal data,… |
| INV-06650 | EVIDENCE PACK — the accountability register | (none) | 18 · POPIA s72 cross-border transfer memo · DRAFT, unfiled — docs/compliance/SA-S72-TRANSFER-MEMO-SKELETON.md. Fact… | RULE | (none) | 20 Aug | 18 · POPIA s72 cross-border transfer memo · DRAFT, unfiled — docs/compliance/SA-S72-TRANSFER-MEMO-SKELETON.md. Facts confirmed 20 … |
| INV-06651 | EVIDENCE PACK — the accountability register | (none) | 19 · US data-broker screen (CA Delete Act · VT · TX · OR) · no — and it is a question, not a document. Counsel ques… | COMMERCIAL | ⚠️ | (none) | 19 · US data-broker screen (CA Delete Act · VT · TX · OR) · no — and it is a question, not a document. Counsel question 17 from th… |
| INV-06652 | What this register says, read as a whole | (none) | What this register says, read as a whole | RULE | (none) | (none) | Heading |
| INV-06653 | What this register says, read as a whole | (none) | Machine evidence is strong; paper evidence is thin. Everything the code does — suppression, | RULE | (none) | (none) |  |
| INV-06654 | What this register says, read as a whole | (none) | The two that matter most before the 25th: row 2 (LIA) because the live site now asserts a | RULE | (none) | (none) |  |
| INV-06655 | What this register says, read as a whole | (none) | Row 6 is the quiet one. Provenance is the question a regulator asks first about cold | RULE | (none) | (none) |  |

## `docs/compliance/DATA-BOUNDARY.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Data boundary · **Lines:** 109 · **Material items in this source:** 37 · **Rows in this part:** 37 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06656 | (document root) | (none) | DRAFT — the founder walks this before any client sees it | OPERATING | ⚠️ | (none) | Blockquote |
| INV-06657 | (document root) | (none) | Written 20 Aug 2026 by reading the code. Every claim below names the file and line that proves | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06658 | (document root) | (none) | it, so a buyer can check rather than trust. Not served to any client yet. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-06659 | THE DATA BOUNDARY — four buckets | (none) | THE DATA BOUNDARY — four buckets | RULE | (none) | (none) | Heading |
| INV-06660 | THE DATA BOUNDARY — four buckets | (none) | The question this exists to answer: "Do you use my data for your other customers?" | RULE | (none) | (none) |  |
| INV-06661 | THE DATA BOUNDARY — four buckets | (none) | The answer: no — and here is the grep. | RULE | (none) | (none) |  |
| INV-06662 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | ① CLIENT-CONFIDENTIAL — never crosses, ever | RULE | (none) | (none) | Heading |
| INV-06663 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | What: CRM data, replies, Meeting-Brief knowledge, uploads, sending credentials, calendar. | RULE | (none) | (none) |  |
| INV-06664 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | Every row is client_id-scoped, and row-level security is on | OPERATING | (none) | (none) | Every row is client_id-scoped, and row-level security is on · RLS migrations carried in the migration runner — apps/api/src/lib/pe… |
| INV-06665 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | The Nexus fence (AR3) — a client's learned profile can never reach another client's scoring | RULE | (none) | (none) | The Nexus fence (AR3) — a client's learned profile can never reach another client's scoring · apps/api/src/lib/nexus-guard.ts → as… |
| INV-06666 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | Admin surface reachable only through the proxy, by allow-listed email | OPERATING | (none) | (none) | Admin surface reachable only through the proxy, by allow-listed email · ADMIN_ALLOWED_EMAILS; pinned by apps/api/src/lib/admin-pro… |
| INV-06667 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | Sending credentials encrypted at rest | RULE | (none) | (none) | Sending credentials encrypted at rest · AES-256-GCM — apps/api/src/lib/inbox-secret.ts:28 |
| INV-06668 | ① CLIENT-CONFIDENTIAL — never crosses, ever | (none) | Plain words: your CRM, your replies, your calendar and your uploads are yours. No code path | RULE | (none) | (none) |  |
| INV-06669 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | RULE | (none) | (none) | Heading |
| INV-06670 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | What: lead_pool — prospect records K.I.N.D bought from a licensed provider. | COMMERCIAL | (none) | (none) |  |
| INV-06671 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | The proof, and this is the important one | RULE | (none) | (none) |  |
| INV-06672 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | Three sites. Exactly ONE writes. That write is the PDL-purchase upsert at | RULE | (none) | (none) |  |
| INV-06673 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | apps/api/src/routes/icps.ts:606, and two guards sit in front of it | RULE | (none) | (none) |  |
| INV-06674 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | poolWriteAllowed(isDemo, count) — apps/api/src/lib/pool-sourcing.ts:96. Its own comment | RULE | (none) | (none) |  |
| INV-06675 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | splitPoolEligible(records) — same file, added 20 Aug. Per-record provenance tripwire | RULE | (none) | 20 Aug. |  |
| INV-06676 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | Reuse is governed by three things, not one: the law · the provider's licence · our | RULE | (none) | (none) |  |
| INV-06677 | ② K.I.N.D INDEPENDENTLY SOURCED — the pool, and it is ours | (none) | Plain words: the pool holds people we paid for, never people who came from your CRM. One | RULE | (none) | (none) |  |
| INV-06678 | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | (none) | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | RULE | (none) | (none) | Heading |
| INV-06679 | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | (none) | What: opt_out_blocklist — email plus the reason, normalised before storage. | RULE | (none) | (none) |  |
| INV-06680 | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | (none) | Evidence: written at apps/api/src/lib/reply-ingest.ts:142; checked before every send at | RULE | (none) | (none) |  |
| INV-06681 | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | (none) | Why it outlives deletion: a suppression record must survive the data it suppresses. Deleting | RULE | (none) | (none) |  |
| INV-06682 | ③ SUPPRESSION / LEGAL EVIDENCE — kept deliberately, outlives everything | (none) | Global, not per-client: one opt-out stops every K.I.N.D client reaching that person. | RULE | (none) | (none) |  |
| INV-06683 | ④ AGGREGATE LEARNING — locked shut today | (none) | ④ AGGREGATE LEARNING — locked shut today | RULE | (none) | (none) | Heading |
| INV-06684 | ④ AGGREGATE LEARNING — locked shut today | (none) | What: cross-client patterns — "what converts in general". | COMMERCIAL | (none) | (none) |  |
| INV-06685 | ④ AGGREGATE LEARNING — locked shut today | (none) | Status: closed. The AR3 fence in ① is what closes it: a profile is fetched for one | RULE | (none) | (none) |  |
| INV-06686 | ④ AGGREGATE LEARNING — locked shut today | (none) | It opens only by founder ruling, contracts first. Any future aggregate learning needs a | GATE | (none) | (none) |  |
| INV-06687 | The thirty-second version | (none) | The thirty-second version | RULE | (none) | (none) | Heading |
| INV-06688 | The thirty-second version | (none) | Your data is yours — fenced by client_id, by row-level security, and by a fence that throws | COMMERCIAL | (none) | (none) | Blockquote |
| INV-06689 | The thirty-second version | (none) | rather than leaks. The shared pool holds only people we bought, written by one line of | RULE | (none) | (none) | Blockquote |
| INV-06690 | The thirty-second version | (none) | code with two guards in front of it. Opt-outs are kept forever on purpose, and they protect | RULE | (none) | (none) | Blockquote |
| INV-06691 | The thirty-second version | (none) | people from us. Nothing learns across customers today, and turning that on is a decision with | RULE | (none) | (none) | Blockquote |
| INV-06692 | The thirty-second version | (none) | contracts attached — not a feature toggle. | RULE | (none) | (none) | Blockquote |

## `docs/compliance/SECURITY-TOMS.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Security technical and organisational measures · **Lines:** 36 · **Material items in this source:** 25 · **Rows in this part:** 25 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06693 | (document root) | (none) | DRAFT — the founder confirms the rows marked FOUNDER-CONFIRMS before this is shown to anyone | RULE | ⚠️ | (none) | Blockquote |
| INV-06694 | (document root) | (none) | Written 20 Aug 2026 by reading the code. Three states, and no fourth | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06695 | (document root) | (none) | VERIFIED — cited, and I opened the file · 🧍 FOUNDER-CONFIRMS — true or false depending | RULE | ✅ | (none) | Blockquote |
| INV-06696 | (document root) | (none) | on a setting only he can see · ❌ NOT YET — does not exist. Nothing is upgraded on | RULE | ❌ | (none) | Blockquote |
| INV-06697 | (document root) | (none) | optimism, and a row stays ❌ until someone can point at the thing. | RULE | ❌ | (none) | Blockquote |
| INV-06698 | Technical and organisational measures | (none) | Technical and organisational measures | RULE | (none) | (none) | Heading |
| INV-06699 | Technical and organisational measures | (none) | Control · State · Evidence | RULE | (none) | (none) |  |
| INV-06700 | Technical and organisational measures | (none) | 1 · Tenant isolation · ✅ VERIFIED · Row-level security on; 7 RLS migrations registered in apps/api/src/lib/pending-… | OPERATING | ✅ | (none) | 1 · Tenant isolation · ✅ VERIFIED · Row-level security on; 7 RLS migrations registered in apps/api/src/lib/pending-migrations.ts; … |
| INV-06701 | Technical and organisational measures | (none) | 2 · Access control · ✅ VERIFIED · Supabase auth for clients. Operator surface gated on ADMIN_ALLOWED_EMAILS and rea… | OPERATING | ✅ | (none) | 2 · Access control · ✅ VERIFIED · Supabase auth for clients. Operator surface gated on ADMIN_ALLOWED_EMAILS and reachable only via… |
| INV-06702 | Technical and organisational measures | (none) | 3 · Operator audit log · ✅ VERIFIED · operator_audit_log, written at apps/api/src/lib/operator-audit.ts:171. ⚠️ 41 … | RULE | ✅ ⚠️ | 20 Aug | 3 · Operator audit log · ✅ VERIFIED · operator_audit_log, written at apps/api/src/lib/operator-audit.ts:171. ⚠️ 41 typed actions, … |
| INV-06703 | Technical and organisational measures | O4 | 4 · Secrets management · ✅ VERIFIED · Environment variables held in Railway, never in the repo (O4). Inbox credenti… | RULE | ✅ | (none) | 4 · Secrets management · ✅ VERIFIED · Environment variables held in Railway, never in the repo (O4). Inbox credentials encrypted A… |
| INV-06704 | Technical and organisational measures | (none) | 5 · Encryption in transit · ✅ VERIFIED · TLS on every endpoint; the site and API are HTTPS-only | ARCHITECTURE | ✅ | (none) |  |
| INV-06705 | Technical and organisational measures | (none) | 6 · Encryption at rest · 🧍 VENDOR-CERTIFIED, NOT OURS · Supabase (AWS) encrypts at rest — their certification, not … | RULE | ⚠️ | (none) | 6 · Encryption at rest · 🧍 VENDOR-CERTIFIED, NOT OURS · Supabase (AWS) encrypts at rest — their certification, not ours, and we mu… |
| INV-06706 | Technical and organisational measures | (none) | 7 · Send-safety · ✅ VERIFIED · Kill-switch; atomic step claims so a step cannot double-send; charge-once enforced i… | ARCHITECTURE | ✅ | (none) | 7 · Send-safety · ✅ VERIFIED · Kill-switch; atomic step claims so a step cannot double-send; charge-once enforced in the database … |
| INV-06707 | Technical and organisational measures | (none) | 8 · Backups + restore test · ❌ NOT YET · Daily backups exist and were seen on the dashboard 20 Aug (7 days visible,… | OPERATING | ❌ ⚠️ | 20 Aug | 8 · Backups + restore test · ❌ NOT YET · Daily backups exist and were seen on the dashboard 20 Aug (7 days visible, 13–20 Aug, sam… |
| INV-06708 | Technical and organisational measures | (none) | 9 · MFA on founder accounts · 🧍 FOUNDER-CONFIRMS · Cannot be read from the repo. Applies to: GitHub, Railway, Supab… | RULE | (none) | (none) | 9 · MFA on founder accounts · 🧍 FOUNDER-CONFIRMS · Cannot be read from the repo. Applies to: GitHub, Railway, Supabase, Stripe, Go… |
| INV-06709 | Technical and organisational measures | (none) | 10 · Patching practice · 🧍 FOUNDER-CONFIRMS · Dependencies updated when a build requires it; no scheduled patch cyc… | RULE | (none) | (none) | 10 · Patching practice · 🧍 FOUNDER-CONFIRMS · Dependencies updated when a build requires it; no scheduled patch cycle and no autom… |
| INV-06710 | Technical and organisational measures | §4.3 | 11 · Joiner / leaver · ✅ VERIFIED — by being small · One person has access today: the founder. There is no joiner/l… | RULE | ✅ ⚠️ | (none) | 11 · Joiner / leaver · ✅ VERIFIED — by being small · One person has access today: the founder. There is no joiner/leaver process b… |
| INV-06711 | Technical and organisational measures | §6 | 12 · Logging · ❌ NOT YET · ⚠️ Recounted live, 20 Aug: 105 console lines in apps/api/src reference an email, name or… | OPERATING | ❌ ⚠️ | 20 Aug | 12 · Logging · ❌ NOT YET · ⚠️ Recounted live, 20 Aug: 105 console lines in apps/api/src reference an email, name or lead field (me… |
| INV-06712 | Technical and organisational measures | §7 | 13 · Incident response · ✅ VERIFIED (draft) · docs/compliance/BREACH-RESPONSE-DRAFT.md — detection sources, first h… | RISK | ✅ ⚠️ | (none) | 13 · Incident response · ✅ VERIFIED (draft) · docs/compliance/BREACH-RESPONSE-DRAFT.md — detection sources, first hour, who decide… |
| INV-06713 | What a buyer should be told without being asked | (none) | What a buyer should be told without being asked | RULE | (none) | (none) | Heading |
| INV-06714 | What a buyer should be told without being asked | (none) | Backups (8) — we take them; we have never restored from one. That is the honest state. | RULE | (none) | (none) |  |
| INV-06715 | What a buyer should be told without being asked | (none) | Logging (12) — personal data reaches application logs in 105 places, and we cannot yet | RULE | (none) | (none) |  |
| INV-06716 | What a buyer should be told without being asked | (none) | Patching (10) — reactive, not scheduled. | RULE | (none) | (none) |  |
| INV-06717 | What a buyer should be told without being asked | (none) | Volunteering these is what makes the ten ✅ rows credible. A buyer who discovers one of them | RULE | ✅ | (none) |  |

## `docs/compliance/TRUST-ROOM.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Trust room contents · **Lines:** 52 · **Material items in this source:** 31 · **Rows in this part:** 31 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06718 | (document root) | (none) | DRAFT — counsel blesses the legal rows; the founder walks the FAQ before any client sees it | OPERATING | ⚠️ | (none) | Blockquote |
| INV-06719 | (document root) | (none) | Nothing here has been served to a client, filed, or published. Written 20 Aug 2026 by | COMMERCIAL | (none) | 20 Aug 2026 | Blockquote |
| INV-06720 | (document root) | (none) | reading the repo. On merge these become governed documents in the Vida document home | RULE | (none) | (none) | Blockquote |
| INV-06721 | (document root) | (none) | (Prompt 10, /vida/governed-documents) — one copy, per the founder's own rule. | RULE | (none) | (none) | Blockquote |
| INV-06722 | (document root) | (none) | Merging does not move them automatically: filing them in Vida is a manual step. | RULE | ⚠️ | (none) | Blockquote |
| INV-06723 | THE TRUST ROOM — index and walk-through | (none) | THE TRUST ROOM — index and walk-through | OPERATING | (none) | (none) | Heading |
| INV-06724 | The presentation rule | (none) | The presentation rule | RULE | (none) | (none) | Heading |
| INV-06725 | The presentation rule | (none) | We never say "compliant." Compliance is a regulator's conclusion, not a claim we award | RULE | (none) | (none) |  |
| INV-06726 | The presentation rule | (none) | what we process · why · where it goes · the basis · the controls · the rights process · the evidence | RULE | (none) | (none) | Blockquote |
| INV-06727 | The twelve items | (none) | The twelve items | RULE | (none) | (none) | Heading |
| INV-06728 | The twelve items | (none) | Item · Status · Where it lives · Owner | RULE | (none) | (none) |  |
| INV-06729 | The twelve items | (none) | 1 · RoPA — record of processing activities · OPEN · not written · 🧍 | RULE | (none) | (none) |  |
| INV-06730 | The twelve items | §3 | 2 · Role / data-sharing map — controller vs processor, per client and per data category · OPEN · Partly in BREACH-R… | RISK | (none) | (none) | 2 · Role / data-sharing map — controller vs processor, per client and per data category · OPEN · Partly in BREACH-RESPONSE-DRAFT.m… |
| INV-06731 | The twelve items | §3 | 3 · DPIA / impact assessment · OPEN · Not started. POPIA also requires a personal information impact assessment (SA… | OPERATING | (none) | (none) | 3 · DPIA / impact assessment · OPEN · Not started. POPIA also requires a personal information impact assessment (SA-INFORMATION-OF… |
| INV-06732 | The twelve items | (none) | 4 · Data boundary — what is client-confidential, what is ours, what never crosses · ✅ VERIFIED · DATA-BOUNDARY.md —… | RULE | ✅ | (none) | 4 · Data boundary — what is client-confidential, what is ours, what never crosses · ✅ VERIFIED · DATA-BOUNDARY.md — every bucket c… |
| INV-06733 | The twelve items | (none) | 5 · TOMs — technical and organisational measures · ✅ VERIFIED (per row) · SECURITY-TOMS.md — 12 control families, e… | RULE | ✅ | (none) | 5 · TOMs — technical and organisational measures · ✅ VERIFIED (per row) · SECURITY-TOMS.md — 12 control families, each VERIFIED / … |
| INV-06734 | The twelve items | §7 | 6 · Incident pack · ✅ VERIFIED (draft) · BREACH-RESPONSE-DRAFT.md + docs/legal/it-security-pack.md §7. ⚠️ Threshold… | RISK | ✅ ⚠️ | (none) | 6 · Incident pack · ✅ VERIFIED (draft) · BREACH-RESPONSE-DRAFT.md + docs/legal/it-security-pack.md §7. ⚠️ Thresholds unworded — co… |
| INV-06735 | The twelve items | §6 | 7 · Rights system — access, correction, deletion, opt-out · PARTIAL · Opt-out is real and cited (DATA-BOUNDARY.md ③… | OPERATING | (none) | (none) | 7 · Rights system — access, correction, deletion, opt-out · PARTIAL · Opt-out is real and cited (DATA-BOUNDARY.md ③). Access/corre… |
| INV-06736 | The twelve items | §6 | 8 · Retention schedule · ✅ VERIFIED (written) · docs/legal/it-security-pack.md §6 — per-category table. ⚠️ Written,… | ARCHITECTURE | ✅ ⚠️ | (none) | 8 · Retention schedule · ✅ VERIFIED (written) · docs/legal/it-security-pack.md §6 — per-category table. ⚠️ Written, not verified a… |
| INV-06737 | The twelve items | (none) | 9 · OAuth / platform audit · ✅ VERIFIED · Google scopes narrowed 20 Aug — apps/api/src/lib/gcal.ts; pinned by gcal-… | OPERATING | ✅ | 20 Aug | 9 · OAuth / platform audit · ✅ VERIFIED · Google scopes narrowed 20 Aug — apps/api/src/lib/gcal.ts; pinned by gcal-scopes.test.ts.… |
| INV-06738 | The twelve items | (none) | 10 · Sensitive-data policy — special-category data · OPEN · No written rule that we do not target or store special-… | RULE | (none) | (none) | 10 · Sensitive-data policy — special-category data · OPEN · No written rule that we do not target or store special-category data. … |
| INV-06739 | The twelve items | (none) | 11 · Sub-processor file · PARTIAL / COUNSEL · The list is published (apps/website/dpa.html). The contracts are not … | RULE | (none) | (none) | 11 · Sub-processor file · PARTIAL / COUNSEL · The list is published (apps/website/dpa.html). The contracts are not held — EVIDENCE… |
| INV-06740 | The twelve items | #605 | 12 · Privacy change gate — no silent change to what we claim · ✅ VERIFIED · Site claims are guard-enforced: website… | OPERATING | ✅ | (none) | 12 · Privacy change gate — no silent change to what we claim · ✅ VERIFIED · Site claims are guard-enforced: website-residency-clai… |
| INV-06741 | The twelve items | (none) | Score, stated plainly: 5 VERIFIED · 3 PARTIAL · 4 OPEN. The machine-side is strong; the | RULE | (none) | (none) |  |
| INV-06742 | How to walk it | (none) | How to walk it | OPERATING | (none) | (none) | Heading |
| INV-06743 | How to walk it | (none) | Open with the rule above. Say we do not claim compliance; say we show evidence. | RULE | (none) | (none) |  |
| INV-06744 | How to walk it | (none) | Item 4 first — DATA-BOUNDARY.md. It answers "do you use my data for other customers?" | RULE | (none) | (none) |  |
| INV-06745 | How to walk it | (none) | Item 5 — SECURITY-TOMS.md, control by control. Do not skip the NOT YET rows: reading | RULE | (none) | (none) |  |
| INV-06746 | How to walk it | (none) | Item 6 — what happens if it goes wrong, including when a vendor is breached. | RISK | (none) | (none) |  |
| INV-06747 | How to walk it | (none) | CLIENT-SECURITY-FAQ.md for the ten questions they will actually ask. | COMMERCIAL | (none) | (none) |  |
| INV-06748 | How to walk it | (none) | Say what is open. Items 1, 2, 3, 10 are open. A buyer who finds one you hid stops | RULE | (none) | (none) |  |

## `docs/compliance/UPSTREAM-DSR-PROPAGATION.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Upstream DSR propagation · **Lines:** 131 · **Material items in this source:** 52 · **Rows in this part:** 52 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06749 | Upstream DSR propagation — when a provider tells us somebody objected | (none) | Upstream DSR propagation — when a provider tells us somebody objected | RULE | ⛓️ | (none) | Heading |
| INV-06750 | Upstream DSR propagation — when a provider tells us somebody objected | (none) | What this document is for. We buy contact data from other companies. When a person exercises their rights with that… | RULE | (none) | (none) | Blockquote |
| INV-06751 | Upstream DSR propagation — when a provider tells us somebody objected | (none) | This is the map of every signal each provider actually exposes, what we do with it today, and — where no tooling ex… | RULE | (none) | (none) | Blockquote |
| INV-06752 | Upstream DSR propagation — when a provider tells us somebody objected | (none) | Status: partial. One signal is handled in code. Everything else on this page is a documented gap with a manual rule… | RULE | ⚠️ | (none) | Blockquote |
| INV-06753 | THE ONE SENTENCE THAT MUST NOT BE MISREAD | (none) | THE ONE SENTENCE THAT MUST NOT BE MISREAD | RULE | ⚠️ | (none) | Heading |
| INV-06754 | THE ONE SENTENCE THAT MUST NOT BE MISREAD | (none) | Nothing on this page reaches backwards into data we have already cached. | RULE | (none) | (none) |  |
| INV-06755 | 1 · Hunter.io — ✅ one signal handled, verified first-hand | (none) | 1 · Hunter.io — ✅ one signal handled, verified first-hand | RULE | ✅ | (none) | Heading |
| INV-06756 | 1 · Hunter.io — ✅ one signal handled, verified first-hand | (none) | Evidence status: VERIFIED. hunter.io/api-documentation/v2 fetched live on 20 Aug 2026 (HTTP 200). The wording below… | RULE | (none) | 20 Aug 2026 |  |
| INV-06757 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | 1.1 451 claimed_email — HANDLED IN CODE | RULE | (none) | (none) | Heading |
| INV-06758 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | "The person owning the email address asked us directly or indirectly to stop the processing of their personal data.… | RULE | (none) | (none) | Blockquote |
| INV-06759 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | What happens now (lib/enrichment.ts) | RULE | (none) | (none) |  |
| INV-06760 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | The signal · tryHunter reads the 451 on Hunter's own branch and returns a typed ProviderRefusal | RULE | (none) | (none) |  |
| INV-06761 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | The response · waterfallEnrich discards the entire merged result and returns { source: 'none' } | RULE | (none) | (none) |  |
| INV-06762 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | Why the whole thing | RULE | (none) | (none) | Why the whole thing · PDL runs first. By the time the refusal arrives we already hold a PDL profile — title, company, domain — for… |
| INV-06763 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | Persistence · None. Nothing is written for this identity | RULE | (none) | (none) |  |
| INV-06764 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | Fall-through · None. No further provider is asked for the same identity | RULE | (none) | (none) |  |
| INV-06765 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | Visibility · console.warn with provider_refusal:hunter:claimed_email, the reason, and the source URL — the enrol_sk… | RULE | (none) | (none) | Visibility · console.warn with provider_refusal:hunter:claimed_email, the reason, and the source URL — the enrol_skips shape an op… |
| INV-06766 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | The client's money | MONEY | (none) | (none) | The client's money · Unchanged and correct: approve-lead.ts sees "no email", reverses the $4 and returns no_email. A client is nev… |
| INV-06767 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.1 451 claimed_email — HANDLED IN CODE | (none) | What it does NOT do: it does not write to opt_out_blocklist (that register is our sending suppression, a different … | COMMERCIAL | (none) | (none) |  |
| INV-06768 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.2 400 invalid_domain — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED | (none) | 1.2 400 invalid_domain — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED | RULE | ⚠️ | (none) | Heading |
| INV-06769 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.2 400 invalid_domain — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED | (none) | "The domain name is invalid, has no MX record or its owner has asked us to stop the processing of the associated da… | RULE | (none) | (none) | Blockquote |
| INV-06770 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.2 400 invalid_domain — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED | (none) | Why nothing is built: the two meanings are indistinguishable from outside. Mapping this to a privacy refusal would … | RULE | (none) | 20 Aug |  |
| INV-06771 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.2 400 invalid_domain — ⚠️ DOCUMENTED, DELIBERATELY NOT HANDLED | (none) | MANUAL RULE: if Hunter's invalid_domain appears repeatedly for a domain that plainly exists and resolves, treat it … | RULE | (none) | (none) |  |
| INV-06772 | 1 · Hunter.io — ✅ one signal handled, verified first-hand › 1.3 What Hunter does not give us | (none) | 1.3 What Hunter does not give us | RULE | (none) | (none) | Heading |
| INV-06773 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY | (none) | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY | RULE | ⚠️ | (none) | Heading |
| INV-06774 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY | (none) | Evidence status: UNVERIFIED-SECONDARY. docs.peopledatalabs.com returns a JavaScript-rendered 404 shell to this buil… | RULE | (none) | 20 Aug 2026 |  |
| INV-06775 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY | (none) | PDL is our PRIMARY sourcing provider and the only writer into lead_pool (routes/icps.ts tags every pooled record so… | COMMERCIAL | (none) | (none) |  |
| INV-06776 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › What has to be answered — against the founder's own Order Form, not the public docs | (none) | What has to be answered — against the founder's own Order Form, not the public docs | RULE | (none) | (none) | Heading |
| INV-06777 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › What has to be answered — against the founder's own Order Form, not the public docs | (none) | Does PDL expose a changelog / delta feed identifying records removed since a given date? | RULE | (none) | (none) |  |
| INV-06778 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › What has to be answered — against the founder's own Order Form, not the public docs | (none) | Does PDL expose a Subject Request / suppression API we can poll or receive? | ARCHITECTURE | (none) | (none) |  |
| INV-06779 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › What has to be answered — against the founder's own Order Form, not the public docs | (none) | What does the contract require of us when a record is withdrawn — delete, suppress, or nothing? | RULE | (none) | (none) |  |
| INV-06780 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › What has to be answered — against the founder's own Order Form, not the public docs | R49 | On subscription termination, what must happen to cached PDL data? (R49 gate ③ records this as deletion with a signe… | GATE | (none) | (none) |  |
| INV-06781 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › The design, once those answers exist | (none) | The design, once those answers exist | RULE | (none) | (none) | Heading |
| INV-06782 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › MANUAL RULE until it is | (none) | MANUAL RULE until it is | RULE | ⚠️ | (none) | Heading |
| INV-06783 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › MANUAL RULE until it is | (none) | Nothing automatic exists, so this is the whole of our propagation for PDL today | RULE | (none) | (none) |  |
| INV-06784 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › MANUAL RULE until it is | (none) | If PDL notifies us of a withdrawal by any channel — email, portal, account manager — the founder or an operator sup… | HISTORY | (none) | (none) |  |
| INV-06785 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › MANUAL RULE until it is | (none) | Any person who contacts us directly asking to be removed is handled through opt_out_blocklist and has their pool ro… | COMMERCIAL | (none) | (none) |  |
| INV-06786 | 2 · People Data Labs — ⚠️ UNVERIFIED-SECONDARY › MANUAL RULE until it is | #2 | Before client #2 is ever served a cached record, R49's gate ② must be cleared and this section must be filled in wi… | GATE | (none) | (none) |  |
| INV-06787 | 3 · Apollo — not in the day-to-day stack | (none) | 3 · Apollo — not in the day-to-day stack | ARCHITECTURE | (none) | (none) | Heading |
| INV-06788 | 3 · Apollo — not in the day-to-day stack | (none) | Evidence status: UNVERIFIED-SECONDARY — Apollo's terms were read by GPT, not from this container (F15). | RULE | (none) | (none) |  |
| INV-06789 | 3 · Apollo — not in the day-to-day stack | (none) | MANUAL RULE: Apollo-sourced records are already fenced from lead_pool by construction (only the PDL path writes the… | RULE | (none) | (none) |  |
| INV-06790 | 4 · The signals we will never receive | (none) | 4 · The signals we will never receive | RULE | (none) | (none) | Heading |
| INV-06791 | 4 · The signals we will never receive | (none) | A person who objects to a provider after we cached them, where that provider has no delta feed, generates no signal… | RULE | (none) | (none) |  |
| INV-06792 | 4 · The signals we will never receive | (none) | A person who objects directly to us is covered by opt_out_blocklist for sending — but that is a different register,… | COMMERCIAL | (none) | (none) |  |
| INV-06793 | 4 · The signals we will never receive | (none) | Providers do not tell each other. A Hunter refusal says nothing about PDL's copy of the same person, and vice versa… | RULE | (none) | (none) |  |
| INV-06794 | 5 · Adding a provider — the rule that must not be skipped | (none) | 5 · Adding a provider — the rule that must not be skipped | RULE | (none) | (none) | Heading |
| INV-06795 | 5 · Adding a provider — the rule that must not be skipped | (none) | A status code has no inherent privacy meaning. | RULE | (none) | (none) |  |
| INV-06796 | Where this is enforced | (none) | Where this is enforced | RULE | (none) | (none) | Heading |
| INV-06797 | Where this is enforced | (none) | Code · apps/api/src/lib/enrichment.ts — the refusal table, hunterRefusal, the discard in waterfallEnrich | ARCHITECTURE | (none) | (none) |  |
| INV-06798 | Where this is enforced | (none) | Guard · apps/api/src/lib/enrichment-dsr.test.ts — including that this document exists and still carries its gaps | OPERATING | (none) | (none) |  |
| INV-06799 | Where this is enforced | R52 | Register · R52 in docs/PRODUCT-RULES.md · item #667 | RULE | (none) | (none) |  |
| INV-06800 | Where this is enforced | R49 | Related · R49 (PDL's three licence gates) · F15 (Apollo provenance) · F2 (whether opt-outs stop re-scoring, not mer… | RULE | (none) | (none) | Related · R49 (PDL's three licence gates) · F15 (Apollo provenance) · F2 (whether opt-outs stop re-scoring, not merely re-sending)… |

## `docs/compliance/BREACH-RESPONSE-DRAFT.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Breach response draft for counsel · **Lines:** 116 · **Material items in this source:** 33 · **Rows in this part:** 33 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06801 | (document root) | (none) | DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON | RULE | ⚠️ | (none) | Blockquote |
| INV-06802 | (document root) | (none) | Counsel words both notification thresholds. They are stated here as different from each | RULE | (none) | (none) | Blockquote |
| INV-06803 | (document root) | (none) | other, which is the operational point, and not in legal terms — the wording of each is | RULE | (none) | (none) | Blockquote |
| INV-06804 | (document root) | (none) | counsel's, and a draft that phrased them would invite someone to act on an unreviewed sentence | RULE | (none) | (none) | Blockquote |
| INV-06805 | (document root) | (none) | during the one hour when that is most dangerous. | RISK | (none) | (none) | Blockquote |
| INV-06806 | (document root) | (none) | Written 20 Aug 2026. Every detection source named below was read in the repo and is cited. | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06807 | (document root) | §7 | This complements, not replaces, docs/legal/it-security-pack.md §7, which already sets | RULE | ⚠️ | (none) | Blockquote |
| INV-06808 | (document root) | §7 | out five response steps with clocks. §7 is the plan; this one-pager is the decision path and | IDEA | (none) | (none) | Blockquote |
| INV-06809 | Incident response — one-pager | (none) | Incident response — one-pager | RULE | (none) | (none) | Heading |
| INV-06810 | 1. How we find out | (none) | 1. How we find out | RULE | (none) | (none) | Heading |
| INV-06811 | 1. How we find out | (none) | Source · What it is · Where | RULE | (none) | (none) |  |
| INV-06812 | 1. How we find out | (none) | error_events · Every unhandled API error is written here by the error middleware · apps/api/src/middleware/error.ts… | ARCHITECTURE | (none) | (none) | error_events · Every unhandled API error is written here by the error middleware · apps/api/src/middleware/error.ts:47 and :83 · t… |
| INV-06813 | 1. How we find out | #339 | Founder alerts | RULE | ⚠️ | (none) | Founder alerts · Push to the founder by email, plus Slack if SLACK_WEBHOOK_URL is set. Best-effort by design: never throws into th… |
| INV-06814 | 1. How we find out | §5 | Vendor notices | RISK | (none) | (none) | Vendor notices · Supabase, Railway, Resend, Anthropic, Smartlead, PDL, Hunter status pages and breach notifications to us · Extern… |
| INV-06815 | 1. How we find out | (none) | Operator audit gaps | RISK | (none) | 20 Aug | Operator audit gaps · A persistent audit-write outage now raises a throttled alert (Prompt 11, 20 Aug) · apps/api/src/lib/operator… |
| INV-06816 | 1. How we find out | (none) | A person telling us | RULE | (none) | (none) | A person telling us · A client, a prospect, or a researcher · privacy@get-kind.com |
| INV-06817 | 2. The first hour | (none) | 2. The first hour | RULE | (none) | (none) | Heading |
| INV-06818 | 2. The first hour | (none) | Contain. Rotate exposed credentials (docs/legal/key-rotation-runbook.md). Revoke sessions | OPERATING | (none) | (none) |  |
| INV-06819 | 2. The first hour | (none) | Do not delete anything. Logs, error_events rows and audit rows are the evidence. | RULE | (none) | (none) |  |
| INV-06820 | 2. The first hour | (none) | Write down the time you learned of it, and from whom. Both regimes' clocks run from a | RULE | (none) | (none) |  |
| INV-06821 | 2. The first hour | §3 | Establish scope before notifying anyone — §3. Notifying the wrong scope is its own harm. | DEFECT | (none) | (none) |  |
| INV-06822 | 2. The first hour | §4 | Do not communicate externally yet. §4 says who decides. | RULE | (none) | (none) |  |
| INV-06823 | 3. Scope — the four questions, in order | (none) | 3. Scope — the four questions, in order | RULE | (none) | (none) | Heading |
| INV-06824 | 3. Scope — the four questions, in order | (none) | What data? Categories, not counts — names, work emails, employers, message content, credentials. | RULE | (none) | (none) |  |
| INV-06825 | 3. Scope — the four questions, in order | (none) | Whose? Which clients, and which of their prospects. | COMMERCIAL | (none) | (none) |  |
| INV-06826 | 3. Scope — the four questions, in order | (none) | Our role for each? Controller or processor differs per client and per data category — that determines whether we no… | COMMERCIAL | (none) | (none) |  |
| INV-06827 | 3. Scope — the four questions, in order | §2 | Where did it sit? Dublin (database), US West (compute) — see SA-S72-TRANSFER-MEMO-SKELETON.md §2. More than one reg… | ARCHITECTURE | (none) | (none) |  |
| INV-06828 | 4. Who decides notification | (none) | 4. Who decides notification | RULE | (none) | (none) | Heading |
| INV-06829 | 4. Who decides notification | (none) | The founder decides, on counsel's advice. Nobody else, and no automation. No contractor, | RULE | (none) | (none) |  |
| INV-06830 | 5. Vendor incident — the branch | (none) | 5. Vendor incident — the branch | RULE | (none) | (none) | Heading |
| INV-06831 | 6. Evidence to preserve | (none) | 6. Evidence to preserve | RULE | (none) | (none) | Heading |
| INV-06832 | 7. Where the record of the incident lives | (none) | 7. Where the record of the incident lives | RULE | (none) | (none) | Heading |
| INV-06833 | 7. Where the record of the incident lives | (none) | The Vida document home (Prompt 10 — governed_documents, /vida/governed-documents), which | RULE | (none) | (none) |  |

## `docs/compliance/CLIENT-SECURITY-FAQ.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Client security FAQ draft · **Lines:** 135 · **Material items in this source:** 29 · **Rows in this part:** 29 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06834 | (document root) | (none) | DRAFT — the founder walks this before any client sees it | OPERATING | ⚠️ | (none) | Blockquote |
| INV-06835 | (document root) | (none) | Written 20 Aug 2026. Answers are in plain words and each points at the document that proves it. | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06836 | (document root) | (none) | If an answer here ever drifts from the document it cites, the document wins. | RISK | (none) | (none) | Blockquote |
| INV-06837 | Client security FAQ — the ten questions | (none) | Client security FAQ — the ten questions | COMMERCIAL | (none) | (none) | Heading |
| INV-06838 | 1. Where is my data? | (none) | 1. Where is my data? | RULE | (none) | (none) | Heading |
| INV-06839 | 1. Where is my data? | (none) | Stored in Dublin, Ireland (Supabase, eu-west-1). Processed on servers in US West | RULE | (none) | (none) |  |
| INV-06840 | 2. Who can see it? | (none) | 2. Who can see it? | RULE | (none) | (none) | Heading |
| INV-06841 | 3. Do you use my data for your other clients? | (none) | 3. Do you use my data for your other clients? | COMMERCIAL | (none) | (none) | Heading |
| INV-06842 | 3. Do you use my data for your other clients? | (none) | No. Your CRM data, replies, uploads and calendar are fenced to your client_id by row-level | COMMERCIAL | (none) | (none) |  |
| INV-06843 | 4. Who are your sub-processors? | (none) | 4. Who are your sub-processors? | RULE | (none) | (none) | Heading |
| INV-06844 | 5. What if you're breached? | (none) | 5. What if you're breached? | RISK | (none) | (none) | Heading |
| INV-06845 | 6. What happens when I leave? | (none) | 6. What happens when I leave? | RULE | (none) | (none) | Heading |
| INV-06846 | 7. How do opt-outs work? | (none) | 7. How do opt-outs work? | RULE | (none) | (none) | Heading |
| INV-06847 | 8. How do I get my data out? | (none) | 8. How do I get my data out? | RULE | (none) | (none) | Heading |
| INV-06848 | 9. Do you train AI on my data? | (none) | 9. Do you train AI on my data? | RULE | (none) | (none) | Heading |
| INV-06849 | 9. Do you train AI on my data? | (none) | factually FALSE: production code proves names are sent. What we CAN state is what our own | RULE | (none) | (none) |  |
| INV-06850 | 9. Do you train AI on my data? | (none) | What reaches Anthropic's Claude API — established from production code, not from policy. | ARCHITECTURE | (none) | (none) |  |
| INV-06851 | 9. Do you train AI on my data? | (none) | ① Structured lead paths (scoring · sequence writing · reply classification). These send lead | COMMERCIAL | (none) | (none) |  |
| INV-06852 | 9. Do you train AI on my data? | (none) | name, job title, company, industry, seniority, country, and up to the | RULE | (none) | (none) |  |
| INV-06853 | 9. Do you train AI on my data? | (none) | ② Milla client chat. This sends the client's typed messages, their prior chat turns, and | COMMERCIAL | (none) | (none) |  |
| INV-06854 | 9. Do you train AI on my data? | (none) | verbatim excerpts of documents they have uploaded. No content filtering, redaction or PII | RULE | (none) | (none) |  |
| INV-06855 | 9. Do you train AI on my data? | (none) | So the accurate statement is narrow, and deliberately so: the structured lead.email field is | COMMERCIAL | (none) | (none) |  |
| INV-06856 | 10. Are you SOC 2 certified? | (none) | 10. Are you SOC 2 certified? | RULE | (none) | (none) | Heading |
| INV-06857 | 10. Are you SOC 2 certified? | (none) | No — and the distinction matters, so we never blur it. | RULE | (none) | (none) |  |
| INV-06858 | 10. Are you SOC 2 certified? | (none) | We are hosted on SOC 2-certified infrastructure. Railway and Supabase (AWS) hold their own | ARCHITECTURE | (none) | (none) |  |
| INV-06859 | 10. Are you SOC 2 certified? | (none) | K.I.N.D itself is not SOC 2 certified. We have not been audited. | RULE | (none) | (none) |  |
| INV-06860 | Before you use this with a client | (none) | Before you use this with a client | COMMERCIAL | (none) | (none) | Heading |
| INV-06861 | Before you use this with a client | (none) | no restore has ever been tested · personal data reaches application logs in 105 places and log | OPERATING | (none) | (none) |  |
| INV-06862 | Before you use this with a client | (none) | Volunteer them. A buyer who finds one themselves stops believing everything else on this page. | RULE | (none) | (none) |  |

## `docs/compliance/SA-INFORMATION-OFFICER-CHECKLIST.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** POPIA Information Officer checklist draft · **Lines:** 67 · **Material items in this source:** 43 · **Rows in this part:** 43 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06863 | (document root) | (none) | DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON | RULE | ⚠️ | (none) | Blockquote |
| INV-06864 | (document root) | (none) | Nothing here has been filed with the Information Regulator or acted on. It exists so | RULE | (none) | (none) | Blockquote |
| INV-06865 | (document root) | (none) | counsel has a starting draft instead of a blank page. Bracketed fields are counsel's decisions. | RULE | (none) | (none) | Blockquote |
| INV-06866 | (document root) | (none) | The same threshold question as the PAIA manual applies first: K.I.N.D Technologies Ltd | RULE | ⚠️ | (none) | Blockquote |
| INV-06867 | (document root) | (none) | is a UK company (No. 17260532). Whether POPIA's Information Officer duties attach to a | RULE | (none) | (none) | Blockquote |
| INV-06868 | (document root) | (none) | foreign private body processing SA residents' data is a legal question this document does not | MONEY | (none) | (none) | Blockquote |
| INV-06869 | (document root) | (none) | answer. Counsel confirms applicability before any registration is attempted. | RULE | (none) | (none) | Blockquote |
| INV-06870 | (document root) | (none) | Procedural details below (portal address, required fields, cost) are stated as commonly | MONEY | ⚠️ | (none) | Blockquote |
| INV-06871 | (document root) | (none) | understood and are NOT verified — this machine cannot reach the Regulator's site. Counsel or | RULE | (none) | (none) | Blockquote |
| INV-06872 | (document root) | (none) | the founder confirms each against the live portal before acting. | RULE | (none) | (none) | Blockquote |
| INV-06873 | POPIA Information Officer — registration checklist and duties | (none) | POPIA Information Officer — registration checklist and duties | OPERATING | (none) | (none) | Heading |
| INV-06874 | 1. Who the Information Officer is | (none) | 1. Who the Information Officer is | RULE | (none) | (none) | Heading |
| INV-06875 | 1. Who the Information Officer is | (none) | By default, the head of the private body — i.e. the founder. POPIA does not require an | MONEY | (none) | (none) |  |
| INV-06876 | 1. Who the Information Officer is | (none) | Information Officer | MONEY | (none) | (none) | Information Officer · The founder, as head of the private body |
| INV-06877 | 1. Who the Information Officer is | (none) | Contact for data subjects | RULE | (none) | (none) | Contact for data subjects · privacy@get-kind.com |
| INV-06878 | 1. Who the Information Officer is | (none) | Deputy Information Officers | RULE | (none) | (none) | Deputy Information Officers · [COUNSEL: whether any are needed at our size] |
| INV-06879 | 1. Who the Information Officer is | (none) | Currently registered? | RULE | (none) | (none) | Currently registered? · No |
| INV-06880 | 2. Registration — the steps | (none) | 2. Registration — the steps | RULE | (none) | (none) | Heading |
| INV-06881 | 2. Registration — the steps | (none) | Confirm applicability. [COUNSEL] — everything below is wasted or wrong if PAIA/POPIA do | RULE | (none) | (none) |  |
| INV-06882 | 2. Registration — the steps | (none) | Register on the Information Regulator's eServices portal. Registration of an Information | RULE | (none) | (none) |  |
| INV-06883 | 2. Registration — the steps | (none) | Full name, ID or passport number, and contact details of the Information Officer | RULE | (none) | (none) |  |
| INV-06884 | 2. Registration — the steps | (none) | The private body's registered name, registration number and address | MONEY | (none) | (none) |  |
| INV-06885 | 2. Registration — the steps | (none) | Confirmation of the IO's position as head of the body | RULE | (none) | (none) |  |
| INV-06886 | 2. Registration — the steps | (none) | Details of any deputies being designated | RULE | (none) | (none) |  |
| INV-06887 | 2. Registration — the steps | (none) | Cost: registration is free. ⚠️ Stated as commonly understood; confirm on the portal. | MONEY | ⚠️ | (none) |  |
| INV-06888 | 2. Registration — the steps | (none) | Keep the confirmation. File it where the ICO registration confirmation is kept — the | RULE | (none) | (none) |  |
| INV-06889 | 2. Registration — the steps | (none) | Record it in EVIDENCE-PACK.md as a new row once done. | RULE | (none) | (none) |  |
| INV-06890 | 3. The Information Officer's duties, in one page | (none) | 3. The Information Officer's duties, in one page | RULE | (none) | (none) | Heading |
| INV-06891 | 3. The Information Officer's duties, in one page | (none) | Duty · What it means for us | RULE | (none) | (none) |  |
| INV-06892 | 3. The Information Officer's duties, in one page | (none) | Encourage compliance with POPIA's conditions for lawful processing | RULE | (none) | (none) | Encourage compliance with POPIA's conditions for lawful processing · The eight conditions — accountability, processing limitation,… |
| INV-06893 | 3. The Information Officer's duties, in one page | §6 | Deal with requests made to the body | RULE | (none) | (none) | Deal with requests made to the body · Access, correction and deletion requests to privacy@get-kind.com. Our stated response clocks… |
| INV-06894 | 3. The Information Officer's duties, in one page | (none) | Work with the Regulator on investigations | RULE | (none) | (none) | Work with the Regulator on investigations · Single point of contact; the Regulator corresponds with the IO |
| INV-06895 | 3. The Information Officer's duties, in one page | (none) | Ensure compliance is developed, implemented, monitored and maintained | RULE | (none) | (none) | Ensure compliance is developed, implemented, monitored and maintained · This is the duty the EVIDENCE-PACK.md register serves — it… |
| INV-06896 | 3. The Information Officer's duties, in one page | (none) | Conduct a personal information impact assessment | RULE | ⚠️ | (none) | Conduct a personal information impact assessment · To establish that adequate safeguards exist. ⚠️ We have not done one. Related t… |
| INV-06897 | 3. The Information Officer's duties, in one page | (none) | Develop, monitor and maintain a PAIA manual | RULE | (none) | (none) | Develop, monitor and maintain a PAIA manual · The s51 manual — draft at SA-PAIA-MANUAL-DRAFT.md, unfiled |
| INV-06898 | 3. The Information Officer's duties, in one page | (none) | Develop internal measures and training | RULE | (none) | (none) | Develop internal measures and training · Not yet done at our size; [COUNSEL: what is proportionate for a company of one] |
| INV-06899 | 3. The Information Officer's duties, in one page | (none) | Handle security compromises | RISK | (none) | (none) | Handle security compromises · The notification duty. Draft at BREACH-RESPONSE-DRAFT.md; POPIA's threshold differs from the UK's an… |
| INV-06900 | 4. What is outstanding | (none) | 4. What is outstanding | RULE | (none) | (none) | Heading |
| INV-06901 | 4. What is outstanding | (none) | [ ] Counsel confirms applicability to a UK private body | MONEY | (none) | (none) |  |
| INV-06902 | 4. What is outstanding | (none) | [ ] Register the Information Officer (free, portal) | RULE | (none) | (none) |  |
| INV-06903 | 4. What is outstanding | (none) | [ ] Personal information impact assessment — not started | RULE | (none) | (none) |  |
| INV-06904 | 4. What is outstanding | (none) | [ ] PAIA manual finalised and published | RULE | (none) | (none) |  |
| INV-06905 | 4. What is outstanding | (none) | [ ] Add a row to EVIDENCE-PACK.md once registered | RULE | (none) | (none) |  |

## `docs/compliance/SA-PAIA-MANUAL-DRAFT.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** PAIA s51 manual draft · **Lines:** 94 · **Material items in this source:** 51 · **Rows in this part:** 51 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06906 | (document root) | (none) | DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON | RULE | ⚠️ | (none) | Blockquote |
| INV-06907 | (document root) | (none) | Nothing in this document has been filed with any authority, published to any client, or | COMMERCIAL | (none) | (none) | Blockquote |
| INV-06908 | (document root) | (none) | acted on. It exists so counsel has a starting draft instead of a blank page. Every bracketed | RULE | (none) | (none) | Blockquote |
| INV-06909 | (document root) | (none) | field is a decision counsel makes, not a gap to be filled in by anyone else. | RULE | (none) | (none) | Blockquote |
| INV-06910 | (document root) | (none) | Written 20 Aug 2026 by reading the repo. Where this document states a fact about our systems, | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06911 | (document root) | (none) | the file it came from is cited so counsel can check it rather than trust it. | RULE | (none) | (none) | Blockquote |
| INV-06912 | (document root) | (none) | TWO THINGS COUNSEL DECIDES BEFORE THIS GOES ANYWHERE. | RULE | ⚠️ | (none) | Blockquote |
| INV-06913 | (document root) | (none) | (1) Does PAIA apply to us at all? K.I.N.D Technologies Ltd is a UK company. Whether a | RULE | (none) | (none) | Blockquote |
| INV-06914 | (document root) | (none) | foreign private body operating into South Africa is a "private body" under PAIA s1 is a legal | MONEY | (none) | (none) | Blockquote |
| INV-06915 | (document root) | (none) | question this draft does not answer and must not be read as answering. | RULE | (none) | (none) | Blockquote |
| INV-06916 | (document root) | (none) | (2) Does this match the Regulator's template? The Information Regulator publishes a | RULE | (none) | (none) | Blockquote |
| INV-06917 | (document root) | (none) | section-51 manual template. We do not hold a copy and could not read one — the structure | RULE | (none) | (none) | Blockquote |
| INV-06918 | (document root) | (none) | below is built from the prescribed contents of the Act as understood, and must be checked | RULE | (none) | (none) | Blockquote |
| INV-06919 | (document root) | (none) | against the Regulator's published template before filing. No claim of conformity is made. | RULE | (none) | (none) | Blockquote |
| INV-06920 | PAIA Section 51 Manual — DRAFT | (none) | PAIA Section 51 Manual — DRAFT | RULE | (none) | (none) | Heading |
| INV-06921 | 1. Particulars of the private body | (none) | 1. Particulars of the private body | MONEY | (none) | (none) | Heading |
| INV-06922 | 1. Particulars of the private body | (none) | Registered name | RULE | (none) | (none) | Registered name · K.I.N.D Technologies Ltd |
| INV-06923 | 1. Particulars of the private body | (none) | Company number | RULE | (none) | (none) | Company number · 17260532 (United Kingdom) |
| INV-06924 | 1. Particulars of the private body | (none) | Registered office | RULE | (none) | (none) | Registered office · 33 Townsend Road, CV37 7DE, United Kingdom |
| INV-06925 | 1. Particulars of the private body | (none) | Nature of business | COMMERCIAL | (none) | (none) | Nature of business · Managed B2B outbound lead generation and meeting booking |
| INV-06926 | 1. Particulars of the private body | (none) | SA presence · [COUNSEL: describe — no SA registered entity; team members resident in SA] | RULE | (none) | (none) |  |
| INV-06927 | 1. Particulars of the private body | (none) | Postal address for requests | RULE | (none) | (none) | Postal address for requests · As above |
| INV-06928 | 1. Particulars of the private body | (none) | Email for requests | RULE | (none) | (none) | Email for requests · privacy@get-kind.com |
| INV-06929 | 1. Particulars of the private body | (none) | Website · https://www.get-kind.com | RULE | (none) | (none) |  |
| INV-06930 | 2. Information Officer | (none) | 2. Information Officer | RULE | (none) | (none) | Heading |
| INV-06931 | 2. Information Officer | (none) | Information Officer | MONEY | (none) | (none) | Information Officer · The head of the private body — the founder (see SA-INFORMATION-OFFICER-CHECKLIST.md) |
| INV-06932 | 2. Information Officer | (none) | Contact · privacy@get-kind.com | RULE | (none) | (none) |  |
| INV-06933 | 2. Information Officer | (none) | Deputy Information Officer(s) | RULE | (none) | (none) | Deputy Information Officer(s) · [COUNSEL: whether any are required] |
| INV-06934 | 2. Information Officer | (none) | Registered with the Information Regulator? | OPERATING | (none) | (none) | Registered with the Information Regulator? · Not yet — see the checklist document |
| INV-06935 | 3. Guide under section 10 | (none) | 3. Guide under section 10 | RULE | (none) | (none) | Heading |
| INV-06936 | 4. Records held, by category | (none) | 4. Records held, by category | RULE | (none) | (none) | Heading |
| INV-06937 | 4. Records held, by category | (none) | There is no DSAR runbook file — verified when building EVIDENCE-PACK.md row 13 (searched | OPERATING | (none) | (none) |  |
| INV-06938 | 4. Records held, by category | (none) | Category of record | RULE | (none) | (none) | Category of record · Held where · Retention (stated policy) |
| INV-06939 | 4. Records held, by category | (none) | Lead personal data (name, role, employer, work email) | COMMERCIAL | (none) | (none) | Lead personal data (name, role, employer, work email) · leads — Supabase eu-west-1 · Active campaign + 12 months |
| INV-06940 | 4. Records held, by category | (none) | Client account data | COMMERCIAL | (none) | (none) | Client account data · clients and related · Contract + 24 months |
| INV-06941 | 4. Records held, by category | (none) | Email content of sent campaigns | ARCHITECTURE | (none) | (none) | Email content of sent campaigns · Campaign tables + Smartlead · 12 months |
| INV-06942 | 4. Records held, by category | (none) | Suppression / opt-out records | RULE | (none) | (none) | Suppression / opt-out records · opt_out_blocklist (email + reason) · Retained — a suppression record must outlive the data it supp… |
| INV-06943 | 4. Records held, by category | §6 | Operator action audit | RULE | (none) | (none) | Operator action audit · operator_audit_log · [COUNSEL: no period stated in §6] |
| INV-06944 | 4. Records held, by category | (none) | Billing records | MONEY | (none) | (none) | Billing records · Stripe + local reference IDs · 7 years (UK tax law) |
| INV-06945 | 4. Records held, by category | (none) | System logs · error_events and platform logs · 90 days | RULE | (none) | (none) |  |
| INV-06946 | 4. Records held, by category | (none) | Auth tokens / sessions | RULE | (none) | (none) | Auth tokens / sessions · Supabase auth · 1 hour inactivity / 30 days absolute |
| INV-06947 | 5. How to request access | (none) | 5. How to request access | OPERATING | (none) | (none) | Heading |
| INV-06948 | 5. How to request access | (none) | Request in writing to privacy@get-kind.com, on the prescribed form once counsel confirms which. | RULE | (none) | (none) |  |
| INV-06949 | 5. How to request access | (none) | State the record sought, the right being exercised, and the form of access wanted. | RULE | (none) | (none) |  |
| INV-06950 | 5. How to request access | (none) | Provide proof of identity. [COUNSEL: what we may lawfully require.] | RULE | (none) | (none) |  |
| INV-06951 | 5. How to request access | (none) | We respond within the period the Act prescribes. [COUNSEL: state it.] | RULE | (none) | (none) |  |
| INV-06952 | 6. Fees | (none) | 6. Fees | RULE | (none) | (none) | Heading |
| INV-06953 | 7. Grounds for refusal | (none) | 7. Grounds for refusal | RULE | (none) | (none) | Heading |
| INV-06954 | 8. Remedies | (none) | 8. Remedies | RULE | (none) | (none) | Heading |
| INV-06955 | 8. Remedies | (none) | Availability once approved: published on the website and provided on request. | RULE | (none) | (none) |  |
| INV-06956 | 8. Remedies | (none) | Review: annually, or on any material change to the records held. | RULE | (none) | (none) |  |

## `docs/compliance/SA-S72-TRANSFER-MEMO-SKELETON.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** POPIA s72 transfer memo skeleton · **Lines:** 81 · **Material items in this source:** 38 · **Rows in this part:** 38 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06957 | (document root) | (none) | DRAFT FOR COUNSEL — NOT FILED, NOT PUBLISHED, NOT RELIED ON | RULE | ⚠️ | (none) | Blockquote |
| INV-06958 | (document root) | (none) | Nothing here has been filed, published or relied on. The s72(1) basis is left blank | RULE | (none) | (none) | Blockquote |
| INV-06959 | (document root) | (none) | deliberately: selecting it is counsel's decision, and a draft that guessed would be worse than | RULE | (none) | (none) | Blockquote |
| INV-06960 | (document root) | (none) | Written 20 Aug 2026. Every fact about where data sits was read from the repo or confirmed by | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-06961 | (document root) | (none) | the founder on the vendor dashboards, and each is cited so counsel can check rather than trust. | RULE | (none) | (none) | Blockquote |
| INV-06962 | POPIA section 72 — cross-border transfer memo (skeleton) | (none) | POPIA section 72 — cross-border transfer memo (skeleton) | RULE | (none) | (none) | Heading |
| INV-06963 | 1. The question | (none) | 1. The question | RULE | (none) | (none) | Heading |
| INV-06964 | 2. Where the data actually sits | (none) | 2. Where the data actually sits | RULE | (none) | (none) | Heading |
| INV-06965 | 2. Where the data actually sits | (none) | Layer · Where · Evidence | RULE | (none) | (none) |  |
| INV-06966 | 2. Where the data actually sits | (none) | Database (all client and lead data, incl. SA data subjects) | ARCHITECTURE | (none) | 20 Aug. | Database (all client and lead data, incl. SA data subjects) · Supabase, eu-west-1 — Dublin, Ireland · Founder's dashboard, 20 Aug.… |
| INV-06967 | 2. Where the data actually sits | (none) | Application servers (processing, not storage) | RULE | (none) | 20 Aug | Application servers (processing, not storage) · Railway, US West — California, United States · Founder's dashboard, 20 Aug |
| INV-06968 | 2. Where the data actually sits | (none) | Backups · Daily, same region as the database (Dublin) · Backup screen, 20 Aug — 7 days visible (13–20 Aug) | ARCHITECTURE | (none) | 20 Aug |  |
| INV-06969 | 2. Where the data actually sits | §4 | Email delivery | RULE | (none) | (none) | Email delivery · Resend · privacy.html §4 |
| INV-06970 | 2. Where the data actually sits | §4 | AI processing | RULE | ⛓️ ⚠️ | 21 Aug | AI processing · Anthropic Claude API (US) · ⛓️ CORRECTED 21 Aug — this cell said "privacy.html §4 — no personal data in prompts", … |
| INV-06971 | 2. Where the data actually sits | §4 | Payments · Stripe · privacy.html §4 | MONEY | (none) | (none) |  |
| INV-06972 | 2. Where the data actually sits | (none) | So an SA data subject's personal information is stored in Ireland and processed in the United | RULE | (none) | (none) |  |
| INV-06973 | 3. What the site claimed, and what it says now | (none) | 3. What the site claimed, and what it says now | RULE | (none) | (none) | Heading |
| INV-06974 | 3. What the site claimed, and what it says now | (none) | Database location | ARCHITECTURE | (none) | (none) | Database location · "Cape Town", "af-south-1" · Dublin, Ireland (eu-west-1) |
| INV-06975 | 3. What the site claimed, and what it says now | (none) | Compute · not stated · US West (Railway), stated plainly | RULE | (none) | (none) |  |
| INV-06976 | 3. What the site claimed, and what it says now | (none) | Backups · "30-day retention", "geo-redundant" · 7 days, same region as the database | ARCHITECTURE | (none) | (none) |  |
| INV-06977 | 3. What the site claimed, and what it says now | (none) | US region · "US region available on request" · removed — no such capability exists | RULE | (none) | (none) |  |
| INV-06978 | 3. What the site claimed, and what it says now | (none) | Verification: "Cape Town" and "af-south-1" appear 0 times in a hosting context across | RULE | (none) | (none) |  |
| INV-06979 | 3. What the site claimed, and what it says now | (none) | Counsel should therefore assess the CURRENT position, not the old claim. The old claim | RULE | (none) | (none) |  |
| INV-06980 | 4. The s72(1) bases — for counsel to select among | (none) | 4. The s72(1) bases — for counsel to select among | RULE | (none) | (none) | Heading |
| INV-06981 | 4. The s72(1) bases — for counsel to select among | (none) | [ ] The recipient is subject to a law, binding corporate rules or binding agreement providing an adequate level of … | RULE | (none) | (none) |  |
| INV-06982 | 4. The s72(1) bases — for counsel to select among | (none) | [ ] The data subject consents to the transfer | RULE | (none) | (none) |  |
| INV-06983 | 4. The s72(1) bases — for counsel to select among | (none) | [ ] The transfer is necessary for the performance of a contract between the data subject and the responsible party | RULE | (none) | (none) |  |
| INV-06984 | 4. The s72(1) bases — for counsel to select among | (none) | [ ] The transfer is necessary for the conclusion or performance of a contract concluded in the data subject's inter… | RULE | (none) | (none) |  |
| INV-06985 | 4. The s72(1) bases — for counsel to select among | (none) | [ ] The transfer is for the benefit of the data subject and consent is not reasonably practicable | RULE | (none) | (none) |  |
| INV-06986 | 4. The s72(1) bases — for counsel to select among | (none) | Relevant to that choice, factually | RULE | (none) | (none) |  |
| INV-06987 | 4. The s72(1) bases — for counsel to select among | (none) | Ireland is in the EU/EEA. [COUNSEL: whether that assists on "adequate level of protection".] | RULE | (none) | (none) |  |
| INV-06988 | 4. The s72(1) bases — for counsel to select among | (none) | The United States is not. Our compute tier sits there. | RULE | (none) | (none) |  |
| INV-06989 | 4. The s72(1) bases — for counsel to select among | (none) | We do not hold executed DPAs with our processors — EVIDENCE-PACK.md rows 9 and 17. If the | RULE | (none) | (none) |  |
| INV-06990 | 5. What is outstanding | (none) | 5. What is outstanding | RULE | (none) | (none) | Heading |
| INV-06991 | 5. What is outstanding | (none) | [ ] Counsel selects the s72(1) basis | RULE | (none) | (none) |  |
| INV-06992 | 5. What is outstanding | (none) | [ ] Executed DPAs collected (blocks any agreement-based basis) | RULE | (none) | (none) |  |
| INV-06993 | 5. What is outstanding | (none) | [ ] Counsel decides whether the pre-20-Aug claim needs any remedial step | RULE | (none) | (none) |  |
| INV-06994 | 5. What is outstanding | (none) | [ ] Once settled, the position is recorded in EVIDENCE-PACK.md row 18 | RULE | (none) | (none) |  |

## `docs/runbooks/DSAR-ERASURE.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** DSAR / erasure runbook · **Lines:** 194 · **Material items in this source:** 87 · **Rows in this part:** 87 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-06995 | 🧾 DSAR & erasure runbook — one person, by email | (none) | 🧾 DSAR & erasure runbook — one person, by email | OPERATING | (none) | (none) | Heading |
| INV-06996 | 🧾 DSAR & erasure runbook — one person, by email | (none) | ⏱️ YOU HAVE ONE MONTH. UK/EU GDPR gives a controller one calendar month from receipt to respond to a subject access… | RULE | (none) | (none) | Blockquote |
| INV-06997 | 🧾 DSAR & erasure runbook — one person, by email | (none) | NO TOOLING EXISTS. Every step here is manual, run by the founder as a one-off against the database. There is no DSA… | RULE | ⚠️ | (none) | Blockquote |
| INV-06998 | 0 · Before you touch anything | (none) | 0 · Before you touch anything | OPERATING | (none) | (none) | Heading |
| INV-06999 | 0 · Before you touch anything | (none) | Record the date received. The clock is legal, not internal. | RULE | (none) | (none) |  |
| INV-07000 | 0 · Before you touch anything | (none) | Verify who is asking. You may ask for reasonable identification, but you may not use that to stall. If they wrote f… | OPERATING | (none) | (none) |  |
| INV-07001 | 0 · Before you touch anything | (none) | Decide which request this is — they are different jobs | OPERATING | (none) | (none) |  |
| INV-07002 | 0 · Before you touch anything | (none) | They asked for | OPERATING | (none) | (none) | They asked for · You owe them · Section |
| INV-07003 | 0 · Before you touch anything | §2 | "What do you have on me?" | OPERATING | (none) | (none) | "What do you have on me?" · a copy of the data and the derived data · §2 + §3 |
| INV-07004 | 0 · Before you touch anything | §4 | "Delete me" · erasure, minus what must be kept · §4 | OPERATING | (none) | (none) |  |
| INV-07005 | 0 · Before you touch anything | §5 | "Stop emailing me" | OPERATING | (none) | (none) | "Stop emailing me" · suppression only — not erasure · §5 |
| INV-07006 | 0 · Before you touch anything | §4.4 | "That's wrong, fix it" | DEFECT | (none) | (none) | "That's wrong, fix it" · rectification, and tell the recipients · §4.4 |
| INV-07007 | 1 · Where a prospect's data lives — VERIFIED against the schema | (none) | 1 · Where a prospect's data lives — VERIFIED against the schema | ARCHITECTURE | (none) | (none) | Heading |
| INV-07008 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | (none) | 1.1 Keyed directly on the person | OPERATING | (none) | (none) | Heading |
| INV-07009 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | (none) | Table · Columns holding their data · Notes | ARCHITECTURE | (none) | (none) |  |
| INV-07010 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | (none) | leads · email, first_name, last_name, phone, job_title, company, linkedin_url, country, industry, seniority, compan… | ARCHITECTURE | (none) | (none) | leads · email, first_name, last_name, phone, job_title, company, linkedin_url, country, industry, seniority, company_size, tech_st… |
| INV-07011 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | (none) | lead_pool · email_norm, first_name, last_name, title, seniority, company, industry, company_size, country, linkedin… | MONEY | ⚠️ | (none) | lead_pool · email_norm, first_name, last_name, title, seniority, company, industry, company_size, country, linkedin_url, source, a… |
| INV-07012 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | §4.3 | opt_out_blocklist | OPERATING | ⚠️ | (none) | opt_out_blocklist · email, full_name, whatsapp_number, reason, opted_back_in_at · ⚠️ KEPT on erasure — see §4.3 |
| INV-07013 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.1 Keyed directly on the person | (none) | lead_enrichment | COMMERCIAL | (none) | (none) | lead_enrichment · lead_id, recent_signal, company_context, opening_line, enrichment_score · Derived profile text about them |
| INV-07014 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | 1.2 Keyed on lead_id | COMMERCIAL | (none) | (none) | Heading |
| INV-07015 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | figsy_enrollments | COMMERCIAL | (none) | (none) | figsy_enrollments · lead_id, status, current_step, next_send_at |
| INV-07016 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | figsy_sent_emails | COMMERCIAL | (none) | (none) | figsy_sent_emails · lead_id, subject, body, resend_id, sent_at, opened_at, client_id |
| INV-07017 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | figsy_replies | COMMERCIAL | (none) | (none) | figsy_replies · lead_id, from_email, subject, body, classification, classification_reasoning, raw_payload |
| INV-07018 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | figsy_approval_queue | GATE | (none) | (none) | figsy_approval_queue · lead_id, to_email, subject, body |
| INV-07019 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | calendar_bookings | COMMERCIAL | (none) | (none) | calendar_bookings · lead_id, google_event_id, meeting_title, meeting_link, start_time |
| INV-07020 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | outcome_events | COMMERCIAL | (none) | (none) | outcome_events · lead_id, event_type, payload |
| INV-07021 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.2 Keyed on lead_id | (none) | whatsapp_messages | ARCHITECTURE | (none) | (none) | whatsapp_messages · to_number, lead_id, message — if the table exists; the code writes it best-effort and falls back |
| INV-07022 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.3 Free-text tables that may mention them | (none) | 1.3 Free-text tables that may mention them | ARCHITECTURE | (none) | (none) | Heading |
| INV-07023 | 1 · Where a prospect's data lives — VERIFIED against the schema › 1.3 Free-text tables that may mention them | (none) | No lead_id, so these need a text search, not a key lookup. Easy to miss and easy to under-answer a SAR with. | COMMERCIAL | (none) | (none) |  |
| INV-07024 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | 2 · What a SAR must answer with — beyond rows containing the email | OPERATING | (none) | (none) | Heading |
| INV-07025 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | FIGSY score + the reasoning | COMMERCIAL | (none) | (none) | FIGSY score + the reasoning · leads.score, leads.score_reasoning — free text explaining why they were ranked |
| INV-07026 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | Profiling / research | COMMERCIAL | (none) | (none) | Profiling / research · lead_enrichment.recent_signal, .company_context, .opening_line, leads.research_summary |
| INV-07027 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | Reply classification | OPERATING | (none) | (none) | Reply classification · figsy_replies.classification + .classification_reasoning — an AI judgement about their intent |
| INV-07028 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | Suppression status | COMMERCIAL | (none) | (none) | Suppression status · opt_out_blocklist (present/absent, reason, opted_back_in_at), leads.status, leads.opted_out_at |
| INV-07029 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | Campaign membership | COMMERCIAL | (none) | (none) | Campaign membership · figsy_enrollments, leads.smartlead_campaign_id |
| INV-07030 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | What we sent them | OPERATING | (none) | (none) | What we sent them · figsy_sent_emails.subject/body — every message, verbatim |
| INV-07031 | 2 · What a SAR must answer with — beyond rows containing the email | §3 | Who we gave them to | OPERATING | (none) | (none) | Who we gave them to · §3 |
| INV-07032 | 2 · What a SAR must answer with — beyond rows containing the email | (none) | Source · leads.source, lead_pool.source, leads.apollo_id — where we got them, which is the Art. 14 question they us… | COMMERCIAL | (none) | (none) | Source · leads.source, lead_pool.source, leads.apollo_id — where we got them, which is the Art. 14 question they usually mean |
| INV-07033 | 3 · The recipient ledger — who else has this person | (none) | 3 · The recipient ledger — who else has this person | OPERATING | (none) | (none) | Heading |
| INV-07034 | 3 · The recipient ledger — who else has this person | (none) | Recipient · How to find it · Who informs them | OPERATING | (none) | (none) |  |
| INV-07035 | 3 · The recipient ledger — who else has this person | (none) | The client · leads.client_id · K.I.N.D informs the client. They are a separate controller of their own copy | COMMERCIAL | (none) | (none) |  |
| INV-07036 | 3 · The recipient ledger — who else has this person | (none) | The client's CRM | COMMERCIAL | (none) | (none) | The client's CRM · leads.crm_synced, .crm_synced_at, .crm_contact_id, .crm_deal_id · K.I.N.D tells the client; the client deletes … |
| INV-07037 | 3 · The recipient ledger — who else has this person | (none) | Smartlead · leads.smartlead_campaign_id · ⚠️ Founder removes them by hand in the Smartlead dashboard. There is no r… | ARCHITECTURE | ⚠️ | (none) | Smartlead · leads.smartlead_campaign_id · ⚠️ Founder removes them by hand in the Smartlead dashboard. There is no remove API — reg… |
| INV-07038 | 3 · The recipient ledger — who else has this person | (none) | Instantly · parked (HOUSE_CLIENT_ID unset) — nothing pushed · n/a today | COMMERCIAL | (none) | (none) |  |
| INV-07039 | 3 · The recipient ledger — who else has this person | (none) | Hunter / PDL / Apollo | OPERATING | (none) | (none) | Hunter / PDL / Apollo · they are sources, not recipients · See UPSTREAM-DSR-PROPAGATION.md |
| INV-07040 | 3 · The recipient ledger — who else has this person | (none) | CSV exports · leads.exported_at tells you an export happened — ⚠️ it does not say to whom or which columns · Founde… | COMMERCIAL | ⚠️ | (none) | CSV exports · leads.exported_at tells you an export happened — ⚠️ it does not say to whom or which columns · Founder must recall; … |
| INV-07041 | 3 · The recipient ledger — who else has this person › Two gaps, named rather than glossed | (none) | Two gaps, named rather than glossed | OPERATING | ⚠️ | (none) | Heading |
| INV-07042 | 3 · The recipient ledger — who else has this person › Two gaps, named rather than glossed | (none) | No Smartlead receipt is stored. smartlead_campaign_id (added 20 Aug) records that they were pushed and to which cam… | COMMERCIAL | (none) | 20 Aug |  |
| INV-07043 | 3 · The recipient ledger — who else has this person › Two gaps, named rather than glossed | (none) | No export ledger. exported_at is a timestamp with no counterparty. If someone asks "who did you give my data to", a… | OPERATING | (none) | (none) |  |
| INV-07044 | 4 · Erasure — the order to do it in | (none) | 4 · Erasure — the order to do it in | OPERATING | (none) | (none) | Heading |
| INV-07045 | 4 · Erasure — the order to do it in | (none) | Do it in this order. Deleting leads first orphans everything keyed on lead_id and you lose the ability to find the … | COMMERCIAL | (none) | (none) |  |
| INV-07046 | 4 · Erasure — the order to do it in › 4.1 Find and freeze | (none) | 4.1 Find and freeze | OPERATING | (none) | (none) | Heading |
| INV-07047 | 4 · Erasure — the order to do it in › 4.1 Find and freeze | (none) | leads WHERE lower(email) = → note every id (there may be several: one per client) | COMMERCIAL | (none) | (none) |  |
| INV-07048 | 4 · Erasure — the order to do it in › 4.1 Find and freeze | (none) | lead_pool WHERE email_norm = → note it, this is the cross-client copy | COMMERCIAL | (none) | (none) |  |
| INV-07049 | 4 · Erasure — the order to do it in › 4.1 Find and freeze | (none) | Add them to opt_out_blocklist FIRST → so nothing sends mid-erasure | OPERATING | (none) | (none) |  |
| INV-07050 | 4 · Erasure — the order to do it in › 4.2 Delete, children first | (none) | 4.2 Delete, children first | OPERATING | (none) | (none) | Heading |
| INV-07051 | 4 · Erasure — the order to do it in › 4.2 Delete, children first | (none) | figsy_sent_emails, figsy_replies, figsy_approval_queue, figsy_enrollments, | GATE | (none) | (none) |  |
| INV-07052 | 4 · Erasure — the order to do it in › 4.2 Delete, children first | §1.3 | Text-search the free-text tables in §1.3 and redact the mentions | ARCHITECTURE | (none) | (none) |  |
| INV-07053 | 4 · Erasure — the order to do it in › 4.2 Delete, children first | (none) | lead_pool WHERE email_norm = ← the one most likely to be forgotten | COMMERCIAL | (none) | (none) |  |
| INV-07054 | 4 · Erasure — the order to do it in › 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | (none) | 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | OPERATING | ⚠️ | (none) | Heading |
| INV-07055 | 4 · Erasure — the order to do it in › 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | (none) | The opt_out_blocklist row stays. | OPERATING | (none) | (none) |  |
| INV-07056 | 4 · Erasure — the order to do it in › 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | (none) | Lawful ground: Art. 17(3)(b) — processing necessary for compliance with a legal obligation; and Art. 21, which requ… | RULE | (none) | (none) |  |
| INV-07057 | 4 · Erasure — the order to do it in › 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | (none) | Minimised: the row holds the address and a reason. Nothing else. It is not used for anything but refusal. | OPERATING | (none) | (none) |  |
| INV-07058 | 4 · Erasure — the order to do it in › 4.3 ⚠️ WHAT IS DELIBERATELY KEPT — and why it is not a loophole | (none) | Say so in your reply. "We have deleted your data. We have kept a record of your email address on our suppression li… | RULE | (none) | (none) |  |
| INV-07059 | 4 · Erasure — the order to do it in › 4.4 Rectification | (none) | 4.4 Rectification | OPERATING | (none) | (none) | Heading |
| INV-07060 | 5 · ⚠️ "Stop emailing me" is NOT an erasure request | (none) | 5 · ⚠️ "Stop emailing me" is NOT an erasure request | OPERATING | ⚠️ | (none) | Heading |
| INV-07061 | 5 · ⚠️ "Stop emailing me" is NOT an erasure request | (none) | Do not delete them. If you erase a person who only asked to stop hearing from you, you destroy the record of their … | OPERATING | (none) | (none) |  |
| INV-07062 | 6 · Data location matrix — everywhere beyond the database | (none) | 6 · Data location matrix — everywhere beyond the database | ARCHITECTURE | (none) | (none) | Heading |
| INV-07063 | 6 · Data location matrix — everywhere beyond the database | (none) | Location · What is in it · What happens on erasure | OPERATING | (none) | (none) |  |
| INV-07064 | 6 · Data location matrix — everywhere beyond the database | (none) | Supabase backups / PITR | IDEA | (none) | (none) | Supabase backups / PITR · full row copies · Cannot be surgically edited. They age out on the plan's retention window. 🧍 Founder co… |
| INV-07065 | 6 · Data location matrix — everywhere beyond the database | (none) | Railway application logs | ARCHITECTURE | (none) | 20 Aug | Railway application logs · 69 log sites in apps/api/src emit an address or message text (counted 20 Aug — see the note at the end)… |
| INV-07066 | 6 · Data location matrix — everywhere beyond the database | (none) | Founder alert emails | OPERATING | (none) | (none) | Founder alert emails · sendFounderAlert puts reply snippets and prospect addresses in the founder's inbox · Delete the alert email… |
| INV-07067 | 6 · Data location matrix — everywhere beyond the database | (none) | Anthropic API | OPERATING | ⛓️ ⚠️ | 21 Aug | Anthropic API · ⛓️ (fields corrected + Milla path added, 21 Aug) Structured lead paths send lead name, job title, company, industr… |
| INV-07068 | 6 · Data location matrix — everywhere beyond the database | (none) | Google Calendar | COMMERCIAL | (none) | (none) | Google Calendar · booked meetings carry the prospect's name and email · Delete the event in the client's calendar — it is their ca… |
| INV-07069 | 6 · Data location matrix — everywhere beyond the database | §3 | CSV exports · whole rows, wherever they were sent · Unrecoverable once sent. See the gap in §3 | OPERATING | (none) | (none) |  |
| INV-07070 | 6 · Data location matrix — everywhere beyond the database | (none) | Smartlead · their own copy of the lead · By hand in their dashboard. No API — NOT_POSSIBLE | ARCHITECTURE | (none) | (none) |  |
| INV-07071 | 6 · Data location matrix — everywhere beyond the database | (none) | Resend / SMTP provider | ARCHITECTURE | (none) | (none) | Resend / SMTP provider · delivery metadata and message content · Provider retention; not deletable by us |
| INV-07072 | 7 · Replying | (none) | 7 · Replying | OPERATING | (none) | (none) | Heading |
| INV-07073 | 7 · Replying | (none) | Answer inside the month. | OPERATING | (none) | (none) |  |
| INV-07074 | 7 · Replying | §4.3 | Say what you deleted, what you kept (§4.3) and why, and what ages out (§6). | OPERATING | (none) | (none) |  |
| INV-07075 | 7 · Replying | §3 | If you cannot reconstruct something (§3's two gaps), say that rather than implying completeness. | OPERATING | (none) | (none) |  |
| INV-07076 | 7 · Replying | (none) | Log it — date received, date answered, what was done. There is no table for this yet; use the session log until the… | HISTORY | (none) | (none) |  |
| INV-07077 | What the brief got wrong — corrected, not copied | (none) | What the brief got wrong — corrected, not copied | DEFECT | ⚠️ | (none) | Heading |
| INV-07078 | What the brief got wrong — corrected, not copied | (none) | crm_pushed_at does not exist. The live columns are crm_synced, crm_synced_at, crm_contact_id, crm_deal_id, crm_exis… | OPERATING | (none) | (none) |  |
| INV-07079 | What the brief got wrong — corrected, not copied | (none) | "92 log sites" could not be reproduced. Counted 20 Aug across apps/api/src excluding tests: 69 matching a broad ema… | OPERATING | (none) | 20 Aug |  |
| INV-07080 | What the brief got wrong — corrected, not copied | §1.3 | The table list was incomplete. lead_enrichment, whatsapp_messages, and the seven free-text tables in §1.3 were not … | ARCHITECTURE | (none) | (none) |  |
| INV-07081 | Related | (none) | Related | OPERATING | (none) | (none) | Heading |

## `docs/runbooks/GOOGLE-VERIFICATION.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Google Calendar verification path · **Lines:** 165 · **Material items in this source:** 72 · **Rows in this part:** 72 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07082 | Google Calendar — the verification path | (none) | Google Calendar — the verification path | OPERATING | (none) | (none) | Heading |
| INV-07083 | Google Calendar — the verification path | (none) | Why this exists. The founder walked the real booking flow on 20 Aug and hit Google's wall | OPERATING | (none) | 20 Aug | Blockquote |
| INV-07084 | Google Calendar — the verification path | (none) | the app is in Testing, with 0 test users, and the OAuth client is registered on | OPERATING | (none) | (none) | Blockquote |
| INV-07085 | Google Calendar — the verification path | (none) | kindapi-production-….railway.app — a domain nobody can verify, because Google requires | OPERATING | (none) | (none) | Blockquote |
| INV-07086 | Google Calendar — the verification path | (none) | proof of domain ownership and nobody owns a railway.app subdomain. | OPERATING | (none) | (none) | Blockquote |
| INV-07087 | Google Calendar — the verification path | R55 | His ruling (R55): "we need to book in the clients calendar and see" · "this is essential | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07088 | Google Calendar — the verification path | (none) | = the founder does it · 🤖 = done in code, already shipped | OPERATING | (none) | (none) | Blockquote |
| INV-07089 | Google Calendar — the verification path | (none) | Every step says how we prove it happened — a value you can read, not "looks fine". | OPERATING | (none) | (none) | Blockquote |
| INV-07090 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | READ THIS FIRST — the 7-day clock is real, and it is dated | OPERATING | ⚠️ | (none) | Heading |
| INV-07091 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | Settled as fact from Google's own documentation (developers.google.com/identity/protocols/oauth2, read 21 Aug 2026 … | RULE | (none) | 21 Aug 2026 |  |
| INV-07092 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | "A Google Cloud Platform project with an OAuth consent screen configured for an external user | RULE | (none) | (none) | Blockquote |
| INV-07093 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | type and a publishing status of "Testing" is issued a refresh token expiring in 7 days, | OPERATING | (none) | (none) | Blockquote |
| INV-07094 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | unless the only OAuth scopes requested are a subset of name, email address, and user profile | OPERATING | (none) | (none) | Blockquote |
| INV-07095 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | (through the userinfo.email, userinfo.profile, openid scopes, or their OpenID Connect | OPERATING | (none) | (none) | Blockquote |
| INV-07096 | READ THIS FIRST — the 7-day clock is real, and it is dated | (none) | The exemption does not save us. We request calendar.events, calendar.freebusy and | OPERATING | (none) | (none) |  |
| INV-07097 | READ THIS FIRST — the 7-day clock is real, and it is dated › What that means for the founder's own connection | (none) | What that means for the founder's own connection | OPERATING | (none) | (none) | Heading |
| INV-07098 | READ THIS FIRST — the 7-day clock is real, and it is dated › What that means for the founder's own connection | (none) | Connected · 20 Aug 2026 | OPERATING | (none) | 20 Aug 2026 |  |
| INV-07099 | READ THIS FIRST — the 7-day clock is real, and it is dated › What that means for the founder's own connection | (none) | Expires · ~27 Aug 2026 | OPERATING | (none) | 27 Aug 2026 |  |
| INV-07100 | READ THIS FIRST — the 7-day clock is real, and it is dated › What that means for the founder's own connection | (none) | The bridge holds for launch day and breaks about two days later. Not a reason to panic — a | OPERATING | (none) | (none) |  |
| INV-07101 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | The check ritual | OPERATING | (none) | (none) | Heading |
| INV-07102 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | On 27 Aug, and every Monday until the app is verified | OPERATING | (none) | 27 Aug |  |
| INV-07103 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | Open https://app.get-kind.com/dashboard/settings → the Calendar section. | OPERATING | (none) | (none) |  |
| INV-07104 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | Does it still say connected? If it says error or disconnected, the refresh token expired. | OPERATING | (none) | (none) |  |
| INV-07105 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | If expired: reconnect (10 seconds), and write the new date here. That date + 7 is the | OPERATING | (none) | (none) |  |
| INV-07106 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | Also worth knowing — Google lists other reasons a refresh token dies, so an expiry is not | OPERATING | (none) | (none) |  |
| INV-07107 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | Connection log — append a line each time, so the deadline is never reconstructed from memory. | RULE | (none) | (none) | Blockquote |
| INV-07108 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | / Connected on / Expires (+7d) / Verified still working / | OPERATING | (none) | (none) | Blockquote |
| INV-07109 | READ THIS FIRST — the 7-day clock is real, and it is dated › The check ritual | (none) | / 20 Aug 2026 / 27 Aug 2026 / (pending — first check 27 Aug) / | OPERATING | (none) | 20 Aug 2026 | Blockquote |
| INV-07110 | The bridge: test users (use this BEFORE verification lands) | (none) | The bridge: test users (use this BEFORE verification lands) | OPERATING | (none) | (none) | Heading |
| INV-07111 | The bridge: test users (use this BEFORE verification lands) | (none) | A test user gets the FULL product. Nothing is degraded. Real OAuth, real calendar, real | OPERATING | (none) | (none) |  |
| INV-07112 | The bridge: test users (use this BEFORE verification lands) | (none) | 100-user cap, and the 7-day token clock above. | OPERATING | (none) | (none) |  |
| INV-07113 | The bridge: test users (use this BEFORE verification lands) | (none) | SOP — 🧍 founder, 2 minutes per client | COMMERCIAL | (none) | (none) |  |
| INV-07114 | The bridge: test users (use this BEFORE verification lands) | (none) | Google Cloud Console → APIs & Services → OAuth consent screen → Audience. | RULE | (none) | (none) |  |
| INV-07115 | The bridge: test users (use this BEFORE verification lands) | (none) | Under Test users, click + Add users. | OPERATING | (none) | (none) |  |
| INV-07116 | The bridge: test users (use this BEFORE verification lands) | (none) | Enter the client's Google address — the exact address they will connect with. A personal | COMMERCIAL | (none) | (none) |  |
| INV-07117 | The bridge: test users (use this BEFORE verification lands) | (none) | Save. They can connect immediately — no wait, no re-deploy. | OPERATING | (none) | (none) |  |
| INV-07118 | The bridge: test users (use this BEFORE verification lands) | (none) | Prove it: the address appears in the Test users list, and they reach the consent screen | OPERATING | (none) | (none) |  |
| INV-07119 | The bridge: test users (use this BEFORE verification lands) | (none) | Tell them what they will see, or they will think it is broken: an "Google hasn't verified | DEFECT | (none) | (none) |  |
| INV-07120 | The five stages, in order | (none) | The five stages, in order | OPERATING | (none) | (none) | Heading |
| INV-07121 | The five stages, in order › Stage 1 — DNS record for api.get-kind.com 🧍 | (none) | Stage 1 — DNS record for api.get-kind.com 🧍 | OPERATING | (none) | (none) | Heading |
| INV-07122 | The five stages, in order › Stage 1 — DNS record for api.get-kind.com 🧍 | (none) | Where · Cloudflare → the get-kind.com zone → DNS | OPERATING | (none) | (none) |  |
| INV-07123 | The five stages, in order › Stage 1 — DNS record for api.get-kind.com 🧍 | (none) | Do · Add a CNAME: name api, target = the value Railway gives you in Stage 2. ⚠️ Railway tells you the target, so op… | DEFECT | ⚠️ | (none) | Do · Add a CNAME: name api, target = the value Railway gives you in Stage 2. ⚠️ Railway tells you the target, so open Stage 2 firs… |
| INV-07124 | The five stages, in order › Stage 1 — DNS record for api.get-kind.com 🧍 | #673 | Prove it · dig +short api.get-kind.com returns the Railway target. From this machine: curl -sI https://api.get-kind… | OPERATING | (none) | (none) | Prove it · dig +short api.get-kind.com returns the Railway target. From this machine: curl -sI https://api.get-kind.com/health eve… |
| INV-07125 | The five stages, in order › Stage 2 — Railway custom domain 🧍 | (none) | Stage 2 — Railway custom domain 🧍 | OPERATING | (none) | (none) | Heading |
| INV-07126 | The five stages, in order › Stage 2 — Railway custom domain 🧍 | (none) | Where · Railway → the API service → Settings → Networking → Custom Domain | ARCHITECTURE | (none) | (none) |  |
| INV-07127 | The five stages, in order › Stage 2 — Railway custom domain 🧍 | (none) | Do · Add api.get-kind.com. Railway shows the CNAME target — that is the value Stage 1 needs. Wait for Railway to sh… | OPERATING | (none) | (none) | Do · Add api.get-kind.com. Railway shows the CNAME target — that is the value Stage 1 needs. Wait for Railway to show the domain a… |
| INV-07128 | The five stages, in order › Stage 2 — Railway custom domain 🧍 | (none) | Prove it · Railway shows ✅ next to the domain, and the /health curl in Stage 1 returns 200 over HTTPS without a cer… | OPERATING | ✅ | (none) | Prove it · Railway shows ✅ next to the domain, and the /health curl in Stage 1 returns 200 over HTTPS without a certificate warnin… |
| INV-07129 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | Stage 3 — the three values that must agree 🧍 + 🤖 | OPERATING | (none) | (none) | Heading |
| INV-07130 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | Railway env var GOOGLE_REDIRECT_URI 🧍 | OPERATING | (none) | (none) | Railway env var GOOGLE_REDIRECT_URI 🧍 · https://api.get-kind.com/calendar/callback |
| INV-07131 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | Google Console → Credentials → your OAuth client → Authorised redirect URIs 🧍 | COMMERCIAL | (none) | (none) | Google Console → Credentials → your OAuth client → Authorised redirect URIs 🧍 · the identical string |
| INV-07132 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | Google Console → OAuth consent screen → Authorised domains 🧍 | RULE | (none) | (none) | Google Console → OAuth consent screen → Authorised domains 🧍 · get-kind.com |
| INV-07133 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | The code 🤖 · Already done — nothing to change. GOOGLE_REDIRECT_URI is read from the environment (lib/gcal.ts:13) an… | OPERATING | (none) | (none) | The code 🤖 · Already done — nothing to change. GOOGLE_REDIRECT_URI is read from the environment (lib/gcal.ts:13) and every callbac… |
| INV-07134 | The five stages, in order › Stage 3 — the three values that must agree 🧍 + 🤖 | (none) | Prove it · Paste the Railway value and the console value into a plain-text editor on two lines and look at them. Th… | DEFECT | (none) | (none) | Prove it · Paste the Railway value and the console value into a plain-text editor on two lines and look at them. They must be iden… |
| INV-07135 | The five stages, in order › Stage 4 — domain ownership verification 🧍 | (none) | Stage 4 — domain ownership verification 🧍 | OPERATING | (none) | (none) | Heading |
| INV-07136 | The five stages, in order › Stage 4 — domain ownership verification 🧍 | (none) | Where · Google Search Console — the same Google account that owns the Cloud project | OPERATING | (none) | (none) |  |
| INV-07137 | The five stages, in order › Stage 4 — domain ownership verification 🧍 | (none) | Do · Add get-kind.com as a Domain property. Google gives you a TXT record. Add it in Cloudflare DNS. Return to Sear… | OPERATING | (none) | (none) | Do · Add get-kind.com as a Domain property. Google gives you a TXT record. Add it in Cloudflare DNS. Return to Search Console and … |
| INV-07138 | The five stages, in order › Stage 4 — domain ownership verification 🧍 | (none) | Why · This is the step the railway.app domain made impossible — the whole reason for stages 1–3. You cannot prove o… | OPERATING | (none) | (none) | Why · This is the step the railway.app domain made impossible — the whole reason for stages 1–3. You cannot prove ownership of som… |
| INV-07139 | The five stages, in order › Stage 4 — domain ownership verification 🧍 | (none) | Prove it · Search Console shows the property as verified, and dig +short TXT get-kind.com shows the token. The Clou… | OPERATING | (none) | (none) | Prove it · Search Console shows the property as verified, and dig +short TXT get-kind.com shows the token. The Cloud Console's Aut… |
| INV-07140 | The five stages, in order › Stage 5 — submit for verification 🧍 | (none) | Stage 5 — submit for verification 🧍 | OPERATING | (none) | (none) | Heading |
| INV-07141 | The five stages, in order › Stage 5 — submit for verification 🧍 | (none) | Where · Google Cloud Console → OAuth consent screen → Publishing status → Publish app → submit for verification | RULE | (none) | (none) |  |
| INV-07142 | The five stages, in order › Stage 5 — submit for verification 🧍 | P13 | Have ready · The app name and logo · the homepage https://www.get-kind.com · the privacy policy https://www.get-kin… | RULE | (none) | (none) | Have ready · The app name and logo · the homepage https://www.get-kind.com · the privacy policy https://www.get-kind.com/privacy.h… |
| INV-07143 | The five stages, in order › Stage 5 — submit for verification 🧍 | #683 | Scope justification — the four, and why each is needed 🤖 | RULE | ⚠️ | 20 Aug | Scope justification — the four, and why each is needed 🤖 · calendar.events — create the meeting on the client's calendar · calenda… |
| INV-07144 | The five stages, in order › Stage 5 — submit for verification 🧍 | (none) | Prove it · The console shows "Verification in progress", and Google emails a case reference. Keep it — replies come… | OPERATING | (none) | (none) | Prove it · The console shows "Verification in progress", and Google emails a case reference. Keep it — replies come to that thread… |
| INV-07145 | The five stages, in order › Stage 5 — submit for verification 🧍 | (none) | Expect · Days to weeks, and often a round of questions. The test-user bridge above carries every client in the mean… | OPERATING | (none) | (none) | Expect · Days to weeks, and often a round of questions. The test-user bridge above carries every client in the meantime, up to 100… |
| INV-07146 | What is already true, so nobody re-does it | (none) | What is already true, so nobody re-does it | OPERATING | (none) | (none) | Heading |
| INV-07147 | What is already true, so nobody re-does it | #683 | Scopes narrowed | OPERATING | (none) | 20 Aug | Scopes narrowed · 20 Aug (#683): calendar.readonly removed — we no longer ask to read event contents. Pinned by gcal-scopes.test.t… |
| INV-07148 | What is already true, so nobody re-does it | (none) | No hardcoded host | OPERATING | (none) | 21 Aug | No hardcoded host · Verified 21 Aug and guarded: calendar-host-portability.test.ts. |
| INV-07149 | What is already true, so nobody re-does it | (none) | Redirect URI is env-only | OPERATING | (none) | (none) | Redirect URI is env-only · lib/gcal.ts:13. The domain move needs no deploy of changed code. |
| INV-07150 | What is already true, so nobody re-does it | (none) | Still to do | OPERATING | (none) | (none) | Still to do · Stages 1–5 above. Nothing in stages 1–5 can be done from a codebase. |
| INV-07151 | Two limits of this runbook, stated rather than discovered later | (none) | Two limits of this runbook, stated rather than discovered later | OPERATING | ⚠️ | (none) | Heading |
| INV-07152 | Two limits of this runbook, stated rather than discovered later | (none) | A green test suite does not mean the connection works. The guard proves no host is baked | OPERATING | (none) | (none) |  |
| INV-07153 | Two limits of this runbook, stated rather than discovered later | (none) | Verification is Google's decision, not a checklist outcome. Submitting well makes approval | OPERATING | (none) | (none) |  |

## `docs/sales-playbook.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Sales playbook · **Lines:** 507 · **Material items in this source:** 153 · **Rows in this part:** 153 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07154 | KIND Sales Playbook | (none) | KIND Sales Playbook | COMMERCIAL | (none) | (none) | Heading |
| INV-07155 | KIND Sales Playbook | #629 | TRUTH BANNER — 6 Aug 2026 (#629). READ BEFORE YOU QUOTE ANYTHING FROM THIS PAGE. | COMMERCIAL | ⚠️ | 6 Aug 2026 | Blockquote |
| INV-07156 | KIND Sales Playbook | (none) | A full sweep of this document against the code on 6 Aug found 15 of 22 factual claims FALSE. They are being correct… | DEFECT | (none) | 6 Aug | Blockquote |
| INV-07157 | KIND Sales Playbook | (none) | / Topic / THE TRUTH (source of record) / | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07158 | KIND Sales Playbook | (none) | / Price / $299 first purchase = the onboarding pack, 100 approved leads included, then $4 per approved lead. Review… | MONEY | (none) | (none) | Blockquote |
| INV-07159 | KIND Sales Playbook | #607 | / No trial, no freebies / Signup writes paused with a $0 wallet and $0 sourcing allowance. Nothing sources, approve… | MONEY | (none) | 1 Aug | Blockquote |
| INV-07160 | KIND Sales Playbook | (none) | / The retired ladder / $1 reveal → +$3 FIGSY → +$1 Milla → +$1 Denise → Vida $3 is DEAD (superseded 24 Jul, price r… | MONEY | (none) | 24 Jul | Blockquote |
| INV-07161 | KIND Sales Playbook | (none) | / Who sends / OUR OWN ENGINE, over SMTP — figsy.ts → lib/mailer.ts → the inbox from lib/sending-inbox.ts. Instantly… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07162 | KIND Sales Playbook | (none) | / Flutterwave / Paystack / Never wired / removed. Stripe only. / | RULE | (none) | (none) | Blockquote |
| INV-07163 | KIND Sales Playbook | (none) | Why this banner exists. The founder, 6 Aug: "i have not read a doc for 2 weeks because i dont trust it… things slip… | COMMERCIAL | (none) | 6 Aug | Blockquote |
| INV-07164 | KIND Sales Playbook | (none) | PRICING (locked 24–25 Jul, price re-locked 3 Aug): the first purchase is the $299 onboarding pack — 100 approved le… | MONEY | ⚠️ ⛓️ | 25 Jul | Blockquote |
| INV-07165 | KIND Sales Playbook | (none) | Version 1.0 — May 2026 · For internal use only | COMMERCIAL | (none) | May 2026 | Blockquote |
| INV-07166 | KIND Sales Playbook | §3 | Last-checked: 25 Jun 2026 — Currency = USD (locked; the R[ZAR] placeholders below are now $[USD]). 5 agents: FIGSY … | MONEY | (none) | 25 Jun 2026 | Blockquote |
| INV-07167 | KIND Sales Playbook | (none) | 🌍 GTM = TWO-TRACK (25 Jun): US/UK/EMEA via OUR OWN outreach (dogfood FIGSY) + Africa via DIRECT (data, item 243) + … | RULE | (none) | 25 Jun | Blockquote |
| INV-07168 | KIND Sales Playbook | (none) | REPLY-RATE CORRECTION (23 Jun): the "8% — our actual average" lines below were an UNVALIDATED target, never measure… | MONEY | ⚠️ | 23 Jun | Blockquote |
| INV-07169 | SECTION 1: ICP & QUALIFICATION | (none) | SECTION 1: ICP & QUALIFICATION | COMMERCIAL | (none) | (none) | Heading |
| INV-07170 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Our Ideal Customer Profile (ICP) | IDEA | (none) | (none) | Heading |
| INV-07171 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Attribute · Definition | COMMERCIAL | (none) | (none) |  |
| INV-07172 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Title · Founder, CEO, MD, Sales Director | COMMERCIAL | (none) | (none) |  |
| INV-07173 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Company size · 5–50 employees | COMMERCIAL | (none) | (none) |  |
| INV-07174 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Business model | COMMERCIAL | (none) | (none) | Business model · B2B only |
| INV-07175 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Primary markets | COMMERCIAL | (none) | (none) | Primary markets · Two tracks: US · UK · IE · FR · NL (our own direct outreach) · + Africa: South Africa, Nigeria, Kenya (direct-da… |
| INV-07176 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Secondary markets | COMMERCIAL | (none) | (none) | Secondary markets · Ghana, Zimbabwe, diaspora |
| INV-07177 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Industries · Professional services, Fintech, Logistics, Tech, Consulting, SaaS, Marketing agencies | COMMERCIAL | (none) | (none) |  |
| INV-07178 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Pain point · Founder IS the sales team — no scalable outbound motion | COMMERCIAL | (none) | (none) |  |
| INV-07179 | SECTION 1: ICP & QUALIFICATION › Our Ideal Customer Profile (ICP) | (none) | Growth stage · Post-revenue, wants to scale | MONEY | (none) | (none) |  |
| INV-07180 | SECTION 1: ICP & QUALIFICATION › Qualification Criteria — MUST have all 3 | (none) | Qualification Criteria — MUST have all 3 | COMMERCIAL | (none) | (none) | Heading |
| INV-07181 | SECTION 1: ICP & QUALIFICATION › Qualification Criteria — MUST have all 3 | (none) | Has a sales function — they are actively trying to find new clients (even if the "function" is just the founder doi… | COMMERCIAL | (none) | (none) |  |
| INV-07182 | SECTION 1: ICP & QUALIFICATION › Qualification Criteria — MUST have all 3 | (none) | B2B — they sell to businesses, not consumers | COMMERCIAL | (none) | (none) |  |
| INV-07183 | SECTION 1: ICP & QUALIFICATION › Qualification Criteria — MUST have all 3 | (none) | Founder-led sales pain — the founder/director is the bottleneck; there's no system, no pipeline visibility, no cons… | COMMERCIAL | (none) | (none) |  |
| INV-07184 | SECTION 1: ICP & QUALIFICATION › Disqualify If | (none) | Disqualify If | COMMERCIAL | (none) | (none) | Heading |
| INV-07185 | SECTION 1: ICP & QUALIFICATION › Disqualify If | (none) | B2C only (no B2B component) | COMMERCIAL | (none) | (none) |  |
| INV-07186 | SECTION 1: ICP & QUALIFICATION › Disqualify If | (none) | Under 6 months old with zero revenue (no proof of product-market fit yet) | MONEY | (none) | (none) |  |
| INV-07187 | SECTION 1: ICP & QUALIFICATION › Disqualify If | (none) | Requires custom software development as part of their core need | COMMERCIAL | (none) | (none) |  |
| INV-07188 | SECTION 1: ICP & QUALIFICATION › Disqualify If | (none) | Expects a managed service where KIND does the selling for them (they need to own the tool) | COMMERCIAL | (none) | (none) |  |
| INV-07189 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) | (none) | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07190 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) | (none) | Before the call: Review their LinkedIn, website, and any notes from how they booked (cold outreach? Referral? Inbou… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07191 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Opening (2 min) | (none) | Opening (2 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07192 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Rapport (3 min) | (none) | Rapport (3 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07193 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Pain Discovery (15 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07194 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Q1: How do you currently find and qualify new clients? | COMMERCIAL | (none) | (none) |  |
| INV-07195 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Is that mostly inbound, referrals, or are you doing any outbound?" | COMMERCIAL | (none) | (none) |  |
| INV-07196 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "When you say referrals — how often does that actually happen? Weekly? Monthly?" | COMMERCIAL | (none) | (none) |  |
| INV-07197 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "And when you do reach out cold — what does that process look like right now?" | COMMERCIAL | (none) | (none) |  |
| INV-07198 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Who actually does that outreach? You personally?" | COMMERCIAL | (none) | (none) |  |
| INV-07199 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Q2: Where does your pipeline break down most often? | COMMERCIAL | (none) | (none) |  |
| INV-07200 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Is it finding the right people to talk to, getting them to respond, or converting them after they show interest?" | COMMERCIAL | (none) | (none) |  |
| INV-07201 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "If you had to pick one stage that's the biggest problem — top of funnel, middle, or close — which would it be?" | COMMERCIAL | (none) | (none) |  |
| INV-07202 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "What does your pipeline actually look like right now — do you track it anywhere?" | COMMERCIAL | (none) | (none) |  |
| INV-07203 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Q3: Have you tried outbound before? What happened? | COMMERCIAL | (none) | (none) |  |
| INV-07204 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "What tools or methods did you use?" | COMMERCIAL | (none) | (none) |  |
| INV-07205 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "How many contacts did you reach out to? What was the reply rate?" | COMMERCIAL | (none) | (none) |  |
| INV-07206 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "What made you stop — was it the results, the time, or something else?" | COMMERCIAL | (none) | (none) |  |
| INV-07207 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Did you use any tools like Apollo, Lemlist, Instantly?" | COMMERCIAL | (none) | (none) |  |
| INV-07208 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Q4: What markets and job titles are you targeting? | COMMERCIAL | (none) | (none) |  |
| INV-07209 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Is it primarily SA, or are you already looking at other African markets?" | COMMERCIAL | (none) | (none) |  |
| INV-07210 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "When you say [title] — is that at enterprise, mid-market, SME?" | COMMERCIAL | (none) | (none) |  |
| INV-07211 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Do you have a well-defined ICP written down somewhere, or is it more intuitive right now?" | COMMERCIAL | (none) | (none) |  |
| INV-07212 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | Q5: What's your budget for sales infrastructure this year? | ARCHITECTURE | (none) | (none) |  |
| INV-07213 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Are you currently paying for any outbound tools — LinkedIn Sales Nav, Apollo, email tools?" | COMMERCIAL | (none) | (none) |  |
| INV-07214 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "Is this something you've allocated for or would need to justify internally?" | COMMERCIAL | (none) | (none) |  |
| INV-07215 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Pain Discovery (15 min) | (none) | "If this worked exactly as promised — let's say you had a consistent flow of qualified leads every week — what woul… | MONEY | (none) | (none) |  |
| INV-07216 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Demo Pivot (5 min) | (none) | Demo Pivot (5 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07217 | SECTION 2: DISCOVERY CALL SCRIPT (30–45 min) › Close (5 min) | (none) | Close (5 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07218 | SECTION 3: DEMO FLOW (30 min) | (none) | SECTION 3: DEMO FLOW (30 min) | COMMERCIAL | (none) | (none) | Heading |
| INV-07219 | SECTION 3: DEMO FLOW (30 min) | (none) | Setup: Have a Demo Environment open in the Admin portal before the call. Use the demo env feature to spin up a fres… | OPERATING | (none) | (none) | Blockquote |
| INV-07220 | SECTION 3: DEMO FLOW (30 min) › Step 1 — Context Set (2 min) | (none) | Step 1 — Context Set (2 min) | OPERATING | (none) | (none) | Heading |
| INV-07221 | SECTION 3: DEMO FLOW (30 min) › Step 2 — ICP Builder (5 min) | (none) | Step 2 — ICP Builder (5 min) | OPERATING | (none) | (none) | Heading |
| INV-07222 | SECTION 3: DEMO FLOW (30 min) › Step 3 — Leads with Scores (7 min) | (none) | Step 3 — Leads with Scores (7 min) | OPERATING | (none) | (none) | Heading |
| INV-07223 | SECTION 3: DEMO FLOW (30 min) › Step 4 — FIGSY Campaign Creation (8 min) | (none) | Step 4 — FIGSY Campaign Creation (8 min) | OPERATING | (none) | (none) | Heading |
| INV-07224 | SECTION 3: DEMO FLOW (30 min) › Step 5 — Billing / Credits (3 min) | (none) | Step 5 — Billing / Credits (3 min) | MONEY | (none) | (none) | Heading |
| INV-07225 | SECTION 3: DEMO FLOW (30 min) › Step 6 — Close (5 min) | (none) | Step 6 — Close (5 min) | OPERATING | (none) | (none) | Heading |
| INV-07226 | SECTION 4: OBJECTION HANDLING | (none) | SECTION 4: OBJECTION HANDLING | COMMERCIAL | (none) | (none) | Heading |
| INV-07227 | SECTION 4: OBJECTION HANDLING | (none) | "We already use Lemlist / Instantly / Apollo." | COMMERCIAL | (none) | (none) |  |
| INV-07228 | SECTION 4: OBJECTION HANDLING | (none) | "We don't have budget." | COMMERCIAL | (none) | (none) |  |
| INV-07229 | SECTION 4: OBJECTION HANDLING | (none) | "We do this in-house." | COMMERCIAL | (none) | (none) |  |
| INV-07230 | SECTION 4: OBJECTION HANDLING | (none) | "I need to think about it." | COMMERCIAL | (none) | (none) |  |
| INV-07231 | SECTION 4: OBJECTION HANDLING | (none) | "We're not ready yet." | COMMERCIAL | (none) | (none) |  |
| INV-07232 | SECTION 4: OBJECTION HANDLING | (none) | "How do I know the leads are good?" | COMMERCIAL | (none) | (none) |  |
| INV-07233 | SECTION 4: OBJECTION HANDLING | (none) | "What's the reply rate?" | COMMERCIAL | (none) | (none) |  |
| INV-07234 | SECTION 4: OBJECTION HANDLING | (none) | "Is my data safe? What about POPIA?" | RULE | (none) | (none) |  |
| INV-07235 | SECTION 5: PROPOSAL TEMPLATE | (none) | SECTION 5: PROPOSAL TEMPLATE | COMMERCIAL | (none) | (none) | Heading |
| INV-07236 | SECTION 5: PROPOSAL TEMPLATE | (none) | Subject line: KIND Proposal — [Company Name] — [Date] | COMMERCIAL | (none) | (none) |  |
| INV-07237 | SECTION 5: PROPOSAL TEMPLATE › Executive Summary | (none) | Executive Summary | COMMERCIAL | (none) | (none) | Heading |
| INV-07238 | SECTION 5: PROPOSAL TEMPLATE › Recommended Products | (none) | Recommended Products | COMMERCIAL | (none) | (none) | Heading |
| INV-07239 | SECTION 5: PROPOSAL TEMPLATE › Recommended Products | (none) | Product · Why it fits [Company] | COMMERCIAL | (none) | (none) |  |
| INV-07240 | SECTION 5: PROPOSAL TEMPLATE › Recommended Products | (none) | Lead Gen (ICP + Scoring) | COMMERCIAL | (none) | (none) | Lead Gen (ICP + Scoring) · [Their ICP is currently undefined / they're wasting time on unqualified leads — AI ICP builder solves t… |
| INV-07241 | SECTION 5: PROPOSAL TEMPLATE › Recommended Products | (none) | FIGSY AI SDR · [They have no consistent outbound motion — FIGSY runs campaigns while they focus on closing] | COMMERCIAL | (none) | (none) |  |
| INV-07242 | SECTION 5: PROPOSAL TEMPLATE › Recommended Products | (none) | [Milla / Vida — if applicable] | COMMERCIAL | (none) | (none) | [Milla / Vida — if applicable] · [If they mentioned inbound / website qualification needs] |
| INV-07243 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Pricing | MONEY | (none) | (none) | Heading |
| INV-07244 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Tier · Credits · Best for · Price (USD) | MONEY | (none) | (none) |  |
| INV-07245 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Starter · 500 credits · 5–15 leads/week · $[X] | COMMERCIAL | (none) | (none) |  |
| INV-07246 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Growth · 1,500 credits · 15–40 leads/week · $[X] | COMMERCIAL | (none) | (none) |  |
| INV-07247 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Pro · 5,000 credits · 40+ leads/week · $[X] | COMMERCIAL | (none) | (none) |  |
| INV-07248 | SECTION 5: PROPOSAL TEMPLATE › Pricing | (none) | Recommended for [Company]: [Tier] — [reason based on their target volume from discovery]. | COMMERCIAL | (none) | (none) |  |
| INV-07249 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | What Happens Next | COMMERCIAL | (none) | (none) | Heading |
| INV-07250 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | Day 1 · You sign up — no card to sign up, no subscription; the $299 pack starts the work | MONEY | (none) | (none) |  |
| INV-07251 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | Day 2–3 · 30-min onboarding call — we configure your ICP, set up FIGSY | COMMERCIAL | (none) | (none) |  |
| INV-07252 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | Day 3–5 · First batch of scored leads delivered to your dashboard | COMMERCIAL | (none) | (none) |  |
| INV-07253 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | Day 5–7 · First campaign launched, sequences running | COMMERCIAL | (none) | (none) |  |
| INV-07254 | SECTION 5: PROPOSAL TEMPLATE › What Happens Next | (none) | Week 2 · First replies in your inbox | COMMERCIAL | (none) | (none) |  |
| INV-07255 | SECTION 5: PROPOSAL TEMPLATE › Risk Reversal | (none) | Risk Reversal | RISK | (none) | (none) | Heading |
| INV-07256 | SECTION 5: PROPOSAL TEMPLATE › Risk Reversal | (none) | No card to sign up, no subscription — the first purchase is the $299 onboarding pack (100 approved leads included),… | MONEY | (none) | 24 Jul |  |
| INV-07257 | SECTION 5: PROPOSAL TEMPLATE › Risk Reversal | (none) | Credit model — you pay per use, no monthly lock-in, credits never expire | RULE | (none) | (none) |  |
| INV-07258 | SECTION 5: PROPOSAL TEMPLATE › Risk Reversal | (none) | No subscription, no long-term contract | COMMERCIAL | (none) | (none) |  |
| INV-07259 | SECTION 5: PROPOSAL TEMPLATE › Risk Reversal | (none) | If your first leads don't meet your ICP standards, we'll work with you to rebuild the ICP | COMMERCIAL | (none) | (none) |  |
| INV-07260 | SECTION 5: PROPOSAL TEMPLATE › Next Step | (none) | Next Step | COMMERCIAL | (none) | (none) | Heading |
| INV-07261 | SECTION 5: PROPOSAL TEMPLATE › Next Step | (none) | One action: Click the link below to sign up — no card to sign up — and book your onboarding call. | COMMERCIAL | (none) | (none) |  |
| INV-07262 | SECTION 6: FOLLOW-UP SEQUENCES | (none) | SECTION 6: FOLLOW-UP SEQUENCES | COMMERCIAL | (none) | (none) | Heading |
| INV-07263 | SECTION 6: FOLLOW-UP SEQUENCES | (none) | Rule: Always have a specific next step booked before ending a call. These templates are for when that falls through… | RULE | (none) | (none) | Blockquote |
| INV-07264 | SECTION 6: FOLLOW-UP SEQUENCES › Same Day After Call | (none) | Same Day After Call | COMMERCIAL | (none) | (none) | Heading |
| INV-07265 | SECTION 6: FOLLOW-UP SEQUENCES › Same Day After Call | (none) | Subject: Quick recap — [Company Name] + KIND | COMMERCIAL | (none) | (none) |  |
| INV-07266 | SECTION 6: FOLLOW-UP SEQUENCES › Same Day After Call | (none) | Problem: [1-line summary of their pain from the call] | COMMERCIAL | (none) | (none) |  |
| INV-07267 | SECTION 6: FOLLOW-UP SEQUENCES › Same Day After Call | (none) | Recommended: [Product(s)] | COMMERCIAL | (none) | (none) |  |
| INV-07268 | SECTION 6: FOLLOW-UP SEQUENCES › Same Day After Call | (none) | Next step: free sign-up (no card, pay per lead), onboarding call booked for [date if agreed] / [book here: link] | COMMERCIAL | (none) | (none) |  |
| INV-07269 | SECTION 6: FOLLOW-UP SEQUENCES › Day 2 — No Reply | (none) | Day 2 — No Reply | COMMERCIAL | (none) | (none) | Heading |
| INV-07270 | SECTION 6: FOLLOW-UP SEQUENCES › Day 2 — No Reply | (none) | Subject: Re: Quick recap — [Company Name] + KIND | COMMERCIAL | (none) | (none) |  |
| INV-07271 | SECTION 6: FOLLOW-UP SEQUENCES › Day 5 — Breakup Email | (none) | Day 5 — Breakup Email | COMMERCIAL | (none) | (none) | Heading |
| INV-07272 | SECTION 6: FOLLOW-UP SEQUENCES › Day 5 — Breakup Email | (none) | Subject: Closing the loop | COMMERCIAL | (none) | (none) |  |
| INV-07273 | SECTION 7: LOSS REASON TRACKER | (none) | SECTION 7: LOSS REASON TRACKER | COMMERCIAL | (none) | (none) | Heading |
| INV-07274 | SECTION 7: LOSS REASON TRACKER › Loss Log | (none) | Loss Log | COMMERCIAL | (none) | (none) | Heading |
| INV-07275 | SECTION 7: LOSS REASON TRACKER › Loss Log | (none) | Date · Company · Stage Lost · Reason Category · What I'd Do Differently | COMMERCIAL | (none) | (none) |  |
| INV-07276 | SECTION 7: LOSS REASON TRACKER › Loss Log | (none) | Stage options: Outreach → Discovery Booked → Demo Given → Proposal Sent → Negotiation → Closed Lost | COMMERCIAL | (none) | (none) |  |
| INV-07277 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | 8 Most Common B2B SaaS Loss Reasons | COMMERCIAL | (none) | (none) | Heading |
| INV-07278 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | No budget / no budget authority — Spoke to someone who couldn't approve spend. Always qualify financial authority i… | RULE | (none) | (none) |  |
| INV-07279 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | Wrong timing — Genuine "not now" — company in freeze, just signed a competitor. Note and re-engage in 90 days. | DEFECT | (none) | (none) |  |
| INV-07280 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | Champion left — Main contact changed jobs or role. Build relationships with 2 people in the account. | COMMERCIAL | (none) | (none) |  |
| INV-07281 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | Competitor already in — Another tool already embedded, switching cost too high. Probe for incumbent tools early. | MONEY | (none) | (none) |  |
| INV-07282 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | ICP mismatch — Deal should have been disqualified earlier. Review qualification criteria. | COMMERCIAL | (none) | (none) |  |
| INV-07283 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | Product gap — Something they needed, KIND didn't have. Log for product team. | COMMERCIAL | (none) | (none) |  |
| INV-07284 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | No urgency — Pain wasn't acute enough. Didn't tie the cost of inaction to a real number in discovery. | MONEY | (none) | (none) |  |
| INV-07285 | SECTION 7: LOSS REASON TRACKER › 8 Most Common B2B SaaS Loss Reasons | (none) | Proposal too slow — Took more than 48 hours to send proposal after demo. Same-day or next-day is the standard. | COMMERCIAL | (none) | (none) |  |
| INV-07286 | SECTION 8: WIN METRICS | (none) | SECTION 8: WIN METRICS | COMMERCIAL | (none) | (none) | Heading |
| INV-07287 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Weekly Targets | COMMERCIAL | (none) | (none) | Heading |
| INV-07288 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Metric · Weekly Target · How to Measure | OPERATING | (none) | (none) |  |
| INV-07289 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Outreach sent | COMMERCIAL | (none) | (none) | Outreach sent · 50 · Tracked in FIGSY or manually |
| INV-07290 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Discovery calls booked | COMMERCIAL | (none) | (none) | Discovery calls booked · 5 · Calendar |
| INV-07291 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Demos given · 3 · CRM / calendar | COMMERCIAL | (none) | (none) |  |
| INV-07292 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Proposals sent | COMMERCIAL | (none) | (none) | Proposals sent · 2 · Email sent folder |
| INV-07293 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Deals closed · 1 · Stripe / Flutterwave | COMMERCIAL | (none) | (none) |  |
| INV-07294 | SECTION 8: WIN METRICS › Weekly Targets | (none) | Pipeline value | MONEY | (none) | (none) | Pipeline value · _$ TBC — founder to set the USD revenue run-rate target_ · Active proposals × average deal size |
| INV-07295 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Conversion Benchmarks | COMMERCIAL | (none) | (none) | Heading |
| INV-07296 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Stage · Conversion Rate · What to aim for | COMMERCIAL | (none) | (none) |  |
| INV-07297 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Outreach → Discovery booked | COMMERCIAL | (none) | (none) | Outreach → Discovery booked · 10% · 5 calls from 50 outreaches |
| INV-07298 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Discovery → Demo | COMMERCIAL | (none) | (none) | Discovery → Demo · 60% · 3 demos from 5 calls |
| INV-07299 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Demo → Proposal | COMMERCIAL | (none) | (none) | Demo → Proposal · 67% · 2 proposals from 3 demos |
| INV-07300 | SECTION 8: WIN METRICS › Conversion Benchmarks | (none) | Proposal → Close | COMMERCIAL | (none) | (none) | Proposal → Close · 50% · 1 close from 2 proposals |
| INV-07301 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | Lagging Indicators to Watch | COMMERCIAL | (none) | (none) | Heading |
| INV-07302 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | Average deal size — target _$ TBC collected revenue run-rate per client_ (founder to set the USD per-client spend t… | MONEY | (none) | (none) |  |
| INV-07303 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | Time from first contact to close — target under 14 days | COMMERCIAL | (none) | (none) |  |
| INV-07304 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | Churn rate — target under 5% monthly | COMMERCIAL | (none) | (none) |  |
| INV-07305 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | NPS — ask after 30 days | COMMERCIAL | (none) | (none) |  |
| INV-07306 | SECTION 8: WIN METRICS › Lagging Indicators to Watch | (none) | This playbook is a living document. Update it when you find something that works better. Review quarterly. | COMMERCIAL | (none) | (none) | Blockquote |

## `docs/art-of-possible.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Art of the possible · **Lines:** 588 · **Material items in this source:** 243 · **Rows in this part:** 243 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07307 | K.I.N.D — Art of the Possible | (none) | K.I.N.D — Art of the Possible | IDEA | (none) | (none) | Heading |
| INV-07308 | K.I.N.D — Art of the Possible | (none) | Future vision. Inspiration log. Nothing here is built yet unless marked ✅. | IDEA | ✅ | (none) |  |
| INV-07309 | THE ONE RULE | (none) | THE ONE RULE | RULE | (none) | (none) | Heading |
| INV-07310 | THE ONE RULE | (none) | Build the foundation. Prove the loop. Then build the palace. | IDEA | (none) | (none) | Blockquote |
| INV-07311 | FOUNDATION GATES — Must be true before any V2 feature | (none) | FOUNDATION GATES — Must be true before any V2 feature | GATE | (none) | (none) | Heading |
| INV-07312 | FOUNDATION GATES — Must be true before any V2 feature | (none) | 20+ paying clients | DEFECT | (none) | (none) | 20+ paying clients · Real usage data. Features built on assumptions are wrong features. |
| INV-07313 | FOUNDATION GATES — Must be true before any V2 feature | (none) | PDL Full + Hunter data live | IDEA | (none) | (none) | PDL Full + Hunter data live · No data = no patterns to learn from |
| INV-07314 | FOUNDATION GATES — Must be true before any V2 feature | (none) | FIGSY reply classification running cleanly | IDEA | (none) | (none) | FIGSY reply classification running cleanly · Entire self-improving loop depends on this |
| INV-07315 | FOUNDATION GATES — Must be true before any V2 feature | (none) | figsy_memory table populated (3 months) | ARCHITECTURE | (none) | (none) | figsy_memory table populated (3 months) · ICP learning engine has nothing until then |
| INV-07316 | FOUNDATION GATES — Must be true before any V2 feature | (none) | Resend inbound routing live | IDEA | (none) | (none) | Resend inbound routing live · Reply data is lost without this |
| INV-07317 | PRODUCT INDEX | (none) | PRODUCT INDEX | IDEA | (none) | (none) | Heading |
| INV-07318 | PRODUCT INDEX | (none) | Product · Category · Key Lesson · Status · Date | IDEA | (none) | (none) |  |
| INV-07319 | PRODUCT INDEX | #1 | 1 · Apex (apex.host) · Autonomous AI founder assistant · "Acts, doesn't just respond" framing · 🟡 Actions pending ·… | IDEA | 🟡 | 26 May 2026 | 1 · Apex (apex.host) · Autonomous AI founder assistant · "Acts, doesn't just respond" framing · 🟡 Actions pending · 26 May 2026 |
| INV-07320 | PRODUCT INDEX | #2 | 2 · ClickUp · Project management SaaS · Command centre UI + partner model · ✅ Built (design) · May 2026 | COMMERCIAL | ✅ | May 2026 |  |
| INV-07321 | PRODUCT INDEX | #3 | 3 · Lemlist · Email outreach platform · Personalised images + community + template library · 🟡 Phase 2-3 · May 2026 | COMMERCIAL | 🟡 | May 2026 |  |
| INV-07322 | PRODUCT INDEX | #4 | 4 · Instantly · Cold email at scale · Campaign auto-pause + domain warming · ✅ Built · May 2026 | COMMERCIAL | ✅ | May 2026 |  |
| INV-07323 | PRODUCT INDEX | #5 | 5 · Clay · Data enrichment + ICP · Multi-source fallback + ICP as filter system · ✅ Built · May 2026 | IDEA | ✅ | May 2026 |  |
| INV-07324 | PRODUCT INDEX | #6 | 6 · Apollo · Lead data + sequences · Our supplier, partial competitor, and teacher · ✅ Integrated · May 2026 | COMMERCIAL | ✅ | May 2026 |  |
| INV-07325 | THE THREE TEACHERS | (none) | THE THREE TEACHERS | IDEA | (none) | (none) | Heading |
| INV-07326 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Teacher 1 — ClickUp: The Command Centre | IDEA | (none) | (none) | Heading |
| INV-07327 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Multiple views of the same data — List, Board, Timeline, Calendar, Gantt. Data is identical, the view changes how y… | IDEA | (none) | (none) |  |
| INV-07328 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Command palette (Cmd+K) — Type anything. "Add ICP." "Pause FIGSY." Power users live in it. Makes the product feel l… | IDEA | (none) | (none) |  |
| INV-07329 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Real-time activity feed — Every action as it happens. Not a report — live, in a sidebar feed | IDEA | (none) | (none) |  |
| INV-07330 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Sidebar is mission control — Live stats always visible. Credits. Active campaigns. Health of your revenue operation… | MONEY | (none) | (none) |  |
| INV-07331 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Progressive disclosure — Simple by default, powerful on demand. New client sees essentials. Power user accesses eve… | COMMERCIAL | (none) | (none) |  |
| INV-07332 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | Micro-interactions — When a lead scores 90+, it glows. When FIGSY sends a batch, a subtle pulse. Credits go amber w… | COMMERCIAL | (none) | (none) |  |
| INV-07333 | THE THREE TEACHERS › Teacher 1 — ClickUp: The Command Centre | (none) | What K.I.N.D builds from this: Revenue Mission Control (see V2 Vision below) | MONEY | (none) | (none) |  |
| INV-07334 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | Teacher 2 — Lemlist: The Conversion Machine | IDEA | (none) | (none) | Heading |
| INV-07335 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 1. Personalised images in emails | IDEA | (none) | (none) |  |
| INV-07336 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 2. The visual sequence builder | IDEA | (none) | (none) |  |
| INV-07337 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 3. Template library by use case | IDEA | (none) | (none) |  |
| INV-07338 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 4. "Icebreaker" first lines | IDEA | (none) | (none) |  |
| INV-07339 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 5. Community — "Lemlist Family" | IDEA | (none) | (none) |  |
| INV-07340 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | 6. Multi-channel sequences (email + LinkedIn) | IDEA | (none) | (none) |  |
| INV-07341 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | What Lemlist has that FIGSY already beats | IDEA | (none) | (none) |  |
| INV-07342 | THE THREE TEACHERS › Teacher 2 — Lemlist: The Conversion Machine | (none) | AI-generated first lines: Lemlist generates one personalised opener. FIGSY personalises the full email. K.I.N.D win… | IDEA | (none) | (none) |  |
| INV-07343 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Teacher 3 — Apollo: Supplier, Competitor, and Teacher | IDEA | (none) | (none) | Heading |
| INV-07344 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | What Apollo actually is | IDEA | (none) | (none) |  |
| INV-07345 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Contact database — 275M+ professional contacts. (K.I.N.D's own sourcing is PDL Full + Hunter; Apollo is optional BY… | ARCHITECTURE | (none) | (none) |  |
| INV-07346 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Sequences — DIY outreach automation. This is where Apollo overlaps with FIGSY. | COMMERCIAL | (none) | (none) |  |
| INV-07347 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | CRM / pipeline — Deals, calls, Salesforce sync. K.I.N.D doesn't play here yet. | COMMERCIAL | (none) | (none) |  |
| INV-07348 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Where K.I.N.D competes: FIGSY vs Apollo sequences. But Apollo sells a toolbox to in-house SDR teams. K.I.N.D sells … | IDEA | (none) | (none) |  |
| INV-07349 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Where K.I.N.D doesn't compete: Data ownership, enterprise CRM, US/EU enterprise sales tooling. | COMMERCIAL | (none) | (none) |  |
| INV-07350 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | What to learn from Apollo | IDEA | (none) | (none) |  |
| INV-07351 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Lesson · Apollo does · K.I.N.D version · When | IDEA | (none) | (none) |  |
| INV-07352 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Job change alerts | COMMERCIAL | (none) | (none) | Job change alerts · Badge on contact: "just changed companies" — highest intent moment · Badge on lead cards, auto-prioritise in F… |
| INV-07353 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Sequence analytics | IDEA | (none) | (none) | Sequence analytics · Open rate by subject line, reply rate by day of week, best send time by industry · FIGSY analytics + Benchmar… |
| INV-07354 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | AI transparency | IDEA | (none) | (none) | AI transparency · Show why the AI scored a contact · Show why FIGSY wrote an email the way it did · Phase 3 |
| INV-07355 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | Intent spike signals | MONEY | (none) | (none) | Intent spike signals · Companies researching your category · Requires Bombora/G2 data (~$2k/mo) · Year 2 |
| INV-07356 | THE THREE TEACHERS › Teacher 3 — Apollo: Supplier, Competitor, and Teacher | (none) | The strategic reality: Apollo is primarily a supplier. The genuine risk is if Apollo builds a "Done-For-You" manage… | RISK | (none) | (none) |  |
| INV-07357 | THE V2 VISION — Revenue Mission Control | (none) | THE V2 VISION — Revenue Mission Control | MONEY | (none) | (none) | Heading |
| INV-07358 | THE V2 VISION — Revenue Mission Control | (none) | FIGSY (Outbound) | COMMERCIAL | (none) | (none) | FIGSY (Outbound) · Leads Pipeline · Intelligence |
| INV-07359 | THE V2 VISION — Revenue Mission Control | (none) | Emails sent today | COMMERCIAL | (none) | (none) | Emails sent today · New leads this week · Milla's top queries |
| INV-07360 | THE V2 VISION — Revenue Mission Control | (none) | Reply rate (live) | COMMERCIAL | (none) | (none) | Reply rate (live) · Hot leads (score 80+) · Vida conversations |
| INV-07361 | THE V2 VISION — Revenue Mission Control | (none) | Active campaigns | RULE | (none) | (none) | Active campaigns · Pending POPIA consent · Anomalies detected |
| INV-07362 | THE V2 VISION — Revenue Mission Control | (none) | Next send due | IDEA | (none) | (none) | Next send due · Deals in HubSpot · Weekly performance |
| INV-07363 | THE AI REVENUE TEAM — Full Roster | (none) | THE AI REVENUE TEAM — Full Roster | MONEY | (none) | (none) | Heading |
| INV-07364 | THE AI REVENUE TEAM — Full Roster | (none) | FIGSY · AI SDR — outbound prospecting + sequences · ✅ Live | IDEA | ✅ | (none) |  |
| INV-07365 | THE AI REVENUE TEAM — Full Roster | (none) | Milla · Virtual Assistant — business knowledge + queries · 🔜 Coming soon | IDEA | (none) | (none) |  |
| INV-07366 | THE AI REVENUE TEAM — Full Roster | (none) | Vida · Chatbot — website inbound qualifier (WhatsApp parked — not a cold channel) · 🔜 Coming soon | IDEA | (none) | (none) |  |
| INV-07367 | THE AI REVENUE TEAM — Full Roster | (none) | REEVE · AI AE — books + runs discovery calls via voice · Year 2 | IDEA | (none) | (none) |  |
| INV-07368 | THE AI REVENUE TEAM — Full Roster | (none) | LENA · AI CS — onboarding, check-ins, churn prevention · Year 2 | IDEA | (none) | (none) |  |
| INV-07369 | THE AI REVENUE TEAM — Full Roster | (none) | OTTO · AI Ops — pipeline analysis, revenue forecasting, anomaly escalation · Year 2 | MONEY | (none) | (none) |  |
| INV-07370 | THE 15 PIECES — What Gets Built and When | (none) | THE 15 PIECES — What Gets Built and When | IDEA | (none) | (none) | Heading |
| INV-07371 | THE 15 PIECES — What Gets Built and When › Piece 1 — Multiple Views of the Leads Pipeline | (none) | Piece 1 — Multiple Views of the Leads Pipeline | COMMERCIAL | (none) | (none) | Heading |
| INV-07372 | THE 15 PIECES — What Gets Built and When › Piece 1 — Multiple Views of the Leads Pipeline | (none) | Trigger: Post 20 clients, Kanban first. | COMMERCIAL | (none) | (none) |  |
| INV-07373 | THE 15 PIECES — What Gets Built and When › Piece 2 — Command Palette (Cmd+K) | (none) | Piece 2 — Command Palette (Cmd+K) | IDEA | (none) | (none) | Heading |
| INV-07374 | THE 15 PIECES — What Gets Built and When › Piece 2 — Command Palette (Cmd+K) | (none) | 1 day core, 2–3 days full command list. | IDEA | (none) | (none) |  |
| INV-07375 | THE 15 PIECES — What Gets Built and When › Piece 3 — Real-Time Activity Feed | (none) | Piece 3 — Real-Time Activity Feed | IDEA | (none) | (none) | Heading |
| INV-07376 | THE 15 PIECES — What Gets Built and When › Piece 3 — Real-Time Activity Feed | (none) | 3 days. Trigger: 10+ active clients. | COMMERCIAL | (none) | (none) |  |
| INV-07377 | THE 15 PIECES — What Gets Built and When › Piece 4 — Notification Centre | (none) | Piece 4 — Notification Centre | IDEA | (none) | (none) | Heading |
| INV-07378 | THE 15 PIECES — What Gets Built and When › Piece 4 — Notification Centre | (none) | 3 days. Build any time. | IDEA | (none) | (none) |  |
| INV-07379 | THE 15 PIECES — What Gets Built and When › Piece 5 — Status Bar (Sidebar Bottom) | (none) | Piece 5 — Status Bar (Sidebar Bottom) | IDEA | (none) | (none) | Heading |
| INV-07380 | THE 15 PIECES — What Gets Built and When › Piece 6 — Custom Fields on Leads | (none) | Piece 6 — Custom Fields on Leads | COMMERCIAL | (none) | (none) | Heading |
| INV-07381 | THE 15 PIECES — What Gets Built and When › Piece 6 — Custom Fields on Leads | (none) | 4–5 days. Trigger: first client requests it. | COMMERCIAL | (none) | (none) |  |
| INV-07382 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | Piece 7 — Visual Automation Builder | IDEA | (none) | (none) | Heading |
| INV-07383 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | Triggers: lead status change, reply received, credits drop below X, ICP run complete. | COMMERCIAL | (none) | (none) |  |
| INV-07384 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | Actions: create HubSpot deal, send Slack notification, pause/resume campaign, run ICP, webhook. | COMMERCIAL | (none) | (none) |  |
| INV-07385 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | Conditions: if/then branching on any field. | IDEA | (none) | (none) |  |
| INV-07386 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | UI: React Flow (used by Linear, Retool, n8n). Execution engine: automations stored as JSON in client_automations ta… | ARCHITECTURE | (none) | (none) |  |
| INV-07387 | THE 15 PIECES — What Gets Built and When › Piece 7 — Visual Automation Builder | (none) | 2–3 weeks V1. Trigger: 50+ clients. | COMMERCIAL | (none) | (none) |  |
| INV-07388 | THE 15 PIECES — What Gets Built and When › Piece 8 — The ICP That Learns Itself | (none) | Piece 8 — The ICP That Learns Itself | IDEA | (none) | (none) | Heading |
| INV-07389 | THE 15 PIECES — What Gets Built and When › Piece 8 — The ICP That Learns Itself | (none) | "Your last 14 replies came from Fintech companies in Lagos, 51–200 employees, HubSpot stack. Your original ICP was … | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-07390 | THE 15 PIECES — What Gets Built and When › Piece 8 — The ICP That Learns Itself | (none) | 2 days. Trigger: 3 months data + 200 emails sent + 20 replies classified. | IDEA | (none) | (none) |  |
| INV-07391 | THE 15 PIECES — What Gets Built and When › Piece 9 — Personalised Images in Emails (from Lemlist) | (none) | Piece 9 — Personalised Images in Emails (from Lemlist) | IDEA | (none) | (none) | Heading |
| INV-07392 | THE 15 PIECES — What Gets Built and When › Piece 10 — Sequence Template Library (from Lemlist) | (none) | Piece 10 — Sequence Template Library (from Lemlist) | IDEA | (none) | (none) | Heading |
| INV-07393 | THE 15 PIECES — What Gets Built and When › Piece 11 — Voice-First Morning Brief | (none) | Piece 11 — Voice-First Morning Brief | IDEA | (none) | (none) | Heading |
| INV-07394 | THE 15 PIECES — What Gets Built and When › Piece 11 — Voice-First Morning Brief | (none) | 1 day. Trigger: after Milla text brief proven — check email open rates first. | IDEA | (none) | (none) |  |
| INV-07395 | THE 15 PIECES — What Gets Built and When › Piece 12 — Network Effect Benchmarks | (none) | Piece 12 — Network Effect Benchmarks | IDEA | (none) | (none) | Heading |
| INV-07396 | THE 15 PIECES — What Gets Built and When › Piece 12 — Network Effect Benchmarks | (none) | 2 days. Trigger: 20+ clients + 3 months reply data. | COMMERCIAL | (none) | (none) |  |
| INV-07397 | THE 15 PIECES — What Gets Built and When › Piece 13 — White-Label / Agency Channel | (none) | Piece 13 — White-Label / Agency Channel | IDEA | (none) | (none) | Heading |
| INV-07398 | THE 15 PIECES — What Gets Built and When › Piece 13 — White-Label / Agency Channel | (none) | 1 week V1. Trigger: first agency partner asks for it. Never build without a waiting customer. | RULE | (none) | (none) |  |
| INV-07399 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | ARCHITECTURE | (none) | (none) | Heading |
| INV-07400 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | The most strategically interesting piece on this list. | IDEA | (none) | (none) |  |
| INV-07401 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | What it is: MCP (Model Context Protocol) is Anthropic's open standard that lets AI assistants connect directly to e… | RULE | (none) | (none) |  |
| INV-07402 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | "Find me 20 CTOs at fintech companies in Lagos with 50–200 employees." | IDEA | (none) | (none) | Blockquote |
| INV-07403 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | "Every Monday, find 50 new leads matching this profile and enroll them in FIGSY sequence 3." | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07404 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Tools the MCP server would expose | IDEA | (none) | (none) |  |
| INV-07405 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | search_leads · Run an ICP search — returns scored, POPIA-filtered contacts | RULE | (none) | (none) |  |
| INV-07406 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | get_leads · Fetch existing leads with filters | COMMERCIAL | (none) | (none) |  |
| INV-07407 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | create_icp · Create a new ICP profile | IDEA | (none) | (none) |  |
| INV-07408 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | run_icp · Trigger an ICP job | IDEA | (none) | (none) |  |
| INV-07409 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | get_figsy_stats | COMMERCIAL | (none) | (none) | get_figsy_stats · FIGSY campaign performance — sent, opens, replies, interested |
| INV-07410 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | enroll_lead · Enroll a lead in a FIGSY sequence | COMMERCIAL | (none) | (none) |  |
| INV-07411 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | pause_campaign | COMMERCIAL | (none) | (none) | pause_campaign · Pause / resume a campaign |
| INV-07412 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | get_credit_balance | IDEA | (none) | (none) | get_credit_balance · Check credits remaining |
| INV-07413 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | get_top_leads | COMMERCIAL | (none) | (none) | get_top_leads · Return highest-scored leads this week |
| INV-07414 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Why this is strategic | IDEA | (none) | (none) |  |
| INV-07415 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Anthropic MCP directory — companies that list early get visibility to every Claude user. A K.I.N.D MCP listed there… | COMMERCIAL | (none) | (none) |  |
| INV-07416 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Agency/developer adoption — agencies building AI sales workflows need a lead gen layer. K.I.N.D's MCP becomes that … | COMMERCIAL | (none) | (none) |  |
| INV-07417 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Milla uses it internally — when Milla is built, she calls the K.I.N.D MCP. Same tools external developers use. Buil… | IDEA | (none) | (none) |  |
| INV-07418 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | New pricing tier — API/MCP access as a developer tier. Higher ARPU than standard client | MONEY | (none) | (none) |  |
| INV-07419 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Two revenue streams — K.I.N.D sells outcomes to founders AND sells infrastructure to builders | MONEY | (none) | (none) |  |
| INV-07420 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Build time: 3–5 days for solid V1. | IDEA | (none) | (none) |  |
| INV-07421 | THE 15 PIECES — What Gets Built and When › Piece 14 — MCP Server (K.I.N.D as AI Infrastructure) | (none) | Trigger: 20+ paying clients. Core loop proven. Say the word. | COMMERCIAL | (none) | (none) |  |
| INV-07422 | THE 15 PIECES — What Gets Built and When › Piece 15 — Mobile App (PWA First) | (none) | Piece 15 — Mobile App (PWA First) | IDEA | (none) | (none) | Heading |
| INV-07423 | THE 15 PIECES — What Gets Built and When › Piece 15 — Mobile App (PWA First) | (none) | 2 days for PWA. Trigger: build alongside notification centre. | IDEA | (none) | (none) |  |
| INV-07424 | THE BUILD ORDER | (none) | THE BUILD ORDER | IDEA | (none) | (none) | Heading |
| INV-07425 | THE BUILD ORDER | (none) | Now · Post 20 clients · Status bar (4hrs), Notification centre (3 days), Sequence template library (Piece 10) | COMMERCIAL | (none) | (none) |  |
| INV-07426 | THE BUILD ORDER | (none) | Phase 2 · Month 3–4 · Kanban view (Piece 1), Command palette (Piece 2), Template library | IDEA | (none) | (none) |  |
| INV-07427 | THE BUILD ORDER | (none) | Phase 3 · Month 5–6 · Real-time activity feed (Piece 3), Score heatmap, Personalised images (Piece 9) | IDEA | (none) | (none) |  |
| INV-07428 | THE BUILD ORDER | (none) | Phase 4 · Month 7–9 · ICP intelligence (Piece 8), Benchmarks (Piece 12), Job change alerts, MCP server (Piece 14) | IDEA | (none) | (none) |  |
| INV-07429 | THE BUILD ORDER | (none) | Phase 5 · Month 10–12 · Visual automation builder (Piece 7), LinkedIn DM step | IDEA | (none) | (none) |  |
| INV-07430 | THE BUILD ORDER | (none) | Phase 6 · Year 2 Q1 · White-label / Agency (Piece 13), PWA (Piece 15), Voice brief (Piece 11) | IDEA | (none) | (none) |  |
| INV-07431 | THE BUILD ORDER | (none) | Year 2+ · 2027 · REEVE, LENA, OTTO, Native app, Intent data layer | IDEA | (none) | (none) |  |
| INV-07432 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | THE COMMUNITY PLAY — Start Now, Costs Nothing | MONEY | (none) | (none) | Heading |
| INV-07433 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | Become the go-to resource for B2B outreach in Africa. Nobody owns that space. | COMMERCIAL | (none) | (none) |  |
| INV-07434 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | "How to do B2B cold outreach in South Africa without breaking POPIA" | OPERATING | (none) | (none) |  |
| INV-07435 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | "Best industries to target for B2B sales in Nigeria right now" | COMMERCIAL | (none) | (none) |  |
| INV-07436 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | "Why your cold email gets no replies — and how to fix it" | OPERATING | (none) | (none) |  |
| INV-07437 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | "Apollo vs K.I.N.D — when to use each" | IDEA | (none) | (none) |  |
| INV-07438 | THE COMMUNITY PLAY — Start Now, Costs Nothing | (none) | "What a 9% reply rate looks like — real FIGSY campaign breakdown" | COMMERCIAL | (none) | (none) |  |
| INV-07439 | PRODUCT ENTRIES — Full Detail | (none) | PRODUCT ENTRIES — Full Detail | IDEA | (none) | (none) | Heading |
| INV-07440 | 2. ClickUp | (none) | 2. ClickUp | IDEA | (none) | (none) | Heading |
| INV-07441 | 2. ClickUp | (none) | URL: https://clickup.com | IDEA | (none) | (none) |  |
| INV-07442 | 2. ClickUp | (none) | Category: Project management SaaS | IDEA | (none) | (none) |  |
| INV-07443 | 2. ClickUp | (none) | Status: ✅ Design system built into K.I.N.D portal and website | IDEA | ✅ | (none) |  |
| INV-07444 | 2. ClickUp › What We Borrowed | (none) | What We Borrowed | IDEA | (none) | (none) | Heading |
| INV-07445 | 2. ClickUp › What We Borrowed | (none) | Dark, premium, animated website | IDEA | (none) | (none) |  |
| INV-07446 | 2. ClickUp › What We Borrowed | (none) | Hero with product demo / animated screenshot | IDEA | (none) | (none) |  |
| INV-07447 | 2. ClickUp › What We Borrowed | (none) | "How it works" showing actual UI | IDEA | (none) | (none) |  |
| INV-07448 | 2. ClickUp › What We Borrowed | (none) | Social proof — logos, numbers, client quotes | COMMERCIAL | (none) | (none) |  |
| INV-07449 | 2. ClickUp › What We Borrowed | (none) | Feature sections with scroll animation | IDEA | (none) | (none) |  |
| INV-07450 | 2. ClickUp › What We Borrowed | (none) | Strong CTA contrast throughout | IDEA | (none) | (none) |  |
| INV-07451 | 2. ClickUp › What We Borrowed | (none) | Partner channel model | COMMERCIAL | (none) | (none) |  |
| INV-07452 | 2. ClickUp › What We Borrowed | (none) | Standard published pricing (no custom deals) | MONEY | (none) | (none) |  |
| INV-07453 | 2. ClickUp › What We Borrowed | (none) | Commission-based referral programme | MONEY | (none) | (none) |  |
| INV-07454 | 2. ClickUp › What We Borrowed | (none) | Partners positioned as trusted resellers, not order-takers | COMMERCIAL | (none) | (none) |  |
| INV-07455 | 2. ClickUp › What We Borrowed | (none) | UI Patterns (to build in portal — see Pieces 1-5 above) | IDEA | (none) | (none) |  |
| INV-07456 | 2. ClickUp › What We Borrowed | (none) | Command palette (Cmd+K) | IDEA | (none) | (none) |  |
| INV-07457 | 2. ClickUp › What We Borrowed | (none) | Multiple views (Kanban, timeline, heatmap) | IDEA | (none) | (none) |  |
| INV-07458 | 2. ClickUp › What We Borrowed | (none) | Real-time activity feed | IDEA | (none) | (none) |  |
| INV-07459 | 2. ClickUp › What We Borrowed | (none) | Status bar always visible in sidebar | RULE | (none) | (none) |  |
| INV-07460 | 2. ClickUp › What We Didn't Take | (none) | What We Didn't Take | IDEA | (none) | (none) | Heading |
| INV-07461 | 2. ClickUp › What We Didn't Take | (none) | Their complexity (ClickUp is notoriously overwhelming) — KIND stays simple | IDEA | (none) | (none) |  |
| INV-07462 | 2. ClickUp › What We Didn't Take | (none) | Their pricing tier sprawl — KIND has 3 tiers max | MONEY | (none) | (none) |  |
| INV-07463 | 3. Lemlist | (none) | 3. Lemlist | IDEA | (none) | (none) | Heading |
| INV-07464 | 3. Lemlist | (none) | URL: https://lemlist.com | IDEA | (none) | (none) |  |
| INV-07465 | 3. Lemlist | (none) | Category: Email outreach platform | COMMERCIAL | (none) | (none) |  |
| INV-07466 | 3. Lemlist | (none) | Status: Core sequence engine ✅ Built / Personalised images 🟡 Phase 3 / Template library 🟡 Phase 2 / Community play … | IDEA | ✅ 🟡 | (none) |  |
| INV-07467 | 3. Lemlist › What We Borrowed | (none) | What We Borrowed | IDEA | (none) | (none) | Heading |
| INV-07468 | 3. Lemlist › What We Borrowed | (none) | Sequence engine — multi-step outreach with personalisation ✅ Built (legacy 3-step; being rebuilt to the 4–6-step Ap… | COMMERCIAL | ✅ | (none) |  |
| INV-07469 | 3. Lemlist › What We Borrowed | (none) | Reply handling — when a reply comes in, pause the sequence, notify the client ✅ Built | COMMERCIAL | ✅ | (none) |  |
| INV-07470 | 3. Lemlist › What We Borrowed | (none) | Campaign-level reporting — open rate, reply rate, interested vs not interested ✅ Built | COMMERCIAL | ✅ | (none) |  |
| INV-07471 | 3. Lemlist › What We Borrowed | (none) | Personalisation variables — {{firstName}}, {{company}} in templates ✅ Built | IDEA | ✅ | (none) |  |
| INV-07472 | 3. Lemlist › What We Borrowed | (none) | Template library by ICP — pre-built sequences per profile type 🟡 Phase 2 (Piece 10) | IDEA | 🟡 | (none) |  |
| INV-07473 | 3. Lemlist › What We Borrowed | (none) | Personalised images — dynamically generated image per prospect 🟡 Phase 3 (Piece 9) | IDEA | 🟡 | (none) |  |
| INV-07474 | 3. Lemlist › What We Exploit (Their Gap) | (none) | What We Exploit (Their Gap) | IDEA | (none) | (none) | Heading |
| INV-07475 | 3. Lemlist › What We Exploit (Their Gap) | (none) | Lemlist is a tool — you still have to write the emails and manage replies manually | IDEA | (none) | (none) |  |
| INV-07476 | 3. Lemlist › What We Exploit (Their Gap) | (none) | FIGSY writes the emails AND drafts the replies for approval | GATE | (none) | (none) |  |
| INV-07477 | 3. Lemlist › What We Exploit (Their Gap) | (none) | Lemlist = $59/mo just for the sending tool. KIND = per qualified lead (from $1 reveal), full AI SDR included | MONEY | (none) | (none) |  |
| INV-07478 | 3. Lemlist › What We Exploit (Their Gap) | (none) | No African contact coverage. No POPIA compliance. (Note: we bill USD — "ZAR billing" is no longer a KIND advantage.… | MONEY | (none) | (none) |  |
| INV-07479 | 3. Lemlist › What We Don't Build (Their Feature) | (none) | What We Don't Build (Their Feature) | IDEA | (none) | (none) | Heading |
| INV-07480 | 3. Lemlist › What We Don't Build (Their Feature) | (none) | Multi-channel LinkedIn automation — against LinkedIn ToS. Decision locked. Not building. | RULE | (none) | (none) |  |
| INV-07481 | 4. Instantly | (none) | 4. Instantly | IDEA | (none) | (none) | Heading |
| INV-07482 | 4. Instantly | (none) | URL: https://instantly.ai | IDEA | (none) | (none) |  |
| INV-07483 | 4. Instantly | (none) | Category: Cold email at scale | IDEA | (none) | (none) |  |
| INV-07484 | 4. Instantly | (none) | Status: ✅ Fully implemented | IDEA | ✅ | (none) |  |
| INV-07485 | 4. Instantly › What We Borrowed | (none) | What We Borrowed | IDEA | (none) | (none) | Heading |
| INV-07486 | 4. Instantly › What We Borrowed | (none) | Domain warming mindset — FIGSY_DAILY_SEND_LIMIT env var, starts at 20/day ✅ Built | IDEA | ✅ | (none) |  |
| INV-07487 | 4. Instantly › What We Borrowed | (none) | Campaign auto-pause on low performance — daily cron pauses <1% reply rate campaigns ✅ Built | COMMERCIAL | ✅ | (none) |  |
| INV-07488 | 4. Instantly › What We Borrowed | (none) | Volume-based thinking — 20 → 50 → 150 → 500+ emails/day progression ✅ Built | IDEA | ✅ | (none) |  |
| INV-07489 | 4. Instantly › What We Exploit (Their Gap) | (none) | What We Exploit (Their Gap) | IDEA | (none) | (none) | Heading |
| INV-07490 | 4. Instantly › What We Exploit (Their Gap) | (none) | Instantly requires you to source your own leads — KIND provides them | COMMERCIAL | (none) | (none) |  |
| INV-07491 | 4. Instantly › What We Exploit (Their Gap) | (none) | No AI reply handling — KIND's FIGSY reads replies and responds | IDEA | (none) | (none) |  |
| INV-07492 | 4. Instantly › What We Exploit (Their Gap) | (none) | African market: zero focus, zero local data. KIND is built for ZA/NG/KE/GH. | COMMERCIAL | (none) | (none) |  |
| INV-07493 | 5. Clay | (none) | 5. Clay | IDEA | (none) | (none) | Heading |
| INV-07494 | 5. Clay | (none) | Category: Data enrichment + ICP building | IDEA | (none) | (none) |  |
| INV-07495 | 5. Clay | (none) | Status: ✅ Fully implemented | IDEA | ✅ | (none) |  |
| INV-07496 | 5. Clay › What We Borrowed | (none) | What We Borrowed | IDEA | (none) | (none) | Heading |
| INV-07497 | 5. Clay › What We Borrowed | (none) | Multi-source enrichment fallback — Apollo 3-pass search (full ICP → remove consent filter → remove size filter) ✅ B… | RULE | ✅ | (none) |  |
| INV-07498 | 5. Clay › What We Borrowed | (none) | ICP as a filter system — layer filters (industry, title, size, seniority) not just keyword search ✅ Built | IDEA | ✅ | (none) |  |
| INV-07499 | 5. Clay › What We Borrowed | (none) | Waterfall enrichment — best source first, fall back on failure ✅ Built | RISK | ✅ | (none) |  |
| INV-07500 | 5. Clay › What We Exploit (Their Gap) | (none) | What We Exploit (Their Gap) | IDEA | (none) | (none) | Heading |
| INV-07501 | 5. Clay › What We Exploit (Their Gap) | (none) | Clay is a power-user tool — requires technical knowledge to set up | IDEA | (none) | (none) |  |
| INV-07502 | 5. Clay › What We Exploit (Their Gap) | (none) | $149–800/mo just for enrichment. KIND includes enrichment + outreach + management. | MONEY | (none) | (none) |  |
| INV-07503 | 5. Clay › What We Exploit (Their Gap) | (none) | No African contact coverage. Our multi-source waterfall (PDL discovery + Hunter + stack; Apollo BYOK) covers Africa… | ARCHITECTURE | (none) | (none) |  |
| INV-07504 | 6. Apollo | (none) | 6. Apollo | IDEA | (none) | (none) | Heading |
| INV-07505 | 6. Apollo | (none) | URL: https://app.apollo.io | IDEA | (none) | (none) |  |
| INV-07506 | 6. Apollo | (none) | Category: Lead data + sequences | COMMERCIAL | (none) | (none) |  |
| INV-07507 | 6. Apollo | (none) | Studied: Ongoing — Apollo is an optional BYOK source (primary sourcing = PDL Full + Hunter) | IDEA | (none) | (none) |  |
| INV-07508 | 6. Apollo | (none) | Status: ✅ Integrated (free plan → upgrade after client 1) | IDEA | ✅ | (none) |  |
| INV-07509 | 6. Apollo › Our Relationship with Apollo | (none) | Our Relationship with Apollo | IDEA | (none) | (none) | Heading |
| INV-07510 | 6. Apollo › What We Learn From Apollo (to build) | (none) | What We Learn From Apollo (to build) | IDEA | (none) | (none) | Heading |
| INV-07511 | 6. Apollo › What We Learn From Apollo (to build) | (none) | Job change alerts → badge on lead cards, auto-prioritise in FIGSY (Phase 4) | COMMERCIAL | (none) | (none) |  |
| INV-07512 | 6. Apollo › What We Learn From Apollo (to build) | (none) | Sequence analytics → reply rate by day of week, best send time by industry (Phase 4) | IDEA | (none) | (none) |  |
| INV-07513 | 6. Apollo › What We Learn From Apollo (to build) | (none) | AI transparency → show why FIGSY wrote the email the way it did (Phase 3) | IDEA | (none) | (none) |  |
| INV-07514 | 6. Apollo › What We Learn From Apollo (to build) | (none) | Intent signals → companies researching your category — requires Bombora data (~$2k/mo, Year 2) | MONEY | (none) | (none) |  |
| INV-07515 | 6. Apollo › The Strategic Reality | (none) | The Strategic Reality | IDEA | (none) | (none) | Heading |
| INV-07516 | 1. Apex (apex.host) | (none) | 1. Apex (apex.host) | IDEA | (none) | (none) | Heading |
| INV-07517 | 1. Apex (apex.host) | (none) | URL: https://apex.host | IDEA | (none) | (none) |  |
| INV-07518 | 1. Apex (apex.host) | (none) | Founded by: Dan Martell (SaaS Academy) | IDEA | (none) | (none) |  |
| INV-07519 | 1. Apex (apex.host) | (none) | Status: 🟡 Actions pending — copy framing to adopt | IDEA | 🟡 | (none) |  |
| INV-07520 | 1. Apex (apex.host) › What It Does | (none) | What It Does | IDEA | (none) | (none) | Heading |
| INV-07521 | 1. Apex (apex.host) › What It Does | (none) | Stack: Self-hosted, multi-channel (Slack, email, WhatsApp, voice), 88,000+ lines of custom code, approval mode → gr… | ARCHITECTURE | (none) | (none) |  |
| INV-07522 | 1. Apex (apex.host) › Their Positioning | (none) | Their Positioning | IDEA | (none) | (none) | Heading |
| INV-07523 | 1. Apex (apex.host) › Their Positioning | (none) | "Your personal AI that runs 24/7" | IDEA | (none) | (none) |  |
| INV-07524 | 1. Apex (apex.host) › Their Positioning | (none) | "Scale your output without scaling your team" | IDEA | (none) | (none) |  |
| INV-07525 | 1. Apex (apex.host) › Their Positioning | (none) | Framed as a digital twin, not a tool | IDEA | (none) | (none) |  |
| INV-07526 | 1. Apex (apex.host) › Their Positioning | (none) | Dan Martell's personal brand is the distribution engine | IDEA | (none) | (none) |  |
| INV-07527 | 1. Apex (apex.host) › Their Positioning | (none) | Pricing: Unknown — likely $500–1,000+/mo. No public pricing (waitlist only). | MONEY | (none) | (none) |  |
| INV-07528 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | K.I.N.D vs Apex | IDEA | (none) | (none) | Heading |
| INV-07529 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Target customer | IDEA | (none) | (none) | Target customer · African B2B SMBs (5–50 people) · Global SaaS founders |
| INV-07530 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Core job · Find leads, run outreach, book meetings · Run founder's entire workflow | COMMERCIAL | (none) | (none) |  |
| INV-07531 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Delivery model | IDEA | (none) | (none) | Delivery model · SaaS (we run everything) · Self-hosted (they run it) |
| INV-07532 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Price point · $1–3/credit + from $20/mo · ~$500–1,000+/mo (est.) | MONEY | (none) | (none) |  |
| INV-07533 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Barrier to entry | IDEA | (none) | (none) | Barrier to entry · Low — signup today · High — waitlist + technical setup |
| INV-07534 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | African market | COMMERCIAL | ✅ ❌ | (none) | African market · ✅ Built for it · ❌ No African focus |
| INV-07535 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Lead generation | COMMERCIAL | ✅ ❌ | (none) | Lead generation · ✅ Core product · ❌ Not a lead gen tool |
| INV-07536 | 1. Apex (apex.host) › K.I.N.D vs Apex | (none) | Outreach SDR · ✅ FIGSY handles replies, sequences, memory · ❌ No SDR function | COMMERCIAL | ✅ ❌ | (none) |  |
| INV-07537 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | What We Borrow (Actions Pending) | IDEA | (none) | (none) | Heading |
| INV-07538 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | 1. "Acts, doesn't just respond" framing | IDEA | (none) | (none) |  |
| INV-07539 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | "AI-powered lead generation" | COMMERCIAL | (none) | (none) | "AI-powered lead generation" · "FIGSY finds the lead, writes the email, handles the reply, and books the meeting — you just show u… |
| INV-07540 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | "Virtual assistant" | COMMERCIAL | (none) | (none) | "Virtual assistant" · "Milla runs your morning brief, answers client questions, and drafts everything — before you've had coffee." |
| INV-07541 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | "Chatbot agent" | IDEA | (none) | (none) | "Chatbot agent" · "Vida qualifies every website visitor 24/7 and alerts you when someone's ready to buy." |
| INV-07542 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | 2. Approval mode → autonomy expansion | GATE | (none) | (none) |  |
| INV-07543 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | 3. The digital twin angle | IDEA | (none) | (none) |  |
| INV-07544 | 1. Apex (apex.host) › What We Borrow (Actions Pending) | (none) | 4. Founder as product demo | IDEA | (none) | (none) |  |
| INV-07545 | 1. Apex (apex.host) › Actions | (none) | Actions | IDEA | (none) | (none) | Heading |
| INV-07546 | 1. Apex (apex.host) › Actions | (none) | [ ] Rewrite homepage hero copy using "acts" framing | IDEA | (none) | (none) |  |
| INV-07547 | 1. Apex (apex.host) › Actions | (none) | [ ] Add "You're in control" autonomy messaging to portal onboarding | IDEA | (none) | (none) |  |
| INV-07548 | 1. Apex (apex.host) › Actions | (none) | [ ] Reframe Milla as "AI Chief of Staff" on website | IDEA | (none) | (none) |  |
| INV-07549 | 1. Apex (apex.host) › Actions | (none) | [ ] LinkedIn post: show yourself using KIND as a founder | IDEA | (none) | (none) |  |

## `docs/RECORDING-SHOOTING-SCRIPT.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Recording / shooting script · **Lines:** 235 · **Material items in this source:** 169 · **Rows in this part:** 169 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07550 | 🎬 K.I.N.D — Master Recording Bible (capture once → cut everything) | (none) | 🎬 K.I.N.D — Master Recording Bible (capture once → cut everything) | COMMERCIAL | (none) | (none) | Heading |
| INV-07551 | 🎬 K.I.N.D — Master Recording Bible (capture once → cut everything) | #607 | HISTORICAL — this script says "Start free" and predates the 1-Aug retirement of the trial (#607). Signup now writes… | MONEY | ⚠️ | 6 Aug | Blockquote |
| INV-07552 | 🎬 K.I.N.D — Master Recording Bible (capture once → cut everything) | (none) | The method: record the whole platform once, screen by screen, in the order a real client lives it (login → finish),… | COMMERCIAL | (none) | (none) |  |
| INV-07553 | 🎬 K.I.N.D — Master Recording Bible (capture once → cut everything) | (none) | Chosen defaults (flip any of these any time): scope = client-facing journey + Command Centre (dev/MCP/marketplace s… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07554 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | COMMERCIAL | (none) | (none) | Heading |
| INV-07555 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | Cold open (5–8s) — hybrid: graphic animated logo + a one-line hook by default; your face (one clean window-lit shot… | COMMERCIAL | (none) | (none) |  |
| INV-07556 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | Title card + music sting — K.I.N.D logo animates in + "Drop 0X · [episode title]". Reuse the same template + same m… | COMMERCIAL | (none) | (none) |  |
| INV-07557 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | The demo — the scripted scenes below. | COMMERCIAL | (none) | (none) |  |
| INV-07558 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | Outro card — logo + "Start free · get-kind.com" + music tail. | COMMERCIAL | (none) | (none) |  |
| INV-07559 | 🎞️ THE SHOW SHELL (the same wrapper on every video — this is what makes it a "series") | (none) | Production line we hold: Glean's polish sells enterprise; our edge is authentic "real run-through" for African SMBs… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-07560 | 🛠️ Tools & setup | (none) | 🛠️ Tools & setup | COMMERCIAL | (none) | (none) | Heading |
| INV-07561 | 🛠️ Tools & setup | (none) | Record: Screen Studio (auto-zoom + smooth cursor). Voiceover + cleanup: Descript (Studio Sound). 9:16 + captions + … | COMMERCIAL | (none) | (none) |  |
| INV-07562 | 🛠️ Tools & setup | (none) | Audio = biggest quality lever: USB mic (Samson Q2U / Blue Yeti) or wired earbuds in a quiet, soft room → clean with… | COMMERCIAL | (none) | (none) |  |
| INV-07563 | 🛠️ Tools & setup | (none) | Pre-flight every session: demo account (/demo-login) · notifications OFF · hide bookmarks/extensions · browser zoom… | COMMERCIAL | (none) | (none) |  |
| INV-07564 | 🛠️ Tools & setup | (none) | Capture discipline: one scene at a time, 2s of stillness at start/end (clean cut points), slow deliberate cursor, s… | COMMERCIAL | (none) | (none) |  |
| INV-07565 | 🎥 THE CAPTURE — journey-ordered, screen by screen | (none) | 🎥 THE CAPTURE — journey-ordered, screen by screen | COMMERCIAL | (none) | (none) | Heading |
| INV-07566 | SECTION 1 — ONBOARD (signup → welcome → setup) | (none) | SECTION 1 — ONBOARD (signup → welcome → setup) | COMMERCIAL | (none) | (none) | Heading |
| INV-07567 | SECTION 1 — ONBOARD (signup → welcome → setup) | (none) | 6-beat: Small businesses can't afford a sales team (problem). So the owner sells between jobs — late nights, cold l… | MONEY | (none) | (none) | Blockquote |
| INV-07568 | SECTION 1 — ONBOARD (signup → welcome → setup) | (none) | ⚙️ RECORDING NOTE (updated 28 Jun — read first): the old /v2/ preview routes (/v2/signup, /v2/welcome, /v2/setup, /… | COMMERCIAL | (none) | 28 Jun | Blockquote |
| INV-07569 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.1 — Sign up + accept terms (~7s) | (none) | Scene 1.1 — Sign up + accept terms (~7s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07570 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.1 — Sign up + accept terms (~7s) | (none) | SCREEN: get-kind.com → Start free → the real signup form | COMMERCIAL | (none) | (none) |  |
| INV-07571 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.1 — Sign up + accept terms (~7s) | (none) | PAIN: "Hiring a salesperson takes months and thousands a month." | COMMERCIAL | 🔴 | (none) |  |
| INV-07572 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.1 — Sign up + accept terms (~7s) | (none) | RECORD: type a business email → tick "I agree to the Terms & Conditions and Privacy Policy" (required — no account … | RULE | (none) | (none) |  |
| INV-07573 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.1 — Sign up + accept terms (~7s) | (none) | SAY: "No hire, no contract — tick the terms, and you're in, in seconds." | COMMERCIAL | (none) | (none) |  |
| INV-07574 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.2 — Guided setup (the REAL thing) (~12s) — LIVE (/onboard) | (none) | Scene 1.2 — Guided setup (the REAL thing) (~12s) — LIVE (/onboard) | COMMERCIAL | (none) | (none) | Heading |
| INV-07575 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.2 — Guided setup (the REAL thing) (~12s) — LIVE (/onboard) | (none) | PAIN: "Setup wizards are forms you abandon." | COMMERCIAL | 🔴 | (none) |  |
| INV-07576 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.2 — Guided setup (the REAL thing) (~12s) — LIVE (/onboard) | (none) | RECORD: the /onboard conversation — it asks for your website, scans it, and pre-fills your ICP automatically (type … | COMMERCIAL | (none) | (none) |  |
| INV-07577 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.2 — Guided setup (the REAL thing) (~12s) — LIVE (/onboard) | (none) | SAY: "It walks you through it — give it your website, it reads your business and builds your targeting for you. One… | OPERATING | (none) | (none) |  |
| INV-07578 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.3 — Meet your AI sales team (~8s) — LIVE (/dashboard) | (none) | Scene 1.3 — Meet your AI sales team (~8s) — LIVE (/dashboard) | COMMERCIAL | (none) | (none) | Heading |
| INV-07579 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.3 — Meet your AI sales team (~8s) — LIVE (/dashboard) | (none) | PAIN: "New tools usually dump you on an empty dashboard." | COMMERCIAL | 🔴 | (none) |  |
| INV-07580 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.3 — Meet your AI sales team (~8s) — LIVE (/dashboard) | (none) | RECORD: the dashboard home — the agent grid (FIGSY · Milla · Vida · Denise) with where-to-start | COMMERCIAL | (none) | (none) |  |
| INV-07581 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.3 — Meet your AI sales team (~8s) — LIVE (/dashboard) | (none) | SAY: "K.I.N.D meets you with your AI sales team — FIGSY, Milla, Vida and Denise — and shows you exactly where to st… | COMMERCIAL | (none) | (none) |  |
| INV-07582 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.4 — Your agreements, on record (~6s) | (none) | Scene 1.4 — Your agreements, on record (~6s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07583 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.4 — Your agreements, on record (~6s) | (none) | SCREEN: Account menu → Documents (/dashboard/documents) — ⚠️ moved to the Account/profile menu (no longer under Mil… | COMMERCIAL | ⚠️ | (none) |  |
| INV-07584 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.4 — Your agreements, on record (~6s) | (none) | PAIN: "With most tools you never see what you actually agreed to." | RULE | 🔴 | (none) |  |
| INV-07585 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.4 — Your agreements, on record (~6s) | (none) | RECORD: open the page — show "Agreement on record" + the Terms / Privacy / DPA (read-only — no contract to sign; ac… | RULE | (none) | (none) |  |
| INV-07586 | SECTION 1 — ONBOARD (signup → welcome → setup) › Scene 1.4 — Your agreements, on record (~6s) | (none) | SAY: "No contract to sign — you tick the terms at sign-up, and it's recorded automatically when you buy. All here, … | RULE | (none) | (none) |  |
| INV-07587 | SECTION 2 — TARGET (your ideal buyer) | (none) | SECTION 2 — TARGET (your ideal buyer) | IDEA | (none) | (none) | Heading |
| INV-07588 | SECTION 2 — TARGET (your ideal buyer) | (none) | 6-beat: You know roughly who you sell to — but turning that into a real list is the hard part (problem). Owners gue… | MONEY | (none) | (none) | Blockquote |
| INV-07589 | SECTION 2 — TARGET (your ideal buyer) › Scene 2.1 — Conversational ICP builder (~14s) | (none) | Scene 2.1 — Conversational ICP builder (~14s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07590 | SECTION 2 — TARGET (your ideal buyer) › Scene 2.1 — Conversational ICP builder (~14s) | (none) | SCREEN: /dashboard/leads/icp/builder | COMMERCIAL | (none) | (none) |  |
| INV-07591 | SECTION 2 — TARGET (your ideal buyer) › Scene 2.1 — Conversational ICP builder (~14s) | (none) | PAIN: "Most 'targeting' is a guess and a bought list." | COMMERCIAL | 🔴 | (none) |  |
| INV-07592 | SECTION 2 — TARGET (your ideal buyer) › Scene 2.1 — Conversational ICP builder (~14s) | (none) | RECORD: type "We sell bookkeeping software to small retailers in South Africa" → let it ask one smart follow-up → r… | COMMERCIAL | (none) | (none) |  |
| INV-07593 | SECTION 2 — TARGET (your ideal buyer) › Scene 2.1 — Conversational ICP builder (~14s) | (none) | SAY: "Tell it who you sell to in plain English. It asks the right follow-ups and builds a real ideal-customer profi… | IDEA | (none) | (none) |  |
| INV-07594 | SECTION 3 — SOURCE (real, scored leads) | (none) | SECTION 3 — SOURCE (real, scored leads) | COMMERCIAL | (none) | (none) | Heading |
| INV-07595 | SECTION 3 — SOURCE (real, scored leads) | (none) | 6-beat: Finding contacts means hours in spreadsheets and LinkedIn (problem/pain). And you still don't know who's wo… | MONEY | (none) | (none) | Blockquote |
| INV-07596 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.1 — It thinks (~6s) — LIVE (capture during a real run) | (none) | Scene 3.1 — It thinks (~6s) — LIVE (capture during a real run) | COMMERCIAL | (none) | (none) | Heading |
| INV-07597 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.1 — It thinks (~6s) — LIVE (capture during a real run) | (none) | SCREEN: /dashboard/leads/icp/builder → Find leads — the thinking/loading state shows live while it sources (no sepa… | COMMERCIAL | (none) | (none) |  |
| INV-07598 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.1 — It thinks (~6s) — LIVE (capture during a real run) | (none) | RECORD: kick off a run and capture the thinking state as it sources; don't touch | COMMERCIAL | (none) | (none) |  |
| INV-07599 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.1 — It thinks (~6s) — LIVE (capture during a real run) | (none) | SAY: "It goes hunting across millions of contacts." | COMMERCIAL | (none) | (none) |  |
| INV-07600 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.2 — Scored leads (~10s) | (none) | Scene 3.2 — Scored leads (~10s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07601 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.2 — Scored leads (~10s) | (none) | SCREEN: /dashboard/leads (then /dashboard/leads/overview) | COMMERCIAL | (none) | (none) |  |
| INV-07602 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.2 — Scored leads (~10s) | (none) | PAIN: "A raw list tells you nothing about who to call first." | COMMERCIAL | 🔴 | (none) |  |
| INV-07603 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.2 — Scored leads (~10s) | (none) | RECORD: slow-scroll the list; show the 0–100 scores | COMMERCIAL | (none) | (none) |  |
| INV-07604 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.2 — Scored leads (~10s) | (none) | SAY: "Real leads, scored zero to a hundred, POPIA-compliant — in minutes, not days." | RULE | (none) | (none) |  |
| INV-07605 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.3 — Why this lead (~8s) | (none) | Scene 3.3 — Why this lead (~8s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07606 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.3 — Why this lead (~8s) | (none) | SCREEN: click one lead → score reasoning | COMMERCIAL | (none) | (none) |  |
| INV-07607 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.3 — Why this lead (~8s) | (none) | RECORD: open a lead; zoom the reasoning | COMMERCIAL | (none) | (none) |  |
| INV-07608 | SECTION 3 — SOURCE (real, scored leads) › Scene 3.3 — Why this lead (~8s) | (none) | SAY: "And it tells you why each one fits — so you trust the list." | COMMERCIAL | (none) | (none) |  |
| INV-07609 | SECTION 4 — OUTREACH (FIGSY writes & sends) | (none) | SECTION 4 — OUTREACH (FIGSY writes & sends) | COMMERCIAL | (none) | (none) | Heading |
| INV-07610 | SECTION 4 — OUTREACH (FIGSY writes & sends) | (none) | 6-beat: Even with a list, someone has to write and send — every email, personalised (problem). Owners don't, so lea… | MONEY | (none) | (none) | Blockquote |
| INV-07611 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.1 — Launch a campaign (~10s) | (none) | Scene 4.1 — Launch a campaign (~10s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07612 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.1 — Launch a campaign (~10s) | (none) | SCREEN: /dashboard/figsy → New campaign → /dashboard/figsy/[id] | COMMERCIAL | (none) | (none) |  |
| INV-07613 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.1 — Launch a campaign (~10s) | (none) | PAIN: "Writing a unique email to every lead? Nobody has the time." | COMMERCIAL | 🔴 | (none) |  |
| INV-07614 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.1 — Launch a campaign (~10s) | (none) | RECORD: set the intent; the multi-step sequence auto-drafts | COMMERCIAL | (none) | (none) |  |
| INV-07615 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.1 — Launch a campaign (~10s) | (none) | SAY: "Give FIGSY the goal — it writes a personalised multi-step sequence for every lead." | COMMERCIAL | (none) | (none) |  |
| INV-07616 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.2 — Why FIGSY wrote this (~8s) | (none) | Scene 4.2 — Why FIGSY wrote this (~8s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07617 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.2 — Why FIGSY wrote this (~8s) | (none) | SCREEN: /dashboard/figsy/[id] → "why FIGSY wrote this" | COMMERCIAL | (none) | (none) |  |
| INV-07618 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.2 — Why FIGSY wrote this (~8s) | (none) | RECORD: show the personalisation hooks on Step 1 | OPERATING | (none) | (none) |  |
| INV-07619 | SECTION 4 — OUTREACH (FIGSY writes & sends) › Scene 4.2 — Why FIGSY wrote this (~8s) | (none) | SAY: "No black box — it shows you why it wrote each line. Review, tweak, activate." | MONEY | (none) | (none) |  |
| INV-07620 | SECTION 5 — RESPOND (replies, sorted) | (none) | SECTION 5 — RESPOND (replies, sorted) | COMMERCIAL | (none) | (none) | Heading |
| INV-07621 | SECTION 5 — RESPOND (replies, sorted) | #1 | 6-beat: Replies come in at all hours, mixed with noise (problem). Owners miss the hot ones or reply too late (pain)… | MONEY | (none) | (none) | Blockquote |
| INV-07622 | SECTION 5 — RESPOND (replies, sorted) › Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | (none) | Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07623 | SECTION 5 — RESPOND (replies, sorted) › Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | (none) | SCREEN: /dashboard/figsy/replies (and /dashboard/inbox) | COMMERCIAL | (none) | (none) |  |
| INV-07624 | SECTION 5 — RESPOND (replies, sorted) › Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | (none) | PAIN: "Interested replies get buried under out-of-offices and opt-outs." | RULE | 🔴 | (none) |  |
| INV-07625 | SECTION 5 — RESPOND (replies, sorted) › Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | (none) | RECORD: show replies sorted hot / interested / opt-out; open a hot one → show the "Meeting booked" event (FIGSY boo… | RULE | (none) | (none) |  |
| INV-07626 | SECTION 5 — RESPOND (replies, sorted) › Scene 5.1 — Classified replies → FIGSY books the meeting (~12s) | (none) | SAY: "Every reply comes back classified — the hot ones rise to the top. And when a prospect says yes, FIGSY books t… | COMMERCIAL | (none) | (none) |  |
| INV-07627 | SECTION 6 — CLOSE (Denise takes the booked meeting) | (none) | SECTION 6 — CLOSE (Denise takes the booked meeting) | COMMERCIAL | (none) | (none) | Heading |
| INV-07628 | SECTION 6 — CLOSE (Denise takes the booked meeting) | (none) | 6-beat: A booked meeting isn't a closed deal (problem). After the call, the owner forgets to follow up, handle the … | MONEY | (none) | (none) | Blockquote |
| INV-07629 | SECTION 6 — CLOSE (Denise takes the booked meeting) › Scene 6.1 — Denise closes (~10s) | (none) | Scene 6.1 — Denise closes (~10s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07630 | SECTION 6 — CLOSE (Denise takes the booked meeting) › Scene 6.1 — Denise closes (~10s) | (none) | SCREEN: /dashboard/denise (and /dashboard/proposals) | COMMERCIAL | (none) | (none) |  |
| INV-07631 | SECTION 6 — CLOSE (Denise takes the booked meeting) › Scene 6.1 — Denise closes (~10s) | (none) | PAIN: "The follow-up that wins the deal is the one you never send." | RULE | 🔴 | (none) |  |
| INV-07632 | SECTION 6 — CLOSE (Denise takes the booked meeting) › Scene 6.1 — Denise closes (~10s) | (none) | RECORD: show Denise's warm follow-up + a drafted proposal (post-meeting — she does NOT book; FIGSY already did that… | COMMERCIAL | (none) | (none) |  |
| INV-07633 | SECTION 6 — CLOSE (Denise takes the booked meeting) › Scene 6.1 — Denise closes (~10s) | (none) | SAY: "Once the meeting's booked, Denise takes over — handles objections, drafts the proposal, and follows up so the… | RULE | (none) | (none) |  |
| INV-07634 | SECTION 7 — INTELLIGENCE (Milla + your numbers) | (none) | SECTION 7 — INTELLIGENCE (Milla + your numbers) | COMMERCIAL | (none) | (none) | Heading |
| INV-07635 | SECTION 7 — INTELLIGENCE (Milla + your numbers) | (none) | 6-beat: Owners fly blind — no idea what's working (problem). So they repeat what doesn't and stop what does (pain).… | MONEY | (none) | (none) | Blockquote |
| INV-07636 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.1 — Ask Milla anything (~8s) | (none) | Scene 7.1 — Ask Milla anything (~8s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07637 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.1 — Ask Milla anything (~8s) | (none) | SCREEN: /dashboard/assistant | COMMERCIAL | (none) | (none) |  |
| INV-07638 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.1 — Ask Milla anything (~8s) | (none) | RECORD: ask Milla a business question → she answers in plain language; show the "based on your documents" source ch… | COMMERCIAL | (none) | (none) |  |
| INV-07639 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.1 — Ask Milla anything (~8s) | (none) | SAY: "Milla answers business questions in plain language — and the more of your own documents you give her, the sha… | COMMERCIAL | (none) | (none) |  |
| INV-07640 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.2 — Live results (~8s) | (none) | Scene 7.2 — Live results (~8s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07641 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.2 — Live results (~8s) | (none) | SCREEN: /dashboard/analytics (and /dashboard/kpis) | COMMERCIAL | (none) | (none) |  |
| INV-07642 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.2 — Live results (~8s) | (none) | PAIN: "You can't improve what you can't see." | COMMERCIAL | 🔴 | (none) |  |
| INV-07643 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.2 — Live results (~8s) | (none) | RECORD: show reply rate / pipeline numbers updating | COMMERCIAL | (none) | (none) |  |
| INV-07644 | SECTION 7 — INTELLIGENCE (Milla + your numbers) › Scene 7.2 — Live results (~8s) | (none) | SAY: "Your results update live — so you always know what's converting." | RULE | (none) | (none) |  |
| INV-07645 | SECTION 8 — SCALE (Command Centre · per-rep) | (none) | SECTION 8 — SCALE (Command Centre · per-rep) | COMMERCIAL | (none) | (none) | Heading |
| INV-07646 | SECTION 8 — SCALE (Command Centre · per-rep) | (none) | 6-beat: One person can only do so much (problem). Hire reps and you're back to managing humans, tools, and chaos (p… | MONEY | (none) | (none) | Blockquote |
| INV-07647 | SECTION 8 — SCALE (Command Centre · per-rep) › Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | (none) | Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | IDEA | ⚠️ | (none) | Heading |
| INV-07648 | SECTION 8 — SCALE (Command Centre · per-rep) › Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | (none) | SCREEN: /dashboard/company (and /dashboard/team) — ⚠️ reachable by URL but it's empty without a seeded company (ite… | IDEA | ⚠️ | (none) |  |
| INV-07649 | SECTION 8 — SCALE (Command Centre · per-rep) › Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | (none) | PAIN: "Managing a sales team means chasing reps for updates." | COMMERCIAL | 🔴 | (none) |  |
| INV-07650 | SECTION 8 — SCALE (Command Centre · per-rep) › Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | (none) | RECORD: show seats, per-rep stats, budgets, request→approve | COMMERCIAL | (none) | (none) |  |
| INV-07651 | SECTION 8 — SCALE (Command Centre · per-rep) › Scene 8.1 — Command Centre (~10s) — ⚠️ needs a provisioned demo company | (none) | SAY: "Got a team? Give every rep their own AI, set budgets, see everything from one screen. Level up your whole tea… | COMMERCIAL | (none) | (none) |  |
| INV-07652 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) | (none) | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) | MONEY | (none) | (none) | Heading |
| INV-07653 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) | (none) | 6-beat: Tools nickel-and-dime you for seats whether they work or not (problem/pain). You pay for software, not resu… | MONEY | (none) | (none) | Blockquote |
| INV-07654 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | (none) | Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | MONEY | (none) | (none) | Heading |
| INV-07655 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | (none) | SCREEN: /dashboard/billing | MONEY | (none) | (none) |  |
| INV-07656 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | (none) | PAIN: "Per-seat tools charge you whether they work or not." | COMMERCIAL | 🔴 | (none) |  |
| INV-07657 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | (none) | RECORD: show the credit panel (Lead-Gen + FIGSY pools); tick "I agree to the Terms of Service" before buying credit… | MONEY | (none) | (none) |  |
| INV-07658 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.1 — Outcome billing (+ pay-time terms) (~9s) | (none) | SAY: "You pay for outcomes — one credit, one positive reply, no reply no charge. Agree to the terms at checkout, an… | COMMERCIAL | (none) | (none) |  |
| INV-07659 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.2 — Knowledge (~6s) — ⛔ CUT for now (coming-soon) | (none) | Scene 9.2 — Knowledge (~6s) — ⛔ CUT for now (coming-soon) | COMMERCIAL | (none) | (none) | Heading |
| INV-07660 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.2 — Knowledge (~6s) — ⛔ CUT for now (coming-soon) | (none) | SCREEN: ~~/dashboard/knowledge~~ — this page is a "coming soon" teaser (training not live, item 74). Do NOT record … | COMMERCIAL | ~~ | (none) |  |
| INV-07661 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.2 — Knowledge (~6s) — ⛔ CUT for now (coming-soon) | (none) | (If you need a 9.2 filler, use Milla's Documents/knowledge upload on /dashboard/assistant instead, which is real.) | COMMERCIAL | (none) | (none) |  |
| INV-07662 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.3 — Integrations (~6s) | (none) | Scene 9.3 — Integrations (~6s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07663 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.3 — Integrations (~6s) | (none) | SCREEN: /dashboard/integrations | COMMERCIAL | (none) | (none) |  |
| INV-07664 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.3 — Integrations (~6s) | (none) | RECORD: show CRM / calendar connections | COMMERCIAL | (none) | (none) |  |
| INV-07665 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.3 — Integrations (~6s) | (none) | SAY: "Plugs into your CRM and calendar — fits the way you already work." | COMMERCIAL | (none) | (none) |  |
| INV-07666 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.4 — Settings (~5s) | (none) | Scene 9.4 — Settings (~5s) | COMMERCIAL | (none) | (none) | Heading |
| INV-07667 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.4 — Settings (~5s) | (none) | SCREEN: /dashboard/settings | COMMERCIAL | (none) | (none) |  |
| INV-07668 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.4 — Settings (~5s) | (none) | RECORD: quick pan of controls | COMMERCIAL | (none) | (none) |  |
| INV-07669 | SECTION 9 — RUN IT (billing · knowledge · integrations · settings) › Scene 9.4 — Settings (~5s) | (none) | SAY: "You stay in control of everything." | COMMERCIAL | (none) | (none) |  |
| INV-07670 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | ✂️ THE ASSEMBLY — which clips cut into which video | COMMERCIAL | (none) | (none) | Heading |
| INV-07671 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Deliverable · Scenes used · Notes | COMMERCIAL | (none) | (none) |  |
| INV-07672 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Recording 1 — Full demo (3–4 min) | COMMERCIAL | (none) | (none) | Recording 1 — Full demo (3–4 min) · all sections 1→9, in order · the master; everything else is a subset |
| INV-07673 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Drop 01 (60s) | COMMERCIAL | (none) | (none) | Drop 01 (60s) · 1.1 · 2.1 · 3.1 · 3.2 · 4.1 · 5.1 · 6.1 · the tight core loop |
| INV-07674 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Onboarding Looms (3) | COMMERCIAL | (none) | (none) | Onboarding Looms (3) · Loom A = 1.1–1.4 · Loom B = 4.1–4.2 · Loom C = 5.1 + 7.2 + 9.1 · casual, friendly |
| INV-07675 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Social cuts (9:16) | COMMERCIAL | (none) | (none) | Social cuts (9:16) · Hook 1 = 2.1+3.2 · Hook 2 = 4.1+5.1+6.1 · Hook 3 = 9.1 · Hook 4 = 8.1 · captions, hook in 2s |
| INV-07676 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Per-agent · FIGSY = 4.1+4.2 · Milla = 7.1 · Vida = (record Vida widget) · Denise = 6.1 · + a 10–15s close-up each | COMMERCIAL | (none) | (none) |  |
| INV-07677 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | Per-vertical (estate/insurance/financial) | COMMERCIAL | (none) | (none) | Per-vertical (estate/insurance/financial) · re-shoot 2.1 only with that vertical's buyer typed in → splice into the loop · 1 fresh… |
| INV-07678 | ✂️ THE ASSEMBLY — which clips cut into which video | (none) | vs-competitor (apollo/outreach/salesloft/etc.) | COMMERCIAL | (none) | (none) | vs-competitor (apollo/outreach/salesloft/etc.) · 2.1+3.2+4.1+5.1 + a comparison caption frame · same footage, comparison framing |
| INV-07679 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | COMMERCIAL | (none) | (none) | Heading |
| INV-07680 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | The trick: you only re-shoot Scene 2.1 (the ICP builder) per vertical — type that buyer in, record ~12s. Everything… | COMMERCIAL | (none) | (none) |  |
| INV-07681 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | Vertical (page) | COMMERCIAL | 🔴 | (none) | Vertical (page) · Type this into 2.1 (ICP builder) · 🔴 PAIN line · SAY (the vertical hook) |
| INV-07682 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | Estate agents (for-estate-agents) | COMMERCIAL | (none) | (none) | Estate agents (for-estate-agents) · "We're an estate agency — I want homeowners likely to sell in the next 6 months in [area]." · … |
| INV-07683 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | Insurance brokers (for-insurance-brokers) | RULE | (none) | (none) | Insurance brokers (for-insurance-brokers) · "We're an insurance broker — small business owners who need cover." · "Renewals and re… |
| INV-07684 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | Financial advisers (for-financial-advisers) | COMMERCIAL | (none) | (none) | Financial advisers (for-financial-advisers) · "We're a financial adviser — professionals aged 35–55 planning for retirement." · "Y… |
| INV-07685 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | ⚡ Electrician (playbook) | COMMERCIAL | (none) | (none) | ⚡ Electrician (playbook) · "Property managers and building ops in buildings 10+ years old." · "Aging buildings need you — but you'… |
| INV-07686 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | 🚰 Plumber (playbook) | COMMERCIAL | (none) | (none) | 🚰 Plumber (playbook) · "Homeowners with homes 30+ years old, owned 5+ years." · "The big replacement jobs go to whoever the homeow… |
| INV-07687 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | ❄️ HVAC (playbook) | MONEY | (none) | (none) | ❄️ HVAC (playbook) · "Homeowners with HVAC systems 8+ years old." · "Revenue's seasonal; you're feast-or-famine." · "K.I.N.D finds… |
| INV-07688 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | 📸 Photographer (playbook) | COMMERCIAL | (none) | (none) | 📸 Photographer (playbook) · "Recently engaged couples, age 25–45, in [area]." · "Couples book the first photographer who reaches o… |
| INV-07689 | 🧩 VERTICAL RE-SHOOT LIBRARY (the SMB market — one ICP take each) | (none) | 🔐 Locksmith (playbook) | COMMERCIAL | (none) | (none) | 🔐 Locksmith (playbook) · "Property managers running 10+ multi-unit buildings." · "Lockouts are reactive; the recurring money is B2… |
| INV-07690 | 📅 ONGOING — THE DROP & THE PODCAST (record this every release, forever) | (none) | 📅 ONGOING — THE DROP & THE PODCAST (record this every release, forever) | COMMERCIAL | (none) | (none) | Heading |
| INV-07691 | 📅 ONGOING — THE DROP & THE PODCAST (record this every release, forever) | (none) | Everything above is the one-time launch capture. THIS is the repeatable engine: every meaningful feature ship = one… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-07692 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | A) THE DROP — per-release highlight reel (60–90s, screen-led) | COMMERCIAL | (none) | (none) | Heading |
| INV-07693 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | When: every meaningful release. Drop 02 · 03 · 04… | COMMERCIAL | (none) | (none) |  |
| INV-07694 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | Structure (pain → solution, every time) | COMMERCIAL | (none) | (none) |  |
| INV-07695 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | Cold-open + title card — "Drop 0X · [feature name]" + music sting | COMMERCIAL | (none) | (none) |  |
| INV-07696 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | The problem it kills — one line (the old/manual pain) | COMMERCIAL | 🔴 | (none) |  |
| INV-07697 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | The feature in action — 2–3 screens in Screen Studio (the new thing working) | COMMERCIAL | (none) | (none) |  |
| INV-07698 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | The outcome + "Live today · get-kind.com" | COMMERCIAL | (none) | (none) |  |
| INV-07699 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | Reusable script skeleton (fill the blanks) | COMMERCIAL | (none) | (none) |  |
| INV-07700 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | "Until now, [the pain]." | COMMERCIAL | (none) | (none) |  |
| INV-07701 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | "New in K.I.N.D — [feature]: [one line on what it does]." → show it | COMMERCIAL | (none) | (none) |  |
| INV-07702 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | "Now you [the outcome]. Live today." | COMMERCIAL | (none) | (none) |  |
| INV-07703 | A) THE DROP — per-release highlight reel (60–90s, screen-led) | (none) | Repurpose (one ship = 3+ pieces): the reel → The Drop page (drop-0X) + LinkedIn post + email. | COMMERCIAL | (none) | (none) |  |
| INV-07704 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | B) THE PODCAST — "Working AI"-style interview / panel | COMMERCIAL | (none) | (none) | Heading |
| INV-07705 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Format: founder + 1 guest (a client, a partner, or a team member). Conversation, not a monologue. | COMMERCIAL | (none) | (none) |  |
| INV-07706 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Episode rundown (template) | COMMERCIAL | (none) | (none) |  |
| INV-07707 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Cold-open + title — "K.I.N.D · Drop 0X" + music (show shell) | COMMERCIAL | (none) | (none) |  |
| INV-07708 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Hook (30s) — "This drop we shipped [X] — here's why it matters." | COMMERCIAL | (none) | (none) |  |
| INV-07709 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Conversation (3–6 min) — why we built it · the problem it solves · a real client story | COMMERCIAL | (none) | (none) |  |
| INV-07710 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | ▶️ Cut to the Drop reel — the highlight reel from (A) plays here | COMMERCIAL | (none) | (none) |  |
| INV-07711 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Back to discussion — what it unlocks / what's next | COMMERCIAL | (none) | (none) |  |
| INV-07712 | B) THE PODCAST — "Working AI"-style interview / panel | (none) | Production (solo-friendly): record remote guests in Riverside.fm (separate high-quality local tracks + auto-caption… | COMMERCIAL | (none) | (none) |  |
| INV-07713 | 🔓 Decisions to lock when you're ready (flagged, not blocking) | (none) | 🔓 Decisions to lock when you're ready (flagged, not blocking) | COMMERCIAL | (none) | (none) | Heading |
| INV-07714 | 🔓 Decisions to lock when you're ready (flagged, not blocking) | (none) | Cadence: podcast per-drop, or monthly? | COMMERCIAL | (none) | (none) |  |
| INV-07715 | 🔓 Decisions to lock when you're ready (flagged, not blocking) | (none) | Panel: founder solo · + guest · + client each time? | COMMERCIAL | (none) | (none) |  |
| INV-07716 | 🔓 Decisions to lock when you're ready (flagged, not blocking) | (none) | Host tool: Riverside vs Zoom-record vs in-person? | COMMERCIAL | (none) | (none) |  |
| INV-07717 | 🔓 Decisions to lock when you're ready (flagged, not blocking) › Recording order (do it in this sequence) | (none) | Recording order (do it in this sequence) | COMMERCIAL | (none) | (none) | Heading |
| INV-07718 | 🔓 Decisions to lock when you're ready (flagged, not blocking) › Recording order (do it in this sequence) | (none) | Capture Sections 1→9 once (drop in the onboarding mockups for 1.2–1.3) → that is the full demo → then cut Drop 01 →… | COMMERCIAL | (none) | (none) |  |

## `docs/strategy/MASTER_CONTEXT.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Strategy master context · **Lines:** 713 · **Material items in this source:** 224 · **Rows in this part:** 224 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07719 | K.I.N.D — Master Conversation Handoff for Fable | (none) | K.I.N.D — Master Conversation Handoff for Fable | COMMERCIAL | (none) | (none) | Heading |
| INV-07720 | K.I.N.D — Master Conversation Handoff for Fable | (none) | Purpose: preserve the substantive product, compliance, legal, trust, operating and website decisions from the ChatG… | OPERATING | (none) | 19 August |  |
| INV-07721 | K.I.N.D — Master Conversation Handoff for Fable | (none) | Important: this is a comprehensive reconstructed handoff, not a byte-for-byte export of the ChatGPT UI transcript. … | OPERATING | (none) | (none) |  |
| INV-07722 | K.I.N.D — Master Conversation Handoff for Fable | (none) | Operating rule for Fable: READ / VERIFY / CHALLENGE first. Do not build or alter code, docs, website, infrastructur… | RULE | (none) | (none) |  |
| INV-07723 | 1. Company / launch context | (none) | 1. Company / launch context | COMMERCIAL | (none) | (none) | Heading |
| INV-07724 | 1. Company / launch context | (none) | First live clients matter more than broad feature parity. | COMMERCIAL | (none) | (none) |  |
| INV-07725 | 1. Company / launch context | (none) | First ~10 clients are deliberately used to expose edge cases / “bad eggs”. | COMMERCIAL | (none) | (none) |  |
| INV-07726 | 1. Company / launch context | (none) | Vida autonomy is not to be rushed before that learning period. | COMMERCIAL | (none) | (none) |  |
| INV-07727 | 1. Company / launch context | (none) | CRM expansion, Social Intent, larger autonomy, Meeting Graph and AI-to-AI buyer introductions are post-launch capab… | COMMERCIAL | (none) | (none) |  |
| INV-07728 | 2. Product characters / operating model | (none) | 2. Product characters / operating model | COMMERCIAL | (none) | (none) | Heading |
| INV-07729 | 2. Product characters / operating model | (none) | MILLA understands the client. FIGSY understands what should happen. VIDA makes it happen. YOU set the rules. | COMMERCIAL | (none) | (none) |  |
| INV-07730 | 2. Product characters / operating model › Milla | (none) | Milla | COMMERCIAL | (none) | (none) | Heading |
| INV-07731 | 2. Product characters / operating model › Milla | (none) | “Meet Milla. Your pipeline, handled.” | COMMERCIAL | (none) | (none) |  |
| INV-07732 | 2. Product characters / operating model › Milla | (none) | “An AI agent that finds the people worth meeting and books them into your calendar.” | COMMERCIAL | (none) | (none) |  |
| INV-07733 | 2. Product characters / operating model › Milla | (none) | Simpler internal test: “Milla books my meetings.” | OPERATING | (none) | (none) |  |
| INV-07734 | 2. Product characters / operating model › FIGSY | (none) | FIGSY | COMMERCIAL | (none) | (none) | Heading |
| INV-07735 | 2. Product characters / operating model › FIGSY | (none) | CAN WE legally/contractually do it? | RULE | (none) | (none) |  |
| INV-07736 | 2. Product characters / operating model › FIGSY | (none) | What confidence do we have? | COMMERCIAL | (none) | (none) |  |
| INV-07737 | 2. Product characters / operating model › FIGSY | (none) | Did the action eventually create MEETING_BOOKED? | COMMERCIAL | (none) | (none) |  |
| INV-07738 | 2. Product characters / operating model › Vida | (none) | Vida | COMMERCIAL | (none) | (none) | Heading |
| INV-07739 | 2. Product characters / operating model › Vida | (none) | Vida autonomous inside approved policy. | COMMERCIAL | (none) | (none) |  |
| INV-07740 | 3. Verified product/code foundations discussed | (none) | 3. Verified product/code foundations discussed | COMMERCIAL | (none) | (none) | Heading |
| INV-07741 | 3. Verified product/code foundations discussed | (none) | Internal company/lead pool is served first at zero incremental data cost; remaining sourcing uses providers under a… | MONEY | (none) | (none) |  |
| INV-07742 | 3. Verified product/code foundations discussed | (none) | PDL + Hunter are the day-to-day production sourcing stack in the latest ledger; Apollo is optional/BYO, Clearbit op… | OPERATING | (none) | (none) |  |
| INV-07743 | 3. Verified product/code foundations discussed | (none) | Employer-floor suppression exists and is checked in sourcing/send paths. | COMMERCIAL | (none) | (none) |  |
| INV-07744 | 3. Verified product/code foundations discussed | (none) | Claude/Haiku scores leads 0–100 and stores a one-sentence reason. | COMMERCIAL | (none) | (none) |  |
| INV-07745 | 3. Verified product/code foundations discussed | (none) | Approval causes the per-lead commercial charge where applicable; unusable email is not charged/reversed according t… | GATE | (none) | (none) |  |
| INV-07746 | 3. Verified product/code foundations discussed | (none) | Enrolment includes kill switch, DNC, CRM duplicate control and UK PECR logic. | COMMERCIAL | (none) | (none) |  |
| INV-07747 | 3. Verified product/code foundations discussed | (none) | Client SMTP/mailbox is used; warming mailbox is protected; sequence caps exist. | COMMERCIAL | (none) | (none) |  |
| INV-07748 | 3. Verified product/code foundations discussed | (none) | RFC8058 unsubscribe + STOP/body opt-out routes converge into a global suppression structure. | RULE | (none) | (none) |  |
| INV-07749 | 3. Verified product/code foundations discussed | (none) | Replies are stored/classified; risky replies are escalated; AI-drafted replies are human-approved today. | RISK | (none) | (none) |  |
| INV-07750 | 3. Verified product/code foundations discussed | (none) | Calendar booking is genuinely wired to Google, with event creation and meeting attribution. | COMMERCIAL | (none) | (none) |  |
| INV-07751 | 3. Verified product/code foundations discussed | (none) | Tenant isolation includes a Nexus guard and RLS as a second layer. | COMMERCIAL | (none) | (none) |  |
| INV-07752 | 3. Verified product/code foundations discussed | (none) | Operator audit structures exist, though the ledger identified best-effort audit behaviour as insufficient for futur… | IDEA | (none) | (none) |  |
| INV-07753 | 3. Verified product/code foundations discussed | (none) | Signed document snapshots exist for some governed documentation. | COMMERCIAL | (none) | (none) |  |
| INV-07754 | 4. Global compliance architecture developed in the conversation | (none) | 4. Global compliance architecture developed in the conversation | ARCHITECTURE | (none) | (none) | Heading |
| INV-07755 | 4. Global compliance architecture developed in the conversation | (none) | US → evaluate US rules | COMMERCIAL | (none) | (none) |  |
| INV-07756 | 4. Global compliance architecture developed in the conversation | (none) | UK → evaluate UK rules | COMMERCIAL | (none) | (none) |  |
| INV-07757 | 4. Global compliance architecture developed in the conversation | (none) | all other jurisdictions → HOLD | COMMERCIAL | (none) | (none) |  |
| INV-07758 | 4. Global compliance architecture developed in the conversation | (none) | unknown country → HOLD / REVIEW | COMMERCIAL | (none) | (none) |  |
| INV-07759 | 5. High-severity current compliance / trust defects tracked in the latest Ledger | (none) | 5. High-severity current compliance / trust defects tracked in the latest Ledger | OPERATING | (none) | (none) | Heading |
| INV-07760 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-1 — suppression email normalisation | (none) | HC-1 — suppression email normalisation | COMMERCIAL | (none) | (none) | Heading |
| INV-07761 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-2 — unsubscribe signing secret | (none) | HC-2 — unsubscribe signing secret | COMMERCIAL | (none) | (none) | Heading |
| INV-07762 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-3 — Smartlead bypass | (none) | HC-3 — Smartlead bypass | COMMERCIAL | (none) | (none) | Heading |
| INV-07763 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-4 — dormant consent route | (none) | HC-4 — dormant consent route | RULE | (none) | (none) | Heading |
| INV-07764 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-5 — website data-residency / compliance truth | (none) | HC-5 — website data-residency / compliance truth | RULE | (none) | (none) | Heading |
| INV-07765 | 5. High-severity current compliance / trust defects tracked in the latest Ledger › HC-6 — tracking truth | (none) | HC-6 — tracking truth | COMMERCIAL | (none) | (none) | Heading |
| INV-07766 | 6. UK compliance posture | (none) | 6. UK compliance posture | RULE | (none) | (none) | Heading |
| INV-07767 | 6. UK compliance posture › Channel eligibility / PECR | (none) | Channel eligibility / PECR | COMMERCIAL | (none) | (none) | Heading |
| INV-07768 | 6. UK compliance posture › UK GDPR processing | (none) | UK GDPR processing | RULE | (none) | (none) | Heading |
| INV-07769 | 6. UK compliance posture › UK GDPR processing | (none) | written LIA / legitimate interests assessment; | COMMERCIAL | (none) | (none) |  |
| INV-07770 | 6. UK compliance posture › UK GDPR processing | (none) | Article 14 transparency for indirectly sourced data; | COMMERCIAL | (none) | (none) |  |
| INV-07771 | 6. UK compliance posture › UK GDPR processing | (none) | correct controller/processor role wording; | COMMERCIAL | (none) | (none) |  |
| INV-07772 | 6. UK compliance posture › UK GDPR processing | (none) | rights/erasure process; | COMMERCIAL | (none) | (none) |  |
| INV-07773 | 6. UK compliance posture › UK GDPR processing | (none) | DPIA / accountability evidence where applicable. | COMMERCIAL | (none) | (none) |  |
| INV-07774 | 6. UK compliance posture › UK GDPR processing | (none) | CHANNEL RULE ENFORCED · PROCESSING WORK OPEN | RULE | (none) | (none) |  |
| INV-07775 | 7. US compliance posture | (none) | 7. US compliance posture | RULE | (none) | (none) | Heading |
| INV-07776 | 7. US compliance posture | (none) | accurate routing/header information; | COMMERCIAL | (none) | (none) |  |
| INV-07777 | 7. US compliance posture | (none) | non-deceptive subject lines; | COMMERCIAL | (none) | (none) |  |
| INV-07778 | 7. US compliance posture | (none) | identification as advertising/commercial mail where required; | COMMERCIAL | (none) | (none) |  |
| INV-07779 | 7. US compliance posture | (none) | valid physical postal address; | COMMERCIAL | (none) | (none) |  |
| INV-07780 | 7. US compliance posture | (none) | working opt-out / honoring requests; | RULE | (none) | (none) |  |
| INV-07781 | 7. US compliance posture | (none) | multi-party sender designation across K.I.N.D, the client, the client's mailbox and Smartlead. | COMMERCIAL | (none) | (none) |  |
| INV-07782 | 8. South Africa posture | (none) | 8. South Africa posture | COMMERCIAL | (none) | (none) | Heading |
| INV-07783 | 8. South Africa posture | (none) | Information Officer registration / applicability to the UK entity operating in SA; | COMMERCIAL | (none) | (none) |  |
| INV-07784 | 8. South Africa posture | (none) | PAIA manual applicability/publication; | RULE | (none) | (none) |  |
| INV-07785 | 8. South Africa posture | (none) | POPIA s69 consent-first approach; | RULE | (none) | (none) |  |
| INV-07786 | 8. South Africa posture | (none) | section 72 international transfer basis if data is hosted outside SA; | COMMERCIAL | (none) | (none) |  |
| INV-07787 | 8. South Africa posture | (none) | CPA direct-marketing/cooling-off implications where relevant. | COMMERCIAL | (none) | (none) |  |
| INV-07788 | 9. Controller / processor / data-sharing position | (none) | 9. Controller / processor / data-sharing position | COMMERCIAL | (none) | (none) | Heading |
| INV-07789 | 10. Provider-licence / commercial-data rights — one of the most important external risks | (none) | 10. Provider-licence / commercial-data rights — one of the most important external risks | RISK | (none) | (none) | Heading |
| INV-07790 | 10. Provider-licence / commercial-data rights — one of the most important external risks › PDL | (none) | PDL | COMMERCIAL | (none) | (none) | Heading |
| INV-07791 | 10. Provider-licence / commercial-data rights — one of the most important external risks › PDL | (none) | Treat PDL licence compatibility with cross-client reuse as a contractual launch/client-1 gate until K.I.N.D's actua… | ARCHITECTURE | (none) | (none) |  |
| INV-07792 | 10. Provider-licence / commercial-data rights — one of the most important external risks › Apollo | (none) | Apollo | COMMERCIAL | (none) | (none) | Heading |
| INV-07793 | 10. Provider-licence / commercial-data rights — one of the most important external risks › Hunter / other providers | (none) | Hunter / other providers | COMMERCIAL | (none) | (none) | Heading |
| INV-07794 | 11. Upstream and downstream privacy-right propagation | (none) | 11. Upstream and downstream privacy-right propagation | RULE | (none) | (none) | Heading |
| INV-07795 | 11. Upstream and downstream privacy-right propagation | (none) | source → licence → storage → enrichment → AI processing → tracking → outreach → reply → deletion | COMMERCIAL | (none) | (none) |  |
| INV-07796 | 11. Upstream and downstream privacy-right propagation › Upstream provider rights | (none) | Upstream provider rights | COMMERCIAL | (none) | (none) | Heading |
| INV-07797 | 11. Upstream and downstream privacy-right propagation › Downstream recipients | (none) | Downstream recipients | COMMERCIAL | (none) | (none) | Heading |
| INV-07798 | 11. Upstream and downstream privacy-right propagation › Downstream recipients | (none) | a client's K.I.N.D tenant; | COMMERCIAL | (none) | (none) |  |
| INV-07799 | 11. Upstream and downstream privacy-right propagation › Derived data | (none) | Derived data | COMMERCIAL | (none) | (none) | Heading |
| INV-07800 | 11. Upstream and downstream privacy-right propagation › Derived data | (none) | profiling/inference information; | COMMERCIAL | (none) | (none) |  |
| INV-07801 | 12. Data locations, storage, logs, backups and AI vendors | (none) | 12. Data locations, storage, logs, backups and AI vendors | COMMERCIAL | (none) | (none) | Heading |
| INV-07802 | 12. Data locations, storage, logs, backups and AI vendors | (none) | Supabase primary DB and backups/PITR; | COMMERCIAL | (none) | (none) |  |
| INV-07803 | 12. Data locations, storage, logs, backups and AI vendors | (none) | Anthropic API processing; | ARCHITECTURE | (none) | (none) |  |
| INV-07804 | 12. Data locations, storage, logs, backups and AI vendors | (none) | Smartlead / Instantly; | COMMERCIAL | (none) | (none) |  |
| INV-07805 | 12. Data locations, storage, logs, backups and AI vendors | (none) | PDL / Hunter / Apollo; | COMMERCIAL | (none) | (none) |  |
| INV-07806 | 12. Data locations, storage, logs, backups and AI vendors | (none) | Stripe where relevant; | COMMERCIAL | (none) | (none) |  |
| INV-07807 | 12. Data locations, storage, logs, backups and AI vendors | (none) | application/error logs. | COMMERCIAL | (none) | (none) |  |
| INV-07808 | 13. Sensitive data / field minimisation | (none) | 13. Sensitive data / field minimisation | COMMERCIAL | (none) | (none) | Heading |
| INV-07809 | 13. Sensitive data / field minimisation | (none) | do not intentionally collect/target/infer health; | COMMERCIAL | (none) | (none) |  |
| INV-07810 | 13. Sensitive data / field minimisation | (none) | trade-union membership; | COMMERCIAL | (none) | (none) |  |
| INV-07811 | 13. Sensitive data / field minimisation | (none) | sexual orientation/sex-life; | COMMERCIAL | (none) | (none) |  |
| INV-07812 | 13. Sensitive data / field minimisation | (none) | biometrics/genetic data; | COMMERCIAL | (none) | (none) |  |
| INV-07813 | 13. Sensitive data / field minimisation | (none) | criminal-history information; | COMMERCIAL | (none) | (none) |  |
| INV-07814 | 13. Sensitive data / field minimisation | (none) | or other sensitive categories without an explicit lawful approved use. | COMMERCIAL | (none) | (none) |  |
| INV-07815 | 14. Security / trust evidence | (none) | 14. Security / trust evidence | COMMERCIAL | (none) | (none) | Heading |
| INV-07816 | 14. Security / trust evidence | (none) | tenant isolation / RLS / Nexus fencing; | COMMERCIAL | (none) | (none) |  |
| INV-07817 | 14. Security / trust evidence | (none) | MFA on critical founder/admin accounts; | COMMERCIAL | (none) | (none) |  |
| INV-07818 | 14. Security / trust evidence | (none) | privileged access model; | COMMERCIAL | (none) | (none) |  |
| INV-07819 | 14. Security / trust evidence | (none) | secrets management / encryption; | COMMERCIAL | (none) | (none) |  |
| INV-07820 | 14. Security / trust evidence | (none) | TLS / at-rest controls via providers; | COMMERCIAL | (none) | (none) |  |
| INV-07821 | 14. Security / trust evidence | (none) | backups and restore tests; | OPERATING | (none) | (none) |  |
| INV-07822 | 14. Security / trust evidence | (none) | patching / vulnerability handling; | COMMERCIAL | (none) | (none) |  |
| INV-07823 | 14. Security / trust evidence | (none) | joiner/leaver process; | COMMERCIAL | (none) | (none) |  |
| INV-07824 | 14. Security / trust evidence | (none) | vendor security evidence. | COMMERCIAL | (none) | (none) |  |
| INV-07825 | 15. Trust Room / presentation model | (none) | 15. Trust Room / presentation model | COMMERCIAL | (none) | (none) | Heading |
| INV-07826 | 15. Trust Room / presentation model | (none) | role/data-sharing map; | COMMERCIAL | (none) | (none) |  |
| INV-07827 | 15. Trust Room / presentation model | (none) | rights/SAR/erasure system; | COMMERCIAL | (none) | (none) |  |
| INV-07828 | 15. Trust Room / presentation model | (none) | sensitive-data policy; | COMMERCIAL | (none) | (none) |  |
| INV-07829 | 15. Trust Room / presentation model | (none) | signed subprocessor/vendor contracts; | COMMERCIAL | (none) | (none) |  |
| INV-07830 | 15. Trust Room / presentation model | (none) | K.I.N.D does not say “we are GDPR compliant.” | RULE | (none) | (none) |  |
| INV-07831 | 15. Trust Room / presentation model | (none) | The reusable pool is purchase-only. Client CRM data, replies, Meeting-Brief knowledge, credentials and calendar dat… | COMMERCIAL | (none) | (none) |  |
| INV-07832 | 16. Client-confidential vs reusable data model | (none) | 16. Client-confidential vs reusable data model | COMMERCIAL | (none) | (none) | Heading |
| INV-07833 | 16. Client-confidential vs reusable data model › 1. CLIENT-CONFIDENTIAL | (none) | 1. CLIENT-CONFIDENTIAL | COMMERCIAL | (none) | (none) | Heading |
| INV-07834 | 16. Client-confidential vs reusable data model › 2. K.I.N.D INDEPENDENTLY SOURCED | (none) | 2. K.I.N.D INDEPENDENTLY SOURCED | COMMERCIAL | (none) | (none) | Heading |
| INV-07835 | 16. Client-confidential vs reusable data model › 3. SUPPRESSION / LEGAL EVIDENCE | (none) | 3. SUPPRESSION / LEGAL EVIDENCE | RULE | (none) | (none) | Heading |
| INV-07836 | 16. Client-confidential vs reusable data model › 4. AGGREGATE LEARNING | (none) | 4. AGGREGATE LEARNING | GATE | (none) | (none) | Heading |
| INV-07837 | 17. Retention / accuracy / expiry | (none) | 17. Retention / accuracy / expiry | COMMERCIAL | (none) | (none) | Heading |
| INV-07838 | 18. Website / product positioning history | (none) | 18. Website / product positioning history | COMMERCIAL | (none) | (none) | Heading |
| INV-07839 | 18. Website / product positioning history | (none) | large product demo showing the workflow instead of explaining architecture; | ARCHITECTURE | (none) | (none) |  |
| INV-07840 | 18. Website / product positioning history | (none) | four core cards rather than a feature dump; | COMMERCIAL | (none) | (none) |  |
| INV-07841 | 18. Website / product positioning history | (none) | customer journey focused on finding → approval → conversation → meeting; | GATE | (none) | (none) |  |
| INV-07842 | 18. Website / product positioning history | (none) | “See it happen” showing a prospect card, why-now, approval and MEETING BOOKED; | GATE | (none) | (none) |  |
| INV-07843 | 18. Website / product positioning history | (none) | simple $4 approved-person pricing language; | MONEY | (none) | (none) |  |
| INV-07844 | 18. Website / product positioning history | (none) | no fake proof / placeholder customer stats on the live site; | COMMERCIAL | (none) | (none) |  |
| INV-07845 | 18. Website / product positioning history | (none) | Meeting Brief / calibration copy must not outrun current product capability; | RULE | (none) | (none) |  |
| INV-07846 | 18. Website / product positioning history | (none) | FIGSY should not be introduced early in the homepage story; | COMMERCIAL | (none) | (none) |  |
| INV-07847 | 18. Website / product positioning history | (none) | compliance statements must describe real controls rather than blanket “compliant” claims. | RULE | (none) | (none) |  |
| INV-07848 | 19. Jack & Jill inspiration | (none) | 19. Jack & Jill inspiration | COMMERCIAL | (none) | (none) | Heading |
| INV-07849 | 19. Jack & Jill inspiration | (none) | conversational understanding instead of configuration-heavy ICP setup; | COMMERCIAL | (none) | (none) |  |
| INV-07850 | 19. Jack & Jill inspiration | (none) | a structured living brief; | COMMERCIAL | (none) | (none) |  |
| INV-07851 | 19. Jack & Jill inspiration | (none) | calibration through normal yes/no use; | COMMERCIAL | (none) | (none) |  |
| INV-07852 | 19. Jack & Jill inspiration | (none) | strong signals AND anti-signals; | COMMERCIAL | (none) | (none) |  |
| INV-07853 | 19. Jack & Jill inspiration | (none) | simple public character roles; | COMMERCIAL | (none) | (none) |  |
| INV-07854 | 19. Jack & Jill inspiration | (none) | explainable structured criteria rather than opaque scoring; | COMMERCIAL | (none) | (none) |  |
| INV-07855 | 19. Jack & Jill inspiration | (none) | product demonstrates itself inline. | COMMERCIAL | (none) | (none) |  |
| INV-07856 | 19. Jack & Jill inspiration | (none) | future Meeting Brief as a central living object; | IDEA | (none) | (none) |  |
| INV-07857 | 19. Jack & Jill inspiration | (none) | Milla learns what a good meeting looks like; | COMMERCIAL | (none) | (none) |  |
| INV-07858 | 19. Jack & Jill inspiration | (none) | client sees example prospects and corrects direction; | COMMERCIAL | (none) | (none) |  |
| INV-07859 | 19. Jack & Jill inspiration | (none) | one client can eventually have multiple Missions; | COMMERCIAL | (none) | (none) |  |
| INV-07860 | 19. Jack & Jill inspiration | (none) | future Meeting Graph links source/signal/persona/timing/angle/sequence to MEETING_BOOKED. | IDEA | (none) | (none) |  |
| INV-07861 | 20. Competitive / aggressive business vision | (none) | 20. Competitive / aggressive business vision | IDEA | (none) | (none) | Heading |
| INV-07862 | 20. Competitive / aggressive business vision | (none) | K.I.N.D becomes infrastructure for creating B2B conversations / an Autonomous Meeting Network. | ARCHITECTURE | (none) | (none) |  |
| INV-07863 | 20. Competitive / aggressive business vision | (none) | first 10 clients teach operational edge cases; | COMMERCIAL | (none) | (none) |  |
| INV-07864 | 20. Competitive / aggressive business vision | (none) | Vida becomes bounded Level 3 operator; | COMMERCIAL | (none) | (none) |  |
| INV-07865 | 20. Competitive / aggressive business vision | (none) | partners/resellers become distribution; | COMMERCIAL | (none) | (none) |  |
| INV-07866 | 20. Competitive / aggressive business vision | (none) | Meeting Graph compounds source/signal/campaign/booking learning; | COMMERCIAL | (none) | (none) |  |
| INV-07867 | 20. Competitive / aggressive business vision | (none) | future machine-readable Buyer Pack / Offer Passport; | IDEA | (none) | (none) |  |
| INV-07868 | 20. Competitive / aggressive business vision | (none) | eventual permissioned seller-agent ↔ buyer-agent introductions → human meeting. | COMMERCIAL | (none) | (none) |  |
| INV-07869 | 21. CRM strategy | (none) | 21. CRM strategy | COMMERCIAL | (none) | (none) | Heading |
| INV-07870 | 21. CRM strategy | (none) | CRM remains system of record; | COMMERCIAL | (none) | (none) |  |
| INV-07871 | 21. CRM strategy | (none) | K.I.N.D becomes system of action; | COMMERCIAL | (none) | (none) |  |
| INV-07872 | 21. CRM strategy | (none) | first native integration should lean read-only ingestion/segmentation; | COMMERCIAL | (none) | (none) |  |
| INV-07873 | 21. CRM strategy | (none) | Closed Won can create expansion targeting; | COMMERCIAL | (none) | (none) |  |
| INV-07874 | 21. CRM strategy | (none) | Closed Lost can create re-engagement candidates, but never automatic outreach eligibility; | RULE | (none) | (none) |  |
| INV-07875 | 21. CRM strategy | (none) | all imported/reactivated records must still pass suppression/jurisdiction/channel rules. | MONEY | (none) | (none) |  |
| INV-07876 | 22. Social Intent strategy | (none) | 22. Social Intent strategy | COMMERCIAL | (none) | (none) | Heading |
| INV-07877 | 23. Provider / platform policy considerations | (none) | 23. Provider / platform policy considerations | COMMERCIAL | (none) | (none) | Heading |
| INV-07878 | 23. Provider / platform policy considerations | (none) | PDL actual licence/Order Form for cross-client reuse is a priority legal/commercial check. | RULE | (none) | (none) |  |
| INV-07879 | 23. Provider / platform policy considerations | (none) | Apollo should not feed a reusable commercial pool without explicit written rights. | COMMERCIAL | (none) | (none) |  |
| INV-07880 | 23. Provider / platform policy considerations | (none) | Google Calendar OAuth scopes currently include calendar.events, calendar.readonly, userinfo.email. Fable verified t… | OPERATING | (none) | (none) |  |
| INV-07881 | 23. Provider / platform policy considerations | (none) | Google OAuth verification status should be checked in the Cloud Console before client dependency on the integration… | COMMERCIAL | (none) | (none) |  |
| INV-07882 | 23. Provider / platform policy considerations | (none) | Future social integrations must follow platform rules/authorised APIs. | IDEA | (none) | (none) |  |
| INV-07883 | 24. Client contract / partner contract issues | (none) | 24. Client contract / partner contract issues | COMMERCIAL | (none) | (none) | Heading |
| INV-07884 | 24. Client contract / partner contract issues | (none) | campaign instruction/authority; | COMMERCIAL | (none) | (none) |  |
| INV-07885 | 24. Client contract / partner contract issues | (none) | client's responsibility for product/service claim truth; | COMMERCIAL | (none) | (none) |  |
| INV-07886 | 24. Client contract / partner contract issues | (none) | sender identity/postal-address responsibilities where applicable; | COMMERCIAL | (none) | (none) |  |
| INV-07887 | 24. Client contract / partner contract issues | (none) | duty to relay complaints/opt-outs received outside K.I.N.D; | RULE | (none) | (none) |  |
| INV-07888 | 24. Client contract / partner contract issues | (none) | no suppression override; | COMMERCIAL | (none) | (none) |  |
| INV-07889 | 24. Client contract / partner contract issues | (none) | warranty that client-uploaded data may lawfully be supplied/processed; | COMMERCIAL | (none) | (none) |  |
| INV-07890 | 24. Client contract / partner contract issues | (none) | client termination / data return/delete/retention split; | COMMERCIAL | (none) | (none) |  |
| INV-07891 | 24. Client contract / partner contract issues | (none) | controller/processor/controller-to-controller position by activity; | COMMERCIAL | (none) | (none) |  |
| INV-07892 | 24. Client contract / partner contract issues | (none) | confidentiality and future aggregate-learning boundaries; | GATE | (none) | (none) |  |
| INV-07893 | 24. Client contract / partner contract issues | (none) | what AI may and may not promise/commit. | COMMERCIAL | (none) | (none) |  |
| INV-07894 | 24. Client contract / partner contract issues | (none) | currently partners should not need prospect PII access; | COMMERCIAL | (none) | (none) |  |
| INV-07895 | 24. Client contract / partner contract issues | (none) | sanctions screening of clients/partners on a risk basis; | RISK | (none) | (none) |  |
| INV-07896 | 24. Client contract / partner contract issues | (none) | anti-bribery / conduct policy; | COMMERCIAL | (none) | (none) |  |
| INV-07897 | 24. Client contract / partner contract issues | (none) | no kickbacks, fake testimonials, unapproved discounts/terms, public-official inducements, unapproved subcontracting… | OPERATING | (none) | (none) |  |
| INV-07898 | 24. Client contract / partner contract issues | (none) | commission/rate rules should be governed from one source. | MONEY | (none) | (none) |  |
| INV-07899 | 25. AI authority ceiling | (none) | 25. AI authority ceiling | COMMERCIAL | (none) | (none) | Heading |
| INV-07900 | 25. AI authority ceiling | (none) | INFORMATIONAL — may be autonomous; | COMMERCIAL | (none) | (none) |  |
| INV-07901 | 25. AI authority ceiling | (none) | OPERATIONAL — autonomous inside policy; | COMMERCIAL | (none) | (none) |  |
| INV-07902 | 25. AI authority ceiling | (none) | COMMERCIAL COMMITMENT — human approval; | GATE | (none) | (none) |  |
| INV-07903 | 25. AI authority ceiling | (none) | LEGAL REPRESENTATION — prohibited; | RULE | (none) | (none) |  |
| INV-07904 | 25. AI authority ceiling | (none) | PRICING CHANGE — approval; | MONEY | (none) | (none) |  |
| INV-07905 | 25. AI authority ceiling | (none) | WARRANTY/GUARANTEE — prohibited. | COMMERCIAL | (none) | (none) |  |
| INV-07906 | 26. Privacy-change gate for every future feature | (none) | 26. Privacy-change gate for every future feature | RULE | (none) | (none) | Heading |
| INV-07907 | 27. Latest cross-check corrections to send back to Fable | (none) | 27. Latest cross-check corrections to send back to Fable | OPERATING | (none) | (none) | Heading |
| INV-07908 | 27. Latest cross-check corrections to send back to Fable | (none) | PDL licence compatibility should be escalated. Standard current terms appear potentially incompatible with re-servi… | ARCHITECTURE | (none) | (none) |  |
| INV-07909 | 27. Latest cross-check corrections to send back to Fable | (none) | Apollo data should be hard-provenanced as non-reusable across clients unless a separate written agreement explicitl… | COMMERCIAL | (none) | (none) |  |
| INV-07910 | 27. Latest cross-check corrections to send back to Fable | (none) | Remove the top-line sentence implying that because no outbound was sent, nothing unlawful has happened. Website GA … | DEFECT | (none) | (none) |  |
| INV-07911 | 27. Latest cross-check corrections to send back to Fable | (none) | Prompt 24 should treat privacy/refusal responses provider-specifically. Hunter's 451 claimed_email can become DO-NO… | RULE | (none) | (none) |  |
| INV-07912 | 27. Latest cross-check corrections to send back to Fable | (none) | Controller-to-controller terms must be correct, but a standalone DSA is not necessarily legally mandatory. It can b… | RULE | (none) | (none) |  |
| INV-07913 | 27. Latest cross-check corrections to send back to Fable | (none) | Google OAuth least-privilege conclusion should stay OPEN until broad calendar.readonly is justified versus narrower… | COMMERCIAL | (none) | (none) |  |
| INV-07914 | 27. Latest cross-check corrections to send back to Fable | (none) | Email-pixel wording should be technically precise: assess the implementation under PECR storage/access rules and av… | RULE | (none) | (none) |  |
| INV-07915 | 28. What Fable should treat as launch / client-1 priorities | (none) | 28. What Fable should treat as launch / client-1 priorities | COMMERCIAL | (none) | (none) | Heading |
| INV-07916 | 28. What Fable should treat as launch / client-1 priorities | (none) | HC-1 suppression normalisation; | COMMERCIAL | (none) | (none) |  |
| INV-07917 | 28. What Fable should treat as launch / client-1 priorities | (none) | HC-3 Smartlead compliance bypass before Smartlead unlock; | RULE | (none) | (none) |  |
| INV-07918 | 28. What Fable should treat as launch / client-1 priorities | (none) | C7 human-review fail-open; | COMMERCIAL | (none) | (none) |  |
| INV-07919 | 28. What Fable should treat as launch / client-1 priorities | (none) | US/UK-only allowlist with unknown held; | COMMERCIAL | (none) | (none) |  |
| INV-07920 | 28. What Fable should treat as launch / client-1 priorities | (none) | truthful website claims / HC-5; | COMMERCIAL | (none) | (none) |  |
| INV-07921 | 28. What Fable should treat as launch / client-1 priorities | (none) | HC-6 GA/privacy contradiction and tracking decision; | RULE | (none) | (none) |  |
| INV-07922 | 28. What Fable should treat as launch / client-1 priorities | (none) | Article 14 notice/privacy content; | RULE | (none) | (none) |  |
| INV-07923 | 28. What Fable should treat as launch / client-1 priorities | (none) | provider licence confirmation (especially PDL cross-client pool rights); | COMMERCIAL | (none) | (none) |  |
| INV-07924 | 28. What Fable should treat as launch / client-1 priorities | (none) | provider/data-broker/counsel analysis where applicable; | COMMERCIAL | (none) | (none) |  |
| INV-07925 | 28. What Fable should treat as launch / client-1 priorities | (none) | runtime proof of environment/migrations/integrations; | ARCHITECTURE | (none) | (none) |  |
| INV-07926 | 28. What Fable should treat as launch / client-1 priorities | #1 | Trust Room evidence / client contract role clarity before client #1. | COMMERCIAL | (none) | (none) |  |
| INV-07927 | 29. Source-of-truth hierarchy for Fable | (none) | 29. Source-of-truth hierarchy for Fable | COMMERCIAL | (none) | (none) | Heading |
| INV-07928 | 29. Source-of-truth hierarchy for Fable | (none) | Founder rulings that are explicitly logged/governed. | COMMERCIAL | (none) | (none) |  |
| INV-07929 | 29. Source-of-truth hierarchy for Fable | (none) | Current repository/runtime evidence for what the system actually does. | COMMERCIAL | (none) | (none) |  |
| INV-07930 | 29. Source-of-truth hierarchy for Fable | (none) | Latest 19 August Ledger for the verified map of current state/open work. | OPERATING | (none) | 19 August |  |
| INV-07931 | 29. Source-of-truth hierarchy for Fable | (none) | Current official regulator/vendor terms for external law/platform/licence facts, with counsel for legal interpretat… | RULE | (none) | (none) |  |
| INV-07932 | 29. Source-of-truth hierarchy for Fable | (none) | Generated strategy HTMLs/PDFs for product direction/history, not as proof of current implementation. | COMMERCIAL | (none) | (none) |  |
| INV-07933 | 29. Source-of-truth hierarchy for Fable | (none) | Earlier compliance documents are targets/history where the latest ledger says they are not current-state proof. | OPERATING | (none) | (none) |  |
| INV-07934 | 30. Included artifacts in this bundle | (none) | 30. Included artifacts in this bundle | COMMERCIAL | (none) | (none) | Heading |
| INV-07935 | 30. Included artifacts in this bundle | (none) | all unique K.I.N.D HTML strategy/verification artifacts available in this conversation; | COMMERCIAL | (none) | (none) |  |
| INV-07936 | 30. Included artifacts in this bundle | (none) | PDF versions of those HTMLs; | COMMERCIAL | (none) | (none) |  |
| INV-07937 | 30. Included artifacts in this bundle | (none) | the latest and earlier pasted Fable/source ledgers; | OPERATING | (none) | (none) |  |
| INV-07938 | 30. Included artifacts in this bundle | (none) | compliance V2/V2.1 PDF/DOCX artifacts; | RULE | (none) | (none) |  |
| INV-07939 | 30. Included artifacts in this bundle | (none) | the earlier source PDF about company compliance; | RULE | (none) | (none) |  |
| INV-07940 | 30. Included artifacts in this bundle | (none) | website-preview screenshots; | COMMERCIAL | (none) | (none) |  |
| INV-07941 | 30. Included artifacts in this bundle | (none) | this master conversation handoff; | COMMERCIAL | (none) | (none) |  |
| INV-07942 | 30. Included artifacts in this bundle | (none) | a current cross-check note and artifact manifest. | COMMERCIAL | (none) | (none) |  |

## `docs/strategy/CURRENT_CROSSCHECK.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Strategy current cross-check · **Lines:** 48 · **Material items in this source:** 18 · **Rows in this part:** 18 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07943 | K.I.N.D — Latest Cross-Check After Fable's 19 August Update | (none) | K.I.N.D — Latest Cross-Check After Fable's 19 August Update | OPERATING | (none) | 19 August | Heading |
| INV-07944 | Overall | (none) | Overall | OPERATING | (none) | (none) | Heading |
| INV-07945 | Remaining corrections / refinements | (none) | Remaining corrections / refinements | OPERATING | (none) | (none) | Heading |
| INV-07946 | Remaining corrections / refinements › 1. PDL licence compatibility — escalate | (none) | 1. PDL licence compatibility — escalate | OPERATING | (none) | (none) | Heading |
| INV-07947 | Remaining corrections / refinements › 2. Apollo provenance rule | (none) | 2. Apollo provenance rule | RULE | (none) | (none) | Heading |
| INV-07948 | Remaining corrections / refinements › 3. Remove “nothing unlawful has happened” | (none) | 3. Remove “nothing unlawful has happened” | OPERATING | (none) | (none) | Heading |
| INV-07949 | Remaining corrections / refinements › 3. Remove “nothing unlawful has happened” | (none) | No outbound marketing has yet been sent. This gives K.I.N.D the opportunity to remediate the identified outreach de… | DEFECT | (none) | (none) | Blockquote |
| INV-07950 | Remaining corrections / refinements › 4. Provider-specific privacy events | (none) | 4. Provider-specific privacy events | RULE | (none) | (none) | Heading |
| INV-07951 | Remaining corrections / refinements › 5. Controller-to-controller documentation | (none) | 5. Controller-to-controller documentation | OPERATING | (none) | (none) | Heading |
| INV-07952 | Remaining corrections / refinements › 6. Google OAuth scope minimisation remains open | (none) | 6. Google OAuth scope minimisation remains open | OPERATING | (none) | (none) | Heading |
| INV-07953 | Remaining corrections / refinements › 7. Email-pixel legal wording | (none) | 7. Email-pixel legal wording | RULE | (none) | (none) | Heading |
| INV-07954 | Strong positive findings to preserve | (none) | Strong positive findings to preserve | OPERATING | (none) | (none) | Heading |
| INV-07955 | Strong positive findings to preserve | (none) | The reusable lead_pool is code-proved purchase-only today. | COMMERCIAL | (none) | (none) |  |
| INV-07956 | Strong positive findings to preserve | (none) | Client CRM data, replies, Meeting Brief knowledge, credentials and calendar data do not enter the cross-client pool… | COMMERCIAL | (none) | (none) |  |
| INV-07957 | Strong positive findings to preserve | (none) | Client uploads are client-scoped and already pass meaningful suppression gates before contact. | GATE | (none) | (none) |  |
| INV-07958 | Strong positive findings to preserve | (none) | Nexus/RLS tenant separation is a strong trust foundation. | OPERATING | (none) | (none) |  |
| INV-07959 | Strong positive findings to preserve | (none) | The Trust Room evidence model is the right direction: demonstrate controls/evidence instead of blanket “compliant” … | OPERATING | (none) | (none) |  |
| INV-07960 | Strong positive findings to preserve | (none) | Runtime proof is now correctly separated from code proof in the Opus evidence bar. | OPERATING | (none) | (none) |  |

## `docs/strategy/README.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Strategy folder index · **Lines:** 97 · **Material items in this source:** 40 · **Rows in this part:** 40 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-07961 | 🧭 docs/strategy — the founder's strategy corpus, frozen | (none) | 🧭 docs/strategy — the founder's strategy corpus, frozen | OPERATING | (none) | (none) | Heading |
| INV-07962 | 🧭 docs/strategy — the founder's strategy corpus, frozen | (none) | What this folder is. Twelve files the founder produced with GPT over 8+ hours of product, compliance, legal and web… | RULE | (none) | 20 Aug 2026 | Blockquote |
| INV-07963 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | RULE | ⚠️ | (none) | Heading |
| INV-07964 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | 1 · Founder rulings (logged in PRODUCT-RULES.md) · His decision is the decision | OPERATING | (none) | (none) |  |
| INV-07965 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | 2 · The repository / runtime · What the system actually does, provable at a file and line | OPERATING | (none) | (none) |  |
| INV-07966 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | 3 · The current Ledger / LAUNCH-PAD.md / PRODUCT-INVENTORY.md · The verified map of state and open work | OPERATING | (none) | (none) |  |
| INV-07967 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | 4 · Current regulator / vendor / counsel evidence · External law and licence facts | RULE | (none) | (none) |  |
| INV-07968 | THE SOURCE-OF-TRUTH RULE — read this before quoting anything in here | (none) | 5 · These artifacts · Direction, history, and the specifications the audits run against | OPERATING | (none) | (none) |  |
| INV-07969 | THEY ARE FROZEN, AND DELIBERATELY NOT DOC-LINTED | (none) | THEY ARE FROZEN, AND DELIBERATELY NOT DOC-LINTED | OPERATING | ⚠️ | (none) | Heading |
| INV-07970 | THEY ARE FROZEN, AND DELIBERATELY NOT DOC-LINTED | (none) | So: nothing in this folder is ever edited. If a fact here is superseded, the correction lives in the Ledger, PRODUC… | RULE | (none) | (none) |  |
| INV-07971 | The twelve files | (none) | The twelve files | OPERATING | (none) | (none) | Heading |
| INV-07972 | The twelve files › Product model & experience | (none) | Product model & experience | OPERATING | (none) | (none) | Heading |
| INV-07973 | The twelve files › Product model & experience | §21 | get-kind_jack_and_jill_product_model_verification.html | COMMERCIAL | (none) | (none) | get-kind_jack_and_jill_product_model_verification.html · The differentiated product model: Milla as client intelligence, FIGSY as … |
| INV-07974 | The twelve files › Product model & experience | (none) | get-kind_milla_website_preview.html | MONEY | (none) | (none) | get-kind_milla_website_preview.html · The full Milla-first homepage: "Meet Milla. Your pipeline, handled." — hero, live product-st… |
| INV-07975 | The twelve files › Product model & experience | §22.5 | get-kind_website_positioning_simplicity_verification.html | RULE | (none) | (none) | get-kind_website_positioning_simplicity_verification.html · The positioning audit spec: does the site force a buyer to learn the i… |
| INV-07976 | The twelve files › Meetings & yield — the commercial engine | (none) | Meetings & yield — the commercial engine | OPERATING | (none) | (none) | Heading |
| INV-07977 | The twelve files › Meetings & yield — the commercial engine | §9 | get-kind_meeting_booking_engine_strategy.html | COMMERCIAL | (none) | (none) | get-kind_meeting_booking_engine_strategy.html · The MEETING_BOOKED doctrine: sell the response before the meeting · every sequence… |
| INV-07978 | The twelve files › Meetings & yield — the commercial engine | §1 | get-kind_data_sourcing_and_meeting_yield_verification_artifact.html | COMMERCIAL | (none) | (none) | get-kind_data_sourcing_and_meeting_yield_verification_artifact.html · The superset. Sourcing evidence-graph + signal engine (§1–17… |
| INV-07979 | The twelve files › Meetings & yield — the commercial engine | §1 | get-kind_data_sourcing_verification_artifact.html | OPERATING | ⚠️ | (none) | get-kind_data_sourcing_verification_artifact.html · ⚠️ CONTAINED WITHIN the file above. This standalone sourcing artifact is §1–17… |
| INV-07980 | The twelve files › Growth surfaces — post-launch tracks | (none) | Growth surfaces — post-launch tracks | OPERATING | (none) | (none) | Heading |
| INV-07981 | The twelve files › Growth surfaces — post-launch tracks | (none) | get-kind_social_intent_feasibility_verification.html | RULE | (none) | (none) | get-kind_social_intent_feasibility_verification.html · The social-intent architecture: signal → intent classification → identity r… |
| INV-07982 | The twelve files › Growth surfaces — post-launch tracks | (none) | get-kind_crm_expansion_reengagement_feasibility.html | RULE | (none) | (none) | get-kind_crm_expansion_reengagement_feasibility.html · Client CRM as system of record, K.I.N.D as system of action. Closed-won → e… |
| INV-07983 | The twelve files › Growth surfaces — post-launch tracks | §11 | get-kind_vida_post_10_client_autonomy_verification.html | GATE | (none) | (none) | get-kind_vida_post_10_client_autonomy_verification.html · Vida's autonomy ladder (Levels 1–4, target 3 not 4), the bounded tool re… |
| INV-07984 | The twelve files › Market & context | (none) | Market & context | COMMERCIAL | (none) | (none) | Heading |
| INV-07985 | The twelve files › Market & context | (none) | get-kind_competitive_market_benchmark_verification_log.html | ARCHITECTURE | (none) | (none) | get-kind_competitive_market_benchmark_verification_log.html · The 17-Aug market snapshot — Alta · 11x · Artisan · Regie.ai · Unify… |
| INV-07986 | The twelve files › Market & context | (none) | MASTER_CONTEXT.md | ARCHITECTURE | ⚠️ | (none) | MASTER_CONTEXT.md · The reconstructed handoff of the whole GPT conversation: company/launch context, the Milla/FIGSY/Vida model, g… |
| INV-07987 | The twelve files › Market & context | (none) | CURRENT_CROSSCHECK.md | RULE | (none) | (none) | CURRENT_CROSSCHECK.md · The independent cross-check after the 19-Aug ledger update: the PDL escalation, the Apollo provenance rule… |
| INV-07988 | What is NOT here, and where it went | (none) | What is NOT here, and where it went | OPERATING | (none) | (none) | Heading |
| INV-07989 | What is NOT here, and where it went | (none) | PDF renderings of the ten HTML artifacts — identical content, larger files. The HTML is the source. | OPERATING | (none) | (none) |  |
| INV-07990 | What is NOT here, and where it went | (none) | 9 website-preview screenshots (18 Aug) — images of the Milla preview, whose HTML is here. | OPERATING | (none) | 18 Aug |  |
| INV-07991 | What is NOT here, and where it went | (none) | 5 earlier source ledgers (Pasted markdown(4)…(9).md) — superseded by the current Ledger and the four canonical docs… | OPERATING | (none) | (none) |  |
| INV-07992 | What is NOT here, and where it went | §4 | 4 compliance source documents (global_compliance_v2, v2_1_verified, and the "how a company becomes compliant" PDF) … | RULE | (none) | (none) |  |
| INV-07993 | What is NOT here, and where it went | (none) | START_HERE.html, ARTIFACT_MANIFEST.md, FILES.txt, README_FOR_FABLE.md, PASTE_TO_FABLE.txt — navigation for the ZIP;… | OPERATING | (none) | (none) |  |
| INV-07994 | The audits these files drive | (none) | The audits these files drive | OPERATING | (none) | (none) | Heading |
| INV-07995 | The audits these files drive | (none) | Prompt · Artifact · Produces | OPERATING | (none) | (none) |  |
| INV-07996 | The audits these files drive | (none) | 39 · Jack & Jill · Meeting Brief / Missions / calibration gap map | OPERATING | (none) | (none) |  |
| INV-07997 | The audits these files drive | (none) | 40 · Sourcing & meeting yield · Sourcing gaps + yield gaps, split commercial vs compliance | RULE | (none) | (none) |  |
| INV-07998 | The audits these files drive | (none) | 41 · Vida autonomy · Which autonomy level the code safely supports, and what is missing | DEFECT | (none) | (none) |  |
| INV-07999 | The audits these files drive | (none) | 42 · Social intent · GO / GO-WITH-PREREQUISITES verdict + first-source recommendation | OPERATING | (none) | (none) |  |
| INV-08000 | The audits these files drive | (none) | 43 · Competitive benchmark · Where K.I.N.D genuinely stands, capability by capability | OPERATING | (none) | (none) |  |

## `docs/marketing/GTM-ONE-PAGE.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** GTM one-pager · **Lines:** 97 · **Material items in this source:** 35 · **Rows in this part:** 35 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08001 | 📄 GTM — ONE PAGE | (none) | 📄 GTM — ONE PAGE | COMMERCIAL | (none) | (none) | Heading |
| INV-08002 | 📄 GTM — ONE PAGE | (none) | The doing page. Who we sell to, what we sell, the four channels, the daily numbers, the money. Nothing else. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08003 | 📄 GTM — ONE PAGE | (none) | The why lives in GTM-STRATEGY.md — read it once, then work from here. This page holds no status (that is PRODUCT-IN… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08004 | 1 · ONE AVATAR | (none) | 1 · ONE AVATAR | MONEY | (none) | (none) | Heading |
| INV-08005 | 1 · ONE AVATAR | R23 | Founders of agencies and consultancies, ~5–30 staff, referral-dependent. Global — US/UK primary (R23, 12 Aug: "Glob… | COMMERCIAL | (none) | 12 Aug |  |
| INV-08006 | 1 · ONE AVATAR | (none) | Their real problem: the people best at winning work are buried in delivery, so business development becomes whoever… | COMMERCIAL | (none) | (none) |  |
| INV-08007 | 1 · ONE AVATAR | (none) | Their real fear, and it is not "will it work": "will something go out under my name that embarrasses me?" Most of t… | COMMERCIAL | (none) | (none) |  |
| INV-08008 | 2 · ONE OFFER | (none) | 2 · ONE OFFER | COMMERCIAL | (none) | (none) | Heading |
| INV-08009 | 2 · ONE OFFER | (none) | $299 to start — 100 approved leads included. After that, $4 for each lead you approve. | MONEY | (none) | (none) | Blockquote |
| INV-08010 | 2 · ONE OFFER | (none) | "You approve every prospect before anyone is contacted." | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08011 | 2 · ONE OFFER | R1 | The free-10 is yours, not the site's. Ten leads, run free, offered by you personally to a named person in a call or… | RULE | (none) | 6 Aug |  |
| INV-08012 | 2 · ONE OFFER | R22 | Never in public copy: the no-card line, any free-to-start or trial framing, our own name as the masthead brand — th… | RULE | (none) | 12 Aug |  |
| INV-08013 | 3 · THE CORE FOUR — three running, one parked | (none) | 3 · THE CORE FOUR — three running, one parked | COMMERCIAL | (none) | (none) | Heading |
| INV-08014 | 3 · THE CORE FOUR — three running, one parked | (none) | Channel · What it is · State | COMMERCIAL | (none) | (none) |  |
| INV-08015 | 3 · THE CORE FOUR — three running, one parked | (none) | 1 · Warm outreach · 5 personally-written messages a day to named people you already know · ON — this is the whole g… | COMMERCIAL | (none) | (none) | 1 · Warm outreach · 5 personally-written messages a day to named people you already know · ON — this is the whole game right now |
| INV-08016 | 3 · THE CORE FOUR — three running, one parked | (none) | 2 · Cold outreach · FIGSY prospects agency founders for M&V — us, using our own product · ON when the mailboxes fin… | COMMERCIAL | (none) | (none) | 2 · Cold outreach · FIGSY prospects agency founders for M&V — us, using our own product · ON when the mailboxes finish warming |
| INV-08017 | 3 · THE CORE FOUR — three running, one parked | R29 | 3 · Content · beehiiv weekly (⛓️ superseded — R29, 12 Aug: newsletter PARKED, channel = YouTube; CTA = the site) · … | RULE | ⛓️ | 12 Aug | 3 · Content · beehiiv weekly (⛓️ superseded — R29, 12 Aug: newsletter PARKED, channel = YouTube; CTA = the site) · LinkedIn compan… |
| INV-08018 | 3 · THE CORE FOUR — three running, one parked | R24 | 4 · Paid ads · — · PARKED until revenue (R24, 12 Aug · R7, 6 Aug) | MONEY | (none) | 12 Aug |  |
| INV-08019 | 3 · THE CORE FOUR — three running, one parked | (none) | Our rule of 100 is 100 PEOPLE, not 100 a day. Five a day, each written by hand, reaches 100 named humans in a month… | RULE | (none) | (none) |  |
| INV-08020 | 3 · THE CORE FOUR — three running, one parked | (none) | Why cold is second and not first: it is the strongest proof we will ever have — we found you with the thing we are … | COMMERCIAL | (none) | (none) |  |
| INV-08021 | 4 · THE DAILY NUMBERS | (none) | 4 · THE DAILY NUMBERS | COMMERCIAL | (none) | (none) | Heading |
| INV-08022 | 4 · THE DAILY NUMBERS | (none) | Personally-written warm messages, to named people | COMMERCIAL | (none) | (none) | Personally-written warm messages, to named people · 5 |
| INV-08023 | 4 · THE DAILY NUMBERS | (none) | Reply reasons logged — every no, in their words | COMMERCIAL | (none) | (none) | Reply reasons logged — every no, in their words · every one |
| INV-08024 | 4 · THE DAILY NUMBERS | (none) | Free-10 offered, when a conversation earns it | COMMERCIAL | (none) | (none) | Free-10 offered, when a conversation earns it · your call |
| INV-08025 | 4 · THE DAILY NUMBERS | R29 | Every week: ~~one newsletter~~ (R29 — parked) · one DROP Show · one look at the number below. ⛓️ Cadence of record … | COMMERCIAL | ~~ ⛓️ | 12 Aug |  |
| INV-08026 | 4 · THE DAILY NUMBERS › The one metric — accepted leads per client per month | (none) | The one metric — accepted leads per client per month | COMMERCIAL | (none) | (none) | Heading |
| INV-08027 | 4 · THE DAILY NUMBERS › The one metric — accepted leads per client per month | (none) | So the single most important job after someone pays is building the approval habit in week one. Not onboarding. Not… | GATE | (none) | (none) |  |
| INV-08028 | 5 · THE MONEY — four boxes | (none) | 5 · THE MONEY — four boxes | COMMERCIAL | (none) | (none) | Heading |
| INV-08029 | 5 · THE MONEY — four boxes | (none) | Revenue · approvals × $4 | MONEY | (none) | (none) |  |
| INV-08030 | 5 · THE MONEY — four boxes | (none) | Cost to deliver | MONEY | (none) | (none) | Cost to deliver · approvals × $0.83 (sourcing $0.56 + working it $0.07 + card & FX $0.20) + $8/mo for each client's inbox. Sourcin… |
| INV-08031 | 5 · THE MONEY — four boxes | (none) | Fixed · $352/mo — $146 platform + $206 company. Same whether we have one client or ten | MONEY | (none) | (none) |  |
| INV-08032 | 5 · THE MONEY — four boxes | (none) | Net · Revenue − Deliver − Fixed | MONEY | (none) | (none) |  |
| INV-08033 | 5 · THE MONEY — four boxes | (none) | You keep $3.17 of every $4. One client covers their own inbox at 3 approvals a month; everything past that pays dow… | MONEY | (none) | (none) |  |
| INV-08034 | 5 · THE MONEY — four boxes | (none) | The line the whole strategy hangs on | COMMERCIAL | (none) | (none) |  |
| INV-08035 | 5 · THE MONEY — four boxes | (none) | Taking ONE client from 20 → 200 approvals adds $571/mo. A brand-new client at the 20 floor adds $55/mo. | MONEY | (none) | (none) | Blockquote |

## `docs/marketing/GTM-STRATEGY.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** GTM strategy · **Lines:** 149 · **Material items in this source:** 55 · **Rows in this part:** 55 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08036 | 🎯 GO-TO-MARKET — the strategy | (none) | 🎯 GO-TO-MARKET — the strategy | COMMERCIAL | (none) | (none) | Heading |
| INV-08037 | 🎯 GO-TO-MARKET — the strategy | (none) | Built with the founder 12 Aug. Three decisions set the shape: (1) warm network now, dogfood cold from ~25 Aug · (2)… | COMMERCIAL | (none) | 12 Aug. | Blockquote |
| INV-08038 | 🎯 GO-TO-MARKET — the strategy | §3 | This doc owns the STRATEGY — why we do it this way. The actions live in MARKETING-PLAN.md §3, the words in voice.md… | IDEA | (none) | (none) | Blockquote |
| INV-08039 | 1 · The money — four numbers, from the founder's own lab | (none) | 1 · The money — four numbers, from the founder's own lab | COMMERCIAL | (none) | (none) | Heading |
| INV-08040 | 1 · The money — four numbers, from the founder's own lab | (none) | docs/CASHFLOW-LAB.html is the money model of record (PR6, founder-locked 25 Jul). This section quotes it; it never … | MONEY | (none) | 25 Jul |  |
| INV-08041 | 1 · The money — four numbers, from the founder's own lab | (none) | Scenario · Revenue / mo · Cost to deliver · Fixed / mo · Net / month | MONEY | (none) | (none) |  |
| INV-08042 | 1 · The money — four numbers, from the founder's own lab | (none) | 10 clients × 20 approvals | MONEY | (none) | (none) | 10 clients × 20 approvals · $800 · $246 · $352 · +$202 |
| INV-08043 | 1 · The money — four numbers, from the founder's own lab | (none) | 1 client × 200 approvals | MONEY | (none) | (none) | 1 client × 200 approvals · $800 · $174 · $352 · +$274 |
| INV-08044 | 1 · The money — four numbers, from the founder's own lab | (none) | 4 clients × 200 | MONEY | (none) | (none) | 4 clients × 200 · $3,200 · $696 · $352 · +$2,152 |
| INV-08045 | 1 · The money — four numbers, from the founder's own lab | (none) | 10 clients × 200 | MONEY | (none) | (none) | 10 clients × 200 · $8,000 · $1,740 · $352 · +$5,908 |
| INV-08046 | 1 · The money — four numbers, from the founder's own lab | (none) | The line the strategy hangs on (pure contribution — no floor in it at all) | COMMERCIAL | (none) | (none) |  |
| INV-08047 | 1 · The money — four numbers, from the founder's own lab | (none) | Taking ONE client from 20 → 200 approvals adds $571/mo. A NEW client at the 20-minimum adds $55/mo. Deepening is wo… | MONEY | (none) | (none) | Blockquote |
| INV-08048 | 2 · The two engines | (none) | 2 · The two engines | COMMERCIAL | (none) | (none) | Heading |
| INV-08049 | 2 · The two engines | (none) | Engine 1 is capped and that is fine. Ten right clients is the target, not a hundred. | COMMERCIAL | (none) | (none) |  |
| INV-08050 | 2 · The two engines | (none) | Engine 2 has no ceiling and is almost entirely customer success — which is why CS is not a support function here, i… | MONEY | (none) | (none) |  |
| INV-08051 | 3 · The wedge — and why it can't be copied | (none) | 3 · The wedge — and why it can't be copied | COMMERCIAL | (none) | (none) | Heading |
| INV-08052 | 3 · The wedge — and why it can't be copied | (none) | "You approve every prospect before anyone is contacted." | COMMERCIAL | (none) | (none) |  |
| INV-08053 | 3 · The wedge — and why it can't be copied › The tension this creates — and the most important sentence in this document | (none) | The tension this creates — and the most important sentence in this document | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08054 | 3 · The wedge — and why it can't be copied › The tension this creates — and the most important sentence in this document | (none) | Approval is not a gate. It is the engagement metric — and the revenue. | MONEY | (none) | (none) | Blockquote |
| INV-08055 | 3 · The wedge — and why it can't be copied › The tension this creates — and the most important sentence in this document | (none) | The thing that differentiates us and the thing that pays us are the same action. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08056 | 3 · The wedge — and why it can't be copied › The tension this creates — and the most important sentence in this document | (none) | Therefore the single most important job after a client pays is building an approval habit in week one. Not onboardi… | GATE | (none) | (none) |  |
| INV-08057 | 4 · The stages — triggered by evidence, never by date | (none) | 4 · The stages — triggered by evidence, never by date | RULE | (none) | (none) | Heading |
| INV-08058 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | (none) | Stage 0 · NOW → ~25 Aug — warm only | COMMERCIAL | (none) | 25 Aug | Heading |
| INV-08059 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | (none) | Warm-100 list, 5 personally-written messages a day | COMMERCIAL | (none) | (none) | Warm-100 list, 5 personally-written messages a day · 100 sent by day 30 |
| INV-08060 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | R21 | The free-10 offered by you, to named people (R21) | COMMERCIAL | (none) | (none) | The free-10 offered by you, to named people (R21) · 5 runs |
| INV-08061 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | (none) | Log every reply reason; bank every objection | COMMERCIAL | (none) | (none) | Log every reply reason; bank every objection · every one |
| INV-08062 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | (none) | beehiiv + LinkedIn company page live | COMMERCIAL | (none) | (none) | beehiiv + LinkedIn company page live · week 1 |
| INV-08063 | 4 · The stages — triggered by evidence, never by date › Stage 0 · NOW → ~25 Aug — warm only | (none) | Watch each free-10 recipient use Milla, in person | COMMERCIAL | (none) | (none) | Watch each free-10 recipient use Milla, in person · every one |
| INV-08064 | 4 · The stages — triggered by evidence, never by date › Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | (none) | Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | COMMERCIAL | (none) | 25 Aug | Heading |
| INV-08065 | 4 · The stages — triggered by evidence, never by date › Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | (none) | Point FIGSY at our own ICP | COMMERCIAL | (none) | (none) | Point FIGSY at our own ICP · The product proves itself before the call |
| INV-08066 | 4 · The stages — triggered by evidence, never by date › Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | (none) | Every real prospect decision → the content bank | COMMERCIAL | (none) | (none) | Every real prospect decision → the content bank · Nobody else can post our system's actual reasoning |
| INV-08067 | 4 · The stages — triggered by evidence, never by date › Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | (none) | Depth motion on client 1 — get them from 20 → 200 | COMMERCIAL | (none) | (none) | Depth motion on client 1 — get them from 20 → 200 · Worth 10× a second client |
| INV-08068 | 4 · The stages — triggered by evidence, never by date › Stage 1 · ~25 Aug → client 4 — dogfood the cold engine | (none) | Weekly newsletter + Thursday DROP Show | COMMERCIAL | (none) | (none) | Weekly newsletter + Thursday DROP Show · Compounding |
| INV-08069 | 4 · The stages — triggered by evidence, never by date › Stage 2 · client 4 → client 10 — hire the depth | (none) | Stage 2 · client 4 → client 10 — hire the depth | COMMERCIAL | (none) | (none) | Heading |
| INV-08070 | 4 · The stages — triggered by evidence, never by date › Stage 3 · 10 deep clients — $8,000/mo, +$5,908 net (lab defaults) | (none) | Stage 3 · 10 deep clients — $8,000/mo, +$5,908 net (lab defaults) | MONEY | (none) | (none) | Heading |
| INV-08071 | 5 · What we deliberately do NOT do | (none) | 5 · What we deliberately do NOT do | COMMERCIAL | (none) | (none) | Heading |
| INV-08072 | 5 · What we deliberately do NOT do | (none) | Chase logo count | MONEY | (none) | (none) | Chase logo count · 10 × 20 nets $86. The number of clients is not the goal |
| INV-08073 | 5 · What we deliberately do NOT do | R24 | Paid ads before revenue | MONEY | (none) | (none) | Paid ads before revenue · R24/R7. Ads buy more of a working message; we don't have one yet |
| INV-08074 | 5 · What we deliberately do NOT do | R21 | A public free-10 offer | COMMERCIAL | (none) | (none) | A public free-10 offer · R21 — it is the founder's personal lure, not a landing-page giveaway |
| INV-08075 | 5 · What we deliberately do NOT do | R2 | Personal founder brand | COMMERCIAL | (none) | (none) | Personal founder brand · R2 — brand-voiced, always |
| INV-08076 | 5 · What we deliberately do NOT do | (none) | Compete on volume or price | MONEY | (none) | (none) | Compete on volume or price · The wedge is control. Price-leading invites price-shopping |
| INV-08077 | 5 · What we deliberately do NOT do | (none) | Onboard a client we can't watch | OPERATING | (none) | (none) | Onboard a client we can't watch · 280 items are unwalked. Every early client is hand-held |
| INV-08078 | 6 · The scoreboard | (none) | 6 · The scoreboard | COMMERCIAL | (none) | (none) | Heading |
| INV-08079 | 6 · The scoreboard | (none) | Metric · Engine · Why it beats the alternatives | COMMERCIAL | (none) | (none) |  |
| INV-08080 | 6 · The scoreboard | (none) | Conversations with named ICP humans | MONEY | (none) | (none) | Conversations with named ICP humans · 1 · Predicts revenue. Followers and impressions do not |
| INV-08081 | 6 · The scoreboard | (none) | Accepted leads per client per month | COMMERCIAL | (none) | (none) | Accepted leads per client per month · 2 · The whole business. 20 is break-even-ish; 200 is the model working |
| INV-08082 | 6 · The scoreboard | (none) | Clients · 1 · Useful only alongside the metric above | COMMERCIAL | (none) | (none) |  |
| INV-08083 | 6 · The scoreboard | (none) | Reply reasons logged | IDEA | (none) | (none) | Reply reasons logged · both · The content bank and the product roadmap in one |
| INV-08084 | 6 · The scoreboard | (none) | Free-10 runs offered | COMMERCIAL | (none) | (none) | Free-10 runs offered · 1 · The only acquisition action fully in your control |
| INV-08085 | 7 · The honest risks | (none) | 7 · The honest risks | RISK | (none) | (none) | Heading |
| INV-08086 | 7 · The honest risks | (none) | Depth is unproven. No client has ever gone from 20 to 200. The entire model rests on it and it is an assumption, no… | OPERATING | (none) | (none) |  |
| INV-08087 | 7 · The honest risks | (none) | 280 items are unwalked. Warm-first is partly a fragility strategy: a hand-held client tells you what broke; a stran… | OPERATING | (none) | (none) |  |
| INV-08088 | 7 · The honest risks | §3 | Approval friction is the kill-switch. See §3. If approving is tedious, both the wedge and the revenue die. | MONEY | (none) | (none) |  |
| INV-08089 | 7 · The honest risks | (none) | Your network is finite. Stage 0 has a hard ceiling — which is exactly why Stage 1 exists. | COMMERCIAL | (none) | (none) |  |
| INV-08090 | 7 · The honest risks | (none) | Cold outreach is unproven at our end. Nothing has ever been sent. Send-day (~25 Aug) is a real risk event, not a fo… | RISK | (none) | 25 Aug |  |

## `docs/marketing/MARKETING-PLAN.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Marketing plan · **Lines:** 328 · **Material items in this source:** 177 · **Rows in this part:** 177 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08091 | 📣 MARKETING PLAN — how K.I.N.D gets known | (none) | 📣 MARKETING PLAN — how K.I.N.D gets known | IDEA | (none) | (none) | Heading |
| INV-08092 | 📣 MARKETING PLAN — how K.I.N.D gets known | (none) | This is the doc you open for marketing. It holds the plan and the recurring actions — daily, weekly, monthly. It ho… | OPERATING | (none) | (none) | Blockquote |
| INV-08093 | 📣 MARKETING PLAN — how K.I.N.D gets known | #632 | Inventory id: #632 (reserved by R6, 6 Aug, for exactly this). Detail files live in this folder — see README-marketi… | COMMERCIAL | (none) | 6 Aug | Blockquote |
| INV-08094 | READ THIS FIRST — two founder locks gate this plan | (none) | READ THIS FIRST — two founder locks gate this plan | GATE | 🛑 | (none) | Heading |
| INV-08095 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | R2 | LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | IDEA | (none) | 6 Aug | Heading |
| INV-08096 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | "Stealth is NARROWED, not lifted. A LinkedIn company page is allowed. No personal announcement. Outreach goes to fr… | IDEA | (none) | (none) | Blockquote |
| INV-08097 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | Founder's words: "dont worry about me stealth. i wont publicy announce on linkdein. i will create a linkdein compan… | IDEA | (none) | (none) | Blockquote |
| INV-08098 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | What this blocks: founder-led public posting 3–5×/week — the centre of the plan as briefed. | IDEA | (none) | (none) |  |
| INV-08099 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | What it does NOT block, and this is the point: the warm list, the 100 names, the beehiiv build, the welcome sequenc… | COMMERCIAL | (none) | (none) |  |
| INV-08100 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | Build the warm-100 list · send the first 20 · ask for introductions | COMMERCIAL | ❌ | (none) | Build the warm-100 list · send the first 20 · ask for introductions · ❌ no |
| INV-08101 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | Stand up beehiiv · landing page · welcome sequence · weekly issue | COMMERCIAL | ❌ | (none) | Stand up beehiiv · landing page · welcome sequence · weekly issue · ❌ no |
| INV-08102 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | R2 | LinkedIn company page + posting from it | COMMERCIAL | ❌ | (none) | LinkedIn company page + posting from it · ❌ no — R2 explicitly allows it |
| INV-08103 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | Bank content: every objection, rejection reason, real prospect decision | COMMERCIAL | ❌ | (none) | Bank content: every objection, rejection reason, real prospect decision · ❌ no |
| INV-08104 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | (none) | Founder posting publicly under your own name | COMMERCIAL | ✅ | (none) | Founder posting publicly under your own name · ✅ YES — your call |
| INV-08105 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | R7 | Paid ads (they are public by definition) | COMMERCIAL | ✅ | (none) | Paid ads (they are public by definition) · ✅ YES — and R7 too |
| INV-08106 | READ THIS FIRST — two founder locks gate this plan › LOCK 1 · R2 — stealth is narrowed, not lifted (6 Aug) | §9 | → DECISION OWED (§9). Until you rule, everything above the line runs and the public step waits. Nothing else is blo… | RULE | (none) | (none) |  |
| INV-08107 | READ THIS FIRST — two founder locks gate this plan › LOCK 2 · R1 — the free-10 is a sales tool, not a public offer (6 Aug) | R1 | LOCK 2 · R1 — the free-10 is a sales tool, not a public offer (6 Aug) | COMMERCIAL | (none) | 6 Aug | Heading |
| INV-08108 | READ THIS FIRST — two founder locks gate this plan › LOCK 2 · R1 — the free-10 is a sales tool, not a public offer (6 Aug) | (none) | "...offered on the fly in a call or demo and built only when a real client needs it — never pre-built, never in cod… | RULE | (none) | (none) | Blockquote |
| INV-08109 | READ THIS FIRST — two founder locks gate this plan › LOCK 2 · R1 — the free-10 is a sales tool, not a public offer (6 Aug) | R29 | How this plan honours both: ⛓️ this read "the public magnet is the newsletter" — corrected 12 Aug, R29: the newslet… | MONEY | ⛓️ | 12 Aug |  |
| INV-08110 | READ THIS FIRST — two founder locks gate this plan › Two more, smaller | (none) | Two more, smaller | COMMERCIAL | (none) | (none) | Heading |
| INV-08111 | READ THIS FIRST — two founder locks gate this plan › Two more, smaller | R9 | ~~R9 (6 Aug) — the M&V brand hierarchy is killed~~ ⛓️ CORRECTED 12 Aug — this row said the opposite of the truth | RULE | ~~ ⛓️ ⚠️ | 6 Aug | ~~R9 (6 Aug) — the M&V brand hierarchy is killed~~ ⛓️ CORRECTED 12 Aug — this row said the opposite of the truth · ⚠️ It read "Pub… |
| INV-08112 | READ THIS FIRST — two founder locks gate this plan › Two more, smaller | P12 | P12 — the website is founder-locked | RULE | (none) | (none) | P12 — the website is founder-locked · The playbook's "update all public copy" actions cannot be done without your command. beehiiv… |
| INV-08113 | READ THIS FIRST — two founder locks gate this plan › Two more, smaller | R7 | R7 (6 Aug) — real money waits | MONEY | (none) | 6 Aug | R7 (6 Aug) — real money waits · Paid ads are gated on revenue, not on a date. See paid-ads-phase-plan.md. |
| INV-08114 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | DEFECT | (none) | 12 Aug | Heading |
| INV-08115 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | "Nobody knows we exist" is not a content problem. It is a distribution problem. Everything below is built and reach… | COMMERCIAL | (none) | (none) |  |
| INV-08116 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | Surface · State · Note | COMMERCIAL | (none) | (none) |  |
| INV-08117 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | The website — 28 pages | MONEY | ✅ | (none) | The website — 28 pages · ✅ LIVE · Homepage, FIGSY, Milla, Vida, pricing, about, trust, DPA/privacy/terms, vs-hiring-an-SDR, pipeli… |
| INV-08118 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | The DROP Show — 8 episodes | COMMERCIAL | ✅ | (none) | The DROP Show — 8 episodes · ✅ LIVE, all marked Live · drop-01…drop-08. This is a content bank we already own — eight finished pie… |
| INV-08119 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | R2 | LinkedIn company page | GATE | ✅ | 12 Aug | LinkedIn company page · ✅ LIVE (founder-confirmed 12 Aug) · R2 permits the company page. An empty company page reads as a dead com… |
| INV-08120 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | The message · ✅ CONSISTENT · Site H1 "We find your leads. You approve. That's it." = the GTM wedge = voice.md's one… | COMMERCIAL | ✅ | (none) | The message · ✅ CONSISTENT · Site H1 "We find your leads. You approve. That's it." = the GTM wedge = voice.md's one-liner. Site, s… |
| INV-08121 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | (none) | Social proof · ✅ CLEAN · Checked 12 Aug: no invented testimonials, no fake logos, no unbacked stats. Whatever credi… | OPERATING | ✅ | 12 Aug | Social proof · ✅ CLEAN · Checked 12 Aug: no invented testimonials, no fake logos, no unbacked stats. Whatever credibility gets bui… |
| INV-08122 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | R29 | beehiiv newsletter | IDEA | ⏸ | 12 Aug | beehiiv newsletter · ⏸ PARKED (R29, 12 Aug) · "beehiv wait. i need to build it." The founder builds it if and when he chooses. Not… |
| INV-08123 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) | R27 | Anything ever sent | RULE | 🔴 | 25 Aug. | Anything ever sent · 🔴 ZERO · Send-day ~25 Aug. See R27 — the homepage's "our own system found you" claim is false until then, the… |
| INV-08124 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) › 🎯 The existence list — in order, all free, none gated by R2/R7 | R2 | 🎯 The existence list — in order, all free, none gated by R2/R7 | GATE | (none) | (none) | Heading |
| INV-08125 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) › 🎯 The existence list — in order, all free, none gated by R2/R7 | (none) | Do this · Why it is first · Owner | COMMERCIAL | (none) | (none) |  |
| INV-08126 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) › 🎯 The existence list — in order, all free, none gated by R2/R7 | (none) | 1 · Work the dated calendar — §3b. Day one dresses the live LinkedIn page and pastes POST 1; every post is finished… | COMMERCIAL | (none) | (none) | 1 · Work the dated calendar — §3b. Day one dresses the live LinkedIn page and pastes POST 1; every post is finished in the playboo… |
| INV-08127 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) › 🎯 The existence list — in order, all free, none gated by R2/R7 | (none) | 2 · Build beehiiv (~3 hrs, $0) · It is the CTA voice.md mandates for public posts, and the one audience we would ow… | MONEY | (none) | (none) | 2 · Build beehiiv (~3 hrs, $0) · It is the CTA voice.md mandates for public posts, and the one audience we would own rather than r… |
| INV-08128 | 0 · WHAT IS ACTUALLY LIVE — and the one thing missing (the honest inventory, 12 Aug) › 🎯 The existence list — in order, all free, none gated by R2/R7 | (none) | 3 · Warm outreach continues underneath both — 5 named people a day · It is the only channel that can pay this month… | COMMERCIAL | (none) | (none) | 3 · Warm outreach continues underneath both — 5 named people a day · It is the only channel that can pay this month. Steps 1–2 exi… |
| INV-08129 | 1 · The strategy in one paragraph | (none) | 1 · The strategy in one paragraph | COMMERCIAL | (none) | (none) | Heading |
| INV-08130 | 1 · The strategy in one paragraph | (none) | One audience. One painful problem. One entry offer. One conversion path. (Your playbook's own opening line, and it … | COMMERCIAL | (none) | (none) |  |
| INV-08131 | 1 · The strategy in one paragraph | (none) | Decision · The answer, until data changes it | COMMERCIAL | (none) | (none) |  |
| INV-08132 | 1 · The strategy in one paragraph | R23 | Market · GLOBAL — US/UK primary (R23, 12 Aug: "Global"; supersedes the UK-only row that stood here) · agencies and … | COMMERCIAL | (none) | 12 Aug | Market · GLOBAL — US/UK primary (R23, 12 Aug: "Global"; supersedes the UK-only row that stood here) · agencies and consultancies, … |
| INV-08133 | 1 · The strategy in one paragraph | (none) | Problem · Senior people are split between billable delivery and business development | COMMERCIAL | (none) | (none) |  |
| INV-08134 | 1 · The strategy in one paragraph | (none) | Outcome · More qualified conversations, a more predictable pipeline | ARCHITECTURE | (none) | (none) |  |
| INV-08135 | 1 · The strategy in one paragraph | R29 | Public magnet | COMMERCIAL | ⛓️ | 12 Aug | Public magnet · The LinkedIn company page → the site. ⛓️ Was "the newsletter"; parked 12 Aug, R29 |
| INV-08136 | 1 · The strategy in one paragraph | R1 | Sales offer · "Want me to run your first 10?" — by you, to a named person (R1) | COMMERCIAL | (none) | (none) |  |
| INV-08137 | 1 · The strategy in one paragraph | (none) | Conversion · Review the 10 in Milla → activate → $299 pack, then $4 per approved lead | MONEY | (none) | (none) |  |
| INV-08138 | 1 · The strategy in one paragraph | (none) | Improve · More → Better → New, in that order | COMMERCIAL | (none) | (none) |  |
| INV-08139 | 1 · The strategy in one paragraph | R22 | Public brand · M&V (Milla & Vida) — the trading brand, as the live site masthead has it. K.I.N.D Technologies is th… | COMMERCIAL | (none) | 12 Aug | Public brand · M&V (Milla & Vida) — the trading brand, as the live site masthead has it. K.I.N.D Technologies is the registered co… |
| INV-08140 | 1 · The strategy in one paragraph | (none) | Voice · ONE voice for everything public — voice.md (absorbed 12 Aug from the Cowork bundle, its best asset) | COMMERCIAL | (none) | 12 Aug |  |
| INV-08141 | 2 · The growth loop | (none) | 2 · The growth loop | COMMERCIAL | (none) | (none) | Heading |
| INV-08142 | 2 · The growth loop | (none) | The loop's engine is H, not A. Every rejected prospect, every objection, every "why did you approve that one" is th… | RULE | (none) | (none) |  |
| INV-08143 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly | (none) | 3 · THE RECURRING ACTIONS — daily · weekly · monthly | COMMERCIAL | (none) | (none) | Heading |
| INV-08144 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | COMMERCIAL | (none) | (none) | Heading |
| INV-08145 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | Action · Why · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08146 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | D1 · 5 warm reach-outs, personally written, to named people · The only channel that can pay this month · 🧍 · daily,… | COMMERCIAL | (none) | (none) | D1 · 5 warm reach-outs, personally written, to named people · The only channel that can pay this month · 🧍 · daily, Mon–Fri |
| INV-08147 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | D2 · Log every reply reason — not reply/no-reply, the reason · "Record reply reason, not just reply/no reply" — you… | COMMERCIAL | (none) | (none) | D2 · Log every reply reason — not reply/no-reply, the reason · "Record reply reason, not just reply/no reply" — your playbook. Thi… |
| INV-08148 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | D3 · Bank one piece of evidence — an objection, a rejected prospect, a question · Content comes from the bank, neve… | RULE | (none) | (none) | D3 · Bank one piece of evidence — an objection, a rejected prospect, a question · Content comes from the bank, never from a blank … |
| INV-08149 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | (none) | D4 · Answer every inbound within the day · Speed-to-lead is the whole product thesis; live it · 🧍 · daily | COMMERCIAL | (none) | (none) |  |
| INV-08150 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🔁 DAILY — 30 minutes, inside the 9am–12pm sales block | R2 | D5 · ~~(when R2 lifts) One post on the chosen channel~~ ⛓️ corrected 12 Aug — posting was never gated: R2 explicitl… | RULE | ~~ ⛓️ | 12 Aug | D5 · ~~(when R2 lifts) One post on the chosen channel~~ ⛓️ corrected 12 Aug — posting was never gated: R2 explicitly allows the CO… |
| INV-08151 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | 📅 WEEKLY | COMMERCIAL | (none) | (none) | Heading |
| INV-08152 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | Action · Why · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08153 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | R31 | W1 · The two weekly posts — Tue + Thu (R31). Thursday is the DROP anchor: Problem → Impact → Solution → ROI. ⛓️ Rea… | MONEY | ⛓️ | 12 Aug | W1 · The two weekly posts — Tue + Thu (R31). Thursday is the DROP anchor: Problem → Impact → Solution → ROI. ⛓️ Read "send the new… |
| INV-08154 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | W2 · Write next week's issue from the bank · 45 min if the bank is fed; 3 hours if it isn't · 🧍 · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08155 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | W3 · Top up the warm list to 100 live names · The list is consumed by D1 — it must be refilled · 🧍 · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08156 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | W4 · The weekly review — marketing-metrics-and-iteration.md · Decide what changes. Nothing changes mid-week · 🧍 · M… | COMMERCIAL | (none) | (none) | W4 · The weekly review — marketing-metrics-and-iteration.md · Decide what changes. Nothing changes mid-week · 🧍 · Mon, 20 min |
| INV-08157 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | W5 · Ask two people for one introduction each · Referrals are the cheapest lead getter and they compound · 🧍 · week… | COMMERCIAL | (none) | (none) | W5 · Ask two people for one introduction each · Referrals are the cheapest lead getter and they compound · 🧍 · weekly |
| INV-08158 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 📅 WEEKLY | (none) | W6 · (when ads run) Review spend against qualified signups, not clicks · Cheap clicks are how budgets die · 🧍 · Mon… | COMMERCIAL | (none) | (none) | W6 · (when ads run) Review spend against qualified signups, not clicks · Cheap clicks are how budgets die · 🧍 · Mon, with W4 |
| INV-08159 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | 🗓️ MONTHLY | COMMERCIAL | (none) | (none) | Heading |
| INV-08160 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | Action · Why · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08161 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | M1 · One deeper piece — a teardown, a benchmark, a real case study · The asset that outlives the week and earns lin… | COMMERCIAL | (none) | (none) | M1 · One deeper piece — a teardown, a benchmark, a real case study · The asset that outlives the week and earns links · 🧍 · last S… |
| INV-08162 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | §1 | M2 · Re-read the one-page plan (§1 table). Change it only here · Prevents channel drift — "change the one-page plan… | RISK | (none) | (none) | M2 · Re-read the one-page plan (§1 table). Change it only here · Prevents channel drift — "change the one-page plan only in the we… |
| INV-08163 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | M3 · Prune the list — remove hard bounces and 90-day non-openers · A list you don't clean is a deliverability probl… | COMMERCIAL | (none) | (none) | M3 · Prune the list — remove hard bounces and 90-day non-openers · A list you don't clean is a deliverability problem waiting · 🧍 … |
| INV-08164 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | M4 · Check marketing spend against the cost floor · The floor is $352/mo (the lab's fixed boxes at its defaults). b… | MONEY | (none) | (none) | M4 · Check marketing spend against the cost floor · The floor is $352/mo (the lab's fixed boxes at its defaults). beehiiv's entry … |
| INV-08165 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | (none) | M5 · One conversation with a non-buyer — why not? · The most valuable 20 minutes in the month · 🧍 · monthly | COMMERCIAL | (none) | (none) |  |
| INV-08166 | 3 · THE RECURRING ACTIONS — daily · weekly · monthly › 🗓️ MONTHLY | R31 | M6 · THE MONTHLY STATS POST (R31) — the one recurring slot allowed to carry numbers. ⚠️ Every figure must come from… | RULE | ⚠️ | (none) | M6 · THE MONTHLY STATS POST (R31) — the one recurring slot allowed to carry numbers. ⚠️ Every figure must come from the founder or… |
| INV-08167 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | (none) | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | COMMERCIAL | (none) | 12 Aug | Heading |
| INV-08168 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | (none) | Nothing below requires writing anything. Every post is finished in founder-content-playbook.md §6b with its link an… | COMMERCIAL | (none) | (none) |  |
| INV-08169 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | R31 | THE RULED CADENCE (R31, 12 Aug): two posts a week — Tuesday and Thursday — plus ONE stats post a month. Thursday is… | RULE | (none) | 12 Aug |  |
| INV-08170 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | COMMERCIAL | (none) | 16 Aug | Heading |
| INV-08171 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08172 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Wed 13 · Dress the LinkedIn page (it is live — make it look alive): banner = mv-milla-portal.png from the site · ta… | RULE | (none) | (none) | Wed 13 · Dress the LinkedIn page (it is live — make it look alive): banner = mv-milla-portal.png from the site · tagline = the sit… |
| INV-08173 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Thu 14 · POST 2 (Every reply, answered) — Thursday is the anchor day (W1) and stays the anchor day forever · gen-dr… | COMMERCIAL | (none) | (none) | Thu 14 · POST 2 (Every reply, answered) — Thursday is the anchor day (W1) and stays the anchor day forever · gen-drop-05-f0.png + … |
| INV-08174 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | R29 | Fri 15 · ~~Build beehiiv~~ PARKED (R29) — the founder builds it if and when he chooses. Instead: produce a carousel… | COMMERCIAL | ~~ | (none) | Fri 15 · ~~Build beehiiv~~ PARKED (R29) — the founder builds it if and when he chooses. Instead: produce a carousel (8 slides, spe… |
| INV-08175 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | #1 | Sat 16 · W2 + W3: ~~draft newsletter #1~~ → bank next week's two posts from the reply reasons · top the warm list b… | COMMERCIAL | ~~ | (none) | Sat 16 · W2 + W3: ~~draft newsletter #1~~ → bank next week's two posts from the reply reasons · top the warm list back to 100 · — … |
| INV-08176 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | COMMERCIAL | (none) | 23 Aug | Heading |
| INV-08177 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08178 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Mon 18 · W4 review (20 min). Then preview get-kind.com/figsy.mp4 — a ~0.9MB clip that sits on the site linked from … | COMMERCIAL | (none) | (none) | Mon 18 · W4 review (20 min). Then preview get-kind.com/figsy.mp4 — a ~0.9MB clip that sits on the site linked from nowhere. Good? … |
| INV-08179 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Tue 19 · POST 3 (Pay for results, not promises) · gen-drop-03-hero.png + get-kind.com/drop-03 · 10 min | COMMERCIAL | (none) | (none) |  |
| INV-08180 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | #1 | Thu 21 · POST 4 (Why your emails never arrived) ~~+ send newsletter #1~~ (parked, R29) · gen-drop-04-hero.png + get… | RULE | ~~ | (none) | Thu 21 · POST 4 (Why your emails never arrived) ~~+ send newsletter #1~~ (parked, R29) · gen-drop-04-hero.png + get-kind.com/drop-… |
| INV-08181 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | R2 | Fri 22 · Record CLIP 1 — the approve moment. 30–60s silent screen capture of Milla: lead card → 👍 → "in sequence". … | COMMERCIAL | (none) | (none) | Fri 22 · Record CLIP 1 — the approve moment. 30–60s silent screen capture of Milla: lead card → 👍 → "in sequence". Caption overlay… |
| INV-08182 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Sat 23 · W2 + W3 · — · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08183 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | COMMERCIAL | (none) | 30 Aug | Heading |
| INV-08184 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08185 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Mon 25 · W4 review. (A14 send-day is product-side — the calendar's only job this week is to keep publishing while i… | COMMERCIAL | (none) | (none) | Mon 25 · W4 review. (A14 send-day is product-side — the calendar's only job this week is to keep publishing while it happens) · — … |
| INV-08186 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Tue 26 · POST 5 (Your data is lying to you) · gen-drop-07-hero.png + get-kind.com/drop-07 · 10 min | COMMERCIAL | (none) | (none) |  |
| INV-08187 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | #2 | Thu 28 · POST 6 (Compliant by default) ~~+ newsletter #2~~ (parked, R29) · gen-drop-08-f0.png + get-kind.com/drop-0… | COMMERCIAL | ~~ | (none) | Thu 28 · POST 6 (Compliant by default) ~~+ newsletter #2~~ (parked, R29) · gen-drop-08-f0.png + get-kind.com/drop-08 · 10 min |
| INV-08188 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Fri 29 · CLIP 2 — the reply moment. Unibox: reply arrives → drafted answer → human approves it. Same rules as clip … | COMMERCIAL | (none) | (none) | Fri 29 · CLIP 2 — the reply moment. Unibox: reply arrives → drafted answer → human approves it. Same rules as clip 1 · your screen… |
| INV-08189 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Sat 30 · W2 + W3 · — · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08190 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | COMMERCIAL | (none) | 5 Sep | Heading |
| INV-08191 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08192 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Tue 2 · POST 7 (Filling roles while you sleep — recruitment vertical) — or hold it and repost the best performer so… | COMMERCIAL | (none) | (none) | Tue 2 · POST 7 (Filling roles while you sleep — recruitment vertical) — or hold it and repost the best performer so far; your call… |
| INV-08193 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | #3 | Thu 4 · POST 8 (From cold list to booked viewing — property vertical) ~~+ newsletter #3~~ (parked, R29). Then the M… | RULE | ~~ | (none) | Thu 4 · POST 8 (From cold list to booked viewing — property vertical) ~~+ newsletter #3~~ (parked, R29). Then the MONTHLY STATS PO… |
| INV-08194 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Fri 5 · CLIP 3 — the research card. FIGSY's why-this-company reasoning on one (anonymised) prospect. Same rules · y… | COMMERCIAL | (none) | (none) | Fri 5 · CLIP 3 — the research card. FIGSY's why-this-company reasoning on one (anonymised) prospect. Same rules · your screen · 30… |
| INV-08195 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | §6 | Sat 6 · MONTHLY block (M1–M5) + refill the bank: §6's ideas take over — idea 1 ("would you approve this prospect?")… | IDEA | (none) | (none) | Sat 6 · MONTHLY block (M1–M5) + refill the bank: §6's ideas take over — idea 1 ("would you approve this prospect?") becomes availa… |
| INV-08196 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | (none) | The rules the whole calendar obeys | COMMERCIAL | (none) | (none) | Heading |
| INV-08197 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | R27 | Never claim our system found the reader until it has (R27, 12 Aug) · no unverified numbers (R11) · brand voice, com… | RULE | (none) | 12 Aug |  |
| INV-08198 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | (none) | Miss a day? Skip it, never stack it. The cadence is the asset. | RULE | (none) | (none) |  |
| INV-08199 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | §3 | After these 30 days the calendar regenerates from §3's rhythm + §6's ideas — this section is the bootstrap, not a f… | IDEA | (none) | (none) |  |
| INV-08200 | 4 · THE NEXT 30 DAYS | (none) | 4 · THE NEXT 30 DAYS | COMMERCIAL | (none) | (none) | Heading |
| INV-08201 | 4 · THE NEXT 30 DAYS | R2 | Everything in Weeks 1–3 runs regardless of R2. Only Week 4's public step is gated. | GATE | (none) | (none) |  |
| INV-08202 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | §0 | Week 1 was written when none of this existed. It does now — read §0 first. | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08203 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | §0 | The machine is built. Week 1's original list below is kept per the chain rule, with the two items that are actually… | RULE | (none) | (none) |  |
| INV-08204 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | (none) | ☐ · Action · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08205 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | R29 | ~~☐~~ · ~~Create the beehiiv publication~~ — ⏸ PARKED 12 Aug (R29), founder's call if ever · 🧍 · ⏸ parked | COMMERCIAL | ~~ ⏸ | 12 Aug |  |
| INV-08206 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | (none) | ☐ · ⚠️ Sending domain: use news.get-kind.com or beehiiv's own. NEVER authenticate kindoutreach.com or trykind.org —… | RULE | ⚠️ | (none) | ☐ · ⚠️ Sending domain: use news.get-kind.com or beehiiv's own. NEVER authenticate kindoutreach.com or trykind.org — those are the … |
| INV-08207 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | (none) | ☐ · ⚠️ Never touch gettingkind.com MX — that is Resend inbound reply-capture (A18) · 🧍 · standing | RULE | ⚠️ | (none) |  |
| INV-08208 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | R29 | ~~☐~~ · ~~Landing page live with ONE ask: subscribe~~ — ⏸ parked with beehiiv (R29) · 🧍 · ⏸ parked | COMMERCIAL | ~~ ⏸ | (none) |  |
| INV-08209 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | R29 | ~~☐~~ · ~~Write the 4-email welcome sequence~~ — ⏸ parked with beehiiv (R29) · 🧍 · ⏸ parked | COMMERCIAL | ~~ ⏸ | (none) |  |
| INV-08210 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | (none) | ☐ · Build the warm-100 list · 🧍 · still owed | COMMERCIAL | (none) | (none) |  |
| INV-08211 | 4 · THE NEXT 30 DAYS › Week 1 was written when none of this existed. It does now — read §0 first. | R2 | ~~☐~~ · ~~LinkedIn company page (R2 allows this)~~ — ✅ LIVE (founder-confirmed 12 Aug) · 🧍 · ✅ done | COMMERCIAL | ~~ ✅ | 12 Aug |  |
| INV-08212 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | Week 2 — warm outreach, the only channel that pays this month | COMMERCIAL | (none) | (none) | Heading |
| INV-08213 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | ☐ · Action · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08214 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | ☐ · Send the first 20 warm messages, personally written · 🧍 · Day 8–9 | COMMERCIAL | (none) | (none) |  |
| INV-08215 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | ☐ · Log every reply reason · 🧍 · daily | COMMERCIAL | (none) | (none) |  |
| INV-08216 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | #1 | ☐ · Send newsletter issue #1 to whoever is on the list, even if it is 11 people · 🧍 · Day 11 | COMMERCIAL | (none) | (none) |  |
| INV-08217 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | ☐ · Ask 5 non-buyers for one introduction each · 🧍 · Day 12 | COMMERCIAL | (none) | (none) |  |
| INV-08218 | 4 · THE NEXT 30 DAYS › Week 2 — warm outreach, the only channel that pays this month | (none) | ☐ · Bank every objection you hear · 🧍 · daily | COMMERCIAL | (none) | (none) |  |
| INV-08219 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | Week 3 — first evidence, first fixes | COMMERCIAL | (none) | (none) | Heading |
| INV-08220 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | ☐ · Action · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08221 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | ☐ · Next 30 warm messages, using what week 2 taught · 🧍 · Day 15–17 | COMMERCIAL | (none) | (none) |  |
| INV-08222 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | ☐ · Watch one person's onboarding live. Write down every friction point · 🧍 · Day 16 | COMMERCIAL | (none) | (none) |  |
| INV-08223 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | #2 | ☐ · Issue #2 — built from a real objection · 🧍 · Day 18 | COMMERCIAL | (none) | (none) |  |
| INV-08224 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | ☐ · Turn the most repeated objection into a copy or product change · 🧍 · Day 19 | COMMERCIAL | (none) | (none) |  |
| INV-08225 | 4 · THE NEXT 30 DAYS › Week 3 — first evidence, first fixes | (none) | ☐ · First weekly review with real numbers · 🧍 · Day 15 | COMMERCIAL | (none) | (none) |  |
| INV-08226 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | (none) | Week 4 — decide about going public, then amplify | COMMERCIAL | (none) | (none) | Heading |
| INV-08227 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | (none) | ☐ · Action · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08228 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | R2 | ☐ · 🚦 RULE ON R2 — public founder posting, yes or no. Everything below waits on this · 🧍 · Day 22 | RULE | (none) | (none) |  |
| INV-08229 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | (none) | ☐ · (if yes) Pick ONE channel. Post 3×. Same CTA every time · 🧍 · Day 23–26 | COMMERCIAL | (none) | (none) |  |
| INV-08230 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | (none) | ☐ · (if no) Double the warm list instead. It is not a worse plan — it is a slower-compounding one · 🧍 · Day 23–26 | IDEA | (none) | (none) |  |
| INV-08231 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | #3 | ☐ · Issue #3 · #4 · 🧍 · Day 25, 32 | COMMERCIAL | (none) | (none) |  |
| INV-08232 | 4 · THE NEXT 30 DAYS › Week 4 — decide about going public, then amplify | (none) | ☐ · Review the 30 days honestly: what actually produced a conversation? · 🧍 · Day 30 | COMMERCIAL | (none) | (none) |  |
| INV-08233 | 5 · What we are NOT doing, and why | (none) | 5 · What we are NOT doing, and why | COMMERCIAL | (none) | (none) | Heading |
| INV-08234 | 5 · What we are NOT doing, and why | R7 | Paid ads before revenue | MONEY | (none) | (none) | Paid ads before revenue · R7 — real money must move and there is none. Ads buy more of a working message; you don't have one yet |
| INV-08235 | 5 · What we are NOT doing, and why | R1 | A public Free10 landing offer | RULE | (none) | (none) | A public Free10 landing offer · R1 — never on the site. It stays your sales tool |
| INV-08236 | 5 · What we are NOT doing, and why | R9 | Rebuilding the M&V brand hierarchy | COMMERCIAL | (none) | 6 Aug | Rebuilding the M&V brand hierarchy · R9 — killed 6 Aug, "kill it" |
| INV-08237 | 5 · What we are NOT doing, and why | P12 | Touching the website | RULE | (none) | (none) | Touching the website · P12 — founder-locked. Flag, never edit |
| INV-08238 | 5 · What we are NOT doing, and why | (none) | Multiple channels at once | COMMERCIAL | (none) | (none) | Multiple channels at once · "The channel changes. The entry offer does not." One channel, learned properly |
| INV-08239 | 5 · What we are NOT doing, and why | (none) | A big content calendar up front | IDEA | (none) | (none) | A big content calendar up front · "Building a huge content calendar before you know which ideas earn attention" is on your own avo… |
| INV-08240 | 5 · What we are NOT doing, and why | (none) | Newsletter sends from the warming domains | COMMERCIAL | (none) | (none) | Newsletter sends from the warming domains · Three weeks of warm-up destroyed for one blast. Non-negotiable |
| INV-08241 | 6 · What this costs | (none) | 6 · What this costs | MONEY | (none) | (none) | Heading |
| INV-08242 | 6 · What this costs | (none) | beehiiv entry tier | MONEY | (none) | (none) | beehiiv entry tier · $0 · Free to a few thousand subscribers. Stays $0 until revenue |
| INV-08243 | 6 · What this costs | (none) | LinkedIn company page | MONEY | (none) | (none) | LinkedIn company page · $0 |
| INV-08244 | 6 · What this costs | (none) | Your time · ~30 min/day + one Saturday block · Already in the operating rhythm | COMMERCIAL | (none) | (none) |  |
| INV-08245 | 6 · What this costs | (none) | Total added to the cost floor | MONEY | (none) | (none) | Total added to the cost floor · $0 · Deliberate. The floor stays $352/mo — nothing here adds to it |
| INV-08246 | 6 · What this costs | R7 | Paid ads · £0 until gated open · R7 | GATE | (none) | (none) |  |
| INV-08247 | 7 · How this connects to the product | (none) | 7 · How this connects to the product | COMMERCIAL | (none) | (none) | Heading |
| INV-08248 | 7 · How this connects to the product | (none) | You use your own product for your own outreach. Instantly is ours, Smartlead is the clients'. Both run inside the p… | COMMERCIAL | (none) | (none) |  |
| INV-08249 | 7 · How this connects to the product | (none) | Cold outreach becomes self-serving once the mailboxes warm (~25 Aug). That is the third Core Four engine switching … | COMMERCIAL | (none) | 25 Aug |  |
| INV-08250 | 7 · How this connects to the product | (none) | Every client interaction feeds content. Rejections, approvals, objections — the bank fills itself as a by-product o… | GATE | (none) | (none) |  |
| INV-08251 | 7 · How this connects to the product | (none) | But nothing sends before the ladder. Warm-up ends ~25 Aug. The newsletter is a different system on a different doma… | GATE | ⚠️ | 25 Aug. |  |
| INV-08252 | 8 · The scoreboard | (none) | 8 · The scoreboard | COMMERCIAL | (none) | (none) | Heading |
| INV-08253 | 8 · The scoreboard | (none) | Metric · Week 4 target · Why this one | COMMERCIAL | (none) | (none) |  |
| INV-08254 | 8 · The scoreboard | (none) | Warm messages sent | COMMERCIAL | (none) | (none) | Warm messages sent · 100 · The only input fully in your control |
| INV-08255 | 8 · The scoreboard | (none) | Reply reasons logged | COMMERCIAL | (none) | (none) | Reply reasons logged · every reply · The content bank |
| INV-08256 | 8 · The scoreboard | (none) | Newsletter subscribers | COMMERCIAL | (none) | (none) | Newsletter subscribers · 50 · Small is fine. Real is not optional |
| INV-08257 | 8 · The scoreboard | (none) | Open rate · >40% · Below 30% means the list or the subject line is wrong | DEFECT | (none) | (none) |  |
| INV-08258 | 8 · The scoreboard | (none) | Conversations had | MONEY | (none) | (none) | Conversations had · 10 · ⭐ The only metric that predicts revenue |
| INV-08259 | 8 · The scoreboard | R1 | Free-10 runs offered | COMMERCIAL | (none) | (none) | Free-10 runs offered · 5 · Personally, per R1 |
| INV-08260 | 8 · The scoreboard | (none) | Clients · 1 · Everything else is a leading indicator of this | COMMERCIAL | (none) | (none) |  |
| INV-08261 | 9 · DECISIONS OWED — founder | (none) | 9 · DECISIONS OWED — founder | COMMERCIAL | (none) | (none) | Heading |
| INV-08262 | 9 · DECISIONS OWED — founder | (none) | Decision · Why it matters · Owner · When | COMMERCIAL | (none) | (none) |  |
| INV-08263 | 9 · DECISIONS OWED — founder | R2 | 1 · R2 — do you go public under your own name? · Gates founder posting and all paid ads. Everything else runs eithe… | GATE | (none) | (none) | 1 · R2 — do you go public under your own name? · Gates founder posting and all paid ads. Everything else runs either way · 🧍 · by … |
| INV-08264 | 9 · DECISIONS OWED — founder | #1 | 2 · If yes — which channel: LinkedIn, X, or Instagram? · LinkedIn is the obvious one for UK agency founders. Pick o… | COMMERCIAL | (none) | (none) | 2 · If yes — which channel: LinkedIn, X, or Instagram? · LinkedIn is the obvious one for UK agency founders. Pick one, not three ·… |
| INV-08265 | 9 · DECISIONS OWED — founder | (none) | 3 · Newsletter name and sending domain · news.get-kind.com recommended. Not the warming domains · 🧍 · Day 1 | COMMERCIAL | (none) | (none) |  |
| INV-08266 | 9 · DECISIONS OWED — founder | (none) | 4 · Publish day — Thursday recommended · Never moves once chosen · 🧍 · Day 1 | RULE | (none) | (none) |  |
| INV-08267 | 9 · DECISIONS OWED — founder | R1 | 5 · Does the M&V playbook stay the strategic source, given R1/R9 supersede two of its sections? · Recommendation: y… | COMMERCIAL | (none) | (none) | 5 · Does the M&V playbook stay the strategic source, given R1/R9 supersede two of its sections? · Recommendation: yes, keep it — m… |

## `docs/marketing/DAILY-PLAYBOOK.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Daily marketing playbook · **Lines:** 340 · **Material items in this source:** 150 · **Rows in this part:** 150 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08268 | 🎛 M&V — THE DAILY PLAYBOOK (GENERATED by scripts/build-playbook.sh — edit the SOURCE docs,… | (none) | 🎛 M&V — THE DAILY PLAYBOOK (GENERATED by scripts/build-playbook.sh — edit the SOURCE docs,… | COMMERCIAL | (none) | (none) | Heading |
| INV-08269 | 🎛 M&V — THE DAILY PLAYBOOK (GENERATED by scripts/build-playbook.sh — edit the SOURCE docs,… | (none) | For the M&V Marketing Claude Project. Ask "what do I do today?" with the date — the answer is the calendar row for … | RULE | (none) | (none) | Blockquote |
| INV-08270 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | (none) | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | COMMERCIAL | (none) | 12 Aug | Heading |
| INV-08271 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | (none) | Nothing below requires writing anything. Every post is finished in founder-content-playbook.md §6b with its link an… | COMMERCIAL | (none) | (none) |  |
| INV-08272 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … | R31 | THE RULED CADENCE (R31, 12 Aug): two posts a week — Tuesday and Thursday — plus ONE stats post a month. Thursday is… | RULE | (none) | 12 Aug |  |
| INV-08273 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | COMMERCIAL | (none) | 16 Aug | Heading |
| INV-08274 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08275 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Wed 13 · Dress the LinkedIn page (it is live — make it look alive): banner = mv-milla-portal.png from the site · ta… | RULE | (none) | (none) | Wed 13 · Dress the LinkedIn page (it is live — make it look alive): banner = mv-milla-portal.png from the site · tagline = the sit… |
| INV-08276 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | (none) | Thu 14 · POST 2 (Every reply, answered) — Thursday is the anchor day (W1) and stays the anchor day forever · gen-dr… | COMMERCIAL | (none) | (none) | Thu 14 · POST 2 (Every reply, answered) — Thursday is the anchor day (W1) and stays the anchor day forever · gen-drop-05-f0.png + … |
| INV-08277 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | R29 | Fri 15 · ~~Build beehiiv~~ PARKED (R29) — the founder builds it if and when he chooses. Instead: produce a carousel… | COMMERCIAL | ~~ | (none) | Fri 15 · ~~Build beehiiv~~ PARKED (R29) — the founder builds it if and when he chooses. Instead: produce a carousel (8 slides, spe… |
| INV-08278 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 1 · Wed 13 – Sat 16 Aug — exist by Friday | #1 | Sat 16 · W2 + W3: ~~draft newsletter #1~~ → bank next week's two posts from the reply reasons · top the warm list b… | COMMERCIAL | ~~ | (none) | Sat 16 · W2 + W3: ~~draft newsletter #1~~ → bank next week's two posts from the reply reasons · top the warm list back to 100 · — … |
| INV-08279 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | COMMERCIAL | (none) | 23 Aug | Heading |
| INV-08280 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08281 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Mon 18 · W4 review (20 min). Then preview get-kind.com/figsy.mp4 — a ~0.9MB clip that sits on the site linked from … | COMMERCIAL | (none) | (none) | Mon 18 · W4 review (20 min). Then preview get-kind.com/figsy.mp4 — a ~0.9MB clip that sits on the site linked from nowhere. Good? … |
| INV-08282 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Tue 19 · POST 3 (Pay for results, not promises) · gen-drop-03-hero.png + get-kind.com/drop-03 · 10 min | COMMERCIAL | (none) | (none) |  |
| INV-08283 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | #1 | Thu 21 · POST 4 (Why your emails never arrived) ~~+ send newsletter #1~~ (parked, R29) · gen-drop-04-hero.png + get… | RULE | ~~ | (none) | Thu 21 · POST 4 (Why your emails never arrived) ~~+ send newsletter #1~~ (parked, R29) · gen-drop-04-hero.png + get-kind.com/drop-… |
| INV-08284 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | R2 | Fri 22 · Record CLIP 1 — the approve moment. 30–60s silent screen capture of Milla: lead card → 👍 → "in sequence". … | COMMERCIAL | (none) | (none) | Fri 22 · Record CLIP 1 — the approve moment. 30–60s silent screen capture of Milla: lead card → 👍 → "in sequence". Caption overlay… |
| INV-08285 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 2 · Mon 18 – Sat 23 Aug — add the moving pictures | (none) | Sat 23 · W2 + W3 · — · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08286 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | COMMERCIAL | (none) | 30 Aug | Heading |
| INV-08287 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08288 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Mon 25 · W4 review. (A14 send-day is product-side — the calendar's only job this week is to keep publishing while i… | COMMERCIAL | (none) | (none) | Mon 25 · W4 review. (A14 send-day is product-side — the calendar's only job this week is to keep publishing while it happens) · — … |
| INV-08289 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Tue 26 · POST 5 (Your data is lying to you) · gen-drop-07-hero.png + get-kind.com/drop-07 · 10 min | COMMERCIAL | (none) | (none) |  |
| INV-08290 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | #2 | Thu 28 · POST 6 (Compliant by default) ~~+ newsletter #2~~ (parked, R29) · gen-drop-08-f0.png + get-kind.com/drop-0… | COMMERCIAL | ~~ | (none) | Thu 28 · POST 6 (Compliant by default) ~~+ newsletter #2~~ (parked, R29) · gen-drop-08-f0.png + get-kind.com/drop-08 · 10 min |
| INV-08291 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Fri 29 · CLIP 2 — the reply moment. Unibox: reply arrives → drafted answer → human approves it. Same rules as clip … | COMMERCIAL | (none) | (none) | Fri 29 · CLIP 2 — the reply moment. Unibox: reply arrives → drafted answer → human approves it. Same rules as clip 1 · your screen… |
| INV-08292 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 3 · Mon 25 – Sat 30 Aug — send-day week; the cadence does not blink | (none) | Sat 30 · W2 + W3 · — · Sat block | COMMERCIAL | (none) | (none) |  |
| INV-08293 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | COMMERCIAL | (none) | 5 Sep | Heading |
| INV-08294 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Day · Do · Asset · Time | COMMERCIAL | (none) | (none) |  |
| INV-08295 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Tue 2 · POST 7 (Filling roles while you sleep — recruitment vertical) — or hold it and repost the best performer so… | COMMERCIAL | (none) | (none) | Tue 2 · POST 7 (Filling roles while you sleep — recruitment vertical) — or hold it and repost the best performer so far; your call… |
| INV-08296 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | #3 | Thu 4 · POST 8 (From cold list to booked viewing — property vertical) ~~+ newsletter #3~~ (parked, R29). Then the M… | RULE | ~~ | (none) | Thu 4 · POST 8 (From cold list to booked viewing — property vertical) ~~+ newsletter #3~~ (parked, R29). Then the MONTHLY STATS PO… |
| INV-08297 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | (none) | Fri 5 · CLIP 3 — the research card. FIGSY's why-this-company reasoning on one (anonymised) prospect. Same rules · y… | COMMERCIAL | (none) | (none) | Fri 5 · CLIP 3 — the research card. FIGSY's why-this-company reasoning on one (anonymised) prospect. Same rules · your screen · 30… |
| INV-08298 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › Week 4 · Mon 1 – Fri 5 Sep — the verticals, then the month closes | §6 | Sat 6 · MONTHLY block (M1–M5) + refill the bank: §6's ideas take over — idea 1 ("would you approve this prospect?")… | IDEA | (none) | (none) | Sat 6 · MONTHLY block (M1–M5) + refill the bank: §6's ideas take over — idea 1 ("would you approve this prospect?") becomes availa… |
| INV-08299 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | (none) | The rules the whole calendar obeys | COMMERCIAL | (none) | (none) | Heading |
| INV-08300 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | R27 | Never claim our system found the reader until it has (R27, 12 Aug) · no unverified numbers (R11) · brand voice, com… | RULE | (none) | 12 Aug |  |
| INV-08301 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | (none) | Miss a day? Skip it, never stack it. The cadence is the asset. | RULE | (none) | (none) |  |
| INV-08302 | 3b · 📆 THE 30-DAY CALENDAR — dated, concrete, assets named (added 12 Aug on the founder's … › The rules the whole calendar obeys | §3 | After these 30 days the calendar regenerates from §3's rhythm + §6's ideas — this section is the bootstrap, not a f… | IDEA | (none) | (none) |  |
| INV-08303 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | (none) | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | COMMERCIAL | (none) | 12 Aug | Heading |
| INV-08304 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | (none) | These are not ideas. They are posts. Each one is built from a DROP episode that is already live on our own site, so… | IDEA | (none) | (none) |  |
| INV-08305 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | R2 | How to use them: paste into the LinkedIn company page (R2 permits the company page; no personal posting). One a wee… | OPERATING | (none) | (none) |  |
| INV-08306 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | RULE | (none) | (none) | Heading |
| INV-08307 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Attach: gen-drop-02-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08308 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | The sharpest hour of your day is going into list-building. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08309 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Not strategy. Not the pitch. Not the call that actually closes something. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08310 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Building lists and writing cold emails — work that never feels finished, and never moves the needle on its own. | RULE | (none) | (none) | Blockquote |
| INV-08311 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | And by the time prospecting is "done", the energy you needed for the work only you can do is gone. Tomorrow it rese… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08312 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | This is the quiet reason agency pipelines run hot and cold. It is not a discipline problem. The people best at winn… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08313 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | The fix is not working harder at the top of the funnel. It is not being the one who does that part. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08314 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | We wrote the whole thing up here: https://get-kind.com/drop-02 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08315 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | COMMERCIAL | (none) | (none) | Heading |
| INV-08316 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Attach: gen-drop-05-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08317 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | A prospect is at their warmest the second they hit send. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08318 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Every minute after that, the temperature drops. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08319 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Most teams measure their response time in hours. Some in days. The lead raised their hand and everyone was in a mee… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08320 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | By the time someone replies, the moment has gone — and often so has the prospect, off talking to whoever answered f… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08321 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | The uncomfortable part: this has nothing to do with how good your team is. It is a coverage problem. Nobody can sta… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08322 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | So the answer is not a faster human. It is something that never stops watching the inbox, drafts the reply, and han… | RULE | (none) | (none) | Blockquote |
| INV-08323 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Full piece: https://get-kind.com/drop-05 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08324 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | COMMERCIAL | (none) | (none) | Heading |
| INV-08325 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Attach: gen-drop-03-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08326 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Most sales tools bill you the same whether they work or not. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08327 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | You pay per seat for the promise of pipeline, and you carry all the risk if it never shows up. | RULE | (none) | (none) | Blockquote |
| INV-08328 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | It looked great in the demo, so you signed for a year. Six months later you are still paying for something nobody o… | MONEY | (none) | (none) | Blockquote |
| INV-08329 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | We think that is backwards, and we built our side of it differently: you approve a prospect, and that is the only t… | MONEY | (none) | (none) | Blockquote |
| INV-08330 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | That is not generosity. It is the only honest position for anyone claiming their outreach is any good. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08331 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Here is the argument in full: https://get-kind.com/drop-03 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08332 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | RULE | (none) | (none) | Heading |
| INV-08333 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Attach: gen-drop-04-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08334 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | You can write the perfect email to the perfect prospect and still lose. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08335 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Because it quietly lands in spam, and you never get the bounce, the reply, or the warning. | RULE | (none) | (none) | Blockquote |
| INV-08336 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | It is the most demoralising kind of failure: invisible. The campaign "sent". The dashboard says delivered. The sile… | RISK | (none) | (none) | Blockquote |
| INV-08337 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Delivered is not the same as read, and the gap between them is where most outbound programmes quietly die. Teams re… | RULE | (none) | (none) | Blockquote |
| INV-08338 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Deliverability is infrastructure, not wording. Warmed mailboxes, sane volumes, clean data, proper authentication. U… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08339 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | We wrote up what actually causes it: https://get-kind.com/drop-04 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08340 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | COMMERCIAL | (none) | (none) | Heading |
| INV-08341 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Attach: gen-drop-07-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08342 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Most pipelines run on numbers nobody actually checks. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08343 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Stale stages. "Qualified" leads that are not. Forecasts built on hope. | DEFECT | (none) | (none) | Blockquote |
| INV-08344 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | The dashboard looks confident. The data underneath is not. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08345 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | And you make real decisions on those numbers — hiring, spend, targets. When they are wrong, you do not find out at … | DEFECT | (none) | (none) | Blockquote |
| INV-08346 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | The honest version is less comfortable and more useful: fewer numbers, each one traceable to something that actuall… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08347 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | A prospect was contacted. A human replied. A meeting exists in a calendar. Everything else is decoration. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08348 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | COMMERCIAL | (none) | (none) | Heading |
| INV-08349 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | Attach: gen-drop-08-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08350 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | For a regulated business, outbound is a minefield. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08351 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | One non-compliant campaign — wrong consent, wrong data source, no opt-out — and the fine dwarfs any deal it could h… | RULE | (none) | (none) | Blockquote |
| INV-08352 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | So many firms do the safest thing available: nothing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08353 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | That fear is rational. It is also expensive in a quieter way. The pipeline stays small, and the growth that complia… | RULE | (none) | (none) | Blockquote |
| INV-08354 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | The way out is not courage. It is defaults. Lawful basis recorded, opt-out in every message, data sourced somewhere… | RULE | (none) | (none) | Blockquote |
| INV-08355 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | Do that and compliance stops being the thing you hope holds up. It becomes the thing that is true whether or not an… | RULE | (none) | (none) | Blockquote |
| INV-08356 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | The full breakdown: https://get-kind.com/drop-08 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08357 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08358 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Attach: gen-drop-01-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08359 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | The candidate who is perfect for the role is browsing jobs at 9pm. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08360 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | By the time anyone reaches out at 10am, they have already replied to someone faster. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08361 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | The list is long, the day is short, and the outreach that should have gone out last night did not — because there w… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08362 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Roles stay open. Good candidates are gone before you ever spoke to them. And the reason is almost never the quality… | RULE | (none) | (none) | Blockquote |
| INV-08363 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Speed is the whole product in recruitment, and speed is exactly what a human working office hours cannot give you. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08364 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | More on how we think about it: https://get-kind.com/drop-01 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08365 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08366 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Attach: gen-drop-06-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08367 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Most property teams sit on a list of names they know they should call. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08368 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | And never do — because showing the properties they already have leaves no time to open new conversations. | RULE | (none) | (none) | Blockquote |
| INV-08369 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | The list is not the problem. The hours are. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08370 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Prospecting is the first thing dropped when a viewing runs long or a deal needs chasing. So the cold list stays col… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08371 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Nothing about that is a motivation problem. It is arithmetic: the work that pays this month always beats the work t… | MONEY | (none) | (none) | Blockquote |
| INV-08372 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Written up here: https://get-kind.com/drop-06 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08373 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › After the eight | (none) | After the eight | COMMERCIAL | (none) | (none) | Heading |
| INV-08374 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › After the eight | (none) | Posts 1–6 are the ICP posts — lead with those, weekly, in that order. 7 and 8 are range, for when you are talking t… | COMMERCIAL | (none) | (none) |  |
| INV-08375 | The three extra posts + every DM script (source: warm-outreach-kit.md) | (none) | The three extra posts + every DM script (source: warm-outreach-kit.md) | COMMERCIAL | (none) | (none) | Heading |
| INV-08376 | Warm Outreach Kit — the messages you send this week | (none) | Warm Outreach Kit — the messages you send this week | COMMERCIAL | (none) | (none) | Heading |
| INV-08377 | Warm Outreach Kit — the messages you send this week | R1 | Origin: the Cowork bundle's traffic starter kit, absorbed 12 Aug and made lock-compliant. The personal messages kee… | COMMERCIAL | (none) | 12 Aug | Blockquote |
| INV-08378 | Warm Outreach Kit — the messages you send this week | (none) | The engine: build the warm-100 list → 5 personally-written messages a day (MARKETING-PLAN D1) → log every reply rea… | IDEA | (none) | (none) | Blockquote |
| INV-08379 | Engine 1 · Warm messages — personal, one-to-one | (none) | Engine 1 · Warm messages — personal, one-to-one | COMMERCIAL | (none) | (none) | Heading |
| INV-08380 | Engine 1 · Warm messages — personal, one-to-one | (none) | Opener A — past client / someone you've worked with | COMMERCIAL | (none) | (none) |  |
| INV-08381 | Engine 1 · Warm messages — personal, one-to-one | (none) | Hi [Name] — hope you and the team are well. I've built something I reckon you'd find useful. It's called FIGSY: an … | IDEA | (none) | (none) | Blockquote |
| INV-08382 | Engine 1 · Warm messages — personal, one-to-one | (none) | Opener B — founder peer / warm LinkedIn contact | COMMERCIAL | (none) | (none) |  |
| INV-08383 | Engine 1 · Warm messages — personal, one-to-one | (none) | Hey [Name] — pipeline's the eternal headache for agencies like yours, so this might land at a good time. I've been … | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08384 | Engine 1 · Warm messages — personal, one-to-one | (none) | [Name] — quick one. Want me to run your first 10 researched prospects, free? I've built an AI prospector for agenci… | IDEA | (none) | (none) | Blockquote |
| INV-08385 | Engine 1 · Warm messages — personal, one-to-one | (none) | Follow-up 1 — 3–4 days, no reply | COMMERCIAL | (none) | (none) |  |
| INV-08386 | Engine 1 · Warm messages — personal, one-to-one | (none) | No worries if the timing's off, [Name] — just bumping this in case it got buried. The offer stands whenever you fan… | RULE | (none) | (none) | Blockquote |
| INV-08387 | Engine 1 · Warm messages — personal, one-to-one | (none) | Follow-up 2 — a week later, close the loop | COMMERCIAL | (none) | (none) |  |
| INV-08388 | Engine 1 · Warm messages — personal, one-to-one | (none) | Last nudge from me, [Name] — I'll leave you in peace. If it's not for you, no problem at all. And if anyone in your… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08389 | Engine 1 · Warm messages — personal, one-to-one | (none) | Referral ask — non-buyers and the wider network | COMMERCIAL | (none) | (none) |  |
| INV-08390 | Engine 1 · Warm messages — personal, one-to-one | (none) | Quick favour, [Name] — do you know any agency or consultancy founders who'd like a steadier pipeline? I'm setting a… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08391 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | R2 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | COMMERCIAL | (none) | (none) | Heading |
| INV-08392 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | The best salesperson in most agencies is the founder. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08393 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Who's also far too busy delivering to actually sell. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08394 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | So business development becomes whoever has a spare hour — which is no one. The pipeline goes quiet the moment thin… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08395 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Referrals paper over it. Until they don't. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08396 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | And hiring someone to prospect is slow, expensive — and now you're managing a hire instead of your clients. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08397 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | The problem was never being bad at winning work. It's that the person best at it has no time to do it. | RULE | (none) | (none) | Blockquote |
| INV-08398 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | That's what FIGSY exists to fix — an AI prospector that does the chasing, so the humans can do the closing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08399 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | If that's your pipeline, tell us who you sell to — we'll show you what it could look like. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08400 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Post 2 · the mechanism | COMMERCIAL | (none) | (none) |  |
| INV-08401 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | AI should do the chasing. Humans should do the closing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08402 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | You say who your ideal client is. FIGSY finds companies that match, researches each one — who the decision-maker is… | OPERATING | (none) | (none) | Blockquote |
| INV-08403 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Approve or pass with a tap. Nothing goes out without your say-so. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08404 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | No SDR to manage. No cold list to wade through. Researched prospects, ready to review — and you stay in control of … | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08405 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Curious what that looks like for your agency? Send us who you sell to. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08406 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Post 3 · the point of view | COMMERCIAL | (none) | (none) |  |
| INV-08407 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | Most AI outreach tools just help you spam faster. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08408 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | More sends, more sequences, more "personalisation" that fools no one — into inboxes that stopped reading. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08409 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | We think that's backwards. The hard part of outbound was never the sending. It's knowing who is worth contacting an… | RULE | (none) | (none) | Blockquote |
| INV-08410 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | So that's what the AI should do: the finding, the researching, the qualifying. The human stays where humans win — t… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08411 | Engine 2 · Content posts — public, brand-voiced (company page — R2) | (none) | AI does the chasing. Humans do the closing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08412 | What was deliberately NOT carried over | (none) | What was deliberately NOT carried over | COMMERCIAL | (none) | (none) | Heading |
| INV-08413 | What was deliberately NOT carried over | R21 | Public free-10 CTAs ("I'll research your first 10 free 👉 [link]") on posts | COMMERCIAL | (none) | (none) | Public free-10 CTAs ("I'll research your first 10 free 👉 [link]") on posts · R21 — a public post offering the 10 to anyone is a pu… |
| INV-08414 | What was deliberately NOT carried over | (none) | "No card, no calls" reassurance lines in public copy | RULE | (none) | 24 Jul | "No card, no calls" reassurance lines in public copy · The no-freebies lock (24 Jul); fine for you to SAY in a personal exchange, … |
| INV-08415 | What was deliberately NOT carried over | R21 | CTA links to a free-10 landing page | COMMERCIAL | (none) | (none) | CTA links to a free-10 landing page · The page is parked (R21) — see bundle-source/README |
| INV-08416 | The carousels — the no-camera video format | (none) | The carousels — the no-camera video format | COMMERCIAL | (none) | (none) | Heading |
| INV-08417 | The carousels — the no-camera video format | (none) | When asked for a NEW carousel, produce slide text in this exact shape: 8 slides · one thought per slide · slide 1 =… | COMMERCIAL | (none) | (none) |  |

## `docs/marketing/README-marketing.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Marketing folder index · **Lines:** 88 · **Material items in this source:** 45 · **Rows in this part:** 45 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08418 | 📣 Marketing docs — start here | (none) | 📣 Marketing docs — start here | COMMERCIAL | (none) | (none) | Heading |
| INV-08419 | 📣 Marketing docs — start here | #632 | Inventory id: #632 — the id R6 reserved on 6 Aug for exactly this. Not a fifth core doc: these are operational docs… | OPERATING | (none) | 6 Aug |  |
| INV-08420 | The six files | (none) | The six files | OPERATING | (none) | (none) | Heading |
| INV-08421 | The six files | (none) | File · What it's for · Read when | OPERATING | (none) | (none) |  |
| INV-08422 | The six files | (none) | 1 · MARKETING-PLAN.md · ⭐ The master doc. Strategy, the growth loop, and the daily / weekly / monthly actions. The … | RULE | (none) | (none) | 1 · MARKETING-PLAN.md · ⭐ The master doc. Strategy, the growth loop, and the daily / weekly / monthly actions. The locks that gate… |
| INV-08423 | The six files | (none) | 2 · founder-led-marketing-system.md · The strategy in plain language — why warm before public, why the list matters… | IDEA | (none) | (none) | 2 · founder-led-marketing-system.md · The strategy in plain language — why warm before public, why the list matters, the 30-day pl… |
| INV-08424 | The six files | (none) | 3 · beehiiv-setup-checklist.md · Tickable build steps: publication, landing page, welcome sequence, weekly template… | OPERATING | (none) | (none) | 3 · beehiiv-setup-checklist.md · Tickable build steps: publication, landing page, welcome sequence, weekly template · While you bu… |
| INV-08425 | The six files | §1 | 4 · founder-content-playbook.md · POV, four pillars, the content bank, weekly rhythm, 10 post ideas, newsletter tem… | IDEA | (none) | (none) | 4 · founder-content-playbook.md · POV, four pillars, the content bank, weekly rhythm, 10 post ideas, newsletter template · §1–3 to… |
| INV-08426 | The six files | R2 | 5 · paid-ads-phase-plan.md · 🔒 Prerequisites, channel choice, 4-week test, kill rules · Not yet. When R2 and R7 bot… | OPERATING | 🔒 | (none) | 5 · paid-ads-phase-plan.md · 🔒 Prerequisites, channel choice, 4-week test, kill rules · Not yet. When R2 and R7 both open |
| INV-08427 | The six files | (none) | 0 · GTM-STRATEGY.md · ⭐ THE STRATEGY — the two engines (acquisition + depth), the 10× arithmetic, the control wedge… | COMMERCIAL | (none) | (none) | 0 · GTM-STRATEGY.md · ⭐ THE STRATEGY — the two engines (acquisition + depth), the 10× arithmetic, the control wedge, evidence-trig… |
| INV-08428 | The six files | R21 | 7 · voice.md · ⭐ THE brand voice — locked facts, banned words, pillars, output specs, the DROP Show. Absorbed 12 Au… | RULE | (none) | 12 Aug | 7 · voice.md · ⭐ THE brand voice — locked facts, banned words, pillars, output specs, the DROP Show. Absorbed 12 Aug from the Cowo… |
| INV-08429 | The six files | R21 | 8 · warm-outreach-kit.md · The actual messages — openers, follow-ups, referral ask (personal, free-10 allowed) + 3 … | COMMERCIAL | (none) | (none) | 8 · warm-outreach-kit.md · The actual messages — openers, follow-ups, referral ask (personal, free-10 allowed) + 3 brand posts (pu… |
| INV-08430 | The six files | R21 | 9 · bundle-source/ · ⚠️ HISTORICAL — the raw Cowork bundle, parked. Includes the free-10 landing page (R21-parked) … | OPERATING | ⚠️ | (none) | 9 · bundle-source/ · ⚠️ HISTORICAL — the raw Cowork bundle, parked. Includes the free-10 landing page (R21-parked) and the DNS war… |
| INV-08431 | The six files | (none) | 6 · marketing-metrics-and-iteration.md · The seven numbers, the Monday review, More→Better→New, kill rules · Every … | COMMERCIAL | (none) | (none) | 6 · marketing-metrics-and-iteration.md · The seven numbers, the Monday review, More→Better→New, kill rules · Every Monday, 20 minu… |
| INV-08432 | Suggested order | (none) | Suggested order | OPERATING | (none) | (none) | Heading |
| INV-08433 | Suggested order | (none) | MARKETING-PLAN.md — the whole thing, especially the two locks at the top | IDEA | (none) | (none) |  |
| INV-08434 | Suggested order | §1 | founder-content-playbook.md §1 and §3 — write your POV, start the content bank | OPERATING | (none) | (none) |  |
| INV-08435 | Suggested order | (none) | beehiiv-setup-checklist.md — build it | OPERATING | (none) | (none) |  |
| INV-08436 | Suggested order | §4 | founder-led-marketing-system.md §4 — run week 1 | COMMERCIAL | (none) | (none) |  |
| INV-08437 | Suggested order | (none) | Every Monday (20 min) | OPERATING | (none) | (none) |  |
| INV-08438 | Suggested order | §2 | marketing-metrics-and-iteration.md §2 — the review | COMMERCIAL | (none) | (none) |  |
| INV-08439 | Suggested order | (none) | paid-ads-phase-plan.md — finished and waiting. Costs nothing to leave closed | MONEY | (none) | (none) |  |
| INV-08440 | What is gated, and by what | (none) | What is gated, and by what | GATE | 🔒 | (none) | Heading |
| INV-08441 | What is gated, and by what | (none) | Gate · Lock · Blocks · Opens when | GATE | (none) | (none) |  |
| INV-08442 | What is gated, and by what | R2 | Public posting | RULE | (none) | 6 Aug | Public posting · R2 (6 Aug, re-affirmed 11 Aug) — "No personal announcement" · Founder posting under your own name · You rule. Rec… |
| INV-08443 | What is gated, and by what | R1 | The free-10 as a public offer | RULE | (none) | 6 Aug | The free-10 as a public offer · R1 (6 Aug) — "never pre-built, never in code, never on the site" · Any public Free10 landing offer… |
| INV-08444 | What is gated, and by what | R2 | Paid ads · R2 + R7 · All ad spend · 3+ clients, floor covered, message proven | COMMERCIAL | (none) | (none) |  |
| INV-08445 | What is gated, and by what | (none) | About 80% of the system runs with both locks fully in force. That is the point of the design, not a workaround. | OPERATING | (none) | (none) |  |
| INV-08446 | How often to revisit | (none) | How often to revisit | OPERATING | (none) | (none) | Heading |
| INV-08447 | How often to revisit | (none) | Doc · Revisit · Trigger | OPERATING | (none) | (none) |  |
| INV-08448 | How often to revisit | §1 | MARKETING-PLAN.md §1 one-page table | RULE | (none) | (none) | MARKETING-PLAN.md §1 one-page table · Monthly · Only in a review — never ad hoc mid-week |
| INV-08449 | How often to revisit | (none) | marketing-metrics-and-iteration.md | COMMERCIAL | (none) | (none) | marketing-metrics-and-iteration.md · Weekly · It is the weekly ritual |
| INV-08450 | How often to revisit | R2 | founder-content-playbook.md | OPERATING | (none) | (none) | founder-content-playbook.md · Monthly · When a pillar stops working, or R2 lifts |
| INV-08451 | How often to revisit | §7 | beehiiv-setup-checklist.md | OPERATING | (none) | (none) | beehiiv-setup-checklist.md · Once · Then only for the standing checks in §7 |
| INV-08452 | How often to revisit | (none) | paid-ads-phase-plan.md | GATE | (none) | (none) | paid-ads-phase-plan.md · When the gates open · Then re-read fully before spending |
| INV-08453 | How often to revisit | (none) | founder-led-marketing-system.md | COMMERCIAL | (none) | (none) | founder-led-marketing-system.md · Quarterly · Or when the strategy genuinely changes |
| INV-08454 | Two rules that can cost you weeks | (none) | Two rules that can cost you weeks | MONEY | (none) | (none) | Heading |
| INV-08455 | Two rules that can cost you weeks | (none) | ⛔ Never authenticate kindoutreach.com or trykind.org in beehiiv. Those are the four warming mailboxes, warm since 4… | RULE | (none) | 4 Aug |  |
| INV-08456 | Two rules that can cost you weeks | (none) | ⛔ Never change gettingkind.com MX. That is Resend inbound reply-capture — the path proved end-to-end in A18. It bre… | RULE | (none) | (none) |  |
| INV-08457 | Where this came from | (none) | Where this came from | OPERATING | (none) | (none) | Heading |
| INV-08458 | Where this came from | (none) | The founder's M&V Lead Generation Master Playbook (36pp) — Core Four, More/Better/New, Rule of 100, the one-page pl… | MONEY | (none) | (none) |  |
| INV-08459 | Where this came from | §02 | Two of its sections are superseded by later founder rulings and are marked in MARKETING-PLAN.md: §02 Brand Architec… | RULE | ⚠️ ⛓️ | 15 Aug |  |
| INV-08460 | Where this came from | (none) | The founder's beehiiv / Big Desk Energy / Morning Brew brief, 11 Aug. | OPERATING | (none) | 11 Aug. |  |
| INV-08461 | One unverified number | (none) | One unverified number | OPERATING | (none) | (none) | Heading |
| INV-08462 | One unverified number | (none) | beehiiv's pricing has NOT been read. beehiiv.com is blocked by this environment's egress proxy. The "$0 added to th… | MONEY | (none) | (none) |  |

## `docs/marketing/CLAUDE-PROJECT-INSTRUCTIONS.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Marketing agent project instructions · **Lines:** 78 · **Material items in this source:** 45 · **Rows in this part:** 45 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08463 | 📋 Instructions for the "M&V Marketing" Claude Project | (none) | 📋 Instructions for the "M&V Marketing" Claude Project | COMMERCIAL | (none) | (none) | Heading |
| INV-08464 | 📋 Instructions for the "M&V Marketing" Claude Project | (none) | What this file is. The founder runs marketing in a separate Claude.ai Project so Claude Code stays for code, produc… | COMMERCIAL | (none) | 12 Aug | Blockquote |
| INV-08465 | 📋 Instructions for the "M&V Marketing" Claude Project | (none) | Why this file exists at all: the last parallel marketing chat (the Cowork bundle) never read the register — it prod… | MONEY | ⚠️ | (none) | Blockquote |
| INV-08466 | 📋 Instructions for the "M&V Marketing" Claude Project | R29 | Regenerated 12 Aug for R29–R33 and the corrected seat model (the Project produces the assets; Claude Code does not … | COMMERCIAL | (none) | 12 Aug | Blockquote |
| INV-08467 | Paste everything below this line into the Project's instructions | (none) | Paste everything below this line into the Project's instructions | OPERATING | (none) | (none) | Heading |
| INV-08468 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | The brand, fixed | OPERATING | (none) | (none) | Heading |
| INV-08469 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | M&V (Milla & Vida) is the trading brand the public sees. K.I.N.D Technologies is the registered company — named onl… | RULE | (none) | (none) |  |
| INV-08470 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | Products: FIGSY = the AI prospector. Milla = the client portal where leads are approved. Vida = internal operator r… | RULE | (none) | (none) |  |
| INV-08471 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | One-liner: M&V builds your pipeline. FIGSY does the heavy lifting. You stay in control inside Milla. | OPERATING | (none) | (none) |  |
| INV-08472 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | The wedge, one line: "You approve every prospect before anyone is contacted." | OPERATING | (none) | (none) |  |
| INV-08473 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | POV: "AI should do the chasing. Humans should do the closing." | OPERATING | (none) | (none) |  |
| INV-08474 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | ICP: founders of agencies and consultancies, ~5–30 staff, referral-dependent. Global, US/UK primary. | OPERATING | (none) | (none) |  |
| INV-08475 | Paste everything below this line into the Project's instructions › The brand, fixed | (none) | The offer: $299 to start — 100 approved leads included — then $4 per approved lead. These are the only two money fi… | MONEY | (none) | (none) |  |
| INV-08476 | Paste everything below this line into the Project's instructions › Voice | (none) | Voice | OPERATING | (none) | (none) | Heading |
| INV-08477 | Paste everything below this line into the Project's instructions › The cadence | (none) | The cadence | OPERATING | (none) | (none) | Heading |
| INV-08478 | Paste everything below this line into the Project's instructions › The cadence | (none) | Two posts a week — Tuesday and Thursday. Thursday is the DROP anchor (Problem → Impact → Solution → ROI). Plus ONE … | OPERATING | (none) | (none) |  |
| INV-08479 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | The hard rules — each is a founder ruling; none is negotiable here | OPERATING | (none) | (none) | Heading |
| INV-08480 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | Never claim our system found, researched or emailed the reader. Nothing has been sent yet. This applies to posts, c… | RULE | (none) | (none) |  |
| INV-08481 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | No free-10 in anything public. It appears ONLY in personal one-to-one DMs from the founder to a named person. A pub… | OPERATING | (none) | (none) |  |
| INV-08482 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | No freebie framing. Ever. No free-to-start wording, no reassurance that a card isn't needed, no trial of any length… | OPERATING | (none) | (none) |  |
| INV-08483 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | Brand-voiced always. "We" voice, company page. Never the founder's name, never "I built…", never anything tying a r… | RULE | (none) | (none) |  |
| INV-08484 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | NUMBERS: you never generate, compute or estimate one. Not a percentage, not a benchmark, not "agencies typically se… | RULE | (none) | (none) |  |
| INV-08485 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | No paid-ads copy unless the founder says the ads gate has opened. | GATE | (none) | (none) |  |
| INV-08486 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | CTA is the website — get-kind.com. The newsletter is parked — do not write one, schedule one, or point a CTA at one… | RULE | (none) | (none) |  |
| INV-08487 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | Imagery defaults to the site's own library (the DROP artwork, product screenshots, the logo) — that is what keeps t… | OPERATING | (none) | (none) |  |
| INV-08488 | Paste everything below this line into the Project's instructions › The hard rules — each is a founder ruling; none is negotiable here | (none) | You draft and you produce; the founder distributes. Nothing is live until he posts it. Never suggest auto-posting o… | RULE | (none) | (none) |  |
| INV-08489 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | The five seats — know whose job is whose | OPERATING | (none) | (none) | Heading |
| INV-08490 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | Head of Marketing = the repo (docs/marketing in your knowledge). Owns strategy, the calendar, the locks, the offer.… | RULE | (none) | (none) |  |
| INV-08491 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | Content Manager = YOU. Asked "what do I do today?" with a date → give that day's row from DAILY-PLAYBOOK.md plus th… | IDEA | (none) | (none) |  |
| INV-08492 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | Designer = ALSO YOU. You produce the assets: carousels (8 slides — 1 hook, 2–7 the argument, 8 always "We find your… | RULE | (none) | (none) |  |
| INV-08493 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | Distribution = the founder, only. He presses post, sends the 5 daily DMs, uploads the files. Your job is to make th… | OPERATING | (none) | (none) |  |
| INV-08494 | Paste everything below this line into the Project's instructions › The five seats — know whose job is whose | (none) | Analytics = the Monday review. Given the week's numbers (posts run, replies and their REASONS, DMs sent), run it: w… | RULE | (none) | (none) |  |
| INV-08495 | Paste everything below this line into the Project's instructions › What you work FROM | (none) | What you work FROM | OPERATING | (none) | (none) | Heading |
| INV-08496 | Paste everything below this line into the Project's instructions › What you work FROM | (none) | DAILY-PLAYBOOK.md — the calendar plus every finished post, DM and format, in one file. Start here. | OPERATING | (none) | (none) |  |
| INV-08497 | Paste everything below this line into the Project's instructions › What you work FROM | (none) | voice.md — the full voice spec and the output specs (post · stats post · carousel · video · cold outreach). It wins… | COMMERCIAL | (none) | (none) |  |
| INV-08498 | Paste everything below this line into the Project's instructions › What you work FROM | (none) | GTM-ONE-PAGE.md — avatar, offer, channels, daily numbers. | MONEY | (none) | (none) |  |
| INV-08499 | Paste everything below this line into the Project's instructions › What you work FROM | §0 | MARKETING-PLAN.md — §0 what is live, §3 the daily/weekly/monthly rhythm, §3b the dated calendar. | IDEA | (none) | (none) |  |
| INV-08500 | Paste everything below this line into the Project's instructions › When something is beyond your remit | (none) | When something is beyond your remit | OPERATING | (none) | (none) | Heading |
| INV-08501 | End of paste | (none) | End of paste | OPERATING | (none) | (none) | Heading |
| INV-08502 | Founder setup — once | (none) | Founder setup — once | OPERATING | (none) | (none) | Heading |
| INV-08503 | Founder setup — once | (none) | claude.ai → Projects → M&V Marketing → Instructions (pencil icon) → paste the block above, replacing what is there. | COMMERCIAL | (none) | (none) |  |
| INV-08504 | Founder setup — once | (none) | Context → + → connect GitHub → jacquesvieiraza-blip/KIND → docs/marketing. Re-sync after any marketing PR merges — … | COMMERCIAL | (none) | (none) |  |
| INV-08505 | Founder setup — once | (none) | Wire-check: "What do I do today?" with a date. A correct answer names the day's post, its image and its link, from … | OPERATING | (none) | (none) |  |
| INV-08506 | Founder setup — once | (none) | The old Cowork daily agent stays paused unless re-pointed at voice.md — it still carries the pre-ruling skill (publ… | OPERATING | ⚠️ | (none) |  |
| INV-08507 | Founder setup — once | P12 | Division of labour: the Project = all marketing words and assets, on demand, on the go. Claude Code = code, product… | IDEA | (none) | (none) |  |

## `docs/marketing/beehiiv-setup-checklist.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Beehiiv setup checklist · **Lines:** 195 · **Material items in this source:** 79 · **Rows in this part:** 79 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08508 | beehiiv Setup Checklist | (none) | beehiiv Setup Checklist | OPERATING | (none) | (none) | Heading |
| INV-08509 | beehiiv Setup Checklist | (none) | Tick these off in order. Roughly 3 hours end to end, splittable across a week. | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08510 | beehiiv Setup Checklist | (none) | Pricing is UNVERIFIED. beehiiv.com is blocked by this environment's egress proxy, so no price on this page has been… | MONEY | ⚠️ | (none) | Blockquote |
| INV-08511 | ⛔ STOP — the two rules that can cost you three weeks | (none) | ⛔ STOP — the two rules that can cost you three weeks | MONEY | (none) | (none) | Heading |
| INV-08512 | ⛔ STOP — the two rules that can cost you three weeks › Rule 1 · NEVER authenticate a warming domain in beehiiv | (none) | Rule 1 · NEVER authenticate a warming domain in beehiiv | RULE | (none) | (none) | Heading |
| INV-08513 | ⛔ STOP — the two rules that can cost you three weeks › Rule 1 · NEVER authenticate a warming domain in beehiiv | (none) | Do not put kindoutreach.com or trykind.org into beehiiv. Ever. | COMMERCIAL | (none) | (none) |  |
| INV-08514 | ⛔ STOP — the two rules that can cost you three weeks › Rule 2 · NEVER change gettingkind.com MX records | (none) | Rule 2 · NEVER change gettingkind.com MX records | RULE | (none) | (none) | Heading |
| INV-08515 | 1 · Create the publication | (none) | 1 · Create the publication | OPERATING | (none) | (none) | Heading |
| INV-08516 | 1 · Create the publication | (none) | ☐ · Sign up at beehiiv, create a publication · Use jacques@get-kind.com | OPERATING | (none) | (none) |  |
| INV-08517 | 1 · Create the publication | (none) | ☐ · Check the pricing tiers yourself and note what the free tier caps at · Subscriber limit · custom domain? · auto… | MONEY | (none) | (none) | ☐ · Check the pricing tiers yourself and note what the free tier caps at · Subscriber limit · custom domain? · automations? |
| INV-08518 | 1 · Create the publication | (none) | ☐ · Publication name · Decision owed — see below | OPERATING | (none) | (none) |  |
| INV-08519 | 1 · Create the publication | (none) | ☐ · Description, one sentence · "[WHAT YOU HELP WITH], for [YOUR NICHE]. One short email a week." | OPERATING | (none) | (none) |  |
| INV-08520 | 1 · Create the publication | (none) | ☐ · Upload logo / favicon · Reuse the K.I.N.D mark | OPERATING | (none) | (none) |  |
| INV-08521 | 1 · Create the publication | (none) | ☐ · Set the timezone to UK · Sends fire in local time | OPERATING | (none) | (none) |  |
| INV-08522 | 1 · Create the publication | (none) | ☐ · Set the publish day and NEVER move it · Thursday recommended | RULE | (none) | (none) |  |
| INV-08523 | 1 · Create the publication | (none) | Naming — pick a lane, don't agonise | OPERATING | (none) | (none) |  |
| INV-08524 | 1 · Create the publication | (none) | Describe the value — e.g. "The Pipeline Note", "Ten Prospects". Easier to grow, works without you. | OPERATING | (none) | (none) |  |
| INV-08525 | 1 · Create the publication | R2 | Your own name. ⚠️ Blocked by R2 while stealth holds — it is a personal announcement by definition. | RULE | ⚠️ | (none) |  |
| INV-08526 | 1 · Create the publication | R2 | → Recommendation: a value name. It survives R2 either way and does not need re-doing when the gate opens. | GATE | (none) | (none) |  |
| INV-08527 | 2 · The landing page — ONE ask | (none) | 2 · The landing page — ONE ask | OPERATING | (none) | (none) | Heading |
| INV-08528 | 2 · The landing page — ONE ask | (none) | ☐ · Enable beehiiv's landing page | OPERATING | (none) | (none) |  |
| INV-08529 | 2 · The landing page — ONE ask | (none) | ☐ · Headline — the reader's problem, not your product | OPERATING | (none) | (none) |  |
| INV-08530 | 2 · The landing page — ONE ask | (none) | ☐ · Subhead — what they get and how often | OPERATING | (none) | (none) |  |
| INV-08531 | 2 · The landing page — ONE ask | (none) | ☐ · One field: email. One button. · Every extra field costs signups | MONEY | (none) | (none) |  |
| INV-08532 | 2 · The landing page — ONE ask | (none) | ☐ · Delete everything else · No nav, no pricing, no "learn more", no social icons | MONEY | (none) | (none) |  |
| INV-08533 | 2 · The landing page — ONE ask | (none) | ☐ · Add one line of proof, if you have any · Skip it entirely rather than invent one | OPERATING | (none) | (none) |  |
| INV-08534 | 2 · The landing page — ONE ask | (none) | ☐ · Check it on your phone · Most opens are mobile | OPERATING | (none) | (none) |  |
| INV-08535 | 2 · The landing page — ONE ask | (none) | Copy template — adapt, don't ship verbatim | OPERATING | (none) | (none) |  |
| INV-08536 | 2 · The landing page — ONE ask | (none) | Still chasing pipeline between client work? | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08537 | 2 · The landing page — ONE ask | (none) | Every week: one short note on building predictable B2B pipeline without turning your senior people into full-time p… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08538 | 2 · The landing page — ONE ask | (none) | "Get your 10 free prospects" | OPERATING | ❌ | (none) |  |
| INV-08539 | 2 · The landing page — ONE ask | (none) | Any free-tier or trial promise | OPERATING | ❌ | (none) |  |
| INV-08540 | 2 · The landing page — ONE ask | (none) | The free-10 is offered by you, in a reply or a call, to a named person. That is the whole ruling. | OPERATING | (none) | (none) |  |
| INV-08541 | 3 · Signup forms and popups | (none) | 3 · Signup forms and popups | OPERATING | (none) | (none) | Heading |
| INV-08542 | 3 · Signup forms and popups | (none) | ☐ · Generate the embeddable form · For later use | OPERATING | (none) | (none) |  |
| INV-08543 | 3 · Signup forms and popups | P12 | ☐ · ⚠️ Do NOT embed on get-kind.com yet · The site is founder-locked (P12). Flag it, don't edit it | RULE | ⚠️ | (none) |  |
| INV-08544 | 3 · Signup forms and popups | (none) | ☐ · Popup: exit-intent only, desktop · Timed popups on a site with no traffic annoy the few visitors you have | OPERATING | (none) | (none) |  |
| INV-08545 | 3 · Signup forms and popups | R2 | ☐ · Add the link to your LinkedIn company page · R2 permits the company page | OPERATING | (none) | (none) |  |
| INV-08546 | 3 · Signup forms and popups | (none) | ☐ · Add it to your email signature · Free, permanent, works today | OPERATING | (none) | (none) |  |
| INV-08547 | 4 · The welcome sequence — 4 emails | (none) | 4 · The welcome sequence — 4 emails | OPERATING | (none) | (none) | Heading |
| INV-08548 | 4 · The welcome sequence — 4 emails | (none) | ☐ · # · Timing · Job · Structure | OPERATING | (none) | (none) |  |
| INV-08549 | 4 · The welcome sequence — 4 emails | (none) | ☐ · 1 · Immediate · Confirm + deliver something now · Thanks · what to expect · one useful thing immediately · what… | OPERATING | (none) | (none) | ☐ · 1 · Immediate · Confirm + deliver something now · Thanks · what to expect · one useful thing immediately · what day it lands |
| INV-08550 | 4 · The welcome sequence — 4 emails | (none) | ☐ · 2 · Day 2 · Why you built this · Short founder story · the problem you saw · what you believe. No pitch | OPERATING | (none) | (none) |  |
| INV-08551 | 4 · The welcome sequence — 4 emails | (none) | ☐ · 3 · Day 5 · Show the machine thinking · One real example: a prospect it picked and why. This is your differenti… | OPERATING | (none) | (none) | ☐ · 3 · Day 5 · Show the machine thinking · One real example: a prospect it picked and why. This is your differentiator |
| INV-08552 | 4 · The welcome sequence — 4 emails | (none) | ☐ · 4 · Day 9 · The soft ask · "Reply and tell me what you're working on." ⭐ A reply is the goal — not a click | OPERATING | (none) | (none) |  |
| INV-08553 | 4 · The welcome sequence — 4 emails › Email 1 — placeholder copy | (none) | Email 1 — placeholder copy | OPERATING | (none) | (none) | Heading |
| INV-08554 | 4 · The welcome sequence — 4 emails › Email 1 — placeholder copy | (none) | Subject: You're in — here's the first one | OPERATING | (none) | (none) | Blockquote |
| INV-08555 | 4 · The welcome sequence — 4 emails › Email 1 — placeholder copy | (none) | Every [DAY] you'll get one short note on [YOUR NICHE]. Real examples from real pipeline work. No theory, no "AI is … | OPERATING | (none) | (none) | Blockquote |
| INV-08556 | 4 · The welcome sequence — 4 emails › Email 1 — placeholder copy | (none) | To start, one thing worth knowing today | OPERATING | (none) | (none) | Blockquote |
| INV-08557 | 4 · The welcome sequence — 4 emails › Email 1 — placeholder copy | (none) | [ONE GENUINELY USEFUL INSIGHT — 3 sentences] | OPERATING | (none) | (none) | Blockquote |
| INV-08558 | 4 · The welcome sequence — 4 emails › Email 4 — the one that matters | (none) | Email 4 — the one that matters | OPERATING | (none) | (none) | Heading |
| INV-08559 | 4 · The welcome sequence — 4 emails › Email 4 — the one that matters | (none) | You've had a few of these now, so a quick question. | OPERATING | (none) | (none) | Blockquote |
| INV-08560 | 4 · The welcome sequence — 4 emails › Email 4 — the one that matters | (none) | What's the pipeline problem you're actually trying to solve right now? | OPERATING | (none) | (none) | Blockquote |
| INV-08561 | 4 · The welcome sequence — 4 emails › Email 4 — the one that matters | (none) | Hit reply and tell me. I read every one, and it shapes what I write about. | OPERATING | (none) | (none) | Blockquote |
| INV-08562 | 5 · The weekly issue template | (none) | 5 · The weekly issue template | OPERATING | (none) | (none) | Heading |
| INV-08563 | 5 · The weekly issue template | (none) | ☐ · Build one reusable template | OPERATING | (none) | (none) |  |
| INV-08564 | 5 · The weekly issue template | (none) | ☐ · Same structure every week — the reader learns where to look | OPERATING | (none) | (none) |  |
| INV-08565 | 5 · The weekly issue template | (none) | ☐ · 300–500 words. If it takes longer than 3 minutes, cut it | OPERATING | (none) | (none) |  |
| INV-08566 | 5 · The weekly issue template | (none) | ☐ · Plain text look — designed newsletters read like marketing | COMMERCIAL | (none) | (none) |  |
| INV-08567 | 5 · The weekly issue template | (none) | Tone: how you'd explain it to a founder in a pub. Short sentences. No "leverage", "synergy", "unlock", "game-change… | OPERATING | (none) | (none) |  |
| INV-08568 | 6 · Before you send issue #1 | #1 | 6 · Before you send issue #1 | OPERATING | (none) | (none) | Heading |
| INV-08569 | 6 · Before you send issue #1 | (none) | ☐ · Sending domain is NOT kindoutreach.com or trykind.org | COMMERCIAL | (none) | (none) |  |
| INV-08570 | 6 · Before you send issue #1 | (none) | ☐ · gettingkind.com MX untouched | OPERATING | (none) | (none) |  |
| INV-08571 | 6 · Before you send issue #1 | (none) | ☐ · SPF / DKIM verified for whatever domain you did use | OPERATING | (none) | (none) |  |
| INV-08572 | 6 · Before you send issue #1 | (none) | ☐ · Sent yourself a test — checked on phone and desktop | OPERATING | (none) | (none) |  |
| INV-08573 | 6 · Before you send issue #1 | (none) | ☐ · Every link clicked | OPERATING | (none) | (none) |  |
| INV-08574 | 6 · Before you send issue #1 | (none) | ☐ · Unsubscribe link present and working (legally required — ICO/PECR) | RULE | (none) | (none) |  |
| INV-08575 | 6 · Before you send issue #1 | (none) | ☐ · Physical address in the footer (also required) | OPERATING | (none) | (none) |  |
| INV-08576 | 6 · Before you send issue #1 | (none) | ☐ · Welcome sequence tested with a real second email address | OPERATING | (none) | (none) |  |
| INV-08577 | 6 · Before you send issue #1 | (none) | ☐ · Publish day set and diarised | OPERATING | (none) | (none) |  |
| INV-08578 | 7 · Standing checks | (none) | 7 · Standing checks | OPERATING | (none) | (none) | Heading |
| INV-08579 | 7 · Standing checks | (none) | Weekly · Issue sent on the right day · open rate logged · every reply answered personally | OPERATING | (none) | (none) |  |
| INV-08580 | 7 · Standing checks | (none) | Monthly · Prune hard bounces and 90-day non-openers · confirm the plan is still $0 · re-read the one-page plan | MONEY | (none) | (none) |  |
| INV-08581 | Decisions owed | (none) | Decisions owed | OPERATING | (none) | (none) | Heading |
| INV-08582 | Decisions owed | (none) | Decision · Recommendation | OPERATING | (none) | (none) |  |
| INV-08583 | Decisions owed | R2 | 1 · Publication name · A value name, not your own — survives R2 either way | OPERATING | (none) | (none) |  |
| INV-08584 | Decisions owed | (none) | 2 · Sending domain · news.get-kind.com | OPERATING | (none) | (none) |  |
| INV-08585 | Decisions owed | (none) | 3 · Publish day · Thursday. Never moves | RULE | (none) | (none) |  |
| INV-08586 | Decisions owed | (none) | 4 · Confirm the free tier covers what you need · Check this first — it is the only unverified number here | OPERATING | (none) | (none) |  |

## `docs/marketing/founder-content-playbook.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Founder content playbook · **Lines:** 387 · **Material items in this source:** 152 · **Rows in this part:** 152 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08587 | Founder Content Playbook | (none) | Founder Content Playbook | COMMERCIAL | (none) | (none) | Heading |
| INV-08588 | Founder Content Playbook | (none) | THE PUBLIC HALF OF THIS DOCUMENT IS GATED | GATE | 🔒 | (none) | Blockquote |
| INV-08589 | Founder Content Playbook | R2 | R2 (6 Aug, re-affirmed 11 Aug): "Stealth is NARROWED, not lifted. A LinkedIn company page is allowed. No personal a… | IDEA | (none) | 6 Aug | Blockquote |
| INV-08590 | Founder Content Playbook | §1 | What runs today: §1 (your POV), §2 (the pillars), §3 (the content bank — the most important section here), and post… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08591 | Founder Content Playbook | §5 | What waits: personal posting under your own name, §5's weekly rhythm as a public rhythm. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08592 | Founder Content Playbook | (none) | Build the bank now. The single reason founders stop posting is the blank page, and the bank is the cure. When the g… | GATE | (none) | (none) | Blockquote |
| INV-08593 | 1 · Your point of view | (none) | 1 · Your point of view | COMMERCIAL | (none) | (none) | Heading |
| INV-08594 | 1 · Your point of view | (none) | Most people believe [THE COMMON WISDOM IN YOUR NICHE] | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08595 | 1 · Your point of view | (none) | I think that's wrong because [WHAT YOU'VE SEEN] | DEFECT | (none) | (none) | Blockquote |
| INV-08596 | 1 · Your point of view | (none) | What I actually believe is [YOUR POSITION] | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08597 | 1 · Your point of view | (none) | And the proof is [WHAT YOU'VE BUILT / SEEN / MEASURED] | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08598 | 1 · Your point of view | (none) | A worked example from your own playbook — Section 04 already contains it | COMMERCIAL | (none) | (none) |  |
| INV-08599 | 1 · Your point of view | (none) | Most people believe you need more outreach tools and more SDRs. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08600 | 1 · Your point of view | (none) | I think that's wrong because the bottleneck isn't sending — it's deciding who is worth sending to, and that's the p… | DEFECT | (none) | (none) | Blockquote |
| INV-08601 | 1 · Your point of view | (none) | What I actually believe is AI should do the chasing; humans should do the closing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08602 | 1 · Your point of view | (none) | The proof is a system that researches and qualifies before a single email goes out. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08603 | 1 · Your point of view | (none) | Can a reasonable person disagree with it? (If not, it's a platitude.) | COMMERCIAL | ✅ | (none) |  |
| INV-08604 | 1 · Your point of view | (none) | Does it follow from something you've actually seen? (If not, it's a slogan.) | COMMERCIAL | ✅ | (none) |  |
| INV-08605 | 1 · Your point of view | (none) | Would you say it out loud to a room? (If not, cut the jargon until you would.) | COMMERCIAL | ✅ | (none) |  |
| INV-08606 | 2 · The four pillars | (none) | 2 · The four pillars | COMMERCIAL | (none) | (none) | Heading |
| INV-08607 | 2 · The four pillars | (none) | Pillar · What it is · Mix · Why it works | COMMERCIAL | (none) | (none) |  |
| INV-08608 | 2 · The four pillars | (none) | 1 · Customer problems & real stories · The pain, named precisely. A conversation you had · 40% · The only pillar th… | COMMERCIAL | (none) | (none) | 1 · Customer problems & real stories · The pain, named precisely. A conversation you had · 40% · The only pillar that makes strang… |
| INV-08609 | 2 · The four pillars | (none) | 2 · Product in action · The machine's actual decisions — what it picked and why · 25% · ⭐ Your unfair advantage. No… | COMMERCIAL | (none) | (none) | 2 · Product in action · The machine's actual decisions — what it picked and why · 25% · ⭐ Your unfair advantage. Nobody else can p… |
| INV-08610 | 2 · The four pillars | (none) | 3 · Frameworks & tips · Something they can use whether or not they buy · 20% · Earns the follow. Gets saved and sha… | COMMERCIAL | (none) | (none) | 3 · Frameworks & tips · Something they can use whether or not they buy · 20% · Earns the follow. Gets saved and shared |
| INV-08611 | 2 · The four pillars | (none) | 4 · Founder journey & beliefs · What you're building, what broke, what you learned · 15% · Builds trust. Least effe… | COMMERCIAL | (none) | (none) | 4 · Founder journey & beliefs · What you're building, what broke, what you learned · 15% · Builds trust. Least effective when it's… |
| INV-08612 | 3 · THE CONTENT BANK — do this today | (none) | 3 · THE CONTENT BANK — do this today | COMMERCIAL | (none) | (none) | Heading |
| INV-08613 | 3 · THE CONTENT BANK — do this today | R2 | This runs regardless of R2 and it is the highest-value thing on this page. | COMMERCIAL | (none) | (none) |  |
| INV-08614 | 3 · THE CONTENT BANK — do this today | (none) | What to bank, every single day | COMMERCIAL | (none) | (none) |  |
| INV-08615 | 3 · THE CONTENT BANK — do this today | (none) | Tag · What · Why it's gold | COMMERCIAL | (none) | (none) |  |
| INV-08616 | 3 · THE CONTENT BANK — do this today | (none) | OBJECTION · Exactly what they said, verbatim · Objections heard 3× are your next 3 posts and a copy change | COMMERCIAL | (none) | (none) |  |
| INV-08617 | 3 · THE CONTENT BANK — do this today | (none) | REJECTION · A prospect rejected + the reason · Pillar 2. Nobody else has this data | COMMERCIAL | (none) | (none) |  |
| INV-08618 | 3 · THE CONTENT BANK — do this today | (none) | QUESTION · Anything a human asked · If one asked, a hundred wondered | COMMERCIAL | (none) | (none) |  |
| INV-08619 | 3 · THE CONTENT BANK — do this today | (none) | WIN · Something that worked, with the number · Proof, and you will forget it by Friday | COMMERCIAL | (none) | (none) |  |
| INV-08620 | 3 · THE CONTENT BANK — do this today | (none) | FRICTION · Where someone got stuck · Fixes the product and writes the post | COMMERCIAL | (none) | (none) |  |
| INV-08621 | 3 · THE CONTENT BANK — do this today | (none) | Two rules: write it verbatim (your paraphrase drifts within a day), and write it same day (a memory of an objection… | RISK | (none) | (none) |  |
| INV-08622 | 4 · Turning one insight into a week | (none) | 4 · Turning one insight into a week | COMMERCIAL | (none) | (none) | Heading |
| INV-08623 | 4 · Turning one insight into a week | §3 | The rule: never invent a topic. If you're staring at a blank page, the bank is empty — go and have a conversation. … | RULE | (none) | (none) |  |
| INV-08624 | 5 · The weekly rhythm 🔒 | (none) | 5 · The weekly rhythm 🔒 | COMMERCIAL | 🔒 | (none) | Heading |
| INV-08625 | 5 · The weekly rhythm 🔒 | (none) | Day · Action · Time · Where it fits | COMMERCIAL | (none) | (none) |  |
| INV-08626 | 5 · The weekly rhythm 🔒 | (none) | Mon · Pull 5 insights from the bank. Pick 3 · 15 min · Sales block | COMMERCIAL | (none) | (none) |  |
| INV-08627 | 5 · The weekly rhythm 🔒 | (none) | Tue · Post 1 — problem/story (pillar 1) · 20 min · Sales block | COMMERCIAL | (none) | (none) |  |
| INV-08628 | 5 · The weekly rhythm 🔒 | (none) | Wed · Post 2 — product in action (pillar 2) · 20 min · Sales block | COMMERCIAL | (none) | (none) |  |
| INV-08629 | 5 · The weekly rhythm 🔒 | (none) | Thu · Newsletter goes out. Post 3 — the framework (pillar 3) · 45 min · Sales block | COMMERCIAL | (none) | (none) |  |
| INV-08630 | 5 · The weekly rhythm 🔒 | (none) | Fri · Post 4 — journey/belief (pillar 4). Reply to every comment · 20 min · Sales block | COMMERCIAL | (none) | (none) |  |
| INV-08631 | 5 · The weekly rhythm 🔒 | (none) | Sat · Write next week's issue from the bank · 60 min · Saturday block | COMMERCIAL | (none) | (none) |  |
| INV-08632 | 5 · The weekly rhythm 🔒 | (none) | Sun · Off. · — · Non-negotiable | COMMERCIAL | (none) | (none) |  |
| INV-08633 | 6 · Ten post ideas, tailored to you | (none) | 6 · Ten post ideas, tailored to you | IDEA | (none) | (none) | Heading |
| INV-08634 | 6 · Ten post ideas, tailored to you | (none) | Idea · Pillar · Why it works with no audience | IDEA | (none) | (none) |  |
| INV-08635 | 6 · Ten post ideas, tailored to you | (none) | 1 · "Would you approve this prospect?" — a real (anonymised) company, the fit reasoning, ask people to vote · 2 · I… | COMMERCIAL | (none) | (none) | 1 · "Would you approve this prospect?" — a real (anonymised) company, the fit reasoning, ask people to vote · 2 · Interactive, nee… |
| INV-08636 | 6 · Ten post ideas, tailored to you | (none) | 2 · "Three objections I heard this week, and my honest answers" · 1 · Straight from the bank. Prospects recognise t… | COMMERCIAL | (none) | (none) | 2 · "Three objections I heard this week, and my honest answers" · 1 · Straight from the bank. Prospects recognise themselves |
| INV-08637 | 6 · Ten post ideas, tailored to you | (none) | 3 · "Why we rejected a company that looked perfect" · 2 · Counter-intuitive, demonstrates judgement, nobody can cop… | COMMERCIAL | (none) | (none) | 3 · "Why we rejected a company that looked perfect" · 2 · Counter-intuitive, demonstrates judgement, nobody can copy it |
| INV-08638 | 6 · Ten post ideas, tailored to you | (none) | 4 · "The thing everyone gets wrong about outbound" — your POV, stated plainly · 4 · Disagreement drives reach more … | DEFECT | (none) | (none) | 4 · "The thing everyone gets wrong about outbound" — your POV, stated plainly · 4 · Disagreement drives reach more reliably than a… |
| INV-08639 | 6 · Ten post ideas, tailored to you | (none) | 5 · "I watched someone use it for the first time. Here's what broke." · 4 · Founders trust founders who admit frict… | COMMERCIAL | (none) | (none) | 5 · "I watched someone use it for the first time. Here's what broke." · 4 · Founders trust founders who admit friction |
| INV-08640 | 6 · Ten post ideas, tailored to you | (none) | 6 · "How to tell if a prospect is worth chasing — 5 questions" · 3 · Useful whether or not they buy. Gets saved | OPERATING | (none) | (none) |  |
| INV-08641 | 6 · Ten post ideas, tailored to you | (none) | 7 · "What $4 a lead actually buys" — open-book unit economics · 3 · Transparency is rare and disproportionately mem… | MONEY | (none) | (none) | 7 · "What $4 a lead actually buys" — open-book unit economics · 3 · Transparency is rare and disproportionately memorable |
| INV-08642 | 6 · Ten post ideas, tailored to you | (none) | 8 · "The 30 days I spent building something nobody had asked for" · 4 · Honest, and it's true | COMMERCIAL | (none) | (none) |  |
| INV-08643 | 6 · Ten post ideas, tailored to you | (none) | 9 · "Referral-dependent pipeline: why it feels safe and isn't" · 1 · Speaks directly to UK agency founders — your e… | COMMERCIAL | (none) | (none) | 9 · "Referral-dependent pipeline: why it feels safe and isn't" · 1 · Speaks directly to UK agency founders — your exact ICP |
| INV-08644 | 6 · Ten post ideas, tailored to you | (none) | 10 · "One number I check every morning, and why" · 3 · Short, repeatable, becomes a series | ARCHITECTURE | (none) | (none) |  |
| INV-08645 | 6 · Ten post ideas, tailored to you | (none) | Idea 1 is the best one. It costs nothing, needs no audience, produces comments (which is reach), and every single c… | MONEY | (none) | (none) |  |
| INV-08646 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | (none) | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | COMMERCIAL | (none) | 12 Aug | Heading |
| INV-08647 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | (none) | These are not ideas. They are posts. Each one is built from a DROP episode that is already live on our own site, so… | IDEA | (none) | (none) |  |
| INV-08648 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) | R2 | How to use them: paste into the LinkedIn company page (R2 permits the company page; no personal posting). One a wee… | OPERATING | (none) | (none) |  |
| INV-08649 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | RULE | (none) | (none) | Heading |
| INV-08650 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Attach: gen-drop-02-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08651 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | The sharpest hour of your day is going into list-building. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08652 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Not strategy. Not the pitch. Not the call that actually closes something. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08653 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | Building lists and writing cold emails — work that never feels finished, and never moves the needle on its own. | RULE | (none) | (none) | Blockquote |
| INV-08654 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | And by the time prospecting is "done", the energy you needed for the work only you can do is gone. Tomorrow it rese… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08655 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | This is the quiet reason agency pipelines run hot and cold. It is not a discipline problem. The people best at winn… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08656 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | The fix is not working harder at the top of the funnel. It is not being the one who does that part. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08657 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 1 · The hour you never get back · Pillar: Problem · → https://get-kind.com/drop-02 | (none) | We wrote the whole thing up here: https://get-kind.com/drop-02 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08658 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | COMMERCIAL | (none) | (none) | Heading |
| INV-08659 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Attach: gen-drop-05-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08660 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | A prospect is at their warmest the second they hit send. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08661 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Every minute after that, the temperature drops. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08662 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Most teams measure their response time in hours. Some in days. The lead raised their hand and everyone was in a mee… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08663 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | By the time someone replies, the moment has gone — and often so has the prospect, off talking to whoever answered f… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08664 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | The uncomfortable part: this has nothing to do with how good your team is. It is a coverage problem. Nobody can sta… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08665 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | So the answer is not a faster human. It is something that never stops watching the inbox, drafts the reply, and han… | RULE | (none) | (none) | Blockquote |
| INV-08666 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 2 · Every reply, answered · Pillar: Problem → Mechanism · → https://get-kind.com/drop-05 | (none) | Full piece: https://get-kind.com/drop-05 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08667 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | COMMERCIAL | (none) | (none) | Heading |
| INV-08668 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Attach: gen-drop-03-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08669 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Most sales tools bill you the same whether they work or not. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08670 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | You pay per seat for the promise of pipeline, and you carry all the risk if it never shows up. | RULE | (none) | (none) | Blockquote |
| INV-08671 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | It looked great in the demo, so you signed for a year. Six months later you are still paying for something nobody o… | MONEY | (none) | (none) | Blockquote |
| INV-08672 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | We think that is backwards, and we built our side of it differently: you approve a prospect, and that is the only t… | MONEY | (none) | (none) | Blockquote |
| INV-08673 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | That is not generosity. It is the only honest position for anyone claiming their outreach is any good. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08674 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 3 · Pay for results, not promises · Pillar: Proof & POV · → https://get-kind.com/drop-03 | (none) | Here is the argument in full: https://get-kind.com/drop-03 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08675 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | RULE | (none) | (none) | Heading |
| INV-08676 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Attach: gen-drop-04-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08677 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | You can write the perfect email to the perfect prospect and still lose. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08678 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Because it quietly lands in spam, and you never get the bounce, the reply, or the warning. | RULE | (none) | (none) | Blockquote |
| INV-08679 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | It is the most demoralising kind of failure: invisible. The campaign "sent". The dashboard says delivered. The sile… | RISK | (none) | (none) | Blockquote |
| INV-08680 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Delivered is not the same as read, and the gap between them is where most outbound programmes quietly die. Teams re… | RULE | (none) | (none) | Blockquote |
| INV-08681 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | Deliverability is infrastructure, not wording. Warmed mailboxes, sane volumes, clean data, proper authentication. U… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08682 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 4 · Why your emails never arrived · Pillar: Problem · → https://get-kind.com/drop-04 | (none) | We wrote up what actually causes it: https://get-kind.com/drop-04 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08683 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | COMMERCIAL | (none) | (none) | Heading |
| INV-08684 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Attach: gen-drop-07-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08685 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Most pipelines run on numbers nobody actually checks. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08686 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | Stale stages. "Qualified" leads that are not. Forecasts built on hope. | DEFECT | (none) | (none) | Blockquote |
| INV-08687 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | The dashboard looks confident. The data underneath is not. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08688 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | And you make real decisions on those numbers — hiring, spend, targets. When they are wrong, you do not find out at … | DEFECT | (none) | (none) | Blockquote |
| INV-08689 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | The honest version is less comfortable and more useful: fewer numbers, each one traceable to something that actuall… | ARCHITECTURE | (none) | (none) | Blockquote |
| INV-08690 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 5 · Your data is lying to you · Pillar: Problem · → https://get-kind.com/drop-07 | (none) | A prospect was contacted. A human replied. A meeting exists in a calendar. Everything else is decoration. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08691 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | COMMERCIAL | (none) | (none) | Heading |
| INV-08692 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | Attach: gen-drop-08-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08693 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | For a regulated business, outbound is a minefield. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08694 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | One non-compliant campaign — wrong consent, wrong data source, no opt-out — and the fine dwarfs any deal it could h… | RULE | (none) | (none) | Blockquote |
| INV-08695 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | So many firms do the safest thing available: nothing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08696 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | That fear is rational. It is also expensive in a quieter way. The pipeline stays small, and the growth that complia… | RULE | (none) | (none) | Blockquote |
| INV-08697 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | The way out is not courage. It is defaults. Lawful basis recorded, opt-out in every message, data sourced somewhere… | RULE | (none) | (none) | Blockquote |
| INV-08698 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | Do that and compliance stops being the thing you hope holds up. It becomes the thing that is true whether or not an… | RULE | (none) | (none) | Blockquote |
| INV-08699 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 6 · Compliant by default, not by accident · Pillar: Mechanism · → https://get-kind.com/dro… | (none) | The full breakdown: https://get-kind.com/drop-08 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08700 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08701 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Attach: gen-drop-01-hero.png — the episode's own artwork, so the feed and the site look like one brand. Save it fro… | COMMERCIAL | (none) | (none) |  |
| INV-08702 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | The candidate who is perfect for the role is browsing jobs at 9pm. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08703 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | By the time anyone reaches out at 10am, they have already replied to someone faster. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08704 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | The list is long, the day is short, and the outreach that should have gone out last night did not — because there w… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08705 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Roles stay open. Good candidates are gone before you ever spoke to them. And the reason is almost never the quality… | RULE | (none) | (none) | Blockquote |
| INV-08706 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | Speed is the whole product in recruitment, and speed is exactly what a human working office hours cannot give you. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08707 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 7 · Filling roles while you sleep · Pillar: Problem · → https://get-kind.com/drop-01 · ⚠️ … | (none) | More on how we think about it: https://get-kind.com/drop-01 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08708 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | COMMERCIAL | ⚠️ | (none) | Heading |
| INV-08709 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Attach: gen-drop-06-f0.png — the episode's own artwork, so the feed and the site look like one brand. Save it from … | COMMERCIAL | (none) | (none) |  |
| INV-08710 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Most property teams sit on a list of names they know they should call. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08711 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | And never do — because showing the properties they already have leaves no time to open new conversations. | RULE | (none) | (none) | Blockquote |
| INV-08712 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | The list is not the problem. The hours are. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08713 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Prospecting is the first thing dropped when a viewing runs long or a deal needs chasing. So the cold list stays col… | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08714 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Nothing about that is a motivation problem. It is arithmetic: the work that pays this month always beats the work t… | MONEY | (none) | (none) | Blockquote |
| INV-08715 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › 8 · From cold list to booked viewing · Pillar: Problem · → https://get-kind.com/drop-06 · … | (none) | Written up here: https://get-kind.com/drop-06 | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08716 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › After the eight | (none) | After the eight | COMMERCIAL | (none) | (none) | Heading |
| INV-08717 | 6b · 🚀 THE LAUNCH BANK — eight finished posts, ready to paste (added 12 Aug) › After the eight | (none) | Posts 1–6 are the ICP posts — lead with those, weekly, in that order. 7 and 8 are range, for when you are talking t… | COMMERCIAL | (none) | (none) |  |
| INV-08718 | 7 · The weekly newsletter template | (none) | 7 · The weekly newsletter template | COMMERCIAL | (none) | (none) | Heading |
| INV-08719 | 7 · The weekly newsletter template | (none) | 300–500 words total | COMMERCIAL | (none) | (none) | 300–500 words total · Morning Brew's whole model. If it takes >3 min, cut |
| INV-08720 | 7 · The weekly newsletter template | (none) | One idea per issue | IDEA | (none) | (none) | One idea per issue · Two ideas means neither lands |
| INV-08721 | 7 · The weekly newsletter template | (none) | One CTA · Two CTAs is zero CTAs | COMMERCIAL | (none) | (none) |  |
| INV-08722 | 7 · The weekly newsletter template | (none) | Plain text look | COMMERCIAL | (none) | (none) | Plain text look · Designed emails read as marketing; plain reads as a person |
| INV-08723 | 7 · The weekly newsletter template | (none) | Same day, every week | COMMERCIAL | (none) | (none) | Same day, every week · ⭐ Consistency beats quality. A weak issue on time > a great one late |
| INV-08724 | 7 · The weekly newsletter template | (none) | Reply, don't click | COMMERCIAL | (none) | (none) | Reply, don't click · A reply starts a conversation. A click starts nothing |
| INV-08725 | 8 · What not to do | (none) | 8 · What not to do | COMMERCIAL | (none) | (none) | Heading |
| INV-08726 | 8 · What not to do | (none) | Post motivational filler | MONEY | (none) | (none) | Post motivational filler · Everyone scrolls past it, including you |
| INV-08727 | 8 · What not to do | (none) | Use every post as a hard sell | COMMERCIAL | (none) | (none) | Use every post as a hard sell · Nobody follows a salesperson |
| INV-08728 | 8 · What not to do | (none) | Copy a trend with no relevance | COMMERCIAL | (none) | (none) | Copy a trend with no relevance · Reach without fit is worse than no reach |
| INV-08729 | 8 · What not to do | (none) | Announce features nobody asked for | COMMERCIAL | (none) | (none) | Announce features nobody asked for · Post the problem, not the release note |
| INV-08730 | 8 · What not to do | R1 | Post the free-10 publicly | COMMERCIAL | (none) | (none) | Post the free-10 publicly · R1 — it is your sales tool, not a public offer |
| INV-08731 | 8 · What not to do | (none) | Build a 3-month calendar up front | IDEA | (none) | (none) | Build a 3-month calendar up front · "before you know which ideas earn attention" — your own avoid-list |
| INV-08732 | 8 · What not to do | R2 | Post under your own name | GATE | (none) | (none) | Post under your own name · R2 — gated. This is the whole point of the banner |
| INV-08733 | 9 · Decisions owed 🔒 | (none) | 9 · Decisions owed 🔒 | COMMERCIAL | 🔒 | (none) | Heading |
| INV-08734 | 9 · Decisions owed 🔒 | (none) | Decision · Recommendation · When | COMMERCIAL | (none) | (none) |  |
| INV-08735 | 9 · Decisions owed 🔒 | R2 | 1 · Which channel when R2 lifts · LinkedIn — your ICP is UK agency and consultancy founders, and they are there · a… | GATE | (none) | (none) | 1 · Which channel when R2 lifts · LinkedIn — your ICP is UK agency and consultancy founders, and they are there · at the gate |
| INV-08736 | 9 · Decisions owed 🔒 | R2 | 2 · Post under your name, or the company page only? · Company page runs now. Personal is the R2 decision itself · a… | GATE | (none) | (none) | 2 · Post under your name, or the company page only? · Company page runs now. Personal is the R2 decision itself · at the gate |
| INV-08737 | 9 · Decisions owed 🔒 | §1 | 3 · Write your POV paragraph (§1) · Do this today — it needs no gate and everything derives from it · now | GATE | (none) | (none) |  |
| INV-08738 | 9 · Decisions owed 🔒 | §3 | 4 · Start the bank (§3) · Today. Five minutes. · now | COMMERCIAL | (none) | (none) |  |

## `docs/marketing/founder-led-marketing-system.md`

**Group:** OPERATING · PRODUCT · COMPLIANCE · GTM SOURCES found in the repo-wide sweep · **Apparent purpose:** Founder-led marketing system · **Lines:** 184 · **Material items in this source:** 72 · **Rows in this part:** 67 · **FULLY READ:** YES

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-08739 | Founder-Led Marketing System | (none) | Founder-Led Marketing System | COMMERCIAL | (none) | (none) | Heading |
| INV-08740 | Founder-Led Marketing System | (none) | What this is: the strategy, in plain language, for a technical founder who does not do marketing. | COMMERCIAL | (none) | (none) | Blockquote |
| INV-08741 | Founder-Led Marketing System | R2 | Status of the public half: GATED. R2 (6 Aug) holds — re-affirmed by the founder on 11 Aug. No personal public posti… | GATE | 🔒 | 6 Aug | Blockquote |
| INV-08742 | 1 · The problem, stated honestly | (none) | 1 · The problem, stated honestly | COMMERCIAL | (none) | (none) | Heading |
| INV-08743 | 1 · The problem, stated honestly | (none) | A marketing problem is "people see my message and don't buy." You fix that with better copy. | COMMERCIAL | (none) | (none) |  |
| INV-08744 | 1 · The problem, stated honestly | (none) | An audience problem is "nobody sees anything." You fix that by talking to people you already know, one at a time, u… | COMMERCIAL | (none) | (none) |  |
| INV-08745 | 2 · The system in one picture | (none) | 2 · The system in one picture | COMMERCIAL | (none) | (none) | Heading |
| INV-08746 | 2 · The system in one picture | (none) | Read the loop backwards and it makes more sense: you cannot write anything worth reading until you have talked to p… | COMMERCIAL | (none) | (none) |  |
| INV-08747 | 3 · The three parts, and what each is actually for | (none) | 3 · The three parts, and what each is actually for | COMMERCIAL | (none) | (none) | Heading |
| INV-08748 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | (none) | Part A — Warm outreach (running now) | COMMERCIAL | (none) | (none) | Heading |
| INV-08749 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | #1 | Job: get client #1 and produce evidence. | COMMERCIAL | (none) | (none) |  |
| INV-08750 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | (none) | Why it beats everything else right now | COMMERCIAL | (none) | (none) |  |
| INV-08751 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | (none) | Warm · Public content · Paid ads | COMMERCIAL | (none) | (none) |  |
| INV-08752 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | R7 | Cost · $0 · $0 · real money you don't have (R7) | MONEY | (none) | (none) |  |
| INV-08753 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | (none) | Time to first conversation | COMMERCIAL | (none) | (none) | Time to first conversation · same day · weeks · days, but only with budget |
| INV-08754 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | R2 | Needs a lock lifted | COMMERCIAL | (none) | (none) | Needs a lock lifted · no · yes (R2) · yes (R2 + R7) |
| INV-08755 | 3 · The three parts, and what each is actually for › Part A — Warm outreach (running now) | (none) | Client arrives... | COMMERCIAL | (none) | (none) | Client arrives... · with you watching · alone · alone |
| INV-08756 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | Part B — beehiiv: the list you own (running now) | COMMERCIAL | (none) | (none) | Heading |
| INV-08757 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | R29 | Corrected 15 Aug (docs audit): NOT running — R29 (12 Aug) parked the newsletter ("beehiv wait. i need to build it";… | RULE | ⛓️ | 15 Aug | Blockquote |
| INV-08758 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | Job: stop renting your audience. | COMMERCIAL | (none) | (none) |  |
| INV-08759 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | A landing page — one page, one ask: subscribe. | COMMERCIAL | (none) | (none) |  |
| INV-08760 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | A welcome sequence — 4 emails that run automatically after signup. | COMMERCIAL | (none) | (none) |  |
| INV-08761 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | A weekly issue — short, specific, from real evidence. | COMMERCIAL | (none) | (none) |  |
| INV-08762 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | R1 | The newsletter is the public magnet, NOT the free-10. That is R1 read exactly as written. A stranger subscribing to… | MONEY | (none) | (none) |  |
| INV-08763 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | Never authenticate kindoutreach.com or trykind.org in beehiiv. Those are the warming ladder. | RULE | (none) | (none) |  |
| INV-08764 | 3 · The three parts, and what each is actually for › Part B — beehiiv: the list you own (running now) | (none) | Never touch gettingkind.com MX. That is Resend inbound reply-capture. | RULE | (none) | (none) |  |
| INV-08765 | 3 · The three parts, and what each is actually for › Part C — 🔒 Founder content (gated on R2) | R2 | Part C — 🔒 Founder content (gated on R2) | GATE | 🔒 | (none) | Heading |
| INV-08766 | 3 · The three parts, and what each is actually for › Part C — 🔒 Founder content (gated on R2) | (none) | What you do instead, right now: bank the content. Every objection, every rejected prospect, every "why did it pick … | GATE | (none) | (none) |  |
| INV-08767 | 3 · The three parts, and what each is actually for › Part D — 🔒 Paid ads (gated on R2 + R7) | R2 | Part D — 🔒 Paid ads (gated on R2 + R7) | GATE | 🔒 | (none) | Heading |
| INV-08768 | 3 · The three parts, and what each is actually for › Part D — 🔒 Paid ads (gated on R2 + R7) | (none) | Job: buy more of a message that already works. | COMMERCIAL | (none) | (none) |  |
| INV-08769 | 4 · The 30 days | (none) | 4 · The 30 days | COMMERCIAL | (none) | (none) | Heading |
| INV-08770 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | Week 1 — build the machine, nobody sees it | COMMERCIAL | (none) | (none) | Heading |
| INV-08771 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · beehiiv publication created — beehiiv-setup-checklist.md · 45 min | OPERATING | (none) | (none) |  |
| INV-08772 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · ⚠️ Sending domain set to news.get-kind.com or beehiiv's own — never the warming domains · 15 min | RULE | ⚠️ | (none) |  |
| INV-08773 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · Landing page live. One ask: subscribe · 30 min | COMMERCIAL | (none) | (none) |  |
| INV-08774 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · 4-email welcome sequence written and switched on · 90 min | COMMERCIAL | (none) | (none) |  |
| INV-08775 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · Warm-100 list built — past clients, founders, suppliers, ex-colleagues, LinkedIn contacts · 2 hrs | COMMERCIAL | (none) | (none) |  |
| INV-08776 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | R2 | ☐ · LinkedIn company page (R2 permits) · 30 min | COMMERCIAL | (none) | (none) |  |
| INV-08777 | 4 · The 30 days › Week 1 — build the machine, nobody sees it | (none) | ☐ · Content bank file created (a plain text file is fine) · 5 min | COMMERCIAL | (none) | (none) |  |
| INV-08778 | 4 · The 30 days › Week 2 — the first 20 | (none) | Week 2 — the first 20 | COMMERCIAL | (none) | (none) | Heading |
| INV-08779 | 4 · The 30 days › Week 2 — the first 20 | (none) | ☐ · 20 warm messages, personally written, no two identical | COMMERCIAL | (none) | (none) |  |
| INV-08780 | 4 · The 30 days › Week 2 — the first 20 | (none) | ☐ · Log the reply REASON, not reply/no-reply | COMMERCIAL | (none) | (none) |  |
| INV-08781 | 4 · The 30 days › Week 2 — the first 20 | #1 | ☐ · Issue #1 sent — even to 11 people | COMMERCIAL | (none) | (none) |  |
| INV-08782 | 4 · The 30 days › Week 2 — the first 20 | (none) | ☐ · 5 introduction asks to people who said no | COMMERCIAL | (none) | (none) |  |
| INV-08783 | 4 · The 30 days › Week 2 — the first 20 | (none) | ☐ · Every objection banked | COMMERCIAL | (none) | (none) |  |
| INV-08784 | 4 · The 30 days › Week 3 — evidence and fixes | (none) | Week 3 — evidence and fixes | COMMERCIAL | (none) | (none) | Heading |
| INV-08785 | 4 · The 30 days › Week 3 — evidence and fixes | (none) | ☐ · 30 more warm messages, informed by week 2 | COMMERCIAL | (none) | (none) |  |
| INV-08786 | 4 · The 30 days › Week 3 — evidence and fixes | (none) | ☐ · Watch one person onboard, live. Write down every friction point | COMMERCIAL | (none) | (none) |  |
| INV-08787 | 4 · The 30 days › Week 3 — evidence and fixes | #2 | ☐ · Issue #2, built from a real objection | COMMERCIAL | (none) | (none) |  |
| INV-08788 | 4 · The 30 days › Week 3 — evidence and fixes | (none) | ☐ · Turn the most-repeated objection into a copy or product change | COMMERCIAL | (none) | (none) |  |
| INV-08789 | 4 · The 30 days › Week 3 — evidence and fixes | (none) | ☐ · First weekly review with real numbers | COMMERCIAL | (none) | (none) |  |
| INV-08790 | 4 · The 30 days › Week 4 — review, don't launch | (none) | Week 4 — review, don't launch | COMMERCIAL | (none) | (none) | Heading |
| INV-08791 | 4 · The 30 days › Week 4 — review, don't launch | (none) | ☐ · 30 more warm messages | COMMERCIAL | (none) | (none) |  |
| INV-08792 | 4 · The 30 days › Week 4 — review, don't launch | (none) | ☐ · Honest 30-day review: what actually produced a conversation? | COMMERCIAL | (none) | (none) |  |
| INV-08793 | 4 · The 30 days › Week 4 — review, don't launch | R2 | ☐ · Revisit R2 only if you have client #1 and the A11 money journeys are walked | OPERATING | (none) | (none) |  |
| INV-08794 | 5 · What "good" looks like at day 30 | (none) | 5 · What "good" looks like at day 30 | COMMERCIAL | (none) | (none) | Heading |
| INV-08795 | 5 · What "good" looks like at day 30 | (none) | Warm messages sent | COMMERCIAL | (none) | (none) | Warm messages sent · 100 · The only input entirely in your control |
| INV-08796 | 5 · What "good" looks like at day 30 | (none) | Reply reasons logged | COMMERCIAL | (none) | (none) | Reply reasons logged · every single one · This IS the content bank |
| INV-08797 | 5 · What "good" looks like at day 30 | (none) | Subscribers · 50 · Small and real beats large and rented | COMMERCIAL | (none) | (none) |  |
| INV-08798 | 5 · What "good" looks like at day 30 | (none) | Conversations had | MONEY | (none) | (none) | Conversations had · 10 · ⭐ The one that predicts revenue |
| INV-08799 | 5 · What "good" looks like at day 30 | R1 | Free-10 runs offered | COMMERCIAL | (none) | (none) | Free-10 runs offered · 5 · Personally, per R1 |
| INV-08800 | 5 · What "good" looks like at day 30 | (none) | Clients · 1 · Everything else is a leading indicator of this | COMMERCIAL | (none) | (none) |  |
| INV-08801 | 6 · The five ways this goes wrong | (none) | 6 · The five ways this goes wrong | DEFECT | (none) | (none) | Heading |
| INV-08802 | 6 · The five ways this goes wrong | (none) | You post before you've talked to anyone. You will write generic AI-sales content because you have nothing specific … | COMMERCIAL | (none) | (none) |  |
| INV-08803 | 6 · The five ways this goes wrong | (none) | You chase subscribers instead of conversations. 500 subscribers and no clients is a worse position than 40 subscrib… | COMMERCIAL | (none) | (none) |  |
| INV-08804 | 6 · The five ways this goes wrong | (none) | You skip a week, then two, then stop. The newsletter's value is entirely in its consistency. Pick a day and never m… | RULE | (none) | (none) |  |
| INV-08805 | 6 · The five ways this goes wrong | (none) | You send the newsletter from a warming domain. Three weeks of warm-up gone in one blast. This is the most expensive… | COMMERCIAL | (none) | (none) |  |
