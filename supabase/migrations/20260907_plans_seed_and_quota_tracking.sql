-- ====================================================================
-- MIGRATION : SEED DES PLANS SAAS ET SUIVI DE QUOTA
-- SaaS IziSchool AI
-- Date: 2026-09-07
-- ====================================================================
-- IMPORTANT: Exécuter après 20260906_security_hardening.sql

-- 1. CRÉER LA TABLE saas_plans SI ELLE N'EXISTE PAS
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  monthly_price_fcfa INTEGER NOT NULL DEFAULT 0,
  monthly_price_eur INTEGER NOT NULL DEFAULT 0,
  annual_price_fcfa INTEGER,
  annual_price_eur INTEGER,
  max_classes INTEGER NOT NULL DEFAULT 2,
  max_teachers INTEGER NOT NULL DEFAULT 2,
  max_generations INTEGER NOT NULL DEFAULT 4,
  max_exports INTEGER NOT NULL DEFAULT 4,
  features JSONB NOT NULL DEFAULT '{}',
  popular BOOLEAN DEFAULT FALSE,
  description TEXT,
  badge_text TEXT,
  wave_payment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEED / UPSERT DES 4 PLANS OFFICIELS
INSERT INTO public.saas_plans (
  id, name, code, monthly_price_fcfa, monthly_price_eur,
  max_classes, max_teachers, max_generations, max_exports,
  features, popular, description, badge_text, wave_payment_url
) VALUES
  (
    'plan_trial', 'Gratuit', 'TRIAL', 0, 0, 2, 2, 4, 4,
    '{"pdfExport":true,"excelExport":false,"wordExport":false,"geminiAI":false,"prioritySupport":false,"multiUser":false,"customBranding":true,"pedagogicalPlanning":false}',
    FALSE,
    'Pour tester le générateur (2 classes, 2 profs, 4 générations & 4 exports PDF).',
    'Gratuit',
    'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_DECOUVERTE'
  ),
  (
    'plan_standard', 'Standard', 'STANDARD', 7500, 11, 8, 15, 30, 25,
    '{"pdfExport":true,"excelExport":false,"wordExport":false,"geminiAI":false,"prioritySupport":false,"multiUser":false,"customBranding":true,"pedagogicalPlanning":false}',
    FALSE,
    'Pour les petites structures (8 classes, 15 profs, 30 générations & 25 exports PDF).',
    'Standard',
    'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_STANDARD'
  ),
  (
    'plan_premium', 'Premium', 'PREMIUM', 10000, 15, 20, 25, 50, 50,
    '{"pdfExport":true,"excelExport":true,"wordExport":true,"geminiAI":true,"prioritySupport":true,"multiUser":false,"customBranding":true,"pedagogicalPlanning":true}',
    TRUE,
    'Pour collèges & lycées (20 classes, 25 profs, 50 générations & 50 exports Tout format).',
    'Recommandé',
    'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_PREMIUM'
  ),
  (
    'plan_school', 'School', 'SCHOOL', 25000, 38, 999, 999, 9999, 9999,
    '{"pdfExport":true,"excelExport":true,"wordExport":true,"geminiAI":true,"prioritySupport":true,"multiUser":true,"customBranding":true,"pedagogicalPlanning":true}',
    FALSE,
    'Générations & Exportations illimitées, IA prioritaire, Custom Branding, Multi-comptes.',
    'Illimité & VIP',
    'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_SCHOOL'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  monthly_price_fcfa = EXCLUDED.monthly_price_fcfa,
  monthly_price_eur = EXCLUDED.monthly_price_eur,
  max_classes = EXCLUDED.max_classes,
  max_teachers = EXCLUDED.max_teachers,
  max_generations = EXCLUDED.max_generations,
  max_exports = EXCLUDED.max_exports,
  features = EXCLUDED.features,
  popular = EXCLUDED.popular,
  description = EXCLUDED.description,
  badge_text = EXCLUDED.badge_text,
  wave_payment_url = EXCLUDED.wave_payment_url;

-- 3. TABLE DE SUIVI DES QUOTAS PAR UTILISATEUR (mensuel rolling)
CREATE TABLE IF NOT EXISTS public.user_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL,
  generation_count INTEGER NOT NULL DEFAULT 0,
  export_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_quota_period UNIQUE(user_id, period_month)
);

CREATE INDEX IF NOT EXISTS idx_user_quota_usage_lookup 
ON public.user_quota_usage (user_id, period_month);

-- 4. ACTIVER RLS SUR LA TABLE DE QUOTAS
ALTER TABLE public.user_quota_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quota_select_own_or_admin" ON public.user_quota_usage;
CREATE POLICY "quota_select_own_or_admin" ON public.user_quota_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "quota_modify_rpc_only" ON public.user_quota_usage;
CREATE POLICY "quota_modify_rpc_only" ON public.user_quota_usage
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. FONCTION RPC : VÉRIFIER ET INCRÉMENTER LE QUOTA DE GÉNÉRATION
DROP FUNCTION IF EXISTS public.check_and_increment_generation_quota(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.check_and_increment_generation_quota(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_current_count INTEGER := 0;
  v_max_gen INTEGER := 4;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  IF is_admin() THEN
    RETURN json_build_object('allowed', true, 'current', 0, 'max', 9999);
  END IF;

  SELECT COALESCE(plan_id, 'plan_trial') INTO v_plan_id
  FROM establishment_settings WHERE user_id = p_user_id;

  v_plan_id := COALESCE(v_plan_id, 'plan_trial');

  SELECT COALESCE(max_generations, 4) INTO v_max_gen
  FROM saas_plans WHERE id = v_plan_id;

  v_max_gen := COALESCE(v_max_gen, 4);

  INSERT INTO user_quota_usage (user_id, period_month, generation_count, export_count)
  VALUES (p_user_id, v_period, 0, 0)
  ON CONFLICT (user_id, period_month) DO NOTHING;

  SELECT generation_count INTO v_current_count
  FROM user_quota_usage
  WHERE user_id = p_user_id AND period_month = v_period;

  IF v_current_count >= v_max_gen THEN
    RETURN json_build_object(
      'allowed', false,
      'current', v_current_count,
      'max', v_max_gen,
      'message', format('Quota de génération atteint (%s/%s). Passez à un plan supérieur.', v_current_count, v_max_gen)
    );
  END IF;

  UPDATE user_quota_usage
  SET generation_count = generation_count + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND period_month = v_period;

  RETURN json_build_object('allowed', true, 'current', v_current_count + 1, 'max', v_max_gen);
END;
$$;

-- 6. FONCTION RPC : VÉRIFIER ET INCRÉMENTER LE QUOTA D'EXPORT
DROP FUNCTION IF EXISTS public.check_and_increment_export_quota(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.check_and_increment_export_quota(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_current_count INTEGER := 0;
  v_max_exp INTEGER := 4;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  IF is_admin() THEN
    RETURN json_build_object('allowed', true, 'current', 0, 'max', 9999);
  END IF;

  SELECT COALESCE(plan_id, 'plan_trial') INTO v_plan_id
  FROM establishment_settings WHERE user_id = p_user_id;

  v_plan_id := COALESCE(v_plan_id, 'plan_trial');

  SELECT COALESCE(max_exports, 4) INTO v_max_exp
  FROM saas_plans WHERE id = v_plan_id;

  v_max_exp := COALESCE(v_max_exp, 4);

  INSERT INTO user_quota_usage (user_id, period_month, generation_count, export_count)
  VALUES (p_user_id, v_period, 0, 0)
  ON CONFLICT (user_id, period_month) DO NOTHING;

  SELECT export_count INTO v_current_count
  FROM user_quota_usage
  WHERE user_id = p_user_id AND period_month = v_period;

  IF v_current_count >= v_max_exp THEN
    RETURN json_build_object(
      'allowed', false,
      'current', v_current_count,
      'max', v_max_exp,
      'message', format('Quota d''export atteint (%s/%s). Passez à un plan supérieur.', v_current_count, v_max_exp)
    );
  END IF;

  UPDATE user_quota_usage
  SET export_count = export_count + 1, updated_at = NOW()
  WHERE user_id = p_user_id AND period_month = v_period;

  RETURN json_build_object('allowed', true, 'current', v_current_count + 1, 'max', v_max_exp);
END;
$$;

-- 7. FONCTION RPC : LECTURE DES QUOTAS COURANTS
DROP FUNCTION IF EXISTS public.get_user_quota_usage(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_quota_usage(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_period TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_gen_count INTEGER := 0;
  v_exp_count INTEGER := 0;
  v_max_gen INTEGER := 4;
  v_max_exp INTEGER := 4;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT is_admin()) THEN
    RAISE EXCEPTION 'Accès refusé.';
  END IF;

  SELECT COALESCE(plan_id, 'plan_trial') INTO v_plan_id
  FROM establishment_settings WHERE user_id = p_user_id;

  v_plan_id := COALESCE(v_plan_id, 'plan_trial');

  SELECT COALESCE(max_generations, 4), COALESCE(max_exports, 4)
  INTO v_max_gen, v_max_exp
  FROM saas_plans WHERE id = v_plan_id;

  SELECT COALESCE(generation_count, 0), COALESCE(export_count, 0)
  INTO v_gen_count, v_exp_count
  FROM user_quota_usage
  WHERE user_id = p_user_id AND period_month = v_period;

  RETURN json_build_object(
    'generationCount', COALESCE(v_gen_count, 0),
    'exportCount',     COALESCE(v_exp_count, 0),
    'maxGenerations',  COALESCE(v_max_gen, 4),
    'maxExports',      COALESCE(v_max_exp, 4),
    'period',          v_period,
    'planId',          v_plan_id
  );
END;
$$;

-- 8. DROITS D'EXÉCUTION
REVOKE EXECUTE ON FUNCTION public.check_and_increment_generation_quota(UUID) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_export_quota(UUID) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_quota_usage(UUID) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.check_and_increment_generation_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_export_quota(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_quota_usage(UUID) TO authenticated;

-- 9. INITIALISATION DE LA TABLE saas_settings SI INEXISTANTE
CREATE TABLE IF NOT EXISTS public.saas_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.saas_settings (id, settings) VALUES (1, '{
  "maintenanceMode": false,
  "globalAnnouncement": "Bienvenue sur la plateforme SaaS EdTech Emploi du Temps ! Souscrivez et payez par Wave pour tous les niveaux dabonnements.",
  "announcementType": "info",
  "defaultTrialDays": 14,
  "allowNewRegistrations": true,
  "supportedPaymentGateways": {"wave": true, "orangeMoney": true, "stripe": true, "bankTransfer": true, "licenseKey": true},
  "contactEmail": "contact@izischool.com",
  "supportPhone": "+221 77 000 00 00"
}')
ON CONFLICT (id) DO NOTHING;