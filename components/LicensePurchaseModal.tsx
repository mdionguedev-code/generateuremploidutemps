'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Building2,
  Mail,
  Smartphone,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Shield,
  ArrowRight,
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Check,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { SaaSPlan, PaymentMethod } from '@/lib/saasTypes';
import { createClient } from '@/utils/supabase/client';

interface LicensePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SaaSPlan | null;
  onPurchaseRequest: (
    schoolName: string,
    email: string,
    whatsapp: string,
    planId: string,
    adminName?: string,
    userId?: string,
    paymentMethod?: PaymentMethod
  ) => void;
}

export default function LicensePurchaseModal({
  isOpen,
  onClose,
  plan,
  onPurchaseRequest
}: LicensePurchaseModalProps) {
  // Step navigation: 1: Auth (Register/Login) -> 2: Order & Payment -> 3: Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSignUp, setIsSignUp] = useState(true);

  // Form states
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Wave');

  // Status & User state
  const [authenticatedUser, setAuthenticatedUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  // Check if a session already exists when opening
  useEffect(() => {
    if (!isOpen) return;

    const checkCurrentSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthenticatedUser({ id: user.id, email: user.email || '' });
          setEmail(user.email || '');
          
          // Try to fetch existing establishment settings
          const { data: estData } = await supabase
            .from('establishment_settings')
            .select('school_name')
            .eq('user_id', user.id)
            .single();

          if (estData?.school_name) {
            setSchoolName(estData.school_name);
          } else if (user.user_metadata?.school_name) {
            setSchoolName(user.user_metadata.school_name);
          }

          if (user.user_metadata?.whatsapp) {
            setWhatsapp(user.user_metadata.whatsapp);
          }
          if (user.user_metadata?.admin_name) {
            setAdminName(user.user_metadata.admin_name);
          }

          // Move directly to step 2 if already logged in
          setCurrentStep(2);
        } else {
          setAuthenticatedUser(null);
          setCurrentStep(1);
        }
      } catch (err) {
        console.error('Error checking user session:', err);
      }
    };

    checkCurrentSession();
  }, [isOpen]);

  if (!isOpen || !plan) return null;

  // Handle Step 1 Submit (Register or Login)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim() || !email.includes('@')) {
      setError('Veuillez renseigner une adresse email valide.');
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // --- SIGN UP ---
        if (!schoolName.trim()) {
          setError("Le nom de votre établissement est obligatoire.");
          setLoading(false);
          return;
        }

        if (!whatsapp.trim()) {
          setError("Le numéro WhatsApp est obligatoire pour recevoir votre clé.");
          setLoading(false);
          return;
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              school_name: schoolName.trim(),
              admin_name: adminName.trim() || `Directeur ${schoolName.trim()}`,
              whatsapp: whatsapp.trim()
            }
          }
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        const user = signUpData.user;
        if (user) {
          setAuthenticatedUser({ id: user.id, email: user.email || email.trim() });
          
          // Initialize establishment settings for the new user
          await supabase.from('establishment_settings').upsert({
            user_id: user.id,
            school_name: schoolName.trim(),
            plan_id: 'plan_free',
            status: 'active',
            updated_at: new Date().toISOString()
          });

          // Initialize profile
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email || email.trim(),
            role: 'user',
            plan_id: 'plan_free',
            subscription_status: 'active'
          });
        }

        setSuccessMsg("Compte créé avec succès !");
        setCurrentStep(2);
      } else {
        // --- SIGN IN ---
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (signInError) {
          setError(
            signInError.message === 'Invalid login credentials'
              ? "Adresse email ou mot de passe incorrect."
              : signInError.message
          );
          setLoading(false);
          return;
        }

        const user = signInData.user;
        if (user) {
          setAuthenticatedUser({ id: user.id, email: user.email || email.trim() });

          // Fetch establishment name if available
          const { data: estData } = await supabase
            .from('establishment_settings')
            .select('school_name')
            .eq('user_id', user.id)
            .single();

          if (estData?.school_name) {
            setSchoolName(estData.school_name);
          } else if (user.user_metadata?.school_name) {
            setSchoolName(user.user_metadata.school_name);
          }

          if (user.user_metadata?.whatsapp && !whatsapp) {
            setWhatsapp(user.user_metadata.whatsapp);
          }
        }

        setCurrentStep(2);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue lors de l'authentification.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2 Submit (Order Confirmation & Payment)
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!schoolName.trim()) {
      setError("Le nom de l'établissement est requis.");
      return;
    }

    if (!whatsapp.trim()) {
      setError("Le numéro WhatsApp est obligatoire pour la livraison de votre clé.");
      return;
    }

    // Submit activation request to parent and Supabase DB
    onPurchaseRequest(
      schoolName.trim(),
      email.trim() || authenticatedUser?.email || '',
      whatsapp.trim(),
      plan.id,
      adminName.trim() || 'Directeur',
      authenticatedUser?.id,
      paymentMethod
    );

    // Open Wave / Payment link
    const waveLink = plan.wavePaymentUrl || 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_GLOBAL';
    try {
      window.open(waveLink, '_blank');
    } catch {
      // Ignore popup blocker errors
    }

    setCurrentStep(3);
  };

  const handleClose = () => {
    setCurrentStep(1);
    setError('');
    setSuccessMsg('');
    setPassword('');
    onClose();
  };

  const waveLink = plan.wavePaymentUrl || 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_GLOBAL';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 relative overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Background Decorative Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shrink-0">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>Achat de Clé Licence</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    {plan.name}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA (~ {Math.round(plan.monthlyPriceFCFA / 655.957)} €)
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2-STEP PROGRESS BAR / STEPPER */}
          <div className="grid grid-cols-2 gap-2 relative z-10 shrink-0">
            <div className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
              currentStep === 1
                ? 'bg-indigo-600/20 border-indigo-500/40 text-white font-bold shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                : 'bg-white/5 border-white/5 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center font-black shrink-0 ${
                currentStep > 1 ? 'bg-emerald-500 text-slate-950' : currentStep === 1 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span className="text-xs truncate">1. Identification</span>
            </div>

            <div className={`p-2.5 rounded-xl border text-center transition-all flex items-center justify-center gap-2 ${
              currentStep === 2
                ? 'bg-indigo-600/20 border-indigo-500/40 text-white font-bold shadow-sm'
                : currentStep === 3
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                : 'bg-white/5 border-white/5 text-gray-500'
            }`}>
              <span className={`w-5 h-5 rounded-full text-[11px] font-mono flex items-center justify-center font-black shrink-0 ${
                currentStep === 3 ? 'bg-emerald-500 text-slate-950' : currentStep === 2 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {currentStep === 3 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </span>
              <span className="text-xs truncate">2. Paiement &amp; Clé</span>
            </div>
          </div>

          {/* ERROR / SUCCESS NOTIFICATIONS */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold relative z-10 animate-in fade-in">
              ⚠️ {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold relative z-10 animate-in fade-in">
              ✅ {successMsg}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: AUTHENTICATION (SIGN UP OR SIGN IN)              */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-1">
              
              {/* If user is already authenticated */}
              {authenticatedUser ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Vous êtes déjà connecté</h4>
                      <p className="text-[11px] text-gray-300">{authenticatedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continuer vers le paiement</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  {/* TOGGLE TABS: INSCRIPTION vs CONNEXION */}
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-white/10 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(''); }}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSignUp
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>S'inscrire (Nouveau)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setError(''); }}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !isSignUp
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Déjà un compte</span>
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
                    {/* Inscription specific fields */}
                    {isSignUp && (
                      <>
                        <div className="space-y-1">
                          <label className="block text-gray-300 font-bold text-[11px]">
                            Nom de l'Établissement scolaire :
                          </label>
                          <div className="relative">
                            <Building2 className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              required
                              placeholder="Ex: Lycée Blaise Diagne"
                              value={schoolName}
                              onChange={e => setSchoolName(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-gray-300 font-bold text-[11px]">
                            Nom du Responsable / Directeur :
                          </label>
                          <div className="relative">
                            <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Ex: M. Diongue"
                              value={adminName}
                              onChange={e => setAdminName(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-gray-300 font-bold text-[11px]">
                            Numéro WhatsApp (pour livraison de la clé) :
                          </label>
                          <div className="relative">
                            <Smartphone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              required
                              placeholder="Ex: +221 77 123 45 67"
                              value={whatsapp}
                              onChange={e => setWhatsapp(e.target.value)}
                              className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Email Field */}
                    <div className="space-y-1">
                      <label className="block text-gray-300 font-bold text-[11px]">
                        Adresse e-mail :
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          placeholder="contact@etablissement.sn"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1">
                      <label className="block text-gray-300 font-bold text-[11px]">
                        Mot de passe :
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        {loading ? (
                          <span>Traitement en cours...</span>
                        ) : isSignUp ? (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Créer mon compte et continuer</span>
                            <ArrowRight className="w-4 h-4 ml-0.5" />
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Se connecter et continuer</span>
                            <ArrowRight className="w-4 h-4 ml-0.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: ORDER SUMMARY & PAYMENT INITIATION               */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs relative z-10 flex-1 overflow-y-auto pr-1">
              
              {/* Order Recap Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/20 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 font-mono text-[11px] uppercase">Formule Sélectionnée</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {plan.name}
                  </span>
                </div>

                <div className="flex items-baseline justify-between border-t border-white/5 pt-2">
                  <span className="text-gray-300">Montant à régler :</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      ~ {Math.round(plan.monthlyPriceFCFA / 655.957)} € / mois
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Contact Verification */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Coordonnées de Livraison de la Clé</span>
                </h4>

                <div className="space-y-1">
                  <label className="block text-gray-400 text-[10px]">Nom de l'établissement :</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    placeholder="Nom de l'établissement"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-gray-400 text-[10px]">Numéro WhatsApp pour recevoir la clé :</label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono text-emerald-300 font-bold"
                  />
                </div>
              </div>

              {/* Payment Method Choice */}
              <div className="space-y-2">
                <label className="block text-gray-300 font-bold text-[11px]">
                  Mode de Paiement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Wave')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      paymentMethod === 'Wave'
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-sky-400 flex items-center justify-center">
                      {paymentMethod === 'Wave' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </span>
                    <div>
                      <div className="font-bold text-xs">Wave Sénégal</div>
                      <div className="text-[10px] text-gray-400">Paiement instantané</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Orange Money')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      paymentMethod === 'Orange Money'
                        ? 'bg-orange-500/20 border-orange-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full border border-orange-400 flex items-center justify-center">
                      {paymentMethod === 'Orange Money' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </span>
                    <div>
                      <div className="font-bold text-xs">Orange Money</div>
                      <div className="text-[10px] text-gray-400">OM Sénégal &amp; UEMOA</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Retour</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Passer au paiement ({plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA)</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ORDER CONFIRMED & PAYMENT LINK                   */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs relative z-10 flex-1 overflow-y-auto pr-1 pb-1 text-center animate-in fade-in">
              
              {/* Header Badge */}
              <div className="py-2 text-emerald-400 space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-base font-black text-white">Commande Enregistrée avec Succès !</h4>
                <p className="text-xs text-gray-300 max-w-sm mx-auto">
                  Votre demande d'activation pour <strong>{schoolName}</strong> a bien été transmise au Super-Administrateur.
                </p>
              </div>

              {/* Payment Box */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 text-left space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Formule commandée :</span>
                  <span className="font-extrabold text-white px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    {plan.name}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Montant à régler :</span>
                  <span className="font-extrabold text-emerald-400 font-mono text-base">
                    {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="pt-1.5">
                  <a
                    href={waveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer decoration-0 hover:scale-[1.01] active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Finaliser mon paiement sur Wave</span>
                  </a>
                </div>
              </div>

              {/* Professional, Warm & Reassuring Delivery Guarantee Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950/80 border border-indigo-500/30 text-left space-y-2.5 shadow-md">
                <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Validation &amp; Envoi Direct de votre Clé</span>
                </div>
                
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Dès réception et vérification de votre règlement, le Super-Administrateur valide votre commande et vous fait parvenir votre clé de licence officielle ainsi que les instructions d'activation.
                </p>

                <div className="pt-1 border-t border-white/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      Livraison sur WhatsApp :
                    </span>
                    <strong className="text-emerald-300 font-mono font-bold">{whatsapp}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-gray-400 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      Confirmation e-mail :
                    </span>
                    <strong className="text-white font-mono text-[10px] truncate max-w-[180px]">{email}</strong>
                  </div>
                </div>

                <div className="pt-2 text-[10px] text-indigo-200/80 italic flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span>Merci pour votre confiance ! Notre équipe reste à votre écoute pour vous accompagner.</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer shadow hover:scale-[1.01] active:scale-95"
                >
                  Fermer &amp; Accéder à mon Espace
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
