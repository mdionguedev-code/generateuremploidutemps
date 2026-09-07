-- ====================================================================
-- MIGRATION DE SÉCURISATION GLOBALE (RLS, POLICIES, RPC SECURITY DEFINER)
-- SaaS Diongue-IziSchool / Planora
-- Date: 2026-09-06
-- ====================================================================

-- 1. EXTENSIONS REQUISES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. ASSURER L'ACTIVATION DE LA ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS establishment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_license_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_activation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS saas_settings ENABLE ROW LEVEL SECURITY;

-- 3. FONCTION UTILITAIRE DE VÉRIFICATION DU RÔLE ADMIN
DROP FUNCTION IF EXISTS is_admin() CASCADE;
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- 4. POLITIQUES DE SÉCURITÉ (POLICIES)

-- --- Table : profiles ---
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- --- Table : establishment_settings ---
DROP POLICY IF EXISTS "settings_select_own_or_admin" ON establishment_settings;
CREATE POLICY "settings_select_own_or_admin" ON establishment_settings
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "settings_insert_own" ON establishment_settings;
CREATE POLICY "settings_insert_own" ON establishment_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "settings_update_own" ON establishment_settings;
CREATE POLICY "settings_update_own" ON establishment_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- --- Table : subjects ---
DROP POLICY IF EXISTS "subjects_all_own_or_admin" ON subjects;
CREATE POLICY "subjects_all_own_or_admin" ON subjects
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- --- Table : teachers ---
DROP POLICY IF EXISTS "teachers_all_own_or_admin" ON teachers;
CREATE POLICY "teachers_all_own_or_admin" ON teachers
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- --- Table : classes ---
DROP POLICY IF EXISTS "classes_all_own_or_admin" ON classes;
CREATE POLICY "classes_all_own_or_admin" ON classes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- --- Table : timetables ---
DROP POLICY IF EXISTS "timetables_all_own_or_admin" ON timetables;
CREATE POLICY "timetables_all_own_or_admin" ON timetables
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

-- --- Table : saas_plans (lecture publique autorisée pour l'affichage des tarifs) ---
DROP POLICY IF EXISTS "plans_select_public" ON saas_plans;
CREATE POLICY "plans_select_public" ON saas_plans
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "plans_modify_admin_only" ON saas_plans;
CREATE POLICY "plans_modify_admin_only" ON saas_plans
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- Table : saas_license_keys (réservée exclusivement aux administrateurs) ---
DROP POLICY IF EXISTS "license_keys_admin_only" ON saas_license_keys;
CREATE POLICY "license_keys_admin_only" ON saas_license_keys
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- Table : saas_activation_requests ---
DROP POLICY IF EXISTS "requests_select_own_or_admin" ON saas_activation_requests;
CREATE POLICY "requests_select_own_or_admin" ON saas_activation_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "requests_insert_authenticated" ON saas_activation_requests;
CREATE POLICY "requests_insert_authenticated" ON saas_activation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "requests_modify_admin_only" ON saas_activation_requests;
CREATE POLICY "requests_modify_admin_only" ON saas_activation_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- --- Table : saas_settings ---
DROP POLICY IF EXISTS "settings_select_authenticated" ON saas_settings;
CREATE POLICY "settings_select_authenticated" ON saas_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_modify_admin_only" ON saas_settings;
CREATE POLICY "settings_modify_admin_only" ON saas_settings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ====================================================================
-- 5. PROCÉDURES STOCKÉES (RPC) DURCIES AVEC CONTRÔLE D'AUTORISATION SQL
-- ====================================================================

-- 5.1 Génération de clés de licence (Réservé Admin)
DROP FUNCTION IF EXISTS admin_generate_license_keys(TEXT, INT, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS admin_generate_license_keys CASCADE;

CREATE OR REPLACE FUNCTION admin_generate_license_keys(
  p_plan_id TEXT,
  p_duration_days INT,
  p_keys TEXT[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  inserted_count INT := 0;
BEGIN
  -- VÉRIFICATION D'AUTORISATION STRICTE CÔTÉ BASE DE DONNÉES
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges Administrateur SaaS requis.';
  END IF;

  FOREACH k IN ARRAY p_keys LOOP
    INSERT INTO saas_license_keys (id, key, plan_id, duration_days, generated_at, status)
    VALUES (
      'key_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6),
      k,
      p_plan_id,
      p_duration_days,
      now(),
      'unused'
    )
    ON CONFLICT (key) DO NOTHING;
    inserted_count := inserted_count + 1;
  END LOOP;

  RETURN json_build_object('success', true, 'count', inserted_count, 'message', 'Clés générées avec succès.');
END;
$$;

-- 5.2 Réinitialisation du mot de passe utilisateur par l'Admin (Réservé Admin)
DROP FUNCTION IF EXISTS admin_reset_user_password(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_reset_user_password CASCADE;

CREATE OR REPLACE FUNCTION admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- VÉRIFICATION D'AUTORISATION STRICTE CÔTÉ BASE DE DONNÉES
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges Administrateur SaaS requis.';
  END IF;

  IF length(p_new_password) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Le mot de passe doit comporter au moins 6 caractères.');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Mot de passe réinitialisé avec succès.');
END;
$$;

-- 5.3 Activation d'une clé de licence par un client (Vérification identité auth.uid)
DROP FUNCTION IF EXISTS redeem_license_key(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS redeem_license_key CASCADE;

CREATE OR REPLACE FUNCTION redeem_license_key(
  p_key TEXT,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key_row RECORD;
  v_plan_row RECORD;
  v_school_name TEXT := 'Établissement';
  v_days INT;
BEGIN
  -- L'utilisateur appelant doit correspondre à p_user_id (ou être admin)
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé : vous ne pouvez activer une clé que pour votre propre compte.';
  END IF;

  -- Recherche de la clé
  SELECT * INTO v_key_row
  FROM saas_license_keys
  WHERE key = trim(p_key)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Clé de licence invalide ou introuvable.');
  END IF;

  IF v_key_row.status = 'used' THEN
    RETURN json_build_object('success', false, 'message', 'Cette clé de licence a déjà été activée.');
  END IF;

  SELECT * INTO v_plan_row
  FROM saas_plans
  WHERE id = v_key_row.plan_id;

  v_days := COALESCE(v_key_row.duration_days, 30);

  -- Récupération du nom d'établissement actuel
  SELECT school_name INTO v_school_name
  FROM establishment_settings
  WHERE user_id = p_user_id;

  -- Marquer la clé comme utilisée
  UPDATE saas_license_keys
  SET status = 'used',
      used_by_user_id = p_user_id,
      used_by_school_name = COALESCE(v_school_name, 'Établissement'),
      used_at = now()
  WHERE key = v_key_row.key;

  -- Mettre à jour l'abonnement dans establishment_settings
  INSERT INTO establishment_settings (user_id, plan_id, status, updated_at)
  VALUES (p_user_id, v_key_row.plan_id, 'active', now())
  ON CONFLICT (user_id) DO UPDATE
  SET plan_id = EXCLUDED.plan_id,
      status = 'active',
      updated_at = now();

  RETURN json_build_object(
    'success', true,
    'message', 'Clé activée avec succès ! Votre abonnement est maintenant actif.',
    'plan_id', v_key_row.plan_id,
    'plan_name', COALESCE(v_plan_row.name, 'Formule Officielle')
  );
END;
$$;

-- 5.4 Validation et livraison d'une demande d'activation (Réservé Admin)
DROP FUNCTION IF EXISTS admin_deliver_activation_request(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS admin_deliver_activation_request CASCADE;

CREATE OR REPLACE FUNCTION admin_deliver_activation_request(
  p_request_id TEXT,
  p_assigned_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : privilèges Administrateur SaaS requis.';
  END IF;

  UPDATE saas_activation_requests
  SET status = 'delivered',
      delivered_at = now(),
      assigned_key = COALESCE(p_assigned_key, assigned_key)
  WHERE id = p_request_id;

  RETURN json_build_object('success', true, 'message', 'Demande validée et marquée comme livrée.');
END;
$$;

-- 6. RÉVOCATION DES DROITS D'EXÉCUTION PUBLICS SUR LES FONCTIONS D'ADMINISTRATION
REVOKE EXECUTE ON FUNCTION admin_generate_license_keys(TEXT, INT, TEXT[]) FROM public, anon;
REVOKE EXECUTE ON FUNCTION admin_reset_user_password(UUID, TEXT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION admin_deliver_activation_request(TEXT, TEXT) FROM public, anon;
GRANT EXECUTE ON FUNCTION admin_generate_license_keys(TEXT, INT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_deliver_activation_request(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_license_key(TEXT, UUID) TO authenticated;

-- ====================================================================
-- 7. ATTRIBUTION DU RÔLE SUPER-ADMINISTRATEUR À DIONGPACO@GMAIL.COM
-- ====================================================================

-- 7.1 Mise à jour directe si le profil existe déjà
UPDATE profiles
SET role = 'admin'
WHERE lower(email) = 'diongpaco@gmail.com';

-- 7.2 Insertion / mise à jour à partir de auth.users si le compte existe dans l'authentification
INSERT INTO profiles (id, email, role, created_at)
SELECT id, email, 'admin', now()
FROM auth.users
WHERE lower(email) = 'diongpaco@gmail.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin';

-- 7.3 Trigger automatique garantissant que diongpaco@gmail.com reçoit le rôle 'admin' à la création ou mise à jour
CREATE OR REPLACE FUNCTION set_master_admin_on_profile_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'diongpaco@gmail.com' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_master_admin_role ON profiles;
CREATE TRIGGER trg_set_master_admin_role
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_master_admin_on_profile_insert();