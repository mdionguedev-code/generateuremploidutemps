'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound
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
        setSuccessMsg("Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.");
        setIsSignUp(false);
      }
    } else {
      // Login
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (signInError) {
        console.error('Login error:', signInError);
        setError(
          signInError.message === 'Invalid login credentials'
            ? "Adresse email ou mot de passe incorrect. Veuillez vérifier votre saisie."
            : signInError.message
        );
      } else if (signInData?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', signInData.user.id)
            .maybeSingle();

          if (profile?.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/user';
          }
        } catch {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-[420px] rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-950/60 overflow-hidden"
        >
          {/* Bouton de Fermeture */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all cursor-pointer z-20"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 sm:p-7">
            {/* Header Icon & Title */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                {isForgotPassword ? (
                  <KeyRound className="w-5 h-5" />
                ) : isSignUp ? (
                  <UserPlus className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {isForgotPassword
                  ? 'Mot de Passe Oublié'
                  : isSignUp
                  ? 'Créer un Compte Établissement'
                  : 'Connexion à Diongue-IziSchool'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isForgotPassword
                  ? 'Recevez un lien sécurisé pour définir un nouveau mot de passe.'
                  : isSignUp
                  ? 'Inscrivez-vous pour générer vos emplois du temps scolaires.'
                  : 'Accédez à votre espace de gestion et vos emplois du temps.'}
              </p>
            </div>

            {/* Toggle Tabs : Se Connecter / S'inscrire */}
            {!isForgotPassword && (
              <div className="grid grid-cols-2 rounded-xl bg-slate-950/80 p-1 mb-5 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isSignUp
                      ? 'bg-slate-800 text-white shadow-sm border border-white/5'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Se Connecter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSignUp
                      ? 'bg-slate-800 text-white shadow-sm border border-white/5'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>S&apos;inscrire</span>
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre-email@domaine.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Mot de passe
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError('');
                          setSuccessMsg('');
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-semibold cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                <span>
                  {loading
                    ? 'Chargement...'
                    : isForgotPassword
                    ? 'Envoyer le lien de réinitialisation'
                    : isSignUp
                    ? 'Créer mon Compte'
                    : 'Se Connecter'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Bottom Switch Links (Visible & Clear) */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
                >
                  ← Retour à la connexion
                </button>
              ) : isSignUp ? (
                <div className="text-xs text-slate-400">
                  <span>Vous avez déjà un compte ? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer ml-1"
                  >
                    Se connecter
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  <span>Pas encore de compte ? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer ml-1"
                  >
                    S&apos;inscrire gratuitement
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


