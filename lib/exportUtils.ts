import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { TimetableEntry, ClassGroup, Teacher, Subject } from './types';

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const DEFAULT_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DEFAULT_SLOT_LABELS = [
  "08h - 09h", "09h - 10h", "10h - 11h", "11h - 12h", "12h - 13h", 
  "13h - 14h", "14h - 15h", "15h - 16h", "16h - 17h", "17h - 18h"
];

let activeExportDays = [...DEFAULT_DAYS];
let activeExportSlotLabels = [...DEFAULT_SLOT_LABELS];

export function setExportScheduleConfig(days?: string[], slotLabels?: string[]) {
  if (days && days.length > 0) activeExportDays = [...days];
  if (slotLabels && slotLabels.length > 0) activeExportSlotLabels = [...slotLabels];
}

// Helpers to get labels
const getTeacherName = (id: string, teachers: Teacher[]) => teachers.find(t => t.id === id)?.name || id;
const getSubjectName = (id: string, subjects: Subject[]) => subjects.find(s => s.id === id)?.name || id;
const getClassName = (id: string, classes: ClassGroup[]) => classes.find(c => c.id === id)?.name || id;

// Helper conversion hex vers RGB pour jsPDF
function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || '#4f46e5').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return [79, 70, 229];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

interface TimetableSpanBlock {
  startSlot: number;
  span: number;
  entry?: TimetableEntry;
  entries?: TimetableEntry[];
  isUnavailable?: boolean;
}

// Helper pour grouper les créneaux consécutifs pour une classe (cours de 2h unifiés et gestion Classes Scindées)
function getDayBlocksForClass(
  classId: string,
  day: string,
  slotLabels: string[],
  timetable: TimetableEntry[],
  cls: ClassGroup,
  schoolBreaks: any[] = []
): TimetableSpanBlock[] {
  const blocks: TimetableSpanBlock[] = [];
  let s = 0;

  while (s < slotLabels.length) {
    const matchingEntries = timetable.filter(e => e.classId === classId && e.day === day && e.slotIndex === s);
    const isUn = (cls.unavailability || []).some(u => u.day === day && u.slotIndex === s);

    if (matchingEntries.length > 1) {
      // Classes Scindées: multi-groupes simultanés sur ce créneau
      blocks.push({ startSlot: s, span: 1, entries: matchingEntries, isUnavailable: false });
      s += 1;
    } else if (matchingEntries.length === 1) {
      const entry = matchingEntries[0];
      let span = 1;
      while (s + span < slotLabels.length) {
        const nextMatching = timetable.filter(e => e.classId === classId && e.day === day && e.slotIndex === s + span);
        if (
          nextMatching.length === 1 &&
          nextMatching[0].subjectId === entry.subjectId &&
          nextMatching[0].teacherId === entry.teacherId &&
          nextMatching[0].group === entry.group
        ) {
          const hasBreak = schoolBreaks.some(b => b.afterSlotIndex === s + span - 1);
          if (hasBreak) {
            break;
          }
          span++;
        } else {
          break;
        }
      }
      blocks.push({ startSlot: s, span, entry, isUnavailable: false });
      s += span;
    } else if (isUn) {
      let span = 1;
      while (s + span < slotLabels.length) {
        const nextUn = (cls.unavailability || []).some(u => u.day === day && u.slotIndex === s + span);
        const nextEntries = timetable.filter(e => e.classId === classId && e.day === day && e.slotIndex === s + span);
        if (nextUn && nextEntries.length === 0) {
          const hasBreak = schoolBreaks.some(b => b.afterSlotIndex === s + span - 1);
          if (hasBreak) {
            break;
          }
          span++;
        } else {
          break;
        }
      }
      blocks.push({ startSlot: s, span, isUnavailable: true });
      s += span;
    } else {
      blocks.push({ startSlot: s, span: 1, isUnavailable: false });
      s += 1;
    }
  }

  return blocks;
}

// Helper pour grouper les créneaux consécutifs pour un enseignant (cours de 2h unifiés)
function getDayBlocksForTeacher(
  teacherId: string,
  day: string,
  slotLabels: string[],
  timetable: TimetableEntry[],
  teacher: Teacher
): TimetableSpanBlock[] {
  const blocks: TimetableSpanBlock[] = [];
  let s = 0;

  while (s < slotLabels.length) {
    const entry = timetable.find(e => e.teacherId === teacherId && e.day === day && e.slotIndex === s);
    const isUn = (teacher.unavailability || []).some(u => u.day === day && u.slotIndex === s);

    if (entry) {
      let span = 1;
      while (s + span < slotLabels.length) {
        const nextEntry = timetable.find(e => e.teacherId === teacherId && e.day === day && e.slotIndex === s + span);
        if (nextEntry && nextEntry.subjectId === entry.subjectId && nextEntry.classId === entry.classId) {
          span++;
        } else {
          break;
        }
      }
      blocks.push({ startSlot: s, span, entry, isUnavailable: false });
      s += span;
    } else if (isUn) {
      let span = 1;
      while (s + span < slotLabels.length) {
        const nextUn = (teacher.unavailability || []).some(u => u.day === day && u.slotIndex === s + span);
        const nextEntry = timetable.find(e => e.teacherId === teacherId && e.day === day && e.slotIndex === s + span);
        if (nextUn && !nextEntry) {
          span++;
        } else {
          break;
        }
      }
      blocks.push({ startSlot: s, span, isUnavailable: true });
      s += span;
    } else {
      blocks.push({ startSlot: s, span: 1, isUnavailable: false });
      s += 1;
    }
  }

  return blocks;
}

// =========================================================================
// 1. EXPORT EMPLOI DU TEMPS PDF PAR CLASSE (SOIGNÉ, ACADÉMIQUE, 2H UNIFIÉES)
// =========================================================================
export function exportTimetableToPdf(
  classId: string,
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolName: string = "Diongue-IziSchool",
  schoolSlogan: string = "Validé par la direction des études.",
  schoolBreaks: any[] = []
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const cls = classes.find(c => c.id === classId);
  if (!cls) return;

  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // --- EN-TÊTE RÉDUIT, SOBRE & ACADÉMIQUE ---
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 12, 12);

  doc.setFontSize(11);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(`Emploi du Temps Officiel — Classe : ${cls.name}`, 12, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Édité le ${now} • Année Scolaire en cours`, 205, 18);

  // Filet de séparation sobre
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(12, 21, 285, 21);

  // --- CONFIGURATION DU TABLEAU ---
  const tableHeaderY = 24;
  const tableHeaderH = 8;
  const tableBodyY = tableHeaderY + tableHeaderH;
  const totalTableWidth = 273; // 285 - 12
  const hourColWidth = 28;
  const dayColWidth = (totalTableWidth - hourColWidth) / DAYS.length;

  // Calcul hauteur dynamique de ligne pour occuper l'espace harmonieusement
  const availableBodyH = 158; // 190 - 32
  const breakRowHeight = 6;
  const totalBreaksH = (schoolBreaks || []).length * breakRowHeight;
  const rowHeight = Math.min(15.5, (availableBodyH - totalBreaksH) / SLOT_LABELS.length);

  const getSlotY = (sIndex: number) => {
    let y = tableBodyY + sIndex * rowHeight;
    const breaksBefore = (schoolBreaks || []).filter(b => b.afterSlotIndex < sIndex);
    y += breaksBefore.length * breakRowHeight;
    return y;
  };

  // En-tête du tableau (Fond slate élégant, lignes pleines)
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text("Heures", 12 + 6, tableHeaderY + 5.5);

  for (let i = 0; i < DAYS.length; i++) {
    const x = 12 + hourColWidth + i * dayColWidth;
    doc.text(DAYS[i], x + dayColWidth / 2, tableHeaderY + 5.5, { align: 'center' });
  }

  // --- COLONNE HEURES (LIGNES PLEINES) ---
  for (let s = 0; s < SLOT_LABELS.length; s++) {
    const y = getSlotY(s);
    doc.setFillColor(s % 2 === 0 ? 248 : 255, s % 2 === 0 ? 250 : 255, s % 2 === 0 ? 252 : 255);
    doc.rect(12, y, hourColWidth, rowHeight, 'F');

    doc.setDrawColor(203, 213, 225); // slate-300 ligne pleine
    doc.setLineWidth(0.35);
    doc.rect(12, y, hourColWidth, rowHeight, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(SLOT_LABELS[s], 12 + hourColWidth / 2, y + rowHeight / 2 + 1.5, { align: 'center' });
  }

  // --- GRILLE DES COURS PAR JOURNÉE (BLOCS 2H UNIFIÉS SANS LIGNE MÉDIANE) ---
  for (let d = 0; d < DAYS.length; d++) {
    const day = DAYS[d];
    const colX = 12 + hourColWidth + d * dayColWidth;
    const blocks = getDayBlocksForClass(cls.id, day, SLOT_LABELS, timetable, cls, schoolBreaks);

    blocks.forEach((block) => {
      const blockY = getSlotY(block.startSlot);
      const blockH = block.span * rowHeight;

      if (block.entries && block.entries.length > 1) {
        // COURS SCINDÉ MULTI-GROUPES (Classe scindée)
        doc.setFillColor(255, 255, 255);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');
        doc.setDrawColor(168, 85, 247); // purple-500 accent for split courses
        doc.setLineWidth(0.4);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        // Bande latérale violette
        doc.setFillColor(147, 51, 234);
        doc.rect(colX, blockY, 2.8, blockH, 'F');

        // Ligne médiane de séparation
        const halfH = blockH / 2;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.line(colX + 3, blockY + halfH, colX + dayColWidth, blockY + halfH);

        // Groupe 1
        const e1 = block.entries[0];
        const subj1 = getSubjectName(e1.subjectId, subjects);
        const teach1 = getTeacherName(e1.teacherId, teachers);
        const lbl1 = e1.groupLabel || (e1.group === 'G1' ? 'Gr. A' : 'Gr. 1');
        doc.setTextColor(109, 40, 217); // purple-700
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(`${lbl1} : ${subj1.substring(0, 14)}`, colX + 4, blockY + 3.8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`(${teach1.substring(0, 15)})`, colX + 4, blockY + 6.8);

        // Groupe 2
        const e2 = block.entries[1];
        const subj2 = getSubjectName(e2.subjectId, subjects);
        const teach2 = getTeacherName(e2.teacherId, teachers);
        const lbl2 = e2.groupLabel || (e2.group === 'G2' ? 'Gr. B' : 'Gr. 2');
        doc.setTextColor(109, 40, 217);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(`${lbl2} : ${subj2.substring(0, 14)}`, colX + 4, blockY + halfH + 3.8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`(${teach2.substring(0, 15)})`, colX + 4, blockY + halfH + 6.8);

      } else if (block.entry) {
        // COURS PROGRAMMÉ (1h, 2h ou plus)
        const grpPrefix = block.entry.group && block.entry.group !== 'all' ? `[${block.entry.groupLabel || (block.entry.group === 'G1' ? 'Gr. A' : 'Gr. B')}] ` : '';
        const subj = `${grpPrefix}${getSubjectName(block.entry.subjectId, subjects)}`;
        const teach = getTeacherName(block.entry.teacherId, teachers);
        const teachObj = teachers.find(t => t.id === block.entry?.teacherId);
        const teachColor = teachObj?.color || '#4f46e5';
        const [tr, tg, tb] = hexToRgb(teachColor);

        // Fond doux très légèrement teinté pour lisibilité maximale
        doc.setFillColor(255, 255, 255);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        // Bordure pleine autour du bloc
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        // Bande latérale colorée représentant le professeur
        doc.setFillColor(tr, tg, tb);
        doc.rect(colX, blockY, 2.8, blockH, 'F');

        // Textes centrés dans la plage
        const cleanSubj = subj.length > 22 ? subj.substring(0, 20) + ".." : subj;
        const cleanTeach = teach.length > 22 ? teach.substring(0, 20) + ".." : teach;

        if (block.span === 1) {
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(cleanSubj, colX + 4.5, blockY + 5.5);

          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.text(cleanTeach, colX + 4.5, blockY + 9.5);
        } else {
          // Plage de 2h unifiée : grand affichage aéré
          const midY = blockY + blockH / 2;

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.text(cleanSubj, colX + 4.5, midY - 2);

          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(cleanTeach, colX + 4.5, midY + 2.5);

          doc.setTextColor(67, 56, 202);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.text(`(Séance ${block.span}h)`, colX + 4.5, midY + 6.5);
        }

      } else if (block.isUnavailable) {
        // CRÉNEAU FERMÉ / EXCLU
        doc.setFillColor(241, 245, 249);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text("Exclu / Indisponible", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });

      } else {
        // HEURE LIBRE => "Classe libérée"
        doc.setFillColor(255, 255, 255);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text("Classe libérée", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });
      }
    });
  }

  // --- DESSIN DES PAUSES (COMMUNES) ---
  (schoolBreaks || []).forEach((b) => {
    const sIdx = b.afterSlotIndex;
    if (sIdx >= SLOT_LABELS.length) return;
    const breakY = getSlotY(sIdx + 1) - breakRowHeight;

    // Draw break background
    doc.setFillColor(238, 242, 255); // Indigo-50
    doc.rect(12, breakY, totalTableWidth, breakRowHeight, 'F');

    // Draw break border
    doc.setDrawColor(224, 231, 255); // Indigo-100 border
    doc.setLineWidth(0.35);
    doc.rect(12, breakY, totalTableWidth, breakRowHeight, 'S');

    // Break time label
    const slotLabel = SLOT_LABELS[sIdx];
    const breakStartStr = slotLabel.split(' - ')[1];
    const [hStr, mStr] = breakStartStr.split('h');
    const bStartMin = parseInt(hStr) * 60 + parseInt(mStr);
    const bEndMin = bStartMin + b.duration;
    const bEndH = Math.floor(bEndMin / 60);
    const bEndM = bEndMin % 60;
    const breakEndStr = `${String(bEndH).padStart(2, '0')}h${String(bEndM).padStart(2, '0')}`;
    const breakTimeStr = `${breakStartStr} - ${breakEndStr}`;

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(breakTimeStr, 12 + hourColWidth / 2, breakY + breakRowHeight / 2 + 1, { align: 'center' });

    // Break name & duration
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`PAUSE : ${b.name || 'Pause'} (${b.duration} min)`, 12 + hourColWidth + (totalTableWidth - hourColWidth) / 2, breakY + breakRowHeight / 2 + 1, { align: 'center' });
  });

  // --- PIED DE PAGE DISCRET ACADÉMIQUE ---
  const footerY = tableBodyY + SLOT_LABELS.length * rowHeight + totalBreaksH + 6;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${schoolName} • ${schoolSlogan || "Validé par la direction des études."}`, 12, footerY);
  doc.text(`Document officiel de rentrée scolaire • Certifié conforme`, 205, footerY);

  doc.save(`${schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_planning_${cls.name}.pdf`);
}

// =========================================================================
// 2. EXPORT EMPLOI DU TEMPS PDF PAR ENSEIGNANT (2H UNIFIÉES, "Prof libre")
// =========================================================================
export function exportTeacherTimetableToPdf(
  teacherId: string,
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolName: string = "Diongue-IziSchool",
  schoolSlogan: string = "Validé par la direction des études."
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const teacher = teachers.find(t => t.id === teacherId);
  if (!teacher) return;

  const assignedHours = timetable.filter(e => e.teacherId === teacher.id).length;
  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // En-tête compact et lisible
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(schoolName.toUpperCase(), 12, 12);

  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`Emploi du Temps Enseignant — Professeur : ${teacher.name}`, 12, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Volume : ${assignedHours}h / ${teacher.weeklyQuota}h contractuelles  •  Édité le ${now}`, 175, 18);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(12, 21, 285, 21);

  const tableHeaderY = 24;
  const tableHeaderH = 8;
  const tableBodyY = tableHeaderY + tableHeaderH;
  const totalTableWidth = 273;
  const hourColWidth = 28;
  const dayColWidth = (totalTableWidth - hourColWidth) / DAYS.length;

  const availableBodyH = 158;
  const rowHeight = Math.min(15.5, availableBodyH / SLOT_LABELS.length);

  // En-tête tableau
  doc.setFillColor(30, 41, 59);
  doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'F');
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'S');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text("Heures", 12 + 6, tableHeaderY + 5.5);

  for (let i = 0; i < DAYS.length; i++) {
    const x = 12 + hourColWidth + i * dayColWidth;
    doc.text(DAYS[i], x + dayColWidth / 2, tableHeaderY + 5.5, { align: 'center' });
  }

  // Colonne heures
  for (let s = 0; s < SLOT_LABELS.length; s++) {
    const y = tableBodyY + s * rowHeight;
    doc.setFillColor(s % 2 === 0 ? 248 : 255, s % 2 === 0 ? 250 : 255, s % 2 === 0 ? 252 : 255);
    doc.rect(12, y, hourColWidth, rowHeight, 'F');

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.rect(12, y, hourColWidth, rowHeight, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(SLOT_LABELS[s], 12 + hourColWidth / 2, y + rowHeight / 2 + 1.5, { align: 'center' });
  }

  // Grille Enseignant
  const [tr, tg, tb] = hexToRgb(teacher.color || '#10b981');

  for (let d = 0; d < DAYS.length; d++) {
    const day = DAYS[d];
    const colX = 12 + hourColWidth + d * dayColWidth;
    const blocks = getDayBlocksForTeacher(teacher.id, day, SLOT_LABELS, timetable, teacher);

    blocks.forEach((block) => {
      const blockY = tableBodyY + block.startSlot * rowHeight;
      const blockH = block.span * rowHeight;

      if (block.entry) {
        const subj = getSubjectName(block.entry.subjectId, subjects);
        const rawCls = getClassName(block.entry.classId, classes);
        const grpSuffix = block.entry.group && block.entry.group !== 'all' ? ` (${block.entry.groupLabel || (block.entry.group === 'G1' ? 'Groupe A' : 'Groupe B')})` : '';
        const clsName = `${rawCls}${grpSuffix}`;

        doc.setFillColor(255, 255, 255);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        // Bande latérale
        doc.setFillColor(tr, tg, tb);
        doc.rect(colX, blockY, 2.8, blockH, 'F');

        const cleanSubj = subj.length > 22 ? subj.substring(0, 20) + ".." : subj;
        const cleanCls = clsName.length > 26 ? clsName.substring(0, 24) + ".." : clsName;

        if (block.span === 1) {
          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.text(cleanSubj, colX + 4.5, blockY + 5.5);

          doc.setTextColor(16, 185, 129);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text(`Classe : ${cleanCls}`, colX + 4.5, blockY + 9.5);
        } else {
          const midY = blockY + blockH / 2;

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.text(cleanSubj, colX + 4.5, midY - 2);

          doc.setTextColor(16, 185, 129);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(`Classe : ${cleanCls}`, colX + 4.5, midY + 2.5);

          doc.setTextColor(100, 116, 139);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.text(`(Séance ${block.span}h)`, colX + 4.5, midY + 6.5);
        }

      } else if (block.isUnavailable) {
        doc.setFillColor(254, 242, 242);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.35);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text("Indisponible", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });

      } else {
        // HEURE LIBRE => "Prof libre"
        doc.setFillColor(255, 255, 255);
        doc.rect(colX, blockY, dayColWidth, blockH, 'F');

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.rect(colX, blockY, dayColWidth, blockH, 'S');

        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.text("Prof libre", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });
      }
    });
  }

  const footerY = tableBodyY + SLOT_LABELS.length * rowHeight + 6;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${schoolName} • Emploi du temps individuel de l'enseignant`, 12, footerY);
  doc.text(`Document officiel de rentrée scolaire • Direction des études`, 205, footerY);

  doc.save(`planning_prof_${teacher.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
}

// =========================================================================
// 3. EXPORT ENSEMBLE DES ENSEIGNANTS EN PDF (RELIÉ)
// =========================================================================
export function exportAllTeachersTimetableToPdf(
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolName: string = "Diongue-IziSchool",
  schoolSlogan: string = "Validé par la direction des études."
) {
  if (teachers.length === 0) return;

  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  teachers.forEach((teacher, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const assignedHours = timetable.filter(e => e.teacherId === teacher.id).length;

    // En-tête compact
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(schoolName.toUpperCase(), 12, 12);

    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129);
    doc.text(`Emploi du Temps Enseignant — ${teacher.name}`, 12, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Charge : ${assignedHours}h / ${teacher.weeklyQuota}h • Page ${index + 1}/${teachers.length}`, 185, 18);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, 21, 285, 21);

    const tableHeaderY = 24;
    const tableHeaderH = 8;
    const tableBodyY = tableHeaderY + tableHeaderH;
    const totalTableWidth = 273;
    const hourColWidth = 28;
    const dayColWidth = (totalTableWidth - hourColWidth) / DAYS.length;
    const availableBodyH = 158;
    const rowHeight = Math.min(15.5, availableBodyH / SLOT_LABELS.length);

    // En-tête tableau
    doc.setFillColor(30, 41, 59);
    doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'F');
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.rect(12, tableHeaderY, totalTableWidth, tableHeaderH, 'S');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text("Heures", 12 + 6, tableHeaderY + 5.5);

    for (let i = 0; i < DAYS.length; i++) {
      const x = 12 + hourColWidth + i * dayColWidth;
      doc.text(DAYS[i], x + dayColWidth / 2, tableHeaderY + 5.5, { align: 'center' });
    }

    // Heures
    for (let s = 0; s < SLOT_LABELS.length; s++) {
      const y = tableBodyY + s * rowHeight;
      doc.setFillColor(s % 2 === 0 ? 248 : 255, s % 2 === 0 ? 250 : 255, s % 2 === 0 ? 252 : 255);
      doc.rect(12, y, hourColWidth, rowHeight, 'F');

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.35);
      doc.rect(12, y, hourColWidth, rowHeight, 'S');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(SLOT_LABELS[s], 12 + hourColWidth / 2, y + rowHeight / 2 + 1.5, { align: 'center' });
    }

    const [tr, tg, tb] = hexToRgb(teacher.color || '#10b981');

    for (let d = 0; d < DAYS.length; d++) {
      const day = DAYS[d];
      const colX = 12 + hourColWidth + d * dayColWidth;
      const blocks = getDayBlocksForTeacher(teacher.id, day, SLOT_LABELS, timetable, teacher);

      blocks.forEach((block) => {
        const blockY = tableBodyY + block.startSlot * rowHeight;
        const blockH = block.span * rowHeight;

        if (block.entry) {
          const subj = getSubjectName(block.entry.subjectId, subjects);
          const clsName = getClassName(block.entry.classId, classes);

          doc.setFillColor(255, 255, 255);
          doc.rect(colX, blockY, dayColWidth, blockH, 'F');

          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.35);
          doc.rect(colX, blockY, dayColWidth, blockH, 'S');

          doc.setFillColor(tr, tg, tb);
          doc.rect(colX, blockY, 2.8, blockH, 'F');

          const cleanSubj = subj.length > 22 ? subj.substring(0, 20) + ".." : subj;
          const cleanCls = clsName.length > 22 ? clsName.substring(0, 20) + ".." : clsName;

          if (block.span === 1) {
            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.text(cleanSubj, colX + 4.5, blockY + 5.5);

            doc.setTextColor(16, 185, 129);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.text(`Classe : ${cleanCls}`, colX + 4.5, blockY + 9.5);
          } else {
            const midY = blockY + blockH / 2;

            doc.setTextColor(15, 23, 42);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text(cleanSubj, colX + 4.5, midY - 2);

            doc.setTextColor(16, 185, 129);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`Classe : ${cleanCls}`, colX + 4.5, midY + 2.5);

            doc.setTextColor(100, 116, 139);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`(Séance ${block.span}h)`, colX + 4.5, midY + 6.5);
          }

        } else if (block.isUnavailable) {
          doc.setFillColor(254, 242, 242);
          doc.rect(colX, blockY, dayColWidth, blockH, 'F');

          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.35);
          doc.rect(colX, blockY, dayColWidth, blockH, 'S');

          doc.setTextColor(185, 28, 28);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.text("Indisponible", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });

        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(colX, blockY, dayColWidth, blockH, 'F');

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.rect(colX, blockY, dayColWidth, blockH, 'S');

          doc.setTextColor(148, 163, 184);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.text("Prof libre", colX + dayColWidth / 2, blockY + blockH / 2 + 1, { align: 'center' });
        }
      });
    }

    const footerY = tableBodyY + SLOT_LABELS.length * rowHeight + 6;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${schoolName} • Recueil des emplois du temps enseignants`, 12, footerY);
    doc.text(`Édité le ${now} • Document Officiel`, 205, footerY);
  });

  doc.save(`emplois_du_temps_tous_profs_${schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`);
}

// =========================================================================
// 4. EXPORT EXCEL PAR CLASSE & ENSEIGNANTS
// =========================================================================
export function exportTimetableToExcel(
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolBreaks: any[] = []
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const wb = XLSX.utils.book_new();

  // Feuille par classe
  for (const cls of classes) {
    const classData: any[] = [];
    const header = ["Créneau Horaires", ...DAYS];
    classData.push(header);

    for (let s = 0; s < SLOT_LABELS.length; s++) {
      const row = [SLOT_LABELS[s]];
      for (const day of DAYS) {
        const matchingEntries = timetable.filter(e => e.classId === cls.id && e.day === day && e.slotIndex === s);
        if (matchingEntries.length > 1) {
          const formatted = matchingEntries.map(e => `[${e.groupLabel || (e.group === 'G1' ? 'Gr. A' : 'Gr. B')}] ${getSubjectName(e.subjectId, subjects)} (${getTeacherName(e.teacherId, teachers)})`).join(' // ');
          row.push(formatted);
        } else if (matchingEntries.length === 1) {
          const entry = matchingEntries[0];
          const grpPrefix = entry.group && entry.group !== 'all' ? `[${entry.groupLabel || (entry.group === 'G1' ? 'Gr. A' : 'Gr. B')}] ` : '';
          row.push(`${grpPrefix}${getSubjectName(entry.subjectId, subjects)} (${getTeacherName(entry.teacherId, teachers)})`);
        } else {
          const isUn = (cls.unavailability || []).some(u => u.day === day && u.slotIndex === s);
          row.push(isUn ? "[Indisponible]" : "Classe libérée");
        }
      }
      classData.push(row);

      // Check if there is a break after slot s
      const breakAfter = (schoolBreaks || []).find(b => b.afterSlotIndex === s);
      if (breakAfter) {
        const breakStartStr = SLOT_LABELS[s].split(' - ')[1];
        const [hStr, mStr] = breakStartStr.split('h');
        const bStartMin = parseInt(hStr) * 60 + parseInt(mStr);
        const bEndMin = bStartMin + breakAfter.duration;
        const bEndH = Math.floor(bEndMin / 60);
        const bEndM = bEndMin % 60;
        const breakEndStr = `${String(bEndH).padStart(2, '0')}h${String(bEndM).padStart(2, '0')}`;
        const breakTimeStr = `${breakStartStr} - ${breakEndStr}`;

        const breakRow = [`${breakTimeStr} (Pause)`, ...DAYS.map(() => `PAUSE: ${breakAfter.name || 'Pause'} (${breakAfter.duration} min)`)];
        classData.push(breakRow);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(classData);
    ws['!cols'] = [{ wch: 22 }, ...DAYS.map(() => ({ wch: 26 }))];
    XLSX.utils.book_append_sheet(wb, ws, cls.name.replace(/[:\/\\*\?\[\]]/g, ''));
  }

  // Feuille Synthèse Enseignants
  const teacherSummaryData = [
    ["Enseignant", "Matières", "Quota Visé (h)", "Heures Assignées (h)", "Statut"]
  ];
  for (const t of teachers) {
    const teacherAssignmentsCount = timetable.filter(e => e.teacherId === t.id).length;
    const diff = teacherAssignmentsCount - t.weeklyQuota;
    let statusText = "Conforme";
    if (diff < 0) statusText = `Sous-charge (-${Math.abs(diff)}h)`;
    if (diff > 0) statusText = `Surcharge (+${diff}h)`;

    teacherSummaryData.push([
      t.name,
      t.subjectIds.map(sid => getSubjectName(sid, subjects)).join(', '),
      t.weeklyQuota.toString(),
      teacherAssignmentsCount.toString(),
      statusText
    ]);
  }
  const wsTeachers = XLSX.utils.aoa_to_sheet(teacherSummaryData);
  wsTeachers['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsTeachers, "Synthèse Enseignants");

  XLSX.writeFile(wb, `emplois_du_temps.xlsx`);
}

export function exportTeacherTimetableToExcel(
  teacherId: string,
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[]
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const wb = XLSX.utils.book_new();

  const teachersToExport = teacherId === 'all' 
    ? teachers 
    : teachers.filter(t => t.id === teacherId);

  for (const teacher of teachersToExport) {
    const teacherData: any[] = [];
    const header = ["Créneau Horaires", ...DAYS];
    teacherData.push(header);

    for (let s = 0; s < SLOT_LABELS.length; s++) {
      const row = [SLOT_LABELS[s]];
      for (const day of DAYS) {
        const entry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === s);
        if (entry) {
          const grpSuffix = entry.group && entry.group !== 'all' ? ` (${entry.groupLabel || (entry.group === 'G1' ? 'Groupe A' : 'Groupe B')})` : '';
          row.push(`${getSubjectName(entry.subjectId, subjects)} (${getClassName(entry.classId, classes)}${grpSuffix})`);
        } else {
          const isUn = (teacher.unavailability || []).some(u => u.day === day && u.slotIndex === s);
          row.push(isUn ? "[Indisponible]" : "Prof libre");
        }
      }
      teacherData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(teacherData);
    ws['!cols'] = [{ wch: 18 }, ...DAYS.map(() => ({ wch: 24 }))];
    const sheetName = teacher.name.replace(/[:\/\\*\?\[\]]/g, '').substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const fileName = teacherId === 'all' 
    ? `emplois_du_temps_enseignants.xlsx`
    : `planning_prof_${teachersToExport[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

// =========================================================================
// 5. EXPORT WORD PAR CLASSE
// =========================================================================
export function exportTimetableToWord(
  classId: string,
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolName: string = "Diongue-IziSchool",
  schoolSlogan: string = "Validé par la direction des études.",
  schoolLogo: string = "",
  schoolLogoIcon: string = "GraduationCap",
  schoolBreaks: any[] = []
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;
  const cls = classes.find(c => c.id === classId);
  if (!cls) return;

  const d = new Date().toLocaleDateString('fr-FR');
  const escapedSchoolName = escapeHtml(schoolName);
  const escapedSchoolSlogan = escapeHtml(schoolSlogan);
  const escapedClassName = escapeHtml(cls.name);

  let rowsHtml = '';
  for (let s = 0; s < SLOT_LABELS.length; s++) {
    let cellsHtml = `
      <td style="border: 1px solid #cbd5e1; padding: 10px 6px; font-weight: bold; background-color: #f8fafc; color: #1e293b; text-align: center; vertical-align: middle; font-size: 9pt;">
        ${escapeHtml(SLOT_LABELS[s])}
      </td>
    `;
    
    for (const day of DAYS) {
      const entry = timetable.find(e => e.classId === cls.id && e.day === day && e.slotIndex === s);
      if (entry) {
        const subj = subjects.find(sub => sub.id === entry.subjectId)?.name || entry.subjectId;
        const teach = teachers.find(t => t.id === entry.teacherId)?.name || entry.teacherId;
        const teachColor = teachers.find(t => t.id === entry.teacherId)?.color || '#4f46e5';
        
        cellsHtml += `
          <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; background-color: #f8fafc; border-left: 4px solid ${escapeHtml(teachColor)};">
            <div style="font-weight: bold; color: #1e293b; font-size: 9.5pt; margin-bottom: 2px;">${escapeHtml(subj)}</div>
            <div style="color: #64748b; font-size: 8pt;">${escapeHtml(teach)}</div>
          </td>
        `;
      } else {
        const isUn = (cls.unavailability || []).some(u => u.day === day && u.slotIndex === s);
        if (isUn) {
          cellsHtml += `
            <td style="border: 1px solid #cbd5e1; padding: 8px; background-color: #f1f5f9; color: #94a3b8; font-style: italic; text-align: center; vertical-align: middle; font-size: 8pt;">
              Exclu
            </td>
          `;
        } else {
          cellsHtml += `
            <td style="border: 1px solid #cbd5e1; padding: 8px; background-color: #ffffff; color: #94a3b8; font-style: italic; text-align: center; vertical-align: middle; font-size: 8pt;">
              Classe libérée
            </td>
          `;
        }
      }
    }
    rowsHtml += `<tr style="height: 48px;">${cellsHtml}</tr>`;

    // Check if there is a break after slot s
    const breakAfter = (schoolBreaks || []).find(b => b.afterSlotIndex === s);
    if (breakAfter) {
      const breakStartStr = SLOT_LABELS[s].split(' - ')[1];
      const [hStr, mStr] = breakStartStr.split('h');
      const bStartMin = parseInt(hStr) * 60 + parseInt(mStr);
      const bEndMin = bStartMin + breakAfter.duration;
      const bEndH = Math.floor(bEndMin / 60);
      const bEndM = bEndMin % 60;
      const breakEndStr = `${String(bEndH).padStart(2, '0')}h${String(bEndM).padStart(2, '0')}`;
      const breakTimeStr = `${breakStartStr} - ${breakEndStr}`;

      rowsHtml += `
        <tr style="height: 28px; background-color: #e0e7ff; color: #4338ca; text-align: center; font-weight: bold;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; font-size: 8.5pt; font-family: monospace;">
            ${escapeHtml(breakTimeStr)}
          </td>
          <td colspan="${DAYS.length}" style="border: 1px solid #cbd5e1; padding: 6px; font-size: 9pt; text-align: center; vertical-align: middle;">
            ⏸️ PAUSE : ${escapeHtml(breakAfter.name || 'Pause')} (${breakAfter.duration} min)
          </td>
        </tr>
      `;
    }
  }

  const fileContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${escapedClassName} - Emploi du temps officiel - ${escapedSchoolName}</title>
      <style>
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        .header-section { width: 100%; border-bottom: 2px solid #4338ca; margin-bottom: 16px; padding-bottom: 8px; }
        .school-title { font-size: 14pt; font-weight: bold; color: #0f172a; }
        .doc-meta { font-size: 11pt; font-weight: bold; color: #4338ca; text-align: right; }
        .timetable-header-cell { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #1e293b; padding: 8px; font-size: 9pt; text-align: center; }
        .footer-text { font-size: 8pt; color: #64748b; margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 6px; }
      </style>
    </head>
    <body>
      <table class="header-section">
        <tr>
          <td style="vertical-align: middle;">
            <div class="school-title">${escapedSchoolName}</div>
            <div style="font-size: 8.5pt; color: #64748b;">${escapedSchoolSlogan}</div>
          </td>
          <td style="vertical-align: middle; text-align: right;">
            <div class="doc-meta">Emploi du Temps — Classe : ${escapedClassName}</div>
            <div style="font-size: 8pt; color: #64748b;">Édité le ${d}</div>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th class="timetable-header-cell" style="width: 12%;">Heures</th>
            ${DAYS.map(day => `<th class="timetable-header-cell" style="width: ${88 / DAYS.length}%;">${escapeHtml(day)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <table class="footer-text">
        <tr>
          <td>Document officiel certifié • <strong>${escapedSchoolName}</strong></td>
          <td style="text-align: right;">Tous droits réservés.</td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([fileContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planning_${cls.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_word.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// =========================================================================
// 6. EXPORT WORD PAR ENSEIGNANT
// =========================================================================
export function exportTeacherTimetableToWord(
  teacherId: string,
  timetable: TimetableEntry[],
  classes: ClassGroup[],
  teachers: Teacher[],
  subjects: Subject[],
  schoolName: string = "Diongue-IziSchool",
  schoolSlogan: string = "Validé par la direction des études.",
  schoolLogo: string = "",
  schoolLogoIcon: string = "GraduationCap"
) {
  const DAYS = activeExportDays;
  const SLOT_LABELS = activeExportSlotLabels;

  const teachersToExport = teacherId === 'all' 
    ? teachers 
    : teachers.filter(t => t.id === teacherId);

  if (teachersToExport.length === 0) return;

  const d = new Date().toLocaleDateString('fr-FR');
  const escapedSchoolName = escapeHtml(schoolName);
  const escapedSchoolSlogan = escapeHtml(schoolSlogan);

  let bodyHtml = '';

  for (let idx = 0; idx < teachersToExport.length; idx++) {
    const teacher = teachersToExport[idx];
    const assignedHours = timetable.filter(e => e.teacherId === teacher.id).length;
    const escapedTeacherName = escapeHtml(teacher.name);

    let rowsHtml = '';
    for (let s = 0; s < SLOT_LABELS.length; s++) {
      let cellsHtml = `
        <td style="border: 1px solid #cbd5e1; padding: 10px 6px; font-weight: bold; background-color: #f8fafc; color: #1e293b; text-align: center; vertical-align: middle; font-size: 9pt;">
          ${escapeHtml(SLOT_LABELS[s])}
        </td>
      `;
      
      for (const day of DAYS) {
        const entry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === s);
        if (entry) {
          const subj = subjects.find(sub => sub.id === entry.subjectId)?.name || entry.subjectId;
          const clsName = classes.find(c => c.id === entry.classId)?.name || entry.classId;

          cellsHtml += `
            <td style="border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; background-color: #f8fafc; border-left: 4px solid ${escapeHtml(teacher.color || '#16a34a')};">
              <div style="font-weight: bold; color: #1e293b; font-size: 9.5pt; margin-bottom: 2px;">${escapeHtml(subj)}</div>
              <div style="color: #16a34a; font-weight: bold; font-size: 8pt;">Classe : ${escapeHtml(clsName)}</div>
            </td>
          `;
        } else {
          const isUn = (teacher.unavailability || []).some(u => u.day === day && u.slotIndex === s);
          if (isUn) {
            cellsHtml += `
              <td style="border: 1px solid #cbd5e1; padding: 8px; background-color: #fee2e2; color: #b91c1c; font-style: italic; text-align: center; vertical-align: middle; font-size: 8pt;">
                Indisponible
              </td>
            `;
          } else {
            cellsHtml += `
              <td style="border: 1px solid #cbd5e1; padding: 8px; background-color: #ffffff; color: #94a3b8; font-style: italic; text-align: center; vertical-align: middle; font-size: 8pt;">
                Prof libre
              </td>
            `;
          }
        }
      }
      rowsHtml += `<tr style="height: 48px;">${cellsHtml}</tr>`;
    }

    const pageBreakStyle = idx > 0 ? 'page-break-before: always; margin-top: 30px;' : '';

    bodyHtml += `
      <div style="${pageBreakStyle}">
        <table class="header-section">
          <tr>
            <td style="vertical-align: middle;">
              <div class="school-title">${escapedSchoolName}</div>
              <div style="font-size: 8.5pt; color: #64748b;">${escapedSchoolSlogan}</div>
            </td>
            <td style="vertical-align: middle; text-align: right;">
              <div class="doc-meta" style="color: #16a34a;">Emploi du Temps — Professeur : ${escapedTeacherName}</div>
              <div style="font-size: 8pt; color: #64748b;">Charge : ${assignedHours}h / ${teacher.weeklyQuota}h • Édité le ${d}</div>
            </td>
          </tr>
        </table>

        <table>
          <thead>
            <tr>
              <th class="timetable-header-cell" style="width: 12%;">Heures</th>
              ${DAYS.map(day => `<th class="timetable-header-cell" style="width: ${88 / DAYS.length}%;">${escapeHtml(day)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <table class="footer-text">
          <tr>
            <td>Document officiel enseignant • <strong>${escapedSchoolName}</strong></td>
            <td style="text-align: right;">Tous droits réservés.</td>
          </tr>
        </table>
      </div>
    `;
  }

  const fileContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>Emplois du temps Enseignants - ${escapedSchoolName}</title>
      <style>
        @page { size: A4 landscape; margin: 1cm; }
        body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
        table { border-collapse: collapse; width: 100%; }
        .header-section { width: 100%; border-bottom: 2px solid #16a34a; margin-bottom: 16px; padding-bottom: 8px; }
        .school-title { font-size: 14pt; font-weight: bold; color: #0f172a; }
        .doc-meta { font-size: 11pt; font-weight: bold; }
        .timetable-header-cell { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #1e293b; padding: 8px; font-size: 9pt; text-align: center; }
        .footer-text { font-size: 8pt; color: #64748b; margin-top: 15px; border-top: 1px solid #cbd5e1; padding-top: 6px; }
      </style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `;

  const blob = new Blob([fileContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  
  const downloadName = teacherId === 'all'
    ? `emplois_du_temps_enseignants.doc`
    : `planning_${teachersToExport[0]?.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_word.doc`;

  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
