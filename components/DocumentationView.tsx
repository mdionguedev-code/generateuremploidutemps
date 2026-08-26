'use client';

import React from 'react';
import { 
  BookOpen, 
  Clock, 
  GraduationCap, 
  Users, 
  Grid, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  FileText, 
  Zap, 
  X, 
  HelpCircle,
  Award,
  Lock,
  Layers,
  FileSpreadsheet,
  Check
} from 'lucide-react';

interface DocumentationViewProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubscribe: () => void;
}

export default function DocumentationView({
  isOpen,
  onClose,
  onOpenSubscribe
}: DocumentationViewProps) {
  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b1326] text-[#dae2fd] overflow-hidden font-sans flex flex-col animate-in fade-in duration-300">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#571bc1]/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#22c55e]/5 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Header bar */}
      <header className="relative z-10 w-full bg-[#0b1326]/90 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#4be277] border border-white/10 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              Documentation Planora
              <span className="text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Officielle
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSubscribe}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Souscrire à une offre</span>
          </button>
          
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs font-bold"
          >
            <X className="w-4 h-4 text-rose-400" />
            <span>Fermer</span>
          </button>
        </div>
      </header>

      {/* Main split viewport: Left Sidebar navigation, Right Scrollable detailed contents */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Navigation Sidebar (Simplifiée, non interactive, juste liens de défilement) */}
        <aside className="w-64 border-r border-white/10 bg-[#090f1d] p-6 hidden lg:flex flex-col gap-6 shrink-0 justify-between">
          <div className="space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">
              Sommaire
            </div>
            
            <nav className="flex flex-col gap-2">
              {[
                { id: 'intro', label: '1. Présentation & Garanties' },
                { id: 'etapes', label: '2. Parcours en 5 Étapes' },
                { id: 'moteur', label: '3. Moteur Anti-Collision' },
                { id: 'rapports', label: '4. Rapports & Graphiques Chef' },
                { id: 'exports', label: '5. Formats d\'Exports' },
                { id: 'faq', label: '6. Questions Fréquentes' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="w-full text-left text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Garantie de sérénité</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Planora élimine les conflits et vous fait gagner des semaines de travail manuel.
            </p>
          </div>
        </aside>

        {/* Scrollable Doc Body */}
        <main className="flex-grow overflow-y-auto px-6 py-8 sm:px-12 max-w-4xl mx-auto space-y-12 scroll-smooth">
          
          {/* Header Hero Title */}
          <div className="space-y-3 border-b border-white/10 pb-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Guide d'Utilisation Planora
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Ce guide complet détaille chaque fonctionnalité de l'application Planora. Lisez ce document pour configurer votre établissement, générer vos premiers emplois du temps et éditer vos rapports administratifs.
            </p>
          </div>

          {/* Section 1: Introduction & Garanties */}
          <section id="intro" className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>1. Présentation &amp; Garanties</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Pourquoi Planora ?</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Planora est une application SaaS conçue spécifiquement pour simplifier et fiabiliser la création des emplois du temps scolaires dans les collèges, lycées et écoles supérieures. Elle garantit l'absence totale de conflits d'horaires et optimise le placement des cours en respectant rigoureusement les quotas de chaque enseignant.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Zéro double affectation
                </h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  L'algorithme mathématique valide chaque créneau pour s'assurer qu'un enseignant ou une classe ne soit jamais affecté sur deux cours simultanés.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Rythme pédagogique équilibré
                </h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Les cours d'un volume horaire élevé sont scindés et répartis de façon fluide sur la semaine, évitant de surcharger une même journée.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Le Parcours en 5 Étapes */}
          <section id="etapes" className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <Grid className="w-4 h-4" />
              <span>2. Le Parcours Guidé en 5 Étapes</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Le workflow de configuration</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Pour construire vos grilles d'emplois du temps, suivez de gauche à droite les étapes numérotées sur votre barre de progression :
            </p>
            
            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Étape 1 : Configuration horaire</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Déterminez les jours d'ouverture de l'école (5 ou 6 jours) et définissez l'amplitude quotidienne (ex: 8h00 à 18h00). Cliquez sur le bouton "Passer à l'Étape 2" pour continuer.
                </p>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Étape 2 : Référentiel des Matières</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Ajoutez les matières dispensées dans votre établissement. Attribuez-leur des couleurs visuelles pour rendre les grilles faciles à déchiffrer.
                </p>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Étape 3 : Fiches Enseignants &amp; Quotas</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Déclarez vos professeurs, leur volume d'heures contractuel par semaine et spécifiez leurs indisponibilités (temps partiels, réunions extérieures) sur leur mini-grille personnelle.
                </p>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Étape 4 : Fiches Classes &amp; Affectations</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Enregistrez vos divisions de classes (ex: 6ème A, 3ème B) et associez à chacune d'elles les volumes horaires des matières requises en assignant le bon enseignant.
                </p>
              </div>
              
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Étape 5 : Résolution automatique &amp; Grille interactive</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Générez l'emploi du temps optimal d'un clic. Le moteur résout instantanément la répartition. Ajustez ensuite manuellement par glisser-déposer si vous le souhaitez.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Moteur Anti-Collision */}
          <section id="moteur" className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>3. Le Moteur Anti-Collision &amp; Ajustements Manuels</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Règles de détection des conflits</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Le moteur de Planora utilise des contraintes matricielles strictes pour empêcher toute anomalie physique de planification :
            </p>
            <ul className="text-xs text-gray-400 space-y-2 list-disc pl-5">
              <li><strong>Conflit d'enseignant :</strong> Un professeur ne peut jamais dispenser de cours dans deux classes distinctes au même instant.</li>
              <li><strong>Conflit de classe :</strong> Une classe ne peut pas se voir attribuer deux cours différents sur le même créneau horaire.</li>
              <li><strong>Respect des indisponibilités :</strong> Aucun cours n'est programmé sur les heures marquées indisponibles par les enseignants ou verrouillées par les fermetures de l'établissement.</li>
              <li><strong>Glisser-déposer assisté :</strong> Si vous réorganisez un cours manuellement à la souris, la grille cible passe au vert si le déplacement respecte l'intégrité des plannings, ou bloque en rouge en indiquant le motif du conflit.</li>
            </ul>
          </section>

          {/* Section 4: Rapports & Graphiques Chef */}
          <section id="rapports" className="space-y-4">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>4. Rapports &amp; Graphiques Chef d'Établissement</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Suivi analytique &amp; Rapports administratifs</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Pour assurer le pilotage de l'établissement, le chef d'établissement dispose d'un tableau de bord décisionnel comportant des analyses graphiques.
            </p>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-teal-500/20 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400" />
                Le bouton « PLUS DE DÉTAILS »
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Présent sur chaque graphique (Répartition par matière, Complétude des classes, Quotas enseignants), ce bouton ouvre une vue grand format indispensable pour les structures à gros effectif. Elle affiche un diagnostic textuel clair décrivant les indicateurs (enseignants en sous-charge, classes incomplètes, répartition globale).
              </p>
              
              <h4 className="font-bold text-white text-xs flex items-center gap-2 pt-2">
                <Download className="w-4 h-4 text-teal-400" />
                Génération de rapports certifiés
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Depuis cet écran détaillé, vous pouvez exporter un **Rapport PDF Académique** officiel de votre audit. Le rapport adopte une présentation hautement professionnelle :
              </p>
              <ul className="text-xs text-gray-400 space-y-1.5 list-disc pl-5">
                <li>En-tête de rapport compact et allégé (<code className="text-teal-300">Rapport : [Titre]</code>).</li>
                <li>Retrait de toute mention commerciale ou de forfait pour des réunions professionnelles neutres.</li>
                <li>Tableaux de données modernes avec des couleurs distinctes affectées à chaque professeur.</li>
                <li>Taille de police académique en 11pt, garantissant lisibilité et élégance.</li>
              </ul>
              <p className="text-xs text-gray-400 leading-relaxed">
                Il est également possible d'extraire la feuille de données brutes au format **Excel (.xlsx)**. Ces deux fonctions d'exportation de rapports détaillés sont réservées aux formules **Premium** et **School** de l'application.
              </p>
            </div>
          </section>

          {/* Section 5: Formats d'Exports */}
          <section id="exports" className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <Download className="w-4 h-4" />
              <span>5. Formats d'Exports des Emplois du Temps</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Documents officiels d'impression</h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Une fois les plannings finalisés à l'étape 5, vous disposez de trois formats d'exportation pour distribuer les documents aux familles et aux enseignants :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="font-bold text-white text-xs">PDF Haute Résolution</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Format paysage optimal avec lignes de grille pleines et continues. Les créneaux de 2 heures consécutives sont fusionnés en un bloc uni sans trait de coupe intermédiaire. Les heures vides affichent distinctement « Classe libérée » ou « Prof libre ».
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="font-bold text-white text-xs">Microsoft Word (.doc)</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Document éditable structuré sous forme de tableau. Idéal si vous devez ajouter manuellement des logos régionaux, des mentions réglementaires ou la signature manuscrite du chef d'établissement avant envoi.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="font-bold text-white text-xs">Microsoft Excel (.xlsx)</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Classeur complet regroupant un onglet par classe et un onglet de synthèse globale pour comptabiliser les heures réelles et assurer l'archivage de vos données de gestion.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section id="faq" className="space-y-4 pb-12">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>6. Questions Fréquentes</span>
            </div>
            <h3 className="text-xl font-extrabold text-white">Foire aux questions</h3>
            
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Comment le système gère-t-il les cours de 2h ?</h4>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Afin de garantir un confort d'affichage et d'impression, Planora regroupe automatiquement deux heures de cours successives partagées par le même enseignant et la même classe. Sur le PDF généré, les bordures intérieures horizontales sont effacées pour former un bloc uni de 2h, tandis que les cours de matières distinctes restent séparés par des lignes pleines très visibles.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Que signifie la mention « Classe libérée » ou « Prof libre » ?</h4>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Plutôt que d'afficher une cellule vide ou un tiret impersonnel, les créneaux sans cours affichent explicitement « Classe libérée » sur l'emploi du temps de la classe, et « Prof libre » sur la grille horaire de l'enseignant. Cela clarifie immédiatement la disponibilité de chacun.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-white text-xs">Quelles sont les formules permettant d'accéder aux rapports graphiques ?</h4>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Toutes les fonctionnalités d'analyse détaillées par clic sur « PLUS DE DÉTAILS » ainsi que les exports associés en PDF et Excel de ces synthèses sont accessibles via les offres payantes Premium et School. La formule d'essai gratuite permet de tester la création d'emploi du temps de base sans ces options de reporting.
                </p>
              </div>
            </div>
          </section>

          {/* Clean conversion footer card */}
          <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-center space-y-4">
            <h4 className="text-lg font-bold text-white">Prêt à simplifier vos plannings scolaires ?</h4>
            <p className="text-xs text-gray-400 max-w-lg mx-auto">
              Utilisez Planora pour assurer une rentrée scolaire sans stress ni conflits d'horaires.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={onOpenSubscribe}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Souscrire à un forfait
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                Retour à l'application
              </button>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
