import { generateTimetable } from '../lib/solver';
import { Subject, Teacher, ClassGroup } from '../lib/types';

function runEpsManualSlotAndConflictTests() {
  console.log("=== Tests de prise en compte manuelle EPS & Détection des conflits ===\n");

  const subjects: Subject[] = [
    { id: "sub-maths", name: "Mathématiques" },
    { id: "sub-eps", name: "EPS" },
    { id: "sub-fr", name: "Français" },
  ];

  const teachers: Teacher[] = [
    { id: "t-maths", name: "M. Dupont", subjectIds: ["sub-maths"], weeklyQuota: 18, color: "#3B82F6", unavailability: [] },
    { id: "t-eps", name: "M. Zidane (EPS)", subjectIds: ["sub-eps"], weeklyQuota: 12, color: "#EF4444", unavailability: [] },
    { id: "t-fr", name: "M. Hugo", subjectIds: ["sub-fr"], weeklyQuota: 18, color: "#F59E0B", unavailability: [] },
  ];

  // --- SCÉNARIO 1 : Prise en compte manuelle stricte (même avec string "0") ---
  console.log("--- Scénario 1 : Prise en compte manuelle d'un créneau EPS (Mardi 8h-10h) ---");
  const classesScenario1: ClassGroup[] = [
    {
      id: "class-6a",
      name: "6ème A",
      unavailability: [],
      assignments: [
        { teacherId: "t-maths", subjectId: "sub-maths", hoursPerWeek: 4 },
        { teacherId: "t-fr", subjectId: "sub-fr", hoursPerWeek: 4 },
        // String "0" simulates JSON serialization from form select
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Mardi", fixedStartSlot: "0" as any },
      ],
    },
  ];

  const res1 = generateTimetable(subjects, teachers, classesScenario1);
  if (!res1.isFullyScheduled) {
    throw new Error("Échec de la planification du scénario 1");
  }

  const epsEntries1 = res1.timetable.filter(e => e.classId === "class-6a" && e.subjectId === "sub-eps");
  console.log("EPS 6ème A généré :", epsEntries1.map(e => `${e.day} slotIndex=${e.slotIndex} (type=${typeof e.slotIndex})`));

  const isEps1Ok = epsEntries1.length === 2 &&
    epsEntries1.every(e => e.day === "Mardi" && typeof e.slotIndex === 'number' && (e.slotIndex === 0 || e.slotIndex === 1));

  if (!isEps1Ok) {
    throw new Error("Erreur: Le créneau EPS fixé manuellement n'a pas été placé à Mardi 8h-10h avec des slotIndex numériques stricts.");
  }
  console.log("✅ SUCCÈS Scénario 1 : L'EPS est exactement positionné sur le créneau choisi (Mardi 8h-10h) avec typage numérique conforme !\n");

  // --- SCÉNARIO 2 : Détection de collision de créneau fixé (Deux classes sur le même créneau EPS) ---
  console.log("--- Scénario 2 : Détection de conflit quand 2 classes ont le même créneau fixe EPS ---");
  const classesScenario2: ClassGroup[] = [
    {
      id: "class-6a",
      name: "6ème A",
      unavailability: [],
      assignments: [
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Mardi", fixedStartSlot: 0 },
      ],
    },
    {
      id: "class-6b",
      name: "6ème B",
      unavailability: [],
      assignments: [
        // Conflit délibéré : Même prof d'EPS le même jour à la même heure
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Mardi", fixedStartSlot: 0 },
      ],
    },
  ];

  const res2 = generateTimetable(subjects, teachers, classesScenario2);
  console.log(`Planifié : ${res2.isFullyScheduled}, Non planifiés : ${res2.unscheduled.length}`);
  if (res2.unscheduled.length === 0) {
    throw new Error("Erreur: Le solver n'a pas détecté le conflit de créneau imposé entre les deux classes.");
  }

  const conflictItem = res2.unscheduled[0];
  console.log(`Raison du conflit retournée : "${conflictItem.reason}"`);
  if (!conflictItem.reason.toLowerCase().includes('conflit') && !conflictItem.reason.toLowerCase().includes('occupé')) {
    throw new Error(`Message de conflit imprécis : ${conflictItem.reason}`);
  }
  console.log("✅ SUCCÈS Scénario 2 : Le conflit de créneau EPS entre 2 classes est immédiatement détecté et explicité !\n");

  // --- SCÉNARIO 3 : Multiples créneaux EPS distincts sans conflit ---
  console.log("--- Scénario 3 : 2 classes avec des créneaux EPS distincts fixés manuellement ---");
  const classesScenario3: ClassGroup[] = [
    {
      id: "class-6a",
      name: "6ème A",
      unavailability: [],
      assignments: [
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Mardi", fixedStartSlot: 0 },
      ],
    },
    {
      id: "class-6b",
      name: "6ème B",
      unavailability: [],
      assignments: [
        { teacherId: "t-eps", subjectId: "sub-eps", hoursPerWeek: 2, fixedDay: "Jeudi", fixedStartSlot: 4 },
      ],
    },
  ];

  const res3 = generateTimetable(subjects, teachers, classesScenario3);
  if (!res3.isFullyScheduled) {
    throw new Error("Échec de la planification du scénario 3");
  }

  const eps6a = res3.timetable.filter(e => e.classId === "class-6a" && e.subjectId === "sub-eps");
  const eps6b = res3.timetable.filter(e => e.classId === "class-6b" && e.subjectId === "sub-eps");

  console.log("EPS 6ème A:", eps6a.map(e => `${e.day} à ${e.slotIndex + 8}h`));
  console.log("EPS 6ème B:", eps6b.map(e => `${e.day} à ${e.slotIndex + 8}h`));

  const is6aMardi = eps6a.every(e => e.day === "Mardi" && (e.slotIndex === 0 || e.slotIndex === 1));
  const is6bJeudi = eps6b.every(e => e.day === "Jeudi" && (e.slotIndex === 4 || e.slotIndex === 5));

  if (!is6aMardi || !is6bJeudi) {
    throw new Error("Erreur: Les créneaux EPS distincts ne sont pas placés aux heures exactes demandées.");
  }
  console.log("✅ SUCCÈS Scénario 3 : Les 2 classes ont chacune leur créneau d'EPS exactement aux heures fixées !\n");

  console.log("🎉 TOUS LES TESTS EPS ET CONFLITS SONT VALIDES À 100% !");
}

runEpsManualSlotAndConflictTests();
