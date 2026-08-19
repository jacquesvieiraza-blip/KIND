-- HC-1 — ONE EMAIL SHAPE ON THE OPT-OUT SPINE (19 Aug 2026)
--
-- THE DEFECT. "opt_out_blocklist" is the table that decides whether a person who told us to
-- stop gets emailed again. Its writers disagreed about letter case: the unsubscribe route and
-- the bounce handler lowercased, while the consent-decline writer, the manual-block writer and
-- the reply-STOP writer stored the address exactly as it arrived. Every send-path probe then
-- compared EXACTLY (".eq('email', lead.email)") against "leads.email", which the code's own
-- comment describes as "stored raw". So "John@Acme.com" opting out could leave a row that no
-- send-path probe ever matched — a person who used the legal opt-out mechanism, still mailable.
--
-- The code fix normalises every writer and every probe. This migration fixes the ROWS THAT
-- ALREADY EXIST, because a normalised probe against a raw stored row misses just as badly.
--
-- ── WHY STEP 1 EXISTS, AND WHY IT IS NOT "KEEP THE EARLIEST ROW" ─────────────────────────
-- Deduplicating case-variants needs a survivor, and the obvious rule — keep the earliest
-- "created_at" — CAN UNBLOCK SOMEONE. If the earliest variant is the one carrying
-- "opted_back_in_at" and a later variant is still blocked, keeping the earliest and deleting
-- the rest takes a suppressed person OFF the suppression list. That is the one direction this
-- table must never move. Founder-ruled 19 Aug: FAIL CLOSED. Identity still comes from the
-- earliest row, but if ANY case-variant is still blocked, the survivor is blocked.
--
-- IDEMPOTENT. Step 1 only touches rows that have a blocked sibling; step 2 only deletes rows
-- that are not the first of their group; step 3 only rewrites rows that differ from their own
-- normalised form. A second run changes nothing.
--
-- NULL-SAFE. Rows written by the WhatsApp opt-out path carry "whatsapp_number" and a NULL
-- email. Every statement below is guarded on "email IS NOT NULL" so those are never touched.

-- ── 1 · FAIL CLOSED — a still-blocked case-variant wins over an opted-back-in one ─────────
UPDATE public.opt_out_blocklist b
   SET opted_back_in_at = NULL
 WHERE b.email IS NOT NULL
   AND b.opted_back_in_at IS NOT NULL
   AND EXISTS (
     SELECT 1
       FROM public.opt_out_blocklist o
      WHERE o.email IS NOT NULL
        AND o.id <> b.id
        AND lower(btrim(o.email)) = lower(btrim(b.email))
        AND o.opted_back_in_at IS NULL
   );

-- ── 2 · DEDUPLICATE case-variants, keeping the EARLIEST created_at as the survivor ────────
-- Ordered by created_at then id so the choice is deterministic on a tie (and on NULL dates,
-- which sort last rather than winning by accident).
DELETE FROM public.opt_out_blocklist d
 USING (
   SELECT id,
          row_number() OVER (
            PARTITION BY lower(btrim(email))
            ORDER BY created_at ASC NULLS LAST, id ASC
          ) AS rn
     FROM public.opt_out_blocklist
    WHERE email IS NOT NULL
 ) k
 WHERE d.id = k.id
   AND k.rn > 1;

-- ── 3 · NORMALISE what remains ────────────────────────────────────────────────────────────
UPDATE public.opt_out_blocklist
   SET email = lower(btrim(email))
 WHERE email IS NOT NULL
   AND email <> lower(btrim(email));
