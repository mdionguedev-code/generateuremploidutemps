export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'expired' | 'pending_key';
export type PaymentMethod = 'Wave' | 'Orange Money' | 'Stripe' | 'Virement' | 'Clé Licence' | 'Gratuit';

export interface SaaSPlanFeatures {
  pdfExport: boolean;
  excelExport: boolean;
  wordExport: boolean;
  geminiAI: boolean;
  prioritySupport: boolean;
  multiUser: boolean;
  customBranding: boolean;
  pedagogicalPlanning?: boolean;
}

export interface SaaSPlan {
  id: string;
  name: string;
  code: string;
  monthlyPriceFCFA: number;
  monthlyPriceEUR: number;
  annualPriceFCFA?: number;
  annualPriceEUR?: number;
  maxClasses: number; // 999 = illimité
  maxTeachers: number; // 999 = illimité
  maxGenerations?: number; // 9999 = illimité
  maxExports?: number; // 9999 = illimité
  features: SaaSPlanFeatures;
  popular?: boolean;
  description: string;
  badgeText?: string;
  wavePaymentUrl?: string;
}

export interface SaaSClient {
  id: string;
  schoolName: string;
  logoIcon: string;
  adminName: string;
  adminEmail: string;
  phone: string;
  whatsapp?: string;
  cityCountry: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  trialEndDate: string;
  subscriptionEndDate: string;
  licenseKey?: string;
  paymentMethod: PaymentMethod;
  totalPaidFCFA: number;
  createdAt: string;
  lastActiveAt: string;
  classesCount: number;
  teachersCount: number;
  notes?: string;
}

export interface SaaSLicenseKey {
  id: string;
  key: string;
  planId: string;
  durationDays: number;
  generatedAt: string;
  status: 'unused' | 'used' | 'revoked';
  usedByClientId?: string;
  usedByClientName?: string;
  usedAt?: string;
}

export interface SaaSPaymentTransaction {
  id: string;
  invoiceRef: string;
  clientId: string;
  clientName: string;
  amountFCFA: number;
  amountEUR: number;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  planName: string;
  period: string;
}

export interface SaaSGlobalSettings {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  announcementType: 'info' | 'warning' | 'success' | 'none';
  defaultTrialDays: number;
  allowNewRegistrations: boolean;
  supportedPaymentGateways: {
    wave: boolean;
    orangeMoney: boolean;
    stripe: boolean;
    bankTransfer: boolean;
    licenseKey: boolean;
  };
  contactEmail: string;
  supportPhone: string;
  waveConfig?: {
    merchantName: string;
    merchantPhone: string;
    globalWaveUrl: string;
    qrCodeUrl?: string;
    instructions?: string;
  };
}

export const DEFAULT_OFFICIAL_PLANS: SaaSPlan[] = [
  {
    id: 'plan_trial',
    name: 'Gratuit',
    code: 'TRIAL',
    monthlyPriceFCFA: 0,
    monthlyPriceEUR: 0,
    maxClasses: 2,
    maxTeachers: 2,
    maxGenerations: 4,
    maxExports: 4,
    features: {
      pdfExport: true,
      excelExport: false,
      wordExport: false,
      geminiAI: false,
      prioritySupport: false,
      multiUser: false,
      customBranding: true,
      pedagogicalPlanning: false
    },
    popular: false,
    description: 'Pour tester le générateur (2 classes, 2 profs, 4 générations & 4 exports PDF).',
    badgeText: 'Gratuit',
    wavePaymentUrl: 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_DECOUVERTE'
  },
  {
    id: 'plan_standard',
    name: 'Standard',
    code: 'STANDARD',
    monthlyPriceFCFA: 7500,
    monthlyPriceEUR: 11,
    maxClasses: 8,
    maxTeachers: 15,
    maxGenerations: 30,
    maxExports: 25,
    features: {
      pdfExport: true,
      excelExport: false,
      wordExport: false,
      geminiAI: false,
      prioritySupport: false,
      multiUser: false,
      customBranding: true,
      pedagogicalPlanning: false
    },
    popular: false,
    description: 'Pour les petites structures (8 classes, 15 profs, 30 générations & 25 exports PDF).',
    badgeText: 'Standard',
    wavePaymentUrl: 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_STANDARD'
  },
  {
    id: 'plan_premium',
    name: 'Premium',
    code: 'PREMIUM',
    monthlyPriceFCFA: 10000,
    monthlyPriceEUR: 15,
    maxClasses: 20,
    maxTeachers: 25,
    maxGenerations: 50,
    maxExports: 50,
    features: {
      pdfExport: true,
      excelExport: true,
      wordExport: true,
      geminiAI: true,
      prioritySupport: true,
      multiUser: false,
      customBranding: true,
      pedagogicalPlanning: true
    },
    popular: true,
    description: 'Pour collèges & lycées (20 classes, 25 profs, 50 générations & 50 exports Tout format).',
    badgeText: 'Recommandé',
    wavePaymentUrl: 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_PREMIUM'
  },
  {
    id: 'plan_school',
    name: 'School',
    code: 'SCHOOL',
    monthlyPriceFCFA: 25000,
    monthlyPriceEUR: 38,
    maxClasses: 999,
    maxTeachers: 999,
    maxGenerations: 9999,
    maxExports: 9999,
    features: {
      pdfExport: true,
      excelExport: true,
      wordExport: true,
      geminiAI: true,
      prioritySupport: true,
      multiUser: true,
      customBranding: true,
      pedagogicalPlanning: true
    },
    popular: false,
    description: 'Générations & Exportations illimitées, IA prioritaire, Custom Branding, Multi-comptes.',
    badgeText: 'Illimité & VIP',
    wavePaymentUrl: 'https://pay.wave.com/m/M_SN_GESTSCOLAIRE_PLAN_SCHOOL'
  }
];

export type RequestType = 'new_activation' | 'upgrade' | 'renewal';
export type RequestStatus = 'pending' | 'delivered' | 'rejected';

export interface SaaSActivationRequest {
  id: string;
  type: RequestType;
  schoolName: string;
  adminName?: string;
  adminEmail: string;
  whatsapp: string;
  cityCountry?: string;
  planId: string;
  clientId?: string;
  amountFCFA: number;
  durationMonths: number;
  paymentMethod: PaymentMethod;
  status: RequestStatus;
  requestedAt: string;
  deliveredAt?: string;
  assignedKey?: string;
  notes?: string;
}
