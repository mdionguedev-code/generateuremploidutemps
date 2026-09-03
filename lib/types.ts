export interface Subject {
  id: string;
  name: string;
}

export interface DayTimeSlot {
  day: string; // "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"
  slotIndex: number; // 0: 8h-9h, 1: 9h-10h, 2: 10h-11h, 3: 11h-12h, 4: 12h-13h, 5: 13h-14h, 6: 14h-15h, 7: 15h-16h, 8: 16h-17h, 9: 17h-18h
}

export interface Teacher {
  id: string;
  name: string;
  subjectIds: string[]; // subjects taught
  weeklyQuota: number; // 1 to 30h
  color: string; // hex hexacodecimal color
  unavailability: DayTimeSlot[]; // Jours/Heures libres
}

export interface ClassAssignment {
  id?: string;
  teacherId: string;
  subjectId: string;
  hoursPerWeek: number; // quantum horaire
  fixedDay?: string; // Jour fixé par l'utilisateur (ex: "Mardi" pour EPS)
  fixedStartSlot?: number; // Créneau de départ fixé par l'utilisateur (ex: 0 pour 8h, 6 pour 14h)
  // Classes Scindées (Sous-groupes et cours simultanés)
  group?: 'all' | 'G1' | 'G2' | string; // 'all' (classe entière), 'G1' (Groupe A), 'G2' (Groupe B)
  groupLabel?: string; // Ex: "Groupe A", "Groupe B", "Espagnol", "Arabe"
  pairedGroupId?: string; // ID partagé reliant les cours synchronisés
  syncHours?: number; // Nombre d'heures synchronisées simultanément
}

export interface ClassGroup {
  id: string;
  name: string;
  assignments: ClassAssignment[];
  unavailability: DayTimeSlot[]; // Plages horaires libres de la classe
}

export interface TimetableEntry {
  id: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  day: string;
  slotIndex: number;
  // Classes Scindées (Sous-groupes et cours simultanés)
  group?: 'all' | 'G1' | 'G2' | string;
  groupLabel?: string;
  pairedEntryId?: string;
}

export interface TimetableState {
  subjects: Subject[];
  teachers: Teacher[];
  classes: ClassGroup[];
  timetable: TimetableEntry[];
}

export interface SchoolBreak {
  id: string;
  name: string; // ex: "Récréation", "Pause Midi"
  afterSlotIndex: number; // 0-based index of slot after which the break occurs
  duration: number; // Duration in minutes (5, 10, 15, ..., 60)
}

