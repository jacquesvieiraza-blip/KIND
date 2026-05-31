-- Partner programme: partners, referrals, commissions, deal registrations
-- partner_type kept for backwards compat; tier is the new commercial field

CREATE TABLE IF NOT EXISTS partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  email           text NOT NULL UNIQUE,
  company         text,
  country         text,
  partner_type    text NOT NULL DEFAULT 'referral' CHECK (partner_type IN ('referral','agency','technology')),
  tier            text NOT NULL DEFAULT 'referral' CHECK (tier IN ('referral','agency','white_label')),
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.2000,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  referral_code   text UNIQUE,
  demo_env_id     uuid,
  notes           text,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_referrals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id       uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','churned','paused')),
  first_payment_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id, client_id)
);

CREATE TABLE IF NOT EXISTS partner_commissions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id           uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  partner_referral_id  uuid REFERENCES partner_referrals(id),
  client_id            uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_zar           numeric(10,2) NOT NULL,
  amount_usd           numeric(10,2),
  period_month         text NOT NULL,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at              timestamptz,
  wise_reference       text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deal_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  company_name    text NOT NULL,
  contact_name    text NOT NULL,
  contact_email   text NOT NULL,
  company_size    text,
  industry        text,
  country         text,
  estimated_value numeric(10,2),
  notes           text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','won','lost','expired')),
  protected_until timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  won_at          timestamptz,
  lost_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON partner_commissions(partner_id, period_month);
CREATE INDEX IF NOT EXISTS idx_deal_registrations_partner ON deal_registrations(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_deal_registrations_email ON deal_registrations(contact_email);

-- RLS
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_registrations ENABLE ROW LEVEL SECURITY;

-- Partners can read their own record by matching auth email
CREATE POLICY "partners read own record"
  ON partners FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "service role full access on partners"
  ON partners FOR ALL USING (auth.role() = 'service_role');

-- Partner referrals — partner reads own
CREATE POLICY "partners read own referrals"
  ON partner_referrals FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "service role full access on partner_referrals"
  ON partner_referrals FOR ALL USING (auth.role() = 'service_role');

-- Partner commissions — partner reads own
CREATE POLICY "partners read own commissions"
  ON partner_commissions FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "service role full access on partner_commissions"
  ON partner_commissions FOR ALL USING (auth.role() = 'service_role');

-- Deal registrations — partner reads/inserts own
CREATE POLICY "partners read own deals"
  ON deal_registrations FOR SELECT
  USING (partner_id IN (SELECT id FROM partners WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "partners insert own deals"
  ON deal_registrations FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM partners WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));

CREATE POLICY "service role full access on deal_registrations"
  ON deal_registrations FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE partners IS 'Partner programme: referral, agency, white-label tiers. 20/25/30% commission.';
COMMENT ON TABLE deal_registrations IS '60-day deal protection. Partner registers prospect before demoing.';
