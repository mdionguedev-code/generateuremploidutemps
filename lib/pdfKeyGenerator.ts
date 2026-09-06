import { jsPDF } from 'jspdf';
import { SaaSClient, SaaSPlan } from './saasTypes';

export function generateKeyPdf(client: SaaSClient, plan: SaaSPlan, key: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Colors
  const primaryColor = '#4f46e5'; // indigo-600
  const darkColor = '#1e293b'; // slate-800
  const lightGray = '#f1f5f9'; // slate-100
  const textColor = '#334155'; // slate-700

  // Helper to set hex color
  const setFillColorHex = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
  };
  const setTextColorHex = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    doc.setTextColor(r, g, b);
  };

  // Header background
  setFillColorHex(darkColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  // Logo / Header Text
  setTextColorHex('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('PLANORA', 105, 20, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setTextColorHex('#94a3b8');
  doc.text("L'Intelligence Artificielle au service de l'éducation", 105, 28, { align: 'center' });

  // Title
  setTextColorHex(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text("CERTIFICAT OFFICIEL D'ACTIVATION", 105, 60, { align: 'center' });

  // Warm welcome
  setTextColorHex(textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const welcomeText = `Félicitations ! L'établissement "${client.schoolName}" bénéficie désormais de l'excellence en matière de planification scolaire. Nous vous remercions chaleureusement pour votre confiance et sommes ravis de vous accompagner.`;
  const splitWelcome = doc.splitTextToSize(welcomeText, 170);
  doc.text(splitWelcome, 20, 80);

  // Key Box
  setFillColorHex(lightGray);
  doc.roundedRect(20, 105, 170, 45, 5, 5, 'F');
  
  setTextColorHex(darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text("VOTRE CLÉ DE LICENCE :", 105, 118, { align: 'center' });
  
  setTextColorHex(primaryColor);
  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.text(key, 105, 135, { align: 'center' });

  // Plan details
  setTextColorHex(darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text("Détails de votre souscription :", 20, 170);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setTextColorHex(textColor);

  let startY = 180;
  
  doc.setFont('helvetica', 'bold');
  doc.text("Formule :", 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(plan.name, 45, startY);
  startY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text("Validité :", 20, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(client.subscriptionEndDate).toLocaleDateString('fr-FR'), 45, startY);
  startY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text("Avantages inclus :", 20, startY);
  startY += 8;

  doc.setFont('helvetica', 'normal');
  const features = [];
  if (plan.maxClasses >= 999) features.push("• Classes illimitées");
  else features.push(`• Jusqu'à ${plan.maxClasses} classes`);
  
  if (plan.maxTeachers >= 999) features.push("• Enseignants illimités");
  else features.push(`• Jusqu'à ${plan.maxTeachers} enseignants`);

  if (plan.features.pedagogicalPlanning) features.push("• Module de Répartition Pédagogique");
  if (plan.features.geminiAI) features.push("• Planification 100% IA Anti-Conflits");
  if (plan.features.pdfExport) features.push("• Exports PDF / Excel Haute Qualité");
  if (plan.features.prioritySupport) features.push("• Support Prioritaire WhatsApp 24/7");

  features.forEach(feat => {
    doc.text(feat, 25, startY);
    startY += 7;
  });

  // Footer
  const footerY = 270;
  setFillColorHex(primaryColor);
  doc.rect(0, footerY - 10, 210, 40, 'F');
  
  setTextColorHex('#ffffff');
  doc.setFontSize(10);
  doc.text("Pour activer votre clé, rendez-vous sur votre espace Établissement Planora", 105, footerY, { align: 'center' });
  doc.text("www.planora.com | contact@planora.com", 105, footerY + 8, { align: 'center' });

  return doc;
}

export function generateKeyPdfFile(client: SaaSClient, plan: SaaSPlan, key: string): { doc: jsPDF; file: File; fileName: string } {
  const doc = generateKeyPdf(client, plan, key);
  const cleanSchool = client.schoolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Certificat_Planora_${cleanSchool}.pdf`;
  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });
  return { doc, file, fileName };
}
