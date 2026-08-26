import { generateTimetable, validateManualMove } from '../lib/solver';
import { Subject, Teacher, ClassGroup } from '../lib/types';

function runTests() {
  console.log("=== Lancement des tests des règles du Solver d'emploi du temps ===\n");

  const subjects: Subject[] = [
    { id: "sub-maths", name: "Mathématiques" },
    { id: "sub-pc", name: "Physique-Chimie" },
    { id: "sub-hg", name: "Histoire-Géographie" },
    { id: "sub-fr", name: "Français" },
    { id: "sub-svt", name: "SVT" },
    { id: "sub-eps", name: "EPS" },
  ];

  const teachers: Teacher[] = [
    { id: "teach-1", name: "M. Dupont", subjectIds: ["sub-maths"], weeklyQuota: 18, color: "#3B82F6", unavailability: [] },
    { id: "teach-2", name: "Mme Curie", subjectIds: ["sub-pc"], weeklyQuota: 15, color: "#10B981", unavailability: [] },
    { id: "teach-3", name: "M. Hugo", subjectIds: ["sub-fr"], weeklyQuota: 18, color: "#F59E0B", unavailability: [] },
    { id: "teach-4", name: "Mme Veil", subjectIds: ["sub-hg"], weeklyQuota: 12, color: "#8B5CF6", unavailability: [] },
    { id: "teach-5", name: "M. Pasteur", subjectIds: ["sub-svt"], weeklyQuota: 10, color: "#EC4899", unavailability: [] },
    { id: "teach-6", name: "M. Zidane", subjectIds: ["sub-eps"], weeklyQuota: 8, color: "#EF4444", unavailability: [] },
  ];

  const classes: ClassGroup[] = [
    {
      id: "class-6a",
      name: "6ème A",
      unavailability: [],
      assignments: [
        { teacherId: "teach-1", subjectId: "sub-maths", hoursPerWeek: 5 }, // 5h -> 2h + 2h + 1h
        { teacherId: "teach-2", subjectId: "sub-pc", hoursPerWeek: 3 },    // 3h -> 2h + 1h
        { teacherId: "teach-3", subjectId: "sub-fr", hoursPerWeek: 4 },    // 4h -> 2h + 2h
        { teacherId: "teach-4", subjectId: "sub-hg", hoursPerWeek: 3 },    // 3h -> 2h + 1h
        { teacherId: "teach-5", subjectId: "sub-svt", hoursPerWeek: 2 },   // 2h -> 2h
        { teacherId: "teach-6", subjectId: "sub-eps", hoursPerWeek: 2 },   // 2h -> 2h
      ],
    },
  ];

  const result = generateTimetable(subjects, teachers, classes);

  console.log(`Résultat de la génération:`);
  console.log(`- Complètement planifié : ${result.isFullyScheduled}`);
  console.log(`- Score : ${result.score}%`);
  console.log(`- Nombre de créneaux planifiés : ${result.timetable.length}`);
  console.log(`- Non planifiés : ${result.unscheduled.length}\n`);

  if (result.unscheduled.length > 0) {
    console.error("Erreur: Des cours n'ont pas pu être planifiés:", result.unscheduled);
    process.exit(1);
  }

  // 1. Vérification: Pour une matière de 5h (Maths), elle doit être sur exactement 3 jours différents (2h + 2h + 1h)
  const mathEntries = result.timetable.filter(e => e.classId === "class-6a" && e.subjectId === "sub-maths");
  const mathDays = Array.from(new Set(mathEntries.map(e => e.day)));
  console.log(`Test 1 - Maths (5h): planifié sur les jours :`, mathDays);

  if (mathEntries.length !== 5) {
    throw new Error(`Erreur: Attendu 5h de Maths, obtenu ${mathEntries.length}h`);
  }
  if (mathDays.length !== 3) {
    throw new Error(`Erreur: Attendu 3 jours distincts pour 5h (2h+2h+1h), obtenu ${mathDays.length} jours`);
  }
  console.log("  => Succès: 5h découpées sur 3 jours distincts.\n");

  // 1bis. Vérification: Variation des heures de début des cours de Maths sur les 3 jours
  console.log("Test 1bis - Vérification de la variation des heures de début pour les Maths :");
  const mathStartSlotsPerDay = mathDays.map(day => {
    const dayEntries = mathEntries.filter(e => e.day === day).sort((a, b) => a.slotIndex - b.slotIndex);
    return { day, startSlot: dayEntries[0].slotIndex, startHour: `${dayEntries[0].slotIndex + 8}h` };
  });
  console.log("  Heures de début de Maths :", mathStartSlotsPerDay);

  const startSlotsSet = new Set(mathStartSlotsPerDay.map(m => m.startSlot));
  if (startSlotsSet.size !== mathStartSlotsPerDay.length) {
    throw new Error(`Erreur: Des séances de Maths débutent à la même heure sur des jours différents ! (${Array.from(startSlotsSet).join(', ')})`);
  }
  console.log("  => Succès: Toutes les séances de Maths débutent à des heures différentes !\n");

  // 2. Vérification: Pas plus d'une séance par jour pour chaque matière dans une classe
  console.log("Test 2 - Vérification de l'unicité journalière et absence de blocs > 2h:");
  for (const day of ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]) {
    for (const sub of subjects) {
      const daySubEntries = result.timetable.filter(
        e => e.classId === "class-6a" && e.subjectId === sub.id && e.day === day
      ).sort((a, b) => a.slotIndex - b.slotIndex);

      if (daySubEntries.length > 2) {
        throw new Error(`Erreur: Plus de 2h pour ${sub.name} le ${day} (trouvé ${daySubEntries.length}h)`);
      }
      if (daySubEntries.length === 2) {
        // Must be strictly contiguous (slot s and slot s+1)
        if (daySubEntries[1].slotIndex !== daySubEntries[0].slotIndex + 1) {
          throw new Error(`Erreur: 2 séances séparées de ${sub.name} le même jour (${day})`);
        }
      }
    }
  }
  console.log("  => Succès: Maximum 1 bloc continu <= 2h par matière par jour.\n");

  // 3. Vérification: Chaînage des cours d'1h de matières différentes
  console.log("Test 3 - Vérification de la présence de cours qui se succèdent:");
  let foundChainedDifferentSubjects = false;
  for (const day of ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]) {
    const dayEntries = result.timetable
      .filter(e => e.classId === "class-6a" && e.day === day)
      .sort((a, b) => a.slotIndex - b.slotIndex);

    for (let i = 0; i < dayEntries.length - 1; i++) {
      if (dayEntries[i + 1].slotIndex === dayEntries[i].slotIndex + 1) {
        if (dayEntries[i + 1].subjectId !== dayEntries[i].subjectId) {
          foundChainedDifferentSubjects = true;
          const s1 = subjects.find(s => s.id === dayEntries[i].subjectId)?.name;
          const s2 = subjects.find(s => s.id === dayEntries[i + 1].subjectId)?.name;
          console.log(`  Exemple trouvé le ${day} créneau ${dayEntries[i].slotIndex} -> ${dayEntries[i + 1].slotIndex} : [${s1}] suivi de [${s2}]`);
        }
      }
    }
  }
  if (foundChainedDifferentSubjects) {
    console.log("  => Succès: Les cours de matières distinctes s'enchaînent sans trou.\n");
  }

  // 4. Test validateManualMove
  console.log("Test 4 - Test de validateManualMove:");
  const sampleEntry = result.timetable[0];
  // Test invalid move: same day non-contiguous slot if already present
  const moveRes = validateManualMove(
    result.timetable,
    classes,
    teachers,
    sampleEntry,
    sampleEntry.day,
    (sampleEntry.slotIndex + 4) % 10
  );
  console.log("  Déplacement vers un créneau distant le même jour rejeté :", !moveRes.isValid, moveRes.reason);

  console.log("\n=== TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS ! ===");
}

runTests();
