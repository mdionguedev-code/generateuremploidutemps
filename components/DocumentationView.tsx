'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  theme?: 'light' | 'dark';
}

export default function DocumentationView({
  isOpen,
  onClose,
  onOpenSubscribe,
  theme = 'dark'
}: DocumentationViewProps) {
  const isLight = theme === 'light';
  const [activeSection, setActiveSection] = useState<string>('intro');
  const mainContentRef = React.useRef<HTMLElement | null>(null);

  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] modal-solid-bg overflow-hidden font-sans flex flex-col animate-in fade-in duration-300 ${
      isLight ? "!bg-white !opacity-100 text-slate-900" : "bg-[#0b1326] text-[#dae2fd]"
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
        isLight ? "!bg-white border-gray-200/90 shadow-sm text-slate-900" : "bg-[#0b1326]/90 border-white/10 text-white"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
            isLight ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-indigo-500/20 text-[#4be277] border-white/10"
          }`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`font-black text-base tracking-tight flex items-center gap-2 ${
              isLight ? "text-gray-900" : "text-white"
            }`}>
              Documentation Planora
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full border ${
                isLight ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}>
                Officielle
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSubscribe}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer border border-emerald-400/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Souscrire à une offre</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors cursor-pointer text-xs font-bold ${
              isLight ? "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border-gray-200" : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border-white/10"
            }`}
          >
            <X className="w-4 h-4 text-rose-500" />
            <span>Fermer</span>
          </button>
        </div>
      </header>

      {/* Main split viewport: Left Sidebar navigation, Right Scrollable detailed contents */}
      <div className={`flex-1 flex overflow-hidden relative z-10 ${isLight ? "!bg-white" : ""}`}>
        
        {/* Navigation Sidebar */}
        <aside className={`w-64 border-r p-4 pb-32 hidden lg:flex flex-col gap-5 shrink-0 justify-between overflow-y-auto ${
          isLight ? "!bg-gray-50/80 border-gray-200 text-gray-900" : "bg-[#090f1d] border-white/10 text-white"
        }`}>
          <div className="space-y-2.5">
            <div className={`text-[10px] font-mono uppercase tracking-wider font-semibold px-1 ${
              isLight ? "text-gray-500" : "text-gray-400"
            }`}>
              Sommaire
            </div>
            
            <nav className="flex flex-col gap-1">
              {[
                { id: 'intro', label: '1. Présentation & Garanties' },
                { id: 'etapes', label: '2. Parcours en 5 Étapes' },
                { id: 'moteur', label: '3. Moteur Anti-Collision' },
                { id: 'rapports', label: '4. Rapports & Graphiques Chef' },
                { id: 'exports', label: '5. Formats d\'Exports' },
                { id: 'faq', label: '6. Questions Fréquentes' }
              ].map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    style={
                      isActive
                        ? { backgroundColor: '#2563eb', color: '#ffffff' }
                        : undefined
                    }
                    className={`w-full text-left text-[11px] px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? "!bg-blue-600 !text-white font-semibold border border-blue-600"
                        : isLight
                        ? "bg-white text-slate-700 hover:bg-blue-50/70 hover:text-blue-600 border border-slate-200/80 font-normal"
                        : "bg-white/[0.03] hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 font-normal"
                    }`}
                  >
                    <span className="truncate block">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Guarantee Card at bottom of sidebar */}
          <div className={`p-3 rounded-xl border space-y-1.5 text-xs shadow-sm shrink-0 mb-16 ${
            isLight ? "bg-indigo-50/90 border-indigo-200 text-gray-800" : "bg-indigo-950/40 border-indigo-500/20 text-white"
          }`}>
            <div className={`font-semibold flex items-center gap-1.5 text-[11px] ${isLight ? "text-indigo-950" : "text-white"}`}>
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Garantie de sérénité</span>
            </div>
            <p className={`text-[10px] leading-relaxed ${isLight ? "text-gray-600 font-normal" : "text-gray-400"}`}>
              Planora élimine les conflits et vous fait gagner des semaines de travail manuel.
            </p>
          </div>
        </aside>

        {/* Scrollable Doc Body */}
        <main
          ref={mainContentRef as any}
          className={`flex-grow overflow-y-auto px-6 py-8 sm:px-12 max-w-4xl mx-auto space-y-12 scroll-smooth ${isLight ? "!bg-white" : ""}`}
        >
          
          {/* Header Hero Title */}
          <div className={`space-y-3 border-b pb-6 ${isLight ? "border-gray-200" : "border-white/10"}`}>
            <h2 className={`text-3xl sm:text-4xl font-black tracking-tight ${
              isLight ? "text-gray-950" : "text-white"
            }`}>
              Guide d'Utilisation Planora
            </h2>
            <p className={`text-sm leading-relaxed ${
              isLight ? "text-gray-600 font-medium" : "text-gray-400"
            }`}>
              Ce guide complet détaille chaque fonctionnalité de l'application Planora. Lisez ce document pour configurer votre établissement, générer vos premiers emplois du temps et éditer vos rapports administratifs.
            </p>
          </div>

          {/* Section 1: Introduction & Garanties */}
          <section id="intro" className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              <Layers className="w-4 h-4" />
              <span>1. Présentation &amp; Garanties</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Pourquoi Planora ?
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isLight ? "text-gray-700 font-medium" : "text-gray-300"
            }`}>
              Planora est une application SaaS conçue spécifiquement pour simplifier et fiabiliser la création des emplois du temps scolaires dans les collèges, lycées et écoles supérieures. Elle garantit l'absence totale de conflits d'horaires et optimise le placement des cours en respectant rigoureusement les quotas de chaque enseignant.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-1.5 shadow-sm ${
                isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/10 text-white"
              }`}>
                <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? "text-gray-950" : "text-white"}`}>
                  <Check className="w-4 h-4 text-emerald-500" />
                  Zéro double affectation
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  L'algorithme mathématique valide chaque créneau pour s'assurer qu'un enseignant ou une classe ne soit jamais affecté sur deux cours simultanés.
                </p>
              </div>
              <div className={`p-4 rounded-2xl border space-y-1.5 shadow-sm ${
                isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/10 text-white"
              }`}>
                <h4 className={`font-bold text-xs flex items-center gap-2 ${isLight ? "text-gray-950" : "text-white"}`}>
                  <Check className="w-4 h-4 text-emerald-500" />
                  Rythme pédagogique équilibré
                </h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Les cours d'un volume horaire élevé sont scindés et répartis de façon fluide sur la semaine, évitant de surcharger une même journée.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Le Parcours en 5 Étapes */}
          <section id="etapes" className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              <Grid className="w-4 h-4" />
              <span>2. Le Parcours Guidé en 5 Étapes</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Le workflow de configuration
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isLight ? "text-gray-700 font-medium" : "text-gray-300"
            }`}>
              Pour construire vos grilles d'emplois du temps, suivez de gauche à droite les étapes numérotées sur votre barre de progression :
            </p>
            
            <div className="space-y-3.5 pt-2">
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Étape 1 : Configuration horaire</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Déterminez les jours d'ouverture de l'école (5 ou 6 jours) et définissez l'amplitude quotidienne (ex: 8h00 à 18h00). Cliquez sur le bouton "Passer à l'Étape 2" pour continuer.
                </p>
              </div>
              
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Étape 2 : Référentiel des Matières</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Ajoutez les matières dispensées dans votre établissement. Attribuez-leur des couleurs visuelles pour rendre les grilles faciles à déchiffrer.
                </p>
              </div>
              
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Étape 3 : Fiches Enseignants &amp; Quotas</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Déclarez vos professeurs, leur volume d'heures contractuel par semaine et spécifiez leurs indisponibilités (temps partiels, réunions extérieures) sur leur mini-grille personnelle.
                </p>
              </div>
              
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Étape 4 : Fiches Classes &amp; Affectations</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Enregistrez vos divisions de classes (ex: 6ème A, 3ème B) et associez à chacune d'elles les volumes horaires des matières requises en assignant le bon enseignant.
                </p>
              </div>
              
              <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Étape 5 : Résolution automatique &amp; Grille interactive</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Générez l'emploi du temps optimal d'un clic. Le moteur résout instantanément la répartition. Ajustez ensuite manuellement par glisser-déposer si vous le souhaitez.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Moteur Anti-Collision */}
          <section id="moteur" className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>3. Le Moteur Anti-Collision &amp; Ajustements Manuels</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Règles de détection des conflits
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isLight ? "text-gray-700 font-medium" : "text-gray-300"
            }`}>
              Le moteur de Planora utilise des contraintes matricielles strictes pour empêcher toute anomalie physique de planification :
            </p>
            <ul className={`text-xs space-y-2 list-disc pl-5 ${isLight ? "text-gray-700 font-medium" : "text-gray-400"}`}>
              <li><strong>Conflit d'enseignant :</strong> Un professeur ne peut jamais dispenser de cours dans deux classes distinctes au même instant.</li>
              <li><strong>Conflit de classe :</strong> Une classe ne peut pas se voir attribuer deux cours différents sur le même créneau horaire.</li>
              <li><strong>Respect des indisponibilités :</strong> Aucun cours n'est programmé sur les heures marquées indisponibles par les enseignants ou verrouillées par les fermetures de l'établissement.</li>
              <li><strong>Glisser-déposer assisté :</strong> Si vous réorganisez un cours manuellement à la souris, la grille cible passe au vert si le déplacement respecte l'intégrité des plannings, ou bloque en rouge en indiquant le motif du conflit.</li>
            </ul>
          </section>

          {/* Section 4: Rapports & Graphiques Chef */}
          <section id="rapports" className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-teal-600" : "text-teal-400"
            }`}>
              <FileText className="w-4 h-4" />
              <span>4. Rapports &amp; Graphiques Chef d'Établissement</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Suivi analytique &amp; Rapports administratifs
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isLight ? "text-gray-700 font-medium" : "text-gray-300"
            }`}>
              Pour assurer le pilotage de l'établissement, le chef d'établissement dispose d'un tableau de bord décisionnel comportant des analyses graphiques.
            </p>

            <div className={`p-6 rounded-3xl border space-y-3 shadow-sm ${
              isLight 
                ? "bg-gradient-to-br from-teal-50/90 via-emerald-50/30 to-indigo-50/40 border-teal-200 text-gray-800" 
                : "bg-slate-900/60 border-teal-500/20 text-white"
            }`}>
              <h4 className={`font-black text-xs flex items-center gap-2 ${isLight ? "text-teal-950" : "text-white"}`}>
                <Sparkles className="w-4 h-4 text-teal-500" />
                Le bouton « PLUS DE DÉTAILS »
              </h4>
              <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                Présent sur chaque graphique (Répartition par matière, Complétude des classes, Quotas enseignants), ce bouton ouvre une vue grand format indispensable pour les structures à gros effectif. Elle affiche un diagnostic textuel clair décrivant les indicateurs (enseignants en sous-charge, classes incomplètes, répartition globale).
              </p>
              
              <h4 className={`font-black text-xs flex items-center gap-2 pt-2 ${isLight ? "text-teal-950" : "text-white"}`}>
                <Download className="w-4 h-4 text-teal-500" />
                Génération de rapports certifiés
              </h4>
              <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                Depuis cet écran détaillé, vous pouvez exporter un **Rapport PDF Académique** officiel de votre audit. Le rapport adopte une présentation hautement professionnelle :
              </p>
              <ul className={`text-xs space-y-1.5 list-disc pl-5 ${isLight ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                <li>En-tête de rapport compact et allégé (<code>Rapport : [Titre]</code>).</li>
                <li>Retrait de toute mention commerciale ou de forfait pour des réunions professionnelles neutres.</li>
                <li>Tableaux de données modernes avec des couleurs distinctes affectées à chaque professeur.</li>
                <li>Taille de police académique garantissant lisibilité et élégance.</li>
              </ul>
              <p className={`text-xs leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                Il est également possible d'extraire la feuille de données brutes au format **Excel (.xlsx)**. Ces deux fonctions d'exportation de rapports détaillés sont réservées aux formules **Premium** et **School** de l'application.
              </p>
            </div>
          </section>

          {/* Section 5: Formats d'Exports */}
          <section id="exports" className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              <Download className="w-4 h-4" />
              <span>5. Formats d'Exports des Emplois du Temps</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Documents officiels d'impression
            </h3>
            <p className={`text-xs sm:text-sm leading-relaxed ${
              isLight ? "text-gray-700 font-medium" : "text-gray-300"
            }`}>
              Une fois les plannings finalisés à l'étape 5, vous disposez de trois formats d'exportation pour distribuer les documents aux familles et aux enseignants :
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-1.5 shadow-sm ${
                isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/10 text-white"
              }`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>PDF Haute Résolution</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Format paysage optimal avec lignes de grille pleines et continues. Les créneaux de 2 heures consécutives sont fusionnés en un bloc uni.
                </p>
              </div>
              <div className={`p-4 rounded-2xl border space-y-1.5 shadow-sm ${
                isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/10 text-white"
              }`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Microsoft Word (.doc)</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Document éditable structuré sous forme de tableau, idéal pour insérer vos signatures et mentions officielles.
                </p>
              </div>
              <div className={`p-4 rounded-2xl border space-y-1.5 shadow-sm ${
                isLight ? "bg-white border-gray-200 text-gray-900" : "bg-white/[0.02] border-white/10 text-white"
              }`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Microsoft Excel (.xlsx)</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-600 font-medium" : "text-gray-400"}`}>
                  Classeur complet regroupant un onglet par classe et un onglet de synthèse globale pour comptabiliser les heures réelles.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: FAQ */}
          <section id="faq" className="space-y-4 pb-12">
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${
              isLight ? "text-indigo-600" : "text-indigo-400"
            }`}>
              <HelpCircle className="w-4 h-4" />
              <span>6. Questions Fréquentes</span>
            </div>
            <h3 className={`text-xl font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Foire aux questions
            </h3>
            
            <div className="space-y-4 pt-2">
              <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Comment le système gère-t-il les cours de 2h ?</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Afin de garantir un confort d'affichage et d'impression, Planora regroupe automatiquement deux heures de cours successives partagées par le même enseignant et la même classe.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Que signifie la mention « Classe libérée » ou « Prof libre » ?</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Plutôt que d'afficher une cellule vide ou un tiret impersonnel, les créneaux sans cours affichent explicitement « Classe libérée » sur l'emploi du temps de la classe, et « Prof libre » sur la grille horaire de l'enseignant.
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? "bg-white border-gray-200 shadow-sm" : "bg-white/[0.02] border-white/10"}`}>
                <h4 className={`font-bold text-xs ${isLight ? "text-gray-950" : "text-white"}`}>Quelles sont les formules permettant d'accéder aux rapports graphiques ?</h4>
                <p className={`text-[11px] leading-relaxed ${isLight ? "text-gray-700 font-medium" : "text-gray-300"}`}>
                  Toutes les fonctionnalités d'analyse détaillées par clic sur « PLUS DE DÉTAILS » ainsi que les exports associés en PDF et Excel de ces synthèses sont accessibles via les offres payantes Premium et School.
                </p>
              </div>
            </div>
          </section>

          {/* Clean conversion footer card */}
          <div className={`p-8 rounded-3xl border text-center space-y-4 shadow-sm ${
            isLight
              ? "bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 border-indigo-200 text-gray-900"
              : "bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border-indigo-500/30 text-white"
          }`}>
            <h4 className={`text-lg font-black ${isLight ? "text-gray-950" : "text-white"}`}>
              Prêt à simplifier vos plannings scolaires ?
            </h4>
            <p className={`text-xs max-w-lg mx-auto leading-relaxed ${
              isLight ? "text-gray-600 font-medium" : "text-gray-400"
            }`}>
              Utilisez Planora pour assurer une rentrée scolaire sans stress ni conflits d'horaires.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={onOpenSubscribe}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 !text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Souscrire à un forfait
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isLight ? "bg-white hover:bg-gray-100 text-gray-800 border-gray-200 shadow-sm" : "bg-white/5 hover:bg-white/10 text-gray-300 border-white/10"
                }`}
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
