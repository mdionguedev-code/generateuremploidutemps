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
    instructions: string;
  };
}

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
