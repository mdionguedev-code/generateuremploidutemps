'use client';

import React, { useState, useRef } from 'react';
import { Shield, FileText, Lock, Eye, Clock, X, Scale } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cgu' | 'cgv' | 'privacy' | 'cookies';
  theme?: 'light' | 'dark';
}

export default function LegalModal({
  isOpen,
  onClose,
  initialTab = 'cgu',
  theme = 'dark'
}: LegalModalProps) {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<'cgu' | 'cgv' | 'privacy' | 'cookies'>(initialTab);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const tabs = [
    { id: 'cgu', label: 'Conditions Générales d\'Utilisation (CGU)', icon: Scale },
    { id: 'cgv', label: 'Conditions Générales de Vente (CGV)', icon: FileText },
    { id: 'privacy', label: 'Politique de Confidentialité', icon: Lock },
    { id: 'cookies', label: 'Politique des Cookies', icon: Eye }
  ];

  return (
    <div className={`fixed inset-0 z-[110] overflow-hidden font-sans flex flex-col animate-in fade-in duration-200 ${
      isLight ? "bg-white text-slate-900" : "bg-[#0b1326] text-[#dae2fd]"
    }`}>
      
      {/* Background Glows */}
      {!isLight && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full pointer-events-none z-0 bg-[#571bc1]/10" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] blur-[140px] rounded-full pointer-events-none z-0 bg-[#22c55e]/5" />
        </>
      )}

      {/* Header bar */}
      <header className={`relative z-10 w-full px-6 py-4 flex items-center justify-between gap-4 shrink-0 border-b transition-colors ${
        isLight ? "bg-white border-gray-200 shadow-sm text-slate-900" : "bg-[#0b1326]/90 border-white/10 text-white"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
            isLight ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-indigo-500/20 text-[#4be277] border-white/10"
          }`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`font-black text-base tracking-tight flex items-center gap-2 ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              Mentions Légales &amp; Règlements
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                isLight ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/25"
              }`}>
                Planora
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2.5 rounded-xl border transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/30 hover:border-rose-500/50 hover:scale-105 active:scale-95 shadow-md shadow-rose-500/5"
          title="Fermer la fenêtre"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        
        {/* Left Sidebar navigation */}
        <aside className={`w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto ${
          isLight ? "bg-slate-50/50 border-gray-200" : "bg-slate-950/20 border-white/5"
        }`}>
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-all text-xs font-bold whitespace-nowrap cursor-pointer ${
                  isActive
                    ? isLight
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/5"
                    : isLight
                      ? "text-slate-600 hover:bg-slate-100 border border-transparent"
                      : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <TabIcon className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-400" : "text-gray-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Content Area */}
        <main 
          ref={containerRef}
          className={`flex-1 overflow-y-auto p-6 md:p-10 text-left ${
            isLight ? "bg-white" : "bg-slate-950/30"
          }`}
        >
          <article className="max-w-3xl mx-auto space-y-8 font-sans leading-relaxed text-sm">
            
            {/* --- CGU TAB --- */}
            {activeTab === 'cgu' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Conditions Générales d&apos;Utilisation (CGU)</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> En vigueur au 30 août 2026</p>
                </div>

                <p className="text-gray-300">
                  Les présentes Conditions Générales d’Utilisation (ci-après « CGU ») ont pour objet de définir les modalités de mise à disposition et d&apos;utilisation de la plateforme <strong>Planora</strong> (ci-après « la Plateforme »), service SaaS de génération et de gestion d&apos;emplois du temps scolaires.
                </p>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-indigo-300">1. Acceptation des CGU</h3>
                  <p className="text-gray-300 text-xs">
                    L&apos;accès et l&apos;utilisation de la Plateforme par l’Établissement utilisateur (ci-après « l&apos;Utilisateur » ou « l’Établissement ») sont conditionnés par l&apos;acceptation pleine et entière des présentes CGU. En créant un compte ou en accédant aux services, l&apos;Utilisateur reconnaît avoir pris connaissance des présentes CGU et s&apos;engage à les respecter sans réserve.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">2. Accès à la Plateforme et Compte</h3>
                  <p className="text-gray-300 text-xs">
                    L&apos;accès aux services requiert la création d’un compte utilisateur au moyen d’une adresse e-mail valide, d’un mot de passe sécurisé et d’informations relatives à l’établissement (nom de l’école, pays, contact WhatsApp). L’accès complet aux formules payantes s’effectue par le biais d’une clé d&apos;activation générée suite à la validation d&apos;une souscription. L’utilisation de clés contrefaites ou obtenues frauduleusement est strictement interdite.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">3. Moteur de Résolution et Utilisation</h3>
                  <p className="text-gray-300 text-xs">
                    La Plateforme propose un moteur de résolution de contraintes pour générer des emplois du temps. Les volumes horaires, affectations et contraintes saisis par l&apos;Utilisateur doivent respecter les quotas limites de son offre en vigueur. L&apos;Utilisateur reconnaît que la résolution optimale dépend de la cohérence des contraintes fournies.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">4. Comportements Interdits</h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-300 text-xs">
                    <li>Utiliser les fonctionnalités d&apos;intégration d&apos;intelligence artificielle ou de génération pour soumettre du contenu illicite ou malveillant.</li>
                    <li>Tenter d’extraire, copier, modifier ou décompiler le code source ou les algorithmes de la Plateforme.</li>
                    <li>Contourner les limites d’usage (nombre de classes, d’enseignants, de générations ou d’exports autorisés) fixées par la formule d&apos;abonnement.</li>
                  </ul>

                  <h3 className="text-base font-bold text-indigo-300">5. Propriété Intellectuelle</h3>
                  <p className="text-gray-300 text-xs">
                    La Plateforme, son interface graphique, son architecture logicielle, ses algorithmes de résolution, ses bases de données, ses logos, designs et documentations sont la propriété exclusive de l&apos;éditeur. Aucun droit de propriété intellectuelle n’est transféré à l’Utilisateur.
                  </p>
                </div>
              </div>
            )}

            {/* --- CGV TAB --- */}
            {activeTab === 'cgv' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Conditions Générales de Vente (CGV)</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> En vigueur au 30 août 2026</p>
                </div>

                <p className="text-gray-300">
                  Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les ventes d&apos;abonnements aux services SaaS de la plateforme <strong>Planora</strong> conclues entre l&apos;éditeur et les établissements scolaires ou professionnels (ci-après « le Client »).
                </p>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-indigo-300">1. Structure des Offres et Tarifs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="font-bold text-white mb-1">Offre Gratuit</h4>
                      <p className="text-gray-400 mb-1">0 FCFA / mois</p>
                      <p className="text-gray-500">2 classes, 2 enseignants, 4 générations &amp; PDF.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="font-bold text-white mb-1">Offre Standard</h4>
                      <p className="text-gray-400 mb-1">10 000 FCFA (15 €) / mois</p>
                      <p className="text-gray-500">8 classes, 15 enseignants, 30 générations &amp; PDF.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="font-bold text-white mb-1">Offre Premium</h4>
                      <p className="text-gray-400 mb-1">15 000 FCFA (23 €) / mois</p>
                      <p className="text-gray-500">20 classes, 25 enseignants, 50 générations &amp; multi-formats.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                      <h4 className="font-bold text-white mb-1">Offre School</h4>
                      <p className="text-gray-400 mb-1">30 000 FCFA (46 €) / mois</p>
                      <p className="text-gray-500">Divisions illimitées, custom branding, IA prioritaire.</p>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-indigo-300">2. Facturation et Modalités de Paiement</h3>
                  <p className="text-gray-300 text-xs">
                    Les abonnements sont payables par Wave, Orange Money, Carte Bancaire, Virement, ou par activation via Clé de Licence prépayée. Après vérification du paiement, une clé d&apos;activation est transmise au client (par WhatsApp ou e-mail) pour débloquer les limites de son forfait.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">3. Durée, Renouvellement et Résiliation</h3>
                  <p className="text-gray-300 text-xs">
                    L&apos;abonnement est conclu pour la durée choisie (mensuelle, trimestrielle ou annuelle). À l&apos;expiration de la période prépayée, si aucune clé de renouvellement n&apos;est activée, le compte est automatiquement basculé sur la formule gratuite, limitant les actions de l&apos;Utilisateur. La résiliation peut s&apos;effectuer à tout moment depuis l&apos;espace client.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">4. Limitation du Droit de Rétractation</h3>
                  <p className="text-gray-300 text-xs">
                    S&apos;adressant exclusivement à des professionnels (divisions d&apos;études d&apos;établissements scolaires), les ventes d&apos;abonnements sur Planora sont fermes et définitives dès la génération de la clé de licence.
                  </p>
                </div>
              </div>
            )}

            {/* --- PRIVACY TAB --- */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Politique de Confidentialité</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> En vigueur au 30 août 2026</p>
                </div>

                <p className="text-gray-300">
                  La présente Politique décrit nos pratiques relatives à la collecte, au traitement et à la protection des données à caractère personnel de vos établissements scolaires, dans le strict respect de la réglementation applicable en matière de protection des données (notamment le RGPD).
                </p>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-indigo-300">1. Données Personnelles Traitées</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-300 text-xs">
                    <li><strong>Données de comptes</strong> : Adresse e-mail, identifiant unique de l&apos;administrateur, numéro WhatsApp.</li>
                    <li><strong>Données de l&apos;établissement</strong> : Nom de l&apos;école, slogan, logo.</li>
                    <li><strong>Données pédagogiques</strong> : Noms des enseignants, matières, indisponibilités, grilles de cours et emplois du temps générés.</li>
                    <li><strong>Données de paiement</strong> : Statut de transaction et détails de la clé de licence.</li>
                  </ul>

                  <h3 className="text-base font-bold text-indigo-300">2. Finalités et Bases Légales</h3>
                  <p className="text-gray-300 text-xs">
                    Le traitement de ces données est nécessaire à l&apos;exécution du contrat de service (générer les plannings scolaires, éditer les exports, assurer la facturation et le support technique) ou relève de notre intérêt légitime à sécuriser nos infrastructures applicatives.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">3. Conservation et Confidentialité</h3>
                  <p className="text-gray-300 text-xs">
                    Les données pédagogiques sont conservées tant que le compte de l&apos;établissement reste actif. En cas d&apos;inactivité prolongée supérieure à 24 mois, ou sur demande explicite, toutes les données associées sont purgées de nos serveurs sécurisés. Nous ne vendons, ni ne louons, ni ne partageons vos fichiers scolaires avec des tiers.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">4. Vos Droits et Demandes d&apos;Effacement</h3>
                  <p className="text-gray-300 text-xs">
                    Vous disposez d&apos;un droit d&apos;accès, de rectification, de portabilité et de suppression de vos données personnelles. Pour toute demande d&apos;effacement ou exercice de vos droits, vous pouvez contacter notre adresse e-mail dédiée : <strong>m.diongue.dev@gmail.com</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* --- COOKIES TAB --- */}
            {activeTab === 'cookies' && (
              <div className="space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-extrabold tracking-tight text-white mb-2">Politique des Cookies &amp; Traceurs</h2>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> En vigueur au 30 août 2026</p>
                </div>

                <p className="text-gray-300">
                  Cette politique explique l&apos;usage que nous faisons des cookies et traceurs locaux lors de votre navigation sur la plateforme Planora.
                </p>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-indigo-300">1. Qu&apos;est-ce qu&apos;un Traceur ?</h3>
                  <p className="text-gray-300 text-xs">
                    Il s&apos;agit de fichiers ou de clés de stockage local (tels que le <i>localStorage</i> ou les <i>sessionCookies</i>) déposés dans votre navigateur pour stocker des préférences d&apos;affichage ou maintenir votre connexion active.
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">2. Traceurs Techniques Essentiels (Indispensables)</h3>
                  <p className="text-gray-300 text-xs">
                    Nous utilisons des clés de stockage local pour :
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-300 text-xs">
                    <li>Conserver votre session authentifiée de manière sécurisée durant vos opérations.</li>
                    <li>Sauvegarder vos préférences d&apos;affichage (Thème Sombre ou Clair).</li>
                    <li>Retenir de manière fluide la classe active ou l&apos;enseignant sélectionné sur l&apos;écran de configuration pour vous éviter des clics répétés.</li>
                  </ul>
                  <p className="text-gray-300 text-xs">
                    <i>Ces traceurs sont techniquement obligatoires et ne requièrent pas de consentement préalable car ils permettent au service SaaS de fonctionner.</i>
                  </p>

                  <h3 className="text-base font-bold text-indigo-300">3. Gestion et Consentement</h3>
                  <p className="text-gray-300 text-xs">
                    Aucun cookie publicitaire ou traceur de ciblage tiers n&apos;est implanté sur la Plateforme. Les traceurs requis pour les transactions sont exclusivement instanciés au moment de la transaction financière. Vous pouvez bloquer ou vider ces traceurs à tout moment via les paramètres de confidentialité de votre propre navigateur internet.
                  </p>
                </div>
              </div>
            )}

            {/* --- GENERAL WARNING / HELP FOOTER --- */}
            <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-500 font-medium">Pour toute question ou réclamation relative à ces règlements, contactez : m.diongue.dev@gmail.com</p>
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white font-bold transition-all shrink-0 cursor-pointer"
              >
                Fermer la fenêtre
              </button>
            </div>
            
          </article>
        </main>

      </div>
    </div>
  );
}
