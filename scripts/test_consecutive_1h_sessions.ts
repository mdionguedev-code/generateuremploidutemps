import { generateTimetable } from '../lib/solver';
import { Subject, Teacher, ClassGroup } from '../lib/types';

function runConsecutive1hTests() {
  console.log("=== Test d'enchaînement consécutif des cours de 1 heure ===\n");

  const subjects: Subject[] = [
    { id: "sub-maths", name: "Mathématiques" },
    { id: "sub-fr", name: "Français" },
    { id: "sub-ang", name: "Anglais" },
    { id: "sub-svt", name: "SVT" },
    { id: "sub-hg", name: "Histoire-Géographie" },
    { id: "sub-pc", name: "Physique-Chimie" },
    { id: "sub-art", name: "Arts Plastiques" },
    { id: "sub-mus", name: "Éducation Musicale" },
    { id: "sub-eps", name: "EPS" },
  ];

  const teachers: Teacher[] = [
    { id: "t-maths", name: "M. Dupont", subjectIds: ["sub-maths"], weeklyQuota: 18, color: "#3B82F6", unavailability: [] },
    { id: "t-fr", name: "M. Hugo", subjectIds: ["sub-fr"], weeklyQuota: 18, color: "#F59E0B", unavailability: [] },
    { id: "t-ang", name: "Mme Smith", subjectIds: ["sub-ang"], weeklyQuota: 15, color: "#10B981", unavailability: [] },
    { id: "t-svt", name: "M. Pasteur", subjectIds: ["sub-svt"], weeklyQuota: 15, color: "#EC4899", unavailability: [] },
    { id: "t-hg", name: "Mme Veil", subjectIds: ["sub-hg"], weeklyQuota: 15, color: "#8B5CF6", unavailability: [] },
    { id: "t-pc", name: "Mme Curie", subjectIds: ["sub-pc"], weeklyQuota: 15, color: "#06B6D4", unavailability: [] },
    { id: "t-art", name: "M. Monet", subjectIds: ["sub-art"], weeklyQuota: 12, color: "#F97316", unavailability: [] },
    { id: "t-mus", name: "M. Mozart", subjectIds: ["sub-mus"], weeklyQuota: 12, color: "#EAB308", unavailability: [] },
    { id: "t-eps", name: "M. Zidane", subjectIds: ["sub-eps"], weeklyQuota: 12, color: "#EF4444", unavailability: [] },
  ];

  const classes: ClassGroup[] = [
    {
      id: "class-5a",
      name: "5ème A",
      unavailability: [],
      assignments: [
        { teacherId: "t-maths", subjectId: "sub-maths", hoursPerWeek: 4 }, // 2h + 2h
        { teacherId: "t-fr", subjectId: "sub-fr", hoursPerWeek: 4 },       // 2h + 2h
        { teacherId: "t-ang", subjectId: "sub-ang", hoursPerWeek: 3 },     // 2h + 1h
        { teacherId: "t-svt", subjectId: "sub-svt", hoursPerWeek: 3 },     // 2h + 1h
        { teacherId: "t-hg", subjectId: "sub-hg", hoursPerWeek: 3 },       // 2h + 1h
        { teacherId: "t-pc", subjectId: "sub-pc", hoursPerWeek: 3 },       // 2h + 1h
        { teacherId: "t-art", subjectId: "sub-art", hoursPerWeek: 1 },     // 1h
        { teacherId: "t-mus", subjectId: "sub-mus", hoursPerWeek: 1 },     // 1h
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2 },     // 2h
      ],
    },
  ];

  const result = generateTimetable(subjects, teachers, classes);

  console.log(`Résultats de génération :`);
  console.log(`- 100% Planifié : ${result.isFullyScheduled}`);
  console.log(`- Score : ${result.score}%`);
  console.log(`- Créneaux planifiés : ${result.timetable.length}`);
  console.log(`- Non planifiés : ${result.unscheduled.length}\n`);

  if (!result.isFullyScheduled) {
    console.error("Échec: Des cours n'ont pas pu être planifiés", result.unscheduled);
    process.exit(1);
  }

  // Analyser l'emploi du temps par jour pour vérifier la compacité et l'enchaînement
  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  let total1hSessions = 0;
  let chained1hSessions = 0;

  for (const day of days) {
    const dayEntries = result.timetable
      .filter(e => e.day === day)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    if (dayEntries.length === 0) continue;

    console.log(`📅 ${day} :`);
    for (const e of dayEntries) {
      const subName = subjects.find(s => s.id === e.subjectId)?.name || e.subjectId;
      console.log(`   - ${e.slotIndex + 8}h00 - ${e.slotIndex + 9}h00 : ${subName}`);
    }

    // Identifier les sessions d'1h (séances isolées d'une matière ce jour)
    for (let i = 0; i < dayEntries.length; i++) {
      const current = dayEntries[i];
      const isPartof2h = (i > 0 && dayEntries[i - 1].subjectId === current.subjectId && dayEntries[i - 1].slotIndex === current.slotIndex - 1) ||
                         (i < dayEntries.length - 1 && dayEntries[i + 1].subjectId === current.subjectId && dayEntries[i + 1].slotIndex === current.slotIndex + 1);

      if (!isPartof2h) {
        total1hSessions++;
        const hasPrecedingCourse = (i > 0 && dayEntries[i - 1].slotIndex === current.slotIndex - 1);
        const hasFollowingCourse = (i < dayEntries.length - 1 && dayEntries[i + 1].slotIndex === current.slotIndex + 1);

        if (hasPrecedingCourse || hasFollowingCourse) {
          chained1hSessions++;
        }
      }
    }
    console.log("");
  }

  console.log(`Bilan de l'enchaînement des cours d'1 heure :`);
  console.log(`- Total de séances de 1h identifiées : ${total1hSessions}`);
  console.log(`- Séances de 1h enchaînées consécutivement : ${chained1hSessions}`);
  const chainRatio = total1hSessions > 0 ? (chained1hSessions / total1hSessions) * 100 : 100;
  console.log(`- Taux d'enchaînement : ${chainRatio.toFixed(1)}%\n`);

  if (chainRatio < 90) {
    throw new Error(`Erreur: Le taux d'enchaînement des cours d'1h (${chainRatio}%) est inférieur à l'objectif attendu de 90%.`);
  }

  console.log("✅ SUCCÈS : Les cours d'1h s'enchaînent de manière contiguë et compacte !");
}

runConsecutive1hTests();
