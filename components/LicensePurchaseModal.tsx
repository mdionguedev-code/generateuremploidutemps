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
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 relative overflow-hidden flex flex-col"
        >
          {/* Background Decorative Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shrink-0">
                <CreditCard className="w-4.5 h-4.5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  <span>Achat de Clé Licence</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-mono uppercase font-bold">
                    {plan.name}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400">
                  {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA (~ {Math.round(plan.monthlyPriceFCFA / 655.957)} €)
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer shadow-sm"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stepper progress indicator */}
          <div className="grid grid-cols-2 gap-2 relative z-10 shrink-0">
            <div className={`py-1.5 px-3 rounded-lg border text-center transition-all flex items-center justify-center gap-2 ${
              currentStep === 1
                ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-semibold shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 font-semibold'
                : 'bg-white/5 border-white/5 text-gray-500'
            }`}>
              <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-black shrink-0 ${
                currentStep > 1 ? 'bg-emerald-500 text-slate-950' : currentStep === 1 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {currentStep > 1 ? <Check className="w-3 h-3" /> : '1'}
              </span>
              <span className="text-[11px] truncate">1. Identification</span>
            </div>

            <div className={`py-1.5 px-3 rounded-lg border text-center transition-all flex items-center justify-center gap-2 ${
              currentStep === 2
                ? 'bg-indigo-600/10 border-indigo-500/30 text-white font-semibold shadow-sm'
                : currentStep === 3
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 font-semibold'
                : 'bg-white/5 border-white/5 text-gray-500'
            }`}>
              <span className={`w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center font-black shrink-0 ${
                currentStep === 3 ? 'bg-emerald-500 text-slate-950' : currentStep === 2 ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-400'
              }`}>
                {currentStep === 3 ? <Check className="w-3 h-3" /> : '2'}
              </span>
              <span className="text-[11px] truncate">2. Paiement &amp; Clé</span>
            </div>
          </div>

          {/* Messages Alerts */}
          {(error || successMsg) && (
            <div className="relative z-10 shrink-0">
              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-300 text-[11px] font-medium">
                  ⚠️ {error}
                </div>
              )}
              {successMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-[11px] font-medium">
                  ✅ {successMsg}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: AUTHENTICATION (SIGN UP OR SIGN IN)              */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-3 relative z-10 flex-1">
              {authenticatedUser ? (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-[11px] font-bold text-white">Vous êtes connecté</h4>
                      <p className="text-[10px] text-gray-300">{authenticatedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Continuer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 p-0.5 rounded-lg bg-slate-950 border border-white/5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(true); setError(''); }}
                      className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isSignUp
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>S'inscrire</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsSignUp(false); setError(''); }}
                      className={`py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        !isSignUp
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <LogIn className="w-3 h-3" />
                      <span>Se connecter</span>
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-2.5 text-[11px]">
                    {isSignUp ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-gray-300 font-semibold">Établissement :</label>
                            <div className="relative">
                              <Building2 className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                required
                                placeholder="Lycée..."
                                value={schoolName}
                                onChange={e => setSchoolName(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <label className="text-gray-300 font-semibold">Responsable :</label>
                            <div className="relative">
                              <User className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                placeholder="Directeur..."
                                value={adminName}
                                onChange={e => setAdminName(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-gray-300 font-semibold">WhatsApp :</label>
                            <div className="relative">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="tel"
                                required
                                placeholder="+221..."
                                value={whatsapp}
                                onChange={e => setWhatsapp(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500 font-mono"
                              />
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <label className="text-gray-300 font-semibold">Adresse e-mail :</label>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="email"
                                required
                                placeholder="contact@ecole.sn"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="space-y-0.5">
                          <label className="text-gray-300 font-semibold">Adresse e-mail :</label>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              placeholder="contact@ecole.sn"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-2 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-0.5">
                      <label className="text-gray-300 font-semibold">Mot de passe :</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 rounded-lg pl-8 pr-9 py-1.5 text-white text-[11px] focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <span>Vérification...</span>
                        ) : isSignUp ? (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Créer mon compte &amp; Continuer</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Se connecter &amp; Continuer</span>
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
            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-[11px] relative z-10 flex-1">
              
              {/* Order Recap Card */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 font-mono block">FORMULE</span>
                  <span className="font-extrabold text-white text-xs">{plan.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-400 font-mono block">
                    {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA
                  </span>
                  <span className="text-[9px] text-gray-400 block">
                    ~ {Math.round(plan.monthlyPriceFCFA / 655.957)} € / mois
                  </span>
                </div>
              </div>

              {/* Delivery Contact Verification */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/80 border border-white/5">
                <div className="space-y-0.5">
                  <label className="text-gray-400 text-[10px] block">Établissement :</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={e => setSchoolName(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="text-gray-400 text-[10px] block">WhatsApp de livraison :</label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-emerald-500 font-mono text-emerald-300 font-bold"
                  />
                </div>
              </div>

              {/* Payment Method Choice */}
              <div className="space-y-1.5">
                <label className="text-gray-300 font-semibold text-[10px] block uppercase font-mono">
                  Mode de Paiement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Wave')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      paymentMethod === 'Wave'
                        ? 'bg-sky-500/10 border-sky-400/30 text-white shadow-sm'
                        : 'bg-slate-950/60 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-sky-400 flex items-center justify-center shrink-0">
                      {paymentMethod === 'Wave' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                    </span>
                    <div>
                      <div className="font-bold text-[10px]">Wave</div>
                      <div className="text-[9px] text-gray-500">Sénégal &amp; Côte d'Ivoire</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Orange Money')}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                      paymentMethod === 'Orange Money'
                        ? 'bg-orange-500/10 border-orange-400/30 text-white shadow-sm'
                        : 'bg-slate-950/60 border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-orange-400 flex items-center justify-center shrink-0">
                      {paymentMethod === 'Orange Money' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </span>
                    <div>
                      <div className="font-bold text-[10px]">Orange Money</div>
                      <div className="text-[9px] text-gray-500">Sénégal &amp; Zone UEMOA</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-[11px] shadow flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Confirmer &amp; Payer ({plan.monthlyPriceFCFA.toLocaleString('fr-FR')} F)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* STEP 3: ORDER CONFIRMED & PAYMENT LINK                   */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-3.5 text-[11px] relative z-10 flex-1 text-center animate-in fade-in">
              
              {/* Header Badge */}
              <div className="space-y-1">
                <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white">Commande Enregistrée !</h4>
                <p className="text-[10px] text-gray-300 max-w-xs mx-auto">
                  Votre demande d'activation pour <strong>{schoolName}</strong> a été transmise.
                </p>
              </div>

              {/* Payment Box */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/20 flex items-center justify-between text-left">
                <div>
                  <span className="text-[9px] text-gray-400 block font-mono">FORMULE ET MONTANT</span>
                  <strong className="text-white text-[11px]">{plan.name}</strong>
                  <span className="text-emerald-400 font-mono font-extrabold ml-1.5">{plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <a
                  href={waveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Payer sur Wave</span>
                </a>
              </div>

              {/* Delivery Guarantee info */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-950/30 to-slate-950/70 border border-indigo-500/20 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-indigo-300 font-extrabold text-[10px] uppercase font-mono tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Validation &amp; Envoi Direct</span>
                </div>
                
                <p className="text-[10px] text-gray-300 leading-normal">
                  Dès réception et vérification de votre paiement, nous validerons votre commande et vous ferons parvenir votre clé de licence officielle. Merci pour la confiance.
                </p>

                <div className="pt-1.5 border-t border-white/5 space-y-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>WhatsApp de livraison :</span>
                    <strong className="text-emerald-300 font-bold">{whatsapp}</strong>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>E-mail de confirmation :</span>
                    <strong className="text-white truncate max-w-[170px]">{email}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-all cursor-pointer shadow active:scale-95"
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
