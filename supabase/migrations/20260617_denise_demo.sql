-- 20260617_denise_demo.sql
-- Item 188 — make Denise (The Closer) demoable on EXISTING demo accounts.
--
-- Demo accounts (is_demo = true) were created activating lead_gen / lead_gen_figsy /
-- virtual_assistant / chatbot but NOT 'denise'. Both the Denise page and the
-- /denise endpoints gate on an active 'denise' subscription, so Denise rendered the
-- locked/upgrade state and could not be shown in a demo or in Drop 01.
--
-- This backfills every demo client: grants an active 'denise' subscription and, if
-- they have no Denise drafts yet, seeds one warm follow-up + one proposal so the
-- page demos live. Idempotent — safe to re-run. (Future demos are covered in code:
-- admin demo-create adds 'denise', and seed-showcase seeds the sub + drafts.)

-- 1) Active Denise subscription for every demo client missing one.
insert into public.subscriptions
  (client_id, product, tier, status, billing_interval, current_period_start, current_period_end)
select c.id, 'denise', 'starter', 'active', 'monthly', now(), now() + interval '30 days'
from public.clients c
where c.is_demo = true
  and not exists (
    select 1 from public.subscriptions s
    where s.client_id = c.id and s.product = 'denise'
  );

-- 2) Seed two demo drafts (follow-up + proposal) for any demo client that now has a
--    Denise sub but no drafts. The CTE captures "had zero drafts" before inserting so
--    both rows seed together (a plain NOT EXISTS would skip the 2nd after the 1st).
with demo_no_drafts as (
  select c.id as client_id
  from public.clients c
  where c.is_demo = true
    and exists (
      select 1 from public.subscriptions s
      where s.client_id = c.id and s.product = 'denise'
    )
    and not exists (
      select 1 from public.denise_drafts d where d.client_id = c.id
    )
)
insert into public.denise_drafts (client_id, kind, input, output, created_at)
select d.client_id, v.kind, v.input::jsonb, v.output, now() - (v.age_days || ' days')::interval
from demo_no_drafts d
cross join (values
  (
    'follow_up',
    '{"first_name":"Lerato","company":"Yoco","job_title":"Head of Sales","interest_signal":"opening more qualified conversations without adding headcount"}',
    $draft$Hi Lerato,

It was good to connect earlier — you mentioned Yoco is pushing hard into new merchant segments this quarter, and that the real bottleneck was opening enough qualified conversations without adding headcount.

No rush on my side at all, but I put together a quick view of how we’d open those conversations for your team. Happy to walk you through it whenever suits — even 15 minutes next week would do it.

Want me to send a couple of times that work for you?

Warmly,
Denise$draft$,
    2
  ),
  (
    'proposal',
    '{"company":"Stitch Money","call_summary":"Strong close rate but a thin top of funnel; reps sourcing instead of selling; African outbound hit-or-miss on deliverability."}',
    $draft$**Proposal — Stitch Money**

**Where you are**
On our call you said the team closes well, but the top of the funnel is thin — reps are spending hours sourcing instead of selling, and African outbound has been hit-or-miss on deliverability.

**What we’d do**
• FIGSY sources and qualifies your ICP (fintech & SaaS decision-makers across SA, Nigeria, Kenya) and runs warm, personalised sequences.
• Denise closes the seam — confirming booked meetings, prepping your reps, and chasing warm leads so none go cold.
• Everything runs on consented, deliverability-protected sending so you actually land in the inbox.

**Expected outcome**
A predictable flow of qualified conversations — without adding SDR headcount.

**Simple next step**
A 30-minute working session to set your ICP live and book your first sequence. Whenever suits you.

— Denise$draft$,
    1
  )
) as v(kind, input, output, age_days);
