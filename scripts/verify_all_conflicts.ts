import { generateTimetable, validateManualMove } from '../lib/solver';
import { Subject, Teacher, ClassGroup, TimetableEntry } from '../lib/types';
import { INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES } from '../lib/demoData';

console.log("==================================================================");
console.log("=== VÉRIFICATION COMPLÈTE DE DÉTECTION ET PRÉVENTION DE CONFLITS ===");
console.log("==================================================================\n");

let allPassed = true;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ÉCHEC : ${message}`);
    allPassed = false;
  } else {
    console.log(`✅ SUCCÈS : ${message}`);
  }
}

// -------------------------------------------------------------
// 1. TEST DE GÉNÉRATION AUTOMATIQUE SUR LE DATASET COMPLET
// -------------------------------------------------------------
console.log("--- 1. Analyse de la génération automatique (Jeu de données complet) ---");
const result = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES);
const timetable = result.timetable;

console.log(`Nombre total de créneaux planifiés : ${timetable.length}`);
console.log(`Score de résolution : ${result.score}%`);

// Test 1.1 : Aucun professeur n'a deux cours à la même heure
const teacherSlots = new Map<string, TimetableEntry>();
let teacherClashes = 0;

for (const entry of timetable) {
  const key = `${entry.teacherId}_${entry.day}_${entry.slotIndex}`;
  if (teacherSlots.has(key)) {
    const existing = teacherSlots.get(key)!;
    console.error(`Conflit Professeur trouvé ! Prof ${entry.teacherId} a cours en classe ${entry.classId} ET classe ${existing.classId} le ${entry.day} créneau ${entry.slotIndex}`);
    teacherClashes++;
  } else {
    teacherSlots.set(key, entry);
  }
}
assert(teacherClashes === 0, `Zéro conflit professeur détecté (Aucun prof n'a 2 cours en même temps). Conflits trouvés : ${teacherClashes}`);

// Test 1.2 : Aucune classe n'a deux cours à la même heure
const classSlots = new Map<string, TimetableEntry>();
let classClashes = 0;

for (const entry of timetable) {
  const key = `${entry.classId}_${entry.day}_${entry.slotIndex}`;
  if (classSlots.has(key)) {
    const existing = classSlots.get(key)!;
    console.error(`Conflit Classe trouvé ! Classe ${entry.classId} a matière ${entry.subjectId} ET matière ${existing.subjectId} le ${entry.day} créneau ${entry.slotIndex}`);
    classClashes++;
  } else {
    classSlots.set(key, entry);
  }
}
assert(classClashes === 0, `Zéro conflit classe détecté (Aucune classe n'a 2 matières en même temps). Conflits trouvés : ${classClashes}`);

// Test 1.3 : Respect absolu des indisponibilités
let unavailViolations = 0;
for (const entry of timetable) {
  const teacher = INITIAL_TEACHERS.find(t => t.id === entry.teacherId);
  if (teacher && teacher.unavailability?.some(u => u.day === entry.day && u.slotIndex === entry.slotIndex)) {
    console.error(`Violation indisponibilité Prof ${teacher.name} le ${entry.day} créneau ${entry.slotIndex}`);
    unavailViolations++;
  }
  const cls = INITIAL_CLASSES.find(c => c.id === entry.classId);
  if (cls && cls.unavailability?.some(u => u.day === entry.day && u.slotIndex === entry.slotIndex)) {
    console.error(`Violation indisponibilité Classe ${cls.name} le ${entry.day} créneau ${entry.slotIndex}`);
    unavailViolations++;
  }
}
assert(unavailViolations === 0, `Zéro violation d'indisponibilité constatée. Violations : ${unavailViolations}`);


// -------------------------------------------------------------
// 2. TEST DE STRESS AVEC CLASSES MULTIPLES ET PROFESSEURS PARTAGÉS
// -------------------------------------------------------------
console.log("\n--- 2. Test de stress avec fortes contraintes de partage d'enseignants ---");

const stressTeachers: Teacher[] = [
  { id: 't1', name: 'Prof Polyvalent A', subjectIds: ['sub-math'], color: '#4f46e5', weeklyQuota: 12, unavailability: [{ day: 'Lundi', slotIndex: 0 }] },
  { id: 't2', name: 'Prof Polyvalent B', subjectIds: ['sub-fr'], color: '#16a34a', weeklyQuota: 10, unavailability: [] },
];

const stressClasses: ClassGroup[] = [
  { id: 'c1', name: 'Terminale S1', assignments: [{ subjectId: 'sub-math', teacherId: 't1', hoursPerWeek: 6 }, { subjectId: 'sub-fr', teacherId: 't2', hoursPerWeek: 5 }], unavailability: [] },
  { id: 'c2', name: 'Terminale S2', assignments: [{ subjectId: 'sub-math', teacherId: 't1', hoursPerWeek: 6 }, { subjectId: 'sub-fr', teacherId: 't2', hoursPerWeek: 5 }], unavailability: [] },
];

const stressResult = generateTimetable(INITIAL_SUBJECTS, stressTeachers, stressClasses, ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"], 8);
let stressTeacherClashes = 0;
let stressClassClashes = 0;
const stMap = new Map<string, string>();
const scMap = new Map<string, string>();

for (const entry of stressResult.timetable) {
  const tKey = `${entry.teacherId}_${entry.day}_${entry.slotIndex}`;
  if (stMap.has(tKey)) stressTeacherClashes++;
  else stMap.set(tKey, entry.classId);

  const cKey = `${entry.classId}_${entry.day}_${entry.slotIndex}`;
  if (scMap.has(cKey)) stressClassClashes++;
  else scMap.set(cKey, entry.subjectId);
}

assert(stressTeacherClashes === 0, `Test de stress : 0 chevauchement pour le professeur partagé sur 2 classes.`);
assert(stressClassClashes === 0, `Test de stress : 0 chevauchement de matières pour chaque classe.`);


// -------------------------------------------------------------
// 3. TEST DU MOTEUR DE DÉTECTION EN TEMPS RÉEL (validateManualMove)
// -------------------------------------------------------------
console.log("\n--- 3. Test du validateur de déplacements manuels (Drag & Drop) ---");

// Création d'une situation de test
const testTable: TimetableEntry[] = [
  { id: 'e1', classId: 'cls-6a', teacherId: 'teach-einstein', subjectId: 'sub-maths', day: 'Lundi', slotIndex: 0 },
  { id: 'e2', classId: 'cls-6a', teacherId: 'teach-einstein', subjectId: 'sub-maths', day: 'Lundi', slotIndex: 1 },
  { id: 'e3', classId: 'cls-5a', teacherId: 'teach-einstein', subjectId: 'sub-maths', day: 'Mardi', slotIndex: 3 },
  { id: 'e4', classId: 'cls-6a', teacherId: 'teach-curie', subjectId: 'sub-pc', day: 'Mardi', slotIndex: 3 },
];

const testTeachers: Teacher[] = [
  { id: 'teach-einstein', name: 'Albert Einstein', subjectIds: ['sub-maths'], color: '#4f46e5', weeklyQuota: 10, unavailability: [{ day: 'Mercredi', slotIndex: 0 }] },
  { id: 'teach-curie', name: 'Marie Curie', subjectIds: ['sub-pc'], color: '#16a34a', weeklyQuota: 8, unavailability: [] },
];

const testClasses: ClassGroup[] = [
  { id: 'cls-6a', name: '6ème A', assignments: [], unavailability: [{ day: 'Jeudi', slotIndex: 0 }] },
  { id: 'cls-5a', name: '5ème A', assignments: [], unavailability: [] },
];

// Cas 3.1 : Déplacer un cours vers un créneau où la CLASSE a déjà un autre cours
const moveClashClass = validateManualMove(testTable, testClasses, testTeachers, testTable[0], 'Mardi', 3);
assert(!moveClashClass.isValid, `Détection conflit classe : Tentative de mettre Maths sur le créneau où 6ème A a déjà PC rejetée (${moveClashClass.reason})`);

// Cas 3.2 : Déplacer un cours vers un créneau où le PROFESSEUR a déjà un cours dans une autre classe
const entryCurieIn5A: TimetableEntry = { id: 'e-temp', classId: 'cls-5a', teacherId: 'teach-curie', subjectId: 'sub-pc', day: 'Vendredi', slotIndex: 0 };
const moveClashTeacher = validateManualMove(testTable, testClasses, testTeachers, entryCurieIn5A, 'Mardi', 3);
assert(!moveClashTeacher.isValid, `Détection conflit prof : Tentative de placer Marie Curie le Mardi à slot 3 rejetée car déjà en 6ème A (${moveClashTeacher.reason})`);

// Cas 3.3 : Déplacer un cours sur un créneau où le PROFESSEUR est indisponible
const moveTeacherUnavail = validateManualMove(testTable, testClasses, testTeachers, testTable[0], 'Mercredi', 0);
assert(!moveTeacherUnavail.isValid, `Détection indisponibilité prof : Rejetée (${moveTeacherUnavail.reason})`);

// Cas 3.4 : Déplacer un cours sur un créneau où la CLASSE est indisponible
const moveClassUnavail = validateManualMove(testTable, testClasses, testTeachers, testTable[0], 'Jeudi', 0);
assert(!moveClassUnavail.isValid, `Détection indisponibilité classe : Rejetée (${moveClassUnavail.reason})`);

// Cas 3.5 : Déplacer vers un créneau valide et libre
const moveValid = validateManualMove(testTable, testClasses, testTeachers, testTable[0], 'Vendredi', 2);
assert(moveValid.isValid, `Créneau libre et valide : Déplacement accepté avec succès.`);

console.log("\n==================================================================");
if (allPassed) {
  console.log("🎉 TOUTES LES VÉRIFICATIONS DE CONFLITS SONT VALIDÉES À 100% !");
} else {
  console.error("⚠️ CERTAINS TESTS DE CONFLITS ONT ÉCHOUÉ.");
}
console.log("==================================================================");
