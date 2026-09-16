import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { verifyUserPlanAccess } from '@/lib/supabase/apiAuth';

export async function POST(req: NextRequest) {
  try {
    const authRes = await verifyUserPlanAccess();
    if (!authRes.success) {
      return NextResponse.json({ error: authRes.error }, { status: authRes.status });
    }

    const { plan, isSubscriptionActive } = authRes.context;
    if (!isSubscriptionActive || !plan.features?.geminiAI) {
      return NextResponse.json(
        { error: 'Les fonctionnalités d\'intelligence artificielle ne sont pas incluses dans votre formule d\'abonnement active.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { subjects, teachers, classes, timetable, unscheduled } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données scolaires invalides (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    // L'IA doit impérativement se baser sur un emploi du temps réel généré
    if (!Array.isArray(timetable) || timetable.length === 0 || classes.length === 0) {
      return NextResponse.json(
        { error: "Aucun emploi du temps n'a encore été généré. Veuillez d'abord configurer vos matières, enseignants et classes, puis générer votre emploi du temps à l'Étape 5 pour obtenir un diagnostic et des conseils réels." },
        { status: 400 }
      );
    }

    // Vérification de la clé API Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    const hasApiKey = apiKey && apiKey.trim() !== '' && apiKey !== 'MY_GEMINI_API_KEY';

    if (!hasApiKey) {
      return NextResponse.json({
        text: "Intelligence non disponible pour le moment, veillez réessayer ultérieurement."
      });
    }

    // Initialize Gemini SDK correctly
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
En tant qu'expert conseiller pédagogique et architecte d'emplois du temps pour le SaaS scolaire "IziSchool AI", analyse ces données scolaires réelles et suggère des optimisations intelligentes pour l'emploi du temps généré.
Base ton analyse EXCLUSIVEMENT sur les séances réelles déjà planifiées et les contraintes effectives. Ne formule aucune hypothèse sans données réelles.

DONNÉES RÉELLES DE L'EMPLOI DU TEMPS :
- Matières existantes : ${JSON.stringify(subjects.map((s: any) => s.name))}
- Enseignants et quotas réels : ${JSON.stringify(teachers.map((t: any) => ({ name: t.name, quota: t.weeklyQuota, unavailabilitiesCount: t.unavailability?.length || 0 })))}
- Classes et maquettes réelles : ${JSON.stringify(classes.map((c: any) => ({ name: c.name, targetHours: (c.assignments || []).reduce((sum: number, a: any) => sum + (a.hoursPerWeek || 0), 0) })))}
- Séances actuellement planifiées : ${timetable.length} cours effectifs.
- Séances non planifiées / conflits : ${JSON.stringify(unscheduled || [])}

Règles de style :
1. Donne ton avis et tes suggestions concises au chef d'établissement sous forme de liste Markdown élégante et structurée.
2. Parle en français. Sois très précis, professionnel et direct dans tes conseils d'optimisation des flux d'élèves et de préservation du bien-être des profs.
3. Inclut un plan d'action de 3 points clés réels basé strictement sur les données ci-dessus.
`;

    // Modern SDK call
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const adviceText = response.text || "Intelligence non disponible pour le moment, veillez réessayer ultérieurement.";

    return NextResponse.json({ text: adviceText });
  } catch (error: any) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json({
      text: "Intelligence non disponible pour le moment, veillez réessayer ultérieurement."
    });
  }
}
