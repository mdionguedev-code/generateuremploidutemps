import { Subject, Teacher, ClassGroup, TimetableEntry } from './types';

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'maths', name: 'Mathématiques' },
  { id: 'physique', name: 'Physique-Chimie' },
  { id: 'svt', name: 'SVT (Sciences de la Vie et de la Terre)' },
  { id: 'francais', name: 'Français' },
  { id: 'anglais', name: 'Anglais' },
  { id: 'histoire-geo', name: 'Histoire-Géographie' },
  { id: 'eps', name: 'EPS (Sport)' },
];

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 't-diongue',
    name: 'M. Diongue',
    subjectIds: ['maths'],
    weeklyQuota: 18,
    color: '#3b82f6', // Bright Blue
    unavailability: [
      { day: 'Samedi', slotIndex: 4 },
      { day: 'Samedi', slotIndex: 5 },
      { day: 'Mercredi', slotIndex: 6 },
      { day: 'Mercredi', slotIndex: 7 },
    ],
  },
  {
    id: 't-sow',
    name: 'Mme. Sow',
    subjectIds: ['physique'],
    weeklyQuota: 16,
    color: '#ec4899', // Pink
    unavailability: [
      { day: 'Mardi', slotIndex: 0 },
      { day: 'Mardi', slotIndex: 1 },
    ],
  },
  {
    id: 't-ndiaye',
    name: 'Mme. Ndiaye',
    subjectIds: ['anglais'],
    weeklyQuota: 12,
    color: '#10b981', // Emerald Green
    unavailability: [
      { day: 'Lundi', slotIndex: 8 },
      { day: 'Lundi', slotIndex: 9 },
    ],
  },
  {
    id: 't-sy',
    name: 'M. Sy',
    subjectIds: ['svt'],
    weeklyQuota: 14,
    color: '#8b5cf6', // Violet
    unavailability: [],
  },
  {
    id: 't-diagne',
    name: 'M. Diagne',
    subjectIds: ['francais', 'histoire-geo'],
    weeklyQuota: 20,
    color: '#f59e0b', // Amber/Orange
    unavailability: [
      { day: 'Jeudi', slotIndex: 6 },
      { day: 'Jeudi', slotIndex: 7 },
    ],
  },
];

export const INITIAL_CLASSES: ClassGroup[] = [
  {
    id: 'c-6eme',
    name: '6ème A',
    assignments: [
      { teacherId: 't-diongue', subjectId: 'maths', hoursPerWeek: 4 },
      { teacherId: 't-ndiaye', subjectId: 'anglais', hoursPerWeek: 3 },
      { teacherId: 't-diagne', subjectId: 'francais', hoursPerWeek: 4 },
      { teacherId: 't-sy', subjectId: 'svt', hoursPerWeek: 2 },
    ],
    unavailability: [
      { day: 'Mercredi', slotIndex: 8 },
      { day: 'Mercredi', slotIndex: 9 },
    ],
  },
  {
    id: 'c-3eme',
    name: '3ème S',
    assignments: [
      { teacherId: 't-diongue', subjectId: 'maths', hoursPerWeek: 5 },
      { teacherId: 't-sow', subjectId: 'physique', hoursPerWeek: 4 },
      { teacherId: 't-sy', subjectId: 'svt', hoursPerWeek: 3 },
      { teacherId: 't-ndiaye', subjectId: 'anglais', hoursPerWeek: 2 },
    ],
    unavailability: [
      { day: 'Samedi', slotIndex: 6 },
      { day: 'Samedi', slotIndex: 7 },
      { day: 'Samedi', slotIndex: 8 },
      { day: 'Samedi', slotIndex: 9 },
    ],
  },
  {
    id: 'c-terminale',
    name: 'Terminale S1',
    assignments: [
      { teacherId: 't-diongue', subjectId: 'maths', hoursPerWeek: 6 },
      { teacherId: 't-sow', subjectId: 'physique', hoursPerWeek: 6 },
      { teacherId: 't-sy', subjectId: 'svt', hoursPerWeek: 4 },
      { teacherId: 't-diagne', subjectId: 'histoire-geo', hoursPerWeek: 2 },
    ],
    unavailability: [],
  },
];
