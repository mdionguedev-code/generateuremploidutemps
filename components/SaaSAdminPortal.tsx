'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Users,
  CreditCard,
  Key,
  TrendingUp,
  DollarSign,
  Calendar,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Copy,
  Check,
  Shield,
  Layers,
  FileText,
  Send,
  Radio,
  Settings,
  Phone,
  Mail,
  RefreshCw,
  Zap,
  Globe,
  Award,
  BookOpen,
  GraduationCap,
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Smartphone,
  Link2,
  Maximize2,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import {
  dbAdminCreateClientUser,
  dbAdminResetUserPassword,
  dbAdminGenerateLicenseKeys,
  dbUserUpdatePassword
} from '@/lib/supabase/dbService';

const generateDefaultPassword = () => {
  const digits = '23456789';
  const symbols = '!@#$*';
  let p = 'IziSchool2026';
  for (let i = 0; i < 3; i++) {
    p += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  p += symbols.charAt(Math.floor(Math.random() * symbols.length));
  return p;
};

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

import {
  SaaSPlan,
  SaaSClient,
  SaaSLicenseKey,
  SaaSPaymentTransaction,
  SaaSGlobalSettings,
  SubscriptionStatus,
  PaymentMethod,
  SaaSActivationRequest
} from '@/lib/saasTypes';

interface SaaSAdminPortalProps {
  plans: SaaSPlan[];
  clients: SaaSClient[];
  licenseKeys: SaaSLicenseKey[];
  transactions: SaaSPaymentTransaction[];
  settings: SaaSGlobalSettings;
  activationRequests?: SaaSActivationRequest[];
  onUpdateClients: (clients: SaaSClient[]) => void;
  onUpdatePlans: (plans: SaaSPlan[]) => void;
  onUpdateLicenseKeys: (keys: SaaSLicenseKey[]) => void;
  onUpdateTransactions: (txs: SaaSPaymentTransaction[]) => void;
  onUpdateSettings: (settings: SaaSGlobalSettings) => void;
  onUpdateActivationRequests?: (requests: SaaSActivationRequest[]) => void;
  onValidateAndDeliverRequest?: (requestId: string, deliveryType?: 'whatsapp' | 'email') => void;
  onSwitchToClientView: (client: SaaSClient) => void;
  theme: 'dark' | 'light';
}

export default function SaaSAdminPortal({
  plans,
  clients,
  licenseKeys,
  transactions,
  settings,
  activationRequests = [],
  onUpdateClients,
  onUpdatePlans,
  onUpdateLicenseKeys,
  onUpdateTransactions,
  onUpdateSettings,
  onUpdateActivationRequests,
  onValidateAndDeliverRequest,
  onSwitchToClientView,
  theme
}: SaaSAdminPortalProps) {
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'requests' | 'clients' | 'plans' | 'licenses' | 'invoices' | 'settings'>('overview');

  // Requests Search & Filters
  const [requestSearch, setRequestSearch] = useState('');
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>('all');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');

  // Client Search & Filters
  const [clientSearch, setClientSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  // Modals state
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SaaSClient | null>(null);
  const [editingPlanModal, setEditingPlanModal] = useState<SaaSPlan | null>(null);
  const [isGenerateKeyModalOpen, setIsGenerateKeyModalOpen] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSPaymentTransaction | null>(null);
  const [waveSaveSuccess, setWaveSaveSuccess] = useState(false);
  const [adminDetailModal, setAdminDetailModal] = useState<'mrr' | 'plans' | null>(null);

  // New client form state
  const [showDefaultPassword, setShowDefaultPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState<string | null>(null);
  const [createdClientSuccess, setCreatedClientSuccess] = useState<{ email: string; password: string; schoolName: string } | null>(null);

  // Admin User Password Reset Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordClient, setResetPasswordClient] = useState<SaaSClient | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [copiedResetCreds, setCopiedResetCreds] = useState(false);

  const handleOpenResetPasswordModal = (client: SaaSClient) => {
    setResetPasswordClient(client);
    setResetPasswordInput(generateDefaultPassword());
    setShowResetPassword(false);
    setResetPasswordError(null);
    setResetPasswordSuccess(null);
    setCopiedResetCreds(false);
    setIsResetPasswordModalOpen(true);
  };

  const handlePerformResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordClient) return;

    if (resetPasswordInput.trim().length < 6) {
      setResetPasswordError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    setIsResettingPassword(true);
    setResetPasswordError(null);

    try {
      const res = await dbAdminResetUserPassword(resetPasswordClient.id, resetPasswordInput.trim());
      if (res.success) {
        setResetPasswordSuccess(`Mot de passe réinitialisé avec succès pour ${resetPasswordClient.schoolName} (${resetPasswordClient.adminEmail}) !`);
      } else {
        setResetPasswordError(res.message);
      }
    } catch (err: any) {
      setResetPasswordError("Erreur lors de la réinitialisation du mot de passe.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Super-Admin Personal Password Change State & Handler
  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);
  const [isAdminUpdatingPassword, setIsAdminUpdatingPassword] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState<string | null>(null);

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPasswordError(null);
    setAdminPasswordSuccess(null);

    if (adminNewPassword.trim().length < 6) {
      setAdminPasswordError("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (adminNewPassword.trim() !== adminConfirmPassword.trim()) {
      setAdminPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setIsAdminUpdatingPassword(true);
    try {
      const res = await dbUserUpdatePassword(adminNewPassword.trim());
      if (res.success) {
        setAdminPasswordSuccess("Votre mot de passe Administrateur a été mis à jour avec succès !");
        setAdminNewPassword('');
        setAdminConfirmPassword('');
      } else {
        setAdminPasswordError(res.message);
      }
    } catch (err: any) {
      setAdminPasswordError("Erreur lors de la mise à jour du mot de passe.");
    } finally {
      setIsAdminUpdatingPassword(false);
    }
  };

  const [newClientForm, setNewClientForm] = useState({
    schoolName: '',
    logoIcon: 'GraduationCap',
    adminName: '',
    adminEmail: '',
    password: generateDefaultPassword(),
    phone: '',
    whatsapp: '',
    cityCountry: 'Dakar, Sénégal',
    planId: 'plan_standard',
    status: 'active' as SubscriptionStatus,
    durationMonths: 1,
    paymentMethod: 'Orange Money' as PaymentMethod,
    amountFCFA: 10000,
    notes: ''
  });

  // New key generator form state
  const [newKeyForm, setNewKeyForm] = useState({
    planId: 'plan_standard',
    durationDays: 30,
    quantity: 1
  });

  // Calculate SaaS Financial & Operational Metrics
  const metrics = useMemo(() => {
    let mrrFCFA = 0;
    let totalRevenueFCFA = 0;
    let activeClients = 0;
    let trialClients = 0;
    let suspendedClients = 0;
    let expiredClients = 0;

    clients.forEach(client => {
      if (client.status === 'active') {
        activeClients++;
        const plan = plans.find(p => p.id === client.planId);
        if (plan) {
          mrrFCFA += plan.monthlyPriceFCFA;
        }
      } else if (client.status === 'trial') {
        trialClients++;
      } else if (client.status === 'suspended') {
        suspendedClients++;
      } else if (client.status === 'expired') {
        expiredClients++;
      }

      totalRevenueFCFA += client.totalPaidFCFA || 0;
    });

    const arrFCFA = mrrFCFA * 12;
    const totalClientsCount = clients.length || 1;
    const churnRatePercent = Math.round((expiredClients / totalClientsCount) * 100);

    return {
      mrrFCFA,
      mrrEUR: Math.round(mrrFCFA / 655.957),
      arrFCFA,
      arrEUR: Math.round(arrFCFA / 655.957),
      totalRevenueFCFA,
      totalRevenueEUR: Math.round(totalRevenueFCFA / 655.957),
      activeClients,
      trialClients,
      suspendedClients,
      expiredClients,
      churnRatePercent
    };
  }, [clients, plans]);

  // Revenue chart data simulation
  const revenueChartData = useMemo(() => [
    { month: 'Déc 25', Revenue: 480000, Clients: 3 },
    { month: 'Jan 26', Revenue: 720000, Clients: 4 },
    { month: 'Fév 26', Revenue: 960000, Clients: 5 },
    { month: 'Mar 26', Revenue: 1200000, Clients: 5 },
    { month: 'Avr 26', Revenue: 1440000, Clients: 6 },
    { month: 'Mai 26', Revenue: 1760000, Clients: clients.length }
  ], [clients.length]);

  // Plan distribution chart data
  const planDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    clients.forEach(c => {
      const plan = plans.find(p => p.id === c.planId);
      const name = plan ? plan.name : 'Autre';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [clients, plans]);

  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Memoized Pending Requests and Filtered Requests
  const pendingRequestsCount = useMemo(() => {
    return (activationRequests || []).filter(r => r.status === 'pending').length;
  }, [activationRequests]);

  const deliveredRequestsCount = useMemo(() => {
    return (activationRequests || []).filter(r => r.status === 'delivered').length;
  }, [activationRequests]);

  const totalRequestsAmount = useMemo(() => {
    return (activationRequests || []).reduce((sum, r) => sum + (r.amountFCFA || 0), 0);
  }, [activationRequests]);

  const filteredRequests = useMemo(() => {
    return (activationRequests || []).filter(r => {
      const matchSearch =
        r.schoolName.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.adminEmail.toLowerCase().includes(requestSearch.toLowerCase()) ||
        r.whatsapp.includes(requestSearch) ||
        (r.adminName && r.adminName.toLowerCase().includes(requestSearch.toLowerCase()));
      const matchType = requestTypeFilter === 'all' || r.type === requestTypeFilter;
      const matchStatus = requestStatusFilter === 'all' || r.status === requestStatusFilter;
      return matchSearch && matchType && matchStatus;
    });
  }, [activationRequests, requestSearch, requestTypeFilter, requestStatusFilter]);

  // Memoized Filtered Clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch =
        c.schoolName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.adminName.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.adminEmail.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.cityCountry.toLowerCase().includes(clientSearch.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesPlan = planFilter === 'all' || c.planId === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [clients, clientSearch, statusFilter, planFilter]);

  // Handlers for Add/Edit Client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateClientError(null);
    setIsCreatingClient(true);

    try {
      const selectedPlan = plans.find(p => p.id === newClientForm.planId);
      const res = await dbAdminCreateClientUser({
        email: newClientForm.adminEmail.trim(),
        password: newClientForm.password.trim(),
        schoolName: newClientForm.schoolName.trim(),
        adminName: newClientForm.adminName.trim(),
        phone: newClientForm.phone.trim(),
        cityCountry: newClientForm.cityCountry.trim(),
        planId: newClientForm.planId,
        status: newClientForm.status,
        durationMonths: Number(newClientForm.durationMonths),
        paymentMethod: newClientForm.paymentMethod,
        amountFCFA: Number(newClientForm.amountFCFA),
        notes: newClientForm.notes
      });

      if (!res.success || !res.client) {
        setCreateClientError(res.message);
        setIsCreatingClient(false);
        return;
      }

      onUpdateClients([res.client, ...clients]);

      // Record Transaction if paid
      if (newClientForm.amountFCFA > 0) {
        const newTx: SaaSPaymentTransaction = {
          id: `tx_${Date.now()}`,
          invoiceRef: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          clientId: res.client.id,
          clientName: res.client.schoolName,
          amountFCFA: Number(newClientForm.amountFCFA),
          amountEUR: Math.round(Number(newClientForm.amountFCFA) / 655.957),
          paymentMethod: newClientForm.paymentMethod,
          status: 'completed',
          date: new Date().toISOString().split('T')[0],
          planName: selectedPlan?.name || 'Abonnement',
          period: `${newClientForm.durationMonths} mois`
        };
        onUpdateTransactions([newTx, ...transactions]);
      }

      setCreatedClientSuccess({
        email: newClientForm.adminEmail.trim(),
        password: newClientForm.password.trim(),
        schoolName: newClientForm.schoolName.trim()
      });

      setNewClientForm({
        schoolName: '',
        logoIcon: 'GraduationCap',
        adminName: '',
        adminEmail: '',
        password: generateDefaultPassword(),
        phone: '',
        whatsapp: '',
        cityCountry: 'Dakar, Sénégal',
        planId: 'plan_standard',
        status: 'active',
        durationMonths: 1,
        paymentMethod: 'Orange Money',
        amountFCFA: 10000,
        notes: ''
      });
    } catch (err: any) {
      setCreateClientError("Erreur inattendue lors de la création du compte.");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleSaveEditedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const updated = clients.map(c => c.id === editingClient.id ? editingClient : c);
    onUpdateClients(updated);
    setEditingClient(null);
  };

  const handleToggleClientStatus = (clientId: string, newStatus: SubscriptionStatus) => {
    const updated = clients.map(c => {
      if (c.id === clientId) {
        return { ...c, status: newStatus };
      }
      return c;
    });
    onUpdateClients(updated);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet établissement du SaaS ?")) {
      onUpdateClients(clients.filter(c => c.id !== clientId));
    }
  };

  const handleSendActivationKey = (client: SaaSClient, type: 'whatsapp' | 'email') => {
    let keyToSend = client.licenseKey;
    let updatedClients = [...clients];
    let updatedKeys = [...licenseKeys];
    let keyWasAssignedOrGenerated = false;

    if (!keyToSend) {
      const unusedKeyIndex = licenseKeys.findIndex(k => k.planId === client.planId && k.status === 'unused');
      const nowStr = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();

      if (unusedKeyIndex !== -1) {
        const foundKeyObj = licenseKeys[unusedKeyIndex];
        keyToSend = foundKeyObj.key;
      } else {
        const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let uniqueKeyStr = '';
        let attempts = 0;
        const existingKeysSet = new Set(licenseKeys.map(k => k.key.toUpperCase().trim()));
        const targetPlan = plans.find(p => p.id === client.planId);

        do {
          let block1 = '';
          let block2 = '';
          for (let b = 0; b < 4; b++) {
            block1 += charset.charAt(Math.floor(Math.random() * charset.length));
            block2 += charset.charAt(Math.floor(Math.random() * charset.length));
          }
          uniqueKeyStr = `SCH-${targetPlan?.code || 'KEY'}-${year}-${block1}-${block2}`;
          attempts++;
        } while (existingKeysSet.has(uniqueKeyStr) && attempts < 100);

        keyToSend = uniqueKeyStr;

        const newKeyObj: SaaSLicenseKey = {
          id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          key: uniqueKeyStr,
          planId: client.planId,
          durationDays: 365,
          generatedAt: nowStr,
          status: 'unused' // Must remain 'unused' until the client enters it!
        };

        updatedKeys = [newKeyObj, ...licenseKeys];
        keyWasAssignedOrGenerated = true;
      }

      updatedClients = clients.map(c => c.id === client.id ? {
        ...c,
        status: 'pending_key' as const,
        notes: (c.notes || '') + `\n[System] Clé ${keyToSend} transmise le ${nowStr}. En attente d'activation par l'école.`
      } : c);
    }

    if (keyWasAssignedOrGenerated) {
      onUpdateClients(updatedClients);
      onUpdateLicenseKeys(updatedKeys);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('saas_clients', JSON.stringify(updatedClients));
        localStorage.setItem('saas_keys', JSON.stringify(updatedKeys));
      }
    }

    const targetPlan = plans.find(p => p.id === client.planId);
    const planName = targetPlan?.name || 'Abonnement';
    const messageText = `Bonjour ! Voici votre clé d'activation Planora pour l'établissement "${client.schoolName}" (${planName}) : ${keyToSend}. Pour débloquer votre formule, connectez-vous sur votre Espace Établissement et renseignez cette clé dans la section "Activer ma clé de licence".`;

    if (type === 'whatsapp') {
      const cleanPhone = (client.whatsapp || client.phone || '').replace(/[^0-9]/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
    } else {
      const emailSubject = `Votre clé d'activation Planora - ${client.schoolName}`;
      const mailUrl = `mailto:${client.adminEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageText)}`;
      window.open(mailUrl, '_blank');
    }
  };

  // Generate unique, collision-free license keys with high entropy and save to database
  const handleGenerateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPlan = plans.find(p => p.id === newKeyForm.planId);
    const count = Math.min(Math.max(1, Number(newKeyForm.quantity)), 20);
    const newKeysList: SaaSLicenseKey[] = [];
    const now = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();

    // High entropy alphabet excluding ambiguous characters (0, O, 1, I)
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const existingKeysSet = new Set(licenseKeys.map(k => k.key.toUpperCase().trim()));

    for (let i = 0; i < count; i++) {
      let uniqueKeyStr = '';
      let attempts = 0;
      
      // Ensure absolute uniqueness
      do {
        let block1 = '';
        let block2 = '';
        for (let b = 0; b < 4; b++) {
          block1 += charset.charAt(Math.floor(Math.random() * charset.length));
          block2 += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        uniqueKeyStr = `SCH-${selectedPlan?.code || 'KEY'}-${year}-${block1}-${block2}`;
        attempts++;
      } while (existingKeysSet.has(uniqueKeyStr) && attempts < 100);

      existingKeysSet.add(uniqueKeyStr);

      newKeysList.push({
        id: `key_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
        key: uniqueKeyStr,
        planId: newKeyForm.planId,
        durationDays: Number(newKeyForm.durationDays),
        generatedAt: now,
        status: 'unused'
      });
    }

    // Save permanently in database
    const keysToInsert = newKeysList.map(k => k.key);
    await dbAdminGenerateLicenseKeys(newKeyForm.planId, Number(newKeyForm.durationDays), keysToInsert);

    onUpdateLicenseKeys([...newKeysList, ...licenseKeys]);
    setIsGenerateKeyModalOpen(false);
  };

  const handleCopyKey = (keyStr: string, keyId: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleRevokeKey = (keyId: string) => {
    const updated = licenseKeys.map(k => k.id === keyId ? { ...k, status: 'revoked' as const } : k);
    onUpdateLicenseKeys(updated);
  };

  // Render Status Badge
  const renderStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
          </span>
        );
      case 'trial':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> En Essai
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Suspendu
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20">
            <XCircle className="w-3.5 h-3.5" /> Expiré
          </span>
        );
      case 'pending_key':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Attente Clé
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">

      {/* --- SAAS ADMIN HEADER BANNER --- */}
      <div className={`p-6 rounded-2xl border shadow-xl relative overflow-hidden transition-all ${
        theme === 'light'
          ? 'bg-white border-slate-200/90 shadow-slate-200/50'
          : 'bg-slate-900 border-white/10 shadow-2xl'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3.5 mb-2">
              <span className={`p-3 rounded-2xl border flex items-center justify-center shrink-0 ${
                theme === 'light'
                  ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm'
                  : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
              }`}>
                <Shield className="w-6 h-6" />
              </span>
              <div>
                <h2 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>
                  <span>Espace Administration SaaS</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                    theme === 'light'
                      ? 'bg-purple-100/80 text-purple-700 border-purple-200'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                    Super-Admin Portal
                  </span>
                </h2>
                <p className={`text-xs mt-0.5 ${
                  theme === 'light' ? 'text-slate-600 font-medium' : 'text-gray-400'
                }`}>
                  Gestion centralisée des abonnements, comptes clients, revenus MRR, licences et offres SaaS.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsAddClientModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Client Établissement</span>
            </button>
            <button
              type="button"
              onClick={() => setIsGenerateKeyModalOpen(true)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-gray-200 border-white/10'
              }`}
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Générer des Clés de Licence</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminPasswordError(null);
                setAdminPasswordSuccess(null);
                setAdminNewPassword('');
                setAdminConfirmPassword('');
                setIsAdminPasswordModalOpen(true);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                theme === 'light'
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
                  : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30'
              }`}
            >
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>Mon Mot de Passe</span>
            </button>
          </div>
        </div>

        {/* ADMIN NAVIGATION SUB-TABS */}
        <div className={`flex items-center gap-2 mt-6 pt-5 border-t overflow-x-auto scrollbar-none ${
          theme === 'light' ? 'border-slate-200' : 'border-white/10'
        }`}>
          {[
            { id: 'overview', label: "Vue d'Ensemble & Métriques", icon: TrendingUp },
            { 
              id: 'requests', 
              label: `Demandes d'Activation (${pendingRequestsCount})`, 
              icon: Sparkles,
              badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined
            },
            { id: 'clients', label: `Clients & Établissements (${clients.length})`, icon: Building2 },
            { id: 'plans', label: `Offres & Tarification (${plans.length})`, icon: Layers },
            { id: 'licenses', label: `Clés de Licence (${licenseKeys.length})`, icon: Key },
            { id: 'invoices', label: `Paiements & Factures (${transactions.length})`, icon: CreditCard },
            { id: 'settings', label: "Configuration SaaS", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = adminSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdminSubTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                  isActive
                    ? theme === 'light'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                      : 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/30'
                    : theme === 'light'
                      ? 'bg-slate-50 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                      : 'bg-slate-950/40 text-gray-400 hover:text-white hover:bg-white/5 border-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: OVERVIEW & SAAS METRICS DASHBOARD              */}
      {/* ========================================================= */}
      {adminSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* TOP SAAS FINANCIAL KPIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: MRR */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">MRR (Mensuel)</span>
                <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {metrics.mrrFCFA.toLocaleString('fr-FR')} <span className="text-xs text-indigo-400 font-normal">FCFA/mois</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                  <span>~ {metrics.mrrEUR} € / mois</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
                    <ArrowUpRight className="w-3 h-3" /> +18%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 2: ARR */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">ARR (Projection Annuelle)</span>
                <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {metrics.arrFCFA.toLocaleString('fr-FR')} <span className="text-xs text-purple-400 font-normal">FCFA/an</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                  <span>~ {metrics.arrEUR} € / an</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
                    <ArrowUpRight className="w-3 h-3" /> +24%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 3: CLIENTS ACTIFS & ESSAIS */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Clients Établissements</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {metrics.activeClients} <span className="text-xs text-emerald-400 font-normal">Actifs</span>
                  <span className="text-sm font-normal text-amber-400 ml-2">({metrics.trialClients} en essai)</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                  <span>Total Répertoire: {clients.length}</span>
                  <span className="text-amber-400 font-bold text-[10px]">
                    Taux conversion: ~65%
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 4: REVENUS TOTAUX ENCAISSÉS */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Volume Encaissé Total</span>
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-extrabold text-white font-mono">
                  {metrics.totalRevenueFCFA.toLocaleString('fr-FR')} <span className="text-xs text-amber-400 font-normal">FCFA</span>
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center justify-between">
                  <span>~ {metrics.totalRevenueEUR} € cumulés</span>
                  <span className="text-gray-400 text-[10px]">
                    Churn: {metrics.churnRatePercent}%
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* CHART 1: REVENUE & CLIENT GROWTH */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    Évolution du Revenu Mensuel Récurrent (MRR)
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Croissance du chiffre d&apos;affaires mensuel et nombre de comptes clients actifs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminDetailModal('mrr')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    title="Voir les détails complets et projections financières"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>PLUS DE DÉTAILS</span>
                  </button>
                  <span className="text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full hidden sm:inline-block">
                    6 Derniers Mois
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      formatter={(val: any) => [`${Number(val).toLocaleString('fr-FR')} FCFA`, 'Chiffre d\'affaires']}
                    />
                    <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CHART 2: PLAN DISTRIBUTION */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    Répartition par Offre
                  </h3>
                  <button
                    type="button"
                    onClick={() => setAdminDetailModal('plans')}
                    className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Voir les détails et répartition de chaque abonnement"
                  >
                    <Maximize2 className="w-3 h-3 text-purple-400" />
                    <span>PLUS DE DÉTAILS</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Pourcentage de clients souscrits par type d&apos;abonnement.
                </p>

                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                {planDistributionData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-300">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      {item.name}
                    </span>
                    <span className="font-mono text-white font-bold">{item.value} client(s)</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RECENT SAAS ACTIVITY & QUICK CLIENT OVERVIEW */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-400" />
                Dernières Activités & Souscriptions Clients
              </h3>
              <button
                onClick={() => setAdminSubTab('clients')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
              >
                Voir tous les clients ({clients.length}) <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-white/5">
              {clients.slice(0, 4).map(client => {
                const plan = plans.find(p => p.id === client.planId);
                return (
                  <div key={client.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {client.schoolName}
                          {renderStatusBadge(client.status)}
                        </h4>
                        <p className="text-xs text-gray-400">
                          Admin: {client.adminName} ({client.adminEmail}) • {client.cityCountry}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-xs font-mono">
                      <div>
                        <span className="block text-gray-500 text-[10px] uppercase">Offre</span>
                        <span className="text-indigo-300 font-bold">{plan?.name || client.planId}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-[10px] uppercase">Paiement</span>
                        <span className="text-white font-bold">{client.paymentMethod}</span>
                      </div>
                      <button
                        onClick={() => onSwitchToClientView(client)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        title="Simuler et ouvrir le compte de cet établissement"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ouvrir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 1.5: ACTIVATION & UPGRADE REQUESTS MANAGER        */}
      {/* ========================================================= */}
      {adminSubTab === 'requests' && (
        <div className="space-y-6">

          {/* REQUESTS METRICS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Total Demandes</span>
                <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">{activationRequests.length}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Toutes opérations confondues</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-amber-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">En Attente de Clé</span>
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Clock className="w-4 h-4 animate-pulse" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-400 font-mono">{pendingRequestsCount}</div>
                <div className="text-[11px] text-amber-200/70 mt-0.5">Paiements Wave à vérifier</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-wider">Clés Livrées &amp; Inscrits</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-400 font-mono">{deliveredRequestsCount}</div>
                <div className="text-[11px] text-emerald-200/70 mt-0.5">Actifs dans la liste des écoles</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 font-bold uppercase tracking-wider">Volume Financier</span>
                <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <CreditCard className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono">
                  {totalRequestsAmount.toLocaleString('fr-FR')} <span className="text-xs text-purple-400 font-normal">FCFA</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">Montant cumulé des commandes</div>
              </div>
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par école, responsable, email, WhatsApp..."
                value={requestSearch}
                onChange={e => setRequestSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={requestTypeFilter}
                  onChange={e => setRequestTypeFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">Tous les types de demande</option>
                  <option value="new_activation">✨ Nouvelles activations</option>
                  <option value="upgrade">🚀 Mises à niveau</option>
                  <option value="renewal">🔄 Renouvellements</option>
                </select>
              </div>

              <select
                value={requestStatusFilter}
                onChange={e => setRequestStatusFilter(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">⏳ En attente ({pendingRequestsCount})</option>
                <option value="delivered">✅ Clé Livrée ({deliveredRequestsCount})</option>
              </select>
            </div>
          </div>

          {/* REQUESTS TABLE */}
          <div className="rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-gray-400 font-mono text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Établissement &amp; Type</th>
                    <th className="p-4">Contact Client</th>
                    <th className="p-4">Forfait &amp; Montant</th>
                    <th className="p-4">Date / Heure</th>
                    <th className="p-4">Statut &amp; Clé</th>
                    <th className="p-4 text-right">Actions de Livraison &amp; Inscription</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                        Aucune demande d'activation ne correspond aux critères.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map(req => {
                      const plan = plans.find(p => p.id === req.planId);
                      const isPending = req.status === 'pending';

                      return (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                                <Building2 className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="block font-bold text-white text-sm">{req.schoolName}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  {req.type === 'new_activation' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      ✨ Nouvelle Activation
                                    </span>
                                  ) : req.type === 'upgrade' ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      🚀 Mise à niveau
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                      🔄 Renouvellement
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-[11px]">
                                    {req.adminName || 'Admin'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-gray-300 text-[11px]">
                                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="font-mono">{req.adminEmail}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-mono">{req.whatsapp}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-white font-extrabold text-xs">
                              {plan?.name || req.planId}
                            </span>
                            <span className="block text-indigo-300 text-[11px] font-bold mt-0.5">
                              {req.amountFCFA.toLocaleString('fr-FR')} FCFA • {req.durationMonths} mois
                            </span>
                            <span className="inline-block text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 mt-1">
                              Paiement {req.paymentMethod}
                            </span>
                          </td>

                          <td className="p-4 text-gray-400 font-mono text-[11px]">
                            <span className="block text-white">{req.requestedAt}</span>
                            {req.deliveredAt && (
                              <span className="block text-emerald-400 text-[10px] mt-0.5">
                                Livrée le : {req.deliveredAt}
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-3.5 h-3.5 animate-pulse" /> En Attente
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="w-3 h-3" /> Clé Livrée
                                </span>
                                {req.assignedKey && (
                                  <div className="flex items-center gap-1 text-[10px] font-mono text-gray-300">
                                    <code className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/20 truncate max-w-[140px]">
                                      {req.assignedKey}
                                    </code>
                                    <button
                                      onClick={() => handleCopyKey(req.assignedKey!, req.id)}
                                      className="p-1 hover:text-white transition-colors cursor-pointer"
                                      title="Copier la clé"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* ACTION 1: WHATSAPP DIRECT DELIVERY */}
                              <button
                                onClick={() => onValidateAndDeliverRequest?.(req.id, 'whatsapp')}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                title="Valider, inscrire et envoyer la clé par WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>WhatsApp</span>
                              </button>

                              {/* ACTION 2: EMAIL DIRECT DELIVERY */}
                              <button
                                onClick={() => onValidateAndDeliverRequest?.(req.id, 'email')}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                                title="Valider, inscrire et envoyer la clé par Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                <span>Email</span>
                              </button>

                              {/* ACTION 3: DIRECT VALIDATION & REGISTRATION */}
                              {isPending && (
                                <button
                                  onClick={() => onValidateAndDeliverRequest?.(req.id)}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                                  title="Valider la commande et inscrire directement l'école dans la liste des établissements"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Valider &amp; Inscrire</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: CLIENTS & SCHOOLS MANAGER                      */}
      {/* ========================================================= */}
      {adminSubTab === 'clients' && (
        <div className="space-y-6">
          
          {/* SEARCH & FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par nom d'établissement, directeur, email, ville..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-400">Statut:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Tous les Statuts</option>
                  <option value="active">Actifs uniquement</option>
                  <option value="trial">En Essai uniquement</option>
                  <option value="suspended">Suspendus</option>
                  <option value="expired">Expirés</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Offre:</span>
                <select
                  value={planFilter}
                  onChange={e => setPlanFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">Toutes les Offres</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

          </div>

          {/* CLIENTS TABLE */}
          <div className="rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-gray-400 font-mono text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Établissement & Contact</th>
                    <th className="p-4">Offre & Statut</th>
                    <th className="p-4">Expiration / Renouvellement</th>
                    <th className="p-4">Payé / Mode</th>
                    <th className="p-4">Clé Licence</th>
                    <th className="p-4 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                        Aucun établissement ne correspond aux critères de recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map(client => {
                      const plan = plans.find(p => p.id === client.planId);
                      return (
                        <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                <Building2 className="w-4 h-4" />
                              </span>
                              <div>
                                <span className="block font-bold text-white text-sm">{client.schoolName}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-gray-400 text-[11px] truncate max-w-[150px]">
                                    {client.adminName} • {client.adminEmail}
                                  </span>
                                  <button
                                    onClick={() => handleSendActivationKey(client, 'email')}
                                    className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                                    title="Envoyer la clé par Email"
                                  >
                                    <Mail className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-gray-500 text-[10px] font-mono">
                                    {client.whatsapp || client.phone} • {client.cityCountry}
                                  </span>
                                  <button
                                    onClick={() => handleSendActivationKey(client, 'whatsapp')}
                                    className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                    title="Envoyer la clé par WhatsApp"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-indigo-300 font-bold mb-1">{plan?.name || client.planId}</span>
                            {renderStatusBadge(client.status)}
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-white font-bold">{client.subscriptionEndDate}</span>
                            <span className="block text-gray-500 text-[10px]">
                              Début: {client.startDate}
                            </span>
                          </td>

                          <td className="p-4 font-mono">
                            <span className="block text-emerald-400 font-bold">
                              {client.totalPaidFCFA.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="block text-gray-400 text-[10px]">
                              Via {client.paymentMethod}
                            </span>
                          </td>

                          <td className="p-4 font-mono text-[11px]">
                            {client.licenseKey ? (
                              <button
                                onClick={() => handleCopyKey(client.licenseKey!, client.id)}
                                className="px-2 py-1 rounded bg-slate-950 border border-white/10 text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                title="Cliquer pour copier la clé"
                              >
                                {copiedKeyId === client.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Key className="w-3 h-3 text-amber-400" />}
                                {client.licenseKey.substring(0, 14)}...
                              </button>
                            ) : (
                              <span className="text-gray-600 font-sans italic">Aucune clé</span>
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Client View */}
                              <button
                                onClick={() => onSwitchToClientView(client)}
                                className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all"
                                title="Se connecter / Ouvrir la vue de cet établissement"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Edit Client */}
                              <button
                                onClick={() => setEditingClient(client)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all cursor-pointer"
                                title="Modifier les paramètres du client"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Reset User Password */}
                              <button
                                onClick={() => handleOpenResetPasswordModal(client)}
                                className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all cursor-pointer"
                                title="Réinitialiser le mot de passe de l'utilisateur"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Suspend / Reactivate Toggle */}
                              {client.status === 'active' ? (
                                <button
                                  onClick={() => handleToggleClientStatus(client.id, 'suspended')}
                                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all"
                                  title="Suspendre temporairement l'accès"
                                >
                                  <Lock className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleClientStatus(client.id, 'active')}
                                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                                  title="Réactiver l'accès client"
                                >
                                  <Unlock className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteClient(client.id)}
                                className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                                title="Supprimer le client"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: SAAS SUBSCRIPTION PLANS & PRICING MANAGER       */}
      {/* ========================================================= */}
      {adminSubTab === 'plans' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Grille des Offres &amp; Formules d&apos;Abonnement SaaS
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Configurez les fonctionnalités autorisées, quotas de classes/enseignants et tarifs par formule.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between relative transition-all ${
                  plan.popular
                    ? 'bg-slate-900/80 border-indigo-500/50 shadow-2xl shadow-indigo-500/10'
                    : 'bg-slate-900/40 border-white/10'
                }`}
              >
                {plan.badgeText && (
                  <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono tracking-wider bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
                    {plan.badgeText}
                  </span>
                )}

                <div>
                  <div className="mb-4">
                    <h4 className="text-lg font-black text-white">{plan.name}</h4>
                    <p className="text-xs text-gray-400 mt-1 min-h-[36px]">{plan.description}</p>
                  </div>

                  {/* PRICING */}
                  <div className="my-6 p-4 rounded-xl bg-slate-950/60 border border-white/5 font-mono">
                    <div className="text-2xl font-black text-white">
                      {plan.monthlyPriceFCFA === 0 ? 'Gratuit' : `${plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA`}
                      {plan.monthlyPriceFCFA > 0 && <span className="text-xs font-normal text-gray-400"> / mois</span>}
                    </div>
                  </div>

                  {/* WAVE PAYMENT LINK EDIT & PREVIEW */}
                  <div className="mb-6 p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-300 flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                        Lien de Paiement Wave ({plan.name})
                      </span>
                      {plan.wavePaymentUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(plan.wavePaymentUrl, '_blank')}
                          className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-mono font-bold hover:underline cursor-pointer"
                        >
                          Tester Lien
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={plan.wavePaymentUrl || ''}
                      onChange={e => {
                        const updated = plans.map(p => p.id === plan.id ? { ...p, wavePaymentUrl: e.target.value } : p);
                        onUpdatePlans(updated);
                      }}
                      placeholder="https://pay.wave.com/m/..."
                      className="w-full font-mono text-[11px] bg-slate-950/90 text-sky-200 border border-sky-500/30 rounded-lg p-2 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  {/* LIMITS & QUOTAS */}
                  <div className="space-y-2.5 text-xs text-gray-300 mb-6">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Quota Max Classes:</span>
                      <span className="font-mono font-bold text-white">
                        {plan.maxClasses >= 999 ? 'Illimité' : `${plan.maxClasses} classes`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Quota Max Enseignants:</span>
                      <span className="font-mono font-bold text-white">
                        {plan.maxTeachers >= 999 ? 'Illimité' : `${plan.maxTeachers} profs`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Quota Max Générations:</span>
                      <span className="font-mono font-bold text-white">
                        {(plan.maxGenerations ?? 9999) >= 9999 ? 'Illimité' : `${plan.maxGenerations} gén.`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-gray-400">Quota Max Exportations:</span>
                      <span className="font-mono font-bold text-white">
                        {(plan.maxExports ?? 9999) >= 9999 ? 'Illimité' : `${plan.maxExports} exports`}
                      </span>
                    </div>

                    {/* FEATURES CHECKLIST */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2">
                        {plan.features.pdfExport ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                        <span className={plan.features.pdfExport ? 'text-white' : 'text-gray-500 line-through'}>Export PDF Officiel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.features.excelExport ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                        <span className={plan.features.excelExport ? 'text-white' : 'text-gray-500 line-through'}>Export Excel & Tableur</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.features.wordExport ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                        <span className={plan.features.wordExport ? 'text-white' : 'text-gray-500 line-through'}>Export Fiche Word Modifiable</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.features.geminiAI ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                        <span className={plan.features.geminiAI ? 'text-indigo-300 font-bold' : 'text-gray-500 line-through'}>Conseiller IA Gemini Pro</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.features.prioritySupport ? <Check className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-gray-600" />}
                        <span className={plan.features.prioritySupport ? 'text-white' : 'text-gray-500 line-through'}>Support VIP WhatsApp 24/7</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingPlanModal(plan)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Configurer l&apos;Offre &amp; Lien Wave</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: LICENSE KEYS GENERATOR                          */}
      {/* ========================================================= */}
      {adminSubTab === 'licenses' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Gestionnaire des Clés d&apos;Activation &amp; Licences
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Générez des clés uniques, filtrez, contrôlez l&apos;activation et suivez les périodes de validité des abonnements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {licenseKeys.length > 0 && (
                <button
                  onClick={() => {
                    const availableKeys = licenseKeys.filter(k => k.status === 'unused').map(k => k.key).join('\n');
                    if (availableKeys) {
                      navigator.clipboard.writeText(availableKeys);
                      alert(`${licenseKeys.filter(k => k.status === 'unused').length} clé(s) disponible(s) copiée(s) dans le presse-papier !`);
                    } else {
                      alert("Aucune clé disponible à copier.");
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs flex items-center gap-2 border border-white/10 cursor-pointer"
                  title="Copier toutes les clés disponibles"
                >
                  <Copy className="w-4 h-4 text-amber-400" />
                  Copier les Clés Disponibles
                </button>
              )}
              <button
                onClick={() => setIsGenerateKeyModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Générer des Clés de Licence
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Clé de Licence</th>
                    <th className="p-4">Formule Associée</th>
                    <th className="p-4">Durée (Jours)</th>
                    <th className="p-4">Générée Le</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Utilisée Par</th>
                    <th className="p-4 text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {licenseKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500 italic font-sans">
                        Aucune clé de licence générée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    licenseKeys.map(k => {
                      const plan = plans.find(p => p.id === k.planId);
                      return (
                        <tr key={k.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4">
                            <span className="text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                              {k.key}
                            </span>
                          </td>
                          <td className="p-4 text-indigo-300 font-bold">{plan?.name || k.planId}</td>
                          <td className="p-4 text-white">{k.durationDays} jours</td>
                          <td className="p-4 text-gray-400">{k.generatedAt}</td>
                          <td className="p-4">
                            {k.status === 'unused' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Disponible
                              </span>
                            )}
                            {k.status === 'used' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                Utilisée
                              </span>
                            )}
                            {k.status === 'revoked' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                Révoquée
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-sans text-xs text-gray-300">
                            {k.usedByClientName || '—'}
                          </td>
                          <td className="p-4 text-right font-sans">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCopyKey(k.key, k.id)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 cursor-pointer"
                                title="Copier la clé"
                              >
                                {copiedKeyId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              {k.status === 'unused' && (
                                <button
                                  onClick={() => handleRevokeKey(k.id)}
                                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 cursor-pointer"
                                  title="Révolutionner / Révoquer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 5: INVOICING & PAYMENT TRANSACTIONS LEDGER         */}
      {/* ========================================================= */}
      {adminSubTab === 'invoices' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Journal des Paiements & Reçus de Facturation SaaS
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Historique complet des transactions, paiements Orange Money, Wave, Stripe et virements.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-gray-400 text-[10px] uppercase tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-4">Réf. Facture</th>
                    <th className="p-4">Client Établissement</th>
                    <th className="p-4">Montant FCFA / EUR</th>
                    <th className="p-4">Mode de Paiement</th>
                    <th className="p-4">Formule & Période</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right font-sans">Reçu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500 italic font-sans">
                        Aucune transaction enregistrée.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-indigo-300">{tx.invoiceRef}</td>
                        <td className="p-4 font-sans font-bold text-white">{tx.clientName}</td>
                        <td className="p-4 font-bold text-emerald-400">
                          {tx.amountFCFA.toLocaleString('fr-FR')} FCFA <span className="text-gray-500 font-normal">({tx.amountEUR} €)</span>
                        </td>
                        <td className="p-4 text-white">{tx.paymentMethod}</td>
                        <td className="p-4 font-sans text-gray-300">
                          {tx.planName} <span className="text-gray-500 text-[10px]">({tx.period})</span>
                        </td>
                        <td className="p-4 text-gray-400">{tx.date}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Payé ✓
                          </span>
                        </td>
                        <td className="p-4 text-right font-sans">
                          <button
                            onClick={() => setSelectedInvoice(tx)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all text-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            Voir Reçu
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 6: SAAS GLOBAL CONFIGURATION & SETTINGS           */}
      {/* ========================================================= */}
      {adminSubTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* ANNOUNCEMENT BANNER SETTINGS */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-400" />
              Bannière de Diffusion Globale pour tous les Clients
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Message du Banner :</label>
                <textarea
                  rows={3}
                  value={settings.globalAnnouncement}
                  onChange={e => onUpdateSettings({ ...settings, globalAnnouncement: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Type d&apos;Annonce :</label>
                <select
                  value={settings.announcementType}
                  onChange={e => onUpdateSettings({ ...settings, announcementType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="info">Info Bleu (Général)</option>
                  <option value="success">Succès Vert (Mise à jour)</option>
                  <option value="warning">Avertissement Amber (Maintenance)</option>
                  <option value="none">Masquer la bannière</option>
                </select>
              </div>
            </div>
          </div>

          {/* SYSTEM SETTINGS & PAYMENT GATEWAYS */}
          <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/10 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Paramètres Système & Passrelles de Paiement
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5">
                <div>
                  <span className="block font-bold text-white">Durée de la Période d&apos;Essai Gratuite</span>
                  <span className="text-gray-400 text-[10px]">Attribuée automatiquement aux nouveaux inscrits</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    value={settings.defaultTrialDays}
                    onChange={e => onUpdateSettings({ ...settings, defaultTrialDays: Number(e.target.value) })}
                    className="w-16 bg-slate-900 border border-white/10 rounded-lg p-1.5 text-center text-white font-bold"
                  />
                  <span className="text-gray-400">jours</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-white/5">
                <div>
                  <span className="block font-bold text-white">Mode Maintenance de la Plateforme</span>
                  <span className="text-gray-400 text-[10px]">Restreindre l&apos;accès à l&apos;application temporairement</span>
                </div>
                <button
                  onClick={() => onUpdateSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    settings.maintenanceMode ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'
                  }`}
                >
                  {settings.maintenanceMode ? 'ACTIF (Restreint)' : 'Inactif (Normal)'}
                </button>
              </div>

              {/* PAYMENT GATEWAY TOGGLES */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                <span className="block font-bold text-white mb-1">Moyens de Paiement Autorisés en Ligne :</span>
                <div className="grid grid-cols-2 gap-2 text-gray-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.supportedPaymentGateways.orangeMoney}
                      onChange={e => onUpdateSettings({
                        ...settings,
                        supportedPaymentGateways: { ...settings.supportedPaymentGateways, orangeMoney: e.target.checked }
                      })}
                      className="rounded bg-slate-900 border-white/20"
                    />
                    Orange Money
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.supportedPaymentGateways.wave}
                      onChange={e => onUpdateSettings({
                        ...settings,
                        supportedPaymentGateways: { ...settings.supportedPaymentGateways, wave: e.target.checked }
                      })}
                      className="rounded bg-slate-900 border-white/20"
                    />
                    Wave Senegal / CI
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.supportedPaymentGateways.stripe}
                      onChange={e => onUpdateSettings({
                        ...settings,
                        supportedPaymentGateways: { ...settings.supportedPaymentGateways, stripe: e.target.checked }
                      })}
                      className="rounded bg-slate-900 border-white/20"
                    />
                    Carte CB / Stripe
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.supportedPaymentGateways.licenseKey}
                      onChange={e => onUpdateSettings({
                        ...settings,
                        supportedPaymentGateways: { ...settings.supportedPaymentGateways, licenseKey: e.target.checked }
                      })}
                      className="rounded bg-slate-900 border-white/20"
                    />
                    Clés de Licence Prépayées
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* DEDICATED WAVE PAYMENT MERCHANT CONFIGURATION CARD */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-950 border border-sky-500/40 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-sky-500/20">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  <Smartphone className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    Configuration Générale du Compte Marchand Wave
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-mono">
                      Sénégal &amp; Côte d&apos;Ivoire
                    </span>
                  </h3>
                  <p className="text-xs text-sky-200/80">
                    Définissez le nom du marchand, le téléphone de réception des fonds et le lien Wave par défaut.
                  </p>
                </div>
              </div>

              {waveSaveSuccess && (
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-fade-in">
                  ✓ Modifications sauvegardées !
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nom Commercial Marchand Wave :</label>
                <input
                  type="text"
                  value={settings.waveConfig?.merchantName || ''}
                  onChange={e => onUpdateSettings({
                    ...settings,
                    waveConfig: {
                      merchantName: e.target.value,
                      merchantPhone: settings.waveConfig?.merchantPhone || '',
                      globalWaveUrl: settings.waveConfig?.globalWaveUrl || '',
                      qrCodeUrl: settings.waveConfig?.qrCodeUrl || '',
                      instructions: settings.waveConfig?.instructions || ''
                    }
                  })}
                  placeholder="ex: GestScolaire Pro / EduTech"
                  className="w-full bg-slate-950 border border-sky-500/30 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Téléphone Wave Marchand (Support/Reception) :</label>
                <input
                  type="text"
                  value={settings.waveConfig?.merchantPhone || ''}
                  onChange={e => onUpdateSettings({
                    ...settings,
                    waveConfig: {
                      merchantName: settings.waveConfig?.merchantName || '',
                      merchantPhone: e.target.value,
                      globalWaveUrl: settings.waveConfig?.globalWaveUrl || '',
                      qrCodeUrl: settings.waveConfig?.qrCodeUrl || '',
                      instructions: settings.waveConfig?.instructions || ''
                    }
                  })}
                  placeholder="ex: +221 77 845 12 00"
                  className="w-full bg-slate-950 border border-sky-500/30 rounded-xl p-2.5 text-sky-300 font-mono font-bold focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 font-bold mb-1">Lien de Paiement Wave Général (Checkout URL / QR Link) :</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={settings.waveConfig?.globalWaveUrl || ''}
                    onChange={e => onUpdateSettings({
                      ...settings,
                      waveConfig: {
                        merchantName: settings.waveConfig?.merchantName || '',
                        merchantPhone: settings.waveConfig?.merchantPhone || '',
                        globalWaveUrl: e.target.value,
                        qrCodeUrl: settings.waveConfig?.qrCodeUrl || '',
                        instructions: settings.waveConfig?.instructions || ''
                      }
                    })}
                    placeholder="ex: https://pay.wave.com/m/M_SN_GESTSCOLAIRE"
                    className="flex-1 bg-slate-950 border border-sky-500/30 rounded-xl p-2.5 text-sky-300 font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  {settings.waveConfig?.globalWaveUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(settings.waveConfig?.globalWaveUrl, '_blank')}
                      className="px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Tester Lien</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 font-bold mb-1">Consignes &amp; Instructions de Paiement Wave pour les Clients :</label>
                <textarea
                  rows={2}
                  value={settings.waveConfig?.instructions || ''}
                  onChange={e => onUpdateSettings({
                    ...settings,
                    waveConfig: {
                      merchantName: settings.waveConfig?.merchantName || '',
                      merchantPhone: settings.waveConfig?.merchantPhone || '',
                      globalWaveUrl: settings.waveConfig?.globalWaveUrl || '',
                      qrCodeUrl: settings.waveConfig?.qrCodeUrl || '',
                      instructions: e.target.value
                    }
                  })}
                  placeholder="Consignes à afficher dans la fenêtre de paiement client..."
                  className="w-full bg-slate-950 border border-sky-500/30 rounded-xl p-2.5 text-gray-200 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setWaveSaveSuccess(true);
                  setTimeout(() => setWaveSaveSuccess(false), 2500);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-sky-500/20 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Enregistrer la Configuration Wave</span>
              </button>
            </div>
          </div>

          {/* SUPER-ADMIN SECURITY & PASSWORD CHANGE CARD */}
          <div className={`p-6 rounded-2xl border shadow-xl space-y-4 transition-all ${
            theme === 'light'
              ? 'bg-white border-purple-200 shadow-purple-100/50'
              : 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 border-purple-500/30'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
                  <KeyRound className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    Sécurité & Mot de Passe Administrateur
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full font-mono">
                      Super-Admin
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Modifiez votre propre mot de passe pour sécuriser l&apos;accès au panneau d&apos;administration général.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateAdminPassword} className="space-y-4 text-xs pt-1">
              {adminPasswordError && (
                <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{adminPasswordError}</span>
                </div>
              )}

              {adminPasswordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{adminPasswordSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Nouveau Mot de Passe Administrateur *
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminNewPassword}
                      onChange={e => setAdminNewPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      {showAdminNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">
                    Confirmer le Nouveau Mot de Passe *
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={adminConfirmPassword}
                      onChange={e => setAdminConfirmPassword(e.target.value)}
                      placeholder="Retapez le mot de passe"
                      className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                    >
                      {showAdminConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isAdminUpdatingPassword || !adminNewPassword}
                  className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-purple-500/25 cursor-pointer flex items-center gap-2 ${
                    isAdminUpdatingPassword || !adminNewPassword ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {isAdminUpdatingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Mise à jour en cours...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enregistrer mon Nouveau Mot de Passe Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD NEW CLIENT SCHOOL ACCOUNT                      */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAddClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  Créer un Nouveau Compte Client Établissement
                </h3>
                <button
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {createdClientSuccess ? (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Compte Établissement Créé avec Succès !</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Le compte pour <strong className="text-white">{createdClientSuccess.schoolName}</strong> a été enregistré en base de données.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-white/10 text-left space-y-2.5">
                    <div className="text-[11px] font-semibold text-gray-400">Identifiants d&apos;accès à transmettre au client :</div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-gray-400 text-xs">Email :</span>
                      <span className="text-white font-mono font-bold text-xs">{createdClientSuccess.email}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-white/5">
                      <span className="text-gray-400 text-xs">Mot de passe temporaire :</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">{createdClientSuccess.password}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Vos identifiants Diongue-IziSchool pour ${createdClientSuccess.schoolName} :\nEmail: ${createdClientSuccess.email}\nMot de passe: ${createdClientSuccess.password}\nLien de connexion: ${window.location.origin}`
                        );
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2500);
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      {copiedPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPassword ? 'Identifiants Copiés !' : 'Copier les Identifiants'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedClientSuccess(null);
                        setIsAddClientModalOpen(false);
                      }}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      Terminer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
                  {createClientError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{createClientError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Nom de l&apos;Établissement *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Lycée Lamine Guèye"
                        value={newClientForm.schoolName}
                        onChange={e => setNewClientForm({ ...newClientForm, schoolName: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Ville & Pays *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Dakar, Sénégal"
                        value={newClientForm.cityCountry}
                        onChange={e => setNewClientForm({ ...newClientForm, cityCountry: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Nom du Directeur *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: M. Mamadou Diallo"
                        value={newClientForm.adminName}
                        onChange={e => setNewClientForm({ ...newClientForm, adminName: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Email Admin *</label>
                      <input
                        type="email"
                        required
                        placeholder="ex: m.diallo@school.edu.sn"
                        value={newClientForm.adminEmail}
                        onChange={e => setNewClientForm({ ...newClientForm, adminEmail: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">WhatsApp / Tél *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: +221 77 654 32 10"
                        value={newClientForm.phone}
                        onChange={e => setNewClientForm({ ...newClientForm, phone: e.target.value, whatsapp: e.target.value })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* CHAMP MOT DE PASSE PAR DEFAUT DEFINI AUTOMATIQUEMENT */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-indigo-300 font-bold text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-400" />
                        Mot de Passe par Défaut (Généré Automatiquement) *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const newPass = generateDefaultPassword();
                            setNewClientForm({ ...newClientForm, password: newPass });
                          }}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          title="Générer un autre mot de passe aléatoire"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Régénérer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newClientForm.password);
                            setCopiedPassword(true);
                            setTimeout(() => setCopiedPassword(false), 2000);
                          }}
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                          title="Copier le mot de passe"
                        >
                          {copiedPassword ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedPassword ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type={showDefaultPassword ? 'text' : 'password'}
                        required
                        value={newClientForm.password}
                        onChange={e => setNewClientForm({ ...newClientForm, password: e.target.value })}
                        className="w-full bg-slate-900 border border-indigo-500/30 rounded-xl p-2.5 pr-10 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDefaultPassword(!showDefaultPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        title={showDefaultPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showDefaultPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      💡 Mot de passe initial défini automatiquement pour l&apos;accès du client. L&apos;utilisateur pourra le modifier librement plus tard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Choix de la Formule *</label>
                      <select
                        value={newClientForm.planId}
                        onChange={e => {
                          const pId = e.target.value;
                          const plan = plans.find(p => p.id === pId);
                          setNewClientForm({
                            ...newClientForm,
                            planId: pId,
                            amountFCFA: (plan?.monthlyPriceFCFA || 0) * newClientForm.durationMonths
                          });
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA/mois)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Durée de l&apos;abonnement *</label>
                      <select
                        value={newClientForm.durationMonths}
                        onChange={e => {
                          const dur = Number(e.target.value);
                          const plan = plans.find(p => p.id === newClientForm.planId);
                          setNewClientForm({
                            ...newClientForm,
                            durationMonths: dur,
                            amountFCFA: (plan?.monthlyPriceFCFA || 0) * dur
                          });
                        }}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value={1}>1 Mois</option>
                        <option value={3}>3 Mois</option>
                        <option value={6}>6 Mois</option>
                        <option value={12}>12 Mois</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Statut Initial *</label>
                      <select
                        value={newClientForm.status}
                        onChange={e => setNewClientForm({ ...newClientForm, status: e.target.value as SubscriptionStatus })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="active">Actif (Paiement Validé)</option>
                        <option value="trial">Période d&apos;Essai</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Mode de Paiement</label>
                      <select
                        value={newClientForm.paymentMethod}
                        onChange={e => setNewClientForm({ ...newClientForm, paymentMethod: e.target.value as PaymentMethod })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Orange Money">Orange Money</option>
                        <option value="Wave">Wave</option>
                        <option value="Stripe">Carte Bancaire / Stripe</option>
                        <option value="Virement">Virement Bancaire</option>
                        <option value="Clé Licence">Clé Licence Prépayée</option>
                        <option value="Gratuit">Gratuit / Offert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-semibold">Montant Encaissé (FCFA)</label>
                      <input
                        type="number"
                        value={newClientForm.amountFCFA}
                        onChange={e => setNewClientForm({ ...newClientForm, amountFCFA: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Notes Interne Admin</label>
                    <input
                      type="text"
                      placeholder="ex: Contrat signé par le proviseur, reçu transmis par WhatsApp"
                      value={newClientForm.notes}
                      onChange={e => setNewClientForm({ ...newClientForm, notes: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAddClientModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingClient}
                      className={`px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center gap-2 ${
                        isCreatingClient ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <span>{isCreatingClient ? 'Création en cours...' : 'Créer & Activer le Compte'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: ADMIN RESET USER PASSWORD                          */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isResetPasswordModalOpen && resetPasswordClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Réinitialiser le Mot de Passe Client
                </h3>
                <button
                  onClick={() => setIsResetPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {resetPasswordSuccess ? (
                <div className="space-y-4 py-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Nouveau Mot de Passe Validé !</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Le mot de passe a été instantanément mis à jour pour <strong className="text-white">{resetPasswordClient.schoolName}</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-white/10 text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Email :</span>
                      <span className="text-white font-mono font-bold text-xs">{resetPasswordClient.adminEmail}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Nouveau mot de passe :</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">{resetPasswordInput}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Bonjour,\nVoici vos nouveaux identifiants Diongue-IziSchool pour ${resetPasswordClient.schoolName} :\nEmail: ${resetPasswordClient.adminEmail}\nNouveau Mot de passe: ${resetPasswordInput}\nLien de connexion: ${window.location.origin}`
                        );
                        setCopiedResetCreds(true);
                        setTimeout(() => setCopiedResetCreds(false), 2500);
                      }}
                      className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedResetCreds ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedResetCreds ? 'Message Copié !' : 'Copier pour WhatsApp/Email'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsResetPasswordModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePerformResetPassword} className="space-y-4 text-xs">
                  {resetPasswordError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{resetPasswordError}</span>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                    <div className="text-white font-bold">{resetPasswordClient.schoolName}</div>
                    <div className="text-gray-400 font-mono text-[11px]">{resetPasswordClient.adminEmail}</div>
                    <div className="text-gray-500 text-[10px]">Directeur : {resetPasswordClient.adminName}</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-300 font-bold">
                        Nouveau Mot de Passe Temporaire *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setResetPasswordInput(generateDefaultPassword())}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-purple-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Générer un autre mot de passe"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Régénérer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(resetPasswordInput);
                            setCopiedResetCreds(true);
                            setTimeout(() => setCopiedResetCreds(false), 2000);
                          }}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-emerald-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Copier le mot de passe"
                        >
                          {copiedResetCreds ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedResetCreds ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={resetPasswordInput}
                        onChange={e => setResetPasswordInput(e.target.value)}
                        className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 pr-10 text-emerald-400 font-mono font-bold text-xs focus:outline-none focus:border-purple-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        title={showResetPassword ? 'Masquer' : 'Afficher'}
                      >
                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      💡 Ce mot de passe écrasera immédiatement l&apos;ancien mot de passe de l&apos;utilisateur dans la base d&apos;authentification.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsResetPasswordModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingPassword}
                      className={`px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2 ${
                        isResettingPassword ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <span>{isResettingPassword ? 'Mise à jour...' : 'Confirmer & Réinitialiser'}</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: SUPER-ADMIN PERSONAL PASSWORD CHANGE               */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAdminPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-purple-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-purple-400" />
                  Modifier mon Mot de Passe Administrateur
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAdminPasswordModalOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {adminPasswordSuccess ? (
                <div className="space-y-4 py-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Mot de Passe Mis à Jour !</h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Votre nouveau mot de passe Super-Admin a été enregistré avec succès en base de données.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAdminPasswordModalOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-emerald-600/30"
                    >
                      Terminer
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateAdminPassword} className="space-y-4 text-xs">
                  {adminPasswordError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{adminPasswordError}</span>
                    </div>
                  )}

                  <p className="text-gray-400 text-xs">
                    Entrez votre nouveau mot de passe Super-Admin. Il sera immédiatement actif pour vos prochaines connexions.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-300 font-bold mb-1">
                        Nouveau Mot de Passe *
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={adminNewPassword}
                          onChange={e => setAdminNewPassword(e.target.value)}
                          placeholder="Minimum 6 caractères"
                          className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          {showAdminNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-bold mb-1">
                        Confirmer le Nouveau Mot de Passe *
                      </label>
                      <div className="relative">
                        <input
                          type={showAdminConfirmPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={adminConfirmPassword}
                          onChange={e => setAdminConfirmPassword(e.target.value)}
                          placeholder="Retapez le mot de passe"
                          className="w-full bg-slate-950 border border-purple-500/30 rounded-xl p-2.5 pr-10 text-white font-mono text-xs focus:outline-none focus:border-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          {showAdminConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAdminPasswordModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isAdminUpdatingPassword || !adminNewPassword}
                      className={`px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2 ${
                        isAdminUpdatingPassword || !adminNewPassword ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isAdminUpdatingPassword ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mise à jour...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Mettre à jour</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: GENERATE LICENSE KEYS                              */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isGenerateKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Générateur de Clés de Licence
                </h3>
                <button
                  onClick={() => setIsGenerateKeyModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleGenerateKeys} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Associer à l&apos;Offre SaaS *</label>
                  <select
                    value={newKeyForm.planId}
                    onChange={e => setNewKeyForm({ ...newKeyForm, planId: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Durée de Validité *</label>
                  <select
                    value={newKeyForm.durationDays}
                    onChange={e => setNewKeyForm({ ...newKeyForm, durationDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={30}>30 jours (1 mois)</option>
                    <option value={90}>90 jours (3 mois)</option>
                    <option value={180}>180 jours (6 mois)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nombre de clés à générer *</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newKeyForm.quantity}
                    onChange={e => setNewKeyForm({ ...newKeyForm, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-bold text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsGenerateKeyModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20"
                  >
                    Générer Clés
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: EDIT CLIENT ACCOUNT DETAILS                        */}
      {/* ========================================================= */}
      <AnimatePresence>
        {editingClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-indigo-400" />
                  Modifier le Client: {editingClient.schoolName}
                </h3>
                <button
                  onClick={() => setEditingClient(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditedClient} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nom de l&apos;Établissement</label>
                  <input
                    type="text"
                    value={editingClient.schoolName}
                    onChange={e => setEditingClient({ ...editingClient, schoolName: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Nom du Contact / Admin</label>
                    <input
                      type="text"
                      value={editingClient.adminName}
                      onChange={e => setEditingClient({ ...editingClient, adminName: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Adresse E-mail</label>
                    <input
                      type="email"
                      value={editingClient.adminEmail}
                      onChange={e => setEditingClient({ ...editingClient, adminEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Téléphone / WhatsApp</label>
                    <input
                      type="text"
                      value={editingClient.phone}
                      onChange={e => setEditingClient({ ...editingClient, phone: e.target.value, whatsapp: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Ville &amp; Pays</label>
                    <input
                      type="text"
                      value={editingClient.cityCountry}
                      onChange={e => setEditingClient({ ...editingClient, cityCountry: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Offre / Plan SaaS</label>
                    <select
                      value={editingClient.planId}
                      onChange={e => setEditingClient({ ...editingClient, planId: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Statut du Compte</label>
                    <select
                      value={editingClient.status}
                      onChange={e => setEditingClient({ ...editingClient, status: e.target.value as SubscriptionStatus })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                    >
                      <option value="active">Actif</option>
                      <option value="trial">En Essai</option>
                      <option value="suspended">Suspendu</option>
                      <option value="expired">Expiré</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Date de Fin d&apos;Abonnement</label>
                  <input
                    type="date"
                    value={editingClient.subscriptionEndDate}
                    onChange={e => setEditingClient({ ...editingClient, subscriptionEndDate: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Notes Administrateur</label>
                  <textarea
                    rows={2}
                    value={editingClient.notes || ''}
                    onChange={e => setEditingClient({ ...editingClient, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingClient(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                  >
                    Enregistrer les Modifications
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: VIEW / PRINT INVOICE RECEIPT                       */}
      {/* ========================================================= */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileText className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-sm">Reçu Officiel d&apos;Abonnement SaaS</h3>
                    <p className="text-[10px] text-gray-400 font-mono">{selectedInvoice.invoiceRef}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Client :</span>
                  <span className="font-bold text-white font-sans">{selectedInvoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Formule :</span>
                  <span className="text-indigo-300 font-bold">{selectedInvoice.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Moyen de Paiement :</span>
                  <span className="text-white">{selectedInvoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date d&apos;Émission :</span>
                  <span className="text-white">{selectedInvoice.date}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
                  <span>Montant Total :</span>
                  <span className="text-emerald-400">{selectedInvoice.amountFCFA.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Imprimer / Imprimer en PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: EDIT SAAS PLAN & WAVE PAYMENT LINK                 */}
      {/* ========================================================= */}
      <AnimatePresence>
        {editingPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-sky-400" />
                  Configuration Offre : {editingPlanModal.name}
                </h3>
                <button
                  onClick={() => setEditingPlanModal(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  const updatedPlans = plans.map(p => p.id === editingPlanModal.id ? editingPlanModal : p);
                  onUpdatePlans(updatedPlans);
                  setEditingPlanModal(null);
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nom de la Formule :</label>
                  <input
                    type="text"
                    value={editingPlanModal.name}
                    onChange={e => setEditingPlanModal({ ...editingPlanModal, name: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Description :</label>
                  <input
                    type="text"
                    value={editingPlanModal.description}
                    onChange={e => setEditingPlanModal({ ...editingPlanModal, description: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Prix Mensuel FCFA :</label>
                    <input
                      type="number"
                      value={editingPlanModal.monthlyPriceFCFA}
                      onChange={e => setEditingPlanModal({ ...editingPlanModal, monthlyPriceFCFA: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Prix Annuel FCFA :</label>
                    <input
                      type="number"
                      value={editingPlanModal.annualPriceFCFA}
                      onChange={e => setEditingPlanModal({ ...editingPlanModal, annualPriceFCFA: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-indigo-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* WAVE PAYMENT LINK SPECIFIC FIELD */}
                <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-2">
                  <label className="block text-sky-300 font-extrabold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-sky-400" />
                      Lien de Paiement Wave Spécifique à cette Formule :
                    </span>
                    {editingPlanModal.wavePaymentUrl && (
                      <button
                        type="button"
                        onClick={() => window.open(editingPlanModal.wavePaymentUrl, '_blank')}
                        className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        Tester <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </label>
                  <input
                    type="url"
                    value={editingPlanModal.wavePaymentUrl || ''}
                    onChange={e => setEditingPlanModal({ ...editingPlanModal, wavePaymentUrl: e.target.value })}
                    placeholder="ex: https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PRO"
                    className="w-full bg-slate-950 border border-sky-500/30 rounded-xl p-2.5 text-sky-200 font-mono text-xs focus:outline-none focus:border-sky-400"
                  />
                  <p className="text-[10px] text-gray-400">
                    Ce lien redirigera directement le client vers votre checkout Wave pré-rempli pour la formule {editingPlanModal.name}.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Quota Max Classes :</label>
                    <input
                      type="number"
                      value={editingPlanModal.maxClasses}
                      onChange={e => setEditingPlanModal({ ...editingPlanModal, maxClasses: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">Quota Max Enseignants :</label>
                    <input
                      type="number"
                      value={editingPlanModal.maxTeachers}
                      onChange={e => setEditingPlanModal({ ...editingPlanModal, maxTeachers: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingPlanModal(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Enregistrer la Formule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PLUS DE DETAILS ADMIN MRR & OFFRES */}
      <AnimatePresence>
        {adminDetailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-3xl w-full shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <Maximize2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {adminDetailModal === 'mrr' ? "Analyse Détaillée & Projection MRR" : "Analyse Détaillée de la Répartition des Offres"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Vue analytique globale avec explications pédagogiques simples.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAdminDetailModal(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {adminDetailModal === 'mrr' ? (
                <div className="space-y-5 text-xs text-gray-300">
                  <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 space-y-2">
                    <h4 className="font-bold text-indigo-300 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Explication des Revenus Récurrents
                    </h4>
                    <p className="leading-relaxed">
                      Le <strong>MRR (Monthly Recurring Revenue)</strong> actuel est de <strong>{metrics.mrrFCFA.toLocaleString('fr-FR')} FCFA</strong> ({metrics.mrrEUR} €).
                      Il est généré par <strong>{metrics.activeClients} établissements abonnés</strong> actifs.
                    </p>
                    <p className="leading-relaxed">
                      La projection annuelle (ARR) atteint <strong>{metrics.arrFCFA.toLocaleString('fr-FR')} FCFA</strong> ({metrics.arrEUR} €), enregistrant une progression moyenne de <strong>+18%</strong> sur le semestre.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">MRR Mensuel</span>
                      <span className="text-sm font-bold text-indigo-400">{metrics.mrrFCFA.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">ARR Annuel</span>
                      <span className="text-sm font-bold text-purple-400">{metrics.arrFCFA.toLocaleString('fr-FR')} F</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Taux Attrition (Churn)</span>
                      <span className="text-sm font-bold text-emerald-400">{metrics.churnRatePercent}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                      <span className="text-[10px] text-gray-400 block">Total Encaissé</span>
                      <span className="text-sm font-bold text-amber-400">{metrics.totalRevenueFCFA.toLocaleString('fr-FR')} F</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-xs text-gray-300">
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 space-y-2">
                    <h4 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Explication des Formules Souscrites
                    </h4>
                    <p className="leading-relaxed">
                      La majorité de vos établissements clients choisissent les formules intégrant la génération IA illimitée et les exports multi-formats.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {plans.map(p => {
                      const count = clients.filter(c => c.planId === p.id).length;
                      const percent = clients.length > 0 ? Math.round((count / clients.length) * 100) : 0;
                      return (
                        <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white block">{p.name}</span>
                            <span className="text-[11px] text-gray-400">{p.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA/mois • {p.maxClasses} classes • {p.maxTeachers} profs</span>
                          </div>
                          <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                            {count} client(s) ({percent}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-white/10">
                <button
                  onClick={() => setAdminDetailModal(null)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
