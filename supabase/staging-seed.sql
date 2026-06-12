-- ════════════════════════════════════════════════════════════════════════════
-- K.I.N.D — STAGING SEED DATA
-- Run AFTER staging-schema.sql, and AFTER you have signed up at least once
-- (so auth.users has a row).
--
-- What this creates:
--   • 1 test company (MaceyLuxe Staging) linked to your signed-in account
--   • 3 ICPs (Fintech, Telco, Retail)
--   • 50 fake leads distributed across the ICPs
--   • 2 FIGSY campaigns
--   • 20 lead enrollments with sent emails
--   • 5 replies (mixed classifications)
--   • 3 credit_transactions
--   • 1 subscription (FIGSY active)
--   • FIGSY memory row
--
-- HOW TO USE:
--   1. Sign up via the Railway staging URL (create your test account)
--   2. Paste staging-schema.sql in SQL Editor → Run
--   3. Paste this file in SQL Editor → Run
--   4. Refresh the staging portal — you'll see MaceyLuxe with 50 leads
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_user_id   uuid;
  v_client_id uuid;
  v_icp1_id   uuid;
  v_icp2_id   uuid;
  v_icp3_id   uuid;
  v_campaign1 uuid;
  v_campaign2 uuid;
  lead_ids    uuid[] := '{}';
  v_lead_id   uuid;
  i           integer;
  names_first text[] := ARRAY[
    'Amara','Tunde','Zola','Sipho','Fatima','Kwame','Nadia','Emeka','Leila','Olu',
    'Priya','Marcus','Yemi','Aisha','Kofi','Zanele','Dami','Tariq','Nkechi','Abebe',
    'Sarah','David','Chioma','Jabu','Hadley','Ife','Kemi','Liam','Nonso','Adaeze',
    'Bolu','Chloe','Dayo','Eva','Felix','Grace','Hana','Ivan','Jade','Karla',
    'Leo','Mia','Nate','Ona','Pete','Quinn','Rina','Sam','Temi','Uma'
  ];
  names_last  text[] := ARRAY[
    'Nwosu','Adeyemi','Mthembu','Dlamini','Hassan','Mensah','Okafor','Diallo',
    'Ndlovu','Eze','Sharma','Peters','Abiodun','Boateng','Khumalo','Osei',
    'Williams','Johnson','Smith','Brown','Davis','Wilson','Taylor','Anderson',
    'Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez',
    'Robinson','Clark','Rodriguez','Lewis','Lee','Walker','Hall','Allen',
    'Young','Hernandez','King','Wright','Lopez','Hill','Scott','Green','Adams','Baker'
  ];
  companies   text[] := ARRAY[
    'First National Digital','Vodacom SMB','Pick n Pay Business','Capitec Growth',
    'MTN Enterprise','Standard Bank Tech','Hollard InsurTech','FNB Innovation',
    'Shoprite Digital','Discovery Business','Investec Ventures','Absa Digital',
    'Old Mutual Growth','Sanlam Ventures','Liberty Tech','Nedbank Innovation',
    'Tiger Brands Digital','Bidvest Solutions','Aspen Digital','Sasol Ventures',
    'TymeBank Growth','Yoco Fintech','Peach Payments','DPO Group Africa',
    'Flutterwave SA','Paystack SA','Lipa Later SA','M-KOPA SA','Branch SA','Jumo SA',
    'Mukuru Digital','Mama Money','WorldRemit SA','Payfast SA','Ozow Payments',
    'SnapScan','Zapper SA','Stitch Money','Ozow Enterprise','Peach Pay'
  ];
  titles      text[] := ARRAY[
    'Head of Sales','VP Sales','Sales Director','Commercial Director',
    'Business Development Manager','Revenue Director','Chief Revenue Officer',
    'Head of Revenue','Sales Manager','Account Director',
    'Regional Sales Director','Country Manager','Growth Lead','Partnerships Lead',
    'GTM Lead','Sales Lead','Revenue Manager','BD Lead'
  ];
  countries   text[] := ARRAY['South Africa','Nigeria','Kenya','Ghana','Egypt','Morocco','Rwanda','Tanzania'];
  industries  text[] := ARRAY['Fintech','Telecoms','Retail','Banking','InsurTech','PropTech','Logistics','E-commerce'];
begin
  -- ── Get the first user (you, after signing up) ────────────────────────────
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_user_id is null then
    raise exception 'No users found. Sign up at the staging portal first, then re-run this seed.';
  end if;

  -- ── Create client ─────────────────────────────────────────────────────────
  insert into public.clients (
    user_id, company_name, industry, country, website, phone,
    credit_balance, figsy_credits_remaining, onboarded_at
  ) values (
    v_user_id, 'MaceyLuxe Staging', 'Technology', 'South Africa',
    'https://maceyluxe.staging.test', '+27 11 000 0000',
    12500, 8000, now()
  )
  on conflict (user_id) do update set
    company_name = excluded.company_name,
    credit_balance = excluded.credit_balance
  returning id into v_client_id;

  -- ── Seed as owner in client_members ───────────────────────────────────────
  insert into public.client_members (client_id, user_id, email, role, accepted_at)
  select v_client_id, v_user_id, u.email, 'owner', now()
  from auth.users u where u.id = v_user_id
  on conflict (client_id, user_id) do nothing;

  -- ── Subscription (FIGSY active) ───────────────────────────────────────────
  insert into public.subscriptions (
    client_id, product, tier, status, billing_interval,
    amount_zar, current_period_start, current_period_end
  ) values (
    v_client_id, 'lead_gen_figsy', 'advanced', 'active', 'monthly',
    4999, now(), now() + interval '30 days'
  )
  on conflict (client_id, product) do nothing;

  -- ── ICPs ──────────────────────────────────────────────────────────────────
  insert into public.icps (
    client_id, name, industries, job_titles, seniority_levels,
    company_sizes, geographies, keywords, is_active
  ) values (
    v_client_id,
    'Fintech Decision Makers ZA',
    ARRAY['Fintech','Banking'],
    ARRAY['Head of Sales','VP Sales','CRO','Revenue Director'],
    ARRAY['Director','VP','C-Suite'],
    ARRAY['51-200','201-500'],
    ARRAY['South Africa','Nigeria'],
    ARRAY['fintech','payments','digital banking','revenue growth'],
    true
  ) returning id into v_icp1_id;

  insert into public.icps (
    client_id, name, industries, job_titles, seniority_levels,
    company_sizes, geographies, keywords, is_active
  ) values (
    v_client_id,
    'Telco & Enterprise SA',
    ARRAY['Telecoms','Technology'],
    ARRAY['Sales Director','Commercial Director','Business Development Manager'],
    ARRAY['Director','Manager'],
    ARRAY['201-500','500+'],
    ARRAY['South Africa','Kenya','Ghana'],
    ARRAY['telco','enterprise','B2B sales','digital transformation'],
    true
  ) returning id into v_icp2_id;

  insert into public.icps (
    client_id, name, industries, job_titles, seniority_levels,
    company_sizes, geographies, keywords, is_active
  ) values (
    v_client_id,
    'Retail & E-commerce Africa',
    ARRAY['Retail','E-commerce'],
    ARRAY['Head of Revenue','Growth Lead','Partnerships Lead'],
    ARRAY['Manager','Director'],
    ARRAY['11-50','51-200'],
    ARRAY['South Africa','Nigeria','Kenya'],
    ARRAY['retail','e-commerce','growth','outbound sales'],
    true
  ) returning id into v_icp3_id;

  -- ── 50 Leads ──────────────────────────────────────────────────────────────
  for i in 1..50 loop
    declare
      v_icp_id    uuid;
      v_score     integer;
      v_status    text;
      v_country   text;
      v_industry  text;
    begin
      -- Distribute across ICPs: 1-18 → ICP1, 19-35 → ICP2, 36-50 → ICP3
      if i <= 18 then v_icp_id := v_icp1_id;
      elsif i <= 35 then v_icp_id := v_icp2_id;
      else v_icp_id := v_icp3_id;
      end if;

      v_score    := 45 + (random() * 50)::integer;
      v_country  := countries[1 + (random() * (array_length(countries,1)-1))::integer];
      v_industry := industries[1 + (random() * (array_length(industries,1)-1))::integer];

      -- Vary statuses for realistic preview
      if i <= 5 then v_status := 'consent_given';
      elsif i <= 12 then v_status := 'consent_sent';
      elsif i <= 20 then v_status := 'contacted';
      elsif i <= 35 then v_status := 'scored';
      else v_status := 'pending';
      end if;

      insert into public.leads (
        client_id, icp_id,
        first_name, last_name, email, job_title, company,
        country, industry, seniority, score, score_reasoning,
        scored_at, status, apollo_consented,
        delivered_at, created_at
      ) values (
        v_client_id,
        v_icp_id,
        names_first[i],
        names_last[i],
        lower(names_first[i]) || '.' || lower(names_last[i]) || '@staging-' || (i * 7) || '.test',
        titles[1 + (random() * (array_length(titles,1)-1))::integer],
        companies[1 + (random() * (array_length(companies,1)-1))::integer],
        v_country,
        v_industry,
        case when i % 3 = 0 then 'Director' when i % 3 = 1 then 'VP' else 'Manager' end,
        v_score,
        'Strong ICP match: ' || v_industry || ' decision-maker in ' || v_country || '. High engagement signals.',
        now() - (random() * 14 || ' days')::interval,
        v_status,
        true,
        now() - (random() * 14 || ' days')::interval,
        now() - (random() * 30 || ' days')::interval
      ) returning id into v_lead_id;

      lead_ids := array_append(lead_ids, v_lead_id);
    end;
  end loop;

  -- ── Campaigns ─────────────────────────────────────────────────────────────
  insert into public.figsy_campaigns (
    client_id, name, status, icp_id,
    leads_enrolled, emails_sent, replies_total, replies_interested,
    meetings_booked, steps_count, settings, model_preference
  ) values (
    v_client_id,
    'Fintech Outreach — June 2026',
    'active',
    v_icp1_id,
    18, 34, 7, 3, 2, 3,
    '{"steps": [{"day": 0, "on_reply": "stop"}, {"day": 3, "on_reply": "stop"}, {"day": 7, "on_reply": "stop"}], "daily_quota": 10}'::jsonb,
    'haiku'
  ) returning id into v_campaign1;

  insert into public.figsy_campaigns (
    client_id, name, status, icp_id,
    leads_enrolled, emails_sent, replies_total, replies_interested,
    meetings_booked, steps_count, settings, model_preference
  ) values (
    v_client_id,
    'Telco Enterprise Push — Q3',
    'active',
    v_icp2_id,
    12, 18, 4, 2, 1, 3,
    '{"steps": [{"day": 0, "on_reply": "stop"}, {"day": 4, "on_reply": "stop"}, {"day": 10, "on_reply": "stop"}], "daily_quota": 8}'::jsonb,
    'sonnet'
  ) returning id into v_campaign2;

  -- ── Enrollments + sent emails (first 20 leads) ───────────────────────────
  for i in 1..20 loop
    declare
      v_enrollment_id uuid;
      v_enroll_campaign uuid;
      v_step integer;
    begin
      v_enroll_campaign := case when i <= 12 then v_campaign1 else v_campaign2 end;
      v_step := case when i % 3 = 0 then 3 when i % 3 = 1 then 2 else 1 end;

      insert into public.figsy_enrollments (
        campaign_id, lead_id, client_id, status, current_step, enrolled_at
      ) values (
        v_enroll_campaign, lead_ids[i], v_client_id,
        case when i <= 5 then 'replied' when i <= 15 then 'in_progress' else 'enrolled' end,
        v_step,
        now() - (random() * 10 || ' days')::interval
      )
      on conflict (campaign_id, lead_id) do nothing
      returning id into v_enrollment_id;

      if v_enrollment_id is not null then
        -- Step 1 email (all enrolled leads)
        insert into public.figsy_sent_emails (
          enrollment_id, campaign_id, lead_id, step, subject, body,
          status, sent_at, created_at
        ) values (
          v_enrollment_id, v_enroll_campaign, lead_ids[i],
          1,
          'Quick question re: sales growth at ' || companies[1 + (random() * 39)::integer],
          'Hi ' || names_first[i] || E',\n\nI noticed your team is scaling outbound. We built KIND to give every rep their own AI SDR — so your team contacts 10x more prospects without hiring.\n\nWorth a 15-min chat this week?\n\nBest,\nFIGSY (via MaceyLuxe Staging)',
          'sent',
          now() - (random() * 8 || ' days')::interval,
          now() - (random() * 8 || ' days')::interval
        );

        -- Step 2 email (leads further along)
        if v_step >= 2 then
          insert into public.figsy_sent_emails (
            enrollment_id, campaign_id, lead_id, step, subject, body,
            status, sent_at, created_at
          ) values (
            v_enrollment_id, v_enroll_campaign, lead_ids[i],
            2,
            'Re: sales growth — one more thought',
            'Hi ' || names_first[i] || E',\n\nFollowing up from last week. Clients in ' || countries[1 + (random() * 7)::integer] || ' are booking 3-5 extra meetings per rep per month.\n\nHappy to share a quick case study. Any time this week?\n\nBest,\nFIGSY',
            'sent',
            now() - (random() * 4 || ' days')::interval,
            now() - (random() * 4 || ' days')::interval
          );
        end if;
      end if;
    end;
  end loop;

  -- ── 5 Replies (realistic mix) ─────────────────────────────────────────────
  for i in 1..5 loop
    declare
      v_enroll_campaign uuid := case when i <= 3 then v_campaign1 else v_campaign2 end;
    begin
      insert into public.figsy_replies (
        campaign_id, lead_id, client_id,
        from_email, from_name, subject, body,
        classification, classification_reasoning,
        received_at
      ) values (
        v_enroll_campaign,
        lead_ids[i],
        v_client_id,
        lower(names_first[i]) || '.' || lower(names_last[i]) || '@staging-' || (i * 7) || '.test',
        names_first[i] || ' ' || names_last[i],
        'Re: Quick question re: sales growth',
        case i
          when 1 then 'Yes, this looks interesting. Can we do Thursday 2pm?'
          when 2 then 'Thanks for reaching out. Sounds relevant — can you send a deck first?'
          when 3 then 'We''re actually in the market for something like this. Let''s connect.'
          when 4 then 'Not right now, we have our own sales team. Please remove me.'
          else 'Out of office until 20 June. I''ll get back to you.'
        end,
        case i when 1 then 'hot' when 2 then 'warm' when 3 then 'interested' when 4 then 'opt_out' else 'out_of_office' end,
        case i when 1 then 'Lead ready to book — specified a meeting time.' when 2 then 'Positive intent, requesting materials.' when 3 then 'Actively in-market, high priority.' when 4 then 'Explicit opt-out request.' else 'Auto-responder detected.' end,
        now() - (random() * 3 || ' days')::interval
      );
    end;
  end loop;

  -- ── Credit transactions ────────────────────────────────────────────────────
  insert into public.credit_transactions (client_id, type, amount, plan, note, created_at)
  values
    (v_client_id, 'manual_grant', 12500, 'kind_ai',  'Staging test — initial credit grant',              now() - interval '30 days'),
    (v_client_id, 'consumed',     -1200, 'kind_ai',  'Lead scoring batch — 50 leads',                    now() - interval '14 days'),
    (v_client_id, 'consumed',      -800, 'kind_ai',  'FIGSY outreach — 20 enrollments × 2 emails avg',   now() - interval '3 days');

  -- ── FIGSY memory ─────────────────────────────────────────────────────────
  insert into public.figsy_memory (
    client_id, best_subject_lines, avg_reply_rate_30d,
    total_sent_all_time, total_replies_all_time, top_performing_icp,
    last_winning_angle, last_updated
  ) values (
    v_client_id,
    ARRAY[
      'Quick question re: sales growth at {{company}}',
      'Your outbound in {{country}} — one idea',
      '3 extra meetings/month per rep — worth 15 min?'
    ],
    12.5,
    52, 7,
    'Fintech Decision Makers ZA',
    'Specificity + peer proof: naming a country + metric outperforms generic openers 2x.',
    now()
  )
  on conflict (client_id) do update set
    best_subject_lines = excluded.best_subject_lines,
    avg_reply_rate_30d = excluded.avg_reply_rate_30d,
    last_updated       = now();

  raise notice 'Seed complete. Company: MaceyLuxe Staging (%), 50 leads, 2 campaigns.', v_client_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- COMPANY ENGINE SEED (#88) — owner + 3 reps, each with their OWN workspace
-- Run AFTER the main seed above. Makes the Command Centre show real per-rep data.
-- ════════════════════════════════════════════════════════════════════════════
do $$
declare
  v_owner_user   uuid;
  v_owner_client uuid;
  v_company      uuid;
  v_rep          uuid;
  v_camp         uuid;
  v_lead         uuid;
  r              integer;
  j              integer;
  rep_names  text[] := ARRAY['Amara Nwosu','Tunde Adeyemi','Zola Mthembu'];
  rep_emails text[] := ARRAY['amara@maceyluxe.test','tunde@maceyluxe.test','zola@maceyluxe.test'];
  rep_budget int[]  := ARRAY[5000, 5000, 5000];
  rep_auto   text[] := ARRAY['auto','auto','copilot'];
  -- per-rep volume so their performance differs in the leaderboard
  rep_leads  int[]  := ARRAY[18, 14, 9];
  rep_sent   int[]  := ARRAY[34, 26, 15];
  rep_reps   int[]  := ARRAY[5, 3, 2];     -- replies
  rep_book   int[]  := ARRAY[3, 2, 1];     -- meetings booked
begin
  select user_id into v_owner_user from public.clients where company_name = 'MaceyLuxe Staging' limit 1;
  select id      into v_owner_client from public.clients where company_name = 'MaceyLuxe Staging' limit 1;
  if v_owner_user is null then raise exception 'Run the main seed first.'; end if;

  -- Company + make MaceyLuxe the owner seat.
  insert into public.companies (owner_user_id, name, credit_pool, seat_cap)
  values (v_owner_user, 'MaceyLuxe', 40000, 25)
  returning id into v_company;

  update public.clients
    set company_id = v_company, seat_role = 'owner', seat_active = true, seat_accepted_at = now()
    where id = v_owner_client;

  -- 3 reps, each their OWN client workspace (user_id null until they accept).
  for r in 1..3 loop
    insert into public.clients (
      company_id, company_name, invited_email, invite_token,
      seat_role, seat_active, seat_budget, credit_balance, autonomy,
      seat_accepted_at, country, industry
    ) values (
      v_company, rep_names[r], rep_emails[r], replace(gen_random_uuid()::text,'-',''),
      'rep', true, rep_budget[r], greatest(0, rep_budget[r] - (rep_sent[r] * 30)), rep_auto[r],
      now() - ((4 - r) || ' days')::interval, 'South Africa', 'Technology'
    ) returning id into v_rep;

    -- Each rep gets a campaign.
    insert into public.figsy_campaigns (client_id, name, status, leads_enrolled, emails_sent, replies_total, meetings_booked, steps_count, settings)
    values (v_rep, split_part(rep_names[r],' ',1) || '''s Outreach', 'active', rep_leads[r], rep_sent[r], rep_reps[r], rep_book[r], 3, '{}'::jsonb)
    returning id into v_camp;

    -- Each rep gets their own leads.
    for j in 1..rep_leads[r] loop
      insert into public.leads (client_id, first_name, last_name, email, job_title, company, country, status, score, delivered_at)
      values (
        v_rep,
        'Lead' || j, split_part(rep_names[r],' ',1),
        'lead' || j || '.' || lower(split_part(rep_names[r],' ',1)) || '@prospect.test',
        'Head of Sales', 'Prospect Co ' || j, 'South Africa',
        case when j <= rep_book[r] then 'consent_given' when j <= rep_sent[r] then 'contacted' else 'scored' end,
        55 + (random()*40)::int, now()
      ) returning id into v_lead;

      -- Sent emails (up to rep_sent, capped by leads).
      if j <= least(rep_sent[r], rep_leads[r]) then
        insert into public.figsy_sent_emails (campaign_id, lead_id, step, subject, body, status, sent_at)
        values (v_camp, v_lead, 1, 'Quick question', 'Hi — worth a chat?', 'sent', now() - (random()*7 || ' days')::interval);
      end if;

      -- Replies + bookings for the first few.
      if j <= rep_reps[r] then
        insert into public.figsy_replies (campaign_id, lead_id, client_id, from_email, from_name, subject, body, classification, meeting_booked_at, received_at)
        values (
          v_camp, v_lead, v_rep,
          'lead' || j || '@prospect.test', 'Lead' || j,
          'Re: Quick question', case when j <= rep_book[r] then 'Yes, let''s meet.' else 'Interested, tell me more.' end,
          case when j <= rep_book[r] then 'hot' else 'interested' end,
          case when j <= rep_book[r] then now() - (random()*3 || ' days')::interval else null end,
          now() - (random()*3 || ' days')::interval
        );
      end if;
    end loop;

    -- A pending credit request from the first two reps.
    if r <= 2 then
      insert into public.seat_credit_requests (company_id, rep_client_id, amount, reason)
      values (v_company, v_rep, case when r = 1 then 2000 else 1500 end,
        case when r = 1 then 'Q3 telco push — running low mid-campaign' else 'New ICP: fintech founders, SA' end);
    end if;
  end loop;

  -- A couple of winning plays for the company library.
  insert into public.winning_plays (company_id, name, note, reply_rate, pushed_to_all, created_by) values
    (v_company, 'Fintech founder opener', 'Name a peer + a metric in line 1. 2x reply rate.', 14.5, true,  v_owner_user),
    (v_company, 'Telco enterprise angle',  'Lead with a compliance hook for SA telcos.',        11.2, false, v_owner_user);

  raise notice 'Company engine seeded: MaceyLuxe (%), 3 reps with own workspaces, 2 requests, 2 plays.', v_company;
end;
$$;
