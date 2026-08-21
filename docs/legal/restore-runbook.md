# 🛟 Restore & Failover Runbook (1-page)

_Last-checked: 24 Jun 2026._

**Scope:** what to do if the database is lost/corrupted, or a service goes down.
**Posture (decided 4 Jun):** single-region Supabase project `kind` (af-south-1, Cape
Town). **Daily backups, 30-day retention. RTO 4h / RPO 24h.** No PITR (that needs the
Supabase Pro/Team plan — upgrade decision is post-launch).

---

## A) Database lost or corrupted → restore from backup
1. Supabase → project `kind` → **Database → Backups**. Pick the most recent daily
   backup (you lose at most ~24h of data — that's the RPO).
2. **Restore** it (Supabase restores in place, or to a new project if the project
   itself is gone — in which case update `SUPABASE_URL` on the **api** and **admin**
   Railway services to the new project).
3. If you restored to a **new** project, also rotate/copy `SUPABASE_SERVICE_ROLE_KEY`
   to api + admin (see `key-rotation-runbook.md`).
4. **Verify:** `GET https://api.get-kind.com/health` → 200; signup + a FIGSY send work.

> **Upgrade path:** moving to Supabase Pro gives PITR (point-in-time recovery, RPO
> ~minutes instead of 24h) + longer retention. Worth doing once there's live client
> data you can't afford to lose 24h of.

## B) A service is down (api / portal / admin)
1. Check Railway → the service → **Deployments/Logs**. Most outages are a bad deploy
   or a missing/expired env var (e.g. a key rotated on one service but not the other).
2. **Roll back** to the last green deploy in Railway, or fix the env var and redeploy.

## C) Full Railway outage → fail over to the Render standby
All 4 services run on Railway (single provider = the SPOF). The Render standby +
Cloudflare cutover is documented in **`docs/archive/portal-admin-failover.md`** (archived 21 Aug — reference only) and the live order is in **`docs/render-cloudflare-failover.md`**: **DNS repoint FIRST.**
Key reminders from that doc:
- Standby env vars must mirror live. **Never set `NEXT_PUBLIC_ADMIN_KEY`** (security).
- `NEXT_PUBLIC_*` vars are baked at build time — set them before the standby builds.

## Standby-parity check (founder, periodic — Y12)
The standby silently drifts as live env vars change. Once a month (and before any big
launch), diff the standby's env vars against live for each service and update any that
changed. A standby with stale keys won't actually save you.

---

**Quick reference**
| Failure | Action | Doc |
|---|---|---|
| DB lost/corrupt | Restore latest daily backup (≤24h loss) | §A |
| Bad deploy | Roll back in Railway | §B |
| Railway down | Cut over to Render standby + Cloudflare | §C + `portal-admin-failover.md` |
| Key compromised | Rotate (api + admin together) | `key-rotation-runbook.md` |
