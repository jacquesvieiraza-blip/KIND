# K.I.N.D — Latest Cross-Check After Fable's 19 August Update

This note captures the latest independent cross-check after Fable incorporated the wider legal/privacy/trust perimeter.

## Overall

Fable has incorporated the large majority of the issues raised in the conversation and verified many of them directly in the repository. The ledger is now materially stronger: AMBER launch status, full CAN-SPAM audit, full Article 14 check, South Africa/Form 4, runtime proof, tracking, provider-deletion propagation, data-broker review, RoPA/TOMs, DPIA, rights propagation, confidentiality, incident response and the Trust Room are represented.

## Remaining corrections / refinements

### 1. PDL licence compatibility — escalate
Treat the standard PDL licence as potentially incompatible with cross-client cached-data reuse until K.I.N.D's actual Order Form / Solution Provider rights are reviewed and PDL explicitly confirms this architecture in writing:

`buy via PDL → persist in lead_pool → expose/reuse with unrelated client A/B/C → charge`

This is a contractual/commercial data-rights gate that sits outside privacy-law compliance.

### 2. Apollo provenance rule
Default Apollo-sourced records to no cross-client pool / no commercial third-party reveal unless K.I.N.D has written contractual permission that explicitly allows it.

### 3. Remove “nothing unlawful has happened”
No outbound marketing has yet been sent, but upstream data processing and live website analytics already exist. Absence of email sending cannot prove all existing processing/tracking is lawful.

Preferred wording:

> No outbound marketing has yet been sent. This gives K.I.N.D the opportunity to remediate the identified outreach defects before first outbound; it does not imply that all existing processing or website tracking is already compliant.

### 4. Provider-specific privacy events
Do not map `HTTP 451` generically across all providers. Normalise provider-specific documented signals, e.g. Hunter `451 claimed_email`, into K.I.N.D privacy events.

### 5. Controller-to-controller documentation
Where K.I.N.D and the receiving client are separate controllers, the relationship must be accurately documented. A standalone Data Sharing Agreement is strong practice but can be integrated into a broader contract rather than treated as universally mandatory as a separate instrument.

### 6. Google OAuth scope minimisation remains open
Current code scopes were verified, but `calendar.readonly` is broader than simple availability. Fable should prove why it is needed versus narrower scopes such as `calendar.freebusy` combined with the required event-write permission before marking “least privilege” complete.

### 7. Email-pixel legal wording
Treat identifiable email open tracking as a PECR/storage-access assessment requiring technical classification. Operationally, disabling the pixel for cold UK outbound remains the simplest path because K.I.N.D's North Star is `MEETING_BOOKED`, not open rate.

## Strong positive findings to preserve

- The reusable `lead_pool` is code-proved purchase-only today.
- Client CRM data, replies, Meeting Brief knowledge, credentials and calendar data do not enter the cross-client pool.
- Client uploads are client-scoped and already pass meaningful suppression gates before contact.
- Nexus/RLS tenant separation is a strong trust foundation.
- The Trust Room evidence model is the right direction: demonstrate controls/evidence instead of blanket “compliant” claims.
- Runtime proof is now correctly separated from code proof in the Opus evidence bar.

