'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, AlertCircle, Trash2, Check } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  theme?: 'dark' | 'light';
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmation requise",
  message,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = 'danger',
  theme = 'dark',
  isLoading = false
}: ConfirmModalProps) {
  const isLight = theme === 'light';

  // Support clavier (Escape pour fermer, Enter pour valider)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Enter' && !isLoading) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm, isLoading]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isLoading) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={`relative w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden font-sans ${
            isLight
              ? 'bg-white border-slate-200/90 text-slate-900 shadow-slate-300/60'
              : 'bg-slate-900 border-white/10 text-white shadow-slate-950/80'
          }`}
        >
          {/* Lueur d'ambiance d'arrière-plan */}
          <div 
            className={`absolute -top-24 -right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none ${
              variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'
            }`} 
          />
          <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Bouton X fermer - positionné toujours en haut et à l'extrême droite */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 transition-all cursor-pointer z-30 shadow-md flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95"
            title="Fermer la boîte de dialogue"
          >
            <X className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>

          <div className="p-6 sm:p-7 relative z-10">
            {/* Icône & Titre */}
            <div className="flex items-start gap-4 mb-4 pr-8">
              <div 
                className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center border shadow-inner ${
                  variant === 'danger'
                    ? isLight
                      ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100'
                      : 'bg-red-500/10 text-red-400 border-red-500/30 shadow-red-950/30'
                    : isLight
                      ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-950/30'
                }`}
              >
                {variant === 'danger' ? (
                  <Trash2 className="w-6 h-6 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className={`text-base sm:text-lg font-black tracking-tight leading-snug ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {title}
                  </h3>
                </div>
                <span className={`inline-block text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  variant === 'danger'
                    ? isLight ? 'bg-red-100 text-red-700 border-red-200' : 'bg-red-500/20 text-red-300 border-red-500/30'
                    : isLight ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {variant === 'danger' ? 'Action critique' : 'Attention'}
                </span>
              </div>
            </div>

            {/* Corps du message */}
            <div className={`mt-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
              variant === 'danger'
                ? isLight 
                  ? 'bg-red-50/70 border-red-200 text-slate-700'
                  : 'bg-red-950/20 border-red-900/30 text-gray-200'
                : isLight
                  ? 'bg-amber-50/70 border-amber-200 text-slate-700'
                  : 'bg-amber-950/20 border-amber-900/30 text-gray-200'
            }`}>
              {message}
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-black/5 dark:border-white/5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 border-white/10 hover:border-white/20'
                }`}
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={() => {
                  onConfirm();
                }}
                disabled={isLoading}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                  variant === 'danger'
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-900/30 border border-red-500/30'
                    : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/30 border border-amber-500/30'
                }`}
              >
                {isLoading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>{confirmText}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
