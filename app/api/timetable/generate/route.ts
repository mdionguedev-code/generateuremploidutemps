import { NextRequest, NextResponse } from 'next/server';
import { generateTimetable } from '@/lib/solver';
import { verifyUserPlanAccess } from '@/lib/supabase/apiAuth';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserPlanAccess();
    if (!authRes.success) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { plan, isSubscriptionActive, user, role } = authRes.context;
    const supabase = await createClient();

    if (!isSubscriptionActive) {
      return NextResponse.json(
        { error: 'Votre abonnement est expiré ou inactif. Veuillez renouveler votre formule.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { subjects, teachers, classes, activeDays, totalSlots, title = 'Emploi du temps généré' } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données invalides ou manquantes (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    if (classes.length > plan.maxClasses) {
      return NextResponse.json(
        { error: `Votre formule actuelle (${plan.name}) est limitée à ${plan.maxClasses} classes maximum (reçu: ${classes.length}). Veuillez passer à la formule supérieure.` },
        { status: 403 }
      );
    }

    if (teachers.length > plan.maxTeachers) {
      return NextResponse.json(
        { error: `Votre formule actuelle (${plan.name}) est limitée à ${plan.maxTeachers} enseignants maximum (reçu: ${teachers.length}). Veuillez passer à la formule supérieure.` },
        { status: 403 }
      );
    }

    if (subjects.length > 200 || teachers.length > 300 || classes.length > 150) {
      return NextResponse.json(
        { error: 'Le nombre d\'éléments dépasse le quota maximum absolu autorisé.' },
        { status: 400 }
      );
    }

    // --- VÉRIFICATION QUOTA DE GÉNÉRATION CÔTÉ BASE DE DONNÉES ---
    // Seuls les admins sont exempts (vérification directe via RLS/SECURITY DEFINER)
    let quotaUsage: { current: number; max: number } | null = null;
    if (role !== 'admin') {
      const { data: quotaCheck, error: quotaError } = await supabase.rpc(
        'check_and_increment_generation_quota',
        { p_user_id: user.id }
      );

      if (quotaError) {
        console.error('Quota RPC error:', quotaError);
        return NextResponse.json(
          { error: 'Erreur de vérification du quota de génération. Veuillez réessayer.' },
          { status: 500 }
        );
      }

      if (!quotaCheck?.allowed) {
        return NextResponse.json(
          {
            error: quotaCheck?.message ||
              `Quota de génération atteint (${quotaCheck?.current}/${quotaCheck?.max}). Passez à un plan supérieur pour continuer.`
          },
          { status: 403 }
        );
      }

      quotaUsage = { current: quotaCheck.current, max: quotaCheck.max };
    }

    const sanitizedClasses = (classes || []).map((c: any) => ({
      ...c,
      id: String(c.id || '').trim(),
      name: String(c.name || '').slice(0, 100),
      assignments: (c.assignments || []).map((a: any) => ({
        ...a,
        hoursPerWeek: Math.max(0, Math.min(60, Number(a.hoursPerWeek || 0))),
        fixedDay: a.fixedDay ? String(a.fixedDay).trim() : undefined,
        fixedStartSlot: a.fixedStartSlot !== undefined && a.fixedStartSlot !== null && String(a.fixedStartSlot).trim() !== '' ? Number(a.fixedStartSlot) : undefined,
      }))
    }));

    const result = generateTimetable(subjects, teachers, sanitizedClasses, activeDays, totalSlots);

    const sanitizedTitle = String(title).slice(0, 150);

    const { error: dbError } = await supabase.from('timetables').insert({
      user_id: user.id,
      title: sanitizedTitle,
      data: {
        inputs: { subjects, teachers, classes: sanitizedClasses, activeDays, totalSlots },
        result: result
      }
    });

    if (dbError) {
      console.error('Error saving to DB:', dbError);
    }

    return NextResponse.json({ ...result, quotaUsage });
  } catch (error: any) {
    console.error('Error generating timetable:', error);
    return NextResponse.json(
      { error: `Erreur interne de génération: ${error?.message || error}` },
      { status: 500 }
    );
  }
}

