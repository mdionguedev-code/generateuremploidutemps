'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  BarChart2,
  Check,
  FileSpreadsheet,
  FileText,
  Lock,
  Crown,
  Zap
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export type ChefChartType = 'teachers' | 'classes' | 'subjects' | 'weekly_load' | 'mrr' | 'plans';

interface ChefAnalyticsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartType: ChefChartType;
  teachers?: any[];
  classes?: any[];
  subjects?: any[];
  timetable?: any[];
  activeDays?: string[];
  totalSlots?: number;
  schoolName?: string;
  theme?: 'dark' | 'light';
  clientPlanId?: string;
  onUpgrade?: () => void;
}

const SUBJECT_COLORS_PALETTE = [
  '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#e11d48',
  '#84cc16', '#a855f7', '#0ea5e9', '#d946ef'
];

export default function ChefAnalyticsDetailModal({
  isOpen,
  onClose,
  chartType,
  teachers = [],
  classes = [],
  subjects = [],
  timetable = [],
  activeDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'],
  totalSlots = 8,
  schoolName = 'Mon Établissement',
  theme = 'dark',
  clientPlanId = 'plan_premium',
  onUpgrade
}: ChefAnalyticsDetailModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'optimal' | 'under' | 'over'>('all');
  const [isUpgradePromptOpen, setIsUpgradePromptOpen] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Vérification de l'abonnement : Réservé à Premium et School uniquement
  const isPremiumOrSchool = clientPlanId === 'plan_premium' || clientPlanId === 'plan_school';

  // Sécurité sur les listes
  const safeTeachers = useMemo(() => Array.isArray(teachers) ? teachers : [], [teachers]);
  const safeClasses = useMemo(() => Array.isArray(classes) ? classes : [], [classes]);
  const safeSubjects = useMemo(() => Array.isArray(subjects) ? subjects : [], [subjects]);
  const safeTimetable = useMemo(() => Array.isArray(timetable) ? timetable : [], [timetable]);
  const safeActiveDays = useMemo(() => Array.isArray(activeDays) && activeDays.length > 0 ? activeDays : ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'], [activeDays]);
  const safeTotalSlots = typeof totalSlots === 'number' && totalSlots > 0 ? totalSlots : 8;

  // --- 1. CALCULS STATISTIQUES ENSEIGNANTS ---
  const teacherStats = useMemo(() => {
    return safeTeachers.map((t, idx) => {
      if (!t) return null;
      let assignedHours = 0;
      safeClasses.forEach((c) => {
        if (Array.isArray(c?.assignments)) {
          c.assignments.forEach((a: any) => {
            if (a && a.teacherId === t.id) {
              assignedHours += Number(a.hoursPerWeek || 0);
            }
          });
        }
      });

      const quota = Number(t.weeklyQuota || 18);
      const diff = assignedHours - quota;
      const percent = quota > 0 ? Math.round((assignedHours / quota) * 100) : 0;

      let status: 'optimal' | 'under' | 'over' = 'optimal';
      if (diff < 0) status = 'under';
      else if (diff > 0) status = 'over';

      const taughtSubjectNames = (Array.isArray(t.subjectIds) ? t.subjectIds : [])
        .map((sid: string) => safeSubjects.find((s) => s && s.id === sid)?.name || sid)
        .filter(Boolean)
        .join(', ');

      const unavailList = t.unavailability || t.unavailabilities || [];

      return {
        id: t.id || `teach-${idx}`,
        name: t.name || 'Enseignant',
        quota,
        assignedHours,
        diff,
        percent,
        status,
        color: t.color || '#6366f1',
        subjectsTaught: taughtSubjectNames || 'Aucune discipline affectée',
        unavailCount: Array.isArray(unavailList) ? unavailList.length : 0
      };
    }).filter(Boolean) as any[];
  }, [safeTeachers, safeClasses, safeSubjects]);

  // --- 2. CALCULS STATISTIQUES CLASSES ---
  const classStats = useMemo(() => {
    const weeklyMaxSlots = safeActiveDays.length * safeTotalSlots;
    return safeClasses.map((c, idx) => {
      if (!c) return null;
      let totalAssignedHours = 0;
      const subjectBreakdown: { name: string; hours: number; teacher: string; color: string }[] = [];

      if (Array.isArray(c.assignments)) {
        c.assignments.forEach((a: any, aIdx: number) => {
          if (!a) return;
          const hrs = Number(a.hoursPerWeek || 0);
          totalAssignedHours += hrs;
          const subj = safeSubjects.find((s) => s && s.id === a.subjectId);
          const teach = safeTeachers.find((t) => t && t.id === a.teacherId);
          const colorCode = teach?.color || SUBJECT_COLORS_PALETTE[aIdx % SUBJECT_COLORS_PALETTE.length];

          subjectBreakdown.push({
            name: subj?.name || 'Matière',
            hours: hrs,
            teacher: teach?.name || 'Non assigné',
            color: colorCode
          });
        });
      }

      const fillRate = weeklyMaxSlots > 0 ? Math.round((totalAssignedHours / weeklyMaxSlots) * 100) : 0;
      const freeSlots = Math.max(0, weeklyMaxSlots - totalAssignedHours);
      const unavailList = c.unavailability || c.unavailabilities || [];

      return {
        id: c.id || `class-${idx}`,
        name: c.name || 'Classe',
        totalAssignedHours,
        weeklyMaxSlots,
        fillRate,
        freeSlots,
        subjectCount: Array.isArray(c.assignments) ? c.assignments.length : 0,
        subjectsList: subjectBreakdown,
        unavailCount: Array.isArray(unavailList) ? unavailList.length : 0
      };
    }).filter(Boolean) as any[];
  }, [safeClasses, safeSubjects, safeTeachers, safeActiveDays, safeTotalSlots]);

  // --- 3. CALCULS STATISTIQUES MATIÈRES ---
  const subjectStats = useMemo(() => {
    let globalTotalHours = 0;
    const stats = safeSubjects.map((s, idx) => {
      if (!s) return null;
      let hoursCount = 0;
      let classesCount = 0;
      const teacherIds = new Set<string>();

      safeClasses.forEach((c) => {
        if (!c) return;
        let classHasSubject = false;
        if (Array.isArray(c.assignments)) {
          c.assignments.forEach((a: any) => {
            if (a && a.subjectId === s.id) {
              hoursCount += Number(a.hoursPerWeek || 0);
              classHasSubject = true;
              if (a.teacherId) teacherIds.add(a.teacherId);
            }
          });
        }
        if (classHasSubject) classesCount++;
      });

      globalTotalHours += hoursCount;

      return {
        id: s.id || `sub-${idx}`,
        name: s.name || 'Discipline',
        color: SUBJECT_COLORS_PALETTE[idx % SUBJECT_COLORS_PALETTE.length],
        totalHours: hoursCount,
        classesCount,
        teachersCount: teacherIds.size
      };
    }).filter(Boolean) as any[];

    return stats.map((st) => ({
      ...st,
      percentage: globalTotalHours > 0 ? Math.round((st.totalHours / globalTotalHours) * 100) : 0
    }));
  }, [safeSubjects, safeClasses]);

  // --- 4. CALCULS CHARGE PAR JOUR ---
  const dailyStats = useMemo(() => {
    return safeActiveDays.map((day) => {
      const slotsOnDay = safeTimetable.filter((slot) => slot && slot.day === day).length;
      return {
        day,
        slotsCount: slotsOnDay,
        capacity: safeClasses.length * safeTotalSlots
      };
    });
  }, [safeActiveDays, safeTimetable, safeClasses, safeTotalSlots]);

  // --- FILTRES ACTIFS ---
  const filteredTeachers = useMemo(() => {
    return teacherStats.filter((t) => {
      if (!t) return false;
      const nameStr = (t.name || '').toLowerCase();
      const subjStr = (t.subjectsTaught || '').toLowerCase();
      const query = (searchTerm || '').toLowerCase().trim();
      const matchesSearch = nameStr.includes(query) || subjStr.includes(query);
      if (!matchesSearch) return false;

      if (filterStatus === 'optimal') return t.status === 'optimal';
      if (filterStatus === 'under') return t.status === 'under';
      if (filterStatus === 'over') return t.status === 'over';
      return true;
    });
  }, [teacherStats, searchTerm, filterStatus]);

  const filteredClasses = useMemo(() => {
    return classStats.filter((c) => {
      if (!c) return false;
      const nameStr = (c.name || '').toLowerCase();
      const query = (searchTerm || '').toLowerCase().trim();
      return nameStr.includes(query);
    });
  }, [classStats, searchTerm]);

  // Helper conversion hex vers RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    let c = (hex || '#4f46e5').replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return [79, 70, 229];
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const DISTINCT_TEACHER_COLORS = [
    '#4f46e5', '#059669', '#d97706', '#e11d48', '#0284c7',
    '#7c3aed', '#0d9488', '#ea580c', '#db2777', '#475569',
    '#16a34a', '#9333ea', '#2563eb', '#c026d3', '#0891b2'
  ];

  // --- FONCTION EXPORT PDF SOIGNÉE & ACADÉMIQUE ---
  const handleExportPDF = () => {
    if (!isPremiumOrSchool) {
      setIsUpgradePromptOpen(true);
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const now = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      // 1. EN-TÊTE COMPACT ET ÉPURÉ (Sans bandeau imposant, sans mention d'abonnement)
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(schoolName.toUpperCase(), 14, 14);

      let reportTitle = "Audit des Quotas & Charges Enseignants";
      if (chartType === 'classes') reportTitle = "Volumes Horaires & Remplissage des Classes";
      else if (chartType === 'subjects') reportTitle = "Répartition Pédagogique des Disciplines";
      else if (chartType === 'weekly_load') reportTitle = "Charge Hebdomadaire par Journée";

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(`Rapport : ${reportTitle}  •  Édité le ${now}`, 14, 20);

      // Ligne de séparation élégante et discrète
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(14, 24, 196, 24);

      let currentY = 32;

      // 2. CORPS ET TABLEAU SELON LE TYPE DE GRAPHIQUE
      if (chartType === 'teachers') {
        // Synthèse en texte académique (taille 10.5 - 11)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Synthèse Générale : ${safeTeachers.length} Enseignants  |  Quota Total : ${totalContractHours}h/sem  |  Heures Affectées : ${totalAssignedHoursAll}h`, 14, currentY);
        currentY += 5.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Conformité contractuelle : ${optimalTeachersCount} profs au quota exact  •  ${underTeachersCount} sous-chargé(s)  •  ${overTeachersCount} en surcharge`, 14, currentY);
        currentY += 8;

        // En-tête de tableau moderne
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("ENSEIGNANT", 20, currentY + 5.5);
        doc.text("DISCIPLINE(S)", 70, currentY + 5.5);
        doc.text("AFFECTÉ", 125, currentY + 5.5);
        doc.text("QUOTA", 148, currentY + 5.5);
        doc.text("STATUT", 168, currentY + 5.5);
        currentY += 9;

        teacherStats.forEach((t, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 18;
          }

          const profColorHex = t.color || DISTINCT_TEACHER_COLORS[i % DISTINCT_TEACHER_COLORS.length];
          const [pr, pg, pb] = hexToRgb(profColorHex);

          // Ligne de fond alternée douce
          doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
          doc.rect(14, currentY, 182, 8, 'F');

          // Bande latérale colorée unique pour chaque professeur
          doc.setFillColor(pr, pg, pb);
          doc.rect(14, currentY, 2.5, 8, 'F');

          // Nom Enseignant (Police 10.5 académique grasse)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(String(t.name || '').substring(0, 24), 19, currentY + 5.3);

          // Matières (Police 9.5 normale)
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
          doc.text(String(t.subjectsTaught || '').substring(0, 28), 70, currentY + 5.3);

          // Heures affectées
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(`${t.assignedHours}h`, 128, currentY + 5.3);

          // Quota
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`${t.quota}h`, 151, currentY + 5.3);

          // Statut couleur
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          if (t.status === 'optimal') {
            doc.setTextColor(16, 185, 129);
            doc.text("✓ Conforme", 168, currentY + 5.3);
          } else if (t.status === 'under') {
            doc.setTextColor(217, 119, 6);
            doc.text(`Manque ${Math.abs(t.diff)}h`, 168, currentY + 5.3);
          } else {
            doc.setTextColor(225, 29, 72);
            doc.text(`+${t.diff}h excès`, 168, currentY + 5.3);
          }

          // Séparateur fin
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(14, currentY + 8, 196, currentY + 8);

          currentY += 8.5;
        });

      } else if (chartType === 'classes') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Synthèse Générale : ${safeClasses.length} Classes  |  Capacité Hebdo Max : ${safeActiveDays.length * safeTotalSlots}h/classe`, 14, currentY);
        currentY += 8;

        // En-tête de tableau
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("CLASSE", 20, currentY + 5.5);
        doc.text("NB COURS", 70, currentY + 5.5);
        doc.text("TOTAL HEURES", 110, currentY + 5.5);
        doc.text("DISPONIBLE", 145, currentY + 5.5);
        doc.text("TAUX", 175, currentY + 5.5);
        currentY += 9;

        classStats.forEach((c, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 18;
          }

          const classColorHex = DISTINCT_TEACHER_COLORS[i % DISTINCT_TEACHER_COLORS.length];
          const [cr, cg, cb] = hexToRgb(classColorHex);

          doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
          doc.rect(14, currentY, 182, 8, 'F');

          // Bande latérale colorée
          doc.setFillColor(cr, cg, cb);
          doc.rect(14, currentY, 2.5, 8, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(String(c.name || '').substring(0, 24), 19, currentY + 5.3);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`${c.subjectCount} cours`, 70, currentY + 5.3);
          doc.text(`${c.totalAssignedHours}h / ${c.weeklyMaxSlots}h`, 110, currentY + 5.3);
          doc.text(`${c.freeSlots}h libres`, 145, currentY + 5.3);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(37, 99, 235);
          doc.text(`${c.fillRate}%`, 175, currentY + 5.3);

          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(14, currentY + 8, 196, currentY + 8);

          currentY += 8.5;
        });

      } else if (chartType === 'subjects') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Synthèse Générale : ${safeSubjects.length} Matières Référencées`, 14, currentY);
        currentY += 8;

        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("MATIÈRE", 20, currentY + 5.5);
        doc.text("VOLUME HEBDOMADAIRE", 80, currentY + 5.5);
        doc.text("CLASSES", 135, currentY + 5.5);
        doc.text("PART TOTALE", 165, currentY + 5.5);
        currentY += 9;

        subjectStats.forEach((s, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 18;
          }

          const [sr, sg, sb] = hexToRgb(s.color || '#6366f1');

          doc.setFillColor(i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 252 : 255);
          doc.rect(14, currentY, 182, 8, 'F');

          doc.setFillColor(sr, sg, sb);
          doc.rect(14, currentY, 2.5, 8, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(String(s.name || '').substring(0, 28), 19, currentY + 5.3);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`${s.totalHours} heures / semaine`, 80, currentY + 5.3);
          doc.text(`${s.classesCount} classe(s)`, 135, currentY + 5.3);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(124, 58, 237);
          doc.text(`${s.percentage}%`, 165, currentY + 5.3);

          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(14, currentY + 8, 196, currentY + 8);

          currentY += 8.5;
        });

      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Synthèse Générale : ${safeActiveDays.length} Jours Ouvrés`, 14, currentY);
        currentY += 8;

        dailyStats.forEach((d, i) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`• ${d.day} : ${d.slotsCount} cours programmés (Capacité globale : ${d.capacity} créneaux)`, 16, currentY);
          currentY += 7;
        });
      }

      // 3. PIED DE PAGE DISCRET ACADÉMIQUE
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Document officiel direction généré via Planora SaaS • Tous droits réservés", 14, 287);

      const fileName = `Rapport_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}.pdf`;
      doc.save(fileName);

      setExportSuccessMsg("Rapport PDF généré et téléchargé avec succès !");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Erreur export PDF :", e);
    }
  };

  // --- FONCTION EXPORT EXCEL (.XLSX) ---
  const handleExportExcel = () => {
    if (!isPremiumOrSchool) {
      setIsUpgradePromptOpen(true);
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      if (chartType === 'teachers') {
        const data = teacherStats.map((t) => ({
          "Nom & Prénom": t.name,
          "Disciplines Enseignées": t.subjectsTaught,
          "Heures Affectées (h/sem)": t.assignedHours,
          "Quota Contractuel (h/sem)": t.quota,
          "Écart Horaire (h)": t.diff,
          "Taux d'Atteinte (%)": `${t.percent}%`,
          "Statut": t.status === 'optimal' ? 'Conforme' : t.status === 'under' ? 'Sous-charge' : 'Surcharge'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Quotas Enseignants");
      } else if (chartType === 'classes') {
        const data = classStats.map((c) => ({
          "Classe": c.name,
          "Nb Cours Liés": c.subjectCount,
          "Total Heures Affectées (h)": c.totalAssignedHours,
          "Capacité Maximale (h)": c.weeklyMaxSlots,
          "Heures Libres Restantes (h)": c.freeSlots,
          "Taux de Remplissage (%)": `${c.fillRate}%`,
          "Détail des Matières": c.subjectsList.map((s: any) => `${s.name} (${s.hours}h - ${s.teacher})`).join('; ')
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Volumes Classes");
      } else if (chartType === 'subjects') {
        const data = subjectStats.map((s) => ({
          "Discipline / Matière": s.name,
          "Volume Global Dispensé (h/sem)": s.totalHours,
          "Part du Volume Établissement (%)": `${s.percentage}%`,
          "Nombre de Classes": s.classesCount,
          "Nombre de Professeurs": s.teachersCount
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Disciplines");
      } else {
        const data = dailyStats.map((d) => ({
          "Jour": d.day,
          "Cours Programmés": d.slotsCount,
          "Capacité Totale Établissement": d.capacity
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Charge Journalière");
      }

      const fileName = `Export_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportSuccessMsg("Fichier Excel (.xlsx) généré et téléchargé avec succès !");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Erreur export Excel :", e);
    }
  };

  if (!isOpen) return null;

  // En-tête dynamique
  const getHeaderInfo = () => {
    switch (chartType) {
      case 'teachers':
        return {
          title: "Graphique Global & Audit Détaillé des Quotas Enseignants",
          subtitle: `${safeTeachers.length} enseignants répertoriés • Analyse précise des heures contractuelles vs affectées`,
          icon: GraduationCap,
          color: "text-amber-400"
        };
      case 'classes':
        return {
          title: "Graphique Global & Répartition Horaire par Classe",
          subtitle: `${safeClasses.length} classes configurées • Volume hebdomadaire, matières et créneaux disponibles`,
          icon: Users,
          color: "text-blue-400"
        };
      case 'subjects':
        return {
          title: "Graphique Global & Poids Pédagogique par Matière",
          subtitle: `${safeSubjects.length} disciplines enseignées • Répartition globale des volumes horaires`,
          icon: BookOpen,
          color: "text-purple-400"
        };
      case 'weekly_load':
        return {
          title: "Graphique Global & Charge Quotidienne de l'Établissement",
          subtitle: `${safeActiveDays.length} jours d'ouverture • Volume de cours par journée`,
          icon: Calendar,
          color: "text-emerald-400"
        };
      default:
        return {
          title: "Graphique Global & Détails Analytiques",
          subtitle: "Vue d'ensemble détaillée pour le chef d'établissement",
          icon: Sparkles,
          color: "text-indigo-400"
        };
    }
  };

  const headerInfo = getHeaderInfo();
  const IconComponent = headerInfo.icon;

  const totalContractHours = teacherStats.reduce((acc, t) => acc + (t?.quota || 0), 0);
  const totalAssignedHoursAll = teacherStats.reduce((acc, t) => acc + (t?.assignedHours || 0), 0);
  const optimalTeachersCount = teacherStats.filter((t) => t?.status === 'optimal').length;
  const underTeachersCount = teacherStats.filter((t) => t?.status === 'under').length;
  const overTeachersCount = teacherStats.filter((t) => t?.status === 'over').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl overflow-hidden animate-in fade-in duration-200">
      
      {/* Conteneur Plein Écran Spacieux */}
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[920px] bg-slate-900 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Lueur d'ambiance */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* --- HEADER DE LA MODALE --- */}
        <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0 z-10 flex-wrap">
          <div className="flex items-center gap-3.5">
            <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <IconComponent className={`w-6 h-6 ${headerInfo.color}`} />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {headerInfo.title}
                </h2>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                  Vue Chef d'Établissement
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {headerInfo.subtitle} • {schoolName}
              </p>
            </div>
          </div>

          {/* ACTIONS D'EXPORTATION EN HAUT À DROITE */}
          <div className="flex items-center gap-2.5">
            
            {/* BOUTON EXPORT PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 border ${
                isPremiumOrSchool
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/30 shadow-rose-600/20'
                  : 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border-rose-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger le rapport d'analyse détaillé en PDF" : "Réservé aux abonnés Premium et School"}
            >
              <FileText className="w-4 h-4 text-rose-400" />
              <span>Export PDF</span>
              {!isPremiumOrSchool && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono flex items-center gap-0.5 border border-amber-500/30">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}
            </button>

            {/* BOUTON EXPORT EXCEL */}
            <button
              type="button"
              onClick={handleExportExcel}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 border ${
                isPremiumOrSchool
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-emerald-600/20'
                  : 'bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border-emerald-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger les données d'analyse en format Excel .xlsx" : "Réservé aux abonnés Premium et School"}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export Excel</span>
              {!isPremiumOrSchool && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-mono flex items-center gap-0.5 border border-amber-500/30">
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors cursor-pointer ml-1"
              title="Fermer la vue détaillée"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION SUCCÈS D'EXPORTATION */}
        {exportSuccessMsg && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* --- BARRE D'OUTILS ET RECHERCHE --- */}
        <div className="px-6 py-3 border-b border-white/10 bg-slate-950/30 flex flex-wrap items-center justify-between gap-3 shrink-0 z-10">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={chartType === 'teachers' ? "Rechercher un enseignant ou discipline..." : "Rechercher une classe..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {chartType === 'teachers' && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/5 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous ({safeTeachers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('optimal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'optimal' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Quota Exact ({optimalTeachersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('under')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'under' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sous-chargés ({underTeachersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('over')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'over' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Surcharge ({overTeachersCount})
              </button>
            </div>
          )}
        </div>

        {/* --- CORPS PRINCIPAL DÉFILABLE AVEC GRAPHIQUE GLOBAL & EXPLICATIONS --- */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 z-10">

          {/* ========================================================================= */}
          {/* CAS 1 : ANALYSE DES ENSEIGNANTS                                           */}
          {/* ========================================================================= */}
          {chartType === 'teachers' && (
            <div className="space-y-8">
              
              {/* SYNTHÈSE DIAGNOSTIC EN TEXTE SIMPLE & COMPRÉHENSIBLE */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-indigo-950/30 border border-amber-500/20 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic Global &amp; Explication Pédagogique</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Votre établissement compte <strong>{safeTeachers.length} enseignants</strong> pour un quota global contractuel de <strong>{totalContractHours} heures</strong> par semaine.
                  Actuellement, <strong>{totalAssignedHoursAll} heures</strong> sont affectées dans les classes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">{optimalTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-emerald-300">Quota respecté à 100%</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">{underTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-amber-300">Sous-chargés (heures à allouer)</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">{overTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-red-300">En surcharge horaire</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRAPHIQUE GLOBAL SPACIEUX (BARRES COMPARATIVES AVEC DÉFILEMENT POUR 50+ PROFS) */}
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-indigo-400" />
                      <span>Graphique Global : Charge Réelle vs Quota Contractuel par Enseignant</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Visualisation élargie permettant d'afficher confortablement tous les professeurs de l'établissement sans chevauchement.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    {filteredTeachers.length} affiché(s)
                  </span>
                </div>

                {/* Graphique de barres interactif avec jauge */}
                <div className="space-y-3 pt-2 max-h-[380px] overflow-y-auto pr-2">
                  {filteredTeachers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      Aucun enseignant ne correspond à vos critères de recherche.
                    </div>
                  ) : (
                    filteredTeachers.map((t) => {
                      const isExact = t.status === 'optimal';
                      const isUnder = t.status === 'under';
                      const isOver = t.status === 'over';

                      return (
                        <div key={t.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{t.name}</span>
                              <span className="text-[11px] text-gray-400 font-mono">({t.subjectsTaught})</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-gray-400">
                                Affecté : <strong className="text-white">{t.assignedHours}h</strong> / Quota : {t.quota}h
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                isExact
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isUnder
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {t.percent}% {isUnder ? `(Manque ${Math.abs(t.diff)}h)` : isOver ? `(+${t.diff}h excès)` : '✓ Conforme'}
                              </span>
                            </div>
                          </div>

                          {/* Barre de progression visuelle */}
                          <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isExact ? 'bg-emerald-500' : isUnder ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, t.percent)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CONSEILS & RECOMMANDATIONS SIMPLES POUR LE CHEF */}
              <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Recommandations Pratiques d'Optimisation</span>
                </h4>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Pour les professeurs sous-chargés :</strong> Rendez-vous à l'Étape 4 (Classes) pour leur attribuer les matières restantes de manière à saturer leur quota légal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Pour les professeurs en surcharge :</strong> Répartissez certaines classes avec un collègue de la même discipline pour éviter la fatigue et respecter le quantum horaire.</span>
                  </li>
                </ul>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* CAS 2 : ANALYSE DES CLASSES                                               */}
          {/* ========================================================================= */}
          {chartType === 'classes' && (
            <div className="space-y-8">
              
              {/* SYNTHÈSE DIAGNOSTIC DES CLASSES */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-indigo-950/30 border border-blue-500/20 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic Global des Classes &amp; Remplissage</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  L'établissement compte <strong>{safeClasses.length} classes</strong>. Chaque classe dispose d'une capacité théorique maximale de <strong>{safeActiveDays.length * safeTotalSlots} créneaux</strong> par semaine ({safeActiveDays.length} jours × {safeTotalSlots}h).
                </p>
              </div>

              {/* GRAPHIQUE GLOBAL SPACIEUX DES CLASSES */}
              <div className="p-6 rounded-2xl bg-slate-950/70 border border-white/10 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-400" />
                      <span>Graphique Global : Volume Horaire &amp; Matières par Classe</span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Visualisez en un coup d'œil la charge hebdomadaire de chaque niveau d'élèves.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                    {filteredClasses.length} classe(s)
                  </span>
                </div>

                <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto pr-2">
                  {filteredClasses.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500">
                      Aucune classe ne correspond à votre recherche.
                    </div>
                  ) : (
                    filteredClasses.map((c) => (
                      <div key={c.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{c.name}</span>
                            <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                              {c.subjectCount} cours liés
                            </span>
                          </div>
                          <div className="font-mono text-xs">
                            <span className="text-gray-400">Total : </span>
                            <strong className="text-blue-400">{c.totalAssignedHours}h / {c.weeklyMaxSlots}h</strong>
                            <span className="text-gray-500 ml-2">({c.freeSlots}h libres)</span>
                          </div>
                        </div>

                        {/* Barre de distribution multicolore par matière */}
                        <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex border border-white/5">
                          {c.subjectsList.map((sb: any, sIdx: number) => {
                            const segWidth = c.weeklyMaxSlots > 0 ? (sb.hours / c.weeklyMaxSlots) * 100 : 0;
                            return (
                              <div
                                key={sIdx}
                                title={`${sb.name} (${sb.hours}h) - ${sb.teacher}`}
                                className="h-full hover:opacity-80 transition-opacity"
                                style={{ width: `${segWidth}%`, backgroundColor: sb.color }}
                              />
                            );
                          })}
                        </div>

                        {/* Légende détaillée des cours */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {c.subjectsList.map((sb: any, sIdx: number) => (
                            <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sb.color }} />
                              <span>{sb.name} ({sb.hours}h) • <span className="text-gray-400">{sb.teacher}</span></span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* CAS 3 : ANALYSE DES MATIÈRES                                              */}
          {/* ========================================================================= */}
          {chartType === 'subjects' && (
            <div className="space-y-8">
              
              <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/30 via-slate-900/60 to-indigo-950/30 border border-purple-500/20 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic du Référentiel des Matières</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Ce graphique mesure le volume d'heures total dispensé pour chaque discipline dans l'établissement scolaire.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectStats.map((sub: any) => (
                  <div key={sub.id} className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                        <span>{sub.name}</span>
                      </div>
                      <span className="font-mono text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {sub.percentage}% du total
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${sub.percentage}%`, backgroundColor: sub.color }} />
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-400 font-mono pt-1">
                      <span>Volume : <strong className="text-white">{sub.totalHours}h / sem</strong></span>
                      <span>Enseignée dans : <strong className="text-white">{sub.classesCount} classe(s)</strong></span>
                      <span>Professeurs : <strong className="text-white">{sub.teachersCount}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* CAS 4 : CHARGE HEBDOMADAIRE PAR JOUR                                      */}
          {/* ========================================================================= */}
          {chartType === 'weekly_load' && (
            <div className="space-y-8">
              
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-indigo-950/30 border border-emerald-500/20 shadow-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Répartition de l'Occupation par Journée</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Visualisez l'équilibre de programmation des cours entre le début et la fin de semaine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyStats.map((d: any) => (
                  <div key={d.day} className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-white">{d.day}</span>
                      <span className="text-emerald-400 font-mono">{d.slotsCount} cours programmés</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Capacité totale établissement : {d.capacity} créneaux
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* --- PIED DE PAGE AVEC ACTIONS RAPIDES --- */}
        <footer className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between gap-4 shrink-0 z-10 flex-wrap">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Données synchronisées en temps réel • Exports PDF &amp; Excel certifiés direction</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                isPremiumOrSchool
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                isPremiumOrSchool
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer ml-2"
            >
              Fermer la vue détaillée
            </button>
          </div>
        </footer>

      </div>

      {/* --- MODAL PROMPT D'UPGRADE SI FORMULE GRATUITE OU STANDARD --- */}
      {isUpgradePromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 text-white relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Fonctionnalité Premium &amp; School</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradePromptOpen(false)}
                className="p-1 rounded-lg bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 space-y-2">
                <p className="font-bold text-amber-300 text-sm">
                  Exportations Analytiques Réservées aux Abonnés VIP
                </p>
                <p>
                  L'exportation complète des détails graphiques en format <strong>PDF Haute Définition</strong> et <strong>Classeur Excel (.xlsx)</strong> est un outil avancé d'aide à la décision réservé aux formules <strong>Premium</strong> et <strong>School</strong>.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Rapports d'audits PDF prêts pour le Rectorat / Direction</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tableaux Excel (.xlsx) avec calculs automatiques des quotas</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Générateur IA &amp; Multi-formats illimités</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradePromptOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold"
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUpgradePromptOpen(false);
                  onClose();
                  if (onUpgrade) onUpgrade();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Passer à Premium</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
