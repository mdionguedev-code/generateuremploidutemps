'use client';

import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { SaaSPlan } from '@/lib/saasTypes';

interface LicensePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SaaSPlan | null;
  onPurchaseRequest: (schoolName: string, email: string, whatsapp: string, planId: string) => void;
}

export default function LicensePurchaseModal({
  isOpen,
  onClose,
  plan,
  onPurchaseRequest
}: LicensePurchaseModalProps) {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !plan) return null;

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!schoolName.trim()) {
      setError("Le nom de l'établissement est obligatoire.");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError("Veuillez entrer une adresse e-mail valide.");
      return;
    }
    if (!whatsapp.trim()) {
      setError("Le numéro WhatsApp est obligatoire pour la livraison de la clé.");
      return;
    }

    // Call the parent callback to register the activation request
    onPurchaseRequest(schoolName.trim(), email.trim(), whatsapp.trim(), plan.id);
    
    // Automatically open the payment link in a new tab
    const waveLink = plan.wavePaymentUrl || 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_GLOBAL';
    try {
      window.open(waveLink, '_blank');
    } catch {
      // Ignore popup blocker errors
    }

    // Transition to the payment confirmation step
    setStep('payment');
  };

  const handleClose = () => {
    // Reset state and close
    setStep('form');
    setSchoolName('');
    setEmail('');
    setWhatsapp('');
    setError('');
    onClose();
  };

  const waveLink = plan.wavePaymentUrl || 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_GLOBAL';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Background Decorative Gradient */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shrink-0">
                <CreditCard className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                  Achat de Clé Licence
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded-full font-mono uppercase">
                    {plan.name}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-400">
                  Formulaire d'enregistrement requis avant le paiement
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-red-400 hover:text-white p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 border border-red-500/20 transition-all cursor-pointer shadow-md"
              title="Fermer la fenêtre d'achat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form step */}
          {step === 'form' ? (
            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs relative z-10 flex-1 overflow-y-auto pr-1">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Livraison de votre clé d'activation
                </p>
                <p className="text-gray-300">
                  Veuillez remplir vos coordonnées ci-dessous. Dès réception de votre paiement, l'administrateur vous enverra votre clé par WhatsApp ou par e-mail.
                </p>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                  ⚠️ {error}
                </div>
              )}

              {/* Establishment Name */}
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
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-gray-300 font-bold text-[11px]">
                  Adresse e-mail de contact :
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="Ex: contact@lycee.sn"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* WhatsApp Number */}
              <div className="space-y-1">
                <label className="block text-gray-300 font-bold text-[11px]">
                  Numéro WhatsApp (pour recevoir la clé) :
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: +221 77 123 45 67"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Indiquez un numéro avec l'indicatif pays (ex: +221, +225, etc.) actif sur WhatsApp.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Passer au paiement ({plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA)</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs relative z-10 flex-1 text-center">
              <div className="py-4 text-emerald-400 space-y-2">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-white">Coordonnées enregistrées !</h4>
                <p className="text-[11px] text-gray-300 max-w-xs mx-auto">
                  Vos informations ont été transmises à l'administration. Veuillez maintenant procéder au paiement de votre formule.
                </p>
              </div>

              {/* Wave Payment Link Details */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/20 text-left space-y-3 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Formule :</span>
                  <span className="font-bold text-white">{plan.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Total à payer :</span>
                  <span className="font-extrabold text-emerald-400 font-mono">
                    {plan.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div className="pt-1.5">
                  <a
                    href={waveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow flex items-center justify-center gap-2 transition-all cursor-pointer decoration-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Effectuer le paiement par Wave</span>
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/5 text-gray-400 text-[10px] text-left leading-relaxed">
                ℹ️ Après règlement, le gestionnaire du SaaS vérifiera votre dossier et vous contactera sur votre WhatsApp (<strong>{whatsapp}</strong>) ou e-mail (<strong>{email}</strong>) pour vous transmettre votre clé d'activation.
              </div>

              <div className="pt-2">
                <button
                  onClick={handleClose}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Terminer &amp; Fermer
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
