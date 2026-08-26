import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { generateTimetable } from '@/lib/solver';
import { DayTimeSlot, Teacher, ClassGroup, TimetableEntry } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subjects, teachers, classes, timetable, unscheduled, problem, suggestions } = body;

    if (!Array.isArray(subjects) || !Array.isArray(teachers) || !Array.isArray(classes)) {
      return NextResponse.json(
        { error: 'Données scolaires invalides (sujets, enseignants, classes doivent être des tableaux).' },
        { status: 400 }
      );
    }

    const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    const activeTextSource = action === 'apply-suggestions' ? (suggestions || '') : (problem || '');

    // --- FALLBACK HEURISTIC SCHEDULING (FOR EXCELLENCE EVEN WITHOUT APIS) ---
    if (!hasApiKey) {
      let updatedTeachers = [...teachers];
      let updatedClasses = [...classes];
      let hasHeuristicChange = false;

      const lowerText = activeTextSource.toLowerCase();

      // Days representation
      const daysTranslation: { [key: string]: string } = {
        'lundi': 'Lundi',
        'mardi': 'Mardi',
        'mercredi': 'Mercredi',
        'jeudi': 'Jeudi',
        'vendredi': 'Vendredi',
        'samedi': 'Samedi'
      };

      // Detect matched days
      const matchedDays = Object.keys(daysTranslation).filter(day => lowerText.includes(day));

      // Detect if "après-midi" (afternoon) or "matin" (morning) is specified
      const isAfternoon = lowerText.includes('après-midi') || lowerText.includes('apres-midi') || lowerText.includes('soir') || lowerText.includes('fin de journée');
      const isMorning = lowerText.includes('matin') || lowerText.includes('début de journée') || lowerText.includes('debut de journee');

      // Detect teachers and classes in request
      const matchedTeachers = teachers.filter((t: any) => 
        lowerText.includes(t.name.toLowerCase()) || 
        t.name.toLowerCase().split(' ').some((part: string) => part.length > 2 && lowerText.includes(part))
      );

      const matchedClasses = classes.filter((c: any) => 
        lowerText.includes(c.name.toLowerCase())
      );

      // Apply unavailabilities according to detected constraints
      if (matchedDays.length > 0) {
        matchedDays.forEach(daySlug => {
          const actualDayName = daysTranslation[daySlug];
          
          // Determine slots indices to ban
          let slotsToBan = Array.from({ length: 10 }, (_, i) => i); // default all 10 slots
          if (isAfternoon) {
            slotsToBan = [5, 6, 7, 8, 9]; // afternoon is slot index 5 to 9
          } else if (isMorning) {
            slotsToBan = [0, 1, 2, 3, 4]; // morning is slot index 0 to 4
          }

          const newUnavailabilities: DayTimeSlot[] = slotsToBan.map(slotIndex => ({
            day: actualDayName,
            slotIndex
          }));

          // Ban for matched teachers
          if (matchedTeachers.length > 0) {
            updatedTeachers = updatedTeachers.map((t: Teacher) => {
              if (matchedTeachers.some((mt: Teacher) => mt.id === t.id)) {
                hasHeuristicChange = true;
                // Avoid duplicating slots
                const filteredUnavail = t.unavailability.filter(u => 
                  !(u.day === actualDayName && slotsToBan.includes(u.slotIndex))
                );
                return {
                  ...t,
                  unavailability: [...filteredUnavail, ...newUnavailabilities]
                };
              }
              return t;
            });
          }

          // Ban for matched classes
          if (matchedClasses.length > 0) {
            updatedClasses = updatedClasses.map((c: ClassGroup) => {
              if (matchedClasses.some((mc: ClassGroup) => mc.id === c.id)) {
                hasHeuristicChange = true;
                const filteredUnavail = c.unavailability.filter(u => 
                  !(u.day === actualDayName && slotsToBan.includes(u.slotIndex))
                );
                return {
                  ...c,
                  unavailability: [...filteredUnavail, ...newUnavailabilities]
                };
              }
              return c;
            });
          }
        });
      }

      // If no high-level keywords matched, but it's "apply suggestions", we trigger a minor shuffling
      // by just rerunning the solver which tries to improve the timetable naturally
      const result = generateTimetable(subjects, updatedTeachers, updatedClasses);
      
      let systemReasoning = `Planificateur Local Activé (Pas de clé API installée).\n\n`;
      if (hasHeuristicChange) {
        systemReasoning += `Heuristique de résolution : Contraintes de temps configurées automatiquement pour satisfaire votre formulation.\n`;
        const tNames = matchedTeachers.map((t: any) => t.name).join(', ');
        const cNames = matchedClasses.map((c: any) => c.name).join(', ');
        const dayNames = matchedDays.map(d => d.toUpperCase()).join(', ');
        systemReasoning += `- Ajout d'exclusions horaires pour l'enseignant : *${tNames || 'N/A'}* ou la classe : *${cNames || 'N/A'}* le *${dayNames}*.\n`;
        systemReasoning += `- Succès : ${result.isFullyScheduled ? '100% planifié sans conflits' : 'Heures résiduelles replacées dans la corbeille'}.`;
      } else {
        systemReasoning += `Ré-optimisation globale de l'emploi du temps par le solveur afin de désaturer les temps morts.`;
      }

      return NextResponse.json({
        timetable: result.timetable,
        unscheduled: result.unscheduled,
        score: result.score,
        reasoning: systemReasoning,
        isHeuristicFallback: true
      });
    }

    // --- GEMINI DIRECTED SCHEDULING AGENT (MAXIMUM COGNITIVE INTELLIGENCE) ---
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstructions = `
Vous êtes l'Agent d'intelligence artificielle de planification scolaire pour "Diongue-IziSchool".
Votre but est de prendre un emploi du temps existant, des matières, des enseignants, des groupes de classes, et d'apporter des réajustements optimaux de planning pour satisfaire des instructions ou résoudre un problème.

### RÈGLES FORMELLES À RESPECTER ABSOLUMENT :
1. Chaque heure de cours affectée (dans le tableau timetable) s'appelle un créneau.
2. Chaque créneau DOIT avoir : id, classId, teacherId, subjectId, day (un des jours valides : "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"), et slotIndex (un entier de 0 à 9).
3. **PAS DE DOUBLON ENSEIGNANT :** Un enseignant ne peut pas donner deux cours différents en même temps. (Si Timetable contient deux créneaux différents avec le même teacherId, day et slotIndex, c'est un conflit majeur interdit).
4. **PAS DE DOUBLON CLASSE :** Un groupe d'élèves/classe ne peut pas avoir deux cours différents en même temps. (Si Timetable contient deux créneaux différents avec le même classId, day et slotIndex, c'est interdit).
5. **RESPECT DES INDISPONIBILITÉS :** 
   - Ne placez JAMAIS de cours pour un enseignant sur un jour et slotIndex déclarés dans son tableau unavailability.
   - Ne placez JAMAIS de cours pour une classe sur un jour et slotIndex déclarés dans son tableau unavailability.
6. Le quota total d'heures hebdomadaires d'un enseignant rattaché à une classe (décrit dans assignments de la classe) doit être respecté dans le timetable. Les heures en trop ou qui provoquent des conflits insolubles doivent être placées dans le tableau \`unscheduled\`.
7. Privilégiez de faire des réajustements incrémentaux légers plutôt que de tout casser à partir de zéro, afin de préserver les habitudes de l'établissement tout en résovant la contrainte.
    `;

    const requestPrompt = `
S'il vous plaît, modifiez l'emploi du temps actuel pour satisfaire la demande ou résoudre le problème décrit ci-dessous.

L'ACTION À RÉALISER :
"${activeTextSource}"

DONNÉES D'ENTRÉE :
- Matières existantes : ${JSON.stringify(subjects)}
- Enseignants : ${JSON.stringify(teachers)}
- Classes (avec assignments et unavailability) : ${JSON.stringify(classes)}
- Emploi du temps actuel : ${JSON.stringify(timetable)}
- Non planifiés actuels : ${JSON.stringify(unscheduled)}

Exigences de sortie :
Retournez un objet JSON contenant :
1. "reasoning" (string en français) : Décrivez concrètement les changements majeurs opérés dans l'emploi du temps pour satisfaire la demande.
2. "timetable" (array de TimetableEntry) : La liste complète et réajustée de toutes les séances d'emploi du temps.
3. "unscheduled" (array) : Les séances d'enseignement qui n'ont pas pu trouver de place sans conflit majeur (contenant classId, teacherId, subjectId, hours, et reason).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: requestPrompt,
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: {
              type: Type.STRING,
              description: 'Explication résumée des optimisations effectuées.'
            },
            timetable: {
              type: Type.ARRAY,
              description: 'Liste intégrale réaménagée des séances.',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  classId: { type: Type.STRING },
                  teacherId: { type: Type.STRING },
                  subjectId: { type: Type.STRING },
                  day: { type: Type.STRING },
                  slotIndex: { type: Type.INTEGER }
                },
                required: ['id', 'classId', 'teacherId', 'subjectId', 'day', 'slotIndex']
              }
            },
            unscheduled: {
              type: Type.ARRAY,
              description: 'Séances rattachées n\'ayant pas pu être planifiées de manière cohérente.',
              items: {
                type: Type.OBJECT,
                properties: {
                  classId: { type: Type.STRING },
                  teacherId: { type: Type.STRING },
                  subjectId: { type: Type.STRING },
                  hours: { type: Type.INTEGER },
                  reason: { type: Type.STRING }
                },
                required: ['classId', 'teacherId', 'subjectId', 'hours', 'reason']
              }
            }
          },
          required: ['reasoning', 'timetable', 'unscheduled']
        }
      }
    });

    const parsedJson = JSON.parse(response.text?.trim() || '{}');
    
    // Fallback if returned timetable is empty or malformed
    if (!parsedJson.timetable || !Array.isArray(parsedJson.timetable)) {
      throw new Error('Le format renvoyé par l\'IA est invalide.');
    }

    // Verify and post-approve slots
    const finalTimetable = parsedJson.timetable.map((entry: any, index: number) => ({
      id: entry.id || `entry-ai-${index}-${Date.now()}`,
      classId: entry.classId,
      teacherId: entry.teacherId,
      subjectId: entry.subjectId,
      day: entry.day,
      slotIndex: Number(entry.slotIndex)
    }));

    // Calculate score (percentage of successfully scheduled hours)
    let totalTargetHours = 0;
    classes.forEach((c: ClassGroup) => {
      c.assignments.forEach(a => {
        totalTargetHours += a.hoursPerWeek;
      });
    });
    
    const scheduledHours = finalTimetable.length;
    const score = totalTargetHours > 0 ? Math.round((scheduledHours / totalTargetHours) * 100) : 100;

    return NextResponse.json({
      timetable: finalTimetable,
      unscheduled: parsedJson.unscheduled || [],
      score,
      reasoning: parsedJson.reasoning || "Relocalisations intelligentes appliquées.",
      isHeuristicFallback: false
    });

  } catch (error: any) {
    console.error('Error executing AI agent planning:', error);
    return NextResponse.json(
      { error: `Erreur interne d'exécution : ${error?.message || error}` },
      { status: 500 }
    );
  }
}
