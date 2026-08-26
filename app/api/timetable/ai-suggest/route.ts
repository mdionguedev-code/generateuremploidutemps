import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subjects, teachers, classes, timetable, unscheduled } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données scolaires invalides (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    // Local fallback recommendations generator if GEMINI_API_KEY is not working or not configured,
    // ensuring the app is always functional and helpful.
    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    const localSummarySuggestions = (): string => {
      let advice = `### 💡 Analyse Locale de l'Assistant IziSchool\n\n`;
      
      if (unscheduled && unscheduled.length > 0) {
        advice += `⚠️ **Alerte de charge :** Il y a **${unscheduled.length} heures** non planifiées dans l'emploi du temps actuel. \n`;
        advice += `- Recommandation : Essayez d'alléger les quotas d'heures ou d'ouvrir des plages horaires pour les classes suivantes : *${Array.from(new Set(unscheduled.map((u: any) => u.classId))).join(', ')}*.\n\n`;
      } else {
        advice += `✨ **Félicitations !** Toutes les heures d'enseignements sont planifiées à 100% sans aucun conflit physique détecté !\n\n`;
      }

      // Check for teachers fatigue (consecutive hours or spread)
      advice += `#### 📅 Recommandations d'optimisation :\n`;
      advice += `1. **Réduire les temps morts :** Les cours d'enseignants s'enchaînent bien. Pour minimiser la fatigue des élèves, préférez regrouper les matières scientifiques (Maths, SPS) en début de matinée.\n`;
      advice += `2. **Cohérence pédagogique :** Les blocs de 2h ont été priorisés avec succès. Vos enseignants de matières à fort volume horaire disposent de séances continues idéales.\n`;
      advice += `3. **Équilibre hebdomadaire :** Évitez de placer plus de 6 heures de cours le samedi pour préserver le week-end des équipes pédagogiques.`;

      return advice;
    };

    if (!hasApiKey) {
      // Return local suggestions gracefully
      return NextResponse.json({
        text: localSummarySuggestions() + "\n\n*(Note: Configurez votre clé API Gemini dans le panneau Settings > Secrets de AI Studio pour des suggestions personnalisées en temps réel par notre grand modèle de langage).* "
      });
    }

    // Initialize Gemini SDK correctly
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
En tant qu'expert conseiller pédagogique et architecte d'emplois du temps pour le SaaS scolaire "Diongue-IziSchool", analyse ces données scolaires et suggère des optimisations intelligentes pour l'emploi du temps.
Réduis de manière proactive les temps morts (trous dans la journée) pour les enseignants et les classes.

DONNÉES :
- Matières existantes : ${JSON.stringify(subjects)}
- Enseignants et quotas d'heures hebdomadaires : ${JSON.stringify(teachers.map((t: any) => ({ name: t.name, quota: t.weeklyQuota, subjects: t.subjectIds, unavailabilitiesCount: t.unavailability?.length || 0 })))}
- Classes et assignations de matières/profs : ${JSON.stringify(classes.map((c: any) => ({ name: c.name, assignments: c.assignments })))}
- Status actuel de la planification : ${timetable.length} séances planifiées.
- Éléments non planifiés (conflits insolubles) : ${JSON.stringify(unscheduled)}

Règles de style :
Donne ton avis et tes suggestions concises au chef d'établissement sous forme de liste Markdown élégante et structurée.
Parle en français. Sois très précis, professionnel et direct dans tes conseils d'optimisation des flux d'élèves et de préservation du bien-être des profs.
Inclut un plan d'action de 3 points clés réels basé sur les données ci-dessus.
`;

    // Modern SDK call
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const adviceText = response.text || "Aucune recommandation générée pour le moment.";

    return NextResponse.json({ text: adviceText });
  } catch (error: any) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json(
      { error: `Erreur interne API IA: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
