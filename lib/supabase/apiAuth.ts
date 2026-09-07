import { createClient } from '@/utils/supabase/server';
import { SaaSPlan } from '@/lib/saasTypes';

export interface VerifiedUserContext {
  user: {
    id: string;
    email?: string;
  };
  role: 'admin' | 'user';
  planId: string;
  isSubscriptionActive: boolean;
  plan: SaaSPlan;
}

export async function verifyUserPlanAccess(): Promise<
  { success: true; context: VerifiedUserContext } | { success: false; status: number; error: string }
> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      status: 401,
      error: 'Authentification requise pour effectuer cette opération.'
    };
  }

  // 1. Fetch user profile (role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isMasterAdmin = user.email?.toLowerCase() === 'diongpaco@gmail.com';
  const role = (isMasterAdmin || profile?.role === 'admin') ? 'admin' : 'user';

  // If superadmin, grant unlimited access (plan fetched from DB)
  if (role === 'admin') {
    const { data: adminPlanDb } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', 'plan_school')
      .maybeSingle();

    const adminPlan: SaaSPlan = adminPlanDb ? {
      id: adminPlanDb.id,
      name: adminPlanDb.name,
      code: adminPlanDb.code,
      monthlyPriceFCFA: adminPlanDb.monthly_price_fcfa,
      monthlyPriceEUR: adminPlanDb.monthly_price_eur,
      maxClasses: adminPlanDb.max_classes ?? 999,
      maxTeachers: adminPlanDb.max_teachers ?? 999,
      maxGenerations: adminPlanDb.max_generations ?? 9999,
      maxExports: adminPlanDb.max_exports ?? 9999,
      features: adminPlanDb.features ?? {
        pdfExport: true, excelExport: true, wordExport: true,
        geminiAI: true, prioritySupport: true, multiUser: true,
        customBranding: true, pedagogicalPlanning: true
      },
      description: adminPlanDb.description ?? 'Plan School illimité'
    } : {
      // Fallback de sécurité minimal (structure, jamais de données demo)
      id: 'plan_school', name: 'School', code: 'SCHOOL',
      monthlyPriceFCFA: 30000, monthlyPriceEUR: 46,
      maxClasses: 999, maxTeachers: 999, maxGenerations: 9999, maxExports: 9999,
      features: {
        pdfExport: true, excelExport: true, wordExport: true,
        geminiAI: true, prioritySupport: true, multiUser: true,
        customBranding: true, pedagogicalPlanning: true
      },
      description: 'Plan administrateur illimité'
    };

    return {
      success: true,
      context: {
        user: { id: user.id, email: user.email },
        role: 'admin',
        planId: 'plan_school',
        isSubscriptionActive: true,
        plan: adminPlan
      }
    };
  }

  // 2. Fetch establishment settings (plan_id, status)
  const { data: settings } = await supabase
    .from('establishment_settings')
    .select('plan_id, status')
    .eq('user_id', user.id)
    .maybeSingle();

  const planId = settings?.plan_id || 'plan_trial';
  const status = settings?.status || 'active';
  const isSubscriptionActive = status === 'active' || status === 'pending_key';

  // 3. Resolve plan features from DB or default initial plans
  let plan: SaaSPlan | undefined;
  try {
    const { data: dbPlan } = await supabase
      .from('saas_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (dbPlan) {
      plan = {
        id: dbPlan.id,
        name: dbPlan.name,
        code: dbPlan.code,
        monthlyPriceFCFA: dbPlan.monthly_price_fcfa,
        monthlyPriceEUR: dbPlan.monthly_price_eur,
        annualPriceFCFA: dbPlan.annual_price_fcfa,
        annualPriceEUR: dbPlan.annual_price_eur,
        maxClasses: dbPlan.max_classes,
        maxTeachers: dbPlan.max_teachers,
        maxGenerations: dbPlan.max_generations,
        maxExports: dbPlan.max_exports,
        features: dbPlan.features,
        popular: dbPlan.popular,
        description: dbPlan.description
      };
    }
  } catch (e) {
    console.warn('Fallback to local plans dictionary:', e);
  }

  if (!plan) {
    // Aucun plan trouvé en DB : fallback structurel sur plan_trial (pas de données demo)
    plan = {
      id: 'plan_trial',
      name: 'Gratuit',
      code: 'TRIAL',
      monthlyPriceFCFA: 0,
      monthlyPriceEUR: 0,
      maxClasses: 2,
      maxTeachers: 2,
      maxGenerations: 4,
      maxExports: 4,
      features: {
        pdfExport: true,
        excelExport: false,
        wordExport: false,
        geminiAI: false,
        prioritySupport: false,
        multiUser: false,
        customBranding: true,
        pedagogicalPlanning: false
      },
      description: 'Formule gratuite de découverte'
    };
  }

  return {
    success: true,
    context: {
      user: { id: user.id, email: user.email },
      role,
      planId,
      isSubscriptionActive,
      plan
    }
  };
}
