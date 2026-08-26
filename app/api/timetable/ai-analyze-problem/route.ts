import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subjects, teachers, classes, timetable, unscheduled, problem } = body;

    if (!problem) {
      return NextResponse.json(
        { error: 'Veuillez renseigner un problème à analyser.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données scolaires invalides (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    if (!hasApiKey) {
      // Elegant local fallback analysis
      let localizedAnalysis = `### 💡 Analyse Locale de l'Assistant Directeur\n\n`;
      localizedAnalysis += `Nous avons inspecté votre contrainte : **"${problem}"**.\n\n`;
      localizedAnalysis += `#### 🔍 Diagnostic du problème :\n`;
      
      const matchedTeachers = teachers.filter((t: any) => 
        problem.toLowerCase().includes(t.name.toLowerCase()) || 
        t.name.toLowerCase().split(' ').some((part: string) => part.length > 2 && problem.toLowerCase().includes(part))
      );

      const matchedClasses = classes.filter((c: any) => 
        problem.toLowerCase().includes(c.name.toLowerCase())
      );

      const matchedDays = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"].filter((day) =>
        problem.toLowerCase().includes(day)
      );

      if (matchedTeachers.length > 0) {
        localizedAnalysis += `- **Enseignants ciblés :** *${matchedTeachers.map((t: any) => t.name).join(', ')}*\n`;
      }
      if (matchedClasses.length > 0) {
        localizedAnalysis += `- **Classes ciblées :** *${matchedClasses.map((c: any) => c.name).join(', ')}*\n`;
      }
      if (matchedDays.length > 0) {
        localizedAnalysis += `- **Périodes temporelles mentionnées :** *${matchedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}*\n`;
      }

      localizedAnalysis += `\n#### 📈 Plan de résolution proposé :\n`;
      
      if (matchedTeachers.length > 0 && matchedDays.length > 0) {
        const tNames = matchedTeachers.map((t: any) => t.name).join(', ');
        const jName = matchedDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
        localizedAnalysis += `1. **Exclusion Temporelle :** Nous allons forcer l'indisponibilité de ${tNames} le(s) ${jName}.\n`;
        localizedAnalysis += `2. **Relocalisation des heures :** Le planificateur de Diongue-IziSchool va déplacer automatiquement tous les cours de cet enseignant de cette journée vers d'autres créneaux libres de la semaine.\n`;
        localizedAnalysis += `3. **Préservation des quotas :** Aucun cours ne sera annulé de manière définitive, le quota hebdomadaire reste actif.\n`;
      } else {
        localizedAnalysis += `1. **Re-calcul ciblé :** Ajustement des priorités de placement pour libérer les créneaux mentionnés dans votre requête.\n`;
        localizedAnalysis += `2. **Re-calcul des conflits :** Résolution des conflits d'enseignants s'il y a lieu.\n`;
      }

      localizedAnalysis += `\n*Note : Cliquez sur **"Faire appliquer la solution par l'Agent"** pour exécuter immédiatement cette relocalisation intelligente. Renseignez votre clé d'API Gemini dans les paramètres Secrets pour avoir un diagnostic sémantique avancé par IA.*`;

      return NextResponse.json({ text: localizedAnalysis });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const prompt = `
En tant qu'expert conseiller pédagogique et architecte d'emplois du temps pour le SaaS scolaire de pointe "Diongue-IziSchool", analyse le problème de planification décrit par l'administrateur scolaire ci-dessous et propose une solution concrète d'adaptation.

PROBLÈME FORMULÉ PAR L'ADMINISTRATEUR : 
"${problem}"

DONNÉES DU PLANNING EN ENTRÉE :
- Matières existantes : ${JSON.stringify(subjects)}
- Enseignants : ${JSON.stringify(teachers.map((t: any) => ({ name: t.name, id: t.id, quota: t.weeklyQuota, unavailabilities: t.unavailability })))}
- Classes : ${JSON.stringify(classes.map((c: any) => ({ name: c.name, id: c.id, assignments: c.assignments, unavailabilities: c.unavailability })))}
- Emplacement actuel des cours : ${JSON.stringify(timetable.slice(0, 45))} (Total de ${timetable.length} séances planifiées)
- Éléments non planifiés (conflits) : ${JSON.stringify(unscheduled)}

Règles de style :
1. Rédige ta réponse en français sous forme de liste Markdown élégante, professionnelle, claire et structurée.
2. Explique si la demande est réalisable ou s'il y a des risques de conflit (ex: manque d'heures ou plages trop serrées).
3. Donne un plan d'action d'ajustements étape par étape (ex: déplacer le cours de Mathématiques de la classe Terminale A du lundi matin au jeudi après-midi).
4. Explique à l'administrateur qu'il peut faire appliquer automatiquement ce réajustement par l'Agent en cliquant sur le bouton d'action affiché sous ce bloc.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const text = response.text || "Aucune analyse n'a pu être formulée par le modèle Gemini.";

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error('Error analyzing problem with Gemini:', error);
    return NextResponse.json(
      { error: `Erreur interne d'analyse par l'IA : ${error?.message || error}` },
      { status: 500 }
    );
  }
}
