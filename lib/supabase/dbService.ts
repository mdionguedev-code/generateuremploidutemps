import { createClient } from '@/utils/supabase/client';
import { Subject, Teacher, ClassGroup, TimetableEntry } from '@/lib/types';
import {
  SaaSPlan,
  SaaSClient,
  SaaSLicenseKey,
  SaaSPaymentTransaction,
  SaaSGlobalSettings,
  SaaSActivationRequest
} from '@/lib/saasTypes';

export interface EstablishmentSettingsData {
  schoolName: string;
  schoolSlogan: string;
  schoolLogo: string;
  schoolLogoType: 'icon' | 'url';
  schoolLogoIcon: string;
  activeDays: string[];
  startHour: number;
  endHour: number;
  planId: string;
  status: string;
}

// -------------------------------------------------------------
// CLIENT / ESTABLISHMENT CRUD SERVICES
// -------------------------------------------------------------

export async function getEstablishmentData(userId: string) {
  const supabase = createClient();

  // 1. Fetch settings
  let { data: settings } = await supabase
    .from('establishment_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!settings) {
    // Create initial settings for this user if first time
    const { data: newSettings } = await supabase
      .from('establishment_settings')
      .insert({
        user_id: userId,
        school_name: 'Mon Établissement',
        school_slogan: 'Année Scolaire 2026-2027',
        school_logo_icon: 'GraduationCap',
        active_days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
        start_hour: 8,
        end_hour: 18,
        plan_id: 'plan_trial',
        status: 'active'
      })
      .select()
      .single();
    settings = newSettings;
  }

  // 2. Fetch subjects
  const { data: dbSubjects } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  // 3. Fetch teachers
  const { data: dbTeachers } = await supabase
    .from('teachers')
    .select('id, name, subject_ids, weekly_quota, color, unavailability')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  // 4. Fetch classes
  const { data: dbClasses } = await supabase
    .from('classes')
    .select('id, name, assignments, unavailability')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  // 5. Fetch latest timetable
  const { data: dbTimetables } = await supabase
    .from('timetables')
    .select('id, title, data, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const subjects: Subject[] = (dbSubjects || []).map(s => ({
    id: s.id,
    name: s.name
  }));

  const teachers: Teacher[] = (dbTeachers || []).map(t => ({
    id: t.id,
    name: t.name,
    subjectIds: Array.isArray(t.subject_ids) ? t.subject_ids : [],
    weeklyQuota: t.weekly_quota || 18,
    color: t.color || '#4f46e5',
    unavailability: Array.isArray(t.unavailability) ? t.unavailability : []
  }));

  const classes: ClassGroup[] = (dbClasses || []).map(c => ({
    id: c.id,
    name: c.name,
    assignments: Array.isArray(c.assignments) ? c.assignments : [],
    unavailability: Array.isArray(c.unavailability) ? c.unavailability : []
  }));

  let savedTimetable: TimetableEntry[] = [];
  let savedUnscheduled: any[] = [];
  let savedScore: number = 0;

  if (dbTimetables && dbTimetables.length > 0) {
    const tableData = dbTimetables[0].data;
    if (tableData?.result?.timetable) {
      savedTimetable = tableData.result.timetable;
      savedUnscheduled = tableData.result.unscheduled || [];
      savedScore = tableData.result.score || 0;
    }
  }

  const establishmentSettings: EstablishmentSettingsData = {
    schoolName: settings?.school_name || 'Mon Établissement',
    schoolSlogan: settings?.school_slogan || 'Année Scolaire 2026-2027',
    schoolLogo: settings?.school_logo || '',
    schoolLogoType: (settings?.school_logo_type as any) || 'icon',
    schoolLogoIcon: settings?.school_logo_icon || 'GraduationCap',
    activeDays: Array.isArray(settings?.active_days)
      ? settings.active_days
      : ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    startHour: settings?.start_hour || 8,
    endHour: settings?.end_hour || 18,
    planId: settings?.plan_id || 'plan_trial',
    status: settings?.status || 'active'
  };

  return {
    settings: establishmentSettings,
    subjects,
    teachers,
    classes,
    savedTimetable,
    savedUnscheduled,
    savedScore
  };
}

export async function saveEstablishmentSettings(userId: string, data: Partial<EstablishmentSettingsData>) {
  const supabase = createClient();
  const updatePayload: any = { updated_at: new Date().toISOString() };

  if (data.schoolName !== undefined) updatePayload.school_name = data.schoolName;
  if (data.schoolSlogan !== undefined) updatePayload.school_slogan = data.schoolSlogan;
  if (data.schoolLogo !== undefined) updatePayload.school_logo = data.schoolLogo;
  if (data.schoolLogoType !== undefined) updatePayload.school_logo_type = data.schoolLogoType;
  if (data.schoolLogoIcon !== undefined) updatePayload.school_logo_icon = data.schoolLogoIcon;
  if (data.activeDays !== undefined) updatePayload.active_days = data.activeDays;
  if (data.startHour !== undefined) updatePayload.start_hour = data.startHour;
  if (data.endHour !== undefined) updatePayload.end_hour = data.endHour;
  if (data.planId !== undefined) updatePayload.plan_id = data.planId;
  if (data.status !== undefined) updatePayload.status = data.status;

  const { error } = await supabase
    .from('establishment_settings')
    .upsert({ user_id: userId, ...updatePayload }, { onConflict: 'user_id' });

  if (error) console.error('Error saving establishment settings:', error);
}

export async function dbAddSubject(userId: string, name: string): Promise<Subject | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, name })
    .select('id, name')
    .single();

  if (error || !data) {
    console.error('Error adding subject:', error);
    return null;
  }
  return { id: data.id, name: data.name };
}

export async function dbDeleteSubject(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  return !error;
}

export async function dbAddTeacher(userId: string, teacher: Omit<Teacher, 'id'>): Promise<Teacher | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      user_id: userId,
      name: teacher.name,
      subject_ids: teacher.subjectIds,
      weekly_quota: teacher.weeklyQuota,
      color: teacher.color,
      unavailability: teacher.unavailability
    })
    .select('id, name, subject_ids, weekly_quota, color, unavailability')
    .single();

  if (error || !data) {
    console.error('Error adding teacher:', error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    subjectIds: data.subject_ids || [],
    weeklyQuota: data.weekly_quota || 18,
    color: data.color || '#4f46e5',
    unavailability: data.unavailability || []
  };
}

export async function dbUpdateTeacher(id: string, teacher: Partial<Teacher>): Promise<boolean> {
  const supabase = createClient();
  const payload: any = {};
  if (teacher.name !== undefined) payload.name = teacher.name;
  if (teacher.subjectIds !== undefined) payload.subject_ids = teacher.subjectIds;
  if (teacher.weeklyQuota !== undefined) payload.weekly_quota = teacher.weeklyQuota;
  if (teacher.color !== undefined) payload.color = teacher.color;
  if (teacher.unavailability !== undefined) payload.unavailability = teacher.unavailability;

  const { error } = await supabase.from('teachers').update(payload).eq('id', id);
  return !error;
}

export async function dbDeleteTeacher(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('teachers').delete().eq('id', id);
  return !error;
}

export async function dbAddClass(userId: string, classGroup: Omit<ClassGroup, 'id'>): Promise<ClassGroup | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('classes')
    .insert({
      user_id: userId,
      name: classGroup.name,
      assignments: classGroup.assignments,
      unavailability: classGroup.unavailability
    })
    .select('id, name, assignments, unavailability')
    .single();

  if (error || !data) {
    console.error('Error adding class:', error);
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    assignments: data.assignments || [],
    unavailability: data.unavailability || []
  };
}

export async function dbUpdateClass(id: string, classGroup: Partial<ClassGroup>): Promise<boolean> {
  const supabase = createClient();
  const payload: any = {};
  if (classGroup.name !== undefined) payload.name = classGroup.name;
  if (classGroup.assignments !== undefined) payload.assignments = classGroup.assignments;
  if (classGroup.unavailability !== undefined) payload.unavailability = classGroup.unavailability;

  const { error } = await supabase.from('classes').update(payload).eq('id', id);
  return !error;
}

export async function dbDeleteClass(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('classes').delete().eq('id', id);
  return !error;
}

export async function dbSaveTimetable(
  userId: string,
  title: string,
  timetable: TimetableEntry[],
  unscheduled: any[],
  score: number,
  inputs: any
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('timetables').insert({
    user_id: userId,
    title,
    data: {
      inputs,
      result: {
        timetable,
        unscheduled,
        score
      }
    }
  });
  return !error;
}

// -------------------------------------------------------------
// SAAS ADMIN PORTAL SERVICES (LIVE DATABASE)
// -------------------------------------------------------------

export async function getSaaSAdminLivePlatformData() {
  const supabase = createClient();

  // 1. Fetch SaaS Plans
  const { data: plansData } = await supabase
    .from('saas_plans')
    .select('*')
    .order('monthly_price_fcfa', { ascending: true });

  const plans: SaaSPlan[] = (plansData || []).map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    monthlyPriceFCFA: p.monthly_price_fcfa,
    monthlyPriceEUR: p.monthly_price_eur,
    annualPriceFCFA: p.annual_price_fcfa,
    annualPriceEUR: p.annual_price_eur,
    maxClasses: p.max_classes,
    maxTeachers: p.max_teachers,
    maxGenerations: p.max_generations,
    maxExports: p.max_exports,
    features: p.features || {
      pdfExport: true,
      excelExport: false,
      wordExport: false,
      geminiAI: false,
      prioritySupport: false,
      multiUser: false,
      customBranding: false
    },
    popular: p.popular,
    description: p.description,
    badgeText: p.badge_text,
    wavePaymentUrl: p.wave_payment_url
  }));

  // 2. Fetch Profiles + Establishment settings to build real Client list
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, email, role, created_at');

  const { data: settingsData } = await supabase
    .from('establishment_settings')
    .select('*');

  const { data: classesData } = await supabase
    .from('classes')
    .select('user_id');

  const { data: teachersData } = await supabase
    .from('teachers')
    .select('user_id');

  const clients: SaaSClient[] = (profilesData || []).map(profile => {
    const userSettings = (settingsData || []).find(s => s.user_id === profile.id);
    const userClasses = (classesData || []).filter(c => c.user_id === profile.id).length;
    const userTeachers = (teachersData || []).filter(t => t.user_id === profile.id).length;

    return {
      id: profile.id,
      schoolName: userSettings?.school_name || `École de ${profile.email.split('@')[0]}`,
      logoIcon: userSettings?.school_logo_icon || 'GraduationCap',
      adminName: profile.email.split('@')[0],
      adminEmail: profile.email,
      phone: '+221 -- --- -- --',
      cityCountry: 'Dakar, Sénégal',
      planId: userSettings?.plan_id || 'plan_trial',
      status: (userSettings?.status as any) || 'active',
      startDate: profile.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      trialEndDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subscriptionEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paymentMethod: 'Gratuit',
      totalPaidFCFA: 0,
      createdAt: profile.created_at || new Date().toISOString(),
      lastActiveAt: profile.created_at || new Date().toISOString(),
      classesCount: userClasses,
      teachersCount: userTeachers,
      notes: profile.role === 'admin' ? 'Compte Super-Administrateur Plateforme' : 'Utilisateur Établissement'
    };
  });

  // 3. Fetch License Keys
  const { data: keysData } = await supabase
    .from('saas_license_keys')
    .select('*')
    .order('generated_at', { ascending: false });

  const licenseKeys: SaaSLicenseKey[] = (keysData || []).map(k => ({
    id: k.id,
    key: k.key,
    planId: k.plan_id,
    durationDays: k.duration_days,
    generatedAt: k.generated_at,
    status: k.status,
    usedByClientId: k.used_by_user_id,
    usedByClientName: k.used_by_school_name,
    usedAt: k.used_at
  }));

  // 4. Fetch Activation Requests
  const { data: requestsData } = await supabase
    .from('saas_activation_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  const activationRequests: SaaSActivationRequest[] = (requestsData || []).map(r => ({
    id: r.id,
    type: r.type,
    schoolName: r.school_name,
    adminName: r.admin_name,
    adminEmail: r.admin_email,
    whatsapp: r.whatsapp,
    cityCountry: r.city_country,
    planId: r.plan_id,
    clientId: r.user_id,
    amountFCFA: r.amount_fcfa,
    durationMonths: r.duration_months,
    paymentMethod: r.payment_method,
    status: r.status,
    requestedAt: r.requested_at,
    deliveredAt: r.delivered_at,
    assignedKey: r.assigned_key,
    notes: r.notes
  }));

  // 5. Fetch Global Settings
  const { data: settingsRow } = await supabase
    .from('saas_settings')
    .select('settings')
    .eq('id', 1)
    .single();

  const settings: SaaSGlobalSettings = settingsRow?.settings || {
    maintenanceMode: false,
    globalAnnouncement: '',
    announcementType: 'none',
    defaultTrialDays: 14,
    allowNewRegistrations: true,
    supportedPaymentGateways: {
      wave: true,
      orangeMoney: true,
      stripe: true,
      bankTransfer: true,
      licenseKey: true
    },
    contactEmail: 'contact@izischool.com',
    supportPhone: '+221 77 000 00 00'
  };

  return {
    plans,
    clients,
    licenseKeys,
    activationRequests,
    settings
  };
}

export async function dbAdminGenerateLicenseKeys(
  planId: string,
  durationDays: number,
  keys: string[]
): Promise<{ success: boolean; message: string; count?: number }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_generate_license_keys', {
    p_plan_id: planId,
    p_duration_days: durationDays,
    p_keys: keys
  });

  if (error) {
    console.error('Error generating license keys in db:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de l'enregistrement des clés de licence."
    };
  }

  return {
    success: data?.success ?? false,
    message: data?.message || "Clés enregistrées avec succès.",
    count: data?.count
  };
}

export async function dbCreateLicenseKey(planId: string, durationDays: number): Promise<SaaSLicenseKey | null> {
  const supabase = createClient();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const key = `SCH-${planId.replace('plan_', '').toUpperCase()}-2026-${randomStr}`;

  const res = await dbAdminGenerateLicenseKeys(planId, durationDays, [key]);
  if (!res.success) return null;

  return {
    id: `key_${Date.now()}`,
    key,
    planId: planId,
    durationDays: durationDays,
    generatedAt: new Date().toISOString(),
    status: 'unused'
  };
}

export async function dbUpdateGlobalSettings(settings: SaaSGlobalSettings): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('saas_settings')
    .upsert({ id: 1, settings, updated_at: new Date().toISOString() });
  return !error;
}

export async function dbRedeemLicenseKey(
  userId: string,
  keyStr: string
): Promise<{ success: boolean; message: string; planId?: string; planName?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('redeem_license_key', {
    p_key: keyStr,
    p_user_id: userId
  });

  if (error) {
    console.error('Error redeeming license key:', error);
    return {
      success: false,
      message: "Erreur lors de l'activation de la clé sur le serveur."
    };
  }

  return {
    success: data?.success ?? false,
    message: data?.message || "Résultat d'activation inconnu.",
    planId: data?.plan_id,
    planName: data?.plan_name
  };
}

export async function dbAdminCreateClientUser(params: {
  email: string;
  password: string;
  schoolName: string;
  adminName: string;
  phone?: string;
  cityCountry?: string;
  planId?: string;
  status?: string;
  durationMonths?: number;
  paymentMethod?: string;
  amountFCFA?: number;
  notes?: string;
}): Promise<{ success: boolean; message: string; userId?: string; client?: SaaSClient }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_create_client_user', {
    p_email: params.email,
    p_password: params.password,
    p_school_name: params.schoolName,
    p_admin_name: params.adminName,
    p_phone: params.phone || '',
    p_city_country: params.cityCountry || 'Dakar, Sénégal',
    p_plan_id: params.planId || 'plan_standard',
    p_status: params.status || 'active',
    p_duration_months: params.durationMonths || 1,
    p_payment_method: params.paymentMethod || 'Orange Money',
    p_amount_fcfa: params.amountFCFA || 0,
    p_notes: params.notes || ''
  });

  if (error) {
    console.error('Error in dbAdminCreateClientUser:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de la création du compte en base de données."
    };
  }

  if (!data?.success) {
    return {
      success: false,
      message: data?.message || "Échec de création du compte."
    };
  }

  const nowStr = new Date().toISOString().split('T')[0];
  const subEnd = new Date();
  subEnd.setMonth(subEnd.getMonth() + (params.durationMonths || 1));

  const client: SaaSClient = {
    id: data.user_id,
    schoolName: params.schoolName,
    logoIcon: 'GraduationCap',
    adminName: params.adminName,
    adminEmail: params.email,
    phone: params.phone || '',
    whatsapp: params.phone || '',
    cityCountry: params.cityCountry || 'Dakar, Sénégal',
    planId: params.planId || 'plan_standard',
    status: (params.status || 'active') as any,
    startDate: nowStr,
    trialEndDate: nowStr,
    subscriptionEndDate: subEnd.toISOString().split('T')[0],
    paymentMethod: (params.paymentMethod || 'Orange Money') as any,
    totalPaidFCFA: params.amountFCFA || 0,
    createdAt: nowStr,
    lastActiveAt: 'À l\'instant',
    classesCount: 0,
    teachersCount: 0,
    notes: params.notes
  };

  return {
    success: true,
    message: data.message,
    userId: data.user_id,
    client
  };
}

export async function dbAdminResetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_reset_user_password', {
    p_user_id: userId,
    p_new_password: newPassword
  });

  if (error) {
    console.error('Error in dbAdminResetUserPassword:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de la réinitialisation du mot de passe."
    };
  }

  return {
    success: data?.success ?? false,
    message: data?.message || "Opération terminée."
  };
}

export async function dbUserUpdatePassword(
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  if (!newPassword || newPassword.trim().length < 6) {
    return {
      success: false,
      message: "Le nouveau mot de passe doit comporter au moins 6 caractères."
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword.trim()
  });

  if (error) {
    console.error('Error updating user password:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de la mise à jour du mot de passe."
    };
  }

  return {
    success: true,
    message: "Votre mot de passe a été mis à jour avec succès !"
  };
}

export async function dbSubmitActivationRequest(params: {
  type: string;
  schoolName: string;
  adminName?: string;
  adminEmail: string;
  whatsapp: string;
  planId: string;
  amountFCFA: number;
  durationMonths?: number;
  paymentMethod?: string;
  userId?: string;
  cityCountry?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; requestId?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('submit_activation_request', {
    p_type: params.type,
    p_school_name: params.schoolName,
    p_admin_name: params.adminName || 'Directeur',
    p_admin_email: params.adminEmail,
    p_whatsapp: params.whatsapp,
    p_plan_id: params.planId,
    p_amount_fcfa: params.amountFCFA,
    p_duration_months: params.durationMonths || 1,
    p_payment_method: params.paymentMethod || 'Wave',
    p_user_id: params.userId || null,
    p_city_country: params.cityCountry || 'Sénégal',
    p_notes: params.notes || null
  });

  if (error) {
    console.error('Error in dbSubmitActivationRequest:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de la transmission de la demande d'activation."
    };
  }

  return {
    success: data?.success ?? true,
    message: data?.message || "Demande transmise avec succès !",
    requestId: data?.request_id
  };
}

export async function dbAdminDeliverActivationRequest(
  requestId: string,
  assignedKey?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_deliver_activation_request', {
    p_request_id: requestId,
    p_assigned_key: assignedKey || null
  });

  if (error) {
    console.error('Error in dbAdminDeliverActivationRequest:', error);
    return {
      success: false,
      message: error.message || "Erreur lors de la livraison de la clé."
    };
  }

  return {
    success: data?.success ?? true,
    message: data?.message || "Demande validée !"
  };
}






