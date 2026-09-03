'use client';

import React, { useState, useEffect } from 'react';
import DocumentationView from './DocumentationView';
import LicensePurchaseModal from './LicensePurchaseModal';
import LegalModal from './LegalModal';
import { SaaSPlan, PaymentMethod } from '@/lib/saasTypes';

interface LandingPageProps {
  onOpenLogin: () => void;
  onDirectDemoClient: () => void;
  onDirectDemoAdmin: () => void;
  onPurchaseLicenseRequest: (
    schoolName: string,
    email: string,
    whatsapp: string,
    planId: string,
    adminName?: string,
    userId?: string,
    paymentMethod?: PaymentMethod
  ) => void;
  plans: SaaSPlan[];
  theme?: 'dark' | 'light';
}

export default function LandingPage({
  onOpenLogin,
  onDirectDemoClient,
  onDirectDemoAdmin,
  onPurchaseLicenseRequest,
  plans,
  theme = 'dark'
}: LandingPageProps) {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<SaaSPlan | null>(null);

  const testimonials = React.useMemo(() => [
    {
      id: 1,
      name: "M. Malick Ndiaye",
      role: "Proviseur",
      initials: "MN",
      text: "La qualité des emplois du temps générés par Planora est exceptionnelle. Les heures de cours de 1h s'enchaînent de manière fluide, et le découpage des volumes horaires impairs respecte parfaitement notre cahier des charges, sans aucun conflit de professeur.",
      stars: 5,
      glowColor: "from-[#571bc1]/10"
    },
    {
      id: 2,
      name: "Mme Astou Fall",
      role: "Responsable des Études",
      initials: "AF",
      text: "Ce générateur a révolutionné la préparation de notre rentrée. Les contraintes complexes, comme les pauses de l'établissement ou le positionnement prioritaire de l'EPS, sont intégrées avec une rigueur absolue. L'emploi du temps final est d'une grande fluidité.",
      stars: 5,
      glowColor: "from-[#4be277]/10"
    },
    {
      id: 3,
      name: "M. Amadou Diop",
      role: "Directeur des Enseignements",
      initials: "AD",
      text: "La précision du solveur quant à l'optimisation des grilles horaires de cours est irréprochable. Nos enseignants ne subissent plus de trous dans leurs plannings et les journées des élèves sont harmonieuses et sans heures perdues.",
      stars: 5,
      glowColor: "from-[#ffba61]/10"
    },
    {
      id: 4,
      name: "Mme Mariama Sow",
      role: "Censeur",
      initials: "MS",
      text: "L'intelligence artificielle de Planora assure une répartition optimale et équilibrée. De plus, la détection de conflit en temps réel sur les ajustements manuels nous apporte une sérénité totale lors des derniers réglages d'effectifs.",
      stars: 5,
      glowColor: "from-[#d0bcff]/10"
    },
    {
      id: 5,
      name: "M. Ousmane Diallo",
      role: "Secrétaire Général",
      initials: "OD",
      text: "La clarté des plannings générés et la diversité des formats d'exports (PDF, Word, Excel) facilitent grandement la communication avec les équipes pédagogiques. Chaque professeur dispose instantanément d'une fiche claire et propre.",
      stars: 5,
      glowColor: "from-[#4be277]/10"
    }
  ], []);



  const handleChoosePlan = (planId: string) => {
    const foundPlan = plans.find(p => p.id === planId);
    if (foundPlan) {
      setSelectedPlanForPurchase(foundPlan);
      setIsPurchaseModalOpen(true);
    }
  };
  const [activeStep, setActiveStep] = useState<number>(0);
  const [visibleSteps, setVisibleSteps] = useState<boolean[]>([false, false, false, false, false]);
  const [isDocOpen, setIsDocOpen] = useState<boolean>(false);
  const [isLegalOpen, setIsLegalOpen] = useState<boolean>(false);
  const [legalTab, setLegalTab] = useState<'cgu' | 'cgv' | 'privacy' | 'cookies'>('cgu');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const steps = document.querySelectorAll('.step-item');
          if (steps.length === 0) {
            ticking = false;
            return;
          }

          const newVisible = [false, false, false, false, false];
          let highestActive = 0;

          steps.forEach((step) => {
            const rect = step.getBoundingClientRect();
            const index = parseInt(step.getAttribute('data-index') || '0', 10);
            
            // Visible si dans la fenêtre d'affichage (haut ou bas)
            if (rect.top < window.innerHeight * 0.92 && rect.bottom > 20) {
              newVisible[index] = true;
            }

            // Étape active dès qu'elle passe au-dessus de 65% de la hauteur d'écran
            if (rect.top < window.innerHeight * 0.65) {
              if (index + 1 > highestActive) {
                highestActive = index + 1;
              }
            }
          });

          setVisibleSteps(newVisible);
          setActiveStep(highestActive);
          ticking = false;
        });
        ticking = true;
      }
    };

    // Exécution initiale immédiate au montage du composant
    handleScroll();
    const timer1 = setTimeout(handleScroll, 50);
    const timer2 = setTimeout(handleScroll, 200);

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const getTimelineProgress = () => {
    switch (activeStep) {
      case 1: return '10%';
      case 2: return '30%';
      case 3: return '52%';
      case 4: return '75%';
      case 5: return '100%';
      default: return '0%';
    }
  };

  return (
    <div className="dark">
      {/* Font & Material Symbols stylesheets */}
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      
      <style>{`
        .hanken-font {
          font-family: 'Hanken Grotesk', sans-serif;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
        .glass-panel-hover {
          transition: all 0.30s ease;
        }
        .glass-panel-hover:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(75, 226, 119, 0.3);
        }
        .text-gradient-primary {
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          background-image: linear-gradient(to right, #d0bcff, #4be277);
        }
        .btn-primary {
          background-image: linear-gradient(to right, #571bc1, #22c55e);
          color: #ffffff;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.8125rem;
          transition: opacity 0.2s ease, transform 0.2s ease;
          box-shadow: 0 0 15px rgba(75, 226, 119, 0.3);
        }
        .btn-primary:hover {
          opacity: 0.9;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #dae2fd;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.8125rem;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="hanken-font bg-[#0b1326] text-[#dae2fd] antialiased min-h-screen flex flex-col relative overflow-x-hidden selection:bg-[#4be277]/30 selection:text-white">
        
        {/* Background Accents matching Stitch */}
        <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#571bc1]/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#22c55e]/10 blur-[150px] rounded-full pointer-events-none z-0"></div>

        {/* --- NAVIGATION --- */}
        <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-[#0b1326]/80 backdrop-blur-md border-b border-white/10">
          <a className="text-xl md:text-2xl font-bold text-[#dae2fd] flex items-center gap-2" href="#">
            <span className="material-symbols-outlined text-[#4be277]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            Planora
          </a>
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <a className="text-xs font-medium text-[#bccbb9] hover:text-[#dae2fd] transition-colors hover:bg-white/5 rounded-lg px-3 py-2" href="#features">Fonctionnalités</a>
            <a className="text-xs font-medium text-[#bccbb9] hover:text-[#dae2fd] transition-colors hover:bg-white/5 rounded-lg px-3 py-2" href="#how-it-works">Comment ça marche</a>
            <button 
              onClick={() => setIsDocOpen(true)}
              className="text-xs font-medium text-[#bccbb9] hover:text-[#4be277] transition-colors hover:bg-white/5 rounded-lg px-3 py-2 cursor-pointer bg-transparent border-0 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-indigo-400">menu_book</span>
              <span>Documentation</span>
            </button>
            <a className="text-xs font-medium text-[#bccbb9] hover:text-[#dae2fd] transition-colors hover:bg-white/5 rounded-lg px-3 py-2" href="#testimonials">Témoignages</a>
            <a className="text-xs font-medium text-[#bccbb9] hover:text-[#dae2fd] transition-colors hover:bg-white/5 rounded-lg px-3 py-2" href="#pricing">Tarifs</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onOpenLogin} 
              className="hidden lg:block text-xs font-bold text-[#4be277] hover:text-white hover:bg-[#4be277]/10 border border-[#4be277]/30 hover:border-[#4be277]/60 px-4 py-2 rounded-xl transition-all cursor-pointer bg-transparent"
            >
              Connexion
            </button>
            <button onClick={onOpenLogin} className="btn-primary hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
              Commencer gratuitement
            </button>
          </div>
        </nav>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-grow z-10 relative mt-[80px]">
          
          {/* HERO SECTION */}
          <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 flex flex-col gap-6 relative z-10 text-left">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-max">
                <span className="material-symbols-outlined text-[#4be277] text-[16px]">bolt</span>
                <span className="text-xs font-medium text-[#bccbb9]">Propulsé par l&apos;IA</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#dae2fd] leading-tight tracking-tight">
                Automatisez vos emplois du temps en <span className="text-gradient-primary">quelques secondes</span>.
              </h1>
              <p className="text-base sm:text-lg text-[#bccbb9] max-w-xl leading-relaxed">
                Simplifiez la planification de votre rentrée scolaire. Notre moteur d&apos;intelligence artificielle résout instantanément les contraintes les plus complexes pour générer des emplois du temps optimisés, harmonieux et sans aucun conflit.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <button onClick={onOpenLogin} className="btn-primary hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer">
                  Essayer Planora gratuitement
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
                <button 
                  type="button" 
                  className="btn-secondary hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                  title="Vidéo de démonstration bientôt disponible"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  Voir la démo (1 min)
                </button>
              </div>

              {/* STATS RATING */}
              <div className="flex items-center gap-4 mt-4">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#2d3449] border-2 border-[#0b1326] flex items-center justify-center text-xs text-white font-bold">MD</div>
                  <div className="w-8 h-8 rounded-full bg-[#2d3449] border-2 border-[#0b1326] flex items-center justify-center text-xs text-white font-bold">AL</div>
                  <div className="w-8 h-8 rounded-full bg-[#2d3449] border-2 border-[#0b1326] flex items-center justify-center text-xs text-white font-bold">SF</div>
                </div>
                <span className="text-xs font-semibold text-[#bccbb9]">+ de 10 000 plannings générés</span>
              </div>

            </div>

            {/* HERO RIGHT VISUAL (Stitch generated image preview) */}
            <div className="lg:w-1/2 w-full relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#571bc1]/30 to-[#4be277]/30 blur-[80px] rounded-full z-0"></div>
              <img 
                alt="Planora interface preview" 
                className="relative z-10 w-full rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 transition-transform duration-700 hover:scale-[1.01]" 
                src="/hero_image.png"
              />
            </div>
          </section>

          {/* --- FEATURES SECTION --- */}
          <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto text-center relative z-10" id="features">
            <div className="max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-extrabold text-[#dae2fd] mb-4">
                La complexité, <span className="text-gradient-primary">rendue simple.</span>
              </h2>
              <p className="text-base sm:text-lg text-[#bccbb9]">
                Ne passez plus des heures sur des tableurs. Planora gère les contraintes pour vous.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
              
              {/* Feature 1 */}
              <div className="glass-panel glass-panel-hover p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4be277]/10 rounded-full blur-[40px] group-hover:bg-[#4be277]/20 transition-all"></div>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-[#4be277]">
                  <span className="material-symbols-outlined">auto_awesome</span>
                </div>
                <h3 className="text-xl font-bold text-[#dae2fd] mb-3">Génération instantanée</h3>
                <p className="text-sm text-[#bccbb9] leading-relaxed">
                  Laissez notre IA calculer des millions de combinaisons pour trouver le planning parfait en quelques secondes.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel glass-panel-hover p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d0bcff]/10 rounded-full blur-[40px] group-hover:bg-[#d0bcff]/20 transition-all"></div>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-[#d0bcff]">
                  <span className="material-symbols-outlined">pan_tool</span>
                </div>
                <h3 className="text-xl font-bold text-[#dae2fd] mb-3">Simplicité Drag &amp; Drop</h3>
                <p className="text-sm text-[#bccbb9] leading-relaxed">
                  Ajustez manuellement les résultats si besoin avec une interface fluide et intuitive. Les conflits sont signalés en temps réel.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel glass-panel-hover p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffba61]/10 rounded-full blur-[40px] group-hover:bg-[#ffba61]/20 transition-all"></div>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-[#ffba61]">
                  <span className="material-symbols-outlined">rule_settings</span>
                </div>
                <h3 className="text-xl font-bold text-[#dae2fd] mb-3">Gestion des contraintes</h3>
                <p className="text-sm text-[#bccbb9] leading-relaxed">
                  Disponibilités des profs, salles spécifiques, regroupements de classes... Planora intègre toutes vos règles métier.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="glass-panel glass-panel-hover p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#22c55e]/10 rounded-full blur-[40px] group-hover:bg-[#22c55e]/20 transition-all"></div>
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center mb-6 text-[#6bff8f]">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <h3 className="text-xl font-bold text-[#dae2fd] mb-3">Multi-accès</h3>
                <p className="text-sm text-[#bccbb9] leading-relaxed">
                  Collaboration entre administrateurs. Travaillez en équipe sur les mêmes plannings en temps réel.
                </p>
              </div>

            </div>
          </section>

          {/* --- HOW IT WORKS SECTION (5 ÉTAPES DU SAAS) --- */}
          <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10 border-t border-white/5" id="how-it-works">
            <h2 className="text-3xl md:text-4xl font-bold text-[#dae2fd] text-center mb-4">
              Comment fonctionne Planora en <span className="text-[#4be277]">5 étapes</span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 text-center max-w-2xl mx-auto mb-20">
              Un parcours guidé de bout en bout pour concevoir l'emploi du temps parfait de votre établissement scolaire en quelques minutes.
            </p>
            
            <div className="relative max-w-4xl mx-auto">
              {/* Vertical Timeline Line Background */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[3px] bg-white/10 transform -translate-x-1/2 rounded-full overflow-hidden">
                {/* Foreground Timeline Progress Line */}
                <div 
                  className="w-full bg-gradient-to-b from-[#4be277] to-[#571bc1] transition-all duration-700 ease-out origin-top"
                  style={{ height: getTimelineProgress() }}
                />
              </div>
              
              {/* Step 1: Jours & Horaires */}
              <div className="step-item flex flex-col md:flex-row items-center justify-between mb-20 relative" data-index="0">
                <div className={`md:w-5/12 text-right pr-0 md:pr-12 mb-6 md:mb-0 transition-all duration-1000 ease-out transform ${
                  visibleSteps[0] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                }`}>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#4be277]/10 border border-[#4be277]/20 text-[#4be277] font-mono text-xs font-bold mb-2">
                    Étape 1
                  </div>
                  <h3 className="text-xl font-bold text-[#dae2fd] mb-2">1. Jours &amp; Plages Horaires</h3>
                  <p className="text-sm text-[#bccbb9] leading-relaxed">
                    Définissez les jours de la semaine (Lundi à Samedi) et l&apos;amplitude horaire quotidienne (8h à 22h). Toutes les grilles s&apos;adaptent instantanément.
                  </p>
                </div>
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b1326] rounded-full flex items-center justify-center z-10 hidden md:flex font-bold transition-all duration-500 border-2 ${
                  activeStep >= 1 
                    ? 'border-[#4be277] text-[#4be277] scale-110 shadow-[0_0_15px_rgba(75,226,119,0.5)]' 
                    : 'border-white/20 text-white/40 scale-100'
                }`}>1</div>
                <div className={`md:w-5/12 pl-0 md:pl-12 transition-all duration-1000 ease-out delay-150 transform ${
                  visibleSteps[0] ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-95'
                }`}>
                  <div className="glass-panel p-6 flex items-center gap-4 bg-[#131b2e]/50 text-left border-[#4be277]/20">
                    <div className="w-12 h-12 rounded-2xl bg-[#4be277]/20 flex items-center justify-center text-[#4be277] shrink-0">
                      <span className="material-symbols-outlined text-2xl">schedule</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Semaine &amp; Amplitude</div>
                      <div className="text-[11px] text-[#4be277] font-mono mt-0.5">Lundi - Samedi (6j) • 8h - 18h</div>
                      <div className="h-1.5 w-28 bg-white/10 rounded mt-2 overflow-hidden">
                        <div className="h-full bg-[#4be277] w-full rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Step 2: Matières */}
              <div className="step-item flex flex-col md:flex-row-reverse items-center justify-between mb-20 relative" data-index="1">
                <div className={`md:w-5/12 text-left pl-0 md:pl-12 mb-6 md:mb-0 transition-all duration-1000 ease-out transform ${
                  visibleSteps[1] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                }`}>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#0dd59a]/10 border border-[#0dd59a]/20 text-[#0dd59a] font-mono text-xs font-bold mb-2">
                    Étape 2
                  </div>
                  <h3 className="text-xl font-bold text-[#dae2fd] mb-2">2. Référentiel des Matières</h3>
                  <p className="text-sm text-[#bccbb9] leading-relaxed">
                    Enregistrez la liste de toutes vos disciplines d&apos;enseignement (Maths, Français, SVT...) avec leurs pastilles de couleurs distinctives.
                  </p>
                </div>
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b1326] rounded-full flex items-center justify-center z-10 hidden md:flex font-bold transition-all duration-500 border-2 ${
                  activeStep >= 2 
                    ? 'border-[#0dd59a] text-[#0dd59a] scale-110 shadow-[0_0_15px_rgba(13,213,154,0.5)]' 
                    : 'border-white/20 text-white/40 scale-100'
                }`}>2</div>
                <div className={`md:w-5/12 pr-0 md:pr-12 transition-all duration-1000 ease-out delay-150 transform ${
                  visibleSteps[1] ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-12 scale-95'
                }`}>
                  <div className="glass-panel p-6 flex flex-col gap-2.5 bg-[#131b2e]/50 border-[#0dd59a]/25 text-left">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"></span>Mathématiques</span>
                      <span className="text-[#0dd59a] font-mono text-[10px]">#3b82f6</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>Sciences Physiques</span>
                      <span className="text-[#0dd59a] font-mono text-[10px]">#10b981</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>Histoire-Géographie</span>
                      <span className="text-[#0dd59a] font-mono text-[10px]">#f59e0b</span>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Step 3: Professeurs */}
              <div className="step-item flex flex-col md:flex-row items-center justify-between mb-20 relative" data-index="2">
                <div className={`md:w-5/12 text-right pr-0 md:pr-12 mb-6 md:mb-0 transition-all duration-1000 ease-out transform ${
                  visibleSteps[2] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                }`}>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/20 text-[#818cf8] font-mono text-xs font-bold mb-2">
                    Étape 3
                  </div>
                  <h3 className="text-xl font-bold text-[#dae2fd] mb-2">3. Fiches Enseignants &amp; Quotas</h3>
                  <p className="text-sm text-[#bccbb9] leading-relaxed">
                    Enregistrez vos professeurs, allouez-leur un quota d&apos;heures hebdomadaires contractuel (1h à 30h) et filtrez interactivement leurs indisponibilités ou temps partiels.
                  </p>
                </div>
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b1326] rounded-full flex items-center justify-center z-10 hidden md:flex font-bold transition-all duration-500 border-2 ${
                  activeStep >= 3 
                    ? 'border-[#4f46e5] text-[#818cf8] scale-110 shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                    : 'border-white/20 text-white/40 scale-100'
                }`}>3</div>
                <div className={`md:w-5/12 pl-0 md:pl-12 transition-all duration-1000 ease-out delay-150 transform ${
                  visibleSteps[2] ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-95'
                }`}>
                  <div className="glass-panel p-6 flex items-center gap-4 bg-[#131b2e]/50 border-[#4f46e5]/25 text-left">
                    <div className="flex -space-x-2 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/60 border-2 border-[#131b2e] flex items-center justify-center text-xs text-white font-bold">MD</div>
                      <div className="w-10 h-10 rounded-full bg-purple-600/60 border-2 border-[#131b2e] flex items-center justify-center text-xs text-white font-bold">MS</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-white font-bold truncate">M. Diongue (Maths)</span>
                        <span className="text-[#818cf8] font-mono text-[10px] font-bold shrink-0">18h/sem</span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]"></span>
                        <span>Mercredi &amp; Samedi libérés (X)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Step 4: Classes & Affectations */}
              <div className="step-item flex flex-col md:flex-row-reverse items-center justify-between mb-20 relative" data-index="3">
                <div className={`md:w-5/12 text-left pl-0 md:pl-12 mb-6 md:mb-0 transition-all duration-1000 ease-out transform ${
                  visibleSteps[3] ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                }`}>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#9333ea]/10 border border-[#9333ea]/20 text-[#c084fc] font-mono text-xs font-bold mb-2">
                    Étape 4
                  </div>
                  <h3 className="text-xl font-bold text-[#dae2fd] mb-2">4. Classes &amp; Affectations</h3>
                  <p className="text-sm text-[#bccbb9] leading-relaxed">
                    Créez vos divisions d&apos;élèves et associez chaque discipline au professeur attitré avec son volume d&apos;heures par semaine (quantum).
                  </p>
                </div>
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b1326] rounded-full flex items-center justify-center z-10 hidden md:flex font-bold transition-all duration-500 border-2 ${
                  activeStep >= 4 
                    ? 'border-[#9333ea] text-[#c084fc] scale-110 shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                    : 'border-white/20 text-white/40 scale-100'
                }`}>4</div>
                <div className={`md:w-5/12 pr-0 md:pr-12 transition-all duration-1000 ease-out delay-150 transform ${
                  visibleSteps[3] ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-12 scale-95'
                }`}>
                  <div className="glass-panel p-6 flex flex-col gap-2 bg-[#131b2e]/50 border-[#9333ea]/25 text-left">
                    <div className="text-xs font-bold text-white flex justify-between items-center mb-1">
                      <span>Terminale S1</span>
                      <span className="text-[#c084fc] font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded">28h/sem</span>
                    </div>
                    <div className="text-[11px] text-gray-300 flex justify-between">
                      <span>Mathématiques • M. Diongue</span>
                      <span className="font-bold text-white font-mono">5h</span>
                    </div>
                    <div className="text-[11px] text-gray-300 flex justify-between">
                      <span>Sciences Physiques • Mme Sow</span>
                      <span className="font-bold text-white font-mono">4h</span>
                    </div>
                  </div>
                </div>
              </div>
 
              {/* Step 5: Emploi du Temps & Résolution IA */}
              <div className="step-item flex flex-col md:flex-row items-center justify-between relative" data-index="4">
                <div className={`md:w-5/12 text-right pr-0 md:pr-12 mb-6 md:mb-0 transition-all duration-1000 ease-out transform ${
                  visibleSteps[4] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
                }`}>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#571bc1]/10 border border-[#571bc1]/20 text-[#d0bcff] font-mono text-xs font-bold mb-2">
                    Étape 5
                  </div>
                  <h3 className="text-xl font-bold text-[#dae2fd] mb-2">5. Résolution IA &amp; Multi-Exports</h3>
                  <p className="text-sm text-[#bccbb9] leading-relaxed">
                    Laissez l&apos;algorithme mathématique générer un emploi du temps 100% optimal sans aucun conflit en quelques secondes, ajustez par glisser-déposer et exportez en PDF, Word ou Excel.
                  </p>
                </div>
                <div className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#0b1326] rounded-full flex items-center justify-center z-10 hidden md:flex font-bold transition-all duration-500 border-2 ${
                  activeStep >= 5 
                    ? 'border-[#571bc1] text-[#d0bcff] scale-110 shadow-[0_0_15px_rgba(87,27,193,0.5)]' 
                    : 'border-white/20 text-white/40 scale-100'
                }`}>5</div>
                <div className={`md:w-5/12 pl-0 md:pl-12 transition-all duration-1000 ease-out delay-150 transform ${
                  visibleSteps[4] ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-95'
                }`}>
                  <div className="glass-panel p-6 flex flex-col items-center justify-center bg-[#131b2e]/50 border-[#571bc1]/20 relative overflow-hidden text-center">
                    <div className="absolute inset-0 bg-[#571bc1]/5 animate-pulse"></div>
                    <span className="material-symbols-outlined text-[#d0bcff] text-4xl mb-1.5 animate-spin-slow">auto_awesome</span>
                    <span className="text-xs font-mono text-[#d0bcff] relative z-10 font-bold mb-3">Zéro Conflit Garanti • 100%</span>
                    <div className="flex items-center gap-1.5 relative z-10">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">PDF</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">WORD</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">EXCEL</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* --- TESTIMONIALS SECTION --- */}
          <section className="py-24 px-0 relative z-10 border-t border-white/5 overflow-hidden" id="testimonials">
            {/* Inject infinite marquee keyframes inline */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes marqueeContinuous {
                0% {
                  transform: translateX(0);
                }
                100% {
                  transform: translateX(-50%);
                }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marqueeContinuous 40s linear infinite;
              }
              .marquee-track:hover {
                animation-play-state: paused;
              }
            `}} />

            <h2 className="text-3xl md:text-4xl font-bold text-[#dae2fd] text-center mb-12 px-6">
              Ils nous font <span className="text-gradient-primary">confiance</span>
            </h2>
            
            <div className="relative w-full overflow-hidden py-4">
              {/* Left and Right Fade overlays for premium glass-morphism feel */}
              <div className="absolute top-0 left-0 bottom-0 w-12 md:w-32 bg-gradient-to-r from-[#0b1326] via-[#0b1326]/80 to-transparent z-20 pointer-events-none" />
              <div className="absolute top-0 right-0 bottom-0 w-12 md:w-32 bg-gradient-to-l from-[#0b1326] via-[#0b1326]/80 to-transparent z-20 pointer-events-none" />

              {/* Infinite scrolling track */}
              <div className="marquee-track">
                {/* Render the list twice to guarantee seamless wrapping */}
                {[...testimonials, ...testimonials].map((t, idx) => (
                  <div
                    key={`${t.id}-${idx}`}
                    className="w-[290px] md:w-[360px] shrink-0 px-3.5"
                  >
                    <div className="glass-panel p-8 h-full relative overflow-hidden flex flex-col justify-between text-left border-[#4be277]/25 hover:border-[#4be277]/40 shadow-[0_4px_30px_rgba(0,0,0,0.4)] min-h-[300px] transition-all duration-300">
                      <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr ${t.glowColor} to-transparent rounded-full blur-[50px] pointer-events-none`}></div>
                      <div>
                        <div className="flex gap-1.5 mb-4 text-[#ffba61]">
                          {Array.from({ length: t.stars }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          ))}
                        </div>
                        <p className="text-xs md:text-sm text-[#dae2fd] leading-relaxed italic mb-6">
                          &quot;{t.text}&quot;
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-auto pt-4 relative z-10 border-t border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#571bc1]/40 to-[#4be277]/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-inner font-mono">
                            {t.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{t.name}</div>
                            <div className="text-[10px] text-[#bccbb9]">{t.role}</div>
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-[#4be277] bg-[#4be277]/10 border border-[#4be277]/20 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
                          Vérifié
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- PRICING SECTION --- */}
          <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative z-10 border-t border-white/5" id="pricing">
            <h2 className="text-3xl md:text-4xl font-bold text-[#dae2fd] text-center mb-4">
              Des tarifs <span className="text-gradient-primary">adaptés</span>
            </h2>
            <p className="text-center text-sm text-[#bccbb9] mb-12">
              Choisissez l&apos;offre qui correspond le mieux aux besoins de votre établissement.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto items-stretch mt-12">
              
              {/* Plan 1: Gratuit */}
              <div className="glass-panel p-6 flex flex-col justify-between text-left relative hover:-translate-y-2 hover:border-[#4be277]/50 hover:shadow-[0_10px_30px_rgba(75,226,119,0.15)] transition-all duration-300">
                <div>
                  <div className="inline-block bg-white/10 text-gray-300 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full mb-2 font-bold">Gratuit</div>
                  <h3 className="text-lg font-bold text-[#dae2fd] mb-1">Gratuit</h3>
                  <p className="text-[#bccbb9] text-[11px] mb-4 font-sans">Pour tester le générateur</p>
                  <div className="text-2xl font-black text-white mb-6">0 FCFA</div>
                  <ul className="flex flex-col gap-2.5 mb-6 text-[11px]">
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 4 générations max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 2 classes max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 2 profs max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Export PDF (4 exports max)</li>
                  </ul>
                </div>
                <button 
                  onClick={onOpenLogin} 
                  className="w-full mt-auto cursor-pointer py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/30 transition-all duration-200 border-0"
                >
                  Commencer
                </button>
              </div>

              {/* Plan 2: Standard */}
              <div className="glass-panel p-6 flex flex-col justify-between text-left relative hover:-translate-y-2 hover:border-[#4be277]/50 hover:shadow-[0_10px_30px_rgba(75,226,119,0.15)] transition-all duration-300">
                <div>
                  <div className="inline-block bg-blue-500/20 text-blue-300 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full mb-2 font-bold">Standard</div>
                  <h3 className="text-lg font-bold text-[#dae2fd] mb-1">Standard</h3>
                  <p className="text-[#bccbb9] text-[11px] mb-4 font-sans">Pour les petites structures</p>
                  <div className="text-2xl font-black text-white mb-6">
                    10 000 FCFA<span className="text-[10px] text-[#bccbb9] font-normal">/mois</span>
                  </div>
                  <ul className="flex flex-col gap-2.5 mb-6 text-[11px]">
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 30 générations max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 8 classes max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 15 profs max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Export PDF (25 exports max)</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleChoosePlan('plan_standard')} 
                  className="w-full mt-auto cursor-pointer py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/30 transition-all duration-200 border-0"
                >
                  Choisir Standard
                </button>
              </div>

              {/* Plan 3: Premium */}
              <div className="glass-panel p-6 flex flex-col justify-between text-left relative border-[#4be277]/50 shadow-[0_0_20px_rgba(75,226,119,0.1)] hover:-translate-y-2 hover:border-[#4be277] hover:shadow-[0_15px_40px_rgba(75,226,119,0.25)] transition-all duration-300 animate-pulse-subtle">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#4be277] text-[#0b1326] font-bold text-[9px] uppercase tracking-wider px-3 py-0.5 rounded-full">Recommandé</div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#4be277]/5 to-transparent rounded-xl pointer-events-none"></div>
                <div>
                  <div className="inline-block bg-[#4be277]/20 text-[#4be277] text-[10px] font-mono uppercase px-2 py-0.5 rounded-full mb-2 font-bold">Populaire</div>
                  <h3 className="text-lg font-bold text-[#dae2fd] mb-1">Premium</h3>
                  <p className="text-[#bccbb9] text-[11px] mb-4 font-sans">Pour les collèges &amp; lycées</p>
                  <div className="text-2xl font-black text-white mb-6">
                    15 000 FCFA<span className="text-[10px] text-[#bccbb9] font-normal">/mois</span>
                  </div>
                  <ul className="flex flex-col gap-2.5 mb-6 text-[11px]">
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 50 générations max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 20 classes max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 25 profs max</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> 50 exportations max (PDF, Word, Excel)</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Assistant IA Gemini</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Support Prioritaire</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleChoosePlan('plan_premium')} 
                  className="w-full mt-auto cursor-pointer py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#571bc1] to-[#4be277] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#4be277]/10 hover:shadow-[#4be277]/25 transition-all duration-200 border-0"
                >
                  Choisir Premium
                </button>
              </div>

              {/* Plan 4: School */}
              <div className="glass-panel p-6 flex flex-col justify-between text-left relative hover:-translate-y-2 hover:border-[#4be277]/50 hover:shadow-[0_10px_30px_rgba(75,226,119,0.15)] transition-all duration-300">
                <div>
                  <div className="inline-block bg-purple-500/20 text-purple-300 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full mb-2 font-bold">Illimité &amp; VIP</div>
                  <h3 className="text-lg font-bold text-[#dae2fd] mb-1">School</h3>
                  <p className="text-[#bccbb9] text-[11px] mb-4 font-sans">Offre complète &amp; réseau</p>
                  <div className="text-2xl font-black text-white mb-6">
                    30 000 FCFA<span className="text-[10px] text-[#bccbb9] font-normal">/mois</span>
                  </div>
                  <ul className="flex flex-col gap-2.5 mb-6 text-[11px]">
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Classes illimitées</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Enseignants illimités</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Générations illimitées</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Exportations illimitées (Tout format)</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Assistant IA prioritaire</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Custom Branding (Logo &amp; URL)</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Multi-comptes &amp; Réseaux</li>
                    <li className="flex items-center gap-2 font-semibold text-white"><span className="material-symbols-outlined text-[#4be277] text-xs">check</span> Support dédié 24/7 VIP</li>
                  </ul>
                </div>
                <button 
                  onClick={() => handleChoosePlan('plan_school')} 
                  className="w-full mt-auto cursor-pointer py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/30 transition-all duration-200 border-0"
                >
                  Choisir School
                </button>
              </div>

            </div>
          </section>

        </main>

        {/* --- FOOTER --- */}
        <footer className="w-full py-16 px-6 md:px-12 flex flex-col md:flex-row justify-between items-start max-w-7xl mx-auto bg-[#060e20] border-t border-white/5 relative z-10">
          <div className="flex flex-col gap-4 mb-8 md:mb-0 max-w-sm text-left">
            <a className="text-xl font-bold text-[#dae2fd] flex items-center gap-2" href="#">
              <span className="material-symbols-outlined text-[#4be277]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
              Planora
            </a>
            <p className="text-sm text-[#bccbb9] leading-relaxed">
              La solution d&apos;organisation intelligente pour les établissements modernes.
            </p>
            <p className="text-xs text-[#bccbb9]/60 mt-4">
              © 2026 Planora AI. Tous droits réservés. Optimisé par l&apos;intelligence artificielle.
            </p>
          </div>
          <div className="flex flex-wrap gap-12 text-left">
            <div className="flex flex-col gap-3">
              <span className="text-xs text-white font-bold mb-2 uppercase tracking-wider font-mono">Produit</span>
              <a className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors" href="#features">Fonctionnalités</a>
              <button 
                onClick={() => setIsDocOpen(true)}
                className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
              >
                Documentation
              </button>
              <a className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors" href="#pricing">Tarifs</a>
              <a className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors" href="#">Blog</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-xs text-white font-bold mb-2 uppercase tracking-wider font-mono">Légal</span>
              <button 
                onClick={() => { setLegalTab('cgu'); setIsLegalOpen(true); }}
                className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
              >
                Conditions d&apos;utilisation (CGU)
              </button>
              <button 
                onClick={() => { setLegalTab('cgv'); setIsLegalOpen(true); }}
                className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
              >
                Conditions de Vente (CGV)
              </button>
              <button 
                onClick={() => { setLegalTab('privacy'); setIsLegalOpen(true); }}
                className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
              >
                Politique de confidentialité
              </button>
              <button 
                onClick={() => { setLegalTab('cookies'); setIsLegalOpen(true); }}
                className="text-sm text-[#bccbb9] hover:text-[#4be277] transition-colors text-left bg-transparent border-0 cursor-pointer p-0"
              >
                Politique des cookies
              </button>
            </div>
          </div>
        </footer>

        {/* Modal de Documentation Officielle Interactive */}
        <DocumentationView 
          isOpen={isDocOpen} 
          onClose={() => setIsDocOpen(false)} 
          onOpenSubscribe={onOpenLogin} 
        />

        <LicensePurchaseModal
          isOpen={isPurchaseModalOpen}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setSelectedPlanForPurchase(null);
          }}
          plan={selectedPlanForPurchase}
          onPurchaseRequest={onPurchaseLicenseRequest}
        />

        <LegalModal
          isOpen={isLegalOpen}
          onClose={() => setIsLegalOpen(false)}
          initialTab={legalTab}
          theme={theme === 'light' ? 'light' : 'dark'}
        />

      </div>
    </div>
  );
}
