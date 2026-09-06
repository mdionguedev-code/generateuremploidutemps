import { jsPDF } from 'jspdf';
import { SaaSClient, SaaSPlan } from './saasTypes';

export function generateKeyPdf(client: SaaSClient, plan: SaaSPlan, key: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Palette Planora Landing Page & Branding
  const COLOR_DARK_NAVY = '#0B0E14';    // Dark background header/footer
  const COLOR_PRIMARY = '#5A45FF';      // Electric Indigo
  const COLOR_CYAN = '#00C8E5';         // Tech Cyan accent
  const COLOR_GOLD = '#D97706';         // Gold Seal / Status
  const COLOR_CARD_BG = '#F8FAFC';      // Soft Card background
  const COLOR_INDIGO_BG = '#F5F3FF';    // Soft Indigo highlight
  const COLOR_TEXT_MAIN = '#1E293B';    // Main text
  const COLOR_TEXT_MUTED = '#64748B';   // Secondary text
  const COLOR_BORDER = '#E2E8F0';       // Card border

  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.substring(0, 2), 16),
      g: parseInt(clean.substring(2, 4), 16),
      b: parseInt(clean.substring(4, 6), 16)
    };
  };

  const setFillHex = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    doc.setFillColor(r, g, b);
  };

  const setDrawHex = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    doc.setDrawColor(r, g, b);
  };

  const setTextHex = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    doc.setTextColor(r, g, b);
  };

  // 1. DUAL FRAME / BORDER DECORATION (A4 = 210 x 297mm)
  // Outer frame
  doc.setLineWidth(0.4);
  setDrawHex('#CBD5E1');
  doc.rect(7, 7, 196, 283);

  // Inner frame
  doc.setLineWidth(1.2);
  setDrawHex(COLOR_PRIMARY);
  doc.rect(9, 9, 192, 279);

  // Corner Accents (Decorative corners)
  const drawCornerAccent = (x: number, y: number, dx: number, dy: number) => {
    doc.setLineWidth(1.8);
    setDrawHex(COLOR_CYAN);
    doc.line(x, y, x + dx * 8, y);
    doc.line(x, y, x, y + dy * 8);
  };
  drawCornerAccent(9, 9, 1, 1);
  drawCornerAccent(201, 9, -1, 1);
  drawCornerAccent(9, 288, 1, -1);
  drawCornerAccent(201, 288, -1, -1);

  // 2. HEADER BANNER (y: 9 to 46mm)
  setFillHex(COLOR_DARK_NAVY);
  doc.rect(9, 9, 192, 37, 'F');

  // Bottom Gradient Cyan Line
  setFillHex(COLOR_CYAN);
  doc.rect(9, 45, 192, 1.5, 'F');

  // Header Brand Name
  setTextHex('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('P L A N O R A', 105, 25, { align: 'center' });

  // Header Tagline
  setTextHex(COLOR_CYAN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("L'INTELLIGENCE ARTIFICIELLE AU SERVICE DE L'ÉDUCATION", 105, 34, { align: 'center' });

  // Security / Official Stamp Tag (Top Right)
  setFillHex(COLOR_GOLD);
  doc.roundedRect(155, 14, 40, 10, 2, 2, 'F');
  setTextHex('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text("OFFICIEL & SÉCURISÉ", 175, 20.5, { align: 'center' });

  // 3. CERTIFICATE MAIN TITLE (y = 56 to 70mm)
  setTextHex(COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text("CERTIFICAT OFFICIEL D'ACTIVATION", 105, 57, { align: 'center' });

  // Underline
  doc.setLineWidth(0.8);
  setDrawHex(COLOR_PRIMARY);
  doc.line(65, 61, 145, 61);

  setTextHex(COLOR_GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("Document de Licence & Clé de Souscription Établissement", 105, 67, { align: 'center' });

  // 4. RECIPIENT WELCOME CARD (y = 73 to 108mm)
  setFillHex(COLOR_INDIGO_BG);
  doc.roundedRect(15, 73, 180, 32, 4, 4, 'F');

  // Left Accent Vertical Bar
  setFillHex(COLOR_PRIMARY);
  doc.rect(15, 73, 4, 32, 'F');

  setTextHex(COLOR_TEXT_MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text("Établissement Bénéficiaire :", 23, 81);

  setTextHex(COLOR_DARK_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(client.schoolName, 23, 88);

  setTextHex(COLOR_TEXT_MAIN);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const welcomeStr = `Félicitations ! L'établissement "${client.schoolName}" bénéficie désormais de la suite logicielle Planora IA. Ce certificat atteste de votre souscription officielle.`;
  const splitWelcome = doc.splitTextToSize(welcomeStr, 166);
  doc.text(splitWelcome, 23, 96);

  // 5. KEY DISPLAY BOX (y = 110 to 153mm)
  setFillHex(COLOR_DARK_NAVY);
  doc.roundedRect(15, 110, 180, 42, 5, 5, 'F');

  // Glowing Cyan/Indigo Inner Border
  doc.setLineWidth(0.8);
  setDrawHex(COLOR_PRIMARY);
  doc.roundedRect(17, 112, 176, 38, 4, 4, 'S');

  setTextHex(COLOR_CYAN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("VOTRE CLÉ D'ACTIVATION EXCLUSIVE", 105, 120, { align: 'center' });

  // Key Font
  setTextHex('#FFFFFF');
  doc.setFont('courier', 'bold');
  doc.setFontSize(22);
  doc.text(key, 105, 134, { align: 'center' });

  setTextHex('#94A3B8');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text("Renseignez cette clé dans votre Espace Établissement > Section 'Activer ma licence'", 105, 144, { align: 'center' });

  // 6. TWO-COLUMN SUBSCRIPTION GRID (y = 157 to 245mm)
  const gridY = 157;
  const gridH = 86;

  // Column A: Contract Details (Width: 87mm, x=15)
  setFillHex(COLOR_CARD_BG);
  setDrawHex(COLOR_BORDER);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, gridY, 87, gridH, 4, 4, 'FD');

  // Col A Header Accent
  setFillHex(COLOR_PRIMARY);
  doc.rect(15, gridY, 87, 8, 'F');
  setTextHex('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("DÉTAILS DU CONTRAT", 20, gridY + 5.5);

  let rowY = gridY + 16;
  const addDetailRow = (label: string, value: string) => {
    setTextHex(COLOR_TEXT_MUTED);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, 20, rowY);

    setTextHex(COLOR_TEXT_MAIN);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitVal = doc.splitTextToSize(value, 77);
    doc.text(splitVal, 20, rowY + 4.5);
    rowY += 13;
  };

  addDetailRow("Formule Souscrite :", plan.name);
  addDetailRow("Date d'Expiration :", new Date(client.subscriptionEndDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));
  addDetailRow("Responsable Admin :", client.adminName || 'Admin Établissement');
  addDetailRow("Email de Contact :", client.adminEmail || 'Non renseigné');
  addDetailRow("Mode de Règlement :", client.paymentMethod || 'Licence Officielle');

  // Column B: Included Advantages (Width: 87mm, x=108)
  setFillHex(COLOR_CARD_BG);
  setDrawHex(COLOR_BORDER);
  doc.roundedRect(108, gridY, 87, gridH, 4, 4, 'FD');

  // Col B Header Accent
  setFillHex(COLOR_DARK_NAVY);
  doc.rect(108, gridY, 87, 8, 'F');
  setTextHex(COLOR_CYAN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("SERVICES & AVANTAGES INCLUS", 113, gridY + 5.5);

  let featY = gridY + 16;
  const features = [];
  if (plan.maxClasses >= 999) features.push("Classes illimitées");
  else features.push(`Jusqu'à ${plan.maxClasses} classes`);

  if (plan.maxTeachers >= 999) features.push("Enseignants illimités");
  else features.push(`Jusqu'à ${plan.maxTeachers} enseignants`);

  if (plan.features.geminiAI) features.push("Génération 100% IA Anti-Conflits");
  if (plan.features.pedagogicalPlanning) features.push("Module Répartition Pédagogique");
  if (plan.features.pdfExport) features.push("Exports Haute Qualité (PDF/Excel)");
  if (plan.features.prioritySupport) features.push("Support Prioritaire 24/7");

  features.forEach(feat => {
    // Green check badge
    setFillHex('#10B981');
    doc.circle(113, featY - 1, 2, 'F');
    setTextHex('#FFFFFF');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text("v", 112.2, featY + 0.8);

    setTextHex(COLOR_TEXT_MAIN);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(feat, 118, featY);
    featY += 12;
  });

  // 7. SECURITY HASH & FOOTER (y = 248 to 289mm)
  setTextHex(COLOR_TEXT_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(`Authentification Sécurisée Hash : PLN-SEC-${key.replace(/[^A-Z0-9]/g, '').substring(0, 12)}-2026`, 105, 249, { align: 'center' });

  // Footer Banner
  setFillHex(COLOR_DARK_NAVY);
  doc.rect(9, 254, 192, 34, 'F');

  // Footer Top Cyan Accent Line
  setFillHex(COLOR_CYAN);
  doc.rect(9, 254, 192, 1, 'F');

  setTextHex('#FFFFFF');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text("Besoin d'assistance pour l'activation de votre clé ?", 105, 264, { align: 'center' });

  setTextHex(COLOR_CYAN);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text("www.planora.com  •  support@planora.com  •  Assistance Client 24/7", 105, 272, { align: 'center' });

  setTextHex('#64748B');
  doc.setFontSize(7.5);
  doc.text("© 2026 Planora SaaS — Tous droits réservés. Document généré automatiquement.", 105, 281, { align: 'center' });

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

