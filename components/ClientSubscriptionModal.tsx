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
  QrCode,
  Lock
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
  theme?: 'light' | 'dark';
  onApplyLicenseKey: (keyStr: string) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
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
  theme = 'dark',
  onApplyLicenseKey,
  onSimulatePayment,
  onRequestUpgradeOrRenewal
}: ClientSubscriptionModalProps) {
  const isLight = theme === 'light';
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const currentPlan = plans.find(p => p.id === currentClient.planId) || plans[0];

  const handleRedeemKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setKeySuccess(null);

    if (!inputKey.trim()) {
      setKeyError("Veuillez saisir une clé de licence valide.");
      return;
    }

    const res = await onApplyLicenseKey(inputKey.trim());
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
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 ${isLight ? "bg-slate-900/40" : "bg-slate-950/80"}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden max-h-[92vh] flex flex-col font-sans transition-all ${
          isLight
            ? "bg-white border border-gray-200/90 text-gray-900 shadow-indigo-950/15"
            : "bg-slate-900 border border-indigo-500/30 text-white"
        }`}
      >
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${isLight ? "bg-indigo-500/5 opacity-50" : "bg-indigo-500/10"}`} />

        {/* MODAL HEADER */}
        <div className={`flex items-center justify-between pb-3.5 border-b relative z-10 shrink-0 ${isLight ? "border-gray-200/80" : "border-white/10"}`}>
          <div className="flex items-center gap-3">
            <span className={`p-2.5 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${isLight ? "bg-indigo-600 text-white" : "bg-gradient-to-tr from-indigo-500 to-purple-600 text-white"}`}>
              <Shield className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className={`text-base font-black flex items-center gap-2 truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                Abonnement Établissement
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
                  SaaS
                </span>
              </h3>
              <p className={`text-xs truncate mt-0.5 ${isLight ? "text-gray-500 font-medium" : "text-gray-400"}`}>
                {currentClient.schoolName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm ${
              isLight
                ? "bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border-gray-200"
                : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border-white/10"
            }`}
            title="Fermer la fenêtre d'abonnement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div className={`flex items-center gap-1.5 border-b pb-2.5 relative z-10 text-xs shrink-0 ${isLight ? "border-gray-200/80" : "border-white/10"}`}>
          <button
            type="button"
            onClick={() => setActiveTab('my_plan')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'my_plan'
                ? 'bg-indigo-600 !text-white shadow-md shadow-indigo-600/20'
                : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white'
            }`}
          >
            Formule Actuelle
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('upgrade');
              setSelectedMethod('Wave');
              setDurationMonthsForUpgrade(1);
            }}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'upgrade'
                ? 'bg-indigo-600 !text-white shadow-md shadow-indigo-600/20'
                : isLight ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white'
            }`}
          >
            Changer d'Offre
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('redeem_key')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'redeem_key'
                ? 'bg-amber-500 !text-slate-950 font-black shadow-md shadow-amber-500/20'
                : isLight ? 'text-amber-800 hover:text-amber-900 hover:bg-amber-50' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Clé
          </button>
        </div>

        {/* SCROLLABLE BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 relative z-10 max-h-[70vh]">
          
          {/* TAB 1: MY CURRENT PLAN */}
          {activeTab === 'my_plan' && (
            <div className="space-y-4 text-xs relative z-10">
              
              {/* PLAN ACTIF HERO CARD */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 shadow-sm transition-all ${
                isLight
                  ? "bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 border-indigo-200 text-gray-900"
                  : "bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/20 text-white"
              }`}>
                <div className="space-y-1">
                  <span className={`inline-block text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded-md ${
                    isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded"
                  }`}>
                    Actif
                  </span>
                  <h4 className={`text-xl font-black leading-tight ${isLight ? "text-gray-950" : "text-white"}`}>
                    {currentPlan.name}
                  </h4>
                  <p className={`text-xs max-w-[200px] leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-400 text-[10px]"}`}>
                    {currentPlan.description}
                  </p>
                </div>

                <div className="text-right font-mono shrink-0 space-y-0.5">
                  <span className={`block text-[10px] font-medium ${isLight ? "text-gray-500" : "text-gray-400 text-[9px]"}`}>
                    Expire le
                  </span>
                  <span className={`text-sm font-black block ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    {currentClient.subscriptionEndDate}
                  </span>
                  <span className={`block text-[10px] ${isLight ? "text-gray-600 font-medium" : "text-gray-500 text-[9px]"}`}>
                    Paiement: <strong>{currentClient.paymentMethod || 'Wave'}</strong>
                  </span>
                </div>
              </div>

              {/* QUOTAS USAGE PROGRESS (4 BOXES) */}
              <div className="grid grid-cols-2 gap-3">
                
                <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm ${isLight ? "bg-gray-50/90 border-gray-200/90" : "bg-slate-950/60 border-white/5"}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? "text-gray-700 font-bold" : "text-gray-400 text-[10px]"}>Classes</span>
                    <span className={`font-mono font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>
                      {currentClient.classesCount}/{currentPlan.maxClasses >= 999 ? '∞' : currentPlan.maxClasses}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden flex ${isLight ? "bg-gray-200" : "bg-slate-900"}`}>
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (currentClient.classesCount / (currentPlan.maxClasses || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm ${isLight ? "bg-gray-50/90 border-gray-200/90" : "bg-slate-950/60 border-white/5"}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? "text-gray-700 font-bold" : "text-gray-400 text-[10px]"}>Enseignants</span>
                    <span className={`font-mono font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>
                      {currentClient.teachersCount}/{currentPlan.maxTeachers >= 999 ? '∞' : currentPlan.maxTeachers}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden flex ${isLight ? "bg-gray-200" : "bg-slate-900"}`}>
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (currentClient.teachersCount / (currentPlan.maxTeachers || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm ${isLight ? "bg-gray-50/90 border-gray-200/90" : "bg-slate-950/60 border-white/5"}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? "text-gray-700 font-bold" : "text-gray-400 text-[10px]"}>Générations</span>
                    <span className={`font-mono font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>
                      {generationCount}/{maxGenerations >= 9999 ? '∞' : maxGenerations}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden flex ${isLight ? "bg-gray-200" : "bg-slate-900"}`}>
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (generationCount / (maxGenerations || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border space-y-1.5 shadow-sm ${isLight ? "bg-gray-50/90 border-gray-200/90" : "bg-slate-950/60 border-white/5"}`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className={isLight ? "text-gray-700 font-bold" : "text-gray-400 text-[10px]"}>Exportations</span>
                    <span className={`font-mono font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>
                      {exportCount}/{maxExports >= 9999 ? '∞' : maxExports}
                    </span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden flex ${isLight ? "bg-gray-200" : "bg-slate-900"}`}>
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (exportCount / (maxExports || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

              </div>

              <button
                type="button"
                onClick={() => setActiveTab('upgrade')}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 !text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all cursor-pointer text-center active:scale-[0.99]"
              >
                Mettre à niveau mon offre
              </button>
            </div>
          )}

          {/* TAB 2: UPGRADE OR RENEW PLAN */}
          {activeTab === 'upgrade' && (
            <form onSubmit={handleUpgradeSubmit} className="space-y-3.5 text-xs relative z-10">
              {paymentDone ? (
                <div className={`p-6 text-center rounded-2xl border space-y-2 ${isLight ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"}`}>
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 animate-bounce" />
                  <h4 className={`text-sm font-black font-sans ${isLight ? "text-emerald-950" : "text-white"}`}>
                    Demande transmise avec succès !
                  </h4>
                  <p className={`text-xs ${isLight ? "text-emerald-800" : "text-gray-300"}`}>
                    Le lien de paiement Wave a été ouvert. L'administrateur validera et vous transmettra votre clé d'activation dès réception du paiement.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className={`block font-bold mb-1.5 text-xs ${isLight ? "text-gray-800" : "text-gray-300"}`}>
                      Formule d'Abonnement :
                    </label>
                    <select
                      value={selectedPlanForUpgrade}
                      onChange={e => setSelectedPlanForUpgrade(e.target.value)}
                      className={`w-full rounded-xl p-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 cursor-pointer border ${
                        isLight
                          ? "bg-white border-gray-200 text-gray-900 shadow-sm"
                          : "bg-slate-950 border-white/10 text-white"
                      }`}
                    >
                      {plans.map(p => (
                        <option key={p.id} value={p.id} className={isLight ? "bg-white text-gray-900" : "bg-slate-900 text-white"}>
                          {p.name} ({p.monthlyPriceFCFA === 0 ? 'Gratuit' : `${p.monthlyPriceFCFA.toLocaleString('fr-FR')} FCFA/mois`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block font-bold mb-1 text-[11px] ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                        Email de réception :
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={e => setContactEmail(e.target.value)}
                        placeholder="admin@ecole.sn"
                        className={`w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                          isLight
                            ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm"
                            : "bg-slate-950 border-white/10 text-white"
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block font-bold mb-1 text-[11px] ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                        N° WhatsApp (Livraison clé) :
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactWhatsapp}
                        onChange={e => setContactWhatsapp(e.target.value)}
                        placeholder="+221 77 123 45 67"
                        className={`w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500 border ${
                          isLight
                            ? "bg-white border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm"
                            : "bg-slate-950 border-white/10 text-white"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border ${isLight ? "bg-gray-50 border-gray-200" : "bg-slate-950 border-white/5"}`}>
                      <span className={`block text-[10px] uppercase font-bold ${isLight ? "text-gray-500" : "text-gray-400"}`}>Type de demande</span>
                      <span className={`font-black text-xs ${isLight ? "text-gray-900" : "text-white"}`}>
                        {selectedPlanForUpgrade === currentClient.planId ? 'Renouvellement (1 Mois)' : 'Mise à niveau (1 Mois)'}
                      </span>
                    </div>

                    {(() => {
                      const targetPlan = plans.find(p => p.id === selectedPlanForUpgrade);
                      const totalPrice = (targetPlan?.monthlyPriceFCFA || 0) * durationMonthsForUpgrade;
                      return (
                        <div className={`p-3 rounded-xl border font-mono text-xs flex flex-col justify-center ${
                          isLight ? "bg-indigo-50 border-indigo-200 text-indigo-950" : "bg-indigo-500/10 border-indigo-500/20"
                        }`}>
                          <span className={`text-[10px] uppercase font-bold ${isLight ? "text-indigo-800" : "text-indigo-400"}`}>Total à régler</span>
                          <span className={`font-black text-sm ${isLight ? "text-indigo-950" : "text-white"}`}>{totalPrice.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isProcessingPayment}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
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
            <form onSubmit={handleRedeemKeySubmit} className="space-y-4 text-xs relative z-10">
              <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                isLight ? "bg-amber-50 border-amber-200 text-amber-950 shadow-sm" : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}>
                <p className={`font-black flex items-center gap-2 text-sm ${isLight ? "text-amber-950" : "text-white"}`}>
                  <Key className="w-4 h-4 text-amber-500" />
                  Activation par Clé de Licence :
                </p>
                <p className={isLight ? "text-amber-900 text-xs" : "text-gray-300"}>
                  Renseignez votre clé de licence reçue par WhatsApp ou Email pour débloquer immédiatement votre accès.
                </p>
              </div>

              {keyError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 font-bold text-xs">
                  ⚠️ {keyError}
                </div>
              )}

              {keySuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 font-bold text-xs">
                  ✓ {keySuccess}
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Code : ex: SCH-PRO-2026-X89K..."
                  value={inputKey}
                  onChange={e => setInputKey(e.target.value)}
                  className={`w-full rounded-xl p-3 font-mono font-black text-xs text-center border transition-colors focus:outline-none ${
                    isLight
                      ? "bg-white border-amber-300 text-amber-950 placeholder-gray-400 focus:border-amber-500 shadow-sm"
                      : "bg-slate-950 border-amber-500/30 text-amber-300 placeholder-gray-600 focus:border-amber-400"
                  }`}
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 !text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <Check className="w-4 h-4" />
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
