import { generateTimetable, isMathSubject, isFrenchSubject } from '../lib/solver';
import { Subject, Teacher, ClassGroup } from '../lib/types';

function runMathsFrEpsTests() {
  console.log("=== Lancement des tests Maths & Français à 8h + EPS personnalisé ===\n");

  const subjects: Subject[] = [
    { id: "sub-maths", name: "Mathématiques" },
    { id: "sub-fr", name: "Français" },
    { id: "sub-pc", name: "Physique-Chimie" },
    { id: "sub-hg", name: "Histoire-Géographie" },
    { id: "sub-svt", name: "SVT" },
    { id: "sub-eps", name: "EPS" },
  ];

  const teachers: Teacher[] = [
    { id: "teach-1", name: "M. Dupont (Maths)", subjectIds: ["sub-maths"], weeklyQuota: 18, color: "#3B82F6", unavailability: [] },
    { id: "teach-2", name: "M. Hugo (Français)", subjectIds: ["sub-fr"], weeklyQuota: 18, color: "#F59E0B", unavailability: [] },
    { id: "teach-3", name: "Mme Curie (PC)", subjectIds: ["sub-pc"], weeklyQuota: 15, color: "#10B981", unavailability: [] },
    { id: "teach-4", name: "Mme Veil (HG)", subjectIds: ["sub-hg"], weeklyQuota: 12, color: "#8B5CF6", unavailability: [] },
    { id: "teach-5", name: "M. Pasteur (SVT)", subjectIds: ["sub-svt"], weeklyQuota: 10, color: "#EC4899", unavailability: [] },
    { id: "teach-6", name: "M. Zidane (EPS)", subjectIds: ["sub-eps"], weeklyQuota: 12, color: "#EF4444", unavailability: [] },
  ];

  const classes: ClassGroup[] = [
    {
      id: "class-6a",
      name: "6ème A",
      unavailability: [],
      assignments: [
        { teacherId: "teach-1", subjectId: "sub-maths", hoursPerWeek: 5 }, // 2h + 2h + 1h
        { teacherId: "teach-2", subjectId: "sub-fr", hoursPerWeek: 4 },    // 2h + 2h
        { teacherId: "teach-3", subjectId: "sub-pc", hoursPerWeek: 3 },
        { teacherId: "teach-4", subjectId: "sub-hg", hoursPerWeek: 3 },
        { teacherId: "teach-5", subjectId: "sub-svt", hoursPerWeek: 2 },
        // EPS avec créneau fixé par l'utilisateur: Mardi 08h-10h (slot 0)
        { teacherId: "teach-6", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Mardi", fixedStartSlot: 0 },
      ],
    },
    {
      id: "class-6b",
      name: "6ème B",
      unavailability: [],
      assignments: [
        { teacherId: "teach-1", subjectId: "sub-maths", hoursPerWeek: 5 },
        { teacherId: "teach-2", subjectId: "sub-fr", hoursPerWeek: 4 },
        { teacherId: "teach-3", subjectId: "sub-pc", hoursPerWeek: 3 },
        { teacherId: "teach-4", subjectId: "sub-hg", hoursPerWeek: 3 },
        { teacherId: "teach-5", subjectId: "sub-svt", hoursPerWeek: 2 },
        // EPS avec créneau fixé par l'utilisateur: Jeudi 14h-16h (slot 6)
        { teacherId: "teach-6", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Jeudi", fixedStartSlot: 6 },
      ],
    },
  ];

  const result = generateTimetable(subjects, teachers, classes);

  console.log(`Résultats:`);
  console.log(`- Fully scheduled: ${result.isFullyScheduled}`);
  console.log(`- Score: ${result.score}%`);
  console.log(`- Total slots: ${result.timetable.length}`);
  console.log(`- Unscheduled: ${result.unscheduled.length}\n`);

  if (!result.isFullyScheduled) {
    console.error("Erreur - des cours non planifiés :", result.unscheduled);
    process.exit(1);
  }

  // 1. Vérification EPS fixé
  console.log("--- TEST 1 : Vérification des créneaux EPS fixés ---");
  const eps6a = result.timetable.filter(e => e.classId === "class-6a" && e.subjectId === "sub-eps");
  console.log("EPS 6ème A:", eps6a.map(e => `${e.day} ${e.slotIndex + 8}h`));
  const isEps6aOk = eps6a.length === 2 && eps6a.every(e => e.day === "Mardi" && (e.slotIndex === 0 || e.slotIndex === 1));
  if (!isEps6aOk) {
    throw new Error("Échec du test EPS 6ème A (attendu Mardi 8h-10h)");
  }
  console.log("✅ EPS 6ème A bien placé le Mardi de 08h à 10h !");

  const eps6b = result.timetable.filter(e => e.classId === "class-6b" && e.subjectId === "sub-eps");
  console.log("EPS 6ème B:", eps6b.map(e => `${e.day} ${e.slotIndex + 8}h`));
  const isEps6bOk = eps6b.length === 2 && eps6b.every(e => e.day === "Jeudi" && (e.slotIndex === 6 || e.slotIndex === 7));
  if (!isEps6bOk) {
    throw new Error("Échec du test EPS 6ème B (attendu Jeudi 14h-16h)");
  }
  console.log("✅ EPS 6ème B bien placé le Jeudi de 14h à 16h !\n");

  // 2. Vérification Maths & Français à 8h
  console.log("--- TEST 2 : Vérification Maths et Français à 8h ---");
  for (const c of classes) {
    console.log(`Analyse pour la classe ${c.name} :`);
    const mathEntries = result.timetable.filter(e => e.classId === c.id && e.subjectId === "sub-maths");
    const frEntries = result.timetable.filter(e => e.classId === c.id && e.subjectId === "sub-fr");

    // Start slots for math sessions
    const mathDays = Array.from(new Set(mathEntries.map(e => e.day)));
    const math8hCount = mathDays.filter(d => {
      const daySlots = mathEntries.filter(e => e.day === d).map(e => e.slotIndex);
      return Math.min(...daySlots) === 0;
    }).length;

    // Start slots for fr sessions
    const frDays = Array.from(new Set(frEntries.map(e => e.day)));
    const fr8hCount = frDays.filter(d => {
      const daySlots = frEntries.filter(e => e.day === d).map(e => e.slotIndex);
      return Math.min(...daySlots) === 0;
    }).length;

    console.log(`  - Maths : ${math8hCount} séance(s) débutant à 8h (Jours: ${mathDays.join(', ')})`);
    console.log(`  - Français : ${fr8hCount} séance(s) débutant à 8h (Jours: ${frDays.join(', ')})`);
    console.log(`  - Total séances 8h (Maths + Fr) : ${math8hCount + fr8hCount}`);
  }

  // 3. Vérification de non-conflit global
  console.log("\n--- TEST 3 : Vérification de l'absence de conflits ---");
  const collisionMap: Record<string, string> = {};
  for (const entry of result.timetable) {
    const teachKey = `T_${entry.teacherId}_${entry.day}_${entry.slotIndex}`;
    const classKey = `C_${entry.classId}_${entry.day}_${entry.slotIndex}`;

    if (collisionMap[teachKey]) {
      throw new Error(`Conflit enseignant détecté : ${teachKey}`);
    }
    if (collisionMap[classKey]) {
      throw new Error(`Conflit classe détecté : ${classKey}`);
    }
    collisionMap[teachKey] = entry.id;
    collisionMap[classKey] = entry.id;
  }
  console.log("✅ Aucun conflit enseignant ou classe détecté !");

  console.log("\n🎉 TOUS LES TESTS MATHS, FR ET EPS SONT VALIDES ! 🎉");
}

runMathsFrEpsTests();
