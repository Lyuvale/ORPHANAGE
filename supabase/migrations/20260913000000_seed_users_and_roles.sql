-- =============================================================================
-- Migration: Seed Users & Roles
-- Created: 2026-09-13
-- =============================================================================
-- Creates one user per role for the SUN-001 (Sunrise Children's Home) centre.
-- Password for all users: Admin@12345
--
-- Users created:
--   1. admin@orphanage.app       → PLATFORM_ADMINISTRATOR
--   2. manager@orphanage.app     → CENTRE_MANAGER
--   3. social@orphanage.app      → SOCIAL_WORKER
--   4. caregiver@orphanage.app   → CAREGIVER
--   5. records@orphanage.app     → RECORDS_OFFICER
--   6. accountant@orphanage.app  → ACCOUNTANT_BURSAR
-- =============================================================================

DO $$
DECLARE
  v_centre_uuid UUID;
  v_password TEXT;

  v_auth_id UUID;
  v_profile_id UUID;

  v_role_centre_manager UUID;
  v_role_social_worker UUID;
  v_role_caregiver UUID;
  v_role_records_officer UUID;
  v_role_accountant UUID;
  v_role_platform_admin UUID;
BEGIN
  -- ── Hash password (bcrypt, GoTrue compatible) ──────────────────────────
  v_password := crypt('Admin@12345', gen_salt('crypt'));

  -- ── Look up centre ─────────────────────────────────────────────────────
  SELECT id INTO v_centre_uuid FROM centres WHERE lower(code) = 'sun-001' LIMIT 1;
  IF v_centre_uuid IS NULL THEN
    RAISE EXCEPTION 'Centre SUN-001 not found. Run centre seed first.';
  END IF;

  -- ── Look up roles ──────────────────────────────────────────────────────
  SELECT id INTO v_role_centre_manager  FROM roles WHERE name = 'CENTRE_MANAGER';
  SELECT id INTO v_role_social_worker   FROM roles WHERE name = 'SOCIAL_WORKER';
  SELECT id INTO v_role_caregiver       FROM roles WHERE name = 'CAREGIVER';
  SELECT id INTO v_role_records_officer FROM roles WHERE name = 'RECORDS_OFFICER';
  SELECT id INTO v_role_accountant      FROM roles WHERE name = 'ACCOUNTANT_BURSAR';
  SELECT id INTO v_role_platform_admin  FROM roles WHERE name = 'PLATFORM_ADMINISTRATOR';

  -- ════════════════════════════════════════════════════════════════════════
  -- Helper: create_or_get_user(email, first, last, role_id)
  -- Runs as a sub-block so each user is independent.
  -- ════════════════════════════════════════════════════════════════════════

  -- ────────────────────────────────────────────────────────────────────────
  -- 1. PLATFORM_ADMINISTRATOR  admin@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'admin@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'admin@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Admin","last_name":"User"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'Admin', 'User', 'admin@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_platform_admin, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- 2. CENTRE_MANAGER  manager@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'manager@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'manager@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Grace","last_name":"Mwangi"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'Grace', 'Mwangi', 'manager@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_centre_manager, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- 3. SOCIAL_WORKER  social@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'social@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'social@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"James","last_name":"Ochieng"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'James', 'Ochieng', 'social@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_social_worker, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- 4. CAREGIVER  caregiver@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'caregiver@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'caregiver@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Mary","last_name":"Wambui"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'Mary', 'Wambui', 'caregiver@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_caregiver, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- 5. RECORDS_OFFICER  records@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'records@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'records@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Peter","last_name":"Kamau"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'Peter', 'Kamau', 'records@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_records_officer, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- 6. ACCOUNTANT_BURSAR  accountant@orphanage.app
  -- ────────────────────────────────────────────────────────────────────────
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'accountant@orphanage.app';
  IF v_auth_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_sent_at, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated', 'authenticated',
      'accountant@orphanage.app', v_password,
      now(), '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"first_name":"Amina","last_name":"Hassan"}'::jsonb,
      now(), now(), now(), false
    ) RETURNING id INTO v_auth_id;
  ELSE
    UPDATE auth.users SET encrypted_password = v_password WHERE id = v_auth_id;
  END IF;

  SELECT id INTO v_profile_id FROM user_profiles WHERE auth_user_id = v_auth_id;
  IF v_profile_id IS NULL THEN
    INSERT INTO user_profiles (auth_user_id, centre_id, first_name, last_name, email, status)
    VALUES (v_auth_id, v_centre_uuid, 'Amina', 'Hassan', 'accountant@orphanage.app', 'active')
    RETURNING id INTO v_profile_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id, centre_id, status)
  VALUES (v_profile_id, v_role_accountant, v_centre_uuid, 'active')
  ON CONFLICT (user_id, role_id, centre_id) DO UPDATE SET status = 'active';

  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  RAISE NOTICE ' Seeded 6 users for SUN-001 (Sunrise Children''s Home)';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  RAISE NOTICE ' admin@orphanage.app      → PLATFORM_ADMINISTRATOR';
  RAISE NOTICE ' manager@orphanage.app    → CENTRE_MANAGER';
  RAISE NOTICE ' social@orphanage.app     → SOCIAL_WORKER';
  RAISE NOTICE ' caregiver@orphanage.app  → CAREGIVER';
  RAISE NOTICE ' records@orphanage.app    → RECORDS_OFFICER';
  RAISE NOTICE ' accountant@orphanage.app → ACCOUNTANT_BURSAR';
  RAISE NOTICE ' Password (all): Admin@12345';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';

END $$;
