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
  Zap,
  Building2
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
  const isLight = theme === 'light';
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

      // 1. EN-TÊTE COMPACT ET ÉPURÉ
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(schoolName.toUpperCase(), 14, 14);

      let reportTitle = "Audit des Quotas & Charges Enseignants";
      if (chartType === 'classes') reportTitle = "Volumes Horaires & Remplissage des Classes";
      else if (chartType === 'subjects') reportTitle = "Répartition Pédagogique des Disciplines";
      else if (chartType === 'weekly_load') reportTitle = "Charge Hebdomadaire par Journée";

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Rapport : ${reportTitle}  •  Édité le ${now}`, 14, 20);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(14, 24, 196, 24);

      let currentY = 32;

      // 2. CORPS ET TABLEAU SELON LE TYPE DE GRAPHIQUE
      if (chartType === 'teachers') {
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

        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("ENSEIGNANT", 18, currentY + 5.5);
        doc.text("DISCIPLINE(S)", 70, currentY + 5.5);
        doc.text("QUOTA", 125, currentY + 5.5);
        doc.text("AFFECTÉ", 145, currentY + 5.5);
        doc.text("STATUT", 168, currentY + 5.5);
        currentY += 10;

        teacherStats.forEach((t, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
          }

          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, currentY - 3.5, 182, 7, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text((t.name || '').substring(0, 26), 18, currentY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text((t.subjectsTaught || '-').substring(0, 30), 70, currentY + 1.5);

          doc.text(`${t.quota}h`, 128, currentY + 1.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`${t.assignedHours}h`, 148, currentY + 1.5);

          if (t.status === 'optimal') {
            doc.setTextColor(16, 185, 129);
            doc.text("✓ Conforme", 168, currentY + 1.5);
          } else if (t.status === 'under') {
            doc.setTextColor(217, 119, 6);
            doc.text(`-${Math.abs(t.diff)}h`, 168, currentY + 1.5);
          } else {
            doc.setTextColor(225, 29, 72);
            doc.text(`+${t.diff}h`, 168, currentY + 1.5);
          }

          currentY += 7;
        });

      } else if (chartType === 'classes') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Synthèse des Divisions : ${safeClasses.length} Classes actives dans l'établissement`, 14, currentY);
        currentY += 8;

        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("CLASSE / DIVISION", 18, currentY + 5.5);
        doc.text("DISCIPLINES ATTRIBUÉES", 70, currentY + 5.5);
        doc.text("HEURES PLANIFIÉES", 140, currentY + 5.5);
        doc.text("TAUX REMPLISSAGE", 170, currentY + 5.5);
        currentY += 10;

        classStats.forEach((c, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
          }

          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, currentY - 3.5, 182, 7, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text((c.name || '').substring(0, 26), 18, currentY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`${c.subjectCount} matières affectées`, 70, currentY + 1.5);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`${c.totalAssignedHours}h / ${c.weeklyMaxSlots}h`, 140, currentY + 1.5);

          doc.setTextColor(c.fillRate >= 100 ? 16 : 79, c.fillRate >= 100 ? 185 : 70, c.fillRate >= 100 ? 129 : 229);
          doc.text(`${c.fillRate}%`, 175, currentY + 1.5);

          currentY += 7;
        });

      } else if (chartType === 'subjects') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Répertoire Disciplinaire : ${safeSubjects.length} Matières répertoriées`, 14, currentY);
        currentY += 8;

        doc.setFillColor(30, 41, 59);
        doc.roundedRect(14, currentY, 182, 8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text("MATIÈRE", 18, currentY + 5.5);
        doc.text("VOLUME HEBDOMADAIRE", 75, currentY + 5.5);
        doc.text("CLASSES DESSERVIES", 130, currentY + 5.5);
        doc.text("POIDS %", 175, currentY + 5.5);
        currentY += 10;

        subjectStats.forEach((s, i) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
          }

          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, currentY - 3.5, 182, 7, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text((s.name || '').substring(0, 28), 18, currentY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(`${s.totalHours}h / semaine`, 75, currentY + 1.5);
          doc.text(`${s.classesCount} division(s)`, 130, currentY + 1.5);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(147, 51, 234);
          doc.text(`${s.percentage}%`, 175, currentY + 1.5);

          currentY += 7;
        });

      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`Charge Hebdomadaire : ${safeActiveDays.length} Jours d'ouverture`, 14, currentY);
        currentY += 8;

        dailyStats.forEach((d) => {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`${d.day} : ${d.slotsCount} créneaux occupés`, 18, currentY);
          currentY += 7;
        });
      }

      // 3. PIED DE PAGE DISCRET
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Document administratif officiel • Direction ${schoolName} • Page ${p}/${totalPages}`, 14, 288);
      }

      const fileName = `Rapport_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}.pdf`;
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
      let dataToExport: any[] = [];
      let sheetName = 'Statistiques';

      if (chartType === 'teachers') {
        sheetName = 'Enseignants_Quotas';
        dataToExport = teacherStats.map((t) => ({
          'ID': t.id,
          'Nom Enseignant': t.name,
          'Disciplines Enseignées': t.subjectsTaught,
          'Quota Hebdo Contractuel (h)': t.quota,
          'Heures Affectées Réelles (h)': t.assignedHours,
          'Écart (Différence)': t.diff,
          'Taux Réalisation (%)': `${t.percent}%`,
          'Statut Quota': t.status === 'optimal' ? 'Conforme' : t.status === 'under' ? 'Sous-chargé' : 'Surcharge'
        }));
      } else if (chartType === 'classes') {
        sheetName = 'Classes_Remplissage';
        dataToExport = classStats.map((c) => ({
          'ID': c.id,
          'Nom Classe / Division': c.name,
          'Nombre de Matières': c.subjectCount,
          'Heures Planifiées (h)': c.totalAssignedHours,
          'Capacité Hebdomadaire (h)': c.weeklyMaxSlots,
          'Heures Libres': c.freeSlots,
          'Taux Remplissage (%)': `${c.fillRate}%`
        }));
      } else if (chartType === 'subjects') {
        sheetName = 'Disciplines_Poids';
        dataToExport = subjectStats.map((s) => ({
          'ID': s.id,
          'Matière / Discipline': s.name,
          'Volume Global (h/sem)': s.totalHours,
          'Nombre de Classes Desservies': s.classesCount,
          'Nombre Enseignants': s.teachersCount,
          'Poids Pédagogique (%)': `${s.percentage}%`
        }));
      } else {
        sheetName = 'Charge_Par_Jour';
        dataToExport = dailyStats.map((d) => ({
          'Jour': d.day,
          'Créneaux Occupés': d.slotsCount,
          'Capacité Théorique': d.capacity
        }));
      }

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileName = `Export_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportSuccessMsg("Fichier Excel (.xlsx) généré et téléchargé avec succès !");
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Erreur export Excel :", e);
    }
  };

  if (!isOpen) return null;

  const getHeaderInfo = () => {
    switch (chartType) {
      case 'teachers':
        return {
          title: "Graphique Global & Quotas des Enseignants",
          subtitle: `${safeTeachers.length} enseignants répertoriés • Suivi des heures contractuelles vs affectées`,
          icon: Users,
          color: "text-amber-500"
        };
      case 'classes':
        return {
          title: "Graphique Global & Volumes Horaires par Classe",
          subtitle: `${safeClasses.length} divisions • Taux de remplissage et distribution des cours`,
          icon: Building2,
          color: "text-blue-500"
        };
      case 'subjects':
        return {
          title: "Graphique Global & Poids Pédagogique par Matière",
          subtitle: `${safeSubjects.length} disciplines enseignées • Répartition globale des volumes horaires`,
          icon: BookOpen,
          color: "text-purple-500"
        };
      case 'weekly_load':
        return {
          title: "Graphique Global & Charge Quotidienne de l'Établissement",
          subtitle: `${safeActiveDays.length} jours d'ouverture • Volume de cours par journée`,
          icon: Calendar,
          color: "text-emerald-500"
        };
      default:
        return {
          title: "Graphique Global & Détails Analytiques",
          subtitle: "Vue d'ensemble détaillée pour le chef d'établissement",
          icon: Sparkles,
          color: "text-indigo-500"
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in duration-200 ${isLight ? "bg-slate-900/40 backdrop-blur-md" : "bg-slate-950/85 backdrop-blur-xl"}`}>
      
      {/* Conteneur Plein Écran Spacieux */}
      <div className={`relative w-full max-w-6xl h-[94vh] max-h-[920px] rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans transition-all ${isLight ? "bg-white border border-gray-200/90 text-gray-900 shadow-indigo-950/10" : "bg-slate-900 border border-white/15 text-slate-100"}`}>
        
        {/* Lueur d'ambiance */}
        <div className={`absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none ${isLight ? "opacity-30" : "opacity-100"}`} />
        <div className={`absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none ${isLight ? "opacity-30" : "opacity-100"}`} />

        {/* --- HEADER DE LA MODALE --- */}
        <header className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 z-10 flex-wrap transition-colors ${isLight ? "bg-gray-50/90 border-gray-200/80" : "bg-slate-950/60 border-white/10"}`}>
          <div className="flex items-center gap-3.5">
            <span className={`p-2.5 rounded-2xl flex items-center justify-center border ${isLight ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"}`}>
              <IconComponent className={`w-6 h-6 ${headerInfo.color}`} />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
                  {headerInfo.title}
                </h2>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
                  Vue Chef d'Établissement
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : isPremiumOrSchool
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/30 shadow-rose-600/20'
                  : 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border-rose-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger le rapport d'analyse détaillé en PDF" : "Réservé aux abonnés Premium et School"}
            >
              <FileText className={`w-4 h-4 ${isLight ? (isPremiumOrSchool ? 'text-white' : 'text-rose-600') : 'text-rose-400'}`} />
              <span>Export PDF</span>
              {!isPremiumOrSchool && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono flex items-center gap-0.5 border ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}
            </button>

            {/* BOUTON EXPORT EXCEL */}
            <button
              type="button"
              onClick={handleExportExcel}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-600/20'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : isPremiumOrSchool
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-emerald-600/20'
                  : 'bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border-emerald-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger les données d'analyse en format Excel .xlsx" : "Réservé aux abonnés Premium et School"}
            >
              <FileSpreadsheet className={`w-4 h-4 ${isLight ? (isPremiumOrSchool ? 'text-white' : 'text-emerald-600') : 'text-emerald-400'}`} />
              <span>Export Excel</span>
              {!isPremiumOrSchool && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono flex items-center gap-0.5 border ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ml-1 ${isLight ? "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200" : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10"}`}
              title="Fermer la vue détaillée"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* NOTIFICATION SUCCÈS D'EXPORTATION */}
        {exportSuccessMsg && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* --- BARRE D'OUTILS ET RECHERCHE --- */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 z-10 ${isLight ? "bg-gray-50/60 border-gray-200/60" : "bg-slate-950/30 border-white/10"}`}>
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={chartType === 'teachers' ? "Rechercher un enseignant ou discipline..." : "Rechercher une classe..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-4 py-2 text-xs transition-colors focus:outline-none ${isLight ? "bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-500 shadow-sm" : "bg-slate-950/80 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-500"}`}
            />
          </div>

          {chartType === 'teachers' && (
            <div className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs flex-wrap ${isLight ? "bg-gray-100 border-gray-200" : "bg-slate-950/60 border-white/5"}`}>
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-white/60' : 'text-gray-400 hover:text-white'
                }`}
              >
                Tous ({safeTeachers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('optimal')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'optimal'
                    ? 'bg-emerald-600 text-white'
                    : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-white/60' : 'text-gray-400 hover:text-white'
                }`}
              >
                Quota Exact ({optimalTeachersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('under')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'under'
                    ? 'bg-amber-600 text-white'
                    : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-white/60' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sous-chargés ({underTeachersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('over')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  filterStatus === 'over'
                    ? 'bg-red-600 text-white'
                    : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-white/60' : 'text-gray-400 hover:text-white'
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
              <div className={`p-5 rounded-2xl border shadow-sm space-y-3 ${isLight ? "bg-gradient-to-br from-amber-50/90 via-orange-50/30 to-indigo-50/40 border-amber-200 text-gray-800" : "bg-gradient-to-br from-amber-950/30 via-slate-900/60 to-indigo-950/30 border-amber-500/20 shadow-xl text-gray-300"}`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic Global &amp; Explication Pédagogique</span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Votre établissement compte <strong>{safeTeachers.length} enseignants</strong> pour un quota global contractuel de <strong>{totalContractHours} heures</strong> par semaine.
                  Actuellement, <strong>{totalAssignedHoursAll} heures</strong> sont affectées dans les classes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isLight ? "bg-emerald-50/90 border-emerald-200 text-emerald-950" : "bg-emerald-950/30 border-emerald-500/30"}`}>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className={`font-black text-sm ${isLight ? "text-emerald-950" : "text-white"}`}>{optimalTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-emerald-600 font-semibold">Quota respecté à 100%</div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isLight ? "bg-amber-50/90 border-amber-200 text-amber-950" : "bg-amber-950/30 border-amber-500/30"}`}>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className={`font-black text-sm ${isLight ? "text-amber-950" : "text-white"}`}>{underTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-amber-700 font-semibold">Sous-chargés (heures à allouer)</div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl border flex items-center gap-2.5 ${isLight ? "bg-red-50/90 border-red-200 text-red-950" : "bg-red-950/30 border-red-500/30"}`}>
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className={`font-black text-sm ${isLight ? "text-red-950" : "text-white"}`}>{overTeachersCount} Enseignants</div>
                      <div className="text-[11px] text-red-700 font-semibold">En surcharge horaire</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRAPHIQUE GLOBAL SPACIEUX */}
              <div className={`p-6 rounded-2xl border space-y-4 ${isLight ? "bg-white border-gray-200 shadow-sm text-gray-900" : "bg-slate-950/70 border-white/10 shadow-xl"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                      <BarChart2 className="w-4 h-4 text-indigo-500" />
                      <span>Graphique Global : Charge Réelle vs Quota Contractuel par Enseignant</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                      Visualisation élargie permettant d'afficher confortablement tous les professeurs de l'établissement sans chevauchement.
                    </p>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${isLight ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white/5 text-gray-400 border-white/5"}`}>
                    {filteredTeachers.length} affiché(s)
                  </span>
                </div>

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
                        <div key={t.id} className={`p-3 rounded-xl border transition-all space-y-1.5 ${isLight ? "bg-gray-50/80 border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50/20" : "bg-white/[0.02] border-white/5 hover:border-white/20"}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{t.name}</span>
                              <span className={`text-[11px] font-mono ${isLight ? "text-gray-500" : "text-gray-400"}`}>({t.subjectsTaught})</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className={isLight ? "text-gray-600" : "text-gray-400"}>
                                Affecté : <strong className={isLight ? "text-gray-900" : "text-white"}>{t.assignedHours}h</strong> / Quota : {t.quota}h
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                isExact
                                  ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                                  : isUnder
                                  ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                                  : 'bg-red-500/20 text-red-700 border border-red-500/30'
                              }`}>
                                {t.percent}% {isUnder ? `(Manque ${Math.abs(t.diff)}h)` : isOver ? `(+${t.diff}h excès)` : '✓ Conforme'}
                              </span>
                            </div>
                          </div>

                          <div className={`h-2 w-full rounded-full overflow-hidden flex border ${isLight ? "bg-gray-200 border-gray-200" : "bg-slate-900 border-white/5"}`}>
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
              <div className={`p-5 rounded-2xl border space-y-3 ${isLight ? "bg-indigo-50/80 border-indigo-200 text-gray-800 shadow-sm" : "bg-indigo-950/30 border-indigo-500/20 text-gray-300"}`}>
                <h4 className={`text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? "text-indigo-900" : "text-indigo-300"}`}>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Recommandations Pratiques d'Optimisation</span>
                </h4>
                <ul className={`text-xs space-y-2 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span><strong>Pour les professeurs sous-chargés :</strong> Rendez-vous à l'Étape 4 (Classes) pour leur attribuer les matières restantes de manière à saturer leur quota légal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
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
              <div className={`p-5 rounded-2xl border space-y-3 ${isLight ? "bg-gradient-to-br from-blue-50/90 via-sky-50/30 to-indigo-50/40 border-blue-200 text-gray-800 shadow-sm" : "bg-gradient-to-br from-blue-950/30 via-slate-900/60 to-indigo-950/30 border-blue-500/20 shadow-xl text-gray-300"}`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${isLight ? "text-blue-900" : "text-blue-300"}`}>
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic Global des Classes &amp; Remplissage</span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  L'établissement compte <strong>{safeClasses.length} classes</strong>. Chaque classe dispose d'une capacité théorique maximale de <strong>{safeActiveDays.length * safeTotalSlots} créneaux</strong> par semaine ({safeActiveDays.length} jours × {safeTotalSlots}h).
                </p>
              </div>

              {/* GRAPHIQUE GLOBAL SPACIEUX DES CLASSES */}
              <div className={`p-6 rounded-2xl border space-y-4 ${isLight ? "bg-white border-gray-200 shadow-sm text-gray-900" : "bg-slate-950/70 border-white/10 shadow-xl"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? "text-gray-900" : "text-white"}`}>
                      <BarChart2 className="w-4 h-4 text-blue-500" />
                      <span>Graphique Global : Volume Horaire &amp; Matières par Classe</span>
                    </h3>
                    <p className={`text-xs mt-0.5 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                      Visualisez en un coup d'œil la charge hebdomadaire de chaque niveau d'élèves.
                    </p>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${isLight ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white/5 text-gray-400 border-white/5"}`}>
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
                      <div key={c.id} className={`p-4 rounded-xl border transition-all space-y-2.5 ${isLight ? "bg-gray-50/80 border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50/20" : "bg-white/[0.02] border-white/5 hover:border-white/20"}`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold text-sm ${isLight ? "text-gray-900" : "text-white"}`}>{c.name}</span>
                            <span className="text-[11px] font-mono text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                              {c.subjectCount} cours liés
                            </span>
                          </div>
                          <div className="font-mono text-xs">
                            <span className={isLight ? "text-gray-500" : "text-gray-400"}>Total : </span>
                            <strong className="text-blue-500">{c.totalAssignedHours}h / {c.weeklyMaxSlots}h</strong>
                            <span className="text-gray-500 ml-2">({c.freeSlots}h libres)</span>
                          </div>
                        </div>

                        {/* Barre de distribution multicolore par matière */}
                        <div className={`h-2.5 w-full rounded-full overflow-hidden flex border ${isLight ? "bg-gray-200 border-gray-200" : "bg-slate-900 border-white/5"}`}>
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
                            <span key={sIdx} className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1.5 ${isLight ? "bg-white border-gray-200 text-gray-700 shadow-sm" : "bg-white/5 border-white/10 text-gray-300"}`}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sb.color }} />
                              <span>{sb.name} ({sb.hours}h) • <span className={isLight ? "text-gray-500" : "text-gray-400"}>{sb.teacher}</span></span>
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
              
              <div className={`p-5 rounded-2xl border space-y-3 ${isLight ? "bg-gradient-to-br from-purple-50/90 via-indigo-50/30 to-pink-50/40 border-purple-200 text-gray-800 shadow-sm" : "bg-gradient-to-br from-purple-950/30 via-slate-900/60 to-indigo-950/30 border-purple-500/20 shadow-xl text-gray-300"}`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${isLight ? "text-purple-900" : "text-purple-300"}`}>
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Diagnostic du Référentiel des Matières</span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Ce graphique mesure le volume d'heures total dispensé pour chaque discipline dans l'établissement scolaire.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectStats.map((sub: any) => (
                  <div key={sub.id} className={`p-4 rounded-xl border space-y-2 ${isLight ? "bg-white border-gray-200 shadow-sm text-gray-900" : "bg-slate-950/60 border-white/10"}`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className={`flex items-center gap-2 font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                        <span>{sub.name}</span>
                      </div>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded border ${isLight ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-purple-500/10 text-purple-300 border-purple-500/20"}`}>
                        {sub.percentage}% du total
                      </span>
                    </div>

                    <div className={`h-2 w-full rounded-full overflow-hidden ${isLight ? "bg-gray-200" : "bg-slate-900"}`}>
                      <div className="h-full rounded-full" style={{ width: `${sub.percentage}%`, backgroundColor: sub.color }} />
                    </div>

                    <div className="flex justify-between text-[11px] text-gray-400 font-mono pt-1">
                      <span>Volume : <strong className={isLight ? "text-gray-900" : "text-white"}>{sub.totalHours}h / sem</strong></span>
                      <span>Enseignée dans : <strong className={isLight ? "text-gray-900" : "text-white"}>{sub.classesCount} classe(s)</strong></span>
                      <span>Professeurs : <strong className={isLight ? "text-gray-900" : "text-white"}>{sub.teachersCount}</strong></span>
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
              
              <div className={`p-5 rounded-2xl border space-y-3 ${isLight ? "bg-gradient-to-br from-emerald-50/90 via-teal-50/30 to-indigo-50/40 border-emerald-200 text-gray-800 shadow-sm" : "bg-gradient-to-br from-emerald-950/30 via-slate-900/60 to-indigo-950/30 border-emerald-500/20 shadow-xl text-gray-300"}`}>
                <div className={`flex items-center gap-2 font-bold text-sm ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>
                  <Info className="w-5 h-5 shrink-0" />
                  <span>Répartition de l'Occupation par Journée</span>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Visualisez l'équilibre de programmation des cours entre le début et la fin de semaine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyStats.map((d: any) => (
                  <div key={d.day} className={`p-4 rounded-xl border space-y-2 ${isLight ? "bg-white border-gray-200 shadow-sm text-gray-900" : "bg-slate-950/60 border-white/10"}`}>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={`font-bold ${isLight ? "text-gray-900" : "text-white"}`}>{d.day}</span>
                      <span className="text-emerald-500 font-mono">{d.slotsCount} cours programmés</span>
                    </div>
                    <div className={`text-[11px] ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                      Capacité totale établissement : {d.capacity} créneaux
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

        {/* --- PIED DE PAGE AVEC ACTIONS RAPIDES --- */}
        <footer className={`px-6 py-3.5 border-t flex items-center justify-between gap-4 shrink-0 z-10 flex-wrap ${isLight ? "bg-gray-50/90 border-gray-200/80 text-gray-600" : "bg-slate-950/60 border-white/10 text-gray-400"}`}>
          <div className="text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Données synchronisées en temps réel • Exports PDF &amp; Excel certifiés direction</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportPDF}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                  : isPremiumOrSchool
                  ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border-rose-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                  : isPremiumOrSchool
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer ml-2"
            >
              Fermer la vue détaillée
            </button>
          </div>
        </footer>

      </div>

      {/* --- MODAL PROMPT D'UPGRADE SI FORMULE GRATUITE OU STANDARD --- */}
      {isUpgradePromptOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className={`border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative ${isLight ? "bg-white border-amber-300 text-gray-900" : "bg-slate-900 border-amber-500/30 text-white"}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isLight ? "border-gray-200" : "border-white/10"}`}>
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                <Crown className="w-5 h-5 text-amber-500" />
                <span>Fonctionnalité Premium &amp; School</span>
              </div>
              <button
                type="button"
                onClick={() => setIsUpgradePromptOpen(false)}
                className={`p-1 rounded-lg ${isLight ? "bg-gray-100 text-gray-500 hover:text-gray-900" : "bg-white/5 text-gray-400 hover:text-white"}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-3 text-xs leading-relaxed ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              <div className={`p-4 rounded-2xl border space-y-2 ${isLight ? "bg-amber-50 border-amber-200 text-amber-950" : "bg-amber-950/30 border-amber-500/20"}`}>
                <p className="font-bold text-amber-600 text-sm">
                  Exportations Analytiques Réservées aux Abonnés VIP
                </p>
                <p>
                  L'exportation complète des détails graphiques en format <strong>PDF Haute Définition</strong> et <strong>Classeur Excel (.xlsx)</strong> est un outil avancé d'aide à la décision réservé aux formules <strong>Premium</strong> et <strong>School</strong>.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Rapports d'audits PDF prêts pour le Rectorat / Direction</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Tableaux Excel (.xlsx) avec calculs automatiques des quotas</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Générateur IA &amp; Multi-formats illimités</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradePromptOpen(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold ${isLight ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-white/5 hover:bg-white/10 text-gray-300"}`}
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
