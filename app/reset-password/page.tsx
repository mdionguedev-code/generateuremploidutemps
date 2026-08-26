'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Sparkles, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password.trim()
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2500);
      }
    } catch (err: any) {
      setError("Une erreur est survenue lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30 shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Nouveau Mot de Passe</h2>
          <p className="text-xs text-gray-400 mt-1">
            Définissez votre nouveau mot de passe pour accéder à votre espace Diongue-IziSchool.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col items-center text-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-400 animate-bounce" />
            <span className="font-bold text-sm">Mot de passe modifié avec succès !</span>
            <span className="text-gray-400">Redirection vers la page de connexion...</span>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-300 mb-1 font-semibold">Nouveau Mot de Passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 font-semibold">Confirmer le Mot de Passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              <span>{loading ? 'Mise à jour...' : 'Enregistrer le Mot de Passe'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
