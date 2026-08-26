'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  Sliders,
  Sparkles,
  Download,
  RefreshCw,
  Plus,
  Trash,
  Play,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
  HelpCircle,
  BarChart,
  Grid,
  Lock,
  Unlock,
  SlidersHorizontal,
  ChevronRight,
  FileCheck2,
  FileSpreadsheet,
  MessageSquare,
  Search,
  Sun,
  Moon,
  Settings,
  Building2,
  Award,
  FileText,
  Shield,
  Key,
  CreditCard,
  Zap,
  Radio,
  LogOut,
  Home,
  Maximize2
} from 'lucide-react';

import SaaSAdminPortal from '@/components/SaaSAdminPortal';
import ClientSubscriptionModal from '@/components/ClientSubscriptionModal';
import LandingPage from '@/components/LandingPage';
import AuthModal from '@/components/AuthModal';
import ChefAnalyticsDetailModal, { ChefChartType } from '@/components/ChefAnalyticsDetailModal';
import DocumentationView from '@/components/DocumentationView';
import {
  SaaSPlan,
  SaaSClient,
  SaaSLicenseKey,
  SaaSPaymentTransaction,
  SaaSGlobalSettings,
  PaymentMethod,
  SaaSActivationRequest
} from '@/lib/saasTypes';
import {
  INITIAL_SAAS_PLANS,
  INITIAL_SAAS_CLIENTS,
  INITIAL_SAAS_LICENSE_KEYS,
  INITIAL_SAAS_TRANSACTIONS,
  INITIAL_SAAS_SETTINGS,
  INITIAL_SAAS_ACTIVATION_REQUESTS
} from '@/lib/saasDemoData';

import { 
  ResponsiveContainer, 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

import { Subject, Teacher, ClassGroup, TimetableEntry, DayTimeSlot } from '@/lib/types';
import {
  INITIAL_SUBJECTS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES
} from '@/lib/demoData';
import {
  exportTimetableToExcel,
  exportTimetableToPdf,
  exportTimetableToWord,
  exportTeacherTimetableToPdf,
  exportAllTeachersTimetableToPdf,
  exportTeacherTimetableToExcel,
  exportTeacherTimetableToWord,
  setExportScheduleConfig
} from '@/lib/exportUtils';
import {
  generateTimetable,
  validateManualMove,
  DEFAULT_DAYS,
  DEFAULT_TOTAL_SLOTS
} from '@/lib/solver';

const ALL_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export default function TimetableDashboard() {
  const [isMounted, setIsMounted] = useState(false);

  // --- Theme Toggle State ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentViewMode, setCurrentViewMode] = useState<'landing' | 'app'>('landing');
  const [currentClientId, setCurrentClientId] = useState<string>('cli_01');
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [exportCount, setExportCount] = useState<number>(0);

  // --- Step 1: Week & Daily Hours Configuration States ---
  const [activeDays, setActiveDays] = useState<string[]>(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]);
  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(18);

  const totalSlots = useMemo(() => Math.max(1, endHour - startHour), [startHour, endHour]);
  const slotLabels = useMemo(() => {
    return Array.from({ length: totalSlots }, (_, i) => {
      const h = startHour + i;
      return `${String(h).padStart(2, '0')}h - ${String(h + 1).padStart(2, '0')}h`;
    });
  }, [startHour, totalSlots]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const isLightMode = theme === 'light' && currentViewMode !== 'landing';
      document.body.classList.toggle('light', isLightMode);
      localStorage.setItem('school_theme', theme);
    }
  }, [theme, currentViewMode, isMounted]);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem(`school_generation_count_${currentClientId}`, generationCount.toString());
      localStorage.setItem(`school_export_count_${currentClientId}`, exportCount.toString());
    }
  }, [generationCount, exportCount, currentClientId, isMounted]);

  const entryIdCounterRef = useRef(1);

  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace('#', '');
    let r = 99, g = 102, b = 241;
    if (cleaned.length === 3) {
      r = parseInt(cleaned[0] + cleaned[0], 16);
      g = parseInt(cleaned[1] + cleaned[1], 16);
      b = parseInt(cleaned[2] + cleaned[2], 16);
    } else if (cleaned.length === 6) {
      r = parseInt(cleaned.substring(0, 2), 16);
      g = parseInt(cleaned.substring(2, 4), 16);
      b = parseInt(cleaned.substring(4, 6), 16);
    }
    return isNaN(r) || isNaN(g) || isNaN(b) ? '99, 102, 241' : `${r}, ${g}, ${b}`;
  };

  // --- Core Application States ---
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [classes, setClasses] = useState<ClassGroup[]>(INITIAL_CLASSES);
  const [timetable, setTimetable] = useState<TimetableEntry[]>(() => {
    const solution = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES);
    return solution.timetable;
  });
  const [unscheduled, setUnscheduled] = useState<any[]>(() => {
    const solution = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES);
    return solution.unscheduled;
  });
  
  // --- School / Etablissement Settings States ---
  const [schoolName, setSchoolName] = useState<string>('Diongue-IziSchool');
  const [schoolSlogan, setSchoolSlogan] = useState<string>("Validé par la direction des études.");
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [schoolLogoType, setSchoolLogoType] = useState<'icon' | 'url'>('icon');
  const [schoolLogoIcon, setSchoolLogoIcon] = useState<string>('GraduationCap');

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('school_name', schoolName);
      localStorage.setItem('school_slogan', schoolSlogan);
      localStorage.setItem('school_logo', schoolLogo);
      localStorage.setItem('school_logo_type', schoolLogoType);
      localStorage.setItem('school_logo_icon', schoolLogoIcon);
      localStorage.setItem('school_active_days', JSON.stringify(activeDays));
      localStorage.setItem('school_start_hour', startHour.toString());
      localStorage.setItem('school_end_hour', endHour.toString());
      setExportScheduleConfig(activeDays, slotLabels);
    }
  }, [schoolName, schoolSlogan, schoolLogo, schoolLogoType, schoolLogoIcon, activeDays, startHour, endHour, slotLabels, isMounted]);

  // --- UI Control States ---
  const [activeTab, setActiveTab] = useState<'scheduleConfig' | 'subjects' | 'teachers' | 'classes' | 'timetable' | 'stats' | 'ai' | 'settings'>('scheduleConfig');
  const [timetableViewMode, setTimetableViewMode] = useState<'class' | 'teacher'>('class');
  const [selectedClassId, setSelectedClassId] = useState<string>(INITIAL_CLASSES[0]?.id || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [chefDetailModalType, setChefDetailModalType] = useState<ChefChartType | null>(null);
  const [generationScore, setGenerationScore] = useState<number>(() => {
    const solution = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES);
    return solution.score;
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };
  
  // --- Drag & Drop State ---
  const [draggedItem, setDraggedItem] = useState<{ type: 'grid' | 'basket'; entryId?: string; info?: any } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: string; slotIndex: number } | null>(null);
  const [dragValidation, setDragValidation] = useState<{ isValid: boolean; reason?: string } | null>(null);

  // --- AI Suggestion States ---
  const [aiSuggestions, setAiSuggestions] = useState<string>('');
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // --- SaaS Platform Multi-Tenant & Subscription States ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isDocViewOpen, setIsDocViewOpen] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const handleLoginClient = (email: string) => {
    setCurrentUserEmail(email);
    setSaasPortalMode('client');
    setCurrentViewMode('app');
    setIsAuthModalOpen(false);
    showNotification(`Connecté avec succès en tant que Client (${email})`, 'success');
  };

  const handleLoginAdmin = (email: string) => {
    setCurrentUserEmail(email);
    setSaasPortalMode('admin');
    setCurrentViewMode('app');
    setIsAuthModalOpen(false);
    showNotification(`Connecté avec succès en tant qu'Administrateur SaaS (${email})`, 'success');
  };

  const handleGoToLanding = () => {
    setCurrentViewMode('landing');
  };

  const [saasPortalMode, setSaasPortalMode] = useState<'client' | 'admin'>('client');
  const [saasPlans, setSaasPlans] = useState<SaaSPlan[]>(INITIAL_SAAS_PLANS);
  const [saasClients, setSaasClients] = useState<SaaSClient[]>(INITIAL_SAAS_CLIENTS);
  const [saasLicenseKeys, setSaasLicenseKeys] = useState<SaaSLicenseKey[]>(INITIAL_SAAS_LICENSE_KEYS);
  const [saasTransactions, setSaasTransactions] = useState<SaaSPaymentTransaction[]>(INITIAL_SAAS_TRANSACTIONS);
  const [saasSettings, setSaasSettings] = useState<SaaSGlobalSettings>(INITIAL_SAAS_SETTINGS);
  const [saasActivationRequests, setSaasActivationRequests] = useState<SaaSActivationRequest[]>(INITIAL_SAAS_ACTIVATION_REQUESTS);
  const [isClientSubModalOpen, setIsClientSubModalOpen] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const handleRequestAdminAccess = () => {
    if (saasPortalMode === 'admin') return;
    setAdminPinInput('');
    setAdminPinError('');
    setIsAdminPinModalOpen(true);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = adminPinInput.trim().toUpperCase();
    if (cleanPin === '1234' || cleanPin === 'ADMIN2026' || cleanPin === 'ADMIN') {
      setSaasPortalMode('admin');
      setIsAdminPinModalOpen(false);
      setAdminPinInput('');
      setAdminPinError('');
      showNotification("Authentification Administrateur SaaS réussie !", "success");
    } else {
      setAdminPinError("Code PIN d'accès Administrateur incorrect. Accès strictement réservé aux gestionnaires SaaS.");
    }
  };

  // Load state from localStorage on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          const savedTheme = localStorage.getItem('school_theme');
          if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);

          const savedSubjects = localStorage.getItem('school_subjects');
          if (savedSubjects) setSubjects(JSON.parse(savedSubjects));

          const savedTeachers = localStorage.getItem('school_teachers');
          if (savedTeachers) setTeachers(JSON.parse(savedTeachers));

          const savedClasses = localStorage.getItem('school_classes');
          if (savedClasses) {
            const parsedClasses = JSON.parse(savedClasses);
            setClasses(parsedClasses);
            if (parsedClasses.length > 0) setSelectedClassId(parsedClasses[0].id);
          }

          const savedTimetable = localStorage.getItem('school_timetable');
          if (savedTimetable) setTimetable(JSON.parse(savedTimetable));

          const savedUnscheduled = localStorage.getItem('school_unscheduled');
          if (savedUnscheduled) setUnscheduled(JSON.parse(savedUnscheduled));

          const savedName = localStorage.getItem('school_name');
          if (savedName) setSchoolName(savedName);

          const savedSlogan = localStorage.getItem('school_slogan');
          if (savedSlogan) setSchoolSlogan(savedSlogan);

          const savedLogo = localStorage.getItem('school_logo');
          if (savedLogo) setSchoolLogo(savedLogo);

          const savedLogoType = localStorage.getItem('school_logo_type');
          if (savedLogoType) setSchoolLogoType(savedLogoType as 'icon' | 'url');

          const savedLogoIcon = localStorage.getItem('school_logo_icon');
          if (savedLogoIcon) setSchoolLogoIcon(savedLogoIcon);

          const savedScore = localStorage.getItem('school_score');
          if (savedScore) setGenerationScore(Number(savedScore));

          const savedActiveDays = localStorage.getItem('school_active_days');
          if (savedActiveDays) {
            try {
              const parsed = JSON.parse(savedActiveDays);
              if (Array.isArray(parsed) && parsed.length > 0) setActiveDays(parsed);
            } catch {}
          }
          const savedStartHour = localStorage.getItem('school_start_hour');
          if (savedStartHour) setStartHour(Number(savedStartHour));
          const savedEndHour = localStorage.getItem('school_end_hour');
          if (savedEndHour) setEndHour(Number(savedEndHour));

          const savedMode = localStorage.getItem('saas_portal_mode');
          if (savedMode === 'client' || savedMode === 'admin') setSaasPortalMode(savedMode);

          const savedPlans = localStorage.getItem('saas_plans');
          if (savedPlans) {
            try {
              const parsed = JSON.parse(savedPlans);
              if (Array.isArray(parsed) && parsed.length === 4 && parsed[1]?.monthlyPriceFCFA === 10000 && parsed[2]?.monthlyPriceFCFA === 15000) {
                setSaasPlans(parsed);
              } else {
                setSaasPlans(INITIAL_SAAS_PLANS);
                localStorage.setItem('saas_plans', JSON.stringify(INITIAL_SAAS_PLANS));
              }
            } catch {
              setSaasPlans(INITIAL_SAAS_PLANS);
            }
          }

          const savedClients = localStorage.getItem('saas_clients');
          if (savedClients) {
            try {
              const parsed = JSON.parse(savedClients);
              if (Array.isArray(parsed) && parsed.length >= 6) {
                setSaasClients(parsed);
              } else {
                setSaasClients(INITIAL_SAAS_CLIENTS);
                localStorage.setItem('saas_clients', JSON.stringify(INITIAL_SAAS_CLIENTS));
              }
            } catch {
              setSaasClients(INITIAL_SAAS_CLIENTS);
            }
          }

          const savedKeys = localStorage.getItem('saas_keys');
          if (savedKeys) setSaasLicenseKeys(JSON.parse(savedKeys));

          const savedTxs = localStorage.getItem('saas_transactions');
          if (savedTxs) setSaasTransactions(JSON.parse(savedTxs));

          const savedSettings = localStorage.getItem('saas_settings');
          if (savedSettings) setSaasSettings(JSON.parse(savedSettings));

          const savedRequests = localStorage.getItem('saas_activation_requests');
          if (savedRequests) {
            try {
              const parsedReqs = JSON.parse(savedRequests);
              if (Array.isArray(parsedReqs)) {
                setSaasActivationRequests(parsedReqs);
              }
            } catch {
              setSaasActivationRequests(INITIAL_SAAS_ACTIVATION_REQUESTS);
            }
          }

          const savedClientId = localStorage.getItem('saas_current_client_id');
          const activeClientId = savedClientId || 'cli_01';
          if (savedClientId) setCurrentClientId(savedClientId);
          const savedGenCount = localStorage.getItem(`school_generation_count_${activeClientId}`);
          if (savedGenCount) setGenerationCount(parseInt(savedGenCount, 10));
          const savedExpCount = localStorage.getItem(`school_export_count_${activeClientId}`);
          if (savedExpCount) setExportCount(parseInt(savedExpCount, 10));
        } catch (e) {
          console.error('Error loading localStorage state:', e);
        }
      }
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync SaaS states to localStorage once mounted
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      localStorage.setItem('saas_portal_mode', saasPortalMode);
      localStorage.setItem('saas_plans', JSON.stringify(saasPlans));
      localStorage.setItem('saas_clients', JSON.stringify(saasClients));
      localStorage.setItem('saas_keys', JSON.stringify(saasLicenseKeys));
      localStorage.setItem('saas_transactions', JSON.stringify(saasTransactions));
      localStorage.setItem('saas_settings', JSON.stringify(saasSettings));
      localStorage.setItem('saas_current_client_id', currentClientId);
    }
  }, [saasPortalMode, saasPlans, saasClients, saasLicenseKeys, saasTransactions, saasSettings, currentClientId, isMounted]);

  // Current client context
  const currentClient = useMemo(() => {
    const found = saasClients.find(c => c.id === currentClientId);
    if (found) {
      return {
        ...found,
        classesCount: classes.length,
        teachersCount: teachers.length
      };
    }
    return {
      ...saasClients[0],
      classesCount: classes.length,
      teachersCount: teachers.length
    };
  }, [saasClients, currentClientId, classes.length, teachers.length]);

  // Current plan context
  const currentPlan = useMemo(() => {
    return saasPlans.find(p => p.id === currentClient.planId) || saasPlans[0];
  }, [saasPlans, currentClient.planId]);

  const maxGenerations = useMemo(() => {
    if (currentClient.planId === 'plan_trial') return 4;
    if (currentClient.planId === 'plan_standard') return 30;
    if (currentClient.planId === 'plan_premium') return 50;
    return 9999;
  }, [currentClient.planId]);

  const maxExports = useMemo(() => {
    if (currentClient.planId === 'plan_trial') return 4;
    if (currentClient.planId === 'plan_standard') return 25;
    if (currentClient.planId === 'plan_premium') return 50;
    return 9999;
  }, [currentClient.planId]);

  // Handle License Key Application (Accepts ANY valid key generated by the admin, robust normalization & matching)
  const handleApplyLicenseKey = (keyStr: string): { success: boolean; message: string } => {
    // 1. Robust normalization: uppercase, trim, remove internal/around-hyphen spaces
    const cleanKey = keyStr
      .trim()
      .toUpperCase()
      .replace(/\s*-\s*/g, '-')
      .replace(/\s+/g, '');

    if (!cleanKey || cleanKey.length < 8) {
      return { success: false, message: "Veuillez saisir une clé de licence valide." };
    }

    const nowStr = new Date().toISOString().split('T')[0];

    // 2. Look for an existing key in saasLicenseKeys
    let matchedKey = saasLicenseKeys.find(
      k => k.key.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, '') === cleanKey
    );

    // If key not in saasLicenseKeys, check if it was generated in activationRequests or clients
    if (!matchedKey) {
      const matchedRequest = saasActivationRequests.find(
        r => r.assignedKey && r.assignedKey.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, '') === cleanKey
      );

      if (matchedRequest) {
        matchedKey = {
          id: `key_${Date.now()}_dyn`,
          key: cleanKey,
          planId: matchedRequest.planId,
          durationDays: (matchedRequest.durationMonths || 1) * 30,
          generatedAt: nowStr,
          status: 'unused'
        };
      } else {
        // Also check if matches any client's licenseKey
        const matchedClient = saasClients.find(
          c => c.licenseKey && c.licenseKey.trim().toUpperCase().replace(/\s*-\s*/g, '-').replace(/\s+/g, '') === cleanKey
        );
        if (matchedClient) {
          matchedKey = {
            id: `key_${Date.now()}_dyn`,
            key: cleanKey,
            planId: matchedClient.planId,
            durationDays: 365,
            generatedAt: nowStr,
            status: 'unused'
          };
        }
      }
    }

    // 3. If still not found, check if it's a valid admin-formatted key (e.g. SCH-STANDARD-..., SCH-PREMIUM-..., SCH-SCHOOL-...)
    if (!matchedKey && cleanKey.startsWith('SCH-')) {
      const parts = cleanKey.split('-');
      if (parts.length >= 3) {
        const planCode = parts[1]; // e.g. STANDARD, PREMIUM, SCHOOL, PRO
        const targetPlan = saasPlans.find(
          p => p.code.toUpperCase() === planCode || p.id.toUpperCase().includes(planCode)
        ) || saasPlans.find(p => p.id === 'plan_standard');

        if (targetPlan) {
          matchedKey = {
            id: `key_${Date.now()}_gen`,
            key: cleanKey,
            planId: targetPlan.id,
            durationDays: 365,
            generatedAt: nowStr,
            status: 'unused'
          };
        }
      }
    }

    if (!matchedKey) {
      return {
        success: false,
        message: "Clé de licence introuvable. Veuillez vérifier votre saisie (ex: SCH-STANDARD-2026-XXXX-XXXX)."
      };
    }

    // Check revocation
    if (matchedKey.status === 'revoked') {
      return { success: false, message: "Cette clé de licence a été révoquée par l'administrateur SaaS." };
    }

    // Check if used by ANOTHER client
    if (matchedKey.status === 'used' && matchedKey.usedByClientId && matchedKey.usedByClientId !== currentClient.id) {
      return {
        success: false,
        message: `Cette clé a déjà été activée le ${matchedKey.usedAt || 'récemment'} par l'établissement "${matchedKey.usedByClientName || 'un autre client'}". Chaque clé est strictement à usage unique.`
      };
    }

    const matchedPlan = saasPlans.find(p => p.id === matchedKey.planId) || saasPlans[1];

    // 4. Update or Add key in saasLicenseKeys pool as USED by current client
    const keyExistsInPool = saasLicenseKeys.some(k => k.id === matchedKey!.id);
    const updatedKeyObj: SaaSLicenseKey = {
      ...matchedKey,
      status: 'used' as const,
      usedByClientId: currentClient.id,
      usedByClientName: currentClient.schoolName,
      usedAt: nowStr
    };

    const updatedKeys = keyExistsInPool
      ? saasLicenseKeys.map(k => k.id === matchedKey!.id ? updatedKeyObj : k)
      : [updatedKeyObj, ...saasLicenseKeys];

    setSaasLicenseKeys(updatedKeys);

    // 5. Update Subscription End Date
    const currentEnd = new Date(currentClient.subscriptionEndDate);
    const baseDate = (!isNaN(currentEnd.getTime()) && currentEnd > new Date() && currentClient.planId === matchedKey.planId)
      ? currentEnd
      : new Date();
    baseDate.setDate(baseDate.getDate() + (matchedKey.durationDays || 30));
    const subEndStr = baseDate.toISOString().split('T')[0];

    // 6. Update Client Record
    const durationMonths = Math.max(1, Math.round((matchedKey.durationDays || 30) / 30));
    const amountVal = matchedPlan.monthlyPriceFCFA * durationMonths;

    const updatedClients = saasClients.map(c => c.id === currentClient.id ? {
      ...c,
      planId: matchedKey!.planId,
      status: 'active' as const,
      subscriptionEndDate: subEndStr,
      licenseKey: matchedKey!.key,
      paymentMethod: 'Clé Licence' as PaymentMethod,
      totalPaidFCFA: (c.totalPaidFCFA || 0) + amountVal,
      notes: (c.notes || '') + `\n[Activation] Clé ${cleanKey} activée avec succès le ${nowStr}.`
    } : c);
    setSaasClients(updatedClients);

    // 7. Reset Quotas for the newly activated plan
    setGenerationCount(0);
    setExportCount(0);

    // 8. Update matching Activation Request if any
    const updatedRequests = saasActivationRequests.map(r => {
      if (
        (r.assignedKey && r.assignedKey.trim().toUpperCase() === cleanKey) ||
        (r.clientId === currentClient.id && r.status === 'pending') ||
        (r.adminEmail.toLowerCase() === currentClient.adminEmail.toLowerCase() && r.status === 'pending')
      ) {
        return {
          ...r,
          status: 'delivered' as const,
          deliveredAt: `${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
          assignedKey: cleanKey
        };
      }
      return r;
    });
    setSaasActivationRequests(updatedRequests);

    // 9. Record Financial Transaction
    const newTx: SaaSPaymentTransaction = {
      id: `tx_${Date.now()}_key`,
      invoiceRef: `LIC-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: currentClient.id,
      clientName: currentClient.schoolName,
      amountFCFA: amountVal,
      amountEUR: Math.round(amountVal / 655.957),
      paymentMethod: 'Clé Licence',
      status: 'completed',
      date: nowStr,
      planName: matchedPlan.name,
      period: `${matchedKey.durationDays || 30} jours (Clé)`
    };
    setSaasTransactions(prev => [newTx, ...prev]);

    // 10. Direct LocalStorage Sync
    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_keys', JSON.stringify(updatedKeys));
      localStorage.setItem('saas_clients', JSON.stringify(updatedClients));
      localStorage.setItem('saas_activation_requests', JSON.stringify(updatedRequests));
      localStorage.setItem(`school_generation_count_${currentClient.id}`, '0');
      localStorage.setItem(`school_export_count_${currentClient.id}`, '0');
    }

    const successMsg = `🎉 Félicitations ! Votre formule "${matchedPlan.name}" est activée avec succès jusqu'au ${subEndStr} ! Toutes vos fonctionnalités sont désormais débloquées.`;
    showNotification(successMsg, 'success');
    return { success: true, message: successMsg };
  };

  // Handle Online Simulated Payment
  const handleSimulatePayment = (planId: string, paymentMethod: PaymentMethod, durationMonths: number) => {
    const plan = saasPlans.find(p => p.id === planId);
    if (!plan) return;

    const nowStr = new Date().toISOString().split('T')[0];
    const subEnd = new Date();
    subEnd.setMonth(subEnd.getMonth() + durationMonths);
    const subEndStr = subEnd.toISOString().split('T')[0];

    const amount = plan.monthlyPriceFCFA * durationMonths;

    const updatedClients = saasClients.map(c => c.id === currentClient.id ? {
      ...c,
      planId: plan.id,
      status: 'active' as const,
      subscriptionEndDate: subEndStr,
      paymentMethod: paymentMethod,
      totalPaidFCFA: c.totalPaidFCFA + amount
    } : c);
    setSaasClients(updatedClients);

    // Record Transaction
    const newTx: SaaSPaymentTransaction = {
      id: `tx_${Date.now()}`,
      invoiceRef: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: currentClient.id,
      clientName: currentClient.schoolName,
      amountFCFA: amount,
      amountEUR: Math.round(amount / 655.957),
      paymentMethod: paymentMethod,
      status: 'completed',
      date: nowStr,
      planName: plan.name,
      period: `${durationMonths} mois`
    };
    setSaasTransactions([newTx, ...saasTransactions]);

    showNotification(`Paiement de ${amount.toLocaleString('fr-FR')} FCFA via ${paymentMethod} confirmé !`, 'success');
  };

  // Update activation requests
  const handleUpdateActivationRequests = (requests: SaaSActivationRequest[]) => {
    setSaasActivationRequests(requests);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_activation_requests', JSON.stringify(requests));
    }
  };

  // Create an activation, upgrade or renewal request
  const handleCreateActivationRequest = (params: {
    type: 'new_activation' | 'upgrade' | 'renewal';
    schoolName: string;
    adminName?: string;
    adminEmail: string;
    whatsapp: string;
    planId: string;
    clientId?: string;
    amountFCFA?: number;
    durationMonths?: number;
    paymentMethod?: PaymentMethod;
  }) => {
    const targetPlan = saasPlans.find(p => p.id === params.planId);
    const amount = params.amountFCFA ?? (targetPlan?.monthlyPriceFCFA || 0);
    const duration = params.durationMonths || 1;
    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

    const newRequest: SaaSActivationRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: params.type,
      schoolName: params.schoolName,
      adminName: params.adminName || `Admin ${params.schoolName}`,
      adminEmail: params.adminEmail,
      whatsapp: params.whatsapp,
      cityCountry: 'Sénégal',
      planId: params.planId,
      clientId: params.clientId,
      amountFCFA: amount,
      durationMonths: duration,
      paymentMethod: params.paymentMethod || 'Wave',
      status: 'pending',
      requestedAt: dateFormatted,
      notes: `Demande de ${params.type === 'new_activation' ? 'nouvelle activation' : params.type === 'upgrade' ? 'mise à niveau' : 'renouvellement'} pour ${targetPlan?.name || 'Abonnement'}.`
    };

    const updated = [newRequest, ...saasActivationRequests];
    setSaasActivationRequests(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_activation_requests', JSON.stringify(updated));
    }

    showNotification(`Demande d'activation enregistrée pour ${params.schoolName} !`, 'success');
  };

  // Validate request, deliver key and automatically register client (Gated until key redemption)
  const handleValidateAndDeliverRequest = (requestId: string, deliveryType?: 'whatsapp' | 'email') => {
    const req = saasActivationRequests.find(r => r.id === requestId);
    if (!req) return;

    let keyToSend = req.assignedKey;
    let updatedKeys = [...saasLicenseKeys];
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];
    const year = now.getFullYear();

    // 1. Generate or allocate key if not yet assigned (Status MUST remain 'unused' so client can redeem it)
    if (!keyToSend) {
      const unusedKeyIndex = saasLicenseKeys.findIndex(k => k.planId === req.planId && k.status === 'unused');
      if (unusedKeyIndex !== -1) {
        const foundKey = saasLicenseKeys[unusedKeyIndex];
        keyToSend = foundKey.key;
      } else {
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let block1 = '';
        let block2 = '';
        for (let b = 0; b < 4; b++) {
          block1 += charset.charAt(Math.floor(Math.random() * charset.length));
          block2 += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        const targetPlan = saasPlans.find(p => p.id === req.planId);
        keyToSend = `SCH-${targetPlan?.code || 'KEY'}-${year}-${block1}-${block2}`;

        const newKeyObj: SaaSLicenseKey = {
          id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          key: keyToSend,
          planId: req.planId,
          durationDays: req.durationMonths * 30,
          generatedAt: nowStr,
          status: 'unused' // Must remain 'unused' until the client enters it!
        };
        updatedKeys = [newKeyObj, ...saasLicenseKeys];
      }
    }

    // 2. Mark request as delivered
    const updatedRequests = saasActivationRequests.map(r => r.id === requestId ? {
      ...r,
      status: 'delivered' as const,
      deliveredAt: `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      assignedKey: keyToSend
    } : r);

    // 3. Register or Update Client in saasClients list (Gated with status: 'pending_key' and planId: 'plan_trial' until key is redeemed)
    let updatedClients = [...saasClients];

    if (req.type === 'new_activation') {
      const newClient: SaaSClient = {
        id: `cli_${Date.now()}`,
        schoolName: req.schoolName,
        logoIcon: 'GraduationCap',
        adminName: req.adminName || `Admin ${req.schoolName}`,
        adminEmail: req.adminEmail,
        phone: req.whatsapp,
        whatsapp: req.whatsapp,
        cityCountry: req.cityCountry || 'Sénégal',
        planId: 'plan_trial', // Must remain 'plan_trial' until key is entered by client!
        status: 'pending_key', // Pending key status!
        startDate: nowStr,
        trialEndDate: nowStr,
        subscriptionEndDate: nowStr,
        paymentMethod: req.paymentMethod,
        totalPaidFCFA: req.amountFCFA,
        createdAt: nowStr,
        lastActiveAt: 'À l\'instant',
        classesCount: 0,
        teachersCount: 0,
        notes: `Achat validé. Clé ${keyToSend} transmise par l'administrateur. En attente de saisie de la clé par l'établissement pour activer le forfait.`
      };
      updatedClients = [newClient, ...saasClients];
    } else {
      // Upgrade or renewal: keep existing plan and note the transmitted key
      updatedClients = saasClients.map(c => {
        if ((req.clientId && c.id === req.clientId) || c.adminEmail.toLowerCase() === req.adminEmail.toLowerCase() || c.schoolName.toLowerCase() === req.schoolName.toLowerCase()) {
          return {
            ...c,
            totalPaidFCFA: (c.totalPaidFCFA || 0) + req.amountFCFA,
            notes: (c.notes || '') + `\n[Demande ${req.type}] Clé ${keyToSend} transmise le ${nowStr}. En attente de validation par l'établissement.`
          };
        }
        return c;
      });
    }

    // 4. Record Transaction
    const newTx: SaaSPaymentTransaction = {
      id: `tx_${Date.now()}`,
      invoiceRef: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: req.clientId || `cli_${Date.now()}`,
      clientName: req.schoolName,
      amountFCFA: req.amountFCFA,
      amountEUR: Math.round(req.amountFCFA / 655.957),
      paymentMethod: req.paymentMethod,
      status: 'completed',
      date: nowStr,
      planName: saasPlans.find(p => p.id === req.planId)?.name || 'Abonnement',
      period: `${req.durationMonths} mois`
    };
    const updatedTransactions = [newTx, ...saasTransactions];

    // Save state & localStorage
    setSaasActivationRequests(updatedRequests);
    setSaasClients(updatedClients);
    setSaasLicenseKeys(updatedKeys);
    setSaasTransactions(updatedTransactions);

    if (typeof window !== 'undefined') {
      localStorage.setItem('saas_activation_requests', JSON.stringify(updatedRequests));
      localStorage.setItem('saas_clients', JSON.stringify(updatedClients));
      localStorage.setItem('saas_keys', JSON.stringify(updatedKeys));
      localStorage.setItem('saas_transactions', JSON.stringify(updatedTransactions));
    }

    showNotification(`Établissement ${req.schoolName} enregistré (en attente d'activation de sa clé) !`, 'success');

    // 5. Open messaging if requested
    const targetPlan = saasPlans.find(p => p.id === req.planId);
    const planName = targetPlan?.name || 'Abonnement';
    const messageText = `Bonjour ! Votre commande pour l'établissement "${req.schoolName}" (${planName}) a été validée. Voici votre clé d'activation Planora : ${keyToSend}. Pour débloquer votre formule, connectez-vous sur votre Espace Établissement et renseignez cette clé dans la section "Activer ma clé de licence".`;

    if (deliveryType === 'whatsapp') {
      const cleanPhone = req.whatsapp.replace(/[^0-9]/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
    } else if (deliveryType === 'email') {
      const emailSubject = `Votre clé d'activation Planora - ${req.schoolName}`;
      const mailUrl = `mailto:${req.adminEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageText)}`;
      window.open(mailUrl, '_blank');
    }
  };

  // Handle a new license key purchase request from modal
  const handlePurchaseLicenseRequest = (schoolName: string, adminEmail: string, whatsapp: string, planId: string) => {
    handleCreateActivationRequest({
      type: 'new_activation',
      schoolName,
      adminEmail,
      whatsapp,
      planId
    });
  };

  // Switch to client view from admin
  const handleSwitchToClientView = (client: SaaSClient) => {
    setCurrentClientId(client.id);
    setSchoolName(client.schoolName);
    setSaasPortalMode('client');
    const savedGenCount = localStorage.getItem(`school_generation_count_${client.id}`);
    setGenerationCount(savedGenCount ? parseInt(savedGenCount, 10) : 0);
    const savedExpCount = localStorage.getItem(`school_export_count_${client.id}`);
    setExportCount(savedExpCount ? parseInt(savedExpCount, 10) : 0);
    showNotification(`Connecté à l'espace de l'établissement : ${client.schoolName}`, 'info');
  };
  const [isExecutingAi, setIsExecutingAi] = useState<boolean>(false);
  const [aiExecutionReasoning, setAiExecutionReasoning] = useState<string>('');

  // Specific Problem Solving States:
  const [problemQuery, setProblemQuery] = useState<string>('');
  const [problemAnalysis, setProblemAnalysis] = useState<string>('');
  const [isAnalyzingProblem, setIsAnalyzingProblem] = useState<boolean>(false);

  // --- New Item Form States ---
  // Subject Form
  const [newSubName, setNewSubName] = useState('');
  
  // Teacher Form
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherQuota, setNewTeacherQuota] = useState<number>(18);
  const [newTeacherColor, setNewTeacherColor] = useState('#3b82f6');
  const [newTeacherSubjects, setNewTeacherSubjects] = useState<string[]>([]);
  const [newTeacherUnavail, setNewTeacherUnavail] = useState<DayTimeSlot[]>([]);

  // Class Form
  const [newClassName, setNewClassName] = useState('');
  const [newClassUnavail, setNewClassUnavail] = useState<DayTimeSlot[]>([]);
  const [classAssignments, setClassAssignments] = useState<{ teacherId: string; subjectId: string; hoursPerWeek: number }[]>([]);
  // Temp state to add an assignment block inside class form
  const [tempTeacherId, setTempTeacherId] = useState('');
  const [tempSubjectId, setTempSubjectId] = useState('');
  const [tempHours, setTempHours] = useState<number>(2);

  // Editing items trackers
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Save Initial Values once when mounted if empty
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined' && !localStorage.getItem('school_subjects')) {
      localStorage.setItem('school_subjects', JSON.stringify(subjects));
      localStorage.setItem('school_teachers', JSON.stringify(teachers));
      localStorage.setItem('school_classes', JSON.stringify(classes));
      localStorage.setItem('school_timetable', JSON.stringify(timetable));
      localStorage.setItem('school_unscheduled', JSON.stringify(unscheduled));
      localStorage.setItem('school_score', generationScore.toString());
    }
  }, [subjects, teachers, classes, timetable, unscheduled, generationScore, isMounted]);

  // Sync state to local storage helper
  const syncToLocalStorage = (newSubs: Subject[], newTeachs: Teacher[], newCls: ClassGroup[], newTable?: TimetableEntry[], newUn?: any[], newScr?: number) => {
    localStorage.setItem('school_subjects', JSON.stringify(newSubs));
    localStorage.setItem('school_teachers', JSON.stringify(newTeachs));
    localStorage.setItem('school_classes', JSON.stringify(newCls));
    if (newTable) localStorage.setItem('school_timetable', JSON.stringify(newTable));
    if (newUn) localStorage.setItem('school_unscheduled', JSON.stringify(newUn));
    if (newScr !== undefined) localStorage.setItem('school_score', newScr.toString());
  };

  // --- Backup & Restore Handlers ---
  const handleExportBackup = () => {
    const data = {
      schoolName,
      schoolSlogan,
      schoolLogo,
      schoolLogoType,
      schoolLogoIcon,
      subjects,
      teachers,
      classes,
      timetable,
      unscheduled,
      generationScore
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(schoolName || 'school').toLowerCase().replace(/\s+/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Sauvegarde JSON complète de l'établissement exportée avec succès !", "success");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.subjects && data.teachers && data.classes) {
          setSubjects(data.subjects);
          setTeachers(data.teachers);
          setClasses(data.classes);
          if (data.timetable) setTimetable(data.timetable);
          if (data.unscheduled) setUnscheduled(data.unscheduled);
          if (data.schoolName) setSchoolName(data.schoolName);
          if (data.schoolSlogan) setSchoolSlogan(data.schoolSlogan);
          if (data.schoolLogo) setSchoolLogo(data.schoolLogo);
          if (data.schoolLogoType) setSchoolLogoType(data.schoolLogoType);
          if (data.schoolLogoIcon) setSchoolLogoIcon(data.schoolLogoIcon);
          if (data.generationScore !== undefined) setGenerationScore(data.generationScore);

          syncToLocalStorage(
            data.subjects,
            data.teachers,
            data.classes,
            data.timetable,
            data.unscheduled,
            data.generationScore
          );
          showNotification("Restauration des données depuis le fichier JSON réussie !", "success");
        } else {
          showNotification("Fichier JSON invalide. Structure attendue manquante.", "error");
        }
      } catch (err) {
        showNotification("Erreur de lecture du fichier JSON.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données de l'établissement aux données de démonstration par défaut ? Cette opération écrasera vos modifications actuelles.")) {
      setSubjects(INITIAL_SUBJECTS);
      setTeachers(INITIAL_TEACHERS);
      setClasses(INITIAL_CLASSES);
      const solution = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES, activeDays, totalSlots);
      setTimetable(solution.timetable);
      setUnscheduled(solution.unscheduled);
      setGenerationScore(solution.score);
      setSchoolName('Diongue-IziSchool');
      setSchoolSlogan('Validé par la direction des études.');
      
      syncToLocalStorage(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES, solution.timetable, solution.unscheduled, solution.score);
      showNotification("Réinitialisation aux données par défaut effectuée !", "info");
    }
  };

  // Auto set first active class/teacher to view when they change
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      const firstId = classes[0].id;
      setTimeout(() => setSelectedClassId(firstId), 0);
    }
    if (teachers.length > 0 && !selectedTeacherId) {
      const firstId = teachers[0].id;
      setTimeout(() => setSelectedTeacherId(firstId), 0);
    }
  }, [classes, teachers, selectedClassId, selectedTeacherId]);

  // Show Toast Toast Notification
  const triggerNotification = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Reset to Defaults helper
  const handleResetToDefaults = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données pour charger la configuration de démonstration ?")) {
      setSubjects(INITIAL_SUBJECTS);
      setTeachers(INITIAL_TEACHERS);
      setClasses(INITIAL_CLASSES);
      
      const res = generateTimetable(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES, activeDays, totalSlots);
      setTimetable(res.timetable);
      setUnscheduled(res.unscheduled);
      setGenerationScore(res.score);
      
      syncToLocalStorage(INITIAL_SUBJECTS, INITIAL_TEACHERS, INITIAL_CLASSES, res.timetable, res.unscheduled, res.score);
      triggerNotification("Données de démo Diongue-IziSchool chargées avec succès !");
    }
  };

  // Wipe All Data
  const handleWipeAll = () => {
    if (window.confirm("Attention: Cela effacera toutes les fiches (Matières, Professeurs, Classes). Confirmer ?")) {
      setSubjects([]);
      setTeachers([]);
      setClasses([]);
      setTimetable([]);
      setUnscheduled([]);
      setGenerationScore(0);
      syncToLocalStorage([], [], [], [], [], 0);
      triggerNotification("Toutes les données scolaires ont été effacées.", "info");
    }
  };

  // --- AUTOMATIC CONSTRAINT GENERATION ENGINE CALL ---
  const handleAutoGenerate = async () => {
    if (generationCount >= maxGenerations) {
      triggerNotification(`Limite de générations d'emplois du temps atteinte pour votre offre (${maxGenerations} max). Veuillez passer à la formule supérieure.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    setIsGenerating(true);
    triggerNotification("Lancement du moteur de résolution sous contraintes...", "info");
    
    setTimeout(async () => {
      try {
        const response = await fetch('/api/timetable/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjects, teachers, classes, activeDays, totalSlots })
        });

        if (!response.ok) {
          throw new Error("L'action serveur de génération a renvoyé une erreur.");
        }

        const data = await response.json();
        setTimetable(data.timetable);
        setUnscheduled(data.unscheduled);
        setGenerationScore(data.score);
        setGenerationCount(prev => prev + 1);
        
        syncToLocalStorage(subjects, teachers, classes, data.timetable, data.unscheduled, data.score);
        
        if (data.isFullyScheduled) {
          triggerNotification("Emploi du temps résolu avec succès ! Score: 100%", "success");
        } else {
          triggerNotification(`Généré avec contraintes assouplies (${data.score}% planifié). Vérifiez les alertes.`, "info");
        }
      } catch (err: any) {
        console.error(err);
        // Local fallback solve just in case network is slow
        const localSol = generateTimetable(subjects, teachers, classes, activeDays, totalSlots);
        setTimetable(localSol.timetable);
        setUnscheduled(localSol.unscheduled);
        setGenerationScore(localSol.score);
        setGenerationCount(prev => prev + 1);
        syncToLocalStorage(subjects, teachers, classes, localSol.timetable, localSol.unscheduled, localSol.score);
        triggerNotification("Génération complétée en local (moteur embarqué).", "success");
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
  };

  // --- AI SUGGESTIONS CONCIERGE CALL ---
  const handleQueryAiSuggestions = async () => {
    if (!currentPlan.features.geminiAI) {
      triggerNotification("Les fonctionnalités d'intelligence artificielle Gemini ne sont pas incluses dans votre formule actuelle.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    setIsLoadingAi(true);
    setAiSuggestions("L'assistant Gemini analyse vos conflits de planning, les temps d'attente des professeurs et les plages horaires...");
    
    try {
      const response = await fetch('/api/timetable/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects, teachers, classes, timetable, unscheduled })
      });

      const data = await response.json();
      if (data.error) {
        setAiSuggestions(`Désolé, l'assistant IA a rencontré un problème : ${data.error}`);
      } else {
        setAiSuggestions(data.text);
      }
    } catch (err: any) {
      console.error(err);
      setAiSuggestions("Erreur de connexion avec l'IA. Veuillez vérifier que la clé API Gemini est définie ou réessayez.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  // --- SPECIFIC PROBLEM DIAGNOSIS & REPLANNING VIA AI AGENT ---
  const handleAnalyzeProblem = async () => {
    if (!currentPlan.features.geminiAI) {
      triggerNotification("Les fonctionnalités d'intelligence artificielle Gemini ne sont pas incluses dans votre formule actuelle.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (!problemQuery.trim()) {
      triggerNotification("Veuillez formuler le problème d'emploi du temps à l'IA.", "error");
      return;
    }
    setIsAnalyzingProblem(true);
    setProblemAnalysis("L'assistant Gemini analyse votre problème spécifique et étudie les possibilités de déplacement des cours...");
    setAiExecutionReasoning('');

    try {
      const response = await fetch('/api/timetable/ai-analyze-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects,
          teachers,
          classes,
          timetable,
          unscheduled,
          problem: problemQuery
        })
      });

      const data = await response.json();
      if (data.error) {
        setProblemAnalysis(`Impossible de formuler un diagnostic : ${data.error}`);
      } else {
        setProblemAnalysis(data.text);
      }
    } catch (err: any) {
      console.error(err);
      setProblemAnalysis("Erreur de connexion avec l'IA. Veuillez vérifier votre clé API.");
    } finally {
      setIsAnalyzingProblem(false);
    }
  };

  const handleExecuteAi = async (actionType: 'apply-suggestions' | 'solve-problem') => {
    if (!currentPlan.features.geminiAI) {
      triggerNotification("Les fonctionnalités d'intelligence artificielle Gemini ne sont pas incluses dans votre formule actuelle.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    setIsExecutingAi(true);
    setAiExecutionReasoning("L'Agent IA calcule le nouvel ordonnancement et applique les modifications de planning...");

    try {
      const response = await fetch('/api/timetable/ai-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionType,
          subjects,
          teachers,
          classes,
          timetable,
          unscheduled,
          problem: problemQuery,
          suggestions: aiSuggestions
        })
      });

      const data = await response.json();
      if (data.error) {
        triggerNotification(`Échec de replanification : ${data.error}`, 'error');
        setAiExecutionReasoning('');
      } else {
        setTimetable(data.timetable);
        setUnscheduled(data.unscheduled);
        setGenerationScore(data.score);
        setAiExecutionReasoning(data.reasoning);
        
        syncToLocalStorage(subjects, teachers, classes, data.timetable, data.unscheduled, data.score);
        triggerNotification("L'emploi du temps a été mis à jour par l'Agent IA !", "success");

        if (actionType === 'apply-suggestions') {
          setAiSuggestions('');
        } else {
          setProblemAnalysis('');
          setProblemQuery('');
        }
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification("Une erreur de communication est survenue avec l'agent.", "error");
      setAiExecutionReasoning('');
    } finally {
      setIsExecutingAi(false);
    }
  };

  // --- DRAG & DROP EVENT HANDLERS (Frictionless HTML5 APIs) ---
  const handleGridDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedItem({ type: 'grid', entryId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleBasketDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem({ type: 'basket', info: item });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOverCell = (e: React.DragEvent, day: string, slotIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    // Check if cell is different
    if (dragOverCell?.day === day && dragOverCell?.slotIndex === slotIndex) {
      return;
    }

    setDragOverCell({ day, slotIndex });

    // Live validation
    if (draggedItem.type === 'grid' && draggedItem.entryId) {
      const entryToMove = timetable.find(t => t.id === draggedItem.entryId);
      if (entryToMove) {
        const val = validateManualMove(timetable, classes, teachers, entryToMove, day, slotIndex, startHour);
        setDragValidation(val);
      }
    } else if (draggedItem.type === 'basket' && draggedItem.info) {
      // Mock validate as if it is placed
      const mockEntry: TimetableEntry = {
        id: 'temp-drag',
        classId: draggedItem.info.classId,
        teacherId: draggedItem.info.teacherId,
        subjectId: draggedItem.info.subjectId,
        day,
        slotIndex
      };
      const val = validateManualMove(timetable, classes, teachers, mockEntry, day, slotIndex, startHour);
      setDragValidation(val);
    }
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
    setDragValidation(null);
  };

  const handleDropOnCell = (e: React.DragEvent, day: string, slotIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'grid' && draggedItem.entryId) {
      const entryToMove = timetable.find(t => t.id === draggedItem.entryId);
      if (entryToMove) {
        const val = validateManualMove(timetable, classes, teachers, entryToMove, day, slotIndex, startHour);
        if (val.isValid) {
          // Perform move!
          const updatedTable = timetable.map(item => {
            if (item.id === draggedItem.entryId) {
              return { ...item, day, slotIndex };
            }
            return item;
          });
          setTimetable(updatedTable);
          syncToLocalStorage(subjects, teachers, classes, updatedTable, unscheduled, generationScore);
          triggerNotification("Créneau déplacé avec succès !");
        } else {
          triggerNotification(val.reason || "Déplacement invalide.", "error");
        }
      }
    } else if (draggedItem.type === 'basket' && draggedItem.info) {
      const { classId, teacherId, subjectId } = draggedItem.info;
      const mockEntry: TimetableEntry = {
        id: 'temp-drop',
        classId,
        teacherId,
        subjectId,
        day,
        slotIndex
      };
      
      const val = validateManualMove(timetable, classes, teachers, mockEntry, day, slotIndex, startHour);
      if (val.isValid) {
        // Create new entry
        const newEntry: TimetableEntry = {
          id: `entry-manual-${entryIdCounterRef.current++}`,
          classId,
          teacherId,
          subjectId,
          day,
          slotIndex
        };
        const updatedTable = [...timetable, newEntry];

        // Deduct hour from unscheduled basket
        const updatedUnscheduled = unscheduled.map(item => {
          if (item.classId === classId && item.teacherId === teacherId && item.subjectId === subjectId) {
            return { ...item, hours: item.hours - 1 };
          }
          return item;
        }).filter(item => item.hours > 0);

        setTimetable(updatedTable);
        setUnscheduled(updatedUnscheduled);
        
        // Recalculate score
        const totalTarget = classes.reduce((sum, c) => sum + c.assignments.reduce((s, a) => s + a.hoursPerWeek, 0), 0);
        const newScore = totalTarget > 0 ? Math.round((updatedTable.length / totalTarget) * 100) : 100;
        setGenerationScore(newScore);

        syncToLocalStorage(subjects, teachers, classes, updatedTable, updatedUnscheduled, newScore);
        triggerNotification("Heure placée avec succès depuis la corbeille !");
      } else {
        triggerNotification(val.reason || "Impossible de placer cette heure ici.", "error");
      }
    }

    setDraggedItem(null);
    setDragOverCell(null);
    setDragValidation(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    const entry = timetable.find(e => e.id === entryId);
    if (!entry) return;

    if (window.confirm("Enlever ce cours et le renvoyer dans la corbeille des heures non planifiées ?")) {
      const updatedTable = timetable.filter(item => item.id !== entryId);
      
      // Send back to basket
      const existingUnscheduledIdx = unscheduled.findIndex(
        u => u.classId === entry.classId && u.teacherId === entry.teacherId && u.subjectId === entry.subjectId
      );

      let updatedUnscheduled = [...unscheduled];
      if (existingUnscheduledIdx !== -1) {
        updatedUnscheduled[existingUnscheduledIdx] = {
          ...updatedUnscheduled[existingUnscheduledIdx],
          hours: updatedUnscheduled[existingUnscheduledIdx].hours + 1
        };
      } else {
        updatedUnscheduled.push({
          classId: entry.classId,
          teacherId: entry.teacherId,
          subjectId: entry.subjectId,
          hours: 1,
          reason: "Retiré manuellement de l'emploi du temps."
        });
      }

      setTimetable(updatedTable);
      setUnscheduled(updatedUnscheduled);

      const totalTarget = classes.reduce((sum, c) => sum + c.assignments.reduce((s, a) => s + a.hoursPerWeek, 0), 0);
      const newScore = totalTarget > 0 ? Math.round((updatedTable.length / totalTarget) * 100) : 100;
      setGenerationScore(newScore);

      syncToLocalStorage(subjects, teachers, classes, updatedTable, updatedUnscheduled, newScore);
      triggerNotification("Séance retirée.", "info");
    }
  };

  const handleDeleteBlockEntries = (entries: TimetableEntry[]) => {
    if (entries.length === 0) return;
    const sample = entries[0];
    const count = entries.length;

    const subName = subjects.find(s => s.id === sample.subjectId)?.name || sample.subjectId;
    if (window.confirm(`Enlever ce cours de ${count}h de ${subName} et le renvoyer dans la corbeille ?`)) {
      const idsToRemove = new Set(entries.map(e => e.id));
      const updatedTable = timetable.filter(item => !idsToRemove.has(item.id));
      
      const existingUnscheduledIdx = unscheduled.findIndex(
        u => u.classId === sample.classId && u.teacherId === sample.teacherId && u.subjectId === sample.subjectId
      );

      let updatedUnscheduled = [...unscheduled];
      if (existingUnscheduledIdx !== -1) {
        updatedUnscheduled[existingUnscheduledIdx] = {
          ...updatedUnscheduled[existingUnscheduledIdx],
          hours: updatedUnscheduled[existingUnscheduledIdx].hours + count
        };
      } else {
        updatedUnscheduled.push({
          classId: sample.classId,
          teacherId: sample.teacherId,
          subjectId: sample.subjectId,
          hours: count,
          reason: "Retiré manuellement de l'emploi du temps."
        });
      }

      setTimetable(updatedTable);
      setUnscheduled(updatedUnscheduled);

      const totalTarget = classes.reduce((sum, c) => sum + c.assignments.reduce((s, a) => s + a.hoursPerWeek, 0), 0);
      const newScore = totalTarget > 0 ? Math.round((updatedTable.length / totalTarget) * 100) : 100;
      setGenerationScore(newScore);

      syncToLocalStorage(subjects, teachers, classes, updatedTable, updatedUnscheduled, newScore);
      triggerNotification(`Séance de ${count}h retirée.`, "info");
    }
  };

  // --- COMPUTES & RENDERS ---

  // Helper to compute rowSpan and grouped entries for Class View
  const getClassCellSpanInfo = (classId: string, day: string, slotIndex: number) => {
    const currentCls = classes.find(c => c.id === classId);
    const entry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === slotIndex);
    const isClassUnavailable = currentCls?.unavailability.some(u => u.day === day && u.slotIndex === slotIndex);

    if (entry) {
      if (slotIndex > 0) {
        const prevEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === slotIndex - 1);
        if (
          prevEntry &&
          prevEntry.classId === entry.classId &&
          prevEntry.teacherId === entry.teacherId &&
          prevEntry.subjectId === entry.subjectId
        ) {
          return { isContinuation: true, rowSpan: 1, blockEntries: [], isUnavailableSpan: false };
        }
      }

      let span = 1;
      const blockEntries = [entry];
      for (let s = slotIndex + 1; s < slotLabels.length; s++) {
        const nextEntry = timetable.find(e => e.classId === classId && e.day === day && e.slotIndex === s);
        if (
          nextEntry &&
          nextEntry.classId === entry.classId &&
          nextEntry.teacherId === entry.teacherId &&
          nextEntry.subjectId === entry.subjectId
        ) {
          span++;
          blockEntries.push(nextEntry);
        } else {
          break;
        }
      }

      return { isContinuation: false, rowSpan: span, blockEntries, isUnavailableSpan: false };
    }

    if (isClassUnavailable) {
      if (slotIndex > 0) {
        const prevUnav = currentCls?.unavailability.some(u => u.day === day && u.slotIndex === slotIndex - 1);
        if (prevUnav) {
          return { isContinuation: true, rowSpan: 1, blockEntries: [], isUnavailableSpan: true };
        }
      }

      let span = 1;
      for (let s = slotIndex + 1; s < slotLabels.length; s++) {
        const nextUnav = currentCls?.unavailability.some(u => u.day === day && u.slotIndex === s);
        if (nextUnav) {
          span++;
        } else {
          break;
        }
      }

      return { isContinuation: false, rowSpan: span, blockEntries: [], isUnavailableSpan: true };
    }

    return { isContinuation: false, rowSpan: 1, blockEntries: [], isUnavailableSpan: false };
  };

  // Helper to compute rowSpan and grouped entries for Teacher View
  const getTeacherCellSpanInfo = (teacher: Teacher, day: string, slotIndex: number) => {
    const entry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === slotIndex);
    const isTeacherUnavail = teacher.unavailability?.some(u => u.day === day && u.slotIndex === slotIndex);

    if (entry) {
      if (slotIndex > 0) {
        const prevEntry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === slotIndex - 1);
        if (
          prevEntry &&
          prevEntry.teacherId === entry.teacherId &&
          prevEntry.subjectId === entry.subjectId &&
          prevEntry.classId === entry.classId
        ) {
          return { isContinuation: true, rowSpan: 1, blockEntries: [], isUnavailableSpan: false };
        }
      }

      let span = 1;
      const blockEntries = [entry];
      for (let s = slotIndex + 1; s < slotLabels.length; s++) {
        const nextEntry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === s);
        if (
          nextEntry &&
          nextEntry.teacherId === entry.teacherId &&
          nextEntry.subjectId === entry.subjectId &&
          nextEntry.classId === entry.classId
        ) {
          span++;
          blockEntries.push(nextEntry);
        } else {
          break;
        }
      }

      return { isContinuation: false, rowSpan: span, blockEntries, isUnavailableSpan: false };
    }

    if (isTeacherUnavail) {
      if (slotIndex > 0) {
        const prevUnav = teacher.unavailability?.some(u => u.day === day && u.slotIndex === slotIndex - 1);
        if (prevUnav) {
          return { isContinuation: true, rowSpan: 1, blockEntries: [], isUnavailableSpan: true };
        }
      }

      let span = 1;
      for (let s = slotIndex + 1; s < slotLabels.length; s++) {
        const nextUnav = teacher.unavailability?.some(u => u.day === day && u.slotIndex === s);
        if (nextUnav) {
          span++;
        } else {
          break;
        }
      }

      return { isContinuation: false, rowSpan: span, blockEntries: [], isUnavailableSpan: true };
    }

    return { isContinuation: false, rowSpan: 1, blockEntries: [], isUnavailableSpan: false };
  };

  // Grid visual helper: Map day and slotIndex to a styled block
  const renderCellContent = (
    day: string,
    slotIndex: number,
    spanInfo?: { isContinuation: boolean; rowSpan: number; blockEntries: TimetableEntry[]; isUnavailableSpan: boolean }
  ) => {
    // We are viewing a specific class schedule
    const entry = timetable.find(e => e.classId === selectedClassId && e.day === day && e.slotIndex === slotIndex);
    
    // Check if class itself is marked as unavailable during this slot
    const currentCls = classes.find(c => c.id === selectedClassId);
    const isClassUnavailable = currentCls?.unavailability.some(u => u.day === day && u.slotIndex === slotIndex);

    const isHovered = dragOverCell?.day === day && dragOverCell?.slotIndex === slotIndex;

    const rowSpan = spanInfo?.rowSpan || 1;
    const blockEntries = spanInfo?.blockEntries || (entry ? [entry] : []);

    if (entry) {
      const teacher = teachers.find(t => t.id === entry.teacherId);
      const subject = subjects.find(s => s.id === entry.subjectId);
      const cardColor = teacher?.color || '#6366f1';
      
      const startHour = (slotLabels[slotIndex] || '').split(' - ')[0];
      const endSlotIndex = slotIndex + rowSpan - 1;
      const endHour = slotLabels[endSlotIndex] ? slotLabels[endSlotIndex].split(' - ')[1] : (slotLabels[slotIndex] || '').split(' - ')[1];
      const formattedTimeText = rowSpan > 1 ? `${startHour} - ${endHour}` : startHour;

      const teacherInitial = teacher?.name ? teacher.name.trim().charAt(0).toUpperCase() : '?';

      return (
        <div
          id={`card-${entry.id}`}
          draggable="true"
          onDragStart={(e) => handleGridDragStart(e, entry.id)}
          className={`relative h-full w-full p-2.5 rounded-xl border flex flex-col justify-between cursor-grab active:cursor-grabbing shadow-sm transition-all select-none group ${
            theme === 'light'
              ? 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
              : 'border-white/10 hover:border-white/20 hover:shadow-md'
          }`}
          style={{ 
            backgroundColor: theme === 'light' ? `${cardColor}18` : `${cardColor}25`, 
            borderLeft: `4px solid ${cardColor}`
          }}
        >
          {/* Top Row: Subject Title + Trash Button */}
          <div>
            <div className="flex items-start justify-between gap-1 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className={`font-sans font-bold text-xs sm:text-sm leading-tight ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>
                  {subject?.name || entry.subjectId}
                </h4>
                {rowSpan > 1 && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                    {rowSpan}h
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (blockEntries.length > 1) {
                    handleDeleteBlockEntries(blockEntries);
                  } else {
                    handleDeleteEntry(entry.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-0.5 rounded cursor-pointer transition-opacity shrink-0"
                title={rowSpan > 1 ? `Retirer ce bloc de ${rowSpan}h` : "Retirer ce créneau"}
              >
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Subtitle: Teacher Name with dot */}
            <div className={`text-[11px] font-medium flex items-center gap-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-gray-300'
            }`}>
              <span className="w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: cardColor }} />
              <span className="truncate">{teacher?.name || entry.teacherId}</span>
            </div>
          </div>

          {/* Bottom Row: Time Pill & Avatar Circle */}
          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5 dark:border-white/5">
            <span className={`inline-flex items-center gap-1 text-[9.5px] font-mono px-2 py-0.5 rounded-full font-semibold ${
              theme === 'light' 
                ? 'bg-white/90 text-slate-700 border border-slate-200/80 shadow-2xs' 
                : 'bg-black/40 text-gray-300 border border-white/10'
            }`}>
              <Clock className="w-2.5 h-2.5 opacity-70" />
              {formattedTimeText}
            </span>

            {/* Teacher Initial Avatar Badge */}
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs shrink-0 ring-1 ring-white/20"
              style={{
                backgroundColor: cardColor,
                color: '#ffffff'
              }}
              title={teacher?.name}
            >
              {teacherInitial}
            </div>
          </div>
        </div>
      );
    }

    if (isClassUnavailable) {
      const startHour = (slotLabels[slotIndex] || '').split(' - ')[0];
      const endSlotIndex = slotIndex + rowSpan - 1;
      const endHour = slotLabels[endSlotIndex] ? slotLabels[endSlotIndex].split(' - ')[1] : (slotLabels[slotIndex] || '').split(' - ')[1];
      const formattedTimeText = rowSpan > 1 ? `Exclu (${startHour}-${endHour})` : "Exclu Classe";

      return (
        <div className="h-full w-full flex items-center justify-center bg-red-950/20 text-red-400 border border-red-900/10 rounded-md select-none p-2">
          <div className="text-center font-mono text-[10px] uppercase font-semibold tracking-wider">
            {formattedTimeText}
          </div>
        </div>
      );
    }

    // Empty cell, which is drop target
    return (
      <div
        onDragOver={(e) => handleDragOverCell(e, day, slotIndex)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDropOnCell(e, day, slotIndex)}
        className={`h-full w-full min-h-[56px] rounded-md border border-dashed border-white/10 flex items-center justify-center ${
          isHovered 
            ? dragValidation?.isValid 
              ? 'bg-emerald-950/40 border-emerald-500' 
              : 'bg-red-950/40 border-red-500'
            : 'bg-slate-950/20 hover:bg-white/5'
        }`}
      >
        {isHovered && draggedItem && (
          <div className="text-center p-1">
            {dragValidation?.isValid ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 justify-center">
                <Check className="w-3.5 h-3.5" /> Placer
              </span>
            ) : (
              <span className="text-[10px] text-red-400 font-medium block text-center font-mono">
                {dragValidation?.reason || "Conflit"}
              </span>
            )}
          </div>
        )}
        {!isHovered && (
          <span className="text-gray-500/70 font-mono text-[10px] italic">
            Classe libérée
          </span>
        )}
      </div>
    );
  };

  // Render teacher specific schedule cell
  const renderTeacherCellContent = (
    teacher: Teacher,
    day: string,
    slotIndex: number,
    spanInfo?: { isContinuation: boolean; rowSpan: number; blockEntries: TimetableEntry[]; isUnavailableSpan: boolean }
  ) => {
    const entry = timetable.find(e => e.teacherId === teacher.id && e.day === day && e.slotIndex === slotIndex);
    const isUn = teacher.unavailability?.some(u => u.day === day && u.slotIndex === slotIndex);
    const rowSpan = spanInfo?.rowSpan || 1;

    if (entry) {
      const cls = classes.find(c => c.id === entry.classId);
      const subj = subjects.find(s => s.id === entry.subjectId);
      const color = teacher.color || '#6366f1';
      
      const startHour = (slotLabels[slotIndex] || '').split(' - ')[0];
      const endSlotIndex = slotIndex + rowSpan - 1;
      const endHour = slotLabels[endSlotIndex] ? slotLabels[endSlotIndex].split(' - ')[1] : (slotLabels[slotIndex] || '').split(' - ')[1];
      const formattedTimeText = rowSpan > 1 ? `${startHour} - ${endHour}` : startHour;

      return (
        <div
          className={`h-full w-full p-2.5 rounded-xl border flex flex-col justify-between shadow-2xs select-none transition-all ${
            theme === 'light'
              ? 'border-slate-200/90 shadow-2xs'
              : 'border-white/10'
          }`}
          style={{
            backgroundColor: theme === 'light' ? `${color}18` : `${color}28`,
            borderLeft: `4px solid ${color}`
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <h4 className={`font-sans font-bold text-xs sm:text-sm leading-snug truncate ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                {subj?.name || entry.subjectId}
              </h4>
              {rowSpan > 1 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  {rowSpan}h
                </span>
              )}
            </div>
            <div className={`text-[11px] font-semibold flex items-center gap-1 ${
              theme === 'light' ? 'text-indigo-800' : 'text-indigo-300'
            }`}>
              <Users className="w-3 h-3 shrink-0" />
              <span className="truncate">{cls?.name || entry.classId}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-1 pt-1 border-t border-black/5 dark:border-white/5">
            <span className={`inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded font-medium ${
              theme === 'light'
                ? 'bg-white text-slate-700 border border-slate-200'
                : 'bg-black/40 text-gray-300 border border-white/10'
            }`}>
              <Clock className="w-2.5 h-2.5 opacity-70" />
              {formattedTimeText}
            </span>
          </div>
        </div>
      );
    }

    if (isUn) {
      const startHour = (slotLabels[slotIndex] || '').split(' - ')[0];
      const endSlotIndex = slotIndex + rowSpan - 1;
      const endHour = slotLabels[endSlotIndex] ? slotLabels[endSlotIndex].split(' - ')[1] : (slotLabels[slotIndex] || '').split(' - ')[1];
      const formattedTimeText = rowSpan > 1 ? `Indisponible (${startHour}-${endHour})` : "Indisponible";

      return (
        <div className="h-full w-full flex items-center justify-center bg-red-950/20 text-red-400 border border-red-900/30 rounded-lg select-none p-1">
          <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-center">
            {formattedTimeText}
          </span>
        </div>
      );
    }

    return (
      <div className="h-full w-full min-h-[50px] rounded-lg border border-dashed border-white/5 flex items-center justify-center bg-slate-950/10">
        <span className="text-gray-500/70 font-mono text-[9.5px] italic">Prof libre</span>
      </div>
    );
  };
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    // Check duplicate
    const normalized = newSubName.trim().toLowerCase();
    if (subjects.some(s => s.name.toLowerCase() === normalized)) {
      triggerNotification("Cette matière existe déjà.", "error");
      return;
    }

    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim()
    };

    const updated = [...subjects, newSub];
    setSubjects(updated);
    syncToLocalStorage(updated, teachers, classes, timetable, unscheduled, generationScore);
    setNewSubName('');
    triggerNotification(`Matière "${newSub.name}" ajoutée !`);
  };

  const handleDeleteSubject = (id: string, name: string) => {
    if (window.confirm(`Voulez-vous supprimer la matière "${name}" ? (Cela supprimera ses liens chez les profs/classes).`)) {
      const updatedSubs = subjects.filter(s => s.id !== id);
      const updatedTeachs = teachers.map(t => ({
        ...t,
        subjectIds: t.subjectIds.filter(sid => sid !== id)
      }));
      const updatedCls = classes.map(c => ({
        ...c,
        assignments: c.assignments.filter(a => a.subjectId !== id)
      }));
      // Remove corresponding timetable entries
      const updatedTable = timetable.filter(e => e.subjectId !== id);

      setSubjects(updatedSubs);
      setTeachers(updatedTeachs);
      setClasses(updatedCls);
      setTimetable(updatedTable);

      syncToLocalStorage(updatedSubs, updatedTeachs, updatedCls, updatedTable, unscheduled, generationScore);
      triggerNotification("Matière supprimée.", "info");
    }
  };

  // --- PROFESSEURS OPERATIONS ---
  const toggleTeacherFormUnavailability = (day: string, slotIndex: number) => {
    const exists = newTeacherUnavail.some(u => u.day === day && u.slotIndex === slotIndex);
    if (exists) {
      setNewTeacherUnavail(newTeacherUnavail.filter(u => !(u.day === day && u.slotIndex === slotIndex)));
    } else {
      setNewTeacherUnavail([...newTeacherUnavail, { day, slotIndex }]);
    }
  };

  const handleAddTeacherSubjectToggle = (subjId: string) => {
    if (newTeacherSubjects.includes(subjId)) {
      setNewTeacherSubjects(newTeacherSubjects.filter(id => id !== subjId));
    } else {
      setNewTeacherSubjects([...newTeacherSubjects, subjId]);
    }
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherName.trim()) {
      triggerNotification("Veuillez indiquer le nom de l'enseignant.", "error");
      return;
    }
    if (newTeacherSubjects.length === 0) {
      triggerNotification("Veuillez associer au moins une matière à cet enseignant.", "error");
      return;
    }

    if (editingTeacherId) {
      // Update existing
      const updated = teachers.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: newTeacherName.trim(),
            quota: newTeacherQuota,
            subjectIds: newTeacherSubjects,
            weeklyQuota: newTeacherQuota,
            color: newTeacherColor,
            unavailability: newTeacherUnavail
          };
        }
        return t;
      });
      setTeachers(updated);
      syncToLocalStorage(subjects, updated, classes, timetable, unscheduled, generationScore);
      triggerNotification("Fiche enseignant mise à jour !");
    } else {
      // Check plan limits
      if (teachers.length >= currentPlan.maxTeachers) {
        triggerNotification(`Limite d'enseignants atteinte pour votre offre (${currentPlan.maxTeachers} enseignants max). Veuillez passer à la formule supérieure.`, "error");
        setIsClientSubModalOpen(true);
        return;
      }
      // Create new
      const newTeach: Teacher = {
        id: `teach-${Date.now()}`,
        name: newTeacherName.trim(),
        subjectIds: newTeacherSubjects,
        weeklyQuota: newTeacherQuota,
        color: newTeacherColor,
        unavailability: newTeacherUnavail
      };
      const updated = [...teachers, newTeach];
      setTeachers(updated);
      syncToLocalStorage(subjects, updated, classes, timetable, unscheduled, generationScore);
      triggerNotification(`Enseignant "${newTeach.name}" enregistré !`);
    }

    // Reset Form fields
    setNewTeacherName('');
    setNewTeacherSubjects([]);
    setNewTeacherQuota(18);
    setNewTeacherColor('#3b82f6');
    setNewTeacherUnavail([]);
    setEditingTeacherId(null);
  };

  const handleEditTeacherClick = (t: Teacher) => {
    setEditingTeacherId(t.id);
    setNewTeacherName(t.name);
    setNewTeacherSubjects(t.subjectIds);
    setNewTeacherQuota(t.weeklyQuota);
    setNewTeacherColor(t.color);
    setNewTeacherUnavail(t.unavailability || []);
    // Auto scroll or jump focus
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Confirmer la suppression de ${name} ?`)) {
      const updatedTeachs = teachers.filter(t => t.id !== id);
      const updatedCls = classes.map(c => ({
        ...c,
        assignments: c.assignments.filter(a => a.teacherId !== id)
      }));
      const updatedTable = timetable.filter(e => e.teacherId !== id);

      setTeachers(updatedTeachs);
      setClasses(updatedCls);
      setTimetable(updatedTable);

      syncToLocalStorage(subjects, updatedTeachs, updatedCls, updatedTable, unscheduled, generationScore);
      triggerNotification("Fiche enseignant supprimée.", "info");
    }
  };

  // --- CLASSES OPERATIONS ---
  const toggleClassFormUnavailability = (day: string, slotIndex: number) => {
    const exists = newClassUnavail.some(u => u.day === day && u.slotIndex === slotIndex);
    if (exists) {
      setNewClassUnavail(newClassUnavail.filter(u => !(u.day === day && u.slotIndex === slotIndex)));
    } else {
      setNewClassUnavail([...newClassUnavail, { day, slotIndex }]);
    }
  };

  const handleAddAssignmentToClassForm = () => {
    if (!tempTeacherId || !tempSubjectId) {
      triggerNotification("Sélectionnez l'enseignant et la matière correspondante.", "error");
      return;
    }
    
    // Check if assignments combinations already exists in temporary assignments list
    const exists = classAssignments.some(as => as.teacherId === tempTeacherId && as.subjectId === tempSubjectId);
    if (exists) {
      triggerNotification("Cette association enseignant-matière existe déjà pour cette classe. Modifiez-la si besoin.", "error");
      return;
    }

    setClassAssignments([...classAssignments, {
      teacherId: tempTeacherId,
      subjectId: tempSubjectId,
      hoursPerWeek: tempHours
    }]);

    setTempTeacherId('');
    setTempSubjectId('');
    setTempHours(2);
    triggerNotification("Liaison cours ajoutée au formulaire.");
  };

  const handleRemoveAssignmentFromClassForm = (teachId: string, subjId: string) => {
    setClassAssignments(classAssignments.filter(a => !(a.teacherId === teachId && a.subjectId === subjId)));
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      triggerNotification("Renseignez le nom / libellé de la classe.", "error");
      return;
    }

    if (editingClassId) {
      // Update
      const updated = classes.map(c => {
        if (c.id === editingClassId) {
          return {
            ...c,
            name: newClassName.trim(),
            assignments: classAssignments,
            unavailability: newClassUnavail
          };
        }
        return c;
      });
      setClasses(updated);
      syncToLocalStorage(subjects, teachers, updated, timetable, unscheduled, generationScore);
      triggerNotification("Fiche classe mise à jour !");
    } else {
      // Check plan limits
      if (classes.length >= currentPlan.maxClasses) {
        triggerNotification(`Limite de classes atteinte pour votre offre (${currentPlan.maxClasses} classes max). Veuillez passer à la formule supérieure.`, "error");
        setIsClientSubModalOpen(true);
        return;
      }
      // Create new
      const newClass: ClassGroup = {
        id: `class-${Date.now()}`,
        name: newClassName.trim(),
        assignments: classAssignments,
        unavailability: newClassUnavail
      };
      const updated = [...classes, newClass];
      setClasses(updated);
      syncToLocalStorage(subjects, teachers, updated, timetable, unscheduled, generationScore);
      triggerNotification(`Classe "${newClass.name}" créée !`);
    }

    // Reset Class Form fields
    setNewClassName('');
    setClassAssignments([]);
    setNewClassUnavail([]);
    setEditingClassId(null);
  };

  const handleEditClassClick = (c: ClassGroup) => {
    setEditingClassId(c.id);
    setNewClassName(c.name);
    setClassAssignments(c.assignments);
    setNewClassUnavail(c.unavailability || []);
    // Focus jump
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleDeleteClass = (id: string, name: string) => {
    if (window.confirm(`Supprimer la classe ${name} ?`)) {
      const updated = classes.filter(c => c.id !== id);
      const updatedTable = timetable.filter(e => e.classId !== id);

      setClasses(updated);
      setTimetable(updatedTable);

      syncToLocalStorage(subjects, teachers, updated, updatedTable, unscheduled, generationScore);
      triggerNotification("Fiche classe supprimée.", "info");
    }
  };




  // --- COMPUTE STATISTICS FOR SYNTHESIS TAB ---
  const statistics = useMemo(() => {
    const teachStats = teachers.map(t => {
      const assigned = timetable.filter(entry => entry.teacherId === t.id).length;
      return {
        ...t,
        assigned,
        ratio: t.weeklyQuota > 0 ? (assigned / t.weeklyQuota) * 100 : 0
      };
    });

    const classStats = classes.map(c => {
      const targetHours = c.assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
      const assigned = timetable.filter(entry => entry.classId === c.id).length;
      return {
        ...c,
        targetHours,
        assigned,
        ratio: targetHours > 0 ? (assigned / targetHours) * 100 : 0
      };
    });

    return { teachStats, classStats };
  }, [teachers, classes, timetable]);

  const dashboardMetrics = useMemo(() => {
    const totalPlannedHours = timetable.length;
    const totalTargetHours = statistics.classStats.reduce((acc, curr) => acc + curr.targetHours, 0);
    const globalCompletionRatio = totalTargetHours > 0 ? Math.round((totalPlannedHours / totalTargetHours) * 100) : 0;

    const conformingTeachersCount = statistics.teachStats.filter(t => t.assigned === t.weeklyQuota).length;
    const underloadedTeachersCount = statistics.teachStats.filter(t => t.assigned < t.weeklyQuota).length;
    const overloadedTeachersCount = statistics.teachStats.filter(t => t.assigned > t.weeklyQuota).length;

    const counts: { [subjectId: string]: number } = {};
    timetable.forEach(entry => {
      counts[entry.subjectId] = (counts[entry.subjectId] || 0) + 1;
    });
    const subjectHoursData = Object.entries(counts).map(([subId, hours]) => {
      const subName = subjects.find(s => s.id === subId)?.name || subId;
      return {
        name: subName,
        value: hours
      };
    }).sort((a, b) => b.value - a.value);

    const topSubject = subjectHoursData[0] || { name: "Aucune", value: 0 };

    const classChartData = statistics.classStats.map(c => ({
      name: c.name,
      "Cible": c.targetHours,
      "Planifié": c.assigned,
      "Complétude": Math.round(c.ratio)
    }));

    const teacherChartData = statistics.teachStats.map(t => ({
      name: t.name,
      "Quota": t.weeklyQuota,
      "Planifié": t.assigned,
    }));

    return {
      totalPlannedHours,
      totalTargetHours,
      globalCompletionRatio,
      conformingTeachersCount,
      underloadedTeachersCount,
      overloadedTeachersCount,
      subjectHoursData,
      topSubject,
      classChartData,
      teacherChartData
    };
  }, [statistics, timetable, subjects]);

  // Export handlers
  const handleExcelExport = () => {
    if (!currentPlan.features.excelExport) {
      triggerNotification("L'export Excel n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (timetable.length === 0) {
      triggerNotification("Rien à exporter. Générez d'abord un emploi du temps.", "error");
      return;
    }
    exportTimetableToExcel(timetable, classes, teachers, subjects);
    setExportCount(prev => prev + 1);
    triggerNotification("Fichier Excel complet d'établissement généré !");
  };

  const handlePdfExport = () => {
    if (!currentPlan.features.pdfExport) {
      triggerNotification("L'export PDF n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    const targetId = selectedClassId || (classes.length > 0 ? classes[0].id : '');
    if (!targetId) {
      triggerNotification("Aucune classe disponible à exporter en PDF.", "error");
      return;
    }
    const filteredEntries = timetable.filter(e => e.classId === targetId);
    if (filteredEntries.length === 0) {
      triggerNotification("Aucun créneau planifié pour cette classe.", "error");
      return;
    }
    exportTimetableToPdf(targetId, timetable, classes, teachers, subjects, schoolName, schoolSlogan);
    setExportCount(prev => prev + 1);
    triggerNotification(`Emploi du temps PDF exporté !`);
  };

  const handleWordExport = () => {
    if (!currentPlan.features.wordExport) {
      triggerNotification("L'export Word n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    const targetId = selectedClassId || (classes.length > 0 ? classes[0].id : '');
    if (!targetId) {
      triggerNotification("Aucune classe disponible à exporter en Word.", "error");
      return;
    }
    const filteredEntries = timetable.filter(e => e.classId === targetId);
    if (filteredEntries.length === 0) {
      triggerNotification("Aucun créneau planifié pour cette classe.", "error");
      return;
    }
    exportTimetableToWord(targetId, timetable, classes, teachers, subjects, schoolName, schoolSlogan, schoolLogo, schoolLogoIcon);
    setExportCount(prev => prev + 1);
    triggerNotification(`Emploi du temps Word (.doc) exporté !`);
  };

  const handleTeacherPdfExport = (targetTeacherId?: string) => {
    if (!currentPlan.features.pdfExport) {
      triggerNotification("L'export PDF n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    const tId = targetTeacherId || selectedTeacherId;
    if (!tId || tId === 'all') {
      if (teachers.length === 0) {
        triggerNotification("Aucun enseignant à exporter.", "error");
        return;
      }
      exportAllTeachersTimetableToPdf(timetable, classes, teachers, subjects, schoolName, schoolSlogan);
      setExportCount(prev => prev + 1);
      triggerNotification(`PDF généré pour les ${teachers.length} enseignants de l'établissement !`);
    } else {
      exportTeacherTimetableToPdf(tId, timetable, classes, teachers, subjects, schoolName, schoolSlogan);
      setExportCount(prev => prev + 1);
      const tName = teachers.find(t => t.id === tId)?.name || 'Enseignant';
      triggerNotification(`Emploi du temps PDF pour ${tName} généré !`);
    }
  };

  const handleTeacherExcelExport = (targetTeacherId?: string) => {
    if (!currentPlan.features.excelExport) {
      triggerNotification("L'export Excel n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    const tId = targetTeacherId || selectedTeacherId;
    if (!tId) return;
    if (tId === 'all') {
      if (teachers.length === 0) {
        triggerNotification("Aucun enseignant à exporter.", "error");
        return;
      }
      exportTeacherTimetableToExcel('all', timetable, classes, teachers, subjects);
      setExportCount(prev => prev + 1);
      triggerNotification(`Excel généré pour tous les enseignants !`);
    } else {
      const activeEntries = timetable.filter(e => e.teacherId === tId);
      if (activeEntries.length === 0) {
        triggerNotification("Aucun créneau planifié pour cet enseignant.", "error");
        return;
      }
      exportTeacherTimetableToExcel(tId, timetable, classes, teachers, subjects);
      setExportCount(prev => prev + 1);
      const tName = teachers.find(t => t.id === tId)?.name || 'Enseignant';
      triggerNotification(`Excel pour ${tName} généré !`);
    }
  };

  const handleTeacherWordExport = (targetTeacherId?: string) => {
    if (!currentPlan.features.wordExport) {
      triggerNotification("L'export Word n'est pas inclus dans votre formule actuelle. Veuillez passer à la formule supérieure.", "error");
      setIsClientSubModalOpen(true);
      return;
    }
    if (exportCount >= maxExports) {
      triggerNotification(`Limite d'exportations atteinte (${exportCount}/${maxExports}). Veuillez passer à une formule supérieure pour continuer à exporter.`, "error");
      setIsClientSubModalOpen(true);
      return;
    }
    const tId = targetTeacherId || selectedTeacherId;
    if (!tId) return;
    if (tId === 'all') {
      if (teachers.length === 0) {
        triggerNotification("Aucun enseignant à exporter.", "error");
        return;
      }
      exportTeacherTimetableToWord('all', timetable, classes, teachers, subjects, schoolName, schoolSlogan, schoolLogo, schoolLogoIcon);
      setExportCount(prev => prev + 1);
      triggerNotification(`Word généré pour tous les enseignants !`);
    } else {
      const activeEntries = timetable.filter(e => e.teacherId === tId);
      if (activeEntries.length === 0) {
        triggerNotification("Aucun créneau planifié pour cet enseignant.", "error");
        return;
      }
      exportTeacherTimetableToWord(tId, timetable, classes, teachers, subjects, schoolName, schoolSlogan, schoolLogo, schoolLogoIcon);
      setExportCount(prev => prev + 1);
      const tName = teachers.find(t => t.id === tId)?.name || 'Enseignant';
      triggerNotification(`Word pour ${tName} généré !`);
    }
  };

  const renderLogoIcon = () => {
    if (schoolLogoType === 'url' && schoolLogo) {
      return (
        <img 
          src={schoolLogo} 
          alt="Logo" 
          className="w-8 h-8 object-cover rounded-lg" 
          referrerPolicy="no-referrer"
        />
      );
    }
    
    const iconClass = "w-5 h-5 text-white";
    switch (schoolLogoIcon) {
      case 'Building2':
        return <Building2 className={iconClass} />;
      case 'Award':
        return <Award className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      default:
        return <GraduationCap className={iconClass} />;
    }
  };

  if (currentViewMode === 'landing') {
    return (
      <div className="dark">
        <LandingPage
          onOpenLogin={handleOpenAuthModal}
          onDirectDemoClient={() => handleLoginClient('client@ecole.com')}
          onDirectDemoAdmin={() => handleLoginAdmin('admin@izischool.com')}
          onPurchaseLicenseRequest={handlePurchaseLicenseRequest}
          plans={saasPlans}
          theme={theme}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginClient={handleLoginClient}
          onLoginAdmin={handleLoginAdmin}
          theme={theme}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 relative">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-pink-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative">
        
        {/* --- TOAST NOTIFICATIONS --- */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border bg-slate-900 border-white/10"
              style={{
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div className={`p-1.5 rounded-lg ${
                notification.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
              </div>
              <p className="text-sm font-medium text-white max-w-sm leading-snug">
                {notification.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- GLOBAL SAAS ANNOUNCEMENT BANNER --- */}
        {saasPortalMode === 'admin' && saasSettings.globalAnnouncement && saasSettings.announcementType !== 'none' && (
          <div className={`mb-6 p-3 rounded-2xl border text-xs flex items-center justify-between gap-4 shadow-lg ${
            saasSettings.announcementType === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : saasSettings.announcementType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 animate-pulse shrink-0" />
              <span className="font-medium">{saasSettings.globalAnnouncement}</span>
            </div>
            <button
              onClick={() => setIsClientSubModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] shrink-0 cursor-pointer"
            >
              En savoir plus
            </button>
          </div>
        )}

        {/* --- PORTAL MODE SWITCHER & HEADER BAR --- */}
        {saasPortalMode === 'admin' && (
          <div className="flex items-center justify-between gap-4 p-2.5 mb-6 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSaasPortalMode('client')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
              >
                <GraduationCap className="w-4 h-4 text-indigo-300" />
                Espace Établissement (Client)
              </button>

              <button
                onClick={handleRequestAdminAccess}
                className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/30 border border-purple-400/30"
                title="Accès réservé aux administrateurs de la plateforme SaaS (PIN Requis)"
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span>Espace Administration SaaS</span>
              </button>
            </div>

            {/* CLIENT VIEW SUBSCRIPTION STATUS BADGE & HOME RETURN BUTTON */}
            <div className="flex items-center gap-3">
              {currentUserEmail && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-mono text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {currentUserEmail}
                </span>
              )}

              <button
                onClick={handleGoToLanding}
                className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                title="Retourner sur la page d'accueil landing page"
              >
                <span>🌐 Landing Page</span>
              </button>
            </div>
          </div>
        )}

        {/* --- PENDING KEY ACTIVATION ALERT BANNER --- */}
        {saasPortalMode === 'client' && currentClient.status === 'pending_key' && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-orange-500/10 text-amber-200 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 shadow-sm">
                <Key className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>Clé d'activation requise</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                    Forfait Gratuit Restreint
                  </span>
                </h4>
                <p className="text-xs text-gray-300 mt-0.5">
                  Votre achat est enregistré mais l'offre payante reste verrouillée tant que vous n'avez pas renseigné votre clé de licence.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsClientSubModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 active:scale-95"
            >
              <Key className="w-4 h-4" />
              <span>Saisir ma clé d'activation</span>
            </button>
          </div>
        )}

        {/* --- HEADER BAR (CLIENT WORKSPACE HEADER MATCHING ADMIN DESIGN) --- */}
        <header className="flex flex-col xl:flex-row xl:items-center xl:justify-between mb-8 p-4 sm:p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl gap-4">
          {/* Left: School identity with 2-line title */}
          <div className="flex items-center gap-3.5 w-full xl:w-auto xl:max-w-xs shrink-0">
            <span className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 shadow-md text-indigo-300 flex items-center justify-center shrink-0">
              {renderLogoIcon()}
            </span>
            <div className="min-w-0 max-w-[200px] sm:max-w-[230px] md:max-w-[260px]">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-sans leading-tight break-words">
                {schoolName}
              </h1>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-tight truncate" title={schoolSlogan}>
                {schoolSlogan || "Concepteur intelligent d'emploi du temps pour chef d'établissement"}
              </p>
            </div>
          </div>

          {/* Right Section: Two Dedicated Lines */}
          <div className="flex flex-col items-start xl:items-end gap-2.5 w-full xl:w-auto overflow-x-auto no-scrollbar">
            {/* LIGNE 1 : Indications de consommation et de remplissage (strictement sur une seule ligne) */}
            <div className="flex flex-nowrap items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
              {/* Offre */}
              <div 
                onClick={() => setIsClientSubModalOpen(true)}
                className="bg-indigo-950/40 border border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-900/30 transition-all cursor-pointer rounded-xl px-2.5 py-1 font-mono text-[11px] flex items-center gap-1.5 shadow-sm shrink-0" 
                title="Cliquez pour gérer votre abonnement"
              >
                <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse shrink-0" />
                <span className="text-indigo-300">Offre :</span> <span className="text-white font-bold uppercase">{currentPlan.name}</span>
              </div>

              {/* Générations */}
              <div className="bg-slate-950/70 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-[11px] flex items-center gap-1.5 shadow-sm shrink-0" title="Nombre de générations d'emplois du temps effectuées">
                <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                <span className="text-gray-400">Générations :</span> <span className="text-white font-bold">{generationCount} / {maxGenerations >= 9999 ? 'Illimité' : maxGenerations}</span>
              </div>

              {/* Indication des exports faits et restants */}
              <div className="bg-slate-950/70 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-[11px] flex items-center gap-1.5 shadow-sm shrink-0" title="Nombre d'exports de documents réalisés">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-gray-400">Export PDF-Word-Excel :</span> <span className="text-white font-bold">{exportCount} / {maxExports >= 9999 ? 'Illimité' : maxExports}</span>
              </div>

              {/* Taux de Remplissage */}
              <div className="bg-slate-950/70 border border-white/10 rounded-xl px-2.5 py-1 font-mono text-[11px] flex items-center gap-1.5 shadow-sm shrink-0" title="Taux de remplissage et conformité globale">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-gray-400">Taux Remplissage :</span> <span className="text-emerald-400 font-black">{generationScore}%</span>
              </div>
            </div>

            {/* LIGNE 2 : Éléments fonctionnels (Mode Sombre, Reset, Wipe, Déconnexion) décalés à droite */}
            <div className="flex items-center justify-start xl:justify-end gap-2 w-full shrink-0">
              {/* Bascule Mode Clair / Mode Sombre */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-sm hover:-translate-y-0.5"
                title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode Clair</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Mode Sombre</span>
                  </>
                )}
              </button>

              <div className="h-4 w-px bg-white/10 mx-0.5" />

              {/* Documentation Hub */}
              <button
                onClick={() => setIsDocViewOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/20 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-sm hover:-translate-y-0.5"
                title="Consulter la documentation officielle"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Documentation</span>
              </button>

              <div className="h-4 w-px bg-white/10 mx-0.5" />

              {/* Réinitialisation Démo */}
              <button
                onClick={handleResetToDefaults}
                className="p-1 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title="Données démo d'origine"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Effacer tout */}
              <button
                onClick={handleWipeAll}
                className="p-1 rounded-xl bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors cursor-pointer"
                title="Réinitialiser à blanc"
              >
                <Trash className="w-3.5 h-3.5" />
              </button>

              {/* Déconnexion */}
              {saasPortalMode === 'client' && (
                <>
                  <div className="h-4 w-px bg-white/10 mx-0.5" />
                  <button
                    onClick={handleGoToLanding}
                    className="px-2.5 py-1 rounded-xl bg-red-950/25 hover:bg-red-900/35 text-red-400 hover:text-red-300 border border-red-500/20 transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shadow-sm hover:-translate-y-0.5"
                    title="Se déconnecter et retourner à l'accueil"
                  >
                    <LogOut className="w-3.5 h-3.5 animate-pulse" />
                    <span>Déconnexion</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </header>


        {/* --- MAIN CONTENT CONDITIONAL: SAAS ADMIN PORTAL vs CLIENT WORKSPACE --- */}
        {saasPortalMode === 'admin' ? (
          <SaaSAdminPortal
            plans={saasPlans}
            clients={saasClients}
            licenseKeys={saasLicenseKeys}
            transactions={saasTransactions}
            settings={saasSettings}
            activationRequests={saasActivationRequests}
            onUpdateClients={setSaasClients}
            onUpdatePlans={setSaasPlans}
            onUpdateLicenseKeys={setSaasLicenseKeys}
            onUpdateTransactions={setSaasTransactions}
            onUpdateSettings={setSaasSettings}
            onUpdateActivationRequests={handleUpdateActivationRequests}
            onValidateAndDeliverRequest={handleValidateAndDeliverRequest}
            onSwitchToClientView={handleSwitchToClientView}
            theme={theme}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* WORKFLOW STEP PROGRESS BAR (5 STEPS) */}
            <div className="p-4 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl overflow-x-auto select-none">
              <div className="flex items-center justify-between min-w-[900px] gap-2.5">
                {/* Step 1: Jours & Horaires */}
                <button
                  onClick={() => setActiveTab('scheduleConfig')}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                    activeTab === 'scheduleConfig'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
                      : activeDays.length > 0
                      ? 'bg-slate-950/40 border-emerald-500/30 text-gray-300 hover:bg-white/5 hover:border-white/20'
                      : 'bg-slate-950/30 border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {activeTab === 'scheduleConfig' && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-slate-900 shadow-sm"></span>
                    </span>
                  )}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    activeTab === 'scheduleConfig'
                      ? 'bg-indigo-600 text-white border border-indigo-300 shadow-md shadow-indigo-500/30 animate-pulse'
                      : activeDays.length > 0 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {activeDays.length > 0 && activeTab !== 'scheduleConfig' ? '✓' : '1'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>1. Jours & Horaires</span>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded">({activeDays.length}j)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{startHour}h-{endHour}h ({totalSlots}h/j)</p>
                  </div>
                </button>

                <div className="w-2.5 h-0.5 bg-white/10 shrink-0" />

                {/* Step 2: Matières */}
                <button
                  onClick={() => setActiveTab('subjects')}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                    activeTab === 'subjects'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
                      : subjects.length > 0
                      ? 'bg-slate-950/40 border-emerald-500/30 text-gray-300 hover:bg-white/5 hover:border-white/20'
                      : 'bg-slate-950/30 border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {activeTab === 'subjects' && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-slate-900 shadow-sm"></span>
                    </span>
                  )}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    activeTab === 'subjects'
                      ? 'bg-indigo-600 text-white border border-indigo-300 shadow-md shadow-indigo-500/30 animate-pulse'
                      : subjects.length > 0 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {subjects.length > 0 && activeTab !== 'subjects' ? '✓' : '2'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>2. Matières</span>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded">({subjects.length})</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Référentiel des cours</p>
                  </div>
                </button>

                <div className="w-2.5 h-0.5 bg-white/10 shrink-0" />

                {/* Step 3: Professeurs */}
                <button
                  onClick={() => setActiveTab('teachers')}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                    activeTab === 'teachers'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
                      : teachers.length > 0
                      ? 'bg-slate-950/40 border-emerald-500/30 text-gray-300 hover:bg-white/5 hover:border-white/20'
                      : 'bg-slate-950/30 border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {activeTab === 'teachers' && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-slate-900 shadow-sm"></span>
                    </span>
                  )}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    activeTab === 'teachers'
                      ? 'bg-indigo-600 text-white border border-indigo-300 shadow-md shadow-indigo-500/30 animate-pulse'
                      : teachers.length > 0 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {teachers.length > 0 && activeTab !== 'teachers' ? '✓' : '3'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>3. Professeurs</span>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded">({teachers.length})</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Quotas & disponibilités</p>
                  </div>
                </button>

                <div className="w-2.5 h-0.5 bg-white/10 shrink-0" />

                {/* Step 4: Classes & Affectations */}
                <button
                  onClick={() => setActiveTab('classes')}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                    activeTab === 'classes'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
                      : classes.length > 0
                      ? 'bg-slate-950/40 border-emerald-500/30 text-gray-300 hover:bg-white/5 hover:border-white/20'
                      : 'bg-slate-950/30 border-white/5 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {activeTab === 'classes' && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-slate-900 shadow-sm"></span>
                    </span>
                  )}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                    activeTab === 'classes'
                      ? 'bg-indigo-600 text-white border border-indigo-300 shadow-md shadow-indigo-500/30 animate-pulse'
                      : classes.length > 0 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {classes.length > 0 && activeTab !== 'classes' ? '✓' : '4'}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>4. Classes</span>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded">({classes.length})</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Affectation des matières</p>
                  </div>
                </button>

                <div className="w-2.5 h-0.5 bg-white/10 shrink-0" />

                {/* Step 5: Emploi du Temps */}
                <button
                  onClick={() => setActiveTab('timetable')}
                  className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 relative ${
                    activeTab === 'timetable'
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-slate-900 scale-[1.02]'
                      : 'bg-slate-950/30 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  {activeTab === 'timetable' && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-slate-900 shadow-sm"></span>
                    </span>
                  )}
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-md shadow-indigo-500/20 ${
                    activeTab === 'timetable'
                      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-1 ring-white/50 animate-pulse'
                      : 'bg-gradient-to-br from-indigo-500/60 to-indigo-600/60 text-white'
                  }`}>
                    5
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                      <span>5. Emploi du Temps</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">{generationScore}%</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">Génération & Grille</p>
                  </div>
                </button>
              </div>
            </div>


            <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start">
            <nav className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1.5 p-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto select-none shadow-xl">
              {/* 1. Jours & Horaires */}
              <button
                onClick={() => setActiveTab('scheduleConfig')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'scheduleConfig'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">1. Jours & Horaires</span>
              </button>

              {/* 2. Matières */}
              <button
                onClick={() => setActiveTab('subjects')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'subjects'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">2. Matières ({subjects.length})</span>
              </button>

              {/* 3. Enseignants */}
              <button
                onClick={() => setActiveTab('teachers')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'teachers'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">3. Enseignants ({teachers.length})</span>
              </button>

              {/* 4. Classes */}
              <button
                onClick={() => setActiveTab('classes')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'classes'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">4. Classes ({classes.length})</span>
              </button>

              {/* 5. Emploi du Temps */}
              <button
                onClick={() => setActiveTab('timetable')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'timetable'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Grid className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">5. Emploi du Temps</span>
              </button>

              <div className="h-px bg-white/10 my-1 hidden lg:block" />

              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'stats'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <BarChart className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline lg:inline">Synthèse Chef</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
                    : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-500/10 border border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Conseils IA Gemini</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Paramètres</span>
              </button>
            </nav>

          {/* --- WORKSPACE VIEWPORT (Tab Contents) --- */}
          <main className="flex-1 min-w-0" id="main-content-viewport">
            
            {/* STEP 1: CONFIGURATION DES JOURS ET HORAIRES */}
            {activeTab === 'scheduleConfig' && (
              <div className="space-y-6">
                {/* HEADER BANNER WITH STEP-BY-STEP BEGINNER GUIDE */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Étape 1 : Configuration des Jours & Plages Horaires</span>
                          <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            Fondation de l'Établissement
                          </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Définissez les jours ouvrés et l'amplitude horaire de votre école. Toutes les grilles s'adapteront à ces paramètres.
                        </p>
                      </div>
                    </div>
                    
                    {/* QUICK PRESETS */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDays(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"]);
                          triggerNotification("Semaine configurée : Lundi au Vendredi (5 jours)", "info");
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          activeDays.length === 5 && !activeDays.includes("Samedi")
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Lundi - Vendredi (5j)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDays(["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]);
                          triggerNotification("Semaine configurée : Lundi au Samedi (6 jours)", "info");
                        }}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          activeDays.length === 6
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-950/40 border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Lundi - Samedi (6j)
                      </button>
                    </div>
                  </div>

                  {/* GUIDE DÉBUTANT PAS-À-PAS */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guide Débutant : Ce que vous devez faire sur cette étape</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                          <span>Choisir les jours ouverts</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cochez les jours où l'école dispense des cours (ex: du Lundi au Samedi ou 5 jours).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                          <span>Régler la plage horaire</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Sélectionnez l'heure du premier cours (ex: 8h) et l'heure de sortie (ex: 18h).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                          <span>Passer à l'étape 2 (Matières)</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Vérifiez la capacité hebdomadaire générée, puis cliquez sur le bouton pour continuer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONFIGURATION CARDS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* 1. SELECTION DES JOURS OUVRÉS (7 COLS) */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                            1. Jours de Cours Actifs
                          </h3>
                        </div>
                        <span className="text-xs font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                          {activeDays.length} jours configurés
                        </span>
                      </div>

                      <p className="text-xs text-gray-400">
                        Cochez ou décochez les jours durant lesquels votre établissement dispense des cours.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {ALL_DAYS.map((day) => {
                          const isSelected = activeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (activeDays.length <= 1) {
                                    triggerNotification("Vous devez conserver au moins un jour actif.", "error");
                                    return;
                                  }
                                  setActiveDays(activeDays.filter(d => d !== day));
                                } else {
                                  const newDays = ALL_DAYS.filter(d => activeDays.includes(d) || d === day);
                                  setActiveDays(newDays);
                                }
                              }}
                              className={`p-4 rounded-xl border flex flex-col items-start justify-between gap-3 transition-all cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-gradient-to-br from-indigo-900/40 to-indigo-950/60 border-indigo-500/80 text-white ring-1 ring-indigo-500/40 shadow-md shadow-indigo-950/50'
                                  : 'bg-slate-950/40 border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-bold text-sm">{day}</span>
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                                  isSelected ? 'bg-indigo-500 text-white' : 'border border-white/10 bg-slate-900'
                                }`}>
                                  {isSelected && <Check className="w-3.5 h-3.5" />}
                                </span>
                              </div>
                              <span className={`text-[11px] font-mono ${isSelected ? 'text-indigo-300' : 'text-gray-600'}`}>
                                {isSelected ? `${totalSlots}h / jour` : 'Fermé'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. PLAGE HORAIRE DE LA JOURNÉE (8h à 22h) */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                            2. Amplitude Horaire Quotidienne (8h à 22h)
                          </h3>
                        </div>
                        <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {startHour}h00 → {endHour}h00 ({totalSlots} créneaux d'1h)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">
                            Heure de début des cours (Matin)
                          </label>
                          <select
                            value={startHour}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val >= endHour) {
                                triggerNotification("L'heure de début doit être inférieure à l'heure de fin.", "error");
                                return;
                              }
                              setStartHour(val);
                            }}
                            className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner font-mono cursor-pointer"
                          >
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                              <option key={h} value={h} disabled={h >= endHour}>
                                {String(h).padStart(2, '0')}h00 {h <= 11 ? '(Matin)' : h <= 13 ? '(Midi)' : '(Après-midi)'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-2">
                            Heure de fin des cours (Soir)
                          </label>
                          <select
                            value={endHour}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val <= startHour) {
                                triggerNotification("L'heure de fin doit être supérieure à l'heure de début.", "error");
                                return;
                              }
                              setEndHour(val);
                            }}
                            className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner font-mono cursor-pointer"
                          >
                            {[9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map((h) => (
                              <option key={h} value={h} disabled={h <= startHour}>
                                {String(h).padStart(2, '0')}h00 {h <= 12 ? '(Matin)' : h <= 17 ? '(Après-midi)' : '(Soirée)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* VISUAL PILL OF GENERATED SLOTS */}
                      <div className="pt-2">
                        <label className="block text-xs font-medium text-gray-400 mb-2">
                          Créneaux horaires d'1 heure générés :
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-slate-950/60 rounded-xl border border-white/5">
                          {slotLabels.map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                            >
                              Créneau {idx + 1} : {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. SYNTHÈSE DE CAPACITÉ & PASSAGE ÉTAPE 2 (5 COLS) */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40 backdrop-blur-xl border border-indigo-500/20 shadow-xl space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <Sparkles className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                          Capacité Hebdomadaire
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Jours de cours :</span>
                            <span className="font-bold text-white font-mono">{activeDays.length} jours / semaine</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Amplitude quotidienne :</span>
                            <span className="font-bold text-indigo-400 font-mono">{startHour}h00 → {endHour}h00 ({totalSlots}h)</span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2.5">
                            <span className="text-gray-300 font-medium">Capacité totale par classe :</span>
                            <span className="font-black text-emerald-400 font-mono text-sm">{activeDays.length * totalSlots} créneaux/sem</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 leading-relaxed">
                          💡 <strong>Prise en compte globale :</strong> Toutes les grilles, filtres d'indisponibilité et le moteur d'optimisation mathématique s'ajustent instantanément à cette amplitude horaire.
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              triggerNotification("Configuration des jours et horaires validée ! Passage à l'Étape 2 (Matières).", "success");
                              setActiveTab('subjects');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group border border-indigo-400/30"
                          >
                            <span>👉 Passer à l'Étape 2 : Référentiel des Matières</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform animate-pulse" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EMPLOI DU TEMPS GRID WITH DND */}
            {activeTab === 'timetable' && (
              <div className="space-y-6">
                
                {/* HEADER BANNER WITH STEP-BY-STEP BEGINNER GUIDE */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <Grid className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Étape 5 : Emploi du Temps & Résolution Automatique</span>
                          <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            Génération & Exports
                          </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Générez automatiquement un emploi du temps 100% optimisé et sans aucun conflit, ajustez au besoin par glisser-déposer, et téléchargez vos documents officiels.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GUIDE DÉBUTANT PAS-À-PAS */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guide Débutant : Ce que vous devez faire sur cette étape</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                          <span>Générer le planning</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur le bouton violet "Générer l'Emploi du Temps" ci-dessous pour calculer l'emploi du temps optimal sans chevauchement.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                          <span>Ajuster par Glisser-Déposer</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Glissez un cours vers un autre créneau à la souris : le système anti-conflit valide instantanément en vert ou vous bloque en rouge.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                          <span>Exporter les documents</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur les boutons d'export PDF, Word (.doc) ou Excel (.xlsx) pour imprimer vos emplois du temps prêts pour la rentrée.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIEW MODE TOGGLE BAR */}
                <div className="p-2.5 rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 p-1 bg-slate-950/70 rounded-xl border border-white/5 w-full sm:w-auto">
                    <button
                      onClick={() => setTimetableViewMode('class')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        timetableViewMode === 'class'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Vue par Classe</span>
                    </button>

                    <button
                      onClick={() => setTimetableViewMode('teacher')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        timetableViewMode === 'teacher'
                          ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Emplois du Temps Professeurs ({teachers.length})</span>
                    </button>
                  </div>

                  <div className="text-xs font-medium text-gray-300 flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>
                      {timetableViewMode === 'class'
                        ? `${classes.length} classes configurées`
                        : `${teachers.length} plannings enseignants disponibles`
                      }
                    </span>
                  </div>
                </div>

                {/* --- CLASS VIEW MODE --- */}
                {timetableViewMode === 'class' && (
                  <>
                    {/* TIMETABLE METADATA CONTROLS */}
                    <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                          SÉLECTION DE LA CLASSE VISUELLE
                        </label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="bg-slate-950/85 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-medium cursor-pointer shadow-inner"
                        >
                          {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-row md:flex-nowrap md:items-center gap-2 mt-4 lg:mt-0 w-full md:w-auto">
                        <button
                          onClick={handleAutoGenerate}
                          disabled={isGenerating || classes.length === 0}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 cursor-pointer w-full md:w-auto"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                              <span className="whitespace-nowrap">Moteur...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 shrink-0" />
                              <span className="whitespace-nowrap">Génération Auto</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleExcelExport}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 border text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto ${
                            currentPlan.features.excelExport
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                              : 'bg-slate-950/60 border-amber-500/30 text-gray-400 hover:text-white'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="whitespace-nowrap">Export Excel</span>
                          {!currentPlan.features.excelExport && (
                            <span className="flex items-center gap-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Lock className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                        </button>

                        <button
                          onClick={handlePdfExport}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto"
                        >
                          <Download className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="whitespace-nowrap">Export PDF</span>
                        </button>

                        <button
                          onClick={handleWordExport}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 border text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto ${
                            currentPlan.features.wordExport
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                              : 'bg-slate-950/60 border-amber-500/30 text-gray-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="whitespace-nowrap">Export Word</span>
                          {!currentPlan.features.wordExport && (
                            <span className="flex items-center gap-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Lock className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* THE LIVE WEAKLY PLANNING GRID */}
                    {classes.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                        <div className="max-w-md mx-auto">
                          <SlidersHorizontal className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-white">Aucune Classe Déclarée</h3>
                          <p className="text-sm text-gray-400 mt-2">
                            {"Enregistrez vos premières classes scolaires dans l'onglet \"Classes\" pour commencer à dresser l'emploi du temps."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-2xl">
                        <table className="w-full min-w-[900px] border-collapse text-left">
                          <thead>
                            <tr className="border-b border-white/10 bg-slate-950/80">
                              <th className="py-4 px-4 font-mono text-[11px] text-gray-400 uppercase tracking-wider w-[12%]">
                                Heures
                              </th>
                              {activeDays.map(day => (
                                <th key={day} className="py-4 px-2 font-sans font-bold text-sm text-white w-[14.6%] text-center border-l border-white/10">
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {slotLabels.map((label, sIndex) => (
                              <tr key={sIndex} className="border-b border-white/10 hover:bg-white/[0.02] transition-colors min-h-16">
                                {/* Time labels */}
                                <td className="py-2 px-4 font-mono text-xs text-gray-300 bg-slate-950/40 font-medium border-r border-white/5 whitespace-nowrap">
                                  {label}
                                </td>
                                {/* Days blocks cells */}
                                {activeDays.map(day => {
                                  const spanInfo = getClassCellSpanInfo(selectedClassId, day, sIndex);
                                  if (spanInfo.isContinuation) return null;

                                  return (
                                    <td 
                                      key={day} 
                                      rowSpan={spanInfo.rowSpan}
                                      className="p-1.5 border-l border-white/10 align-top"
                                      onDragOver={(e) => handleDragOverCell(e, day, sIndex)}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => handleDropOnCell(e, day, sIndex)}
                                    >
                                      {renderCellContent(day, sIndex, spanInfo)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* --- THE UNSCHEDULED HOURS DRAWER / DRAWER FOR MANUAL MANIPULATION --- */}
                    {classes.length > 0 && (
                      <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-indigo-400" />
                              Corbeille des heures à placer ({unscheduled.filter(u => u.hours > 0).length} matières)
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {"Glissez ces étiquettes de cours manuellement sur l'emploi du temps pour combler les trous ou modifier le planning."}
                            </p>
                          </div>
                        </div>

                        {unscheduled.filter(u => u.hours > 0).length === 0 ? (
                          <div className="py-6 text-center rounded-xl bg-slate-950/25 border border-dashed border-white/5 select-none">
                            <p className="text-xs font-mono text-emerald-400 flex items-center justify-center gap-2">
                              <Check className="w-4 h-4" /> {"Félicitations : Toutes les charges d'enseignements assignées ont été harmonieusement planifiées ! Plus aucun reliquat."}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            {unscheduled.map((u, index) => {
                              if (u.hours <= 0) return null;
                              const clsName = classes.find(c => c.id === u.classId)?.name || u.classId;
                              const teach = teachers.find(t => t.id === u.teacherId);
                              const subjName = subjects.find(s => s.id === u.subjectId)?.name || u.subjectId;
                              const teachColor = teach?.color || '#cbd5e1';

                              return (
                                <div
                                  key={index}
                                  draggable="true"
                                  onDragStart={(e) => handleBasketDragStart(e, u)}
                                  className={`px-3 py-2.5 rounded-xl border cursor-grab active:cursor-grabbing flex flex-col justify-between max-w-[220px] shadow-sm transition-all select-none group ${
                                    theme === 'light'
                                      ? 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                                      : 'border-white/10 hover:border-white/20'
                                  }`}
                                  style={{ 
                                    backgroundColor: theme === 'light' ? `${teachColor}18` : `${teachColor}25`,
                                    borderLeft: `4px solid ${teachColor}`
                                  }}
                                >
                                  <div className={`font-sans font-bold text-xs line-clamp-1 mb-1 ${
                                    theme === 'light' ? 'text-slate-900' : 'text-white'
                                  }`}>
                                    {subjName}
                                  </div>
                                  <div className={`text-[10px] flex items-center justify-between gap-2 mt-1 ${
                                    theme === 'light' ? 'text-slate-700 font-medium' : 'text-gray-300 font-medium'
                                  }`}>
                                    <span className="line-clamp-1 truncate">{teach?.name || u.teacherId}</span>
                                    <span className={`shrink-0 font-bold px-2 py-0.5 rounded-full text-[9px] ${
                                      theme === 'light' 
                                        ? 'bg-white/90 text-slate-800 border border-slate-200 shadow-2xs' 
                                        : 'bg-black/40 text-indigo-300 border border-white/10'
                                    }`}>
                                      {clsName} ({u.hours}h)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* --- TEACHER VIEW MODE --- */}
                {timetableViewMode === 'teacher' && (
                  <div className="space-y-6">
                    {/* TEACHER METADATA CONTROLS */}
                    <div className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <label className="block text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-widest mb-1.5">
                          {"SÉLECTION DE L'ENSEIGNANT OU VUE GLOBALE"}
                        </label>
                        <select
                          value={selectedTeacherId}
                          onChange={(e) => setSelectedTeacherId(e.target.value)}
                          className="bg-slate-950/85 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 w-full sm:w-80 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-medium cursor-pointer shadow-inner"
                        >
                          <option value="all">👥 Tous les enseignants (Vue Globale)</option>
                          {teachers.map(t => {
                            const assigned = timetable.filter(e => e.teacherId === t.id).length;
                            return (
                              <option key={t.id} value={t.id}>
                                👨‍🏫 {t.name} ({assigned}h / {t.weeklyQuota}h)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:flex md:flex-row md:flex-nowrap md:items-center gap-2 mt-4 lg:mt-0 w-full md:w-auto">
                        <button
                          onClick={handleAutoGenerate}
                          disabled={isGenerating || classes.length === 0}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 cursor-pointer w-full md:w-auto"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                              <span className="whitespace-nowrap">Moteur...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 shrink-0" />
                              <span className="whitespace-nowrap">Génération Auto</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleTeacherPdfExport(selectedTeacherId)}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto"
                        >
                          <Download className="w-4 h-4 text-red-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {selectedTeacherId === 'all' 
                              ? `Export PDF (${teachers.length})`
                              : `Export PDF`
                            }
                          </span>
                        </button>

                        <button
                          onClick={() => handleTeacherExcelExport(selectedTeacherId)}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 border text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto ${
                            currentPlan.features.excelExport
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                              : 'bg-slate-950/60 border-amber-500/30 text-gray-400 hover:text-white'
                          }`}
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {selectedTeacherId === 'all' 
                              ? `Export Excel (${teachers.length})`
                              : `Export Excel`
                            }
                          </span>
                          {!currentPlan.features.excelExport && (
                            <span className="flex items-center gap-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Lock className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => handleTeacherWordExport(selectedTeacherId)}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 border text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 cursor-pointer shadow-md w-full md:w-auto ${
                            currentPlan.features.wordExport
                              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                              : 'bg-slate-950/60 border-amber-500/30 text-gray-400 hover:text-white'
                          }`}
                        >
                          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          <span className="whitespace-nowrap">
                            {selectedTeacherId === 'all' 
                              ? `Export Word (${teachers.length})`
                              : `Export Word`
                            }
                          </span>
                          {!currentPlan.features.wordExport && (
                            <span className="flex items-center gap-1 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
                              <Lock className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* NO TEACHERS STATE */}
                    {teachers.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                        <div className="max-w-md mx-auto">
                          <GraduationCap className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-50" />
                          <h3 className="text-lg font-bold text-white">Aucun Enseignant Enregistré</h3>
                          <p className="text-sm text-gray-400 mt-2">
                            {"Ajoutez des enseignants et attribuez-leur des cours dans l'onglet \"Profs\"."}
                          </p>
                        </div>
                      </div>
                    ) : selectedTeacherId === 'all' ? (
                      /* --- ALL TEACHERS GRID LIST --- */
                      <div className="space-y-8">
                        {teachers.map((teacher) => {
                          const assignedHours = timetable.filter(e => e.teacherId === teacher.id).length;
                          const subNames = teacher.subjectIds
                            .map(sid => subjects.find(s => s.id === sid)?.name)
                            .filter(Boolean)
                            .join(', ');
                          
                          const isConforming = assignedHours === teacher.weeklyQuota;

                          return (
                            <div key={teacher.id} className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 shadow-xl space-y-4">
                              {/* Teacher Banner Header */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-base shrink-0"
                                    style={{ backgroundColor: teacher.color }}
                                  >
                                    {teacher.name.charAt(0)}
                                  </div>
                                  <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                                      <span>{teacher.name}</span>
                                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-gray-300 font-mono font-medium">
                                        {subNames || 'Enseignant'}
                                      </span>
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                      <span>Quota visé : <strong className="text-white">{teacher.weeklyQuota}h / sem</strong></span>
                                      <span>•</span>
                                      <span>Heures planifiées : <strong className={isConforming ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{assignedHours}h</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                  <button
                                    onClick={() => setSelectedTeacherId(teacher.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors cursor-pointer"
                                  >
                                    <span>Focus Individuel</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleTeacherPdfExport(teacher.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold rounded-lg border border-red-500/20 transition-colors cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>

                              {/* Individual Teacher Grid Table */}
                              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                                <table className="w-full min-w-[800px] border-collapse text-left">
                                  <thead>
                                    <tr className="border-b border-white/10 bg-slate-950/80">
                                      <th className="py-2.5 px-3 font-mono text-[10px] text-gray-400 uppercase tracking-wider w-[12%]">
                                        Heures
                                      </th>
                                      {activeDays.map(day => (
                                        <th key={day} className="py-2.5 px-2 font-sans font-bold text-xs text-white w-[14.6%] text-center border-l border-white/10">
                                          {day}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slotLabels.map((label, sIndex) => (
                                      <tr key={sIndex} className="border-b border-white/5 hover:bg-white/[0.02] min-h-12">
                                        <td className="py-1 px-3 font-mono text-[11px] text-gray-400 bg-slate-950/40 font-medium border-r border-white/5 whitespace-nowrap">
                                          {label.split(' - ')[0]}
                                        </td>
                                        {activeDays.map(day => {
                                          const spanInfo = getTeacherCellSpanInfo(teacher, day, sIndex);
                                          if (spanInfo.isContinuation) return null;

                                          return (
                                            <td key={day} rowSpan={spanInfo.rowSpan} className="p-1 border-l border-white/10 align-top">
                                              {renderTeacherCellContent(teacher, day, sIndex, spanInfo)}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* --- SINGLE TEACHER FOCUS VIEW --- */
                      (() => {
                        const teacher = teachers.find(t => t.id === selectedTeacherId);
                        if (!teacher) return null;

                        const assignedHours = timetable.filter(e => e.teacherId === teacher.id).length;
                        const subNames = teacher.subjectIds
                          .map(sid => subjects.find(s => s.id === sid)?.name)
                          .filter(Boolean)
                          .join(', ');

                        const classBreakdown: { [cName: string]: number } = {};
                        timetable.filter(e => e.teacherId === teacher.id).forEach(e => {
                          const cName = classes.find(c => c.id === e.classId)?.name || e.classId;
                          classBreakdown[cName] = (classBreakdown[cName] || 0) + 1;
                        });

                        return (
                          <div className="space-y-6">
                            {/* Focus Teacher Banner */}
                            <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div
                                  className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl text-xl shrink-0"
                                  style={{ backgroundColor: teacher.color }}
                                >
                                  {teacher.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-white">{teacher.name}</h2>
                                    <button
                                      onClick={() => setSelectedTeacherId('all')}
                                      className="text-xs text-indigo-400 hover:underline font-mono cursor-pointer"
                                    >
                                      (← Voir Tous les Profs)
                                    </button>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Matière(s) dispensée(s) : <strong className="text-indigo-300">{subNames || "Aucune"}</strong>
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {Object.entries(classBreakdown).map(([cName, hrs]) => (
                                      <span key={cName} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold">
                                        {cName} : {hrs}h/sem
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-center min-w-[130px]">
                                  <div className="text-[10px] font-mono text-gray-400 uppercase">Volume Planifié</div>
                                  <div className="text-lg font-bold text-white mt-0.5">
                                    {assignedHours}h <span className="text-xs text-gray-400 font-normal">/ {teacher.weeklyQuota}h</span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleTeacherPdfExport(teacher.id)}
                                  className="flex items-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 text-xs font-bold rounded-xl transition-all shadow-md w-full sm:w-auto justify-center cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Télécharger PDF Prof</span>
                                </button>
                              </div>
                            </div>

                            {/* Single Teacher Grid */}
                            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md shadow-2xl">
                              <table className="w-full min-w-[900px] border-collapse text-left">
                                <thead>
                                  <tr className="border-b border-white/10 bg-slate-950/80">
                                    <th className="py-4 px-4 font-mono text-[11px] text-gray-400 uppercase tracking-wider w-[12%]">
                                      Heures
                                    </th>
                                    {activeDays.map(day => (
                                      <th key={day} className="py-4 px-2 font-sans font-bold text-sm text-white w-[14.6%] text-center border-l border-white/10">
                                        {day}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {slotLabels.map((label, sIndex) => (
                                    <tr key={sIndex} className="border-b border-white/10 hover:bg-white/[0.02] transition-colors min-h-16">
                                      <td className="py-2 px-4 font-mono text-xs text-gray-300 bg-slate-950/40 font-medium border-r border-white/5 whitespace-nowrap">
                                        {label}
                                      </td>
                                      {activeDays.map(day => {
                                        const spanInfo = getTeacherCellSpanInfo(teacher, day, sIndex);
                                        if (spanInfo.isContinuation) return null;

                                        return (
                                          <td key={day} rowSpan={spanInfo.rowSpan} className="p-1.5 border-l border-white/10 align-top">
                                            {renderTeacherCellContent(teacher, day, sIndex, spanInfo)}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CLASSES MANAGEMENT */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                
                {/* HEADER BANNER WITH STEP-BY-STEP BEGINNER GUIDE */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Étape 4 : Configuration des Classes & Affectations Pédagogiques</span>
                          <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            Groupes & Volumes Horaires
                          </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Déclarez vos classes et attribuez à chaque groupe les cours à suivre (Matière + Professeur + Heures par semaine).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GUIDE DÉBUTANT PAS-À-PAS */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guide Débutant : Ce que vous devez faire sur cette étape</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                          <span>Créer la classe</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Saisissez le libellé de la classe (ex: Terminale S1, 6ème A, 3ème B).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                          <span>Affecter les cours</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Pour chaque matière, choisissez le professeur assigné et le nombre d'heures par semaine (ex: Maths 5h).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                          <span>Fermetures (Optionnel)</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Marquez les créneaux où cette classe n'a jamais cours (ex: fermeture après-midi).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">4</span>
                          <span>Passer à l'Étape 5</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur "Ajouter la classe". Quand toutes les classes sont créées, filez à l'Étape 5 pour générer !
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MAIN BLOCK: FORM + LIST */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT: FORM (5 COLS) */}
                  <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      {editingClassId ? "Modifier la Classe" : "Ajouter une Classe"}
                    </h3>

                    <form onSubmit={handleSaveClass} className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-medium">Libellé / Nom de la classe</label>
                        <input
                          type="text"
                          placeholder="Ex: Terminale S, 6ème B, 1ère L"
                          value={newClassName}
                          onChange={(e) => setNewClassName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                        />
                      </div>

                      {/* Quantum Horaire Section inside Class */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="block text-xs uppercase text-indigo-300 font-mono tracking-wider font-bold mb-1">
                          {"Affectation Enseignant + Matière (Menus Déroulants)"}
                        </label>
                        <p className="text-[10px] text-gray-400 mb-3">
                          {"Associez un professeur déjà configuré et sa matière dans les menus déroulants ci-dessous."}
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-[10px] text-gray-300 font-semibold mb-1">1. Choisir le Professeur</label>
                            <select
                              value={tempTeacherId}
                              onChange={(e) => {
                                setTempTeacherId(e.target.value);
                                // Auto set possible subject
                                const prof = teachers.find(t => t.id === e.target.value);
                                if (prof && prof.subjectIds.length > 0) {
                                  setTempSubjectId(prof.subjectIds[0]);
                                }
                              }}
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                            >
                              <option value="">-- Menu déroulant Enseignants --</option>
                              {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name} (Quota: {t.weeklyQuota}h)</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-gray-300 font-semibold mb-1">2. Choisir la Matière</label>
                            <select
                              value={tempSubjectId}
                              onChange={(e) => setTempSubjectId(e.target.value)}
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                            >
                              <option value="">-- Menu déroulant Matières --</option>
                              {/* Filter subjects taught by the selected teacher */}
                              {tempTeacherId 
                                ? teachers.find(t => t.id === tempTeacherId)?.subjectIds.map(sid => (
                                    <option key={sid} value={sid}>{subjects.find(s => s.id === sid)?.name || sid}</option>
                                  ))
                                : subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))
                              }
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-1/2">
                            <label className="block text-[10px] text-gray-400 mb-1">Heures par semaine</label>
                            <input
                              type="number"
                              min={1}
                              max={15}
                              value={tempHours}
                              onChange={(e) => setTempHours(Number(e.target.value))}
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                          
                          <div className="w-1/2 pt-5">
                            <button
                              type="button"
                              onClick={handleAddAssignmentToClassForm}
                              className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-xl border border-indigo-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Lier ce cours
                            </button>
                          </div>
                        </div>

                        {/* List of currently associated assignments in form */}
                        <div className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-white/10 max-h-40 overflow-y-auto">
                          <p className="text-[10px] font-mono uppercase text-gray-400 tracking-wider font-semibold">
                            {"Plan d'études lié"} ({classAssignments.length})
                          </p>
                          {classAssignments.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">{"Aucun cours rattaché pour l'instant."}</p>
                          ) : (
                            classAssignments.map((a, i) => {
                              const tName = teachers.find(t => t.id === a.teacherId)?.name || 'Prof inconnu';
                              const sName = subjects.find(s => s.id === a.subjectId)?.name || 'Matière';
                              return (
                                <div key={i} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white/5 border border-white/10">
                                  <span className="text-gray-200 font-medium">
                                    {sName} <span className="text-gray-500">avec</span> {tName}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold bg-indigo-500/20 px-2 py-0.5 rounded-full text-[10px] text-indigo-300 border border-indigo-500/30">
                                      {a.hoursPerWeek}h
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAssignmentFromClassForm(a.teacherId, a.subjectId)}
                                      className="text-red-400 hover:text-red-300 transition-colors p-1"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* INTERACTIVE CLASS TIME EXCLUSION GRID */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="block text-xs uppercase text-indigo-300 font-mono tracking-wider font-bold mb-1">
                          Plages de Fermeture / Indisponibilité classe
                        </label>
                        <p className="text-[10px] text-gray-400 mb-3 leading-snug">
                          {"Cliquetez sur la grille ci-dessous pour filtrer les plages où cette classe ne peut pas avoir de cours (ex: fermeture d'établissement ou ateliers)."}
                        </p>

                        <div 
                          className="grid gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/10 select-none text-center"
                          style={{ gridTemplateColumns: `repeat(${activeDays.length + 1}, minmax(0, 1fr))` }}
                        >
                          {/* Hour labels header column */}
                          <div className="text-[9px] text-gray-500 font-mono flex items-center justify-center">Jour</div>
                          {activeDays.map(d => (
                            <div key={d} className="text-[9px] font-sans font-bold text-gray-300">
                              {d.substring(0, 3)}
                            </div>
                          ))}

                          {/* Render slots rows */}
                          {slotLabels.map((slotLabel, sIdx) => (
                            <React.Fragment key={sIdx}>
                              <div className="text-[8px] text-gray-500 font-mono flex items-center justify-center py-0.5" title={slotLabel}>
                                {slotLabel.split(' - ')[0]}
                              </div>
                              {activeDays.map(day => {
                                const isUn = newClassUnavail.some(u => u.day === day && u.slotIndex === sIdx);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => toggleClassFormUnavailability(day, sIdx)}
                                    className={`w-full aspect-square text-[9px] font-bold rounded transition-all cursor-pointer ${
                                      isUn 
                                        ? 'bg-red-500/40 text-white border border-red-500/30' 
                                        : 'bg-white/5 hover:bg-white/10 text-gray-500 border border-transparent'
                                    }`}
                                    title={`${day} - ${slotLabel} : ${isUn ? 'Exclu' : 'Libre'}`}
                                  >
                                    {isUn ? 'X' : ''}
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* BUTTON COUPLING */}
                      <div className="pt-4 flex items-center gap-2">
                        {editingClassId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClassId(null);
                              setNewClassName('');
                              setClassAssignments([]);
                              setNewClassUnavail([]);
                            }}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-gray-300 hover:bg-white/5 transition-colors cursor-pointer font-medium"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{editingClassId ? "Appliquer Modifications" : "Enregistrer cette Classe"}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* RIGHT: LIST OF CLASSES (7 COLS) */}
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      Classes Scolaires Enregistrées
                    </h3>

                    {classes.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl italic text-gray-400 text-sm">
                        Aucun classe existante. Veuillez utiliser le formulaire de gauche.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {classes.map(c => {
                          const totalHours = c.assignments.reduce((sum, a) => sum + a.hoursPerWeek, 0);
                          const unavailCount = c.unavailability?.length || 0;

                          return (
                            <div key={c.id} className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-bold text-white text-base">{c.name}</h4>
                                  <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-bold">
                                    {totalHours}h/semaine
                                  </span>
                                </div>

                                <div className="space-y-1.5 my-3 bg-slate-950/50 p-3 rounded-xl border border-white/10">
                                  {c.assignments.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">Aucun cours assigné.</p>
                                  ) : (
                                    c.assignments.map((a, i) => {
                                      const t = teachers.find(tr => tr.id === a.teacherId);
                                      const s = subjects.find(su => su.id === a.subjectId);
                                      return (
                                        <div key={i} className="flex items-center justify-between text-xs font-mono">
                                          <span className="text-gray-300 truncate flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t?.color || '#fff' }} />
                                            {s?.name || a.subjectId}
                                          </span>
                                          <span className="text-gray-200 font-bold">{a.hoursPerWeek}h</span>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
                                <span className="text-[10px] text-gray-400 font-mono font-medium">
                                  ❌ {unavailCount} créneaux exclus
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditClassClick(c)}
                                    className="p-1 px-2.5 text-xs bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 border border-indigo-500/20 transition-all font-semibold cursor-pointer"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClass(c.id, c.name)}
                                    className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM NAVIGATION CALL-TO-ACTION (PASSAGE ÉTAPE 5) */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 backdrop-blur-xl border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Toutes vos classes sont prêtes !</h4>
                      <p className="text-xs text-gray-400">Vous avez configuré <strong className="text-indigo-300 font-mono">{classes.length}</strong> classe(s) et leurs cours. Passez à la génération automatique des emplois du temps.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerNotification("Étape 4 validée ! Passage à l'Étape 5 (Emplois du Temps).", "success");
                      setActiveTab('timetable');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group border border-indigo-400/30 shrink-0"
                  >
                    <span>👉 Passer à l'Étape 5 : Générer les Emplois du Temps</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform animate-pulse" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: TEACHERS MANAGEMENT */}
            {activeTab === 'teachers' && (
              <div className="space-y-6">
                
                {/* HEADER BANNER WITH STEP-BY-STEP BEGINNER GUIDE */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Étape 3 : Fiches Enseignants & Disponibilités</span>
                          <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            Professeurs & Quotas
                          </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Enregistrez les professeurs, leurs matières habilitées, leur quota d'heures par semaine et leurs temps libres.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GUIDE DÉBUTANT PAS-À-PAS */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guide Débutant : Ce que vous devez faire sur cette étape</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                          <span>Nom de l'enseignant</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Saisissez le nom (ex: M. Diongue, Mme Sow) dans le formulaire à gauche.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                          <span>Quota & Matières</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Indiquez son volume d'heures/semaine visé (ex: 18h) et cochez les matières qu'il enseigne.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                          <span>Temps libres (Optionnel)</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur la petite grille pour griser (X) les créneaux où ce prof ne peut pas être programmé.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">4</span>
                          <span>Enregistrer le prof</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur "Ajouter l'enseignant". Dès que l'équipe est créée, passez à l'Étape 4 (Classes).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FORM + GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT: FORM */}
                  <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      {editingTeacherId ? "Modifier l'Enseignant" : "Ajouter un Enseignant"}
                    </h3>

                    <form onSubmit={handleSaveTeacher} className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-medium">{"Nom complet de l'enseignant"}</label>
                        <input
                          type="text"
                          placeholder="M. Diongue, Mme. Sow etc."
                          value={newTeacherName}
                          onChange={(e) => setNewTeacherName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-300 mb-1.5 font-medium">{"Quota d'heures (1 à 30h)"}</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={newTeacherQuota}
                            onChange={(e) => setNewTeacherQuota(Number(e.target.value))}
                            className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-300 mb-1.5 font-medium">{"Couleur d'affichage"}</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={newTeacherColor}
                              onChange={(e) => setNewTeacherColor(e.target.value)}
                              className="w-10 h-9 p-0 bg-transparent text-white border-0 cursor-pointer rounded-lg shrink-0"
                            />
                            <input
                              type="text"
                              value={newTeacherColor}
                              onChange={(e) => setNewTeacherColor(e.target.value)}
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-2 text-xs focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dropdown & Tag selection for subjects taught */}
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-medium">
                          Matières enseignées (Liaison par Menu Déroulant)
                        </label>
                        {subjects.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">{"Veuillez d'abord ajouter des matières à l'Étape 1 (\"Matières\")."}</p>
                        ) : (
                          <div className="space-y-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const sid = e.target.value;
                                if (sid && !newTeacherSubjects.includes(sid)) {
                                  setNewTeacherSubjects([...newTeacherSubjects, sid]);
                                }
                              }}
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                            >
                              <option value="">-- Sélectionner une matière dans le menu déroulant --</option>
                              {subjects.map(s => (
                                <option key={s.id} value={s.id} disabled={newTeacherSubjects.includes(s.id)}>
                                  {s.name} {newTeacherSubjects.includes(s.id) ? '✓ (Déjà liée)' : ''}
                                </option>
                              ))}
                            </select>

                            {/* Badges for currently linked subjects */}
                            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto bg-slate-950/40 p-2.5 rounded-xl border border-white/10">
                              {newTeacherSubjects.length === 0 ? (
                                <p className="text-[11px] text-gray-500 italic">{"Aucune matière sélectionnée. Choisissez dans le menu déroulant ci-dessus."}</p>
                              ) : (
                                newTeacherSubjects.map(sid => {
                                  const sName = subjects.find(s => s.id === sid)?.name || sid;
                                  return (
                                    <span
                                      key={sid}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600/30 border border-indigo-400/40 text-indigo-200 flex items-center gap-1.5 shadow-sm"
                                    >
                                      {sName}
                                      <button
                                        type="button"
                                        onClick={() => setNewTeacherSubjects(newTeacherSubjects.filter(id => id !== sid))}
                                        className="text-indigo-300 hover:text-white ml-0.5 cursor-pointer font-bold hover:scale-110 transition-transform"
                                        title="Retirer cette matière"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* INTERACTIVE TEACHER TIME EXCLUSION GRID */}
                      <div className="border-t border-white/10 pt-4">
                        <label className="block text-xs uppercase text-indigo-300 font-mono tracking-wider font-bold mb-1">
                          Temps libres & Exclusions Prof
                        </label>
                        <p className="text-[10px] text-gray-400 mb-3 leading-snug">
                          {"Cliquetez pour griser (X) les plages horaires d'indisponibilité absolue de cet enseignant (ex: temps partiel ou charges extérieures)."}
                        </p>

                        <div 
                          className="grid gap-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/10 select-none text-center"
                          style={{ gridTemplateColumns: `repeat(${activeDays.length + 1}, minmax(0, 1fr))` }}
                        >
                          {/* Hour labels header column */}
                          <div className="text-[9px] text-gray-500 font-mono flex items-center justify-center">Jour</div>
                          {activeDays.map(d => (
                            <div key={d} className="text-[9px] font-sans font-bold text-gray-300">
                              {d.substring(0, 3)}
                            </div>
                          ))}

                          {/* Render slots rows */}
                          {slotLabels.map((slotLabel, sIdx) => (
                            <React.Fragment key={sIdx}>
                              <div className="text-[8px] text-gray-500 font-mono flex items-center justify-center py-0.5" title={slotLabel}>
                                {slotLabel.split(' - ')[0]}
                              </div>
                              {activeDays.map(day => {
                                const isUn = newTeacherUnavail.some(u => u.day === day && u.slotIndex === sIdx);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => toggleTeacherFormUnavailability(day, sIdx)}
                                    className={`w-full aspect-square text-[9px] font-bold rounded transition-all cursor-pointer ${
                                      isUn 
                                        ? 'bg-red-500/40 text-white border border-red-500/30' 
                                        : 'bg-white/5 hover:bg-white/10 text-gray-500 border border-transparent'
                                    }`}
                                    title={`${day} - ${slotLabel} : ${isUn ? 'Exclu' : 'Libre'}`}
                                  >
                                    {isUn ? 'X' : ''}
                                  </button>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* SUBMIT BUTTON */}
                      <div className="pt-4 flex gap-2">
                        {editingTeacherId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherId(null);
                              setNewTeacherName('');
                              setNewTeacherSubjects([]);
                              setNewTeacherQuota(18);
                              setNewTeacherUnavail([]);
                            }}
                            className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs text-gray-300 hover:bg-white/5 transition-colors cursor-pointer font-medium"
                          >
                            Annuler
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>{editingTeacherId ? "Mettre à jour" : "Enregistrer ce Professeur"}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* RIGHT: LIST OF TEACHERS */}
                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      Corps Enseignant Actuel
                    </h3>

                    {teachers.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl italic text-gray-400 text-sm">
                        Aucun enseignant créé. Veuillez saisir les informations de gauche.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {teachers.map(t => {
                          const activeAllocatedHours = timetable.filter(e => e.teacherId === t.id).length;
                          const mappedSubjectsList = t.subjectIds.map(sid => subjects.find(s => s.id === sid)?.name || sid).join(', ');

                          return (
                            <div key={t.id} className="p-5 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all shadow-xl flex flex-col justify-between" style={{ borderLeft: `4px solid ${t.color}` }}>
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-white text-base">{t.name}</h4>
                                  <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold">
                                    Quota : {t.weeklyQuota}h
                                  </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                  <div>
                                    <span className="text-gray-400 block text-[10px] font-mono uppercase tracking-wider font-semibold">Matières</span>
                                    <span className="text-gray-200 font-medium">{mappedSubjectsList || 'Aucune matière liée'}</span>
                                  </div>

                                  <div className="pt-2">
                                    <span className="text-gray-400 block text-[10px] font-mono uppercase tracking-wider mb-1 font-semibold">Charge Planifiée</span>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                          className="h-full rounded-full transition-all duration-300" 
                                          style={{ 
                                            width: `${Math.min((activeAllocatedHours / t.weeklyQuota) * 100, 100)}%`,
                                            backgroundColor: t.color 
                                          }} 
                                        />
                                      </div>
                                      <span className="font-mono text-xs text-slate-300 font-bold shrink-0">
                                        {activeAllocatedHours} / {t.weeklyQuota}h
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-5">
                                <span className="text-[10px] text-gray-400 font-mono font-medium">
                                  ❌ {t.unavailability?.length || 0} slots exclus
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditTeacherClick(t)}
                                    className="p-1 px-2.5 text-xs bg-indigo-500/10 text-indigo-400 rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 border border-indigo-500/20 transition-all font-semibold cursor-pointer"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTeacher(t.id, t.name)}
                                    className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM NAVIGATION CALL-TO-ACTION (PASSAGE ÉTAPE 4) */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 backdrop-blur-xl border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Corps professoral configuré</h4>
                      <p className="text-xs text-gray-400">Vous avez enregistré <strong className="text-indigo-300 font-mono">{teachers.length}</strong> enseignant(s). Passez à la configuration des classes et affectations.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerNotification("Étape 3 validée ! Passage à l'Étape 4 (Classes).", "success");
                      setActiveTab('classes');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group border border-indigo-400/30 shrink-0"
                  >
                    <span>👉 Passer à l'Étape 4 : Classes & Affectations</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform animate-pulse" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: SUBJECTS MANAGEMENT */}
            {activeTab === 'subjects' && (
              <div className="space-y-6">
                
                {/* HEADER BANNER WITH STEP-BY-STEP BEGINNER GUIDE */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-white/10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                          <span>Étape 2 : Référentiel des Matières d'Enseignement</span>
                          <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            Disciplines & Couleurs
                          </span>
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                          Enregistrez la liste de toutes les disciplines proposées dans votre école et associez-leur des couleurs visuelles.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GUIDE DÉBUTANT PAS-À-PAS */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/20">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider mb-2.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Guide Débutant : Ce que vous devez faire sur cette étape</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">1</span>
                          <span>Nommer la matière</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Écrivez le nom de la matière dans le formulaire de gauche (ex: Mathématiques, Français, SVT).
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">2</span>
                          <span>Choisir une couleur</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur une pastille de couleur pour identifier visuellement les cours sur l'emploi du temps.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center font-bold">3</span>
                          <span>Valider & Continuer</span>
                        </div>
                        <p className="text-gray-400 text-[11px] leading-relaxed">
                          Cliquez sur "Ajouter la matière". Une fois toutes vos matières saisies, passez à l'Étape 3 (Professeurs).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* CREATE SUBJECT FORM */}
                  <div className="md:col-span-5 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      Ajouter une Discipline
                    </h3>

                    <form onSubmit={handleAddSubject} className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1.5 font-medium">Libellé complet de la matière</label>
                        <input
                          type="text"
                          placeholder="Ex: Mathématiques, Sciences Physiques"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Agréger la Matière
                      </button>
                    </form>
                  </div>

                  {/* DISPLAY SUBJECT CARDS */}
                  <div className="md:col-span-7 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                    <h3 className="text-xs font-mono tracking-wider text-indigo-400 uppercase mb-4 font-bold">
                      Disciplines Enregistrées
                    </h3>

                    {subjects.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-6">Aucune matière enregistrée.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {subjects.map(s => {
                          const teachersQualified = teachers.filter(t => t.subjectIds.includes(s.id));
                          return (
                            <div key={s.id} className="p-4 rounded-xl bg-slate-950/50 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between group">
                              <div>
                                <h4 className="font-bold text-white text-sm">{s.name}</h4>
                                <span className="text-[10px] text-gray-400 font-mono font-medium">
                                  {teachersQualified.length} enseignant(s) rattaché(s)
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteSubject(s.id, s.name)}
                                className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* BOTTOM NAVIGATION CALL-TO-ACTION (PASSAGE ÉTAPE 3) */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 backdrop-blur-xl border border-indigo-500/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Vos matières sont enregistrées ?</h4>
                      <p className="text-xs text-gray-400">Vous avez configuré <strong className="text-indigo-300 font-mono">{subjects.length}</strong> discipline(s). Passez à la création du corps enseignant.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerNotification("Étape 2 validée ! Passage à l'Étape 3 (Professeurs).", "success");
                      setActiveTab('teachers');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 cursor-pointer group border border-indigo-400/30 shrink-0"
                  >
                    <span>👉 Passer à l'Étape 3 : Fiches Professeurs</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform animate-pulse" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: CHEF D'ÉTABLISSEMENT VIEW (STATS SYNTHESIS & EXECUTIVE DASHBOARD) */}
            {activeTab === 'stats' && isMounted && (() => {
              const {
                totalPlannedHours,
                totalTargetHours,
                globalCompletionRatio,
                conformingTeachersCount,
                underloadedTeachersCount,
                overloadedTeachersCount,
                subjectHoursData,
                topSubject,
                classChartData,
                teacherChartData
              } = dashboardMetrics;

              // Color constant palette for subject breakdown
              const SUBJECT_COLORS = [
                '#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', 
                '#8b5cf6', '#d946ef', '#ec4899', '#14b8a6', '#f97316'
              ];

              // Custom tooltip styling matching dark/light themes
              const CustomChartTooltip = ({ active, payload, label }: any) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-950/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                      <p className="font-bold text-xs text-white mb-1.5 font-sans border-b border-white/5 pb-1">{label}</p>
                      {payload.map((item: any, index: number) => (
                        <p key={index} className="text-[11px] font-mono flex items-center gap-1.5" style={{ color: item.color || item.fill || '#cbd5e1' }}>
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: item.color || item.fill || '#cbd5e1' }} />
                          {item.name} : <span className="font-bold">{item.value}h</span>
                        </p>
                      ))}
                    </div>
                  );
                }
                return null;
              };

              // Identify critical alerts
              const criticalAlerts: { id: string; type: 'class' | 'teacher'; message: string; severity: 'error' | 'warning' }[] = [];

              statistics.classStats.forEach(c => {
                const diff = c.assigned - c.targetHours;
                if (diff < 0) {
                  criticalAlerts.push({
                    id: `class-under-${c.id}`,
                    type: 'class',
                    message: `La classe ${c.name} est sous-planifiée : manque ${Math.abs(diff)}h de cours pour atteindre son quota réglementaire.`,
                    severity: 'error'
                  });
                } else if (diff > 0) {
                  criticalAlerts.push({
                    id: `class-over-${c.id}`,
                    type: 'class',
                    message: `La classe ${c.name} est sur-planifiée : excès de +${diff}h au-delà du volume requis.`,
                    severity: 'warning'
                  });
                }
              });

              statistics.teachStats.forEach(t => {
                const diff = t.assigned - t.weeklyQuota;
                if (diff < 0) {
                  criticalAlerts.push({
                    id: `teacher-under-${t.id}`,
                    type: 'teacher',
                    message: `L'enseignant ${t.name} est en sous-charge contractuelle de ${Math.abs(diff)}h (${t.assigned}h faites sur ${t.weeklyQuota}h contractées).`,
                    severity: 'warning'
                  });
                } else if (diff > 0) {
                  criticalAlerts.push({
                    id: `teacher-over-${t.id}`,
                    type: 'teacher',
                    message: `L'enseignant ${t.name} est en surcharge de +${diff}h au-dessus de son quota de ${t.weeklyQuota}h.`,
                    severity: 'error'
                  });
                }
              });

              // Quality Tag for Score
              let qualityLabel = "Excellent";
              let qualityBg = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              if (generationScore < 75) {
                qualityLabel = "À optimiser";
                qualityBg = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
              } else if (generationScore < 90) {
                qualityLabel = "Très Bon";
                qualityBg = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              }

              return (
                <div className="space-y-6">
                  
                  {/* DYNAMIC HEADER OVERVIEW */}
                  <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="space-y-1 z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 font-mono px-3 py-1 rounded-full font-bold">
                          Tableau de Bord Exécutif
                        </span>
                        <span className={`text-[10px] uppercase tracking-wider font-mono px-3 py-1 rounded-full font-bold ${qualityBg}`}>
                          {qualityLabel}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-2">
                        <Award className="w-6 h-6 text-indigo-400" />
                        <span>{"Contrôle Global du Chef d'Établissement"}</span>
                      </h2>
                      <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                        {"Analysez la répartition des heures, détectez les écarts contractuels et supervisez l'avancement global du planning de vos divisions d'un seul coup d'œil."}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 z-10">
                      <div className="bg-slate-950/70 border border-indigo-500/30 p-4 rounded-2xl font-mono text-center shadow-lg relative min-w-[130px]">
                        <span className="block text-[9px] uppercase text-gray-400 font-bold mb-1 tracking-wider">Index Qualité</span>
                        <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                          {generationScore}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 COLUMNS KPI GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* KPI 1: GLOBAL COMPLETION RATIO */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between aspect-square transition-all hover:border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Couverture Classes</span>
                        <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                          <Building2 className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="mt-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-3xl font-black text-white">{globalCompletionRatio}%</span>
                            <span className="text-xs text-gray-400 font-medium">planifié</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">
                            {totalPlannedHours}h sur {totalTargetHours}h requises
                          </p>
                        </div>
                        
                        {/* Custom micro progress bar */}
                        <div className="h-2 bg-slate-950 rounded-full mt-auto overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                            style={{ width: `${globalCompletionRatio}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: TEACHERS STATUS */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between aspect-square transition-all hover:border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Respect Contrats</span>
                        <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                          <Users className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="mt-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-3xl font-black text-white">{conformingTeachersCount} / {teachers.length}</span>
                            <span className="text-xs text-gray-400 font-medium">conformes</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span className="text-amber-400 font-mono">-{underloadedTeachersCount} sous-ch.</span>
                            <span className="text-rose-400 font-mono">+{overloadedTeachersCount} sur-ch.</span>
                          </p>
                        </div>

                        <div className="h-2 bg-slate-950 rounded-full mt-auto overflow-hidden flex border border-white/5">
                          <div 
                            className="h-full bg-emerald-500" 
                            style={{ width: `${(conformingTeachersCount / (teachers.length || 1)) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-amber-500" 
                            style={{ width: `${(underloadedTeachersCount / (teachers.length || 1)) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-rose-500" 
                            style={{ width: `${(overloadedTeachersCount / (teachers.length || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* KPI 3: TOP SUBJECT */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between aspect-square transition-all hover:border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Matière Dominante</span>
                        <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                          <BookOpen className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="mt-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5 mt-2 overflow-hidden">
                            <span className="text-xl font-bold text-white truncate block max-w-full" title={topSubject.name}>
                              {topSubject.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">
                            {topSubject.value} heures hebdomadaires
                          </p>
                        </div>
                        
                        <div className="h-2 bg-slate-950 rounded-full mt-auto overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${totalPlannedHours > 0 ? (topSubject.value / totalPlannedHours) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* KPI 4: PLANNED CLASSES STATS */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between aspect-square transition-all hover:border-white/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Classes Complètes</span>
                        <span className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                          <FileText className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="mt-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5 mt-2">
                            <span className="text-3xl font-black text-white">
                              {statistics.classStats.filter(c => c.assigned === c.targetHours).length} / {classes.length}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">divisions</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">
                            {statistics.classStats.filter(c => c.assigned < c.targetHours).length} classes incomplètes
                          </p>
                        </div>
                        
                        <div className="h-2 bg-slate-950 rounded-full mt-auto overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-rose-500 transition-all duration-500"
                            style={{ width: `${(statistics.classStats.filter(c => c.assigned === c.targetHours).length / (classes.length || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CHART 1: CLASS HOURS COMPARATIVE */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Building2 className="w-4.5 h-4.5 text-indigo-400" />
                            <span>Couverture Horaire des Divisions</span>
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {"Comparaison entre les heures planifiées et les volumes horaires visés par classe."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChefDetailModalType('classes')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            title="Ouvrir le graphique global de toutes les classes avec explications simples"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>PLUS DE DÉTAILS</span>
                          </button>
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono px-2.5 py-1 rounded-full border border-indigo-500/20 font-bold hidden sm:inline-block">
                            Heures / Semaine
                          </span>
                        </div>
                      </div>

                      <div className="h-72 w-full">
                        {classChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">
                            Aucune donnée de classe disponible.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                              <XAxis dataKey="name" stroke={theme === 'dark' ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                              <YAxis stroke={theme === 'dark' ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                              <Bar dataKey="Planifié" fill="#10b981" radius={[4, 4, 0, 0]} name="Volume Planifié" />
                              <Bar dataKey="Cible" fill="#6366f1" radius={[4, 4, 0, 0]} name="Volume Cible Visé" />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* CHART 2: TEACHERS RESPECT CONTROLLER */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl">
                      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Users className="w-4.5 h-4.5 text-emerald-400" />
                            <span>Charges Enseignants vs Contrats</span>
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {"Suivi des heures de cours hebdomadaires attribuées comparées aux quotas contractuels."}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setChefDetailModalType('teachers')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                            title="Ouvrir le graphique global des enseignants avec audit et explications textuelles"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>PLUS DE DÉTAILS</span>
                          </button>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-mono px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold hidden sm:inline-block">
                            Code Couleur Dédié
                          </span>
                        </div>
                      </div>

                      <div className="h-72 w-full">
                        {teacherChartData.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-gray-500 italic">
                            Aucune donnée de professeur disponible.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={teacherChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'} vertical={false} />
                              <XAxis dataKey="name" stroke={theme === 'dark' ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                              <YAxis stroke={theme === 'dark' ? '#64748b' : '#475569'} fontSize={10} tickLine={false} />
                              <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                              <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                              <Bar dataKey="Planifié" name="Volume Planifié" radius={[4, 4, 0, 0]}>
                                {teacherChartData.map((entry, index) => {
                                  const teachColor = statistics.teachStats[index]?.color || '#10b981';
                                  return <Cell key={`cell-teach-${index}`} fill={teachColor} />;
                                })}
                              </Bar>
                              <Bar dataKey="Quota" fill="#475569" opacity={0.6} radius={[4, 4, 0, 0]} name="Quota Contractuel" />
                            </RechartsBarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* BOTTOM SECTIONS: REPARTITION DISCIPLINE AND CRITICAL ALERTS LIST */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* DISCIPLINE HOUR BREAKDOWN */}
                    <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                            <BookOpen className="w-4.5 h-4.5 text-amber-400" />
                            <span>Répartition des Disciplines</span>
                          </h3>
                          <p className="text-[11px] text-gray-400">
                            {"Proportions relatives des volumes horaires dispensés par matière."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChefDetailModalType('subjects')}
                          className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                          title="Ouvrir le graphique global des matières avec explications détaillées"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>PLUS DE DÉTAILS</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        {/* The Donut Chart */}
                        <div className="sm:col-span-5 h-44 flex justify-center relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={subjectHoursData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={62}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {subjectHoursData.map((entry, index) => (
                                  <Cell key={`cell-pie-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value}h`, 'Volume Total']} />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Centered Total label inside Donut */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] uppercase text-gray-500 font-bold">Total</span>
                            <span className="text-base font-black text-white">{totalPlannedHours}h</span>
                          </div>
                        </div>

                        {/* Custom visual legend */}
                        <div className="sm:col-span-7 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {subjectHoursData.length === 0 ? (
                            <p className="text-[11px] text-gray-500 italic">Aucune matière planifiée.</p>
                          ) : (
                            subjectHoursData.map((s, idx) => {
                              const percent = totalPlannedHours > 0 ? Math.round((s.value / totalPlannedHours) * 100) : 0;
                              return (
                                <div key={idx} className="flex items-center justify-between text-xs font-medium">
                                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                    <span 
                                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                                      style={{ backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} 
                                    />
                                    <span className="text-gray-300 truncate" title={s.name}>{s.name}</span>
                                  </div>
                                  <span className="text-gray-500 font-mono text-[10px]">
                                    {s.value}h ({percent}%)
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* SUPERVISOR AUDIT & ALERTS */}
                    <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5 text-rose-400" />
                            <span>{"Registre d'Audit & Alertes de Planification"}</span>
                          </h3>
                          <p className="text-[11px] text-gray-400">
                            {"Conflits, sous-charges ou dépassements de volumes détectés automatiquement par notre moteur."}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setChefDetailModalType('weekly_load')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95 shrink-0"
                          title="Ouvrir le graphique de charge hebdomadaire par jour"
                        >
                          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PLUS DE DÉTAILS</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {criticalAlerts.length === 0 ? (
                          <div className="p-6 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 font-medium flex flex-col items-center justify-center gap-1.5 h-[160px]">
                            <span className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 animate-pulse text-lg font-bold">✓</span>
                            <div>
                              <p className="text-xs font-bold text-white">Établissement 100% Conforme !</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">Aucune surcharge ou anomalie de quota horaire détectée.</p>
                            </div>
                          </div>
                        ) : (
                          criticalAlerts.map((alert) => (
                            <div 
                              key={alert.id} 
                              className={`p-3.5 rounded-xl border-l-4 flex gap-3 text-xs font-medium leading-relaxed ${
                                alert.severity === 'error' 
                                  ? 'bg-rose-500/10 border-rose-500/20 border-l-rose-500 text-rose-300' 
                                  : 'bg-amber-500/10 border-amber-500/20 border-l-amber-500 text-amber-300'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${alert.severity === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                              <div>
                                <p className="text-white text-[11px] font-bold uppercase tracking-wider mb-0.5 font-mono">
                                  {alert.type === 'class' ? 'Alerte Classe' : 'Alerte Professeur'}
                                </p>
                                <p className="text-[11px] text-gray-300 leading-snug">{alert.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              );
            })()}

            {/* TAB 6: AI GEMINI COMPANION ADVISING DOCK */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                
                {/* LOADER / ACTION REASONING SUMMARY */}
                {isExecutingAi && (
                  <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-white flex items-center gap-4 animate-pulse">
                    <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-indigo-300">{"L'Agent IA est à l'œuvre..."}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{"Re-calcul et relocalisation des cours dans l'emploi du temps."}</p>
                    </div>
                  </div>
                )}

                {aiExecutionReasoning && !isExecutingAi && (
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-white space-y-2">
                    <div className="font-bold text-sm text-emerald-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                      <Check className="w-4 h-4" /> {"Rapport d'ajustement de l'Agent IA :"}
                    </div>
                    <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {aiExecutionReasoning}
                    </p>
                    <button 
                      onClick={() => setAiExecutionReasoning('')}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 underline cursor-pointer mt-2 block"
                    >
                      {"Fermer ce rapport d'exécution"}
                    </button>
                  </div>
                )}

                {/* GEMINI PRESENTATION HEADER */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border border-emerald-500/10 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                      {"Assistant IA de Suggestions & Diagnostics"}
                    </h2>
                    <p className="text-sm text-emerald-200/80 leading-relaxed max-w-xl">
                      {"Utilisez notre intégration exclusive de l'IA de pointe Gemini (`gemini-3.5-flash`) pour obtenir des optimisations stratégiques de votre d'emploi du temps, désaturer l'occupation des professeurs et éliminer les trous inutiles dans le planning."}
                    </p>
                  </div>

                  <button
                    onClick={handleQueryAiSuggestions}
                    disabled={isLoadingAi || isExecutingAi}
                    className={`px-5 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                      !currentPlan.features.geminiAI 
                        ? 'bg-slate-800 text-gray-500 border border-slate-700 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-950/50 hover:-translate-y-0.5 disabled:opacity-50'
                    }`}
                  >
                    {!currentPlan.features.geminiAI ? (
                      <>
                        <Lock className="w-5 h-5 text-gray-500" />
                        <span>Assistant Verrouillé (Upgrade requis)</span>
                      </>
                    ) : (
                      <>
                        {isLoadingAi ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        <span>{isLoadingAi ? "Assistant en cours de réflexion..." : "Interroger l'Assistant Directeur"}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RESULT BOX */}
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-glass leading-relaxed text-sm font-sans">
                  {aiSuggestions ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3 font-mono text-xs uppercase text-emerald-400 tracking-wider">
                        <Sparkles className="w-4 h-4" /> {"Diagnostic Généré par l'Intelligence Artificielle :"}
                      </div>
                      <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {aiSuggestions}
                      </div>

                      {!isLoadingAi && (
                        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-500/5 p-3.5 rounded-xl border border-emerald-500/10">
                          <div className="text-xs text-emerald-300 font-medium leading-relaxed">
                            💡 {"Voulez-vous que l'Agent IA réorganise intelligemment l'emploi du temps pour appliquer ces suggestions ?"}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setAiSuggestions('')}
                              className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-slate-800 text-gray-400 text-xs font-semibold cursor-pointer"
                              disabled={isExecutingAi}
                            >
                              {"Ignorer"}
                            </button>
                            <button
                              onClick={() => handleExecuteAi('apply-suggestions')}
                              disabled={isExecutingAi}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                            >
                              {isExecutingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>{"Appliquer par l'Agent"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center max-w-md mx-auto">
                      <Sparkles className="w-10 h-10 text-emerald-500 mx-auto opacity-40 mb-3 animate-bounce" />
                      <h4 className="text-white font-bold mb-1">{"Aucune suggestion active"}</h4>
                      <p className="text-xs text-gray-400">
                        {"Cliquez sur le bouton ci-dessus pour lancer une analyse approfondie de l'emploi du temps actuel par Gemini."}
                      </p>
                    </div>
                  )}
                </div>

                {/* CHIRURGICAL PROBLEM WRITER */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/50 to-indigo-950/15 border border-white/5 shadow-glass space-y-4">
                  <div>
                    <h3 className="text-md font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-4.5 h-4.5 text-indigo-400" />
                      {"Soumettre une contrainte complexe ou un problème spécifique"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {"Précisez une contrainte humaine compliquée ou un conflit que vous n'arrivez pas à résoudre civilement. L'Agent IA étudiera le planning et relocalisera activement les cours."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={problemQuery}
                      onChange={(e) => setProblemQuery(e.target.value)}
                      placeholder={
                        !currentPlan.features.geminiAI 
                          ? "Fonctionnalité d'analyse de contraintes IA verrouillée. Veuillez passer au plan Premium ou School."
                          : 'Exemple : "M. Diongue ne doit absolument pas travailler le vendredi après-midi, déplacez toutes ses sessions du vendredi vers des créneaux libres des autres jours sans enfreindre les autres contraintes."'
                      }
                      rows={3}
                      className="w-full bg-slate-900/20 bg-slate-950/45 border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                      disabled={isAnalyzingProblem || isExecutingAi || !currentPlan.features.geminiAI}
                    />

                    <div className="flex justify-end gap-3">
                      {problemQuery && (
                        <button
                          onClick={() => { setProblemQuery(''); setProblemAnalysis(''); }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold hover:-translate-y-0.5 transition-all cursor-pointer"
                          disabled={isAnalyzingProblem || isExecutingAi}
                        >
                          {"Effacer tout"}
                        </button>
                      )}
                      <button
                        onClick={handleAnalyzeProblem}
                        disabled={isAnalyzingProblem || isExecutingAi || (!problemQuery.trim() && currentPlan.features.geminiAI)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer ${
                          !currentPlan.features.geminiAI 
                            ? 'bg-slate-800 text-gray-500 border border-slate-700 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {!currentPlan.features.geminiAI ? (
                          <>
                            <Lock className="w-4 h-4 text-gray-500" />
                            <span>Résolution IA verrouillée (Upgrade requis)</span>
                          </>
                        ) : (
                          <>
                            {isAnalyzingProblem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            <span>{isAnalyzingProblem ? "Analyse de la faisabilité..." : "Diagnostiquer & Suggérer une solution"}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* SPECIFIC PROBLEM ANALYSIS DISCUSSION */}
                  {problemAnalysis && (
                    <div className="mt-4 p-5 rounded-xl bg-indigo-950/15 border border-indigo-500/10 space-y-4">
                      <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-2.5 font-mono text-[11px] uppercase text-indigo-400 tracking-wider">
                        <MessageSquare className="w-4 h-4" /> {"Rapport d'Évaluation & Stratégie d'Adaptation :"}
                      </div>
                      <div className="prose prose-invert max-w-none text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {problemAnalysis}
                      </div>

                      {!isAnalyzingProblem && !problemAnalysis.toLowerCase().includes("erreur") && (
                        <div className="pt-3.5 border-t border-indigo-500/10 flex flex-col sm:flex-row items-center justify-between bg-indigo-500/5 p-3.5 rounded-lg gap-3">
                          <div className="text-xs text-indigo-300 font-medium">
                            🚨 {"Voulez-vous déléguer la mise en œuvre et faire appliquer cette solution par l'Agent IA ?"}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setProblemAnalysis('')}
                              className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:bg-slate-800 text-gray-400 text-xs font-semibold cursor-pointer"
                              disabled={isExecutingAi}
                            >
                              {"Ignorer"}
                            </button>
                            <button
                              onClick={() => handleExecuteAi('solve-problem')}
                              disabled={isExecutingAi}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                            >
                              {isExecutingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              <span>{"Faire appliquer par l'Agent"}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: PARAMÈTRES & CONFIGURATION */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                
                {/* SETTINGS BANNER HEADER */}
                <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {"Paramètres Généraux & Configuration d'Établissement"}
                    </h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {"Personnalisez l'identité de votre établissement, l'apparence visuelle, vos clés d'abonnement SaaS, et gérez vos sauvegardes de données."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT COLUMN: SCHOOL IDENTITY & THEME (7 COLS) */}
                  <div className="lg:col-span-7 space-y-6">
                    
                    {/* SECTION 1: ÉTABLISSEMENT METADATA */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                          {"1. Identité de l'Établissement"}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            {"Nom de l'établissement d'enseignement"}
                          </label>
                          <input
                            type="text"
                            value={schoolName}
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="Ex: Lycée Excellence Diongue, Collège IziSchool"
                            className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            {"Devise / Slogan institutionnel"}
                          </label>
                          <input
                            type="text"
                            value={schoolSlogan}
                            onChange={(e) => setSchoolSlogan(e.target.value)}
                            placeholder="Ex: Discipline - Travail - Succès"
                            className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-300 mb-1.5">
                            {"Type d'embleme / Logo"}
                          </label>
                          <div className="flex gap-3 mb-3">
                            <button
                              type="button"
                              onClick={() => setSchoolLogoType('icon')}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                                schoolLogoType === 'icon'
                                  ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                  : 'bg-slate-950/50 border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              {"Icône Vectorielle"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!currentPlan.features.customBranding) {
                                  triggerNotification("L'importation de logo personnalisé par URL est disponible avec le Plan School.", "error");
                                  setIsClientSubModalOpen(true);
                                  return;
                                }
                                setSchoolLogoType('url');
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                schoolLogoType === 'url'
                                  ? 'bg-indigo-500/20 border-indigo-500 text-white'
                                  : 'bg-slate-950/50 border-white/10 text-gray-400 hover:text-white'
                              }`}
                            >
                              {!currentPlan.features.customBranding && <Lock className="w-3 h-3 text-amber-400" />}
                              {"URL d'image externe"}
                            </button>
                          </div>

                          {schoolLogoType === 'icon' ? (
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { name: 'GraduationCap', label: 'Cap' },
                                { name: 'Building2', label: 'Lycée' },
                                { name: 'BookOpen', label: 'Savoir' },
                                { name: 'Award', label: 'Excellence' },
                                { name: 'Shield', label: 'Blason' }
                              ].map((ic) => (
                                <button
                                  key={ic.name}
                                  type="button"
                                  onClick={() => setSchoolLogoIcon(ic.name)}
                                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                                    schoolLogoIcon === ic.name
                                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                                      : 'bg-slate-950/40 border-white/10 text-gray-400 hover:bg-white/5'
                                  }`}
                                >
                                  {ic.name === 'GraduationCap' && <GraduationCap className="w-5 h-5" />}
                                  {ic.name === 'Building2' && <Building2 className="w-5 h-5" />}
                                  {ic.name === 'BookOpen' && <BookOpen className="w-5 h-5" />}
                                  {ic.name === 'Award' && <Award className="w-5 h-5" />}
                                  {ic.name === 'Shield' && <Shield className="w-5 h-5" />}
                                  <span className="text-[10px] font-mono">{ic.label}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={schoolLogo}
                              onChange={(e) => setSchoolLogo(e.target.value)}
                              placeholder="https://domaine.com/logo.png"
                              className="w-full bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-inner font-mono text-xs"
                            />
                          )}
                        </div>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => showNotification("Informations de l'établissement sauvegardées avec succès !", "success")}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Enregistrer les En-têtes Officiels</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: THEME & APPARENCE */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                          {"2. Apparence Visuelle & Thème"}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setTheme('dark')}
                          className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                            theme === 'dark'
                              ? 'bg-slate-950 border-indigo-500 text-white ring-2 ring-indigo-500/50'
                              : 'bg-slate-950/40 border-white/10 text-gray-400 hover:bg-slate-950'
                          }`}
                        >
                          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Moon className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-white">{"Thème Sombre (Night)"}</div>
                            <div className="text-[10px] text-gray-400">{"Mode professionnel haute lisibilité"}</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTheme('light')}
                          className={`p-4 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                            theme === 'light'
                              ? 'bg-white border-indigo-500 text-slate-900 ring-2 ring-indigo-500/50'
                              : 'bg-slate-950/40 border-white/10 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500">
                            <Sun className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <div className={`text-xs font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{"Thème Clair (Day)"}</div>
                            <div className="text-[10px] text-gray-400">{"Fond lumineux haute clarté"}</div>
                          </div>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN: ABONNEMENT & BACKUP (5 COLS) */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* SECTION 3: ABONNEMENT & LICENCE SAAS */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-indigo-400" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                            {"3. Abonnement & Licences"}
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                          {currentClient.status === 'active' ? 'Actif' : 'Essai'}
                        </span>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Offre actuelle :</span>
                          <span className="font-bold text-indigo-400 font-mono text-sm">
                            {saasPlans.find(p => p.id === currentClient.planId)?.name || 'Plan Découverte'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{"Échéance d'abonnement :"}</span>
                          <span className="font-medium text-white font-mono">
                            {currentClient.subscriptionEndDate || 'Non définie'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{"Paiement / Mode :"}</span>
                          <span className="font-medium text-gray-300">
                            {currentClient.paymentMethod || 'Licence établissement'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsClientSubModalOpen(true)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>{"Gérer l'Abonnement / Activer Clé"}</span>
                        </button>
                      </div>
                    </div>

                    {/* SECTION 4: SAUVEGARDE & RESTAURATION */}
                    <div className="p-6 rounded-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                          {"4. Sauvegarde & Restauration"}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">
                        {"Exportez l'intégralité de la base de données de l'établissement (matières, profs, classes, emploi du temps) au format JSON sécurisé pour archivage ou migration."}
                      </p>

                      <div className="space-y-2.5 pt-1">
                        <button
                          type="button"
                          onClick={handleExportBackup}
                          className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>Exporter Sauvegarde (.json)</span>
                        </button>

                        <label className="w-full py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                          <RefreshCw className="w-4 h-4" />
                          <span>Restauration depuis JSON</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportBackup}
                            className="hidden"
                          />
                        </label>

                        <div className="pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={handleResetData}
                            className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                            <span>Réinitialiser aux données démo par défaut</span>
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </main>
        </div>
        </div>
        )}

        {/* --- CLIENT SUBSCRIPTION MODAL --- */}
        <ClientSubscriptionModal
          isOpen={isClientSubModalOpen}
          onClose={() => setIsClientSubModalOpen(false)}
          currentClient={currentClient}
          plans={saasPlans}
          licenseKeys={saasLicenseKeys}
          settings={saasSettings}
          generationCount={generationCount}
          maxGenerations={maxGenerations}
          exportCount={exportCount}
          maxExports={maxExports}
          onApplyLicenseKey={handleApplyLicenseKey}
          onSimulatePayment={handleSimulatePayment}
          onRequestUpgradeOrRenewal={handleCreateActivationRequest}
        />

        {/* --- ADMIN PIN VERIFICATION MODAL --- */}
        <AnimatePresence>
          {isAdminPinModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl space-y-5"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {"Accès Sécurisé Administrateur SaaS"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {"Veuillez vous authentifier pour accéder à la console globale SaaS."}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyAdminPin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                      {"Code PIN de sécurité Administrateur"}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        autoFocus
                        value={adminPinInput}
                        onChange={(e) => {
                          setAdminPinInput(e.target.value);
                          setAdminPinError('');
                        }}
                        placeholder="Entrez le code PIN (ex: 1234)"
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 transition-colors font-mono tracking-widest"
                      />
                      <Lock className="w-4 h-4 text-gray-500 absolute right-3.5 top-3" />
                    </div>
                    {adminPinError ? (
                      <p className="text-xs text-rose-400 mt-2 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {adminPinError}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-500 mt-2 font-mono">
                        {"Code PIN Administrateur par défaut : "}
                        <strong className="text-purple-400">1234</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminPinModalOpen(false);
                        setAdminPinInput('');
                        setAdminPinError('');
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      {"Annuler"}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{"Déverrouiller et Accéder"}</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL GRAPHIQUE GLOBAL & DÉTAILS EXPLIQUÉS POUR LE CHEF */}
        <ChefAnalyticsDetailModal
          isOpen={chefDetailModalType !== null}
          onClose={() => setChefDetailModalType(null)}
          chartType={chefDetailModalType || 'teachers'}
          teachers={teachers}
          classes={classes}
          subjects={subjects}
          timetable={timetable}
          activeDays={activeDays}
          totalSlots={totalSlots}
          schoolName={schoolName}
          theme={theme}
          clientPlanId={currentClient.planId}
          onUpgrade={() => {
            setChefDetailModalType(null);
            setIsClientSubModalOpen(true);
          }}
        />

        {/* DOCUMENTATION INTERACTIVE PLEIN ÉCRAN */}
        <DocumentationView
          isOpen={isDocViewOpen}
          onClose={() => setIsDocViewOpen(false)}
          onOpenSubscribe={() => {
            setIsDocViewOpen(false);
            setIsClientSubModalOpen(true);
          }}
        />

      </div>
    </div>
  );
}
