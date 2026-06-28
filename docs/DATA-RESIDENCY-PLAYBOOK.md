# 🌍 DATA-RESIDENCY PLAYBOOK — same-day US / UK go-live (item 258)

> **The deal (founder, 28 Jun):** the *framework* is built and ready NOW; the *regional database* is provisioned **the day our first US or UK client signs** — provision → test → live in one day. This doc is the runbook so that day is fast and boring.

## Why
Today all client data lives in **one** Supabase project in **af-south-1 (Cape Town)**. US/UK clients want their data in-region (and UK/EU clients want UK-GDPR comfort). Marketing currently says only **"US data residency available on request"** — we do NOT advertise regional servers until they exist (see PR #792).

## Decision (locked)
**Regional Supabase projects + per-client region routing.** One isolated project per region:
- `af-south-1` (Cape Town) — default / Africa (exists today)
- `us-east-1` (US) — **Phase 1**, first US client
- `eu-west-1` (Ireland) — **Phase 2**, first UK/EU client

Read-replicas were rejected — the write-primary still defines where data resides, so replicas don't give true residency.

---

## ✅ PRE-BUILD NOW (the "framework ready to go" — do before the trigger)
So trigger-day is provisioning + config only, not engineering:
1. **`clients.region` column** — enum `af-south-1` (default) · `us-east-1` · `eu-west-1`. Migration written + applied.
2. **Per-client DB connection resolver** in `apps/api` — replace the single global Supabase client with a resolver that returns the right regional client by `client.region`. (This is the real engineering lift — abstract the one-DB assumption.)
3. **Regional env-var slots** in Railway — `SUPABASE_URL_US` / `SUPABASE_SERVICE_KEY_US` / `..._EU` (placeholders until provisioned).
4. **Region-targetable migration runner** — apply the full migration set to a named region.
5. **Signup region selector** — capture region at signup/onboarding (default af-south-1).
6. **Smoke-test script** parameterised by region.

## 🚀 TRIGGER-DAY RUNBOOK (first US or UK client — one day)
1. Create the Supabase project in the target region (`us-east-1` or `eu-west-1`).
2. Run the full migration set against it (region-targeted runner).
3. Set the regional env vars (URL + service key) in Railway; redeploy API.
4. Set the new client's `region` = target region.
5. **Smoke test on the regional DB:** signup → ICP → lead sourcing → delivery + charge → booking. Confirm data lands in-region.
6. Flip live for that client. Update marketing copy to state the region is live (only now).

## Cost
~$25/mo per regional Supabase project (Pro) + usage. Main cost = the one-time engineering for the resolver (step 2 above).

## Status
- **Item 258** in PRODUCT-INVENTORY — 🔴, trigger-gated. Owner 🤝.
- Build is **founder-triggered** ("I tell you when — on the first US/UK client"). Pre-build (steps 1–6 above) can start whenever the founder greenlights the framework work.
