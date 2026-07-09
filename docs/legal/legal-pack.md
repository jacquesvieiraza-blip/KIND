# K.I.N.D Technologies Ltd — Legal Pack
**Company:** K.I.N.D Technologies Ltd · Company No. 17260532 · Registered England & Wales
**Version:** 1.0 · June 2026 · **Last-checked:** 24 Jun 2026
**Owner:** Founder / Director
**Review cycle:** Every 6 months, or on any material regulatory change

---

## 1. CORPORATE STRUCTURE AND FOUNDER PROTECTION

### 1.1 Legal Entity
- **Name:** K.I.N.D Technologies Ltd
- **Type:** Private company limited by shares
- **Registered number:** 17260532
- **Jurisdiction:** England & Wales
- **SIC codes:** 62012 (Business and domestic software development), 62020 (IT consultancy), 63110 (Data processing and hosting)

### 1.2 What the Ltd Structure Protects You From
A private limited company is a separate legal entity from you personally. This means:

- Company debts are the company's liability — not yours personally
- If K.I.N.D is sued by a client, they can pursue the company's assets, not your personal bank account, home, or personal assets
- Your personal financial risk is limited to the value of shares you hold (typically £1 for a founder share)

### 1.3 When the Ltd Structure Does NOT Protect You
Personal liability can pierce through the corporate veil in specific circumstances:

| Scenario | Risk level | Mitigation |
|----------|-----------|-----------|
| Personal guarantee given to a bank or landlord | High — you are personally liable for that guarantee | Never give personal guarantees without legal advice |
| Fraudulent trading (running company knowing it cannot pay debts) | High — personal liability + criminal | Maintain accurate financial records; don't trade while insolvent |
| Wrongful trading (continuing to trade when company is insolvent) | High | Monitor cashflow; take insolvency advice early if needed |
| Data breach with director's consent, connivance or neglect | Medium — ICO can pursue directors personally under DPA 2018 | Follow the IT Security Pack; register with ICO; document controls |
| IP infringement you personally directed | Medium | Ensure all code, content, and brand assets are original or properly licensed |
| HMRC obligations (PAYE, VAT, Corporation Tax) | High if wilfully avoided | Use an accountant; file on time |

### 1.4 Directors & Officers Insurance (D&O)
D&O insurance covers you personally against claims arising from decisions you made as a director — including data protection decisions, employment disputes, and investor claims.

- **Cost:** ~£500-1,000/yr for an early-stage startup
- **Recommended by:** Month 2 post-launch
- **Providers:** Hiscox, Markel, CFC Underwriting (UK-focused tech startups)
- **What it covers:** Legal defence costs + settlements for personal director claims

---

## 2. DATA PROTECTION LEGAL FRAMEWORK

K.I.N.D processes personal data across multiple jurisdictions. The following laws apply based on where clients and their leads are located — not just where K.I.N.D is incorporated.

### 2.1 UK GDPR + Data Protection Act 2018 (primary law — UK)

**Applies to:** All processing of personal data by a UK company, regardless of where the data subjects are located.

**Key obligations:**
- Lawful basis for every processing activity (consent, legitimate interest, contract, legal obligation)
- Privacy notice (✅ live at get-kind.com/privacy)
- Data subject rights: access, rectification, erasure, portability, objection (30-day response window)
- Data breach notification to ICO within 72 hours if personal data is at risk
- Data Processing Agreements (DPAs) with all third-party processors (✅ in place with Railway, Supabase, Stripe, Resend, PDL, Hunter, Flutterwave)
- ICO registration and annual fee payment

**ICO registration — REQUIRED NOW:**
- URL: ico.org.uk/registration
- Fee: £40/yr (Tier 1 — small organisation, under £632K turnover or fewer than 10 staff)
- Penalty for non-registration: £400-£4,000
- **Status: ✅ DONE — ICO registered 15 Jun 2026 (ref C1959926)**

**Data Use and Access Act 2025 (new — in force June 2025):**
- Tightened international transfer rules: a new "materially lower standards" test applies when sending data outside the UK
- Expanded ICO enforcement powers
- Full audit trails required for all data processing activities
- 72-hour breach notification window now also applies to PECR (electronic communications)

### 2.2 POPIA — Protection of Personal Information Act (South Africa)

**Applies to:** Any processing of South African residents' personal data.

**Key obligations:**
- 8 conditions of lawful processing (accountability, processing limitation, purpose specification, further processing limitation, information quality, openness, security safeguards, data subject participation)
- Data subjects have rights to: access their data, correct inaccuracies, delete data, object to processing
- Breach notification to Information Regulator within a reasonable time (no fixed window — act promptly)
- Cross-border transfers only to countries with adequate protection or with consent

**K.I.N.D's position:**
- Supabase `af-south-1` (Cape Town) keeps SA client data in-country ✅
- Privacy Policy covers POPIA obligations ✅
- DPA with SA clients available on site ✅
- Information Regulator: inforegulator.org.za (no registration fee required for private companies)

### 2.3 NDPR — Nigeria Data Protection Regulation

**Applies to:** Processing personal data of Nigerian residents.

**Key obligations:**
- Consent or legitimate interest required for processing
- Data subject rights (access, correction, deletion, objection)
- Data processors must conduct a Data Protection Impact Assessment (DPIA) annually if processing data of more than 1,000 data subjects
- Must use a NDPR-licensed Data Protection Compliance Organisation (DPCO) if processing >1,000 subjects
- Cross-border transfer only to countries with adequate protection

**K.I.N.D's position:**
- At launch: client data volume likely under 1,000 Nigerian data subjects — DPCO not immediately required
- Trigger: engage a licensed DPCO when Nigerian client base exceeds ~500 lead records
- NDPR body: nitda.gov.ng

### 2.4 Kenya Data Protection Act 2019

**Applies to:** Processing personal data of Kenyan residents.

**Key obligations:**
- Registration with the Office of the Data Protection Commissioner (ODPC) required for data controllers and processors
- Lawful basis for all processing
- Data subject rights (access, rectification, erasure, restriction, portability)
- Breach notification to ODPC within 72 hours
- Data Protection Impact Assessments for high-risk processing

**K.I.N.D's position:**
- Register with ODPC when expanding to Kenya (Month 3)
- ODPC: odpc.go.ke

### 2.5 CCPA — California Consumer Privacy Act (USA)

**Applies to:** If K.I.N.D has clients or processes personal data of California residents AND meets any of: >$25M annual revenue, processes data of >50,000 California residents annually, derives >50% revenue from selling personal data.

**K.I.N.D's position:**
- At launch: below all CCPA thresholds
- Privacy Policy includes CCPA rights notice (✅ live)
- DPA-US available on site (✅ live)
- Monitor: if US client base grows, reassess threshold annually

### 2.6 Data Residency Summary

| Client location | Data stored | Law | Compliant |
|----------------|------------|-----|-----------|
| South Africa | Supabase af-south-1 (Cape Town) | POPIA | ✅ Yes |
| UK | Supabase af-south-1 (adequate protection) | UK GDPR | ✅ Yes |
| EU | Supabase af-south-1 (assess adequacy) | GDPR | Review needed |
| Nigeria | Supabase af-south-1 | NDPR | ✅ Adequate |
| Kenya | Supabase af-south-1 | Kenya DPA | ✅ Adequate |
| USA | Supabase af-south-1 | CCPA (below threshold) | ✅ Yes |

---

## 3. CLIENT CONTRACTS

### 3.1 Terms of Service
- **Live at:** get-kind.com/terms
- **Covers:** Service scope, acceptable use, payment terms, cancellation, limitation of liability, IP ownership, governing law (England & Wales)
- **Limitation of liability clause:** K.I.N.D's liability is capped at fees paid in the 12 months preceding the claim. This is critical — without it, a client could claim unlimited damages.
- **Review trigger:** Any new jurisdiction, new product (Denise/Tony), or material change in service scope

### 3.2 Data Processing Agreement (DPA)
- **Live at:** get-kind.com/dpa
- **Purpose:** Establishes K.I.N.D as data processor acting on the client's instructions. Required for UK GDPR and POPIA compliance.
- **Covers:** Scope of processing, data subject rights obligations, sub-processor list, breach notification obligations, deletion on contract end, international transfer safeguards
- **Sub-processors listed:** Railway, Supabase, Stripe, Resend, **PDL, Hunter, Flutterwave**, Anthropic *(Apollo removed — retired from the data path)*
- **US version:** get-kind.com/dpa-us (CCPA addendum)

### 3.3 Key Clauses to Protect K.I.N.D in Client Contracts

| Clause | Why it matters |
|--------|---------------|
| **Limitation of liability** (12 months fees) | Caps exposure. Without this, unlimited liability |
| **Indemnity from client** | Client indemnifies K.I.N.D if their instructions cause a third-party claim |
| **IP ownership** | All platform IP belongs to K.I.N.D. Client owns their data only. |
| **Acceptable use** | Client cannot use K.I.N.D for spam, illegal outreach, or POPIA violations |
| **Governing law** | England & Wales. Makes any dispute resolved in UK courts |
| **Force majeure** | K.I.N.D not liable for outages caused by third-party infrastructure (Railway, Supabase) |
| **Auto-renewal / cancellation** | Clear cancellation process. 30-day notice required. |

---

## 4. INTELLECTUAL PROPERTY

### 4.1 What K.I.N.D Owns
- All platform code, algorithms, and software (written by founder or Claude Code agent under founder's direction)
- All brand assets: name "K.I.N.D", agent names (FIGSY, Milla, Vida, Denise, Tony), logo, brand gradient, Pixar-style agent images
- All training data, scored leads, and proprietary datasets accumulated through platform operation
- All content: blog articles, pitch deck, documentation, this pack

### 4.2 What Clients Own
- Their own raw data (company lists, ICP configurations)
- Their own personal CRM data pushed to/from HubSpot/Pipedrive
- Leads generated on their behalf (they own the relationship)

### 4.3 IP Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Agent name conflicts (FIGSY, Milla, Vida) | Trademark search + application — see SEIS draft for trademark class list. File when revenue justifies cost (~Month 3). |
| "K.I.N.D" brand — similar name dispute | Trademark filed in Classes 35, 42, 45 (business services, software, consultancy). Check is clear. |
| Claude Code-generated code IP | Code written by AI under human direction is owned by the directing human (UK copyright law — author = human controller). All code committed in founder's name. |
| Employee/contractor IP claim | All future contractors must sign IP assignment clause before access. See Section 6. |

### 4.4 Trademark Filing Plan
- **Jurisdiction priority:** UK first (IPO), then ARIPO (African Regional IP — covers 19 African countries in one application)
- **Classes:** 35 (business services/outbound), 42 (software/AI platform), 45 (legal/compliance services)
- **Estimated cost:** UK £200-400 per class. ARIPO ~$2,000 for all classes.
- **Trigger:** File after first revenue or Month 2 — whichever comes first

---

## 5. EMPLOYMENT AND CONTRACTOR LAW

### 5.1 Founder's Current Status
The founder is a director of K.I.N.D Technologies Ltd. A director is not automatically an employee — you may be self-employed, employed, or unpaid. Tax status depends on whether you draw a salary (PAYE) or dividends (or both). Consult an accountant to optimise this split.

### 5.2 Before Hiring Anyone (Employee or Contractor)
- **Employees:** Require a written employment contract, National Insurance contributions, statutory rights (holiday, sick pay, maternity/paternity). Register as employer with HMRC.
- **Contractors/freelancers:** Require a written services agreement with:
  - IP assignment clause (all work product is K.I.N.D's IP)
  - Confidentiality / NDA clause
  - No employment relationship clause
  - IR35 status assessment (HMRC rules on whether a contractor is effectively an employee for tax purposes)
- **Claude Code agent:** Not an employee or contractor. No agreement required. IP belongs to the founder directing the work.

### 5.3 Smartsheet Employment Risk (assessed 3 Jun)
Lawyer consulted. Risk assessed. Proceeding. Key: platform was built after hours on personal equipment. Clause 17.2 risk acknowledged and accepted. Do not use company time or equipment for any work that could be claimed as belonging to another employer.

---

## 6. CONTRACTS WITH THIRD-PARTY SERVICE PROVIDERS

K.I.N.D is a customer of these providers. Their standard contracts govern the relationship. Key points to know:

| Provider | Key contractual point | Risk |
|----------|----------------------|------|
| Railway | Service is provided "as is" with uptime SLA (Pro plan). Not liable for data loss beyond their stated backup policy. | Low — Supabase holds the data |
| Supabase | Data belongs to you. Supabase is a data processor. DPA signed. Cape Town region = POPIA compliant. | Low |
| Stripe | Regulated financial institution. Stripe is the merchant of record for payment processing. K.I.N.D never holds card data. | Low |
| Resend | Email delivery service. CAN-SPAM and GDPR compliant. K.I.N.D is responsible for the content it sends. | Medium — ensure opt-out / unsubscribe works |
| PDL (People Data Labs) | Lead sourcing (people/company data). Subject to PDL's data licensing terms. K.I.N.D is responsible for lawful use of sourced data. | Medium — lawful basis + suppression on all outreach |
| Hunter | Email finding/verification (reveal). Subject to Hunter's terms. GDPR compliant. | Medium — lawful basis for processing revealed emails |
| Flutterwave | Payment processing (Africa). Regulated processor; K.I.N.D never holds card data. | Low |
| Anthropic | Claude API. Data sent in prompts may be used for safety review (check enterprise plan terms). Do not send sensitive PII in prompts. | Medium — review data handling policy annually |

---

## 7. REGULATORY REGISTRATIONS TRACKER

| Registration | Body | Status | Due | Cost |
|-------------|------|--------|-----|------|
| **ICO registration (UK GDPR)** | ico.org.uk | ✅ **DONE — ICO registered 15 Jun 2026 (ref C1959926)** | Immediately | £40/yr |
| Companies House annual confirmation | companies.house.gov.uk | ✅ Registered | Annual (anniversary of incorporation) | £13 |
| Corporation Tax registration | HMRC | Required within 3 months of first trading | Month 1 | Free |
| PAYE registration (when first employee hired) | HMRC | Not yet needed | Before first hire | Free |
| VAT registration | HMRC | Required when turnover exceeds £90K/yr (2025 threshold) | When threshold approached | Free |
| ODPC registration (Kenya) | odpc.go.ke | Not yet needed | Month 3 (Kenya expansion) | ~KES 10,000 |
| NDPR DPCO engagement (Nigeria) | nitda.gov.ng | Not yet needed | When >1,000 Nigerian data subjects | ~$500/yr |
| ISO 27001 | BSI / UKAS-accredited body | Year 2 | 50+ clients or first enterprise contract | ~£20,000 |
| ISO 42001 (AI Governance) | BSI | Year 2 | Alongside 27001 | ~£15,000 |

---

## 8. FOUNDER'S PERSONAL LEGAL RIGHTS AND PROTECTIONS

### 8.1 As a Company Director
- Right to inspect company books and records at any time
- Right to be indemnified by the company for costs incurred as a director (unless due to own fraud/negligence)
- Right to remuneration as set by the board (you are the sole director — you set your own pay, within HMRC rules)
- Duty to act in the company's best interests (Companies Act 2006, Section 172)
- Duty to avoid conflicts of interest

### 8.2 As a Shareholder
- Right to dividends if declared
- Right to vote at general meetings
- Pre-emption rights on new share issuances (unless waived)
- Right to receive annual accounts
- **Protect yourself before any investment:** ensure a Shareholders' Agreement is in place before any external investor receives shares. Without one, you have minimal protection against dilution, forced sale, or investor veto.

### 8.3 As an Individual Processing Data
- You are not personally a data controller — K.I.N.D Technologies Ltd is. This means ICO enforcement is against the company, not you personally, unless consent/connivance/neglect applies (see Section 1.3).
- Never process client or lead personal data on personal devices, personal email, or personal cloud storage. Keep it inside the platform.

### 8.4 SEIS / EIS — Your Investment Protection
- SEIS advance assurance draft: `docs/legal/seis-advance-assurance-draft.md`
- SEIS gives investors 50% income tax relief on investment + CGT exemption on gains
- As founder, you do not benefit from SEIS on your own shares — but it makes raising £150K from angels dramatically easier
- Apply for HMRC advance assurance before approaching investors: hmrc.gov.uk/seis
- Cannot claim SEIS if you have previously received EIS investment in the same company

---

## 9. LEGAL DOCUMENTS LIVE ON SITE

All documents below are live at get-kind.com and referenced in the footer and signup flow.

| Document | URL | Status | Last reviewed |
|----------|-----|--------|--------------|
| Terms of Service | get-kind.com/terms | ✅ Live | 4 Jun 2026 |
| Privacy Policy | get-kind.com/privacy | ✅ Live | 4 Jun 2026 |
| Data Processing Agreement | get-kind.com/dpa | ✅ Live | 4 Jun 2026 |
| DPA — US Addendum | get-kind.com/dpa-us | ✅ Live | 4 Jun 2026 |
| Trust & Security page | get-kind.com/trust | ✅ Live | Needs update — see Section 10 |

---

## 10. WHAT STILL NEEDS DOING — LEGAL CHECKLIST

| Item | Priority | Owner | Notes |
|------|----------|-------|-------|
| **Register with ICO** | ✅ Done | Founder | Status: ✅ DONE — ICO registered 15 Jun 2026 (ref C1959926) |
| **Get D&O insurance** | 🟡 Month 2 | Founder | Hiscox / Markel / CFC · ~£500-1,000/yr |
| **Update trust.html** with security pack details | 🟡 Now | Claude | Link to this pack; update ISO/compliance roadmap |
| **Fix broken footer links** (Terms/Privacy/POPIA & GDPR) | 🔴 Now | Claude | See site audit |
| File UK trademark for K.I.N.D, FIGSY, Milla, Vida | 🟡 Month 2-3 | Founder | IPO.gov.uk · ~£200-400/class |
| File ARIPO trademark (19 African countries) | 🟡 Month 3 | Founder | After UK filing · ~$2,000 |
| IP assignment clause for any future contractor | 🟡 Before first hire | Founder + lawyer | Standard clause, ~£200 from a startup lawyer |
| Shareholders' Agreement before any investment | 🔴 Before any investor | Founder + lawyer | Do not accept investment without this |
| Corporation Tax registration with HMRC | 🟡 Month 1 | Founder | Required within 3 months of first trading |
| ODPC registration (Kenya) | 🟢 Month 3 | Founder | When Kenya expansion begins |
| NDPR DPCO engagement (Nigeria) | 🟢 Month 3 | Founder | When >500 Nigerian lead records |
| Review Anthropic data handling policy | 🟢 Quarterly | Founder | Ensure PII not being sent in prompts |
| SEIS advance assurance application | 🟡 Before fundraising | Founder | Draft at `docs/legal/seis-advance-assurance-draft.md` |

---

*Document owner: Founder, K.I.N.D Technologies Ltd*
*Next review: December 2026 or on any material regulatory change*
*This document does not constitute legal advice. Consult a qualified solicitor for specific legal decisions, particularly before external investment, hiring, or any regulatory enforcement action.*
