'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  Shield,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Building2,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function AuthModal({
  isOpen,
  onClose,
  theme = 'light'
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    if (isForgotPassword) {
      setLoading(true);
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${origin}/reset-password`,
        });
        if (resetError) {
          setError(resetError.message);
        } else {
          setSuccessMsg("Un lien sécurisé de réinitialisation a été envoyé à votre adresse email.");
        }
      } catch (err: any) {
        setError("Erreur lors de l'envoi de la demande.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password.trim()) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      // Sign Up
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccessMsg("Inscription réussie ! Vérifiez votre email ou connectez-vous.");
        setIsSignUp(false);
      }
    } else {
      // Login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (signInError) {
        setError("Identifiants incorrects. Vérifiez votre email ou mot de passe.");
      } else if (signInData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', signInData.user.id)
          .single();

        if (profile?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/user';
        }
        return;
      } else {
        window.location.href = '/';
      }
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          className="relative w-full max-w-[430px] rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Top Banner Gradient */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

          {/* Bouton de Fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer z-20 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-4 sm:p-5">
            <div className="text-center mb-4 pr-6 pl-6">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-1.5 shadow-inner">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-sans tracking-tight">
                {isForgotPassword 
                  ? 'Réinitialiser votre mot de passe'
                  : isSignUp 
                  ? 'Créer un compte' 
                  : 'Connexion à Diongue-IziSchool'}
              </h3>
              {isForgotPassword && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Saisissez l&apos;adresse email de votre compte pour recevoir un lien de réinitialisation.
                </p>
              )}
            </div>

            {/* Login Role Toggle Tabs */}
            {!isForgotPassword && (
              <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 mb-3">
                <button
                  type="button"
                  onClick={() => { setActiveTab('client'); setError(''); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'client'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3 h-3 text-emerald-600" />
                  Espace Client
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('admin'); setError(''); setSuccessMsg(''); }}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3 h-3 text-purple-600" />
                  Portail Admin
                </button>
              </div>
            )}

            {error && (
              <div className="mb-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-2.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-300 text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Manual Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre-email@domaine.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Mot de passe
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-lg text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                } ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                }`}
              >
                <span>
                  {loading 
                    ? 'Chargement...' 
                    : isForgotPassword 
                    ? 'Envoyer le lien de réinitialisation'
                    : (isSignUp ? 'S\'inscrire' : 'Se Connecter')}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-4 text-center space-y-1.5">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
                >
                  ← Retour à la connexion
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg(''); }}
                  className="text-[11px] text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {isSignUp 
                    ? "Vous avez déjà un compte ? Connectez-vous" 
                    : "Pas encore de compte ? S'inscrire librement"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

