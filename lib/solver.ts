import { Subject, Teacher, ClassGroup, DayTimeSlot, TimetableEntry, ClassAssignment } from './types';

export interface SolverResult {
  timetable: TimetableEntry[];
  unscheduled: {
    classId: string;
    teacherId: string;
    subjectId: string;
    hours: number;
    reason: string;
  }[];
  isFullyScheduled: boolean;
  score: number; // Quality score of the solution
}

interface Session {
  id: string;
  classId: string;
  teacherId: string;
  subjectId: string;
  size: number; // 2 for 2-hour blocks, 1 for 1-hour blocks
}

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
function getSortedCandidateDays(assignedDays: string[], allDays: string[] = DEFAULT_DAYS): string[] {
  if (!assignedDays || assignedDays.length === 0) {
    return [...allDays];
  }

  // Calculate minimum distance to already assigned days for this class & subject
  return [...allDays].sort((dayA, dayB) => {
    const idxA = DAY_INDEX[dayA] !== undefined ? DAY_INDEX[dayA] : allDays.indexOf(dayA);
    const idxB = DAY_INDEX[dayB] !== undefined ? DAY_INDEX[dayB] : allDays.indexOf(dayB);

    const minDistA = Math.min(...assignedDays.map(d => Math.abs(idxA - (DAY_INDEX[d] !== undefined ? DAY_INDEX[d] : allDays.indexOf(d)))));
    const minDistB = Math.min(...assignedDays.map(d => Math.abs(idxB - (DAY_INDEX[d] !== undefined ? DAY_INDEX[d] : allDays.indexOf(d)))));

    // If both have good spacing (>=2), prefer earlier days in week
    if (minDistA >= 2 && minDistB >= 2) {
      if (minDistA !== minDistB) {
        return minDistB - minDistA; // Larger gap first
      }
      return idxA - idxB;
    }

    // Larger distance first
    if (minDistA !== minDistB) {
      return minDistB - minDistA;
    }

    return idxA - idxB;
  });
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
  // Strictly max 2-hour blocks, remainder 1-hour block (e.g. 5h -> [2h, 2h, 1h])
  const sessions: Session[] = [];
  let sessionIdCounter = 0;

  for (const c of classes) {
    const assignments = c.assignments || [];
    for (const assoc of assignments) {
      let remainingHours = Math.max(0, Math.floor(assoc.hoursPerWeek || 0));

      while (remainingHours > 0) {
        if (remainingHours >= 2) {
          sessions.push({
            id: `session-${sessionIdCounter++}`,
            classId: c.id,
            teacherId: assoc.teacherId,
            subjectId: assoc.subjectId,
            size: 2,
          });
          remainingHours -= 2;
        } else {
          sessions.push({
            id: `session-${sessionIdCounter++}`,
            classId: c.id,
            teacherId: assoc.teacherId,
            subjectId: assoc.subjectId,
            size: 1,
          });
          remainingHours -= 1;
        }
      }
    }
  }

  // 2. Sort sessions by difficulty using MRV (Minimum Remaining Values / Most Constrained First)
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

  sessions.sort((a, b) => {
    // 2-hour sessions first as they require contiguous pairs
    const scoreA = getTeacherDifficulty(a.teacherId) + getClassDifficulty(a.classId) + (a.size === 2 ? 10 : 0);
    const scoreB = getTeacherDifficulty(b.teacherId) + getClassDifficulty(b.classId) + (b.size === 2 ? 10 : 0);
    return scoreB - scoreA;
  });

  const timetable: TimetableEntry[] = [];
  let entryIdCounter = 0;

  // Track busy slots to speed up checks
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

  // Track assigned days and start slots per class and subject to enforce:
  // - Max 1 session per day per subject in a class
  // - Optimal weekly spacing (e.g. Lundi - Mercredi - Vendredi)
  // - Start time variation across different days (e.g. 8h on Monday, 10h on Wednesday, 14h on Friday)
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

  // 3. Backtracking Search Function
  let backtrackingSteps = 0;
  const MAX_STEPS = 8000;

  // Helper to sort candidate slots to vary start times across days and chain with other subjects compactly
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

    candidateSlots.sort((sA, sB) => {
      // 1. Calculate time variation score (lower is better)
      let scoreA = 0;
      let scoreB = 0;

      // Heavy penalty if exact same start slot already used this week for this subject
      if (usedStartSlots.includes(sA)) scoreA += 100;
      if (usedStartSlots.includes(sB)) scoreB += 100;

      // Small penalty if adjacent/very close start time
      if (usedStartSlots.some(u => Math.abs(u - sA) === 1)) scoreA += 30;
      if (usedStartSlots.some(u => Math.abs(u - sB) === 1)) scoreB += 30;

      // Bonus for morning/afternoon diversity
      if (usedStartSlots.length > 0) {
        const hasMorning = usedStartSlots.some(u => u < 5);
        const hasAfternoon = usedStartSlots.some(u => u >= 5);
        if (hasMorning && !hasAfternoon && sA >= 5) scoreA -= 20;
        if (hasMorning && !hasAfternoon && sB >= 5) scoreB -= 20;
        if (hasAfternoon && !hasMorning && sA < 5) scoreA -= 20;
        if (hasAfternoon && !hasMorning && sB < 5) scoreB -= 20;
      }

      // Compactness bonus: chain with existing neighbouring classes of different subjects
      const hasNeighbourA = (sA > 0 && busyClasses[classId]?.[day]?.[sA - 1]) ||
                            (sA + size < TOTAL_SLOTS && busyClasses[classId]?.[day]?.[sA + size]);
      const hasNeighbourB = (sB > 0 && busyClasses[classId]?.[day]?.[sB - 1]) ||
                            (sB + size < TOTAL_SLOTS && busyClasses[classId]?.[day]?.[sB + size]);

      if (hasNeighbourA) scoreA -= 15;
      if (hasNeighbourB) scoreB -= 15;

      if (scoreA !== scoreB) {
        return scoreA - scoreB;
      }

      return sA - sB;
    });

    return candidateSlots;
  }

  function solve(sessionIndex: number): boolean {
    backtrackingSteps++;
    if (backtrackingSteps > MAX_STEPS) {
      return false; // Force quit and trigger soft fallback
    }

    if (sessionIndex >= sessions.length) {
      return true; // All scheduled!
    }

    const session = sessions[sessionIndex];
    const { classId, teacherId, subjectId, size } = session;

    const assignedDays = classSubjectDays[classId]?.[subjectId] || [];
    // Prioritize days that provide spacing (e.g. Lundi -> Mercredi -> Vendredi)
    const candidateDays = getSortedCandidateDays(assignedDays, DAYS);

    for (const day of candidateDays) {
      // Rule 1: Strictly one session per subject per day for the same class
      if (assignedDays.includes(day)) {
        continue;
      }

      // Candidate slots sorted by time variation & chaining heuristics
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

        // Rule 2: Strict exclusion of adjacent identical subject (prevents 2h + 2h becoming 4h continuous)
        if (s > 0) {
          const prevEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s - 1);
          if (prevEntry && prevEntry.subjectId === subjectId) {
            continue;
          }
        }
        if (s + size < TOTAL_SLOTS) {
          const nextEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s + size);
          if (nextEntry && nextEntry.subjectId === subjectId) {
            continue;
          }
        }

        // Apply placement
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
          });
        }
        if (!classSubjectDays[classId][subjectId]) {
          classSubjectDays[classId][subjectId] = [];
        }
        classSubjectDays[classId][subjectId].push(day);

        if (!classSubjectStartSlots[classId][subjectId]) {
          classSubjectStartSlots[classId][subjectId] = [];
        }
        classSubjectStartSlots[classId][subjectId].push(s);

        // Recurse
        if (solve(sessionIndex + 1)) {
          return true;
        }

        // Backtrack
        const dayIdx = classSubjectDays[classId][subjectId].indexOf(day);
        if (dayIdx !== -1) {
          classSubjectDays[classId][subjectId].splice(dayIdx, 1);
        }

        const slotIdx = classSubjectStartSlots[classId][subjectId].indexOf(s);
        if (slotIdx !== -1) {
          classSubjectStartSlots[classId][subjectId].splice(slotIdx, 1);
        }

        for (let i = 0; i < size; i++) {
          const currentSlot = s + i;
          if (busyTeachers[teacherId]?.[day]) busyTeachers[teacherId][day][currentSlot] = false;
          if (busyClasses[classId]?.[day]) busyClasses[classId][day][currentSlot] = false;

          const removeIdx = timetable.findIndex(
            e => e.classId === classId && e.day === day && e.slotIndex === currentSlot
          );
          if (removeIdx !== -1) {
            timetable.splice(removeIdx, 1);
          }
        }
      }
    }

    return false; // Backtrack!
  }

  // 4. Run Backtracking
  const success = solve(0);

  // 5. Fallback Best-Effort Placement if backtracking hits limit
  const unscheduledSummary: SolverResult["unscheduled"] = [];

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

    for (const session of sessions) {
      const { classId, teacherId, subjectId, size } = session;
      let scheduled = false;

      const assignedDays = classSubjectDays[classId]?.[subjectId] || [];
      const candidateDays = getSortedCandidateDays(assignedDays, DAYS);

      for (const day of candidateDays) {
        if (assignedDays.includes(day)) {
          continue; // Respect 1 session per subject per day
        }

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

          // Check no adjacent same subject
          if (s > 0) {
            const prevEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s - 1);
            if (prevEntry && prevEntry.subjectId === subjectId) continue;
          }
          if (s + size < TOTAL_SLOTS) {
            const nextEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s + size);
            if (nextEntry && nextEntry.subjectId === subjectId) continue;
          }

          // Place session
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
            });
          }
          if (!classSubjectDays[classId][subjectId]) {
            classSubjectDays[classId][subjectId] = [];
          }
          classSubjectDays[classId][subjectId].push(day);

          if (!classSubjectStartSlots[classId][subjectId]) {
            classSubjectStartSlots[classId][subjectId] = [];
          }
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
        });
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
  const { classId, teacherId, subjectId } = entryToMove;

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

  // 3. Check for clashes with OTHER entries
  for (const entry of timetable) {
    if (entry.id === entryToMove.id) continue; // ignore self

    if (entry.day === targetDay && entry.slotIndex === targetSlot) {
      if (entry.teacherId === teacherId) {
        const busyTeacher = teachers.find(tr => tr.id === teacherId)?.name || "enseignant";
        const otherClass = classes.find(cl => cl.id === entry.classId)?.name || "autre classe";
        return {
          isValid: false,
          reason: `Conflit: ${busyTeacher} enseigne déjà en ${otherClass} sur ce créneau.`,
        };
      }
      if (entry.classId === classId) {
        const busyClass = classes.find(cl => cl.id === classId)?.name || "la classe";
        const otherSubject = teachers.find(tr => tr.id === entry.teacherId)?.name || "un autre cours";
        return {
          isValid: false,
          reason: `La classe ${busyClass} a déjà un cours avec ${otherSubject} sur ce créneau.`,
        };
      }
    }
  }

  // 4. Rule: Max 1 continuous block of maximum 2 hours per subject per day for a class
  const sameDaySubjectEntries = timetable.filter(
    e => e.classId === classId && e.subjectId === subjectId && e.day === targetDay && e.id !== entryToMove.id
  );

  if (sameDaySubjectEntries.length > 0) {
    // Check if moving here would attach to an existing slot of the SAME subject
    const isAdjacent = sameDaySubjectEntries.some(e => Math.abs(e.slotIndex - targetSlot) === 1);

    if (isAdjacent) {
      // Calculate resulting continuous duration
      // If there is already 2 or more slots of this subject contiguous, adding another would exceed 2h
      const contiguousSlotsCount = sameDaySubjectEntries.length + 1;

      if (contiguousSlotsCount > 2) {
        return {
          isValid: false,
          reason: `Limite de 2h consécutives dépassée pour ce cours le ${targetDay}.`,
        };
      }
    } else {
      return {
        isValid: false,
        reason: `Ce cours est déjà enseigné séparément le ${targetDay} (un seul cours par jour autorisé).`,
      };
    }
  }

  return { isValid: true };
}
