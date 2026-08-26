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
  Key,
  Building2,
  AlertCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClient: (email: string) => void;
  onLoginAdmin: (email: string) => void;
  theme?: 'dark' | 'light';
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginClient,
  onLoginAdmin,
  theme = 'light'
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Auto detect role or check tab
    // SECURITY WARNING: Client-side credential checking and hardcoded secrets (like 'admin123') 
    // are only suitable for this interactive local demo/mockup. 
    // For production environments, migrate authentication to server-side auth (e.g., NextAuth.js, Firebase Auth, etc.)
    // and securely store hashes in a backend database.
    if (cleanEmail.includes('admin') || activeTab === 'admin') {
      if (password && password !== 'admin123' && password !== '1234' && password !== 'admin') {
        setError("Mot de passe/PIN Administrateur incorrect. Utilisez 'admin123' ou le bouton 1-clic.");
        return;
      }
      onLoginAdmin(cleanEmail || 'admin@izischool.com');
      onClose();
    } else {
      onLoginClient(cleanEmail || 'client@ecole.com');
      onClose();
    }
  };

  const handleQuickClientLogin = () => {
    setEmail('client@ecole.com');
    setPassword('123456');
    onLoginClient('client@ecole.com');
    onClose();
  };

  const handleQuickAdminLogin = () => {
    setEmail('admin@izischool.com');
    setPassword('admin123');
    onLoginAdmin('admin@izischool.com');
    onClose();
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

          {/* Bouton de Fermeture X Bien Visible */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border border-slate-200 dark:border-white/10 transition-all cursor-pointer z-20 shadow-xs"
            title="Fermer la boîte de connexion"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-4 sm:p-5">
            {/* Header Title Compact */}
            <div className="text-center mb-3.5 pr-6 pl-6">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mb-1.5 shadow-inner">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white font-sans tracking-tight">
                Connexion à Diongue-IziSchool
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Accédez à votre espace de gestion ou au portail SaaS
              </p>
            </div>

            {/* PRESET TEST ACCOUNTS BOX COMPACT */}
            <div className="mb-3 p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-500" />
                  Comptes de Test Fournis
                </span>
                <span className="text-[9px] bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.2 rounded-full font-mono font-semibold">
                  1-Clic
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Client Quick Account */}
                <button
                  type="button"
                  onClick={handleQuickClientLogin}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700/60 text-left hover:border-emerald-500 hover:shadow-xs transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                      <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Établissement
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    client@ecole.com
                  </p>
                </button>

                {/* Admin Quick Account */}
                <button
                  type="button"
                  onClick={handleQuickAdminLogin}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700/60 text-left hover:border-purple-500 hover:shadow-xs transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                      <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                      Admin SaaS
                    </span>
                    <span className="text-[9px] text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    admin@izischool.com
                  </p>
                </button>
              </div>
            </div>

            {/* Login Role Toggle Tabs */}
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 mb-3">
              <button
                type="button"
                onClick={() => { setActiveTab('client'); setError(''); }}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'client'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3 h-3 text-emerald-600" />
                Espace Établissement
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('admin'); setError(''); }}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3 h-3 text-purple-600" />
                Portail Admin SaaS
              </button>
            </div>

            {error && (
              <div className="mb-2.5 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Manual Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeTab === 'admin' ? "admin@izischool.com" : "votre-ecole@domaine.com"}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {activeTab === 'admin' ? 'Code PIN ou Mot de passe Admin' : 'Mot de passe'}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 rounded-lg text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1 ${
                  activeTab === 'admin'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/20'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20'
                }`}
              >
                <span>Accéder à mon tableau de bord</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Footer Notice */}
            <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3">
              En vous connectant, vous acceptez nos conditions d&apos;utilisation.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
