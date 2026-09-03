import { Subject, Teacher, ClassGroup, DayTimeSlot, TimetableEntry, ClassAssignment } from './types';

export interface SolverResult {
  timetable: TimetableEntry[];
  unscheduled: {
    classId: string;
    teacherId: string;
    subjectId: string;
    hours: number;
    reason: string;
    group?: string;
  }[];
  isFullyScheduled: boolean;
  score: number; // Quality score of the solution
}

export interface SingleSession {
  type: 'single';
  id: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  size: number; // 2 for 2-hour blocks, 1 for 1-hour blocks
  fixedDay?: string;
  fixedStartSlot?: number;
  group?: 'all' | 'G1' | 'G2' | string;
  groupLabel?: string;
}

export interface PairedSession {
  type: 'paired';
  id: string;
  classId: string;
  pairedGroupId: string;
  size: number;
  fixedDay?: string;
  fixedStartSlot?: number;
  session1: {
    teacherId: string;
    subjectId: string;
    group?: 'G1' | string;
    groupLabel?: string;
  };
  session2: {
    teacherId: string;
    subjectId: string;
    group?: 'G2' | string;
    groupLabel?: string;
  };
}

export type SolverSession = SingleSession | PairedSession;

export const DEFAULT_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DEFAULT_TOTAL_SLOTS = 10; // 0: 8h-9h to 9: 17h-18h
export const TOTAL_SLOTS = DEFAULT_TOTAL_SLOTS;

const DAY_INDEX: Record<string, number> = {
  "Lundi": 0,
  "Mardi": 1,
  "Mercredi": 2,
  "Jeudi": 3,
  "Vendredi": 4,
  "Samedi": 5,
};

// Check if a time slot is marked unavailable
function isUnavailable(unavailability: DayTimeSlot[], day: string, slotIndex: number): boolean {
  return unavailability.some(u => u.day === day && u.slotIndex === slotIndex);
}

// Helper to sort candidate days to optimize spacing across the week (e.g. Lundi, Mercredi, Vendredi)
function getSortedCandidateDays(
  assignedDays: string[],
  allDays: string[] = DEFAULT_DAYS,
  classId?: string,
  busyClasses?: Record<string, Record<string, boolean[]>>,
  isSingleHourSession?: boolean
): string[] {
  const hasExistingClassOnDay = (d: string) => {
    if (!classId || !busyClasses || !busyClasses[classId] || !busyClasses[classId][d]) return false;
    return busyClasses[classId][d].some(Boolean);
  };

  if (!assignedDays || assignedDays.length === 0) {
    // Shuffle copy of allDays to vary initial day distribution on each generation click
    const shuffled = [...allDays];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // For 1-hour sessions, prioritize days that already have courses so they chain contiguously
    if (isSingleHourSession && classId && busyClasses) {
      shuffled.sort((dA, dB) => {
        const hasA = hasExistingClassOnDay(dA) ? 1 : 0;
        const hasB = hasExistingClassOnDay(dB) ? 1 : 0;
        if (hasA !== hasB) {
          return hasB - hasA; // Days with existing classes first
        }
        return 0;
      });
    }

    return shuffled;
  }

  // Calculate minimum distance to already assigned days for this class & subject
  return [...allDays].sort((dayA, dayB) => {
    const idxA = DAY_INDEX[dayA] !== undefined ? DAY_INDEX[dayA] : allDays.indexOf(dayA);
    const idxB = DAY_INDEX[dayB] !== undefined ? DAY_INDEX[dayB] : allDays.indexOf(dayB);

    const minDistA = Math.min(...assignedDays.map(d => Math.abs(idxA - (DAY_INDEX[d] !== undefined ? DAY_INDEX[d] : allDays.indexOf(d)))));
    const minDistB = Math.min(...assignedDays.map(d => Math.abs(idxB - (DAY_INDEX[d] !== undefined ? DAY_INDEX[d] : allDays.indexOf(d)))));

    // If both have good spacing (>=2), prefer larger gap or randomized tie-break
    if (minDistA >= 2 && minDistB >= 2) {
      if (minDistA !== minDistB) {
        return minDistB - minDistA; // Larger gap first
      }
      if (isSingleHourSession && classId && busyClasses) {
        const hasA = hasExistingClassOnDay(dayA) ? 1 : 0;
        const hasB = hasExistingClassOnDay(dayB) ? 1 : 0;
        if (hasA !== hasB) return hasB - hasA;
      }
      return Math.random() - 0.5;
    }

    // Larger distance first
    if (minDistA !== minDistB) {
      return minDistB - minDistA;
    }

    if (isSingleHourSession && classId && busyClasses) {
      const hasA = hasExistingClassOnDay(dayA) ? 1 : 0;
      const hasB = hasExistingClassOnDay(dayB) ? 1 : 0;
      if (hasA !== hasB) return hasB - hasA;
    }

    return Math.random() - 0.5;
  });
}

export function isMathSubject(subjectId: string, subjects: Subject[]): boolean {
  const s = subjects.find(x => x.id === subjectId);
  if (!s) return false;
  const name = s.name.toLowerCase();
  return name.includes('math') || name.includes('algèbre') || name.includes('algebre') || name.includes('géométrie') || name.includes('geometrie');
}

export function isFrenchSubject(subjectId: string, subjects: Subject[]): boolean {
  const s = subjects.find(x => x.id === subjectId);
  if (!s) return false;
  const name = s.name.toLowerCase();
  return name.includes('français') || name.includes('francais') || name.includes('fr ') || name === 'fr' || name.includes('lettres') || name.includes('littérature') || name.includes('litterature');
}

export function isTargetMorningSubject(subjectId: string, subjects: Subject[]): boolean {
  return isMathSubject(subjectId, subjects) || isFrenchSubject(subjectId, subjects);
}

export function generateTimetable(
  subjects: Subject[],
  teachers: Teacher[],
  classes: ClassGroup[],
  customDays?: string[],
  customTotalSlots?: number
): SolverResult {
  const DAYS = (customDays && customDays.length > 0) ? customDays : DEFAULT_DAYS;
  const TOTAL_SLOTS = (customTotalSlots && customTotalSlots > 0) ? customTotalSlots : DEFAULT_TOTAL_SLOTS;

  // 1. Deconstruct weekly assignments into sessions:
  // Supports Classes Scindées (Paired Sessions for synchronized groups & Single Sessions for regular/autonomous hours)
  const sessions: SolverSession[] = [];
  let sessionIdCounter = 0;

  for (const c of classes) {
    const assignments = c.assignments || [];
    const processedAssignmentIds = new Set<string>();

    // Process paired assignments (Classes Scindées)
    const pairedGroupsMap: Record<string, ClassAssignment[]> = {};
    for (const a of assignments) {
      if (a.pairedGroupId) {
        if (!pairedGroupsMap[a.pairedGroupId]) pairedGroupsMap[a.pairedGroupId] = [];
        pairedGroupsMap[a.pairedGroupId].push(a);
      }
    }

    for (const [pairId, pairAssocs] of Object.entries(pairedGroupsMap)) {
      if (pairAssocs.length >= 2) {
        const a1 = pairAssocs[0];
        const a2 = pairAssocs[1];
        pairAssocs.forEach((a, idx) => processedAssignmentIds.add(a.id || `${a.teacherId}-${a.subjectId}-${idx}`));

        const h1 = Math.max(0, Math.floor(a1.hoursPerWeek || 0));
        const h2 = Math.max(0, Math.floor(a2.hoursPerWeek || 0));
        const targetSync = a1.syncHours !== undefined && a1.syncHours !== null ? a1.syncHours : (a2.syncHours !== undefined && a2.syncHours !== null ? a2.syncHours : Math.min(h1, h2));
        const syncHours = Math.max(0, Math.min(targetSync, h1, h2));

        // Generate paired synchronized blocks
        let remainingSync = syncHours;
        let isFirstPair = true;
        while (remainingSync > 0) {
          const size = remainingSync >= 2 ? 2 : 1;
          sessions.push({
            type: 'paired',
            id: `session-pair-${sessionIdCounter++}`,
            classId: c.id,
            pairedGroupId: pairId,
            size,
            fixedDay: isFirstPair && (a1.fixedDay || a2.fixedDay) ? String(a1.fixedDay || a2.fixedDay).trim() : undefined,
            fixedStartSlot: isFirstPair && (a1.fixedStartSlot !== undefined || a2.fixedStartSlot !== undefined)
              ? Number(a1.fixedStartSlot !== undefined ? a1.fixedStartSlot : a2.fixedStartSlot)
              : undefined,
            session1: {
              teacherId: a1.teacherId,
              subjectId: a1.subjectId,
              group: (a1.group as any) || 'G1',
              groupLabel: a1.groupLabel || 'Groupe A',
            },
            session2: {
              teacherId: a2.teacherId,
              subjectId: a2.subjectId,
              group: (a2.group as any) || 'G2',
              groupLabel: a2.groupLabel || 'Groupe B',
            }
          });
          isFirstPair = false;
          remainingSync -= size;
        }

        // Generate remaining autonomous single sessions for a1
        let remainingA1 = h1 - syncHours;
        while (remainingA1 > 0) {
          const size = remainingA1 >= 2 ? 2 : 1;
          sessions.push({
            type: 'single',
            id: `session-${sessionIdCounter++}`,
            classId: c.id,
            teacherId: a1.teacherId,
            subjectId: a1.subjectId,
            size,
            group: (a1.group as any) || 'G1',
            groupLabel: a1.groupLabel || 'Groupe A',
          });
          remainingA1 -= size;
        }

        // Generate remaining autonomous single sessions for a2
        let remainingA2 = h2 - syncHours;
        while (remainingA2 > 0) {
          const size = remainingA2 >= 2 ? 2 : 1;
          sessions.push({
            type: 'single',
            id: `session-${sessionIdCounter++}`,
            classId: c.id,
            teacherId: a2.teacherId,
            subjectId: a2.subjectId,
            size,
            group: (a2.group as any) || 'G2',
            groupLabel: a2.groupLabel || 'Groupe B',
          });
          remainingA2 -= size;
        }
      }
    }

    // Process regular (unpaired) assignments
    for (let idx = 0; idx < assignments.length; idx++) {
      const assoc = assignments[idx];
      const assocKey = assoc.id || `${assoc.teacherId}-${assoc.subjectId}-${idx}`;
      if (processedAssignmentIds.has(assocKey) || assoc.pairedGroupId) continue;

      let remainingHours = Math.max(0, Math.floor(assoc.hoursPerWeek || 0));
      let isFirstSession = true;

      while (remainingHours > 0) {
        const size = remainingHours >= 2 ? 2 : 1;
        sessions.push({
          type: 'single',
          id: `session-${sessionIdCounter++}`,
          classId: c.id,
          teacherId: assoc.teacherId,
          subjectId: assoc.subjectId,
          size,
          fixedDay: isFirstSession && assoc.fixedDay ? String(assoc.fixedDay).trim() : undefined,
          fixedStartSlot: isFirstSession && assoc.fixedStartSlot !== undefined && assoc.fixedStartSlot !== null && String(assoc.fixedStartSlot).trim() !== '' ? Number(assoc.fixedStartSlot) : undefined,
          group: assoc.group || 'all',
          groupLabel: assoc.groupLabel || undefined,
        });
        isFirstSession = false;
        remainingHours -= size;
      }
    }
  }

  const timetable: TimetableEntry[] = [];
  let entryIdCounter = 0;
  const unscheduledSummary: SolverResult["unscheduled"] = [];

  // Track busy slots
  const busyTeachers: Record<string, Record<string, boolean[]>> = {};
  const busyClasses: Record<string, Record<string, boolean[]>> = {};

  for (const t of teachers) {
    busyTeachers[t.id] = {};
    for (const d of DAYS) {
      busyTeachers[t.id][d] = new Array(TOTAL_SLOTS).fill(false);
      for (const un of t.unavailability || []) {
        if (un.day === d) {
          busyTeachers[t.id][d][un.slotIndex] = true;
        }
      }
    }
  }

  for (const c of classes) {
    busyClasses[c.id] = {};
    for (const d of DAYS) {
      busyClasses[c.id][d] = new Array(TOTAL_SLOTS).fill(false);
      for (const un of c.unavailability || []) {
        if (un.day === d) {
          busyClasses[c.id][d][un.slotIndex] = true;
        }
      }
    }
  }

  const classSubjectDays: Record<string, Record<string, string[]>> = {};
  const classSubjectStartSlots: Record<string, Record<string, number[]>> = {};

  for (const c of classes) {
    classSubjectDays[c.id] = {};
    classSubjectStartSlots[c.id] = {};
    const assignments = c.assignments || [];
    for (const a of assignments) {
      classSubjectDays[c.id][a.subjectId] = [];
      classSubjectStartSlots[c.id][a.subjectId] = [];
    }
  }

  // 2. Pre-allocation of Fixed Sessions (Fixed Days / Slots)
  const fixedSessions = sessions.filter(s => s.fixedDay && s.fixedStartSlot !== undefined && !isNaN(s.fixedStartSlot));
  const dynamicSessions = sessions.filter(s => !s.fixedDay || s.fixedStartSlot === undefined || isNaN(s.fixedStartSlot));

  for (const fs of fixedSessions) {
    const { classId, size, fixedDay, fixedStartSlot } = fs;
    const day = String(fixedDay).trim();
    const startSlot = Number(fixedStartSlot);

    if (fs.type === 'paired') {
      const { session1, session2 } = fs;
      let canPlace = true;
      let conflictReason = '';

      for (let i = 0; i < size; i++) {
        const slot = startSlot + i;
        if (slot >= TOTAL_SLOTS) {
          canPlace = false;
          conflictReason = `Le créneau imposé dépasse les heures d'ouverture (${slot + 8}h >= ${TOTAL_SLOTS + 8}h).`;
          break;
        }
        if (busyTeachers[session1.teacherId]?.[day]?.[slot] || busyTeachers[session2.teacherId]?.[day]?.[slot]) {
          canPlace = false;
          conflictReason = `Conflit enseignant pour le cours scindé à ${day} ${slot + 8}h.`;
          break;
        }
        if (busyClasses[classId]?.[day]?.[slot]) {
          canPlace = false;
          conflictReason = `La classe est déjà occupée le ${day} à ${slot + 8}h.`;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < size; i++) {
          const slot = Number(startSlot + i);
          busyTeachers[session1.teacherId][day][slot] = true;
          busyTeachers[session2.teacherId][day][slot] = true;
          busyClasses[classId][day][slot] = true;

          const id1 = `entry-${entryIdCounter++}`;
          const id2 = `entry-${entryIdCounter++}`;

          timetable.push({
            id: id1,
            classId,
            teacherId: session1.teacherId,
            subjectId: session1.subjectId,
            day,
            slotIndex: slot,
            group: session1.group,
            groupLabel: session1.groupLabel,
            pairedEntryId: id2,
          });

          timetable.push({
            id: id2,
            classId,
            teacherId: session2.teacherId,
            subjectId: session2.subjectId,
            day,
            slotIndex: slot,
            group: session2.group,
            groupLabel: session2.groupLabel,
            pairedEntryId: id1,
          });
        }
        if (!classSubjectDays[classId][session1.subjectId]) classSubjectDays[classId][session1.subjectId] = [];
        classSubjectDays[classId][session1.subjectId].push(day);
        if (!classSubjectDays[classId][session2.subjectId]) classSubjectDays[classId][session2.subjectId] = [];
        classSubjectDays[classId][session2.subjectId].push(day);
      } else {
        unscheduledSummary.push({
          classId,
          teacherId: session1.teacherId,
          subjectId: session1.subjectId,
          hours: size,
          reason: conflictReason,
          group: session1.group,
        });
      }
    } else {
      const { teacherId, subjectId, group, groupLabel } = fs;
      let canPlace = true;
      let conflictReason = '';
      for (let i = 0; i < size; i++) {
        const slot = startSlot + i;
        if (slot >= TOTAL_SLOTS) {
          canPlace = false;
          conflictReason = `Le créneau imposé dépasse les heures d'ouverture (${slot + 8}h >= ${TOTAL_SLOTS + 8}h).`;
          break;
        }
        if (busyTeachers[teacherId]?.[day]?.[slot]) {
          canPlace = false;
          const tName = teachers.find(t => t.id === teacherId)?.name || 'Le professeur';
          conflictReason = `Conflit créneau imposé : ${tName} est déjà occupé(e) le ${day} à ${slot + 8}h.`;
          break;
        }
        if (busyClasses[classId]?.[day]?.[slot]) {
          canPlace = false;
          conflictReason = `La classe a déjà un cours le ${day} à ${slot + 8}h.`;
          break;
        }
      }

      if (canPlace) {
        for (let i = 0; i < size; i++) {
          const slot = Number(startSlot + i);
          busyTeachers[teacherId][day][slot] = true;
          busyClasses[classId][day][slot] = true;
          timetable.push({
            id: `entry-${entryIdCounter++}`,
            classId,
            teacherId,
            subjectId,
            day,
            slotIndex: slot,
            group,
            groupLabel,
          });
        }
        if (!classSubjectDays[classId][subjectId]) classSubjectDays[classId][subjectId] = [];
        classSubjectDays[classId][subjectId].push(day);
        if (!classSubjectStartSlots[classId][subjectId]) classSubjectStartSlots[classId][subjectId] = [];
        classSubjectStartSlots[classId][subjectId].push(startSlot);
      } else {
        unscheduledSummary.push({
          classId,
          teacherId,
          subjectId,
          hours: size,
          reason: conflictReason || `Conflit ou indisponibilité sur le créneau imposé (${day} à ${startSlot + 8}h).`,
          group,
        });
      }
    }
  }

  // 3. Sort dynamic sessions by difficulty using MRV (Minimum Remaining Values)
  const getTeacherDifficulty = (teacherId: string) => {
    const t = teachers.find(x => x.id === teacherId);
    if (!t) return 0;
    const unavCount = (t.unavailability || []).length;
    const freeSlotsCount = (DAYS.length * TOTAL_SLOTS) - unavCount;
    return ((t.weeklyQuota || 0) * 10) / (freeSlotsCount || 1);
  };

  const getClassDifficulty = (classId: string) => {
    const c = classes.find(x => x.id === classId);
    if (!c) return 0;
    const unavCount = (c.unavailability || []).length;
    const freeSlotsCount = (DAYS.length * TOTAL_SLOTS) - unavCount;
    const totalWeeklyHours = (c.assignments || []).reduce((sum, a) => sum + (a.hoursPerWeek || 0), 0);
    return (totalWeeklyHours * 10) / (freeSlotsCount || 1);
  };

  dynamicSessions.sort((a, b) => {
    // Paired sessions are harder to satisfy (need 2 teachers simultaneously free) -> prioritize first!
    const isPairedA = a.type === 'paired' ? 50 : 0;
    const isPairedB = b.type === 'paired' ? 50 : 0;

    const subjectA = a.type === 'paired' ? a.session1.subjectId : a.subjectId;
    const subjectB = b.type === 'paired' ? b.session1.subjectId : b.subjectId;

    const teacherA = a.type === 'paired' ? a.session1.teacherId : a.teacherId;
    const teacherB = b.type === 'paired' ? b.session1.teacherId : b.teacherId;

    const isMorningA = isMathSubject(subjectA, subjects) ? 30 : isFrenchSubject(subjectA, subjects) ? 20 : 0;
    const isMorningB = isMathSubject(subjectB, subjects) ? 30 : isFrenchSubject(subjectB, subjects) ? 20 : 0;

    const scoreA = getTeacherDifficulty(teacherA) + getClassDifficulty(a.classId) + (a.size === 2 ? 10 : 0) + isMorningA + isPairedA;
    const scoreB = getTeacherDifficulty(teacherB) + getClassDifficulty(b.classId) + (b.size === 2 ? 10 : 0) + isMorningB + isPairedB;
    if (Math.abs(scoreB - scoreA) > 1e-4) {
      return scoreB - scoreA;
    }
    return Math.random() - 0.5;
  });

  // 4. Backtracking Search Function
  let backtrackingSteps = 0;
  const MAX_STEPS = 9000;

  function getSortedCandidateSlots(
    classId: string,
    subjectId: string,
    day: string,
    size: number
  ): number[] {
    const candidateSlots: number[] = [];
    for (let s = 0; s <= TOTAL_SLOTS - size; s++) {
      candidateSlots.push(s);
    }

    const usedStartSlots = classSubjectStartSlots[classId]?.[subjectId] || [];
    const countAtSlot0 = usedStartSlots.filter(s => s === 0).length;
    const isMorningTarget = isTargetMorningSubject(subjectId, subjects);

    const classDayBusySlots: number[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      if (busyClasses[classId]?.[day]?.[i]) {
        classDayBusySlots.push(i);
      }
    }
    const hasExistingClassOnDay = classDayBusySlots.length > 0;

    candidateSlots.sort((sA, sB) => {
      const computeSlotScore = (slot: number): number => {
        let score = 0;

        if (isMorningTarget) {
          if (countAtSlot0 < 2) {
            if (slot === 0) score -= 200;
          } else {
            if (slot === 0) score += 80;
          }
        }

        if (usedStartSlots.includes(slot)) {
          if (!(isMorningTarget && countAtSlot0 < 2 && slot === 0)) {
            score += 100;
          }
        }

        if (usedStartSlots.some(u => Math.abs(u - slot) === 1)) {
          score += 30;
        }

        if (usedStartSlots.length > 0) {
          const hasMorning = usedStartSlots.some(u => u < 5);
          const hasAfternoon = usedStartSlots.some(u => u >= 5);
          if (hasMorning && !hasAfternoon && slot >= 5) score -= 20;
          if (hasAfternoon && !hasMorning && slot < 5) score -= 20;
        }

        const hasLeftNeighbour = slot > 0 && !!busyClasses[classId]?.[day]?.[slot - 1];
        const hasRightNeighbour = slot + size < TOTAL_SLOTS && !!busyClasses[classId]?.[day]?.[slot + size];

        if (hasLeftNeighbour && hasRightNeighbour) {
          score -= (size === 1 ? 160 : 120);
        } else if (hasLeftNeighbour || hasRightNeighbour) {
          score -= (size === 1 ? 95 : 65);
        } else if (hasExistingClassOnDay) {
          const minExisting = Math.min(...classDayBusySlots);
          const maxExisting = Math.max(...classDayBusySlots);

          if (slot > minExisting && slot < maxExisting) {
            score += (size === 1 ? 90 : 60);
          } else {
            const distance = slot < minExisting ? (minExisting - (slot + size)) : (slot - (maxExisting + 1));
            if (distance === 1 || distance === 2) {
              score += (size === 1 ? 80 : 50);
            } else {
              score += 30;
            }
          }
        } else {
          if (size === 1) score += 70;
        }

        score += slot * 2;
        return score;
      };

      const scoreA = computeSlotScore(sA);
      const scoreB = computeSlotScore(sB);
      if (Math.abs(scoreA - scoreB) > 5) return scoreA - scoreB;
      return Math.random() - 0.5;
    });

    return candidateSlots;
  }

  function solve(sessionIndex: number): boolean {
    backtrackingSteps++;
    if (backtrackingSteps > MAX_STEPS) {
      return false; // Soft fallback
    }

    if (sessionIndex >= dynamicSessions.length) {
      return true; // Scheduled all
    }

    const session = dynamicSessions[sessionIndex];

    if (session.type === 'paired') {
      const { classId, size, session1, session2 } = session;
      const assignedDays1 = classSubjectDays[classId]?.[session1.subjectId] || [];
      const assignedDays2 = classSubjectDays[classId]?.[session2.subjectId] || [];
      const candidateDays = getSortedCandidateDays([...new Set([...assignedDays1, ...assignedDays2])], DAYS, classId, busyClasses, size === 1);

      for (const day of candidateDays) {
        if (assignedDays1.includes(day) || assignedDays2.includes(day)) continue;

        const candidateSlots = getSortedCandidateSlots(classId, session1.subjectId, day, size);

        for (const s of candidateSlots) {
          let ok = true;
          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            if (
              busyTeachers[session1.teacherId]?.[day]?.[currentSlot] ||
              busyTeachers[session2.teacherId]?.[day]?.[currentSlot] ||
              busyClasses[classId]?.[day]?.[currentSlot]
            ) {
              ok = false;
              break;
            }
          }

          if (!ok) continue;

          // Place Paired Session
          const addedEntryIds: string[] = [];
          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            busyTeachers[session1.teacherId][day][currentSlot] = true;
            busyTeachers[session2.teacherId][day][currentSlot] = true;
            busyClasses[classId][day][currentSlot] = true;

            const id1 = `entry-${entryIdCounter++}`;
            const id2 = `entry-${entryIdCounter++}`;
            addedEntryIds.push(id1, id2);

            timetable.push({
              id: id1,
              classId,
              teacherId: session1.teacherId,
              subjectId: session1.subjectId,
              day,
              slotIndex: currentSlot,
              group: session1.group,
              groupLabel: session1.groupLabel,
              pairedEntryId: id2,
            });

            timetable.push({
              id: id2,
              classId,
              teacherId: session2.teacherId,
              subjectId: session2.subjectId,
              day,
              slotIndex: currentSlot,
              group: session2.group,
              groupLabel: session2.groupLabel,
              pairedEntryId: id1,
            });
          }

          if (!classSubjectDays[classId][session1.subjectId]) classSubjectDays[classId][session1.subjectId] = [];
          classSubjectDays[classId][session1.subjectId].push(day);
          if (!classSubjectDays[classId][session2.subjectId]) classSubjectDays[classId][session2.subjectId] = [];
          classSubjectDays[classId][session2.subjectId].push(day);

          if (!classSubjectStartSlots[classId][session1.subjectId]) classSubjectStartSlots[classId][session1.subjectId] = [];
          classSubjectStartSlots[classId][session1.subjectId].push(s);
          if (!classSubjectStartSlots[classId][session2.subjectId]) classSubjectStartSlots[classId][session2.subjectId] = [];
          classSubjectStartSlots[classId][session2.subjectId].push(s);

          if (solve(sessionIndex + 1)) return true;

          // Backtrack
          const d1 = classSubjectDays[classId][session1.subjectId].indexOf(day);
          if (d1 !== -1) classSubjectDays[classId][session1.subjectId].splice(d1, 1);
          const d2 = classSubjectDays[classId][session2.subjectId].indexOf(day);
          if (d2 !== -1) classSubjectDays[classId][session2.subjectId].splice(d2, 1);

          const sl1 = classSubjectStartSlots[classId][session1.subjectId].indexOf(s);
          if (sl1 !== -1) classSubjectStartSlots[classId][session1.subjectId].splice(sl1, 1);
          const sl2 = classSubjectStartSlots[classId][session2.subjectId].indexOf(s);
          if (sl2 !== -1) classSubjectStartSlots[classId][session2.subjectId].splice(sl2, 1);

          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            if (busyTeachers[session1.teacherId]?.[day]) busyTeachers[session1.teacherId][day][currentSlot] = false;
            if (busyTeachers[session2.teacherId]?.[day]) busyTeachers[session2.teacherId][day][currentSlot] = false;
            if (busyClasses[classId]?.[day]) busyClasses[classId][day][currentSlot] = false;
          }

          for (const id of addedEntryIds) {
            const idx = timetable.findIndex(e => e.id === id);
            if (idx !== -1) timetable.splice(idx, 1);
          }
        }
      }

      return false;
    } else {
      // Single Session placement
      const { classId, teacherId, subjectId, size, group, groupLabel } = session;
      const assignedDays = classSubjectDays[classId]?.[subjectId] || [];
      const candidateDays = getSortedCandidateDays(assignedDays, DAYS, classId, busyClasses, size === 1);

      for (const day of candidateDays) {
        if (assignedDays.includes(day)) continue;

        const candidateSlots = getSortedCandidateSlots(classId, subjectId, day, size);

        for (const s of candidateSlots) {
          let ok = true;
          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            if (busyTeachers[teacherId]?.[day]?.[currentSlot] || busyClasses[classId]?.[day]?.[currentSlot]) {
              ok = false;
              break;
            }
          }

          if (!ok) continue;

          // Rule 2: Strict exclusion of adjacent identical subject
          if (s > 0) {
            const prevEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s - 1);
            if (prevEntry && prevEntry.subjectId === subjectId) continue;
          }
          if (s + size < TOTAL_SLOTS) {
            const nextEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s + size);
            if (nextEntry && nextEntry.subjectId === subjectId) continue;
          }

          // Apply placement
          const addedEntryIds: string[] = [];
          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            busyTeachers[teacherId][day][currentSlot] = true;
            busyClasses[classId][day][currentSlot] = true;
            const newId = `entry-${entryIdCounter++}`;
            addedEntryIds.push(newId);
            timetable.push({
              id: newId,
              classId,
              teacherId,
              subjectId,
              day,
              slotIndex: currentSlot,
              group,
              groupLabel,
            });
          }

          if (!classSubjectDays[classId][subjectId]) classSubjectDays[classId][subjectId] = [];
          classSubjectDays[classId][subjectId].push(day);

          if (!classSubjectStartSlots[classId][subjectId]) classSubjectStartSlots[classId][subjectId] = [];
          classSubjectStartSlots[classId][subjectId].push(s);

          if (solve(sessionIndex + 1)) return true;

          // Backtrack
          const dayIdx = classSubjectDays[classId][subjectId].indexOf(day);
          if (dayIdx !== -1) classSubjectDays[classId][subjectId].splice(dayIdx, 1);

          const slotIdx = classSubjectStartSlots[classId][subjectId].indexOf(s);
          if (slotIdx !== -1) classSubjectStartSlots[classId][subjectId].splice(slotIdx, 1);

          for (let i = 0; i < size; i++) {
            const currentSlot = s + i;
            if (busyTeachers[teacherId]?.[day]) busyTeachers[teacherId][day][currentSlot] = false;
            if (busyClasses[classId]?.[day]) busyClasses[classId][day][currentSlot] = false;
          }

          for (const id of addedEntryIds) {
            const idx = timetable.findIndex(e => e.id === id);
            if (idx !== -1) timetable.splice(idx, 1);
          }
        }
      }

      return false;
    }
  }

  // 5. Run Backtracking
  const success = solve(0);

  // 6. Fallback Best-Effort Placement if backtracking hits limit
  if (!success) {
    timetable.length = 0;
    entryIdCounter = 0;

    // Reset trackers
    for (const t of teachers) {
      for (const d of DAYS) {
        if (busyTeachers[t.id]?.[d]) {
          busyTeachers[t.id][d].fill(false);
          for (const un of t.unavailability || []) {
            if (un.day === d) busyTeachers[t.id][d][un.slotIndex] = true;
          }
        }
      }
    }
    for (const c of classes) {
      for (const d of DAYS) {
        if (busyClasses[c.id]?.[d]) {
          busyClasses[c.id][d].fill(false);
          for (const un of c.unavailability || []) {
            if (un.day === d) busyClasses[c.id][d][un.slotIndex] = true;
          }
        }
      }
      for (const a of c.assignments || []) {
        classSubjectDays[c.id][a.subjectId] = [];
        classSubjectStartSlots[c.id][a.subjectId] = [];
      }
    }

    // Re-place fixed sessions first
    for (const fs of fixedSessions) {
      const { classId, size, fixedDay, fixedStartSlot } = fs;
      const day = String(fixedDay).trim();
      const startSlot = Number(fixedStartSlot);

      if (fs.type === 'paired') {
        const { session1, session2 } = fs;
        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const slot = startSlot + i;
          if (slot >= TOTAL_SLOTS || busyTeachers[session1.teacherId]?.[day]?.[slot] || busyTeachers[session2.teacherId]?.[day]?.[slot] || busyClasses[classId]?.[day]?.[slot]) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          for (let i = 0; i < size; i++) {
            const slot = Number(startSlot + i);
            busyTeachers[session1.teacherId][day][slot] = true;
            busyTeachers[session2.teacherId][day][slot] = true;
            busyClasses[classId][day][slot] = true;
            const id1 = `entry-${entryIdCounter++}`;
            const id2 = `entry-${entryIdCounter++}`;
            timetable.push({
              id: id1,
              classId,
              teacherId: session1.teacherId,
              subjectId: session1.subjectId,
              day,
              slotIndex: slot,
              group: session1.group,
              groupLabel: session1.groupLabel,
              pairedEntryId: id2,
            });
            timetable.push({
              id: id2,
              classId,
              teacherId: session2.teacherId,
              subjectId: session2.subjectId,
              day,
              slotIndex: slot,
              group: session2.group,
              groupLabel: session2.groupLabel,
              pairedEntryId: id1,
            });
          }
        }
      } else {
        const { teacherId, subjectId, group, groupLabel } = fs;
        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const slot = startSlot + i;
          if (slot >= TOTAL_SLOTS || busyTeachers[teacherId]?.[day]?.[slot] || busyClasses[classId]?.[day]?.[slot]) {
            canPlace = false;
            break;
          }
        }
        if (canPlace) {
          for (let i = 0; i < size; i++) {
            const slot = Number(startSlot + i);
            busyTeachers[teacherId][day][slot] = true;
            busyClasses[classId][day][slot] = true;
            timetable.push({
              id: `entry-${entryIdCounter++}`,
              classId,
              teacherId,
              subjectId,
              day,
              slotIndex: slot,
              group,
              groupLabel,
            });
          }
        }
      }
    }

    // Best-effort dynamic sessions
    for (const session of dynamicSessions) {
      let scheduled = false;

      if (session.type === 'paired') {
        const { classId, size, session1, session2 } = session;
        const assignedDays1 = classSubjectDays[classId]?.[session1.subjectId] || [];
        const assignedDays2 = classSubjectDays[classId]?.[session2.subjectId] || [];
        const candidateDays = getSortedCandidateDays([...new Set([...assignedDays1, ...assignedDays2])], DAYS, classId, busyClasses, size === 1);

        for (const day of candidateDays) {
          if (assignedDays1.includes(day) || assignedDays2.includes(day)) continue;

          const candidateSlots = getSortedCandidateSlots(classId, session1.subjectId, day, size);

          for (const s of candidateSlots) {
            let ok = true;
            for (let i = 0; i < size; i++) {
              const currentSlot = s + i;
              if (
                busyTeachers[session1.teacherId]?.[day]?.[currentSlot] ||
                busyTeachers[session2.teacherId]?.[day]?.[currentSlot] ||
                busyClasses[classId]?.[day]?.[currentSlot]
              ) {
                ok = false;
                break;
              }
            }

            if (!ok) continue;

            for (let i = 0; i < size; i++) {
              const currentSlot = s + i;
              busyTeachers[session1.teacherId][day][currentSlot] = true;
              busyTeachers[session2.teacherId][day][currentSlot] = true;
              busyClasses[classId][day][currentSlot] = true;
              const id1 = `entry-${entryIdCounter++}`;
              const id2 = `entry-${entryIdCounter++}`;

              timetable.push({
                id: id1,
                classId,
                teacherId: session1.teacherId,
                subjectId: session1.subjectId,
                day,
                slotIndex: currentSlot,
                group: session1.group,
                groupLabel: session1.groupLabel,
                pairedEntryId: id2,
              });

              timetable.push({
                id: id2,
                classId,
                teacherId: session2.teacherId,
                subjectId: session2.subjectId,
                day,
                slotIndex: currentSlot,
                group: session2.group,
                groupLabel: session2.groupLabel,
                pairedEntryId: id1,
              });
            }

            if (!classSubjectDays[classId][session1.subjectId]) classSubjectDays[classId][session1.subjectId] = [];
            classSubjectDays[classId][session1.subjectId].push(day);
            if (!classSubjectDays[classId][session2.subjectId]) classSubjectDays[classId][session2.subjectId] = [];
            classSubjectDays[classId][session2.subjectId].push(day);

            scheduled = true;
            break;
          }
          if (scheduled) break;
        }

        if (!scheduled) {
          unscheduledSummary.push({
            classId,
            teacherId: session1.teacherId,
            subjectId: session1.subjectId,
            hours: size,
            reason: "Pas de créneau compatible avec les 2 enseignants en simultané.",
            group: session1.group,
          });
        }
      } else {
        const { classId, teacherId, subjectId, size, group, groupLabel } = session;
        const assignedDays = classSubjectDays[classId]?.[subjectId] || [];
        const candidateDays = getSortedCandidateDays(assignedDays, DAYS, classId, busyClasses, size === 1);

        for (const day of candidateDays) {
          if (assignedDays.includes(day)) continue;

          const candidateSlots = getSortedCandidateSlots(classId, subjectId, day, size);

          for (const s of candidateSlots) {
            let ok = true;
            for (let i = 0; i < size; i++) {
              const currentSlot = s + i;
              if (busyTeachers[teacherId]?.[day]?.[currentSlot] || busyClasses[classId]?.[day]?.[currentSlot]) {
                ok = false;
                break;
              }
            }

            if (!ok) continue;

            if (s > 0) {
              const prevEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s - 1);
              if (prevEntry && prevEntry.subjectId === subjectId) continue;
            }
            if (s + size < TOTAL_SLOTS) {
              const nextEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s + size);
              if (nextEntry && nextEntry.subjectId === subjectId) continue;
            }

            for (let i = 0; i < size; i++) {
              const currentSlot = s + i;
              busyTeachers[teacherId][day][currentSlot] = true;
              busyClasses[classId][day][currentSlot] = true;
              timetable.push({
                id: `entry-${entryIdCounter++}`,
                classId,
                teacherId,
                subjectId,
                day,
                slotIndex: currentSlot,
                group,
                groupLabel,
              });
            }

            if (!classSubjectDays[classId][subjectId]) classSubjectDays[classId][subjectId] = [];
            classSubjectDays[classId][subjectId].push(day);

            if (!classSubjectStartSlots[classId][subjectId]) classSubjectStartSlots[classId][subjectId] = [];
            classSubjectStartSlots[classId][subjectId].push(s);

            scheduled = true;
            break;
          }
          if (scheduled) break;
        }

        if (!scheduled) {
          unscheduledSummary.push({
            classId,
            teacherId,
            subjectId,
            hours: size,
            reason: "Pas de créneau horaire compatible respectant l'espacement et les disponibilités.",
            group,
          });
        }
      }
    }
  }

  // Calculate score
  const totalTargetHours = classes.reduce(
    (sum, c) => sum + (c.assignments || []).reduce((s, a) => s + (a.hoursPerWeek || 0), 0),
    0
  );
  const scheduledHours = timetable.length;
  const score = totalTargetHours > 0 ? Math.round((scheduledHours / totalTargetHours) * 100) : 100;

  return {
    timetable,
    unscheduled: unscheduledSummary,
    isFullyScheduled: unscheduledSummary.length === 0,
    score,
  };
}

// Check manual moves for conflicts in real time to aid Drag and Drop validation
export function validateManualMove(
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  entryToMove: TimetableEntry,
  targetDay: string,
  targetSlot: number,
  startHour: number = 8
): { isValid: boolean; reason?: string } {
  const { classId, teacherId, subjectId, pairedEntryId } = entryToMove;

  // 1. Check classroom/class custom unavailability
  const cls = classes.find(c => c.id === classId);
  if (cls && isUnavailable(cls.unavailability, targetDay, targetSlot)) {
    return { isValid: false, reason: `La classe ${cls.name} est indisponible le ${targetDay} à ${targetSlot + startHour}h.` };
  }

  // 2. Check teacher custom unavailability
  const t = teachers.find(x => x.id === teacherId);
  if (t && isUnavailable(t.unavailability, targetDay, targetSlot)) {
    return { isValid: false, reason: `Le professeur ${t.name} a marqué ce créneau comme libre/indisponible.` };
  }

  // If paired entry exists (Classes Scindées), check paired teacher unavailability as well
  if (pairedEntryId) {
    const paired = timetable.find(e => e.id === pairedEntryId);
    if (paired) {
      const tPair = teachers.find(x => x.id === paired.teacherId);
      if (tPair && isUnavailable(tPair.unavailability, targetDay, targetSlot)) {
        return { isValid: false, reason: `Le professeur ${tPair.name} (cours scindé jumeau) est indisponible le ${targetDay} à ${targetSlot + startHour}h.` };
      }
    }
  }

  // 3. Check for clashes with OTHER entries
  for (const entry of timetable) {
    if (entry.id === entryToMove.id || entry.id === pairedEntryId) continue; // ignore self and paired partner

    if (entry.day === targetDay && entry.slotIndex === targetSlot) {
      if (entry.teacherId === teacherId) {
        const busyTeacher = teachers.find(tr => tr.id === teacherId)?.name || "enseignant";
        const otherClass = classes.find(cl => cl.id === entry.classId)?.name || "autre classe";
        return {
          isValid: false,
          reason: `Conflit: ${busyTeacher} enseigne déjà en ${otherClass} sur ce créneau.`,
        };
      }

      if (pairedEntryId) {
        const paired = timetable.find(e => e.id === pairedEntryId);
        if (paired && entry.teacherId === paired.teacherId) {
          const busyTeacher = teachers.find(tr => tr.id === paired.teacherId)?.name || "enseignant";
          const otherClass = classes.find(cl => cl.id === entry.classId)?.name || "autre classe";
          return {
            isValid: false,
            reason: `Conflit: ${busyTeacher} (cours scindé) enseigne déjà en ${otherClass} sur ce créneau.`,
          };
        }
      }

      if (entry.classId === classId) {
        // If the target slot has an existing entry that is not paired with this move, it's a conflict
        const busyClass = classes.find(cl => cl.id === classId)?.name || "la classe";
        const otherSubject = teachers.find(tr => tr.id === entry.teacherId)?.name || "un autre cours";
        return {
          isValid: false,
          reason: `La classe ${busyClass} a déjà un cours avec ${otherSubject} sur ce créneau.`,
        };
      }
    }
  }

  return { isValid: true };
}
