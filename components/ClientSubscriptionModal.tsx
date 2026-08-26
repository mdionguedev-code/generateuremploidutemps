'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Key,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Clock,
  Building2,
  Check,
  X,
  Zap,
  Phone,
  HelpCircle,
  ExternalLink,
  Copy,
  Smartphone,
  QrCode
} from 'lucide-react';

import { SaaSPlan, SaaSClient, SaaSLicenseKey, PaymentMethod, SaaSGlobalSettings } from '@/lib/saasTypes';

interface ClientSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClient: SaaSClient;
  plans: SaaSPlan[];
  licenseKeys: SaaSLicenseKey[];
  settings?: SaaSGlobalSettings;
  generationCount?: number;
  maxGenerations?: number;
  exportCount?: number;
  maxExports?: number;
  onApplyLicenseKey: (keyStr: string) => { success: boolean; message: string };
  onSimulatePayment: (planId: string, paymentMethod: PaymentMethod, durationMonths: number) => void;
  onRequestUpgradeOrRenewal?: (params: {
    type: 'upgrade' | 'renewal';
    clientId: string;
    schoolName: string;
    adminName: string;
    adminEmail: string;
    whatsapp: string;
    planId: string;
    amountFCFA: number;
    durationMonths: number;
    paymentMethod: PaymentMethod;
  }) => void;
}

export default function ClientSubscriptionModal({
  isOpen,
  onClose,
  currentClient,
  plans,
  licenseKeys,
  settings,
  generationCount = 0,
  maxGenerations = 30,
  exportCount = 0,
  maxExports = 25,
  onApplyLicenseKey,
  onSimulatePayment,
  onRequestUpgradeOrRenewal
}: ClientSubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<'my_plan' | 'upgrade' | 'redeem_key'>(
    currentClient.status === 'pending_key' ? 'redeem_key' : 'my_plan'
  );
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);

  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<string>(currentClient.planId || 'plan_standard');
  const [durationMonthsForUpgrade, setDurationMonthsForUpgrade] = useState<number>(1);
  const [contactWhatsapp, setContactWhatsapp] = useState(currentClient.whatsapp || currentClient.phone || '');
  const [contactEmail, setContactEmail] = useState(currentClient.adminEmail || '');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Wave');
  const [waveTxRef, setWaveTxRef] = useState('');
  const [copiedWaveText, setCopiedWaveText] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const currentPlan = plans.find(p => p.id === currentClient.planId) || plans[0];

  const handleRedeemKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setKeySuccess(null);

    if (!inputKey.trim()) {
      setKeyError("Veuillez saisir une clé de licence valide.");
      return;
    }

    const res = onApplyLicenseKey(inputKey.trim());
    if (res.success) {
      setKeySuccess(res.message);
      setInputKey('');
    } else {
      setKeyError(res.message);
    }
  };

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingPayment(true);

    const targetPlan = plans.find(p => p.id === selectedPlanForUpgrade);
    const amount = (targetPlan?.monthlyPriceFCFA || 0) * durationMonthsForUpgrade;
    const isRenewal = selectedPlanForUpgrade === currentClient.planId;
    const reqType: 'upgrade' | 'renewal' = isRenewal ? 'renewal' : 'upgrade';

    if (onRequestUpgradeOrRenewal) {
      onRequestUpgradeOrRenewal({
        type: reqType,
        clientId: currentClient.id,
        schoolName: currentClient.schoolName,
        adminName: currentClient.adminName,
        adminEmail: contactEmail.trim() || currentClient.adminEmail,
        whatsapp: contactWhatsapp.trim() || currentClient.whatsapp || currentClient.phone,
        planId: selectedPlanForUpgrade,
        amountFCFA: amount,
        durationMonths: durationMonthsForUpgrade,
        paymentMethod: selectedMethod
      });
    }

    const waveLink = targetPlan?.wavePaymentUrl || settings?.waveConfig?.globalWaveUrl || 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE';
    try {
      window.open(waveLink, '_blank');
    } catch {
      // Ignore popup blocker errors
    }

    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentDone(true);
      if (onSimulatePayment) {
        onSimulatePayment(selectedPlanForUpgrade, selectedMethod, durationMonthsForUpgrade);
      }
      setTimeout(() => {
        setPaymentDone(false);
        onClose();
      }, 3500);
    }, 600);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shrink-0">
              <Shield className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5 truncate">
                Abonnement Établissement
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded-full font-mono uppercase">
                  SaaS
                </span>
              </h3>
              <p className="text-[10px] text-gray-400 truncate">
                {currentClient.schoolName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-400 hover:text-white p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 border border-red-500/20 transition-all cursor-pointer shadow-md"
            title="Fermer la fenêtre d'abonnement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div className="flex items-center gap-1 border-b border-white/10 pb-2 relative z-10 text-[11px] shrink-0">
          <button
            onClick={() => setActiveTab('my_plan')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'my_plan'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Formule Actuelle
          </button>
          <button
            onClick={() => {
              setActiveTab('upgrade');
              setSelectedMethod('Wave');
              setDurationMonthsForUpgrade(1);
            }}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'upgrade'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Changer d'Offre
          </button>
          <button
            onClick={() => setActiveTab('redeem_key')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              activeTab === 'redeem_key'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Key className="w-3 h-3" />
            Clé
          </button>
        </div>

        {/* SCROLLABLE BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative z-10 scrollbar-thin scrollbar-thumb-white/10 max-h-[70vh]">
          
          {/* TAB 1: MY CURRENT PLAN */}
          {activeTab === 'my_plan' && (
            <div className="space-y-3.5 text-xs relative z-10">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/20 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-mono uppercase text-indigo-400 font-bold">Actif</span>
                  <h4 className="text-base font-black text-white leading-tight">{currentPlan.name}</h4>
                  <p className="text-gray-400 text-[10px] mt-0.5">{currentPlan.description}</p>
                </div>

                <div className="text-right font-mono shrink-0">
                  <span className="block text-gray-400 text-[9px]">Expire le</span>
                  <span className="text-sm font-extrabold text-emerald-400">{currentClient.subscriptionEndDate}</span>
                  <span className="block text-gray-500 text-[9px]">Paiement: {currentClient.paymentMethod}</span>
                </div>
              </div>

              {/* QUOTAS USAGE PROGRESS (4 COLUMNS) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-gray-400 text-[10px]">
                    <span>Classes</span>
                    <span className="font-mono text-white font-bold">
                      {currentClient.classesCount}/{currentPlan.maxClasses >= 999 ? '∞' : currentPlan.maxClasses}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (currentClient.classesCount / (currentPlan.maxClasses || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-gray-400 text-[10px]">
                    <span>Enseignants</span>
                    <span className="font-mono text-white font-bold">
                      {currentClient.teachersCount}/{currentPlan.maxTeachers >= 999 ? '∞' : currentPlan.maxTeachers}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (currentClient.teachersCount / (currentPlan.maxTeachers || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-gray-400 text-[10px]">
                    <span>Générations</span>
                    <span className="font-mono text-white font-bold">
                      {generationCount}/{maxGenerations >= 9999 ? '∞' : maxGenerations}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (generationCount / (maxGenerations || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-950/60 border border-white/5 space-y-1">
                  <div className="flex justify-between items-center text-gray-400 text-[10px]">
                    <span>Exportations</span>
                    <span className="font-mono text-white font-bold">
                      {exportCount}/{maxExports >= 9999 ? '∞' : maxExports}
                    </span>
                  </div>
                  <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{
                        width: `${Math.min(100, (exportCount / (maxExports || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('upgrade')}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors cursor-pointer text-center"
              >
                Mettre à niveau mon offre
              </button>
            </div>
          )}

          {/* TAB 2: UPGRADE OR RENEW PLAN */}
          {activeTab === 'upgrade' && (
            <form onSubmit={handleUpgradeSubmit} className="space-y-3 text-xs relative z-10">
              {paymentDone ? (
                <div className="p-6 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 animate-bounce" />
                  <h4 className="text-sm font-bold text-white font-sans">
                    Demande transmise avec succès !
                  </h4>
                  <p className="text-[11px] text-gray-300">
                    Le lien de paiement Wave a été ouvert. L'administrateur validera et vous transmettra votre clé d'activation dès réception du paiement.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-gray-300 font-bold mb-1 text-[11px]">Formule d'Abonnement :</label>
                    <select
                      value={selectedPlanForUpgrade}
                      onChange={e => setSelectedPlanForUpgrade(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-white text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white text-xs">
                          {p.name} ({p.monthlyPriceFCFA === 0 ? 'Gratuit' : `${p.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA/mois`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 font-bold mb-1 text-[10px]">Email de réception :</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="admin@ecole.sn"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-bold mb-1 text-[10px]">N° WhatsApp (Livraison clé) :</label>
                      <input
                        type="tel"
                        required
                        value={contactWhatsapp}
                        onChange={e => setContactWhatsapp(e.target.value)}
                        placeholder="+221 77 123 45 67"
                        className="w-full bg-slate-950 border border-white/10 rounded-xl p-2 text-white text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-950 border border-white/5 rounded-xl">
                      <span className="block text-gray-400 text-[9px] uppercase">Type de demande</span>
                      <span className="text-white font-bold text-xs">
                        {selectedPlanForUpgrade === currentClient.planId ? 'Renouvellement (1 Mois)' : 'Mise à niveau (1 Mois)'}
                      </span>
                    </div>

                    {(() => {
                      const targetPlan = plans.find(p => p.id === selectedPlanForUpgrade);
                      const totalPrice = (targetPlan?.monthlyPriceFCFA || 0) * durationMonthsForUpgrade;
                      return (
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl font-mono text-xs flex flex-col justify-center">
                          <span className="text-indigo-400 text-[9px] uppercase">Total à régler</span>
                          <span className="text-white font-extrabold text-xs">{totalPrice.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isProcessingPayment}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      {isProcessingPayment ? (
                        <span>Enregistrement de la demande...</span>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          <span>Passer au paiement ({((plans.find(p => p.id === selectedPlanForUpgrade)?.monthlyPriceFCFA || 0) * durationMonthsForUpgrade).toLocaleString('fr-FR')} FCFA)</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* TAB 3: REDEEM LICENSE KEY */}
          {activeTab === 'redeem_key' && (
            <form onSubmit={handleRedeemKeySubmit} className="space-y-3.5 text-xs relative z-10">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                <p className="font-black flex items-center gap-1.5 mb-1 text-white">
                  <Key className="w-4 h-4 text-amber-400" />
                  Activation Obligatoire par Clé de Licence :
                </p>
                <p className="text-gray-300">
                  Votre formule et ses fonctionnalités restent verrouillées tant que vous n'avez pas renseigné votre clé de licence reçue (par WhatsApp ou Email). Collez votre clé ci-dessous pour débloquer votre accès.
                </p>
              </div>

              {keyError && (
                <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold">
                  ⚠️ {keyError}
                </div>
              )}

              {keySuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                  ✓ {keySuccess}
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Code : ex: SCH-PRO-2026-X89K..."
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-lg p-2.5 text-amber-300 font-mono font-extrabold text-xs focus:outline-none focus:border-amber-400 text-center placeholder-gray-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Valider &amp; Activer la Clé
                </button>
              </div>
            </form>
          )}

        </div>

      </motion.div>
    </div>
  );
}
