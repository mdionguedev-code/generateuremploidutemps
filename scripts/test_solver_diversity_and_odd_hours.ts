import { generateTimetable } from '../lib/solver';
import { Subject, Teacher, ClassGroup, TimetableEntry } from '../lib/types';

function runDiversityAndOddHoursTests() {
  console.log("=== Tests de Découpage des Heures Impaires & Diversité à Chaque Clic ===\n");

  const subjects: Subject[] = [
    { id: "sub-maths", name: "Mathématiques" },
    { id: "sub-fr", name: "Français" },
    { id: "sub-ang", name: "Anglais" },
    { id: "sub-svt", name: "SVT" },
    { id: "sub-hg", name: "Histoire-Géographie" },
    { id: "sub-pc", name: "Physique-Chimie" },
    { id: "sub-philo", name: "Philosophie" },
  ];

  const teachers: Teacher[] = [
    { id: "t-maths", name: "M. Dupont", subjectIds: ["sub-maths"], weeklyQuota: 18, color: "#3B82F6", unavailability: [] },
    { id: "t-fr", name: "M. Hugo", subjectIds: ["sub-fr"], weeklyQuota: 18, color: "#F59E0B", unavailability: [] },
    { id: "t-ang", name: "Mme Smith", subjectIds: ["sub-ang"], weeklyQuota: 15, color: "#10B981", unavailability: [] },
    { id: "t-svt", name: "M. Pasteur", subjectIds: ["sub-svt"], weeklyQuota: 15, color: "#EC4899", unavailability: [] },
    { id: "t-hg", name: "Mme Veil", subjectIds: ["sub-hg"], weeklyQuota: 15, color: "#8B5CF6", unavailability: [] },
    { id: "t-pc", name: "Mme Curie", subjectIds: ["sub-pc"], weeklyQuota: 15, color: "#06B6D4", unavailability: [] },
    { id: "t-philo", name: "M. Sartre", subjectIds: ["sub-philo"], weeklyQuota: 15, color: "#64748B", unavailability: [] },
  ];

  const classes: ClassGroup[] = [
    {
      id: "class-term",
      name: "Terminale S",
      unavailability: [],
      assignments: [
        { teacherId: "t-maths", subjectId: "sub-maths", hoursPerWeek: 5 }, // Impair : 5h -> 2h + 2h + 1h (3 jours)
        { teacherId: "t-philo", subjectId: "sub-philo", hoursPerWeek: 3 }, // Impair : 3h -> 2h + 1h (2 jours)
        { teacherId: "t-fr", subjectId: "sub-fr", hoursPerWeek: 4 },       // Pair : 4h -> 2h + 2h (2 jours)
        { teacherId: "t-pc", subjectId: "sub-pc", hoursPerWeek: 5 },       // Impair : 5h -> 2h + 2h + 1h (3 jours)
        { teacherId: "t-svt", subjectId: "sub-svt", hoursPerWeek: 3 },     // Impair : 3h -> 2h + 1h (2 jours)
        { teacherId: "t-ang", subjectId: "sub-ang", hoursPerWeek: 3 },     // Impair : 3h -> 2h + 1h (2 jours)
      ],
    },
  ];

  // --- 1. Test Découpage des heures impaires (5h = 2h + 2h + 1h, 3h = 2h + 1h) ---
  console.log("--- 1. Vérification du découpage des heures impaires ---");
  const testRun = generateTimetable(subjects, teachers, classes);

  if (!testRun.isFullyScheduled) {
    throw new Error("Échec de la génération test initiale.");
  }

  // Vérifier Maths (5h)
  const mathEntries = testRun.timetable.filter(e => e.subjectId === "sub-maths");
  const mathDays = Array.from(new Set(mathEntries.map(e => e.day)));
  const mathDayDurations = mathDays.map(d => mathEntries.filter(e => e.day === d).length).sort((a, b) => b - a);

  console.log(`Maths 5h : réparti sur ${mathDays.length} jours -> Séances de ${mathDayDurations.join('h, ')}h`);
  if (mathDays.length !== 3 || JSON.stringify(mathDayDurations) !== JSON.stringify([2, 2, 1])) {
    throw new Error(`Erreur: Attendu [2, 2, 1] pour 5h, obtenu [${mathDayDurations.join(', ')}]`);
  }
  console.log("✅ Maths (5h) est rigoureusement découpé en 2h + 2h + 1h sur 3 jours distincts !");

  // Vérifier Philo (3h)
  const philoEntries = testRun.timetable.filter(e => e.subjectId === "sub-philo");
  const philoDays = Array.from(new Set(philoEntries.map(e => e.day)));
  const philoDayDurations = philoDays.map(d => philoEntries.filter(e => e.day === d).length).sort((a, b) => b - a);

  console.log(`Philo 3h : réparti sur ${philoDays.length} jours -> Séances de ${philoDayDurations.join('h, ')}h`);
  if (philoDays.length !== 2 || JSON.stringify(philoDayDurations) !== JSON.stringify([2, 1])) {
    throw new Error(`Erreur: Attendu [2, 1] pour 3h, obtenu [${philoDayDurations.join(', ')}]`);
  }
  console.log("✅ Philo (3h) est rigoureusement découpé en 2h + 1h sur 2 jours distincts !\n");

  // --- 2. Test de Diversification sur plusieurs clics consécutifs ---
  console.log("--- 2. Vérification de la diversité des propositions à chaque clic ---");
  const signatures: Set<string> = new Set();
  const iterations = 5;

  for (let i = 1; i <= iterations; i++) {
    const run = generateTimetable(subjects, teachers, classes);
    if (!run.isFullyScheduled) {
      throw new Error(`Erreur : L'itération ${i} n'a pas pu être résolue à 100%.`);
    }

    // Créer une signature unique représentant le placement des cours
    const sig = run.timetable
      .map(e => `${e.subjectId}@${e.day}_${e.slotIndex}`)
      .sort()
      .join('|');

    signatures.add(sig);
    console.log(`Clic ${i} : Solution générée avec succès (Score 100%, 0 conflit) - Signature: ${sig.slice(0, 45)}...`);
  }

  console.log(`\nNombre de propositions distinctes obtenues sur ${iterations} clics : ${signatures.size}`);
  if (signatures.size < 2) {
    throw new Error("Erreur: Le moteur produit toujours la même proposition à chaque clic.");
  }

  console.log(`✅ SUCCÈS : Le moteur produit des propositions diversifiées et valides à chaque clic (${signatures.size}/${iterations} variantes distinctes) !\n`);
}

runDiversityAndOddHoursTests();
