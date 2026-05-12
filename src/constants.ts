import { TournamentSettings, TargetType, GlobalSettings } from './types';

export const STORAGE_KEY = 'arcus_digital_archery_v1';
export const APP_VERSION = '1.2.0';

export const DEFAULT_SETTINGS: TournamentSettings = {
  tournamentName: '',
  organizerId: '',
  archersPerTarget: 4,
  totalTargets: 20,
  totalArrows: 36,
  arrowsPerEnd: 6,
  totalEnds: 6,
  isPractice: false,
  isFreeEvent: false,
  paymentMethods: [],
  categoryConfigs: {}
};

export const TARGET_LABELS: Record<TargetType, string> = {
  [TargetType.FACE_122]: 'Face 122cm',
  [TargetType.FACE_80]: 'Face 80cm',
  [TargetType.FACE_60]: 'Face 60cm',
  [TargetType.FACE_40]: 'Face 40cm',
  [TargetType.FACE_3X20]: 'Face 3x20cm (Vertical)',
  [TargetType.STANDARD]: 'Standard Target',
  [TargetType.PUTA]: 'Puta (Turkey)',
  [TargetType.TRADITIONAL_6_RING]: 'Traditional 6-Ring (1-6)',
  [TargetType.TRADITIONAL_PUTA]: 'Traditional Puta (1-2)'
};

export const CATEGORY_LABELS: Record<string, string> = {
  'ADULT_PUTRA': 'Dewasa Putra',
  'ADULT_PUTRI': 'Dewasa Putri',
  'U18_PUTRA': 'U18 Putra',
  'U18_PUTRI': 'U18 Putri',
  'U12_PUTRA': 'U12 Putra',
  'U12_PUTRI': 'U12 Putri',
  'U9_PUTRA': 'U9 Putra',
  'U9_PUTRI': 'U9 Putri',
  'OFFICIAL': 'Official (Manager/Pelatih)'
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  feeAdult: 0, 
  feeKids: 0, 
  maintenanceMode: false,
  contactSupport: '087834193339', 
  bankProvider: '',
  bankAccountNumber: '', 
  bankAccountName: '',
  dataRetentionDays: 90, 
  practiceRetentionDays: 7,
  paymentGatewayProvider: 'NONE',
  paymentGatewayIsProduction: false,
  platformFeePercentage: 0
};
