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
  const [exportColorMode, setExportColorMode] = useState<'color' | 'bw'>('color');
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

  // --- INTERPRÉTATION STATISTIQUE & DIAGNOSTIC DE DIRECTION ---
  const getChefInterpretation = useMemo(() => {
    if (chartType === 'teachers') {
      const totalContract = safeTeachers.reduce((acc, t) => acc + Number(t?.weeklyQuota || 18), 0);
      const totalAssigned = teacherStats.reduce((acc, t) => acc + (t?.assignedHours || 0), 0);
      const netDiff = totalAssigned - totalContract;
      const optimalCount = teacherStats.filter((t) => t?.status === 'optimal').length;
      const underCount = teacherStats.filter((t) => t?.status === 'under').length;
      const overCount = teacherStats.filter((t) => t?.status === 'over').length;
      const underHours = teacherStats.filter((t) => t?.status === 'under').reduce((acc, t) => acc + Math.abs(t.diff), 0);
      const overHours = teacherStats.filter((t) => t?.status === 'over').reduce((acc, t) => acc + t.diff, 0);
      const complianceRate = safeTeachers.length > 0 ? Math.round((optimalCount / safeTeachers.length) * 100) : 0;

      return {
        title: "Audit Stratégique des Quotas & Charges Enseignants",
        summary: `L'établissement compte ${safeTeachers.length} enseignants totalisant un volume contractuel de ${totalContract}h/semaine contre ${totalAssigned}h effectivement affectées (${netDiff >= 0 ? `+${netDiff}h en sur-service global` : `${netDiff}h en sous-service global`}). Le taux de conformité statutaire exacte est de ${complianceRate}% (${optimalCount} conformes, ${underCount} sous-chargés, ${overCount} en dépassement).`,
        kpis: [
          { label: "Corps Enseignant", value: `${safeTeachers.length}`, hint: "Total professeurs", status: 'neutral' },
          { label: "Quota Contractuel", value: `${totalContract}h`, hint: "Obligation hebdo", status: 'neutral' },
          { label: "Heures Affectées", value: `${totalAssigned}h`, hint: netDiff >= 0 ? `+${netDiff}h HSA` : `${netDiff}h déficit`, status: netDiff === 0 ? 'good' : netDiff > 0 ? 'warn' : 'bad' },
          { label: "Taux Conformité", value: `${complianceRate}%`, hint: `${optimalCount}/${safeTeachers.length} au quota`, status: complianceRate >= 80 ? 'good' : 'warn' }
        ],
        highlights: [
          `Conformité : ${optimalCount} / ${safeTeachers.length} enseignants respectent rigoureusement leur quota réglementaire (${complianceRate}% de l'équipe).`,
          underCount > 0 ? `Sous-service : ${underCount} enseignant(s) ont un déficit cumulé de ${underHours}h/semaine à réallouer ou mutualiser.` : "Conformité totale : aucun enseignant n'est en sous-service.",
          overCount > 0 ? `Surcharge / Heures Sup. : ${overCount} enseignant(s) cumulent ${overHours}h supplémentaires nécessitant un arbitrage (HSA).` : "Aucune surcharge d'heures constatée."
        ],
        recommendations: [
          "Rééquilibrer en priorité les affectations des enseignants en sous-service avant toute ouverture de vacations externes.",
          "Auditer l'étalement des créneaux des enseignants en surcharge (+h) pour prévenir la fatigue et les risques de chevauchement."
        ]
      };
    }

    if (chartType === 'classes') {
      const totalClasses = safeClasses.length;
      const totalAssignedHours = classStats.reduce((acc, c) => acc + (c?.totalAssignedHours || 0), 0);
      const totalCapacity = classStats.reduce((acc, c) => acc + (c?.weeklyMaxSlots || 0), 0);
      const globalFillRate = totalCapacity > 0 ? Math.round((totalAssignedHours / totalCapacity) * 100) : 0;
      const optimalClassesCount = classStats.filter((c) => c?.fillRate >= 90 && c?.fillRate <= 105).length;
      const underClassesCount = classStats.filter((c) => c?.fillRate < 90).length;
      const overClassesCount = classStats.filter((c) => c?.fillRate > 105).length;

      return {
        title: "Diagnostic de Remplissage & Volumes Horaires des Divisions",
        summary: `Sur ${totalClasses} classes actives, le volume horaire programmé s'élève à ${totalAssignedHours}h sur un potentiel d'accueil de ${totalCapacity}h, soit un taux d'occupation global de ${globalFillRate}%. ${optimalClassesCount} division(s) affichent une grille pédagogique équilibrée.`,
        kpis: [
          { label: "Divisions / Classes", value: `${totalClasses}`, hint: "Structures actives", status: 'neutral' },
          { label: "Heures Planifiées", value: `${totalAssignedHours}h`, hint: `Sur ${totalCapacity}h max`, status: 'neutral' },
          { label: "Taux Remplissage", value: `${globalFillRate}%`, hint: "Occupation globale", status: globalFillRate >= 85 ? 'good' : 'warn' },
          { label: "Grilles Équilibrées", value: `${optimalClassesCount}`, hint: `Sur ${totalClasses} classes`, status: optimalClassesCount === totalClasses ? 'good' : 'warn' }
        ],
        highlights: [
          `Taux d'occupation moyen : ${globalFillRate}% de la capacité totale de l'établissement exploitée.`,
          underClassesCount > 0 ? `${underClassesCount} division(s) présentent des créneaux libres (<90%) disponibles pour du soutien.` : "Toutes les divisions disposent d'un volume horaire complet.",
          `Moyenne hebdomadaire de ${totalClasses > 0 ? (totalAssignedHours / totalClasses).toFixed(1) : 0}h de cours effectifs par classe.`
        ],
        recommendations: [
          "Vérifier la complétude des maquettes pédagogiques sur les divisions affichant un volume d'heures inférieur aux seuils officiels.",
          "Valoriser les créneaux libres identifiés pour organiser les séances de devoirs surveillés ou activités de remédiation."
        ]
      };
    }

    if (chartType === 'subjects') {
      const totalSubjHours = subjectStats.reduce((acc, s) => acc + (s?.totalHours || 0), 0);
      const sortedByHours = [...subjectStats].sort((a, b) => (b?.totalHours || 0) - (a?.totalHours || 0));
      const topSubject = sortedByHours[0];
      const activeSubjectsCount = subjectStats.filter((s) => (s?.totalHours || 0) > 0).length;

      return {
        title: "Cartographie et Équilibre des Pôles Disciplinaires",
        summary: `L'offre d'enseignement regroupe ${safeSubjects.length} disciplines dont ${activeSubjectsCount} actives, représentant une masse de ${totalSubjHours}h/semaine. La discipline dominante est "${topSubject?.name || 'Matière'}" avec ${topSubject?.totalHours || 0}h (${topSubject?.percentage || 0}% de l'ensemble).`,
        kpis: [
          { label: "Disciplines Actives", value: `${activeSubjectsCount}`, hint: `Sur ${safeSubjects.length} matières`, status: 'neutral' },
          { label: "Masse Globale", value: `${totalSubjHours}h`, hint: "Total heures/sem", status: 'neutral' },
          { label: "Discipline Clé", value: `${(topSubject?.name || '-').substring(0, 14)}`, hint: `${topSubject?.totalHours || 0}h (${topSubject?.percentage || 0}%)`, status: 'good' },
          { label: "Moyenne / Matière", value: `${activeSubjectsCount > 0 ? (totalSubjHours / activeSubjectsCount).toFixed(1) : 0}h`, hint: "Volume moyen hebdo", status: 'neutral' }
        ],
        highlights: [
          `Discipline dominante : "${topSubject?.name || '-'}" totalise ${topSubject?.totalHours || 0}h/semaine dispensées dans ${topSubject?.classesCount || 0} classes.`,
          `Diversité pédagogique : ${activeSubjectsCount} matières disposent d'au moins un enseignant titulaire attitré.`,
          `Équilibre : les 3 disciplines majeures concentrent ${(sortedByHours.slice(0, 3).reduce((acc, s) => acc + (s?.percentage || 0), 0))}% de l'offre globale.`
        ],
        recommendations: [
          "Harmoniser la concertation d'équipe sur les disciplines à fort volume d'enseignement pour assurer la cohérence des progressions.",
          "Veiller à une alternance équilibrée entre matières scientifiques, littéraires et artistiques sur la semaine des élèves."
        ]
      };
    }

    // Default: weekly_load
    const totalWeekSlots = dailyStats.reduce((acc, d) => acc + (d?.slotsCount || 0), 0);
    const sortedDays = [...dailyStats].sort((a, b) => (b?.slotsCount || 0) - (a?.slotsCount || 0));
    const busiestDay = sortedDays[0];
    const lightestDay = sortedDays[sortedDays.length - 1];
    const avgSlotsPerDay = safeActiveDays.length > 0 ? (totalWeekSlots / safeActiveDays.length).toFixed(1) : '0';

    return {
      title: "Rythme Hebdomadaire & Gestion des Flux Établissement",
      summary: `L'établissement programme ${totalWeekSlots} séances réparties sur ${safeActiveDays.length} jours d'ouverture (moyenne : ${avgSlotsPerDay} cours/jour). La journée la plus dense est le ${busiestDay?.day || 'Lundi'} (${busiestDay?.slotsCount || 0} cours) et la plus allégée est le ${lightestDay?.day || 'Vendredi'} (${lightestDay?.slotsCount || 0} cours).`,
      kpis: [
        { label: "Séances / Semaine", value: `${totalWeekSlots}`, hint: "Total cours planifiés", status: 'neutral' },
        { label: "Moyenne / Jour", value: `${avgSlotsPerDay}`, hint: "Séances quotidiennes", status: 'neutral' },
        { label: "Jour de Pointe", value: `${busiestDay?.day || '-'}`, hint: `${busiestDay?.slotsCount || 0} cours`, status: 'warn' },
        { label: "Jour le plus Allégé", value: `${lightestDay?.day || '-'}`, hint: `${lightestDay?.slotsCount || 0} cours`, status: 'good' }
      ],
      highlights: [
        `Journée la plus sollicitée : ${busiestDay?.day || '-'} avec ${busiestDay?.slotsCount || 0} cours simultanés.`,
        `Journée de respiration : ${lightestDay?.day || '-'} avec ${lightestDay?.slotsCount || 0} séances planifiées.`,
        `Différentiel de flux : écart de ${Math.max(0, (busiestDay?.slotsCount || 0) - (lightestDay?.slotsCount || 0))} séances entre le jour le plus chargé et le plus calme.`
      ],
      recommendations: [
        "Lisser les séances de la journée de pointe pour éviter l'engorgement des infrastructures partagées (laboratoires, cantine, gymnase).",
        "Préserver la régularité des fins de semaine pour favoriser le travail personnel et la récupération des élèves."
      ]
    };
  }, [chartType, safeTeachers, safeClasses, safeSubjects, teacherStats, classStats, subjectStats, dailyStats, safeActiveDays]);

  // --- EXPORT PDF STRICTEMENT OPTIMISÉ FORMAT A4 (1 PAGE UNIQUE) ---
  const handleExportPDF = () => {
    if (!isPremiumOrSchool) {
      setIsUpgradePromptOpen(true);
      return;
    }

    try {
      // Dimensions A4 : 210 x 297 mm
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const isBW = exportColorMode === 'bw';
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }) + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const interp = getChefInterpretation;

      // Palette dynamique selon le mode (Couleur vs Noir & Blanc)
      const colPrimary = isBW ? [15, 23, 42] : [79, 70, 229]; // #4f46e5
      const colDark = isBW ? [0, 0, 0] : [15, 23, 42];
      const colMuted = isBW ? [71, 85, 105] : [100, 116, 139];
      const colCardBg = isBW ? [248, 250, 252] : [245, 247, 255];
      const colCardBorder = isBW ? [203, 213, 225] : [199, 210, 254];
      const colBoxBg = isBW ? [248, 250, 252] : [245, 243, 255];
      const colBoxBorder = isBW ? [15, 23, 42] : [99, 102, 241];
      const colHeaderTableBg = isBW ? [15, 23, 42] : [30, 41, 59];

      // 1. BANDEAU D'EN-TÊTE SUPÉRIEUR (Y: 10 - 24 mm)
      doc.setFillColor(colPrimary[0], colPrimary[1], colPrimary[2]);
      doc.rect(14, 10, 3, 13, 'F'); // Petit accent vertical gauche

      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(schoolName.toUpperCase(), 19, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
      doc.text(interp.title, 19, 20.5);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 25, 196, 25);

      // 2. BLOCS KPI SYNTHÉTIQUES (Y: 27 - 39 mm, 4 Cartes)
      const kpiCards = interp.kpis || [];
      const cardWidth = 43.5;
      const cardGap = 2.5;
      kpiCards.slice(0, 4).forEach((kpi, idx) => {
        const cardX = 14 + idx * (cardWidth + cardGap);
        doc.setFillColor(colCardBg[0], colCardBg[1], colCardBg[2]);
        doc.setDrawColor(colCardBorder[0], colCardBorder[1], colCardBorder[2]);
        doc.setLineWidth(0.25);
        doc.roundedRect(cardX, 27, cardWidth, 12, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text((kpi.label || '').toUpperCase(), cardX + 3, 31);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        if (isBW) {
          doc.setTextColor(0, 0, 0);
        } else {
          if (kpi.status === 'good') doc.setTextColor(16, 185, 129);
          else if (kpi.status === 'warn') doc.setTextColor(217, 119, 6);
          else if (kpi.status === 'bad') doc.setTextColor(225, 29, 72);
          else doc.setTextColor(79, 70, 229);
        }
        doc.text(kpi.value || '-', cardX + 3, 35.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text(kpi.hint || '', cardX + 3, 38);
      });

      // 3. GRAPHIQUE STATISTIQUE VECTORIEL INTÉGRÉ (Y: 41 - 83 mm, Hauteur 42mm)
      doc.setFillColor(isBW ? 255 : 252, isBW ? 255 : 253, isBW ? 255 : 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.roundedRect(14, 41, 182, 42, 2, 2, 'FD');

      // En-tête du graphique
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.text("APERÇU STATISTIQUE VISUEL", 18, 46);

      // Légende en haut à droite du graphique
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      if (chartType === 'teachers') {
        doc.setFillColor(isBW ? 203 : 199, isBW ? 213 : 210, isBW ? 225 : 254);
        doc.rect(130, 43.5, 4, 2.5, 'F');
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text("Quota Contractuel", 136, 45.5);

        doc.setFillColor(colPrimary[0], colPrimary[1], colPrimary[2]);
        doc.rect(165, 43.5, 4, 2.5, 'F');
        doc.text("Heures Affectées", 171, 45.5);
      } else if (chartType === 'classes') {
        doc.setFillColor(isBW ? 15 : 16, isBW ? 23 : 185, isBW ? 42 : 129);
        doc.rect(145, 43.5, 4, 2.5, 'F');
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text("Taux de Remplissage (%)", 151, 45.5);
      } else if (chartType === 'subjects') {
        doc.setFillColor(colPrimary[0], colPrimary[1], colPrimary[2]);
        doc.rect(145, 43.5, 4, 2.5, 'F');
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text("Poids Pédagogique (%)", 151, 45.5);
      } else {
        doc.setFillColor(isBW ? 15 : 16, isBW ? 23 : 185, isBW ? 42 : 129);
        doc.rect(145, 43.5, 4, 2.5, 'F');
        doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
        doc.text("Créneaux occupés / jour", 151, 45.5);
      }

      // Rendu des barres selon le type de graphique
      if (chartType === 'teachers') {
        const topTeachers = teacherStats.slice(0, 6);
        const barMaxVal = Math.max(25, ...topTeachers.map(t => Math.max(t.quota, t.assignedHours)));
        const maxBarW = 95;

        topTeachers.forEach((t, i) => {
          const barY = 50 + i * 5.2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((t.name || '').substring(0, 18), 18, barY + 2.5);

          // Barre Quota
          const quotaW = (t.quota / barMaxVal) * maxBarW;
          doc.setFillColor(isBW ? 226 : 224, isBW ? 232 : 231, isBW ? 240 : 255);
          doc.rect(58, barY, quotaW, 2, 'F');

          // Barre Affecté
          const assignW = (t.assignedHours / barMaxVal) * maxBarW;
          if (isBW) {
            doc.setFillColor(15, 23, 42);
          } else {
            if (t.status === 'optimal') doc.setFillColor(16, 185, 129);
            else if (t.status === 'under') doc.setFillColor(245, 158, 11);
            else doc.setFillColor(225, 29, 72);
          }
          doc.rect(58, barY + 2.2, assignW, 2, 'F');

          // Texte chiffres
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text(`${t.assignedHours}h / ${t.quota}h (${t.percent}%)`, 160, barY + 2.8);
        });

      } else if (chartType === 'classes') {
        const topClasses = classStats.slice(0, 6);
        const maxBarW = 100;

        topClasses.forEach((c, i) => {
          const barY = 50 + i * 5.2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((c.name || '').substring(0, 18), 18, barY + 2.5);

          // Barre de fond
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(58, barY, maxBarW, 3.5, 0.8, 0.8, 'F');

          // Barre de remplissage
          const fillW = Math.min(maxBarW, (c.fillRate / 100) * maxBarW);
          if (isBW) {
            doc.setFillColor(30, 41, 59);
          } else {
            doc.setFillColor(c.fillRate >= 95 ? 16 : 79, c.fillRate >= 95 ? 185 : 70, c.fillRate >= 95 ? 129 : 229);
          }
          if (fillW > 0) {
            doc.roundedRect(58, barY, fillW, 3.5, 0.8, 0.8, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${c.fillRate}% (${c.totalAssignedHours}h)`, 164, barY + 2.7);
        });

      } else if (chartType === 'subjects') {
        const topSubjs = subjectStats.slice(0, 6);
        const maxBarW = 100;

        topSubjs.forEach((s, i) => {
          const barY = 50 + i * 5.2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((s.name || '').substring(0, 18), 18, barY + 2.5);

          // Barre de fond
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(58, barY, maxBarW, 3.5, 0.8, 0.8, 'F');

          const fillW = Math.min(maxBarW, (s.percentage / 100) * maxBarW * 2.5); // Échelle visuelle amplifiée
          doc.setFillColor(isBW ? 30 : 139, isBW ? 41 : 92, isBW ? 59 : 246);
          if (fillW > 0) {
            doc.roundedRect(58, barY, fillW, 3.5, 0.8, 0.8, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${s.percentage}% (${s.totalHours}h)`, 164, barY + 2.7);
        });

      } else {
        // weekly_load
        const days = dailyStats;
        const maxSlots = Math.max(1, ...days.map(d => d.slotsCount));
        const colWidth = 22;
        const startX = 24;

        days.forEach((d, i) => {
          const dayX = startX + i * (colWidth + 4);
          const barHeight = Math.max(2, (d.slotsCount / maxSlots) * 22);
          const barY = 74 - barHeight;

          doc.setFillColor(isBW ? 30 : 16, isBW ? 41 : 185, isBW ? 59 : 129);
          doc.roundedRect(dayX, barY, colWidth, barHeight, 1, 1, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${d.slotsCount}h`, dayX + colWidth / 2, barY - 1.5, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text(d.day.substring(0, 3), dayX + colWidth / 2, 78, { align: 'center' });
        });
      }

      // 4. TABLEAU DE DONNÉES SYNTHÉTIQUE (Y: 86 - 206 mm, compacté pour A4 unique)
      doc.setFillColor(colHeaderTableBg[0], colHeaderTableBg[1], colHeaderTableBg[2]);
      doc.roundedRect(14, 86, 182, 6.5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      let currentY = 91;

      let tableEndY = currentY;

      if (chartType === 'teachers') {
        doc.text("ENSEIGNANT", 18, currentY);
        doc.text("DISCIPLINE(S)", 68, currentY);
        doc.text("QUOTA", 125, currentY);
        doc.text("AFFECTÉ", 145, currentY);
        doc.text("STATUT / ÉCART", 168, currentY);
        currentY += 4.5;

        // Limiter à max 16 lignes pour tenir rigoureusement sur A4
        const displayItems = teacherStats.slice(0, 16);
        displayItems.forEach((t, i) => {
          const rowY = currentY + i * 5.8;
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, rowY - 2.8, 182, 5.8, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((t.name || '').substring(0, 24), 18, rowY + 1.2);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text((t.subjectsTaught || '-').substring(0, 28), 68, rowY + 1.2);

          doc.text(`${t.quota}h`, 128, rowY + 1.2);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${t.assignedHours}h`, 148, rowY + 1.2);

          if (isBW) {
            if (t.status === 'optimal') doc.text("[Conforme]", 168, rowY + 1.2);
            else if (t.status === 'under') doc.text(`[- ${Math.abs(t.diff)}h]`, 168, rowY + 1.2);
            else doc.text(`[+ ${t.diff}h Surcharge]`, 168, rowY + 1.2);
          } else {
            if (t.status === 'optimal') {
              doc.setTextColor(16, 185, 129);
              doc.text("Conforme (OK)", 168, rowY + 1.2);
            } else if (t.status === 'under') {
              doc.setTextColor(217, 119, 6);
              doc.text(`-${Math.abs(t.diff)}h (Déficit)`, 168, rowY + 1.2);
            } else {
              doc.setTextColor(225, 29, 72);
              doc.text(`+${t.diff}h (HSA)`, 168, rowY + 1.2);
            }
          }
        });
        tableEndY = currentY + displayItems.length * 5.8;

      } else if (chartType === 'classes') {
        doc.text("CLASSE / DIVISION", 18, currentY);
        doc.text("DISCIPLINES ATTRIBUÉES", 70, currentY);
        doc.text("HEURES PLANIFIÉES", 136, currentY);
        doc.text("REMPLISSAGE", 170, currentY);
        currentY += 4.5;

        const displayItems = classStats.slice(0, 16);
        displayItems.forEach((c, i) => {
          const rowY = currentY + i * 5.8;
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, rowY - 2.8, 182, 5.8, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((c.name || '').substring(0, 24), 18, rowY + 1.2);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text(`${c.subjectCount} matières répertoriées`, 70, rowY + 1.2);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${c.totalAssignedHours}h / ${c.weeklyMaxSlots}h`, 136, rowY + 1.2);

          if (isBW) {
            doc.text(`${c.fillRate}%`, 172, rowY + 1.2);
          } else {
            doc.setTextColor(c.fillRate >= 95 ? 16 : 79, c.fillRate >= 95 ? 185 : 70, c.fillRate >= 95 ? 129 : 229);
            doc.text(`${c.fillRate}%`, 172, rowY + 1.2);
          }
        });
        tableEndY = currentY + displayItems.length * 5.8;

      } else if (chartType === 'subjects') {
        doc.text("MATIÈRE / DISCIPLINE", 18, currentY);
        doc.text("VOLUME HEBDO GLOBAL", 75, currentY);
        doc.text("DIVISIONS DESSERVIES", 132, currentY);
        doc.text("POIDS %", 172, currentY);
        currentY += 4.5;

        const displayItems = subjectStats.slice(0, 16);
        displayItems.forEach((s, i) => {
          const rowY = currentY + i * 5.8;
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, rowY - 2.8, 182, 5.8, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text((s.name || '').substring(0, 26), 18, rowY + 1.2);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text(`${s.totalHours}h / semaine`, 75, rowY + 1.2);
          doc.text(`${s.classesCount} division(s)`, 132, rowY + 1.2);

          doc.setFont('helvetica', 'bold');
          if (isBW) {
            doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          } else {
            doc.setTextColor(139, 92, 246);
          }
          doc.text(`${s.percentage}%`, 172, rowY + 1.2);
        });
        tableEndY = currentY + displayItems.length * 5.8;

      } else {
        // weekly_load
        doc.text("JOUR D'OUVERTURE", 18, currentY);
        doc.text("SÉANCES PLANIFIÉES", 75, currentY);
        doc.text("CAPACITÉ THÉORIQUE ÉTABLISSEMENT", 125, currentY);
        doc.text("TAUX OCCUPATION", 170, currentY);
        currentY += 4.5;

        dailyStats.forEach((d, i) => {
          const rowY = currentY + i * 6.5;
          if (i % 2 === 1) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, rowY - 2.8, 182, 6.5, 'F');
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(d.day, 18, rowY + 1.5);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
          doc.text(`${d.slotsCount} créneaux de cours`, 75, rowY + 1.5);
          doc.text(`${d.capacity} créneaux potentiels`, 125, rowY + 1.5);

          const occ = d.capacity > 0 ? Math.round((d.slotsCount / d.capacity) * 100) : 0;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(colDark[0], colDark[1], colDark[2]);
          doc.text(`${occ}%`, 172, rowY + 1.5);
        });
        tableEndY = currentY + dailyStats.length * 6.5;
      }

      // 5. ENCADRÉ EXÉCUTIF POSITIONNÉ DYNAMIQUEMENT (ÉVITE TOUT GRAND ESPACE BLANC)
      const diagBoxStartY = Math.min(218, tableEndY + 5);

      // Calcul préalable de la hauteur requise pour le texte
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const splitSummary = doc.splitTextToSize(interp.summary, 168);

      const splitHls = (interp.highlights || []).slice(0, 2).map((hl) => {
        const cleanHl = (hl || '').replace(/[\u2022\u2192\u2794\u2713]/g, '-');
        return doc.splitTextToSize(`- ${cleanHl}`, 168);
      });

      const splitRecs = (interp.recommendations || []).slice(0, 2).map((rec) => {
        const cleanRec = (rec || '').replace(/[\u2022\u2192\u2794\u2713]/g, '>');
        return doc.splitTextToSize(`> ${cleanRec}`, 168);
      });

      let totalContentHeight = 6 + (splitSummary.length * 3.4) + 4.2;
      splitHls.forEach(h => { totalContentHeight += h.length * 3.3 + 0.6; });
      totalContentHeight += 4.2;
      splitRecs.forEach(r => { totalContentHeight += r.length * 3.3 + 0.6; });
      totalContentHeight += 6;

      const maxAllowedHeight = 281 - diagBoxStartY;
      const diagBoxHeight = Math.min(maxAllowedHeight, Math.max(50, totalContentHeight));

      doc.setFillColor(colBoxBg[0], colBoxBg[1], colBoxBg[2]);
      doc.setDrawColor(colBoxBorder[0], colBoxBorder[1], colBoxBorder[2]);
      doc.setLineWidth(0.35);
      doc.roundedRect(14, diagBoxStartY, 182, diagBoxHeight, 2, 2, 'FD');

      // Bordure latérale accentuée gauche
      doc.setFillColor(colBoxBorder[0], colBoxBorder[1], colBoxBorder[2]);
      doc.roundedRect(14, diagBoxStartY, 3, diagBoxHeight, 1, 1, 'F');

      let diagY = diagBoxStartY + 5.5;

      // Titre de l'encadré
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.text("DIAGNOSTIC STRATÉGIQUE & INTERPRÉTATION DE LA DIRECTION", 21, diagY);
      diagY += 4.5;

      // Synthèse rédigée
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.text(splitSummary, 21, diagY);
      diagY += splitSummary.length * 3.4 + 2.5;

      // Constats majeurs
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.text("CONSTATS MAJEURS :", 21, diagY);
      diagY += 3.8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(colMuted[0], colMuted[1], colMuted[2]);
      splitHls.forEach((splitHl) => {
        doc.text(splitHl, 21, diagY);
        diagY += splitHl.length * 3.3 + 0.6;
      });

      diagY += 1.5;

      // Recommandations & actions prioritaires
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      doc.text("PRÉCONISATIONS & ACTIONS PRIORITAIRES :", 21, diagY);
      diagY += 3.8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(colDark[0], colDark[1], colDark[2]);
      splitRecs.forEach((splitRec) => {
        doc.text(splitRec, 21, diagY);
        diagY += splitRec.length * 3.3 + 0.6;
      });

      // 6. PIED DE PAGE STRICTEMENT A4 (Y: 286 mm)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Généré par Planora. www.planora.com  •  Direction ${schoolName}`, 14, 286);
      doc.text(`Édité le ${formattedDateTime}  •  Page 1/1`, 196, 286, { align: 'right' });

      const fileName = `Rapport_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}_${exportColorMode}.pdf`;
      doc.save(fileName);
      setExportSuccessMsg(`Rapport PDF (${exportColorMode === 'bw' ? 'Noir & Blanc' : 'Couleur'}) téléchargé en format A4 strict !`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Erreur export PDF :", e);
    }
  };

  // --- EXPORT WORD FORMATÉ & ENRICHI (.DOC) ---
  const handleExportWord = () => {
    if (!isPremiumOrSchool) {
      setIsUpgradePromptOpen(true);
      return;
    }

    try {
      const isBW = exportColorMode === 'bw';
      const interp = getChefInterpretation;
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }) + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      const themeColors = isBW
        ? { primary: '#0f172a', bg: '#f8fafc', border: '#cbd5e1', accent: '#334155', text: '#000000', muted: '#475569' }
        : { primary: '#4f46e5', bg: '#f5f3ff', border: '#c7d2fe', accent: '#6366f1', text: '#0f172a', muted: '#475569' };

      // Construction du tableau de données en HTML Word
      let tableRowsHtml = '';
      if (chartType === 'teachers') {
        tableRowsHtml = `
          <thead>
            <tr style="background-color: ${themeColors.primary}; color: #ffffff; text-align: left;">
              <th style="padding: 6px 10px; font-size: 11px;">Enseignant</th>
              <th style="padding: 6px 10px; font-size: 11px;">Disciplines</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Quota</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Affecté</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Jauge</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Statut</th>
            </tr>
          </thead>
          <tbody>
            ${teacherStats.map((t, idx) => `
              <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 10px; font-weight: bold; color: ${themeColors.text}; font-size: 10px;">${t.name}</td>
                <td style="padding: 6px 10px; color: ${themeColors.muted}; font-size: 10px;">${t.subjectsTaught}</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px;">${t.quota}h</td>
                <td style="padding: 6px 10px; text-align: center; font-weight: bold; font-size: 10px;">${t.assignedHours}h</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px;">
                  <div style="background: #e2e8f0; width: 60px; height: 8px; border-radius: 4px; display: inline-block; overflow: hidden;">
                    <div style="background: ${isBW ? '#0f172a' : (t.status === 'optimal' ? '#10b981' : t.status === 'under' ? '#f59e0b' : '#e11d48')}; width: ${Math.min(100, t.percent)}%; height: 100%;"></div>
                  </div>
                  <span style="font-size: 9px; margin-left: 4px;">${t.percent}%</span>
                </td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px; font-weight: bold; color: ${isBW ? '#0f172a' : (t.status === 'optimal' ? '#059669' : t.status === 'under' ? '#d97706' : '#e11d48')};">
                  ${t.status === 'optimal' ? '✓ Conforme' : t.status === 'under' ? `-${Math.abs(t.diff)}h` : `+${t.diff}h`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;
      } else if (chartType === 'classes') {
        tableRowsHtml = `
          <thead>
            <tr style="background-color: ${themeColors.primary}; color: #ffffff; text-align: left;">
              <th style="padding: 6px 10px; font-size: 11px;">Division / Classe</th>
              <th style="padding: 6px 10px; font-size: 11px;">Matières</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Heures Planifiées</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Capacité</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Remplissage</th>
            </tr>
          </thead>
          <tbody>
            ${classStats.map((c, idx) => `
              <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 10px; font-weight: bold; color: ${themeColors.text}; font-size: 10px;">${c.name}</td>
                <td style="padding: 6px 10px; color: ${themeColors.muted}; font-size: 10px;">${c.subjectCount} matières</td>
                <td style="padding: 6px 10px; text-align: center; font-weight: bold; font-size: 10px;">${c.totalAssignedHours}h</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px;">${c.weeklyMaxSlots}h</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px; font-weight: bold; color: ${isBW ? '#0f172a' : (c.fillRate >= 90 ? '#059669' : '#d97706')};">
                  ${c.fillRate}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;
      } else if (chartType === 'subjects') {
        tableRowsHtml = `
          <thead>
            <tr style="background-color: ${themeColors.primary}; color: #ffffff; text-align: left;">
              <th style="padding: 6px 10px; font-size: 11px;">Discipline</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Volume Hebdo</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Divisions Desservies</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Poids %</th>
            </tr>
          </thead>
          <tbody>
            ${subjectStats.map((s, idx) => `
              <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 10px; font-weight: bold; color: ${themeColors.text}; font-size: 10px;">${s.name}</td>
                <td style="padding: 6px 10px; text-align: center; font-weight: bold; font-size: 10px;">${s.totalHours}h/sem</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px;">${s.classesCount} division(s)</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px; font-weight: bold; color: ${themeColors.primary};">
                  ${s.percentage}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;
      } else {
        tableRowsHtml = `
          <thead>
            <tr style="background-color: ${themeColors.primary}; color: #ffffff; text-align: left;">
              <th style="padding: 6px 10px; font-size: 11px;">Jour</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Créneaux Occupés</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Capacité Établissement</th>
              <th style="padding: 6px 10px; font-size: 11px; text-align: center;">Taux d'Occupation</th>
            </tr>
          </thead>
          <tbody>
            ${dailyStats.map((d, idx) => `
              <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 6px 10px; font-weight: bold; color: ${themeColors.text}; font-size: 10px;">${d.day}</td>
                <td style="padding: 6px 10px; text-align: center; font-weight: bold; font-size: 10px;">${d.slotsCount} cours</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px;">${d.capacity} créneaux</td>
                <td style="padding: 6px 10px; text-align: center; font-size: 10px; font-weight: bold; color: ${themeColors.primary};">
                  ${d.capacity > 0 ? Math.round((d.slotsCount / d.capacity) * 100) : 0}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        `;
      }

      const wordHtmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${interp.title}</title>
          <style>
            @page Section1 {
              size: 210mm 297mm;
              margin: 15mm 15mm 15mm 15mm;
              mso-header-margin: 35.4pt;
              mso-footer-margin: 35.4pt;
              mso-paper-source: 0;
            }
            div.Section1 { page: Section1; }
            body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: ${themeColors.text}; background: #ffffff; }
            h1 { font-size: 18px; color: ${themeColors.primary}; margin: 0 0 4px 0; font-weight: bold; }
            h2 { font-size: 13px; color: ${themeColors.muted}; margin: 0 0 16px 0; font-weight: normal; }
            .kpi-grid { display: table; width: 100%; margin-bottom: 16px; border-collapse: separate; border-spacing: 8px 0; }
            .kpi-cell { display: table-cell; width: 25%; background-color: ${themeColors.bg}; border: 1px solid ${themeColors.border}; padding: 8px 10px; border-radius: 6px; }
            .kpi-label { font-size: 9px; color: ${themeColors.muted}; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
            .kpi-value { font-size: 15px; color: ${themeColors.primary}; font-weight: bold; margin-bottom: 2px; }
            .kpi-hint { font-size: 8.5px; color: ${themeColors.muted}; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .diagnostic-box { background-color: ${themeColors.bg}; border-left: 4px solid ${themeColors.primary}; border: 1px solid ${themeColors.border}; border-left-width: 4px; padding: 12px 14px; border-radius: 6px; margin-top: 14px; }
            .diag-title { font-size: 12px; font-weight: bold; color: ${themeColors.primary}; margin-bottom: 6px; }
            .diag-text { font-size: 10px; line-height: 1.5; color: ${themeColors.text}; margin-bottom: 8px; }
            .diag-sub { font-size: 10.5px; font-weight: bold; color: ${themeColors.text}; margin-top: 8px; margin-bottom: 4px; }
            .diag-list { margin: 0; padding-left: 16px; font-size: 9.5px; line-height: 1.5; color: ${themeColors.text}; }
            .footer { margin-top: 16px; font-size: 8.5px; color: ${themeColors.muted}; border-top: 1px solid #e2e8f0; padding-top: 6px; display: table; width: 100%; }
          </style>
        </head>
        <body>
          <div class="Section1">
            <h1>${schoolName.toUpperCase()}</h1>
            <h2>${interp.title}</h2>

            <div class="kpi-grid">
              ${(interp.kpis || []).map(kpi => `
                <div class="kpi-cell">
                  <div class="kpi-label">${kpi.label}</div>
                  <div class="kpi-value">${kpi.value}</div>
                  <div class="kpi-hint">${kpi.hint}</div>
                </div>
              `).join('')}
            </div>

            <table>
              ${tableRowsHtml}
            </table>

            <div class="diagnostic-box">
              <div class="diag-title">DIAGNOSTIC STRATÉGIQUE & INTERPRÉTATION DE LA DIRECTION</div>
              <div class="diag-text">${interp.summary}</div>

              <div class="diag-sub">Points Clés Observés :</div>
              <ul class="diag-list">
                ${(interp.highlights || []).map(hl => `<li>${hl}</li>`).join('')}
              </ul>

              <div class="diag-sub">Recommandations & Actions Décisionnelles :</div>
              <ul class="diag-list">
                ${(interp.recommendations || []).map(rec => `<li><strong>➜</strong> ${rec}</li>`).join('')}
              </ul>
            </div>

            <div class="footer">
              <div style="display: table-cell; text-align: left;">Généré par Planora. www.planora.com  •  Direction ${schoolName}</div>
              <div style="display: table-cell; text-align: right;">Édité le ${formattedDateTime}  •  Page 1/1</div>
            </div>
          </div>
        </body>
        </html>
      `;

      const blob = new Blob([wordHtmlContent], { type: 'application/msword;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Rapport_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}_${exportColorMode}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportSuccessMsg(`Rapport Word (.doc) généré et téléchargé avec succès (${exportColorMode === 'bw' ? 'Noir & Blanc' : 'Couleur'}) !`);
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Erreur export Word :", e);
    }
  };

  // --- EXPORT EXCEL OPTIMISÉ AVEC BARRES GRAPHIQUES ET INTERPRÉTATION (.XLSX) ---
  const handleExportExcel = () => {
    if (!isPremiumOrSchool) {
      setIsUpgradePromptOpen(true);
      return;
    }

    try {
      const isBW = exportColorMode === 'bw';
      const interp = getChefInterpretation;
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      }) + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      let dataToExport: any[] = [];
      let sheetName = 'Statistiques';

      // Générateur de jauge visuelle textuelle pour Excel
      const makeExcelProgressBar = (percent: number) => {
        const p = Math.max(0, Math.min(100, percent));
        const filled = Math.round(p / 10);
        const empty = 10 - filled;
        if (isBW) {
          return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${p}%`;
        }
        return `${'🟩'.repeat(filled)}${'⬜'.repeat(empty)} ${p}%`;
      };

      if (chartType === 'teachers') {
        sheetName = 'Enseignants_Quotas';
        dataToExport = teacherStats.map((t) => ({
          'ID': t.id,
          'Nom Enseignant': t.name,
          'Disciplines Enseignées': t.subjectsTaught,
          'Quota Hebdo Contractuel (h)': t.quota,
          'Heures Affectées Réelles (h)': t.assignedHours,
          'Écart / Solde': t.diff >= 0 ? `+${t.diff}` : `${t.diff}`,
          'Jauge Réalisation': makeExcelProgressBar(t.percent),
          'Statut Quota': t.status === 'optimal' ? 'Conforme (100%)' : t.status === 'under' ? `Sous-service (-${Math.abs(t.diff)}h)` : `Surcharge (+${t.diff}h HSA)`
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
          'Jauge Remplissage': makeExcelProgressBar(c.fillRate),
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
          'Jauge Répartition': makeExcelProgressBar(s.percentage),
          'Poids Pédagogique (%)': `${s.percentage}%`
        }));
      } else {
        sheetName = 'Charge_Par_Jour';
        dataToExport = dailyStats.map((d) => ({
          'Jour': d.day,
          'Créneaux Occupés': d.slotsCount,
          'Capacité Théorique': d.capacity,
          'Jauge Charge': makeExcelProgressBar(d.capacity > 0 ? Math.round((d.slotsCount / d.capacity) * 100) : 0)
        }));
      }

      // Création de la feuille principale avec les données
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Création de la feuille de synthèse et d'interprétation pour le chef
      const summaryRows = [
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': interp.title.toUpperCase(), 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': `Établissement : ${schoolName}`, 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': `Édité le : ${formattedDateTime}`, 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': `Mention légale : Généré par Planora. www.planora.com`, 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': `Mode d'export : ${isBW ? 'Noir & Blanc' : 'Couleur'}`, 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '', 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '--- SYNTHÈSE EXÉCUTIVE ---', 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': interp.summary, 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '', 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '--- INDICATEURS CLÉS (KPIS) ---', 'VALEUR': '' },
        ...((interp.kpis || []).map(k => ({ 'AUDIT ANALYTIQUE DE LA DIRECTION': k.label, 'VALEUR': `${k.value} (${k.hint})` }))),
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '', 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '--- RECOMMANDATIONS DÉCISIONNELLES ---', 'VALEUR': '' },
        ...((interp.recommendations || []).map((rec, i) => ({ 'AUDIT ANALYTIQUE DE LA DIRECTION': `Action ${i + 1}`, 'VALEUR': rec }))),
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': '', 'VALEUR': '' },
        { 'AUDIT ANALYTIQUE DE LA DIRECTION': 'Généré par Planora. www.planora.com', 'VALEUR': '' }
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Synthese_Direction');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const fileName = `Export_Analytique_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${chartType}_${exportColorMode}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportSuccessMsg(`Classeur Excel (.xlsx) généré et téléchargé avec succès (${exportColorMode === 'bw' ? 'Noir & Blanc' : 'Couleur'}) !`);
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

          {/* ACTIONS D'EXPORTATION ET CHOIX DU STYLE EN HAUT À DROITE */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* SÉLECTEUR DE STYLE D'EXPORTATION (COULEUR VS NOIR & BLANC) */}
            <div className={`flex items-center p-1 rounded-xl border text-[11px] font-bold ${isLight ? "bg-gray-100/90 border-gray-200" : "bg-slate-950/80 border-white/10"}`} title="Style visuel des exports PDF, Word et Excel">
              <button
                type="button"
                onClick={() => setExportColorMode('color')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  exportColorMode === 'color'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
                title="Export couleur moderne & dynamique"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400"></span>
                <span>Couleur</span>
              </button>
              <button
                type="button"
                onClick={() => setExportColorMode('bw')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  exportColorMode === 'bw'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
                }`}
                title="Export noir & blanc contrasté (optimisé pour impression et photocopie économique)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-600"></span>
                <span>Noir &amp; Blanc</span>
              </button>
            </div>

            {/* BOUTON EXPORT PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 shadow-rose-600/20'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : isPremiumOrSchool
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500/30 shadow-rose-600/20'
                  : 'bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border-rose-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger le rapport d'analyse 1 page A4 strict en PDF" : "Réservé aux abonnés Premium et School"}
            >
              <FileText className={`w-3.5 h-3.5 ${isLight ? (isPremiumOrSchool ? 'text-white' : 'text-rose-600') : 'text-rose-400'}`} />
              <span>PDF A4</span>
              {!isPremiumOrSchool && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono flex items-center gap-0.5 border ${
                  isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <Lock className="w-2.5 h-2.5" /> VIP
                </span>
              )}
            </button>

            {/* BOUTON EXPORT WORD (.DOC) */}
            <button
              type="button"
              onClick={handleExportWord}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-blue-600/20'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                  : isPremiumOrSchool
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500/30 shadow-blue-600/20'
                  : 'bg-blue-950/40 hover:bg-blue-950/60 text-blue-300 border-blue-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger le rapport éditable sous Microsoft Word (.doc)" : "Réservé aux abonnés Premium et School"}
            >
              <FileText className={`w-3.5 h-3.5 ${isLight ? (isPremiumOrSchool ? 'text-white' : 'text-blue-600') : 'text-blue-400'}`} />
              <span>Word</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-emerald-600/20'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  : isPremiumOrSchool
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/30 shadow-emerald-600/20'
                  : 'bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border-emerald-500/20'
              }`}
              title={isPremiumOrSchool ? "Télécharger les données d'analyse en format Excel .xlsx avec synthèse" : "Réservé aux abonnés Premium et School"}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isLight ? (isPremiumOrSchool ? 'text-white' : 'text-emerald-600') : 'text-emerald-400'}`} />
              <span>Excel</span>
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
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer shadow-md flex items-center justify-center ml-1 shrink-0"
              title="Fermer la vue détaillée"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
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
            <span>Données en temps réel • Exports PDF A4, Word (.doc) &amp; Excel (.xlsx) certifiés direction</span>
          </div>
          <div className="flex items-center gap-2.5">
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
              title="Exporter au format PDF A4 strict (1 page)"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PDF A4</span>
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                isLight
                  ? isPremiumOrSchool
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                  : isPremiumOrSchool
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
              }`}
              title="Exporter au format Microsoft Word (.doc)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Word</span>
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
              title="Exporter au format Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer ml-1"
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
