/*
# SmartPunter production schema: tips, profiles, subscriptions, notifications, settings

Creates the full data model for a production football predictions app with secure RLS and admin-only mutations via SECURITY DEFINER functions.

## New Tables
- profiles: mirrors auth.users with role (user/admin) and membership info
- tips: all football predictions with match phase (upcoming/live/finished) and result
- subscriptions: VIP subscription history per user
- notifications: per-user notifications
- app_settings: global app config (single row)

## Security
- RLS on all tables.
- Published tips readable by anon + authenticated; drafts admin-only.
- Profiles: users can SELECT/UPDATE own row, but only display_name + notifications_enabled (column-level grant).
- All tip mutations go through SECURITY DEFINER functions that verify admin role.
- Subscription activation via SECURITY DEFINER function.
- Auto-creates profile on signup via trigger.
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT 'Punter',
  role text NOT NULL DEFAULT 'user',
  membership_status text NOT NULL DEFAULT 'free',
  subscription_plan text,
  subscription_start timestamptz,
  subscription_expiry timestamptz,
  email_verified boolean NOT NULL DEFAULT false,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (display_name, notifications_enabled) ON profiles TO authenticated;

-- ============ TIPS ============
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date date NOT NULL,
  kickoff_time timestamptz NOT NULL,
  league text NOT NULL DEFAULT 'Premier Soccer League',
  country text NOT NULL DEFAULT 'South Africa',
  home_team text NOT NULL,
  away_team text NOT NULL,
  market text NOT NULL,
  prediction text NOT NULL,
  odds numeric NOT NULL DEFAULT 1.0,
  confidence text NOT NULL DEFAULT 'Medium',
  analysis text NOT NULL DEFAULT '',
  access_level text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'draft',
  result text NOT NULL DEFAULT 'pending',
  final_score text,
  home_score int,
  away_score int,
  minute int,
  phase text NOT NULL DEFAULT 'upcoming',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tips_select_published" ON tips;
CREATE POLICY "tips_select_published" ON tips FOR SELECT
  TO anon, authenticated USING (status = 'published');

DROP POLICY IF EXISTS "tips_select_draft_admin" ON tips;
CREATE POLICY "tips_select_draft_admin" ON tips FOR SELECT
  TO authenticated USING (
    status IN ('draft', 'archived')
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

REVOKE ALL ON tips FROM anon, authenticated;

-- ============ SUBSCRIPTIONS ============
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  plan text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'system',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ APP_SETTINGS ============
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsible_gambling_message text NOT NULL DEFAULT 'Gambling can be addictive. SmartPunter provides predictions for entertainment purposes only — no outcome is ever guaranteed. Please play responsibly. National Responsible Gambling Programme Helpline: 0800 006 008. No persons under 18.',
  support_email text NOT NULL DEFAULT 'support@smartpunter.co.za',
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_all" ON app_settings;
CREATE POLICY "settings_select_all" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_tips_match_date ON tips (match_date);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips (status);
CREATE INDEX IF NOT EXISTS idx_tips_phase ON tips (phase);
CREATE INDEX IF NOT EXISTS idx_tips_access_level ON tips (access_level);
CREATE INDEX IF NOT EXISTS idx_tips_kickoff_time ON tips (kickoff_time);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- ============ HELPER: is_admin ============
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

-- ============ ACTIVATE SUBSCRIPTION ============
CREATE OR REPLACE FUNCTION activate_subscription(p_plan text, p_days int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_start timestamptz := now();
  v_expiry timestamptz := now() + (p_days || ' days')::interval;
BEGIN
  IF p_plan NOT IN ('weekly', 'monthly', 'quarterly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;
  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    RAISE EXCEPTION 'Invalid duration';
  END IF;

  v_amount := CASE p_plan
    WHEN 'weekly' THEN 29.99
    WHEN 'monthly' THEN 199
    WHEN 'quarterly' THEN 399
    WHEN 'yearly' THEN 999
  END;

  UPDATE profiles
  SET membership_status = 'active',
      subscription_plan = p_plan,
      subscription_start = v_start,
      subscription_expiry = v_expiry,
      updated_at = now()
  WHERE id = auth.uid();

  INSERT INTO subscriptions (user_id, plan, amount, currency, status, start_date, expiry_date)
  VALUES (auth.uid(), p_plan, v_amount, 'ZAR', 'active', v_start, v_expiry);
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_subscription FROM anon;
GRANT EXECUTE ON FUNCTION activate_subscription TO authenticated;

-- ============ CREATE TIP (admin only) ============
CREATE OR REPLACE FUNCTION create_tip(
  p_match_date date,
  p_kickoff_time timestamptz,
  p_league text,
  p_country text,
  p_home_team text,
  p_away_team text,
  p_market text,
  p_prediction text,
  p_odds numeric,
  p_confidence text,
  p_analysis text,
  p_access_level text,
  p_status text DEFAULT 'draft'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tip_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_confidence NOT IN ('Low', 'Medium', 'High') THEN
    RAISE EXCEPTION 'Invalid confidence level';
  END IF;
  IF p_access_level NOT IN ('free', 'vip') THEN
    RAISE EXCEPTION 'Invalid access level';
  END IF;
  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  INSERT INTO tips (
    match_date, kickoff_time, league, country, home_team, away_team,
    market, prediction, odds, confidence, analysis, access_level, status,
    phase, published_at, created_by
  ) VALUES (
    p_match_date, p_kickoff_time, p_league, p_country, p_home_team, p_away_team,
    p_market, p_prediction, p_odds, p_confidence, p_analysis, p_access_level, p_status,
    CASE WHEN p_status = 'published' THEN
      CASE WHEN p_kickoff_time <= now() THEN 'live' ELSE 'upcoming' END
    ELSE 'upcoming' END,
    CASE WHEN p_status = 'published' THEN now() ELSE NULL END,
    auth.uid()
  )
  RETURNING id INTO v_tip_id;

  RETURN v_tip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_tip FROM anon;
GRANT EXECUTE ON FUNCTION create_tip TO authenticated;

-- ============ UPDATE TIP (admin only) ============
CREATE OR REPLACE FUNCTION update_tip(
  p_tip_id uuid,
  p_match_date date,
  p_kickoff_time timestamptz,
  p_league text,
  p_country text,
  p_home_team text,
  p_away_team text,
  p_market text,
  p_prediction text,
  p_odds numeric,
  p_confidence text,
  p_analysis text,
  p_access_level text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_confidence NOT IN ('Low', 'Medium', 'High') THEN
    RAISE EXCEPTION 'Invalid confidence level';
  END IF;
  IF p_access_level NOT IN ('free', 'vip') THEN
    RAISE EXCEPTION 'Invalid access level';
  END IF;
  IF p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE tips SET
    match_date = p_match_date,
    kickoff_time = p_kickoff_time,
    league = p_league,
    country = p_country,
    home_team = p_home_team,
    away_team = p_away_team,
    market = p_market,
    prediction = p_prediction,
    odds = p_odds,
    confidence = p_confidence,
    analysis = p_analysis,
    access_level = p_access_level,
    status = p_status,
    phase = CASE WHEN p_status = 'published' THEN
      CASE WHEN p_kickoff_time <= now() AND (result = 'pending' OR result IS NULL) THEN 'live'
           WHEN result != 'pending' THEN 'finished'
           ELSE 'upcoming' END
    ELSE 'upcoming' END,
    published_at = CASE WHEN p_status = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
    updated_at = now()
  WHERE id = p_tip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_tip FROM anon;
GRANT EXECUTE ON FUNCTION update_tip TO authenticated;

-- ============ DELETE TIP (admin only) ============
CREATE OR REPLACE FUNCTION delete_tip(p_tip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM tips WHERE id = p_tip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_tip FROM anon;
GRANT EXECUTE ON FUNCTION delete_tip TO authenticated;

-- ============ SET TIP RESULT (admin only) ============
CREATE OR REPLACE FUNCTION set_tip_result(
  p_tip_id uuid,
  p_result text,
  p_home_score int DEFAULT NULL,
  p_away_score int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_result NOT IN ('pending', 'won', 'lost', 'void') THEN
    RAISE EXCEPTION 'Invalid result';
  END IF;

  UPDATE tips SET
    result = p_result,
    home_score = p_home_score,
    away_score = p_away_score,
    final_score = CASE WHEN p_home_score IS NOT NULL AND p_away_score IS NOT NULL
      THEN p_home_score || ' - ' || p_away_score ELSE NULL END,
    phase = CASE WHEN p_result = 'pending' THEN phase ELSE 'finished' END,
    minute = CASE WHEN p_result = 'pending' THEN minute ELSE NULL END,
    updated_at = now()
  WHERE id = p_tip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_tip_result FROM anon;
GRANT EXECUTE ON FUNCTION set_tip_result TO authenticated;

-- ============ PUBLISH TIP (admin only) ============
CREATE OR REPLACE FUNCTION publish_tip(p_tip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_kickoff timestamptz;
  v_result text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT kickoff_time, result INTO v_kickoff, v_result FROM tips WHERE id = p_tip_id;

  UPDATE tips SET
    status = 'published',
    published_at = COALESCE(published_at, now()),
    phase = CASE WHEN v_result != 'pending' THEN 'finished'
                 WHEN v_kickoff <= now() THEN 'live'
                 ELSE 'upcoming' END,
    updated_at = now()
  WHERE id = p_tip_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION publish_tip FROM anon;
GRANT EXECUTE ON FUNCTION publish_tip TO authenticated;

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, false)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ DEFAULT APP SETTINGS ============
INSERT INTO app_settings (responsible_gambling_message, support_email, maintenance_mode)
SELECT 'Gambling can be addictive. SmartPunter provides predictions for entertainment purposes only — no outcome is ever guaranteed. Please play responsibly. National Responsible Gambling Programme Helpline: 0800 006 008. No persons under 18.',
       'support@smartpunter.co.za',
       false
WHERE NOT EXISTS (SELECT 1 FROM app_settings);

-- ============ GRANTS ============
GRANT SELECT ON app_settings TO anon, authenticated;
GRANT SELECT ON tips TO anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT INSERT ON subscriptions TO authenticated;
GRANT UPDATE ON notifications TO authenticated;
