-- ═══════════════════════════════════════════════════════════════════════════════════════
-- EXISTING FREE-PROOF AUDIT — RUN, ANSWERED AND RULED ON. This file is now EVIDENCE.
--
-- ── ✅ THE RESULT (founder ran it in production, 3 Sep 2026) ────────────────────────────
--
-- QUERY 1 returned THREE rows, and nothing else:
--
--     Disrupt Shop    4 null-programme awaiting cards    already_proof_attributed = 0
--     Glean           4 null-programme awaiting cards    already_proof_attributed = 0
--     Glean          20 null-programme awaiting cards    already_proof_attributed = 0
--
--   🛑 HOUSE DID NOT APPEAR. MBF DID NOT APPEAR.
--
-- FOUNDER RULING, same session (R93): Disrupt Shop and Glean are DEMO/TEST accounts, not
-- live customer work. Their rows STAY historical with `proof_pass = NULL`, they need NO
-- backfill, they MAY disappear from the current Milla workspace, and they must NOT be
-- deleted or modified. **THE EXISTING-PROOF AUDIT GATE IS PASSED.**
--
-- ⚠️ WHY THIS FILE IS KEPT RATHER THAN DELETED. The result above is a material founder
-- decision about production data, and R82 forbids a material decision existing only in a
-- chat transcript. The query is also the reusable instrument: if the question is ever asked
-- again — a new account, a restored backup, a second attribution column — this is what
-- answers it, and it answers it the same way it did the first time.
--
-- ⚠️ AND ITS ORIGINAL PURPOSE IS SPENT. It was written to run BEFORE the reader landed. The
-- reader IS landed (merged 3 Sep, `leads.proof_pass IS NOT NULL` in `/leads/for-approval`),
-- so re-running it now answers a slightly different question: not "what would disappear",
-- but "what did". The three rows above are the answer to both.
--
-- ── THE ORIGINAL BRIEF, UNCHANGED BELOW ────────────────────────────────────────────────
--
-- 🛑 READ-ONLY. One SELECT. No UPDATE, no DELETE, no INSERT, no stamp, no backfill, no
-- classification. It answers ONE question and hands the answer to the founder:
--
--     "Does any live account hold a workspace that MIGHT contain legitimate modern
--      Free Proof work created BEFORE `leads.proof_pass` existed?"
--
-- ── WHY IT HAS TO BE RUN ────────────────────────────────────────────────────────────────
--
-- The migration adds the column NULL for every existing row, and never backfills. That is
-- correct — the attribution trace proved nothing on an old row can distinguish a genuine
-- proof lead from a retired legacy one. But it has a consequence the founder named:
--
--   a LEGITIMATE free-proof lead created before the column existed also reads NULL,
--   so the future reader (`proof_pass IS NOT NULL`) would hide it alongside real history.
--
-- Hiding House's retired desk is the goal. Hiding a real prospect's calibration set is not.
-- This query is how we find out which — if either — actually exists, instead of assuming.
--
-- ── WHAT MAKES A CLIENT "POTENTIALLY AFFECTED" (traced, not guessed) ────────────────────
--
-- Every condition below comes from a code path, named:
--
--  ① `clients.proof_passes_done >= 1`
--     Only `try_claim_proof_pass` writes it (20260822 / 20260826), and only the client's own
--     proof route calls it. A client at 0 has never had a proof pass claimed, so no row on
--     that account can be proof work. This is the necessary condition — NOT a sufficient one.
--
--  ② at least one lead with `programme_id IS NULL` that is delivered AND surfaced
--     `runIcpJob` stamps `programme_id` only inside the `if (!proofMode)` branch
--     (routes/icps.ts), so a proof lead is ALWAYS null-programme; and the proof block sets
--     `delivered_at` + `surfaced_for_approval_at` together. A programme-attributed row is
--     already positively attributed and is not at risk from the new reader.
--
--  ③ the account was UNFUNDED when the pass ran
--     `runIcpJob` refuses proof for a funded account: `fundedVia(credit_transactions) !== null`
--     -> "This account is already live — proof batches are only for new prospects."
--     `fundedVia` counts `wallet_topup | purchase | credit_purchase | manual_grant`.
--     ⚠️ REPORTED, NOT FILTERED ON: an account can be funded AFTER its proof ran, so excluding
--     funded clients here could hide exactly the case we are looking for. The column is shown
--     and the founder judges it.
--
-- ⚠️ ①-③ ARE A REVIEW TRIGGER, NOT AN ATTRIBUTION. `try_claim_proof_pass` runs BEFORE
-- `runIcpJob` and a claimed pass can produce ZERO leads (no_match, audience_exhausted, a
-- crash, or the funded-account refusal above), so `proof_passes_done >= 1` on its own says
-- nothing about any particular row. That is the whole reason this is an audit and not a
-- backfill.
--
-- 🛑 ONE SIGNAL DELIBERATELY NOT OFFERED, BECAUSE IT LOOKS LIKE EVIDENCE AND IS NOT.
-- The proof block writes `delivered_at` and `surfaced_for_approval_at` in ONE statement with
-- the SAME value, so a proof row has them exactly equal. That is NOT a proof signature:
-- `lib/start-work.ts` also writes both from a single `now` (two statements, one value), so a
-- MANAGED/PAID surfacing produces the identical equality. Offering it as a discriminator
-- would be the newest-N-batches mistake in a different costume. It is reported as a raw
-- count for context and is explicitly not a classifier.
--
-- ── SAFETY ──────────────────────────────────────────────────────────────────────────────
-- No PII beyond the operator-facing company name and ids the operator already sees in Vida.
-- No lead names, emails, phones or LinkedIn URLs. Counts and timestamps only.
-- ═══════════════════════════════════════════════════════════════════════════════════════

SELECT
  c.id                                   AS client_id,
  c.company_name,                                        -- operator-facing, already in Vida
  c.commercial_model,                                    -- 'programme' | 'legacy' | NULL
  c.is_demo,
  p.id                                   AS open_programme_id,
  p.status                               AS open_programme_status,

  -- ── THE PROOF STATE ON THE CLIENT ROW ────────────────────────────────────────────────
  COALESCE(c.proof_passes_done, 0)       AS proof_passes_done,
  c.proof_started_at,                                    -- LATEST claim only; rewritten per pass
  COALESCE(c.proof_records_committed, 0) AS proof_records_committed,
  c.proof_review_requested_at,
  c.proof_review_resolved_at,

  -- ── WAS THIS ACCOUNT EVER FUNDED? (reported, never used to filter) ───────────────────
  -- Mirrors `fundedVia` in lib/onboarding-pack.ts: a purchase type WITH a reference is real
  -- money; `manual_grant` is a comp. Both refuse a proof run at the time they exist.
  (SELECT COUNT(*) FROM public.credit_transactions t
    WHERE t.client_id = c.id
      AND t.type IN ('wallet_topup','purchase','credit_purchase')
      AND COALESCE(NULLIF(BTRIM(COALESCE(t.reference, '')), ''), NULL) IS NOT NULL
  )                                      AS real_purchase_tx,
  (SELECT COUNT(*) FROM public.credit_transactions t
    WHERE t.client_id = c.id AND t.type = 'manual_grant'
  )                                      AS manual_grant_tx,

  -- ── THE ROWS THE FUTURE READER WOULD HIDE ────────────────────────────────────────────
  -- Null-programme, delivered AND surfaced: exactly the set `/leads/for-approval` returns
  -- today for a declared-programme client with no programme, and exactly the set the new
  -- reader will require `proof_pass IS NOT NULL` on.
  l.null_programme_surfaced              AS null_programme_surfaced_leads,
  -- Of those, the ones still ACTIONABLE on the desk (not revealed, not passed) — the number
  -- that would visibly change for this client.
  l.null_programme_awaiting              AS null_programme_awaiting_now,
  l.earliest_surfaced,
  l.latest_surfaced,
  l.distinct_surfaced_batches,           -- batch-constant stamp => how many sets they hold
  -- Context only. NOT a discriminator — see the header: start-work.ts produces this too.
  l.delivered_equals_surfaced,
  -- Already-attributed rows, shown so a mixed account is visible at a glance.
  l.programme_attributed_leads,
  -- After the migration this should be 0 everywhere (nothing writes it yet). A non-zero
  -- value means the runtime PR reached production before this audit was read.
  l.already_proof_attributed,

  -- ── DID A RUN EVER ACTUALLY SERVE ANYTHING? ──────────────────────────────────────────
  -- `icp_run_outcomes` carries no proof flag (traced), so this cannot attribute anything.
  -- It answers a different, useful question: did any run on this account ever insert rows,
  -- and when did the last one finish.
  o.run_outcomes_total,
  o.run_outcomes_served,
  o.last_run_status,
  o.last_run_at,

  -- ── FREE-PROOF PDL SPEND, IF ANY ─────────────────────────────────────────────────────
  -- A positive proof_ledger row = PDL records were reserved for a proof pass on this client.
  -- ⚠️ ABSENCE PROVES NOTHING: a pool-only proof pass writes no proof_ledger row at all.
  (SELECT COUNT(*) FROM public.proof_ledger pl
    WHERE pl.client_id = c.id AND pl.records > 0)        AS proof_reservations,
  (SELECT MIN(pl.created_at) FROM public.proof_ledger pl
    WHERE pl.client_id = c.id AND pl.records > 0)        AS first_proof_reservation_at,

  -- ── THE ONLY EXISTING PROOF-BATCH-TO-LEADS LINK IN THE SCHEMA ────────────────────────
  -- `icps.proof_widened_candidate` stores `proof_pass` and `batch_at` (the batch's exact
  -- `surfaced_for_approval_at`). It exists ONLY for a pass-2 widened fallback, so it covers
  -- a corner and never the motion — but where it IS present it is genuine, durable,
  -- server-written evidence tying a specific batch stamp to a specific proof pass.
  -- 🛑 THIS IS THE ONE FIELD THAT COULD SUPPORT A MANUAL, POSITIVELY-EVIDENCED ATTRIBUTION.
  (SELECT COUNT(*) FROM public.icps i
    WHERE i.client_id = c.id AND i.proof_widened_candidate IS NOT NULL) AS widened_candidates,
  (SELECT jsonb_agg(jsonb_build_object(
            'icp_id',     i.id,
            'proof_pass', i.proof_widened_candidate->>'proof_pass',
            'state',      i.proof_widened_candidate->>'state',
            'batch_at',   i.proof_widened_candidate->>'batch_at'))
     FROM public.icps i
    WHERE i.client_id = c.id AND i.proof_widened_candidate IS NOT NULL) AS widened_candidate_detail,

  c.created_at                           AS client_created_at

FROM public.clients c

-- The open programme, if any. Same terminal set the application treats as closed.
LEFT JOIN LATERAL (
  SELECT pr.id, pr.status
    FROM public.programmes pr
   WHERE pr.client_id = c.id
     AND pr.status NOT IN ('COMPLETED','CANCELLED')
   ORDER BY pr.created_at DESC
   LIMIT 1
) p ON TRUE

LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (
      WHERE ld.programme_id IS NULL
        AND ld.delivered_at IS NOT NULL
        AND ld.surfaced_for_approval_at IS NOT NULL)                       AS null_programme_surfaced,
    COUNT(*) FILTER (
      WHERE ld.programme_id IS NULL
        AND ld.delivered_at IS NOT NULL
        AND ld.surfaced_for_approval_at IS NOT NULL
        AND ld.revealed_at IS NULL
        AND ld.status <> 'passed')                                         AS null_programme_awaiting,
    MIN(ld.surfaced_for_approval_at) FILTER (
      WHERE ld.programme_id IS NULL AND ld.surfaced_for_approval_at IS NOT NULL) AS earliest_surfaced,
    MAX(ld.surfaced_for_approval_at) FILTER (
      WHERE ld.programme_id IS NULL AND ld.surfaced_for_approval_at IS NOT NULL) AS latest_surfaced,
    COUNT(DISTINCT ld.surfaced_for_approval_at) FILTER (
      WHERE ld.programme_id IS NULL AND ld.surfaced_for_approval_at IS NOT NULL) AS distinct_surfaced_batches,
    COUNT(*) FILTER (
      WHERE ld.programme_id IS NULL
        AND ld.delivered_at IS NOT NULL
        AND ld.delivered_at = ld.surfaced_for_approval_at)                 AS delivered_equals_surfaced,
    COUNT(*) FILTER (WHERE ld.programme_id IS NOT NULL)                    AS programme_attributed_leads,
    COUNT(*) FILTER (WHERE ld.proof_pass IS NOT NULL)                      AS already_proof_attributed
  FROM public.leads ld
 WHERE ld.client_id = c.id
) l ON TRUE

LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                          AS run_outcomes_total,
    COUNT(*) FILTER (WHERE ro.status = 'served')      AS run_outcomes_served,
    (SELECT r2.status     FROM public.icp_run_outcomes r2
      WHERE r2.client_id = c.id ORDER BY r2.created_at DESC LIMIT 1) AS last_run_status,
    (SELECT r2.created_at FROM public.icp_run_outcomes r2
      WHERE r2.client_id = c.id ORDER BY r2.created_at DESC LIMIT 1) AS last_run_at
  FROM public.icp_run_outcomes ro
 WHERE ro.client_id = c.id
) o ON TRUE

-- ── THE REVIEW TRIGGER ─────────────────────────────────────────────────────────────────
-- Condition ① (a pass was claimed) AND condition ② (there are null-programme rows the new
-- reader would hide). Condition ③ (funding) is REPORTED above, never filtered on — see the
-- header for why excluding funded accounts could hide the very case we are looking for.
WHERE COALESCE(c.proof_passes_done, 0) >= 1
  AND l.null_programme_surfaced > 0

ORDER BY l.null_programme_awaiting DESC, c.proof_passes_done DESC, c.created_at ASC;


-- ═══════════════════════════════════════════════════════════════════════════════════════
-- QUERY 2 — THE COUNTERWEIGHT. Run this one too, and read them together.
--
-- Query 1 deliberately cannot see a client who ran a proof pass that produced ZERO leads, or
-- one whose rows are all programme-attributed. This one lists EVERY client that has ever had
-- a pass claimed, so "query 1 returned nothing" can be distinguished from "nobody has ever
-- run a proof at all" — which are completely different facts about the risk.
-- ═══════════════════════════════════════════════════════════════════════════════════════

SELECT
  c.id                                   AS client_id,
  c.company_name,
  c.commercial_model,
  c.is_demo,
  COALESCE(c.proof_passes_done, 0)       AS proof_passes_done,
  c.proof_started_at,
  COALESCE(c.proof_records_committed, 0) AS proof_records_committed,
  (SELECT COUNT(*) FROM public.leads ld WHERE ld.client_id = c.id)                       AS leads_total,
  (SELECT COUNT(*) FROM public.leads ld WHERE ld.client_id = c.id
     AND ld.programme_id IS NULL AND ld.surfaced_for_approval_at IS NOT NULL)            AS null_programme_surfaced_leads,
  c.created_at                           AS client_created_at
FROM public.clients c
WHERE COALESCE(c.proof_passes_done, 0) >= 1
ORDER BY c.proof_passes_done DESC, c.created_at ASC;
