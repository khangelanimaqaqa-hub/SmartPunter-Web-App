-- Admin user-management helpers for SmartPunter.
-- Run this migration in the Supabase SQL Editor after the original schema.

CREATE OR REPLACE FUNCTION admin_list_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text,
  membership_status text,
  subscription_plan text,
  subscription_start timestamptz,
  subscription_expiry timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.role,
    p.membership_status,
    p.subscription_plan,
    p.subscription_start,
    p.subscription_expiry,
    p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_profiles() TO authenticated;

CREATE OR REPLACE FUNCTION admin_set_membership(
  p_user_id uuid,
  p_status text,
  p_plan text DEFAULT NULL,
  p_days int DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start timestamptz := now();
  v_current_expiry timestamptz;
  v_expiry timestamptz;
  v_amount numeric;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_status NOT IN ('free', 'active', 'expired', 'suspended') THEN
    RAISE EXCEPTION 'Invalid membership status';
  END IF;

  IF p_status = 'active' THEN
    IF p_plan NOT IN ('weekly', 'monthly', 'quarterly', 'yearly') THEN
      RAISE EXCEPTION 'Invalid plan';
    END IF;
    IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
      RAISE EXCEPTION 'Invalid duration';
    END IF;

    SELECT subscription_expiry INTO v_current_expiry FROM profiles WHERE id = p_user_id;
    v_start := CASE WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN v_current_expiry ELSE now() END;
    v_expiry := v_start + (p_days || ' days')::interval;

    v_amount := CASE p_plan
      WHEN 'weekly' THEN 29.99
      WHEN 'monthly' THEN 199
      WHEN 'quarterly' THEN 399
      WHEN 'yearly' THEN 999
    END;

    UPDATE profiles
    SET membership_status = 'active',
        subscription_plan = p_plan,
        subscription_start = COALESCE(subscription_start, now()),
        subscription_expiry = v_expiry,
        updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO subscriptions (user_id, plan, amount, currency, status, start_date, expiry_date)
    VALUES (p_user_id, p_plan, v_amount, 'ZAR', 'active', now(), v_expiry);
  ELSE
    UPDATE profiles
    SET membership_status = p_status,
        subscription_plan = CASE WHEN p_status = 'free' THEN NULL ELSE subscription_plan END,
        subscription_start = CASE WHEN p_status = 'free' THEN NULL ELSE subscription_start END,
        subscription_expiry = CASE WHEN p_status = 'free' THEN NULL ELSE subscription_expiry END,
        updated_at = now()
    WHERE id = p_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_membership(uuid, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_membership(uuid, text, text, int) TO authenticated;
