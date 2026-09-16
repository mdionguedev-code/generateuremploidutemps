import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ArrowRight, 
  RotateCcw, 
  Check, 
  Crown, 
  Lock,
  Copy, 
  Edit3, 
  FileSpreadsheet, 
  FileText,
  Zap,
  TrendingUp,
  CalendarCheck,
  Plus,
  Trash2,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { Teacher, ClassGroup, Subject, ClassAssignment } from '@/lib/types';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface PedagogicalPlanningTabProps {
  teachers: Teacher[];
  classes: ClassGroup[];
  subjects: Subject[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  onUpdateClasses: (classes: ClassGroup[]) => void;
  onAddTeacher?: (teacher: Omit<Teacher, 'id'>) => Promise<Teacher | null>;
  onAddClass?: (cls: Omit<ClassGroup, 'id'>) => Promise<ClassGroup | null>;
  onAddSubject?: (name: string) => Promise<Subject | null>;
  onNavigateToTeachers?: () => void;
  onNavigateToClasses?: () => void;
  isPremiumOrSchool: boolean;
  onOpenUpgrade: () => void;
  isLight: boolean;
  schoolName: string;
  onNavigateToTimetable?: () => void;
}

interface TeacherDistributionResult {
  teacherId: string;
  teacherName: string;
  quota: number;
  assignedHours: number;
  diff: number;
  percent: number;
  status: 'optimal' | 'under' | 'over';
  assignments: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    hours: number;
  }[];
}

const PRESET_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', 
  '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'
];

export default function PedagogicalPlanningTab({
  teachers,
  classes,
  subjects,
  onUpdateTeachers,
  onUpdateClasses,
  onAddTeacher,
  onAddClass,
  onAddSubject,
  onNavigateToTeachers,
  onNavigateToClasses,
  isPremiumOrSchool,
  onOpenUpgrade,
  isLight,
  schoolName,
  onNavigateToTimetable
}: PedagogicalPlanningTabProps) {
  // Navigation par sous-étapes guidées (1: Quotas, 2: Besoins, 3: Calcul & Matrice, 4: Validation)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // État local des besoins des classes : { [classId]: { [subjectId]: hours } }
  const [classRequirements, setClassRequirements] = useState<{ [classId: string]: { [subjectId: string]: number } }>({});

  // État local des enseignants (quotas et matières)
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>([]);

  // Proposition d'affectation calculée : { [classId_subjectId]: teacherId }
  const [computedAssignments, setComputedAssignments] = useState<{ [key: string]: string }>({});

  // Modal de duplication de grille
  const [duplicateSourceClassId, setDuplicateSourceClassId] = useState<string | null>(null);
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Modals de création rapide
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherQuota, setNewTeacherQuota] = useState(18);
  const [newTeacherSubjectIds, setNewTeacherSubjectIds] = useState<string[]>([]);
  const [newTeacherColor, setNewTeacherColor] = useState('#3b82f6');

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Feedback Toasts
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Initialisation à partir des props
  useEffect(() => {
    setLocalTeachers(teachers || []);
  }, [teachers]);

  useEffect(() => {
    // Initialiser les besoins des classes à partir des assignments existants
    const reqs: { [classId: string]: { [subjectId: string]: number } } = {};
    const initialComputed: { [key: string]: string } = {};

    (classes || []).forEach(c => {
      reqs[c.id] = {};
      (c.assignments || []).forEach(a => {
        if (!reqs[c.id][a.subjectId]) {
          reqs[c.id][a.subjectId] = a.hoursPerWeek;
        } else {
          reqs[c.id][a.subjectId] = Math.max(reqs[c.id][a.subjectId], a.hoursPerWeek);
        }
        if (a.teacherId) {
          initialComputed[`${c.id}_${a.subjectId}`] = a.teacherId;
        }
      });
    });

    setClassRequirements(prev => {
      const merged = { ...reqs };
      Object.entries(prev).forEach(([cId, sMap]) => {
        if (!merged[cId]) merged[cId] = {};
        merged[cId] = { ...merged[cId], ...sMap };
      });
      return merged;
    });

    if (Object.keys(initialComputed).length > 0) {
      setComputedAssignments(prev => ({ ...initialComputed, ...prev }));
    }
  }, [classes]);

  // --- CALCUL DES BESOINS GLOBAUX VS CAPACITÉ ---
  const subjectBalanceStats = useMemo(() => {
    return (subjects || []).map(sub => {
      let totalRequiredHours = 0;
      let classesDemandingCount = 0;

      Object.entries(classRequirements).forEach(([, subMap]) => {
        const h = subMap?.[sub.id] || 0;
        if (h > 0) {
          totalRequiredHours += h;
          classesDemandingCount++;
        }
      });

      const qualifiedTeachers = (localTeachers || []).filter(t => (t.subjectIds || []).includes(sub.id));
      const totalAvailableCapacity = qualifiedTeachers.reduce((acc, t) => acc + (t.weeklyQuota || 0), 0);

      const diff = totalAvailableCapacity - totalRequiredHours;
      const coverageRate = totalRequiredHours > 0 ? Math.round((totalAvailableCapacity / totalRequiredHours) * 100) : 100;

      return {
        subject: sub,
        requiredHours: totalRequiredHours,
        classesCount: classesDemandingCount,
        teachers: qualifiedTeachers,
        availableCapacity: totalAvailableCapacity,
        diff,
        coverageRate,
        status: diff === 0 ? 'perfect' : diff > 0 ? 'surplus' : 'deficit'
      };
    });
  }, [subjects, classRequirements, localTeachers]);

  // --- ALGORITHME D'OPTIMISATION & D'AFFECTATION ÉQUITABLE ---
  const runFairOptimizationAlgorithm = () => {
    if (!localTeachers || localTeachers.length === 0) {
      setErrorToast("Aucun enseignant configuré. Ajoutez au moins un professeur à l'Étape 1.");
      setTimeout(() => setErrorToast(null), 5000);
      return;
    }

    if (!classes || classes.length === 0) {
      setErrorToast("Aucune classe configurée. Créez vos classes à l'Étape 2.");
      setTimeout(() => setErrorToast(null), 5000);
      return;
    }

    let totalDemandHours = 0;
    Object.values(classRequirements).forEach(subMap => {
      Object.values(subMap || {}).forEach(h => {
        totalDemandHours += (h || 0);
      });
    });

    if (totalDemandHours === 0) {
      setErrorToast("Veuillez d'abord renseigner des heures de cours pour les classes à l'Étape 2.");
      setTimeout(() => setErrorToast(null), 5000);
      return;
    }

    const newAssignments: { [key: string]: string } = {};
    const teacherAssignedLoad: { [teacherId: string]: number } = {};
    localTeachers.forEach(t => {
      teacherAssignedLoad[t.id] = 0;
    });

    const demandsBySubject: { [subjectId: string]: { classId: string; hours: number }[] } = {};
    (subjects || []).forEach(s => { demandsBySubject[s.id] = []; });

    Object.entries(classRequirements).forEach(([classId, subMap]) => {
      Object.entries(subMap || {}).forEach(([subjectId, hours]) => {
        if (hours > 0) {
          if (!demandsBySubject[subjectId]) demandsBySubject[subjectId] = [];
          demandsBySubject[subjectId].push({ classId, hours });
        }
      });
    });

    let unassignedDemandsCount = 0;

    Object.entries(demandsBySubject).forEach(([subjectId, demands]) => {
      demands.sort((a, b) => b.hours - a.hours);

      const eligibleTeachers = localTeachers.filter(t => (t.subjectIds || []).includes(subjectId));
      if (eligibleTeachers.length === 0) {
        unassignedDemandsCount += demands.length;
        return;
      }

      demands.forEach(demand => {
        let bestTeacher: Teacher | null = null;
        let bestScore = -Infinity;

        eligibleTeachers.forEach(teacher => {
          const currentLoad = teacherAssignedLoad[teacher.id] || 0;
          const quota = teacher.weeklyQuota || 18;
          const remainingQuota = quota - currentLoad;

          let score = remainingQuota * 100 - currentLoad;

          if (currentLoad + demand.hours > quota) {
            score -= (currentLoad + demand.hours - quota) * 150;
          }

          if (score > bestScore) {
            bestScore = score;
            bestTeacher = teacher;
          }
        });

        if (bestTeacher) {
          const tId = (bestTeacher as Teacher).id;
          newAssignments[`${demand.classId}_${subjectId}`] = tId;
          teacherAssignedLoad[tId] = (teacherAssignedLoad[tId] || 0) + demand.hours;
        } else {
          unassignedDemandsCount++;
        }
      });
    });

    setComputedAssignments(newAssignments);
    setCurrentStep(3);
    if (unassignedDemandsCount > 0) {
      setSuccessToast(`Répartition calculée ! (${unassignedDemandsCount} besoin(s) n'ont pas de professeur habilité).`);
    } else {
      setSuccessToast("Répartition équitable calculée avec succès !");
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // --- RÉSULTATS DE LA RÉPARTITION PAR ENSEIGNANT ---
  const teacherDistributionStats: TeacherDistributionResult[] = useMemo(() => {
    return (localTeachers || []).map(t => {
      const assignedItems: TeacherDistributionResult['assignments'] = [];
      let totalAssigned = 0;

      Object.entries(computedAssignments).forEach(([key, teacherId]) => {
        if (teacherId === t.id) {
          const [classId, subjectId] = key.split('_');
          const hours = classRequirements[classId]?.[subjectId] || 0;
          const cls = (classes || []).find(c => c.id === classId);
          const sub = (subjects || []).find(s => s.id === subjectId);

          if (hours > 0 && cls && sub) {
            totalAssigned += hours;
            assignedItems.push({
              classId,
              className: cls.name,
              subjectId,
              subjectName: sub.name,
              hours
            });
          }
        }
      });

      const quota = t.weeklyQuota || 18;
      const diff = totalAssigned - quota;
      const percent = quota > 0 ? Math.round((totalAssigned / quota) * 100) : 0;
      const status: TeacherDistributionResult['status'] = 
        diff === 0 ? 'optimal' : diff < 0 ? 'under' : 'over';

      return {
        teacherId: t.id,
        teacherName: t.name,
        quota,
        assignedHours: totalAssigned,
        diff,
        percent,
        status,
        assignments: assignedItems
      };
    });
  }, [localTeachers, computedAssignments, classRequirements, classes, subjects]);

  // Score global d'équité (0 à 100%)
  const globalEquityScore = useMemo(() => {
    if (teacherDistributionStats.length === 0) return 0;
    const deviations = teacherDistributionStats.map(s => Math.abs(s.diff));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / teacherDistributionStats.length;
    return Math.max(0, Math.min(100, Math.round(100 - avgDeviation * 8)));
  }, [teacherDistributionStats]);

  // --- ACTIONS ---

  const handleTeacherQuotaChange = (teacherId: string, newQuota: number) => {
    const updated = localTeachers.map(t => t.id === teacherId ? { ...t, weeklyQuota: Math.max(1, Math.min(40, newQuota)) } : t);
    setLocalTeachers(updated);
    onUpdateTeachers(updated);
  };

  const handleToggleTeacherSubject = (teacherId: string, subjectId: string) => {
    const updated = localTeachers.map(t => {
      if (t.id !== teacherId) return t;
      const currentSubs = t.subjectIds || [];
      const newSubs = currentSubs.includes(subjectId)
        ? currentSubs.filter(id => id !== subjectId)
        : [...currentSubs, subjectId];
      return { ...t, subjectIds: newSubs };
    });
    setLocalTeachers(updated);
    onUpdateTeachers(updated);
  };

  const handleClassSubjectHoursChange = (classId: string, subjectId: string, hours: number) => {
    setClassRequirements(prev => {
      const next = { ...prev };
      if (!next[classId]) next[classId] = {};
      if (hours <= 0) {
        delete next[classId][subjectId];
      } else {
        next[classId][subjectId] = Math.min(15, Math.max(1, hours));
      }
      return next;
    });
  };

  const handleExecuteDuplication = () => {
    if (!duplicateSourceClassId || selectedTargetClassIds.length === 0) return;
    const sourceGrid = classRequirements[duplicateSourceClassId] || {};

    setClassRequirements(prev => {
      const next = { ...prev };
      selectedTargetClassIds.forEach(targetId => {
        next[targetId] = { ...sourceGrid };
      });
      return next;
    });

    setIsDuplicateModalOpen(false);
    setSelectedTargetClassIds([]);
    setSuccessToast(`Grille dupliquée avec succès vers ${selectedTargetClassIds.length} classe(s) !`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleManualAssignmentChange = (classId: string, subjectId: string, teacherId: string) => {
    setComputedAssignments(prev => ({
      ...prev,
      [`${classId}_${subjectId}`]: teacherId
    }));
  };

  const handleApplyToApplicationClasses = () => {
    if (!isPremiumOrSchool) {
      onOpenUpgrade();
      return;
    }

    if (Object.keys(computedAssignments).length === 0) {
      setErrorToast("Aucune affectation calculée. Lancez d'abord le calcul à l'Étape 3.");
      setTimeout(() => setErrorToast(null), 4000);
      return;
    }

    const updatedClasses = (classes || []).map(cls => {
      const newAssignments: ClassAssignment[] = [];
      const subMap = classRequirements[cls.id] || {};

      Object.entries(subMap).forEach(([subjectId, hours]) => {
        if (hours > 0) {
          const assignedTeacherId = computedAssignments[`${cls.id}_${subjectId}`];
          if (assignedTeacherId) {
            newAssignments.push({
              teacherId: assignedTeacherId,
              subjectId,
              hoursPerWeek: hours,
              group: 'all'
            });
          }
        }
      });

      return {
        ...cls,
        assignments: newAssignments
      };
    });

    onUpdateClasses(updatedClasses);
    setSuccessToast("Affectations appliquées aux classes avec succès ! Prêt pour l'emploi du temps.");
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // --- CRÉATION RAPIDE D'UN PROFESSEUR ---
  const handleCreateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) return;

    const teacherData: Omit<Teacher, 'id'> = {
      name: newTeacherName.trim(),
      weeklyQuota: newTeacherQuota || 18,
      subjectIds: newTeacherSubjectIds,
      color: newTeacherColor || '#3b82f6',
      unavailability: []
    };

    if (onAddTeacher) {
      const created = await onAddTeacher(teacherData);
      if (created) {
        setLocalTeachers(prev => [...prev, created]);
      }
    } else {
      const created: Teacher = {
        id: `teach-${Date.now()}`,
        ...teacherData
      };
      const nextList = [...localTeachers, created];
      setLocalTeachers(nextList);
      onUpdateTeachers(nextList);
    }

    setNewTeacherName('');
    setNewTeacherSubjectIds([]);
    setNewTeacherQuota(18);
    setIsAddTeacherModalOpen(false);
    setSuccessToast("Professeur ajouté avec succès !");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // --- CRÉATION RAPIDE D'UNE CLASSE ---
  const handleCreateClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const classData: Omit<ClassGroup, 'id'> = {
      name: newClassName.trim(),
      assignments: [],
      unavailability: []
    };

    if (onAddClass) {
      await onAddClass(classData);
    } else {
      const created: ClassGroup = {
        id: `cls-${Date.now()}`,
        ...classData
      };
      onUpdateClasses([...(classes || []), created]);
    }

    setNewClassName('');
    setIsAddClassModalOpen(false);
    setSuccessToast(`Classe "${newClassName.trim()}" créée avec succès !`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // --- CRÉATION RAPIDE D'UNE MATIÈRE ---
  const handleCreateSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    if (onAddSubject) {
      await onAddSubject(newSubjectName.trim());
    }
    setNewSubjectName('');
    setIsAddSubjectModalOpen(false);
    setSuccessToast("Matière enregistrée !");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // --- EXPORT PDF DE LA RÉPARTITION (100% SÉCURISÉ) ---
  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();
      const formattedDateTime = now.toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric'
      }) + ' à ' + now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 297, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("FICHE DE RÉPARTITION PÉDAGOGIQUE & AFFECTATION DES SERVICES", 14, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${schoolName || 'Établissement Scolaire'} • Année Scolaire 2026-2027`, 283, 11, { align: 'right' });

      // Table Header
      let currentY = 30;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, currentY - 5, 269, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Enseignant", 16, currentY);
      doc.text("Disciplines", 65, currentY);
      doc.text("Quota", 115, currentY);
      doc.text("Attribué", 135, currentY);
      doc.text("Solde / Statut", 155, currentY);
      doc.text("Classes & Heures Hebdomadaires", 180, currentY);

      currentY += 8;

      teacherDistributionStats.forEach((t, i) => {
        if (currentY > 190) {
          doc.addPage();
          currentY = 25;
        }

        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, currentY - 3.5, 269, 7, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(t.teacherName, 16, currentY + 1);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        const subNames = (localTeachers.find(lt => lt.id === t.teacherId)?.subjectIds || [])
          .map(sid => (subjects || []).find(s => s.id === sid)?.name)
          .filter(Boolean)
          .join(', ') || 'N/A';
        doc.text(doc.splitTextToSize(subNames, 45), 65, currentY + 1);

        doc.text(`${t.quota}h`, 115, currentY + 1);
        doc.setFont('helvetica', 'bold');
        doc.text(`${t.assignedHours}h`, 135, currentY + 1);

        if (t.diff === 0) {
          doc.setTextColor(22, 163, 74);
          doc.text("0h (100%)", 155, currentY + 1);
        } else if (t.diff < 0) {
          doc.setTextColor(217, 119, 6);
          doc.text(`${t.diff}h (Déficit)`, 155, currentY + 1);
        } else {
          doc.setTextColor(99, 102, 241);
          doc.text(`+${t.diff}h (HSA)`, 155, currentY + 1);
        }

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const classesList = t.assignments.map(a => `${a.className} (${a.hours}h ${a.subjectName})`).join(' • ') || 'Aucune classe';
        doc.text(doc.splitTextToSize(classesList, 100), 180, currentY + 1);

        currentY += 7.5;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Généré par IziSchool AI • Direction ${schoolName || ''}`, 14, 202);
      doc.text(`Édité le ${formattedDateTime}`, 283, 202, { align: 'right' });

      doc.save(`Repartition_Pedagogique_${(schoolName || 'School').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      setSuccessToast("Fiche de répartition PDF téléchargée !");
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (e) {
      console.error(e);
      setErrorToast("Erreur lors de l'export PDF.");
    }
  };

  // --- EXPORT EXCEL DE LA RÉPARTITION ---
  const handleExportExcel = () => {
    try {
      const dataTeachers = teacherDistributionStats.map(t => ({
        'Enseignant': t.teacherName,
        'Disciplines': (localTeachers.find(lt => lt.id === t.teacherId)?.subjectIds || []).map(sid => (subjects || []).find(s => s.id === sid)?.name).join(', ') || '',
        'Quota Contractuel (h)': t.quota,
        'Heures Attribuées (h)': t.assignedHours,
        'Solde (h)': t.diff >= 0 ? `+${t.diff}` : `${t.diff}`,
        'Statut': t.status === 'optimal' ? 'Conforme (100%)' : t.status === 'under' ? `Sous-service (${t.diff}h)` : `Surcharge (+${t.diff}h)`,
        'Détail des Classes': t.assignments.map(a => `${a.className} (${a.hours}h ${a.subjectName})`).join('; ')
      }));

      const dataClasses = (classes || []).map(c => {
        const subMap = classRequirements[c.id] || {};
        const assignmentsList = Object.entries(subMap).map(([sId, h]) => {
          const sub = (subjects || []).find(s => s.id === sId);
          const tId = computedAssignments[`${c.id}_${sId}`];
          const teacher = localTeachers.find(t => t.id === tId);
          return `${sub?.name || 'Matière'}: ${h}h (${teacher?.name || 'Non assigné'})`;
        }).join(' | ');

        const totalH = Object.values(subMap).reduce((a, b) => a + b, 0);

        return {
          'Classe': c.name,
          'Total Heures Hebdo': totalH,
          'Nombre de Matières': Object.keys(subMap).length,
          'Détail des Matières & Enseignants': assignmentsList
        };
      });

      const wb = XLSX.utils.book_new();
      const wsTeachers = XLSX.utils.json_to_sheet(dataTeachers);
      const wsClasses = XLSX.utils.json_to_sheet(dataClasses);

      XLSX.utils.book_append_sheet(wb, wsTeachers, "Services Enseignants");
      XLSX.utils.book_append_sheet(wb, wsClasses, "Grilles Classes");

      XLSX.writeFile(wb, `Planification_Pedagogique_${(schoolName || 'School').replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      setSuccessToast("Fichier Excel de répartition téléchargé !");
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (e) {
      console.error(e);
      setErrorToast("Erreur lors de l'export Excel.");
    }
  };

  return (
    <div className="space-y-6">

      {/* ===================================================================== */}
      {/* HEADER BANNER WITH STEP PROGRESSION                                   */}
      {/* ===================================================================== */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl relative overflow-hidden ${
        isLight 
          ? "bg-white/90 border-slate-200 text-slate-900" 
          : "bg-slate-900/90 border-white/10 text-white"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-purple-600/30 shrink-0">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Module Planification &amp; Répartition Pédagogique
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Premium &amp; School
                </span>
              </div>
              <p className={`text-xs sm:text-sm mt-1 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                Définissez vos professeurs, leurs quotas et les besoins horaires des classes. Le moteur optimise automatiquement une affectation équitable pour équilibrer parfaitement les charges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isPremiumOrSchool ? (
              <>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLight 
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm" 
                      : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                  }`}
                  title="Exporter la répartition en PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    isLight 
                      ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm" 
                      : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                  }`}
                  title="Exporter la répartition en Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Export Excel</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenUpgrade}
                title="Nécessite le plan Premium ou School"
                className="group/vip relative px-4 py-2.5 rounded-xl bg-[#1c1507] border border-amber-500/70 text-amber-400 font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:border-amber-400 hover:bg-[#281d09]"
              >
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="tracking-wider uppercase">VIP (Plan Supérieur Requis)</span>
              </button>
            )}
          </div>
        </div>

        {/* Barre de Progression en 4 Étapes Claires */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-6 pt-5 border-t border-white/10">
          {[
            { step: 1, title: '1. Professeurs & Quotas', desc: `${localTeachers.length} prof(s) configuré(s)` },
            { step: 2, title: '2. Besoins des Classes', desc: `${(classes || []).length} classe(s) avec grilles` },
            { step: 3, title: '3. Affectation Équitable', desc: 'Calcul d\'optimisation' },
            { step: 4, title: '4. Matrice & Validation', desc: 'Ajuster & Appliquer' }
          ].map(s => {
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step as any)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20 border-indigo-400/40 scale-[1.02]'
                    : isDone
                    ? isLight ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : isLight ? 'bg-white/70 border-slate-200 text-slate-600 hover:bg-white' : 'bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black uppercase tracking-wider">
                    {s.title}
                  </span>
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <div className="text-[10px] opacity-80 truncate">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* --- TOASTS DE NOTIFICATION --- */}
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl flex items-center justify-between gap-3 animate-fade-in border border-emerald-400/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          {onNavigateToTimetable && (
            <button
              onClick={onNavigateToTimetable}
              className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-[11px] cursor-pointer transition-all"
            >
              Aller à l'Emploi du Temps ➔
            </button>
          )}
        </div>
      )}

      {errorToast && (
        <div className="p-3.5 rounded-2xl bg-rose-600 text-white text-xs font-bold shadow-xl flex items-center justify-between gap-3 animate-fade-in border border-rose-400/30">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button
            onClick={() => setErrorToast(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VÉRIFICATION DU PLAN : SI NON PREMIUM / SCHOOL, PAYWALL ÉLÉGANT        */}
      {/* ===================================================================== */}
      {!isPremiumOrSchool ? (
        <div className={`p-8 sm:p-12 rounded-3xl border text-center space-y-6 relative overflow-hidden shadow-2xl ${
          isLight 
            ? "bg-gradient-to-b from-indigo-50/60 via-white to-purple-50/30 border-indigo-200 text-slate-900" 
            : "bg-gradient-to-b from-slate-900 via-indigo-950/30 to-slate-950 border-indigo-500/20 text-white"
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30">
            <Crown className="w-8 h-8" />
          </div>

          <div className="max-w-xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Passez à IziSchool AI Premium pour débloquer la Planification Intelligente
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              Le module de <strong>Planification &amp; Répartition Pédagogique</strong> résout le casse-tête de la rentrée scolaire en équilibrant mathématiquement la charge de travail entre vos enseignants et en respectant scrupuleusement leurs quotas d'heures.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300"
            >
              Activer l'offre Premium (10 000 FCFA / mois)
            </button>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* CONTENU COMPLET POUR ABONNÉS PREMIUM & SCHOOL                          */
        /* ===================================================================== */
        <div className="space-y-6">

          {/* =================================================================== */}
          {/* ÉTAPE 1 : GESTION DES PROFESSEURS, QUOTAS & MATIÈRES                */}
          {/* =================================================================== */}
          {currentStep === 1 && (
            <div className={`p-6 rounded-3xl border space-y-6 ${
              isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10 shadow-xl"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-white/10">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    <span>Étape 1 : Quotas contractuels &amp; Disciplines enseignées</span>
                  </h3>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Ajustez le quota hebdomadaire (ex: 18h) et cochez les matières que chaque enseignant peut dispenser.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsAddTeacherModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Enseignant</span>
                  </button>


                  <button
                    type="button"
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Matière</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Passer aux besoins des classes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* TABLE DES ENSEIGNANTS OU EMPTY STATE */}
              {localTeachers.length === 0 ? (
                <div className={`p-8 sm:p-12 text-center rounded-2xl border space-y-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-base font-black">Aucun enseignant configuré pour l'instant</h4>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Pour démarrer la planification équitable en temps réel, ajoutez vos enseignants réels avec leurs quotas d'heures statutaires.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddTeacherModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un premier enseignant</span>
                    </button>
                    {onNavigateToTeachers && (
                      <button
                        type="button"
                        onClick={onNavigateToTeachers}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                          isLight ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                        }`}
                      >
                        <span>Aller à l'Étape 3 (Fiches Profs)</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${isLight ? "bg-slate-50 text-slate-700 border-slate-200" : "bg-slate-950 text-slate-300 border-white/10"}`}>
                        <th className="p-3.5 font-bold">Enseignant</th>
                        <th className="p-3.5 font-bold">Quota Hebdomadaire (h/sem)</th>
                        <th className="p-3.5 font-bold">Matières Enseignées (Cliquer pour basculer)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {localTeachers.map((teacher) => {
                        const teacherSubs = teacher.subjectIds || [];
                        return (
                          <tr key={teacher.id} className={`transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-white/[0.02]"}`}>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div 
                                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: teacher.color || '#6366f1' }}
                                />
                                <span className="font-bold text-xs">{teacher.name}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={40}
                                  value={teacher.weeklyQuota || 18}
                                  onChange={(e) => handleTeacherQuotaChange(teacher.id, parseInt(e.target.value) || 1)}
                                  className={`w-20 px-2.5 py-1 rounded-lg border font-mono font-black text-center text-xs focus:outline-none focus:border-indigo-500 ${
                                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                                  }`}
                                />
                                <span className="text-[11px] opacity-70">heures / semaine</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="flex flex-wrap gap-1.5">
                                {(subjects || []).map((sub) => {
                                  const isAssigned = teacherSubs.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => handleToggleTeacherSubject(teacher.id, sub.id)}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                                        isAssigned
                                          ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                                          : isLight
                                          ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                          : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                                      }`}
                                    >
                                      {isAssigned ? `✓ ${sub.name}` : `+ ${sub.name}`}
                                    </button>
                                  );
                                })}
                                {(subjects || []).length === 0 && (
                                  <span className="text-[11px] text-slate-400 italic">Aucune matière créée. Cliquez sur "+ Matière".</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Résumé de capacité par matière */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-400">
                    <BookOpen className="w-4 h-4" />
                    <span>Capacité totale disponible par matière :</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Nouvelle Matière</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {subjectBalanceStats.map((stat) => (
                    <div
                      key={stat.subject.id}
                      className={`p-3 rounded-xl border space-y-1 ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-white/5"
                      }`}
                    >
                      <div className="font-bold text-xs truncate">{stat.subject.name}</div>
                      <div className="text-[11px] flex items-center justify-between text-slate-400">
                        <span>{stat.teachers.length} prof(s)</span>
                        <span className="font-mono font-bold text-indigo-400">{stat.availableCapacity}h dispo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* ÉTAPE 2 : BESOINS DES CLASSES (GRILLES HORAIRES PAR MATIÈRE)        */}
          {/* =================================================================== */}
          {currentStep === 2 && (
            <div className={`p-6 rounded-3xl border space-y-6 ${
              isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10 shadow-xl"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-white/10">
                <div>
                  <h3 className="text-base font-black flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <span>Étape 2 : Définition des besoins horaires des classes</span>
                  </h3>
                  <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Renseignez les matières requises pour chaque division et leur volume d'heures hebdomadaires.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    }`}
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter Classe</span>
                  </button>
                  <button
                    type="button"
                    onClick={runFairOptimizationAlgorithm}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Calculer l'affectation équitable</span>
                  </button>
                </div>
              </div>

              {/* GRILLES HORAIRES PAR CLASSE OU EMPTY STATE */}
              {(classes || []).length === 0 ? (
                <div className={`p-8 sm:p-12 text-center rounded-2xl border space-y-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/40 border-white/5"
                }`}>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h4 className="text-base font-black">Aucune classe configurée</h4>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Créez vos divisions de classes (ex: 6ème A, 3ème B) pour définir leurs volumes d'heures par matière.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddClassModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une première classe</span>
                    </button>
                    {onNavigateToClasses && (
                      <button
                        type="button"
                        onClick={onNavigateToClasses}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 ${
                          isLight ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                        }`}
                      >
                        <span>Aller à l'Étape 4 (Classes)</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Grille horaire par classe ({classes.length} classes) :
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.map((cls) => {
                      const clsReqs = classRequirements[cls.id] || {};
                      const totalHours = Object.values(clsReqs).reduce((a, b) => a + b, 0);

                      return (
                        <div
                          key={cls.id}
                          className={`p-4 rounded-2xl border space-y-3 transition-all ${
                            isLight ? "bg-slate-50/70 border-slate-200 hover:border-indigo-300" : "bg-slate-950/60 border-white/10 hover:border-indigo-500/30"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b pb-2 border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm">{cls.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold">
                                {totalHours}h / semaine
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setDuplicateSourceClassId(cls.id);
                                setSelectedTargetClassIds(classes.filter(c => c.id !== cls.id).map(c => c.id));
                                setIsDuplicateModalOpen(true);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                isLight ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                              }`}
                              title="Dupliquer ces volumes vers d'autres classes"
                            >
                              <Copy className="w-3 h-3 text-indigo-400" />
                              <span>Dupliquer</span>
                            </button>
                          </div>

                          {/* Matières de cette classe */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(subjects || []).map((sub) => {
                              const hours = clsReqs[sub.id] || 0;
                              return (
                                <div
                                  key={sub.id}
                                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                                    hours > 0
                                      ? isLight ? "bg-white border-indigo-200" : "bg-slate-900 border-indigo-500/30"
                                      : isLight ? "bg-slate-100/50 border-slate-200 opacity-60" : "bg-slate-950/40 border-white/5 opacity-50"
                                  }`}
                                >
                                  <span className="text-xs font-semibold truncate">{sub.name}</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <input
                                      type="number"
                                      min={0}
                                      max={12}
                                      value={hours}
                                      onChange={(e) => handleClassSubjectHoursChange(cls.id, sub.id, parseInt(e.target.value) || 0)}
                                      className={`w-14 px-2 py-0.5 rounded-lg border font-mono font-bold text-center text-xs focus:outline-none focus:border-indigo-500 ${
                                        isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                                      }`}
                                    />
                                    <span className="text-[10px] text-slate-400">h</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Balance Offre vs Demande par Matière */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Équilibre des volumes horaires (Demande vs Disponibilité) :</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {subjectBalanceStats.map((stat) => (
                    <div
                      key={stat.subject.id}
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        stat.status === 'deficit'
                          ? isLight ? "bg-rose-50 border-rose-200 text-rose-950" : "bg-rose-950/20 border-rose-500/30 text-rose-200"
                          : stat.status === 'perfect'
                          ? isLight ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                          : isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950/60 border-white/5 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{stat.subject.name}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          stat.status === 'deficit'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : stat.status === 'perfect'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          {stat.status === 'deficit' ? `Déficit: ${Math.abs(stat.diff)}h` : stat.status === 'perfect' ? 'Équilibre parfait' : `Surplus: +${stat.diff}h`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] opacity-80">
                        <span>Besoin classes : <strong>{stat.requiredHours}h</strong> ({stat.classesCount} classes)</span>
                        <span>Dispo profs : <strong>{stat.availableCapacity}h</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* ÉTAPE 3 & 4 : MATRICE D'AFFECTATION ÉQUITABLE & VALIDATION          */}
          {/* =================================================================== */}
          {(currentStep === 3 || currentStep === 4) && (
            <div className="space-y-6">

              {/* KPI Synthèse d'Équité */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-3xl border space-y-1 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10"
                }`}>
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Indice d'Équité Global</div>
                  <div className="text-2xl font-black text-emerald-500 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>{globalEquityScore}%</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Optimisation équilibrée des quotas</div>
                </div>

                <div className={`p-4 rounded-3xl border space-y-1 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10"
                }`}>
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Heures Totales Affectées</div>
                  <div className="text-2xl font-black text-indigo-400 flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5" />
                    <span>{teacherDistributionStats.reduce((a, b) => a + b.assignedHours, 0)} h</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Sur toutes les divisions</div>
                </div>

                <div className={`p-4 rounded-3xl border space-y-1 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10"
                }`}>
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Profs au Quota Pile (100%)</div>
                  <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{teacherDistributionStats.filter(t => t.diff === 0).length} / {teacherDistributionStats.length}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Zéro sous-service ni dépassement</div>
                </div>

                <div className={`p-4 rounded-3xl border space-y-1 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10"
                }`}>
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-400">Écarts &amp; Ajustements</div>
                  <div className="text-2xl font-black text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>{teacherDistributionStats.filter(t => t.diff !== 0).length} prof(s)</span>
                  </div>
                  <div className="text-[10px] text-slate-400">En sous-service ou heures sup (HSA)</div>
                </div>
              </div>

              {/* Boutons d'Action Principale */}
              <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                isLight 
                  ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-emerald-200 text-slate-900" 
                  : "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border-emerald-500/20 text-white"
              }`}>
                <div className="space-y-1">
                  <h4 className="font-black text-sm flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Proposition de répartition prête à l'emploi</span>
                  </h4>
                  <p className="text-xs opacity-80">
                    Vérifiez ci-dessous la charge de chaque enseignant, ajustez manuellement certaines classes si désiré, puis validez pour appliquer aux classes.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={runFairOptimizationAlgorithm}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
                      isLight ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recalculer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToApplicationClasses}
                    title={!isPremiumOrSchool ? "Nécessite le plan Premium ou School" : undefined}
                    className={`group/vip relative px-5 py-2.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 ${!isPremiumOrSchool ? 'bg-[#1c1507] border border-amber-500/70 text-amber-400' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'}`}
                  >
                    {!isPremiumOrSchool ? <Lock className="w-4 h-4 text-amber-400 shrink-0" /> : <Check className="w-4 h-4" />}
                    <span>Appliquer la répartition aux classes</span>
                  </button>
                </div>
              </div>

              {/* Matrice Détaillée par Enseignant */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10 shadow-xl"
              }`}>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Vue Détaillée par Enseignant (Charge &amp; Classes attribuées)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherDistributionStats.map((stat) => (
                    <div
                      key={stat.teacherId}
                      className={`p-4 rounded-2xl border space-y-3 ${
                        isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs">{stat.teacherName}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            stat.status === 'optimal'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : stat.status === 'under'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          }`}>
                            {stat.assignedHours}h / {stat.quota}h ({stat.percent}%)
                          </span>
                        </div>

                        <span className={`text-[11px] font-bold ${
                          stat.diff === 0 ? 'text-emerald-400' : stat.diff < 0 ? 'text-amber-400' : 'text-indigo-400'
                        }`}>
                          {stat.diff === 0 ? 'Conforme (100%)' : stat.diff < 0 ? `${stat.diff}h sous-service` : `+${stat.diff}h HSA`}
                        </span>
                      </div>

                      {/* Jauge de progression de quota */}
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            stat.status === 'optimal'
                              ? 'bg-emerald-500'
                              : stat.status === 'under'
                              ? 'bg-amber-500'
                              : 'bg-indigo-500'
                          }`}
                          style={{ width: `${Math.min(100, stat.percent)}%` }}
                        />
                      </div>

                      {/* Liste des classes attribuées */}
                      <div className="space-y-1 pt-1">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Classes &amp; Matières attribuées :</div>
                        <div className="flex flex-wrap gap-1.5">
                          {stat.assignments.map((item, idx) => (
                            <span
                              key={idx}
                              className={`px-2.5 py-1 rounded-lg text-[11px] border font-medium flex items-center gap-1.5 ${
                                isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-white/10 text-slate-200"
                              }`}
                            >
                              <strong className="text-indigo-400">{item.className}</strong>
                              <span className="opacity-75">{item.subjectName} ({item.hours}h)</span>
                            </span>
                          ))}
                          {stat.assignments.length === 0 && (
                            <span className="text-[11px] text-slate-500 italic">Aucune classe attribuée</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matrice Interactive par Classe (avec ajustement manuel) */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-white/10 shadow-xl"
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-black flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-purple-500" />
                    <span>Vue par Classe &amp; Ajustements Manuels Directs</span>
                  </h3>
                  <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Vous pouvez modifier le professeur assigné à chaque matière via les sélecteurs.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(classes || []).map((cls) => {
                    const subMap = classRequirements[cls.id] || {};
                    const totalHours = Object.values(subMap).reduce((a, b) => a + b, 0);

                    return (
                      <div
                        key={cls.id}
                        className={`p-4 rounded-2xl border space-y-3 ${
                          isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b pb-2 border-white/5">
                          <span className="font-bold text-xs">{cls.name}</span>
                          <span className="text-[10px] font-mono font-bold opacity-75">{totalHours}h au total</span>
                        </div>

                        <div className="space-y-2">
                          {Object.entries(subMap).map(([subjectId, hours]) => {
                            if (hours <= 0) return null;
                            const sub = (subjects || []).find(s => s.id === subjectId);
                            const currentAssignedTeacherId = computedAssignments[`${cls.id}_${subjectId}`] || '';
                            const eligibleTeachers = localTeachers.filter(t => (t.subjectIds || []).includes(subjectId));

                            return (
                              <div
                                key={subjectId}
                                className={`p-2.5 rounded-xl border flex flex-col gap-1.5 ${
                                  isLight ? "bg-white border-slate-200" : "bg-slate-900 border-white/5"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-indigo-400">{sub?.name}</span>
                                  <span className="text-[10px] font-mono opacity-80">{hours} h/sem</span>
                                </div>

                                <select
                                  value={currentAssignedTeacherId}
                                  onChange={(e) => handleManualAssignmentChange(cls.id, subjectId, e.target.value)}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer ${
                                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                                  }`}
                                >
                                  <option value="">-- Choisir un enseignant --</option>
                                  {eligibleTeachers.map(t => (
                                    <option key={t.id} value={t.id}>
                                      {t.name} (Quota {t.weeklyQuota}h)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: AJOUT RAPIDE D'UN PROFESSEUR                                 */}
      {/* ===================================================================== */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-black flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <span>Ajouter un Enseignant</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTeacherModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeacherSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom complet ou Titre :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. Diop, Mme Diallo..."
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-medium focus:outline-none focus:border-indigo-500 ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Quota hebdomadaire (heures / semaine) :</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  required
                  value={newTeacherQuota}
                  onChange={(e) => setNewTeacherQuota(parseInt(e.target.value) || 18)}
                  className={`w-full px-3 py-2 rounded-xl border font-mono font-bold focus:outline-none focus:border-indigo-500 ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5">Matières enseignées :</label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {(subjects || []).map((sub) => {
                    const isSelected = newTeacherSubjectIds.includes(sub.id);
                    return (
                      <button
                        type="button"
                        key={sub.id}
                        onClick={() => {
                          if (isSelected) {
                            setNewTeacherSubjectIds(prev => prev.filter(id => id !== sub.id));
                          } else {
                            setNewTeacherSubjectIds(prev => [...prev, sub.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                            : isLight
                            ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                            : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                        }`}
                      >
                        {isSelected ? `✓ ${sub.name}` : `+ ${sub.name}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Couleur d'identification :</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTeacherColor(c)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                        newTeacherColor === c ? "ring-2 ring-white scale-110 shadow-md" : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 text-white border-white/10"
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: AJOUT RAPIDE D'UNE CLASSE                                    */}
      {/* ===================================================================== */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-black flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Créer une Classe / Division</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom de la division :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 6ème A, 5ème B, 2nde L..."
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-medium focus:outline-none focus:border-indigo-500 ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 text-white border-white/10"
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Créer la Classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: AJOUT RAPIDE D'UNE MATIÈRE                                   */}
      {/* ===================================================================== */}
      {isAddSubjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm p-6 rounded-3xl border space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>Ajouter une Matière</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubjectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom de la matière :</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Informatique, Espagnol, Arabe..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border font-medium focus:outline-none focus:border-indigo-500 ${
                    isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-white/10 text-white"
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                    isLight ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-white/5 text-white border-white/10"
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: DUPLICATION DE GRILLE HORAIRE VERS D'AUTRES CLASSES           */}
      {/* ===================================================================== */}
      {isDuplicateModalOpen && duplicateSourceClassId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border space-y-4 shadow-2xl ${
            isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-black flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-500" />
                <span>Dupliquer la grille horaire</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Sélectionnez les classes qui doivent recevoir exactement les mêmes matières et volumes horaires que <strong>{(classes || []).find(c => c.id === duplicateSourceClassId)?.name}</strong> :
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 p-1">
              {(classes || []).filter(c => c.id !== duplicateSourceClassId).map((cls) => {
                const isSelected = selectedTargetClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-bold"
                        : isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950 border-white/5 text-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTargetClassIds(prev => [...prev, cls.id]);
                        } else {
                          setSelectedTargetClassIds(prev => prev.filter(id => id !== cls.id));
                        }
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-xs">{cls.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200" : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                }`}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={selectedTargetClassIds.length === 0}
                onClick={handleExecuteDuplication}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Dupliquer ({selectedTargetClassIds.length} classes)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
